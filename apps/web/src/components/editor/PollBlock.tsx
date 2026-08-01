import React from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'

export const PollBlock: React.FC<NodeViewProps> = (props) => {
  const { node, updateAttributes, editor, deleteNode } = props;
  const { question, options } = node.attrs;
  
  // The current user (we get this from editor storage or window, or context)
  // We injected user into editor.storage earlier if we need it, but for simplicity, we'll assume there's a global or context.
  // Actually, we can get it from window or local storage, or pass it via Tiptap extension config.
  // For now, we'll try to get it from localStorage since Tiptap NodeViews don't have direct access to React Context easily without setup.
  const storedUser = localStorage.getItem('nexus_user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const userId = currentUser?.id;

  const handleVote = (optionId: string) => {
    if (!userId || !editor.isEditable) return;

    const newOptions = options.map((opt: any) => {
      // Remove user's vote from all options (single vote per poll)
      let newVotes = opt.votes.filter((id: string) => id !== userId);
      
      // Add vote to the selected option
      if (opt.id === optionId) {
        newVotes.push(userId);
      }
      return { ...opt, votes: newVotes };
    });

    updateAttributes({ options: newOptions });
  };

  const addOption = () => {
    if (!editor.isEditable) return;
    const newOptions = [...options, { id: Math.random().toString(36).substr(2, 9), text: `Option ${options.length + 1}`, votes: [] }];
    updateAttributes({ options: newOptions });
  };

  const updateQuestion = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editor.isEditable) return;
    updateAttributes({ question: e.target.value });
  };

  const updateOptionText = (optionId: string, text: string) => {
    if (!editor.isEditable) return;
    const newOptions = options.map((opt: any) => 
      opt.id === optionId ? { ...opt, text } : opt
    );
    updateAttributes({ options: newOptions });
  };

  const removeOption = (optionId: string) => {
    if (!editor.isEditable) return;
    const newOptions = options.filter((opt: any) => opt.id !== optionId);
    updateAttributes({ options: newOptions });
  };

  const totalVotes = options.reduce((sum: number, opt: any) => sum + opt.votes.length, 0);

  return (
    <NodeViewWrapper className="poll-block my-6 border border-primary/30 rounded-xl bg-card p-5 shadow-sm max-w-md mx-auto group">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-primary/20 text-primary">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        {editor.isEditable ? (
          <>
            <input
              type="text"
              value={question}
              onChange={updateQuestion}
              placeholder="Ask a question..."
              className="flex-1 bg-transparent text-lg font-semibold text-foreground focus:outline-none focus:border-b focus:border-primary border-b border-transparent placeholder-muted-foreground"
            />
            <button 
              onClick={deleteNode}
              className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all ml-auto"
              title="Delete Poll"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </>
        ) : (
          <h3 className="flex-1 text-lg font-semibold text-foreground">{question}</h3>
        )}
      </div>

      <div className="space-y-3 mb-4">
        {options.map((opt: any) => {
          const hasVoted = opt.votes.includes(userId);
          const percent = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
          
          return (
            <div 
              key={opt.id} 
              className="relative group rounded-md overflow-hidden bg-muted/30 border border-border transition-colors hover:border-primary/50"
            >
              {/* Progress bar background */}
              <div 
                className="absolute inset-0 bg-primary/10 transition-all duration-500 ease-out z-0" 
                style={{ width: `${percent}%` }}
              />
              
              <div className="relative z-10 flex items-center p-2.5 gap-3">
                <button
                  onClick={() => handleVote(opt.id)}
                  disabled={!editor.isEditable}
                  className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${hasVoted ? 'border-primary bg-primary' : 'border-muted-foreground bg-transparent group-hover:border-primary'}`}
                >
                  {hasVoted && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                </button>
                
                {editor.isEditable ? (
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => updateOptionText(opt.id, e.target.value)}
                    className="flex-1 bg-transparent text-sm text-foreground focus:outline-none"
                    placeholder="Option text..."
                  />
                ) : (
                  <span className="flex-1 text-sm text-foreground">{opt.text}</span>
                )}
                
                <span className="text-xs font-medium text-muted-foreground w-8 text-right">
                  {percent}%
                </span>

                {editor.isEditable && (
                  <button 
                    onClick={() => removeOption(opt.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {editor.isEditable && (
        <button
          onClick={addOption}
          className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Option
        </button>
      )}
      
      <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs text-muted-foreground">
        <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">Live Poll</span>
      </div>
    </NodeViewWrapper>
  )
}
