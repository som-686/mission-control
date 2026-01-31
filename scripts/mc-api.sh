#!/bin/bash
# Mission Control API helper — wraps Supabase Management API
# Usage: mc-api.sh <action> [args...]
#
# Actions:
#   sql "<query>"                    — Run raw SQL
#   card <card_id>                   — Get card details + recent comments
#   comment <card_id> "<content>"    — Post comment as bhoot + notify som
#   mark-read <notification_id>      — Mark notification as read
#   update-card <card_id> "<json>"   — Update card description (Tiptap JSON)

set -euo pipefail

# Load secrets
source ~/.clawdbot/secrets.env 2>/dev/null || true
PROJECT="vctmsfsasfikqhyyabsr"
API="https://api.supabase.com/v1/projects/$PROJECT/database/query"
USER_ID="4be453d3-f01e-4759-9939-8800440ac12d"

run_sql() {
  curl -sf -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    "$API" -X POST -H "Content-Type: application/json" \
    -d "$(printf '{"query": "%s"}' "$1")"
}

case "${1:-help}" in
  sql)
    run_sql "$2"
    ;;
  card)
    CARD_ID="$2"
    echo "=== CARD ==="
    run_sql "SELECT id, title, description, column_id, assigned_to, tags, priority FROM kanban_cards WHERE id = '$CARD_ID'"
    echo ""
    echo "=== COMMENTS ==="
    run_sql "SELECT author, content, created_at FROM card_comments WHERE card_id = '$CARD_ID' ORDER BY created_at DESC LIMIT 10"
    ;;
  comment)
    CARD_ID="$2"
    CONTENT=$(echo "$3" | sed "s/'/''/g")
    PREVIEW=$(echo "$3" | head -c 80 | sed "s/'/''/g")
    run_sql "INSERT INTO card_comments (card_id, user_id, author, content) VALUES ('$CARD_ID', '$USER_ID', 'bhoot', '$CONTENT') RETURNING id"
    echo ""
    run_sql "INSERT INTO notifications (recipient, sender, type, card_id, message) VALUES ('som', 'bhoot', 'comment', '$CARD_ID', '@bhoot: $PREVIEW') RETURNING id"
    ;;
  mark-read)
    NOTIF_ID="$2"
    run_sql "UPDATE notifications SET read = true WHERE id = '$NOTIF_ID'"
    ;;
  update-card)
    CARD_ID="$2"
    DESC_JSON=$(echo "$3" | sed "s/'/''/g")
    run_sql "UPDATE kanban_cards SET description = '$DESC_JSON', updated_at = now() WHERE id = '$CARD_ID' RETURNING id"
    ;;
  help|*)
    echo "Usage: mc-api.sh <sql|card|comment|mark-read|update-card> [args...]"
    ;;
esac
