// 3.2.26 (Spiel-Update 16.11.): Die Mega-Jagd ist beendet, seit 16.11. 07:00 UTC läuft die „Alter Hunt“ (id alter_hunt, Bosse
// *_hunt Lv 130, Chat-Codes alter_* statt hunt_*). Live 16.11.: Chat meldete alter_warning/alter_appeared mit {boss, map, ch}.
// A: Event-Liste enthält die alte Mega-Jagd (ohne laufendes/nächstes Event) und die laufende Alter Hunt – der Bot nimmt die
//    Alter Hunt: hinreisen, finden, angreifen (vorher griff find() die alte mega_hunt zuerst).
// B: Event-Liste nennt nur die alte Mega-Jagd, im Chat steht alter_appeared {boss, map, ch} – der Bot geht trotzdem hin.
// C (Review): Sonntags-Paar – Chat alter_appeared_pair, dann alter_twin_down (Goddramon fiel, Holydramon lebt): der Bot geht
//    hin und greift Holydramon an (vorher als neue Ankündigung „erscheint in 5 min“ gelesen).
// D (Review): Chat alter_appeared_pair, dann alter_defeated_pair – das Event ist vorbei, der Bot reist nicht hin.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run({ list, chat, msgs, entDef = 'tyrantkabuterimon_hunt' }) {
  const G = makeWorld({ slot: 0, tag: 'AH', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] },
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) { content.digimon.tyrantkabuterimon_hunt = { name: 'TyrantKabuterimon' }; content.digimon.goddramon_hunt = { name: 'Goddramon' }; content.digimon.holydramon_hunt = { name: 'Holydramon' }; },
    extraEnts: (id) => (id === 'primary_village' ? [{ id: 'm:alter', kind: 2, defId: entDef, level: 3, x: 640, y: 330, hp: 5000, maxHp: 5000, flags: 16, targetId: '' }] : []) });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.requestEvents = async () => list(Date.now());
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20, hunt: true, apGrind: false, levelRoute: false, levelBoss: false }));
  G.w.eval(script);
  await wait(1000);
  if (msgs) { const t0 = Date.now(); G.store.setState({ chat: [...(G.state.chat || []), ...msgs.map((m, i) => ({ channel: 'system', notice: true, ...m, ts: t0 + i }))] }); }
  if (chat) G.store.setState({ chat: [...(G.state.chat || []), { channel: 'system', notice: true, code: 'alter_appeared', params: { boss: 'tyrantkabuterimon_hunt', map: 'primary_village', ch: 1 }, ts: Date.now() }] });
  G.w.document.querySelector('[data-act="bot"]').click();
  let hit = false; const seen = new Set();
  for (let i = 0; i < 80 && !hit; i++) { seen.add(G.status().slice(0, 70)); if (G.ents.get('m:alter')?.hp < 5000) hit = true; await wait(150); }
  const r = { map: G.state.world.mapId, hit, st: [...seen].slice(0, 6) };
  G.w.close();
  return r;
}
const megaOld = (now) => ({ id: 'mega_hunt', now, slot: null, state: 'idle', next: null });
(async () => {
  const res = [];
  const a = await run({ list: (now) => [megaOld(now), { id: 'alter_hunt', now, slot: { key: 'a1', startMs: now - 60000, endMs: now + 3600000 }, boss: 'tyrantkabuterimon_hunt', mapId: 'primary_village', channel: 1, state: 'up', next: { boss: 'blitzgreymon_hunt', mapId: 'egg_valley', startMs: now + 7200000 } }] });
  res.push(['A: Alter Hunt statt der beendeten Mega-Jagd – hinreisen und angreifen', a.map === 'primary_village' && a.hit, a]);
  const b = await run({ list: (now) => [megaOld(now)], chat: true });
  res.push(['B: nur Chat-Meldung alter_appeared – trotzdem hin und angreifen', b.map === 'primary_village' && b.hit, b]);
  const pair = { boss: 'goddramon_hunt', twin: 'holydramon_hunt', map: 'primary_village', ch: 1 };
  const c = await run({ list: (now) => [megaOld(now)], entDef: 'holydramon_hunt', msgs: [{ code: 'alter_appeared_pair', params: pair }, { code: 'alter_twin_down', params: pair }] });
  res.push(['C: ein Zwilling gefallen – greift den anderen an', c.map === 'primary_village' && c.hit, c]);
  const d = await run({ list: (now) => [megaOld(now)], entDef: 'holydramon_hunt', msgs: [{ code: 'alter_appeared_pair', params: pair }, { code: 'alter_defeated_pair', params: pair }] });
  res.push(['D: Paar besiegt – keine Reise zum Event', d.map === 'native_forest' && !d.hit, d]);
  for (const [n, ok, info] of res) console.log((ok ? 'OK     ' : 'FEHLER ') + n, JSON.stringify(info));
  const all = res.every((x) => x[1]);
  console.log(all ? 'ALLES OK' : 'FEHLER');
  process.exit(all ? 0 : 1);
})();
