import { useState } from 'react'
import { Download } from 'lucide-react'
import type { Editor } from '@tiptap/react'
import TurndownService from 'turndown'
import html2pdf from 'html2pdf.js'

interface ExportMenuProps {
  editor: Editor | null
  documentTitle: string
}

export function ExportMenu({ editor, documentTitle }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!editor) return null

  const handleExportMarkdown = () => {
    const html = editor.getHTML()
    const turndownService = new TurndownService({ headingStyle: 'atx' })
    const markdown = turndownService.turndown(html)
    
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${documentTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setIsOpen(false)
  }

  const handleExportPDF = () => {
    const element = document.createElement('div')
    element.innerHTML = editor.getHTML()
    // Add some basic styling for PDF
    element.style.padding = '40px'
    element.style.fontFamily = 'sans-serif'
    element.style.lineHeight = '1.6'
    
    // Convert canvas (if any) or images nicely
    
    const opt = {
      margin: 10,
      filename: `${documentTitle}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    }
    html2pdf().set(opt).from(element).save()
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md border border-border transition-colors"
        title="Export Document"
      >
        <Download size={14} />
        <span>Export</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-md shadow-lg z-50 overflow-hidden">
          <div className="py-1">
            <button
              onClick={handleExportPDF}
              className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted hover:text-primary transition-colors flex items-center justify-between group"
            >
              <span>Export as PDF</span>
              <span className="text-xs text-muted-foreground group-hover:text-primary/70">.pdf</span>
            </button>
            <button
              onClick={handleExportMarkdown}
              className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted hover:text-primary transition-colors flex items-center justify-between group"
            >
              <span>Export as Markdown</span>
              <span className="text-xs text-muted-foreground group-hover:text-primary/70">.md</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
