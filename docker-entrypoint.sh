#!/bin/sh
set -e

echo "Running database migrations..."
node node_modules/prisma/build/index.js migrate deploy

echo "Checking initial seed..."
node prisma/seed-production.js || true

echo "Starting Next.js server..."
exec node server.js
