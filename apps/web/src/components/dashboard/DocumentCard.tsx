import React, { useState } from 'react';

export interface DocumentItem {
  id: string;
  title: string;
  textContent?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    name?: string | null;
    email: string;
  };
}

interface DocumentCardProps {
  doc: DocumentItem;
  onOpen: (doc: DocumentItem) => void;
  onRename: (id: string, newTitle: string) => void;
  onDuplicate: (doc: DocumentItem) => void;
  onArchiveToggle: (id: string, isArchived: boolean) => void;
  onDeletePermanent: (id: string) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  doc,
  onOpen,
  onRename,
  onDuplicate,
  onArchiveToggle,
  onDeletePermanent,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [titleInput, setTitleInput] = useState(doc.title);

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (titleInput.trim() && titleInput !== doc.title) {
      onRename(doc.id, titleInput.trim());
    }
    setIsRenaming(false);
  };

  const handleExportMarkdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    const content = doc.textContent || `# ${doc.title}\n\nNo content preview available.`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportHtml = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    const content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${doc.title}</title><style>body{font-family:sans-serif;line-height:1.6;padding:2rem;max-width:800px;margin:0 auto;color:#222;}</style></head><body><h1>${doc.title}</h1><p>${doc.textContent || 'No content preview available.'}</p></body></html>`;
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.toLowerCase().replace(/\s+/g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      onClick={() => !isRenaming && onOpen(doc)}
      className="group relative flex flex-col justify-between bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-purple-500/50 rounded-2xl p-5 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1 backdrop-blur-md"
    >
      {/* Top Section */}
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2.5 flex-1 min-w-0 mr-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors duration-200 shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>

            {isRenaming ? (
              <form onSubmit={handleRenameSubmit} className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={() => setIsRenaming(false)}
                  autoFocus
                  className="w-full bg-slate-950 text-white text-sm font-semibold px-2 py-1 rounded border border-purple-500 focus:outline-none"
                />
              </form>
            ) : (
              <h3 className="font-semibold text-slate-100 group-hover:text-white truncate text-base">
                {doc.title}
              </h3>
            )}
          </div>

          {/* Action Menu Trigger */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-44 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-20 backdrop-blur-xl divide-y divide-slate-800/80">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsRenaming(true);
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center space-x-2"
                    >
                      <span>✏️</span>
                      <span>Rename</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onDuplicate(doc);
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center space-x-2"
                    >
                      <span>📋</span>
                      <span>Duplicate</span>
                    </button>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={handleExportMarkdown}
                      className="w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center space-x-2"
                    >
                      <span>📄</span>
                      <span>Export as .md</span>
                    </button>
                    <button
                      onClick={handleExportHtml}
                      className="w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center space-x-2"
                    >
                      <span>🌐</span>
                      <span>Export as HTML</span>
                    </button>
                  </div>

                  <div className="py-1">
                    {doc.isArchived ? (
                      <>
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            onArchiveToggle(doc.id, false);
                          }}
                          className="w-full px-3 py-1.5 text-left text-xs text-emerald-400 hover:bg-emerald-500/10 flex items-center space-x-2"
                        >
                          <span>♻️</span>
                          <span>Restore</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            onDeletePermanent(doc.id);
                          }}
                          className="w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-red-500/10 flex items-center space-x-2"
                        >
                          <span>🗑️</span>
                          <span>Delete Forever</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          onArchiveToggle(doc.id, true);
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-red-500/10 flex items-center space-x-2"
                      >
                        <span>🗑️</span>
                        <span>Move to Trash</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content Snippet Preview */}
        <p className="text-xs text-slate-400/80 line-clamp-3 leading-relaxed mb-4 min-h-[3.6rem]">
          {doc.textContent ? doc.textContent : 'No content written yet. Click to start typing...'}
        </p>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-[11px] text-slate-500 font-medium">
        <span className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
          <span>{formatDate(doc.updatedAt)}</span>
        </span>

        {doc.creator && (
          <span className="bg-slate-800/80 px-2 py-0.5 rounded text-slate-400 truncate max-w-[100px]">
            {doc.creator.name || doc.creator.email.split('@')[0]}
          </span>
        )}
      </div>
    </div>
  );
};
