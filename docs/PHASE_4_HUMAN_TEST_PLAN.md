# Phase 4 Human Test Plan

The following manual test plan verifies that Phase 4 requirements for visual consistency, drag-and-drop affordances, backend authorization, and error handling are met. 

### Visual & Interaction Consistency
- [ ] **VIS-001**: Document / Folder / File visual consistency (cards use the same dimensions, hover states, and metadata hierarchy).
- [ ] **VIS-002**: Hover / focus states (hovering exposes the `...` menu, focusing highlights the card clearly).
- [ ] **VIS-003**: Context menus (actions are consistent and semantic; e.g., files have 'Download', documents have 'Open', all have 'Move').

### Movement via Drag-and-Drop
- [ ] **MOVE-001**: Drag Document → Folder (Document successfully moves).
- [ ] **MOVE-002**: Drag File → Folder (File successfully moves).
- [ ] **MOVE-003**: Move Folder → Folder (Folder successfully moves).
- [ ] **MOVE-004**: Invalid self/descendant folder move (Attempting to drag a folder into itself or its child is rejected).
- [ ] **MOVE-005**: Move to current folder (Dragging an item into the folder it's already in is rejected).

### Contextual Movement (Touch & Keyboard)
- [ ] **MOVE-006**: Move using "Move to Folder" dialog (Dialog opens, valid folders are selectable, move succeeds).
- [ ] **MOBILE-001**: Move content on mobile using Move to Folder (Verify the context menu action is easily accessible on mobile).
- [ ] **A11Y-001**: Move content using keyboard without drag-and-drop (Tab to item, open menu, select 'Move', complete move via dialog using keyboard).

### File Interactions
- [ ] **FILE-001**: Open File (Clicking the file opens it in a new tab/downloads it).
- [ ] **FILE-002**: Rename File (Context menu rename properly updates the filename in the backend).

### Security & Error Handling
- [ ] **SEC-001**: Viewer cannot move content (A user with VIEWER role does not see drag-and-drop or 'Move' options, and API rejects requests).
- [ ] **SEC-002**: Cross-workspace move rejected (API prevents moving items to a folder in a different workspace).
- [ ] **ERROR-001**: Move failure rolls back UI correctly (Simulate network error, ensure UI reverts optimistically dragged item).
- [ ] **REALTIME-001**: Verify no duplicate/stale item appears after movement where applicable (Moving an item doesn't leave a ghost copy while SWR revalidates).
