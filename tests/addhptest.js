// 2.49.1: Feld-Adds erst ab der HP-Schwelle des Bosses (atHp) und nahe am Boss – live: Arukenimon ruft Golemon erst ab
// 50 %, aber jeder normale Golemon in Tower Forest galt auf dem Weg schon als Add.
// A: Boss bei 100 % -> Pumpkinmon daneben ist kein Add, der Boss zuerst. B: Boss bei 40 % -> „Adds zuerst“.
// 2.52.4: C (Puppetmon live): normale Pumpkinmon Lv 50 stehen schon da, der Boss fällt unter 66 % und ruft einen Add ->
// nur der neu erschienene ist ein Add, die normalen nicht.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(bossHp, wave = false) {
  const G = makeWorld({ slot: 0, tag: 'H', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.digimon.puppetmon = { name: 'Puppetmon' }; content.digimon.pumpkinmon = { name: 'Pumpkinmon' };
      content.spawns.native_forest.bosses = [{ species: 'puppetmon', at: 'boss_p', level: 3, respawnMs: 900000, adds: { species: 'pumpkinmon', count: 2, atHp: [wave ? 0.66 : 0.5], ...(wave ? { level: 50 } : {}) } }];
      MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'boss_p', x: 450, y: 330 });
    },
    extraEnts: () => [
      { id: 'b:1', kind: 2, defId: 'puppetmon', x: 450, y: 330, hp: bossHp, maxHp: 100000, level: 3, flags: 16 | 32, targetId: 'p:me' },
      { id: 'a:1', kind: 2, defId: 'pumpkinmon', x: 380, y: 360, hp: 300, maxHp: 300, level: wave ? 50 : 3, flags: 32, targetId: '' },
    ] });
  G.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20 }));
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  const seq = [], st = new Set();
  if (wave) { // Boss fällt unter 66 %, eine Sekunde später erscheint der echte Add am Boss
    await wait(1500); G.ents.get('b:1').hp = 60000; await wait(800);
    G.ents.set('a:2', { id: 'a:2', kind: 2, defId: 'pumpkinmon', x: 470, y: 340, hp: 300, maxHp: 300, level: 50, flags: 32, targetId: '' });
    G.store.setState({ target: null });
  }
  for (let i = 0; i < 20; i++) { const id = G.store.getState().target?.id || '-'; if (seq[seq.length - 1] !== id) seq.push(id); st.add(G.status()); await wait(150); }
  G.w.close();
  return { first: seq.filter((x) => x !== '-')[0], addsFirst: [...st].some((s) => /Adds zuerst/.test(s)), seq: seq.join(' > ') };
}
(async () => {
  const a = await run(100000), b = await run(40000), c = await run(100000, true);
  console.log({ a, b, c });
  const ok = a.first === 'b:1' && !a.addsFirst && b.first === 'a:1' && c.seq.includes('a:2') && !c.seq.includes('a:1');
  console.log(ok ? 'OK – Adds erst ab der HP-Schwelle des Bosses' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
