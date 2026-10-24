// 2.53.0: Key of Hope – ClavisA (vorne in der Reihenfolge) hat zu wenig DS und kann nicht zünden. Vorher meldete er sich
// trotzdem als bereit: ClavisB wartete auf ihn, niemand sammelte sich, niemand zündete. Jetzt übernimmt ClavisB.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const KOH = 'clavisangemon.key_of_hope';
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'a', char: 'ClavisA' }, { on: true, user: 'b', char: 'ClavisB' }, { on: true, user: 'c', char: 'Imperial' }] };
const skills = {
  [KOH]: { id: KOH, name: 'Key of Hope', kind: 'buff', target: 'self', protectionMs: 2000, dsCost: 535, cooldownMs: 45000, castMs: 0 },
  'diaboromon.catastrophe_cannon': { id: 'diaboromon.catastrophe_cannon', name: 'Catastrophe Cannon', shape: 'circle', radius: 64, telegraph: true, hpDamagePct: 240, castMs: 3000, cooldownMs: 24000 },
};
const wins = [0, 1, 2].map((slot) => {
  const W = makeWorld({ slot, accounts, tag: 'S' + slot, quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'boss:1', kind: 2, defId: 'armageddemon', x: 520, y: 330, hp: 900000, maxHp: 900000, level: 80, flags: 16 }] : []),
    setup({ content }) { content.skills = skills; content.digimon.armageddemon = { name: 'Armageddemon', skills: [skills['diaboromon.catastrophe_cannon']] }; } });
  W.handlers = {};
  W.w.dmo.net.on = (name, fn) => { W.handlers[name] = fn; return () => {}; };
  W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc' }));
  const me = W.store.getState().me;
  const clavis = slot < 2;
  W.store.setState({ me: { ...me, hotbar: ['cmd:attack', clavis ? 'skill:0' : null], partner: { ...me.partner, species: clavis ? 'clavisangemon' : 'imperialdramon', ds: slot === 0 ? 100 : 5000, maxDs: 5000,
    skills: clavis ? [{ id: KOH, name: 'Key of Hope', dsCost: 535, unlocked: true }] : [] } } });
  W.keys = [];
  W.w.addEventListener('keydown', (e) => { if (e.code === 'Digit2') W.keys.push(Date.now()); }, true);
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
  // die anderen stehen weit weg, Monster sind aus dem Weg
  for (const W of wins) for (const id of [...W.ents.keys()]) if (id.startsWith('m:')) W.ents.delete(id);
  for (const W of wins.slice(1)) { const t = W.ents.get('t:me'), p = W.ents.get('p:me'); t.x = 150; t.y = 330; p.x = 160; p.y = 330; }
  await wait(600);
  const anchor = pos(wins[1], 'p:me');
  for (const W of wins) W.handlers.evs?.([{ t: 'skill', src: 'boss:1', skill: 'diaboromon.catastrophe_cannon', phase: 'cast' }]);
  await wait(900);
  check('ClavisB (genug DS) hält Position', /halte Position/.test(wins[1].status()), wins[1].status());
  check('Imperialdramon läuft zu ClavisB', /Schutzkreis von ClavisB/.test(wins[2].status()), wins[2].status());
  await wait(1500);
  const dI = dist(pos(wins[2], 'p:me'), anchor);
  check('Vor dem Zünden: Imperialdramon im Schutzkreis von ClavisB (< 128 px)', dI < 128, `${dI} px`);
  await wait(1200);
  check('ClavisB hat Key of Hope gezündet, ClavisA nicht', wins[1].keys.length === 1 && wins[0].keys.length === 0, `${wins[0].keys.length},${wins[1].keys.length}`);
  console.log(results.every(Boolean) ? 'ALLES OK' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
