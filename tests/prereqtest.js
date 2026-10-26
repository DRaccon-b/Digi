// 2.12.2: Mitläufer fehlt eine Vorquest (Story) – er versucht die Folgequest nicht sinnlos anzunehmen, sondern holt die
// fehlende Story-Quest nach (annehmen, abgeben) und nimmt danach die Folgequest an
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const B = makeWorld({ slot: 1, tag: 'Folger', accounts, mobs: [], extraEnts: (id) => (id === 'native_forest' ? [{ id: 'n:elder', kind: 3, defId: 'elder', x: 330, y: 300, hp: 0, flags: 0 }] : []),
  quests: { q00_meet_gennai: { state: 3, counters: [] } },
  setup({ content, MAPS }) {
    content.npcs.elder = { name: 'Elder' };
    MAPS.native_forest.layers[0].objects.push({ type: 'npc', name: 'elder', x: 330, y: 300, properties: [{ name: 'npcId', type: 'string', value: 'elder' }] });
    content.quests.q07_word = { id: 'q07_word', name: 'Word', giver: 'elder', turnIn: 'elder', minLevel: 1, prereq: ['q00_meet_gennai'], objectives: [{ kind: 'kill', species: 'kunemon', count: 1 }] };
    content.quests.q07b_hall = { id: 'q07b_hall', name: 'Hall', giver: 'elder', turnIn: 'elder', minLevel: 1, prereq: ['q07_word'], objectives: [{ kind: 'kill', species: 'kunemon', count: 5 }] };
    content.quests.q02_first_steps.minLevel = 99;
  } });
B.w.eval(script);
// Spiel: „Word“ ist gleich nach dem Annehmen erfüllt
setInterval(() => { const s = B.store.getState(), q = s.me.quests.q07_word; if (q?.state === 1) B.store.setState({ me: { ...s.me, quests: { ...s.me.quests, q07_word: { state: 2, counters: [1] } } } }); }, 200);
const bus = require('./groupbus')('digibot-group');
const talks = [{ key: 'accept:q07b_hall@1', tkey: 'accept:q07b_hall', kind: 'talk', at: Date.now(), purpose: 'accept', questId: 'q07b_hall', objIndex: null, need: null,
  npcId: 'elder', pool: null, loc: { mapId: 'native_forest', x: 330, y: 300 }, label: '„Hall“ annehmen bei Elder' }];
const tick = setInterval(() => bus.postMessage({ type: 'state', slot: 0, role: 'leader', name: 'Lead', inWorld: true, mapId: 'native_forest', channel: 1, x: 400, y: 330,
  bot: true, status: 'x', quests: { q07b_hall: { state: 1, counters: [0] } }, fin: ['q00_meet_gennai', 'q07_word'], ents: [], talks, done: [], busy: null, task: null, hunt: [], targetId: null }), 300);
const statuses = [];
const watch = setInterval(() => { const s = B.status(); if (s !== statuses[statuses.length - 1]) statuses.push(s); }, 100);
(async () => {
  await wait(1200);
  B.w.document.querySelector('[data-act="bot"]').click();
  const t0 = Date.now();
  while (Date.now() - t0 < 40000 && B.state.me.quests.q07b_hall?.state !== 1) await wait(100);
  clearInterval(tick); clearInterval(watch);
  const q = B.state.me.quests;
  const futile = statuses.filter((s) => /„Hall“ annehmen/.test(s) && /keine passende|neu an/.test(s)).length;
  const r = { word: q.q07_word?.state, hall: q.q07b_hall?.state, futile, secs: Math.round((Date.now() - t0) / 1000) };
  console.log(r);
  const ok = r.word === 3 && r.hall === 1 && futile === 0;
  console.log(ok ? 'OK – fehlende Story-Quest nachgeholt, kein sinnloser Dialog' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
