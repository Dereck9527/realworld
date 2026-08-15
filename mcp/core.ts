export const VERSION = "0.3.0";
export type Language = "zh-CN" | "en";
export type MathMode = "portable" | "latex" | "html";
export type ConcreteExample = { title: string; scenario: string; walkthrough: string[]; insight: string };
export type EvidenceCard = { id: string; claim: string; claimType: "precursor" | "coinage" | "formalization" | "adoption" | "transfer" | "current-use"; historicalContext: string; mechanism: string; problemSolved: string; concreteExample: ConcreteExample; frameworkSignificance: string; sourceUrl: string; sourceTitle: string; sourceType: "primary-paper" | "book" | "academic-review" | "institutional-reference" | "other"; publicationDate: string; evidenceSummary: string; confidence: "high" | "medium" | "low"; inference: boolean; disputes: string[]; supports: string[] };
export type ResearchPlan = { version: string; concept: string; settings: { language: Language; audience: "beginner" | "intermediate" | "expert"; depth: "brief" | "standard" | "deep" }; disambiguationPrompts: string[]; researchDimensions: Array<{ order: number; name: string }>; searchQueryGroups: Array<{ purpose: string; queries: string[] }>; evidenceRequirements: string[]; status: "planned" };
export type Issue = { code: string; path: string; message: string };
export type ValidationResult = { ok: true; valid: boolean; errors: Issue[]; warnings: Issue[]; normalizedCards: EvidenceCard[] };

const cardKeys = ["id", "claim", "claimType", "historicalContext", "mechanism", "problemSolved", "concreteExample", "frameworkSignificance", "sourceUrl", "sourceTitle", "sourceType", "publicationDate", "evidenceSummary", "confidence", "inference", "disputes", "supports"];
const exampleKeys = ["title", "scenario", "walkthrough", "insight"];
const claimTypes = new Set(["precursor", "coinage", "formalization", "adoption", "transfer", "current-use"]);
const sourceTypes = new Set(["primary-paper", "book", "academic-review", "institutional-reference", "other"]);
const confidences = new Set(["high", "medium", "low"]);
const credibleTypes = new Set(["primary-paper", "book", "academic-review", "institutional-reference"]);
const priorityPattern = /\b(first|earliest)\b|首次|最早/i;
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const mathModes = new Set<MathMode>(["portable", "latex", "html"]);
const isDate = (value: string): boolean => {
  const parts = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value); if (!parts) return false;
  const year = Number(parts[1]); const month = parts[2] === undefined ? undefined : Number(parts[2]); const day = parts[3] === undefined ? undefined : Number(parts[3]);
  if (year < 1 || (month !== undefined && (month < 1 || month > 12))) return false;
  if (day === undefined) return true;
  const date = new Date(Date.UTC(year, month! - 1, day)); return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day;
};
const isHttpUrl = (value: string): boolean => { try { const url = new URL(value); return url.protocol === "http:" || url.protocol === "https:"; } catch { return false; } };
const translated = (language: Language, zh: string, en: string) => language === "en" ? en : zh;

export const isMathMode = (value: unknown): value is MathMode => typeof value === "string" && mathModes.has(value as MathMode);

const latexCommands: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", theta: "θ", lambda: "λ", mu: "μ", nu: "ν", pi: "π", rho: "ρ", sigma: "σ", tau: "τ", phi: "φ", psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π", Sigma: "Σ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
  sum: "Σ", prod: "Π", int: "∫", partial: "∂", nabla: "∇", infty: "∞", cdot: "·", times: "×", div: "÷", pm: "±", mp: "∓", le: "≤", leq: "≤", ge: "≥", geq: "≥", neq: "≠", approx: "≈", sim: "∼", to: "→", rightarrow: "→", leftarrow: "←", iff: "⇔", implies: "⇒", log: "log", ln: "ln", exp: "exp", sin: "sin", cos: "cos", tan: "tan"
};
const subscriptDigits: Record<string, string> = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎" };
const superscriptDigits: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾" };
const mathPattern = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|\$\$([\s\S]*?)\$\$|(?<!\\)\$([^$\n]+?)\$/g;

function rewriteMath(text: string, render: (tex: string, display: boolean) => string) {
  return text.replace(mathPattern, (whole, bracket, paren, dollars, inline) => {
    const tex = String(bracket ?? paren ?? dollars ?? inline ?? "").trim();
    return tex ? render(tex, bracket !== undefined || dollars !== undefined) : whole;
  });
}

function portableFormula(tex: string) {
  let value = tex.trim();
  let prior = "";
  while (prior !== value) {
    prior = value;
    value = value
      .replace(/\\(?:mathrm|text|operatorname|mathit|mathbf|mathsf|boldsymbol)\s*\{([^{}]*)\}/g, "$1")
      .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)")
      .replace(/\\sqrt(?:\[[^\]]+\])?\s*\{([^{}]*)\}/g, "√($1)");
  }
  value = value
    .replace(/\\sum\s*_\{?([^{}^]+)\}?\s*\^\{?([^{}]+)\}?/g, "Σ($1…$2)")
    .replace(/\\int\s*_\{?([^{}^]+)\}?\s*\^\{?([^{}]+)\}?/g, "∫($1…$2)")
    .replace(/\\left|\\right/g, "")
    .replace(/\\[,;!]/g, " ")
    .replace(/\^\{([^{}]+)\}/g, "^$1")
    .replace(/_\{([^{}]+)\}/g, "_$1")
    .replace(/_([0-9+\-=()])/g, (_whole, symbol) => subscriptDigits[symbol] ?? `_${symbol}`)
    .replace(/\^([0-9+\-=()])/g, (_whole, symbol) => superscriptDigits[symbol] ?? `^${symbol}`)
    .replace(/\\([A-Za-z]+)\b/g, (_whole, command) => latexCommands[command] ?? command)
    .replace(/\\([#$%&_{}])/g, "$1")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return value;
}

function formatMath(text: string, mode: "portable" | "latex") {
  return rewriteMath(text, (tex, display) => mode === "portable"
    ? portableFormula(tex)
    : display ? `\n$$\n${tex}\n$$\n` : `$${tex}$`);
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character] ?? character);
}

function inlineHtml(markdown: string) {
  const math: Array<{ tex: string; display: boolean }> = [];
  const protectedText = rewriteMath(markdown, (tex, display) => {
    const index = math.push({ tex, display }) - 1;
    return `\uE000${index}\uE001`;
  });
  let html = escapeHtml(protectedText)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\uE000(\d+)\uE001/g, (_whole, rawIndex) => {
    const segment = math[Number(rawIndex)];
    return segment.display ? `<span class="math-display">$$${escapeHtml(segment.tex)}$$</span>` : `$${escapeHtml(segment.tex)}$`;
  });
  return html;
}

function markdownToHtml(markdown: string) {
  const lines = markdown.split("\n"); const output: string[] = []; let paragraph: string[] = []; let list: "ol" | "ul" | null = null;
  const flushParagraph = () => { if (paragraph.length) { output.push(`<p>${inlineHtml(paragraph.join(" "))}</p>`); paragraph = []; } };
  const closeList = () => { if (list) { output.push(`</${list}>`); list = null; } };
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]; const trimmed = line.trim();
    if (!trimmed) { flushParagraph(); closeList(); continue; }
    if (trimmed === "$$") {
      flushParagraph(); closeList(); const formula: string[] = []; index += 1;
      while (index < lines.length && lines[index].trim() !== "$$") { formula.push(lines[index]); index += 1; }
      output.push(`<div class="math-display">$$${escapeHtml(formula.join("\n").trim())}$$</div>`); continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) { flushParagraph(); closeList(); output.push(`<h${heading[1].length}>${inlineHtml(heading[2])}</h${heading[1].length}>`); continue; }
    const ordered = /^\d+\.\s+(.+)$/.exec(line); const bullet = /^-\s+(.+)$/.exec(line);
    if (ordered || bullet) {
      flushParagraph(); const nextList = ordered ? "ol" : "ul";
      if (list && list !== nextList) closeList(); if (!list) { list = nextList; output.push(`<${list}>`); }
      output.push(`<li>${inlineHtml((ordered ?? bullet)![1])}</li>`); continue;
    }
    closeList(); paragraph.push(line);
  }
  flushParagraph(); closeList(); return output.join("\n");
}

function renderHtmlDocument(title: string, latexMarkdown: string, language: Language) {
  const lang = language === "en" ? "en" : "zh-CN";
  const note = language === "en" ? "Math is typeset with MathJax when this file is opened with network access." : "打开文件时若可联网，公式将由 MathJax 排版。";
  const mathJaxConfig = 'window.MathJax={tex:{inlineMath:[["$","$"],["\\\\(","\\\\)"]],displayMath:[["$$","$$"],["\\\\[","\\\\]"]],processEscapes:true}};';
  return `<!doctype html>\n<html lang="${lang}">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${escapeHtml(title)}</title>\n<style>body{margin:0;background:#f7f7f5;color:#1f2328;font:17px/1.72 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}article{max-width:920px;margin:0 auto;padding:48px 28px 64px;background:#fff}h1,h2,h3,h4{line-height:1.28;margin-top:1.7em}h1{margin-top:0}a{color:#0969da}li{margin:.35em 0}.math-display{overflow-x:auto;margin:1.1em 0;padding:.7em;background:#f6f8fa;border-radius:6px;text-align:center}.note{color:#57606a;font-size:.9em;border-top:1px solid #d0d7de;margin-top:3em;padding-top:1em}</style>\n<script>${mathJaxConfig}</script>\n<script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>\n</head>\n<body>\n<article>\n${markdownToHtml(latexMarkdown)}\n<p class="note">${note}</p>\n</article>\n</body>\n</html>\n`;
}

export function toolError(code: string, message: string, details?: unknown) { return { ok: false as const, error: { code, message, ...(details === undefined ? {} : { details }) } }; }

/** Shared deterministic validator. Rendering invokes this exact function. */
export function validateEvidenceCards(input: unknown): ValidationResult {
  const errors: Issue[] = []; const warnings: Issue[] = []; const normalizedEntries: Array<{ card: EvidenceCard; index: number }> = [];
  const normalizedCards = () => normalizedEntries.map((entry) => entry.card);
  if (!Array.isArray(input)) return { ok: true, valid: false, errors: [{ code: "INVALID_CARDS", path: "cards", message: "cards must be an array / cards 必须是数组。" }], warnings, normalizedCards: [] };
  const ids = new Set<string>();
  input.forEach((raw, index) => {
    const path = `cards[${index}]`;
    if (!isObject(raw)) { errors.push({ code: "INVALID_CARD", path, message: "Evidence card must be an object / 证据卡必须是对象。" }); return; }
    const cardErrorStart = errors.length;
    for (const key of Object.keys(raw)) if (!cardKeys.includes(key)) errors.push({ code: "UNKNOWN_PROPERTY", path: `${path}.${key}`, message: "Evidence cards do not permit undeclared properties / 证据卡不允许未声明字段。" });
    for (const key of cardKeys) if (!(key in raw)) errors.push({ code: "REQUIRED", path: `${path}.${key}`, message: "Required field is missing / 缺少必填字段。" });
    for (const key of ["id", "claim", "historicalContext", "mechanism", "problemSolved", "frameworkSignificance", "sourceUrl", "sourceTitle", "publicationDate", "evidenceSummary"]) if (!isText(raw[key])) errors.push({ code: "EMPTY_CRITICAL_FIELD", path: `${path}.${key}`, message: "Critical field must be a nonempty string / 关键字段必须为非空字符串。" });
    const example = raw.concreteExample;
    const exampleIsValid = isObject(example)
      && Object.keys(example).every((key) => exampleKeys.includes(key))
      && exampleKeys.every((key) => key in example)
      && isText(example.title)
      && isText(example.scenario)
      && Array.isArray(example.walkthrough)
      && example.walkthrough.length > 0
      && (example.walkthrough as unknown[]).every(isText)
      && isText(example.insight);
    if (!exampleIsValid) errors.push({ code: "INVALID_CONCRETE_EXAMPLE", path: `${path}.concreteExample`, message: "concreteExample must strictly contain title, scenario, nonempty walkthrough, and insight / concreteExample 必须严格包含标题、情境、非空步骤和洞见。" });
    if (isText(raw.id)) { const id = raw.id.trim(); if (ids.has(id)) errors.push({ code: "DUPLICATE_ID", path: `${path}.id`, message: "Evidence card id must be unique / 证据卡 id 不可重复。" }); ids.add(id); }
    if (!isText(raw.claimType) || !claimTypes.has(raw.claimType)) errors.push({ code: "UNSUPPORTED_CLAIM_TYPE", path: `${path}.claimType`, message: "Unsupported claimType / claimType 不受支持。" });
    if (!isText(raw.sourceType) || !sourceTypes.has(raw.sourceType)) errors.push({ code: "UNSUPPORTED_SOURCE_TYPE", path: `${path}.sourceType`, message: "Unsupported sourceType / sourceType 不受支持。" });
    if (!isText(raw.confidence) || !confidences.has(raw.confidence)) errors.push({ code: "UNSUPPORTED_CONFIDENCE", path: `${path}.confidence`, message: "confidence must be high, medium, or low / confidence 必须为 high、medium 或 low。" });
    if (!isText(raw.sourceUrl) || !isHttpUrl(raw.sourceUrl)) errors.push({ code: "MALFORMED_URL", path: `${path}.sourceUrl`, message: "sourceUrl must be an http(s) URL / sourceUrl 必须为 http(s) URL。" });
    if (!isText(raw.publicationDate) || !isDate(raw.publicationDate)) errors.push({ code: "INVALID_DATE", path: `${path}.publicationDate`, message: "publicationDate must be a valid YYYY, YYYY-MM, or YYYY-MM-DD date / publicationDate 必须是有效 YYYY、YYYY-MM 或 YYYY-MM-DD 日期。" });
    if (typeof raw.inference !== "boolean") errors.push({ code: "INVALID_INFERENCE", path: `${path}.inference`, message: "inference must be boolean / inference 必须为布尔值。" });
    const disputesAreValid = Array.isArray(raw.disputes) && (raw.disputes as unknown[]).every(isText);
    const supportsAreValid = Array.isArray(raw.supports) && (raw.supports as unknown[]).every(isText);
    if (!disputesAreValid) errors.push({ code: "INVALID_REFERENCE_LIST", path: `${path}.disputes`, message: "disputes must be an array of nonempty strings / disputes 必须是非空字符串数组（可为空）。" });
    if (!supportsAreValid) errors.push({ code: "INVALID_REFERENCE_LIST", path: `${path}.supports`, message: "supports must be an array of nonempty strings / supports 必须是非空字符串数组（可为空）。" });
    if (errors.length === cardErrorStart) normalizedEntries.push({ index, card: { id: String(raw.id).trim(), claim: String(raw.claim).trim(), claimType: raw.claimType as EvidenceCard["claimType"], historicalContext: String(raw.historicalContext).trim(), mechanism: String(raw.mechanism).trim(), problemSolved: String(raw.problemSolved).trim(), concreteExample: { title: String((example as Record<string, unknown>).title).trim(), scenario: String((example as Record<string, unknown>).scenario).trim(), walkthrough: ((example as Record<string, unknown>).walkthrough as string[]).map((x) => x.trim()), insight: String((example as Record<string, unknown>).insight).trim() }, frameworkSignificance: String(raw.frameworkSignificance).trim(), sourceUrl: String(raw.sourceUrl).trim(), sourceTitle: String(raw.sourceTitle).trim(), sourceType: raw.sourceType as EvidenceCard["sourceType"], publicationDate: String(raw.publicationDate).trim(), evidenceSummary: String(raw.evidenceSummary).trim(), confidence: raw.confidence as EvidenceCard["confidence"], inference: raw.inference as boolean, disputes: (raw.disputes as string[]).map((x) => x.trim()), supports: (raw.supports as string[]).map((x) => x.trim()) } });
  });
  const known = new Set(normalizedEntries.map((entry) => entry.card.id));
  normalizedEntries.forEach(({ card, index }) => card.supports.forEach((id, refIndex) => { if (!known.has(id)) errors.push({ code: "UNKNOWN_SUPPORT", path: `cards[${index}].supports[${refIndex}]`, message: `supports references unknown id: ${id} / supports 引用了不存在的 id：${id}。` }); }));
  const byId = new Map(normalizedEntries.map(({ card }) => [card.id, card]));
  normalizedEntries.forEach(({ card, index }) => {
    const qualifiedNegation = /(?:不(?:作|是|声称|主张).{0,8}(?:first|earliest|首次|最早)|(?:not|no)\s+.{0,12}(?:first|earliest))/i;
    if (!priorityPattern.test(card.claim) || qualifiedNegation.test(card.claim)) return;
    const visited = new Set<string>(); const sources: EvidenceCard[] = [];
    const visit = (id: string) => { if (visited.has(id)) return; visited.add(id); const candidate = byId.get(id); if (!candidate) return; if (credibleTypes.has(candidate.sourceType)) sources.push(candidate); candidate.supports.forEach(visit); };
    visit(card.id); const domains = new Set(sources.map((source) => { try { return new URL(source.sourceUrl).hostname.toLowerCase(); } catch { return source.sourceUrl; } }));
    if (domains.size < 2) errors.push({ code: "ABSOLUTE_PRIORITY_INSUFFICIENT", path: `cards[${index}].claim`, message: "Absolute first/earliest claims need two credible independent domains; qualify the claim or add support / 含首次或最早的绝对优先权主张须有两个独立可信域名来源。" });
  });
  return { ok: true, valid: errors.length === 0, errors, warnings, normalizedCards: normalizedCards() };
}

const planKeys = ["version", "concept", "settings", "disambiguationPrompts", "researchDimensions", "searchQueryGroups", "evidenceRequirements", "status"];
export function normalizeConcept(concept: string) { return concept.trim().replace(/\s+/g, " ").toLocaleLowerCase(); }
export function validateResearchPlan(input: unknown, requestedConcept: string): { valid: true; plan: ResearchPlan } | { valid: false; errors: Issue[] } {
  const errors: Issue[] = [];
  if (!isObject(input)) return { valid: false, errors: [{ code: "INVALID_PLAN", path: "plan", message: "plan must be an object / plan 必须是对象。" }] };
  for (const key of Object.keys(input)) if (!planKeys.includes(key)) errors.push({ code: "UNKNOWN_PLAN_PROPERTY", path: `plan.${key}`, message: "Research plan does not permit undeclared properties / 研究计划不允许未声明字段。" });
  for (const key of planKeys) if (!(key in input)) errors.push({ code: "REQUIRED_PLAN_FIELD", path: `plan.${key}`, message: "Research plan field is required / 研究计划字段必填。" });
  if (!isText(input.version)) errors.push({ code: "INVALID_PLAN", path: "plan.version", message: "version must be nonempty / version 必须非空。" });
  if (!isText(input.concept)) errors.push({ code: "INVALID_PLAN", path: "plan.concept", message: "concept must be nonempty / concept 必须非空。" }); else if (normalizeConcept(input.concept) !== normalizeConcept(requestedConcept)) errors.push({ code: "PLAN_CONCEPT_MISMATCH", path: "plan.concept", message: "plan.concept must match requested concept after trim/case normalization / plan.concept 必须与请求概念匹配。" });
  const settings = input.settings;
  if (!isObject(settings) || Object.keys(settings).some((key) => !["language", "audience", "depth"].includes(key)) || settings.language === undefined || settings.audience === undefined || settings.depth === undefined || !["zh-CN", "en"].includes(String(settings.language)) || !["beginner", "intermediate", "expert"].includes(String(settings.audience)) || !["brief", "standard", "deep"].includes(String(settings.depth))) errors.push({ code: "INVALID_PLAN", path: "plan.settings", message: "settings must strictly contain valid language, audience, and depth / settings 必须严格包含有效 language、audience、depth。" });
  if (!Array.isArray(input.disambiguationPrompts) || !(input.disambiguationPrompts as unknown[]).every(isText)) errors.push({ code: "INVALID_PLAN", path: "plan.disambiguationPrompts", message: "disambiguationPrompts must be a string array / disambiguationPrompts 必须是字符串数组。" });
  if (!Array.isArray(input.evidenceRequirements) || !(input.evidenceRequirements as unknown[]).every(isText)) errors.push({ code: "INVALID_PLAN", path: "plan.evidenceRequirements", message: "evidenceRequirements must be a string array / evidenceRequirements 必须是字符串数组。" });
  if (input.status !== "planned") errors.push({ code: "INVALID_PLAN", path: "plan.status", message: "status must be planned / status 必须为 planned。" });
  if (!Array.isArray(input.researchDimensions) || !(input.researchDimensions as unknown[]).every((item) => isObject(item) && Object.keys(item).every((key) => ["order", "name"].includes(key)) && Number.isInteger(item.order) && Number(item.order) > 0 && isText(item.name))) errors.push({ code: "INVALID_PLAN", path: "plan.researchDimensions", message: "researchDimensions must be strict {order,name} records / researchDimensions 必须为严格 {order,name} 记录。" });
  if (!Array.isArray(input.searchQueryGroups) || !(input.searchQueryGroups as unknown[]).every((item) => isObject(item) && Object.keys(item).every((key) => ["purpose", "queries"].includes(key)) && isText(item.purpose) && Array.isArray(item.queries) && (item.queries as unknown[]).every(isText))) errors.push({ code: "INVALID_PLAN", path: "plan.searchQueryGroups", message: "searchQueryGroups must be strict {purpose,queries} records / searchQueryGroups 必须为严格 {purpose,queries} 记录。" });
  return errors.length ? { valid: false, errors } : { valid: true, plan: input as ResearchPlan };
}

export function planConceptResearch(args: Record<string, unknown>) {
  const concept = String(args.concept).trim(); const language = (args.language ?? "zh-CN") as Language; const audience = (args.audience ?? "beginner") as ResearchPlan["settings"]["audience"]; const depth = (args.depth ?? "standard") as ResearchPlan["settings"]["depth"];
  const en = language === "en";
  const dimensions = en ? ["Definition and ambiguity", "Problems and precursors", "Naming and formalization", "Adoption, disputes, and transfer", "Current uses and boundaries"] : ["定义与歧义", "问题与前驱概念", "命名与形式化", "采用、争议与转移", "当前用法与边界"];
  const plan: ResearchPlan = { version: VERSION, concept, settings: { language, audience, depth }, disambiguationPrompts: en ? [`Which discipline or context of “${concept}” is in scope?`, "Should terms across languages or traditions be compared?"] : [`“${concept}”在本研究中指哪一学科或语境？`, "是否需要比较不同语言或传统中的术语？"], researchDimensions: dimensions.map((name, index) => ({ order: index + 1, name })), searchQueryGroups: en ? [{ purpose: "primary", queries: [`${concept} original paper`, `${concept} site:doi.org`] }, { purpose: "reviews", queries: [`${concept} history review`] }, { purpose: "transfer", queries: [`${concept} cross-disciplinary transfer`] }] : [{ purpose: "primary", queries: [`${concept} 原始文献`, `${concept} site:doi.org`] }, { purpose: "reviews", queries: [`${concept} 历史综述`] }, { purpose: "transfer", queries: [`${concept} 跨学科应用`] }], evidenceRequirements: en ? ["Prefer primary papers, books, academic reviews, and institutional references.", "Separate checkable claims from interpretive inferences.", "Distinguish chronology from causal explanation; record competing interpretations and uncertainty.", "Absolute priority claims require two independent credible source domains."] : ["优先原始论文、专著、学术综述与机构参考资料。", "将可核查事实与解释性推断分卡记录。", "区分事件先后与因果解释；记录竞争性解释与不确定性。", "绝对优先权措辞须有两个独立可信来源域名。"], status: "planned" };
  return { ok: true as const, plan };
}

function citation(card: EvidenceCard) { return { id: card.id, title: card.sourceTitle, url: card.sourceUrl, publicationDate: card.publicationDate, sourceType: card.sourceType }; }
export function renderConceptReport(args: Record<string, unknown>) {
  const concept = isText(args.concept) ? args.concept.trim() : ""; const language = (args.language ?? "zh-CN") as Language;
  if (!concept) return toolError("INVALID_ARGUMENT", "concept must be nonempty / concept 必须是非空字符串。");
  const mathMode = args.mathMode ?? "portable"; if (!isMathMode(mathMode)) return toolError("INVALID_ARGUMENT", "mathMode must be portable, latex, or html / mathMode 必须为 portable、latex 或 html。");
  const checkedPlan = validateResearchPlan(args.plan, concept); if (!checkedPlan.valid) return toolError("INVALID_PLAN", "Research plan failed validation / 研究计划未通过校验。", checkedPlan.errors);
  if (args.language !== undefined && language !== checkedPlan.plan.settings.language) return toolError("PLAN_LANGUAGE_MISMATCH", "Explicit render language must match plan.settings.language / 显式渲染语言必须与 plan.settings.language 一致。", { renderLanguage: language, planLanguage: checkedPlan.plan.settings.language });
  const resolvedLanguage = args.language === undefined ? checkedPlan.plan.settings.language : language;
  const validation = validateEvidenceCards(args.evidenceCards); if (!validation.valid) return toolError("INVALID_EVIDENCE", "Evidence cards failed validation / 证据卡未通过校验，拒绝生成报告。", validation);
  const cards = validation.normalizedCards; const en = resolvedLanguage === "en"; const byType = (type: EvidenceCard["claimType"]) => cards.filter((card) => card.claimType === type);
  const item = (card: EvidenceCard) => ({ claim: card.claim, date: card.publicationDate, historicalContext: card.historicalContext, mechanism: card.mechanism, problemSolved: card.problemSolved, concreteExample: card.concreteExample, frameworkSignificance: card.frameworkSignificance, citation: citation(card), inference: card.inference, disputes: card.disputes });
  const timeline = [...cards].sort((a, b) => a.publicationDate.localeCompare(b.publicationDate)).map(item);
  const problemChain = ["precursor", "coinage", "formalization", "adoption"].map((stage) => ({ stage, claims: byType(stage as EvidenceCard["claimType"]).map(item) }));
  const transfers = byType("transfer").map(item); const current = byType("current-use").map(item);
  const uncertainties = cards.filter((card) => card.inference || card.disputes.length || card.confidence !== "high").map((card) => ({ claim: card.claim, reasons: [...(card.inference ? [en ? "marked inference" : "标为推断"] : []), ...(card.confidence !== "high" ? [`${en ? "confidence" : "置信度"}: ${card.confidence}`] : []), ...card.disputes] }));
  const report = { title: en ? `${concept}: concept genealogy report` : `${concept}：概念谱系报告`, summary: en ? `This report organizes only the ${cards.length} supplied, validated evidence cards for “${concept}”; it adds no facts outside those cards.` : `本报告仅整理所提供的 ${cards.length} 张已校验证据卡，描述“${concept}”的可追溯概念路径；未把卡外知识补入结论。`, timeline, problemChain, crossDomainTransfers: transfers, currentLandscape: current, learningPath: en ? ["Read the timeline to establish sequence.", "Compare precursor, coinage, formalization, and adoption without treating sequence as causation.", "Review transfers, current uses, uncertainties, and the linked sources."] : ["先阅读时间线，建立术语与问题的先后关系。", "再比较前驱、命名、形式化与采用，不将先后自动视为因果。", "最后检查跨域转移、当前用法与不确定性，并打开原始引文复核。"], uncertainties, citations: cards.map(citation), mathMode, markdown: "", html: null as string | null };
  const heading = (zh: string, english: string) => en ? english : zh; const ref = (record: ReturnType<typeof item>) => `[${record.citation.id}](${record.citation.url})`;
  const markdownFor = (mode: "portable" | "latex") => {
    const text = (value: string) => formatMath(value, mode);
    const knowledgeUnit = (record: ReturnType<typeof item>, level = 3) => {
    const h = "#".repeat(level);
      return [`${h} ${record.date}｜${text(record.concreteExample.title)}`, "", `**${heading("节点主张", "Node claim")}：** ${text(record.claim)} ${ref(record)}`, "", `**${heading("历史/应用情境", "Historical/application context")}：** ${text(record.historicalContext)}`, "", `**${heading("核心机制", "Core mechanism")}：** ${text(record.mechanism)}`, "", `**${heading("解决的问题", "Problem solved")}：** ${text(record.problemSolved)}`, "", `**${heading("具体实例", "Concrete example")}：** ${text(record.concreteExample.scenario)}`, ...record.concreteExample.walkthrough.map((step, index) => `${index + 1}. ${text(step)}`), "", `**${heading("从实例得到的洞见", "Insight from the example")}：** ${text(record.concreteExample.insight)}`, "", `**${heading("对知识框架的意义", "Framework significance")}：** ${text(record.frameworkSignificance)}`];
    };
    return [`# ${text(report.title)}`, "", text(report.summary), "", `## ${heading("时间线", "Timeline")}`, "", ...timeline.flatMap((record) => [...knowledgeUnit(record), ""]), `## ${heading("问题链", "Problem chain")}`, "", ...problemChain.flatMap((group) => [`### ${group.stage}`, "", ...(group.claims.length ? group.claims.flatMap((record) => [...knowledgeUnit(record, 4), ""]) : [`- ${heading("未提供此阶段的证据卡。", "No evidence cards were provided for this stage.")}`, ""])]), `## ${heading("跨领域转移", "Cross-domain transfers")}`, "", ...(transfers.length ? transfers.flatMap((record) => [...knowledgeUnit(record), ""]) : [`- ${heading("未提供此类证据卡。", "No evidence cards were provided.")}`, ""]), `## ${heading("当前图景", "Current landscape")}`, "", ...(current.length ? current.flatMap((record) => [...knowledgeUnit(record), ""]) : [`- ${heading("未提供此类证据卡。", "No evidence cards were provided.")}`, ""]), `## ${heading("初学者学习路径", "Beginner learning path")}`, ...report.learningPath.map((entry, index) => `${index + 1}. ${text(entry)}`), "", `## ${heading("不确定性", "Uncertainties")}`, ...(uncertainties.length ? uncertainties.map((entry) => `- ${text(entry.claim)} (${entry.reasons.map(text).join("; ")})`) : [`- ${heading("已提供的卡未标记额外不确定性；这不代表不存在未收录的争议。", "The supplied cards have no additional uncertainty markers; this does not establish the absence of unrecorded disputes.")}`]), "", `## ${heading("引文", "Citations")}`, ...cards.map((card) => `- ${text(card.sourceTitle)} (${card.publicationDate}): ${card.sourceUrl}`)].join("\n");
  };
  report.markdown = markdownFor(mathMode === "html" ? "portable" : mathMode);
  if (mathMode === "html") report.html = renderHtmlDocument(report.title, markdownFor("latex"), resolvedLanguage);
  return { ok: true as const, report, validation };
}
