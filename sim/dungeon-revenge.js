#!/usr/bin/env node
// Dungeon-Probelauf: Kera-Dungeon Hard („Revenge“) – Raum 3 „Uhr“ (Diaboromon, 6 Minuten) und Raum 4 „Bucht“
// (Armageddemon mit Kuramon-Herde). Aufbau wie sim/dungeon-keramon.js: echte DigiBot-Fenster im Modus Dungeon (Hard),
// dieses Skript spielt den Server.
//
//   node sim/dungeon-revenge.js              allein (Hard ist für Gruppen gedacht – zum Datensammeln)
//   GRUPPE=3 node sim/dungeon-revenge.js     Gruppe
//   TEMPO=4 …                                Zeitraffer (höchstens 4, darüber wird es ungenau)
//   V=1 …                                    jeder Statuswechsel der Bots
//   SCHADEN=12000 HP=92660 TRAENKE=400 TRANK_HP=15000 TRANK_AB=50 BOSS_HIT=6000 DAUER=1400 …
//
// Aus den Spieldaten (Okt. 2026): Positionen, Boss-HP (Diaboromon 3 542 376, Armageddemon 3 741 367 bei bis zu 3
// Spielern, +45 % bzw. +50 % je weiterem), Uhr 6 min, Enrage Bucht 8 min, alle Attacken mit Ansage, Radius und
// Schaden: Catastrophe Cannon (geteilt: 240 % der Max-HP des Ziels, aufgeteilt auf alle im Kreis), Cannon Volley
// (Kreis auf jedem, 45 000), Tentacle Bug (Strahl, 8 000, packt und saugt 4 %/s, Arm 120 000 HP), Kopien ab 70 %
// (4 Strahlen à 30 000), Mail-Server ab 30 % (zerschlagen: Boss nimmt 25 % mehr Schaden), Ultimate Flare (Fächer,
// 60 000), Black Rain (Kreis auf jedem, 40 000, plus geteilte Hülle 240 %), Kuramon-Herde (10 Wellen à 6, alle 12 s,
// zum Ei; jedes 4. angekommene = ein Stapel für den Boss; jedes erledigte = 1 Kuramon-Daten).
// Annahmen (Server-Logik nicht im Client): Grundtreffer der Bosse BOSS_HIT alle ~2 s; Kopien sind nicht angreifbar und
// verschwinden nach 6 % weiterem Boss-Schaden; Herde 3 + 3 je Welle von West/Ost; ein Sturz allein: 5 s, dann am
// Raumeingang weiter (wie im Spiel beschrieben), beim 4. Sturz ist der Raum verloren.
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

const N = Math.max(1, Math.min(5, Number(process.env.GRUPPE) || 1));
const SCHADEN = Number(process.env.SCHADEN) || 12000;
const AS = 1121, P_SPEED = Number(process.env.P_SPEED) || 120;
const HP = Number(process.env.HP) || 92660;
const TRAENKE = Number(process.env.TRAENKE ?? 400), TRANK_HP = Number(process.env.TRANK_HP) || 15000, TRANK_AB = Number(process.env.TRANK_AB) || 50;
const BOSS_HIT = Number(process.env.BOSS_HIT) || 6000;
const DAUER = (Number(process.env.DAUER) || 1400) * 1000;
const MAP = 'network_revenge';
const script = fs.readFileSync(process.env.SKRIPT || path.join(__dirname, '..', 'digibot.user.js'), 'utf8');
const t0 = Date.now();
const sec = () => ((Date.now() - t0) / 1000).toFixed(1).padStart(6);
const log = [];
const say = (s) => { log.push(`${sec()} s  ${s}`); if (process.env.V) console.log(`${sec()} s  ${s}`); };

// ---------- Karten (Objekte aus network.tmj / network_revenge.tmj) ----------
const P = (k, v) => ({ name: k, type: 'string', value: v });
const PT = {
  from_network: [600, 872], boss_clock: [776, 696], forward_1: [648, 744], forward_2: [904, 744], forward_3: [776, 840],
  copy_1: [616, 632], copy_2: [936, 632], copy_3: [936, 840], copy_4: [856, 888],
  land_bay: [1112, 872], egg_bay: [1288, 680], boss_bay: [1288, 712], phone_1: [1128, 712], phone_2: [1288, 808], phone_3: [1448, 712],
  laptop_1: [1192, 776], laptop_2: [1384, 776], herd_w: [1080, 680], herd_e: [1480, 680],
};
const MAPS = {
  network: [
    { type: 'spawn', name: 'default', x: 504, y: 328 },
    { type: 'spawn', name: 'from_network_wargame', x: 504, y: 152 },
    { type: 'portal', name: 'network_wargame', x: 480, y: 112, width: 48, height: 16, properties: [P('toMap', 'network_wargame'), P('toSpawn', 'from_network')] },
  ],
  [MAP]: [
    ...Object.entries(PT).map(([name, [x, y]]) => ({ type: 'spawn', name, x, y })),
    { type: 'zone', name: 'room_clock', x: 544, y: 544, width: 448, height: 384 },
    { type: 'zone', name: 'room_bay', x: 1056, y: 656, width: 448, height: 272 },
    { type: 'safe', name: 'landing_clock', x: 560, y: 832, width: 96, height: 96 },
    { type: 'safe', name: 'landing_bay', x: 1072, y: 832, width: 96, height: 96 },
    { type: 'portal', name: 'gate_clock', x: 944, y: 720, width: 32, height: 32, properties: [P('toMap', MAP), P('toSpawn', 'land_bay')] },
    { type: 'portal', name: 'network', x: 560, y: 912, width: 32, height: 16, properties: [P('toMap', 'network'), P('toSpawn', 'from_network_wargame')] },
    { type: 'portal', name: 'network_bay', x: 1072, y: 912, width: 32, height: 16, properties: [P('toMap', 'network'), P('toSpawn', 'from_network_wargame')] },
  ],
};
const objOf = (mapId, name) => MAPS[mapId].find((o) => o.name === name);
const inRect = (o, p) => p.x >= o.x && p.x <= o.x + o.width && p.y >= o.y && p.y <= o.y + o.height;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const at = (n) => ({ x: PT[n][0], y: PT[n][1] });

// ---------- Spieldaten (Auszug) ----------
const ROOMS = [
  { id: 'clock', area: 'room_clock', landing: 'from_network', deathLimit: 3, clockMs: 360000, gate: 'gate_clock' },
  { id: 'bay', area: 'room_bay', landing: 'land_bay', deathLimit: 3, clear: { captures: { itemId: 'kuramon_data', per: 1, max: 60 } } },
];
const SK = (id, o) => [id, { id, element: 'dark', kind: 'damage', target: 'enemy', dsCost: 0, ...o }];
const SKILLS = Object.fromEntries([
  SK('diaboromon.catastrophe_cannon', { name: 'Catastrophe Cannon', shape: 'circle', radius: 40, power: 0, hpDamagePct: 240, share: { target: 'rotate' }, cooldownMs: 32000, castMs: 5000, range: 640 }),
  SK('diaboromon.tentacle_bug', { name: 'Tentacle Bug', shape: 'line', radius: 12, range: 260, telegraph: true, fixedDamage: 8000, cooldownMs: 22000, castMs: 1500, grab: { arm: 'tentacle_bug_arm', level: 99, statMult: 2, reel: 90, everyMs: 1000, hpPct: 4, selfPct: 50 } }),
  SK('diaboromon.cannon_volley', { name: 'Catastrophe Cannon', shape: 'circle', radius: 48, telegraph: true, each: true, fixedDamage: 45000, cooldownMs: 20000, castMs: 2200, range: 640 }),
  SK('diaboromon.overclock', { name: 'Overclock', kind: 'buff', target: 'self', shape: 'single', cooldownMs: 16000, castMs: 800, range: 1 }),
  SK('diaboromon.copy_cannon', { name: 'Catastrophe Cannon', shape: 'line', radius: 14, range: 320, telegraph: true, fixedDamage: 30000, cooldownMs: 9000, castMs: 1800 }),
  SK('armageddemon.ultimate_flare', { name: 'Ultimate Flare', shape: 'line', radius: 20, range: 360, telegraph: true, fixedDamage: 60000, cooldownMs: 24000, castMs: 2500, sweep: { arc: 140, ms: 1600 } }),
  SK('armageddemon.black_rain_storm', { name: 'Black Rain', shape: 'circle', radius: 48, telegraph: true, each: true, fixedDamage: 40000, cooldownMs: 28000, castMs: 4000, range: 640 }),
  SK('armageddemon.black_rain_shell', { name: 'Black Rain', shape: 'circle', radius: 40, power: 0, hpDamagePct: 240, share: { target: 'rotate' }, cooldownMs: 28000, castMs: 4000, range: 640 }),
]);
const PSK = [
  { id: 'imperialdramon_paladin.invincible_sword', name: 'Invincible Sword', cooldownMs: 6000, dsCost: 370, range: 112, mult: 2, def: { kind: 'damage', target: 'enemy', shape: 'circle', radius: 56, power: 352, castMs: 600 } },
  { id: 'imperialdramon_paladin.holy_grace', name: 'Holy Grace', cooldownMs: 15000, dsCost: 500, range: 32, mult: 0, heal: 0.15, def: { kind: 'heal', target: 'self', shape: 'single', power: 350, castMs: 300 } },
  { id: 'imperialdramon_paladin.paladin_guard', name: 'Paladin Guard', cooldownMs: 30000, dsCost: 600, range: 32, mult: 0, def: { kind: 'buff', target: 'self', shape: 'single', power: 0, castMs: 0 } },
  { id: 'imperialdramon_paladin.omega_blade', name: 'Omega Blade', cooldownMs: 20000, dsCost: 1050, range: 64, mult: 5, def: { kind: 'damage', target: 'enemy', shape: 'single', power: 890, castMs: 900 } },
];
const lvHp = (base, g, l) => Math.round(base + g * (l - 1));
const DIABO_HP = Math.round(lvHp(226600, 27810, 99) * 1.5 * 0.8 * (1 + 0.45 * Math.max(0, N - 3)));
const ARMA_HP = Math.round(lvHp(294600, 36150, 99) * 1.5 * 0.65 * (1 + 0.5 * Math.max(0, N - 3)));
const RAID = { id: 'revenge', gate: { mapId: 'network', portal: 'network_wargame' }, party: { min: 1, max: 5, minLevel: 1 }, deathLimit: 3, landing: 'from_network',
  dungeon: { chain: 'movie_hard', offset: 2, mode: { order: 1, label: 'dg_mode_hard' }, rooms: ROOMS } };
const bossSk = (pre) => Object.values(SKILLS).filter((s) => s.id.startsWith(pre + '.'));
const CONTENT = () => ({
  digimon: {
    imperialdramon_paladin: { name: 'Imperialdramon Paladin Mode', base: { ms: 115, as: 1300, at: 660 }, growth: { at: 92.5 } },
    diaboromon: { name: 'Diaboromon', base: { hp: 226600, at: 450 }, growth: { hp: 27810, at: 63 }, skills: [] },
    armageddemon: { name: 'Armageddemon', base: { hp: 294600, at: 475 }, growth: { hp: 36150, at: 66 }, skills: [] },
    tentacle_bug_arm: { name: 'Tentacle Bug', base: { hp: 60000, at: 0 } }, mail_server: { name: 'Mail Server', base: { hp: 120000, at: 0 } },
    kuramon: { name: 'Kuramon', base: { hp: 1208, at: 42 }, growth: { hp: 145.3, at: 6 } }, kuramon_cluster: { name: 'Kuramon Cluster', base: { hp: 90000, at: 0 } },
  },
  skills: { ...SKILLS, ...Object.fromEntries(PSK.map((k) => [k.id, { id: k.id, name: k.name, cooldownMs: k.cooldownMs, dsCost: k.dsCost, range: k.range, ...k.def }])) },
  items: { hp_pot: { id: 'hp_pot', name: 'HP-Trank' } }, npcs: {}, quests: {}, dailyById: {},
  maps: { network: { name: 'Network' }, network_wargame: { name: 'Network: War Game' }, [MAP]: { name: 'Network: Revenge' } },
  spawns: {
    network: { zones: {} },
    network_wargame: { zones: {}, raid: { id: 'wargame', gate: RAID.gate, dungeon: { mode: { order: 0, label: 'dg_mode_easy' }, rooms: [] } } },
    [MAP]: { zones: {}, raid: RAID, bosses: [
      { species: 'diaboromon', level: 99, at: 'boss_clock', skills: bossSk('diaboromon').filter((s) => s.id !== 'diaboromon.copy_cannon'),
        breakables: [{ id: 'servers', atHp: 0.3, species: 'mail_server', level: 99, statMult: 1.5, points: ['forward_1', 'forward_2', 'forward_3'] }] },
      { species: 'armageddemon', level: 99, at: 'boss_bay', skills: bossSk('armageddemon'),
        herd: { species: 'kuramon', level: 99, from: ['herd_w', 'herd_e'], to: 'egg_bay', waves: 10, perWave: 6, everyMs: 12000, perStack: 4, arriveRadius: 24 },
        breakables: [{ id: 'clusters', atHp: 0.2, species: 'kuramon_cluster', level: 99, statMult: 1.5, points: ['phone_1', 'phone_2', 'phone_3', 'laptop_1', 'laptop_2'] }] },
    ] },
  },
});

// ---------- Server-Zustand ----------
const ents = new Map();
const players = [];
const run = { inside: false, room: 0, pulled: false, pullAt: 0, deaths: 0, roomDeaths: 0, cleared: false, failed: '', boss: null, zones: [], roomStart: 0, roomTime: [],
  copies: null, exposeUntil: 0, overUntil: 0, servers: false, herd: { wave: 0, next: 0, arrived: 0, stacks: 0, captures: 0 }, clusters: false,
  perSkill: {}, stats: { skills: 0, pots: 0, reflect: 0 } };
let mobSeq = 0;

// ---------- Bot-Fenster ----------
const accounts = { leader: 0, popup: true, mirror: false, dungeon: true, list: Array.from({ length: N }, (_, i) => ({ on: true, user: `u${i}`, char: `Char${i + 1}` })) };
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
  const pl = { skillCd: {}, queued: null, i, store, w, map: 'network', goal: null, atk: null, hitAt: 0, fainted: false, reviveAt: 0, inside: false, handlers: {}, doorAt: 0, grab: null };
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
  const commands = {
    raidEnter(raid) { say(`Char${i + 1}: Betreten (${raid})`); if (raid === 'revenge') enterDungeon(pl); else say(`⚠ falscher Modus: ${raid}`); },
    raidLeave() {}, closeRaidGate() { store.setState({ windows: { ...state.windows, raid: false } }); },
    partnerFollow() { pl.atk = null; const p = ents.get(`p:${i}`); if (p) p.targetId = ''; },
    partyInvite() {}, partyRespond() {}, closeDialog() {}, talk() {}, chooseDialog() {},
  };
  const scene = {
    deps: { content: CONTENT(), commands, assetsBase: '/assets/', manifest: { maps: { network: { tmj: 'maps/network.tmj' }, [MAP]: { tmj: `maps/${MAP}.tmj` } } } },
    controlledId: () => `t:${i}`,
    tapGround: (x, y) => { if (!pl.grab) pl.goal = { x, y }; },
    select: (id) => { const e = view.get(id); store.setState({ target: e && !(e.flags & 256) ? targetOf(e) : null }); },
    telegraphs: { active: [], circles: [], marksActive: [], mirrors: [] },
    mechB: { lines: [], view: { t: 'mech', terminals: [] } },
  };
  pl.scene = scene;
  w.fetch = async (url) => ({ json: async () => ({ layers: [{ type: 'objectgroup', name: 'objects', objects: MAPS[url.match(/maps\/(\w+)\.tmj/)[1]] || [] }] }) });
  w.dmo = { store, net: { state: { entities: view }, charId: `c${i}`, on: (n, fn) => { pl.handlers[n] = fn; return () => {}; } }, game: { scene: { getScene: (k) => (k === 'world' ? scene : null) } } };
  w.addEventListener('keydown', (e) => { // F1: HP-Trank
    if (e.code !== 'F1' || pl.fainted) return;
    const me = state.me, inv = me.inventory.find((x) => x.itemId === 'hp_pot');
    if (!inv?.qty || Date.now() - (pl.potAt || 0) < 2000) return;
    pl.potAt = Date.now(); run.stats.pots++;
    store.setState({ me: { ...me, inventory: me.inventory.map((x) => (x === inv ? { ...x, qty: x.qty - 1 } : x)), partner: { ...me.partner, hp: Math.min(HP, me.partner.hp + TRANK_HP) } } });
  }, true);
  w.addEventListener('keydown', (e) => { // 2–5: Skills (Animation castMs, Treffer am Ende)
    const k = /^Digit([2-5])$/.exec(e.code)?.[1];
    if (!k || pl.fainted || !state.target) return;
    const n = Number(k) - 2, sk = PSK[n], me = state.me, now = Date.now();
    if ((pl.skillCd[n] || 0) > now || me.partner.ds < sk.dsCost) return;
    const m = ents.get(state.target.id);
    if (!m || m.hp <= 0 || m.map !== pl.map) return;
    pl.skillCd[n] = now + sk.cooldownMs;
    store.setState({ cooldowns: { ...state.cooldowns, [`skill:${n}`]: { end: w.performance.now() + sk.cooldownMs } }, me: { ...me, partner: { ...me.partner, ds: me.partner.ds - sk.dsCost } } });
    const evAll = (phase) => { for (const x of players) if (x.map === pl.map) x.handlers.evs?.([{ t: 'skill', src: `p:${i}`, skill: sk.id, phase }]); };
    evAll('cast'); setTimeout(() => evAll('release'), sk.def.castMs || 0);
    if (sk.heal) { const s2 = store.getState(); store.setState({ me: { ...s2.me, partner: { ...s2.me.partner, hp: Math.min(HP, s2.me.partner.hp + HP * sk.heal) } } }); }
    if (sk.mult) { pl.queued = { n, id: m.id }; pl.atk = m.id; }
  }, true);
  w.addEventListener('keydown', (e) => {
    if (e.code !== 'Digit1' || !state.target || pl.fainted) return;
    const m = ents.get(state.target.id);
    if (m && m.hp > 0 && m.map === pl.map) pl.atk = m.id;
  }, true);
  const [sx, sy] = [504 + i * 24, 328];
  ents.set(`t:${i}`, { id: `t:${i}`, kind: 0, map: 'network', x: sx, y: sy, hp: 1, flags: 0, targetId: '' });
  ents.set(`p:${i}`, { id: `p:${i}`, kind: 1, map: 'network', x: sx + 10, y: sy, hp: 1, flags: 0, targetId: '' });
  store.setState({ screen: 'world', inputFocus: 'game', cooldowns: {}, windows: {}, raid: null,
    session: { username: `u${i}`, characters: [{ id: `c${i}`, name: `Char${i + 1}` }] },
    me: { tamerEntityId: `t:${i}`, tamerDs: 300, tamerMaxDs: 360, hotbar: ['cmd:attack', 'skill:0', 'skill:1', 'skill:2', 'skill:3', null, null, null, 'item:hp_pot'],
      inventory: TRAENKE ? [{ itemId: 'hp_pot', qty: TRAENKE }] : [], quests: {},
      partner: { entityId: `p:${i}`, name: 'Imperialdramon Paladin Mode', species: 'imperialdramon_paladin', stage: 'super', level: 99, hp: HP, maxHp: HP, ds: 9365, maxDs: 9365, exp: 0, expNext: 0,
        stats: { at: 12806, as: AS, ms: 120 }, skills: PSK.map((k) => ({ id: k.id, name: k.name, dsCost: k.dsCost, cooldownMs: k.cooldownMs, range: k.range, unlocked: true })) } },
    world: { mapId: 'network', mapName: 'Network', channel: 1 }, target: null });
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ dungeon: true, dgMode: 'hard', autopilot: false, farm: false, questMode: false, hpPot: TRANK_AB, dsPot: 0, tdsPot: 0, tab: 'data', lvlDiff: 100, radius: 400 }));
  w.localStorage.setItem('digibot.accounts', JSON.stringify(accounts));
  w.eval(script);
  pl.status = () => w.document.querySelector('[data-f="status"]')?.textContent || '';
  return pl;
}

// ---------- Weltablauf ----------
function moveTo(map, name, pl) {
  const sp = objOf(map, name) || at(name);
  const t = ents.get(`t:${pl.i}`), p = ents.get(`p:${pl.i}`);
  pl.store.setState({ screen: 'loading', target: null });
  pl.goal = null; pl.atk = null; pl.loading = true; pl.grab = null;
  setTimeout(() => {
    pl.loading = false; pl.map = map; t.map = p.map = map;
    t.x = sp.x; t.y = sp.y; p.x = sp.x + 10; p.y = sp.y;
    pl.store.setState({ screen: 'world', world: { mapId: map, mapName: CONTENT().maps[map].name, channel: 1 }, target: null,
      raid: map === MAP ? { raid: 'revenge', mapId: map, inside: true, members: [] } : null, windows: { ...pl.store.getState().windows, raid: false } });
  }, 300);
}
function hud() {
  const ev = { t: 'dungeon', raid: 'revenge', offset: 2, room: run.room, rooms: ROOMS.length, roomId: ROOMS[Math.min(run.room, ROOMS.length - 1)].id,
    pulled: run.pulled, deaths: run.roomDeaths, deathLimit: 3, clockMs: run.room === 0 ? 360000 : 0, clockEndsAt: 0, paid: true, paidIds: [] };
  for (const pl of players) if (pl.inside) pl.handlers.me?.([ev]);
}
function enterDungeon(leader) {
  if (run.inside || run.failed) return;
  const door = { x: 504, y: 140 };
  const who = players.filter((pl) => pl === leader || (pl.map === 'network' && dist(ents.get(`t:${pl.i}`), door) <= 140));
  run.inside = true; run.enteredAt = Date.now(); run.roomStart = Date.now();
  say(`Betreten: ${who.map((pl) => `Char${pl.i + 1}`).join(', ')}`);
  for (const pl of who) { pl.inside = true; moveTo(MAP, 'from_network', pl); }
  spawnBoss('diaboromon', 'boss_clock', DIABO_HP);
  setTimeout(hud, 500);
}
function spawnMob(species, name, hp, p, extra = {}) {
  const id = `m:${++mobSeq}`;
  const e = { id, kind: 2, map: MAP, defId: species, name, level: 99, x: p.x, y: p.y, hp, maxHp: hp, flags: 0, targetId: '', nextHit: 0, ...extra };
  ents.set(id, e);
  return e;
}
function spawnBoss(species, point, hp) {
  run.boss = spawnMob(species, species === 'diaboromon' ? 'Diaboromon' : 'Armageddemon', hp, at(point), { flags: 16 | 32, boss: true, cd: {}, casting: 0 });
  run.boss.home = at(point);
}
const alivePlayers = () => players.filter((pl) => pl.inside && !pl.fainted && pl.map === MAP);
const partnerOf = (pl) => ents.get(`p:${pl.i}`);
function damagePlayer(pl, dmg, what) {
  if (pl.fainted) return;
  const st = pl.store.getState(), p = st.me.partner, hp = Math.max(0, p.hp - dmg);
  pl.store.setState({ me: { ...st.me, partner: { ...p, hp, fainted: hp <= 0 } } });
  if (hp <= 0) {
    pl.fainted = true; pl.atk = null; pl.reviveAt = Date.now() + 5000; pl.grab = null;
    run.deaths++; run.roomDeaths++;
    say(`💀 Char${pl.i + 1} fällt (${what}) – Stürze in Raum ${run.room + 3}: ${run.roomDeaths}/3`);
    for (const m of ents.values()) if (m.targetId === `p:${pl.i}`) m.targetId = '';
    if (run.roomDeaths > 3 || (N > 1 && !alivePlayers().length)) failRun(run.roomDeaths > 3 ? 'zu viele Stürze' : 'alle gefallen');
    hud();
  }
}
function failRun(why) {
  if (run.failed) return;
  run.failed = why;
  const b = run.boss;
  say(`❌ Raum ${run.room + 3} gescheitert: ${why}${b ? ` – ${b.name} bei ${Math.round(b.hp / b.maxHp * 100)} %` : ''}`);
  for (const pl of players) if (pl.inside) { pl.inside = false; moveTo('network', 'from_network_wargame', pl); }
}
function stepPartners(now, dt) {
  for (const pl of players) {
    const t = ents.get(`t:${pl.i}`), p = partnerOf(pl);
    if (pl.fainted) {
      if (now >= pl.reviveAt && !run.failed) {
        pl.fainted = false;
        const st = pl.store.getState();
        pl.store.setState({ me: { ...st.me, partner: { ...st.me.partner, hp: HP, fainted: false } } });
        const sp = at(ROOMS[Math.min(run.room, ROOMS.length - 1)].landing);
        t.x = sp.x; t.y = sp.y; p.x = sp.x + 10; p.y = sp.y; pl.goal = null;
        say(`Char${pl.i + 1} ist wieder da (Raumeingang)`);
      }
      continue;
    }
    const st0 = pl.store.getState(), p0 = st0.me.partner;
    if (p0.hp < HP && ![...ents.values()].some((e) => e.targetId === `p:${pl.i}`) && !pl.grab) pl.store.setState({ me: { ...st0.me, partner: { ...p0, hp: Math.min(HP, p0.hp + HP * 0.03 * dt) } } });
    if (p0.ds < 9365) { const s1 = pl.store.getState(); pl.store.setState({ me: { ...s1.me, partner: { ...s1.me.partner, ds: Math.min(9365, s1.me.partner.ds + 9365 * 0.01 * dt) } } }); }
    if (pl.grab) { // gepackt: wird zum Boss gezogen und ausgesaugt, bis der Arm bricht
      const arm = ents.get(pl.grab.arm);
      if (!arm) { pl.grab = null; say(`Char${pl.i + 1} ist frei (Arm zerbrochen)`); }
      else {
        const b = run.boss; const d = dist(p, b);
        if (d > 40) { p.x += (b.x - p.x) / d * 90 * dt; p.y += (b.y - p.y) / d * 90 * dt; t.x = p.x - 10; t.y = p.y; }
        arm.x = p.x; arm.y = p.y;
        if (now >= pl.grab.next) { pl.grab.next = now + 1000; damagePlayer(pl, HP * 0.04, 'Tentacle Bug (Saugen)'); b.hp = Math.min(b.maxHp, b.hp + HP * 0.02); }
      }
    }
    if (pl.goal && !pl.grab) {
      const dx = pl.goal.x - t.x, dy = pl.goal.y - t.y, d = Math.hypot(dx, dy), step = 160 * dt;
      if (d <= step) { t.x = pl.goal.x; t.y = pl.goal.y; pl.goal = null; } else { t.x += dx / d * step; t.y += dy / d * step; }
    }
    const m = pl.atk && ents.get(pl.atk);
    if (m && m.hp > 0 && m.map === pl.map) {
      const d = dist(p, m), reach = 26;
      p.targetId = m.id;
      if (d > reach && !pl.grab) { const step = P_SPEED * dt; p.x += (m.x - p.x) / d * Math.min(step, d - reach + 1); p.y += (m.y - p.y) / d * Math.min(step, d - reach + 1); }
      else if (now >= pl.hitAt && now >= (pl.castUntil || 0)) { pl.hitAt = now + AS; hitMob(pl, m, SCHADEN); }
      if (pl.queued && pl.queued.id === m.id && d <= PSK[pl.queued.n].range + 26 && now >= (pl.castUntil || 0)) {
        run.stats.skills++; const q = pl.queued; pl.queued = null; const ms = PSK[q.n].def.castMs || 0; pl.castUntil = now + ms;
        setTimeout(() => { const mm = ents.get(q.id); if (mm && mm.hp > 0 && !pl.fainted) hitMob(pl, mm, SCHADEN * PSK[q.n].mult); }, ms);
      }
    } else if (!pl.grab) {
      pl.atk = null; p.targetId = '';
      const d = dist(p, t);
      if (d > 14) { const step = P_SPEED * 1.1 * dt; p.x += (t.x + 10 - p.x) / d * Math.min(step, d); p.y += (t.y - p.y) / d * Math.min(step, d); }
    }
    portals(pl, t, now);
  }
}
function hitMob(pl, m, dmg) {
  if (m.flags & 256) return;
  const mult = m.boss && Date.now() < run.exposeUntil ? 1.25 : 1;
  m.hp = Math.max(0, m.hp - dmg * mult);
  if (m.hp <= 0) killMob(m, pl);
}
function killMob(m, pl) {
  ents.delete(m.id);
  for (const x of players) { if (x.atk === m.id) x.atk = null; const st = x.store.getState(); if (st.target?.id === m.id) x.store.setState({ target: { ...st.target, hp: 0 } }); }
  for (const G of players) G.handlers.evs?.([{ t: 'die', id: m.id }]);
  if (m.defId === 'kuramon') { run.herd.captures = Math.min(60, run.herd.captures + 1); return; }
  if (m.defId === 'mail_server') { run.exposeUntil = Date.now() + 15000; say(`📧 Mail-Server zerschlagen von Char${pl.i + 1} – Diaboromon nimmt 15 s lang 25 % mehr Schaden`); return; }
  if (m.defId === 'tentacle_bug_arm') return;
  if (m.boss) {
    run.roomTime.push(Date.now() - run.roomStart); run.roomStart = Date.now();
    if (run.room === 0) {
      say(`🏆 Diaboromon besiegt (Uhr: ${Math.round((Date.now() - run.pullAt) / 1000)} s von 360)`);
      for (const e of [...ents.values()]) if (e.kind === 2) ents.delete(e.id);
      run.copies = null; run.room = 1; run.pulled = false; run.roomDeaths = 0;
      spawnBoss('armageddemon', 'boss_bay', ARMA_HP);
    } else {
      say(`🏆 Armageddemon besiegt – Kuramon-Daten aus der Herde: ${run.herd.captures}`);
      run.room = 2; run.cleared = true;
    }
    hud();
  }
}
function portals(pl, t, now) {
  if (pl.loading) return;
  for (const o of MAPS[pl.map]) {
    if (o.type !== 'portal' || !inRect(o, t)) continue;
    const to = o.properties.find((q) => q.name === 'toMap').value, sp = o.properties.find((q) => q.name === 'toSpawn').value;
    if (o.name === 'network_wargame') {
      if (now - pl.doorAt > 3000 && !pl.store.getState().raid) {
        pl.doorAt = now;
        pl.store.setState({ raid: { raid: 'wargame', mapId: 'network_wargame', inside: false, members: [], iLead: pl.i === 0 }, windows: { ...pl.store.getState().windows, raid: true } });
        say(`Char${pl.i + 1} steht in der Tür – Dungeon-Fenster offen`);
      }
      return;
    }
    if (o.name === 'gate_clock') { if (run.room < 1) return; say(`Char${pl.i + 1} geht durchs Tor`); moveTo(to, sp, pl); return; }
    if (o.name === 'network_bay' && !run.cleared) return;
    say(`Char${pl.i + 1} verlässt den Dungeon (${o.name}${run.cleared ? '' : ' – vorzeitig!'})`);
    pl.inside = false; moveTo(to, sp, pl);
    return;
  }
}
// Fläche ansagen, nach castMs auswerten. share: Schaden (240 % der Max-HP des Ziels) auf alle im Kreis um das Ziel verteilt.
function castZone(src, skill, opt) {
  const now = Date.now(), z = { src: src.id, skill, circles: opt.circles || [], line: opt.line || null, end: now + opt.castMs, follow: opt.follow || null };
  run.zones.push(z);
  for (const pl of players) pl.handlers.evs?.([{ t: 'skill', src: src.id, skill, phase: 'cast', ...(z.line ? { x: z.line.tx, y: z.line.ty } : {}) }]);
  setTimeout(() => {
    run.zones = run.zones.filter((x) => x !== z);
    for (const pl of players) pl.handlers.evs?.([{ t: 'skill', src: src.id, skill, phase: 'release', ...(z.line ? { x: z.line.tx, y: z.line.ty } : {}) }]);
    if (!ents.has(src.id) || run.failed) return;
    const ps = run.perSkill[skill] ||= { casts: 0, hit: 0, dodged: 0 };
    ps.casts++;
    if (opt.share) { // geteilt: Ziel immer getroffen, Schaden durch alle im Kreis um das Ziel
      const tgt = opt.share; if (tgt.fainted || !tgt.inside) return;
      const c = partnerOf(tgt), inn = alivePlayers().filter((pl) => pl === tgt || dist(partnerOf(pl), c) <= 40);
      const each = Math.round(HP * 2.4 / inn.length);
      ps.hit += inn.length;
      say(`💥 ${SKILLS[skill].name} (geteilt) auf Char${tgt.i + 1}: ${inn.length} im Kreis → je ${each}`);
      for (const pl of inn) damagePlayer(pl, each, `${SKILLS[skill].name} (geteilt)`);
      return;
    }
    for (const pl of alivePlayers()) {
      const p = partnerOf(pl);
      const inside = z.circles.some((cc) => dist(p, cc) <= cc.r) || (z.line && inLine(p, z.line));
      if (!inside) { ps.dodged++; continue; }
      ps.hit++;
      damagePlayer(pl, opt.dmg, SKILLS[skill].name);
      opt.onHit?.(pl);
      if (opt.first) break;
    }
  }, opt.castMs);
}
function inLine(p, l) {
  if (l.sweep) { // Fächer um den Boss
    const d = Math.hypot(p.x - l.fx, p.y - l.fy); if (d > l.len + l.r) return false;
    let diff = Math.abs(Math.atan2(p.y - l.fy, p.x - l.fx) - Math.atan2(l.ty - l.fy, l.tx - l.fx)); if (diff > Math.PI) diff = 2 * Math.PI - diff;
    return diff <= l.sweep / 2 * Math.PI / 180;
  }
  const vx = l.tx - l.fx, vy = l.ty - l.fy, L2 = vx * vx + vy * vy || 1;
  const k = Math.max(0, Math.min(1, ((p.x - l.fx) * vx + (p.y - l.fy) * vy) / L2));
  return Math.hypot(p.x - (l.fx + vx * k), p.y - (l.fy + vy * k)) <= l.r;
}
const lineTo = (from, to, len, r) => { const a = Math.atan2(to.y - from.y, to.x - from.x); return { fx: from.x, fy: from.y, tx: from.x + Math.cos(a) * len, ty: from.y + Math.sin(a) * len, r }; };
function pullCheck(zoneName, landName, msg) {
  const zone = objOf(MAP, zoneName), land = objOf(MAP, landName);
  if (alivePlayers().some((pl) => { const t = ents.get(`t:${pl.i}`); return inRect(zone, t) && !inRect(land, t); })) { run.pulled = true; run.pullAt = Date.now(); say(msg); hud(); }
}
function bossMelee(b, now, every) {
  const alive = alivePlayers(); if (!alive.length) return null;
  const tank = alive.reduce((a, pl) => (dist(partnerOf(pl), b) < dist(partnerOf(a), b) ? pl : a));
  const tp = partnerOf(tank); b.targetId = `p:${tank.i}`;
  const d = dist(b, tp);
  if (d > 40 && b.ms) { b.x += (tp.x - b.x) / d * b.ms * 0.05; b.y += (tp.y - b.y) / d * b.ms * 0.05; }
  else if (d <= 48 && now >= b.nextHit) { b.nextHit = now + every; damagePlayer(tank, BOSS_HIT * (1 + (run.herd.stacks || 0) * 0.03), b.name); }
  return tank;
}
const pickW = (opts) => { const tot = opts.reduce((s, o) => s + o.w, 0); let r = Math.random() * tot; for (const o of opts) { r -= o.w; if (r <= 0) return o.id; } return opts[0]?.id; };
const jit = (ms) => ms * (0.75 + Math.random() * 0.5);
// Raum 3: Diaboromon, 6 Minuten
let shareRot = 0;
function stepClock(now) {
  const b = run.boss; if (!b || !ents.has(b.id)) return;
  if (!run.pulled) return pullCheck('room_clock', 'landing_clock', 'Raum 3: die Uhr läuft (6 min)');
  if (now - run.pullAt > 360000) return failRun('die Zeit ist abgelaufen');
  b.ms = 90;
  const pct = b.hp / b.maxHp;
  if (!run.copies && pct <= 0.7) { run.copies = { until: pct - 0.06, next: now + 3000 }; say('👯 Kopien erscheinen (70 %) – Strahlen aus allen Ecken'); }
  if (run.copies && pct <= run.copies.until) { run.copies = { done: true }; say('Kopien falten sich zurück'); }
  if (!run.servers && pct <= 0.3) { run.servers = true; for (const n of ['forward_1', 'forward_2', 'forward_3']) spawnMob('mail_server', 'Mail Server', 180000, at(n)); say('📧 Mail-Server erscheinen (30 %)'); }
  const over = now < run.overUntil;
  const tank = bossMelee(b, now, over ? 1800 / 1.35 : 1800);
  if (!tank || now < b.casting) return;
  if (run.copies && !run.copies.done && now >= run.copies.next) { // jede Kopie feuert einen Strahl
    run.copies.next = now + jit(9000);
    for (const n of ['copy_1', 'copy_2', 'copy_3', 'copy_4']) {
      const c = { id: `copy:${n}`, x: PT[n][0], y: PT[n][1] };
      const tgt = alivePlayers().reduce((a, pl) => (dist(partnerOf(pl), c) < dist(partnerOf(a), c) ? pl : a));
      castZone(run.boss, 'diaboromon.copy_cannon', { line: lineTo(c, partnerOf(tgt), 320, 14), castMs: 1800, dmg: 30000 });
    }
  }
  const ready = (id) => (b.cd[id] || 0) <= now;
  const opts = [{ id: 'diaboromon.catastrophe_cannon', w: 2 }, { id: 'diaboromon.cannon_volley', w: 1.5 }, { id: 'diaboromon.tentacle_bug', w: 1 }, ...(pct < 0.3 ? [{ id: 'diaboromon.overclock', w: 3 }] : [])].filter((o) => ready(o.id));
  if (!opts.length) return;
  const id = pickW(opts), sk = SKILLS[id];
  b.cd[id] = now + jit(sk.cooldownMs); b.casting = now + sk.castMs;
  const alive = alivePlayers();
  if (id === 'diaboromon.catastrophe_cannon') {
    const tgt = alive[shareRot++ % alive.length], tp = partnerOf(tgt);
    castZone(b, id, { circles: [{ x: tp.x, y: tp.y, r: 40 }], castMs: sk.castMs, share: tgt });
    say(`⚠ Catastrophe Cannon zielt auf Char${tgt.i + 1} (5 s)`);
  } else if (id === 'diaboromon.cannon_volley') {
    castZone(b, id, { circles: alive.map((pl) => ({ x: partnerOf(pl).x, y: partnerOf(pl).y, r: 48 })), castMs: sk.castMs, dmg: 45000 });
  } else if (id === 'diaboromon.tentacle_bug') {
    castZone(b, id, { line: lineTo(b, partnerOf(tank), 260, 12), castMs: sk.castMs, dmg: 8000, first: true, onHit: (pl) => {
      const arm = spawnMob('tentacle_bug_arm', 'Tentacle Bug', 120000, partnerOf(pl), { targetId: `p:${pl.i}` });
      pl.grab = { arm: arm.id, next: Date.now() + 1000 }; pl.goal = null;
      say(`🦑 Char${pl.i + 1} gepackt – Arm zerschlagen!`);
    } });
  } else if (id === 'diaboromon.overclock') {
    run.overUntil = now + 16000;
    for (const pl of players) pl.handlers.evs?.([{ t: 'skill', src: b.id, skill: id, phase: 'cast' }]);
  }
}
// Raum 4: Armageddemon mit Herde
function stepBay(now, dt) {
  const b = run.boss; if (!b || !ents.has(b.id)) return;
  if (!run.pulled) { pullCheck('room_bay', 'landing_bay', 'Raum 4: Armageddemon und die Herde'); if (run.pulled) run.herd.next = Date.now(); return; }
  if (now - run.pullAt > 480000) return failRun('Enrage nach 8 min');
  const H = run.herd, egg = at('egg_bay');
  if (H.wave < 10 && now >= H.next) {
    H.wave++; H.next = now + 12000;
    for (let k = 0; k < 6; k++) spawnMob('kuramon', 'Kuramon', lvHp(1208, 145.3, 99), at(k < 3 ? 'herd_w' : 'herd_e'), { herd: true, y: PT.herd_w[1] + (k % 3) * 14 - 14 });
    say(`🪼 Herde Welle ${H.wave}/10 (6 Kuramon)`);
  }
  for (const m of [...ents.values()]) {
    if (m.defId !== 'kuramon' || !m.herd) continue;
    const d = dist(m, egg);
    if (d <= 24) { ents.delete(m.id); H.arrived++; if (H.arrived % 4 === 0 && H.stacks < 15) { H.stacks++; say(`🥚 ${H.arrived} Kuramon am Ei – Armageddemon Stärke ${H.stacks}`); } continue; }
    m.x += (egg.x - m.x) / d * 60 * dt; m.y += (egg.y - m.y) / d * 60 * dt;
  }
  if (!run.clusters && b.hp / b.maxHp <= 0.2) { run.clusters = true; for (const n of ['phone_1', 'phone_2', 'phone_3', 'laptop_1', 'laptop_2']) spawnMob('kuramon_cluster', 'Kuramon Cluster', 135000, at(n)); say('Kuramon-Cluster erscheinen (20 %)'); }
  b.ms = 60;
  const tank = bossMelee(b, now, 2000);
  if (!tank || now < b.casting) return;
  const ready = (id) => (b.cd[id] || 0) <= now;
  const opts = [{ id: 'armageddemon.ultimate_flare', w: 1 }, { id: 'armageddemon.black_rain_storm', w: 1.5 }].filter((o) => ready(o.id));
  if (!opts.length) return;
  const id = pickW(opts), sk = SKILLS[id];
  b.cd[id] = now + jit(sk.cooldownMs); b.casting = now + sk.castMs;
  const alive = alivePlayers();
  if (id === 'armageddemon.ultimate_flare') {
    const l = lineTo(b, partnerOf(tank), 360, 20); l.sweep = 140; l.len = 360;
    castZone(b, id, { line: l, castMs: sk.castMs, dmg: 60000 });
  } else {
    castZone(b, id, { circles: alive.map((pl) => ({ x: partnerOf(pl).x, y: partnerOf(pl).y, r: 48 })), castMs: sk.castMs, dmg: 40000 });
    const tgt = alive[shareRot++ % alive.length], tp = partnerOf(tgt);
    b.cd['armageddemon.black_rain_shell'] = now + sk.cooldownMs;
    castZone(b, 'armageddemon.black_rain_shell', { circles: [{ x: tp.x, y: tp.y, r: 40 }], castMs: sk.castMs, share: tgt });
  }
}
function syncWindows() {
  const now = Date.now();
  for (const pl of players) {
    const sc = pl.scene, pn = pl.w.performance.now(), conv = (t) => pn + (t - now);
    const zs = pl.map === MAP ? run.zones : [];
    sc.telegraphs.active = zs.flatMap((z) => z.circles.map((c) => ({ x: c.x, y: c.y, r: c.r })));
    sc.telegraphs.circles = zs.flatMap((z) => z.circles.map((c) => ({ x: c.x, y: c.y, r: c.r, end: conv(z.end) })));
    sc.mechB.lines = zs.filter((z) => z.line).map((z) => ({ src: z.src, fx: z.line.fx, fy: z.line.fy, tx: z.line.tx, ty: z.line.ty, r: z.line.r, skill: SKILLS[z.skill], end: conv(z.end), sweeping: false }));
    const st = pl.store.getState();
    if (st.target) { const e = ents.get(st.target.id); if (e && (e.hp !== st.target.hp || e.name !== st.target.name)) pl.store.setState({ target: targetOf(e) }); }
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  for (let i = 0; i < N; i++) players.push(makeWindow(i));
  let last = Date.now();
  const loop = setInterval(() => {
    const now = Date.now(), dt = (now - last) / 1000; last = now;
    stepPartners(now, dt);
    if (run.inside && !run.failed) { if (run.room === 0) stepClock(now); else if (run.room === 1) stepBay(now, dt); }
    syncWindows();
  }, 50);
  await wait(1500);
  const on = (pl) => !/Bot aus/.test(pl.status());
  if (N > 1) players[0].w.document.querySelector('[data-act="grp-start"]')?.click();
  await wait(2000);
  for (const pl of players) if (!on(pl)) pl.w.document.querySelector('[data-act="bot"]').click();
  await wait(500);
  say(`Bots: ${players.map((pl) => (on(pl) ? 'an' : 'AUS')).join(', ')}`);
  if (process.env.V) { const prev = {}; setInterval(() => { for (const pl of players) { const x = pl.status(); if (x !== prev[pl.i]) { prev[pl.i] = x; say(`   [Char${pl.i + 1}] ${x}`); } } }, 100); }
  const end = Date.now() + DAUER;
  let lastStatus = 0;
  while (Date.now() < end) {
    await wait(500);
    if (Date.now() - lastStatus > 30000) { lastStatus = Date.now(); const b = run.boss; say(`   Stand: ${b && ents.has(b.id) ? `${b.name} ${Math.round(b.hp / b.maxHp * 100)} %` : '–'} · ${players.map((pl) => `Char${pl.i + 1}: ${pl.status()}`).join(' | ')}`); }
    if (run.inside && players.every((pl) => !pl.inside) && (run.cleared || run.failed)) { await wait(2000); break; }
  }
  clearInterval(loop);
  console.log(`\nDungeon-Probelauf Kera Hard (Revenge) – ${N} Bot${N > 1 ? 's' : ''} · Grundangriff ${SCHADEN}/${AS} ms + Skills · HP ${HP} · Diaboromon ${DIABO_HP} · Armageddemon ${ARMA_HP}${TEMPO > 1 ? ` · Zeitraffer ×${TEMPO}` : ''}\n`);
  for (const l of log) console.log(l);
  const b = run.boss;
  console.log(`\nErgebnis: ${run.cleared ? '✅ geschafft' : run.failed ? `❌ gescheitert (${run.failed})` : '⏱ Zeit abgelaufen'}${!run.cleared && b ? ` – ${b.name} bei ${Math.round(b.hp / b.maxHp * 100)} %` : ''}`);
  console.log(`Räume ${run.roomTime.map((t) => `${(t / 1000).toFixed(0)} s`).join(' / ') || '–'} · Stürze ${run.deaths} · Tränke ${run.stats.pots} · Skills ${run.stats.skills}${run.room >= 1 ? ` · Herde: ${run.herd.captures} erledigt, ${run.herd.arrived} am Ei, Boss-Stärke ${run.herd.stacks}` : ''}`);
  console.log(`Attacken (Ansagen · getroffen · ausgewichen): ${Object.entries(run.perSkill).map(([k, v]) => `${k} ${v.casts} · ${v.hit} · ${v.dodged}`).join(' | ')}`);
  console.log(`Status am Ende: ${players.map((pl) => `Char${pl.i + 1}: ${pl.status()}`).join(' | ')}`);
  process.exit(run.cleared ? 0 : 1);
})();
