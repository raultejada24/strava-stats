import { useState, useRef, useEffect } from 'react'

export const METRIC_GLOSSARY: Record<string, { title: string; desc: string; formula?: string; range?: string }> = {
  vo2max: {
    title: 'VO2 Máx',
    desc: 'Consumo máximo de oxígeno por kg de peso corporal. El indicador más importante de capacidad cardiovascular y resistencia aeróbica.',
    formula: 'Estimado por Garmin o Intervals.icu a partir de FC y velocidad/potencia en sesiones estables.',
    range: 'Hombre 30-39: Bueno >48 · Muy bueno >53 · Excelente >58 ml/kg/min',
  },
  ctl: {
    title: 'Fitness (CTL)',
    desc: 'Chronic Training Load — carga crónica de entrenamiento. Tu nivel de forma acumulado en las últimas ~6 semanas.',
    formula: 'CTL(n) = CTL(n-1) + (TSS(n) − CTL(n-1)) × (1/42)',
    range: 'Recreativo: 30-60 · Amateur competitivo: 60-100 · Elite: >100',
  },
  atl: {
    title: 'Fatiga (ATL)',
    desc: 'Acute Training Load — carga aguda. Refleja cuánta fatiga has acumulado en los últimos 7 días.',
    formula: 'ATL(n) = ATL(n-1) + (TSS(n) − ATL(n-1)) × (1/7)',
    range: 'Alta cuando ATL >> CTL varios días seguidos: señal de sobreentrenamiento a corto plazo',
  },
  tsb: {
    title: 'Forma (TSB)',
    desc: 'Training Stress Balance — diferencia entre tu fitness acumulado y tu fatiga reciente. Positivo = listo para competir.',
    formula: 'TSB = CTL − ATL',
    range: '−10 a +5: zona óptima · >+10: demasiado descansado · <−20: sobreentrenado',
  },
  tss: {
    title: 'TSS',
    desc: 'Training Stress Score — estrés de una sesión. Combina duración e intensidad en un único número.',
    formula: 'Ciclismo: (seg × NP × IF) / (FTP × 3600) × 100\nRunning: estimado por FC y ritmo umbral.',
    range: '<150: recuperas en 24h · 150-300: 48h · >300: varios días de recuperación',
  },
  aerobicTE: {
    title: 'Training Effect Aeróbico',
    desc: 'Beneficio aeróbico de la sesión según Garmin (escala 1-5). Calculado a partir de FC y EPOC estimado.',
    range: '1-2: poca mejora · 2-3: mantenimiento · 3-4: mejora · 4-5: gran mejora o exceso',
  },
  anaerobicTE: {
    title: 'Training Effect Anaeróbico',
    desc: 'Beneficio anaeróbico de la sesión — sprints, intervalos cortos e intensos (escala 1-5).',
    range: '3+ indica trabajo anaeróbico significativo',
  },
  avgHR: {
    title: 'FC Media',
    desc: 'Frecuencia cardíaca promedio durante toda la sesión.',
  },
  maxHR: {
    title: 'FC Máxima',
    desc: 'Pico máximo de frecuencia cardíaca alcanzado durante la sesión.',
    range: 'FC máx teórica ≈ 220 − edad. Configura la tuya en Ajustes para zonas precisas.',
  },
  avgPower: {
    title: 'Potencia Media',
    desc: 'Vatios promedio sostenidos durante toda la sesión.',
    range: 'IF = Potencia media / FTP. IF > 1.05 es muy intenso para sesiones largas.',
  },
  normalizedPower: {
    title: 'Potencia Normalizada (NP)',
    desc: 'Potencia media ponderada que refleja el coste fisiológico real en rutas con cambios de intensidad (cuestas, sprints, bajadas).',
    formula: 'Raíz cuarta de la media de potencia^4 en ventanas de 30s. Siempre ≥ potencia media.',
  },
  avgCadence: {
    title: 'Cadencia',
    desc: 'Pasos por minuto (running) o pedaladas por minuto (ciclismo) como media de la sesión.',
    range: 'Running óptimo: 170-180 spm · Ciclismo eficiente: 80-100 rpm',
  },
}

interface InfoTooltipProps {
  metricKey: string
  children: React.ReactNode
  side?: 'top' | 'bottom'
}

export default function InfoTooltip({ metricKey, children, side = 'top' }: InfoTooltipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const info = METRIC_GLOSSARY[metricKey]

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!info) return <>{children}</>

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1">
      {children}
      {/* Always visible, subtle ℹ button */}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        className={`w-3.5 h-3.5 rounded-full border inline-flex items-center justify-center transition-colors text-[9px] leading-none shrink-0 ${
          open
            ? 'border-zinc-400 text-zinc-200 bg-zinc-700'
            : 'border-zinc-700 text-zinc-600 hover:border-zinc-500 hover:text-zinc-300'
        }`}
        title={`¿Qué es ${info.title}?`}
      >
        i
      </button>

      {open && (
        <div
          className={`absolute ${side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 z-50 w-72 bg-zinc-900 border border-zinc-700/80 rounded-xl p-4 shadow-2xl text-xs`}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-200 text-sm leading-none"
          >×</button>
          <div className="font-semibold text-zinc-100 mb-1.5 text-sm pr-5">{info.title}</div>
          <p className="text-zinc-400 leading-relaxed mb-2">{info.desc}</p>
          {info.formula && (
            <div className="bg-zinc-800 rounded-lg px-3 py-2 font-mono text-zinc-300 mb-2 text-[11px] leading-relaxed whitespace-pre-line">
              {info.formula}
            </div>
          )}
          {info.range && (
            <p className="text-zinc-500 leading-relaxed">
              <span className="text-zinc-400 font-medium">Referencia: </span>{info.range}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
