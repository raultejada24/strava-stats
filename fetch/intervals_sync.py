#!/usr/bin/env python3
from __future__ import annotations
"""
Intervals.icu → Training Dashboard sync script.

Intervals.icu se sincroniza automáticamente con Strava (y con Garmin Connect,
Wahoo, etc.). Tiene API gratuita. Con este script no hace falta descargar
ningún ZIP de Strava — basta con ejecutarlo periódicamente.

Qué datos obtiene:
  - Todas tus actividades (nombre, deporte, distancia, duración, FC, potencia,
    cadencia, calorías, TSS real, VO2Max estimado, Training Effect)
  - Laps de cada actividad
  - Historial de VO2Max, CTL, ATL y TSB

Lo que NO incluye (no lo almacena Intervals.icu):
  - Tracks GPS / mapa de la ruta
  Si necesitas el mapa, usa fetch/sync.py con el export de Strava.

Setup (solo la primera vez):
  1. Crea cuenta gratuita en https://intervals.icu y conecta Strava.
  2. Ve a intervals.icu → ícono de perfil → Settings.
     Baja hasta la sección "API Access" y copia tu API key.
  3. Tu athlete ID está en la URL cuando abres intervals.icu:
       https://intervals.icu/athlete/i123456 → athlete ID = i123456
  4. Copia .env.example → .env y rellena las dos variables.
  5. Instala dependencias: pip install -r requirements.txt

Usage:
    python intervals_sync.py                   # Todo el historial
    python intervals_sync.py --since 2024-01-01
    python intervals_sync.py --limit 50        # Solo las 50 últimas
    python intervals_sync.py --since 2024-01-01 --no-laps  # Más rápido

Output:
    ../public/data/activities.json
    ../public/data/activity_{strava_id}.json   (uno por actividad)
    ../public/data/stats.json
    ../public/data/wellness.json               (VO2Max, CTL/ATL/TSB)
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import requests
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv(Path(__file__).parent.parent / ".env")

ATHLETE_ID = os.getenv("INTERVALS_ATHLETE_ID", "").strip()
API_KEY    = os.getenv("INTERVALS_API_KEY", "").strip()
BASE_URL   = "https://intervals.icu/api/v1"
DATA_DIR   = Path(__file__).parent.parent / "public" / "data"

# Mapeo tipo Intervals.icu → sport interno
ICU_SPORT_MAP: dict[str, str] = {
    # Running
    "Run": "running", "TrailRun": "running", "VirtualRun": "running",
    "Hike": "running", "Walk": "running", "NordicSki": "running",
    # Cycling
    "Ride": "cycling", "MountainBikeRide": "cycling", "GravelRide": "cycling",
    "VirtualRide": "cycling", "EBikeRide": "cycling", "EMountainBikeRide": "cycling",
    "Handcycle": "cycling", "Velomobile": "cycling", "Rowing": "cycling",
    # Swimming
    "Swim": "swimming", "OpenWaterSwim": "swimming",
    # Strength / other
    "WeightTraining": "strength", "Workout": "strength", "Yoga": "strength",
    "Pilates": "strength", "CrossFit": "strength", "RockClimbing": "strength",
    "Elliptical": "strength", "StairStepper": "strength",
}

SPORT_LABELS: dict[str, str] = {
    "running": "Carrera", "cycling": "Ciclismo",
    "swimming": "Natación", "strength": "Fuerza", "other": "Actividad",
}

SUMMARY_KEYS = [
    "id", "title", "sport", "startTime", "distance", "duration", "movingTime",
    "elevationGain", "avgHR", "maxHR", "calories", "tss", "avgPace", "avgSpeed",
    "avgPower", "normalizedPower", "avgCadence", "vo2max", "aerobicTE",
    "anaerobicTE", "swolf", "avgStrokesPerLength",
]


# ─── HTTP helpers ─────────────────────────────────────────────────────────────

def _check_credentials():
    if not ATHLETE_ID or not API_KEY:
        print("ERROR: Faltan INTERVALS_ATHLETE_ID o INTERVALS_API_KEY en el .env")
        print("  1. Copia .env.example → .env")
        print("  2. Rellena INTERVALS_ATHLETE_ID (de la URL: intervals.icu/athlete/iXXXXXX)")
        print("  3. Rellena INTERVALS_API_KEY (Settings → API Access)")
        sys.exit(1)


def icu_get(endpoint: str, **params) -> list | dict:
    url = f"{BASE_URL}{endpoint}"
    resp = requests.get(url, auth=("API_KEY", API_KEY), params=params, timeout=30)
    if resp.status_code == 401:
        print("ERROR: API key inválida o athlete ID incorrecto.")
        sys.exit(1)
    resp.raise_for_status()
    return resp.json()


# ─── JSON helpers ─────────────────────────────────────────────────────────────

def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def save_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))


# ─── Normalizer ───────────────────────────────────────────────────────────────

def _sport(act: dict) -> str:
    return ICU_SPORT_MAP.get(act.get("type", ""), "other")


def _activity_title(act: dict, sport: str) -> str:
    name = (act.get("name") or "").strip()
    if name:
        return name
    # Generate a meaningful fallback from sport + time of day
    start = act.get("start_date_local", "")
    hour = int(start[11:13]) if len(start) > 12 else 12
    period = "matutino" if 5 <= hour < 12 else "vespertino" if 12 <= hour < 19 else "nocturno"
    return f"{SPORT_LABELS.get(sport, 'Actividad')} {period}"


def _round1(v) -> float | None:
    return round(float(v), 1) if v is not None else None


def _roundn(v) -> int | None:
    return round(float(v)) if v is not None else None


def normalize_summary(act: dict) -> dict:
    """Convert an Intervals.icu activity dict to ActivitySummary."""
    sport = _sport(act)

    distance_m = float(act.get("distance") or 0)
    duration   = float(act.get("elapsed_time") or 0)
    moving     = float(act.get("moving_time") or duration)
    elevation  = float(act.get("total_elevation_gain") or 0)
    avg_hr     = _roundn(act.get("average_heartrate") or 0) or 0
    max_hr     = _roundn(act.get("max_heartrate") or 0) or 0
    calories   = _roundn(act.get("calories"))

    # Speed / pace
    avg_speed_ms = float(act.get("average_speed") or 0)
    avg_pace = round(1000 / avg_speed_ms) if avg_speed_ms > 0 else None
    avg_speed_kmh = round(avg_speed_ms * 3.6, 1) if avg_speed_ms > 0 else None

    # Power
    avg_power  = _roundn(act.get("average_watts"))
    norm_power = _roundn(act.get("weighted_average_watts"))

    # Cadence: Garmin/ANT+ sends running cadence as per-leg → ×2
    raw_cad = act.get("average_cadence")
    avg_cad = None
    if raw_cad is not None:
        avg_cad = round(float(raw_cad) * 2) if sport == "running" else round(float(raw_cad))

    # TSS from Intervals.icu (real, server-calculated)
    tss = _round1(act.get("icu_tss") or act.get("icu_training_load"))

    # VO2Max per-activity estimate
    vo2 = _round1(act.get("icu_vo2max"))

    # Training Effect (Garmin devices only)
    aerobic_te   = _round1(act.get("aerobic_training_effect"))
    anaerobic_te = _round1(act.get("anaerobic_training_effect"))

    # Start time: strip trailing Z (local time, not UTC)
    start_raw = act.get("start_date_local", "")
    start_time = start_raw.replace("Z", "").replace("T", "T")[:19] if start_raw else None

    # Use strava_id as the activity ID so filenames match the Strava export format
    strava_id = act.get("strava_id")
    act_id = int(strava_id) if strava_id else int(str(abs(hash(act.get("id", "0"))))[:10])

    return {
        "id": act_id,
        "title": _activity_title(act, sport),
        "sport": sport,
        "startTime": start_time,
        "distance": round(distance_m / 1000, 2),
        "duration": round(duration),
        "movingTime": round(moving),
        "elevationGain": round(elevation),
        "avgHR": avg_hr,
        "maxHR": max_hr,
        "calories": calories,
        "tss": tss,
        "avgPace": avg_pace if sport in ("running", "swimming") else None,
        "avgSpeed": avg_speed_kmh if sport == "cycling" else None,
        "avgPower": avg_power,
        "normalizedPower": norm_power,
        "avgCadence": avg_cad,
        "vo2max": vo2,
        "aerobicTE": aerobic_te,
        "anaerobicTE": anaerobic_te,
    }


def normalize_laps(icu_laps: list, sport: str) -> list:
    laps = []
    for i, lap in enumerate(icu_laps):
        dur   = float(lap.get("total_timer_time") or lap.get("total_elapsed_time") or 0)
        dist  = float(lap.get("total_distance") or 0)
        speed = float(lap.get("avg_speed") or 0)
        pace  = round(1000 / speed) if speed > 0 else None
        laps.append({
            "index": i + 1,
            "distance": round(dist / 1000, 3),
            "duration": round(dur),
            "avgHR": _roundn(lap.get("avg_heart_rate")),
            "avgPace": pace if sport in ("running", "swimming") else None,
            "avgSpeed": round(speed * 3.6, 1) if speed else None,
            "avgPower": _roundn(lap.get("avg_power")),
            "elevationGain": round(float(lap.get("total_ascent") or 0)),
        })
    return laps


def normalize_detail(summary: dict, laps: list) -> dict:
    detail = dict(summary)
    detail["laps"] = laps
    detail["hrZones"] = []      # computed client-side from avgHR + FCmax setting
    detail["gpxCoords"] = []    # Intervals.icu no almacena tracks GPS
    detail["avgStrideLength"] = None
    detail["trainingEffect"] = None
    return detail


# ─── Fetch helpers ────────────────────────────────────────────────────────────

def fetch_activity_list(oldest: str, newest: str) -> list[dict]:
    """Fetch activity list. Intervals.icu returns up to ~200 per call; we paginate if needed."""
    all_acts: list[dict] = []
    params = {
        "oldest": oldest + "T00:00:00",
        "newest": newest + "T23:59:59",
    }
    data = icu_get(f"/athlete/{ATHLETE_ID}/activities", **params)
    if isinstance(data, list):
        all_acts.extend(data)
    return all_acts


def fetch_activity_detail(icu_id: str) -> dict | None:
    """Fetch individual activity (laps included)."""
    try:
        data = icu_get(f"/athlete/{ATHLETE_ID}/activities/{icu_id}")
        return data if isinstance(data, dict) else None
    except Exception as e:
        print(f"    WARNING: no se pudo cargar detalle de {icu_id}: {e}")
        return None


def fetch_wellness(oldest: str, newest: str) -> list[dict]:
    data = icu_get(f"/athlete/{ATHLETE_ID}/wellness", oldest=oldest, newest=newest)
    return data if isinstance(data, list) else []


# ─── Weekly aggregation ───────────────────────────────────────────────────────

def generate_weekly(summaries: list[dict], fitness_history: list[dict]) -> list[dict]:
    """Aggregate per-activity data into ISO week summaries with CTL/ATL/TSB."""
    from datetime import date as dt_date

    fitness_by_date = {f["date"]: f for f in fitness_history}

    weeks: dict[tuple, dict] = {}
    for s in summaries:
        start = s.get("startTime", "")
        if not start:
            continue
        try:
            d = datetime.fromisoformat(start[:10]).date()
        except ValueError:
            continue
        iso = d.isocalendar()
        key = (iso[0], iso[1])

        if key not in weeks:
            monday = dt_date.fromisocalendar(iso[0], iso[1], 1)
            sunday = monday + timedelta(days=6)
            weeks[key] = {
                "year": iso[0],
                "week": iso[1],
                "dateStart": str(monday),
                "dateEnd": str(sunday),
                "totalDuration": 0,
                "totalKcal": 0,
                "totalElevation": 0,
                "totalTSS": 0.0,
                "totalDistance": 0.0,
                "activityCount": 0,
                "bySport": {},
            }

        w = weeks[key]
        w["totalDuration"]  += int(s.get("duration", 0) or 0)
        w["totalKcal"]      += int(s.get("calories", 0) or 0)
        w["totalElevation"] += int(s.get("elevationGain", 0) or 0)
        w["totalTSS"]       += float(s.get("tss", 0) or 0)
        w["totalDistance"]  += float(s.get("distance", 0) or 0)
        w["activityCount"]  += 1

        sport = s.get("sport", "other")
        if sport not in w["bySport"]:
            w["bySport"][sport] = {"count": 0, "distance": 0.0, "duration": 0, "tss": 0.0}
        bs = w["bySport"][sport]
        bs["count"]    += 1
        bs["distance"] += float(s.get("distance", 0) or 0)
        bs["duration"] += int(s.get("duration", 0) or 0)
        bs["tss"]      += float(s.get("tss", 0) or 0)

    result = []
    prev_ctl: float | None = None

    for key in sorted(weeks.keys()):
        w = weeks[key]
        sunday = w["dateEnd"]

        # Find CTL/ATL/TSB for end of week (try Sunday → Saturday → ...)
        fitness = fitness_by_date.get(sunday)
        if not fitness:
            for delta in range(1, 8):
                fallback = str(datetime.fromisoformat(sunday) - timedelta(days=delta))[:10]
                if fallback in fitness_by_date:
                    fitness = fitness_by_date[fallback]
                    break

        ctl = float(fitness["ctl"]) if fitness and fitness.get("ctl") is not None else None
        atl = float(fitness["atl"]) if fitness and fitness.get("atl") is not None else None
        tsb = float(fitness["tsb"]) if fitness and fitness.get("tsb") is not None else None

        ramp = round(ctl - prev_ctl, 1) if ctl is not None and prev_ctl is not None else None
        if ctl is not None:
            prev_ctl = ctl

        w["ctl"]           = round(ctl, 1) if ctl is not None else None
        w["atl"]           = round(atl, 1) if atl is not None else None
        w["tsb"]           = round(tsb, 1) if tsb is not None else None
        w["rampRate"]      = ramp
        w["totalTSS"]      = round(w["totalTSS"])
        w["totalDistance"] = round(w["totalDistance"], 1)
        result.append(w)

    result.sort(key=lambda x: (x["year"], x["week"]), reverse=True)
    return result


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Sync Intervals.icu → Training Dashboard")
    parser.add_argument("--since",   type=str, default=None, help="Fecha más antigua (YYYY-MM-DD). Por defecto: 1 año atrás.")
    parser.add_argument("--limit",   type=int, default=None, help="Máximo de actividades a procesar (para pruebas)")
    parser.add_argument("--no-laps", action="store_true",    help="No descargar el detalle de laps (más rápido)")
    args = parser.parse_args()

    _check_credentials()

    newest = datetime.now().strftime("%Y-%m-%d")
    oldest = args.since or (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")

    print(f"Intervals.icu sync — {oldest} a {newest}")
    print(f"Athlete: {ATHLETE_ID}")

    # 1. Fetch activity list
    print("\nDescargando lista de actividades...")
    icu_acts = fetch_activity_list(oldest, newest)
    # Most recent first
    icu_acts.sort(key=lambda a: a.get("start_date_local", ""), reverse=True)
    if args.limit:
        icu_acts = icu_acts[:args.limit]
    print(f"  {len(icu_acts)} actividades encontradas")

    # 2. Process each activity
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    summaries: list[dict] = []
    skipped = 0

    for i, act in enumerate(icu_acts):
        summary = normalize_summary(act)
        act_id  = summary["id"]
        detail_path = DATA_DIR / f"activity_{act_id}.json"

        # Cache: skip if detail already exists
        if detail_path.exists():
            cached = load_json(detail_path)
            if cached:
                summaries.append({k: cached.get(k) for k in SUMMARY_KEYS if k in cached})
                skipped += 1
                continue

        # Fetch detail (laps)
        laps: list = []
        if not args.no_laps:
            icu_detail = fetch_activity_detail(act["id"])
            if icu_detail:
                raw_laps = icu_detail.get("laps") or icu_detail.get("icu_laps") or []
                laps = normalize_laps(raw_laps, summary["sport"])
            # Gentle rate limiting
            time.sleep(0.15)

        title = summary.get("title", "")[:40]
        print(f"  [{i+1}/{len(icu_acts)}] {act_id} {title}")

        detail = normalize_detail(summary, laps)
        save_json(detail_path, detail)
        summaries.append(summary)

    print(f"\n  {len(summaries) - skipped} nuevas · {skipped} del cache")

    # 3. Save activities.json
    save_json(DATA_DIR / "activities.json", summaries)
    print(f"activities.json → {len(summaries)} actividades")

    # 4. Fetch wellness (VO2Max, CTL/ATL/TSB)
    print("\nDescargando wellness (VO2Max, fitness)...")
    wellness_start = (datetime.now() - timedelta(days=730)).strftime("%Y-%m-%d")
    wellness_data = fetch_wellness(wellness_start, newest)

    vo2_history: list[dict] = []
    fitness_history: list[dict] = []

    for w in wellness_data:
        date = w.get("id")  # Intervals.icu uses the date as the record ID
        if not date:
            continue
        vo2 = w.get("vo2max")
        if vo2 is not None:
            vo2_history.append({"date": date, "value": round(float(vo2), 1)})
        ctl = w.get("ctl")
        atl = w.get("atl")
        if ctl is not None and atl is not None:
            form = w.get("form") or (float(ctl) - float(atl))
            fitness_history.append({
                "date": date,
                "ctl": round(float(ctl), 2),
                "atl": round(float(atl), 2),
                "tsb": round(float(form), 2),
                "tss": 0,
            })

    vo2_history.sort(key=lambda x: x["date"])
    fitness_history.sort(key=lambda x: x["date"])

    wellness_out = {
        "vo2maxHistory":  vo2_history,
        "fitnessHistory": fitness_history,
        "latestVo2max":   vo2_history[-1]["value"]   if vo2_history   else None,
        "latestCTL":      fitness_history[-1]["ctl"]  if fitness_history else None,
        "latestATL":      fitness_history[-1]["atl"]  if fitness_history else None,
        "latestTSB":      fitness_history[-1]["tsb"]  if fitness_history else None,
        "syncedAt": datetime.now().isoformat(),
    }
    save_json(DATA_DIR / "wellness.json", wellness_out)
    print(f"wellness.json → VO2Max: {wellness_out['latestVo2max']} · {len(fitness_history)} días de fitness")

    # 5. Weekly aggregation
    print("\nGenerando resumen semanal...")
    weekly = generate_weekly(summaries, fitness_history)
    save_json(DATA_DIR / "weekly.json", weekly)
    print(f"weekly.json → {len(weekly)} semanas")

    # 6. Save stats.json
    by_sport: dict[str, int] = {}
    for s in summaries:
        sp = s.get("sport", "other")
        by_sport[sp] = by_sport.get(sp, 0) + 1

    stats = {
        "totalActivities": len(summaries),
        "byType": by_sport,
        "vo2maxHistory": vo2_history,
        "syncedAt": datetime.now().isoformat(),
    }
    save_json(DATA_DIR / "stats.json", stats)
    print(f"stats.json → {len(summaries)} actividades totales")
    print("\nSync completado. Ejecuta 'npm run dev' para ver los datos.")


if __name__ == "__main__":
    main()
