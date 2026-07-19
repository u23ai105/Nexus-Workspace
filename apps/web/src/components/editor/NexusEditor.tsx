import { useEffect, useMemo, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import * as Y from 'yjs'
import { Awareness, encodeAwarenessUpdate } from 'y-protocols/awareness'
import { EditorToolbar } from './Toolbar'
import { AuthorHighlight } from './AuthorHighlight'
// Dedicated CSS for remote-user carets, name labels, and authorship highlights
import './collaboration-cursors.css'

// ── Types ──────────────────────────────────────────────────────────────────

interface NexusEditorProps {
  ydoc: Y.Doc
  awareness: Awareness
  user: { name: string; color: string }
  documentTitle: string
}

// A single online user record extracted from the Yjs Awareness state map.
interface OnlineUser {
  /** ProseMirror / Yjs client ID — unique per browser tab connection */
  clientId: number
  name: string
  color: string
  isLocal: boolean
}

// ── Hook: useAwarenessUsers ────────────────────────────────────────────────
//
// Subscribes to the Yjs Awareness object and returns a live list of all
// currently connected users.  Every time a user joins, leaves, or updates
// their state the `awareness.on('change', ...)` event fires and we refresh.
function useAwarenessUsers(awareness: Awareness): OnlineUser[] {
  const [users, setUsers] = useState<OnlineUser[]>([])

  useEffect(() => {
    const refreshUsers = () => {
      const list: OnlineUser[] = []
      awareness.getStates().forEach((state, clientId) => {
        const u = (state as any).user
        if (u?.name && u?.color) {
          list.push({
            clientId,
            name: u.name,
            color: u.color,
            isLocal: clientId === awareness.clientID,
          })
        }
      })
      setUsers(list)
    }

    awareness.on('change', refreshUsers)
    refreshUsers()

    return () => {
      awareness.off('change', refreshUsers)
    }
  }, [awareness])

  return users
}

// ── Sub-component: WordCount ───────────────────────────────────────────────

function WordCount({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null
  const chars = editor.storage.characterCount?.characters() ?? 0
  const words = editor.storage.characterCount?.words() ?? 0
  return (
    <div className="editor-statusbar">
      <span>{words} words</span>
      <span>·</span>
      <span>{chars} characters</span>
    </div>
  )
}

// ── Sub-component: OnlineBar ───────────────────────────────────────────────
//
// Shows a live online count + colored avatar pill for every connected user.
// The "YOU" badge marks the local user so they understand which pill is them.
function OnlineBar({ users }: { users: OnlineUser[] }) {
  return (
    <div className="online-bar">
      {/* Live online count with green pulse dot */}
      <div className="online-bar__count">
        <span className="online-bar__pulse" />
        <span className="online-bar__label">
          {users.length === 0
            ? 'No one online'
            : users.length === 1
            ? '1 person online'
            : `${users.length} people online`}
        </span>
      </div>

      {/* Avatar pills for each user */}
      <div className="online-bar__pills">
        {users.map((u) => (
          <div
            key={u.clientId}
            className="author-pill"
            title={u.isLocal ? `${u.name} (You)` : u.name}
            style={{ '--author-color': u.color } as React.CSSProperties}
          >
            <span className="author-pill__dot" />
            <span className="author-pill__name">
              {u.name}
              {u.isLocal && <span className="author-pill__you"> (You)</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Component: NexusEditor ────────────────────────────────────────────

export function NexusEditor({ ydoc, awareness, user, documentTitle }: NexusEditorProps) {
  // ── Live user list from awareness ──────────────────────────────────────
  const onlineUsers = useAwarenessUsers(awareness)

  // ── Inject our identity into Yjs Awareness ──────────────────────────────
  //
  // We set the user state in CollaborativeEditor on socket connect, but
  // also set it here in case NexusEditor mounts before the socket connects.
  // Both calls are idempotent; the last one wins.
  useMemo(() => {
    awareness.setLocalStateField('user', {
      name: user.name,
      color: user.color,
    })
  }, [awareness, user.name, user.color])

  // ── Tab-close cursor cleanup (NexusEditor side) ──────────────────────────
  useEffect(() => {
    const handleBeforeUnload = () => {
      awareness.setLocalState(null)
      void encodeAwarenessUpdate(awareness, [awareness.clientID])
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [awareness])

  // ── Tiptap extension list ────────────────────────────────────────────────
  //
  // Memoized with [] so the ProseMirror instance is never re-created.
  // ydoc and awareness are stable — passed in as refs from the parent.
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        // Disable StarterKit's built-in history plugin —
        // the Collaboration extension (Yjs) handles undo/redo via its own CRDT.
        undoRedo: false,
      }),

      // ── Text sync via Yjs ───────────────────────────────────────────────
      // Binds this editor instance to the shared Y.Doc. Every local
      // transaction is encoded as a Yjs update and propagated to all peers
      // through our Socket.io bridge in CollaborativeEditor.
      Collaboration.configure({ document: ydoc }),

      // ── Live remote cursors ─────────────────────────────────────────────
      // Renders a colored vertical caret + floating name label at every
      // remote peer's cursor position. Updates in real-time via Awareness.
      // provider.awareness is the interface Tiptap v3 reads internally.
      CollaborationCaret.configure({
        provider: { awareness },
        user: { name: user.name, color: user.color },
      }),

      // ── Per-author text highlights ──────────────────────────────────────
      // Wraps every passage typed by the local user in a Mark that carries
      // their name and colour. The mark is synced to all peers via Yjs so
      // every connected user can see "who wrote what" — and it persists even
      // after the author disconnects (because it lives inside the Y.Doc).
      AuthorHighlight.configure({
        userId: user.name,
        userName: user.name,
        userColor: user.color,
      }),

      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({
        placeholder: 'Start writing… — your name appears below each passage you type',
      }),
      CharacterCount,
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [], // Stable — ydoc and awareness are created once per session in refs
  )

  const editor = useEditor({ extensions })

  return (
    <div className="nexus-editor">
      {/* Document title */}
      <div className="nexus-editor__doc-title">
        <h2>{documentTitle}</h2>
      </div>

      {/* Live presence bar — shows online count + all connected authors */}
      <OnlineBar users={onlineUsers} />

      {/* Formatting toolbar */}
      <EditorToolbar editor={editor} />

      {/* The ProseMirror / Tiptap editable surface */}
      <div className="nexus-editor__content-wrapper">
        <EditorContent editor={editor} className="nexus-editor__content" />
      </div>

      {/* Word / character count */}
      <WordCount editor={editor} />
    </div>
  )
}
