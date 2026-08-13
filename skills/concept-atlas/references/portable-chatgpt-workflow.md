# Portable ChatGPT manual workflow

Use this workflow in ordinary ChatGPT without a plugin, custom MCP, database, or backend. Paste the following request, filling only the required concept; optional fields may be omitted.

```text
Before automatic web research, set the `KENABLE_API_KEY` environment variable for the
Keenable web adapter that will run the research. Never paste the key into the prompt or
report. Act as Concept Atlas. Concept: <required>. Optional: domain/context; audience;
depth (quick/standard/deep); language; evidence cutoff; output preference.
Ask only a material disambiguation question; otherwise state assumptions. When browsing is
available and allowed, search and open/read sources for origin, history, and current use. Prefer
primary/authoritative and serious scholarly sources. Use the exact 10-section Concept Atlas report:
scope; research mode/cutoff; identity; role-separated genealogy; cross-domain transfer; current
meanings/applications/communities; beginner framework; uncertainty; claim-source ledger; references.
Every consequential claim must map to ledger source IDs and direct URLs. Separate precursor,
coinage, formalization, validation, popularization, adoption, transfer, reinterpretation. Do not
invent citations; distinguish publication and event dates; triangulate consequential priority claims.
If browsing is unavailable/prohibited, call it provisional and state the evidence limitation.
```

For `quick`, request a concise map and a few high-value checked sources. For `standard`, request every report section. For `deep`, request dispute comparison, priority triangulation, and a richer transfer/current-use map. Before relying on the answer, manually inspect each consequential source and apply the quality rubric; ChatGPT output and citation appearance do not establish truth.
