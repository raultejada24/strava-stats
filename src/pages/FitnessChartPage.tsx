import { useMemo, useState } from 'react'
import { useActivityStore } from '../stores/activityStore'
import { calculateFitnessHistory } from '../utils/calculations'
import { formatShortDate } from '../utils/formatters'
import InfoTooltip from '../components/InfoTooltip'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'

const RANGES = [
  { label: '3m',  days: 90   },
  { label: '6m',  days: 180  },
  { label: '1a',  days: 365  },
  { label: 'Todo', days: Infinity },
]

export default function FitnessChartPage() {
  const activities = useActivityStore(s => s.activities)
  const settings   = useActivityStore(s => s.settings)
  const [range, setRange] = useState(180)

  const fitnessHistory = useMemo(() => calculateFitnessHistory(activities, settings), [activities, settings])

  const data = useMemo(() => {
    if (range === Infinity) return fitnessHistory
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - range)
    const cutStr = cutoff.toISOString().slice(0, 10)
    return fitnessHistory.filter(p => p.date >= cutStr)
  }, [fitnessHistory, range])

  const current = fitnessHistory[fitnessHistory.length - 1]

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Fitness &amp; Forma</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Modelo de carga CTL / ATL / TSB</p>
        </div>
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 gap-0.5">
          {RANGES.map(r => (
            <button
              key={r.days}
              onClick={() => setRange(r.days)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                range === r.days ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Current metrics */}
      {current && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard
            tooltipKey="ctl"
            label="Fitness (CTL)"
            value={Math.round(current.ctl)}
            sub="Carga crónica 42 días"
            color="#818cf8"
          />
          <StatCard
            tooltipKey="atl"
            label="Fatiga (ATL)"
            value={Math.round(current.atl)}
            sub="Carga aguda 7 días"
            color="#fb923c"
          />
          <StatCard
            tooltipKey="tsb"
            label="Forma (TSB)"
            value={(current.tsb > 0 ? '+' : '') + Math.round(current.tsb)}
            sub={
              current.tsb > 5   ? 'Descansado'
              : current.tsb > -5  ? 'Óptimo'
              : current.tsb > -20 ? 'Fatigado'
              : 'Muy fatigado'
            }
            color={
              current.tsb > 5   ? '#4ade80'
              : current.tsb < -20 ? '#f87171'
              : current.tsb < -10 ? '#fb923c'
              : '#fbbf24'
            }
          />
        </div>
      )}

      {/* Chart */}
      {data.length > 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#52525b', fontSize: 11 }}
                tickFormatter={d => formatShortDate(d)}
                interval={Math.floor(data.length / 8)}
              />
              <YAxis tick={{ fill: '#52525b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#a1a1aa' }}
                formatter={(value: unknown, name: unknown) => [Math.round(Number(value) * 10) / 10, String(name)]}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#71717a' }} />
              <ReferenceLine y={0} stroke="#3f3f46" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="ctl" name="Fitness (CTL)" stroke="#818cf8" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="atl" name="Fatiga (ATL)"  stroke="#fb923c" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="tsb" name="Forma (TSB)"   stroke="#4ade80" dot={false} strokeWidth={1.5} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-center py-16 text-zinc-600 text-sm">Sin datos suficientes.</div>
      )}

      {/* Legend */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-500 space-y-1.5">
        <p><span className="text-indigo-400 font-medium">Fitness (CTL)</span> — Media exponencial de 42 días del TSS diario.</p>
        <p><span className="text-orange-400 font-medium">Fatiga (ATL)</span> — Media exponencial de 7 días. Fatiga acumulada reciente.</p>
        <p><span className="text-green-400 font-medium">Forma (TSB)</span> = CTL − ATL. Positivo = descansado. Zona óptima: −10 a +5.</p>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color, tooltipKey }: {
  label: string; value: string | number; sub: string; color: string; tooltipKey: string
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <InfoTooltip metricKey={tooltipKey} side="bottom">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">{label}</span>
      </InfoTooltip>
      <div className="text-3xl font-bold tabular-nums mt-2 mb-1" style={{ color }}>{value}</div>
      <div className="text-xs text-zinc-600">{sub}</div>
    </div>
  )
}
