import type { CollabUser, ConnectionStatus } from '../../hooks/useCollaboration'

interface PresenceAvatarsProps {
  users: CollabUser[]
  currentUserId: string
  status: ConnectionStatus
}

const MAX_VISIBLE = 4

export function PresenceAvatars({ users, currentUserId, status }: PresenceAvatarsProps) {
  // Deterministic order: we could sort by ID or Name to prevent jumping, 
  // but usually users is already stable or we can sort them.
  // We exclude currentUserId from the remote stack, or we can include it at the start.
  // The user requested: "current user, active participants, remaining".
  // `CollabUser` doesn't have a concept of "active", so we'll just sort by name.
  const currentUser = users.find(u => u.id === currentUserId)
  
  const others = [...users]
    .filter(u => u.id !== currentUserId)
    .sort((a, b) => a.name.localeCompare(b.name))

  const visibleOthers = others.slice(0, MAX_VISIBLE)
  const overflow = others.length - MAX_VISIBLE

  return (
    <div className="flex items-center gap-4">
      {/* Connection indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="relative flex h-2.5 w-2.5">
          {status === 'connected' && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span 
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              status === 'connected' ? 'bg-emerald-500' :
              status === 'connecting' ? 'bg-amber-500' : 'bg-rose-500'
            }`} 
          />
        </span>
        <span className="font-medium">
          {status === 'connected'
            ? `${users.length} online`
            : status === 'connecting'
              ? 'Connecting…'
              : 'Offline'}
        </span>
      </div>

      {/* User avatars stack */}
      <div className="flex items-center -space-x-2.5">
        {currentUser && (
          <div
            key={currentUser.id}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-background z-10 relative cursor-pointer shadow-sm hover:-translate-y-0.5 transition-transform"
            style={{ backgroundColor: currentUser.color }}
            title={`${currentUser.name} (You)`}
          >
            {currentUser.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        
        {visibleOthers.map((user, idx) => (
          <div
            key={user.id || user.socketId}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-background relative cursor-pointer shadow-sm hover:-translate-y-0.5 transition-transform"
            style={{ 
              backgroundColor: user.color,
              zIndex: 10 - (idx + 1) // ensures earlier users stack on top
            }}
            title={user.name}
          >
            {user.name.slice(0, 2).toUpperCase()}
          </div>
        ))}
        
        {overflow > 0 && (
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-muted text-muted-foreground border-2 border-background relative shadow-sm"
            style={{ zIndex: 0 }}
            title={`+${overflow} more participants`}
          >
            +{overflow}
          </div>
        )}
      </div>
    </div>
  )
}
