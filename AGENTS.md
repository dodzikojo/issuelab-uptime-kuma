# IssueLab Uptime Kuma Fork

This repository is an internally maintained IssueLab fork of
`louislam/uptime-kuma`. Work performed here targets IssueLab's own fork and
Railway deployment; it is not an upstream contribution unless the user says so
explicitly.

## Agent authorization

- Agents may implement, test, review, and deploy changes of any size in this
  fork when requested by the repository owner.
- Preserve the IssueLab product customizations: PostgreSQL support, status-page
  branding, SLA reporting, enhanced incidents, subscriptions, and Railway
  deployment support.
- Upstream alignment must happen on a `codex/` branch. Merge a stable upstream
  release tag rather than an unreleased branch, resolve conflicts deliberately,
  and verify database compatibility before deployment.
- Keep upstream-only GitHub Actions disabled unless the repository owner asks
  to adopt them.
- Never claim an alignment or deployment succeeded without fresh test output
  and a runtime smoke test.

## Upstream contributions

The upstream project's agent restrictions apply to pull requests intended for
`louislam/uptime-kuma`. Do not open or prepare an upstream pull request without
the owner's explicit direction and personal review. Those restrictions do not
prohibit maintenance of this independent fork.

## Production

- Railway project: `thriving-laughter`
- Application service: `issuelab-uptime-kuma`
- Environment: `production`
- Custom domain: `https://status.issuelab.co`
- Production uses PostgreSQL. SQLite-only SQL assumptions must not be
  reintroduced during upstream merges.
