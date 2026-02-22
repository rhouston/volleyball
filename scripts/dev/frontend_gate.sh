#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

assert_command node
assert_command npm

WEB_ROOT="$(resolve_web_root)"
SUMMARY_PATH="${WEB_ROOT}/coverage/coverage-summary.json"
THRESHOLDS_PATH="$(repo_root)/scripts/dev/coverage_thresholds.json"

if [[ ! -f "${THRESHOLDS_PATH}" ]]; then
  echo "BLOCKED: Missing required coverage thresholds file at ${THRESHOLDS_PATH}" >&2
  exit 1
fi

echo "[frontend_gate] web root: ${WEB_ROOT}"
echo "[frontend_gate] running lint"
run_npm_script "${WEB_ROOT}" lint

echo "[frontend_gate] running typecheck"
run_npm_script "${WEB_ROOT}" typecheck

echo "[frontend_gate] running unit tests with coverage"
run_npm_script "${WEB_ROOT}" test:coverage

if [[ ! -f "${SUMMARY_PATH}" ]]; then
  echo "BLOCKED: Coverage artifact missing at ${SUMMARY_PATH}" >&2
  echo "Expected your test:coverage script to produce coverage/coverage-summary.json" >&2
  exit 1
fi

echo "[frontend_gate] enforcing coverage thresholds"
node "$(repo_root)/scripts/dev/check_coverage_thresholds.mjs" \
  --summary "${SUMMARY_PATH}" \
  --thresholds "${THRESHOLDS_PATH}"

echo "[frontend_gate] passed"
