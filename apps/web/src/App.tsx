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
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 font-sans relative overflow-hidden">
      {/* Dynamic ambient backgrounds */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-purple-600/10 blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-indigo-600/10 blur-[128px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand identity header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-purple-500/40 mb-4 animate-bounce">
            <span className="font-extrabold text-white text-2xl tracking-tighter">N</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Nexus Workspace</h1>
          <p className="text-slate-400 text-sm mt-1">AI-Powered Multi-User Collaboration</p>
        </div>

        {/* Authentication Card */}
        <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl shadow-purple-900/10 transition-all duration-300">
          <h2 className="text-xl font-bold text-white mb-6">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h2>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-slate-950/80 border border-slate-850 focus:border-purple-500/80 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors duration-200 w-full"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Email Address</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-950/80 border border-slate-850 focus:border-purple-500/80 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors duration-200 w-full"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-950/80 border border-slate-850 focus:border-purple-500/80 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors duration-200 w-full"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-medium leading-relaxed">
                ⚠️ {error}
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-xl font-medium leading-relaxed">
                ✓ {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/20 w-full text-sm active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : isRegister ? (
                'Create Account'
              ) : (
                'Log In'
              )}
            </button>
          </form>

          {/* Toggle button */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister)
                setError(null)
                setSuccessMsg(null)
              }}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors duration-200 font-medium"
            >
              {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
