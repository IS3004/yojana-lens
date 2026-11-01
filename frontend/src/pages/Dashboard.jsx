import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid
} from 'recharts'
import {
  Users, FileCheck, Shield, AlertOctagon,
  Sparkles, ExternalLink, Database, Send, CheckCircle2, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react'
import { useLang } from '../i18n/strings'
import client, { useMock } from '../api/client'
import { mockStats, mockBudgetSummary } from '../api/mock'
import Loader from '../components/Loader'
import Disclaimer from '../components/Disclaimer'

// Palette: navy, saffron, emerald, slate
const PALETTE = {
  navy: '#0F2A4A',
  saffron: '#E8710A',
  emerald: '#0E8A5F',
  slate: '#5B6573',
  danger: '#C62828',
  amber: '#B45309',
  info: '#1D5FA8',
}

const VERDICT_COLORS = {
  supported: PALETTE.emerald,
  false: PALETTE.danger,
  unverified: PALETTE.slate,
}

export default function Dashboard() {
  const { t, lang } = useLang()
  const isHi = lang === 'hi'
  const [stats, setStats] = useState(null)
  const [budget, setBudget] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Chart explanation states
  const [sectorExplanation, setSectorExplanation] = useState(null)
  const [explainingSector, setExplainingSector] = useState(false)

  const [trendExplanation, setTrendExplanation] = useState(null)
  const [explainingTrend, setExplainingTrend] = useState(false)

  // Ask data states
  const [askQuestion, setAskQuestion] = useState('')
  const [askingData, setAskingData] = useState(false)
  const [askResult, setAskResult] = useState(null)
  const [showCalculationDetails, setShowCalculationDetails] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      let statsRes
      let budgetRes

      if (useMock) {
        statsRes = await mockStats()
        budgetRes = await mockBudgetSummary()
      } else {
        const [sRes, bRes] = await Promise.all([
          client.get('/stats'),
          client.get('/budget/summary').catch(() => ({ data: { available: false } }))
        ])
        statsRes = sRes
        budgetRes = bRes
      }

      setStats(statsRes.data)
      setBudget(budgetRes.data)
    } catch (err) {
      console.error(err)
      setError('Failed to load dashboard metrics. Please retry.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Explain sector chart
  const handleExplainSector = async () => {
    if (!budget?.by_sector) return
    setExplainingSector(true)
    try {
      if (useMock) {
        setSectorExplanation(
          lang === 'hi'
            ? 'ग्रामीण विकास एवं कृषि क्षेत्रों को सर्वाधिक ₹1.80 लाख करोड़ से अधिक का बजटीय आवंटन प्राप्त हुआ है, जो ग्रामीण अर्थव्यवस्था को प्राथमिकता दर्शाता है।'
            : 'Rural Development and Agriculture lead public expenditure allocations with over ₹1.80 Lakh Crore combined, reflecting strong social infrastructure prioritization.'
        )
      } else {
        const res = await client.post('/budget/explain', {
          chart_type: 'Sectoral Allocations',
          chart_summary: {
            latest_year: budget.latest_year,
            total_budget: budget.total_budget_latest_year,
            by_sector: budget.by_sector.slice(0, 5)
          },
          lang
        })
        setSectorExplanation(res.data.explanation)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setExplainingSector(false)
    }
  }

  // Explain trend chart
  const handleExplainTrend = async () => {
    if (!budget?.by_year) return
    setExplainingTrend(true)
    try {
      if (useMock) {
        setTrendExplanation(
          lang === 'hi'
            ? '2022-23 से 2024-25 के दौरान कुल बजटीय आवंटन ₹3.22 लाख करोड़ से बढ़कर ₹3.67 लाख करोड़ पहुंच गया, जो स्थिर वार्षिक वृद्धि दर्शाता है।'
            : 'Total budgetary allocations rose steadily from ₹3.22 Lakh Crore in 2022-23 to ₹3.67 Lakh Crore in 2024-25, maintaining positive fiscal expansion.'
        )
      } else {
        const res = await client.post('/budget/explain', {
          chart_type: 'Year-over-Year Allocations Trend',
          chart_summary: {
            yearly_trend: budget.by_year
          },
          lang
        })
        setTrendExplanation(res.data.explanation)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setExplainingTrend(false)
    }
  }

  // Ask about budget data
  const handleAskData = async (e, customQuery = null) => {
    if (e) e.preventDefault()
    const query = customQuery || askQuestion
    if (!query.trim()) return

    setAskingData(true)
    setAskResult(null)
    try {
      if (useMock) {
        setAskResult({
          question: query,
          aggregation: 'total_by_sector',
          params: { sector: 'Rural Development' },
          computed_data: { sector: 'Rural Development', year: '2024-25', total_allocation_crores: 98000.0 },
          answer: lang === 'hi'
            ? `वित्त वर्ष 2024-25 में ग्रामीण विकास क्षेत्र को कुल ₹98,000 करोड़ आवंटित किए गए हैं, जिसमें MGNREGA का हिस्सा ₹86,000 करोड़ है।`
            : `In FY 2024-25, Rural Development received a total allocation of ₹98,000 Crore, led primarily by MGNREGA with ₹86,000 Crore.`
        })
      } else {
        const res = await client.post('/budget/ask', {
          question: query,
          lang
        })
        setAskResult(res.data)
      }
    } catch (err) {
      console.error(err)
      setAskResult({
        answer: lang === 'hi'
          ? 'इस सवाल का उत्तर डेटासेट में उपलब्ध नहीं है। कृपया indiadatagov.in या indiabudget.gov.in देखें।'
          : 'Could not process query or figures are unavailable in the dataset. Please check indiabudget.gov.in.'
      })
    } finally {
      setAskingData(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16">
        <Loader message="Loading impact & budget transparency data..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-4 rounded-xl bg-danger-tint border border-danger/30 text-danger text-sm font-semibold max-w-md mx-auto">
          {error}
        </div>
        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-saffron hover:bg-saffron-hover text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
        >
          <RefreshCw size={14} />
          <span>Retry Loading</span>
        </button>
      </div>
    )
  }

  // Format Indian Numbers
  const formatInr = (n) => new Intl.NumberFormat('en-IN').format(n || 0)

  // Verdict Pie Data
  const pieData = stats?.verdicts ? [
    { name: lang === 'hi' ? 'सत्यापित (Supported)' : 'Supported', value: stats.verdicts.supported || 0, color: VERDICT_COLORS.supported },
    { name: lang === 'hi' ? 'भ्रामक (False)' : 'False / Scam', value: stats.verdicts.false || 0, color: VERDICT_COLORS.false },
    { name: lang === 'hi' ? 'अपुष्ट (Unverified)' : 'Unverified', value: stats.verdicts.unverified || 0, color: VERDICT_COLORS.unverified },
  ] : []

  const totalFactChecks = (stats?.verdicts?.supported || 0) + (stats?.verdicts?.false || 0) + (stats?.verdicts?.unverified || 0)
  const meta = budget?.meta || {}

  const sampleQuestions = lang === 'hi' ? [
    'किस क्षेत्र को 2024-25 में सर्वाधिक बजट मिला?',
    'मनरेगा (MGNREGA) का बजट 2022 से 2024 में कैसे बदला?',
    'स्वास्थ्य क्षेत्र के शीर्ष योजनाएं और उनका आवंटन क्या है?',
    'एनएसपी (NSP) राष्ट्रीय छात्रवृत्ति का बजट कितना है?'
  ] : [
    'Which sector received the highest budget allocation in 2024-25?',
    'How did MGNREGA allocation change from 2022 to 2024?',
    'What are the top 3 schemes under Healthcare?',
    'What is the budget allocation for NSP (National Scholarship Portal)?'
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10 space-y-10">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
            {t.dashboard.title}
          </h1>
          <span className="text-xs px-3 py-1 rounded-full bg-info-tint text-info font-bold border border-info/30">
            Open Data & Fact Verification
          </span>
        </div>
        <p className="text-xs sm:text-sm text-muted max-w-3xl leading-relaxed">
          Real-time metrics on citizen welfare eligibility checks, scam prevention fact-checks, and public finance transparency.
        </p>
      </div>

      {/* Top Row: 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Sessions */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">{t.dashboard.sessions}</span>
            <Users size={18} className="text-navy" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-navy">
            {formatInr(stats.sessions)}
          </p>
          <p className="text-[11px] text-muted">Citizens assisted across India</p>
        </div>

        {/* Card 2: Schemes Matched */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">{t.dashboard.matched}</span>
            <FileCheck size={18} className="text-emerald-verified" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-verified">
            {formatInr(stats.schemes_matched)}
          </p>
          <p className="text-[11px] text-muted">Eligibility evaluations by rule engine</p>
        </div>

        {/* Card 3: Claims Checked */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Claims Checked</span>
            <Shield size={18} className="text-danger" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-navy">
            {formatInr(totalFactChecks)}
          </p>
          <p className="text-[11px] text-muted">
            <span className="text-danger font-bold">{stats.verdicts?.false || 0} fake claims</span> blocked
          </p>
        </div>

        {/* Card 4: Civic Grievances */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">{t.dashboard.complaintsMetrics || 'Civic Grievances'}</span>
            <AlertOctagon size={18} className="text-saffron" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-navy">
            {formatInr(stats.complaints_total)}
          </p>
          <p className="text-[11px] text-muted">
            <span className="text-emerald-verified font-bold">{stats.complaints_by_status?.resolved || 0} resolved</span>
          </p>
        </div>
      </div>

      {/* Grid: Fact-Check Breakdown & Missing Docs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Documents Bar Chart */}
        <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-navy uppercase tracking-wider">
              {t.dashboard.topDocs}
            </h3>
            <span className="text-[11px] text-muted font-medium">Across active profiles</span>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.top_missing_documents || []}
                layout="vertical"
                margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
              >
                <XAxis type="number" fontSize={11} stroke={PALETTE.slate} />
                <YAxis dataKey="name" type="category" width={120} fontSize={11} stroke={PALETTE.navy} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E6E1D8', fontSize: '11px', boxShadow: '0 2px 8px rgba(15,42,74,0.06)' }}
                />
                <Bar dataKey="count" fill={PALETTE.saffron} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fact-Check Verdicts Breakdown */}
        <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-navy uppercase tracking-wider">
              {t.dashboard.verdicts} Distribution
            </h3>
            <span className="text-[11px] text-muted font-medium">Verified against .gov.in sources</span>
          </div>
          <div className="h-60 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E6E1D8', fontSize: '11px', boxShadow: '0 2px 8px rgba(15,42,74,0.06)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ─── SECTION: PUBLIC SPENDING & BUDGET TRANSPARENCY ────────────────── */}
      <section className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-verified animate-pulse" />
              <h2 className="text-xl font-bold text-navy">
                {t.dashboard.publicSpending}
              </h2>
            </div>
            <p className="text-xs text-muted max-w-2xl leading-relaxed">
              {t.dashboard.budgetSubtitle}
            </p>
          </div>
          {budget?.available && (
            <div className="text-left sm:text-right shrink-0">
              <p className="text-xs text-muted font-semibold">Latest Fiscal Year</p>
              <p className="text-sm font-bold text-emerald-verified">
                FY {budget.latest_year} (₹{formatInr(budget.total_budget_latest_year)} Cr)
              </p>
            </div>
          )}
        </div>

        {!budget?.available ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-border space-y-2">
            <Database size={32} className="mx-auto text-muted" />
            <p className="text-sm font-bold text-navy">
              {t.dashboard.noData}
            </p>
            <p className="text-xs text-muted">
              Backend is ready: place any open government CSV in <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono">backend/data/</code> to activate live pandas analytics.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Visualizations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Bar Chart by Sector */}
              <div className="border border-border rounded-2xl p-5 bg-white space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-navy uppercase tracking-wider">
                    {t.dashboard.bySector}
                  </h4>
                  <button
                    type="button"
                    onClick={handleExplainSector}
                    disabled={explainingSector}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-info hover:text-navy bg-info-tint border border-info/30 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                  >
                    <Sparkles size={13} className="text-info" />
                    <span>{explainingSector ? t.dashboard.explaining : t.dashboard.explainBtn}</span>
                  </button>
                </div>

                {/* Plain-Language Explanation Bubble */}
                {sectorExplanation && (
                  <div className="p-3.5 bg-info-tint/70 border border-info/30 rounded-xl text-xs text-navy leading-relaxed flex items-start gap-2.5">
                    <Sparkles size={16} className="text-info shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-navy mb-0.5">Citizen Explanation:</p>
                      <p className="text-navy/90">{sectorExplanation}</p>
                    </div>
                  </div>
                )}

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={budget.by_sector || []}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E6E1D8" />
                      <XAxis type="number" fontSize={11} stroke={PALETTE.slate} />
                      <YAxis dataKey="sector" type="category" width={115} fontSize={11} stroke={PALETTE.navy} />
                      <Tooltip
                        formatter={(val) => [`₹${formatInr(val)} Cr`, 'Allocation']}
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E6E1D8', fontSize: '11px', boxShadow: '0 2px 8px rgba(15,42,74,0.06)' }}
                      />
                      <Bar dataKey="allocation" fill={PALETTE.navy} radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Dataset Citation */}
                <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted">
                  <div className="flex items-center gap-1 truncate">
                    <span>{t.dashboard.datasetCitation}</span>
                    <span className="font-bold text-navy">{meta.dataset_name || 'Union Budget'}</span>
                    <span>({meta.year || '2024-25'})</span>
                  </div>
                  {meta.source_url && (
                    <a
                      href={meta.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-info hover:underline font-semibold shrink-0"
                    >
                      <span>Official Source</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>

              {/* Chart 2: Line Chart by Year */}
              <div className="border border-border rounded-2xl p-5 bg-white space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-navy uppercase tracking-wider">
                    {t.dashboard.byYear}
                  </h4>
                  <button
                    type="button"
                    onClick={handleExplainTrend}
                    disabled={explainingTrend}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-info hover:text-navy bg-info-tint border border-info/30 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                  >
                    <Sparkles size={13} className="text-info" />
                    <span>{explainingTrend ? t.dashboard.explaining : t.dashboard.explainBtn}</span>
                  </button>
                </div>

                {/* Plain-Language Explanation Bubble */}
                {trendExplanation && (
                  <div className="p-3.5 bg-info-tint/70 border border-info/30 rounded-xl text-xs text-navy leading-relaxed flex items-start gap-2.5">
                    <Sparkles size={16} className="text-info shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-navy mb-0.5">Citizen Explanation:</p>
                      <p className="text-navy/90">{trendExplanation}</p>
                    </div>
                  </div>
                )}

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={budget.by_year || []}
                      margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E6E1D8" />
                      <XAxis dataKey="year" fontSize={11} stroke={PALETTE.navy} />
                      <YAxis fontSize={11} stroke={PALETTE.slate} />
                      <Tooltip
                        formatter={(val) => [`₹${formatInr(val)} Cr`, 'Total Allocation']}
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E6E1D8', fontSize: '11px', boxShadow: '0 2px 8px rgba(15,42,74,0.06)' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="total_allocation"
                        stroke={PALETTE.emerald}
                        strokeWidth={3}
                        dot={{ r: 5, fill: PALETTE.emerald }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Dataset Citation */}
                <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted">
                  <div className="flex items-center gap-1 truncate">
                    <span>{t.dashboard.datasetCitation}</span>
                    <span className="font-bold text-navy">{meta.dataset_name || 'Union Budget'}</span>
                    <span>({meta.year || '2024-25'})</span>
                  </div>
                  {meta.source_url && (
                    <a
                      href={meta.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-info hover:underline font-semibold shrink-0"
                    >
                      <span>Official Source</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Top 10 Line Items Table */}
            <div className="border border-border rounded-2xl overflow-hidden shadow-2xs space-y-0">
              <div className="bg-slate-50 px-5 py-3.5 border-b border-border flex items-center justify-between">
                <h4 className="text-xs font-bold text-navy uppercase tracking-wider">
                  {t.dashboard.top10Items} ({budget.latest_year})
                </h4>
                <span className="text-[11px] text-muted font-medium">
                  Computed by pandas code
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 text-muted font-bold uppercase tracking-wider border-b border-border text-[11px]">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">{t.dashboard.lineItem}</th>
                      <th className="py-3 px-4">{t.dashboard.dept}</th>
                      <th className="py-3 px-4 text-right">{t.dashboard.allocation}</th>
                      <th className="py-3 px-4 text-right">{t.dashboard.changeYoY}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white text-navy">
                    {(budget.top_10_schemes || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-muted font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-navy">{item.scheme_name}</td>
                        <td className="py-3 px-4 text-muted max-w-[200px] truncate">{item.department}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-navy">
                          ₹{formatInr(item.allocation)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {item.yoy_change !== null && item.yoy_change !== undefined ? (
                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                              item.yoy_change > 0
                                ? 'bg-emerald-tint text-emerald-verified border-emerald-verified/30'
                                : item.yoy_change < 0
                                ? 'bg-danger-tint text-danger border-danger/30'
                                : 'bg-slate-100 text-muted border-border'
                            }`}>
                              {item.yoy_change > 0 ? '+' : ''}{item.yoy_change}%
                            </span>
                          ) : (
                            <span className="text-muted font-mono text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-slate-50 px-5 py-3 border-t border-border flex items-center justify-between text-[11px] text-muted">
                <div className="flex items-center gap-1 truncate">
                  <span>{t.dashboard.datasetCitation}</span>
                  <span className="font-bold text-navy">{meta.dataset_name}</span>
                </div>
                {meta.source_url && (
                  <a
                    href={meta.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-info hover:underline font-semibold"
                  >
                    <span>{meta.source_url}</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>

            {/* ─── Ask about this data Box ──────────────────────────────────── */}
            <div className="border border-info/30 bg-info-tint/30 rounded-2xl p-6 space-y-4 shadow-card">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Database size={18} className="text-info" />
                  <h4 className="text-sm font-bold text-navy">
                    {t.dashboard.askDataTitle}
                  </h4>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  {lang === 'hi'
                    ? 'AI केवल प्रश्न का वर्गीकरण करता है; सभी गणनाएं सीधे कोड (pandas) में होती हैं और उसी से उत्तर तैयार होता है।'
                    : 'The LLM only maps your query; all aggregations are strictly executed in Python (pandas) with verified arithmetic.'}
                </p>
              </div>

              {/* Starter questions */}
              <div className="flex flex-wrap gap-2">
                {sampleQuestions.map((sq, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setAskQuestion(sq)
                      handleAskData(null, sq)
                    }}
                    className="text-xs bg-white border border-border text-navy hover:border-info hover:text-info px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-2xs font-medium"
                  >
                    {sq}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form onSubmit={handleAskData} className="flex gap-2">
                <input
                  type="text"
                  value={askQuestion}
                  onChange={(e) => setAskQuestion(e.target.value)}
                  placeholder={t.dashboard.askDataPlaceholder}
                  className="flex-1 bg-white border border-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-navy focus-visible:outline-3 focus-visible:outline-saffron focus-visible:outline-offset-2 shadow-2xs transition-all"
                />
                <button
                  type="submit"
                  disabled={askingData || !askQuestion.trim()}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-saffron hover:bg-saffron-hover text-white font-bold text-xs transition-colors disabled:opacity-50 shadow-xs shrink-0 cursor-pointer min-h-[44px]"
                >
                  <Send size={14} />
                  <span>{askingData ? t.dashboard.askingData : t.dashboard.askDataBtn}</span>
                </button>
              </form>

              {/* Ask Response */}
              {askResult && (
                <div className="bg-white border border-border rounded-xl p-5 space-y-3 shadow-2xs">
                  <div className="flex items-start gap-2.5 text-xs text-navy">
                    <CheckCircle2 size={18} className="text-emerald-verified shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-navy text-sm">Verified Answer:</p>
                      <p className="leading-relaxed text-navy/90 text-xs sm:text-sm">{askResult.answer}</p>
                    </div>
                  </div>

                  {/* Collapsible verification calculation details */}
                  {askResult.computed_data && (
                    <div className="pt-2 border-t border-border">
                      <button
                        type="button"
                        onClick={() => setShowCalculationDetails(!showCalculationDetails)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-navy cursor-pointer"
                      >
                        {showCalculationDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        <span>Inspection: Verify pandas computation & parameters</span>
                      </button>

                      {showCalculationDetails && (
                        <div className="mt-2.5 p-3 bg-slate-50 rounded-xl border border-border font-mono text-[11px] text-navy space-y-1.5 overflow-x-auto">
                          <div>
                            <span className="font-bold text-muted">Aggregation:</span> {askResult.aggregation}
                          </div>
                          <div>
                            <span className="font-bold text-muted">Params:</span> {JSON.stringify(askResult.params)}
                          </div>
                          <div>
                            <span className="font-bold text-muted">Computed Output:</span>
                            <pre className="mt-1 text-[10px] bg-white p-2.5 rounded-lg border border-border text-navy">
                              {JSON.stringify(askResult.computed_data, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Disclaimer */}
      <Disclaimer />
    </div>
  )
}
