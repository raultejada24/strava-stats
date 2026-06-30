import { useMemo, useState } from 'react'
import { useActivityStore } from '../stores/activityStore'
import type { Sport } from '../types/garmin'
import { estimateZonesFromHR, HR_ZONE_DEFS } from '../utils/calculations'
import { formatDuration } from '../utils/formatters'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const SPORT_FILTERS: { value: Sport | 'all'; label: string }[] = [
  { value: 'all',      label: 'Todos'    },
  { value: 'running',  label: '🏃'       },
  { value: 'cycling',  label: '🚴'       },
  { value: 'swimming', label: '🏊'       },
]

export default function ZoneAnalysis() {
  const activities = useActivityStore(s => s.activities)
  const settings   = useActivityStore(s => s.settings)
  const [sport, setSport] = useState<Sport | 'all'>('all')

  const filtered = useMemo(() =>
    activities.filter(a => sport === 'all' || a.sport === sport),
    [activities, sport]
  )

  const zoneSeconds = useMemo(() => {
    const totals: number[] = [0, 0, 0, 0, 0]
    for (const act of filtered) {
      const zones = estimateZonesFromHR(act.avgHR, act.duration, settings.maxHR)
      zones.forEach(z => { totals[z.zone - 1] += z.seconds })
    }
    return totals
  }, [filtered, settings.maxHR])

  const totalSeconds = zoneSeconds.reduce((a, b) => a + b, 0)

  const weeklyZoneData = useMemo(() => {
    const weeks: Record<string, number[]> = {}
    for (const act of filtered) {
      const d = new Date(act.startTime)
      const day = d.getDay()
      const diff = day === 0 ? -6 : 1 - day
      const monday = new Date(d)
      monday.setDate(d.getDate() + diff)
      const weekKey = monday.toISOString().slice(0, 10)
      if (!weeks[weekKey]) weeks[weekKey] = [0, 0, 0, 0, 0]
      const zones = estimateZonesFromHR(act.avgHR, act.duration, settings.maxHR)
      zones.forEach(z => { weeks[weekKey][z.zone - 1] += z.seconds / 3600 })
    }
    return Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-24)
      .map(([date, zones]) => ({
        date: date.slice(5),
        z1: +zones[0].toFixed(2), z2: +zones[1].toFixed(2),
        z3: +zones[2].toFixed(2), z4: +zones[3].toFixed(2),
        z5: +zones[4].toFixed(2),
      }))
  }, [filtered, settings.maxHR])

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Zonas FC</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Distribución del tiempo por zonas de frecuencia cardíaca</p>
        </div>
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 gap-0.5">
          {SPORT_FILTERS.map(s => (
            <button key={s.value} onClick={() => setSport(s.value)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                sport === s.value ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* Zone bars */}
      <div className="space-y-3 mb-8">
        {HR_ZONE_DEFS.map((def, i) => {
          const pct = totalSeconds > 0 ? (zoneSeconds[i] / totalSeconds) * 100 : 0
          return (
            <div key={def.zone} className="flex items-center gap-4">
              <div className="w-6 text-xs font-semibold" style={{ color: def.color }}>Z{def.zone}</div>
              <div className="w-24 text-xs text-zinc-500">{def.name}</div>
              <div className="flex-1 bg-zinc-800 rounded-full h-2">
                <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: def.color }} />
              </div>
              <div className="w-16 text-xs text-zinc-400 text-right font-mono tabular-nums">{formatDuration(zoneSeconds[i])}</div>
              <div className="w-10 text-xs text-zinc-600 text-right tabular-nums">{pct.toFixed(0)}%</div>
            </div>
          )
        })}
      </div>

      {weeklyZoneData.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-4">
            Distribución semanal · últimas 24 semanas
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklyZoneData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fill: '#52525b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#52525b', fontSize: 10 }} unit="h" />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#a1a1aa' }}
                formatter={(v: unknown) => [`${Number(v).toFixed(1)}h`]}
              />
              {HR_ZONE_DEFS.map(def => (
                <Bar key={def.zone} dataKey={`z${def.zone}`} name={def.name} stackId="a" fill={def.color} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="mt-4 text-xs text-zinc-700">
        Zonas estimadas por FC media y FCmax configurada ({settings.maxHR} bpm).
      </p>
    </div>
  )
}
