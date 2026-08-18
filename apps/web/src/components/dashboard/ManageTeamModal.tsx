import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X, UserPlus, Trash2 } from 'lucide-react';

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

  // Link Invite State
  const [linkRole, setLinkRole] = useState<'EDITOR' | 'VIEWER'>('VIEWER');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (inviteQuery.length >= 2 && !selectedUser) {
        fetch(`${serverUrl}/api/users/search?q=${encodeURIComponent(inviteQuery)}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => setSearchResults(data.users || []))
          .catch(() => {});
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [inviteQuery, serverUrl, token, selectedUser]);

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      fetchMembers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleGenerateLink = async () => {
    setGeneratingLink(true);
    setError(null);
    try {
      const res = await fetch(`${serverUrl}/api/workspaces/${workspaceId}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ defaultRole: linkRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate link');
      
      const inviteUrl = `${window.location.origin}/join/${data.token}`;
      setGeneratedLink(inviteUrl);
      // Optional: auto-copy to clipboard
      try {
        await navigator.clipboard.writeText(inviteUrl);
      } catch (_err) {
        // ignore clipboard error
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingLink(false);
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

  const handleRemoveMember = async (memberId: string) => {
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
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      {/* We apply a wrapper styling to ensure correct overlay rendering using standard Shadcn */}
      <DialogContent className="sm:max-w-[720px] p-0 overflow-hidden bg-card border-border shadow-xl rounded-2xl">
        <DialogHeader className="px-6 md:px-8 py-6 border-b border-border/50 bg-muted/10">
          <DialogTitle className="text-2xl tracking-tight font-semibold text-foreground">Workspace Team</DialogTitle>
          <DialogDescription className="text-sm mt-1.5 text-muted-foreground">
            Invite colleagues to collaborate or manage existing members in this workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 md:p-8 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
              {error}
            </div>
          )}

          {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && (
            <div className="mb-8 pb-8 border-b border-border/50">
              <h3 className="text-base font-semibold text-foreground mb-1">Invite New Members</h3>
              <p className="text-sm text-muted-foreground mb-4">Add people by their email or username to give them access.</p>
              <form onSubmit={handleInvite} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex-1 w-full relative">
                  {selectedUser ? (
                    <div className="w-full bg-background border border-primary text-sm rounded-md px-3 py-2 flex items-center justify-between shadow-sm h-10">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold uppercase">
                          {(selectedUser.name || selectedUser.username || selectedUser.email)[0]}
                        </div>
                        <span className="font-medium text-foreground truncate max-w-[150px]">
                          {selectedUser.name || selectedUser.username || selectedUser.email}
                        </span>
                      </div>
                      <button type="button" onClick={() => { setSelectedUser(null); setInviteQuery(''); }} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1 rounded transition-colors" aria-label="Clear user">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search username or email..."
                        value={inviteQuery}
                        onChange={(e) => setInviteQuery(e.target.value)}
                        className="pl-9 h-10 bg-background"
                      />
                    </div>
                  )}
                  
                  {!selectedUser && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto p-1">
                      {searchResults.map((u) => (
                        <div 
                          key={u.id}
                          onClick={() => setSelectedUser(u)}
                          className="px-3 py-2 hover:bg-muted cursor-pointer flex items-center justify-between rounded-md transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium uppercase text-sm">
                              {(u.name || u.username || u.email)[0]}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground">{u.name || u.username || u.email.split('@')[0]}</span>
                              <span className="text-xs text-muted-foreground">{u.username ? `@${u.username}` : u.email}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex w-full sm:w-auto items-center gap-3">
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="flex h-10 w-full sm:w-[120px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    aria-label="Select role"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="EDITOR">Editor</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                  
                  <Button type="submit" disabled={inviting || (!selectedUser && !inviteQuery.includes('@'))} className="h-10 w-full sm:w-auto shadow-sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    {inviting ? 'Inviting...' : 'Invite'}
                  </Button>
                </div>
              </form>
              
              {/* Link Invite Section */}
              <div className="mt-6 pt-6 border-t border-border/50">
                <h3 className="text-sm font-semibold text-foreground mb-1">Invite via Link</h3>
                <p className="text-xs text-muted-foreground mb-3">Generate a secure link to invite multiple people at once.</p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <select
                    value={linkRole}
                    onChange={(e) => setLinkRole(e.target.value as any)}
                    className="flex h-9 w-full sm:w-[120px] items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    aria-label="Select link role"
                  >
                    <option value="EDITOR">Editor</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                  
                  <Button 
                    type="button" 
                    variant="secondary"
                    onClick={handleGenerateLink}
                    disabled={generatingLink} 
                    className="h-9 w-full sm:w-auto text-sm"
                  >
                    {generatingLink ? 'Generating...' : 'Generate & Copy Link'}
                  </Button>
                </div>
                
                {generatedLink && (
                  <div className="mt-3 flex items-center justify-between gap-2 p-2 bg-muted/30 border border-border/50 rounded text-sm">
                    <span className="truncate text-muted-foreground select-all">{generatedLink}</span>
                    <Badge variant="outline" className="text-[10px] uppercase shrink-0">Copied!</Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-base font-semibold text-foreground mb-4">Existing Members ({members.length})</h3>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-1">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/40 border border-transparent hover:border-border/50 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-semibold uppercase text-sm shrink-0 border border-border/50">
                        {(member.user.name || member.user.username || member.user.email)[0]}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-foreground truncate">
                          {member.user.name || member.user.username || member.user.email.split('@')[0]}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">{member.user.email}</span>
                      </div>
                      {member.status === 'PENDING' && (
                        <Badge variant="secondary" className="ml-2 text-[10px] uppercase font-bold py-0.5 shrink-0">Pending</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0 pl-4">
                      {member.role === 'OWNER' ? (
                        <span className="text-sm text-muted-foreground font-medium px-3 py-1">Owner</span>
                      ) : (
                        <>
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                            disabled={currentUserRole !== 'OWNER' && currentUserRole !== 'ADMIN'}
                            className="text-sm bg-transparent border border-border/50 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 hover:bg-muted/50 transition-colors"
                            aria-label={`Change role for ${member.user.email}`}
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="EDITOR">Editor</option>
                            <option value="VIEWER">Viewer</option>
                          </select>
                          
                          {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && (
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-2 rounded-md opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                              title="Remove member"
                              aria-label="Remove member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
