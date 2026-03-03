#!/bin/bash
# Judgement Spine — Proof Before Consequence Challenge
# One‑click local server (macOS). Double‑click this file.

cd "$(dirname "$0")" || exit 1

PORT=8000

# Start a simple static server.
python3 -m http.server "$PORT" >/dev/null 2>&1 &
SERVER_PID=$!

# Open the challenge.
open "http://localhost:${PORT}/START_HERE.html" >/dev/null 2>&1

echo "Server running at http://localhost:${PORT}/START_HERE.html"
echo "Press Ctrl+C to stop." 

# Keep the script alive so the server stays up.
wait $SERVER_PID
