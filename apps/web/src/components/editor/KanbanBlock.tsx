import React from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'

export const KanbanBlock: React.FC<NodeViewProps> = (props) => {
  const { node, updateAttributes, editor, deleteNode } = props
  const { columns } = node.attrs

  const addCard = (colId: string) => {
    if (!editor.isEditable) return
    const newCols = columns.map((col: any) => {
      if (col.id === colId) {
        return {
          ...col,
          cards: [...col.cards, { id: Math.random().toString(36).substr(2, 9), content: 'New Task' }]
        }
      }
      return col
    })
    updateAttributes({ columns: newCols })
  }

  const updateCard = (colId: string, cardId: string, content: string) => {
    if (!editor.isEditable) return
    const newCols = columns.map((col: any) => {
      if (col.id === colId) {
        return {
          ...col,
          cards: col.cards.map((c: any) => c.id === cardId ? { ...c, content } : c)
        }
      }
      return col
    })
    updateAttributes({ columns: newCols })
  }

  const deleteCard = (colId: string, cardId: string) => {
    if (!editor.isEditable) return
    const newCols = columns.map((col: any) => {
      if (col.id === colId) {
        return {
          ...col,
          cards: col.cards.filter((c: any) => c.id !== cardId)
        }
      }
      return col
    })
    updateAttributes({ columns: newCols })
  }

  const moveCard = (sourceColId: string, targetColId: string, cardId: string) => {
    if (!editor.isEditable || sourceColId === targetColId) return
    let cardToMove: any = null
    let newCols = columns.map((col: any) => {
      if (col.id === sourceColId) {
        cardToMove = col.cards.find((c: any) => c.id === cardId)
        return {
          ...col,
          cards: col.cards.filter((c: any) => c.id !== cardId)
        }
      }
      return col
    })

    if (cardToMove) {
      newCols = newCols.map((col: any) => {
        if (col.id === targetColId) {
          return {
            ...col,
            cards: [...col.cards, cardToMove]
          }
        }
        return col
      })
    }
    updateAttributes({ columns: newCols })
  }

  return (
    <NodeViewWrapper className="kanban-block my-8 p-4 bg-muted/30 border border-border rounded-xl group relative w-full overflow-x-auto">
      <div className="flex gap-4 min-w-max pb-2" data-drag-handle>
        {columns.map((col: any) => (
          <div key={col.id} className="w-72 bg-card border border-border/50 rounded-lg shadow-sm flex flex-col flex-shrink-0">
            <div className="p-3 border-b border-border/50 flex justify-between items-center bg-muted/50 rounded-t-lg font-semibold text-sm">
              <span>{col.title}</span>
              <span className="bg-background px-2 py-0.5 rounded-full text-xs text-muted-foreground border border-border">
                {col.cards.length}
              </span>
            </div>
            
            <div className="p-2 flex-1 flex flex-col gap-2 min-h-[100px]">
              {col.cards.map((card: any) => (
                <div key={card.id} className="group/card relative bg-background border border-border rounded-md p-3 shadow-sm hover:border-primary/40 transition-colors">
                  {editor.isEditable ? (
                    <textarea
                      value={card.content}
                      onChange={(e) => updateCard(col.id, card.id, e.target.value)}
                      className="w-full bg-transparent resize-none focus:outline-none text-sm text-foreground placeholder-muted-foreground"
                      rows={2}
                      placeholder="Task description..."
                    />
                  ) : (
                    <div className="text-sm text-foreground whitespace-pre-wrap">{card.content}</div>
                  )}
                  
                  {editor.isEditable && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 flex gap-1 bg-background rounded-md shadow-sm border border-border">
                      {col.id !== 'todo' && (
                        <button onClick={() => moveCard(col.id, col.id === 'done' ? 'in-progress' : 'todo', card.id)} className="p-1 hover:text-primary transition-colors" title="Move Left">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                      )}
                      {col.id !== 'done' && (
                        <button onClick={() => moveCard(col.id, col.id === 'todo' ? 'in-progress' : 'done', card.id)} className="p-1 hover:text-primary transition-colors" title="Move Right">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      )}
                      <button onClick={() => deleteCard(col.id, card.id)} className="p-1 hover:text-destructive transition-colors" title="Delete">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              {editor.isEditable && (
                <button
                  onClick={() => addCard(col.id)}
                  className="mt-2 w-full py-2 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add Card
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {editor.isEditable && (
        <button 
          onClick={deleteNode}
          className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full bg-background border border-border shadow-sm transition-all z-10"
          title="Remove Kanban Board"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      )}
    </NodeViewWrapper>
  )
}
