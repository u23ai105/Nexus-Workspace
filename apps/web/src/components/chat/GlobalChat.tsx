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
  }, [activeDmUserId, token, serverUrl]);

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
  }, [activeDmUserId, serverUrl, token]);

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
    <div className="w-80 border-l border-white/10 bg-[#0A0A0F] flex flex-col h-full shadow-2xl relative z-40 transform transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {activeDmUserId ? (
            <button 
              onClick={() => {
                setActiveDmUserId(null);
                setActiveDmUser(null);
                fetchSummaries();
              }}
              className="p-1 hover:bg-white/10 rounded-md transition-colors"
            >
              <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : (
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          )}
          <h2 className="font-semibold text-white text-sm truncate">
            {activeDmUser ? activeDmUser.name || activeDmUser.username : "Direct Messages"}
          </h2>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : !activeDmUserId ? (
          // Contacts List
          <div className="flex flex-col">
            {summaries.length === 0 ? (
              <div className="text-center p-6 text-slate-400 mt-10">
                <p className="text-sm">No recent messages.</p>
                <p className="text-xs mt-2">Chat with a teammate by clicking their @username in a workspace chat.</p>
              </div>
            ) : (
              summaries.map((summary) => (
                <button 
                  key={summary.user.id}
                  onClick={() => {
                    setActiveDmUserId(summary.user.id);
                    setActiveDmUser(summary.user);
                  }}
                  className="flex items-center gap-3 p-4 hover:bg-white/5 border-b border-white/5 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {summary.user.name?.charAt(0).toUpperCase() || summary.user.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {summary.user.name || summary.user.username}
                      </p>
                      <span className="text-[10px] text-slate-500">
                        {new Date(summary.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate pr-2">
                      {summary.lastMessage}
                    </p>
                  </div>
                  {summary.unreadCount > 0 && (
                    <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">
                      {summary.unreadCount}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        ) : (
          // Chat View
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center p-6 text-slate-400 mt-10">
                  <p className="text-sm">Say hello to {activeDmUser?.name || 'your teammate'}!</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.senderId === currentUser.id;
                  const showHeader = i === 0 || messages[i-1].senderId !== msg.senderId || (new Date(msg.createdAt).getTime() - new Date(messages[i-1].createdAt).getTime() > 60000 * 5);
                  
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {showHeader && (
                        <div className={`flex items-center gap-1.5 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          <span className="text-[9px] text-slate-500">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                      <div className={`px-3 py-2 rounded-2xl max-w-[90%] text-sm break-words shadow-sm ${isMe ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-sm' : 'bg-[#1E1E2D] text-slate-200 rounded-tl-sm border border-white/5'}`}>
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-white/10 shrink-0 bg-[#0A0A0F]">
              <form onSubmit={handleSendMessage} className="relative flex items-center">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Message..."
                  className="w-full bg-[#1E1E2D] border border-white/10 focus:border-indigo-500 text-sm rounded-full pl-4 pr-10 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim()}
                  className="absolute right-1.5 w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center text-white disabled:opacity-30 disabled:grayscale hover:opacity-90 transition-all shadow-md"
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
