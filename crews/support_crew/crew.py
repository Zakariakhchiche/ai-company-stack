"""Support crew: classify ticket, retrieve KB answer, draft reply for human send.

Never sends a public reply autonomously. Drafts are posted to Zendesk as
internal notes and Slack for a human to validate and send.
"""
from __future__ import annotations

from crewai import Agent, Crew, Process, Task

from llm import light, mid
from tools import slack_request_approval


classifier = Agent(
    role="Ticket Classifier",
    goal="Classify tickets into {billing, bug, how-to, churn-risk, spam} with confidence.",
    backstory="Former T1 support agent. You classify only — never answer.",
    llm=light(temperature=0.1),
    max_iter=2,
    verbose=False,
)

kb_researcher = Agent(
    role="KB Researcher",
    goal="Find the best 1-2 articles in the knowledge base that answer the ticket.",
    backstory="You search the KB and return citations with confidence scores.",
    llm=light(temperature=0.1),
    max_iter=3,
    verbose=False,
)

drafter = Agent(
    role="Reply Drafter",
    goal="Draft a reply grounded in KB citations. Never invent product behavior.",
    backstory=(
        "You write warm, concise replies. Every factual claim must cite a KB "
        "article. If the KB has no answer, you say so and escalate."
    ),
    tools=[slack_request_approval],
    llm=mid(temperature=0.3),
    max_iter=3,
    verbose=False,
)


class SupportCrew:
    def run(self, ticket_id: str, ticket_body: str) -> dict:
        classify = Task(
            description=f"Classify Zendesk ticket {ticket_id}: {ticket_body}",
            expected_output="JSON {category, confidence_0_1, reasoning}",
            agent=classifier,
        )
        research = Task(
            description="Find 1-2 KB articles relevant to the classified category and ticket content.",
            expected_output="JSON list of {article_id, title, url, relevance_0_1}",
            agent=kb_researcher,
            context=[classify],
        )
        draft = Task(
            description=(
                "Draft a reply citing the KB articles. Post to Slack #support-approvals "
                "with an Approve/Reject button. Never call zendesk.public_reply."
            ),
            expected_output="Slack approval ts + draft text",
            agent=drafter,
            context=[classify, research],
        )
        crew = Crew(
            agents=[classifier, kb_researcher, drafter],
            tasks=[classify, research, draft],
            process=Process.sequential,
            memory=True,
            cache=True,
        )
        result = crew.kickoff()
        return {"ticket_id": ticket_id, "result": str(result), "usage": crew.usage_metrics}
