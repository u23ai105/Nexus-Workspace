# Nexus Panel Architecture

## 1. Core Principles
The Nexus layout architecture is strictly governed by **single responsibility** and **mutual exclusivity**. 
- The **Left Sidebar** is the solitary navigation root.
- The **Right Panel** is the solitary contextual tool slot.

This guarantees that users never experience overlapping sidebars, contradictory tool states, or constrained main content areas.

## 2. Right Panel Exclusivity
We enforce strict mutual exclusivity on all right-hand contextual panels:
- `workspaceChat`
- `globalChat` (Direct Messages)
- `ai`
- `tasks`
- `activity`

**Why only one contextual panel is allowed:**
1. **Focus:** Contextual tools augment the main document view. Two contextual tools competing for attention (e.g., AI chat and Workspace chat) degrade cognitive focus.
2. **Real Estate:** Modern displays cannot comfortably accommodate a left navigation, main content area, and multiple expanded sidebars without horizontal scrolling or extreme text truncation.
3. **Responsive Parity:** By strictly modeling state as `activePanel: ActivePanel | null`, the transition from Desktop (side-by-side) to Mobile (full-screen overlay) requires zero state changes.

## 3. Panel State Model
The layout state avoids scattered boolean flags (e.g., `isChatOpen`, `isAIOpen`). The singular source of truth is:
```typescript
type ActivePanel = "workspaceChat" | "globalChat" | "ai" | "tasks" | "activity" | null;
```
If a user opens AI while Tasks are open, Tasks closes instantly.

## 4. Left Sidebar Ownership
`WorkspaceLayout.tsx` owns the `isMainSidebarOpen` state. 
- `WorkspaceSidebar` consumes this state to transition its width and visibility.
- `GlobalHeader` consumes the toggle callback to trigger visibility.
This prevents duplicated state in `DocumentDashboard` or `App`.

## 5. Right Panel Ownership
`WorkspaceLayout.tsx` owns the `activePanel` state. It maps exactly one active context into the shared structural `<ContextPanel />` shell.

## 6. Activity as a Contextual Panel
Previously, the `ActivityFeed` was a statically rendered column inside `DocumentDashboard`. This violated the exclusivity principle, taking up permanent screen real estate and forcing contextual tools to compete for width. 
Activity is now a standard contextual panel (`ActivitySidebar`), which frees up significant main dashboard real estate for documents and files.

## 7. Trade-offs
- **Con:** Users cannot view the Activity Feed simultaneously while chatting with AI.
- **Pro:** The Document Dashboard receives 100% of available viewport width by default, creating a much cleaner, unconstrained canvas experience.

## 8. Data Ownership & Accessibility
Data fetching for panels relies on globally cached `SWR` hooks. When a panel mounts, it reuses the cache, avoiding duplicate network waterfalls. All panel toggles implement `aria-label` and `title` tooltips for robust keyboard/screen-reader navigation.
