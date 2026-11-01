import { Link } from 'react-router-dom'
import { Search, ShieldAlert, ArrowRight, Sparkles, AlertOctagon, BarChart2, ShieldCheck } from 'lucide-react'
import { useLang } from '../i18n/strings'
import Disclaimer from '../components/Disclaimer'

export default function Home() {
  const { t, lang } = useLang()

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-10">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100/80 border border-orange-200 text-orange-800 text-xs font-semibold">
          <Sparkles size={14} className="text-orange-600" />
          <span>AI-Powered Citizen Intelligence & Verification</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-3xl mx-auto">
          {t.home.hero}
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          {t.home.heroSub}
        </p>

        {/* Trust strip */}
        <div className="max-w-2xl mx-auto py-2.5 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 shadow-xs">
          <ShieldCheck size={18} className="text-emerald-700 shrink-0" />
          <span>{t.home.trustStrip}</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/khoj"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl saffron-gradient text-white font-semibold text-sm shadow-md hover:opacity-95 transition-all"
          >
            <Search size={17} />
            <span>{t.home.ctaKhoj}</span>
          </Link>
          <Link
            to="/parakh"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold text-sm shadow-xs hover:bg-slate-50 transition-all"
          >
            <ShieldAlert size={17} className="text-orange-600" />
            <span>{t.home.ctaParakh}</span>
          </Link>
          <Link
            to="/complaints"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold text-sm shadow-xs hover:bg-slate-50 transition-all"
          >
            <AlertOctagon size={17} className="text-rose-600" />
            <span>{t.home.ctaComplaints}</span>
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold text-sm shadow-xs hover:bg-slate-50 transition-all"
          >
            <BarChart2 size={17} className="text-blue-600" />
            <span>{t.home.ctaDashboard}</span>
          </Link>
        </div>
      </section>

      {/* 4 Feature Module Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module 1: Khoj */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-orange-300 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-lg">
              🔍
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {lang === 'hi' ? 'खोज (Khoj) — योजना अन्वेषक' : 'Khoj (खोज) — Scheme Finder'}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {lang === 'hi'
                ? 'अपनी स्थिति बताएं या दस्तावेज़ फोटो अपलोड करें। हमारा नियम इंजन आपकी पात्रता जाँचेगा और समयसीमा, आधिकारिक लिंक व नज़दीकी योजनाएं दिखाएगा।'
                : 'Describe your situation or upload a document photo. Pure Python logic tests your eligibility, surfacing verified welfare schemes with deadlines and official portal links.'}
            </p>
          </div>
          <Link
            to="/khoj"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700"
          >
            <span>{lang === 'hi' ? 'योजनाएं खोजें' : 'Start exploring schemes'}</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Module 2: Parakh */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
              🛡️
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {lang === 'hi' ? 'परख (Parakh) — दावा एवं आदेश विश्लेषक' : 'Parakh (परख) — Claim Checker & Notice Simplifier'}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {lang === 'hi'
                ? 'संदिग्ध WhatsApp संदेशों की सरकारी डोमेन व PIB स्रोतों से पुष्टि करें। जटिल सरकारी आदेशों को सरल हिंदी में समझें और बोलकर सुनें।'
                : 'Fact-check viral WhatsApp scheme claims against official .gov.in records. Simplify dense bureaucratic gazette orders into plain language action items with read-aloud support.'}
            </p>
          </div>
          <Link
            to="/parakh"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            <span>{lang === 'hi' ? 'दावा या परिपत्र जांचें' : 'Verify claim or notice'}</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Module 3: Complaints */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-rose-300 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-lg">
              📋
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {lang === 'hi' ? 'शिकायतें (Complaints) — नागरिक शिकायत निवारण' : 'Complaints (शिकायतें) — Civic Grievances'}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {lang === 'hi'
                ? 'सड़क, पानी, कचरा या बिजली की समस्या बताएं। संबंधित विभाग के नाम औपचारिक प्रशासनिक शिकायत पत्र प्रारूप तुरंत पाएं और समाधान ट्रैक करें।'
                : 'Report civic issues like potholes, water cuts, or sanitation problems. Get formal petitions drafted for the competent authority with duplicate detection and status tracking.'}
            </p>
          </div>
          <Link
            to="/complaints"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-rose-600 hover:text-rose-700"
          >
            <span>{lang === 'hi' ? 'शिकायत दर्ज करें' : 'Draft & file complaint'}</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Module 4: Budget / Dashboard */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
              📊
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {lang === 'hi' ? 'बजट एवं प्रभाव (Budget & Impact) — सार्वजनिक व्यय' : 'Budget & Impact — Public Spending Transparency'}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {lang === 'hi'
                ? 'सरकारी बजट आवंटन, मंत्रालयों के खर्च और वार्षिक वृद्धि का पारदर्शी विश्लेषण। सीधे सवाल पूछें और गणना-समर्थित उत्तर प्राप्त करें।'
                : 'Explore real budgetary allocations, ministry spending, and year-over-year trends computed with pandas. Ask direct questions with numbers verified by code.'}
            </p>
          </div>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            <span>{lang === 'hi' ? 'व्यय विश्लेषण देखें' : 'View spending & metrics'}</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Module 5: Citizen Tools (5-in-1 Civic Suite) */}
        <div className="md:col-span-2 bg-gradient-to-r from-orange-50/70 via-amber-50/50 to-emerald-50/70 border border-orange-200 rounded-2xl p-6 shadow-sm hover:border-orange-400 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🛠️</span>
              <h2 className="text-xl font-bold text-slate-900">
                {lang === 'hi' ? 'नागरिक अधिकार एवं सुविधा टूलकिट (5-in-1)' : 'Citizen Civic Toolkit (5-in-1)'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-orange-600 text-white font-bold text-[10px] uppercase tracking-wider">
                Essential
              </span>
            </div>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              {lang === 'hi'
                ? 'दस्तावेज़ नाम व वैधता परीक्षक, सीएससी आधिकारिक दर सूची (दलाली रोकथाम), अस्वीकृति कोड समाधान (PFMS/NPCI), 1-क्लिक आरटीआई (RTI) प्रारूपक और डीबीटी बैंक खाता तत्परता जांच।'
                : 'Document Name & Expiry Auditor, Official CSC Rate Card (anti-overcharging), Rejection Decrypter (PFMS/NPCI), 1-Click RTI Escalator, and DBT Bank Health Check.'}
            </p>
          </div>
          <Link
            to="/tools"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <span>{lang === 'hi' ? 'टूलकिट खोलें' : 'Open Civic Toolkit'}</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-slate-100/70 border border-slate-200/80 rounded-2xl p-8 space-y-6">
        <h3 className="text-lg font-bold text-slate-900 text-center uppercase tracking-wider text-xs">
          {t.home.how}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-600 text-white font-bold text-sm mb-1">
              1
            </div>
            <h4 className="font-bold text-slate-800 text-sm">{t.home.step1}</h4>
            <p className="text-xs text-slate-500 leading-relaxed">{t.home.step1d}</p>
          </div>
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-700 text-white font-bold text-sm mb-1">
              2
            </div>
            <h4 className="font-bold text-slate-800 text-sm">{t.home.step2}</h4>
            <p className="text-xs text-slate-500 leading-relaxed">{t.home.step2d}</p>
          </div>
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm mb-1">
              3
            </div>
            <h4 className="font-bold text-slate-800 text-sm">{t.home.step3}</h4>
            <p className="text-xs text-slate-500 leading-relaxed">{t.home.step3d}</p>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <Disclaimer />
    </div>
  )
}
