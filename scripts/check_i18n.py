#!/usr/bin/env python3
"""Report BS/EN frontend locale key parity; use --strict to make gaps fail."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
LOCALES = ROOT / "frontend/src/i18n/locales"


def flatten(value: dict[str, Any], prefix: str = "") -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, child in value.items():
        path = f"{prefix}.{key}" if prefix else key
        if isinstance(child, dict):
            result.update(flatten(child, path))
        else:
            result[path] = child
    return result


def load_locale(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Cannot read valid JSON locale {path.relative_to(ROOT)}: {exc}") from exc
    if not isinstance(value, dict):
        raise ValueError(f"Locale root must be an object: {path.relative_to(ROOT)}")
    return flatten(value)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--strict",
        action="store_true",
        help="exit non-zero when BS and EN leaf-key sets differ",
    )
    args = parser.parse_args()

    try:
        bs = load_locale(LOCALES / "bs.json")
        en = load_locale(LOCALES / "en.json")
    except ValueError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 2

    missing_en = sorted(set(bs) - set(en))
    extra_en = sorted(set(en) - set(bs))
    print(f"BS leaf keys: {len(bs)}; EN leaf keys: {len(en)}")
    print(f"Missing in EN: {len(missing_en)}; extra in EN: {len(extra_en)}")
    if missing_en:
        print("Missing EN key sample (first 20):")
        for key in missing_en[:20]:
            print(f"  - {key}")
    if extra_en:
        print("Extra EN key sample (first 20):")
        for key in extra_en[:20]:
            print(f"  - {key}")

    if missing_en or extra_en:
        print("STATUS: report-only baseline; translation parity is not complete.")
        return 1 if args.strict else 0

    print("PASS: BS and EN leaf key sets match.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
