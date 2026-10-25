// 2.52.1: Digimon-Wechsel in der Lern-Route – geplant wird immer für das aktuelle Digimon. Lv 46 reist nach Primary
// Village (Bigmon Lv 48–50, Feldboss Bossmon Lv 50, ein aggressiver Bigmon Lv 50 am Eingang). Dort wird auf ein Lv-2-Digimon
// gewechselt: Zone und Boss des alten verwerfen, den Lv-50-Angreifer nicht bekämpfen (über +15), zurück nach Native Forest.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const G = makeWorld({ slot: 0, tag: 'W', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [[360, 300], [420, 340]],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.digimon.kunemon = { name: 'Kunemon', base: { hp: 300 }, growth: { hp: 20 }, mob: { expBase: 6.5 } };
      content.digimon.bigmon = { name: 'Bigmon', base: { hp: 400 }, growth: { hp: 30 }, mob: { expBase: 6.5 } };
      content.digimon.bossmon = { name: 'Bossmon', base: { hp: 3000 }, growth: { hp: 100 }, mob: { expBase: 20 } };
      content.spawns.native_forest.zones = { meadow: { entries: [{ species: 'kunemon', level: [1, 3], weight: 1 }] } };
      content.spawns.primary_village.zones = { field: { entries: [{ species: 'bigmon', level: [48, 50], weight: 1 }] } };
      content.spawns.primary_village.bosses = [{ species: 'bossmon', at: 'boss_b', level: 50, respawnMs: 900000 }];
      MAPS.native_forest.layers[0].objects.push({ type: 'zone', name: 'meadow', x: 300, y: 250, width: 200, height: 150 });
      MAPS.primary_village.layers[0].objects.push({ type: 'zone', name: 'field', x: 500, y: 250, width: 200, height: 150 }, { type: 'spawn', name: 'boss_b', x: 700, y: 330 });
    },
    extraEnts: (id) => (id === 'primary_village' ? [
      { id: 'b:1', kind: 2, defId: 'bossmon', x: 700, y: 330, hp: 900000, maxHp: 900000, level: 50, flags: 16, targetId: '' },
      { id: 'm:a', kind: 2, defId: 'bigmon', x: 860, y: 330, hp: 900000, maxHp: 900000, level: 50, flags: 32, targetId: 'p:me' },
    ] : []) });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 1, maxClients: 40 }];
  cmds.requestMapInfo = () => {}; cmds.requestBossPins = () => {};
  const st = G.store.getState();
  const mon = (species, level) => ({ ...G.store.getState().me.partner, species, name: species, level, stats: { at: 2000, as: 1200 }, evolutions: [{ species }] });
  G.store.setState({ me: { ...st.me, partner: mon('hawkmon', 46) } });
  G.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 8, radius: 300,
    levelRoute: true, levelA2: false, levelBoss: true, levelEvo: false, farmChannels: [1] }));
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  for (let i = 0; i < 120 && G.state.world.mapId !== 'primary_village'; i++) await wait(150);
  const arrived = G.state.world.mapId === 'primary_village';
  // angekommen: auf ein Lv-2-Digimon wechseln
  const s1 = G.store.getState(); G.store.setState({ me: { ...s1.me, partner: { ...mon('agumon', 2), entityId: s1.me.partner.entityId } }, target: null });
  const bossHp = G.ents.get('b:1')?.hp, atkHp = G.ents.get('m:a')?.hp;
  let back = false;
  for (let i = 0; i < 80 && !back; i++) { if (G.state.world.mapId === 'native_forest') back = true; await wait(150); }
  const r = { arrived, back, bossHit: (G.ents.get('b:1')?.hp ?? bossHp) < bossHp, atkHit: (G.ents.get('m:a')?.hp ?? atkHp) < atkHp,
    noted: /Digimon gewechselt/.test(G.w.document.body.textContent), status: G.status() };
  console.log(r);
  G.w.close();
  const ok = arrived && back && !r.bossHit && !r.atkHit && r.noted;
  console.log(ok ? 'OK – nach dem Wechsel neu geplant: kein Boss/Angreifer des alten Digimons, zurück in die passende Zone' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
