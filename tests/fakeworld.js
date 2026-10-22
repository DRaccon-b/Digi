// Fake-Spielwelt (wie Native Forest) für Offline-Tests von DigiBot
(function (w) {
  let state = {}, subs = [];
  const store = { getState: () => state, setState: (p) => { state = { ...state, ...p }; subs.forEach((f) => f()); }, subscribe: (f) => subs.push(f) };
  const ents = new Map();
  const E = (o) => ents.set(o.id, { flags: 0, targetId: '', hp: 1000, maxHp: 1000, ...o });
  const content = {
    digimon: { kunemon: { name: 'Kunemon' }, mushroomon: { name: 'Mushroomon' }, goburimon: { name: 'Goburimon' }, betamon: { name: 'Betamon' }, kuwagamon: { name: 'Kuwagamon' } },
    maps: { native_forest: { name: 'Native Forest' } },
    spawns: { native_forest: {
      zones: {
        meadow: { entries: [{ species: 'kunemon', level: [1, 3] }, { species: 'mushroomon', level: [2, 3] }, { species: 'kunemon', level: [3, 5] }] },
        grove: { entries: [{ species: 'goburimon', level: [5, 6] }, { species: 'mushroomon', level: [6, 8] }] },
        deep_woods: { entries: [{ species: 'betamon', level: [9, 12] }] },
        southern_shore: { entries: [{ species: 'betamon_shore', level: [9, 12] }] },
      },
      bosses: [{ species: 'kuwagamon', level: 10, title: 'Terror of the Deep Woods', respawnMs: 300000 },
               { species: 'shellmon_shore', level: 11, title: 'Guardian of the Beach', respawnMs: 300000 }],
    } },
  };
  const selects = [];
  const toTarget = (id) => { const e = ents.get(id); return e ? { id, kind: 'mob', name: e.defId, level: e.level, hp: e.hp, maxHp: e.maxHp } : null; };
  const scene = { deps: { content }, select: (id) => { selects.push(id); store.setState({ target: toTarget(id) }); } };
  w.dmo = { store, net: { state: { entities: ents } }, game: { scene: { getScene: (k) => (k === 'world' ? scene : null) } } };
  E({ id: 'p:me', kind: 1, x: 500, y: 500 }); E({ id: 't:me', kind: 0, x: 515, y: 512 });
  E({ id: 'm:1', kind: 2, defId: 'kunemon', level: 4, x: 560, y: 470 });                       // normal, nah
  E({ id: 'm:2', kind: 2, defId: 'kunemon', level: 5, x: 430, y: 560, flags: 1024 | 32 });      // Elite, aggressiv
  E({ id: 'm:3', kind: 2, defId: 'mushroomon', level: 6, x: 610, y: 560 });                     // normal
  E({ id: 'm:4', kind: 2, defId: 'goburimon', level: 6, x: 380, y: 420 });                      // normal
  E({ id: 'm:5', kind: 2, defId: 'kuwagamon', level: 10, x: 720, y: 380, flags: 16 | 32 });     // Feldboss
  E({ id: 'm:6', kind: 2, defId: 'mushroomon', level: 3, x: 300, y: 600 });
  store.setState({ screen: 'world', inputFocus: 'game', cooldowns: {}, world: { mapId: 'native_forest', mapName: 'Native Forest' }, target: null,
    me: { tamerEntityId: 't:me', tamerDs: 300, tamerMaxDs: 360, hotbar: ['cmd:attack', 'skill:0', 'skill:1', null, null, null, null, null, 'item:meat'],
      inventory: [{ itemId: 'meat', qty: 8 }],
      partner: { entityId: 'p:me', name: 'Gabumon', level: 6, hp: 3000, maxHp: 3752, ds: 500, maxDs: 766, exp: 145, expNext: 1026,
        skills: [{ name: 'Blue Blaster', dsCost: 60, unlocked: true }, { name: 'Horn Attack', dsCost: 20, unlocked: true }] } } });
  w.__fake = { store, ents, E, selects, toTarget };
})(window);
