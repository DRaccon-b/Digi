// 3.1.27: Davis (setzt alle Abklingzeiten zurück) auf einem Digimon ohne Key of Hope (Paladin) zündet erst, wenn der stärkste
// Angriffsskill (Omega Blade) noch ≥ 10 s Abklingzeit hat und ein weiterer Angriffsskill wartet.
// A: Omega Blade bereit, Invincible Sword + Paladin Guard auf Abklingzeit → kein Davis (früher: gezündet).
// B: Omega Blade noch 15 s, Invincible Sword noch 4 s → Davis.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OB = 'imperialdramon_paladin.omega_blade', IS = 'imperialdramon_paladin.invincible_sword', PG = 'imperialdramon_paladin.paladin_guard';
const W = makeWorld({ slot: 0, tag: 'D', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
  extraEnts: (id) => (id === 'native_forest' ? [{ id: 'boss:1', kind: 2, defId: 'armageddemon', x: 360, y: 330, hp: 800000, maxHp: 900000, level: 99, flags: 16 | 8, targetId: 'p:me' }] : []),
  setup({ content }) {
    content.skills = {
      [OB]: { id: OB, name: 'Omega Blade', kind: 'damage', target: 'enemy', shape: 'single', power: 712, range: 64, castMs: 900, cooldownMs: 20000 },
      [IS]: { id: IS, name: 'Invincible Sword', kind: 'damage', target: 'enemy', shape: 'circle', radius: 56, power: 282, range: 112, castMs: 600, cooldownMs: 6000 },
      [PG]: { id: PG, name: 'Paladin Guard', kind: 'buff', target: 'self', shape: 'single', power: 0, range: 32, castMs: 0, cooldownMs: 30000 },
    };
    content.digimon.armageddemon = { name: 'Armageddemon', radius: 7, skills: [] };
    content.tamers = { davis: { id: 'davis', name: 'Davis', skill: { id: 'tamer.miracles', name: 'Digi-Egg of Miracles', scope: 'self', cooldownMs: 150000, resetCooldowns: true } } };
  } });
W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', tamerAuto: true }));
const me = W.store.getState().me;
const perf = () => W.w.performance.now();
W.store.setState({ me: { ...me, tamerId: 'davis', hotbar: ['cmd:attack', 'skill:0', 'skill:1', 'skill:2'], partner: { ...me.partner, species: 'imperialdramon_paladin', ds: 9000, maxDs: 9000,
  skills: [{ id: OB, name: 'Omega Blade', dsCost: 1050, cooldownMs: 20000, castMs: 900, unlocked: true }, { id: IS, name: 'Invincible Sword', dsCost: 370, cooldownMs: 6000, castMs: 600, unlocked: true }, { id: PG, name: 'Paladin Guard', dsCost: 600, cooldownMs: 30000, castMs: 0, unlocked: true }] } },
  target: { id: 'boss:1', kind: 'mob', name: 'Armageddemon', level: 99, hp: 800000, maxHp: 900000, flags: 24 },
  cooldowns: { 'skill:1': { end: perf() + 60000 }, 'skill:2': { end: perf() + 60000 } } });
const calls = [];
W.w.dmo.game.scene.getScene('world').deps.commands.tamerSkill = () => calls.push(Date.now());
W.w.eval(script);
const results = [];
const check = (name, ok, info) => { results.push(ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };
(async () => {
  await wait(1200);
  W.w.document.querySelector('[data-act="bot"]').click();
  await wait(1500);
  // Omega Blade bereit halten (Bot würde es drücken – Abklingzeit sofort wieder auf 0 setzen)
  for (let i = 0; i < 10; i++) { W.store.setState({ cooldowns: { 'skill:0': { end: perf() - 1 }, 'skill:1': { end: perf() + 60000 }, 'skill:2': { end: perf() + 60000 } } }); await wait(200); }
  check('A: Omega Blade bereit – Davis wartet', calls.length === 0, `${calls.length} Aufrufe · ${W.status()}`);
  W.store.setState({ cooldowns: { 'skill:0': { end: perf() + 15000 }, 'skill:1': { end: perf() + 4000 }, 'skill:2': { end: perf() + 60000 } } });
  await wait(1500);
  check('B: Omega Blade 15 s, Invincible Sword 4 s – Davis gezündet', calls.length === 1, `${calls.length} Aufrufe · ${W.status()}`);
  console.log(results.every(Boolean) ? 'ALLES OK' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
