// Pull-Modus: Einstellungen pull/pullMax/pullHp – Standardwerte, Grenzen, Schalter und Regler im Reiter Attacke.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(cfg) {
  const G = makeWorld({ slot: 0, tag: 'Solo', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } } });
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'attack', ...cfg }));
  G.w.eval(script);
  await wait(1000);
  const d = G.w.document;
  const out = { saved: JSON.parse(G.w.localStorage.getItem('digibot.cfg') || '{}'),
    chk: d.querySelector('[data-apflag="pull"]'), max: d.querySelector('[data-cfg="pullMax"]'), hp: d.querySelector('[data-cfg="pullHp"]') };
  out.ui = { chk: out.chk?.checked, max: out.max?.value, hp: out.hp?.value, has: !!(out.chk && out.max && out.hp) };
  G.w.close();
  return out;
}

(async () => {
  const a = await run({ pull: true, pullMax: 12, pullHp: 10 });
  const b = await run({});
  console.log({ a: { s: [a.saved.pull, a.saved.pullMax, a.saved.pullHp], ui: a.ui }, b: { s: [b.saved.pull, b.saved.pullMax, b.saved.pullHp], ui: b.ui } });
  const ok = a.saved.pull === true && a.saved.pullMax === 8 && a.saved.pullHp === 30 && a.ui.has && a.ui.chk === true
    && b.saved.pull === false && b.saved.pullMax === 3 && b.saved.pullHp === 60 && b.ui.has && b.ui.chk === false;
  console.log(ok ? 'OK – Pull-Einstellungen' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
