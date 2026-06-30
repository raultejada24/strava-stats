import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { spawn } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'

// Auto-runs intervals_sync.py when the dev server starts.
// New activities that appear in Intervals.icu (synced from Strava automatically)
// will be fetched in the background; Vite's HMR picks up the changed JSON files.
function intervalsSyncPlugin() {
  return {
    name: 'intervals-auto-sync',
    configureServer() {
      const script = join(__dirname, 'fetch', 'intervals_sync.py')
      if (!existsSync(script)) return

      // Candidates in order: Windows Launcher, common installs, PATH fallbacks
      const pythonCandidates = [
        'py',
        'C:/Users/rault/AppData/Local/Programs/Python/Python313/python.exe',
        'python3',
        'python',
      ]

      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const tryNext = (candidates: string[]) => {
        if (candidates.length === 0) {
          console.log('\x1b[33m[sync]\x1b[0m No se encontró Python — ejecuta el sync manualmente.')
          return
        }
        const [cmd, ...rest] = candidates
        // Probe whether this Python works before running the real script
        const probe = spawn(cmd, ['--version'], { shell: true, stdio: 'pipe' })
        probe.on('close', (code) => {
          if (code !== 0) { tryNext(rest); return }

          console.log(`\x1b[36m[sync]\x1b[0m Sincronizando actividades de los últimos 14 días (${since} → hoy)...`)
          const proc = spawn(cmd, [script, '--since', since], { shell: true, stdio: 'pipe' })

          const prefix = '\x1b[36m[sync]\x1b[0m '
          proc.stdout?.on('data', (d: Buffer) => {
            String(d).split('\n').filter(Boolean).forEach(l => console.log(prefix + l))
          })
          proc.stderr?.on('data', (d: Buffer) => {
            String(d).split('\n').filter(Boolean).forEach(l => console.log('\x1b[33m[sync]\x1b[0m ' + l))
          })
          proc.on('close', (exitCode) => {
            if (exitCode === 0) {
              console.log('\x1b[36m[sync]\x1b[0m Sync completado — los datos se actualizan solos.')
            } else {
              console.log(`\x1b[33m[sync]\x1b[0m Sync terminó con código ${exitCode}`)
            }
          })
        })
      }

      tryNext(pythonCandidates)
    },
  }
}

export default defineConfig({
  plugins: [tailwindcss(), react(), intervalsSyncPlugin()],
})
