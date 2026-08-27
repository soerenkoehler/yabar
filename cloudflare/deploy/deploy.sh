#!/bin/bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/../.." && pwd)

pushd "$REPO_ROOT/cloudflare"
npm install
npm run d1:migrations:remote
npm run deploy
popd