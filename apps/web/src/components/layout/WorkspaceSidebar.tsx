import React from 'react';
import { NavLink, useParams, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { 
  Plus, FileText, LayoutDashboard, FolderPlus, Upload, Play, X, Trash2, 
  Users, MessageSquare, CheckSquare, Sparkles, Folder 
} from 'lucide-react';

interface WorkspaceSidebarProps {
  isMainSidebarOpen: boolean;
  setIsMainSidebarOpen: (isOpen: boolean) => void;
  userRole: string;
  activePanel: 'workspaceChat' | 'globalChat' | 'ai' | 'tasks' | 'activity' | null;
  togglePanel: (panel: 'workspaceChat' | 'globalChat' | 'ai' | 'tasks' | 'activity' | null) => void;
  onCreateDocument: (type: 'TEXT' | 'CANVAS') => void;
  onCreateFolder: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFollowMe: () => void;
  onManageTeam: () => void;
  isCreating: boolean;
  isUploading: boolean;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  isMainSidebarOpen,
  setIsMainSidebarOpen,
  userRole,
  activePanel,
  togglePanel,
  onCreateDocument,
  onCreateFolder,
  onFileUpload,
  onFollowMe,
  onManageTeam,
  isCreating,
  isUploading,
}) => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const location = useLocation();
  const isTrashRoute = location.pathname.endsWith('/trash');
  
  return (
    <aside 
      id="workspace-sidebar"
      className={`
        fixed md:static top-0 left-0 h-full bg-card/60 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none border-r border-border/60 
        flex flex-col justify-between py-6 z-50 transition-all duration-300 ease-in-out shrink-0 overflow-hidden
        ${isMainSidebarOpen ? 'translate-x-0 w-[256px] px-4 opacity-100' : '-translate-x-full w-0 px-0 opacity-0 border-none'}
      `}
    >
      <div>
        <div className="flex justify-between items-center mb-6 lg:hidden">
          <span className="font-semibold text-sm tracking-tight text-foreground/80 px-2">Menu</span>
          <Button variant="ghost" size="icon" className="h-9 w-9 max-md:min-h-[44px] max-md:min-w-[44px] text-muted-foreground hover:bg-muted/60 hover:text-foreground" onClick={() => setIsMainSidebarOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {userRole !== 'VIEWER' && !isTrashRoute && (
          <div className="flex flex-col space-y-2 mb-8">
            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none w-full">
                <div className="w-full justify-start text-sm h-9 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 px-3 py-2">
                  <Plus className="mr-3 h-4 w-4" />
                  Create New
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={() => onCreateDocument('TEXT')} disabled={isCreating} className="cursor-pointer hover:bg-muted focus:bg-muted">
                  <FileText className="mr-3 h-4 w-4" /> Document
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCreateDocument('CANVAS')} disabled={isCreating} className="cursor-pointer hover:bg-muted focus:bg-muted">
                  <LayoutDashboard className="mr-3 h-4 w-4" /> Canvas Board
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onCreateFolder} className="cursor-pointer hover:bg-muted focus:bg-muted">
                  <FolderPlus className="mr-3 h-4 w-4" /> Folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer hover:bg-muted focus:bg-muted p-0">
                  <label className="cursor-pointer flex items-center px-2 py-1.5 w-full h-full">
                    <Upload className="mr-3 h-4 w-4" />
                    <span>Upload File</span>
                    <input type="file" className="hidden" onChange={onFileUpload} disabled={isUploading} />
                  </label>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              variant="outline" 
              className="w-full justify-start text-sm h-9 px-3 shadow-sm hover:bg-secondary/60 hover:text-foreground"
              onClick={onFollowMe}
            >
              <Play className="mr-3 h-4 w-4" />
              Follow Me
            </Button>
          </div>
        )}

        <nav className="space-y-0.5">
          <NavLink
            to={`/w/${workspaceId}`}
            end
            className={({ isActive }) => `flex w-full items-center justify-start px-3 py-2 text-sm font-medium transition-colors rounded-md hover:bg-secondary/60 hover:text-foreground ${isActive ? 'bg-muted/80 text-foreground' : 'text-muted-foreground'}`}
          >
            <Folder className="mr-3 h-4 w-4" />
            Documents
          </NavLink>

          <NavLink
            to={`/w/${workspaceId}/trash`}
            className={({ isActive }) => `flex w-full items-center justify-start px-3 py-2 text-sm font-medium transition-colors rounded-md hover:bg-secondary/60 hover:text-foreground ${isActive ? 'bg-muted/80 text-foreground' : 'text-muted-foreground'}`}
          >
            <Trash2 className="mr-3 h-4 w-4" />
            Trash
          </NavLink>
          
          <div className="py-2 my-2 border-t border-border/50" />

          <Button
            variant="ghost"
            className={`w-full justify-start px-3 font-medium transition-colors hover:bg-secondary/60 hover:text-foreground ${activePanel === 'ai' ? 'bg-muted/50 text-foreground' : 'text-muted-foreground'}`}
            onClick={() => togglePanel('ai')}
          >
            <Sparkles className="mr-3 h-4 w-4" />
            Workspace AI
          </Button>

          <Button
            variant="ghost"
            className={`w-full justify-start px-3 font-medium transition-colors hover:bg-secondary/60 hover:text-foreground ${activePanel === 'workspaceChat' ? 'bg-muted/50 text-foreground' : 'text-muted-foreground'}`}
            onClick={() => togglePanel('workspaceChat')}
          >
            <MessageSquare className="mr-3 h-4 w-4" />
            Team Chat
          </Button>

          <Button
            variant="ghost"
            className={`w-full justify-start px-3 font-medium transition-colors hover:bg-secondary/60 hover:text-foreground ${activePanel === 'tasks' ? 'bg-muted/50 text-foreground' : 'text-muted-foreground'}`}
            onClick={() => togglePanel('tasks')}
          >
            <CheckSquare className="mr-3 h-4 w-4" />
            Action Items
          </Button>
        </nav>
      </div>

      <div>
        <Button
          variant="ghost"
          className="w-full justify-start px-3 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          onClick={onManageTeam}
        >
          <Users className="mr-3 h-4 w-4" />
          Manage Team
        </Button>
        
        <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-border/50 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success"></span>
            Cloud Synced
          </p>
          <p className="opacity-80">Edits are persisted in real-time.</p>
        </div>
      </div>
    </aside>
  );
};
