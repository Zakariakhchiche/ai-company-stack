# Datadog — optionnel, pour infra et Paperclip

LangSmith couvre les graphes et crews ; Datadog complète pour l'infrastructure (Postgres, Redis, Docker, latence réseau) et pour l'intégration CrewAI native.

## Setup minimal
1. Installer l'agent Datadog sur l'hôte Docker :
   ```
   docker run -d --name dd-agent \
     -v /var/run/docker.sock:/var/run/docker.sock:ro \
     -v /proc/:/host/proc/:ro \
     -v /sys/fs/cgroup/:/host/sys/fs/cgroup:ro \
     -e DD_API_KEY=<your-key> \
     -e DD_SITE=datadoghq.eu \
     gcr.io/datadoghq/agent:latest
   ```
2. Activer l'intégration CrewAI officielle : doc `https://docs.datadoghq.com/integrations/crewai/`.
3. Dashboards recommandés :
   - `AI Company — Infra` : CPU/RAM/disk, Postgres connections, Redis hit rate
   - `AI Company — Agents` : spend by agent, success rate, latency

## Intégration Paperclip
Paperclip expose un endpoint Prometheus `/metrics` sur port 3100. Scrape depuis Datadog OpenMetrics check.
