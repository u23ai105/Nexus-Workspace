import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import useSWR from 'swr';
import { DocumentCard, type DocumentItem } from './DocumentCard';
import { ManageTeamModal } from './ManageTeamModal';
import { WorkspaceChat } from './WorkspaceChat';
import { FolderCard } from './FolderCard';
import { TasksSidebar } from './TasksSidebar';
import { WorkspaceAIChat } from './WorkspaceAIChat';
import { useContainerSize } from '@/hooks/useContainerSize';

// UI Primitives
import { Button } from '@/components/ui/button';

import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

// Icons
import { 
  Plus, FileText, FolderPlus, Upload, Play, Menu, X, Trash2, 
  Users, LayoutDashboard, File, MessageSquare, CheckSquare, Sparkles, Folder, FileImage, ExternalLink, RotateCcw, MoreHorizontal 
} from 'lucide-react';

export interface FileItem {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: string;
  uploader?: { name: string; email: string };
}

interface DocumentDashboardProps {
  workspaceId: string;
  token: string;
  serverUrl: string;
  onSelectDocument: (doc: DocumentItem) => void;
  onRoleChange?: (role: string) => void;
  currentUser: any;
  globalSocket: Socket | null;
  searchQuery: string;
  onOpenDM: (user: any) => void;
}

export const DocumentDashboard: React.FC<DocumentDashboardProps> = ({
  workspaceId,
  token,
  serverUrl,
  onSelectDocument,
  onRoleChange,
  currentUser,
  globalSocket,
  searchQuery,
  onOpenDM
}: DocumentDashboardProps) => {
  const [activeTab, setActiveTab] = useState<'all' | 'trash' | 'drive'>('all');
  
  // Responsive Panels State
  const [activePanels, setActivePanels] = useState<string[]>([]);
  const [containerRef, containerWidth] = useContainerSize();

  // Enforce Panel Limits based on fluid container width
  useEffect(() => {
    if (containerWidth === 0) return; // Skip initial render
    let maxPanels = 1;
    if (containerWidth >= 1200) maxPanels = 2; // EXPANDED
    else if (containerWidth >= 800) maxPanels = 1; // CONSTRAINED
    
    if (activePanels.length > maxPanels) {
      setActivePanels(prev => prev.slice(prev.length - maxPanels));
    }
  }, [containerWidth, activePanels.length]);

  const togglePanel = (panel: string) => {
    setActivePanels(prev => {
      if (prev.includes(panel)) return prev.filter(p => p !== panel);
      
      let maxPanels = 1;
      if (containerWidth >= 1200) maxPanels = 2;
      else if (containerWidth >= 800) maxPanels = 1;
      
      const newPanels = [...prev, panel];
      if (newPanels.length > maxPanels) {
        return newPanels.slice(newPanels.length - maxPanels);
      }
      return newPanels;
    });
  };

  const closePanel = (panel: string) => {
    setActivePanels(prev => prev.filter(p => p !== panel));
  };

  const [creating, setCreating] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>('OWNER');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  const [isMainSidebarOpen, setIsMainSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);

  const fetcher = async ([url, jwt]: [string, string]) => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${jwt}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch');
    return data;
  };

  const isArchived = activeTab === 'trash';
  const docsKey = (activeTab === 'all' || activeTab === 'trash') ? [`${serverUrl}/api/documents?workspaceId=${workspaceId}&isArchived=${isArchived}`, token] : null;
  const filesKey = (activeTab === 'all' || activeTab === 'trash') ? [`${serverUrl}/api/files?workspaceId=${workspaceId}&isArchived=${isArchived}`, token] : null;

  const { data: docsData, error: docsError, isLoading: docsLoading, mutate: mutateDocs } = useSWR(docsKey, fetcher);
  const { data: filesData, error: filesError, isLoading: filesLoading, mutate: mutateFiles } = useSWR(filesKey, fetcher);
  const { data: foldersData, mutate: mutateFolders } = useSWR([`${serverUrl}/api/workspaces/${workspaceId}/folders`, token], fetcher);

  const documents = docsData?.documents || [];
  const files = filesData?.files || [];
  const folders = foldersData?.folders || [];
  const loading = docsLoading || filesLoading;
  const error = (docsError?.message || filesError?.message) || null;

  useEffect(() => {
    if (docsData?.userRole) {
      setUserRole(docsData.userRole);
      onRoleChange?.(docsData.userRole);
    }
  }, [docsData?.userRole, onRoleChange]);

  const handleDeleteFile = async (e: React.MouseEvent, fileId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to permanently delete this file?')) return;

    try {
      const res = await fetch(`${serverUrl}/api/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        mutateFiles();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete file');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting file');
    }
  };

  const handleCreateDocument = async (type: 'TEXT' | 'CANVAS' = 'TEXT', e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch(`${serverUrl}/api/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ workspaceId, type, folderId: currentFolderId }),
      });
      const data = await res.json();
      if (res.ok && data.document) {
        mutateDocs({ documents: [data.document, ...documents], userRole: docsData?.userRole }, false);
        onSelectDocument(data.document);
      } else {
        alert(data.error || 'Failed to create document');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating document');
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (id: string, newTitle: string) => {
    try {
      const res = await fetch(`${serverUrl}/api/documents/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) mutateDocs();
    } catch (err) {
      console.error('Failed to rename document:', err);
    }
  };

  const handleDuplicate = async (doc: DocumentItem) => {
    try {
      const res = await fetch(`${serverUrl}/api/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workspaceId,
          title: `${doc.title} (Copy)`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (doc.textContent) {
          await fetch(`${serverUrl}/api/documents/${data.document.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ textContent: doc.textContent }),
          });
        }
        mutateDocs();
      }
    } catch (err) {
      console.error('Failed to duplicate document:', err);
    }
  };

  const handleArchiveToggle = async (id: string, isArchived: boolean) => {
    try {
      const res = await fetch(`${serverUrl}/api/documents/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isArchived }),
      });
      if (res.ok) mutateDocs();
    } catch (err) {
      console.error('Failed to archive document:', err);
    }
  };

  const handleDeletePermanent = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this document? This action cannot be undone.')) return;
    try {
      const res = await fetch(`${serverUrl}/api/documents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) mutateDocs();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspaceId', workspaceId);
      if (currentFolderId) {
        formData.append('folderId', currentFolderId);
      }

      const res = await fetch(`${serverUrl}/api/files/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.file) {
        mutateFiles();
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('Upload error');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleCreateFolder = async (parentId: string | null, name: string) => {
    try {
      const res = await fetch(`${serverUrl}/api/workspaces/${workspaceId}/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, parentId })
      });
      if (res.ok) mutateFolders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameFolder = async (id: string, name: string) => {
    try {
      const res = await fetch(`${serverUrl}/api/workspaces/${workspaceId}/folders/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name })
      });
      if (res.ok) mutateFolders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFolder = async (id: string) => {
    try {
      const res = await fetch(`${serverUrl}/api/workspaces/${workspaceId}/folders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        if (currentFolderId === id) setCurrentFolderId(null);
        mutateFolders();
        mutateDocs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredDocs = documents.filter((doc: any) => {
    if (activeTab === 'all' && doc.folderId !== currentFolderId) return false;
    const query = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(query) ||
      (doc.textContent && doc.textContent.toLowerCase().includes(query))
    );
  });

  return (
    <div className="flex h-full bg-background text-foreground overflow-hidden font-sans relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

      {/* Backdrop for mobile */}
      {isMainSidebarOpen && containerWidth < 800 && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMainSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        className={`
          fixed md:static top-0 left-0 h-full bg-card/60 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none border-r border-border/60 
          flex flex-col justify-between py-6 z-50 transition-all duration-300 ease-in-out shrink-0 overflow-hidden
          ${isMainSidebarOpen ? 'translate-x-0 w-[256px] px-4 opacity-100' : '-translate-x-full w-0 px-0 opacity-0 border-none'}
        `}
      >
        <div>
          <div className="flex justify-between items-center mb-6 lg:hidden">
            <span className="font-semibold text-sm tracking-tight text-foreground/80 px-2">Menu</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-muted/60 hover:text-foreground" onClick={() => setIsMainSidebarOpen(false)} aria-label="Close menu">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {userRole !== 'VIEWER' && activeTab !== 'trash' && (
            <div className="flex flex-col space-y-2 mb-8">
              <DropdownMenu>
                <DropdownMenuTrigger className="focus:outline-none w-full">
                  <div className="w-full justify-start text-sm h-9 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 px-3 py-2">
                    <Plus className="mr-3 h-4 w-4" />
                    Create New
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={() => handleCreateDocument('TEXT')} disabled={creating} className="cursor-pointer hover:bg-muted focus:bg-muted">
                    <FileText className="mr-3 h-4 w-4" /> Document
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCreateDocument('CANVAS')} disabled={creating} className="cursor-pointer hover:bg-muted focus:bg-muted">
                    <LayoutDashboard className="mr-3 h-4 w-4" /> Canvas Board
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    const name = prompt('Enter folder name:');
                    if (name) handleCreateFolder(currentFolderId, name);
                  }} className="cursor-pointer hover:bg-muted focus:bg-muted">
                    <FolderPlus className="mr-3 h-4 w-4" /> Folder
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer hover:bg-muted focus:bg-muted p-0">
                    <label className="cursor-pointer flex items-center px-2 py-1.5 w-full h-full">
                      <Upload className="mr-3 h-4 w-4" />
                      <span>Upload File</span>
                      <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingFile} />
                    </label>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button 
                variant="outline" 
                className="w-full justify-start text-sm h-9 px-3 shadow-sm hover:bg-secondary/60 hover:text-foreground"
                onClick={() => {
                  if (globalSocket) {
                    globalSocket.emit('presentation:start', {
                      workspaceId,
                      documentId: null,
                      role: userRole
                    });
                  }
                }}
              >
                <Play className="mr-3 h-4 w-4" />
                Follow Me
              </Button>
            </div>
          )}

          <nav className="space-y-0.5">
            <Button
              variant="ghost"
              className={`w-full justify-start px-3 font-medium transition-colors hover:bg-secondary/60 hover:text-foreground ${activeTab === 'all' ? 'bg-muted/80 text-foreground' : 'text-muted-foreground'}`}
              onClick={() => setActiveTab('all')}
            >
              <Folder className="mr-3 h-4 w-4" />
              Documents
            </Button>

            <Button
              variant="ghost"
              className={`w-full justify-start px-3 font-medium transition-colors hover:bg-secondary/60 hover:text-foreground ${activeTab === 'trash' ? 'bg-muted/80 text-foreground' : 'text-muted-foreground'}`}
              onClick={() => setActiveTab('trash')}
            >
              <Trash2 className="mr-3 h-4 w-4" />
              Trash
            </Button>
            
            <div className="py-2 my-2 border-t border-border/50" />

            <Button
              variant="ghost"
              className={`w-full justify-start px-3 font-medium transition-colors hover:bg-secondary/60 hover:text-foreground ${activePanels.includes('ai') ? 'bg-muted/50 text-foreground' : 'text-muted-foreground'}`}
              onClick={() => togglePanel('ai')}
            >
              <Sparkles className="mr-3 h-4 w-4" />
              Workspace AI
            </Button>

            <Button
              variant="ghost"
              className={`w-full justify-start px-3 font-medium transition-colors hover:bg-secondary/60 hover:text-foreground ${activePanels.includes('chat') ? 'bg-muted/50 text-foreground' : 'text-muted-foreground'}`}
              onClick={() => togglePanel('chat')}
            >
              <MessageSquare className="mr-3 h-4 w-4" />
              Team Chat
            </Button>

            <Button
              variant="ghost"
              className={`w-full justify-start px-3 font-medium transition-colors hover:bg-secondary/60 hover:text-foreground ${activePanels.includes('tasks') ? 'bg-muted/50 text-foreground' : 'text-muted-foreground'}`}
              onClick={() => togglePanel('tasks')}
            >
              <CheckSquare className="mr-3 h-4 w-4" />
              Action Items
            </Button>
          </nav>
        </div>

        <div>
          <Button
            variant="ghost"
            className="w-full justify-start px-3 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            onClick={() => setIsTeamModalOpen(true)}
          >
            <Users className="mr-3 h-4 w-4" />
            Manage Team
          </Button>
          
          <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-border/50 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success"></span>
              Cloud Synced
            </p>
            <p className="opacity-80">Edits are persisted in real-time.</p>
          </div>
        </div>
      </aside>

      <div ref={containerRef} className="flex-1 flex overflow-hidden @container">
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto p-4 sm:p-8 relative z-10 transition-all duration-300">
          
          <div className="mb-6 flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMainSidebarOpen(!isMainSidebarOpen)}
              className="mr-4 text-muted-foreground hover:text-foreground"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                {activeTab === 'all' && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6 bg-muted/20 px-3 py-2 rounded-lg border border-border/50">
                    <button onClick={() => setCurrentFolderId(null)} className="hover:text-foreground hover:bg-muted/60 px-2 py-1 rounded transition-colors font-medium">My Drive</button>
                    {(() => {
                      const breadcrumbFolders = [];
                      let curr = currentFolderId;
                      while (curr) {
                        const f = folders.find((f: any) => f.id === curr);
                        if (f) {
                          breadcrumbFolders.unshift(f);
                          curr = f.parentId;
                        } else {
                          break;
                        }
                      }
                      return breadcrumbFolders.map((f) => (
                        <React.Fragment key={f.id}>
                          <span className="opacity-50">/</span>
                          <button onClick={() => setCurrentFolderId(f.id)} className="hover:text-foreground hover:bg-muted/60 px-2 py-1 rounded transition-colors truncate max-w-[150px] font-medium">{f.name}</button>
                        </React.Fragment>
                      ));
                    })()}
                  </div>
                )}

                {folders.filter((f: any) => activeTab === 'all' ? f.parentId === currentFolderId : true).length === 0 &&
                 filteredDocs.length === 0 &&
                 files.filter((f: any) => activeTab === 'all' ? f.folderId === currentFolderId : true).length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 sm:p-16 min-h-[400px]">
                    <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border/50 flex items-center justify-center text-muted-foreground mb-6">
                      {activeTab === 'trash' ? <Trash2 className="w-8 h-8 opacity-50" /> : <Folder className="w-8 h-8 opacity-50" />}
                    </div>
                    <h3 className="text-xl font-medium text-foreground mb-2">
                      {searchQuery ? 'No matching items' : (activeTab === 'trash' ? 'Trash is empty' : 'Nothing here yet')}
                    </h3>
                  </div>
                ) : (
                  <div className="grid gap-4 lg:gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))' }}>
                    {/* Folders */}
                    {folders.filter((f: any) => {
                      if (activeTab === 'all' && f.parentId !== currentFolderId) return false;
                      const query = searchQuery.toLowerCase();
                      return f.name.toLowerCase().includes(query);
                    }).map((folder: any) => (
                      <FolderCard
                        key={folder.id}
                        folder={folder}
                        onOpen={setCurrentFolderId}
                        onRename={handleRenameFolder}
                        onArchiveToggle={(id, isArchived) => {
                          fetch(serverUrl + "/api/workspaces/" + workspaceId + "/folders/" + id, {
                             method: "PATCH",
                             headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                             body: JSON.stringify({ isArchived })
                          }).then(() => mutateFolders())
                        }}
                        onDeletePermanent={handleDeleteFolder}
                        userRole={userRole}
                      />
                    ))}

                    {/* Documents */}
                    {filteredDocs.map((doc: any) => (
                      <DocumentCard
                        key={doc.id}
                        doc={doc}
                        onOpen={onSelectDocument}
                        onRename={handleRename}
                        onDuplicate={handleDuplicate}
                        onArchiveToggle={handleArchiveToggle}
                        onDeletePermanent={handleDeletePermanent}
                        userRole={userRole}
                      />
                    ))}

                    {/* Files */}
                    {files.filter((f: any) => {
                      if (activeTab === 'all' && f.folderId !== currentFolderId) return false;
                      const query = searchQuery.toLowerCase();
                      return f.filename.toLowerCase().includes(query);
                    }).map((file: any) => (
                      <Card key={file.id} className="group overflow-hidden hover:border-border hover:bg-muted/20 transition-all flex flex-col h-[14rem] cursor-pointer">
                        <CardContent className="p-4 flex-1 flex flex-col justify-between">
                          <div className="flex-1 flex items-center justify-center bg-muted/40 rounded-lg mb-4 border border-border/40">
                            {file.mimeType.startsWith('image/') ? (
                              <FileImage className="w-10 h-10 text-muted-foreground opacity-50" />
                            ) : (
                              <File className="w-10 h-10 text-muted-foreground opacity-50" />
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="text-sm font-medium text-foreground truncate" title={file.filename}>{file.filename}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger className="focus:outline-none">
                                <div className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted/70 focus:opacity-100 transition-opacity inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" aria-label="Open context menu">
                                  <MoreHorizontal className="h-4 w-4" />
                                </div>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="cursor-pointer hover:bg-muted focus:bg-muted">
                                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center w-full h-full">
                                    <ExternalLink className="mr-2 h-4 w-4" /> Open File
                                  </a>
                                </DropdownMenuItem>
                                {activeTab === 'trash' ? (
                                  <>
                                    <DropdownMenuItem onClick={(e) => {
                                      e.preventDefault(); e.stopPropagation();
                                      fetch(serverUrl + "/api/files/" + file.id, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                                        body: JSON.stringify({ isArchived: false })
                                      }).then(() => mutateFiles())
                                    }} className="text-success cursor-pointer hover:bg-muted focus:bg-muted focus:text-success">
                                      <RotateCcw className="mr-2 h-4 w-4" /> Restore
                                    </DropdownMenuItem>
                                    {(userRole === 'OWNER' || userRole === 'ADMIN') && (
                                      <DropdownMenuItem onClick={(e) => handleDeleteFile(e, file.id)} className="text-destructive cursor-pointer hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Forever
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                ) : (
                                  userRole !== 'VIEWER' && (
                                    <DropdownMenuItem onClick={(e) => {
                                      e.preventDefault(); e.stopPropagation();
                                      fetch(serverUrl + "/api/files/" + file.id, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                                        body: JSON.stringify({ isArchived: true })
                                      }).then(() => mutateFiles())
                                    }} className="text-destructive cursor-pointer hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive">
                                      <Trash2 className="mr-2 h-4 w-4" /> Move to Trash
                                    </DropdownMenuItem>
                                  )
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Right Panels Container */}
        {activePanels.length > 0 && (
          <>
            {/* Backdrop for overlays */}
            {(containerWidth < 800) && (
              <div 
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
                onClick={() => {
                  activePanels.forEach(p => closePanel(p));
                }}
              />
            )}
            
            <div className={`flex h-full shrink-0 ${containerWidth < 800 ? 'fixed inset-y-0 right-0 z-50' : 'z-20'}`}>
              {activePanels.map((panel) => {
                const isMobile = containerWidth < 500;
                const isOverlay = containerWidth < 800;
                
                const className = `
                  ${isMobile ? 'w-screen' : ''}
                  ${isOverlay && !isMobile ? 'w-[min(400px,90vw)] shadow-2xl border-l border-border/50 bg-background/95 backdrop-blur-xl' : ''}
                  ${!isOverlay ? 'w-80 xl:w-96 border-l border-border/50 shrink-0 relative h-full' : 'relative h-full'}
                  transition-all duration-300 flex flex-col bg-background
                `;

                return (
                  <div key={panel} className={className}>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => closePanel(panel)} 
                      className="absolute top-3 right-3 z-50 bg-background/50 backdrop-blur hover:bg-muted/80"
                      aria-label="Close panel"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    
                    <div className="flex-1 overflow-hidden relative">
                      {panel === 'chat' && (
                        <WorkspaceChat
                          workspaceId={workspaceId}
                          token={token}
                          serverUrl={serverUrl}
                          currentUser={currentUser}
                          onClose={() => closePanel(panel)}
                          onOpenDocument={onSelectDocument}
                          onOpenDM={onOpenDM}
                        />
                      )}
                      
                      {panel === 'tasks' && (
                        <TasksSidebar
                          workspaceId={workspaceId}
                          token={token}
                          serverUrl={serverUrl}
                          userRole={userRole}
                        />
                      )}

                      {panel === 'ai' && (
                        <WorkspaceAIChat
                          workspaceId={workspaceId}
                          token={token}
                          serverUrl={serverUrl}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      
      {isTeamModalOpen && (
        <ManageTeamModal
          workspaceId={workspaceId}
          token={token}
          serverUrl={serverUrl}
          onClose={() => setIsTeamModalOpen(false)}
          currentUserRole={userRole}
        />
      )}
    </div>
  );
};
