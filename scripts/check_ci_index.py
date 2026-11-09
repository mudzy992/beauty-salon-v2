#!/usr/bin/env python3
"""Check that CI and the workspace package.json test scripts stay in sync.

Two invariants, both directions:

1. Every ``npm run test:<name>`` step in ``.github/workflows/ci.yml`` must exist in
   the ``package.json`` of the directory that step runs in (``working-directory``,
   or the job's own directory when it is one of the workspace packages).
2. Every ``test:*`` script declared in ``frontend/``, ``backend/`` or ``mobile/``
   ``package.json`` must be referenced by at least one CI step.

Without this, a newly added test silently never runs in CI (it passes locally and
nobody notices), or a renamed script leaves a CI step that fails on every push.

``pyyaml`` is deliberately NOT used: it is not installed in this sandbox and the
``repo-checks`` job only sets up a bare Python, so the workflow file is parsed
line by line. The layout is regular enough for that: jobs at two spaces, steps at
six, step keys at eight.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "ci.yml"

# Direktoriji koji imaju vlastiti package.json s test skriptama.
PACKAGES = ("frontend", "backend", "mobile")

# Skripte koje namjerno NEMAJU CI korak jer su interaktivne ili lokalne.
# Navesti tacan naziv, ne obrazac: `/cov/` bi pogodio i `*-recovery` testove.
DEV_ONLY = {
    "backend": {
        "test:watch": "jest --watch (interaktivno)",
        "test:cov": "jest --coverage (lokalni izvjestaj)",
        "test:debug": "node --inspect-brk (debugger)",
    },
}

JOB_RE = re.compile(r"^  ([A-Za-z0-9_-]+):\s*$")
STEP_RE = re.compile(r"^      - \S")
KEY_RE = re.compile(r"^        ([A-Za-z0-9_-]+):\s*(.*)$")
NPM_TEST_RE = re.compile(r"npm run (test:[A-Za-z0-9_-]+)")


class Step:
    __slots__ = ("job", "line", "working_directory", "run")

    def __init__(self, job: str, line: int) -> None:
        self.job = job
        self.line = line
        self.working_directory: str | None = None
        self.run: list[str] = []

    @property
    def directory(self) -> str:
        """Direktorij u kojem korak stvarno radi."""
        if self.working_directory:
            return self.working_directory.strip().strip("\"'")
        # Poslovi koji nose ime paketa rade u tom paketu i bez working-directory.
        return self.job if self.job in PACKAGES else "."

    @property
    def run_text(self) -> str:
        return "\n".join(self.run)


def parse_workflow(path: Path) -> list[Step]:
    """Parsiraj korake svih poslova; bez pyyaml, samo po uvlačenju."""
    steps: list[Step] = []
    in_jobs = False
    job: str | None = None
    in_steps = False
    current: Step | None = None
    run_block_indent: int | None = None

    for number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not raw.strip() or raw.lstrip().startswith("#"):
            if run_block_indent is not None and current is not None:
                current.run.append(raw)
            continue

        indent = len(raw) - len(raw.lstrip(" "))

        # Sadrzaj viselinijskog `run: |` bloka.
        if run_block_indent is not None and current is not None:
            if indent > run_block_indent:
                current.run.append(raw)
                continue
            run_block_indent = None

        if indent == 0:
            in_jobs = raw.rstrip() == "jobs:"
            job = None
            in_steps = False
            current = None
            continue

        if not in_jobs:
            continue

        match = JOB_RE.match(raw)
        if match:
            job = match.group(1)
            in_steps = False
            current = None
            continue

        if job is None:
            continue

        if indent == 4 and raw.strip() == "steps:":
            in_steps = True
            current = None
            continue

        if not in_steps:
            continue

        if STEP_RE.match(raw):
            current = Step(job, number)
            steps.append(current)
            rest = raw[8:].strip()
            if rest.startswith("run:"):
                value = rest[len("run:") :].strip()
                if value in ("|", "|-", ">", ">-"):
                    run_block_indent = indent
                elif value:
                    current.run.append(value)
            continue

        if current is None:
            continue

        key = KEY_RE.match(raw)
        if not key:
            continue
        name, value = key.group(1), key.group(2).strip()
        if name == "working-directory":
            current.working_directory = value
        elif name == "run":
            if value in ("|", "|-", ">", ">-"):
                run_block_indent = indent
            elif value:
                current.run.append(value)

    return steps


def scripts_of(directory: str) -> dict[str, str]:
    path = ROOT / directory / "package.json"
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    scripts = data.get("scripts") or {}
    return {k: v for k, v in scripts.items() if k.startswith("test:")}


def main() -> int:
    if not WORKFLOW.exists():
        print(f"FAIL: {WORKFLOW} ne postoji.")
        return 1

    steps = parse_workflow(WORKFLOW)
    declared = {name: scripts_of(name) for name in PACKAGES}

    referenced: dict[str, set[str]] = {name: set() for name in PACKAGES}
    unknown: list[str] = []
    per_job: dict[str, int] = {}

    for step in steps:
        found = NPM_TEST_RE.findall(step.run_text)
        if not found:
            continue
        per_job[step.job] = per_job.get(step.job, 0) + len(found)
        owner = step.directory if step.directory in declared else None
        for script in found:
            if owner is None or script not in declared[owner]:
                where = owner or step.directory
                unknown.append(
                    f"  {WORKFLOW.name}:{step.line} posao '{step.job}' (wd={where}) "
                    f"pokrece nepostojecu skriptu '{script}'"
                )
            else:
                referenced[owner].add(script)

    missing: list[str] = []
    for name in PACKAGES:
        exempt = DEV_ONLY.get(name, {})
        for script in sorted(set(declared[name]) - referenced[name]):
            if script in exempt:
                continue
            missing.append(f"  {name}/package.json: '{script}' nema nijedan CI korak")

    # Zastarjeli izuzeci se ne smiju gomilati: svaki mora i dalje postojati.
    stale: list[str] = []
    for name, exempt in DEV_ONLY.items():
        for script in exempt:
            if script not in declared.get(name, {}):
                stale.append(f"  DEV_ONLY['{name}']['{script}'] vise ne postoji u package.json")

    print("CI test:* koraka po poslu:")
    for job in sorted(per_job):
        print(f"  {job}: {per_job[job]}")
    print("Deklarisane test:* skripte:")
    for name in PACKAGES:
        print(f"  {name}/package.json: {len(declared[name])}")

    errors = unknown + missing + stale
    if errors:
        print(f"\nFAIL: {len(errors)} neslaganj(a) izmedju CI i package.json:")
        for line in errors[:100]:
            print(line)
        if len(errors) > 100:
            print(f"... jos {len(errors) - 100} izostavljeno")
        return 1

    total = sum(len(v) for v in declared.values())
    exempt_total = sum(len(v) for v in DEV_ONLY.values())
    print(
        f"PASS: {total - exempt_total} od {total} test:* skripti iz {len(PACKAGES)} "
        f"package.json fajlova ima CI korak ({exempt_total} interaktivnih je izuzeto), "
        f"i nijedan CI korak ne pokrece nepostojecu skriptu."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
