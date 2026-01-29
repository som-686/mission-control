import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// ── localStorage fallback for demo mode ──────────────────────────────

const store = {
  get(key) {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value))
  },
}

function uuid() {
  return crypto.randomUUID()
}

function now() {
  return new Date().toISOString()
}

// Demo user stored in localStorage
export const demoAuth = {
  getSession() {
    const user = store.get('demo_user')
    if (user) {
      return { user, session: { user } }
    }
    return { user: null, session: null }
  },

  signUp(email, password) {
    const user = { id: uuid(), email, created_at: now() }
    store.set('demo_user', user)
    store.set('demo_password', password)
    return { user, session: { user } }
  },

  signIn(email, password) {
    const saved = store.get('demo_user')
    const savedPw = store.get('demo_password')
    if (saved && saved.email === email && savedPw === password) {
      return { user: saved, session: { user: saved } }
    }
    // Accept any login in demo — create user on the fly
    const user = { id: uuid(), email, created_at: now() }
    store.set('demo_user', user)
    store.set('demo_password', password)
    return { user, session: { user: saved || user } }
  },

  signOut() {
    localStorage.removeItem('demo_user')
    localStorage.removeItem('demo_password')
  },
}

// Generic CRUD for demo mode
export function demoTable(tableName) {
  const key = `demo_${tableName}`

  return {
    getAll(userId) {
      const all = store.get(key) || []
      return all.filter((r) => r.user_id === userId)
    },

    getById(id) {
      const all = store.get(key) || []
      return all.find((r) => r.id === id) || null
    },

    insert(record) {
      const all = store.get(key) || []
      const newRecord = {
        ...record,
        id: record.id || uuid(),
        created_at: now(),
        updated_at: now(),
      }
      all.push(newRecord)
      store.set(key, all)
      return newRecord
    },

    update(id, changes) {
      const all = store.get(key) || []
      const idx = all.findIndex((r) => r.id === id)
      if (idx === -1) return null
      all[idx] = { ...all[idx], ...changes, updated_at: now() }
      store.set(key, all)
      return all[idx]
    },

    delete(id) {
      const all = store.get(key) || []
      store.set(
        key,
        all.filter((r) => r.id !== id)
      )
    },

    deleteWhere(predicate) {
      const all = store.get(key) || []
      store.set(
        key,
        all.filter((r) => !predicate(r))
      )
    },

    upsert(record) {
      const all = store.get(key) || []
      const idx = all.findIndex((r) => r.id === record.id)
      if (idx !== -1) {
        all[idx] = { ...all[idx], ...record, updated_at: now() }
      } else {
        all.push({ ...record, id: record.id || uuid(), created_at: now(), updated_at: now() })
      }
      store.set(key, all)
      return all[idx !== -1 ? idx : all.length - 1]
    },
  }
}
