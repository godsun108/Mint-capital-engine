import hashlib
import importlib.util
import json
from pathlib import Path
import unittest
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('packages', ROOT / 'automation/build-customer-packages.py')
packages = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packages)


class CustomerPackages(unittest.TestCase):
    def test_catalog_delivery_contains_promised_files(self):
        for name in ['connect-demo/catalog.json', 'systems/commerce/catalog.json']:
            offers = json.loads((ROOT / name).read_text())['offers']
            for offer_id, prefix in [('foundry-express-ts-001', ''), ('mint-builder-launch-pack-005', 'foundry-express-ts/')]:
                mapping = offers[offer_id]['fulfillment']
                self.assertEqual(mapping['content_type'], 'application/zip')
                with ZipFile(ROOT / 'connect-demo' / mapping['path']) as z:
                    self.assertIsNone(z.testzip())
                    for file in packages.STARTER_FILES:
                        self.assertEqual(z.read(prefix + file), (packages.STARTER / file).read_bytes())
                    if prefix:
                        for component in packages.COMPONENTS:
                            self.assertEqual(z.read(component + '/README.md'), (packages.OUT / component / 'README.md').read_bytes())
                    expected = {prefix + file for file in packages.STARTER_FILES}
                    if prefix:
                        expected |= {'README.md'} | {c + '/README.md' for c in packages.COMPONENTS}
                    self.assertEqual(set(z.namelist()), expected)

    def test_committed_packages_match_reproducible_build(self):
        paths = [packages.OUT / 'foundry-express-ts/foundry-express-ts-starter.zip', packages.OUT / 'mint-builder-launch-pack/mint-builder-launch-pack.zip']
        before = [hashlib.sha256(p.read_bytes()).hexdigest() for p in paths]
        after = [a['sha256'] for a in packages.build()]
        self.assertEqual(before, after, 'Committed archives do not match current source')
        self.assertEqual(after, [a['sha256'] for a in packages.build()])


if __name__ == '__main__':
    unittest.main()
