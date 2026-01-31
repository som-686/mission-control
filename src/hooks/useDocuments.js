import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured, demoTable } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const demoDocuments = demoTable('documents')

export function useDocuments() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchDocuments = useCallback(async () => {
    if (!user) return
    setLoading(true)

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
      if (!error) setDocuments(data || [])
    } else {
      const docs = demoDocuments.getAll(user.id)
      docs.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      setDocuments(docs)
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // Realtime subscription for live document updates
  useEffect(() => {
    if (!user || !isSupabaseConfigured) return

    const channel = supabase
      .channel(`documents-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documents', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setDocuments((prev) => {
              if (prev.some((d) => d.id === payload.new.id)) return prev
              return [payload.new, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            setDocuments((prev) => prev.map((d) => (d.id === payload.new.id ? payload.new : d)))
          } else if (payload.eventType === 'DELETE') {
            setDocuments((prev) => prev.filter((d) => d.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  async function createDocument(doc) {
    if (!user) return null

    const newDoc = {
      user_id: user.id,
      title: doc.title || 'Untitled',
      content: doc.content || null,
      folder: doc.folder || null,
      tags: doc.tags || [],
      is_favorite: false,
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('documents')
        .insert(newDoc)
        .select()
        .single()
      if (error) throw error
      setDocuments((prev) => [data, ...prev])
      return data
    } else {
      const created = demoDocuments.insert(newDoc)
      setDocuments((prev) => [created, ...prev])
      return created
    }
  }

  async function updateDocument(id, changes) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('documents')
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      setDocuments((prev) => prev.map((d) => (d.id === id ? data : d)))
      return data
    } else {
      const updated = demoDocuments.update(id, changes)
      setDocuments((prev) => prev.map((d) => (d.id === id ? updated : d)))
      return updated
    }
  }

  async function deleteDocument(id) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('documents').delete().eq('id', id)
      if (error) throw error
    } else {
      demoDocuments.delete(id)
    }
    setDocuments((prev) => prev.filter((d) => d.id !== id))
  }

  function getDocument(id) {
    if (isSupabaseConfigured) {
      return supabase.from('documents').select('*').eq('id', id).single()
    } else {
      const doc = demoDocuments.getById(id)
      return Promise.resolve({ data: doc, error: doc ? null : { message: 'Not found' } })
    }
  }

  return {
    documents,
    loading,
    createDocument,
    updateDocument,
    deleteDocument,
    getDocument,
    refetch: fetchDocuments,
  }
}
