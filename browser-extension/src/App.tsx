import { useState, useEffect, useRef } from 'react'
import { getCurrentTabUrl, saveToMem, getStoredSecret, saveSecret } from './utils'
import { HashtagAutocomplete } from './HashtagAutocomplete'
import { useHashtagAutocomplete } from './useHashtagAutocomplete'

// Shared terminal/HUD styling (docs/design/README.md)
const fieldClass =
  'w-full bg-surface border border-hair-strong px-3 py-2 text-[13px] text-ink-primary placeholder:text-ink-faint focus:outline-none focus:border-accent'

function SectionLabel({ label, descriptor }: { label: string; descriptor?: string }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-[0.16em] text-ink-tertiary">
        {label}
      </span>
      <span className="h-px flex-1 bg-hair" />
      {descriptor && (
        <span className="text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          {descriptor}
        </span>
      )}
    </div>
  )
}

function StatusMessage({ message }: { message: string }) {
  if (!message) return null
  const ok = message.startsWith('✓')
  const text = message.replace(/^✓\s*/, '')
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className={ok ? 'text-accent' : 'text-danger'}>▪</span>
      <span className={ok ? 'text-ink-secondary' : 'text-danger'}>{text}</span>
    </div>
  )
}

function App() {
  const [currentUrl, setCurrentUrl] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [secret, setSecret] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')
  const [showSettings, setShowSettings] = useState<boolean>(false)
  const [cursorPosition, setCursorPosition] = useState<number>(0)

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
      <div className="w-[340px] bg-base font-mono text-ink-primary">
        <header className="flex items-baseline justify-between px-[18px] pt-4">
          <h1 className="text-[18px] font-semibold uppercase tracking-[0.05em]">
            settings
          </h1>
          {secret && (
            <button
              onClick={() => setShowSettings(false)}
              className="text-[11px] uppercase tracking-[0.12em] text-ink-faint hover:text-accent focus:outline-none"
            >
              [ back ]
            </button>
          )}
        </header>
        <div className="tick-strip mt-3" />

        <div className="space-y-4 px-[18px] py-4">
          <div>
            <SectionLabel label="shared secret" descriptor="mem.liquidx.net" />
            <input
              type="password"
              id="secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className={fieldClass}
              placeholder="enter your shared secret"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveSecret}
              className="flex-1 border border-accent bg-accent/10 px-4 py-2 text-[12px] uppercase tracking-[0.16em] text-accent hover:bg-accent/20 focus:outline-none"
            >
              save
            </button>
            {secret && (
              <button
                onClick={() => setShowSettings(false)}
                className="border border-hair-strong px-4 py-2 text-[12px] uppercase tracking-[0.16em] text-ink-secondary hover:bg-white/[0.04] focus:outline-none"
              >
                cancel
              </button>
            )}
          </div>
          <StatusMessage message={message} />
        </div>
      </div>
    )
  }

  return (
    <div className="w-[340px] bg-base font-mono text-ink-primary">
      <header className="flex items-baseline justify-between px-[18px] pt-4">
        <h1 className="text-[18px] font-semibold uppercase tracking-[0.05em]">
          save to mem
        </h1>
        <button
          onClick={() => setShowSettings(true)}
          className="text-[11px] uppercase tracking-[0.12em] text-ink-faint hover:text-accent focus:outline-none"
          title="Settings"
        >
          [ cfg ]
        </button>
      </header>
      <div className="tick-strip mt-3" />

      <form onSubmit={handleSubmit} className="space-y-4 px-[18px] py-4">
        <div>
          <SectionLabel label="url" descriptor="source" />
          <div className="truncate bg-surface border border-hair px-3 py-2 text-[12px] text-ink-secondary">
            {currentUrl || '—'}
          </div>
        </div>

        <div>
          <SectionLabel label="note" descriptor="#tags ok" />
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
            className={`${fieldClass} resize-none`}
            rows={3}
            placeholder="add a note…"
          />
          {autocomplete.isVisible && (
            <HashtagAutocomplete
              suggestions={autocomplete.suggestions}
              onSelect={autocomplete.selectSuggestion}
              selectedIndex={autocomplete.selectedIndex}
              onSelectedIndexChange={autocomplete.setSelectedIndex}
            />
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !description.trim()}
          className="w-full border px-4 py-2 text-[12px] uppercase tracking-[0.16em] transition-colors focus:outline-none enabled:border-accent enabled:bg-accent/10 enabled:text-accent enabled:hover:bg-accent/20 disabled:cursor-not-allowed disabled:border-hair disabled:bg-transparent disabled:text-ink-faint"
        >
          {isLoading ? 'saving…' : '⏎ save'}
        </button>

        <StatusMessage message={message} />
      </form>
    </div>
  )
}

export default App
