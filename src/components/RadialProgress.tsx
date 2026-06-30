interface Props {
  value: number
  max: number
  color: string
  size?: number
  stroke?: number
  children?: React.ReactNode
}

export default function RadialProgress({ value, max, color, size = 72, stroke = 7, children }: Props) {
  const r = (size - stroke * 2) / 2
  const circumference = 2 * Math.PI * r
  const filled = Math.min(value / max, 1) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#27272a" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}
