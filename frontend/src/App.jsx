import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Khoj from './pages/Khoj'
import Parakh from './pages/Parakh'
import Complaints from './pages/Complaints'
import Dashboard from './pages/Dashboard'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/khoj" element={<Khoj />} />
          <Route path="/parakh" element={<Parakh />} />
          <Route path="/complaints" element={<Complaints />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 no-print">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>
            🇮🇳 <span className="font-semibold text-slate-700">YojanaLens (योजनालेंस)</span> — Find every scheme you deserve. Verified at the source.
          </p>
          <div className="flex gap-4">
            <a href="https://pib.gov.in" target="_blank" rel="noopener noreferrer" className="hover:text-slate-800">
              PIB Fact Check
            </a>
            <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer" className="hover:text-slate-800">
              Cybercrime (1930)
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
