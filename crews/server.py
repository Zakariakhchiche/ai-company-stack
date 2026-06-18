"""FastAPI server exposing crews as HTTP endpoints for Paperclip to delegate to."""
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from admin import router as admin_router
from settings import get_settings
from sales_crew import SalesCrew
from support_crew import SupportCrew
from marketing_crew import MarketingCrew

# Enable LangSmith tracing if configured
settings = get_settings()
if settings.langsmith_tracing and settings.langsmith_api_key:
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = settings.langsmith_api_key
    os.environ["LANGCHAIN_PROJECT"] = settings.langsmith_project

app = FastAPI(title="CrewAI API", version="0.1.0")
app.include_router(admin_router)


class SalesRunRequest(BaseModel):
    lead_id: str
    lead_email: str


class SupportRunRequest(BaseModel):
    ticket_id: str
    ticket_body: str


class MarketingRunRequest(BaseModel):
    brief: str
    persona: str
    keywords: list[str]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/crews/sales/run")
def run_sales(req: SalesRunRequest):
    try:
        return SalesCrew().run(req.lead_id, req.lead_email)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/crews/support/run")
def run_support(req: SupportRunRequest):
    try:
        return SupportCrew().run(req.ticket_id, req.ticket_body)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/crews/marketing/run")
def run_marketing(req: MarketingRunRequest):
    try:
        return MarketingCrew().run(req.brief, req.persona, req.keywords)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
