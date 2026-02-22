# Volleyball Season Web App: Stack + Hosting Options (with Free Paths)

- Date: 2026-02-22
- Scope: Evaluate build stack and hosting options for a volleyball-season management app, with emphasis on free or near-free solutions.
- Audience mode: Technical

## Executive summary
- [Fact][High] A fully free deployment path exists for small workloads using Cloudflare Pages + Workers + D1 (SQL) + R2 (files), with explicit free limits documented by Cloudflare.
- [Fact][High] Supabase offers a strong developer stack on a free plan (2 projects, database/storage/auth limits), but free projects can be constrained by plan limits and are less predictable for sustained production use.
- [Fact][High] Firebase can start free on Spark, but Firebase App Hosting specifically requires Blaze (pay-as-you-go), so “fully free” is not guaranteed once you adopt App Hosting.
- [Inference][Medium] For a new volleyball app, a pragmatic path is: start Cloudflare-native for lowest recurring cost; move to Supabase Pro or managed Postgres only when product/traffic requires richer relational and analytics capabilities.

## Key findings

### 1) Best true-free hosting baseline (custom app)
- [Fact][High] Cloudflare Workers free plan includes a daily request allowance (published as 100k/day).
- [Fact][High] D1 (Cloudflare SQL) publishes free-plan quotas and per-account limits suitable for small season-management apps.
- [Fact][High] Cloudflare Pages publishes free-tier monthly build limits and seats, which is generally enough for a small team.
- [Inference][Medium] This combination is the most realistic “stay free longest” route if your app is mostly CRUD, schedule updates, and moderate read traffic.

### 2) Fastest feature velocity stack (still free to start)
- [Fact][High] Supabase free plan includes hosted Postgres, auth, storage, and edge functions with clear quotas (projects, DB size, MAU, egress, function calls).
- [Inference][Medium] Supabase is likely faster to build with for season workflows (teams, rosters, matches, standings, stats) than assembling auth/storage/SQL primitives yourself.
- [Risk][Medium] You should treat free tier as staging/early production and plan for eventual paid transition when usage grows.

### 3) Providers with “free” caveats
- [Fact][High] Vercel Hobby is intended for non-commercial/personal use and has fair-use constraints; check fit if this becomes a business.
- [Fact][High] Netlify now uses monthly credits; free usage exists but operational limits are credit-based rather than “unlimited free hosting.”
- [Fact][High] Render’s free web service is explicitly not for production use and has operational constraints.
- [Fact][High] Railway provides trial credit and then usage-based billing; not a long-term free host.

## Options

| Option | Stack | Free viability | Good for | Main risk |
|---|---|---|---|---|
| A (recommended default) | Cloudflare Pages + Workers + D1 + R2 | High (small/medium community leagues) | Lowest recurring cost, simple API + SQL workloads | More DIY for auth/admin/reporting features |
| B | Next.js + Supabase (Postgres/Auth/Storage) + Cloudflare Pages/Workers for frontend/API edge | Medium | Fast MVP and relational data modeling | Free limits reached sooner; likely paid upgrade |
| C | Firebase (Auth/Firestore/Functions) + App Hosting | Medium-low for “fully free” goal | Teams already in Google ecosystem | App Hosting requires Blaze; cost predictability |
| D | Render/Railway style PaaS | Low for long-term free | Traditional server deployment ergonomics | Free tiers are trial-like or non-production |

## Free out-of-the-box alternatives (buy vs build)
- [Fact][High] **Zuluru** is an open-source sports league manager (self-hosted; no license fee, but you operate hosting).
- [Fact][High] **SportsPress** (WordPress plugin) has a free version with leagues/events/tables/player/team profiles.
- [Fact][Medium] **TeamSnap** has a free tier with a roster-size cap.
- [Fact][Medium] **Spond** is free to use, with payment-processing fees when collecting money.
- [Inference][Medium] If your primary goal is schedule + roster + communication (not custom workflows), starting with an off-the-shelf platform can avoid months of custom build.

## Risks and uncertainties
- [Risk][Medium] Free-plan policies can change; re-check limits before launch.
- [Risk][Medium] If you need advanced stats (set-level, serve/receive analytics, referee workflows), no-code/free tools may force eventual custom development.
- [Risk][Low] Multi-tenant league rules (promotion/relegation, tournament brackets, playoff seeding variants) are easier in relational SQL than spreadsheet-like tools.

## Recommendation and next actions
- [Recommendation] Build a thin custom MVP on **Option A (Cloudflare-native)** if minimizing cost is the top objective.
- [Recommendation] Use a relational schema from day one: `organizations`, `seasons`, `divisions`, `teams`, `players`, `matches`, `sets`, `events`, `standings_snapshots`.
- [Recommendation] If admin complexity grows quickly, migrate backend to Supabase Pro while keeping frontend at edge.

Next actions:
1. Define season model scope (league-only vs tournament + playoffs + stats depth).
2. Validate expected monthly traffic/users to confirm free-tier fit.
3. Pick A/B and run a 1-week spike (auth, schedule CRUD, standings auto-calc, public fixtures page).
