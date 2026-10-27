// 3.0.7: Reaper auf Tamers-Maps – die eingestellte Zielform (DNA, z. B. ClavisAngemon) ist dort blockiert
// (blockReason „reaper“). Vorher blieb das Digimon in der Grundform; jetzt digitiert es zur höchsten freien Form.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const G = makeWorld({ slot: 0, tag: 'R', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] },
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) { content.digimon.bigmon_hunt = { name: 'Bigmon' }; content.digimon.garurumon = { name: 'Garurumon' }; content.digimon.clavisangemon = { name: 'ClavisAngemon' }; },
    extraEnts: (id) => (id === 'primary_village' ? [{ id: 'm:boss', kind: 2, defId: 'bigmon_hunt', level: 3, x: 640, y: 330, hp: 5000, maxHp: 5000, flags: 16, targetId: '' }] : []) });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.requestEvents = async () => { const now = Date.now(); return [{ id: 'mega_hunt', now, slot: { key: 's1', startMs: now - 60000, endMs: now + 3600000 }, boss: 'bigmon_hunt', mapId: 'primary_village', channel: 1, state: 'up', next: { boss: 'bigmon_hunt', mapId: 'primary_village', startMs: now + 7200000 } }]; };
  const setPartner = (sp) => { const s = G.state; G.store.setState({ me: { ...s.me, partner: { ...s.me.partner, species: sp, name: sp,
    evolutions: [{ species: 'gabumon', from: null, stage: 'rookie', unlocked: true, isCurrent: sp === 'gabumon' },
      { species: 'garurumon', from: 'gabumon', stage: 'champion', level: 1, dsCost: 0, unlocked: true, canEvolveNow: sp === 'gabumon', isCurrent: sp === 'garurumon' },
      { species: 'clavisangemon', from: 'garurumon', stage: 'jogress', level: 1, dsCost: 0, unlocked: true, canEvolveNow: false, blocked: true, blockReason: 'reaper', isCurrent: false }] } } }); };
  cmds.evolve = (sp) => { if (sp !== 'clavisangemon') setPartner(sp); };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ eventsOnly: true, hunt: true, wboss: false, autopilot: false, apEvo: 'clavisangemon', hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 20 }));
  G.w.eval(script);
  await wait(1000);
  setPartner('gabumon');
  G.w.document.querySelector('[data-act="bot"]').click();
  let evolved = false;
  for (let i = 0; i < 60 && !evolved; i++) { if (G.state.me.partner.species === 'garurumon') evolved = true; await wait(150); }
  const log = [...G.w.document.querySelectorAll('[data-f="log"] > div')].map((d) => d.textContent);
  const r = { evolved, species: G.state.me.partner.species, noted: log.some((l) => /Reaper blockiert – digitiere stattdessen zu Garurumon/.test(l)) };
  console.log(r);
  G.w.close();
  const ok = r.evolved && r.noted;
  console.log(ok ? 'OK – Reaper: höchste freie Form statt Grundform' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
