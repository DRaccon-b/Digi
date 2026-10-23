// 2.40.0: EXP-Messung – je eigenem Kill: Monster, eigenes Digimon, EXP aus der Chat-Meldung (sonst EXP-Differenz),
// Kampfdauer und Treffer; je Level die EXP bis zum nächsten. Gespeichert in localStorage (digibot.expmess).
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const W = makeWorld({ slot: 0, tag: 'E', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [[430, 330], [470, 330]],
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } } });
W.handlers = {};
W.w.dmo.net.on = (name, fn) => { W.handlers[name] = fn; return () => {}; };
W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', expMess: true }));
const me = W.store.getState().me;
W.store.setState({ me: { ...me, partner: { ...me.partner, species: 'patamon', level: 7, exp: 40, expNext: 500 } }, chat: [] });
W.w.eval(script);
const ev = (list) => W.handlers.evs?.(list);
(async () => {
  await wait(1200);
  // Kill 1: drei Treffer (einer kritisch, einer verfehlt), dann Tod, dann Chat-Meldung +341 EXP
  ev([{ t: 'dmg', src: 'p:me', dst: 'm:1', amount: 120, outcome: 'hit' }]);
  await wait(200);
  ev([{ t: 'dmg', src: 'p:me', dst: 'm:1', amount: 260, outcome: 'crit' }, { t: 'dmg', src: 'p:me', dst: 'm:1', amount: 0, outcome: 'miss' }]);
  await wait(300);
  ev([{ t: 'die', id: 'm:1', killer: 'p:me' }]);
  await wait(100);
  W.store.setState({ chat: [{ channel: 'system', code: 'exp', params: { exp: 341 }, text: '+341 EXP', ts: Date.now() }] });
  const st = W.store.getState();
  W.store.setState({ me: { ...st.me, partner: { ...st.me.partner, exp: 381 } } });
  await wait(600);
  // Kill 2: von jemand anderem erledigt -> nicht zählen
  ev([{ t: 'dmg', src: 'p:me', dst: 'm:2', amount: 100, outcome: 'hit' }]);
  ev([{ t: 'die', id: 'm:2', killer: 'p:other' }]);
  await wait(600);
  const saved = JSON.parse(W.w.localStorage.getItem('digibot.expmess') || '{}');
  const k = saved.kills?.[0];
  console.log({ kills: saved.kills?.length, k, levels: saved.levels });
  const ok = saved.kills?.length === 1 && k.exp === 341 && k.src === 'chat' && k.sp === 'kunemon' && k.lv === 2 && k.hits === 3 && k.crit === 1 && k.miss === 1
    && k.dmg === 380 && k.pSp === 'patamon' && k.pLv === 7 && k.dur >= 400 && saved.levels?.[7] === 500;
  console.log(ok ? 'OK – Kill mit EXP, Treffern und Level-Tabelle gespeichert, fremder Kill nicht' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
