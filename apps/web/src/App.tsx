import { useState, useEffect, lazy, Suspense } from 'react'
import useSWR from 'swr'
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate, useOutletContext } from 'react-router-dom'
const CollaborativeEditor = lazy(() => import('./components/editor/CollaborativeEditor').then(m => ({ default: m.CollaborativeEditor })))
import { DocumentDashboard } from './components/dashboard/DocumentDashboard'
import { Home } from './components/home/Home'
import { WorkspaceLayout } from './components/layout/WorkspaceLayout'
import { NotificationsPage } from './pages/Notifications';
import { io, Socket } from 'socket.io-client';
import './App.css'

let BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'
if (BACKEND_URL && !BACKEND_URL.startsWith('http')) {
  BACKEND_URL = `https://${BACKEND_URL}`
}

import { stringToColor } from './utils/colors';

function DocumentEditorRoute({ user, jwt, serverUrl }: any) {
  const { workspaceId, documentId } = useParams<{ workspaceId: string; documentId: string }>();
  const navigate = useNavigate();
  const { userRole, globalSocket } = useOutletContext<any>();
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!documentId) return;
    setLoading(true);
    fetch(`${serverUrl}/api/documents/${documentId}`, {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.document) setDoc(data.document);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [documentId, jwt, serverUrl]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!doc) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50" />
        <div className="relative z-10 flex flex-col items-center max-w-md text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-500/20 to-orange-500/20 flex items-center justify-center mb-6 border border-rose-500/20 shadow-[0_0_40px_rgba(244,63,94,0.1)]">
            <svg className="w-10 h-10 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3 tracking-tight">Document Not Found</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            The document you're looking for doesn't exist, has been deleted, or you don't have permission to view it.
          </p>
          <button
            onClick={() => navigate(`/w/${workspaceId}`)}
            className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Workspace</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
      <CollaborativeEditor
        key={documentId}
        documentId={documentId!}
        userId={user.id}
        userName={user.name}
        userColor={user.color}
        token={jwt}
        serverUrl={serverUrl}
        documentTitle={doc.title}
        documentType={doc.type}
        initialContent={doc.textContent}
        readOnly={userRole === 'VIEWER'}
        globalSocket={globalSocket}
        workspaceId={workspaceId}
        userRole={userRole}
        onBack={() => navigate(`/w/${workspaceId}`)}
      />
    </Suspense>
  );
}

function AuthenticatedApp({ user, setUser, jwt, setJwt }: any) {
  const [globalSocket, setGlobalSocket] = useState<Socket | null>(null);

  const fetcher = async ([url, token]: [string, string]) => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to fetch')
    return data
  }

  const { data: workspacesData, mutate: mutateWorkspaces } = useSWR(
    [`${BACKEND_URL}/api/workspaces`, jwt],
    fetcher
  )
  const workspaces = workspacesData?.workspaces || []

  useEffect(() => {
    if (workspacesData && workspacesData.workspaces?.length === 0) {
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
          if (res.ok) mutateWorkspaces()
        } catch (err) {
          console.error(err)
        }
      }
      createDefault()
    }
  }, [workspacesData, jwt, user, mutateWorkspaces])

  useEffect(() => {
    const socket = io(BACKEND_URL, {
      auth: { token: jwt },
      transports: ['websocket']
    });
    setGlobalSocket(socket);
    return () => { socket.disconnect(); };
  }, [jwt]);

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
      if (res.ok) mutateWorkspaces()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteWorkspace = async (id: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/workspaces/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwt}` },
      })
      if (res.ok) mutateWorkspaces()
    } catch (err) {
      console.error(err)
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
      if (res.ok) mutateWorkspaces()
    } catch (err) {
      console.error(err)
    }
  }

  const handleLogout = () => {
    setJwt(null)
    setUser(null)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <Home 
            workspaces={workspaces}
            user={user}
            onCreateWorkspace={handleCreateWorkspace}
            onDeleteWorkspace={handleDeleteWorkspace}
            onRenameWorkspace={handleRenameWorkspace}
          />
        } />
        
        <Route path="/join/:token" element={
          <JoinWorkspace 
            token={jwt}
            serverUrl={BACKEND_URL}
          />
        } />
        
        <Route path="/notifications" element={
          <NotificationsPage 
            jwt={jwt} 
            serverUrl={BACKEND_URL}
            onLogout={handleLogout}
            user={user}
          />
        } />
        
        <Route path="/w/:workspaceId" element={
          <WorkspaceLayout 
            user={user}
            jwt={jwt}
            serverUrl={BACKEND_URL}
            workspaces={workspaces}
            mutateWorkspaces={mutateWorkspaces}
            onLogout={handleLogout}
            globalSocket={globalSocket}
          />
        }>
          <Route index element={
            <DocumentDashboard 
              token={jwt}
              serverUrl={BACKEND_URL}
            />
          } />
          <Route path="trash" element={
            <DocumentDashboard 
              token={jwt}
              serverUrl={BACKEND_URL}
              isTrashRoute={true}
            />
          } />
          <Route path="d/:documentId" element={
            <DocumentEditorRoute 
              user={user}
              jwt={jwt}
              serverUrl={BACKEND_URL}
            />
          } />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}


import { JoinWorkspace } from './components/dashboard/JoinWorkspace';

export default function App() {
  const [jwt, setJwt] = useState<string | null>(() => localStorage.getItem('nexus_jwt'))
  const [user, setUser] = useState<{ id: string; email: string; name: string; username?: string; color: string } | null>(() => {
    const stored = localStorage.getItem('nexus_user')
    return stored ? JSON.parse(stored) : null
  })

  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (jwt) localStorage.setItem('nexus_jwt', jwt)
    else localStorage.removeItem('nexus_jwt')
  }, [jwt])

  useEffect(() => {
    if (user) localStorage.setItem('nexus_user', JSON.stringify(user))
    else localStorage.removeItem('nexus_user')
  }, [user])

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Something went wrong')

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
          color: stringToColor(data.user.id),
        })
        setLoading(false)
      }
    } catch (err: any) {
      setError(err.message || 'Server connection failed')
      setLoading(false)
    }
  }

  if (jwt && user) {
    return <AuthenticatedApp user={user} setUser={setUser} jwt={jwt} setJwt={setJwt} />
  }

  // Anonymous Mode (Login/Register Form)
  return (
    <div className="min-h-screen w-full flex bg-[#030305] text-slate-100 font-sans selection:bg-purple-500/30">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0A0A0F] border-r border-white/5 items-center justify-center p-12">
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

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative overflow-y-auto">
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
