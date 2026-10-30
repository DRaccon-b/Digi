// 3.1.38: Regler Gruppenabstand – Mitläufer laufen erst hinterher, wenn sie weiter als eingestellt vom Leader weg sind
//  def  – Standard 110 px: Leader 300 px entfernt → „Gruppe: folge Lead“
//  wide – Regler 400 px: gleicher Abstand → bleibt („Gruppe: bei Lead“), läuft nicht los
//  assist – Regler 800 px, Suchradius 300, Leader 700 px weg kämpft gegen m:1 neben sich → Mitläufer greift m:1 mit an
// Aufruf: node tests/grpdist3138test.js <script> [teil]
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const scriptPath = path.resolve(process.argv[2] || '');
const part = process.argv[3];
if (!part) {
  let ok = true;
  for (const p of ['def', 'wide', 'assist']) {
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
(async () => {
  const wide = part === 'wide', assist = part === 'assist';
  const accounts = { leader: 0, popup: true, mirror: false, spread: false, list: [{ on: true, user: 'lead', char: 'Lead' }, { on: true, user: 'foll', char: 'Foll' }] };
  const F = makeWorld({ slot: 1, tag: wide ? 'W' : 'D', accounts, mobs: assist ? [[1100, 330]] : [], viewRange: 2000, quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } } });
  F.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: true, apGrind: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc', ...(wide ? { grpDist: 400 } : {}), ...(assist ? { grpDist: 800, radius: 300 } : {}) }));
  F.w.eval(script);
  const p0 = F.ents.get('p:me'), lx = p0.x + (assist ? 700 : 300), ly = p0.y;
  if (assist) setInterval(() => { const m = F.ents.get('m:1'); if (m) { m.hp = 300; m.targetId = 't:lead'; } }, 50);
  const bus = require('./groupbus')('digibot-group');
  const tick = setInterval(() => bus.postMessage({ type: 'state', slot: 0, role: 'leader', name: 'Lead', inWorld: true, mapId: 'native_forest', channel: 1, x: lx, y: ly,
    bot: true, status: 'x', quests: {}, fin: ['q00_meet_gennai', 'q02_first_steps'], ents: [], talks: [], done: [], busy: null, noFight: false, task: null, hunt: [], targetId: assist ? 'm:1' : '' }), 300);
  await wait(1200);
  F.w.document.querySelector('[data-act="bot"]').click();
  const seen = new Set();
  const tg = [];
  for (let i = 0; i < (assist ? 40 : 15); i++) { await wait(200); seen.add(F.status()); tg.push(F.store.getState().target?.id || '-'); }
  const slider = F.w.document.querySelector('[data-cfg="grpDist"]');
  clearInterval(tick); bus.close(); F.w.close();
  const st = [...seen].join(' | ');
  console.log({ st, slider: slider?.value, tg: tg.slice(-8).join(',') });
  const ok = !!slider && (assist ? tg.slice(-8).filter((x) => x === 'm:1').length >= 6 : wide ? /Gruppe: bei Lead/.test(st) && !/folge Lead/.test(st) && slider.value === '400'
    : /Gruppe: folge Lead \(\d+ px\)/.test(st) && slider.value === '110');
  console.log(ok ? 'TEIL OK' : 'TEIL FEHLER');
  process.exit(ok ? 0 : 1);
})();
