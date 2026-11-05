#!/bin/sh
set -eu

# Railway's persistent volume may initially be owned by root. Repair its
# ownership before dropping privileges, otherwise catalog/account writes fail.
data_dir="${DATA_DIR:-/tmp/blofy-data}"
if [ "$(id -u)" = "0" ]; then
  mkdir -p "$data_dir"
  chown -R node:node "$data_dir"
  exec gosu node "$@"
fi
exec "$@"
