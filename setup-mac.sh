#!/usr/bin/env bash
# One-time setup for macOS. Usage:  chmod +x setup-mac.sh && ./setup-mac.sh
set -e
cd "$(dirname "$0")"

command -v node >/dev/null || { echo "Node.js not found. Install it:  brew install node"; exit 1; }
echo "Node $(node -v)  (needs >= 20.19)"

if ! command -v mongod >/dev/null && ! pgrep -x mongod >/dev/null; then
  echo "MongoDB not found. Install & start it with:"
  echo "  brew tap mongodb/brew && brew install mongodb-community"
  echo "  brew services start mongodb-community"
  echo "(or put a MongoDB Atlas URL in backend/.env as MONGO_URI)"
fi

[ -f backend/.env ] || cp backend/.env.example backend/.env
[ -f frontend/.env ] || cp frontend/.env.example frontend/.env

(cd backend && npm install && npm run seed)
(cd frontend && npm install)
echo; echo "Done. Start with:  ./start-mac.sh"
