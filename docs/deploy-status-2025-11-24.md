# Отчёт по автодеплою (24.11.2025)

## Что сделано
- Обновлён `.github/workflows/deploy.yml`: установка `cloudflared` из deb, SSH-конфиг с ProxyCommand через Cloudflare Access (`cloudflared access ssh`), алиас `Host deploy`, запуск `scripts/deploy.sh` в `DEPLOY_APP_DIR`.
- Обновлены `docs/deploy.md` (список секретов, чек-лист по Cloudflare Access) и `README.md` (описание, что деплойный SSH идёт через Access при наличии секретов).
- Проверено: cron на сервере остаётся бэкапом, каждые 5 минут запускает `scripts/deploy.sh` и обновляет прод при наличии новых коммитов.

## Что осталось сделать (требует действий в UI Cloudflare/GitHub)
- В Cloudflare Zero Trust:
  1. Access → Applications → Create self-hosted app `ssh.norskkurs.xyz` (привязать к существующему SSH-туннелю).
  2. В приложении добавить Policy типа Allow, условие — Service Token.
  3. Access → Service tokens → Create token → скопировать Client ID и Client Secret (показываются один раз).
- В GitHub Secrets (repo `StanislavDjango/Norskkurs` → Settings → Secrets → Actions) добавить/обновить:
  - `DEPLOY_USER` = `stanislav`
  - `DEPLOY_SSH_KEY` = приватный SSH-ключ с доступом на сервер (OpenSSH)
  - `DEPLOY_APP_DIR` = `/srv/norskkurs/Norskkurs`
  - `CF_ACCESS_HOSTNAME` = `ssh.norskkurs.xyz`
  - `CF_ACCESS_CLIENT_ID` = (Client ID из сервис-токена)
  - `CF_ACCESS_CLIENT_SECRET` = (Client Secret из сервис-токена)
  - (опционально как резерв без Access) `DEPLOY_HOST` = `91.126.3.118`, `DEPLOY_PORT` = `22`

Важное сетевое ограничение: интернет‑провайдер этого сервера блокирует прямой SSH снаружи, поэтому вариант деплоя из GitHub Actions через `DEPLOY_HOST`/`DEPLOY_PORT` фактически не работает. Для CI‑деплоя нужно использовать Cloudflare Access‑туннель `ssh.norskkurs.xyz` с корректными `CF_ACCESS_CLIENT_ID`/`CF_ACCESS_CLIENT_SECRET`.

## Как проверить
- В GitHub Actions запустить workflow `Deploy` вручную (`workflow_dispatch`) или сделать `git push main` и посмотреть логи: должен установиться `cloudflared`, подняться SSH через Access и выполниться `scripts/deploy.sh`.
- Cron продолжает деплой каждые 5 минут (лог: `~/norskkurs-auto-deploy.log`) — можно оставить как резерв.

## Где лежат чувствительные данные
- Справочник по токенам/ID: `/home/stanislav/codex reed/norskkurs.odt` (вне репозитория, не коммитить).
