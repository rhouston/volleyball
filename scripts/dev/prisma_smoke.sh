#!/usr/bin/env bash

set -euo pipefail

TARGET="${1:-}" 
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WEB_ROOT="${REPO_ROOT}/apps/web"

if [[ -z "${TARGET}" ]]; then
  echo "Usage: $0 <local|neon|all>" >&2
  exit 1
fi

run_flow() {
  local label="$1"
  local db_url="$2"

  (
    cd "${WEB_ROOT}"
    export SERVICE_BACKEND=prisma
    export DATABASE_URL="${db_url}"

    echo "[prisma_smoke] target=${label} db:generate"
    npm run db:generate

    echo "[prisma_smoke] target=${label} db:push"
    npm run db:push

    echo "[prisma_smoke] target=${label} db:seed"
    npm run db:seed

    echo "[prisma_smoke] target=${label} test:integration"
    npm run test:integration
  )
}

cleanup_neon() {
  local db_url="$1"

  if ! command -v psql >/dev/null 2>&1; then
    echo "[prisma_smoke] neon cleanup skipped (psql not available)"
    return 0
  fi

  psql "${db_url}" <<'SQL'
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN (
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  ) LOOP
    EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
  END LOOP;
END $$;
SQL
}

run_local() {
  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "[prisma_smoke] Missing DATABASE_URL for local smoke" >&2
    exit 1
  fi

  run_flow "local" "${DATABASE_URL}"
}

run_neon() {
  if [[ -z "${NEON_DATABASE_URL:-}" ]]; then
    echo "[prisma_smoke] Missing NEON_DATABASE_URL for neon smoke" >&2
    exit 1
  fi

  run_flow "neon" "${NEON_DATABASE_URL}"
  cleanup_neon "${NEON_DATABASE_URL}"
}

case "${TARGET}" in
  local)
    run_local
    ;;
  neon)
    run_neon
    ;;
  all)
    run_local
    run_neon
    ;;
  *)
    echo "Unsupported target '${TARGET}'. Use local|neon|all." >&2
    exit 1
    ;;
esac
