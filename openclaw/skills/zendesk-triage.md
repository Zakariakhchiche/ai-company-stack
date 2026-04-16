---
id: zendesk-triage
description: Classify inbound Zendesk tickets and set tags/priority.
tools: [zendesk.read, zendesk.tag, zendesk.set_priority]
trigger:
  webhook: zendesk.ticket.created
guardrails:
  no_public_reply: true
---

# Intent
On a new Zendesk ticket, classify it into one of:
- `billing`, `bug`, `how-to`, `churn-risk`, `spam`

Set the matching tag and adjust priority:
- `billing` → priority `normal`
- `bug` with severity keywords → priority `high`
- `churn-risk` → priority `urgent`, notify `#support-escalations`
- `spam` → tag `spam`, close ticket

# Constraints
- NEVER post a public reply.
- If confidence < 0.7, leave priority untouched and add an internal note
  `needs human triage — confidence X`.
- Always add an internal note with the classification reasoning.

# Success criteria
- `zendesk.tag` called with correct category
- `zendesk.set_priority` called if confidence >= 0.7
- Internal note created with reasoning
