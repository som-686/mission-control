import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useKanban } from '../hooks/useKanban'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  Calendar as CalendarIcon,
  Flag,
  GripVertical,
  Bold,
  Italic,
  List,
  ListOrdered,
  Code,
  Quote,
  Heading1,
  Heading2,
} from 'lucide-react'
import { format } from 'date-fns'

const PRIORITIES = {
  urgent: { label: 'Urgent', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  high: { label: 'High', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  medium: { label: 'Medium', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  low: { label: 'Low', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
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

  function onDragEnd(result) {
    const { draggableId, destination, source } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    moveCard(draggableId, destination.droppableId, destination.index)
  }

  function getColumnCards(colId) {
    return cards
      .filter((c) => c.column_id === colId)
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
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 lg:px-8 py-5 border-b border-slate-800/60">
        <div>
          <h1 className="text-2xl font-bold text-white">Kanban Board</h1>
          <p className="text-slate-400 text-sm mt-1">
            {cards.length} task{cards.length !== 1 ? 's' : ''} across {columns.length} columns
          </p>
        </div>
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
              <div className="w-72 flex-shrink-0 bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4">
                <input
                  autoFocus
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddColumn()
                    if (e.key === 'Escape') setAddingColumn(false)
                  }}
                  placeholder="Column title"
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 mb-3"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddColumn}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white font-medium transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setAddingColumn(false)}
                    className="px-3 py-1.5 text-slate-400 hover:text-white text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingColumn(true)}
                className="w-72 flex-shrink-0 flex items-center justify-center gap-2 py-4 bg-slate-800/20 hover:bg-slate-800/40 border border-dashed border-slate-700/40 hover:border-slate-600/60 rounded-2xl text-sm text-slate-500 hover:text-slate-300 transition-all"
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
    <div className="w-72 flex-shrink-0 flex flex-col max-h-full">
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2 mb-3">
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
            className="px-2 py-1 bg-slate-900/60 border border-slate-600/50 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 w-full"
          />
        ) : (
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: column.color }}
            />
            <h3 className="text-sm font-semibold text-slate-200">{column.title}</h3>
            <span className="text-xs text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded-md">
              {cards.length}
            </span>
          </div>
        )}

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 text-slate-500 hover:text-white rounded-md hover:bg-slate-800/60 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-50 bg-slate-800 border border-slate-700/60 rounded-xl shadow-2xl py-1.5 w-40">
                <button
                  onClick={() => {
                    setEditing(true)
                    setMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/60 transition-colors"
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
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-700/60 transition-colors"
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
            className={`flex-1 overflow-y-auto space-y-2 px-1 pb-2 min-h-[60px] rounded-xl transition-colors ${
              snapshot.isDraggingOver ? 'bg-indigo-500/5' : ''
            }`}
          >
            {cards.map((card, index) => (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`group bg-slate-800/60 hover:bg-slate-800/80 border border-slate-700/40 hover:border-slate-600/50 rounded-xl p-3.5 cursor-pointer transition-all ${
                      snapshot.isDragging ? 'shadow-2xl shadow-indigo-500/10 rotate-2' : ''
                    }`}
                    onClick={() => onEditCard(card)}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        {...provided.dragHandleProps}
                        className="mt-0.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 line-clamp-2">
                          {card.title}
                        </p>
                        {card.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {card.description}
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
                            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                              <CalendarIcon className="w-3 h-3" />
                              {format(new Date(card.due_date), 'MMM d')}
                            </span>
                          )}
                          {card.labels &&
                            card.labels.map((label) => (
                              <span
                                key={label}
                                className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/20"
                              >
                                {label}
                              </span>
                            ))}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('Delete this card?')) onDeleteCard(card.id)
                        }}
                        className="p-1 text-slate-600 hover:text-red-400 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
        className="flex items-center justify-center gap-2 py-2.5 mt-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800/40 rounded-xl text-sm transition-all border border-transparent hover:border-slate-700/40"
      >
        <Plus className="w-4 h-4" />
        Add card
      </button>
    </div>
  )
}

// ─── Card Modal (Two-Column: Attributes + Rich Text Description) ─────

function CardModal({ card, columnId, columns, onSave, onClose }) {
  const [title, setTitle] = useState(card?.title || '')
  const [priority, setPriority] = useState(card?.priority || 'medium')
  const [dueDate, setDueDate] = useState(card?.due_date || '')
  const [labelsText, setLabelsText] = useState(card?.labels?.join(', ') || '')
  const [selectedColumn, setSelectedColumn] = useState(columnId)

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
        placeholder: 'Add a detailed description… Type / for commands',
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'tiptap prose prose-invert max-w-none focus:outline-none text-slate-200 leading-relaxed text-sm min-h-[300px]',
      },
    },
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return

    const labels = labelsText
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean)

    // Store description as Tiptap JSON
    const descriptionJson = editor ? JSON.stringify(editor.getJSON()) : ''

    const data = {
      title: title.trim(),
      description: descriptionJson,
      priority,
      due_date: dueDate || null,
      labels,
    }

    // If column changed on edit, include column_id
    if (card && selectedColumn !== card.column_id) {
      data.column_id = selectedColumn
    }

    onSave(data)
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/40 flex-shrink-0">
          <div className="flex-1 mr-4">
            <input
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Card title"
              className="w-full text-xl font-bold text-white bg-transparent border-none outline-none placeholder-slate-600"
            />
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-700/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Two-column body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left: Description (rich text editor) */}
          <div className="flex-1 flex flex-col border-r border-slate-700/40 min-w-0">
            {/* Editor toolbar */}
            <div className="flex items-center gap-0.5 px-4 py-2 border-b border-slate-700/30 flex-shrink-0">
              {toolbarButtons.map((btn, i) =>
                btn.divider ? (
                  <div key={i} className="w-px h-5 bg-slate-700/50 mx-1" />
                ) : (
                  <button
                    key={i}
                    type="button"
                    onClick={btn.action}
                    title={btn.title}
                    className={`p-1.5 rounded-md transition-colors ${
                      btn.active
                        ? 'bg-indigo-600/20 text-indigo-300'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
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
            </div>
          </div>

          {/* Right: Attributes */}
          <div className="w-72 flex-shrink-0 overflow-y-auto p-5 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Status</label>
              <select
                value={selectedColumn}
                onChange={(e) => setSelectedColumn(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>{col.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Priority</label>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(PRIORITIES).map(([key, { label, color }]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPriority(key)}
                    className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      priority === key
                        ? color + ' ring-1 ring-offset-1 ring-offset-slate-800'
                        : 'bg-slate-900/40 text-slate-400 border-slate-700/40 hover:border-slate-600/60'
                    }`}
                  >
                    <Flag className="w-3 h-3" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Labels</label>
              <input
                value={labelsText}
                onChange={(e) => setLabelsText(e.target.value)}
                placeholder="design, frontend, bug"
                className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
              />
              {labelsText && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {labelsText.split(',').map((l) => l.trim()).filter(Boolean).map((label) => (
                    <span
                      key={label}
                      className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/20"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {card && (
              <div className="pt-2 border-t border-slate-700/40">
                <p className="text-xs text-slate-500">
                  Created {format(new Date(card.created_at), 'MMM d, yyyy')}
                </p>
                {card.updated_at && card.updated_at !== card.created_at && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Updated {format(new Date(card.updated_at), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-700/40 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm text-white font-medium transition-colors"
          >
            {card ? 'Save Changes' : 'Create Card'}
          </button>
        </div>
      </div>
    </div>
  )
}
