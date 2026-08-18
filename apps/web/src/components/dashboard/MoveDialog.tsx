import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Folder } from 'lucide-react';
import useSWR from 'swr';

interface MoveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (targetFolderId: string | null) => Promise<void>;
  workspaceId: string;
  token: string;
  serverUrl: string;
  currentItemId: string; // To prevent moving folder into itself
  currentItemType: 'DOCUMENT' | 'FOLDER' | 'FILE';
}

export const MoveDialog: React.FC<MoveDialogProps> = ({
  isOpen,
  onClose,
  onMove,
  workspaceId,
  token,
  serverUrl,
  currentItemId,
  currentItemType
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetcher = async ([url, jwt]: [string, string]) => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${jwt}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch');
    return data;
  };

  const { data } = useSWR(
    isOpen ? [`${serverUrl}/api/folders?workspaceId=${workspaceId}`, token] : null,
    fetcher
  );

  const folders = data?.folders || [];

  // Filter out the item itself and its descendants (simple check, backend does deep check)
  const availableFolders = folders.filter((f: any) => {
    if (currentItemType === 'FOLDER' && f.id === currentItemId) return false;
    // We don't have deep descendant checking on frontend easily without building a tree, 
    // but we trust the backend to reject invalid moves.
    return true;
  });

  const handleMove = async () => {
    setIsMoving(true);
    setError(null);
    try {
      await onMove(selectedFolderId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to move item');
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move to Folder</DialogTitle>
        </DialogHeader>
        
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto py-2">
          <button
            onClick={() => setSelectedFolderId(null)}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedFolderId === null 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-muted text-foreground'
            }`}
          >
            <Folder className="w-4 h-4 mr-2" />
            Workspace Root
          </button>
          
          {availableFolders.map((folder: any) => (
            <button
              key={folder.id}
              onClick={() => setSelectedFolderId(folder.id)}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedFolderId === folder.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              <Folder className="w-4 h-4 mr-2" fill={selectedFolderId === folder.id ? "currentColor" : "none"} />
              {folder.name}
            </button>
          ))}
          
          {folders.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-4">
              No folders available in this workspace.
            </p>
          )}
        </div>

        <DialogFooter className="sm:justify-end mt-4">
          <Button variant="outline" onClick={onClose} disabled={isMoving}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={isMoving}>
            {isMoving ? 'Moving...' : 'Move'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
