"""Admin router: read/write the runtime LLM config + serve the static admin page.

Mount this router on the CrewAI FastAPI app. It exposes:
    GET  /admin/              -> HTML page (simple form)
    GET  /admin/api/llm       -> current effective config (api_key masked)
    POST /admin/api/llm       -> update overrides, persisted to config/llm.json
    POST /admin/api/llm/test  -> quick connectivity check against Ollama Cloud

Auth: a shared token read from ADMIN_TOKEN env var. Required on all endpoints
except the HTML page (which prompts for the token in-browser).
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import httpx
from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

import runtime_config
from settings import get_settings

router = APIRouter(prefix="/admin")

_HTML_PATH = Path(__file__).parent / "admin_static" / "index.html"


def _require_token(authorization: str | None) -> None:
    expected = os.environ.get("ADMIN_TOKEN")
    if not expected:
        raise HTTPException(status_code=503, detail="ADMIN_TOKEN not configured on server")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    if authorization.removeprefix("Bearer ").strip() != expected:
        raise HTTPException(status_code=403, detail="Invalid token")


def _mask(value: str | None) -> str:
    if not value:
        return ""
    if len(value) <= 8:
        return "*" * len(value)
    return value[:4] + "*" * (len(value) - 8) + value[-4:]


class LLMConfigUpdate(BaseModel):
    ollama_api_key: str | None = None
    ollama_base_url: str | None = None
    ollama_model_heavy: str | None = None
    ollama_model_mid: str | None = None
    ollama_model_light: str | None = None
    ollama_model_code: str | None = None


def _effective_config() -> dict[str, Any]:
    s = get_settings()
    base = {
        "ollama_api_key": s.ollama_api_key,
        "ollama_base_url": s.ollama_base_url,
        "ollama_model_heavy": s.ollama_model_heavy,
        "ollama_model_mid": s.ollama_model_mid,
        "ollama_model_light": s.ollama_model_light,
        "ollama_model_code": s.ollama_model_code,
    }
    return runtime_config.effective(base)


@router.get("/", include_in_schema=False)
def admin_page():
    if not _HTML_PATH.exists():
        raise HTTPException(status_code=404, detail="admin page not found")
    return FileResponse(_HTML_PATH)


@router.get("/api/llm")
def read_llm_config(authorization: str | None = Header(default=None)):
    _require_token(authorization)
    cfg = _effective_config()
    overrides = runtime_config.load_overrides()
    return {
        "effective": {**cfg, "ollama_api_key": _mask(cfg.get("ollama_api_key"))},
        "overridden_fields": sorted(overrides.keys()),
        "config_path": str(runtime_config.config_path()),
    }


@router.post("/api/llm")
def write_llm_config(
    payload: LLMConfigUpdate,
    authorization: str | None = Header(default=None),
):
    _require_token(authorization)
    current = runtime_config.load_overrides()
    incoming = {k: v for k, v in payload.model_dump().items() if v is not None}
    merged = {**current, **incoming}
    saved = runtime_config.save_overrides(merged)
    cfg = _effective_config()
    return {
        "saved": sorted(saved.keys()),
        "effective": {**cfg, "ollama_api_key": _mask(cfg.get("ollama_api_key"))},
    }


@router.post("/api/llm/test")
def test_llm_connectivity(authorization: str | None = Header(default=None)):
    _require_token(authorization)
    cfg = _effective_config()
    url = cfg["ollama_base_url"].rstrip("/") + "/models"
    headers = {"Authorization": f"Bearer {cfg['ollama_api_key']}"}
    try:
        with httpx.Client(timeout=10.0) as client:
            r = client.get(url, headers=headers)
    except httpx.HTTPError as exc:
        return JSONResponse(status_code=502, content={"ok": False, "error": str(exc)})
    return {
        "ok": r.status_code == 200,
        "status_code": r.status_code,
        "url": url,
        "body_preview": r.text[:300],
    }
