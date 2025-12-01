## 2025-11-28

- Профиль PowerShell `C:\Users\stas\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1` обновлён: UTF-8 (chcp 65001, OutputEncoding, Out-File/Set-Content), `PYTHONIOENCODING=utf-8`, добавлен Git Unix-путь `C:\Program Files\Git\usr\bin` в `PATH` для `sed`, `ls`, `cat` и др. из Git for Windows.
- Проверено наличие Git Bash (`bash --version` OK).
- Node уже стоит `v22.12.0`; выполнен `npm install` в `frontend` (зависимости актуальны).
- Проверен GNU sed из Git for Windows: `/usr/bin/sed (GNU sed) 4.9`.
- Подготовлена WSL2: Ubuntu уже была, проект скопирован в Linux-ФС для скорости — `~/Norskkurs` (копия из `/mnt/e/Norskkurs`, затем удалён `.venv`). Итоговый размер копии ~280 МБ. Можно работать либо в WSL по пути `~/Norskkurs`, либо на Windows в `E:\Norskkurs`.
- В WSL контейнеры остановлены: `docker compose down` в `~/Norskkurs` (предупреждение о поле `version` остаётся). `docker ps` пуст.
- В Windows контейнеры старого сайта остановлены: из `E:\Norskkurs` выполнен `docker compose down`; дополнительно остановлен `saytnorsk_frontend`. Текущий `docker ps` пуст.
- 16:55 подняты контейнеры в WSL: `docker compose up --build -d` в `~/Norskkurs` (предупреждение про `version` в compose). Статус: backend Up (127.0.0.1:8000), frontend Up (0.0.0.0:5173), db healthy.
- Исправлен перевод меню (ru `nav.dashboard` → «Читать рассказы»), пересобран frontend-образ в WSL (`docker build -t stanyslav/norskkurs-frontend:latest frontend`), перезапущен frontend (`docker compose up -d frontend`). Теперь локальный образ с обновлёнными строками.
- Добавлен Makefile с удобными целями (`up`, `down`, `ps`, `logs`, `backend-test`, `frontend-build`, `install-*`).
- В WSL поставлен nvm + Node 22.21.1 (`~/.nvm`, alias default 22); выполнен `npm install` в `~/Norskkurs/frontend`.
- В `~/.bashrc` добавлены алиасы: `dcu/dcd/dps/dcl` (docker compose из `~/Norskkurs`), `mkproj` (make в корне проекта).
- Установлен `python3.12-venv` (WSL), создан venv в `~/Norskkurs/.venv`, установлены зависимости `pip install -r backend/requirements.txt`.
- Установлен direnv (`apt-get install direnv`), в `~/.bashrc` добавлен hook; добавлен `.envrc` для активации `.venv` через `layout activate`.
- Настроен pre-commit: установлен в venv (`pip install pre-commit black isort`), добавлен `.pre-commit-config.yaml` и выполнен `pre-commit install`.
- Frontend: добавлены ESLint/Prettier конфиги (`frontend/.eslintrc.cjs`, `.prettierrc`), скрипты `npm run lint/format`, обновлены devDependencies; `npm install` выполнен (package-lock обновлён).
- VS Code: обновлён `.vscode/settings.json` (format on save, Prettier как форматтер для JS/TS, включён для Python).
- Direnv: в копии `/home/strengerst/Norskkurs` скопирован `.envrc` (из `/mnt/e/Norskkurs`) и разрешён `direnv allow` — venv активируется автоматически при входе.
- Добавлен раздел чтений: модель `Reading` + API `/api/readings/` (list/retrieve по slug), сиды с тремя текстами (bokmål, nynorsk, english) и переводом; админка `Readings` для учителя. Фронт: вкладка «Читать рассказы» с кнопкой показа перевода.
- Docker-compose: frontend теперь собирается из `./frontend` с `VITE_API_BASE_URL=http://backend:8000/api/` (build args + env), чтобы фронт ходил на локальный backend.
- Глоссарий: добавлен поиск по `q`, уровень больше не фильтрует выдачу; добавлены сиды 0010–0012. Проблема «пустой словарь» решена обновлением WSL-копии до `origin/main` (где есть миграция 0012_seed_glossary_extras) и применением миграций в контейнере (`docker compose exec backend python manage.py migrate`).

Применить настройки профиля: открыть новую сессию PowerShell. Для Unix-утилит можно использовать новую сессию PowerShell (после обновления профиля) или Git Bash/WSL.

## 2025-12-01

- В Windows-копии проекта выполнен `docker compose down` из `E:\Norskkurs` — фронтенд/бэкенд/БД, поднятые оттуда, полностью остановлены. Рабочей считается только копия в WSL по пути `~/Norskkurs` (`\\wsl$\Ubuntu\home\strengerst\Norskkurs`).
- В WSL запущен dev-фронтенд: `cd ~/Norskkurs/frontend && npm run dev` (через `nohup`, командой `wsl -d Ubuntu bash -lc 'cd ~/Norskkurs/frontend && nohup npm run dev > ../frontend-dev.log 2>&1 &'`). Теперь интерфейс доступен на `http://localhost:5173` именно из WSL-копии.
- Для дальнейшей разработки фронтенда и бэкенда использовать только репозиторий в `\\wsl$\Ubuntu\home\strengerst\Norskkurs`; копию `E:\Norskkurs` не трогать, чтобы избежать рассинхронизации.
- Причина, по которой раньше не были видны изменения во фронтенде: браузер открывал `http://localhost:5173` из контейнера/сборки, запущенной из Windows-копии `E:\Norskkurs`, тогда как правки вносились в WSL-копию `~/Norskkurs`. После переключения на WSL-копию и пересборки контейнера фронтенд подхватывает актуальный код.
- Типичные симптомы ошибки: изменения в коде (особенно React/TS) видны в `\\wsl$\Ubuntu\home\strengerst\Norskkurs`, но UI в браузере не меняется, либо меняется только после docker build в Windows-каталоге. В этом случае нужно проверить, откуда запущен фронтенд.
- Проверка правильного окружения:
  - В PowerShell выполнить `wsl -d Ubuntu bash -lc 'cd ~/Norskkurs && docker ps'` и убедиться, что контейнер `norskkurs-frontend-1` слушает `0.0.0.0:5173`.
  - Убедиться, что в каталоге `E:\Norskkurs` **не** запущен `docker compose up` или локальный `npm run dev`.
- Если снова «не видно изменений»:
  1. Остановить всё в Windows-копии: `cd E:\Norskkurs && docker compose down`.
  2. В WSL пересобрать и поднять стек: `cd ~/Norskkurs && docker compose up --build -d`.
  3. Открывать сайт только по адресу `http://localhost:5173`, зная, что он отдаётся из WSL-проекта.
