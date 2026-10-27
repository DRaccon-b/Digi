// 3.0.5: Nach einem Not-Aus (Esc/Knopf in irgendeinem Fenster) sind alle Fenster gesperrt. Ein Klick auf „Start“ im
// Leader-Fenster (manual) startet die Mitläufer wieder – ein automatischer Start (ohne manual) nicht.
// Dieses Fenster ist der Mitläufer (Slot 1); der Leader (Slot 0) wird über den Gruppenkanal nachgebaut.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const G = makeWorld({ slot: 1, tag: 'Foll', accounts, quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 1, counters: [0] } } });
G.w.eval(script);
const bus = require('./groupbus')('digibot-group', 0);
const leaderState = setInterval(() => bus.postMessage({ type: 'state', slot: 0, role: 'leader', name: 'Lead', inWorld: true, mapId: 'native_forest', channel: 1, x: 400, y: 330,
  bot: true, status: 'jagt', quests: {}, ents: ['t:lead', 'p:lead'], talks: [], done: [], busy: null, fight: false }), 400);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const on = () => !/^Bot aus|Not-Aus|gesperrt/.test(G.status()) && !/▶/.test(G.w.document.querySelector('[data-act="bot"]')?.textContent || '');
(async () => {
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(800);
  const r = { startedOn: on() };
  bus.postMessage({ type: 'stop', slot: 0, scope: 'esc' }); // Not-Aus per Esc in einem anderen Fenster
  await wait(800);
  r.stoppedByEsc = !on(); r.stopStatus = G.status();
  bus.postMessage({ type: 'start', slot: 0 }); // automatischer Start: darf die Sperre nicht aufheben
  await wait(1500);
  r.stillOffAfterAutoStart = !on();
  bus.postMessage({ type: 'start', slot: 0, manual: true }); // Klick auf Start im Leader-Fenster
  await wait(2000);
  r.onAfterManualStart = on(); r.endStatus = G.status();
  console.log(r);
  clearInterval(leaderState); bus.close(); G.w.close();
  const ok = r.startedOn && r.stoppedByEsc && r.stillOffAfterAutoStart && r.onAfterManualStart;
  console.log(ok ? 'OK – Not-Aus sperrt, Start im Leader-Fenster startet alle wieder' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
