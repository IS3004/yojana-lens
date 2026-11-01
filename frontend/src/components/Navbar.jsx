import { Link, NavLink } from 'react-router-dom'
import { useLang } from '../i18n/strings'
import { Globe, BarChart2, Search, ShieldCheck, AlertOctagon, Wrench } from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const { lang, setLang, t } = useLang()
  const [open, setOpen] = useState(false)

  const links = [
    { to: '/', label: t.nav.home },
    { to: '/khoj', label: t.nav.khoj, icon: <Search size={15} /> },
    { to: '/parakh', label: t.nav.parakh, icon: <ShieldCheck size={15} /> },
    { to: '/complaints', label: t.nav.complaints || 'Complaints', icon: <AlertOctagon size={15} /> },
    { to: '/tools', label: t.nav.tools || 'Tools', icon: <Wrench size={15} /> },
    { to: '/dashboard', label: t.nav.dashboard, icon: <BarChart2 size={15} /> },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm no-print">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 font-bold text-lg text-slate-800">
          <span className="text-2xl">🔍</span>
          <span>
            <span className="text-orange-600">Yojana</span>
            <span className="text-green-700">Lens</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-orange-50 text-orange-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </div>

        {/* Lang toggle + mobile menu */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Toggle language"
          >
            <Globe size={13} />
            {lang === 'en' ? 'हिं' : 'EN'}
          </button>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-1.5 rounded text-slate-600 hover:bg-slate-100"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            <div className="w-5 h-0.5 bg-current mb-1 transition-all" />
            <div className="w-5 h-0.5 bg-current mb-1" />
            <div className="w-5 h-0.5 bg-current" />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden bg-white border-t border-slate-100 px-4 pb-3">
          {links.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium mt-1 ${
                  isActive ? 'bg-orange-50 text-orange-700' : 'text-slate-700 hover:bg-slate-50'
                }`
              }
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  )
}
