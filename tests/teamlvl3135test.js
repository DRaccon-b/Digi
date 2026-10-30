// 3.1.35: Level-Grenze beim Annehmen wie im Spiel – höchstes Level der mitgeführten Digimon zählt, nicht nur das aktive
//  carried – Partner Lv 6 aktiv, mitgeführtes Digimon Lv 12: „First Steps“ (ab Lv 10) wird angenommen
//  low     – nur ein nicht mitgeführtes Digimon Lv 12 im Archiv: bleibt liegen
// (live 30.10.: Veemon Lv 99 mitgeführt, Mugendramon Lv 90 aktiv – Henrys „Because We Are Partners“ ab Lv 99 blieb liegen)
// Aufruf: node tests/teamlvl3135test.js <script> [teil]
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const scriptPath = path.resolve(process.argv[2] || '');
const part = process.argv[3];
if (!part) {
  let ok = true;
  for (const p of ['carried', 'low']) {
    const r = spawnSync(process.execPath, [__filename, scriptPath, p], { cwd: __dirname, encoding: 'utf8', timeout: 120000 });
    process.stdout.write(`--- ${p} ---\n${r.stdout || ''}${r.stderr || ''}`);
    if (r.status !== 0) ok = false;
  }
  console.log(ok ? 'ALLES OK' : 'FEHLER');
  process.exit(ok ? 0 : 1);
}
const makeWorld = require('./gw');
const script = fs.readFileSync(scriptPath, 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, info) => { results.push(!!ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };
const done = () => { const ok = results.length > 0 && results.every(Boolean); console.log(ok ? 'TEIL OK' : 'TEIL FEHLER'); process.exit(ok ? 0 : 1); };

async function run(carried) {
  const G = makeWorld({ slot: 0, tag: carried ? 'C' : 'L', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] },
    quests: { q00_meet_gennai: { state: 3, counters: [] } },
    setup({ content }) { content.quests.q02_first_steps.minLevel = 10; } });
  G.store.setState({ archive: { partners: [
    { partnerId: 'a', species: 'gabumon', level: 6, carried: true, active: true },
    { partnerId: 'b', species: 'veemon', level: 12, carried, active: false }] } });
  G.w.eval(script);
  await wait(800);
  G.w.document.querySelector('[data-act="bot"]').click();
  for (let i = 0; i < 60 && !G.log.some((l) => l === 'angenommen: q02_first_steps'); i++) await wait(250);
  return G;
}

async function carried() {
  const G = await run(true);
  check('mitgeführtes Lv 12: „First Steps“ (ab Lv 10) angenommen', G.log.includes('angenommen: q02_first_steps'), G.status());
  G.w.close(); done();
}
async function low() {
  const G = await run(false);
  check('nicht mitgeführtes Lv 12: bleibt liegen', !G.log.includes('angenommen: q02_first_steps'), G.status());
  G.w.close(); done();
}

({ carried, low })[part]().catch((e) => { console.log('FEHLER', e); process.exit(1); });
