import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Khoj from './pages/Khoj'
import Parakh from './pages/Parakh'
import Complaints from './pages/Complaints'
import Tools from './pages/Tools'
import Dashboard from './pages/Dashboard'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-page-bg text-navy">
      <Navbar />

      <main id="main-content" className="flex-1 pb-20 md:pb-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/khoj" element={<Khoj />} />
          <Route path="/parakh" element={<Parakh />} />
          <Route path="/complaints" element={<Complaints />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>

      <footer className="border-t border-border bg-surface py-6 sm:py-8 no-print mb-16 md:mb-0">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <p className="flex items-center gap-1.5 text-center sm:text-left">
            <span>🇮🇳</span>
            <span>
              <span className="font-bold text-navy">YojanaLens (योजनालेंस)</span> — Find every scheme you deserve. Verified at official sources.
            </span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <a
              href="https://pib.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-saffron transition-colors"
            >
              PIB Fact Check
            </a>
            <span className="text-border">•</span>
            <a
              href="https://cybercrime.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-saffron transition-colors"
            >
              National Cybercrime (1930)
            </a>
            <span className="text-border">•</span>
            <span className="text-muted/80">
              Open Civic Tech Prototype
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
