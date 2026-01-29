import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useKanban } from '../hooks/useKanban'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  Calendar as CalendarIcon,
  Flag,
  GripVertical,
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

// ─── Card Modal ──────────────────────────────────────

function CardModal({ card, columnId, columns, onSave, onClose }) {
  const [title, setTitle] = useState(card?.title || '')
  const [description, setDescription] = useState(card?.description || '')
  const [priority, setPriority] = useState(card?.priority || 'medium')
  const [dueDate, setDueDate] = useState(card?.due_date || '')
  const [labelsText, setLabelsText] = useState(card?.labels?.join(', ') || '')

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return

    const labels = labelsText
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean)

    onSave({
      title: title.trim(),
      description: description.trim(),
      priority,
      due_date: dueDate || null,
      labels,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/40">
          <h2 className="text-lg font-semibold text-white">
            {card ? 'Edit Card' : 'New Card'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-700/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Title</label>
            <input
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Card title"
              className="w-full px-3.5 py-2.5 bg-slate-900/60 border border-slate-600/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details…"
              rows={3}
              className="w-full px-3.5 py-2.5 bg-slate-900/60 border border-slate-600/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/60 border border-slate-600/50 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/60 border border-slate-600/50 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Labels <span className="text-slate-500 font-normal">(comma-separated)</span>
            </label>
            <input
              value={labelsText}
              onChange={(e) => setLabelsText(e.target.value)}
              placeholder="design, frontend, bug"
              className="w-full px-3.5 py-2.5 bg-slate-900/60 border border-slate-600/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm text-white font-medium transition-colors"
            >
              {card ? 'Save Changes' : 'Create Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
