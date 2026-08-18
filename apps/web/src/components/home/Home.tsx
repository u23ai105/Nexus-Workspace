import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CommandPalette } from '../ui/CommandPalette'

interface Workspace {
  id: string
  name: string
  userRole?: string
  createdAt?: string
}

interface HomeProps {
  workspaces: Workspace[]
  user: { name: string; email: string }
  onCreateWorkspace: (name: string) => Promise<void>
  onDeleteWorkspace: (id: string) => Promise<void>
  onRenameWorkspace: (id: string, newName: string) => Promise<void>
}

export function Home({ workspaces, user, onCreateWorkspace, onDeleteWorkspace, onRenameWorkspace }: HomeProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWorkspaceName.trim()) return
    setLoading(true)
    await onCreateWorkspace(newWorkspaceName.trim())
    setNewWorkspaceName('')
    setIsCreating(false)
    setLoading(false)
  }

  // Use the tints requested by the user dynamically based on index
  const tints = ['bg-tint-orange', 'bg-tint-blue', 'bg-tint-red', 'bg-tint-green']
  const textTints = ['text-tint-orange', 'text-tint-blue', 'text-tint-red', 'text-tint-green']
  const borderTints = ['border-tint-orange', 'border-tint-blue', 'border-tint-red', 'border-tint-green']

  return (
    <div className="h-full w-full bg-grid-pattern bg-background text-foreground overflow-y-auto">
      <CommandPalette 
        workspaces={workspaces}
        workspaceId={null}
      />
      <div className="relative z-10 max-w-6xl mx-auto px-8 py-16">
        <header className="mb-16">
          <h1 className="text-4xl font-semibold tracking-tight mb-3">Welcome back, {user.name}</h1>
          <p className="text-muted-foreground text-lg">Select a workspace to enter or create a new environment.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((ws, i) => {
            const tintIdx = i % tints.length
            return (
              <div
                key={ws.id}
                onClick={() => navigate(`/w/${ws.id}`)}
                className="premium-card group cursor-pointer relative p-6 h-48 flex flex-col justify-between"
              >
                {/* Glowing subtle gradient on hover */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br from-transparent" 
                  style={{ '--tw-gradient-to': `rgb(var(--tint-${tints[tintIdx].split('-')[2]})) var(--tw-gradient-to-position)` } as React.CSSProperties}
                />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-muted border border-border group-hover:${borderTints[tintIdx]} transition-colors`}>
                        <span className={`font-bold ${textTints[tintIdx]}`}>{ws.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <h2 className="text-xl font-medium tracking-tight group-hover:text-foreground transition-colors">{ws.name}</h2>
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Rename Workspace Button */}
                      {(ws.userRole === 'OWNER' || ws.userRole === 'ADMIN') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const newName = prompt(`Enter new name for workspace "${ws.name}":`, ws.name)
                            if (newName && newName.trim() !== ws.name) {
                              onRenameWorkspace(ws.id, newName.trim())
                            }
                          }}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                          title="Rename Workspace"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      )}

                      {/* Delete Workspace Button */}
                      {ws.userRole === 'OWNER' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(`Are you sure you want to delete the workspace "${ws.name}"? This cannot be undone.`)) {
                              onDeleteWorkspace(ws.id)
                            }
                          }}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          title="Delete Workspace"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="relative z-10 flex items-center justify-between text-sm text-muted-foreground">
                  <span className="flex items-center space-x-1.5">
                    <span className={`w-2 h-2 rounded-full ${tints[tintIdx]}`} />
                    <span>Active</span>
                  </span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            )
          })}

          {/* Create New Workspace Card */}
          {isCreating ? (
            <div className="premium-card p-6 h-48 border-dashed border-2 flex flex-col justify-center bg-muted/30">
              <form onSubmit={handleCreate}>
                <input
                  autoFocus
                  type="text"
                  placeholder="Workspace Name..."
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-tint-blue mb-4"
                />
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={loading || !newWorkspaceName.trim()}
                    className="flex-1 bg-foreground text-background text-sm font-medium py-2 rounded-md hover:bg-foreground/90 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 bg-muted text-muted-foreground text-sm font-medium py-2 rounded-md hover:bg-muted/80"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div
              onClick={() => setIsCreating(true)}
              className="premium-card group cursor-pointer border-dashed border-2 border-border/60 hover:border-tint-blue/50 hover:bg-tint-blue/5 p-6 h-48 flex flex-col items-center justify-center text-muted-foreground hover:text-tint-blue transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-background border border-border group-hover:border-tint-blue/30 flex items-center justify-center mb-3 shadow-sm">
                <span className="text-2xl font-light">+</span>
              </div>
              <span className="font-medium">New Workspace</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
