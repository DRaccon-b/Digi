// 3.1.23: Ultimate Flare nach rechts. A: Digimon steht hinter dem Boss in Schlagweite, der Tamer weit weg und „läuft“ (Flag) –
// trotzdem im Stand zuschlagen statt „Warte außerhalb“. B: Digimon seitlich außerhalb des Fächers (100 px) – hinter den Boss
// auf die Nahkampfposition laufen, nicht seitlich warten.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const boss = { x: 450, y: 330 };
async function run(variant) {
  const G = makeWorld({ slot: 0, tag: 'S' + variant, noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'boss:1', kind: 2, defId: 'armageddemon', x: boss.x, y: boss.y, hp: 800000, maxHp: 900000, level: 99, flags: 16, targetId: 'p:me' }] : []),
    setup({ content }) { content.digimon.armageddemon = { name: 'Armageddemon', radius: 7, skills: [] }; content.digimon.imperialdramon = { ...(content.digimon.imperialdramon || {}), name: 'Imperialdramon', basic: { range: 36 } }; } });
  const sc = G.w.dmo.game.scene.getScene('world');
  const taps = [], atk = [];
  sc.tapGround = (x, y) => taps.push({ x, y });
  G.w.addEventListener('keydown', (e) => { if (e.code === 'Digit1') atk.push(Date.now()); }, true);
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, tab: 'log', lvlDiff: 20 }));
  G.w.eval(script);
  await wait(1500);
  for (const id of [...G.ents.keys()]) if (id.startsWith('m:')) G.ents.delete(id);
  const t = G.ents.get('t:me'), p = G.ents.get('p:me');
  p.defId = 'imperialdramon';
  if (variant === 'A') { p.x = boss.x - 38; p.y = boss.y; t.x = boss.x - 150; t.y = boss.y + 120; t.flags = (t.flags || 0) | 1; } // Digimon hinten in Schlagweite, Tamer weit weg und „läuft“
  else { p.x = boss.x; p.y = boss.y + 100; t.x = boss.x; t.y = boss.y + 110; } // seitlich (90° zur Fächerrichtung), außerhalb des Fächers
  const me1 = G.store.getState().me; G.store.setState({ me: { ...me1, partner: { ...me1.partner, species: 'imperialdramon' } }, target: { id: 'boss:1', kind: 'mob', name: 'Armageddemon', level: 99, hp: 800000, maxHp: 900000, flags: 16 } });
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(400);
  sc.mechB = { lines: [{ src: 'boss:1', fx: boss.x, fy: boss.y, tx: boss.x + 360, ty: boss.y, r: 20, end: G.w.performance.now() + 2500, skill: { id: 'armageddemon.ultimate_flare', sweep: { arc: 140, ms: 1600 } } }] };
  const a0 = atk.length, n0 = taps.length;
  const seen = new Set();
  for (let i = 0; i < 6; i++) { await wait(200); seen.add(G.status().slice(0, 50)); }
  const tap = taps.slice(n0).pop();
  const dTap = tap ? Math.round(Math.hypot(tap.x - boss.x, tap.y - boss.y)) : null;
  const angTap = tap ? Math.round(Math.abs(Math.atan2(tap.y - boss.y, tap.x - boss.x)) * 180 / Math.PI) : null;
  G.w.close();
  return { variant, statuses: [...seen], angriffe: atk.length - a0, tap: tap && [Math.round(tap.x), Math.round(tap.y)], dTap, angTap };
}
(async () => {
  const A = await run('A'), B = await run('B');
  console.log(A, B);
  const okA = A.angriffe >= 1 && A.statuses.some((s) => /Angriff im Stand|normaler Angriff|Wehre ab/.test(s)) && !A.statuses.some((s) => /Weiche/.test(s));
  const okB = !!B.tap && B.angTap >= 130 && B.dTap >= 40 && B.dTap <= 80 && B.statuses.some((s) => /Hinter den Boss/.test(s)); // Zwischenpunkt außen herum (≥ 130°, ≤ 80 px) oder direkt hinten
  console.log(okA ? 'OK     A: hinten in Schlagweite – schlägt im Stand zu' : 'FEHLER A');
  console.log(okB ? 'OK     B: seitlich draußen – läuft hinter den Boss auf die Nahkampfposition' : 'FEHLER B');
  process.exit(okA && okB ? 0 : 1);
})();
