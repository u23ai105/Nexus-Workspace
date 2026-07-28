<div align="center">
  <h1>🌌 Nexus Workspace</h1>
  <p><strong>The Premium Collaborative Productivity Platform for Professionals & Students</strong></p>
  <p><i>A unified workspace combining real-time rich text editing, AI, infinite canvases, and team communication into one seamless environment.</i></p>

  <!-- Add your badges here later! Example: -->
  <!-- <img src="https://img.shields.io/badge/React-19-blue" alt="React 19" /> -->
  <!-- <img src="https://img.shields.io/badge/Node.js-Express-green" alt="Node.js" /> -->
</div>

<br />

## 📖 About The Project

**Nexus Workspace** is built to replace the fragmented stack of Google Docs, Slack, Miro, and ChatGPT. It is a highly scalable, real-time productivity engine designed specifically for remote teams, agencies, and study groups. With enterprise-grade data persistence, Role-Based Access Control (RBAC), and deeply integrated AI, Nexus Workspace is built for the future of work.

---

## 🌟 The "Wow" Factor: Outstanding Features

We go beyond standard text editing. Nexus Workspace includes cutting-edge tools to elevate collaboration:

- 🎨 **The "Infinite Canvas" Mode**: Toggle any document into a 2D spatial whiteboard. Drag text blocks, images, and PDFs around, connecting them with arrows for mind-mapping and brainstorming.
- 🧩 **Interactive "Mini-App" Blocks**: Type `/` to insert powerful widgets directly into your text. Use `/poll` for collaborative voting, `/kanban` to embed a project board, or `/code` for live code execution.
- 🧠 **Nexus Copilot (Context-Aware AI)**: Deeply integrated AI that doesn't just chat—it acts. Highlight text to "Extract Action Items", automatically generate `#tags` based on document context, and search across your entire workspace semantically.
- 📽️ **"Follow Me" Presentation Mode**: Click a button to lock every other user's screen to your view. As you scroll and highlight text, their screens move synchronously. Perfect for remote teaching and client pitches.

---

## 🚀 Core Platform Features

- **⚡ Real-Time Collaboration Engine**: Google Docs-style live editing with sub-millisecond cursor presence, powered by Yjs (CRDTs), Socket.io, and WebSockets.
- **🛡️ Role-Based Access Control (RBAC)**: Assign users as `Owner`, `Admin`, `Editor`, or `Viewer`. Granular feature access ensures data governance for professional teams.
- **💬 Workspace Communication**: Persistent, real-time global workspace chat channels alongside document-specific comment threads.
- **☁️ Cloud Persistence & Dirty State Protection**: Edits are debounced and saved automatically to PostgreSQL. Active browser tabs are protected from accidental closure while saving.
- **📁 Media & Workspace Drive**: Deep integration with Supabase Storage. Drag and drop images into the editor, or upload reference PDFs to your workspace drive.
- **✨ Premium Glassmorphism UI**: A stunning, fluid user interface built with Tailwind CSS, featuring smooth micro-animations, customizable workspace covers, and dynamic grid/list views.
- **📇 Member & Contact Management**: Search your contact book or invite new collaborators via email seamlessly.

---

## 🏗️ Architecture & Tech Stack

Nexus Workspace is built as a highly scalable, containerized distributed system inside a **Turborepo** monorepo.

### Frontend
- **Framework**: React 19, TypeScript, Vite
- **State & Data Fetching**: Zustand, TanStack (React) Query
- **Styling**: Tailwind CSS (Glassmorphism design), Framer Motion
- **Editor & Canvas**: Tiptap (ProseMirror), React Flow
- **Real-Time**: Socket.io Client, Yjs

### Backend & Microservices
- **Server**: Node.js, Express, TypeScript (running on ultra-fast `tsx` esbuild)
- **Database**: PostgreSQL (Relational Data), Prisma ORM
- **Cloud Storage**: Supabase (Postgres Pooler & Object Storage)
- **Real-Time Server**: Socket.io
- **AI**: OpenAI / Gemini APIs, Vercel AI SDK

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+)
- PostgreSQL Database URL (e.g., Supabase)
- pnpm (Package Manager)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/nexus-workspace.git
   cd nexus-workspace
   ```

2. **Install dependencies (Monorepo)**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   Copy `.env.example` to `.env` in `apps/web`, `apps/server`, and `packages/database`. Add your PostgreSQL connection strings.

4. **Sync the Database Schema**
   ```bash
   pnpm --filter @nexus/database run db:push
   ```

5. **Start the development servers**
   ```bash
   pnpm run dev
   ```
   *This starts the frontend on `localhost:5173` and the backend on `localhost:4000` with instant HMR.*

---

## 📁 Project Structure (Turborepo / Monorepo)

```text
nexus-workspace/
├── apps/
│   ├── web/                 # React 19 Frontend (Vite)
│   └── server/              # Node.js Express API & Socket.io server
├── packages/
│   ├── database/            # Prisma schema, migrations, and generated client
│   ├── shared/              # Shared types, Zod schemas, constants
│   ├── config-typescript/   # Shared tsconfig bases
│   └── ui/                  # (Future) Shared React components
└── docs/                    # Architecture Decision Records & Learning Journals
```

---

## 🗺️ Development Roadmap

- [x] **Phase 1: Foundation** - Monorepo setup, Auth (JWT/OAuth), PostgreSQL schema, basic Dashboard and Workspace CRUD.
- [x] **Phase 2: Real-Time Engine** - Tiptap integration, Yjs setup, Socket.io presence, live collaborative editing.
- [x] **Phase 3: Persistence & Dashboard UI** - CRDT Database snapshotting, glassmorphism UI, dirty state protection, debounced saving.
- [ ] **Phase 4: Identity & Access** - DB schema updates for RBAC, Workspace Invites, Contacts, and the Member Management UI.
- [ ] **Phase 5: Media Infrastructure** - Supabase Storage integration, File uploading UI, and Tiptap Image extension.
- [ ] **Phase 6: Communication & Mini-Apps** - Real-time Workspace Chat, Presence indicators, and Interactive Blocks (`/poll`, `/kanban`).
- [ ] **Phase 7: The "Wow" Features** - Infinite Canvas Mode, "Follow Me" Presentation Mode, and Nexus Copilot (AI Integration).

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
