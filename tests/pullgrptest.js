// Pull-Modus in der Gruppe (Task 3).
// A: Mitläufer (Fenster 1), der Test spielt den Leader: Leader meldet `pulling: true` und wechselnde Ziele (m:1 → m:2 → m:3,
//    die danach sein Digimon angreifen). Der Mitläufer greift keines davon an und spielt nichts selbst an – nur wer ihn
//    selbst angreift (m:5), wird abgewehrt. Danach (`pulling: false`, Ziel m:2) greift er das Ziel des Leaders an.
// B: Leader (Fenster 0, Pull an, max 2), der Test spielt den Mitläufer: ein Monster greift dessen Digimon an (außerhalb des
//    Radius des Leaders). Der Leader zählt es mit: nach seinem ersten eigenen Angreifer spielt er kein weiteres an.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const quests = { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } };
const uniq = (arr) => [...new Set(arr.map((x) => x.id))];
const base = { type: 'state', inWorld: true, mapId: 'native_forest', channel: 1, bot: true, status: 'x', quests: {}, talks: [], done: [], busy: null,
  noFight: false, task: null, hunt: [] };

// Jeder Fall läuft in einem eigenen Prozess: geschlossene Testfenster senden sonst weiter auf dem Gruppenkanal
const CASE = process.argv[3];
if (!CASE) {
  const { execFileSync } = require('child_process');
  const r = {};
  for (const c of ['A', 'B']) {
    let out = '';
    try { out = execFileSync(process.execPath, [__filename, process.argv[2], c], { encoding: 'utf8', timeout: 120000 }); } catch (e) { out = String(e.stdout || ''); }
    Object.assign(r, JSON.parse((out.match(/^RES (.*)$/m) || [, '{}'])[1]));
  }
  console.log(JSON.stringify(r));
  const ok = !!r.A && r.A.during.length === 1 && r.A.during[0] === 'm:5' && r.A.after.includes('m:2')
    && !!r.B && r.B.ids.length === 1 && r.B.ids[0] === 'm:1';
  console.log(ok ? 'OK – Pull-Modus in der Gruppe' : 'FEHLER');
  process.exit(ok ? 0 : 1);
}
(async () => {
  const r = {};
  if (CASE === 'A') {
    const mobs = [[460, 330], [470, 360], [480, 300], [500, 340], [380, 360]];
    const F = makeWorld({ slot: 1, tag: 'F', accounts, quests, mobs,
      extraEnts: (id) => (id === 'native_forest' ? [{ id: 'p:L', kind: 1, x: 440, y: 330, hp: 3000, maxHp: 3000, flags: 0, targetId: '' },
        { id: 't:L', kind: 0, x: 430, y: 330, hp: 1, flags: 0, targetId: '' }] : []) });
    for (const e of F.ents.values()) if (e.kind === 2) { e.hp = 90000; e.maxHp = 90000; }
    const picked = [];
    const scene = F.w.dmo.game.scene.getScene('world'), sel = scene.select;
    scene.select = (id) => { picked.push({ id, t: Date.now() }); return sel(id); };
    F.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20, radius: 400 }));
    F.w.eval(script);
    const bus = require('./groupbus')('digibot-group');
    const L = { pulling: true, targetId: null };
    const tick = setInterval(() => bus.postMessage({ ...base, slot: 0, role: 'leader', name: 'Lead', x: 430, y: 330, ents: ['t:L', 'p:L'], fight: true, ...L }), 200);
    const aim = (id) => { const pL = F.ents.get('p:L'); pL.targetId = id; L.targetId = id; F.ents.get(id).targetId = 'p:L'; };
    await wait(1200);
    F.w.document.querySelector('[data-act="bot"]').click();
    const t0 = Date.now();
    aim('m:1'); await wait(700); aim('m:2'); await wait(700); aim('m:3'); await wait(600);
    F.ents.get('m:5').targetId = 'p:me'; // greift den Mitläufer selbst an
    await wait(2500);
    L.pulling = false; aim('m:2'); // Sammeln vorbei: gemeinsam auf m:2
    const t1 = Date.now();
    await wait(3000);
    clearInterval(tick);
    if (process.env.DBG) console.log(JSON.stringify({ picked, st: F.status() }));
    r.A = { during: uniq(picked.filter((p) => p.t >= t0 && p.t < t1)), after: uniq(picked.filter((p) => p.t >= t1)), st: F.status() };
    F.w.close(); bus.close();
  }
  if (CASE === 'B') {
    const G = makeWorld({ slot: 0, tag: 'L', accounts, quests, mobs: [[430, 330], [470, 360], [500, 300]],
      setup({ content }) { content.digimon.kunemon = { name: 'Kunemon', mob: { leashRange: 240 } }; },
      extraEnts: (id) => (id === 'native_forest' ? [{ id: 'p:f', kind: 1, x: 900, y: 330, hp: 3000, maxHp: 3000, flags: 0, targetId: '' },
        { id: 'm:f', kind: 2, defId: 'kunemon', level: 2, x: 920, y: 330, hp: 90000, maxHp: 90000, flags: 0, targetId: 'p:f' }] : []) });
    for (const e of G.ents.values()) if (e.kind === 2) { e.hp = 90000; e.maxHp = 90000; }
    const picked = [];
    const scene = G.w.dmo.game.scene.getScene('world'), sel = scene.select;
    scene.select = (id) => { picked.push({ id, t: Date.now() }); return sel(id); };
    G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20, radius: 400,
      pull: true, pullMax: 2, pullHp: 60 }));
    G.w.eval(script);
    const bus = require('./groupbus')('digibot-group');
    const tick = setInterval(() => bus.postMessage({ ...base, slot: 1, role: 'follower', name: 'Foll', x: 890, y: 330, ents: ['t:f', 'p:f'], fight: true, targetId: 'm:f' }), 200);
    await wait(1200);
    G.w.document.querySelector('[data-act="bot"]').click();
    await wait(5000);
    clearInterval(tick);
    if (process.env.DBG) console.log(JSON.stringify({ picked, st: G.status() }));
    r.B = { ids: uniq(picked), st: G.status() };
    G.w.close(); bus.close();
  }
  console.log('RES ' + JSON.stringify(r));
  process.exit(0);
})();
