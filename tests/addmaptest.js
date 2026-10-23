// 2.34.3: Adds nur vom Boss, der wirklich da steht (Boss-Eintrag dieser Map) – live: auf Sea of Darkness stand der
// Feldboss Divermon, normale Divermon galten als Adds, weil MarineDevimon auf Odaiba Divermon ruft
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const G = makeWorld({ slot: 0, tag: 'S', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.digimon.puppetmon = { name: 'Puppetmon' }; content.digimon.pumpkinmon = { name: 'Pumpkinmon' };
      // Boss hier ohne Adds; Pumpkinmon ist nur Add eines Bosses auf einer anderen Map
      content.spawns.native_forest.bosses = [{ species: 'puppetmon', at: 'boss_p', level: 3, respawnMs: 900000 }];
      content.spawns.primary_village.bosses = [{ species: 'kunemon', at: 'x', level: 3, respawnMs: 900000, adds: { species: 'pumpkinmon', count: 2 } }];
      MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'boss_p', x: 450, y: 330 });
    },
    extraEnts: () => [
      { id: 'b:1', kind: 2, defId: 'puppetmon', x: 450, y: 330, hp: 100000, maxHp: 100000, level: 3, flags: 16 | 32, targetId: 'p:me' },
      { id: 'a:1', kind: 2, defId: 'pumpkinmon', x: 380, y: 360, hp: 300, maxHp: 300, level: 3, flags: 32, targetId: '' },
    ] });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20 }));
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  const seq = [], st = new Set();
  for (let i = 0; i < 20; i++) { const id = G.store.getState().target?.id || '-'; if (seq[seq.length - 1] !== id) seq.push(id); st.add(G.status()); await wait(150); }
  G.w.close();
  const n = seq.filter((x) => x !== '-');
  console.log({ seq: seq.join(' > ') });
  const ok1 = n[0] === 'b:1' && ![...st].some((s) => /Adds zuerst/.test(s));
  console.log(ok1 ? 'OK – fremde Adds zählen nicht, der Boss-Angreifer zuerst' : 'FEHLER – fremde Adds');

  // Mitläufer, Leader in der Boss-Rotation: echte Adds des Bosses hier trotzdem nicht selbst angreifen
  const accounts = { leader: 0, popup: true, mirror: false, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
  const F = makeWorld({ slot: 1, accounts, tag: 'F', mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.digimon.puppetmon = { name: 'Puppetmon' }; content.digimon.pumpkinmon = { name: 'Pumpkinmon' };
      content.spawns.native_forest.bosses = [{ species: 'puppetmon', at: 'boss_p', level: 3, respawnMs: 900000, adds: { species: 'pumpkinmon', count: 2 } }];
      MAPS.native_forest.layers[0].objects.push({ type: 'spawn', name: 'boss_p', x: 450, y: 330 });
    },
    extraEnts: () => [
      { id: 'b:1', kind: 2, defId: 'puppetmon', x: 450, y: 330, hp: 100000, maxHp: 100000, level: 3, flags: 16 | 32, targetId: '' },
      { id: 'a:1', kind: 2, defId: 'pumpkinmon', x: 380, y: 360, hp: 300, maxHp: 300, level: 3, flags: 0, targetId: '' },
    ] });
  F.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20 }));
  F.w.eval(script);
  const { BroadcastChannel } = require('worker_threads');
  const bus = new BroadcastChannel('digibot-group');
  const me = F.ents.get('t:me');
  const lead = () => bus.postMessage({ type: 'state', slot: 0, role: 'leader', name: 'Lead', inWorld: true, mapId: 'native_forest', channel: 1,
    x: me?.x ?? 300, y: me?.y ?? 300, bot: true, status: 'Bosse: warte', quests: {}, ents: [], targetId: null, hunt: [], noFight: false,
    task: null, talks: [], done: [], fin: [], deferred: [], fight: false, farm: true, serve: false });
  const iv = setInterval(lead, 300); lead();
  await wait(800);
  F.w.document.querySelector('[data-act="bot"]').click();
  const fst = new Set(), fseq = [];
  for (let i = 0; i < 20; i++) { const id = F.store.getState().target?.id || '-'; if (fseq[fseq.length - 1] !== id) fseq.push(id); fst.add(F.status()); await wait(150); }
  clearInterval(iv); bus.close(); F.w.close();
  console.log({ fseq: fseq.join(' > '), status: [...fst].slice(0, 4) });
  const ok2 = !fseq.includes('a:1') && ![...fst].some((s) => /Adds zuerst/.test(s));
  console.log(ok2 ? 'OK – Mitläufer jagt bei Boss-Rotation des Leaders keine Adds' : 'FEHLER – Mitläufer jagt Adds');
  process.exit(ok1 && ok2 ? 0 : 1);
})();
