// 3.2.7 (Nutzer 03.11.: zweites Fenster als Mitläufer soll mit einem anderen Digimon abgeben). Bisher wechselte ein Mitläufer nie
// das Digimon (ensurePartner: „Partner-IDs gehören zum Account des Leaders“) – seit 3.2.6 hat jeder Account eigene Werte.
// Mitläufer-Fenster (Account foll) mit Quest-Digimon pa (Gabumon) und Abgabe-Digimon pb (Patamon); der Leader (über den
// Gruppenkanal nachgebaut) gibt bei Gennai ab -> der Mitläufer wechselt vorher auf pb, gibt mit pb ab und wechselt danach zurück auf pa.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };

async function run(extra) {
  const G = makeWorld({ slot: 1, tag: 'Foll' + (extra ? 'X' : ''), accounts, quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 2, counters: [2] }, ...(extra ? { q_extra: { state: 2, counters: [1] } } : {}) },
    setup({ content }) { if (extra) content.quests.q_extra = { id: 'q_extra', name: 'Extra', giver: 'gennai', turnIn: 'gennai', minLevel: 1, objectives: [{ kind: 'kill', species: 'kunemon', count: 1 }] }; } });
  const s0 = G.store.getState();
  const team = (active) => [{ partnerId: 'pa', species: 'gabumon', level: 10, carried: true, active: active === 'pa' }, { partnerId: 'pb', species: 'patamon', level: 10, carried: true, active: active === 'pb' }];
  G.store.setState({ archive: { partners: team('pa') }, me: { ...s0.me, partner: { ...s0.me.partner, species: 'gabumon', stage: 'rookie', evolutions: [{ species: 'gabumon', from: null, unlocked: true, isCurrent: true }] } } });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  const switches = [], turnins = [];
  cmds.switchPartner = (id) => {
    switches.push(id);
    const s = G.store.getState();
    G.store.setState({ archive: { partners: team(id) }, me: { ...s.me, partner: { ...s.me.partner, species: id === 'pa' ? 'gabumon' : 'patamon', evolutions: [{ species: id === 'pa' ? 'gabumon' : 'patamon', from: null, unlocked: true, isCurrent: true }] } } });
  };
  const choose = cmds.chooseDialog;
  cmds.turnInQuest = (qid) => { turnins.push(G.store.getState().archive.partners.find((p) => p.active)?.partnerId); const s = G.store.getState(); G.store.setState({ me: { ...s.me, quests: { ...s.me.quests, [qid]: { state: 3, counters: [] } } }, dialog: null }); };
  cmds.chooseDialog = (id) => { if (String(id).startsWith('ti_')) turnins.push(G.store.getState().archive.partners.find((p) => p.active)?.partnerId); return choose(id); };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc', apQuestPartner: 'pa', apTurninPartner: 'pb' }));
  G.w.eval(script);
  const bus = require('./groupbus')('digibot-group');
  const talk = { key: 'turnin:q02_first_steps#1', tkey: 'turnin:q02_first_steps', kind: 'talk', purpose: 'turnin', questId: 'q02_first_steps', npcId: 'gennai', loc: { mapId: 'primary_village', x: 216, y: 200 }, off: 0, label: '„First Steps“ abgeben bei Gennai' };
  const tick = setInterval(() => bus.postMessage({ type: 'state', slot: 0, role: 'leader', name: 'Lead', inWorld: true, mapId: 'primary_village', channel: 1, x: 230, y: 230,
    bot: true, status: 'Abgabe', quests: { q02_first_steps: { state: 2, counters: [2] } }, ents: ['t:lead', 'p:lead'], talks: [talk], done: [], busy: null, fight: false, task: { label: talk.label } }), 400);
  await wait(1500);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(300);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000 && !(turnins.length && G.store.getState().archive.partners.find((p) => p.active)?.partnerId === 'pa')) await wait(200);
  clearInterval(tick); bus.close();
  const r = { switches, turnins, active: G.store.getState().archive.partners.find((p) => p.active)?.partnerId, quest: G.store.getState().me.quests.q02_first_steps?.state, status: G.status().slice(0, 80) };
  G.w.close();
  return r;
}
(async () => {
  const A = await run(false), B = await run(true);
  console.log(JSON.stringify({ A, B }));
  const okA = A.turnins[0] === 'pb' && A.active === 'pa' && A.quest === 3;
  const okB = B.turnins[0] === 'pb' && B.active === 'pa';
  console.log(okA ? 'OK     A: Mitläufer gibt mit seinem Abgabe-Digimon ab und wechselt danach zurück' : 'FEHLER A');
  console.log(okB ? 'OK     B: eigene fertige Quest, die der Leader noch nicht abgibt – trotzdem zurück aufs Quest-Digimon' : 'FEHLER B');
  process.exit(okA && okB ? 0 : 1);
})();
