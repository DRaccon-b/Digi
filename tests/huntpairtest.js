// 3.2.49 (Nutzer 22.11.: „wenn zwei Event-Bosse gleichzeitig spawnen, einen fokussieren und nicht zwischen zwei hin und her
// springen“). Alter Hunt Sonntags-Paar: Goddramon + Holydramon stehen gleichzeitig; sie bewegen sich, und welcher näher ist,
// wechselt alle 0,7 s. Vorher nahm huntFocus jeden Takt den nächsten -> Ziel sprang hin und her.
//  P: Nach dem ersten Treffer bleibt das Ziel derselbe Boss, bis er fällt (kein Wechsel).
//  P3 (Review): Der eigene Boss ist 1,2 s versteckt (Schutzphase) -> danach wieder er, nicht dauerhaft der andere.
//  P2: Fällt der erste, nimmt er den zweiten.
//  P4 (Review): Das Event-Fenster endet, während beide noch leben (Liste leer) -> weiter derselbe Boss, kein Hin und Her.
// Beide Fälle zweimal: mit beiden Reihenfolgen in der Entity-Liste (huntStep nahm den letzten sichtbaren – Review 3.2.49).
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(rev, over = false) {
  let ended = false;
  const G = makeWorld({ slot: 0, tag: 'HP', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] },
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) { content.digimon.goddramon_hunt = { name: 'Goddramon' }; content.digimon.holydramon_hunt = { name: 'Holydramon' }; },
    extraEnts: (id) => { if (id !== 'primary_village') return []; const l = [
      { id: 'm:god', kind: 2, defId: 'goddramon_hunt', level: 3, x: 640, y: 330, hp: 900000, maxHp: 900000, flags: 16, targetId: '' },
      { id: 'm:holy', kind: 2, defId: 'holydramon_hunt', level: 3, x: 700, y: 330, hp: 900000, maxHp: 900000, flags: 16, targetId: '' }]; return rev ? l.reverse() : l; } });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.requestEvents = async () => { const now = Date.now(); if (ended) return []; return [{ id: 'alter_hunt', now, slot: { key: 'p1', startMs: now - 60000, endMs: now + 3600000 }, boss: 'goddramon_hunt', twin: 'holydramon_hunt', mapId: 'primary_village', channel: 1, state: 'up' }]; };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20, hunt: true, apGrind: false, levelRoute: false, levelBoss: false }));
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  // warten, bis er angekommen ist und einen der beiden trifft
  let first = null;
  for (let i = 0; i < 120 && !first; i++) {
    const g = G.ents.get('m:god'), h = G.ents.get('m:holy');
    if (g && g.hp < 900000) first = 'm:god'; else if (h && h.hp < 900000) first = 'm:holy';
    await wait(150);
  }
  if (over) { ended = true; await wait(6500); } // Fenster vorbei: nächste Abfrage liefert nichts mehr
  // jetzt bewegen: der andere steht abwechselnd näher am Spieler
  const switches = []; let last = G.state.target?.id || null;
  const me = () => G.ents.get('p:me') || G.ents.get('t:me');
  for (let i = 0; i < 40; i++) {
    const g = G.ents.get('m:god'), h = G.ents.get('m:holy'), p = me();
    if (g && h && p) {
      const other = first === 'm:god' ? h : g, mine = first === 'm:god' ? g : h;
      const close = Math.floor(i / 5) % 2 === 1; // alle ~0,75 s: der andere direkt neben mir, meiner etwas weiter weg
      other.x = p.x + (close ? 20 : 90); other.y = p.y; mine.x = p.x + (close ? 60 : 30); mine.y = p.y + 10;
    }
    const t = G.state.target?.id || null;
    if (t !== last) { switches.push(t); last = t; }
    await wait(150);
  }
  const wrong = switches.filter((s) => s && s !== first).length;
  if (over) { G.w.close(); return [[!!first && wrong === 0, `P4${rev ? ' (umgekehrt)' : ''}: Fenster vorbei – bleibt bei ${first} (Wechsel: ${wrong}, Folge ${JSON.stringify(switches)})`]]; }
  // P3: eigenen Boss kurz verstecken (Flag Hidden 64), dann wieder zeigen
  { const e = G.ents.get(first); if (e) { e.flags |= 64; await wait(1200); e.flags &= ~64; } }
  let back = false;
  for (let i = 0; i < 20 && !back; i++) { await wait(150); if (G.state.target?.id === first) back = true; }
  await wait(900); const stay = G.state.target?.id === first;
  // P2: meinen Boss fallen lassen -> der zweite wird genommen
  const mineE = G.ents.get(first); if (mineE) { mineE.hp = 0; mineE.flags |= 1 << 30; G.ents.delete(first); }
  const second = first === 'm:god' ? 'm:holy' : 'm:god';
  let took = false;
  for (let i = 0; i < 40 && !took; i++) { if (G.state.target?.id === second) took = true; await wait(150); }
  const st = G.status(); G.w.close();
  const tag = rev ? ' (umgekehrt)' : '';
  return [
    [!!first && wrong === 0, `P${tag}: bleibt bei ${first} (Wechsel auf den anderen: ${wrong}, Folge ${JSON.stringify(switches)})`],
    [back && stay, `P3${tag}: nach der Schutzphase wieder ${first} (Ziel jetzt ${G.state?.target?.id})`],
    [took, `P2${tag}: nach dem Fall den zweiten genommen (Status ${st})`],
  ];
}
(async () => {
  const res = [...await run(false), ...await run(true), ...await run(false, true), ...await run(true, true)];
  for (const [ok, n] of res) console.log((ok ? 'OK     ' : 'FEHLER ') + n);
  process.exit(res.every(([ok]) => ok) ? 0 : 1);
})();
