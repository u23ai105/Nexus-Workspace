import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import useSWR from 'swr';
import { DocumentCard, type DocumentItem } from './DocumentCard';
import { FolderCard } from './FolderCard';
import { FileCard } from './FileCard';
import { MoveDialog } from './MoveDialog';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

import { 
  Trash2, Folder
} from 'lucide-react';

export interface FileItem {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: string;
  uploader?: { name: string; email: string };
}

interface DocumentDashboardProps {
  token: string;
  serverUrl: string;
  isTrashRoute?: boolean;
}

export const DocumentDashboard: React.FC<DocumentDashboardProps> = ({
  token,
  serverUrl,
  isTrashRoute = false
}) => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { userRole, setUserRole } = useOutletContext<any>();
  
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery] = useState('');

  // Drag and drop / Move state
  const [draggedItem, setDraggedItem] = useState<{ id: string, type: 'DOCUMENT' | 'FOLDER' | 'FILE' } | null>(null);
  const [dragTargetFolder, setDragTargetFolder] = useState<string | null>(null);
  
  // Move Dialog state
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [itemToMove, setItemToMove] = useState<{ id: string, type: 'DOCUMENT' | 'FOLDER' | 'FILE' } | null>(null);

  const fetcher = async ([url, jwt]: [string, string]) => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${jwt}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch');
    return data;
  };

  const docsKey = workspaceId ? [`${serverUrl}/api/documents?workspaceId=${workspaceId}&isArchived=${isTrashRoute}`, token] : null;
  const filesKey = workspaceId ? [`${serverUrl}/api/files?workspaceId=${workspaceId}&isArchived=${isTrashRoute}`, token] : null;
  const { data: docsData, error: docsError, isLoading: docsLoading, mutate: mutateDocs } = useSWR(docsKey, fetcher, { refreshInterval: 5000 });
  const { data: filesData, error: filesError, isLoading: filesLoading, mutate: mutateFiles } = useSWR(filesKey, fetcher, { refreshInterval: 5000 });
  const { data: foldersData, mutate: mutateFolders } = useSWR(workspaceId ? [`${serverUrl}/api/workspaces/${workspaceId}/folders?isArchived=${isTrashRoute}`, token] : null, fetcher, { refreshInterval: 5000 });

  const documents = docsData?.documents || [];
  const files = filesData?.files || [];
  const folders = foldersData?.folders || [];
  const loading = docsLoading || filesLoading;
  const error = (docsError?.message || filesError?.message) || null;

  useEffect(() => {
    if (docsData?.userRole && setUserRole) {
      setUserRole(docsData.userRole);
    }
  }, [docsData?.userRole, setUserRole]);

  // Global events for folder/file creation triggered from WorkspaceLayout sidebar
  useEffect(() => {
    const onFolderCreated = () => mutateFolders();
    const onFileUploaded = () => mutateFiles();
    
    window.addEventListener('nexus-folder-created', onFolderCreated);
    window.addEventListener('nexus-file-uploaded', onFileUploaded);
    
    return () => {
      window.removeEventListener('nexus-folder-created', onFolderCreated);
      window.removeEventListener('nexus-file-uploaded', onFileUploaded);
    };
  }, [mutateFolders, mutateFiles]);

  const handleDeleteFile = async (e: React.MouseEvent, fileId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to permanently delete this file?')) return;
    try {
      const res = await fetch(`${serverUrl}/api/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        mutateFiles();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete file');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting file');
    }
  };

  const handleEmptyTrash = async () => {
    try {
      const res = await fetch(`${serverUrl}/api/workspaces/${workspaceId}/trash`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        mutateDocs();
        mutateFiles();
        mutateFolders();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to empty trash');
      }
    } catch (err) {
      console.error(err);
      alert('Error emptying trash');
    }
  };

  const handleSelectDocument = (doc: DocumentItem) => {
    navigate(`/w/${workspaceId}/d/${doc.id}`);
  };

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
      if (res.ok) mutateDocs();
    } catch (err) {
      console.error('Failed to rename document:', err);
    }
  };

  const handleRenameFile = async (id: string, newTitle: string) => {
    try {
      const res = await fetch(`${serverUrl}/api/files/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ filename: newTitle }),
      });
      if (res.ok) mutateFiles();
    } catch (err) {
      console.error('Failed to rename file:', err);
    }
  };

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
        mutateDocs();
      }
    } catch (err) {
      console.error('Failed to duplicate document:', err);
    }
  };

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
      if (res.ok) mutateDocs();
    } catch (err) {
      console.error('Failed to archive document:', err);
    }
  };

  const handleDeletePermanent = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this document? This action cannot be undone.')) return;
    try {
      const res = await fetch(`${serverUrl}/api/documents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) mutateDocs();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const handleRenameFolder = async (id: string, name: string) => {
    try {
      const res = await fetch(`${serverUrl}/api/workspaces/${workspaceId}/folders/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name })
      });
      if (res.ok) mutateFolders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFolder = async (id: string) => {
    try {
      const res = await fetch(`${serverUrl}/api/workspaces/${workspaceId}/folders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        if (currentFolderId === id) setCurrentFolderId(null);
        mutateFolders();
        mutateDocs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStar = async (id: string, isStarred: boolean) => {
    try {
      if (isStarred) {
        await fetch(`${serverUrl}/api/documents/${id}/favorites`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await fetch(`${serverUrl}/api/documents/${id}/favorites`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      mutateDocs();
    } catch (err) {
      console.error('Failed to toggle star', err);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string, type: 'DOCUMENT' | 'FOLDER' | 'FILE') => {
    setDraggedItem({ id, type });
    // e.dataTransfer.setData('text/plain', JSON.stringify({ id, type }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
    
    // Prevent dropping a folder into itself
    if (draggedItem?.type === 'FOLDER' && draggedItem.id === folderId) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    
    if (dragTargetFolder !== folderId) {
      setDragTargetFolder(folderId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    if (dragTargetFolder === folderId) {
      setDragTargetFolder(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    setDragTargetFolder(null);
    
    if (!draggedItem) return;
    
    // Prevent moving into current folder
    if (targetFolderId === currentFolderId && currentFolderId !== null) return;
    
    // Prevent moving root to root (handled implicitly if currentFolderId is null and target is root)
    if (targetFolderId === 'root' && currentFolderId === null) return;
    
    const actualTargetFolderId = targetFolderId === 'root' ? null : targetFolderId;
    
    try {
      await executeMove(draggedItem.id, draggedItem.type, actualTargetFolderId);
    } catch (err: any) {
      alert(err.message || 'Failed to move item');
    } finally {
      setDraggedItem(null);
    }
  };

  const executeMove = async (id: string, type: 'DOCUMENT' | 'FOLDER' | 'FILE', targetFolderId: string | null) => {
    try {
      if (type === 'DOCUMENT') {
        const res = await fetch(`${serverUrl}/api/documents/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ folderId: targetFolderId }),
        });
        if (!res.ok) throw new Error(await res.text());
        mutateDocs();
      } else if (type === 'FOLDER') {
        const res = await fetch(`${serverUrl}/api/workspaces/${workspaceId}/folders/${id}/move`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ parentId: targetFolderId }),
        });
        if (!res.ok) throw new Error(await res.text());
        mutateFolders();
      } else if (type === 'FILE') {
        const res = await fetch(`${serverUrl}/api/files/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ folderId: targetFolderId }),
        });
        if (!res.ok) throw new Error(await res.text());
        mutateFiles();
      }
    } catch (err: any) {
      console.error('Failed to move item:', err);
      throw err;
    }
  };

  const handleOpenMoveDialog = (id: string, type: 'DOCUMENT' | 'FOLDER' | 'FILE') => {
    setItemToMove({ id, type });
    setMoveDialogOpen(true);
  };

  const filteredDocs = documents.filter((doc: any) => {
    if (!isTrashRoute && doc.folderId !== currentFolderId) return false;
    const query = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(query) ||
      (doc.textContent && doc.textContent.toLowerCase().includes(query))
    );
  });

  const isRootDashboard = !isTrashRoute && !currentFolderId && !searchQuery;
  const favoriteDocs = documents.filter((d: any) => d.favorites?.length > 0);
  const recentDocs = [...documents].sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 6);

  return (
    <div className="flex-1 flex flex-col min-w-0 p-4 sm:p-6 lg:p-8 relative z-10 bg-background overflow-y-auto">
      <div className="max-w-[1600px] mx-auto w-full flex-1 flex flex-col lg:flex-row gap-8">
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              {isTrashRoute ? 'Trash' : 'Workspace'}
            </h1>
            {isTrashRoute && (userRole === 'OWNER' || userRole === 'ADMIN') && (
              <AlertDialog>
                <AlertDialogTrigger>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Trash2 className="w-4 h-4" />
                    Empty Trash
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Empty Trash?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes all items currently in Trash. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleEmptyTrash} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Empty Trash
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col space-y-8">
              <div className="space-y-4">
                <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-10">
              
              {isRootDashboard && (
                <>
                  {/* Continue Working Section */}
                  <section>
                    <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Continue Working</h2>
                    {recentDocs.length > 0 ? (
                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4" style={{ gridAutoRows: '1fr' }}>
                        {recentDocs.map((doc: any) => (
                          <DocumentCard
                            key={`recent-${doc.id}`}
                            doc={doc}
                            onOpen={handleSelectDocument}
                            onRename={handleRename}
                            onDuplicate={handleDuplicate}
                            onArchiveToggle={handleArchiveToggle}
                            onDeletePermanent={handleDeletePermanent}
                            onToggleStar={handleToggleStar}
                            userRole={userRole}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center border border-dashed border-border/60 rounded-xl bg-muted/5 flex flex-col items-center">
                        <p className="text-sm text-muted-foreground">Nothing recently opened</p>
                      </div>
                    )}
                  </section>

                  {/* Favorites Section */}
                  <section>
                    <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider flex items-center">
                      <svg className="w-4 h-4 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                      Favorites
                    </h2>
                    {favoriteDocs.length > 0 ? (
                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4">
                        {favoriteDocs.map((doc: any) => (
                          <DocumentCard
                            key={`fav-${doc.id}`}
                            doc={doc}
                            onOpen={handleSelectDocument}
                            onRename={handleRename}
                            onDuplicate={handleDuplicate}
                            onArchiveToggle={handleArchiveToggle}
                            onDeletePermanent={handleDeletePermanent}
                            onToggleStar={handleToggleStar}
                            userRole={userRole}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center border border-dashed border-border/60 rounded-xl bg-muted/5 flex flex-col items-center">
                        <p className="text-sm text-muted-foreground">Star important documents to find them here</p>
                      </div>
                    )}
                  </section>
                </>
              )}

              {/* My Drive Section */}
              <section className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {isTrashRoute ? 'Trash Items' : 'My Drive'}
                  </h2>
                  
                  {!isTrashRoute && currentFolderId && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-md border border-border/50">
                      <button 
                        onClick={() => setCurrentFolderId(null)} 
                        onDragOver={(e) => handleDragOver(e, 'root')}
                        onDragLeave={(e) => handleDragLeave(e, 'root')}
                        onDrop={(e) => handleDrop(e, 'root')}
                        className={`hover:text-foreground px-2 py-0.5 rounded transition-colors font-medium ${
                          dragTargetFolder === 'root' && draggedItem 
                            ? 'bg-primary/20 ring-1 ring-primary text-foreground' 
                            : 'hover:bg-muted'
                        }`}
                      >
                        My Drive
                      </button>
                      {(() => {
                        const breadcrumbFolders = [];
                        let curr = currentFolderId;
                        while (curr) {
                          const f = folders.find((f: any) => f.id === curr);
                          if (f) {
                            breadcrumbFolders.unshift(f);
                            curr = f.parentId;
                          } else {
                            break;
                          }
                        }
                        return breadcrumbFolders.map((f) => (
                          <React.Fragment key={f.id}>
                            <span className="opacity-40">/</span>
                            <button 
                              onClick={() => setCurrentFolderId(f.id)} 
                              onDragOver={(e) => handleDragOver(e, f.id)}
                              onDragLeave={(e) => handleDragLeave(e, f.id)}
                              onDrop={(e) => handleDrop(e, f.id)}
                              className={`hover:text-foreground px-2 py-0.5 rounded transition-colors truncate max-w-[120px] font-medium ${
                                dragTargetFolder === f.id && draggedItem 
                                  ? 'bg-primary/20 ring-1 ring-primary text-foreground' 
                                  : 'hover:bg-muted'
                              }`}
                            >
                              {f.name}
                            </button>
                          </React.Fragment>
                        ));
                      })()}
                    </div>
                  )}
                </div>

                {/* Move Dialog */}
                {moveDialogOpen && itemToMove && (
                    <MoveDialog
                      isOpen={moveDialogOpen}
                      onClose={() => setMoveDialogOpen(false)}
                      onMove={async (targetFolderId) => {
                        await executeMove(itemToMove.id, itemToMove.type, targetFolderId);
                      }}
                      workspaceId={workspaceId!}
                      token={token}
                      serverUrl={serverUrl}
                      currentItemId={itemToMove.id}
                      currentItemType={itemToMove.type}
                    />
                )}

                {folders.filter((f: any) => !isTrashRoute ? f.parentId === currentFolderId : true).length === 0 &&
                 filteredDocs.length === 0 &&
                 files.filter((f: any) => !isTrashRoute ? f.folderId === currentFolderId : true).length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 min-h-[300px] border border-dashed border-border/60 rounded-xl bg-muted/5">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
                      {isTrashRoute ? <Trash2 className="w-6 h-6 opacity-50" /> : <Folder className="w-6 h-6 opacity-50" />}
                    </div>
                    <h3 className="text-base font-medium text-foreground mb-1">
                      {searchQuery ? 'No matching items' : (isTrashRoute ? 'Trash is empty' : 'Nothing here yet')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {!isTrashRoute && !searchQuery ? 'Create your first document' : ''}
                    </p>
                  </div>
                ) : (
                  <div 
                    className={`flex-1 rounded-xl transition-colors ${dragTargetFolder === 'root' ? 'bg-primary/5 ring-2 ring-primary ring-inset' : ''}`}
                    onDragOver={(e) => handleDragOver(e, 'root')}
                    onDragLeave={(e) => handleDragLeave(e, 'root')}
                    onDrop={(e) => handleDrop(e, 'root')}
                  >
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4 p-1">
                      {/* Folders */}
                    {folders.filter((f: any) => {
                      if (!isTrashRoute && f.parentId !== currentFolderId) return false;
                      const query = searchQuery.toLowerCase();
                      return f.name.toLowerCase().includes(query);
                    }).map((folder: any) => (
                      <FolderCard
                        key={folder.id}
                        folder={folder}
                        onOpen={setCurrentFolderId}
                        onRename={handleRenameFolder}
                        onArchiveToggle={(id, isArchived) => {
                          fetch(serverUrl + "/api/workspaces/" + workspaceId + "/folders/" + id, {
                             method: "PATCH",
                             headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                             body: JSON.stringify({ isArchived })
                          }).then(() => mutateFolders())
                        }}
                        onDeletePermanent={handleDeleteFolder}
                        onMoveToFolder={!isTrashRoute ? handleOpenMoveDialog : undefined}
                        userRole={userRole}
                        draggable={userRole !== 'VIEWER'}
                        onDragStart={(e) => handleDragStart(e, folder.id, 'FOLDER')}
                        onDragOver={(e) => handleDragOver(e, folder.id)}
                        onDragLeave={(e) => handleDragLeave(e, folder.id)}
                        onDrop={(e) => handleDrop(e, folder.id)}
                        isDragTarget={dragTargetFolder === folder.id}
                      />
                    ))}

                    {/* Documents */}
                    {filteredDocs.map((doc: any) => (
                      <DocumentCard
                        key={doc.id}
                        doc={doc}
                        onOpen={handleSelectDocument}
                        onRename={handleRename}
                        onDuplicate={handleDuplicate}
                        onArchiveToggle={handleArchiveToggle}
                        onDeletePermanent={handleDeletePermanent}
                        onToggleStar={handleToggleStar}
                        onMoveToFolder={!isTrashRoute ? handleOpenMoveDialog : undefined}
                        userRole={userRole}
                        draggable={userRole !== 'VIEWER'}
                        onDragStart={(e) => handleDragStart(e, doc.id, 'DOCUMENT')}
                      />
                    ))}

                    {/* Files */}
                    {files.filter((f: any) => {
                      if (!isTrashRoute && f.folderId !== currentFolderId) return false;
                      const query = searchQuery.toLowerCase();
                      return f.filename.toLowerCase().includes(query);
                    }).map((file: any) => (
                      <FileCard
                        key={file.id}
                        file={file}
                        onOpen={(f) => window.open(f.url, '_blank')}
                        onRename={handleRenameFile}
                        onArchiveToggle={(id, isArchived) => {
                          fetch(serverUrl + "/api/files/" + id, {
                             method: "PATCH",
                             headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                             body: JSON.stringify({ isArchived })
                          }).then(() => mutateFiles())
                        }}
                        onDeletePermanent={(id) => handleDeleteFile({ preventDefault: () => {}, stopPropagation: () => {} } as any, id)}
                        onMoveToFolder={!isTrashRoute ? handleOpenMoveDialog : undefined}
                        userRole={userRole}
                        draggable={userRole !== 'VIEWER'}
                        onDragStart={(e) => handleDragStart(e, file.id, 'FILE')}
                      />
                    ))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
