// 3.1.19: Warnkreis auf dem eigenen Digimon (Black Rain r 64), der Boss steht mit drin – statt weit hinauszulaufen und draußen
// zu warten, geht der Bot auf die freie Seite des Bosses in Schlagweite (Ring-Position) und greift von dort sofort weiter an.
// Live 28.10.: je Black Rain ~3,5 s ohne Angriff, obwohl die andere Seite des Bosses frei war.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const boss = { x: 450, y: 330 }, me0 = { x: 492, y: 330 }; // Digimon 42 px rechts vom Boss, wie live
(async () => {
  const G = makeWorld({ slot: 0, tag: 'R', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'boss:1', kind: 2, defId: 'armageddemon', x: boss.x, y: boss.y, hp: 800000, maxHp: 900000, level: 99, flags: 16, targetId: 'p:me' }] : []),
    setup({ content }) {
      content.digimon.armageddemon = { name: 'Armageddemon', radius: 7, skills: [] };
      content.digimon.imperialdramon = { ...(content.digimon.imperialdramon || {}), name: 'Imperialdramon', basic: { range: 36 } };
      content.skills = content.skills || {}; content.skills['armageddemon.black_rain'] = { id: 'armageddemon.black_rain', name: 'Black Rain', shape: 'circle', radius: 64, telegraph: true, fixedDamage: 52000, castMs: 3000, cooldownMs: 24000 };
    } });
  const sc = G.w.dmo.game.scene.getScene('world');
  const taps = [], atk = [];
  sc.tapGround = (x, y) => taps.push({ x, y, t: Date.now() });
  G.w.addEventListener('keydown', (e) => { if (e.code === 'Digit1') atk.push(Date.now()); }, true);
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, tab: 'log', lvlDiff: 20, dgRing: true }));
  G.w.eval(script);
  await wait(1500);
  for (const id of [...G.ents.keys()]) if (id.startsWith('m:')) G.ents.delete(id);
  const t = G.ents.get('t:me'), p = G.ents.get('p:me');
  t.x = me0.x + 8; t.y = me0.y; p.x = me0.x; p.y = me0.y; p.defId = 'imperialdramon';
  const me1 = G.store.getState().me; G.store.setState({ me: { ...me1, partner: { ...me1.partner, species: 'imperialdramon' } }, target: { id: 'boss:1', kind: 'mob', name: 'Armageddemon', level: 99, hp: 800000, maxHp: 900000, flags: 16 } });
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(500);
  // Black Rain: Kreis r 64 genau auf dem Digimon (und einer auf dem Tamer), 3 s bis zum Einschlag – der Boss steht in beiden
  const end = G.w.performance.now() + 3000;
  const circles = [{ x: p.x, y: p.y, r: 64, skill: { id: 'armageddemon.black_rain' }, end }, { x: t.x, y: t.y, r: 64, skill: { id: 'armageddemon.black_rain' }, end }];
  sc.telegraphs = { active: circles.map((c) => ({ x: c.x, y: c.y, r: c.r, skill: c.skill })), circles, marksActive: [] };
  const T0 = Date.now();
  await wait(700);
  const tap = taps[taps.length - 1];
  const dBoss = tap ? Math.hypot(tap.x - boss.x, tap.y - boss.y) : null;
  const dCircle = tap ? Math.min(...circles.map((c) => Math.hypot(tap.x - c.x, tap.y - c.y))) : null;
  const s1 = G.status();
  console.log({ tap: tap && [Math.round(tap.x), Math.round(tap.y)], abstandBoss: dBoss && Math.round(dBoss), abstandKreismitte: dCircle && Math.round(dCircle), status: s1 });
  // angekommen: von dort sofort angreifen, kein erneutes Ausweichen
  if (tap) { t.x = tap.x; t.y = tap.y; p.x = tap.x; p.y = tap.y; }
  const a0 = atk.length, n0 = taps.length;
  await wait(900);
  const s2 = G.status(), moved = taps.slice(n0).some((q) => Math.hypot(q.x - tap.x, q.y - tap.y) > 6);
  console.log({ danach: s2, angriffe: atk.length - a0, woandershin: moved });
  const okGoal = !!tap && dBoss <= 46 && dBoss >= 36 && dCircle >= 64 + 12 && tap.x < boss.x; // Ring-Position auf der freien (linken) Seite
  const okAttack = atk.length - a0 >= 1 && /Angriff|Wehre ab|greife/.test(s2) && !moved;
  console.log(okGoal ? 'OK     Fluchtpunkt = Nahkampfposition auf der freien Seite des Bosses' : 'FEHLER Fluchtpunkt');
  console.log(okAttack ? 'OK     dort sofort weiter angegriffen, kein erneutes Ausweichen' : 'FEHLER Angriff');
  process.exit(okGoal && okAttack ? 0 : 1);
})();
