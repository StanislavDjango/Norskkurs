PYTHON ?= python
NPM ?= npm
COMPOSE ?= docker compose

.PHONY: up down restart ps logs logs-backend logs-frontend dev-up dev-down dev-restart dev-logs dev-frontend backend-test frontend-build install-backend install-frontend lint-backend format-backend lint-frontend format-frontend api-schema

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

dev-up:
	$(COMPOSE) -f docker-compose.yml -f docker-compose.dev.yml up -d --build

dev-down:
	$(COMPOSE) -f docker-compose.yml -f docker-compose.dev.yml down

dev-restart:
	$(COMPOSE) -f docker-compose.yml -f docker-compose.dev.yml down && $(COMPOSE) -f docker-compose.yml -f docker-compose.dev.yml up -d --build

dev-logs:
	$(COMPOSE) -f docker-compose.yml -f docker-compose.dev.yml logs -f --tail=200

dev-frontend:
	cd frontend && $(NPM) run dev -- --host 0.0.0.0 --port 5173

restart:
	$(COMPOSE) down && $(COMPOSE) up -d

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f --tail=200

logs-backend:
	$(COMPOSE) logs -f --tail=200 backend

logs-frontend:
	$(COMPOSE) logs -f --tail=200 frontend

backend-test:
	$(PYTHON) backend/manage.py test exams

lint-backend:
	pre-commit run --all-files

format-backend:
	pre-commit run black isort --all-files

frontend-build:
	cd frontend && $(NPM) run build

api-schema:
	bash scripts/generate_frontend_api_schema.sh

install-backend:
	$(PYTHON) -m pip install -r backend/requirements.txt

install-backend-dev:
	$(PYTHON) -m pip install -r backend/requirements.txt && $(PYTHON) -m pip install pre-commit black isort

install-frontend:
	cd frontend && $(NPM) install

lint-frontend:
	cd frontend && $(NPM) run lint

format-frontend:
	cd frontend && $(NPM) run format
