// 3.0.6: Kill-Quest „besiege Tortomon“ – ein named Tortomon (Boss-Flag) steht weit weg, normale Tortomon direkt daneben.
// Vorher lief der Autopilot zum Boss („sichtbaren Boss bekämpfen“) und griff danach das normale Tortomon neben sich
// nicht an, weil der Zielpunkt der Boss-Aufgabe weit weg lag (live: 77 s stehen geblieben, Destiny Lake).
// Jetzt: normale Monster der Art zählen genauso – er bekämpft sie und läuft nicht zum Boss.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const G = makeWorld({ slot: 0, tag: 'Q', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] }, q_tort: { state: 1, counters: [0] } },
    setup({ content }) {
      content.digimon.tortomon = { name: 'Tortomon' };
      content.quests.q_tort = { id: 'q_tort', name: 'Shells', giver: 'gennai', turnIn: 'gennai', minLevel: 1, objectives: [{ kind: 'kill', species: 'tortomon', count: 3 }] };
      content.spawns.native_forest.zones.meadow.entries.push({ species: 'tortomon', level: [1, 3] });
      content.spawns.native_forest.bosses = [{ species: 'tortomon', level: 5, at: 'meadow', respawnMs: 300000, title: 'Tortomon Elder' }];
    },
    extraEnts: (id) => (id === 'native_forest' ? [
      { id: 'm:n1', kind: 2, defId: 'tortomon', level: 2, x: 460, y: 330, hp: 300, maxHp: 300, flags: 0, targetId: '' },
      { id: 'm:n2', kind: 2, defId: 'tortomon', level: 2, x: 430, y: 380, hp: 300, maxHp: 300, flags: 0, targetId: '' },
      { id: 'm:n3', kind: 2, defId: 'tortomon', level: 2, x: 500, y: 300, hp: 300, maxHp: 300, flags: 0, targetId: '' },
      { id: 'm:boss', kind: 2, defId: 'tortomon', level: 5, x: 900, y: 330, hp: 900000, maxHp: 900000, flags: 16, targetId: '' }] : []),
    onKill: (m, w) => { const q = w.state.me.quests.q_tort; if (q?.state === 1) { const c = q.counters[0] + 1; w.setQuest('q_tort', { state: c >= 3 ? 2 : 1, counters: [c] }); } } });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, apGrind: false, apBatch: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20, radius: 600 }));
  G.w.eval(script);
  await wait(1000);
  G.w.document.querySelector('[data-act="bot"]').click();
  let maxX = 0, bossHit = false, done = false;
  for (let i = 0; i < 120 && !done; i++) {
    maxX = Math.max(maxX, G.ents.get('t:me').x);
    if ((G.ents.get('m:boss')?.hp ?? 900000) < 900000) bossHit = true;
    if (G.state.me.quests.q_tort?.state === 2) done = true;
    await wait(150);
  }
  const r = { done, kills: G.kills, maxX: Math.round(maxX), bossHit, status: G.status() };
  console.log(r);
  G.w.close();
  const ok = done && !bossHit && maxX < 700;
  console.log(ok ? 'OK – normale Tortomon bekämpft, nicht zum Boss gelaufen' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
