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
- Фронтенд: переработан глоссарий — добавлена страница `GlossaryPage` с тем же стилем, что у глаголов (алфавит, теги, поиск, 4 колонки Bokmål/Nynorsk/English/Russian без кнопки примеров), глоссарий на фронте теперь берёт данные из API `/glossary/` без фильтра по уровню.
- Фронтенд: на вкладке «Lesing» добавлен «липкий» поиск по словарю, который всегда виден при прокрутке. Поиск ходит в `/glossary/` и показывает компактную строку с четырьмя вариантами перевода (NB/NN/EN/RU) для найденного слова; при большом числе результатов есть скролл внутри панели.
- Фронтенд: для чтений переработан UI — карточки выводятся по одной в ряд, добавлена кнопка «Читать текст», открывающая модальное окно с крупным, хорошо читаемым текстом и вкладками перевода; под каждой карточкой также есть блок перевода с теми же табами.
- Переводы чтений: модель `Reading` расширена полями `translation_nb` и `translation_nn`; для примера создан один текст `Evening walk in the city` (English, A1) с переводами на RU, NB и NN, остальные чтения очищены миграцией `0017_reading_multilang_and_reset`.
- Фронтенд: логика перевода в чтениях теперь умеет переключаться между EN/RU (для норвежских текстов) и NB/RU (для английских) как в карточках, так и в модальном окне; выбранный язык запоминается по `reading.id`.
- Админка Readings: добавлен экспорт/импорт текстов в CSV (кнопки `Download CSV template` и `Import CSV` на странице списка). CSV включает поля `slug,title,stream,level,tags,body,translation,translation_nb,translation_nn,is_published`; поддерживается обновление существующих записей по `slug`.
- Глоссарий: обновлены утилиты CSV — из экспорта убраны поля `level` и `explanation`, импорт уровня теперь заполняет default A1, так что для учителя достаточно заполнять термины и переводы.
- В нескольких местах подправлены стили (sticky-заголовок глоссария, мобильный вид таблиц, новые стили `reading-*`), все изменения проверены сборкой фронтенда через `docker compose up --build -d` (tsc + vite).

## 2025-12-02

- AGENTS: добавлены инструкции для Codex про работу только из WSL-копии (`~/Norskkurs`), запуск Docker-команд через `wsl -d Ubuntu bash -lc 'cd ~/Norskkurs && …'`, запрет UNC-путей `\\wsl$` как build context и неиспользование `&&` в PowerShell.
- Backend Readings: модель `Reading` расширена полями `translation_en`, `translation_nb`, `translation_nn`, `translation_ru` (старое поле `translation` переименовано в `translation_ru` миграцией `0018_reading_translation_en_and_ru_rename`). В CSV-утилитах чтений экспорт/импорт обновлён под новые поля с обратной совместимостью по старому столбцу `translation`.
- Backend Readings: добавлены поля заголовков по языкам `title_en/title_nb/title_nn/title_ru` (миграция `0019_reading_title_multilang` автозаполняет их из существующего `title` в зависимости от `stream`). Админка `ReadingAdmin` показывает явные лейблы для заголовков и переводов на EN/NB/NN/RU.
- Frontend Readings UI: переработан модальный текст чтения — мягкий книжный шрифт (Georgia), тёплый фон карточки, увеличенный line-height и ограниченная ширина строки (`max-width: 70ch`). Цвет текста чуть осветлён для комфортного чтения.
- Frontend Readings UI: для списка чтений и модалки введена логика выбора «основного» текста по текущему потоку (`stream` сверху): при Bokmål показывается NB-версия, при Nynorsk — NN, при English — EN; остальные языки доступны как вкладки перевода. Заголовки чтений также локализуются через новые поля `title_en/nb/nn/ru` с fallback на оригинальный `title`.
- Frontend Readings: быстрый поиск по глоссарию (`/glossary/`) теперь подсвечивает искомую подстроку (NB/NN/EN/RU) внутри найденных слов (`<mark>` с мягким фоном) как в панели над списком, так и в модальном окне чтения.
- Frontend Readings: быстрый поиск слов (input) добавлен и в модальное окно чтения — студент может, не закрывая текст, искать незнакомые слова; результаты выводятся под полем с тем же форматированием, что и на основной странице.
- Frontend Readings: добавлены вкладки перевода EN/NB/NN/RU в карточках и модалке; набор кнопок и тексты зависят от исходного `stream`, а не от жёсткого условия `stream === "english"`.
- Личный словарик (frontend): реализованы «избранные слова» поверх глоссария без бэкенда — добавлено состояние `vocabFavorites` с сохранением в `localStorage` (`norskkurs_vocab_favs`). В результатах поиска (Readings + модалка) и в таблице глоссария у каждой строки появилась звёздочка `★`, кликом по которой слово добавляется/убирается из личного списка; состояние синхронизировано между страницей чтений и глоссарием.
- GlossaryPage: добавлен переключатель вида `All words` / `My words` (`vocabTabs` в i18n). При выборе `My words` таблица глоссария показывает только те строки, ID которых есть в `vocabFavorites`. В первой колонке строки глоссария отображается звезда с тем же состоянием, что и в поиске.
- Readings → Glossary навигация: в правой части заголовка блока «Читать рассказы» добавлена кнопка «Мой словарик»; при нажатии открывается вкладка `Ordliste` сразу в режиме `My words` (с фильтром по личному словарю), что позволяет быстро перейти к повторению сохранённых слов.
- Frontend i18n: добавлены новые ключи `vocabTabs.all/favorites` и `readings.myWordsButton` для EN/NB/RU; все изменения проверены сборкой фронтенда через `docker compose up --build -d frontend` (tsc + vite).
