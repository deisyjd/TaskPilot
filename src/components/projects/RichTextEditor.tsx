'use client'

import { forwardRef, useImperativeHandle, useState, type ReactNode } from 'react'
import { useEditor, useEditorState, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import { Placeholder } from '@tiptap/extensions'
import { Bold, Italic, Strikethrough, Highlighter, Link2, Link2Off, List, ListOrdered } from 'lucide-react'

export interface RichTextEditorHandle {
  focus: () => void
}

interface Props {
  content: string
  editable: boolean
  onChange: (html: string) => void
  placeholder?: string
}

const HEADING_LEVELS = [1, 2, 3] as const

export const RichTextEditor = forwardRef<RichTextEditorHandle, Props>(function RichTextEditor(
  { content, editable, onChange, placeholder },
  ref
) {
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    content,
    extensions: [
      StarterKit.configure({
        heading: { levels: [...HEADING_LEVELS] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer nofollow' },
        },
      }),
      Highlight,
      Placeholder.configure({ placeholder: placeholder ?? '', showOnlyWhenEditable: true }),
    ],
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: 'wipli-note-content' },
    },
  })

  useImperativeHandle(ref, () => ({
    focus: () => { editor?.chain().focus().run() },
  }), [editor])

  const state = useEditorState({
    editor,
    selector: (ctx) => {
      const e = ctx.editor
      if (!e) return null
      return {
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        strike: e.isActive('strike'),
        highlight: e.isActive('highlight'),
        bulletList: e.isActive('bulletList'),
        orderedList: e.isActive('orderedList'),
        headingLevel: HEADING_LEVELS.find((l) => e.isActive('heading', { level: l })) ?? 0,
        linkHref: (e.getAttributes('link').href as string | undefined) ?? '',
      }
    },
  })

  if (!editor) return null

  function openLinkPopover() {
    setLinkUrl(state?.linkHref ?? '')
    setLinkPopoverOpen((v) => !v)
  }

  function applyLink() {
    const url = linkUrl.trim()
    if (!url) {
      editor!.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      const href = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`
      editor!.chain().focus().extendMarkRange('link').setLink({ href }).run()
    }
    setLinkPopoverOpen(false)
  }

  function removeLink() {
    editor!.chain().focus().extendMarkRange('link').unsetLink().run()
    setLinkPopoverOpen(false)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {editable && (
        <div className="relative flex items-center gap-1 px-1 pb-2 flex-wrap shrink-0">
          <select
            value={state?.headingLevel ?? 0}
            onChange={(e) => {
              const level = Number(e.target.value)
              if (level === 0) editor.chain().focus().setParagraph().run()
              else editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run()
            }}
            className="text-xs rounded-lg px-1.5 py-1 mr-1 outline-none"
            style={{ border: '1px solid rgba(0,0,0,0.12)', backgroundColor: 'rgba(255,255,255,0.6)', color: 'var(--tp-text)' }}
          >
            <option value={0}>Normal</option>
            <option value={1}>Título 1</option>
            <option value={2}>Título 2</option>
            <option value={3}>Título 3</option>
          </select>

          <ToolbarButton active={state?.bold} label="Negrita" onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton active={state?.italic} label="Cursiva" onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton active={state?.strike} label="Tachado" onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton active={state?.highlight} label="Resaltar" onClick={() => editor.chain().focus().toggleHighlight().run()}>
            <Highlighter className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton active={state?.bulletList} label="Lista" onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton active={state?.orderedList} label="Lista numerada" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton active={Boolean(state?.linkHref) || linkPopoverOpen} label="Enlace" onClick={openLinkPopover}>
            <Link2 className="w-3.5 h-3.5" />
          </ToolbarButton>

          {linkPopoverOpen && (
            <div
              className="absolute top-full left-0 mt-1 flex items-center gap-1.5 p-2 rounded-xl z-10"
              style={{ backgroundColor: 'var(--tp-surface)', border: '1px solid var(--tp-border)', boxShadow: 'var(--tp-shadow-md)' }}
            >
              <input
                autoFocus
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); applyLink() }
                  if (e.key === 'Escape') setLinkPopoverOpen(false)
                }}
                placeholder="https://…"
                className="text-xs outline-none px-2 py-1 rounded-lg"
                style={{ border: '1px solid var(--tp-border)', width: '200px', color: 'var(--tp-text)' }}
              />
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={applyLink}
                className="text-xs font-medium px-2 py-1 rounded-lg hover:opacity-80 shrink-0"
                style={{ backgroundColor: 'var(--tp-dark)', color: '#fff' }}
              >
                Aplicar
              </button>
              {state?.linkHref && (
                <button onMouseDown={(e) => e.preventDefault()} onClick={removeLink} title="Quitar enlace" className="hover:opacity-70 shrink-0">
                  <Link2Off className="w-3.5 h-3.5" style={{ color: 'var(--tp-text-2)' }} />
                </button>
              )}
            </div>
          )}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
})

function ToolbarButton({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:opacity-80 shrink-0"
      style={{
        backgroundColor: active ? 'var(--tp-dark)' : 'rgba(0,0,0,0.06)',
        color: active ? '#fff' : 'var(--tp-text-2)',
      }}
    >
      {children}
    </button>
  )
}
