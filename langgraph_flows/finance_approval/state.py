from typing import Literal, TypedDict, NotRequired


class InvoiceState(TypedDict):
    invoice_id: str
    source: Literal["email", "upload", "stripe", "quickbooks"]
    file_path: NotRequired[str]

    extracted: NotRequired[dict]          # OCR output: vendor, amount, currency, date, line_items
    classification: NotRequired[dict]     # GL account, cost center, tax treatment
    anomaly_flags: NotRequired[list[str]]

    requires_approval: NotRequired[bool]
    approval_status: NotRequired[Literal["pending", "approved", "rejected", "auto"]]
    approval_message_ts: NotRequired[str]
    approver: NotRequired[str]

    quickbooks_txn_id: NotRequired[str]
    error: NotRequired[str]
