import { useState, useMemo } from 'react'
import { useActivityStore } from '../stores/activityStore'
import type { Sport } from '../types/garmin'
import ActivityCard from '../components/ActivityCard'

const SPORTS: { value: Sport | 'all'; label: string }[] = [
  { value: 'all',      label: 'Todos'    },
  { value: 'running',  label: '🏃 Running' },
  { value: 'cycling',  label: '🚴 Ciclismo'},
  { value: 'swimming', label: '🏊 Natación'},
  { value: 'other',    label: 'Otros'    },
]

export default function Activities() {
  const activities = useActivityStore(s => s.activities)
  const [sportFilter, setSportFilter] = useState<Sport | 'all'>('all')
  const [yearFilter, setYearFilter]   = useState<string>('all')
  const [page, setPage]               = useState(0)
  const PAGE_SIZE = 25

  const years = useMemo(() => {
    const ys = new Set(activities.map(a => a.startTime.slice(0, 4)))
    return ['all', ...Array.from(ys).sort().reverse()]
  }, [activities])

  const filtered = useMemo(() =>
    activities.filter(a => {
      if (sportFilter !== 'all' && a.sport !== sportFilter) return false
      if (yearFilter !== 'all' && !a.startTime.startsWith(yearFilter)) return false
      return true
    }),
    [activities, sportFilter, yearFilter]
  )

  const paginated = filtered.slice(0, (page + 1) * PAGE_SIZE)
  const hasMore = paginated.length < filtered.length

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Actividades</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{filtered.length} resultados</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 gap-0.5">
          {SPORTS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setSportFilter(value); setPage(0) }}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                sportFilter === value
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          value={yearFilter}
          onChange={e => { setYearFilter(e.target.value); setPage(0) }}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-[12px] text-zinc-400 hover:border-zinc-700 transition-colors"
        >
          {years.map(y => (
            <option key={y} value={y}>{y === 'all' ? 'Todos los años' : y}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="space-y-1.5">
        {paginated.map(a => <ActivityCard key={a.id} activity={a} />)}
      </div>

      {hasMore && (
        <button
          onClick={() => setPage(p => p + 1)}
          className="mt-4 w-full py-3 rounded-xl border border-zinc-800 text-zinc-500 hover:text-zinc-200 hover:border-zinc-700 transition-colors text-sm font-medium"
        >
          Cargar más ({filtered.length - paginated.length} más)
        </button>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-zinc-600 text-sm">
          Sin actividades con estos filtros.
        </div>
      )}
    </div>
  )
}
