import type { Editor } from '@tiptap/react'
import {
  Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered,
  Code, CodeSquare,
  Quote, Minus,
  AlignLeft, AlignCenter, AlignRight,
  Highlighter, Link2,
  Undo2, Redo2,
  RemoveFormatting,
  BarChart2,
  Sparkles,
  Video as YoutubeIcon,
  MessageCircle as TwitterIcon,
  Columns as ColumnsIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ToolbarProps {
  editor: Editor | null
}

interface ToolbarButtonProps {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-8 w-8 focus:outline-none transition-colors ${
        isActive ? 'bg-muted text-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
      }`}
      aria-label={title}
    >
      {children}
    </Button>
  )
}

function Divider() {
  return <div className="w-[1px] h-5 bg-border/60 mx-1 shrink-0" />
}

export function EditorToolbar({ editor }: ToolbarProps) {
  if (!editor) return null

  const setLink = () => {
    const url = window.prompt('Enter URL:', editor.getAttributes('link').href || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const addYoutubeVideo = () => {
    const url = prompt('Enter YouTube URL')
    if (url) {
      editor.commands.setYoutubeVideo({
        src: url,
        width: Math.max(320, parseInt('640', 10)) || 640,
        height: Math.max(180, parseInt('480', 10)) || 480,
      })
    }
  }

  const addTweet = () => {
    const url = prompt('Enter Tweet URL (e.g. https://twitter.com/user/status/123456789)')
    if (url) {
      const match = url.match(/(?:twitter\.com|x\.com)\/.*\/status\/([0-9]+)/i)
      const tweetId = match ? match[1] : url
      
      if (tweetId) {
        editor.commands.setTweet({ tweetId })
      }
    }
  }

  return (
    <div className="w-max flex items-center gap-1 shrink-0 px-1">
      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
          <Undo2 size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Y)">
          <Redo2 size={15} />
        </ToolbarButton>
      </div>

      <Divider />

      {/* Headings */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Heading 1">
          <Heading1 size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Heading 2">
          <Heading2 size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="Heading 3">
          <Heading3 size={15} />
        </ToolbarButton>
      </div>

      <Divider />

      {/* Text formatting */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold (Ctrl+B)">
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic (Ctrl+I)">
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline (Ctrl+U)">
          <Underline size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Strikethrough">
          <Strikethrough size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} title="Inline Code">
          <Code size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} isActive={editor.isActive('highlight')} title="Highlight">
          <Highlighter size={15} />
        </ToolbarButton>
      </div>

      <Divider />

      {/* Lists */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List">
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Ordered List">
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Blockquote">
          <Quote size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} title="Code Block">
          <CodeSquare size={15} />
        </ToolbarButton>
      </div>

      <Divider />

      {/* Alignment */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Align Left">
          <AlignLeft size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Align Center">
          <AlignCenter size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Align Right">
          <AlignRight size={15} />
        </ToolbarButton>
      </div>

      <Divider />

      {/* Extras */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton onClick={setLink} isActive={editor.isActive('link')} title="Insert Link">
          <Link2 size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
          <Minus size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear Formatting">
          <RemoveFormatting size={15} />
        </ToolbarButton>
      </div>

      <Divider />

      <div className="flex items-center gap-0.5">
        <ToolbarButton onClick={() => editor.chain().focus().insertKanban().run()} title="Insert Kanban Board">
          <ColumnsIcon size={15} className="text-orange-500/80" />
        </ToolbarButton>

        <ToolbarButton onClick={() => editor.chain().focus().insertContent({ type: 'poll' }).run()} title="Insert Poll (/poll)">
          <BarChart2 size={15} />
        </ToolbarButton>

        <ToolbarButton onClick={addYoutubeVideo} title="Embed YouTube Video">
          <YoutubeIcon size={15} className="text-red-500/80" />
        </ToolbarButton>

        <ToolbarButton onClick={addTweet} title="Embed Tweet">
          <TwitterIcon size={15} className="text-blue-400/80" />
        </ToolbarButton>
      </div>
      
      <div className="ml-auto">
        <ToolbarButton
          onClick={() => {
            const length = editor.state.doc.content.size
            editor.commands.setTextSelection({ from: 1, to: Math.max(1, length - 1) })
          }}
          title="Ask AI Copilot (Selects all text)"
        >
          <Sparkles size={15} className="text-purple-500/80" />
        </ToolbarButton>
      </div>
    </div>
  )
}
