# Phase 2: Application Shell + Navigation Implementation Plan

This document outlines the architecture and implementation steps to transform the Nexus shell into a unified, polished product experience with a strict visual hierarchy, contextual navigation, and fluid routing.

## 1. Routing Architecture (App Shell)
**Tooling:** `react-router-dom`

We will transition from purely state-based navigation (`activeWorkspaceId`, `selectedDoc`) to robust URL routing. This ensures the browser's back/forward history functions naturally.

**Routes:**
- `/` - Home (Workspace selection)
- `/w/:workspaceId` - Workspace Dashboard
- `/w/:workspaceId/d/:documentId` - Document Editor
- `/w/:workspaceId/trash` - Trash View

The Global Header will be cleaned up to only contain strictly global items: Workspace Switcher, Cmd+K trigger, Notifications, and Profile Menu.

## 2. Workspace Navigation (Sidebar)
**File:** `WorkspaceSidebar.tsx` (New)

We will build ONE canonical workspace sidebar that replaces the fragmented sidebar logic.
**Hierarchy:**
1. **Workspace Header:** Contextual workspace info.
2. **Primary Action:** A single polished "Create New" DropdownMenu (combining Text, Canvas, Folder, Upload).
3. **Core Navigation:** Documents, Folders, Trash (with distinct active, hover, focus states).
4. **Contextual Tools:** Triggers for Chat, Tasks, and AI panels. These will open as contextual side-panels (using the Phase 1 panel architecture) rather than navigating away from the workspace.
5. **Team/Settings & Account:** Manage Team.

The sidebar will maintain the fluid container-aware behavior (static on large screens, hidden/drawer on mobile).

## 3. Command Palette
**Tooling:** `cmdk`

We will introduce a global `Cmd+K` interface that provides a unified entry point for search and actions.
- **Navigation:** Open Dashboard, Open Trash
- **Actions:** Create Document, Create Canvas, Create Folder, Invite Member
- **Tools:** Open Chat, Open AI, Open Tasks
- **Search:** Search across documents and folders

## 4. Editor Navigation (Breadcrumbs)
The editor's top bar will be refined. The large "Back" or "Dashboard" button will be replaced with a compact, professional breadcrumb trail:
`[Workspace Name] / [Folder] / [Document Title]`

Clicking the Workspace or Folder names will utilize the router to navigate back seamlessly.

## 5. Removed Redundant UI
During this phase, we will explicitly audit and remove:
- Duplicate page-specific search bars (enforcing Cmd+K as the universal search).
- Repeated "Create" buttons outside the sidebar.
- Floating tool rails that conflict with the canonical sidebar.

## 6. Open Questions / Clarifications
- **GlobalChat:** The current application has a `GlobalChat` component. Per the Phase 2 requirements, Chat is a *contextual workspace tool*. Therefore, it will be removed from the Global Header and integrated into the Workspace Sidebar as a workspace-specific panel.
