@echo off
REM Judgement Spine — Proof Before Consequence Challenge
REM One‑click local server (Windows). Double‑click this file.

cd /d %~dp0
set PORT=8000

start "" http://localhost:%PORT%/START_HERE.html
python -m http.server %PORT%
