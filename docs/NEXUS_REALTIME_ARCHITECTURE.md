# Nexus Real-time Architecture

This document describes the architectural decisions and data flow for real-time collaborative editing and presence in Nexus.

## Core Roles & Transports

### Yjs (The Document Store)
Yjs is the canonical source of truth for document state, including rich text, block locations, and collaborative editing operations. It manages conflict resolution through its internal CRDT (Conflict-free Replicated Data Type) structures.

### Yjs Awareness (The Presence Store)
The `y-protocols/awareness` package is the authoritative source for ephemeral state (state that should not persist in the database). This includes:
1. **User Identity:** Name, ID, cursor color.
2. **Cursor Position:** Line and character offset.
3. **Presentation Mode:** Whether the user is presenting, and their current normalized viewport position.

**DECISION:** Use Yjs Awareness for presentation viewport state.
**REASON:** Keeps all ephemeral document-scoped presence in one unified state mechanism.
**ALTERNATIVES:** Custom Socket.io events.
**TRADE-OFF:** Awareness state is broadcast to all clients, meaning slightly higher baseline traffic, but it simplifies state synchronization immensely because Yjs handles the clock and merging.
**WHY CHOSEN:** Minimal complexity, strong consistency with cursor rendering.

### Socket.io (The Transport Layer)
Socket.io is responsible purely for transport (WebSockets). It acts as a bridge, relaying Yjs `sync`, `update`, and `awareness` byte arrays between clients. It does not parse or manipulate the document content.

## Presence & Identity Lifecycle

### Cursor Colors
Colors are generated deterministically using a DJB2 string-hashing algorithm against the user's `userId`. This ensures:
1. **Stability:** A user always receives the exact same cursor color across tabs and hard refreshes.
2. **Accessibility:** The generated index maps to a curated array of 12 highly readable, WCAG-compliant HSL colors that contrast well against dark mode surfaces.

### Disconnect and Stale Presence
- **Beforeunload:** On tab close, the client synchronously nulls its awareness state and emits a removal packet to gracefully remove the cursor.
- **Network Loss / Socket Disconnect:** If the socket drops, the client immediately purges all *remote* awareness states from its local memory. This prevents the user from seeing "ghost" collaborators while offline.
- **Server-side Timeout:** The Yjs Awareness protocol inherently times out clients after 30 seconds of inactivity.
- **Reconnects:** The React architecture maintains the `Y.Doc` and `Awareness` instances in stable `useRef` hooks. When reconnecting, the client retains its original `clientID`, preventing duplicate cursor ghosts.

## Presentation Mode (Follow Me)

### Viewport Representation
The viewport is synchronized using a **normalized scroll position** (a float between `0.0` and `1.0`).
- **Calculation:** `scrollTop / maxScrollableDistance`
- **Reasoning:** Proportional scrolling ensures that followers with different screen sizes, resolutions, or UI panel configurations remain visually aligned with the presenter's relative location.

### Viewport Sync Data Flow
1. **Presenter:** Attaches a `scroll` event listener to the `.ProseMirror` container. Scroll events are throttled using `requestAnimationFrame`. The calculated normalized scroll is written to `awareness.setLocalStateField('presentation')`.
2. **Follower:** Reads the presentation state from Awareness. Calculates the target `scrollTop` and uses `scrollTo()` to move the viewport.

### Programmatic vs. User Scroll
A critical distinction is made between the programmatic scrolling (driven by the Follow Mode) and manual user scrolling.
- We use a `isProgrammaticScrollRef` flag during the `scrollTo()` operation to suppress manual-scroll detection.
- If a user manually scrolls (via `wheel`, `touchmove`, or keyboard keys like `PageDown`), we detect intent, immediately terminate the Follow Mode (`isFollowing = false`), and restore independent scrolling.

## Multi-Tab Behavior
If a user opens the same document in multiple tabs, they establish two separate Socket.io connections and two separate Yjs instances. Yjs handles this correctly: they appear as two separate cursors (with the same name and color). This is correct behavior, as each tab is a distinct viewport context.
