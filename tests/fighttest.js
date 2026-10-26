// 2.4.0: Spiegel/Reflexion, Ausweichen mit freier Linie, belegte Gegner (Checkbox), Tooltip pro Stunde
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
  const taps = [], follows = [], keys = [];
  scene.tapGround = (x, y) => taps.push({ x, y });
  // 3.0.0: Grundangriff-Reichweite wie in den Spieldaten (für die Angriffsposition draußen)
  scene.deps.content.digimon.gabumon = { ...(scene.deps.content.digimon.gabumon || {}), name: 'Gabumon', radius: 7, basic: { range: 30 } }; F.ents.get('p:me').defId = 'gabumon';
  { const me = F.store.getState().me; F.store.setState({ me: { ...me, partner: { ...me.partner, species: 'gabumon' } } }); }
  scene.telegraphs = { active: [], mirrors: [] };
  scene.mechB = { lines: [] };
  scene.deps.commands = { partnerFollow: () => follows.push(Date.now()) };
  w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, lvlDiff: 10, ...cfg }));
  w.addEventListener('keydown', (e) => keys.push({ code: e.code, t: Date.now() }), true);
  w.eval(script);
  const status = () => w.document.querySelector('[data-f="status"]').textContent;
  const start = () => w.document.querySelector('[data-act="bot"]').click();
  return { w, F, scene, taps, follows, keys, status, start };
}

(async () => {
  // 1) Spiegel: Ziel m:1 spiegelt -> keine Taste 1, Digimon zurückrufen, danach wieder angreifen
  {
    const E = setup({});
    await wait(600);
    E.F.store.setState({ target: E.F.toTarget('m:1') });
    E.start();
    await wait(800);
    const before = E.keys.filter((k) => k.code === 'Digit1').length;
    const pnow = E.w.performance.now();
    E.scene.telegraphs.mirrors = [{ src: 'm:1', start: pnow, tellEnd: pnow - 10, end: pnow + 2000 }];
    await wait(300);
    const t0 = Date.now();
    await wait(1400);
    const during = E.keys.filter((k) => /^Digit[1-6]$/.test(k.code) && k.t > t0).length;
    const st = E.status();
    await wait(1500);
    const after = E.keys.filter((k) => k.code === 'Digit1' && k.t > t0 + 1500).length;
    check('Spiegel: greift vorher an', before > 0, before);
    check('Spiegel: keine Angriffe/Skills während Reflexion', during === 0 && /Spiegel/.test(st), `${during} | ${st}`);
    check('Spiegel: Digimon zurückgerufen', E.follows.length >= 1, E.follows.length);
    check('Spiegel: danach wieder Angriff', after > 0, after + ' | ' + E.status() + ' | ' + JSON.stringify(E.F.store.getState().target));
  }
  // 2) Ausweichen: Fluchtpunkt mit freier Linie zum Ziel bevorzugen
  {
    const E = setup({});
    await wait(600);
    const t = E.F.ents.get('t:me'), p = E.F.ents.get('p:me');
    t.x = 515; t.y = 512; p.x = 520; p.y = 512;
    const m1 = E.F.ents.get('m:1'); m1.x = 700; m1.y = 512;
    E.F.store.setState({ target: E.F.toTarget('m:1') });
    // Kreis um den Tamer + senkrechter Strahl bei x=600 (zwischen Tamer und Ziel)
    E.scene.telegraphs.active = [{ x: 515, y: 512, r: 40 }]; E.scene.telegraphs.circles = [{ x: 515, y: 512, r: 40, end: E.w.performance.now() + 4000 }]; // mit Endzeit wie im Spiel
    E.scene.mechB.lines = [{ fx: 600, fy: 380, tx: 600, ty: 640, r: 10, end: E.w.performance.now() + 60000, skill: {} }];
    E.start();
    await wait(700);
    const pt = E.taps[E.taps.length - 1];
    check('Linie frei: Fluchtpunkt hinter dem Strahl (Richtung Ziel)', pt && pt.x > 625 && pt.y > 440 && pt.y < 640, JSON.stringify(pt));
    // 3) Draußen, Strahl noch zwischen Tamer und Ziel -> warten; Strahl weg (Kreis noch da) -> sofort angreifen
    t.x = 450; t.y = 512; p.x = 455; p.y = 512;
    E.scene.telegraphs.active = [{ x: 515, y: 400, r: 40 }];
    await wait(700);
    const k1 = E.keys.filter((k) => k.code === 'Digit1').length;
    check('Linie blockiert: wartet', /Warte außerhalb|Nähere mich über sicheren Weg/.test(E.status()), E.status()); // 3.0.0: oder sicher heranlaufen, ohne Angriff
    E.scene.mechB.lines = [];
    await wait(1200);
    const k2 = E.keys.filter((k) => k.code === 'Digit1').length;
    check('Linie frei: greift an, obwohl noch ein Kreis aktiv ist', k2 > k1 && E.scene.telegraphs.active.length === 1, E.status());
  }
  // 4) Belegte Gegner: m:1 wird von einem anderen Spieler bekämpft
  for (const skipTaken of [true, false]) {
    const E = setup({ skipTaken, radius: 300 });
    await wait(400);
    for (const id of ['m:2', 'm:3', 'm:4', 'm:5', 'm:6']) E.F.ents.delete(id);
    E.F.E({ id: 't:other', kind: 0, x: 570, y: 470, targetId: 'm:1' });
    E.F.ents.get('m:1').targetId = 'p:other';
    E.start();
    await wait(900);
    const picked = E.F.selects.includes('m:1');
    check(`Belegte Gegner (Checkbox ${skipTaken ? 'an' : 'aus'})`, skipTaken ? !picked : picked, `select: ${E.F.selects.join(',') || '-'}`);
  }
  // 5) Tooltip pro Stunde
  {
    const E = setup({});
    await wait(500);
    const me = E.F.store.getState().me;
    E.F.store.setState({ me: { ...me, bits: 1000, partner: { ...me.partner, exp: 100 } } });
    await wait(5600);
    E.F.store.setState({ me: { ...E.F.store.getState().me, bits: 1600, partner: { ...me.partner, exp: 400 } } });
    await wait(600);
    const tExp = E.w.document.querySelector('[data-tip="rate"]').title;
    const tBits = E.w.document.querySelector('[data-tip="bitrate"]').title;
    check('Tooltip EXP pro Stunde', /EXP pro Stunde: ≈ [\d.]+/.test(tExp) && /Bis Level-Up/.test(tExp), tExp.split('\n')[0]);
    check('Tooltip Bits pro Stunde', /Bits pro Stunde: ≈ [\d.]+/.test(tBits) && /Diese Sitzung: 600 Bits/.test(tBits), tBits.split('\n')[0]);
  }
  console.log(results.every(Boolean) ? 'ALLES OK' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
