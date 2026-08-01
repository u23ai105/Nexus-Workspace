import React, { useState } from 'react';
import { Folder, ChevronRight, ChevronDown, Plus, MoreVertical, Edit2, Trash2 } from 'lucide-react';

interface FolderSidebarProps {
  folders: any[];
  currentFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (parentId: string | null, name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  userRole: string;
}

export const FolderSidebar: React.FC<FolderSidebarProps> = ({
  folders,
  currentFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  userRole
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showMenuId, setShowMenuId] = useState<string | null>(null);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderFolderTree = (parentId: string | null, depth = 0) => {
    const children = folders.filter(f => f.parentId === parentId);
    if (children.length === 0) return null;

    return (
      <ul className={`space-y-0.5 ${depth > 0 ? 'ml-4 border-l border-border/50 pl-2 mt-1' : ''}`}>
        {children.map(folder => {
          const hasChildren = folders.some(f => f.parentId === folder.id);
          const isExpanded = expanded[folder.id];
          const isSelected = currentFolderId === folder.id;
          const isEditing = editingId === folder.id;

          return (
            <li key={folder.id}>
              <div
                className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors ${
                  isSelected ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                onClick={() => onSelectFolder(folder.id)}
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {hasChildren ? (
                    <button onClick={(e) => toggleExpand(folder.id, e)} className="p-0.5 hover:bg-muted-foreground/20 rounded-sm">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  ) : (
                    <span className="w-5 inline-block" />
                  )}
                  <Folder size={14} className={isSelected ? 'text-primary' : 'text-muted-foreground'} />
                  
                  {isEditing ? (
                    <form 
                      className="flex-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (editName.trim()) {
                          onRenameFolder(folder.id, editName.trim());
                        }
                        setEditingId(null);
                      }}
                    >
                      <input
                        type="text"
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onBlur={() => {
                          if (editName.trim() && editName !== folder.name) onRenameFolder(folder.id, editName.trim());
                          setEditingId(null);
                        }}
                        className="w-full bg-background border border-primary px-1 py-0.5 rounded-sm text-xs focus:outline-none"
                        onClick={e => e.stopPropagation()}
                      />
                    </form>
                  ) : (
                    <span className="truncate">{folder.name}</span>
                  )}
                </div>

                {!isEditing && userRole !== 'VIEWER' && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateFolder(folder.id, 'New Folder');
                        setExpanded(prev => ({ ...prev, [folder.id]: true }));
                      }}
                      className="p-1 hover:bg-muted-foreground/20 rounded-sm text-muted-foreground hover:text-foreground"
                      title="New Subfolder"
                    >
                      <Plus size={12} />
                    </button>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenuId(showMenuId === folder.id ? null : folder.id);
                        }}
                        className="p-1 hover:bg-muted-foreground/20 rounded-sm text-muted-foreground hover:text-foreground"
                      >
                        <MoreVertical size={12} />
                      </button>
                      
                      {showMenuId === folder.id && (
                        <div 
                          className="absolute right-0 top-full mt-1 w-32 bg-card border border-border rounded-md shadow-lg py-1 z-50"
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              setEditName(folder.name);
                              setEditingId(folder.id);
                              setShowMenuId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted flex items-center gap-2"
                          >
                            <Edit2 size={12} /> Rename
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete folder and all contents?')) {
                                onDeleteFolder(folder.id);
                              }
                              setShowMenuId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {isExpanded && renderFolderTree(folder.id, depth + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  // Close menu when clicking outside
  React.useEffect(() => {
    const closeMenu = () => setShowMenuId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  return (
    <div className="w-64 border-r border-border/50 bg-muted/10 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground/80">Folders</h3>
        {userRole !== 'VIEWER' && (
          <button
            onClick={() => onCreateFolder(null, 'New Folder')}
            className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
            title="New Root Folder"
          >
            <Plus size={16} />
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        <div 
          className={`group flex items-center gap-2 px-2 py-1.5 mb-2 rounded-md cursor-pointer text-sm transition-colors ${
            currentFolderId === null ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          onClick={() => onSelectFolder(null)}
        >
          <Folder size={16} className={currentFolderId === null ? 'text-primary' : 'text-muted-foreground'} />
          <span>Root</span>
        </div>
        
        {renderFolderTree(null)}
      </div>
    </div>
  );
};
