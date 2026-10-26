// 3.0.2: Autopilot läuft zu einem Quest-Boss, ein aggressives Monster verfolgt ihn. Wie in der Boss-Rotation: unterwegs
// nicht kämpfen, weiter zum Spawnpunkt; dort (Boss noch nicht da) den Verfolger erledigen. Vorher blieb der Bot unterwegs
// stehen und wehrte jeden Verfolger ab.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SPOT = { x: 1200, y: 330 };
(async () => {
  const G = makeWorld({ slot: 0, tag: 'B', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] }, q_boss: { state: 1, counters: [0] } },
    setup({ content, MAPS }) {
      content.digimon.bigmon = { name: 'Bigmon' }; content.digimon.chaser = { name: 'Chaser' };
      content.quests.q_boss = { id: 'q_boss', name: 'Big Bounty', giver: 'gennai', turnIn: 'gennai', minLevel: 1, objectives: [{ kind: 'kill', species: 'bigmon', count: 1 }] };
      content.spawns.native_forest.bosses = [{ species: 'bigmon', level: 5, at: 'boss_big', respawnMs: 600000 }];
      MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'boss_big', x: SPOT.x, y: SPOT.y });
    },
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'm:chase', kind: 2, defId: 'chaser', level: 3, x: 430, y: 330, hp: 5000, maxHp: 5000, flags: 32, targetId: 'p:me' }] : []) });
  // Verfolger: läuft dem Tamer hinterher und greift an
  setInterval(() => { const c = G.ents.get('m:chase'), t = G.ents.get('t:me'); if (!c || !t || c.hp <= 0) return; const d = Math.hypot(t.x - c.x, t.y - c.y); if (d > 30) { c.x += (t.x - c.x) / d * 7; c.y += (t.y - c.y) / d * 7; } c.targetId = 'p:me'; }, 50);
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, apGrind: false, apBatch: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20 }));
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  let hitFar = 0, hitNear = 0, arrived = false;
  let last = 5000;
  for (let i = 0; i < 160; i++) {
    const c = G.ents.get('m:chase'), t = G.ents.get('t:me'), d = Math.hypot(t.x - SPOT.x, t.y - SPOT.y);
    if (d <= 200) arrived = true;
    if (c && c.hp < last) { if (d > 260) hitFar++; else hitNear++; last = c.hp; }
    if (arrived && (c?.hp ?? 0) <= 0) break;
    await wait(100);
  }
  const r = { arrived, hitFar, hitNear, chaserHp: G.ents.get('m:chase')?.hp, status: G.status() };
  console.log(r);
  G.w.close();
  const ok = arrived && hitFar === 0 && hitNear > 0;
  console.log(ok ? 'OK – unterwegs weiter zum Boss, am Spawnpunkt Verfolger erledigt' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
