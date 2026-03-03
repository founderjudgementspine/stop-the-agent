#!/usr/bin/env bash
# Judgement Spine — Proof Before Consequence Challenge
# One‑command local server (Linux/macOS).

set -euo pipefail
cd "$(dirname "$0")"
PORT=8000
python3 -m http.server "$PORT"
