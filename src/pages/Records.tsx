import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useActivityStore } from '../stores/activityStore'
import { formatPace, formatDuration } from '../utils/formatters'
import { computePRs } from '../utils/calculations'
import type { PR } from '../utils/calculations'

function PRTable({ title, prs, icon }: { title: string; prs: PR[]; icon: string }) {
  if (prs.length === 0) return null
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] text-zinc-600 border-b border-zinc-800">
            <th className="px-5 py-2.5 font-medium">Distancia</th>
            <th className="px-5 py-2.5 font-medium">Tiempo</th>
            <th className="px-5 py-2.5 font-medium">Ritmo</th>
            <th className="px-5 py-2.5 font-medium">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {prs.map(pr => (
            <tr key={pr.label} className="border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors">
              <td className="px-5 py-3 font-semibold text-zinc-100 text-[13px]">{pr.label}</td>
              <td className="px-5 py-3 font-mono text-zinc-200 text-[13px] tabular-nums">{formatDuration(pr.duration)}</td>
              <td className="px-5 py-3 font-mono text-zinc-400 text-[13px] tabular-nums">{formatPace(pr.pace)}</td>
              <td className="px-5 py-3">
                <Link to={`/activity/${pr.activityId}`} className="text-xs text-zinc-400 hover:text-zinc-100 underline underline-offset-2 transition-colors">
                  {pr.date}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Records() {
  const activities = useActivityStore(s => s.activities)
  const personalRecords = useMemo(() => computePRs(activities), [activities])
  const hasAny = Object.values(personalRecords).some(prs => prs.length > 0)

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-100">Récords Personales</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Mejores tiempos por distancia</p>
      </div>

      {!hasAny ? (
        <div className="text-center py-16 text-zinc-600 text-sm">
          Sin suficientes datos para calcular récords.
        </div>
      ) : (
        <div className="space-y-4">
          <PRTable title="Running"  icon="🏃" prs={personalRecords.running  ?? []} />
          <PRTable title="Ciclismo" icon="🚴" prs={personalRecords.cycling  ?? []} />
        </div>
      )}
    </div>
  )
}
