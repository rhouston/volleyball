#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

assert_command node
assert_command npm

WEB_ROOT="$(resolve_web_root)"

echo "[e2e_gate] web root: ${WEB_ROOT}"
echo "[e2e_gate] running end-to-end test suite"
run_npm_script "${WEB_ROOT}" test:e2e

echo "[e2e_gate] passed"
