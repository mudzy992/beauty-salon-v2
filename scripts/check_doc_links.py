#!/usr/bin/env python3
"""Check local Markdown destinations and GitHub-style line anchors; no files are modified."""
from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED_DIRS = {".git", "node_modules", "dist", "coverage", "build", "target", "out"}
EXTERNAL_SCHEMES = ("http://", "https://", "mailto:", "tel:", "sms:")
LINE_FRAGMENT = re.compile(r"L(\d+)(?:-L(\d+))?$")
FENCE_OPEN = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")


def mask_segment(chars: list[str], start: int, end: int) -> None:
    for index in range(start, end):
        if chars[index] not in "\r\n":
            chars[index] = " "


def visible_markdown(text: str) -> str:
    """Return same-length text with fenced and inline code masked out."""
    chars = list(text)
    offset = 0
    fence_char: str | None = None
    fence_length = 0

    for line in text.splitlines(keepends=True):
        match = FENCE_OPEN.match(line.rstrip("\r\n"))
        if fence_char is None and match:
            marker = match.group(1)
            fence_char, fence_length = marker[0], len(marker)
            mask_segment(chars, offset, offset + len(line))
        elif fence_char is not None:
            stripped = line.lstrip(" ")
            closing = re.match(rf"{re.escape(fence_char)}{{{fence_length},}}[ \t]*(?:\r?\n)?$", stripped)
            mask_segment(chars, offset, offset + len(line))
            if closing:
                fence_char, fence_length = None, 0
        offset += len(line)

    masked = "".join(chars)
    # Inline code delimiters use matching runs of backticks; replace their contents
    # without changing string offsets, so link scanning still maps to source text.
    code_span = re.compile(r"(`+)(?:(?!\1).)*?\1", re.DOTALL)
    chars = list(masked)
    for match in code_span.finditer(masked):
        mask_segment(chars, match.start(), match.end())
    return "".join(chars)


def markdown_destinations(text: str) -> list[str]:
    """Extract inline link/image destinations, allowing balanced parentheses."""
    visible = visible_markdown(text)
    destinations: list[str] = []
    index = 0
    while True:
        close_label = visible.find("](", index)
        if close_label < 0:
            break
        open_label = visible.rfind("[", 0, close_label)
        if open_label < 0:
            index = close_label + 2
            continue

        cursor = close_label + 2
        while cursor < len(visible) and visible[cursor].isspace():
            cursor += 1
        if cursor >= len(visible):
            break

        if visible[cursor] == "<":
            end = visible.find(">", cursor + 1)
            if end < 0:
                index = close_label + 2
                continue
            destination = text[cursor + 1 : end]
            cursor = end + 1
        else:
            start = cursor
            depth = 0
            while cursor < len(visible):
                char = visible[cursor]
                if char == "\\" and cursor + 1 < len(visible):
                    cursor += 2
                    continue
                if char == "(" and depth >= 0:
                    depth += 1
                elif char == ")":
                    if depth == 0:
                        break
                    depth -= 1
                elif char.isspace() and depth == 0:
                    break
                cursor += 1
            destination = text[start:cursor]

        # A link may have an optional quoted title after its destination.
        close_paren = visible.find(")", cursor)
        if close_paren < 0:
            index = close_label + 2
            continue
        destinations.append(destination.strip())
        index = close_paren + 1
    return destinations


def main() -> int:
    errors: list[str] = []
    markdown_files = [
        path
        for path in ROOT.rglob("*.md")
        if not any(part in EXCLUDED_DIRS for part in path.relative_to(ROOT).parts)
    ]
    checked_links = 0

    for markdown in markdown_files:
        source = markdown.relative_to(ROOT)
        text = markdown.read_text(encoding="utf-8", errors="replace")
        for destination in markdown_destinations(text):
            if not destination or destination.startswith("#"):
                continue
            if destination.startswith(EXTERNAL_SCHEMES):
                continue
            if destination.startswith("file:"):
                errors.append(f"{source}: non-portable local file URL: {destination}")
                continue

            path_part, _, fragment = destination.partition("#")
            path_part = path_part.split("?", 1)[0]
            if not path_part:
                continue
            if path_part.startswith("/"):
                target = (ROOT / unquote(path_part.lstrip("/"))).resolve()
            else:
                target = (markdown.parent / unquote(path_part)).resolve()
            try:
                target.relative_to(ROOT)
            except ValueError:
                errors.append(f"{source}: local link escapes repository: {destination}")
                continue

            checked_links += 1
            if not target.exists():
                errors.append(f"{source}: missing local link target: {destination}")
                continue

            line_match = LINE_FRAGMENT.fullmatch(fragment)
            if line_match and target.is_file():
                first = int(line_match.group(1))
                last = int(line_match.group(2) or first)
                line_count = sum(1 for _ in target.open(encoding="utf-8", errors="replace"))
                if first < 1 or last < first or last > line_count:
                    errors.append(
                        f"{source}: invalid line anchor {fragment} for {path_part} ({line_count} lines)"
                    )

    if errors:
        for error in errors[:100]:
            print(f"FAIL: {error}")
        if len(errors) > 100:
            print(f"... {len(errors) - 100} additional link errors omitted")
        return 1

    print(
        f"PASS: {checked_links} local Markdown links and line anchors checked "
        f"across {len(markdown_files)} Markdown files."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
