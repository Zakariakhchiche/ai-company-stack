"""Contract review graph — multi-pass risk analysis with mandatory human sign-off.

extract_clauses -> risk_score -> redline_draft -> legal_review (HITL) -> [signed|returned]
"""
from __future__ import annotations

import json
from typing import Literal, TypedDict, NotRequired

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, START, END
from langgraph.types import interrupt

from checkpointer import get_checkpointer
from llm import heavy


class ContractState(TypedDict):
    contract_id: str
    contract_text: str

    clauses: NotRequired[list[dict]]
    risk_score: NotRequired[int]
    risk_summary: NotRequired[str]
    redlines: NotRequired[list[dict]]

    review_status: NotRequired[Literal["pending", "signed", "returned_for_edits", "rejected"]]
    reviewer: NotRequired[str]
    reviewer_notes: NotRequired[str]

    error: NotRequired[str]


def _model():
    return heavy(temperature=0.0)


def extract_clauses(state: ContractState) -> ContractState:
    model = _model()
    resp = model.invoke([
        SystemMessage(content=(
            "Extract all clauses from the contract. Return JSON list of "
            "{clause_id, clause_type, text, parties_obligations}."
        )),
        HumanMessage(content=state["contract_text"][:30000]),
    ])
    try:
        return {**state, "clauses": json.loads(resp.content)}
    except json.JSONDecodeError:
        return {**state, "error": "Clause extraction failed"}


def risk_score(state: ContractState) -> ContractState:
    if state.get("error"):
        return state
    model = _model()
    resp = model.invoke([
        SystemMessage(content=(
            "Score contract risk 0-100 (100 = highest risk). Return JSON "
            "{score: int, summary: str, top_risks: list[str]}. "
            "Score >= 50 always requires legal review."
        )),
        HumanMessage(content=json.dumps(state["clauses"])[:20000]),
    ])
    try:
        data = json.loads(resp.content)
        return {**state, "risk_score": int(data["score"]), "risk_summary": data["summary"]}
    except (json.JSONDecodeError, KeyError):
        return {**state, "error": "Risk scoring failed"}


def redline_draft(state: ContractState) -> ContractState:
    if state.get("error"):
        return state
    model = _model()
    resp = model.invoke([
        SystemMessage(content=(
            "Propose redlines (strikethroughs + replacements) for the highest-risk clauses. "
            "Return JSON list of {clause_id, original, proposed, rationale}."
        )),
        HumanMessage(content=json.dumps({"clauses": state["clauses"], "risk_summary": state["risk_summary"]})[:20000]),
    ])
    try:
        return {**state, "redlines": json.loads(resp.content)}
    except json.JSONDecodeError:
        return {**state, "error": "Redline generation failed"}


def legal_review(state: ContractState) -> ContractState:
    """Always HITL — no contract is auto-signed."""
    decision = interrupt({
        "reason": "contract_review_required",
        "contract_id": state["contract_id"],
        "risk_score": state.get("risk_score"),
        "risk_summary": state.get("risk_summary"),
        "redlines": state.get("redlines", []),
    })
    return {
        **state,
        "review_status": decision.get("status", "returned_for_edits"),
        "reviewer": decision.get("reviewer"),
        "reviewer_notes": decision.get("notes"),
    }


def _route_after_review(state: ContractState) -> str:
    status = state.get("review_status")
    if status == "signed":
        return "end_signed"
    return "end_returned"


def build_graph():
    g = StateGraph(ContractState)
    g.add_node("extract_clauses", extract_clauses)
    g.add_node("risk_score", risk_score)
    g.add_node("redline_draft", redline_draft)
    g.add_node("legal_review", legal_review)

    g.add_edge(START, "extract_clauses")
    g.add_edge("extract_clauses", "risk_score")
    g.add_edge("risk_score", "redline_draft")
    g.add_edge("redline_draft", "legal_review")
    g.add_conditional_edges(
        "legal_review",
        _route_after_review,
        {"end_signed": END, "end_returned": END},
    )
    return g.compile(checkpointer=get_checkpointer())
