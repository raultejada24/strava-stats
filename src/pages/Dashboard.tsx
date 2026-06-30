import { Link } from 'react-router-dom'
import { useActivityStore } from '../stores/activityStore'
import { formatDuration, formatPace, sportIcon, sportColor } from '../utils/formatters'
import { daysAgo } from '../utils/date'
import { useFitnessHistory } from '../hooks/useFitnessHistory'
import { useWeekComparison } from '../hooks/useWeekComparison'
import { useSportVolume } from '../hooks/useSportVolume'
import { useTrainingStreak } from '../hooks/useTrainingStreak'
import { useZoneDistribution } from '../hooks/useZoneDistribution'
import { useWeeklyLoad } from '../hooks/useWeeklyLoad'
import FormBadge from '../components/FormBadge'
import DeltaBadge from '../components/DeltaBadge'
import InfoTooltip from '../components/InfoTooltip'
import {
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts'

// ─── Loading / Empty ──────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-zinc-500 text-sm">Cargando...</div>
    </div>
  )
}

function EmptyScreen() {
  return (
    <div className="flex-1 p-8 max-w-lg">
      <div className="border border-zinc-800 rounded-xl p-6">
        <h2 className="text-zinc-100 font-semibold text-base mb-2">Sin datos</h2>
        <p className="text-zinc-500 text-sm mb-4">Procesa tu export de Strava para empezar.</p>
        <div className="bg-zinc-900 rounded-lg p-4 font-mono text-xs text-zinc-400 space-y-1">
          <div>cp .env.example .env</div>
          <div>cd fetch && pip install -r requirements.txt</div>
          <div>python sync.py --export export_*.zip</div>
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const activities = useActivityStore(s => s.activities)
  const stats = useActivityStore(s => s.stats)
  const loading = useActivityStore(s => s.loading)
  const error = useActivityStore(s => s.error)

  const { current: fitness, sparkPoints } = useFitnessHistory()
  const { current: week, previous: lastWeek } = useWeekComparison()
  const { bySport: sportHours, totalHours } = useSportVolume(30)
  const streak = useTrainingStreak()
  const { slices: zoneSlices, isAerobicFocused } = useZoneDistribution(30)
  const weeklyLoad = useWeeklyLoad(16)

  if (loading) return <LoadingScreen />
  if (error || activities.length === 0) return <EmptyScreen />

  const tsb = fitness?.tsb ?? 0
  const ctl = fitness?.ctl ?? 0
  const atl = fitness?.atl ?? 0
  const maxWeekTSS = Math.max(...weeklyLoad.map(w => w.tss), 1)
  const vo2 = stats?.vo2maxHistory?.at(-1)?.value ?? null

  const tsbColor = tsb > 10 ? '#4ade80' : tsb > -5 ? '#60a5fa' : tsb > -15 ? '#fbbf24' : tsb > -25 ? '#fb923c' : '#f87171'

  return (
    <div className="flex-1 overflow-y-auto">

      {/* ── Stat strip ──────────────────────────────────────────────────── */}
      <div className="border-b border-zinc-800 px-6 py-5">
        <div className="flex items-start gap-8 flex-wrap">

          {/* VO2Max */}
          <StatPill
            tooltipKey="vo2max"
            label="VO2 Máx"
            value={vo2 != null ? vo2.toFixed(1) : '—'}
            unit={vo2 != null ? 'ml/kg/min' : 'sin datos'}
            color="#a78bfa"
          />

          {/* Fitness CTL */}
          <StatPill
            tooltipKey="ctl"
            label="Fitness"
            value={Math.round(ctl)}
            unit="CTL"
            color="#818cf8"
          />

          {/* Fatiga ATL */}
          <StatPill
            tooltipKey="atl"
            label="Fatiga"
            value={Math.round(atl)}
            unit="ATL"
            color="#fb923c"
          />

          {/* Forma TSB */}
          <div className="flex flex-col gap-1">
            <InfoTooltip metricKey="tsb" side="bottom">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Forma</span>
            </InfoTooltip>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums leading-none" style={{ color: tsbColor }}>
                {tsb > 0 ? '+' : ''}{Math.round(tsb)}
              </span>
              <span className="text-xs text-zinc-600">TSB</span>
            </div>
            <FormBadge tsb={tsb} />
          </div>

          {/* Streak */}
          {streak > 1 && (
            <div className="flex flex-col gap-1">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Racha</div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tabular-nums leading-none text-amber-400">{streak}</span>
                <span className="text-xs text-zinc-600">días 🔥</span>
              </div>
              <div className="text-[10px] text-zinc-600">activos</div>
            </div>
          )}

          {/* Total acts */}
          <div className="ml-auto text-right self-end">
            <div className="text-xs text-zinc-600">
              {stats?.totalActivities ?? activities.length} actividades
            </div>
            {stats?.syncedAt && (
              <div className="text-[11px] text-zinc-700 mt-0.5">
                Sync {new Date(stats.syncedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-6">

        {/* ── Fitness trend sparkline ──────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
              Evolución · últimos 60 días
            </div>
            <Link to="/fitness" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Ver completo →
            </Link>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkPoints} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gCTL" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gATL" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fb923c" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <Tooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 11 }}
                    formatter={(v: unknown, n: unknown) => [String(v), String(n)]}
                  />
                  <Area type="monotone" dataKey="ctl" name="Fitness" stroke="#818cf8" strokeWidth={2} fill="url(#gCTL)" dot={false} />
                  <Area type="monotone" dataKey="atl" name="Fatiga" stroke="#fb923c" strokeWidth={1.5} fill="url(#gATL)" dot={false} strokeDasharray="3 2" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-2">
              <LegendDot color="#818cf8" label="Fitness (CTL)" />
              <LegendDot color="#fb923c" label="Fatiga (ATL)" />
            </div>
          </div>
        </section>

        {/* ── Week comparison + Sport volume ───────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <SectionLabel>Esta semana vs anterior</SectionLabel>
            <div className="space-y-3 mt-4">
              {[
                { label: 'Sesiones',  value: week.count,           prev: lastWeek.count,           fmt: (v: number) => String(v),               unit: '' },
                { label: 'Distancia', value: week.distance,        prev: lastWeek.distance,        fmt: (v: number) => `${v.toFixed(1)} km`,    unit: 'km' },
                { label: 'Tiempo',    value: week.duration / 3600, prev: lastWeek.duration / 3600, fmt: (v: number) => `${v.toFixed(1)} h`,     unit: 'h' },
                { label: 'Carga',     value: week.tss,             prev: lastWeek.tss,             fmt: (v: number) => `${Math.round(v)} TSS`,  unit: '' },
              ].map(({ label, value, prev, fmt }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 w-20">{label}</span>
                  <span className="text-sm font-semibold tabular-nums text-zinc-100">{fmt(value)}</span>
                  <DeltaBadge value={value - prev} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <SectionLabel>Volumen · últimos 30 días</SectionLabel>
            <div className="space-y-3 mt-4">
              {([
                { sport: 'running' as const,  label: 'Running',  emoji: '🏃', color: '#4ade80' },
                { sport: 'cycling' as const,  label: 'Ciclismo', emoji: '🚴', color: '#60a5fa' },
                { sport: 'swimming' as const, label: 'Natación', emoji: '🏊', color: '#22d3ee' },
              ]).map(({ sport, label, emoji, color }) => {
                const h = sportHours[sport].hours
                const pct = totalHours > 0 ? h / totalHours : 0
                return (
                  <div key={sport}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-500">{emoji} {label}</span>
                      <span className="text-xs font-semibold tabular-nums" style={{ color }}>{h.toFixed(1)}h</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.round(pct * 100)}%`, background: color }}
                      />
                    </div>
                  </div>
                )
              })}
              <div className="pt-1 flex items-center justify-between">
                <span className="text-xs text-zinc-600">Total</span>
                <span className="text-xs font-semibold text-zinc-400">{totalHours.toFixed(1)} h</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Zone distribution ─────────────────────────────────────────────── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <SectionLabel>Zonas FC · últimos 30 días</SectionLabel>
              <p className="text-xs mt-1" style={{ color: isAerobicFocused ? '#4ade80' : '#fbbf24' }}>
                {isAerobicFocused ? 'Base aeróbica sólida (Z1+Z2 >60%)' : 'Añade más trabajo en Z1–Z2'}
              </p>
            </div>
            <Link to="/zones" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Ver análisis →
            </Link>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={zoneSlices} margin={{ top: 0, right: 24, bottom: 0, left: 24 }}>
                <PolarGrid stroke="#27272a" />
                <PolarAngleAxis dataKey="zone" tick={{ fill: '#52525b', fontSize: 10 }} />
                <Radar dataKey="pct" stroke="#818cf8" fill="#818cf8" fillOpacity={0.15} strokeWidth={1.5} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 11 }}
                  formatter={(v: unknown) => [`${v}%`, 'Tiempo']}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
            {zoneSlices.map(z => (
              <span key={z.zone} className="text-[11px]" style={{ color: z.color }}>{z.zone} {z.pct}%</span>
            ))}
          </div>
        </div>

        {/* ── Weekly TSS bars ───────────────────────────────────────────────── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>Carga semanal TSS · 16 semanas</SectionLabel>
            <Link to="/fitness" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Fitness →
            </Link>
          </div>
          <div className="flex items-end gap-1 h-20">
            {weeklyLoad.map((w, i) => {
              const isCurrent = i === weeklyLoad.length - 1
              return (
                <div key={w.week} className="flex-1 flex flex-col items-center" title={`${w.week}: ${w.tss} TSS`}>
                  <div
                    className="w-full rounded-t-sm transition-all"
                    style={{
                      height: `${Math.max((w.tss / maxWeekTSS) * 100, 2)}%`,
                      background: isCurrent ? '#818cf8' : '#27272a',
                    }}
                  />
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-zinc-700">{weeklyLoad[0]?.week}</span>
            <span className="text-[11px] text-indigo-400 font-medium">
              {week.tss > 0 ? `Esta semana: ${Math.round(week.tss)} TSS` : 'Esta semana'}
            </span>
          </div>
        </div>

        {/* ── Recent activities ────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Últimas actividades</SectionLabel>
            <Link to="/activities" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Ver todas →
            </Link>
          </div>
          <div className="space-y-1.5">
            {activities.slice(0, 7).map(a => {
              const color = sportColor(a.sport)
              return (
                <Link
                  key={a.id}
                  to={`/activity/${a.id}`}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-700 transition-all group"
                >
                  <div className="w-1 h-7 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-base shrink-0">{sportIcon(a.sport)}</span>

                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-zinc-200 truncate group-hover:text-white">{a.title}</div>
                    <div className="text-[11px] text-zinc-600">
                      {daysAgo(a.startTime) === 0 ? 'Hoy' : daysAgo(a.startTime) === 1 ? 'Ayer' : `Hace ${daysAgo(a.startTime)}d`}
                    </div>
                  </div>

                  <div className="flex items-center gap-5 shrink-0">
                    {a.distance > 0 && (
                      <div className="text-right">
                        <div className="text-[13px] font-semibold tabular-nums text-zinc-200">{a.distance.toFixed(1)}<span className="text-[10px] text-zinc-600 ml-0.5">km</span></div>
                        {a.avgPace && <div className="text-[10px] text-zinc-500">{formatPace(a.avgPace)}</div>}
                        {a.avgSpeed && !a.avgPace && <div className="text-[10px] text-zinc-500">{a.avgSpeed} km/h</div>}
                      </div>
                    )}
                    <div className="text-right">
                      <div className="text-[13px] font-semibold tabular-nums text-zinc-200">{formatDuration(a.duration)}</div>
                      {a.avgHR > 0 && <div className="text-[10px] text-zinc-500">{a.avgHR} bpm</div>}
                    </div>
                    {a.tss != null && (
                      <div className="w-10 text-right">
                        <div className="text-[13px] font-bold tabular-nums" style={{ color }}>{Math.round(a.tss)}</div>
                        <div className="text-[10px] text-zinc-600">TSS</div>
                      </div>
                    )}
                    <div className="text-zinc-700 group-hover:text-zinc-500 text-xs">→</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        <div className="h-4" />
      </div>
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function StatPill({ label, value, unit, color, tooltipKey }: {
  label: string; value: string | number; unit: string; color: string; tooltipKey: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <InfoTooltip metricKey={tooltipKey} side="bottom">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">{label}</span>
      </InfoTooltip>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tabular-nums leading-none" style={{ color }}>{value}</span>
        {unit && <span className="text-xs text-zinc-600">{unit}</span>}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">{children}</div>
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-zinc-500">
      <span className="w-3 h-0.5 rounded inline-block" style={{ background: color }} />
      {label}
    </span>
  )
}
