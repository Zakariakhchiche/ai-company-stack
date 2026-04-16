# HEARTBEAT — Scheduled agent activations

All times in Europe/Paris.

## CEO
- **Daily 09:00** — review yesterday's KPIs (tickets closed, leads in, spend), post summary to `#leadership`.
- **Weekly Mon 08:00** — strategic review: goals vs actuals, reallocate budget if needed.
- **Monthly 1st 07:00** — budget close, generate board report PDF to `/reports/`.

## Sales Director
- **Daily 08:30** — pull new leads from HubSpot, assign to SDR, check stale opportunities.
- **Every 4h** — review SDR outputs, approve outreach drafts above confidence threshold.
- **Weekly Fri 17:00** — pipeline report to CEO.

## SDR (CrewAI)
- **Event-driven**: fires on `hubspot.contact.created` webhook.
- **Every 2h** — process `leads_to_qualify` queue.

## Support Lead
- **Every 2h** — review triage decisions, re-route misclassified tickets.
- **Daily 18:00** — SLA compliance check, escalate breaches.

## Triage (OpenClaw)
- **Event-driven**: fires on `zendesk.ticket.created`, `slack.message.#support`.

## Marketing Lead
- **Daily 10:00** — content calendar check, brief Content Writer on next piece.
- **Weekly Tue 14:00** — campaign performance review (GA4, LinkedIn analytics).

## Content Writer (OpenClaw)
- **On brief received** — draft article/post, submit for HITL approval before publish.

## Finance Officer (LangGraph)
- **Daily 07:00** — reconcile Stripe + QuickBooks, flag anomalies.
- **On invoice received** — OCR + categorization + HITL if > threshold.
- **Weekly Mon 09:00** — cash position report.

## Global
- **Every 15min** — health check ping to `/ops/heartbeat`. Missing 3 consecutive → PagerDuty.
