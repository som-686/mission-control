import { useState, useRef, useCallback } from 'react'
import { X } from 'lucide-react'

/**
 * Inline tag input — type #tag and press Space/Enter to commit.
 * Props:
 *   tags: string[]           — current tag list (without #)
 *   onChange: (string[]) =>  — called when tags change
 *   placeholder?: string
 *   className?: string       — wrapper class overrides
 *   chipClassName?: string   — chip class overrides
 *   inputClassName?: string  — inner input class overrides
 *   compact?: boolean        — smaller styling for card views
 */
export default function TagInput({
  tags = [],
  onChange,
  placeholder = 'Add #tags…',
  className = '',
  chipClassName = '',
  inputClassName = '',
  compact = false,
}) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef(null)

  const commitTag = useCallback((raw) => {
    const cleaned = raw.replace(/^#/, '').trim().toLowerCase()
    if (cleaned && !tags.includes(cleaned)) {
      onChange([...tags, cleaned])
    }
  }, [tags, onChange])

  const removeTag = useCallback((tagToRemove) => {
    onChange(tags.filter((t) => t !== tagToRemove))
  }, [tags, onChange])

  function handleKeyDown(e) {
    const val = inputValue.trim()

    // Space or Enter commits the current tag
    if ((e.key === ' ' || e.key === 'Enter') && val) {
      e.preventDefault()
      // Could be "#design" or just "design"
      if (val.startsWith('#') && val.length > 1) {
        commitTag(val)
        setInputValue('')
      } else if (!val.startsWith('#') && val.length > 0) {
        // If they typed without #, still commit
        commitTag(val)
        setInputValue('')
      }
      return
    }

    // Backspace on empty input removes last tag
    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  function handleChange(e) {
    const val = e.target.value
    // If they paste something with spaces, split into multiple tags
    if (val.includes(' ') && val.trim().includes('#')) {
      const parts = val.split(/\s+/).filter(Boolean)
      const newTags = [...tags]
      parts.forEach((p) => {
        const cleaned = p.replace(/^#/, '').trim().toLowerCase()
        if (cleaned && !newTags.includes(cleaned)) {
          newTags.push(cleaned)
        }
      })
      onChange(newTags)
      setInputValue('')
      return
    }
    setInputValue(val)
  }

  const chipBase = compact
    ? 'inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200'
    : 'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200'

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 cursor-text ${className}`}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span key={tag} className={chipClassName || chipBase}>
          #{tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              removeTag(tag)
            }}
            className="hover:text-gray-900 transition-colors"
          >
            <X className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : '#'}
        className={inputClassName || `bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400 min-w-[60px] flex-1 ${compact ? 'py-0' : 'py-0.5'}`}
      />
    </div>
  )
}
