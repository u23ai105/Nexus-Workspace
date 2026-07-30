import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { DocumentCard, type DocumentItem } from './DocumentCard';
import { ManageTeamModal } from './ManageTeamModal';
import { WorkspaceChat } from './WorkspaceChat';

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
  onOpenDM?: (user: any) => void;
}

export const DocumentDashboard: React.FC<DocumentDashboardProps> = ({
  workspaceId,
  token,
  serverUrl,
  onSelectDocument,
  onRoleChange,
  currentUser,
  onOpenDM
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'trash' | 'drive'>('all');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>('OWNER');

  const fetcher = async ([url, jwt]: [string, string]) => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${jwt}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch');
    return data;
  };

  const isArchived = activeTab === 'trash';
  const docsKey = (activeTab === 'all' || activeTab === 'trash') ? [`${serverUrl}/api/documents?workspaceId=${workspaceId}&isArchived=${isArchived}`, token] : null;
  const filesKey = activeTab === 'drive' ? [`${serverUrl}/api/files?workspaceId=${workspaceId}`, token] : null;

  const { data: docsData, error: docsError, isLoading: docsLoading, mutate: mutateDocs } = useSWR(docsKey, fetcher);
  const { data: filesData, error: filesError, isLoading: filesLoading, mutate: mutateFiles } = useSWR(filesKey, fetcher);

  const documents = docsData?.documents || [];
  const files = filesData?.files || [];
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
  const handleCreateDocument = async (e?: React.MouseEvent) => {
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
        body: JSON.stringify({ workspaceId }),
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

  const filteredDocs = documents.filter((doc: any) => {
    const query = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(query) ||
      (doc.textContent && doc.textContent.toLowerCase().includes(query))
    );
  });

  return (
    <div className="flex h-full bg-grid-pattern bg-background text-foreground overflow-hidden font-sans relative">
      {/* Minimal Sidebar */}
      <aside className="w-64 bg-card/40 backdrop-blur-md border-r border-border flex flex-col justify-between p-4 shrink-0 relative z-10">
        <div>
          {/* New Document Action - hidden for VIEWERs */}
          {userRole !== 'VIEWER' && (
            <button
              onClick={handleCreateDocument}
              disabled={creating}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 px-4 rounded-md shadow-sm flex items-center justify-center space-x-2 transition-all duration-200 active:scale-95 disabled:opacity-50 mb-6"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>{creating ? 'Creating...' : 'New Document'}</span>
            </button>
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
              onClick={() => setActiveTab('drive')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'drive'
                  ? 'bg-tint-blue/20 text-tint-blue'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className="flex items-center space-x-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Workspace Drive</span>
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
          ) : activeTab === 'drive' ? (
            /* Drive File Grid */
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium">Files</h3>
                {userRole !== 'VIEWER' && (
                  <label htmlFor="upload-file-header" className="cursor-pointer bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-md transition-all shadow-sm shadow-orange-500/30 inline-flex items-center space-x-2">
                    <svg className="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>{uploadingFile ? 'Uploading...' : 'Upload File'}</span>
                    <input
                      id="upload-file-header"
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                    />
                  </label>
                )}
              </div>

              {files.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border border-dashed border-border/80 rounded-lg min-h-[300px]">
                  <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center mb-4 shadow-sm text-muted-foreground">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">Workspace Drive is empty</h3>
                  
                  {userRole !== 'VIEWER' ? (
                    <>
                      <p className="text-sm text-muted-foreground max-w-sm mb-6">No files uploaded yet. Upload images, PDFs, or other documents to share with the workspace.</p>
                      <label htmlFor="upload-file-empty" className={`cursor-pointer bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-lg transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 active:scale-95 text-base inline-flex items-center space-x-2 ${uploadingFile ? 'opacity-50 pointer-events-none' : ''}`}>
                        <span>{uploadingFile ? 'Uploading...' : 'Upload First File'}</span>
                        <input
                          id="upload-file-empty"
                          type="file"
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={uploadingFile}
                        />
                      </label>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground max-w-sm mb-6">No files uploaded yet. Only Editors, Admins, and Owners can upload files.</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {/* Upload File Card directly in grid */}
                  {userRole !== 'VIEWER' && (
                    <label htmlFor="upload-file-card" className={`premium-card group cursor-pointer border-dashed border-2 border-border/60 hover:border-orange-500/50 hover:bg-orange-500/5 p-4 flex flex-col items-center justify-center transition-all min-h-[200px] ${uploadingFile ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div className="w-12 h-12 rounded-full bg-background border border-border group-hover:border-orange-500/30 flex items-center justify-center mb-3 shadow-sm text-muted-foreground group-hover:text-orange-500 transition-colors pointer-events-none">
                        {uploadingFile ? (
                          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                        )}
                      </div>
                      <span className="font-medium text-muted-foreground group-hover:text-orange-500 transition-colors text-center pointer-events-none">
                        {uploadingFile ? 'Uploading...' : 'Upload File'}
                      </span>
                      <input
                        id="upload-file-card"
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                      />
                    </label>
                  )}

                  {files.map((file: any) => (
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
                        {(userRole === 'OWNER' || userRole === 'ADMIN') && (
                          <button onClick={(e) => handleDeleteFile(e, file.id)} className="p-1.5 bg-background/90 backdrop-blur-sm hover:bg-destructive/20 hover:text-destructive text-foreground border border-border/50 rounded-md shadow-sm block" title="Delete file">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : filteredDocs.length === 0 ? (
            /* Empty State - Highly Visible */
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
                {searchQuery ? 'No matching documents found' : activeTab === 'all' ? 'No documents yet' : 'Trash is empty'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mb-8 leading-relaxed">
                {searchQuery
                  ? `No results for "${searchQuery}". Try a different keyword.`
                  : activeTab === 'all'
                  ? 'Create your first collaborative document to start writing and syncing with your team.'
                  : 'Deleted documents will appear here for recovery.'}
              </p>
              {activeTab === 'all' && !searchQuery && userRole !== 'VIEWER' && (
                <button
                  onClick={handleCreateDocument}
                  disabled={creating}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-lg transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 active:scale-95 text-base flex items-center space-x-2 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>{creating ? 'Creating...' : 'Create Your First Document'}</span>
                </button>
              )}
            </div>
          ) : (
            /* Document Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* High-visibility New Document Card */}
              {activeTab === 'all' && !searchQuery && userRole !== 'VIEWER' && (
                <div
                  onClick={handleCreateDocument}
                  className={`premium-card group cursor-pointer border-2 border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10 p-6 h-48 flex flex-col items-center justify-center transition-all shadow-sm ${creating ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mb-3 shadow-md transition-transform group-hover:scale-110">
                    {creating ? (
                      <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </div>
                  <span className="font-semibold text-primary transition-colors text-lg mt-1">
                    {creating ? 'Creating...' : 'New Document'}
                  </span>
                </div>
              )}

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
            </div>
          )}
        </div>
      </main>

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
