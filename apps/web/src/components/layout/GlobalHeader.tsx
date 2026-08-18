import React from 'react';
import { MessageCircle, PanelLeft, Activity } from 'lucide-react';
import { NotificationBell } from '../ui/NotificationBell';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';

interface GlobalHeaderProps {
  workspaces: any[];
  activeWorkspaceId: string | null;
  user: any;
  jwt: string | null;
  serverUrl: string;
  onLogout: () => void;
  onWorkspaceChange: (id: string) => void;
  mutateWorkspaces: (data: any, shouldRevalidate?: boolean) => void;
  togglePanel: (panel: 'workspaceChat' | 'globalChat' | 'ai' | 'tasks' | 'activity' | null) => void;
  activePanel: 'workspaceChat' | 'globalChat' | 'ai' | 'tasks' | 'activity' | null;
  isMainSidebarOpen: boolean;
  setIsMainSidebarOpen: (isOpen: boolean) => void;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  workspaces,
  activeWorkspaceId,
  user,
  jwt,
  serverUrl,
  onLogout,
  onWorkspaceChange,
  mutateWorkspaces,
  togglePanel,
  activePanel,
  isMainSidebarOpen,
  setIsMainSidebarOpen,
}) => {
  const navigate = useNavigate();

  const handleWorkspaceSelect = (id: string) => {
    onWorkspaceChange(id);
    if (id) {
      navigate(`/w/${id}`);
    } else {
      navigate('/');
    }
  };

  const activeWorkspace = workspaces.find((w: any) => w.id === activeWorkspaceId);

  return (
    <header className="flex justify-between items-center px-6 py-3.5 bg-card/60 border-b border-border/60 backdrop-blur-md shrink-0 relative z-20 shadow-sm">
      <div className="flex items-center space-x-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMainSidebarOpen(!isMainSidebarOpen)}
          className={`h-8 w-8 transition-colors ${isMainSidebarOpen ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
          aria-label="Toggle Sidebar"
          title="Toggle Sidebar"
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
        <button 
          onClick={() => handleWorkspaceSelect('')}
          className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="Home"
        >
          <span className="font-bold text-background text-base">N</span>
        </button>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => handleWorkspaceSelect('')}
            className="font-semibold text-base tracking-tight text-foreground hover:text-tint-orange transition-colors"
          >
            Nexus
          </button>
          
          {activeWorkspace && (
            <>
              <span className="text-muted-foreground">/</span>
              <select
                value={activeWorkspaceId || ''}
                onChange={(e) => handleWorkspaceSelect(e.target.value)}
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

      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Global Search Trigger */}
        <div className="hidden md:flex relative w-full max-w-64 min-w-[120px] items-center">
          <svg className="absolute left-3 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            className="w-full text-left bg-muted/40 border border-border/50 rounded-md pl-9 pr-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/60 transition-all cursor-text flex items-center justify-between shadow-sm"
          >
            <span>Search...</span>
            <kbd className="hidden lg:inline-flex items-center gap-1 rounded bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground shadow-sm">
              ⌘K
            </kbd>
          </button>
        </div>

        <button
          onClick={() => togglePanel('activity')}
          className={`p-2 rounded-full transition-colors relative ${
            activePanel === 'activity'
              ? 'bg-primary/20 text-primary' 
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
          }`}
          title="Workspace Activity"
          aria-label="Workspace Activity"
        >
          <Activity size={18} />
        </button>

        <button
          onClick={() => togglePanel('globalChat')}
          className={`p-2 rounded-full transition-colors relative ${
            activePanel === 'globalChat'
              ? 'bg-primary/20 text-primary' 
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
          }`}
          title="Direct Messages"
          aria-label="Direct Messages"
        >
          <MessageCircle size={18} />
        </button>
        
        <NotificationBell 
          jwt={jwt || ''} 
          serverUrl={serverUrl} 
          onInvitationAccepted={() => mutateWorkspaces({}, true)} 
          onWorkspaceRemoved={(removedId: string) => {
            mutateWorkspaces({ workspaces: workspaces.filter((w: any) => w.id !== removedId) }, false);
            if (activeWorkspaceId === removedId) {
              handleWorkspaceSelect('');
            }
          }}
        />
        
        <div className="flex items-center space-x-2 bg-muted/40 border border-border/50 px-3 py-1.5 rounded-full shrink-0">
          <span 
            className="w-2.5 h-2.5 rounded-full border border-background shrink-0" 
            style={{ backgroundColor: user.color }} 
          />
          <span className="hidden sm:inline text-xs font-medium text-foreground truncate max-w-[100px]">{user.name}</span>
        </div>

        <button
          onClick={onLogout}
          className="text-xs bg-muted/40 hover:bg-tint-red/10 hover:text-tint-red text-muted-foreground border border-border/50 p-2 sm:px-3 sm:py-1.5 rounded-md transition-all duration-200 shrink-0 flex items-center"
          title="Log Out"
        >
          <span className="hidden sm:inline">Log Out</span>
          <svg className="w-4 h-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
};
