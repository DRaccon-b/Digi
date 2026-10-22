// 2.12.3: Veraltete Dialog-Seite – das Annehmen wirkt erst nach frischem Ansprechen. Der Bot spricht nach 2 erfolglosen
// Klicks neu an (statt 6×) und ist entsprechend schneller.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const G = makeWorld({ slot: 0, tag: 'Solo', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [], quests: { q00_meet_gennai: { state: 3, counters: [] } } });
const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
let talks = 0, picks = 0;
const realTalk = cmds.talk.bind(cmds), realChoose = cmds.chooseDialog.bind(cmds);
cmds.talk = (npc) => { talks++; realTalk(npc); };
cmds.chooseDialog = (id) => { picks++; if (talks < 2) return; realChoose(id); }; // erst nach dem 2. Ansprechen wirkt die Auswahl
G.w.eval(script);
(async () => {
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  const t0 = Date.now();
  while (Date.now() - t0 < 40000 && (G.state.me.quests.q02_first_steps?.state ?? 0) === 0) await wait(100);
  const r = { accepted: G.state.me.quests.q02_first_steps?.state === 1, picks, talks };
  console.log(r);
  const ok = r.accepted && picks <= 4;
  console.log(ok ? 'OK – schnell neu angesprochen' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
