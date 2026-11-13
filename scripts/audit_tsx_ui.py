#!/usr/bin/env python3
"""Inventory TSX UI risks; candidates are not proof of a visual defect or WCAG failure."""
import argparse
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / 'frontend' / 'src'
IMPORT = re.compile(r'''(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["'](\.[^"']+)["']''')
RULES = {
    'direct-color': re.compile(r'(?<![\w-])(?:[\w-]+:)*(?:!?)(?:bg|text|border|ring|outline|fill|stroke|shadow|decoration)-(?:slate|gray|zinc|neutral|stone|white|black|red|rose|amber|yellow|blue|green|emerald|orange|purple|indigo|pink|teal|cyan)(?:-[0-9]+)?(?:/\d+)?\b'),
    'literal-color': re.compile(r'#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\('),
    'inline-style': re.compile(r'\bstyle\s*=\s*\{'),
    'raw-table': re.compile(r'<table(?:\s|>)'),
    'local-heading': re.compile(r'<h1(?:\s|>)'),
    'surface-candidate': re.compile(r'\b(?:rounded(?:-[\w\[\].]+)?|border(?:-[\w\[\]./]+)?|shadow(?:-[\w\[\]./]+)?)(?=[\s"\'`])'),
}


def files(root):
    return sorted(p for p in root.rglob('*') if p.is_file() and p.suffix in ('.tsx', '.ts', '.js', '.mjs') and 'node_modules' not in p.parts)


def resolve(source, name):
    base = source.parent / name
    for p in (base, *(Path(str(base) + ext) for ext in ('.tsx', '.ts', '.js', '.mjs')), *(base / ('index' + ext) for ext in ('.tsx', '.ts', '.js', '.mjs'))):
        if p.is_file():
            return p.resolve()
    return None


def reachable(roots, all_files):
    allowed = {p.resolve() for p in all_files}
    found, pending = set(), [p.resolve() for p in roots if p.exists()]
    while pending:
        path = pending.pop()
        if path in found or path not in allowed:
            continue
        found.add(path)
        for match in IMPORT.finditer(path.read_text(encoding='utf-8')):
            target = resolve(path, match.group(1))
            if target and target not in found:
                pending.append(target)
    return found


def audit(root=ROOT):
    all_files = files(root)
    # Seed actual admin route declarations plus the calendar, which lives outside admin.routes.
    admin_roots = [root / 'app/routes/admin.routes.tsx', root / 'pages/ReservationsCalendar.tsx']
    public_roots = list((root / 'pages/public').rglob('*.tsx')) + [root / 'features/shell/public/public-layout.tsx']
    stylist_roots = list((root / 'features/stylist-portal/pages').rglob('*.tsx')) + list((root / 'features/stylist-workbook/pages').rglob('*.tsx')) + [root / 'layouts/StylistLayout.tsx']
    graphs = {key: reachable(roots, all_files) for key, roots in [('admin', admin_roots), ('public', public_roots), ('stylist', stylist_roots)]}
    records = []
    for path in all_files:
        if path.suffix != '.tsx':
            continue
        relative = path.relative_to(root).as_posix()
        scope = [key for key, graph in graphs.items() if path.resolve() in graph] or ['unclassified']
        findings = []
        for lineno, line in enumerate(path.read_text(encoding='utf-8').splitlines(), 1):
            stripped = line.strip()
            if stripped.startswith(('//', '*', '/*', '{/*')):
                continue
            for category, pattern in RULES.items():
                matches = sorted(set(m.group(0) for m in pattern.finditer(line)))
                if matches:
                    findings.append({'line': lineno, 'category': category, 'matches': matches, 'snippet': stripped[:240]})
        records.append({'file': relative, 'scope': scope, 'findings': findings})
    return records


def summary(records):
    counts = Counter(f['category'] for r in records if 'admin' in r['scope'] for f in r['findings'])
    return {'tsx_files_scanned': len(records), 'admin_reachable_tsx': sum('admin' in r['scope'] for r in records), 'admin_candidate_lines_by_type': dict(sorted(counts.items())), 'admin_files_with_candidates': sum('admin' in r['scope'] and bool(r['findings']) for r in records)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--json', action='store_true', help='full file/line inventory including unclassified files')
    parser.add_argument('--scope', choices=('admin', 'public', 'stylist', 'unclassified'), help='filter detailed files by import reachability')
    args = parser.parse_args()
    records = audit()
    selected = [r for r in records if args.scope in r['scope']] if args.scope else records
    print(json.dumps({'summary': summary(records), 'files': selected} if args.json else summary(records), ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
