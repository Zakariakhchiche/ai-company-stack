"""Shared tools used across crews. Each wraps a third-party SDK as a CrewAI tool."""
from __future__ import annotations

from crewai.tools import tool
from hubspot import HubSpot
from slack_sdk import WebClient

from settings import get_settings


def _hubspot() -> HubSpot:
    return HubSpot(access_token=get_settings().hubspot_access_token)


def _slack() -> WebClient:
    return WebClient(token=get_settings().slack_bot_token)


@tool("hubspot.search_contacts")
def hubspot_search_contacts(query: str, limit: int = 25) -> list[dict]:
    """Search HubSpot contacts by email, name, or company. Returns list of contact dicts."""
    api = _hubspot()
    result = api.crm.contacts.search_api.do_search(
        public_object_search_request={
            "query": query,
            "limit": limit,
            "properties": ["email", "firstname", "lastname", "company", "jobtitle", "lifecyclestage"],
        }
    )
    return [r.to_dict() for r in result.results]


@tool("hubspot.create_note")
def hubspot_create_note(contact_id: str, body: str) -> str:
    """Attach an internal note to a HubSpot contact. Returns note ID."""
    api = _hubspot()
    note = api.crm.objects.notes.basic_api.create(
        simple_public_object_input_for_create={
            "properties": {"hs_note_body": body, "hs_timestamp": "now"},
            "associations": [
                {"to": {"id": contact_id}, "types": [{"associationTypeId": 202}]}
            ],
        }
    )
    return note.id


@tool("hubspot.update_contact")
def hubspot_update_contact(contact_id: str, properties: dict) -> bool:
    """Update HubSpot contact properties. Returns True on success."""
    api = _hubspot()
    api.crm.contacts.basic_api.update(
        contact_id=contact_id,
        simple_public_object_input={"properties": properties},
    )
    return True


@tool("slack.post_message")
def slack_post(channel: str, text: str, thread_ts: str | None = None) -> str:
    """Post a message to a Slack channel. Returns message ts."""
    resp = _slack().chat_postMessage(channel=channel, text=text, thread_ts=thread_ts)
    return resp["ts"]


@tool("slack.request_approval")
def slack_request_approval(channel: str, summary: str, action_id: str) -> str:
    """Post an approval request with approve/reject buttons. Returns message ts."""
    blocks = [
        {"type": "section", "text": {"type": "mrkdwn", "text": f"*Approval required*\n{summary}"}},
        {
            "type": "actions",
            "block_id": action_id,
            "elements": [
                {"type": "button", "text": {"type": "plain_text", "text": "Approve"},
                 "style": "primary", "value": f"approve::{action_id}"},
                {"type": "button", "text": {"type": "plain_text", "text": "Reject"},
                 "style": "danger", "value": f"reject::{action_id}"},
            ],
        },
    ]
    resp = _slack().chat_postMessage(channel=channel, blocks=blocks, text=summary)
    return resp["ts"]
