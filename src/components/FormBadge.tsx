interface Props { tsb: number }

export default function FormBadge({ tsb }: Props) {
  if (tsb > 10)  return <Badge color="emerald" label="Descansado" />
  if (tsb > -5)  return <Badge color="blue"    label="En forma" />
  if (tsb > -15) return <Badge color="amber"   label="Cargado" />
  if (tsb > -25) return <Badge color="orange"  label="Fatigado" />
  return               <Badge color="rose"    label="Al límite" />
}

const PALETTE: Record<string, { border: string; bg: string; text: string }> = {
  emerald: { border: '#22c55e30', bg: '#22c55e10', text: '#4ade80' },
  blue:    { border: '#3b82f630', bg: '#3b82f610', text: '#60a5fa' },
  amber:   { border: '#f59e0b30', bg: '#f59e0b10', text: '#fbbf24' },
  orange:  { border: '#f9731630', bg: '#f9731610', text: '#fb923c' },
  rose:    { border: '#f4363630', bg: '#f4363610', text: '#f87171' },
}

function Badge({ color, label }: { color: string; label: string }) {
  const p = PALETTE[color]
  return (
    <span
      className="px-2 py-0.5 rounded-md text-xs font-semibold border tracking-wide"
      style={{ borderColor: p.border, background: p.bg, color: p.text }}
    >
      {label}
    </span>
  )
}
