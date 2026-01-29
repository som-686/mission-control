import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function GoogleCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    // Extract access_token from URL hash
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')

    if (accessToken) {
      localStorage.setItem('google_access_token', accessToken)
    }

    // Redirect to dashboard
    navigate('/dashboard', { replace: true })
  }, [navigate])

  return (
    <div className="flex items-center justify-center h-screen bg-slate-900">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-300 text-sm">Connecting Google account...</p>
      </div>
    </div>
  )
}
