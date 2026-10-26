#!/bin/sh
set -eu
app_dir="${APP_DIR:-/app}"
umask 077
# Worker bindings come from vars/.dev.vars, not arbitrary OS variables.
# Translate only operator-configured inference variables. Never log values.
vars_tmp="$app_dir/.dev.vars.tmp"
: > "$vars_tmp"
write_var() {
  var_name="$1"
  var_value="$2"
  case "$var_value" in
    *'
'*|*"$(printf '\r')"*) echo "Invalid newline in inference configuration" >&2; exit 1 ;;
  esac
  escaped_value=$(printf '%s' "$var_value" | sed 's/\\/\\\\/g;s/"/\\"/g')
  printf '%s="%s"\n' "$var_name" "$escaped_value" >> "$vars_tmp"
}
if [ -n "${MODEL_BASE_URL:-}" ]; then write_var MODEL_BASE_URL "$MODEL_BASE_URL"; fi
if [ -n "${MODEL_NAME:-}" ]; then write_var MODEL_NAME "$MODEL_NAME"; fi
if [ -n "${MODEL_API_KEY:-}" ]; then write_var MODEL_API_KEY "$MODEL_API_KEY"; fi
if [ -n "${POSTHOG_ENABLED:-}" ]; then write_var POSTHOG_ENABLED "$POSTHOG_ENABLED"; fi
if [ -n "${POSTHOG_API_HOST:-}" ]; then write_var POSTHOG_API_HOST "$POSTHOG_API_HOST"; fi
mv "$vars_tmp" "$app_dir/.dev.vars"
exec "${CELLD_BIN:-/usr/local/bin/celld}" dev "$app_dir" --host "${HOST:-0.0.0.0}" --port "${PORT:-9876}" --no-watch --logs
