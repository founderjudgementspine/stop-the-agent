# Judgement Spine — Proof Before Consequence™ Challenge (Public)

A **moment‑that‑matters** game.

An AI agent is about to execute something irreversible.

Your job:
1) Make the **execution‑time** call under a countdown.
2) Enforce **authority + bounds**.
3) **Verify** the evidence pack can’t be forged.
4) Capture the flag.

This kit is 100% static (HTML/CSS/JS + sample packs). No build step.

---

## Quick start

### Option A — Hosted (recommended)
Deploy the folder to GitHub Pages / Vercel / Netlify. Then open:

- `START_HERE.html`

### Option B — Run locally (one click)
Because the challenge needs to load sample packs, it should be served over **http(s)**.

- **macOS:** double‑click `RUN_LOCAL.command`
- **Windows:** double‑click `RUN_LOCAL.bat`
- **Linux/macOS (terminal):** `./RUN_LOCAL.sh`

---

## How to play

Inside `START_HERE.html`:

1) Pick a level (CEO Comms, Black Friday Switch, Wire Release).
2) **Step 1:** choose the correct outcome:
   - `ALLOW` / `ALLOW WITH BOUNDS` / `ESCALATE` / `BLOCK` / `SAFE DEGRADE`
3) **Step 2:** lock the authority chain and the bounds.
4) **Step 3:** verify which proof pack is authentic (one is tampered). If you verify the real one, you get a flag.

Keyboard: use keys **1–5** to answer Step 1 fast.

---

## What’s inside

- `START_HERE.html` — the interactive challenge
- `sample_packs/` — three signed proof packs (+ one “ALT” pack per level that is tampered)
- `verifier/verify_pack.py` — offline verifier (optional)
- `assets/` — logo + badge
- `press_kit/` — social card

---

## Bonus: Expert mode (try to forge proof)

If you want a *real* security challenge:

> Try to change an evidence pack (decision, bounds, PDFs, anything)… **and still pass verification**.

If you can do it responsibly, email **founder@judgementspine.com**.

---

## License / usage

This is a public demo kit. You can:
- host it
- share it
- remix the copy

If you want a commercial license for customer deployments, reach out.
