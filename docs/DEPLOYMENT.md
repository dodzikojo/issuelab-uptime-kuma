# IssueLab Status — Deployment Guide

## Table of Contents

- [Local Development](#local-development)
- [Railway Deployment (Production)](#railway-deployment-production)
- [Custom Domain Setup](#custom-domain-setup)
- [Seeding Data](#seeding-data)
- [SMTP Configuration](#smtp-configuration)
- [Post-Deployment Checklist](#post-deployment-checklist)
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

Deprecation warnings during install are normal and can be ignored.

### 2. Start PostgreSQL

Make sure Docker Desktop is running first, then:

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

> **Note**: On Windows/WSL, the app may be accessible on your network IP (e.g., `http://172.x.x.x:3000`) rather than `localhost:3000`. Check the terminal output for the URL.

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

Full database reset (drops everything — you'll need to re-run setup wizard):

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

Ensure your code is committed and pushed:

```bash
git checkout production
git merge master
git push origin production
```

Railway deploys from the `production` branch. Develop on `master`, merge to `production` when ready to deploy.

### 2. Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `issuelab-uptime-kuma` repository
5. Set the branch to **`production`**

### 3. Add PostgreSQL

1. In your Railway project canvas, click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway provisions a managed PostgreSQL instance automatically

### 4. Link Database Variables

1. Click your **app service** (not the Postgres one)
2. Go to the **"Variables"** tab
3. Add these variables — when typing the value, type `${{` and Railway will show an autocomplete dropdown. **Select from the dropdown**, don't type manually:

| Variable | Value |
|---|---|
| `PGHOST` | `${{Postgres.PGHOST}}` |
| `PGPORT` | `${{Postgres.PGPORT}}` |
| `PGUSER` | `${{Postgres.PGUSER}}` |
| `PGPASSWORD` | `${{Postgres.PGPASSWORD}}` |
| `PGDATABASE` | `${{Postgres.PGDATABASE}}` |

### 5. Configure Build Settings

Click your app service → **"Settings"** tab:

- **Builder**: Dockerfile
- **Dockerfile Path**: `Dockerfile`
- **Custom Start Command**: **Leave empty** (the Dockerfile handles startup via `docker-entrypoint.sh`)

> **Important**: The `docker-entrypoint.sh` script automatically creates `data/db-config.json` from the PG environment variables at container startup. Do NOT set a custom start command.

### 6. Deploy

Railway auto-deploys when you push to the `production` branch. You can also trigger a manual redeploy from the Deployments tab.

### 7. First-Time Setup

1. Open your Railway app URL (found in Settings → Networking)
2. Complete the setup wizard — create your admin account
3. Log in to the dashboard

### 8. Seed Data

Run this from your **local terminal** (the script connects remotely via WebSocket):

```bash
UPTIME_KUMA_URL=https://your-app.up.railway.app UPTIME_KUMA_USERNAME=<admin> UPTIME_KUMA_PASSWORD='<password>' node extra/seed-foreman.js
```

Replace the URL with your actual Railway URL.

---

## Custom Domain Setup

### Railway Configuration

1. Click your app service → **"Settings"** → **"Networking"** section
2. Click **"+ Custom Domain"**
3. Enter your domain: `status.issuelab.co`
4. **Set port to `8080`** (Railway routes external traffic through 8080)
5. Click **"Add Domain"**
6. Railway shows a CNAME target

### DNS Configuration

In your DNS provider, add a CNAME record:

```
Type:  CNAME
Name:  status
Value: <the-cname-target-railway-gives-you>
```

Railway auto-provisions SSL once DNS propagates (usually a few minutes).

### In-App Domain Mapping

1. Log in to the admin dashboard
2. Navigate to the Foreman status page → click **Edit** (pencil icon)
3. In the sidebar, under **"Domain Names"**, add `status.issuelab.co`
4. Click **Save**

### Verify

Visit `https://status.issuelab.co/status/foreman` — it should show your status page with SSL.

---

## Seeding Data

The seed script (`extra/seed-foreman.js`) creates:

- **10 health check monitors** for Foreman (keyword type, checking for `"status":"ok"`)
- **1 status page** at `/status/foreman` with 3 groups:
  - **Core Services**: Aggregate Health, Database, OAuth
  - **External Integrations**: Autodesk API, Stripe, Email Service, MCP Server
  - **Background Services**: Job Scheduler, Email Queue, Quota Enforcement
- **Uptime display** and **email subscriptions** enabled

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `UPTIME_KUMA_URL` | Target app URL | `http://localhost:3001` |
| `UPTIME_KUMA_USERNAME` | Admin username | (required) |
| `UPTIME_KUMA_PASSWORD` | Admin password | (required) |

### Adding More Products

To monitor another product:
1. Duplicate `extra/seed-foreman.js` as `extra/seed-<product>.js`
2. Update the monitor URLs, names, and status page slug
3. Run: `UPTIME_KUMA_URL=https://... UPTIME_KUMA_USERNAME=admin UPTIME_KUMA_PASSWORD=pass node extra/seed-<product>.js`

Each product gets its own isolated status page at `/status/<slug>`.

### Health Check Endpoints Monitored

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

Each monitor uses **keyword matching**: checks that the response body contains `"status":"ok"`.

---

## SMTP Configuration

Required for email subscriptions to work.

### 1. Configure SMTP Settings

1. Log in → **Settings** (gear icon) → find the SMTP/email notification settings
2. Set up a notification with type **"Email (SMTP)"**:

| Setting | Example |
|---|---|
| SMTP Host | `smtp.office365.com` (or your Azure Email SMTP) |
| SMTP Port | `587` |
| SMTP Security | STARTTLS |
| SMTP Username | your email |
| SMTP Password | your app password |
| From Email | `status@issuelab.co` |

### 2. Set Primary Base URL

Go to **Settings** → **General** → set **Primary Base URL** to your public URL:

```
https://status.issuelab.co
```

This is required for confirmation and unsubscribe links in emails to work correctly.

### 3. Enable Subscriptions

On each status page, enter Edit mode and enable **"Allow Email Subscriptions"** in the sidebar.

---

## Post-Deployment Checklist

After deploying to production, verify:

- [ ] App loads at Railway URL
- [ ] Setup wizard completed (admin account created)
- [ ] Seed script ran successfully (monitors + status page created)
- [ ] Custom domain configured (`status.issuelab.co`)
- [ ] DNS CNAME record added and propagated
- [ ] SSL certificate auto-provisioned by Railway
- [ ] Status page accessible at `https://status.issuelab.co/status/foreman`
- [ ] Monitors showing UP (check dashboard)
- [ ] Uptime percentages displaying (may take a few minutes for 24h data)
- [ ] Primary Base URL set in Settings → General
- [ ] SMTP configured (if using email subscriptions)
- [ ] "Allow Subscriptions" enabled on status page
- [ ] Test subscription flow: subscribe → confirm email → receive notification

---

## Troubleshooting

### App Won't Start on Railway

**Check deploy logs**: Service → Deployments → click latest → Deploy Logs

**Common issues:**

| Error | Cause | Fix |
|---|---|---|
| `PGHOST` shows empty | Variable references not linked | Re-add variables using `${{Postgres.PGHOST}}` autocomplete |
| `ERESOLVE` during build | Peer dependency conflicts | `.npmrc` with `legacy-peer-deps=true` must be in Docker build (already configured) |
| `vite: not found` | Dev dependencies missing during build | Multi-stage Dockerfile needed (already configured) |
| Setup wizard appears on prod | `db-config.json` not created | Ensure `docker-entrypoint.sh` is the CMD (no custom start command) |
| `Starting Container` then nothing | Start command override interfering | Clear the Custom Start Command in Settings |

### Database Connection Issues

Test PostgreSQL connectivity locally:
```bash
docker exec issuelab-uptime-kuma-postgres-1 psql -U uptimekuma -c "SELECT 1"
```

Direct connection test:
```bash
node -e "
const knex = require('knex')({ client: 'pg', connection: { host: 'localhost', port: 5432, user: 'uptimekuma', password: 'localtest', database: 'uptimekuma' } });
knex.raw('SELECT 1').then(() => { console.log('Connected'); process.exit(0); }).catch(e => { console.error(e.message); process.exit(1); });
"
```

### Monitors Showing DOWN

- **"keyword not found"**: Verify the health endpoint returns JSON containing `"status":"ok"` (exact string match)
- **Connection refused**: The monitor URL isn't reachable from Railway's servers
- **Timeout**: Increase the monitor timeout in the dashboard (Edit → Timeout)

### Seed Script Fails

| Error | Fix |
|---|---|
| `Timeout: login` | App not running, wrong URL, or rate limited. Restart app and try again. |
| `authIncorrectCreds` | Wrong password. Reset it (see below). |
| `Status page already exists` | Clear data first, or delete manually from dashboard. |

### Password Reset

```bash
# For local development
node -e "
const knex = require('knex')({ client: 'pg', connection: { host: 'localhost', port: 5432, user: 'uptimekuma', password: 'localtest', database: 'uptimekuma' } });
const bcrypt = require('bcryptjs');
knex('user').first().then(u => {
    const hash = bcrypt.hashSync('YourNewPassword!', 10);
    return knex('user').where('id', u.id).update({ password: hash });
}).then(() => { console.log('Done'); process.exit(0); });
"
```

For production, connect to the Railway PostgreSQL via `railway connect postgres` or use the Railway dashboard's query tool.

### Rate Limiting

If you get rate limited during login attempts, restart the app — the rate limiter resets on restart.

---

## Maintenance & Operations

### Branching Strategy

- **`master`** — development branch, make changes here
- **`production`** — deployment branch, Railway deploys from this

To deploy changes:
```bash
git checkout production
git merge master
git push origin production
# Railway auto-deploys
git checkout master
```

### Backup

**Railway PostgreSQL:**
- Railway provides automatic backups: Postgres service → **"Backups"** tab
- Manual backup via Railway CLI:
  ```bash
  npm install -g @railway/cli
  railway login
  railway connect postgres
  # Then run: pg_dump uptimekuma > backup.sql
  ```

**Local PostgreSQL:**
```bash
docker exec issuelab-uptime-kuma-postgres-1 pg_dump -U uptimekuma uptimekuma > backup.sql

# Restore
docker exec -i issuelab-uptime-kuma-postgres-1 psql -U uptimekuma uptimekuma < backup.sql
```

### Viewing Logs

```bash
# Local
npm run dev          # logs to stdout

# Railway — via dashboard
# Service → Deployments → View Logs

# Railway — via CLI
npm install -g @railway/cli
railway login
railway logs
```

### Data Retention

Uptime Kuma automatically manages data retention:
- **Minutely stats**: 24 hours
- **Hourly stats**: 30 days
- **Daily stats**: 365 days
- **Heartbeats**: Configurable in Settings → General → "Keep History"

### Updating

```bash
# Make changes on master
git add <files>
git commit -m "description of changes"
git push origin master

# Deploy to production
git checkout production
git merge master
git push origin production
git checkout master
```

Railway auto-deploys on push to the `production` branch.

### Environment Variables Reference

| Variable | Description | Default |
|---|---|---|
| `UPTIME_KUMA_PORT` | Server port | `3001` |
| `UPTIME_KUMA_HOST` | Server bind address | `0.0.0.0` |
| `PGHOST` | PostgreSQL hostname | (required) |
| `PGPORT` | PostgreSQL port | `5432` |
| `PGUSER` | PostgreSQL username | (required) |
| `PGPASSWORD` | PostgreSQL password | (required) |
| `PGDATABASE` | PostgreSQL database name | (required) |
| `NODE_ENV` | Environment | `production` |

---

## Architecture

```
Users → status.issuelab.co (Railway)
            ├── Node.js app (port 3001, exposed as 8080)
            │     ├── Express (REST API + static files)
            │     ├── Socket.io (WebSocket for real-time updates)
            │     ├── Monitor scheduler (checks health endpoints every 60s)
            │     └── Subscriber service (sends emails on incidents/maintenance)
            └── PostgreSQL (managed by Railway)

Foreman (Hetzner) ← HTTP health checks from Railway every 60s
    └── /health/*  endpoints return {"status":"ok",...}
```
