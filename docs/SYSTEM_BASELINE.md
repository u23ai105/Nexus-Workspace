# System Baseline - Nexus Workspace

## B. Current Architecture
- **Monorepo:** Managed by Turborepo with `apps/web` (Frontend), `apps/server` (Backend), and packages (`database`, `shared`).
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, SWR (data fetching).
- **Backend:** Node.js, Express, Socket.io.
- **Database:** PostgreSQL accessed via Prisma ORM.
- **Real-time Engine:** Yjs for CRDT-based collaborative editing, Socket.io for signaling and presence. Tiptap serves as the rich-text editor, and React Flow for the canvas.

## I. Security / Authorization Concerns
- **RBAC Enforcment:** Need to strictly verify that backend API routes enforce `WorkspaceRole` (OWNER, ADMIN, EDITOR, VIEWER) for mutations (creating docs, archiving, deleting, managing team).
- **Client-Side Assumptions:** The UI hides actions for VIEWERs, but this must be rigorously backed by server-side checks to prevent direct API abuse.
- **Data Isolation:** Ensure queries always scope by `workspaceId` and user permissions.

## J. State Management Problems
- Combination of `useSWR` for server state and `useState` for local UI state. Need to ensure caching and optimistic updates are handled cleanly without race conditions.
- Real-time state (Yjs) needs to seamlessly interoperate with static server state (Prisma DB).

## K. Data Consistency Problems
- **Soft Deletion (Trash):** Currently uses `isArchived` flag. Need to ensure recursive archiving (if a folder is trashed, do its children become inaccessible?).
- **Permanent Deletion:** Ensure cascading deletes are set up correctly in Prisma (e.g., deleting a folder deletes its files/docs, or sets `folderId` to null depending on intended behavior).

## L. Architecture Risks
- **Websocket Lifecycle:** Ensuring Socket.io connections authenticate properly, handle reconnects, and don't leak memory on the server.
- **Saving Mechanism:** Debounced saving of Yjs state to PostgreSQL. If the server crashes during a save, data might be lost.

## M. Technical Debt
- Some TS errors were recently fixed, but there might be leftover `<any>` types or missing interface definitions.
- The `FolderSidebar` and `DocumentDashboard` components are large and might need splitting.

## 8. Single Source of Truth Definitions
- **Workspace/Document Metadata:** PostgreSQL (Prisma).
- **Document Content (Rich Text):** Yjs Document (Binary State), periodically flushed to Postgres `yjsState`.
- **Permissions:** Postgres `WorkspaceMember` table.
- **Presence:** Socket.io ephemeral state.
- **Tasks/Chat:** Postgres tables (`ActionItem`, `Message`), synced via API/Sockets.
