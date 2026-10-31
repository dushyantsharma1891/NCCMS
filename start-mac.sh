#!/usr/bin/env bash
# Runs backend (http://127.0.0.1:5001) and frontend (http://localhost:5173) together.
cd "$(dirname "$0")"
trap 'kill 0' EXIT INT TERM
(cd backend && npm run dev) &
(cd frontend && npm run dev) &
wait
