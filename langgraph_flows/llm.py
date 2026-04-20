"""Shared LLM factory for LangGraph nodes. Ollama Cloud via OpenAI-compat endpoint.

Runtime overrides from ``config/llm.json`` (editable via the admin UI) take
precedence over values set via environment variables.
"""
from __future__ import annotations

from langchain_openai import ChatOpenAI

import runtime_config
from settings import get_settings


def _resolved() -> dict:
    s = get_settings()
    base = {
        "ollama_api_key": s.ollama_api_key,
        "ollama_base_url": s.ollama_base_url,
        "ollama_model_heavy": s.ollama_model_heavy,
        "ollama_model_mid": s.ollama_model_mid,
        "ollama_model_light": s.ollama_model_light,
    }
    return runtime_config.effective(base)


def _client(model: str, temperature: float = 0.0) -> ChatOpenAI:
    cfg = _resolved()
    return ChatOpenAI(
        model=model,
        api_key=cfg["ollama_api_key"],
        base_url=cfg["ollama_base_url"],
        temperature=temperature,
    )


def heavy(temperature: float = 0.0) -> ChatOpenAI:
    return _client(_resolved()["ollama_model_heavy"], temperature)


def mid(temperature: float = 0.0) -> ChatOpenAI:
    return _client(_resolved()["ollama_model_mid"], temperature)


def light(temperature: float = 0.0) -> ChatOpenAI:
    return _client(_resolved()["ollama_model_light"], temperature)
