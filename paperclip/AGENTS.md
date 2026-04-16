# AGENTS — Org Chart

```
                       ┌──────────────────────┐
                       │         CEO          │  strategic direction, weekly review
                       │ deepseek-v3.1:671b   │  reasoning-heavy
                       └──────────┬───────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
┌───────▼──────────┐    ┌─────────▼─────────┐    ┌──────────▼─────────┐
│  Sales Director  │    │  Support Lead     │    │ Marketing Lead     │
│  gpt-oss:120b    │    │  gpt-oss:120b    │    │  gpt-oss:120b     │
└───────┬──────────┘    └─────────┬─────────┘    └──────────┬─────────┘
        │                         │                         │
  ┌─────┴──────┐            ┌─────┴──────┐            ┌─────┴──────┐
  │ SDR Agent  │            │  Triage    │            │  Content   │
  │ gpt-oss:20b│            │ gpt-oss:20b│            │gpt-oss:120b│
  │  CrewAI    │            │  OpenClaw  │            │  OpenClaw  │
  └────────────┘            └────────────┘            └────────────┘

                       ┌──────────────────────┐
                       │   Finance Officer    │  SOLO — reports to CEO
                       │  gpt-oss:120b-cloud  │  ALL actions HITL-gated
                       │     LangGraph        │
                       └──────────────────────┘
```

## Provider: Ollama Cloud

One subscription covers the entire company:
- **Free** — enough to test, not prod
- **Pro $20/mo** — suits small teams, ~20k short reqs/week
- **Max $100/mo** — suits the full 8-agent stack described here

All budgets below are **internal request caps**, not billing. They catch
runaway loops and enforce priorities, not spend.

## Agent roster

| ID | Role | Model | Runtime | Req/month | Reports to |
|---|---|---|---|---|---|
| `ceo` | CEO | deepseek-v3.1:671b-cloud | Paperclip | 500 | Founder |
| `sales-dir` | Sales Director | gpt-oss:120b-cloud | Paperclip | 3,000 | CEO |
| `sdr` | SDR / prospection | gpt-oss:20b-cloud | CrewAI | 15,000 | sales-dir |
| `support-lead` | Support Lead | gpt-oss:120b-cloud | Paperclip | 2,000 | CEO |
| `triage` | Ticket triage | gpt-oss:20b-cloud | OpenClaw | 20,000 | support-lead |
| `marketing-lead` | Marketing Lead | gpt-oss:120b-cloud | Paperclip | 1,500 | CEO |
| `content` | Content writer | gpt-oss:120b-cloud | OpenClaw | 2,000 | marketing-lead |
| `finance` | Finance Officer | gpt-oss:120b-cloud | LangGraph | 1,500 | CEO |

## Reporting lines
- Weekly: each director posts a KPI summary to `#leadership` Slack channel.
- Daily: heartbeats log `tasks_done`, `tickets_open`, `requests_to_date`.
- On event: @-mention triggers agent activation (incoming lead, ticket, invoice).

## Escalation rules
1. Agent exceeds 80% monthly request cap → warning to director.
2. Agent exceeds 100% cap → halt + CEO notification.
3. Three consecutive errors on same task → human review queue.
4. Any action above approval threshold (see SOUL.md) → HITL gate.
5. Ollama Cloud 429 rate limit hit → back off 60s, alert `#ai-ops`.

## Why this model mapping
- **deepseek-v3.1:671b** for CEO — highest reasoning, weekly strategic use, low volume.
- **gpt-oss:120b** for directors + writer + finance — strong general-purpose, moderate cost.
- **gpt-oss:20b** for triage and SDR enrichment — fast, cheap, high-volume.
- **qwen3-coder:480b** is reserved for any future coding-agent addition (not wired in v1).
