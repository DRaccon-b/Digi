// Pull-Modus (Task 2): Monster in der Leine des ersten sammeln, dann kämpfen.
// A: Pull an, max 3, drei Monster -> drei verschiedene Ziele nacheinander, vor dem dritten Treffer kein Angriffsskill (Taste 2).
// B: zweites Monster bei Anker + (230,0) (außerhalb 240 − 40) -> nie gewählt.
// C: nach dem ersten Treffer HP 50 % (Grenze 60) -> kein zweites Monster, Taste 2 kommt.
// D: max 2 bei drei Monstern -> genau zwei gewählt, dann Kampf.
// E: Pull aus -> nur das erste Monster (wie bisher).
// F: erstes ist schon Angreifer und 100 px von seinem Startplatz weg; zweites 180 px vom Startplatz, 260 px von der
//    aktuellen Position -> wird gewählt (Kreis um den Startplatz).
// G: Boss-Rotation (farmMode 'boss') mit Boss in Sicht -> kein Sammeln.   G2: ohne Rotation, Boss in Sicht -> kein Sammeln.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SK = { 'x.hit': { id: 'x.hit', name: 'Hit', kind: 'damage', target: 'enemy', shape: 'single', power: 200, dsCost: 5, cooldownMs: 1500, castMs: 0, range: 64 } };

async function trial(o) {
  const G = makeWorld({ slot: 0, tag: o.tag, noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: o.mobs,
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) {
      content.digimon.kunemon = { name: 'Kunemon', mob: { leashRange: 240 } };
      content.digimon.etemon = { name: 'Etemon', skills: [] };
      content.skills = { ...(content.skills || {}), ...SK };
    },
    extraEnts: () => o.extra || [] });
  for (const e of G.ents.values()) if (e.kind === 2) { e.hp = 90000; e.maxHp = 90000; Object.assign(e, o.patch?.[e.id] || {}); }
  const scene = G.w.dmo.game.scene.getScene('world');
  scene.telegraphs = { active: [], marksActive: [], circles: [], mirrors: [] }; scene.mechB = { lines: [] };
  const sel = scene.select, picked = [];
  scene.select = (id) => { picked.push({ id, t: Date.now() }); return sel(id); };
  const st0 = G.store.getState();
  G.store.setState({ me: { ...st0.me, hotbar: ['cmd:attack', 'skill:0'], partner: { ...st0.me.partner, species: 'gabumon', ds: 5000, maxDs: 5000,
    skills: [{ id: 'x.hit', name: 'Hit', dsCost: 5, unlocked: true }] } } });
  const keys = [], hits = [];
  G.w.addEventListener('keydown', (e) => {
    const s = G.store.getState();
    keys.push({ c: e.code, t: Date.now() });
    if (e.code === 'Digit1' && s.target) hits.push({ id: s.target.id, t: Date.now() });
    if (e.code === 'Digit2') G.store.setState({ cooldowns: { ...s.cooldowns, 'skill:0': { start: G.w.performance.now(), end: G.w.performance.now() + 1500 } } });
  }, true);
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, tab: 'log', lvlDiff: 20, radius: 400,
    pull: o.pull !== false, pullMax: o.max || 3, pullHp: 60, ...(o.cfg || {}),
    skillSets: { gabumon: { skills: { 2: true, 3: true, 4: true, 5: true, 6: true }, heal: {}, role: { 2: 'attack' }, aoeN: {}, rolesV: 1 } } }));
  G.w.eval(script);
  await wait(800);
  return { G, keys, hits, picked, scene };
}
const uniq = (arr) => [...new Set(arr.map((x) => x.id))];
const count = (keys, c, from = 0, to = Infinity) => keys.filter((k) => k.c === c && k.t >= from && k.t < to).length;
const firstHitOn = (hits, id) => hits.find((h) => h.id === id)?.t ?? null;
const start = (G) => G.w.document.querySelector('[data-act="bot"]').click();

(async () => {
  const r = {};
  const three = [[430, 330], [470, 360], [500, 300]];
  // A
  {
    const { G, keys, hits, picked } = await trial({ tag: 'A', mobs: three });
    start(G); await wait(6000);
    const ids = uniq(picked), h3 = ids[2] ? firstHitOn(hits, ids[2]) : null;
    if (process.env.DBG) console.log(JSON.stringify({ keys: keys.filter((k) => /Digit/.test(k.c)), hits, picked }));
    r.A = { ids, h3: !!h3, d2before: h3 ? count(keys, 'Digit2', 0, h3) : -1, d2: count(keys, 'Digit2'), st: G.status() };
    G.w.close();
  }
  // B: Anker (430,330), zweites bei (660,330)
  {
    const { G, picked } = await trial({ tag: 'B', mobs: [[430, 330], [660, 330]] });
    start(G); await wait(4000);
    r.B = { ids: uniq(picked) };
    G.w.close();
  }
  // C: nach dem ersten Treffer HP 50 %
  {
    const { G, keys, hits, picked } = await trial({ tag: 'C', mobs: three });
    start(G);
    const t0 = Date.now(); while (Date.now() - t0 < 3000 && !hits.length) await wait(20);
    const s = G.store.getState(); G.store.setState({ me: { ...s.me, partner: { ...s.me.partner, hp: 1500 } } });
    const t1 = Date.now(); await wait(5000);
    r.C = { ids: uniq(picked), d2: count(keys, 'Digit2', t1) };
    G.w.close();
  }
  // D: max 2
  {
    const { G, keys, picked } = await trial({ tag: 'D', mobs: three, max: 2 });
    start(G); await wait(6000);
    r.D = { ids: uniq(picked), d2: count(keys, 'Digit2') };
    G.w.close();
  }
  // E: Pull aus
  {
    const { G, keys, picked } = await trial({ tag: 'E', mobs: three, pull: false });
    start(G); await wait(4000);
    r.E = { ids: uniq(picked), d2: count(keys, 'Digit2') };
    G.w.close();
  }
  // F: Startplatz (430,330); erstes greift schon an und steht bei (530,330); zweites bei (304,458): 180 px vom Startplatz,
  //    260 px von (530,330)
  {
    const { G, picked } = await trial({ tag: 'F', mobs: [[430, 330], [304, 458]], patch: { 'm:1': { targetId: 'p:me' } } });
    start(G); await wait(300);
    const m1 = G.ents.get('m:1'); m1.x = 530; m1.y = 330;
    await wait(4000);
    r.F = { ids: uniq(picked) };
    G.w.close();
  }
  // G: Boss-Rotation, Boss (flags 16) in Sicht, erstes Monster greift an
  {
    const boss = [{ id: 'b:1', kind: 2, defId: 'etemon', x: 700, y: 330, hp: 900000, maxHp: 900000, level: 5, flags: 16, targetId: '' }];
    const { G, picked } = await trial({ tag: 'G', mobs: three, extra: boss, patch: { 'm:1': { targetId: 'p:me' } }, cfg: { farm: true, farmMode: 'boss', farmChannels: [1] } });
    start(G); await wait(4000);
    r.G = { ids: uniq(picked) };
    G.w.close();
  }
  // G2: ohne Rotation, Boss in Sicht (abgewählt) -> kein Sammeln
  {
    const boss = [{ id: 'b:1', kind: 2, defId: 'etemon', x: 700, y: 330, hp: 900000, maxHp: 900000, level: 5, flags: 16, targetId: '' }];
    const { G, picked } = await trial({ tag: 'G2', mobs: three, extra: boss });
    start(G); await wait(4000);
    r.G2 = { ids: uniq(picked) };
    G.w.close();
  }
  console.log(JSON.stringify(r));
  const ok = r.A.ids.length >= 3 && r.A.h3 && r.A.d2before === 0 && r.A.d2 >= 1
    && r.B.ids.length >= 1 && !r.B.ids.includes('m:2')
    && r.C.ids.length === 1 && r.C.d2 >= 1
    && r.D.ids.length === 2 && r.D.d2 >= 1
    && r.E.ids.length === 1 && r.E.d2 >= 1
    && r.F.ids.includes('m:2')
    && r.G.ids.length <= 1 && !r.G.ids.includes('m:2') && !r.G.ids.includes('m:3')
    && r.G2.ids.length === 1;
  console.log(ok ? 'OK – Pull-Modus sammelt in der Leine' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
