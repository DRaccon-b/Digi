// 2.10.2: „Dieses Fenster ist: Account X“ stellt die Rolle ohne Neuladen um und warnt bei falschem Account
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const G = makeWorld({ slot: 0, tag: 'X', accounts, quests: { q00_meet_gennai: { state: 3, counters: [] } } });
G.w.eval(script);
const $ = (q) => G.w.document.querySelector(q);
const pick = (v) => { const s = $('[data-accslot]'); s.value = v; s.dispatchEvent(new G.w.Event('input', { bubbles: true })); s.dispatchEvent(new G.w.Event('change', { bubbles: true })); };
(async () => {
  await wait(1200);
  const r = {};
  r.initial = $('[data-accslot]').value === '0' && /Account 1 · Leader/.test($('[data-f="grpinfo"]').textContent) && !$('[data-f="grpinfo"]').classList.contains('warn');
  pick('1'); await wait(500);
  const info = $('[data-f="grpinfo"]');
  r.switched = G.w.sessionStorage.getItem('digibot.slot') === '1' && /Account 2 · folgt dem Leader/.test(info.textContent);
  r.warns = info.classList.contains('warn') && /hier ist lead eingeloggt, nicht foll/.test(info.textContent);
  r.optionNames = $('[data-accslot]').options[2].textContent === 'Account 2 (foll)';
  pick(''); await wait(500);
  r.noGroup = G.w.sessionStorage.getItem('digibot.group') === null && /keiner Gruppe/.test($('[data-f="grpinfo"]').textContent);
  console.log(r);
  const ok = Object.values(r).every(Boolean);
  console.log(ok ? 'OK – Fenster-Auswahl' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
