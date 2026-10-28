// 3.1.21: Armageddemons Klinge (mechB.view.blade, ab 20 %) liegt am Boden – der Paladin läuft hin und hebt sie auf (drüberlaufen).
// A: Klinge frei → „Klinge: laufe hin“, der Tamer bewegt sich dorthin. B: Warnkreis auf der Klinge → warten, nicht hinlaufen.
// C: Klinge getragen (carrier gesetzt) → normal kämpfen.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const boss = { x: 450, y: 330 }, blade = { x: 560, y: 420 };
async function run(variant) {
  const G = makeWorld({ slot: 0, tag: 'B' + variant, noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'boss:1', kind: 2, defId: 'armageddemon', x: boss.x, y: boss.y, hp: 150000, maxHp: 900000, level: 99, flags: 16, targetId: 'p:me' }] : []),
    setup({ content }) { content.digimon.armageddemon = { name: 'Armageddemon', radius: 7, skills: [] }; content.digimon.imperialdramon_paladin = { ...(content.digimon.imperialdramon_paladin || {}), name: 'Imperialdramon Paladin Mode', basic: { range: 36 } }; } });
  const sc = G.w.dmo.game.scene.getScene('world');
  const taps = [];
  const tap0 = sc.tapGround; sc.tapGround = (x, y) => { taps.push({ x, y }); tap0?.(x, y); };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ dungeon: true, autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, tab: 'log', lvlDiff: 20 }));
  G.w.eval(script);
  await wait(1500);
  for (const id of [...G.ents.keys()]) if (id.startsWith('m:')) G.ents.delete(id);
  const t = G.ents.get('t:me'), p = G.ents.get('p:me');
  t.x = 500; t.y = 330; p.x = 492; p.y = 330; p.defId = 'imperialdramon_paladin';
  const me1 = G.store.getState().me; G.store.setState({ me: { ...me1, partner: { ...me1.partner, species: 'imperialdramon_paladin' } }, target: { id: 'boss:1', kind: 'mob', name: 'Armageddemon', level: 99, hp: 150000, maxHp: 900000, flags: 16 } });
  sc.mechB = { lines: [], view: { t: 'mech', blade: [{ boss: 'boss:1', x: blade.x, y: blade.y, r: 12, fx: 'sword', carrier: variant === 'C' ? 'p:other' : undefined }] } };
  if (variant === 'B') { const c = { x: blade.x, y: blade.y, r: 64, skill: { id: 'armageddemon.black_rain' }, end: G.w.performance.now() + 60000 }; sc.telegraphs = { active: [{ x: c.x, y: c.y, r: c.r, skill: c.skill }], circles: [c], marksActive: [] }; }
  G.w.document.querySelector('[data-act="bot"]').click();
  const seen = new Set();
  for (let i = 0; i < 8; i++) { await wait(200); seen.add(G.status().slice(0, 40)); }
  const d0 = Math.hypot(500 - blade.x, 330 - blade.y), d1 = Math.hypot(t.x - blade.x, t.y - blade.y);
  G.w.close();
  return { variant, statuses: [...seen], naeher: Math.round(d0 - d1), taps: taps.length, log: G.log.filter((l) => /Klinge/.test(l)).slice(-2) };
}
(async () => {
  const A = await run('A'), B = await run('B'), C = await run('C');
  console.log(A, B, C);
  const okA = A.statuses.some((s) => /Klinge: laufe hin|Klinge: aufheben/.test(s)) && A.naeher > 20;
  const okB = !B.statuses.some((s) => /Klinge: laufe|Klinge: aufheben/.test(s)) && B.naeher < 10; // Ausweichen/Warnkreis hat Vorrang – nicht zur Klinge laufen
  const okC = !C.statuses.some((s) => /Klinge/.test(s));
  console.log(okA ? 'OK     A: Klinge frei – Paladin läuft hin' : 'FEHLER A');
  console.log(okB ? 'OK     B: Klinge im Warnkreis – wartet' : 'FEHLER B');
  console.log(okC ? 'OK     C: Klinge getragen – normal kämpfen' : 'FEHLER C');
  process.exit(okA && okB && okC ? 0 : 1);
})();
