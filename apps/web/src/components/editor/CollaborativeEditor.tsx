import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { io, type Socket } from 'socket.io-client'
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates
} from 'y-protocols/awareness'
import * as decoding from 'lib0/decoding'
import { Suspense, lazy } from 'react'

const NexusEditor = lazy(() => import('./NexusEditor').then(m => ({ default: m.NexusEditor })))
const TldrawCanvas = lazy(() => import('./TldrawCanvas').then(m => ({ default: m.TldrawCanvas })))
import { useActiveDocument } from '../../contexts/ActiveDocumentContext'

interface CollaborativeEditorProps {
  documentId: string
  userId: string
  userName: string
  userColor: string
  token: string
  serverUrl: string
  documentTitle?: string
  documentType?: 'TEXT' | 'CANVAS'
  initialContent?: string | null
  readOnly?: boolean
  globalSocket?: Socket | null
  workspaceId?: string
  userRole?: string
  onBack?: () => void
}

export function CollaborativeEditor(props: CollaborativeEditorProps) {
  if (props.documentType === 'CANVAS') {
    return (
      <Suspense fallback={<div className="flex h-full w-full items-center justify-center bg-card text-muted-foreground"><span className="animate-pulse">Loading canvas...</span></div>}>
        <TldrawCanvas 
          documentId={props.documentId}
          userId={props.userId}
          userName={props.userName}
          token={props.token}
          serverUrl={props.serverUrl}
          documentTitle={props.documentTitle || 'Untitled Canvas'}
          initialContent={props.initialContent}
          readOnly={props.readOnly}
          onBack={props.onBack}
        />
      </Suspense>
    )
  }

  return <CollaborativeTextEditor {...props} />
}

function CollaborativeTextEditor({
  documentId,
  userId,
  userName,
  userColor,
  token,
  serverUrl,
  documentTitle = 'Untitled Document',
  readOnly = false,
  globalSocket,
  workspaceId,
  userRole,
  onBack,
}: CollaborativeEditorProps) {
  // ── Stable Yjs instances via ref (never destroyed during StrictMode remounts)
  //
  // Using useRef instead of useState prevents React from ever calling the
  // initializer twice. The ref is created once per component lifetime and
  // survives React Strict-Mode's double-invoke cycle without being destroyed.
  const ydocRef = useRef<Y.Doc | null>(null)
  const awarenessRef = useRef<Awareness | null>(null)

  if (!ydocRef.current) {
    ydocRef.current = new Y.Doc()
  }
  if (!awarenessRef.current) {
    awarenessRef.current = new Awareness(ydocRef.current)
  }

  const ydoc = ydocRef.current
  const awareness = awarenessRef.current

  const [isConnected, setIsConnected] = useState(false)
  const { updateContext, clearContext } = useActiveDocument()

  useEffect(() => {
    if (workspaceId && documentId) {
      updateContext({
        workspaceId,
        documentId,
        documentTitle: documentTitle || 'Untitled Document',
      })
    }
    return () => clearContext()
  }, [workspaceId, documentId, documentTitle])

  useEffect(() => {
    // ── 1. Announce local user identity in Awareness ───────────────────────
    //
    // We set this BEFORE connecting so that the very first awareness broadcast
    // already contains our user metadata (name + colour). Every peer will
    // render our cursor with the correct label immediately upon joining.
    awareness.setLocalStateField('user', {
      id: userId,
      name: userName,
      color: userColor,
    })

    // ── 2. Connect to the collaboration server ─────────────────────────────
    const socket: Socket = io(serverUrl, {
      auth: { token },
      // Use WebSocket directly – skips the HTTP long-poll phase.
      transports: ['websocket'],
      // Retry up to 5 times before giving up (handles brief server restarts).
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    // ── 3. Tab-close cursor cleanup ────────────────────────────────────────
    //
    // When a user closes or navigates away, the TCP timeout may leave their
    // cursor ghost visible to peers for several seconds. By nulling our
    // awareness state synchronously in beforeunload and emitting the removal
    // update, peers receive an instant departure notification.
    const handleBeforeUnload = () => {
      awareness.setLocalState(null)
      const removalUpdate = encodeAwarenessUpdate(awareness, [awareness.clientID])
      socket.emit('awareness', Array.from(removalUpdate))
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    // ── 4. Socket connection events ────────────────────────────────────────
    socket.on('connect', () => {
      setIsConnected(true)


      // Ask the server to put us into the Yjs room for this document.
      // The server will respond with the current full document state.
      socket.emit('join-document', { documentId, userId })

      // Send our current awareness state immediately so peers see us right away.
      const awarenessUpdate = encodeAwarenessUpdate(awareness, [awareness.clientID])
      socket.emit('awareness', Array.from(awarenessUpdate))
    })

    socket.on('disconnect', () => {

      setIsConnected(false)
      
      // Clear all remote awareness states locally.
      // This ensures that if we lose connection, we don't see ghost cursors of other people.
      // When we reconnect, we will receive their fresh awareness states.
      const remoteClients: number[] = []
      awareness.getStates().forEach((_state, clientId) => {
        if (clientId !== awareness.clientID) {
          remoteClients.push(clientId)
        }
      })
      if (remoteClients.length > 0) {
        removeAwarenessStates(awareness, remoteClients, 'local')
      }
    })

    socket.on('connect_error', (err) => {
      console.error('[Collab] Connection error:', err.message)
    })

    // ── 5. Handle the initial full document state from the server ──────────
    //
    // When we join a room, the server calls sendFullUpdate() which encodes
    // the Y.Doc using y-protocols/sync's writeUpdate() helper.
    // Format: [varuint messageType=2] [varuint8array updateBytes]
    //
    // After applying this, our Y.Doc is in sync with the server's state and
    // the Tiptap editor will immediately show the document's existing content.
    socket.on('sync', (data: number[]) => {
      try {
        const uint8Array = new Uint8Array(data)
        const decoder = decoding.createDecoder(uint8Array)
        const messageType = decoding.readVarUint(decoder)

        // messageType 1 = Sync Step 2 (response to our step 1)
        // messageType 2 = Full Update (what sendFullUpdate sends)
        if (messageType === 1 || messageType === 2) {
          const update = decoding.readVarUint8Array(decoder)
          // Apply with origin 'server' so our ydoc.on('update') listener
          // (below) will NOT echo it back — preventing an infinite loop.
          Y.applyUpdate(ydoc, update, 'server')

        }
      } catch (err) {
        console.error('[Collab] Error processing sync message:', err)
      }
    })

    // ── 6. Handle incremental updates from other clients ──────────────────
    //
    // The server broadcasts raw Yjs update bytes (no protocol header) for
    // every keystroke from every other connected user. We apply them directly.
    socket.on('update', (data: number[]) => {
      try {
        Y.applyUpdate(ydoc, new Uint8Array(data), 'server')
      } catch (err) {
        console.error('[Collab] Error applying remote update:', err)
      }
    })

    // ── 7. Broadcast LOCAL doc changes to the server ───────────────────────
    //
    // ydoc.on('update') fires whenever the Y.Doc changes. The origin param
    // tells us who triggered the change:
    //   - 'server' → remote change we just applied  → do NOT re-emit (loop!)
    //   - anything else → local user action → emit to server
    const handleDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin !== 'server') {
        socket.emit('update', Array.from(update))

      }
    }
    ydoc.on('update', handleDocUpdate)

    // ── 8. Receive awareness updates from peers ────────────────────────────
    //
    // When another user moves their cursor, the server broadcasts their
    // awareness state. We apply it to our local awareness object. Tiptap's
    // CollaborationCaret extension is subscribed to this same object and will
    // re-render all remote cursors immediately.
    socket.on('awareness', (data: number[]) => {
      try {
        applyAwarenessUpdate(awareness, new Uint8Array(data), 'server')
      } catch (err) {
        console.error('[Collab] Error applying remote awareness update:', err)
      }
    })

    // ── 9. Broadcast LOCAL awareness changes (cursor moves) ───────────────
    //
    // awareness.on('update') fires when:
    //   - We move the cursor (added/updated with our clientID)
    //   - A peer's state is removed (they left)
    //
    // We only broadcast changes that originated from us locally (origin !==
    // 'server') to avoid re-broadcasting what we already received from peers.
    const handleAwarenessUpdate = (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown,
    ) => {
      if (origin === 'server') return

      const changedClients = [...added, ...updated, ...removed]
      const update = encodeAwarenessUpdate(awareness, changedClients)
      socket.emit('awareness', Array.from(update))
    }
    awareness.on('update', handleAwarenessUpdate)

    // ── 10. Cleanup on unmount (real navigation away, not StrictMode cycle) ─
    return () => {

      window.removeEventListener('beforeunload', handleBeforeUnload)
      ydoc.off('update', handleDocUpdate)
      awareness.off('update', handleAwarenessUpdate)
      socket.disconnect()
      // NOTE: We do NOT destroy ydoc or awareness here.
      // They live in refs that persist for the full component lifetime and
      // are shared with the Tiptap editor. Destroying them inside useEffect
      // cleanup would kill them during React Strict-Mode's double-invoke
      // cycle, leaving the second mount with dead Yjs instances.
    }
  // Only re-run this effect if the actual connection parameters change.
  // ydoc and awareness are stable refs — they must NOT be deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, userId, userName, userColor, token, serverUrl])

  // Global scroll syncing
  useEffect(() => {
    if (!globalSocket || !workspaceId || readOnly) return;

    let timeoutId: any;
    const handleScroll = () => {
      // scroll container might be window or a specific div
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      globalSocket.emit('presentation:scroll', { workspaceId, scrollY, role: userRole });
    };

    const debounceScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100);
    };

    const scrollContainer = document.querySelector('.ProseMirror') || window;
    
    scrollContainer.addEventListener('scroll', debounceScroll);

    const onSyncScroll = (data: { scrollY: number }) => {
      scrollContainer.removeEventListener('scroll', debounceScroll);
      if (scrollContainer === window) {
        window.scrollTo({ top: data.scrollY, behavior: 'smooth' });
      } else {
        (scrollContainer as Element).scrollTo({ top: data.scrollY, behavior: 'smooth' });
      }
      
      setTimeout(() => {
        scrollContainer.addEventListener('scroll', debounceScroll);
      }, 500);
    };

    globalSocket.on('presentation:sync_scroll', onSyncScroll);

    return () => {
      scrollContainer.removeEventListener('scroll', debounceScroll);
      globalSocket.off('presentation:sync_scroll', onSyncScroll);
    };
  }, [globalSocket, workspaceId, userRole, readOnly]);

  return (
    <div className="relative w-full h-full">
      {/* Connection status badge */}
      {!isConnected && (
        <div className="absolute top-2 right-2 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-full z-10 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
          Connecting…
        </div>
      )}
      <Suspense fallback={<div className="flex h-full w-full items-center justify-center bg-card text-muted-foreground"><span className="animate-pulse">Loading editor...</span></div>}>
        <NexusEditor
          ydoc={ydoc}
          awareness={awareness}
          user={{ name: userName, color: userColor }}
          documentTitle={documentTitle}
          readOnly={readOnly}
          onBack={onBack}
          token={token}
          serverUrl={serverUrl}
        />
      </Suspense>
    </div>
  )
}
