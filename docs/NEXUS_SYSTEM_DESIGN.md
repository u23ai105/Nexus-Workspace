# Nexus Workspace: System Design Architecture

## 1. System Overview
Nexus is a real-time collaborative workspace supporting rich text documents, whiteboards, task management, and team chat. 

- **Frontend:** React, Vite, TailwindCSS, SWR
- **Backend:** Node.js, Express, Socket.io
- **Database:** PostgreSQL (via Prisma ORM)
- **Collaboration Engine:** Yjs, Tiptap, Tldraw

## 2. Repository/Monorepo Structure
The project uses a pnpm monorepo structure:
- `apps/web`: The Vite React frontend.
- `apps/server`: The Express backend and WebSocket server.
- `packages/database`: The shared Prisma schema and generated client.
- `packages/eslint-config`: Shared linting rules.

## 3. Frontend Architecture
The frontend is a Single Page Application (SPA) utilizing React Router for declarative routing. We use Tailwind CSS for utility-first styling alongside Radix UI for accessible, headless primitives (integrated via shadcn/ui). 

**Decision:** Vite instead of Next.js.
**Reason:** Nexus relies heavily on stateful WebSockets, WebRTC (for potential future A/V), and heavy client-side canvas rendering (Tldraw). A robust SPA avoids the complexity of Server-Side Rendering (SSR) hydration mismatches with Yjs document states.

## 4. Backend Architecture
The backend is a Node.js/Express monolith. It exposes a RESTful API for standard CRUD operations and a Socket.io server for real-time collaboration.

**Decision:** Express Monolith instead of Microservices.
**Reason:** Given the scope, a monolith avoids the operational overhead of distributed transactions. The real-time Socket.io server tightly couples with the database for saving document snapshots, making co-location beneficial.

## 5. Realtime Architecture (Yjs & Socket.io)
Nexus utilizes `y-websocket` (customized over Socket.io) for conflict-free replicated data types (CRDTs). 

- **Yjs Architecture:** Every document (text or canvas) is a `Y.Doc`. 
- **Socket.io Responsibilities:** The server acts as a dumb relay for Yjs binary updates (`update` events) while actively managing `awareness` (cursors, presence) states to prevent ghost users.
- **Cache Invalidation / Snapshots:** The server periodically serializes the `Y.Doc` to a binary `Uint8Array` and saves it to PostgreSQL to ensure persistence if all clients disconnect.

## 6. SWR & Server-State Architecture
We use SWR for data fetching, caching, and revalidation.
- **Cache Strategy:** Fetches are deduped. Mutations (like renaming a document) trigger localized `mutate` calls to optimisticly update the UI without needing full page reloads.
- **Over-fetching Prevention:** Critical endpoints (like dashboard `getDocuments`) strictly project only metadata, explicitly excluding heavy payloads like `textContent`.

## 7. Authentication & Authorization (RBAC)
- **Auth:** JWT-based authentication passed via Bearer tokens.
- **RBAC:** Access is scoped per workspace. A user can be an `OWNER`, `ADMIN`, `EDITOR`, or `VIEWER`. All backend mutations explicitly verify the user's role against the `workspaceId` before proceeding.

## 8. Database Architecture
PostgreSQL is the source of truth, managed via Prisma.
Key abstractions:
- `User` 1:M `WorkspaceMember`
- `Workspace` 1:M `Document`, `Folder`, `ActionItem`
- `Document` contains `yjsState` (binary snapshot) and `textContent` (searchable plaintext).

## 9. Failure/Recovery Behavior
- **Network Interruptions:** Socket.io automatically attempts reconnection. Yjs handles syncing any missed updates upon reconnection seamlessly.
- **Error Boundaries:** React Error Boundaries wrap critical modules (Editor, Canvas) so a crash in one does not crash the entire shell.

## 10. Known Limitations & Technical Debt
- **Horizontal Scaling:** The current Socket.io implementation relies on in-memory Yjs documents on the Node server. To scale to multiple backend instances, a Redis adapter and a Yjs awareness broadcast channel (like Redis PubSub) must be implemented.
- **Tldraw Bundle Size:** While now lazy-loaded, the Tldraw dependency is inherently massive.
