import { supabase, isSupabaseConfigured } from '../lib/supabase'

// Extract mention ids from Tiptap JSON content
export function extractMentions(content) {
  const mentions = []
  if (!content) return mentions

  function walk(node) {
    if (node.type === 'mention' && node.attrs?.id) {
      mentions.push(node.attrs.id)
    }
    if (node.content) node.content.forEach(walk)
  }

  // Handle both parsed objects and JSON strings
  let doc = content
  if (typeof content === 'string') {
    try {
      doc = JSON.parse(content)
    } catch {
      return mentions
    }
  }

  if (doc && doc.type === 'doc') walk(doc)
  return [...new Set(mentions)] // dedupe
}

// Track which mentions have already been notified (per doc/card)
// Uses localStorage so it persists across refreshes
const _notifiedKey = (type, id) => `notified_mentions_${type}_${id}`

function getPreviouslyNotified(type, id) {
  try {
    const raw = localStorage.getItem(_notifiedKey(type, id))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function savePreviouslyNotified(type, id, mentions) {
  try {
    localStorage.setItem(_notifiedKey(type, id), JSON.stringify(mentions))
  } catch { /* ignore */ }
}

// Seed tracker with existing mentions (call on doc/card load)
export function seedMentionTracker(type, entityId, content) {
  const mentions = extractMentions(content)
  savePreviouslyNotified(type, entityId, mentions)
}

// Create notifications for mentioned users — only for NEW mentions
export async function notifyMentions({
  content,
  sender,
  cardId = null,
  documentId = null,
  cardTitle = null,
  docTitle = null,
}) {
  if (!isSupabaseConfigured) return

  const mentioned = extractMentions(content)
  // Don't notify yourself
  const recipients = mentioned.filter((id) => id !== sender)

  if (recipients.length === 0) return

  const context = cardTitle
    ? `card "${cardTitle}"`
    : docTitle
    ? `document "${docTitle}"`
    : 'a document'

  const notifications = recipients.map((recipient) => ({
    recipient,
    sender,
    type: cardId ? 'card_mention' : 'doc_mention',
    card_id: cardId || null,
    document_id: documentId || null,
    message: `@${sender} mentioned you in ${context}`,
  }))

  await supabase.from('notifications').insert(notifications)
}

// Fetch unread notifications for a user
export async function getUnreadNotifications(recipient) {
  if (!isSupabaseConfigured) return []

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient', recipient)
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(20)

  return data || []
}

// Mark notifications as read
export async function markNotificationsRead(ids) {
  if (!isSupabaseConfigured || !ids.length) return

  await supabase
    .from('notifications')
    .update({ read: true })
    .in('id', ids)
}
