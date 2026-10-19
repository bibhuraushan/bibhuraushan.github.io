"""Refresh data/aft-polar.json: AFT polar fields for Solar Cycle 25, shown on the Home page.

Usage (from the site root):
    uv run --project tools tools/update_aft_polar.py

Reads the AFT baseline polar-field table published by SwRI (6-hourly rows) and keeps one
daily mean per hemisphere from the start of the cycle. The browser cannot read the SwRI file
directly (it sends no CORS header), so the site uses this local copy.
"""

from __future__ import annotations

import csv
import io
from collections import defaultdict

import requests

from common import load_config, now_iso, write_json


def main() -> None:
    cfg = load_config()["aft_polar"]
    r = requests.get(cfg["url"], timeout=60)
    r.raise_for_status()

    rows = csv.reader(io.StringIO(r.text), delimiter=" ", skipinitialspace=True)
    header = next(rows)
    i_t, i_n, i_s = header.index("Time"), header.index("PolarN"), header.index("PolarS")

    days: dict[str, list[tuple[float, float]]] = defaultdict(list)
    for row in rows:
        if len(row) <= max(i_t, i_n, i_s):
            continue
        day = row[i_t][:10]
        if day < cfg["start"]:
            continue
        try:
            days[day].append((float(row[i_n]), float(row[i_s])))
        except ValueError:
            continue

    # Rows as [date, north, south] keep the file small.
    items = [
        [d, round(sum(v[0] for v in vals) / len(vals), 3), round(sum(v[1] for v in vals) / len(vals), 3)]
        for d, vals in sorted(days.items())
    ]
    out = {
        "updated": now_iso(),
        "source": cfg["url"],
        "source_modified": r.headers.get("Last-Modified", ""),
        "units": cfg.get("units", "G"),
        "columns": ["date", "north", "south"],
        "items": items,
    }
    path = write_json(cfg["output"], out, compact=True)
    print(f"Wrote {len(items)} days ({items[0][0]} to {items[-1][0]}) to {path}")


if __name__ == "__main__":
    main()
