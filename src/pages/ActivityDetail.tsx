import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import type { ActivityDetail } from '../types/garmin'
import { useActivityStore } from '../stores/activityStore'
import { formatPace, formatDuration, formatDistance, formatDate, sportLabel, sportIcon, sportColor } from '../utils/formatters'
import { HR_ZONE_DEFS } from '../utils/calculations'
import ActivityMap from '../components/ActivityMap'
import MetricCard from '../components/MetricCard'

export default function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const loadDetail = useActivityStore(s => s.loadDetail)
  const activities = useActivityStore(s => s.activities)
  const [detail, setDetail] = useState<ActivityDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    loadDetail(Number(id)).then(d => { setDetail(d); setLoading(false) })
  }, [id, loadDetail])

  const summary = activities.find(a => a.id === Number(id))

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">Cargando...</div>
  }

  const act = detail ?? summary
  if (!act) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
        Actividad no encontrada.{' '}
        <Link to="/activities" className="text-zinc-300 ml-1 underline underline-offset-2">Volver</Link>
      </div>
    )
  }

  const color = sportColor(act.sport)

  return (
    <div className="flex-1 p-6 overflow-y-auto max-w-4xl">
      {/* Header */}
      <Link to="/activities" className="text-[11px] text-zinc-600 hover:text-zinc-400 mb-3 inline-flex items-center gap-1 transition-colors">
        ← Actividades
      </Link>
      <div className="flex items-start gap-3 mb-6">
        <div className="w-1 h-10 rounded-full mt-1 shrink-0" style={{ background: color }} />
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">{act.title}</h1>
          <div className="text-sm text-zinc-500 mt-0.5">
            {formatDate(act.startTime)} · {sportIcon(act.sport)} {sportLabel(act.sport)}
          </div>
        </div>
      </div>

      {/* Map */}
      {detail?.gpxCoords && detail.gpxCoords.length > 0 && (
        <div className="mb-6 rounded-xl overflow-hidden">
          <ActivityMap coords={detail.gpxCoords} sport={act.sport} height={300} />
        </div>
      )}

      {/* Key metrics */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <MetricCard label="Distancia" value={formatDistance(act.distance, act.sport)} />
        <MetricCard label="Duración" value={formatDuration(act.duration)} />
        {act.sport === 'running' && act.avgPace
          ? <MetricCard label="Ritmo medio" value={formatPace(act.avgPace)} tooltipKey="avgHR" />
          : act.sport === 'cycling' && act.avgSpeed
          ? <MetricCard label="Velocidad" value={`${act.avgSpeed}`} unit="km/h" />
          : <MetricCard label="Calorías" value={act.calories ?? '–'} unit={act.calories ? 'kcal' : ''} />
        }
        <MetricCard label="FC Media" value={act.avgHR > 0 ? act.avgHR : '–'} unit={act.avgHR > 0 ? 'bpm' : ''} tooltipKey="avgHR" />
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <MetricCard label="FC Máxima" value={act.maxHR > 0 ? act.maxHR : '–'} unit={act.maxHR > 0 ? 'bpm' : ''} tooltipKey="maxHR" />
        <MetricCard label="Elevación" value={act.elevationGain} unit="m" />
        {act.tss != null
          ? <MetricCard label="TSS" value={Math.round(act.tss)} tooltipKey="tss" />
          : null
        }
        {act.sport === 'cycling' && act.avgPower
          ? <MetricCard label="Potencia media" value={act.avgPower} unit="W" tooltipKey="avgPower" />
          : act.sport === 'cycling' && act.normalizedPower
          ? <MetricCard label="Pot. Normalizada" value={act.normalizedPower} unit="W" tooltipKey="normalizedPower" />
          : act.sport === 'running' && act.avgCadence
          ? <MetricCard label="Cadencia" value={act.avgCadence} unit="spm" tooltipKey="avgCadence" />
          : null
        }
      </div>

      {/* Training Effect */}
      {(act.aerobicTE != null || act.anaerobicTE != null) && (
        <div className="grid grid-cols-2 gap-3 mb-6 max-w-xs">
          {act.aerobicTE != null && (
            <MetricCard label="TE Aeróbico" value={act.aerobicTE.toFixed(1)} tooltipKey="aerobicTE" color="#4ade80" />
          )}
          {act.anaerobicTE != null && (
            <MetricCard label="TE Anaeróbico" value={act.anaerobicTE.toFixed(1)} tooltipKey="anaerobicTE" color="#fb923c" />
          )}
        </div>
      )}

      {/* HR Zones */}
      {detail?.hrZones && detail.hrZones.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-3">Zonas de FC</h2>
          <div className="space-y-2">
            {detail.hrZones.map((zone) => {
              const total = detail.hrZones.reduce((s, z) => s + z.seconds, 0)
              const pct = total > 0 ? (zone.seconds / total) * 100 : 0
              const def = HR_ZONE_DEFS[zone.zone - 1]
              return (
                <div key={zone.zone} className="flex items-center gap-3">
                  <div className="w-20 text-xs text-zinc-500">{zone.name}</div>
                  <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: def?.color ?? '#52525b' }} />
                  </div>
                  <div className="w-14 text-xs text-zinc-500 text-right tabular-nums">{formatDuration(zone.seconds)}</div>
                  <div className="w-8 text-xs text-zinc-600 text-right tabular-nums">{pct.toFixed(0)}%</div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Laps */}
      {detail?.laps && detail.laps.length > 1 && (
        <section className="mb-6">
          <h2 className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-3">
            Splits · {detail.laps.length} km
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-zinc-600 border-b border-zinc-800">
                  <th className="pb-2 pr-4 font-medium">Km</th>
                  <th className="pb-2 pr-4 font-medium">Tiempo</th>
                  {act.sport === 'running'  && <th className="pb-2 pr-4 font-medium">Ritmo</th>}
                  {act.sport === 'cycling'  && <th className="pb-2 pr-4 font-medium">Velocidad</th>}
                  {act.avgPower != null     && <th className="pb-2 pr-4 font-medium">Potencia</th>}
                  <th className="pb-2 pr-4 font-medium">FC</th>
                  <th className="pb-2 font-medium">Elev.</th>
                </tr>
              </thead>
              <tbody>
                {detail.laps.map(lap => (
                  <tr key={lap.index} className="border-b border-zinc-800/60 hover:bg-zinc-900/40 transition-colors">
                    <td className="py-2.5 pr-4 text-zinc-500 text-[13px]">{lap.index}</td>
                    <td className="py-2.5 pr-4 font-mono text-zinc-200 text-[13px]">{formatDuration(lap.duration)}</td>
                    {act.sport === 'running' && (
                      <td className="py-2.5 pr-4 font-mono text-zinc-200 text-[13px]">{formatPace(lap.avgPace)}</td>
                    )}
                    {act.sport === 'cycling' && (
                      <td className="py-2.5 pr-4 text-zinc-200 text-[13px]">{lap.avgSpeed ? `${lap.avgSpeed} km/h` : '–'}</td>
                    )}
                    {act.avgPower != null && (
                      <td className="py-2.5 pr-4 text-zinc-200 text-[13px]">{lap.avgPower ? `${lap.avgPower}W` : '–'}</td>
                    )}
                    <td className="py-2.5 pr-4 text-zinc-500 text-[13px] tabular-nums">{lap.avgHR ?? '–'}</td>
                    <td className="py-2.5 text-zinc-500 text-[13px]">{lap.elevationGain}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
