import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

export interface WorkspaceItemCardProps {
  title: string;
  icon: React.ReactNode;
  isRenaming: boolean;
  onRenameStart: () => void;
  onRenameSubmit: (newTitle: string) => void;
  onRenameCancel: () => void;
  onClick: () => void;
  dropdownMenuItems?: React.ReactNode;
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
  showDropdown?: boolean;
  isStarred?: boolean;
  onToggleStar?: (e: React.MouseEvent) => void;
  // Drag and drop props
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragTarget?: boolean;
}

export const WorkspaceItemCard: React.FC<WorkspaceItemCardProps> = ({
  title,
  icon,
  isRenaming,
  onRenameSubmit,
  onRenameCancel,
  onClick,
  dropdownMenuItems,
  footerLeft,
  footerRight,
  showDropdown = true,
  isStarred,
  onToggleStar,
  draggable,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragTarget,
}) => {
  const [titleInput, setTitleInput] = React.useState(title);

  React.useEffect(() => {
    setTitleInput(title);
  }, [title]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (titleInput.trim() && titleInput !== title) {
      onRenameSubmit(titleInput.trim());
    } else {
      onRenameCancel();
    }
  };

  return (
    <Card 
      onClick={() => !isRenaming && onClick()}
      draggable={draggable && !isRenaming}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`group relative flex flex-col h-[11rem] overflow-hidden cursor-pointer transition-all duration-150 ease-in-out bg-card hover:bg-accent/50 border shadow-sm hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus:outline-none ${isDragTarget ? 'border-primary ring-2 ring-primary/50' : 'border-border'}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          !isRenaming && onClick();
        }
      }}
    >
      <CardContent className="p-4 flex-1 flex flex-col justify-between relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-md bg-muted text-muted-foreground group-hover:text-primary transition-colors">
              {icon}
            </div>
            {isStarred !== undefined && (
              <button 
                onClick={onToggleStar}
                className={`p-1.5 rounded-md transition-colors ${isStarred ? 'text-yellow-500 hover:bg-yellow-500/10' : 'text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted opacity-0 group-hover:opacity-100 focus:opacity-100'}`}
                aria-label={isStarred ? "Remove from favorites" : "Add to favorites"}
              >
                <svg className="w-4 h-4" fill={isStarred ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isStarred ? 1.5 : 2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
            )}
          </div>

          {showDropdown && dropdownMenuItems && (
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger className="focus:outline-none">
                  <div 
                    className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-muted/60 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    aria-label="Open context menu"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {dropdownMenuItems}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <div className="mt-4">
          {isRenaming ? (
            <form onSubmit={handleSubmit} className="w-full" onClick={(e) => e.stopPropagation()}>
              <Input
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={() => {
                  if (titleInput.trim() && titleInput !== title) {
                    onRenameSubmit(titleInput.trim());
                  } else {
                    onRenameCancel();
                  }
                }}
                autoFocus
                className="h-8 text-sm"
              />
            </form>
          ) : (
            <h3 className="font-medium text-foreground truncate text-base tracking-tight transition-colors">
              {title}
            </h3>
          )}
        </div>
      </CardContent>

      <CardFooter className="px-4 py-3 bg-muted/20 border-t border-border/50 flex items-center justify-between relative z-10 text-xs text-muted-foreground font-medium">
        <span>{footerLeft}</span>
        <span className="truncate max-w-[80px]">
          {footerRight}
        </span>
      </CardFooter>
    </Card>
  );
};
