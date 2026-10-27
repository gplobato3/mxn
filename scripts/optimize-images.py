#!/usr/bin/env python3
"""Copy approved raw photos into src/assets/photos at a sane size.

Astro then generates responsive AVIF/WebP from these sources at build time.
Usage: RAW_DIR=.image-raw python scripts/optimize-images.py
"""
import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW = Path(os.environ.get("RAW_DIR", ROOT / ".image-raw"))
OUT = ROOT / "src" / "assets" / "photos"
OUT.mkdir(parents=True, exist_ok=True)

# id -> (source file, max long side)
PHOTOS = {
    "hero-desktop": ("hero-desktop.jpg", 2400),
    "hero-mobile": ("hero-mobile.jpg", 1500),
    "placa-oro": ("placa-oro.jpg", 1600),
    "placa-plata": ("placa-plata.jpg", 1600),
    "nombre-oro": ("nombre-oro.jpg", 1600),
    "nombre-oro-b": ("nombre-oro-b.jpg", 1600),
    "nombre-plata": ("nombre-plata.jpg", 1600),
    "iniciales": ("iniciales.jpg", 1600),
    "mascota-perro": ("mascota-perro.jpg", 1600),
    "mascota-gato": ("mascota-gato.jpg", 1600),
    "mascota-lifestyle": ("mascota-lifestyle.jpg", 1600),
    "regalo": ("regalo.jpg", 1600),
    "taller": ("taller.jpg", 1600),
    "mama": ("mama.jpg", 1600),
    "materiales": ("materiales.jpg", 2000),
    # bases da prévia: corrente central removida (ver scripts/chain-cut.py)
    "neck-oro": ("neck-base-cut.jpg", 1856),
    "neck-plata": ("neck-base-plata-cut.jpg", 1856),
}

for name, (src, long_side) in PHOTOS.items():
    p = RAW / src
    if not p.exists():
        print("missing", p)
        continue
    im = Image.open(p).convert("RGB")
    im.thumbnail((long_side, long_side), Image.LANCZOS)
    dest = OUT / f"{name}.jpg"
    im.save(dest, "JPEG", quality=84, optimize=True, progressive=True)
    print(f"{name:20s} {im.size} {dest.stat().st_size // 1024} KB")
