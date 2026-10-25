// 2.53.0: Boss-Rotation – Ziel ist Kanal 2 (Timer unbekannt), weil Kanal 1 laut Boss-Timer erst in 60 s spawnt. Noch vor dem
// Wechsel erscheint der Boss HIER auf Kanal 1. Vorher hielt die 20-s-Hysterese am alten Ziel fest: der Bot wechselte weg
// vom lebenden Boss. Jetzt gewinnt ein lebender Boss auf dem aktuellen Kanal immer.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const G = makeWorld({ slot: 0, tag: 'F', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.digimon.tyrmon = { name: 'Tyrmon', base: { hp: 1000 }, growth: { hp: 100 }, mob: { expBase: 6.5 } };
      content.spawns.native_forest.bosses = [{ species: 'tyrmon', at: 'ridge', level: 5, respawnMs: 240000 }];
      MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'ridge', x: 470, y: 330 });
    } });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 1, maxClients: 40 }, { channel: 2, roomId: 'r2', clients: 1, maxClients: 40 }];
  let pinned = false, switches = 0;
  cmds.requestBossPins = () => {
    if (pinned) return; pinned = true;
    G.store.setState({ bossPins: { at: G.w.performance.now(), bosses: [{ map: 'native_forest', index: 0, channel: 1, respawnInMs: 60000 }] } });
  };
  cmds.requestMapInfo = () => {};
  cmds.switchChannel = () => { switches++; }; // Wechsel kommt nicht durch – der Bot bleibt auf Kanal 1
  G.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: false, farm: true, farmMode: 'boss', farmBosses: ['native_forest#tyrmon'], farmChannels: [1, 2],
    hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 8, radius: 500 }));
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(2500);
  const goalCh2 = /Boss-Ziel: Tyrmon · Native Forest Ch 2/.test(G.w.document.body.textContent);  // der Boss erscheint hier auf Kanal 1
  G.ents.set('b:1', { id: 'b:1', kind: 2, defId: 'tyrmon', x: 470, y: 330, hp: 900000, maxHp: 900000, level: 5, flags: 16, targetId: '' });
  const s0 = switches, sts = new Set();
  for (let i = 0; i < 40 && G.ents.get('b:1').hp >= 900000; i++) { sts.add(G.status()); await wait(150); }
  await wait(1500);
  const r = { goalCh2, bossHit: G.ents.get('b:1').hp < 900000, switchesAfter: switches - s0, sts: [...sts].slice(0, 5) };
  console.log(r);
  G.w.close();
  const ok = r.goalCh2 && r.bossHit && r.switchesAfter === 0;
  console.log(ok ? 'OK – lebender Boss auf dem aktuellen Kanal gewinnt, kein Wechsel weg' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
