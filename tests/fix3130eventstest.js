// 3.1.30: Event & Weltboss (Prüfbericht 29.10.)
//  A: 🎯 Event, Gankoomon mit Hinukamuy – das Ziel bleibt der Hinukamuy (vorher sprang es im Takt zwischen Boss und Add)
//  B: 🎯 Event, ein Greifarm hält das Digimon – das Ziel bleibt der Arm, nicht der Jagd-Boss
//  C: Nur Event/WB, Event in 3 min, ein Angreifer – der Bot wehrt ab (vorher: keine Abwehr)
//  D: wie C mit Warteplatz – der Bot bleibt an der Event-Map (vorher: Pendeln zwischen Warteplatz und Event-Map)
//  E: Event-Map gesperrt – das Event wird übersprungen, Grinden läuft weiter (vorher: Stillstand bis Fensterende)
//  F: Grinden, Feldboss im Kampf, Event erst in 3 min – Kampf zu Ende bringen statt abzubrechen und abzureisen
//  G: Portal zur Event-Map lehnt ab (Bot steht darin) – nach HUNT_STUCK_MS übersprungen (vorher: Rückfallnetz meldet nur
//     alle 15 s einen Takt lang, Zähler in jedem Zwischentakt gelöscht – nie übersprungen)
// Aufruf: node tests/fix3130eventstest.js <script> [A–G] – ohne Buchstaben alle
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const QUESTS = { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } };
const ACC = { leader: 0, list: [{ user: 'solo' }] };
const CFG = { autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20 };
const upEvent = (boss, mapId) => async () => { const now = Date.now(); return [{ id: 'mega_hunt', now, slot: { key: 's1', startMs: now - 60000, endMs: now + 3600000 }, boss, mapId, channel: 1, state: 'up', next: { boss: 'x_hunt', mapId, startMs: now + 7200000 } }]; };
const soonEvent = (boss, mapId, inMs) => async () => { const now = Date.now(); return [{ id: 'mega_hunt', now, slot: null, state: 'idle', next: { boss, mapId, startMs: now + inMs } }]; };
async function start(G, cfg, events) {
  G.w.dmo.game.scene.getScene('world').deps.commands.requestEvents = events;
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ ...CFG, ...cfg }));
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
}
const logText = (G) => G.w.document.body.textContent || '';
async function targetSeq(G, n) { const seq = []; for (let i = 0; i < n; i++) { seq.push(G.store.getState().target?.id || '-'); await wait(150); } return seq; }

async function A() {
  const G = makeWorld({ slot: 0, tag: 'A', noHash: true, accounts: ACC, mobs: [], quests: QUESTS,
    setup({ content }) { content.digimon.gankoomon_hunt = { name: 'Gankoomon' }; content.digimon.hinukamuy = { name: 'Hinukamuy' }; },
    extraEnts: () => [
      { id: 'b:1', kind: 2, defId: 'gankoomon_hunt', x: 450, y: 330, hp: 4200000, maxHp: 8556880, level: 3, flags: 16 | 8, targetId: 'p:me' },
      { id: 'h:1', kind: 2, defId: 'hinukamuy', x: 500, y: 330, hp: 427844, maxHp: 427844, level: 3, flags: 32, targetId: 'p:me' },
      { id: 'h:2', kind: 2, defId: 'hinukamuy', x: 420, y: 380, hp: 300000, maxHp: 427844, level: 3, flags: 32, targetId: 'p:me' },
    ] });
  await start(G, { hunt: true }, upEvent('gankoomon_hunt', 'native_forest'));
  const seq = await targetSeq(G, 30); G.w.close();
  const after = seq.slice(seq.indexOf('h:2'));
  return { ok: seq.includes('h:2') && !after.includes('b:1'), info: seq.join(' ') };
}
async function B() {
  const G = makeWorld({ slot: 0, tag: 'B', noHash: true, accounts: ACC, mobs: [], quests: QUESTS,
    setup({ content }) { content.digimon.bigmon_hunt = { name: 'Bigmon' }; content.digimon.tentacle_bug = { name: 'Tentacle Bug' }; content.skills = { ...(content.skills || {}), grab_x: { name: 'Grab', grab: { arm: 'tentacle_bug' } } }; },
    extraEnts: () => [
      { id: 'b:1', kind: 2, defId: 'bigmon_hunt', x: 450, y: 330, hp: 4200000, maxHp: 8556880, level: 3, flags: 16 | 8, targetId: 'p:me' },
      { id: 'a:1', kind: 2, defId: 'tentacle_bug', x: 430, y: 360, hp: 900000, maxHp: 900000, level: 3, flags: 32, targetId: 'p:me' },
    ] });
  await start(G, { hunt: true }, upEvent('bigmon_hunt', 'native_forest'));
  const seq = await targetSeq(G, 30); G.w.close();
  const after = seq.slice(seq.indexOf('a:1'));
  return { ok: seq.includes('a:1') && !after.includes('b:1'), info: seq.join(' ') };
}
async function waitTrial(tag, idle) {
  const G = makeWorld({ slot: 0, tag, noHash: true, accounts: ACC, mobs: [], quests: QUESTS,
    setup({ content }) { content.digimon.bigmon_hunt = { name: 'Bigmon' }; },
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'm:a', kind: 2, defId: 'kunemon', level: 3, x: 430, y: 330, hp: 3000, maxHp: 3000, flags: 0, targetId: 'p:me' }] : []) });
  await start(G, { eventsOnly: true, eventsIdleMap: idle, hunt: true, wboss: false }, soonEvent('bigmon_hunt', 'native_forest', 180000));
  const seq = [];
  for (let i = 0; i < 110; i++) { const m = G.state.world.mapId; if (seq[seq.length - 1] !== m) seq.push(m); await wait(150); }
  const hp = G.ents.get('m:a')?.hp ?? 3000, last = G.state.world.mapId; // nach einem Map-Wechsel ist der Angreifer neu (volle HP)
  G.w.close();
  return { hp, seq, last };
}
async function C() { const r = await waitTrial('C', ''); return { ok: r.hp < 3000 && r.seq.length === 1, info: JSON.stringify(r) }; }
async function D() { const r = await waitTrial('D', 'primary_village'); return { ok: r.last === 'native_forest' && r.seq.length <= 3, info: JSON.stringify(r) }; }
async function E() {
  const G = makeWorld({ slot: 0, tag: 'E', noHash: true, accounts: ACC, quests: QUESTS,
    setup({ content }) { content.digimon.bigmon_hunt = { name: 'Bigmon' }; content.maps.locked_map = { id: 'locked_map', name: 'Locked Map' }; } });
  await start(G, { hunt: true }, upEvent('bigmon_hunt', 'locked_map'));
  await wait(7000);
  const r = { kills: G.kills, skipped: /überspringe dieses Event/.test(logText(G)), status: G.status() };
  G.w.close();
  return { ok: r.kills > 0 && r.skipped, info: JSON.stringify(r) };
}
async function F() {
  const G = makeWorld({ slot: 0, tag: 'F', noHash: true, accounts: ACC, mobs: [], quests: QUESTS,
    setup({ content }) { content.digimon.bigmon_hunt = { name: 'Bigmon' }; content.digimon.puppetmon = { name: 'Puppetmon' }; },
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'f:1', kind: 2, defId: 'puppetmon', x: 440, y: 330, hp: 900000, maxHp: 900000, level: 3, flags: 16 | 8, targetId: 'p:me' }] : []) });
  // die Vorlaufzeit beginnt erst, wenn der Kampf schon läuft (vorher: nächste Jagd in 2 h)
  const t0 = Date.now(), soon = soonEvent('bigmon_hunt', 'primary_village', 180000), far = soonEvent('bigmon_hunt', 'primary_village', 7200000);
  await start(G, { hunt: true }, () => (Date.now() - t0 < 3000 ? far() : soon()));
  const seq = [];
  for (let i = 0; i < 110; i++) { const m = G.state.world.mapId; if (seq[seq.length - 1] !== m) seq.push(m); await wait(150); }
  const r = { seq, bossHp: G.ents.get('f:1')?.hp, status: G.status() };
  G.w.close();
  return { ok: seq.length === 1 && r.bossHp < 900000, info: JSON.stringify(r) };
}
async function Gp() {
  let maps;
  const G = makeWorld({ slot: 0, tag: 'G', noHash: true, accounts: ACC, mobs: [], quests: QUESTS,
    setup({ content, MAPS }) { maps = MAPS; content.digimon.bigmon_hunt = { name: 'Bigmon' }; } });
  await start(G, { hunt: true }, upEvent('bigmon_hunt', 'primary_village'));
  const t0 = Date.now();
  while (Date.now() - t0 < 15000 && !/reise nach/.test(G.status())) await wait(200);
  const going = /reise nach/.test(G.status());
  maps.native_forest.layers[0].objects[0].type = 'portal_off'; // Spielwelt lässt nicht durch, der Bot kennt das Portal schon
  let skipped = false;
  while (Date.now() - t0 < 100000 && !(skipped = /überspringe dieses Event/.test(logText(G)))) await wait(500);
  const r = { going, skipped, map: G.state.world.mapId, s: Math.round((Date.now() - t0) / 1000), status: G.status() };
  G.w.close();
  return { ok: going && skipped && r.map === 'native_forest', info: JSON.stringify(r) };
}
(async () => {
  const tests = [
    ['A', 'Gankoomon: Ziel bleibt beim Hinukamuy (kein Hin und Her mit dem Boss)', A],
    ['B', 'Greifarm hält das Digimon: Ziel bleibt der Arm, nicht der Jagd-Boss', B],
    ['C', 'Nur Event/WB beim Warten: Angreifer wird abgewehrt', C],
    ['D', 'Nur Event/WB mit Warteplatz: bleibt an der Event-Map, kein Pendeln', D],
    ['E', 'Event-Map gesperrt: Event übersprungen, Grinden läuft weiter', E],
    ['F', 'Event-Vorlauf: laufender Feldboss-Kampf wird nicht abgebrochen', F],
    ['G', 'Portal zur Event-Map lehnt ab: Event nach HUNT_STUCK_MS übersprungen', Gp],
  ];
  let all = true;
  for (const [k, name, fn] of tests) {
    if (process.argv[3] && !process.argv[3].includes(k)) continue;
    const r = await fn();
    all = all && r.ok;
    console.log(`${r.ok ? 'OK    ' : 'FEHLER'} ${k}: ${name}${r.ok && !process.env.V ? '' : ` – ${r.info}`}`);
  }
  process.exit(all ? 0 : 1);
})();
