# TOOLS — Available integrations

## Read-only (no approval needed)
| Tool | Scopes | Used by |
|---|---|---|
| `hubspot.read` | contacts, deals, companies | sales-dir, sdr, ceo |
| `zendesk.read` | tickets, users | support-lead, triage |
| `ga4.read` | analytics | marketing-lead, ceo |
| `stripe.read` | charges, invoices | finance, ceo |
| `quickbooks.read` | accounts, transactions | finance |
| `slack.read` | channel history | all |
| `gmail.read` | threads, messages | all |

## Write — soft (logged, reversible)
| Tool | Scopes | Used by | Guard |
|---|---|---|---|
| `hubspot.write` | notes, tasks, contact props | sales-dir, sdr | rate-limit 50/h |
| `zendesk.comment` | internal note | triage | — |
| `slack.post` | channel messages | all | no external channels |
| `notion.write` | pages, databases | marketing-lead, content | — |

## Write — hard (HITL required)
| Tool | Action | Approver |
|---|---|---|
| `gmail.send.external` | email to non-staff domain | support-lead or marketing-lead |
| `stripe.refund` | any amount | finance + founder |
| `quickbooks.write` | new transaction > €500 | finance + founder |
| `docusign.send` | contract dispatch | founder |
| `linkedin.post` | public post | marketing-lead + founder |
| `twitter.post` | public post | marketing-lead + founder |

## Blocked (never, by policy)
- Any tool accessing HR personal data
- Production database write outside the `app_*` schemas
- Cloud infra provisioning (AWS / GCP APIs)
- Password / secret management APIs
