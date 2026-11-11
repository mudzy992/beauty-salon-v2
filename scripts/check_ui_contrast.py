#!/usr/bin/env python3
"""Calculate selected source-token WCAG contrast ratios (not a rendered-page audit)."""
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
AAA_TEXT_THRESHOLD = 7.0


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


def raw_css_vars(block: str) -> dict[str, str]:
    """Raw `--token: value` declarations of one CSS block, unresolved."""
    return {
        name: value.strip()
        for name, value in re.findall(r"--([a-z0-9-]+)\s*:\s*([^;]+);", block)
    }


def parse_css_vars(
    block: str,
    fallback: dict[str, str] | None = None,
) -> dict[str, tuple[float, float, float]]:
    """Parse `--token: <hsl | #hex | var(--other)>` declarations into RGB triples.

    `fallback` carries raw declarations from an inherited block (e.g. `:root` for `.dark`)
    so that `var(--x)` references defined outside the current block still resolve.
    """
    raw = raw_css_vars(block)
    scope = {**(fallback or {}), **raw}

    def resolve(name: str, seen: set[str]) -> tuple[float, float, float] | None:
        if name in seen or name not in scope:
            return None
        seen.add(name)
        value = scope[name]
        rgb = rgb_from_hsl(value)
        if rgb is None:
            rgb = rgb_from_hex(value)
        if rgb is not None:
            return rgb
        reference = re.fullmatch(r"var\(\s*--([a-z0-9-]+)\s*(?:,[^()]*)?\)", value)
        if reference is not None:
            return resolve(reference.group(1), seen)
        return None

    result: dict[str, tuple[float, float, float]] = {}
    for name in raw:
        rgb = resolve(name, set())
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


def parse_mobile_theme(
    source: str,
    name: str,
    palette: dict[str, tuple[float, float, float]],
) -> dict[str, tuple[float, float, float]]:
    match = re.search(
        rf"export const {re.escape(name)}\s*(?::\s*typeof\s+lightTheme)?\s*=\s*\{{(.*?)\n\}};",
        source,
        re.DOTALL,
    )
    if not match:
        return {}

    body = match.group(1)
    result = palette.copy() if "...palette" in body else {}
    entries = re.findall(
        r"\b(\w+)\s*:\s*(?:palette\.(\w+)|'(#(?:[0-9a-fA-F]{6}))')",
        body,
    )
    for key, palette_name, literal in entries:
        if palette_name and palette_name in palette:
            result[key] = palette[palette_name]
        elif literal:
            rgb = rgb_from_hex(literal)
            if rgb is not None:
                result[key] = rgb
    return result


def append_pair(
    checks: list[tuple[str, tuple[float, float, float], tuple[float, float, float], float]],
    label: str,
    tokens: dict[str, tuple[float, float, float]],
    foreground: str,
    background: str,
    threshold: float,
) -> bool:
    if foreground not in tokens or background not in tokens:
        print(f"FAIL: missing contrast token {label}: {foreground}/{background}", file=sys.stderr)
        return False
    checks.append((label, tokens[foreground], tokens[background], threshold))
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--strict",
        action="store_true",
        help="exit non-zero when a checked text/UI token is below its configured threshold",
    )
    args = parser.parse_args()

    try:
        css = CSS_PATH.read_text(encoding="utf-8")
        mobile_source = MOBILE_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        print(f"FAIL: cannot read theme source: {exc}", file=sys.stderr)
        return 2

    checks: list[tuple[str, tuple[float, float, float], tuple[float, float, float], float]] = []
    root_block = css_block(css, ":root")
    root_raw = raw_css_vars(root_block) if root_block is not None else {}
    # S1 / NEJRA §10 — dva nova Aurum bloka. `css_block()` escapa selector, pa se
    # `[data-skin="aurum"][data-mode="light"]` i `.dark[data-skin="aurum"]` čitaju
    # direktno; naslijeđeni `:root` tokeni se spajaju kao i za `.dark`.
    # Odluka vlasnika `use_140_four`: uz 26 postojećih web parova svako Aurum
    # stanje dobija još 4 para iz NEJRA §10 (text/page, muted/page, brand/page,
    # accent/page) → 30 × 2 = 60 novih parova, ukupno 140 (80 + 60).
    AURUM_EXTRA_PAIRS = (
        ("NEJRA §10: text / page", "aurum-text", "aurum-page", TEXT_THRESHOLD),
        ("NEJRA §10: muted / page", "aurum-muted", "aurum-page", TEXT_THRESHOLD),
        ("NEJRA §10: brand / page", "aurum-brand", "aurum-page", TEXT_THRESHOLD),
        ("NEJRA §10: accent / page", "aurum-accent", "aurum-page", TEXT_THRESHOLD),
    )
    web_states = (
        ("web light", ":root", False),
        ("web dark", ".dark", False),
        ("aurum light", '[data-skin="aurum"][data-mode="light"]', True),
        ("aurum dark", '.dark[data-skin="aurum"]', True),
    )
    root_tokens: dict[str, tuple[float, float, float]] = {}
    for mode, selector, is_aurum in web_states:
        block = css_block(css, selector)
        if block is None:
            print(f"FAIL: CSS selector block not found: {selector}", file=sys.stderr)
            return 2
        # `.dark` i oba Aurum bloka nasljeđuju deklaracije iz `:root`
        # (npr. brand varijable), pa se slojevi spajaju.
        inherited = None if selector == ":root" else root_raw
        tokens = parse_css_vars(block, inherited)
        if selector == ":root":
            root_tokens = tokens
        else:
            tokens = {**root_tokens, **tokens}
        pairs = (
            ("primary / background", "primary", "background", TEXT_THRESHOLD),
            ("primary-foreground / primary", "primary-foreground", "primary", TEXT_THRESHOLD),
            ("foreground / background", "foreground", "background", TEXT_THRESHOLD),
            ("muted-foreground / muted", "muted-foreground", "muted", TEXT_THRESHOLD),
            ("secondary-foreground / secondary", "secondary-foreground", "secondary", TEXT_THRESHOLD),
            ("accent-foreground / accent", "accent-foreground", "accent", TEXT_THRESHOLD),
            ("destructive-foreground / destructive", "destructive-foreground", "destructive", TEXT_THRESHOLD),
            ("ring / background (UI indicator)", "ring", "background", UI_THRESHOLD),
            # Semantički sloj za dashboard (faza 0 redizajna).
            ("text / surface", "text", "surface", TEXT_THRESHOLD),
            ("text / surface-sunken", "text", "surface-sunken", TEXT_THRESHOLD),
            ("text-muted / surface", "text-muted", "surface", TEXT_THRESHOLD),
            ("text-muted / surface-muted", "text-muted", "surface-muted", TEXT_THRESHOLD),
            ("text-muted-strong / surface (AAA)", "text-muted-strong", "surface", AAA_TEXT_THRESHOLD),
            ("control-border / surface (UI indicator)", "control-border", "surface", UI_THRESHOLD),
            ("control-border / surface-sunken (UI indicator)", "control-border", "surface-sunken", UI_THRESHOLD),
            ("on-primary / primary", "on-primary", "primary", TEXT_THRESHOLD),
            ("brand-primary-text / surface (brand text)", "brand-primary-text", "surface", TEXT_THRESHOLD),
            ("brand-primary-text / nav-active (active nav)", "brand-primary-text", "nav-active-bg", TEXT_THRESHOLD),
            ("brand-accent-text / surface (accent text)", "brand-accent-text", "surface", TEXT_THRESHOLD),
            ("focus-ring / surface (focus indicator)", "focus-ring", "surface", UI_THRESHOLD),
            ("on-danger / danger", "on-danger", "danger", TEXT_THRESHOLD),
            ("ok-fg / ok-bg (status)", "ok-fg", "ok-bg", TEXT_THRESHOLD),
            ("warn-fg / warn-bg (status)", "warn-fg", "warn-bg", TEXT_THRESHOLD),
            ("bad-fg / bad-bg (status)", "bad-fg", "bad-bg", TEXT_THRESHOLD),
            ("info-fg / info-bg (status)", "info-fg", "info-bg", TEXT_THRESHOLD),
            ("neutral-fg / neutral-bg (status)", "neutral-fg", "neutral-bg", TEXT_THRESHOLD),
        )
        for label, foreground, background, threshold in pairs + (AURUM_EXTRA_PAIRS if is_aurum else ()):
            if not append_pair(
                checks,
                f"{mode}: {label}",
                tokens,
                foreground,
                background,
                threshold,
            ):
                return 2

    palette = parse_mobile_palette(mobile_source)
    light_theme = parse_mobile_theme(mobile_source, "lightTheme", palette)
    dark_theme = parse_mobile_theme(mobile_source, "darkTheme", palette)
    if not palette or not light_theme or not dark_theme:
        print("FAIL: unable to parse mobile palette/lightTheme/darkTheme", file=sys.stderr)
        return 2

    mobile_theme_pairs = (
        ("mobile light: muted text / background", light_theme, "textMuted", "background", TEXT_THRESHOLD),
        ("mobile light: secondary text / background", light_theme, "textSecondary", "background", TEXT_THRESHOLD),
        ("mobile light: placeholder / input background", light_theme, "inputPlaceholder", "inputBg", TEXT_THRESHOLD),
        ("mobile light: primary text / background", light_theme, "primary", "background", TEXT_THRESHOLD),
        ("mobile light: primary button foreground / background", light_theme, "primaryText", "primary", TEXT_THRESHOLD),
        ("mobile light: secondary button foreground / background", light_theme, "secondaryText", "secondary", TEXT_THRESHOLD),
        ("mobile light: success badge text / background", light_theme, "success", "successLight", TEXT_THRESHOLD),
        ("mobile light: warning badge text / background", light_theme, "warning", "warningLight", TEXT_THRESHOLD),
        ("mobile light: error badge text / background", light_theme, "error", "errorLight", TEXT_THRESHOLD),
        ("mobile light: info badge text / background", light_theme, "info", "infoLight", TEXT_THRESHOLD),
        ("mobile light: inactive tab / tab bar", light_theme, "tabInactive", "tabBar", TEXT_THRESHOLD),
        ("mobile dark: muted text / background", dark_theme, "textMuted", "background", TEXT_THRESHOLD),
        ("mobile dark: secondary text / background", dark_theme, "textSecondary", "background", TEXT_THRESHOLD),
        ("mobile dark: placeholder / input background", dark_theme, "inputPlaceholder", "inputBg", TEXT_THRESHOLD),
        ("mobile dark: primary text / background", dark_theme, "primary", "background", TEXT_THRESHOLD),
        ("mobile dark: primary button foreground / background", dark_theme, "primaryText", "primary", TEXT_THRESHOLD),
        ("mobile dark: secondary button foreground / background", dark_theme, "secondaryText", "secondary", TEXT_THRESHOLD),
        ("mobile dark: success badge text / background", dark_theme, "success", "successLight", TEXT_THRESHOLD),
        ("mobile dark: warning badge text / background", dark_theme, "warning", "warningLight", TEXT_THRESHOLD),
        ("mobile dark: error badge text / background", dark_theme, "error", "errorLight", TEXT_THRESHOLD),
        ("mobile dark: info badge text / background", dark_theme, "info", "infoLight", TEXT_THRESHOLD),
        ("mobile dark: inactive tab / tab bar", dark_theme, "tabInactive", "tabBar", TEXT_THRESHOLD),
    )
    for label, tokens, foreground, background, threshold in mobile_theme_pairs:
        if not append_pair(checks, label, tokens, foreground, background, threshold):
            return 2

    status_pairs = (
        ("PENDING", "statusPending", "statusPendingBg"),
        ("STYLIST_REVIEW", "statusReview", "statusReviewBg"),
        ("CONFIRMED", "statusConfirmed", "statusConfirmedBg"),
        ("IN_PROGRESS", "statusInProgress", "statusInProgressBg"),
        ("COMPLETED", "statusCompleted", "statusCompletedBg"),
        ("CANCELLED", "statusCancelled", "statusCancelledBg"),
    )
    for status, foreground, background in status_pairs:
        if not append_pair(
            checks,
            f"mobile light: {status} text label / badge background",
            palette,
            foreground,
            background,
            TEXT_THRESHOLD,
        ):
            return 2

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
            "Review actual rendered colors, text size, opacity, icon/state usage and dynamic themes separately."
        )
        return 1 if args.strict else 0
    print(
        f"PASS: all {len(checks)} selected token pairs meet their configured thresholds. "
        "This is source-only evidence, not a rendered-UI audit."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
