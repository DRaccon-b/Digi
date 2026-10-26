// 2.13.3: Spawn-Schutz für jeden Boss und in allen Modi – (a) Bot ohne Boss-Rotation (z. B. Mitläufer im Modus Bosse),
// (b) Spiegeln mit Angriff. In den ersten 3 s nach dem Auftauchen keine Skills, danach schon.
const fs = require('fs');
const { BroadcastChannel } = require('worker_threads');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, info) => { results.push(ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };
const boss = () => ({ id: 'boss:1', kind: 2, defId: 'etemon', x: 440, y: 330, hp: 100000, maxHp: 100000, level: 5, flags: 16 | 32, targetId: 'p:me' });
function world(slot, accounts, cfgExtra) {
  const W = makeWorld({ slot, accounts, tag: 'W' + slot, mobs: [], quests: { q00_meet_gennai: { state: 3, counters: [] }, q02_first_steps: { state: 3, counters: [] } },
    setup({ content }) { content.digimon.etemon = { name: 'Etemon', skills: [] }; } });
  W.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'acc', lvlDiff: 20, ...cfgExtra }));
  const me = W.store.getState().me;
  W.store.setState({ me: { ...me, hotbar: ['cmd:attack', 'skill:0'], partner: { ...me.partner, species: 'patamon', skills: [{ id: 'x.blast', name: 'Blast', dsCost: 0, unlocked: true }] } } });
  W.keys = [];
  W.w.addEventListener('keydown', (e) => { if (e.code === 'Digit2') W.keys.push(Date.now()); }, true);
  W.w.eval(script);
  return W;
}
(async () => {
  // (a) eigener Bot, keine Boss-Rotation: Boss taucht auf und greift an
  {
    const acc = { leader: 0, popup: true, list: [{ on: true, user: 'a', char: 'A' }] };
    const W = world(0, acc, {});
    await wait(1200);
    W.w.document.querySelector('[data-act="bot"]').click();
    await wait(1500);
    for (const id of [...W.ents.keys()]) if (id.startsWith('m:')) W.ents.delete(id);
    const t0 = Date.now();
    W.ents.set('boss:1', boss());
    W.keys.length = 0;
    await wait(2800);
    const early = W.keys.length, st = W.status();
    await wait(2500);
    check('Bot: keine Skills in den ersten 3 s', early === 0, `Skills ${early} · ${st}`);
    check('Bot: Status zeigt Spawn-Schutz', /Spawn-Schutz/.test(st), st);
    check('Bot: danach Skills', W.keys.length > 0 && W.keys[0] - t0 >= 3200, `erster Skill nach ${W.keys[0] ? W.keys[0] - t0 : '-'} ms`);
  }
  // (b) Spiegeln mit Angriff: Leader greift den Boss an, Mitläufer (Bot aus) greift mit
  {
    const acc = { leader: 0, popup: true, mirror: true, mirrorAtk: true, list: [{ on: true, user: 'l', char: 'Lead' }, { on: true, user: 'f', char: 'Foll' }] };
    const F = world(1, acc, {});
    const bus = require('./groupbus')('digibot-group');
    await wait(1200);
    for (const id of [...F.ents.keys()]) if (id.startsWith('m:')) F.ents.delete(id);
    const t0 = Date.now();
    F.ents.set('boss:1', { ...boss(), targetId: '' });
    F.ents.set('t:lead', { id: 't:lead', kind: 0, x: 420, y: 330, hp: 1, flags: 0, targetId: 'boss:1' });
    const tick = setInterval(() => {
      bus.postMessage({ type: 'state', slot: 0, role: 'leader', name: 'Lead', inWorld: true, mapId: 'native_forest', channel: 1, x: 420, y: 330, bot: false, status: 'x',
        quests: {}, fin: [], ents: ['t:lead'], talks: [], done: [], busy: null, task: null, hunt: [], targetId: 'boss:1' });
      bus.postMessage({ type: 'pos', slot: 0, mapId: 'native_forest', channel: 1, x: 420, y: 330, atk: 'boss:1' });
    }, 300);
    F.keys.length = 0;
    await wait(2800);
    const early = F.keys.length, st = F.status();
    await wait(2500);
    clearInterval(tick); bus.close();
    check('Spiegeln: keine Skills in den ersten 3 s', early === 0, `Skills ${early} · ${st}`);
    check('Spiegeln: danach Skills', F.keys.length > 0 && F.keys[0] - t0 >= 3200, `erster Skill nach ${F.keys[0] ? F.keys[0] - t0 : '-'} ms · ${F.status()}`);
  }
  console.log(results.every(Boolean) ? 'ALLES OK' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
