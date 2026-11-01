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
      title={listening ? (t.khoj?.listening || 'Listening…') : (lang === 'hi' ? 'बोलकर बताएं' : 'Voice input')}
      aria-label={listening ? (t.khoj?.listening || 'Listening…') : (lang === 'hi' ? 'बोलकर बताएं' : 'Voice input')}
      className={`flex items-center justify-center min-w-[48px] min-h-[48px] w-12 h-12 rounded-full transition-all cursor-pointer focus-visible:outline-3 focus-visible:outline-saffron focus-visible:outline-offset-2 ${
        listening
          ? 'bg-danger text-white pulse-mic ring-4 ring-danger/20'
          : 'bg-white border border-border text-navy hover:bg-slate-50 hover:text-saffron shadow-xs'
      }`}
    >
      {listening ? <MicOff size={20} /> : <Mic size={20} />}
    </button>
  )
}
