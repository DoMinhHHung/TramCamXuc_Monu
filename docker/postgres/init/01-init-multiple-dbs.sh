#!/bin/sh
set -eu

create_db() {
  db_name="$1"
  echo "[postgres-init] ensuring database '$db_name' exists"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<SQL
SELECT 'CREATE DATABASE "$db_name"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$db_name')\gexec
SQL
}

create_db "identity_db"
create_db "payment_db"
create_db "music_db"
create_db "ads_db"
