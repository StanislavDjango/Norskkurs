# Repository Guidelines

## Project Structure & Module Organization
- `backend/`: Django project (`config/settings.py`, `urls.py`) with the `exams` app. Seeds live in `backend/exams/management`, fixtures in `backend/exams/data`, migrations in `backend/exams/migrations`, tests in `backend/exams/tests`.
- `frontend/`: React + Vite + TypeScript. Entry at `frontend/src/main.tsx`, routing/pages under `frontend/src/pages`, shared UI in `frontend/src/components`, types/API helpers in `frontend/src/types.ts` and `frontend/src/api.ts`, styles in `frontend/src/style.css`.
- `docs/`: product and UX notes (`next-steps.md`, `verb.md`, `streams-structure.md`).
- Root utilities: `docker-compose.yml` for backend+Postgres+frontend; `HANDOFF.md` and `README.md` for setup.

## Build, Test, and Development Commands
- Docker: `docker compose up --build` to run all services; seed with `docker compose run --rm backend python manage.py seed_sample_data`.
- Backend local: `python backend/manage.py migrate && python backend/manage.py runserver 0.0.0.0:8000` (requires `backend/.env` copied from `.env.example`).
- Frontend local: `cd frontend && npm install && npm run dev` (set `VITE_API_BASE_URL=http://localhost:8001/api/` when using the compose backend).
- Production check: `cd frontend && npm run build` (`tsc` + Vite bundle).

### Windows + WSL notes
- Основная рабочая копия проекта в WSL: `~/Norskkurs`. Для Docker, Git и npm ориентироваться на неё, а не на Windows-копию `E:\Norskkurs`.
- При запуске команд из PowerShell (в том числе ассистентами) использовать обёртку WSL, например:
  `wsl -d Ubuntu bash -lc 'cd ~/Norskkurs && docker compose up --build -d'`.
- Не использовать UNC-пути вида `\\wsl$\Ubuntu\home\strengerst\Norskkurs` как build context для Docker и Git-команд.
- В PowerShell избегать связок через `&&` — вместо этого вызывать отдельные команды или запускать цепочку уже внутри `bash -lc '...'`.

### Notes for assistants (tests & sandbox)
- Codex работает в песочнице и не всегда видит реальное Python/Django-окружение (venv, direnv, Docker). Если `python backend/manage.py ...` или команды Django падают из-за отсутствия Python/БД, **не меняйте настройки проекта только ради песочницы**.
- В такой ситуации:
  - явно объясняйте пользователю причину (нет Python, нет соединения с `db`, Docker не поднят и т.п.);
  - логически проверяйте изменения (типы, импорты, маршруты);
  - подсказывайте, какие команды запустить локально у себя.
- Для реальной среды пользователя (WSL + Docker, каталог `~/Norskkurs`) используйте команды:
  - миграции: `cd ~/Norskkurs && docker compose exec backend python manage.py migrate`;
  - тесты: `cd ~/Norskkurs && docker compose exec backend python manage.py test exams`;
  - локально без Docker (при необходимости): `cd ~/Norskkurs && source .venv/bin/activate && python backend/manage.py test exams`.
- Рабочая копия одна: `~/Norskkurs` в WSL; не предлагайте запускать `docker compose` или `npm run dev` из `E:\Norskkurs` или через UNC-путь `\\wsl$...`.

## Coding Style & Naming Conventions
- Python/Django: 4 spaces; keep business logic in model methods or `exams/utils`; management commands go in `backend/exams/management/commands`; REST views follow DRF patterns already in `exams`.
- TypeScript/React: Functional components; PascalCase component files, camelCase props/state; keep shared styles in `frontend/src/style.css`; add UI strings to `frontend/src/i18n.ts`; mirror API shapes in `frontend/src/types.ts`.
- Favor explicit imports and small modules; avoid mixing seed data with runtime code.

## Testing Guidelines
- Backend: Run `docker compose exec backend python manage.py test exams` (or `python backend/manage.py test exams`) before pushing. Add `test_*.py` next to the feature.
- Frontend: No unit tests yet; always run `npm run build` to catch type errors and bundle issues. Record manual checks (pages/routes touched) in the PR when adding UI behavior.

## Commit & Pull Request Guidelines
- Commits use short, imperative subjects (e.g., “Extract verbs page component”, “Adjust admin CSV buttons spacing”); keep changes scoped.
- If you run seeders or migrations, note it in the commit or PR so reviewers reseed.
- PRs should cover what/why, verification steps (commands, URLs), linked issue, and screenshots/GIFs for UI changes. Call out env var or data expectations.

## Security & Configuration Tips
- Do not commit secrets; create `backend/.env` from `.env.example` and keep `DATABASE_URL`/API tokens local. Frontend vars must be `VITE_`-prefixed.
- Admin lives at `/admin/`; new endpoints should respect assignment restrictions and current CSRF exemptions in `config/urls.py`.
