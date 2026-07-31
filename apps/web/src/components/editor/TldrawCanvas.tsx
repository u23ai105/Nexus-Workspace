import { useEffect, useState } from 'react'
import { Tldraw, createTLStore, defaultShapeUtils, getSnapshot, loadSnapshot, Editor } from 'tldraw'
import 'tldraw/tldraw.css'
import { io, type Socket } from 'socket.io-client'

interface TldrawCanvasProps {
  documentId: string
  userId: string
  userName: string
  token: string
  serverUrl: string
  documentTitle: string
  readOnly?: boolean
  initialContent?: string | null
  onRename?: (newTitle: string) => void
  onBack?: () => void
}

export function TldrawCanvas({
  documentId,
  userId,
  token,
  serverUrl,
  documentTitle,
  readOnly = false,
  initialContent,
  onRename,
  onBack,
}: TldrawCanvasProps) {
  const [isConnected, setIsConnected] = useState(false)
  
  const [store] = useState(() => {
    const newStore = createTLStore({ shapeUtils: defaultShapeUtils })
    if (initialContent) {
      try {
        const snapshot = JSON.parse(initialContent)
        loadSnapshot(newStore, snapshot)
      } catch (e) {
        console.error('Failed to parse initial canvas state', e)
      }
    }
    return newStore
  })

  useEffect(() => {
    const socket: Socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket'],
    })

    let saveTimer: any = null
    const debouncedSave = () => {
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(async () => {
        try {
          const snapshot = getSnapshot(store)
          await fetch(`${serverUrl}/api/documents/${documentId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ textContent: JSON.stringify(snapshot) })
          })
        } catch (err) {
          console.error('Failed to save canvas state', err)
        }
      }, 2000)
    }

    socket.on('connect', () => {
      setIsConnected(true)
      socket.emit('join-document', { documentId, userId })
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    const unlisten = store.listen((entry) => {
      if (entry.source !== 'user') return

      socket.emit('canvas-update', {
        added: Object.values(entry.changes.added),
        updated: Object.values(entry.changes.updated).map(([, to]) => to),
        removed: Object.keys(entry.changes.removed),
      })
      debouncedSave()
    }, { source: 'user', scope: 'document' })

    socket.on('canvas-update', (msg) => {
      store.mergeRemoteChanges(() => {
        if (msg.added?.length || msg.updated?.length) {
          store.put([...(msg.added || []), ...(msg.updated || [])])
        }
        if (msg.removed?.length) {
          store.remove(msg.removed)
        }
      })
    })

    return () => {
      unlisten()
      if (saveTimer) clearTimeout(saveTimer)
      socket.disconnect()
    }
  }, [store, documentId, userId, token, serverUrl])

  return (
    <div className="relative w-full h-full flex flex-col bg-background">
      {/* Header matching NexusEditor */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex flex-col">
            <input
              type="text"
              value={documentTitle}
              onChange={(e) => onRename?.(e.target.value)}
              className="bg-transparent font-semibold text-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 rounded px-1 -ml-1 w-64"
              placeholder="Untitled Document"
              readOnly={readOnly}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-full border border-border/50 text-xs font-medium">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
            {isConnected ? 'Synced' : 'Connecting...'}
          </div>
        </div>
      </div>

      <div className="flex-1 relative z-0">
        <Tldraw 
          store={store} 
          onMount={(editor: Editor) => {
            if (readOnly) {
              editor.updateInstanceState({ isReadonly: true })
            }
          }} 
        />
      </div>
    </div>
  )
}
