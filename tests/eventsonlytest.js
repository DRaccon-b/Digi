// 3.0.4: Modus „Nur Event/Weltboss“. Ohne Event greift der Bot nichts an (Monster in der Nähe bleiben unberührt); ist
// das Event angesagt, reist er zur Event-Map und kämpft gegen den Event-Boss.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function trial(withEvent) {
  const G = makeWorld({ slot: 0, tag: withEvent ? 'E' : 'O', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] },
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) { content.digimon.bigmon_hunt = { name: 'Bigmon' }; },
    extraEnts: (id) => (id === 'primary_village' ? [{ id: 'm:boss', kind: 2, defId: 'bigmon_hunt', level: 3, x: 640, y: 330, hp: 5000, maxHp: 5000, flags: 16, targetId: '' }] : []) });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.requestEvents = async () => { const now = Date.now(); return withEvent
    ? [{ id: 'mega_hunt', now, slot: { key: 's1', startMs: now - 60000, endMs: now + 3600000 }, boss: 'bigmon_hunt', mapId: 'primary_village', channel: 1, state: 'up', next: { boss: 'bigmon_hunt', mapId: 'primary_village', startMs: now + 7200000 } }]
    : [{ id: 'mega_hunt', now, slot: null, state: 'idle', next: { boss: 'bigmon_hunt', mapId: 'primary_village', startMs: now + 7200000 } }]; };
  // 3.0.5: Beim Event digitiert der Bot vor dem Kampf in die höchste Form (hier Gabumon → Garurumon), auch außerhalb des Autopiloten
  const setPartner = (sp) => { const s = G.state; G.store.setState({ me: { ...s.me, partner: { ...s.me.partner, species: sp, name: sp === 'garurumon' ? 'Garurumon' : 'Gabumon',
    evolutions: [{ species: 'gabumon', from: null, stage: 'rookie', unlocked: true, isCurrent: sp === 'gabumon' },
      { species: 'garurumon', from: 'gabumon', stage: 'champion', level: 1, dsCost: 0, unlocked: true, canEvolveNow: sp === 'gabumon', isCurrent: sp === 'garurumon' }] } } }); };
  cmds.evolve = (sp) => { setPartner(sp); };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ eventsOnly: true, hunt: true, wboss: true, autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20, levelRoute: true }));
  G.w.eval(script);
  await wait(1000);
  setPartner('gabumon');
  const mode = G.w.document.querySelector('[data-mode].on')?.dataset.mode;
  G.w.document.querySelector('[data-act="bot"]').click();
  let reached = false, bossHit = false, evolved = false;
  for (let i = 0; i < (withEvent ? 80 : 30); i++) {
    if (G.state.world.mapId === 'primary_village') reached = true;
    if (G.state.me.partner.species === 'garurumon') evolved = true;
    if ((G.ents.get('m:boss')?.hp ?? 5000) < 5000) bossHit = true;
    if (bossHit) break;
    await wait(150);
  }
  const r = { withEvent, mode, kills: G.kills, reached, evolved, bossHit, status: G.status() };
  G.w.close();
  return r;
}
(async () => {
  const quiet = await trial(false), event = await trial(true);
  console.log(quiet, event);
  const ok = quiet.mode === 'events' && quiet.kills === 0 && !quiet.reached && /Nur Event\/Weltboss: warte/.test(quiet.status)
    && event.reached && event.evolved && event.bossHit;
  console.log(ok ? 'OK – ohne Event nichts angegriffen, mit Event hingereist, digitiert und gekämpft' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
