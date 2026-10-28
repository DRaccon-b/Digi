// 3.1.17: Angriffs-Crest (hier Izzys Crest of Knowledge, +30 % Skill-Schaden 15 s) wartet darauf, dass der stärkste
// Angriffsskill – Gate of Judgment – gleich bereit ist, damit er sicher im Buff liegt (Nutzer: „immer vor einem Gate of
// Judgment“). A: Gate noch 30 s auf Abklingzeit → kein Crest. B: Gate in 1 s bereit → Crest sofort.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const GATE = 'clavisangemon.gate_of_judgment', LOCK = 'clavisangemon.divine_lock';
const W = makeWorld({ slot: 0, tag: 'C', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
  extraEnts: (id) => (id === 'native_forest' ? [{ id: 'boss:1', kind: 2, defId: 'armageddemon', x: 360, y: 330, hp: 900000, maxHp: 900000, level: 99, flags: 16, targetId: 'p:me' }] : []),
  setup({ content }) {
    content.skills = {
      [GATE]: { id: GATE, name: 'Gate of Judgment', kind: 'damage', target: 'enemy', shape: 'single', power: 520, range: 144, castMs: 900, cooldownMs: 18000 },
      [LOCK]: { id: LOCK, name: 'Divine Lock', kind: 'damage', target: 'enemy', shape: 'single', power: 208, range: 128, castMs: 300, cooldownMs: 12000 },
    };
    content.digimon.armageddemon = { name: 'Armageddemon', radius: 7, skills: [] };
    content.tamers = { izzy: { id: 'izzy', name: 'Izzy', skill: { id: 'izzy.crest_of_knowledge', name: 'Crest of Knowledge', scope: 'self', cooldownMs: 90000, skillDmg: { pct: 30, durationMs: 15000 } } } };
  } });
W.handlers = {};
W.w.dmo.net.on = (name, fn) => { W.handlers[name] = fn; return () => {}; };
W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log' }));
const me = W.store.getState().me;
const perf = () => W.w.performance.now();
W.store.setState({ me: { ...me, tamerId: 'izzy', hotbar: ['cmd:attack', 'skill:0', 'skill:1'], partner: { ...me.partner, species: 'clavisangemon', ds: 5000, maxDs: 5000,
  skills: [{ id: GATE, name: 'Gate of Judgment', dsCost: 600, cooldownMs: 18000, castMs: 900, unlocked: true }, { id: LOCK, name: 'Divine Lock', dsCost: 400, cooldownMs: 12000, castMs: 300, unlocked: true }] } },
  target: { id: 'boss:1', kind: 'mob', name: 'Armageddemon', level: 99, hp: 900000, maxHp: 900000, flags: 16 },
  cooldowns: { 'skill:0': { end: perf() + 30000 }, 'skill:1': { end: perf() + 30000 } } });
const calls = [];
W.w.dmo.game.scene.getScene('world').deps.commands.tamerSkill = () => calls.push(Date.now());
W.w.eval(script);
const results = [];
const check = (name, ok, info) => { results.push(ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };
(async () => {
  await wait(1200);
  W.w.document.querySelector('[data-act="bot"]').click();
  await wait(3000);
  check('A: Gate 30 s auf Abklingzeit – Crest wartet', calls.length === 0, `${calls.length} Aufrufe · ${W.status()}`);
  W.store.setState({ cooldowns: { 'skill:0': { end: perf() + 1000 }, 'skill:1': { end: perf() + 30000 } } });
  await wait(1500);
  check('B: Gate gleich bereit – Crest gezündet', calls.length === 1, `${calls.length} Aufrufe · ${W.status()}`);
  console.log(results.every(Boolean) ? 'ALLES OK' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
