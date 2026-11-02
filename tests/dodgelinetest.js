// 3.1.51 (live Water Realm 02.11.: Whamons Tidal Wave ist eine 20 px schmale Linie, 1,8 s Ansage. Das Digimon stand nach dem
// Ausweichen 53 px seitlich vom Whamon, die Angriffsposition 15 px neben der Linie – trotzdem „Warte außerhalb“, weil die Linie
// „bald“ (< 1,2 s) endete. 31 % der Farmzeit gingen so ins Ausweichen, 39 s davon reines Warten.)
// A: Linie vom Ziel nach rechts, Digimon 53 px unterhalb des Ziels, Linie endet in < 1,2 s (ständig erneuert) -> die 1 kommt,
//    der Bot läuft zur Angriffsposition neben der Linie („Sicherer Weg zur Angriffsposition“).
// C: Greifarm-Linie (r 12), Digimon in Schlagweite 10 px neben der Kante -> ausweichen, keine 1 von dort (die Testwelt setzt es
//    zurück; ist es kurz 13 px weit weg, darf es mit der vollen Linienreserve 12 px angreifen – wie bisher).   D: gleiche Lage, normaler Strahl -> bleibt und schlägt.
// B: Digimon schräg vor der Linie (selbst draußen, Angriffsposition aber in der Linie) -> keine 1, weiter warten.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const MOB = { x: 500, y: 330 };

async function trial(tag, p0, pin = false, line = {}) {
  const R = line.r || 20;
  const G = makeWorld({ slot: 0, tag, noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [[MOB.x, MOB.y]],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) { content.digimon.kunemon = { name: 'Kunemon', mob: { leashRange: 240 } }; content.digimon.gabumon = { ...(content.digimon.gabumon || {}), name: 'Gabumon', basic: { range: 28 } }; content.skills = { ...(content.skills || {}), 'kunemon.field': { id: 'kunemon.field', shape: 'line', radius: R, castMs: 1800, telegraph: true, grab: !!line.grab } }; } });
  for (const e of G.ents.values()) if (e.kind === 2) { e.hp = 900000; e.maxHp = 900000; e.targetId = 'p:me'; }
  const scene = G.w.dmo.game.scene.getScene('world');
  scene.telegraphs = { active: [], marksActive: [], circles: [], mirrors: [] }; scene.mechB = { lines: [] };
  const keys = [], posAt = []; // posAt: Abstand des Digimons zur Startposition beim Druck
  G.w.addEventListener('keydown', (e) => { if (e.code === 'Digit1') { keys.push(Date.now()); const q = G.ents.get('p:me'); posAt.push(q ? Math.hypot(q.x - p0.x, q.y - p0.y) : 0); } }, true);
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, tab: 'log', lvlDiff: 20, radius: 400 }));
  G.w.eval(script);
  await wait(800);
  const p = G.ents.get('p:me'), t = G.ents.get('t:me');
  p.x = p0.x; p.y = p0.y; t.x = p0.x; t.y = p0.y;
  scene.select('m:1');
  // Linie vom Ziel nach rechts (160 px), Restzeit immer < 1,2 s
  const renew = () => { scene.mechB.lines = [{ src: 'm:1', fx: MOB.x, fy: MOB.y, tx: MOB.x + 160, ty: MOB.y, r: R, end: G.w.performance.now() + 1000, skill: { id: 'kunemon.field', grab: !!line.grab } }]; };
  renew();
  G.w.document.querySelector('[data-act="bot"]').click();
  const t0 = Date.now(), sts = new Set();
  let last = t0;
  // Die Testwelt bewegt das Digimon bei der 1 nicht: 300 ms nach dem ersten Druck steht es „angekommen“ auf der
  // Angriffsposition 35 px vorm Ziel (Richtung wie gestartet) – von da an darf es nicht wieder fliehen
  let arrived = null; const after = new Set();
  while (Date.now() - t0 < 2500) {
    if (Date.now() - last > 400) { renew(); last = Date.now(); }
    if (pin) { p.x = p0.x; p.y = p0.y; t.x = p0.x; t.y = p0.y; }
    else if (keys.length && Date.now() - keys[0] > 300) { const d = Math.hypot(p0.x - MOB.x, p0.y - MOB.y), k = 35 / d; p.x = MOB.x + (p0.x - MOB.x) * k; p.y = MOB.y + (p0.y - MOB.y) * k; t.x = p.x; t.y = p.y; if (!arrived) arrived = Date.now(); else after.add(G.status().slice(0, 40)); }
    sts.add(G.status().slice(0, 50)); await wait(50);
  }
  const r = { presses: keys.filter((k) => k >= t0).length, atStart: keys.filter((k, i) => k >= t0 && posAt[i] < 2).length, first: keys.find((k) => k >= t0) ? keys.find((k) => k >= t0) - t0 : null, sts: [...sts], after: [...after], pos: [Math.round(p.x), Math.round(p.y)] };
  scene.mechB.lines = []; G.w.close();
  return r;
}
(async () => {
  const A = await trial('A', { x: MOB.x, y: MOB.y + 53 });
  // B: Digimon (560,382) steht 32 px neben der Linie (draußen), die Angriffsposition 35 px vorm Ziel läge aber nur 3 px neben ihr
  const B = await trial('B', { x: MOB.x + 60, y: MOB.y + 52 }, true);
  // C/D: Digimon 30 px vorm Ziel (in Schlagweite), 10 px neben der Kante einer 12-px-Linie. D: normaler Strahl -> bleibt und
  // schlägt (Kantenreserve 8 px). C: Greifarm (skill.grab) -> weicht aus, keine 1 (Reserve 12 px, Packen nie riskieren).
  const q = { x: MOB.x + 30 * Math.cos(47.2 * Math.PI / 180), y: MOB.y + 30 * Math.sin(47.2 * Math.PI / 180) };
  const C = await trial('C', q, true, { r: 12, grab: true });
  const D = await trial('D', q, true, { r: 12 });
  console.log(JSON.stringify({ A, B, C, D }));
  const okA = A.presses >= 1 && A.first < 1500, okA2 = A.after.length > 0 && !A.after.some((s) => /Weiche|Warte außerhalb/.test(s)), okB = B.presses === 0, okC = C.atStart === 0 && C.sts.some((s) => /Weiche/.test(s)), okD = D.presses >= 1 && !D.sts.some((s) => /Weiche/.test(s));
  console.log(okA ? 'OK     A: seitlich neben der Linie – die 1 kommt trotz „endet bald“' : 'FEHLER A');
  console.log(okA2 ? 'OK     A2: an der Angriffsposition (15 px neben der Linie) bleibt es und kämpft' : 'FEHLER A2 ' + JSON.stringify(A.after));
  console.log(okB ? 'OK     B: Angriffsposition in der Linie – keine 1' : 'FEHLER B');
  console.log(okC ? 'OK     C: Greifarm 10 px neben der Kante – weicht aus' : 'FEHLER C ' + JSON.stringify(C.sts));
  console.log(okD ? 'OK     D: Strahl 10 px neben der Kante, in Schlagweite – bleibt und schlägt' : 'FEHLER D ' + JSON.stringify(D.sts));
  process.exit(okA && okA2 && okB && okC && okD ? 0 : 1);
})();
