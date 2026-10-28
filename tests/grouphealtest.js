// 3.1.0: Dungeon/Raid – Key of Hope ist immer an (Haken aus) und der Heilskill der Clavis (Sacred Seal) läuft reihum:
// Sobald ein Partner der Party in Reichweite unter 85 % ist, heilt die Clavis mit der kleinsten Slot-Nummer, die andere
// erst nach der Deckungszeit (2,5 s), wenn dann noch jemand verletzt ist. Außerhalb von Dungeon/Raid: normale Rotation.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const KOH = 'clavisangemon.key_of_hope', SEAL = 'clavisangemon.sacred_seal';
const accounts = { leader: 0, popup: true, dungeon: true, list: [{ on: true, user: 'a', char: 'ClavisA' }, { on: true, user: 'b', char: 'ClavisB' }, { on: true, user: 'c', char: 'Imperial' }] };
const skills = {
  [SEAL]: { id: SEAL, name: 'Sacred Seal', kind: 'heal', target: 'ally', shape: 'circle', radius: 96, power: 870, dsCost: 535, cooldownMs: 18000, castMs: 300, range: 128 },
  [KOH]: { id: KOH, name: 'Key of Hope', kind: 'buff', target: 'self', protectionMs: 2000, dsCost: 535, cooldownMs: 45000, castMs: 0 },
  'diaboromon.catastrophe_cannon': { id: 'diaboromon.catastrophe_cannon', name: 'Catastrophe Cannon', shape: 'circle', radius: 64, telegraph: true, hpDamagePct: 240, castMs: 3000, cooldownMs: 24000 },
};
const party = { id: 'party1', members: [0, 1, 2].map((x) => ({ charId: 'c' + x, name: accounts.list[x].char, partnerEntityId: x === 2 ? 'p:imp' : 'p:cl' + x })) };
const wins = [0, 1, 2].map((slot) => {
  const W = makeWorld({ slot, accounts, tag: 'S' + slot, quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    // Partner der anderen stehen neben dem eigenen; der Imperialdramon-Partner ist angeschlagen (50 %)
    extraEnts: (id) => (id === 'native_forest' ? [
      { id: 'boss:1', kind: 2, defId: 'armageddemon', x: 520, y: 330, hp: 900000, maxHp: 900000, level: 80, flags: 16 },
      ...[0, 1, 2].filter((x) => x !== slot).map((x) => ({ id: party.members[x].partnerEntityId, kind: 1, x: 420 + x * 20, y: 340, hp: x === 2 ? 1500 : 3000, maxHp: 3000, flags: 0, targetId: '' }))] : []),
    setup({ content }) { content.skills = skills; content.digimon.armageddemon = { name: 'Armageddemon', skills: [skills['diaboromon.catastrophe_cannon']] }; } });
  W.handlers = {};
  W.w.dmo.net.on = (name, fn) => { W.handlers[name] = fn; return () => {}; };
  // Dungeon an, Key of Hope AUS, alle Skill-Haken aus – im Dungeon muss beides trotzdem laufen
  W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, dungeon: true, koh: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc',
    skillSets: { clavisangemon: { skills: { 2: false, 3: false, 4: false, 5: false, 6: false }, heal: {} } } }));
  const me = W.store.getState().me;
  const clavis = slot < 2;
  W.store.setState({ party: { ...party, members: party.members.map((m, x) => ({ ...m, me: x === slot })) },
    me: { ...me, hotbar: ['cmd:attack', clavis ? 'skill:0' : null, clavis ? 'skill:1' : null], partner: { ...me.partner, entityId: 'p:me', species: clavis ? 'clavisangemon' : 'imperialdramon', ds: 5000, maxDs: 5000,
      hp: slot === 2 ? 1500 : 3000, maxHp: 3000, skills: clavis ? [{ id: SEAL, name: 'Sacred Seal', dsCost: 535, unlocked: true }, { id: KOH, name: 'Key of Hope', dsCost: 535, unlocked: true }] : [] } } });
  W.keys = [];
  W.w.addEventListener('keydown', (e) => { if (e.code === 'Digit2' || e.code === 'Digit3') W.keys.push({ k: e.code, t: Date.now() }); }, true);
  // Tastendruck setzt den Cooldown wie im Spiel
  W.w.addEventListener('keydown', (e) => { const n = e.code === 'Digit2' ? 0 : e.code === 'Digit3' ? 1 : -1; if (n < 0) return; const s = W.store.getState();
    W.store.setState({ cooldowns: { ...s.cooldowns, ['skill:' + n]: { end: W.w.performance.now() + (n === 0 ? 18000 : 45000) } } }); }, true);
  W.w.eval(script);
  return W;
});
const results = [];
const check = (name, ok, info) => { results.push(ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };
const seals = (W) => W.keys.filter((k) => k.k === 'Digit2').length, kohs = (W) => W.keys.filter((k) => k.k === 'Digit3').length;
(async () => {
  await wait(1200);
  for (const W of wins) for (const id of [...W.ents.keys()]) if (id.startsWith('m:')) W.ents.delete(id);
  wins[0].w.document.querySelector('[data-act="bot"]').click();
  await wait(2000);
  check('ClavisA (kleinste Nummer) heilt zuerst', seals(wins[0]) === 1, `A ${seals(wins[0])}, B ${seals(wins[1])}`);
  check('ClavisB wartet (Deckungszeit)', seals(wins[1]) === 0, `B ${seals(wins[1])}`);
  await wait(2800);
  check('Imperial weiter verletzt: ClavisB heilt als Nächste, A noch im Cooldown', seals(wins[1]) === 1 && seals(wins[0]) === 1, `A ${seals(wins[0])}, B ${seals(wins[1])}`);
  // Alle gesund: keine weitere Heilung, auch wenn die Cooldowns ablaufen
  for (const W of wins) { const e = W.ents.get('p:imp'); if (e) e.hp = 3000; const s = W.store.getState(); W.store.setState({ cooldowns: {}, me: { ...s.me, partner: { ...s.me.partner, hp: 3000 } } }); }
  await wait(1500);
  check('Alle gesund: keine Heilung', seals(wins[0]) === 1 && seals(wins[1]) === 1, `A ${seals(wins[0])}, B ${seals(wins[1])}`);
  // Key of Hope trotz Haken aus: Boss sagt Catastrophe Cannon an
  for (const W of wins) W.handlers.evs?.([{ t: 'skill', src: 'boss:1', skill: 'diaboromon.catastrophe_cannon', phase: 'cast' }]);
  await wait(3500);
  check('Key of Hope trotz Haken aus gezündet (eine Clavis)', kohs(wins[0]) + kohs(wins[1]) === 1, `A ${kohs(wins[0])}, B ${kohs(wins[1])}`);
  console.log(results.every(Boolean) ? 'ALLES OK' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
