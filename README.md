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
4. Admin UI: `http://localhost:8001/admin/` (create superuser once: `docker compose run --rm backend python manage.py createsuperuser`).
5. Frontend: `http://localhost:5173` (inside compose uses `http://backend:8000/api/`; from host use `http://localhost:8001/api/`).

## Local development (no Docker)
1. Backend: `python -m venv .venv && .\.venv\Scripts\activate` then `pip install -r backend/requirements.txt`.
2. Create `backend/.env` from example; run `python backend/manage.py migrate && python backend/manage.py seed_sample_data && python backend/manage.py runserver 0.0.0.0:8000`.
3. Frontend: `cd frontend && npm install` (Node 20.19+ or 22.12+), then `npm run dev` with `VITE_API_BASE_URL=http://localhost:8001/api/`.

## API
- `GET /api/tests/?student_email=` — list tests (respects assignments if `is_restricted`).
- `GET /api/tests/<slug>/` — test detail with questions/options.
- `POST /api/tests/<slug>/submit/` — submit `{ answers: [{question, selected_option?, text_response?}], name?, email?, locale? }`; returns score, percent, per-question review.
- `GET /api/profile/me/` — auth info `{is_authenticated,is_teacher,...}`.
- `POST /api/profile/logout/` — logout (CSRF-exempt).

## Admin
- Jazzmin admin in English; manage Tests (A1–B2), Questions, Options, Assignments (student_email access). Content of questions is Norwegian only; UI EN.

## Tests
- Backend (in compose): `docker compose exec backend python manage.py test exams` (sqlite fallback if no DATABASE_URL).
- Front build: `cd frontend && npm run build`.

## CI / Docker Hub
- Workflow `.github/workflows/docker-build.yml` builds/pushes backend/frontend images with tags `latest` and `${{ github.sha }}`. Set secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`.

## Git tips / rollback
- Полный лог важных коммитов есть в `git reflog`; последний набор: `Make API endpoints CSRF-exempt...`, `Seed real Norwegian tests...`, `Lock admin UI to English`, `Add handoff notes...`.
- Быстрый откат к известному коммиту: `git reset --hard <sha>` и при необходимости `git push -f origin main`.

## Images
- Backend: `stanyslav/norskkurs-backend:latest`
- Frontend: `stanyslav/norskkurs-frontend:latest`
