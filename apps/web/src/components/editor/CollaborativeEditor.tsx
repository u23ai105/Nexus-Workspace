import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { io, type Socket } from 'socket.io-client'
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from 'y-protocols/awareness'
import * as decoding from 'lib0/decoding'
import { NexusEditor } from './NexusEditor'

interface CollaborativeEditorProps {
  documentId: string
  userId: string
  userName: string
  userColor: string
  token: string
  serverUrl: string
  documentTitle?: string
  readOnly?: boolean
  onRename?: (newTitle: string) => void
  onBack?: () => void
}

export function CollaborativeEditor({
  documentId,
  userId,
  userName,
  userColor,
  token,
  serverUrl,
  documentTitle = 'Untitled Document',
  readOnly = false,
  onRename,
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
      console.log('[Collab] Socket connected, joining document:', documentId)

      // Ask the server to put us into the Yjs room for this document.
      // The server will respond with the current full document state.
      socket.emit('join-document', { documentId, userId })

      // Send our current awareness state immediately so peers see us right away.
      const awarenessUpdate = encodeAwarenessUpdate(awareness, [awareness.clientID])
      socket.emit('awareness', Array.from(awarenessUpdate))
    })

    socket.on('disconnect', (reason) => {
      console.log('[Collab] Socket disconnected:', reason)
      setIsConnected(false)
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
          console.log(`[Collab] Applied initial sync (type=${messageType}), doc has state`)
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
        console.log('[Collab] Sent local update to server, bytes:', update.length)
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
        console.error('[Collab] Error applying awareness update:', err)
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
      console.log('[Collab] Cleanup: removing listeners and disconnecting socket')
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

  return (
    <div className="relative w-full h-full">
      {/* Connection status badge */}
      {!isConnected && (
        <div className="absolute top-2 right-2 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-full z-10 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
          Connecting…
        </div>
      )}
      <NexusEditor
        ydoc={ydoc}
        awareness={awareness}
        user={{ name: userName, color: userColor }}
        documentTitle={documentTitle}
        readOnly={readOnly}
        onRename={onRename}
        onBack={onBack}
        token={token}
        serverUrl={serverUrl}
      />
    </div>
  )
}
