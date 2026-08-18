import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, LayoutDashboard, CheckSquare, MessageSquare, UserPlus, Folder, Pencil } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: string;
  entityType: string;
  entityId: string;
  metadata: any;
  createdAt: string;
  actor: {
    name: string | null;
    email: string;
  };
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  isLoading?: boolean;
}

const getActivityDetails = (type: string, metadata: any) => {
  switch (type) {
    case 'DOCUMENT_CREATED':
      return { icon: <FileText className="w-4 h-4 text-blue-500" />, text: `created document`, target: metadata?.title };
    case 'DOCUMENT_MODIFIED':
      return { icon: <FileText className="w-4 h-4 text-green-500" />, text: `modified document`, target: metadata?.title };
    case 'DOCUMENT_UPDATED':
      return { icon: <FileText className="w-4 h-4 text-green-500" />, text: `updated document`, target: metadata?.title };
    case 'DOCUMENT_RENAMED':
      return { icon: <Pencil className="w-4 h-4 text-orange-500" />, text: `renamed document from "${metadata?.oldTitle}" to`, target: metadata?.newTitle };
    case 'DOCUMENT_DELETED':
      return { icon: <FileText className="w-4 h-4 text-red-500" />, text: `deleted document`, target: metadata?.title };
    case 'DOCUMENT_RESTORED':
      return { icon: <FileText className="w-4 h-4 text-yellow-500" />, text: `restored document`, target: metadata?.title };
    case 'FOLDER_CREATED':
      return { icon: <Folder className="w-4 h-4 text-orange-500" />, text: `created folder`, target: metadata?.name };
    case 'TASK_CREATED':
      return { icon: <CheckSquare className="w-4 h-4 text-purple-500" />, text: `created a task`, target: metadata?.content };
    case 'TASK_COMPLETED':
      return { icon: <CheckSquare className="w-4 h-4 text-emerald-500" />, text: `completed a task`, target: metadata?.content };
    case 'MEMBER_JOINED':
      return { icon: <UserPlus className="w-4 h-4 text-indigo-500" />, text: `joined the workspace`, target: null };
    case 'MESSAGE_SENT':
      return { icon: <MessageSquare className="w-4 h-4 text-gray-500" />, text: `sent a message`, target: null };
    default:
      return { icon: <LayoutDashboard className="w-4 h-4 text-muted-foreground" />, text: `performed an action`, target: null };
  }
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const diff = (new Date().getTime() - date.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, isLoading }) => {
  return (
    <Card className="bg-card border border-border shadow-sm rounded-xl overflow-hidden h-full flex flex-col">
      <CardHeader className="py-4 px-5 border-b border-border/50 bg-muted/20">
        <CardTitle className="text-sm font-semibold tracking-tight text-foreground flex items-center space-x-2">
          <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
          <span>Activity</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-5 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-muted/50 shrink-0" />
                <div className="space-y-2 flex-1 pt-1">
                  <div className="h-3 bg-muted/50 rounded w-3/4" />
                  <div className="h-2 bg-muted/50 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center text-muted-foreground">
            <LayoutDashboard className="w-8 h-8 opacity-20 mb-3" />
            <p className="text-sm">This workspace hasn't had any recent activity</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {activities.map((activity) => {
              const details = getActivityDetails(activity.type, activity.metadata);
              const actorName = activity.actor.name || activity.actor.email.split('@')[0];
              
              return (
                <div key={activity.id} className="p-4 hover:bg-muted/30 transition-colors flex items-start space-x-3 text-sm">
                  <div className="mt-0.5 w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border/50">
                    {details.icon}
                  </div>
                  <div className="flex-1 min-w-0 leading-snug">
                    <p className="text-foreground">
                      <span className="font-medium">{actorName}</span>{' '}
                      <span className="text-muted-foreground">{details.text}</span>
                      {details.target && (
                        <>
                          {' '}
                          <span className="font-medium inline-flex align-bottom">
                            {details.target}
                          </span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">
                      {formatTimeAgo(activity.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
