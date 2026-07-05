import { useEffect, useRef } from 'react'
import { TagSuggestion } from './utils'

interface HashtagAutocompleteProps {
  suggestions: TagSuggestion[]
  onSelect: (tag: string) => void
  position: { top: number; left: number }
  selectedIndex: number
  onSelectedIndexChange: (index: number) => void
}

export function HashtagAutocomplete({
  suggestions,
  onSelect,
  position,
  selectedIndex,
  onSelectedIndexChange
}: HashtagAutocompleteProps) {
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  if (suggestions.length === 0) {
    return null
  }

  return (
    <div
      className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto"
      style={{
        top: position.top,
        left: position.left,
        minWidth: '150px',
        maxWidth: '250px'
      }}
    >
      <ul ref={listRef} className="py-1">
        {suggestions.map((suggestion, index) => (
          <li
            key={suggestion.tag}
            className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between ${
              index === selectedIndex
                ? 'bg-blue-500 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => onSelect(suggestion.tag)}
            onMouseEnter={() => onSelectedIndexChange(index)}
          >
            <span className="flex items-center">
              {suggestion.icon && (
                <span className="mr-2 text-xs">{suggestion.icon}</span>
              )}
              {suggestion.tag}
            </span>
            <span className={`text-xs ${
              index === selectedIndex ? 'text-blue-200' : 'text-gray-400'
            }`}>
              {suggestion.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}