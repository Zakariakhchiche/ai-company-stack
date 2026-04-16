"""Shared LLM factory for CrewAI agents.

CrewAI 1.x uses its own LLM wrapper (litellm under the hood). For Ollama Cloud's
OpenAI-compatible endpoint we use the `openai/<model>` provider prefix plus a
custom base_url.
"""
from __future__ import annotations

from crewai import LLM
from settings import get_settings


def _client(model: str, temperature: float = 0.2) -> LLM:
    s = get_settings()
    return LLM(
        model=f"openai/{model}",
        api_key=s.ollama_api_key,
        base_url=s.ollama_base_url,
        temperature=temperature,
    )


def heavy(temperature: float = 0.2) -> LLM:
    """Deepest reasoning. Use for CEO, risk scoring, contract clause extraction."""
    return _client(get_settings().ollama_model_heavy, temperature)


def mid(temperature: float = 0.3) -> LLM:
    """Balanced. Use for directors, content writing, classification."""
    return _client(get_settings().ollama_model_mid, temperature)


def light(temperature: float = 0.1) -> LLM:
    """Fast and cheap. Use for triage, enrichment, routing decisions."""
    return _client(get_settings().ollama_model_light, temperature)


def code(temperature: float = 0.1) -> LLM:
    """Code-tuned. Use for coding agents."""
    return _client(get_settings().ollama_model_code, temperature)
