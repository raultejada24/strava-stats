from __future__ import annotations
"""
Low-level parsing of the raw activity files found inside a Strava bulk
export's activities/ folder. Strava preserves the original file uploaded by
the recording device, so for this project that's almost always a .fit file
written by either the Garmin watch or Magene's OnelapFit app ("Share Fit").

Field names below follow Garmin's published FIT SDK profile (Session/Lap/
Record messages) — the same profile Magene's OnelapFit writes to.
"""

import io
import xml.etree.ElementTree as ET

SEMICIRCLE_TO_DEGREES = 180 / 2 ** 31


def _deg(value):
    return None if value is None else value * SEMICIRCLE_TO_DEGREES


def _downsample(coords: list, max_points: int = 500) -> list:
    if len(coords) > max_points:
        step = len(coords) // max_points
        coords = coords[::step]
    return coords


def _message_to_dict(msg) -> dict:
    return {field.name: field.value for field in msg}


def parse_fit(raw_bytes: bytes, include_gps: bool = True) -> dict:
    """Returns {"session": {...}, "laps": [...], "gpsCoords": [[lat,lon],...]}.
    Only the first session is read; multi-sport (brick) FIT files aren't
    supported since neither of this project's devices records those."""
    from fitparse import FitFile

    fitfile = FitFile(io.BytesIO(raw_bytes))

    session: dict = {}
    for msg in fitfile.get_messages('session'):
        session = _message_to_dict(msg)
        break

    laps = [_message_to_dict(msg) for msg in fitfile.get_messages('lap')]

    gps_coords = []
    if include_gps:
        for msg in fitfile.get_messages('record'):
            lat = lon = None
            for field in msg:
                if field.name == 'position_lat':
                    lat = _deg(field.value)
                elif field.name == 'position_long':
                    lon = _deg(field.value)
            if lat is not None and lon is not None:
                gps_coords.append([lat, lon])
        gps_coords = _downsample(gps_coords)

    return {"session": session, "laps": laps, "gpsCoords": gps_coords}


def parse_gpx(raw_bytes: bytes) -> list:
    """Extracts [[lat, lon], ...] track points from a .gpx file. GPX-sourced
    activities (rare for this project's two FIT-writing devices) fall back
    to the CSV row for HR/power/laps since GPX extensions aren't parsed."""
    try:
        root = ET.fromstring(raw_bytes)
    except ET.ParseError:
        return []

    coords = []
    for el in root.iter():
        if el.tag.endswith('trkpt'):
            lat, lon = el.get('lat'), el.get('lon')
            if lat is not None and lon is not None:
                coords.append([float(lat), float(lon)])

    return _downsample(coords)
