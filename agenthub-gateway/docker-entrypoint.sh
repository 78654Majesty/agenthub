#!/bin/sh
set -e

echo "==> Running Prisma db push (create/sync schema)..."
npx prisma db push --schema ./prisma/schema.prisma --skip-generate

if [ ! -f /app/data/.seeded ]; then
  echo "==> First run: seeding database..."
  npx tsx ./prisma/seed.ts
  touch /app/data/.seeded
  echo "==> Seed complete."
else
  echo "==> Database already seeded, skipping."
fi

echo "==> Starting Gateway server..."
exec node dist/index.js
