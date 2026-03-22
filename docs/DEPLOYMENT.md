# IssueLab Status — Deployment Guide

## Table of Contents

- [Local Development](#local-development)
- [Railway Deployment (Production)](#railway-deployment-production)
- [Custom Domain Setup](#custom-domain-setup)
- [Seeding Data](#seeding-data)
- [SMTP Configuration](#smtp-configuration)
- [Troubleshooting](#troubleshooting)
- [Maintenance & Operations](#maintenance--operations)

---

## Local Development

### Prerequisites

- Node.js >= 20.4.0
- Docker Desktop (for PostgreSQL)
- Git

### 1. Install Dependencies

```bash
npm ci
```

### 2. Start PostgreSQL

```bash
DB_PASSWORD=localtest docker compose -f compose.postgres.yaml up postgres -d
```

Verify it's running:

```bash
docker ps --filter "name=postgres"
```

### 3. Configure Database

Create `data/db-config.json`:

```json
{
  "type": "postgres",
  "hostname": "localhost",
  "port": 5432,
  "dbName": "uptimekuma",
  "username": "uptimekuma",
  "password": "localtest"
}
```

### 4. Start the App

```bash
npm run dev
```

This starts:
- **Frontend dev server**: http://localhost:3000 (with hot reload)
- **Backend API + WebSocket**: http://localhost:3001

Open http://localhost:3000 and complete the setup wizard to create your admin account.

### 5. Seed Foreman Monitors

```bash
UPTIME_KUMA_USERNAME=<your-admin> UPTIME_KUMA_PASSWORD='<your-password>' node extra/seed-foreman.js
```

### 6. View the Status Page

```
http://localhost:3000/status/foreman
```

### Resetting Local Data

Clear all monitors and status pages:

```bash
node -e "
const knex = require('knex')({ client: 'pg', connection: { host: 'localhost', port: 5432, user: 'uptimekuma', password: 'localtest', database: 'uptimekuma' } });
async function clean() {
    await knex('monitor_group').del();
    await knex('monitor_notification').del();
    await knex('heartbeat').del();
    await knex('monitor_tag').del();
    await knex('monitor').del();
    await knex('incident').del();
    await knex('incident_update').del();
    await knex.raw('DELETE FROM \"group\"');
    await knex('status_page_subscriber').del();
    await knex('status_page_cname').del();
    await knex('status_page').del();
    console.log('Cleared');
    process.exit(0);
}
clean().catch(e => { console.error(e.message); process.exit(1); });
"
```

Full database reset (drops everything):

```bash
docker exec issuelab-uptime-kuma-postgres-1 psql -U uptimekuma -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

### Stopping Local Services

```bash
# Stop the app: Ctrl+C in the terminal running npm run dev

# Stop PostgreSQL
docker compose -f compose.postgres.yaml down

# Stop and remove PostgreSQL data
docker compose -f compose.postgres.yaml down -v
```

---

## Railway Deployment (Production)

### 1. Push to GitHub

Ensure your fork is pushed to GitHub:

```bash
git add -A
git commit -m "IssueLab Status - initial deployment"
git push origin master
```

### 2. Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `issuelab-uptime-kuma` repository

### 3. Add PostgreSQL

1. In your Railway project, click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway will provision a managed PostgreSQL instance
3. Click the PostgreSQL service → **"Variables"** tab → note the connection details:
   - `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

### 4. Configure Environment Variables

Click your app service → **"Variables"** tab → add:

| Variable | Value |
|---|---|
| `PORT` | `3001` |
| `UPTIME_KUMA_PORT` | `3001` |

### 5. Create db-config.json at Runtime

Railway doesn't support config files out of the box. Add a start script that creates it. In your Railway service settings, set the **Start Command** to:

```bash
mkdir -p data && echo "{\"type\":\"postgres\",\"hostname\":\"$PGHOST\",\"port\":$PGPORT,\"dbName\":\"$PGDATABASE\",\"username\":\"$PGUSER\",\"password\":\"$PGPASSWORD\"}" > data/db-config.json && node server/server.js
```

Or alternatively, add these individual variables and reference them:

| Variable | Value (use Railway's PostgreSQL reference variables) |
|---|---|
| `PGHOST` | `${{Postgres.PGHOST}}` |
| `PGPORT` | `${{Postgres.PGPORT}}` |
| `PGUSER` | `${{Postgres.PGUSER}}` |
| `PGPASSWORD` | `${{Postgres.PGPASSWORD}}` |
| `PGDATABASE` | `${{Postgres.PGDATABASE}}` |

### 6. Configure Build Settings

In your service → **"Settings"**:
- **Root Directory**: `/` (default)
- **Builder**: `Dockerfile`
- **Dockerfile Path**: `Dockerfile`

### 7. Deploy

Railway auto-deploys on push. You can also trigger manually:
- Click **"Deploy"** in the Railway dashboard

### 8. Access Your App

Railway assigns a URL like `issuelab-uptime-kuma-production.up.railway.app`.

1. Open the URL → complete the setup wizard (create admin account)
2. Set the **Primary Base URL** in Settings → General (needed for email subscription links)

### 9. Seed Data on Production

```bash
UPTIME_KUMA_URL=https://your-railway-url.up.railway.app UPTIME_KUMA_USERNAME=<admin> UPTIME_KUMA_PASSWORD='<password>' node extra/seed-foreman.js
```

---

## Custom Domain Setup

### Railway

1. In Railway, click your service → **"Settings"** → **"Networking"**
2. Click **"+ Custom Domain"**
3. Enter `status.issuelab.co`
4. Railway gives you a CNAME target
5. In your DNS provider, add a CNAME record:
   ```
   status.issuelab.co → <railway-cname-target>
   ```
6. Railway auto-provisions SSL

### In-App Domain Mapping

1. Log in to the admin dashboard
2. Go to the Foreman status page → Edit mode
3. In the sidebar, under "Domain Names", add `status.issuelab.co`
4. Save

---

## Seeding Data

The seed script (`extra/seed-foreman.js`) creates:
- 10 health check monitors for Foreman
- 1 status page at `/status/foreman` with 3 groups
- Uptime display and email subscriptions enabled

### Environment Variables

| Variable | Description |
|---|---|
| `UPTIME_KUMA_URL` | Base URL (default: `http://localhost:3001`) |
| `UPTIME_KUMA_USERNAME` | Admin username |
| `UPTIME_KUMA_PASSWORD` | Admin password |

### Adding More Products

To add another product (e.g., "ProductB"):
1. Duplicate `extra/seed-foreman.js` as `extra/seed-productb.js`
2. Change the monitor URLs, names, and status page slug
3. Run: `UPTIME_KUMA_USERNAME=admin UPTIME_KUMA_PASSWORD=pass node extra/seed-productb.js`

Each product gets its own status page at `/status/<slug>`.

---

## SMTP Configuration

Required for email subscriptions to work.

1. Log in → **Settings** → **Notifications**
2. Configure SMTP settings:

| Setting | Example |
|---|---|
| `smtpHost` | `smtp.office365.com` or your Azure Email SMTP |
| `smtpPort` | `587` |
| `smtpSecure` | `false` (use STARTTLS) |
| `smtpUsername` | your email |
| `smtpPassword` | your app password |
| `smtpFrom` | `status@issuelab.co` |

3. Go to **Settings** → **General** → set **Primary Base URL** to your public URL (e.g., `https://status.issuelab.co`). This is required for confirmation and unsubscribe links in emails.

4. On each status page, enable "Allow Subscriptions" in the edit sidebar.

---

## Troubleshooting

### App Won't Start

**Check logs:**
```bash
# Local
npm run start-server-dev 2>&1 | head -50

# Railway
# Go to service → "Deployments" → click latest → "View Logs"
```

**Common issues:**
- `Database migration failed` → Check db-config.json exists and PostgreSQL is reachable
- `ECONNREFUSED` → PostgreSQL isn't running or port isn't accessible
- Blank page → Make sure frontend is built (`npm run build`) or use `npm run dev` for local

### Database Connection Issues

Test PostgreSQL connectivity:
```bash
# Local
docker exec issuelab-uptime-kuma-postgres-1 psql -U uptimekuma -c "SELECT 1"

# Direct connection test
node -e "
const knex = require('knex')({ client: 'pg', connection: { host: 'localhost', port: 5432, user: 'uptimekuma', password: 'localtest', database: 'uptimekuma' } });
knex.raw('SELECT 1').then(() => { console.log('Connected'); process.exit(0); }).catch(e => { console.error(e.message); process.exit(1); });
"
```

### Monitors Showing DOWN

- Check the monitor URL is accessible from the server (not just your browser)
- For `keyword` type monitors: verify the response body contains the exact keyword string
- Check the monitor's detail page for the full error message

### Seed Script Fails

- `Timeout: login` → Server not running, wrong URL, or rate limited. Restart the app and try again.
- `authIncorrectCreds` → Wrong username/password. Reset with:
  ```bash
  node -e "
  const knex = require('knex')({ client: 'pg', connection: { host: 'localhost', port: 5432, user: 'uptimekuma', password: 'localtest', database: 'uptimekuma' } });
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('NewPassword123!', 10);
  knex('user').update({ password: hash }).then(() => { console.log('Password reset'); process.exit(0); });
  "
  ```
- `Status page already exists` → Clear data first (see Resetting Local Data above)

### Password Reset

```bash
# Local
node -e "
const knex = require('knex')({ client: 'pg', connection: { host: 'localhost', port: 5432, user: 'uptimekuma', password: 'localtest', database: 'uptimekuma' } });
const bcrypt = require('bcryptjs');
knex('user').first().then(u => {
    const hash = bcrypt.hashSync('YourNewPassword!', 10);
    return knex('user').where('id', u.id).update({ password: hash });
}).then(() => { console.log('Done'); process.exit(0); });
"
```

### Rate Limiting

If you get rate limited during login attempts, restart the app — the rate limiter resets on restart.

---

## Maintenance & Operations

### Backup

**Database:**
```bash
# Local
docker exec issuelab-uptime-kuma-postgres-1 pg_dump -U uptimekuma uptimekuma > backup.sql

# Restore
docker exec -i issuelab-uptime-kuma-postgres-1 psql -U uptimekuma uptimekuma < backup.sql
```

**Railway:**
Railway provides automatic backups for PostgreSQL. You can also:
1. Go to PostgreSQL service → **"Data"** tab → **"Backups"**
2. Or connect via the Railway CLI: `railway connect postgres`

### Viewing Logs

```bash
# Local development
npm run dev          # logs to stdout

# Local production
node server/server.js 2>&1 | tee app.log

# Railway
# Dashboard → Service → Deployments → View Logs
# Or install Railway CLI:
npm install -g @railway/cli
railway login
railway logs
```

### Monitoring Intervals

Default monitor check interval is 60 seconds. To change per-monitor:
1. Dashboard → click monitor → Edit
2. Change "Heartbeat Interval"

### Data Retention

Uptime Kuma automatically manages data retention:
- **Minutely stats**: 24 hours
- **Hourly stats**: 30 days
- **Daily stats**: 365 days
- **Heartbeats**: Configurable in Settings → General → "Keep History"

### Updating

```bash
# Pull latest changes
git pull origin master

# Rebuild
npm ci
npm run build

# Restart
# Railway: auto-deploys on push
# Local: restart npm run dev
```

### Environment Variables Reference

| Variable | Description | Default |
|---|---|---|
| `UPTIME_KUMA_PORT` | Server port | `3001` |
| `UPTIME_KUMA_HOST` | Server bind address | `0.0.0.0` |
| `UPTIME_KUMA_SSL_KEY` | Path to SSL private key | - |
| `UPTIME_KUMA_SSL_CERT` | Path to SSL certificate | - |
| `NODE_ENV` | `development` or `production` | `production` |

### Health Check Endpoints

Your Foreman health endpoints monitored:

| Endpoint | Checks |
|---|---|
| `GET /health` | All checks (aggregate) |
| `GET /health/database` | PostgreSQL |
| `GET /health/aps_api` | Autodesk API |
| `GET /health/stripe` | Stripe |
| `GET /health/email_service` | Azure Email |
| `GET /health/job_scheduler` | Job scheduler heartbeat |
| `GET /health/email_queue` | Email queue heartbeat |
| `GET /health/quota_enforcement` | Quota enforcement heartbeat |
| `GET /health/oauth` | OpenIddict discovery |
| `GET /health/mcp_server` | MCP server |

Each monitor uses keyword matching: looks for `"status":"ok"` in the JSON response.

---

## Architecture

```
Browser → Railway (status.issuelab.co)
              ├── Node.js app (port 3001)
              │     ├── Express (REST API)
              │     ├── Socket.io (WebSocket)
              │     └── Monitor scheduler (heartbeats)
              └── PostgreSQL (managed by Railway)

Monitoring flow:
  Monitor → HTTP GET to foreman.issuelab.co/health/* every 60s
         → Check response contains "status":"ok"
         → Record heartbeat (UP/DOWN)
         → If status changed → notify subscribers via email
```
