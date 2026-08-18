# Phase 14: Bundle Audit

## Current Build Metrics (Vite/Rollup)

```text
dist/assets/index-[hash].js                              1,712.24 kB │ gzip:   546.85 kB
dist/assets/CollaborativeEditor-[hash].js                3,669.18 kB │ gzip: 1,105.95 kB
```

## Analysis

### 1. CollaborativeEditor.js (3.6 MB)
- **Tldraw**: The `@tldraw/tldraw` library is monolithic and extremely heavy, containing its own entire rendering engine and UI framework.
- **Tiptap**: `@tiptap/react` and all extensions (StarterKit, Collaboration, etc) add significant weight.
- **Yjs & socket.io-client**: Realtime data sync.
- **Lowlight/Highlight.js**: Code syntax highlighting often pulls in dozens of language definitions.

**Actionable Optimizations:**
1. **Split Tldraw & Tiptap**: `CollaborativeEditor.js` currently bundles both. When a user opens a text document, they still download the 2MB+ Tldraw bundle. We must dynamically import `<TldrawCanvas>` vs `<NexusEditor>` to split these chunks!
2. **Lowlight languages**: Ensure we aren't importing all 150+ highlight.js languages if possible, though `all` from `lowlight` is currently used. (We will review `all` vs specific common languages if necessary, but code splitting is priority 1).

### 2. index.js (1.7 MB)
- Contains React, React Router, Radix UI primitives, SWR, and Lucide icons.
- Check if `lucide-react` is tree-shaking correctly (it usually does in Vite).
- **Actionable Optimizations**: Defer loading of heavy non-critical UI features (e.g., `CommandPalette` could be lazily loaded since it's hidden behind a shortcut).
