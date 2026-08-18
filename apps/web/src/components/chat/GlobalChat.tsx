import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface DMSummary {
  user: {
    id: string;
    name: string | null;
    username: string | null;
    email: string;
  };
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  sender: {
    id: string;
    name: string | null;
    username: string | null;
  };
}

interface User {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
}

interface GlobalChatProps {
  token: string;
  serverUrl: string;
  currentUser: any;
  onClose: () => void;
  initialActiveUserId?: string | null;
  initialActiveUser?: any | null;
}

export const GlobalChat: React.FC<GlobalChatProps> = ({
  token,
  serverUrl,
  currentUser,
  onClose,
  initialActiveUserId = null,
  initialActiveUser = null
}) => {
  const [activeDmUserId, setActiveDmUserId] = useState<string | null>(initialActiveUserId);
  const [activeDmUser, setActiveDmUser] = useState<any>(initialActiveUser);
  const [summaries, setSummaries] = useState<DMSummary[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (initialActiveUserId) {
      setActiveDmUserId(initialActiveUserId);
    }
    if (initialActiveUser) {
      setActiveDmUser(initialActiveUser);
    }
  }, [initialActiveUserId, initialActiveUser]);

  const fetchSummaries = async () => {
    try {
      const res = await fetch(`${serverUrl}/api/dms/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSummaries(data.summaries || []);
      }
    } catch (err) {
      console.error("Failed to load DM summaries", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${serverUrl}/api/dms/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        
        // Mark as read
        await fetch(`${serverUrl}/api/dms/${userId}/read`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (err) {
      console.error("Failed to load DMs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeDmUserId) {
      const summary = summaries.find(s => s.user.id === activeDmUserId);
      if (summary) setActiveDmUser(summary.user);
      fetchMessages(activeDmUserId);
    } else {
      fetchSummaries();
    }
  }, [activeDmUserId, token, serverUrl, fetchSummaries]);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      setIsSearching(true);
      const delay = setTimeout(async () => {
        try {
          const res = await fetch(`${serverUrl}/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data.users || []);
          }
        } catch (err) {
          console.error("Failed to search users", err);
        } finally {
          setIsSearching(false);
        }
      }, 300);
      return () => clearTimeout(delay);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery, serverUrl, token]);

  useEffect(() => {
    const newSocket = io(serverUrl, {
      auth: { token },
      transports: ['websocket']
    });

    if (activeDmUserId) {
      newSocket.emit('dm:join', activeDmUserId);
    }

    newSocket.on('dm:message', (message: Message) => {
      setMessages(prev => {
        if (prev.find(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });

    newSocket.on('dm:notification', () => {
      if (!activeDmUserId) {
        fetchSummaries();
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [activeDmUserId, serverUrl, token, fetchSummaries]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !activeDmUserId) return;
    
    socket.emit('dm:message', {
      otherUserId: activeDmUserId,
      content: newMessage.trim()
    });
    
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-full w-full relative z-40 bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border/30 flex items-center justify-between sticky top-0 bg-background/60 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-2 font-semibold text-foreground tracking-tight">
          {activeDmUserId ? (
            <button 
              onClick={() => {
                setActiveDmUserId(null);
                setActiveDmUser(null);
                fetchSummaries();
              }}
              className="p-1 hover:bg-muted rounded-md transition-colors"
              aria-label="Back to messages"
            >
              <svg className="w-5 h-5 text-muted-foreground hover:text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
          )}
          <h2 className="font-semibold text-foreground text-sm truncate">
            {activeDmUser ? activeDmUser.name || activeDmUser.username : "Direct Messages"}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          aria-label="Close panel"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : !activeDmUserId ? (
          // Contacts List
          <div className="flex flex-col flex-1 h-full">
            <div className="p-3 border-b border-border/30 shrink-0">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-muted/50 border border-border/50 focus:border-primary text-sm rounded-lg pl-9 pr-3 py-2 text-foreground placeholder-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all shadow-sm"
                  aria-label="Search users"
                />
                <svg className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {searchQuery.trim().length >= 2 ? (
                // Search Results
                isSearching ? (
                  <div className="flex justify-center py-4"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center p-6 text-muted-foreground mt-2">
                    <p className="text-sm">No users found.</p>
                  </div>
                ) : (
                  searchResults.map(user => (
                    <button 
                      key={user.id}
                      onClick={() => {
                        setSearchQuery('');
                        setActiveDmUserId(user.id);
                        setActiveDmUser(user);
                      }}
                      className="flex items-center gap-3 p-4 hover:bg-muted/50 border-b border-border/30 transition-colors text-left w-full group"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-sm font-bold shrink-0">
                        {user.name?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {user.name || user.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </button>
                  ))
                )
              ) : (
                // Recent DMs
                summaries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 text-muted-foreground mt-10 opacity-80">
                    <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-sm">No recent messages.</p>
                    <p className="text-xs mt-1">Search for a teammate above to start.</p>
                  </div>
                ) : (
                  summaries.map((summary) => (
                    <button 
                      key={summary.user.id}
                      onClick={() => {
                        setActiveDmUserId(summary.user.id);
                        setActiveDmUser(summary.user);
                      }}
                      className="flex items-center gap-3 p-4 hover:bg-muted/50 border-b border-border/30 transition-colors text-left w-full group"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-sm font-bold shrink-0">
                        {summary.user.name?.charAt(0).toUpperCase() || summary.user.username?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {summary.user.name || summary.user.username}
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(summary.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className={`text-xs truncate pr-2 ${summary.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {summary.lastMessage}
                        </p>
                      </div>
                      {summary.unreadCount > 0 && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0 shadow-sm">
                          {summary.unreadCount}
                        </div>
                      )}
                    </button>
                  ))
                )
              )}
            </div>
          </div>
        ) : (
          // Chat View
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center p-6 text-muted-foreground mt-10 opacity-80">
                  <p className="text-sm">Say hello to {activeDmUser?.name || 'your teammate'}!</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.senderId === currentUser.id;
                  const showHeader = i === 0 || messages[i-1].senderId !== msg.senderId || (new Date(msg.createdAt).getTime() - new Date(messages[i-1].createdAt).getTime() > 60000 * 5);
                  
                  return (
                    <div key={msg.id} className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}>
                      {showHeader && (
                        <div className={`flex items-baseline gap-2 mb-1 mt-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          <span className="text-[10px] text-muted-foreground">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                      <div className={`relative px-3 py-2 rounded-xl max-w-[90%] text-sm break-words shadow-sm flex items-center gap-2 ${
                        isMe 
                          ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                          : 'bg-muted/50 text-foreground rounded-tl-sm'
                      }`}>
                        <div className="flex-1">{msg.content}</div>
                        {/* Hover Actions */}
                        <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ${isMe ? 'right-[100%] mr-2' : 'left-[100%] ml-2'}`}>
                          <button 
                            onClick={() => navigator.clipboard.writeText(msg.content)} 
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground bg-background/80 shadow-sm border border-border/50 backdrop-blur-sm" 
                            title="Copy message"
                            aria-label="Copy message"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border/30 bg-background/60 backdrop-blur-md relative shrink-0">
              <form onSubmit={handleSendMessage} className="relative flex items-center group">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Message..."
                  className="w-full bg-muted/50 hover:bg-muted/80 border border-border/50 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:bg-background transition-all shadow-sm text-foreground placeholder:text-muted-foreground/70"
                  aria-label="Message input"
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim()}
                  className="absolute right-2 p-1.5 rounded-lg text-primary-foreground bg-primary shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:shadow-none hover:-translate-y-[1px] active:translate-y-0 transition-all disabled:transform-none"
                  aria-label="Send message"
                >
                  <svg className="w-4 h-4 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
