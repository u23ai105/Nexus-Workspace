import React, { useState } from 'react';
import useSWR from 'swr';
import { 
  CheckSquare, Circle, CheckCircle, Clock, Trash2, 
  AlertCircle, ArrowUpCircle, ArrowDownCircle, ChevronDown, User, FileText
} from 'lucide-react';
import { Button } from '../ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';

import { Link } from 'react-router-dom';

interface TasksSidebarProps {
  workspaceId: string;
  token: string;
  serverUrl: string;
  userRole: string;
  currentDocumentId?: string | null;
}

export const TasksSidebar: React.FC<TasksSidebarProps> = ({
  workspaceId,
  token,
  serverUrl,
  userRole,
  currentDocumentId
}) => {
  const [newTaskContent, setNewTaskContent] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('MEDIUM');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState<string | null>(null);

  const fetcher = async ([url, jwt]: [string, string]) => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${jwt}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch');
    return data;
  };

  const { data: tasksData, mutate: mutateTasks, isLoading: isTasksLoading } = useSWR([`${serverUrl}/api/workspaces/${workspaceId}/tasks`, token], fetcher);
  const tasks = tasksData?.tasks || [];

  const { data: membersData } = useSWR([`${serverUrl}/api/workspaces/${workspaceId}/members`, token], fetcher);
  const allMembers = membersData?.members?.filter((m: any) => m.status === 'ACCEPTED') || [];

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskContent.trim() || userRole === 'VIEWER') return;

    try {
      const payload = {
        content: newTaskContent.trim(),
        priority: newTaskPriority,
        assigneeId: newTaskAssigneeId,
        documentId: currentDocumentId || null
      };

      // Optimistic update
      const optimisticTask = {
        id: `temp-${Date.now()}`,
        content: payload.content,
        status: 'TODO',
        priority: payload.priority,
        assignee: newTaskAssigneeId ? allMembers.find((m: any) => m.user.id === newTaskAssigneeId)?.user : null,
        document: null, // Optimistically we don't have the full doc object easily without context, but we can assume null is fine for 100ms
        workspaceId,
        createdAt: new Date().toISOString()
      };
      mutateTasks({ tasks: [optimisticTask, ...tasks] }, false);

      const res = await fetch(`${serverUrl}/api/workspaces/${workspaceId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setNewTaskContent('');
        setNewTaskPriority('MEDIUM');
        setNewTaskAssigneeId(null);
        mutateTasks();
      }
    } catch (err) {
      console.error(err);
      mutateTasks(); // Revert optimistic update
    }
  };

  const handleUpdateTask = async (id: string, updates: Record<string, any>) => {
    try {
      // Optimistic update
      const updatedTasks = tasks.map((t: any) => t.id === id ? { ...t, ...updates } : t);
      mutateTasks({ tasks: updatedTasks }, false);

      const res = await fetch(`${serverUrl}/api/workspaces/${workspaceId}/tasks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) mutateTasks();
    } catch (err) {
      console.error(err);
      mutateTasks();
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      // Optimistic
      mutateTasks({ tasks: tasks.filter((t: any) => t.id !== id) }, false);
      const res = await fetch(`${serverUrl}/api/workspaces/${workspaceId}/tasks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) mutateTasks();
    } catch (err) {
      console.error(err);
      mutateTasks();
    }
  };

  const groupedTasks = {
    TODO: tasks.filter((t: any) => t.status === 'TODO'),
    IN_PROGRESS: tasks.filter((t: any) => t.status === 'IN_PROGRESS'),
    DONE: tasks.filter((t: any) => t.status === 'DONE'),
  };

  const priorityConfig: Record<string, { label: string, icon: any, color: string }> = {
    HIGH: { label: 'High', icon: AlertCircle, color: 'text-destructive bg-destructive/10 border-destructive/20' },
    MEDIUM: { label: 'Medium', icon: ArrowUpCircle, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
    LOW: { label: 'Low', icon: ArrowDownCircle, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' }
  };

  return (
    <div className="flex flex-col h-full w-full relative z-20 bg-background">
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
          <form onSubmit={handleCreateTask} className="mb-6 flex flex-col gap-2 shrink-0">
            <div className="relative flex items-center group">
              <input
                type="text"
                placeholder="Add a new task..."
                value={newTaskContent}
                onChange={e => setNewTaskContent(e.target.value)}
                className="w-full bg-muted/50 hover:bg-muted/80 border border-border/50 rounded-2xl pl-4 pr-16 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-background transition-all shadow-sm text-foreground placeholder:text-muted-foreground/70"
              />
              <button
                type="submit"
                disabled={!newTaskContent.trim()}
                className="absolute right-2 px-3 py-1.5 rounded-xl text-white bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-sm shadow-emerald-500/20 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:shadow-none transition-all font-medium text-xs"
              >
                Add
              </button>
            </div>
            
            <div className="flex items-center gap-2 px-1">
              {/* Priority Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg px-2 text-muted-foreground hover:text-foreground">
                    {(() => {
                      const P = priorityConfig[newTaskPriority];
                      const Icon = P.icon;
                      return <><Icon className="w-3.5 h-3.5 mr-1" /> {P.label}</>;
                    })()}
                    <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {Object.entries(priorityConfig).map(([p, config]) => {
                    const Icon = config.icon;
                    return (
                      <DropdownMenuItem key={p} onClick={() => setNewTaskPriority(p)}>
                        <Icon className="w-4 h-4 mr-2" /> {config.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Assignee Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg px-2 text-muted-foreground hover:text-foreground">
                    <User className="w-3.5 h-3.5 mr-1" />
                    {newTaskAssigneeId ? (allMembers.find((m: any) => m.user.id === newTaskAssigneeId)?.user.name || allMembers.find((m: any) => m.user.id === newTaskAssigneeId)?.user.email) : 'Assign'}
                    <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setNewTaskAssigneeId(null)}>
                    Unassigned
                  </DropdownMenuItem>
                  {allMembers.map((member: any) => (
                    <DropdownMenuItem key={member.user.id} onClick={() => setNewTaskAssigneeId(member.user.id)}>
                      {member.user.name || member.user.email}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </form>
        )}

        {isTasksLoading ? (
          <div className="space-y-4 animate-pulse opacity-60">
            <div className="h-20 bg-muted rounded-2xl w-full"></div>
            <div className="h-20 bg-muted rounded-2xl w-full"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center opacity-70">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 text-emerald-500">
              <CheckSquare size={32} />
            </div>
            <h4 className="text-foreground font-semibold mb-1">No tasks yet</h4>
            <p className="text-sm text-muted-foreground">Create a task to get started.</p>
          </div>
        ) : (
          Object.entries(groupedTasks).map(([status, statusTasks]) => {
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
                  {statusTasks.map((task: any) => {
                    const PriorityIcon = priorityConfig[task.priority || 'MEDIUM'].icon;
                    const priorityColor = priorityConfig[task.priority || 'MEDIUM'].color;
                    
                    return (
                      <li key={task.id} className="group flex flex-col p-3 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-sm hover:border-emerald-500/30 hover:shadow-md transition-all">
                        {/* Hierarchy 1: Title & Status Checkbox */}
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleUpdateTask(task.id, { status: task.status === 'DONE' ? 'TODO' : 'DONE' })}
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
                          
                          <div className="flex-1 min-w-0 pt-0.5">
                            <p className={`text-sm font-medium leading-snug break-words ${task.status === 'DONE' ? 'text-muted-foreground line-through opacity-70' : 'text-foreground'}`}>
                              {task.content}
                            </p>
                            
                            {/* Hierarchy 2 & 3: Metadata (Assignee, Priority, Document) */}
                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                              
                              {/* Priority */}
                              {userRole !== 'VIEWER' ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger>
                                    <button className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${priorityColor} transition-opacity hover:opacity-80`}>
                                      <PriorityIcon className="w-3 h-3" />
                                      {priorityConfig[task.priority || 'MEDIUM'].label}
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start">
                                    {Object.entries(priorityConfig).map(([p, config]) => {
                                      const Icon = config.icon;
                                      return (
                                        <DropdownMenuItem key={p} onClick={() => handleUpdateTask(task.id, { priority: p })}>
                                          <Icon className="w-4 h-4 mr-2" /> {config.label}
                                        </DropdownMenuItem>
                                      );
                                    })}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${priorityColor}`}>
                                  <PriorityIcon className="w-3 h-3" />
                                  {priorityConfig[task.priority || 'MEDIUM'].label}
                                </span>
                              )}

                              {/* Assignee */}
                              {userRole !== 'VIEWER' ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger>
                                    <button className="flex items-center gap-1.5 hover:bg-muted/80 px-1 rounded transition-colors group/assignee">
                                      {task.assignee ? (
                                        <>
                                          <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-[9px] font-bold" title={task.assignee.name || task.assignee.email}>
                                            {(task.assignee.name || task.assignee.email || '?')[0].toUpperCase()}
                                          </div>
                                          <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[80px] group-hover/assignee:text-foreground">{task.assignee.name || task.assignee.email}</span>
                                        </>
                                      ) : (
                                        <span className="text-[10px] font-medium text-muted-foreground/60 group-hover/assignee:text-foreground border border-dashed border-border/50 px-1.5 py-0.5 rounded">Unassigned</span>
                                      )}
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start">
                                    <DropdownMenuItem onClick={() => handleUpdateTask(task.id, { assigneeId: null })}>
                                      Unassigned
                                    </DropdownMenuItem>
                                    {allMembers.map((member: any) => (
                                      <DropdownMenuItem key={member.user.id} onClick={() => handleUpdateTask(task.id, { assigneeId: member.user.id })}>
                                        {member.user.name || member.user.email}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                task.assignee && (
                                  <div className="flex items-center gap-1.5 px-1">
                                    <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-[9px] font-bold" title={task.assignee.name || task.assignee.email}>
                                      {(task.assignee.name || task.assignee.email || '?')[0].toUpperCase()}
                                    </div>
                                    <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[80px]">{task.assignee.name || task.assignee.email}</span>
                                  </div>
                                )
                              )}

                              {/* Linked Document */}
                              {task.document && (
                                <Link 
                                  to={`/w/${workspaceId}/d/${task.document.id}`}
                                  className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/40 hover:bg-muted border border-border/50 px-1.5 py-0.5 rounded transition-colors"
                                  title={`View Document: ${task.document.title}`}
                                >
                                  <FileText className="w-3 h-3 text-emerald-500/70" />
                                  <span className="truncate max-w-[100px]">{task.document.title}</span>
                                </Link>
                              )}
                              
                            </div>
                          </div>
                        </div>

                        {/* Hover Actions */}
                        {userRole !== 'VIEWER' && (
                          <div className="flex items-center justify-end gap-1.5 mt-2 pt-2 border-t border-border/30 opacity-0 group-hover:opacity-100 transition-opacity">
                            {status === 'TODO' && (
                              <button onClick={() => handleUpdateTask(task.id, { status: 'IN_PROGRESS' })} className="text-[10px] font-medium px-2 py-1 rounded bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors flex items-center gap-1" title="Start Progress">
                                <Clock size={10} /> Start
                              </button>
                            )}
                            {status === 'IN_PROGRESS' && (
                              <button onClick={() => handleUpdateTask(task.id, { status: 'DONE' })} className="text-[10px] font-medium px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors flex items-center gap-1" title="Complete Task">
                                <CheckCircle size={10} /> Complete
                              </button>
                            )}
                            <button onClick={() => handleDeleteTask(task.id)} className="text-[10px] font-medium p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete Task">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
