#!/usr/bin/env python3
"""Verify distributable ZIPs by decompressing all members and checking CRCs.

Run from any working directory: python3 connect-demo/verify-deliverables.py
Uses only the Python standard library and does not change artifacts.
"""
from pathlib import Path
from zipfile import ZipFile, BadZipFile

ROOT = Path(__file__).resolve().parent
ARCHIVES = (
    ROOT / "deliverables/foundry-express-ts/foundry-express-ts-starter.zip",
    ROOT / "deliverables/mint-builder-launch-pack/mint-builder-launch-pack.zip",
)


def verify(archive: Path) -> int:
    with ZipFile(archive) as z:
        names = z.namelist()
        if not names:
            raise ValueError(f"{archive.name}: empty archive")
        if len(names) != len(set(names)):
            raise ValueError(f"{archive.name}: duplicate filenames")
        for info in z.infolist():
            if info.is_dir():
                continue
            if info.filename.startswith("/") or ".." in Path(info.filename).parts:
                raise ValueError(f"{archive.name}: unsafe member path {info.filename!r}")
            # Reading every byte checks the stored CRC, not just the ZIP headers.
            with z.open(info) as member:
                while member.read(1024 * 1024):
                    pass
        print(f"PASS {archive.name}: {len(names)} members decompressed and CRC-checked")
        return len(names)


def main() -> None:
    total = 0
    for archive in ARCHIVES:
        if not archive.is_file():
            raise FileNotFoundError(archive)
        total += verify(archive)
    print(f"PASS {len(ARCHIVES)} archives, {total} members")


if __name__ == "__main__":
    main()
