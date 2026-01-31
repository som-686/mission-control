#!/bin/bash
# Deploy main branch to production
set -e
cd "$(dirname "$0")/.."

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  echo "⚠️  Not on main branch (currently on $BRANCH). Switch to main first."
  exit 1
fi

echo "🏗️ Building for production..."
npm run build
rm -rf .vercel/output
vercel build --prod

echo "🚀 Deploying to production..."
vercel deploy --yes --prod --prebuilt

echo "✅ Production live at: https://mission-control-inky.vercel.app"
