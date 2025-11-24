#!/usr/bin/env bash
# Ручной деплой и создание GitHub Actions secrets (выполнять на машине с сетью).

set -euo pipefail

### ==== Заполните своими значениями (лучше экспортом окружения перед запуском) ====
TOKEN="${TOKEN:-""}"                # GitHub токен с правом на repo secrets
DEPLOY_HOST="${DEPLOY_HOST:-"norskkurs.xyz"}"
DEPLOY_PORT="${DEPLOY_PORT:-"22"}"
DEPLOY_USER="${DEPLOY_USER:-"stanislav"}"
DEPLOY_SSH_KEY="${DEPLOY_SSH_KEY:-""}" # приватный ключ OpenSSH
DEPLOY_APP_DIR="${DEPLOY_APP_DIR:-"/srv/norskkurs/Norskkurs"}"
REPO_SLUG="${REPO_SLUG:-"StanislavDjango/Norskkurs"}"
### ============================================================================
export DEPLOY_HOST DEPLOY_PORT DEPLOY_USER DEPLOY_SSH_KEY DEPLOY_APP_DIR

GREEN="\033[1;32m"; RED="\033[1;31m"; BLUE="\033[1;34m"; NC="\033[0m"
GH_PUBLIC_KEY_URL="https://api.github.com/repos/${REPO_SLUG}/actions/secrets/public-key"
GH_SECRET_URL_BASE="https://api.github.com/repos/${REPO_SLUG}/actions/secrets"
EXTRA_SSH_OPTS="${EXTRA_SSH_OPTS:-""}" # сюда можно передать ProxyCommand для cloudflared (например, '-o ProxyCommand=cloudflared access ssh --hostname %h')

require() { command -v "$1" >/dev/null 2>&1 || { echo -e "${RED}Нет команды: $1${NC}"; exit 1; }; }
require_nonempty() { [ -n "$2" ] || { echo -e "${RED}Заполните переменную $1${NC}"; exit 1; }; }
ensure_pynacl() {
  if python3 - <<'PY' >/dev/null 2>&1
import importlib.util, sys
sys.exit(0 if importlib.util.find_spec("nacl") else 1)
PY
  then
    return
  fi
  echo -e "${BLUE}==> Устанавливаю pynacl${NC}"
  python3 -m pip install --user pynacl >/dev/null
}
require curl; require python3; require ssh; require awk; require tr

require_nonempty TOKEN "$TOKEN"
require_nonempty DEPLOY_HOST "$DEPLOY_HOST"
require_nonempty DEPLOY_PORT "$DEPLOY_PORT"
require_nonempty DEPLOY_USER "$DEPLOY_USER"
require_nonempty DEPLOY_SSH_KEY "$DEPLOY_SSH_KEY"
require_nonempty DEPLOY_APP_DIR "$DEPLOY_APP_DIR"
[ "$TOKEN" != "ghp_..." ] || { echo -e "${RED}Заполните реальный TOKEN, а не заглушку${NC}"; exit 1; }

echo -e "${BLUE}==> Получаю public key${NC}"
PUBLIC_KEY_JSON=$(curl -s -H "Authorization: token ${TOKEN}" "$GH_PUBLIC_KEY_URL")
KEY_ID=$(printf "%s" "$PUBLIC_KEY_JSON" | awk -F'"' '/"key_id":/{print $4; exit}')
PUBLIC_KEY=$(printf "%s" "$PUBLIC_KEY_JSON" | awk -F'"' '/"key":/{print $4; exit}')
[ -n "$KEY_ID" ] && [ -n "$PUBLIC_KEY" ] || { echo -e "${RED}Не смог получить key/key_id${NC}"; exit 1; }

echo -e "${BLUE}==> Шифрую секреты${NC}"
ensure_pynacl
python3 - <<PY > /tmp/encrypted_secrets.txt
import base64, os
from nacl import encoding, public

key = "${PUBLIC_KEY}"
pk = public.PublicKey(key.encode(), encoder=encoding.Base64Encoder)
box = public.SealedBox(pk)

for name in ["DEPLOY_HOST","DEPLOY_PORT","DEPLOY_USER","DEPLOY_SSH_KEY","DEPLOY_APP_DIR"]:
    val = os.environ[name]
    ct = box.encrypt(val.encode())
    print(f"{name}={base64.b64encode(ct).decode()}")
PY

declare -A ENC
while IFS='=' read -r k v; do ENC["$k"]="$v"; done < /tmp/encrypted_secrets.txt
rm /tmp/encrypted_secrets.txt
echo -e "${GREEN}✔ Секреты зашифрованы${NC}"

create_secret() {
  local name="$1" value="$2"
  curl -s -X PUT \
    -H "Authorization: token ${TOKEN}" \
    -H "Content-Type: application/json" \
    --data "{\"encrypted_value\":\"${value}\", \"key_id\":\"${KEY_ID}\"}" \
    "${GH_SECRET_URL_BASE}/${name}" >/dev/null
  echo -e "${GREEN}✔ Secret ${name} обновлён${NC}"
}

echo -e "${BLUE}==> Создаю/обновляю secrets${NC}"
create_secret "DEPLOY_HOST" "${ENC[DEPLOY_HOST]}"
create_secret "DEPLOY_PORT" "${ENC[DEPLOY_PORT]}"
create_secret "DEPLOY_USER" "${ENC[DEPLOY_USER]}"
create_secret "DEPLOY_SSH_KEY" "${ENC[DEPLOY_SSH_KEY]}"
create_secret "DEPLOY_APP_DIR" "${ENC[DEPLOY_APP_DIR]}"

echo -e "${BLUE}==> Проверяю SSH${NC}"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o BatchMode=yes -o ConnectTimeout=10)
if [ -n "$EXTRA_SSH_OPTS" ]; then
  # разбиваем на токены, поддерживаем кавычки
  eval "EXTRA_ARR=($EXTRA_SSH_OPTS)"
  SSH_OPTS=("${EXTRA_ARR[@]}" "${SSH_OPTS[@]}")
fi
ssh -p "$DEPLOY_PORT" "${SSH_OPTS[@]}" "$DEPLOY_USER@$DEPLOY_HOST" "echo OK" >/dev/null
echo -e "${GREEN}✔ SSH доступен${NC}"

echo -e "${BLUE}==> Тестовый деплой${NC}"
ssh -p "$DEPLOY_PORT" "${SSH_OPTS[@]}" "$DEPLOY_USER@$DEPLOY_HOST" "cd '$DEPLOY_APP_DIR' && git fetch origin && git reset --hard origin/main"
ssh -p "$DEPLOY_PORT" "${SSH_OPTS[@]}" "$DEPLOY_USER@$DEPLOY_HOST" "cd '$DEPLOY_APP_DIR' && docker compose pull || true"
ssh -p "$DEPLOY_PORT" "${SSH_OPTS[@]}" "$DEPLOY_USER@$DEPLOY_HOST" "cd '$DEPLOY_APP_DIR' && docker compose build"
ssh -p "$DEPLOY_PORT" "${SSH_OPTS[@]}" "$DEPLOY_USER@$DEPLOY_HOST" "cd '$DEPLOY_APP_DIR' && docker compose up -d db"
ssh -p "$DEPLOY_PORT" "${SSH_OPTS[@]}" "$DEPLOY_USER@$DEPLOY_HOST" "cd '$DEPLOY_APP_DIR' && docker compose run --rm backend python manage.py migrate"
ssh -p "$DEPLOY_PORT" "${SSH_OPTS[@]}" "$DEPLOY_USER@$DEPLOY_HOST" "cd '$DEPLOY_APP_DIR' && docker compose run --rm backend python manage.py collectstatic --noinput"
ssh -p "$DEPLOY_PORT" "${SSH_OPTS[@]}" "$DEPLOY_USER@$DEPLOY_HOST" "cd '$DEPLOY_APP_DIR' && docker compose up -d"
echo -e "${GREEN}✔ Готово${NC}"
