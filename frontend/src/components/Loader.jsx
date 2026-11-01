import { useLang } from '../i18n/strings'

export default function Loader({ message }) {
  const { t } = useLang()
  const displayMsg = message || t.khoj.loading

  return (
    <div className="w-full py-8 space-y-4">
      <div className="flex items-center justify-center gap-2 text-sm text-slate-500 font-medium animate-pulse">
        <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <span>{displayMsg}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="border border-slate-200 bg-white rounded-xl p-5 shadow-sm space-y-3 animate-pulse"
          >
            <div className="flex justify-between items-center">
              <div className="h-5 bg-slate-200 rounded w-2/3"></div>
              <div className="h-5 bg-slate-100 rounded-full w-20"></div>
            </div>
            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
            <div className="h-3 bg-slate-100 rounded w-full"></div>
            <div className="h-3 bg-slate-100 rounded w-4/5"></div>
            <div className="h-8 bg-slate-100 rounded-lg w-full mt-4"></div>
          </div>
        ))}
      </div>
    </div>
  )
}
