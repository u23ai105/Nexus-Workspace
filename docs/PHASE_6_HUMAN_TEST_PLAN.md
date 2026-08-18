# Phase 6 Human Test Plan: Workspace & Global Chat

Use this manual test protocol to verify the Phase 6 chat UI polish requirements.

## Test Protocol

### CHAT-001: Workspace Chat initial load
1. Open a workspace dashboard.
2. Click the chat icon in the global header or right-hand panel button to toggle Workspace Chat.
3. **Verify:** The right-hand chat panel slides in smoothly without breaking the layout. The panel uses dark mode semantic tokens (no neon gradients). The empty state is calm and informative.

### CHAT-002: Sending a message
1. Type a message in the chat input.
2. Press Enter or click the Send button.
3. **Verify:** The message is sent successfully. The outgoing message bubble appears flush to the right, using semantic `bg-primary` text colors, without an excessive shadow or heavy borders.

### CHAT-003: Receiving a realtime message
1. Open the same workspace in another incognito window with a different user.
2. Send a message from User B to User A.
3. **Verify:** User A receives the message instantly. The incoming message bubble appears flush to the left, using neutral elevated surfaces (`bg-muted/50`). Timestamps are correctly subordinate.

### CHAT-004: Message hover/action visibility
1. Hover over a sent or received message.
2. **Verify:** The background does not flash disruptively. A context-action button (like "Copy message") appears. It is discoverable but non-intrusive.

### CHAT-005: Mention autocomplete
1. In the chat input, type `@`.
2. **Verify:** A popover menu appears containing workspace members. It aligns correctly above the input without overlapping awkwardly. It uses `bg-popover` tokens. Selecting a user inserts the mention correctly.

### CHAT-006: Document autocomplete
1. In the chat input, type `/doc`.
2. **Verify:** A popover menu appears containing documents and files. It behaves consistently with the mention popover.

### CHAT-007: Input focus + keyboard behavior
1. Click into the chat input.
2. **Verify:** A subtle `focus:ring` appears (not visually heavy). The Send button enables/disables correctly based on input presence.

### CHAT-008: Scroll behavior
1. Populate the chat with enough messages to cause overflow.
2. **Verify:** Only the messages area scrolls. The overall page layout does not jump. Sending a new message smoothly scrolls to the bottom.

### CHAT-009: Empty state
1. Open a workspace or direct message thread that has no messages.
2. **Verify:** A clean, calm empty state appears, matching the dark theme without large dead areas.

### CHAT-010: Loading/error state
1. Reload the page while the chat panel is open.
2. **Verify:** A spinner using semantic tokens (`border-primary`) appears during initial load.

### CHAT-011: Responsive chat panel
1. Resize the browser window to mobile width.
2. **Verify:** The chat panel becomes a full-screen overlay or responsive drawer, remaining fully usable without horizontal scrolling.

### CHAT-012: GlobalChat visual consistency
1. Click the Direct Messages icon in the Global Header.
2. **Verify:** The direct messages layout, message bubbles, input fields, and hover states identically match those in Workspace Chat. There are no hardcoded hex colors (e.g. `#0A0A0F`).

### CHAT-013: Accessibility of icon-only controls
1. Inspect the "Close Chat" and "Send Message" buttons.
2. **Verify:** They have `aria-label` attributes set correctly.

### CHAT-014: Panel open/close behavior
1. Click the close button inside the chat panel.
2. **Verify:** The panel smoothly exits without triggering a full page re-render.
