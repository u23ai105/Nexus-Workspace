import React, { useState } from 'react';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Pencil, Download, Trash2, RotateCcw, FileImage, File, ExternalLink, FolderInput } from 'lucide-react';
import { WorkspaceItemCard } from './WorkspaceItemCard';

export interface FileItem {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  url: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    name?: string | null;
    email: string;
  };
}

interface FileCardProps {
  file: FileItem;
  onOpen: (file: FileItem) => void;
  onRename: (id: string, newFilename: string) => void;
  onArchiveToggle: (id: string, isArchived: boolean) => void;
  onDeletePermanent: (id: string) => void;
  onMoveToFolder?: (id: string, type: 'FILE') => void;
  userRole?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export const FileCard: React.FC<FileCardProps> = ({
  file,
  onOpen,
  onRename,
  onArchiveToggle,
  onDeletePermanent,
  onMoveToFolder,
  userRole = 'VIEWER',
  draggable,
  onDragStart,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);



  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Use the native a tag with download attribute pointing to the URL
    // (This works for signed URLs that provide content-disposition, or at least opens in a new tab to download)
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.filename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  const dropdownMenuItems = (
    <>
      <DropdownMenuItem onClick={() => onOpen(file)} className="hover:bg-muted focus:bg-muted cursor-pointer">
        <ExternalLink className="mr-2 h-4 w-4" /> Open
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setIsRenaming(true)} className="hover:bg-muted focus:bg-muted cursor-pointer">
        <Pencil className="mr-2 h-4 w-4" /> Rename
      </DropdownMenuItem>
      {onMoveToFolder && (
        <DropdownMenuItem onClick={() => onMoveToFolder(file.id, 'FILE')} className="hover:bg-muted focus:bg-muted cursor-pointer">
          <FolderInput className="mr-2 h-4 w-4" /> Move to Folder
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleDownload} className="hover:bg-muted focus:bg-muted cursor-pointer">
        <Download className="mr-2 h-4 w-4" /> Download
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      {file.isArchived ? (
        <>
          <DropdownMenuItem onClick={() => onArchiveToggle(file.id, false)} className="text-success hover:bg-muted focus:bg-muted focus:text-success cursor-pointer">
            <RotateCcw className="mr-2 h-4 w-4" /> Restore
          </DropdownMenuItem>
          {(userRole === 'OWNER' || userRole === 'ADMIN') && (
            <DropdownMenuItem onClick={() => onDeletePermanent(file.id)} className="text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive cursor-pointer">
              <Trash2 className="mr-2 h-4 w-4" /> Delete Forever
            </DropdownMenuItem>
          )}
        </>
      ) : (
        <DropdownMenuItem onClick={() => onArchiveToggle(file.id, true)} className="text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive cursor-pointer">
          <Trash2 className="mr-2 h-4 w-4" /> Move to Trash
        </DropdownMenuItem>
      )}
    </>
  );

  return (
    <WorkspaceItemCard
      title={file.filename}
      icon={file.mimeType.startsWith('image/') ? <FileImage className="w-5 h-5" /> : <File className="w-5 h-5" />}
      isRenaming={isRenaming}
      onRenameStart={() => setIsRenaming(true)}
      onRenameSubmit={(newTitle) => {
        onRename(file.id, newTitle);
        setIsRenaming(false);
      }}
      onRenameCancel={() => setIsRenaming(false)}
      onClick={() => onOpen(file)}
      showDropdown={userRole !== 'VIEWER'}
      dropdownMenuItems={dropdownMenuItems}
      footerLeft={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
      footerRight={file.creator ? (file.creator.name || file.creator.email.split('@')[0]) : 'File'}
      draggable={draggable}
      onDragStart={onDragStart}
    />
  );
};
