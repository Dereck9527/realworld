import { dirname } from "node:path";
import { mkdirSync } from "node:fs";

// Keep the default `bun build` browser-target check able to inspect the MCP bundle.
// This module is evaluated only by Bun's server runtime, where bun:sqlite exists.
const { Database } = await (new Function("return import('bun:sqlite')")() as Promise<{ Database: new (path: string) => any }>);

export const CACHE_VERSION = "phase1-v1";
export type CacheStatus = "success" | "failed";
const secretPattern = new RegExp("(?:authorization\\s*:|x-api-key\\s*:|keen" + "_[A-Za-z0-9]+)", "i");
const sensitiveKey = new RegExp("^(?:authorization|x[-_]?api[-_]?key|keen" + "_[a-z0-9]+)$", "i");
export const containsCredential = (value: unknown): boolean => typeof value === "string" ? secretPattern.test(value) : Array.isArray(value) ? value.some(containsCredential) : Boolean(value && typeof value === "object" && Object.entries(value as Record<string,unknown>).some(([key,item])=>sensitiveKey.test(key)||containsCredential(item)));
const safePayload = (payload: unknown) => containsCredential(payload) ? { ok: false, error: { code: "SENSITIVE_CONTENT", message: "Sensitive content was not persisted." } } : payload;

export class ResearchStorage {
  db: any;
  constructor(path = process.env.CONCEPT_ATLAS_DB_PATH || new URL("../data/concept-atlas.sqlite", import.meta.url).pathname) {
    mkdirSync(dirname(path), { recursive: true }); this.db = new Database(path); this.db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;"); this.migrate();
  }
  migrate() { this.db.exec(`
    CREATE TABLE IF NOT EXISTS research_runs(run_id TEXT PRIMARY KEY, concept_key TEXT NOT NULL, settings_json TEXT NOT NULL, plan_json TEXT NOT NULL, snapshot_json TEXT, status TEXT NOT NULL, iterations_completed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS research_iterations(run_id TEXT NOT NULL, iteration INTEGER NOT NULL, cache_key TEXT NOT NULL, committed_at TEXT NOT NULL, PRIMARY KEY(run_id,iteration,cache_key));
    CREATE TABLE IF NOT EXISTS sources(source_id TEXT PRIMARY KEY, canonical_url TEXT UNIQUE NOT NULL, title TEXT NOT NULL, domain TEXT NOT NULL, source_type TEXT NOT NULL, trust_score INTEGER NOT NULL, trust_reasons_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS source_snapshots(source_snapshot_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, retrieved_at TEXT NOT NULL, content_hash TEXT NOT NULL, cache_key TEXT NOT NULL, fetch_status TEXT NOT NULL, content TEXT, UNIQUE(source_id,content_hash));
    CREATE TABLE IF NOT EXISTS run_sources(run_id TEXT NOT NULL, source_snapshot_id TEXT NOT NULL, source_id TEXT NOT NULL, iteration INTEGER NOT NULL, PRIMARY KEY(run_id,source_snapshot_id));
    CREATE TABLE IF NOT EXISTS evidence_cards(card_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, fingerprint TEXT NOT NULL, card_json TEXT NOT NULL, comparable_json TEXT, UNIQUE(run_id,fingerprint));
    CREATE TABLE IF NOT EXISTS evidence_card_sources(card_id TEXT NOT NULL, source_snapshot_id TEXT NOT NULL, source_id TEXT NOT NULL, content_hash TEXT NOT NULL, evidence_locator TEXT NOT NULL, extraction_version TEXT NOT NULL, extracted_at TEXT NOT NULL, PRIMARY KEY(card_id,source_snapshot_id));
    CREATE TABLE IF NOT EXISTS conflicts(id TEXT PRIMARY KEY, run_id TEXT NOT NULL, json TEXT NOT NULL, UNIQUE(run_id,id));
    CREATE TABLE IF NOT EXISTS gaps(id TEXT PRIMARY KEY, run_id TEXT NOT NULL, json TEXT NOT NULL, UNIQUE(run_id,id));
    CREATE TABLE IF NOT EXISTS cache_entries(cache_key TEXT PRIMARY KEY, operation TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, status TEXT NOT NULL, safe_error_code TEXT);
    CREATE TABLE IF NOT EXISTS graph_nodes(id TEXT PRIMARY KEY, run_id TEXT NOT NULL, type TEXT NOT NULL, label TEXT NOT NULL, data_json TEXT NOT NULL, UNIQUE(run_id,id));
    CREATE TABLE IF NOT EXISTS graph_edges(id TEXT PRIMARY KEY, run_id TEXT NOT NULL, type TEXT NOT NULL, from_id TEXT NOT NULL, to_id TEXT NOT NULL, data_json TEXT NOT NULL, UNIQUE(run_id,id));
  `); const columns = this.db.query("PRAGMA table_info(evidence_cards)").all() as Array<{name:string}>; if (!columns.some((column) => column.name === "comparable_json")) this.db.exec("ALTER TABLE evidence_cards ADD COLUMN comparable_json TEXT"); }
  transaction<T>(fn: () => T): T { return this.db.transaction(fn)(); }
  close() { this.db.close(); }
  cache(key: string) { const row = this.db.query("SELECT * FROM cache_entries WHERE cache_key=?").get(key) as Record<string, unknown> | null; return row && String(row.expires_at) > new Date().toISOString() ? row : null; }
  putCache(key: string, operation: string, payload: unknown, ttlMs: number, status: CacheStatus = "success", safeErrorCode?: string) { const now = new Date(); const expires = new Date(now.getTime() + ttlMs).toISOString(); const safe=safePayload(payload); const failed=status === "failed" || safe !== payload; this.db.query("INSERT INTO cache_entries VALUES(?,?,?,?,?,?,?) ON CONFLICT(cache_key) DO UPDATE SET payload_json=excluded.payload_json,created_at=excluded.created_at,expires_at=excluded.expires_at,status=excluded.status,safe_error_code=excluded.safe_error_code").run(key, operation, JSON.stringify(safe), now.toISOString(), expires, failed ? "failed" : "success", failed ? (safeErrorCode ?? "SENSITIVE_CONTENT") : null); }
  run(id: string) { return this.db.query("SELECT * FROM research_runs WHERE run_id=?").get(id) as Record<string, unknown> | null; }
  snapshot(id: string) { const row = this.run(id); return row?.snapshot_json ? JSON.parse(String(row.snapshot_json)) : null; }
}
