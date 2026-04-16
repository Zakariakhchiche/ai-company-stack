"""Marketing crew: brief -> research -> draft -> HITL publish.

All public posts require founder approval via Slack.
"""
from __future__ import annotations

from crewai import Agent, Crew, Process, Task

from llm import mid
from tools import slack_request_approval, slack_post


strategist = Agent(
    role="Content Strategist",
    goal="Turn a brief into a structured outline (H1-H3, key claims, target persona, SEO terms).",
    backstory="10 years of B2B content strategy. You never ship fluff.",
    llm=mid(temperature=0.4),
    max_iter=3,
    verbose=False,
)

writer = Agent(
    role="Content Writer",
    goal="Write a 600-900 word article following the outline and brand voice guide.",
    backstory=(
        "You write like a subject-matter expert — clear, specific, examples-first. "
        "No buzzwords. No AI-isms. Every factual claim cites a source."
    ),
    llm=mid(temperature=0.5),
    max_iter=4,
    verbose=False,
)

editor = Agent(
    role="Editor",
    goal="Review the draft for brand voice, factuality, SEO, and flag issues.",
    backstory="Brutal editor. Rejects anything generic. Returns actionable edits.",
    tools=[slack_request_approval, slack_post],
    llm=mid(temperature=0.2),
    max_iter=3,
    verbose=False,
)


class MarketingCrew:
    def run(self, brief: str, persona: str, keywords: list[str]) -> dict:
        outline = Task(
            description=f"Brief: {brief}\nPersona: {persona}\nSEO keywords: {keywords}\nProduce an outline.",
            expected_output="Markdown outline with H1-H3, 5 key claims, target persona, SEO keyword placement.",
            agent=strategist,
        )
        draft = Task(
            description="Write the article per outline. 600-900 words. Cite every factual claim.",
            expected_output="Full markdown article with inline citations.",
            agent=writer,
            context=[outline],
        )
        review = Task(
            description=(
                "Review the draft. Post the final version to Slack #marketing-approvals with "
                "an Approve/Reject button. Include an editor's summary (what was fixed)."
            ),
            expected_output="Slack approval ts + final article + editor notes.",
            agent=editor,
            context=[outline, draft],
        )
        crew = Crew(
            agents=[strategist, writer, editor],
            tasks=[outline, draft, review],
            process=Process.sequential,
            memory=True,
        )
        result = crew.kickoff()
        return {"brief": brief, "result": str(result), "usage": crew.usage_metrics}
