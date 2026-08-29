#!/bin/bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/../.." && pwd)

pushd "$REPO_ROOT/cloudflare"

if [[ -z "${CLOUDFLARE_D1_DATABASE_ID:-}" ]]; then
  echo "CLOUDFLARE_D1_DATABASE_ID must be set" >&2
  exit 1
fi

WRANGLER_CONFIG=$(mktemp "$PWD/wrangler.deploy.XXXXXX.jsonc")
trap 'rm -f "$WRANGLER_CONFIG"' EXIT

jq <wrangler.jsonc >"$WRANGLER_CONFIG" \
  --arg database_id "$CLOUDFLARE_D1_DATABASE_ID" \
  --arg build_timestamp "$(date --utc)" \
  '.d1_databases[0].database_id = $database_id
  |.vars.build_timestamp = $build_timestamp'

npm install
npm run d1:migrations:remote -- --config "$WRANGLER_CONFIG"
npm run deploy -- --config "$WRANGLER_CONFIG"

popd