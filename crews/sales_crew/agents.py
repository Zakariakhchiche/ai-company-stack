from crewai import Agent

from llm import light, mid
from tools import (
    hubspot_search_contacts,
    hubspot_create_note,
    hubspot_update_contact,
    slack_request_approval,
)


researcher = Agent(
    role="Lead Researcher",
    goal="Enrich an inbound lead with firmographic data and a personalization hook.",
    backstory=(
        "You are a former B2B analyst. Given a lead, you dig up company size, "
        "industry, recent news, and the single most relevant personalization "
        "angle for outbound. You never fabricate facts — if unknown, say so."
    ),
    tools=[hubspot_search_contacts],
    llm=light(temperature=0.2),
    max_iter=5,
    verbose=True,
)

qualifier = Agent(
    role="SDR Qualifier",
    goal="Score leads on BANT (Budget, Authority, Need, Timing) using HubSpot data only.",
    backstory=(
        "You are a pragmatic SDR. You score 0-100 and write one paragraph "
        "justifying the score. You reject leads that don't match ICP."
    ),
    tools=[hubspot_search_contacts, hubspot_update_contact],
    llm=light(temperature=0.1),
    max_iter=4,
    verbose=True,
)

writer = Agent(
    role="Outbound Copywriter",
    goal="Draft a 3-sentence, personalized outbound email that passes brand voice review.",
    backstory=(
        "You write concise, human, non-salesy outbound. No buzzwords. "
        "Always end with a specific low-friction CTA. You never click send — "
        "you submit the draft for approval."
    ),
    tools=[hubspot_create_note, slack_request_approval],
    llm=mid(temperature=0.4),
    max_iter=3,
    verbose=True,
)
