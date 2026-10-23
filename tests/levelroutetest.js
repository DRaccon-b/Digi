// 2.42.0: Lern-Route – beim Grinden selbst zur Zone mit den meisten EXP/min fürs Level reisen (nur A2 wahlweise).
// 2.44.0: Zonen ganz über der Level-Grenze zählen mit ihren niedrigsten Monstern (bis +12), wenn das mehr bringt.
// Native Forest: Kunemon Lv 1–3 (für Lv 3 schwach); Primary Village „field“: Bigmon Lv 8–9 (+5/+6 = ×1,5) -> dorthin.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run({ route, a2, series, lowerTo, lvlDiff = 10 }) {
  const G = makeWorld({ slot: 0, tag: 'R', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [[360, 300], [420, 340]],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.digimon.kunemon = { name: 'Kunemon', base: { hp: 300 }, growth: { hp: 20 }, mob: { expBase: 6.5 } };
      content.digimon.bigmon = { name: 'Bigmon', base: { hp: 400 }, growth: { hp: 30 }, mob: { expBase: 6.5 } };
      content.spawns.primary_village.zones = { field: { entries: [{ species: 'bigmon', level: [8, 9], weight: 1 }] } };
      if (series) content.maps.primary_village.series = 2;
      MAPS.primary_village.layers[0].objects.push({ type: 'zone', name: 'field', x: 500, y: 250, width: 200, height: 150 });
    } });
  const st = G.store.getState();
  G.store.setState({ me: { ...st.me, partner: { ...st.me.partner, level: 3, stats: { at: 2000, as: 1200 } } } });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff, radius: 300, levelRoute: route, levelA2: a2 }));
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  const seen = new Set();
  for (let i = 0; i < 60; i++) { seen.add(G.status().replace(/ · .*/, '').slice(0, 60)); if (G.state.world.mapId === 'primary_village') { const t = G.ents.get('t:me'); if (t.x >= 476 && t.x <= 724 && t.y >= 226 && t.y <= 424) break; } await wait(150); }
  if (lowerTo != null) { // Level-Grenze senken: Zone bleibt nutzbar, solange ihr niedrigstes Monster höchstens +12 ist (2.44.0)
    const sl = G.w.document.querySelector('input[data-cfg="lvlDiff"]'); sl.value = lowerTo; sl.dispatchEvent(new G.w.Event('input', { bubbles: true }));
    for (let i = 0; i < 20; i++) await wait(150);
  }
  const t = G.ents.get('t:me');
  const r = { map: G.state.world.mapId, inZone: G.state.world.mapId === 'primary_village' && t.x >= 476 && t.x <= 724, st: [...seen].slice(0, 5) };
  G.w.close();
  return r;
}
(async () => {
  const res = [];
  const a = await run({ route: true, a2: false });
  res.push(['Lern-Route an: reist zur besseren Zone und läuft hinein', a.map === 'primary_village' && a.inZone && a.st.some((s) => /Leveln:/.test(s)), a]);
  const b = await run({ route: false, a2: false });
  res.push(['Lern-Route aus: bleibt', b.map === 'native_forest', b]);
  const c = await run({ route: true, a2: true, series: false });
  res.push(['Nur A2, keine A2-Map: bleibt', c.map === 'native_forest', c]);
  const d = await run({ route: true, a2: true, series: true });
  res.push(['Nur A2, Zielmap ist A2: reist', d.map === 'primary_village' && d.inZone, d]);
  const e = await run({ route: true, a2: false, lowerTo: 2 });
  res.push(['Grenze gesenkt: Zone ab +5 bleibt (niedrigste Monster, bis +12)', e.map === 'primary_village', e]);
  const f = await run({ route: true, a2: false, lvlDiff: 2 });
  res.push(['Grenze +2, bessere Zone ab +5: reist trotzdem hin (Erweiterung)', f.map === 'primary_village' && f.inZone, f]);
  for (const [n, ok, info] of res) console.log((ok ? 'OK     ' : 'FEHLER ') + n, JSON.stringify(info));
  const all = res.every((x) => x[1]);
  console.log(all ? 'ALLES OK' : 'FEHLER');
  process.exit(all ? 0 : 1);
})();
