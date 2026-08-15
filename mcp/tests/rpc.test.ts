import { expect, test } from "bun:test";
import fixture from "../fixtures/entropy.json" with { type: "json" };
import { executeTool } from "../server.ts";

test("MCP exposes strict input/output schemas and correct JSON-RPC semantics", async () => {
  const server = Bun.spawn([Bun.which("bun") ?? process.execPath, "server.ts"], { cwd: new URL("..", import.meta.url).pathname, stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  const plan = fixture.plan;
  const requests = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05" } },
    { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "validate_evidence_cards", arguments: { cards: fixture.evidenceCards } } },
    { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "render_concept_report", arguments: { concept: "熵", plan, evidenceCards: fixture.evidenceCards, mathMode: "latex" } } },
    { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "get_demo_concept", arguments: { concept: "entropy", language: "en" } } },
    { jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "get_demo_concept", arguments: { concept: "熵" } } },
    { jsonrpc: "2.0", method: "tools/call", params: { name: "plan_concept_research", arguments: { concept: "熵" } } },
    { jsonrpc: "2.0", id: 6, method: "unknown/method" },
    "{not json}"
  ];
  server.stdin.write(requests.map((request) => typeof request === "string" ? request : JSON.stringify(request)).join("\n") + "\n"); server.stdin.end();
  const output = await new Response(server.stdout).text(); const error = await new Response(server.stderr).text(); await server.exited;
  expect(error).toBe(""); const responses = output.trim().split("\n").map(JSON.parse); expect(responses).toHaveLength(8);
  expect(responses[0].result.serverInfo.name).toBe("concept-atlas");
  const tools = responses[1].result.tools; expect(tools.map((tool: { name: string }) => tool.name)).toEqual(["plan_concept_research", "get_demo_concept", "validate_evidence_cards", "render_concept_report", "search_web_pages", "fetch_page_content", "research_concept", "get_research_run", "export_concept_graph"]); for (const tool of tools) { expect(tool.inputSchema.additionalProperties).toBe(false); expect(tool.outputSchema).toBeDefined(); }
  const researchTool = tools.find((tool: { name: string }) => tool.name === "research_concept"); expect(researchTool.inputSchema.additionalProperties).toBe(false); expect(researchTool.outputSchema.oneOf[1].additionalProperties).toBe(false); const graphTool = tools.find((tool: { name: string }) => tool.name === "export_concept_graph"); expect(graphTool.inputSchema.additionalProperties).toBe(false); expect(graphTool.outputSchema.oneOf[1].properties.nodes.items.additionalProperties).toBe(false);
  const reportTool = tools.find((tool: { name: string }) => tool.name === "render_concept_report"); const reportSchema = reportTool.outputSchema.oneOf[1].properties.report; expect(reportSchema.additionalProperties).toBe(false); expect(reportTool.inputSchema.properties.mathMode.enum).toEqual(["portable", "latex", "html"]); expect(reportSchema.properties.mathMode.enum).toEqual(["portable", "latex", "html"]); expect(reportSchema.properties.html.anyOf).toBeDefined(); expect(reportSchema.properties.timeline.items.additionalProperties).toBe(false); expect(reportSchema.properties.problemChain.items.additionalProperties).toBe(false); expect(reportSchema.properties.citations.items.additionalProperties).toBe(false);
  const demoTool = tools.find((tool: { name: string }) => tool.name === "get_demo_concept"); const demoSchema = demoTool.outputSchema.oneOf[1]; expect(demoSchema.properties.dataset.additionalProperties).toBe(false); expect(demoSchema.properties.dataset.properties.plan.additionalProperties).toBe(false); expect(demoSchema.properties.dataset.properties.evidenceCards.items.additionalProperties).toBe(false); expect(demoSchema.properties.report.additionalProperties).toBe(false); expect(demoSchema.properties.validation.additionalProperties).toBe(false);
  expect(responses[2].result.structuredContent).toMatchObject({ ok: true, valid: true }); expect(responses[3].result.structuredContent).toMatchObject({ ok: true, report: { mathMode: "latex", markdown: expect.any(String), html: null } }); expect(responses[4].result.structuredContent).toMatchObject({ ok: false, error: { code: "INVALID_ARGUMENT" } });
  const demo = responses[5].result.structuredContent; expect(demo.ok).toBe(true); expect(demo.demo).toBe(true); expect(demo.dataset.demo).toBe(true); expect(demo.dataset.plan.version).toBe("0.3.0"); expect(demo.dataset.evidenceCards[0]).toMatchObject({ demo: true, provenance: { kind: "demo-fixture" }, card: { id: "carnot-1824" } }); expect(demo.report).toMatchObject({ demo: true, provenance: { kind: "demo-fixture" } }); expect(Array.isArray(demo.report.report.timeline)).toBe(true); expect(demo.validation).toMatchObject({ demo: true, validation: { ok: true, valid: true } });
  expect(Object.keys(demo).sort()).toEqual(["dataset", "demo", "ok", "provenance", "report", "validation"]); expect(Object.keys(demo.dataset).sort()).toEqual(["concept", "demo", "evidenceCards", "plan", "provenance"]); expect(Object.keys(demo.dataset.evidenceCards[0]).sort()).toEqual(["card", "demo", "provenance"]); expect(Object.keys(demo.report).sort()).toEqual(["demo", "provenance", "report"]); expect(Object.keys(demo.validation).sort()).toEqual(["demo", "provenance", "validation"]); expect(Object.keys(demo.report.report).sort()).toEqual(["citations", "crossDomainTransfers", "currentLandscape", "html", "learningPath", "markdown", "mathMode", "problemChain", "summary", "timeline", "title", "uncertainties"]);
  expect(responses[6]).toMatchObject({ jsonrpc: "2.0", id: 6, error: { code: -32601 } }); expect(responses[7]).toMatchObject({ jsonrpc: "2.0", id: null, error: { code: -32700 } });
});

test("Keenable tools use mocked Streamable HTTP MCP responses and never expose the API key", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.KENABLE_API_KEY;
  const calls: Array<{ headers: Headers; body: { method: string; params?: { name?: string } } }> = [];
  process.env.KENABLE_API_KEY = "test-key-value";
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    const request = JSON.parse(String(init?.body)); calls.push({ headers: new Headers(init?.headers), body: request });
    if (request.method === "initialize") return new Response(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: { protocolVersion: "2025-03-26" } }), { headers: { "Mcp-Session-Id": "mock-session", "content-type": "application/json" } });
    if (request.method === "notifications/initialized") return new Response(null, { status: 202 });
    if (request.method === "tools/list") return new Response("data: {\"jsonrpc\":\"2.0\",\"id\":2,\"result\":{\"tools\":[]}}\n\n", { headers: { "content-type": "text/event-stream" } });
    if (request.params?.name === "search_web_pages") return new Response(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: { structuredContent: { results: [{ title: "Example", url: "https://example.test/article", snippet: "A deterministic result", published_at: "2026-08-13" }] } } }), { headers: { "content-type": "application/json" } });
    return new Response("data: {\"jsonrpc\":\"2.0\",\"id\":3,\"result\":{\"structuredContent\":{\"page\":{\"url\":\"https://example.test/article\",\"title\":\"Example\",\"content\":\"Retrieved content\"}}}}\n\n", { headers: { "content-type": "text/event-stream" } });
  }) as typeof fetch;
  try {
    const search = await executeTool("search_web_pages", { query: "test query", snippet_max_length: 180 });
    const page = await executeTool("fetch_page_content", { url: "https://example.test/article", prompt: "Summarize" });
    expect(search).toEqual({ ok: true, source: "keenable", query: "test query", results: [{ title: "Example", url: "https://example.test/article", description: "A deterministic result", publishedDate: "2026-08-13" }] });
    expect(page).toEqual({ ok: true, source: "keenable", url: "https://example.test/article", title: "Example", content: "Retrieved content" });
    expect(calls).toHaveLength(8); expect(calls[0].body.params.protocolVersion).toBe("2025-03-26"); expect(calls[0].headers.get("X-API-Key")).toBe("test-key-value"); expect(calls[1].body).toEqual({ jsonrpc: "2.0", method: "notifications/initialized" }); expect(calls[1].headers.get("Mcp-Session-Id")).toBe("mock-session"); expect(calls.filter((call) => call.body.method !== "initialize").every((call) => call.headers.get("MCP-Protocol-Version") === "2025-03-26")).toBe(true); expect(calls[5].body).toEqual({ jsonrpc: "2.0", method: "notifications/initialized" }); expect(JSON.stringify({ search, page })).not.toContain("test-key-value");
  } finally { globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.KENABLE_API_KEY; else process.env.KENABLE_API_KEY = originalKey; }
});

test("Keenable restarts an expired session once and enforces documented snippet bounds", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ headers: Headers; body: { method: string } }> = [];
  let listAttempts = 0;
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)); calls.push({ headers: new Headers(init?.headers), body });
    if (body.method === "initialize") return new Response(JSON.stringify({ jsonrpc: "2.0", id: body.id, result: { protocolVersion: "2025-03-26" } }), { headers: { "Mcp-Session-Id": listAttempts ? "replacement-session" : "expired-session", "content-type": "application/json" } });
    if (body.method === "notifications/initialized") return new Response(null, { status: 202 });
    if (body.method === "tools/list" && listAttempts++ === 0) return new Response(null, { status: 404 });
    if (body.method === "tools/list") return new Response(JSON.stringify({ jsonrpc: "2.0", id: body.id, result: {} }), { headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: body.id, result: { structuredContent: { results: [] } } }), { headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    expect(await executeTool("search_web_pages", { query: "restart", snippet_max_length: 10000 })).toMatchObject({ ok: true, source: "keenable", results: [] });
    expect(calls.map((call) => call.body.method)).toEqual(["initialize", "notifications/initialized", "tools/list", "initialize", "notifications/initialized", "tools/list", "tools/call"]); expect(calls[3].headers.get("Mcp-Session-Id")).toBeNull(); expect(calls.filter((call) => call.body.method !== "initialize").every((call) => call.headers.get("MCP-Protocol-Version") === "2025-03-26")).toBe(true);
    expect(await executeTool("search_web_pages", { query: "too short", snippet_max_length: 179 })).toMatchObject({ ok: false, error: { code: "INVALID_ARGUMENT" } }); expect(await executeTool("search_web_pages", { query: "too long", snippet_max_length: 10001 })).toMatchObject({ ok: false, error: { code: "INVALID_ARGUMENT" } });
  } finally { globalThis.fetch = originalFetch; }
});

test("Keenable result errors and aborted requests return safe errors", async () => {
  const originalFetch = globalThis.fetch;
  const originalTimeout = AbortSignal.timeout;
  let call = 0;
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    const request = JSON.parse(String(init?.body)); call += 1;
    if (call === 4) return new Response(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: { isError: true, content: [{ type: "text", text: "remote-only-text" }] } }), { headers: { "content-type": "application/json" } });
    return new Response(request.method === "notifications/initialized" ? null : JSON.stringify({ jsonrpc: "2.0", id: request.id, result: request.method === "initialize" ? { protocolVersion: "2025-03-26" } : {} }), { status: request.method === "notifications/initialized" ? 202 : 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const result = await executeTool("search_web_pages", { query: "error" });
    expect(result).toEqual({ ok: false, error: { code: "KEENABLE_REMOTE_ERROR", message: "Keenable could not complete the requested operation." } }); expect(JSON.stringify(result)).not.toContain("remote-only-text");
    AbortSignal.timeout = (() => AbortSignal.abort()) as typeof AbortSignal.timeout;
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => { if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError"); return new Response(null); }) as typeof fetch;
    expect(await executeTool("search_web_pages", { query: "timeout" })).toEqual({ ok: false, error: { code: "KEENABLE_HTTP_ERROR", message: "Unable to reach Keenable." } });
  } finally { globalThis.fetch = originalFetch; AbortSignal.timeout = originalTimeout; }
});

test("Keenable key is omitted for anonymous calls and invalid remote arguments never fetch", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.KENABLE_API_KEY;
  const headers: Headers[] = [];
  delete process.env.KENABLE_API_KEY;
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => { headers.push(new Headers(init?.headers)); const request = JSON.parse(String(init?.body)); return new Response(request.method === "notifications/initialized" ? null : JSON.stringify({ jsonrpc: "2.0", id: request.id, result: request.method === "initialize" ? { protocolVersion: "2025-03-26" } : request.method === "tools/call" ? { structuredContent: { results: [] } } : {} }), { status: request.method === "notifications/initialized" ? 202 : 200, headers: { "content-type": "application/json" } }); }) as typeof fetch;
  try {
    expect(await executeTool("search_web_pages", { query: "anonymous" })).toMatchObject({ ok: true, source: "keenable", results: [] });
    expect(headers[0].get("X-API-Key")).toBeNull(); const count = headers.length;
    expect(await executeTool("fetch_page_content", { url: "", unknown: true })).toMatchObject({ ok: false, error: { code: "UNKNOWN_PROPERTY" } }); expect(headers).toHaveLength(count);
    expect(await executeTool("fetch_page_content", { url: "https://example.test", prompt: "x".repeat(2001) })).toMatchObject({ ok: false, error: { code: "INVALID_ARGUMENT" } }); expect(headers).toHaveLength(count);
  } finally { globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.KENABLE_API_KEY; else process.env.KENABLE_API_KEY = originalKey; }
});
