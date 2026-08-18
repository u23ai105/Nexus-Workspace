import * as Y from 'yjs'
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from 'y-protocols/awareness'
import { io, type Socket } from 'socket.io-client'
import { useEffect, useRef, useState } from 'react'

let BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'
if (BACKEND_URL && !BACKEND_URL.startsWith('http')) {
  BACKEND_URL = `https://${BACKEND_URL}`
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export interface CollabUser {
  socketId: string
  id: string
  name: string
  color: string
}

interface UseCollaborationOptions {
  roomId: string
  user: { id: string; name: string; color: string }
  ydoc: Y.Doc
  awareness: Awareness
}

interface UseCollaborationResult {
  status: ConnectionStatus
  users: CollabUser[]
}

export function useCollaboration({
  roomId,
  user,
  ydoc,
  awareness,
}: UseCollaborationOptions): UseCollaborationResult {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [users, setUsers] = useState<CollabUser[]>([])
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket: Socket = io(BACKEND_URL, { transports: ['websocket'] })
    socketRef.current = socket

    // ── Connection ──────────────────────────────────────────────────────────
    socket.on('connect', () => {
      setStatus('connected')
      socket.emit('join-room', { roomId, user })
    })

    socket.on('disconnect', () => {
      setStatus('disconnected')
    })

    socket.on('connect_error', () => {
      setStatus('disconnected')
    })

    // ── Initial full document state from server ─────────────────────────────
    socket.on('sync-init', ({ update }: { update: number[] }) => {
      Y.applyUpdate(ydoc, Uint8Array.from(update))
    })

    // ── Incremental Yjs updates from other clients ──────────────────────────
    socket.on('sync-update', ({ update }: { update: number[] }) => {
      Y.applyUpdate(ydoc, Uint8Array.from(update))
    })

    // ── Awareness (cursors / presence) from other clients ───────────────────
    socket.on('awareness-update', ({ update }: { update: number[] }) => {
      applyAwarenessUpdate(awareness, Uint8Array.from(update), socket)
    })

    // ── User list management ────────────────────────────────────────────────
    socket.on('room-users', ({ users: roomUsers }: { users: CollabUser[] }) => {
      setUsers(roomUsers)
    })

    socket.on('user-joined', ({ socketId, user: joinedUser }: { socketId: string; user: CollabUser }) => {
      setUsers((prev) => {
        if (prev.find((u) => u.socketId === socketId)) return prev
        return [...prev, { ...joinedUser, socketId }]
      })
    })

    socket.on('user-left', ({ socketId }: { socketId: string }) => {
      setUsers((prev) => prev.filter((u) => u.socketId !== socketId))
    })

    // ── Broadcast local Yjs doc updates ────────────────────────────────────
    const docUpdateHandler = (update: Uint8Array, origin: unknown) => {
      // Don't re-broadcast updates we received from the socket
      if (origin === socket) return
      socket.emit('sync-update', { roomId, update: Array.from(update) })
    }
    ydoc.on('update', docUpdateHandler)

    // ── Broadcast local awareness changes (cursor, selection) ───────────────
    const awarenessChangeHandler = ({
      added,
      updated,
      removed,
    }: {
      added: number[]
      updated: number[]
      removed: number[]
    }) => {
      const changed = [...added, ...updated, ...removed]
      const update = encodeAwarenessUpdate(awareness, changed)
      socket.emit('awareness-update', { roomId, update: Array.from(update) })
    }
    awareness.on('change', awarenessChangeHandler)

    // Set local user state in awareness so others see our cursor
    awareness.setLocalStateField('user', user)

    // ── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      ydoc.off('update', docUpdateHandler)
      awareness.off('change', awarenessChangeHandler)
      socket.disconnect()
      socketRef.current = null
    }
  }, [roomId, user, ydoc, awareness])

  return { status, users }
}
