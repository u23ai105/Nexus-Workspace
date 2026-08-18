# Phase 8 Human Test Plan

Execute these tests to verify the Nexus Copilot implementation:

## AI-001: No-document AI
1. Go to the workspace dashboard (`/w/:workspaceId`). Do not open any document.
2. Open Workspace AI.
3. Check the context indicator.
**Expected:** The indicator should say "Context: Workspace general".

## AI-002: Document-context AI
1. Open a document from the dashboard.
2. Open Workspace AI.
3. Check the context indicator.
**Expected:** The indicator should say "Context: Using: [Document Title]".

## AI-003: Live unsaved text
1. Type a completely new, absurd sentence into the document (e.g., "The purple elephant dances at midnight").
2. Do not wait for it to save.
3. Open Workspace AI and ask: "What did I just write about an elephant?"
**Expected:** AI should correctly reference the live text.

## AI-004 & AI-005: Selected text
1. Highlight a specific paragraph in the document.
2. Open Workspace AI.
**Expected:** Context indicator changes to "Context: Using selected text" with a purple styling.

## AI-006 & AI-007: Ask AI to summarize selected text
1. With text selected, click the "Summarize this document" suggestion chip or type "Summarize".
**Expected:** AI summarizes ONLY the selected text.

## AI-008 & AI-009: Generate code & Copy code block
1. Ask the AI: "Write a React component for a button."
2. **Expected:** AI generates code. The code block has syntax highlighting, a language indicator, and a "Copy" button.
3. Click the "Copy" button.
**Expected:** Button changes to "Copied" and the code is in your clipboard.

## AI-010: Thinking/loading state
1. Send a request to the AI.
**Expected:** While waiting, a fluid bouncing skeleton loader appears.

## AI-011: Error state
1. Turn off your Wi-Fi or stop the backend server.
2. Send a request to the AI.
**Expected:** A clean error message appears in the chat bubble, without exposing raw backend stack traces.

## AI-012: Contextual panel exclusivity
1. Open Workspace AI.
2. Click the "Tasks" button in the sidebar.
**Expected:** AI closes, Tasks opens. They never overlap.

## AI-013 & AI-014: Switch documents/workspaces
1. Open Document A, check AI context.
2. Switch to Document B, check AI context.
**Expected:** AI context updates instantly to Document B.
3. Switch to another Workspace.
**Expected:** Old document context is cleared.

## AI-015: Keyboard navigation
1. Press `Tab` through the AI panel.
**Expected:** Input field and send button are focusable.
