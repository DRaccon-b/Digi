#!/usr/bin/env node
// Dungeon-Probelauf: Kera-Dungeon Easy („War Game“) – ein ganzer Lauf von der Tür bis zum Ausgang.
// Echte DigiBot-Fenster (Modus Dungeon, in der Gruppe über den Gruppenkanal) laufen in einer gemeinsamen, nachgebauten
// Dungeon-Welt. Dieses Skript spielt den Server: Tür-Fenster und Betreten, Raum 1 mit sieben Wellen und sechs Terminals
// (Tsumemon fressen sie in 8 s und werden zu Keramon, Chrysalimon bewachen sie), Tor, Raum 2 mit Keramon
// (→ Chrysalimon ab 70 % → Infermon ab 40 %) samt Warnkreisen, Strahl, Spiegel und „NOT HERE“, Stürze, Ausgang.
//
//   node sim/dungeon-keramon.js              Gruppe aus 3 Bots
//   GRUPPE=1 node sim/dungeon-keramon.js     allein
//   V=1 …                                    zusätzlich jeder Statuswechsel der Bots
//   SCHADEN=12000 HP=92660 BOSS_HP=3459500 DAUER=1000 …
//   TRAENKE=40 TRANK_HP=15000 TRANK_AB=50 …        HP-Tränke auf F1 (Anzahl, Heilung, Schwelle in %)
//   TEMPO=4 …                                      Zeitraffer: alle Uhren und Timer laufen 4× schneller (über 4 wird es zu ungenau)
//   TEAM=clavis …                                  Bauzel (Imperialdramon Paladin Lv 99) + 4 ClavisAngemon Lv 70
//   SCHNELL=1 …                                    verkürzt (Boss-HP und Enrage ÷ 10) – für den Test
//
// Partner wie im ersten Live-Lauf (Okt. 2026): Imperialdramon Paladin Mode Lv 99 – 92 660 HP, 9 365 DS, Angriffstempo
// 1 121 ms, Skills Invincible Sword (6 s), Holy Grace (15 s), Paladin Guard (30 s, Buff), Omega Blade (20 s).
// Schaden ist auf die live gemessenen ~18 000 pro Sekunde (allein) kalibriert: Grundangriff SCHADEN, Skills 2–4×.
// Positionen, Wellen, Terminals, Boss-HP (3 459 500 bei bis zu 3 Spielern, +10 % je weiterem), Formen, Attacken,
// Enrage nach 600 s und Infermons Mahlzeit (5 s; abbrechen mit 2 % der Max-HP an Schaden, sonst +8 % HP und ein
// Stapel) stammen aus den Spieldaten bzw. dem Live-Lauf. Annahmen (Server-Logik): nach einer Welle ohne Pflicht-Monster
// kommt die nächste sofort, sonst 4 s nach der letzten; hungrige Tsumemon fressen weiter, auch wenn man sie schlägt;
// außerhalb des Kampfes 3 % HP/s Erholung; Boss-Grundtreffer 2 500 (+4 % je Stapel).
const path = require('path');
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const { BroadcastChannel } = require('worker_threads');

// Zeitraffer: Date.now, performance.now und alle Timer (hier und in den Bot-Fenstern) laufen TEMPO-mal so schnell.
// Der Bot merkt davon nichts – sein Takt, die Cooldowns und die Laufwege bleiben im Verhältnis gleich.
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
const TEAM = process.env.TEAM || '';
const N = TEAM === 'clavis' ? 5 : Math.max(1, Math.min(5, Number(process.env.GRUPPE) || 3));
const SCHNELL = !!process.env.SCHNELL;
const SCHADEN = Number(process.env.SCHADEN) || 12000;    // Grundangriff je Treffer (alle AS ms)
const AS = 1121;                                          // Angriffstempo Imperialdramon Paladin
const P_SPEED = Number(process.env.P_SPEED) || 120;       // Laufen des Digimons in px/s (Wert ms 120; live gemessen ~190 px in ~1,6 s)
const HP = Number(process.env.HP) || 92660;               // Max-HP je Partner
const BOSS_HP = Math.round((Number(process.env.BOSS_HP) || 3459500) * (1 + 0.1 * Math.max(0, N - 3)) / (SCHNELL ? 10 : 1));
const ENRAGE_MS = 600000 / (SCHNELL ? 10 : 1);
const DAUER = (Number(process.env.DAUER) || 1000) * 1000;
// Skills auf 2–5 wie in den Spieldaten (Schaden als Vielfaches des Grundangriffs, grob nach Power; Holy Grace heilt,
// Paladin Guard ist ein Buff). Invincible Sword ist eine Kreis-Fläche – sein Skill-Ereignis geht wie im Spiel an alle.
const PSK = [
  { id: 'imperialdramon_paladin.invincible_sword', name: 'Invincible Sword', cooldownMs: 6000, dsCost: 370, range: 112, mult: 2, def: { kind: 'damage', target: 'enemy', shape: 'circle', radius: 56, power: 352, castMs: 600 } },
  { id: 'imperialdramon_paladin.holy_grace', name: 'Holy Grace', cooldownMs: 15000, dsCost: 500, range: 32, mult: 0, heal: 0.15, def: { kind: 'heal', target: 'self', shape: 'single', power: 350, castMs: 300 } },
  { id: 'imperialdramon_paladin.paladin_guard', name: 'Paladin Guard', cooldownMs: 30000, dsCost: 600, range: 32, mult: 0, def: { kind: 'buff', target: 'self', shape: 'single', power: 0, castMs: 0 } },
  { id: 'imperialdramon_paladin.omega_blade', name: 'Omega Blade', cooldownMs: 20000, dsCost: 1050, range: 64, mult: 5, def: { kind: 'damage', target: 'enemy', shape: 'single', power: 890, castMs: 900 } },
];
// ClavisAngemon (Spieldaten) und Team – Werte wie im Hard-Probelauf (Grundwert + Wachstum × Level, Bauzels Aufschlag)
const CSK = [
  { id: 'clavisangemon.key_of_hope', name: 'Key of Hope', cooldownMs: 45000, dsCost: 535, range: 128, mult: 0, koh: true, def: { kind: 'buff', target: 'self', shape: 'circle', radius: 128, power: 0, protectionMs: 2000, castMs: 0 } },
  { id: 'clavisangemon.gate_of_judgment', name: 'Gate of Judgment', cooldownMs: 18000, dsCost: 895, range: 144, mult: 3.5, def: { kind: 'damage', target: 'enemy', shape: 'single', power: 650, castMs: 900 } },
  { id: 'clavisangemon.divine_lock', name: 'Divine Lock', cooldownMs: 12000, dsCost: 535, range: 128, mult: 1.5, def: { kind: 'debuff', target: 'enemy', shape: 'single', power: 260, castMs: 300 } },
  { id: 'clavisangemon.sacred_seal', name: 'Sacred Seal', cooldownMs: 18000, dsCost: 535, range: 128, mult: 0, healAll: 0.25, def: { kind: 'heal', target: 'ally', shape: 'circle', radius: 96, power: 870, castMs: 300 } },
];
const PALADIN = { species: 'imperialdramon_paladin', name: 'Imperialdramon Paladin Mode', level: 99, hp: HP, ds: 9365, as: AS, dmg: SCHADEN, at: 12806, psk: PSK };
const CLAVIS = (() => { const hp = Math.round((2863 + 345.6 * 69) * 1.51), at = Math.round((586 + 82.3 * 69) * 1.32);
  return { species: 'clavisangemon', name: 'ClavisAngemon', level: 70, hp, ds: Math.round((1293 + 77.6 * 69) * 1.5), as: 1450, dmg: Math.round(SCHADEN * at / 12806), at, psk: CSK }; })();
const MEMBERS = TEAM === 'clavis' ? [PALADIN, CLAVIS, CLAVIS, CLAVIS, CLAVIS] : Array.from({ length: N }, () => PALADIN);
const protections = [];
const protectedAt = (p, now) => protections.some((pr) => now >= pr.at && now <= pr.at + 2000 && Math.hypot(p.x - pr.x, p.y - pr.y) <= 128);
const TRAENKE = Number(process.env.TRAENKE ?? 400);         // HP-Tränke auf F1 je Bot (live: über 400 Feast)
const TRANK_HP = Number(process.env.TRANK_HP) || 15000;   // so viel heilt ein Trank
const TRANK_AB = Number(process.env.TRANK_AB) || 50;      // Bot-Einstellung: F1 unter so viel % HP
const MOB_HIT = 1200;                                      // normaler Treffer eines Monsters
const WAVE_GAP = 4000;
const script = fs.readFileSync(process.env.SKRIPT || path.join(__dirname, '..', 'digibot.user.js'), 'utf8'); // SKRIPT=… andere Bot-Version testen
const t0 = Date.now();
const sec = () => ((Date.now() - t0) / 1000).toFixed(1).padStart(6);
const log = [];
const say = (s) => { log.push(`${sec()} s  ${s}`); if (process.env.V) console.log(`${sec()} s  ${s}`); };

// ---------- Karten (nur die Objekte, die der Bot braucht; Koordinaten aus network.tmj / network_wargame.tmj) ----------
const P = (k, v) => ({ name: k, type: 'string', value: v });
const MAPS = {
  network: [
    { type: 'spawn', name: 'default', x: 504, y: 328 },
    { type: 'spawn', name: 'from_network_wargame', x: 504, y: 152 },
    { type: 'portal', name: 'network_wargame', x: 480, y: 112, width: 48, height: 16, properties: [P('toMap', 'network_wargame'), P('toSpawn', 'from_network')] },
  ],
  network_wargame: [
    { type: 'spawn', name: 'from_network', x: 600, y: 840 },
    { type: 'spawn', name: 'land_play', x: 1112, y: 840 },
    ...Object.entries({ terminal_1: [888, 712], terminal_2: [824, 616], terminal_3: [712, 616], terminal_4: [664, 712], terminal_5: [712, 808], terminal_6: [824, 808],
      hungry_1: [568, 568], hungry_2: [776, 552], hungry_3: [968, 568], hungry_4: [968, 872], hungry_5: [776, 888], hungry_6: [552, 696] }).map(([name, [x, y]]) => ({ type: 'spawn', name, x, y })),
    { type: 'zone', name: 'room_hello', x: 544, y: 544, width: 448, height: 352 },
    { type: 'zone', name: 'room_play', x: 1056, y: 544, width: 448, height: 352 },
    { type: 'safe', name: 'landing_hello', x: 560, y: 800, width: 96, height: 96 },
    { type: 'safe', name: 'landing_play', x: 1072, y: 800, width: 96, height: 96 },
    { type: 'portal', name: 'gate_hello', x: 944, y: 688, width: 32, height: 32, properties: [P('toMap', 'network_wargame'), P('toSpawn', 'land_play')] },
    { type: 'portal', name: 'network', x: 560, y: 880, width: 32, height: 16, properties: [P('toMap', 'network'), P('toSpawn', 'from_network_wargame')] },
    { type: 'portal', name: 'network_play', x: 1072, y: 880, width: 32, height: 16, properties: [P('toMap', 'network'), P('toSpawn', 'from_network_wargame')] },
  ],
};
const PT = {
  terminal_1: [888, 712], terminal_2: [824, 616], terminal_3: [712, 616], terminal_4: [664, 712], terminal_5: [712, 808], terminal_6: [824, 808],
  hello_1: [872, 680], hello_2: [792, 632], hello_3: [728, 648], hello_5: [728, 776], hello_6: [840, 776],
  hungry_1: [568, 568], hungry_2: [776, 552], hungry_3: [968, 568], hungry_4: [968, 872], hungry_5: [776, 888], hungry_6: [552, 696],
  boss_play: [1288, 712], play_terminal_1: [1192, 632], play_terminal_2: [1384, 632], play_terminal_3: [1192, 792], play_terminal_4: [1384, 792],
};
const objOf = (mapId, name) => MAPS[mapId].find((o) => o.name === name);
const inRect = (o, p) => p.x >= o.x && p.x <= o.x + o.width && p.y >= o.y && p.y <= o.y + o.height;

// ---------- Spieldaten (Auszug) ----------
const W = (mobs) => ({ mobs: mobs.map(([species, level, at, extra]) => ({ species, level, count: at.length, at, ...extra })) });
const ROOMS = [
  { id: 'hello', area: 'room_hello', landing: 'from_network', deathLimit: 3, gate: 'gate_hello', waves: [
    W([['kuramon', 50, ['hello_1', 'hello_2', 'hello_3', 'hello_5', 'hello_6'], { aggressive: false, required: false }]]),
    W([['chrysalimon', 51, ['terminal_2', 'terminal_5']], ['tsumemon', 50, ['hungry_1', 'hungry_3', 'hungry_4', 'hungry_6']]]),
    W([['tsumemon', 50, ['hungry_2', 'hungry_3', 'hungry_4', 'hungry_5', 'hungry_6']]]),
    W([['tsumemon', 50, ['hungry_3', 'hungry_4', 'hungry_5', 'hungry_6', 'hungry_1', 'hungry_2']]]),
    W([['chrysalimon', 51, ['terminal_1', 'terminal_4']], ['tsumemon', 51, ['hungry_2', 'hungry_3', 'hungry_5', 'hungry_6']]]),
    W([['tsumemon', 51, ['hungry_5', 'hungry_6', 'hungry_1', 'hungry_2', 'hungry_3', 'hungry_4']]]),
    W([['tsumemon', 51, ['hungry_6', 'hungry_1', 'hungry_2', 'hungry_3', 'hungry_4', 'hungry_5']]]),
  ], clear: { terminals: { group: 'hello', bonus: { itemId: 'kuramon_data', per: 5 }, stacksTo: 'play' } } },
  { id: 'play', area: 'room_play', landing: 'land_play', deathLimit: 3 },
];
// HP nach base + growth × (Level − 1) aus den Spieldaten
const MOB = {
  kuramon: { name: 'Kuramon', hp: (l) => 1208 + 145.3 * (l - 1), flags: 0, ms: 60 },
  tsumemon: { name: 'Tsumemon', hp: (l) => 1932 + 232.4 * (l - 1), flags: 32, ms: 110 },
  chrysalimon: { name: 'Chrysalimon', hp: (l) => 4726 + 568.3 * (l - 1), flags: 32, ms: 0 },
  keramon: { name: 'Keramon', hp: (l) => 3376 + 405.9 * (l - 1), flags: 32, ms: 100 },
};
const SK = (id, o) => [id, { id, element: 'dark', kind: 'damage', target: 'enemy', dsCost: 0, ...o }];
const SKILLS = Object.fromEntries([
  SK('chrysalimon.data_crusher', { name: 'Data Crusher', shape: 'circle', origin: 'caster', radius: 48, telegraph: true, power: 220, cooldownMs: 7000, castMs: 1200, range: 48 }),
  SK('keramon_net.crazy_giggle', { name: 'Crazy Giggle', shape: 'single', cooldownMs: 6000, castMs: 800, range: 160 }),
  SK('keramon_net.crazy_turn', { name: 'Crazy Turn', shape: 'circle', radius: 48, telegraph: true, fixedDamage: 28000, cooldownMs: 10000, castMs: 1500, range: 128 }),
  SK('chrysalimon_net.data_crusher', { name: 'Data Crusher', shape: 'circle', origin: 'caster', radius: 56, telegraph: true, fixedDamage: 30000, cooldownMs: 8000, castMs: 1200, range: 56 }),
  SK('chrysalimon_net.unconnect_buster', { name: 'Unconnect Buster', shape: 'single', cooldownMs: 9000, castMs: 800, range: 128 }),
  SK('infermon.cocoon_attack', { name: 'Cocoon Attack', kind: 'buff', target: 'self', shape: 'single', cooldownMs: 1000, castMs: 1500, range: 1, reflect: { pct: 250, durationMs: 4000 } }),
  SK('infermon.cocoon_ram', { name: 'Cocoon Attack', shape: 'line', radius: 18, range: 220, telegraph: true, fixedDamage: 60000, cooldownMs: 18000, castMs: 2500, dash: { speed: 520 } }),
  SK('infermon.spider_shooter_charged', { name: 'Spider Shooter', shape: 'circle', radius: 64, telegraph: true, fixedDamage: 45000, devolve: true, cooldownMs: 26000, castMs: 2600, range: 192 }),
  SK('infermon.not_here', { name: 'NOT HERE NOT HERE BOO', kind: 'buff', target: 'self', shape: 'single', cooldownMs: 24000, castMs: 2500, range: 1, blink: { points: ['play_terminal_1', 'play_terminal_2', 'play_terminal_3', 'play_terminal_4'], radius: 24, healPct: 8, stacks: 1, meal: { ms: 5000, breakPct: 2 } } }),
]);
const bossSkills = (sp) => Object.values(SKILLS).filter((s) => s.id.startsWith(sp + '.'));
const RAID = { id: 'wargame', gate: { mapId: 'network', portal: 'network_wargame' }, party: { min: 1, max: 5, minLevel: 1 }, deathLimit: 3, landing: 'from_network',
  dungeon: { chain: 'keramon', offset: 0, mode: { order: 0, label: 'dg_mode_easy' }, rooms: ROOMS } };
const CONTENT = () => ({
  digimon: { imperialdramon_paladin: { name: 'Imperialdramon Paladin Mode', base: { ms: 115, as: 1300, at: 660 }, growth: { at: 92.5 } },
    clavisangemon: { name: 'ClavisAngemon', base: { ms: 115, as: 1450, at: 586 }, growth: { at: 82.3 } }, kuramon: { name: 'Kuramon' }, tsumemon: { name: 'Tsumemon', base: { hp: 1932 }, growth: { hp: 232.4 } }, chrysalimon: { name: 'Chrysalimon', base: { at: 91 }, growth: { at: 13.2 }, skills: [SKILLS['chrysalimon.data_crusher']] }, keramon: { name: 'Keramon' },
    keramon_net: { name: 'Keramon', skills: bossSkills('keramon_net') }, chrysalimon_net: { name: 'Chrysalimon', skills: bossSkills('chrysalimon_net') }, infermon: { name: 'Infermon', skills: [] } }, // wie im Spiel: die Boss-Attacken stehen nur bei der Form
  skills: { ...SKILLS, ...Object.fromEntries([...PSK, ...CSK].map((k) => [k.id, { id: k.id, name: k.name, cooldownMs: k.cooldownMs, dsCost: k.dsCost, range: k.range, ...k.def }])) }, items: { hp_pot: { id: "hp_pot", name: "HP-Trank" } }, npcs: {}, quests: {}, dailyById: {},
  maps: { network: { name: 'Network' }, network_wargame: { name: 'Network: War Game' } },
  spawns: {
    network: { zones: {} },
    network_wargame: { zones: {}, raid: RAID,
      bosses: [{ species: 'keramon_net', level: 75, at: 'boss_play', forms: [{ atHp: 0.7, species: 'chrysalimon_net', immobile: true }, { atHp: 0.4, species: 'infermon', skills: bossSkills('infermon') }] }],
      terminals: [{ id: 'hello', points: ['terminal_1', 'terminal_2', 'terminal_3', 'terminal_4', 'terminal_5', 'terminal_6'], radius: 18, eatMs: 8000,
        eaters: [{ species: 'tsumemon', into: 'keramon', aggressive: true }], guards: ['chrysalimon'] }] },
  },
});

// ---------- Server-Zustand ----------
const ents = new Map(); // alle Entities, je mit .map
const players = [];     // { i, G, map, goal, atk, hitAt, fainted, reviveAt, inside, gateOpen }
const terms = ['terminal_1', 'terminal_2', 'terminal_3', 'terminal_4', 'terminal_5', 'terminal_6'].map((n) => ({ name: n, x: PT[n][0], y: PT[n][1], r: 18, s: 0, eatEnd: 0, eater: null }));
const run = { inside: false, room: 0, pulled: false, wave: -1, nextWaveAt: 0, deaths: 0, roomDeaths: 0, cleared: false, failed: '', boss: null, zones: [], lines: [], mirror: null,
  perSkill: {}, // Attacke -> { casts, hit, dodged }
  stats: { skills: 0, eaten: 0, kills: {}, reflectHits: 0, reflectDmg: 0, dodged: 0, hits: 0, bossDmgTaken: 0, notHere: 0, notHereBroken: 0, pots: 0 }, roomTime: [] };
let mobSeq = 0;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// ---------- Bot-Fenster ----------
const accounts = { leader: 0, popup: true, mirror: false, dungeon: true, list: Array.from({ length: N }, (_, i) => ({ on: true, user: `u${i}`, char: `Char${i + 1}` })) };
function makeWindow(i) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: `https://play.digimmo.com.br/#dbslot=${i}`, pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.BroadcastChannel = BroadcastChannel;
  warp(w);
  let state = {};
  const subs = [];
  const store = { getState: () => state, setState: (p) => { state = { ...state, ...p }; subs.forEach((f) => f()); }, subscribe: (f) => subs.push(f) };
  const M = MEMBERS[i];
  const pl = { M, skillCd: {}, queued: null, i, store, w, map: 'network', goal: null, atk: null, hitAt: 0, fainted: false, reviveAt: 0, inside: false, handlers: {}, doorAt: 0 };
  // Sicht auf die Welt: nur Entities auf meiner Map
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
    raidEnter(raid) { say(`Char${i + 1}: Betreten (${raid})`); enterDungeon(pl); },
    raidLeave() {}, closeRaidGate() { store.setState({ windows: { ...state.windows, raid: false } }); },
    partnerFollow() { pl.atk = null; const p = ents.get(`p:${i}`); if (p) p.targetId = ''; },
    partyInvite() {}, partyRespond() {}, closeDialog() {}, talk() {}, chooseDialog() {},
  };
  const scene = {
    deps: { content: CONTENT(), commands, assetsBase: '/assets/', manifest: { maps: { network: { tmj: 'maps/network.tmj' }, network_wargame: { tmj: 'maps/network_wargame.tmj' } } } },
    controlledId: () => `t:${i}`,
    tapGround: (x, y) => { pl.goal = { x, y }; },
    select: (id) => { const e = view.get(id); store.setState({ target: e ? targetOf(e) : null }); },
    telegraphs: { active: [], circles: [], marksActive: [], mirrors: [] },
    mechB: { lines: [], view: { t: 'mech', terminals: [] } },
  };
  pl.scene = scene;
  w.fetch = async (url) => ({ ok: true, json: async () => ({ layers: [{ type: 'objectgroup', name: 'objects', objects: MAPS[url.match(/maps\/(\w+)\.tmj/)[1]] }] }) });
  w.dmo = { store, net: { connected: true, transferring: false, state: { entities: view }, charId: `c${i}`, on: (n, fn) => { { const prev = pl.handlers[n]; pl.handlers[n] = prev ? (...a) => { prev(...a); fn(...a); } : fn; } return () => {}; } }, game: { scene: { getScene: (k) => (k === 'world' ? scene : null) } } };
  w.addEventListener('keydown', (e) => { // F1: HP-Trank
    if (e.code !== 'F1' || pl.fainted) return;
    const me = state.me, inv = me.inventory.find((x) => x.itemId === 'hp_pot');
    if (!inv?.qty || Date.now() - (pl.potAt || 0) < 2000) return;
    pl.potAt = Date.now(); run.stats.pots++;
    store.setState({ me: { ...me, inventory: me.inventory.map((x) => (x === inv ? { ...x, qty: x.qty - 1 } : x)), partner: { ...me.partner, hp: Math.min(M.hp, me.partner.hp + TRANK_HP) } } });
  }, true);
  w.addEventListener('keydown', (e) => { // 2–5: Skill auf das Ziel (trifft, sobald das Digimon in Reichweite ist)
    const k = /^Digit([2-5])$/.exec(e.code)?.[1];
    if (!k || pl.fainted) return;
    const n = Number(k) - 2, sk = M.psk[n], me = state.me, now = Date.now();
    if (!sk || (pl.skillCd[n] || 0) > now || me.partner.ds < sk.dsCost) return;
    const selfCast = sk.koh || sk.healAll || sk.heal;
    const m = state.target && ents.get(state.target.id);
    if (!selfCast && (!m || m.hp <= 0 || m.map !== pl.map)) return;
    if (sk.koh) { const pp = ents.get(`p:${i}`); protections.push({ at: now, x: pp.x, y: pp.y }); run.stats.koh = (run.stats.koh || 0) + 1; }
    if (sk.healAll) { const pp = ents.get(`p:${i}`); for (const x of alivePlayers()) if (dist(partnerOf(x), pp) <= 96) { const s3 = x.store.getState(); x.store.setState({ me: { ...s3.me, partner: { ...s3.me.partner, hp: Math.min(x.M.hp, s3.me.partner.hp + x.M.hp * sk.healAll) } } }); } }
    pl.skillCd[n] = now + sk.cooldownMs;
    store.setState({ cooldowns: { ...state.cooldowns, [`skill:${n}`]: { end: w.performance.now() + sk.cooldownMs } }, me: { ...me, partner: { ...me.partner, ds: me.partner.ds - sk.dsCost } } });
    const evAll = (phase) => { for (const x of players) if (x.map === pl.map) x.handlers.evs?.([{ t: 'skill', src: `p:${i}`, skill: sk.id, phase }]); };
    evAll('cast'); setTimeout(() => evAll('release'), sk.def.castMs || 0);
    if (sk.heal) { const s2 = store.getState(); store.setState({ me: { ...s2.me, partner: { ...s2.me.partner, hp: Math.min(M.hp, s2.me.partner.hp + M.hp * sk.heal) } } }); }
    if (sk.mult && m) { pl.queued = { n, id: m.id }; pl.atk = m.id; }
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
    me: { tamerEntityId: `t:${i}`, tamerDs: 300, tamerMaxDs: 360, hotbar: ['cmd:attack', 'skill:0', 'skill:1', 'skill:2', 'skill:3', null, null, null, 'item:hp_pot'], inventory: TRAENKE ? [{ itemId: 'hp_pot', qty: TRAENKE }] : [], quests: {},
      partner: { entityId: `p:${i}`, name: M.name, species: M.species, stage: 'mega', level: M.level, hp: M.hp, maxHp: M.hp, ds: M.ds, maxDs: M.ds, exp: 0, expNext: 0,
        stats: { at: M.at, as: M.as, ms: 120 }, skills: M.psk.map((k) => ({ id: k.id, name: k.name, dsCost: k.dsCost, cooldownMs: k.cooldownMs, range: k.range, unlocked: true })) } },
    world: { mapId: 'network', mapName: 'Network', channel: 1 }, target: null });
  w.localStorage.setItem('cdigi.cfg', JSON.stringify({ dungeon: true, autopilot: false, farm: false, questMode: false, hpPot: TRANK_AB, dsPot: 0, tdsPot: 0, tab: 'data', lvlDiff: 100, radius: 400 }));
  w.localStorage.setItem('cdigi.accounts', JSON.stringify(accounts));
  w.eval(script);
  pl.status = () => w.document.querySelector('[data-f="status"]')?.textContent || '';
  pl.blog = () => [...w.document.querySelectorAll('.digibot__log li, [data-f="log"] li')].map((x) => x.textContent);
  return pl;
}
const targetOf = (e) => ({ id: e.id, kind: 'mob', name: e.name, level: e.level, hp: e.hp, maxHp: e.maxHp });

// ---------- Weltablauf ----------
function moveTo(map, name, pl) {
  const sp = objOf(map, name) || { x: PT[name][0], y: PT[name][1] };
  const t = ents.get(`t:${pl.i}`), p = ents.get(`p:${pl.i}`);
  pl.store.setState({ screen: 'loading', target: null });
  pl.goal = null; pl.atk = null; pl.loading = true;
  setTimeout(() => {
    pl.loading = false;
    pl.map = map; t.map = p.map = map;
    t.x = sp.x; t.y = sp.y; p.x = sp.x + 10; p.y = sp.y;
    pl.store.setState({ screen: 'world', world: { mapId: map, mapName: CONTENT().maps[map].name, channel: 1 }, target: null,
      raid: map === 'network_wargame' ? { raid: 'wargame', mapId: map, inside: true, members: [] } : null, windows: { ...pl.store.getState().windows, raid: false } });
  }, 300);
}
function hud() {
  const ev = { t: 'dungeon', raid: 'wargame', offset: 0, room: run.room, rooms: ROOMS.length, roomId: ROOMS[Math.min(run.room, ROOMS.length - 1)].id,
    pulled: run.pulled, deaths: run.roomDeaths, deathLimit: 3, clockMs: 0, clockEndsAt: 0, paid: true, paidIds: [] };
  for (const pl of players) if (pl.inside) pl.handlers.me?.([ev]);
}
function enterDungeon(leader) {
  if (run.inside || run.failed) return;
  const door = { x: 504, y: 140 };
  const who = players.filter((pl) => pl === leader || (pl.map === 'network' && dist(ents.get(`t:${pl.i}`), door) <= 140));
  run.inside = true; run.enteredAt = Date.now();
  say(`Gruppe betritt den Dungeon: ${who.map((pl) => `Char${pl.i + 1}`).join(', ')}${who.length < N ? ` (${N - who.length} nicht an der Tür!)` : ''}`);
  for (const pl of who) { pl.inside = true; moveTo('network_wargame', 'from_network', pl); }
  run.roomStart = Date.now();
  spawnBoss();
  setTimeout(hud, 500);
}
function spawn(species, level, at, extra = {}) {
  const def = MOB[species], id = `m:${++mobSeq}`;
  const hp = Math.round(def.hp(level));
  const e = { id, kind: 2, map: 'network_wargame', defId: species, name: def.name, level, x: PT[at][0], y: PT[at][1], home: { x: PT[at][0], y: PT[at][1] },
    hp, maxHp: hp, flags: extra.aggressive === false ? 0 : def.flags, targetId: '', required: extra.required !== false, hungry: species === 'tsumemon', nextHit: 0, nextSkill: Date.now() + 3000 };
  ents.set(id, e);
  return e;
}
function spawnBoss() {
  const [x, y] = PT.boss_play;
  run.boss = { id: 'b:keramon', kind: 2, map: 'network_wargame', defId: 'keramon_net', name: 'Keramon', level: 75, x, y, hp: BOSS_HP, maxHp: BOSS_HP, flags: 16 | 32, targetId: '',
    form: 0, nextHit: 0, cd: {}, casting: null, meal: null, stacks: 0, required: true, boss: true };
  ents.set(run.boss.id, run.boss);
}
const alivePlayers = () => players.filter((pl) => pl.inside && !pl.fainted && pl.map === 'network_wargame');
const partnerOf = (pl) => ents.get(`p:${pl.i}`);
function damagePlayer(pl, dmg, what) {
  if (pl.fainted) return;
  const st = pl.store.getState(), p = st.me.partner, hp = Math.max(0, p.hp - dmg);
  pl.store.setState({ me: { ...st.me, partner: { ...p, hp, fainted: hp <= 0 } } });
  if (hp <= 0) {
    pl.fainted = true; pl.atk = null; pl.reviveAt = Date.now() + 5000;
    run.deaths++; run.roomDeaths++;
    say(`💀 Char${pl.i + 1} fällt (${what}) – Stürze in Raum ${run.room + 1}: ${run.roomDeaths}/3`);
    for (const m of ents.values()) if (m.targetId === `p:${pl.i}`) m.targetId = '';
    if (run.roomDeaths > 3 || (N > 1 && !alivePlayers().length)) failRun(run.roomDeaths > 3 ? 'zu viele Stürze' : 'alle gefallen');
    hud();
  }
}
function failRun(why) {
  if (run.failed) return;
  run.failed = why;
  say(`❌ Raum ${run.room + 1} gescheitert: ${why}`);
  for (const pl of players) if (pl.inside) { pl.inside = false; moveTo('network', 'from_network_wargame', pl); }
}
// Partner: zum Ziel laufen und zuschlagen; sonst dem Tamer folgen
function stepPartners(now, dt) {
  for (const pl of players) {
    const t = ents.get(`t:${pl.i}`), p = partnerOf(pl);
    if (pl.fainted) {
      if (now >= pl.reviveAt && !run.failed) { // in der Gruppe: wieder am Raumeingang
        pl.fainted = false;
        const st = pl.store.getState();
        pl.store.setState({ me: { ...st.me, partner: { ...st.me.partner, hp: pl.M.hp, fainted: false } } });
        const land = ROOMS[Math.min(run.room, ROOMS.length - 1)].landing;
        const sp = objOf('network_wargame', land);
        t.x = sp.x; t.y = sp.y; p.x = sp.x + 10; p.y = sp.y; pl.goal = null;
        say(`Char${pl.i + 1} ist wieder da (Raumeingang)`);
      }
      continue;
    }
    // außerhalb des Kampfes erholt sich das Digimon (Annahme: 3 % der Max-HP pro Sekunde)
    const st0 = pl.store.getState(), p0 = st0.me.partner;
    if (p0.hp < pl.M.hp && ![...ents.values()].some((e) => e.targetId === `p:${pl.i}`)) pl.store.setState({ me: { ...st0.me, partner: { ...p0, hp: Math.min(pl.M.hp, p0.hp + pl.M.hp * 0.03 * dt) } } });
    if (p0.ds < pl.M.ds) { const s1 = pl.store.getState(); pl.store.setState({ me: { ...s1.me, partner: { ...s1.me.partner, ds: Math.min(pl.M.ds, s1.me.partner.ds + pl.M.ds * 0.01 * dt) } } }); }
    // Tamer laufen
    if (pl.goal) {
      const dx = pl.goal.x - t.x, dy = pl.goal.y - t.y, d = Math.hypot(dx, dy), step = 160 * dt;
      if (d <= step) { t.x = pl.goal.x; t.y = pl.goal.y; pl.goal = null; } else { t.x += dx / d * step; t.y += dy / d * step; }
    }
    // Partner
    const m = pl.atk && ents.get(pl.atk);
    if (m && m.hp > 0 && m.map === pl.map) {
      const d = dist(p, m), reach = 26;
      p.targetId = m.id;
      if (d > reach) { const step = P_SPEED * dt; p.x += (m.x - p.x) / d * Math.min(step, d - reach + 1); p.y += (m.y - p.y) / d * Math.min(step, d - reach + 1); }
      else if (now >= pl.hitAt && now >= (pl.castUntil || 0)) { pl.hitAt = now + pl.M.as; hitMob(pl, m, pl.M.dmg, now); }
      // Skill: Animation (castMs) – so lange kein Grundangriff, der Treffer kommt am Ende
      if (pl.queued && pl.queued.id === m.id && d <= pl.M.psk[pl.queued.n].range + 26 && now >= (pl.castUntil || 0)) {
        run.stats.skills++; const q = pl.queued; pl.queued = null; const ms = pl.M.psk[q.n].def.castMs || 0; pl.castUntil = now + ms;
        setTimeout(() => { const mm = ents.get(q.id); if (mm && mm.hp > 0 && !pl.fainted) hitMob(pl, mm, pl.M.dmg * pl.M.psk[q.n].mult, Date.now(), now); }, ms);
      }
    } else {
      pl.atk = null; p.targetId = '';
      const d = dist(p, t);
      if (d > 14) { const step = P_SPEED * 1.1 * dt; p.x += (t.x + 10 - p.x) / d * Math.min(step, d); p.y += (t.y - p.y) / d * Math.min(step, d); }
    }
    portals(pl, t, now);
  }
}
function hitMob(pl, m, dmg, now, committedAt = now) {
  // Spiegel: Schaden geht zurück – außer bei Angriffen, die schon vor dem Spiegel liefen (Spieldaten: protectCommitted)
  if (m.boss && run.mirror && now >= run.mirror.start && now < run.mirror.end && committedAt >= run.mirror.start) {
    run.stats.reflectHits++; run.stats.reflectDmg += Math.round(dmg * 2.5);
    say(`🪞 Char${pl.i + 1} schlägt in den Spiegel (−${Math.round(dmg * 2.5)})`);
    damagePlayer(pl, Math.round(dmg * 2.5), 'Spiegel');
    return;
  }
  m.hp = Math.max(0, m.hp - dmg);
  if (!m.hungry && !m.boss) m.targetId ||= `p:${pl.i}`; // wer getroffen wird, wehrt sich (hungrige Tsumemon fressen weiter)
  if (m.boss && run.boss.meal) run.boss.meal.dmg += dmg / (m.maxHp * 0.02); // Anteil bis zum Abbruch (wie im Spiel: 0..1)
  if (m.hp <= 0) killMob(m, pl);
}
function killMob(m, pl) {
  run.stats.kills[m.defId] = (run.stats.kills[m.defId] || 0) + 1;
  for (const tm of terms) if (tm.eater === m.id) { tm.eater = null; if (tm.s === 1) tm.s = 0; }
  ents.delete(m.id);
  for (const x of players) { if (x.atk === m.id) x.atk = null; const st = x.store.getState(); if (st.target?.id === m.id) x.store.setState({ target: { ...st.target, hp: 0 } }); }
  for (const G of players) G.handlers.evs?.([{ t: 'die', id: m.id }]);
  if (m.boss) {
    say(`🏆 Boss besiegt von Char${pl.i + 1}`);
    run.room = ROOMS.length; run.cleared = true; run.roomTime.push(Date.now() - run.roomStart);
    hud();
  }
}
function portals(pl, t, now) {
  if (pl.loading) return;
  for (const o of MAPS[pl.map]) {
    if (o.type !== 'portal' || !inRect(o, t)) continue;
    const to = o.properties.find((q) => q.name === 'toMap').value, sp = o.properties.find((q) => q.name === 'toSpawn').value;
    if (o.name === 'network_wargame') { // Tür: Fenster des Spiels öffnet sich
      if (now - pl.doorAt > 3000 && !pl.store.getState().raid) {
        pl.doorAt = now;
        pl.store.setState({ raid: { raid: 'wargame', mapId: 'network_wargame', inside: false, members: [], iLead: pl.i === 0 }, windows: { ...pl.store.getState().windows, raid: true } });
        say(`Char${pl.i + 1} steht in der Tür – Dungeon-Fenster offen`);
      }
      return;
    }
    if (o.name === 'gate_hello') { if (run.room < 1) return; say(`Char${pl.i + 1} geht durchs Tor`); moveTo(to, sp, pl); return; }
    if (o.name === 'network_play' && !run.cleared) return;
    say(`Char${pl.i + 1} verlässt den Dungeon (${o.name}${run.cleared ? '' : ' – vorzeitig!'})`);
    pl.inside = false; moveTo(to, sp, pl);
    return;
  }
}
// Raum 1: Wellen, Fresser, Wächter
function stepHello(now, dt) {
  const zone = objOf('network_wargame', 'room_hello'), landing = objOf('network_wargame', 'landing_hello');
  if (!run.pulled) {
    if (alivePlayers().some((pl) => { const t = ents.get(`t:${pl.i}`); return inRect(zone, t) && !inRect(landing, t); })) {
      run.pulled = true; run.nextWaveAt = now; say('Raum 1: Kampf beginnt'); hud();
    }
    return;
  }
  const mobs = [...ents.values()].filter((e) => e.kind === 2 && !e.boss);
  if (run.wave < ROOMS[0].waves.length && !mobs.some((m) => m.required)) {
    const lastReq = run.wave >= 0 && ROOMS[0].waves[run.wave].mobs.some((g) => g.required !== false);
    if (!run.nextWaveAt) run.nextWaveAt = now + (lastReq ? WAVE_GAP : 700);
    if (now >= run.nextWaveAt) {
      run.wave++; run.nextWaveAt = 0;
      if (run.wave < ROOMS[0].waves.length) {
        const w = ROOMS[0].waves[run.wave];
        for (const g of w.mobs) for (const at of g.at) spawn(g.species, g.level, at, g);
        say(`Welle ${run.wave + 1}/7: ${w.mobs.map((g) => `${g.count}× ${MOB[g.species].name}`).join(', ')}`);
      } else {
        const ok = terms.filter((tm) => tm.s !== 2).length;
        run.room = 1; run.pulled = false; run.roomDeaths = 0; run.roomTime.push(now - run.roomStart); run.roomStart = now;
        run.termsSaved = ok;
        say(`✅ Raum 1 frei – Terminals heil: ${ok}/6 (Bonus ${ok * 5} Kuramon-Daten), Tor offen`);
        hud();
      }
    }
  }
  for (const tm of terms) { // bewacht (s = 3), solange ein Chrysalimon auf dem Terminal sitzt
    if (tm.s === 2 || tm.s === 1) continue;
    tm.s = mobs.some((m) => m.defId === 'chrysalimon' && dist(m, tm) <= 24) ? 3 : 0;
  }
  for (const m of mobs) mobAct(m, now, dt);
}
function nearestPartner(m, range) {
  let best = null, bd = range;
  for (const pl of alivePlayers()) { const p = partnerOf(pl), d = dist(p, m); if (d <= bd) { bd = d; best = pl; } }
  return best;
}
function walk(m, to, speed, dt) { const d = dist(m, to); if (d < 1) return d; const s = Math.min(d, speed * dt); m.x += (to.x - m.x) / d * s; m.y += (to.y - m.y) / d * s; return d - s; }
function mobAct(m, now, dt) {
  if (m.hungry) { // Fresser: zum nächsten heilen Terminal, fressen, zu Keramon werden
    let tm = terms.find((x) => x.eater === m.id);
    if (!tm) {
      tm = terms.filter((x) => x.s === 0 && !x.eater).sort((a, b) => dist(a, m) - dist(b, m))[0];
      if (!tm) { m.hungry = false; return; }
    }
    const d = walk(m, tm, MOB.tsumemon.ms, dt);
    if (d <= tm.r && !tm.eater) { tm.eater = m.id; tm.s = 1; tm.eatEnd = now + 8000; say(`🍽 Tsumemon frisst ${tm.name}`); }
    if (tm.eater === m.id && now >= tm.eatEnd) {
      tm.s = 2; tm.eater = null; run.stats.eaten++;
      say(`💥 ${tm.name} zerstört – Tsumemon wird zu Keramon`);
      const hp = Math.round(MOB.keramon.hp(m.level));
      Object.assign(m, { defId: 'keramon', name: 'Keramon', hp, maxHp: hp, hungry: false, flags: 32 });
    }
    return;
  }
  if (m.defId === 'kuramon' && !m.targetId) return; // friedlich, bis man es angreift
  // Ziel: wer mich angreift, sonst (aggressiv) wer nah genug ist
  let tgt = m.targetId && players.find((pl) => `p:${pl.i}` === m.targetId && !pl.fainted && pl.map === m.map);
  if (!tgt && m.flags & 32) tgt = nearestPartner(m, m.defId === 'chrysalimon' ? 96 : 160);
  m.targetId = tgt ? `p:${tgt.i}` : '';
  if (!tgt) { if (MOB[m.defId].ms) walk(m, m.home, MOB[m.defId].ms, dt); return; }
  const p = partnerOf(tgt), d = dist(m, p);
  if (m.defId === 'chrysalimon' && now >= m.nextSkill) { // Data Crusher: Kreis um sich
    m.nextSkill = now + 7000;
    castZone(m, 'chrysalimon.data_crusher', [{ x: m.x, y: m.y, r: 48 }], null, 1200, 2000); // Annahme: ~AT 751 × 220 % abzüglich Verteidigung
  }
  if (MOB[m.defId].ms && d > 22) walk(m, p, MOB[m.defId].ms, dt);
  else if (d <= 40 && now >= m.nextHit) { m.nextHit = now + 1600; damagePlayer(tgt, MOB_HIT, m.name); }
}
// Ansage einer Fläche: in allen Fenstern zeigen, nach castMs Treffer auswerten
function castZone(src, skill, circles, line, castMs, dmg, onHit) {
  const now = Date.now(), z = { src: src.id, skill, circles, line, end: now + castMs };
  run.zones.push(z);
  for (const pl of players) pl.handlers.evs?.([{ t: 'skill', src: src.id, skill, phase: 'cast', ...(line ? { x: line.tx, y: line.ty } : {}) }]);
  setTimeout(() => {
    run.zones = run.zones.filter((x) => x !== z);
    for (const pl of players) pl.handlers.evs?.([{ t: 'skill', src: src.id, skill, phase: 'release', ...(line ? { x: line.tx, y: line.ty } : {}) }]);
    if (!ents.has(src.id)) return;
    const ps = run.perSkill[skill] ||= { casts: 0, hit: 0, dodged: 0 };
    ps.casts++;
    for (const pl of alivePlayers()) {
      const p = partnerOf(pl);
      const inside = circles.some((c) => dist(p, c) <= c.r) || (line && segDist(p, line) <= line.r);
      if (!inside) { run.stats.dodged++; ps.dodged++; continue; }
      if (protectedAt(p, Date.now())) { ps.blocked = (ps.blocked || 0) + 1; continue; }
      ps.hit++;
      run.stats.hits++; if (src.boss) run.stats.bossDmgTaken += dmg;
      say(`💢 Char${pl.i + 1} getroffen: ${SKILLS[skill].name} (−${dmg})`);
      damagePlayer(pl, dmg, SKILLS[skill].name);
      onHit?.(pl);
    }
  }, castMs);
}
function segDist(p, l) {
  const vx = l.tx - l.fx, vy = l.ty - l.fy, L2 = vx * vx + vy * vy || 1;
  const k = Math.max(0, Math.min(1, ((p.x - l.fx) * vx + (p.y - l.fy) * vy) / L2));
  return Math.hypot(p.x - (l.fx + vx * k), p.y - (l.fy + vy * k));
}
// Raum 2: Boss mit drei Formen
function stepPlay(now, dt) {
  const b = run.boss;
  if (!b || !ents.has(b.id)) return;
  const zone = objOf('network_wargame', 'room_play'), landing = objOf('network_wargame', 'landing_play');
  if (!run.pulled) {
    if (alivePlayers().some((pl) => { const t = ents.get(`t:${pl.i}`); return inRect(zone, t) && !inRect(landing, t); })) {
      run.pulled = true; run.pullAt = now; say('Raum 2: Keramon greift an'); hud();
    }
    return;
  }
  if (now - run.pullAt > ENRAGE_MS) { failRun(`Enrage nach ${ENRAGE_MS / 1000} s – Boss bei ${Math.round(b.hp / b.maxHp * 100)} %`); return; }
  const pct = b.hp / b.maxHp;
  const form = Math.max(b.form, pct <= 0.4 ? 2 : pct <= 0.7 ? 1 : 0); // Formen kommen nur nach vorn
  if (form !== b.form) {
    b.form = form; b.defId = ['keramon_net', 'chrysalimon_net', 'infermon'][form]; b.name = ['Keramon', 'Chrysalimon', 'Infermon'][form]; b.cd = {};
    say(`🔁 Boss wird zu ${b.name} (${Math.round(pct * 100)} %)`);
  }
  if (b.meal) { // NOT HERE: frisst ein Terminal – genug Schaden bricht es ab
    if (b.meal.dmg >= 1) { run.stats.notHereBroken++; say(`✋ NOT HERE abgebrochen (nach ${((Date.now() - b.meal.start) / 1000).toFixed(1)} s)`); b.meal = null; }
    else if (now >= b.meal.end) { b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.08); b.stacks++; say(`😈 Infermon frisst sich satt: +8 % HP, Stärke ${b.stacks}`); b.meal = null; }
    return;
  }
  const alive = alivePlayers();
  if (!alive.length) return;
  const tank = alive[0], tp = partnerOf(tank);
  b.targetId = `p:${tank.i}`;
  if (b.casting && now < b.casting) return;
  const ready = (id) => (b.cd[id] || 0) <= now;
  const use = (id) => { b.cd[id] = now + SKILLS[id].cooldownMs; b.casting = now + SKILLS[id].castMs; };
  if (form === 0) {
    if (ready('keramon_net.crazy_turn')) { use('keramon_net.crazy_turn'); castZone(b, 'keramon_net.crazy_turn', [{ x: tp.x, y: tp.y, r: 48 }], null, 1500, 28000); return; }
    if (dist(b, tp) > 26) walk(b, tp, 125, dt);
  } else if (form === 1) {
    if (ready('chrysalimon_net.data_crusher')) { use('chrysalimon_net.data_crusher'); castZone(b, 'chrysalimon_net.data_crusher', [{ x: b.x, y: b.y, r: 56 }], null, 1200, 30000); return; }
  } else {
    if (ready('infermon.not_here') && (b.cd.started || 0) < now - 4000) {
      use('infermon.not_here'); run.stats.notHere++;
      for (const pl of players) pl.handlers.evs?.([{ t: 'skill', src: b.id, skill: 'infermon.not_here', phase: 'cast' }]);
      setTimeout(() => {
        if (!ents.has(b.id)) return;
        const n = ['play_terminal_1', 'play_terminal_2', 'play_terminal_3', 'play_terminal_4'][Math.floor(Math.random() * 4)];
        b.x = PT[n][0]; b.y = PT[n][1]; b.meal = { start: Date.now(), end: Date.now() + 5000, dmg: 0 };
        say(`👻 NOT HERE: Infermon springt zu ${n} und frisst`);
      }, 2500);
      return;
    }
    if (ready('infermon.cocoon_ram')) { // Kokon (Spiegel) + Ramme auf einer Linie
      use('infermon.cocoon_ram'); b.cd['infermon.cocoon_attack'] = now + 18000;
      for (const pl of players) pl.handlers.evs?.([{ t: 'skill', src: b.id, skill: 'infermon.cocoon_attack', phase: 'cast' }]);
      run.mirror = { tell: now, start: now + 1500, end: now + 1500 + 4000 };
      const len = Math.max(1, dist(b, tp)), ang = Math.atan2(tp.y - b.y, tp.x - b.x);
      const line = { fx: b.x, fy: b.y, tx: b.x + Math.cos(ang) * 220, ty: b.y + Math.sin(ang) * 220, r: 18 };
      void len;
      castZone(b, 'infermon.cocoon_ram', [], line, 2500, 60000);
      return;
    }
    if (ready('infermon.spider_shooter_charged')) { use('infermon.spider_shooter_charged'); castZone(b, 'infermon.spider_shooter_charged', [{ x: tp.x, y: tp.y, r: 64 }], null, 2600, 45000); return; }
  }
  if (dist(b, tp) <= 40 && now >= b.nextHit) { b.nextHit = now + 1500; damagePlayer(tank, 2500 * (1 + b.stacks * 0.04), b.name); }
}
// Zonen, Spiegel, Terminals und Ziel-HP in jedes Fenster schreiben
function syncWindows() {
  const now = Date.now();
  for (const pl of players) {
    const sc = pl.scene, pn = pl.w.performance.now(), conv = (t) => pn + (t - now);
    const here = pl.map === 'network_wargame';
    const zs = here ? run.zones : [];
    sc.telegraphs.active = zs.flatMap((z) => z.circles.map((c) => ({ x: c.x, y: c.y, r: c.r })));
    sc.telegraphs.circles = zs.flatMap((z) => z.circles.map((c) => ({ x: c.x, y: c.y, r: c.r, end: conv(z.end) })));
    sc.mechB.lines = zs.filter((z) => z.line).map((z) => ({ src: z.src, fx: z.line.fx, fy: z.line.fy, tx: z.line.tx, ty: z.line.ty, r: z.line.r, skill: SKILLS[z.skill], end: conv(z.end), sweeping: false }));
    sc.telegraphs.mirrors = here && run.mirror && now < run.mirror.end ? [{ src: run.boss.id, tellEnd: conv(run.mirror.start), end: conv(run.mirror.end) }] : [];
    sc.mechB.view = { t: 'mech', terminals: here && run.room === 0 ? terms.map((tm) => ({ x: tm.x, y: tm.y, r: tm.r, s: tm.s, ...(tm.s === 1 ? { left: tm.eatEnd - now, ms: 8000 } : {}) })) : [],
      meals: here && run.boss?.meal ? [{ boss: run.boss.id, left: run.boss.meal.end - now, ms: 5000, dmg: run.boss.meal.dmg }] : [] };
    const st = pl.store.getState();
    if (st.target) { const e = ents.get(st.target.id); if (e && (e.hp !== st.target.hp || e.name !== st.target.name)) pl.store.setState({ target: targetOf(e) }); }
  }
}

// ---------- Ablauf ----------
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  for (let i = 0; i < N; i++) players.push(makeWindow(i));
  let last = Date.now();
  const loop = setInterval(() => {
    const now = Date.now(), dt = (now - last) / 1000; last = now;
    stepPartners(now, dt);
    if (run.inside && !run.failed) { if (run.room === 0) stepHello(now, dt); else if (run.room === 1) stepPlay(now, dt); }
    syncWindows();
  }, 50);
  await wait(1500);
  const on = (pl) => !/Bot aus/.test(pl.status());
  if (N > 1) players[0].w.document.querySelector('[data-act="grp-start"]')?.click();
  await wait(2000);
  for (const pl of players) if (!on(pl)) pl.w.document.querySelector('[data-act="bot"]').click();
  await wait(500);
  say(`Bots: ${players.map((pl) => (on(pl) ? 'an' : 'AUS')).join(', ')}`);
  const end = Date.now() + DAUER;
  let lastStatus = 0;
  if (process.env.V) { const prev = {}; setInterval(() => { for (const pl of players) { const x = pl.status(); if (x !== prev[pl.i]) { prev[pl.i] = x; say(`   [Char${pl.i + 1}] ${x}`); } } }, 100); }
  while (Date.now() < end) {
    await wait(500);
    if (Date.now() - lastStatus > 15000) { lastStatus = Date.now(); say(`   Status: ${players.map((pl) => `Char${pl.i + 1}: ${pl.status()}`).join(' | ')}`); }
    const out = players.every((pl) => !pl.inside);
    if (run.inside && out && (run.cleared || run.failed)) { await wait(2000); break; }
  }
  clearInterval(loop);
  const total = run.enteredAt ? ((Date.now() - run.enteredAt) / 1000).toFixed(0) : '–';
  console.log(`\nDungeon-Probelauf Kera Easy (War Game) – ${N} Bot${N > 1 ? 's' : ''} · Grundangriff ${SCHADEN}/${AS} ms + Skills · Partner-HP ${HP}${SCHNELL ? ' · SCHNELL' : ''}${TEMPO > 1 ? ` · Zeitraffer ×${TEMPO} (Zeiten in Spielzeit)` : ''} · Boss-HP ${BOSS_HP} · ${TRAENKE} Tränke (F1 unter ${TRANK_AB} %)\n`);
  for (const l of log) console.log(l);
  const s = run.stats;
  console.log(`\nErgebnis: ${run.cleared && players.every((pl) => !pl.inside) ? '✅ geschafft und draußen' : run.cleared ? '⚠ geschafft, aber nicht alle draußen' : run.failed ? `❌ gescheitert (${run.failed})` : '⏱ Zeit abgelaufen'}`);
  console.log(`Zeit im Dungeon ${total} s · Räume ${run.roomTime.map((t) => `${(t / 1000).toFixed(0)} s`).join(' / ') || '–'}`);
  console.log(`Terminals: ${6 - s.eaten}/6 heil (${s.eaten} gefressen) · Stürze ${run.deaths}`);
  console.log(`Flächen: ${s.dodged} ausgewichen, ${s.hits} getroffen · Spiegel-Treffer ${s.reflectHits} · NOT HERE ${s.notHere}× (${s.notHereBroken} abgebrochen) · Tränke ${s.pots} · Skills ${s.skills}${run.boss ? ` · Boss-Stapel ${run.boss.stacks}` : ''}`);
  console.log(`Attacken (Ansagen · getroffen · ausgewichen): ${Object.entries(run.perSkill).map(([k, v]) => `${k} ${v.casts} · ${v.hit} · ${v.dodged}`).join(' | ')}`);
  if (TEAM) console.log(`Key of Hope gezündet: ${run.stats.koh || 0}× · Team: ${MEMBERS.map((m, i) => `Char${i + 1} ${m.name} Lv ${m.level} (${m.hp} HP)`).join(', ')}`);
  console.log(`Kills: ${Object.entries(s.kills).map(([k, v]) => `${v}× ${k}`).join(', ')}`);
  console.log(`Status am Ende: ${players.map((pl) => `Char${pl.i + 1}: ${pl.status()}`).join(' | ')}`);
  process.exit(run.cleared && players.every((pl) => !pl.inside) ? 0 : 1);
})();
