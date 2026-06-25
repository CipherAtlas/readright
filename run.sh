#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

BACKEND_PORT=8787
BACKEND_PID=""

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but was not found in PATH." >&2
  exit 1
fi

clear_port() {
  local port="$1"
  local pids

  pids="$(lsof -ti "tcp:${port}" 2>/dev/null || true)"
  if [ -z "$pids" ]; then
    return
  fi

  echo "Clearing port ${port}..."
  kill $pids 2>/dev/null || true
  sleep 1

  pids="$(lsof -ti "tcp:${port}" 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    kill -9 $pids 2>/dev/null || true
  fi
}

cleanup() {
  if [ -n "$BACKEND_PID" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

clear_port "$BACKEND_PORT"

echo "Building app..."
npm run build

echo "Starting ReadRight on http://localhost:${BACKEND_PORT}..."
PORT="$BACKEND_PORT" npm run api &
BACKEND_PID=$!

echo
echo "ReadRight: http://localhost:${BACKEND_PORT}"
echo "Press Ctrl-C to stop the server."
echo

wait "$BACKEND_PID"
