"""Resume a paused finance_approval graph with an 'approved' decision.

Run `test_finance.py` first, note the thread_id it prints, then pass it here:
    python test_finance_resume.py test-d58563bb
"""
from dotenv import load_dotenv
load_dotenv("../.env")

import sys
from langgraph.types import Command
from finance_approval import build_graph


if len(sys.argv) < 2:
    print("Usage: python test_finance_resume.py <thread_id>")
    sys.exit(1)

thread_id = sys.argv[1]
config = {"configurable": {"thread_id": thread_id}}

graph = build_graph()

print(f"[resume] thread_id = {thread_id}")
print(f"[resume] sending APPROVED decision...")

final_state = graph.invoke(
    Command(resume={"status": "approved", "approver": "founder@test.local"}),
    config,
)

print("\n=== Final state after resume ===")
for key, value in final_state.items():
    if key == "file_path":
        value = "<invoice text omitted>"
    print(f"  {key}: {value}")
