// Mention suggestion configuration for Tiptap
// Users who can be mentioned
const MENTIONABLE_USERS = [
  { id: 'som', label: 'Som' },
  { id: 'bhoot', label: 'Bhoot' },
]

export function mentionSuggestion() {
  return {
    items: ({ query }) => {
      return MENTIONABLE_USERS.filter((user) =>
        user.label.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    },

    render: () => {
      let component = null
      let popup = null

      return {
        onStart: (props) => {
          popup = document.createElement('div')
          popup.className = 'mention-popup'
          popup.style.cssText =
            'position:fixed;z-index:9999;background:white;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);padding:4px;min-width:160px;'

          component = { props, selectedIndex: 0 }
          renderList(popup, component)

          document.body.appendChild(popup)
          positionPopup(popup, props)
        },

        onUpdate: (props) => {
          if (!component || !popup) return
          component.props = props
          component.selectedIndex = 0
          renderList(popup, component)
          positionPopup(popup, props)
        },

        onKeyDown: (props) => {
          if (!component || !popup) return false

          if (props.event.key === 'ArrowUp') {
            component.selectedIndex = Math.max(component.selectedIndex - 1, 0)
            renderList(popup, component)
            return true
          }

          if (props.event.key === 'ArrowDown') {
            component.selectedIndex = Math.min(
              component.selectedIndex + 1,
              component.props.items.length - 1
            )
            renderList(popup, component)
            return true
          }

          if (props.event.key === 'Enter') {
            const item = component.props.items[component.selectedIndex]
            if (item) component.props.command(item)
            return true
          }

          if (props.event.key === 'Escape') {
            cleanup()
            return true
          }

          return false
        },

        onExit: () => {
          cleanup()
        },
      }

      function cleanup() {
        if (popup && popup.parentNode) {
          popup.parentNode.removeChild(popup)
        }
        popup = null
        component = null
      }

      function positionPopup(el, props) {
        if (!props.clientRect) return
        const rect = props.clientRect()
        if (!rect) return
        el.style.top = `${rect.bottom + 8}px`
        el.style.left = `${rect.left}px`
      }

      function renderList(el, comp) {
        const items = comp.props.items || []
        el.innerHTML = items.length
          ? items
              .map(
                (item, i) =>
                  `<button class="mention-item" data-index="${i}" style="
                    display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;
                    border:none;cursor:pointer;font-size:14px;border-radius:8px;
                    background:${i === comp.selectedIndex ? '#f3f4f6' : 'transparent'};
                    color:#111827;text-align:left;
                  ">
                    <span style="
                      display:inline-flex;align-items:center;justify-content:center;
                      width:24px;height:24px;border-radius:50%;font-size:12px;font-weight:600;
                      ${item.id === 'bhoot' ? 'background:#f3f4f6;' : 'background:#111827;color:white;'}
                    ">${item.id === 'bhoot' ? '👻' : 'S'}</span>
                    ${item.label}
                  </button>`
              )
              .join('')
          : '<div style="padding:8px 12px;color:#9ca3af;font-size:13px;">No results</div>'

        // Add click handlers
        el.querySelectorAll('.mention-item').forEach((btn) => {
          btn.onmousedown = (e) => {
            e.preventDefault()
            const idx = parseInt(btn.dataset.index)
            const item = items[idx]
            if (item) comp.props.command(item)
          }
          btn.onmouseenter = () => {
            comp.selectedIndex = parseInt(btn.dataset.index)
            renderList(el, comp)
          }
        })
      }
    },
  }
}
