// 2.12.0: Heil-Skill je Digitationsform – Taste 3 ist für Gabumon „Heal <50 %“: über 50 % HP nicht im Angriff, darunter sofort.
// Nach einer Digitation zu Garurumon gilt die Einstellung nicht (dort ist Taste 3 ein normaler Angriff).
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const G = makeWorld({ slot: 0, tag: 'Solo', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [[430, 330, 'kunemon']],
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 1, counters: [0] } } });
const st0 = G.store.getState();
G.store.setState({ me: { ...st0.me, hotbar: ['cmd:attack', 'skill:0', 'skill:1'], partner: { ...st0.me.partner, species: 'gabumon', skills: [{ name: 'Boom Bubble', dsCost: 5 }, { name: 'Heal', dsCost: 5 }] } } });
G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, skillSets: { gabumon: { skills: { 2: true, 3: true, 4: true, 5: true, 6: true }, heal: { 3: 50 } } }, lvlDiff: 10 }));
// zähes Monster: seit 2.52.0 bekommen fast tote normale Monster keine Skills mehr (DS sparen)
Object.assign(G.ents.get('m:1'), { hp: 90000, maxHp: 90000 });
const keys = [];
G.w.addEventListener('keydown', (e) => keys.push(e.code), true);
G.w.eval(script);
(async () => {
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(3000);
  const healHigh = keys.filter((k) => k === 'Digit3').length, atk2 = keys.filter((k) => k === 'Digit2').length;
  const s = G.store.getState();
  G.store.setState({ me: { ...s.me, partner: { ...s.me.partner, hp: 1000 } } }); // 33 %
  const before = keys.length;
  await wait(1500);
  const healLow = keys.slice(before).filter((k) => k === 'Digit3').length;
  const sel = G.w.document.querySelector('[data-healcfg="3"]'); const first = sel?.value;
  const s2 = G.store.getState(); G.store.setState({ me: { ...s2.me, partner: { ...s2.me.partner, species: 'garurumon' } } });
  await wait(600);
  const otherForm = sel?.value;
  const r = { healHigh, atk2, healLow, uiValue: '50', uiOn: true, otherForm };
  console.log(r);
  const ok = healHigh === 0 && atk2 > 0 && healLow >= 1 && first === '50' && r.otherForm === '0';
  console.log(ok ? 'OK – Heil-Skill nur bei niedrigen HP' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
