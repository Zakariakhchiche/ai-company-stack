---
id: social-schedule
description: Schedule approved social posts to LinkedIn/Twitter via Buffer.
tools: [buffer.schedule, notion.read, slack.post]
trigger:
  event: draft_approved
guardrails:
  hitl_required: false   # approval already happened in content-draft
---

# Intent
Input: approved draft from Notion.

1. Read the approved draft + any images from Notion.
2. Schedule to the appropriate channel via Buffer.
3. Post confirmation to `#marketing-ops` with the scheduled time and Buffer URL.

# Constraints
- Maximum 2 scheduled posts per channel per day.
- Scheduling windows (Europe/Paris):
  - LinkedIn: Tue/Wed/Thu 08:30, 12:00, 17:30
  - Twitter: daily 09:00, 14:00, 19:00
- Never schedule on the same day as a product incident (check `#incidents` topic).

# Success criteria
- Post scheduled in Buffer
- Confirmation message in `#marketing-ops`
