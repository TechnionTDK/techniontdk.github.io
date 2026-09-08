#!/usr/bin/env bash
# Publishes _site/ to the CS server. Configuration lives in deploy.env (not committed).
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f deploy.env ]; then
  cat >&2 <<'MSG'
deploy.env is missing.

Copy deploy.env.example to deploy.env and fill in DEPLOY_HOST, DEPLOY_USER and
DEPLOY_PATH. It is gitignored on purpose — it holds server details.
MSG
  exit 1
fi

set -a
# shellcheck disable=SC1091
. ./deploy.env
set +a

for var in DEPLOY_HOST DEPLOY_USER DEPLOY_PATH; do
  if [ -z "${!var:-}" ]; then
    echo "deploy.env does not set $var" >&2
    exit 1
  fi
done

if [ ! -d _site ]; then
  echo "_site/ does not exist — run 'npm run build' first." >&2
  exit 1
fi

cmd=(rsync -avz --delete _site/ "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/")
printf 'Running: %s\n' "${cmd[*]}"
"${cmd[@]}"
