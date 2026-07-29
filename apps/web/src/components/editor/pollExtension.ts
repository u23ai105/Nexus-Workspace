import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { PollBlock } from './PollBlock'

export const PollExtension = Node.create({
  name: 'poll',

  group: 'block',
  
  atom: true, // It's a single block

  addAttributes() {
    return {
      question: {
        default: 'What is your vote?',
      },
      options: {
        default: [
          { id: '1', text: 'Option 1', votes: [] },
          { id: '2', text: 'Option 2', votes: [] },
        ],
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="poll"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'poll' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(PollBlock)
  },
})
