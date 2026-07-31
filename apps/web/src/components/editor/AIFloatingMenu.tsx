import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ListTodo, PenTool, BookOpen, Check } from 'lucide-react';

interface AIFloatingMenuProps {
  editor: any;
  token: string;
  serverUrl: string;
}

export const AIFloatingMenu: React.FC<AIFloatingMenuProps> = ({ editor, token, serverUrl }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;

    const updateMenuPosition = () => {
      const { empty, from, to } = editor.state.selection;

      if (empty || from === to) {
        setIsVisible(false);
        setAiResponse(null);
        return;
      }

      const text = editor.state.doc.textBetween(from, to, ' ');
      if (!text.trim()) {
        setIsVisible(false);
        return;
      }

      setSelectedText(text);

      const { view } = editor;
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);

      // Position the menu slightly above and centered on the selection
      const top = start.top - 60; // 60px above
      const left = Math.max(0, (start.left + end.left) / 2 - 150); // center, assuming ~300px width

      setPosition({ top, left });
      setIsVisible(true);
    };

    editor.on('selectionUpdate', updateMenuPosition);

    return () => {
      editor.off('selectionUpdate', updateMenuPosition);
    };
  }, [editor]);

  // Click outside to close the result popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        // Only hide if we have a response showing, otherwise let selectionUpdate handle it
        if (aiResponse) {
           setAiResponse(null);
           setIsVisible(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [aiResponse]);

  const handleAction = async (action: string) => {
    if (!selectedText || !token) return;

    setIsLoading(true);
    setAiResponse(null);

    try {
      const res = await fetch(`${serverUrl}/api/ai/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          text: selectedText,
          context: document.title // Basic context
        })
      });

      const data = await res.json();

      if (res.ok && data.result) {
        setAiResponse(data.result);
      } else {
        setAiResponse(`Error: ${data.error || 'Failed to generate response'}`);
      }
    } catch (err) {
      console.error('AI Error:', err);
      setAiResponse('Network error while contacting AI.');
    } finally {
      setIsLoading(false);
    }
  };

  const insertResponse = () => {
    if (!aiResponse || !editor) return;
    
    // Insert after selection
    const { to } = editor.state.selection;
    editor.chain().focus().insertContentAt(to, `\n\n${aiResponse}\n`).run();
    setAiResponse(null);
    setIsVisible(false);
  };
  
  const replaceWithResponse = () => {
     if (!aiResponse || !editor) return;
     
     editor.chain().focus().insertContent(aiResponse).run();
     setAiResponse(null);
     setIsVisible(false);
  }

  if (!isVisible) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 transition-all duration-200 ease-out"
      style={{
        top: `${position.top + window.scrollY}px`,
        left: `${position.left + window.scrollX}px`,
      }}
    >
      {/* AI Action Menu (Hidden if we are showing a result) */}
      {!aiResponse && (
        <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-lg animate-in fade-in zoom-in duration-200">
          <div className="pl-2 pr-1 text-purple-500">
            <Sparkles size={16} className={isLoading ? "animate-spin" : ""} />
          </div>
          
          <button
            disabled={isLoading}
            onClick={() => handleAction('summarize')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50"
          >
            <BookOpen size={14} />
            Summarize
          </button>
          
          <button
            disabled={isLoading}
            onClick={() => handleAction('extract-tasks')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50"
          >
            <ListTodo size={14} />
            Extract Tasks
          </button>
          
          <button
            disabled={isLoading}
            onClick={() => handleAction('rewrite')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50"
          >
            <PenTool size={14} />
            Rewrite
          </button>
        </div>
      )}

      {/* AI Response Popover */}
      {aiResponse && (
        <div className="w-[400px] bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50 shadow-2xl rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 mt-2">
          <div className="bg-purple-50 dark:bg-purple-900/20 px-4 py-2 border-b border-purple-100 dark:border-purple-900/30 flex items-center gap-2">
            <Sparkles size={16} className="text-purple-500" />
            <span className="text-sm font-semibold text-purple-700 dark:text-purple-400">Nexus Copilot</span>
          </div>
          
          <div className="p-4 max-h-[300px] overflow-y-auto text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {aiResponse}
          </div>
          
          <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
             <button
              onClick={replaceWithResponse}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              Replace Selection
            </button>
            <button
              onClick={insertResponse}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors shadow-sm"
            >
              <Check size={14} />
              Insert Below
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
