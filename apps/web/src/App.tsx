import { useState, useEffect, lazy, Suspense } from 'react'
import useSWR from 'swr'
const CollaborativeEditor = lazy(() => import('./components/editor/CollaborativeEditor').then(m => ({ default: m.CollaborativeEditor })))
import { DocumentDashboard } from './components/dashboard/DocumentDashboard'
import { Home } from './components/home/Home'
import { NotificationBell } from './components/ui/NotificationBell';
import { PresentationBar } from './components/dashboard/PresentationBar';
import { io, Socket } from 'socket.io-client';

import { GlobalChat } from './components/chat/GlobalChat';
import { MessageCircle } from 'lucide-react';
import type { DocumentItem } from './components/dashboard/DocumentCard'
import './App.css'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

// Get random color HSL for visual cursor uniqueness
function getRandomColor() {
  return `hsl(${Math.floor(Math.random() * 360)}, 85%, 60%)`
}

export default function App() {
  // Authentication states
  const [jwt, setJwt] = useState<string | null>(() => localStorage.getItem('nexus_jwt'))
  const [user, setUser] = useState<{ id: string; email: string; name: string; username?: string; color: string } | null>(() => {
    const stored = localStorage.getItem('nexus_user')
    return stored ? JSON.parse(stored) : null
  })
  // Form states

  const [isGlobalChatOpen, setIsGlobalChatOpen] = useState(false)
  const [activeDmUserId, setActiveDmUserId] = useState<string | null>(null)
  const [activeDmUser, setActiveDmUser] = useState<any>(null)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => localStorage.getItem('nexus_workspace_id'))
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null)
  const [userRole, setUserRole] = useState<string>('OWNER')
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [globalSocket, setGlobalSocket] = useState<Socket | null>(null)

  // Sync token changes to localStorage
  useEffect(() => {
    if (jwt) {
      localStorage.setItem('nexus_jwt', jwt)
    } else {
      localStorage.removeItem('nexus_jwt')
    }
  }, [jwt])

  useEffect(() => {
    if (user) {
      localStorage.setItem('nexus_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('nexus_user')
    }
  }, [user])

  useEffect(() => {
    if (activeWorkspaceId) {
      localStorage.setItem('nexus_workspace_id', activeWorkspaceId)
    } else {
      localStorage.removeItem('nexus_workspace_id')
    }
  }, [activeWorkspaceId])

  const fetcher = async ([url, token]: [string, string]) => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to fetch')
    return data
  }

  const { data: workspacesData, mutate: mutateWorkspaces } = useSWR(
    jwt && user ? [`${BACKEND_URL}/api/workspaces`, jwt] : null,
    fetcher
  )

  const workspaces = workspacesData?.workspaces || []

  // Auto-create default Personal Workspace if none exist
  useEffect(() => {
    if (workspacesData && workspacesData.workspaces?.length === 0 && jwt && user) {
      const createDefault = async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/workspaces`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify({ name: `${user.name}'s Workspace` }),
          })
          const createData = await res.json()
          if (res.ok && createData.workspace) {
            mutateWorkspaces() // Re-fetch
            setActiveWorkspaceId(createData.workspace.id)
          }
        } catch (err) {
          console.error(err)
        }
      }
      createDefault()
    }
  }, [workspacesData, jwt, user, mutateWorkspaces])

  // Manage Global Socket for Workspace
  useEffect(() => {
    if (activeWorkspaceId && jwt) {
      const socket = io(BACKEND_URL, {
        auth: { token: jwt },
        transports: ['websocket']
      });

      socket.on('connect', () => {
        socket.emit('workspace:join', activeWorkspaceId);
      });

      setGlobalSocket(socket);

      return () => {
        socket.disconnect();
      };
    } else {
      setGlobalSocket(null);
    }
  }, [activeWorkspaceId, jwt]);

  const handleCreateWorkspace = async (name: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/workspaces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (res.ok && data.workspace) {
        mutateWorkspaces({ workspaces: [data.workspace, ...workspaces] }, false)
        setActiveWorkspaceId(data.workspace.id)
      }
    } catch (err) {
      console.error('Failed to create workspace', err)
    }
  }

  const handleDeleteWorkspace = async (id: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/workspaces/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      })
      if (res.ok) {
        mutateWorkspaces({ workspaces: workspaces.filter((w: any) => w.id !== id) }, false)
        if (activeWorkspaceId === id) {
          setActiveWorkspaceId(null)
          setSelectedDoc(null)
        }
      }
    } catch (err) {
      console.error('Failed to delete workspace', err)
    }
  }

  const handleRenameWorkspace = async (id: string, newName: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/workspaces/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ name: newName })
      })
      if (res.ok) {
        mutateWorkspaces({
          workspaces: workspaces.map((w: any) => (w.id === id ? { ...w, name: newName } : w))
        }, false)
      }
    } catch (err) {
      console.error('Failed to rename workspace', err)
    }
  }

  const handleLogout = () => {
    setJwt(null)
    setUser(null)
    setError(null)
    setSuccessMsg(null)
    setSelectedDoc(null)
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)
    setLoading(true)

    const endpoint = isRegister ? '/auth/register' : '/auth/login'
    const body = isRegister 
      ? { email, password, name: name || undefined, username } 
      : { email, password }

    try {
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      if (isRegister) {
        setSuccessMsg('Account created successfully! Redirecting to login...')
        setTimeout(() => {
          setIsRegister(false)
          setError(null)
          setSuccessMsg(null)
          setPassword('')
          setLoading(false)
        }, 1500)
      } else {
        setJwt(data.token)
        setUser({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name || email.split('@')[0],
          username: data.user.username,
          color: getRandomColor(), // Assign random presence cursor color for session
        })
        setLoading(false)
      }
    } catch (err: any) {
      setError(err.message || 'Server connection failed')
      setLoading(false)
    }
  }

  // ── Authenticated Mode ──────────────────────────────────────────────────
  if (jwt && user) {
    const activeWorkspace = workspaces.find((w: any) => w.id === activeWorkspaceId)

    return (
      <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground font-sans selection:bg-tint-orange/30">
        {/* Navigation / Header */}
        <header className="flex justify-between items-center px-6 py-3.5 bg-card/60 border-b border-border/60 backdrop-blur-md shrink-0 relative z-20 shadow-sm">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => {
                setActiveWorkspaceId(null)
                setSelectedDoc(null)
              }}
              className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center hover:scale-105 transition-transform"
            >
              <span className="font-bold text-background text-base">N</span>
            </button>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => {
                  setActiveWorkspaceId(null)
                  setSelectedDoc(null)
                }}
                className="font-semibold text-base tracking-tight text-foreground hover:text-tint-orange transition-colors"
              >
                Nexus
              </button>
              
              {activeWorkspace && (
                <>
                  <span className="text-muted-foreground">/</span>
                  <select
                    value={activeWorkspaceId || ''}
                    onChange={(e) => {
                      setActiveWorkspaceId(e.target.value)
                      setSelectedDoc(null)
                    }}
                    className="bg-transparent text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                  >
                    {workspaces.map((ws: any) => (
                      <option key={ws.id} value={ws.id} className="bg-card text-foreground">
                        {ws.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsGlobalChatOpen(!isGlobalChatOpen)}
              className={`p-2 rounded-full transition-colors relative ${
                isGlobalChatOpen 
                  ? 'bg-indigo-500/20 text-indigo-400' 
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
              title="Global Messages"
            >
              <MessageCircle size={20} />
            </button>
            
            <NotificationBell 
              jwt={jwt} 
              serverUrl={BACKEND_URL} 
              onInvitationAccepted={mutateWorkspaces} 
              onWorkspaceRemoved={(removedId: string) => {
                mutateWorkspaces({ workspaces: workspaces.filter((w: any) => w.id !== removedId) }, false)
                if (activeWorkspaceId === removedId) {
                  setActiveWorkspaceId(null)
                  setSelectedDoc(null)
                }
              }}
            />
            
            <div className="flex items-center space-x-2 bg-muted/40 border border-border/50 px-3 py-1.5 rounded-full">
              <span 
                className="w-2.5 h-2.5 rounded-full border border-background" 
                style={{ backgroundColor: user.color }} 
              />
              <span className="text-xs font-medium text-foreground">{user.name}</span>
            </div>

            <button
              onClick={handleLogout}
              className="text-xs bg-muted/40 hover:bg-tint-red/10 hover:text-tint-red text-muted-foreground border border-border/50 px-3 py-1.5 rounded-md transition-all duration-200"
            >
              Log Out
            </button>
          </div>
        </header>

        {/* Body (Dashboard or Collaborative Editor) */}
        <main className="flex-1 overflow-hidden relative z-10 flex">
          <div className="flex-1 h-full overflow-hidden relative">
          {selectedDoc ? (
            <Suspense fallback={<div className="flex-1 flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
              <CollaborativeEditor
                key={selectedDoc.id}
                documentId={selectedDoc.id}
                userId={user.id}
                userName={user.name}
                userColor={user.color}
                token={jwt}
                serverUrl={BACKEND_URL}
                documentTitle={selectedDoc.title}
                documentType={selectedDoc.type}
                initialContent={selectedDoc.textContent}
                readOnly={userRole === 'VIEWER'}
                globalSocket={globalSocket}
                workspaceId={activeWorkspaceId || undefined}
                userRole={userRole}
                onBack={() => setSelectedDoc(null)}
                onRename={(newTitle) => {
                  setSelectedDoc((prev) => (prev ? { ...prev, title: newTitle } : null))
                  fetch(`${BACKEND_URL}/api/documents/${selectedDoc.id}`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${jwt}`,
                    },
                    body: JSON.stringify({ title: newTitle }),
                  }).catch(console.error)
                }}
              />
            </Suspense>
          ) : activeWorkspaceId ? (
            <DocumentDashboard
              workspaceId={activeWorkspaceId}
              token={jwt}
              serverUrl={BACKEND_URL}
              onSelectDocument={(doc) => setSelectedDoc(doc)}
              onRoleChange={(role) => setUserRole(role)}
              currentUser={user}
              onOpenDM={(user: any) => {
                setActiveWorkspaceId(null);
                setSelectedDoc(null);
                setActiveDmUserId(user.id);
                setActiveDmUser(user);
                setIsGlobalChatOpen(true);
              }}
            />
          ) : (
            <Home 
              workspaces={workspaces}
              user={user}
              onSelectWorkspace={(id) => setActiveWorkspaceId(id)}
              onCreateWorkspace={handleCreateWorkspace}
              onDeleteWorkspace={handleDeleteWorkspace}
              onRenameWorkspace={handleRenameWorkspace}
            />
          )}
          </div>
          {isGlobalChatOpen && (
            <GlobalChat
              token={jwt}
              serverUrl={BACKEND_URL}
              currentUser={user}
              onClose={() => {
                setIsGlobalChatOpen(false)
                setActiveDmUserId(null)
                setActiveDmUser(null)
              }}
              initialActiveUserId={activeDmUserId}
              initialActiveUser={activeDmUser}
            />
          )}
        </main>
        
        {activeWorkspaceId && user && (
          <PresentationBar
            socket={globalSocket}
            workspaceId={activeWorkspaceId}
            userId={user.id}
            userRole={userRole}
            currentDocumentId={selectedDoc?.id || ''}
            onNavigateToDocument={(docId) => {
              // We need to fetch the document to select it
              fetch(`${BACKEND_URL}/api/documents/${docId}`, {
                headers: { Authorization: `Bearer ${jwt}` }
              })
                .then(res => res.json())
                .then(data => {
                  if (data.document) {
                    setSelectedDoc(data.document);
                  }
                })
                .catch(console.error);
            }}
          />
        )}
      </div>
    )
  }

  // ── Anonymous/Authentication Mode ───────────────────────────────────────
  return (
    <div className="min-h-screen w-full flex bg-[#030305] text-slate-100 font-sans selection:bg-purple-500/30">
      
      {/* Left Panel - Visual/Brand (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0A0A0F] border-r border-white/5 items-center justify-center p-12">
        {/* Ambient background glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px] mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] mix-blend-screen pointer-events-none" />
        
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)] opacity-60" />

        <div className="relative z-10 w-full max-w-lg">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.4)] mb-8">
            <span className="font-extrabold text-white text-3xl tracking-tighter">N</span>
          </div>
          <h1 className="text-5xl font-bold text-white tracking-tight leading-[1.1] mb-6">
            Where intelligence meets <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">collaboration.</span>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed mb-12 max-w-md">
            Nexus Workspace combines real-time editing, dynamic knowledge bases, and AI agents into a single, unified environment for high-performing teams.
          </p>

          {/* Decorative glass card */}
          <div className="backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-2xl p-6 shadow-2xl flex items-start space-x-4 transform transition-all duration-700 hover:-translate-y-2 hover:bg-white/[0.04]">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">AI-Powered Insights</h3>
              <p className="text-xs text-white/50 leading-relaxed">Ask the integrated research agent questions and get synthesized answers instantly across your entire workspace.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative overflow-y-auto">
        {/* Mobile branding (visible only on small screens) */}
        <div className="absolute top-8 left-8 lg:hidden flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <span className="font-bold text-white text-sm">N</span>
          </div>
          <span className="font-semibold tracking-tight text-white/90">Nexus</span>
        </div>

        <div className="w-full max-w-[380px]">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-2">
              {isRegister ? 'Create an account' : 'Welcome back'}
            </h2>
            <p className="text-sm text-white/50">
              {isRegister ? 'Enter your details below to get started.' : 'Enter your credentials to access your workspace.'}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-5">
            {isRegister && (
              <>
                <div className="space-y-1.5 group">
                  <label className="text-[11px] font-semibold text-white/50 tracking-wider uppercase transition-colors group-focus-within:text-purple-400">Full Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 group">
                  <label className="text-[11px] font-semibold text-white/50 tracking-wider uppercase transition-colors group-focus-within:text-purple-400">Username</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-white/40 pointer-events-none">@</span>
                    <input
                      type="text"
                      required
                      placeholder="janedoe"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5 group">
              <label className="text-[11px] font-semibold text-white/50 tracking-wider uppercase transition-colors group-focus-within:text-purple-400">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300"
                />
              </div>
            </div>

            <div className="space-y-1.5 group">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-semibold text-white/50 tracking-wider uppercase transition-colors group-focus-within:text-purple-400">Password</label>
                {!isRegister && (
                  <a href="#" className="text-[11px] font-medium text-purple-400 hover:text-purple-300 transition-colors">Forgot password?</a>
                )}
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300"
                />
              </div>
            </div>

            {/* Status Messages */}
            <div className="min-h-[24px]">
              {error && (
                <div className="animate-in fade-in slide-in-from-top-1 text-[13px] font-medium text-red-400 flex items-center space-x-2 bg-red-400/10 px-3 py-2.5 rounded-lg border border-red-400/20">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="animate-in fade-in slide-in-from-top-1 text-[13px] font-medium text-emerald-400 flex items-center space-x-2 bg-emerald-400/10 px-3 py-2.5 rounded-lg border border-emerald-400/20">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span>{successMsg}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3.5 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:shadow-[0_0_30px_rgba(168,85,247,0.25)] hover:border-purple-500/30 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2 flex items-center justify-center"
            >
              {/* Animated gradient background on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <span className="relative z-10 flex items-center">
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white/80" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </>
                ) : isRegister ? (
                  'Create Account'
                ) : (
                  'Sign In'
                )}
              </span>
            </button>
          </form>

          {/* Toggle button */}
          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister)
                setError(null)
                setSuccessMsg(null)
              }}
              className="text-[13px] text-white/50 hover:text-white transition-colors duration-200"
            >
              {isRegister ? (
                <>Already have an account? <span className="text-purple-400 font-medium">Sign in</span></>
              ) : (
                <>Don't have an account? <span className="text-purple-400 font-medium">Sign up</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
