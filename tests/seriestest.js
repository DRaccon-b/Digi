// 2.34.1: Reiter Quests – aktive Quests nach Serie getrennt (Adventure / Adventure 02), die Serie der aktuellen Map zuerst
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const G = makeWorld({ slot: 0, tag: 'S', noHash: true, accounts: { leader: 0, list: [{ user: 'acc1' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 1, counters: [0] }, a2_01h_ring_gang: { state: 1, counters: [0] } },
    setup({ content }) {
      content.quests.a2_01h_ring_gang = { id: 'a2_01h_ring_gang', name: 'Rings on the Little Ones', giver: 'gennai', turnIn: 'gennai', minLevel: 1, objectives: [{ kind: 'kill', species: 'kunemon', count: 3 }] };
    } });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'quest' }));
  G.w.eval(script);
  await wait(1500);
  const box = G.w.document.querySelector('[data-f="quests"]');
  const heads = [...box.querySelectorAll('.digibot__qhead')].map((h) => h.textContent);
  const order = [...box.children].map((el) => (el.classList.contains('digibot__qhead') ? '#' + el.textContent : el.querySelector('header span')?.textContent));
  console.log({ heads, order });
  const ok = heads.length === 2 && /^Adventure ·/.test(heads[0]) && /^Adventure 02/.test(heads[1]) && order.indexOf('First Steps') < order.indexOf(order.find((x) => /^#Adventure 02/.test(x || '')));
  console.log(ok ? 'OK – Quests nach Serie getrennt' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
