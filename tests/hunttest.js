// 2.38.0: Event „Mega-Jagd“ – Knopf 🎯 Event: das Event-Fenster des Spiels (requestEvents) nennt Boss und Map; der Bot
// reist hin (Kanal 1), wartet bis zum Erscheinen, findet den Boss und greift ihn an. Ohne Knopf: nichts davon.
// 2.40.1: auch in einer anderen Form (live: Boss stand nah, wurde aber nicht erkannt)
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run({ on, state, startIn, form }) {
  const G = makeWorld({ slot: 0, tag: 'H', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] },
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) { content.digimon.bigmon_hunt = { name: 'Bigmon' }; },
    extraEnts: (id) => (id === 'primary_village' && state === 'up' ? [{ id: 'm:boss', kind: 2, defId: form || 'bigmon_hunt', level: 3, x: 640, y: 330, hp: 5000, maxHp: 5000, flags: 16, targetId: '' }] : []) });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  let asked = 0;
  cmds.requestEvents = async () => { asked++; const now = Date.now(); return [{ id: 'mega_hunt', now, slot: { key: 's1', startMs: now - 60000, endMs: now + 3600000 },
    boss: 'bigmon_hunt', mapId: 'primary_village', channel: 1, state, next: { boss: 'bigmon_hunt', mapId: 'primary_village', startMs: now + (startIn || 7200000) } }]; };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20, hunt: on }));
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  const seen = new Set();
  let hitBoss = false;
  for (let i = 0; i < 70; i++) {
    seen.add(G.status().replace(/ · .*/, '').replace(/\d+:\d\d/, 'm:ss').slice(0, 70));
    if (G.ents.get('m:boss')?.hp < 5000) hitBoss = true;
    if (hitBoss) break;
    await wait(150);
  }
  const r = { map: G.state.world.mapId, hitBoss, asked, btnOn: G.w.document.querySelector('[data-act="hunt"]')?.classList.contains('on'), st: [...seen].slice(0, 6) };
  G.w.close();
  return r;
}
(async () => {
  const res = [];
  const a = await run({ on: true, state: 'up' });
  res.push(['Jagd läuft: hinreisen, finden, angreifen', a.map === 'primary_village' && a.hitBoss && a.btnOn && a.st.some((s) => /Event: Bigmon/.test(s)), a]);
  const b = await run({ on: true, state: 'defeated', startIn: 180000 });
  res.push(['Jagd in 3 min: hinreisen und warten', b.map === 'primary_village' && b.st.some((s) => /erscheint in m:ss/.test(s)), b]);
  const c = await run({ on: false, state: 'up' });
  res.push(['Knopf aus: keine Reise zum Event', c.map === 'native_forest' && !c.hitBoss && c.asked === 0, c]);
  const d = await run({ on: true, state: 'up', form: 'bigmon_hunt_blitz' });
  res.push(['Boss in anderer Form (…_hunt_blitz) wird auch gefunden', d.map === 'primary_village' && d.hitBoss, d]);
  for (const [n, ok, info] of res) console.log((ok ? 'OK     ' : 'FEHLER ') + n, JSON.stringify(info));
  const all = res.every((x) => x[1]);
  console.log(all ? 'ALLES OK' : 'FEHLER');
  process.exit(all ? 0 : 1);
})();
