// 3.2.2 (live 02.11. Gekomon Marsh, Magnamon, max 6): 16 Runden, meist 2–3 gesammelt, jede endete mit „kein weiteres Monster in
// der Leine“, obwohl oft freie Okuwamon 50–100 px daneben standen; danach wurde bis zum Ende des Kampfs nichts mehr dazugeholt.
// V: Runde endet mit 2 (kein drittes da), dann respawnt eins in der Leine, die beiden kämpfen noch -> es wird nachgeholt.
// W: m:1 wurde weit weg zuerst gesehen (650,330) und läuft vor dem Anspielen zu (430,330); m:2 steht bei (300,330) – 130 px vom
//    Anspielpunkt, 350 px vom zuerst gesehenen Platz -> m:2 wird gesammelt (Leine ab dem Anspielpunkt).
// Y: m:1 (430,330), m:2 (560,330), m:3 (690,330) – m:3 liegt 260 px von m:1. Stirbt m:1, bindet seine Leine nicht mehr -> m:3 kommt dazu.
// V2: wie V, das nachgeholte Monster schnappt sich aber ein anderer Spieler -> die Skills laufen gleich wieder (keine Sperre).
// Z: wie V, das neue steht aber 220 px vom Startplatz von m:1 (außerhalb 240 − 60) -> wird nicht geholt.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SK = { 'x.hit': { id: 'x.hit', name: 'Hit', kind: 'damage', target: 'enemy', shape: 'single', power: 200, dsCost: 5, cooldownMs: 1500, castMs: 0, range: 64 } };

async function trial(o) {
  const G = makeWorld({ slot: 0, tag: o.tag, noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: o.mobs,
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) { content.digimon.kunemon = { name: 'Kunemon', mob: { leashRange: 240 } }; content.skills = { ...(content.skills || {}), ...SK }; } });
  for (const e of G.ents.values()) if (e.kind === 2) { e.hp = 90000; e.maxHp = 90000; }
  const scene = G.w.dmo.game.scene.getScene('world');
  scene.telegraphs = { active: [], marksActive: [], circles: [], mirrors: [] }; scene.mechB = { lines: [] };
  const sel = scene.select, picked = [];
  scene.select = (id) => { picked.push({ id, t: Date.now() }); return sel(id); };
  const st0 = G.store.getState();
  G.store.setState({ me: { ...st0.me, hotbar: ['cmd:attack', 'skill:0'], partner: { ...st0.me.partner, species: 'gabumon', ds: 5000, maxDs: 5000,
    skills: [{ id: 'x.hit', name: 'Hit', dsCost: 5, unlocked: true }] } } });
  const hits = [], keys = [];
  G.w.addEventListener('keydown', (e) => {
    const s = G.store.getState();
    keys.push({ c: e.code, t: Date.now() });
    if (e.code === 'Digit1' && s.target) hits.push({ id: s.target.id, t: Date.now() });
    if (e.code === 'Digit2') G.store.setState({ cooldowns: { ...s.cooldowns, 'skill:0': { start: G.w.performance.now(), end: G.w.performance.now() + 1500 } } });
  }, true);
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, tab: 'log', lvlDiff: 20, radius: 400,
    pull: true, pullMax: o.max || 4, pullHp: 60,
    skillSets: { gabumon: { skills: { 2: true, 3: true, 4: true, 5: true, 6: true }, heal: {}, role: { 2: 'attack' }, aoeN: {}, rolesV: 1 } } }));
  G.w.eval(script);
  await wait(800);
  return { G, hits, picked, keys };
}
const uniq = (arr) => [...new Set(arr.map((x) => x.id))];
const start = (G) => G.w.document.querySelector('[data-act="bot"]').click();
const addMob = (G, id, x, y) => G.ents.set(id, { id, kind: 2, defId: 'kunemon', level: 2, x, y, hp: 90000, maxHp: 90000, flags: 0, targetId: '' });
// bis beide angespielt sind und die Runde zu ist (Log „gesammelt“), dann noch kurz kämpfen lassen
async function roundClosed(G, picked, n) {
  const t0 = Date.now();
  while (Date.now() - t0 < 6000 && !(uniq(picked).length >= n && /gesammelt/.test(G.w.document.querySelector('.digibot__log')?.textContent || ''))) await wait(50);
  await wait(800);
}

(async () => {
  const r = {};
  for (const kind of ['V', 'Z']) {
    const { G, hits, picked } = await trial({ tag: kind, mobs: [[430, 330], [470, 360]] });
    start(G); await roundClosed(G, picked, 2);
    const closed = /gesammelt/.test(G.w.document.querySelector('.digibot__log')?.textContent || '');
    if (kind === 'V') addMob(G, 'm:9', 450, 300); else addMob(G, 'm:9', 650, 330);
    const t1 = Date.now(); await wait(4000);
    r[kind] = { closed, ids: uniq(picked), hit9: hits.some((h) => h.id === 'm:9' && h.t >= t1), st: G.status().slice(0, 80) };
    G.w.close();
  }
  {
    const { G, picked, keys, hits } = await trial({ tag: 'V2', mobs: [[430, 330], [470, 360]] });
    start(G); await roundClosed(G, picked, 2);
    addMob(G, 'm:9', 450, 300);
    const t0 = Date.now(); while (Date.now() - t0 < 4000 && !hits.some((h) => h.id === 'm:9')) await wait(10);
    const sel9 = hits.some((h) => h.id === 'm:9'); // schon einmal geschlagen, dann nimmt es ein anderer
    const t1 = Date.now(); let held = 0;
    while (Date.now() - t1 < 3000) { const m9 = G.ents.get('m:9'); if (m9) m9.targetId = 'p:fremd'; if (Date.now() - t1 > 1000 && /Hole ein Monster nach/.test(G.status())) held++; await wait(50); }
    r.V2 = { sel9, d2: keys.filter((k) => k.c === 'Digit2' && k.t >= t1 + 1000).length, held };
    G.w.close();
  }
  {
    const { G, picked } = await trial({ tag: 'W', mobs: [[650, 330], [300, 330]], max: 3 });
    await wait(600); // m:1 einige Takte weit weg gesehen
    const m1 = G.ents.get('m:1'); m1.x = 430; m1.y = 330;
    await wait(400);
    start(G); await wait(4500);
    r.W = { ids: uniq(picked) };
    G.w.close();
  }
  {
    const { G, picked } = await trial({ tag: 'Y', mobs: [[430, 330], [560, 330], [690, 330]] });
    start(G); await roundClosed(G, picked, 2);
    const before = uniq(picked);
    G.ents.delete('m:1');
    await wait(4000);
    r.Y = { before, ids: uniq(picked) };
    G.w.close();
  }
  console.log(JSON.stringify(r));
  const okV = r.V.closed && r.V.hit9, okZ = r.Z.closed && !r.Z.ids.includes('m:9'), okW = r.W.ids[0] === 'm:1' && r.W.ids.includes('m:2');
  const okV2 = r.V2.sel9 && r.V2.d2 >= 1 && r.V2.held === 0;
  const okY = !r.Y.before.includes('m:3') && r.Y.ids.includes('m:3');
  console.log(okV ? 'OK     V: nach Rundenende respawntes Monster in der Leine wird nachgeholt' : 'FEHLER V ' + JSON.stringify(r.V));
  console.log(okV2 ? 'OK     V2: nachgeholtes Monster von anderem Spieler genommen – Skills laufen weiter' : 'FEHLER V2 ' + JSON.stringify(r.V2));
  console.log(okZ ? 'OK     Z: neues Monster außerhalb der Leine wird nicht geholt' : 'FEHLER Z ' + JSON.stringify(r.Z));
  console.log(okW ? 'OK     W: Leine ab dem Anspielpunkt, nicht ab dem zuerst gesehenen Platz' : 'FEHLER W ' + JSON.stringify(r.W));
  console.log(okY ? 'OK     Y: totes Monster bindet die Leine nicht mehr' : 'FEHLER Y ' + JSON.stringify(r.Y));
  process.exit(okV && okV2 && okZ && okW && okY ? 0 : 1);
})();
