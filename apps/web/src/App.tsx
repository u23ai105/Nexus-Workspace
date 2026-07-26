import { useState, useEffect } from 'react'
import { CollaborativeEditor } from './components/editor/CollaborativeEditor'
import './App.css'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

// Get random color HSL for visual cursor uniqueness
function getRandomColor() {
  return `hsl(${Math.floor(Math.random() * 360)}, 85%, 60%)`
}

export default function App() {
  // Authentication states
  const [jwt, setJwt] = useState<string | null>(() => localStorage.getItem('nexus_jwt'))
  const [user, setUser] = useState<{ id: string; email: string; name: string; color: string } | null>(() => {
    const stored = localStorage.getItem('nexus_user')
    return stored ? JSON.parse(stored) : null
  })

  // Form states
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

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

  const handleLogout = () => {
    setJwt(null)
    setUser(null)
    setError(null)
    setSuccessMsg(null)
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)
    setLoading(true)

    const endpoint = isRegister ? '/auth/register' : '/auth/login'
    const body = isRegister 
      ? { email, password, name: name || undefined } 
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
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
        {/* Navigation / Header */}
        <header className="flex justify-between items-center px-6 py-4 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <span className="font-bold text-white text-base">N</span>
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white">Nexus Workspace</h1>
              <p className="text-[10px] text-slate-400 font-medium">Real-Time Rich Text Editor</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-800/80 px-3 py-1.5 rounded-full">
              <span 
                className="w-2.5 h-2.5 rounded-full border border-white/20" 
                style={{ backgroundColor: user.color }} 
              />
              <span className="text-xs font-semibold text-slate-200">{user.name}</span>
            </div>

            <button
              onClick={handleLogout}
              className="text-xs bg-slate-800/60 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 text-slate-300 border border-slate-700/50 px-3 py-1.5 rounded-lg transition-all duration-200"
            >
              Log Out
            </button>
          </div>
        </header>

        {/* Editor Body */}
        <main className="flex-1 overflow-hidden relative">
          <CollaborativeEditor
            documentId="nexus-shared-doc-1"
            userId={user.id}
            userName={user.name}
            userColor={user.color}
            token={jwt}
            serverUrl={BACKEND_URL}
            documentTitle="💡 Collaborative Knowledge Base"
          />
        </main>
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
