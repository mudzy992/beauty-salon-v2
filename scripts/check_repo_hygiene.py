#!/usr/bin/env python3
"""Fail when known private credentials are tracked or build contexts miss exclusions.

This checks paths and ignore rules only; it never opens or prints secret files.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ALLOWED_ENV_EXAMPLES = {".env.example", ".env.sample", ".env.template"}
PRIVATE_SUFFIXES = {".pem", ".key", ".p12", ".pfx", ".keystore"}
PRIVATE_NAMES = {"id_rsa", "id_ed25519", "id_ecdsa"}
SERVICE_ACCOUNT_HINTS = ("firebase-adminsdk", "service-account", "service_account")


def run_git(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )


def is_private_path(raw_path: str) -> bool:
    path = Path(raw_path)
    name = path.name.lower()
    if name in ALLOWED_ENV_EXAMPLES:
        return False
    if name == ".env" or (name.startswith(".env.") and name not in ALLOWED_ENV_EXAMPLES):
        return True
    if name in PRIVATE_NAMES or path.suffix.lower() in PRIVATE_SUFFIXES:
        return True
    return path.suffix.lower() == ".json" and any(
        marker in name for marker in SERVICE_ACCOUNT_HINTS
    )


def is_ignored(path: str) -> bool:
    result = run_git("check-ignore", "--quiet", "--no-index", path)
    return result.returncode == 0


def main() -> int:
    errors: list[str] = []
    tracked = run_git("ls-files", "-z")
    if tracked.returncode != 0:
        print("ERROR: git ls-files failed; run this script inside the repository.", file=sys.stderr)
        return 2

    tracked_paths = [item for item in tracked.stdout.split("\0") if item]
    private_paths = sorted(path for path in tracked_paths if is_private_path(path))
    for path in private_paths:
        errors.append(f"private-looking credential path is tracked: {path}")

    # Real local env names should be ignored, while templates must remain addable.
    for path in ("backend/.env", "frontend/.env", "mobile/.env"):
        if not is_ignored(path):
            errors.append(f"local environment file is not ignored: {path}")

    for path in (
        "backend/.env.example",
        "frontend/.env.example",
        "mobile/.env.example",
    ):
        if is_ignored(path):
            errors.append(f"environment template is ignored and cannot be versioned: {path}")

    required_dockerignore = {
        ".dockerignore": ("**/node_modules", "**/.env", "**/dist", "**/*.tsbuildinfo"),
        "backend/.dockerignore": (
            "node_modules",
            ".env",
            "dist",
            "prisma/migrations_mysql_backup",
        ),
    }
    for path, tokens in required_dockerignore.items():
        file_path = ROOT / path
        if not file_path.is_file():
            errors.append(f"missing build-context ignore file: {path}")
            continue
        content = file_path.read_text(encoding="utf-8")
        for token in tokens:
            if token not in content:
                errors.append(f"{path} does not contain an exclusion for {token!r}")

    gitignore = (ROOT / ".gitignore").read_text(encoding="utf-8")
    if "test" in {line.strip() for line in gitignore.splitlines()}:
        errors.append("root .gitignore contains a broad 'test' rule that hides test directories")

    diff = run_git("diff", "--check", "HEAD")
    if diff.returncode != 0:
        errors.append("git diff --check HEAD found whitespace/conflict-marker issues")
        if diff.stdout.strip():
            errors.append(diff.stdout.strip())
        if diff.stderr.strip():
            errors.append(diff.stderr.strip())

    if errors:
        for error in errors:
            print(f"FAIL: {error}")
        return 1

    print(
        "PASS: no known private credential paths are tracked; local env files are ignored; "
        "env templates remain trackable; backend/frontend Docker build contexts exclude "
        "node_modules, env files and dist (and the backend excludes archived MySQL SQL); "
        "git diff check is clean."
    )
    print(f"Tracked paths inspected: {len(tracked_paths)} (path names only).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
