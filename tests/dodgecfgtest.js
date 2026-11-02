// 3.2.0: Ausweichen konfigurierbar (Reiter Einstellungen → Ausweichen).
// A: Standardwerte = bisherige Konstanten (Sicherheitsabstand 28, Kantenreserve 8, Warteabstand 220 …), Regler im Panel.
// B: Digimon 40 px außerhalb eines Warnkreises – mit 28 px Abstand kein Fluchtklick.
// C: Regler „Sicherheitsabstand“ auf 60 (Eingabe im Panel) – derselbe Fall gilt als drin, der Bot weicht aus (Fluchtpunkt
//    mindestens 60 px vom Rand); der Wert ist gespeichert.
// D: „Standardwerte“ setzt zurück; zu große gespeicherte Werte werden auf die Grenze geklemmt.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const C = { x: 430, y: 330, r: 32 };
const results = [];
const check = (name, ok, info) => { results.push(!!ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };

async function world(extra = {}) {
  // Monster greift an und steht 138 px rechts – weit weg vom Kreis (wie Szenario Z in dodgeedgetest)
  const G = makeWorld({ slot: 0, tag: 'D', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [[640, 330]],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) { content.digimon.kunemon = { name: 'Kunemon', mob: { leashRange: 240 } }; content.digimon.gabumon = { ...(content.digimon.gabumon || {}), name: 'Gabumon', basic: { range: 36 } }; } });
  for (const e of G.ents.values()) if (e.kind === 2) { e.hp = 900000; e.maxHp = 900000; }
  const scene = G.w.dmo.game.scene.getScene('world');
  scene.telegraphs = { active: [], marksActive: [], circles: [], mirrors: [] }; scene.mechB = { lines: [] };
  const taps = []; const tap0 = scene.tapGround; scene.tapGround = (x, y) => { taps.push({ x, y }); tap0?.(x, y); };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, tab: 'set', stab: 'dodge', lvlDiff: 20, radius: 400, ...extra }));
  G.w.eval(script);
  await wait(800);
  return { G, scene, taps };
}
async function trial(G, scene, taps) {
  const p = G.ents.get('p:me'), t = G.ents.get('t:me'), m = G.ents.get('m:1');
  const hold = () => { p.x = 502; p.y = 330; t.x = 502; t.y = 330; m.x = 640; m.y = 330; }; // 40 px außerhalb des Kreisrands (430 + 32 + 40)
  hold(); m.targetId = 'p:me'; scene.select?.('m:1');
  scene.telegraphs.active = [{ ...C }]; scene.telegraphs.circles = [{ ...C, end: G.w.performance.now() + 1500 }] // kurz: bei langen Ansagen kämpft der Bot erst weiter und läuft spät heraus;
  taps.length = 0;
  const sts = new Set(); const t0 = Date.now();
  while (Date.now() - t0 < 1500) { hold(); sts.add(G.status()); await wait(20); }
  scene.telegraphs.active = []; scene.telegraphs.circles = [];
  return { taps: [...taps], sts: [...sts] };
}

(async () => {
  // A + B
  {
    const { G, scene, taps } = await world();
    const d = G.w.document, v = (k) => d.querySelector(`[data-cfg="${k}"]`)?.value;
    check('A: Reiter Einstellungen → Ausweichen sichtbar', d.querySelector('[data-page="set"]')?.classList.contains('on') && d.querySelector('[data-spage="dodge"]')?.classList.contains('on'));
    const want = { dodgeMargin: '28', dodgeEdge: '8', dodgeHold: '220', dodgeSoonMs: '1200', dodgeSoonPad: '70', dodgeLateK: '1.5', dodgeLatePad: '1500', dodgeLateAbort: '3000', dodgeRetap: '1000', dodgeWalk: '130', dodgeSearch: '328', dodgeHuge: '900', pullDodgeLeash: '50', pullDodgeMargin: '16' };
    const got = Object.fromEntries(Object.keys(want).map((k) => [k, v(k)]));
    check('A: Standardwerte wie die bisherigen Konstanten', Object.entries(want).every(([k, x]) => got[k] === x), JSON.stringify(got));
    d.querySelector('[data-act="bot"]').click();
    const b = await trial(G, scene, taps);
    check('B: 40 px außerhalb, Abstand 28 – kein Fluchtklick', !b.taps.length && !b.sts.some((s) => /Weiche/.test(s)), `${b.taps.length} Klicks · ${b.sts.join(' | ').slice(0, 160)}`);
    // C: Regler im Panel verstellen
    const el = d.querySelector('[data-cfg="dodgeMargin"]');
    el.value = '60'; el.dispatchEvent(new G.w.Event('input', { bubbles: true }));
    await wait(200);
    const saved = JSON.parse(G.w.localStorage.getItem('digibot.cfg') || '{}');
    check('C: Wert gespeichert und angezeigt', saved.dodgeMargin === 60 && /60 px/.test(d.querySelector('[data-v="dodgeMargin"]')?.textContent || ''), `${saved.dodgeMargin}`);
    const c = await trial(G, scene, taps);
    const far = c.taps.length && c.taps.every((q) => Math.hypot(q.x - C.x, q.y - C.y) >= C.r + 60 - 2);
    check('C: mit 60 px Abstand weicht der Bot aus', c.taps.length > 0 && far, // Fluchtklick zählt; die Statuszeile „Weiche aus“ ist unter Last manchmal zu kurz sichtbar
      `${c.taps.length} Klicks ${JSON.stringify(c.taps.slice(0, 2))} · ${c.sts.join(' | ').slice(0, 120)}`);
    // D: zurücksetzen
    d.querySelector('[data-act="dodge-reset"]').click();
    await wait(200);
    const s2 = JSON.parse(G.w.localStorage.getItem('digibot.cfg') || '{}');
    check('D: Standardwerte wiederhergestellt', s2.dodgeMargin === 28 && el.value === '28', `${s2.dodgeMargin}/${el.value}`);
    G.w.close();
  }
  {
    const { G } = await world({ dodgeMargin: 500, dodgeEdge: -3 });
    const s = JSON.parse(G.w.localStorage.getItem('digibot.cfg') || '{}');
    check('D: gespeicherte Werte werden geklemmt', s.dodgeMargin === 80 && s.dodgeEdge === 0, `${s.dodgeMargin}/${s.dodgeEdge}`);
    G.w.close();
  }
  console.log(results.every(Boolean) ? 'OK – Ausweich-Regler' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
