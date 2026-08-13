# Canonical Markdown report contract

Use this deterministic order and exact H2 headings once each. Do not renumber or omit a section.

```markdown
# Concept Atlas: <concept>

## 1. Scope and assumptions
## 2. Research mode and evidence cutoff
- Research mode: verified
- Evidence cutoff: YYYY-MM-DD
## 3. Concept identity and disambiguation
## 4. Genealogy and historical roles
## 5. Cross-domain transfer
## 6. Current meanings, applications, communities
## 7. Beginner knowledge framework
## 8. Uncertainty and open questions
## 9. Claim-source ledger
| Claim ID | Claim | Role | Source IDs | Confidence | Notes |
|---|---|---|---|---|---|
| C1 | ... | precursor | [S1] | medium | Event date: ... |
## 10. References
- [S1] Author or organization, *title* (publication date if known). https://example.org/direct-source
```

In `Scope`, identify the requested sense, audience, depth, language, output preference, and any assumption. Section 2 must visibly use only `verified` or `provisional`, with an ISO `YYYY-MM-DD` cutoff. A provisional report must include this exact idea in Section 8: `Evidence limitation: browsing was unavailable or prohibited; this report is provisional and requires source review before reliance.` Adjust only the reason (`unavailable`/`prohibited`) to be truthful.

Section 4 organizes evidence by the role taxonomy, not merely chronology. Section 5 explains what transferred, into which domain, by whom/community if known, and what changed. Section 6 separates present meanings, applications, and communities with current-use evidence up to the cutoff. Section 7 gives prerequisites, dependency order, common confusions, and a first learning path. Section 8 labels uncertainty, scholarly disputes, and inference.

Use source IDs `[S1]`, `[S2]`, etc. in prose and ledger rows. The References section lists every ID once with a direct `http(s)` URL. The validator checks format only; its success does not validate source authority, provenance, claim entailment, or historical accuracy.
