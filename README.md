# 🚀 Norskkurs — Placement tests (Django + React)

[![Build Status](https://img.shields.io/github/actions/workflow/status/StanislavDjango/Norskkurs/docker-build.yml?branch=main&label=CI&logo=github)](https://github.com/StanislavDjango/Norskkurs/actions)
[![Docker Image](https://img.shields.io/docker/v/stanyslav/norskkurs-backend?label=backend&sort=semver)](https://hub.docker.com/)
[![License](https://img.shields.io/github/license/StanislavDjango/Norskkurs)](./LICENSE)

Коротко: платформа для определения уровня владения норвежским (A1–B2). Backend — Django (REST), админка на Jazzmin; Frontend — React + Vite + TypeScript. Удобно запускать в Docker Compose.

---

## ✨ К чему это красиво?
- Чистая Jazzmin-админка для загрузки/редактирования тестов и вербов.
- Интерактивный React-интерфейс для студентов.
- Импорт/экспорт слов по шаблону (CSV).
- Простая авто‑деплой конфигурация и скрипты для сервера.

---

## Содержание
- [Быстрый старт (Docker)](#-быстрый-старт-docker)
- [Локальная разработка](#-локальная-разработка)
- [API — кратко](#-api—-кратко)
- [Админка](#-админка)
- [Импорт/Экспорт вербов](#-импортэкспорт-вербов)
- [Скриншоты](#-скриншоты)
- [Как внести вклад](#-как-внести-вклад)
- [Контакты и лицензия](#-контакты-и-лицензия)

---

## ⚡ Быстрый старт (Docker)
1. Скопировать пример env:  
   cp backend/.env.example backend/.env (подкорректируй секреты).
2. Собрать и запустить:  
   docker compose up --build
3. Сидирование данных (пример):  
   docker compose run --rm backend python manage.py seed_sample_data
4. Админка: http://localhost:8000/admin/ (создать суперпользователя: docker compose run --rm backend python manage.py createsuperuser)
5. Фронтенд: http://localhost:5173 (внутри compose фронт использует http://backend:8000/api/; из хоста — http://localhost:8000/api/)

---

## 🛠 Локальная разработка (без Docker)
Backend:
- python -m venv .venv && source .venv/bin/activate
- pip install -r backend/requirements.txt
- Создать backend/.env на основе backend/.env.example
- python backend/manage.py migrate
- python backend/manage.py seed_sample_data
- python backend/manage.py runserver 0.0.0.0:8000

Frontend:
- cd frontend
- npm install (Node 20+/22+)
- VITE_API_BASE_URL=http://localhost:8000/api/ npm run dev

---

## 🔌 API — кратко
- GET /api/tests/?student_email= — список тестов
- GET /api/tests/<slug>/ — детали теста с вопросами/опциями
- POST /api/tests/<slug>/submit/ — отправка ответов, возвращает score и review
- GET /api/profile/me/ — данные профиля (is_teacher и т. п.)

(Полный список см. в исходниках backend)

---

## 👩‍🏫 Админка
Jazzmin-админ: управление Tests (A1–B2), Questions, Options, Assignments (доступ по student_email). Контент вопросов — на норвежском, UI — на английском.

---

## 📥 Импорт / 📤 Экспорт вербов
- Экспорт шаблона: python manage.py export_verbs_csv --output verbs-template.csv  
- Импорт: python manage.py import_verbs_csv data.csv [--update]  
Формат: verb, stream, infinitive/present/past/perfect, examples_* (строки через " | "), tags (через ;)

---

## 🖼 Скриншоты / Demo
Добавь скриншоты в папку `docs/screenshots/` и вставь их здесь:
![Demo placeholder](docs/screenshots/demo.gif)

---

## 🤝 Как внести вклад
Смотри CONTRIBUTING.md в репозитории. Коротко:
- Форк → ветка feature/your-thing → PR в main
- Описывай коммиты и добавляй тесты для backend (exams)

---

## 📚 Полезные ссылки в репозитории
- AGENTS.md
- HANDOFF.md
- deploy/ (nginx.conf и инструкции)
- scripts/ (скрипты деплоя и бэкапа)

---

## 📬 Контакты
Автор: Stanislav — @StanislavDjango  
Email: put_your_email_here@example.com

---

## ⚖️ Лицензия
Укажи лицензию в LICENSE (если ещё нет) — рекомендую MIT.

Спасибо за репозиторий — он уже содержит хорошую архитектуру; этот README делает его визуально приятнее и понятнее для преподавателей, студентов и разработчиков.
# Report (recent work)
- Added verb translations (EN/RU/NB) to backend (model, serializer, CSV import/export).
- Added Irregular verbs section (tag `irregular`) with sample data (3 per stream).
- Translations moved into the “Show example” modal for a compact verbs table.
- Mobile verbs layout fixed (controls and CTA visible).
- CSV import now tolerates duplicate verb+stream without crashing.
- Navigation label for Irregular verbs is localized (EN/NB/RU).
- Custom favicon added.

Deploy notes:
- Run `python manage.py migrate` (includes 0006_verbentry_translations).
- CSV headers: `verb,stream,infinitive,present,past,perfect,examples_infinitive,examples_present,examples_past,examples_perfect,translation_en,translation_ru,translation_nb,tags`.
- Rebuild frontend: `cd frontend && npm install && npm run build`.
