import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { spawn } from 'child_process'
import { join, resolve } from 'path'
import { existsSync, readFileSync } from 'fs'

// Reads STRAVA_EXPORT_PATH from .env without pulling in the dotenv package.
function readExportPath(): string | null {
  const envFile = resolve(__dirname, '.env')
  if (!existsSync(envFile)) return null
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^STRAVA_EXPORT_PATH\s*=\s*(.+)$/)
    if (m) return m[1].trim()
  }
  return null
}

// Auto-runs sync.py when the dev server starts so new export data is picked
// up without having to run anything manually. Cached activities are skipped,
// so repeated starts are fast (only unprocessed files are parsed).
function stravaAutoSyncPlugin() {
  return {
    name: 'strava-auto-sync',
    configureServer() {
      const script = join(__dirname, 'fetch', 'sync.py')
      if (!existsSync(script)) return

      const exportPath = readExportPath()
      if (!exportPath) {
        console.log('\x1b[33m[sync]\x1b[0m STRAVA_EXPORT_PATH no configurado en .env — saltando sync automático.')
        return
      }

      const absExport = resolve(__dirname, exportPath)
      if (!existsSync(absExport)) {
        console.log(`\x1b[33m[sync]\x1b[0m ZIP no encontrado en ${absExport} — saltando sync.`)
        return
      }

      const pythonCandidates = [
        'py',
        'C:/Users/rault/AppData/Local/Programs/Python/Python313/python.exe',
        'python3',
        'python',
      ]

      const tryNext = (candidates: string[]) => {
        if (candidates.length === 0) {
          console.log('\x1b[33m[sync]\x1b[0m Python no encontrado — ejecuta el sync manualmente.')
          return
        }
        const [cmd, ...rest] = candidates
        const probe = spawn(cmd, ['--version'], { shell: true, stdio: 'pipe' })
        probe.on('close', code => {
          if (code !== 0) { tryNext(rest); return }

          console.log(`\x1b[36m[sync]\x1b[0m Procesando actividades nuevas del export...`)
          const proc = spawn(cmd, [script, '--export', absExport], { shell: true, stdio: 'pipe' })

          const p = '\x1b[36m[sync]\x1b[0m '
          proc.stdout?.on('data', (d: Buffer) => {
            String(d).split('\n').filter(Boolean).forEach(l => console.log(p + l))
          })
          proc.stderr?.on('data', (d: Buffer) => {
            String(d).split('\n').filter(Boolean).forEach(l => console.log('\x1b[33m[sync]\x1b[0m ' + l))
          })
          proc.on('close', exitCode => {
            if (exitCode === 0) console.log('\x1b[36m[sync]\x1b[0m Datos actualizados.')
            else console.log(`\x1b[33m[sync]\x1b[0m Sync terminó con código ${exitCode}`)
          })
        })
      }

      tryNext(pythonCandidates)
    },
  }
}

export default defineConfig({
  plugins: [tailwindcss(), react(), stravaAutoSyncPlugin()],
})
