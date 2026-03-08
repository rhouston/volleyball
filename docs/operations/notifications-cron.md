# Notifications Cron Runbook

## Purpose
Dispatch queued notifications (`status=QUEUED`) from the `notifications` table with an inline best-effort send on write actions and a fixed daily cron sweep on Vercel Hobby.

## Schedule
- Cron config file: `apps/web/vercel.json`
- Endpoint: `/api/cron/notifications`
- Cadence: daily at `20:00 UTC` (`0 20 * * *`)
- Reason: Vercel Hobby does not support the original 10-minute cron design, so the app now sends immediately when possible and uses cron as a daily backstop.

## Required Environment Variables
- `CRON_SECRET`: shared secret used by the cron route.
- `DATABASE_URL`: PostgreSQL connection string (Neon for hosted env).
- `RESEND_API_KEY`: required for email channel sends.
- `EMAIL_FROM`: verified sender address for Resend.

## Manual Trigger
Use this from a trusted shell:

```bash
curl -sS -X GET \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${APP_BASE_URL}/api/cron/notifications"
```

Expected JSON shape:

```json
{
  "status": "ok",
  "summary": {
    "processed": 10,
    "emailed": 9,
    "failed": 1
  }
}
```

## Dispatch Semantics
- `POST /api/v1/notifications` enqueues the notification and immediately runs an inline dispatch cycle for this small-project Hobby deployment model.
- Route authenticates `Authorization: Bearer ${CRON_SECRET}`.
- Query selects oldest `QUEUED` notifications, `attempt_count < 3`, and `scheduled_for <= now` (or null).
- Success:
  - sets `status='SENT'`
  - sets `sent_at`
  - increments `attempt_count`
  - clears `last_error`
- Failure:
  - increments `attempt_count`
  - writes `last_error`
  - keeps `status='QUEUED'` while attempts remain
  - sets `status='FAILED'` when `attempt_count` reaches 3

## Failure Triage Checklist
1. Verify `CRON_SECRET` in Vercel project settings and request header.
2. Confirm DB connectivity (`DATABASE_URL`) and query latency.
3. Check `RESEND_API_KEY` and `EMAIL_FROM` configuration.
4. Inspect latest `last_error` values for repeated causes.
5. Validate backlog growth and retry saturation.

## Resend Outage Fallback
- Inline sends should fail safely back to queued retry behavior.
- Keep the daily cron active; failed rows will retry until `attempt_count` reaches 3.
- For prolonged outages, temporarily pause enqueue callers for non-critical mail.
- Once provider recovers, optionally requeue `FAILED` rows after review.

## Operational Queries
Queue health snapshot:

```sql
select status, count(*)
from notifications
group by status
order by status;
```

Retry pressure:

```sql
select attempt_count, count(*)
from notifications
where status in ('QUEUED', 'FAILED')
group by attempt_count
order by attempt_count;
```

Latest failures:

```sql
select id, recipient_user_id, attempt_count, last_error, created_at
from notifications
where status = 'FAILED'
order by created_at desc
limit 50;
```
