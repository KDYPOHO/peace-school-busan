"""Compare a Capacitor package or copied public directory with the tracked web source."""

from hashlib import sha256
from pathlib import Path
from sys import argv
from zipfile import ZipFile


def hashes(directory):
    return {
        path.relative_to(directory).as_posix(): sha256(path.read_bytes()).hexdigest()
        for path in directory.rglob("*")
        if path.is_file()
    }


source = Path(__file__).resolve().parents[1] / "www"
artifact = Path(argv[1])
expected = hashes(source)
if artifact.is_dir():
    actual = hashes(artifact)
else:
    prefix = "base/assets/public/" if artifact.suffix == ".aab" else "assets/public/"
    with ZipFile(artifact) as archive:
        actual = {
            entry.filename.removeprefix(prefix): sha256(archive.read(entry)).hexdigest()
            for entry in archive.infolist()
            if entry.filename.startswith(prefix) and not entry.is_dir()
        }

# Capacitor writes these two wrapper files into the copied public folder.
extra = actual.keys() - expected.keys() - {"cordova.js", "cordova_plugins.js"}
mismatches = sorted(path for path, digest in expected.items() if actual.get(path) != digest)
if mismatches or extra:
    raise SystemExit(f"Missing or different: {mismatches}\nUnexpected: {sorted(extra)}")
print(f"{len(expected)} web assets matched SHA-256 in {artifact}")
