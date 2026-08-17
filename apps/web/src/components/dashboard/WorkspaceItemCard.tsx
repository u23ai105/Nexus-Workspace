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
      className="group relative flex flex-col h-[14rem] overflow-hidden cursor-pointer transition-all duration-150 ease-in-out hover:bg-muted/40 hover:border-border hover:shadow-sm"
    >
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      
      <CardContent className="p-4 flex-1 flex flex-col justify-between relative z-10">
        <div className="flex items-start justify-between">
          <div className="p-2.5 rounded-lg bg-muted/50 border border-border/50 shadow-sm text-muted-foreground group-hover:text-primary transition-colors">
            {icon}
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
