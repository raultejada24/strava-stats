import { useState, useEffect } from 'react'

export interface WeekSport {
  count: number
  distance: number
  duration: number
  tss: number
}

export interface WeekSummary {
  year: number
  week: number
  dateStart: string
  dateEnd: string
  totalDuration: number
  totalKcal: number
  totalElevation: number
  totalTSS: number
  totalDistance: number
  activityCount: number
  ctl: number | null
  atl: number | null
  tsb: number | null
  rampRate: number | null
  bySport: Record<string, WeekSport>
}

export function useWeeklyStats(limit = 12) {
  const [weeks, setWeeks] = useState<WeekSummary[]>([])

  useEffect(() => {
    fetch('/data/weekly.json')
      .then(r => r.ok ? r.json() : [])
      .then((data: WeekSummary[]) => setWeeks(data.slice(0, limit)))
      .catch(() => setWeeks([]))
  }, [limit])

  return weeks
}
