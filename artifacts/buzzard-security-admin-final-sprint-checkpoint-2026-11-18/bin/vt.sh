#!/usr/bin/env bash
# vt.sh <vitest args...> : run vitest in the staging tree, isolated, no network.
cd /tmp/buzzard-final-sprint/work && exec scripts/isolated/run.sh --no-network -- node node_modules/vitest/vitest.mjs run --silent=true "$@"
