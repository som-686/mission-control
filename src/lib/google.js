// Google OAuth configuration
// User needs to set VITE_GOOGLE_CLIENT_ID in .env
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly'

export const isGoogleConfigured = Boolean(GOOGLE_CLIENT_ID)

export function initiateGoogleAuth() {
  const redirectUri = window.location.origin + '/auth/google/callback'
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=${encodeURIComponent(GOOGLE_SCOPES)}&prompt=consent`
  window.location.href = url
}

export function getGoogleToken() {
  return localStorage.getItem('google_access_token')
}

export function clearGoogleToken() {
  localStorage.removeItem('google_access_token')
}

export async function fetchCalendarEvents(accessToken) {
  const now = new Date().toISOString()
  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59)
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${endOfDay.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=5`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) throw new Error('Calendar fetch failed')
  return res.json()
}

export async function fetchGmailMessages(accessToken) {
  const res = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=is:unread category:primary`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) throw new Error('Gmail fetch failed')
  const data = await res.json()
  // Fetch individual message details
  const messages = await Promise.all(
    (data.messages || []).map(async (m) => {
      const detail = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      return detail.json()
    })
  )
  return messages
}
