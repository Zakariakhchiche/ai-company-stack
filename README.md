# AI Company — Profile B implementation

Stack d'automatisation d'entreprise de bout en bout combinant :

- **Paperclip** — orchestration, org chart, budgets, gouvernance (Node.js)
- **OpenClaw** — runtime d'agents opérationnels avec accès CRM/email/Slack
- **CrewAI** — crews multi-agents spécialisées (ventes, support, marketing)
- **LangGraph** — workflows critiques avec HITL (finance, contrats)
- **LangSmith** — observabilité, traces, coûts
- **PostgreSQL + Redis** — persistance et cache
- **Ollama Cloud** — provider LLM unique (OpenAI-compatible, abonnement fixe)

## Sommaire
1. [Pré-requis](#1-pré-requis)
2. [Installation](#2-installation)
3. [Configuration des secrets](#3-configuration-des-secrets)
4. [Lancement](#4-lancement)
5. [Roadmap 90 jours](#5-roadmap-90-jours)
6. [Architecture](#6-architecture)
7. [Sécurité & conformité](#7-sécurité--conformité)
8. [Coûts estimés](#8-coûts-estimés)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Pré-requis

| Outil | Version min | Statut | Installation |
|---|---|---|---|
| Node.js | 20 | ✅ v24.13.1 détecté | — |
| pnpm | 9.15 | ❌ à installer | `corepack enable && corepack prepare pnpm@latest --activate` |
| Python | 3.12 | ✅ 3.13.1 détecté | — |
| Docker Desktop | 24+ | ❌ à installer | https://www.docker.com/products/docker-desktop/ |
| Git | 2.40+ | ✅ 2.53 | — |
| WSL2 (Windows) | recommandé | ✅ Ubuntu | `wsl --install` déjà fait |

**Recommandation forte** : travailler dans WSL2 Ubuntu, pas en Windows natif, pour les perfs Node/Docker/Postgres.

## 2. Installation

```bash
# Depuis WSL2 Ubuntu, dossier du projet
cd /mnt/c/Users/zkhch/Documents/papper_test

# Installer pnpm et les deps Python (crée venvs locaux)
make install

# Rendre exécutables les scripts
chmod +x scripts/*.sh
```

## 3. Configuration des secrets

```bash
cp .env.example .env
```

Éditer `.env` et remplir **au minimum** pour le démarrage :

| Variable | Pourquoi | Où la créer |
|---|---|---|
| `OLLAMA_API_KEY` | LLM principal (Ollama Cloud) | ollama.com → account settings |
| `POSTGRES_PASSWORD` | mot de passe fort aléatoire | — |
| `REDIS_PASSWORD` | idem | — |
| `LANGSMITH_API_KEY` | observabilité | smith.langchain.com |
| `HUBSPOT_ACCESS_TOKEN` | CRM | app.hubspot.com → Private Apps |
| `SLACK_BOT_TOKEN` | notifs + approvals | api.slack.com/apps |

Les autres (Stripe, QuickBooks, Zendesk, Gmail) peuvent être ajoutés au fil de l'activation des workflows correspondants.

## 4. Lancement

### 4.1 Infrastructure d'abord

```bash
make up
# ↳ démarre postgres, redis, pgadmin en background
make health
# ↳ vérifie que tout est up
```

Accès :
- **pgAdmin** : http://localhost:5050 (email `PGADMIN_EMAIL`, mdp `PGADMIN_PASSWORD`)
- **Postgres** : localhost:5432 (user `aic`, databases `paperclip`/`langgraph`/`crewai`)
- **Redis** : localhost:6379

### 4.2 LangGraph + CrewAI (conteneurs applicatifs)

```bash
make up-all
# ↳ ajoute langgraph-api (8123) et crewai-api (8200)
```

Test :
```bash
curl http://localhost:8123/ok
curl http://localhost:8200/health
```

### 4.3 Paperclip (orchestrateur racine)

Paperclip tourne en process Node séparé (pas en Docker, car il orchestre tout le reste).

```bash
make paperclip
# ↳ npx paperclipai@latest onboard --yes
```

Au premier lancement, Paperclip va :
1. Scanner `./paperclip/*.md` et `./paperclip/agents/*.yaml`
2. Créer la base `paperclip` dans Postgres
3. Démarrer le dashboard sur http://localhost:3100
4. Activer les heartbeats selon `HEARTBEAT.md`

### 4.4 Tests de bout-en-bout

**Workflow vente (CrewAI)** :
```bash
curl -X POST http://localhost:8200/crews/sales/run \
  -H "Content-Type: application/json" \
  -d '{"lead_id":"12345","lead_email":"test@example.com"}'
```

**Workflow finance (LangGraph + HITL)** :
```bash
# Lance l'approbation
curl -X POST http://localhost:8123/graphs/finance/run \
  -H "Content-Type: application/json" \
  -d '{"invoice_id":"INV-001","source":"upload","file_path":"/tmp/invoice.pdf"}'
# ↳ retourne thread_id, s'interrompt sur HITL, poste dans Slack

# Reprendre après approbation humaine
curl -X POST http://localhost:8123/graphs/finance/resume \
  -H "Content-Type: application/json" \
  -d '{"thread_id":"inv-INV-001-xxx","decision":{"status":"approved","approver":"founder@x.com"}}'
```

## 5. Roadmap 90 jours

### Semaines 1-2 : Socle
- [x] Scaffolding complet (ce repo)
- [ ] Secrets remplis dans `.env`
- [ ] Infra Docker up et healthy
- [ ] Paperclip dashboard accessible
- [ ] 1 agent CEO qui produit un rapport quotidien dans Slack

### Semaines 3-4 : Ventes
- [ ] HubSpot connecté (Private App + scopes)
- [ ] `sales_crew` déployé, traite 1 lead test bout-en-bout
- [ ] SDR envoie drafts HITL dans `#sales-approvals`
- [ ] Sales Director produit pipeline report hebdo

### Semaines 5-6 : Support
- [ ] Zendesk connecté
- [ ] `triage` OpenClaw classe les tickets < 30s
- [ ] `support_crew` draft HITL opérationnel
- [ ] SLA dashboard LangSmith

### Semaines 7-8 : Marketing
- [ ] Notion + Buffer connectés
- [ ] `marketing_crew` produit 1 article/semaine en draft
- [ ] Brand voice guide finalisé
- [ ] Calendrier éditorial automatisé

### Semaines 9-12 : Finance + consolidation
- [ ] Stripe + QuickBooks connectés
- [ ] `finance_approval` graph traite les factures entrantes
- [ ] Contract review graph testé sur 5 contrats réels
- [ ] Audit log Postgres consulté hebdo
- [ ] Budgets Paperclip calibrés sur données réelles
- [ ] KPI board : automation rate, cost-per-action, error rate

## 6. Architecture

```
             ┌────────────────────────────────────────────┐
             │         Paperclip (port 3100)              │
             │   org chart • budgets • audit • HITL       │
             └───┬─────────────┬──────────────┬──────────┘
                 │ delegate    │ delegate     │ delegate
          ┌──────▼────┐ ┌──────▼─────┐ ┌──────▼──────┐
          │ OpenClaw  │ │  CrewAI    │ │  LangGraph  │
          │  :8300    │ │  :8200     │ │  :8123      │
          │ triage,   │ │ sales,     │ │ finance,    │
          │ content   │ │ support,   │ │ contracts   │
          │           │ │ marketing  │ │             │
          └─────┬─────┘ └─────┬──────┘ └──────┬──────┘
                │             │                │
                └──────┬──────┴────────┬───────┘
                       │               │
              ┌────────▼─────┐  ┌──────▼──────┐
              │  Postgres    │  │   Redis     │
              │  :5432       │  │   :6379     │
              │  3 databases │  │   cache +   │
              │              │  │  pub/sub    │
              └──────────────┘  └─────────────┘

    Integrations: HubSpot • Salesforce • Zendesk • Slack • Gmail
                  Notion • Stripe • QuickBooks • GA4 • LinkedIn
    Observability: LangSmith (traces) + Datadog (infra, optionnel)
```

## 7. Sécurité & conformité

- **Données au repos** : chiffrement Postgres (activer `pgcrypto` pour champs sensibles).
- **Données en transit** : TLS obligatoire sur toutes les intégrations externes.
- **RBAC** : Paperclip audit log + Slack approval gates pour toute action irréversible.
- **Secrets** : jamais en clair dans le repo ; utiliser Doppler, 1Password CLI, ou AWS Secrets Manager en prod.
- **RGPD** : tous les LLM via endpoints EU (Anthropic EU, AWS Bedrock `eu-west-3`, Azure `francecentral`) si données PII.
- **Audit** : rétention Postgres 12 mois minimum sur table `audit_log`.
- **Prompt injection** : les agents avec accès Gmail/Slack doivent tourner dans un contexte sandboxé ; désactiver l'exécution de code dans les messages entrants.

## 8. Coûts estimés (PME ~20 employés, ~1000 tickets/mois, ~500 leads/mois)

| Poste | Mensuel |
|---|---|
| Ollama Cloud — plan Max (couvre TOUS les agents) | €92 (≈$100) |
| LangSmith Plus (2 devs) | €72 |
| Infra VPS (8 vCPU / 16 GB) ou Fly.io | €80 – €150 |
| Datadog (optionnel) | €150 – €400 |
| Intégrations SaaS additionnelles | variable |
| **Total** | **€250 – €720** |

Énorme avantage du passage à Ollama Cloud : le LLM devient un coût fixe, pas proportionnel à l'usage. Un seul abonnement Max ($100/mo) sert l'ensemble des 8 agents.

**Limites du plan Max** (vérifier sur ollama.com/pricing) : quotas par session 5h et par semaine. Si vos volumes dépassent, passer en self-hosted Ollama sur GPU H100 (~€1,500/mois AWS ou €8k one-shot achat) ou panacher avec un autre provider.

Objectif ROI : substituer 1-2 ETP (coût chargé ~€4,000-€6,000/mois chacun).

## 9. Troubleshooting

**Paperclip ne démarre pas** → vérifier que PostgreSQL est up et que `PAPERCLIP_DATABASE_URL` pointe bien vers la base `paperclip` (pas `postgres`).

**CrewAI "database is locked"** → bug connu avec LanceDB sous charge concurrente. Solution : passer la config `memory` à backend Postgres via `embedder={"provider":"openai","config":{...}}` et `external_memory`.

**LangGraph HITL ne reprend pas** → le `thread_id` est obligatoire pour retrouver le checkpoint ; vérifier que le `PostgresSaver.setup()` a bien créé les tables `checkpoints` / `writes`.

**OpenClaw prompt injection** → audit log régulier sur les messages entrants depuis Slack/Gmail ; ne jamais donner accès à `gmail.send.external` sans HITL.

**Coûts qui explosent** → vérifier Paperclip dashboard `/metrics` par agent ; activer le `cache=True` dans les Crews ; réduire le modèle à Haiku pour les agents à faible enjeu.

---

## Fichiers clés

```
.
├── docker-compose.yml              # Postgres + Redis + pgAdmin + apps
├── .env.example                    # toutes les variables à remplir
├── Makefile                        # commandes unifiées
├── paperclip/
│   ├── SOUL.md                     # mission et valeurs
│   ├── AGENTS.md                   # org chart
│   ├── HEARTBEAT.md                # plannings
│   ├── TOOLS.md                    # intégrations autorisées
│   ├── budgets.yaml                # plafonds mensuels
│   └── agents/*.yaml               # 1 fichier par agent
├── openclaw/
│   ├── config.yaml                 # runtime OpenClaw
│   └── skills/*.md                 # triage, draft, content, social
├── crews/                          # FastAPI + CrewAI
│   ├── server.py                   # endpoints HTTP
│   ├── sales_crew/                 # researcher + qualifier + writer
│   ├── support_crew/               # classifier + kb + drafter
│   └── marketing_crew/             # strategist + writer + editor
├── langgraph_flows/                # FastAPI + LangGraph
│   ├── server.py                   # endpoints + resume HITL
│   ├── finance_approval/           # invoice OCR + gate + QuickBooks
│   └── contract_review/            # clauses + risk + redlines + HITL
├── observability/
│   ├── langsmith.md                # setup LangSmith
│   └── datadog.md                  # setup Datadog
└── scripts/
    ├── init-multi-db.sh            # bootstrap 3 bases Postgres
    └── health-check.sh             # smoke test
```

## Prochaines étapes suggérées

1. Installer Docker Desktop dans WSL2, lancer `make up`, vérifier `make health`.
2. Créer les comptes Anthropic + LangSmith + HubSpot, remplir `.env`.
3. Lancer Paperclip (`make paperclip`) et valider que le dashboard s'ouvre.
4. Exécuter un test sales crew sur un vrai lead HubSpot de test.
5. Ajouter les autres intégrations (Zendesk, Stripe, etc.) selon la roadmap.
