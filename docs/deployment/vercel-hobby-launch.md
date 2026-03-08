# Vercel Hobby Launch Path

## Scope
This project is configured for a small community deployment on Vercel Hobby with Neon PostgreSQL, Prisma, Auth.js, and Resend.

## Build Settings
- Root directory: `apps/web`
- Install command: `npm install`
- Build command: `npm run build:vercel`
- Output: Next.js default output

## Required Environment Variables
- `APP_BASE_URL`
- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `AUTH_TRUST_HOST=true`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `APPLE_ID`
- `APPLE_SECRET`
- `EMAIL_FROM`
- `RESEND_API_KEY`
- `CRON_SECRET`
- `SERVICE_BACKEND=prisma`

## Vertical Slice to Release First
The first production slice should cover this path only:

1. Admin signs in.
2. Admin creates a season.
3. Admin confirms grades, courts, and timeslots.
4. Admin creates at least two teams in one grade.
5. Admin generates fixtures and duties.
6. Admin reviews diagnostics.
7. Admin publishes the season.

## Deploy Sequence
1. Create the Neon database and copy the pooled `DATABASE_URL` plus the unpooled `DIRECT_URL`.
2. Create the Vercel project with `apps/web` as the root.
3. Add all required environment variables for `Preview` and `Production`.
4. Trigger the first deployment.
5. After deployment, run the admin vertical slice manually from `/admin`.
6. Configure the daily cron from `apps/web/vercel.json`.

## Verification
- `npm run lint`
- `npm run typecheck`
- `npm run test:coverage`
- `npm run test:e2e`
- Manual `/admin` verification against the deployed preview URL

## Neon Mapping
- `DATABASE_URL`: pooled Neon URL. Use the hostname that contains `-pooler`.
- `DIRECT_URL`: unpooled Neon URL. Use the hostname without `-pooler`.
- `PG_BOSS_DATABASE_URL`: same value as `DATABASE_URL`.

## Preview Environment Block
Use this structure in Vercel project settings for the preview deployment:

```env
APP_BASE_URL=https://volleyball-sigma.vercel.app
DATABASE_URL=<pooled neon url>
DIRECT_URL=<unpooled neon url>
PG_BOSS_DATABASE_URL=<pooled neon url>
AUTH_SECRET=<generate with openssl rand -base64 32>
CRON_SECRET=<generate with openssl rand -hex 32>
AUTH_TRUST_HOST=true
SERVICE_BACKEND=prisma
RESEND_API_KEY=<your resend api key>
EMAIL_FROM=<verified resend sender, not a personal gmail address>
```

Optional for later auth provider rollout:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APPLE_ID=
APPLE_SECRET=
```

## Hobby Constraints
- Notification delivery uses inline best-effort dispatch on writes.
- Cron is a daily safety sweep, not a near-real-time worker.
- Keep background work small and request-bound.
