import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// Map auth email to display username
function resolveUsername(email) {
  if (!email) return null
  if (email.includes('paglabhoot')) return 'bhoot'
  if (email.includes('somnath') || email.includes('som')) return 'som'
  return email.split('@')[0]
}

export function useRealtimeNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const username = resolveUsername(user?.email)

  // Fetch unread notifications
  const fetchNotifications = useCallback(async () => {
    if (!username || !isSupabaseConfigured) return
    setLoading(true)

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient', username)
      .order('created_at', { ascending: false })
      .limit(30)

    if (!error && data) {
      setNotifications(data)
      setUnreadCount(data.filter((n) => !n.read).length)
    }

    setLoading(false)
  }, [username])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Realtime subscription — listen for new notifications addressed to this user
  useEffect(() => {
    if (!username || !isSupabaseConfigured) return

    const channel = supabase
      .channel(`notifications-${username}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient=eq.${username}`,
        },
        (payload) => {
          setNotifications((prev) => {
            // Avoid duplicates
            if (prev.some((n) => n.id === payload.new.id)) return prev
            return [payload.new, ...prev]
          })
          setUnreadCount((prev) => prev + 1)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient=eq.${username}`,
        },
        (payload) => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.new.id ? payload.new : n))
          )
          // Recalculate unread
          setNotifications((prev) => {
            setUnreadCount(prev.filter((n) => !n.read).length)
            return prev
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [username])

  // Mark a single notification as read
  const markAsRead = useCallback(
    async (notificationId) => {
      if (!isSupabaseConfigured) return

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))

      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
    },
    []
  )

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!username || !isSupabaseConfigured) return

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient', username)
      .eq('read', false)
  }, [username])

  return {
    notifications,
    unreadCount,
    loading,
    username,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  }
}
