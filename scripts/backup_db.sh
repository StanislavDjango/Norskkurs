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

# Локальная ротация: храним бэкапы за последние 7 дней
find "$BACKUP_DIR" -type f -name 'norskkurs-*.sql.gz' -mtime +7 -print -delete || true

# Если установлен rclone и настроен remote gdrive-norskkurs, заливаем копию в Google Drive
if command -v rclone >/dev/null 2>&1; then
  if rclone listremotes 2>/dev/null | grep -q '^gdrive-norskkurs:'; then
    echo "[$(date --iso-8601=seconds)] Uploading backup to gdrive-norskkurs:norskkurs-backups"
    rclone copy "$BACKUP_FILE" "gdrive-norskkurs:norskkurs-backups" || echo "rclone upload failed (see logs)"
  else
    echo "[$(date --iso-8601=seconds)] rclone installed, but remote gdrive-norskkurs: is not configured; skipping upload."
  fi
else
  echo "[$(date --iso-8601=seconds)] rclone not installed; skipping upload to cloud."
fi

