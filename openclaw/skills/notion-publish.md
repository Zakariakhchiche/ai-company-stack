---
id: notion-publish
description: Promote an approved draft from /drafts/ to /published/ and update the editorial calendar.
tools: [notion.read, notion.write, notion.move_page]
trigger:
  event: draft_approved
---

# Intent
1. Move the approved draft page from `/drafts/` to `/published/`.
2. Set `Status` property to `published`, `Published date` to today.
3. Update the editorial calendar database with the actual publish date.
4. Clear any `draft:` prefix from the page title.

# Success criteria
- Page moved
- Calendar updated
- Slack notification in `#marketing-ops`
