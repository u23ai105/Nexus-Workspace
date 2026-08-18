# Phase 10: Human Test Plan (Notifications & Activity)

This document outlines the exact manual verification steps required to validate the GitHub-style Phase 10 architecture and UX constraints.

## Pre-requisites
- Two test users (User A, User B).
- A shared workspace where User A is OWNER/ADMIN and User B is at least EDITOR.

---

### NOTIF-001: New unread notification
1. Log in as User B, create an action item in the shared workspace, and assign it to User A.
2. Observe User A's Notification Bell.
3. **Expectation:** The Bell shows an unread dot/count of 1.

### NOTIF-002: Read notification remains in Inbox
1. As User A, open the Notification Bell popover.
2. Click the new notification.
3. **Expectation:** The notification is marked as read (loses blue dot). It navigates you to the relevant document/task.
4. Open the Notification Bell again.
5. **Expectation:** The notification is STILL in the popover, grouped under its workspace.

### NOTIF-003: Read notification loses unread emphasis
1. Observe the read notification in the popover.
2. **Expectation:** It no longer has a bold/highlighted background or a blue dot, distinguishing it visually from unread items.

### NOTIF-004: Done removes notification from Inbox
1. Hover over the read notification in the popover.
2. Click the "Check" (Mark as done) icon button.
3. **Expectation:** The notification immediately disappears from the popover (the Inbox).

### NOTIF-005: Done item appears in Done view
1. Click "View all notifications" to go to `/notifications`.
2. Click the "Done" tab.
3. **Expectation:** The notification you just marked as done is visible in this list.

### NOTIF-006: Mark all as Done
1. As User B, assign two new tasks to User A.
2. As User A, navigate to `/notifications` (Inbox tab).
3. Click "Mark all as done".
4. **Expectation:** The Inbox becomes empty. The Done tab now contains these items.

### NOTIF-007: Workspace grouping
1. As User A, look at the `/notifications` page or popover while having notifications from multiple workspaces.
2. **Expectation:** Notifications are cleanly grouped under headers containing the workspace name.

### NOTIF-008: Invite presentation
1. As User B, invite User A to a new workspace.
2. As User A, open the Notification Bell.
3. **Expectation:** The invite appears in the Inbox alongside regular notifications, containing "Accept" and "Decline" buttons.

### NOTIF-009: Task notification
1. Receive a task assignment.
2. **Expectation:** The UI clearly reads "User B assigned you..." and shows an appropriate icon without exposing internal enum names.

### NOTIF-010: Notification navigation
1. Click a notification for a task inside a document.
2. **Expectation:** React Router correctly navigates to `/w/:workspaceId/d/:documentId`.

### NOTIF-011: Realtime arrival
1. Open two browsers side-by-side (Window A: User A, Window B: User B).
2. Assign a task in Window B.
3. **Expectation:** Window A's unread count increments instantly and the popover updates without a page refresh.

### NOTIF-012: Unread count
1. Verify that marking a notification as read (but not done) decrements the unread count on the bell.
2. **Expectation:** The unread count only reflects items where `readAt = null` AND `archivedAt = null`.

### NOTIF-013: Mobile popover/inbox
1. Use DevTools to emulate a narrow mobile screen.
2. Open the popover and navigate to `/notifications`.
3. **Expectation:** The popover does not overflow horizontally. The full-page layout remains usable.

### NOTIF-014: Keyboard accessibility
1. Press `Tab` to reach the Notification Bell, press `Enter` to open.
2. Use `Tab` to navigate to a notification's "Mark as done" button.
3. Press `Escape` to close the popover.
4. **Expectation:** Fully keyboard navigable.

### NOTIF-015: Duplicate prevention
1. Trigger the exact same task assignment API request twice rapidly (simulating network retry).
2. **Expectation:** Only one `TASK_ASSIGNED` notification appears for the recipient due to backend idempotency keys.
