import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured, demoTable } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const demoComments = demoTable('card_comments')

export function useComments(cardId) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchComments = useCallback(async () => {
    if (!cardId || !user) return
    setLoading(true)

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('card_comments')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: true })

      if (!error) setComments(data || [])
    } else {
      const all = demoComments.getAll(user.id).filter((c) => c.card_id === cardId)
      all.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      setComments(all)
    }

    setLoading(false)
  }, [cardId, user])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  async function addComment(content, author) {
    if (!cardId || !user || !content.trim()) return null

    const newComment = {
      card_id: cardId,
      user_id: user.id,
      author: author || 'Unknown',
      content: content.trim(),
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('card_comments')
        .insert(newComment)
        .select()
        .single()

      if (!error && data) {
        setComments((prev) => [...prev, data])
        return data
      }
    } else {
      const created = demoComments.insert({ ...newComment, user_id: user.id })
      setComments((prev) => [...prev, created])
      return created
    }

    return null
  }

  async function updateComment(commentId, content) {
    if (!content.trim()) return

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('card_comments')
        .update({ content: content.trim(), updated_at: new Date().toISOString() })
        .eq('id', commentId)
        .select()
        .single()

      if (!error && data) {
        setComments((prev) => prev.map((c) => (c.id === commentId ? data : c)))
      }
    } else {
      const updated = demoComments.update(commentId, { content: content.trim() })
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)))
    }
  }

  async function deleteComment(commentId) {
    if (isSupabaseConfigured) {
      await supabase.from('card_comments').delete().eq('id', commentId)
    } else {
      demoComments.delete(commentId)
    }
    setComments((prev) => prev.filter((c) => c.id !== commentId))
  }

  return {
    comments,
    loading,
    addComment,
    updateComment,
    deleteComment,
    refetch: fetchComments,
  }
}
