#!/usr/bin/env python3
"""Generate the site's photography with Replicate.

Usage:
    export REPLICATE_API_TOKEN=...        # never commit this value
    python scripts/generate-images.py                 # all images missing in raw dir
    python scripts/generate-images.py hero-placa taller   # only these ids
    python scripts/generate-images.py --force hero-placa  # regenerate

Prompts live in scripts/image-prompts.json. Raw outputs go to RAW_DIR
(default: .image-raw/, git-ignored). Optimized copies used by the site are
produced by scripts/optimize-images.py into src/assets/photos/.
"""
import concurrent.futures as cf
import json
import os
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
PROMPTS = ROOT / "scripts" / "image-prompts.json"
RAW_DIR = Path(os.environ.get("RAW_DIR", ROOT / ".image-raw"))
API = "https://api.replicate.com/v1"

STYLE = (
    "Ultra-realistic editorial photograph, indistinguishable from a real photo shot by a "
    "professional fine-jewelry photographer on a full-frame camera. Natural light, true-to-life "
    "skin texture with visible pores and fine vellus hair, no plastic or airbrushed skin, no CGI "
    "look, no illustration, no digital-art sheen. Physically accurate reflections and highlights "
    "on polished metal, subtle film grain, realistic depth of field. No watermark, no logos, no "
    "captions, no extra text anywhere in the image except the jewelry engraving described."
)


def token() -> str:
    t = os.environ.get("REPLICATE_API_TOKEN")
    if not t:
        sys.exit("REPLICATE_API_TOKEN is not set")
    return t


def run(item: dict) -> Path:
    headers = {
        "Authorization": f"Bearer {token()}",
        "Content-Type": "application/json",
        "Prefer": "wait=60",
    }
    model = item.get("model", "google/nano-banana-2.1")
    prompt = item["prompt"].strip()
    if not item.get("raw_prompt"):
        prompt = f"{prompt}\n\n{STYLE}"
    inp = {"prompt": prompt}
    if model.startswith("google/"):
        inp.update(
            {
                "aspect_ratio": item.get("aspect_ratio", "4:5"),
                "resolution": item.get("resolution", "2K"),
                "output_format": "jpg",
            }
        )
        if item.get("image_input"):
            inp["image_input"] = [upload(p) for p in item["image_input"]]
    else:  # openai/gpt-image-2
        inp.update(
            {
                "aspect_ratio": item.get("aspect_ratio", "2:3"),
                "quality": "high",
                "output_format": "jpeg",
                "number_of_images": 1,
            }
        )
        if item.get("image_input"):
            inp["input_images"] = [upload(p) for p in item["image_input"]]

    for attempt in range(12):
        r = requests.post(f"{API}/models/{model}/predictions", headers=headers, json={"input": inp}, timeout=120)
        if r.status_code != 429:
            break
        time.sleep(10 + attempt * 5)  # Replicate rate limit: back off and retry
    r.raise_for_status()
    pred = r.json()
    while pred["status"] not in ("succeeded", "failed", "canceled"):
        time.sleep(3)
        pred = requests.get(pred["urls"]["get"], headers=headers, timeout=60).json()
    if pred["status"] != "succeeded":
        raise RuntimeError(f"{item['id']}: {pred['status']} {pred.get('error')}")
    out = pred["output"]
    url = out[0] if isinstance(out, list) else out
    data = requests.get(url, timeout=120).content
    dest = RAW_DIR / f"{item['id']}.jpg"
    dest.write_bytes(data)
    return dest


_uploaded: dict = {}


def upload(path: str) -> str:
    """Upload a local reference image and return a URL usable as model input."""
    p = (ROOT / path) if not os.path.isabs(path) else Path(path)
    if not p.exists():
        p = RAW_DIR / path
    key = str(p)
    if key in _uploaded:
        return _uploaded[key]
    with open(p, "rb") as fh:
        r = requests.post(
            f"{API}/files",
            headers={"Authorization": f"Bearer {token()}"},
            files={"content": (p.name, fh, "image/jpeg")},
            timeout=120,
        )
    r.raise_for_status()
    _uploaded[key] = r.json()["urls"]["get"]
    return _uploaded[key]


def main() -> None:
    args = sys.argv[1:]
    force = "--force" in args
    ids = [a for a in args if not a.startswith("--")]
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    items = json.loads(PROMPTS.read_text())
    todo = [
        i
        for i in items
        if (not ids or i["id"] in ids) and (force or not (RAW_DIR / f"{i['id']}.jpg").exists())
    ]
    # Images that depend on another raw image must run after it.
    first = [i for i in todo if not i.get("image_input")]
    second = [i for i in todo if i.get("image_input")]
    for batch in (first, second):
        with cf.ThreadPoolExecutor(max_workers=int(os.environ.get("WORKERS", "2"))) as ex:
            futs = {ex.submit(run, i): i["id"] for i in batch}
            for f in cf.as_completed(futs):
                try:
                    print("ok  ", futs[f], "->", f.result())
                except Exception as e:  # noqa: BLE001
                    print("FAIL", futs[f], e)


if __name__ == "__main__":
    main()
