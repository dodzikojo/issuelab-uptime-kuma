#!/bin/sh
# Create db-config.json from environment variables
mkdir -p data
cat > data/db-config.json <<JSONEOF
{
  "type": "postgres",
  "hostname": "${PGHOST}",
  "port": ${PGPORT:-5432},
  "dbName": "${PGDATABASE}",
  "username": "${PGUSER}",
  "password": "${PGPASSWORD}"
}
JSONEOF

echo "db-config.json created"
cat data/db-config.json

exec node server/server.js
