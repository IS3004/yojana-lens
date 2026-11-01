import { useState, useRef } from 'react'
import {
  Printer, RefreshCw, Bot, User, Clock, XCircle, Share2,
  Camera, Upload, AlertCircle, Sparkles, CheckCircle2
} from 'lucide-react'
import { useLang } from '../i18n/strings'
import client, { useMock } from '../api/client'
import { mockExtract, mockMatch } from '../api/mock'
import ChatBox from '../components/ChatBox'
import ProfileChips from '../components/ProfileChips'
import SchemeCard from '../components/SchemeCard'
import Disclaimer from '../components/Disclaimer'
import Loader from '../components/Loader'

export default function Khoj() {
  const { lang, t } = useLang()

  // State
  const [messages, setMessages] = useState([])
  const [profile, setProfile] = useState({})
  const [results, setResults] = useState([])
  const [nearMisses, setNearMisses] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [error, setError] = useState(null)
  const [lastQuery, setLastQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'active' | 'upcoming' | 'ended'

  const fileInputRef = useRef(null)

  const starterPrompts = [
    { label: '🌾 Jharkhand Farmer', text: 'मैं झारखंड का किसान हूँ, 45 साल, 2 एकड़ ज़मीन, BPL परिवार' },
    { label: '🎓 College Student', text: 'I am a 21-year-old student from Bihar, pursuing B.Tech, looking for scholarships and upcoming schemes' },
    { label: '☀️ Solar Rooftop Subsidy', text: 'I want free electricity and government subsidy for installing rooftop solar panels' },
    { label: '👵 Senior Citizen Pension', text: 'मेरी उम्र 62 वर्ष है, गांव में रहता हूँ, कोई नियमित आय नहीं है' },
    { label: '🔨 Artisan / Craftsman', text: 'I am a carpenter and traditional artisan in Uttar Pradesh looking for government assistance' },
  ]

  // Process natural language text query
  const processQuery = async (queryText, currentProfile = profile) => {
    setLoading(true)
    setError(null)
    setLastQuery(queryText)

    setMessages((prev) => [...prev, { role: 'user', text: queryText }])

    const lower = queryText.toLowerCase()
    if (lower.includes('upcoming') || lower.includes('आगामी') || lower.includes('new schemes') || lower.includes('भविष्य')) {
      setActiveTab('upcoming')
    } else if (lower.includes('ended') || lower.includes('closed') || lower.includes('पुराना') || lower.includes('समाप्त')) {
      setActiveTab('ended')
    }

    try {
      let extractRes
      if (useMock) {
        extractRes = await mockExtract({ text: queryText, existing_profile: currentProfile })
      } else {
        extractRes = await client.post('/extract', {
          text: queryText,
          existing_profile: currentProfile,
        })
      }

      const updatedProfile = { ...currentProfile, ...(extractRes.data?.profile || {}) }
      setProfile(updatedProfile)

      const followUp = extractRes.data?.follow_up_question
      if (followUp) {
        setMessages((prev) => [...prev, { role: 'assistant', text: followUp }])
      }

      await fetchMatches(updatedProfile)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to analyze query. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Handle document photo prefill upload (multimodal OCR)
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingDoc(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('existing_profile', JSON.stringify(profile))

      let extractedProfile
      if (useMock) {
        // Fast mock extraction simulating document read without storing ID numbers
        await new Promise((r) => setTimeout(r, 1200))
        extractedProfile = {
          ...profile,
          age: profile.age || 38,
          gender: profile.gender || 'female',
          state: profile.state || 'Jharkhand',
          is_bpl: true,
          category: profile.category || 'obc'
        }
      } else {
        const res = await client.post('/extract-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        extractedProfile = res.data?.profile || profile
      }

      setProfile(extractedProfile)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `📄 Document analyzed securely. Profile prefilled (Age: ${extractedProfile.age || 'N/A'}, State: ${extractedProfile.state || 'N/A'}, BPL: ${extractedProfile.is_bpl ? 'Yes' : 'No'}). No ID numbers were recorded.`
        }
      ])
      await fetchMatches(extractedProfile)
    } catch (err) {
      console.error(err)
      setError('Could not read document. Please ensure the photo is clear and under 5 MB.')
    } finally {
      setUploadingDoc(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Fetch deterministic matches & near misses from backend
  const fetchMatches = async (targetProfile) => {
    try {
      let matchRes
      if (useMock) {
        matchRes = await mockMatch({ profile: targetProfile, lang })
      } else {
        matchRes = await client.post('/match', {
          profile: targetProfile,
          lang,
        })
      }
      setResults(matchRes.data?.results || [])
      setNearMisses(matchRes.data?.near_misses || [])
    } catch (err) {
      console.error('Match error', err)
    }
  }

  const handleRemoveChip = (key) => {
    const nextProfile = { ...profile }
    delete nextProfile[key]
    setProfile(nextProfile)
    fetchMatches(nextProfile)
  }

  // Share on WhatsApp
  const handleShareWhatsApp = () => {
    const topSchemes = results
      .slice(0, 4)
      .map((s) => `• ${s.scheme} (${s.status === 'likely_eligible' ? 'Likely Eligible' : 'Check Office'})\n  Link: ${s.source_url || s.apply_url}`)
      .join('\n\n')

    const summaryText = `🇮🇳 *YojanaLens Scheme Discovery Summary*\n\nBased on citizen eligibility criteria, here are the verified government welfare schemes you qualify for:\n\n${topSchemes}\n\n_Verified strictly against official .gov.in sources. Check complete checklist at YojanaLens._`

    window.open(`https://wa.me/?text=${encodeURIComponent(summaryText)}`, '_blank', 'noopener,noreferrer')
  }

  // Filter schemes by active tab
  const filteredSchemes = results.filter((scheme) => {
    if (activeTab === 'all') return true
    if (activeTab === 'active') return scheme.timeline_status === 'active' || !scheme.timeline_status
    if (activeTab === 'upcoming') return scheme.timeline_status === 'upcoming'
    if (activeTab === 'ended') return scheme.timeline_status === 'ended'
    return true
  })

  const totalCount = results.length
  const activeCount = results.filter((s) => s.timeline_status === 'active' || !s.timeline_status).length
  const upcomingCount = results.filter((s) => s.timeline_status === 'upcoming').length
  const endedCount = results.filter((s) => s.timeline_status === 'ended').length

  const allDocuments = Array.from(
    new Set(results.flatMap((s) => s.documents || []))
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
          <span>Khoj (खोज)</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 font-semibold">
            Eligibility & Scheme Timeline
          </span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Describe your situation in any Indian language. Explore active schemes, upcoming launches, and almost-eligible opportunities.
        </p>
      </div>

      {/* Chat Messages Log */}
      {messages.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 max-h-60 overflow-y-auto">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2 text-xs sm:text-sm ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={13} />
                </div>
              )}
              <div
                className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-orange-600 text-white rounded-tr-none'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs'
                }`}
              >
                {m.text}
              </div>
              {m.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-slate-400 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <User size={13} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input Box & Photo Prefill CTA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <ChatBox
          onSend={(text) => processQuery(text, profile)}
          loading={loading}
          starterChips={starterPrompts}
          onSelectStarter={(t) => processQuery(t, profile)}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            accept="image/jpeg,image/png,image/jpg,application/pdf"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingDoc || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors disabled:opacity-50"
          >
            <Camera size={14} />
            <span>{uploadingDoc ? t.khoj.uploadingDoc : t.khoj.uploadDocPhoto}</span>
          </button>
          <span className="text-[11px] text-slate-400">
            Privacy-safe OCR: identity numbers (Aadhaar/Ration) are never recorded
          </span>
        </div>
      </div>

      {/* Profile Chips Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
        <ProfileChips
          profile={profile}
          onRemove={handleRemoveChip}
          onRerun={() => fetchMatches(profile)}
        />
        {Object.keys(profile).length > 0 && (
          <button
            onClick={() => {
              setProfile({})
              setResults([])
              setNearMisses([])
              setMessages([])
            }}
            className="text-xs text-slate-400 hover:text-rose-600 font-medium transition-colors shrink-0"
          >
            {t.khoj.clearProfile}
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs sm:text-sm text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => processQuery(lastQuery, profile)}
            className="inline-flex items-center gap-1 font-bold text-rose-900 underline hover:no-underline"
          >
            <RefreshCw size={12} /> {t.khoj.retry}
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && <Loader message="Evaluating rules and verifying official scheme timelines..." />}

      {/* Matched Results Section */}
      {!loading && results.length > 0 && (
        <div className="space-y-4 pt-2">
          {/* Header & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Matched Welfare Programs ({results.length})
              </h2>
              <p className="text-xs text-slate-500">
                Strict Python rule matching — official source verified
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShareWhatsApp}
                className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 shadow-2xs transition-colors shrink-0"
              >
                <Share2 size={13} />
                <span>{t.khoj.shareWhatsApp}</span>
              </button>
              {allDocuments.length > 0 && (
                <button
                  onClick={() => window.print()}
                  className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors shrink-0"
                >
                  <Printer size={13} />
                  <span>{t.khoj.downloadDocs}</span>
                </button>
              )}
            </div>
          </div>

          {/* Timeline Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{t.khoj.filterTabs?.all || 'All Schemes'}</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${activeTab === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {totalCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'active'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{t.khoj.filterTabs?.active || 'Available Now'}</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${activeTab === 'active' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-900'}`}>
                {activeCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'upcoming'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/60'
              }`}
            >
              <Clock size={12} />
              <span>{t.khoj.filterTabs?.upcoming || 'Upcoming'}</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${activeTab === 'upcoming' ? 'bg-blue-800 text-white' : 'bg-blue-100 text-blue-900'}`}>
                {upcomingCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ended')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'ended'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <XCircle size={12} />
              <span>{t.khoj.filterTabs?.ended || 'Closed / Past'}</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${activeTab === 'ended' ? 'bg-slate-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {endedCount}
              </span>
            </button>
          </div>

          {/* Scheme Cards Grid */}
          {filteredSchemes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              {filteredSchemes.map((scheme) => (
                <SchemeCard key={scheme.id} scheme={scheme} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
              No schemes found in this timeline category. Switch tabs to view other programs.
            </div>
          )}
        </div>
      )}

      {/* Almost Eligible View (Phase 1b) */}
      {!loading && nearMisses.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-amber-200">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-100 rounded-lg text-amber-800">
              <AlertCircle size={18} />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {t.khoj.almostEligible} ({nearMisses.length})
              </h2>
              <p className="text-xs text-slate-500">
                {t.khoj.almostEligibleDesc}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            {nearMisses.map((scheme) => (
              <SchemeCard key={`near-${scheme.id}`} scheme={scheme} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && results.length === 0 && nearMisses.length === 0 && (
        <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-white space-y-3">
          <div className="text-3xl">🌾</div>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            {t.khoj.noResults}
          </p>
        </div>
      )}

      {/* Print-Only Document Checklist Sheet */}
      <div className="print-only p-8">
        <h1 className="text-2xl font-bold mb-2">YojanaLens — Required Documents Checklist</h1>
        <p className="text-sm text-slate-600 mb-6">
          Official document checklist compiled for your profile. Please prepare these documents before visiting the government office.
        </p>
        <ul className="space-y-3 text-base">
          {allDocuments.map((doc, idx) => (
            <li key={idx} className="flex items-center gap-3">
              <span className="w-5 h-5 border-2 border-slate-800 rounded inline-block" />
              <span>{doc}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Prototype notice banner */}
      <Disclaimer />
    </div>
  )
}
