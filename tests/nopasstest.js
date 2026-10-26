// 3.0.0: Passwörter werden nie gespeichert – auch alte gespeicherte (bis 2.55) verschwinden beim nächsten Speichern der
// Account-Liste. Ersetzt die alten Login-/Profil-Tests (Auto-Login mit gespeichertem Passwort gibt es nicht mehr).
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead', pass: 'test-pw-1' }, { on: true, user: 'foll', char: 'Foll', pass: 'test-pw-2' }] };
  const G = makeWorld({ slot: 0, tag: 'P', accounts, quests: { q00_meet_gennai: { state: 3, counters: [] } } });
  G.w.eval(script);
  await wait(1200);
  const cb = G.w.document.querySelector('[data-acc="1"][data-k="on"]'); // Account-Liste ändern -> wird gespeichert
  if (cb) { cb.checked = !cb.checked; cb.dispatchEvent(new G.w.Event('change', { bubbles: true })); }
  await wait(300);
  const saved = G.w.localStorage.getItem('digibot.accounts') || '';
  const r = { savedHasPass: /test-pw-|"pass"\s*:\s*"[^"]/.test(saved), users: (saved.match(/"user":"[^"]*"/g) || []).length };
  console.log(r);
  G.w.close();
  const ok = !r.savedHasPass && r.users >= 2;
  console.log(ok ? 'OK – keine Passwörter im Speicher' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
