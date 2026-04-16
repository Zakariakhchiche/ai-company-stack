.PHONY: help install up down logs paperclip crewai langgraph health clean

SHELL := /bin/bash

help:
	@echo "AI Company — Profile B commands"
	@echo ""
	@echo "  make install       Install pnpm, Python deps, verify prerequisites"
	@echo "  make up            Start Postgres, Redis, pgAdmin, LangGraph, CrewAI"
	@echo "  make down          Stop all containers"
	@echo "  make logs          Tail all container logs"
	@echo "  make paperclip     Launch Paperclip orchestrator (Node, foreground)"
	@echo "  make crewai        Run CrewAI crews locally (dev mode)"
	@echo "  make langgraph     Run LangGraph dev server"
	@echo "  make health        Check all services"
	@echo "  make clean         Stop and remove volumes (DESTRUCTIVE)"

install:
	@echo ">> Enabling pnpm via corepack..."
	corepack enable
	corepack prepare pnpm@latest --activate
	@echo ">> Installing Python deps for CrewAI crews..."
	cd crews && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
	@echo ">> Installing Python deps for LangGraph flows..."
	cd langgraph_flows && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
	@echo ">> Done. Copy .env.example to .env and fill in secrets."

up:
	docker compose up -d postgres redis pgadmin
	@echo ">> Infrastructure ready. Postgres: 5432 | Redis: 6379 | pgAdmin: http://localhost:5050"

up-all:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f --tail=100

paperclip:
	npx paperclipai@latest onboard --yes

crewai:
	cd crews && . .venv/bin/activate && python run.py

langgraph:
	cd langgraph_flows && . .venv/bin/activate && langgraph dev

health:
	@bash scripts/health-check.sh

clean:
	docker compose down -v
	@echo ">> Volumes removed. Re-run 'make up' for a clean slate."
