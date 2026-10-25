// 2.6.2: Sammel-Quest, deren Item nur in digimon[art].mob.drops steht -> Quest-Jagd muss die Art jagen
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const [script, fake] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://play.digimmo.com.br/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
const w = dom.window;
w.HTMLCanvasElement.prototype.getContext = () => null;
w.eval(fake);
const F = w.__fake, C = w.dmo.game.scene.getScene('world').deps.content;
C.items = { sleepy_spore: { name: 'Sleepy Spore' } };
C.quests = { s_spores: { id: 's_spores', name: 'Lullaby Spores', objectives: [{ kind: 'collect', itemId: 'sleepy_spore', count: 3 }] } };
C.dailyById = {};
C.digimon.mushroomon.mob = { drops: [{ itemId: 'sleepy_spore', chance: 0.5 }] };
const me = F.store.getState().me;
F.store.setState({ me: { ...me, quests: { s_spores: { state: 1, counters: [1] } } } });
w.localStorage.setItem('cdigi.cfg', JSON.stringify({ questMode: true, hpPot: 0, dsPot: 0, tdsPot: 0, lvlDiff: 5 }));
w.eval(script);
(async () => {
  await new Promise((r) => setTimeout(r, 600));
  w.document.querySelector('[data-act="bot"]').click();
  await new Promise((r) => setTimeout(r, 1500));
  const status = w.document.querySelector('[data-f="status"]').textContent;
  const picked = F.selects.map((id) => F.ents.get(id)?.defId);
  console.log('Auswahl:', picked.join(',') || '-', '| Status:', status);
  const ok = picked.length > 0 && picked.every((sp) => sp === 'mushroomon') && !/erledigt/.test(status);
  console.log(ok ? 'OK – jagt Mushroomon für Sleepy Spores' : 'FEHLER');
  process.exit(ok ? 0 : 1);
})();
