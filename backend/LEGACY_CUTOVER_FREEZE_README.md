# MAI Legacy Render Freeze — Prepared Branch Only
Branch: `cutover/legacy-safe-freeze-20261025`.
This branch is **NOT** deployed. Live `main` and both existing Render services remain unchanged.

Purpose: when an authorized operator completes the official webhook cutover checklist,
allow both legacy Render services to remain reachable for health checking but stop all
Telegram, payout, broadcast and database activity.

How it works:
- `backend/package.json` script `npm start` runs only `legacy-freeze-http.js`.
- `backend/server.js` fails immediately if someone tries to start the old app directly.
- Freeze requires `MAI_LEGACY_CUTOVER_FROZEN=true` and `MAI_PAYOUT_ENABLED=false`.
- Standalone HTTP exposes ONLY GET `/health` and GET `/healthz` as 200 frozen.
- Every other request, including Telegram webhook and financial endpoints, returns 503.
- The freeze process does not import the legacy server, Telegram bot, Postgres or TON SDK.

DO NOT deploy until:
1. Both legacy Render DATABASE_URL identities have been compared to official Supabase
   using nonsecret project ID or hostname suffix (never share connection strings).
2. The official backend has implemented and tested the real signed secret-token webhook,
   admin auth, and current user / TON Connect flows and can accept Telegram updates.
3. Both legacy services are positively identified as using the intended repository,
   deployed to this freeze branch **together** under an approved maintenance procedure.
4. Record webhook state and last known good deploy IDs, and establish rollback steps.
5. Confirm that `MAI_LEGACY_CUTOVER_FROZEN=true` and `MAI_PAYOUT_ENABLED=false` are set on
   BOTH legacy services before their first freeze deployment.

Roll back only with an explicit coordinated maintainer plan: restoring main/legacy
start scripts can reclaim the Telegram webhook. Never blindly restart both old services.
No financial balances or historical payout data may be reset by this freeze.
