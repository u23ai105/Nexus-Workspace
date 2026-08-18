# Phase 11 Human Test Plan (Real-time Collaboration)

Execute this test plan manually to verify that real-time presence and presentation modes work seamlessly.

## Setup
- Open two different browser windows/profiles (User A and User B).
- Both users log in to Nexus and navigate to the same collaborative document in a Workspace.

## Test Cases

### RT-001: Two users connected
1. Ensure both users are on the document page.
2. **Expectation:** Both users see each other's avatars in the top right, and see each other's cursors when they click inside the editor.

### RT-002: Stable cursor colors
1. Note the cursor/avatar color of User A in User B's screen.
2. **Expectation:** The color should belong to the distinct Nexus palette (not a randomly generated dull color) and be readable against the editor background.

### RT-003: Hard refresh preserves color
1. Hard refresh User A's browser.
2. **Expectation:** When User A reconnects, their cursor and avatar should appear in the exact same color they had previously.

### RT-004: Avatar stack
1. Ensure the avatars in the top right overlap each other cleanly using a stacked design (leftmost avatar on top).
2. Hover over the avatars.
3. **Expectation:** The tooltip displays the user's name.

### RT-005: +N overflow
1. If possible, simulate or connect with 5 or more unique users.
2. **Expectation:** The header displays a maximum of 4 colored avatars, followed by a gray `+N` badge indicating the remaining overflow count.

### RT-006: Presenter starts Follow Me
1. User A clicks the **Present** button in the top right.
2. **Expectation:** User A's banner shows "LIVE - Presenting to 1 person". User B automatically sees the banner "LIVE - User A is presenting".

### RT-007: Follower tracks presenter
1. User A scrolls up and down the document (ensure the document is long enough to have a scrollbar).
2. **Expectation:** User B's viewport automatically and smoothly scrolls to match User A's proportional position.

### RT-008: Follower on different screen size still follows correctly
1. Resize User B's window to be much shorter than User A's window.
2. User A scrolls to the absolute bottom of the document.
3. **Expectation:** User B also hits the absolute bottom of the document (proportional sync handles the viewport difference).

### RT-009: Follower manually interacts with page
1. While User A is presenting, User B manually scrolls using the mouse wheel, trackpad, or arrow keys.
2. **Expectation:** User B instantly stops following User A's viewport. User B can now scroll independently.

### RT-010: Stop Following
1. User A is presenting. User B clicks the **Stop Following** button in the banner.
2. **Expectation:** User B stops following User A. The Follow mode is cleanly terminated for User B.

### RT-011: Presenter continues scrolling
1. After User B has stopped following, User A continues to scroll.
2. **Expectation:** User B's viewport remains unaffected.

### RT-012: User disconnects
1. User B closes their tab completely.
2. **Expectation:** User B's cursor immediately disappears from User A's screen.

### RT-013: Network interruption
1. Simulate a network drop for User A (e.g., devtools Offline mode).
2. **Expectation:** User A sees User B disappear (local remote state cleared). User B eventually sees User A disappear (30s awareness timeout).

### RT-014: Reconnect
1. Restore User A's network.
2. **Expectation:** User A reconnects. Cursors and avatars reappear on both screens instantly.

### RT-015: No duplicate awareness entry
1. Verify the state in RT-014.
2. **Expectation:** User A does not appear twice in User B's avatar stack. Only one cursor exists.

### RT-016: Mobile follow mode
1. Open User B on a mobile device or responsive mobile emulator.
2. User A presents and scrolls.
3. **Expectation:** User B's mobile viewport scrolls correctly without trapping or breaking native touch gestures.

### RT-017: Keyboard accessibility
1. **Expectation:** A user can Tab to the "Present" button, press Enter to start presenting, Tab to the "Stop Presenting" button, and trigger it with Enter.

### RT-018: Presentation control accessibility
1. Inspect the "Stop Following" and "Present" buttons using screen reader/accessibility tools.
2. **Expectation:** The buttons have valid, accessible ARIA labels.
