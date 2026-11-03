// 3.2.5 (Orochimon „Sake-Fässer“, Megidramon-Siegel): Leuchtpunkte (scene.mech.padsActive: {id, at:[[x,y]..], r, held-Bitmaske,
// doneAt}) müssen gleichzeitig von je einem Digimon besetzt sein. Allein reicht es nicht – mit Fremden das nächste freie besetzen.
// Fremde Digimon stehen jeweils bei den anderen Punkten (genug für alle drei), außer in D.
// A: drei freie Punkte -> zum nächsten (600,330) und dort stehen bleiben.
// B: der nächste ist besetzt (held Bit 0) -> zum zweitnächsten (300,200).
// C: Punkte erledigt (doneAt) -> keine Bewegung.
// D: allein (keine anderen Digimon) -> nicht hingehen (die Ladung bricht so nie; Ausweichen wie bisher).
// E: Warnkreis liegt auf dem Fass, während der Bot dort steht -> er weicht aus (Warnzonen gehen vor).
// F: ein fremdes Digimon ist näher am nächsten Fass -> der Bot nimmt das zweitnächste.
// G: eigenes Digimon steht am Rand (16 px, r 18), held-Bit gesetzt -> gilt als eigener Punkt, kein Wechsel.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PTS = [[600, 330], [300, 200], [700, 520]];

async function run(kind) {
  const strangers = kind === 'D' ? [] : kind === 'F' ? [['p:x1', 615, 330], ['p:x2', 700, 505]] : [['p:x1', 300, 215], ['p:x2', 700, 505]];
  const W = makeWorld({ slot: 0, tag: 'P' + kind, noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    extraEnts: (id) => (id === 'native_forest' ? strangers.map(([sid, x, y]) => ({ id: sid, kind: 1, defId: 'agumon', x, y, hp: 5000, maxHp: 5000, flags: 0, targetId: '' })) : []) });
  W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', dodge: true }));
  W.w.eval(script);
  await wait(1200);
  W.w.document.querySelector('[data-act="bot"]').click();
  await wait(500);
  const t = W.ents.get('t:me'), p = W.ents.get('p:me');
  if (kind === 'G') { t.x = 606; t.y = 330; p.x = 616; p.y = 330; } else { t.x = 420; t.y = 330; p.x = 430; p.y = 330; }
  const sc = W.w.dmo.game.scene.getScene('world');
  sc.telegraphs = { active: [], marksActive: [], circles: [] }; sc.mechB = { lines: [] };
  const view = { id: 'sake_vats', at: PTS, r: 18, held: kind === 'B' ? 1 : kind === 'G' ? 1 : 0, doneAt: kind === 'C' ? 123 : 0 };
  sc.mech = { padsActive: [view], reticlesActive: [], arrowsActive: [] };
  const p0 = [p.x, p.y], sts = new Set();
  for (let i = 0; i < 30; i++) {
    await wait(150); sts.add(W.status().slice(0, 60));
    if (kind === 'E' && i === 18) { const z = { x: 600, y: 330, r: 60 }; sc.telegraphs.active = [z]; sc.telegraphs.circles = [{ ...z, end: W.w.performance.now() + 2500 }]; }
  }
  const d = (x, y) => Math.round(Math.hypot(p.x - x, p.y - y));
  const r = { kind, toA: d(600, 330), toB: d(300, 200), moved: d(p0[0], p0[1]), sts: [...sts] };
  W.w.close();
  return r;
}
(async () => {
  const R = {};
  for (const k of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) R[k] = await run(k);
  console.log(JSON.stringify(R));
  const ok = { A: R.A.toA <= 14, B: R.B.toB <= 14, C: R.C.moved < 10, D: R.D.moved < 10, E: R.E.toA > 60 && R.E.sts.some((s) => /Weiche|Warte außerhalb/.test(s)), F: R.F.toB <= 14, G: R.G.toA <= 18 };
  const label = { A: 'zum nächsten freien Fass', B: 'nächstes besetzt – zum zweitnächsten', C: 'erledigt – bleibt', D: 'allein – nicht hingehen', E: 'Warnkreis auf dem Fass – weicht aus', F: 'Fremder näher am Fass – nimmt das zweitnächste', G: 'am Rand des eigenen Fasses – kein Wechsel' };
  for (const k of Object.keys(ok)) console.log(ok[k] ? `OK     ${k}: ${label[k]}` : `FEHLER ${k} ${JSON.stringify(R[k])}`);
  process.exit(Object.values(ok).every(Boolean) ? 0 : 1);
})();
