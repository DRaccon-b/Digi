#!/usr/bin/env node
// Test-Boss (Stufe 1 – Grundformen, Stufe 2 – Sondermechaniken): eine leere Arena, ein Boss, der der Reihe nach jede
// Grundform und jede Sondermechanik einer Boss-Attacke wirkt – mit den echten Werten aus den Spieldaten (Radius,
// Ansagezeit, Schaden, Reichweite). Echte DigiBot-Fenster (Modus Grinden, der Boss greift an) kämpfen dagegen. Am Ende
// steht je Attacke: Ansagen, getroffen, ausgewichen, getankt (bewusst stehen geblieben), unnötig gelaufen, wie viel
// Schaden am Boss während der Ansage verloren ging und was die Mechanik sonst ausmacht (Spalte „Extra“).
//
//   node sim/testboss.js                 allein, 3 Runden
//   GRUPPE=3 …                           Gruppe aus 3 Bots
//   RUNDEN=5 …                           jede Attacke so oft
//   NUR=donut,dash …                     nur diese Attacken (Schlüssel siehe ATTACKS; auch NUR=stufe1 / NUR=stufe2)
//   TEMPO=4 …                            Zeitraffer (wie im Kera-Probelauf; über 4 wird es zu ungenau)
//   V=1 …                                jeder Statuswechsel der Bots
//   SKRIPT=pfad/zu/digibot.user.js …     andere Bot-Version testen
//   GREIF=1 …                            Greiflinie (grab) 320 px breit: erzwingt das Packen, misst das Freikommen
//
// Partner wie im Kera-Probelauf: Imperialdramon Paladin Mode Lv 99 (92 660 HP, Grundangriff 12 000 alle 1 121 ms).
// Annahmen (nicht in den Spieldaten): Bahnen (lanes) liegen parallel im Abstand von LANE_GAP; ein Ansturm (dash) trifft
// beim Loslaufen alles auf seiner Linie und der Boss steht danach an ihrem Ende; Folge-Stöße (chain) zielen jeweils neu
// auf einen zufälligen Spieler; raumweite Kreise mit Power statt festem Schaden treffen mit AT × Power %.
//
// Annahmen Stufe 2 (Server-Verhalten, das nicht in den Spieldaten steht):
//  - Fächer (sweep): trifft beim Ende der Ansage alle im Kreisausschnitt (Bogen arc um die Richtung zum Ziel, Länge
//    range + Breite r); das Schwenken (sweep.ms) selbst wird nicht nachgebildet.
//  - Verstreute Kreise (scatter): jede Welle erscheint everyMs nach der vorigen mit eigener Ansage (castMs); ein Kreis
//    liegt genau auf dem Ziel (Position beim Erscheinen der Welle), die übrigen zufällig im Umkreis spread, ohne sich zu
//    überlappen (Abstand gap).
//  - Fallen (trap): Kreise wie scatter; wer beim Einschlag drinsteht, rutscht aus (Schale verbraucht), die übrigen bleiben
//    trap.ms liegen (höchstens max). Ausrutschen = Digimon tripMs lang bewegungs- und angriffsunfähig, kein Schaden.
//  - Inseln (islands): count Inseln im Abstand 60…spread vom Boss, gleichmäßig verteilt mit zufälligem Versatz; sicher
//    ist, wer höchstens islands.radius von einer Insel entfernt steht.
//  - Deckung (cover): Platten als Spawn-Punkte slab_1…4 rund um die Arena-Mitte; geschützt ist, wer höchstens
//    cover.radius vom Punkt entfernt auf der vom Boss abgewandten Seite steht (wie im Bot, ohne dessen 0,85-Reserve).
//  - Geteilter Treffer (share, D-Reaper Zone): kein Warnkreis am Boden, folgt dem Ziel (wie live bei Diaboromon);
//    Gesamtschaden SHARE_PCT % der Max-HP × (1 + damagePerExtra × (Gruppe − baseParty)), verteilt auf alle Digimon im
//    Radius um das Ziel; weniger als minPartners darin -> das Ziel fällt. Gleichzeitig „Pendulum Feet“ (together):
//    ein Warnkreis unter jedem Digimon.
//  - Markierung (mark): Kreis folgt dem Ziel (dem Tank), Einschlag beim Ziel: Ziel AT × Power %, alle anderen darin
//    othersPct % davon; Rückstoß knockback.px vom Boss weg.
//  - Lade-Ring (chargeRing): bricht, wenn die Gruppe während der Ansage CHARGE_BREAK × Spieler Schaden macht (≈ 60 %
//    des normalen Schadens über die 10 s), sonst trifft er alle im Kreis mit hpDamagePct % der Max-HP.
//  - Greifarm (grab): packt GRAB_AFTER_MS nach der Ansage das erste Digimon auf der Linie (vom Boss aus gesehen); der Arm
//    hat GRAB_HP HP, zieht reel px/s zum Boss, saugt alle everyMs hpPct % der Max-HP und lässt nach GRAB_MAX_MS los.
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
const RUNDEN = Math.max(1, Number(process.env.RUNDEN) || 3);
const SCHADEN = 12000, AS = 1121, HP = 92660, P_SPEED = 120;
const BOSS_AT = 15000, BOSS_HIT = 2500, PAUSE_MS = 4000, RECOVER_MS = 1500, LANE_GAP = 32;
const TRAENKE = 400, TRANK_HP = 15000, TRANK_AB = 50;
const SHARE_PCT = 96, CHARGE_BREAK = 64000, GRAB_AFTER_MS = 250, GRAB_HP = 120000, GRAB_MAX_MS = 15000;
const script = fs.readFileSync(process.env.SKRIPT || path.join(__dirname, '..', 'digibot.user.js'), 'utf8');
const t0 = Date.now();
const sec = () => ((Date.now() - t0) / 1000).toFixed(1).padStart(6);
const log = [];
const say = (s) => { log.push(`${sec()} s  ${s}`); if (process.env.V) console.log(`${sec()} s  ${s}`); };

// ---------- Attacken: echte Skills aus den Spieldaten (Okt. 2026), je eine Grundform ----------
const SK = (id, o) => ({ id, element: 'dark', kind: 'damage', target: 'enemy', dsCost: 0, power: 0, telegraph: true, ...o });
const ATTACKS = [
  { key: 'kreis', label: 'Warnkreis auf dem Ziel', from: 'Daemon', sk: SK('daemon.demon_flame', { name: 'Demon Flame', shape: 'circle', radius: 64, fixedDamage: 50200, cooldownMs: 12000, castMs: 2000, range: 128 }) },
  { key: 'tankbar', label: 'Kleiner Warnkreis (tankbar)', from: 'Arukenimon', sk: SK('arukenimon.spider_thread', { name: 'Spider Thread', shape: 'circle', radius: 56, fixedDamage: 29800, cooldownMs: 8000, castMs: 2500, range: 128 }) },
  { key: 'umsich', label: 'Kreis um den Boss', from: 'Golemon', sk: SK('golemon_colossus.tower_quake', { name: 'Tower Quake', shape: 'circle', origin: 'caster', radius: 80, fixedDamage: 46600, cooldownMs: 8000, castMs: 2500, range: 80 }) },
  { key: 'donut', label: 'Ring, innen sicher (klein)', from: 'Marsmon', sk: SK('marsmon_hunt.endless_surge', { name: 'Endless Surge', shape: 'circle', origin: 'caster', radius: 64, innerRadius: 32, fixedDamage: 55000, cooldownMs: 18000, castMs: 2500, range: 64 }) },
  { key: 'donutgross', label: 'Ring, innen sicher (groß)', from: 'Megidramon', sk: SK('megidramon.hell_howling', { name: 'Hell Howling', shape: 'circle', origin: 'caster', radius: 208, innerRadius: 80, fixedDamage: 63000, cooldownMs: 32000, castMs: 2400, range: 640 }) },
  { key: 'strahl', label: 'Strahl', from: 'Megidramon', sk: SK('megidramon.megiddo_flame', { name: 'Megiddo Flame', shape: 'line', radius: 38, fixedDamage: 90000, cooldownMs: 24000, castMs: 3000, range: 480 }) },
  { key: 'dash', label: 'Ansturm + 2 Folge-Stöße', from: 'Justimon', sk: SK('justimon_hunt.trinity_arm', { name: 'Trinity Arm', shape: 'line', radius: 10, fixedDamage: 46500, cooldownMs: 32000, castMs: 2500, range: 96, dash: { speed: 520 }, chain: { skill: 'justimon_hunt.trinity_arm_lunge', times: 2 }, aim: 'random' }),
    chainSk: SK('justimon_hunt.trinity_arm_lunge', { name: 'Trinity Arm', shape: 'line', radius: 10, fixedDamage: 46500, cooldownMs: 0, castMs: 2500, range: 96, dash: { speed: 520 }, aim: 'random' }) },
  { key: 'bahnen', label: 'Vier Bahnen', from: 'Justimon', sk: SK('justimon_hunt.accel_arm', { name: 'Accel Arm', shape: 'line', radius: 10, fixedDamage: 55500, cooldownMs: 18000, castMs: 2500, range: 88, lanes: { count: 4 } }) },
  { key: 'spiegel', label: 'Spiegel (Schaden zurück)', from: 'LadyDevimon', sk: SK('ladydevimon_corps.mirror_veil', { name: 'Mirror Veil', kind: 'buff', target: 'self', shape: 'single', telegraph: false, cooldownMs: 40000, castMs: 2500, range: 1, reflect: { pct: 200, durationMs: 3000 } }) },
  { key: 'zurueck', label: 'Kreis + Zurück-Digitieren', from: 'D-Reaper', sk: SK('d_reaper.optimizer', { name: 'Optimizer', shape: 'circle', radius: 56, fixedDamage: 23220, cooldownMs: 28000, castMs: 2600, range: 640, devolve: true, aim: 'random', telegraph: false }) },
  { key: 'jeder', label: 'Kreis auf jedem Spieler', from: 'Armageddemon', sk: SK('armageddemon.black_rain', { name: 'Black Rain', shape: 'circle', radius: 64, fixedDamage: 52000, cooldownMs: 24000, castMs: 3000, range: 640, each: true, telegraph: false }) },
  { key: 'raumweit', label: 'Raumweiter Kreis', from: 'Apocalymon', sk: SK('apocalymon.reverse_digitalize', { name: 'Reverse Digitalize', shape: 'circle', origin: 'caster', radius: 640, power: 110, cooldownMs: 20000, castMs: 1500, range: 640, telegraph: false }) },
  // ---------- Stufe 2: Sondermechaniken ----------
  { key: 'sweep', stufe: 2, label: 'Fächer (schwenkt)', from: 'D-Reaper', sk: SK('d_reaper.reaper', { name: 'Reaper', shape: 'line', radius: 16, range: 160, sweep: { arc: 150, ms: 1400 }, fixedDamage: 64500, castMs: 2400, cooldownMs: 22000 }) },
  { key: 'scatter', stufe: 2, label: 'Verstreute Kreise, 3 Wellen', from: 'Darkdramon', sk: SK('darkdramon_hunt.terrible_gaze', { name: 'Terrible Gaze', shape: 'circle', radius: 32, fixedDamage: 41000, cooldownMs: 22000, castMs: 2500, range: 160, scatter: { waves: [4, 4, 4], everyMs: 800, spread: 112, gap: 8 } }) },
  { key: 'trap', stufe: 2, label: 'Fallen bleiben liegen', from: 'MetalEtemon', sk: SK('metaletemon_hunt.banana_slip', { name: 'Banana Slip', kind: 'debuff', shape: 'circle', radius: 12, cooldownMs: 14000, castMs: 2500, range: 160, scatter: { waves: [4], spread: 128, gap: 24 }, trap: { ms: 30000, radius: 12, tripMs: 1800, max: 12 } }) },
  { key: 'islands', stufe: 2, label: 'Inseln im Kreis', from: 'Zhuqiaomon', sk: SK('tamers_zhuqiaomon.kouen', { name: 'Kouen', element: 'fire', shape: 'circle', origin: 'caster', radius: 230, range: 230, islands: { count: 4, radius: 30, spread: 170 }, fixedDamage: 62700, castMs: 3500, cooldownMs: 30000 }) },
  { key: 'cover', stufe: 2, label: 'Fächer, Deckung hinter Platten', from: 'Armageddemon', sk: SK('armageddemon.ultimate_flare', { name: 'Ultimate Flare', shape: 'line', radius: 20, range: 360, fixedDamage: 60000, cooldownMs: 24000, castMs: 2500, sweep: { arc: 140, ms: 1600 }, cover: { points: ['slab_1', 'slab_2', 'slab_3', 'slab_4'], radius: 26 } }) },
  { key: 'share', stufe: 2, label: 'Geteilt + Kreis je Spieler', from: 'D-Reaper', sk: SK('d_reaper.d_reaper_zone', { name: 'D-Reaper Zone', shape: 'circle', radius: 64, telegraph: false, power: 1, share: { target: 'rotate', minPartners: 2, scaling: { baseParty: 3, damagePerExtra: 0.2 } }, castMs: 4500, cooldownMs: 40000, recoverMs: 4000, together: ['d_reaper.pendulum_feet'] }),
    togetherSk: SK('d_reaper.pendulum_feet', { name: 'Pendulum Feet', shape: 'circle', radius: 40, each: true, fixedDamage: 45150, castMs: 4500, cooldownMs: 40000 }) },
  { key: 'mark', stufe: 2, label: 'Markierung folgt dem Tank', from: 'Gankoomon', sk: SK('gankoomon_hunt.tekken_seisai', { name: 'Tekken Seisai', element: 'fire', shape: 'circle', radius: 40, power: 415, cooldownMs: 18000, castMs: 3000, range: 96, telegraph: false, mark: { othersPct: 60 }, knockback: { px: 64 } }) },
  { key: 'chargeRing', stufe: 2, label: 'Lade-Ring (brechen)', from: 'Marsmon', sk: SK('marsmon_hunt.sun_charge', { name: 'Corona Sanctions', element: 'fire', shape: 'circle', origin: 'caster', radius: 400, hpDamagePct: 60, cooldownMs: 1000000, castMs: 10000, range: 400, chargeRing: true }) },
  { key: 'grab', stufe: 2, label: 'Greifarm (packt + saugt)', from: 'D-Reaper', sk: SK('d_reaper.creep_hands', { name: 'Creep Hands', shape: 'line', radius: 12, range: 260, aim: 'random', fixedDamage: 10000, castMs: 1600, cooldownMs: 24000, grab: { arm: 'reaper_creep_hand', level: 130, statMult: 1, reel: 80, everyMs: 1000, hpPct: 4, selfPct: 50 } }) },
];
const NUR = (process.env.NUR || '').split(',').map((s) => s.trim()).filter(Boolean);
const LIST = NUR.length ? ATTACKS.filter((a) => NUR.includes(a.key) || NUR.includes(`stufe${a.stufe || 1}`)) : ATTACKS;
if (!LIST.length) { console.log(`Unbekannt: ${NUR.join(',')} – möglich: stufe1, stufe2, ${ATTACKS.map((a) => a.key).join(', ')}`); process.exit(2); }
const SKILLS = Object.fromEntries(ATTACKS.flatMap((a) => [a.sk, a.chainSk, a.togetherSk].filter(Boolean)).map((s) => [s.id, s]));

const PSK = [
  { id: 'imperialdramon_paladin.invincible_sword', name: 'Invincible Sword', cooldownMs: 6000, dsCost: 370, range: 112, mult: 2, def: { kind: 'damage', target: 'enemy', shape: 'circle', radius: 56, power: 352, castMs: 600 } },
  { id: 'imperialdramon_paladin.holy_grace', name: 'Holy Grace', cooldownMs: 15000, dsCost: 500, range: 32, mult: 0, heal: 0.15, def: { kind: 'heal', target: 'self', shape: 'single', power: 350, castMs: 300 } },
  { id: 'imperialdramon_paladin.paladin_guard', name: 'Paladin Guard', cooldownMs: 30000, dsCost: 600, range: 32, mult: 0, def: { kind: 'buff', target: 'self', shape: 'single', power: 0, castMs: 0 } },
  { id: 'imperialdramon_paladin.omega_blade', name: 'Omega Blade', cooldownMs: 20000, dsCost: 1050, range: 64, mult: 5, def: { kind: 'damage', target: 'enemy', shape: 'single', power: 890, castMs: 900 } },
];
const M = { species: 'imperialdramon_paladin', name: 'Imperialdramon Paladin Mode', level: 99, hp: HP, ds: 9365, as: AS, dmg: SCHADEN, at: 12806, psk: PSK };

// ---------- Karte: offene Arena ----------
const CENTER = { x: 1280, y: 960 };
// Platten für die Deckung (Ultimate Flare): vier Spawn-Punkte schräg um die Mitte
const SLABS = [[1, -1], [1, 1], [-1, 1], [-1, -1]].map(([sx, sy], k) => ({ type: 'spawn', name: `slab_${k + 1}`, x: CENTER.x + sx * 100, y: CENTER.y + sy * 100 }));
const MAPS = { arena: [{ type: 'spawn', name: 'default', x: CENTER.x - 120, y: CENTER.y }, ...SLABS] };
const CONTENT = () => ({
  digimon: { imperialdramon_paladin: { name: M.name, base: { ms: 115, as: 1300, at: 660 }, growth: { at: 92.5 } },
    testmon: { name: 'Testmon', base: { at: BOSS_AT, ms: 125 }, growth: { at: 0 }, skills: Object.values(SKILLS) },
    reaper_creep_hand: { name: 'Creep Hands', base: { hp: GRAB_HP, at: 0 }, growth: { at: 0 } } },
  skills: { ...SKILLS, ...Object.fromEntries(PSK.map((k) => [k.id, { id: k.id, name: k.name, cooldownMs: k.cooldownMs, dsCost: k.dsCost, range: k.range, ...k.def }])) },
  items: { hp_pot: { id: 'hp_pot', name: 'HP-Trank' } }, npcs: {}, quests: {}, dailyById: {},
  maps: { arena: { name: 'Test-Arena' } },
  spawns: { arena: { zones: {} } },
});

// ---------- Server-Zustand ----------
const ents = new Map();
const players = [];
const run = { zones: [], mirror: null, attack: null, per: {}, deaths: 0, devolves: 0, reflectHits: 0, pots: 0, skills: 0,
  bossDmg: 0, dmgCalm: 0, msCalm: 0, done: false, islands: [], marks: [], traps: [], trapId: 0, charge: null, armId: 0 };
const perOf = (key) => (run.per[key] ||= { casts: 0, hit: 0, dodged: 0, tanked: 0, ran: 0, needless: 0, dmg: 0, ms: 0, x: {} });
const bump = (key, k, n = 1) => { const x = perOf(key).x; x[k] = (x[k] || 0) + n; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const partnerOf = (pl) => ents.get(`p:${pl.i}`);
const alivePlayers = () => players.filter((pl) => !pl.fainted);

function makeWindow(i) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: `https://play.digimmo.com.br/${N > 1 ? `#dbslot=${i}` : ''}`, pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.BroadcastChannel = BroadcastChannel;
  warp(w);
  let state = {};
  const subs = [];
  const store = { getState: () => state, setState: (p) => { state = { ...state, ...p }; subs.forEach((f) => f()); }, subscribe: (f) => subs.push(f) };
  const pl = { skillCd: {}, queued: null, i, store, w, goal: null, atk: null, hitAt: 0, fainted: false, reviveAt: 0, handlers: {}, walked: 0 };
  const view = {
    get: (id) => ents.get(id), has: (id) => ents.has(id),
    forEach: (fn) => { for (const e of ents.values()) fn(e, e.id); },
    values: () => ents.values(), keys: () => ents.keys(), entries: () => ents.entries(),
    [Symbol.iterator]() { return ents.entries(); },
    get size() { return ents.size; },
  };
  const commands = { partnerFollow() { pl.atk = null; const p = partnerOf(pl); if (p) p.targetId = ''; }, partnerStop() { pl.atk = null; },
    partyInvite() {}, partyRespond() {}, closeDialog() {}, talk() {}, chooseDialog() {} };
  const scene = {
    deps: { content: CONTENT(), commands, assetsBase: '/assets/', manifest: { maps: { arena: { tmj: 'maps/arena.tmj' } } } },
    controlledId: () => `t:${i}`,
    map: { grid: { w: 160, h: 120, tile: 16, blocked: new Uint8Array(160 * 120) } },
    tapGround: (x, y) => { pl.goal = { x, y }; },
    select: (id) => { const e = ents.get(id); store.setState({ target: e ? targetOf(e) : null }); },
    telegraphs: { active: [], circles: [], marksActive: [], mirrors: [] },
    mechB: { lines: [], view: { t: 'mech' } },
  };
  pl.scene = scene;
  w.fetch = async () => ({ ok: true, status: 200, json: async () => ({ layers: [{ type: 'objectgroup', name: 'objects', objects: MAPS.arena }] }) });
  w.dmo = { store, net: { state: { entities: view }, charId: `c${i}`, connected: true, transferring: false, on: (n, fn) => { pl.handlers[n] = fn; return () => {}; } }, game: { scene: { getScene: (k) => (k === 'world' ? scene : null) } } };
  w.addEventListener('keydown', (e) => { // F1: HP-Trank
    if (e.code !== 'F1' || pl.fainted) return;
    const me = state.me, inv = me.inventory.find((x) => x.itemId === 'hp_pot');
    if (!inv?.qty || Date.now() - (pl.potAt || 0) < 2000) return;
    pl.potAt = Date.now(); run.pots++;
    store.setState({ me: { ...me, inventory: me.inventory.map((x) => (x === inv ? { ...x, qty: x.qty - 1 } : x)), partner: { ...me.partner, hp: Math.min(M.hp, me.partner.hp + TRANK_HP) } } });
  }, true);
  w.addEventListener('keydown', (e) => { // 2–5: Skills
    const k = /^Digit([2-5])$/.exec(e.code)?.[1];
    if (!k || pl.fainted) return;
    const n = Number(k) - 2, sk = M.psk[n], me = state.me, now = Date.now();
    if (!sk || (pl.skillCd[n] || 0) > now || me.partner.ds < sk.dsCost) return;
    const m = state.target && ents.get(state.target.id);
    if (!sk.heal && (!m || m.hp <= 0)) return;
    pl.skillCd[n] = now + sk.cooldownMs;
    store.setState({ cooldowns: { ...state.cooldowns, [`skill:${n}`]: { end: w.performance.now() + sk.cooldownMs } }, me: { ...me, partner: { ...me.partner, ds: me.partner.ds - sk.dsCost } } });
    const evAll = (phase) => { for (const x of players) x.handlers.evs?.([{ t: 'skill', src: `p:${i}`, skill: sk.id, phase }]); };
    evAll('cast'); setTimeout(() => evAll('release'), sk.def.castMs || 0);
    if (sk.heal) { const s2 = store.getState(); store.setState({ me: { ...s2.me, partner: { ...s2.me.partner, hp: Math.min(M.hp, s2.me.partner.hp + M.hp * sk.heal) } } }); }
    if (sk.mult && m) { pl.queued = { n, id: m.id }; pl.atk = m.id; }
  }, true);
  w.addEventListener('keydown', (e) => {
    if (e.code !== 'Digit1' || !state.target || pl.fainted) return;
    const m = ents.get(state.target.id);
    if (m && m.hp > 0) pl.atk = m.id;
  }, true);
  const sx = CENTER.x - 120 - i * 24, sy = CENTER.y + i * 20;
  ents.set(`t:${i}`, { id: `t:${i}`, kind: 0, x: sx, y: sy, hp: 1, flags: 0, targetId: '', speed: 160 });
  ents.set(`p:${i}`, { id: `p:${i}`, kind: 1, x: sx + 10, y: sy, hp: 1, flags: 0, targetId: '', speed: P_SPEED });
  store.setState({ screen: 'world', inputFocus: 'game', cooldowns: {}, windows: {}, raid: null,
    session: { username: `u${i}`, characters: [{ id: `c${i}`, name: `Char${i + 1}` }] },
    me: { tamerEntityId: `t:${i}`, tamerDs: 300, tamerMaxDs: 360, hotbar: ['cmd:attack', 'skill:0', 'skill:1', 'skill:2', 'skill:3', null, null, null, 'item:hp_pot'], inventory: [{ itemId: 'hp_pot', qty: TRAENKE }], quests: {},
      partner: { entityId: `p:${i}`, name: M.name, species: M.species, stage: 'mega', level: M.level, hp: M.hp, maxHp: M.hp, ds: M.ds, maxDs: M.ds, exp: 0, expNext: 0,
        stats: { at: M.at, as: M.as, ms: P_SPEED }, skills: M.psk.map((k) => ({ id: k.id, name: k.name, dsCost: k.dsCost, cooldownMs: k.cooldownMs, range: k.range, unlocked: true })) } },
    world: { mapId: 'arena', mapName: 'Test-Arena', channel: 1 }, target: null });
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ dungeon: false, autopilot: false, farm: false, questMode: false, hpPot: TRANK_AB, dsPot: 0, tdsPot: 0, tab: 'data', lvlDiff: 100, radius: 600,
    mobs: { arena: { 'testmon|boss': true } } }));
  if (N > 1) w.localStorage.setItem('digibot.accounts', JSON.stringify({ leader: 0, popup: true, mirror: false, list: Array.from({ length: N }, (_, k) => ({ on: true, user: `u${k}`, char: `Char${k + 1}` })) }));
  w.eval(script);
  pl.status = () => w.document.querySelector('[data-f="status"]')?.textContent || '';
  return pl;
}
const targetOf = (e) => ({ id: e.id, kind: 'mob', name: e.name, level: e.level, hp: e.hp, maxHp: e.maxHp });

// ---------- Kampf ----------
function damagePlayer(pl, dmg, what) {
  if (pl.fainted) return;
  const st = pl.store.getState(), p = st.me.partner, hp = Math.max(0, p.hp - dmg);
  pl.store.setState({ me: { ...st.me, partner: { ...p, hp, fainted: hp <= 0 } } });
  if (hp <= 0) {
    pl.fainted = true; pl.atk = null; pl.reviveAt = Date.now() + 5000; run.deaths++;
    if (pl.grab) { ents.delete(pl.grab.arm); pl.grab = null; }
    say(`💀 Char${pl.i + 1} fällt (${what})`);
    if (run.boss.targetId === `p:${pl.i}`) run.boss.targetId = '';
  }
}
function hitBoss(pl, dmg, now, committedAt = now) {
  const b = run.boss;
  if (run.mirror && now >= run.mirror.start && now < run.mirror.end && committedAt >= run.mirror.start) {
    run.reflectHits++; const back = Math.round(dmg * run.mirror.pct / 100);
    say(`🪞 Char${pl.i + 1} schlägt in den Spiegel (−${back})`);
    damagePlayer(pl, back, 'Spiegel');
    return;
  }
  b.hp = Math.max(b.maxHp * 0.1, b.hp - dmg); // der Test-Boss stirbt nicht
  run.bossDmg += dmg;
  if (run.charge) run.charge.dmg += dmg;
  if (run.attack) run.attack.dmg += dmg; else if (run.started) run.dmgCalm += dmg;
}
// Treffer auf ein Ziel: Boss oder Greifarm (der Arm zählt nicht als Schaden am Boss)
function hitMob(pl, m, dmg, now, committedAt = now) {
  if (m === run.boss) return hitBoss(pl, dmg, now, committedAt);
  if (!ents.has(m.id)) return;
  m.hp = Math.max(0, m.hp - dmg * (pl.grab?.arm === m.id ? 0.5 : 1)); // Spieldaten grab.selfPct 50: der Gepackte macht nur halben Schaden an seinem Arm
  if (m.hp <= 0) { ents.delete(m.id); bump('grab', 'armBroken'); say(`🪓 Char${pl.i + 1} zerschlägt ${m.name}`); }
}
function stepPartners(now, dt) {
  for (const pl of players) {
    const t = ents.get(`t:${pl.i}`), p = partnerOf(pl);
    if (pl.fainted) {
      if (now >= pl.reviveAt) {
        pl.fainted = false;
        const st = pl.store.getState();
        pl.store.setState({ me: { ...st.me, partner: { ...st.me.partner, hp: M.hp, fainted: false, species: M.species, name: M.name } } });
        t.x = CENTER.x - 160; t.y = CENTER.y; p.x = t.x + 10; p.y = t.y; pl.goal = null;
        say(`Char${pl.i + 1} ist wieder da`);
      }
      continue;
    }
    const s1 = pl.store.getState();
    if (s1.me.partner.ds < M.ds) pl.store.setState({ me: { ...s1.me, partner: { ...s1.me.partner, ds: Math.min(M.ds, s1.me.partner.ds + M.ds * 0.01 * dt) } } });
    if (pl.goal) {
      const dx = pl.goal.x - t.x, dy = pl.goal.y - t.y, d = Math.hypot(dx, dy), step = 160 * dt;
      const moved = Math.min(d, step); pl.walked += moved;
      if (d <= step) { t.x = pl.goal.x; t.y = pl.goal.y; pl.goal = null; } else { t.x += dx / d * step; t.y += dy / d * step; }
    }
    if (pl.grab) { // gepackt: zum Boss gezogen und ausgesaugt, bis der Arm bricht oder loslässt
      const arm = ents.get(pl.grab.arm), g = SKILLS['d_reaper.creep_hands'].grab;
      if (!arm || now >= pl.grab.until) {
        if (arm) { ents.delete(arm.id); say(`Char${pl.i + 1}: ${arm.name} lässt los`); } else say(`Char${pl.i + 1} ist frei (Arm zerbrochen)`);
        bump('grab', 'heldMs', now - pl.grab.at); pl.grab = null; p.flags &= ~8192;
      } else {
        const b = run.boss, d = dist(p, b);
        if (d > 24) { const s = Math.min(d - 24, g.reel * dt); p.x += (b.x - p.x) / d * s; p.y += (b.y - p.y) / d * s; }
        arm.x = p.x; arm.y = p.y;
        if (now >= pl.grab.next) { pl.grab.next = now + g.everyMs; const dr = Math.round(M.hp * g.hpPct / 100); bump('grab', 'drain', dr); damagePlayer(pl, dr, 'Creep Hands (Saugen)'); }
        if (pl.fainted) continue;
      }
    }
    if (now < (pl.stunUntil || 0)) continue; // ausgerutscht: Digimon steht und greift nicht an
    const m = pl.atk && ents.get(pl.atk);
    if (m && m.hp > 0) {
      const d = dist(p, m), reach = 26;
      p.targetId = m.id;
      if (d > reach) { if (!pl.grab) { const step = P_SPEED * dt; p.x += (m.x - p.x) / d * Math.min(step, d - reach + 1); p.y += (m.y - p.y) / d * Math.min(step, d - reach + 1); } }
      else if (now >= pl.hitAt && now >= (pl.castUntil || 0)) { pl.hitAt = now + M.as; hitMob(pl, m, M.dmg, now); }
      if (pl.queued && pl.queued.id === m.id && d <= M.psk[pl.queued.n].range + 26 && now >= (pl.castUntil || 0)) {
        run.skills++; const q = pl.queued; pl.queued = null; const ms = M.psk[q.n].def.castMs || 0; pl.castUntil = now + ms;
        setTimeout(() => { if (!pl.fainted) hitMob(pl, m, M.dmg * M.psk[q.n].mult, Date.now(), now); }, ms);
      }
    } else if (pl.grab) {
      pl.atk = null; p.targetId = '';
    } else {
      pl.atk = null; p.targetId = '';
      const d = dist(p, t);
      if (d > 14) { const step = P_SPEED * 1.1 * dt; p.x += (t.x + 10 - p.x) / d * Math.min(step, d); p.y += (t.y - p.y) / d * Math.min(step, d); }
    }
  }
}
function segDist(p, l) {
  const vx = l.tx - l.fx, vy = l.ty - l.fy, L2 = vx * vx + vy * vy || 1;
  const k = Math.max(0, Math.min(1, ((p.x - l.fx) * vx + (p.y - l.fy) * vy) / L2));
  return Math.hypot(p.x - (l.fx + vx * k), p.y - (l.fy + vy * k));
}
// Fächer (skill.sweep): Kreisausschnitt um den Boss in Richtung der Linie, Bogen arc, Länge Linie + Breite
function inFan(p, l, sw) {
  const len = Math.hypot(l.tx - l.fx, l.ty - l.fy) + l.r, d = Math.hypot(p.x - l.fx, p.y - l.fy);
  if (d > len) return false;
  let diff = Math.abs(Math.atan2(p.y - l.fy, p.x - l.fx) - Math.atan2(l.ty - l.fy, l.tx - l.fx)) % (2 * Math.PI);
  if (diff > Math.PI) diff = 2 * Math.PI - diff;
  return diff <= sw.arc * Math.PI / 360;
}
// Deckung (skill.cover): höchstens radius vom Punkt entfernt, auf der vom Boss abgewandten Seite
const slab = (n) => SLABS.find((s) => s.name === n);
const coveredBy = (p, l, cv) => !!cv && cv.points.map(slab).filter(Boolean).some((s) => dist(p, s) <= cv.radius
  && (p.x - s.x) * (s.x - l.fx) + (p.y - s.y) * (s.y - l.fy) > 0);
const inCircle = (p, c) => { const d = dist(p, c); return d <= c.r && d >= (c.inner || 0) && !(c.holes || []).some((h) => dist(p, h) <= h.r); };
const inLine = (p, l, sk) => (sk.sweep ? inFan(p, l, sk.sweep) && !coveredBy(p, l, sk.cover) : segDist(p, l) <= l.r);
const inZone = (p, z) => z.circles.some((c) => inCircle(p, c)) || z.lines.some((l) => inLine(p, l, z.sk));
const evAll = (src, skill, phase, extra = {}) => { for (const pl of players) pl.handlers.evs?.([{ t: 'skill', src, skill, phase, ...extra }]); };
const randomPlayer = () => { const a = alivePlayers(); return a[Math.floor(Math.random() * a.length)]; };
const skDamage = (sk) => sk.fixedDamage || (sk.hpDamagePct ? Math.round(M.hp * sk.hpDamagePct / 100) : Math.round(BOSS_AT * (sk.power || 0) / 100));
// Ansage: Fläche zeigen, beim Einschlag auswerten. Liefert ein Promise, das nach dem Einschlag erfüllt ist.
// o.after: Treffer erst so lange nach dem Ende der Ansage (Greifarm) · o.first: nur das erste Digimon vom Boss aus ·
// o.onHit(pl): danach (packen, ausrutschen) · o.onRelease(z): beim Einschlag vor der Auswertung · o.breakAt: Schaden,
// bei dem die Ansage bricht (Lade-Ring)
function cast(a, sk, shape, o = {}) {
  const b = run.boss, now = Date.now();
  const z = { src: b.id, sk, circles: shape.circles || [], lines: shape.lines || [], end: now + sk.castMs };
  run.zones.push(z);
  const per = perOf(a.key);
  const startIn = new Map(alivePlayers().map((pl) => [pl.i, inZone(partnerOf(pl), z) || inZone(ents.get(`t:${pl.i}`), z)]));
  const walked0 = new Map(players.map((pl) => [pl.i, pl.walked]));
  b.casting = Math.max(b.casting || 0, z.end);
  evAll(b.id, sk.id, 'cast');
  if (o.breakAt) run.charge = { dmg: 0 };
  const finish = () => { run.zones = run.zones.filter((x) => x !== z); if (!run.zones.length) b.casting = 0; };
  return new Promise((done) => {
    let tick = 0;
    const timer = setTimeout(() => {
      clearInterval(tick); run.charge = null;
      finish();
      evAll(b.id, sk.id, 'release');
      o.onRelease?.(z);
      setTimeout(() => {
        const dmg = o.dmg ?? skDamage(sk);
        let hits = alivePlayers().filter((pl) => inZone(partnerOf(pl), z));
        if (o.first && hits.length) { const near = (pl) => dist(partnerOf(pl), { x: z.lines[0].fx, y: z.lines[0].fy }); hits = [hits.reduce((x, y) => (near(y) < near(x) ? y : x))]; }
        for (const pl of alivePlayers()) {
          per.casts++;
          const ran = pl.walked - walked0.get(pl.i) > 40;
          if (ran) per.ran++;
          if (!hits.includes(pl)) {
            per.dodged++; if (ran && !startIn.get(pl.i)) per.needless++;
            const p = partnerOf(pl);
            if (sk.cover && z.lines.some((l) => inFan(p, l, sk.sweep) && coveredBy(p, l, sk.cover))) bump(a.key, 'covered');
            continue;
          }
          if (!startIn.get(pl.i) && ran) per.needless++;
          if (!ran) per.tanked++; else per.hit++;
          say(`💢 Char${pl.i + 1} getroffen: ${sk.name}${dmg ? ` (−${dmg})` : ''}${ran ? '' : ' – stehen geblieben'}`);
          if (dmg) damagePlayer(pl, dmg, sk.name);
          if (sk.devolve && !pl.fainted) { run.devolves++; say(`⤵ Char${pl.i + 1} wird zurück-digitiert`); }
          if (!pl.fainted) o.onHit?.(pl);
        }
        done();
      }, o.after || 0);
    }, sk.castMs);
    if (o.breakAt) tick = setInterval(() => { // Lade-Ring: genug Schaden bricht die Ansage
      if (run.charge.dmg < o.breakAt) return;
      clearInterval(tick); clearTimeout(timer); finish(); evAll(b.id, sk.id, 'break');
      bump(a.key, 'broken'); say(`💥 ${sk.name} gebrochen (${Math.round(run.charge.dmg)} Schaden in ${((Date.now() - now) / 1000).toFixed(1)} s)`);
      run.charge = null; per.casts += alivePlayers().length; per.dodged += alivePlayers().length; done();
    }, 50);
  });
}
// Kreise verstreut um einen Punkt: einer genau darauf, die übrigen zufällig im Umkreis spread, ohne Überlappung
function scatterCircles(c, n, spread, r, gap) {
  const out = [{ x: c.x, y: c.y, r }];
  for (let tries = 0; out.length < n && tries < 500; tries++) {
    const ang = Math.random() * 2 * Math.PI, d = Math.sqrt(Math.random()) * spread, q = { x: c.x + Math.cos(ang) * d, y: c.y + Math.sin(ang) * d, r };
    if (out.every((o) => dist(o, q) >= 2 * r + gap)) out.push(q);
  }
  return out;
}
function trip(pl, how) {
  const ms = SKILLS['metaletemon_hunt.banana_slip'].trap.tripMs;
  pl.stunUntil = Date.now() + ms;
  say(`🍌 Char${pl.i + 1} rutscht aus (${how}, ${ms} ms)`);
}
// Liegende Fallen: wer drauftritt, rutscht aus (die Schale ist danach weg)
function stepTraps(now) {
  run.traps = run.traps.filter((t) => t.until > now);
  for (const pl of alivePlayers()) {
    if (now < (pl.stunUntil || 0)) continue;
    const p = partnerOf(pl), t = run.traps.find((x) => dist(p, x) <= x.r);
    if (!t) continue;
    run.traps = run.traps.filter((x) => x !== t);
    bump('trap', 'stepped'); trip(pl, 'liegende Schale');
  }
}
// Sondermechaniken, die nicht in die Grundformen passen (Schlüssel = ATTACKS.key)
const SPECIAL = {
  async scatter(a, sk, tank) {
    const sc = sk.scatter;
    await Promise.all(sc.waves.map((n, k) => wait(k * (sc.everyMs || 0)).then(() => {
      if (!alivePlayers().length) return null;
      const c = partnerOf(alivePlayers().includes(tank) ? tank : alivePlayers()[0]);
      return cast(a, sk, { circles: scatterCircles(c, n, sc.spread, sk.radius, sc.gap) });
    })));
  },
  async trap(a, sk, tank) {
    const sc = sk.scatter, tr = sk.trap;
    const circles = scatterCircles(partnerOf(tank), sc.waves[0], sc.spread, tr.radius, sc.gap);
    await cast(a, sk, { circles }, {
      onRelease: (z) => { // Schalen, auf denen niemand steht, bleiben liegen
        for (const c of z.circles) {
          if (alivePlayers().some((pl) => dist(partnerOf(pl), c) <= c.r)) continue;
          run.traps.push({ id: ++run.trapId, x: c.x, y: c.y, r: tr.radius, until: Date.now() + tr.ms });
        }
        while (run.traps.length > tr.max) run.traps.shift();
      },
      onHit: (pl) => trip(pl, 'Einschlag'),
    });
  },
  async islands(a, sk) {
    const b = run.boss, is = sk.islands, end = Date.now() + sk.castMs, off = Math.random() * 2 * Math.PI;
    const holes = Array.from({ length: is.count }, (_, k) => {
      const ang = off + k * 2 * Math.PI / is.count, d = 60 + Math.random() * (is.spread - 60);
      return { x: b.x + Math.cos(ang) * d, y: b.y + Math.sin(ang) * d, r: is.radius };
    });
    run.islands.push(...holes.map((h) => ({ src: b.id, skill: sk.id, ...h, end })));
    await cast(a, sk, { circles: [{ x: b.x, y: b.y, r: sk.radius, holes }] }, { onRelease: () => { run.islands = []; } });
  },
  async share(a, sk) {
    const b = run.boss, alive = alivePlayers(), tgt = alive[(run.shareRot = (run.shareRot || 0) + 1) % alive.length], sh = sk.share;
    const fam = a.togetherSk;
    say(`🎯 ${sk.name} zielt auf Char${tgt.i + 1} – teilen!`);
    b.casting = Math.max(b.casting || 0, Date.now() + sk.castMs);
    evAll(b.id, sk.id, 'cast');
    const feet = cast(a, fam, { circles: alive.map((pl) => ({ x: partnerOf(pl).x, y: partnerOf(pl).y, r: fam.radius })) });
    await wait(sk.castMs);
    evAll(b.id, sk.id, 'release');
    await feet;
    if (tgt.fainted) return;
    const c = partnerOf(tgt), inn = alivePlayers().filter((pl) => pl === tgt || dist(partnerOf(pl), c) <= sk.radius);
    const n = alivePlayers().length, total = M.hp * SHARE_PCT / 100 * Math.max(0.6, 1 + sh.scaling.damagePerExtra * (n - sh.scaling.baseParty));
    bump(a.key, 'shares'); bump(a.key, 'sharers', inn.length);
    if (inn.length < sh.minPartners) {
      bump(a.key, 'alone');
      say(`💢 ${sk.name}: Char${tgt.i + 1} steht allein im Fadenkreuz – fällt`);
      damagePlayer(tgt, M.hp * 2, `${sk.name} (allein)`);
      return;
    }
    const each = Math.round(total / inn.length);
    say(`💥 ${sk.name} auf Char${tgt.i + 1}: ${inn.length} teilen → je ${each}`);
    for (const pl of inn) damagePlayer(pl, each, `${sk.name} (geteilt)`);
  },
  async mark(a, sk, tank) {
    const b = run.boss, per = perOf(a.key), p0 = partnerOf(tank), dmg = skDamage(sk);
    const walked0 = new Map(players.map((pl) => [pl.i, pl.walked]));
    const end = Date.now() + sk.castMs, mark = { dst: p0.id, r: sk.radius, end };
    run.marks.push(mark); b.casting = Math.max(b.casting || 0, end);
    evAll(b.id, sk.id, 'cast', { dst: p0.id });
    await wait(sk.castMs);
    run.marks = run.marks.filter((m) => m !== mark); b.casting = 0;
    evAll(b.id, sk.id, 'release', { dst: p0.id });
    const c = { x: p0.x, y: p0.y };
    for (const pl of alivePlayers()) {
      per.casts++;
      const ran = pl.walked - walked0.get(pl.i) > 40, p = partnerOf(pl);
      if (ran) per.ran++;
      if (pl === tank) { // markiert: wird immer getroffen
        per.tanked++; bump(a.key, 'marked');
        say(`💢 Char${pl.i + 1} (markiert) getroffen: ${sk.name} (−${dmg})`);
        damagePlayer(pl, dmg, sk.name);
        const d = dist(p, b) || 1; p.x += (p.x - b.x) / d * sk.knockback.px; p.y += (p.y - b.y) / d * sk.knockback.px;
        continue;
      }
      if (dist(p, c) > sk.radius) { per.dodged++; continue; }
      per.hit++;
      const d2 = Math.round(dmg * sk.mark.othersPct / 100);
      say(`💢 Char${pl.i + 1} neben dem Markierten getroffen: ${sk.name} (−${d2})`);
      damagePlayer(pl, d2, `${sk.name} (daneben)`);
    }
  },
  async chargeRing(a, sk) {
    const b = run.boss;
    await cast(a, sk, { circles: [{ x: b.x, y: b.y, r: sk.radius }] }, { breakAt: CHARGE_BREAK * alivePlayers().length });
  },
  async grab(a, sk) {
    const b = run.boss, t = partnerOf(randomPlayer()), ang = Math.atan2(t.y - b.y, t.x - b.x);
    // GREIF=1: Greiflinie so breit, dass sicher jemand gepackt wird – misst das Freikommen statt das Ausweichen
    const l = { fx: b.x, fy: b.y, tx: b.x + Math.cos(ang) * sk.range, ty: b.y + Math.sin(ang) * sk.range, r: process.env.GREIF ? 320 : sk.radius };
    await cast(a, sk, { lines: [l] }, { after: GRAB_AFTER_MS, first: true, onHit: (pl) => {
      const p = partnerOf(pl), id = `a:${++run.armId}`;
      ents.set(id, { id, kind: 2, defId: sk.grab.arm, name: 'Creep Hands', level: sk.grab.level, x: p.x, y: p.y, hp: GRAB_HP, maxHp: GRAB_HP, flags: 0, targetId: p.id, speed: 0 });
      const now = Date.now();
      pl.grab = { arm: id, at: now, next: now + sk.grab.everyMs, until: now + GRAB_MAX_MS };
      p.flags |= 8192; // wie im Spiel: Held-Flag am Digimon (der Bot sieht „Partner festgehalten“)
      bump(a.key, 'grabbed'); say(`🦑 Char${pl.i + 1} gepackt – Arm zerschlagen!`);
    } });
    // die Attacke ist erst vorbei, wenn der Arm gebrochen ist oder losgelassen hat – sonst überschrieb der nächste Griff
    // den laufenden, und „gehalten“ maß nur die letzten Sekunden
    const t0 = Date.now();
    while (players.some((pl) => pl.grab) && Date.now() - t0 < GRAB_MAX_MS + 1000) await wait(100);
  },
};
async function perform(a) {
  const b = run.boss, sk = a.sk, tank = alivePlayers()[0];
  if (!tank) return;
  const aimAt = () => partnerOf(sk.aim === 'random' ? randomPlayer() : tank);
  say(`⚠ ${a.label}: ${sk.name} (${a.from}) – ${sk.castMs} ms`);
  if (SPECIAL[a.key]) return SPECIAL[a.key](a, sk, tank);
  if (sk.reflect) { // Spiegel: Ansage, danach Schaden zurück
    evAll(b.id, sk.id, 'cast');
    const now = Date.now();
    run.mirror = { start: now + sk.castMs, end: now + sk.castMs + sk.reflect.durationMs, pct: sk.reflect.pct };
    const per = run.attack; per.casts += alivePlayers().length;
    const hits0 = run.reflectHits;
    await wait(sk.castMs); evAll(b.id, sk.id, 'release');
    await wait(sk.reflect.durationMs);
    const n = run.reflectHits - hits0; per.hit += n; per.dodged += Math.max(0, alivePlayers().length - n);
    run.mirror = null; return;
  }
  if (sk.shape === 'circle') {
    const r = sk.radius, inner = sk.innerRadius || 0;
    const circles = sk.origin === 'caster' ? [{ x: b.x, y: b.y, r, inner }]
      : sk.each ? alivePlayers().map((pl) => { const p = partnerOf(pl); return { x: p.x, y: p.y, r }; })
      : [{ ...(({ x, y }) => ({ x, y }))(aimAt()), r }];
    await cast(a, sk, { circles });
    return;
  }
  // Linien: Strahl, Bahnen, Ansturm (+ Folge-Stöße)
  let cur = sk, left = 1 + (sk.chain?.times || 0);
  while (left-- > 0 && alivePlayers().length) {
    const t = aimAt(), ang = Math.atan2(t.y - b.y, t.x - b.x), len = cur.range;
    const ex = Math.cos(ang), ey = Math.sin(ang);
    const lines = [];
    const count = cur.lanes?.count || 1;
    for (let k = 0; k < count; k++) {
      const off = (k - (count - 1) / 2) * LANE_GAP;
      const fx = b.x - ey * off, fy = b.y + ex * off;
      lines.push({ fx, fy, tx: fx + ex * len, ty: fy + ey * len, r: cur.radius });
    }
    await cast(a, cur, { lines });
    if (cur.dash) { b.x += ex * len; b.y += ey * len; }
    if (sk.chain) cur = a.chainSk;
  }
}
function stepBoss(now, dt) {
  const b = run.boss, alive = alivePlayers();
  if (!alive.length) return;
  const tank = alive[0], tp = partnerOf(tank);
  b.targetId = `p:${tank.i}`;
  if (b.casting) return;
  if (dist(b, tp) > 26) { const d = dist(b, tp), s = Math.min(d - 24, 125 * dt); b.x += (tp.x - b.x) / d * s; b.y += (tp.y - b.y) / d * s; }
  else if (now >= b.nextHit) { b.nextHit = now + 1500; damagePlayer(tank, BOSS_HIT, 'Grundangriff'); }
}
function syncWindows() {
  const now = Date.now();
  for (const pl of players) {
    const sc = pl.scene, pn = pl.w.performance.now(), conv = (t) => pn + (t - now);
    const zs = run.zones;
    sc.telegraphs.active = zs.flatMap((z) => z.circles.map((c) => ({ x: c.x, y: c.y, r: c.r, skill: z.sk.id })));
    sc.telegraphs.circles = zs.flatMap((z) => z.circles.map((c) => ({ x: c.x, y: c.y, r: c.r, end: conv(z.end), skill: z.sk, src: z.src })));
    sc.mechB.lines = zs.flatMap((z) => z.lines.map((l) => ({ src: z.src, fx: l.fx, fy: l.fy, tx: l.tx, ty: l.ty, r: l.r, skill: z.sk, end: conv(z.end), sweeping: false })));
    sc.telegraphs.mirrors = run.mirror && now < run.mirror.end ? [{ src: run.boss.id, tellEnd: conv(run.mirror.start), end: conv(run.mirror.end) }] : [];
    sc.telegraphs.islands = run.islands.map((s) => ({ src: s.src, skill: s.skill, x: s.x, y: s.y, r: s.r, end: conv(s.end) }));
    sc.telegraphs.marksActive = run.marks.filter((m) => now < m.end).map((m) => ({ dst: m.dst, r: m.r, leftMs: m.end - now }));
    sc.mechB.view.traps = run.traps.map((t) => ({ id: t.id, x: t.x, y: t.y, r: t.r }));
    const st = pl.store.getState();
    if (st.target) { const e = ents.get(st.target.id); if (e && e.hp !== st.target.hp) pl.store.setState({ target: targetOf(e) }); }
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  for (let i = 0; i < N; i++) players.push(makeWindow(i));
  run.boss = { id: 'b:testmon', kind: 2, defId: 'testmon', name: 'Testmon', level: 90, x: CENTER.x, y: CENTER.y, hp: 50000000, maxHp: 50000000,
    flags: 16 | 32, targetId: '', nextHit: 0, casting: 0, speed: 125 };
  ents.set(run.boss.id, run.boss);
  let last = Date.now();
  const loop = setInterval(() => {
    const now = Date.now(), dt = (now - last) / 1000; last = now;
    stepPartners(now, dt); stepBoss(now, dt); stepTraps(now);
    if (!run.attack && run.started) run.msCalm += dt * 1000;
    syncWindows();
  }, 50);
  await wait(1500);
  const on = (pl) => !/Bot aus/.test(pl.status());
  for (const pl of players) if (!on(pl)) pl.w.document.querySelector('[data-act="bot"]').click();
  await wait(500);
  say(`Bots: ${players.map((pl) => (on(pl) ? 'an' : 'AUS')).join(', ')}`);
  if (process.env.V) { const prev = {}; setInterval(() => { for (const pl of players) { const x = pl.status(); if (x !== prev[pl.i]) { prev[pl.i] = x; say(`   [Char${pl.i + 1}] ${x}`); } } }, 100); }
  await wait(4000); // erst einmal in den Kampf kommen
  run.started = true; const fightStart = Date.now();
  for (let r = 1; r <= RUNDEN; r++) {
    say(`— Runde ${r}/${RUNDEN} —`);
    for (const a of LIST) {
      while (!alivePlayers().length) await wait(500);
      // gemessen wird die ganze Attacke plus RECOVER_MS danach (bis das Digimon wieder zuschlägt)
      const t1 = Date.now();
      run.attack = perOf(a.key);
      await perform(a);
      await wait(RECOVER_MS);
      run.attack.ms += Date.now() - t1; run.attack = null;
      await wait(PAUSE_MS - RECOVER_MS);
    }
  }
  clearInterval(loop);
  for (const pl of players) if (pl.grab) bump('grab', 'heldMs', Date.now() - pl.grab.at); // am Ende noch gepackt
  const fight = (Date.now() - fightStart) / 1000;
  const calmDps = run.msCalm ? run.dmgCalm / (run.msCalm / 1000) : 0;
  const stufen = [...new Set(LIST.map((a) => a.stufe || 1))].join('+');
  console.log(`\nTest-Boss Stufe ${stufen} – ${N} Bot${N > 1 ? 's' : ''} · ${RUNDEN} Runde${RUNDEN > 1 ? 'n' : ''} · ${LIST.length} Attacken${TEMPO > 1 ? ` · Zeitraffer ×${TEMPO} (Zeiten in Spielzeit)` : ''} · Partner ${M.name} (${HP} HP)\n`);
  for (const l of log) console.log(l);
  console.log(`\nKampfzeit ${fight.toFixed(0)} s · Stürze ${run.deaths} · Tränke ${run.pots} · Spiegel-Treffer ${run.reflectHits} · zurück-digitiert ${run.devolves}× · Schaden ohne Ansage ${Math.round(calmDps)}/s`);
  console.log('\nAttacke                         Form                            Ansagen  getroffen  getankt  ausgewichen  unnötig gelaufen  Schaden am Boss  Extra');
  const extra = (a, x) => ({
    trap: () => `später auf Schale getreten ${x.stepped || 0}×`,
    cover: () => `hinter Platte geschützt ${x.covered || 0}×`,
    share: () => (x.shares ? `allein im Fadenkreuz ${x.alone || 0}/${x.shares} · Ø ${(x.sharers / x.shares).toFixed(1)} teilen` : ''),
    mark: () => `Markierter getroffen ${x.marked || 0}× (unvermeidbar, zählt als getankt)`,
    chargeRing: () => `gebrochen ${x.broken || 0}/${RUNDEN}`,
    grab: () => (x.grabbed ? `gepackt ${x.grabbed}× · Arm zerschlagen ${x.armBroken || 0}× · Ø ${((x.heldMs || 0) / x.grabbed / 1000).toFixed(1)} s gehalten · ausgesaugt ${x.drain || 0}` : 'nie gepackt'),
  }[a.key]?.() || '');
  for (const a of LIST) {
    const p = perOf(a.key);
    const dps = p.ms ? p.dmg / (p.ms / 1000) : 0;
    const keep = calmDps ? `${Math.round(dps / calmDps * 100)} %` : '–';
    console.log(`${`${a.sk.name} (${a.from})`.padEnd(32)} ${a.label.padEnd(31)} ${String(p.casts).padStart(7)}  ${String(p.hit).padStart(9)}  ${String(p.tanked).padStart(7)}  ${String(p.dodged).padStart(11)}  ${String(p.needless).padStart(16)}  ${keep.padStart(15)}  ${extra(a, p.x)}`);
  }
  console.log('\n„getroffen“ = trotz Laufen getroffen · „getankt“ = stehen geblieben und getroffen (bei kleinen Treffern gewollt) ·');
  console.log('„Schaden am Boss“ = Schaden pro Sekunde während der Attacke (+1,5 s danach) im Vergleich zur Zeit ohne Attacke (100 % = kein Verlust)');
  console.log('Ansagen zählen je Spieler und Einschlag (Terrible Gaze: 3 Wellen, D-Reaper Zone: nur die Kreise unter jedem Digimon)');
  console.log(`Status am Ende: ${players.map((pl) => `Char${pl.i + 1}: ${pl.status()}`).join(' | ')}`);
  process.exit(0);
})();
