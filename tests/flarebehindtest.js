// 3.1.18: Ultimate Flare – ohne den Haken „Platten als Deckung“ weicht der Bot hinter Armageddemon aus und bleibt dort in
// Schlagweite: der Nahbereich (64 px, 3.1.15) gilt im Rücksektor nicht. Dort angekommen greift er weiter an (Grundangriff),
// statt untätig zu warten (live 28.10.: jede Flare ≈ 5 s ohne Angriff für alle). Mit Haken: wie bisher ≥ 64 px vom Boss.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const boss = { x: 450, y: 330 }, me0 = { x: 500, y: 330 };
async function run(cover) {
  const G = makeWorld({ slot: 0, tag: cover ? 'FC' : 'FB', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'boss:1', kind: 2, defId: 'armageddemon', x: boss.x, y: boss.y, hp: 800000, maxHp: 900000, level: 99, flags: 16, targetId: 'p:me' }] : []),
    setup({ content }) { content.digimon.armageddemon = { name: 'Armageddemon', radius: 7, skills: [] }; content.digimon.imperialdramon = { ...(content.digimon.imperialdramon || {}), name: 'Imperialdramon', basic: { range: 36 } }; } });
  const sc = G.w.dmo.game.scene.getScene('world');
  const taps = [], atk = [];
  sc.tapGround = (x, y) => taps.push({ x, y });
  G.w.addEventListener('keydown', (e) => { if (e.code === 'Digit1') atk.push(Date.now()); }, true);
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, tab: 'log', lvlDiff: 20, dgFlareCover: cover }));
  G.w.eval(script);
  await wait(1500);
  for (const id of [...G.ents.keys()]) if (id.startsWith('m:')) G.ents.delete(id);
  const t = G.ents.get('t:me'), p = G.ents.get('p:me');
  t.x = me0.x; t.y = me0.y; p.x = me0.x - 10; p.y = me0.y; p.defId = 'imperialdramon';
  const me1 = G.store.getState().me; G.store.setState({ me: { ...me1, partner: { ...me1.partner, species: 'imperialdramon' } }, target: { id: 'boss:1', kind: 'mob', name: 'Armageddemon', level: 99, hp: 800000, maxHp: 900000, flags: 16 } });
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(500);
  // Fächer vom Boss nach rechts (auf uns zu), 2,5 s Ansage + 1,6 s Schwenk
  sc.mechB = { lines: [{ src: 'boss:1', fx: boss.x, fy: boss.y, tx: boss.x + 360, ty: boss.y, r: 20, end: G.w.performance.now() + 2500,
    skill: { id: 'armageddemon.ultimate_flare', sweep: { arc: 140, ms: 1600 } } }] };
  await wait(900);
  const tap = taps[taps.length - 1];
  const dd = tap ? Math.hypot(tap.x - boss.x, tap.y - boss.y) : null;
  const ang = tap ? Math.abs(Math.atan2(tap.y - boss.y, tap.x - boss.x)) * 180 / Math.PI : null; // 0° = Fächerrichtung, 180° = direkt dahinter
  // dort angekommen
  if (tap) { t.x = tap.x; t.y = tap.y; p.x = tap.x; p.y = tap.y; }
  const a0 = atk.length;
  await wait(900);
  return { tap: tap && [Math.round(tap.x), Math.round(tap.y)], abstand: dd && Math.round(dd), winkel: ang && Math.round(ang), angriffe: atk.length - a0, status: G.status(), flags: [t.flags, p.flags, G.ents.get('boss:1').flags], species: G.store.getState().me.partner.species, range: sc.deps.content.digimon[G.store.getState().me.partner.species]?.basic?.range, stTarget: G.store.getState().target?.id, basicTarget: G.ents.get('p:me').targetId };
}
(async () => {
  const b = await run(false), c = await run(true);
  console.log('ohne Haken (hinter den Boss):', b);
  console.log('mit Haken (Platten/Nahbereich):', c);
  const okB = !!b.tap && b.winkel >= 110 && b.abstand >= 36 && b.abstand <= 60 && b.angriffe >= 1;
  const okC = !!c.tap && (c.abstand >= 64 || c.winkel <= 70) && c.winkel > 70;
  console.log(okB ? 'OK     ohne Haken: hinter dem Boss in Schlagweite, greift weiter an' : 'FEHLER ohne Haken');
  console.log(okC ? 'OK     mit Haken: außerhalb des Fächers, mindestens 64 px vom Boss' : 'FEHLER mit Haken');
  process.exit(okB && okC ? 0 : 1);
})();
