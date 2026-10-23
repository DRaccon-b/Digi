// 2.13.0: Key of Hope – zwei ClavisAngemon in einer Gruppe blocken große Raid-Angriffe abwechselnd
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const KOH = 'clavisangemon.key_of_hope';
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'a', char: 'ClavisA' }, { on: true, user: 'b', char: 'ClavisB' }] };
const skills = {
  [KOH]: { id: KOH, name: 'Key of Hope', kind: 'buff', target: 'self', protectionMs: 2000, dsCost: 535, cooldownMs: 45000, castMs: 0 },
  'diaboromon.catastrophe_cannon': { id: 'diaboromon.catastrophe_cannon', name: 'Catastrophe Cannon', shape: 'circle', radius: 64, telegraph: true, hpDamagePct: 240, castMs: 3000, cooldownMs: 24000 },
  'armageddemon.black_rain_storm': { id: 'armageddemon.black_rain_storm', name: 'Black Rain', shape: 'circle', radius: 48, telegraph: true, fixedDamage: 40000, castMs: 4000, cooldownMs: 28000 },
  'armageddemon.black_rain_shell': { id: 'armageddemon.black_rain_shell', name: 'Black Rain', shape: 'circle', radius: 40, hpDamagePct: 240, castMs: 4000, cooldownMs: 28000 },
  'keramon.crazy_giggle': { id: 'keramon.crazy_giggle', name: 'Crazy Giggle', shape: 'single', power: 150, castMs: 500, cooldownMs: 8000 },
};
const wins = [0, 1].map((slot) => {
  const W = makeWorld({ slot, accounts, tag: 'C' + slot, quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'boss:1', kind: 2, defId: 'armageddemon', x: 520, y: 330, hp: 900000, maxHp: 900000, level: 80, flags: 16 }] : []),
    setup({ content }) { content.skills = skills; content.digimon.armageddemon = { name: 'Armageddemon', skills: Object.values(skills).filter((s) => !s.id.startsWith('clavis')) }; } });
  W.handlers = {};
  W.w.dmo.net.on = (name, fn) => { W.handlers[name] = fn; return () => {}; };
  W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc' }));
  const me = W.store.getState().me;
  W.store.setState({ me: { ...me, hotbar: ['cmd:attack', 'skill:0'], partner: { ...me.partner, species: 'clavisangemon', ds: 5000, maxDs: 5000,
    skills: [{ id: KOH, name: 'Key of Hope', dsCost: 535, unlocked: true }] } } });
  W.keys = [];
  W.w.addEventListener('keydown', (e) => { if (e.code === 'Digit2') {
    W.keys.push(Date.now());
    // Server meldet den Cooldown
    W.store.setState({ cooldowns: { ...W.store.getState().cooldowns, 'skill:0': { end: W.w.performance.now() + 45000 } } });
  } }, true);
  W.w.eval(script);
  return W;
});
const results = [];
const check = (name, ok, info) => { results.push(ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };
const cast = (skill) => { for (const W of wins) W.handlers.evs?.([{ t: 'skill', src: 'boss:1', skill, phase: 'cast' }]); };
const presses = () => wins.map((W) => W.keys.length);
const reset = () => { for (const W of wins) { W.keys.length = 0; W.store.setState({ cooldowns: {} }); } };
(async () => {
  await wait(1200);
  wins[0].w.document.querySelector('[data-act="bot"]').click();
  await wait(2500);
  check('Bot läuft in beiden Fenstern', wins.every((W) => /./.test(W.status())), wins.map((W) => W.status()).join(' | '));
  check('Key of Hope wird nicht in der normalen Rotation verbraucht', presses().every((n) => n === 0), presses().join(','));

  // 1) Black Rain (3 s Ansage): genau ein Clavis zündet, und zwar Slot 0, kurz vor dem Einschlag
  const t1 = Date.now();
  cast('diaboromon.catastrophe_cannon');
  await wait(3600);
  const p1 = presses(), at1 = wins[0].keys[0] ? wins[0].keys[0] - t1 : null;
  check('Black Rain: genau ein Clavis (Slot 0) blockt', p1[0] === 1 && p1[1] === 0, `Tasten ${p1.join(',')}`);
  check('Black Rain: gezündet kurz vor dem Einschlag (2,2–3,1 s nach Ansage)', at1 != null && at1 >= 2200 && at1 <= 3100, `${at1} ms`);

  // 2) Slot 0 hat noch Cooldown -> Slot 1 springt ein
  await wait(1500);
  wins[1].store.setState({ cooldowns: {} }); wins[1].keys.length = 0; wins[0].keys.length = 0;
  await wait(1500); // Status mit Cooldown von Slot 0 ist bei Slot 1 angekommen
  cast('diaboromon.catastrophe_cannon');
  await wait(3600);
  const p2 = presses();
  check('Zweiter Black Rain: Slot 0 im Cooldown -> Slot 1 blockt', p2[0] === 0 && p2[1] === 1, `Tasten ${p2.join(',')}`);

  // 3) Storm + Shell gleichzeitig: ein Key of Hope reicht für beide
  reset();
  await wait(1500);
  cast('armageddemon.black_rain_storm'); cast('armageddemon.black_rain_shell');
  await wait(4600);
  const p3 = presses();
  check('Storm + Shell zusammen: nur ein Key of Hope', p3[0] + p3[1] === 1, `Tasten ${p3.join(',')}`);

  // 4) Kleiner Angriff: kein Key of Hope
  reset();
  await wait(1500);
  cast('keramon.crazy_giggle');
  await wait(1500);
  const p4 = presses();
  check('Kleiner Angriff (Crazy Giggle): kein Key of Hope', p4[0] + p4[1] === 0, `Tasten ${p4.join(',')}`);

  console.log(results.every(Boolean) ? 'ALLES OK' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
