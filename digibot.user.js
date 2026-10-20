// ==UserScript==
// @name         DigiBot – Status-Anzeige
// @namespace    digibot
// @version      2.8.0
// @description  Status-Anzeige (HP/DS/EXP, Ziel) plus Bot: Ziel per Tab suchen, mit 1 angreifen, Skills 2–6, Tränke mit F1–F3.
// @match        https://play.digimmo.com.br/*
// @run-at       document-idle
// @grant        none
// @homepageURL  https://github.com/DRaccon-b/Digi
// @updateURL    https://raw.githubusercontent.com/DRaccon-b/Digi/main/digibot.user.js
// @downloadURL  https://raw.githubusercontent.com/DRaccon-b/Digi/main/digibot.user.js
// ==/UserScript==

(function () {
  'use strict';

  const POS_KEY = 'digibot.pos';

  // ---------- Styles ----------
  const CSS = `
    .digibot{position:fixed;z-index:2147483647;width:320px;font:12px/1.35 system-ui,Segoe UI,sans-serif;
      color:#e8ecf4;background:rgba(14,18,32,.92);border:1px solid #3a4670;border-radius:10px;
      box-shadow:0 6px 24px rgba(0,0,0,.5);user-select:none;backdrop-filter:blur(4px)}
    .digibot__head{display:flex;align-items:center;gap:6px;padding:6px 10px;cursor:move;
      border-bottom:1px solid #2a3355;font-weight:700;letter-spacing:.5px}
    .digibot__head span{flex:1}
    .digibot__btn{background:#26305a;border:1px solid #3a4670;color:#e8ecf4;border-radius:5px;
      font:11px system-ui;padding:1px 6px;cursor:pointer}
    .digibot__btn:hover{background:#34407a}
    .digibot__body{padding:8px 10px 10px;max-height:min(calc(100vh - 110px), 560px);overflow-y:auto}
    .digibot.is-min .digibot__body{display:none}
    .digibot.is-min .digibot__head{border-bottom:0}
    .digibot__sec{margin-bottom:8px}
    .digibot__sec:last-child{margin-bottom:0}
    .digibot__title{font-weight:600;margin-bottom:3px;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .digibot__row{display:grid;grid-template-columns:28px 1fr;align-items:center;gap:6px;margin:3px 0}
    .digibot__lbl{font-weight:700;font-size:11px;opacity:.8}
    .digibot__bar{position:relative;height:16px;background:#1b2140;border-radius:4px;overflow:hidden}
    .digibot__fill{position:absolute;inset:0 auto 0 0;width:0;transition:width .15s linear}
    .digibot__txt{position:relative;display:flex;justify-content:space-between;padding:0 5px;
      font-size:11px;font-weight:600;line-height:16px;text-shadow:0 1px 2px #000;font-variant-numeric:tabular-nums}
    .hp .digibot__fill{background:linear-gradient(90deg,#c0392b,#e74c3c)}
    .hp.low .digibot__fill{background:linear-gradient(90deg,#8e0000,#ff1f1f);animation:digibot-blink 1s infinite}
    .ds .digibot__fill{background:linear-gradient(90deg,#1f5fbf,#3fa0ff)}
    .tds .digibot__fill{background:linear-gradient(90deg,#6b3fbf,#a07bff)}
    .tg .digibot__fill{background:linear-gradient(90deg,#b8860b,#f1c40f)}
    .exp .digibot__fill{background:linear-gradient(90deg,#1e8449,#2ecc71)}
    .digibot__stats{display:grid;grid-template-columns:auto 1fr;gap:1px 8px;margin-top:4px;font-size:11px;
      font-variant-numeric:tabular-nums}
    .digibot__stats dt{opacity:.7}
    .digibot__stats dd{margin:0;text-align:right;font-weight:600}
    .digibot__none{opacity:.55;font-style:italic}
    .digibot__runbar{padding:6px 10px 4px}
    .digibot__run{width:100%;padding:4px;font-weight:700;font-size:12px;margin-bottom:3px}
    .digibot__run.on{background:#1e8449;border-color:#2ecc71}
    .digibot__status{font-size:11px;opacity:.8;min-height:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .digibot__tabs{display:flex;padding:0 6px;border-bottom:1px solid #2a3355}
    .digibot__tabs button{flex:1;background:none;border:0;border-bottom:2px solid transparent;color:#9aa5c4;
      font:600 11px system-ui;padding:5px 0 4px;cursor:pointer}
    .digibot__tabs button:hover{color:#e8ecf4}
    .digibot__tabs button.on{color:#fff;border-bottom-color:#3fa0ff}
    .digibot.is-min .digibot__tabs{display:none}
    .digibot [data-page]{display:none}
    .digibot [data-page].on{display:block}
    .digibot__hint{font-size:10px;opacity:.6;margin-top:4px;line-height:1.35}
    .digibot__listhead{display:flex;align-items:center;gap:4px;margin-bottom:3px}
    .digibot__listhead .digibot__title{flex:1;margin:0}
    .digibot__mobs{display:flex;flex-direction:column;gap:2px;max-height:220px;overflow-y:auto;padding-right:2px}
    .digibot__mob{display:grid;grid-template-columns:auto auto 1fr auto;align-items:center;gap:5px;padding:2px 5px;
      border-radius:4px;background:#161c33;border-left:3px solid var(--c);cursor:pointer;font-size:11px}
    .digibot__mob input{margin:0;accent-color:var(--c)}
    .digibot__mob .tag{font:700 9px system-ui;padding:0 4px;border-radius:3px;background:var(--c);color:#0b1020;text-transform:uppercase}
    .digibot__mob .name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .digibot__mob .lv{opacity:.7;font-variant-numeric:tabular-nums;white-space:nowrap}
    .digibot__mob.out .name,.digibot__mob.out .lv{opacity:.45}
    .digibot__mob.off{opacity:.55}
    .digibot__mob .sub{display:block;font-size:9.5px;opacity:.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .digibot__tabs button{font-size:10.5px}
    .digibot__switch{display:flex;gap:7px;align-items:flex-start;padding:6px;border-radius:6px;background:#161c33;
      font-size:11px;cursor:pointer;margin-bottom:6px}
    .digibot__switch input{margin:2px 0 0;accent-color:#2ecc71}
.digibot__switch--ap input{accent-color:#ffd43b}
    .digibot__apgrind{margin:-2px 0 6px 6px;font-size:11px}
    .digibot__apcfg{display:grid;gap:3px;margin:0 0 6px;padding:5px 6px;border-radius:6px;background:#161c33;font-size:11px}
    .digibot__apcfg>label:not(.digibot__skill){display:grid;grid-template-columns:86px 1fr;align-items:center;gap:4px}
    .digibot__apcfg select{min-width:0;background:#0b1020;color:#e8ecf4;border:1px solid #3a4670;border-radius:4px;font:11px system-ui;padding:1px 2px}
    .digibot__apcfg [data-sweeponly].hide{display:none}
    .digibot__apinfo{font-size:11px;margin:-2px 0 6px;padding:4px 6px;border-radius:5px;background:#2a2410;color:#ffe08a;display:none}
    .digibot__apinfo.on{display:block}
    .digibot__qsum{font-size:11px;margin-bottom:6px;min-height:14px}
    .digibot__quests{display:flex;flex-direction:column;gap:5px;max-height:220px;overflow-y:auto;padding-right:2px}
    .digibot__quest{padding:5px 6px;border-radius:6px;background:#161c33;border-left:3px solid var(--c);font-size:11px}
    .digibot__quest.off{opacity:.5}
    .digibot__quest header{display:flex;align-items:center;gap:5px;font-weight:600;cursor:pointer}
    .digibot__quest header input{margin:0;accent-color:var(--c)}
    .digibot__quest header span{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .digibot__quest .badge{font:700 9px system-ui;padding:0 4px;border-radius:3px;background:var(--c);color:#0b1020;text-transform:uppercase}
    .digibot__obj{display:grid;grid-template-columns:1fr auto;gap:0 6px;margin-top:3px;align-items:center}
    .digibot__obj .t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .digibot__obj .n{font-variant-numeric:tabular-nums;opacity:.85}
    .digibot__obj .w{grid-column:1/-1;font-size:9.5px;opacity:.65}
    .digibot__obj .w.here{color:#2ecc71;opacity:1}
    .digibot__obj .pb{grid-column:1/-1;height:4px;background:#0b1020;border-radius:2px;overflow:hidden;margin-top:1px}
    .digibot__obj .pb i{display:block;height:100%;background:var(--c)}
    .digibot__obj.done .t{text-decoration:line-through;opacity:.6}
    .digibot__quest .turnin{margin-top:3px;font-size:10px;color:#ffd43b}
.digibot__tabs button{font-size:10px}
    .digibot__log{display:flex;flex-direction:column;gap:1px;font-size:10.5px;font-variant-numeric:tabular-nums;
      max-height:220px;overflow-y:auto;padding-right:2px}
    .digibot__log div{display:grid;grid-template-columns:auto 1fr;gap:6px;padding:1px 4px;border-left:3px solid var(--c);
      background:#131a30;border-radius:3px}
    .digibot__log time{opacity:.55}
    .digibot__log b{font-weight:600;opacity:.6}
    .digibot__legend span.ring::before{background:transparent;box-shadow:inset 0 0 0 2px var(--c)}
    .digibot__set{display:grid;grid-template-columns:1fr 52px;align-items:center;gap:0 6px;font-size:11px;margin:2px 0}
    .digibot__set b{text-align:right;font-variant-numeric:tabular-nums}
    .digibot__set input{grid-column:1/-1;width:100%;margin:0;accent-color:#3fa0ff;height:14px}
    .digibot__radar{display:block;width:100%;height:160px;background:#0b1020;border:1px solid #2a3355;border-radius:6px}
    .digibot__legend{display:flex;flex-wrap:wrap;gap:2px 8px;margin-top:3px;font-size:10px;opacity:.8}
    .digibot__legend span::before{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;
      background:var(--c);margin-right:3px;vertical-align:0}
    .digibot__set i{font-style:normal;opacity:.65}
    .digibot__set i.empty{color:#ff6b6b;opacity:1}
    .digibot__skills{margin:4px 0 6px;font-size:11px}
    .digibot__skill{display:flex;align-items:center;gap:5px;margin:1px 0;cursor:pointer}
    .digibot__skill input{margin:0;accent-color:#2ecc71}
    .digibot__skill kbd{font:600 10px system-ui;background:#26305a;border:1px solid #3a4670;border-radius:3px;padding:0 4px}
    .digibot__skill span{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .digibot__skill em{font-style:normal;opacity:.7;font-variant-numeric:tabular-nums}
    .digibot__skill.off span{opacity:.45}
    .digibot__farmch{display:flex;gap:8px;flex-wrap:wrap;font-size:11px;margin:0 0 6px}
    .digibot__farmch label{display:flex;gap:3px;align-items:center;cursor:pointer}
    .digibot__farmch input{margin:0;accent-color:#ffd43b}
    .digibot__bosspick{display:flex;flex-direction:column;gap:2px;max-height:150px;overflow-y:auto;padding-right:2px;margin-bottom:6px}
    .digibot__bosspick label{display:grid;grid-template-columns:auto 1fr auto;gap:5px;align-items:center;padding:2px 5px;
      border-radius:4px;background:#161c33;font-size:11px;cursor:pointer}
    .digibot__bosspick input{margin:0;accent-color:#ff6b6b}
    .digibot__bosspick span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .digibot__bosspick em{font-style:normal;opacity:.65;font-variant-numeric:tabular-nums}
    .digibot__timers{display:flex;flex-direction:column;gap:4px;margin-bottom:6px;max-height:220px;overflow-y:auto;padding-right:2px}
    .digibot [data-farmmode].hide{display:none}
    .digibot__bskills{margin-bottom:8px;padding:5px 6px;border-radius:6px;background:#161c33;border-left:3px solid #ff6b6b;font-size:11px}
    .digibot__bskills b.head{display:block;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .digibot__bskill{display:grid;grid-template-columns:1fr auto;gap:0 6px;padding:2px 0;border-top:1px solid #222a48}
    .digibot__bskill:first-of-type{border-top:0}
    .digibot__bskill .n{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}
    .digibot__bskill .st{font-variant-numeric:tabular-nums;font-weight:700;text-align:right}
    .digibot__bskill .sub{grid-column:1/-1;font-size:9.5px;opacity:.7}
    .digibot__bskill .shape{display:inline-block;font:700 9px system-ui;padding:0 4px;border-radius:3px;background:#3a4670;margin-right:4px}
    .digibot__bskill .ready{color:#2ecc71}.digibot__bskill .cd{color:#ffa94d}.digibot__bskill .cast{color:#ff6b6b}.digibot__bskill .unk{opacity:.55}
    .digibot__routeinfo{font-size:11px;margin:0 0 6px;padding:4px 6px;border-radius:5px;background:#2a2410;color:#ffe08a}
    .digibot__stats [title]{cursor:help}
    .digibot__timer{padding:4px 6px;border-radius:6px;background:#161c33;border-left:3px solid #ff6b6b;font-size:11px}
    .digibot__timer.goal{border-left-color:#ffd43b;background:#221d10}
    .digibot__timer b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .digibot__timer div{display:grid;grid-template-columns:34px 1fr;gap:4px;font-variant-numeric:tabular-nums}
    .digibot__timer .up{color:#2ecc71}.digibot__timer .down{color:#ffa94d}.digibot__timer .unk{opacity:.55}
    .digibot__head .ver{flex:0;font-weight:500;font-size:10px;opacity:.5;letter-spacing:0}
    .digibot__modes{display:grid;grid-template-columns:repeat(4,1fr);gap:3px;margin-bottom:5px}
    .digibot__modes button{background:#161c33;border:1px solid #2a3355;color:#9aa5c4;border-radius:5px;
      font:600 10.5px system-ui;padding:3px 0;cursor:pointer}
    .digibot__modes button:hover{color:#e8ecf4;border-color:#3a4670}
    .digibot__modes button.on{background:#26305a;border-color:#3fa0ff;color:#fff;box-shadow:inset 0 -2px 0 #3fa0ff}
    .digibot__vitals{margin-top:4px}
    .digibot__row.mini{grid-template-columns:30px 1fr;margin:2px 0}
    .digibot__row.mini .digibot__lbl{font-size:10px}
    .digibot__row.mini .digibot__bar{height:11px;border-radius:3px}
    .digibot__row.mini .digibot__txt{font-size:9.5px;line-height:11px}
    .digibot.is-min .digibot__vitals{display:block}
    .digibot__grp{margin-bottom:6px;border:1px solid #2a3355;border-radius:7px;background:rgba(22,28,51,.55)}
    .digibot__grp:last-child{margin-bottom:0}
    .digibot__grp>summary{list-style:none;cursor:pointer;padding:5px 8px;font-weight:600;display:flex;align-items:center;
      gap:6px;white-space:nowrap;overflow:hidden}
    .digibot__grp>summary::-webkit-details-marker{display:none}
    .digibot__grp>summary::before{content:'▸';font-size:10px;opacity:.6;transition:transform .15s}
    .digibot__grp[open]>summary::before{transform:rotate(90deg)}
    .digibot__grp>summary>span:first-child{flex:1;overflow:hidden;text-overflow:ellipsis}
    .digibot__grp>summary:hover{color:#fff}
    .digibot__grpbody{padding:0 8px 7px}
    .digibot__grp .digibot__apcfg{background:transparent;padding:0;margin-bottom:4px}
    .digibot__grp .digibot__bskills{background:transparent;border:0;padding:0;margin:0}
    .digibot__grp .digibot__title{font-size:11px;margin-top:4px}
    .digibot .info{font-style:normal;font-weight:400;opacity:.55;cursor:help}
    .digibot .info:hover{opacity:1}
    .digibot__chk{align-items:flex-start;margin:3px 0}
    .digibot__chk input{margin-top:1px}
    .digibot__chk span{white-space:normal;line-height:1.3}
    .digibot__qsum:empty{display:none}
    .digibot__btnrow{display:flex;gap:4px;justify-content:flex-end;margin-bottom:4px}
    .digibot__tabs button{font-size:11px}
    @keyframes digibot-blink{50%{opacity:.55}}
  `;

  // ---------- Markup ----------
  const bar = (cls, label) => `
    <div class="digibot__row ${cls}" data-bar="${cls}">
      <div class="digibot__lbl">${label}</div>
      <div class="digibot__bar"><div class="digibot__fill"></div>
        <div class="digibot__txt"><span class="v">–</span><span class="p">–</span></div></div>
    </div>`;

  // ---------- Bot-Einstellungen ----------
  const CFG_KEY = 'digibot.cfg';
  const SKILL_KEYS = [2, 3, 4, 5, 6]; // Tasten, deren Skills automatisch gewirkt werden dürfen
  const cfg = {
    tab: 'data', lvlDiff: 5, radius: 300, hpPot: 40, dsPot: 20, tdsPot: 20,
    skills: { 2: true, 3: true, 4: true, 5: true, 6: true },
    mobs: {}, // { [mapId]: { 'kunemon|elite': false, ... } } – nicht gesetzt = Standard (Bosse aus, Rest an)
    questMode: false, // nur Monster für offene Quest-Ziele jagen, danach Bot stoppen
    questOff: {},     // { [questId]: true } – Quests, die der Quest-Modus ignorieren soll
    dodge: true,      // Flächenangriffen (Warnkreisen) ausweichen
    mirror: true,     // bei Spiegel/Reflexion des Ziels nicht angreifen
    skipTaken: true,  // keine Gegner angreifen, die andere Spieler gerade bekämpfen
    safeCast: true,   // gegen Bosse: Skills nur, wenn danach noch Zeit zum Ausweichen bleibt (und kein Spiegel droht)
    autopilot: false, // Quests annehmen, hinreisen, erledigen, abgeben
    apGrind: true,    // Autopilot: bei Level-Sperren/Level-Zielen grinden statt stoppen
    apOrder: 'near',  // 'near' = nächste Aufgabe zuerst, 'sweep' = Map für Map absteigend
    apStartMap: '',   // Start-Map der Runde ('' = höchste erreichbare)
    apSweepMap: '',   // aktuelle Map der laufenden Runde (Fortschritt, überlebt Neuladen)
    apQuestPartner: '',   // partnerId, mit dem Quests erledigt werden ('' = aktuellen behalten)
    apEvo: '',            // Digitation (Art) für das Quest-Digimon ('' = keine)
    apTurninPartner: '',  // partnerId für die Abgabe ('' = wie Quest-Digimon)
    apRepeat: true,       // tägliche (wiederholbare) NPC-Quests wieder annehmen, sobald sie heute verfügbar sind
    apDailies: false,     // Daily-Board (ab Lv 11) mitnehmen
    apTeleport: false,    // mit dem Digi-Phone schnellreisen (kostet Bits)
    farm: false,          // Boss-Rotation: ausgewählte Feldbosse reihum besiegen (Digi-Eier farmen)
    farmBosses: ['tower_forest#arukenimon', 'kaiser_canyon#metalgreymon_spiral'], // "map#art"
    farmChannels: [1, 2], // nur diese Kanäle
    farmMode: 'boss',     // 'boss' = Boss-Rotation, 'named' = Named-Elite-Runde (Map für Map)
    routeStart: '',       // Named-Runde: Start-Map (leer = niedrigste)
    routeEnd: '',         // Named-Runde: End-Map (leer = höchste)
    open: {},             // auf-/zugeklappte Gruppen im Panel
  };
  try {
    const saved = JSON.parse(localStorage.getItem(CFG_KEY) || '{}');
    Object.assign(cfg, saved, {
      skills: { ...cfg.skills, ...saved.skills }, mobs: { ...saved.mobs }, questOff: { ...saved.questOff },
    });
  } catch {}
  // Betriebsart (genau eine): Grinden, Quest-Jagd (Quest-Modus), Quest-Autopilot oder Bosse (Rotation/Named-Runde)
  const MODES = { grind: 'Grinden', quest: 'Quest-Jagd', auto: 'Autopilot', farm: 'Bosse' };
  const modeOf = () => (cfg.farm ? 'farm' : cfg.autopilot ? 'auto' : cfg.questMode ? 'quest' : 'grind');
  {
    const m = modeOf(); // alte Einstellungen mit mehreren Schaltern auf eine Betriebsart bringen
    cfg.questMode = m === 'quest'; cfg.autopilot = m === 'auto'; cfg.farm = m === 'farm';
  }
  if (cfg.tab === 'care') cfg.tab = 'attack';
  const mobOn = (mapId, key, cat) => cfg.mobs[mapId]?.[key] ?? cat !== 'boss';
  const saveCfg = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch {} };

  // Monster-Kategorien (aus den Entity-Flags des Spiels) mit Farbe für Liste und Radar
  const CAT = {
    normal: { label: 'Normal', color: '#9aa5b1' },
    elite: { label: 'Elite', color: '#c084fc' },
    boss: { label: 'Boss', color: '#ff6b6b' },
  };

  const potLabel = (v) => (v > 0 ? `${v} %` : 'aus');
  const LABELS = {};
  const slider = (key, label, min, max, fmtV, fKey, step = 1) => {
    LABELS[key] = fmtV;
    return `
    <label class="digibot__set"><span>${label}${fKey ? ` <i data-cnt="${fKey}"></i>` : ''}</span><b data-v="${key}">${fmtV(cfg[key])}</b>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${cfg[key]}" data-cfg="${key}">
    </label>`;
  };

  // Einklappbare Gruppe; der Zustand wird in cfg.open gespeichert
  const escAttr = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const grp = (key, title, body, openDef = true, info = '', attrs = '') => `
    <details class="digibot__grp" data-grp="${key}" ${attrs} ${(cfg.open?.[key] ?? openDef) ? 'open' : ''}>
      <summary><span>${title}</span>${info ? `<i class="info" title="${escAttr(info)}">ⓘ</i>` : ''}</summary>
      <div class="digibot__grpbody">${body}</div>
    </details>`;
  const check = (flag, label) => `<label class="digibot__skill digibot__chk"><input type="checkbox" data-apflag="${flag}" ${cfg[flag] ? 'checked' : ''}><span>${label}</span></label>`;

  const HTML = `
    <div class="digibot__head"><span>DigiBot</span><span class="ver">v${typeof GM_info !== 'undefined' ? GM_info.script?.version || '' : '2.8.0'}</span>
      <button class="digibot__btn" data-act="pip" title="In eigenes Fenster (immer im Vordergrund)">⧉</button>
      <button class="digibot__btn" data-act="min" title="Ein-/Ausklappen">–</button>
    </div>
    <div class="digibot__runbar">
      <div class="digibot__modes">${Object.entries(MODES).map(([k, l]) => `<button data-mode="${k}" title="${escAttr({
        grind: 'Monster aus der Liste (Reiter Kampf) im Suchradius jagen',
        quest: 'Nur Monster für offene Quest-Ziele auf dieser Map jagen, danach stoppen',
        auto: 'Quests annehmen, hinreisen, erledigen und abgeben (Reiter Quests)',
        farm: 'Boss-Rotation oder Named-Elite-Runde (Reiter Bosse)',
      }[k])}">${l}</button>`).join('')}</div>
      <button class="digibot__btn digibot__run" data-act="bot" title="Alt+B">▶ Start</button>
      <div class="digibot__status" data-f="status">Bot aus</div>
      <div class="digibot__vitals">${bar('hp mini', 'HP').replace('data-bar="hp mini"', 'data-bar="mhp"')}${bar('ds mini', 'DS').replace('data-bar="ds mini"', 'data-bar="mds"')}${bar('tg mini', 'Ziel').replace('data-bar="tg mini"', 'data-bar="mtg"')}</div>
    </div>
    <nav class="digibot__tabs">
      <button data-tab="data">Übersicht</button><button data-tab="attack">Kampf</button><button data-tab="quest">Quests</button><button data-tab="farm">Bosse</button><button data-tab="log">Log</button>
    </nav>
    <div class="digibot__body">
      <section data-page="data">
        ${grp('digimon', '<span data-f="partner">Digimon</span>', `
          ${bar('hp', 'HP')}
          ${bar('ds', 'DS')}
          ${bar('exp', 'EXP')}
          <dl class="digibot__stats">
            <dt data-tip="rate">EXP / Min</dt><dd data-f="rate" data-tip="rate">–</dd>
            <dt data-tip="bitrate">Bits / Min</dt><dd data-f="bitrate" data-tip="bitrate">–</dd>
            <dt>Level-Up in</dt><dd data-f="eta">–</dd>
            <dt>EXP Sitzung <button class="digibot__btn" data-act="reset" title="EXP-/Bits-Messung zurücksetzen">↺</button></dt>
            <dd data-f="sess">–</dd>
          </dl>`, true, 'Maus über EXP / Min oder Bits / Min zeigt die Hochrechnung pro Stunde.')}
        ${grp('tamer', 'Tamer', bar('tds', 'DS'))}
        ${grp('target', '<span data-f="target">Ziel</span>', bar('tg', 'HP'))}
        ${grp('radar', '<span data-f="radar">Radar</span>', `
          <canvas class="digibot__radar" width="476" height="320"></canvas>
          <div class="digibot__legend">
            <span style="--c:#2ecc71">passend</span><span style="--c:#7c8496">aus / Level ≠</span>
            <span style="--c:#ff4d4d">greift an</span><span style="--c:#ffa94d">belegt</span>
            <span class="ring" style="--c:${CAT.elite.color}">Elite</span><span class="ring" style="--c:${CAT.boss.color}">Boss</span>
          </div>`)}
      </section>

      <section data-page="attack">
        ${grp('skills', 'Skills (Tasten 2–6)', `<div class="digibot__skills">${SKILL_KEYS.map((k) => `
          <label class="digibot__skill" data-skill="${k}">
            <input type="checkbox" data-skillcfg="${k}" ${cfg.skills[k] ? 'checked' : ''}>
            <kbd>${k}</kbd><span>–</span><em></em>
          </label>`).join('')}</div>`, true, 'Haken = Skill wird im Kampf automatisch gewirkt, sobald er bereit ist und genug DS da ist.')}
        ${grp('pots', 'Tränke &amp; Food (F1–F3)', `
          ${slider('hpPot', 'Digimon HP (F1) unter', 0, 95, potLabel, 1)}
          ${slider('dsPot', 'Digimon DS (F2) unter', 0, 95, potLabel, 2)}
          ${slider('tdsPot', 'Tamer DS (F3) unter', 0, 95, potLabel, 3)}`, true,
          'Food/Tränke auf F1–F3 der Hotbar legen. Ist auf F1 nichts mehr da und die HP unter der Schwelle, beendet der Bot den Kampf und wartet auf 100 % HP (Ruhemodus).')}
        ${grp('targeting', 'Zielwahl', `
          ${slider('lvlDiff', 'Max. Level über dem Digimon', 0, 100, (v) => `+${v}`)}
          ${slider('radius', 'Suchradius', 100, 800, (v) => `${v} px`, 0, 20)}
          ${check('skipTaken', 'Keine Gegner angreifen, die andere Spieler bekämpfen')}`, true,
          'Schwächere Monster werden immer angegriffen, nur zu starke (über +Level) nicht. Angreifer werden immer abgewehrt.')}
        ${grp('mech', 'Boss-Mechaniken', `
          ${check('dodge', 'Warnkreisen/-strahlen ausweichen')}
          ${check('mirror', 'Bei Spiegel/Reflexion nicht angreifen')}
          ${check('safeCast', 'Skills nur, wenn danach noch Zeit zum Ausweichen bleibt')}`, true,
          'Ausweichen: raus aus Kreisen, Strahlen und Fächern, möglichst mit freier Linie zum Ziel. Spiegel: weder 1 noch Skills, solange das Ziel Schaden zurückwirft. Skill-Timing: lange Casts nur, wenn eine mögliche Boss-Attacke noch Zeit zum Ausweichen lässt.')}
        ${grp('mobs', '<span data-f="mapname">Monster auf dieser Map</span>', `
          <div class="digibot__btnrow"><button class="digibot__btn" data-act="mobs-all">alle an</button><button class="digibot__btn" data-act="mobs-none">alle aus</button></div>
          <div class="digibot__mobs" data-f="mobs"><div class="digibot__none">warte auf Spielwelt…</div></div>`, true,
          'Haken = wird im Modus Grinden gejagt. Angreifer werden immer abgewehrt, auch wenn sie abgewählt sind. ⚔ = aggressiv.')}
      </section>

      <section data-page="quest">
        <div class="digibot__apinfo" data-f="apinfo"></div>
        ${grp('apcfg', 'Autopilot-Einstellungen', `
          <label class="digibot__skill"><input type="checkbox" data-apgrind ${cfg.apGrind ? 'checked' : ''}><span>Bei Level-Sperren grinden statt stoppen</span></label>
          <div class="digibot__apcfg">
            <label>Reihenfolge<select data-apsel="apOrder">
              <option value="near">Nächste Aufgabe zuerst</option>
              <option value="sweep">Map für Map: annehmen → erledigen → abgeben</option></select></label>
            <label data-sweeponly>Start-Map<select data-apsel="apStartMap"></select></label>
            <label>Quest-Digimon<select data-apsel="apQuestPartner"></select></label>
            <label>Digitation<select data-apsel="apEvo"></select></label>
            <label>Abgabe-Digimon<select data-apsel="apTurninPartner"></select></label>
          </div>
          ${check('apRepeat', 'Tägliche NPC-Quests (wiederholbar) mitnehmen')}
          ${check('apDailies', 'Daily-Board (ab Lv 11) mitnehmen')}
          ${check('apTeleport', 'Mit Digi-Phone schnellreisen (kostet Bits)')}`, false,
          'Gilt für den Modus Autopilot. Der Autopilot kämpft unterwegs nur gegen Angreifer.')}
        ${grp('quests', 'Aktive Quests', `
          <div class="digibot__qsum" data-f="qsum"></div>
          <div class="digibot__quests" data-f="quests"><div class="digibot__none">warte auf Spielwelt…</div></div>`, true,
          'Haken weg = Quest wird ignoriert. Quest-Jagd jagt nur auf der aktuellen Map (Abgeben machst du); der Autopilot erledigt auch Gespräche, Reisen, Annehmen und Abgeben. Level-, Digitations- und Brut-Ziele erledigt keiner von beiden.')}
      </section>

      <section data-page="farm">
        ${grp('bskills', 'Attacken des Bosses', `<div class="digibot__bskills" data-f="bskills"><div class="digibot__none">Kein Boss im Kampf – Attacken erscheinen hier, sobald du einen Boss anvisierst.</div></div>`, true,
          'Form, Ansage und Cooldown jeder Attacke. Der Countdown läuft ab dem ersten beobachteten Einsatz; „bereit“ heißt „kann jederzeit kommen“.')}
        ${grp('farmcfg', 'Boss-Farmen', `
          <div class="digibot__apcfg">
            <label>Art<select data-apsel="farmMode">
              <option value="boss">Boss-Rotation (ausgewählte Bosse)</option>
              <option value="named">Named-Elite-Runde (Map für Map)</option></select></label>
            <label data-farmmode="named">Start-Map<select data-apsel="routeStart"></select></label>
            <label data-farmmode="named">End-Map<select data-apsel="routeEnd"></select></label>
          </div>
          <div class="digibot__routeinfo" data-farmmode="named" data-f="routeinfo">–</div>
          <div class="digibot__title">Kanäle</div>
          <div class="digibot__farmch">${[1, 2, 3, 4].map((c) => `<label><input type="checkbox" data-farmch="${c}" ${(cfg.farmChannels || []).includes(c) ? 'checked' : ''}>Ch ${c}</label>`).join('')}</div>`, true,
          'Gilt für den Modus Bosse. Boss-Rotation: reist zum ausgewählten Boss, der als Nächstes da ist. Named-Elite-Runde: Maps von Start bis Ende ablaufen, je Kanal prüfen (lebt → kämpfen, Respawn unter 2 min → warten, sonst weiter), danach per Digi-Phone zurück. Kanalwechsel nur außerhalb des Kampfes; das Level-Limit gilt für diese Bosse nicht.')}
        ${grp('timers', 'Timer', `<div class="digibot__timers" data-f="timers"><div class="digibot__none">Keine Bosse ausgewählt.</div></div>`, true,
          'Aus dem Boss-Fenster des Spiels, der Map-Info deines Kanals und eigenen Siegen. ★ = aktuelles Ziel, „hier“ = dein Standort.')}
        ${grp('bosspick', 'Bosse auswählen', `<div class="digibot__bosspick" data-f="bosspick"><div class="digibot__none">warte auf Spielwelt…</div></div>`, false, '', 'data-farmmode="boss"')}
      </section>

      <section data-page="log">
        <div class="digibot__listhead">
          <span class="digibot__title">Protokoll <i data-f="logcount"></i></span>
          <button class="digibot__btn" data-act="log-copy">Kopieren</button>
          <button class="digibot__btn" data-act="log-clear">Leeren</button>
        </div>
        <div class="digibot__log" data-f="log"><div class="digibot__none">Noch keine Einträge.</div></div>
        <div class="digibot__hint">Neueste oben. „Kopieren“ legt das ganze Protokoll in die Zwischenablage.</div>
      </section>
    </div>`;
  // ---------- Helpers ----------
  const fmt = (n) => Math.round(n).toLocaleString('de-DE');
  const pct = (v, m) => (m > 0 ? Math.max(0, Math.min(100, (v / m) * 100)) : 0);

  function setBar(root, key, v, m, lowAt) {
    const row = root.querySelector(`[data-bar="${key}"]`);
    if (!row) return;
    const has = typeof v === 'number' && typeof m === 'number' && m > 0;
    const p = has ? pct(v, m) : 0;
    row.querySelector('.digibot__fill').style.width = p + '%';
    row.querySelector('.v').textContent = has ? `${fmt(v)} / ${fmt(m)}` : '–';
    row.querySelector('.p').textContent = has ? `${p.toFixed(1)} %` : '';
    if (lowAt != null) row.classList.toggle('low', has && p <= lowAt);
  }

  const fmtDur = (ms) => {
    if (!isFinite(ms) || ms < 0) return '–';
    const s = Math.round(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h ? `${h} h ${m} min` : `${m} min ${String(s % 60).padStart(2, '0')} s`;
  };

  // ---------- EXP-Tracker ----------
  // Misst die EXP-Gewinne über ein gleitendes Fenster und rechnet daraus EXP/Min und die Zeit bis zum Level-Up.
  const RATE_WINDOW_MS = 5 * 60 * 1000;
  const exp = {
    last: null,     // { level, exp, expNext } beim letzten Update
    gains: [],      // [{ t, amount }] innerhalb des Fensters
    total: 0,       // EXP seit Start/Reset
    start: 0,

    reset() { this.last = null; this.gains = []; this.total = 0; this.start = 0; },

    update(p, now) {
      if (!p || typeof p.exp !== 'number' || typeof p.expNext !== 'number') return;
      const cur = { level: p.level, exp: p.exp, expNext: p.expNext };
      const prev = this.last;
      this.last = cur;
      if (!prev) { this.start = now; return; }

      let gained = 0;
      if (cur.level === prev.level) gained = cur.exp - prev.exp;
      else if (cur.level === prev.level + 1) gained = (prev.expNext - prev.exp) + cur.exp; // Level-Up
      // Sonst (Partner gewechselt, mehrere Level, EXP-Verlust): nicht werten.
      if (gained > 0) {
        this.gains.push({ t: now, amount: gained });
        this.total += gained;
      }
    },

    perMinute(now) {
      while (this.gains.length && now - this.gains[0].t > RATE_WINDOW_MS) this.gains.shift();
      if (!this.last || !this.gains.length) return 0;
      const span = Math.min(RATE_WINDOW_MS, now - this.start);
      if (span < 5000) return 0; // zu wenig Daten
      const sum = this.gains.reduce((a, g) => a + g.amount, 0);
      return sum / (span / 60000);
    },
  };

  // ---------- Protokoll ----------
  const LOG_MAX = 300;
  const LOG_COLORS = { bot: '#4dabf7', kill: '#2ecc71', potion: '#f783ac', auto: '#ffd43b', quest: '#fab005',
    map: '#3bc9db', level: '#69db7c', warn: '#ff6b6b' };
  const logbook = [];
  let logSig = 0;
  function logEvent(type, text) {
    const last = logbook[logbook.length - 1];
    if (last && last.type === type && last.text === text) { last.n = (last.n || 1) + 1; last.t = new Date(); }
    else logbook.push({ t: new Date(), type, text });
    if (logbook.length > LOG_MAX) logbook.shift();
    logSig++;
  }

  // Beobachtet den Spielstand und protokolliert Map-Wechsel, Level-Ups, Quest-Änderungen und Kills –
  // egal ob der Bot läuft oder du selbst spielst.
  const watchPrev = { map: null, level: null, quests: null, target: null, toasts: new Set() };
  function watchGame(st) {
    // Meldungen des Spiels (z. B. „Du bist noch nicht bereit für diese Quest“) mitschreiben – erklärt Ablehnungen
    for (const tst of st?.toasts || []) {
      const id = tst.id ?? tst.text;
      if (watchPrev.toasts.has(id)) continue;
      watchPrev.toasts.add(id);
      if (tst.kind === 'error' && tst.text) logEvent('warn', `Spiel: ${tst.text}`);
    }
    if (watchPrev.toasts.size > 200) watchPrev.toasts = new Set([...watchPrev.toasts].slice(-100));
    const me = st?.me;
    if (!me || st.screen !== 'world') return;
    const C = content();
    const mapName = (id) => C?.maps?.[id]?.name || id;
    const mapId = st.world?.mapId;
    if (watchPrev.map && mapId && mapId !== watchPrev.map) logEvent('map', `Map: ${mapName(watchPrev.map)} → ${mapName(mapId)}`);
    if (mapId) watchPrev.map = mapId;
    const lvl = me.partner?.level;
    if (watchPrev.level != null && lvl > watchPrev.level) logEvent('level', `Level-Up: ${me.partner.name} ist jetzt Lv ${lvl}`);
    watchPrev.level = lvl;
    const qs = me.quests || {};
    if (watchPrev.quests) {
      for (const [id, q] of Object.entries(qs)) {
        const prev = watchPrev.quests[id];
        const def = questDef(C, id);
        const name = def?.name || id;
        if ((prev?.state ?? 0) !== q.state) {
          const what = { 1: 'angenommen', 2: 'erfüllt – bereit zum Abgeben', 3: 'abgeschlossen' }[q.state];
          if (q.state === 3 && !isStory(id)) markDoneToday(id);
          if (what) logEvent('quest', `Quest „${name}“ ${what}`);
        } else if (q.state === 1 && JSON.stringify(prev.counters) !== JSON.stringify(q.counters)) {
          (def?.objectives || []).forEach((o, i) => {
            if ((q.counters?.[i] ?? 0) !== (prev.counters?.[i] ?? 0)) logEvent('quest', `„${name}“: ${q.counters[i]}/${o.count || 1}`);
          });
        }
      }
    }
    watchPrev.quests = Object.fromEntries(Object.entries(qs).map(([id, q]) => [id, { state: q.state, counters: [...(q.counters || [])] }]));
    const t = st.target, pt = watchPrev.target;
    if (pt && t && pt.id === t.id && pt.hp > 0 && t.hp <= 0 && t.kind === 'mob') logEvent('kill', `Besiegt: ${t.name} Lv ${t.level}`);
    watchPrev.target = t ? { id: t.id, hp: t.hp } : null;
  }

  // Bits pro Minute: Zuwächse im gleitenden 5-Minuten-Fenster (Ausgaben zählen nicht)
  const bitsRate = {
    last: null, gains: [], start: 0, total: 0,
    update(bits, now) {
      if (typeof bits !== 'number') return;
      if (this.last === null) { this.last = bits; this.start = now; return; }
      if (bits > this.last) { this.gains.push({ t: now, amount: bits - this.last }); this.total += bits - this.last; }
      this.last = bits;
    },
    perMinute(now) {
      while (this.gains.length && now - this.gains[0].t > RATE_WINDOW_MS) this.gains.shift();
      const span = Math.min(RATE_WINDOW_MS, now - this.start);
      if (this.last === null || !this.gains.length || span < 5000) return 0;
      return this.gains.reduce((a, g) => a + g.amount, 0) / (span / 60000);
    },
  };

  // ---------- Ausweichen ----------
  // Bosse kündigen Flächenangriffe am Boden an. Das Spiel führt sie in zwei Listen:
  //  - Warnkreise: scene.telegraphs.active = [{x, y, r}]
  //  - Warnstrahlen: scene.mechB.lines = [{fx, fy, tx, ty, r, end, skill}] – ein Band vom Boss (fx/fy) zum
  //    Zielpunkt (tx/ty) mit halber Breite r; mit skill.sweep ein Fächer, der um den Boss schwenkt.
  // Steht der Tamer oder das Digimon in einer Zone, läuft der Tamer zum nächsten freien Punkt und ruft das Digimon.
  const DODGE_MARGIN = 28;
  const DODGE_HOLD_RANGE = 220; // so nah an einer noch aktiven Zone wird nach dem Ausweichen gewartet
  const dodgeState = { active: false, lastTap: 0, lastFollow: 0 };
  function dangerZones() {
    const sc = worldScene(), zones = [];
    try {
      for (const c of sc?.telegraphs?.active || []) {
        if (c && c.r > 0 && isFinite(c.x) && isFinite(c.y)) zones.push({ kind: 'circle', x: c.x, y: c.y, r: c.r });
      }
    } catch { /* ignore */ }
    try {
      const t = performance.now();
      for (const l of sc?.mechB?.lines || []) {
        if (!l || !isFinite(l.fx) || !isFinite(l.tx) || (l.end && t > l.end + 150)) continue;
        const len = Math.hypot(l.tx - l.fx, l.ty - l.fy);
        if (l.skill?.sweep) {
          zones.push({ kind: 'fan', x: l.fx, y: l.fy, len: len + (l.r || 16), dir: Math.atan2(l.ty - l.fy, l.tx - l.fx),
            half: (l.skill.sweep.arc || 90) * Math.PI / 360 });
        } else {
          zones.push({ kind: 'line', x: l.fx, y: l.fy, tx: l.tx, ty: l.ty, len, r: l.r || 16 });
        }
      }
    } catch { /* ignore */ }
    return zones;
  }
  // Abstand eines Punkts zur Zone (≤ 0 = drinnen) und der nächste Punkt der Zone (zum Weglaufen).
  function zoneDist(z, p) {
    if (z.kind === 'circle') return { d: Math.hypot(p.x - z.x, p.y - z.y) - z.r, nx: z.x, ny: z.y };
    if (z.kind === 'line') {
      const dx = z.tx - z.x, dy = z.ty - z.y, L2 = dx * dx + dy * dy || 1;
      const k = Math.max(0, Math.min(1, ((p.x - z.x) * dx + (p.y - z.y) * dy) / L2));
      const nx = z.x + dx * k, ny = z.y + dy * k;
      return { d: Math.hypot(p.x - nx, p.y - ny) - z.r, nx, ny };
    }
    // Fächer: Kreisausschnitt um den Boss
    const dist = Math.hypot(p.x - z.x, p.y - z.y);
    let diff = Math.abs(Math.atan2(p.y - z.y, p.x - z.x) - z.dir) % (2 * Math.PI);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    if (diff <= z.half) return { d: dist - z.len, nx: z.x, ny: z.y };
    const side = dist * Math.sin(Math.min(Math.PI / 2, diff - z.half));
    return { d: Math.max(side, dist - z.len), nx: z.x, ny: z.y };
  }
  // Ist die gerade Strecke a -> b frei von Warnzonen? (Taste 1 schickt das Digimon auf direktem Weg zum Ziel)
  function lineClear(a, b, zones) {
    const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d / 12));
    for (let i = 0; i <= n; i++) {
      const p = { x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n };
      if (zones.some((z) => zoneDist(z, p).d < DODGE_MARGIN * 0.5)) return false;
    }
    return true;
  }
  // Spiegel/Reflexion: Manche Bosse werfen für ~3 s Schaden zurück (200–700 %). Das Spiel führt das pro Boss in
  // scene.telegraphs.mirrors = [{ src, tellEnd, end }] (performance.now). Gesperrt ist ab kurz vor Ende der Ansage
  // bis zum Ende der Reflexion – was dann noch unterwegs ist, würde zurückgeworfen.
  const MIRROR_LEAD_MS = 800;
  function mirrorActive(id) {
    if (!cfg.mirror || !id) return false;
    const tg = worldScene()?.telegraphs;
    const t = performance.now();
    try {
      if (Array.isArray(tg?.mirrors)) return tg.mirrors.some((m) => m.src === id && t < m.end && t >= (m.tellEnd ?? 0) - MIRROR_LEAD_MS);
      return (tg?.mirrorsActive || []).some((m) => m.src === id && !m.telling);
    } catch { return false; }
  }
  const zoneName = (z) => (z.kind === 'circle' ? `Warnkreis (Radius ${Math.round(z.r)})` : z.kind === 'fan' ? 'Warnfächer' : 'Warnstrahl');
  function dodge(st, now) {
    if (!cfg.dodge) return null;
    const zones = dangerZones();
    const ents = window.dmo?.net?.state?.entities;
    const tamer = controlled(st), partner = ents?.get?.(st?.me?.partner?.entityId);
    const inZone = (p) => p && zones.find((z) => zoneDist(z, p).d < DODGE_MARGIN);
    const z = inZone(tamer) || inZone(partner);
    const tEnt = st?.target?.id ? ents?.get?.(st.target.id) : null;
    const target = tEnt && tEnt.hp > 0 ? tEnt : null;
    if (!z) {
      // Draußen, aber der Angriff läuft noch: nicht wieder hineinlaufen (Taste 1 würde das Digimon zum Ziel in der
      // Zone schicken). Mit Ziel: weiterkämpfen, sobald das Ziel frei steht und der direkte Weg dorthin frei ist.
      // Ohne Ziel: warten, bis alle Zonen in der Nähe verschwunden sind. Das Digimon bleibt so lange beim Tamer.
      const near = tamer && zones.some((c) => zoneDist(c, tamer).d < DODGE_HOLD_RANGE);
      const from = partner && tamer && Math.hypot(partner.x - tamer.x, partner.y - tamer.y) < 60 ? partner : tamer;
      const blocked = target ? !!inZone(target) || (from && !lineClear(from, target, zones)) : dodgeState.active;
      if (near && blocked) {
        if (!dodgeState.active) { dodgeState.active = true; logEvent('warn', 'Ziel steht in einer Warnzone – warte draußen'); }
        if (partner && tamer && Math.hypot(partner.x - tamer.x, partner.y - tamer.y) > 40 && now - dodgeState.lastFollow > 1500) {
          dodgeState.lastFollow = now; commands()?.partnerFollow?.();
        }
        return 'Warte außerhalb, bis der Flächenangriff vorbei ist…';
      }
      if (dodgeState.active) { dodgeState.active = false; logEvent('auto', 'Ausweichen beendet – weiter'); }
      return null;
    }
    if (!dodgeState.active) { dodgeState.active = true; logEvent('warn', `${zoneName(z)} – weiche aus`); }
    // Fluchtpunkt: nächster begehbarer Punkt rund um den Tamer, der in keiner Zone liegt. Gesucht wird in Ringen
    // (40–328 px), zuerst in der Richtung weg von der Zone – so geht es bei Strahlen seitlich heraus und auch aus
    // mehreren überlappenden Zonen.
    const me = tamer || partner;
    const g = worldScene()?.map?.grid, T = g?.tile || 16;
    const walkable = (x, y) => !g?.blocked || g.blocked[Math.floor(y / T) * g.w + Math.floor(x / T)] !== 1;
    const nz = zoneDist(z, me);
    let base = Math.atan2(me.y - nz.ny, me.x - nz.nx);
    if (!isFinite(base) || (me.x === nz.nx && me.y === nz.ny)) base = z.kind === 'line' ? Math.atan2(z.ty - z.y, z.tx - z.x) + Math.PI / 2 : 0;
    // Möglichst einen Punkt, von dem aus die gerade Linie zum Ziel frei ist – dann kann das Digimon nach dem
    // Ausweichen sofort wieder angreifen. Dafür höchstens 3 Ringe (72 px) weiter laufen als zum nächsten freien Punkt.
    let best = null, first = null, firstRad = 0;
    for (let rad = 40; rad <= 328 && !best; rad += 24) {
      if (first && rad > firstRad + 72) break;
      for (let i = 0; i < 16; i++) {
        const ang = base + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (Math.PI / 8);
        const p = { x: me.x + Math.cos(ang) * rad, y: me.y + Math.sin(ang) * rad };
        if (!walkable(p.x, p.y) || zones.some((c) => zoneDist(c, p).d < DODGE_MARGIN * 1.5)) continue;
        if (!first) { first = p; firstRad = rad; }
        if (!target || (!inZone(target) && lineClear(p, target, zones))) { best = p; break; }
      }
    }
    best ||= first;
    if (best && now - dodgeState.lastTap > 400) { dodgeState.lastTap = now; worldScene()?.tapGround?.(best.x, best.y); }
    if (inZone(partner) && now - dodgeState.lastFollow > 1500) { dodgeState.lastFollow = now; commands()?.partnerFollow?.(); }
    return best ? 'Weiche Flächenangriff aus…' : 'Kein freier Fluchtpunkt gefunden – bleibe stehen';
  }

  // ---------- Boss-Attacken (Cooldowns) ----------
  // Die Attacken eines Bosses stehen in den Spieldaten (digimon[art].skills: Form, castMs = Ansage, cooldownMs).
  // Wann er sie wirkt, melden die Kampf-Ereignisse des Spiels (net "evs": { t: 'skill', src, skill, phase }).
  // Ab dem ersten Einsatz rechnet der Bot den Cooldown mit: bereit / wieder bereit in … / noch nicht gesehen.
  // Gerechnet wird ab Beginn der Ansage (cast); Skills ohne Ansage ab dem Treffer (release).
  const bossSkillLog = new Map(); // Boss-Entity -> Map(skillId -> { used, phase, castEnd })
  let evNet = null;
  function hookBossEvents() {
    const net = window.dmo?.net;
    if (!net?.on || net === evNet) return;
    evNet = net;
    try {
      net.on('evs', (list) => {
        const now = Date.now();
        for (const ev of Array.isArray(list) ? list : [list]) {
          if (!ev) continue;
          if (ev.t === 'die' && ev.id) { bossSkillLog.delete(ev.id); continue; }
          if (ev.t !== 'skill' || !ev.src || !ev.skill) continue;
          if (!bossSkillLog.has(ev.src)) bossSkillLog.set(ev.src, new Map());
          const log = bossSkillLog.get(ev.src);
          const def = content()?.skills?.[ev.skill];
          const e = log.get(ev.skill) || {};
          if (ev.phase === 'cast') Object.assign(e, { used: now, phase: 'cast', castEnd: now + (def?.castMs || 0) });
          else if (ev.phase === 'release') { if (!(e.phase === 'cast' && now - e.used < (def?.castMs || 0) + 3000)) e.used = now; e.phase = 'release'; e.castEnd = 0; }
          else if (ev.phase === 'break') { e.phase = 'break'; e.castEnd = 0; }
          log.set(ev.skill, e);
        }
        if (bossSkillLog.size > 50) bossSkillLog.delete(bossSkillLog.keys().next().value);
      });
    } catch { evNet = null; }
  }
  // Form einer Boss-Attacke als kurzer Text
  function skillShape(sk) {
    if (sk.reflect) return 'Spiegel';
    if (sk.mark) return 'Markierung';
    if (sk.share) return 'Geteilter Treffer';
    if (sk.protectionMs) return 'Schutzzone';
    if (sk.kind === 'heal') return 'Heilung';
    if (sk.kind === 'buff' || sk.target === 'self') return 'Buff';
    if (sk.shape === 'line') return sk.sweep ? 'Fächer' : sk.dash ? 'Ansturm (Strahl)' : sk.lanes ? 'Bahnen' : 'Strahl';
    if (sk.shape === 'circle') {
      if (sk.islands) return 'Inseln';
      if (sk.scatter) return 'Kreise (verstreut)';
      if (sk.origin === 'caster') return 'Kreis um Boss';
      return sk.telegraph ? 'Warnkreis' : 'Fläche';
    }
    return 'Einzelziel';
  }
  const fmtSec = (ms) => (ms >= 60000 ? fmtClock(ms)
    : `${(ms / 1000).toFixed(ms < 10000 && ms % 1000 ? 1 : 0).replace('.', ',')} s`);
  // Der Boss, um den es geht: das eigene Ziel (Boss/Elite), sonst der Boss aus der Boss-Leiste des Spiels
  function currentBoss(st) {
    const ents = window.dmo?.net?.state?.entities;
    const t = st?.target;
    if (t?.kind === 'mob' && t.id) {
      const en = ents?.get?.(t.id);
      if (en && (en.flags & (FLAG.Boss | FLAG.Elite))) return { id: en.id, species: en.defId, level: en.level, hp: en.hp, maxHp: en.maxHp };
    }
    const b = st?.boss;
    if (b?.entityId) {
      const en = ents?.get?.(b.entityId);
      return { id: b.entityId, species: en?.defId || b.species, level: en?.level, hp: b.hp, maxHp: b.maxHp };
    }
    return null;
  }
  // Liste der Attacken mit Zustand
  function bossSkillRows(boss, now) {
    const def = content()?.digimon?.[boss.species];
    const log = bossSkillLog.get(boss.id) || new Map();
    return (def?.skills || []).map((sk) => {
      const e = log.get(sk.id);
      let state = 'unk', left = 0;
      if (e) {
        if (e.phase === 'cast' && e.castEnd > now) { state = 'cast'; left = e.castEnd - now; }
        else { left = Math.max(0, e.used + (sk.cooldownMs || 0) - now); state = left > 0 ? 'cd' : 'ready'; }
      }
      return { id: sk.id, name: sk.name || sk.id, shape: skillShape(sk), castMs: sk.castMs || 0, cooldownMs: sk.cooldownMs || 0, state, left, sk };
    });
  }

  // Skill-Timing gegen Bosse. Jede Flächen-Attacke hat eine Ansage (castMs, meist 2,5–3 s Warnkreis). Gefährlich ist
  // ein eigener Skill nur, wenn sein Cast so lange dauert, dass danach keine Zeit mehr zum Herauslaufen bleibt:
  //   eigener Cast + Reaktionszeit + Laufzeit aus der Zone  >=  Ansage der Boss-Attacke
  // Geprüft werden Attacken, die der Boss während unseres Casts starten könnte (bereit, noch nicht gesehen oder
  // Cooldown läuft vorher ab). Spiegel: der Treffer muss vor Beginn der Reflexion landen.
  const CAST_LATENCY_MS = 400;   // Reaktion + Ping
  const DEFAULT_MOVE = 90;       // px/s, falls die Laufgeschwindigkeit unbekannt ist
  function skillUnsafe(st, t, skill, now, slot) {
    if (!cfg.safeCast || !t) return null;
    const boss = currentBoss(st);
    if (!boss || boss.id !== t.id) return null;
    const ownCast = skill.castMs ?? content()?.skills?.[skill.id]?.castMs
      ?? content()?.digimon?.[st.me?.partner?.species]?.skills?.[slot]?.castMs ?? 0;
    const ents = window.dmo?.net?.state?.entities;
    const pe = ents?.get?.(st.me?.partner?.entityId), be = ents?.get?.(boss.id);
    const pSpecies = st.me?.partner?.species;
    const speed = Math.max(40, st.me?.partner?.stats?.ms || content()?.digimon?.[pSpecies]?.base?.ms || DEFAULT_MOVE);
    for (const r of bossSkillRows(boss, now)) {
      const sk = r.sk;
      const canStart = r.state === 'cast' || r.state === 'ready' || r.state === 'unk' || (r.state === 'cd' && r.left < ownCast + CAST_LATENCY_MS);
      if (!canStart) continue;
      const tell = r.state === 'cast' ? r.left : r.castMs;
      if (sk.reflect) {
        // Treffer landet nach Cast + Reaktion; die Reflexion beginnt mit dem Ende der Ansage
        if (ownCast + CAST_LATENCY_MS + MIRROR_LEAD_MS >= tell) return `${r.name} (Spiegel) möglich`;
        continue;
      }
      const zone = (sk.shape === 'circle' || sk.shape === 'line') && r.castMs > 0 && !sk.islands && !sk.protectionMs
        && sk.kind !== 'heal' && sk.kind !== 'buff' && sk.target !== 'self';
      if (!zone || r.state === 'cast') continue; // laufende Ansage: darum kümmert sich das Ausweichen
      let dist;
      if (sk.shape === 'line') dist = sk.sweep ? 80 : (sk.radius || 16) + DODGE_MARGIN;
      else if (sk.origin === 'caster' && pe && be) dist = Math.max(0, (sk.radius || 40) - Math.hypot(pe.x - be.x, pe.y - be.y)) + DODGE_MARGIN;
      else dist = (sk.radius || 40) + DODGE_MARGIN; // Kreis auf einem Spieler: schlimmster Fall mittendrin
      const escape = dist / speed * 1000;
      // Nur zurückhalten, wenn erst unser Cast das Ausweichen unmöglich macht
      if (CAST_LATENCY_MS + escape < tell && ownCast + CAST_LATENCY_MS + escape >= tell) {
        return `${r.name} (${skillShape(sk)}) möglich – sonst keine Zeit zum Ausweichen`;
      }
    }
    return null;
  }

  // ---------- Schutzzonen ----------
  // In Schutzzonen lehnt das Spiel jeden Angriff ab („You cannot fight here.“). Stehen Tamer oder Digimon darin,
  // läuft der Bot vor dem Angriff hinaus – auf die Seite, die dem Ziel am nächsten liegt.
  const SAFE_MARGIN = 10;   // so nah am Rand gilt schon als „drin“
  const SAFE_EXIT = 28;     // so weit hinter den Rand laufen
  const SAFE_MSG = /cannot fight here|no puedes pelear aqu|n(ã|a)o pode lutar aqui/i;
  function safeRectAt(mapId, p) {
    if (!p) return null;
    return (world.maps[mapId]?.safe || []).find((r) => p.x >= r.x - SAFE_MARGIN && p.x <= r.x + r.w + SAFE_MARGIN
      && p.y >= r.y - SAFE_MARGIN && p.y <= r.y + r.h + SAFE_MARGIN) || null;
  }
  // Meldet das Spiel gerade „You cannot fight here.“? (Rückfall, falls eine Zone nicht in den Kartendaten steht)
  function safeMessageRecent(st, ms = 4000) {
    const chat = st?.chat;
    const list = Array.isArray(chat) ? chat : chat?.messages || chat?.lines || [];
    const t = Date.now();
    for (let i = list.length - 1; i >= 0 && i >= list.length - 6; i--) {
      const m = list[i];
      if (m && SAFE_MSG.test(m.text || '') && (!m.ts || t - m.ts < ms)) return true;
    }
    return false;
  }
  const safeState = { lastTap: 0, lastFollow: 0, logged: 0 };
  // Lehnt das Spiel einen Angriff/Skill ab, kommt ein Fehler-Hinweis mit Code (st.toasts: { kind: 'error', code }).
  //  unreachable    -> Digimon kommt nicht hin: Ziel sofort 1 min sperren (statt 12 s auf HP-Verlust zu warten)
  //  not_in_range   -> zu weit weg: ein Stück auf das Ziel zugehen
  //  safe_zone      -> Schutzzone: herauslaufen (auch wenn die Zone nicht in den Kartendaten steht)
  //  invalid_target -> Ziel kurz überspringen
  const refusal = { seen: new WeakSet(), safeAt: 0, rangeAt: 0, lastTap: 0 };
  // Ist gerade eine Abgabe dran? Auch wenn der Autopilot die nächste Aufgabe noch nicht gewählt hat (die alte ist
  // erledigt, aber ein Angreifer kam dazwischen) – dann wird vorausgeschaut (höchstens 1× pro Sekunde).
  const turninPeek = { at: 0, val: false };
  function nextIsTurnin(st, now) {
    const tk = autopilot.task;
    if (tk && !taskDone(st, tk)) return tk.purpose === 'turnin';
    if (world.state !== 'ready') return false;
    if (now - turninPeek.at > 1000) {
      turninPeek.at = now;
      try { turninPeek.val = questTasks(st)[0]?.purpose === 'turnin'; } catch { turninPeek.val = false; }
    }
    return turninPeek.val;
  }
  function checkRefusals(st, t, now) {
    for (const to of st?.toasts || []) {
      if (!to || typeof to !== 'object' || refusal.seen.has(to)) continue;
      refusal.seen.add(to);
      if (to.kind !== 'error' || !to.code) continue;
      if (to.code === 'safe_zone') refusal.safeAt = now;
      else if (to.code === 'not_in_range') refusal.rangeAt = now;
      else if ((to.code === 'unreachable' || to.code === 'invalid_target') && t?.id && t.kind === 'mob') {
        blacklist.set(t.id, now + (to.code === 'unreachable' ? BAN_MS : 15000));
        bot.attackedId = null; bot.engage = null;
        logEvent('warn', `${t.name || 'Ziel'}: ${to.code === 'unreachable' ? 'Digimon kommt nicht hin – 1 min gesperrt' : 'ungültiges Ziel – kurz übersprungen'}`);
      }
    }
  }
  // Liefert Statustext, solange der Bot aus der Schutzzone läuft, sonst null.
  function leaveSafeZone(st, target, now) {
    const mapId = st.world?.mapId;
    const ents = window.dmo?.net?.state?.entities;
    const tamer = controlled(st), partner = ents?.get?.(st?.me?.partner?.entityId);
    let r = safeRectAt(mapId, tamer) || safeRectAt(mapId, partner);
    if (!r && (safeMessageRecent(st) || now - refusal.safeAt < 4000) && tamer) {
      // Zone unbekannt: ein Stück Richtung Ziel gehen
      r = { x: tamer.x - 1, y: tamer.y - 1, w: 2, h: 2, guess: true };
    }
    if (!r) return null;
    const me = tamer || partner;
    const g = worldScene()?.map?.grid, T = g?.tile || 16;
    const walkable = (x, y) => !g?.blocked || g.blocked[Math.floor(y / T) * g.w + Math.floor(x / T)] !== 1;
    const clampX = (x) => Math.min(Math.max(x, r.x), r.x + r.w), clampY = (y) => Math.min(Math.max(y, r.y), r.y + r.h);
    const exitD = r.guess ? 56 : SAFE_EXIT;
    const cands = [
      { x: r.x - exitD, y: clampY(me.y) }, { x: r.x + r.w + exitD, y: clampY(me.y) },
      { x: clampX(me.x), y: r.y - exitD }, { x: clampX(me.x), y: r.y + r.h + exitD },
    ];
    if (r.guess && target) {
      const d = Math.hypot(target.x - me.x, target.y - me.y) || 1;
      cands.unshift({ x: me.x + (target.x - me.x) / d * exitD, y: me.y + (target.y - me.y) / d * exitD });
    }
    const ok = cands.filter((p) => walkable(p.x, p.y) && !safeRectAt(mapId, p));
    if (!ok.length) return null;
    const ref = target || me;
    ok.sort((a, b) => Math.hypot(a.x - ref.x, a.y - ref.y) - Math.hypot(b.x - ref.x, b.y - ref.y));
    const p = ok[0];
    if (now - safeState.lastTap > 600) { safeState.lastTap = now; worldScene()?.tapGround?.(p.x, p.y); }
    if (partner && tamer && Math.hypot(partner.x - tamer.x, partner.y - tamer.y) > 30 && now - safeState.lastFollow > 1500) {
      safeState.lastFollow = now; commands()?.partnerFollow?.();
    }
    if (now - safeState.logged > 10000) { safeState.logged = now; logEvent('warn', 'Schutzzone – hier kann nicht gekämpft werden, laufe heraus'); }
    return 'Schutzzone – laufe heraus, um kämpfen zu können…';
  }

  // ---------- Bot ----------
  // Simuliert Tastendrücke genau wie die echte Tastatur (das Spiel wertet e.code aus).
  function press(code) {
    const key = code.startsWith('Digit') ? code.slice(5) : code;
    const opts = { code, key, bubbles: true, cancelable: true };
    window.dispatchEvent(new KeyboardEvent('keydown', opts));
    setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', opts)), 60);
  }

  // Was liegt auf Taste k (1–8)? Liefert den Skill samt Rest-Cooldown oder null, wenn dort kein Skill liegt.
  // Cooldowns im Spiel-Store sind in performance.now()-Zeit angegeben.
  function skillOnKey(st, k) {
    const ref = st?.me?.hotbar?.[k - 1];
    if (typeof ref !== 'string' || !ref.startsWith('skill:')) return null;
    const skill = st.me.partner?.skills?.[Number(ref.slice(6))];
    if (!skill) return null;
    const cd = st.cooldowns?.[ref];
    const cdLeft = cd ? Math.max(0, cd.end - performance.now()) : 0;
    return { ref, skill, cdLeft };
  }

  // Wie viele Stück des Items auf Hotbar-Taste F<n> liegen im Inventar? (F1 = Slot 9). null = dort liegt kein Item.
  function potionCount(me, fKey) {
    const ref = me?.hotbar?.[7 + fKey];
    if (typeof ref !== 'string' || !ref.startsWith('item:')) return null;
    const id = ref.slice(5);
    return (me.inventory || []).reduce((n, it) => n + (it?.itemId === id ? it.qty || 0 : 0), 0);
  }

  // ---------- Umgebung scannen ----------
  const KIND = { Tamer: 0, Partner: 1, Mob: 2, Npc: 3 };
  const FLAG = { Dead: 2, Boss: 16, Aggressive: 32, Hidden: 64, Untargetable: 256, Elite: 1024 };
  const blacklist = new Map(); // Monster-ID -> gesperrt bis (Date.now()), z. B. weil unerreichbar
  const catOf = (flags) => (flags & FLAG.Boss ? 'boss' : flags & FLAG.Elite ? 'elite' : 'normal');
  // Pro Map gesehene Monster-Arten (z. B. Elite-Varianten, die nicht in der Spawn-Tabelle stehen) und ob sie aggressiv sind
  const seen = new Map(); // mapId -> Map(key -> { aggressive })

  // Alle Monster in Sichtweite mit Abstand zum eigenen Digimon und Einordnung für Bot und Radar:
  //   attacker: greift mein Digimon/meinen Tamer an
  //   taken:    wird von einem anderen Spieler bekämpft (oder greift einen anderen an) -> nicht klauen
  //   inLvl:    liegt in der eingestellten Level-Range
  function scan(st) {
    const ents = window.dmo?.net?.state?.entities;
    const me = st?.me;
    if (!me || !ents?.forEach) return null;
    const mine = new Set([me.partner?.entityId, me.tamerEntityId].filter(Boolean));
    const self = ents.get?.(me.partner?.entityId) || ents.get?.(me.tamerEntityId);
    if (!self) return null;
    const tamer = ents.get?.(me.tamerEntityId);

    const takenByOthers = new Set();
    ents.forEach((e) => {
      if ((e.kind === KIND.Tamer || e.kind === KIND.Partner) && !mine.has(e.id) && e.targetId) takenByOthers.add(e.targetId);
    });

    const now = Date.now();
    const mapId = st.world?.mapId || '';
    if (!seen.has(mapId)) seen.set(mapId, new Map());
    const seenHere = seen.get(mapId);
    // Im Quest-Modus bestimmen die offenen Quest-Ziele, was gejagt wird (statt der Monsterliste);
    // schwächere Monster sind dann erlaubt, nur zu starke (über + Level-Unterschied) bleiben tabu.
    // (sobald das Jagdziel erfüllt ist, sofort nichts Neues mehr angreifen)
    const quest = cfg.autopilot
      ? { species: autopilot.task && !taskDone(st, autopilot.task) ? autopilot.huntSpecies : new Set(), open: [] }
      : cfg.questMode ? questTargets(st, null) : null;
    const pLvl = me.partner?.level ?? 0;
    const farmSp = cfg.farm ? farmTargets(mapId) : null;
    const mobs = [];
    ents.forEach((e) => {
      if (e.kind !== KIND.Mob || e.hp <= 0 || (e.flags & (FLAG.Dead | FLAG.Hidden | FLAG.Untargetable))) return;
      const attacker = mine.has(e.targetId);
      const cat = catOf(e.flags), key = `${e.defId}|${cat}`;
      const aggressive = !!(e.flags & FLAG.Aggressive);
      const s = seenHere.get(key);
      if (!s) seenHere.set(key, { aggressive }); else if (aggressive) s.aggressive = true;
      mobs.push({
        id: e.id, species: e.defId, cat, key, x: e.x, y: e.y, level: e.level, hp: e.hp, maxHp: e.maxHp,
        d: Math.hypot(e.x - self.x, e.y - self.y),
        attacker,
        // Bosse sind Gruppenkämpfe: ein Farm-Boss gilt nie als „von anderen belegt“
        taken: cfg.skipTaken && !attacker && !isFarmMob(farmSp, e.defId, cat, e.level)
          && (takenByOthers.has(e.id) || (!!e.targetId && !mine.has(e.targetId))),
        // nur zu starke Monster sind tabu, schwächere immer erlaubt; Farm-Bosse immer
        inLvl: e.level <= pLvl + cfg.lvlDiff || isFarmMob(farmSp, e.defId, cat, e.level),
        enabled: farmSp ? isFarmMob(farmSp, e.defId, cat, e.level) : quest ? quest.species.has(e.defId) : mobOn(mapId, key, cat),
        aggressive,
        banned: (blacklist.get(e.id) || 0) > now,
      });
    });
    mobs.sort((a, b) => a.d - b.d);
    return { mapId, self, tamer, mobs, quest, attackers: mobs.filter((m) => m.attacker) };
  }

  const usable = (m) => m.enabled && m.inLvl && !m.taken && !m.banned && m.d <= cfg.radius;

  // ---------- Quests ----------
  // Quest-Zustände im Spiel: 1 = aktiv, 2 = fertig (abgeben), 3 = abgeschlossen
  const content = () => worldScene()?.deps?.content || null;
  function questDef(C, id) {
    if (!C) return null;
    return C.quests?.[id] || C.dailyById?.[id] || C.dailyById?.[String(id).split(/[:@#|]/)[0]]
      || Object.values(C.dailyById || {}).find((d) => String(id).startsWith(d.id)) || null;
  }

  // Drops eines Spawn-Eintrags: eigene Drops plus die Drops der Monsterart (digimon[art].mob.drops) –
  // Quest-Items wie „Sleepy Spore“ (Mushroomon) stehen nur dort.
  const dropsOf = (C, en) => [...(en.drops || []), ...(C?.digimon?.[en.species]?.mob?.drops || [])];
  // Wo spawnt welche Art, und welche Art droppt welches Item? (aus den Spawn-Tabellen, einmal pro Content berechnet)
  let qIndex = null;
  function questIndex(C) {
    if (qIndex?.C === C) return qIndex;
    const spMaps = new Map(), itemSrc = new Map();
    const push = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
    for (const [mapId, sp] of Object.entries(C?.spawns || {})) {
      const entries = [...Object.values(sp.zones || {}).flatMap((z) => z.entries || []), ...(sp.bosses || [])];
      for (const en of entries) {
        push(spMaps, en.species, mapId);
        for (const d of dropsOf(C, en)) push(itemSrc, d.itemId, { mapId, species: en.species });
      }
    }
    qIndex = { C, spMaps, itemSrc };
    return qIndex;
  }

  // Aktive Quests mit ihren Zielen, Fortschritt und – für Kampfziele – den Monster-Arten, die man dafür jagen muss.
  function questList(st, sc) {
    const C = content(), me = st?.me, mapId = st?.world?.mapId;
    if (!C || !me?.quests) return [];
    const ix = questIndex(C);
    const liveHere = new Set((sc?.mobs || []).map((m) => m.species));
    const mapName = (id) => C.maps?.[id]?.name || id;
    const spName = (sp) => C.digimon?.[sp]?.name || sp;
    const list = [];
    for (const [id, q] of Object.entries(me.quests)) {
      if (q.state !== 1 && q.state !== 2) continue;
      const def = questDef(C, id);
      if (!def) continue;
      const objectives = (def.objectives || []).map((o, i) => {
        const need = o.count || 1, cur = Math.min(q.counters?.[i] ?? 0, need);
        const done = q.state === 2 || cur >= need;
        let label, species = [], maps = [];
        if (o.kind === 'kill') {
          species = [].concat(o.species || []);
          label = `Besiege ${species.map(spName).join(' / ')}`;
          maps = [...new Set(species.flatMap((sp) => ix.spMaps.get(sp) || []))];
        } else if (o.kind === 'collect') {
          const src = ix.itemSrc.get(o.itemId) || [];
          species = [...new Set(src.filter((s) => s.mapId === mapId).map((s) => s.species))];
          maps = [...new Set(src.map((s) => s.mapId))];
          label = `Sammle ${C.items?.[o.itemId]?.name || o.itemId}`;
          if (species.length) label += ` (von ${species.map(spName).join(', ')})`;
        } else {
          label = o.kind === 'talk' ? `Sprich mit ${C.npcs?.[o.npcId]?.name || o.npcId}`
            : o.kind === 'reach' ? `Reise nach ${mapName(o.mapId)}${o.zone ? ` (${o.zone.replace(/_/g, ' ')})` : ''}`
            : o.kind === 'level' ? `Erreiche Level ${o.level}`
            : o.kind === 'evolve' ? 'Digitiere deinen Partner'
            : o.kind === 'hatch' ? 'Brüte ein Ei aus' : o.kind;
        }
        const huntable = species.length > 0 || o.kind === 'kill' || o.kind === 'collect';
        const here = species.some((sp) => liveHere.has(sp) || (ix.spMaps.get(sp) || []).includes(mapId));
        return { kind: o.kind, label, cur, need, done, species, huntable, here, where: maps.map(mapName) };
      });
      list.push({
        id, name: def.name || id, state: q.state, daily: !C.quests?.[id],
        on: !cfg.questOff[id], objectives,
        turnIn: def.turnIn ? `${C.npcs?.[def.turnIn]?.name || def.turnIn}${def.turnInMap ? ' · ' + mapName(def.turnInMap) : ''}` : '',
      });
    }
    return list.sort((a, b) => a.state - b.state || a.name.localeCompare(b.name));
  }

  // ---------- Weltkarte (alle Maps: Portale, NPCs, Spawn-Zonen) ----------
  // Wird einmal aus den Map-Dateien des Spiels geladen (/assets/maps/<map>.tmj).
  const world = { state: 'idle', loaded: 0, total: 0, maps: {}, npcAt: new Map(), error: '' };

  async function loadWorld() {
    if (world.state === 'loading' || world.state === 'ready') return;
    const sc = worldScene();
    const list = sc?.deps?.manifest?.maps;
    if (!list) return;
    world.state = 'loading';
    const base = sc.deps.assetsBase || '/assets/';
    const ids = Object.keys(list);
    world.total = ids.length; world.loaded = 0;
    const prop = (o, n) => (o.properties || []).find((p) => p.name === n)?.value;
    await Promise.all(ids.map(async (mapId) => {
      try {
        const tmj = await fetch(base + list[mapId].tmj).then((r) => r.json());
        const m = { id: mapId, portals: [], npcs: [], zones: {}, spawns: {}, safe: [] };
        for (const layer of tmj.layers || []) {
          if (layer.type !== 'objectgroup') continue;
          for (const o of layer.objects || []) {
            const type = o.type ?? o.class;
            const rect = { x: o.x, y: o.y, w: o.width || 0, h: o.height || 0 };
            if (type === 'portal' && prop(o, 'toMap')) m.portals.push({ toMap: prop(o, 'toMap'), ...rect });
            else if (type === 'npc') m.npcs.push({ npcId: prop(o, 'npcId') || o.name, x: o.x, y: o.y });
            else if (type === 'zone') m.zones[o.name] = rect;
            else if (type === 'spawn') m.spawns[o.name] = { x: o.x, y: o.y };
            else if (type === 'safe') m.safe.push(rect);
          }
        }
        world.maps[mapId] = m;
        for (const n of m.npcs) {
          if (!world.npcAt.has(n.npcId)) world.npcAt.set(n.npcId, []);
          world.npcAt.get(n.npcId).push({ mapId, x: n.x, y: n.y });
        }
      } catch (e) { world.error = `${mapId}: ${e.message}`; }
      world.loaded++;
      schedule();
    }));
    world.state = 'ready';
    schedule();
  }

  // Kürzeste Route (Anzahl Map-Wechsel) von Map a nach Map b über Portale. Liefert die Kette der Maps.
  // Raid-/Dungeon-Maps (in der Spawn-Tabelle als "raid" markiert) werden nie betreten.
  const isRaidMap = (mapId) => !!content()?.spawns?.[mapId]?.raid;

  function route(a, b) {
    if (a === b) return [a];
    if (isRaidMap(b)) return null;
    const prev = new Map([[a, null]]), queue = [a];
    while (queue.length) {
      const cur = queue.shift();
      for (const p of world.maps[cur]?.portals || []) {
        if (prev.has(p.toMap) || isRaidMap(p.toMap)) continue;
        prev.set(p.toMap, cur);
        if (p.toMap === b) {
          const path = [b];
          for (let m = cur; m; m = prev.get(m)) path.unshift(m);
          return path;
        }
        queue.push(p.toMap);
      }
    }
    return null;
  }
  const hops = (a, b) => { const r = route(a, b); return r ? r.length - 1 : Infinity; };

  // ---------- Quest-Autopilot ----------
  // Plant die nächste machbare Aufgabe (abgeben > sprechen/reisen > annehmen > jagen, die nächstgelegene zuerst),
  // reist über Portale hin und erledigt sie. Läuft im Bot-Takt, Kämpfe gegen Angreifer haben immer Vorrang.
  const NPC_TALK_DIST = 36;       // so nah muss man für ein Gespräch stehen
  const WALK_RETRY_MS = 2500;     // Laufbefehl frühestens nach so langer Zeit ohne Fortschritt wiederholen
  const NAV_STUCK_MS = 15000;     // so lange kein Fortschritt -> Ziel gilt als unerreichbar
  const TASK_BAN_MS = 5 * 60000;  // gescheiterte Aufgabe so lange überspringen
  const HUNT_IDLE_MS = 90000;     // im Jagdgebiet so lange kein passendes Monster -> aufgeben

  const autopilot = {
    task: null, nav: null, failed: new Map(), huntSpecies: new Set(),
    sweepAt: null, tp: null, tpBlock: new Map(), route: null, lastSwitch: 0, switchTries: 0, switchGiveUp: null, lastEvolve: 0, evoTries: 0, evoGiveUp: null,
    dailyVisited: new Set(), dailyAccepted: new Set(), dailyAt: 0, boardOnly: new Set(),
    phase: 0, // aktuelle Phase der Map-für-Map-Runde (nur fürs Log)
    newRun() { // beim Start des Bots: Wechsel/Digitation/Dailies neu versuchen
      this.switchGiveUp = null; this.evoGiveUp = null; this.switchTries = 0; this.evoTries = 0;
      this.dailyVisited = new Set(); this.dailyAccepted = new Set(); this.failed = new Map(); this.tpBlock = new Map(); this.tp = null; this.phase = 0;
    },
    lastTap: 0, lastTalk: 0, talkTries: 0, dialogAt: 0, arrivedAt: 0, idleSince: 0,
    reset() {
      this.task = null; this.nav = null; this.huntSpecies = new Set();
      this.talkTries = 0; this.arrivedAt = 0; this.idleSince = 0;
    },
  };

  const commands = () => worldScene()?.deps?.commands;
  function controlled(st) {
    const ents = window.dmo?.net?.state?.entities;
    const id = worldScene()?.controlledId?.() || st?.me?.tamerEntityId;
    return ents?.get?.(id) || ents?.get?.(st?.me?.tamerEntityId) || null;
  }

  // Bester Ort zum Jagen einer Art: Spawn-Zone (oder Boss-Spawnpunkt) mit passendem Level, möglichst nah.
  function huntSpot(C, species, lvl, curMap, itemId) {
    let best = null;
    const consider = (mapId, sp, lo, hi, pos) => {
      if (!pos || hops(curMap, mapId) === Infinity) return;
      const tooStrong = lo > lvl + cfg.lvlDiff;
      const score = (tooStrong ? 1000 : 0) + hops(curMap, mapId) * 10 + Math.abs((lo + hi) / 2 - lvl) * 0.5;
      if (!best || score < best.score) best = { mapId, species: [sp], x: pos.x, y: pos.y, score, tooStrong };
      else if (best.mapId === mapId && best.x === pos.x && best.y === pos.y && !best.species.includes(sp)) best.species.push(sp);
    };
    for (const [mapId, spawn] of Object.entries(C.spawns || {})) {
      const wm = world.maps[mapId];
      if (!wm) continue;
      for (const [zone, z] of Object.entries(spawn.zones || {})) {
        const r = wm.zones[zone];
        for (const en of z.entries || []) {
          const wanted = itemId ? dropsOf(C, en).some((d) => d.itemId === itemId) : species.includes(en.species);
          if (!wanted) continue;
          const [lo, hi] = Array.isArray(en.level) ? en.level : [en.level, en.level];
          consider(mapId, en.species, lo, hi, r && { x: r.x + r.w / 2, y: r.y + r.h / 2 });
        }
      }
      for (const b of spawn.bosses || []) {
        const wanted = itemId ? dropsOf(C, b).some((d) => d.itemId === itemId) : species.includes(b.species);
        if (wanted) consider(mapId, b.species, b.level, b.level, wm.spawns[b.at]);
      }
    }
    if (!best || best.tooStrong) return null;
    best.names = best.species.map((sp) => C.digimon?.[sp]?.name || sp).join(', ');
    return best;
  }

  // Bester Ort zum Leveln: Zone, deren Monster im eigenen Level-Bereich liegen, möglichst nah.
  function grindSpot(C, lvl, curMap) {
    let best = null;
    for (const [mapId, spawn] of Object.entries(C.spawns || {})) {
      const wm = world.maps[mapId];
      const h = hops(curMap, mapId);
      if (!wm || h === Infinity) continue;
      for (const [zone, z] of Object.entries(spawn.zones || {})) {
        const r = wm.zones[zone];
        if (!r) continue;
        const fit = (z.entries || []).filter((en) => {
          const [lo, hi] = Array.isArray(en.level) ? en.level : [en.level, en.level];
          return lo <= lvl + cfg.lvlDiff && hi >= lvl - cfg.lvlDiff;
        });
        if (!fit.length) continue;
        const avg = fit.reduce((a, en) => a + [].concat(en.level).reduce((x, y) => x + y, 0) / [].concat(en.level).length, 0) / fit.length;
        const score = h * 10 + Math.abs(avg - lvl);
        if (!best || score < best.score) {
          const species = [...new Set(fit.map((en) => en.species))];
          best = { mapId, x: r.x + r.w / 2, y: r.y + r.h / 2, score, species,
            names: species.map((sp) => C.digimon?.[sp]?.name || sp).join(', ') };
        }
      }
    }
    return best;
  }

  // ---------- Tägliche (wiederholbare) Quests ----------
  // Wie im Spiel: Hauptquests heißen q05_…, q17i_…, a2_13b_…, a2q_…; alle anderen (s_…, a2s_…) sind wiederholbar.
  // Eine erledigte wiederholbare Quest ist wieder annehmbar, sobald ihr Erledigt-Tag (hinter den Zählern gespeichert)
  // vor „heute“ liegt. Der Tag wechselt um 7:00 UTC.
  const RESET_UTC_HOUR = 7;
  const isStory = (id) => /^q(\d\d[a-z]?)?_/.test(id) || /^a2(_\d\d[a-z]?|q)_/.test(id);
  const gameDay = (t = Date.now()) => Math.floor((t - RESET_UTC_HOUR * 3600000) / 86400000);
  const DONE_KEY = 'digibot.doneToday';
  const doneToday = (() => { try { return JSON.parse(localStorage.getItem(DONE_KEY) || '{}'); } catch { return {}; } })();
  function markDoneToday(id) {
    doneToday[id] = gameDay();
    for (const [k, d] of Object.entries(doneToday)) if (d < gameDay()) delete doneToday[k]; // alte Tage aufräumen
    try { localStorage.setItem(DONE_KEY, JSON.stringify(doneToday)); } catch {}
  }
  // Serie (Adventure / Adventure 02): Quests a2…_ gibt es nur in Welten der Serie 2 (wie im Spiel)
  const questSeries = (id) => (/^a2[a-z]?_/.test(id) ? 2 : 1);
  const worldSeries = (st) => st?.world?.series ?? content()?.maps?.[st?.world?.mapId]?.series ?? 1;
  // Für wiederholte Quests zählt im Spiel das höchste Level im Team
  const teamLevel = (st) => (st?.archive?.partners || []).reduce((m, p) => (p.carried ? Math.max(m, p.level || 0) : m), st?.me?.partner?.level ?? 1);
  function repeatAvailable(def, q) {
    if (!def || isStory(def.id) || q?.state !== 3) return false;
    if (doneToday[def.id] === gameDay()) return false; // heute schon abgeschlossen (eigene Merkliste)
    const day = (q.counters || [])[(def.objectives || []).length];
    return day === undefined || day < gameDay();
  }

  // ---------- Team (Partner-Wechsel) und Digitation ----------
  const teamOf = (st) => (st?.archive?.partners || []).filter((p) => p.carried);
  const activePartner = (st) => (st?.archive?.partners || []).find((p) => p.active) || null;
  const speciesName = (sp) => content()?.digimon?.[sp]?.name || sp;
  const partnerLabel = (p) => `${speciesName(p.species)} Lv ${p.level}`;

  // Sorgt dafür, dass der gewünschte Partner aktiv ist (Wechsel wie im Wechsel-Menü des Spiels).
  // true = passt; sonst Statustext. Klappt es nach mehreren Versuchen nicht, geht es mit dem aktuellen weiter.
  const evoCooldownLeft = (st) => Math.max(0, (st?.cooldowns?.evolve?.end ?? 0) - performance.now());

  function ensurePartner(st, partnerId, now) {
    if (!partnerId || autopilot.switchGiveUp === partnerId) return true;
    const act = activePartner(st);
    if (!act || act.partnerId === partnerId) { autopilot.switchTries = 0; return true; }
    const p = teamOf(st).find((x) => x.partnerId === partnerId);
    if (!p || p.locked) return true;
    // Wechseln geht im Spiel nur in der Grundform -> erst zurück digitieren (Abklingzeit abwarten)
    const cur = st?.me?.partner;
    const root = act.root || null;
    if (cur && ((root && cur.species !== root) || (!root && cur.stage && cur.stage !== 'rookie' && cur.stage !== 'in-training'))) {
      if (cur.evolving) return 'Warte auf Digitation…';
      const cd = evoCooldownLeft(st);
      if (cd > 0) return `Zurück-Digitation in ${Math.ceil(cd / 1000)} s (Abklingzeit)…`;
      if (now - autopilot.lastEvolve > 4000) {
        autopilot.lastEvolve = now;
        commands()?.devolve?.();
        logEvent('auto', `Zurück-Digitation: ${speciesName(cur.species)} → Grundform (für Partner-Wechsel)`);
      }
      return `Digitiere ${speciesName(cur.species)} zurück…`;
    }
    if (now - autopilot.lastSwitch > 5000) {
      if (++autopilot.switchTries > 6) {
        autopilot.switchGiveUp = partnerId;
        logEvent('warn', `Wechsel zu ${partnerLabel(p)} klappt nicht – weiter mit ${partnerLabel(act)}`);
        return true;
      }
      autopilot.lastSwitch = now;
      commands()?.switchPartner?.(partnerId);
      logEvent('auto', `Partner-Wechsel: ${partnerLabel(act)} → ${partnerLabel(p)}`);
    }
    return `Wechsle zu ${partnerLabel(p)}…`;
  }

  // Digitiert das aktive Digimon Schritt für Schritt zur gewünschten Form. Fehlt Tamer-DS, wird der F3-Trank
  // benutzt. true = passt (oder geht gerade nicht); sonst Statustext.
  function ensureEvolution(st, species, now) {
    const p = st?.me?.partner;
    if (!species || !p || p.species === species || p.evolving || autopilot.evoGiveUp === species) return true;
    const evos = p.evolutions || [];
    const target = evos.find((e) => e.species === species);
    if (!target || target.unlocked === false) return true;
    let step = target;
    for (let i = 0; i < 8 && step && step.from !== p.species; i++) step = evos.find((e) => e.species === step.from);
    if (!step || step.unlocked === false) return true; // Ziel liegt auf einem anderen Ast
    if (evoCooldownLeft(st) > 0) return true;            // Abklingzeit: erst mal in aktueller Form weiter
    if (!step.canEvolveNow) {
      if ((st.me.tamerDs ?? 0) < (step.dsCost ?? 0) && potionCount(st.me, 3) > 0 && bot.can('F3', POT_COOLDOWN_MS, now)) {
        bot.hit('F3', now);
        logEvent('potion', 'F3: Tamer-DS für die Digitation aufgefüllt');
        return 'Fülle Tamer-DS für die Digitation auf…';
      }
      return true; // zu wenig DS ohne Trank oder Abklingzeit -> in aktueller Form weiter
    }
    if (now - autopilot.lastEvolve > 4000) {
      if (++autopilot.evoTries > 5) { autopilot.evoGiveUp = species; logEvent('warn', `Digitation zu ${speciesName(species)} klappt nicht`); return true; }
      autopilot.lastEvolve = now;
      commands()?.evolve?.(step.species);
      logEvent('auto', `Digitiere: ${speciesName(p.species)} → ${speciesName(step.species)}`);
    }
    return `Digitiere zu ${speciesName(step.species)}…`;
  }

  // ---------- Map-für-Map-Runde ----------
  // Alle normalen Maps (keine Raids/Sandbox), absteigend nach Level – von „Dream Ruins“ bis „Native Forest“.
  function sweepList() {
    return Object.values(content()?.maps || {})
      .filter((m) => world.maps[m.id] && !isRaidMap(m.id) && !/^sandbox/.test(m.id))
      .sort((a, b) => (b.levelRange?.[0] ?? 0) - (a.levelRange?.[0] ?? 0) || (b.levelRange?.[1] ?? 0) - (a.levelRange?.[1] ?? 0)
        || a.name.localeCompare(b.name));
  }
  function sweepMap(st) {
    const ids = sweepList().map((m) => m.id);
    if (cfg.apSweepMap && ids.includes(cfg.apSweepMap)) return cfg.apSweepMap;
    const start = cfg.apStartMap && ids.includes(cfg.apStartMap) ? ids.indexOf(cfg.apStartMap) : 0;
    return ids.slice(start).find((id) => hops(st.world?.mapId, id) < Infinity) || null;
  }
  // Warum hat eine Map der Runde gerade keine Aufgaben? (fürs Log)
  function sweepSkipReasons(st, M) {
    const C = content(), quests = st?.me?.quests || {}, lvl = st?.me?.partner?.level ?? 1;
    const r = { level: 0, prereq: 0, series: 0, today: 0, stuck: 0, off: 0 };
    for (const def of Object.values(C?.quests || {})) {
      if (!def.giver || def.autoAssign || !questOnMap(def, M)) continue;
      const q = quests[def.id], fresh = (q?.state ?? 0) === 0;
      if (q?.state === 1 || q?.state === 2) { r.stuck++; continue; }
      if (q?.state === 3) { if (!isStory(def.id) && !(cfg.apRepeat && repeatAvailable(def, q))) r.today++; continue; }
      if (cfg.questOff[def.id]) { r.off++; continue; }
      if (questSeries(def.id) > worldSeries(st)) { r.series++; continue; }
      if ((def.prereq || []).some((p) => quests[p]?.state !== 3)) { r.prereq++; continue; }
      if ((def.minLevel ?? 1) > (fresh ? lvl : teamLevel(st))) r.level++;
    }
    const parts = [
      r.today && `${r.today}× heute schon erledigt`, r.level && `${r.level}× Level zu niedrig`,
      r.prereq && `${r.prereq}× Vorquest fehlt`, r.series && `${r.series}× andere Serie`,
      r.stuck && `${r.stuck}× angenommen, aber gerade nicht machbar (Ziel zu stark/gesperrt)`, r.off && `${r.off}× abgewählt`,
    ].filter(Boolean);
    return parts.length ? ` (${parts.join(', ')})` : '';
  }
  // Nächste (erreichbare) Map der Runde; null = Runde fertig.
  function sweepAdvance(st) {
    const ids = sweepList().map((m) => m.id);
    const cur = sweepMap(st);
    const next = ids.slice(ids.indexOf(cur) + 1).find((id) => hops(st.world?.mapId, id) < Infinity) || null;
    cfg.apSweepMap = next || '';
    saveCfg();
    return next;
  }
  // Gehört eine Quest zur Map M? (Geber steht dort; Dailies: einer der Pool-NPCs steht dort)
  function questOnMap(def, M) {
    if (!def || !M) return false;
    if (def.giverMap) return def.giverMap === M;
    const npcs = def.giver ? [def.giver] : content()?.dailies?.[def.pool]?.npcs || [];
    return npcs.some((n) => (world.npcAt.get(n) || []).some((l) => l.mapId === M));
  }

  // ---------- Dailies ----------
  // Nimmt alle offenen Dailies vom Daily-Board an (Board kommt nach dem Gespräch mit einem Daily-NPC).
  function acceptFromBoard(st, t, now) {
    const board = st.dailies?.board;
    if (!board) return null;
    const C = content();
    const ids = new Set();
    const walk = (x, depth) => {
      if (x == null || depth > 6) return;
      if (typeof x === 'string') { if (C?.dailyById?.[x]) ids.add(x); return; }
      if (typeof x === 'object') for (const v of Object.values(x)) walk(v, depth + 1);
    };
    walk(board, 0);
    const open = [...ids].filter((id) => !autopilot.dailyAccepted.has(id) && ![1, 2].includes(st.me?.quests?.[id]?.state));
    if (open.length) {
      if (now - autopilot.dailyAt > 900) {
        autopilot.dailyAt = now;
        autopilot.dailyAccepted.add(open[0]);
        commands()?.acceptDaily?.(open[0]);
        logEvent('auto', `Daily angenommen: ${C.dailyById[open[0]].name}`);
      }
      return `Nehme Dailies an (${open.length} offen)…`;
    }
    commands()?.closeDailyBoard?.();
    autopilot.dailyVisited.add(t.visitKey);
    if (!ids.size) logEvent('auto', 'Daily-Board: nichts zum Annehmen');
    return 'Dailies angenommen';
  }

  // Alle Aufgaben, die der Autopilot gerade erledigen könnte – sortiert nach Weg (Map-Wechsel) und Priorität.
  function questTasks(st) {
    const C = content(), me = st?.me, mapId = st?.world?.mapId;
    if (!C || !me || world.state !== 'ready') return [];
    const ix = questIndex(C), lvl = me.partner?.level ?? 1, quests = me.quests || {};
    const npcName = (id) => C.npcs?.[id]?.name || id;
    const npcLoc = (npcId, prefMap) => {
      const locs = world.npcAt.get(npcId) || [];
      return locs.find((l) => l.mapId === prefMap) || [...locs].sort((a, b) => hops(mapId, a.mapId) - hops(mapId, b.mapId))[0] || null;
    };
    const tasks = [];
    for (const [id, q] of Object.entries(quests)) {
      if (cfg.questOff[id]) continue;
      const def = questDef(C, id);
      if (!def) continue;
      if (q.state === 2 && def.turnIn) { // fertig -> abgeben
        const loc = npcLoc(def.turnIn, def.turnInMap);
        if (loc) tasks.push({ key: `turnin:${id}`, kind: 'talk', purpose: 'turnin', questId: id, npcId: def.turnIn, loc, prio: 0, def,
          label: `„${def.name}“ abgeben bei ${npcName(def.turnIn)}` });
        continue;
      }
      if (q.state === 2 && def.pool) { // fertige Daily -> bei einem NPC ihres Pools abgeben
        const npcs = C.dailies?.[def.pool]?.npcs || [];
        const loc = npcs.filter((n) => !autopilot.boardOnly.has(n)).map((n) => npcLoc(n, cfg.apOrder === 'sweep' ? autopilot.sweepAt : null)).filter(Boolean)
          .sort((a, b) => hops(mapId, a.mapId) - hops(mapId, b.mapId))[0];
        const npc = loc && npcs.find((n) => (world.npcAt.get(n) || []).includes(loc));
        if (loc && npc) tasks.push({ key: `turnin:${id}`, kind: 'talk', purpose: 'turnin', questId: id, npcId: npc, loc, prio: 0, def,
          label: `„${def.name}“ abgeben bei ${npcName(npc)}` });
        continue;
      }
      if (q.state !== 1) continue;
      (def.objectives || []).forEach((o, i) => {
        const need = o.count || 1, cur = q.counters?.[i] ?? 0;
        if (cur >= need) return;
        const base = { questId: id, objIndex: i, need, def };
        if (o.kind === 'talk') {
          const loc = npcLoc(o.npcId);
          if (loc) tasks.push({ ...base, key: `talk:${id}:${i}`, kind: 'talk', purpose: 'objective', npcId: o.npcId, loc, prio: 1,
            label: `${def.name}: mit ${npcName(o.npcId)} sprechen` });
        } else if (o.kind === 'reach' && world.maps[o.mapId]) {
          const z = o.zone ? world.maps[o.mapId].zones?.[o.zone] : null;
          const loc = z ? { mapId: o.mapId, x: z.x + z.w / 2, y: z.y + z.h / 2 } : { mapId: o.mapId };
          tasks.push({ ...base, key: `reach:${id}:${i}`, kind: 'reach', loc, prio: 1,
            label: `${def.name}: nach ${C.maps?.[o.mapId]?.name || o.mapId}${z ? ` (${o.zone.replace(/_/g, ' ')})` : ''} reisen` });
        } else if (o.kind === 'kill' || o.kind === 'collect') {
          const spot = huntSpot(C, [].concat(o.species || []), lvl, mapId, o.kind === 'collect' ? o.itemId : null);
          if (spot) tasks.push({ ...base, key: `hunt:${id}:${i}`, kind: 'hunt', species: new Set(spot.species), names: spot.names, loc: spot, prio: 3,
            label: `${def.name}: ${o.kind === 'kill' ? 'besiege' : 'sammle von'} ${spot.names}` });
        }
      });
    }
    let grindTo = Infinity; // nächstes Level, ab dem es wieder etwas zu tun gibt
    for (const [id, q] of Object.entries(quests)) { // Level-Ziele aktiver Quests
      if (q.state !== 1 || cfg.questOff[id]) continue;
      for (const o of questDef(C, id)?.objectives || []) if (o.kind === 'level' && o.level > lvl) grindTo = Math.min(grindTo, o.level);
    }
    for (const def of Object.values(C.quests || {})) { // annehmbare Quests (neu oder tägliche, heute wieder offen)
      const fresh = (quests[def.id]?.state ?? 0) === 0;
      if (!fresh && !(cfg.apRepeat && repeatAvailable(def, quests[def.id]))) continue;
      if (cfg.questOff[def.id] || def.autoAssign || !def.giver) continue;
      if (questSeries(def.id) > worldSeries(st)) continue; // andere Serie: bietet das Spiel hier nicht an
      if ((def.prereq || []).some((p) => quests[p]?.state !== 3)) continue;
      if ((def.minLevel ?? 1) > (fresh ? lvl : teamLevel(st))) { if (npcLoc(def.giver, def.giverMap)) grindTo = Math.min(grindTo, def.minLevel); continue; }
      const loc = npcLoc(def.giver, def.giverMap || (cfg.apOrder === 'sweep' ? autopilot.sweepAt : null));
      if (loc) tasks.push({ key: `accept:${def.id}`, kind: 'talk', purpose: 'accept', questId: def.id, npcId: def.giver, loc, prio: 2, def,
        label: `„${def.name}“ ${fresh ? '' : '(täglich) '}annehmen bei ${npcName(def.giver)}` });
    }
    if (cfg.apDailies) { // Dailies: jeden Pool-NPC einmal pro Partner und Lauf ansprechen
      const act = activePartner(st)?.partnerId || 'p';
      for (const pool of Object.values(C.dailies || {})) {
        if (lvl < (pool.levels?.[0] ?? 1)) continue;
        const visitKey = `${pool.id}|${act}`;
        if (autopilot.dailyVisited.has(visitKey)) continue;
        if (!(pool.quests || []).some((d) => (quests[d.id]?.state ?? 0) === 0)) continue;
        for (const npc of pool.npcs || []) {
          const loc = npcLoc(npc, cfg.apOrder === 'sweep' ? autopilot.sweepAt : null);
          if (!loc) continue;
          tasks.push({ key: `daily:${visitKey}`, kind: 'talk', purpose: 'daily', visitKey, npcId: npc, loc, prio: 2,
            def: { pool: pool.id }, label: `Dailies bei ${npcName(npc)} abholen` });
          break;
        }
      }
    }
    if (grindTo < Infinity && cfg.apGrind && cfg.apOrder !== 'sweep') {
      const spot = grindSpot(C, lvl, mapId);
      if (spot) tasks.push({ key: `grind:${grindTo}`, kind: 'hunt', grind: true, targetLevel: grindTo, species: new Set(spot.species),
        names: spot.names, loc: spot, prio: 50, label: `Grinde bis Lv ${grindTo} (${spot.names})` });
    }
    const now = Date.now();
    // Runde: nur Quests, deren Geber auf der aktuellen Runden-Map steht (Ziele dürfen woanders liegen)
    const M = cfg.apOrder === 'sweep' ? autopilot.sweepAt : null;
    return tasks
      .filter((t) => !M || t.grind ? !M : t.purpose === 'daily' ? t.loc.mapId === M : questOnMap(t.def, M))
      .filter((t) => (autopilot.failed.get(t.key) || 0) < now && hops(mapId, t.loc.mapId) < Infinity)
      .map((t) => ({ ...t, cost: hops(mapId, t.loc.mapId) * 10 + t.prio, phase: M ? taskPhase(t) : 0 }))
      .sort((a, b) => a.phase - b.phase || a.cost - b.cost);
  }
  // Phasen der Map-für-Map-Runde: 1 = Quests annehmen, 2 = Ziele erledigen, 3 = abgeben.
  // So wird pro Map erst alles angenommen, dann alles erledigt und ganz zum Schluss abgegeben –
  // Digimon-Wechsel und Zurück-Digitation passieren nur einmal, beim Übergang zum Abgeben.
  const taskPhase = (t) => (t.purpose === 'accept' || t.purpose === 'daily' ? 1 : t.purpose === 'turnin' ? 3 : 2);
  const PHASE_NAMES = { 1: 'Quests annehmen', 2: 'Ziele erledigen', 3: 'Quests abgeben' };

  function taskDone(st, t) {
    if (t.grind) return (st?.me?.partner?.level ?? 0) >= t.targetLevel;
    if (t.purpose === 'daily') return autopilot.dailyVisited.has(t.visitKey);
    const q = st?.me?.quests?.[t.questId];
    if (t.purpose === 'turnin') return q?.state !== 2;
    if (t.purpose === 'accept') return q?.state === 1 || q?.state === 2;
    return !q || q.state !== 1 || (q.counters?.[t.objIndex] ?? 0) >= t.need;
  }

  // Die Wegfindung des Spiels gibt nach 4.000 Knoten auf – für Ziele am anderen Ende großer Maps zu wenig.
  // Deshalb: eigene Route übers Kollisionsraster der Map (Breitensuche, ohne Grenze) und Etappen von ~12 Feldern
  // an die Spiel-Wegfindung geben.
  const LONG_WALK = 260;
  function gridRoute(fromX, fromY, toX, toY) {
    const g = worldScene()?.map?.grid;
    if (!g?.blocked || !g.w || !g.h) return null;
    const T = g.tile || 16, W = g.w, H = g.h;
    const free = (cx, cy) => cx >= 0 && cy >= 0 && cx < W && cy < H && g.blocked[cy * W + cx] !== 1;
    const nearFree = (cx, cy) => {
      if (free(cx, cy)) return [cx, cy];
      for (let r = 1; r <= 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (free(cx + dx, cy + dy)) return [cx + dx, cy + dy];
      return null;
    };
    const a = nearFree(Math.floor(fromX / T), Math.floor(fromY / T)), b = nearFree(Math.floor(toX / T), Math.floor(toY / T));
    if (!a || !b) return null;
    const start = a[1] * W + a[0], goal = b[1] * W + b[0];
    const prev = new Int32Array(W * H).fill(-1);
    prev[start] = start;
    const q = new Int32Array(W * H);
    let head = 0, tail = 0;
    q[tail++] = start;
    while (head < tail) {
      const c = q[head++];
      if (c === goal) break;
      const cx = c % W, cy = (c - cx) / W;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (!free(nx, ny)) continue;
        const n = ny * W + nx;
        if (prev[n] !== -1) continue;
        prev[n] = c;
        q[tail++] = n;
      }
    }
    if (prev[goal] === -1) return null;
    const path = [];
    for (let c = goal; c !== start; c = prev[c]) path.push(c);
    path.reverse();
    return path.map((c) => ({ x: (c % W) * T + T / 2, y: Math.floor(c / W) * T + T / 2 }));
  }
  // Nächster Zwischenpunkt auf der eigenen Route (oder das Ziel selbst, wenn es nah ist / keine Route existiert)
  function waypoint(me, x, y, now) {
    if (Math.hypot(me.x - x, me.y - y) <= LONG_WALK) return { x, y };
    let r = autopilot.route;
    if (!r || Math.hypot(r.tx - x, r.ty - y) > 24 || now - r.at > 10000) {
      r = autopilot.route = { tx: x, ty: y, at: now, path: gridRoute(me.x, me.y, x, y) };
    }
    if (!r.path?.length) return { x, y };
    let best = 0, bestD = Infinity;
    r.path.forEach((p, i) => { const d = Math.hypot(p.x - me.x, p.y - me.y); if (d < bestD) { bestD = d; best = i; } });
    return r.path[Math.min(best + 12, r.path.length - 1)];
  }

  // Läuft zur Stelle (x, y) über die Wegfindung des Spiels. Liefert die Entfernung oder 'stuck'.
  function walkTo(st, x, y, now) {
    const me = controlled(st);
    if (!me) return Infinity;
    const d = Math.hypot(me.x - x, me.y - y);
    let nav = autopilot.nav;
    if (!nav || Math.hypot(nav.tx - x, nav.ty - y) > 24) nav = autopilot.nav = { tx: x, ty: y, best: d, progressAt: now, tries: 0 };
    if (d < nav.best - 6) { nav.best = d; nav.progressAt = now; }
    if (now - nav.progressAt > NAV_STUCK_MS) return 'stuck';
    const idle = now - nav.progressAt > 1200;
    const wp = waypoint(me, x, y, now);
    const nearWp = nav.wp && Math.hypot(me.x - nav.wp.x, me.y - nav.wp.y) < 40; // Etappe erreicht -> gleich weiter
    if ((nav.tries === 0 || idle || (nearWp && (wp.x !== nav.wp.x || wp.y !== nav.wp.y)))
      && now - autopilot.lastTap > (nearWp ? 300 : WALK_RETRY_MS / (nav.tries === 0 ? 4 : 1))) {
      // ab dem dritten Versuch leicht versetzt laufen, um an Kanten nicht hängen zu bleiben
      const j = nav.tries >= 2 && !nearWp ? 24 : 0;
      worldScene()?.tapGround?.(wp.x + (Math.random() - 0.5) * j, wp.y + (Math.random() - 0.5) * j);
      autopilot.lastTap = now; nav.tries++; nav.wp = wp;
    }
    return d;
  }

  // Schnellreise per Digi-Phone: nur wenn auf der aktuellen Map ein Digi-Phone steht und das Ziel mindestens 2 Maps
  // entfernt ist. Ruft an („Make a call“), holt die Liste freigeschalteter Maps und reist zum Ziel – oder zur
  // freigeschalteten Map, die ihm am nächsten liegt. Liefert Statustext, oder null = zu Fuß weiter.
  const TELEPORT_MIN_HOPS = 2;
  function teleportTargets(st) {
    const tp = st.teleport;
    if (!tp || tp.mapId !== st.world?.mapId || performance.now() - (tp.at || 0) > 60000) return null;
    const C = content(), ids = new Set();
    const walk = (x, depth) => {
      if (x == null || depth > 5) return;
      if (typeof x === 'string') { if (C?.maps?.[x]) ids.add(x); return; }
      if (typeof x === 'object') for (const v of Object.values(x)) walk(v, depth + 1);
    };
    walk(tp.maps, 0);
    return [...ids];
  }
  function tryTeleport(st, mapId, now) {
    const cur = st.world?.mapId;
    const h = hops(cur, mapId);
    if (h < TELEPORT_MIN_HOPS || (autopilot.tpBlock.get(mapId) || 0) > now) return null;
    const phone = (world.maps[cur]?.npcs || []).find((n) => n.npcId === 'digiphone');
    if (!phone) return null;
    const mapName = (id) => content()?.maps?.[id]?.name || id;
    const block = (why) => {
      autopilot.tpBlock.set(mapId, now + TASK_BAN_MS);
      autopilot.tp = null;
      commands()?.closeDialog?.();
      logEvent('warn', `Digi-Phone: ${why} – laufe zu Fuß`);
      return null;
    };
    const list = teleportTargets(st);
    if (list) {
      const best = list.includes(mapId) ? mapId
        : list.filter((m) => m !== cur && hops(m, mapId) <= h - TELEPORT_MIN_HOPS).sort((a, b) => hops(a, mapId) - hops(b, mapId))[0];
      if (!best) return block(`${mapName(mapId)} (noch) nicht freigeschaltet`);
      autopilot.tp ||= { tries: 0, at: 0 };
      if (now - autopilot.tp.at > 4000) {
        if (++autopilot.tp.tries > 3) return block('Reise klappt nicht (zu wenig Bits?)');
        autopilot.tp.at = now;
        commands()?.teleport?.(best);
        logEvent('map', `Digi-Phone: Schnellreise nach ${mapName(best)}`);
      }
      return `Digi-Phone: Schnellreise nach ${mapName(best)}…`;
    }
    autopilot.tp ||= { tries: 0, at: 0, asked: 0 };
    if (st.dialog?.npc === 'digiphone') {
      if (now - autopilot.dialogAt > 1200) {
        autopilot.dialogAt = now;
        commands()?.chooseDialog?.('travel');
        commands()?.teleportList?.();
        autopilot.tp.asked ||= now;
      }
      return 'Digi-Phone: rufe an…';
    }
    if (autopilot.tp.asked && now - autopilot.tp.asked > 8000) return block('keine Zielliste erhalten');
    if (autopilot.tp.asked) { // Fenster schon zu, Liste angefragt -> kurz warten
      if (now - autopilot.tp.at > 3000) { autopilot.tp.at = now; commands()?.teleportList?.(); }
      return 'Digi-Phone: warte auf Zielliste…';
    }
    const me = controlled(st);
    const d = me ? Math.hypot(me.x - phone.x, me.y - phone.y) : Infinity;
    if (d > NPC_TALK_DIST) {
      if (walkTo(st, phone.x, phone.y + 12, now) === 'stuck') return block('Digi-Phone nicht erreichbar');
      return `Laufe zum Digi-Phone (Ziel ${mapName(mapId)}, ${h} Maps entfernt)`;
    }
    if (now - autopilot.lastTalk > 3000) {
      if (++autopilot.tp.tries > 4) return block('Digi-Phone antwortet nicht');
      autopilot.lastTalk = now;
      commands()?.talk?.('digiphone');
    }
    return 'Digi-Phone: rufe an…';
  }

  // Bringt die Figur auf die Map des Ziels (Portal für Portal). true = schon auf der richtigen Map.
  function travel(st, mapId, now, viaPhone = false) {
    const cur = st.world?.mapId;
    if (cur === mapId) { autopilot.tp = null; return true; }
    if (cfg.apTeleport || viaPhone) {
      const tp = tryTeleport(st, mapId, now);
      if (tp) return tp;
    }
    const r = route(cur, mapId);
    const portal = r && world.maps[cur]?.portals.find((p) => p.toMap === r[1]);
    if (!portal) return 'Keine Route';
    const res = walkTo(st, portal.x + portal.w / 2, portal.y + portal.h / 2, now);
    if (res === 'stuck') return 'Portal nicht erreichbar';
    const C = content();
    const nm = (id) => C?.maps?.[id]?.name || id;
    return `Reise nach ${nm(mapId)}: Portal → ${nm(r[1])}${r.length > 2 ? ` (noch ${r.length - 1} Maps)` : ''}`;
  }

  // Weg durch den Dialogbaum des NPCs (steht in den Spieldaten) zur gesuchten Auswahl. Manche Quests liegen in
  // Unterdialogen (z. B. Elecmon: „Can I help with anything?“ → „Leave it to us!“). Liefert die Auswahl im
  // aktuellen Fenster, die direkt passt (final) oder über "next" dorthin führt – oder null.
  function dialogStep(npcId, node, want) {
    const tree = content()?.npcs?.[npcId]?.dialog || [];
    const byId = new Map(tree.map((n) => [n.id, n]));
    const start = node?.choices ? node : byId.get(node?.id);
    if (!start) return null;
    const direct = (start.choices || []).find(want);
    if (direct) return { choice: direct, final: true };
    const seen = new Set([start.id]);
    const queue = (start.choices || []).filter((c) => c.next && byId.has(c.next)).map((c) => ({ first: c, id: c.next }));
    while (queue.length) {
      const { first, id } = queue.shift();
      if (seen.has(id)) continue;
      seen.add(id);
      const n = byId.get(id);
      if ((n.choices || []).some(want)) return { choice: first, final: false };
      for (const c of n.choices || []) if (c.next && byId.has(c.next)) queue.push({ first, id: c.next });
    }
    return null;
  }

  // Dialog mit dem NPC der Aufgabe: Quest annehmen/abgeben per Dialog-Auswahl (wie ein Klick), bei Bedarf über
  // Unterdialoge. Klappt das nicht: NPC einmal neu ansprechen, dann direkter Befehl des Spiels, dann aufgeben.
  const DIALOG_STEP_MS = 1200;
  const DIALOG_MAX_STEPS = 6;
  function handleDialog(st, t, now) {
    const cmd = commands();
    const d = st.dialog;
    if (now - autopilot.dialogAt < DIALOG_STEP_MS) return 'Im Gespräch…';
    autopilot.dialogAt = now;
    const name = content()?.npcs?.[t.npcId]?.name || t.npcId;
    if (t.purpose === 'daily') { // statt Board kam ein normaler Dialog -> hier gibt es (gerade) keine Dailies
      cmd?.closeDialog?.();
      autopilot.dailyVisited.add(t.visitKey);
      logEvent('auto', `${name}: keine Dailies angeboten`);
      return 'Keine Dailies';
    }
    if (t.purpose !== 'accept' && t.purpose !== 'turnin') {
      cmd?.closeDialog?.();
      return 'Gespräch geführt';
    }
    const accept = t.purpose === 'accept';
    const want = (c) => c.action === (accept ? 'acceptQuest' : 'turnInQuest') && c.questId === t.questId;
    t.dlgSteps = (t.dlgSteps || 0) + 1;
    if (t.dlgSteps <= DIALOG_MAX_STEPS) {
      const step = dialogStep(t.npcId, d.node, want);
      if (step) {
        cmd?.chooseDialog?.(step.choice.id);
        const label = step.choice.label || step.choice.id;
        logEvent('auto', step.final ? `Dialog mit ${name}: ${accept ? 'Quest annehmen' : 'Quest abgeben'}` : `Dialog mit ${name}: „${label}“`);
        return step.final ? (accept ? 'Nehme Quest an…' : 'Gebe Quest ab…') : `Im Gespräch mit ${name}: „${label}“…`;
      }
    }
    if (!t.retalked) { // Fenster passt nicht (z. B. nach einer Abgabe) -> schließen und frisch ansprechen
      t.retalked = true;
      t.dlgSteps = 0;
      cmd?.closeDialog?.();
      autopilot.lastTalk = 0;
      autopilot.talkTries = 0;
      logEvent('warn', `${name}: passende Auswahl nicht gefunden – spreche neu an`);
      return `Spreche ${name} neu an…`;
    }
    if (!t.direct) { // Rückfall: direkter Befehl des Spiels
      t.direct = true;
      accept ? cmd?.acceptQuest?.(t.questId) : cmd?.turnInQuest?.(t.questId);
      logEvent('warn', `${name}: Auswahl fehlt im Dialog – direkter Befehl`);
      return accept ? 'Nehme Quest an…' : 'Gebe Quest ab…';
    }
    cmd?.closeDialog?.();
    return null; // klappt nicht -> Aufgabe wird übersprungen
  }

  // Ein Schritt des Autopiloten. Liefert den Statustext oder null, wenn es nichts mehr zu tun gibt.
  function autopilotStep(st, sc, now) {
    if (world.state !== 'ready') { loadWorld(); return `Lade Weltkarte… ${world.loaded}/${world.total || '?'}`; }
    if (st.screen !== 'world') return 'Warte auf Map-Wechsel…';
    if (cfg.apOrder === 'sweep') {
      autopilot.sweepAt = sweepMap(st);
      if (!autopilot.sweepAt) { cfg.apSweepMap = ''; saveCfg(); return null; }
    } else autopilot.sweepAt = null;
    let t = autopilot.task;
    if (t && taskDone(st, t)) { t = null; autopilot.reset(); }
    if (!t) {
      let all = questTasks(st);
      // Runde: auf dieser Map nichts mehr zu tun -> nächste Map (absteigend)
      for (let guard = 0; cfg.apOrder === 'sweep' && !all.length && guard < 40; guard++) {
        const done = autopilot.sweepAt;
        const why = sweepSkipReasons(st, done);
        const next = sweepAdvance(st);
        logEvent('map', next ? `Runde: ${content()?.maps?.[done]?.name || done} erledigt${why} → weiter mit ${content()?.maps?.[next]?.name || next}`
          : `Runde: ${content()?.maps?.[done]?.name || done} erledigt${why} – Runde beendet`);
        if (!next) return null;
        autopilot.sweepAt = next;
        autopilot.phase = 0;
        all = questTasks(st);
      }
      t = autopilot.task = all[0] || null;
      if (t?.kind === 'hunt' && !t.grind) {
        const same = all.filter((o) => o.kind === 'hunt' && !o.grind && o.loc.mapId === t.loc.mapId && o !== t);
        if (same.length) {
          t.species = new Set([t.species, ...same.map((o) => o.species)].flatMap((x) => [...x]));
          t.names = [...new Set([t.names, ...same.map((o) => o.names)])].join(', ');
          t.label += ` (+${same.length} weitere${same.length > 1 ? '' : 's'} Ziel${same.length > 1 ? 'e' : ''})`;
        }
      }
      if (t && t.phase && t.phase !== autopilot.phase) {
        autopilot.phase = t.phase;
        logEvent('map', `Runde ${content()?.maps?.[autopilot.sweepAt]?.name || autopilot.sweepAt}: Phase ${t.phase}/3 – ${PHASE_NAMES[t.phase]}`);
      }
      if (t) logEvent('auto', `Aufgabe: ${t.label}`);
      autopilot.nav = null; autopilot.talkTries = 0; autopilot.arrivedAt = 0; autopilot.idleSince = 0;
      if (!t) { autopilot.huntSpecies = new Set(); return null; }
    }
    const C = content();
    const fail = (why) => {
      autopilot.failed.set(t.key, now + TASK_BAN_MS);
      autopilot.reset();
      logEvent('warn', `${t.label}: ${why} – 5 min übersprungen`);
      return `${t.label}: ${why} – übersprungen`;
    };
    // offener Dialog mit einem anderen NPC stört nur -> schließen
    if (st.dialog && st.dialog.npc !== t.npcId && !(st.dialog.npc === 'digiphone' && autopilot.tp)) commands()?.closeDialog?.();

    autopilot.huntSpecies = t.kind === 'hunt' && st.world?.mapId === t.loc.mapId ? t.species : new Set();
    // Quest-Digimon (in der gewählten Digitation) für Annehmen und Erledigen; für Abgaben das Abgabe-Digimon.
    // In der Map-für-Map-Runde wird schon vor dem ersten Annehmen digitiert und vor dem Hinlaufen zur Abgabe
    // zurück-digitiert und gewechselt – nicht erst beim NPC.
    if (t.purpose !== 'turnin') {
      const sw = ensurePartner(st, cfg.apQuestPartner, now);
      if (sw !== true) return `${t.label} · ${sw}`;
      if (cfg.apOrder === 'sweep' && (!cfg.apQuestPartner || activePartner(st)?.partnerId === cfg.apQuestPartner)) {
        const ev = ensureEvolution(st, cfg.apEvo, now);
        if (ev !== true) return `${t.label} · ${ev}`;
      }
    } else if (cfg.apOrder === 'sweep') {
      const sw = ensurePartner(st, cfg.apTurninPartner || cfg.apQuestPartner, now);
      if (sw !== true) return `${t.label} · ${sw}`;
    }
    const tr = travel(st, t.loc.mapId, now);
    if (tr !== true) return tr === 'Keine Route' || tr === 'Portal nicht erreichbar' ? fail(tr) : `${t.label} · ${tr}`;

    if (t.kind === 'reach') {
      if (t.loc.x !== undefined) { // Ziel ist eine Zone auf der Map: hineinlaufen
        const mePos = controlled(st);
        const dz = mePos ? Math.hypot(mePos.x - t.loc.x, mePos.y - t.loc.y) : 0;
        if (dz > 48) {
          autopilot.arrivedAt = 0;
          return walkTo(st, t.loc.x, t.loc.y, now) === 'stuck' ? fail('Zone nicht erreichbar') : `${t.label} · laufe in die Zone (${Math.round(dz)} px)`;
        }
      }
      autopilot.arrivedAt ||= now;
      return now - autopilot.arrivedAt > 15000 ? fail('Ziel zählt nicht') : `${t.label} · angekommen`;
    }

    const me = controlled(st);
    if (t.kind === 'talk') {
      const name = C?.npcs?.[t.npcId]?.name || t.npcId;
      if (t.purpose === 'daily' && st.dailies?.board) return acceptFromBoard(st, t, now);
      if (t.purpose === 'turnin' && st.dailies?.board) {
        // Dieser NPC öffnet nur das Daily-Board: direkte Abgabe versuchen, sonst einen anderen NPC des Pools nehmen
        commands()?.closeDailyBoard?.();
        autopilot.boardOnly.add(t.npcId);
        commands()?.turnInQuest?.(t.questId);
        logEvent('auto', `${name}: nur Daily-Board – versuche direkte Abgabe, sonst anderer NPC`);
        autopilot.reset();
        return `${t.label} · versuche direkte Abgabe…`;
      }
      if (t.purpose === 'turnin' && st.dialog?.npc === t.npcId) { // Abgabe-Digimon auch bei schon offenem Dialog
        const sw = ensurePartner(st, cfg.apTurninPartner || cfg.apQuestPartner, now);
        if (sw !== true) return `${t.label} · ${sw}`;
      }
      if (st.dialog?.npc === t.npcId) return handleDialog(st, t, now) ?? fail('keine passende Auswahl im Dialog');
      let npc = null;
      window.dmo?.net?.state?.entities?.forEach((e) => { if (e.kind === KIND.Npc && e.defId === t.npcId) npc = e; });
      const pos = npc || t.loc;
      const d = me ? Math.hypot(me.x - pos.x, me.y - pos.y) : Infinity;
      if (d > NPC_TALK_DIST) {
        const r = walkTo(st, pos.x, pos.y + 12, now);
        if (r === 'stuck') return fail(`${name} nicht erreichbar`);
        if (!npc && d < 80) { autopilot.arrivedAt ||= now; if (now - autopilot.arrivedAt > 6000) return fail(`${name} ist nicht da`); }
        return `${t.label} · laufe zu ${name} (${Math.round(d)} px)`;
      }
      if (!npc) { autopilot.arrivedAt ||= now; return now - autopilot.arrivedAt > 6000 ? fail(`${name} ist nicht da`) : `Suche ${name}…`; }
      if (t.purpose === 'turnin') { // Abgabe mit dem gewählten Abgabe-Digimon
        const sw = ensurePartner(st, cfg.apTurninPartner || cfg.apQuestPartner, now);
        if (sw !== true) return `${t.label} · ${sw}`;
      }
      if (now - autopilot.lastTalk > 3000) {
        if (++autopilot.talkTries > 4) return fail(`${name} antwortet nicht`);
        autopilot.lastTalk = now;
        commands()?.talk?.(t.npcId);
      }
      return `${t.label} · spreche mit ${name}…`;
    }

    // Jagen mit der gewählten Digitation (nur wenn das Quest-Digimon aktiv ist)
    if (!cfg.apQuestPartner || activePartner(st)?.partnerId === cfg.apQuestPartner) {
      const ev = ensureEvolution(st, cfg.apEvo, now);
      if (ev !== true) return `${t.label} · ${ev}`;
    }
    // Jagen: zum nächsten sichtbaren passenden Monster laufen, sonst ins Jagdgebiet, sonst warten
    const prey = (sc?.mobs || []).find((m) => t.species.has(m.species) && m.inLvl && !m.taken && !m.banned);
    if (prey) {
      autopilot.idleSince = 0;
      const r = walkTo(st, Math.round(prey.x / 16) * 16, Math.round(prey.y / 16) * 16, now);
      if (r === 'stuck') { blacklist.set(prey.id, now + BAN_MS); autopilot.nav = null; }
      return `${t.label} · laufe zu ${t.names} (${Math.round(prey.d)} px)`;
    }
    const dz = me ? Math.hypot(me.x - t.loc.x, me.y - t.loc.y) : Infinity;
    if (dz > 48) {
      const r = walkTo(st, t.loc.x, t.loc.y, now);
      return r === 'stuck' ? fail('Jagdgebiet nicht erreichbar') : `${t.label} · laufe ins Jagdgebiet (${Math.round(dz)} px)`;
    }
    autopilot.idleSince ||= now;
    return now - autopilot.idleSince > HUNT_IDLE_MS ? fail('keine passenden Monster') : `${t.label} · warte auf ${t.names}…`;
  }

  // Arten, die der Quest-Modus auf dieser Map noch jagen muss (aus aktivierten, offenen Kampf-/Sammelzielen)
  function questTargets(st, sc) {
    const species = new Set(), open = [];
    for (const q of questList(st, sc)) {
      if (!q.on || q.state !== 1) continue;
      for (const o of q.objectives) {
        if (o.done || !o.huntable || !o.here) continue;
        o.species.forEach((sp) => species.add(sp));
        open.push(o);
      }
    }
    return { species, open };
  }

  // Alle Monster-Arten, die auf der aktuellen Map vorkommen können: Spawn-Tabelle des Spiels (Zonen + Feldbosse)
  // plus live gesehene Varianten (z. B. Elite). Liefert Zeilen für die Liste im Reiter "Attacken".
  function mapMonsters(st, sc) {
    const C = worldScene()?.deps?.content;
    const mapId = st?.world?.mapId;
    if (!mapId) return [];
    // Varianten wie "betamon_shore" heißen im Spiel genauso wie das Original -> Zusatz anhängen ("Betamon (Shore)")
    const title = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const nameOf = (sp) => {
      const variant = sp.includes('_') ? ` (${title(sp.slice(sp.indexOf('_') + 1))})` : '';
      return C?.digimon?.[sp]?.name ? C.digimon[sp].name + variant : title(sp);
    };
    const rows = new Map();
    const add = (species, cat, lo, hi, extra = {}) => {
      const key = `${species}|${cat}`;
      const r = rows.get(key) || { key, species, cat, name: nameOf(species), lo, hi, count: 0, aggressive: false };
      r.lo = Math.min(r.lo, lo); r.hi = Math.max(r.hi, hi);
      Object.assign(r, extra);
      rows.set(key, r);
      return r;
    };
    const spawn = C?.spawns?.[mapId];
    for (const zone of Object.values(spawn?.zones || {})) {
      for (const en of zone.entries || []) {
        const [lo, hi] = Array.isArray(en.level) ? en.level : [en.level, en.level];
        add(en.species, 'normal', lo, hi);
      }
    }
    for (const b of spawn?.bosses || []) {
      add(b.species, 'boss', b.level, b.level, { title: b.title, respawnMs: b.respawnMs });
    }
    for (const [key, s] of seen.get(mapId) || []) {
      const [species, cat] = key.split('|');
      const r = rows.get(key) || add(species, cat, Infinity, -Infinity);
      if (s.aggressive) r.aggressive = true;
    }
    for (const m of sc?.mobs || []) {
      const r = rows.get(m.key) || add(m.species, m.cat, m.level, m.level);
      r.count++;
      r.lo = Math.min(r.lo, m.level); r.hi = Math.max(r.hi, m.level);
    }
    const order = { normal: 0, elite: 1, boss: 2 };
    return [...rows.values()].sort((a, b) => order[a.cat] - order[b.cat] || a.lo - b.lo || a.name.localeCompare(b.name));
  }

  // Bestes nächstes Ziel: zuerst der nächste Angreifer, sonst (nicht im Ruhemodus) das nächste passende Monster im Radius.
  // ---------- Boss-Rotation (Digi-Eier farmen) ----------
  // Ausgewählte Feldbosse (Map + Art) werden reihum besiegt, auf den erlaubten Kanälen. Zeiten kommen aus drei Quellen:
  //  - Boss-Timer des Spiels (wie das Boss-Fenster): Befehl requestBossPins -> st.bossPins.bosses, je Boss EIN Kanal
  //    (lebt: ohne respawnInMs, sonst Respawn in respawnInMs, gemessen ab bossPins.at)
  //  - Map-Info des aktuellen Kanals (requestMapInfo -> st.mapInfo.bosses), wenn man auf der Boss-Map steht
  //  - eigener Sieg: Respawn-Zeit aus den Spieldaten
  // Unbekannte Kanäle schaut der Bot selbst nach (hinreisen, Kanal wechseln, Map-Info lesen).
  const FARM_PIN_MS = 6000;       // Boss-Timer so oft abfragen
  const FARM_INFO_MS = 5000;      // Map-Info so oft abfragen (nur auf einer Boss-Map)
  const FARM_SWITCH_MS = 10000;   // Kanalwechsel frühestens so oft versuchen
  const FARM_UP_TTL = 60000;      // „lebt“ gilt so lange ohne neue Bestätigung
  const FARM_DOWN_GRACE = 180000; // nach Ablauf des Timers so lange noch als „gleich da“ werten, dann unbekannt
  const FARM_HOP_MS = 45000;      // geschätzte Reisezeit pro Map-Wechsel
  const FARM_CH_MS = 10000;       // geschätzte Zeit für einen Kanalwechsel
  const FARM_NEAR = 64;           // so nah am Spawnpunkt wird gewartet
  const farm = {
    known: new Map(),   // "map#index#ch" -> { up, hp, readyAt, at }
    goal: null,         // { map, index, ch, species }
    lastPins: 0, lastInfo: 0, lastSwitch: 0, switchTries: 0,
    channels: null,     // { mapId, at, list:[{roomId, channel, clients, maxClients, closing}] }
    chLoading: false,
    fight: null,        // { key, id, ch, pct } – Boss, gegen den gerade gekämpft wird (pct = zuletzt gesehene HP %)
    waitAt: 0,
    pinsAt: null, infoAt: null, // zuletzt ausgewertete Antworten (Zeitstempel)
    firstSeen: new Map(), // Boss-Entity -> wann zuerst gesehen (Spawn-Schutz)
    chBan: new Map(),   // "map#ch" -> bis wann der Kanal gemieden wird (voll, Wechsel klappt nicht)
    route: null,        // Named-Runde: { i, map, skip:Set(ch), back, chSince, chKey, zoneAt, patrol, logged:Set }
    opening: null,      // { key, at, tries } – gerade angestoßenes Öffnen eines neuen Kanals
    reset() { this.goal = null; this.fight = null; this.switchTries = 0; this.route = null; this.opening = null; },
  };
  // Bosse nehmen die ersten 3 s nach dem Respawn kaum Schaden (99 % Reduktion). Solange ein Farm-Boss frisch
  // aufgetaucht ist und volle HP hat, nur normal angreifen – Skills (Abklingzeit, DS) erst danach.
  const FARM_SPAWN_GUARD_MS = 3300;
  function farmShielded(t, now) {
    if (!cfg.farm || !t) return false;
    const since = farm.firstSeen.get(t.id);
    return since !== undefined && now - since < FARM_SPAWN_GUARD_MS && t.maxHp > 0 && t.hp >= t.maxHp * 0.99;
  }
  const farmKey = (map, index, ch) => `${map}#${index}#${ch}`;
  // Alle Feldbosse aus den Spieldaten (ohne Raids), sortiert nach Level
  function farmBossList() {
    const C = content(), out = [];
    for (const [map, sp] of Object.entries(C?.spawns || {})) {
      if (sp.raid) continue;
      (sp.bosses || []).forEach((b, index) => out.push({
        id: `${map}#${b.species}`, map, index, species: b.species, level: b.level, respawnMs: b.respawnMs || 0, at: b.at,
        kind: b.worldBoss ? 'world' : b.enrageMs ? 'group' : (b.at in (sp.zones || {})) ? 'named' : 'field',
        name: C.digimon?.[b.species]?.name || b.species, mapName: C.maps?.[map]?.name || map,
      }));
    }
    return out.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }
  const farmSelected = () => {
    if (cfg.farmMode === 'named') return routeList().map((r) => r.boss);
    const on = new Set(cfg.farmBosses || []);
    return farmBossList().filter((b) => on.has(b.id));
  };
  // Named-Elite-Runde: alle Maps mit einem Named Elite (ohne Raids/sichere Maps), nach Level aufsteigend
  function routeMaps() {
    const C = content();
    const named = new Map();
    for (const b of farmBossList()) if (b.kind === 'named' && !named.has(b.map)) named.set(b.map, b);
    return [...named.values()].map((b) => ({ id: b.map, name: b.mapName, range: C?.maps?.[b.map]?.levelRange || [b.level, b.level], boss: b }))
      .filter((r) => !C?.maps?.[r.id]?.safe)
      .sort((a, b) => (a.range[0] ?? 0) - (b.range[0] ?? 0) || (a.range[1] ?? 0) - (b.range[1] ?? 0) || a.name.localeCompare(b.name));
  }
  // Abschnitt Start-Map … End-Map (umgekehrt, wenn die Start-Map höher liegt)
  function routeList() {
    const all = routeMaps();
    if (!all.length) return [];
    let a = all.findIndex((r) => r.id === cfg.routeStart), b = all.findIndex((r) => r.id === cfg.routeEnd);
    if (a < 0) a = 0;
    if (b < 0) b = all.length - 1;
    return a <= b ? all.slice(a, b + 1) : all.slice(b, a + 1).reverse();
  }
  // Zu jagende Arten auf einer Map (Art -> Level). Ein Boss kann im Spiel als Boss oder Elite markiert sein;
  // ein gleichnamiges normales Monster zählt nur mit genau dem Boss-Level.
  function farmTargets(mapId) {
    const m = new Map();
    for (const b of farmSelected()) if (b.map === mapId) m.set(b.species, b.level);
    return m;
  }
  const isFarmMob = (ft, defId, cat, level) => !!ft && ft.has(defId) && (cat !== 'normal' || level === ft.get(defId));
  const bossEntityMatch = (b, en) => en.defId === b.species && (!!(en.flags & (FLAG.Boss | FLAG.Elite)) || en.level === b.level);
  const farmChannels = () => (cfg.farmChannels || []).map(Number).filter((c) => c > 0).sort((a, b) => a - b);
  // Spawnpunkt des Bosses (Zone oder Punkt aus der Map-Datei)
  function farmSpot(b) {
    const m = world.maps[b.map];
    const z = m?.zones?.[b.at];
    if (z) return { x: z.x + z.w / 2, y: z.y + z.h / 2 };
    return m?.spawns?.[b.at] || null;
  }
  function farmSet(map, index, ch, info) {
    if (!ch) return;
    farm.known.set(farmKey(map, index, ch), { ...info, at: Date.now() });
  }
  // Timer-Eintrag des Spiels -> Wissen. respawnInMs zählt ab dem Zeitpunkt "at" (performance.now) der Antwort.
  function farmLearn(map, index, ch, e, at) {
    // Antwort, die noch vor unserem Sieg abgeschickt wurde, nicht als „lebt“ übernehmen
    const k = farm.known.get(farmKey(map, index, ch));
    if (e.respawnInMs === undefined && k?.killed && Date.now() - k.at < 10000) return;
    if (e.respawnInMs === undefined) farmSet(map, index, ch, { up: true, hp: e.hp });
    else farmSet(map, index, ch, { up: false, readyAt: Date.now() - (performance.now() - at) + e.respawnInMs });
  }
  function farmUpdate(st, now) {
    const sel = farmSelected();
    // Jede Antwort nur einmal auswerten – sie bleibt im Spielzustand liegen und wäre sonst nach unserem Sieg veraltet
    const bp = st.bossPins;
    if (bp?.bosses && bp.at !== farm.pinsAt) {
      farm.pinsAt = bp.at;
      for (const e of bp.bosses) {
        if (sel.some((b) => b.map === e.map && b.index === e.index)) farmLearn(e.map, e.index, e.channel ?? 1, e, bp.at);
      }
    }
    const mi = st.mapInfo, ch = st.world?.channel;
    if (mi?.bosses && mi.at !== farm.infoAt && mi.mapId === st.world?.mapId && (!mi.roomId || !st.world?.roomId || mi.roomId === st.world.roomId)) {
      farm.infoAt = mi.at;
      for (const e of mi.bosses) {
        if (sel.some((b) => b.map === mi.mapId && b.index === e.index)) farmLearn(mi.mapId, e.index, ch, e, mi.at);
      }
    }
    // Sichtbare Bosse auf dieser Map/diesem Kanal: leben gerade
    const ents = window.dmo?.net?.state?.entities;
    const here = sel.filter((b) => b.map === st.world?.mapId);
    const alive = new Set();
    ents?.forEach?.((en) => {
      if (en.kind !== KIND.Mob || en.hp <= 0 || (en.flags & FLAG.Dead)) return;
      const b = here.find((x) => bossEntityMatch(x, en));
      if (!b) return;
      alive.add(en.id);
      if (!farm.firstSeen.has(en.id)) farm.firstSeen.set(en.id, now);
      const hp = en.maxHp ? Math.round(en.hp / en.maxHp * 100) : undefined;
      farmSet(b.map, b.index, ch, { up: true, hp });
      // Kampf gegen einen Farm-Boss merken – egal ob der Bot ihn selbst gewählt hat oder er uns angreift
      if (st.target?.id === en.id && farm.fight?.id !== en.id) farm.fight = { key: farmKey(b.map, b.index, ch), id: en.id, ch, map: b.map, pct: hp };
      if (farm.fight?.id === en.id) farm.fight.pct = hp;
    });
    for (const id of farm.firstSeen.keys()) if (!alive.has(id)) farm.firstSeen.delete(id);
    // Unser Kampf ist vorbei und der Boss verschwunden -> besiegt, Respawn-Timer selbst setzen
    const f = farm.fight;
    if (f && !alive.has(f.id) && !(st.target?.id === f.id && st.target.hp > 0)) {
      // Sieg, wenn er zuletzt fast tot war, als Ziel 0 HP hat oder auf derselben Map/demselben Kanal verschwunden ist
      // (mit Hilfe anderer Spieler fällt ein Boss oft zwischen zwei Blicken). Kanal-/Mapwechsel zählen nicht.
      const sameRoom = f.map === st.world?.mapId && f.ch === ch && st.screen === 'world';
      const b = sameRoom || (f.pct ?? 100) <= 15 || (st.target?.id === f.id && st.target.hp <= 0)
        ? sel.find((x) => farmKey(x.map, x.index, f.ch) === f.key) : null;
      if (b) {
        farm.known.set(f.key, { up: false, readyAt: now + b.respawnMs, at: now, killed: true });
        logEvent('kill', `Boss besiegt: ${b.name} (Ch ${f.ch}) – Respawn in ${Math.round(b.respawnMs / 60000)} min`);
      }
      farm.fight = null;
      farm.goal = null;
    }
    // Boss-Timer und Map-Info regelmäßig nachfragen
    const cmd = commands();
    if (sel.length && now - farm.lastPins > FARM_PIN_MS) {
      farm.lastPins = now;
      try { cmd?.requestBossPins?.(sel.slice(0, 8).map((b) => ({ map: b.map, index: b.index }))); } catch { /* ignore */ }
    }
    if (here.length && now - farm.lastInfo > FARM_INFO_MS) {
      farm.lastInfo = now;
      try { cmd?.requestMapInfo?.(); } catch { /* ignore */ }
    }
  }
  // Zustand eines Bosses auf einem Kanal: { state: 'up' | 'down' | 'unknown', readyAt, hp }
  function farmState(b, ch, now) {
    const k = farm.known.get(farmKey(b.map, b.index, ch));
    if (!k) return { state: 'unknown' };
    if (k.up) return now - k.at < FARM_UP_TTL ? { state: 'up', hp: k.hp } : { state: 'unknown' };
    if (now > k.readyAt + FARM_DOWN_GRACE) return { state: 'unknown' };
    return { state: 'down', readyAt: k.readyAt };
  }
  // Nächstes Ziel: was am schnellsten kämpfbar ist (lebt / spawnt zuerst), Reisezeit eingerechnet.
  // Unbekannte Kanäle werden nachgeschaut. Ein laufendes Ziel wird nur für ein deutlich besseres aufgegeben.
  function farmPlan(st, now) {
    const cur = st.world?.mapId, curCh = st.world?.channel ?? 1;
    const opts = [];
    for (const b of farmSelected()) {
      const h = hops(cur, b.map);
      if (h === Infinity) continue;
      for (const ch of farmChannels()) {
        if ((farm.chBan.get(`${b.map}#${ch}`) || 0) > now) continue;
        const s = farmState(b, ch, now);
        const travel = h * FARM_HOP_MS + (b.map === cur && ch === curCh ? 0 : FARM_CH_MS);
        const eta = s.state === 'down' ? Math.max(s.readyAt - now, travel) : travel + (s.state === 'unknown' ? 1 : 0);
        opts.push({ map: b.map, index: b.index, species: b.species, ch, eta, s, b });
      }
    }
    if (!opts.length) return null;
    opts.sort((a, b) => a.eta - b.eta || (a.s.state === 'up' ? -1 : 0) - (b.s.state === 'up' ? -1 : 0));
    const best = opts[0];
    const g = farm.goal && opts.find((o) => o.map === farm.goal.map && o.index === farm.goal.index && o.ch === farm.goal.ch);
    if (g && !(best.eta < g.eta - 20000)) return g;
    if (!g || g.map !== best.map || g.ch !== best.ch || g.index !== best.index) {
      const what = best.s.state === 'up' ? 'lebt' : best.s.state === 'down' ? `Respawn in ${fmtClock(best.s.readyAt - now)}` : 'Timer unbekannt – schaue nach';
      logEvent('auto', `Boss-Ziel: ${best.b.name} · ${best.b.mapName} Ch ${best.ch} (${what})`);
      farm.switchTries = 0;
    }
    farm.goal = { map: best.map, index: best.index, ch: best.ch, species: best.species };
    return best;
  }
  const fmtClock = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  // Kanalliste der aktuellen Map (asynchron, wird zwischengespeichert)
  function farmChannelList(st, now) {
    const mapId = st.world?.mapId;
    const c = farm.channels;
    if (c && c.mapId === mapId && now - c.at < 30000) return c.list;
    if (!farm.chLoading && commands()?.listChannels) {
      farm.chLoading = true;
      Promise.resolve(commands().listChannels()).then((list) => {
        farm.channels = { mapId, at: Date.now(), list: Array.isArray(list) ? list : [] };
      }).catch(() => { farm.channels = { mapId, at: Date.now(), list: [] }; }).finally(() => { farm.chLoading = false; });
    }
    return c && c.mapId === mapId ? c.list : null;
  }
  const CHANNEL_OPEN_WAIT_MS = 8000; // so lange nach "Kanal öffnen" auf den Wechsel warten
  const CHANNEL_RETRY_MS = 60000;    // fehlender Kanal: so lange meiden, dann erneut prüfen/öffnen
  // Wechselt auf Kanal ch der aktuellen Map. Liefert { done: true } (schon dort), { status } (läuft) oder
  // { status, failed: true } (Kanal voll/fehlt/Wechsel klappt nicht – dann 5 min gemieden).
  function farmSwitch(st, sc, mapId, mapName, ch, now) {
    const curCh = st.world?.channel ?? 1;
    if (curCh === ch) { farm.switchTries = 0; farm.opening = null; return { done: true }; }
    if (sc?.attackers?.length) return { status: 'Kanalwechsel nach dem Kampf…' };
    const list = farmChannelList(st, now);
    if (!list) return { status: 'lade Kanalliste…' };
    const room = list.find((r) => r.channel === ch);
    const fail = (why, ms = TASK_BAN_MS) => {
      farm.chBan.set(`${mapId}#${ch}`, now + ms);
      logEvent('warn', `${mapName}: Ch ${ch} ${why} – ${Math.round(ms / 60000)} min gemieden`);
      farm.switchTries = 0;
      return { status: `Ch ${ch} nicht verfügbar`, failed: true };
    };
    if (!room) {
      // Kanal noch nicht offen. Ist er die nächste freie Nummer, öffnet ihn der Bot selbst – wie „New channel – Open“
      // im Kanalfenster. Das Spiel erlaubt das erst, wenn die offenen Kanäle fast voll sind; klappt es nicht,
      // wird der Kanal nur 1 min gemieden und dann erneut versucht.
      const used = new Set(list.map((r) => r.channel));
      let free = 1;
      while (used.has(free)) free++;
      if (ch !== free || !commands()?.openChannel) return fail(ch === free ? 'gibt es nicht' : `ist nicht offen (neu öffnen ginge nur Ch ${free})`, CHANNEL_RETRY_MS);
      const key = `${mapId}#${ch}`;
      if (farm.opening?.key !== key) farm.opening = { key, at: 0, tries: 0 };
      const o = farm.opening;
      if (now - o.at > CHANNEL_OPEN_WAIT_MS) {
        if (o.tries >= 2) {
          farm.opening = null;
          return fail('lässt sich noch nicht öffnen (neuer Kanal erst, wenn die anderen fast voll sind)', CHANNEL_RETRY_MS);
        }
        o.tries++; o.at = now;
        farm.channels = null;  // Kanalliste danach neu laden
        farm.lastInfo = 0;     // und gleich die Map-Info des neuen Kanals holen
        autopilot.nav = null;
        try { Promise.resolve(commands().openChannel()).catch(() => {}); } catch { /* ignore */ }
        logEvent('map', `${mapName}: öffne neuen Kanal Ch ${ch}${o.tries > 1 ? ` (Versuch ${o.tries})` : ''}`);
      }
      return { status: `öffne neuen Kanal Ch ${ch}…` };
    }
    if (room.closing || (room.maxClients && room.clients >= room.maxClients)) return fail('voll/schließt');
    if (now - farm.lastSwitch > FARM_SWITCH_MS) {
      if (++farm.switchTries > 3) return fail('– Wechsel klappt nicht');
      farm.lastSwitch = now;
      autopilot.nav = null;
      farm.lastInfo = 0; // gleich danach die Map-Info des neuen Kanals holen
      try { commands().switchChannel(room.roomId); } catch { /* ignore */ }
      logEvent('map', `Kanalwechsel: Ch ${curCh} → Ch ${ch} (${mapName})`);
    }
    return { status: `wechsle auf Ch ${ch}…` };
  }

  // ---------- Named-Elite-Runde ----------
  const NAMED_WAIT_MS = 120000;     // spawnt der Named Elite in weniger als 2 min, wird gewartet
  const NAMED_INFO_WAIT_MS = 6000;  // nach Ankunft/Kanalwechsel so lange auf die Map-Info warten
  const NAMED_UNKNOWN_MS = 15000;   // in der Zone so lange ohne Timer und ohne Sichtung -> Kanal abhaken
  const NAMED_SEARCH_MS = 45000;    // „lebt“, aber nicht zu finden: so lange die Zone absuchen
  function namedNext(R, list, why) {
    const r = list[R.i];
    if (r && why) logEvent('auto', `Runde: ${r.name} ${why} → weiter`);
    R.i++; R.map = null;
    if (R.i >= list.length) {
      R.i = 0; R.back = true;
      logEvent('map', `Runde fertig – zurück zur Start-Map ${list[0].name} (Digi-Phone)`);
    }
    return `Runde: weiter zu ${list[R.i].name}…`;
  }
  function namedStep(st, sc, now) {
    const list = routeList();
    if (!list.length) return 'Keine Maps mit Named Elite in der Auswahl (Start-/End-Map)';
    const chs = farmChannels();
    const R = farm.route ||= { i: 0, map: null, skip: new Set(), back: false, chSince: 0, chKey: '', zoneAt: 0, patrol: 0, logged: new Set() };
    if (R.i >= list.length) R.i = 0;
    const r = list[R.i], b = r.boss;
    const label = `Map ${R.i + 1}/${list.length} ${r.name}`;
    // 1) Map (nach der End-Map per Digi-Phone zurück)
    if (st.world?.mapId !== b.map) {
      const tr = travel(st, b.map, now, R.back);
      if (tr === 'Keine Route' || tr === 'Portal nicht erreichbar') return namedNext(R, list, `nicht erreichbar (${tr})`);
      if (tr !== true) return `${label} · ${tr}`;
    }
    if (R.map !== b.map) {
      Object.assign(R, { map: b.map, skip: new Set(), back: false, zoneAt: 0, patrol: 0, logged: new Set() });
      logEvent('map', `Runde: ${label} – prüfe ${b.name}`);
    }
    const curCh = st.world?.channel ?? 1;
    const key = `${b.map}#${curCh}`;
    if (R.chKey !== key) { R.chKey = key; R.chSince = now; R.zoneAt = 0; R.patrol = 0; farm.waitAt = 0; }
    // 2) Kanäle, die noch in Frage kommen: nicht abgehakt, nicht gemieden, kein Respawn in über 2 min
    const cand = chs.filter((ch) => {
      if (R.skip.has(ch) || (farm.chBan.get(`${b.map}#${ch}`) || 0) > now) return false;
      const s = farmState(b, ch, now);
      if (s.state === 'down' && s.readyAt - now > NAMED_WAIT_MS) {
        if (!R.logged.has(ch)) { R.logged.add(ch); logEvent('auto', `${r.name} Ch ${ch}: ${b.name} Respawn in ${fmtClock(s.readyAt - now)} – nicht warten`); }
        return false;
      }
      return true;
    });
    if (!cand.length) return namedNext(R, list, 'erledigt');
    const ch = cand.includes(curCh) ? curCh : cand[0];
    if (ch !== curCh) {
      const sw = farmSwitch(st, sc, b.map, r.name, ch, now);
      if (sw.failed) R.skip.add(ch);
      return `${label} · ${sw.status}`;
    }
    const tag = `${label} Ch ${ch} · ${b.name}`;
    // 3) Sichtbar? -> hin und angreifen
    const boss = sc?.mobs?.find((m) => m.species === b.species && (m.cat !== 'normal' || m.level === b.level) && !m.banned);
    if (boss) {
      if (farm.fight?.id !== boss.id) farm.fight = { key: farmKey(b.map, b.index, ch), id: boss.id, ch, map: b.map, pct: Math.round(boss.hp / (boss.maxHp || boss.hp || 1) * 100) };
      R.zoneAt = 0;
      if (boss.d > cfg.radius) {
        if (walkTo(st, boss.x, boss.y, now) === 'stuck') blacklist.set(boss.id, now + BAN_MS);
        return `${tag} · laufe hin (${Math.round(boss.d)} px)`;
      }
      const scene = worldScene();
      if (scene && bot.can('select', SELECT_GAP_MS, now)) { bot.lastPress.select = now; scene.select(boss.id); }
      return `${tag} · greife an`;
    }
    const s = farmState(b, ch, now);
    // Gerade angekommen und noch kein Timer: kurz auf die Map-Info warten, statt umsonst zur Zone zu laufen
    if (s.state === 'unknown' && now - R.chSince < NAMED_INFO_WAIT_MS) return `${tag} · prüfe Timer…`;
    // 4) Zur Zone des Named Elite
    const zone = world.maps[b.map]?.zones?.[b.at];
    const pts = zone ? [[0.5, 0.5], [0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]].map(([fx, fy]) => ({ x: zone.x + zone.w * fx, y: zone.y + zone.h * fy })) : [farmSpot(b)].filter(Boolean);
    if (!pts.length) { R.skip.add(ch); return `${tag} · Zone unbekannt – Kanal abgehakt`; }
    const me = controlled(st);
    const p = pts[(s.state === 'up' ? R.patrol : 0) % pts.length];
    const d = me ? Math.hypot(me.x - p.x, me.y - p.y) : 0;
    if (d > FARM_NEAR) {
      if (walkTo(st, p.x, p.y, now) === 'stuck') {
        if (s.state === 'up') { R.patrol++; return `${tag} · Punkt nicht erreichbar – nächster`; }
        R.skip.add(ch); logEvent('warn', `${tag}: Zone nicht erreichbar – Kanal abgehakt`);
      }
      return `${tag} · laufe zur Zone (${Math.round(d)} px)`;
    }
    R.zoneAt ||= now;
    if (s.state === 'down') return `${tag} · warte – Respawn in ${fmtClock(s.readyAt - now)}`;
    if (s.state === 'up') {
      if (now - R.zoneAt > NAMED_SEARCH_MS) { R.skip.add(ch); logEvent('warn', `${tag}: lebt laut Timer, aber nicht zu finden – Kanal abgehakt`); return `${tag} · nicht gefunden`; }
      R.patrol++;
      return `${tag} · lebt laut Timer – suche in der Zone…`;
    }
    if (now - R.zoneAt > NAMED_UNKNOWN_MS) { R.skip.add(ch); logEvent('warn', `${tag}: kein Timer, nicht zu sehen – Kanal abgehakt`); }
    return `${tag} · prüfe…`;
  }

  function farmStep(st, sc, now) {
    if (world.state !== 'ready') { loadWorld(); return `Lade Weltkarte… ${world.loaded}/${world.total || '?'}`; }
    if (!farmChannels().length) return 'Keine Kanäle ausgewählt (Reiter Bosse)';
    if (cfg.farmMode === 'named') return namedStep(st, sc, now);
    if (!farmSelected().length) return 'Keine Bosse ausgewählt (Reiter Bosse)';
    const o = farmPlan(st, now);
    if (!o) return 'Kein ausgewählter Boss erreichbar';
    const b = o.b, label = `${b.name} (${b.mapName} Ch ${o.ch})`;
    // 1) Map
    const tr = travel(st, b.map, now);
    if (tr !== true) {
      if (tr === 'Keine Route' || tr === 'Portal nicht erreichbar') { farm.chBan.set(`${b.map}#${o.ch}`, now + TASK_BAN_MS); farm.goal = null; }
      return `${label} · ${tr}`;
    }
    // 2) Kanal (nur außerhalb des Kampfes – das Spiel lehnt den Wechsel sonst ab)
    const sw = farmSwitch(st, sc, b.map, b.mapName, o.ch, now);
    if (!sw.done) {
      if (sw.failed) farm.goal = null;
      return `${label} · ${sw.status}`;
    }
    // 3) Boss sichtbar? -> hin und angreifen (auch außerhalb des Suchradius)
    const boss = sc?.mobs?.find((m) => m.species === b.species && (m.cat !== 'normal' || m.level === b.level) && !m.banned);
    if (boss) {
      if (farm.fight?.id !== boss.id) farm.fight = { key: farmKey(b.map, b.index, o.ch), id: boss.id, ch: o.ch, map: b.map, pct: Math.round(boss.hp / (boss.maxHp || boss.hp || 1) * 100) };
      farm.waitAt = 0;
      if (boss.d > cfg.radius) {
        if (walkTo(st, boss.x, boss.y, now) === 'stuck') blacklist.set(boss.id, now + BAN_MS);
        return `${label} · laufe zum Boss (${Math.round(boss.d)} px)`;
      }
      const scene = worldScene();
      if (scene && bot.can('select', SELECT_GAP_MS, now)) { bot.lastPress.select = now; scene.select(boss.id); }
      return `${label} · greife an`;
    }
    // 4) Zum Spawnpunkt und dort warten
    const spot = farmSpot(b);
    const me = controlled(st);
    const d = spot && me ? Math.hypot(me.x - spot.x, me.y - spot.y) : 0;
    if (spot && d > FARM_NEAR) {
      if (walkTo(st, spot.x, spot.y, now) === 'stuck') {
        farm.chBan.set(`${b.map}#${o.ch}`, now + TASK_BAN_MS);
        logEvent('warn', `${b.name}: Spawnpunkt nicht erreichbar – 5 min übersprungen`);
        farm.goal = null;
      }
      return `${label} · laufe zum Spawnpunkt (${Math.round(d)} px)`;
    }
    const s = o.s;
    // Kein Timer zu bekommen und kein Boss zu sehen: als „gerade nicht da“ werten und in 2 min wieder prüfen
    if (s.state !== 'down') {
      farm.waitAt ||= now;
      if (now - farm.waitAt > 20000) {
        farm.known.set(farmKey(b.map, b.index, o.ch), { up: false, readyAt: now + 120000, at: now });
        logEvent('warn', `${b.name} (Ch ${o.ch}): nicht da, kein Timer – prüfe in 2 min erneut`);
        farm.waitAt = 0; farm.goal = null;
      }
    } else farm.waitAt = 0;
    return s.state === 'down' ? `${label} · warte – Respawn in ${fmtClock(s.readyAt - now)}`
      : s.state === 'up' ? `${label} · laut Timer da – suche…` : `${label} · prüfe Timer…`;
  }

  function pickTarget(sc, resting) {
    if (!sc) return null;
    if (sc.attackers.length) return sc.attackers[0];
    if (resting) return null;
    return sc.mobs.find(usable) || null;
  }

  // Die Spielszene "world" kann ein Ziel direkt setzen (wie ein Mausklick auf das Monster).
  // Tippt der Spieler gerade (Chat o. ä.)? Knöpfe zählen nicht, das Bot-Panel auch nicht.
  function typingInField() {
    const el = document.activeElement;
    if (!el || el.closest?.('.digibot')) return false;
    return el.isContentEditable || el.tagName === 'TEXTAREA' ||
      (el.tagName === 'INPUT' && !['button', 'checkbox', 'radio', 'range', 'submit', 'reset'].includes(el.type));
  }

  function worldScene() {
    try {
      const sc = window.dmo?.game?.scene?.getScene?.('world');
      return typeof sc?.select === 'function' ? sc : null;
    } catch { return null; }
  }

  // Kurzer Hinweiston + Statuszeile, z. B. wenn der Quest-Modus fertig ist
  function notify(text) {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = 880; g.gain.value = 0.08;
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.25);
      o.onended = () => ac.close();
    } catch {}
    console.info('[DigiBot]', text);
  }

  const TICK_MS = 250;
  const POT_COOLDOWN_MS = 2000;  // gleichen Trank höchstens alle 2 s drücken
  const TAB_COOLDOWN_MS = 600;   // Pause zwischen zwei Tab-Drücken
  const ATTACK_REPEAT_MS = 1500; // Taste 1 erneut drücken, solange das Ziel lebt
  const SKILL_GAP_MS = 800;      // Abstand zwischen zwei Skills (bis der Server den Cooldown meldet)
  const SELECT_GAP_MS = 400;     // Pause zwischen zwei direkten Zielwechseln
  const STUCK_MS = 12000;        // Ziel verliert so lange keine HP -> aufgeben
  const BAN_MS = 60000;          // ... und für 1 Minute nicht mehr wählen

  const bot = {
    on: false,
    timer: 0,
    lastPress: {},  // code -> Zeitstempel
    attackedId: null,
    engage: null,   // { id, hp, since } für die Hängen-Erkennung
    resting: false, // HP unter Trank-Schwelle und keine Tränke mehr: keine neuen Kämpfe bis 100 % HP
    mirrorHold: false, // Ziel spiegelt gerade Schaden zurück
    status: 'Bot aus',

    can(code, ms, now) { return now - (this.lastPress[code] || 0) >= ms; },
    hit(code, now) { this.lastPress[code] = now; press(code); },

    toggle() {
      this.on = !this.on;
      clearInterval(this.timer);
      this.attackedId = null;
      this.engage = null;
      this.resting = false;
      autopilot.reset();
      farm.reset();
      if (this.on) autopilot.newRun();
      // Map-für-Map-Runde: bei jedem Start an der eingestellten Start-Map beginnen (nicht beim gespeicherten Fortschritt,
      // sonst fehlt z. B. eine Map, die beim letzten Lauf noch nichts zu tun hatte, inzwischen aber schon)
      if (this.on && cfg.apOrder === 'sweep' && cfg.apSweepMap) { cfg.apSweepMap = ''; saveCfg(); }
      if (this.on) loadWorld(); // Kartendaten (Portale, Zonen, Schutzzonen) für alle Modi
      if (this.on) this.timer = setInterval(() => this.tick(), TICK_MS);
      this.status = this.on ? 'Bot läuft' : 'Bot aus';
      logEvent('bot', this.on ? `Bot gestartet${cfg.farm ? ' (Boss-Rotation)' : cfg.autopilot ? ' (Quest-Autopilot)' : cfg.questMode ? ' (Quest-Modus)' : ''}` : 'Bot gestoppt');
      schedule();
    },

    tick() {
      const st = getStore()?.getState?.();
      const now = Date.now();
      const me = st?.me, p = me?.partner, t = st?.target;
      if (!p || st.screen !== 'world') { this.status = 'Warte auf Spielwelt…'; return; }
      // Das Spiel meldet „ui“-Fokus schon, wenn nur ein Dialog-Knopf fokussiert ist. Pausiert wird nur beim Tippen
      // (Chat); sonst bekommt das Spiel den Fokus zurück, damit Tasten wieder ankommen.
      if (st.inputFocus && st.inputFocus !== 'game') {
        if (typingInField()) { this.status = 'Pausiert (Chat/Eingabe offen)'; return; }
        if (!st.dialog && !st.dailies?.board) {
          document.activeElement?.blur?.();
          try { st.set?.({ inputFocus: 'game' }); } catch { /* ignore */ }
        }
      }
      if (p.fainted) {
        if (this.status !== 'Digimon ist bewusstlos') logEvent('warn', 'Digimon ist bewusstlos – Bot pausiert');
        this.status = 'Digimon ist bewusstlos';
        return;
      }

      // 1) Tränke
      const potion = (fKey, below) => {
        if (below && potionCount(me, fKey) > 0 && this.can('F' + fKey, POT_COOLDOWN_MS, now)) {
          this.hit('F' + fKey, now);
          logEvent('potion', `F${fKey}: ${content()?.items?.[me.hotbar[7 + fKey].slice(5)]?.name || 'Trank'} benutzt`);
        }
      };
      potion(1, cfg.hpPot > 0 && pct(p.hp, p.maxHp) < cfg.hpPot);
      potion(2, cfg.dsPot > 0 && pct(p.ds, p.maxDs) < cfg.dsPot);
      potion(3, cfg.tdsPot > 0 && me.tamerMaxDs > 0 && pct(me.tamerDs, me.tamerMaxDs) < cfg.tdsPot);

      // 1b) Flächenangriffen ausweichen hat Vorrang vor allem anderen
      const dg = dodge(st, now);
      if (dg) { this.status = dg; this.attackedId = null; return; }

      // 2) Ruhemodus: HP unter Schwelle und kein HP-Trank mehr -> keine neuen Kämpfe, bis HP wieder 100 %
      const hpPct = pct(p.hp, p.maxHp);
      const sc = scan(st);
      const attackers = sc ? sc.attackers.map((m) => m.id) : [];
      if (cfg.farm && world.state === 'ready') farmUpdate(st, now);
      checkRefusals(st, t, now);
      // Autopilot auf dem Weg zur Abgabe (bzw. in der Abgabe-Phase der Runde): keine Kämpfe, auch nicht gegen Angreifer –
      // Digimon zurückrufen und weiterlaufen
      const noFight = cfg.autopilot && !cfg.farm && nextIsTurnin(st, now);
      if (noFight) {
        const pe = window.dmo?.net?.state?.entities?.get?.(p.entityId);
        if ((pe?.targetId || this.attackedId) && this.can('follow', 1500, now)) {
          this.lastPress.follow = now;
          commands()?.partnerFollow?.();
        }
      }
      if (!this.resting && cfg.hpPot > 0 && hpPct < cfg.hpPot && !potionCount(me, 1)) {
        this.resting = true;
        logEvent('warn', `Ruhemodus: HP ${hpPct.toFixed(0)} % und kein Trank auf F1`);
      }
      if (this.resting && hpPct >= 100 && !attackers.length) this.resting = false;

      // 3) Ziel prüfen
      const diff = t ? t.level - p.level : 0;
      const alive = t && t.kind === 'mob' && t.hp > 0;
      const isAttacker = alive && attackers.includes(t.id);
      const fighting = alive && this.attackedId === t.id; // laufender Kampf
      const info = alive && sc ? sc.mobs.find((m) => m.id === t.id) : null;
      // Gesperrt, von anderen belegt oder in der Liste abgewählt -> nicht (neu) angreifen; laufenden Kampf aber beenden
      const blocked = !!info && (info.banned || (!fighting && (info.taken || !info.enabled)));
      // Angreifer werden immer bekämpft (auch außerhalb der Level-Range).
      // Im Ruhemodus nur den laufenden Kampf beenden, sonst passende Ziele suchen.
      // Level-Prüfung wie bei der Zielwahl (scan): im Quest-Modus/Autopilot sind schwächere Monster erlaubt.
      // Sonst wählt der Bot ein Ziel aus und verwirft es gleich wieder – endlos.
      const lvlOk = info ? info.inLvl : diff <= cfg.lvlDiff;
      const valid = !noFight && (isAttacker || (!blocked && (this.resting ? fighting : alive && lvlOk)));
      if (!valid) {
        this.attackedId = null;
        this.engage = null;
        const scene = worldScene();
        if (scene && sc) {
          // Autopilot: vor dem Jagen erst in die gewünschte Form digitieren
          const at = autopilot.task;
          if (!cfg.farm && cfg.autopilot && !attackers.length && at?.kind === 'hunt' && st.world?.mapId === at.loc.mapId
            && (!cfg.apQuestPartner || activePartner(st)?.partnerId === cfg.apQuestPartner)) {
            const ev = ensureEvolution(st, cfg.apEvo, now);
            if (ev !== true) { this.status = `Autopilot: ${ev}`; return; }
          }
          // Direkt das beste Ziel anvisieren
          const next = noFight ? null : pickTarget(sc, this.resting);
          if (next) {
            if (this.can('select', SELECT_GAP_MS, now)) { this.lastPress.select = now; scene.select(next.id); }
            this.status = `${next.attacker ? 'Angreifer' : 'Nächstes Ziel'}: Lv ${next.level} · ${Math.round(next.d)} px`;
          } else if (cfg.farm && !this.resting) {
            this.status = `Bosse: ${farmStep(st, sc, now)}`;
          } else if (cfg.autopilot && (!this.resting || noFight)) {
            const s = autopilotStep(st, sc, now);
            if (s === null) {
              this.toggle();
              this.status = 'Autopilot: keine machbaren Quests mehr – Bot gestoppt';
              logEvent('auto', 'Keine machbaren Quests mehr – Bot gestoppt');
              notify('Autopilot fertig.');
            } else this.status = `Autopilot: ${noFight && attackers.length ? 'ignoriere Kämpfe · ' : ''}${s}`;
          } else if (!cfg.autopilot && sc.quest && !sc.quest.open.length && !attackers.length) {
            // Quest-Modus: alle jagbaren Ziele auf dieser Map erledigt -> fertig
            this.toggle();
            this.status = 'Quest-Ziele auf dieser Map erledigt – Bot gestoppt';
            logEvent('bot', 'Quest-Ziele auf dieser Map erledigt – Bot gestoppt');
            notify('Quest-Ziele auf dieser Map erledigt.');
          } else {
            const names = sc.quest ? [...sc.quest.species].map((sp) => content()?.digimon?.[sp]?.name || sp).join(', ') : '';
            this.status = this.resting
              ? `Ruhe: keine HP-Tränke – warte auf 100 % HP (${hpPct.toFixed(0)} %)`
              : sc.quest ? `Warte auf Quest-Monster: ${names}`
              : `Kein passendes Monster im Radius (${cfg.radius} px) – warte…`;
          }
          return;
        }
        // Fallback, falls die Spielszene nicht erreichbar ist: per Tab durchschalten
        if (this.resting && !attackers.length) {
          this.status = `Ruhe: keine HP-Tränke – warte auf 100 % HP (${hpPct.toFixed(0)} %)`;
          return;
        }
        this.status = attackers.length ? `Werde angegriffen (${attackers.length}) – suche Angreifer…`
          : !t ? 'Suche Ziel (Tab)…'
          : t.kind !== 'mob' ? 'Kein Monster – suche weiter…'
          : t.hp <= 0 ? 'Ziel besiegt – suche weiter…'
          : blocked ? 'Ziel gesperrt/belegt – suche weiter…'
          : `${t.name} Lv ${t.level} (${diff > 0 ? '+' : ''}${diff}) zu stark – suche weiter…`;
        if (this.can('Tab', TAB_COOLDOWN_MS, now)) this.hit('Tab', now);
        return;
      }

      // 3b) Spiegel/Reflexion: nicht angreifen, Digimon zurückrufen, danach neu angreifen
      if (mirrorActive(t.id)) {
        if (!this.mirrorHold) {
          this.mirrorHold = true;
          logEvent('warn', `${t.name} spiegelt Schaden – Angriff pausiert`);
          commands()?.partnerFollow?.();
        }
        this.attackedId = null; this.engage = null;
        this.status = `Spiegel/Reflexion: ${t.name} – warte mit dem Angriff…`;
        return;
      }
      if (this.mirrorHold) { this.mirrorHold = false; logEvent('auto', 'Spiegel vorbei – greife wieder an'); }

      // 4) Hängen-Erkennung: verliert das Ziel lange keine HP (unerreichbar?), aufgeben und 1 min sperren.
      //    Angreifer sind ausgenommen – die kommen ja zu uns.
      if (!this.engage || this.engage.id !== t.id || t.hp < this.engage.hp) {
        this.engage = { id: t.id, hp: t.hp, since: now };
      } else if (!isAttacker && now - this.engage.since > STUCK_MS) {
        blacklist.set(t.id, now + BAN_MS);
        logEvent('warn', `${t.name} Lv ${t.level} unerreichbar – 1 min gesperrt`);
        this.engage = null;
        this.attackedId = null;
        this.status = `${t.name} unerreichbar – für 1 min gesperrt`;
        return;
      }

      // 4b) Schutzzone: erst heraus, sonst lehnt das Spiel den Angriff ab
      const ents = window.dmo?.net?.state?.entities;
      if (now - refusal.rangeAt < 2500) {
        const te = ents?.get?.(t.id), me2 = controlled(st);
        if (te && me2 && now - refusal.lastTap > 700) {
          refusal.lastTap = now;
          worldScene()?.tapGround?.(me2.x + (te.x - me2.x) * 0.6, me2.y + (te.y - me2.y) * 0.6);
        }
        this.status = `Zu weit weg – gehe näher an ${t.name} heran…`;
      }
      const sz = leaveSafeZone(st, ents?.get?.(t.id), now);
      if (sz) { this.engage = null; this.attackedId = null; this.status = sz; return; }

      // 5) Angreifen
      if (this.attackedId !== t.id || this.can('Digit1', ATTACK_REPEAT_MS, now)) {
        this.attackedId = t.id;
        this.hit('Digit1', now);
      }
      this.status = `${this.resting ? 'Ruhe – beende Kampf' : isAttacker ? 'Wehre ab' : 'Greife an'}: ` +
        `${t.name} Lv ${t.level} (${diff > 0 ? '+' : ''}${diff})`;

      // 6) Skills auf 2–6: den ersten aktivierten, bereiten Skill wirken (einer pro Durchgang)
      if (p.evolving || !this.can('skill', SKILL_GAP_MS, now)) return;
      if (farmShielded(t, now)) { this.status += ' · Spawn-Schutz – Skills warten'; return; }
      let held = null;
      for (const k of SKILL_KEYS) {
        if (!cfg.skills[k]) continue;
        const s = skillOnKey(st, k);
        if (!s || s.cdLeft > 0 || s.skill.unlocked === false || p.ds < (s.skill.dsCost || 0)) continue;
        if (!this.can('Digit' + k, SKILL_GAP_MS * 2, now)) continue; // Server-Cooldown noch nicht angekommen
        const why = skillUnsafe(st, t, s.skill, now, Number(String(s.ref).slice(6))); // zu langer Cast vor einer möglichen Boss-Attacke -> nächster Skill
        if (why) { held ||= `${s.skill.name} zurückgehalten: ${why}`; continue; }
        this.lastPress.skill = now;
        this.hit('Digit' + k, now);
        this.status += ` · Skill ${k}: ${s.skill.name}`;
        held = null;
        break;
      }
      if (held) this.status += ` · ${held}`;
    },
  };

  // ---------- Radar ----------
  const TAB_RANGE = 160; // so weit sucht die Tab-Taste des Spiels
  function mobColor(m) {
    if (m.attacker) return '#ff4d4d';
    if (m.taken) return '#ffa94d';
    if (m.banned || !m.inLvl || !m.enabled) return '#7c8496';
    return '#2ecc71';
  }

  function drawRadar(cv, sc, targetId) {
    const g = cv.getContext('2d');
    if (!g) return;
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
    g.clearRect(0, 0, W, H);
    if (!sc) {
      g.fillStyle = '#7c8496'; g.font = '22px system-ui'; g.textAlign = 'center';
      g.fillText('keine Daten – warte auf Spielwelt', cx, cy + 8);
      return;
    }
    const k = (Math.min(W, H) / 2 - 10) / (cfg.radius * 1.15); // Pixel auf dem Radar pro Spiel-Pixel
    const ring = (r, color, dash) => {
      g.beginPath(); g.setLineDash(dash); g.strokeStyle = color; g.lineWidth = 2;
      g.arc(cx, cy, r * k, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    };
    ring(cfg.radius, 'rgba(63,160,255,.55)', [8, 6]); // Suchradius
    ring(TAB_RANGE, 'rgba(255,255,255,.12)', [3, 5]);  // Tab-Reichweite

    for (let i = sc.mobs.length - 1; i >= 0; i--) { // nächste zuletzt -> oben
      const m = sc.mobs[i];
      const x = cx + (m.x - sc.self.x) * k, y = cy + (m.y - sc.self.y) * k;
      if (x < -6 || y < -6 || x > W + 6 || y > H + 6) continue;
      const r = m.cat === 'boss' ? 12 : 8;
      g.globalAlpha = m.d <= cfg.radius || m.attacker ? 1 : 0.4;
      g.fillStyle = mobColor(m);
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      if (m.cat !== 'normal') { // Elite/Boss: farbiger Rand
        g.strokeStyle = CAT[m.cat].color; g.lineWidth = 3;
        g.beginPath(); g.arc(x, y, r + 1, 0, Math.PI * 2); g.stroke();
      }
      if (m.banned) {
        g.strokeStyle = '#ff4d4d'; g.lineWidth = 2; g.beginPath();
        g.moveTo(x - r, y - r); g.lineTo(x + r, y + r); g.moveTo(x + r, y - r); g.lineTo(x - r, y + r); g.stroke();
      }
      g.globalAlpha = 1;
      if (m.id === targetId) {
        g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r + 5, 0, Math.PI * 2); g.stroke();
      }
    }
    if (sc.tamer) {
      const x = cx + (sc.tamer.x - sc.self.x) * k, y = cy + (sc.tamer.y - sc.self.y) * k;
      g.fillStyle = '#a5d8ff'; g.fillRect(x - 4, y - 4, 8, 8);
    }
    g.fillStyle = '#4dabf7'; g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.arc(cx, cy, 9, 0, Math.PI * 2); g.fill(); g.stroke();
  }

  // ---------- Panel ----------
  let panel, getStore;

  function render() {
    if (!panel) return;
    const st = getStore()?.getState?.();
    const me = st?.me;
    const p = me?.partner;
    const t = st?.target;

    panel.querySelector('[data-f="partner"]').textContent =
      p ? `Digimon · ${p.name ?? p.species ?? ''}${p.level ? ' · Lv ' + p.level : ''}` : 'Digimon';
    setBar(panel, 'hp', p?.hp, p?.maxHp, 25);
    setBar(panel, 'ds', p?.ds, p?.maxDs);
    setBar(panel, 'exp', p?.exp, p?.expNext);

    const now = Date.now();
    exp.update(p, now);
    const rate = exp.perMinute(now);
    panel.querySelector('[data-f="rate"]').textContent = rate > 0 ? fmt(rate) : '–';
    bitsRate.update(me?.bits, now);
    const brate = bitsRate.perMinute(now);
    panel.querySelector('[data-f="bitrate"]').textContent = brate > 0 ? fmt(brate) : '–';
    // Tooltip: Hochrechnung pro Stunde (aus dem gleitenden 5-Minuten-Schnitt) und Sitzungswerte
    const tip = (k, text) => panel.querySelectorAll(`[data-tip="${k}"]`).forEach((el) => { if (el.title !== text) el.title = text; });
    const sessMin = exp.last ? (now - exp.start) / 60000 : 0;
    tip('rate', rate > 0
      ? `EXP pro Stunde: ≈ ${fmt(rate * 60)}\nEXP in 10 min: ≈ ${fmt(rate * 10)}\nEXP pro Minute: ${fmt(rate)} (Schnitt der letzten 5 min)\n`
        + `Diese Sitzung: ${fmt(exp.total)} EXP in ${fmtDur(now - exp.start)}${sessMin >= 1 ? ` (Ø ${fmt(exp.total / sessMin * 60)} / Std.)` : ''}`
        + (p ? `\nBis Level-Up: ${fmt(p.expNext - p.exp)} EXP · ${fmtDur(((p.expNext - p.exp) / rate) * 60000)}` : '')
      : 'Noch keine EXP-Messung – erscheint nach den ersten Kills.');
    const bMin = bitsRate.last !== null ? (now - bitsRate.start) / 60000 : 0;
    tip('bitrate', brate > 0
      ? `Bits pro Stunde: ≈ ${fmt(brate * 60)}\nBits in 10 min: ≈ ${fmt(brate * 10)}\nBits pro Minute: ${fmt(brate)} (Schnitt der letzten 5 min)\n`
        + `Diese Sitzung: ${fmt(bitsRate.total)} Bits in ${fmtDur(now - bitsRate.start)}${bMin >= 1 ? ` (Ø ${fmt(bitsRate.total / bMin * 60)} / Std.)` : ''}`
      : 'Noch keine Bits-Messung – erscheint nach den ersten Einnahmen.');
    panel.querySelector('[data-f="eta"]').textContent =
      rate > 0 && p ? fmtDur(((p.expNext - p.exp) / rate) * 60000) : '–';
    panel.querySelector('[data-f="sess"]').textContent =
      exp.last ? `${fmt(exp.total)} (${fmtDur(now - exp.start)})` : '–';

    setBar(panel, 'tds', me?.tamerDs, me?.tamerMaxDs);

    const tt = panel.querySelector('[data-f="target"]');
    if (t) {
      tt.classList.remove('digibot__none');
      tt.textContent = `Ziel · ${t.name ?? '?'}${t.level ? ' · Lv ' + t.level : ''}${t.boss ? ' · BOSS' : ''}`;
    } else {
      tt.classList.add('digibot__none');
      tt.textContent = 'Kein Ziel – mit Tab anvisieren';
    }
    setBar(panel, 'tg', t?.hp, t?.maxHp);

    const sc = scan(st);
    drawRadar(panel.querySelector('.digibot__radar'), sc, t?.id);
    panel.querySelector('[data-f="radar"]').textContent = sc
      ? `Radar · ${sc.mobs.length} Monster · ${sc.mobs.filter(usable).length} passend im Radius`
      : 'Radar';
    renderMobList(st, sc);
    renderQuests(st, sc);
    renderFarm(st);
    watchGame(st);
    renderLog();

    const run = panel.querySelector('[data-act="bot"]');
    run.classList.toggle('on', bot.on);
    const mode = modeOf();
    run.textContent = `${bot.on ? '■ Stopp' : '▶ Start'} · ${mode === 'farm' ? (cfg.farmMode === 'named' ? 'Named-Elite-Runde' : 'Boss-Rotation') : MODES[mode]}`;
    panel.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    const stEl = panel.querySelector('[data-f="status"]');
    stEl.textContent = bot.status;
    if (stEl.title !== bot.status) stEl.title = bot.status;
    setBar(panel, 'mhp', p?.hp, p?.maxHp, 25);
    setBar(panel, 'mds', p?.ds, p?.maxDs);
    setBar(panel, 'mtg', t?.hp, t?.maxHp);

    for (const f of [1, 2, 3]) {
      const n = potionCount(me, f);
      const el = panel.querySelector(`[data-cnt="${f}"]`);
      el.textContent = n == null ? '· kein Item' : `· ${n} Stk`;
      el.classList.toggle('empty', !n);
    }

    for (const k of SKILL_KEYS) {
      const row = panel.querySelector(`[data-skill="${k}"]`);
      const s = skillOnKey(st, k);
      row.classList.toggle('off', !s);
      row.querySelector('span').textContent = s ? s.skill.name : 'kein Skill';
      row.querySelector('em').textContent =
        !s ? '' : s.skill.unlocked === false ? 'gesperrt' : s.cdLeft > 0 ? `${(s.cdLeft / 1000).toFixed(1)} s` : 'bereit';
    }
  }

  // Monsterliste im Reiter "Attacken". Wird nur neu aufgebaut, wenn sich Map, Arten oder Level-Bezug ändern,
  // sonst werden nur Anzahl/Markierungen aktualisiert (damit Klicks auf die Checkboxen nicht verloren gehen).
  let mobListSig = '';
  function renderMobList(st, sc) {
    const box = panel.querySelector('[data-f="mobs"]');
    if (!panel.querySelector('[data-page="attack"]').classList.contains('on')) return;
    const mapId = st?.world?.mapId;
    const pLvl = st?.me?.partner?.level ?? 0;
    const rows = mapMonsters(st, sc);
    panel.querySelector('[data-f="mapname"]').textContent =
      `Monster · ${st?.world?.mapName || worldScene()?.deps?.content?.maps?.[mapId]?.name || mapId || '?'}` +
      (cfg.questMode ? ' (Quest-Modus aktiv)' : '');
    const lvTxt = (r) => (!isFinite(r.lo) ? 'Lv ?' : r.lo === r.hi ? `Lv ${r.lo}` : `Lv ${r.lo}–${r.hi}`);
    const out = (r) => isFinite(r.lo) && r.lo > pLvl + cfg.lvlDiff;
    const sig = `${mapId}|${pLvl}|${cfg.lvlDiff}|${rows.map((r) => `${r.key}:${r.lo}-${r.hi}`).join(',')}`;
    if (sig !== mobListSig) {
      mobListSig = sig;
      box.innerHTML = rows.length ? rows.map((r) => {
        const on = mobOn(mapId, r.key, r.cat);
        const sub = r.cat === 'boss'
          ? `${r.title ? r.title + ' · ' : ''}${r.respawnMs ? 'Respawn ' + Math.round(r.respawnMs / 60000) + ' min' : ''}`
          : out(r) ? `zu stark (über +${cfg.lvlDiff})` : '';
        return `
          <label class="digibot__mob${on ? '' : ' off'}${out(r) ? ' out' : ''}" data-row="${r.key}" style="--c:${CAT[r.cat].color}">
            <input type="checkbox" data-mob="${r.key}" ${on ? 'checked' : ''}>
            <span class="tag">${CAT[r.cat].label}</span>
            <span class="name">${r.name} <i class="agg"></i>${sub ? `<span class="sub">${sub}</span>` : ''}</span>
            <span class="lv">${lvTxt(r)} · <b class="cnt"></b></span>
          </label>`;
      }).join('') : '<div class="digibot__none">Keine Monster auf dieser Map.</div>';
    }
    for (const r of rows) {
      const row = box.querySelector(`[data-row="${CSS_ESC(r.key)}"]`);
      if (!row) continue;
      row.querySelector('.cnt').textContent = r.count ? `${r.count} da` : '–';
      row.querySelector('.agg').textContent = r.aggressive ? '⚔' : '';
    }
  }
  // Reiter "Log": Protokoll (neueste oben), nur neu aufbauen wenn sich etwas geändert hat
  let logShown = -1;
  const hhmmss = (d) => d.toLocaleTimeString('de-DE');
  function renderLog() {
    if (!panel.querySelector('[data-page="log"]').classList.contains('on') || logShown === logSig) return;
    logShown = logSig;
    const esc = (x) => String(x).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    panel.querySelector('[data-f="logcount"]').textContent = `· ${logbook.length}`;
    panel.querySelector('[data-f="log"]').innerHTML = logbook.length
      ? logbook.slice().reverse().map((e) => `<div style="--c:${LOG_COLORS[e.type] || '#888'}"><time>${hhmmss(e.t)}</time>` +
        `<span>${esc(e.text)}${e.n > 1 ? ` <b>×${e.n}</b>` : ''}</span></div>`).join('')
      : '<div class="digibot__none">Noch keine Einträge.</div>';
  }

  async function copyLog(btn) {
    const text = logbook.map((e) => `${hhmmss(e.t)} [${e.type}] ${e.text}${e.n > 1 ? ` ×${e.n}` : ''}`).join('\n') || '(leer)';
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch {
      const ta = panel.ownerDocument.createElement('textarea');
      ta.value = text; panel.append(ta); ta.select();
      try { ok = panel.ownerDocument.execCommand('copy'); } catch {}
      ta.remove();
    }
    btn.textContent = ok ? 'Kopiert ✓' : 'Fehler';
    setTimeout(() => { btn.textContent = 'Kopieren'; }, 1500);
  }

  // Autopilot-Einstellungen: Auswahllisten für Start-Map, Team und Digitation füllen
  const selSig = {};
  function fillSelect(key, options) {
    const el = panel.querySelector(`[data-apsel="${key}"]`);
    if (!el) return;
    const val = cfg[key] ?? '';
    if (val && !options.some((o) => o[0] === val)) {
      options.push([val, key === 'apEvo' ? `${speciesName(val)} (wird beim Quest-Digimon angewendet)`
        : key === 'apStartMap' ? (content()?.maps?.[val]?.name || val) : '(gespeichert, gerade nicht im Team)']);
    }
    const sig = JSON.stringify(options) + '|' + val;
    if (selSig[key] === sig || panel.ownerDocument.activeElement === el) return;
    selSig[key] = sig;
    const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    el.innerHTML = options.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('');
    el.value = val;
  }
  function renderApConfig(st) {
    const order = panel.querySelector('[data-apsel="apOrder"]');
    if (order && panel.ownerDocument.activeElement !== order) order.value = cfg.apOrder;
    panel.querySelector('[data-sweeponly]')?.classList.toggle('hide', cfg.apOrder !== 'sweep');
    const team = teamOf(st);
    const teamOpts = team.map((p) => [p.partnerId, partnerLabel(p) + (p.active ? ' (aktiv)' : '')]);
    fillSelect('apQuestPartner', [['', 'aktuelles behalten'], ...teamOpts]);
    fillSelect('apTurninPartner', [['', 'wie Quest-Digimon'], ...teamOpts]);
    const act = activePartner(st);
    const evoFor = !cfg.apQuestPartner || act?.partnerId === cfg.apQuestPartner;
    const evos = evoFor ? (st?.me?.partner?.evolutions || []).filter((e) => !e.isCurrent || e.species !== st.me.partner.species) : [];
    fillSelect('apEvo', [['', 'keine Digitation'], ...evos.map((e) => [e.species,
      `${speciesName(e.species)} (${e.stage}, ab Lv ${e.level}${e.unlocked === false ? ', gesperrt' : ''})`])]);
    fillSelect('apStartMap', world.state === 'ready'
      ? [['', 'höchste erreichbare'], ...sweepList().map((m) => [m.id,
        `${m.name} (${m.levelRange?.join('–')})${hops(st?.world?.mapId, m.id) === Infinity ? ' – nicht erreichbar' : ''}`])]
      : [['', 'Weltkarte lädt…']]);
  }

  // Reiter "Quests": aktive Quests mit Zielen und Fortschritt
  let questSig = '';
  function renderBossSkills(st) {
    const box = panel.querySelector('[data-f="bskills"]');
    const boss = currentBoss(st);
    if (!boss) { box.innerHTML = '<div class="digibot__none">Kein Boss im Kampf – Attacken erscheinen hier, sobald du einen Boss anvisierst.</div>'; return; }
    const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const now = Date.now();
    const rows = bossSkillRows(boss, now);
    const hp = boss.maxHp ? ` · ${Math.round(boss.hp / boss.maxHp * 100)} %` : '';
    const head = `<b class="head">Attacken · ${esc(speciesName(boss.species))}${boss.level ? ' Lv ' + boss.level : ''}${hp}</b>`;
    box.innerHTML = head + (rows.length ? rows.map((r) => {
      const st = r.state === 'cast' ? `wirkt! ${fmtSec(r.left)}` : r.state === 'cd' ? fmtSec(r.left) : r.state === 'ready' ? 'bereit' : 'noch nicht gesehen';
      const extra = [r.castMs ? `Ansage ${fmtSec(r.castMs)}` : 'ohne Ansage', `CD ${fmtSec(r.cooldownMs)}`];
      if (r.sk.reflect) extra.push(`spiegelt ${r.sk.reflect.pct} % für ${fmtSec(r.sk.reflect.durationMs || 0)}`);
      if (r.sk.radius && r.sk.shape !== 'single') extra.push(`Radius ${r.sk.radius}`);
      return `<div class="digibot__bskill" title="${esc(r.sk.description || '')}"><span class="n"><span class="shape">${esc(r.shape)}</span>${esc(r.name)}</span>`
        + `<span class="st ${r.state}">${st}</span><span class="sub">${extra.join(' · ')}</span></div>`;
    }).join('') : '<div class="digibot__none">Keine Attacken in den Spieldaten.</div>');
  }

  let farmPickSig = '';
  function renderFarm(st) {
    hookBossEvents();
    if (!panel.querySelector('[data-page="farm"]').classList.contains('on')) return;
    renderBossSkills(st);
    const mode = cfg.farmMode === 'named' ? 'named' : 'boss';
    panel.querySelectorAll('[data-farmmode]').forEach((el) => el.classList.toggle('hide', el.dataset.farmmode !== mode));
    fillSelect('farmMode', [['boss', 'Boss-Rotation (ausgewählte Bosse)'], ['named', 'Named-Elite-Runde (Map für Map)']]);
    const rm = routeMaps().map((r) => [r.id, `${r.name} (${r.range.join('–')}) · ${r.boss.name}`]);
    fillSelect('routeStart', [['', 'niedrigste'], ...rm]);
    fillSelect('routeEnd', [['', 'höchste'], ...rm]);
    if (mode === 'named') {
      const list = routeList(), R = farm.route;
      panel.querySelector('[data-f="routeinfo"]').textContent = !list.length ? 'Keine Maps mit Named Elite gewählt.'
        : `Runde: ${list.length} Maps · ${list[0].name} → ${list[list.length - 1].name}`
          + (bot.on && cfg.farm && R ? ` · jetzt ${R.i + 1}/${list.length} ${list[R.i]?.name || ''}${R.back ? ' (zurück per Digi-Phone)' : ''}` : '');
    }
    const all = farmBossList();
    const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const sig = all.map((b) => b.id).join(',') + '|' + (cfg.farmBosses || []).join(',');
    if (sig !== farmPickSig) {
      farmPickSig = sig;
      const on = new Set(cfg.farmBosses || []);
      panel.querySelector('[data-f="bosspick"]').innerHTML = all.length ? all.map((b) => `
        <label><input type="checkbox" data-farmboss="${esc(b.id)}" ${on.has(b.id) ? 'checked' : ''}>
          <span title="${esc(b.mapName)}">${esc(b.name)} · ${esc(b.mapName)}</span><em>Lv ${b.level} · ${Math.round(b.respawnMs / 60000)} min</em></label>`).join('')
        : '<div class="digibot__none">warte auf Spielwelt…</div>';
    }
    const now = Date.now(), sel = farmSelected(), chs = farmChannels();
    const curMap = st?.world?.mapId, curCh = st?.world?.channel ?? 1;
    panel.querySelector('[data-f="timers"]').innerHTML = sel.length ? sel.map((b) => {
      const goal = cfg.farm && bot.on && (cfg.farmMode === 'named'
        ? farm.route?.map === b.map
        : farm.goal && farm.goal.map === b.map && farm.goal.index === b.index);
      const rows = chs.map((ch) => {
        const s = farmState(b, ch, now);
        const banUntil = farm.chBan.get(`${b.map}#${ch}`) || 0, banned = banUntil > now;
        const txt = banned ? `gemieden (noch ${fmtClock(banUntil - now)})` : s.state === 'up' ? `lebt${s.hp != null ? ` (${s.hp} %)` : ''}`
          : s.state === 'down' ? (s.readyAt > now ? `Respawn in ${fmtClock(s.readyAt - now)}` : 'müsste gleich da sein') : 'unbekannt';
        const mark = (goal && (cfg.farmMode === 'named' ? curMap === b.map && curCh === ch : farm.goal?.ch === ch) ? ' ★' : '') + (curMap === b.map && curCh === ch ? ' · hier' : '');
        return `<div><span>Ch ${ch}</span><span class="${s.state === 'up' ? 'up' : s.state === 'down' ? 'down' : 'unk'}">${txt}${mark}</span></div>`;
      }).join('');
      return `<div class="digibot__timer${goal ? ' goal' : ''}"><b>${esc(b.name)} Lv ${b.level} · ${esc(b.mapName)}</b>${rows}</div>`;
    }).join('') : '<div class="digibot__none">Keine Bosse ausgewählt.</div>';
  }

  function renderQuests(st, sc) {
    if (!panel.querySelector('[data-page="quest"]').classList.contains('on')) return;
    renderApConfig(st);
    const ap = panel.querySelector('[data-f="apinfo"]');
    ap.classList.toggle('on', cfg.autopilot);
    if (cfg.autopilot) {
      const t = autopilot.task;
      ap.textContent = world.state !== 'ready' ? `Weltkarte: ${world.loaded}/${world.total || '?'} Maps geladen…`
        : t ? `${autopilot.sweepAt ? `Runde: ${content()?.maps?.[autopilot.sweepAt]?.name} · ` : ''}Aufgabe: ${t.label}` : bot.on ? 'Plane nächste Aufgabe…' : `Bereit – Weltkarte mit ${Object.keys(world.maps).length} Maps geladen. Bot starten.`;
    }
    const list = questList(st, sc);
    const qt = cfg.questMode ? sc?.quest : questTargets(st, sc);
    const sum = panel.querySelector('[data-f="qsum"]');
    sum.textContent = !qt || (!cfg.questMode && !cfg.autopilot) ? '' : qt.open.length
      ? `Hier offen: ${qt.open.map((o) => `${o.label.replace(/^(Besiege|Sammle) /, '')} ${o.cur}/${o.need}`).join(' · ')}`
      : 'Auf dieser Map ist für die Quest-Jagd nichts mehr zu jagen.';
    const sig = JSON.stringify(list.map((q) => [q.id, q.state, q.on, q.objectives.map((o) => [o.cur, o.here])])) + st?.world?.mapId;
    if (sig === questSig) return;
    questSig = sig;
    const box = panel.querySelector('[data-f="quests"]');
    if (!list.length) { box.innerHTML = '<div class="digibot__none">Keine aktiven Quests.</div>'; return; }
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    box.innerHTML = list.map((q) => {
      const color = q.state === 2 ? '#ffd43b' : q.daily ? '#4dabf7' : '#2ecc71';
      const badge = q.state === 2 ? 'abgeben' : q.daily ? 'daily' : isStory(q.id) ? 'aktiv' : 'täglich';
      const objs = q.objectives.map((o) => {
        const where = o.done ? '' : !o.huntable ? 'nicht automatisch'
          : o.here ? '✓ auf dieser Map' : o.where.length ? `→ ${o.where.slice(0, 3).join(', ')}` : 'Fundort unbekannt';
        return `<div class="digibot__obj${o.done ? ' done' : ''}">
          <span class="t">${esc(o.label)}</span><span class="n">${o.cur}/${o.need}</span>
          <span class="pb"><i style="width:${(o.cur / o.need) * 100}%"></i></span>
          ${where ? `<span class="w${o.here && o.huntable ? ' here' : ''}">${esc(where)}</span>` : ''}
        </div>`;
      }).join('');
      return `<div class="digibot__quest${q.on ? '' : ' off'}" style="--c:${color}">
        <header><input type="checkbox" data-quest="${esc(q.id)}" ${q.on ? 'checked' : ''}>
          <span title="${esc(q.name)}">${esc(q.name)}</span><b class="badge">${badge}</b></header>
        ${objs}
        ${q.state === 2 && q.turnIn ? `<div class="turnin">Abgeben bei ${esc(q.turnIn)}</div>` : ''}
      </div>`;
    }).join('');
  }

  const CSS_ESC = (s) => (window.CSS?.escape ? window.CSS.escape(s) : s.replace(/["\\]/g, '\\$&'));

  function setTab(tab) {
    cfg.tab = tab; saveCfg();
    panel.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    panel.querySelectorAll('[data-page]').forEach((p) => p.classList.toggle('on', p.dataset.page === tab));
    mobListSig = '';
    questSig = '';
    logShown = -1;
    schedule();
  }

  function setAllMobs(on) {
    const st = getStore()?.getState?.();
    const mapId = st?.world?.mapId;
    if (!mapId) return;
    cfg.mobs[mapId] = Object.fromEntries(mapMonsters(st, scan(st)).map((r) => [r.key, on]));
    saveCfg(); mobListSig = ''; schedule();
  }

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; render(); });
  };

  function makeDraggable(el, handle) {
    let sx, sy, ox, oy;
    handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button') || el.ownerDocument !== document) return;
      sx = e.clientX; sy = e.clientY;
      const r = el.getBoundingClientRect(); ox = r.left; oy = r.top;
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', (e) => {
      if (sx == null) return;
      el.style.left = Math.max(0, ox + e.clientX - sx) + 'px';
      el.style.top = Math.max(0, oy + e.clientY - sy) + 'px';
      el.style.right = 'auto';
    });
    handle.addEventListener('pointerup', () => {
      if (sx == null) return;
      sx = null;
      try { localStorage.setItem(POS_KEY, JSON.stringify({ l: el.style.left, t: el.style.top })); } catch {}
    });
  }

  // Öffnet das Panel in einem separaten, immer-im-Vordergrund Fenster (Chrome/Edge: Document Picture-in-Picture).
  async function popOut() {
    const dpip = window.documentPictureInPicture;
    if (!dpip) { alert('Dein Browser unterstützt kein separates Fenster (Chrome/Edge 116+ nötig).'); return; }
    if (dpip.window) { dpip.window.close(); return; }
    const win = await dpip.requestWindow({ width: 290, height: 640 });
    const style = win.document.createElement('style');
    style.textContent = CSS + `body{margin:0;background:#0e1220}
      .digibot{position:static;width:auto;border:0;border-radius:0;box-shadow:none}
      .digibot__head{cursor:default}`;
    win.document.head.append(style);
    win.document.title = 'DigiBot';
    win.document.body.append(panel);
    panel.querySelector('[data-act="pip"]').title = 'Zurück ins Spiel';
    win.addEventListener('pagehide', () => {
      document.body.append(panel);
      panel.querySelector('[data-act="pip"]').title = 'In eigenes Fenster (immer im Vordergrund)';
      schedule();
    });
    schedule();
  }

  function mount() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.append(style);

    panel = document.createElement('div');
    panel.className = 'digibot';
    panel.innerHTML = HTML;
    panel.style.top = '70px';
    panel.style.right = '12px';
    try {
      const pos = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
      if (pos) { panel.style.left = pos.l; panel.style.top = pos.t; panel.style.right = 'auto'; }
    } catch {}
    document.body.append(panel);

    makeDraggable(panel, panel.querySelector('.digibot__head'));
    setTab(['data', 'attack', 'quest', 'farm', 'log'].includes(cfg.tab) ? cfg.tab : 'data');
    // Gruppen auf/zu merken ("toggle" steigt nicht auf -> in der Capture-Phase abfangen)
    panel.addEventListener('toggle', (e) => {
      const k = e.target?.dataset?.grp;
      if (k) { cfg.open = { ...cfg.open, [k]: e.target.open }; saveCfg(); }
    }, true);
    panel.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'min') panel.classList.toggle('is-min');
      if (act === 'pip') popOut();
      if (act === 'reset') { exp.reset(); bitsRate.last = null; bitsRate.gains = []; bitsRate.total = 0; schedule(); }
      if (act === 'bot') bot.toggle();
      if (act === 'mobs-all') setAllMobs(true);
      if (act === 'log-copy') copyLog(e.target);
      if (act === 'log-clear') { logbook.length = 0; logSig++; schedule(); }
      if (act === 'mobs-none') setAllMobs(false);
      const tab = e.target.closest('[data-tab]')?.dataset.tab;
      if (tab) setTab(tab);
      const mode = e.target.closest('[data-mode]')?.dataset.mode;
      if (mode && mode !== modeOf()) {
        cfg.questMode = mode === 'quest'; cfg.autopilot = mode === 'auto'; cfg.farm = mode === 'farm';
        saveCfg(); autopilot.reset(); farm.reset(); questSig = '';
        if (mode === 'auto' || mode === 'farm') loadWorld();
        logEvent('auto', `Modus: ${MODES[mode]}`);
        e.target.blur();
        schedule();
      }
    });
    panel.addEventListener('input', (e) => {
      if (e.target.matches('[data-farm]')) {
        cfg.farm = e.target.checked; saveCfg(); e.target.blur(); farm.reset(); autopilot.reset();
        if (cfg.farm) loadWorld();
        logEvent('auto', `Boss-Rotation ${cfg.farm ? 'an' : 'aus'}`);
        schedule();
        return;
      }
      const fch = e.target.dataset.farmch;
      if (fch) {
        const set = new Set(cfg.farmChannels || []);
        if (e.target.checked) set.add(Number(fch)); else set.delete(Number(fch));
        cfg.farmChannels = [...set].sort((a, b) => a - b); saveCfg(); e.target.blur(); farm.reset(); schedule();
        return;
      }
      const fb = e.target.dataset.farmboss;
      if (fb) {
        const set = new Set(cfg.farmBosses || []);
        if (e.target.checked) set.add(fb); else set.delete(fb);
        cfg.farmBosses = [...set]; saveCfg(); e.target.blur(); farm.reset(); schedule();
        return;
      }
      if (e.target.matches('[data-autopilot]')) {
        cfg.autopilot = e.target.checked; saveCfg(); e.target.blur(); autopilot.reset();
        if (cfg.autopilot) loadWorld();
        questSig = ''; schedule();
        return;
      }
      const flag = e.target.dataset.apflag;
      if (flag) {
        cfg[flag] = e.target.checked; saveCfg(); e.target.blur(); autopilot.reset(); schedule();
        logEvent('auto', `Einstellung: ${e.target.nextElementSibling?.textContent} = ${e.target.checked ? 'an' : 'aus'}`);
        return;
      }
      if (e.target.matches('[data-apgrind]')) {
        cfg.apGrind = e.target.checked; saveCfg(); e.target.blur(); autopilot.reset(); schedule();
        return;
      }
      if (e.target.matches('[data-questmode]')) {
        cfg.questMode = e.target.checked; saveCfg(); e.target.blur(); questSig = ''; schedule();
        return;
      }
      const qid = e.target.dataset.quest;
      if (qid) {
        if (e.target.checked) delete cfg.questOff[qid]; else cfg.questOff[qid] = true;
        saveCfg(); e.target.blur(); questSig = ''; schedule();
        return;
      }
      const mob = e.target.dataset.mob;
      if (mob) {
        const mapId = getStore()?.getState?.()?.world?.mapId;
        if (mapId) { (cfg.mobs[mapId] ||= {})[mob] = e.target.checked; saveCfg(); }
        e.target.closest('.digibot__mob')?.classList.toggle('off', !e.target.checked);
        e.target.blur();
        return;
      }
      const sk = e.target.dataset.skillcfg;
      if (sk) { cfg.skills[sk] = e.target.checked; saveCfg(); e.target.blur(); return; }
      const key = e.target.dataset.cfg;
      if (!key) return;
      cfg[key] = Number(e.target.value);
      panel.querySelector(`[data-v="${key}"]`).textContent = LABELS[key](cfg[key]);
      saveCfg();
    });
    // Regler nach dem Loslassen entfokussieren, damit Spieltasten wieder ans Spiel gehen
    panel.addEventListener('change', (e) => {
      const key = e.target.dataset.apsel;
      if (key) {
        cfg[key] = e.target.value;
        if (key === 'apStartMap' || key === 'apOrder') cfg.apSweepMap = ''; // Runde neu beginnen
        if (key === 'apQuestPartner') cfg.apEvo = '';                     // Digitation gilt pro Digimon
        if (/^(farm|route)/.test(key)) farm.reset();
        saveCfg(); autopilot.reset(); e.target.blur(); questSig = ''; schedule();
        logEvent('auto', `Einstellung: ${e.target.closest('label')?.firstChild?.textContent?.trim() || key} = ${e.target.selectedOptions[0]?.textContent || '–'}`);
        return;
      }
      if (e.target.dataset.cfg) e.target.blur();
    });
    // Tastenkürzel: Alt+D blendet das Panel ein/aus, Alt+B startet/stoppt den Bot
    window.addEventListener('keydown', (e) => {
      if (!e.isTrusted || !e.altKey) return;
      if (e.code === 'KeyD') panel.style.display = panel.style.display === 'none' ? '' : 'none';
      if (e.code === 'KeyB') { e.preventDefault(); bot.toggle(); }
    }, true);
  }

  // ---------- Start: warten bis das Spiel seinen Store bereitstellt ----------
  getStore = () => window.dmo?.store;
  const boot = setInterval(() => {
    const store = getStore();
    if (!store?.subscribe) return;
    clearInterval(boot);
    mount();
    store.subscribe(schedule);
    if (cfg.autopilot || cfg.farm) setTimeout(loadWorld, 2000);
    setInterval(schedule, 250); // Fallback, falls ein Update am Store vorbeiläuft
    render();
  }, 300);
})();
