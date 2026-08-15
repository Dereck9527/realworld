import { describe, expect, test } from "bun:test";
import { planConceptResearch, renderConceptReport, validateEvidenceCards } from "../core.ts";
import fixture from "../fixtures/entropy.json" with { type: "json" };

describe("evidence validator", () => {
  test("accepts bundled cards, its reduced dates, and returns top-level ok", () => {
    const result = validateEvidenceCards(fixture.evidenceCards); expect(result).toMatchObject({ ok: true, valid: true }); expect(result.normalizedCards.map((card) => card.publicationDate)).toContain("1865");
  });
  test("accepts valid year, month, and day but rejects invalid calendar dates", () => {
    const cards = structuredClone(fixture.evidenceCards); cards[0].publicationDate = "1824-02"; cards[1].publicationDate = "1865-02-28"; expect(validateEvidenceCards(cards).valid).toBe(true); cards[1].publicationDate = "1865-02-30"; expect(validateEvidenceCards(cards).errors.map((issue) => issue.code)).toContain("INVALID_DATE");
  });
  test("rejects malformed, duplicate, unknown, and ungrounded priority evidence", () => {
    const cards = structuredClone(fixture.evidenceCards); cards[1].id = cards[0].id; cards[0].sourceUrl = "not-a-url"; (cards[0] as Record<string, unknown>).extra = true; cards[2].supports = ["absent"]; cards[2].claim = "这是最早的熵定义。";
    const codes = validateEvidenceCards(cards).errors.map((issue) => issue.code); for (const code of ["DUPLICATE_ID", "MALFORMED_URL", "UNKNOWN_PROPERTY", "UNKNOWN_SUPPORT", "ABSOLUTE_PRIORITY_INSUFFICIENT"]) expect(codes).toContain(code);
  });
  test("returns structured validation when disputes or supports contain non-strings", () => {
    const cards = structuredClone(fixture.evidenceCards); cards[0].disputes = [42] as unknown as string[]; cards[1].supports = [false] as unknown as string[];
    const result = validateEvidenceCards(cards);
    expect(result).toMatchObject({ ok: true, valid: false }); expect(result.errors).toEqual(expect.arrayContaining([expect.objectContaining({ code: "INVALID_REFERENCE_LIST", path: "cards[0].disputes" }), expect.objectContaining({ code: "INVALID_REFERENCE_LIST", path: "cards[1].supports" })])); expect(result.normalizedCards.map((card) => card.id)).not.toContain(cards[0].id); expect(result.normalizedCards.map((card) => card.id)).not.toContain(cards[1].id);
  });
  test("does not normalize cards with single-card schema violations", () => {
    const cards = structuredClone(fixture.evidenceCards); cards[0].sourceUrl = "not-a-url"; cards[1].publicationDate = "1865-02-30"; cards[2].claimType = "unsupported"; cards[3].inference = "no" as unknown as boolean; (cards[4] as Record<string, unknown>).unexpected = true;
    const result = validateEvidenceCards(cards);
    expect(result).toMatchObject({ ok: true, valid: false }); expect(result.errors.map((issue) => issue.code)).toEqual(expect.arrayContaining(["MALFORMED_URL", "INVALID_DATE", "UNSUPPORTED_CLAIM_TYPE", "INVALID_INFERENCE", "UNKNOWN_PROPERTY"])); for (const id of cards.slice(0, 5).map((card) => card.id)) expect(result.normalizedCards.map((card) => card.id)).not.toContain(id);
  });
});

describe("planner and renderer", () => {
  test("planner returns a strict Chinese plan and a fully English plan", () => {
    const zh = planConceptResearch({ concept: "熵" }); const en = planConceptResearch({ concept: "entropy", language: "en", depth: "deep" });
    expect(zh).toMatchObject({ ok: true, plan: { version: "0.3.0", concept: "熵", status: "planned" } }); expect(en.plan.settings).toMatchObject({ language: "en", depth: "deep" }); expect(en.plan.researchDimensions[0].name).toBe("Definition and ambiguity"); expect(en.plan.evidenceRequirements[0]).toContain("Prefer");
  });
  test("renderer enforces strict plans and concept matching before rendering", () => {
    const plan = planConceptResearch({ concept: "熵" }).plan; const success = renderConceptReport({ concept: " 熵 ", plan, evidenceCards: fixture.evidenceCards }); expect(success).toMatchObject({ ok: true, report: { title: "熵：概念谱系报告" } });
    const malformed = structuredClone(plan) as Record<string, unknown>; delete malformed.status; expect(renderConceptReport({ concept: "熵", plan: malformed, evidenceCards: fixture.evidenceCards })).toMatchObject({ ok: false, error: { code: "INVALID_PLAN" } });
    const mismatch = structuredClone(plan); mismatch.concept = "energy"; expect(renderConceptReport({ concept: "熵", plan: mismatch, evidenceCards: fixture.evidenceCards })).toMatchObject({ ok: false, error: { code: "INVALID_PLAN" } });
  });
  test("renderer refuses invalid evidence and fully localizes English reports", () => {
    const englishPlan = planConceptResearch({ concept: "entropy", language: "en" }).plan; const english = renderConceptReport({ concept: "entropy", plan: englishPlan, evidenceCards: fixture.evidenceCards }); expect(english).toMatchObject({ ok: true, report: { title: "entropy: concept genealogy report" } }); if (english.ok) expect(english.report.markdown).toContain("## Timeline");
    expect(renderConceptReport({ concept: "entropy", plan: englishPlan, evidenceCards: fixture.evidenceCards, language: "zh-CN" })).toMatchObject({ ok: false, error: { code: "PLAN_LANGUAGE_MISMATCH" } });
    const badCards = structuredClone(fixture.evidenceCards); badCards[0].publicationDate = "not-date"; expect(renderConceptReport({ concept: "熵", plan: planConceptResearch({ concept: "熵" }).plan, evidenceCards: badCards })).toMatchObject({ ok: false, error: { code: "INVALID_EVIDENCE" } });
  });

  test("renders formulas as portable Markdown, normalized LaTex, or standalone HTML", () => {
    const cards = structuredClone(fixture.evidenceCards);
    cards[1].mechanism = "状态函数可写作 \\(S = k \\ln W\\)。";
    cards[1].concreteExample.walkthrough[0] = "\\[H(X) = -\\sum_{x=1}^{n} p(x) \\log_2 p(x)\\]";
    const plan = planConceptResearch({ concept: "熵" }).plan;
    const portable = renderConceptReport({ concept: "熵", plan, evidenceCards: cards, mathMode: "portable" });
    const latex = renderConceptReport({ concept: "熵", plan, evidenceCards: cards, mathMode: "latex" });
    const html = renderConceptReport({ concept: "熵", plan, evidenceCards: cards, mathMode: "html" });
    if (!portable.ok || !latex.ok || !html.ok) throw new Error("Expected every math mode to render.");
    expect(portable.report.mathMode).toBe("portable"); expect(portable.report.markdown).toContain("S = k ln W"); expect(portable.report.markdown).toContain("Σ(x=1…n)"); expect(portable.report.markdown).not.toContain("\\\\(");
    expect(latex.report.mathMode).toBe("latex"); expect(latex.report.markdown).toContain("$S = k \\ln W$"); expect(latex.report.markdown).toContain("$$\nH(X) = -\\sum_{x=1}^{n} p(x) \\log_2 p(x)\n$$");
    expect(html.report.mathMode).toBe("html"); expect(html.report.markdown).toContain("S = k ln W"); expect(html.report.html).toContain("MathJax"); expect(html.report.html).toContain("$S = k \\ln W$");
    expect(renderConceptReport({ concept: "熵", plan, evidenceCards: cards, mathMode: "svg" })).toMatchObject({ ok: false, error: { code: "INVALID_ARGUMENT" } });
  });

  test("renders every knowledge unit with context, mechanism, example, and framework significance", () => {
    const result = renderConceptReport({ concept: "熵", plan: planConceptResearch({ concept: "熵" }).plan, evidenceCards: fixture.evidenceCards });
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      const first = result.report.timeline[0];
      expect(first).toMatchObject({ historicalContext: expect.any(String), mechanism: expect.any(String), problemSolved: expect.any(String), concreteExample: { title: expect.any(String), scenario: expect.any(String), walkthrough: expect.any(Array), insight: expect.any(String) }, frameworkSignificance: expect.any(String) });
      expect(result.report.markdown).toContain("具体实例"); expect(result.report.markdown).toContain("对知识框架的意义");
    }
  });
});
