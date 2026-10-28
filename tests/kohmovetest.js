// 3.1.17: Key of Hope – im Schutzkreis (128 px) darf das Digimon ans Ziel laufen und angreifen, solange sein Haltepunkt im
// Kreis bleibt (Ziel höchstens Radius − 28 + Schlagweite vom Anker). Live 28.10.: Bauzel stand 41 s untätig im Kreis, weil
// nur „Ziel schon in Schlagweite“ zählte. Negativ: Ziel 220 px vom Anker → kein Angriff (Haltepunkt läge außerhalb).
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const KOH = 'clavisangemon.key_of_hope';
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'a', char: 'ClavisA' }, { on: true, user: 'b', char: 'ClavisB' }, { on: true, user: 'c', char: 'Imperial' }] };
const skills = {
  [KOH]: { id: KOH, name: 'Key of Hope', kind: 'buff', target: 'self', protectionMs: 2000, radius: 128, dsCost: 535, cooldownMs: 45000, castMs: 0 },
  'diaboromon.catastrophe_cannon': { id: 'diaboromon.catastrophe_cannon', name: 'Catastrophe Cannon', shape: 'circle', radius: 64, telegraph: true, hpDamagePct: 240, castMs: 8000, cooldownMs: 24000 },
};
const wins = [0, 1, 2].map((slot) => {
  const W = makeWorld({ slot, accounts, tag: 'M' + slot, quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'boss:1', kind: 2, defId: 'armageddemon', x: 900, y: 900, hp: 900000, maxHp: 900000, level: 80, flags: 16 }] : []),
    setup({ content }) { content.skills = skills; content.digimon.armageddemon = { name: 'Armageddemon', radius: 7, skills: [skills['diaboromon.catastrophe_cannon']] }; content.digimon.imperialdramon = { ...(content.digimon.imperialdramon || {}), name: 'Imperialdramon', basic: { range: 36 } }; } });
  W.handlers = {};
  W.w.dmo.net.on = (name, fn) => { W.handlers[name] = fn; return () => {}; };
  W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc' }));
  const me = W.store.getState().me;
  const clavis = slot < 2;
  W.store.setState({ me: { ...me, hotbar: ['cmd:attack', clavis ? 'skill:0' : null], partner: { ...me.partner, species: clavis ? 'clavisangemon' : 'imperialdramon', ds: 5000, maxDs: 5000,
    skills: clavis ? [{ id: KOH, name: 'Key of Hope', dsCost: 535, unlocked: true }] : [] } } });
  W.keys = []; W.atk = [];
  W.w.addEventListener('keydown', (e) => { if (e.code === 'Digit2') W.keys.push(Date.now()); if (e.code === 'Digit1') W.atk.push(Date.now()); }, true);
  W.w.eval(script);
  return W;
});
const results = [];
const check = (name, ok, info) => { results.push(ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };
const pos = (W, id) => { const e = W.ents.get(id); return { x: Math.round(e.x), y: Math.round(e.y) }; };
const dist = (a, b) => Math.round(Math.hypot(a.x - b.x, a.y - b.y));
(async () => {
  await wait(1200);
  wins[0].w.document.querySelector('[data-act="bot"]').click();
  await wait(2500);
  for (const W of wins) for (const id of [...W.ents.keys()]) if (id.startsWith('m:')) W.ents.delete(id);
  for (const W of wins.slice(1)) { const t = W.ents.get('t:me'), p = W.ents.get('p:me'); t.x = 150; t.y = 330; p.x = 160; p.y = 330; }
  await wait(600);
  const anchor = pos(wins[0], 'p:me');
  // Boss weit vom Anker (220 px): Haltepunkt läge außerhalb des Kreises
  for (const W of wins) { const b = W.ents.get('boss:1'); b.x = anchor.x + 220; b.y = anchor.y; }
  const T = Date.now();
  for (const W of wins) W.handlers.evs?.([{ t: 'skill', src: 'boss:1', skill: 'diaboromon.catastrophe_cannon', phase: 'cast' }]);
  await wait(6200); // Sammeln beginnt 2 s vor dem Einschlag (T + 6 s)
  check('Imperialdramon läuft zum Anker', /Schutzkreis von ClavisA/.test(wins[2].status()), wins[2].status());
  wins[2].store.setState({ target: { id: 'boss:1', kind: 'mob', name: 'Armageddemon', level: 80, hp: 900000, maxHp: 900000 } });
  await wait(900);
  const dI = dist(pos(wins[2], 'p:me'), anchor);
  check('Imperialdramon im Schutzkreis', /im Schutzkreis von ClavisA/.test(wins[2].status()) && dI < 128, `${dI} px · ${wins[2].status()}`);
  check('Ziel 220 px vom Anker: kein Angriff', !/greife an/.test(wins[2].status()), wins[2].status());
  const atk0 = wins[2].atk.length;
  // Boss auf 125 px an den Anker: Haltepunkt (Schlagweite 43) liegt bei ~82 px – im Kreis → angreifen
  for (const W of wins) { const b = W.ents.get('boss:1'); b.x = anchor.x + 125; b.y = anchor.y; }
  await wait(700);
  check('Ziel 125 px vom Anker: greift aus dem Schutzkreis an', /im Schutzkreis von ClavisA · greife an/.test(wins[2].status()), wins[2].status());
  check('Angriffstaste gedrückt', wins[2].atk.length > atk0, `${wins[2].atk.length - atk0} Tastendrücke, ${Math.round((Date.now() - T) / 100) / 10} s nach der Ansage`);
  console.log(results.every(Boolean) ? 'ALLES OK' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
