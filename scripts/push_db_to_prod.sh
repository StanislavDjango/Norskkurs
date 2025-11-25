#!/usr/bin/env bash
set -euo pipefail

# Настройки под твой сервер
REMOTE_USER="stanislav"
REMOTE_HOST="100.66.15.89"              # Tailscale IP
REMOTE_APP_DIR="/srv/norskkurs/Norskkurs"
REMOTE_DB_NAME="norskkurs"
REMOTE_DB_USER="postgres"

DUMP_FILE="norskkurs-local.sql"

echo "==> Dumping local DB from docker container..."
docker compose exec -T db pg_dump -U "$REMOTE_DB_USER" -d "$REMOTE_DB_NAME" > "$DUMP_FILE"

echo "==> Copying dump to server..."
scp "$DUMP_FILE" "${REMOTE_USER}@${REMOTE_HOST}:/home/${REMOTE_USER}/${DUMP_FILE}"

echo "==> Applying dump on server..."
# Stop app containers
ssh "${REMOTE_USER}@${REMOTE_HOST}" "cd \"$REMOTE_APP_DIR\" && docker compose stop backend frontend || true"

# Drop and recreate DB
ssh "${REMOTE_USER}@${REMOTE_HOST}" "cd \"$REMOTE_APP_DIR\" && docker compose exec -T db psql -U $REMOTE_DB_USER -d postgres -v ON_ERROR_STOP=1 -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$REMOTE_DB_NAME' AND pid <> pg_backend_pid();\""
ssh "${REMOTE_USER}@${REMOTE_HOST}" "cd \"$REMOTE_APP_DIR\" && docker compose exec -T db psql -U $REMOTE_DB_USER -d postgres -v ON_ERROR_STOP=1 -c \"DROP DATABASE IF EXISTS $REMOTE_DB_NAME;\""
ssh "${REMOTE_USER}@${REMOTE_HOST}" "cd \"$REMOTE_APP_DIR\" && docker compose exec -T db psql -U $REMOTE_DB_USER -d postgres -v ON_ERROR_STOP=1 -c \"CREATE DATABASE $REMOTE_DB_NAME;\""

# Import dump
ssh "${REMOTE_USER}@${REMOTE_HOST}" "cd \"$REMOTE_APP_DIR\" && cat /home/$REMOTE_USER/$DUMP_FILE | docker compose exec -T db psql -U $REMOTE_DB_USER -d $REMOTE_DB_NAME"

# Migrations
ssh "${REMOTE_USER}@${REMOTE_HOST}" "cd \"$REMOTE_APP_DIR\" && docker compose run --rm backend python manage.py migrate"

# Start stack
ssh "${REMOTE_USER}@${REMOTE_HOST}" "cd \"$REMOTE_APP_DIR\" && docker compose up -d"

echo "==> Done."
