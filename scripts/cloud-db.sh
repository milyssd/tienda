#!/usr/bin/env bash
set -euo pipefail
MYSQL_ROOT=/workspace/mysql
export LD_LIBRARY_PATH="$MYSQL_ROOT/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
if [[ ! -x "$MYSQL_ROOT/usr/sbin/mariadbd" ]]; then
  echo 'MariaDB local no está instalado. Sigue deploy/README.md.' >&2
  exit 1
fi
if [[ -f "$MYSQL_ROOT/mysql.pid" ]] && kill -0 "$(cat "$MYSQL_ROOT/mysql.pid")" 2>/dev/null; then exit 0; fi
if [[ ! -d "$MYSQL_ROOT/data/mysql" ]]; then
 "$MYSQL_ROOT/usr/bin/mariadb-install-db" --no-defaults --basedir="$MYSQL_ROOT/usr" --datadir="$MYSQL_ROOT/data" --auth-root-authentication-method=socket --auth-root-socket-user="$(id -un)" --skip-test-db
fi
nohup "$MYSQL_ROOT/usr/sbin/mariadbd" --no-defaults --basedir="$MYSQL_ROOT/usr" --datadir="$MYSQL_ROOT/data" --socket="$MYSQL_ROOT/mysql.sock" --pid-file="$MYSQL_ROOT/mysql.pid" --bind-address=127.0.0.1 --port=3306 --log-error="$MYSQL_ROOT/server.log" >/workspace/mysql/process.log 2>&1 &
for attempt in {1..30}; do
 if "$MYSQL_ROOT/usr/bin/mariadb" --no-defaults --socket="$MYSQL_ROOT/mysql.sock" -e 'SELECT 1' >/dev/null 2>&1; then exit 0; fi
 sleep 1
done
printf '%s\n' 'MariaDB no respondió. Revisa /workspace/mysql/server.log.' >&2
exit 1
