// 2.36.2: Geteilte Treffer (Black-Rain-Hülle, Catastrophe Cannon) folgen einem Spieler – Key of Hope deckt sie auch,
// wenn der Boss weit weg ist (Probelauf: bei den Kuramon-Clustern > 700 px vom Boss, niemand sammelte sich, 2 Stürze).
// Andere Block-Treffer gelten weiter nur in der Nähe des Bosses.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const KOH = 'clavisangemon.key_of_hope';
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'a', char: 'ClavisA' }] };
const skills = {
  [KOH]: { id: KOH, name: 'Key of Hope', kind: 'buff', target: 'self', protectionMs: 2000, dsCost: 535, cooldownMs: 45000, castMs: 0 },
  'armageddemon.black_rain_shell': { id: 'armageddemon.black_rain_shell', name: 'Black Rain', shape: 'circle', radius: 40, hpDamagePct: 240, castMs: 3000, cooldownMs: 28000 },
  'infermon.cocoon_ram': { id: 'infermon.cocoon_ram', name: 'Cocoon Ram', shape: 'line', radius: 30, fixedDamage: 50000, castMs: 3000, cooldownMs: 20000 },
};
const W = makeWorld({ slot: 0, accounts, tag: 'R', quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
  extraEnts: (id) => (id === 'native_forest' ? [{ id: 'boss:1', kind: 2, defId: 'armageddemon', x: 1600, y: 330, hp: 900000, maxHp: 900000, level: 80, flags: 16 }] : []),
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
  W.store.setState({ cooldowns: { ...W.store.getState().cooldowns, 'skill:0': { end: W.w.performance.now() + 45000 } } });
} }, true);
W.w.eval(script);
const results = [];
const check = (name, ok, info) => { results.push(ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };
const cast = (skill) => W.handlers.evs?.([{ t: 'skill', src: 'boss:1', skill, phase: 'cast' }]);
(async () => {
  await wait(1200);
  W.w.document.querySelector('[data-act="bot"]').click();
  await wait(2000);
  const p = W.ents.get('p:me'), b = W.ents.get('boss:1');
  const d = Math.round(Math.hypot(b.x - p.x, b.y - p.y));
  // 1) Nicht geteilter Block-Treffer eines fernen Bosses: kein Key of Hope
  cast('infermon.cocoon_ram');
  await wait(3600);
  check(`Ferner Boss (${d} px), nicht geteilt: kein Key of Hope`, W.keys.length === 0, W.keys.length);
  // 2) Geteilter Treffer (Hülle) eines fernen Bosses: Key of Hope kurz vor dem Einschlag
  const t0 = Date.now();
  cast('armageddemon.black_rain_shell');
  await wait(3600);
  const at = W.keys[0] ? W.keys[0] - t0 : null;
  check(`Ferner Boss (${d} px), Black-Rain-Hülle: Key of Hope`, W.keys.length === 1 && at >= 2000 && at <= 3100, `${W.keys.length}× bei ${at} ms`);
  console.log(results.every(Boolean) ? 'ALLES OK' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
