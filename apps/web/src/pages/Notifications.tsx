import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CheckCircle2, ChevronLeft, Inbox, Archive, UserPlus, CheckSquare, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UnifiedNotification {
  kind: 'invite' | 'notification';
  id: string;
  type?: string;
  title?: string;
  message?: string;
  readAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  actorName?: string | null;
  workspaceId?: string | null;
  workspaceName?: string | null;
  documentId?: string | null;
  taskId?: string | null;
}

interface NotificationsPageProps {
  jwt: string;
  serverUrl: string;
  onLogout?: () => void;
  user: any;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ jwt, serverUrl }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'inbox' | 'done'>('inbox');
  const [items, setItems] = useState<UnifiedNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, [activeTab]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const endpoint = activeTab === 'inbox' ? '/api/notifications' : '/api/notifications/done';
      const res = await fetch(`${serverUrl}${endpoint}?limit=100`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
      } else {
        setError(data.error || 'Failed to load notifications');
      }
    } catch (err) {
      console.error(err);
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      setItems(prev => prev.map(item => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
      await fetch(`${serverUrl}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${jwt}` },
      });
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleArchive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      setItems(prev => prev.filter(item => item.id !== id));
      await fetch(`${serverUrl}/api/notifications/${id}/archive`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${jwt}` },
      });
    } catch (err) {
      console.error('Failed to archive', err);
      fetchNotifications();
    }
  };

  const handleArchiveAll = async () => {
    if (items.length === 0) return;
    try {
      setItems([]);
      await fetch(`${serverUrl}/api/notifications/archive-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${jwt}` },
      });
    } catch (err) {
      console.error('Failed to archive all', err);
      fetchNotifications();
    }
  };

  const handleAccept = async (e: React.MouseEvent, workspaceId: string, inviteId: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${serverUrl}/api/invitations/${workspaceId}/accept`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (res.ok) {
        setItems(prev => prev.filter(item => item.id !== inviteId));
      }
    } catch (err) {
      console.error('Failed to accept', err);
    }
  };

  const handleDecline = async (e: React.MouseEvent, workspaceId: string, inviteId: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${serverUrl}/api/invitations/${workspaceId}/decline`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (res.ok) {
        setItems(prev => prev.filter(item => item.id !== inviteId));
      }
    } catch (err) {
      console.error('Failed to decline', err);
    }
  };

  const handleItemClick = (item: UnifiedNotification) => {
    if (item.kind === 'notification' && !item.readAt) {
      handleMarkAsRead(item.id);
    }
    
    if (item.kind === 'invite') {
      // Nothing for invites, wait for button click
    } else if (item.workspaceId) {
      if (item.documentId) {
        navigate(`/w/${item.workspaceId}/d/${item.documentId}`);
      } else {
        navigate(`/w/${item.workspaceId}`);
      }
    }
  };

  const renderIcon = (item: UnifiedNotification) => {
    if (item.kind === 'invite') return <UserPlus className="text-primary w-5 h-5" />;
    if (item.type === 'TASK_ASSIGNED') return <CheckSquare className="text-orange-500 w-5 h-5" />;
    return <FileText className="text-muted-foreground w-5 h-5" />;
  };

  const groupedItems = items.reduce((acc, item) => {
    const key = item.workspaceName || 'Nexus';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, UnifiedNotification[]>);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card flex items-center px-4 shrink-0 sticky top-0 z-10">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 -ml-2 mr-2 text-muted-foreground hover:text-foreground rounded-md transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="font-semibold text-foreground">Notifications</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'inbox' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
            >
              <Inbox size={18} />
              Inbox
            </button>
            <button
              onClick={() => setActiveTab('done')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'done' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
            >
              <Archive size={18} />
              Done
            </button>
          </nav>
        </aside>

        {/* Notifications List */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {activeTab === 'inbox' ? 'Inbox' : 'Done'}
            </h2>
            {activeTab === 'inbox' && items.length > 0 && (
              <button
                onClick={handleArchiveAll}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-primary/5"
              >
                <CheckCircle2 size={16} /> Mark all as done
              </button>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden min-h-[400px]">
            {isLoading ? (
              <div className="p-8 space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="flex gap-4 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                    <div className="flex-1 space-y-2 py-2">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                <span className="text-2xl mb-4">⚠️</span>
                <p>{error}</p>
                <button onClick={fetchNotifications} className="mt-4 px-4 py-2 bg-primary/10 text-primary font-medium rounded-md hover:bg-primary/20 transition-colors">Retry</button>
              </div>
            ) : items.length === 0 ? (
              <div className="p-16 text-center text-muted-foreground flex flex-col items-center">
                {activeTab === 'inbox' ? (
                  <>
                    <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium text-foreground">You're all caught up.</p>
                    <p className="text-sm mt-1">No new notifications.</p>
                  </>
                ) : (
                  <>
                    <Archive className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium text-foreground">No completed notifications yet.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {Object.entries(groupedItems).map(([workspaceName, workspaceItems]) => (
                  <div key={workspaceName} className="flex flex-col">
                    <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center text-xs font-bold text-muted-foreground uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
                      {workspaceName}
                    </div>
                    <ul className="divide-y divide-border/50">
                      {workspaceItems.map((item) => {
                        const isUnread = activeTab === 'inbox' && (item.kind === 'invite' || !item.readAt);
                        return (
                          <li 
                            key={item.id}
                            onClick={() => handleItemClick(item)}
                            className={`group flex items-start p-4 cursor-pointer transition-colors ${isUnread ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'}`}
                          >
                            <div className="shrink-0 pt-1 pr-4">
                              <div className={`w-10 h-10 flex items-center justify-center rounded-full ${isUnread ? 'bg-background shadow-sm border border-border/50' : 'bg-transparent'}`}>
                                {renderIcon(item)}
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0 pr-4">
                              {item.kind === 'invite' ? (
                                <div>
                                  <p className="text-sm text-foreground">
                                    You've been invited to join <span className="font-semibold">{item.workspaceName}</span>.
                                  </p>
                                  {activeTab === 'inbox' && (
                                    <div className="flex gap-2 mt-3">
                                      <button
                                        onClick={(e) => handleAccept(e, item.workspaceId!, item.id)}
                                        className="text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-1.5 rounded-md transition-colors shadow-sm"
                                      >
                                        Accept
                                      </button>
                                      <button
                                        onClick={(e) => handleDecline(e, item.workspaceId!, item.id)}
                                        className="text-xs font-medium bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-1.5 rounded-md transition-colors"
                                      >
                                        Decline
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <p className={`text-sm leading-relaxed ${isUnread ? 'text-foreground font-medium' : 'text-foreground/80'}`}>
                                    {item.actorName && <span className="font-semibold text-foreground">{item.actorName} </span>}
                                    {item.message || item.title}
                                  </p>
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground mt-1.5">
                                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                              </p>
                            </div>

                            <div className="shrink-0 flex items-center justify-end w-12 gap-2 relative h-10">
                              {isUnread && (
                                <div className="w-2 h-2 rounded-full bg-primary absolute right-3 top-1/2 -translate-y-1/2 transition-opacity group-hover:opacity-0" />
                              )}
                              {activeTab === 'inbox' && item.kind === 'notification' && (
                                <button
                                  onClick={(e) => handleArchive(e, item.id)}
                                  className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all opacity-0 group-hover:opacity-100 absolute right-1 top-1/2 -translate-y-1/2 focus:opacity-100"
                                  aria-label="Mark as done"
                                  title="Mark as done"
                                >
                                  <Check size={18} />
                                </button>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
