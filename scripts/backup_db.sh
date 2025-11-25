#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/norskkurs/Norskkurs}"
DB_NAME="${DB_NAME:-norskkurs}"
DB_USER="${DB_USER:-postgres}"

BACKUP_ROOT="${BACKUP_ROOT:-$HOME/backups}"
BACKUP_DIR="${BACKUP_DIR:-$BACKUP_ROOT/norskkurs}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/norskkurs-${TIMESTAMP}.sql.gz"

cd "$APP_DIR"

echo "[$(date --iso-8601=seconds)] Starting DB backup to $BACKUP_FILE"

# Дамп базы из контейнера db и упаковка
docker compose exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_FILE"

echo "[$(date --iso-8601=seconds)] Backup completed: $BACKUP_FILE"

# Локальная ротация: храним бэкапы за последние 14 дней
find "$BACKUP_DIR" -type f -name 'norskkurs-*.sql.gz' -mtime +14 -print -delete || true
