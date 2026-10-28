// 3.1.24: Gankoomon (Mega-Jagd) ruft bei 50 % und 25 % drei Hinukamuy, die ihn schützen. A: Hinukamuy leben → der Bot wählt
// einen Hinukamuy, nicht den Boss. B: keine Hinukamuy → Boss. C: ein anderer Boss mit Hinukamuy daneben → keine Sonderregel.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(variant) {
  const bossSp = variant === 'C' ? 'puppetmon' : 'gankoomon_hunt';
  const G = makeWorld({ slot: 0, tag: 'G' + variant, noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) { content.digimon.gankoomon_hunt = { name: 'Gankoomon' }; content.digimon.hinukamuy = { name: 'Hinukamuy' }; content.digimon.puppetmon = { name: 'Puppetmon' }; },
    extraEnts: () => [
      { id: 'b:1', kind: 2, defId: bossSp, x: 450, y: 330, hp: 4200000, maxHp: 8556880, level: 3, flags: 16 | 8, targetId: 'p:me' },
      ...(variant === 'B' ? [] : [
        { id: 'h:1', kind: 2, defId: 'hinukamuy', x: 500, y: 330, hp: 427844, maxHp: 427844, level: 3, flags: 32, targetId: 'p:me' },
        { id: 'h:2', kind: 2, defId: 'hinukamuy', x: 420, y: 380, hp: 300000, maxHp: 427844, level: 3, flags: 32, targetId: 'p:me' },
      ]),
    ] });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20 }));
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  const seq = [];
  for (let i = 0; i < 16; i++) { const id = G.store.getState().target?.id || '-'; if (seq[seq.length - 1] !== id) seq.push(id); await wait(150); }
  G.w.close();
  return { variant, seq: seq.join(' > '), first: seq.filter((x) => x !== '-')[0] };
}
(async () => {
  const A = await run('A'), B = await run('B'), C = await run('C');
  console.log(A, B, C);
  const okA = A.first === 'h:2', okB = B.first === 'b:1', okC = C.first !== 'h:2';
  console.log(okA ? 'OK     A: Hinukamuy zuerst (der angeschlagenste)' : 'FEHLER A');
  console.log(okB ? 'OK     B: ohne Hinukamuy der Boss' : 'FEHLER B');
  console.log(okC ? 'OK     C: anderer Boss – keine Sonderregel' : 'FEHLER C');
  process.exit(okA && okB && okC ? 0 : 1);
})();
