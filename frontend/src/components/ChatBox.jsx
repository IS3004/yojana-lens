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
  const { t } = useLang()
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
      {/* Starter chips */}
      {starterChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs text-slate-400 font-medium">Try:</span>
          {starterChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectStarter(chip.text)}
              className="text-xs px-2.5 py-1 rounded-full bg-slate-100 hover:bg-orange-50 hover:text-orange-700 text-slate-600 transition-colors border border-slate-200"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Input container */}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center gap-2 bg-white rounded-2xl border border-slate-300 p-2 shadow-sm focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-transparent transition-all"
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
          className="w-full text-sm text-slate-800 placeholder-slate-400 bg-transparent outline-none px-2 py-1.5"
        />

        <button
          type="submit"
          disabled={!text.trim() || loading}
          className="flex items-center justify-center p-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 text-white disabled:text-slate-400 transition-colors shrink-0"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
