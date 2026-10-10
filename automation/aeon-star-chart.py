#!/usr/bin/env python3
"""AEON sky chart renderer. Requires astropy and an independently sourced star catalog.

Usage: python automation/aeon-star-chart.py --catalog stars.csv --out-dir output/aeon
CSV columns: name,ra_deg,dec_deg,pm_ra_mas_per_year,pm_dec_mas_per_year,epoch_jyear,mag
RA/Dec ICRS; pm_ra is mu_alpha*cos(dec). Catalog provenance must be documented.
No catalog is bundled. Never treat synthetic or mockup positions as observations.
"""
import argparse
import csv
import html
import json
from pathlib import Path

SCENES = [
    ("origin", "1993-12-06T15:05:00", "America/Los_Angeles", 36.1699, -115.1398),
    ("becoming", "2026-12-06T15:05:00", "America/New_York", 27.2730, -80.3582),
]

def read_catalog(path):
    stars = []
    with open(path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        required = {"name", "ra_deg", "dec_deg", "pm_ra_mas_per_year", "pm_dec_mas_per_year", "epoch_jyear", "mag"}
        if not reader.fieldnames or not required.issubset(reader.fieldnames):
            raise ValueError("Catalog missing columns: " + ", ".join(sorted(required - set(reader.fieldnames or []))))
        for row in reader:
            obj = {"name": row["name"]}
            for key in required - {"name"}:
                obj[key] = float(row[key])
            if not 0 <= obj["ra_deg"] < 360 or not -90 <= obj["dec_deg"] <= 90:
                raise ValueError("Invalid RA/Dec for " + obj["name"])
            stars.append(obj)
    if not stars:
        raise ValueError("Star catalog is empty")
    return stars

def render(scene, stars, out_dir, max_mag):
    from astropy import units as u
    from astropy.coordinates import AltAz, EarthLocation, SkyCoord
    from astropy.time import Time
    from datetime import datetime
    from zoneinfo import ZoneInfo
    name, local_str, zone, lat, lon = scene
    dt = datetime.fromisoformat(local_str).replace(tzinfo=ZoneInfo(zone))
    t = Time(dt)
    site = EarthLocation(lat=lat*u.deg, lon=lon*u.deg, height=0*u.m)
    frame = AltAz(obstime=t, location=site, pressure=0*u.hPa)
    plotted = []
    for star in stars:
        if star["mag"] > max_mag:
            continue
        coord = SkyCoord(
            ra=star["ra_deg"]*u.deg, dec=star["dec_deg"]*u.deg,
            pm_ra_cosdec=star["pm_ra_mas_per_year"]*u.mas/u.yr,
            pm_dec=star["pm_dec_mas_per_year"]*u.mas/u.yr,
            distance=1e6*u.pc, obstime=Time(star["epoch_jyear"], format="jyear"), frame="icrs")
        apparent = coord.apply_space_motion(new_obstime=t).transform_to(frame)
        az, alt = float(apparent.az.deg), float(apparent.alt.deg)
        if alt < 0:
            continue
        plotted.append({"name": star["name"], "az_deg": round(az, 5), "alt_deg": round(alt, 5), "mag": star["mag"]})
    plotted.sort(key=lambda p: (p["mag"], p["name"]))
    r, cx, cy = 320, 400, 400
    import math
    circles = []
    for s in plotted:
        rr = r*(90-s["alt_deg"])/90
        theta = math.radians(s["az_deg"])
        x, y = cx+rr*math.sin(theta), cy-rr*math.cos(theta)
        size = max(1.5, min(5, 5-s["mag"]*0.6))
        circles.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{size:.2f}" fill="#e7c996"><title>{html.escape(s["name"])}</title></circle>')
    title = "THE ORIGIN" if name == "origin" else "THE BECOMING"
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 880">
<rect width="800" height="880" fill="#14151a"/>
<text x="400" y="44" text-anchor="middle" font-family="serif" font-size="30" fill="#d6a45c">{title}</text>
<text x="400" y="75" text-anchor="middle" font-size="16" fill="#d6a45c">{local_str} · {zone}</text>
<circle cx="400" cy="400" r="320" fill="none" stroke="#d6a45c" stroke-width="2"/>
<circle cx="400" cy="400" r="160" fill="none" stroke="#6c5842" stroke-dasharray="4 8"/>
<path d="M400 80V720 M80 400H720" stroke="#6c5842" stroke-dasharray="4 8"/>
<g fill="#d6a45c" font-size="18" text-anchor="middle"><text x="400" y="107">N</text><text x="400" y="709">S</text><text x="97" y="390">W</text><text x="703" y="390">E</text></g>
{''.join(circles)}
<text x="400" y="770" text-anchor="middle" fill="#e7c996" font-size="15">Zenith at center · horizon at ring · geometric altitude</text>
<text x="400" y="802" text-anchor="middle" fill="#e7c996" font-size="14">Stars above horizon, including stars hidden by daylight</text>
</svg>'''
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir/f"{name}-fixed-stars.svg").write_text(svg, encoding="utf-8")
    (out_dir/f"{name}-fixed-stars.json").write_text(json.dumps({
        "scene":name, "local":local_str, "timezone":zone, "utc":dt.astimezone(ZoneInfo("UTC")).isoformat(),
        "observer":{"lat":lat,"lon":lon,"height_m":0}, "catalog":"user-supplied",
        "max_magnitude":max_mag, "above_horizon_count":len(plotted), "stars":plotted,
        "notes":["Not visible-sky claim: local afternoon", "No planets or constellation lines in this file"]
    },indent=2)+"\n",encoding="utf-8")
    print(name, len(plotted), "above-horizon stars")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--catalog", required=True, type=Path)
    ap.add_argument("--out-dir", required=True, type=Path)
    ap.add_argument("--max-mag", type=float, default=5.5)
    args = ap.parse_args()
    stars = read_catalog(args.catalog)
    for scene in SCENES:
        render(scene, stars, args.out_dir, args.max_mag)

if __name__ == "__main__":
    main()
