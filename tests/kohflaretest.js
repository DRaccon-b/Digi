// 2.36.1: Ultimate Flare weicht man aus (kein Key of Hope dafür), und beim Sammeln für einen Block wird einer Attacke
// ausgewichen, die VOR dem Zünden einschlägt (der Schutz deckt sie nicht) – Probelauf Raum 4: Flare 1–2 s vor der
// Black-Rain-Hülle traf die gesammelte Gruppe
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const KOH = 'clavisangemon.key_of_hope';
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'a', char: 'ClavisA' }, { on: true, user: 'b', char: 'ClavisB' }] };
const skills = {
  [KOH]: { id: KOH, name: 'Key of Hope', kind: 'buff', target: 'self', protectionMs: 2000, dsCost: 535, cooldownMs: 45000, castMs: 0 },
  'armageddemon.ultimate_flare': { id: 'armageddemon.ultimate_flare', name: 'Ultimate Flare', shape: 'line', radius: 20, range: 360, telegraph: true, fixedDamage: 60000, castMs: 2800, cooldownMs: 24000 },
  'armageddemon.black_rain_shell': { id: 'armageddemon.black_rain_shell', name: 'Black Rain', shape: 'circle', radius: 40, hpDamagePct: 240, castMs: 4000, cooldownMs: 28000 },
};
const wins = [0, 1].map((slot) => {
  const W = makeWorld({ slot, accounts, tag: 'F' + slot, quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'boss:1', kind: 2, defId: 'armageddemon', x: 520, y: 330, hp: 900000, maxHp: 900000, level: 80, flags: 16 }] : []),
    setup({ content }) { content.skills = skills; content.digimon.armageddemon = { name: 'Armageddemon', skills: Object.values(skills).filter((s) => !s.id.startsWith('clavis')) }; } });
  W.handlers = {};
  W.w.dmo.net.on = (name, fn) => { W.handlers[name] = fn; return () => {}; };
  W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc', dodge: true }));
  const me = W.store.getState().me;
  W.store.setState({ me: { ...me, hotbar: ['cmd:attack', 'skill:0'], partner: { ...me.partner, species: 'clavisangemon', ds: 5000, maxDs: 5000,
    skills: [{ id: KOH, name: 'Key of Hope', dsCost: 535, unlocked: true }] } } });
  W.keys = [];
  W.w.addEventListener('keydown', (e) => { if (e.code === 'Digit2') W.keys.push(Date.now()); }, true);
  W.w.eval(script);
  return W;
});
const results = [];
const check = (name, ok, info) => { results.push(ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };
const cast = (skill) => { for (const W of wins) W.handlers.evs?.([{ t: 'skill', src: 'boss:1', skill, phase: 'cast' }]); };
(async () => {
  await wait(1200);
  wins[0].w.document.querySelector('[data-act="bot"]').click();
  await wait(2500);
  for (const W of wins) for (const id of [...W.ents.keys()]) if (id.startsWith('m:')) W.ents.delete(id);
  // 1) Ultimate Flare allein: ausweichen, kein Key of Hope
  cast('armageddemon.ultimate_flare');
  await wait(3300);
  check('Ultimate Flare allein: kein Key of Hope', wins.every((W) => W.keys.length === 0), wins.map((W) => W.keys.length).join(','));
  await wait(1500);
  // 2) Black-Rain-Hülle (4 s) + Flare-Strahl über Clavis B, der 1,2 s VOR der Hülle einschlägt (vor dem Zünden)
  const a = wins[0].ents.get('p:me'), B = wins[1];
  const bt = B.ents.get('t:me'), bp = B.ents.get('p:me');
  bp.x = a.x + 60; bp.y = a.y; bt.x = a.x + 70; bt.y = a.y + 10;
  await wait(400);
  cast('armageddemon.black_rain_shell');
  const sc = B.w.dmo.game.scene.getScene('world');
  sc.mechB = { lines: [{ src: 'boss:1', fx: bp.x - 150, fy: bp.y, tx: bp.x + 150, ty: bp.y, r: 60, end: B.w.performance.now() + 2800, skill: {} }] };
  B.handlers.evs?.([{ t: 'skill', src: 'boss:1', skill: 'armageddemon.ultimate_flare', phase: 'cast' }]);
  await wait(2600); // in den letzten 2 s vor der Hülle (1,4 s), 0,2 s vor der Flare
  const sB = B.status();
  check('Sammeln: Clavis B weicht der Flare aus (schlägt vor dem Zünden ein)', /Weiche/.test(sB), sB);
  await wait(2200);
  check('Hülle: genau ein Key of Hope (Anker)', wins[0].keys.length === 1 && wins[1].keys.length === 0, wins.map((W) => W.keys.length).join(','));
  console.log(results.every(Boolean) ? 'ALLES OK' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
