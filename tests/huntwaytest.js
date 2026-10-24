// 2.55.0: Event unterwegs – ein aggressives Monster greift beim Losgehen an. Vorher: „erst Angreifer abwehren“, der Bot
// blieb im Kampf hängen. Jetzt: Digimon zurückrufen und weiter zur Event-Map (wie die Boss-Rotation auf dem Weg).
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const G = makeWorld({ slot: 0, tag: 'H', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) { content.digimon.bigmon_hunt = { name: 'Bigmon' }; },
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'm:agg', kind: 2, defId: 'goblimon', level: 5, x: 430, y: 330, hp: 900000, maxHp: 900000, flags: 32, targetId: 'p:me' }]
      : id === 'primary_village' ? [{ id: 'm:boss', kind: 2, defId: 'bigmon_hunt', level: 3, x: 640, y: 330, hp: 5000, maxHp: 5000, flags: 16, targetId: '' }] : []) });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  let follows = 0; cmds.partnerFollow = () => { follows++; };
  cmds.requestEvents = async () => { const now = Date.now(); return [{ id: 'mega_hunt', now, slot: { key: 's1', startMs: now - 60000, endMs: now + 3600000 },
    boss: 'bigmon_hunt', mapId: 'primary_village', channel: 1, state: 'up', next: { boss: 'bigmon_hunt', mapId: 'primary_village', startMs: now + 7200000 } }]; };
  // greift an, solange man in seiner Nähe ist
  setInterval(() => { const a = G.ents.get('m:agg'), me = G.ents.get('t:me'); if (a && me) a.targetId = Math.hypot(a.x - me.x, a.y - me.y) < 250 ? 'p:me' : ''; }, 50);
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20, hunt: true, autopilot: false, levelRoute: false }));
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  let reached = false, aggHit = false;
  for (let i = 0; i < 80 && !reached; i++) { if (G.ents.get('m:agg')?.hp < 900000) aggHit = true; if (G.state.world.mapId === 'primary_village') reached = true; await wait(150); }
  const r = { reached, aggHit, follows, status: G.status() };
  console.log(r);
  G.w.close();
  const ok = reached && !aggHit;
  console.log(ok ? 'OK – unterwegs zum Event nicht aufhalten lassen, weiter zur Event-Map' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
