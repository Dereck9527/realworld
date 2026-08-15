import { isMathMode, renderConceptReport, type MathMode } from "../core.ts";

const positional: string[] = []; let mathMode: MathMode = "portable";
for (let index = 2; index < Bun.argv.length; index += 1) {
  const argument = Bun.argv[index];
  if (argument === "--math") {
    const candidate = Bun.argv[index + 1]; if (!isMathMode(candidate)) { console.error("--math 必须为 portable、latex 或 html。"); process.exit(2); }
    mathMode = candidate; index += 1; continue;
  }
  if (argument.startsWith("--math=")) {
    const candidate = argument.slice("--math=".length); if (!isMathMode(candidate)) { console.error("--math 必须为 portable、latex 或 html。"); process.exit(2); }
    mathMode = candidate; continue;
  }
  positional.push(argument);
}

const inputPath = positional[0];
if (!inputPath) {
  console.error("用法：bun mcp/scripts/render-report.ts <evidence-json-path> [output-path] [--math=portable|latex|html]");
  process.exit(2);
}

const input = await Bun.file(inputPath).json() as { concept: string; plan: unknown; evidenceCards: unknown[]; provenance?: { kind?: string; lastReviewed?: string } };
const result = renderConceptReport({ concept: input.concept, plan: input.plan, evidenceCards: input.evidenceCards, mathMode });
if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

const outputPath = positional[1] ?? inputPath.replace(/\.json$/i, mathMode === "html" ? ".html" : ".md");
if (mathMode === "html" && !/\.html?$/i.test(outputPath)) {
  console.error("mathMode=html 的输出文件应使用 .html 扩展名。");
  process.exit(2);
}
const header = input.provenance?.kind === "demo-fixture"
  ? `> **演示 fixture（离线、非实时）**｜最后复核：${input.provenance.lastReviewed ?? "未提供"}｜由同一共享校验器与渲染器生成。\n\n`
  : `> **Concept Atlas 研究报告**｜输入：${inputPath}｜由同一共享校验器与渲染器生成。\n\n`;
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character] ?? character);
const htmlHeader = input.provenance?.kind === "demo-fixture"
  ? `演示 fixture（离线、非实时）｜最后复核：${input.provenance.lastReviewed ?? "未提供"}｜由同一共享校验器与渲染器生成。`
  : `Concept Atlas 研究报告｜输入：${inputPath}｜由同一共享校验器与渲染器生成。`;
const output = mathMode === "html"
  ? result.report.html!.replace("<article>", `<article>\n<p class="note">${escapeHtml(htmlHeader)}</p>`)
  : `${header}${result.report.markdown}\n`;
await Bun.write(outputPath, output);
console.log(`已生成 ${outputPath}（mathMode: ${mathMode}）`);
