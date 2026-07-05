import { useState, useEffect, useRef } from 'react'
import { getCurrentTabUrl, saveToMem, getStoredSecret, saveSecret } from './utils'
import { HashtagAutocomplete } from './HashtagAutocomplete'
import { useHashtagAutocomplete } from './useHashtagAutocomplete'

function App() {
  const [currentUrl, setCurrentUrl] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [secret, setSecret] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')
  const [showSettings, setShowSettings] = useState<boolean>(false)
  const [cursorPosition, setCursorPosition] = useState<number>(0)
  const [autocompletePosition, setAutocompletePosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleTextChange = (newText: string, newCursorPosition: number) => {
    setDescription(newText)
    setCursorPosition(newCursorPosition)
    
    // Set cursor position in textarea
    if (textareaRef.current) {
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition)
          textareaRef.current.focus()
        }
      }, 0)
    }
  }

  const autocomplete = useHashtagAutocomplete({
    secret,
    text: description,
    cursorPosition,
    onTextChange: handleTextChange
  })

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const url = await getCurrentTabUrl()
        setCurrentUrl(url)
        
        const storedSecret = await getStoredSecret()
        if (storedSecret) {
          setSecret(storedSecret)
        } else {
          setShowSettings(true)
        }
      } catch (error) {
        setMessage('Error: Unable to get current tab URL')
      }
    }

    initializeApp()
  }, [])

  // Calculate autocomplete position based on cursor
  const updateAutocompletePosition = () => {
    if (!textareaRef.current || !autocomplete.currentHashtag) return

    const textarea = textareaRef.current
    const { startIndex } = autocomplete.currentHashtag
    
    // Create a temporary element to measure text
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (context) {
      context.font = getComputedStyle(textarea).font
      
      const textBeforeCursor = description.substring(0, startIndex)
      const lines = textBeforeCursor.split('\n')
      const currentLine = lines[lines.length - 1]
      const textWidth = context.measureText(currentLine).width
      
      const rect = textarea.getBoundingClientRect()
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20
      
      setAutocompletePosition({
        top: rect.top + (lines.length - 1) * lineHeight + lineHeight + 5,
        left: rect.left + textWidth + 5
      })
    }
  }

  // Update autocomplete position when hashtag changes
  useEffect(() => {
    if (autocomplete.isVisible) {
      updateAutocompletePosition()
    }
  }, [autocomplete.currentHashtag, autocomplete.isVisible])

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      autocomplete.handleKeyDown(e)
    }

    if (autocomplete.isVisible) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [autocomplete.isVisible, autocomplete.handleKeyDown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!secret.trim()) {
      setMessage('Error: Please set your shared secret first')
      setShowSettings(true)
      return
    }

    if (!description.trim()) {
      setMessage('Error: Please add a description')
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      const text = `${currentUrl} ${description}`
      await saveToMem(text, secret)
      setMessage('✓ Successfully saved to mem!')
      setDescription('')
      
      // Close popup after success
      setTimeout(() => {
        window.close()
      }, 1500)
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Failed to save'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSecret = async () => {
    if (!secret.trim()) {
      setMessage('Error: Secret cannot be empty')
      return
    }

    try {
      await saveSecret(secret)
      setShowSettings(false)
      setMessage('✓ Secret saved!')
    } catch (error) {
      setMessage('Error: Failed to save secret')
    }
  }

  if (showSettings) {
    return (
      <div className="w-80 p-4 bg-white">
        <h2 className="text-lg font-semibold mb-4">Settings</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="secret" className="block text-sm font-medium text-gray-700 mb-1">
              Shared Secret
            </label>
            <input
              type="password"
              id="secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your shared secret"
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSaveSecret}
              className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Save Secret
            </button>
            {secret && (
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            )}
          </div>
          {message && (
            <p className={`text-sm ${message.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Save to Mem</h1>
        <button
          onClick={() => setShowSettings(true)}
          className="text-gray-500 hover:text-gray-700 focus:outline-none"
          title="Settings"
        >
          ⚙️
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
            Current URL
          </label>
          <input
            type="text"
            id="url"
            value={currentUrl}
            readOnly
            className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-600"
          />
        </div>

        <div className="relative">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description (can include #hashtags)
          </label>
          <textarea
            ref={textareaRef}
            id="description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              setCursorPosition(e.target.selectionStart)
            }}
            onKeyUp={(e) => {
              setCursorPosition(e.currentTarget.selectionStart)
            }}
            onMouseUp={(e) => {
              setCursorPosition(e.currentTarget.selectionStart)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            placeholder="Add a description..."
          />
          {autocomplete.isVisible && (
            <HashtagAutocomplete
              suggestions={autocomplete.suggestions}
              onSelect={autocomplete.selectSuggestion}
              position={autocompletePosition}
              selectedIndex={autocomplete.selectedIndex}
              onSelectedIndexChange={autocomplete.setSelectedIndex}
            />
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !description.trim()}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : 'Save to Mem'}
        </button>

        {message && (
          <p className={`text-sm ${message.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
            {message}
          </p>
        )}
      </form>
    </div>
  )
}

export default App