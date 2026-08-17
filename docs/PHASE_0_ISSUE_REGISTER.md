# Phase 0 Issue Register

This register documents all issues discovered during the Phase 0 baseline audit. It is the single source of truth for tracking technical debt, architectural flaws, and UX problems.

**Severity Levels:**
- P0: Security / data integrity / broken core functionality
- P1: Major UX or architectural issue
- P2: Important improvement
- P3: Polish

---

## 1. Folder API Missing RBAC Authorization
- **STATUS:** RESOLVED
- **Severity:** P0
- **Location:** `apps/server/src/routes/folder.routes.ts`
- **Root Cause:** The folder routes (POST, PATCH, DELETE) do not check `WorkspaceRole`. Only `authenticateJWT` is applied at the parent router level.
- **User Impact:** Any authenticated user could potentially delete or modify any folder by guessing its ID, or a VIEWER could modify folders in their workspace.
- **Architectural Impact:** High security vulnerability.
- **Recommended Solution:** Implement a role verification middleware or utility (similar to `getUserRole` in `document.controller.ts`) for all folder mutations.
- **FIX:** Created `apps/server/src/utils/rbac.ts` and updated `folder.routes.ts` to enforce RBAC (VIEWER cannot mutate, only OWNER/ADMIN can permanently delete).
- **TESTS:** Added `apps/server/src/tests/folder.test.ts` covering unauthorized IDs, cross-workspace IDs, VIEWER, EDITOR, ADMIN, and OWNER.
- **FILES CHANGED:** `apps/server/src/routes/folder.routes.ts`, `apps/server/src/utils/rbac.ts`, `apps/server/src/controllers/document.controller.ts`.

## 2. Folder Deletion Does Not Cascade
- **Severity:** P1
- **Location:** `packages/database/prisma/schema.prisma` (Document/File `folderId` relation)
- **Root Cause:** The Prisma schema uses `onDelete: SetNull` for the `folderId` relation on Documents and Files.
- **User Impact:** Deleting a folder dumps all its contents back into the root "All Documents" view instead of archiving/deleting them.
- **Architectural Impact:** Modifies how soft-delete / archiving needs to be handled recursively.
- **Recommended Solution:** Either change to `onDelete: Cascade` (if hard deleting) or handle recursive `isArchived: true` updates in the folder delete controller.
- **Phase:** Phase 5 (Trash / Deletion / Recovery).

## 3. Creation Actions Available in Trash View
- **Severity:** P1
- **Location:** `apps/web/src/components/dashboard/DocumentDashboard.tsx`
- **Root Cause:** The sidebar "New Doc" and "New Folder" buttons are not hidden or disabled when `activeTab === 'trash'`.
- **User Impact:** Users can create documents directly into the trash context, leading to confusing states.
- **Architectural Impact:** UI logic missing context boundaries.
- **Recommended Solution:** Hide creation actions when the trash tab is active.
- **Phase:** Phase 5 (Trash / Deletion / Recovery).

## 4. Conditional Rendering Instead of Router
- **Severity:** P2
- **Location:** `apps/web/src/App.tsx`
- **Root Cause:** The application relies on complex nested ternary operators and `useState` for routing (e.g., swapping between `Home`, `DocumentDashboard`, `CollaborativeEditor`).
- **User Impact:** No deep linking. Users cannot copy a URL to a specific document or workspace. Back/Forward browser buttons do not work.
- **Architectural Impact:** As the app grows, `App.tsx` becomes unmaintainable.
- **Recommended Solution:** Introduce `react-router-dom` or similar routing library (while preserving the architecture boundary rules of Phase 1).
- **Phase:** Phase 2 (Application Shell + Navigation) or Phase 14 (Performance/Architecture).

## 5. Inconsistent Card Design Language
- **Severity:** P3
- **Location:** `DocumentCard.tsx`, `FolderCard.tsx`
- **Root Cause:** Ad-hoc Tailwind classes used without a unified design system.
- **User Impact:** The UI feels disjointed and unprofessional.
- **Architectural Impact:** Harder to maintain UI consistency.
- **Recommended Solution:** Create a reusable `<Card>` primitive in the Design System.
- **Phase:** Phase 1 (Design System) & Phase 4 (Documents / Folders).

## 6. Bright and Noisy Primary Actions
- **Severity:** P3
- **Location:** `DocumentDashboard.tsx` Sidebar
- **Root Cause:** Use of `bg-orange-500`, `bg-purple-500`, `bg-amber-500` for multiple stacked sidebar buttons.
- **User Impact:** Violates the "calm, dense, professional" aesthetic. Overwhelms the visual hierarchy.
- **Architectural Impact:** None.
- **Recommended Solution:** Replace with neutral buttons and contextual icons based on the new Design System.
- **Phase:** Phase 1 (Design System) & Phase 2 (Application Shell).
