// 3.2.15: Piedmon allein – Clown Trick (2 s unverwundbar) getimt kurz vor dem tödlichen Treffer (Catastrophe Cannon, 240 %
// Max-HP, geteilt – allein trifft er voll), nicht frei als Buff verbraucht, solange ein Boss mit so einem Treffer da ist.
// A: Boss da und greift an, kein Treffer angesagt – Clown Trick wird NICHT verbraucht.
// B: Catastrophe Cannon angesagt (3 s) – Clown Trick kurz vor dem Einschlag (2,0–2,9 s nach der Ansage), genau einmal.
// C: Clown Trick noch in der Abklingzeit – kein Drücken, Hinweis im Protokoll.
// D: kleiner Angriff – kein Clown Trick.
// E (Review): erster Druck geht verloren (keine Abklingzeit) – zweiter Versuch vor dem Einschlag.
// G (Nachprüfung): nur 250 DS (unter den 300 für Clown Trick) – Card Slash (100) wird nicht gedrückt, die DS sparen sich an.
// F (Review): 600 DS, Trump Sword kostet 500 – nicht drücken, die 300 DS für Clown Trick bleiben.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CT = 'piedmon_dm.clown_trick';
const skills = {
  'piedmon_dm.trump_sword': { id: 'piedmon_dm.trump_sword', name: 'Trump Sword', kind: 'damage', target: 'enemy', shape: 'single', power: 400, dsCost: 500, cooldownMs: 10000, castMs: 0, range: 300 },
  'piedmon_dm.card_slash': { id: 'piedmon_dm.card_slash', name: 'Card Slash', kind: 'damage', target: 'enemy', shape: 'single', power: 200, dsCost: 100, cooldownMs: 6000, castMs: 0, range: 300 },
  [CT]: { id: CT, name: 'Clown Trick', kind: 'buff', target: 'self', shape: 'single', protectionMs: 2000, dsCost: 300, cooldownMs: 24000, castMs: 0, effects: [{ stat: 'ev', pct: 40, durationMs: 8000 }] },
  'diaboromon.catastrophe_cannon': { id: 'diaboromon.catastrophe_cannon', name: 'Catastrophe Cannon', shape: 'circle', radius: 40, hpDamagePct: 240, castMs: 3000, cooldownMs: 32000, share: { target: 'rotate' } },
  'diaboromon.crazy_giggle': { id: 'diaboromon.crazy_giggle', name: 'Crazy Giggle', shape: 'single', power: 150, castMs: 500, cooldownMs: 8000 },
};
const W = makeWorld({ slot: 0, tag: 'P', noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
  quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
  extraEnts: (id) => (id === 'native_forest' ? [{ id: 'boss:1', kind: 2, defId: 'diaboromon', x: 470, y: 330, hp: 900000, maxHp: 1000000, level: 99, flags: 16 | 8, targetId: 'p:me' }] : []),
  setup({ content }) { content.skills = { ...content.skills, ...skills }; content.digimon.diaboromon = { name: 'Diaboromon', skills: [skills['diaboromon.catastrophe_cannon'], skills['diaboromon.crazy_giggle']] }; } });
W.handlers = {};
W.w.dmo.net.on = (name, fn) => { W.handlers[name] = fn; return () => {}; };
W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 100 }));
const me = W.store.getState().me;
W.store.setState({ me: { ...me, hotbar: ['cmd:attack', 'skill:0', 'skill:1', 'skill:2'], partner: { ...me.partner, species: 'piedmon_dm', level: 130, ds: 5000, maxDs: 5000,
  skills: [{ id: CT, name: 'Clown Trick', dsCost: 300, unlocked: true }, { id: 'piedmon_dm.trump_sword', name: 'Trump Sword', dsCost: 500, unlocked: true }, { id: 'piedmon_dm.card_slash', name: 'Card Slash', dsCost: 100, unlocked: true }] } } });
const keys = [], swords = [], slashes = []; let dropNext = false;
W.w.addEventListener('keydown', (e) => { if (e.code === 'Digit3') swords.push(Date.now()); if (e.code === 'Digit4') slashes.push(Date.now()); if (e.code === 'Digit2') { keys.push(Date.now()); if (dropNext) { dropNext = false; return; } W.store.setState({ cooldowns: { ...W.store.getState().cooldowns, 'skill:0': { end: W.w.performance.now() + 24000 } } }); } }, true);
W.w.eval(script);
const results = [];
const check = (name, ok, info) => { results.push(!!ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };
const cast = (skill) => W.handlers.evs?.([{ t: 'skill', src: 'boss:1', skill, phase: 'cast', dst: 'p:me' }]);
const log = () => W.w.document.querySelector('.digibot__log')?.textContent || '';
(async () => {
  await wait(1200);
  W.w.document.querySelector('[data-act="bot"]').click();
  await wait(3500);
  check('A: Boss mit tödlichem Treffer da – Clown Trick nicht frei verbraucht', keys.length === 0, `${keys.length}× · ${W.status()}`);
  const t1 = Date.now();
  cast('diaboromon.catastrophe_cannon');
  await wait(3600);
  const at = keys[0] ? keys[0] - t1 : null;
  check('B: Catastrophe Cannon – Clown Trick genau einmal kurz vor dem Einschlag', keys.length === 1 && at >= 2000 && at <= 2900, `${keys.length}× · ${at} ms`);
  await wait(1000);
  keys.length = 0;
  cast('diaboromon.catastrophe_cannon'); // Clown Trick noch 20 s in der Abklingzeit
  await wait(3600);
  check('C: Clown Trick in der Abklingzeit – kein Drücken, Hinweis', keys.length === 0 && /Clown Trick nicht bereit/.test(log()), `${keys.length}× · ${log().slice(0, 300)}`);
  W.store.setState({ cooldowns: {} }); keys.length = 0;
  await wait(800);
  cast('diaboromon.crazy_giggle');
  await wait(1500);
  check('D: kleiner Angriff – kein Clown Trick', keys.length === 0, `${keys.length}×`);
  W.store.setState({ cooldowns: {} }); keys.length = 0; dropNext = true;
  await wait(800);
  const t5 = Date.now();
  cast('diaboromon.catastrophe_cannon');
  await wait(3600);
  check('E: erster Druck verloren – zweiter Versuch vor dem Einschlag', keys.length === 2 && keys[1] - t5 <= 3000, `${keys.map((k) => k - t5).join(',')} ms`);
  W.store.setState({ cooldowns: {} }); keys.length = 0; swords.length = 0;
  const m2 = W.store.getState().me; W.store.setState({ me: { ...m2, partner: { ...m2.partner, ds: 600 } } });
  await wait(4000);
  check('F: 600 DS – Trump Sword (500) zurückgehalten, Clown Trick bleibt bezahlbar', swords.length === 0 && keys.length === 0, `Trump ${swords.length}× · Clown ${keys.length}×`);
  slashes.length = 0;
  const m3 = W.store.getState().me; W.store.setState({ me: { ...m3, partner: { ...m3.partner, ds: 250 } } });
  await wait(4000);
  check('G: 250 DS – Card Slash zurückgehalten, DS sparen sich auf Clown Trick an', slashes.length === 0, `Card Slash ${slashes.length}×`);
  console.log(results.every(Boolean) ? 'OK – Clown Trick getimt' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
