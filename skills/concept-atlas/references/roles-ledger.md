# Historical roles and claim-source ledger

## Contribution-role taxonomy

Use one or more of these exact role values. A person, text, institution, or community may fill several roles, but each role needs its own evidence.

| Role | Meaning |
|---|---|
| `precursor` | Earlier idea, practice, or problem that substantially anticipates part of the concept. |
| `coinage` | First documented use or stabilization of the term/label. |
| `formalization` | Explicit mathematical, logical, legal, technical, or systematic formulation. |
| `experimental-or-empirical-validation` | Relevant measurement, experiment, observation, or empirical test. |
| `popularization` | Translation into wider public, educational, or practitioner discourse. |
| `institutional-adoption-or-paradigm-formation` | Entrenchment in curricula, standards, organizations, or a research/programmatic framework. |
| `cross-domain-transfer` | Adaptation into another domain, with a stated mechanism and changed meaning. |
| `reinterpretation` | Later reframing, critique, extension, or change in scope. |

Do not equate earliest precursor with coinage, formalization, or validation. Reject a single-inventor narrative unless sources genuinely support all relevant roles.

## Ledger schema

The canonical report contains this Markdown table, with these exact headers in this exact order:

| Claim ID | Claim | Role | Source IDs | Confidence | Notes |
|---|---|---|---|---|---|

One row per consequential claim. `Claim ID` is a unique identifier such as `C1`; `Role` is one taxonomy value; `Source IDs` contains one or more citations such as `[S1]` and `[S2]`; `Confidence` is `high`, `medium`, or `low`; `Notes` identifies event date, interpretation, dispute, or limitation where useful. Map every consequential prose claim to ledger source ID(s) before synthesis. A source may support multiple claims, but do not treat a source as support without inspecting it.
