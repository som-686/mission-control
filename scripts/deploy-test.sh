#!/bin/bash
# Deploy current branch to staging (test) environment
set -e
cd "$(dirname "$0")/.."

echo "🧪 Building for staging..."
npm run build
rm -rf .vercel/output
vercel build

echo "🚀 Deploying to staging..."
DEPLOY_URL=$(vercel deploy --yes --prebuilt 2>&1 | grep -o 'https://mission-control-[a-z0-9]*-soms-projects-f9831fad.vercel.app' | head -1)

echo "🔗 Setting staging alias..."
vercel alias "$DEPLOY_URL" mission-control-test.vercel.app

echo "✅ Staging live at: https://mission-control-test.vercel.app"
