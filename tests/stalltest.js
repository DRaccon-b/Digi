// 2.10.4: Notbremse – eine Jagd, bei der die Zähler nie steigen, wird nach der Wartezeit (hier auf 3 s verkürzt) neu geplant
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8').replace('const HUNT_STALL_MS = 240000;', 'const HUNT_STALL_MS = 3000;');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const G = makeWorld({ slot: 0, tag: 'Solo', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] },
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q_b: { state: 1, counters: [0] } },
  setup({ content }) {
    content.quests.q_b = { id: 'q_b', name: 'Sporen', giver: 'gennai', turnIn: 'gennai', minLevel: 1, objectives: [{ kind: 'collect', itemId: 'spore', count: 3 }] };
    content.digimon.kunemon.mob = { drops: [{ itemId: 'spore', chance: 0.01 }] };
    content.items.spore = { name: 'Spore' };
  } });
G.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log' }));
G.w.eval(script);
(async () => {
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(9000);
  const log = G.w.document.querySelector('[data-f="log"]').textContent;
  const r = { stall: /ohne Fortschritt – meide dieses Gebiet/.test(log), kills: G.kills };
  console.log(r);
  console.log(r.stall ? 'OK – Notbremse greift' : 'FEHLER');
  process.exit(r.stall ? 0 : 1);
})();
