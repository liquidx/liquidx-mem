import { useEffect, useRef } from 'react'
import { TagSuggestion } from './utils'

interface HashtagAutocompleteProps {
  suggestions: TagSuggestion[]
  onSelect: (tag: string) => void
  selectedIndex: number
  onSelectedIndexChange: (index: number) => void
}

export function HashtagAutocomplete({
  suggestions,
  onSelect,
  selectedIndex,
  onSelectedIndexChange
}: HashtagAutocompleteProps) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      }
    }
  }, [selectedIndex])

  if (suggestions.length === 0) {
    return null
  }

  return (
    <div
      ref={listRef}
      className="hud-scroll mt-2 flex gap-1 overflow-x-auto pb-1"
      role="listbox"
    >
      {suggestions.map((suggestion, index) => {
        const active = index === selectedIndex
        return (
          <button
            type="button"
            key={suggestion.tag}
            role="option"
            aria-selected={active}
            onClick={() => onSelect(suggestion.tag)}
            onMouseEnter={() => onSelectedIndexChange(index)}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border px-2 py-1 text-[11px] transition-colors ${
              active
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-hair text-ink-secondary hover:bg-accent/[0.06]'
            }`}
          >
            {suggestion.icon && (
              <span className="text-[10px] leading-none">{suggestion.icon}</span>
            )}
            <span className="leading-none">
              {suggestion.tag.startsWith('#') ? suggestion.tag : `#${suggestion.tag}`}
            </span>
            <span
              className={`text-[10px] leading-none ${
                active ? 'text-accent/70' : 'text-ink-faint'
              }`}
            >
              {suggestion.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
