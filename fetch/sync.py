#!/usr/bin/env python3
from __future__ import annotations
"""
Strava bulk-export → local JSON sync script.

Strava's developer API now requires a paid subscription, so this reads the
free account data export instead (Settings → "Download or Delete Your
Account" → "Request Your Archive"). Strava emails a download link, usually
within a few hours (longer for large accounts). That export already
contains every activity from every device that uploads to your Strava
account (Garmin Connect, Magene's OnelapFit, manual uploads, etc.), so no
live API access is needed at all.

Usage:
    python sync.py --export ~/Downloads/export_12345.zip
    python sync.py --export ~/Downloads/export_12345.zip --limit 20
    python sync.py --export ~/Downloads/export_12345.zip --since 2024-01-01
    python sync.py --export ~/Downloads/export_12345.zip --no-gpx

--export accepts either the .zip directly or an already-unzipped folder. If
omitted, falls back to STRAVA_EXPORT_PATH in ../.env.

Output: ../public/data/activities.json + ../public/data/activity_{id}.json
"""

import argparse
import csv
import gzip
import io
import json
import os
import sys
import zipfile
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

from fit_reader import parse_fit, parse_gpx
from normalizer import normalize_detail, normalize_summary, parse_activity_date

# Windows consoles often default to cp1252, which can't encode the arrows
# used in the progress messages below and would otherwise crash mid-run.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv(Path(__file__).parent.parent / ".env")

SUMMARY_KEYS = [
    "id", "title", "sport", "startTime", "distance", "duration", "movingTime",
    "elevationGain", "avgHR", "maxHR", "calories", "tss", "avgPace", "avgSpeed",
    "avgPower", "normalizedPower", "avgCadence", "vo2max", "aerobicTE",
    "anaerobicTE", "swolf", "avgStrokesPerLength",
]


class Export:
    """Reads activities.csv + activities/ files from either a Strava export
    .zip (read directly, no extraction needed) or an already-unzipped folder.
    Strava sometimes wraps the contents in a top-level folder when zipped, so
    this locates activities.csv wherever it actually is rather than assuming
    a fixed layout."""

    def __init__(self, path: Path):
        self.zip = zipfile.ZipFile(path) if path.is_file() else None
        self.dir = None if self.zip else path
        self.base = self._find_base()

    def _find_base(self) -> str:
        if self.zip:
            for name in self.zip.namelist():
                if name.endswith("activities.csv"):
                    return name[: -len("activities.csv")]
            raise FileNotFoundError("activities.csv not found inside the export zip")
        for candidate in self.dir.rglob("activities.csv"):
            rel = candidate.parent.relative_to(self.dir)
            return "" if str(rel) == "." else str(rel).replace("\\", "/") + "/"
        raise FileNotFoundError(f"activities.csv not found under {self.dir}")

    def read(self, relative_path: str) -> bytes:
        full = self.base + relative_path
        if self.zip:
            return self.zip.read(full)
        return (self.dir / full).read_bytes()

    def read_csv_rows(self) -> list:
        text = self.read("activities.csv").decode("utf-8-sig")
        return list(csv.DictReader(io.StringIO(text)))


def read_activity_file(export: Export, filename: str) -> tuple[bytes, str]:
    """Returns (raw_bytes, extension) for an activities/ filename from the
    CSV's Filename column, transparently un-gzipping. Strava's Filename
    column is occasionally wrong about the .gz suffix, so both are tried."""
    base = filename[:-3] if filename.endswith(".gz") else filename

    last_error: Exception | None = None
    for candidate in (base + ".gz", base):
        try:
            raw = export.read(candidate)
        except (KeyError, FileNotFoundError) as e:
            last_error = e
            continue
        if candidate.endswith(".gz"):
            raw = gzip.decompress(raw)
        return raw, Path(base).suffix.lower()

    raise FileNotFoundError(f"could not read {filename} (tried .gz and plain): {last_error}")


def process_activity(export: Export, row: dict, include_gps: bool) -> tuple[dict, dict]:
    filename = (row.get("Filename") or "").strip()
    fit_data = {"session": {}, "laps": [], "gpsCoords": []}
    gpx_coords: list = []

    if filename:
        try:
            raw, ext = read_activity_file(export, filename)
        except FileNotFoundError as e:
            print(f"  WARNING: {e}")
            raw, ext = None, None

        if ext == ".fit":
            fit_data = parse_fit(raw, include_gps=include_gps)
        elif ext == ".gpx" and include_gps:
            gpx_coords = parse_gpx(raw)
        # .tcx or anything else: no dedicated parser; falls back to the CSV row only

    summary = normalize_summary(row, fit_data.get("session", {}))
    full = normalize_detail(summary, fit_data, gpx_coords)
    return summary, full


def save_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))


def main():
    parser = argparse.ArgumentParser(description="Convert a Strava bulk export into local JSON")
    parser.add_argument("--export", type=str, default=os.getenv("STRAVA_EXPORT_PATH"),
                         help="Path to the Strava export .zip, or an already-unzipped folder")
    parser.add_argument("--limit", type=int, default=None, help="Max activities to process (for testing)")
    parser.add_argument("--since", type=str, default=None, help="Only process activities on/after this date (YYYY-MM-DD)")
    parser.add_argument("--no-gpx", action="store_true", help="Skip extracting GPS tracks (faster)")
    args = parser.parse_args()

    if not args.export:
        print("ERROR: Pass --export <path-to-export.zip> or set STRAVA_EXPORT_PATH in .env")
        sys.exit(1)

    export_path = Path(args.export).expanduser()
    if not export_path.exists():
        print(f"ERROR: {export_path} does not exist")
        sys.exit(1)

    try:
        export = Export(export_path)
    except (zipfile.BadZipFile, FileNotFoundError) as e:
        print(f"ERROR: Could not read the export at {export_path}: {e}")
        sys.exit(1)

    output_dir = Path(__file__).parent.parent / "public" / "data"
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Reading export from {export_path}...")
    rows = export.read_csv_rows()
    print(f"Found {len(rows)} activities in the export.")

    for row in rows:
        row["_date"] = parse_activity_date(row.get("Activity Date")) or ""
    rows.sort(key=lambda r: r["_date"], reverse=True)

    if args.since:
        rows = [r for r in rows if r["_date"] >= args.since]
    if args.limit:
        rows = rows[: args.limit]

    print(f"Processing {len(rows)} activities...")
    summaries = []
    for i, row in enumerate(rows):
        activity_id = (row.get("Activity ID") or "").strip()
        if not activity_id:
            continue

        detail_path = output_dir / f"activity_{activity_id}.json"

        if detail_path.exists():
            cached = json.loads(detail_path.read_text(encoding="utf-8"))
            summaries.append({k: cached.get(k) for k in SUMMARY_KEYS if k in cached})
            continue

        print(f"  [{i+1}/{len(rows)}] Parsing {activity_id} ({row.get('Activity Name', '')})...")
        try:
            summary, full = process_activity(export, row, include_gps=not args.no_gpx)
            save_json(detail_path, full)
            summaries.append(summary)
        except Exception as e:
            print(f"  WARNING: failed to process activity {activity_id}: {e}")

    save_json(output_dir / "activities.json", summaries)
    print(f"\nSaved {len(summaries)} activities → public/data/activities.json")

    stats = compute_stats(summaries)
    save_json(output_dir / "stats.json", stats)
    print("Saved stats → public/data/stats.json")
    print("Run 'npm run dev' to open the app.")


def compute_stats(summaries: list) -> dict:
    """Compute global stats that don't change per-activity."""
    by_sport: dict = {}
    for s in summaries:
        sport = s.get("sport", "other")
        by_sport.setdefault(sport, []).append(s)

    vo2max_history = [
        {"date": s["startTime"][:10], "value": s["vo2max"]}
        for s in summaries
        if s.get("vo2max") and s.get("startTime")
    ]
    vo2max_history.sort(key=lambda x: x["date"])

    return {
        "totalActivities": len(summaries),
        "byType": {sport: len(acts) for sport, acts in by_sport.items()},
        "vo2maxHistory": vo2max_history,
        "syncedAt": datetime.now().isoformat(),
    }


if __name__ == "__main__":
    main()
