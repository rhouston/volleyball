#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WEB_ROOT="${REPO_ROOT}/apps/web"

max_attempts=3
attempt=1

is_transient_error() {
  local text="$1"
  [[ "${text}" == *"EAI_AGAIN"* ]] || \
    [[ "${text}" == *"ENOTFOUND"* ]] || \
    [[ "${text}" == *"ECONNRESET"* ]] || \
    [[ "${text}" == *"ETIMEDOUT"* ]] || \
    [[ "${text}" == *"socket hang up"* ]]
}

while [[ ${attempt} -le ${max_attempts} ]]; do
  echo "[security:audit:retry] attempt ${attempt}/${max_attempts}"

  set +e
  output="$(cd "${WEB_ROOT}" && npm run security:audit 2>&1)"
  status=$?
  set -e

  if [[ ${status} -eq 0 ]]; then
    echo "${output}"
    echo "[security:audit:retry] audit passed"
    exit 0
  fi

  if ! is_transient_error "${output}"; then
    echo "${output}" >&2
    echo "[security:audit:retry] audit failed with non-transient error" >&2
    exit ${status}
  fi

  echo "${output}" >&2

  if [[ ${attempt} -eq ${max_attempts} ]]; then
    echo "[security:audit:retry] transient audit endpoint failures after ${max_attempts} attempts" >&2
    exit ${status}
  fi

  sleep_seconds=$((2 ** attempt))
  echo "[security:audit:retry] transient failure; retrying in ${sleep_seconds}s" >&2
  sleep "${sleep_seconds}"
  attempt=$((attempt + 1))
done
