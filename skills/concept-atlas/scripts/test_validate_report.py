#!/usr/bin/env python3
"""Offline deterministic tests for validate_report.py."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VALIDATOR = ROOT / "validate_report.py"
FIXTURES = ROOT / "tests" / "fixtures"


def run(path: Path, json_output: bool = False) -> subprocess.CompletedProcess[str]:
    command = [sys.executable, str(VALIDATOR), str(path)]
    if json_output:
        command.append("--json")
    return subprocess.run(command, text=True, capture_output=True, check=False)


def altered(directory: Path, name: str, base: str, old: str, new: str) -> Path:
    path = directory / f"{name}.md"
    path.write_text(base.replace(old, new), encoding="utf-8")
    return path


def main() -> int:
    failures: list[str] = []
    verified = run(FIXTURES / "valid-verified.md", True)
    provisional = run(FIXTURES / "valid-provisional.md", True)
    for name, result in (("verified", verified), ("provisional", provisional)):
        try:
            payload = json.loads(result.stdout)
        except json.JSONDecodeError:
            failures.append(f"{name}: output is not JSON")
            continue
        if result.returncode != 0 or not payload.get("valid") or "not validated" not in payload.get("disclaimer", ""):
            failures.append(f"{name}: expected valid JSON result, got {result.returncode}: {result.stdout}")

    base = (FIXTURES / "valid-verified.md").read_text(encoding="utf-8")
    provisional_base = (FIXTURES / "valid-provisional.md").read_text(encoding="utf-8")
    with tempfile.TemporaryDirectory() as temporary:
        directory = Path(temporary)
        cases = {
            "unresolved citation": (altered(directory, "unresolved", base, "[S1] | low", "[S9] | low"), False),
            "heading order": (altered(directory, "heading-order", base, "## 3. Concept identity and disambiguation\nOne intended sense.\n\n## 4. Genealogy and historical roles", "## 4. Genealogy and historical roles\nRole-separated shape.\n\n## 3. Concept identity and disambiguation"), False),
            "missing heading": (altered(directory, "missing-heading", base, "## 5. Cross-domain transfer\nNo transfer asserted.\n\n", ""), False),
            "invalid role": (altered(directory, "invalid-role", base, "| precursor |", "| inventor |"), False),
            "duplicate source": (altered(directory, "duplicate-source", base, "- [S1] Example Organization, *Test source* (2026-01-01). https://example.org/test-source", "- [S1] Example Organization, *Test source* (2026-01-01). https://example.org/test-source\n- [S1] Another, *Duplicate* (2026-01-02). https://example.org/duplicate"), False),
            "placeholder": (altered(directory, "placeholder", base, "Illustrative fixture.", "".join(map(chr, [84, 79, 68, 79])) + " fill this"), False),
            "missing provisional limitation": (altered(directory, "missing-limitation", provisional_base, "Evidence limitation: browsing was unavailable; this report is provisional and requires source review before reliance.", "No limitation supplied."), False),
            "sections 2/3 reorder JSON regression": (altered(directory, "sections-2-3", base, "## 2. Research mode and evidence cutoff\n- Research mode: verified\n- Evidence cutoff: 2026-08-13\n\n## 3. Concept identity and disambiguation", "## 3. Concept identity and disambiguation\nOne intended sense.\n\n## 2. Research mode and evidence cutoff\n- Research mode: verified\n- Evidence cutoff: 2026-08-13"), True),
            "fully fenced report": (altered(directory, "fenced", base, "# Concept Atlas: test concept", "```markdown\n# Concept Atlas: test concept") , False),
            "mismatched inner fence": (altered(directory, "mismatched-fence", base, "# Concept Atlas: test concept", "```markdown\n# Concept Atlas: test concept\n~~~"), False),
            "invalid calendar date": (altered(directory, "bad-date", base, "2026-08-13", "2026-99-99"), False),
            "invalid confidence": (altered(directory, "bad-confidence", base, "| low | Fixture only. |", "| certain | Fixture only. |"), False),
            "provisional limitation lacks reason": (altered(directory, "missing-reason", provisional_base, "browsing was unavailable", "browsing needs later checking"), False),
        }
        fenced_path, _ = cases["fully fenced report"]
        fenced_path.write_text(fenced_path.read_text(encoding="utf-8") + "\n```\n", encoding="utf-8")
        mismatched_path, _ = cases["mismatched inner fence"]
        mismatched_path.write_text(mismatched_path.read_text(encoding="utf-8") + "\n```\n", encoding="utf-8")
        for name, (path, json_output) in cases.items():
            result = run(path, json_output)
            if json_output:
                try:
                    payload = json.loads(result.stdout)
                    invalid_json = payload.get("valid") is False
                except json.JSONDecodeError:
                    invalid_json = False
                if result.returncode != 1 or not invalid_json:
                    failures.append(f"{name}: expected invalid JSON exit 1, got {result.returncode}: {result.stdout}{result.stderr}")
            elif result.returncode != 1 or "INVALID" not in result.stdout:
                failures.append(f"{name}: expected exit 1, got {result.returncode}: {result.stdout}{result.stderr}")
    if failures:
        print("FAIL")
        print("\n".join(failures))
        return 1
    print("PASS: 2 valid fixtures and 13 invalid cases behaved as expected.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
