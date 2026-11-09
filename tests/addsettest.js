// 3.2.16 (Nutzer 09.11.): Einstellungen → Adds – je Boss mit Adds ein Haken „Adds zuerst“.
// A: Pinochimon als Named (Elite-Flag, kein Boss-Flag), Kürbis-Adds schützen ihn (shieldsBoss) – Standard an: Add zuerst.
// B: Boss mit Adds ohne Wirkung (kein Schutz/Stärken/Heilen) – Standard aus: der Boss zuerst.
// C: dieselbe Lage, Haken gesetzt – Add zuerst.
// D: Pinochimon, Haken entfernt – der Boss zuerst.
// E: Reiter listet beide Bosse mit dem Standard aus den Spieldaten.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, info) => { results.push(!!ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };

async function run({ boss, flags, adds, cfg = {} }) {
  const G = makeWorld({ slot: 0, tag: boss, noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.digimon.puppetmon = { name: 'Pinochimon' }; content.digimon.pumpkinmon = { name: 'Pumpkinmon' };
      content.digimon.arukenimon = { name: 'Arukenimon' }; content.digimon.golemon = { name: 'Golemon' };
      content.spawns.native_forest.bosses = [
        { species: 'puppetmon', at: 'boss_p', level: 3, respawnMs: 900000, statMult: 1.18, adds: { species: 'pumpkinmon', level: 50, count: 2, atHp: [0.66, 0.33], points: ['boss_p'], empowerPct: 10, shieldsBoss: true } },
        { species: 'arukenimon', at: 'boss_a', level: 3, respawnMs: 900000, adds: { species: 'golemon', level: 50, count: 2, atHp: [0.5], points: ['boss_a'] } },
      ];
      MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'boss_p', x: 450, y: 330 }, { type: 'spawn', name: 'boss_a', x: 450, y: 330 });
    },
    extraEnts: () => [{ id: 'b:1', kind: 2, defId: boss, x: 450, y: 330, hp: 100000, maxHp: 100000, level: 3, flags, targetId: 'p:me' }] });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'set', stab: 'adds', lvlDiff: 100, ...cfg }));
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(1500); G.ents.get('b:1').hp = 40000; await wait(800); // unter die Schwelle, dann erscheint der Add am Boss
  G.ents.set('a:2', { id: 'a:2', kind: 2, defId: adds, x: 470, y: 340, hp: 300, maxHp: 300, level: 50, flags: 32, targetId: '' });
  G.store.setState({ target: null });
  const seq = [];
  for (let i = 0; i < 20; i++) { const id = G.store.getState().target?.id || '-'; if (seq[seq.length - 1] !== id) seq.push(id); await wait(150); }
  const rows = [...G.w.document.querySelectorAll('[data-addfirst]')].map((b) => `${b.dataset.addfirst}:${b.checked ? 1 : 0}`).join(',');
  G.w.close();
  return { first: seq.filter((x) => x !== '-')[0], seq: seq.join(' > '), rows };
}

(async () => {
  const A = await run({ boss: 'puppetmon', flags: 1024 | 32, adds: 'pumpkinmon' });
  check('A: Pinochimon (Named, Schutz-Adds) – Add zuerst', A.first === 'a:2', A.seq);
  check('E: Reiter listet beide Bosse mit Standard aus den Daten', A.rows === 'native_forest#arukenimon:0,native_forest#puppetmon:1', A.rows);
  const B = await run({ boss: 'arukenimon', flags: 16 | 32, adds: 'golemon' });
  check('B: Adds ohne Wirkung – Boss zuerst', B.first === 'b:1' && !B.seq.includes('a:2'), B.seq);
  const C = await run({ boss: 'arukenimon', flags: 16 | 32, adds: 'golemon', cfg: { addFirst: { 'native_forest#arukenimon': true } } });
  check('C: Haken gesetzt – Add zuerst', C.first === 'a:2', C.seq);
  const D = await run({ boss: 'puppetmon', flags: 1024 | 32, adds: 'pumpkinmon', cfg: { addFirst: { 'native_forest#puppetmon': false } } });
  check('D: Pinochimon, Haken entfernt – Boss zuerst', D.first === 'b:1' && !D.seq.includes('a:2'), D.seq);
  console.log(results.every(Boolean) ? 'OK – Adds-Einstellung je Boss' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
