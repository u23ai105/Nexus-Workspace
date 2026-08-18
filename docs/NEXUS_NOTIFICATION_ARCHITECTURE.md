# Nexus Notification Architecture

This document describes the design and behavior of the notification system in Nexus (implemented in Phase 10).

## 1. The GitHub-Style Lifecycle (Inbox Zero)

Nexus uses a strict state model for notifications:

- **UNREAD:** `readAt = null`, `archivedAt = null`. Appears in the Inbox with emphasis. Contributes to unread count.
- **READ:** `readAt != null`, `archivedAt = null`. Appears in the Inbox without emphasis. Does not contribute to unread count.
- **DONE:** `archivedAt != null`. Removed from the Inbox, moved to the "Done" view.

This distinction allows users to read a notification (clearing the unread badge) while keeping it in their Inbox until they explicitly clear it (Mark as Done).

## 2. Notification vs Activity Distinction

A core design principle in Nexus is the strict separation between Notifications and Workspace Activity.

- **Notification:** A meaningful event that is specifically addressed to a user and requires their attention (e.g., "Someone assigned you a task", "Someone mentioned you").
- **Activity:** A record of workspace-wide events that form a history of what happened (e.g., "Priya edited the Project Plan").

**Crucially, not every Activity creates a Notification.** For example, routine document auto-saves or normal collaborative editing emit Activity events but do *not* generate personal Notifications to avoid spam.

## 3. Notification vs Invite Distinction

The Notification center presents both Invites and Notifications in a unified UI feed. However, they remain distinct in the backend domain model.
- **WorkspaceInvite:** Handles the invitation lifecycle, expiration, and role provisioning (as designed in Phase 9).
- **Notification:** Represents a personal event log.
We do *not* duplicate pending invites into the Notification table. Instead, the `GET /api/notifications` API fetches pending `WorkspaceMember` records and mixes them into a unified presentation model (`UnifiedNotification`).

## 4. Recipient & Actor Model

Every `Notification` belongs to exactly **one intended recipient** (`recipientId`). We do not broadcast personal notifications to the entire workspace.
Where appropriate, we store the `actorId` (the user who triggered the event).
**Self-notification rule:** By default, if the actor and recipient are the same user, the system suppresses the notification unless explicitly opted-in via `allowSelfNotification: true`.

## 5. Deduplication (Idempotency)

The `Notification` model contains an optional `eventId` string with a unique constraint.
When creating a notification (e.g., via `NotificationService`), we can pass a deterministic identifier such as `TASK_ASSIGNED:{taskId}:{recipientId}`.
If the API controller is invoked twice or network retries occur, the database unique constraint guarantees that only one notification is created.

## 6. Realtime Delivery

When a notification is persisted, `NotificationService` emits a targeted realtime event via Socket.io.
- **Emission target:** `io.to('user:{userId}').emit('notification:new', ...)`
- The receiving client updates its unread count and prepends the notification to the Inbox without requiring a full page refresh.

## 7. API Shape & Pagination

Endpoints:
- `GET /api/notifications` (Inbox: `archivedAt: null`)
- `GET /api/notifications/done` (Done: `archivedAt: not null`)
- `GET /api/notifications/unread-count` (`readAt: null, archivedAt: null`)
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/:id/archive`
- `PATCH /api/notifications/archive-all`

The API returns a presentation-ready array combining invites and notifications, sorted newest first:
```json
{
  "items": [
    { "kind": "invite", "id": "...", "workspaceName": "Acme Corp" },
    { "kind": "notification", "id": "...", "type": "TASK_ASSIGNED", "title": "...", "readAt": null, "archivedAt": null }
  ],
  "nextCursor": "..."
}
```

## 8. Security & Database Indexes

All notification endpoints strictly enforce the authenticated user's identity (`req.user.id`).
A user can only read, mark read, or archive their own notifications.

Indexes applied in Prisma:
- `@@index([recipientId, createdAt])` (Sorting)
- `@@index([recipientId, readAt])` (Unread count filtering)
- `@@index([recipientId, archivedAt])` (Inbox vs Done filtering)

## 9. Presentation (Popover & Dedicated Page)

- **NotificationBell (Popover):** A quick-access preview limited by a `max-height`. Groups notifications by workspace name. Includes single-click "Mark as done" context actions.
- **Dedicated Page (`/notifications`):** A full workspace offering Inbox and Done tabs, richer list layout, and bulk "Mark all as done" actions. Maintains Nexus' calm visual language.
