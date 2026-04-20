"""Runtime LLM config loaded from a JSON file, editable via the admin UI.

Priority order for any field:
    1. Value in ``config/llm.json`` (written by the admin endpoint)
    2. Environment variable (via Settings)
    3. Hard-coded default in Settings

The JSON path defaults to ``/app/config/llm.json`` inside the container
(mounted as a volume) and can be overridden with ``LLM_CONFIG_PATH``.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from threading import Lock
from typing import Any

_LOCK = Lock()

FIELDS = (
    "ollama_api_key",
    "ollama_base_url",
    "ollama_model_heavy",
    "ollama_model_mid",
    "ollama_model_light",
    "ollama_model_code",
)


def config_path() -> Path:
    return Path(os.environ.get("LLM_CONFIG_PATH", "/app/config/llm.json"))


def load_overrides() -> dict[str, Any]:
    path = config_path()
    if not path.exists():
        return {}
    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}
    return {k: v for k, v in data.items() if k in FIELDS and v not in (None, "")}


def save_overrides(data: dict[str, Any]) -> dict[str, Any]:
    clean = {k: v for k, v in data.items() if k in FIELDS and v not in (None, "")}
    path = config_path()
    with _LOCK:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".json.tmp")
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(clean, f, indent=2)
        tmp.replace(path)
    return clean


def effective(base: dict[str, Any]) -> dict[str, Any]:
    """Merge env-based defaults with JSON overrides."""
    merged = dict(base)
    merged.update(load_overrides())
    return merged
