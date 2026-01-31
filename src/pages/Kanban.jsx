import { useState, useEffect, useRef } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useKanban } from '../hooks/useKanban'
import { useComments } from '../hooks/useComments'
import { notifyMentions } from '../hooks/useNotifications'
import { useAuth } from '../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import { mentionSuggestion } from '../lib/mention'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  Calendar as CalendarIcon,
  Flag,
  Bold,
  Italic,
  List,
  ListOrdered,
  Code,
  Quote,
  Heading1,
  Heading2,
  User,
  MessageSquare,
  Send,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

// Extract plain text from Tiptap JSON or plain string
function extractPlainText(description) {
  if (!description) return ''
  // If it looks like JSON, try to parse and extract text
  const trimmed = description.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const doc = JSON.parse(trimmed)
      if (doc && doc.type === 'doc' && doc.content) {
        const texts = []
        function walk(node) {
          if (node.text) texts.push(node.text)
          if (node.content) node.content.forEach(walk)
        }
        walk(doc)
        return texts.join(' ').trim()
      }
      return ''
    } catch {
      return ''
    }
  }
  return description
}

const PRIORITIES = {
  urgent: { label: 'Urgent', color: 'bg-gray-200 text-gray-800 border-gray-300' },
  high: { label: 'High', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  medium: { label: 'Medium', color: 'bg-gray-50 text-gray-600 border-gray-200' },
  low: { label: 'Low', color: 'bg-gray-50 text-gray-500 border-gray-200' },
}

const ASSIGNEES = {
  som: { label: 'Som', avatar: 'S', color: 'bg-gray-900 text-white' },
  bhoot: { label: 'Bhoot', avatar: '👻', color: 'bg-gray-100 text-gray-800 border border-gray-300' },
}

export default function Kanban() {
  const {
    columns,
    cards,
    loading,
    addColumn,
    renameColumn,
    deleteColumn,
    addCard,
    updateCard,
    deleteCard,
    moveCard,
  } = useKanban()

  const [editingCard, setEditingCard] = useState(null)
  const [showCardModal, setShowCardModal] = useState(false)
  const [newCardColId, setNewCardColId] = useState(null)
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [filterTag, setFilterTag] = useState('')

  // Collect all unique tags across cards
  const allTags = [...new Set(cards.flatMap((c) => c.tags || []))].sort()

  function onDragEnd(result) {
    const { draggableId, destination, source } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    moveCard(draggableId, destination.droppableId, destination.index)
  }

  function getColumnCards(colId) {
    return cards
      .filter((c) => c.column_id === colId)
      .filter((c) => !filterTag || (c.tags && c.tags.includes(filterTag)))
      .sort((a, b) => a.position - b.position)
  }

  function handleAddColumn() {
    if (newColumnTitle.trim()) {
      addColumn(newColumnTitle.trim())
      setNewColumnTitle('')
      setAddingColumn(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 lg:px-8 py-5 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500 text-sm mt-1">
            {cards.length} task{cards.length !== 1 ? 's' : ''} across {columns.length} columns
          </p>
        </div>
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 font-medium">Filter:</span>
            <button
              onClick={() => setFilterTag('')}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                !filterTag
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                  filterTag === tag
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 lg:p-8">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-5 h-full items-start">
            {columns.map((col) => (
              <Column
                key={col.id}
                column={col}
                cards={getColumnCards(col.id)}
                onRename={renameColumn}
                onDelete={deleteColumn}
                onAddCard={() => {
                  setNewCardColId(col.id)
                  setEditingCard(null)
                  setShowCardModal(true)
                }}
                onEditCard={(card) => {
                  setEditingCard(card)
                  setNewCardColId(card.column_id)
                  setShowCardModal(true)
                }}
                onDeleteCard={deleteCard}
              />
            ))}

            {/* Add column */}
            {addingColumn ? (
              <div className="w-72 flex-shrink-0 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                <input
                  autoFocus
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddColumn()
                    if (e.key === 'Escape') setAddingColumn(false)
                  }}
                  placeholder="Column title"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/40 mb-3"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddColumn}
                    className="px-3 py-1.5 bg-black hover:bg-gray-800 rounded-lg text-sm text-white font-medium transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setAddingColumn(false)}
                    className="px-3 py-1.5 text-gray-500 hover:text-gray-900 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingColumn(true)}
                className="w-72 flex-shrink-0 flex items-center justify-center gap-2 py-4 bg-white hover:bg-gray-50 border border-dashed border-gray-300 hover:border-gray-400 rounded-2xl text-sm text-gray-400 hover:text-gray-700 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Column
              </button>
            )}
          </div>
        </DragDropContext>
      </div>

      {/* Card Modal */}
      {showCardModal && (
        <CardModal
          card={editingCard}
          columnId={newCardColId}
          columns={columns}
          onSave={async (data) => {
            if (editingCard) {
              await updateCard(editingCard.id, data)
            } else {
              await addCard({ ...data, column_id: newCardColId })
            }
            setShowCardModal(false)
            setEditingCard(null)
          }}
          onClose={() => {
            setShowCardModal(false)
            setEditingCard(null)
          }}
        />
      )}
    </div>
  )
}

// ─── Column Component ────────────────────────────────

function Column({ column, cards, onRename, onDelete, onAddCard, onEditCard, onDeleteCard }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(column.title)

  function handleRename() {
    if (title.trim() && title !== column.title) {
      onRename(column.id, title.trim())
    }
    setEditing(false)
  }

  return (
    <div className="w-72 flex-shrink-0 flex flex-col max-h-full bg-gray-100 rounded-2xl p-3 border border-gray-200">
      {/* Column header */}
      <div className="flex items-center justify-between px-1 py-1 mb-2">
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename()
              if (e.key === 'Escape') {
                setTitle(column.title)
                setEditing(false)
              }
            }}
            className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400/40 w-full"
          />
        ) : (
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: column.color }}
            />
            <h3 className="text-sm font-semibold text-gray-900">{column.title}</h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
              {cards.length}
            </span>
          </div>
        )}

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 text-gray-400 hover:text-gray-900 rounded-md hover:bg-gray-100 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 w-40">
                <button
                  onClick={() => {
                    setEditing(true)
                    setMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Rename
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${column.title}" column and all its cards?`)) {
                      onDelete(column.id)
                    }
                    setMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-gray-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cards droppable area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto space-y-2 pb-2 min-h-[60px] rounded-xl transition-colors ${
              snapshot.isDraggingOver ? 'bg-gray-200/60' : ''
            }`}
          >
            {cards.map((card, index) => (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`group bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl p-3.5 cursor-grab active:cursor-grabbing transition-all shadow-sm ${
                      snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                    }`}
                    onClick={() => onEditCard(card)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 line-clamp-2">
                          {card.title}
                        </p>
                        {card.description && extractPlainText(card.description) && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {extractPlainText(card.description)}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                          {card.priority && PRIORITIES[card.priority] && (
                            <span
                              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border ${PRIORITIES[card.priority].color}`}
                            >
                              <Flag className="w-3 h-3" />
                              {PRIORITIES[card.priority].label}
                            </span>
                          )}
                          {card.due_date && (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                              <CalendarIcon className="w-3 h-3" />
                              {format(new Date(card.due_date), 'MMM d')}
                            </span>
                          )}
                          {card.tags &&
                            card.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200"
                              >
                                #{tag}
                              </span>
                            ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('Delete this card?')) onDeleteCard(card.id)
                          }}
                          className="p-1 text-gray-300 hover:text-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {card.assigned_to && ASSIGNEES[card.assigned_to] && (
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${ASSIGNEES[card.assigned_to].color}`}
                            title={ASSIGNEES[card.assigned_to].label}
                          >
                            {ASSIGNEES[card.assigned_to].avatar}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Add card button */}
      <button
        onClick={onAddCard}
        className="flex items-center justify-center gap-2 py-2.5 mt-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-xl text-sm transition-all"
      >
        <Plus className="w-4 h-4" />
        Add card
      </button>
    </div>
  )
}

// ─── Card Modal (Two-Column: Attributes + Rich Text Description) ─────

function CardModal({ card, columnId, columns, onSave, onClose }) {
  const { user } = useAuth()
  const [title, setTitle] = useState(card?.title || '')
  const [priority, setPriority] = useState(card?.priority || 'medium')
  const [dueDate, setDueDate] = useState(card?.due_date || '')
  const [tagsText, setTagsText] = useState(card?.tags?.length ? card.tags.map(t => `#${t}`).join(' ') : '')
  const [selectedColumn, setSelectedColumn] = useState(columnId)
  const [assignedTo, setAssignedTo] = useState(card?.assigned_to || '')
  const [commentText, setCommentText] = useState('')

  // Comments (only for existing cards)
  const { comments, loading: commentsLoading, addComment, deleteComment } = useComments(card?.id)

  // Determine current user's author name from email
  const authorName = (() => {
    const email = user?.email || ''
    if (email.includes('paglabhoot')) return 'bhoot'
    if (email.includes('somnath') || email.includes('som')) return 'som'
    return email.split('@')[0] || 'unknown'
  })()

  // Parse existing description — could be JSON (Tiptap) or plain string
  const initialContent = (() => {
    if (!card?.description) return ''
    try {
      const parsed = JSON.parse(card.description)
      if (parsed && parsed.type === 'doc') return parsed
      return card.description
    } catch {
      // Plain text — wrap in a paragraph
      if (card.description.trim()) {
        return {
          type: 'doc',
          content: card.description.split('\n').filter(Boolean).map(text => ({
            type: 'paragraph',
            content: [{ type: 'text', text }]
          }))
        }
      }
      return ''
    }
  })()

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Add a detailed description… Type @ to mention, / for commands',
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion: mentionSuggestion(),
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'tiptap prose max-w-none focus:outline-none text-gray-800 leading-relaxed text-sm min-h-[300px]',
      },
    },
  })

  // Track the latest editor ref so the realtime callback always has it
  const editorRef = useRef(null)
  editorRef.current = editor

  // Realtime: update editor when card description is changed externally
  useEffect(() => {
    if (!card?.id || !isSupabaseConfigured) return

    const channel = supabase
      .channel(`card-modal-${card.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'kanban_cards', filter: `id=eq.${card.id}` },
        (payload) => {
          const updated = payload.new
          const ed = editorRef.current
          if (ed && updated.description) {
            try {
              const content = JSON.parse(updated.description)
              if (content && content.type === 'doc') {
                // Save cursor position, update content, restore cursor
                const currentPos = ed.state.selection.from
                ed.commands.setContent(content)
                try {
                  const maxPos = ed.state.doc.content.size
                  ed.commands.setTextSelection(Math.min(currentPos, maxPos))
                } catch { /* ignore */ }
              }
            } catch {
              // not JSON, skip
            }
          }
          if (updated.assigned_to !== undefined) setAssignedTo(updated.assigned_to || '')
          if (updated.priority) setPriority(updated.priority)
          if (updated.due_date !== undefined) setDueDate(updated.due_date || '')
          if (updated.tags) setTagsText(updated.tags.map(t => `#${t}`).join(' '))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [card?.id])

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return

    const tags = tagsText
      .split(/\s*#/)
      .map((t) => t.trim())
      .filter(Boolean)

    // Store description as Tiptap JSON
    const descriptionJson = editor ? JSON.stringify(editor.getJSON()) : ''

    const data = {
      title: title.trim(),
      description: descriptionJson,
      priority,
      due_date: dueDate || null,
      tags,
      assigned_to: assignedTo || null,
    }

    // If column changed on edit, include column_id
    if (card && selectedColumn !== card.column_id) {
      data.column_id = selectedColumn
    }

    onSave(data)

    // Notify mentioned users in the description
    if (editor) {
      const content = editor.getJSON()
      notifyMentions({
        content,
        sender: authorName,
        cardId: card?.id || null,
        cardTitle: title.trim(),
      })
    }
  }

  const toolbarButtons = [
    { icon: Bold, action: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive('bold'), title: 'Bold' },
    { icon: Italic, action: () => editor?.chain().focus().toggleItalic().run(), active: editor?.isActive('italic'), title: 'Italic' },
    { icon: Code, action: () => editor?.chain().focus().toggleCode().run(), active: editor?.isActive('code'), title: 'Code' },
    { divider: true },
    { icon: Heading1, action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), active: editor?.isActive('heading', { level: 1 }), title: 'Heading 1' },
    { icon: Heading2, action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: editor?.isActive('heading', { level: 2 }), title: 'Heading 2' },
    { divider: true },
    { icon: List, action: () => editor?.chain().focus().toggleBulletList().run(), active: editor?.isActive('bulletList'), title: 'Bullet List' },
    { icon: ListOrdered, action: () => editor?.chain().focus().toggleOrderedList().run(), active: editor?.isActive('orderedList'), title: 'Numbered List' },
    { icon: Quote, action: () => editor?.chain().focus().toggleBlockquote().run(), active: editor?.isActive('blockquote'), title: 'Quote' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white border border-gray-200 rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex-1 mr-4">
            <input
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Card title"
              className="w-full text-xl font-bold text-gray-900 bg-transparent border-none outline-none placeholder-gray-300"
            />
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-md hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Two-column body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left: Description (rich text editor) */}
          <div className="flex-1 flex flex-col border-r border-gray-200 min-w-0">
            {/* Editor toolbar */}
            <div className="flex items-center gap-0.5 px-4 py-2 border-b border-gray-100 flex-shrink-0">
              {toolbarButtons.map((btn, i) =>
                btn.divider ? (
                  <div key={i} className="w-px h-5 bg-gray-200 mx-1" />
                ) : (
                  <button
                    key={i}
                    type="button"
                    onClick={btn.action}
                    title={btn.title}
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

            {/* Editor content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <EditorContent editor={editor} />

              {/* Comments section (only for existing cards) */}
              {card && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-4 h-4 text-gray-400" />
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Comments {comments.length > 0 && `(${comments.length})`}
                    </h3>
                  </div>

                  {/* Comment list */}
                  <div className="space-y-3 mb-4">
                    {commentsLoading && (
                      <p className="text-sm text-gray-400">Loading comments…</p>
                    )}
                    {!commentsLoading && comments.length === 0 && (
                      <p className="text-sm text-gray-400">No comments yet</p>
                    )}
                    {comments.map((comment) => {
                      const isOwn = comment.user_id === user?.id
                      const assignee = ASSIGNEES[comment.author]
                      return (
                        <div key={comment.id} className="group flex gap-3">
                          <div className={`flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold mt-0.5 ${assignee?.color || 'bg-gray-100 text-gray-500'}`}>
                            {assignee?.avatar || comment.author?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {assignee?.label || comment.author}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                              </span>
                              {isOwn && (
                                <button
                                  type="button"
                                  onClick={() => deleteComment(comment.id)}
                                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{comment.content}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Add comment */}
                  <div className="flex gap-2">
                    <div className={`flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold mt-1 ${ASSIGNEES[authorName]?.color || 'bg-gray-100 text-gray-500'}`}>
                      {ASSIGNEES[authorName]?.avatar || authorName[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && commentText.trim()) {
                            e.preventDefault()
                            addComment(commentText, authorName)
                            setCommentText('')
                          }
                        }}
                        placeholder="Add a comment…"
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/40 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (commentText.trim()) {
                            addComment(commentText, authorName)
                            setCommentText('')
                          }
                        }}
                        disabled={!commentText.trim()}
                        className="p-2 text-gray-400 hover:text-gray-900 disabled:opacity-30 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Attributes */}
          <div className="w-72 flex-shrink-0 overflow-y-auto p-5 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</label>
              <select
                value={selectedColumn}
                onChange={(e) => setSelectedColumn(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400/40 transition-all"
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>{col.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Assignee</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400/40 transition-all"
              >
                <option value="">Unassigned</option>
                {Object.entries(ASSIGNEES).map(([key, { label, avatar }]) => (
                  <option key={key} value={key}>{avatar} {label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Priority</label>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(PRIORITIES).map(([key, { label, color }]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPriority(key)}
                    className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      priority === key
                        ? color + ' ring-1 ring-offset-1 ring-offset-white ring-gray-400'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Flag className="w-3 h-3" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400/40 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tags</label>
              <input
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="#design #frontend #bug"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/40 transition-all"
              />
              {tagsText && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tagsText.split(/\s*#/).map((t) => t.trim()).filter(Boolean).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {card && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-400">
                  Created {format(new Date(card.created_at), 'MMM d, yyyy')}
                </p>
                {card.updated_at && card.updated_at !== card.created_at && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Updated {format(new Date(card.updated_at), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 bg-black hover:bg-gray-800 rounded-xl text-sm text-white font-medium transition-colors"
          >
            {card ? 'Save Changes' : 'Create Card'}
          </button>
        </div>
      </div>
    </div>
  )
}
