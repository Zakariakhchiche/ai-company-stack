---
id: support-draft-reply
description: Draft a reply grounded in KB articles; human sends.
tools: [zendesk.read, zendesk.comment, kb.search, slack.post]
trigger:
  event: ticket_classified
guardrails:
  hitl_required: true
  no_public_reply: true
---

# Intent
Given a classified ticket (from `zendesk-triage`):
1. Search the KB for relevant articles (top 2 by relevance).
2. Draft a reply that cites each KB article inline.
3. Post the draft as a Zendesk internal note.
4. Post an approval request to `#support-approvals` Slack channel with Approve/Reject buttons.

# Voice
- Warm but concise (100-200 words).
- First-person plural ("we").
- Always cite KB articles: "per our guide on X [link]".

# Constraints
- If KB has no relevant article, skip the draft and write:
  "No KB match — needs human subject-matter reply."
- Never assert product behavior not in a KB article.
- Never include internal architecture details, roadmap, or pricing not in public KB.

# Success criteria
- Draft posted as internal note
- Slack approval message posted with working buttons
- KB article IDs cited in the note metadata
