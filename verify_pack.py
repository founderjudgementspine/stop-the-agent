#!/usr/bin/env python3
"""Judgement Spine — Proof Before Consequence Challenge (CLI verifier)

Usage:
  python verify_pack.py <PACK_FOLDER>

Example:
  python verify_pack.py ../sample_packs/L01_WIRE_RELEASE/JS_PROOF_PACK_L01_WIRE_RELEASE

This verifier checks:
  1) The pinned public key fingerprint (SHA-256 of SPKI DER)
  2) The manifest signature (RSA + SHA-256)
  3) SHA-256 hashes for every file in the signed manifest
"""

import base64
import hashlib
import json
import subprocess
import sys
from pathlib import Path

PINNED_KEY_FINGERPRINT = "dd9d33125dc660cd4bdee3e8ae6093ad17ab18b9fc3b7beecb05eed46f26fe0d"

def read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8")

def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()

def spki_fingerprint(public_key_pem: str) -> str:
    # Public key PEM is 'BEGIN PUBLIC KEY' (SPKI)
    lines = [ln.strip() for ln in public_key_pem.splitlines()
             if "BEGIN" not in ln and "END" not in ln and ln.strip()]
    der = base64.b64decode("".join(lines))
    return hashlib.sha256(der).hexdigest()

def verify_signature(pack_dir: Path) -> bool:
    pub = pack_dir / "public_key.pem"
    sig = pack_dir / "signature.sig"
    manifest = pack_dir / "manifest.json"

    # openssl dgst -sha256 -verify public_key.pem -signature signature.sig manifest.json
    try:
        r = subprocess.run(
            ["openssl", "dgst", "-sha256", "-verify", str(pub), "-signature", str(sig), str(manifest)],
            capture_output=True,
            text=True,
            check=False,
        )
        return "Verified OK" in (r.stdout + r.stderr)
    except FileNotFoundError:
        print("ERROR: openssl not found. Install OpenSSL to run the CLI verifier.")
        return False

def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2

    pack_dir = Path(sys.argv[1]).resolve()
    if not pack_dir.exists() or not pack_dir.is_dir():
        print(f"ERROR: not a folder: {pack_dir}")
        return 2

    manifest_path = pack_dir / "manifest.json"
    sig_path = pack_dir / "signature.sig"
    pub_path = pack_dir / "public_key.pem"

    for p in [manifest_path, sig_path, pub_path]:
        if not p.exists():
            print(f"ERROR: missing {p.name}")
            return 2

    pub_pem = read_text(pub_path)
    fp = spki_fingerprint(pub_pem)

    print(f"Pinned key fingerprint: {PINNED_KEY_FINGERPRINT}")
    print(f"Pack key fingerprint:   {fp}")

    if fp != PINNED_KEY_FINGERPRINT:
        print("FAIL: public key does not match pinned key fingerprint.")
        return 1

    sig_ok = verify_signature(pack_dir)
    print(f"Manifest signature:      {'VALID' if sig_ok else 'INVALID'}")
    if not sig_ok:
        print("FAIL: signature verification failed.")
        return 1

    manifest = json.loads(read_text(manifest_path))
    files = manifest.get("files", [])
    missing = []
    mismatched = []

    for entry in files:
        rel = entry.get("path")
        expected = (entry.get("sha256") or "").lower()
        if not rel:
            continue
        p = pack_dir / rel
        if not p.exists():
            missing.append(rel)
            continue
        got = sha256_file(p)
        if got != expected:
            mismatched.append(rel)

    if missing:
        shown = ", ".join(missing[:6]) + ("…" if len(missing) > 6 else "")
        print(f"FAIL: missing files: {shown}")

    if mismatched:
        shown = ", ".join(mismatched[:6]) + ("…" if len(mismatched) > 6 else "")
        print(f"FAIL: hash mismatch: {shown}")

    if missing or mismatched:
        return 1

    print("File hashes:             VALID (all files match signed manifest)")
    print("PASS: pack verifies.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
