# Avancement — AI Company stack (Profil B)

Dernière mise à jour : 2026-04-21 (on reprend demain)

---

## 0. Où on en est (session 2026-04-20 → 21)

VPS Hostinger `72.60.89.217:3100` en production. Paperclip démarre en ~2 min via compose inline (`node:20-bookworm-slim` + `npm install paperclipai` + `pip install hermes-agent` + download+apply du patch script depuis GitHub raw main). Creds admin : `admin@paperclip.local` / `WYux3LWqj1OMYi21`.

**10 patches runtime** appliqués au boot (`deploy/patches/patch-hermes-autodetect.mjs`) :
1. `hermes` — `listModels()` dynamique qui fetch live `ollama.com/v1/models`
2. `hermes-constants` — ajoute `ollama-cloud` + `custom` à `VALID_PROVIDERS`
3. `registry` — câble `listHermesModels` dans le registry paperclipai
4-5. `hermes-execute` — injecte `PAPERCLIP_API_KEY=authToken` + ajoute header `Authorization: Bearer $PAPERCLIP_API_KEY` à tous les curl du prompt template
6. `hermes-buildconfig` — UI wizard défaut `provider=ollama-cloud` (sauf modèles prefix `deepseek/`)
7. `routes` — `buildAdapterInfo` async + Promise.all pour que `modelsCount` reflète le dynamique
8. `approvals` — `hire_agent` default `hermes_local` + full config ollama-cloud
9. `access` — join-request acceptance défaut idem
10. `heartbeat` — `HEARTBEAT_MAX_CONCURRENT_RUNS_DEFAULT = 7`

Volume `/root/hermes-home:/home/node/.hermes` pour persister les sessions entre redeploys.

### Équipe `fct` (growth/demand-gen)
- **CEO** (glm-5.1, heartbeat 5min) — orchestration
- **Engineer** (kimi-k2.6, heartbeat 5min) — FCT-7 chatbot, tech/infra
- **Designer** (qwen3-vl:235b, heartbeat 5min) — FCT-2 landing pages
- **RevOps** (glm-5.1, heartbeat 5min) — FCT-3 CRM, FCT-4 funnel, FCT-8 dashboard
- **SDR** (kimi-k2.5, heartbeat 5min) — FCT-5 LinkedIn, FCT-6 cold email, FCT-10 outreach
- **Marketing** (deepseek-v3.2, heartbeat 5min) — FCT-9 expert marketing

Tous `reportsTo=CEO`, `maxConcurrentRuns=7`.

### CI/CD GHCR
- GHA workflow build+push `ghcr.io/zakariakhchiche/ai-company-stack:latest` à chaque commit sur main touchant `deploy/`
- Image publique (`visibility=public`) mais **Hostinger's daemon refuse de la pull avec `denied`** — probable auth cache stale d'un essai précédent avec image privée. Fallback sur compose inline qui marche. Pour unblock il faut SSH au VPS + `docker logout ghcr.io`.

---

## TODO — à reprendre demain

### Prioritaire
1. **Créer le Reviewer/COO dans fct** (interrompu par overload VPS)
   - `name=Reviewer`, `title="COO — Quality & Review"`, `model=kimi-k2.6`, `reportsTo=CEO`, heartbeat 5min
   - Écrire `AGENTS.md` avec mandat : audite issues `in_review` → approve (→`done`) ou reject (→`todo` + feedback précis), never execute tasks himself, priorize by `priority` field
   - Objectif : couche de contrôle qualité avant que les specialists ferment les tickets

2. **Appliquer la fiche de poste "Head of Outreach" au SDR** (fct)
   - Mettre à jour le `title` de l'agent SDR `85e0d5dd` en "Head of Outreach"
   - Écrire le AGENTS.md avec la fiche complète fournie par Zak : recruteur exigeant 10+ ans cold email/LinkedIn/scraping, deliverability, anti-ban, funnel outbound, KPI (ouverture/réponse/RDV/coût lead), ton direct/sans compromis, challenge tout profil médiocre
   - Il pilote FCT-5, FCT-6, FCT-10

3. **Diagnose overload VPS** : avec 6 agents heartbeat 5min + `maxConcurrentRuns=7`, l'API 3100 a timeouté plusieurs minutes. Options :
   - Passer heartbeat à `intervalSec=600` (10 min) sur tous
   - OU passer `maxConcurrentRuns` à 3-4 (7 était trop agressif pour 1 VPS)
   - OU upgrader le VPS Hostinger

### Moyen terme
4. **Forcer workflow `in_review`** : patch pour que les specialists doivent passer par `in_review` avant `done`, sinon le Reviewer ne voit rien passer. Probablement via prompt template patch dans `hermes-paperclip-adapter/dist/server/execute.js`.
5. **GHCR auth cache sur Hostinger** : SSH (pas dispo via API) puis `docker logout ghcr.io` → compose passe sur image pré-bakée (boot 15s au lieu de 2min).
6. **test company CTO** : run timed_out historique, investiguer model/prompt.
7. **Descriptions/missions** sur les autres sociétés.

### Nice to have
8. **Budget mensuel** sur chaque company (actuellement 0).
9. **Purge définitive** des 3 sociétés archivées dans Postgres (FK cascade bug dans paperclipai empêche la vraie suppression API).
10. **Board approval obligatoire** pour hire_agent — validé mais à retester après le patch `approvals.js`.

### Fiche de poste Head of Outreach (à ranger dans l'AGENTS.md du SDR demain)

> Tu es un Head of Outreach élite, spécialisé dans la génération massive de leads qualifiés via des stratégies d'outbound avancées. 10+ ans en cold email, LinkedIn automation, scraping, growth hacking. Millions d'euros de pipeline généré. Machines d'acquisition scalables et résistantes aux bans. À la fois recruteur exigeant, opérateur terrain et expert technique (scraping, deliverability, anti-ban).
>
> **Missions** :
> 1. Recruter le meilleur expert outreach possible — profil idéal : Lemlist/Instantly/Smartlead, Phantombuster/Waalaxy, Apollo/Dropcontact, SPF/DKIM/DMARC/warming/rotation IP-domaines, copywriting short-impactant, funnel complet prospect→RDV→closing, résultats chiffrés obligatoires.
> 2. Interview exigeante : scaling cold email sans blacklist ? contournement protections LinkedIn ? combien de domaines pour 10k emails/jour ? campagne chiffrée ? passer un taux de réponse de 1% à 5% ?
> 3. Machine outreach complète — scraping massif + enrichissement + multi-touch (email + LinkedIn + relance) + A/B testing + segmentation.
> 4. Anti-ban & cybersécurité — travailler avec le CTO pour IP rotation, comptes, contournement anti-bot. Zéro stratégie naïve.
> 5. KPI : taux ouverture / réponse / RDV / coût par lead. Objectif : maximiser les RDV qualifiés.
>
> Fonctionnement : challenge le profil/stratégie, identifie les faiblesses, propose une version améliorée, donne des actions concrètes, priorise les quick wins. Style direct, exigeant, sans compromis, focus résultat.
>
> Objectif final : machine d'outreach capable de générer des leads tous les jours, scaler sans se bloquer, alimenter une équipe de closers en continu.

---

## 1. État global (ancien — avant 2026-04-20)

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
