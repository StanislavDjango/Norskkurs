#!/usr/bin/env bash
set -euo pipefail

LOG_FILE="$HOME/norskkurs-auto-deploy.log"
MAX_SIZE_BYTES=$((10 * 1024 * 1024)) # 10 MB
KEEP_LINES=5000

if [ ! -f "$LOG_FILE" ]; then
  exit 0
fi

size=$(wc -c <"$LOG_FILE" || echo 0)

if [ "$size" -le "$MAX_SIZE_BYTES" ]; then
  exit 0
fi

tmp="${LOG_FILE}.tmp.$$"
# Оставляем только последние KEEP_LINES строк
if tail -n "$KEEP_LINES" "$LOG_FILE" >"$tmp" 2>/dev/null; then
  mv "$tmp" "$LOG_FILE"
else
  rm -f "$tmp" || true
fi
