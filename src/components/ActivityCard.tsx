import { Link } from 'react-router-dom'
import type { ActivitySummary } from '../types/garmin'
import { formatPace, formatDuration, formatDistance, formatRelativeTime, sportIcon, sportColor } from '../utils/formatters'

interface Props {
  activity: ActivitySummary
  compact?: boolean
}

export default function ActivityCard({ activity: a }: Props) {
  const color = sportColor(a.sport)

  return (
    <Link
      to={`/activity/${a.id}`}
      className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700 transition-all group"
    >
      {/* Sport icon + color dot */}
      <div className="shrink-0 flex items-center gap-2.5">
        <div className="w-1.5 h-8 rounded-full" style={{ background: color }} />
        <span className="text-lg leading-none">{sportIcon(a.sport)}</span>
      </div>

      {/* Title + date */}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-zinc-100 truncate group-hover:text-white">{a.title}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{formatRelativeTime(a.startTime)}</div>
      </div>

      {/* Metrics */}
      <div className="flex items-center gap-5 shrink-0 text-right">
        {a.distance > 0 && (
          <Metric
            top={`${formatDistance(a.distance, a.sport)}`}
            bottom={
              a.avgPace ? formatPace(a.avgPace)
              : a.avgSpeed ? `${a.avgSpeed} km/h`
              : ''
            }
          />
        )}
        <Metric
          top={formatDuration(a.duration)}
          bottom={a.avgHR > 0 ? `${a.avgHR} bpm` : ''}
        />
        {a.tss != null ? (
          <div className="w-10 text-right">
            <div className="text-sm font-bold tabular-nums" style={{ color }}>{Math.round(a.tss)}</div>
            <div className="text-[10px] text-zinc-600">TSS</div>
          </div>
        ) : a.aerobicTE != null ? (
          <div className="w-10 text-right">
            <div className="text-sm font-bold tabular-nums" style={{ color }}>{a.aerobicTE.toFixed(1)}</div>
            <div className="text-[10px] text-zinc-600">TE</div>
          </div>
        ) : null}
        <div className="text-zinc-700 group-hover:text-zinc-500 text-xs transition-colors">→</div>
      </div>
    </Link>
  )
}

function Metric({ top, bottom }: { top: string; bottom: string }) {
  return (
    <div className="text-right">
      <div className="text-sm font-semibold tabular-nums text-zinc-200">{top}</div>
      {bottom && <div className="text-xs text-zinc-500 mt-0.5">{bottom}</div>}
    </div>
  )
}
