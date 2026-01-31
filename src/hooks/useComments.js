import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured, demoTable } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// All known collaborators — used to notify the *other* person on any comment
const ALL_USERS = ['som', 'bhoot']

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

  // Realtime subscription for live comment updates
  useEffect(() => {
    if (!cardId || !isSupabaseConfigured) return

    const channel = supabase
      .channel(`comments-${cardId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'card_comments', filter: `card_id=eq.${cardId}` },
        (payload) => {
          setComments((prev) => {
            // Avoid duplicates (we may have already added it optimistically)
            if (prev.some((c) => c.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'card_comments', filter: `card_id=eq.${cardId}` },
        (payload) => {
          setComments((prev) => prev.filter((c) => c.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [cardId])

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
        // Notify the other person about the comment
        notifyCommentRecipients(author, cardId, content.trim())
        return data
      }
    } else {
      const created = demoComments.insert({ ...newComment, user_id: user.id })
      setComments((prev) => [...prev, created])
      return created
    }

    return null
  }

  async function notifyCommentRecipients(sender, cId, text) {
    if (!isSupabaseConfigured) return
    const recipients = ALL_USERS.filter((u) => u !== sender)
    const preview = text.length > 80 ? text.slice(0, 80) + '…' : text
    const notifications = recipients.map((recipient) => ({
      recipient,
      sender,
      type: 'comment',
      card_id: cId,
      message: `@${sender} commented: "${preview}"`,
    }))
    await supabase.from('notifications').insert(notifications)
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
