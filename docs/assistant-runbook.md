# Assistant Runbook (Windows + WSL) — Norskkurs

Цель: чтобы любые “чат‑боты/ассистенты” не попадали в типовую ловушку Windows PowerShell + UNC (`\\wsl$...`) + смешение Windows/WSL Node.js.

## TL;DR (самое важное)

1) Рабочая копия проекта: **только** WSL: `~/Norskkurs`.
2) **Никогда** не используйте UNC‑путь `\\wsl$\Ubuntu\home\strengerst\Norskkurs` как рабочую директорию/контекст запуска команд.
3) Любую команду из PowerShell запускайте через:

```bash
wsl -d Ubuntu bash -lc 'cd ~/Norskkurs && <команда>'
```

4) Frontend build запускайте так, чтобы гарантированно использовался **WSL Node**, а не Windows npm:

```bash
wsl -d Ubuntu bash -lc 'PATH=/home/strengerst/.nvm/versions/node/v22.21.1/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin; cd ~/Norskkurs/frontend; npm run build'
```

## Почему ломается (простыми, но техническими словами)

### 1) PowerShell в `\\wsl$...` → `cmd.exe` → `C:\Windows\System32`
Если PowerShell открыт в каталоге `\\wsl$\...`, то при запуске `wsl -d Ubuntu bash -lc '...'` Windows может стартовать команду через `cmd.exe`.
`cmd.exe` не поддерживает UNC‑пути и молча переключает текущую папку на `C:\Windows\System32`.
В результате любые относительные пути в командах оказываются “не в проекте”.

**Симптомы**
- В логах видно: `CMD.EXE не поддерживает пути UNC... выбрана системная папка Windows`.
- `npm run build` “не видит” проект и падает странными ошибками.

**Фикс**
- Держать PowerShell в обычном Windows‑пути (например, `C:\Users\stas`), или
- Всегда делать `cd` **внутри** WSL, как в TL;DR.

### 2) Смешение Windows npm и WSL node
В WSL может “подцепиться” Windows `npm` через `/mnt/c/...`, а при этом `node` в Linux PATH отсутствует.
Итог: сборка падает на `tsc`/Vite, либо на `/usr/bin/env: 'node': No such file or directory`.

**Симптомы**
- `command -v npm` показывает `/mnt/c/...`
- `node --version` не находится
- `/usr/bin/env: ‘node’: No such file or directory`

**Фикс (надёжный)**
- Жёстко задавать минимальный `PATH`, где первым стоит `~/.nvm/.../bin` (см. TL;DR).

Почему “минимальный PATH”: если подставлять `$PATH`, он может включать Windows‑пути со **спецсимволами/пробелами** (например, `Program Files (x86)`), и в `bash -lc` это легко ломает команду, если строка не процитирована идеально.

## Канонические команды (для ботов/ассистентов)

### Поиск по коду (если `rg` не установлен)
```bash
wsl -d Ubuntu bash -lc 'cd ~/Norskkurs && grep -RIn --exclude-dir=node_modules --exclude-dir=dist -- "<PATTERN>" frontend/src backend'
```

### Сборка frontend (обязательная проверка)
```bash
wsl -d Ubuntu bash -lc 'PATH=/home/strengerst/.nvm/versions/node/v22.21.1/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin; cd ~/Norskkurs/frontend; npm run build'
```

### Docker Compose (только из WSL‑копии)
```bash
wsl -d Ubuntu bash -lc 'cd ~/Norskkurs && docker compose up --build -d'
wsl -d Ubuntu bash -lc 'cd ~/Norskkurs && docker compose exec backend python manage.py migrate'
wsl -d Ubuntu bash -lc 'cd ~/Norskkurs && docker compose exec backend python manage.py test exams'
```

### Список markdown‑файлов проекта (без node_modules/.venv/.git)
```bash
wsl -d Ubuntu bash -lc 'cd ~/Norskkurs && find . \( -path ./.git -o -path ./frontend/node_modules -o -path ./.venv -o -path ./backend/.venv \) -prune -o -type f -name \*.md -print'
```

## Диагностика “почему команда странно падает”

1) Убедиться, что команда делает `cd ~/Norskkurs` **внутри** `bash -lc`.
2) Для frontend: проверить, что `node` и `npm` из WSL:
   - `wsl -d Ubuntu bash -lc 'PATH=/home/strengerst/.nvm/versions/node/v22.21.1/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin; node --version; npm --version; command -v npm; command -v node'`
3) Если в выводе есть упоминание `CMD.EXE` и `UNC`, значит команда была запущена “не тем путём” (см. раздел про UNC).

## Политика изменений

- Не “чинить проект под песочницу”: если падают команды из‑за окружения (Docker не поднят, нет БД, нет правильного Node), сначала исправить запуск/окружение и только потом делать выводы о коде.
- Для UI‑правок обязательно прогонять `npm run build` (в WSL с корректным Node).
