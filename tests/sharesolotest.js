// 3.2.4 (Nutzer 02.11.: A3-Bosse allein bzw. mit fremden Spielern): geteilter Treffer mit share.minPartners (Tamers-Bosse,
// „At least three partners must share the reticle. A lone target falls even with protection.“) – ohne eigene Gruppe.
// J: Fremder markiert, schon ein zweiter Fremder bei ihm -> mit mir wären es 3: hinein (Digimon ≤ 54 px vom Markierten).
// A: Fremder markiert, sonst niemand bei ihm -> mit mir nur 2 (alle im Kreis fielen): draußen bleiben bzw. hinaus (> 64 px).
// M: ich bin markiert, zwei Fremde 170 px weiter -> zu ihnen (Digimon ≤ 54 px vom nächsten Fremden).
// M2: ich bin markiert, zwei Fremde schon bei mir -> stehen bleiben.
// W: Fremder markiert (200 px weg), ein zweiter Fremder steht schon bei mir; der Markierte kommt zu uns -> nicht vor ihm
//    weglaufen (mit ihm wären wir 3), stehen bleiben (live mehrere Bots: der Markierte jagte die Ausweichenden).
// G: geteilter Treffer ohne minPartners (ältere Bosse) -> allein wie bisher: keine Bewegung.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const S3 = 'oro.inferno', S0 = 'old.share';
const skills = {
  [S3]: { id: S3, name: 'Inferno Blast', shape: 'circle', radius: 64, castMs: 5000, cooldownMs: 21600, share: { target: 'rotate', minPartners: 3 } },
  [S0]: { id: S0, name: 'Old Share', shape: 'circle', radius: 64, castMs: 5000, cooldownMs: 21600, share: { target: 'rotate' } },
};

async function run(kind) {
  const strangers = {
    J: [['p:x1', 560, 330], ['p:x2', 572, 348]],
    A: [['p:x1', 450, 330]],
    M: [['p:x1', 580, 330], ['p:x2', 592, 348]],
    M2: [['p:x1', 430, 345], ['p:x2', 395, 350]],
    G: [['p:x1', 450, 330]],
    W: [['p:x1', 630, 330], ['p:x2', 445, 345]],
  }[kind];
  const W = makeWorld({ slot: 0, tag: 'S' + kind, noHash: true, accounts: { leader: 0, list: [{ user: 'solo' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    extraEnts: (id) => (id === 'native_forest' ? [{ id: 'boss:1', kind: 2, defId: 'orochi', x: 760, y: 200, hp: 900000, maxHp: 900000, level: 5, flags: 16, targetId: '' },
      ...strangers.map(([sid, x, y]) => ({ id: sid, kind: 1, defId: 'agumon', x, y, hp: 5000, maxHp: 5000, flags: 0, targetId: '' }))] : []),
    setup({ content }) { content.skills = { ...(content.skills || {}), ...skills }; content.digimon.orochi = { name: 'Orochimon', radius: 7 }; } });
  W.handlers = {};
  W.w.dmo.net.on = (name, fn) => { W.handlers[name] = fn; return () => {}; };
  W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', dodge: true }));
  W.w.eval(script);
  await wait(1200);
  W.w.document.querySelector('[data-act="bot"]').click();
  await wait(600);
  const t = W.ents.get('t:me'), p = W.ents.get('p:me');
  t.x = 420; t.y = 330; p.x = 430; p.y = 330;
  await wait(300);
  const dst = kind === 'M' || kind === 'M2' ? 'p:me' : 'p:x1';
  W.handlers.evs?.([{ t: 'skill', src: 'boss:1', skill: kind === 'G' ? S0 : S3, phase: 'cast', dst }]);
  const p0 = [p.x, p.y], sts = new Set();
  for (let i = 0; i < 20; i++) { await wait(150); sts.add(W.status().slice(0, 70)); if (kind === 'W') { const x1 = W.ents.get('p:x1'); if (x1.x > 470) x1.x -= 12; } }
  const x1 = W.ents.get('p:x1');
  const r = { kind, toX1: Math.round(Math.hypot(p.x - x1.x, p.y - x1.y)), moved: Math.round(Math.hypot(p.x - p0[0], p.y - p0[1])), sts: [...sts].slice(0, 6) };
  W.w.close();
  return r;
}

(async () => {
  const r = {};
  for (const k of ['J', 'A', 'M', 'M2', 'G', 'W']) r[k] = await run(k);
  console.log(JSON.stringify(r));
  const ok = {
    J: r.J.toX1 <= 54,
    A: r.A.toX1 > 64,
    M: r.M.toX1 <= 54,
    M2: r.M2.moved < 10,
    G: r.G.moved < 10,
    W: r.W.toX1 <= 54 && !r.W.sts.some((s) => /Weiche/.test(s)),
  };
  console.log(ok.J ? 'OK     J: mit mir 3 im Kreis – hinein' : 'FEHLER J ' + JSON.stringify(r.J));
  console.log(ok.A ? 'OK     A: mit mir nur 2 – draußen' : 'FEHLER A ' + JSON.stringify(r.A));
  console.log(ok.M ? 'OK     M: selbst markiert – zu den Fremden' : 'FEHLER M ' + JSON.stringify(r.M));
  console.log(ok.M2 ? 'OK     M2: selbst markiert, Fremde schon da – stehen bleiben' : 'FEHLER M2 ' + JSON.stringify(r.M2));
  console.log(ok.G ? 'OK     G: ohne minPartners allein wie bisher' : 'FEHLER G ' + JSON.stringify(r.G));
  console.log(ok.W ? 'OK     W: Markierter kommt zu uns – nicht weglaufen, am Ende im Kreis' : 'FEHLER W ' + JSON.stringify(r.W));
  process.exit(Object.values(ok).every(Boolean) ? 0 : 1);
})();
