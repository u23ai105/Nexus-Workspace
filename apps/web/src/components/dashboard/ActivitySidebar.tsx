import React from 'react';
import useSWR from 'swr';
import { ActivityFeed } from './ActivityFeed';
import { X } from 'lucide-react';
import { Button } from '../ui/button';

interface ActivitySidebarProps {
  workspaceId: string;
  token: string;
  serverUrl: string;
  onClose: () => void;
}

export const ActivitySidebar: React.FC<ActivitySidebarProps> = ({
  workspaceId,
  token,
  serverUrl,
  onClose
}) => {
  const fetcher = async ([url, jwt]: [string, string]) => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${jwt}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch');
    return data;
  };

  const activityKey = workspaceId ? [`${serverUrl}/api/workspaces/${workspaceId}/activity`, token] : null;
  const { data: activityData, isLoading: activityLoading } = useSWR(activityKey, fetcher, { refreshInterval: 5000 });

  const activities = activityData?.activity || [];

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Header */}
      <div className="p-4 border-b border-border/30 flex items-center justify-between sticky top-0 bg-background/60 backdrop-blur-md z-10 shrink-0">
        <h2 className="font-semibold text-foreground tracking-tight">Workspace Activity</h2>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose} 
          className="text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md"
          aria-label="Close Activity Panel"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <ActivityFeed activities={activities} isLoading={activityLoading} />
      </div>
    </div>
  );
};
