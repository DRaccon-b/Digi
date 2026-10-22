// 2.10.5: Mitläufer digitiert zwischen den Kämpfen in die Zielform aus den Autopilot-Einstellungen (Patamon -> Angemon)
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const B = makeWorld({ slot: 1, tag: 'Folger', accounts, quests: { q00_meet_gennai: { state: 3, counters: [] } }, mobs: [] });
const st = B.store.getState();
B.store.setState({ me: { ...st.me, tamerDs: 300, partner: { ...st.me.partner, species: 'patamon', evolutions: [{ species: 'patamon' }, { species: 'angemon', from: 'patamon', canEvolveNow: true, dsCost: 10 }] } } });
const evolved = [];
B.w.dmo.game.scene.getScene('world').deps.commands.evolve = (sp) => { evolved.push(sp); const s = B.store.getState(); B.store.setState({ me: { ...s.me, partner: { ...s.me.partner, species: sp } } }); };
B.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, apEvo: 'angemon' }));
B.w.eval(script);
const bus = new BroadcastChannel('digibot-group');
const tick = setInterval(() => bus.postMessage({ type: 'state', slot: 0, role: 'leader', name: 'Lead', inWorld: true, mapId: 'native_forest', channel: 1, x: 410, y: 330,
  bot: true, status: 'x', quests: {}, ents: ['t:lead', 'p:lead'], talks: [], done: [], busy: null, noFight: false, task: null, hunt: [], targetId: null }), 300);
(async () => {
  await wait(1500);
  B.w.document.querySelector('[data-act="bot"]').click();
  await wait(4000);
  clearInterval(tick);
  const r = { evolved, species: B.store.getState().me.partner.species };
  console.log(r);
  const ok = evolved[0] === 'angemon' && r.species === 'angemon';
  console.log(ok ? 'OK – Mitläufer digitiert' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
