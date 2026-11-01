import { useState, useRef } from 'react'
import {
  Printer, RefreshCw, Bot, User, Clock, XCircle, Share2,
  Camera, AlertCircle, Sparkles, CheckCircle2, Lightbulb
} from 'lucide-react'
import { useLang } from '../i18n/strings'
import client, { useMock } from '../api/client'
import { mockExtract, mockMatch } from '../api/mock'
import ChatBox from '../components/ChatBox'
import ProfileChips from '../components/ProfileChips'
import SchemeCard from '../components/SchemeCard'
import Disclaimer from '../components/Disclaimer'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'

export default function Khoj() {
  const { lang, t } = useLang()
  const isHi = lang === 'hi'

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
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
            {isHi ? 'खोज (Khoj) — योजना अन्वेषक' : 'Khoj (खोज) — Scheme Finder'}
          </h1>
          <span className="text-xs px-3 py-1 rounded-full bg-saffron-tint text-saffron font-bold border border-saffron/30">
            Eligibility & Official Timelines
          </span>
        </div>
        <p className="text-xs sm:text-sm text-muted max-w-3xl leading-relaxed">
          {isHi
            ? 'अपनी स्थिति किसी भी भारतीय भाषा में बताएं या दस्तावेज़ फोटो जोड़ें। नियम इंजन आपकी पात्रता सत्यापित करेगा और सक्रिय व आगामी योजनाएं दिखाएगा।'
            : 'Describe your situation in any Indian language. Pure Python logic matches your profile against verified welfare schemes with deadlines and official links.'}
        </p>
      </div>

      {/* Chat Messages Log */}
      {messages.length > 0 && (
        <div className="bg-slate-100/70 border border-border rounded-2xl p-4 sm:p-5 space-y-3.5 max-h-72 overflow-y-auto">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2.5 text-xs sm:text-sm ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-navy text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Bot size={15} />
                </div>
              )}
              <div
                className={`p-3.5 rounded-2xl max-w-[85%] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-saffron-tint border border-saffron/30 text-navy font-medium rounded-tr-none shadow-2xs'
                    : 'bg-white border border-border text-navy rounded-tl-none shadow-card'
                }`}
              >
                {m.text}
              </div>
              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-saffron text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <User size={15} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input Box & Photo Prefill CTA */}
      <div className="bg-surface rounded-2xl border border-border p-5 shadow-card space-y-4">
        <ChatBox
          onSend={(text) => processQuery(text, profile)}
          loading={loading}
          starterChips={starterPrompts}
          onSelectStarter={(t) => processQuery(t, profile)}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
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
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-saffron-tint text-saffron border border-saffron/30 hover:bg-saffron/15 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <Camera size={15} />
            <span>{uploadingDoc ? t.khoj.uploadingDoc : t.khoj.uploadDocPhoto}</span>
          </button>
          <span className="text-[11px] text-muted">
            🛡️ Privacy safe: ID numbers (Aadhaar/Ration) are never stored or logged
          </span>
        </div>
      </div>

      {/* Profile Chips Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <ProfileChips
          profile={profile}
          onRemove={handleRemoveChip}
          onRerun={() => fetchMatches(profile)}
        />
        {Object.keys(profile).length > 0 && (
          <button
            type="button"
            onClick={() => {
              setProfile({})
              setResults([])
              setNearMisses([])
              setMessages([])
            }}
            className="text-xs text-muted hover:text-danger font-semibold transition-colors shrink-0 cursor-pointer"
          >
            {t.khoj.clearProfile}
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-danger-tint border border-danger/40 rounded-xl p-4 text-xs sm:text-sm text-danger flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => processQuery(lastQuery, profile)}
            className="inline-flex items-center gap-1 font-bold underline hover:no-underline cursor-pointer"
          >
            <RefreshCw size={13} /> {t.khoj.retry}
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          <p className="text-xs font-bold text-muted uppercase tracking-wider">
            {t.khoj.loading || 'Finding schemes…'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Skeleton className="h-56" count={2} />
          </div>
        </div>
      )}

      {/* Matched Results Section */}
      {!loading && results.length > 0 && (
        <div className="space-y-5 pt-2">
          {/* Header & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-2xl border border-border shadow-2xs">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-navy flex items-center gap-2">
                <span>Matched Welfare Programs ({results.length})</span>
                <span className="w-2 h-2 rounded-full bg-emerald-verified" />
              </h2>
              <p className="text-xs text-muted">
                Strict Python rule matching — official source verified
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="no-print inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-verified/40 bg-emerald-tint hover:bg-emerald-tint/80 text-xs font-bold text-emerald-verified shadow-2xs transition-all cursor-pointer"
              >
                <Share2 size={14} />
                <span>{t.khoj.shareWhatsApp}</span>
              </button>
              {allDocuments.length > 0 && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="no-print inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-white hover:bg-slate-50 text-xs font-bold text-navy shadow-2xs transition-all cursor-pointer"
                >
                  <Printer size={14} />
                  <span>{t.khoj.downloadDocs}</span>
                </button>
              )}
            </div>
          </div>

          {/* Timeline Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-navy text-white shadow-xs'
                  : 'bg-white text-muted hover:bg-slate-100 border border-border'
              }`}
            >
              <span>{t.khoj.filterTabs?.all || 'All Schemes'}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-navy'}`}>
                {totalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-emerald-verified text-white shadow-xs'
                  : 'bg-emerald-tint text-emerald-verified hover:bg-emerald-tint/80 border border-emerald-verified/30'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-300" />
              <span>{t.khoj.filterTabs?.active || 'Available Now'}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-white text-emerald-verified'}`}>
                {activeCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('upcoming')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'upcoming'
                  ? 'bg-info text-white shadow-xs'
                  : 'bg-info-tint text-info hover:bg-info-tint/80 border border-info/30'
              }`}
            >
              <Clock size={13} />
              <span>{t.khoj.filterTabs?.upcoming || 'Upcoming'}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${activeTab === 'upcoming' ? 'bg-white/20 text-white' : 'bg-white text-info'}`}>
                {upcomingCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ended')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'ended'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-white text-muted hover:bg-slate-100 border border-border'
              }`}
            >
              <XCircle size={13} />
              <span>{t.khoj.filterTabs?.ended || 'Closed / Past'}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${activeTab === 'ended' ? 'bg-white/20 text-white' : 'bg-slate-100 text-muted'}`}>
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
            <div className="text-center py-10 bg-surface border border-border rounded-2xl text-xs text-muted shadow-2xs">
              No schemes found in this timeline category. Switch tabs above to view other programs.
            </div>
          )}
        </div>
      )}

      {/* Almost Eligible View */}
      {!loading && nearMisses.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-info/30">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-info-tint rounded-xl text-info">
              <Lightbulb size={20} />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-navy flex items-center gap-2">
                <span>{t.khoj.almostEligible} ({nearMisses.length})</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-info-tint text-info font-bold border border-info/30">
                  1 Condition Away
                </span>
              </h2>
              <p className="text-xs text-muted">
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
        <EmptyState
          title={isHi ? 'अभी तक कोई मिलान नहीं' : 'No matching schemes yet'}
          description={t.khoj.noResults}
        />
      )}

      {/* Print-Only Document Checklist Sheet */}
      <div className="print-only p-8 bg-white">
        <h1 className="text-2xl font-bold mb-2 text-black">YojanaLens — Required Documents Checklist</h1>
        <p className="text-sm text-gray-600 mb-6">
          Official document checklist compiled for your profile. Please prepare these documents before visiting the government office.
        </p>
        <ul className="space-y-3 text-base">
          {allDocuments.map((doc, idx) => (
            <li key={idx} className="flex items-center gap-3 text-black">
              <span className="w-5 h-5 border-2 border-black rounded inline-block" />
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
