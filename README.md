<div align="center">
  <h1>🌌 Nexus Workspace</h1>
  <p><strong>Real-Time Collaborative Productivity Platform — Rich-Text CRDT Docs, Infinite Canvases, Context-Aware AI & Team Communication</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js & Express" />
    <img src="https://img.shields.io/badge/CRDT-Yjs-FF6B6B?style=flat-square" alt="Yjs CRDT" />
    <img src="https://img.shields.io/badge/Realtime-Socket.IO-010101?style=flat-square&logo=socketdotio&logoColor=white" alt="Socket.IO" />
    <img src="https://img.shields.io/badge/Database-PostgreSQL%20%2B%20Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white" alt="PostgreSQL & Prisma" />
    <img src="https://img.shields.io/badge/AI-Google%20Gemini-8E75B2?style=flat-square&logo=googlegemini&logoColor=white" alt="Gemini AI" />
    <img src="https://img.shields.io/badge/Monorepo-Turborepo%20%2B%20pnpm-EF4444?style=flat-square&logo=turborepo&logoColor=white" alt="Turborepo" />
  </p>
</div>

---

## 📖 Overview

**Nexus Workspace** unifies real-time document collaboration, infinite spatial whiteboards, task tracking, workspace chat, direct messaging, file storage, and context-aware AI into a single multi-tenant workspace.

Engineered as a **Turborepo + pnpm** monorepo, Nexus combines **Yjs CRDTs** over **Socket.IO** for conflict-free multiplayer editing, **Tldraw** for collaborative canvases, **PostgreSQL + Prisma** for durable state and RBAC governance, **Supabase Storage** for workspace media, and **Google Gemini** for inline and workspace-scoped AI assistance.

---

## ✨ Key Capabilities

### ⚡ Real-Time Collaborative Editor (`TEXT`)
- **Conflict-Free Editing (CRDTs):** Powered by **Tiptap v3** + **Yjs** (`y-protocols/sync` & `y-protocols/awareness`) over authenticated WebSockets.
- **Live Presence & Authorship:** Real-time remote carets with deterministic, WCAG-contrasted user colors (DJB2 hash), persistent per-author text attribution (`AuthorHighlight`), and `beforeunload` cleanup to prevent ghost cursors.
- **Durable Snapshotting & Memory Safety:** Debounced 3-second auto-saves and final room-teardown flushes persist binary `Y.Doc` updates (`yjsState`) and extracted plaintext (`textContent`) to PostgreSQL; empty document rooms automatically destroy in-memory `Y.Doc` and `Awareness` instances.
- **Interactive Embedded Blocks:** Insert live **Kanban Boards**, **Live Polls**, **YouTube videos**, **X/Twitter embeds**, syntax-highlighted code blocks (`lowlight`), and drag-and-drop / clipboard images directly inside documents.
- **Export & Zoom:** One-click **PDF** (`html2pdf.js`) and **Markdown** (`turndown`) export, plus `Ctrl/Cmd + Scroll` document zoom.

### 🎨 Infinite Whiteboard Canvas (`CANVAS`)
- **Multiplayer Spatial Canvas:** Built with **Tldraw**, synchronized across collaborators in real time via Socket.IO `canvas-update` diffs with 2-second debounced JSON persistence and strict read-only mode for `VIEWER`s.
- **Route-Level Code Splitting:** `TldrawCanvas` and `NexusEditor` are lazy-loaded via `React.lazy()` and `<Suspense>` to eliminate monolithic initial bundle overhead.

### 🧠 Nexus Copilot (Context-Aware Gemini AI)
- **Inline Floating Selection Menu (`/api/ai/prompt`):** Highlight any passage to **Summarize**, **Extract Tasks** (Markdown checklist), **Rewrite**, **Explain**, or **Ask**, then insert below or replace selection in one click.
- **Workspace-Scoped AI Chat (`/api/ai/workspace-chat`):** Grounded in workspace documents, tasks, active document state, and live unsaved editor text via `ActiveDocumentContext`. Prioritizes `selectedText` (5k char cap) over live document content (50k char cap) and enforces server-side workspace/document authorization on every request.

### 📽️ "Follow Me" Presentation Mode
- **Normalized Viewport Sync:** Broadcasts proportional scroll position (`0.0`–`1.0`) via Yjs Awareness throttled with `requestAnimationFrame`, keeping followers aligned across different screen sizes.
- **Smart Break-Out & Governance:** Manual follower scroll (`wheel`, `touchmove`, navigation keys) exits follow mode cleanly. Workspace-level signaling supports `OWNER > ADMIN > EDITOR` scroll takeover priority and `OWNER`/`ADMIN` audio mute controls.

### 🛡️ Audited RBAC & Cryptographic Invite Links
- **4-Tier Workspace Governance:** `OWNER`, `ADMIN`, `EDITOR`, and `VIEWER` enforced server-side via `getUserRole()` across every REST mutation and Socket.IO event, with strict cross-workspace ID scoping.
- **Hardened Shareable Links:** 32-byte cryptographically random tokens (`crypto.randomBytes(32)`) stored exclusively as **SHA-256 hashes** (`WorkspaceInvite`). Links expire in 7 days, restrict default roles to `VIEWER` or `EDITOR`, support unauthenticated name-only previews, and auto-revoke previous active links upon regeneration.

### 📁 Workspace Drive, Tasks, Chat & Inbox-Zero Notifications
- **Hierarchical Folders & Trash Lifecycle:** Nested folders with cycle detection, favorites, smart `Untitled Document N` naming, Supabase Storage uploads (up to 10 MB), soft-delete (`isArchived`), safe root-restoration, and a daily midnight `node-cron` purge for trash older than 30 days.
- **Action Items & Activity Feed:** Workspace tasks (`TODO` / `IN_PROGRESS` / `DONE`, priorities, due dates, assignees, document links) and a 7-day rolling `WorkspaceActivity` timeline.
- **GitHub-Style Notification Center:** Strict `UNREAD` / `READ` / `DONE` (`archivedAt`) states, unified feed combining pending invites + personal notifications, `eventId` idempotency deduplication, cursor pagination, and real-time Socket.IO delivery (`user:{userId}`).
- **Communication & Navigation:** Persistent workspace chat rooms, global 1-on-1 Direct Messages with unread badges and user search, and a `Cmd+K` Command Palette.

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    subgraph Client ["Frontend (apps/web — React 19 + Vite)"]
        UI["Workspace Shell, Dashboard & Cmd+K"]
        Editor["Tiptap v3 + Yjs + Awareness"]
        Canvas["Tldraw Infinite Canvas (Lazy)"]
        ChatUI["Workspace Chat, DMs & Notifications"]
        CopilotUI["Nexus Copilot + ActiveDocumentContext"]
    end

    subgraph Server ["Backend (apps/server — Express + Socket.IO)"]
        REST["REST API (JWT + Zod + RBAC)"]
        WS["Socket.IO Gateway (JWT Auth)"]
        YRoom["In-Memory Y.Doc & Awareness Store"]
        NotifSvc["NotificationService (Idempotent)"]
        Cron["node-cron (30-Day Trash Purge)"]
    end

    subgraph Data ["Data & External Services"]
        PG[("PostgreSQL (Prisma ORM)\nMetadata, yjsState, RBAC, Tasks, Chat")]
        Supa["Supabase Storage\nWorkspace Media & Uploads"]
        Gemini["Google Gemini API\n(gemini-3.5-flash)"]
    end

    UI & CopilotUI -->|HTTPS + Bearer JWT / SWR| REST
    Editor & Canvas & ChatUI <-->|WebSocket + Bearer JWT| WS
    WS <--> YRoom
    YRoom -->|3s Debounced Snapshot & Flush| PG
    REST --> PG
    REST --> NotifSvc
    NotifSvc -->|notification:new| WS
    REST -->|Multer Memory Buffer| Supa
    REST -->|Bounded Context Prompt| Gemini
    Cron --> PG
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Monorepo & Tooling** | Turborepo, `pnpm` Workspaces (`pnpm@9.5.0`), TypeScript, Prettier, Oxlint, ESLint |
| **Frontend (`apps/web`)** | React 19, Vite 8, React Router v7, SWR, Tailwind CSS, Radix UI / shadcn (`base-nova`), Lucide Icons, `cmdk` |
| **Editor & Canvas** | Tiptap v3, Yjs, `y-protocols`, `lowlight` / `highlight.js`, Tldraw v5, `@xyflow/react`, `react-tweet`, `html2pdf.js`, `turndown` |
| **Backend (`apps/server`)** | Node.js, Express 4, Socket.IO 4.8, `tsx`, Zod 4, Helmet, CORS, `bcrypt`, `jsonwebtoken`, `multer`, `node-cron` |
| **Database & Storage** | PostgreSQL, Prisma ORM (`@nexus/database`), Supabase Storage (`@supabase/supabase-js`) |
| **AI & Testing** | Google Generative AI SDK (`@google/generative-ai`), Vitest, Supertest |
| **Deployment** | Render Blueprint (`render.yaml`) — Node Web Service + Static Site |

---

## 📁 Monorepo Structure

```text
nexus-workspace/
├── apps/
│   ├── server/                     # Express REST API & Socket.IO real-time engine
│   │   └── src/
│   │       ├── index.ts            # Server entry, route mounting, graceful shutdown & cron
│   │       ├── socket.ts           # Yjs CRDT sync, Awareness, Presentation, Chat & DM sockets
│   │       ├── controllers/        # auth, workspace, member, invite, document, file, ai, dm, message, notification, user
│   │       ├── routes/             # Express routers including folders & tasks
│   │       ├── middlewares/        # JWT authentication middleware
│   │       ├── services/           # Idempotent NotificationService
│   │       └── utils/              # Centralized RBAC helper (getUserRole)
│   └── web/                        # React 19 + Vite SPA
│       └── src/
│           ├── App.tsx             # Auth shell, SWR workspace loader & React Router setup
│           ├── components/
│           │   ├── editor/         # CollaborativeEditor, NexusEditor, TldrawCanvas, AIFloatingMenu, KanbanBlock, PollBlock, TwitterBlock, ExportMenu, PresentationBanner
│           │   ├── chat/           # GlobalChat (1-on-1 DMs & user search)
│           │   └── home/           # Workspace switcher & creation view
│           ├── contexts/           # ActiveDocumentContext (live AI context bridge)
│           ├── hooks/              # useCollaboration, useContainerSize
│           └── utils/              # Deterministic cursor colors (DJB2)
├── packages/
│   ├── database/                   # Shared Prisma schema (13 models), client & backfill scripts
│   ├── shared/                     # Shared utilities/types across workspaces
│   └── config-typescript/          # Shared base tsconfig
├── docs/                           # System Design, ADRs, RBAC Audit & Release Report
├── render.yaml                     # Render production blueprint
├── turbo.json                      # Turborepo task pipeline
└── pnpm-workspace.yaml
```

---

## 🛡️ Role-Based Access Control (RBAC) Matrix

| Action / Resource | `OWNER` | `ADMIN` | `EDITOR` | `VIEWER` |
| :--- | :---: | :---: | :---: | :---: |
| Rename Workspace / Empty Trash | ✅ | ✅ | ❌ | ❌ |
| Delete Workspace | ✅ | ❌ | ❌ | ❌ |
| Invite Members / Generate Invite Links | ✅ | ✅ | ❌ | ❌ |
| Remove Members / Change Roles | ✅ | ✅* | ❌ | ❌ |
| Create, Edit, Rename, Archive Docs & Folders | ✅ | ✅ | ✅ | ❌ |
| Permanently Delete Docs, Folders & Files | ✅ | ✅ | ❌ | ❌ |
| Upload & Rename Files | ✅ | ✅ | ✅ | ❌ |
| Create, Assign, Update & Delete Tasks | ✅ | ✅ | ✅ | ❌ |
| Start Presentation | ✅ | ✅ | ✅ | ❌ |
| Mute Users in Presentation | ✅ | ✅ | ❌ | ❌ |
| Workspace Chat & Follow Presentation | ✅ | ✅ | ✅ | ✅ |

*\*Admins cannot modify, promote to, or remove `OWNER` or other `ADMIN` accounts. Shareable invite links can only grant `VIEWER` or `EDITOR` roles.*

---

## 🔌 API & Real-Time Events Reference

### REST API Endpoints
| Group | Endpoints |
| :--- | :--- |
| **Auth** | `POST /auth/register`, `POST /auth/login` |
| **Workspaces** | `GET /api/workspaces`, `POST /api/workspaces`, `PATCH /api/workspaces/:id`, `DELETE /api/workspaces/:id`, `GET /api/workspaces/:workspaceId/activity`, `DELETE /api/workspaces/:workspaceId/trash` |
| **Members & Invites** | `GET /api/workspaces/:workspaceId/members`, `POST .../members/invite`, `PATCH/DELETE .../members/:memberId`, `GET /api/invitations`, `PATCH /api/invitations/:workspaceId/{accept\|decline}`, `POST /api/workspaces/:workspaceId/invites`, `GET /api/workspaces/invites/preview/:token`, `POST /api/workspaces/invites/:token/join` |
| **Documents** | `GET /api/documents`, `GET /api/documents/:id`, `POST /api/documents`, `PATCH /api/documents/:id`, `DELETE /api/documents/:id`, `POST/DELETE /api/documents/:id/favorite` |
| **Folders** | `GET/POST /api/workspaces/:workspaceId/folders`, `PATCH/DELETE .../:folderId`, `PATCH .../:folderId/move` |
| **Files** | `GET /api/files`, `POST /api/files/upload`, `PATCH /api/files/:id`, `DELETE /api/files/:id` |
| **Tasks** | `GET/POST /api/workspaces/:workspaceId/tasks`, `PATCH/DELETE .../:taskId` |
| **AI Copilot** | `POST /api/ai/prompt`, `POST /api/ai/workspace-chat` |
| **Notifications** | `GET /api/notifications`, `GET /api/notifications/done`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/{read-all\|archive-all}`, `PATCH /api/notifications/:id/{read\|archive}` |
| **Chat, DMs & Users** | `GET /api/workspaces/:workspaceId/messages`, `GET /api/dms/summary`, `GET /api/dms/:otherUserId`, `PATCH /api/dms/:otherUserId/read`, `GET /api/users/search` |
| **Health** | `GET /health` |

### Socket.IO Events
- **Document CRDT & Canvas:** `join-document`, `joined-document`, `sync`, `update`, `awareness`, `canvas-update`
- **Presentation:** `workspace:join`, `presentation:start`, `presentation:stop`, `presentation:switch_doc`, `presentation:scroll`, `presentation:sync_scroll`, `presentation:takeover`, `presentation:mute_user`, `presentation:force_mute`
- **Chat, DMs & Alerts:** `chat:join`, `chat:message`, `dm:join`, `dm:message`, `dm:notification`, `notification:new`, `new-invitation`, `workspace-removed`

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** `v20+`
- **pnpm** `9.5.0+` (`corepack enable && corepack prepare pnpm@9.5.0 --activate`)
- **PostgreSQL** database (e.g., Supabase Postgres)
- **Supabase Storage** bucket (optional, required for file/image uploads)
- **Google Gemini API Key** (optional, required for Nexus Copilot)

### 1. Clone & Install
```bash
git clone [https://github.com/u23ai105/nexus-workspace.git](https://github.com/u23ai105/nexus-workspace.git)
cd nexus-workspace
pnpm install
```

### 2. Configure Environment Variables

Create `packages/database/.env` (used by Prisma CLI):
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
```

Create `apps/server/.env`:
```env
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
JWT_SECRET="replace-with-a-strong-256-bit-secret"
CLIENT_URL="http://localhost:5173"

# Google Gemini (Nexus Copilot)
GEMINI_API_KEY="your-gemini-api-key"

# Supabase Object Storage (Workspace Drive & Editor Image Uploads)
SUPABASE_URL="[https://your-project.supabase.co](https://your-project.supabase.co)"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
SUPABASE_STORAGE_BUCKET="nexus-storage"
```

Create `apps/web/.env`:
```env
VITE_BACKEND_URL="http://localhost:4000"
```

### 3. Push Database Schema & Generate Prisma Client
```bash
pnpm --filter @nexus/database run db:generate
pnpm --filter @nexus/database run db:push
```

### 4. Start Development Servers
```bash
pnpm run dev
```
- **Web App:** `http://localhost:5173`
- **API & Socket Server:** `http://localhost:4000` (`GET /health`)

---

## 🧪 Scripts

| Command | Description |
| :--- | :--- |
| `pnpm run dev` | Run all apps and shared packages in watch mode via Turborepo |
| `pnpm run build` | Build `@nexus/database`, `@nexus/shared`, `server`, and `web` |
| `pnpm run lint` | Run Oxlint (web) and ESLint (server) across the monorepo |
| `pnpm run format` | Format TypeScript and Markdown files with Prettier |
| `pnpm --filter server test` | Run backend Vitest + Supertest suite |

---

## ☁️ Production Deployment (Render)

This repository ships with a [`render.yaml`](./render.yaml) blueprint that deploys:
1. **`nexus-server`** (Node Web Service) — builds the monorepo workspace filtered to `server` and binds to `PORT=10000`.
2. **`nexus-web`** (Static Site) — builds `apps/web/dist` and automatically wires `VITE_BACKEND_URL` to the `nexus-server` host.

To deploy, connect the repository in Render as a **Blueprint** and supply the secret environment variables (`DATABASE_URL`, `DIRECT_URL`, `GEMINI_API_KEY`, and Supabase Storage credentials) in the Render dashboard.

---

## 📚 Architecture Documentation

Detailed architectural decision records (ADRs) and audits live in [`docs/`](./docs):

- [`NEXUS_SYSTEM_DESIGN.md`](./docs/NEXUS_SYSTEM_DESIGN.md) — Monorepo, SPA, Express monolith, SWR, and scaling trade-offs
- [`NEXUS_REALTIME_ARCHITECTURE.md`](./docs/NEXUS_REALTIME_ARCHITECTURE.md) — Yjs CRDTs, Awareness lifecycle, and normalized "Follow Me" sync
- [`NEXUS_AI_CONTEXT_ARCHITECTURE.md`](./docs/NEXUS_AI_CONTEXT_ARCHITECTURE.md) — `ActiveDocumentContext`, priority bounds, and server-side auth
- [`NEXUS_RBAC_MATRIX.md`](./docs/NEXUS_RBAC_MATRIX.md) & [`NEXUS_RBAC_AUDIT.md`](./docs/NEXUS_RBAC_AUDIT.md) — Permission matrix and backend mutation audit
- [`NEXUS_INVITE_ARCHITECTURE.md`](./docs/NEXUS_INVITE_ARCHITECTURE.md) — SHA-256 token hashing and invite lifecycle
- [`NEXUS_NOTIFICATION_ARCHITECTURE.md`](./docs/NEXUS_NOTIFICATION_ARCHITECTURE.md) — Inbox-zero state machine and `eventId` deduplication
- [`FINAL_RELEASE_REPORT.md`](./docs/FINAL_RELEASE_REPORT.md) — Bundle optimization, over-fetching fixes, and release audit

---

## 📄 License

Distributed under the **MIT License**.
