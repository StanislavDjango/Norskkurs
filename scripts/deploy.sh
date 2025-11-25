#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/norskkurs/Norskkurs}"

cd "$APP_DIR"

git fetch origin main

LOCAL_SHA=$(git rev-parse HEAD)
REMOTE_SHA=$(git rev-parse origin/main)

if [ "$LOCAL_SHA" = "$REMOTE_SHA" ]; then
  echo "No new commits on origin/main, skipping deploy."
  exit 0
fi

echo "New commits detected ($LOCAL_SHA -> $REMOTE_SHA), running deploy..."
git reset --hard origin/main

docker compose pull || docker compose build

docker compose up -d db
docker compose run --rm backend python manage.py migrate
docker compose run --rm backend python manage.py collectstatic --noinput

docker compose up -d

docker image prune -f
