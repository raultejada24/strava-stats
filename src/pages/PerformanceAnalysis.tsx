import { formatDuration } from '../utils/formatters'
import {
  useAerobicEfficiency, useTriathlonBalance, useCadenceData,
  useVo2maxTrend, useConsistencyHeatmap,
} from '../hooks/usePerformanceData'
import { useWeeklyLoad } from '../hooks/useWeeklyLoad'
import { useActivityStore } from '../stores/activityStore'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ScatterChart, Scatter, ReferenceLine, ReferenceArea, Cell,
} from 'recharts'

const RAMP_COLOR: Record<string, string> = { ok: '#818cf8', warn: '#fbbf24', high: '#f87171' }

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="mb-4">
        <div className="text-sm font-semibold text-zinc-200">{title}</div>
        {sub && <div className="text-xs text-zinc-500 mt-0.5">{sub}</div>}
      </div>
      {children}
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return <div className="h-48 flex items-center justify-center text-zinc-700 text-sm">{label}</div>
}

function InsightChip({ label, color }: { label: string; color: string }) {
  return (
    <div className="text-xs px-2.5 py-1 rounded-md border"
      style={{ borderColor: color + '30', background: color + '10', color }}>
      {label}
    </div>
  )
}

export default function PerformanceAnalysis() {
  const activities = useActivityStore(s => s.activities)
  const { data: efData, trendPct: efTrend } = useAerobicEfficiency()
  const balance = useTriathlonBalance(21)
  const cadenceData = useCadenceData()
  const { points: vo2Points, current: currentVo2 } = useVo2maxTrend()
  const weeklyLoad = useWeeklyLoad(16)
  const heatmap = useConsistencyHeatmap(28)

  const avgWeeklyTSS = weeklyLoad.length
    ? Math.round(weeklyLoad.slice(-8).reduce((s, w) => s + w.tss, 0) / Math.min(weeklyLoad.length, 8))
    : 0

  const vo2Label = currentVo2
    ? currentVo2 >= 60 ? 'Elite' : currentVo2 >= 55 ? 'Excelente' : currentVo2 >= 48 ? 'Buena' : currentVo2 >= 42 ? 'Moderada' : 'Mejorable'
    : null

  const insights = deriveInsights({ balance, efTrend, weeklyLoad, heatmap, cadenceData })

  if (activities.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
        Sin datos. Ejecuta el script de sync primero.
      </div>
    )
  }

  const tooltipStyle = { background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 11 }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-zinc-100">Rendimiento</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Forma física, puntos de mejora y estado actual</p>
      </div>

      {insights.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {insights.map((ins, i) => <InsightChip key={i} label={ins.text} color={ins.color} />)}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">

        {/* Aerobic Efficiency */}
        <Section
          title="Eficiencia Aeróbica"
          sub={efTrend != null ? `Running: ${efTrend > 0 ? '+' : ''}${efTrend}% en 12 meses` : 'Velocidad / FC — sube = mejor base'}
        >
          {efData.some(d => d.run || d.bike) ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={efData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" tick={{ fill: '#52525b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#52525b', fontSize: 10 }} width={36} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown, n: unknown) => [Number(v).toFixed(2), String(n)]} />
                <Line type="monotone" dataKey="run"  name="Running EF" stroke="#4ade80" dot={{ r: 3 }} strokeWidth={2} connectNulls />
                <Line type="monotone" dataKey="bike" name="Cycling EF" stroke="#60a5fa" dot={{ r: 3 }} strokeWidth={2} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          ) : <Empty label="Sin datos suficientes" />}
          <p className="text-xs text-zinc-700 mt-2">Running: km/h ÷ bpm × 100. Cycling: W ÷ bpm.</p>
        </Section>

        {/* Triathlon Balance */}
        <Section
          title="Balance Triatleta · 3 semanas"
          sub="Real vs ideal olímpico (Swim 15% / Bike 50% / Run 35%)"
        >
          <div className="space-y-4 py-2">
            {balance.map(row => {
              const color = Math.abs(row.gap) < 8 ? '#4ade80' : Math.abs(row.gap) < 15 ? '#fbbf24' : '#f87171'
              return (
                <div key={row.sport}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-400">{row.emoji} {row.sport}</span>
                    <span style={{ color }}>{row.actual}% real · {row.ideal}% ideal · {row.gap > 0 ? '+' : ''}{row.gap}pp · {row.hours}h</span>
                  </div>
                  <div className="relative h-2 bg-zinc-800 rounded-full">
                    <div className="h-2 rounded-full" style={{ width: `${Math.min(row.actual, 100)}%`, background: color }} />
                    <div className="absolute top-0 h-2 w-0.5 bg-zinc-300" style={{ left: `${row.ideal}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Section>

        {/* Cadence vs Speed */}
        <Section title="Cadencia vs Velocidad (Running)" sub="Zona verde = cadencia óptima (170–180 spm)">
          {cadenceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <ScatterChart margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="cadencia" name="Cadencia" unit=" spm" tick={{ fill: '#52525b', fontSize: 10 }} type="number" domain={['auto', 'auto']} />
                <YAxis dataKey="velocidad" name="Velocidad" unit=" km/h" tick={{ fill: '#52525b', fontSize: 10 }} width={42} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown, n: unknown) => [String(v), String(n)]} />
                <ReferenceArea x1={170} x2={180} fill="#4ade80" fillOpacity={0.06} />
                <ReferenceLine x={170} stroke="#4ade80" strokeDasharray="4 2" strokeOpacity={0.4} />
                <ReferenceLine x={180} stroke="#4ade80" strokeDasharray="4 2" strokeOpacity={0.4} />
                <Scatter data={cadenceData} fill="#4ade80">
                  {cadenceData.map((entry, i) => (
                    <Cell key={i} fill={entry.optimal ? '#4ade80' : '#f87171'} fillOpacity={0.7} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          ) : <Empty label="Sin datos de cadencia" />}
        </Section>

        {/* VO2max Trend */}
        <Section
          title="Tendencia VO2 Máx"
          sub={currentVo2 ? `Actual: ${currentVo2.toFixed(1)} ml/kg/min — ${vo2Label}` : 'Estimado por Garmin / Intervals.icu'}
        >
          {vo2Points.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={vo2Points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fill: '#52525b', fontSize: 10 }} interval={Math.floor(vo2Points.length / 6)} />
                <YAxis tick={{ fill: '#52525b', fontSize: 10 }} width={36} domain={['auto', 'auto']} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [Number(v).toFixed(1), 'VO2max']} />
                <ReferenceArea y1={55} y2={70} fill="#4ade80" fillOpacity={0.04} />
                <ReferenceArea y1={48} y2={55} fill="#60a5fa" fillOpacity={0.04} />
                <Line type="monotone" dataKey="vo2max" stroke="#a78bfa" dot={{ r: 3 }} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : <Empty label={vo2Points.length === 0 ? 'Sin datos VO2max · conecta Intervals.icu' : 'Pocas mediciones aún'} />}
          <div className="flex gap-3 mt-2 flex-wrap">
            {[['≥60', 'Elite', '#4ade80'], ['55–59', 'Excelente', '#60a5fa'], ['48–54', 'Buena', '#fbbf24'], ['<48', 'Mejorable', '#f87171']].map(
              ([r, l, c]) => <span key={r} className="text-xs" style={{ color: c }}>{r} {l}</span>
            )}
          </div>
        </Section>

        {/* Weekly TSS */}
        <Section
          title="Carga Semanal TSS"
          sub={`Media 8 semanas: ${avgWeeklyTSS} TSS · Rojo = ramp >15% (riesgo lesión)`}
        >
          {weeklyLoad.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyLoad} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="week" tick={{ fill: '#52525b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#52525b', fontSize: 10 }} width={36} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [String(v), 'TSS']} />
                <ReferenceLine y={avgWeeklyTSS} stroke="#3f3f46" strokeDasharray="4 2"
                  label={{ value: 'media', fill: '#52525b', fontSize: 9 }} />
                <Bar dataKey="tss" radius={[3, 3, 0, 0]}>
                  {weeklyLoad.map((w, i) => (
                    <Cell key={i} fill={RAMP_COLOR[w.riskLevel]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty label="Sin datos suficientes" />}
        </Section>

        {/* Consistency Heatmap */}
        <Section
          title="Consistencia · últimos 28 días"
          sub={`${heatmap.activeDaysCount} días con actividad`}
        >
          <div className="space-y-2 py-1">
            {(['running', 'cycling', 'swimming'] as const).map(sport => {
              const data = heatmap.bySport[sport]
              const emoji = sport === 'running' ? '🏃' : sport === 'cycling' ? '🚴' : '🏊'
              const rgb = sport === 'running' ? '74,222,128' : sport === 'cycling' ? '96,165,250' : '34,211,238'
              const maxH = Math.max(...data, 0.01)
              return (
                <div key={sport} className="flex items-center gap-2">
                  <div className="w-5 text-sm">{emoji}</div>
                  <div className="flex gap-0.5 flex-1">
                    {data.map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm"
                        style={{
                          height: 18,
                          background: h > 0 ? `rgba(${rgb},${0.12 + (h / maxH) * 0.88})` : '#27272a',
                        }}
                        title={`${heatmap.dates[i]}: ${h > 0 ? formatDuration(h * 3600) : '–'}`}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
            <div className="flex gap-0.5 pl-7">
              {heatmap.dates.map((d, i) => (
                i % 7 === 0
                  ? <div key={i} className="flex-1 text-center" style={{ fontSize: 8, color: '#52525b' }}>{d.slice(3)}</div>
                  : <div key={i} className="flex-1" />
              ))}
            </div>
          </div>
        </Section>

      </div>
    </div>
  )
}

function deriveInsights({
  balance, efTrend, weeklyLoad, heatmap, cadenceData,
}: {
  balance: ReturnType<typeof useTriathlonBalance>
  efTrend: number | null
  weeklyLoad: ReturnType<typeof useWeeklyLoad>
  heatmap: ReturnType<typeof useConsistencyHeatmap>
  cadenceData: ReturnType<typeof useCadenceData>
}): { text: string; color: string }[] {
  const result: { text: string; color: string }[] = []
  const swim = balance.find(b => b.sport === 'Natación')
  if (swim && swim.actual < swim.ideal - 10) result.push({ text: '🏊 Natación infraentrenada', color: '#f87171' })
  if (efTrend != null && efTrend > 2)  result.push({ text: 'Eficiencia aeróbica mejorando', color: '#4ade80' })
  if (efTrend != null && efTrend < -2) result.push({ text: 'Eficiencia aeróbica bajando — más Z1/Z2', color: '#fb923c' })
  const highRiskWeeks = weeklyLoad.filter(w => w.riskLevel === 'high').length
  if (highRiskWeeks >= 2) result.push({ text: 'Rampas de carga elevadas — riesgo de lesión', color: '#fb923c' })
  if (heatmap.activeDaysCount >= 20) result.push({ text: 'Consistencia excelente (28 días)', color: '#4ade80' })
  else if (heatmap.activeDaysCount < 12) result.push({ text: 'Aumenta la frecuencia de entrenamiento', color: '#fbbf24' })
  const lowCadence = cadenceData.filter(c => !c.optimal).length
  if (cadenceData.length > 0 && lowCadence > cadenceData.length * 0.4) {
    result.push({ text: 'Cadencia baja — trabaja frecuencia de zancada', color: '#fbbf24' })
  }
  return result
}
