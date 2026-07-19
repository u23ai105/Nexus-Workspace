import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Force Vite to resolve every package from the same location,
    // preventing multiple instances of yjs/prosemirror/tiptap from loading.
    dedupe: [
      'yjs',
      'lib0',
      '@tiptap/core',
      'prosemirror-state',
      'prosemirror-view',
      'prosemirror-model',
      'prosemirror-transform',
    ],
  },
  optimizeDeps: {
    // Pre-bundle these so Vite produces a single cached module for each.
    // Without this, Vite may resolve separate copies for transitive deps.
    include: [
      'yjs',
      'lib0',
      'y-protocols/awareness',
      'y-protocols/sync',
      '@tiptap/core',
      '@tiptap/pm/state',
      '@tiptap/pm/model',
      '@tiptap/pm/view',
      '@tiptap/pm/transform',
      '@tiptap/extension-collaboration',
      '@tiptap/extension-collaboration-caret',
      '@tiptap/starter-kit',
    ],
  },
  server: {
    // Explicitly bind port 5173 so we never fall back to 5175.
    port: 5173,
    // Allow CORS origins from both common dev ports.
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:4000'],
    },
  },
})
