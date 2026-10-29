// 3.1.26: Key of Hope auch gegen Black Rain, wenn die Key-Bilanz reicht; Davis als Notfall-Key.
// A: zwei Clavis bereit → Black Rain wird geblockt (ein Key gezündet), die Gruppe weicht nicht aus.
// B: nur ein Key bereit, kein Davis → Black Rain wird ausgewichen, kein Key gezündet.
// C: Catastrophe Cannon (Pflicht), kein Key bereit, ClavisB hat Davis → ClavisB setzt per Tamer-Skill zurück.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const KOH = 'clavisangemon.key_of_hope', BR = 'armageddemon.black_rain', CC = 'diaboromon.catastrophe_cannon';
const skills = {
  [KOH]: { id: KOH, name: 'Key of Hope', kind: 'buff', target: 'self', protectionMs: 2000, radius: 128, dsCost: 535, cooldownMs: 45000, castMs: 0 },
  [BR]: { id: BR, name: 'Black Rain', shape: 'circle', radius: 64, telegraph: true, fixedDamage: 52000, castMs: 3000, cooldownMs: 24000 },
  [CC]: { id: CC, name: 'Catastrophe Cannon', shape: 'circle', radius: 64, telegraph: true, hpDamagePct: 240, castMs: 3000, cooldownMs: 32000, share: { target: 'rotate' } },
};
async function scenario(variant) {
  const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'a', char: 'ClavisA' }, { on: true, user: 'b', char: 'ClavisB' }, { on: true, user: 'c', char: 'Imperial' }] };
  const wins = [0, 1, 2].map((slot) => {
    const W = makeWorld({ slot, accounts, tag: 'K' + variant + slot, quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
      extraEnts: (id) => (id === 'native_forest' ? [{ id: 'boss:1', kind: 2, defId: 'armageddemon', x: 470, y: 330, hp: 900000, maxHp: 900000, level: 80, flags: 16 | 8 }] : []),
      setup({ content }) {
        content.skills = skills; content.digimon.armageddemon = { name: 'Armageddemon', radius: 7, skills: [skills[BR], skills[CC]] };
        if (variant === 'C' || variant === 'D') content.spawns.native_forest.raid = { id: 'test_raid', party: { min: 1, max: 5 }, deathLimit: 3 }; // Davis-Notfall gilt im Dungeon/Raid
        content.tamers = { davis: { id: 'davis', name: 'Davis', skill: { id: 'tamer.miracles', name: 'Digi-Egg of Miracles', scope: 'self', cooldownMs: 150000, resetCooldowns: true } } };
      } });
    W.handlers = {};
    W.w.dmo.net.on = (name, fn) => { W.handlers[name] = fn; return () => {}; };
    W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc', dodge: true, kohMore: true, tamerAuto: true }));
    const me = W.store.getState().me;
    const clavis = slot < 2;
    const kohCd = variant === 'A' ? 0 : variant === 'B' ? (slot === 1 ? 40000 : 0) : variant === 'D' ? (slot === 0 ? 40000 : 30000) : 40000; // B: nur ClavisA bereit; C/D: keiner
    W.store.setState({ me: { ...me, tamerId: (variant === 'C' && slot === 1) || (variant === 'D' && slot < 2) ? 'davis' : undefined, hotbar: ['cmd:attack', clavis ? 'skill:0' : null],
      partner: { ...me.partner, species: clavis ? 'clavisangemon' : 'imperialdramon', ds: 5000, maxDs: 5000, skills: clavis ? [{ id: KOH, name: 'Key of Hope', dsCost: 535, unlocked: true }] : [] } },
      cooldowns: clavis && kohCd ? { 'skill:0': { end: W.w.performance.now() + kohCd } } : {} });
    W.keys = []; W.taps = []; W.davis = [];
    W.w.addEventListener('keydown', (e) => { if (e.code === 'Digit2') W.keys.push(Date.now()); }, true);
    const sc = W.w.dmo.game.scene.getScene('world');
    sc.deps.commands.tamerSkill = () => W.davis.push(Date.now());
    W.w.eval(script);
    return W;
  });
  await wait(1200);
  wins[0].w.document.querySelector('[data-act="bot"]').click();
  await wait(2500);
  for (const W of wins) for (const id of [...W.ents.keys()]) if (id.startsWith('m:')) W.ents.delete(id);
  // alle eng am Boss (Nahkampf), wie live
  const spots = [[430, 330], [440, 345], [445, 315]];
  wins.forEach((W, i) => { const t = W.ents.get('t:me'), p = W.ents.get('p:me'); t.x = spots[i][0] + 6; t.y = spots[i][1]; p.x = spots[i][0]; p.y = spots[i][1]; });
  await wait(800);
  const sid = variant === 'C' || variant === 'D' ? CC : BR;
  for (const W of wins) {
    W.handlers.evs?.([{ t: 'skill', src: 'boss:1', skill: sid, phase: 'cast' }]);
    const sc = W.w.dmo.game.scene.getScene('world'), end = W.w.performance.now() + 3000;
    if (sid === BR) { const circles = wins.map((V) => { const p = V.ents.get('p:me'); return { x: p.x, y: p.y, r: 64, skill: { id: BR }, src: 'boss:1', end }; }); sc.telegraphs = { active: circles.map((c) => ({ x: c.x, y: c.y, r: c.r, skill: BR })), circles, marksActive: [] }; /* wie im Spiel: active.skill = ID, circles.skill = Objekt */ }
    W.statuses = new Set();
  }
  const pos0 = wins.map((W) => { const p = W.ents.get('p:me'); return [p.x, p.y]; });
  const castAt = Date.now();
  for (let i = 0; i < 16; i++) { await wait(200); if (Date.now() - castAt > 3050) for (const W of wins) { const sc = W.w.dmo.game.scene.getScene('world'); sc.telegraphs = { active: [], circles: [], marksActive: [] }; } /* wie im Spiel: Warnkreise verschwinden beim Einschlag */ for (const W of wins) W.statuses.add(W.status().slice(0, 44)); }
  const moved = wins.map((W, i) => { const p = W.ents.get('p:me'); return Math.round(Math.hypot(p.x - pos0[i][0], p.y - pos0[i][1])); });
  const out = { variant, keys: wins.map((W) => W.keys.length), davis: wins.map((W) => W.davis.length), moved, statuses: wins.map((W) => [...W.statuses].filter((x) => /Weiche|Key of Hope|Davis|Warte/.test(x)).slice(0, 4)) };
  for (const W of wins) W.w.close();
  return out;
}
(async () => {
  const A = await scenario('A'), B = await scenario('B'), C = await scenario('C'), D = await scenario('D');
  console.log(JSON.stringify(A), '\n', JSON.stringify(B), '\n', JSON.stringify(C));
  const dodged = (r) => r.statuses.some((l) => l.some((x) => /Weiche/.test(x)));
  const okA = A.keys.reduce((a, b) => a + b, 0) >= 1 && !dodged(A);
  const okB = B.keys.reduce((a, b) => a + b, 0) === 0 && dodged(B);
  const okC = C.davis[1] >= 1 && C.davis[0] === 0;
  console.log(okA ? 'OK     A: zwei Keys bereit – Black Rain geblockt, niemand weicht aus' : 'FEHLER A');
  console.log(okB ? 'OK     B: ein Key, kein Davis – Black Rain ausgewichen, kein Key verbraucht' : 'FEHLER B');
  console.log(okC ? 'OK     C: kein Key bereit – der Davis-Clavis setzt zurück' : 'FEHLER C');
  const okD = D.davis[0] >= 1 && D.davis[1] === 0; // zwei Davis-Clavis: nur der mit dem längsten Key-Rest (ClavisA, 40 s)
  console.log(okD ? 'OK     D: zwei Davis-Clavis – nur der mit dem längsten Key-Rest setzt zurück' : 'FEHLER D');
  process.exit(okA && okB && okC && okD ? 0 : 1);
})();
