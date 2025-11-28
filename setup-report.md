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

Применить настройки профиля: открыть новую сессию PowerShell. Для Unix-утилит можно использовать новую сессию PowerShell (после обновления профиля) или Git Bash/WSL.
