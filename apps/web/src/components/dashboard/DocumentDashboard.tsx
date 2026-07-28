import React, { useState, useEffect, useCallback } from 'react';
import { DocumentCard, type DocumentItem } from './DocumentCard';

interface DocumentDashboardProps {
  workspaceId: string;
  token: string;
  serverUrl: string;
  onSelectDocument: (doc: DocumentItem) => void;
}

export const DocumentDashboard: React.FC<DocumentDashboardProps> = ({
  workspaceId,
  token,
  serverUrl,
  onSelectDocument,
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'trash'>('all');
  const [creating, setCreating] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const isArchived = activeTab === 'trash';
      const res = await fetch(
        `${serverUrl}/api/documents?workspaceId=${workspaceId}&isArchived=${isArchived}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load documents');
      setDocuments(data.documents || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, token, serverUrl, activeTab]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Create new document
  const handleCreateDocument = async () => {
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
      if (!res.ok) throw new Error(data.error || 'Failed to create document');
      
      onSelectDocument(data.document);
    } catch (err: any) {
      alert(err.message || 'Error creating document');
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
        setDocuments((prev) =>
          prev.map((d) => (d.id === id ? { ...d, title: newTitle } : d))
        );
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
        fetchDocuments();
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
        setDocuments((prev) => prev.filter((d) => d.id !== id));
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
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const filteredDocs = documents.filter((doc) => {
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
          {/* New Document Action */}
          <button
            onClick={handleCreateDocument}
            disabled={creating}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 px-4 rounded-md shadow-sm flex items-center justify-center space-x-2 transition-all duration-200 active:scale-95 disabled:opacity-50 mb-6"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>{creating ? 'Creating...' : 'New Document'}</span>
          </button>

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
              <span>{activeTab === 'all' ? 'Workspace Documents' : 'Trash Bin'}</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {activeTab === 'all'
                ? 'Manage, collaborate, and edit notes across your workspace.'
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
          ) : filteredDocs.length === 0 ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border border-dashed border-border rounded-lg bg-muted/20">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {activeTab === 'all' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  )}
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchQuery ? 'No matching documents found' : activeTab === 'all' ? 'No documents yet' : 'Trash is empty'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                {searchQuery
                  ? `No results for "${searchQuery}". Try a different keyword.`
                  : activeTab === 'all'
                  ? 'Create your first collaborative document to start writing and syncing with your team.'
                  : 'Deleted documents will appear here for recovery.'}
              </p>
              {activeTab === 'all' && !searchQuery && (
                <button
                  onClick={handleCreateDocument}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-5 py-2 rounded-md transition-all shadow-sm"
                >
                  Create Document
                </button>
              )}
            </div>
          ) : (
            /* Document Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onOpen={onSelectDocument}
                  onRename={handleRename}
                  onDuplicate={handleDuplicate}
                  onArchiveToggle={handleArchiveToggle}
                  onDeletePermanent={handleDeletePermanent}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
