#!/usr/bin/env python3
"""Calculate selected source-token WCAG text contrast ratios (not a rendered-page audit)."""
from __future__ import annotations

import argparse
import colorsys
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS_PATH = ROOT / "frontend/src/styles/globals.css"
MOBILE_PATH = ROOT / "mobile/src/theme/colors.ts"
TEXT_THRESHOLD = 4.5
UI_THRESHOLD = 3.0


def rgb_from_hsl(raw: str) -> tuple[float, float, float] | None:
    match = re.fullmatch(
        r"\s*(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*",
        raw,
    )
    if not match:
        return None
    hue, saturation, lightness = map(float, match.groups())
    rgb = colorsys.hls_to_rgb((hue % 360) / 360, lightness / 100, saturation / 100)
    return tuple(channel * 255 for channel in rgb)


def rgb_from_hex(raw: str) -> tuple[float, float, float] | None:
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", raw):
        return None
    return tuple(int(raw[index : index + 2], 16) for index in (1, 3, 5))


def luminance(rgb: tuple[float, float, float]) -> float:
    channels = []
    for channel in rgb:
        value = channel / 255
        channels.append(value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4)
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]


def ratio(first: tuple[float, float, float], second: tuple[float, float, float]) -> float:
    high, low = sorted((luminance(first), luminance(second)), reverse=True)
    return (high + 0.05) / (low + 0.05)


def css_block(source: str, selector: str) -> str | None:
    match = re.search(rf"{re.escape(selector)}\s*\{{([^{{}}]*)\}}", source, re.MULTILINE)
    return match.group(1) if match else None


def parse_css_vars(block: str) -> dict[str, tuple[float, float, float]]:
    result: dict[str, tuple[float, float, float]] = {}
    for name, value in re.findall(r"--([a-z0-9-]+)\s*:\s*([^;]+);", block):
        rgb = rgb_from_hsl(value)
        if rgb is not None:
            result[name] = rgb
    return result


def parse_mobile_palette(source: str) -> dict[str, tuple[float, float, float]]:
    match = re.search(r"export const palette\s*=\s*\{(.*?)\n\};", source, re.DOTALL)
    if not match:
        return {}
    result: dict[str, tuple[float, float, float]] = {}
    for name, value in re.findall(r"\b(\w+)\s*:\s*'(#(?:[0-9a-fA-F]{6}))'", match.group(1)):
        rgb = rgb_from_hex(value)
        if rgb is not None:
            result[name] = rgb
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--strict",
        action="store_true",
        help="exit non-zero when a checked text token is below 4.5:1",
    )
    args = parser.parse_args()

    try:
        css = CSS_PATH.read_text(encoding="utf-8")
        mobile_source = MOBILE_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        print(f"FAIL: cannot read theme source: {exc}", file=sys.stderr)
        return 2

    checks: list[tuple[str, tuple[float, float, float], tuple[float, float, float], float]] = []
    for mode, selector in (("web light", ":root"), ("web dark", ".dark")):
        block = css_block(css, selector)
        if block is None:
            print(f"FAIL: CSS selector block not found: {selector}", file=sys.stderr)
            return 2
        tokens = parse_css_vars(block)
        pairs = (
            ("primary / background", "primary", "background", TEXT_THRESHOLD),
            ("primary-foreground / primary", "primary-foreground", "primary", TEXT_THRESHOLD),
            ("foreground / background", "foreground", "background", TEXT_THRESHOLD),
            ("muted-foreground / muted", "muted-foreground", "muted", TEXT_THRESHOLD),
            ("secondary-foreground / secondary", "secondary-foreground", "secondary", TEXT_THRESHOLD),
            ("accent-foreground / accent", "accent-foreground", "accent", TEXT_THRESHOLD),
            ("destructive-foreground / destructive", "destructive-foreground", "destructive", TEXT_THRESHOLD),
            ("ring / background (UI indicator)", "ring", "background", UI_THRESHOLD),
        )
        for label, foreground, background, threshold in pairs:
            if foreground not in tokens or background not in tokens:
                print(f"FAIL: missing CSS contrast token {mode}: {foreground}/{background}", file=sys.stderr)
                return 2
            checks.append((f"{mode}: {label}", tokens[foreground], tokens[background], threshold))

    palette = parse_mobile_palette(mobile_source)
    required = {"white", "gray50", "gray400", "gray600", "gold", "rose"}
    if not required.issubset(palette):
        missing = sorted(required - set(palette))
        print(f"FAIL: mobile palette parse missing {missing}", file=sys.stderr)
        return 2

    mobile_pairs = (
        ("mobile light: gray400 muted text / white", "gray400", "white", TEXT_THRESHOLD),
        ("mobile light: gold primary / white", "gold", "white", TEXT_THRESHOLD),
        ("mobile light: rose secondary / white", "rose", "white", TEXT_THRESHOLD),
        ("mobile light: gray400 placeholder / gray50 input", "gray400", "gray50", TEXT_THRESHOLD),
        ("mobile dark: gray400 secondary text / black", "gray400", "black", TEXT_THRESHOLD),
        ("mobile dark: gray600 muted text / black", "gray600", "black", TEXT_THRESHOLD),
        ("mobile dark: gold primary / black", "gold", "black", TEXT_THRESHOLD),
    )
    for label, foreground, background, threshold in mobile_pairs:
        if foreground not in palette or background not in palette:
            print(f"FAIL: missing mobile palette contrast token: {foreground}/{background}", file=sys.stderr)
            return 2
        checks.append((label, palette[foreground], palette[background], threshold))

    failed = 0
    print("Selected source-token contrast ratios (WCAG calculation; not rendered UI):")
    for label, foreground, background, threshold in checks:
        value = ratio(foreground, background)
        status = "PASS" if value >= threshold else "FAIL"
        if status == "FAIL":
            failed += 1
        print(f"{status:4} {value:5.2f}:1 (target {threshold:.1f}:1)  {label}")

    if failed:
        print(
            f"REPORT-ONLY: {failed} of {len(checks)} selected pairs are below their threshold. "
            "Review actual rendered colors, text size, opacity and dynamic themes separately."
        )
        return 1 if args.strict else 0
    print("PASS: all selected token pairs meet their configured thresholds.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
