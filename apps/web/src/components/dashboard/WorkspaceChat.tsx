import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  sender: {
    id: string;
    name: string | null;
    username: string | null;
    email: string;
  };
}

interface WorkspaceChatProps {
  workspaceId: string;
  token: string;
  serverUrl: string;
  currentUser: any;
  onClose: () => void;
  onOpenDocument?: (doc: any) => void;
  onOpenDM?: (user: any) => void;
}

export const WorkspaceChat: React.FC<WorkspaceChatProps> = ({
  workspaceId,
  token,
  serverUrl,
  currentUser,
  onClose,
  onOpenDocument,
  onOpenDM
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // Autocomplete states
  const [members, setMembers] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showDocMenu, setShowDocMenu] = useState(false);
  const [docQuery, setDocQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch chat history
        const resMsg = await fetch(`${serverUrl}/api/workspaces/${workspaceId}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resMsg.ok) {
          const data = await resMsg.json();
          setMessages(data.messages || []);
        }

        // Fetch members for @mentions
        const resMem = await fetch(`${serverUrl}/api/workspaces/${workspaceId}/members`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resMem.ok) {
          const data = await resMem.json();
          setMembers(data.members || []);
        }

        // Fetch documents for /documents
        const resDoc = await fetch(`${serverUrl}/api/documents?workspaceId=${workspaceId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resDoc.ok) {
          const data = await resDoc.json();
          setDocuments(data.documents || []);
        }

        // Fetch files for /files
        const resFiles = await fetch(`${serverUrl}/api/files?workspaceId=${workspaceId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resFiles.ok) {
          const data = await resFiles.json();
          setFiles(data.files || []);
        }

      } catch (err) {
        console.error("Failed to load workspace data for chat", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [workspaceId, serverUrl, token]);

  useEffect(() => {
    // Setup Socket
    const newSocket = io(serverUrl, {
      auth: { token },
      transports: ['websocket']
    });

    newSocket.on('connect', () => {
      newSocket.emit('chat:join', workspaceId);
    });

    newSocket.on('chat:message', (message: Message) => {
      setMessages(prev => {
        if (prev.find(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [workspaceId, serverUrl, token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;
    
    socket.emit('chat:message', {
      workspaceId,
      content: newMessage.trim()
    });
    
    setNewMessage('');
    setShowMentionMenu(false);
    setShowDocMenu(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewMessage(val);

    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = val.substring(0, cursorPosition);
    
    const words = textBeforeCursor.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@')) {
      setShowMentionMenu(true);
      setShowDocMenu(false);
      setMentionQuery(lastWord.substring(1).toLowerCase());
    } else if (lastWord.startsWith('/')) {
      setShowDocMenu(true);
      setShowMentionMenu(false);
      setDocQuery(lastWord.substring(1).toLowerCase());
    } else {
      setShowMentionMenu(false);
      setShowDocMenu(false);
    }
  };

  const insertAutocomplete = (textToInsert: string) => {
    if (!inputRef.current) return;
    const cursorPosition = inputRef.current.selectionStart || 0;
    const textBeforeCursor = newMessage.substring(0, cursorPosition);
    const textAfterCursor = newMessage.substring(cursorPosition);
    
    const words = textBeforeCursor.split(/\s/);
    words.pop(); // remove the partial @ or / word
    
    const newBefore = words.length > 0 ? words.join(' ') + ' ' + textToInsert + ' ' : textToInsert + ' ';
    
    setNewMessage(newBefore + textAfterCursor);
    setShowMentionMenu(false);
    setShowDocMenu(false);
    inputRef.current.focus();
  };

  const filteredMembers = members.filter(m => 
    (m.user.username && m.user.username.toLowerCase().includes(mentionQuery)) ||
    (m.user.name && m.user.name.toLowerCase().includes(mentionQuery))
  );

  const filteredDocs = documents.filter(d => 
    d.title.toLowerCase().includes(docQuery)
  );

  const filteredFiles = files.filter(f => 
    f.filename.toLowerCase().includes(docQuery)
  );

  // Very basic parser for mentions and docs
  const renderMessageContent = (content: string) => {
    const parts = content.split(/(\s+)/);
    
    return parts.map((part, i) => {
      if (part.startsWith('@') && part.length > 1) {
        // Mention
        const usernameMatch = part.match(/^@([a-zA-Z0-9_\.]+)/);
        if (usernameMatch) {
          const username = usernameMatch[1];
          const suffix = part.substring(usernameMatch[0].length);
          const isMe = currentUser.username 
            ? username === currentUser.username 
            : username === currentUser.name?.replace(/\s+/g, '');
            
          const memberMatch = members.find(m => {
            const mUsername = m.user.username || m.user.name?.replace(/\s+/g, '');
            return mUsername === username;
          });
          
          return (
            <React.Fragment key={i}>
              <span 
                onClick={() => {
                  if (memberMatch && onOpenDM) onOpenDM(memberMatch.user);
                }}
                className={`font-semibold cursor-pointer transition-colors ${isMe ? 'text-white underline decoration-white/30' : 'text-indigo-400 hover:text-indigo-300'}`}
              >
                @{username}
              </span>
              {suffix}
            </React.Fragment>
          );
        }
      }
      if (part.startsWith('/document/') && part.length > 10) {
        // Document link
        const docId = part.split('/document/')[1];
        const docMatch = documents.find(d => d.id === docId);
        return (
          <button 
            key={i} 
            onClick={() => { if (docMatch) onOpenDocument?.(docMatch); }}
            className="text-blue-400 underline hover:text-blue-300 ml-1 inline-flex items-center"
          >
            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {docMatch ? docMatch.title : 'Open Doc'}
          </button>
        );
      }
      if (part.startsWith('/file/') && part.length > 6) {
        // File link
        const fileId = part.split('/file/')[1];
        const fileMatch = files.find(f => f.id === fileId);
        return (
          <a 
            key={i} 
            href={fileMatch?.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-400 underline hover:text-green-300 ml-1 inline-flex items-center"
          >
            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {fileMatch ? fileMatch.filename : 'Download File'}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="w-80 md:w-96 border-l border-border/30 bg-background/95 backdrop-blur-xl flex flex-col h-full shadow-2xl relative z-40 transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-border/30 flex items-center justify-between sticky top-0 bg-background/60 backdrop-blur-md z-10 shrink-0">
        <div className="font-semibold flex items-center gap-2.5 text-foreground tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2>Workspace Chat</h2>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors" aria-label="Close Chat">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2 opacity-80">
            <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
            <p className="text-sm">No messages yet.</p>
            <p className="text-xs">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.senderId === currentUser.id;
            const showHeader = i === 0 || messages[i-1].senderId !== msg.senderId || (new Date(msg.createdAt).getTime() - new Date(messages[i-1].createdAt).getTime() > 60000 * 5);
            
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {showHeader && (
                  <div className={`flex items-center gap-1.5 mb-1 mt-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="text-[11px] font-medium text-muted-foreground">{isMe ? 'You' : (msg.sender.username ? `@${msg.sender.username}` : msg.sender.name || 'User')}</span>
                    <span className="text-[10px] text-muted-foreground/70">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
                <div className={`px-4 py-2.5 rounded-2xl max-w-[90%] text-sm break-words shadow-sm ${
                  isMe 
                    ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-tr-sm' 
                    : 'bg-card/80 backdrop-blur-sm border border-border/50 text-foreground rounded-tl-sm'
                }`}>
                  {renderMessageContent(msg.content)}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area with Autocomplete Popovers */}
      <div className="p-4 border-t border-border/30 bg-background/60 backdrop-blur-md relative">
        {/* Mentions Dropdown */}
        {showMentionMenu && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-card border border-border/50 rounded-xl shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto">
            {filteredMembers.map(m => (
              <button
                key={m.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertAutocomplete(`@${m.user.username || m.user.name?.replace(/\s+/g, '')}`); }}
                className="w-full text-left px-3 py-2 hover:bg-muted/80 flex items-center gap-3 transition-colors border-b border-border/30 last:border-0"
              >
                <div className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center text-xs font-bold shrink-0">
                  {m.user.username?.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm text-foreground font-medium truncate">{m.user.username}</span>
                  <span className="text-[11px] text-muted-foreground truncate">{m.user.name}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Documents & Files Dropdown */}
        {showDocMenu && (filteredDocs.length > 0 || filteredFiles.length > 0) && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-card border border-border/50 rounded-xl shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto">
            {filteredDocs.map(d => (
              <button
                key={d.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertAutocomplete(`/document/${d.id}`); }}
                className="w-full text-left px-3 py-2 hover:bg-muted/80 flex items-center gap-3 transition-colors border-b border-border/30 last:border-0"
              >
                <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm text-foreground font-medium truncate">{d.title}</span>
                  <span className="text-[11px] text-blue-500">Document</span>
                </div>
              </button>
            ))}
            {filteredFiles.map(f => (
              <button
                key={f.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertAutocomplete(`/file/${f.id}`); }}
                className="w-full text-left px-3 py-2 hover:bg-muted/80 flex items-center gap-3 transition-colors border-b border-border/30 last:border-0"
              >
                <div className="w-7 h-7 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm text-foreground font-medium truncate">{f.filename}</span>
                  <span className="text-[11px] text-green-500">File ({Math.round(f.size / 1024)} KB)</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSendMessage} className="relative flex items-center group">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type a message... (@user or /doc)"
            className="w-full bg-muted/50 hover:bg-muted/80 border border-border/50 rounded-2xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-background transition-all shadow-sm text-foreground placeholder:text-muted-foreground/70"
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="absolute right-2 p-2 rounded-xl text-white bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-sm shadow-purple-500/20 hover:shadow-purple-500/40 disabled:opacity-50 disabled:shadow-none hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:transform-none"
          >
            <svg className="w-4 h-4 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};
