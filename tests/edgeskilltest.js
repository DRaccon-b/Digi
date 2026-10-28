// 3.1.1: Angriffsposition am Kreisrand („Außerhalb der Warnzone · normaler Angriff“) – dort wurden nur noch Taste 1 gedrückt,
// Skills blieben liegen, solange Kreise aktiv waren (live: Paladin fast ohne Omega Blade). Jetzt werden bereite Skills in
// Reichweite auch von dort gewirkt; ein Ansturm-Skill (dash) nicht.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function trial(dash) {
  const G = makeWorld({ slot: 0, tag: dash ? 'D' : 'S', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) { content.digimon.etemon = { name: 'Etemon', skills: [] }; content.skills = { 'gabumon.blue_blaster': { id: 'gabumon.blue_blaster', name: 'Blue Blaster', kind: 'attack', target: 'enemy', range: 48, castMs: 400, cooldownMs: 6000, dash: dash } }; },
    extraEnts: () => [{ id: 'b:1', kind: 2, defId: 'etemon', x: 540, y: 330, hp: 90000, maxHp: 100000, level: 5, flags: 16 | 32, targetId: 'p:me' }] });
  const scene = G.w.dmo.game.scene.getScene('world');
  scene.telegraphs = { active: [], marksActive: [], circles: [] }; scene.mechB = { lines: [] };
  const st0 = G.store.getState();
  G.store.setState({ me: { ...st0.me, hotbar: ['cmd:attack', 'skill:0'], partner: { ...st0.me.partner, species: 'gabumon', ds: 500, skills: [{ id: 'gabumon.blue_blaster', name: 'Blue Blaster', dsCost: 5, unlocked: true }] } } });
  const keys = [];
  G.w.addEventListener('keydown', (e) => keys.push({ c: e.code, t: Date.now() }), true);
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, tab: 'log', lvlDiff: 20, skillSets: { gabumon: { skills: { 2: true }, heal: {} } } }));
  G.w.eval(script);
  await wait(800);
  const t = G.ents.get('t:me'), p = G.ents.get('p:me');
  // schon an der Angriffsposition außerhalb des Kreises (Boss am Kreisrand, wir dahinter)
  t.x = 592; t.y = 330; p.x = 581; p.y = 330;
  G.store.setState({ target: { id: 'b:1', kind: 'mob', name: 'Etemon', level: 5, hp: 90000, maxHp: 100000 } });
  // großer Kreis, Boss am Rand (wie dodgenear): von außen weiterkämpfen
  const z = { x: 400, y: 330, r: 150 };
  scene.telegraphs.active = [z]; scene.telegraphs.circles = [{ ...z, end: G.w.performance.now() + 12000 }];
  G.w.document.querySelector('[data-act="bot"]').click();
  // die Testwelt bewegt das Digimon beim Angriff nicht: Ankunft an der Angriffsposition (575) selbst nachstellen
  await wait(1500); p.x = 575; t.x = 586;
  const sts = []; for (let i = 0; i < 22; i++) { await wait(300); const x = G.status(); if (sts[sts.length - 1] !== x) sts.push(x); }
  const r = { dash, sts, outside: Math.hypot(t.x - 400, t.y - 330) > 150, d1: keys.filter((k) => k.c === 'Digit1').length, d2: keys.filter((k) => k.c === 'Digit2').length, st: G.status() };
  G.w.close();
  return r;
}
(async () => {
  const a = await trial(false), b = await trial(true);
  console.log(a, b);
  const ok = a.outside && /Außerhalb der Warnzone/.test(a.st) && a.d1 > 0 && a.d2 >= 1 && b.outside && b.d2 === 0;
  console.log(ok ? 'OK – Skill vom Kreisrand gewirkt, Ansturm nicht' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
