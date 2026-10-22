// 2.10.8: Kampf-Signal – nachlaufendes Kampf-Flag des Spiels zählt nicht, ein echter Angreifer schon
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const B = makeWorld({ slot: 1, tag: 'Folger', accounts, mobs: [[900, 900, 'kunemon']], quests: { q00_meet_gennai: { state: 3, counters: [] } } });
B.w.eval(script);
const bus = new BroadcastChannel('digibot-group');
let last = null;
bus.onmessage = (e) => { if (e.data?.type === 'state' && e.data.slot === 1) last = e.data; };
const tick = setInterval(() => bus.postMessage({ type: 'state', slot: 0, role: 'leader', name: 'Lead', inWorld: true, mapId: 'native_forest', channel: 1, x: 410, y: 330,
  bot: true, status: 'x', quests: {}, ents: [], talks: [], done: [], busy: null, noFight: false, task: null, hunt: [], targetId: null }), 300);
(async () => {
  await wait(1200);
  B.w.document.querySelector('[data-act="bot"]').click();
  B.ents.get('p:me').flags = 8; B.ents.get('t:me').flags = 8; // Spiel: Kampf-Flag steht noch
  await wait(1500);
  const staleFlag = last?.fight;
  const m = B.ents.get('m:1'); m.x = 430; m.y = 330; m.targetId = 'p:me'; m.flags = 32; // echter Angreifer
  await wait(800);
  const attacked = last?.fight;
  clearInterval(tick);
  const r = { staleFlag, attacked };
  console.log(r);
  const ok = staleFlag === false && attacked === true;
  console.log(ok ? 'OK – Kampf-Signal nur bei echtem Kampf' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
