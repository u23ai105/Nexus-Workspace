import React, { useState } from 'react';
import useSWR from 'swr';
import { CheckSquare, Circle, CheckCircle, Clock, Trash2 } from 'lucide-react';

interface TasksSidebarProps {
  workspaceId: string;
  token: string;
  serverUrl: string;
  userRole: string;
}

export const TasksSidebar: React.FC<TasksSidebarProps> = ({
  workspaceId,
  token,
  serverUrl,
  userRole
}) => {
  const [newTaskContent, setNewTaskContent] = useState('');

  const fetcher = async ([url, jwt]: [string, string]) => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${jwt}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch');
    return data;
  };

  const { data, mutate } = useSWR([`${serverUrl}/api/workspaces/${workspaceId}/tasks`, token], fetcher);
  const tasks = data?.tasks || [];

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskContent.trim() || userRole === 'VIEWER') return;

    try {
      const res = await fetch(`${serverUrl}/api/workspaces/${workspaceId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: newTaskContent.trim() })
      });
      if (res.ok) {
        setNewTaskContent('');
        mutate();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`${serverUrl}/api/workspaces/${workspaceId}/tasks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) mutate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const res = await fetch(`${serverUrl}/api/workspaces/${workspaceId}/tasks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) mutate();
    } catch (err) {
      console.error(err);
    }
  };

  const groupedTasks = {
    TODO: tasks.filter((t: any) => t.status === 'TODO'),
    IN_PROGRESS: tasks.filter((t: any) => t.status === 'IN_PROGRESS'),
    DONE: tasks.filter((t: any) => t.status === 'DONE'),
  };

  return (
    <div className="w-80 border-l border-border/50 bg-background flex flex-col h-full shadow-lg relative z-20">
      <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
        <h3 className="font-semibold flex items-center gap-2">
          <CheckSquare size={18} className="text-primary" />
          Workspace Tasks
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {userRole !== 'VIEWER' && (
          <form onSubmit={handleCreateTask} className="mb-4">
            <input
              type="text"
              placeholder="Add a new task..."
              value={newTaskContent}
              onChange={e => setNewTaskContent(e.target.value)}
              className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </form>
        )}

        {Object.entries(groupedTasks).map(([status, statusTasks]) => {
          if (statusTasks.length === 0 && status === 'DONE') return null;
          
          return (
            <div key={status}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
                {status.replace('_', ' ')}
                <span className="bg-muted px-1.5 py-0.5 rounded-full text-[10px]">{statusTasks.length}</span>
              </h4>
              <ul className="space-y-2">
                {statusTasks.map((task: any) => (
                  <li key={task.id} className="group flex items-start gap-3 p-3 rounded-md border border-border/50 bg-card hover:border-primary/50 transition-colors">
                    <button
                      onClick={() => handleUpdateStatus(task.id, task.status === 'DONE' ? 'TODO' : 'DONE')}
                      className="mt-0.5 text-muted-foreground hover:text-primary transition-colors shrink-0"
                      disabled={userRole === 'VIEWER'}
                    >
                      {task.status === 'DONE' ? (
                        <CheckCircle size={16} className="text-primary" />
                      ) : task.status === 'IN_PROGRESS' ? (
                        <Clock size={16} className="text-amber-500" />
                      ) : (
                        <Circle size={16} />
                      )}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${task.status === 'DONE' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {task.content}
                      </p>
                      
                      {task.assignee && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-medium text-primary" title={task.assignee.name}>
                            {task.assignee.name[0].toUpperCase()}
                          </div>
                          <span className="text-xs text-muted-foreground truncate">{task.assignee.name}</span>
                        </div>
                      )}
                    </div>

                    {userRole !== 'VIEWER' && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex items-center">
                        {status === 'TODO' && (
                          <button onClick={() => handleUpdateStatus(task.id, 'IN_PROGRESS')} className="p-1 hover:bg-muted rounded text-xs text-muted-foreground hover:text-amber-500" title="Start Progress">
                            <Clock size={14} />
                          </button>
                        )}
                        <button onClick={() => handleDeleteTask(task.id)} className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive" title="Delete Task">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};
