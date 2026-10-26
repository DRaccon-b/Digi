// 3.0.2: Der Tamer steht nach einem Kampf dicht an einer Wand (weniger als 7 px bis zum blockierten Feld) oder sogar
// auf einem blockierten Feld. Vorher fiel jede Laufprüfung schon am Startpunkt durch: alle Ziele „nicht erreichbar“ –
// übersprungen – „keine machbaren Quests mehr“, Bot gestoppt (live, Kaiser's Fortress). Jetzt: von der Wand weggehen
// ist erlaubt, auf einem blockierten Feld geht er erst auf freien Boden – und läuft dann normal zum Ziel.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function trial(name, x) {
  const G = makeWorld({ slot: 0, tag: name, noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, quests: {} });
  const grid = G.w.dmo.game.scene.getScene('world').map.grid;
  for (let y = 0; y < grid.h; y++) grid.blocked[y * grid.w + 26] = 1; // Wand bei x = 416…431, Weg zum Portal liegt im Westen
  G.store.subscribe(() => { if (G.state.screen === 'loading') grid.blocked.fill(0); }); // Wand nur im Native Forest
  const t = G.ents.get('t:me'), p = G.ents.get('p:me');
  t.x = x; t.y = 330; p.x = x - 6; p.y = 330;
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  let reached = false;
  for (let i = 0; i < 80 && !reached; i++) { if (G.state.world.mapId === 'primary_village') reached = true; await wait(150); }
  for (let i = 0; i < 40 && G.state.me.quests.q00_meet_gennai?.state !== 1; i++) await wait(150);
  const status = G.status(), accepted = G.state.me.quests.q00_meet_gennai?.state === 1;
  const r = { name, reached, accepted, status, unreachable: G.log.some((l) => /nicht erreichbar/.test(l)) || /nicht erreichbar|keine machbaren/.test(status) };
  G.w.close();
  return r;
}
(async () => {
  const rs = [await trial('5 px vor der Wand', 411), await trial('auf der Wand', 422)];
  console.log(rs);
  const ok = rs.every((r) => r.reached && r.accepted && !r.unreachable);
  console.log(ok ? 'OK – an/auf der Wand gestartet, trotzdem losgelaufen' : 'FEHLER – an der Wand alles „nicht erreichbar“');
  process.exit(ok ? 0 : 1);
})();
