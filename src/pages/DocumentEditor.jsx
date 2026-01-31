import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDocuments } from '../hooks/useDocuments'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import { mentionSuggestion } from '../lib/mention'
import { notifyMentions, seedMentionTracker } from '../hooks/useNotifications'
import { useAuth } from '../contexts/AuthContext'
import {
  ArrowLeft,
  Check,
  Loader2,
  Bold,
  Italic,
  List,
  ListOrdered,
  Code,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Minus,
} from 'lucide-react'

export default function DocumentEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { createDocument, updateDocument, getDocument } = useDocuments()

  const [title, setTitle] = useState('')
  const [docId, setDocId] = useState(id === 'new' ? null : id)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const saveTimerRef = useRef(null)

  // Slash command state
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashFilter, setSlashFilter] = useState('')
  const [slashIndex, setSlashIndex] = useState(0)
  const [slashPos, setSlashPos] = useState({ top: 0, left: 0 })

  const slashCommands = [
    { label: 'Heading 1', icon: Heading1, action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: 'Heading 2', icon: Heading2, action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'Heading 3', icon: Heading3, action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: 'Bullet List', icon: List, action: (editor) => editor.chain().focus().toggleBulletList().run() },
    { label: 'Numbered List', icon: ListOrdered, action: (editor) => editor.chain().focus().toggleOrderedList().run() },
    { label: 'Blockquote', icon: Quote, action: (editor) => editor.chain().focus().toggleBlockquote().run() },
    { label: 'Code Block', icon: Code, action: (editor) => editor.chain().focus().toggleCodeBlock().run() },
    { label: 'Divider', icon: Minus, action: (editor) => editor.chain().focus().setHorizontalRule().run() },
  ]

  const filteredCommands = slashCommands.filter((cmd) =>
    cmd.label.toLowerCase().includes(slashFilter.toLowerCase())
  )

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing, or type / for commands…',
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion: mentionSuggestion(),
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'tiptap prose max-w-none focus:outline-none text-gray-800 leading-relaxed',
      },
      handleKeyDown: (view, event) => {
        if (slashOpen) {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setSlashIndex((i) => Math.min(i + 1, filteredCommands.length - 1))
            return true
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            setSlashIndex((i) => Math.max(i - 1, 0))
            return true
          }
          if (event.key === 'Enter') {
            event.preventDefault()
            if (filteredCommands[slashIndex]) {
              executeSlashCommand(filteredCommands[slashIndex])
            }
            return true
          }
          if (event.key === 'Escape') {
            setSlashOpen(false)
            return true
          }
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      // Check for slash command
      const { state } = editor
      const { $from } = state.selection
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)

      const slashMatch = textBefore.match(/\/(\w*)$/)
      if (slashMatch) {
        setSlashFilter(slashMatch[1])
        setSlashOpen(true)
        setSlashIndex(0)

        // Position the menu
        const coords = editor.view.coordsAtPos($from.pos)
        const editorRect = editor.view.dom.getBoundingClientRect()
        setSlashPos({
          top: coords.bottom - editorRect.top + 8,
          left: coords.left - editorRect.left,
        })
      } else {
        setSlashOpen(false)
      }

      // Auto-save
      triggerAutoSave(editor)
    },
  })

  function executeSlashCommand(cmd) {
    if (!editor) return
    // Remove the slash and filter text
    const { state } = editor
    const { $from } = state.selection
    const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)
    const slashMatch = textBefore.match(/\/(\w*)$/)

    if (slashMatch) {
      const from = $from.pos - slashMatch[0].length
      const to = $from.pos
      editor.chain().focus().deleteRange({ from, to }).run()
    }

    cmd.action(editor)
    setSlashOpen(false)
  }

  const triggerAutoSave = useCallback(
    (editorInstance) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        saveDocument(editorInstance)
      }, 1500)
    },
    [docId, title]
  )

  // Determine current user's author name
  const authorName = (() => {
    const email = user?.email || ''
    if (email.includes('paglabhoot')) return 'bhoot'
    if (email.includes('somnath') || email.includes('som')) return 'som'
    return email.split('@')[0] || 'unknown'
  })()

  async function saveDocument(editorInstance) {
    const ed = editorInstance || editor
    if (!ed) return

    setSaving(true)
    setSaved(false)

    const content = ed.getJSON()
    const docTitle = title || 'Untitled'

    try {
      if (docId) {
        await updateDocument(docId, { title: docTitle, content })
        if (loaded) notifyMentions({ content, sender: authorName, documentId: docId, docTitle })
      } else {
        const created = await createDocument({ title: docTitle, content })
        if (created) {
          setDocId(created.id)
          window.history.replaceState(null, '', `/documents/${created.id}`)
          // Seed tracker for the new doc so subsequent auto-saves don't re-notify
          seedMentionTracker('doc', created.id, content)
          notifyMentions({ content, sender: authorName, documentId: created.id, docTitle })
        }
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  // Handle title change auto-save
  useEffect(() => {
    if (!loaded) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveDocument()
    }, 1500)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [title])

  // Load existing document
  useEffect(() => {
    if (id && id !== 'new') {
      getDocument(id).then(({ data, error }) => {
        if (data && !error) {
          setTitle(data.title || '')
          if (editor && data.content) {
            editor.commands.setContent(data.content)
          }
          // Seed mention tracker so existing mentions don't re-notify
          if (data.content) {
            seedMentionTracker('doc', data.id, data.content)
          }
        }
        setLoaded(true)
      })
    } else {
      setLoaded(true)
    }
  }, [id, editor])

  // Track editor ref for realtime callback
  const editorRef = useRef(null)
  editorRef.current = editor

  // Realtime: update editor when document is changed externally
  useEffect(() => {
    if (!docId || !isSupabaseConfigured) return

    const channel = supabase
      .channel(`doc-editor-${docId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'documents', filter: `id=eq.${docId}` },
        (payload) => {
          const updated = payload.new
          const ed = editorRef.current
          if (ed && updated.content) {
            const currentPos = ed.state.selection.from
            ed.commands.setContent(updated.content)
            try {
              const maxPos = ed.state.doc.content.size
              ed.commands.setTextSelection(Math.min(currentPos, maxPos))
            } catch { /* ignore */ }
          }
          if (updated.title && updated.title !== title && !document.activeElement?.matches('input')) {
            setTitle(updated.title)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [docId])

  const toolbarButtons = [
    { icon: Bold, action: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive('bold') },
    { icon: Italic, action: () => editor?.chain().focus().toggleItalic().run(), active: editor?.isActive('italic') },
    { icon: Code, action: () => editor?.chain().focus().toggleCode().run(), active: editor?.isActive('code') },
    { divider: true },
    { icon: Heading1, action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), active: editor?.isActive('heading', { level: 1 }) },
    { icon: Heading2, action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: editor?.isActive('heading', { level: 2 }) },
    { divider: true },
    { icon: List, action: () => editor?.chain().focus().toggleBulletList().run(), active: editor?.isActive('bulletList') },
    { icon: ListOrdered, action: () => editor?.chain().focus().toggleOrderedList().run(), active: editor?.isActive('orderedList') },
    { icon: Quote, action: () => editor?.chain().focus().toggleBlockquote().run(), active: editor?.isActive('blockquote') },
  ]

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
        <button
          onClick={() => navigate('/documents')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Documents
        </button>

        <div className="flex items-center gap-2 text-xs">
          {saving && (
            <span className="flex items-center gap-1.5 text-gray-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving…
            </span>
          )}
          {saved && (
            <span className="flex items-center gap-1.5 text-gray-600">
              <Check className="w-3 h-3" />
              Saved
            </span>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-6 py-2 border-b border-gray-100">
        {toolbarButtons.map((btn, i) =>
          btn.divider ? (
            <div key={i} className="w-px h-5 bg-gray-200 mx-1" />
          ) : (
            <button
              key={i}
              onClick={btn.action}
              className={`p-1.5 rounded-md transition-colors ${
                btn.active
                  ? 'bg-black text-white'
                  : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <btn.icon className="w-4 h-4" />
            </button>
          )
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto px-6 lg:px-16 py-8 max-w-4xl mx-auto w-full">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          className="w-full text-3xl font-bold text-gray-900 bg-transparent border-none outline-none placeholder-gray-300 mb-6"
        />

        <div className="relative">
          <EditorContent editor={editor} />

          {/* Slash command menu */}
          {slashOpen && filteredCommands.length > 0 && (
            <div
              className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-2 w-56"
              style={{ top: slashPos.top, left: slashPos.left }}
            >
              {filteredCommands.map((cmd, i) => (
                <button
                  key={cmd.label}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    executeSlashCommand(cmd)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                    i === slashIndex
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <cmd.icon className="w-4 h-4 flex-shrink-0" />
                  {cmd.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
