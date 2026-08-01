import React, { useState, useRef, useEffect } from 'react';
import { Folder } from 'lucide-react';

export interface FolderCardProps {
  folder: any;
  onOpen: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onArchiveToggle: (id: string, isArchived: boolean) => void;
  onDeletePermanent: (id: string) => void;
  userRole?: string;
}

export const FolderCard: React.FC<FolderCardProps> = ({
  folder,
  onOpen,
  onRename,
  onArchiveToggle,
  onDeletePermanent,
  userRole = 'VIEWER',
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [titleInput, setTitleInput] = useState(folder.name);
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
    if (titleInput.trim() && titleInput !== folder.name) {
      onRename(folder.id, titleInput.trim());
    }
    setIsRenaming(false);
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
      onClick={() => !isRenaming && onOpen(folder.id)}
      className="premium-card group relative flex flex-col justify-between p-6 cursor-pointer min-h-[12rem] border-2 border-transparent hover:border-primary/20"
    >
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0 mr-2">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
              <Folder size={20} fill="currentColor" className="opacity-80" />
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
              <h3 className="font-medium text-foreground truncate text-base group-hover:text-primary transition-colors">
                {folder.name}
              </h3>
            )}
          </div>

          {userRole !== 'VIEWER' && (
            <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="p-1.5 text-muted-foreground hover:bg-muted/80 hover:text-foreground rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-popover border border-border rounded-md shadow-lg py-1 z-50 divide-y divide-border">
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
                  </div>
                  <div className="py-1">
                    {folder.isArchived ? (
                      <>
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            onArchiveToggle(folder.id, false);
                          }}
                          className="w-full px-3 py-1.5 text-left text-sm text-primary hover:bg-primary/10 flex items-center space-x-2"
                        >
                          <span>♻️</span>
                          <span>Restore</span>
                        </button>
                        {(userRole === 'OWNER' || userRole === 'ADMIN') && (
                          <button
                            onClick={() => {
                              setIsMenuOpen(false);
                              onDeletePermanent(folder.id);
                            }}
                            className="w-full px-3 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10 flex items-center space-x-2"
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
                          onArchiveToggle(folder.id, true);
                        }}
                        className="w-full px-3 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10 flex items-center space-x-2"
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
        
        <p className="text-sm text-muted-foreground opacity-70">
          Folder
        </p>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs text-muted-foreground font-medium">
        <span className="flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
          <span>{formatDate(folder.updatedAt)}</span>
        </span>
      </div>
    </div>
  );
};
