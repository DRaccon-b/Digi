// 3.2.36 (Review 20.11.): Jede Einstellungsänderung – sogar jeder Pixel beim Ziehen eines Reglers – setzte in allen anderen
// Fenstern Boss-Kampf, Deva-/Named-Runde und Quest-Aufgabe zurück (storage-Listener: farm.reset()/autopilot.reset() bei jeder
// Änderung; Regler speicherte bei jedem 'input').
// A: anderes Fenster ändert nur die HP-Trank-Schwelle -> Deva-Runde, Ziel und Quest-Aufgabe bleiben, Wert kommt an.
// B: anderes Fenster ändert ein ziel-relevantes Feld (farmBosses), kein Kampf -> Ziel wird verworfen.
// C: ziel-relevante Änderung während eines laufenden Boss-Kampfs -> der Kampf bleibt.
// D: Regler ziehen (mehrere 'input') speichert nicht; erst beim Loslassen ('change') genau einmal.
const fs = require('fs');
const makeWorld = require('./gw');
const HOOK = '  const RUN_KEYS = [';
const src = fs.readFileSync(process.argv[2], 'utf8');
if (!src.includes(HOOK)) { console.log('FEHLER setup: Einhängepunkt fehlt'); process.exit(1); }
const script = src.replace(HOOK, '  window.__rr = () => ({ farm, autopilot, cfg });\n' + HOOK);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const G = makeWorld({ slot: 0, tag: 'A', noHash: true, accounts: { leader: 0, list: [{ user: 'a' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] } } });
  const base = { hpPot: 30, dsPot: 0, tdsPot: 0, tab: 'set', farmMode: 'deva' };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify(base));
  G.w.eval(script);
  await wait(1500);
  const R = G.w.__rr();
  const remote = (c) => { const v = JSON.stringify(c); G.w.localStorage.setItem('digibot.cfg', v); G.w.dispatchEvent(new G.w.StorageEvent('storage', { key: 'digibot.cfg', newValue: v })); };
  const cur = () => JSON.parse(G.w.localStorage.getItem('digibot.cfg'));
  let ok = true;
  const check = (id, cond, msg, info) => { console.log(cond ? `OK     ${id}: ${msg}` : `FEHLER ${id}: ${msg} ${JSON.stringify(info || {})}`); if (!cond) ok = false; };

  // A
  const deva = { idx: 3, marker: 'deva' }, goal = { key: 'x#y', marker: 'goal' }, task = { id: 'q', marker: 'task' };
  R.farm.deva = deva; R.farm.goal = goal; R.autopilot.task = task;
  remote({ ...cur(), hpPot: 55 });
  await wait(200);
  check('A', R.farm.deva === deva && R.farm.goal === goal && R.autopilot.task === task && R.cfg.hpPot === 55,
    'nur HP-Trank geändert: Deva-Runde, Ziel und Quest-Aufgabe bleiben, Wert kommt an',
    { deva: !!R.farm.deva, goal: !!R.farm.goal, task: !!R.autopilot.task, hp: R.cfg.hpPot });

  // B
  R.farm.goal = goal; R.farm.fight = null; R.autopilot.task = task;
  remote({ ...cur(), farmBosses: ['tower_forest#arukenimon'] });
  await wait(200);
  check('B', R.farm.goal === null && R.autopilot.task === null, 'Boss-Auswahl geändert: Ziel und Aufgabe werden verworfen',
    { goal: R.farm.goal, task: R.autopilot.task });

  // C
  const fight = { boss: 'arukenimon', marker: 'fight' };
  R.farm.goal = goal; R.farm.fight = fight;
  remote({ ...cur(), farmChannels: [1] });
  await wait(200);
  check('C', R.farm.fight === fight && R.farm.goal === goal, 'ziel-relevante Änderung während des Boss-Kampfs: Kampf bleibt',
    { fight: !!R.farm.fight, goal: !!R.farm.goal });
  R.farm.fight = null;

  // D
  const D = G.w.document, slider = D.querySelector('input[data-cfg="hpPot"]');
  if (!slider) { check('D', false, 'HP-Trank-Regler nicht gefunden'); }
  else {
    const proto = G.w.Storage.prototype, orig = proto.setItem; let saves = 0;
    proto.setItem = function (k, v) { if (k === 'digibot.cfg') saves++; return orig.call(this, k, v); };
    for (const v of [56, 57, 58, 59, 60]) { slider.value = String(v); slider.dispatchEvent(new G.w.Event('input', { bubbles: true })); }
    const during = saves, live = R.cfg.hpPot;
    slider.dispatchEvent(new G.w.Event('change', { bubbles: true }));
    const after = saves;
    proto.setItem = orig;
    check('D', during === 0 && after === 1 && live === 60 && cur().hpPot === 60,
      'Regler ziehen speichert erst beim Loslassen (einmal), Wert gilt sofort im eigenen Fenster',
      { during, after, live, saved: cur().hpPot });
  }
  G.w.close();
  process.exit(ok ? 0 : 1);
})();
