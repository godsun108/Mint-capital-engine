"""Build deterministic, allowlisted customer archives without dependencies or credentials."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
STARTER = ROOT / 'products/foundry-express-ts'
OUT = ROOT / 'connect-demo/deliverables'
STARTER_FILES = ['README.md', 'package.json', 'tsconfig.json', '.env.example', 'src/server.ts']
COMPONENTS = ['api-launch-checklist', 'site-launch-checklist', 'ai-workflow-kit']


def archive(destination, files):
    destination.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(destination, 'w', compression=ZIP_DEFLATED) as z:
        for name, source in sorted(files.items()):
            entry = ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            entry.compress_type = ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            z.writestr(entry, source.read_bytes())
    return {'file': destination.relative_to(ROOT).as_posix(),
            'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
            'members': sorted(files)}


def build():
    starter = {name: STARTER / name for name in STARTER_FILES}
    bundle = {'README.md': OUT / 'mint-builder-launch-pack/README.md'}
    bundle.update({'foundry-express-ts/' + name: source for name, source in starter.items()})
    bundle.update({name + '/README.md': OUT / name / 'README.md' for name in COMPONENTS})
    return [archive(OUT / 'foundry-express-ts/foundry-express-ts-starter.zip', starter),
            archive(OUT / 'mint-builder-launch-pack/mint-builder-launch-pack.zip', bundle)]


if __name__ == '__main__':
    print(json.dumps({'schema': 'mint.customer-packages.v1', 'artifacts': build()}, indent=2))
