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

  // Create new document with smart Untitled naming
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
      
      // Immediately open the newly created document!
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
        // Also copy text content if any
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

  // Toggle archive (soft delete / restore)
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

  // Filter documents by search query
  const filteredDocs = documents.filter((doc) => {
    const query = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(query) ||
      (doc.textContent && doc.textContent.toLowerCase().includes(query))
    );
  });

  return (
    <div className="flex h-full bg-[#07070B] text-slate-100 overflow-hidden">
      {/* Glassmorphism Sidebar */}
      <aside className="w-64 bg-slate-950/80 border-r border-slate-800/80 flex flex-col justify-between p-4 backdrop-blur-xl shrink-0">
        <div>
          {/* New Document Action */}
          <button
            onClick={handleCreateDocument}
            disabled={creating}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-purple-500/25 flex items-center justify-center space-x-2 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 mb-6"
          >
            <span>➕</span>
            <span>{creating ? 'Creating...' : 'New Document'}</span>
          </button>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('all')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <span className="flex items-center space-x-3">
                <span>📁</span>
                <span>All Documents</span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('trash')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'trash'
                  ? 'bg-red-500/15 text-red-300 border border-red-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <span className="flex items-center space-x-3">
                <span>🗑️</span>
                <span>Trash</span>
              </span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Info */}
        <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800/60 text-xs text-slate-400">
          <p className="font-semibold text-slate-300 mb-1">💡 Smart Saving</p>
          <p className="text-[11px] leading-relaxed text-slate-500">
            All edits are synced and persisted automatically in real-time to your cloud PostgreSQL database.
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto p-6 sm:p-8">
        {/* Top Search and Title Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
              <span>{activeTab === 'all' ? '📁 Workspace Documents' : '🗑️ Trash Bin'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {activeTab === 'all'
                ? 'Manage, collaborate, and edit rich text notes across your workspace.'
                : 'Recover soft-deleted documents or permanently remove them.'}
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
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
              className="w-full bg-slate-900/80 border border-slate-800 focus:border-purple-500 text-sm rounded-xl pl-10 pr-4 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
            />
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500">Loading workspace documents...</p>
            </div>
          </div>
        ) : filteredDocs.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-800/80 rounded-2xl bg-slate-900/20">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl mb-4">
              {activeTab === 'all' ? '📄' : '🗑️'}
            </div>
            <h3 className="text-base font-semibold text-slate-200 mb-1">
              {searchQuery ? 'No matching documents found' : activeTab === 'all' ? 'No documents yet' : 'Trash is empty'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-6">
              {searchQuery
                ? `No results for "${searchQuery}". Try a different keyword.`
                : activeTab === 'all'
                ? 'Create your first collaborative document to start writing and syncing with your team.'
                : 'Deleted documents will appear here for recovery.'}
            </p>
            {activeTab === 'all' && !searchQuery && (
              <button
                onClick={handleCreateDocument}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-500/20"
              >
                + Create Document
              </button>
            )}
          </div>
        ) : (
          /* Document Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
      </main>
    </div>
  );
};
