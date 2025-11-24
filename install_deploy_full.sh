#!/usr/bin/env bash
# Универсальная настройка автодеплоя GitHub Actions → сервер с Docker Compose.
# Этапы: получить public key GitHub, зашифровать секреты (libsodium), создать secrets,
# проверить SSH/порт, проверить состояние сервера и выполнить тестовый деплой.

set -euo pipefail

### --- Константы/цвета ---
GREEN="\033[1;32m"; YELLOW="\033[1;33m"; RED="\033[1;31m"; BLUE="\033[1;34m"; NC="\033[0m"
REPO_SLUG="StanislavDjango/Norskkurs"
GH_PUBLIC_KEY_URL="https://api.github.com/repos/${REPO_SLUG}/actions/secrets/public-key"
GH_SECRET_URL_BASE="https://api.github.com/repos/${REPO_SLUG}/actions/secrets"

# GitHub токен (можно переопределить экспортом TOKEN). Внимание: держите в секрете.
TOKEN="${TOKEN:-""}"

### --- Заполните ваши значения ---
DEPLOY_HOST="${DEPLOY_HOST:-"norskkurs.xyz"}"
DEPLOY_PORT="${DEPLOY_PORT:-"22"}"
DEPLOY_USER="${DEPLOY_USER:-"stanislav"}"
DEPLOY_SSH_KEY="${DEPLOY_SSH_KEY:-""}" # приватный ключ полностью (OpenSSH)
DEPLOY_APP_DIR="${DEPLOY_APP_DIR:-"/srv/norskkurs/Norskkurs"}"

### --- Внутренние переменные (после шифрования) ---
KEY_ID=""
PUBLIC_KEY=""
ENC_DEPLOY_HOST=""
ENC_DEPLOY_PORT=""
ENC_DEPLOY_USER=""
ENC_DEPLOY_SSH_KEY=""
ENC_DEPLOY_APP_DIR=""

### --- Helpers ---
require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo -e "${RED}Требуется команда: $1${NC}"; exit 1; }
}

require_nonempty() {
  local name="$1" value="$2"
  if [[ -z "$value" ]]; then
    echo -e "${RED}Заполните переменную ${name} перед запуском.${NC}"
    exit 1
  fi
}

ensure_pynacl() {
  if python3 - <<'PY' >/dev/null 2>&1; then
import importlib.util
import sys
spec = importlib.util.find_spec("nacl")
sys.exit(0 if spec else 1)
PY
    return
  fi
  echo -e "${YELLOW}Устанавливаю pynacl...${NC}"
  python3 -m pip install --user pynacl >/dev/null
}

encrypt_secret() {
  local secret="$1"
  python3 - <<PY
import base64, sys, os
from nacl import encoding, public

public_key = "${PUBLIC_KEY}"
secret = os.environ["SECRET_VALUE"]

pk = public.PublicKey(public_key.encode(), encoder=encoding.Base64Encoder)
sealed_box = public.SealedBox(pk)
encrypted = sealed_box.encrypt(secret.encode())
print(base64.b64encode(encrypted).decode())
PY
}

create_secret() {
  local name="$1" value="$2"
  curl -s -X PUT \
    -H "Authorization: token ${TOKEN}" \
    -H "Content-Type: application/json" \
    --data "{\"encrypted_value\":\"${value}\", \"key_id\":\"${KEY_ID}\"}" \
    "${GH_SECRET_URL_BASE}/${name}" >/dev/null
  echo -e "${GREEN}✔ Secret ${name} создан/обновлён${NC}"
}

ssh_exec() {
  local cmd="$1"
  ssh -p "${DEPLOY_PORT}" -o StrictHostKeyChecking=accept-new -o BatchMode=yes \
    "${DEPLOY_USER}@${DEPLOY_HOST}" "${cmd}"
}

### 1) Получение public key
echo -e "${BLUE}==> Получаю public key для secrets${NC}"
require_cmd curl
PUBLIC_KEY_JSON=$(curl -s -H "Authorization: token ${TOKEN}" "$GH_PUBLIC_KEY_URL")
KEY_ID=$(printf "%s" "$PUBLIC_KEY_JSON" | grep -o '"key_id":"[^"]*"' | head -n1 | cut -d':' -f2- | tr -d '"')
PUBLIC_KEY=$(printf "%s" "$PUBLIC_KEY_JSON" | grep -o '"key":"[^"]*"' | head -n1 | cut -d':' -f2- | tr -d '"')

if [[ -z "$KEY_ID" || -z "$PUBLIC_KEY" ]]; then
  echo -e "${RED}Не удалось получить key/key_id из GitHub API.${NC}"
  exit 1
fi
echo -e "${GREEN}✔ Public key получен (key_id=${KEY_ID})${NC}"

### 2) Проверка введённых данных
require_nonempty TOKEN "$TOKEN"
require_nonempty DEPLOY_HOST "$DEPLOY_HOST"
require_nonempty DEPLOY_PORT "$DEPLOY_PORT"
require_nonempty DEPLOY_USER "$DEPLOY_USER"
require_nonempty DEPLOY_SSH_KEY "$DEPLOY_SSH_KEY"
require_nonempty DEPLOY_APP_DIR "$DEPLOY_APP_DIR"

### 3) Шифрование секретов
echo -e "${BLUE}==> Шифрую секреты (libsodium sealed box)${NC}"
require_cmd python3
ensure_pynacl

export PUBLIC_KEY SECRET_VALUE
SECRET_VALUE="$DEPLOY_HOST"; ENC_DEPLOY_HOST=$(SECRET_VALUE="$SECRET_VALUE" encrypt_secret)
SECRET_VALUE="$DEPLOY_PORT"; ENC_DEPLOY_PORT=$(SECRET_VALUE="$SECRET_VALUE" encrypt_secret)
SECRET_VALUE="$DEPLOY_USER"; ENC_DEPLOY_USER=$(SECRET_VALUE="$SECRET_VALUE" encrypt_secret)
SECRET_VALUE="$DEPLOY_SSH_KEY"; ENC_DEPLOY_SSH_KEY=$(SECRET_VALUE="$SECRET_VALUE" encrypt_secret)
SECRET_VALUE="$DEPLOY_APP_DIR"; ENC_DEPLOY_APP_DIR=$(SECRET_VALUE="$SECRET_VALUE" encrypt_secret)

echo -e "${GREEN}✔ Секреты зашифрованы${NC}"

### 4) Создание secrets в GitHub
echo -e "${BLUE}==> Создаю/обновляю secrets в GitHub${NC}"
create_secret "DEPLOY_HOST" "$ENC_DEPLOY_HOST"
create_secret "DEPLOY_PORT" "$ENC_DEPLOY_PORT"
create_secret "DEPLOY_USER" "$ENC_DEPLOY_USER"
create_secret "DEPLOY_SSH_KEY" "$ENC_DEPLOY_SSH_KEY"
create_secret "DEPLOY_APP_DIR" "$ENC_DEPLOY_APP_DIR"

### 5) Проверка SSH доступа и порта
echo -e "${BLUE}==> Проверяю SSH доступ${NC}"
require_cmd ssh
if ssh_exec "echo OK" >/dev/null 2>&1; then
  echo -e "${GREEN}✔ SSH соединение установлено${NC}"
else
  echo -e "${RED}SSH не доступен. Проверьте хост/порт/ключи.${NC}"
  exit 1
fi

echo -e "${BLUE}==> Проверяю TCP порт${NC}"
if command -v nc >/dev/null 2>&1; then
  if nc -z -w5 "$DEPLOY_HOST" "$DEPLOY_PORT"; then
    echo -e "${GREEN}✔ Порт ${DEPLOY_PORT} доступен${NC}"
  else
    echo -e "${RED}Порт ${DEPLOY_PORT} недоступен${NC}"; exit 1
  fi
else
  timeout 5 bash -c "cat < /dev/null > /dev/tcp/${DEPLOY_HOST}/${DEPLOY_PORT}" >/dev/null 2>&1 || {
    echo -e "${RED}Порт ${DEPLOY_PORT} недоступен (fallback check).${NC}"; exit 1; }
  echo -e "${GREEN}✔ Порт ${DEPLOY_PORT} доступен (fallback)${NC}"
fi

### 6) Проверка состояния сервера
echo -e "${BLUE}==> Проверяю состояние сервера${NC}"
ssh_exec "cd \"$DEPLOY_APP_DIR\" && git status -sb" || { echo -e "${RED}git status не выполнен${NC}"; exit 1; }
ssh_exec "cd \"$DEPLOY_APP_DIR\" && docker compose ps" || { echo -e "${RED}docker compose ps не выполнен${NC}"; exit 1; }
ssh_exec "cd \"$DEPLOY_APP_DIR\" && docker compose logs --tail=50" || true
echo -e "${GREEN}✔ Состояние получено${NC}"

### 7) Тестовый деплой
echo -e "${BLUE}==> Запускаю тестовый деплой${NC}"
ssh_exec "cd \"$DEPLOY_APP_DIR\" && git fetch origin && git reset --hard origin/main"
ssh_exec "cd \"$DEPLOY_APP_DIR\" && docker compose pull || true"
ssh_exec "cd \"$DEPLOY_APP_DIR\" && docker compose build"
ssh_exec "cd \"$DEPLOY_APP_DIR\" && docker compose up -d db"
ssh_exec "cd \"$DEPLOY_APP_DIR\" && docker compose run --rm backend python manage.py migrate"
ssh_exec "cd \"$DEPLOY_APP_DIR\" && docker compose run --rm backend python manage.py collectstatic --noinput"
ssh_exec "cd \"$DEPLOY_APP_DIR\" && docker compose up -d"
echo -e "${GREEN}✔ Тестовый деплой завершён${NC}"

### 8) Финальный отчёт
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✔ Secrets созданы${NC}"
echo -e "${GREEN}✔ SSH доступ работает${NC}"
echo -e "${GREEN}✔ Docker поднят${NC}"
echo -e "${GREEN}✔ Тестовый деплой выполнен${NC}"
echo -e "${GREEN}✔ Всё готово: push в main запустит автодеплой${NC}"
echo -e "${GREEN}=========================================${NC}"
