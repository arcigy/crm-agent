# Background Sync Plan: Google Calendar & Gmail

## Problem Statement
The current system only syncs Google Calendar and Gmail data when a user is actively using the dashboard (pull-on-demand). This leads to:
1.  Stale data in the CRM (e.g., meetings not reflecting in the dashboard until a manual refresh).
2.  Missing "Lead" opportunities from Gmail in real-time.
3.  Inability to trigger automations (e.g., Slack notifications) when the browser is closed.

## Proposed Architecture: Distributed Polling & Webhooks

### 1. Gmail: Google Push Notifications (Webhooks)
Gmail supports **Cloud Pub/Sub** push notifications.
-   **Registration**: The CRM will call `gmail.users.watch()` for each active user.
-   **Receiver**: A Next.js API route (`/api/webhooks/google/gmail`) will receive the Pub/Sub push.
-   **Processing**: When a notify arrives, the worker will:
    1.  Identify the user.
    2.  Call `history.list()` to see what changed.
    3.  Sync individual messages (Leads) to Directus.

### 2. Calendar: Periodic Sync (Cron) + Webhooks
Google Calendar also supports webhooks, but they have short expiry dates.
-   **Hybrid Approach**:
    -   **Webhooks**: `/api/webhooks/google/calendar` to receive push updates for immediate responsiveness.
    -   **Cron Job**: A periodic worker (`/api/cron/sync-google-calendar`) every 15-30 minutes to:
        1.  Iterate over all active `google_tokens` in Directus.
        2.  Call `calendar.events.list()` using `syncToken` for incremental updates.
        3.  Update Directus records.

### 3. Token & State Management
-   **Sync Tokens**: Store `nextSyncToken` and `nextPageToken` in the `google_tokens` collection to enable efficient delta-syncs.
-   **Health Check**: A watchdog process to identify users with expired/missing refresh tokens and notify them to re-connect.

## Implementation Steps
1.  **Collection Updates**: Add `sync_token_calendar` and `sync_token_gmail` fields to `google_tokens`.
2.  **Webhook Routes**: Create `/api/webhooks/google/*`.
3.  **Sync Logic**: Implement `dist/lib/google-sync-service.ts` for shared logic.
4.  **Cron Workers**: Add `/api/cron/google-sync-scheduler` to Railway to trigger the sync for all users.
