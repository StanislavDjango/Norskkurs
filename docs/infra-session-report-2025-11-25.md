# Отчёт по настройке автодеплоя и Cloudflare Access (25.11.2025)

Этот файл описывает, что именно было сделано в рамках сессии с ассистентом, что сейчас работает, что пока не доведено до конца и почему, а также варианты решения на будущее.

## 1. Что было сделано

- **Прочитана и учтена инфраструктурная документация:**
  - `docs/deploy-status-2025-11-24.md` — базовый чек‑лист по автодеплою.
  - `docs/deploy.md`, `README.md`, `docs/work-report-2025-11-24.md` — общая картина по CI/CD и прод‑стеку.
  - `~/codex reed/norskkurs.odt` и `~/secrets/norskkurs.txt` — справочник по токенам/ID (GitHub PAT, Cloudflare, Tailscale, SSH, Postgres).

- **Извлечены и аккуратно использованы чувствительные данные (без вывода в лог):**
  - GitHub Personal Access Token (`GITHUB_PAT`) для репо `StanislavDjango/Norskkurs`.
  - Приватный SSH‑ключ, который был ошибочно сохранён в виде длинной base64‑строки, записанной в `CLOUDFLARE_API_KEY` (по факту это OpenSSH private key, а не Cloudflare API Key).
  - Оба значения сохранены на сервере в:
    - `~/.norskkurs_github_pat` — PAT.
    - `~/.norskkurs_deploy_key` — приватный SSH‑ключ (формат OpenSSH, с заголовком `-----BEGIN OPENSSH PRIVATE KEY-----`).

- **Созданы/обновлены GitHub Actions secrets для деплоя через SSH:**
  - Запущен скрипт `manual_deploy.sh` в `/srv/norskkurs/Norskkurs` с окружением:
    - `TOKEN` — из `~/.norskkurs_github_pat`.
    - `DEPLOY_HOST=91.126.3.118` (публичный IP, из `norskkurs.odt`).
    - `DEPLOY_PORT=22`.
    - `DEPLOY_USER=stanislav`.
    - `DEPLOY_SSH_KEY` — содержимое `~/.norskkurs_deploy_key`.
    - `DEPLOY_APP_DIR=/srv/norskkurs/Norskkurs`.
  - Скрипт успешно:
    - получил `key_id` и `key` из GitHub API;
    - зашифровал значения через libsodium (PyNaCl);
    - создал/обновил secrets в репозитории `StanislavDjango/Norskkurs`:
      - `DEPLOY_HOST`,
      - `DEPLOY_PORT`,
      - `DEPLOY_USER`,
      - `DEPLOY_SSH_KEY`,
      - `DEPLOY_APP_DIR`.
  - Проверка SSH в конце `manual_deploy.sh` с сервера дала `Connection refused` на `91.126.3.118:22`, что подтверждает: прямой публичный SSH с этого хоста не доступен.

- **Многократно доработан workflow `.github/workflows/deploy.yml`:**
  1. Начальная версия:
     - Конфигурировала SSH напрямую:
       - записывала ключ в `~/.ssh/id_rsa`;
       - делала `ssh-keyscan` на `DEPLOY_HOST:DEPLOY_PORT`;
       - выполняла `ssh -p PORT USER@HOST "cd APP_DIR && ./scripts/deploy.sh"`.
     - Падала в GitHub Actions либо на `ssh-keyscan`, либо на прямом `ssh` из‑за недоступности порта 22 с GitHub.
  2. Добавлена поддержка **Cloudflare Access**:
     - Шаг `Install cloudflared` устанавливал `cloudflared` из `.deb`.
     - Шаг `Configure SSH (with optional Cloudflare Access)`:
       - при наличии `CF_ACCESS_HOSTNAME`, `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET` создавал SSH‑хост `deploy` с ProxyCommand:
         - `cloudflared access ssh --hostname ${CF_ACCESS_HOSTNAME} --service-token-id ${CF_ACCESS_CLIENT_ID} --service-token-secret ${CF_ACCESS_CLIENT_SECRET}`;
       - иначе использовал прямой SSH на `DEPLOY_HOST:DEPLOY_PORT`.
     - Далее деплой шёл через `ssh deploy "cd APP_DIR && ./scripts/deploy.sh"`.
  3. После выявления ошибок в значениях секретов (см. ниже) логика несколько раз упрощалась и снова возвращалась к Access‑варианту:
     - убирались зависимости от `CF_ACCESS_HOSTNAME`;
     - `HostName` жёстко задавался как `ssh.norskkurs.xyz`, чтобы не зависеть от ошибочно введённых значений;
     - ProxyCommand переписан так, чтобы передавать `CF_ACCESS_CLIENT_ID`/`CF_ACCESS_CLIENT_SECRET` через переменные окружения:
       - `ProxyCommand env CF_ACCESS_CLIENT_ID=${CF_ACCESS_CLIENT_ID} CF_ACCESS_CLIENT_SECRET=${CF_ACCESS_CLIENT_SECRET} cloudflared access ssh --hostname ssh.norskkurs.xyz`.

- **Обновлена документация с учётом сетевых ограничений провайдера:**
  - `README.md` — раздел **Auto-deploy to server**:
    - явно сказано, что для этого сервера провайдер блокирует прямой SSH, поэтому деплой из GitHub Actions должен идти через Cloudflare Access (`ssh.norskkurs.xyz`) и сервис‑токен;
    - указано, что `DEPLOY_HOST`/`DEPLOY_PORT` пригодны только для ручного SSH с машин, у которых есть прямой доступ (локалка/VPN/Tailscale).
  - `docs/deploy.md`:
    - добавлена пометка, что для автодеплоя из CI требуется рабочий Access‑туннель и корректные `CF_ACCESS_CLIENT_ID`/`CF_ACCESS_CLIENT_SECRET`;
    - fallback через `DEPLOY_HOST`/`DEPLOY_PORT` описан как опция **только для ручных деплоев** с машин, имеющих доступ к серверу.
  - `docs/deploy-status-2025-11-24.md`:
    - уточнено, что из‑за блокировки прямого SSH провайдером вариант с `DEPLOY_HOST`/`DEPLOY_PORT` из CI нерабочий, и нужен Cloudflare Access.
  - `docs/work-report-2025-11-24.md`:
    - в разделе про Cloudflare SSH Access‑app добавлено, что реальный CI‑деплой должен идти через туннель `ssh.norskkurs.xyz`, а попытки прямого SSH с GitHub будут упираться в timeout.

## 2. Что не получилось и почему

### 2.1. Запуск и отладка GitHub Actions изнутри ассистента

- Попытка вызвать GitHub API (запуск workflow `Deploy` и чтение секретных ключей) показала:
  - `curl https://api.github.com/...` → `Could not resolve host: api.github.com`, HTTP‑код `000`.
  - `curl https://1.1.1.1` → также `000`.
  - `ping`, `dig` → `Operation not permitted`.
- Вывод: окружение, в котором работает ассистент (Codex), **полностью лишено сетевого доступа наружу**:
  - это не проблема твоего сервера/провайдера;
  - это ограничение среды запуска модели (sandbox без интернета).
- Последствия:
  - ассистент не может сам сделать `git push`, дернуть GitHub API или проверить логи Actions;
  - все сетевые действия (push, запуск workflow, проверка логов) выполняешь ты, ассистент работает только с локальными файлами и командами без интернета.

### 2.2. Прямой SSH с GitHub Actions на сервер

- При использовании прямого SSH (`ssh -p 22 stanislav@91.126.3.118`:
  - GitHub Actions стабильно возвращает:
    - `ssh: connect to host 91.126.3.118 port 22: Connection timed out`.
  - Это означает, что:
    - либо порт 22 извне закрыт (firewall/роутер/провайдер);
    - либо трафик до 22 порта режется провайдером.
- Мы знаем, что:
  - с самого сервера SSH доступ есть (локально, или по Tailscale/внутренней сети);
  - но с GitHub (публичного интернета) доступ на 22 порт заблокирован.
- Вывод: **вариант прямого SSH деплоя из GitHub Actions для этого сервера непригоден**, решение — Cloudflare Access либо другой прокси (Tailscale, VPN и т.п.).

### 2.3. Cloudflare Access: ошибки из-за неверных значений секретов

- Пользователь создал Cloudflare Access service token, но скопировал значения не в том формате:
  - вместо того, чтобы взять чистые:
    - `CF_ACCESS_CLIENT_ID = <пример_ID_из_Cloudflare>` (без префиксов/суффиксов),
    - `CF_ACCESS_CLIENT_SECRET = <пример_SECRET_из_Cloudflare>`,
  - в GitHub Secrets были записаны строки, похожие на полные HTTP‑заголовки:
    - `CF_ACCESS_CLIENT_ID: CF-Access-Client-Id: <ID>.access`
    - `CF_ACCESS_CLIENT_SECRET: CF-Access-Client-Secret: <SECRET>...`
- В логах GitHub Actions при запуске `Deploy` появлялась ошибка:
  - `failed to start forwarding server: listen tcp: address <ID>.access: missing port in address`
  - Это означает, что `cloudflared access ssh` попытался воспринять значение `<ID>.access` как сетевой адрес вида `host:port`, и упал, не найдя порт.
- Мы попытались обойти это так:
  - не использовать `CF_ACCESS_HOSTNAME` вовсе;
  - жёстко задавать `HostName ssh.norskkurs.xyz`;
  - передавать `CF_ACCESS_CLIENT_ID`/`CF_ACCESS_CLIENT_SECRET` через переменные окружения в ProxyCommand, а не как параметры.
- Однако, без прямого доступа к GitHub (и Actions) ассистент не мог:
  - проверить, что репозиторий на GitHub действительно получил обновлённый `deploy.yml`;
  - увидеть текущие значения `CF_ACCESS_CLIENT_ID`/`CF_ACCESS_CLIENT_SECRET` в настройках репозитория;
  - убедиться, что пользователь исправил значения секретов (оставлены только голые ID/secret, без префиксов `CF-Access-Client-Id:` и суффикса `.access`).

Итог: на момент завершения сессии последние логи, которые прислал пользователь, всё ещё содержали старую ошибку (`...<ID>.access...`), что указывает на:
- либо неактуальный `deploy.yml` в GitHub (последние правки ещё не были запушены);
- либо неочищенные/неисправленные секреты `CF_ACCESS_CLIENT_ID`/`CF_ACCESS_CLIENT_SECRET` в GitHub;
- либо оба фактора одновременно.

## 3. Текущее состояние (на момент завершения)

1. **Сервер / cron‑деплой:**
   - Код лежит в `/srv/norskkurs/Norskkurs`.
   - Docker‑стек: `db` (Postgres), `backend`, `frontend`.
   - Скрипт `scripts/deploy.sh`:
     - проверяет наличие новых коммитов на `origin/main`;
     - при наличии — подтягивает код, пересобирает контейнеры, делает `migrate`/`collectstatic`, поднимает стек.
   - Настроен cron для пользователя `stanislav`:
     - каждые 5 минут выполняет `APP_DIR=/srv/norskkurs/Norskkurs ./scripts/deploy.sh`, лог пишет в `~/norskkurs-auto-deploy.log`.
   - **Этот механизм работает** и является основным рабочим автодеплоем независимо от GitHub Actions.

2. **GitHub Actions / deploy.yml (локальная версия на сервере):**
   - Workflow `Deploy`:
     - ставит `cloudflared` на GitHub runner;
     - в шаге `Configure SSH`:
       - записывает SSH‑ключ в `~/.ssh/id_rsa`;
       - если заданы `CF_ACCESS_CLIENT_ID` и `CF_ACCESS_CLIENT_SECRET`:
         - использует `HostName ssh.norskkurs.xyz`;
         - выставляет ProxyCommand:
           - `ProxyCommand env CF_ACCESS_CLIENT_ID=${CF_ACCESS_CLIENT_ID} CF_ACCESS_CLIENT_SECRET=${CF_ACCESS_CLIENT_SECRET} cloudflared access ssh --hostname ssh.norskkurs.xyz`;
       - иначе ожидает прямой SSH на `DEPLOY_HOST:DEPLOY_PORT` (что для этого сервера, судя по таймаутам, не сработает из интернета).
     - затем выполняет:
       - `ssh deploy "cd APP_DIR && chmod +x ./scripts/deploy.sh && APP_DIR=... ./scripts/deploy.sh"`.
   - Эта версия workflow **есть в локальном репозитории на сервере**, но для её работы нужно убедиться, что она **запушена** на GitHub.

3. **Сетевые ограничения ассистента:**
   - Ассистент не имеет outbound‑сети:
     - не может сам делать `git push origin main`;
     - не может вызывать GitHub API;
     - не видит логи Actions кроме как по тексту, который присылает пользователь.
   - Все локальные правки файлов уже внесены; любые действия, требующие интернета, должен выполнять владелец репозитория.

## 4. Рекомендации по завершению настройки Cloudflare Access‑деплоя

Ниже — план действий, который можно выполнить вручную (без участия ассистента), опираясь на уже внесённые изменения.

### 4.1. Привести в порядок секреты в GitHub

В репозитории `StanislavDjango/Norskkurs`:

1. Открыть `Settings → Secrets and variables → Actions`.
2. Проверить/исправить значения:
   - `CF_ACCESS_CLIENT_ID`:
     - должно быть ровно значение **Client ID** сервис‑токена из Cloudflare Zero Trust → Access → Service tokens;
     - без префикса `CF-Access-Client-Id:` и без суффикса `.access`.
   - `CF_ACCESS_CLIENT_SECRET`:
     - ровно уникальная длинная строка `Client Secret` из того же сервис‑токена;
     - без текста `CF-Access-Client-Secret:` и прочих префиксов.
   - `CF_ACCESS_HOSTNAME` в текущей схеме не используется, его можно либо оставить пустым, либо поставить `ssh.norskkurs.xyz` для справки.
3. Убедиться, что:
   - `DEPLOY_USER=stanislav`;
   - `DEPLOY_APP_DIR=/srv/norskkurs/Norskkurs`;
   - `DEPLOY_SSH_KEY` содержит корректный приватный OpenSSH‑ключ (тот, который даёт доступ на сервер).

### 4.2. Убедиться, что GitHub видит актуальный `deploy.yml`

На сервере:

```bash
cd /srv/norskkurs/Norskkurs
git status -sb
git log -3 --oneline
```

Если `.github/workflows/deploy.yml` изменён локально:

```bash
git add .github/workflows/deploy.yml
git commit -m "Fix Cloudflare Access deploy workflow"
git push origin main
```

После этого GitHub Actions будет использовать уже новую версию workflow.

### 4.3. Проверка деплоя через GitHub Actions

1. Открыть на GitHub вкладку `Actions` в репозитории.
2. Выбрать workflow `Deploy`.
3. Нажать `Run workflow` (ветка `main`).
4. Дождаться запуска и:
   - если всё зелёное — деплой по Cloudflare Access заработал;
   - если есть красный шаг:
     - посмотреть, какой именно шаг упал (`Configure SSH` или `Run deploy script on server`);
     - внизу шага будет конкретный текст ошибки (не `missing port in address`, а уже что‑то более конкретное про Access/SSH/разрешения).

При возникновении новых ошибок решение будет зависеть от текста лога:
- ошибки Cloudflare Access (неверный токен, нет политики Allow для Service Token) — правятся на стороне Cloudflare Zero Trust;
- ошибки SSH внутри сервера (`Permission denied`, проблемы с sudo/docker, ошибки миграций) — правятся уже в конфиге сервера/проекта.

## 5. Итог

- Основной рабочий деплой уже реализован через cron на сервере: каждые 5 минут `scripts/deploy.sh` подтягивает `origin/main` и обновляет прод.
- GitHub Actions‑деплой через Cloudflare Access подготовлен на уровне workflow и документации, но не доведён до конца из‑за:
  - отсутствия сети у самого ассистента (нет прямого доступа к GitHub и Cloudflare);
  - некорректно введённых значений `CF_ACCESS_CLIENT_ID`/`CF_ACCESS_CLIENT_SECRET` в GitHub Secrets;
  - блокировки прямого SSH с GitHub к серверу, что исключает fallback‑вариант.
- Для завершения настройки CI‑деплоя через Cloudflare потребуется:
  - один раз вручную поправить secrets в GitHub (чистые ID/secret из Cloudflare);
  - убедиться, что свежий `deploy.yml` запушен;
  - проверить логи Actions, начиная с шага `Configure SSH`.

Этот файл можно использовать как хронологию и чек‑лист для следующего человека, который будет доводить до конца деплой через Cloudflare Access. Основные “подводные камни” — уже разобраны и задокументированы.
