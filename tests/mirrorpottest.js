// 2.15.1: Spiegeln – der Leader (selbst gespielt, Bot aus) setzt seine Tränke F1–F3 trotzdem automatisch ein
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, mirror: true, mirrorAtk: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const L = makeWorld({ slot: 0, accounts, tag: 'L', mobs: [], quests: { q00_meet_gennai: { state: 3, counters: [] } } });
L.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 40, dsPot: 20, tdsPot: 20, tab: 'acc' }));
const st = L.store.getState();
const hotbar = ['cmd:attack', null, null, null, null, null, null, null, null, null, 'item:ds_pot'];
L.store.setState({ me: { ...st.me, tamerDs: 30, tamerMaxDs: 360, hotbar, inventory: [{ itemId: 'ds_pot', qty: 5 }] } });
const keys = [];
L.w.addEventListener('keydown', (e) => keys.push(e.code), true);
L.w.eval(script);
(async () => {
  await wait(2500);
  const botOn = L.w.document.querySelector('[data-act="bot"]')?.classList.contains('on');
  const r = { botOn: !!botOn, f3: keys.filter((k) => k === 'F3').length, f1: keys.filter((k) => k === 'F1').length };
  console.log(r);
  const ok = !r.botOn && r.f3 >= 1 && r.f1 === 0;
  console.log(ok ? 'OK – Leader nutzt beim Spiegeln F3' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
