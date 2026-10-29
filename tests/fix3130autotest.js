// 3.1.30: Autopilot (Prüfbericht 29.10.)
//  batch:  „gemeinsam abgeben“, Abgabe bei elder, Annahme beim selben NPC, dann Abgabe bei sage – die Abgabe-Aufgabe wird
//          nicht jeden Takt verworfen und neu gewählt (vorher: „Aufgabe: … abgeben bei sage ×15“)
//  minlvl: Portal mit Mindeststufe 50, Partner Lv 6 – Abgabe dahinter wird nicht eingeplant (vorher: lief ins Portal)
//  portal: Portal löst nicht aus (Spiel lehnt ab) – nach PORTAL_HOLD_MS „Portal nicht erreichbar“ (vorher: stand für immer darin)
//  idle:   „nur erledigen, nicht abgeben“ + Event-Bereitschaft, dann 📜 Abgeben & Annehmen – gibt ab (vorher: Tick blockiert)
// Aufruf: node tests/fix3130autotest.js <script>   (startet jedes Szenario als eigenen Prozess)
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const scriptPath = path.resolve(process.argv[2]);
const only = process.argv[3];
const NAMES = ['batch', 'minlvl', 'portal', 'idle'];

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
const P = (k, v) => ({ name: k, type: 'string', value: v });
const CFG = { autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 10 };
const logText = (G) => G.w.document.querySelector('.digibot__log')?.textContent || '';
const start = (G) => G.w.document.querySelector('[data-act="bot"]').click();
const done = (ok, info) => { console.log(`${ok ? 'OK' : 'FEHLER'} – ${info}`); process.exit(ok ? 0 : 1); };
async function until(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await wait(200); } return !!fn(); }

const S = {
  async batch() {
    const ev = [];
    const npc = (id, x) => ({ id: 'n:' + id, kind: 3, defId: id, x, y: 300, hp: 0, flags: 0 });
    const G = makeWorld({ slot: 0, tag: 'B', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
      extraEnts: (id) => (id === 'native_forest' ? [npc('elder', 330), npc('sage', 760)] : []),
      quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] }, q_x: { state: 2, counters: [1] }, q_y: { state: 2, counters: [1] } },
      setup({ content, MAPS }) {
        for (const [id, x] of [['elder', 330], ['sage', 760]]) {
          content.npcs[id] = { name: id };
          MAPS.native_forest.layers[0].objects.push({ type: 'npc', name: id, x, y: 300, properties: [P('npcId', id)] });
        }
        const q = (id, giver, turnIn) => ({ id, name: id, giver, turnIn, minLevel: 1, objectives: [{ kind: 'kill', species: 'kunemon', count: 99 }] });
        Object.assign(content.quests, { q_x: q('q_x', 'elder', 'elder'), q_y: q('q_y', 'sage', 'sage'), q_n: q('q_n', 'elder', 'elder') });
      } });
    const L0 = G.log.push.bind(G.log);
    G.log.push = (s) => { const m = /^(abgegeben|angenommen): (\w+)/.exec(s); if (m) ev.push(m[1].slice(0, 2) + ':' + m[2]); return L0(s); };
    G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ ...CFG, apBatch: true }));
    G.w.eval(script); await wait(800); start(G);
    await until(() => ev.length >= 3, 40000);
    const m = /Aufgabe: „q_y“ abgeben bei sage(?: ×(\d+))?/.exec(logText(G));
    const n = m ? Number(m[1] || 1) : 0;
    done(ev.join(' > ') === 'ab:q_x > an:q_n > ab:q_y' && n >= 1 && n <= 2, `Folge=${ev.join(' > ')} „Aufgabe: q_y abgeben“ ×${n}`);
  },
  async minlvl() {
    const G = makeWorld({ slot: 0, tag: 'L', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
      quests: { q00_meet_gennai: { state: 2, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
      setup({ MAPS }) { MAPS.native_forest.layers[0].objects[0].properties.push({ name: 'minLevel', type: 'int', value: 50 }); } });
    G.w.localStorage.setItem('digibot.cfg', JSON.stringify(CFG));
    G.w.eval(script); await wait(800); start(G);
    // Abgabe hinter dem Portal ist nicht erreichbar: gar nicht erst einplanen (hops = ∞), nie die Map wechseln
    const stopped = await until(() => /keine machbaren Quests mehr/.test(G.status()), 15000);
    await wait(1000);
    done(stopped && !/Reise nach/.test(logText(G)) && G.state.world.mapId === 'native_forest' && G.state.me.quests.q00_meet_gennai.state === 2,
      `gestoppt=${stopped} Map=${G.state.world.mapId} Status=${G.status()}`);
  },
  async portal() {
    let maps;
    const G = makeWorld({ slot: 0, tag: 'P', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
      quests: { q00_meet_gennai: { state: 2, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
      setup({ MAPS }) { maps = MAPS; } });
    G.w.localStorage.setItem('digibot.cfg', JSON.stringify(CFG));
    G.w.eval(script); await wait(800); start(G);
    const going = await until(() => /Reise nach/.test(G.status()), 15000);
    maps.native_forest.layers[0].objects[0].type = 'portal_off'; // Spielwelt lässt nicht durch, der Bot kennt das Portal schon
    const ok = await until(() => /Portal nicht erreichbar – 5 min übersprungen/.test(logText(G)), 40000);
    done(going && ok && G.state.world.mapId === 'native_forest', `unterwegs=${going} Portal nicht erreichbar=${ok} Status=${G.status()}`);
  },
  async idle() {
    const G = makeWorld({ slot: 0, tag: 'I', accounts: { leader: 0, list: [{ on: true, user: 'solo', char: 'X' }] }, mobs: [],
      quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] }, q_t: { state: 2, counters: [1] } },
      setup({ content, MAPS }) { content.npcs.leomon = { name: 'Leomon' };
        content.quests.q_t = { id: 'q_t', name: 'Test', giver: 'leomon', turnIn: 'leomon', minLevel: 1, objectives: [{ kind: 'kill', species: 'kunemon', count: 1 }] };
        MAPS.native_forest.layers[0].objects.push({ type: 'npc', name: 'leomon', x: 600, y: 330, properties: [P('npcId', 'leomon')] }); },
      extraEnts: (id) => (id === 'native_forest' ? [{ id: 'n:leomon', kind: 3, defId: 'leomon', x: 600, y: 330, hp: 0, flags: 0 }] : []) });
    G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ ...CFG, apNoTurnin: true, hunt: true }));
    G.w.eval(script); await wait(800); start(G);
    const idle = await until(() => /Event-Bereitschaft|warte auf aktivierte Events/.test(G.status()), 15000);
    G.w.document.querySelector('[data-act="grp-maptalk"]').click();
    const ok = await until(() => G.state.me.quests.q_t?.state === 3, 25000);
    done(idle && ok, `Bereitschaft=${idle} abgegeben=${ok} Status=${G.status()}`);
  },
};
S[only]().catch((e) => done(false, e.stack));
