import { useState, useEffect, useCallback, useRef } from 'react'
import { getUserId, getTagSuggestions, findCurrentHashtag, TagSuggestion, HashtagMatch } from './utils'

interface UseHashtagAutocompleteProps {
  secret: string
  text: string
  cursorPosition: number
  onTextChange: (newText: string, newCursorPosition: number) => void
}

export function useHashtagAutocomplete({
  secret,
  text,
  cursorPosition,
  onTextChange
}: UseHashtagAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [currentHashtag, setCurrentHashtag] = useState<HashtagMatch | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const debounceTimer = useRef<number>()

  // Fetch user ID when secret changes
  useEffect(() => {
    if (secret) {
      getUserId(secret)
        .then(setUserId)
        .catch(() => setUserId(null))
    }
  }, [secret])

  // Debounced suggestion fetching
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!userId || query.length === 0) {
      setSuggestions([])
      setIsVisible(false)
      return
    }

    setIsLoading(true)
    try {
      const results = await getTagSuggestions(userId, query, secret)
      setSuggestions(results)
      setSelectedIndex(0)
      setIsVisible(results.length > 0)
    } catch (error) {
      setSuggestions([])
      setIsVisible(false)
    } finally {
      setIsLoading(false)
    }
  }, [userId, secret])

  // Handle text and cursor changes
  useEffect(() => {
    const hashtag = findCurrentHashtag(text, cursorPosition)
    setCurrentHashtag(hashtag)

    if (hashtag && hashtag.partial.length > 0) {
      // Clear previous timer
      if (debounceTimer.current) {
        window.clearTimeout(debounceTimer.current)
      }

      // Debounce the API call by 300ms
      debounceTimer.current = window.setTimeout(() => {
        fetchSuggestions(hashtag.partial)
      }, 300)
    } else {
      setSuggestions([])
      setIsVisible(false)
    }

    return () => {
      if (debounceTimer.current) {
        window.clearTimeout(debounceTimer.current)
      }
    }
  }, [text, cursorPosition, fetchSuggestions])

  const selectSuggestion = useCallback((tag: string) => {
    if (!currentHashtag) return

    // Remove leading # if the tag already has it
    const cleanTag = tag.startsWith('#') ? tag : `#${tag}`

    const newText =
      text.substring(0, currentHashtag.startIndex) +
      `${cleanTag} ` +
      text.substring(currentHashtag.endIndex)

    const newCursorPosition = currentHashtag.startIndex + cleanTag.length + 1 // +1 for space

    onTextChange(newText, newCursorPosition)
    setIsVisible(false)
    setSuggestions([])
  }, [currentHashtag, text, onTextChange])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isVisible || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % suggestions.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev === 0 ? suggestions.length - 1 : prev - 1)
        break
      case 'Enter':
      case 'Tab':
        e.preventDefault()
        if (suggestions[selectedIndex]) {
          selectSuggestion(suggestions[selectedIndex].tag)
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsVisible(false)
        setSuggestions([])
        break
    }
  }, [isVisible, suggestions, selectedIndex, selectSuggestion])

  return {
    suggestions,
    selectedIndex,
    setSelectedIndex,
    isVisible,
    selectSuggestion,
    handleKeyDown,
    currentHashtag,
    isLoading
  }
}