# Prioritized Fix & Implementation Plan

## Phase A: Security & Token Recovery (Immediate)
1.  **Directus Hardening**: Remove hardcoded token from `src/lib/directus.ts`.
2.  **Consent Refresh Logic**: Force a re-consent UI for users missing `refresh_token` in `google_tokens`.

## Phase B: Data Integrity & N+1 Fixes (High Priority)
1.  **Schema Cleanup**: Delete `init-directus.ts` (legacy JSON logic) to avoid developer confusion.
2.  **Batch Lookups**: Refactor internal API routes to use Directus `_in` filters for batch lookups instead of sequential lookups.

## Phase C: Background Sync Implementation (Strategic)
1.  **Gmail Pub/Sub**: Implement Google Push Notifications for real-time lead ingestion.
2.  **Calendar Delta Sync**: Implement periodic sync using `nextSyncToken` to keep the dashboard fresh.
3.  **Worker Standardisation**: Migrate chained fetches to a robust Queue system (if available) or standardize the `cron` workers.

## Phase D: Polish & Resilience
1.  **Conflict Resolution**: Implement simpler "Last Updated" check in `syncContactToGoogle`.
2.  **Agent Modularization**: Split `agent-registry.ts` into individual atom files (e.g., `registry/gmail.ts`, `registry/db.ts`).

---
See [background_sync_plan.md](file:///c:/Users/laube/Downloads/Agentic%20Workflows/CRM/docs/background_sync_plan.md) for technical deep-dive.
