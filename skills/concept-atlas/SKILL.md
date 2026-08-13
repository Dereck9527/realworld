---
name: concept-atlas
description: Build cited concept origins, intellectual history and genealogy, evolution and paradigm formation, interdisciplinary/domain transfer, contemporary meanings/applications/user communities, and novice knowledge frameworks.
---

# Concept Atlas

Turn a novice's concept question into a transparent, evidence-reviewed genealogy—not a single-inventor story or a citation-shaped guess.

## Intake gate

Require the concept. Accept optional domain/context, audience level, depth (`quick`, `standard`, or `deep`), language, evidence cutoff, and output preference. Ask a question only when different meanings or contexts would materially change the result; otherwise state the chosen assumption and proceed. Read [the report contract](references/report-contract.md) before drafting.

## Research gate

When web research is available and allowed, browse for origin, history, and current-use claims; open and read the sources rather than relying on search snippets. Automatic web research requires the external Keenable web adapter and the `KENABLE_API_KEY` environment variable to be configured before the adapter/Codex process starts. Never place the key in tool arguments, plugin files, evidence cards, reports, logs, or Git history. Follow [source and evidence policy](references/source-evidence-policy.md), then use [roles and ledger](references/roles-ledger.md) to decompose the question and attach sources before writing. If browsing is unavailable, authentication fails, or browsing is prohibited, call the result `provisional`, state the limitation truthfully, and do not interpret authentication failure as evidence that sources do not exist.

Depth: `quick` establishes identity, a small role map, and a compact prerequisite map; `standard` covers every report section with checked sources; `deep` triangulates consequential priority claims, compares scholarly disputes, and expands transfers/current-use communities.

## Synthesis gate

Use the exact numbered report order in [the report contract](references/report-contract.md). Separate precursor, coinage, formalization, validation, popularization, adoption, transfer, and reinterpretation; do not collapse them into a great-person narrative. Every consequential claim needs source ID(s) in the ledger before synthesis. Distinguish event dates from publication dates, facts from inferences, and uncertainty from absence of evidence. Score before delivery with [the quality rubric](references/quality-rubric.md).

## Validate and adapt

Run `python3 scripts/validate_report.py REPORT.md [--json]` for structural checks only. It cannot establish authority, provenance, entailment, or historical truth; the research gate remains controlling. For shapes and non-fabricated examples, read [examples](references/examples.md). For the same process in ordinary ChatGPT, use [the portable workflow](references/portable-chatgpt-workflow.md).
