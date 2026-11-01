import { Link, NavLink, useLocation } from 'react-router-dom'
import { useLang } from '../i18n/strings'
import { Globe, BarChart3, Search, ShieldCheck, FileText, Wrench, Type } from 'lucide-react'
import { useState, useEffect } from 'react'

const FONT_SIZES = [16, 18, 20, 22]

export default function Navbar() {
  const { lang, setLang, t } = useLang()
  const location = useLocation()

  // Font size scaling (16 -> 18 -> 20 -> 22px)
  const [sizeIdx, setSizeIdx] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('yl_font_size')
      const parsed = saved ? parseInt(saved, 10) : 16
      const idx = FONT_SIZES.indexOf(parsed)
      return idx >= 0 ? idx : 0
    }
    return 0
  })

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const size = FONT_SIZES[sizeIdx]
      document.documentElement.style.fontSize = `${size}px`
      if (size !== 16) {
        document.documentElement.setAttribute('data-scaled', 'true')
      } else {
        document.documentElement.removeAttribute('data-scaled')
      }
    }
  }, [sizeIdx])

  const cycleFontSize = () => {
    const nextIdx = (sizeIdx + 1) % FONT_SIZES.length
    setSizeIdx(nextIdx)
    localStorage.setItem('yl_font_size', FONT_SIZES[nextIdx].toString())
  }

  // Desktop navigation items
  const navLinks = [
    { to: '/', label: t.nav.home },
    { to: '/khoj', label: t.nav.khoj, icon: <Search size={16} /> },
    { to: '/parakh', label: t.nav.parakh, icon: <ShieldCheck size={16} /> },
    { to: '/complaints', label: t.nav.complaints || 'Complaints', icon: <FileText size={16} /> },
    { to: '/tools', label: t.nav.tools || 'Tools', icon: <Wrench size={16} /> },
    { to: '/dashboard', label: t.nav.dashboard, icon: <BarChart3 size={16} /> },
  ]

  // Mobile bottom bar items (5 primary tabs)
  const mobileTabs = [
    { to: '/khoj', label: lang === 'hi' ? 'खोज' : 'Khoj', icon: Search },
    { to: '/parakh', label: lang === 'hi' ? 'परख' : 'Parakh', icon: ShieldCheck },
    { to: '/complaints', label: lang === 'hi' ? 'शिकायत' : 'Complaints', icon: FileText },
    { to: '/tools', label: lang === 'hi' ? 'टूलकिट' : 'Tools', icon: Wrench },
    { to: '/dashboard', label: lang === 'hi' ? 'डैशबोर्ड' : 'Impact', icon: BarChart3 },
  ]

  return (
    <>
      {/* Skip to Content for Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-saffron focus:text-white focus:rounded-xl focus:shadow-lg focus:font-bold focus:text-sm focus:outline-none"
      >
        Skip to content
      </a>

      {/* Main Top Navigation Bar (Navy Background #0F2A4A) */}
      <header className="sticky top-0 z-50 bg-navy text-white border-b border-navy-dark shadow-sm no-print">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 text-white hover:opacity-90 transition-opacity focus-visible:outline-3 focus-visible:outline-saffron focus-visible:outline-offset-2 rounded-lg"
          >
            <span className="w-8 h-8 rounded-xl bg-saffron flex items-center justify-center text-white font-black text-base shadow-xs">
              🔍
            </span>
            <div className="flex flex-col leading-none">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
                <span className="text-saffron">Yojana</span>Lens
              </span>
              <span className="text-[10px] text-slate-300 font-hindi tracking-wider">
                {lang === 'hi' ? 'योजनालेंस • जन अधिकार' : 'योजनालेंस (Civic Tech)'}
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1 h-full">
            {navLinks.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all relative h-full flex items-center cursor-pointer ${
                    isActive
                      ? 'text-saffron font-semibold border-b-2 border-saffron'
                      : 'text-slate-200 hover:text-white hover:bg-white/10 rounded-md'
                  }`
                }
              >
                {icon && <span className="shrink-0">{icon}</span>}
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right Action Controls: A+ Font Scaling & Language Toggle */}
          <div className="flex items-center gap-2">
            {/* A+ Font Size Toggle */}
            <button
              onClick={cycleFontSize}
              type="button"
              aria-label={`Toggle font size: current ${FONT_SIZES[sizeIdx]}px`}
              title={`Text size: ${FONT_SIZES[sizeIdx]}px (Click to cycle 16/18/20/22px)`}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer focus-visible:outline-3 focus-visible:outline-saffron"
            >
              <Type size={14} className="text-saffron" />
              <span>A+</span>
              <span className="text-[10px] text-slate-300 font-normal">
                {FONT_SIZES[sizeIdx]}
              </span>
            </button>

            {/* Language Toggle EN | हिन्दी */}
            <button
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              type="button"
              aria-label="Toggle language between English and Hindi"
              title="Toggle Language / भाषा बदलें"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-saffron hover:bg-saffron-hover text-white text-xs font-bold transition-all cursor-pointer shadow-xs focus-visible:outline-3 focus-visible:outline-saffron"
            >
              <Globe size={13} className="shrink-0" />
              <span>{lang === 'en' ? 'हिन्दी' : 'English'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar (Fixed at bottom on mobile, hidden on desktop) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border shadow-lg flex items-center justify-around h-16 px-1 no-print"
      >
        {mobileTabs.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all text-[11px] font-medium min-h-[48px] ${
                isActive
                  ? 'text-saffron font-bold'
                  : 'text-muted hover:text-navy'
              }`}
            >
              <div className={`p-1 rounded-full ${isActive ? 'bg-saffron-tint text-saffron' : ''}`}>
                <Icon size={20} className={isActive ? 'text-saffron' : 'text-muted'} />
              </div>
              <span className="truncate max-w-[64px] text-center leading-tight mt-0.5">{label}</span>
            </NavLink>
          )
        })}
      </nav>
    </>
  )
}
