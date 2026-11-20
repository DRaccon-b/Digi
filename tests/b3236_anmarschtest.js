// 3.2.36 (Review 20.11.): Anmarsch (digibotDodgeApproach) nur, wenn eine Zone am Ziel liegt oder den Weg schneidet –
// eine ferne Zone (persistente Falle, Markierung eines anderen Spielers) ließ den Bot sonst dauerhaft 96 px vor dem Ziel
// „außerhalb warten“ (kein Angriff, partnerStop alle 500 ms).
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const results = [];
const check = (name, ok, info) => { results.push(ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function setup(cfg) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.eval(fake);
  const F = w.__fake, scene = w.dmo.game.scene.getScene('world');
  const taps = [], stops = [], keys = [];
  scene.tapGround = (x, y) => taps.push({ x, y });
  scene.deps.content.digimon.gabumon = { ...(scene.deps.content.digimon.gabumon || {}), name: 'Gabumon', radius: 7, basic: { range: 30 } }; F.ents.get('p:me').defId = 'gabumon';
  { const me = F.store.getState().me; F.store.setState({ me: { ...me, partner: { ...me.partner, species: 'gabumon' } } }); }
  scene.telegraphs = { active: [], mirrors: [] };
  scene.mechB = { lines: [], view: { traps: [] } };
  scene.deps.commands = { partnerFollow: () => {}, partnerStop: () => stops.push(Date.now()) };
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, lvlDiff: 10, ...cfg }));
  w.addEventListener('keydown', (e) => keys.push({ code: e.code, t: Date.now() }), true);
  w.eval(script);
  const status = () => w.document.querySelector('[data-f="status"]').textContent;
  const start = () => w.document.querySelector('[data-act="bot"]').click();
  return { w, F, scene, taps, stops, keys, status, start };
}
const place = (E, tx, ty) => { const t = E.F.ents.get('t:me'), p = E.F.ents.get('p:me'); t.x = tx; t.y = ty; p.x = tx + 5; p.y = ty; };
const approachRx = /Nähere mich über sicheren Weg|sicherer Platz nahe am Boss|derzeit kein sicherer Annäherungsweg/;

(async () => {
  // A) ferne persistente Falle, Ziel 400 px weit weg: kein Anmarsch; am Ziel (96 px) angreifen statt ewig zu warten
  {
    const E = setup({});
    await wait(600);
    for (const id of ['m:2', 'm:3', 'm:4', 'm:5', 'm:6']) E.F.ents.delete(id);
    const m1 = E.F.ents.get('m:1'); m1.x = 900; m1.y = 500;
    place(E, 500, 500);
    E.scene.mechB.view.traps = [{ x: 100, y: 900, r: 30 }]; // weit weg von Tamer, Ziel und Weg
    E.F.store.setState({ target: E.F.toTarget('m:1') });
    E.start();
    const seen = [];
    for (let i = 0; i < 8; i++) { await wait(100); seen.push(E.status()); }
    check('A1: ferne Falle löst keinen Anmarsch aus', !seen.some((s) => approachRx.test(s)), seen.filter((s) => approachRx.test(s))[0] || seen[seen.length - 1]);
    // Tamer steht jetzt 96 px vor dem Ziel (wie nach dem Anmarsch)
    place(E, 804, 500);
    await wait(300);
    const t0 = Date.now(), s0 = E.stops.length;
    const seen2 = [];
    for (let i = 0; i < 12; i++) { await wait(100); seen2.push(E.status()); }
    const hits = E.keys.filter((k) => k.code === 'Digit1' && k.t > t0).length;
    check('A2: 96 px vor dem Ziel kein „Warte außerhalb – sicherer Platz“', !seen2.some((s) => approachRx.test(s)), seen2.filter((s) => approachRx.test(s))[0] || seen2[seen2.length - 1]);
    check('A3: greift an (Taste 1)', hits > 0, `${hits} | ${E.status()}`);
    check('A4: kein partnerStop-Dauerfeuer', E.stops.length - s0 <= 1, E.stops.length - s0);
  }
  // B) Markierung eines anderen Spielers weit weg: ebenfalls kein Anmarsch
  {
    const E = setup({});
    await wait(600);
    for (const id of ['m:2', 'm:3', 'm:4', 'm:5', 'm:6']) E.F.ents.delete(id);
    const m1 = E.F.ents.get('m:1'); m1.x = 900; m1.y = 500;
    place(E, 500, 500);
    E.F.E({ id: 't:other', kind: 0, x: 100, y: 100 });
    E.scene.telegraphs.marksActive = [{ dst: 't:other', r: 32 }];
    E.F.store.setState({ target: E.F.toTarget('m:1') });
    E.start();
    const seen = [];
    for (let i = 0; i < 8; i++) { await wait(100); seen.push(E.status()); }
    check('B1: ferne Markierung löst keinen Anmarsch aus', !seen.some((s) => approachRx.test(s)), seen.filter((s) => approachRx.test(s))[0] || seen[seen.length - 1]);
  }
  // C) Gegenprobe: Warnkreis am Ziel, Tamer weit weg -> Anmarsch läuft weiter
  {
    const E = setup({});
    await wait(600);
    for (const id of ['m:2', 'm:3', 'm:4', 'm:5', 'm:6']) E.F.ents.delete(id);
    const m1 = E.F.ents.get('m:1'); m1.x = 900; m1.y = 500;
    place(E, 500, 500);
    const pn = E.w.performance.now();
    E.scene.telegraphs.active = [{ x: 900, y: 500, r: 60 }]; E.scene.telegraphs.circles = [{ x: 900, y: 500, r: 60, end: pn + 8000 }];
    E.F.store.setState({ target: E.F.toTarget('m:1') });
    E.start();
    const seen = [];
    for (let i = 0; i < 8; i++) { await wait(100); seen.push(E.status()); }
    check('C1: Warnkreis am Ziel -> Anmarsch/Warten außerhalb', seen.some((s) => /Nähere mich über sicheren Weg|Warte außerhalb/.test(s)), seen[seen.length - 1]);
  }
  // D) dauerhafte Falle quer auf dem geraden Weg zum fernen Ziel -> Umweg/Anmarsch, nicht ewig „Warte außerhalb“ (Prüfung 20.11.)
  {
    const E = setup({});
    await wait(600);
    for (const id of ['m:2', 'm:3', 'm:4', 'm:5', 'm:6']) E.F.ents.delete(id);
    const m1 = E.F.ents.get('m:1'); m1.x = 900; m1.y = 500;
    place(E, 500, 500);
    E.scene.mechB.view.traps = [{ x: 700, y: 500, r: 30 }];
    E.F.store.setState({ target: E.F.toTarget('m:1') });
    E.start();
    const seen = [];
    for (let i = 0; i < 20; i++) { await wait(100); seen.push(E.status()); }
    const waitingOnly = seen.slice(-10).every((s) => /Warte außerhalb, bis der Flächenangriff vorbei ist/.test(s));
    check('D1: Falle im Weg -> Umweg statt Dauerwarten', !waitingOnly && (E.taps.length > 0 || seen.some((s) => approachRx.test(s))), `${E.taps.length} Taps | ${seen[seen.length - 1]}`);
  }
  console.log(results.every(Boolean) ? 'ALLES OK' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
