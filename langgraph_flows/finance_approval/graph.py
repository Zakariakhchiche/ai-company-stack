"""Finance invoice-approval graph.

Flow:
  extract -> classify -> gate
           gate == auto     -> post_to_quickbooks
           gate == approval -> INTERRUPT (wait for human via Slack)
                               -> approved    -> post_to_quickbooks
                               -> rejected    -> notify_rejected
"""
from langgraph.graph import StateGraph, START, END
from langgraph.types import interrupt

from checkpointer import get_checkpointer
from .state import InvoiceState
from .nodes import (
    extract_invoice,
    classify_and_flag,
    decide_approval_gate,
    request_human_approval,
    post_to_quickbooks,
    notify_rejected,
)


def _human_review(state: InvoiceState) -> InvoiceState:
    """Interrupt the graph until a human resumes with {approval_status: approved|rejected}."""
    decision = interrupt({
        "reason": "invoice_approval_required",
        "invoice_id": state["invoice_id"],
        "amount": state["extracted"].get("amount"),
        "vendor": state["extracted"].get("vendor"),
        "flags": state.get("anomaly_flags", []),
    })
    return {**state, "approval_status": decision.get("status"), "approver": decision.get("approver")}


def _route_after_gate(state: InvoiceState) -> str:
    if state.get("error"):
        return "end_error"
    return "human_review" if state.get("requires_approval") else "post_to_quickbooks"


def _route_after_review(state: InvoiceState) -> str:
    if state.get("approval_status") == "approved":
        return "post_to_quickbooks"
    return "notify_rejected"


def build_graph():
    g = StateGraph(InvoiceState)
    g.add_node("extract", extract_invoice)
    g.add_node("classify", classify_and_flag)
    g.add_node("gate", decide_approval_gate)
    g.add_node("request_approval", request_human_approval)
    g.add_node("human_review", _human_review)
    g.add_node("post_to_quickbooks", post_to_quickbooks)
    g.add_node("notify_rejected", notify_rejected)

    g.add_edge(START, "extract")
    g.add_edge("extract", "classify")
    g.add_edge("classify", "gate")
    g.add_conditional_edges(
        "gate",
        _route_after_gate,
        {"human_review": "request_approval", "post_to_quickbooks": "post_to_quickbooks", "end_error": END},
    )
    g.add_edge("request_approval", "human_review")
    g.add_conditional_edges(
        "human_review",
        _route_after_review,
        {"post_to_quickbooks": "post_to_quickbooks", "notify_rejected": "notify_rejected"},
    )
    g.add_edge("post_to_quickbooks", END)
    g.add_edge("notify_rejected", END)

    return g.compile(checkpointer=get_checkpointer())
