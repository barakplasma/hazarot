#!/bin/sh
set -eu
bundle_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
# celld reads app/.env directly. No Node process, shell sourcing, or build at startup.
exec "$bundle_dir/celld" dev "$bundle_dir/app" \
  --host "${HOST:-127.0.0.1}" --port "${PORT:-9876}" --no-watch --logs
