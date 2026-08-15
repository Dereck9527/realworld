import { renderConceptReport } from "../core.ts";
import fixture from "../fixtures/entropy.json" with { type: "json" };

const result = renderConceptReport({ concept: "熵", plan: fixture.plan, evidenceCards: fixture.evidenceCards, language: "zh-CN" });
if (!result.ok) { console.error(JSON.stringify(result, null, 2)); process.exit(1); }
const header = `> **演示 fixture（离线、非实时）**｜最后复核：${fixture.lastReviewed}｜由同一共享校验器与渲染器生成。\n\n`;
await Bun.write(new URL("../../demo/entropy-report.md", import.meta.url), `${header}${result.report.markdown}\n`);
console.log("已生成 demo/entropy-report.md（共享校验器与渲染器均通过）。");
