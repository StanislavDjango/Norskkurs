# Norskkurs (Django + React)

Placement tests for Norwegian proficiency levels A1–B2 with a React UI and Django/Jazzmin admin. Docker Compose bundles the API, Postgres, and frontend.

## Stack
- **Backend:** Django 5, Django REST Framework, Jazzmin admin, postgres (via `DATABASE_URL`)
- **Frontend:** React + Vite + TypeScript, i18next (English/Norsk)
- **Infra:** Docker Compose, Postgres 16

## Quick start (Docker)
1. Copy backend env: `cp backend/.env.example backend/.env` (adjust secrets if needed).
2. Build & run: `docker compose up --build`.
3. Seed data is automatic; admin UI at `http://localhost:8001/admin/` (create a superuser via `docker compose run --rm backend python manage.py createsuperuser`).
4. Frontend runs at `http://localhost:5173` (uses API `http://backend:8000/api/` inside the compose network; host access is `http://localhost:8001/api/`).

## Local development (no Docker)
1. Backend: `python -m venv .venv && .\.venv\Scripts\activate` then `pip install -r backend/requirements.txt`.
2. Set up `backend/.env` (see example) and run `python backend/manage.py migrate && python backend/manage.py seed_sample_data && python backend/manage.py runserver`.
3. Frontend: `cd frontend && npm install` (Node 20.19+ or 22.12+) then `npm run dev` with `VITE_API_BASE_URL=http://localhost:8001/api/`.

## API
- `GET /api/tests/` — published tests list (levels A1–B2).
- `GET /api/tests/<slug>/` — test detail with questions/options.
- `POST /api/tests/<slug>/submit/` — submit answers `{ answers: [{question, selected_option?, text_response?}], name?, email?, locale? }` → returns score/percent and stored submission.

## Admin
- Jazzmin admin to create/edit tests, questions, and options (single-choice and fill-in). Submissions are viewable with per-question correctness.

## Tests
- Run backend tests: `python backend/manage.py test exams` (uses sqlite in-memory when no `DATABASE_URL`).
- Frontend build check: `cd frontend && npm run build`.

## GitHub repo
Initialize git is done locally. To create/push to GitHub (`Norskkurs`), provide a GitHub token or create the repo and share remote credentials, then run:
```bash
git remote add origin https://github.com/<your-user>/Norskkurs.git
git add .
git commit -m "Init Norskkurs Django/React app"
git push -u origin main
```
