#!/usr/bin/env python3
"""Prepare the neck photos used by the live preview.

1. Detects the real chain in neck-base.jpg (gold) and neck-base-plata.jpg (silver).
2. Removes the central part of the chain by cloning nearby skin along the curve normal,
   so the SVG preview can draw the pendant and the missing chain on top.
3. Prints the geometry to paste into src/lib/geometry.ts.

Requires: pip install opencv-python-headless numpy
Usage:   RAW_DIR=.image-raw python scripts/chain-cut.py
"""
import json
import os
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
RAW = Path(os.environ.get("RAW_DIR", ROOT / ".image-raw"))
HALF = 240  # metade da largura (px) da corrente removida em torno do ponto mais baixo


def rough_fit(im):
    a = im.astype(float)
    L = a.mean(axis=2)
    score = (L - cv2.blur(L, (19, 19))) * ((a[:, :, 2] - a[:, :, 0]) > 55)
    pts = []
    for x in range(520, 1400, 6):
        k = np.convolve(score[700:1450, x], np.ones(5) / 5, mode="same")
        if k.max() > 18:
            pts.append((x, int(np.argmax(k)) + 700))
    pts = np.array(pts)
    m = np.ones(len(pts), bool)
    for _ in range(6):
        p = np.polyfit(pts[m, 0], pts[m, 1], 4)
        r = np.abs(np.polyval(p, pts[:, 0]) - pts[:, 1])
        m = r < max(12, np.percentile(r[m], 80))
    return p


def refine(im, p, metal):
    a = im.astype(float)
    L = a.mean(axis=2)
    top = L - cv2.blur(L, (19, 19))
    if metal == "gold":
        score = top * ((a[:, :, 2] - a[:, :, 0]) > 55)
    else:
        score = top * (cv2.cvtColor(im, cv2.COLOR_BGR2HSV)[:, :, 1] < 70)
    xs = np.arange(560, 1340, 2)
    ys = []
    for x in xs:
        y0 = int(np.polyval(p, x))
        k = np.convolve(score[y0 - 34 : y0 + 34, x], np.ones(7) / 7, mode="same")
        ys.append(y0 - 34 + int(np.argmax(k)))
    ys = np.array(ys, float)
    m = np.ones(len(xs), bool)
    for _ in range(6):
        q = np.polyfit(xs[m], ys[m], 6)
        r = np.abs(np.polyval(q, xs) - ys)
        m = r < max(5, np.percentile(r[m], 75))
    return q


def cut(im, q, bx):
    H, W = im.shape[:2]
    dq = np.polyder(q)
    x0, x1 = bx - HALF, bx + HALF
    mask = np.zeros((H, W), np.uint8)
    pts = np.array([[x, int(round(np.polyval(q, x)))] for x in range(x0, x1 + 1)], np.int32)
    cv2.polylines(mask, [pts], False, 255, 36)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    s = np.polyval(dq, np.clip(xx, x0, x1))
    n = np.sqrt(1 + s * s)
    D = 46  # distância (px) da pele "doadora" ao longo da normal da curva
    src = cv2.remap(im, (xx - s / n * D).astype(np.float32), (yy + D / n).astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    mm = np.clip(cv2.GaussianBlur(mask.astype(np.float32) / 255, (0, 0), 3.5) * 1.5, 0, 1)[..., None]
    return np.clip(im * (1 - mm) + src * mm, 0, 255).astype(np.uint8), (x0, x1)


gold = cv2.imread(str(RAW / "neck-base.jpg"))
p = rough_fit(gold)
out = {}
for name, metal in (("neck-base", "gold"), ("neck-base-plata", "silver")):
    im = cv2.imread(str(RAW / f"{name}.jpg"))
    q = refine(im, p, metal)
    xs = np.arange(560, 1340)
    bx = int(xs[np.argmax(np.polyval(q, xs))])
    res, (x0, x1) = cut(im, q, bx)
    cv2.imwrite(str(RAW / f"{name}-cut.jpg"), res, [cv2.IMWRITE_JPEG_QUALITY, 95])
    dq = np.polyder(q)
    out[metal] = {
        "cutL": [x0, round(float(np.polyval(q, x0)), 1)],
        "cutR": [x1, round(float(np.polyval(q, x1)), 1)],
        "slopeL": round(float(np.polyval(dq, x0)), 3),
        "slopeR": round(float(np.polyval(dq, x1)), 3),
        "bottom": [bx, round(float(np.polyval(q, bx)), 1)],
        "curve": [[int(x), round(float(np.polyval(q, x)), 1)] for x in range(x0, x1 + 1, 24)],
    }
print(json.dumps(out, indent=1))
