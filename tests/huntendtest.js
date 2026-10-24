// 2.53.1: Event-Jagd – Lücken im Event-Vorrang. Autopilot mit fälliger Abgabe (die sonst „nicht kämpfen“ bedeutet):
// A: das Event-Fenster endet mitten im Kampf, der Boss lebt noch -> weiterkämpfen (vorher: Event verworfen, ab zur Abgabe).
// B: der Boss ist kurz unangreifbar (Formwechsel) -> beim Boss warten (vorher: Abgabe übernahm, der Bot lief weg).
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(mode) {
  const G = makeWorld({ slot: 0, tag: 'H', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] },
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] }, q_t: { state: 2, counters: [1] } },
    setup({ content }) {
      content.digimon.bigmon_hunt = { name: 'Bigmon' };
      content.quests.q_t = { id: 'q_t', name: 'Abgabe', giver: 'gennai', turnIn: 'gennai', minLevel: 1, objectives: [{ kind: 'kill', species: 'kunemon', count: 1 }] };
    },
    extraEnts: (id) => (id === 'primary_village' ? [{ id: 'm:boss', kind: 2, defId: 'bigmon_hunt', level: 3, x: 640, y: 330, hp: 900000, maxHp: 900000, flags: 16, targetId: '' }] : []) });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  let endMs = Date.now() + 3600000;
  cmds.requestEvents = async () => { const now = Date.now(); return [{ id: 'mega_hunt', now, slot: { key: 's1', startMs: now - 60000, endMs },
    boss: 'bigmon_hunt', mapId: 'primary_village', channel: 1, state: 'up', next: { boss: 'bigmon_hunt', mapId: 'primary_village', startMs: now + 7200000 } }]; };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20, hunt: true, autopilot: true, apGrind: false, levelRoute: false }));
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  let hit = false;
  for (let i = 0; i < 80 && !hit; i++) { if (G.ents.get('m:boss')?.hp < 900000) hit = true; await wait(150); }
  const sts = new Set();
  if (mode === 'end') endMs = Date.now() - 1000; // Fenster vorbei (Serverzeit), Boss lebt weiter
  else G.ents.get('m:boss').flags = 16 | 256; // unangreifbar
  const hp0 = G.ents.get('m:boss').hp, me0 = { ...G.ents.get('t:me') };
  let left = 0;
  for (let i = 0; i < 20; i++) {
    sts.add(G.status().slice(0, 70));
    const me = G.ents.get('t:me');
    if (G.state.world.mapId !== 'primary_village' || Math.hypot(me.x - me0.x, me.y - me0.y) > 120) left++;
    await wait(150);
  }
  if (mode === 'hide') { G.ents.get('m:boss').flags = 16; await wait(2000); }
  const r = { hit, hpLoss: hp0 - G.ents.get('m:boss').hp, left, sts: [...sts].slice(0, 5) };
  G.w.close();
  return r;
}
(async () => {
  const a = await run('end'), b = await run('hide');
  console.log({ a, b });
  const ok = a.hit && a.hpLoss > 0 && a.left === 0 && b.hit && b.left === 0 && b.hpLoss > 0 && !b.sts.some((s) => /Autopilot/.test(s));
  console.log(ok ? 'OK – Event-Boss bleibt Vorrang: nach Fensterende und bei kurzer Unangreifbarkeit' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
