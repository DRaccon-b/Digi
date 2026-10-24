// 2.53.0: Lern-Route in der Zone – ein Angreifer weit über dem Digimon (+28) wird nicht bekämpft, die passenden Monster schon.
// Vorher nahm die Zielwahl des Ticks den starken Angreifer sofort wieder: Rückruf und Taste 1 wechselten sich ab.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const G = makeWorld({ slot: 0, tag: 'W', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [[360, 300], [420, 340], [470, 280]],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.digimon.kunemon = { name: 'Kunemon', base: { hp: 300 }, growth: { hp: 20 }, mob: { expBase: 6.5 } };
      content.digimon.bigmon = { name: 'Bigmon', base: { hp: 400 }, growth: { hp: 30 }, mob: { expBase: 6.5 } };
      content.spawns.native_forest.zones = { meadow: { entries: [{ species: 'kunemon', level: [1, 3], weight: 1 }] } };
    },
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'm:a', kind: 2, defId: 'bigmon', x: 440, y: 330, hp: 900000, maxHp: 900000, level: 30, flags: 32, targetId: 'p:me' }] : []) });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  let follows = 0; cmds.partnerFollow = () => { follows++; };
  cmds.listChannels = async () => [{ channel: 1, roomId: 'r1', clients: 1, maxClients: 40 }];
  cmds.requestMapInfo = () => {}; cmds.requestBossPins = () => {};
  const st = G.store.getState();
  G.store.setState({ me: { ...st.me, partner: { ...st.me.partner, species: 'agumon', name: 'agumon', level: 2, stats: { at: 200, as: 1200 }, evolutions: [{ species: 'agumon' }] } } });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 8, radius: 300,
    levelRoute: true, levelA2: false, levelBoss: false, levelEvo: false, farmChannels: [1] }));
  const keys = []; G.w.addEventListener('keydown', (e) => keys.push({ c: e.code, t: Date.now(), tg: G.state.target?.id }), true);
  G.w.eval(script);
  await wait(1000);
  // ensure the strong one actually stays an attacker
  // wie im Spiel: greift an, solange man in seiner Nähe ist – weiter weg lässt er los (Verfolgungsreichweite)
  setInterval(() => { const a = G.ents.get('m:a'), me = G.ents.get('t:me'); if (a && me) a.targetId = Math.hypot(a.x - me.x, a.y - me.y) < 200 ? 'p:me' : ''; }, 50);
  G.w.document.querySelector('[data-act="bot"]').click();
  const t0 = Date.now(); const f0 = follows;
  const sts = new Set();
  for (let i = 0; i < 40; i++) { await wait(250); sts.add(G.status()); }
  const onStrong = keys.filter((k) => k.c === 'Digit1' && k.t > t0 && k.tg === 'm:a').length;
  const onOther = keys.filter((k) => k.c === 'Digit1' && k.t > t0 && k.tg !== 'm:a').length;
  console.log({ onStrong, onOther, follows: follows - f0, sts: [...sts].slice(0, 6), kills: G.kills });
  G.w.close();
  const ok = onStrong === 0 && G.kills > 0;
  console.log(ok ? 'OK – starker Angreifer nicht bekämpft, passende Monster schon' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
