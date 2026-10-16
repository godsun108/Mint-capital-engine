# Reproducible AEON fixed-star sky charts

The script `automation/aeon-star-chart.py` calculates the two observer-centered fixed-star charts for 1993 Las Vegas and 2026 Port St. Lucie. **No star catalog is included or verified yet, and the output has not been run against a real catalog.** It intentionally fails if no catalog is supplied.

Install `astropy` in an isolated environment, and obtain a legally reusable, documented ICRS catalog with the exact columns `name,ra_deg,dec_deg,pm_ra_mas_per_year,pm_dec_mas_per_year,epoch_jyear,mag`. Proper-motion RA means mu_alpha cos(dec). Record the source URL, release, licensing, magnitude selection and any transformations used to produce the CSV. Missing proper motions should be explicitly recorded as assumptions, not invented.

Run:
```sh
python automation/aeon-star-chart.py --catalog path/to/verified-stars.csv --out-dir output/aeon
```

Output is one editable SVG and one JSON per sky. The projection is azimuthal equidistant, north up, east right, zenith center, horizon rim. It plots only above-horizon stars; this is **not a nighttime-visibility chart** because both timestamps are afternoon. The star chart excludes solar-system bodies; planetary overlay requires independent verification and shared projection rules. Apparent atmospheric refraction is disabled.

Checks before manufacturing: (1) verify timezone conversion 1993-12-06 23:05 UTC and 2026-12-06 20:05 UTC; (2) verify representative star positions with independent software; (3) confirm exact catalog rights; (4) validate star count and preserve a reproducible artifact hash; (5) simplify final chart for thread thickness and digitize with an embroidery vendor. The 33 decorative stars are a separate artistic motif and must not be confused with astronomical data points.

This script requires no paid provider or supplier, but may require installing free Python dependencies. No sample or product publication is authorized.
