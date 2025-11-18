# Handoff Notes for Norskkurs

Проект: Django (backend) + React/Vite (frontend), Postgres через Docker Compose. Админка на Jazzmin. API по умолчанию `http://localhost:8001/api/`.

## Авторизация / роли
- Endpoint `profile/me/` возвращает `{ is_authenticated, is_teacher, username, display_name }` (is_teacher = is_staff/superuser).
- Login ссылка: `/admin/login/?next=/admin/`. Logout через API `profile/logout/` (POST, CSRF exempt SessionAuth).
- В шапке показывается имя/ник и Logout; Admin menu — только для учителей.

## Доступ к тестам
- У теста есть `is_restricted`. Модель `Assignment(test, student_email, assigned_by, expires_at)`.
- Список/деталь тестов фильтруются по `student_email`; submit проверяет назначение, если тест restricted.

## Сидер
- `seed_sample_data` очищает тесты и создает ~80 тестов (A1–B2) в режимах single/fill/mixed/exam, по 10 вопросов на тест.

## Frontend UX
- Поле email студента в сайдбаре, поиск, фильтры по уровню/режиму, “Load more”.
- Проверка ответов: 10 вопросов, требование ответить на все, подсветка пропущенных с автоскроллом.
- Результат по каждому вопросу сразу под вопросом (зелёный/красный, ваш ответ, правильный, пояснение).
- Локализация: EN/NO/RU. Хедер с чипом пользователя, logout, admin link, свитч языков в одном блоке.
- axios `withCredentials` включён; base URL из env `VITE_API_BASE_URL` (по умолчанию localhost:8001/api/).

## CORS/CSRF
- `CORS_ALLOW_CREDENTIALS=True`, `CORS_ALLOWED_ORIGINS` включает localhost/127.0.0.1:5173. `CORS_ALLOW_ALL_ORIGINS=False`.

## Docker / CI
- Образы: `stanyslav/norskkurs-backend:latest`, `stanyslav/norskkurs-frontend:latest`.
- CI (GitHub Actions) собирает и пушит backend/frontend с тегами latest и `${{ github.sha }}`. Нужны секреты `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`.

## Команды
- Миграции/сидер в compose: `docker compose exec backend python manage.py migrate` и `docker compose run --rm backend python manage.py seed_sample_data`.
- Тесты бэка: `docker compose exec backend python manage.py test exams`.
- Сборка фронта: `npm run build`.

## Последние фиксы
- API logout и UI-обработка (без /admin/logout GET).
- CORS/credentials поправлены; добавлен импорт models.
- Стили хедера для одинаковых размеров кнопок.
