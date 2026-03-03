/*
  Judgement Spine — Proof Before Consequence Challenge
  Pure static HTML/CSS/JS (no build). Designed for GitHub Pages / Vercel.
*/

(function(){
  const APP = document.getElementById('app');

  // --- Configuration -------------------------------------------------------

  const LEVELS = [
    {
      id: 'L03',
      code: 'L03_CEO_COMMS_PUBLISH',
      tag: 'Identity & Representation',
      title: 'CEO Message / Public Comms Publish',
      blurb: 'An agent is about to publish “as the CEO”. Your job: stop the blast radius, route the authority, and mint proof before the message goes live.',
      timeLimitSec: 60,
      packReal: 'sample_packs/L03_CEO_COMMS_PUBLISH/JS_PROOF_PACK_L03_CEO_COMMS_PUBLISH',
      packAlt:  'sample_packs/L03_CEO_COMMS_PUBLISH/JS_PROOF_PACK_L03_CEO_COMMS_PUBLISH_ALT'
    },
    {
      id: 'L02',
      code: 'L02_BLACK_FRIDAY_SWITCH',
      tag: 'Commerce & Reliability',
      title: 'Black Friday Checkout Switch',
      blurb: 'The agent wants to route 100% of checkout traffic. You have seconds to enforce canaries, rollback invariants, and approvals — before revenue becomes a “learning”.',
      timeLimitSec: 60,
      packReal: 'sample_packs/L02_BLACK_FRIDAY_SWITCH/JS_PROOF_PACK_L02_BLACK_FRIDAY_SWITCH',
      packAlt:  'sample_packs/L02_BLACK_FRIDAY_SWITCH/JS_PROOF_PACK_L02_BLACK_FRIDAY_SWITCH_ALT'
    },
    {
      id: 'L01',
      code: 'L01_WIRE_RELEASE',
      tag: 'Finance & Irreversibility',
      title: 'Wire Release (Irreversible Transfer)',
      blurb: 'An agent is about to release a multi‑million dollar wire. This is where “oops” becomes a headline. Decide correctly — then prove the record can’t be rewritten.',
      timeLimitSec: 60,
      packReal: 'sample_packs/L01_WIRE_RELEASE/JS_PROOF_PACK_L01_WIRE_RELEASE',
      packAlt:  'sample_packs/L01_WIRE_RELEASE/JS_PROOF_PACK_L01_WIRE_RELEASE_ALT'
    }
  ];

  const OUTCOMES = [
    {key:'ALLOW', label:'ALLOW', help:'Ship it. No constraints.'},
    {key:'ALLOW WITH BOUNDS', label:'ALLOW WITH BOUNDS', help:'Ship it — but only inside explicit limits.'},
    {key:'ESCALATE', label:'ESCALATE', help:'Route to named authority before execution.'},
    {key:'BLOCK', label:'BLOCK', help:'Stop. Not safe / not authorised.'},
    {key:'SAFE DEGRADE', label:'SAFE DEGRADE', help:'De‑risk by downgrading capability (read‑only / draft‑only).'}
  ];

  // --- State --------------------------------------------------------------

  const state = {
    screen: 'HOME',
    level: null,
    evidence: null,
    startedAt: null,
    deadline: null,
    timer: null,
    step: 0,
    progress: 0,
    assignment: null,
    selectedPackKey: 'A',
    verifyResult: null,
    runElapsedMs: null,
    flag: null,
    streak: {},
    feed: []
  };

  // --- Utilities ----------------------------------------------------------

  function escapeHtml(str){
    return String(str)
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#039;');
  }

  function now(){ return Date.now(); }

  function shuffle(arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  function formatTime(ms){
    const s = Math.max(0, ms/1000);
    const mm = Math.floor(s/60);
    const ss = Math.floor(s%60);
    const ms2 = Math.floor((s - Math.floor(s))*10);
    return mm>0 ? `${mm}:${String(ss).padStart(2,'0')}.${ms2}` : `${ss}.${ms2}s`;
  }

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function setScreen(screen){
    state.screen = screen;
    render();
  }

  function addFeed(kind, text){
    const ts = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
    state.feed.push({kind, ts, text});
    if(state.feed.length > 120) state.feed.shift();
    const el = document.getElementById('feed');
    if(el){
      el.innerHTML = state.feed.map(line => {
        const cls = line.kind ? `line ${line.kind}` : 'line';
        return `<div class="${cls}"><span class="muted">${escapeHtml(line.ts)}</span> ${escapeHtml(line.text)}</div>`;
      }).join('');
      el.scrollTop = el.scrollHeight;
    }
  }

  async function copyToClipboard(text){
    try{
      await navigator.clipboard.writeText(text);
      return true;
    }catch(e){
      try{
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        return true;
      }catch(_){
        return false;
      }
    }
  }

  function baseUrlFor(path){
    // Always resolve relative paths correctly on GitHub Pages subpaths.
    return new URL(path.replace(/^\//,''), window.location.href);
  }

  // --- Evidence pack loading ---------------------------------------------

  async function fetchJson(path){
    const url = baseUrlFor(path);
    const res = await fetch(url);
    if(!res.ok) throw new Error(`Failed to fetch ${path} (${res.status})`);
    return await res.json();
  }

  async function loadEvidence(level){
    // Reads the canonical evidence pack (real) and uses it as the source of truth
    // for what “correct” means in the mission.
    const evidencePath = `${level.packReal}/EVIDENCE/evidence_pack.json`;
    return await fetchJson(evidencePath);
  }

  // --- Timer --------------------------------------------------------------

  function stopTimer(){
    if(state.timer){
      clearInterval(state.timer);
      state.timer = null;
    }
  }

  function startTimer(seconds){
    stopTimer();
    state.startedAt = now();
    state.deadline = state.startedAt + seconds*1000;

    const tick = () => {
      const remaining = state.deadline - now();
      const tValue = document.getElementById('tValue');
      const tBar = document.getElementById('tBar');
      if(tValue){ tValue.textContent = formatTime(remaining); }
      if(tBar){
        const pct = clamp( (1 - (remaining/(seconds*1000))) * 100, 0, 100);
        tBar.style.width = `${pct}%`;
        tBar.style.background = remaining < 12000 ? 'rgba(255,92,108,.65)' : 'rgba(61,255,181,.55)';
      }
      if(remaining <= 0){
        stopTimer();
        failRun('⏱️ Time expired. The agent executed before you proved control.');
      }
    };

    tick();
    state.timer = setInterval(tick, 90);
  }

  function elapsedMs(){
    if(!state.startedAt) return 0;
    return now() - state.startedAt;
  }

  // --- Mission logic ------------------------------------------------------

  function beginLevel(level){
    state.level = level;
    state.evidence = null;
    state.step = 0;
    state.progress = 0;
    state.assignment = null;
    state.selectedPackKey = 'A';
    state.verifyResult = null;
    state.runElapsedMs = null;
    state.flag = null;
    state.feed = [];

    setScreen('LOADING');

    loadEvidence(level)
      .then(ev => {
        state.evidence = ev;
        setScreen('MISSION');
        startTimer(level.timeLimitSec);
        seedFeed(level, ev);
      })
      .catch(err => {
        console.error(err);
        setScreen('ERROR');
      });
  }

  function seedFeed(level, ev){
    addFeed('warn', `AUTOPILOT: proposed action queued (${level.code}).`);
    addFeed('', `Context: ${ev.system_context?.system || 'system'} • env=${ev.system_context?.environment || 'prod'} • time=${ev.system_context?.timestamp_utc || '—'}`);

    if(ev.proposed_action){
      const pa = ev.proposed_action;
      const details = Object.entries(pa)
        .filter(([k,_]) => ['action_type','amount_usd','currency','destination','change','channel','audience_size','target','risk_tier'].includes(k))
        .map(([k,v]) => `${k}=${v}`)
        .join(' • ');
      addFeed('', `Proposed: ${details || JSON.stringify(pa)}`);
    }

    addFeed('warn', 'Signal: high‑impact execution boundary detected.');
    addFeed('', 'Rule: proof must be minted before consequence.');
    addFeed('', 'Your move…');
  }

  function correctOutcome(){
    const ev = state.evidence;
    const outcome = ev?.decision?.outcome || '';
    return String(outcome).toUpperCase();
  }

  function onPickOutcome(outcome){
    const correct = correctOutcome();
    addFeed('', `You chose: ${outcome}`);

    if(outcome.toUpperCase() !== correct){
      // Make it visceral.
      addFeed('bad', `WRONG. Autopilot would proceed under ${outcome}.`);
      let consequence = '';
      if(state.level.id === 'L02') consequence = 'Checkout route flips at full blast radius. Revenue becomes an experiment.';
      if(state.level.id === 'L03') consequence = 'A public statement ships under the CEO identity with no accountable authority chain.';
      if(state.level.id === 'L01') consequence = 'Funds leave the building. There is no undo.';
      failRun(`❌ Wrong call: ${outcome}. ${consequence}`);
      return;
    }

    // Correct.
    addFeed('ok', `Correct. Outcome matches doctrine: ${correct}.`);
    state.step = 1;
    render();
  }

  function buildQuiz(){
    const ev = state.evidence;
    const lvl = state.level;

    // Build level-specific quiz prompts based on the canonical evidence pack.
    if(lvl.id === 'L01'){
      const required = (ev.authority_chain?.required_approvals || []).map(String);
      const options = shuffle([...new Set([
        ...required,
        'General Counsel',
        'Head of Comms',
        'VP Engineering',
        'SRE On‑Call',
        'Board Chair'
      ])]);
      return {
        title: 'Second lock: authority chain',
        description: 'A BLOCK is only defensible if the authority chain is explicit. Select the required approvers for this action.',
        type: 'checkbox',
        requiredSet: new Set(required),
        options: options.map(r => ({
          key: r,
          label: r,
          hint: required.includes(r) ? 'Required by the authority contract.' : 'Not required for this event.'
        }))
      };
    }

    if(lvl.id === 'L02'){
      const bounds = ev.decision?.bounds || {};
      const approvals = (ev.authority_chain?.required_approvals || []).map(String);

      const canaryCorrect = String(bounds.canary_percent);
      const rampCorrect = String(bounds.max_ramp_percent);

      return {
        title: 'Second lock: bound the blast radius',
        description: 'Set the canary and max ramp, then route approvals. (This is the difference between a deploy and an incident.)',
        type: 'mixed',
        fields: [
          {
            id:'canary',
            kind:'radio',
            label:'Canary traffic',
            correct: canaryCorrect,
            options: shuffle(['1','5','10','25','50','100']).map(v => ({value:v, label:`${v}%`}))
          },
          {
            id:'ramp',
            kind:'radio',
            label:'Max ramp',
            correct: rampCorrect,
            options: shuffle(['10','25','50','100']).map(v => ({value:v, label:`${v}%`}))
          },
          {
            id:'approvals',
            kind:'checkbox',
            label:'Required approvers',
            correctSet: new Set(approvals),
            options: shuffle([...new Set([...approvals,'CEO','CFO','General Counsel','Head of Comms','Product Manager'])]).map(v => ({value:v, label:v}))
          }
        ]
      };
    }

    if(lvl.id === 'L03'){
      const bounds = ev.decision?.bounds || {};
      const escalationTo = (ev.decision?.escalation_to || []).map(String);

      const modeCorrect = String(bounds.publish_mode || 'draft_only');
      const reachCorrect = String(bounds.max_reach_percent);
      const discCorrect = String(bounds.auto_disclaimer);

      return {
        title: 'Second lock: representation controls',
        description: 'Identity/representation mistakes are reputationally irreversible. Lock reach, lock mode, route authority.',
        type: 'mixed',
        fields: [
          {
            id:'mode',
            kind:'radio',
            label:'Publish mode',
            correct: modeCorrect,
            options: shuffle([
              {value:'publish_now', label:'Publish now'},
              {value:'draft_only', label:'Draft only'},
              {value:'schedule', label:'Schedule'}
            ])
          },
          {
            id:'reach',
            kind:'radio',
            label:'Max reach',
            correct: reachCorrect,
            options: shuffle(['1','5','10','25','100']).map(v => ({value:v, label:`${v}%`}))
          },
          {
            id:'disc',
            kind:'radio',
            label:'Auto disclaimer',
            correct: discCorrect,
            options: shuffle([
              {value:'true', label:'On (required)'},
              {value:'false', label:'Off'}
            ])
          },
          {
            id:'escalation',
            kind:'checkbox',
            label:'Escalate to',
            correctSet: new Set(escalationTo),
            options: shuffle([...new Set([...escalationTo,'VP Engineering','SRE On‑Call','CFO','Board Chair'])]).map(v => ({value:v, label:v}))
          }
        ]
      };
    }

    return null;
  }

  function onSubmitQuiz(){
    const quiz = buildQuiz();
    if(!quiz) return;

    const container = document.getElementById('quiz');
    if(!container) return;

    let ok = true;
    let problems = [];

    if(quiz.type === 'checkbox'){
      const chosen = new Set(Array.from(container.querySelectorAll('input[type=checkbox]:checked')).map(i => i.value));
      const required = quiz.requiredSet;
      for(const v of required){ if(!chosen.has(v)) ok = false; }
      for(const v of chosen){ if(!required.has(v)) ok = false; }
      if(!ok) problems.push('Approvals do not match the authority chain.');
    }

    if(quiz.type === 'mixed'){
      for(const field of quiz.fields){
        if(field.kind === 'radio'){
          const picked = container.querySelector(`input[name="${field.id}"]:checked`)?.value;
          if(String(picked) !== String(field.correct)){
            ok = false;
            problems.push(`${field.label} incorrect.`);
          }
        }
        if(field.kind === 'checkbox'){
          const chosen = new Set(Array.from(container.querySelectorAll(`input[name="${field.id}"]:checked`)).map(i => i.value));
          const required = field.correctSet;
          for(const v of required){ if(!chosen.has(v)) ok = false; }
          for(const v of chosen){ if(!required.has(v)) ok = false; }
          if(!ok) problems.push(`${field.label} incorrect.`);
        }
      }
    }

    if(!ok){
      addFeed('bad', 'Second lock failed. Wrong bounds/authority.');
      failRun(`❌ Not defensible yet. ${problems.join(' ')}`);
      return;
    }

    addFeed('ok', 'Second lock complete. Authority + bounds enforced.');
    addFeed('', 'Minting proof pack…');
    state.step = 2;
    render();

    // Small dramatic delay.
    setTimeout(() => {
      addFeed('ok', 'Proof pack minted. Now prove it can’t be forged.');
      startVerifyStep();
    }, 900);
  }

  function startVerifyStep(){
    state.step = 3;
    state.verifyResult = null;

    // Randomise which pack is A/B so the challenge is not “guessable”.
    const pair = shuffle([
      {key:'REAL', path: state.level.packReal, label:'Pack A'},
      {key:'ALT',  path: state.level.packAlt,  label:'Pack B'}
    ]);

    // Ensure A/B labels.
    const assignment = {
      A: pair[0],
      B: pair[1]
    };
    assignment.A.label = 'Pack A';
    assignment.B.label = 'Pack B';

    state.assignment = assignment;
    state.selectedPackKey = 'A';

    render();
  }

  function succeedRun(flag){
    stopTimer();
    state.runElapsedMs = elapsedMs();
    state.flag = flag;
    state.streak[state.level.id] = true;
    setScreen('WIN');
  }

  function failRun(message){
    stopTimer();
    state.runElapsedMs = elapsedMs();
    state.failMessage = message;
    setScreen('FAIL');
  }

  // --- WebCrypto verification --------------------------------------------

  function pemToArrayBuffer(pem){
    const b64 = pem
      .replace(/-----BEGIN PUBLIC KEY-----/g,'')
      .replace(/-----END PUBLIC KEY-----/g,'')
      .replace(/\s+/g,'');
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  function bufToHex(buf){
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  async function sha256Hex(buf){
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return bufToHex(digest);
  }

  async function fetchBuf(path){
    const url = baseUrlFor(path);
    const res = await fetch(url);
    if(!res.ok) throw new Error(`Fetch failed: ${path} (${res.status})`);
    return await res.arrayBuffer();
  }

  async function fetchText(path){
    const url = baseUrlFor(path);
    const res = await fetch(url);
    if(!res.ok) throw new Error(`Fetch failed: ${path} (${res.status})`);
    return await res.text();
  }

  async function verifyPack(packPath, onProgress){
    const manifestPath = `${packPath}/manifest.json`;
    const sigPath = `${packPath}/signature.sig`;
    const keyPath = `${packPath}/public_key.pem`;

    const [manifestBuf, sigBuf, keyPem] = await Promise.all([
      fetchBuf(manifestPath),
      fetchBuf(sigPath),
      fetchText(keyPath)
    ]);

    const spki = pemToArrayBuffer(keyPem);
    const pubkey = await crypto.subtle.importKey(
      'spki',
      spki,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigOk = await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' },
      pubkey,
      sigBuf,
      manifestBuf
    );

    if(!sigOk){
      return { ok:false, stage:'signature', reason:'Signature check failed. Manifest was modified (or key mismatch).' };
    }

    const manifestText = new TextDecoder().decode(manifestBuf);
    const manifest = JSON.parse(manifestText);

    const mismatches = [];

    let i = 0;
    for(const file of manifest.files){
      i++;
      if(onProgress) onProgress({phase:'hash', index:i, total:manifest.files.length, path:file.path});
      const buf = await fetchBuf(`${packPath}/${file.path}`);
      const hash = await sha256Hex(buf);
      if(hash !== file.sha256){
        mismatches.push({path:file.path, expected:file.sha256, got:hash});
      }
    }

    const manifestHash = await sha256Hex(manifestBuf);

    if(mismatches.length){
      return { ok:false, stage:'hash', reason:'At least one file hash does not match the signed manifest.', mismatches, manifestHash };
    }

    return { ok:true, stage:'ok', manifestHash };
  }

  async function onVerifySelected(){
    if(location.protocol === 'file:'){
      state.verifyResult = { ok:false, stage:'local', reason:'This page must be served over http(s) for verification (GitHub Pages / Vercel). Use RUN_LOCAL.command or deploy the folder.' };
      render();
      return;
    }

    const pick = state.selectedPackKey;
    const selected = state.assignment?.[pick];
    if(!selected) return;

    const status = document.getElementById('verifyStatus');
    if(status) status.textContent = 'Verifying…';

    addFeed('', `VERIFY: checking ${pick === 'A' ? 'Pack A' : 'Pack B'}…`);

    try{
      state.verifyResult = null;
      render();

      const res = await verifyPack(selected.path, (p) => {
        const label = document.getElementById('verifyStatus');
        const bar = document.getElementById('verifyBar');
        if(label){
          label.textContent = `Hashing (${p.index}/${p.total}) ${p.path}`;
        }
        if(bar){
          bar.style.width = `${Math.floor((p.index/p.total)*100)}%`;
        }
      });

      state.verifyResult = res;

      if(res.ok){
        addFeed('ok', 'VERIFY: PASS. Proof pack is intact & signed.');

        // Flag is derived from the signed manifest hash (shareable, unique per run).
        const flag = `JS{${res.manifestHash.slice(0,10).toUpperCase()}}`;
        succeedRun(flag);
      }else{
        addFeed('bad', `VERIFY: FAIL (${res.stage}).`);
        render();
      }

    }catch(err){
      console.error(err);
      state.verifyResult = { ok:false, stage:'error', reason: String(err.message || err) };
      render();
    }
  }

  // --- Rendering ----------------------------------------------------------

  function layout(inner){
    APP.innerHTML = `
      <div class="shell">
        <div class="topbar">
          <div class="brand">
            <img src="assets/JudgementSpine_Logo_WhiteOnBlack.png" alt="Judgement Spine" />
            <div class="name">Judgement Spine</div>
          </div>
          <div class="chip">Proof Before Consequence™</div>
        </div>
        ${inner}
      </div>
    `;
  }

  function renderHome(){
    layout(`
      <div class="hero">
        <h1 class="h-title">Proof Before Consequence<br/>Challenge</h1>
        <p class="h-sub">
          A moment‑that‑matters game: an agent is about to execute something irreversible.
          You have <b>60 seconds</b> to choose the right control outcome — then you must <b>verify</b> the evidence pack can’t be forged.
        </p>

        <div class="kpi-row">
          <div class="kpi"><div class="k">Format</div><div class="v">Human vs Autopilot</div></div>
          <div class="kpi"><div class="k">Finish</div><div class="v">Capture the flag</div></div>
          <div class="kpi"><div class="k">Proof</div><div class="v">Signed evidence pack</div></div>
          <div class="kpi"><div class="k">Time</div><div class="v">~2 minutes</div></div>
        </div>

        <div class="row">
          <div class="col panel">
            <h3>What makes it a challenge?</h3>
            <p>
              You’re not “reading about governance”. You’re <b>making the call</b> under a countdown,
              then proving the record is <b>tamper‑evident</b>. If you can’t defend your decision and prove integrity,
              you lose — even if the story sounds good.
            </p>
            <div class="actions">
              <button class="btn primary" id="startBtn">Start the challenge</button>
              <a class="btn ghost" href="README.md" target="_blank" rel="noopener">Read the kit</a>
            </div>
          </div>

          <div class="col panel">
            <h3>How to play</h3>
            <p>
              1) Pick a level.<br/>
              2) Choose the correct outcome (<span style="color:var(--muted)">ALLOW / ALLOW WITH BOUNDS / ESCALATE / BLOCK / SAFE DEGRADE</span>).<br/>
              3) Lock authority + bounds.<br/>
              4) Verify which proof pack is authentic — and grab your flag.
            </p>
            <div class="footer-note">
              Tip: Use keys <kbd>1</kbd>–<kbd>5</kbd> to answer fast.
            </div>
          </div>
        </div>
      </div>

      <div style="height:16px"></div>

      <div class="panel">
        <h3>Pick your moment</h3>
        <p>Start with the one that makes you feel the risk in your gut. Finish all 3 to earn the trilogy badge.</p>
        <div class="grid" id="levelGrid"></div>
      </div>

      <div class="footer-note">
        Built to be shareable: screenshot your flag, post your time, and challenge a friend.
      </div>
    `);

    document.getElementById('startBtn')?.addEventListener('click', () => setScreen('SELECT'));

    const grid = document.getElementById('levelGrid');
    if(grid){
      grid.innerHTML = LEVELS.map(l => `
        <div class="card" data-level="${l.code}">
          <div class="tag">${escapeHtml(l.tag)}</div>
          <div class="title">${escapeHtml(l.title)}</div>
          <div class="desc">${escapeHtml(l.blurb)}</div>
          <div class="meta">
            <span class="pill">${l.timeLimitSec}s clock</span>
            <span class="pill">Proof pack</span>
            <span class="pill">Flag</span>
          </div>
        </div>
      `).join('');

      grid.querySelectorAll('.card').forEach(el => {
        el.addEventListener('click', () => {
          const code = el.getAttribute('data-level');
          const level = LEVELS.find(x => x.code === code);
          if(level) beginLevel(level);
        });
      });
    }
  }

  function renderSelect(){
    layout(`
      <div class="panel">
        <h3>Choose a level</h3>
        <p>Pick a scenario. The timer starts as soon as the mission screen loads.</p>
        <div class="grid" id="levelGrid"></div>
        <div class="actions" style="margin-top:14px">
          <button class="btn" id="backHome">Back</button>
        </div>
      </div>
    `);

    document.getElementById('backHome')?.addEventListener('click', () => setScreen('HOME'));

    const grid = document.getElementById('levelGrid');
    if(grid){
      grid.innerHTML = LEVELS.map(l => `
        <div class="card" data-level="${l.code}">
          <div class="tag">${escapeHtml(l.tag)}</div>
          <div class="title">${escapeHtml(l.title)}</div>
          <div class="desc">${escapeHtml(l.blurb)}</div>
          <div class="meta">
            <span class="pill">${l.timeLimitSec}s</span>
            <span class="pill">${escapeHtml(l.id)}</span>
          </div>
        </div>
      `).join('');

      grid.querySelectorAll('.card').forEach(el => {
        el.addEventListener('click', () => {
          const code = el.getAttribute('data-level');
          const level = LEVELS.find(x => x.code === code);
          if(level) beginLevel(level);
        });
      });
    }
  }

  function renderLoading(){
    layout(`
      <div class="panel">
        <h3>Loading</h3>
        <p>Pulling the canonical evidence pack…</p>
      </div>
    `);
  }

  function renderError(){
    layout(`
      <div class="panel">
        <h3>Couldn’t load the kit</h3>
        <p>
          This page needs to be served over http(s) (GitHub Pages / Vercel) so it can load the sample proof packs.
          If you opened it as a local file, run the included <b>RUN_LOCAL</b> script.
        </p>
        <div class="actions">
          <button class="btn" id="backHome">Back</button>
        </div>
      </div>
    `);
    document.getElementById('backHome')?.addEventListener('click', () => setScreen('HOME'));
  }

  function missionHeader(){
    return `
      <div class="hud">
        <div>
          <div style="font-size:12px; letter-spacing:.10em; text-transform:uppercase; color:rgba(255,255,255,.75)">${escapeHtml(state.level.tag)} • ${escapeHtml(state.level.id)}</div>
          <div style="font-size:22px; font-weight:900; margin-top:6px">${escapeHtml(state.level.title)}</div>
          <div style="margin-top:6px; color:var(--muted); font-size:13px; max-width:820px">${escapeHtml(state.level.blurb)}</div>
        </div>
        <div>
          <div class="timer">
            <div>
              <div class="t-label">Time left</div>
              <div class="t-value" id="tValue">—</div>
              <div class="progress"><div id="tBar"></div></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderMission(){
    const ev = state.evidence;

    const correct = correctOutcome();

    layout(`
      ${missionHeader()}

      <div class="mission">
        <div class="panel">
          <h3>Live execution feed</h3>
          <div class="feed" id="feed"></div>

          <div class="quiz" id="missionBody">
            ${state.step === 0 ? `
              <h4>Decision lock (Step 1/3)</h4>
              <p style="color:var(--muted); margin:0 0 12px; font-size:13px">
                Autopilot is ready to execute. Pick the correct doctrine outcome — fast.
              </p>
              <div class="choice-grid">
                ${OUTCOMES.map((o, idx) => `
                  <button class="btn" data-outcome="${o.key}"><span style="opacity:.7">${idx+1}.</span> ${escapeHtml(o.label)} <span style="opacity:.7">— ${escapeHtml(o.help)}</span></button>
                `).join('')}
              </div>
            ` : ''}

            ${state.step === 1 ? renderQuizHtml(buildQuiz()) : ''}

            ${state.step === 2 ? `
              <h4>Proof lock (Step 3/3)</h4>
              <p style="color:var(--muted); margin:0 0 12px; font-size:13px">
                Minted. Now verify which evidence pack is authentic. One has been tampered.
              </p>
              <div class="result">Preparing verification…</div>
            ` : ''}

            ${state.step === 3 ? renderVerifyHtml() : ''}
          </div>
        </div>

        <div class="panel">
          <h3>The point</h3>
          <p>
            Most systems give you logs <i>after</i> the blast radius.
            Judgement Spine gives you a decision surface <b>before</b> consequence — and mints portable evidence you can verify.
          </p>

          <div style="margin-top:12px; border-top:1px solid rgba(255,255,255,.10); padding-top:12px">
            <p style="margin:0; color:var(--muted); font-size:13px">
              Canonical outcome for this level (hidden in the proof pack):
              <span style="color:rgba(255,255,255,.9); font-weight:800">${escapeHtml(correct)}</span>
            </p>
          </div>

          <div class="actions" style="margin-top:14px">
            <button class="btn" id="abortBtn">Abort & restart</button>
            <a class="btn ghost" href="${state.level.packReal}/EXPORTS/BOARD_VIEW.pdf" target="_blank" rel="noopener">Open evidence view</a>
          </div>

          <div class="footer-note">
            If you want to really stress‑test it: download a proof pack zip, change a single byte, and try to keep verification green.
          </div>
        </div>
      </div>
    `);

    // Seed feed DOM.
    const feedEl = document.getElementById('feed');
    if(feedEl){
      feedEl.innerHTML = state.feed.map(line => {
        const cls = line.kind ? `line ${line.kind}` : 'line';
        return `<div class="${cls}"><span class="muted">${escapeHtml(line.ts)}</span> ${escapeHtml(line.text)}</div>`;
      }).join('');
      feedEl.scrollTop = feedEl.scrollHeight;
    }

    // Bind events.
    document.getElementById('abortBtn')?.addEventListener('click', () => {
      stopTimer();
      setScreen('SELECT');
    });

    // Step 1 outcome buttons.
    APP.querySelectorAll('button[data-outcome]').forEach(btn => {
      btn.addEventListener('click', () => onPickOutcome(btn.getAttribute('data-outcome')));
    });

    // Step 2 submit.
    document.getElementById('quizSubmit')?.addEventListener('click', onSubmitQuiz);

    // Step 3 verify.
    document.getElementById('verifyBtn')?.addEventListener('click', onVerifySelected);

    APP.querySelectorAll('input[name="packPick"]').forEach(r => {
      r.addEventListener('change', (e) => {
        state.selectedPackKey = e.target.value;
      });
    });

    // Keyboard shortcuts.
    window.onkeydown = (e) => {
      if(state.screen !== 'MISSION') return;
      if(state.step !== 0) return;
      const n = parseInt(e.key, 10);
      if(n>=1 && n<=5){
        const o = OUTCOMES[n-1];
        if(o) onPickOutcome(o.key);
      }
    };
  }

  function renderQuizHtml(quiz){
    if(!quiz) return '';

    if(quiz.type === 'checkbox'){
      return `
        <h4>${escapeHtml(quiz.title)} (Step 2/3)</h4>
        <p style="color:var(--muted); margin:0 0 12px; font-size:13px">${escapeHtml(quiz.description)}</p>
        <div id="quiz">
          ${quiz.options.map(o => `
            <label class="opt">
              <input type="checkbox" value="${escapeHtml(o.key)}" />
              <div>
                <div class="t">${escapeHtml(o.label)}</div>
                <div class="s">${escapeHtml(o.hint)}</div>
              </div>
            </label>
          `).join('')}
        </div>
        <div class="actions" style="margin-top:12px">
          <button class="btn primary" id="quizSubmit">Lock it in</button>
        </div>
      `;
    }

    if(quiz.type === 'mixed'){
      return `
        <h4>${escapeHtml(quiz.title)} (Step 2/3)</h4>
        <p style="color:var(--muted); margin:0 0 12px; font-size:13px">${escapeHtml(quiz.description)}</p>
        <div id="quiz">
          ${quiz.fields.map(f => renderField(f)).join('')}
        </div>
        <div class="actions" style="margin-top:12px">
          <button class="btn primary" id="quizSubmit">Lock it in</button>
        </div>
      `;
    }

    return '';
  }

  function renderField(field){
    if(field.kind === 'radio'){
      return `
        <div style="margin-bottom:10px">
          <div style="font-size:12px; letter-spacing:.10em; text-transform:uppercase; color:rgba(255,255,255,.75)">${escapeHtml(field.label)}</div>
          <div style="margin-top:8px; display:grid; gap:8px">
            ${field.options.map(o => {
              const v = (typeof o === 'string') ? o : o.value;
              const label = (typeof o === 'string') ? o : o.label;
              return `
                <label class="opt">
                  <input type="radio" name="${escapeHtml(field.id)}" value="${escapeHtml(v)}" />
                  <div>
                    <div class="t">${escapeHtml(label)}</div>
                  </div>
                </label>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    if(field.kind === 'checkbox'){
      return `
        <div style="margin-bottom:10px">
          <div style="font-size:12px; letter-spacing:.10em; text-transform:uppercase; color:rgba(255,255,255,.75)">${escapeHtml(field.label)}</div>
          <div style="margin-top:8px; display:grid; gap:8px">
            ${field.options.map(o => `
              <label class="opt">
                <input type="checkbox" name="${escapeHtml(field.id)}" value="${escapeHtml(o.value)}" />
                <div>
                  <div class="t">${escapeHtml(o.label)}</div>
                </div>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    }

    return '';
  }

  function renderVerifyHtml(){
    const a = state.assignment?.A;
    const b = state.assignment?.B;
    const res = state.verifyResult;

    const packCard = (key, p) => `
      <label class="opt">
        <input type="radio" name="packPick" value="${key}" ${state.selectedPackKey===key?'checked':''} />
        <div>
          <div class="t">${p.label}</div>
          <div class="s">One is authentic. One has been altered. Verify to find out.</div>
        </div>
      </label>
    `;

    const resultHtml = !res ? '' : (res.ok ? `
      <div class="result ok"><b>PASS</b> — ${escapeHtml(res.reason || 'Evidence pack verifies.')}</div>
    ` : `
      <div class="result bad"><b>FAIL</b> — ${escapeHtml(res.reason || 'Verification failed.')}${res.mismatches && res.mismatches.length ? `<div style="margin-top:10px; font-family:var(--mono); font-size:12px">First mismatch: <span style="color:rgba(255,255,255,.9)">${escapeHtml(res.mismatches[0].path)}</span></div>`:''}</div>
    `);

    return `
      <h4>Capture the flag (Step 3/3)</h4>
      <p style="color:var(--muted); margin:0 0 12px; font-size:13px">
        Two proof packs. Same story. One was tampered. Only one verifies.
      </p>

      <div style="display:grid; gap:10px">
        ${a ? packCard('A', a) : ''}
        ${b ? packCard('B', b) : ''}
      </div>

      <div class="actions" style="margin-top:12px">
        <button class="btn primary" id="verifyBtn">Verify selected pack</button>
        <a class="btn ghost" href="${state.level.packReal}/EXPORTS/VERIFY_IN_30_SECONDS.pdf" target="_blank" rel="noopener">How verification works</a>
      </div>

      <div class="progress" style="margin-top:10px"><div id="verifyBar"></div></div>
      <div id="verifyStatus" style="margin-top:8px; font-family:var(--mono); font-size:12px; color:var(--muted)">Ready.</div>

      ${resultHtml}
    `;
  }

  function renderWin(){
    const lvl = state.level;
    const t = formatTime(state.runElapsedMs || 0);

    const allDone = LEVELS.every(l => state.streak[l.id]);

    const shareText = `I beat the Proof Before Consequence Challenge — ${lvl.title} in ${t}. Flag ${state.flag}.`;

    layout(`
      <div class="hero">
        <h1 class="h-title">You stopped the agent.</h1>
        <p class="h-sub">And you proved the record can’t be rewritten.</p>

        <div class="kpi-row">
          <div class="kpi"><div class="k">Level</div><div class="v">${escapeHtml(lvl.id)}</div></div>
          <div class="kpi"><div class="k">Time</div><div class="v">${escapeHtml(t)}</div></div>
          <div class="kpi"><div class="k">Flag</div><div class="v" style="font-family:var(--mono)">${escapeHtml(state.flag)}</div></div>
          <div class="kpi"><div class="k">Verified</div><div class="v">PASS</div></div>
        </div>

        <div class="row">
          <div class="col panel">
            <h3>Download the proof pack</h3>
            <p>
              This is the same artifact a board, regulator, or incident review would consume.
              It includes a signed manifest and the evidence views.
            </p>
            <div class="actions">
              <a class="btn primary" href="${lvl.packReal}.zip" download>Download proof pack (.zip)</a>
              <a class="btn" href="${lvl.packReal}/EXPORTS/BOARD_VIEW.pdf" target="_blank" rel="noopener">Open Board view</a>
              <a class="btn" href="${lvl.packReal}/EXPORTS/REGULATOR_VIEW.pdf" target="_blank" rel="noopener">Open Regulator view</a>
            </div>
          </div>

          <div class="col panel">
            <h3>Share your run</h3>
            <p>
              Post your flag + time. Ask someone to beat you.
              (This is what made Wordle spread — results you can share without spoilers.)
            </p>
            <div class="actions">
              <button class="btn" id="copyShare">Copy share text</button>
              <button class="btn" id="copyFlag">Copy flag</button>
              <button class="btn ghost" id="playAgain">Play another level</button>
            </div>

            <div class="badge-row">
              <img src="assets/JudgementSpine_ProofPack_Badge.png" alt="Proof Pack Badge" />
              <div>
                <div style="font-weight:800">Proof Pack badge</div>
                <div style="color:var(--muted); font-size:12px; margin-top:4px">Downloadable, postable. Earned by verification.</div>
              </div>
            </div>

            ${allDone ? `
              <div class="result ok" style="margin-top:14px">
                <b>Trilogy complete.</b> You cleared all 3 moments that matter.
              </div>
            ` : ''}

          </div>
        </div>

        <div class="footer-note">
          Want this for your own agentic automations? The differentiator is simple:
          <b>execution‑time decisions</b> + <b>portable, verifiable proof</b>.
        </div>
      </div>
    `);

    document.getElementById('copyShare')?.addEventListener('click', async () => {
      const ok = await copyToClipboard(shareText);
      addToast(ok ? 'Copied.' : 'Copy failed.');
    });

    document.getElementById('copyFlag')?.addEventListener('click', async () => {
      const ok = await copyToClipboard(state.flag);
      addToast(ok ? 'Flag copied.' : 'Copy failed.');
    });

    document.getElementById('playAgain')?.addEventListener('click', () => setScreen('SELECT'));

    // Optional: native share.
    if(navigator.share){
      // Not adding a visible button to keep the UI clean.
    }
  }

  function renderFail(){
    const lvl = state.level;
    const t = formatTime(state.runElapsedMs || 0);

    layout(`
      <div class="hero">
        <h1 class="h-title">You lost the moment.</h1>
        <p class="h-sub">That’s the point: execution doesn’t wait for process.</p>

        <div class="result bad">
          <b>${escapeHtml(lvl ? lvl.title : 'Challenge')}</b><br/>
          ${escapeHtml(state.failMessage || 'Failed.')}
        </div>

        <div class="kpi-row">
          <div class="kpi"><div class="k">Elapsed</div><div class="v">${escapeHtml(t)}</div></div>
          <div class="kpi"><div class="k">Fix</div><div class="v">Try again</div></div>
          <div class="kpi"><div class="k">Goal</div><div class="v">Proof before consequence</div></div>
        </div>

        <div class="actions">
          <button class="btn primary" id="retryBtn">Retry level</button>
          <button class="btn" id="pickOther">Pick another</button>
          <a class="btn ghost" href="README.md" target="_blank" rel="noopener">Read the kit</a>
        </div>

        <div class="footer-note">
          Tip: the “correct” answer is inside the signed evidence pack. The challenge is whether you can get there fast — and prove it.
        </div>
      </div>
    `);

    document.getElementById('retryBtn')?.addEventListener('click', () => {
      if(state.level) beginLevel(state.level);
      else setScreen('SELECT');
    });
    document.getElementById('pickOther')?.addEventListener('click', () => setScreen('SELECT'));
  }

  function addToast(text){
    const toast = document.createElement('div');
    toast.textContent = text;
    toast.style.position = 'fixed';
    toast.style.bottom = '18px';
    toast.style.right = '18px';
    toast.style.padding = '10px 12px';
    toast.style.border = '1px solid rgba(255,255,255,.18)';
    toast.style.borderRadius = '14px';
    toast.style.background = 'rgba(0,0,0,.6)';
    toast.style.color = 'rgba(255,255,255,.9)';
    toast.style.boxShadow = '0 18px 60px rgba(0,0,0,.55)';
    toast.style.zIndex = '9999';
    document.body.appendChild(toast);
    setTimeout(()=>toast.remove(), 1600);
  }

  function render(){
    if(state.screen === 'HOME') return renderHome();
    if(state.screen === 'SELECT') return renderSelect();
    if(state.screen === 'LOADING') return renderLoading();
    if(state.screen === 'ERROR') return renderError();
    if(state.screen === 'MISSION') return renderMission();
    if(state.screen === 'WIN') return renderWin();
    if(state.screen === 'FAIL') return renderFail();
    return renderHome();
  }

  // --- Boot ---------------------------------------------------------------

  render();

})();
