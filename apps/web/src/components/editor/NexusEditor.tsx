import { useEffect, useMemo, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import CharacterCount from '@tiptap/extension-character-count'
import * as Y from 'yjs'
import { Awareness, encodeAwarenessUpdate } from 'y-protocols/awareness'
import { EditorToolbar } from './Toolbar'
import { AuthorHighlight } from './AuthorHighlight'
import { PollExtension } from './pollExtension'
// Dedicated CSS for remote-user carets, name labels, and authorship highlights
import './collaboration-cursors.css'

// ── Types ──────────────────────────────────────────────────────────────────

interface NexusEditorProps {
  ydoc: Y.Doc
  awareness: Awareness
  user: { name: string; color: string }
  documentTitle: string
  readOnly?: boolean
  onRename?: (newTitle: string) => void
  onBack?: () => void
  token: string
  serverUrl: string
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

export function NexusEditor({ ydoc, awareness, user, documentTitle, readOnly = false, onRename, onBack, token, serverUrl }: NexusEditorProps) {
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
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full my-6 border border-border shadow-sm',
        },
      }),
      PollExtension,
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [], // Stable — ydoc and awareness are created once per session in refs
  )

  const [isRenaming, setIsRenaming] = useState(false)
  const [titleInput, setTitleInput] = useState(documentTitle)

  useEffect(() => {
    setTitleInput(documentTitle)
  }, [documentTitle])
  const [saveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [isUploading, setIsUploading] = useState(false)

  // Upload handler
  const handleImageUpload = async (file: File, view: any, event: Event) => {
    // Only handle images
    if (!file.type.startsWith('image/')) return false
    
    // Prevent default behavior so browser doesn't try to open the file
    event.preventDefault()
    
    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      // Extract workspace ID from URL or document state if possible. 
      // Since it's not directly in props, we might need to get it from context.
      // But we can extract it from localStorage or window location for now.
      const workspaceId = localStorage.getItem('nexus_workspace_id')
      if (workspaceId) {
        formData.append('workspaceId', workspaceId)
      }

      const res = await fetch(`${serverUrl}/api/files/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      })
      
      const data = await res.json()
      
      if (res.ok && data.file) {
        // Insert the image into the editor at the current cursor position
        const { schema } = view.state
        const coordinates = view.posAtCoords({ left: (event as MouseEvent).clientX, top: (event as MouseEvent).clientY })
        const node = schema.nodes.image.create({ src: data.file.url })
        const transaction = view.state.tr.insert(coordinates?.pos || view.state.selection.to, node)
        view.dispatch(transaction)
      } else {
        alert('Failed to upload image: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Upload error:', err)
      alert('Error uploading image')
    } finally {
      setIsUploading(false)
    }
    
    return true
  }

  const editor = useEditor({ 
    extensions,
    editorProps: {
      handleDrop: function(view, event, _slice, moved) {
        if (readOnly) return false
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          handleImageUpload(event.dataTransfer.files[0], view, event)
          return true
        }
        return false
      },
      handlePaste: function(view, event, _slice) {
        if (readOnly) return false
        if (event.clipboardData && event.clipboardData.files && event.clipboardData.files[0]) {
          handleImageUpload(event.clipboardData.files[0], view, event)
          return true
        }
        return false
      }
    },
    editable: !readOnly,
  })

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (titleInput.trim() && titleInput !== documentTitle && onRename) {
      onRename(titleInput.trim())
    }
    setIsRenaming(false)
  }

  return (
    <div className="nexus-editor flex-1 bg-grid-pattern bg-background overflow-y-auto h-full relative">
      {/* Top Header Bar with Back Button, Inline Title, and Status Badge */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-background/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center space-x-4 flex-1 min-w-0 mr-4">
          {onBack && (
            <button
              onClick={() => {
                if (saveStatus === 'saving' && !confirm('Your recent edits are currently syncing to cloud. Leave anyway?')) {
                  return
                }
                onBack()
              }}
              className="flex items-center space-x-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted px-3 py-1.5 rounded-md border border-border transition-all shrink-0"
            >
              <span>⬅</span>
              <span>Dashboard</span>
            </button>
          )}

          <div className="flex-1 min-w-0">
            {isRenaming && !readOnly ? (
              <form onSubmit={handleTitleSubmit}>
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={() => {
                    if (titleInput.trim() && titleInput !== documentTitle && onRename) {
                      onRename(titleInput.trim())
                    }
                    setIsRenaming(false)
                  }}
                  autoFocus
                  className="bg-background text-foreground text-lg font-semibold px-2 py-0.5 rounded-sm border border-primary focus:outline-none focus:ring-1 focus:ring-primary w-full max-w-md"
                />
              </form>
            ) : (
              <div
                onClick={() => { if (!readOnly) setIsRenaming(true) }}
                className={`group flex items-center space-x-2 py-0.5 px-2 -ml-2 rounded-sm w-fit ${readOnly ? '' : 'cursor-pointer hover:bg-muted/80 transition-colors'}`}
                title={readOnly ? "Read Only" : "Click to rename document inline"}
              >
                <h2 className="text-lg font-semibold text-foreground truncate">{documentTitle}</h2>
                {!readOnly && <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>}
              </div>
            )}
          </div>
        </div>

        {/* Live Cloud Save Status Badge */}
        <div className="flex items-center space-x-3 shrink-0">
          {isUploading && (
            <span className="inline-flex items-center space-x-1.5 text-xs font-medium text-foreground bg-muted border border-border px-2.5 py-1 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>Uploading Image...</span>
            </span>
          )}
          {saveStatus === 'saved' && !isUploading && (
            <span className="inline-flex items-center space-x-1.5 text-xs font-medium text-muted-foreground bg-muted/50 border border-border px-2.5 py-1 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Saved to Cloud</span>
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="inline-flex items-center space-x-1.5 text-xs font-medium text-foreground bg-muted border border-border px-2.5 py-1 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span>Saving...</span>
            </span>
          )}
        </div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto pb-24">
        {/* Live presence bar — shows online count + all connected authors */}
      <OnlineBar users={onlineUsers} />

      {/* Formatting toolbar */}
      <EditorToolbar editor={editor} />

      {/* The ProseMirror / Tiptap editable surface */}
      <div className="nexus-editor__content-wrapper">
        <EditorContent editor={editor} className="nexus-editor__content" />
      </div>

        <WordCount editor={editor} />
      </div>
    </div>
  )
}
