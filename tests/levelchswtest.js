// 2.48.0: Lern-Route mit Feldboss auf Ch 1 und Ch 2 – nach jedem Sieg gleich zum lebenden Boss auf dem anderen Kanal.
// Live: nach drei gelungenen Wechseln galt der vierte als „klappt nicht“ (Fehlversuche wurden nie zurückgesetzt), Ch 2
// wurde 5 min gemieden und der Bot grindete weiter, obwohl dort der Boss lebte.
// Wie in der Boss-Rotation: gleich nach dem Sieg wechseln, auch wenn gerade ein Monster angreift (nach jedem Kill greift eins an).
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const alive = { 1: true, 2: true }, killedAt = { 1: 0, 2: 0 };
  const G = makeWorld({ slot: 0, tag: 'W', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [[360, 300], [420, 340]],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.digimon.kunemon = { name: 'Kunemon', base: { hp: 300 }, growth: { hp: 20 }, mob: { expBase: 6.5 } };
      content.digimon.bossmon = { name: 'Bossmon', base: { hp: 3000 }, growth: { hp: 100 }, mob: { expBase: 20 } };
      content.spawns.native_forest.bosses = [{ species: 'bossmon', at: 'boss_b', level: 5, respawnMs: 120000 }];
      MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'boss_b', x: 520, y: 330 });
    } });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 1, maxClients: 40 }, { channel: 2, roomId: 'r2', clients: 1, maxClients: 40 }];
  cmds.requestMapInfo = () => {};
  cmds.requestBossPins = () => G.store.setState({ bossPins: { at: G.w.performance.now(), bosses: [1, 2].map((ch) => (alive[ch]
    ? { map: 'native_forest', index: 0, channel: ch } : { map: 'native_forest', index: 0, channel: ch, respawnInMs: 120000 })) } });
  // Verzögerung Sieg -> Wechsel; erlaubt: 4 s, bzw. bis 10 s nach dem letzten Wechsel (Mindestabstand wie in der Boss-Rotation)
  const switches = [], delays = []; let lastKill = 0, lastSw = 0, allow = 4000;
  cmds.switchChannel = (roomId) => { switches.push(roomId); if (lastKill) { delays.push({ ms: Date.now() - lastKill, allow }); lastKill = 0; } lastSw = Date.now(); const s = G.store.getState(); G.store.setState({ world: { ...s.world, channel: roomId === 'r2' ? 2 : 1 }, target: null }); };
  let kills = 0, n = 0;
  const tick = setInterval(() => { // Boss je Kanal: lebt -> sichtbar; besiegt -> 12 s später wieder da
    const ch = G.store.getState().world.channel, now = Date.now();
    for (const c of [1, 2]) if (!alive[c] && now - killedAt[c] > 12000) alive[c] = true;
    const b = [...G.ents.values()].find((e) => e.defId === 'bossmon');
    if (b && b.hp <= 0) {
      G.ents.delete(b.id); alive[b.ch] = false; killedAt[b.ch] = now; kills++; lastKill = alive[3 - b.ch] ? now : 0; allow = Math.max(4000, 10000 - (now - lastSw) + 1500); // nur messen, wenn der andere lebt
      const m = G.ents.get('m:1'); if (m) { m.hp = 300; m.targetId = 'p:me'; } // Angreifer direkt nach dem Sieg
    }
    else if (b && b.ch !== ch) G.ents.delete(b.id);
    else if (!b && alive[ch]) { n++; G.ents.set('b:' + n, { id: 'b:' + n, ch, kind: 2, defId: 'bossmon', x: 520, y: 330, hp: 300, maxHp: 300, level: 5, flags: 16, targetId: '' }); }
  }, 100);
  const st = G.store.getState();
  G.store.setState({ me: { ...st.me, partner: { ...st.me.partner, level: 3, stats: { at: 2000, as: 1200 } } } });
  G.w.localStorage.setItem('cdigi.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 10, radius: 250,
    levelRoute: true, levelA2: false, levelBoss: true, farmChannels: [1, 2] }));
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  const t0 = Date.now();
  while (Date.now() - t0 < 80000 && kills < 6) await wait(200);
  clearInterval(tick);
  const banned = /gemieden/.test(G.w.document.body.textContent);
  console.log({ kills, switches: switches.length, delays, banned, status: G.status() });
  G.w.close();
  const ok = kills >= 6 && !banned && delays.length >= 2 && delays.every((d) => d.ms < d.allow);
  console.log(ok ? 'OK – Boss abwechselnd auf Ch 1 und Ch 2, kein Kanal gemieden' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
