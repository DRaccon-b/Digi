// 2.50.0: Boss-Rotation mit einem Named Elite – zwischen normalen Monstern derselben Art und desselben Levels gilt nur
// das Monster mit den erhöhten HP (statMult) als Boss (live: jeder normale Tyrannomon in Harvest Hills galt als Ziel).
// A: Named Elite da -> nur ihn angreifen. B: Named Elite noch nicht da -> den normalen gleicher Art/Stufe nicht angreifen.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(withBoss) {
  const G = makeWorld({ slot: 0, tag: 'F', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.digimon.tyrmon = { name: 'Tyrmon', base: { hp: 1000 }, growth: { hp: 100 }, mob: { expBase: 6.5 } };
      content.spawns.native_forest.bosses = [{ species: 'tyrmon', at: 'ridge', level: 5, respawnMs: 240000, statMult: 2.06 }];
      MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'ridge', x: 470, y: 330 });
    },
    // normaler Tyrmon Lv 5 (1 400 HP) direkt beim Spieler, Named Elite (2 884 HP) daneben
    extraEnts: (id) => (id === 'native_forest' ? [
      { id: 'n:1', kind: 2, defId: 'tyrmon', x: 430, y: 330, hp: 1400, maxHp: 1400, level: 5, flags: 0, targetId: '' },
      ...(withBoss ? [{ id: 'b:1', kind: 2, defId: 'tyrmon', x: 520, y: 330, hp: 900000, maxHp: 2884, level: 5, flags: 16, targetId: '' }] : []),
    ] : []) });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 1, maxClients: 40 }];
  cmds.requestBossPins = () => {}; cmds.requestMapInfo = () => {};
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, farm: true, farmMode: 'boss', farmBosses: ['native_forest#tyrmon'], farmChannels: [1],
    hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 8, radius: 500 }));
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  const seq = [];
  for (let i = 0; i < 50; i++) { const id = G.store.getState().target?.id || '-'; if (seq[seq.length - 1] !== id) seq.push(id); if (withBoss && G.ents.get('b:1').hp < 900000) break; await wait(150); }
  const r = { seq: seq.join(' > '), bossHit: withBoss ? G.ents.get('b:1').hp < 900000 : null, normalHit: G.ents.get('n:1').hp < 1400 };
  G.w.close();
  return r;
}
(async () => {
  const a = await run(true), b = await run(false);
  console.log({ a, b });
  const ok = a.bossHit && !a.normalHit && !b.normalHit;
  console.log(ok ? 'OK – Rotation greift nur den Named Elite an, nicht den normalen gleicher Art' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
