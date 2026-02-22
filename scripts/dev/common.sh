#!/usr/bin/env bash

set -euo pipefail

repo_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd
}

resolve_web_root() {
  local root
  root="$(repo_root)"

  if [[ -n "${WEB_DIR:-}" ]]; then
    if [[ -f "${WEB_DIR}/package.json" ]]; then
      echo "${WEB_DIR}"
      return 0
    fi

    echo "BLOCKED: WEB_DIR is set but package.json was not found at ${WEB_DIR}/package.json" >&2
    return 1
  fi

  if [[ -f "${root}/apps/web/package.json" ]]; then
    echo "${root}/apps/web"
    return 0
  fi

  if [[ -f "${root}/package.json" ]]; then
    echo "${root}"
    return 0
  fi

  echo "BLOCKED: Missing Next.js workspace package.json. Checked ${root}/apps/web/package.json and ${root}/package.json" >&2
  return 1
}

assert_command() {
  local cmd
  cmd="$1"

  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "BLOCKED: Required command '${cmd}' is not installed or not on PATH" >&2
    return 1
  fi
}

has_npm_script() {
  local web_root script_name
  web_root="$1"
  script_name="$2"

  node -e "
const fs = require('fs');
const pkgPath = process.argv[1];
const scriptName = process.argv[2];
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
process.exit(pkg.scripts && Object.prototype.hasOwnProperty.call(pkg.scripts, scriptName) ? 0 : 1);
" "${web_root}/package.json" "${script_name}"
}

run_npm_script() {
  local web_root script_name
  web_root="$1"
  script_name="$2"

  if ! has_npm_script "${web_root}" "${script_name}"; then
    echo "BLOCKED: Missing npm script '${script_name}' in ${web_root}/package.json" >&2
    return 1
  fi

  npm --prefix "${web_root}" run "${script_name}"
}
