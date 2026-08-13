#!/usr/bin/env python3
"""Structural validator for Concept Atlas reports; it performs no web access."""
from __future__ import annotations

import argparse
from datetime import date
import json
import re
import sys
from pathlib import Path

HEADINGS = [
    "## 1. Scope and assumptions",
    "## 2. Research mode and evidence cutoff",
    "## 3. Concept identity and disambiguation",
    "## 4. Genealogy and historical roles",
    "## 5. Cross-domain transfer",
    "## 6. Current meanings, applications, communities",
    "## 7. Beginner knowledge framework",
    "## 8. Uncertainty and open questions",
    "## 9. Claim-source ledger",
    "## 10. References",
]
LEDGER_HEADER = "| Claim ID | Claim | Role | Source IDs | Confidence | Notes |"
ROLES = {
    "precursor", "coinage", "formalization", "experimental-or-empirical-validation",
    "popularization", "institutional-adoption-or-paradigm-formation",
    "cross-domain-transfer", "reinterpretation",
}
DISCLAIMER = ("Structural validation only: source authority, provenance truth, claim "
              "entailment, and historical accuracy were not validated.")


def heading_positions(text: str) -> dict[str, list[int]]:
    """Return exact, unfenced H2 heading line positions."""
    positions = {heading: [] for heading in HEADINGS}
    fence: tuple[str, int] | None = None
    for line_number, line in enumerate(text.splitlines()):
        stripped = line.strip()
        marker = re.match(r"^(`{3,}|~{3,})(.*)$", stripped)
        if fence is None and marker:
            fence = (marker.group(1)[0], len(marker.group(1)))
            continue
        if fence is not None:
            closing = re.match(r"^([`~]+)\s*$", stripped)
            if closing and closing.group(1)[0] == fence[0] and len(closing.group(1)) >= fence[1]:
                fence = None
            continue
        if line in positions:
            positions[line].append(line_number)
    return positions


def sections(text: str, positions: dict[str, list[int]]) -> dict[str, str]:
    """Safely extract unique sections, even if the report's headings are malformed."""
    lines = text.splitlines()
    all_heading_lines = sorted(
        location for locations in positions.values() for location in locations
    )
    extracted: dict[str, str] = {}
    for heading, locations in positions.items():
        if len(locations) != 1:
            extracted[heading] = ""
            continue
        start = locations[0] + 1
        end = next((location for location in all_heading_lines if location >= start), len(lines))
        extracted[heading] = "\n".join(lines[start:end])
    return extracted


def is_canonical_date(value: str) -> bool:
    try:
        return bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}", value)) and date.fromisoformat(value).isoformat() == value
    except ValueError:
        return False


def validate(text: str) -> list[str]:
    errors: list[str] = []
    found = heading_positions(text)
    positions: list[int] = []
    for heading in HEADINGS:
        count = len(found[heading])
        if count != 1:
            errors.append(f"required heading must appear exactly once: {heading} (found {count})")
        elif count == 1:
            positions.append(found[heading][0])
    if len(positions) == len(HEADINGS) and positions != sorted(positions):
        errors.append("required headings are not in canonical order")
    extracted = sections(text, found)

    todo = "".join(map(chr, [84, 79, 68, 79]))
    prohibited = re.compile(rf"\b(?:{todo}|TBD|TBC|FIXME)\b|\[{todo}[^\]]*\]|<[^>\n]+>", re.I)
    for match in prohibited.finditer(text):
        errors.append(f"prohibited placeholder token: {match.group(0)!r}")

    if len(found[HEADINGS[1]]) == 1:
        mode_block = extracted[HEADINGS[1]]
        mode_match = re.search(r"^\s*(?:[-*]\s*)?Research mode:\s*(\S+)\s*$", mode_block, re.M | re.I)
        cutoff_match = re.search(r"^\s*(?:[-*]\s*)?Evidence cutoff:\s*(\d{4}-\d{2}-\d{2})\s*$", mode_block, re.M | re.I)
        if not mode_match or mode_match.group(1).lower() not in {"verified", "provisional"}:
            errors.append("Research mode must be exactly verified or provisional")
        if not cutoff_match or not is_canonical_date(cutoff_match.group(1)):
            errors.append("Evidence cutoff must be a real canonical YYYY-MM-DD calendar date")
        if mode_match and mode_match.group(1).lower() == "provisional":
            uncertainty = extracted[HEADINGS[7]]
            required_phrases = (
                r"evidence\s+limitation\s*:",
                r"this\s+report\s+is\s+provisional",
                r"requires\s+source\s+review\s+before\s+reliance",
                r"browsing\s+was\s+(?:unavailable|prohibited)",
            )
            if not all(re.search(phrase, uncertainty, re.I) for phrase in required_phrases):
                errors.append("provisional reports need Section 8 limitation text with browsing was unavailable or browsing was prohibited")

    if len(found[HEADINGS[8]]) == 1:
        ledger = extracted[HEADINGS[8]]
        lines = [line.strip() for line in ledger.splitlines() if line.strip().startswith("|")]
        if not lines or lines[0] != LEDGER_HEADER:
            errors.append("ledger must use the exact required header")
        else:
            data_rows = [line for line in lines[1:] if not re.fullmatch(r"\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*){5}\|", line)]
            if not data_rows:
                errors.append("ledger requires at least one claim row")
            claim_ids: set[str] = set()
            for row in data_rows:
                cells = [cell.strip() for cell in row.strip("|").split("|")]
                if len(cells) != 6:
                    errors.append(f"ledger row has {len(cells)} cells, expected 6: {row}")
                    continue
                if cells[0] in claim_ids:
                    errors.append(f"duplicate claim ID: {cells[0]}")
                claim_ids.add(cells[0])
                if cells[2] not in ROLES:
                    errors.append(f"invalid ledger role: {cells[2]}")
                if cells[4] not in {"high", "medium", "low"}:
                    errors.append(f"invalid ledger confidence: {cells[4]}")
                if not re.search(r"\[S\d+\]", cells[3]):
                    errors.append(f"ledger row {cells[0]} has no source ID")

    refs: dict[str, str] = {}
    if len(found[HEADINGS[9]]) == 1:
        reference_text = extracted[HEADINGS[9]]
        for line in reference_text.splitlines():
            match = re.match(r"\s*[-*]\s*\[(S\d+)\]\s+.+?\s+(https?://\S+)\s*$", line)
            if match:
                source_id, url = match.groups()
                if source_id in refs:
                    errors.append(f"duplicate reference source ID: {source_id}")
                refs[source_id] = url
            elif re.match(r"\s*[-*]\s*\[S\d+\]", line):
                errors.append(f"invalid reference syntax or non-http(s) URL: {line.strip()}")
        if not refs:
            errors.append("references need [S#] entries with direct http(s) URLs")
    cited = set(re.findall(r"\[(S\d+)\]", text))
    unresolved = sorted(cited - set(refs))
    for source_id in unresolved:
        errors.append(f"unresolved source ID: {source_id}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Concept Atlas report structure only.")
    parser.add_argument("report", help="Markdown report path")
    parser.add_argument("--json", action="store_true", dest="as_json")
    args = parser.parse_args()
    try:
        text = Path(args.report).read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        payload = {"valid": False, "errors": [f"read error: {exc}"], "disclaimer": DISCLAIMER}
        print(json.dumps(payload, ensure_ascii=False) if args.as_json else f"ERROR: {payload['errors'][0]}")
        return 2
    errors = validate(text)
    payload = {"valid": not errors, "errors": errors, "disclaimer": DISCLAIMER}
    if args.as_json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print("VALID" if not errors else "INVALID")
        for error in errors:
            print(f"- {error}")
        print(DISCLAIMER)
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
