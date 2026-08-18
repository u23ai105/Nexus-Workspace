import React, { useState, useEffect } from 'react';
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import { GlobalHeader } from './GlobalHeader';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { useContainerSize } from '@/hooks/useContainerSize';
import { WorkspaceChat } from '../dashboard/WorkspaceChat';
import { TasksSidebar } from '../dashboard/TasksSidebar';
import { WorkspaceAIChat } from '../dashboard/WorkspaceAIChat';
import { ManageTeamModal } from '../dashboard/ManageTeamModal';
import { Button } from '../ui/button';
import { X } from 'lucide-react';
import useSWR from 'swr';
import { Socket } from 'socket.io-client';
import { CommandPalette } from '../ui/CommandPalette';
import { GlobalChat } from '../chat/GlobalChat';
import { ActivitySidebar } from '../dashboard/ActivitySidebar';
import { ActiveDocumentProvider } from '../../contexts/ActiveDocumentContext';

export type ActivePanel = 'workspaceChat' | 'globalChat' | 'ai' | 'tasks' | 'activity' | null;

interface WorkspaceLayoutProps {
  user: any;
  jwt: string;
  serverUrl: string;
  workspaces: any[];
  mutateWorkspaces: (data: any, shouldRevalidate?: boolean) => void;
  onLogout: () => void;
  globalSocket: Socket | null;
}

const WorkspaceLayoutInner: React.FC<WorkspaceLayoutProps> = ({
  user,
  jwt,
  serverUrl,
  workspaces,
  mutateWorkspaces,
  onLogout,
  globalSocket,
}) => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const documentIdMatch = location.pathname.match(/\/d\/([^\/]+)/);
  const documentId = documentIdMatch ? documentIdMatch[1] : undefined;
  
  const [isMainSidebarOpen, setIsMainSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [containerRef, containerWidth] = useContainerSize();
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [userRole, setUserRole] = useState<string>('OWNER');

  const fetcher = async ([url, token]: [string, string]) => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch');
    return data;
  };

  // Fetch role for this workspace
  const { data: roleData } = useSWR(
    workspaceId && jwt ? [`${serverUrl}/api/workspaces/${workspaceId}/role`, jwt] : null,
    fetcher
  );

  useEffect(() => {
    if (roleData?.role) {
      setUserRole(roleData.role);
    }
  }, [roleData]);

  useEffect(() => {
    // We only have 1 panel max now, no need to truncate activePanels
  }, [containerWidth]);

  const togglePanel = (panel: ActivePanel) => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  const closePanel = () => {
    setActivePanel(null);
  };

  const handleCreateDocument = async (type: 'TEXT' | 'CANVAS' = 'TEXT') => {
    if (isCreating || !workspaceId) return;
    setIsCreating(true);
    try {
      const res = await fetch(`${serverUrl}/api/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ workspaceId, type, folderId: null }),
      });
      const data = await res.json();
      if (res.ok && data.document) {
        navigate(`/w/${workspaceId}/d/${data.document.id}`);
      } else {
        alert(data.error || 'Failed to create document');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating document');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!workspaceId) return;
    const name = prompt('Enter folder name:');
    if (!name) return;
    
    try {
      const res = await fetch(`${serverUrl}/api/workspaces/${workspaceId}/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`
        },
        body: JSON.stringify({ name, parentId: null })
      });
      // Will mutate folders in dashboard context, but this triggers a global creation
      if (res.ok) {
        // Trigger a custom event to tell dashboard to refresh
        window.dispatchEvent(new Event('nexus-folder-created'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workspaceId) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspaceId', workspaceId);

      const res = await fetch(`${serverUrl}/api/files/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.file) {
        window.dispatchEvent(new Event('nexus-file-uploaded'));
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('Upload error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFollowMe = () => {
    if (globalSocket && workspaceId) {
      globalSocket.emit('presentation:start', {
        workspaceId,
        documentId: null,
        role: userRole
      });
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground font-sans selection:bg-tint-orange/30">
      <CommandPalette 
        workspaces={workspaces}
        workspaceId={workspaceId || null}
        togglePanel={togglePanel}
        onCreateDocument={handleCreateDocument}
        onCreateFolder={handleCreateFolder}
      />
      <GlobalHeader
        workspaces={workspaces}
        activeWorkspaceId={workspaceId || null}
        user={user}
        jwt={jwt}
        serverUrl={serverUrl}
        onLogout={onLogout}
        onWorkspaceChange={(id) => navigate(id ? `/w/${id}` : '/')}
        mutateWorkspaces={mutateWorkspaces}
        togglePanel={togglePanel}
        activePanel={activePanel}
        isMainSidebarOpen={isMainSidebarOpen}
        setIsMainSidebarOpen={setIsMainSidebarOpen}
      />

      <main className="flex-1 overflow-hidden relative z-10 flex">
        {/* Backdrop for mobile sidebar */}
        {isMainSidebarOpen && containerWidth < 800 && (
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setIsMainSidebarOpen(false)}
          />
        )}

        <WorkspaceSidebar
          isMainSidebarOpen={isMainSidebarOpen}
          setIsMainSidebarOpen={setIsMainSidebarOpen}
          userRole={userRole}
          activePanel={activePanel}
          togglePanel={togglePanel}
          onCreateDocument={handleCreateDocument}
          onCreateFolder={handleCreateFolder}
          onFileUpload={handleFileUpload}
          onFollowMe={handleFollowMe}
          onManageTeam={() => setIsTeamModalOpen(true)}
          isCreating={isCreating}
          isUploading={isUploading}
        />

        <div ref={containerRef} className="flex-1 flex overflow-hidden @container relative">
          <div className="flex-1 overflow-y-auto">
            <Outlet context={{ 
              isMainSidebarOpen, 
              setIsMainSidebarOpen, 
              userRole, 
              setUserRole,
              globalSocket
            }} />
          </div>

          {/* Contextual Panels */}
          {activePanel && workspaceId && (
            <>
              {(containerWidth < 600) && (
                <div 
                  className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
                  onClick={closePanel}
                />
              )}
              
              <div className={`flex h-full shrink-0 ${containerWidth < 600 ? 'fixed inset-y-0 right-0 z-50' : 'z-30'}`}>
                {(() => {
                  const isMobile = containerWidth < 500;
                  const isOverlay = containerWidth < 600;
                  
                  const className = `
                    ${isMobile ? 'w-screen' : ''}
                    ${isOverlay && !isMobile ? 'w-[min(400px,90vw)] shadow-2xl border-l border-border/50 bg-background/95 backdrop-blur-xl' : ''}
                    ${!isOverlay ? 'w-80 xl:w-96 border-l border-border/50 shrink-0 relative h-full' : 'relative h-full'}
                    transition-all duration-300 flex flex-col bg-background
                  `;

                  return (
                    <div className={className}>
                      {activePanel !== 'globalChat' && activePanel !== 'activity' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={closePanel} 
                          className="absolute top-3 right-3 z-50 bg-background/50 backdrop-blur hover:bg-muted/80"
                          aria-label="Close panel"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                      
                      <div className="flex-1 overflow-hidden relative">
                        {activePanel === 'workspaceChat' && (
                          <WorkspaceChat
                            workspaceId={workspaceId}
                            token={jwt}
                            serverUrl={serverUrl}
                            currentUser={user}
                            onClose={closePanel}
                            onOpenDocument={(doc) => navigate(`/w/${workspaceId}/d/${doc.id}`)}
                            onOpenDM={() => togglePanel('globalChat')}
                          />
                        )}
                        
                        {activePanel === 'tasks' && (
                          <TasksSidebar
                            workspaceId={workspaceId}
                            token={jwt}
                            serverUrl={serverUrl}
                            userRole={userRole}
                            currentDocumentId={documentId || null}
                          />
                        )}

                        {activePanel === 'ai' && (
                          <WorkspaceAIChat
                            workspaceId={workspaceId}
                            token={jwt}
                            serverUrl={serverUrl}
                          />
                        )}

                        {activePanel === 'activity' && (
                          <ActivitySidebar
                            workspaceId={workspaceId}
                            token={jwt}
                            serverUrl={serverUrl}
                            onClose={closePanel}
                          />
                        )}

                        {activePanel === 'globalChat' && (
                          <GlobalChat
                            token={jwt}
                            serverUrl={serverUrl}
                            currentUser={user}
                            onClose={closePanel}
                          />
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </div>
      </main>

      {isTeamModalOpen && workspaceId && (
        <ManageTeamModal
          workspaceId={workspaceId}
          token={jwt}
          serverUrl={serverUrl}
          onClose={() => setIsTeamModalOpen(false)}
          currentUserRole={userRole}
        />
      )}
    </div>
  );
};

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = (props) => (
  <ActiveDocumentProvider>
    <WorkspaceLayoutInner {...props} />
  </ActiveDocumentProvider>
);
