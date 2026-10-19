"""Shared helpers for the site scripts."""

from __future__ import annotations

import json
import tomllib
from datetime import datetime, timezone
from pathlib import Path

SITE_ROOT = Path(__file__).resolve().parent.parent
CONFIG = SITE_ROOT / "tools" / "config.toml"


def load_config() -> dict:
    with CONFIG.open("rb") as f:
        return tomllib.load(f)


def site_path(rel: str) -> Path:
    return SITE_ROOT / rel


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def write_json(rel: str, data, compact: bool = False) -> Path:
    path = site_path(rel)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    text = json.dumps(data, separators=(",", ":"), ensure_ascii=False) if compact else json.dumps(data, indent=2, ensure_ascii=False)
    tmp.write_text(text + "\n", encoding="utf-8")
    tmp.replace(path)
    return path


def read_json(rel: str, default=None):
    path = site_path(rel)
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))
