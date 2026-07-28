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
      className="premium-card group relative flex flex-col justify-between p-6 cursor-pointer min-h-[14rem]"
    >
      {/* Top Section */}
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0 mr-2">
            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200 shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
                  className="w-full bg-background text-foreground text-sm font-medium px-2 py-1 rounded-sm border border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </form>
            ) : (
              <h3 className="font-medium text-foreground truncate text-base">
                {doc.title}
              </h3>
            )}
          </div>

          {/* Action Menu Trigger */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-44 bg-popover border border-border rounded-md shadow-lg py-1 z-20 divide-y divide-border">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsRenaming(true);
                      }}
                      className="w-full px-3 py-1.5 text-left text-sm text-popover-foreground hover:bg-muted flex items-center space-x-2"
                    >
                      <span>✏️</span>
                      <span>Rename</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onDuplicate(doc);
                      }}
                      className="w-full px-3 py-1.5 text-left text-sm text-popover-foreground hover:bg-muted flex items-center space-x-2"
                    >
                      <span>📋</span>
                      <span>Duplicate</span>
                    </button>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={handleExportMarkdown}
                      className="w-full px-3 py-1.5 text-left text-sm text-popover-foreground hover:bg-muted flex items-center space-x-2"
                    >
                      <span>📄</span>
                      <span>Export as .md</span>
                    </button>
                    <button
                      onClick={handleExportHtml}
                      className="w-full px-3 py-1.5 text-left text-sm text-popover-foreground hover:bg-muted flex items-center space-x-2"
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
                          className="w-full px-3 py-1.5 text-left text-sm text-primary hover:bg-primary/10 flex items-center space-x-2"
                        >
                          <span>♻️</span>
                          <span>Restore</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            onDeletePermanent(doc.id);
                          }}
                          className="w-full px-3 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10 flex items-center space-x-2"
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
                        className="w-full px-3 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10 flex items-center space-x-2"
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
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed mb-4 min-h-[4rem]">
          {doc.textContent ? doc.textContent : 'No content written yet. Click to start typing...'}
        </p>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground font-medium">
        <span className="flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
          <span>{formatDate(doc.updatedAt)}</span>
        </span>

        {doc.creator && (
          <span className="bg-muted px-2 py-0.5 rounded text-muted-foreground truncate max-w-[100px]">
            {doc.creator.name || doc.creator.email.split('@')[0]}
          </span>
        )}
      </div>
    </div>
  );
};
