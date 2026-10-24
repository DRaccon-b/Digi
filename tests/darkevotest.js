// 2.49.0: Lern-Route – Zielform je nach Map: ohne Dark Tower die eingestellte Form (Standard: höchstmögliche), mit Dark
// Tower die eingestellte (Standard: höchste Armor-Form, nur die klappt dort). Liegt sie auf einem anderen Ast, erst zurück.
// A: Dark-Tower-Map, Aquilamon -> zurück zu Hawkmon -> Halsemon. B: ohne Dark Tower -> Aquilamon (höchstmögliche).
// C: Dark-Tower-Map mit „keine Digitation“ -> bleibt Aquilamon. D: von Halsemon auf eine Map ohne Dark Tower -> zurück, Aquilamon.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run({ dark, start, cfgX = {} }) {
  const G = makeWorld({ slot: 0, tag: 'D', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) {
      content.digimon.kunemon = { name: 'Kunemon', base: { hp: 300 }, growth: { hp: 20 }, mob: { expBase: 6.5 } };
      if (dark) content.maps.native_forest.darkTower = true;
    } });
  const stage = { hawkmon: 'rookie', aquilamon: 'champion', halsemon: 'armor' };
  const st0 = G.store.getState();
  G.store.setState({ me: { ...st0.me, tamerDs: 300, partner: { ...st0.me.partner, level: 30, species: start, stage: stage[start], stats: { at: 2000, as: 1200 }, evolutions: [
    { species: 'hawkmon', stage: 'rookie' }, { species: 'aquilamon', stage: 'champion', from: 'hawkmon', canEvolveNow: true, level: 11 },
    { species: 'halsemon', stage: 'armor', from: 'hawkmon', canEvolveNow: true, level: 25 }] } } });
  const did = [];
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  const set = (sp) => { const s = G.store.getState(); G.store.setState({ me: { ...s.me, partner: { ...s.me.partner, species: sp, stage: stage[sp] } } }); };
  cmds.evolve = (sp) => { did.push(sp); set(sp); };
  cmds.devolve = () => { did.push('devolve'); set('hawkmon'); };
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 10, levelRoute: true, levelA2: false, levelEvo: true, levelBoss: false, ...cfgX }));
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(11000);
  const r = { did, species: G.store.getState().me.partner.species };
  G.w.close();
  return r;
}
(async () => {
  const a = await run({ dark: true, start: 'aquilamon' });
  const b = await run({ dark: false, start: 'hawkmon' });
  const c = await run({ dark: true, start: 'aquilamon', cfgX: { levelEvoDark: '' } });
  const d = await run({ dark: false, start: 'halsemon' });
  console.log({ a, b, c, d });
  const ok = a.did.join() === 'devolve,halsemon' && a.species === 'halsemon' && b.did.join() === 'aquilamon' && !c.did.length && d.did.join() === 'devolve,aquilamon';
  console.log(ok ? 'OK – Dark Tower: Armor-Form (vorher zurück), sonst höchstmögliche, „keine“ = nichts' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
