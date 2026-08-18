import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface JoinWorkspaceProps {
  token: string | null;
  serverUrl: string;
}

export const JoinWorkspace: React.FC<JoinWorkspaceProps> = ({ token: jwtToken, serverUrl }) => {
  const { token: inviteToken } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ workspaceName: string; ownerName: string } | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!inviteToken) {
      setError('Invalid invite link.');
      setLoading(false);
      return;
    }

    const fetchPreview = async () => {
      try {
        const res = await fetch(`${serverUrl}/api/workspaces/invites/preview/${inviteToken}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load invite');
        setPreview(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [inviteToken, serverUrl]);

  const handleJoin = async () => {
    if (!jwtToken) {
      // User is not logged in, they need to log in first and then return here.
      // We can store the intended destination in sessionStorage.
      sessionStorage.setItem('nexus_redirect_after_login', `/join/${inviteToken}`);
      navigate('/');
      return;
    }

    setJoining(true);
    setError(null);
    try {
      const res = await fetch(`${serverUrl}/api/workspaces/invites/${inviteToken}/join`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join workspace');
      
      // Successfully joined
      navigate(`/w/${data.workspaceId}`);
    } catch (err: any) {
      setError(err.message);
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full min-h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-muted-foreground text-sm font-medium">Loading invite...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full min-h-screen bg-background p-6">
        <div className="max-w-md w-full bg-card border border-border/50 rounded-2xl shadow-xl p-8 text-center relative overflow-hidden">
           <div className="absolute top-0 left-0 right-0 h-1 bg-destructive/80"></div>
           <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-6">
             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
           </div>
           <h2 className="text-xl font-bold text-foreground mb-3">Invite Invalid</h2>
           <p className="text-muted-foreground mb-8 text-sm">{error}</p>
           <Button onClick={() => navigate('/')} variant="outline" className="w-full">
             Go to Dashboard
           </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full min-h-screen bg-background p-6 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-30" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50 mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl opacity-50 mix-blend-screen pointer-events-none" />

      <div className="max-w-md w-full bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-8 text-center relative z-10">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-indigo-500/20 border border-primary/20 flex items-center justify-center mx-auto mb-6 shadow-inner">
          <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight mb-2">You've been invited!</h2>
        <p className="text-muted-foreground mb-8 leading-relaxed text-sm">
          <strong className="text-foreground">{preview?.ownerName}</strong> has invited you to join the workspace <strong className="text-foreground">"{preview?.workspaceName}"</strong>.
        </p>

        <div className="space-y-4">
          <Button onClick={handleJoin} disabled={joining} className="w-full py-6 text-base font-medium shadow-lg shadow-primary/20">
            {joining ? 'Joining Workspace...' : jwtToken ? 'Join Workspace' : 'Log in to Join'}
          </Button>
          <Button onClick={() => navigate('/')} variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
