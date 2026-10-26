#!/usr/bin/env node
// Test-Boss (Stufe 1 – Grundformen): eine leere Arena, ein Boss, der der Reihe nach jede Grundform einer Boss-Attacke
// wirkt – mit den echten Werten aus den Spieldaten (Radius, Ansagezeit, Schaden, Reichweite). Echte DigiBot-Fenster
// (Modus Grinden, der Boss greift an) kämpfen dagegen. Am Ende steht je Attacke: Ansagen, getroffen, ausgewichen,
// getankt (bewusst stehen geblieben), unnötig gelaufen und wie viel Schaden am Boss während der Ansage verloren ging.
//
//   node sim/testboss.js                 allein, 3 Runden
//   GRUPPE=3 …                           Gruppe aus 3 Bots
//   RUNDEN=5 …                           jede Attacke so oft
//   NUR=donut,dash …                     nur diese Attacken (Schlüssel siehe ATTACKS)
//   TEMPO=4 …                            Zeitraffer (wie im Kera-Probelauf; über 4 wird es zu ungenau)
//   V=1 …                                jeder Statuswechsel der Bots
//   SKRIPT=pfad/zu/digibot.user.js …     andere Bot-Version testen
//
// Partner wie im Kera-Probelauf: Imperialdramon Paladin Mode Lv 99 (92 660 HP, Grundangriff 12 000 alle 1 121 ms).
// Annahmen (nicht in den Spieldaten): Bahnen (lanes) liegen parallel im Abstand von LANE_GAP; ein Ansturm (dash) trifft
// beim Loslaufen alles auf seiner Linie und der Boss steht danach an ihrem Ende; Folge-Stöße (chain) zielen jeweils neu
// auf einen zufälligen Spieler; raumweite Kreise mit Power statt festem Schaden treffen mit AT × Power %.
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
];
const NUR = (process.env.NUR || '').split(',').map((s) => s.trim()).filter(Boolean);
const LIST = NUR.length ? ATTACKS.filter((a) => NUR.includes(a.key)) : ATTACKS;
if (!LIST.length) { console.log(`Unbekannt: ${NUR.join(',')} – möglich: ${ATTACKS.map((a) => a.key).join(', ')}`); process.exit(2); }
const SKILLS = Object.fromEntries(ATTACKS.flatMap((a) => [a.sk, a.chainSk].filter(Boolean)).map((s) => [s.id, s]));

const PSK = [
  { id: 'imperialdramon_paladin.invincible_sword', name: 'Invincible Sword', cooldownMs: 6000, dsCost: 370, range: 112, mult: 2, def: { kind: 'damage', target: 'enemy', shape: 'circle', radius: 56, power: 352, castMs: 600 } },
  { id: 'imperialdramon_paladin.holy_grace', name: 'Holy Grace', cooldownMs: 15000, dsCost: 500, range: 32, mult: 0, heal: 0.15, def: { kind: 'heal', target: 'self', shape: 'single', power: 350, castMs: 300 } },
  { id: 'imperialdramon_paladin.paladin_guard', name: 'Paladin Guard', cooldownMs: 30000, dsCost: 600, range: 32, mult: 0, def: { kind: 'buff', target: 'self', shape: 'single', power: 0, castMs: 0 } },
  { id: 'imperialdramon_paladin.omega_blade', name: 'Omega Blade', cooldownMs: 20000, dsCost: 1050, range: 64, mult: 5, def: { kind: 'damage', target: 'enemy', shape: 'single', power: 890, castMs: 900 } },
];
const M = { species: 'imperialdramon_paladin', name: 'Imperialdramon Paladin Mode', level: 99, hp: HP, ds: 9365, as: AS, dmg: SCHADEN, at: 12806, psk: PSK };

// ---------- Karte: offene Arena ----------
const CENTER = { x: 1280, y: 960 };
const MAPS = { arena: [{ type: 'spawn', name: 'default', x: CENTER.x - 120, y: CENTER.y }] };
const CONTENT = () => ({
  digimon: { imperialdramon_paladin: { name: M.name, base: { ms: 115, as: 1300, at: 660 }, growth: { at: 92.5 } },
    testmon: { name: 'Testmon', base: { at: BOSS_AT, ms: 125 }, growth: { at: 0 }, skills: Object.values(SKILLS) } },
  skills: { ...SKILLS, ...Object.fromEntries(PSK.map((k) => [k.id, { id: k.id, name: k.name, cooldownMs: k.cooldownMs, dsCost: k.dsCost, range: k.range, ...k.def }])) },
  items: { hp_pot: { id: 'hp_pot', name: 'HP-Trank' } }, npcs: {}, quests: {}, dailyById: {},
  maps: { arena: { name: 'Test-Arena' } },
  spawns: { arena: { zones: {} } },
});

// ---------- Server-Zustand ----------
const ents = new Map();
const players = [];
const run = { zones: [], mirror: null, attack: null, per: {}, deaths: 0, devolves: 0, reflectHits: 0, pots: 0, skills: 0,
  bossDmg: 0, dmgCalm: 0, msCalm: 0, done: false };
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
  if (run.attack) run.attack.dmg += dmg; else if (run.started) run.dmgCalm += dmg;
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
    const m = pl.atk && ents.get(pl.atk);
    if (m && m.hp > 0) {
      const d = dist(p, m), reach = 26;
      p.targetId = m.id;
      if (d > reach) { const step = P_SPEED * dt; p.x += (m.x - p.x) / d * Math.min(step, d - reach + 1); p.y += (m.y - p.y) / d * Math.min(step, d - reach + 1); }
      else if (now >= pl.hitAt && now >= (pl.castUntil || 0)) { pl.hitAt = now + M.as; hitBoss(pl, M.dmg, now); }
      if (pl.queued && pl.queued.id === m.id && d <= M.psk[pl.queued.n].range + 26 && now >= (pl.castUntil || 0)) {
        run.skills++; const q = pl.queued; pl.queued = null; const ms = M.psk[q.n].def.castMs || 0; pl.castUntil = now + ms;
        setTimeout(() => { if (!pl.fainted) hitBoss(pl, M.dmg * M.psk[q.n].mult, Date.now(), now); }, ms);
      }
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
const inZone = (p, z) => z.circles.some((c) => { const d = dist(p, c); return d <= c.r && d >= (c.inner || 0); }) || z.lines.some((l) => segDist(p, l) <= l.r);
const evAll = (src, skill, phase) => { for (const pl of players) pl.handlers.evs?.([{ t: 'skill', src, skill, phase }]); };
const randomPlayer = () => { const a = alivePlayers(); return a[Math.floor(Math.random() * a.length)]; };
// Ansage: Fläche zeigen, beim Einschlag auswerten. Liefert ein Promise, das nach dem Einschlag erfüllt ist.
function cast(a, sk, shape) {
  const b = run.boss, now = Date.now();
  const z = { src: b.id, sk, circles: shape.circles || [], lines: shape.lines || [], end: now + sk.castMs };
  run.zones.push(z);
  const per = run.per[a.key] ||= { casts: 0, hit: 0, dodged: 0, tanked: 0, ran: 0, needless: 0, dmg: 0, ms: 0 };
  const startIn = new Map(alivePlayers().map((pl) => [pl.i, inZone(partnerOf(pl), z) || inZone(ents.get(`t:${pl.i}`), z)]));
  const walked0 = new Map(players.map((pl) => [pl.i, pl.walked]));
  b.casting = z.end;
  evAll(b.id, sk.id, 'cast');
  return new Promise((done) => setTimeout(() => {
    run.zones = run.zones.filter((x) => x !== z);
    evAll(b.id, sk.id, 'release');
    const dmg = sk.fixedDamage || Math.round(BOSS_AT * (sk.power || 0) / 100);
    for (const pl of alivePlayers()) {
      per.casts++;
      const ran = pl.walked - walked0.get(pl.i) > 40;
      if (ran) per.ran++;
      const p = partnerOf(pl);
      if (!inZone(p, z)) { per.dodged++; if (ran && !startIn.get(pl.i)) per.needless++; continue; }
      if (!startIn.get(pl.i) && ran) per.needless++;
      if (!ran) per.tanked++; else per.hit++;
      say(`💢 Char${pl.i + 1} getroffen: ${sk.name} (−${dmg})${ran ? '' : ' – stehen geblieben'}`);
      damagePlayer(pl, dmg, sk.name);
      if (sk.devolve && !pl.fainted) { run.devolves++; say(`⤵ Char${pl.i + 1} wird zurück-digitiert`); }
    }
    b.casting = 0;
    done();
  }, sk.castMs));
}
async function perform(a) {
  const b = run.boss, sk = a.sk, tank = alivePlayers()[0];
  if (!tank) return;
  const aimAt = () => partnerOf(sk.aim === 'random' ? randomPlayer() : tank);
  say(`⚠ ${a.label}: ${sk.name} (${a.from}) – ${sk.castMs} ms`);
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
    stepPartners(now, dt); stepBoss(now, dt);
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
      run.attack = run.per[a.key] ||= { casts: 0, hit: 0, dodged: 0, tanked: 0, ran: 0, needless: 0, dmg: 0, ms: 0 };
      await perform(a);
      await wait(RECOVER_MS);
      run.attack.ms += Date.now() - t1; run.attack = null;
      await wait(PAUSE_MS - RECOVER_MS);
    }
  }
  clearInterval(loop);
  const fight = (Date.now() - fightStart) / 1000;
  const calmDps = run.msCalm ? run.dmgCalm / (run.msCalm / 1000) : 0;
  console.log(`\nTest-Boss Stufe 1 – ${N} Bot${N > 1 ? 's' : ''} · ${RUNDEN} Runde${RUNDEN > 1 ? 'n' : ''} · ${LIST.length} Attacken${TEMPO > 1 ? ` · Zeitraffer ×${TEMPO} (Zeiten in Spielzeit)` : ''} · Partner ${M.name} (${HP} HP)\n`);
  for (const l of log) console.log(l);
  console.log(`\nKampfzeit ${fight.toFixed(0)} s · Stürze ${run.deaths} · Tränke ${run.pots} · Spiegel-Treffer ${run.reflectHits} · zurück-digitiert ${run.devolves}× · Schaden ohne Ansage ${Math.round(calmDps)}/s`);
  console.log('\nAttacke                         Form                         Ansagen  getroffen  getankt  ausgewichen  unnötig gelaufen  Schaden am Boss');
  for (const a of LIST) {
    const p = run.per[a.key] || { casts: 0, hit: 0, dodged: 0, tanked: 0, needless: 0, dmg: 0, ms: 0 };
    const dps = p.ms ? p.dmg / (p.ms / 1000) : 0;
    const keep = calmDps ? `${Math.round(dps / calmDps * 100)} %` : '–';
    console.log(`${`${a.sk.name} (${a.from})`.padEnd(32)} ${a.label.padEnd(28)} ${String(p.casts).padStart(7)}  ${String(p.hit).padStart(9)}  ${String(p.tanked).padStart(7)}  ${String(p.dodged).padStart(11)}  ${String(p.needless).padStart(16)}  ${keep.padStart(15)}`);
  }
  console.log('\n„getroffen“ = trotz Laufen getroffen · „getankt“ = stehen geblieben und getroffen (bei kleinen Treffern gewollt) ·');
  console.log('„Schaden am Boss“ = Schaden pro Sekunde während der Attacke (+1,5 s danach) im Vergleich zur Zeit ohne Attacke (100 % = kein Verlust)');
  console.log(`Status am Ende: ${players.map((pl) => `Char${pl.i + 1}: ${pl.status()}`).join(' | ')}`);
  process.exit(0);
})();
