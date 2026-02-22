#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"${SCRIPT_DIR}/frontend_gate.sh"
"${SCRIPT_DIR}/e2e_gate.sh"

echo "[done_gate] all quality gates passed"
