import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured, demoTable } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const demoCols = demoTable('kanban_columns')
const demoCards = demoTable('kanban_cards')

const DEFAULT_COLUMNS = [
  { title: 'Backlog', position: 0, color: '#64748b' },
  { title: 'In Progress', position: 1, color: '#6366f1' },
  { title: 'Review', position: 2, color: '#f59e0b' },
  { title: 'Done', position: 3, color: '#22c55e' },
]

export function useKanban() {
  const { user } = useAuth()
  const [columns, setColumns] = useState([])
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)

    if (isSupabaseConfigured) {
      const [colRes, cardRes] = await Promise.all([
        supabase.from('kanban_columns').select('*').eq('user_id', user.id).order('position'),
        supabase.from('kanban_cards').select('*').eq('user_id', user.id).order('position'),
      ])

      let cols = colRes.data || []

      // Seed default columns if empty
      if (cols.length === 0) {
        const toInsert = DEFAULT_COLUMNS.map((c) => ({ ...c, user_id: user.id }))
        const { data } = await supabase
          .from('kanban_columns')
          .insert(toInsert)
          .select()
        cols = data || []
      }

      setColumns(cols)
      setCards(cardRes.data || [])
    } else {
      let cols = demoCols.getAll(user.id)
      if (cols.length === 0) {
        cols = DEFAULT_COLUMNS.map((c) => demoCols.insert({ ...c, user_id: user.id }))
      }
      cols.sort((a, b) => a.position - b.position)
      const allCards = demoCards.getAll(user.id)
      allCards.sort((a, b) => a.position - b.position)
      setColumns(cols)
      setCards(allCards)
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Realtime subscription for live card updates
  useEffect(() => {
    if (!user || !isSupabaseConfigured) return

    const channel = supabase
      .channel(`kanban-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'kanban_cards', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setCards((prev) => {
            if (prev.some((c) => c.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'kanban_cards', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setCards((prev) => prev.map((c) => (c.id === payload.new.id ? payload.new : c)))
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'kanban_cards', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setCards((prev) => prev.filter((c) => c.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // ─── Column CRUD ──────────────────────────

  async function addColumn(title) {
    if (!user) return
    const position = columns.length
    const newCol = { user_id: user.id, title, position, color: '#6366f1' }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('kanban_columns')
        .insert(newCol)
        .select()
        .single()
      if (!error) setColumns((prev) => [...prev, data])
    } else {
      const created = demoCols.insert(newCol)
      setColumns((prev) => [...prev, created])
    }
  }

  async function renameColumn(id, title) {
    if (isSupabaseConfigured) {
      await supabase.from('kanban_columns').update({ title }).eq('id', id)
    } else {
      demoCols.update(id, { title })
    }
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)))
  }

  async function deleteColumn(id) {
    // Delete all cards in this column
    if (isSupabaseConfigured) {
      await supabase.from('kanban_cards').delete().eq('column_id', id)
      await supabase.from('kanban_columns').delete().eq('id', id)
    } else {
      demoCards.deleteWhere((c) => c.column_id === id)
      demoCols.delete(id)
    }
    setCards((prev) => prev.filter((c) => c.column_id !== id))
    setColumns((prev) => prev.filter((c) => c.id !== id))
  }

  // ─── Card CRUD ────────────────────────────

  async function addCard(card) {
    if (!user) return
    const colCards = cards.filter((c) => c.column_id === card.column_id)
    const newCard = {
      user_id: user.id,
      column_id: card.column_id,
      title: card.title,
      description: card.description || '',
      priority: card.priority || 'medium',
      due_date: card.due_date || null,
      tags: card.tags || [],
      assigned_to: card.assigned_to || null,
      position: colCards.length,
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('kanban_cards')
        .insert(newCard)
        .select()
        .single()
      if (!error) setCards((prev) => [...prev, data])
    } else {
      const created = demoCards.insert(newCard)
      setCards((prev) => [...prev, created])
    }
  }

  async function updateCard(id, changes) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('kanban_cards')
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (!error) setCards((prev) => prev.map((c) => (c.id === id ? data : c)))
    } else {
      const updated = demoCards.update(id, changes)
      setCards((prev) => prev.map((c) => (c.id === id ? updated : c)))
    }
  }

  async function deleteCard(id) {
    if (isSupabaseConfigured) {
      await supabase.from('kanban_cards').delete().eq('id', id)
    } else {
      demoCards.delete(id)
    }
    setCards((prev) => prev.filter((c) => c.id !== id))
  }

  async function moveCard(cardId, toColumnId, newPosition) {
    const card = cards.find((c) => c.id === cardId)
    if (!card) return

    const oldColumnId = card.column_id

    // Optimistic update
    setCards((prev) => {
      const updated = prev.map((c) => {
        if (c.id === cardId) {
          return { ...c, column_id: toColumnId, position: newPosition }
        }
        return c
      })

      // Reorder cards in the destination column
      const destCards = updated
        .filter((c) => c.column_id === toColumnId && c.id !== cardId)
        .sort((a, b) => a.position - b.position)

      destCards.splice(newPosition, 0, updated.find((c) => c.id === cardId))

      const reindexed = destCards.map((c, i) => ({ ...c, position: i }))

      // Also reorder source column if different
      let sourceReindexed = []
      if (oldColumnId !== toColumnId) {
        const sourceCards = updated
          .filter((c) => c.column_id === oldColumnId && c.id !== cardId)
          .sort((a, b) => a.position - b.position)
        sourceReindexed = sourceCards.map((c, i) => ({ ...c, position: i }))
      }

      const allOther = updated.filter(
        (c) => c.column_id !== toColumnId && c.column_id !== oldColumnId
      )

      return [...allOther, ...reindexed, ...sourceReindexed]
    })

    // Persist
    if (isSupabaseConfigured) {
      await supabase
        .from('kanban_cards')
        .update({ column_id: toColumnId, position: newPosition })
        .eq('id', cardId)
    } else {
      demoCards.update(cardId, { column_id: toColumnId, position: newPosition })
    }
  }

  return {
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
    refetch: fetchData,
  }
}
