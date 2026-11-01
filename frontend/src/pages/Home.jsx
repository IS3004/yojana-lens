import { Link } from 'react-router-dom'
import { Search, ShieldAlert, ArrowRight, ShieldCheck, FileText, BarChart3, Wrench, CheckCircle2, Lock } from 'lucide-react'
import { useLang } from '../i18n/strings'
import Disclaimer from '../components/Disclaimer'

export default function Home() {
  const { t, lang } = useLang()
  const isHi = lang === 'hi'

  const trustItems = [
    {
      icon: <CheckCircle2 size={16} className="text-emerald-verified shrink-0" />,
      text: isHi ? 'नियम कोड द्वारा जाँचे जाते हैं (AI अनुमान नहीं)' : 'Rules checked by code, not guessed by AI',
    },
    {
      icon: <ShieldCheck size={16} className="text-emerald-verified shrink-0" />,
      text: isHi ? 'हर उत्तर आधिकारिक स्रोत (.gov.in / nic.in) से लिंक' : 'Every scheme linked to official source (.gov.in)',
    },
    {
      icon: <Lock size={16} className="text-emerald-verified shrink-0" />,
      text: isHi ? 'कोई आधार या व्यक्तिगत पहचान नंबर स्टोर नहीं' : 'No Aadhaar or personal ID numbers stored',
    },
  ]

  const modules = [
    {
      to: '/khoj',
      icon: '🔍',
      tag: isHi ? 'योजना अन्वेषक' : 'Scheme Finder',
      title: isHi ? 'खोज (Khoj)' : 'Khoj — Scheme Finder',
      promise: isHi
        ? 'अपनी स्थिति बताएं या दस्तावेज़ फोटो अपलोड करें। नियम इंजन आपकी पात्रता जाँचेगा और समयसीमा सहित योजनाएं दिखाएगा।'
        : 'Describe your situation in simple words. Our rule engine verifies your eligibility against official criteria.',
      cta: isHi ? 'योजनाएं खोजें' : 'Start exploring schemes',
      color: 'hover:border-saffron',
      tagBg: 'bg-saffron-tint text-saffron',
    },
    {
      to: '/parakh',
      icon: '🛡️',
      tag: isHi ? 'दावा व आदेश विश्लेषक' : 'Fact-Check & Notices',
      title: isHi ? 'परख (Parakh)' : 'Parakh — Claim & Notice Checker',
      promise: isHi
        ? 'संदिग्ध WhatsApp संदेशों की सरकारी रिकॉर्ड से पुष्टि करें। जटिल सरकारी आदेशों को सरल भाषा में समझें।'
        : 'Fact-check viral WhatsApp scheme claims against official records. Simplify bureaucratic notices into plain action items.',
      cta: isHi ? 'दावा या परिपत्र जांचें' : 'Verify claim or notice',
      color: 'hover:border-emerald-verified',
      tagBg: 'bg-emerald-tint text-emerald-verified',
    },
    {
      to: '/complaints',
      icon: '📋',
      tag: isHi ? 'नागरिक शिकायत निवारण' : 'Civic Grievances',
      title: isHi ? 'शिकायतें (Complaints)' : 'Complaints — Civic Petitions',
      promise: isHi
        ? 'सड़क, पानी, कचरा या बिजली की समस्या बताएं। संबंधित विभाग के नाम औपचारिक प्रशासनिक शिकायत पत्र तुरंत पाएं।'
        : 'Report municipal issues like roads, water or sanitation. Get formal administrative draft petitions generated instantly.',
      cta: isHi ? 'शिकायत दर्ज करें' : 'Draft civic petition',
      color: 'hover:border-danger',
      tagBg: 'bg-danger-tint text-danger',
    },
    {
      to: '/tools',
      icon: '🛠️',
      tag: isHi ? '5-in-1 नागरिक टूलकिट' : '5-in-1 Toolkit',
      title: isHi ? 'नागरिक सुविधा केंद्र (Tools)' : 'Citizen Tools (5-in-1 Toolkit)',
      promise: isHi
        ? 'दस्तावेज़ नाम परीक्षक, सीएससी आधिकारिक दर सूची (दलाली रोकथाम), अस्वीकृति कोड समाधान (PFMS/NPCI) व RTI प्रारूपक।'
        : 'CSC Official Rate Card, Document Expiry Auditor, PFMS/NPCI Rejection Decrypter, 1-Click RTI and DBT Bank Check.',
      cta: isHi ? 'नागरिक टूलकिट खोलें' : 'Open Citizen Tools',
      color: 'hover:border-amber-warn',
      tagBg: 'bg-amber-tint text-amber-warn',
    },
    {
      to: '/dashboard',
      icon: '📊',
      tag: isHi ? 'बजट एवं व्यय पारदर्शिता' : 'Budget Transparency',
      title: isHi ? 'प्रभाव एवं बजट (Dashboard)' : 'Dashboard — Public Spending',
      promise: isHi
        ? 'सरकारी बजट आवंटन, मंत्रालयों के खर्च और वार्षिक वृद्धि का पारदर्शी विश्लेषण। डेटा से सीधे प्रश्न पूछें।'
        : 'Explore official budgetary allocations, trends and ministry expenditures. Ask questions verified in code with pandas.',
      cta: isHi ? 'व्यय विश्लेषण देखें' : 'View spending metrics',
      color: 'hover:border-info',
      tagBg: 'bg-info-tint text-info',
    },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-12">
      {/* Hero Section: Navy with Saffron Glow */}
      <section className="relative rounded-3xl bg-navy text-white p-7 sm:p-14 overflow-hidden shadow-card border border-navy-dark">
        {/* Subtle decorative radial saffron glow */}
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 w-96 h-96 bg-saffron/15 rounded-full blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-verified/10 rounded-full blur-3xl pointer-events-none"
        />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-slate-100 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-saffron animate-pulse" />
            <span>{isHi ? 'सत्यापित नागरिक कल्याण एवं अधिकार मंच' : 'Verified Civic Intelligence & Rights Platform'}</span>
          </div>

          {/* Bilingual Headline Hierarchy */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-white font-hindi">
              {isHi ? t.home.hero : 'Find Every Government Scheme You Deserve.'}
            </h1>
            <p className="text-base sm:text-xl text-slate-200 leading-relaxed font-normal">
              {isHi
                ? 'Find every government scheme you deserve. Verified at official source.'
                : 'हर वो योजना जिसके आप हकदार हैं। आधिकारिक स्रोतों से सत्यापित।'}
            </p>
          </div>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {t.home.heroSub}
          </p>

          {/* Primary CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-3">
            <Link
              to="/khoj"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-saffron hover:bg-saffron-hover text-white font-bold text-sm shadow-md transition-all active:scale-[0.99] min-h-[48px]"
            >
              <Search size={18} />
              <span>{t.home.ctaKhoj}</span>
            </Link>
            <Link
              to="/parakh"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold text-sm shadow-sm transition-all active:scale-[0.99] min-h-[48px]"
            >
              <ShieldAlert size={18} className="text-saffron" />
              <span>{t.home.ctaParakh}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Strip: 3 Concrete Check Items */}
      <section className="bg-surface border border-border rounded-2xl p-5 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm text-navy">
          {trustItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 p-2">
              <div className="w-8 h-8 rounded-full bg-emerald-tint flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <span className="font-semibold leading-snug">{item.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 5 Module Cards: Responsive Grid / Full-width on Mobile */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-navy">
              {isHi ? 'नागरिक सुविधाएं एवं मॉड्यूल' : 'Explore Civic Modules'}
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              {isHi ? 'हर समस्या के लिए आधिकारिक व पारदर्शी समाधान' : 'Official, verified tools for every citizen roadblock'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {modules.map((m, idx) => (
            <Link
              key={idx}
              to={m.to}
              className={`group bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-card hover:shadow-md transition-all flex flex-col justify-between ${m.color} ${
                idx === 3 ? 'md:col-span-2' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl sm:text-4xl shrink-0 p-2.5 rounded-2xl bg-slate-50 border border-border group-hover:scale-105 transition-transform">
                  {m.icon}
                </span>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${m.tagBg}`}>
                      {m.tag}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-navy group-hover:text-saffron transition-colors">
                    {m.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed line-clamp-3">
                    {m.promise}
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between text-xs sm:text-sm font-semibold text-navy group-hover:text-saffron transition-colors">
                <span>{m.cta}</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3-Step "How It Works" Row */}
      <section className="bg-surface border border-border rounded-2xl p-6 sm:p-10 space-y-6 shadow-card">
        <div className="text-center space-y-1">
          <span className="text-[11px] font-bold text-saffron uppercase tracking-widest">
            Simple & Transparent
          </span>
          <h3 className="text-lg sm:text-xl font-bold text-navy">
            {t.home.how}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="space-y-2.5 p-4 rounded-xl bg-slate-50/60 border border-border text-center sm:text-left">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-saffron text-white font-black text-sm">
              1
            </div>
            <h4 className="font-bold text-navy text-sm sm:text-base">{t.home.step1}</h4>
            <p className="text-xs text-muted leading-relaxed">{t.home.step1d}</p>
          </div>

          <div className="space-y-2.5 p-4 rounded-xl bg-slate-50/60 border border-border text-center sm:text-left">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-navy text-white font-black text-sm">
              2
            </div>
            <h4 className="font-bold text-navy text-sm sm:text-base">{t.home.step2}</h4>
            <p className="text-xs text-muted leading-relaxed">{t.home.step2d}</p>
          </div>

          <div className="space-y-2.5 p-4 rounded-xl bg-slate-50/60 border border-border text-center sm:text-left">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-verified text-white font-black text-sm">
              3
            </div>
            <h4 className="font-bold text-navy text-sm sm:text-base">{t.home.step3}</h4>
            <p className="text-xs text-muted leading-relaxed">{t.home.step3d}</p>
          </div>
        </div>
      </section>

      {/* Civic Prototype Disclaimer Bar */}
      <Disclaimer />
    </div>
  )
}
