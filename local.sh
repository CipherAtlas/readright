#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but was not found in PATH." >&2
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Building frontend..."
npm run build

echo
echo "Starting ReadRight locally..."
echo "Open http://localhost:8787 in your browser."
echo

npm run start
