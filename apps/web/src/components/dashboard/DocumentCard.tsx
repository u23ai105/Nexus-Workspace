import React, { useState } from 'react';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Pencil, Copy, Download, Trash2, RotateCcw, LayoutDashboard, FileText, FolderInput } from 'lucide-react';
import { WorkspaceItemCard } from './WorkspaceItemCard';

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
  favorites?: any[];
}

interface DocumentCardProps {
  doc: DocumentItem;
  onOpen: (doc: DocumentItem) => void;
  onRename: (id: string, newTitle: string) => void;
  onDuplicate: (doc: DocumentItem) => void;
  onArchiveToggle: (id: string, isArchived: boolean) => void;
  onDeletePermanent: (id: string) => void;
  onMoveToFolder?: (id: string, type: 'DOCUMENT') => void;
  onToggleStar?: (id: string, isStarred: boolean) => void;
  userRole?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  doc,
  onOpen,
  onRename,
  onDuplicate,
  onArchiveToggle,
  onDeletePermanent,
  onMoveToFolder,
  onToggleStar,
  userRole = 'VIEWER',
  draggable,
  onDragStart,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);

  const handleExportMarkdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const content = doc.textContent || `# ${doc.title}\n\nNo content preview available.`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.toLowerCase().replace(/\\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportHtml = (e: React.MouseEvent) => {
    e.stopPropagation();
    const content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${doc.title}</title><style>body{font-family:sans-serif;line-height:1.6;padding:2rem;max-width:800px;margin:0 auto;color:#222;}</style></head><body><h1>${doc.title}</h1><p>${doc.textContent || 'No content preview available.'}</p></body></html>`;
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.toLowerCase().replace(/\\s+/g, '-')}.html`;
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

  const dropdownMenuItems = (
    <>
      <DropdownMenuItem onClick={() => setIsRenaming(true)} className="hover:bg-muted focus:bg-muted cursor-pointer">
        <Pencil className="mr-2 h-4 w-4" /> Rename
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onDuplicate(doc)} className="hover:bg-muted focus:bg-muted cursor-pointer">
        <Copy className="mr-2 h-4 w-4" /> Duplicate
      </DropdownMenuItem>
      {onMoveToFolder && (
        <DropdownMenuItem onClick={() => onMoveToFolder(doc.id, 'DOCUMENT')} className="hover:bg-muted focus:bg-muted cursor-pointer">
          <FolderInput className="mr-2 h-4 w-4" /> Move to Folder
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleExportMarkdown} className="hover:bg-muted focus:bg-muted cursor-pointer">
        <Download className="mr-2 h-4 w-4" /> Export as .md
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleExportHtml} className="hover:bg-muted focus:bg-muted cursor-pointer">
        <Download className="mr-2 h-4 w-4" /> Export as HTML
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      {doc.isArchived ? (
        <>
          <DropdownMenuItem onClick={() => onArchiveToggle(doc.id, false)} className="text-success hover:bg-muted focus:bg-muted focus:text-success cursor-pointer">
            <RotateCcw className="mr-2 h-4 w-4" /> Restore
          </DropdownMenuItem>
          {(userRole === 'OWNER' || userRole === 'ADMIN') && (
            <DropdownMenuItem onClick={() => onDeletePermanent(doc.id)} className="text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive cursor-pointer">
              <Trash2 className="mr-2 h-4 w-4" /> Delete Forever
            </DropdownMenuItem>
          )}
        </>
      ) : (
        <DropdownMenuItem onClick={() => onArchiveToggle(doc.id, true)} className="text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive cursor-pointer">
          <Trash2 className="mr-2 h-4 w-4" /> Move to Trash
        </DropdownMenuItem>
      )}
    </>
  );

  return (
    <WorkspaceItemCard
      title={doc.title}
      icon={doc.type === 'CANVAS' ? <LayoutDashboard className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
      isRenaming={isRenaming}
      onRenameStart={() => setIsRenaming(true)}
      onRenameSubmit={(newTitle) => {
        onRename(doc.id, newTitle);
        setIsRenaming(false);
      }}
      onRenameCancel={() => setIsRenaming(false)}
      onClick={() => onOpen(doc)}
      showDropdown={userRole !== 'VIEWER'}
      dropdownMenuItems={dropdownMenuItems}
      footerLeft={`Edited ${formatDate(doc.updatedAt)}`}
      footerRight={doc.creator ? (doc.creator.name || doc.creator.email.split('@')[0]) : ''}
      isStarred={doc.favorites && doc.favorites.length > 0}
      onToggleStar={onToggleStar ? (e) => {
        e.stopPropagation();
        onToggleStar(doc.id, doc.favorites && doc.favorites.length > 0 ? true : false);
      } : undefined}
      draggable={draggable}
      onDragStart={onDragStart}
    />
  );
};
