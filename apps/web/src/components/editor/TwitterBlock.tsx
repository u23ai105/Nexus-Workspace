import React from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { Tweet } from 'react-tweet'

export const TwitterBlock: React.FC<NodeViewProps> = (props) => {
  const { node, deleteNode, editor } = props
  const { tweetId } = node.attrs

  if (!tweetId) {
    return (
      <NodeViewWrapper className="twitter-block my-6 border border-primary/30 rounded-xl bg-card p-5 shadow-sm max-w-md mx-auto group text-center text-muted-foreground">
        <p>Invalid Tweet ID</p>
        {editor.isEditable && (
          <button 
            onClick={deleteNode}
            className="mt-2 px-3 py-1 bg-destructive/10 text-destructive rounded-md hover:bg-destructive/20 transition-colors"
          >
            Remove
          </button>
        )}
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper className="twitter-block my-6 max-w-md mx-auto group relative">
      <div className="flex justify-center" data-drag-handle>
        <Tweet id={tweetId} />
      </div>
      
      {editor.isEditable && (
        <button 
          onClick={deleteNode}
          className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full bg-background border border-border shadow-sm transition-all z-10"
          title="Remove Tweet"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      )}
    </NodeViewWrapper>
  )
}
