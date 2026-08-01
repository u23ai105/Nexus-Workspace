import React, { useState, useEffect, useRef } from 'react';

export interface DocumentItem {
  id: string;
  title: string;
  type?: 'TEXT' | 'CANVAS';
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
  userRole?: string;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  doc,
  onOpen,
  onRename,
  onDuplicate,
  onArchiveToggle,
  onDeletePermanent,
  userRole = 'VIEWER',
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [titleInput, setTitleInput] = useState(doc.title);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

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
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card hover:border-primary/50 hover:shadow-xl transition-all duration-300 cursor-pointer h-[18rem]"
    >
      {/* Thumbnail Preview Area */}
      <div className={`relative h-[60%] w-full flex-shrink-0 flex items-center justify-center p-4 border-b border-border/30 ${
        doc.type === 'CANVAS' 
          ? 'bg-gradient-to-br from-purple-500/10 via-background to-purple-500/5' 
          : 'bg-gradient-to-br from-blue-500/10 via-background to-blue-500/5'
      }`}>
        {/* Background Pattern */}
        {doc.type === 'CANVAS' ? (
          <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '16px 16px' }} />
        ) : (
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px)', backgroundSize: '100% 24px', backgroundPositionY: '8px' }} />
        )}
        
        {/* Central Icon */}
        <div className={`relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300 ${
          doc.type === 'CANVAS' 
            ? 'bg-gradient-to-tr from-purple-500 to-indigo-500 text-white shadow-purple-500/30' 
            : 'bg-gradient-to-tr from-blue-500 to-cyan-500 text-white shadow-blue-500/30'
        }`}>
          {doc.type === 'CANVAS' ? (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
        </div>

        {/* Action Menu Trigger (Top Right overlay) */}
        {userRole !== 'VIEWER' && (
          <div className="absolute top-2 right-2 z-20" ref={menuRef} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
              className="p-1.5 bg-background/50 backdrop-blur-md border border-border/50 text-foreground hover:bg-background/80 hover:text-primary rounded-lg transition-colors shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-popover/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl py-1 z-50 divide-y divide-border/50">
                <div className="py-1 px-1">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsRenaming(true);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-popover-foreground hover:bg-muted/80 hover:text-primary rounded-md flex items-center space-x-3 transition-colors"
                  >
                    <span>✏️</span>
                    <span className="font-medium">Rename</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDuplicate(doc);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-popover-foreground hover:bg-muted/80 hover:text-primary rounded-md flex items-center space-x-3 transition-colors"
                  >
                    <span>📋</span>
                    <span className="font-medium">Duplicate</span>
                  </button>
                </div>

                <div className="py-1 px-1">
                  <button
                    onClick={handleExportMarkdown}
                    className="w-full px-3 py-2 text-left text-sm text-popover-foreground hover:bg-muted/80 hover:text-primary rounded-md flex items-center space-x-3 transition-colors"
                  >
                    <span>📄</span>
                    <span className="font-medium">Export as .md</span>
                  </button>
                  <button
                    onClick={handleExportHtml}
                    className="w-full px-3 py-2 text-left text-sm text-popover-foreground hover:bg-muted/80 hover:text-primary rounded-md flex items-center space-x-3 transition-colors"
                  >
                    <span>🌐</span>
                    <span className="font-medium">Export as HTML</span>
                  </button>
                </div>

                <div className="py-1 px-1">
                  {doc.isArchived ? (
                    <>
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          onArchiveToggle(doc.id, false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-emerald-500 hover:bg-emerald-500/10 rounded-md flex items-center space-x-3 transition-colors font-medium"
                      >
                        <span>♻️</span>
                        <span>Restore</span>
                      </button>
                      
                      {(userRole === 'OWNER' || userRole === 'ADMIN') && (
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            onDeletePermanent(doc.id);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 rounded-md flex items-center space-x-3 transition-colors font-medium"
                        >
                          <span>🗑️</span>
                          <span>Delete Forever</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onArchiveToggle(doc.id, true);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 rounded-md flex items-center space-x-3 transition-colors font-medium"
                    >
                      <span>🗑️</span>
                      <span>Move to Trash</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metadata Footer Area */}
      <div className="flex flex-col justify-between p-4 flex-1 bg-card">
        <div className="mb-2">
          {isRenaming ? (
            <form onSubmit={handleRenameSubmit} className="w-full" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={() => setIsRenaming(false)}
                autoFocus
                className="w-full bg-muted/50 text-foreground text-sm font-medium px-2 py-1.5 rounded-md border border-primary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all shadow-inner"
              />
            </form>
          ) : (
            <h3 className="font-semibold text-foreground truncate text-[15px] tracking-tight group-hover:text-primary transition-colors" title={doc.title}>
              {doc.title}
            </h3>
          )}
          <p className="text-xs text-muted-foreground/80 mt-1.5 flex items-center gap-1.5 font-medium">
            <span className={`w-2 h-2 rounded-full shadow-sm ${doc.type === 'CANVAS' ? 'bg-purple-500 shadow-purple-500/50' : 'bg-blue-500 shadow-blue-500/50'}`} />
            {doc.type === 'CANVAS' ? 'Canvas Board' : 'Text Document'}
          </p>
        </div>
        
        <div className="flex items-center justify-between text-[11px] text-muted-foreground/70 font-medium mt-auto">
          <span className="flex items-center space-x-1.5">
            <span>Edited {formatDate(doc.updatedAt)}</span>
          </span>
          {doc.creator && (
            <span className="bg-muted/80 px-2.5 py-1 rounded-md text-foreground/70 truncate max-w-[80px]" title={doc.creator.name || doc.creator.email}>
              {doc.creator.name || doc.creator.email.split('@')[0]}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
