# Phase 14: Performance Baseline

## 1. Baseline Measurements

### Bundle Contribution (Initial Baseline)
- **`dist/assets/index-[hash].js`**: ~1.71 MB (546 KB gzipped) - Core React, Layout, SWR, Routing.
- **`dist/assets/CollaborativeEditor-[hash].js`**: ~3.66 MB (1.10 MB gzipped) - Heavy dependencies: Tldraw, Tiptap, Yjs, Socket.io, Lucide Icons (possibly entire tree if not tree-shaken).

### Component Render Behavior (Static Analysis & Expected Bottlenecks)
- **Dashboard Load**: Network fetches `workspaces`, `folders`, `documents`, `tasks`, `notifications`. 
  - *Bottleneck*: SWR triggers independent re-renders when data lands. `WorkspaceItemCard` instances may unnecessarily re-render on parent context changes.
- **Document Switch (Rapid)**: 
  - *Bottleneck*: `CollaborativeEditor.tsx` runs heavy Y.Doc and Awareness creation. If the previous document isn't fully cleaned up, duplicate Socket listeners could fire, and old `ydoc.on('update')` events might run against detached editors, causing memory leaks.
- **Online Presence (Cursor Movement)**:
  - *Bottleneck*: `useAwarenessUsers` inside `NexusEditor` causes the entire `NexusEditor` tree to re-render whenever *any* cursor moves, which is extremely expensive given the size of Tiptap.

### Network Profile
- SWR currently does not deduplicate aggressive polling if keys mismatch slightly.
- SWR `mutate` calls often refresh all documents without optimistic UI where an optimistic update would suffice (e.g., renaming).

## 2. Identified Action Items
- Audit `WorkspaceItemCard` for `React.memo`.
- Lift `useAwarenessUsers` out of the main `NexusEditor` tree or narrow its subscription.
- Ensure `CollaborativeEditor` teardown strictly unbinds `socket.on('update')` and `ydoc.on('update')`.
- Code split Tldraw vs Tiptap, as they are currently bundled together in `CollaborativeEditor.js`.
