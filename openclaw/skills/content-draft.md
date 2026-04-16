---
id: content-draft
description: Draft a blog article or LinkedIn post from a brief.
tools: [notion.read, notion.write, web.search, slack.request_approval]
trigger:
  event: brief_received
guardrails:
  hitl_required: true
---

# Intent
Input: `{brief, persona, keywords, channel}` where channel ∈ {blog, linkedin, twitter}.

1. Read the brand voice guide from Notion (`/brand/voice-guide`).
2. If channel=blog: 600-900 words, H1-H3 structure.
   If channel=linkedin: 150-250 words, one key insight.
   If channel=twitter: 280 chars max, one hook.
3. Every factual claim must cite a source (web.search result or Notion source).
4. Save the draft to Notion under `/drafts/`.
5. Request approval in `#marketing-approvals`.

# Voice rules
- No buzzwords (leverage, synergy, disrupt, unlock).
- No AI-isms ("delve", "tapestry", "crucial").
- Concrete examples over abstract claims.
- Never invent metrics, customer quotes, case studies.

# Success criteria
- Notion draft page created
- Slack approval message posted
- At least 3 external citations for factual claims (for blog) or 1 (for social)
