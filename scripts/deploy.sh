#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/norskkurs/Norskkurs}"

cd "$APP_DIR"

git fetch origin
git reset --hard origin/main

docker compose pull
docker compose build

docker compose up -d db
docker compose run --rm backend python manage.py migrate
docker compose run --rm backend python manage.py collectstatic --noinput

docker compose up -d

docker image prune -f
