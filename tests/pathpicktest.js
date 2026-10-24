// 2.51.0: Zielwahl nach Weglänge – ein Monster jenseits eines Sees ist in Luftlinie nah, zu Fuß aber weit oder gar nicht
// erreichbar. A: Monster auf einer Insel (kein Weg) -> nie wählen. B: Monster hinter einer langen Wand, Durchgang weit weg
// (Weg länger als der Suchradius) -> das weiter entfernte, erreichbare Monster zuerst. C: ohne Hindernis wie bisher.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const T = 16, W = 60, H = 45;
function grid(kind) {
  const b = new Uint8Array(W * H), set = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H) b[y * W + x] = 1; };
  if (kind === 'island') { // Wasser-Ring um (520, 330): Zellen mit Abstand 2–3 Felder zur Mitte
    const cx = Math.floor(520 / T), cy = Math.floor(330 / T);
    for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 4; x <= cx + 4; x++) { const d = Math.max(Math.abs(x - cx), Math.abs(y - cy)); if (d >= 2 && d <= 3) set(x, y); }
  }
  if (kind === 'wall') { // senkrechte Wand bei x = 470 über die ganze Höhe, nur ganz unten ein Durchgang
    const wx = Math.floor(470 / T);
    for (let y = 0; y < H - 2; y++) set(wx, y);
  }
  return { tile: T, w: W, h: H, blocked: b };
}
async function run(kind) {
  const G = makeWorld({ slot: 0, tag: 'P', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [[520, 330], [410, 560]],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } } });
  if (kind) G.w.dmo.game.scene.getScene('world').map = { grid: grid(kind) };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20, radius: 300 }));
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  let first = null;
  for (let i = 0; i < 30 && !first; i++) { first = G.store.getState().target?.id || null; await wait(100); }
  G.w.close();
  return first;
}
(async () => {
  const island = await run('island'), wall = await run('wall'), open = await run(null);
  console.log({ island, wall, open });
  const ok = island === 'm:2' && wall === 'm:2' && open === 'm:1';
  console.log(ok ? 'OK – Zielwahl nach Weglänge: Insel nie, Umweg zu lang -> erreichbares zuerst, frei wie bisher' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
