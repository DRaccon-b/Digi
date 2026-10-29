// 3.1.30: Quest-Jagd (Prüfbericht 29.10.)
//  A: 🎯 Event in Primary Village, Quest-Jagd in Native Forest – nach dem Event zurück nach Native Forest und weiterjagen
//     (vorher: Stopp auf der Event-Map mit „Quest-Ziele auf dieser Map erledigt“)
//  B: Quest-Ziele erledigt, 🎯 Event an – Event-Bereitschaft statt Stopp, nur eine Meldung im Protokoll
//  C: Mitläufer in der Quest-Jagd, „Ziele verteilen“ an, Leader auf einer anderen Map – der Mitläufer jagt trotzdem
//     (vorher: Leine zum fernen Leader, „Warte auf Quest-Monster“ ohne Ende)
//  D: Leader in der Quest-Jagd mit „Leader erledigt meine Quests“ – meldet serve:false (vorher: Mitläufer blieben stehen)
//  E: Quest-Monster zu stark – die Statuszeile nennt den Grund
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ACC = { leader: 0, list: [{ user: 'solo' }] };
const CFG = { autopilot: false, questMode: true, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 5 };
const Q_OPEN = { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 1, counters: [0] } };
const Q_DONE = { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } };
const upEvent = (boss, mapId) => { const now = Date.now(); return [{ id: 'mega_hunt', now, slot: { key: 's1', startMs: now - 60000, endMs: now + 3600000 }, boss, mapId, channel: 1, state: 'up', next: null }]; };
const logText = (G) => G.w.document.body.textContent || '';
const botOn = (G) => !/Start/.test(G.w.document.querySelector('[data-act="bot"]')?.textContent || '');
async function start(G, cfg, events) {
  if (events) G.w.dmo.game.scene.getScene('world').deps.commands.requestEvents = events;
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ ...CFG, ...cfg }));
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
}

async function A() {
  const G = makeWorld({ slot: 0, tag: 'A', noHash: true, accounts: ACC, mobs: [], quests: Q_OPEN,
    setup({ content }) { content.digimon.bigmon_hunt = { name: 'Bigmon' }; } });
  let up = true, sawPv = false;
  await start(G, { hunt: true }, async () => (up ? upEvent('bigmon_hunt', 'primary_village') : []));
  for (let i = 0; i < 100 && !sawPv; i++) { await wait(200); if (G.state.world.mapId === 'primary_village' && G.state.screen === 'world') sawPv = true; }
  await wait(1500); up = false; // Event vorbei
  let back = false;
  for (let i = 0; i < 150; i++) { await wait(200); if (!botOn(G)) break; if (G.state.world.mapId === 'native_forest' && /Warte auf Quest-Monster/.test(G.status())) { back = true; break; } }
  const r = { sawPv, back, on: botOn(G), map: G.state.world.mapId, status: G.status(), stopped: /Quest-Ziele auf dieser Map erledigt – Bot gestoppt/.test(logText(G)) };
  G.w.close();
  return { ok: sawPv && back && r.on && !r.stopped, info: JSON.stringify(r) };
}
async function B() {
  const G = makeWorld({ slot: 0, tag: 'B', noHash: true, accounts: ACC, mobs: [], quests: Q_DONE });
  await start(G, { hunt: true }, async () => []);
  await wait(4000);
  const n = (logText(G).match(/Quest-Ziele auf dieser Map erledigt – Event-Bereitschaft/g) || []).length;
  const r = { on: botOn(G), status: G.status(), n };
  G.w.close();
  return { ok: r.on && n >= 1 && n <= 2 && /Event/.test(r.status), info: JSON.stringify(r) };
}
async function C() {
  const accounts = { leader: 0, spread: true, popup: true, mirror: false, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
  const G = makeWorld({ slot: 1, tag: 'C', accounts, quests: Q_OPEN });
  const bus = require('./groupbus')('digibot-group');
  const lead = () => bus.postMessage({ type: 'state', slot: 0, role: 'leader', user: 'lead', name: 'Lead', inWorld: true, mapId: 'primary_village', channel: 1,
    x: 2000, y: 2000, bot: true, status: '', quests: {}, ents: ['t:L', 'p:L'], targetId: null, hunt: [], noFight: false, task: null, talks: [], done: [], busy: null, fin: [], deferred: [], fight: false, farm: false, serve: false });
  lead(); const iv = setInterval(lead, 400);
  await start(G, {});
  for (let i = 0; i < 50 && G.kills === 0; i++) await wait(200);
  const r = { kills: G.kills, status: G.status() };
  clearInterval(iv); bus.close(); G.w.close();
  return { ok: r.kills > 0, info: JSON.stringify(r) };
}
async function D() {
  const accounts = { leader: 0, serve: true, popup: true, mirror: false, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
  const G = makeWorld({ slot: 0, tag: 'D', accounts, quests: Q_OPEN });
  const seen = [];
  const bus = require('./groupbus')('digibot-group');
  bus.onmessage = (e) => { if (e.data?.type === 'state' && e.data.slot === 0) seen.push(e.data.serve); };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ ...CFG }));
  G.w.eval(script);
  await wait(2500);
  bus.close(); G.w.close();
  const last = seen.slice(-3);
  return { ok: last.length > 0 && last.every((x) => x === false), info: JSON.stringify(last) };
}
async function E() {
  const G = makeWorld({ slot: 0, tag: 'E', noHash: true, accounts: ACC, mobs: [], quests: Q_OPEN,
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'm:s', kind: 2, defId: 'kunemon', level: 30, x: 450, y: 330, hp: 3000, maxHp: 3000, flags: 0, targetId: '' }] : []) });
  await start(G, {});
  await wait(2500);
  const r = { status: G.status(), on: botOn(G) };
  G.w.close();
  return { ok: /zu stark/.test(r.status) && r.on, info: JSON.stringify(r) };
}

(async () => {
  let bad = 0;
  for (const [name, fn, text] of [
    ['A', A, 'Quest-Jagd: nach dem Event zurück zur Jagd-Map, kein falscher Stopp'],
    ['B', B, 'Quest-Ziele erledigt mit 🎯 Event: Event-Bereitschaft statt Stopp'],
    ['C', C, 'Ziele verteilen: Mitläufer jagt, wenn der Leader auf einer anderen Map ist'],
    ['D', D, 'Leader in der Quest-Jagd meldet kein „erledigt meine Quests“'],
    ['E', E, 'Quest-Monster zu stark: Grund in der Statuszeile'],
  ]) {
    let r;
    try { r = await fn(); } catch (e) { r = { ok: false, info: String(e?.stack || e) }; }
    console.log(`${r.ok ? 'OK' : 'FEHLER'} ${name} – ${text}${r.ok ? '' : ` · ${r.info}`}`);
    if (!r.ok) bad++;
  }
  process.exit(bad ? 1 : 0);
})();
