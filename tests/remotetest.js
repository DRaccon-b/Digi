// 2.9.3: Start/Stopp im Leader-Fenster und „Gruppe starten/stoppen“ schalten alle Gruppenfenster
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const accounts = { leader: 0, popup: true, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
const q = () => ({ q00_meet_gennai: { state: 3, counters: [] } });
const A = makeWorld({ slot: 0, tag: 'Leader', accounts, quests: q() });
const B = makeWorld({ slot: 1, tag: 'Folger', accounts, quests: q() });
A.w.eval(script); B.w.eval(script);
const opened = [];
A.w.open = (u) => { opened.push(u); return {}; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const on = (G) => G.w.document.querySelector('[data-act="bot"]').classList.contains('on');
const until = async (fn, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms && !fn()) await wait(100); return fn(); };
(async () => {
  await wait(2500); // beide Fenster melden sich gegenseitig
  const r = {};
  A.w.document.querySelector('[data-act="bot"]').click();          // Leader: ▶ Start
  r.startFollows = await until(() => on(B));
  A.w.document.querySelector('[data-act="bot"]').click();          // Leader: ■ Stopp
  r.stopFollows = await until(() => !on(B));
  r.leaderStopped = !on(A);
  A.w.document.querySelector('[data-act="grp-start"]').click();    // Gruppe starten (Fenster läuft schon -> kein neues)
  r.grpStart = await until(() => on(A) && on(B));
  r.noNewWindow = opened.length === 0;
  B.w.document.querySelector('[data-act="grp-stop"]').click();     // Gruppe stoppen aus dem Mitläufer-Fenster
  r.grpStop = await until(() => !on(A) && !on(B));
  r.stillGroup = A.w.sessionStorage.getItem('digibot.group') === '1' && B.w.sessionStorage.getItem('digibot.group') === '1';
  A.w.document.querySelector('[data-act="bot"]').click();          // danach geht Start wieder an alle
  r.restart = await until(() => on(B));
  console.log(r);
  const ok = Object.values(r).every((v) => v === true);
  console.log(ok ? 'OK – Start/Stopp für die ganze Gruppe' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
