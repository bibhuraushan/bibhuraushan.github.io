"""Refresh data/publications.json from NASA ADS.

Usage (from the site root):
    export ADS_API_TOKEN=...        # https://ui.adsabs.harvard.edu/user/settings/token
    uv run --project tools tools/update_publications.py
    uv run --project tools tools/update_publications.py --dry-run   # print, don't write

The search, extra/excluded bibcodes and name variants live in tools/config.toml.
Plain-language summaries are kept separately in data/summaries.json (edit by hand);
this script lists papers that still need one.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import requests

from common import load_config, now_iso, read_json, write_json

API = "https://api.adsabs.harvard.edu/v1/search/query"
FIELDS = ",".join([
    "bibcode", "title", "author", "year", "pubdate", "pub", "bibstem", "volume", "issue",
    "page", "doi", "identifier", "doctype", "property", "citation_count",
])
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

# Short venue names for the journals that show up most; anything else uses ADS's bibstem.
SHORT = {
    "The Astrophysical Journal": "ApJ",
    "The Astrophysical Journal Letters": "ApJL",
    "The Astrophysical Journal Supplement Series": "ApJS",
    "Solar Physics": "SoPh",
    "Monthly Notices of the Royal Astronomical Society": "MNRAS",
    "Frontiers in Astronomy and Space Sciences": "FrASS",
    "Astronomy and Astrophysics": "A&A",
    "Science": "Science",
    "Nature Astronomy": "NatAs",
    "Space Weather": "SpWea",
    "Journal of Geophysical Research (Space Physics)": "JGRA",
    "arXiv e-prints": "arXiv",
}


def token() -> str:
    tok = os.environ.get("ADS_API_TOKEN") or os.environ.get("ADS_DEV_KEY")
    if not tok:
        key = Path.home() / ".ads" / "dev_key"
        if key.exists():
            tok = key.read_text().strip()
    if not tok:
        sys.exit("Set ADS_API_TOKEN (get one at https://ui.adsabs.harvard.edu/user/settings/token).")
    return tok


def search(q: str, tok: str) -> list[dict]:
    docs, start = [], 0
    while True:
        r = requests.get(
            API,
            params={"q": q, "fl": FIELDS, "rows": 200, "start": start, "sort": "date desc"},
            headers={"Authorization": f"Bearer {tok}"},
            timeout=30,
        )
        r.raise_for_status()
        resp = r.json()["response"]
        docs += resp["docs"]
        start += len(resp["docs"])
        if start >= resp["numFound"] or not resp["docs"]:
            return docs


def category(doc: dict) -> str:
    doctype = doc.get("doctype", "")
    props = set(doc.get("property", []))
    if doctype == "phdthesis":
        return "thesis"
    if doctype == "software":
        return "software"
    if doctype in {"dataset", "catalog"}:
        return "data"
    if doctype == "eprint" or doc.get("bibstem", [""])[0] == "arXiv":
        return "preprint"
    if doctype in {"inproceedings", "abstract", "proceedings", "inbook"}:
        return "proceedings"
    if doctype == "article":
        return "refereed" if "REFEREED" in props else "other"
    return "other"


def arxiv_id(doc: dict) -> str:
    for ident in doc.get("identifier", []):
        if ident.lower().startswith("arxiv:"):
            return ident.split(":", 1)[1]
    return ""


def flip(name: str) -> str:
    """'Jha, Bibhuti Kumar' -> 'Bibhuti Kumar Jha'."""
    if "," in name:
        last, first = [s.strip() for s in name.split(",", 1)]
        return f"{first} {last}".strip()
    return name


def to_item(doc: dict, my_names: list[str]) -> dict:
    bib = doc["bibcode"]
    pubdate = doc.get("pubdate", "")  # "2026-02-00"
    y, m = (pubdate.split("-") + ["00"])[:2]
    m = int(m) if m.isdigit() else 0
    authors = doc.get("author", [])
    first = authors[0] if authors else ""
    venue = doc.get("pub", "")
    ax = arxiv_id(doc)
    doi = (doc.get("doi") or [""])[0]
    return {
        "bibcode": bib,
        "year": int(doc.get("year") or y),
        "month": MONTHS[m - 1] if m else "",
        "pubdate": f"{y}-{m:02d}" if m else y,
        "category": category(doc),
        "title": (doc.get("title") or [""])[0],
        "authors": [flip(a) for a in authors],
        "first_author": any(first.startswith(n.rstrip(".")) for n in my_names),
        "venue": venue,
        "venue_short": SHORT.get(venue, (doc.get("bibstem") or [""])[0]),
        "volume": doc.get("volume", ""),
        "issue": doc.get("issue", ""),
        "pages": (doc.get("page") or [""])[0],
        "doi": doi,
        "arxiv": ax,
        "citations": doc.get("citation_count"),
        "ads": f"https://ui.adsabs.harvard.edu/abs/{bib}/abstract",
        "bibtex": f"https://ui.adsabs.harvard.edu/abs/{bib}/exportcitation",
        "pdf": f"https://arxiv.org/pdf/{ax}" if ax else "",
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="print the list instead of writing it")
    args = ap.parse_args()

    cfg = load_config()["publications"]
    tok = token()
    docs = search(cfg["query"], tok)
    extra = [b for b in cfg.get("extra_bibcodes", []) if b not in {d["bibcode"] for d in docs}]
    if extra:
        docs += search("bibcode:(" + " OR ".join(f'"{b}"' for b in extra) + ")", tok)
    skip = set(cfg.get("exclude_bibcodes", []))
    items = [to_item(d, cfg["my_names"]) for d in docs if d["bibcode"] not in skip]
    items.sort(key=lambda x: (x["pubdate"], x["bibcode"]), reverse=True)

    counts: dict[str, int] = {}
    for it in items:
        counts[it["category"]] = counts.get(it["category"], 0) + 1

    out = {"updated": now_iso(), "source": "NASA ADS", "query": cfg["query"], "counts": counts, "items": items}
    if args.dry_run:
        for it in items:
            print(f'{it["pubdate"]:8} {it["category"]:11} {it["venue_short"]:8} {it["title"][:80]}')
        print(counts)
        return

    path = write_json(cfg["output"], out)
    print(f"Wrote {len(items)} records to {path} ({counts})")

    summaries = read_json("data/summaries.json", {}) or {}
    missing = [it for it in items if it["category"] in {"refereed", "preprint"} and it["bibcode"] not in summaries]
    if missing:
        print("\nNo plain-language summary yet (add them to data/summaries.json):")
        for it in missing:
            print(f'  "{it["bibcode"]}": "",   # {it["title"][:70]}')


if __name__ == "__main__":
    main()
