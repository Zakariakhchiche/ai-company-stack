# LangSmith — setup et usage

## Pourquoi
Traces, évaluations, coûts par agent, alertes. C'est la référence pour LangGraph. CrewAI émet aussi des traces compatibles depuis que `langchain-anthropic` sert de backend LLM.

## Setup (1 fois)
1. Créer un compte : https://smith.langchain.com
2. Créer un projet `ai-company-prod`.
3. Générer une API key → coller dans `.env` :
   ```
   LANGSMITH_TRACING=true
   LANGSMITH_API_KEY=lsv2_...
   LANGSMITH_PROJECT=ai-company-prod
   ```
4. Redémarrer les services : `make down && make up-all`.

## Ce qu'on récupère
- Chaque exécution de graphe / crew = 1 trace.
- Coût par agent, par workflow, par heure.
- Replay d'un état à n'importe quel checkpoint (time-travel debugging).
- Évaluations automatiques (régressions de qualité entre versions).

## Alertes à créer (depuis l'UI LangSmith)
1. `token_cost_hourly > $10` → Slack `#leadership`
2. `run_error_rate_5min > 5%` → PagerDuty
3. `latency_p95 > 30s` → Slack `#ai-ops`
4. `hallucination_score > 0.3` (via eval) → Slack `#ai-quality`

## Environnements
- `ai-company-dev` : local dev, traces détaillées
- `ai-company-staging` : tests intégration
- `ai-company-prod` : production, sampling 10% pour réduire coûts trace

## Coûts LangSmith
Free tier : 5k traces/mois. Plus Plan : $39/dev/mois (50k traces). Enterprise sur devis.
