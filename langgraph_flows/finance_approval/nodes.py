"""Nodes for the invoice approval graph. Each node is pure (state-in, state-out)."""
from __future__ import annotations

import json
from langchain_core.messages import HumanMessage, SystemMessage

from llm import mid
from settings import get_settings
from .state import InvoiceState


def _model():
    return mid(temperature=0.0)


def extract_invoice(state: InvoiceState) -> InvoiceState:
    """OCR + structured extraction. In production, call a vision model on the file."""
    model = _model()
    prompt = [
        SystemMessage(content=(
            "You are a strict invoice extraction system. Return a JSON object with fields: "
            "vendor (str), amount (float), currency (ISO 4217), invoice_date (ISO 8601), "
            "due_date (ISO 8601 or null), line_items (list of {description, qty, unit_price}), "
            "vat_rate (float 0-1), vat_amount (float). "
            "Any missing field must be null — never invent."
        )),
        HumanMessage(content=f"Invoice file reference: {state.get('file_path', state['invoice_id'])}"),
    ]
    resp = model.invoke(prompt)
    try:
        extracted = json.loads(resp.content)
    except json.JSONDecodeError:
        return {**state, "error": f"Extraction failed: {resp.content[:200]}"}
    return {**state, "extracted": extracted}


def classify_and_flag(state: InvoiceState) -> InvoiceState:
    """Assign GL account and flag anomalies (duplicate, unusual vendor, amount spike)."""
    if state.get("error"):
        return state

    model = _model()
    extracted = state["extracted"]
    prompt = [
        SystemMessage(content=(
            "You are the accounts-payable classifier. Given an invoice JSON, return: "
            "{gl_account: str, cost_center: str, tax_treatment: 'standard'|'reverse_charge'|'exempt', "
            "anomaly_flags: list of strings}. Flag as 'duplicate_suspected', 'vendor_new', "
            "'amount_above_ytd_p95', 'missing_vat_number' when relevant. Output JSON only."
        )),
        HumanMessage(content=json.dumps(extracted)),
    ]
    resp = model.invoke(prompt)
    try:
        result = json.loads(resp.content)
    except json.JSONDecodeError:
        return {**state, "error": f"Classification failed: {resp.content[:200]}"}
    return {
        **state,
        "classification": {k: v for k, v in result.items() if k != "anomaly_flags"},
        "anomaly_flags": result.get("anomaly_flags", []),
    }


def decide_approval_gate(state: InvoiceState) -> InvoiceState:
    """Set requires_approval based on amount threshold and anomaly flags."""
    if state.get("error"):
        return state

    threshold = get_settings().finance_approval_threshold_eur
    amount = float(state["extracted"].get("amount") or 0)
    currency = state["extracted"].get("currency", "EUR")
    anomalies = state.get("anomaly_flags", [])

    requires = (
        amount >= threshold
        or currency != "EUR"
        or len(anomalies) > 0
    )
    return {
        **state,
        "requires_approval": requires,
        "approval_status": "pending" if requires else "auto",
    }


def request_human_approval(state: InvoiceState) -> InvoiceState:
    """Post to Slack and interrupt until a human responds. LangGraph handles the pause."""
    if state.get("error"):
        return state

    from slack_sdk import WebClient
    from slack_sdk.errors import SlackApiError

    s = get_settings()
    if not s.slack_bot_token:
        # Dry-run mode: log locally and continue — HITL still pauses via the interrupt() node.
        return {**state, "approval_message_ts": "dry-run-no-slack"}

    client = WebClient(token=s.slack_bot_token)
    ex = state["extracted"]
    flags = state.get("anomaly_flags", [])
    flags_txt = f"\n*Flags:* {', '.join(flags)}" if flags else ""
    text = (
        f"*Invoice approval required*\n"
        f"Vendor: {ex.get('vendor')} — *{ex.get('amount')} {ex.get('currency')}*\n"
        f"GL account: {state['classification'].get('gl_account')}\n"
        f"Invoice ID: `{state['invoice_id']}`{flags_txt}"
    )
    blocks = [
        {"type": "section", "text": {"type": "mrkdwn", "text": text}},
        {
            "type": "actions",
            "block_id": f"invoice::{state['invoice_id']}",
            "elements": [
                {"type": "button", "text": {"type": "plain_text", "text": "Approve"},
                 "style": "primary", "value": f"approve::{state['invoice_id']}"},
                {"type": "button", "text": {"type": "plain_text", "text": "Reject"},
                 "style": "danger", "value": f"reject::{state['invoice_id']}"},
            ],
        },
    ]
    try:
        resp = client.chat_postMessage(channel=s.approval_slack_channel, blocks=blocks, text=text)
        return {**state, "approval_message_ts": resp["ts"]}
    except SlackApiError as exc:
        return {**state, "approval_message_ts": f"slack-failed:{exc.response.get('error', 'unknown')}"}


def post_to_quickbooks(state: InvoiceState) -> InvoiceState:
    """Write the invoice to QuickBooks. Only called if approved or under threshold."""
    if state.get("error") or state.get("approval_status") == "rejected":
        return state

    # Placeholder — integrate python-quickbooks client here.
    # In this scaffold we simulate success.
    txn_id = f"QB-{state['invoice_id']}"
    return {**state, "quickbooks_txn_id": txn_id}


def notify_rejected(state: InvoiceState) -> InvoiceState:
    """Log rejection for audit trail."""
    from slack_sdk import WebClient
    s = get_settings()
    if s.slack_bot_token:
        WebClient(token=s.slack_bot_token).chat_postMessage(
            channel=s.approval_slack_channel,
            text=f"Invoice `{state['invoice_id']}` rejected by {state.get('approver', 'unknown')}.",
        )
    return state
