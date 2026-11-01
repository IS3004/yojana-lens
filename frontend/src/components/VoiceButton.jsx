import { Mic, MicOff } from 'lucide-react'
import { useLang } from '../i18n/strings'

export default function VoiceButton({ onResult, listening, setListening }) {
  const { lang, t } = useLang()

  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  if (!supported) return null

  const toggle = () => {
    if (listening) {
      window.__ylRecog?.stop()
      setListening(false)
      return
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recog = new SR()
    recog.lang = lang === 'hi' ? 'hi-IN' : 'en-IN'
    recog.interimResults = false
    recog.maxAlternatives = 1

    recog.onresult = (e) => {
      const text = e.results[0][0].transcript
      onResult(text)
      setListening(false)
    }
    recog.onerror = () => setListening(false)
    recog.onend = () => setListening(false)

    window.__ylRecog = recog
    recog.start()
    setListening(true)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? t.khoj.listening : 'Voice input'}
      className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
        listening
          ? 'bg-red-500 text-white pulse-mic'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {listening ? <MicOff size={18} /> : <Mic size={18} />}
    </button>
  )
}
