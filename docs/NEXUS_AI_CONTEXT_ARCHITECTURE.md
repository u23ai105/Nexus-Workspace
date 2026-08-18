# Nexus AI Context Architecture

This document describes the architectural decisions and data flow for Nexus Copilot (Workspace AI), emphasizing a secure, performant, and correctly scoped contextual awareness mechanism.

## Source of Truth

**DECISION:** `Tiptap`/`Yjs` remains the authoritative source for live editing state. `PostgreSQL` is authoritative for persisted document state. The AI Context is merely a derived, temporary view.
**REASON:** The AI should not become a parallel system of record. Duplicating state logic into an AI store risks desync and heavy bugs.
**ALTERNATIVES:** Syncing AI context directly to the backend database on every keystroke, or using the AI context as the primary editor state.
**TRADE-OFF:** The backend AI API endpoint must accept client-derived live text (which is inherently unverified content).
**WHY CHOSEN:** Minimal complexity, high performance, clear boundary of responsibility.

## Context Propagation

**DECISION:** Use a narrowly scoped React Context (`ActiveDocumentContext`) wrapping the workspace layout.
**REASON:** Avoids prop-drilling while guaranteeing that updates (especially heavy text payloads) do not cause the entire application to re-render.
**ALTERNATIVES:** `window.dispatchEvent` DOM events, or a global Zustand store.
**TRADE-OFF:** Requires wrapping the layout, but Context API is standard and predictable compared to scattered DOM listeners.
**WHY CHOSEN:** Type-safe, React-native, easy to track, and correctly bounded to the component lifecycle.

## Context Priority & Size Limits

**DECISION:** Prioritize `selectedText` over `documentContext`, and enforce hard character bounds on the backend.
**REASON:** If a user selects a block of code, they want the AI focused solely on that code. Sending the entire document would confuse the model and inflate latency.
**ALTERNATIVES:** Let the LLM figure out what is important.
**TRADE-OFF:** We truncate very large documents natively rather than summarizing them.
**WHY CHOSEN:** Predictability. The user knows exactly what the AI is "looking" at.

## Server-Side Authorization

**DECISION:** Even though the client provides the `documentId` and `documentContext` live, the backend still fetches the document from PostgreSQL to verify the user actually has access to it.
**REASON:** A malicious user could send a REST request with `documentId="admin-secret"` and `documentContext="fake"`.
**ALTERNATIVES:** Trusting the frontend entirely.
**TRADE-OFF:** Requires a database lookup on every AI chat request.
**WHY CHOSEN:** Security is non-negotiable.

## Workspace Isolation & Stale Context

**DECISION:** `ActiveDocumentContext` is explicitly cleared whenever the `CollaborativeEditor` unmounts.
**REASON:** Prevent the AI from holding onto document state after the user navigates back to the dashboard.
**ALTERNATIVES:** Storing it indefinitely in local storage.
**TRADE-OFF:** The user loses "AI memory" of the document the second they leave it.
**WHY CHOSEN:** Prevents accidental data leaks across contexts or workspaces.
