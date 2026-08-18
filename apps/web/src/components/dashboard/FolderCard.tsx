import React, { useState } from 'react';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Folder, Pencil, Trash2, RotateCcw, FolderInput } from 'lucide-react';
import { WorkspaceItemCard } from './WorkspaceItemCard';

export interface FolderCardProps {
  folder: any;
  onOpen: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onArchiveToggle: (id: string, isArchived: boolean) => void;
  onDeletePermanent: (id: string) => void;
  onMoveToFolder?: (id: string, type: 'FOLDER') => void;
  userRole?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragTarget?: boolean;
}

export const FolderCard: React.FC<FolderCardProps> = ({
  folder,
  onOpen,
  onRename,
  onArchiveToggle,
  onDeletePermanent,
  onMoveToFolder,
  userRole = 'VIEWER',
  draggable,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragTarget,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);

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
      {onMoveToFolder && (
        <DropdownMenuItem onClick={() => onMoveToFolder(folder.id, 'FOLDER')} className="hover:bg-muted focus:bg-muted cursor-pointer">
          <FolderInput className="mr-2 h-4 w-4" /> Move to Folder
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      {folder.isArchived ? (
        <>
          <DropdownMenuItem onClick={() => onArchiveToggle(folder.id, false)} className="text-success hover:bg-muted focus:bg-muted focus:text-success cursor-pointer">
            <RotateCcw className="mr-2 h-4 w-4" /> Restore
          </DropdownMenuItem>
          {(userRole === 'OWNER' || userRole === 'ADMIN') && (
            <DropdownMenuItem onClick={() => onDeletePermanent(folder.id)} className="text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive cursor-pointer">
              <Trash2 className="mr-2 h-4 w-4" /> Delete Forever
            </DropdownMenuItem>
          )}
        </>
      ) : (
        <DropdownMenuItem onClick={() => onArchiveToggle(folder.id, true)} className="text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive cursor-pointer">
          <Trash2 className="mr-2 h-4 w-4" /> Move to Trash
        </DropdownMenuItem>
      )}
    </>
  );

  return (
    <WorkspaceItemCard
      title={folder.name}
      icon={<Folder className="w-5 h-5" fill="currentColor" />}
      isRenaming={isRenaming}
      onRenameStart={() => setIsRenaming(true)}
      onRenameSubmit={(newTitle) => {
        onRename(folder.id, newTitle);
        setIsRenaming(false);
      }}
      onRenameCancel={() => setIsRenaming(false)}
      onClick={() => onOpen(folder.id)}
      showDropdown={userRole !== 'VIEWER'}
      dropdownMenuItems={dropdownMenuItems}
      footerLeft={`Edited ${formatDate(folder.updatedAt)}`}
      footerRight="Folder"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      isDragTarget={isDragTarget}
    />
  );
};
