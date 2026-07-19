import type { CollabUser } from '../../hooks/useCollaboration'
import type { ConnectionStatus } from '../../hooks/useCollaboration'

interface PresenceAvatarsProps {
  users: CollabUser[]
  currentUserId: string
  status: ConnectionStatus
}

const MAX_VISIBLE = 5

export function PresenceAvatars({ users, currentUserId, status }: PresenceAvatarsProps) {
  const others = users.filter((u) => u.id !== currentUserId)
  const visible = others.slice(0, MAX_VISIBLE)
  const overflow = others.length - MAX_VISIBLE

  return (
    <div className="presence-bar">
      {/* Connection indicator */}
      <div className={`presence-status presence-status--${status}`}>
        <span className="presence-dot" />
        <span className="presence-label">
          {status === 'connected'
            ? `${users.length} online`
            : status === 'connecting'
              ? 'Connecting…'
              : 'Offline'}
        </span>
      </div>

      {/* User avatars */}
      {visible.length > 0 && (
        <div className="presence-avatars">
          {visible.map((user) => (
            <div
              key={user.socketId}
              className="presence-avatar"
              style={{ '--avatar-color': user.color } as React.CSSProperties}
              title={user.name}
            >
              {user.name.slice(0, 2).toUpperCase()}
            </div>
          ))}
          {overflow > 0 && (
            <div className="presence-avatar presence-avatar--overflow" title={`+${overflow} more`}>
              +{overflow}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
