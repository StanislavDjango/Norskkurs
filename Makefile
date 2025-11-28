PYTHON ?= python
NPM ?= npm
COMPOSE ?= docker compose

.PHONY: up down restart ps logs logs-backend logs-frontend backend-test frontend-build install-backend install-frontend lint-backend format-backend lint-frontend format-frontend

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

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
