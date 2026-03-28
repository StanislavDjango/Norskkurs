#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
PYTHON_BIN="${PYTHON_BIN:-python3}"
SCHEMA_JSON_PATH="${SCHEMA_JSON_PATH:-$FRONTEND_DIR/.generated-openapi-schema.json}"
SCHEMA_TYPES_PATH="${SCHEMA_TYPES_PATH:-$FRONTEND_DIR/src/api-schema.d.ts}"

cleanup() {
  rm -f "$SCHEMA_JSON_PATH"
}

trap cleanup EXIT

generate_with_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    return 1
  fi

  if ! docker compose -f "$ROOT_DIR/docker-compose.yml" ps --status running backend >/dev/null 2>&1; then
    return 1
  fi

  echo "Generating OpenAPI schema from running Docker backend..."
  docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T backend sh -lc '
    python manage.py spectacular --file /tmp/openapi-schema.json --format openapi-json 1>&2 &&
    cat /tmp/openapi-schema.json &&
    rm -f /tmp/openapi-schema.json /app/-
  ' >"$SCHEMA_JSON_PATH"
}

generate_with_local_python() {
  if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
    echo "Python interpreter not found: $PYTHON_BIN" >&2
    exit 1
  fi

  echo "Generating OpenAPI schema from local backend..."
  (
    cd "$BACKEND_DIR"
    "$PYTHON_BIN" manage.py spectacular --file "$SCHEMA_JSON_PATH" --format openapi-json 1>&2
  )
}

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required to generate frontend API types." >&2
  exit 1
fi

if ! generate_with_docker; then
  generate_with_local_python
fi

(
  cd "$FRONTEND_DIR"
  npx openapi-typescript "$SCHEMA_JSON_PATH" -o "$SCHEMA_TYPES_PATH"
)
