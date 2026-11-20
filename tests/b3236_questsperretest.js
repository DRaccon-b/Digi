// 3.2.36 (Review 20.11.): kurze Sperren dürfen den Quest-Autopiloten nicht ganz stoppen
//  sperre: nur noch eine Quest offen (First Steps: Kunemon), ihr einziges Jagdgebiet ist leer -> nach HUNT_IDLE_MS
//          5 min gemieden (avoidSpots). Vorher: questTasks leer -> „keine machbaren Quests mehr – Bot gestoppt“.
//          Jetzt: Bot bleibt an und wartet auf die freigegebene Aufgabe.
//  leer:   wirklich nichts mehr zu tun (alle Quests abgegeben) -> Bot stoppt weiterhin.
// Aufruf: node tests/b3236_questsperretest.js <script>   (startet jedes Szenario als eigenen Prozess)
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const scriptPath = path.resolve(process.argv[2]);
const only = process.argv[3];
const NAMES = ['sperre', 'leer'];

if (!only) {
  const runs = NAMES.map((n) => new Promise((res) => {
    const c = spawn(process.execPath, [__filename, scriptPath, n], { cwd: __dirname });
    let out = ''; c.stdout.on('data', (d) => { out += d; }); c.stderr.on('data', (d) => { out += d; });
    const to = setTimeout(() => { out += 'Zeitlimit'; c.kill(); }, 120000);
    c.on('close', (code) => { clearTimeout(to); res({ n, ok: code === 0, out: out.trim() }); });
  }));
  Promise.all(runs).then((rs) => {
    for (const r of rs) console.log(`${r.ok ? 'OK    ' : 'FEHLER'} ${r.n}: ${r.out.split('\n').pop()}`);
    const bad = rs.filter((r) => !r.ok);
    console.log(bad.length ? `FEHLER – ${bad.length} von ${rs.length} Szenarien` : `OK – alle ${rs.length} Szenarien`);
    process.exit(bad.length ? 1 : 0);
  });
  return;
}

const makeWorld = require('./gw');
const script = fs.readFileSync(scriptPath, 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CFG = { autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 10, huntIdleMin: 0.05 };
const logText = (G) => G.w.document.querySelector('.digibot__log')?.textContent || '';
const start = (G) => G.w.document.querySelector('[data-act="bot"]').click();
const done = (ok, info) => { console.log(`${ok ? 'OK' : 'FEHLER'} – ${info}`); process.exit(ok ? 0 : 1); };
async function until(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await wait(200); } return !!fn(); }

const S = {
  async sperre() {
    const G = makeWorld({ slot: 0, tag: 'S', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
      quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 1, counters: [0] } } });
    G.w.localStorage.setItem('digibot.cfg', JSON.stringify(CFG));
    G.w.eval(script); await wait(800); start(G);
    const avoided = await until(() => /versuche ein anderes Jagdgebiet/.test(logText(G)), 70000);
    await wait(4000);
    const stopped = /Bot gestoppt/.test(G.status()) || /Bot gestoppt/.test(logText(G));
    const waiting = /freigegebene Aufgabe/.test(G.status());
    if (process.env.V) console.log(logText(G).slice(-1500));
    done(avoided && !stopped && waiting, `gemieden=${avoided} gestoppt=${stopped} wartet=${waiting} Status=${G.status()}`);
  },
  async leer() {
    const G = makeWorld({ slot: 0, tag: 'E', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
      quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } } });
    G.w.localStorage.setItem('digibot.cfg', JSON.stringify(CFG));
    G.w.eval(script); await wait(800); start(G);
    const stopped = await until(() => /keine machbaren Quests mehr/.test(G.status()), 15000);
    done(stopped, `gestoppt=${stopped} Status=${G.status()}`);
  },
};
S[only]().catch((e) => done(false, e.stack));
