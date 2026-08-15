import { toolError } from "./core.ts";

const ENDPOINT = "https://api.keenable.ai/mcp";
const ACCEPT = "application/json, text/event-stream";
const REQUEST_TIMEOUT_MS = 10_000;

type JsonObject = Record<string, unknown>;
type RpcResponse = { result?: unknown; error?: { code?: unknown; message?: unknown } };
type LocalError = ReturnType<typeof toolError>;
type RequestResult = RpcResponse | null | LocalError | { sessionNotFound: true };

export type SearchWebPagesInput = {
  query: string;
  site?: string;
  published_after?: string;
  published_before?: string;
  acquired_after?: string;
  acquired_before?: string;
  snippet_max_length?: number;
};

export type FetchPageContentInput = { url: string; live?: boolean; max_chars?: number; prompt?: string };

const isObject = (value: unknown): value is JsonObject => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const asText = (value: unknown): string | undefined => typeof value === "string" ? value : undefined;
const isLocalError = (value: unknown): value is LocalError => isObject(value) && value.ok === false;

function safeRemoteError(error: unknown) {
  void error;
  return toolError("KEENABLE_REMOTE_ERROR", "Keenable could not complete the requested operation.");
}

function parseSse(text: string): unknown[] {
  const events: unknown[] = [];
  let data: string[] = [];
  const flush = () => {
    const joined = data.join("\n").trim();
    data = [];
    if (!joined || joined === "[DONE]") return;
    try { events.push(JSON.parse(joined)); } catch { /* Ignore non-JSON keepalive events. */ }
  };
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    if (!line) { flush(); continue; }
    if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  flush();
  return events;
}

function rpcFromBody(text: string, contentType: string): RpcResponse | null {
  const candidates: unknown[] = [];
  if (contentType.includes("text/event-stream") || text.trimStart().startsWith("data:")) candidates.push(...parseSse(text));
  else {
    try { candidates.push(JSON.parse(text)); } catch { return null; }
  }
  for (const candidate of candidates) {
    if (isObject(candidate) && ("result" in candidate || "error" in candidate)) return candidate as RpcResponse;
  }
  return null;
}

function timeoutSignal() {
  if (typeof AbortSignal.timeout === "function") return { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), clear: () => {} };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function readBody(response: Response, signal: AbortSignal): Promise<string> {
  if (signal.aborted) throw new DOMException("Timed out", "AbortError");
  return await new Promise<string>((resolve, reject) => {
    const abort = () => reject(new DOMException("Timed out", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    response.text().then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

class KeenableClient {
  private sessionId: string | null = null;
  private protocolVersion: string | null = null;
  private nextId = 1;

  private async requestOnce(method: string, params?: unknown, notification = false): Promise<RequestResult> {
    const headers: Record<string, string> = { Accept: ACCEPT, "Content-Type": "application/json" };
    const apiKey = process.env.KENABLE_API_KEY;
    if (apiKey) headers["X-API-Key"] = apiKey;
    if (this.sessionId) headers["Mcp-Session-Id"] = this.sessionId;
    if (this.protocolVersion && method !== "initialize") headers["MCP-Protocol-Version"] = this.protocolVersion;
    const timeout = timeoutSignal();
    let response: Response;
    try {
      const request = { jsonrpc: "2.0", ...(notification ? {} : { id: this.nextId++ }), method, ...(params === undefined ? {} : { params }) };
      response = await fetch(ENDPOINT, { method: "POST", headers, signal: timeout.signal, body: JSON.stringify(request) });
    } catch {
      timeout.clear();
      return toolError("KEENABLE_HTTP_ERROR", "Unable to reach Keenable.");
    }
    const returnedSession = response.headers.get("Mcp-Session-Id");
    if (returnedSession) this.sessionId = returnedSession;
    if (!response.ok) { timeout.clear(); if (response.status === 404) return { sessionNotFound: true }; return toolError("KEENABLE_HTTP_ERROR", `Keenable returned HTTP ${response.status}.`, { status: response.status }); }
    if (notification) { timeout.clear(); return null; }
    let text: string;
    try { text = await readBody(response, timeout.signal); } catch { timeout.clear(); return toolError("KEENABLE_HTTP_ERROR", "Keenable request timed out or could not be read."); }
    timeout.clear();
    const rpc = rpcFromBody(text, response.headers.get("content-type") ?? "");
    if (!rpc) return toolError("KEENABLE_PROTOCOL_ERROR", "Keenable returned an unreadable MCP response.");
    if (rpc.error) return safeRemoteError(rpc.error);
    if (!("result" in rpc)) return toolError("KEENABLE_PROTOCOL_ERROR", "Keenable MCP response did not include a result.");
    return rpc;
  }

  private async initialize(): Promise<RpcResponse | LocalError> {
    const initialized = await this.requestOnce("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "concept-atlas", version: "0.2.0" } });
    if (isLocalError(initialized) || !initialized || "sessionNotFound" in initialized) return isLocalError(initialized) ? initialized : toolError("KEENABLE_PROTOCOL_ERROR", "Keenable did not initialize the MCP session.");
    const version = isObject(initialized.result) ? asText(initialized.result.protocolVersion) : undefined;
    if (!version) return toolError("KEENABLE_PROTOCOL_ERROR", "Keenable did not negotiate an MCP protocol version.");
    this.protocolVersion = version;
    return initialized;
  }

  private async restartSession(): Promise<LocalError | null> {
    this.sessionId = null;
    this.protocolVersion = null;
    const initialized = await this.initialize();
    if (isLocalError(initialized)) return initialized;
    const notification = await this.requestOnce("notifications/initialized", undefined, true);
    if (isLocalError(notification) || (notification && "sessionNotFound" in notification)) return isLocalError(notification) ? notification : toolError("KEENABLE_HTTP_ERROR", "Keenable session could not be restarted.");
    return null;
  }

  private async request(method: string, params?: unknown, notification = false, retrySession = true): Promise<RpcResponse | null | LocalError> {
    const result = await this.requestOnce(method, params, notification);
    if (!(result && "sessionNotFound" in result)) return result;
    if (!retrySession || method === "initialize") return toolError("KEENABLE_HTTP_ERROR", "Keenable session could not be restored.");
    const restarted = await this.restartSession();
    if (restarted) return restarted;
    const retried = await this.requestOnce(method, params, notification);
    return retried && "sessionNotFound" in retried ? toolError("KEENABLE_HTTP_ERROR", "Keenable session could not be restored.") : retried;
  }

  async callTool(name: string, arguments_: JsonObject): Promise<unknown | ReturnType<typeof toolError>> {
    const initialize = await this.initialize();
    if (isLocalError(initialize)) return initialize;
    const initialized = await this.request("notifications/initialized", undefined, true);
    if (isLocalError(initialized)) return initialized;
    const listed = await this.request("tools/list", {});
    if (isLocalError(listed)) return listed;
    const called = await this.request("tools/call", { name, arguments: arguments_ });
    if (isLocalError(called)) return called;
    if (!called || (isObject(called.result) && called.result.isError === true)) return safeRemoteError(called);
    return called.result;
  }
}

function unwrap(result: unknown): unknown {
  if (!isObject(result)) return result;
  if ("structuredContent" in result) return result.structuredContent;
  const content = result.content;
  if (Array.isArray(content)) {
    for (const item of content) {
      if (isObject(item) && typeof item.text === "string") {
        try { return JSON.parse(item.text); } catch { return item.text; }
      }
    }
  }
  return result;
}

function records(value: unknown, field: string): JsonObject[] {
  const root = unwrap(value);
  if (Array.isArray(root)) return root.filter(isObject);
  if (!isObject(root)) return [];
  const direct = root[field];
  if (Array.isArray(direct)) return direct.filter(isObject);
  for (const key of ["data", "result", "results"]) {
    const nested = root[key];
    if (isObject(nested) && Array.isArray(nested[field])) return nested[field].filter(isObject);
  }
  return [];
}

function firstText(record: JsonObject, fields: string[]): string | undefined {
  for (const field of fields) {
    const value = asText(record[field]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function pageRecord(value: unknown): JsonObject {
  const root = unwrap(value);
  if (!isObject(root)) return {};
  for (const key of ["page", "data", "result"]) if (isObject(root[key])) return root[key] as JsonObject;
  return root;
}

export async function searchWebPages(input: SearchWebPagesInput) {
  const remote = await new KeenableClient().callTool("search_web_pages", input);
  if (isObject(remote) && remote.ok === false) return remote;
  const results = records(remote, "results").flatMap((item) => {
    const url = firstText(item, ["url", "link", "sourceUrl"]);
    if (!url) return [];
    const publishedDate = firstText(item, ["publishedDate", "published_date", "published_at", "date"]);
    return [{ title: firstText(item, ["title", "name", "pageTitle"]) ?? url, url, description: firstText(item, ["description", "snippet", "summary", "content"]) ?? "", ...(publishedDate ? { publishedDate } : {}) }];
  });
  return { ok: true as const, source: "keenable" as const, query: input.query, results };
}

export async function fetchPageContent(input: FetchPageContentInput) {
  const remote = await new KeenableClient().callTool("fetch_page_content", input);
  if (isObject(remote) && remote.ok === false) return remote;
  const page = pageRecord(remote);
  return {
    ok: true as const,
    source: "keenable" as const,
    url: firstText(page, ["url", "pageUrl", "sourceUrl"]) ?? input.url,
    title: firstText(page, ["title", "pageTitle", "name"]) ?? "",
    content: firstText(page, ["content", "text", "markdown", "html", "body"]) ?? (typeof unwrap(remote) === "string" ? unwrap(remote) as string : "")
  };
}
