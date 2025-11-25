# Norskkurs (Django + React)

Placement tests for Norwegian proficiency levels A1–B2 with a React UI and Django/Jazzmin admin. Docker Compose bundles the API, Postgres, and frontend.

## Stack
- **Backend:** Django 5, Django REST Framework, Jazzmin admin, postgres (via `DATABASE_URL`)
- **Frontend:** React + Vite + TypeScript, i18next (English/Norsk)
- **Infra:** Docker Compose, Postgres 16

## Quick start (Docker)
1. Copy backend env: `cp backend/.env.example backend/.env` (adjust secrets if needed).
2. Build & run: `docker compose up --build`.
3. Seed data: `docker compose run --rm backend python manage.py seed_sample_data`
4. Admin UI: `http://localhost:8000/admin/` (create superuser once: `docker compose run --rm backend python manage.py createsuperuser`).
5. Frontend: `http://localhost:5173` (inside compose uses `http://backend:8000/api/`; from host use `http://localhost:8000/api/`).

## Local development (no Docker)
1. Backend: `python -m venv .venv && .\.venv\Scripts\activate` then `pip install -r backend/requirements.txt`.
2. Create `backend/.env` from example; run `python backend/manage.py migrate && python backend/manage.py seed_sample_data && python backend/manage.py runserver 0.0.0.0:8000`.
3. Frontend: `cd frontend && npm install` (Node 20.19+ or 22.12+), then `npm run dev` with `VITE_API_BASE_URL=http://localhost:8000/api/`.

## Production (Cloudflare → Nginx → backend)
- Keep Cloudflare proxy on (orange cloud), SSL mode “Full (strict)”.
- Generate an Origin Certificate in Cloudflare for `norskkurs.xyz`, place it on the server (see `deploy/nginx.conf` for paths).
- Install Nginx on the server, place the config from `deploy/nginx.conf`, reload Nginx; it terminates TLS on 443 and proxies to backend `127.0.0.1:8000`.
- Backend stays on 127.0.0.1:8000 via Docker; set frontend env `VITE_API_BASE_URL=https://norskkurs.xyz/api/` for production builds.

## API
- `GET /api/tests/?student_email=` — list tests (respects assignments if `is_restricted`).
- `GET /api/tests/<slug>/` — test detail with questions/options.
- `POST /api/tests/<slug>/submit/` — submit `{ answers: [{question, selected_option?, text_response?}], name?, email?, locale? }`; returns score, percent, per-question review.
- `GET /api/profile/me/` — auth info `{is_authenticated,is_teacher,...}`.
- `POST /api/profile/logout/` — logout (CSRF-exempt).

## Verb section highlights
- Full-width React verb board with alphabet picker, topic filter, and infinite scroll.
- “Show example” modal displays tense-specific sentences per verb (infinitive/present/past/perfect).
- “Bookmarks” mode lets the teacher or student mark verbs as favorites (persisted in localStorage) for quick review.
- Daily UI tweaks: grid layout, badge labels for stream/level, and verb cards with tag chips.
- Admin verbs list includes visually consistent action buttons (Add / Download CSV / Import CSV) and a clean import form.

## Admin
- Jazzmin admin in English; manage Tests (A1–B2), Questions, Options, Assignments (student_email access). Content of questions is Norwegian only; UI EN.

### Bulk verb import/export
- **Export current verbs as template:** `python manage.py export_verbs_csv --output verbs-template.csv`
  - CSV columns: `verb, stream, infinitive/present/past/perfect, examples_* (lines separated by " | "), tags (semicolon separated)`.
  - File already contains every verb in the DB, so teachers can edit in Excel/Google Sheets.
- **Import updated CSV:** `python manage.py import_verbs_csv data.csv [--update]`
  - Without `--update` existing verbs (same `stream+verb`) are skipped; with `--update` they’re overwritten.
  - New rows are created automatically; tags split by `;`, examples use ` | ` to represent line breaks which become multi-line examples again.
- The Verb entries admin list now has buttons for the same actions (Download CSV template / Import CSV) so non-technical teachers can run it directly in the UI.

## Tests
- Backend (in compose): `docker compose exec backend python manage.py test exams` (sqlite fallback if no DATABASE_URL).
- Front build: `cd frontend && npm run build`.

## CI / Docker Hub
- Workflow `.github/workflows/docker-build.yml` builds/pushes backend/frontend images with tags `latest` and `${{ github.sha }}`. Set secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`.

## Auto-deploy to server
- Workflow `.github/workflows/deploy.yml` срабатывает на `push` в ветку `main` и по SSH запускает на сервере `scripts/deploy.sh`.
- ВАЖНО: для этого сервера интернет‑провайдер режет прямой SSH снаружи, поэтому автодеплой из GitHub Actions должен идти через Cloudflare Access‑туннель `ssh.norskkurs.xyz` (ProxyCommand `cloudflared access ssh`) при наличии секретов `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`; в качестве ключа/пользователя используются `DEPLOY_SSH_KEY` и `DEPLOY_USER`. Пара `DEPLOY_HOST`/`DEPLOY_PORT` годится как fallback только для ручных деплоев с машин, у которых есть прямой SSH‑доступ до сервера (локальная сеть, VPN и т.п.).
- Скрипт деплоя обновляет код до `origin/main`, пересобирает Docker-контейнеры, выполняет миграции/collectstatic и перезапускает стэк (`db`, `backend`, `frontend`).

## Git tips / rollback
- Полный лог важных коммитов есть в `git reflog`; последний набор: `Make API endpoints CSRF-exempt...`, `Seed real Norwegian tests...`, `Lock admin UI to English`, `Add handoff notes...`.
- Быстрый откат к известному коммиту: `git reset --hard <sha>` и при необходимости `git push -f origin main`.

## Images
- Backend: `stanyslav/norskkurs-backend:latest`
- Frontend: `stanyslav/norskkurs-frontend:latest`
