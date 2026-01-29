#!/bin/bash
set -e
node node_modules/vite/bin/vite.js build 2>&1 | tee /tmp/build.log
BUILD_EXIT=${PIPESTATUS[0]}
if [ $BUILD_EXIT -ne 0 ]; then
  echo "=== BUILD ERROR ==="
  cat /tmp/build.log
  exit 1
fi
