#!/usr/bin/env python3
"""Validate the intact, unconfigured distribution bundle offline (Python 3.11+)."""

from pathlib import Path
import json
import re
import sys
from urllib.parse import unquote, urlsplit

try:
    import tomllib
except ImportError:
    sys.exit("Python 3.11 or later is required for standard-library TOML validation.")


ROOT = Path(__file__).resolve().parents[1]
ROLES = {"autopilot", "implementer", "planner", "refiner", "reviewer", "dod-auditor", "jira-sync"}
SKILLS = {"delivery-" + name for name in ROLES - {"dod-auditor"}} | {
    "delivery-backend", "delivery-frontend"
}
POLICIES = {"delivery-state", "story-sizing", "checkpoint-execution",
            "review-cadence", "context-efficiency", "planning-checklist", "project-context"}
TEMPLATES = {"epic", "story", "parent-summary", "delivery-readme", "checkpoint",
             "implementation", "parent-implementation", "plan-review", "review", "walkthrough"}


def validate():
    errors = []
    checked_links = 0

    def error(path, message):
        errors.append(f"{path.relative_to(ROOT)}: {message}")

    def read(path):
        # Do not read symlinked dependencies or credential files in an altered kit.
        if path.is_symlink() or not path.resolve().is_relative_to(ROOT):
            error(path, "dependency must be a regular file inside the bundle")
            return ""
        if path.name == ".env" or path.name.startswith(".env."):
            error(path, "credential files do not belong in this bundle")
            return ""
        return path.read_text(encoding="utf-8")

    required = [ROOT / "README.md", ROOT / "AGENTS.md"]
    required += [ROOT / ".agents" / f"{name}.md" for name in POLICIES]
    required += [ROOT / "templates" / f"{name}.md" for name in TEMPLATES]
    required += [ROOT / ".agents/skills" / name / "SKILL.md" for name in SKILLS]
    required += [ROOT / name for name in (
        "docs/epics/README.md", "docs/artifacts/README.md",
        "docs/jira-sync/README.md", "docs/jira-sync/ledger.json",
        "docs/jira-sync/tombstones.md",
    )]
    for runtime, suffix in ((".codex", ".toml"), (".vibe", ".toml"), (".opencode", ".md")):
        required += [ROOT / runtime / "agents" / (role + suffix) for role in ROLES]
        actual = {p.stem for p in (ROOT / runtime / "agents").glob("*" + suffix)}
        if actual != ROLES:
            error(ROOT / runtime, "expected the complete seven-role adapter set")
    for path in required:
        if not path.is_file():
            error(path, "missing required dependency")

    # Scan only distribution document/config formats. Never follow symlinks.
    texts = {}
    for path in sorted(ROOT.rglob("*")):
        if path.is_file() and path.suffix in {".md", ".toml", ".json"}:
            texts[path] = read(path)

    for path, body in texts.items():
        if path.suffix == ".toml":
            try:
                data = tomllib.loads(body)
            except tomllib.TOMLDecodeError as exc:
                error(path, f"invalid TOML: {exc}")
                continue
            instructions = data.get("developer_instructions", data.get("instructions", ""))
            if not instructions:
                error(path, "missing role instructions")
            for target in re.findall(r"\.agents/[\w./-]+\.md", instructions):
                if not (ROOT / target).is_file():
                    error(path, f"missing role dependency {target}")

        if path.name == "SKILL.md":
            match = re.match(r"\A---\n(.*?)\n---\n", body, re.S)
            if not match:
                error(path, "missing skill frontmatter")
                continue
            name = re.search(r"^name: ([a-z0-9-]+)$", match[1], re.M)
            description = re.search(r"^description: (.+)$", match[1], re.M)
            if not name or name[1] != path.parent.name or name[1] not in SKILLS:
                error(path, "skill name must match its directory and expected inventory")
            if not description:
                error(path, "missing skill description")

        if path.suffix != ".md":
            continue
        # Fenced examples are scaffolds, not resolvable document links.
        prose = re.sub(r"^```[^\n]*\n.*?^```\s*$", "", body, flags=re.M | re.S)
        for target in re.findall(r"\[[^\]\n]+\]\(([^)\n]+)\)", prose):
            target = target.strip().strip("<>")
            if "<" in target or ">" in target:
                continue
            parsed = urlsplit(target)
            if parsed.scheme or parsed.netloc:
                continue
            linked = (path.parent / unquote(parsed.path)).resolve() if parsed.path else path
            if not linked.is_relative_to(ROOT):
                error(path, f"link leaves the bundle: {target}")
            elif not linked.exists():
                error(path, f"broken local link: {target}")
            elif parsed.fragment and linked.suffix == ".md":
                linked_body = texts.get(linked, "")
                anchors = set()
                for heading in re.findall(r"^#{1,6}\s+(.+?)\s*#*\s*$", linked_body, re.M):
                    anchor = re.sub(r"[^\w\- ]", "", heading.lower()).replace(" ", "-")
                    anchors.add(anchor)
                anchors.update(re.findall(r'<a\s+(?:id|name)=["\']([^"\']+)', linked_body))
                if unquote(parsed.fragment) not in anchors:
                    error(path, f"missing local heading anchor: {target}")
            checked_links += 1

    ledger_path = ROOT / "docs/jira-sync/ledger.json"
    if ledger_path in texts:
        try:
            ledger = json.loads(texts[ledger_path])
            expected = {
                "schemaVersion": 1,
                "scope": {"site": None, "projectKey": None, "jql": None},
                "fieldMap": {}, "statusMap": {}, "cursor": None,
                "lastFullReconcileAt": None, "stories": {}, "operations": [],
                "runs": [], "prunePolicy": None,
            }
            if not isinstance(ledger, dict):
                error(ledger_path, "ledger must be an object")
            else:
                for key, empty in expected.items():
                    if key not in ledger or ledger[key] != empty:
                        error(ledger_path, f"starter field {key} must remain uninitialized")
        except json.JSONDecodeError as exc:
            error(ledger_path, f"invalid JSON: {exc}")

    if errors:
        print("Bundle validation failed:")
        print("\n".join(f"- {item}" for item in errors))
        return 1
    print(f"PASS: {len(ROLES)} roles × 3 runtimes, {len(SKILLS)} skills, "
          f"{len(TEMPLATES)} templates, {checked_links} local links; "
          "TOML and clean starter ledger verified.")
    return 0


if __name__ == "__main__":
    sys.exit(validate())
