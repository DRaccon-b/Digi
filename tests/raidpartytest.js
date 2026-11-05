// 3.2.13: Raids Beelzebumon und Mother D-Reaper im Dungeon-Reiter, mit Fremden (Party ohne Bots).
// A: Modus-Auswahl hat beide Raids; dgMode 'beelzemon' findet den Raid 'tamers_beelzemon'.
// B: Bot ist NICHT Party-Leader, Raid noch nicht offen (Spiel: nur der Leader öffnet) – Bot wartet an der Tür und versucht es
//    weiter, ohne nach 6 Versuchen zu stoppen; sobald der Leader ihn geöffnet hat, geht er hinein, Add vor Boss, hinaus, Stopp.
// C: Bot IST Party-Leader, Spiel sperrt (Mitspieler zu weit weg) – kein Betreten-Befehl, Grund im Status; danach frei → hinein.
// D: dgMode 'd_reaper' findet den Raid 'd_reaper'.
// F (Nachprüfung): zwei Hände – eine hält ein fremdes Digimon (steht in der Liste vorn), eine mein Digimon: meine zuerst.
// E (Review): Mother D-Reaper – eine Greifhand hält das Digimon fest (Held-Flag, ohne targetId): erst die Hand, dann Add und Boss.
const fs = require('fs');
const makeWorld = require('./gw');
const script = fs.readFileSync(process.argv[2], 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, info) => { results.push(!!ok); console.log((ok ? 'OK     ' : 'FEHLER ') + name, info ?? ''); };

function world(tag, RAID, MODE, gate, arm = false) {
  const order = [], enters = [], ids = [];
  const G = makeWorld({ slot: 0, tag, noHash: true, accounts: { leader: 0, list: [{ user: 'acc1' }] }, mobs: [],
    quests: { q00_meet_gennai: { state: 3, counters: [] } },
    setup({ content, MAPS }) {
      content.digimon[RAID] = { name: RAID }; content.digimon.icedevimon = { name: 'IceDevimon' };
      content.spawns.primary_village.raid = { id: RAID, gate: { mapId: 'native_forest', portal: 'pv' }, party: { min: 1, max: 5, minLevel: 1 }, deathLimit: 3, landing: 'from_nf' };
      content.digimon.reaper_creep_hand = { name: 'Creep Hand' };
      content.spawns.primary_village.bosses = [{ species: RAID, level: 3, at: 'boss_x', adds: { species: 'icedevimon', level: 3 }, ...(arm ? { skills: [{ id: 'd_reaper.creep_hands', grab: { arm: 'reaper_creep_hand' } }] } : {}) }];
      MAPS.primary_village.layers[0].objects.push({ type: 'spawn', name: 'boss_x', x: 600, y: 330 });
    },
    extraEnts: (id) => (id === 'primary_village' ? [
      { id: 'b:1', kind: 2, defId: RAID, level: 3, x: 610, y: 330, hp: 600, maxHp: 600, flags: 16, targetId: '' },
      { id: 'a:1', kind: 2, defId: 'icedevimon', level: 3, x: 640, y: 360, hp: 300, maxHp: 300, flags: 0, targetId: '' },
      ...(arm === 'two' ? [{ id: 'h:0', kind: 2, defId: 'reaper_creep_hand', level: 3, x: 520, y: 420, hp: 300, maxHp: 300, flags: 0, targetId: '' },
        { id: 'p:x', kind: 1, x: 500, y: 420, hp: 1, flags: 0, targetId: '' }] : []),
      ...(arm ? [{ id: 'h:1', kind: 2, defId: 'reaper_creep_hand', level: 3, x: 560, y: 300, hp: 300, maxHp: 300, flags: 0, targetId: '' }] : []),
    ] : []),
    onKill(m) { order.push(m.defId); ids.push(m.id); if (m.defId === 'reaper_creep_hand') { const p = G.ents.get('p:me'); if (p) p.flags &= ~8192; } if (m.defId === RAID) G.store.setState({ raid: { raid: RAID, inside: true, cleared: true } }); } });
  const cmds = G.w.dmo.game.scene.getScene('world').deps.commands;
  cmds.raidEnter = (id) => {
    enters.push(id);
    const r = G.store.getState().raid;
    if (!r || r.inside || (!r.instance && (!r.iLead || r.blocked))) return; // Spiel lehnt ab (raid_not_leader / gesperrt)
    G.store.setState({ raid: { raid: id, inside: true } });
    const t = G.ents.get('t:me'); t.x = 10; t.y = 320; // durchs Tür-Portal (Raid-Map)
    if (arm) setTimeout(() => { const p = G.ents.get('p:me'), h = G.ents.get('h:1'); if (p) p.flags |= 8192; const x = G.ents.get('p:x'), h0 = G.ents.get('h:0'); if (p && h) { h.x = p.x + (x ? 10 : 30); h.y = p.y; } if (p && x && h0) { x.x = p.x - 45; x.y = p.y; x.flags |= 8192; h0.x = p.x - 25; h0.y = p.y; } }, 1500); // Hand packt das Digimon (steht dann daneben)
  };
  cmds.closeRaidGate = () => {};
  G.store.setState({ raid: { raid: RAID, inside: false, ...gate } }); // Tür-Fenster offen
  G.w.localStorage.setItem('digibot.cfg', JSON.stringify({ autopilot: false, farm: false, dungeon: true, dgMode: MODE, hpPot: 0, dsPot: 0, tdsPot: 0, tab: 'log', lvlDiff: 100 }));
  G.w.eval(script);
  return { G, order, enters, ids };
}

(async () => {
  // A + B
  const { G, order, enters } = world('B', 'tamers_beelzemon', 'beelzemon', { iLead: false, instance: false, members: [] });
  await wait(1200);
  const opts = [...G.w.document.querySelectorAll('[data-apsel="dgMode"] option')].map((o) => o.value);
  check('A: Modus-Auswahl enthält Beelzebumon und Mother D-Reaper', opts.includes('beelzemon') && opts.includes('d_reaper'), opts.join(','));
  G.w.document.querySelector('[data-act="bot"]').click();
  await wait(30000); // > 6 Versuche × 4 s
  const stB = G.status(), runB = !/Start/.test(G.w.document.querySelector('[data-act="bot"]')?.textContent || '');
  check('B: nicht Leader, Raid zu – wartet weiter (kein Stopp nach 6 Versuchen)', runB && /Party-Leader/.test(stB) && enters.length >= 3 && enters.every((x) => x === 'tamers_beelzemon'), `${enters.length}× · ${stB}`);
  G.store.setState({ raid: { ...G.store.getState().raid, instance: true } }); // ein Mitspieler (Leader) hat geöffnet
  let wasInside = false; const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    await wait(300);
    if (G.store.getState().world.mapId === 'primary_village') wasInside = true;
    if (wasInside && /Bot aus|geschafft/.test(G.status()) && G.store.getState().world.mapId === 'native_forest') break;
  }
  check('B: Raid offen – hinein, Add vor Boss, hinaus', wasInside && order[0] === 'icedevimon' && order.includes('tamers_beelzemon') && G.store.getState().world.mapId === 'native_forest', `${order.join(',')} · ${G.status()}`);
  G.w.close();
  // C
  const C = world('C', 'tamers_beelzemon', 'beelzemon', { iLead: true, instance: false, blocked: 'raid_far', members: [{ name: 'Fremder', check: 'far' }] });
  await wait(1200);
  C.G.w.document.querySelector('[data-act="bot"]').click();
  await wait(6000);
  const stC = C.G.status();
  check('C: Leader, Spiel sperrt – kein Betreten, Grund im Status', !C.enters.length && /Fremder|zu weit/.test(stC), `${C.enters.length}× · ${stC}`);
  C.G.store.setState({ raid: { ...C.G.store.getState().raid, blocked: '', members: [{ name: 'Fremder', check: 'ok' }] } });
  let inC = false; for (let i = 0; i < 40 && !inC; i++) { await wait(300); inC = C.G.store.getState().world.mapId === 'primary_village'; }
  check('C: frei – Leader betritt den Raid', inC && C.enters.length >= 1, `${C.enters.length}× · ${C.G.status()}`);
  C.G.w.close();
  // D
  const D = world('D', 'd_reaper', 'd_reaper', { iLead: true, instance: false, members: [] });
  await wait(1200);
  D.G.w.document.querySelector('[data-act="bot"]').click();
  let inD = false; for (let i = 0; i < 40 && !inD; i++) { await wait(300); inD = D.G.store.getState().world.mapId === 'primary_village'; }
  check('D: Mother D-Reaper – Raid d_reaper gefunden und betreten', inD && D.enters[0] === 'd_reaper', `${D.enters.join(',')} · ${D.G.status()}`);
  D.G.w.close();
  // E
  const E = world('E', 'd_reaper', 'd_reaper', { iLead: true, instance: false, members: [] }, true);
  await wait(1200);
  E.G.w.document.querySelector('[data-act="bot"]').click();
  for (let i = 0; i < 150 && !E.order.includes('d_reaper'); i++) await wait(300);
  check('E: Greifhand zuerst, dann Add, dann Boss', E.order[0] === 'reaper_creep_hand' && E.order.indexOf('icedevimon') < E.order.indexOf('d_reaper'), E.order.join(',') + ' · ' + E.G.status() + ' · ' + E.G.store.getState().world.mapId + ' · ' + [...E.G.ents.values()].map((e) => e.id + ':' + e.defId + ':' + e.flags + ':' + e.hp).join(' ') + ' · tgt ' + E.G.store.getState().target?.id);
  E.G.w.close();
  const F = world('F', 'd_reaper', 'd_reaper', { iLead: true, instance: false, members: [] }, 'two');
  await wait(1200);
  F.G.w.document.querySelector('[data-act="bot"]').click();
  for (let i = 0; i < 150 && !F.order.includes('reaper_creep_hand'); i++) await wait(300);
  check('F: zwei Hände – meine zuerst', F.ids[0] === 'h:1', F.ids.join(',') + ' · ' + F.G.status());
  F.G.w.close();
  console.log(results.every(Boolean) ? 'OK – Raids Beelzebumon/D-Reaper mit Fremden' : 'FEHLER');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
