# Nexus Product Principles

These non-negotiable principles govern every design and architectural decision made for Nexus Workspace. Every future phase must be evaluated against these principles.

1. **One Unified Workspace:** Nexus is one coherent workspace, not a fragmented collection of disconnected tools. Features like chat, tasks, and documents must interoperate seamlessly.
2. **Content is Paramount:** The user's content (documents, canvas, files) is more important than the navigation chrome. The UI must get out of the way.
3. **Calm, Dense, and Professional:** The interface should be dark-first, premium, and minimal. Avoid neon colors, excessive gradients, heavy shadows, or arbitrary bright borders.
4. **Contextual over Permanent:** Contextual actions (e.g., hover menus, command palettes) are strongly preferred over permanent, screen-cluttering controls.
5. **Authoritative Backend Authorization:** The frontend UI may hide actions for viewers, but the backend API is the ultimate authority. RBAC must be rigorously enforced on the server for every mutation.
6. **Single Source of Truth:** There must be a clear single source of truth for every entity (e.g., Prisma for metadata, Yjs for document content).
7. **Purposeful Interaction:** Every click, animation, and hover state must have a clear purpose. No decorative animations or visual novelty for its own sake.
8. **Contextual AI:** AI (Nexus Copilot) should be integrated contextually into the workflow (e.g., highlighting text to summarize) rather than existing purely as a separate novelty chat feature.
9. **No Regression:** Existing functionality (real-time sync, Yjs state, auth) must not regress during redesign phases.
10. **Simplicity over Accumulation:** A well-executed core feature is better than ten poorly integrated ones. Simplicity is preferred over feature accumulation.
11. **Scalable Foundation:** Design tokens, UI primitives, and consistent architecture must be established before building complex pages. No one-off visual values.
