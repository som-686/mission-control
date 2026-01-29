import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured, demoAuth } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isSupabaseConfigured) {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        setLoading(false)
      })

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
      })

      return () => subscription.unsubscribe()
    } else {
      // Demo mode
      const { user } = demoAuth.getSession()
      setUser(user)
      setLoading(false)
    }
  }, [])

  async function login(email, password) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      setUser(data.user)
      return data
    } else {
      const result = demoAuth.signIn(email, password)
      setUser(result.user)
      return result
    }
  }

  async function signup(email, password) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) throw error
      setUser(data.user)
      return data
    } else {
      const result = demoAuth.signUp(email, password)
      setUser(result.user)
      return result
    }
  }

  async function logout() {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } else {
      demoAuth.signOut()
    }
    setUser(null)
  }

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    isDemo: !isSupabaseConfigured,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
