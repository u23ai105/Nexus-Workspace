import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface WorkspaceAIChatProps {
  workspaceId: string;
  token: string;
  serverUrl: string;
}

export const WorkspaceAIChat: React.FC<WorkspaceAIChatProps> = ({
  workspaceId,
  token,
  serverUrl
}) => {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! I am your Nexus AI Assistant. I have context on your workspace documents and tasks. How can I help you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: AIChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${serverUrl}/api/ai/workspace-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: userMessage.content,
          workspaceId
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: data.result || 'Sorry, I could not generate a response.'
          }
        ]);
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to get AI response');
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Error: ${err.message}`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-80 md:w-96 border-l border-border/30 bg-background/95 backdrop-blur-xl flex flex-col h-full shadow-2xl relative z-20 transition-all duration-300">
      <div className="p-4 border-b border-border/30 flex items-center justify-between sticky top-0 bg-background/60 backdrop-blur-md z-10">
        <h3 className="font-semibold flex items-center gap-2.5 text-foreground tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Bot size={18} className="text-white" />
          </div>
          Workspace AI
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
              msg.role === 'assistant' 
                ? 'bg-gradient-to-br from-purple-500/20 to-indigo-500/20 text-purple-400 border border-purple-500/20' 
                : 'bg-muted border border-border/50 text-muted-foreground'
            }`}>
              {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
              msg.role === 'user' 
                ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-tr-sm' 
                : 'bg-card/80 backdrop-blur-sm border border-border/50 text-foreground rounded-tl-sm'
            }`}>
              {msg.role === 'user' ? (
                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              ) : (
                <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted/80 prose-pre:border prose-pre:border-border/50 max-w-none text-foreground/90 prose-p:text-foreground/90 prose-headings:text-foreground prose-strong:text-foreground">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0 shadow-sm">
              <Bot size={16} />
            </div>
            <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3.5 text-sm flex items-center gap-1.5 shadow-sm">
              <div className="w-1.5 h-1.5 bg-purple-500/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-purple-500/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-purple-500/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border/30 bg-background/60 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="relative flex items-center group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI about the workspace..."
            className="w-full bg-muted/50 hover:bg-muted/80 border border-border/50 rounded-2xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-background transition-all shadow-sm text-foreground placeholder:text-muted-foreground/70"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 p-2 rounded-xl text-white bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-sm shadow-purple-500/20 hover:shadow-purple-500/40 disabled:opacity-50 disabled:shadow-none hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:transform-none"
          >
            <Send size={14} className={isLoading ? "animate-pulse" : ""} />
          </button>
        </form>
      </div>
    </div>
  );
};
