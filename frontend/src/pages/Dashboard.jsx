import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid
} from 'recharts'
import {
  Users, FileCheck, Shield, AlertTriangle, AlertOctagon,
  Sparkles, ExternalLink, HelpCircle, ArrowUpRight, ArrowDownRight,
  TrendingUp, Database, Send, CheckCircle2, ChevronDown, ChevronUp
} from 'lucide-react'
import { useLang } from '../i18n/strings'
import client, { useMock } from '../api/client'
import { mockStats, mockBudgetSummary } from '../api/mock'
import Loader from '../components/Loader'
import Disclaimer from '../components/Disclaimer'

const VERDICT_COLORS = {
  supported: '#059669', // emerald
  false: '#E11D48',     // rose
  unverified: '#64748B' // slate
}

const STATUS_COLORS = {
  received: '#F59E0B',    // amber
  in_progress: '#3B82F6', // blue
  resolved: '#10B981'    // emerald
}

export default function Dashboard() {
  const { t, lang } = useLang()
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

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
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
        setError('Failed to load dashboard metrics.')
      } finally {
        setLoading(false)
      }
    }
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
      <div className="max-w-5xl mx-auto px-4 py-12">
        <Loader message="Loading impact & budget transparency data..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-sm text-rose-600">
        {error}
      </div>
    )
  }

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
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      {/* Page Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {t.dashboard.title}
          </h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
            Live Verifications & Open Data
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500">
          Real-time metrics on citizen access, welfare eligibility checks, scam prevention, and open public finance.
        </p>
      </div>

      {/* KPI Stat Cards (4 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sessions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">{t.dashboard.sessions}</span>
            <Users size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {stats.sessions?.toLocaleString() || '0'}
          </p>
          <p className="text-[11px] text-slate-500">Citizens assisted across India</p>
        </div>

        {/* Schemes Matched */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">{t.dashboard.matched}</span>
            <FileCheck size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {stats.schemes_matched?.toLocaleString() || '0'}
          </p>
          <p className="text-[11px] text-slate-500">Eligibility evaluations by code</p>
        </div>

        {/* Scams Prevented */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Claims Checked</span>
            <Shield size={16} className="text-rose-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {totalFactChecks.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500">
            <span className="text-rose-600 font-semibold">{stats.verdicts?.false || 0} false</span> flagged
          </p>
        </div>

        {/* Civic Grievances */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">{t.dashboard.complaintsMetrics || 'Civic Grievances'}</span>
            <AlertOctagon size={16} className="text-amber-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {(stats.complaints_total ?? 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500">
            <span className="text-emerald-600 font-semibold">{stats.complaints_by_status?.resolved || 0} resolved</span>
          </p>
        </div>
      </div>

      {/* Grid: Fact-Check Breakdown & Missing Docs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Documents Bar Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {t.dashboard.topDocs}
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Across active profiles</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.top_missing_documents || []}
                layout="vertical"
                margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
              >
                <XAxis type="number" fontSize={10} stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" width={120} fontSize={10} stroke="#64748b" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill="#EA580C" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fact-Check Verdicts Breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {t.dashboard.verdicts} Distribution
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Grounded in .gov.in sources</span>
          </div>
          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ─── SECTION: PUBLIC SPENDING & BUDGET TRANSPARENCY (PHASE 4) ──────── */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-xl font-bold text-slate-900">
                {t.dashboard.publicSpending}
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl">
              {t.dashboard.budgetSubtitle}
            </p>
          </div>
          {budget?.available && (
            <div className="text-left sm:text-right shrink-0">
              <p className="text-xs text-slate-400 font-medium">Latest Fiscal Year</p>
              <p className="text-sm font-bold text-emerald-700">
                FY {budget.latest_year} (₹{budget.total_budget_latest_year?.toLocaleString()} Cr Tracked)
              </p>
            </div>
          )}
        </div>

        {!budget?.available ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
            <Database size={28} className="mx-auto text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">
              {t.dashboard.noData}
            </p>
            <p className="text-xs text-slate-500">
              Backend is ready: place any open government CSV in <code className="bg-slate-200 px-1 py-0.5 rounded">backend/data/</code> to activate pandas analytics.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Visualizations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Bar Chart by Sector */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {t.dashboard.bySector}
                  </h4>
                  <button
                    onClick={handleExplainSector}
                    disabled={explainingSector}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md transition-colors"
                  >
                    <Sparkles size={12} className="text-blue-600" />
                    <span>{explainingSector ? t.dashboard.explaining : t.dashboard.explainBtn}</span>
                  </button>
                </div>

                {/* Plain-Language Explanation Bubble */}
                {sectorExplanation && (
                  <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-lg text-xs text-blue-900 leading-relaxed flex items-start gap-2">
                    <Sparkles size={14} className="text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-950 mb-0.5">Citizen Explanation:</p>
                      <p>{sectorExplanation}</p>
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
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" fontSize={10} stroke="#94a3b8" />
                      <YAxis dataKey="sector" type="category" width={115} fontSize={10} stroke="#64748b" />
                      <Tooltip
                        formatter={(val) => [`₹${val.toLocaleString()} Cr`, 'Allocation']}
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                      />
                      <Bar dataKey="allocation" fill="#2563EB" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Dataset Citation */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1 truncate">
                    <span>{t.dashboard.datasetCitation}</span>
                    <span className="font-medium text-slate-700">{meta.dataset_name || 'Union Budget'}</span>
                    <span>({meta.year || '2024-25'})</span>
                  </div>
                  {meta.source_url && (
                    <a
                      href={meta.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-blue-600 hover:underline shrink-0"
                    >
                      <span>Portal</span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>

              {/* Chart 2: Line Chart by Year */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {t.dashboard.byYear}
                  </h4>
                  <button
                    onClick={handleExplainTrend}
                    disabled={explainingTrend}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md transition-colors"
                  >
                    <Sparkles size={12} className="text-blue-600" />
                    <span>{explainingTrend ? t.dashboard.explaining : t.dashboard.explainBtn}</span>
                  </button>
                </div>

                {/* Plain-Language Explanation Bubble */}
                {trendExplanation && (
                  <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-lg text-xs text-blue-900 leading-relaxed flex items-start gap-2">
                    <Sparkles size={14} className="text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-950 mb-0.5">Citizen Explanation:</p>
                      <p>{trendExplanation}</p>
                    </div>
                  </div>
                )}

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={budget.by_year || []}
                      margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="year" fontSize={11} stroke="#64748b" />
                      <YAxis fontSize={10} stroke="#94a3b8" />
                      <Tooltip
                        formatter={(val) => [`₹${val.toLocaleString()} Cr`, 'Total Allocation']}
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="total_allocation"
                        stroke="#059669"
                        strokeWidth={2.5}
                        dot={{ r: 5, fill: '#059669' }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Dataset Citation */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1 truncate">
                    <span>{t.dashboard.datasetCitation}</span>
                    <span className="font-medium text-slate-700">{meta.dataset_name || 'Union Budget'}</span>
                    <span>({meta.year || '2024-25'})</span>
                  </div>
                  {meta.source_url && (
                    <a
                      href={meta.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-blue-600 hover:underline shrink-0"
                    >
                      <span>Portal</span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Top 10 Line Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs space-y-0">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {t.dashboard.top10Items} ({budget.latest_year})
                </h4>
                <span className="text-[11px] text-slate-500">
                  Calculated by code (pandas)
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">{t.dashboard.lineItem}</th>
                      <th className="py-2.5 px-3">{t.dashboard.dept}</th>
                      <th className="py-2.5 px-3 text-right">{t.dashboard.allocation}</th>
                      <th className="py-2.5 px-3 text-right">{t.dashboard.changeYoY}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {(budget.top_10_schemes || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{item.scheme_name}</td>
                        <td className="py-2.5 px-3 text-slate-500 max-w-[200px] truncate">{item.department}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900">
                          ₹{item.allocation?.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {item.yoy_change !== null && item.yoy_change !== undefined ? (
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              item.yoy_change > 0
                                ? 'bg-emerald-50 text-emerald-700'
                                : item.yoy_change < 0
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {item.yoy_change > 0 ? '+' : ''}{item.yoy_change}%
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[10px]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1 truncate">
                  <span>{t.dashboard.datasetCitation}</span>
                  <span className="font-medium text-slate-700">{meta.dataset_name}</span>
                </div>
                {meta.source_url && (
                  <a
                    href={meta.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-blue-600 hover:underline"
                  >
                    <span>{meta.source_url}</span>
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>

            {/* ─── Ask about this data Box (Phase 4c) ───────────────────────── */}
            <div className="border border-blue-200 bg-blue-50/40 rounded-xl p-5 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Database size={17} className="text-blue-700" />
                  <h4 className="text-sm font-bold text-slate-900">
                    {t.dashboard.askDataTitle}
                  </h4>
                </div>
                <p className="text-xs text-slate-500">
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
                    onClick={() => {
                      setAskQuestion(sq)
                      handleAskData(null, sq)
                    }}
                    className="text-[11px] bg-white border border-blue-200 text-blue-800 hover:bg-blue-100/70 px-2.5 py-1 rounded-full transition-colors"
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
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
                <button
                  type="submit"
                  disabled={askingData || !askQuestion.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-2xs shrink-0"
                >
                  <Send size={13} />
                  <span>{askingData ? t.dashboard.askingData : t.dashboard.askDataBtn}</span>
                </button>
              </form>

              {/* Ask Response */}
              {askResult && (
                <div className="bg-white border border-blue-200 rounded-lg p-4 space-y-3 shadow-2xs">
                  <div className="flex items-start gap-2 text-xs text-slate-800">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-900">Answer:</p>
                      <p className="leading-relaxed text-slate-700">{askResult.answer}</p>
                    </div>
                  </div>

                  {/* Collapsible verification calculation details */}
                  {askResult.computed_data && (
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        onClick={() => setShowCalculationDetails(!showCalculationDetails)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
                      >
                        {showCalculationDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        <span>Inspection: Verify pandas computation & parameters</span>
                      </button>

                      {showCalculationDetails && (
                        <div className="mt-2 p-2.5 bg-slate-50 rounded border border-slate-200 font-mono text-[10px] text-slate-600 space-y-1.5 overflow-x-auto">
                          <div>
                            <span className="font-bold text-slate-700">Aggregation:</span> {askResult.aggregation}
                          </div>
                          <div>
                            <span className="font-bold text-slate-700">Params:</span> {JSON.stringify(askResult.params)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-700">Computed Output:</span>
                            <pre className="mt-1 text-[10px] bg-white p-2 rounded border border-slate-200">
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
