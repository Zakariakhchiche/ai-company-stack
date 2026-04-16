"""FastAPI server exposing LangGraph flows + HITL resume endpoint."""
import os
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from settings import get_settings
from finance_approval import build_graph as build_finance_graph
from contract_review import build_graph as build_contract_graph

settings = get_settings()
if settings.langsmith_tracing and settings.langsmith_api_key:
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = settings.langsmith_api_key
    os.environ["LANGCHAIN_PROJECT"] = settings.langsmith_project

app = FastAPI(title="LangGraph Critical Flows", version="0.1.0")

finance_graph = build_finance_graph()
contract_graph = build_contract_graph()


class InvoiceRunRequest(BaseModel):
    invoice_id: str
    source: str
    file_path: str | None = None


class ContractRunRequest(BaseModel):
    contract_id: str
    contract_text: str


class ResumeRequest(BaseModel):
    thread_id: str
    decision: dict[str, Any]  # e.g. {"status": "approved", "approver": "founder@x.com"}


@app.get("/ok")
def health():
    return {"status": "ok"}


@app.post("/graphs/finance/run")
def run_finance(req: InvoiceRunRequest):
    thread_id = f"inv-{req.invoice_id}-{uuid4().hex[:8]}"
    config = {"configurable": {"thread_id": thread_id}}
    try:
        result = finance_graph.invoke(req.model_dump(), config)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return {"thread_id": thread_id, "state": result}


@app.post("/graphs/contract/run")
def run_contract(req: ContractRunRequest):
    thread_id = f"ctr-{req.contract_id}-{uuid4().hex[:8]}"
    config = {"configurable": {"thread_id": thread_id}}
    try:
        result = contract_graph.invoke(req.model_dump(), config)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return {"thread_id": thread_id, "state": result}


@app.post("/graphs/finance/resume")
def resume_finance(req: ResumeRequest):
    from langgraph.types import Command
    config = {"configurable": {"thread_id": req.thread_id}}
    result = finance_graph.invoke(Command(resume=req.decision), config)
    return {"thread_id": req.thread_id, "state": result}


@app.post("/graphs/contract/resume")
def resume_contract(req: ResumeRequest):
    from langgraph.types import Command
    config = {"configurable": {"thread_id": req.thread_id}}
    result = contract_graph.invoke(Command(resume=req.decision), config)
    return {"thread_id": req.thread_id, "state": result}
