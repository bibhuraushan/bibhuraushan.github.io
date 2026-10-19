"""Build data/gallery.json (and web-sized copies) from the photos/ folder.

Usage (from the site root):
    uv run --project tools tools/update_gallery.py

How to add photos:
  1. Drop full-size JPEG/PNG/WebP files into an album folder, e.g.
     photos/solar-sky/sunspots-2026-10-03.jpg  (folders are listed in tools/config.toml).
  2. Optionally describe them in photos/captions.toml:

        [photo_of_the_month]
        file = "solar-sky/sunspots-2026-10-03.jpg"
        note = "Two big sunspot groups crossing the disk."

        ["solar-sky/sunspots-2026-10-03.jpg"]
        title = "Sunspots through a white-light filter"
        place = "Boulder, Colorado"
        date = "2026-10-03"         # otherwise read from the camera's EXIF date
        caption = "AR 4251 and AR 4253, ..."

  3. Run this script. It writes photos/<album>/web/<name>-720.jpg and -2400.jpg
     next to each original and lists everything in data/gallery.json.
     Originals are never changed; web copies are only rebuilt when missing or older.
"""

from __future__ import annotations

import tomllib
from datetime import datetime
from pathlib import Path

from PIL import ExifTags, Image, ImageOps

from common import SITE_ROOT, load_config, now_iso, site_path, write_json

EXTS = {".jpg", ".jpeg", ".png", ".webp"}
DATE_TAG = next(k for k, v in ExifTags.TAGS.items() if v == "DateTimeOriginal")


def exif_date(img: Image.Image) -> str:
    try:
        raw = img.getexif().get_ifd(ExifTags.IFD.Exif).get(DATE_TAG) or img.getexif().get(306)
        return datetime.strptime(raw, "%Y:%m:%d %H:%M:%S").date().isoformat() if raw else ""
    except (ValueError, TypeError):
        return ""


def web_copy(src: Path, img: Image.Image, width: int) -> Path:
    out = src.parent / "web" / f"{src.stem}-{width}.jpg"
    if out.exists() and out.stat().st_mtime >= src.stat().st_mtime:
        return out
    out.parent.mkdir(exist_ok=True)
    copy = img.copy()
    copy.thumbnail((width, width * 4))
    copy.convert("RGB").save(out, "JPEG", quality=84, optimize=True, progressive=True)
    return out


def rel(p: Path) -> str:
    return p.relative_to(SITE_ROOT).as_posix()


def main() -> None:
    cfg = load_config()["gallery"]
    root = site_path(cfg["photos_dir"])
    cap_file = site_path(cfg["captions"])
    captions = tomllib.loads(cap_file.read_text(encoding="utf-8")) if cap_file.exists() else {}

    albums = []
    for folder, label in cfg["albums"].items():
        photos = []
        for src in sorted((root / folder).glob("*")):
            if src.suffix.lower() not in EXTS or not src.is_file():
                continue
            key = f"{folder}/{src.name}"
            meta = captions.get(key, {})
            with Image.open(src) as im:
                date = exif_date(im)
                im = ImageOps.exif_transpose(im)
                w, h = im.size
                thumb = web_copy(src, im, cfg["thumb_width"])
                large = web_copy(src, im, cfg["large_width"])
            photos.append({
                "id": key,
                "title": meta.get("title", src.stem.replace("-", " ").replace("_", " ").capitalize()),
                "caption": meta.get("caption", ""),
                "place": meta.get("place", ""),
                "date": str(meta.get("date", date)),
                "width": w,
                "height": h,
                "thumb": rel(thumb),
                "src": rel(large),
            })
        photos.sort(key=lambda p: p["date"], reverse=True)
        albums.append({"id": folder, "title": label, "photos": photos})
        print(f"  {label}: {len(photos)} photos")

    potm = None
    pick = captions.get("photo_of_the_month", {})
    by_id = {p["id"]: p for a in albums for p in a["photos"]}
    if pick.get("file") in by_id:
        potm = dict(by_id[pick["file"]], note=pick.get("note", ""))
    elif pick.get("file"):
        print(f"  ! photo_of_the_month file not found: {pick['file']}")

    path = write_json(cfg["output"], {"updated": now_iso(), "photo_of_the_month": potm, "albums": albums})
    print(f"Wrote {path}")


if __name__ == "__main__":
    main()
