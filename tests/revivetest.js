// 2.52.0: Bewusstlos – „Zurück zum Lager“, sobald das Spiel es erlaubt (prompt.canReviveAt), statt auf die automatische
// Rückkehr zu warten. Vorher nicht (der Knopf ist dann gesperrt).
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const G = makeWorld({ slot: 0, tag: 'V', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } } });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  const t0 = Date.now(), allowAt = t0 + 2500;
  const calls = [];
  cmds.revive = () => { calls.push(Date.now() - t0); const s = G.store.getState(); G.store.setState({ prompt: null, me: { ...s.me, partner: { ...s.me.partner, fainted: false, hp: 1 } } }); };
  const st = G.store.getState();
  G.store.setState({ prompt: { kind: 'fainted', canReviveAt: allowAt }, me: { ...st.me, partner: { ...st.me.partner, fainted: true, hp: 0 } } });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log' }));
  G.w.eval(script);
  await wait(500);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(4500);
  console.log({ calls });
  G.w.close();
  const ok = calls.length === 1 && calls[0] >= 2400 && calls[0] < 3600;
  console.log(ok ? 'OK – zurück zum Lager, sobald es erlaubt ist (nicht vorher)' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
