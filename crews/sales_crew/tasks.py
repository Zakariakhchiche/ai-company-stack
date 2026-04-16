from crewai import Task
from .agents import researcher, qualifier, writer


def build_tasks(lead_id: str, lead_email: str) -> list[Task]:
    research = Task(
        description=(
            f"Look up HubSpot contact {lead_id} (email: {lead_email}). "
            "Return JSON with: company, industry, employee_count, recent_trigger_event, "
            "personalization_hook. If any field is unknown, use null — do not invent."
        ),
        expected_output="JSON object with the 5 fields listed.",
        agent=researcher,
    )

    qualify = Task(
        description=(
            "Using the research JSON, apply BANT scoring (0-100) against our ICP: "
            "B2B SaaS, 20-500 employees, EU/US/CA, decision-maker role. "
            "Update the HubSpot contact property `lead_score` with the integer score "
            "and `lead_score_reason` with a one-paragraph justification."
        ),
        expected_output="Score integer + one-paragraph justification string.",
        agent=qualifier,
        context=[research],
    )

    draft = Task(
        description=(
            "If the lead score is >= 60, draft a 3-sentence personalized outbound email. "
            "Attach the draft as a HubSpot note on the contact. "
            "Post an approval request to #sales-approvals with the draft inline. "
            "If score < 60, create a note `Not ICP — filed` and skip the draft."
        ),
        expected_output="HubSpot note ID(s) + Slack approval message ts (or skip reason).",
        agent=writer,
        context=[research, qualify],
    )

    return [research, qualify, draft]
