#!/usr/bin/env python3
"""Build the Nombra brand SVGs from the self-hosted fonts (text converted to paths).

Outputs:
  src/assets/brand/wordmark.svg   NOMBRA wordmark (currentColor)
  public/favicon.svg              charm monogram
  public/brand/logo-full.svg      mark + wordmark + tagline (for print/social)
"""
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "public" / "fonts"


def load(name: str, wght: int):
    f = TTFont(FONTS / name)
    if "fvar" in f:
        f = instantiateVariableFont(f, {"wght": wght})
    return f


def text_path(font, text: str, size: float, x0=0.0, y0=0.0, track=0.0):
    """Return (svg path d, advance width) for text with baseline at y0."""
    gs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font["hmtx"]
    s = size / font["head"].unitsPerEm
    x = 0.0
    parts = []
    for ch in text:
        if ch == " ":
            x += hmtx[cmap[32]][0] + track / s
            continue
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
        gs[g].draw(TransformPen(pen, (s, 0, 0, -s, x0 + x * s, y0)))
        parts.append(pen.getCommands())
        x += hmtx[g][0] + track / s
    return " ".join(parts), x * s - track


serif = load("cormorant-garamond-var.woff2", 600)
sans = load("manrope-var.woff2", 600)

# Wordmark: cap height of Cormorant = 0.625 em. Size 100 -> caps 62.5 tall.
word_d, word_w = text_path(serif, "NOMBRA", 100, 0, 63, track=16)
(ROOT / "src" / "assets" / "brand").mkdir(parents=True, exist_ok=True)
(ROOT / "src" / "assets" / "brand" / "wordmark.svg").write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 {word_w + 4:.1f} 68" '
    f'fill="currentColor" role="img" aria-label="Nombra"><path d="{word_d}"/></svg>\n'
)

# Charm monogram: a round medal with a bail, engraved serif N.
n_d, n_w = text_path(serif, "N", 46, 0, 0)


def charm(fill_bg: str, fill_n: str, ring: str, size=64) -> str:
    # Medal centered at (32, 36) r=22, bail at top.
    nx = 32 - n_w / 2
    n_shift = n_d  # path already at origin baseline 0
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="{size}" height="{size}">'
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#F6E3AE"/><stop offset=".45" stop-color="#C9A05A"/>'
        '<stop offset="1" stop-color="#8E6A2E"/></linearGradient></defs>'
        f'<rect width="64" height="64" rx="14" fill="{fill_bg}"/>'
        f'<circle cx="32" cy="10.5" r="4.2" fill="none" stroke="{ring}" stroke-width="2.2"/>'
        f'<circle cx="32" cy="36" r="20.5" fill="{ring}"/>'
        f'<g transform="translate({nx:.2f} 50.5)" fill="{fill_n}"><path d="{n_shift}"/></g>'
        "</svg>\n"
    )


(ROOT / "public").mkdir(exist_ok=True)
(ROOT / "public" / "favicon.svg").write_text(charm("#1F1915", "#1F1915", "url(#g)"))
(ROOT / "src" / "assets" / "brand" / "charm.svg").write_text(charm("none", "#1F1915", "url(#g)"))

# Full lockup for social / print.
tag_d, tag_w = text_path(sans, "JOYERÍA CON NOMBRE PROPIO", 15, 0, 0, track=4.2)
W = max(word_w, tag_w) + 40
lock = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.1f} 170">'
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
    '<stop offset="0" stop-color="#F6E3AE"/><stop offset=".45" stop-color="#C9A05A"/>'
    '<stop offset="1" stop-color="#8E6A2E"/></linearGradient></defs>'
    f'<g transform="translate({(W - word_w) / 2:.1f} 30)" fill="#1F1915"><path d="{word_d}"/></g>'
    f'<rect x="{W / 2 - 34:.1f}" y="112" width="68" height="1.4" fill="url(#g)"/>'
    f'<g transform="translate({(W - tag_w) / 2:.1f} 148)" fill="#6E6259"><path d="{tag_d}"/></g>'
    "</svg>\n"
)
(ROOT / "public" / "brand").mkdir(exist_ok=True)
(ROOT / "public" / "brand" / "logo-full.svg").write_text(lock)
print("brand built:", round(word_w, 1), "wide wordmark")
