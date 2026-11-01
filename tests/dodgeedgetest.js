// 3.1.50 (live Wind Valley 01.11.: Snimon-Kreise r 32 / 1,3 s – das Digimon stand 0,5–0,9 s vor Kreisende neben dem Ziel,
// die 1 kam erst ≈ 0,8 s später, der erste Treffer nach dem Kreis):
// X: Digimon 14 px außerhalb des Kreisrands (zwischen 8 und 28 px), Ziel draußen in Schlagweite -> zuschlagen, solange der
//    Kreis noch läuft (nicht erst ab 28 px Abstand).
// Y: Bot schlägt gerade zu (Taste 1), ein Kreis erscheint auf dem Digimon; es ist nach 300 ms draußen (40 px vom Rand), Ziel in
//    Schlagweite -> die 1 kommt sofort, nicht erst nach der 1,5-s-Wiederholsperre.
// Y2: wie Y, mit einer weiteren Warnzone 190 px entfernt.
// Z: wie X, aber das Ziel steht 120 px weit weg -> weiter ausweichen (die 8-px-Reserve gilt nur neben dem Ziel).
// V: wie X, Ziel 42 px weg (echte Schlagweite 36 + 7 − 4 = 39) -> weiter ausweichen; die 1 würde das Digimon zum Ziel und in
//    den Kreis ziehen (Review 3.1.50).
// W: langer Kreis (6 s) auf Digimon und Ziel – der Bot kämpft drinnen weiter und läuft erst spät heraus -> die 1 bleibt bei
//    der 1,5-s-Wiederholsperre (kein Tastendruck in jedem Takt, Review 3.1.50).
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const C = { x: 430, y: 330, r: 32 };

async function trial(tag, mob) {
  const G = makeWorld({ slot: 0, tag, noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [mob],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) { content.digimon.kunemon = { name: 'Kunemon', mob: { leashRange: 240 } }; content.digimon.gabumon = { ...(content.digimon.gabumon || {}), name: 'Gabumon', basic: { range: 36 } }; } });
  for (const e of G.ents.values()) if (e.kind === 2) { e.hp = 900000; e.maxHp = 900000; }
  const scene = G.w.dmo.game.scene.getScene('world');
  scene.telegraphs = { active: [], marksActive: [], circles: [], mirrors: [] }; scene.mechB = { lines: [] };
  const keys = [];
  G.w.addEventListener('keydown', (e) => { if (e.code === 'Digit1') keys.push(Date.now()); }, true);
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, tab: 'log', lvlDiff: 20, radius: 400 }));
  G.w.eval(script);
  await wait(800);
  return { G, keys, scene };
}
const circle = (scene, G, ms) => { scene.telegraphs.active = [{ ...C }]; scene.telegraphs.circles = [{ ...C, end: G.w.performance.now() + ms }]; };
const clear = (scene) => { scene.telegraphs.active = []; scene.telegraphs.circles = []; };

(async () => {
  const r = {};
  // X / Z: Digimon bei (476,330) = 14 px außerhalb des Rands; Tamer abseits
  for (const [tag, mob] of [['X', [506, 330]], ['Z', [596, 330]], ['V', [518, 330]]]) {
    const { G, keys, scene } = await trial(tag, mob);
    const p = G.ents.get('p:me'), t = G.ents.get('t:me'), m = G.ents.get('m:1');
    m.targetId = 'p:me';
    p.x = 476; p.y = 330; t.x = 476; t.y = 330;
    G.w.dmo.game.scene.getScene('world').select('m:1');
    circle(scene, G, 1300);
    const t0 = Date.now();
    G.w.document.querySelector('[data-act="bot"]').click();
    const sts = new Set();
    while (Date.now() - t0 < 1200) { sts.add(G.status().slice(0, 50)); p.x = 476; p.y = 330; t.x = 476; t.y = 330; await wait(5); } // beide festhalten (die Testwelt bewegt den Tamer zum Fluchtpunkt)
    r[tag] = { during: keys.filter((k) => k < t0 + 1200).length, sts: [...sts] };
    clear(scene); G.w.close();
  }
  // Y: erst normaler Kampf, dann Kreis auf dem Digimon, nach 700 ms draußen.   Y2: dazu eine dauerhafte Falle 190 px entfernt
  //    (weitere Warnzone in der Nähe – das Ausweichen gilt dann schon vorher als aktiv, live mehrere Snimon)
  for (const tag of ['Y', 'Y2']) {
    const { G, keys, scene } = await trial(tag, [470, 330]);
    if (tag === 'Y2') scene.mechB.lines = [{ src: 'trap', fx: 430, fy: 520, tx: 440, ty: 520, r: 20, end: G.w.performance.now() + 60000, skill: { id: 'trap.x' } }];
    const p = G.ents.get('p:me'), t = G.ents.get('t:me'), m = G.ents.get('m:1');
    p.x = 440; p.y = 330; t.x = 440; t.y = 330; m.targetId = 'p:me';
    G.w.dmo.game.scene.getScene('world').select('m:1');
    G.w.document.querySelector('[data-act="bot"]').click();
    const t0 = Date.now(); while (Date.now() - t0 < 3000 && !keys.length) await wait(10);
    const k0 = keys.length;
    circle(scene, G, 1800);
    // 700 ms ausweichen: dann ist die Wartezeit auf die Angriffsantwort (live kommt attackAck nach einer RTT, hier nie; ≤ 600 ms)
    // vorbei, die 1,5-s-Wiederholsperre aber noch nicht
    while (Date.now() - keys[k0 - 1] < 700) { p.x = 440; p.y = 330; t.x = 440; t.y = 330; await wait(10); }
    // draußen: 40 px vom Rand (Mitte 430 + 32 + 40 = 502), Ziel 30 px weiter rechts
    m.x = 532; p.x = 502; p.y = 330; t.x = 502; t.y = 330;
    const tOut = Date.now();
    const tl = []; while (Date.now() - tOut < 700) { p.x = 502; p.y = 330; t.x = 502; t.y = 330; const s = G.status().slice(0, 40); if (tl.at(-1)?.s !== s) tl.push({ d: Date.now() - tOut, s }); await wait(20); }
    if (process.env.DBG) console.log(JSON.stringify({ tl, keys: keys.map((k) => k - tOut) }));
    const first = keys.slice(k0).find((k) => k >= tOut);
    r[tag] = { started: k0 > 0, delay: first ? first - tOut : null, st: G.status().slice(0, 50) };
    clear(scene); G.w.close();
  }
  // W: Kreis r 60 um (430,330), 6 s; Digimon (440,330), Ziel (470,330) – beide drinnen
  {
    const { G, keys, scene } = await trial('W', [470, 330]);
    const p = G.ents.get('p:me'), t = G.ents.get('t:me'), m = G.ents.get('m:1');
    p.x = 440; p.y = 330; t.x = 440; t.y = 330; m.targetId = 'p:me';
    G.w.dmo.game.scene.getScene('world').select('m:1');
    const big = { x: 430, y: 330, r: 60 };
    scene.telegraphs.active = [big]; scene.telegraphs.circles = [{ ...big, end: G.w.performance.now() + 6000 }];
    G.w.document.querySelector('[data-act="bot"]').click();
    const t0 = Date.now(), sts = new Set();
    while (Date.now() - t0 < 3000) { p.x = 440; p.y = 330; t.x = 440; t.y = 330; sts.add(G.status().slice(0, 40)); await wait(20); }
    r.W = { n: keys.filter((k) => k >= t0 && k < t0 + 3000).length, sts: [...sts] };
    clear(scene); G.w.close();
  }
  console.log(JSON.stringify(r));
  const okX = r.X.during >= 1, okY = ['Y', 'Y2'].every((k) => r[k].started && r[k].delay != null && r[k].delay < 450), okZ = r.Z.during === 0, okV = r.V.during === 0, okW = r.W.n >= 1 && r.W.n <= 3;
  console.log(okX ? 'OK     X: 14 px vor dem Rand, Ziel in Schlagweite – schlägt während des Kreises zu' : 'FEHLER X');
  console.log(okY ? 'OK     Y: nach dem Ausweichen kommt die 1 sofort' : 'FEHLER Y');
  console.log(okZ ? 'OK     Z: Ziel weit weg – weicht weiter aus' : 'FEHLER Z');
  console.log(okV ? 'OK     V: Ziel knapp außer Schlagweite – weicht weiter aus' : 'FEHLER V');
  console.log(okW ? 'OK     W: spätes Herauslaufen – die 1 bleibt gedrosselt' : 'FEHLER W');
  process.exit(okX && okY && okZ && okV && okW ? 0 : 1);
})();
