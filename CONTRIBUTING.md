# Contributing

Thanks for your interest in improving Norskkurs.

## Development Setup
- Use the WSL working copy: `/home/strengerst/Norskkurs`
- Start the dev stack with `make dev-up`
- Frontend dev server: `http://localhost:5173`
- Backend API/admin: `http://127.0.0.1:8000`

## Before Opening a PR
- Run frontend checks:
  - `cd frontend && npm run typecheck`
  - `cd frontend && npm run build`
- Run backend checks:
  - `docker compose exec backend python manage.py check`
  - `docker compose exec backend python manage.py test exams`

## Pull Request Notes
- Keep changes focused and explain why they were needed.
- Mention migrations, seed changes, or manual verification steps.
- Include screenshots or short recordings for UI changes when helpful.
