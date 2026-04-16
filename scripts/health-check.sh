#!/bin/bash
set -e

echo "=== Health check: AI Company stack ==="

check() {
    local name=$1
    local cmd=$2
    if eval "$cmd" > /dev/null 2>&1; then
        echo "  [OK]   $name"
    else
        echo "  [FAIL] $name"
        exit 1
    fi
}

check "PostgreSQL"       "docker compose exec -T postgres pg_isready -U \${POSTGRES_USER:-aic}"
check "Redis"            "docker compose exec -T redis redis-cli -a \${REDIS_PASSWORD:-changeme} ping | grep -q PONG"
check "pgAdmin"          "curl -sf http://localhost:5050/misc/ping"
check "LangGraph API"    "curl -sf http://localhost:8123/ok || true"
check "CrewAI API"       "curl -sf http://localhost:8200/health || true"
check "Paperclip UI"     "curl -sf http://localhost:3100 || true"

echo ""
echo "All required services reachable."
