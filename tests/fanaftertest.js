// 3.1.2: Fächer (Ultimate Flare, schwenkt 1,6 s NACH der Ansage): verschwindet die Ansage, bleibt der Fächer noch als Gefahr
// stehen (sweep.ms + 300 ms). Vorher lief der Bot in den 0,3 s zwischen Ansage-Ende und Treffer zurück zum Boss
// (Sim Raum 4: alle vier Clavis gleichzeitig tot). Ein gewöhnlicher Strahl ohne Schwenk wird dagegen sofort vergessen.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function trial(sweep) {
  const skill = sweep ? { id: 'armageddemon.ultimate_flare', name: 'Ultimate Flare', shape: 'line', radius: 20, range: 360, sweep: { arc: 140, ms: 1600 } }
    : { id: 'etemon.beam', name: 'Beam', shape: 'line', radius: 20, range: 360 };
  const G = makeWorld({ slot: 0, tag: sweep ? 'F' : 'L', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) { content.digimon.armageddemon = { name: 'Armageddemon', skills: [skill] }; content.skills = { [skill.id]: skill }; },
    extraEnts: () => [{ id: 'b:1', kind: 2, defId: 'armageddemon', x: 540, y: 330, hp: 900000, maxHp: 900000, level: 99, flags: 16 | 32, targetId: 'p:me' }] });
  const scene = G.w.dmo.game.scene.getScene('world');
  scene.telegraphs = { active: [], marksActive: [], circles: [] }; scene.mechB = { lines: [] };
  const keys = [];
  G.w.addEventListener('keydown', (e) => keys.push({ c: e.code, t: Date.now() }), true);
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, tab: 'log', lvlDiff: 100 }));
  G.w.eval(script);
  await wait(800);
  const t = G.ents.get('t:me'), p = G.ents.get('p:me');
  t.x = 480; t.y = 330; p.x = 490; p.y = 330; // vor dem Boss, mitten im Fächer/Strahl nach Westen
  G.store.setState({ target: { id: 'b:1', kind: 'mob', name: 'Armageddemon', level: 99, hp: 900000, maxHp: 900000 } });
  const line = { src: 'b:1', fx: 540, fy: 330, tx: 180, ty: 330, r: 20, skill, end: G.w.performance.now() + 2500, sweeping: false };
  scene.mechB.lines = [line];
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(2500);
  const during = G.status();
  scene.mechB.lines = []; // Ansage weg – der Schwenk (1,6 s) kommt erst jetzt
  const t0 = Date.now();
  await wait(700);
  const after = G.status(), d1 = keys.filter((k) => k.c === 'Digit1' && k.t > t0).length;
  await wait(2000);
  const later = G.status();
  G.w.close();
  return { sweep, during, after, d1, later };
}
(async () => {
  const f = await trial(true), l = await trial(false);
  console.log(f, l);
  const ok = /Weiche|Warte außerhalb|Fernangriff|Außerhalb der Warnzone/.test(f.during) && /Warte außerhalb|Weiche|Fernangriff|Außerhalb der Warnzone/.test(f.after) && f.d1 === 0 && !/Warte außerhalb|Weiche|Außerhalb der Warnzone/.test(f.later)
    && /Weiche|Warte außerhalb|Fernangriff/.test(l.during) && !/Warte außerhalb|Weiche|Außerhalb der Warnzone/.test(l.after);
  console.log(ok ? 'OK – Fächer wirkt nach der Ansage nach, Strahl nicht' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
