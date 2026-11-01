import { useState } from 'react'
import { Send } from 'lucide-react'
import VoiceButton from './VoiceButton'
import { useLang } from '../i18n/strings'

export default function ChatBox({
  onSend,
  loading,
  starterChips = [],
  onSelectStarter,
}) {
  const { t, lang } = useLang()
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (!text.trim() || loading) return
    onSend(text.trim())
    setText('')
  }

  const handleVoiceResult = (spokenText) => {
    setText((prev) => (prev ? `${prev} ${spokenText}` : spokenText))
  }

  return (
    <div className="w-full space-y-3">
      {/* Input container */}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center gap-2 bg-surface rounded-2xl border border-border p-2 shadow-card focus-within:border-saffron focus-within:ring-2 focus-within:ring-saffron/20 transition-all"
      >
        <VoiceButton
          onResult={handleVoiceResult}
          listening={listening}
          setListening={setListening}
        />

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.khoj.placeholder}
          disabled={loading}
          aria-label={t.khoj.placeholder}
          className="w-full text-sm text-navy placeholder:text-muted/70 bg-transparent outline-none px-2 py-2 min-h-[44px]"
        />

        <button
          type="submit"
          disabled={!text.trim() || loading}
          aria-label={t.khoj.send || 'Send'}
          className="min-w-[48px] min-h-[48px] w-12 h-12 flex items-center justify-center rounded-xl bg-saffron hover:bg-saffron-hover disabled:opacity-40 text-white transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
        >
          <Send size={18} />
        </button>
      </form>

      {/* Starter persona chips below input */}
      {starterChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-muted font-semibold">
            {lang === 'hi' ? 'सुझाव:' : 'Try:'}
          </span>
          {starterChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectStarter(chip.text)}
              className="text-xs px-3 py-1.5 rounded-full bg-white hover:bg-saffron-tint hover:border-saffron/50 hover:text-saffron text-navy transition-all border border-border font-medium shadow-2xs cursor-pointer"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
