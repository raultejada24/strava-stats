import { useActivityStore } from '../stores/activityStore'
import type { UserSettings } from '../types/garmin'

export default function Settings() {
  const settings = useActivityStore(s => s.settings)
  const updateSettings = useActivityStore(s => s.updateSettings)

  function set<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    updateSettings({ [key]: value })
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto max-w-lg">
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-zinc-100">Ajustes</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Parámetros fisiológicos para el cálculo de zonas y TSS.</p>
      </div>

      <div className="space-y-6">
        <Field
          label="FC Máxima"
          unit="bpm"
          value={settings.maxHR}
          min={140} max={220}
          onChange={v => set('maxHR', v)}
          hint="Para calcular zonas Z1–Z5."
        />
        <Field
          label="FTP (Functional Threshold Power)"
          unit="W"
          value={settings.ftp}
          min={100} max={500}
          onChange={v => set('ftp', v)}
          hint="Potencia que puedes mantener ~1h. Para ciclismo."
        />
        <Field
          label="FC en Umbral Láctico (Running)"
          unit="bpm"
          value={settings.lthrRunning}
          min={120} max={200}
          onChange={v => set('lthrRunning', v)}
          hint="Suele ser el 87-93% de tu FCmax."
        />

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Ritmo en Umbral <span className="text-zinc-600 font-normal">(Running)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={Math.floor(settings.thresholdPace / 60)}
              min={3} max={8}
              onChange={e => set('thresholdPace', Number(e.target.value) * 60 + (settings.thresholdPace % 60))}
              className="w-20 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 focus:outline-none"
            />
            <span className="text-zinc-600 text-sm">min</span>
            <input
              type="number"
              value={settings.thresholdPace % 60}
              min={0} max={59}
              onChange={e => set('thresholdPace', Math.floor(settings.thresholdPace / 60) * 60 + Number(e.target.value))}
              className="w-20 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 focus:outline-none"
            />
            <span className="text-zinc-600 text-sm">seg /km</span>
          </div>
          <p className="text-xs text-zinc-700 mt-1.5">Usado para calcular TSS de running.</p>
        </div>
      </div>

      <div className="mt-8 p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-600 space-y-1">
        <p>Los ajustes se guardan en tu navegador (localStorage).</p>
        <p>Cambiarlos afecta retroactivamente a zonas y CTL/ATL/TSB.</p>
      </div>
    </div>
  )
}

function Field({ label, unit, value, min, max, onChange, hint }: {
  label: string; unit: string; value: number; min: number; max: number;
  onChange: (v: number) => void; hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-2">
        {label} <span className="text-zinc-600 font-normal text-xs">{unit}</span>
      </label>
      <div className="flex items-center gap-3">
        <input
          type="number"
          value={value}
          min={min} max={max}
          onChange={e => onChange(Number(e.target.value))}
          className="w-28 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 focus:outline-none"
        />
        <input
          type="range"
          min={min} max={max}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 accent-indigo-500"
        />
      </div>
      {hint && <p className="text-xs text-zinc-700 mt-1.5">{hint}</p>}
    </div>
  )
}
