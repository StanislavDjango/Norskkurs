# Отчёт о проделанной работе (24.11.2025)

Этот файл описывает, что было сделано в рамках настройки автодеплоя и инфраструктуры Norskkurs, чтобы следующий человек мог продолжить работу без перепроверки всего с нуля.

## 1. Инфраструктура / текущее состояние

- Код: `/srv/norskkurs/Norskkurs`.
- Docker‑сервисы: `db` (Postgres 16), `backend` (Django 5), `frontend` (React/Vite).
- Прод:
  - Cloudflare → cloudflared → `https://norskkurs.xyz` (frontend) и `/api/` (backend).
  - БД восстановлена из дампа `backup.sql`, авто‑seed отключён, данные стабильны при перезапуске контейнеров.
- Важные файлы по инфре:
  - `docker-compose.yml` — локальный/прод стек.
  - `.github/workflows/docker-build.yml` — сборка/публикация Docker‑образов.
  - `.github/workflows/deploy.yml` — деплой через SSH (для GitHub Actions, пока не используется до конца).
  - `scripts/deploy.sh` — основной скрипт деплоя на сервере.
  - `docs/deploy.md`, `HANDOFF.md`, `docs/next-steps.md` — документация.

## 2. GitHub Actions / Docker Hub

Что уже настроено и используется:

- Workflow `Build and Push Docker Images` (`.github/workflows/docker-build.yml`):
  - Триггер: `push` в ветку `main` + ручной `workflow_dispatch`.
  - Собирает образы:
    - `stanyslav/norskkurs-backend:latest` и `:SHA`.
    - `stanyslav/norskkurs-frontend:latest` и `:SHA`.
  - Секреты в GitHub:
    - `DOCKERHUB_USERNAME`.
    - `DOCKERHUB_TOKEN`.

- Workflow `Deploy` (`.github/workflows/deploy.yml`):
  - Формально активен и срабатывает на `push` в `main`.
  - Пробует по SSH зайти на сервер и вызвать `scripts/deploy.sh`.
  - Сейчас падает на шаге `Configure SSH` из‑за отсутствия корректной конфигурации под Cloudflare SSH/Access (это не мешает реальному деплою, см. пункт 3).

## 3. Автодеплой с самого сервера (через cron)

Главная рабочая связка, которая реально обновляет прод:

- Скрипт `scripts/deploy.sh` был доработан, чтобы быть идемпотентным и безопасным для периодического запуска:
  - Делает `git fetch origin main`.
  - Сравнивает SHA:
    - `LOCAL_SHA=$(git rev-parse HEAD)`.
    - `REMOTE_SHA=$(git rev-parse origin/main)`.
  - Если SHA совпадают:
    - Печатает `No new commits on origin/main, skipping deploy.` и завершает работу.
  - Если есть новые коммиты:
    - Печатает `New commits detected (... -> ...), running deploy...`.
    - Делает `git reset --hard origin/main`.
    - Выполняет:
      - `docker compose pull`.
      - `docker compose build`.
      - `docker compose up -d db`.
      - `docker compose run --rm backend python manage.py migrate`.
      - `docker compose run --rm backend python manage.py collectstatic --noinput`.
      - `docker compose up -d`.

- Настроен cron для пользователя `stanislav`:
  - Команда: `crontab -l` показывает:
    ```bash
    PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
    */5 * * * * cd /srv/norskkurs/Norskkurs && APP_DIR=/srv/norskkurs/Norskkurs ./scripts/deploy.sh >> /home/stanislav/norskkurs-auto-deploy.log 2>&1
    ```
  - Каждые 5 минут:
    - Скрипт подтягивает `origin/main`.
    - Если есть новые коммиты — обновляет код и контейнеры на сервере.
    - Если нет — просто пишет сообщение и выходит.
  - Лог автодеплоя: `/home/stanislav/norskkurs-auto-deploy.log`.

Итог: после любого `git push origin main`:

- GitHub Actions собирают и пушат Docker‑образы в Docker Hub.
- В течение максимум 5 минут cron на сервере выполняет `scripts/deploy.sh`, который подтягивает новые коммиты и перезапускает стек.

## 4. Изменения в репозитории в рамках этой сессии

1. `scripts/deploy.sh`:
   - Добавлена проверка на наличие новых коммитов в `origin/main` и ранний выход, если их нет.
   - Это сделано для безопасного периодического запуска из cron.

2. `README.md`:
   - Добавлен раздел **Auto-deploy to server**:
     - Кратко описано, что есть workflow `deploy.yml`, который по SSH запускает `scripts/deploy.sh`.
     - Указано, что скрипт обновляет код до `origin/main`, пересобирает Docker и перезапускает стек.

3. Настройка cron (не в git, а в системе):
   - Для пользователя `stanislav` добавлена задача на каждые 5 минут, запускающая `scripts/deploy.sh`.

## 5. Что ещё можно улучшить/довести

1. **GitHub Actions Deploy через Cloudflare SSH** (пока не доведено до конца):
   - Сейчас `Deploy` падает на шаге `Configure SSH`, т.к. GitHub‑runner не может корректно достучаться до сервера.
   - Возможное развитие:
     - Настроить Cloudflare Access‑приложение для `ssh.norskkurs.xyz`.
     - Сгенерировать service token и добавить `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` в GitHub Secrets.
     - В `deploy.yml` использовать `cloudflared access ssh --hostname ssh.norskkurs.xyz` как ProxyCommand.
   - Это даст полноценный деплой **из GitHub** через Cloudflare, но на практике уже есть рабочий вариант через cron на сервере.

2. **Tailscale**:
   - Пакет установлен, но сервис `tailscaled` не включён.
   - Нужно:
     - `sudo systemctl enable --now tailscaled`.
     - `sudo tailscale up --ssh --hostname=norskkurs --auth-key=...`.
     - После этого сервер будет доступен по Tailscale‑IP (100.x.y.z) для SSH.

3. **Cloudflare SSH Access‑app**:
   - Конфиг туннеля для SSH есть (`.cloudflared/config-ssh.yml`), процессы `cloudflared` запущены.
   - Не хватает Access‑приложения в Cloudflare Zero Trust для `ssh.norskkurs.xyz`, чтобы:
     - Можно было делать `cloudflared access login https://ssh.norskkurs.xyz`.
     - Использовать защищённый SSH через браузер/клиент.

4. **Безопасность секретов**:
   - В этой сессии использовались реальные токены (GitHub PAT, SSH‑ключ, Cloudflare/Tailscale).
   - Рекомендуется:
     - Отозвать использованный PAT в GitHub и создать новый при необходимости.
     - При необходимости пересоздать SSH‑ключи/токены Cloudflare и Tailscale и обновить их в менеджере паролей.
   - В репозитории секреты не хранятся; используются только GitHub Secrets и локальные файлы вне git.

## 6. Как продолжать работу

- Для обычной разработки:
  - Делаешь изменения → `git commit` → `git push origin main`.
  - Через 5 минут максимум прод на `https://norskkurs.xyz` автоматически обновится.

- Для отладки деплоя:
  - На сервере:
    - `cd /srv/norskkurs/Norskkurs`.
    - Ручной деплой: `./scripts/deploy.sh`.
    - Просмотр логов автодеплоя: `tail -n 100 /home/stanislav/norskkurs-auto-deploy.log`.
  - В GitHub:
    - Вкладка **Actions** — статус сборки Docker‑образов и попыток `Deploy`.

- Если хочешь довести до конца вариант с Cloudflare SSH и деплоем строго из GitHub Actions:
  - Настроить Cloudflare Access‑app и service token.
  - Обновить `deploy.yml`, чтобы SSH шёл через `cloudflared access ssh`.
  - После этого можно будет убрать/ослабить cron или оставить его как резервный механизм.

