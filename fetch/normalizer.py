from __future__ import annotations
"""
Maps a Strava bulk-export activity (one activities.csv row + the parsed
contents of its original .fit/.gpx file) into the normalized JSON shape the
React frontend expects. See src/types/garmin.ts for the TypeScript types
that mirror these structures (the type file name is a legacy holdover from
when the data source was Garmin Connect; the JSON shape itself is unchanged).
"""

from datetime import datetime

CSV_SPORT_MAP = {
    "run": "running",
    "trail run": "running",
    "virtual run": "running",
    "ride": "cycling",
    "mountain bike ride": "cycling",
    "gravel ride": "cycling",
    "virtual ride": "cycling",
    "e-bike ride": "cycling",
    "e-mountain bike ride": "cycling",
    "velomobile": "cycling",
    "hand cycle": "cycling",
    "swim": "swimming",
}

FIT_SPORT_MAP = {
    "running": "running",
    "cycling": "cycling",
    "swimming": "swimming",
}


def _sport_from_fit(session: dict) -> str | None:
    sport = session.get("sport")
    return FIT_SPORT_MAP.get(sport.lower()) if isinstance(sport, str) else None


def _sport_from_csv(activity_type: str | None) -> str:
    return CSV_SPORT_MAP.get((activity_type or "").strip().lower(), "other")


def parse_activity_date(date_str: str | None) -> str | None:
    """Strava's Activity Date column looks like 'Mar 10, 2024, 6:03:02 PM' and
    reflects the athlete's local time (not UTC), matching the naive local
    datetime string the frontend expects. Also used by sync.py to sort/filter
    activities by date before parsing."""
    if not date_str:
        return None
    try:
        dt = datetime.strptime(date_str, "%b %d, %Y, %I:%M:%S %p")
        return dt.strftime("%Y-%m-%dT%H:%M:%S")
    except ValueError:
        return date_str  # unrecognized format — keep raw rather than crash


def _round1(value):
    return round(value, 1) if value is not None else None


def _avg_speed_ms(fields: dict) -> float:
    """avg_speed isn't always present — some devices/firmware only write
    enhanced_avg_speed, and a few (e.g. older Fenix watches) write neither,
    in which case it's derived from distance/time instead."""
    speed = fields.get("avg_speed") or fields.get("enhanced_avg_speed")
    if speed:
        return speed
    distance = fields.get("total_distance")
    duration = fields.get("total_timer_time") or fields.get("total_elapsed_time")
    if distance and duration:
        return distance / duration
    return 0


def normalize_summary(csv_row: dict, fit_session: dict) -> dict:
    """Builds the lightweight ActivitySummary from one activities.csv row
    plus the session-level fields of its parsed .fit file (empty dict if the
    activity has no file, e.g. a manually logged entry — every field then
    degrades gracefully to None/0)."""
    sport = _sport_from_fit(fit_session) or _sport_from_csv(csv_row.get("Activity Type"))

    avg_speed = _avg_speed_ms(fit_session)  # m/s
    avg_pace = round(1000 / avg_speed) if avg_speed > 0 else None

    avg_cadence = None
    if sport == "running":
        # Running cadence lives in avg_running_cadence on most Garmin devices
        # (avg_cadence is the legacy/cycling field); both are per-leg, so x2.
        raw_cadence = fit_session.get("avg_running_cadence") or fit_session.get("avg_cadence")
        if raw_cadence:
            avg_cadence = round(raw_cadence * 2)
    else:
        raw_cadence = fit_session.get("avg_cadence")
        if raw_cadence:
            avg_cadence = round(raw_cadence)

    calories = fit_session.get("total_calories")

    summary = {
        "id": int(csv_row["Activity ID"]),
        "title": csv_row.get("Activity Name") or "Untitled",
        "sport": sport,
        "startTime": parse_activity_date(csv_row.get("Activity Date")),
        "distance": round((fit_session.get("total_distance") or 0) / 1000, 2),  # km
        "duration": round(fit_session.get("total_elapsed_time") or 0),  # seconds
        "movingTime": round(fit_session.get("total_timer_time") or fit_session.get("total_elapsed_time") or 0),
        "elevationGain": round(fit_session.get("total_ascent") or 0),
        "avgHR": round(fit_session.get("avg_heart_rate") or 0),
        "maxHR": round(fit_session.get("max_heart_rate") or 0),
        "calories": round(calories) if calories is not None else None,
        "tss": None,  # not embedded in FIT; frontend estimates it from HR
        "avgPace": avg_pace,  # sec/km, running/swim only
        "avgSpeed": round(avg_speed * 3.6, 1) if avg_speed else None,  # km/h, cycling
        "avgPower": round(fit_session["avg_power"]) if fit_session.get("avg_power") else None,
        "normalizedPower": round(fit_session["normalized_power"]) if fit_session.get("normalized_power") else None,
        "avgCadence": avg_cadence,
        "vo2max": None,  # rolling fitness metric, not stored per-activity in FIT
        "aerobicTE": _round1(fit_session.get("total_training_effect")),
        "anaerobicTE": _round1(fit_session.get("total_anaerobic_training_effect")),
    }

    if sport == "swimming":
        summary["swolf"] = None
        summary["avgStrokesPerLength"] = None

    return summary


def normalize_detail(summary: dict, fit_data: dict, gpx_coords: list | None = None) -> dict:
    """Merges summary + parsed laps/GPS into the full ActivityDetail."""
    detail = dict(summary)

    laps_raw = fit_data.get("laps") or []
    detail["laps"] = _normalize_laps(laps_raw)

    # Zone bucketing depends on the maxHR stored in the browser's Settings,
    # which this script has no access to; the frontend already estimates
    # zones client-side from avgHR, so this stays empty.
    detail["hrZones"] = []

    detail["gpxCoords"] = fit_data.get("gpsCoords") or gpx_coords or []

    detail["avgStrideLength"] = None  # not embedded in standard FIT fields
    detail["trainingEffect"] = None

    if summary.get("sport") == "swimming":
        swolf_values = [lap["avg_swolf"] for lap in laps_raw if lap.get("avg_swolf")]
        if swolf_values:
            detail["swolf"] = round(sum(swolf_values) / len(swolf_values), 1)

    return detail


def _normalize_laps(laps_data: list) -> list:
    laps = []
    for i, lap in enumerate(laps_data):
        speed = _avg_speed_ms(lap)
        avg_pace = round(1000 / speed) if speed > 0 else None
        duration = lap.get("total_timer_time") or lap.get("total_elapsed_time") or 0
        laps.append({
            "index": i + 1,
            "distance": round((lap.get("total_distance") or 0) / 1000, 3),
            "duration": round(duration),
            "avgHR": round(lap["avg_heart_rate"]) if lap.get("avg_heart_rate") else None,
            "avgPace": avg_pace,
            "avgSpeed": round(speed * 3.6, 1) if speed else None,
            "avgPower": round(lap["avg_power"]) if lap.get("avg_power") else None,
            "elevationGain": round(lap.get("total_ascent") or 0),
        })
    return laps
