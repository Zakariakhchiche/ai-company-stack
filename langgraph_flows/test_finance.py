"""End-to-end smoke test for finance_approval graph.

Feeds a dummy invoice (under threshold, clean) through extract -> classify -> gate.
The file_path field carries the raw invoice text so extract_invoice has real
content to work with (no actual OCR in this scaffold).
"""
from dotenv import load_dotenv
load_dotenv("../.env")

from uuid import uuid4
from finance_approval import build_graph

INVOICE_TEXT = """
INVOICE #2026-0042
Vendor: Acme Coffee Supplies Ltd
Address: 10 Bean Street, Paris, France
Invoice date: 2026-04-10
Due date: 2026-05-10
VAT number: FR12345678901

Line items:
  - Arabica beans, 5 kg    @ €18.00/kg  = €90.00
  - Filters, 500 ct         @ €0.04     = €20.00
  - Delivery                            = €10.00

Subtotal:          €120.00
VAT (20%):         €24.00
Total due:         €144.00 EUR
""".strip()

graph = build_graph()

thread_id = f"test-{uuid4().hex[:8]}"
config = {"configurable": {"thread_id": thread_id}}

initial_state = {
    "invoice_id": "TEST-2026-0042",
    "source": "upload",
    "file_path": INVOICE_TEXT,
}

print(f"[test] thread_id = {thread_id}")
print(f"[test] invoking finance_approval graph...")

final_state = graph.invoke(initial_state, config)

print("\n=== Final state ===")
for key, value in final_state.items():
    if key == "file_path":
        value = "<invoice text omitted>"
    print(f"  {key}: {value}")

print("\n=== Result ===")
if final_state.get("error"):
    print(f"  ERROR: {final_state['error']}")
elif final_state.get("quickbooks_txn_id"):
    print(f"  Booked to QuickBooks as: {final_state['quickbooks_txn_id']}")
elif final_state.get("requires_approval"):
    print(f"  Paused for human approval (thread_id={thread_id})")
else:
    print(f"  Unexpected end state")
