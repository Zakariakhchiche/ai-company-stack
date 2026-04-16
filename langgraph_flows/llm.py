"""Shared LLM factory for LangGraph nodes. Ollama Cloud via OpenAI-compat endpoint."""
from __future__ import annotations

from langchain_openai import ChatOpenAI
from settings import get_settings


def _client(model: str, temperature: float = 0.0) -> ChatOpenAI:
    s = get_settings()
    return ChatOpenAI(
        model=model,
        api_key=s.ollama_api_key,
        base_url=s.ollama_base_url,
        temperature=temperature,
    )


def heavy(temperature: float = 0.0) -> ChatOpenAI:
    return _client(get_settings().ollama_model_heavy, temperature)


def mid(temperature: float = 0.0) -> ChatOpenAI:
    return _client(get_settings().ollama_model_mid, temperature)


def light(temperature: float = 0.0) -> ChatOpenAI:
    return _client(get_settings().ollama_model_light, temperature)
