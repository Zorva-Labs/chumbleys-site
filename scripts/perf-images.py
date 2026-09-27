"""The page-speed image set (2026-09-26). Run from the repo root:

    python3 scripts/perf-images.py

The home page's pictures were 1024-1376 px PNGs of 1.5-2.7 MB each: the
comic strip alone was 9.9 MB, and a phone downloaded all of it. This cuts
AVIF and WebP copies at the widths the page shows them. index.html offers
them in <picture> with a srcset and sizes; the PNGs stay as the last fallback
and for the structured data. A file that exists is never rewritten, and a
changed picture takes a new name.

Quality: AVIF 50, WebP 80. These are comic-style illustrations, and AVIF
smears line work sooner than it smears a photograph.
"""
import os

from PIL import Image

A = 'assets'

# stem: (widths, keep alpha)
JOBS = {
    'hero-portrait': ((640, 832, 1024), True),   # the LCP picture, alpha 191-255
    'hero-action': ((640, 832, 1024), False),
    'strip-1': ((480, 768, 1024), False),
    'strip-2': ((480, 768, 1024), False),
    'strip-3': ((480, 768, 1024), False),
    'strip-4': ((480, 768, 1024), False),
    'z-before': ((480, 768, 1024), False),
    'z-after': ((480, 768, 1024), False),
    'truck-before': ((480, 768, 1024), False),
    'truck-after': ((480, 768, 1024), False),
}


def kb(p):
    return f'{os.path.getsize(p) / 1024:.0f} KB'


for stem, (widths, alpha) in JOBS.items():
    src = f'{A}/{stem}.png'
    im = Image.open(src).convert('RGBA' if alpha else 'RGB')
    for w in widths:
        if w > im.width:
            continue
        r = im if w == im.width else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        for ext, kw in (('avif', dict(quality=50, speed=6)), ('webp', dict(quality=80, method=6))):
            out = f'{A}/{stem}-{w}.{ext}'
            if os.path.exists(out):
                continue
            r.save(out, ext.upper(), **kw)
            print(f'  {out}  {r.width}x{r.height}  {kb(out)}  (PNG {kb(src)})')

# The round logo is shown 38-76 px across; the 600 px PNG stays for the favicon
# links and the schema's logo.
logo = Image.open(f'{A}/logo-emblem.png').convert('RGBA')
for w in (96, 160):
    out = f'{A}/logo-emblem-{w}.webp'
    if not os.path.exists(out):
        logo.resize((w, w), Image.LANCZOS).save(out, 'WEBP', quality=85, method=6)
        print(f'  {out}  {kb(out)}')

# The intro video's poster: the <video poster> takes one file.
out = f'{A}/intro-poster.webp'
if not os.path.exists(out):
    Image.open(f'{A}/intro-poster.jpg').convert('RGB').save(out, 'WEBP', quality=65, method=6)
    print(f'  {out}  {kb(out)}  (JPG {kb(A + "/intro-poster.jpg")})')
