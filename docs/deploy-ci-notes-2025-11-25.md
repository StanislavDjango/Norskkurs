# Norskkurs – заметки по CI‑деплою (GitHub Actions + Cloudflare Access)

Этот файл кратко фиксирует всё, что уже сделано вокруг автодеплоя через GitHub Actions и SSH‑туннель Cloudflare Access, и текущее состояние на 25.11.2025.

## 1. Рабочий автодеплой (cron на сервере)

- Код прод‑проекта: `/srv/norskkurs/Norskkurs`.
- Основной скрипт деплоя: `scripts/deploy.sh`:
  - делает `git fetch origin main` и сравнивает локальный SHA с `origin/main`;
  - при появлении новых коммитов жёстко синхронизируется с `origin/main`;
  - выполняет `docker compose pull/build`, миграции, `collectstatic` и поднимает стек (`db`, `backend`, `frontend`).
- Настроен cron для пользователя `stanislav`:
  - каждые 5 минут запускает `./scripts/deploy.sh` в `/srv/norskkurs/Norskkurs`;
  - лог: `/home/stanislav/norskkurs-auto-deploy.log`.
- Итог: **после любого `git push origin main` сервер в течение ≈5 минут сам подтягивает изменения и обновляет сайт**. Это основной рабочий механизм, он не зависит от GitHub Actions и Cloudflare Access.

## 2. Туннели Cloudflare (HTTP и SSH)

- HTTP/HTTPS туннель:
  - конфиг: `/etc/cloudflared/config.yml` (копия также в репо как `cf-config-main.yml`);
  - tunnel ID: основной HTTP‑туннель (`a40c36ff-...`);
  - ingress:
    - `norskkurs.xyz/api/*`, `norskkurs.xyz/admin/*` → `http://localhost:8000` (Django);
    - `www.norskkurs.xyz`, `norskkurs.xyz` (корень) → `http://localhost:5173` (фронт из Docker);
    - остальное → `http_status:404`.
- SSH‑туннель:
  - конфиг: `/srv/norskkurs/Norskkurs/.cloudflared/config-ssh.yml`;
  - tunnel ID: `7a1645c2-0b59-4a2e-b248-1919e1a89d23`;
  - ingress:
    - `ssh.norskkurs.xyz` → `ssh://localhost:22`.
- Оба туннеля подняты как systemd‑сервисы:
  - `cloudflared.service` → HTTP‑туннель;
  - `cloudflared-ssh.service` → SSH‑туннель;
  - оба включены (`enabled`) и автоматически переподнимаются при сбоях/перезагрузке.

## 3. GitHub Actions: workflow `.github/workflows/deploy.yml`

Текущий workflow делает следующее:

1. Срабатывает на:
   - `push` в ветку `main`;
   - ручной `workflow_dispatch`.
2. Шаги:
   - **Install cloudflared**:
     - скачивает и устанавливает `cloudflared-linux-amd64.deb` на раннер.
   - **Configure SSH**:
     - создаёт `~/.ssh`, пишет приватный ключ из `DEPLOY_SSH_KEY` в `~/.ssh/id_rsa`;
     - определяет, использовать ли Cloudflare Access, по наличию `CF_ACCESS_CLIENT_ID` и `CF_ACCESS_CLIENT_SECRET`;
     - если Access включён:
       - задаёт `Host deploy` с:
         - `HostName ssh.norskkurs.xyz`;
         - `User` = `DEPLOY_USER` (обычно `stanislav`);
         - `Port` = `DEPLOY_PORT` (по умолчанию `22`);
         - `IdentityFile ~/.ssh/id_rsa`;
         - `ProxyCommand env CF_ACCESS_CLIENT_ID=${CF_ACCESS_CLIENT_ID} CF_ACCESS_CLIENT_SECRET=${CF_ACCESS_CLIENT_SECRET} cloudflared access ssh --hostname ssh.norskkurs.xyz --loglevel debug --logfile /tmp/cloudflared-access.log`;
       - отключает строгую проверку known_hosts для упрощения;
     - если Access не включён:
       - ожидает прямой SSH на `DEPLOY_HOST`/`DEPLOY_PORT` (для этого сервера вариант фактически не работает, провайдер режет SSH).
   - **Run deploy script on server**:
     - выполняет:
       ```bash
       ssh deploy "
         cd \"${DEPLOY_APP_DIR:-/srv/norskkurs/Norskkurs}\" &&
         chmod +x ./scripts/deploy.sh &&
         APP_DIR=${DEPLOY_APP_DIR:-/srv/norskkurs/Norskkurs} ./scripts/deploy.sh
       "
       ```
   - **Dump cloudflared Access log** (debug):
     - всегда (даже при ошибке) если есть `/tmp/cloudflared-access.log`, показывает хвост (`tail -n 200`);
     - это даёт в логах Actions точную причину ошибки Access/SSH.
   - **Health check application**:
     - проверяет, что `https://norskkurs.xyz/` отвечает `200`:
       ```bash
       curl -f https://norskkurs.xyz/ -o /dev/null
       ```

## 4. Cloudflare Access: текущее состояние

- Access‑приложение для SSH:
  - имя: `SSH Norskkurs` (по данным API);
  - domain: `ssh.norskkurs.xyz`;
  - тип: `ssh`;
  - `aud` (audience) совпадает с тем, что Cloudflare возвращает в 403 JSON.
- Политики (policies) для этого приложения:
  - `Allow service token`:
    - `decision: allow`;
    - `include` содержит `service_token` с `token_id` токена `github-deploy`.
  - `Allow GitHub Deploy CI`:
    - `decision: allow`;
    - `include` содержит `service_token` с `token_id` токена `github-deploy-ci3`.
- Service tokens (по API):
  - `github-deploy`:
    - используется как основной/исходный токен (Client ID/Secret известны пользователю, показаны в UI);
  - `github-deploy-ci3`:
    - был создан для CI‑деплоя, привязан отдельной политикой.
- GitHub Secrets:
  - для `CF_ACCESS_CLIENT_ID`/`CF_ACCESS_CLIENT_SECRET` по ходу работы несколько раз обновлялись значения:
    - сначала — на “чистые” ID/secret без префиксов, взятые из UI;
    - затем — на значения из API для `github-deploy-ci3`;
    - в конце — возвращены на исходные значения токена `github-deploy` (Client ID/Secret, которые пользователь прислал ассистенту).

## 5. Ошибка `websocket: bad handshake` и что уже сделано для диагностики

- Типичная ошибка в логах GitHub Actions сейчас:
  - на шаге `Run deploy script on server`:
    - `websocket: bad handshake`;
    - `Connection closed by UNKNOWN port 65535`;
    - `Process completed with exit code 255`.
- После включения `--loglevel debug --logfile /tmp/cloudflared-access.log` в ProxyCommand, в `Deploy` видно детальный лог `cloudflared`:
  - пример:
    ```json
    {"level":"debug","time":"2025-11-25T15:55:48Z","message":"Websocket request: GET / HTTP/1.1\r\nHost: ssh.norskkurs.xyz\r\nUser-Agent: cloudflared/2025.11.1\r\n\r\n"}
    {"level":"error","error":"websocket: bad handshake","originURL":"https://ssh.norskkurs.xyz","time":"2025-11-25T15:55:49Z","message":"failed to connect to origin"}
    ```
  - это означает:
    - GitHub‑runner успешно запускает `cloudflared access ssh`;
    - WebSocket‑запрос уходит к `https://ssh.norskkurs.xyz`;
    - Cloudflare Access отвечает не `101 Switching Protocols` (обычно 403/404), и cloudflared падает.
- Прямая проверка похожей команды с сервера:
  - при попытке `cloudflared access ssh --hostname ssh.norskkurs.xyz --url ssh://localhost:22` лог показывает, что доходит до запуска локального слушателя и упирается в права на порт 22;
  - это подтверждает, что туннель и Access в принципе работают, а “узкое место” — именно авторизация/политики Access для запросов с GitHub.
- Чтение Access‑логов через REST (`/access/logs/access_requests`) в текущей конфигурации аккаунта возвращает пустой `result`, поэтому расшифровать причину отказа (какая policy/решение) можно только через:
  - включение Logpush для `zero_trust_access_requests` в UI;
  - или просмотр Access Logs в панели Zero Trust.

## 6. Итоговая картина по деплою

- **Рабочий и используемый вариант**:
  - cron‑деплой на сервере (`scripts/deploy.sh` каждые 5 минут) — обновляет сайт при любом `git push origin main`.
- **GitHub Actions‑деплой**:
  - workflow готов и синхронизирован с Cloudflare Access (туннель, домен, service‑tokens, GitHub Secrets);
  - добавлен health‑check и debug‑лог `cloudflared` в job;
  - текущая проблема — `websocket: bad handshake` от Access‑приложения `ssh.norskkurs.xyz`, причиной которого можно заняться позже через UI Cloudflare (Access Logs или Logpush).
- Этот файл можно использовать как компактный конспект по состоянию CI‑деплоя и точку старта для следующего этапа настройки Cloudflare Access, когда будет время/желание довести GitHub Actions‑деплой до зелёного состояния.

