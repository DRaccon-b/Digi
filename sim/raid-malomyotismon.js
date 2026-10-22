#!/usr/bin/env node
// Raid-Probelauf: MaloMyotismon (Dream World) – Bauzel allein (Imperialdramon Paladin Mode Lv 99) mit dem echten Bot im
// Dungeon-Modus „MaloMyotismon-Raid“. Der Lauf beginnt schon im Raid (am Lager), dieses Skript spielt den Server.
//
//   TEMPO=4 node sim/raid-malomyotismon.js
//   TREFFER=0.57 KRIT=0.25 PANZER=0.85 BOSS_HIT=9000 PANDA=1 V=1 …
//
// Aus den Spieldaten (Okt. 2026): Karte, HP (226 600 + 27 810 × 98, ×1,1 Werte, ×0,75 HP = 2 435 384, bei bis zu 3
// Spielern), Enrage 7 min, Adds (2 Phantomon bei 75/50/25 %, füttern nach 20 s mit 0,3 %/s; 3 Illusionstürme bei 60/30 %,
// stärken die Verteidigung um 40 %, füttern nach 25 s), Grisly Wing (Kreis unter jedem, 55 700, Verteidigung −25 %),
// Dream Mirror (200 %, 3 s), Nightmare Mark, Pandæmonium bei 50 % (raumweit, 8 s Ansage, abbrechbar nur über
// Angriffstempo – allein nicht). Evasiv (Ausweichen ×3,5) und gepanzert (normale Treffer prallen ab, Krits gehen durch).
// UNBEKANNT – einstellbar, Standard geschätzt:
//   TREFFER  Trefferchance gegen MaloMyotismon (0,57: Bauzels Trefferwert 1 063 gegen Ausweichen ~788)
//   KRIT     Anteil kritischer Treffer (0,25), Krit ×1,5 und geht durch den Panzer
//   PANZER   so viel eines normalen Treffers prallt ab (0,85 = „armor 0.85“ aus den Daten)
//   BOSS_HIT Grundtreffer des Bosses (9 000 alle 2 s), PANDA=1: Pandæmonium tötet (0 = überlebbar)
const path = require('path');
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const { BroadcastChannel } = require('worker_threads');

const TEMPO = Math.max(1, Number(process.env.TEMPO) || 1);
const REAL0 = Date.now(), realNow = Date.now.bind(Date);
const vnow = () => REAL0 + (realNow() - REAL0) * TEMPO;
function warp(g) {
  if (TEMPO === 1) return;
  const st = g.setTimeout.bind(g), si = g.setInterval.bind(g);
  g.setTimeout = (f, ms = 0, ...a) => st(f, ms / TEMPO, ...a);
  g.setInterval = (f, ms = 0, ...a) => si(f, ms / TEMPO, ...a);
  g.Date.now = vnow;
  if (g.performance) { const p0 = g.performance.now(), r0 = realNow(); g.performance.now = () => p0 + (realNow() - r0) * TEMPO; }
}
warp(global);

const num = (k, d) => (process.env[k] != null && process.env[k] !== '' ? Number(process.env[k]) : d);
const TREFFER = num('TREFFER', 0.57), KRIT = num('KRIT', 0.25), PANZER = num('PANZER', 0.85), BOSS_HIT = num('BOSS_HIT', 9000), PANDA = num('PANDA', 1);
const SCHADEN = 12000, AS = 1121, P_SPEED = 120, HP = 92660;
const TRAENKE = 400, TRANK_HP = 15000, TRANK_AB = 50;
const DAUER = num('DAUER', 600) * 1000;
const MAP = 'dream_world';
const script = fs.readFileSync(process.env.SKRIPT || path.join(__dirname, '..', 'digibot.user.js'), 'utf8');
const t0 = Date.now();
const sec = () => ((Date.now() - t0) / 1000).toFixed(1).padStart(6);
const log = [];
const say = (s) => { log.push(`${sec()} s  ${s}`); if (process.env.V) console.log(`${sec()} s  ${s}`); };

// ---------- Karte (dream_world.tmj) ----------
const P = (k, v) => ({ name: k, type: 'string', value: v });
const PT = { camp: [344, 600], boss_malomyotismon: [360, 328], add_n: [360, 152], add_e: [536, 328], add_w: [184, 328], tower_1: [360, 216], tower_2: [456, 392], tower_3: [264, 392] };
const MAPS = {
  [MAP]: [
    { type: 'spawn', name: 'default', x: 376, y: 600 }, { type: 'spawn', name: 'from_myotismon_castle', x: 352, y: 632 },
    ...Object.entries(PT).map(([name, [x, y]]) => ({ type: 'spawn', name, x, y })),
    { type: 'safe', name: 'landing', x: 304, y: 560, width: 96, height: 144 },
    { type: 'portal', name: 'myotismon_castle', x: 320, y: 672, width: 64, height: 32, properties: [P('toMap', 'myotismon_castle'), P('toSpawn', 'from_dream_world')] },
  ],
  myotismon_castle: [{ type: 'spawn', name: 'default', x: 400, y: 400 }, { type: 'spawn', name: 'from_dream_world', x: 400, y: 420 }],
};
const objOf = (mapId, name) => MAPS[mapId].find((o) => o.name === name);
const inRect = (o, p) => p.x >= o.x && p.x <= o.x + o.width && p.y >= o.y && p.y <= o.y + o.height;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const at = (n) => ({ x: PT[n][0], y: PT[n][1] });

// ---------- Spieldaten (Auszug) ----------
const SK = (id, o) => [id, { id, element: 'dark', kind: 'damage', target: 'enemy', dsCost: 0, ...o }];
const SKILLS = Object.fromEntries([
  SK('malomyotismon.grisly_wing', { name: 'Grisly Wing', shape: 'circle', radius: 48, telegraph: true, each: true, power: 0, fixedDamage: 55700, cooldownMs: 30000, castMs: 2000, range: 640, effects: [{ stat: 'de', pct: -25, durationMs: 15000 }] }),
  SK('malomyotismon.pandaemonium_full', { name: 'Pandæmonium Nightmare', shape: 'circle', origin: 'caster', radius: 640, power: 6000, cooldownMs: 600000, castMs: 8000, range: 640 }),
  SK('malomyotismon.dream_mirror', { name: 'Dream Mirror', kind: 'buff', target: 'self', shape: 'single', power: 0, cooldownMs: 90000, castMs: 2500, range: 1, reflect: { pct: 200, durationMs: 3000 } }),
  SK('malomyotismon.nightmare_mark', { name: 'Nightmare Mark', shape: 'circle', radius: 56, power: 1800, cooldownMs: 60000, castMs: 6000, range: 640, mark: { othersPct: 125 } }),
]);
const PSK = [
  { id: 'imperialdramon_paladin.invincible_sword', name: 'Invincible Sword', cooldownMs: 6000, dsCost: 370, range: 112, mult: 2, def: { kind: 'damage', target: 'enemy', shape: 'circle', radius: 56, power: 352, castMs: 600 } },
  { id: 'imperialdramon_paladin.holy_grace', name: 'Holy Grace', cooldownMs: 15000, dsCost: 500, range: 32, mult: 0, heal: 0.15, def: { kind: 'heal', target: 'self', shape: 'single', power: 350, castMs: 300 } },
  { id: 'imperialdramon_paladin.paladin_guard', name: 'Paladin Guard', cooldownMs: 30000, dsCost: 600, range: 32, mult: 0, def: { kind: 'buff', target: 'self', shape: 'single', power: 0, castMs: 0 } },
  { id: 'imperialdramon_paladin.omega_blade', name: 'Omega Blade', cooldownMs: 20000, dsCost: 1050, range: 64, mult: 5, def: { kind: 'damage', target: 'enemy', shape: 'single', power: 890, castMs: 900 } },
];
const lvHp = (base, g, l) => Math.round(base + g * (l - 1));
const MALO_HP = Math.round(lvHp(226600, 27810, 99) * 1.1 * 0.75);
const PHANTOMON_HP = lvHp(3928, 475.4, 99), TOWER_HP = 57500;
const RAID = { id: 'malomyotismon', gate: { mapId: 'myotismon_castle', portal: 'dream_world' }, party: { min: 1, max: 5, minLevel: 1 }, deathLimit: 3, landing: 'camp' };
const CONTENT = () => ({
  digimon: { imperialdramon_paladin: { name: 'Imperialdramon Paladin Mode', base: { ms: 115, as: 1300, at: 660 }, growth: { at: 92.5 } },
    malomyotismon: { name: 'MaloMyotismon', base: { hp: 226600, at: 412.62 }, growth: { hp: 27810, at: 57.59 }, skills: [] },
    phantomon: { name: 'Phantomon', base: { hp: 3928, at: 185 }, growth: { hp: 475.4, at: 26.2 } }, illusion_tower: { name: 'Illusion Tower', base: { hp: 57500, at: 0 } } },
  skills: { ...SKILLS, ...Object.fromEntries(PSK.map((k) => [k.id, { id: k.id, name: k.name, cooldownMs: k.cooldownMs, dsCost: k.dsCost, range: k.range, ...k.def }])) },
  items: { hp_pot: { id: 'hp_pot', name: 'HP-Trank' } }, npcs: {}, quests: {}, dailyById: {},
  maps: { [MAP]: { name: 'Dream World' }, myotismon_castle: { name: 'Myotismon Castle' } },
  spawns: { myotismon_castle: { zones: {} }, [MAP]: { zones: {}, raid: RAID, bosses: [{ species: 'malomyotismon', level: 99, at: 'boss_malomyotismon', skills: Object.values(SKILLS),
    adds: { species: 'phantomon', level: 99, atHp: [0.75, 0.5, 0.25], count: 2 }, moreAdds: [{ species: 'illusion_tower', level: 99, atHp: [0.6, 0.3], count: 3 }] }] } },
});

// ---------- Server-Zustand ----------
const ents = new Map();
const players = [];
const run = { pulled: false, pullAt: 0, deaths: 0, cleared: false, failed: '', boss: null, zones: [], mirror: null, adds: new Set(), towers: new Set(), charge: false,
  stats: { pots: 0, skills: 0, hits: 0, miss: 0, crit: 0, glance: 0, reflect: 0, dodged: 0, hit: 0, feed: 0 } };
let mobSeq = 0;
const accounts = { leader: 0, popup: true, mirror: false, dungeon: true, list: [{ on: true, user: 'u0', char: 'Bauzel' }] };
const targetOf = (e) => ({ id: e.id, kind: 'mob', name: e.name, level: e.level, hp: e.hp, maxHp: e.maxHp });
function makeWindow(i) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: `https://play.digimmo.com.br/#dbslot=${i}`, pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.BroadcastChannel = BroadcastChannel;
  warp(w);
  let state = {};
  const subs = [];
  const store = { getState: () => state, setState: (p) => { state = { ...state, ...p }; subs.forEach((f) => f()); }, subscribe: (f) => subs.push(f) };
  const pl = { skillCd: {}, queued: null, i, store, w, map: MAP, goal: null, atk: null, hitAt: 0, fainted: false, reviveAt: 0, inside: true, handlers: {} };
  const view = {
    get: (id) => { const e = ents.get(id); return e && e.map === pl.map ? e : undefined; },
    has: (id) => !!view.get(id),
    forEach: (fn) => { for (const e of ents.values()) if (e.map === pl.map) fn(e, e.id); },
    values: function* () { for (const e of ents.values()) if (e.map === pl.map) yield e; },
    keys: function* () { for (const e of ents.values()) if (e.map === pl.map) yield e.id; },
    entries: function* () { for (const e of ents.values()) if (e.map === pl.map) yield [e.id, e]; },
    [Symbol.iterator]() { return view.entries(); },
    get size() { let n = 0; for (const e of ents.values()) if (e.map === pl.map) n++; return n; },
  };
  const commands = { raidEnter() {}, raidLeave() {}, closeRaidGate() {}, partnerFollow() { pl.atk = null; const p = ents.get(`p:${i}`); if (p) p.targetId = ''; },
    partyInvite() {}, partyRespond() {}, closeDialog() {}, talk() {}, chooseDialog() {} };
  const scene = {
    deps: { content: CONTENT(), commands, assetsBase: '/assets/', manifest: { maps: { [MAP]: { tmj: `maps/${MAP}.tmj` }, myotismon_castle: { tmj: 'maps/myotismon_castle.tmj' } } } },
    controlledId: () => `t:${i}`,
    tapGround: (x, y) => { pl.goal = { x, y }; },
    select: (id) => { const e = view.get(id); store.setState({ target: e ? targetOf(e) : null }); },
    telegraphs: { active: [], circles: [], marksActive: [], mirrors: [] },
    mechB: { lines: [], view: { t: 'mech' } },
  };
  pl.scene = scene;
  w.fetch = async (url) => ({ json: async () => ({ layers: [{ type: 'objectgroup', name: 'objects', objects: MAPS[url.match(/maps\/(\w+)\.tmj/)[1]] || [] }] }) });
  w.dmo = { store, net: { state: { entities: view }, charId: `c${i}`, on: (n, fn) => { pl.handlers[n] = fn; return () => {}; } }, game: { scene: { getScene: (k) => (k === 'world' ? scene : null) } } };
  w.addEventListener('keydown', (e) => {
    if (e.code !== 'F1' || pl.fainted) return;
    const me = state.me, inv = me.inventory.find((x) => x.itemId === 'hp_pot');
    if (!inv?.qty || Date.now() - (pl.potAt || 0) < 2000) return;
    pl.potAt = Date.now(); run.stats.pots++;
    store.setState({ me: { ...me, inventory: me.inventory.map((x) => (x === inv ? { ...x, qty: x.qty - 1 } : x)), partner: { ...me.partner, hp: Math.min(HP, me.partner.hp + TRANK_HP) } } });
  }, true);
  w.addEventListener('keydown', (e) => {
    const k = /^Digit([2-5])$/.exec(e.code)?.[1];
    if (!k || pl.fainted) return;
    const n = Number(k) - 2, sk = PSK[n], me = state.me, now = Date.now();
    if (!sk || (pl.skillCd[n] || 0) > now || me.partner.ds < sk.dsCost) return;
    const m = state.target && ents.get(state.target.id);
    if (!sk.heal && sk.mult && (!m || m.hp <= 0)) return;
    pl.skillCd[n] = now + sk.cooldownMs;
    store.setState({ cooldowns: { ...state.cooldowns, [`skill:${n}`]: { end: w.performance.now() + sk.cooldownMs } }, me: { ...me, partner: { ...me.partner, ds: me.partner.ds - sk.dsCost } } });
    const evAll = (phase) => { for (const x of players) x.handlers.evs?.([{ t: 'skill', src: `p:${i}`, skill: sk.id, phase }]); };
    evAll('cast'); setTimeout(() => evAll('release'), sk.def.castMs || 0);
    if (sk.heal) { const s2 = store.getState(); store.setState({ me: { ...s2.me, partner: { ...s2.me.partner, hp: Math.min(HP, s2.me.partner.hp + HP * sk.heal) } } }); }
    if (sk.mult && m) { pl.queued = { n, id: m.id }; pl.atk = m.id; }
  }, true);
  w.addEventListener('keydown', (e) => {
    if (e.code !== 'Digit1' || !state.target || pl.fainted) return;
    const m = ents.get(state.target.id);
    if (m && m.hp > 0) pl.atk = m.id;
  }, true);
  const [sx, sy] = PT.camp;
  ents.set(`t:${i}`, { id: `t:${i}`, kind: 0, map: MAP, x: sx, y: sy, hp: 1, flags: 0, targetId: '' });
  ents.set(`p:${i}`, { id: `p:${i}`, kind: 1, map: MAP, x: sx + 10, y: sy, hp: 1, flags: 0, targetId: '' });
  store.setState({ screen: 'world', inputFocus: 'game', cooldowns: {}, windows: {}, raid: { raid: 'malomyotismon', inside: true },
    session: { username: 'u0', characters: [{ id: 'c0', name: 'Bauzel' }] },
    me: { tamerEntityId: `t:${i}`, tamerDs: 300, tamerMaxDs: 360, hotbar: ['cmd:attack', 'skill:0', 'skill:1', 'skill:2', 'skill:3', null, null, null, 'item:hp_pot'],
      inventory: [{ itemId: 'hp_pot', qty: TRAENKE }], quests: {},
      partner: { entityId: `p:${i}`, name: 'Imperialdramon Paladin Mode', species: 'imperialdramon_paladin', stage: 'mega', level: 99, hp: HP, maxHp: HP, ds: 9365, maxDs: 9365, exp: 0, expNext: 0,
        stats: { at: 12806, as: AS, ms: 120 }, skills: PSK.map((k) => ({ id: k.id, name: k.name, dsCost: k.dsCost, cooldownMs: k.cooldownMs, range: k.range, unlocked: true })) } },
    world: { mapId: MAP, mapName: 'Dream World', channel: 1 }, target: null });
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ dungeon: true, dgMode: 'malomyotismon', autopilot: false, farm: false, questMode: false, hpPot: TRANK_AB, dsPot: 0, tdsPot: 0, tab: 'data', lvlDiff: 100, radius: 400 }));
  w.localStorage.setItem('digibot.accounts', JSON.stringify(accounts));
  w.eval(script);
  pl.status = () => w.document.querySelector('[data-f="status"]')?.textContent || '';
  return pl;
}

// ---------- Weltablauf ----------
const alive = () => players.filter((pl) => pl.inside && !pl.fainted && pl.map === MAP);
const partnerOf = (pl) => ents.get(`p:${pl.i}`);
function spawnMob(species, name, hp, p, extra = {}) {
  const id = `m:${++mobSeq}`;
  const e = { id, kind: 2, map: MAP, defId: species, name, level: 99, x: p.x, y: p.y, hp, maxHp: hp, flags: 0, targetId: '', nextHit: 0, born: Date.now(), ...extra };
  ents.set(id, e);
  return e;
}
function damagePlayer(pl, dmg, what) {
  if (pl.fainted) return;
  const st = pl.store.getState(), p = st.me.partner, hp = Math.max(0, p.hp - dmg);
  pl.store.setState({ me: { ...st.me, partner: { ...p, hp, fainted: hp <= 0 } } });
  if (hp > 0) return;
  pl.fainted = true; pl.atk = null; pl.reviveAt = Date.now() + 5000; run.deaths++;
  say(`💀 Char${pl.i + 1} fällt (${what}) – Stürze ${run.deaths}/3`);
  for (const m of ents.values()) if (m.targetId === `p:${pl.i}`) m.targetId = '';
  if (run.deaths > 3) fail('zu viele Stürze');
}
function fail(why) { if (run.failed) return; run.failed = why; say(`❌ gescheitert: ${why} – MaloMyotismon bei ${Math.round(run.boss.hp / run.boss.maxHp * 100)} %`); }
// Treffer auf MaloMyotismon: Trefferchance (evasiv), Krit geht durch den Panzer, normale Treffer prallen größtenteils ab
function hitMob(pl, m, dmg, committedAt = Date.now()) {
  const now = Date.now();
  if (m.boss) {
    if (run.mirror && now >= run.mirror.start && now < run.mirror.end && committedAt >= run.mirror.start) { run.stats.reflect++; say(`🪞 Spiegel: Char${pl.i + 1} −${Math.round(dmg * 2)}`); damagePlayer(pl, Math.round(dmg * 2), 'Spiegel'); return; }
    if (Math.random() > TREFFER) { run.stats.miss++; return; }
    const crit = Math.random() < KRIT;
    if (crit) { run.stats.crit++; dmg *= 1.5; } else { run.stats.glance++; dmg *= 1 - PANZER; }
    if (run.towers.size) dmg /= 1.4; // Illusionstürme: Verteidigung +40 %
  }
  m.hp = Math.max(0, m.hp - dmg); run.stats.hits++;
  if (m.hp > 0) return;
  ents.delete(m.id); run.adds.delete(m.id); run.towers.delete(m.id);
  for (const x of players) { if (x.atk === m.id) x.atk = null; const st = x.store.getState(); if (st.target?.id === m.id) x.store.setState({ target: { ...st.target, hp: 0 } }); }
  for (const x of players) x.handlers.evs?.([{ t: 'die', id: m.id }]);
  if (m.boss) {
    run.cleared = true; say(`🏆 MaloMyotismon besiegt (${Math.round((now - run.pullAt) / 1000)} s)`);
    for (const x of players) x.store.setState({ raid: { raid: 'malomyotismon', inside: true, cleared: true } });
  } else say(`✝ ${m.name} erledigt`);
}
function stepPartners(now, dt) {
  for (const pl of players) {
    const t = ents.get(`t:${pl.i}`), p = partnerOf(pl);
    if (pl.fainted) {
      if (now >= pl.reviveAt && !run.failed) { pl.fainted = false; const st = pl.store.getState(); pl.store.setState({ me: { ...st.me, partner: { ...st.me.partner, hp: HP, fainted: false } } }); t.x = PT.camp[0]; t.y = PT.camp[1]; p.x = t.x + 10; p.y = t.y; pl.goal = null; say(`Char${pl.i + 1} ist wieder da (Lager)`); }
      continue;
    }
    const st0 = pl.store.getState(), p0 = st0.me.partner;
    if (p0.hp < HP && ![...ents.values()].some((e) => e.targetId === `p:${pl.i}`)) pl.store.setState({ me: { ...st0.me, partner: { ...p0, hp: Math.min(HP, p0.hp + HP * 0.03 * dt) } } });
    if (p0.ds < 9365) { const s1 = pl.store.getState(); pl.store.setState({ me: { ...s1.me, partner: { ...s1.me.partner, ds: Math.min(9365, s1.me.partner.ds + 93.65 * dt) } } }); }
    if (pl.goal) { const dx = pl.goal.x - t.x, dy = pl.goal.y - t.y, d = Math.hypot(dx, dy), step = 160 * dt; if (d <= step) { t.x = pl.goal.x; t.y = pl.goal.y; pl.goal = null; } else { t.x += dx / d * step; t.y += dy / d * step; } }
    const m = pl.atk && ents.get(pl.atk);
    if (m && m.hp > 0) {
      const d = dist(p, m), reach = 26;
      p.targetId = m.id;
      if (d > reach) { const step = P_SPEED * dt; p.x += (m.x - p.x) / d * Math.min(step, d - reach + 1); p.y += (m.y - p.y) / d * Math.min(step, d - reach + 1); }
      else if (now >= pl.hitAt && now >= (pl.castUntil || 0)) { pl.hitAt = now + AS; hitMob(pl, m, SCHADEN); }
      if (pl.queued && pl.queued.id === m.id && d <= PSK[pl.queued.n].range + 26 && now >= (pl.castUntil || 0)) {
        run.stats.skills++; const q = pl.queued; pl.queued = null; const ms = PSK[q.n].def.castMs || 0; pl.castUntil = now + ms;
        setTimeout(() => { const mm = ents.get(q.id); if (mm && mm.hp > 0 && !pl.fainted) hitMob(pl, mm, SCHADEN * PSK[q.n].mult, now); }, ms);
      }
    } else { pl.atk = null; p.targetId = ''; const d = dist(p, t); if (d > 14) { const step = P_SPEED * 1.1 * dt; p.x += (t.x + 10 - p.x) / d * Math.min(step, d); p.y += (t.y - p.y) / d * Math.min(step, d); } }
    for (const o of MAPS[MAP]) if (o.type === 'portal' && inRect(o, t) && pl.inside) { pl.inside = false; say(`Char${pl.i + 1} verlässt den Raid${run.cleared ? '' : ' – vorzeitig!'}`); pl.map = 'myotismon_castle'; t.map = p.map = pl.map; pl.store.setState({ world: { mapId: pl.map, mapName: 'Myotismon Castle', channel: 1 }, raid: null, target: null }); }
  }
}
function castZone(src, skill, circles, castMs, dmgFn) {
  const now = Date.now(), z = { src: src.id, skill, circles, end: now + castMs };
  run.zones.push(z);
  for (const pl of players) pl.handlers.evs?.([{ t: 'skill', src: src.id, skill, phase: 'cast' }]);
  setTimeout(() => {
    run.zones = run.zones.filter((x) => x !== z);
    for (const pl of players) pl.handlers.evs?.([{ t: 'skill', src: src.id, skill, phase: 'release' }]);
    if (!ents.has(src.id) || run.failed) return;
    for (const pl of alive()) {
      const inside = circles.some((c) => dist(partnerOf(pl), c) <= c.r);
      if (!inside) { run.stats.dodged++; continue; }
      run.stats.hit++; const d = dmgFn(pl); say(`💢 ${SKILLS[skill].name} trifft (−${d})`); damagePlayer(pl, d, SKILLS[skill].name);
    }
  }, castMs);
}
const jit = (ms) => ms * (0.75 + Math.random() * 0.5);
function stepBoss(now, dt) {
  const b = run.boss; if (!b || !ents.has(b.id) || run.failed) return;
  if (!run.pulled) {
    if (alive().some((pl) => { const tp = partnerOf(pl); return dist(tp, b) < 160 || tp.targetId === b.id; })) { run.pulled = true; run.pullAt = now; say('MaloMyotismon greift an'); }
    return;
  }
  if (now - run.pullAt > 420000) return fail('Enrage nach 7 min');
  const pct = b.hp / b.maxHp;
  for (const th of [0.75, 0.5, 0.25]) if (pct <= th && !b.addsAt?.includes(th)) { (b.addsAt ||= []).push(th); for (const n of ['add_n', 'add_e']) run.adds.add(spawnMob('phantomon', 'Phantomon', PHANTOMON_HP, at(n), { flags: 32 }).id); say(`👻 2 Phantomon (${Math.round(th * 100)} %)`); }
  for (const th of [0.6, 0.3]) if (pct <= th && !b.towersAt?.includes(th)) { (b.towersAt ||= []).push(th); for (const n of ['tower_1', 'tower_2', 'tower_3']) run.towers.add(spawnMob('illusion_tower', 'Illusion Tower', TOWER_HP, at(n)).id); say(`🗼 3 Illusionstürme (${Math.round(th * 100)} %)`); }
  // Adds füttern: Phantomon nach 20 s mit 0,3 %/s, Türme nach 25 s einmal 5 %
  for (const id of run.adds) { const a = ents.get(id); if (a && now - a.born > 20000) { b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.003 * dt); run.stats.feed += b.maxHp * 0.003 * dt; } }
  for (const id of [...run.towers]) { const a = ents.get(id); if (a && now - a.born > 25000 && !a.fed) { a.fed = true; b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.05); run.stats.feed += b.maxHp * 0.05; say('🗼 Turm füttert MaloMyotismon (+5 %)'); } }
  // Phantomon greifen an
  for (const id of run.adds) { const a = ents.get(id); const tgt = alive()[0]; if (!a || !tgt) continue; const tp = partnerOf(tgt), d = dist(a, tp); a.targetId = `p:${tgt.i}`; if (d > 30) { a.x += (tp.x - a.x) / d * 95 * dt; a.y += (tp.y - a.y) / d * 95 * dt; } else if (now >= a.nextHit) { a.nextHit = now + 1700; damagePlayer(tgt, 2500, 'Phantomon'); } }
  const tank = alive()[0]; if (!tank) return;
  const tp = partnerOf(tank); b.targetId = `p:${tank.i}`;
  if (!run.charge && pct <= 0.5) { // Pandæmonium: 8 s Ansage, raumweit
    run.charge = true; b.casting = now + 8000; say('⚠ Pandæmonium lädt (8 s, raumweit)');
    castZone(b, 'malomyotismon.pandaemonium_full', [{ x: b.x, y: b.y, r: 640 }], 8000, () => (PANDA ? 999999 : 30000));
    return;
  }
  if (now < (b.casting || 0)) return;
  const d = dist(b, tp);
  if (d > 40) { b.x += (tp.x - b.x) / d * 60 * dt; b.y += (tp.y - b.y) / d * 60 * dt; } else if (now >= b.nextHit) { b.nextHit = now + 2000; damagePlayer(tank, BOSS_HIT, 'MaloMyotismon'); }
  b.cd ||= {};
  const ready = (id) => (b.cd[id] || 0) <= now;
  if (ready('mirror')) { b.cd.mirror = now + jit(90000); b.casting = now + 2500; run.mirror = { start: now + 2500, end: now + 5500 };
    for (const pl of players) pl.handlers.evs?.([{ t: 'skill', src: b.id, skill: 'malomyotismon.dream_mirror', phase: 'cast' }]); return; }
  if (ready('wing')) { b.cd.wing = now + jit(30000); b.casting = now + 2000; castZone(b, 'malomyotismon.grisly_wing', alive().map((pl) => ({ x: partnerOf(pl).x, y: partnerOf(pl).y, r: 48 })), 2000, () => 55700); return; }
  if (ready('mark')) { b.cd.mark = now + jit(60000); b.casting = now + 1000; say('🎯 Nightmare Mark'); setTimeout(() => { if (!tank.fainted && ents.has(b.id)) damagePlayer(tank, 20000, 'Nightmare Mark'); }, 6000); }
}
function syncWindows() {
  const now = Date.now();
  for (const pl of players) {
    const sc = pl.scene, pn = pl.w.performance.now(), conv = (t) => pn + (t - now);
    sc.telegraphs.active = run.zones.flatMap((z) => z.circles.map((c) => ({ x: c.x, y: c.y, r: c.r })));
    sc.telegraphs.circles = run.zones.flatMap((z) => z.circles.map((c) => ({ x: c.x, y: c.y, r: c.r, end: conv(z.end) })));
    sc.telegraphs.mirrors = run.mirror && now < run.mirror.end ? [{ src: run.boss.id, tellEnd: conv(run.mirror.start), end: conv(run.mirror.end) }] : [];
    const st = pl.store.getState();
    if (st.target) { const e = ents.get(st.target.id); if (e && e.hp !== st.target.hp) pl.store.setState({ target: targetOf(e) }); }
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  run.boss = spawnMob('malomyotismon', 'MaloMyotismon', MALO_HP, at('boss_malomyotismon'), { flags: 16 | 32, boss: true });
  players.push(makeWindow(0));
  let last = Date.now();
  const loop = setInterval(() => { const now = Date.now(), dt = (now - last) / 1000; last = now; stepPartners(now, dt); stepBoss(now, dt); syncWindows(); }, 50);
  await wait(1500);
  players[0].w.document.querySelector('[data-act="bot"]').click();
  const end = Date.now() + DAUER; let lastSt = 0;
  if (process.env.V) { let prev = ''; setInterval(() => { const x = players[0].status(); if (x !== prev) { prev = x; say(`   [Bauzel] ${x}`); } }, 100); }
  while (Date.now() < end) {
    await wait(500);
    if (Date.now() - lastSt > 30000) { lastSt = Date.now(); say(`   Stand: MaloMyotismon ${Math.round(run.boss.hp / run.boss.maxHp * 100)} % · ${players[0].status()}`); }
    if (run.failed || (run.cleared && !players[0].inside)) { await wait(1000); break; }
  }
  clearInterval(loop);
  const s = run.stats;
  console.log(`\nRaid-Probelauf MaloMyotismon – Bauzel allein · HP ${MALO_HP} · Treffer ${TREFFER} · Krit ${KRIT} · Panzer ${PANZER} · Boss-Treffer ${BOSS_HIT}${TEMPO > 1 ? ` · ×${TEMPO}` : ''}\n`);
  for (const l of log) console.log(l);
  console.log(`\nErgebnis: ${run.cleared ? '✅ geschafft' : run.failed ? `❌ ${run.failed}` : '⏱ Zeit abgelaufen'} · Kampf ${run.pullAt ? Math.round((Date.now() - run.pullAt) / 1000) : 0} s · Boss ${Math.round(run.boss.hp / run.boss.maxHp * 100)} %`);
  console.log(`Treffer ${s.hits} · daneben ${s.miss} · Krit ${s.crit} · abgeprallt ${s.glance} · Spiegel ${s.reflect} · Flächen ${s.hit} getroffen / ${s.dodged} ausgewichen · gefüttert ${Math.round(s.feed)} HP · Stürze ${run.deaths} · Tränke ${s.pots}`);
  process.exit(run.cleared ? 0 : 1);
})();
