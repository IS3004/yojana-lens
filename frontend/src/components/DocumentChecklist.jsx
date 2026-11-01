import { useState } from 'react'
import { CheckSquare, Square } from 'lucide-react'
import { useLang } from '../i18n/strings'

export default function DocumentChecklist({ documents = [] }) {
  const { t } = useLang()
  const [checked, setChecked] = useState({})

  if (!documents.length) return null

  const toggle = (doc) => {
    setChecked((prev) => ({ ...prev, [doc]: !prev[doc] }))
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
        <span>📋</span> {t.khoj.docsChecklist}
      </h4>
      <ul className="space-y-1.5">
        {documents.map((doc, idx) => {
          const isDone = !!checked[doc]
          return (
            <li
              key={idx}
              onClick={() => toggle(doc)}
              className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer select-none hover:text-slate-900 transition-colors"
            >
              <span className="mt-0.5 text-slate-400 hover:text-slate-600 transition-colors">
                {isDone ? (
                  <CheckSquare size={14} className="text-emerald-600" />
                ) : (
                  <Square size={14} />
                )}
              </span>
              <span className={isDone ? 'line-through text-slate-400' : ''}>
                {doc}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
