import InfoTooltip from './InfoTooltip'

interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  sub?: string
  color?: string
  large?: boolean
  tooltipKey?: string
  tooltipSide?: 'top' | 'bottom'
}

export default function MetricCard({ label, value, unit, sub, color, large, tooltipKey, tooltipSide }: MetricCardProps) {
  const labelEl = (
    <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{label}</span>
  )

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-1 hover:border-zinc-700 transition-colors">
      <div>
        {tooltipKey
          ? <InfoTooltip metricKey={tooltipKey} side={tooltipSide}>{labelEl}</InfoTooltip>
          : labelEl
        }
      </div>
      <div className={`font-bold tabular-nums leading-none ${large ? 'text-4xl' : 'text-2xl'}`} style={color ? { color } : {}}>
        {value}
        {unit && <span className="text-sm font-normal text-zinc-500 ml-1">{unit}</span>}
      </div>
      {sub && <div className="text-xs text-zinc-600 mt-0.5">{sub}</div>}
    </div>
  )
}
