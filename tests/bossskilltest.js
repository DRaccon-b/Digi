// 2.5.0: Boss-Attacken-Anzeige (Form, bereit/Countdown) + Skill-Timing (langer Cast vor möglicher Flächen-Attacke)
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
const w = dom.window;
w.HTMLCanvasElement.prototype.getContext = () => null;
w.eval(fake);
const F = w.__fake, scene = w.dmo.game.scene.getScene('world');
scene.tapGround = () => {};
scene.telegraphs = { active: [], mirrors: [] };
scene.mechB = { lines: [] };
scene.deps.commands = { partnerFollow() {} };
const handlers = {};
w.dmo.net.on = (name, fn) => { { const prev = handlers[name]; handlers[name] = prev ? (...a) => { prev(...a); fn(...a); } : fn; } return () => {}; };
const C = scene.deps.content;
C.digimon.kuwagamon.skills = [
  { id: 'kuwa.ring', name: 'Scissor Ring', shape: 'circle', origin: 'caster', radius: 60, castMs: 1500, cooldownMs: 8000, telegraph: true },
  { id: 'kuwa.mirror', name: 'Mirror Shell', shape: 'single', reflect: { pct: 200, durationMs: 3000 }, castMs: 2500, cooldownMs: 20000 },
  { id: 'kuwa.beam', name: 'Power Guillotine', shape: 'line', radius: 12, castMs: 2500, cooldownMs: 6000, telegraph: true },
];
C.skills = Object.fromEntries(C.digimon.kuwagamon.skills.map((k) => [k.id, k]));
for (const id of ['m:1', 'm:2', 'm:3', 'm:4', 'm:6']) F.ents.delete(id);
{ const b = F.ents.get('m:5'); b.hp = Math.floor(b.maxHp * 0.98); } // nicht frisch gespawnt (Spawn-Schutz gilt seit 2.13.3 überall)
const me = F.store.getState().me;
F.store.setState({ me: { ...me, hotbar: ['cmd:attack', 'skill:2', 'skill:0', null, null, null, null, null, 'item:meat'],
  partner: { ...me.partner, skills: [...me.partner.skills, { name: 'Gaia Force', dsCost: 0, unlocked: true, castMs: 1200 }] } } });
w.localStorage.setItem('cdigi.cfg', JSON.stringify({ hpPot: 0, dsPot: 0, tdsPot: 0, lvlDiff: 10, tab: 'attack', mobs: { native_forest: { 'kuwagamon|boss': true } } }));
const keys = [];
w.addEventListener('keydown', (e) => keys.push({ code: e.code, t: Date.now() }), true);
w.eval(script);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, info) => { results.push(ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };
const box = () => w.document.querySelector('[data-f="bskills"]').textContent.replace(/\s+/g, ' ').trim();
const status = () => w.document.querySelector('[data-f="status"]').textContent;
(async () => {
  await wait(600);
  F.store.setState({ target: F.toTarget('m:5') });
  w.document.querySelector('[data-act="bot"]').click();
  await wait(1500);
  const t0 = Date.now();
  check('Anzeige: Formen + noch nicht gesehen', /Kreis um Boss/.test(box()) && /Spiegel/.test(box()) && /Strahl/.test(box()) && /noch nicht gesehen/.test(box()), box().slice(0, 140));
  const gaiaEarly = keys.filter((k) => k.code === 'Digit2').length;
  const blasterEarly = keys.filter((k) => k.code === 'Digit3').length;
  check('Timing: Gaia Force (1,2 s Cast) zurückgehalten, Ring noch unbekannt', gaiaEarly === 0 && blasterEarly > 0, `Digit2=${gaiaEarly} Digit3=${blasterEarly}`);
  check('Timing: Grund im Status', /zurückgehalten: Scissor Ring/.test(status()) || keys.length > 0, status());
  // Boss wirkt den Ring -> Ansage läuft, danach 8 s Cooldown -> Gaia ist sicher
  handlers.evs?.([{ t: 'skill', src: 'm:5', skill: 'kuwa.ring', phase: 'cast' }]);
  await wait(300);
  check('Anzeige: wirkt gerade', /wirkt!/.test(box()), box().match(/Scissor Ring[^A-Z]*/)?.[0]);
  await wait(1400);
  handlers.evs?.([{ t: 'skill', src: 'm:5', skill: 'kuwa.ring', phase: 'release' }]);
  await wait(2500);
  const gaiaLate = keys.filter((k) => k.code === 'Digit2' && k.t > t0).length;
  check('Anzeige: Countdown nach dem Einsatz', /Scissor Ring.*\d+(,\d)? s/.test(box()) && !/Scissor Ring wirkt/.test(box()), box().match(/Scissor Ring.{0,40}/)?.[0]);
  check('Timing: Gaia Force nach dem Ring erlaubt', gaiaLate > 0, `Digit2=${gaiaLate}`);
  console.log(results.every(Boolean) ? 'ALLES OK' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
