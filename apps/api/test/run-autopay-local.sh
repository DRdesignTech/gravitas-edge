#!/usr/bin/env bash
# Disposable local PostgreSQL only. Does not load application environment files,
# deploy migrations, or connect to any existing application database.
set -euo pipefail
cd "$(dirname "$0")/../../.."
task_pg_dir=$(mktemp -d /tmp/gravitas-autopay-test.XXXXXX)
trap 'pg_ctl -D "$task_pg_dir/data" -m fast stop >/dev/null 2>&1 || true; rm -rf "$task_pg_dir"' EXIT
initdb -D "$task_pg_dir/data" -A trust -U autopay_test > "$task_pg_dir/init.log"
pg_ctl -D "$task_pg_dir/data" -l "$task_pg_dir/server.log" -o '-p 55439 -h 127.0.0.1' start
createdb -h 127.0.0.1 -p 55439 -U autopay_test autopay_test
./node_modules/.bin/prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > "$task_pg_dir/schema.sql"
psql -h 127.0.0.1 -p 55439 -U autopay_test -d autopay_test -v ON_ERROR_STOP=1 -f "$task_pg_dir/schema.sql" > "$task_pg_dir/schema.log"
AUTOPAY_TEST_DATABASE_URL='postgresql://autopay_test@127.0.0.1:55439/autopay_test'
export AUTOPAY_TEST_DATABASE_URL
npm test --workspace=apps/api -- --runInBand --runTestsByPath \
  src/payments/autopay.integration.spec.ts src/payments/webhook.service.spec.ts \
  src/subscriptions/pricing.service.spec.ts src/access/subscription-access.service.spec.ts \
  src/subscriptions/user-subscriptions.service.spec.ts
