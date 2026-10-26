// 2.28.0: Übersichtskarte „Lage“ (Modus, Ort, Aufgabe, eine Zeile je Gruppen-Bot mit Key of Hope) und
// Spiegel/Skill-Timing immer an (keine Haken mehr, alte „aus“-Einstellung wird überschrieben)
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Clavis' }] };
const L = makeWorld({ slot: 0, accounts, tag: 'L', mobs: [], quests: { q00_meet_gennai: { state: 3, counters: [] } } });
L.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'data', mirror: false, safeCast: false }));
L.w.eval(script);
const results = [];
const check = (name, ok, info) => { results.push(ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };
const bus = require('./groupbus')('digibot-group');
const tick = setInterval(() => bus.postMessage({ type: 'state', slot: 1, role: 'follower', name: 'Clavis', inWorld: true, mapId: 'native_forest', channel: 2, x: 420, y: 330,
  bot: true, status: 'Gruppe: bei Lead', quests: {}, ents: [], talks: [], done: [], busy: null, task: null, hunt: [], targetId: null, hp: 30, kohAt: Date.now() - 1 }), 300);
(async () => {
  await wait(2500);
  const lage = L.w.document.querySelector('[data-f="lage"]')?.textContent.replace(/\s+/g, ' ') || '';
  clearInterval(tick); bus.close();
  check('Lage: Modus und Ort', /Grinden · aus · Native Forest Ch 1/.test(lage), lage.slice(0, 80));
  check('Lage: Zeile je Gruppen-Bot mit Ort, Key of Hope und Status', /◉ Lead/.test(lage) && /Clavis.*Native Forest Ch 2 · 🔑 bereit · Gruppe: bei Lead/.test(lage), lage.slice(0, 220));
  check('Lage: niedrige HP rot markiert', !!L.w.document.querySelector('[data-f="lage"] .hp.low'));
  check('Keine Haken mehr für Spiegel/Skill-Timing', !L.w.document.querySelector('[data-apflag="mirror"]') && !L.w.document.querySelector('[data-apflag="safeCast"]'));
  const saved = JSON.parse(L.w.localStorage.getItem('digibot.cfg@lead') || L.w.localStorage.getItem('digibot.cfg') || '{}');
  check('Spiegel/Skill-Timing immer an (alte „aus“-Einstellung überschrieben)', saved.mirror === true && saved.safeCast === true, JSON.stringify({ mirror: saved.mirror, safeCast: saved.safeCast }));
  console.log(results.every(Boolean) ? 'ALLES OK' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
