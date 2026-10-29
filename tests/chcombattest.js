// 3.1.31: Boss-Rotation will den Kanal wechseln, ein zäher Angreifer (live Tortomon, 41 000 HP) schlägt das Digimon.
// Nach den 10 s Aufräumen versuchte der Bot nur noch zu wechseln; das Spiel lehnte ab („You can't change channel while
// fighting.“, code channel_in_combat) und der Bot ließ sich verprügeln. Jetzt: nach der Ablehnung weiter mit Taste 1.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const G = makeWorld({ slot: 0, tag: 'C', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.digimon.tyrmon = { name: 'Tyrmon', base: { hp: 1000 }, growth: { hp: 100 }, mob: { expBase: 6.5 } };
      content.digimon.tortomon = { name: 'Tortomon' };
      content.spawns.native_forest.bosses = [{ species: 'tyrmon', at: 'ridge', level: 5, respawnMs: 240000 }];
      MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'ridge', x: 470, y: 330 });
    } });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 1, maxClients: 40 }, { channel: 2, roomId: 'r2', clients: 1, maxClients: 40 }];
  // Ch 1: Boss erst in 2 min, Ch 2: Boss lebt -> Rotation will auf Ch 2
  cmds.requestBossPins = () => G.store.setState({ bossPins: { at: G.w.performance.now(), bosses: [
    { map: 'native_forest', index: 0, channel: 1, respawnInMs: 120000 }, { map: 'native_forest', index: 0, channel: 2, hp: 1000 }] } });
  cmds.requestMapInfo = () => {};
  let switches = 0, follows = 0;
  const chat = [];
  cmds.switchChannel = () => {
    switches++;
    const a = G.ents.get('m:tort');
    if (a && a.hp > 0) { chat.push({ channel: 'system', text: "You can't change channel while fighting.", ts: Date.now(), notice: true, code: 'channel_in_combat' }); G.store.setState({ chat: [...chat] }); }
  };
  cmds.partnerFollow = () => { follows++; };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, farm: true, farmMode: 'boss', farmBosses: ['native_forest#tyrmon'], farmChannels: [1, 2],
    hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 8, radius: 500 }));
  const presses = [];
  G.w.addEventListener('keydown', (e) => { if (e.code === 'Digit1') presses.push(Date.now()); }, true);
  G.w.eval(script);
  await wait(1000);
  // zäher Angreifer direkt am Digimon
  G.ents.set('m:tort', { id: 'm:tort', kind: 2, defId: 'tortomon', level: 60, x: 430, y: 330, hp: 1000000, maxHp: 1000000, flags: 0, targetId: 'p:me' });
  G.w.document.querySelector('[data-act="bot"]').click();
  const t0 = Date.now(), sts = new Set();
  while (Date.now() - t0 < 22000) { sts.add(G.status().replace(/\d+/g, '#').slice(0, 80)); await wait(250); }
  const late = presses.filter((t) => t - t0 > 14000).length; // nach Ablauf der 10-s-Grenze
  const r = { switches, follows, pressesTotal: presses.length, pressesAfter14s: late, statuses: [...sts].slice(-6) };
  console.log(r);
  G.w.close();
  const ok = switches >= 1 && late >= 3;
  console.log(ok ? 'OK – Wechsel abgelehnt, der Bot besiegt weiter den Angreifer' : 'FEHLER – nach der Ablehnung kein Angriff mehr');
  process.exit(ok ? 0 : 1);
})();
