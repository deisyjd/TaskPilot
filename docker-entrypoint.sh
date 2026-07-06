#!/bin/sh
set -e

echo "Validating environment variables..."
node prisma/startup-check.js env

echo "Running database migrations..."
node node_modules/prisma/build/index.js migrate deploy

echo "Checking initial seed..."
node prisma/seed-production.js || true

echo "Verifying database connection..."
node prisma/startup-check.js db || true

echo "Starting Next.js server..."
exec node server.js
