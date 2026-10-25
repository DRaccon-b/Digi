// 2.19.0: Markierung (Apocalymons „Big Bang Mark“, Kreis 56 px folgt einem Spieler) – (a) ein anderer Spieler ist
// markiert: aus seinem Kreis raus; (b) ich bin markiert: weg von den anderen, damit keiner in meinem Kreis steht.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(dst) {
  const G = makeWorld({ slot: 0, tag: 'S', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    extraEnts: () => [{ id: 't:other', kind: 0, x: 420, y: 330, hp: 1, flags: 0, targetId: '' }] });
  const scene = G.w.dmo.game.scene.getScene('world');
  scene.telegraphs = { active: [], marksActive: [] };
  scene.mechB = { lines: [] };
  G.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, dodge: true, tab: 'log' }));
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(800);
  scene.telegraphs.marksActive = [{ dst, r: 56, leftMs: 4500 }];
  await wait(3000);
  const t = G.ents.get('t:me'), p = G.ents.get('p:me'), o = G.ents.get('t:other');
  const d = Math.round(Math.min(Math.hypot(t.x - o.x, t.y - o.y), Math.hypot(p.x - o.x, p.y - o.y)));
  const r = { dst, dist: d, st: G.status() };
  G.w.close();
  return r;
}
(async () => {
  const a = await run('t:other'), b = await run('p:me');
  console.log({ a, b });
  const ok = a.dist > 56 && b.dist > 56;
  console.log(ok ? 'OK – Markierung erkannt und ausgewichen' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
