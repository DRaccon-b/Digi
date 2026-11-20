// 3.2.36 (Review 20.11.): Ziel auf gesperrtem Boden. gridRoute nimmt dann das nächste freie Feld (bis 96 px), walkTo
// meldete dort „angekommen“, aber nie 'stuck' – der Aufrufer zeigte endlos „laufe zu X (48 px)“.
//  a) Quest-NPC hinter einer Theke: Endpunkt 48 px vor dem NPC (> NPC_TALK_DIST 36) – trotzdem ansprechen.
//  b) Jagdgebiet-Mitte auf Fels, keine Monster sichtbar: Endpunkt ~70 px von der Mitte (> 48) – als angekommen
//     werten und warten (idleSince läuft), statt ewig „laufe ins Jagdgebiet“.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const block = (grid, x0, x1, y0, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid.blocked[y * grid.w + x] = 1; };
let bad = 0;
const out = (ok, id, s) => { if (!ok) bad++; console.log(`${ok ? 'OK    ' : 'FEHLER'} ${id}: ${s}`); };

async function npcBehindCounter() {
  const G = makeWorld({ slot: 0, tag: 'theke', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, quests: {} });
  const grid = G.w.dmo.game.scene.getScene('world').map.grid;
  // Theke um Gennai (216,200): Felder x 11..15, y 11..14 gesperrt – nächstes freies Feld (216,248), 48 px vom NPC
  G.store.subscribe(() => { grid.blocked.fill(0); if (G.state.world?.mapId === 'primary_village') block(grid, 11, 15, 11, 14); });
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  for (let i = 0; i < 160 && G.state.me.quests.q00_meet_gennai?.state !== 1; i++) await wait(150);
  const t = G.ents.get('t:me'), d = Math.round(Math.hypot(t.x - 216, t.y - 200));
  const accepted = G.state.me.quests.q00_meet_gennai?.state === 1, status = G.status();
  G.w.close();
  out(accepted, 'theke', accepted ? `Quest angenommen (steht ${d} px vom NPC)` : `nicht angesprochen – steht ${d} px vom NPC, Status „${status}“`);
}

async function zoneOnRock() {
  const G = makeWorld({ slot: 0, tag: 'fels', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 1, counters: [0] } } });
  const grid = G.w.dmo.game.scene.getScene('world').map.grid;
  block(grid, 21, 29, 17, 23); // Mitte der Wiese (400,325) liegt auf Fels: 336..480 x 272..384
  const t = G.ents.get('t:me'), p = G.ents.get('p:me');
  t.x = 120; t.y = 330; p.x = 130; p.y = 330;
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  let waiting = false, seen = '';
  for (let i = 0; i < 100 && !waiting; i++) { const s = G.status(); if (s) seen = s; if (/warte auf/.test(s)) waiting = true; await wait(150); }
  const d = Math.round(Math.hypot(t.x - 400, t.y - 325));
  G.w.close();
  out(waiting, 'fels', waiting ? `am nächsten freien Feld angekommen (${d} px), wartet auf Monster` : `steht ${d} px von der Mitte, Status „${seen}“`);
}

(async () => {
  await npcBehindCounter();
  await zoneOnRock();
  process.exit(bad ? 1 : 0);
})();
