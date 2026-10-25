// 2.20.0: Boss ruft Adds – zuerst die Adds töten, dann zurück zum Boss; in der Boss-Rotation unverändert (beim Boss)
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(farm) {
  const G = makeWorld({ slot: 0, tag: 'S', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.digimon.puppetmon = { name: 'Puppetmon' }; content.digimon.pumpkinmon = { name: 'Pumpkinmon' };
      content.spawns.native_forest.bosses = [{ species: 'puppetmon', at: 'boss_p', level: 3, respawnMs: 900000, adds: { species: 'pumpkinmon', count: 2 } }];
      MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'boss_p', x: 450, y: 330 });
    },
    extraEnts: () => [
      { id: 'b:1', kind: 2, defId: 'puppetmon', x: 450, y: 330, hp: 100000, maxHp: 100000, level: 3, flags: 16 | 32, targetId: 'p:me' },
      { id: 'a:1', kind: 2, defId: 'pumpkinmon', x: 380, y: 360, hp: 300, maxHp: 300, level: 3, flags: 32, targetId: '' },
    ] });
  G.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20,
    ...(farm ? { farm: true, farmMode: 'boss', farmBosses: ['native_forest#puppetmon'], farmChannels: [1] } : {}) }));
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.requestBossPins = () => {}; cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 1, maxClients: 40 }];
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  const seq = [];
  for (let i = 0; i < 40; i++) { const id = G.store.getState().target?.id || '-'; if (seq[seq.length - 1] !== id) seq.push(id); await wait(150); }
  const r = { farm, seq: seq.join(' > '), addHp: G.ents.get('a:1')?.hp };
  G.w.close();
  return r;
}
(async () => {
  const normal = await run(false), rot = await run(true);
  console.log({ normal, rot });
  const n = normal.seq.split(' > ').filter((x) => x !== '-');
  const ok = n[0] === 'a:1' && n.includes('b:1') && n.indexOf('b:1') > n.indexOf('a:1') && normal.addHp === 0 && !rot.seq.includes('a:1');
  console.log(ok ? 'OK – erst die Adds, dann der Boss; Boss-Rotation unverändert' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
