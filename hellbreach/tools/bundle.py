#!/usr/bin/env python3
"""Bundle Hellbreach into one self-contained HTML file (dist/hellbreach.html).

The game is developed as many files (index.html, css/, js/, vendor/). Some
places only accept a single file, so this inlines every stylesheet and script
that index.html references. Run from anywhere: python3 tools/bundle.py
"""
import pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text(encoding='utf8')

def css(m):
    return '<style>\n' + (root / m.group(1)).read_text(encoding='utf8') + '\n</style>'

def js(m):
    src = (root / m.group(1)).read_text(encoding='utf8').replace('</script', '<\\/script')
    return '<script>\n' + src + '\n</script>'

html = re.sub(r'<link rel="stylesheet" href="((?:css)/[^"]+)">', css, html)
html = re.sub(r'<script src="([^"]+)"></script>', js, html)
out = root / 'dist' / 'hellbreach.html'
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding='utf8')
print(f'wrote {out} ({out.stat().st_size // 1024} KB)')
