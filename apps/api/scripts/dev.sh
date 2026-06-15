#!/usr/bin/env bash
# Start the FastAPI dev server. Creates a Python virtualenv on first run.
set -euo pipefail

cd "$(dirname "$0")/.."

VENV_DIR="venv"

if [ ! -d "$VENV_DIR" ]; then
  echo "[dev] creating virtualenv ($VENV_DIR)…"
  python3 -m venv "$VENV_DIR"
  "$VENV_DIR/bin/pip" install --upgrade pip
  "$VENV_DIR/bin/pip" install -r requirements.txt
fi

echo "[dev] starting uvicorn on http://localhost:8000"
exec "$VENV_DIR/bin/uvicorn" app.main:app --reload --port 8000
