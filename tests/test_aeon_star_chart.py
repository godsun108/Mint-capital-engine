"""Standard-library checks for AEON sky-chart metadata and catalog guardrails.

Run: python -m unittest discover -s tests -p 'test_aeon_star_chart.py'
No catalog download, network access, or manufacturing authorization needed.
"""
import importlib.util
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

SCRIPT = Path(__file__).resolve().parents[1] / "automation" / "aeon-star-chart.py"
spec = importlib.util.spec_from_file_location("aeon_star_chart", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class AeonChartTests(unittest.TestCase):
    def test_utc_instants(self):
        expected = {"origin": "1993-12-06T23:05:00+00:00", "becoming": "2026-12-06T20:05:00+00:00"}
        for name, local, tz, lat, lon in module.SCENES:
            with self.subTest(name=name):
                actual = datetime.fromisoformat(local).replace(tzinfo=ZoneInfo(tz)).astimezone(ZoneInfo("UTC")).isoformat()
                self.assertEqual(actual, expected[name])
                self.assertTrue(-90 <= lat <= 90)
                self.assertTrue(-180 <= lon <= 180)

    def test_catalog_required_columns(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "bad.csv"
            path.write_text("name,ra_deg,dec_deg\nVega,279,38\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "missing columns"):
                module.read_catalog(path)

    def test_catalog_rejects_invalid_coordinates(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "invalid.csv"
            path.write_text(
                "name,ra_deg,dec_deg,pm_ra_mas_per_year,pm_dec_mas_per_year,epoch_jyear,mag\n"
                "Fake,361,30,0,0,2000,2\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Invalid RA/Dec"):
                module.read_catalog(path)

    def test_catalog_valid_record(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "valid.csv"
            path.write_text(
                "name,ra_deg,dec_deg,pm_ra_mas_per_year,pm_dec_mas_per_year,epoch_jyear,mag\n"
                "Test star,279.23,38.78,200,300,2000,0.03\n", encoding="utf-8")
            stars = module.read_catalog(path)
            self.assertEqual(len(stars), 1)
            self.assertEqual(stars[0]["name"], "Test star")


if __name__ == "__main__":
    unittest.main()
