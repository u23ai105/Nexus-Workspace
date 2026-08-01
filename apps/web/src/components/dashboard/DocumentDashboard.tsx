import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { DocumentCard, type DocumentItem } from './DocumentCard';
import { ManageTeamModal } from './ManageTeamModal';
import { WorkspaceChat } from './WorkspaceChat';
import { FolderCard } from './FolderCard';
import { TasksSidebar } from './TasksSidebar';
import { WorkspaceAIChat } from './WorkspaceAIChat';

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
  globalSocket?: any;
  onOpenDM?: (user: any) => void;
}

export const DocumentDashboard: React.FC<DocumentDashboardProps> = ({
  workspaceId,
  token,
  serverUrl,
  onSelectDocument,
  onRoleChange,
  currentUser,
  globalSocket,
  onOpenDM
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'trash' | 'drive'>('all');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>('OWNER');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  // Sidebar states
  const [isMainSidebarOpen, setIsMainSidebarOpen] = useState(true);

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
        alert(data.error || 'Failed to update document');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting file');
    }
  };

  // Create new document
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
      alert('Upload error');
    } finally {
      setCreating(false);
    }
  };

  // Rename document
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
      if (res.ok) {
        mutateDocs();
      }
    } catch (err) {
      console.error('Failed to rename document:', err);
    }
  };

  // Duplicate document
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

  // Toggle archive
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
      if (res.ok) {
        mutateDocs();
      }
    } catch (err) {
      console.error('Failed to archive document:', err);
    }
  };

  // Permanent delete
  const handleDeletePermanent = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this document? This action cannot be undone.')) {
      return;
    }
    try {
      const res = await fetch(`${serverUrl}/api/documents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        mutateDocs();
      }
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
    <div className="flex h-full bg-grid-pattern bg-background text-foreground overflow-hidden font-sans relative">
      {/* Main Sidebar Toggle (when hidden) */}
      {!isMainSidebarOpen && (
        <button
          onClick={() => setIsMainSidebarOpen(true)}
          className="absolute top-4 left-4 z-20 p-2 bg-card/80 backdrop-blur-md border border-border rounded-md shadow-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Open Sidebar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Minimal Sidebar */}
      {isMainSidebarOpen && (
        <aside className="w-64 bg-card/40 backdrop-blur-md border-r border-border flex flex-col justify-between p-4 shrink-0 relative z-10 transition-all duration-300">
          <div>
            <div className="flex justify-between items-center mb-6">
              <span className="font-semibold text-sm tracking-tight text-foreground/80">Navigation</span>
              <button
                onClick={() => setIsMainSidebarOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                title="Hide Sidebar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            </div>
          {/* New Document Action - hidden for VIEWERs */}
          {userRole !== 'VIEWER' && (
            <div className="flex flex-col space-y-2 mb-6">
              <button
                onClick={() => handleCreateDocument('TEXT')}
                disabled={creating}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-3 rounded-md shadow-sm flex items-center justify-center space-x-2 transition-all duration-200 active:scale-95 disabled:opacity-50 text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{creating ? 'Creating...' : 'New Text Doc'}</span>
              </button>
              
              <button
                onClick={() => handleCreateDocument('CANVAS')}
                disabled={creating}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-3 rounded-md shadow-sm flex items-center justify-center space-x-2 transition-all duration-200 active:scale-95 disabled:opacity-50 text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                <span>{creating ? 'Creating...' : 'New Canvas Board'}</span>
              </button>

              <button
                onClick={() => {
                  const name = prompt('Enter folder name:');
                  if (name) handleCreateFolder(currentFolderId, name);
                }}
                disabled={creating}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 px-3 rounded-md shadow-sm flex items-center justify-center space-x-2 transition-all duration-200 active:scale-95 disabled:opacity-50 text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span>{creating ? 'Creating...' : 'New Folder'}</span>
              </button>

              <label
                className="cursor-pointer w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-3 rounded-md shadow-sm flex items-center justify-center space-x-2 transition-all duration-200 active:scale-95 disabled:opacity-50 text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>{uploadingFile ? 'Uploading...' : 'Upload File'}</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                />
              </label>

              {userRole !== 'VIEWER' && (
                <button
                  onClick={() => {
                    if (globalSocket) {
                      globalSocket.emit('presentation:start', {
                        workspaceId,
                        documentId: null, // Broadcasts dashboard level
                        role: userRole
                      });
                    }
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 px-3 rounded-md shadow-sm flex items-center justify-center space-x-2 transition-all duration-200 active:scale-95 text-sm mt-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Start Follow Me</span>
                </button>
              )}
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className="flex items-center space-x-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>All Documents</span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('trash')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'trash'
                  ? 'bg-destructive/10 text-destructive'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className="flex items-center space-x-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Trash</span>
              </span>
            </button>


            <button
              onClick={() => setIsAiOpen(!isAiOpen)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isAiOpen
                  ? 'bg-purple-500/20 text-purple-600'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className="flex items-center space-x-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Workspace AI</span>
              </span>
            </button>

            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isChatOpen
                  ? 'bg-tint-orange/20 text-tint-orange'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className="flex items-center space-x-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Workspace Chat</span>
              </span>
            </button>

            <button
              onClick={() => setIsTasksOpen(!isTasksOpen)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isTasksOpen
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className="flex items-center space-x-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span>Action Items</span>
              </span>
            </button>

            <button
              onClick={() => setIsTeamModalOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground mt-4"
            >
              <span className="flex items-center space-x-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>Manage Team</span>
              </span>
            </button>
            

          </nav>
        </div>

        {/* Sidebar Footer Info */}
        <div className="p-3 bg-muted/50 rounded-md border border-border/50 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
            <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Cloud Synced
          </p>
          <p className="leading-relaxed opacity-80">
            Edits are synced and persisted automatically in real-time.
          </p>
        </div>
      </aside>
      )}

      {/* Main Container for Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">


        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto p-8 sm:p-10 lg:p-12 relative z-10">
        {/* Top Search and Title Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10 max-w-6xl mx-auto w-full">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground flex items-center space-x-2">
              <span>{activeTab === 'all' ? 'Workspace Documents' : activeTab === 'drive' ? 'Workspace Drive' : 'Trash Bin'}</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {activeTab === 'all'
                ? 'Manage, collaborate, and edit notes across your workspace.'
                : activeTab === 'drive'
                ? 'Upload and share PDFs, Images, and other files with your workspace.'
                : 'Recover soft-deleted documents or permanently remove them.'}
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-80">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border focus:border-primary text-sm rounded-md pl-9 pr-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all shadow-sm"
            />
          </div>
        </div>

                {/* Content Container */}
        <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
          {/* Error Notification */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm px-4 py-3 rounded-md mb-6">
              {error}
            </div>
          )}

          {/* Loading Spinner */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Loading workspace documents...</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Breadcrumbs */}
              {activeTab === 'all' && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6 bg-muted/30 p-2 rounded-md border border-border/50">
                  <button onClick={() => setCurrentFolderId(null)} className="hover:text-foreground hover:underline transition-colors font-medium">My Drive</button>
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
                        <button onClick={() => setCurrentFolderId(f.id)} className="hover:text-foreground hover:underline transition-colors truncate max-w-[150px] font-medium">{f.name}</button>
                      </React.Fragment>
                    ));
                  })()}
                </div>
              )}

              {/* Grid */}
              {folders.filter((f: any) => activeTab === 'all' ? f.parentId === currentFolderId : true).length === 0 &&
               filteredDocs.length === 0 &&
               files.filter((f: any) => activeTab === 'all' ? f.folderId === currentFolderId : true).length === 0 ? (
                /* Empty State */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-16 min-h-[400px]">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-6">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {activeTab === 'all' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      )}
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {searchQuery ? 'No matching items found' : activeTab === 'all' ? 'This folder is empty' : 'Trash is empty'}
                  </h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                    <div key={file.id} className="premium-card p-4 flex flex-col group relative overflow-hidden">
                      <div className="flex-1 flex items-center justify-center bg-muted/50 rounded-md mb-3 min-h-[120px] p-2 overflow-hidden">
                        {file.mimeType.startsWith('image/') ? (
                          <img src={file.url} alt={file.filename} className="max-w-full max-h-full object-contain" />
                        ) : (
                          <div className="text-3xl text-muted-foreground font-mono">
                            {file.filename.split('.').pop()?.toUpperCase() || 'FILE'}
                          </div>
                        )}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-medium text-foreground truncate" title={file.filename}>{file.filename}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex justify-between">
                          <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                          {file.uploader && <span>by {file.uploader.name}</span>}
                        </p>
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-background/90 backdrop-blur-sm hover:bg-tint-blue/20 hover:text-tint-blue text-foreground border border-border/50 rounded-md shadow-sm block" title="Open file">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        {(userRole === 'OWNER' || userRole === 'ADMIN') && activeTab === 'trash' && (
                          <button onClick={(e) => handleDeleteFile(e, file.id)} className="p-1.5 bg-background/90 backdrop-blur-sm hover:bg-destructive/20 hover:text-destructive text-foreground border border-border/50 rounded-md shadow-sm block" title="Delete file">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                        {/* Restore / Archive file for Trash */}
                        {activeTab === 'trash' && (
                          <button onClick={(e) => {
                             e.preventDefault(); e.stopPropagation();
                             fetch(serverUrl + "/api/files/" + file.id, {
                               method: "PATCH",
                               headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                               body: JSON.stringify({ isArchived: false })
                             }).then(() => mutateFiles())
                          }} className="p-1.5 bg-background/90 backdrop-blur-sm hover:bg-primary/20 hover:text-primary text-foreground border border-border/50 rounded-md shadow-sm block" title="Restore file">
                            ♻️
                          </button>
                        )}
                        {activeTab === 'all' && userRole !== 'VIEWER' && (
                          <button onClick={(e) => {
                             e.preventDefault(); e.stopPropagation();
                             fetch(serverUrl + "/api/files/" + file.id, {
                               method: "PATCH",
                               headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                               body: JSON.stringify({ isArchived: true })
                             }).then(() => mutateFiles())
                          }} className="p-1.5 bg-background/90 backdrop-blur-sm hover:bg-destructive/20 hover:text-destructive text-foreground border border-border/50 rounded-md shadow-sm block" title="Move to trash">
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      </div>

      {/* Slide-out Workspace Chat */}
      {isChatOpen && (
        <WorkspaceChat
          workspaceId={workspaceId}
          token={token}
          serverUrl={serverUrl}
          currentUser={currentUser}
          onClose={() => setIsChatOpen(false)}
          onOpenDocument={onSelectDocument}
          onOpenDM={onOpenDM}
        />
      )}

      {/* Slide-out Tasks Sidebar */}
      {isTasksOpen && (
        <div className="relative z-20 h-full flex flex-col shrink-0">
          <div className="flex-1 overflow-hidden relative flex flex-col">
            <button onClick={() => setIsTasksOpen(false)} className="absolute top-4 right-4 p-1 rounded-md text-muted-foreground hover:bg-muted z-30">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <TasksSidebar
              workspaceId={workspaceId}
              token={token}
              serverUrl={serverUrl}
              userRole={userRole}
            />
          </div>
        </div>
      )}

      {/* Slide-out AI Sidebar */}
      {isAiOpen && (
        <div className="relative z-20 h-full flex flex-col shrink-0">
          <div className="flex-1 overflow-hidden relative flex flex-col">
            <button onClick={() => setIsAiOpen(false)} className="absolute top-4 right-4 p-1 rounded-md text-muted-foreground hover:bg-muted z-30">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <WorkspaceAIChat
              workspaceId={workspaceId}
              token={token}
              serverUrl={serverUrl}
            />
          </div>
        </div>
      )}
      
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
