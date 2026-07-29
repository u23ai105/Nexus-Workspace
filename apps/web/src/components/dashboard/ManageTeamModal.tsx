import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string | null;
  username?: string | null;
  email: string;
}

interface WorkspaceMember {
  id: string;
  role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  userId: string;
  workspaceId: string;
  user: User;
}

interface ManageTeamModalProps {
  workspaceId: string;
  token: string;
  serverUrl: string;
  onClose: () => void;
  currentUserRole?: string;
}

export const ManageTeamModal: React.FC<ManageTeamModalProps> = ({
  workspaceId,
  token,
  serverUrl,
  onClose,
  currentUserRole = 'VIEWER',
}) => {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'EDITOR' | 'VIEWER'>('VIEWER');
  const [inviting, setInviting] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (inviteQuery.length >= 2 && !selectedUser) {
        fetch(`${serverUrl}/api/users/search?q=${encodeURIComponent(inviteQuery)}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => {
            setSearchResults(data.users || []);
          })
          .catch(() => {});
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [inviteQuery, serverUrl, token, selectedUser]);

  useEffect(() => {
    fetchMembers();
  }, [workspaceId]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${serverUrl}/api/workspaces/${workspaceId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load members');
      setMembers(data.members || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = selectedUser ? selectedUser.email : inviteQuery.trim();
    if (!targetEmail) return;
    
    setInviting(true);
    setError(null);
    try {
      const res = await fetch(`${serverUrl}/api/workspaces/${workspaceId}/members/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: targetEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to invite user');
      
      setInviteQuery('');
      setSelectedUser(null);
      setSearchResults([]);
      fetchMembers(); // refresh
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch(`${serverUrl}/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update role');
      }
      fetchMembers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      const res = await fetch(`${serverUrl}/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove member');
      }
      fetchMembers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card w-full max-w-2xl rounded-xl border border-border shadow-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Manage Team</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm px-4 py-3 rounded-md mb-6">
              {error}
            </div>
          )}

          {/* Invite Section */}
          {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && (
          <div className="mb-8 p-5 rounded-lg border border-border bg-muted/20">
            <h3 className="text-sm font-medium text-foreground mb-3">Invite new members</h3>
            <form onSubmit={handleInvite} className="flex items-start gap-3">
              <div className="flex-1 relative">
                {selectedUser ? (
                  <div className="w-full bg-background border border-primary text-sm rounded-md px-3 py-2 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold uppercase">
                        {(selectedUser.name || selectedUser.username || selectedUser.email)[0]}
                      </div>
                      <span className="font-medium text-foreground">{selectedUser.name || selectedUser.username || selectedUser.email}</span>
                      {selectedUser.username && <span className="text-muted-foreground">@{selectedUser.username}</span>}
                    </div>
                    <button type="button" onClick={() => { setSelectedUser(null); setInviteQuery(''); }} className="text-muted-foreground hover:text-destructive transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Search by username or enter email..."
                    value={inviteQuery}
                    onChange={(e) => setInviteQuery(e.target.value)}
                    className="w-full bg-background border border-border focus:border-primary text-sm rounded-md px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all shadow-sm"
                  />
                )}
                
                {!selectedUser && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                    {searchResults.map((u) => (
                      <div 
                        key={u.id}
                        onClick={() => setSelectedUser(u)}
                        className="px-3 py-2 hover:bg-muted/50 cursor-pointer flex items-center justify-between border-b border-border/50 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium uppercase">
                            {(u.name || u.username || u.email)[0]}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">{u.name || u.username || u.email.split('@')[0]}</span>
                            {u.username ? (
                              <span className="text-xs text-muted-foreground">@{u.username}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">{u.email}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="bg-background border border-border text-sm rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
              >
                <option value="ADMIN">Admin</option>
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <button
                type="submit"
                disabled={inviting || (!selectedUser && !inviteQuery.includes('@'))}
                className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-6 py-2 rounded-md transition-all shadow-sm disabled:opacity-50"
              >
                {inviting ? 'Sending...' : 'Invite'}
              </button>
            </form>
          </div>
          )}

          {/* Members List */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-4">Workspace Members ({members.length})</h3>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-md hover:bg-muted/30 border border-transparent hover:border-border transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground flex items-center gap-2">
                          {member.user.name || 'Anonymous User'}
                          {member.status === 'PENDING' && (
                            <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">Pending</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.user.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {/* Role badge with color */}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        member.role === 'OWNER' ? 'bg-orange-500/20 text-orange-400' :
                        member.role === 'ADMIN' ? 'bg-blue-500/20 text-blue-400' :
                        member.role === 'EDITOR' ? 'bg-green-500/20 text-green-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {member.role}
                      </span>
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                        disabled={
                          (member.role as string) === 'OWNER' || 
                          (currentUserRole === 'ADMIN' && ((member.role as string) === 'OWNER' || (member.role as string) === 'ADMIN')) ||
                          (currentUserRole !== 'OWNER' && currentUserRole !== 'ADMIN')
                        }
                        className="bg-card border border-border text-xs rounded-md px-2 py-1 text-foreground focus:outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="OWNER">Owner</option>
                        <option value="ADMIN">Admin</option>
                        <option value="EDITOR">Editor</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                      
                      <button
                        onClick={() => handleRemove(member.id)}
                        disabled={
                          (member.role as string) === 'OWNER' ||
                          (currentUserRole === 'ADMIN' && ((member.role as string) === 'OWNER' || (member.role as string) === 'ADMIN')) ||
                          (currentUserRole !== 'OWNER' && currentUserRole !== 'ADMIN')
                        }
                        className="text-muted-foreground hover:text-destructive p-1.5 rounded-md hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                        title="Remove member"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
