# Nexus Workspace: Comprehensive Implementation & Handover Roadmap

This document serves as the master architectural and execution plan for the Nexus Workspace project. It is intended for developer handoff, providing deep technical and design context for each phase of the project's evolution into a polished, production-ready application.

---

## Phase 0: Baseline + Architecture Audit (✅ Completed)

**Objective:** Secure the foundation, audit the codebase, and resolve critical P0 vulnerabilities.
**Execution Summary:**
- Analyzed the monorepo structure (Turborepo, React/Vite, Node.js/Express, Prisma/PostgreSQL, Yjs/Socket.io).
- Created baseline documentation for UX and System Architecture.
- **Critical Fix:** Patched a P0 RBAC vulnerability in the folder deletion logic. Folders now strictly enforce permissions and temporarily retain `onDelete: SetNull` for cascading relations until Phase 5 to prevent accidental data loss during active development.

---

## Phase 1: Design System + Visual Language (✅ Completed)

**Objective:** Establish a premium, cohesive "dark-mode first" aesthetic inspired by tools like Linear and Notion, utilizing a strictly fluid and responsive architecture.
**Execution Summary:**
- **Design Tokens:** Overhauled `index.css` to use semantic HSL tokens (e.g., `--background`, `--card`, `--primary`, `--muted`). Eliminated hardcoded HEX values.
- **Responsive Architecture:** Removed brittle `window.innerWidth` React state in favor of CSS Container Queries (`@container`), intrinsic flex/grid bounds, and a custom `useContainerSize` ResizeObserver hook specifically for panel overlay logic.
- **Typography & Layout:** Standardized on `Geist Variable` font. Implemented a fluid grid for the dashboard (`grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr))`) and intrinsic bounds for the editor `w-[min(calc(100%_-_2rem),48rem)]`.
- **UI Primitives:** Cleaned up excessive borders, implemented subtle glassmorphism (`backdrop-blur`), and enforced clean hover/active states across components.

---

## Phase 2: Application Shell + Navigation (Current / Next Steps)

**Objective:** Transform the app shell into a coherent workspace navigation system. Remove redundant UI and introduce robust routing.
**Implementation Details:**
- **Routing Overhaul:** Install `react-router-dom`. Transition the shell from conditional rendering (`activeWorkspaceId` state) to URL-driven routing (`/w/:workspaceId/d/:documentId`).
- **Global Header:** Strip out document-specific controls. It should only contain: Workspace Switcher, Cmd+K search trigger, Notifications, and User Profile.
- **Canonical Sidebar (`WorkspaceSidebar.tsx`):** Unify fragmented menus into a single left sidebar.
  - Consolidate the 4 massive "Create" buttons into a single polished "Create New" dropdown.
  - Core Navigation: Documents, Folders, Trash.
  - Contextual Panels: Add triggers for Chat, Tasks, and AI here (they should open as side-panels, not navigate away).
- **Command Palette:** Install `cmdk` to implement a global `Cmd/Ctrl + K` menu for universal search and quick actions (Create Document, Open Settings, etc.).
- **Breadcrumbs:** Replace the giant "Back" button in the editor with a subtle breadcrumb trail (`Workspace / Folder / Document`).

---

## Phase 3: Workspace Dashboard

**Objective:** Turn the blank workspace landing state into a functional, dense dashboard.
**Implementation Details:**
- **Layout:** Design a masonry or highly structured grid layout.
- **Content:** Implement sections for "Recently Viewed", "Favorites", and "Activity Feed".
- **Density:** Optimize padding and typography to display maximum information without feeling cluttered. Ensure the fluid grid from Phase 1 accurately scales cards down to 320px screens.

---

## Phase 4: Documents / Folders / Files

**Objective:** Unify the visual language of data entities and improve grid reflow.
**Implementation Details:**
- **Component Refactor:** Standardize `DocumentCard`, `FolderCard`, and file attachments to use a shared base primitive (`WorkspaceItemCard`).
- **Interactions:** Implement consistent hover states (e.g., exposing a context menu `...` on hover), drag-and-drop affordances, and active focus states.
- **Metadata:** Ensure timestamps, author avatars, and tags are aligned consistently across all card types.

---

## Phase 5: Trash / Deletion / Recovery

**Objective:** Clarify the soft-delete lifecycle and secure destructive operations.
**Implementation Details:**
- **UX Fix:** Remove all "Create New" actions from the Trash view.
- **Data Integrity:** Finalize the backend logic for soft deletion vs. permanent deletion. Transition the database schema away from `onDelete: SetNull` to proper cascade/soft-delete markers where appropriate.
- **Authorization:** Ensure only `OWNER` or `ADMIN` roles can permanently delete or empty the trash.

---

## Phase 6: Workspace Chat

**Objective:** Integrate real-time chat as a non-destructive contextual tool.
**Implementation Details:**
- **Layout Architecture:** Move `WorkspaceChat.tsx` into a persistent, collapsible right-hand panel using the fluid architecture defined in Phase 1 (transforms to a full-screen overlay on mobile).
- **UI Polish:** Refine message bubbles, timestamp alignment, and input field styling to match the new design system. Remove heavy borders and use subtle contrasting backgrounds for the message feed.

---

## Phase 7: Tasks / Action Items

**Objective:** Bring task management into the contextual panel system.
**Implementation Details:**
- **Panel Integration:** Like Chat, Tasks must open in a right-hand panel without hiding the main document or dashboard.
- **Component Polish:** Redesign task cards to include clear priority indicators, status checkboxes, and avatar assignees. Ensure tasks can be linked directly to specific documents.

---

## Phase 8: Workspace AI (Nexus Copilot)

**Objective:** Evolve AI from a gimmick to a deeply contextual assistant.
**Implementation Details:**
- **Context Awareness:** Ensure the AI panel has access to the `editor.getText()` or the current dashboard context to provide relevant answers.
- **UI:** Implement a polished chat interface with markdown rendering, syntax highlighting for code blocks, and loading skeletons/spinners for AI thinking states.

---

## Phase 9: Team / Permissions

**Objective:** Harden RBAC and polish team management interfaces.
**Implementation Details:**
- **Frontend:** Redesign the `ManageTeamModal` to use Radix primitives. Include clear role badges (`OWNER`, `EDITOR`, `VIEWER`) and a polished invite link generator.
- **Backend:** Conduct a deep audit of all API routes (`/api/workspaces/:id/*`) to ensure middleware correctly blocks unauthorized actions (e.g., preventing a `VIEWER` from inviting members).

---

## Phase 10: Notifications / Activity

**Objective:** Build a reliable, visually clean notification center.
**Implementation Details:**
- **UI:** Redesign the `NotificationBell` popover. Implement unread dots, relative timestamps (e.g., "2m ago"), and distinct icons for different event types (invites, mentions, document updates).
- **UX:** Clicking a notification must correctly route the user to the underlying resource using the Phase 2 routing architecture.

---

## Phase 11: Real-time Collaboration

**Objective:** Polish the Yjs/WebRTC multiplayer experience.
**Implementation Details:**
- **Presence:** Refine the `PresenceAvatars` component to prevent overflow (stack avatars neatly and show a "+N" overflow badge).
- **Presentation Mode:** Polish the "Follow Me" banner. Ensure the editor strictly locks scrolling when a user is following a presenter.
- **Cursors:** Ensure remote cursors have distinct, seeded HSL colors and gracefully handle users disconnecting.

---

## Phase 12: Responsive Design & Cross-Device Audit

**Objective:** Ensure flawless execution across all breakpoints.
**Implementation Details:**
- **Testing Matrix:** Audit the application at 1440px (Desktop), 1024px (Laptop), 768px (Tablet), and 375px (Mobile).
- **Refinement:** Ensure panels convert to modal overlays on mobile. Ensure tables and grids scroll horizontally instead of breaking the layout. Verify that touch targets (buttons, links) are at least 44x44px for iOS/Android standards.

---

## Phase 13: Accessibility (a11y) + Keyboard UX

**Objective:** Achieve WCAG compliance and power-user keyboard navigation.
**Implementation Details:**
- **ARIA:** Audit all icon-only buttons (Sidebar toggles, Close buttons, Formatting toolbar) and ensure they have descriptive `aria-label`s.
- **Focus:** Implement a global `:focus-visible` ring (e.g., `ring-2 ring-primary ring-offset-2 ring-offset-background`) for keyboard navigation.
- **Shortcuts:** Ensure `Cmd/Ctrl+K` (Command Palette), `Escape` (Close modals), and `Tab` (Sequential navigation) work flawlessly.

---

## Phase 14: Performance + Architecture Hardening

**Objective:** Optimize rendering and data fetching for scale.
**Implementation Details:**
- **React Optimization:** Use React Profiler to identify unnecessary re-renders (especially within the `NexusEditor` and `CollaborativeEditor` wrappers). Implement `useMemo` and `useCallback` where strictly necessary.
- **Data Fetching:** Ensure SWR caches are properly invalidated upon mutations (e.g., updating a document name should immediately reflect in the sidebar without a hard refresh).
- **Websockets:** Optimize Socket.io payload sizes. Ensure connections are properly cleaned up in `useEffect` return blocks to prevent memory leaks.

---

## Phase 15: Final End-to-End Audit

**Objective:** The final launch-readiness check.
**Implementation Details:**
- **E2E Testing:** Manually (or via Cypress/Playwright) run through every CRUD operation, role permission, and edge case (e.g., network disconnects during collaborative editing).
- **Documentation:** Generate the final `NEXUS_SYSTEM_DESIGN.md` and `NEXUS_UX_GUIDELINES.md` for long-term project maintenance.
