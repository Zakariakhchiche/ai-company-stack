# Avancement — AI Company stack (Profil B)

Dernière mise à jour : 2026-04-17

---

## 1. État global

Le scaffold complet est livré, 4 services applicatifs tournent, l'onboarding Paperclip + un crew CrewAI + un graphe LangGraph ont été validés avec Ollama Cloud comme LLM unique. Un commit git initial est prêt, il manque l'authentification GitHub pour créer le dépôt distant et pousser.

---

## 2. Services actifs (processus en arrière-plan)

| Service | Port | Backend | Lancement | Statut |
|---|---|---|---|---|
| PostgreSQL 16 | 5432 | Docker `aic-postgres` | `docker compose up -d postgres` | ✅ healthy |
| Redis 7 | 6379 | Docker `aic-redis` | `docker compose up -d redis` | ✅ healthy |
| pgAdmin 4 | 5050 | Docker `aic-pgadmin` | `docker compose up -d pgadmin` | ✅ up |
| Paperclip | 3100 | Node 24 | `npx paperclipai@latest run --data-dir .paperclip-data` | ✅ running (DB paperclip, 71 tables) |
| CrewAI API | 8200 | uvicorn | `.venv/Scripts/python -m uvicorn server:app --port 8200` | ✅ running |
| LangGraph API | 8123 | uvicorn | `.venv/Scripts/python -m uvicorn server:app --port 8123` | ⚠️ lancé en arrière-plan, pas resmoke-testé |

**Pour tout arrêter proprement** avant la pause :

```bash
# PATH Docker si terminal neuf :
export PATH="/c/Program Files/Docker/Docker/resources/bin:$PATH"

# 1. Arrêter les conteneurs Docker
docker compose down

# 2. Tuer les processus Node/Python background (Paperclip, uvicorn)
#    Lister puis kill les PID correspondants
powershell -Command "Get-Process node,python -ErrorAction SilentlyContinue | Where-Object { \$_.Path -like '*papper_test*' -or \$_.CommandLine -like '*paperclipai*' } | Format-Table Id,ProcessName,Path"
```

Pour **tout relancer à la reprise** :

```bash
cd /c/Users/zkhch/Documents/papper_test
export PATH="/c/Program Files/Docker/Docker/resources/bin:/c/Users/zkhch/AppData/Local/pnpm:$PATH"

docker compose up -d postgres redis pgadmin              # infra
npx -y paperclipai@latest run --data-dir .paperclip-data &  # Paperclip
cd crews && .venv/Scripts/python.exe -m uvicorn server:app --port 8200 &
cd ../langgraph_flows && .venv/Scripts/python.exe -m uvicorn server:app --port 8123 &
```

---

## 3. Ce qui est fait ✅

### 3.1 Scaffolding (50+ fichiers)
- `docker-compose.yml` avec 5 services (postgres, redis, pgadmin, crewai-api, langgraph-api)
- `Makefile` avec commandes unifiées (`install`, `up`, `health`, `paperclip`, `crewai`, `langgraph`, `clean`)
- `.env.example` et `.env` avec tous les credentials (Ollama + Postgres + Redis + placeholders SaaS)
- `.gitignore` strict (cache, venvs, .paperclip-data, .env, tests locaux)
- `scripts/init-multi-db.sh` (bootstrap 3 bases Postgres)
- `scripts/health-check.sh` (smoke test)
- `scripts/paperclip-migrate.py` (contournement bug migration)

### 3.2 Paperclip (gouvernance)
- Identité : `paperclip/SOUL.md`, `AGENTS.md`, `HEARTBEAT.md`, `TOOLS.md`
- `paperclip/budgets.yaml` — budgets par agent en nombre de requêtes (pas $) car Ollama = subscription
- 5 YAML d'agents : `ceo`, `sales-dir`, `support-lead`, `marketing-lead`, `finance`
- Org chart complet (8 agents pré-définis, modèles Ollama mappés)

### 3.3 CrewAI
- `crews/server.py` (FastAPI, 3 endpoints : sales/support/marketing)
- `crews/llm.py` (factory `heavy/mid/light/code` via `crewai.LLM` + litellm)
- `crews/tools.py` (HubSpot + Slack)
- 3 crews : `sales_crew`, `support_crew`, `marketing_crew`
- `crews/run.py` (CLI local)
- Venv installé avec crewai 1.14.1 + litellm 1.83.8 + langchain-openai 1.1.14 + fastapi + hubspot-api-client

### 3.4 LangGraph
- `langgraph_flows/server.py` (FastAPI, 4 endpoints : run + resume pour finance et contract)
- `langgraph_flows/llm.py` (factory `heavy/mid/light` via ChatOpenAI + base_url Ollama)
- `langgraph_flows/checkpointer.py` (PostgresSaver avec pool)
- `finance_approval/` : graph OCR → classify → gate → HITL → QuickBooks (simulé)
- `contract_review/` : extract clauses → risk score → redline → HITL
- `langgraph_flows/test_finance.py` + `test_finance_resume.py` pour E2E
- `langgraph.json` pour `langgraph dev`

### 3.5 OpenClaw (config uniquement)
- `openclaw/config.yaml` (ports, modèles Ollama, guardrails)
- 5 skills Markdown : `zendesk-triage`, `support-draft-reply`, `content-draft`, `social-schedule`, `notion-publish`
- ⚠️ runtime pas encore démarré — à wire quand SaaS tokens disponibles

### 3.6 Documentation
- `README.md` complet (architecture, roadmap 90j, coûts, troubleshooting, pré-requis)
- `observability/langsmith.md` + `observability/datadog.md` (setup)

### 3.7 Migration Ollama Cloud (complète)
- Tous les `ChatAnthropic` remplacés par `ChatOpenAI(base_url=https://ollama.com/v1)` ou `crewai.LLM(openai/...)` avec litellm
- `.env` / `.env.example` : `OLLAMA_API_KEY` + `OLLAMA_BASE_URL` + 4 modèles mappés
- Paperclip YAML agents : models `deepseek-v3.1:671b-cloud`, `gpt-oss:120b-cloud`, `gpt-oss:20b-cloud`
- Budgets en monthly_cap_requests (pas $) — reflet du subscription-based pricing

### 3.8 Tests validés bout-en-bout
| Test | Statut | Évidence |
|---|---|---|
| Ping Ollama Cloud `gpt-oss:20b-cloud` | ✅ | Retour "Paris" (135 tokens) |
| Ping Ollama Cloud `gpt-oss:120b-cloud` | ✅ | Retour "Paris" (174 tokens) |
| LangGraph finance (invoice → OCR → classify → HITL) | ✅ | Extract correct, anomaly `missing_vat_number` flaggé |
| LangGraph finance resume (approved) | ✅ | `quickbooks_txn_id: QB-TEST-2026-0042` |
| Paperclip onboarding UI (via Chrome MCP) | ✅ | 7 screenshots dans `screenshots/` |
| Paperclip API `/api/health`, `/api/companies` | ✅ | Company AIC créée, issue AIC-1 |
| CrewAI marketing crew via HTTP POST | ✅ | 7 LLM calls, 22 444 tokens |
| Postgres 3 DBs isolées (paperclip, langgraph, crewai) | ✅ | `\l` listing |

### 3.9 Git
- `git init -b main` OK
- 62 fichiers stagés, 2513 insertions
- Commit `ad68ebb` : "Initial commit: AI Company stack — Profile B"
- Aucun secret committé (`.env`, `.paperclip-data`, `.venv`, `scripts/paperclip-migrate.py` exclus)
- ⏳ push distant bloqué sur `gh auth login`

---

## 4. Ce qu'il reste à faire ⏳

### 4.1 Action requise de votre côté (non-automatisable)

| # | Action | Où | Notes |
|---|---|---|---|
| 1 | **Authentifier `gh`** | Terminal → `gh auth login -h github.com -p https -w` | Ouvre le navigateur, colle un code à 8 chiffres |
| 2 | Créer clé **HubSpot** | app.hubspot.com → Settings → Integrations → Private Apps | Scopes : `crm.objects.contacts.read/write`, `crm.objects.deals.read/write`, `crm.objects.notes.write` |
| 3 | Créer bot **Slack** | api.slack.com/apps → Create New App → From scratch | Scopes : `chat:write`, `chat:write.public`, `channels:read` ; récupérer `xoxb-...` |
| 4 | Créer compte **LangSmith** | smith.langchain.com → Settings → API Keys | Créer projet `ai-company-prod` |
| 5 | (Optionnel) **Zendesk** | admin.zendesk.com → Apps → API | subdomain + email + token |
| 6 | (Optionnel) **Stripe** | dashboard.stripe.com → Developers → API keys | `sk_live_...` ou `sk_test_...` |
| 7 | (Optionnel) **QuickBooks** | developer.intuit.com → My Apps | client_id + refresh_token via OAuth |
| 8 | (Optionnel) **Gmail** | console.cloud.google.com → OAuth 2.0 | refresh_token via `gcloud auth application-default login` |

Toutes ces valeurs se collent dans `.env` (déjà en place avec commentaires pour chacune).

### 4.2 Une fois `gh` authentifié — je finis :

1. `gh repo create ai-company-stack --private --source=. --push` → crée le repo distant + push
2. Afficher l'URL du repo privé
3. Vérifier avec `gh repo view --web`

### 4.3 Une fois les tokens SaaS fournis — je peux :

1. **Test sales crew bout-en-bout** avec un vrai lead HubSpot (qualification BANT + draft email)
2. **Test support crew** avec un ticket Zendesk réel (classification + draft réponse)
3. **Wire OpenClaw runtime** (`openclaw --version` → 2026.2.9 détecté) : lancer le daemon, charger les 5 skills, tester `zendesk-triage` sur un ticket
4. **LangSmith observability** : activer `LANGSMITH_TRACING=true`, relancer un crew, vérifier traces
5. **Test finance réel** : facture PDF → OCR → approval Slack → QuickBooks
6. Configurer **Paperclip pour déléguer à CrewAI via HTTP** (remplacer l'adapter Claude Code Local qui crashe en EPIPE)

### 4.4 Bugs ouverts à surveiller

1. **Paperclip adapter Claude Code Local** crashe tout le serveur en EPIPE quand le CLI enfant ferme son stdin trop tôt. Contournement : éviter cet adapter ; préférer une délégation HTTP vers CrewAI. Issue amont à reporter à paperclipai.
2. **Paperclip bug `inspectMigrations`** : plante avec `tableCount:4` quand `DATABASE_URL` env pointe vers une autre DB que celle de `connectionString` dans `config.json`. Contournement actif : DATABASE_URL de `.env` pointe désormais sur la base `paperclip` ; LangGraph utilise `LANGGRAPH_DATABASE_URL`.

### 4.5 Nice-to-have (pas urgent)

- Conteneuriser LangGraph + CrewAI via `docker compose up crewai-api langgraph-api` (Dockerfiles déjà écrits, il suffit de lancer `docker compose up -d` quand `.env` est rempli avec les vraies clés)
- Activer `observability/datadog.md` pour l'infra
- Créer un workflow GitHub Actions CI (lint + pytest) pour le repo
- Secrets management : passer de `.env` à Doppler ou AWS Secrets Manager en prod
- Brand voice guide Notion (référencé par `content-draft` skill)

---

## 5. Fichiers clés à relire à la reprise

- `README.md` (vue d'ensemble + roadmap 90 j)
- `paperclip/AGENTS.md` (org chart des 8 agents IA)
- `avancement.md` (ce fichier)
- `.env` (vos secrets + URLs)
- `langgraph_flows/finance_approval/graph.py` (workflow HITL de référence)

---

## 6. Résumé en 3 phrases

Le stack complet est scaffolder et tourne. Les tests techniques passent (Paperclip UI, CrewAI via HTTP, LangGraph HITL, Ollama Cloud). Il reste à vous authentifier sur GitHub et à fournir vos tokens SaaS pour passer aux tests business réels.
