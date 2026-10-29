// 3.1.31: Boss-Rotation (A: allein, B: Gruppe mit eigenen Wegen – eigener Warteplatz um den Spawn) – Schutzzone direkt neben dem Spawnpunkt (live Mummymon, Destiny Lake: Steininsel 56 px über dem Spawn).
// Der Bot kommt von Norden durch die Zone und darf beim Warten auf den Respawn nicht in der Zone stehen bleiben –
// sonst lief er beim Spawn erst heraus und ließ den Boss nach drei Ausflügen 15 s in Ruhe.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const Z0 = { x: 400, y: 200, w: 160, h: 80 }; // Schutzzone 400..560 x 200..280, Spawn bei 470,330 (50 px darunter)
async function run(variant) {
  const Z = variant === 'B' ? { x: 540, y: 280, w: 120, h: 100 } : Z0; // B: genau auf dem Warteplatz von Slot 0 (rechts vom Spawn)
  const inZone = (p) => p.x >= Z.x - 10 && p.x <= Z.x + Z.w + 10 && p.y >= Z.y - 10 && p.y <= Z.y + Z.h + 10;
  const G = makeWorld({ slot: 0, tag: 'S' + variant, noHash: variant === 'A', accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.digimon.tyrmon = { name: 'Tyrmon', base: { hp: 1000 }, growth: { hp: 100 }, mob: { expBase: 6.5 } };
      content.spawns.native_forest.bosses = [{ species: 'tyrmon', at: 'ridge', level: 5, respawnMs: 240000 }];
      MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'ridge', x: 470, y: 330 }, { type: 'safe', name: 'isle', x: Z.x, y: Z.y, width: Z.w, height: Z.h });
    } });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 1, maxClients: 40 }];
  cmds.requestBossPins = () => G.store.setState({ bossPins: { at: G.w.performance.now(), bosses: [{ map: 'native_forest', index: 0, channel: 1, respawnInMs: 120000 }] } });
  cmds.requestMapInfo = () => {};
  cmds.switchChannel = () => {};
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, farm: true, farmMode: 'boss', farmBosses: ['native_forest#tyrmon'], farmChannels: [1],
    hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 8, radius: 500, independentGroup: variant === 'B' }));
  if (variant === 'B') G.w.sessionStorage.setItem('digibot.group', '1');
  // von Norden kommen: über der Schutzzone starten
  if (variant === 'A') for (const id of ['t:me', 'p:me']) { const e = G.ents.get(id); e.x = 470; e.y = 120; }
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  let waited = false;
  for (let i = 0; i < 60 && !waited; i++) { await wait(200); waited = /warte – Respawn/.test(G.status()); }
  await wait(1500);
  const t = G.ents.get('t:me');
  const r = { variant, waited, tamer: [Math.round(t.x), Math.round(t.y)], inZone: inZone(t), status: G.status().slice(0, 90) };
  console.log(r);
  G.w.close();
  return r.waited && !r.inZone;
}
(async () => {
  const a = await run('A'), b = await run('B');
  console.log(a ? 'OK     A: allein – wartet außerhalb der Schutzzone' : 'FEHLER A: wartet in der Schutzzone');
  console.log(b ? 'OK     B: Gruppe/eigene Wege – Warteplatz außerhalb der Schutzzone' : 'FEHLER B: Gruppen-Warteplatz liegt in der Schutzzone');
  process.exit(a && b ? 0 : 1);
})();
