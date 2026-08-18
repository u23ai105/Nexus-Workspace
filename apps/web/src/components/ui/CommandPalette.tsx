import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { 
  FileText, LayoutDashboard, FolderPlus,
  MessageSquare, CheckSquare, Sparkles, Folder, Trash2
} from 'lucide-react';

interface CommandPaletteProps {
  workspaceId: string | null;
  workspaces: any[];
  togglePanel?: (panel: 'workspaceChat' | 'globalChat' | 'ai' | 'tasks' | 'activity' | null) => void;
  onCreateDocument?: (type: 'TEXT' | 'CANVAS') => void;
  onCreateFolder?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  workspaceId,
  workspaces,
  togglePanel,
  onCreateDocument,
  onCreateFolder,
}) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    
    const onCustomOpen = () => setOpen(true);

    document.addEventListener('keydown', down);
    window.addEventListener('open-command-palette', onCustomOpen);
    
    return () => {
      document.removeEventListener('keydown', down);
      window.removeEventListener('open-command-palette', onCustomOpen);
    };
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] sm:pt-[20vh] bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={() => setOpen(false)} />
      
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border/50 bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <Command
          className="flex h-full w-full flex-col overflow-hidden bg-transparent"
          shouldFilter={true}
        >
          <div className="flex items-center border-b border-border/50 px-3">
            <Command.Input 
              autoFocus
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
              placeholder="Type a command or search..." 
            />
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {workspaceId && (
              <Command.Group heading="Create" className="text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2 [&_[cmdk-item]]:rounded-md [&_[cmdk-item][data-selected='true']]:bg-accent [&_[cmdk-item][data-selected='true']]:text-accent-foreground">
                <Command.Item 
                  onSelect={() => { setOpen(false); onCreateDocument?.('TEXT'); }}
                  className="flex cursor-pointer items-center text-sm"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  New Document
                </Command.Item>
                <Command.Item 
                  onSelect={() => { setOpen(false); onCreateDocument?.('CANVAS'); }}
                  className="flex cursor-pointer items-center text-sm"
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  New Canvas
                </Command.Item>
                <Command.Item 
                  onSelect={() => { setOpen(false); onCreateFolder?.(); }}
                  className="flex cursor-pointer items-center text-sm"
                >
                  <FolderPlus className="mr-2 h-4 w-4" />
                  New Folder
                </Command.Item>
              </Command.Group>
            )}

            {workspaceId && togglePanel && (
              <Command.Group heading="Tools" className="mt-2 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2 [&_[cmdk-item]]:rounded-md [&_[cmdk-item][data-selected='true']]:bg-accent [&_[cmdk-item][data-selected='true']]:text-accent-foreground">
                <Command.Item 
                  onSelect={() => { setOpen(false); togglePanel('ai'); }}
                  className="flex cursor-pointer items-center text-sm"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Workspace AI
                </Command.Item>
                <Command.Item 
                  onSelect={() => { setOpen(false); togglePanel('workspaceChat'); }}
                  className="flex cursor-pointer items-center text-sm"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Team Chat
                </Command.Item>
                <Command.Item 
                  onSelect={() => { setOpen(false); togglePanel('tasks'); }}
                  className="flex cursor-pointer items-center text-sm"
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Tasks
                </Command.Item>
              </Command.Group>
            )}

            <Command.Group heading="Navigation" className="mt-2 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2 [&_[cmdk-item]]:rounded-md [&_[cmdk-item][data-selected='true']]:bg-accent [&_[cmdk-item][data-selected='true']]:text-accent-foreground">
              {workspaceId && (
                <>
                  <Command.Item 
                    onSelect={() => { setOpen(false); navigate(`/w/${workspaceId}`); }}
                    className="flex cursor-pointer items-center text-sm"
                  >
                    <Folder className="mr-2 h-4 w-4" />
                    Go to Documents
                  </Command.Item>
                  <Command.Item 
                    onSelect={() => { setOpen(false); navigate(`/w/${workspaceId}/trash`); }}
                    className="flex cursor-pointer items-center text-sm"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Go to Trash
                  </Command.Item>
                </>
              )}
              <Command.Item 
                onSelect={() => { setOpen(false); navigate('/'); }}
                className="flex cursor-pointer items-center text-sm"
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Go to Home
              </Command.Item>
            </Command.Group>

            {workspaces.length > 0 && (
              <Command.Group heading="Switch Workspace" className="mt-2 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2 [&_[cmdk-item]]:rounded-md [&_[cmdk-item][data-selected='true']]:bg-accent [&_[cmdk-item][data-selected='true']]:text-accent-foreground">
                {workspaces.map(w => (
                  <Command.Item 
                    key={w.id}
                    onSelect={() => { setOpen(false); navigate(`/w/${w.id}`); }}
                    className="flex cursor-pointer items-center text-sm"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary mr-2 opacity-50" />
                    {w.name}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

          </Command.List>
        </Command>
      </div>
    </div>
  );
};
