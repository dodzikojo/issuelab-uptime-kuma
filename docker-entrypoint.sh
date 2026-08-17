#!/bin/sh
# Create db-config.json from environment variables without exposing credentials.
mkdir -p data
node <<'NODE'
const fs = require("fs");

const config = {
    type: "postgres",
    hostname: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    dbName: process.env.PGDATABASE,
    username: process.env.PGUSER,
    password: process.env.PGPASSWORD,
};

fs.writeFileSync("data/db-config.json", JSON.stringify(config, null, 2));
NODE

echo "db-config.json created"

exec node server/server.js
