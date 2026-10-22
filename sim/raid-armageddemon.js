#!/usr/bin/env node
// Raid-Probelauf: Armageddemon gegen eine 5er-Gruppe (Imperialdramon als Leader + 4 ClavisAngemon mit Key of Hope).
// Fünf echte DigiBot-Fenster laufen in nachgebauten Spielwelten (tests/gw.js) und reden über den Gruppenkanal
// miteinander. Dieses Skript spielt den Boss: es kündigt seine Angriffe an (Warnkreise/Fächer in allen Fenstern,
// Skill-Ereignisse wie vom Server) und rechnet beim Einschlag aus, wen es trifft.
//
//   node sim/raid-armageddemon.js                 mit allen Bot-Funktionen
//   node sim/raid-armageddemon.js --ohne          ohne Ausweichen und ohne Key of Hope (Vergleich)
//   DAUER=120 HP=80000 node sim/raid-armageddemon.js
//
// Angriffswerte aus den Spieldaten (Stand Okt. 2026). Die Digimon-HP der Spieler kennt der Client nicht – Annahme HP.
const path = require('path');
const fs = require('fs');
const makeWorld = require(path.join(__dirname, '..', 'tests', 'gw.js'));
let script = fs.readFileSync(path.join(__dirname, '..', 'digibot.user.js'), 'utf8');
// Versuch: Key of Hope nicht für Black Rain verbrauchen (dem kann man ausweichen) – KOH_OHNE_RAIN=1
if (process.env.KOH_OHNE_RAIN) script = script.replace("'armageddemon.black_rain', 'armageddemon.black_rain_storm'", "'armageddemon.black_rain_storm'");

const OHNE = process.argv.includes('--ohne');
const DAUER = (Number(process.env.DAUER) || 100) * 1000;
const HP = Number(process.env.HP) || 80000;
const KOH = 'clavisangemon.key_of_hope';
const SKILLS = {
  'armageddemon.black_rain': { id: 'armageddemon.black_rain', name: 'Black Rain', shape: 'circle', radius: 64, telegraph: true, each: true, fixedDamage: 52000, cooldownMs: 24000, castMs: 3000 },
  'armageddemon.black_rain_storm': { id: 'armageddemon.black_rain_storm', name: 'Black Rain (Sturm)', shape: 'circle', radius: 48, telegraph: true, each: true, fixedDamage: 40000, cooldownMs: 28000, castMs: 4000 },
  'armageddemon.black_rain_shell': { id: 'armageddemon.black_rain_shell', name: 'Black Rain (Hülle)', shape: 'circle', radius: 40, hpDamagePct: 240, share: true, cooldownMs: 28000, castMs: 4000 },
  'armageddemon.ultimate_flare': { id: 'armageddemon.ultimate_flare', name: 'Ultimate Flare', shape: 'line', radius: 20, range: 360, telegraph: true, fixedDamage: 60000, cooldownMs: 24000, castMs: 2500, sweep: { arc: 140, ms: 1600 } },
  [KOH]: { id: KOH, name: 'Key of Hope', kind: 'buff', target: 'self', protectionMs: 2000, radius: 128, dsCost: 535, cooldownMs: 45000, castMs: 0 },
};
const BOSS = { x: 600, y: 420 };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Gruppe aufbauen ---
const members = [
  { char: 'Imperial', species: 'imperialdramon', at: [548, 400] },
  { char: 'Clavis1', species: 'clavisangemon', at: [652, 395], clavis: true },
  { char: 'Clavis2', species: 'clavisangemon', at: [600, 480], clavis: true },
  { char: 'Clavis3', species: 'clavisangemon', at: [660, 455], clavis: true },
  { char: 'Clavis4', species: 'clavisangemon', at: [545, 455], clavis: true },
];
const accounts = { leader: 0, popup: true, mirror: false, list: members.map((m, i) => ({ on: true, user: `u${i}`, char: m.char })) };
const protections = []; // { at, x, y, by }
const stats = members.map((m) => ({ name: m.char, hits: 0, dmg: 0, dodged: 0, blocked: 0, koh: 0, down: 0 }));
const t0 = Date.now();
const sec = () => ((Date.now() - t0) / 1000).toFixed(1);
const log = [];

const W = members.map((m, i) => {
  const G = makeWorld({ slot: i, accounts, tag: m.char, mobs: [], quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) { content.skills = SKILLS; content.digimon.armageddemon = { name: 'Armageddemon', skills: Object.values(SKILLS).filter((s) => s.id.startsWith('armageddemon')) }; },
    extraEnts: () => [{ id: 'b:1', kind: 2, defId: 'armageddemon', x: BOSS.x, y: BOSS.y, hp: 9e9, maxHp: 1e10, level: 99, flags: 16 | 32, targetId: 'p:me' }] });
  G.handlers = {};
  G.w.dmo.net.on = (name, fn) => { G.handlers[name] = fn; return () => {}; };
  const scene = G.w.dmo.game.scene.getScene('world');
  scene.telegraphs = { active: [], circles: [], marksActive: [] };
  scene.mechB = { lines: [] };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'data', lvlDiff: 100, radius: 400,
    dodge: !OHNE, koh: !OHNE }));
  const me = G.store.getState().me;
  G.store.setState({ me: { ...me, hotbar: m.clavis ? ['cmd:attack', 'skill:0'] : ['cmd:attack'], partner: { ...me.partner, species: m.species, level: 99, hp: HP, maxHp: HP, ds: 99999, maxDs: 99999,
    skills: m.clavis ? [{ id: KOH, name: 'Key of Hope', dsCost: 535, unlocked: true }] : [] } } });
  const t = G.ents.get('t:me'), p = G.ents.get('p:me');
  t.x = m.at[0]; t.y = m.at[1]; p.x = m.at[0] + 10; p.y = m.at[1];
  if (m.clavis) {
    G.w.addEventListener('keydown', (e) => {
      if (e.code !== 'Digit2') return;
      const pp = G.ents.get('p:me');
      protections.push({ at: Date.now(), x: pp.x, y: pp.y, by: m.char });
      stats[i].koh++;
      log.push(`${sec()} s  🔑 ${m.char} zündet Key of Hope`);
      G.store.setState({ cooldowns: { ...G.store.getState().cooldowns, 'skill:0': { end: G.w.performance.now() + 45000 } } });
    }, true);
  }
  G.w.eval(script);
  return G;
});
const partnerPos = (i) => { const p = W[i].ents.get('p:me'); return { x: p.x, y: p.y }; };
const alive = (i) => !W[i].store.getState().me.partner.fainted;

// --- Zonen in allen Fenstern zeigen ---
function showZones(circles, fan, endMs) {
  for (const G of W) {
    const sc = G.w.dmo.game.scene.getScene('world'), now = G.w.performance.now();
    sc.telegraphs.active = circles.map((c) => ({ x: c.x, y: c.y, r: c.r }));
    sc.telegraphs.circles = circles.map((c) => ({ x: c.x, y: c.y, r: c.r, end: now + endMs }));
    sc.mechB.lines = fan ? [{ fx: BOSS.x, fy: BOSS.y, tx: fan.tx, ty: fan.ty, r: 20, skill: SKILLS['armageddemon.ultimate_flare'], end: now + endMs }] : [];
  }
}
const clearZones = () => showZones([], null, 0);
const emit = (skill, phase) => { for (const G of W) G.handlers.evs?.([{ t: 'skill', src: 'b:1', skill, phase }]); };
const inFan = (p, fan) => {
  const d = Math.hypot(p.x - BOSS.x, p.y - BOSS.y);
  if (d > 360 + 20) return false;
  const a = Math.atan2(p.y - BOSS.y, p.x - BOSS.x), dir = Math.atan2(fan.ty - BOSS.y, fan.tx - BOSS.x);
  let diff = Math.abs(a - dir); if (diff > Math.PI) diff = 2 * Math.PI - diff;
  return diff <= (140 / 2) * Math.PI / 180;
};
const protectedAt = (p, now) => protections.some((pr) => now >= pr.at && now <= pr.at + 2000 && Math.hypot(p.x - pr.x, p.y - pr.y) <= 128);
function hit(i, dmg, what) {
  const G = W[i], s = G.store.getState(), p = s.me.partner;
  const hp = Math.max(0, p.hp - dmg);
  G.store.setState({ me: { ...s.me, partner: { ...p, hp, fainted: hp <= 0 } } });
  stats[i].hits++; stats[i].dmg += dmg;
  if (hp <= 0) { stats[i].down++; log.push(`${sec()} s  💀 ${members[i].char} kippt um (${what})`); }
}

// --- Boss-Ablauf ---
async function cast(id) {
  const sk = SKILLS[id];
  const tank = 0; // Hauptziel: höchste Max-HP -> hier der Leader
  emit(id, 'cast');
  if (id === 'armageddemon.black_rain_storm') emit('armageddemon.black_rain_shell', 'cast');
  // Warnzonen: Kreise unter jedem lebenden Spieler bzw. Fächer Richtung Hauptziel
  const pos = members.map((m, i) => partnerPos(i));
  const circles = sk.shape === 'circle' ? pos.filter((_, i) => alive(i)).map((p) => ({ x: p.x, y: p.y, r: sk.radius })) : [];
  const fan = sk.shape === 'line' ? { tx: pos[tank].x, ty: pos[tank].y } : null;
  const shell = id === 'armageddemon.black_rain_storm' ? { x: pos[tank].x, y: pos[tank].y, r: 40 } : null;
  showZones(shell ? [...circles, shell] : circles, fan, sk.castMs);
  log.push(`${sec()} s  ⚠ ${sk.name} angesagt (${(sk.castMs / 1000).toFixed(1)} s)`);
  await wait(sk.castMs);
  emit(id, 'release');
  const now = Date.now();
  for (let i = 0; i < members.length; i++) {
    if (!alive(i)) continue;
    const p = partnerPos(i);
    const inside = sk.shape === 'circle' ? circles.some((c) => Math.hypot(p.x - c.x, p.y - c.y) <= c.r) : inFan(p, fan);
    if (!inside) { stats[i].dodged++; continue; }
    if (protectedAt(p, now)) { stats[i].blocked++; continue; }
    hit(i, sk.fixedDamage, sk.name);
  }
  if (shell && alive(tank)) { // geteilter Schaden um das Hauptziel (wo es beim Einschlag steht): 240 % seiner Max-HP, aufgeteilt
    const c = partnerPos(tank);
    const inn = members.map((_, i) => i).filter((i) => alive(i) && (i === tank || Math.hypot(partnerPos(i).x - c.x, partnerPos(i).y - c.y) <= shell.r));
    const open = inn.filter((i) => !protectedAt(partnerPos(i), now));
    if (open.length) {
      const each = Math.round(HP * 2.4 / inn.length);
      for (const i of open) hit(i, each, `Hülle, ${inn.length} im Kreis`);
    }
    log.push(`${sec()} s     Hülle: ${inn.length} im Kreis, ${inn.length - open.length} geschützt`);
  }
  clearZones();
}

(async () => {
  await wait(1500);
  W[0].w.document.querySelector('[data-act="grp-start"]')?.click(); // Start geht an alle Gruppenfenster
  await wait(2500);
  const on = (G) => !/Bot aus/.test(G.status());
  for (const G of W) if (!on(G)) G.w.document.querySelector('[data-act="bot"]').click();
  await wait(1500);
  log.push(`${sec()} s  Bots: ${W.map((G) => (on(G) ? "an" : "AUS")).join(", ")}`);
  const order = ['armageddemon.black_rain', 'armageddemon.ultimate_flare', 'armageddemon.black_rain_storm'];
  const ready = Object.fromEntries(order.map((id) => [id, 0]));
  const end = Date.now() + DAUER;
  while (Date.now() < end && members.some((_, i) => alive(i))) {
    const id = order.find((x) => ready[x] <= Date.now());
    if (!id) { await wait(250); continue; }
    ready[id] = Date.now() + SKILLS[id].cooldownMs;
    await cast(id);
    await wait(2000);
  }
  console.log(`\nRaid-Probelauf Armageddemon – ${OHNE ? 'OHNE Ausweichen/Key of Hope' : 'mit allen Bot-Funktionen'} · ${DAUER / 1000} s · HP je Digimon ${HP}\n`);
  for (const l of log) console.log(l);
  console.log('\nSpieler        getroffen  Schaden  ausgewichen  geblockt  Key of Hope  umgekippt');
  for (const s of stats) console.log(`${s.name.padEnd(14)} ${String(s.hits).padStart(9)} ${String(s.dmg).padStart(8)} ${String(s.dodged).padStart(12)} ${String(s.blocked).padStart(9)} ${String(s.koh).padStart(12)} ${String(s.down).padStart(10)}`);
  process.exit(0);
})();
