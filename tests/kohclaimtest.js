// 3.1.6: Key of Hope – eine Beanspruchung zählt erst, wenn der Tastendruck durchging, und gilt nach KOH_CLAIM_MS nur mit
// Skill-Ereignis des Zünders. Live (28.10.): ClavisA beanspruchte, der Druck ging im laufenden Skill verloren, niemand sprang
// ein – ganze Gruppe ungeschützt. Hier: ClavisA ist gerade am Casten (Flag Casting) → ihr Druck wird zurückgehalten, sie
// beansprucht nicht, ClavisB zündet. Zweiter Fall: A drückt, aber das Spiel meldet keinen Cast → B springt nach 450 ms ein.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const KOH = 'clavisangemon.key_of_hope';
const skills = {
  [KOH]: { id: KOH, name: 'Key of Hope', kind: 'buff', target: 'self', protectionMs: 2000, dsCost: 535, cooldownMs: 45000, castMs: 0 },
  'diaboromon.catastrophe_cannon': { id: 'diaboromon.catastrophe_cannon', name: 'Catastrophe Cannon', shape: 'circle', radius: 64, telegraph: true, hpDamagePct: 240, castMs: 3000, cooldownMs: 24000 },
};
async function trial(mode) { // 'casting' = A blockiert, 'noevent' = A drückt, Spiel meldet nichts
  const accounts = { leader: 0, popup: true, dungeon: true, list: [{ on: true, user: 'a', char: 'ClavisA' }, { on: true, user: 'b', char: 'ClavisB' }] };
  const wins = [0, 1].map((slot) => {
    const W = makeWorld({ slot, accounts, tag: mode[0] + slot, quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
      extraEnts: (id) => (id === 'native_forest' ? [{ id: 'boss:1', kind: 2, defId: 'armageddemon', x: 520, y: 330, hp: 900000, maxHp: 900000, level: 80, flags: 16 },
        { id: slot === 0 ? 'p:b' : 'p:a', kind: 1, x: 430, y: 340, hp: 3000, maxHp: 3000, flags: 0, targetId: '' }] : []),
      setup({ content }) { content.skills = skills; content.digimon.armageddemon = { name: 'Armageddemon', skills: [skills['diaboromon.catastrophe_cannon']] }; } });
    W.handlers = {};
    W.w.dmo.net.on = (name, fn) => { W.handlers[name] = fn; return () => {}; };
    W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, dungeon: true, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc' }));
    const me = W.store.getState().me;
    W.store.setState({ me: { ...me, hotbar: ['cmd:attack', 'skill:0'], partner: { ...me.partner, species: 'clavisangemon', ds: 5000, maxDs: 5000, skills: [{ id: KOH, name: 'Key of Hope', dsCost: 535, unlocked: true }] } } });
    W.keys = [];
    W.w.addEventListener('keydown', (e) => { if (e.code === 'Digit2') { W.keys.push(Date.now()); const s = W.store.getState(); W.store.setState({ cooldowns: { ...s.cooldowns, 'skill:0': { end: W.w.performance.now() + 45000 } } }); } }, true); // Druck setzt den Cooldown wie im Spiel
    W.w.eval(script);
    return W;
  });
  await wait(1200);
  wins[0].w.document.querySelector('[data-act="bot"]').click();
  await wait(2000);
  for (const W of wins) for (const id of [...W.ents.keys()]) if (id.startsWith('m:')) W.ents.delete(id);
  if (mode === 'casting') wins[0].ents.get('p:me').flags |= 128; // A castet gerade: Tastendruck wird zurückgehalten
  if (mode === 'noevent') for (const W of wins) W.handlers.evs?.([{ t: 'skill', src: 'p:x', skill: KOH, phase: 'release' }]); // Spiel meldet KoH-Ereignisse (irgendwann schon gesehen)
  for (const W of wins) W.handlers.evs?.([{ t: 'skill', src: 'boss:1', skill: 'diaboromon.catastrophe_cannon', phase: 'cast' }]);
  await wait(3600);
  const r = { mode, a: wins[0].keys.length, b: wins[1].keys.length, gap: wins[0].keys[0] && wins[1].keys[0] ? wins[1].keys[0] - wins[0].keys[0] : null, stA: wins[0].status(), stB: wins[1].status() };
  for (const W of wins) W.w.close();
  return r;
}
(async () => {
  const c = await trial('casting'), n = await trial('noevent');
  console.log(c, n);
  const ok = c.a === 0 && c.b === 1 && n.a === 1 && n.b === 1 && n.gap >= 400;
  console.log(ok ? 'OK – zurückgehaltener Druck beansprucht nicht; unbestätigte Beanspruchung: der nächste springt ein' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
