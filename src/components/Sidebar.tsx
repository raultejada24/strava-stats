import { NavLink } from 'react-router-dom'
import { useActivityStore } from '../stores/activityStore'

const GridIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
    <rect x="1.5" y="1.5" width="5" height="5" rx="1"/>
    <rect x="8.5" y="1.5" width="5" height="5" rx="1"/>
    <rect x="1.5" y="8.5" width="5" height="5" rx="1"/>
    <rect x="8.5" y="8.5" width="5" height="5" rx="1"/>
  </svg>
)
const ListIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M2.5 4h10M2.5 7.5h10M2.5 11h7" strokeLinecap="round"/>
  </svg>
)
const TrendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M1.5 11.5l4-5 3 2.5 4-6 1.5 1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.5 3.5h3v3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const ZoneIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M1.5 9.5c1.5-3.5 3.5-3.5 5 0s3.5 3.5 5 0" strokeLinecap="round"/>
    <path d="M1.5 6c1.5-3.5 3.5-3.5 5 0" strokeLinecap="round"/>
  </svg>
)
const BoltIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor">
    <path d="M8.5 1.5L3 8h5.5L6.5 13.5 12 7H6.5L8.5 1.5z"/>
  </svg>
)
const TrophyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M4.5 2.5h6v5a3 3 0 01-6 0v-5z" strokeLinejoin="round"/>
    <path d="M4.5 5H2.5a1 1 0 000 2v.5A1.5 1.5 0 004 9M10.5 5h2a1 1 0 010 2v.5A1.5 1.5 0 0111 9"/>
    <path d="M7.5 10.5v2.5M5 13h5"/>
  </svg>
)
const GearIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
    <circle cx="7.5" cy="7.5" r="2"/>
    <path d="M7.5 1.5v1.5M7.5 12v1.5M1.5 7.5H3M12 7.5h1.5M3.2 3.2l1 1M10.8 10.8l1 1M3.2 11.8l1-1M10.8 4.2l1-1" strokeLinecap="round"/>
  </svg>
)

const NAV = [
  { to: '/',            label: 'Dashboard',     Icon: GridIcon  },
  { to: '/activities',  label: 'Actividades',   Icon: ListIcon  },
  { to: '/fitness',     label: 'Fitness',       Icon: TrendIcon },
  { to: '/zones',       label: 'Zonas FC',      Icon: ZoneIcon  },
  { to: '/performance', label: 'Rendimiento',   Icon: BoltIcon  },
  { to: '/records',     label: 'Récords',       Icon: TrophyIcon},
  { to: '/settings',    label: 'Ajustes',       Icon: GearIcon  },
]

export default function Sidebar() {
  const stats = useActivityStore(s => s.stats)
  const activities = useActivityStore(s => s.activities)

  return (
    <aside className="w-52 shrink-0 flex flex-col min-h-screen border-r border-zinc-800 bg-[#0d0d0f]">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-zinc-800">
        <div className="text-zinc-100 font-semibold text-[15px] tracking-tight leading-tight">Training</div>
        <div className="text-zinc-100 font-semibold text-[15px] tracking-tight leading-tight">Dashboard</div>
        <div className="text-zinc-600 text-xs mt-1.5 font-medium">
          {activities.length > 0 ? `${activities.length} actividades` : 'Sin datos'}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-px">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                isActive
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-zinc-200' : 'text-zinc-600'}>
                  <Icon />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sync info */}
      {stats && (
        <div className="px-4 py-4 border-t border-zinc-800">
          <div className="text-[11px] text-zinc-600 mb-0.5">Última sync</div>
          <div className="text-[11px] text-zinc-500">
            {new Date(stats.syncedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <div className="mt-3 text-[10px] text-zinc-700 font-mono leading-relaxed">
            cd fetch<br />
            python sync.py
          </div>
        </div>
      )}
    </aside>
  )
}
