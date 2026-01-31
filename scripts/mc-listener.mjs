#!/usr/bin/env node
/**
 * Mission Control Realtime Listener
 * 
 * PubNub-style: persistent WebSocket → Clawdbot webhook on event
 * Zero polling, zero tokens when idle
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ── Config ──────────────────────────────────────────────
const HOOK_URL = 'http://127.0.0.1:18789/hooks/agent'
const HOOK_TOKEN = 'mc-agent-hook-secret-2026'
const PROJECT_REF = 'vctmsfsasfikqhyyabsr'

// Load env from secrets vault
function loadEnv() {
  try {
    const home = process.env.HOME || process.env.USERPROFILE
    const raw = readFileSync(resolve(home, '.clawdbot/secrets.env'), 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 0) continue
      const key = trimmed.slice(0, eq)
      const val = trimmed.slice(eq + 1)
      if (!process.env[key]) process.env[key] = val
    }
  } catch (e) {
    console.error('Failed to load secrets.env:', e.message)
  }
}

loadEnv()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

function ts() {
  return new Date().toISOString().slice(11, 19)
}

// ── Webhook caller ──────────────────────────────────────
async function triggerAgent(notification) {
  const n = notification
  const MC = '/Users/paglabhoot/clawd/mission-control/scripts/mc-api.sh'
  const msg = [
    `You are Bhoot, a collaborator in the Mission Control app.`,
    ``,
    `A helper CLI is at: ${MC}`,
    `  mc-api.sh card <id>                — get card + recent comments`,
    `  mc-api.sh comment <id> "<text>"    — post comment as bhoot + notify som`,
    `  mc-api.sh mark-read <notif_id>     — mark notification as read`,
    `  mc-api.sh update-card <id> "<json>" — update card description (Tiptap JSON)`,
    `  mc-api.sh sql "<query>"            — run raw SQL`,
    ``,
    `New notification:`,
    `- Type: ${n.type} | From: ${n.sender}`,
    `- Message: ${n.message}`,
    `- Card ID: ${n.card_id || 'none'} | Doc ID: ${n.document_id || 'none'}`,
    `- Notification ID: ${n.id}`,
    ``,
    `Steps:`,
    `1. Run: ${MC} card ${n.card_id} — to see context`,
    `2. Do whatever is being asked (update card desc if needed)`,
    `3. Run: ${MC} comment ${n.card_id} "<your reply>"`,
    `4. Run: ${MC} mark-read ${n.id}`,
    ``,
    `Card descriptions use Tiptap JSON. Do NOT message Telegram.`,
  ].join('\n')

  try {
    const resp = await fetch(HOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HOOK_TOKEN}`,
      },
      body: JSON.stringify({
        message: msg,
        name: 'MC',
        deliver: false,
        timeoutSeconds: 120,
      }),
    })

    const status = resp.status
    const body = await resp.text()
    console.log(`  → ${status} ${body}`)
  } catch (err) {
    console.error(`  → Failed: ${err.message}`)
  }
}

// ── Realtime subscription ───────────────────────────────
console.log(`[${ts()}] 🚀 MC Listener starting...`)

const channel = supabase
  .channel('mc-agent-listener')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: 'recipient=eq.bhoot',
    },
    (payload) => {
      console.log(`[${ts()}] 🔔 ${payload.new.message}`)
      triggerAgent(payload.new)
    }
  )
  .subscribe((status) => {
    console.log(`[${ts()}] Channel: ${status}`)
    if (status === 'SUBSCRIBED') {
      console.log(`[${ts()}] ✅ Listening`)
    }
  })

// ── Graceful shutdown ───────────────────────────────────
process.on('SIGINT', () => { supabase.removeChannel(channel); process.exit(0) })
process.on('SIGTERM', () => { supabase.removeChannel(channel); process.exit(0) })
setInterval(() => {}, 60_000)
