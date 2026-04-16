from crewai import Crew, Process
from .agents import researcher, qualifier, writer
from .tasks import build_tasks


class SalesCrew:
    """Qualify one inbound lead end-to-end: enrich -> score -> draft -> submit for approval."""

    def run(self, lead_id: str, lead_email: str) -> dict:
        crew = Crew(
            agents=[researcher, qualifier, writer],
            tasks=build_tasks(lead_id, lead_email),
            process=Process.sequential,
            verbose=True,
            memory=True,
            cache=True,
        )
        result = crew.kickoff()
        return {
            "lead_id": lead_id,
            "result": str(result),
            "usage": crew.usage_metrics,
        }
