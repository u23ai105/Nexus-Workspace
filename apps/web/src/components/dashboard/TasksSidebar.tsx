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
    <div className="w-80 md:w-96 border-l border-border/30 bg-background/95 backdrop-blur-xl flex flex-col h-full shadow-2xl relative z-20 transition-all duration-300">
      <div className="p-4 border-b border-border/30 flex items-center justify-between sticky top-0 bg-background/60 backdrop-blur-md z-10 shrink-0">
        <h3 className="font-semibold flex items-center gap-2.5 text-foreground tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <CheckSquare size={18} className="text-white" />
          </div>
          Workspace Tasks
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {userRole !== 'VIEWER' && (
          <form onSubmit={handleCreateTask} className="mb-6 relative flex items-center group shrink-0">
            <input
              type="text"
              placeholder="Add a new task..."
              value={newTaskContent}
              onChange={e => setNewTaskContent(e.target.value)}
              className="w-full bg-muted/50 hover:bg-muted/80 border border-border/50 rounded-2xl pl-4 pr-20 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-background transition-all shadow-sm text-foreground placeholder:text-muted-foreground/70"
            />
            <button
              type="submit"
              disabled={!newTaskContent.trim()}
              className="absolute right-2 px-3 py-1.5 rounded-xl text-white bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-sm shadow-emerald-500/20 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:shadow-none hover:-translate-y-0.5 active:translate-y-0 transition-all font-medium text-xs disabled:transform-none"
            >
              Add
            </button>
          </form>
        )}

        {Object.entries(groupedTasks).map(([status, statusTasks]) => {
          if (statusTasks.length === 0 && status === 'DONE') return null;
          const statusLabels: Record<string, string> = {
            TODO: 'Not Started',
            IN_PROGRESS: 'In Progress',
            DONE: 'Completed'
          };
          
          return (
            <div key={status} className="mb-6">
              <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center justify-between">
                {statusLabels[status]}
                <span className="bg-muted px-2 py-0.5 rounded-full text-[10px] text-foreground font-medium">{statusTasks.length}</span>
              </h4>
              <ul className="space-y-3">
                {statusTasks.map((task: any) => (
                  <li key={task.id} className="group flex flex-col p-4 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-sm hover:border-emerald-500/30 hover:shadow-md transition-all">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleUpdateStatus(task.id, task.status === 'DONE' ? 'TODO' : 'DONE')}
                        className={`mt-0.5 shrink-0 transition-colors ${
                          task.status === 'DONE' ? 'text-emerald-500' : 'text-muted-foreground hover:text-emerald-500'
                        }`}
                        disabled={userRole === 'VIEWER'}
                      >
                        {task.status === 'DONE' ? (
                          <CheckCircle size={18} className="drop-shadow-sm" />
                        ) : task.status === 'IN_PROGRESS' ? (
                          <Clock size={18} className="text-amber-500 drop-shadow-sm" />
                        ) : (
                          <Circle size={18} />
                        )}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-relaxed break-words ${task.status === 'DONE' ? 'text-muted-foreground line-through opacity-70' : 'text-foreground'}`}>
                          {task.content}
                        </p>
                        
                        {task.assignee && (
                          <div className="mt-3 flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-[10px] font-bold shadow-sm" title={task.assignee.name}>
                              {task.assignee.name[0].toUpperCase()}
                            </div>
                            <span className="text-[11px] font-medium text-muted-foreground truncate">{task.assignee.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {userRole !== 'VIEWER' && (
                      <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/30 opacity-60 group-hover:opacity-100 transition-opacity">
                        {status === 'TODO' && (
                          <button onClick={() => handleUpdateStatus(task.id, 'IN_PROGRESS')} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors flex items-center gap-1.5" title="Start Progress">
                            <Clock size={12} /> Start Progress
                          </button>
                        )}
                        {status === 'IN_PROGRESS' && (
                          <button onClick={() => handleUpdateStatus(task.id, 'DONE')} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5" title="Complete Task">
                            <CheckCircle size={12} /> Complete
                          </button>
                        )}
                        <button onClick={() => handleDeleteTask(task.id)} className="text-xs font-medium p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete Task">
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
