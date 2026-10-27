// ==UserScript==
// @name         DigiBot – Status-Anzeige
// @namespace    digibot
// @version      3.0.5
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
// DigiBot: lifecycle, action arbitration, bounded diagnostics and group envelopes.
function createDigiBotCore({ now = Date.now, state, halt, network = () => null, trace = () => {}, diagnostics = () => ({}), signal = () => {}, random = Math.random }) {
  let armed = false, loginOnly = false, latch = '', epoch = 0, owner = null;
  let lastMove = -Infinity, lastPriority = -1, lastStore = now(), lastLeader = null;
  const timers = new Set(), records = [], critical = [], peers = new Map();
  const session = `${now().toString(36)}-${random().toString(36).slice(2)}`;
  let seq = 0, loadingAt = null;
  function record(reason, details = {}, important = false) {
    // Explicit allowlist: never serialize game state, credentials or messages wholesale.
    const row = { at: now(), reason: String(reason).slice(0, 180) };
    for (const key of ['map', 'channel', 'target', 'hp', 'action', 'mode', 'duration', 'slot','id','status','evidence']) {
      if (['string', 'number', 'boolean'].includes(typeof details[key])) row[key] = typeof details[key] === 'string' ? details[key].slice(0, 120) : details[key];
    }
    trace(row,important);
    records.push(row); if (records.length > 500) records.shift();
    if(important){critical.push(row);if(critical.length>100)critical.shift();}
  }
  function stop(reason = 'Manuell gestoppt', locked = false) {
    armed = false; loginOnly = false; epoch++; owner = null;
    for (const id of timers) clearTimeout(id); timers.clear();
    if (locked) latch = reason;
    halt(reason,{locked}); record(reason,{},true); if (locked) signal(reason);
  }
  function health() {
    const st = state();
    if (st?.challenge) return 'Anwesenheitskontrolle – bitte selbst beantworten';
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'Verbindung unterbrochen';
    if(loginOnly && st?.screen==='disconnected')return 'Verbindung unterbrochen';
    const net=network();
    if(!loginOnly && net && st?.screen==='world' && (net.transfer || !net.ready)) {loadingAt ??= now();return now()-loadingAt<60000?'__loading':'Netzwerkübergang dauert zu lange – Verbindung prüfen';}
    if (!loginOnly && (st?.screen === 'loading' || (st?.screen === 'world' && !st.me?.partner))) { loadingAt ??= now(); return now()-loadingAt<15000 ? '__loading' : 'Karten-/Kanalwechsel dauert zu lange – Verbindung prüfen'; }
    loadingAt=null;
    if (!loginOnly && (st?.screen !== 'world' || !st.me?.partner)) return 'Spielwelt nicht verfügbar – neu starten, sobald verbunden';
    if (!loginOnly && !net?.ready && now() - lastStore > 30000) return 'Spieldaten seit 30 Sekunden unverändert – Verbindung prüfen';
    return '';
  }
  function inspect() {
    const why = health();
    if ((armed||owner?.passive) && why && why !== '__loading') stop(why, true);
    return !why;
  }
  function start(manual = false, login = false) {
    if (latch && !manual) return false;
    loginOnly = login;
    const why = health();
    if (why) { loginOnly = false; latch = why === '__loading' ? 'Spielwelt wird noch geladen – bitte kurz warten' : why; signal(latch); return false; }
    latch = ''; armed = true; epoch++; owner=null; record(login ? 'Manuelle Anmeldung abwarten' : 'Gestartet'); return true;
  }
  function allowed() { return (armed||owner?.passive===true) && inspect(); }
  function run(mode, priority, fn) {
    if (!allowed() || owner || (loginOnly && !['Gruppe','Account-Runde'].includes(mode))) return;
    const token = epoch, started = now(); owner = { mode, priority };
    try { return fn(); }
    catch (e) { record('Fehler im Ablauf', { mode, action: e?.name || 'Error' }); stop(`Fehler in ${mode} – Diagnose exportieren`, true); }
    finally { if (token === epoch) owner = null; if (now() - started > 50) record('Langsamer Durchlauf', { mode, duration: now() - started }); }
  }
  function enablePassive(manual=false) {
    if(!manual)return false;const why=health();if(why)return false;
    latch='';record('Gruppenfunktionen manuell freigegeben');return true;
  }
  function runPassive(mode,priority,fn) {
    if(!['Gruppe','Spiegeln'].includes(mode)||latch||owner)return;
    const why=health();if(why){if(why!=='__loading')stop(why,true);return;}
    const scope={mode,priority,passive:true};owner=scope;
    try{return fn();}catch(e){record('Fehler im Gruppenablauf',{mode,action:e?.name||'Error'},true);stop(`Fehler in ${mode}`,true);}
    finally{if(owner===scope)owner=null;}
  }
  function action(name, fn, args) {
    if (!allowed()) return;
    if (/tapGround|moveTo/.test(name)) {
      const priority = owner?.priority ?? 0;
      if (now() - lastMove < 180 && priority <= lastPriority) return;
      lastMove = now(); lastPriority = priority;
    }
    const st = state();
    if (/select|switchChannel|teleport|tapGround/.test(name)) record('Aktion', { action: name, map: st?.world?.mapId, channel: st?.world?.channel, target: st?.target?.id, hp: st?.target?.hp });
    return fn(...args);
  }
  function defer(fn, ms) {
    const token = epoch;
    const id = setTimeout(() => { timers.delete(id); if (token === epoch && allowed()) fn(); }, ms);
    timers.add(id); return id;
  }
  function envelope(message, slot, leader) { return { ...message, protocol: 'digibot/1', slot, leader, session, seq: ++seq, sentAt: now() }; }
  function accept(m, slot, leader, enabled) {
    if (!m || m.protocol !== 'digibot/1' || !Number.isInteger(m.slot) || m.slot < 0 || m.slot >= 5 || m.slot === slot || !enabled(m.slot)) return false;
    if (m.leader !== leader || typeof m.session !== 'string' || m.session.length > 80 || !Number.isSafeInteger(m.seq) || !Number.isFinite(m.sentAt) || Math.abs(now() - m.sentAt) > 6000) return false;
    if (!['state','pos','start','stop','invite','maptalk','koh','kohplan'].includes(m.type)) return false;
    if (['start','maptalk','pos'].includes(m.type) && m.slot !== leader) return false;
    // Nach einem Not-Aus (latch) startet nur ein bewusster Klick auf „Start“ im Leader-Fenster alle wieder (manual) –
    // kein automatischer Start, keine Abgeben-&-Annehmen-Folge (3.0.5)
    if (['start','maptalk'].includes(m.type) && latch && !(m.type === 'start' && m.manual === true)) return false;
    if (lastLeader !== leader) { peers.clear(); lastLeader = leader; }
    const p = peers.get(m.slot);
    if (p && p.session === m.session && m.seq <= p.seq) return false;
    if (p && p.session !== m.session && m.sentAt <= p.at) return false;
    peers.set(m.slot, { session: m.session, seq: m.seq, at: m.sentAt });
    if (m.type === 'state' && (typeof m.inWorld !== 'boolean' || !Array.isArray(m.ents) || m.ents.length > 10)) return false;
    return true;
  }
  function priority(value, fn) { const old=owner;owner={mode:old?.mode||'Sicherheit',priority:value};try{return fn();}finally{owner=old;} }
  function loginMode(value){if(!armed||latch)return false;loginOnly=!!value;return true;}
  return { runPassive, enablePassive, loginMode, priority, start, stop, inspect, allowed, run, action, defer, record, envelope, accept,
    touch: () => { lastStore = now(); }, get armed() { return armed; }, get latched() { return !!latch; },
    export: () => JSON.stringify({ format: 'digibot-diagnostics/1', records, critical, ...diagnostics() }, null, 2) };
}

// Fester Platz je Slot: getrennte Sektoren um den Boss/Spawnpunkt plus Abstand zu den Plätzen der anderen Fenster.
// Kein Zufall und keine künstliche Aufbruch-Verzögerung (keine Verschleierung) – nur so viel Abstand, dass nicht alle auf
// einem Fleck stehen und ein Flächenangriff nicht alle zugleich trifft.
function createDigiBotFormation({ now = Date.now } = {}) {
  let cached = null;
  const failed = new Set();
  function reset() { cached = null; failed.clear(); }
  function delay() { return 0; } // gemeinsamer Aufbruch
  function point(key, center, slot, valid, peers = [], radius = 120) {
    if (!center || !Number.isFinite(center.x) || !Number.isFinite(center.y)) return null;
    if (cached?.key !== key) { cached = null; failed.clear(); }
    const free = p => valid(p) && !peers.some(q => Math.hypot(p.x-q.x,p.y-q.y) < 38);
    if (cached?.key === key && Math.hypot(center.x-cached.center.x,center.y-cached.center.y)<80 && free(cached.point)) return cached.point;
    // Sektormitte zuerst, dann feste Schritte zur Seite und nach innen/außen
    const base = (slot % 5) * Math.PI * 2 / 5;
    for (const dr of [1, 0.85, 1.15, 0.75, 1.25]) for (const da of [0, 0.15, -0.15, 0.3, -0.3]) {
      const angle = base + da, r = radius * dr;
      const p = {x:center.x+Math.cos(angle)*r,y:center.y+Math.sin(angle)*r};
      const cell = `${Math.round(p.x/24)},${Math.round(p.y/24)}`;
      if (!failed.has(cell) && free(p)) { cached={key,center:{...center},point:p};return p; }
    }
    return null; // no safe point: do not fall back to the occupied center
  }
  function reject() { if(cached) { failed.add(`${Math.round(cached.point.x/24)},${Math.round(cached.point.y/24)}`); cached.point={x:NaN,y:NaN}; } }
  return { reset,delay,point,reject,get reservation(){return cached && Number.isFinite(cached.point.x)?{key:cached.key,...cached.point}:null;} };
}

function digibotRecord(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
function digibotClean(v, depth=0) {
  if(depth>6)return undefined;
  if(Array.isArray(v))return v.slice(0,500).map(x=>digibotClean(x,depth+1)).filter(x=>x!==undefined);
  if(digibotRecord(v))return Object.fromEntries(Object.entries(v).slice(0,1000).filter(([k])=>!['__proto__','constructor','prototype'].includes(k)).map(([k,x])=>[k,digibotClean(x,depth+1)]).filter(([,x])=>x!==undefined));
  if(typeof v==='string')return v.slice(0,1000);
  if(typeof v==='boolean'||(typeof v==='number'&&Number.isFinite(v)))return v;
  return undefined;
}
function digibotConfig(saved, defaults) {
  const out=JSON.parse(JSON.stringify(defaults)), issues=[];
  if(!digibotRecord(saved))return {value:out,issues:['Ungültiges Einstellungsformat']};
  const bounds={width:[300,900],radius:[80,2000],lvlDiff:[-100,100],hpPot:[0,100],dsPot:[0,100],tdsPot:[0,100]};
  const boolMap=v=>Object.fromEntries(Object.entries(digibotRecord(v)?digibotClean(v):{}).filter(([,x])=>typeof x==='boolean'));
  const skills=v=>Object.fromEntries(Object.entries(boolMap(v)).filter(([k])=>/^[2-6]$/.test(k)));
  const heals=v=>Object.fromEntries(Object.entries(digibotRecord(v)?digibotClean(v):{}).filter(([k,x])=>/^[2-6]$/.test(k)&&typeof x==='number').map(([k,x])=>[k,Math.max(0,Math.min(100,x))]));
  for(const [k,d]of Object.entries(defaults)) {
    if(!Object.hasOwn(saved,k))continue;const v=saved[k];
    if(Array.isArray(d)) {if(Array.isArray(v)&&v.every(x=>typeof x===typeof d[0]))out[k]=digibotClean(v);else issues.push(k);}
    else if(digibotRecord(d)) {if(digibotRecord(v))out[k]=digibotClean(v);else issues.push(k);}
    else if(typeof v===typeof d&&(typeof v!=='number'||Number.isFinite(v)))out[k]=v;else issues.push(k);
  }
  for(const [k,[min,max]]of Object.entries(bounds))if(typeof out[k]==='number'){const x=Math.max(min,Math.min(max,out[k]));if(x!==out[k])issues.push(k);out[k]=x;}
  out.skills={...defaults.skills,...skills(out.skills)};out.heal=heals(out.heal);
  out.skillSets=Object.fromEntries(Object.entries(out.skillSets||{}).filter(([,v])=>digibotRecord(v)).map(([k,v])=>[k,{skills:{...defaults.skills,...skills(v.skills)},heal:heals(v.heal)}]));
  for(const k of ['open','questOff'])out[k]=boolMap(out[k]);
  out.mobs=Object.fromEntries(Object.entries(out.mobs||{}).filter(([,v])=>digibotRecord(v)).map(([k,v])=>[k,boolMap(v)]));
  out.farmChannels=[...new Set((out.farmChannels||[]).filter(x=>Number.isInteger(x)&&x>=1&&x<=100))];
  const enums={farmMode:['boss','named'],apOrder:['near','sweep'],apSweepDir:['up','down'],dgMode:['easy','hard','apocalymon','malomyotismon']};
  for(const [k,vals]of Object.entries(enums))if(!vals.includes(out[k])){out[k]=defaults[k];issues.push(k);}
  return {value:out,issues};
}

// Values verified against the uploaded content.js (mega_hunt), 2026-10-25.
const CDIGI_HUNT_DEFAULTS=Object.freeze({id:'mega_hunt',slotMs:7200000,warnMs:300000,channel:1});
function digibotHuntPolicy(content, server) {
  const candidates=[content?.hunt,...(Array.isArray(content?.events)?content.events:[])];
  const def=candidates.find(x=>x?.id==='mega_hunt')||CDIGI_HUNT_DEFAULTS;
  const valid=(n,f)=>Number.isFinite(n)&&n>0?n:f;
  return {channel:Number.isInteger(server?.channel)&&server.channel>0?server.channel:valid(def.channel,1),
    slotMs:valid(server?.slot?.endMs-server?.slot?.startMs,valid(def.slotMs,7200000)),
    warnMs:valid(def.warnMs,300000),leadMs:valid(def.warnMs,300000)+60000};
}
function digibotTowerState(st, content) {
  if(typeof st?.me?.partner?.darkTower==='boolean')return st.me.partner.darkTower;
  return content?.maps?.[st?.world?.mapId]?.darkTower===true;
}
function digibotNetworkState(net, st) {
  if(!net || typeof net.connected!=='boolean')return null;
  const ids=[st?.me?.tamerEntityId,st?.me?.partner?.entityId];
  const entitiesReady=ids.every(id=>!!id&&net.state?.entities?.has?.(id));
  return {transfer:net.transferring===true,connected:net.connected,
    ready:net.connected&&net.transferring!==true&&st?.screen==='world'&&entitiesReady};
}
function digibotLatency(rtt) {return Math.min(2500,Math.max(350,200+(Number.isFinite(rtt)?Math.max(0,rtt):150)*1.5));}
function createDigiBotCombat({now=Date.now}={}) {
  let pending=null;const damage=new Map();
  function sent(id,rtt){pending={id,until:now()+Math.min(3000,Math.max(600,2*(rtt||0)+300))};}
  function ack(){pending=null;}
  function waiting(id){if(pending&&now()>=pending.until)pending=null;return !!pending&&pending.id===id;}
  function noteDamage(ev){if(ev?.t==='dmg'&&ev.dst&&ev.amount>0){damage.set(ev.dst,now());if(damage.size>500)damage.delete(damage.keys().next().value);}}
  return {sent,ack,waiting,noteDamage,lastDamage:id=>damage.get(id)||0,reset(){pending=null;damage.clear();}};
}
function digibotMechanicActive(st, scene) {
  const boss=st?.boss;
  if(boss&&(boss.held||boss.mark||boss.mirror))return true;
  if((scene?.mech?.padsActive||[]).length || (scene?.mech?.reticlesActive||[]).length || (scene?.mech?.arrowsActive||[]).length)return true;
  return !!(scene?.telegraphs?.active||[]).length;
}

// Pure decisions, independent of game internals and browser timers.
function digibotTamerDecision({skill, partner, allies=[], target, fighting=false, incoming=false, debuffed=false, skillsOnCooldown=0}) {
  if(!skill||!partner||partner.fainted||partner.evolving||partner.hp<=0)return null;
  const own=partner.maxHp>0?partner.hp/partner.maxHp*100:100;
  const members=skill.scope==='party'?[partner,...allies.filter(p=>p.hp>0)]:[partner];
  const low=members.some(p=>p.maxHp>0&&p.hp/p.maxHp<.6);
  const critical=members.some(p=>p.maxHp>0&&p.hp/p.maxHp<.3);
  const longFight=fighting&&target?.hp>0&&((target.flags&16)||target.cat==='boss'||(target.maxHp>0&&target.hp>partner.maxHp));
  if(skill.healPct)return low?'Heilung bei niedrigen HP':null;
  if(skill.cleanse)return debuffed?'Aktive Debuffs entfernen':null;
  if(skill.protectionMs)return fighting&&(incoming||own<30)?'Eigener Schutz vor gefährlichem Treffer':null;
  if(skill.cheatDeath)return fighting&&(critical||incoming)?'Schutz vor Bewusstlosigkeit':null;
  if(skill.resetCooldowns)return longFight&&skillsOnCooldown>=2?'Mindestens zwei Angriffsskills auf Abklingzeit':null;
  if(skill.split)return fighting&&members.length>=2&&(incoming||critical)?'Schaden in der Gruppe aufteilen':null;
  if(skill.damageReduction||skill.absorb)return fighting&&(incoming||low)?'Gruppenschutz im gefährlichen Kampf':null;
  if(skill.fill)return fighting&&(low||members.some(p=>p.maxDs>0&&p.ds/p.maxDs<.4))?'HP-/DS-Reserve auffüllen':null;
  if((skill.effects||[]).some(e=>['ms','ev'].includes(e.stat)&&e.pct>0))return fighting&&incoming?'Beweglichkeit vor gefährlichem Treffer':null;
  if(skill.skillDmg||skill.critDmg||skill.damageBoost||(skill.effects||[]).some(e=>['at','as'].includes(e.stat)&&e.pct>0))return longFight?'Angriffsverstärkung im längeren Kampf':null;
  return null;
}
function digibotTamerElection({skillId,slot,now,peers=[],partyId}) {
  const eligible=peers.filter(p=>p.partyId===partyId&&p.tamer?.skill===skillId&&now-p.seen<6000);
  if(eligible.some(p=>p.tamer.last && now-p.tamer.last < Math.min(300000,Math.max(0,p.tamer.cooldown||0))))return false;
  return !eligible.some(p=>p.bot&&p.tamer.want&&p.slot<slot);
}
if(typeof module!=='undefined')module.exports={digibotTamerDecision,digibotTamerElection};

// Bounded local evidence. Requests and observations are never equated with causation.
function createDigiBotHistory({now=Date.now,emit=()=>{}}={}) {
  let seq=0;const commands=[],pending=new Map(),trail=[],incidents=[];
  const text=v=>typeof v==='string'?v.slice(0,160):undefined;
  function context(s={}) {return Object.fromEntries(['screen','map','room','channel','partner','species','target','hp'].filter(k=>['string','number','boolean'].includes(typeof s[k])).map(k=>[k,typeof s[k]==='string'?text(s[k]):s[k]]));}
  function view(c) {return {id:c.id,command:c.command,status:c.status,requestedAt:c.at,updatedAt:c.updatedAt,context:{...c.context},...c.target?{target:c.target}:{},...c.evidence?{evidence:c.evidence}:{},...c.detail?{detail:c.detail}:{}};}
  function incident(reason,id) {
    const last=incidents.at(-1);if(last?.reason===reason&&last?.commandId===id&&now()-last.at<5000)return;
    incidents.push({at:now(),reason:text(reason),...(id?{commandId:id}:{}),timeline:trail.slice(-60).map(r=>({...r})),commands:commands.slice(-20).map(view)});
    if(incidents.length>12)incidents.shift();
  }
  function breadcrumb(row,important=false) {
    const clean={at:row.at,reason:text(row.reason)};
    for(const k of ['map','channel','target','hp','action','mode','id','status','evidence'])if(['string','number','boolean'].includes(typeof row[k]))clean[k]=typeof row[k]==='string'?text(row[k]):row[k];
    trail.push(clean);if(trail.length>150)trail.shift();
    if(important&&/Fehler|Anwesenheits|Verbindung|gestoppt|Not-Aus|unbestätigt/i.test(row.reason))incident(row.reason);
  }
  function update(c,status,evidence,terminal=false,detail) {
    if(c.status===status&&c.evidence===evidence)return;
    c.status=status;c.evidence=text(evidence);c.detail=text(detail);c.updatedAt=now();
    if(terminal)pending.delete(c.id);
    emit('Befehlsstatus',{id:c.id,action:c.command,status,evidence:c.evidence,...c.context},['rejected','timed_out','effect_unobserved'].includes(status));
    if(['rejected','timed_out','effect_unobserved'].includes(status))incident(status,c.id);
  }
  function request(command,s={},expected={}) {
    if(!['attack','skill','tamer','evolve','devolve','move','channel','teleport'].includes(command))return null;
    // Only one outstanding command per category. A replacement is not a failed command.
    for(const c of pending.values())if(c.command===command) {
      if(command==='move'&&c.expected.x===expected.x&&c.expected.y===expected.y)return c.id;
      update(c,'superseded','durch neuere Anforderung ersetzt',true);
    }
    const c={id:`c${++seq}`,command,status:'requested',at:now(),updatedAt:now(),context:context(s),target:text(expected.species||expected.skill||expected.room||expected.map||s.target),before:{...s},expected:{...expected},deadline:now()+(expected.timeout||(['channel','teleport'].includes(command)?60000:command==='move'?15000:8000))};
    commands.push(c);pending.set(c.id,c);
    while(commands.length>120){const old=commands.shift();pending.delete(old.id);}
    emit('Befehl angefordert',{id:c.id,action:command,status:'requested',...c.context},false);return c.id;
  }
  function reject(id,reason='lokaler Fehler'){const c=pending.get(id);if(c)update(c,'rejected','lokaler Aufruf fehlgeschlagen',true,reason);}
  function cancel(reason='gestoppt',except=[]) {for(const c of [...pending.values()])if(!except.includes(c.command))update(c,'cancelled',reason,true);}
  function event(e,s={}) {
    const candidates=[...pending.values()].filter(c=>c.context.partner===s.partner&&c.context.map===s.map&&c.context.room===s.room&&c.context.channel===s.channel && (c.command!=='skill'||c.context.species===s.species));
    if(e?.t==='attackAck') {const c=candidates.find(c=>c.command==='attack');if(c)update(c,'confirmed','attackAck beobachtet; nur eine passende offene Anforderung');}
    if(e?.t==='cooldown'&&e.ms>0) {
      for(const c of candidates)if((c.command==='skill'&&e.key===c.expected.ref)||(c.command==='tamer'&&e.key==='tamer'))
        update(c,c.command==='tamer'?'cooldown_observed':'confirmed',c.command==='tamer'?'gemeinsamer Cooldown beobachtet; Auslöser nicht eindeutig':'passender Skill-Cooldown vom Server');
    }
    if(e?.t==='dmg'&&e.amount>0&&e.src===s.partner) {
      for(const c of candidates)if(e.dst===c.context.target&&((c.command==='skill'&&e.skill===c.expected.skill)||(c.command==='attack'&&c.status==='confirmed'&&!e.skill)))
        update(c,'observed',c.command==='skill'?'passendes Schadensereignis':'Treffer am Ziel beobachtet; Einzelangriff nicht eindeutig',true);
    }
    if(e?.t==='toast'&&e.kind==='error'&&typeof e.code==='string') {
      // Generic errors carry no request ID: retain uncertainty instead of assigning a failure.
      const recent=candidates.filter(c=>now()-c.at<2000);
      if(recent.length===1)update(recent[0],'possible_rejection','Fehlermeldung zeitlich passend, Zuordnung unbestätigt',false,e.code);
      emit('Server-Ablehnung beobachtet',{evidence:text(e.code),status:'unassigned'},true);
    }
  }
  function observe(s={}) {
    for(const c of [...pending.values()]) {
      const transfer=['channel','teleport'].includes(c.command);
      if(c.command==='skill'&&c.context.species!==s.species){update(c,'cancelled','Digitationsform gewechselt',true);continue;}
      if(!transfer&&(c.context.partner!==s.partner||c.context.map!==s.map||c.context.room!==s.room||c.context.channel!==s.channel)) {update(c,'cancelled','Spielkontext gewechselt',true);continue;}
      if(c.command==='evolve'&&s.species===c.expected.species&&s.species!==c.before.species)update(c,'observed','Zielform im Spielzustand erreicht',true);
      else if(c.command==='devolve'&&s.species!==c.before.species&&(!c.expected.species||s.species===c.expected.species))update(c,'observed','Zurück-Digitation im Spielzustand gesehen',true);
      else if(c.command==='channel'&&s.ready&&s.room===c.expected.room&&s.room!==c.before.room)update(c,'observed','Zielraum verbunden und eigene Entities vorhanden',true);
      else if(c.command==='teleport'&&s.ready&&s.map===c.expected.map&&s.map!==c.before.map)update(c,'observed','Zielkarte verbunden und eigene Entities vorhanden',true);
      else if(c.command==='move'&&Number.isFinite(s.x)&&Number.isFinite(s.y)) {
        if(Math.hypot(s.x-c.expected.x,s.y-c.expected.y)<=24)update(c,'observed','Laufziel erreicht',true);
        else if(Math.hypot(s.x-c.before.x,s.y-c.before.y)>6&&Math.hypot(s.x-c.expected.x,s.y-c.expected.y)<Math.hypot(c.before.x-c.expected.x,c.before.y-c.expected.y)-4)update(c,'progress','Bewegung in Richtung Laufziel beobachtet');
      }
      if(c.command==='skill'&&(s.cooldowns?.[c.expected.ref]||0)>(c.before.cooldowns?.[c.expected.ref]||0))update(c,'confirmed','passender Skill-Cooldown im Zustand');
      if(c.command==='tamer') {
        if((s.cooldowns?.tamer||0)>(c.before.cooldowns?.tamer||0))update(c,'cooldown_observed','gemeinsamer Cooldown; kein Beweis eigener Auslösung');
        const fx=s.effects?.[c.expected.skill],before=c.before.effects?.[c.expected.skill];
        if(fx!==undefined&&fx!==before)update(c,'observed','passender Effekt am eigenen Partner; Quelle kann Gruppenmitglied sein',true);
        // HP gains alone can come from potions, healers or regeneration; never attribute them.
      }
      if(pending.has(c.id)&&now()>=c.deadline)update(c,['confirmed','cooldown_observed','progress'].includes(c.status)?'effect_unobserved':'timed_out','keine weitere eindeutige Beobachtung innerhalb der Wartezeit',true);
    }
  }
  return {request,reject,cancel,event,observe,breadcrumb,recent:(n=5)=>commands.slice(-Math.min(120,Math.max(0,n))).map(view),export:()=>({commandHistoryVersion:1,commands:commands.map(view),incidents:incidents.map(i=>JSON.parse(JSON.stringify(i)))})};
}
if(typeof module!=='undefined')module.exports={createDigiBotHistory};

function createDigiBotAccountQueue({now=Date.now}={}) {
  let plan=[],index=0,phase='idle',reason='',generation=0,pending=false,since=0;
  const normalize=u=>String(u||'').trim().toLowerCase();
  const active=()=>!['idle','paused','done'].includes(phase);
  function pause(message){phase='paused';reason=message;generation++;pending=false;return {type:'pause',reason:message};}
  function start(entries){if(active())return {type:'none'};plan=[];index=0;const seen=new Set();const selected=[];
    for(const e of entries){const user=normalize(e.user);if(!Number.isInteger(e.slot)||e.slot<0||e.slot>=5||!user||seen.has(user)){plan=[];return pause('Account-Auswahl ungültig oder Benutzername doppelt');}seen.add(user);selected.push({slot:e.slot,user,char:String(e.char||'').trim()});}
    if(!selected.length)return pause('Bitte mindestens einen Account mit Haken und Benutzername auswählen');
    plan=selected.sort((a,b)=>a.slot-b.slot);index=0;generation++;phase='switching';reason='';pending=false;since=now();return {type:'started'};
  }
  function resume(){if(phase!=='paused'||!plan[index])return false;generation++;phase='switching';reason='';pending=false;since=now();return true;}
  function complete(){if(phase!=='running')return {type:'none'};index++;generation++;pending=false;since=now();if(index>=plan.length){phase='done';return {type:'done'};}phase='switching';return {type:'next',slot:plan[index].slot};}
  function action(type,extras={}){pending=true;return {type,...extras,slot:plan[index].slot,generation};}
  function settled(token,error=false){if(token!==generation||!active())return false;pending=false;if(error)pause('Account-Aktion fehlgeschlagen – Anmeldung und Verbindung prüfen');return true;}
  function step(s){
    if(!active())return {type:'none'};
    if(s.challenge)return pause('Anwesenheitskontrolle – bitte selbst beantworten');
    if(s.disconnected)return pause('Verbindung unterbrochen');
    const entry=plan[index];
    if(normalize(s.configuredUser)!==entry.user)return pause('Account-Zuordnung wurde verändert – Runde neu starten');
    if(phase==='running')return normalize(s.user)===entry.user?{type:'none'}:pause('Der angemeldete Account hat sich unerwartet geändert');
    if(s.error&&!s.busy)return pause('Das Spiel meldet einen Anmelde- oder Charakterfehler – bitte im Spiel prüfen');
    if(now()-since>90000)return pause('Account-Wechsel dauert zu lange – bitte im Spiel prüfen');
    if(pending||s.busy||s.screen==='loading')return {type:'none'};
    if(phase==='await-login'&&s.screen!=='login')return {type:'none'};
    const same=normalize(s.user)===entry.user;
    if(s.screen==='world'){
      if(!s.ready)return {type:'none'};
      const correctChar=!entry.char||normalize(s.character)===normalize(entry.char);
      if(same&&correctChar){phase='starting';return action('begin');}
      if(phase!=='switching')return pause('Unerwarteter Account oder Charakter nach dem Wechsel');
      if(!s.hasPassword)return pause(`Passwort für Account ${entry.slot+1} fehlt – im Account-Feld eingeben`);
      phase='await-login';return action('logout');
    }
    if(s.screen==='login'){
      if(phase==='await-auth'||phase==='await-world'||phase==='starting')return {type:'none'};
      if(!s.hasPassword)return pause(`Passwort für Account ${entry.slot+1} fehlt – im Account-Feld eingeben`);
      phase='await-auth';return action('login');
    }
    if(s.screen==='charSelect'){
      if(!same){
        if(phase!=='switching')return pause('Anmeldung stimmt nicht mit dem vorgesehenen Account überein');
        if(!s.hasPassword)return pause(`Passwort für Account ${entry.slot+1} fehlt – im Account-Feld eingeben`);
        phase='await-login';return action('logout');
      }
      if(phase==='await-world')return {type:'none'};
      const chars=Array.isArray(s.characters)?s.characters:[];
      const chosen=entry.char?chars.find(c=>normalize(c.name)===normalize(entry.char)):chars.length===1?chars[0]:null;
      if(!chosen?.id)return pause('Charakter nicht eindeutig – Namen für diesen Account festlegen oder selbst betreten');
      phase='await-world';return action('enter', {characterId:chosen.id});
    }
    if(s.screen==='charCreate')return pause('Dieser Account benötigt zuerst einen Charakter');
    return pause('Unbekannter Anmeldezustand – bitte selbst prüfen');
  }
  function began(token){if(token!==generation||phase!=='starting')return false;pending=false;phase='running';since=now();return true;}
  return {start,resume,complete,step,settled,began,pause,cancel(message){if(active())pause(message);},get active(){return active();},get phase(){return phase;},get slot(){return plan[index]?.slot;},get user(){return plan[index]?.user;},get generation(){return generation;},get index(){return index;},summary:()=>({phase,index,total:plan.length,slot:plan[index]?.slot,reason,completedSlots:plan.slice(0,index).map(e=>e.slot)})};
}
if(typeof module!=='undefined')module.exports={createDigiBotAccountQueue};

// Four-window desktop layout and a shared launch barrier. No credentials.
function digibotDesktopRoster(accounts){
  const list=(accounts.list||[]).map((a,slot)=>({slot,user:String(a.user||'').trim()})).filter(a=>accounts.list[a.slot].on&&a.user);
  if(list.length!==4)return {error:'Bitte genau vier Accounts mit Haken und Benutzername auswählen.'};
  if(!list.some(a=>a.slot===accounts.leader))return {error:'Der ausgewählte Leader muss zu den vier Accounts gehören.'};
  if(new Set(list.map(a=>a.user.toLowerCase())).size!==4)return {error:'Die vier Accounts müssen unterschiedliche Benutzernamen haben.'};
  return {slots:[list.find(a=>a.slot===accounts.leader),...list.filter(a=>a.slot!==accounts.leader)]};
}
function digibotDesktopTiles(screen){
  const left=Number.isFinite(screen?.availLeft)?screen.availLeft:0,top=Number.isFinite(screen?.availTop)?screen.availTop:0;
  const width=Math.floor(Number(screen?.availWidth)||0),height=Math.floor(Number(screen?.availHeight)||0);
  if(width<800||height<600)return null;
  const w=Math.floor(width/2),h=Math.floor(height/2);
  return [{left,top,width:w,height:h},{left:left+w,top,width:width-w,height:h},{left,top:top+h,width:w,height:height-h},{left:left+w,top:top+h,width:width-w,height:height-h}];
}
function digibotDesktopValid(plan,now){
  if(!plan||plan.version!==1||typeof plan.id!=='string'||!/^[a-z0-9-]{8,100}$/.test(plan.id)||!Number.isFinite(plan.created)||!Number.isFinite(plan.expires)||plan.created>now+5000||plan.expires<=now||plan.expires>plan.created+900000)return false;
  if(!['waiting','arming','scheduled','running','cancelled'].includes(plan.phase)||!Array.isArray(plan.slots)||plan.slots.length!==4||!Number.isInteger(plan.leader))return false;
  if(plan.slots.some(a=>!Number.isInteger(a.slot)||a.slot<0||a.slot>=5||typeof a.user!=='string'||!a.user.trim()||a.user.length>64))return false;
  if(new Set(plan.slots.map(a=>a.slot)).size!==4||new Set(plan.slots.map(a=>a.user.toLowerCase())).size!==4||!plan.slots.some(a=>a.slot===plan.leader))return false;
  return !['scheduled','running'].includes(plan.phase)||(Number.isFinite(plan.startAt)&&plan.startAt>=plan.created&&plan.startAt<plan.expires);
}
function digibotDesktopBarrier(plan,members,now,{party=true,armed=false}={}){
  const rows=plan.slots.map(a=>members.find(m=>m?.slot===a.slot&&m.id===plan.id));
  for(let i=0;i<rows.length;i++){
    const row=rows[i],expected=plan.slots[i];
    if(!row||!Number.isFinite(row.seen)||now-row.seen>3000||row.seen>now+1000)return {ok:false,reason:`Warte auf Fenster für ${expected.user}`};
    if(typeof row.user!=='string'||row.user.toLowerCase()!==expected.user.toLowerCase()||row.ready!==true||typeof row.name!=='string'||!row.name)return {ok:false,reason:`${expected.user}: ${row.reason||'richtigen Account anmelden und Charakter betreten'}`};
    if(armed&&row.armed!==true)return {ok:false,reason:`${expected.user}: Startfreigabe wird vorbereitet`};
  }
  const names=rows.map(r=>r.name.toLowerCase());
  if(new Set(names).size!==4)return {ok:false,reason:'Vier unterschiedliche Charaktere werden benötigt.'};
  if(party){
    const id=rows[0].partyId;
    if(!id||rows.some(r=>r.partyId!==id||!Array.isArray(r.partyNames)||names.some(n=>!r.partyNames.includes(n))))return {ok:false,reason:'Leader lädt ein – warte auf vollständige Vierer-Party'};
  }
  return {ok:true,rows};
}

  if (window.__digibotInstalled) return;
  window.__digibotInstalled = true;

  // DigiBot integration: adapters are evaluated lazily after the original declarations.
  let digibotManual = false, digibotNotice = null, digibotNet = null, digibotStore = null;
  let digibotLastContext = '', digibotLastLeader = null, digibotLastPrune = 0, digibotCurrentObjective = null;
  const digibotKeys = new Map(), digibotDeaths = new Map();
  const digibotCombat=createDigiBotCombat();
  const digibotHistory=createDigiBotHistory({emit:(reason,details,important)=>digibotCore.record(reason,details,important)});
  const digibotFormation = createDigiBotFormation({});
  // Keep user intent within the actual event handler, not a preceding capture listener.
  function digibotUserIntent(handler) {
    return function(event) {
      const previous=digibotManual;
      digibotManual=event.isTrusted===true;
      try { return handler.call(this,event); }
      finally { digibotManual=previous; }
    };
  }
  function digibotRawScene() { try { return window.dmo?.game?.scene?.getScene?.('world'); } catch { return null; } }
  function digibotSignal(text) {
    if (!digibotNotice) {
      digibotNotice = document.createElement('aside'); digibotNotice.id='digibot-notice'; digibotNotice.setAttribute('role','alert');
      digibotNotice.style.cssText='position:fixed;top:12px;left:12px;z-index:2147483647;background:#581b20;color:#fff;padding:14px;max-width:400px;font:14px system-ui;border:2px solid #ffb86b;border-radius:8px';
      document.body.append(digibotNotice);
    }
    digibotNotice.textContent=`DigiBot pausiert: ${text}. Nach dem Beheben über Start manuell fortsetzen.`;
    notify(text);
  }
  function digibotHalt(reason,{locked=true}={}) {
    // Deliberate direct calls: emergency stop must work after closing the command gate.
    if(!digibotDesktopJoining)digibotDesktopCancel(reason);
    digibotAccountQueue.cancel(reason);
    digibotHistory.cancel(reason);
    const scene=digibotRawScene();
    try { scene?.deps?.commands?.partnerStop?.(); scene?.approach?.cancel?.();
      const st=window.dmo?.store?.getState?.(), id=scene?.controlledId?.()||st?.me?.tamerEntityId;
      const me=window.dmo?.net?.state?.entities?.get?.(id);
      if (st?.screen==='world'&&me) scene?.tapGround?.(me.x,me.y);
    } catch {}
    for(const opts of digibotKeys.values())window.dispatchEvent(new KeyboardEvent('keyup',opts));digibotKeys.clear();
    digibotTamer.want=false;digibotTamer.since=0;
    digibotCombat.reset();digibotDodgeReset();digibotAttackTravel=null;digibotBossWalk=null;digibotChannelPeace=null;digibotChannelCleanup=null;lr.scanPeace=false;
    clearInterval(bot.timer); bot.questIdle=false;bot.on=false;bot.attackedId=null;bot.engage=null;bot.status=reason;
    ss.set('digibot.go',null);ss.set('digibot.login',null);
    group.mirroring=false;if(locked)group.leaderPos=null;group.lastPos=null;group.worldAt=0;
    digibotCombatPlace=null;autopilot.reset();autopilot.route=null;autopilot.tp=null;autopilot.mapTalk=null;
    hunt.goal=null;hunt.seenAt=0;wb.goal=null;wb.seenAt=0;farm.reset();lr.boss=null;
    digibotFormation.reset();digibotCurrentObjective=null;
    schedule();
  }
  const digibotCore=createDigiBotCore({state:()=>window.dmo?.store?.getState?.(),halt:digibotHalt,signal:digibotSignal,trace:digibotHistory.breadcrumb,diagnostics:()=>({...digibotHistory.export(),evolution:digibotEvolutionSnapshot(),accountQueue:digibotAccountQueue.summary(),events:digibotEventSnapshot(),combat:digibotInputSnapshot(),navigation:digibotNavigationSnapshot(),dailies:digibotDailiesSnapshot(),desktop:digibotDesktopSnapshot()}),network:()=>digibotNetworkState(window.dmo?.net,window.dmo?.store?.getState?.())});
  const digibotProxyCache=new WeakMap();
  function digibotCommands(raw) {
    if(!raw)return raw;if(digibotProxyCache.has(raw))return digibotProxyCache.get(raw);
    const proxy=new Proxy(raw,{get(target,key){const value=Reflect.get(target,key,target);if(typeof value!=='function')return value;
      if(/^(request|list|get)|^teleportStops$/.test(String(key)))return value.bind(target);
      return (...args)=>digibotCore.action(String(key),(...xs)=>digibotInvoke(String(key),value.bind(target),xs),args);
    }});digibotProxyCache.set(raw,proxy);return proxy;
  }
  const digibotSceneCache=new WeakMap();
  function digibotScene(raw) {
    if(!raw)return raw;if(digibotSceneCache.has(raw))return digibotSceneCache.get(raw);
    const proxy=new Proxy(raw,{get(target,key){const value=Reflect.get(target,key,target);
      if(key==='deps')return {...value,commands:digibotCommands(value?.commands)};
      if(typeof value!=='function')return value;
      if(['select','tapGround','approachNpc','interact'].includes(key))return (...args)=>digibotCore.action(String(key),(...xs)=>digibotInvoke(String(key),value.bind(target),xs),args);
      return value.bind(target);
    }});digibotSceneCache.set(raw,proxy);return proxy;
  }
  function digibotSend(message) {
    if(!group.bus||!group.active())return;
    try {group.bus.postMessage(digibotCore.envelope(message,group.slot(),accounts.leader));} catch {}
  }
  function digibotClearLegacyPasswords() {
    try {
      const legacy=JSON.parse(localStorage.getItem('digibot.accounts')||'null');
      if(legacy&&Array.isArray(legacy.list)){legacy.list=legacy.list.map(a=>({...a,pass:''}));localStorage.setItem('digibot.accounts',JSON.stringify(legacy));}
      digibotQueuePasswords.clear();panel?.querySelectorAll('[data-queue-password]').forEach(el=>{el.value='';});
      saveAcc();renderAccounts(getStore()?.getState?.());
      digibotCore.record('Gespeicherte Passwörter entfernt');
    } catch {digibotSignal('Passwörter konnten nicht entfernt werden');}
  }
  function digibotExport() {
    const url=URL.createObjectURL(new Blob([digibotCore.export()],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='digibot-diagnose.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  // Presets: Bot-Einstellungen als .txt speichern und wieder laden. Accounts (Benutzer/Passwörter) liegen getrennt in
  // digibot.accounts und kommen nie hinein; Panel-Ansicht und Rundenfortschritt bleiben ebenfalls draußen.
  const PRESET_SKIP=['apSweepMap'];
  const presetKeyOk=(k)=>!UI_KEYS.includes(k)&&!PRESET_SKIP.includes(k)&&!/user|pass|pw|login|account|token|session/i.test(k);
  function digibotPresetSave(){
    let name='';
    try{name=window.prompt('Name für das Preset:',MODES[modeOf()]||'Preset');}catch{name='Preset';}
    if(name===null)return;
    name=String(name||'Preset').trim().slice(0,60)||'Preset';
    const settings=Object.fromEntries(Object.entries(JSON.parse(JSON.stringify(cfg))).filter(([k])=>presetKeyOk(k)));
    const text=`DigiBot-Preset\nName: ${name}\nGespeichert: ${new Date().toLocaleString('de-DE')}\n\n`+
      JSON.stringify({format:'digibot-preset/1',name,settings},null,2)+'\n';
    const url=URL.createObjectURL(new Blob([text],{type:'text/plain'}));
    const a=document.createElement('a');a.href=url;a.download=`digibot-preset-${name.replace(/[^\w\-äöüÄÖÜß ]+/g,'').replace(/\s+/g,'-')||'preset'}.txt`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    logEvent('bot',`Preset „${name}“ gespeichert`);
  }
  function digibotPresetParse(text){
    const s=String(text||''),i=s.indexOf('{'),j=s.lastIndexOf('}');
    if(i<0||j<i)return null;
    let p;try{p=JSON.parse(s.slice(i,j+1));}catch{return null;}
    if(!digibotRecord(p)||p.format!=='digibot-preset/1'||!digibotRecord(p.settings))return null;
    return {name:String(p.name||'Preset').slice(0,60),settings:Object.fromEntries(Object.entries(p.settings).filter(([k])=>presetKeyOk(k)&&Object.hasOwn(CFG_DEFAULTS,k)))};
  }
  function digibotPresetApply(text){
    const p=digibotPresetParse(text);
    if(!p){digibotSignal('Preset-Datei nicht lesbar – bitte eine mit „Preset speichern“ erstellte .txt wählen');return false;}
    const keep=Object.fromEntries([...UI_KEYS,...PRESET_SKIP].map(k=>[k,cfg[k]]));
    applyCfg({...JSON.parse(JSON.stringify(cfg)),...p.settings});Object.assign(cfg,keep);
    saveCfg();syncCfgInputs();farm.reset();autopilot.reset();schedule();
    logEvent('bot',`Preset „${p.name}“ geladen`);
    return true;
  }
  function digibotPresetLoad(){
    const input=document.createElement('input');input.type='file';input.accept='.txt,text/plain';
    input.addEventListener('change',async()=>{const f=input.files?.[0];if(f)digibotPresetApply(await f.text());});
    input.click();
  }
  function digibotResetContext(st) {
    const key=`${st?.session?.username||''}|${st?.world?.mapId||''}|${st?.world?.channel||1}`;
    if(key!==digibotLastContext) {
      digibotCombatPlace=null;digibotCombat.reset();digibotDodgeReset();digibotAttackTravel=null;digibotBossWalk=null;
      digibotLastContext=key;autopilot.nav=null;autopilot.route=null;refusal.repos=null;
      bot.attackedId=null;bot.engage=null;digibotFormation.reset();digibotCurrentObjective=null;
      hunt.seenAt=0;wb.seenAt=0;hunt.polledAt=0;hunt.busy=false;hunt.pollToken=(hunt.pollToken||0)+1;
      digibotNavigationContext(st);
      digibotCore.record('Spielkontext gewechselt',{map:st?.world?.mapId,channel:st?.world?.channel});
    }
    if(digibotLastLeader===null)digibotLastLeader=accounts.leader;
    else if(digibotLastLeader!==accounts.leader){digibotLastLeader=accounts.leader;group.peers.clear();group.leaderPos=null;group.talks=[];group.handled.clear();autopilot.reset();digibotFormation.reset();}
  }
  function digibotObserve() {
    const st=window.dmo?.store?.getState?.();
    digibotCore.inspect();
    digibotHistory.observe(digibotHistoryState());
    if(st?.challenge&&!digibotCore.latched)digibotCore.stop('Anwesenheitskontrolle – bitte selbst beantworten',true);
    if(window.dmo?.store!==digibotStore && window.dmo?.store?.subscribe) {
      digibotStore=window.dmo.store;digibotCore.touch();digibotStore.subscribe(()=>{digibotCore.touch();digibotCore.inspect();digibotHistory.observe(digibotHistoryState());});
    }
    const net=window.dmo?.net;
    if(net?.on&&net!==digibotNet){digibotNet=net;
      for(const type of ['dropped','rejoining','kicked','disconnected'])net.on(type,()=>{if(net===digibotNet&&digibotCore.armed)digibotCore.stop('Verbindung unterbrochen – manuell fortsetzen',true);});
      net.on('map:leave',e=>{if(net!==digibotNet)return;digibotHistory.cancel('Raum verlassen',['channel','teleport']);digibotCombat.reset();autopilot.nav=null;autopilot.route=null;digibotCore.record('Raum verlassen',{action:e?.reason,map:e?.mapId},true);if(e?.reason==='disconnected'&&digibotCore.armed)digibotCore.stop('Verbindung unterbrochen – manuell fortsetzen',true);});
      net.on('map:enter',()=>{if(net===digibotNet){digibotCore.touch();digibotCore.record('Raum beigetreten',{},true);}});
      net.on('me',list=>{if(net!==digibotNet)return;for(const e of Array.isArray(list)?list:[]){digibotHistory.event(e,digibotHistoryState());digibotPhoneServerEvent(window.dmo?.store?.getState?.(),e);if(e?.t==='attackAck')digibotCombat.ack();}});
      net.on('evs',list=>{if(net!==digibotNet)return;for(const e of Array.isArray(list)?list:[]){digibotHistory.event(e,digibotHistoryState());digibotPhoneServerEvent(window.dmo?.store?.getState?.(),e);digibotCombat.noteDamage(e);if(e?.t==='die'&&e.id){digibotDeaths.set(e.id,Date.now());digibotCore.record('Tod bestätigt',{target:e.id},true);}}});
    }
    const now=Date.now();if(now-digibotLastPrune<10000)return;digibotLastPrune=now;
    for(const [id,t]of digibotDeaths)if(now-t>60000)digibotDeaths.delete(id);
    for(const [id,p]of group.peers)if(now-p.seen>GROUP_STALE_MS*3)group.peers.delete(id);
    for(const map of [blacklist,refusal.ban,autopilot.failed,autopilot.avoidSpots,farm.chBan,wb.skip])for(const [k,v]of map)if(typeof v==='number'&&v<now)map.delete(k);
    for(const map of [mobHome,refusal.tries,seen,bossSeen,wb.upSince,farm.known])while(map.size>500)map.delete(map.keys().next().value);
    if(huntSeen.size>500)huntSeen.clear();
  }
  function digibotObjective(st) {
    if(hunt.goal&&cfg.hunt)return {kind:'event',key:hunt.goal.key,mapId:hunt.goal.mapId,channel:hunt.goal.ch,boss:hunt.goal.boss};
    if(wb.goal&&cfg.wboss){const g=wb.goal;return {kind:'world',key:g.key,mapId:g.b.map,channel:g.ch,boss:g.b.species,...farmSpot(g.b)};}
    if(cfg.farm&&farm.goal){const g=farm.goal,b=farmSelected().find(x=>x.map===g.map&&x.index===g.index);if(b)return {kind:'farm',key:`${g.map}/${g.index}/${g.ch}`,mapId:g.map,channel:g.ch,boss:b.species,...farmSpot(b)};}
    return null;
  }
  function digibotSharedFocus(sc) {
    if(!cfg.independentGroup||group.role()!=='follower')return null;
    const L=groupLeader(),o=L?.objective,st=getStore()?.getState?.();
    if(!o||!L.bot||o.mapId!==st?.world?.mapId||o.channel!==(st?.world?.channel??1))return null;
    return sc?.mobs?.find(m=>!m.banned&&(m.species===o.boss||m.species.startsWith(o.boss+'_')))||null;
  }
  function digibotPoint(st,key,center,radius=120) {
    if(!group.active()||digibotMechanicActive(st,digibotRawScene()))return null;
    const me=controlled(st),field=me&&pathField(st,me,Math.max(1000,Math.hypot(me.x-center.x,me.y-center.y)+500));
    if(!field)return null;const zones=dangerZones();
    const peers=[...group.peers.values()].filter(p=>fresh(p,Date.now())&&p.mapId===st.world?.mapId&&p.channel===(st.world?.channel??1)&&p.reservation?.key===key).map(p=>p.reservation);
    return digibotFormation.point(key,center,group.slot(),p=>pathFree(field,p)&&!zones.some(z=>zoneDist(z,p).d<32),peers,radius);
  }
  function digibotSharedStep(st,sc,now) {
    if(!cfg.independentGroup||group.role()!=='follower'||!bot.on)return null;
    const L=groupLeader(now),o=L?.objective;
    if(!L?.bot||!o||!['event','world','farm'].includes(o.kind)||typeof o.mapId!=='string'||typeof o.boss!=='string')return null;
    digibotCurrentObjective=o;
    if(sc?.attackers?.length)return null; // self-defence has priority over delayed travel
    const key=`${o.kind}/${o.key}/${o.mapId}/${o.channel}`;
    if(st.world?.mapId!==o.mapId||(st.world?.channel??1)!==o.channel) {
      const delay=digibotFormation.delay(key,group.slot());
      if(delay>0)return `Gruppe: eigener Aufbruch in ${(delay/1000).toFixed(1)} s`;
      if(st.world?.mapId!==o.mapId){const tr=travel(st,o.mapId,now);return tr===true?'Gruppe: Zielkarte erreicht':`Gruppe: ${tr}`;}
      const sw=farmSwitch(st,sc,o.mapId,o.mapId,o.channel,now,false);if(!sw.done)return `Gruppe: ${sw.status}`;
    }
    const boss=digibotSharedFocus(sc);
    if(boss){if(st.target?.id!==boss.id&&bot.can('select',SELECT_GAP_MS,now)){bot.lastPress.select=now;worldScene()?.select?.(boss.id);return 'Gruppe: gemeinsamer Boss anvisiert';}return null;}
    if(digibotMechanicActive(st,digibotRawScene()))return 'Gruppe: Bossmechanik hat Vorrang vor Warteplatz';
    if(Number.isFinite(o.x)&&Number.isFinite(o.y)) {
      const p=digibotPoint(st,key,o),me=controlled(st);
      if(p&&me&&Math.hypot(me.x-p.x,me.y-p.y)>20){if(walkTo(st,p.x,p.y,now)==='stuck')digibotFormation.reject();return 'Gruppe: eigener Boss-Warteplatz';}
      return 'Gruppe: warte am gemeinsamen Bossziel';
    }
    return null; // event position unknown: normal follower search until boss seen
  }
  let digibotCombatPlace=null;
  function digibotPositionBoss(st,t,now) {
    if(!cfg.independentGroup||!group.active()||digibotMechanicActive(st,digibotRawScene()))return null;
    const en=window.dmo?.net?.state?.entities?.get?.(t.id);if(!en||!(en.flags&FLAG.Boss))return null;
    // One staging move per encounter; combat remains free to close to skill/melee range.
    const scene=digibotRawScene(),id=scene?.controlledId?.();
    if(id!==st.me?.tamerEntityId&&id!==st.me?.partner?.entityId)return null;
    const radius=id===st.me?.tamerEntityId?120:60;
    const key=`fight/${st.world?.mapId}/${st.world?.channel}/${t.id}`;
    if(digibotCombatPlace?.key===key&&(digibotCombatPlace.done||now-digibotCombatPlace.at>8000))return null;
    if(digibotCombatPlace?.key!==key)digibotCombatPlace={key,at:now,done:false};
    const p=digibotPoint(st,key,en,radius),me=controlled(st);if(!p||!me)return null;
    if(Math.hypot(me.x-p.x,me.y-p.y)<=20){digibotCombatPlace.done=true;return null;}
    if(walkTo(st,p.x,p.y,now)==='stuck')digibotFormation.reject();
    return 'Gruppe: eigene Position am Boss';
  }

  const digibotTamer={skill:'',want:false,since:0,last:0,cooldown:0,retryAt:0,attempts:0};
  function digibotTamerTick(st,now) {
    const p=st?.me?.partner,C=content(),sk=C?.tamers?.[st?.me?.tamerId]?.skill;
    if(digibotTamer.skill!==sk?.id){Object.assign(digibotTamer,{skill:sk?.id||'',want:false,since:0,last:0,cooldown:sk?.cooldownMs||0,retryAt:0,attempts:0});}
    digibotTamer.want=false;
    if(!cfg.tamerAuto||!bot.on||!digibotCore.allowed()||!sk||!p||p.fainted){digibotTamer.since=0;return;}
    const remaining=Math.max(0,(st.cooldowns?.tamer?.end||0)-performance.now());
    if(remaining>0){
      digibotTamer.since=0;
      if(!digibotTamer.last||digibotTamer.cooldown<=3000){digibotTamer.last=now;digibotTamer.cooldown=remaining;}
      digibotTamer.attempts=0;return;
    }
    if(now<digibotTamer.retryAt)return;
    if(digibotTamer.cooldown>3000){digibotTamer.last=0;digibotTamer.cooldown=0;}
    if(digibotTamer.attempts>=3){digibotTamer.attempts=0;digibotTamer.retryAt=now+30000;logEvent('warn','Tamer-Skill nicht bestätigt – erneute Prüfung in 30 s');return;}

    const ents=window.dmo?.net?.state?.entities,own=ents?.get?.(p.entityId);
    const allies=(st.party?.members||[]).filter(m=>!m.me&&m.here&&m.online!==false&&m.partnerEntityId).map(m=>ents?.get?.(m.partnerEntityId)).filter(e=>e&&own&&Math.hypot(e.x-own.x,e.y-own.y)<=(sk.range||128));
    const effectsFor=id=>(st.effects?.[id]||[]).filter(e=>!e.end||e.end>performance.now());
    const affected=[p.entityId,...(sk.scope==='party'?allies.map(e=>e.id):[])];
    const debuffed=affected.some(id=>effectsFor(id).some(e=>{const d=C.skills?.[e.id];return (d?.effects||[]).some(x=>x.pct<0)||d?.stunMs>0||d?.rootMs>0;}));
    // Avoid renewing an already active copy of the same ability.
    if(!sk.healPct && !sk.resetCooldowns && !sk.cleanse && affected.some(id=>effectsFor(id).some(e=>e.id===sk.id||e.id===`${sk.id}:damageReduction`)))return;
    const target=ents?.get?.(st.target?.id);
    const dangerous=!!own&&dangerZones().some(z=>zoneDist(z,own).d<24&&(zoneLeftMs(z)==null||zoneLeftMs(z)<2000));
    const skillsOnCooldown=SKILL_KEYS.filter(k=>skillOn(st,k)&&!healAt(st,k)).map(k=>skillOnKey(st,k)).filter(s=>s?.skill?.unlocked!==false&&s?.cdLeft>1000).length;
    const reason=digibotTamerDecision({skill:sk,partner:p,allies,target,fighting:inCombat(st),incoming:dangerous||shareIncoming(now),debuffed,skillsOnCooldown});
    if(!reason){digibotTamer.since=0;return;}
    digibotTamer.want=true;
    const partyId=st.party?.id||null;
    if(group.active()&&partyId){
      if(!digibotTamer.since){digibotTamer.since=now;groupPush(true);return;}
      // Let the intent reach other windows before electing one sender.
      if(now-digibotTamer.since<600+group.slot()*150)return;
      if(!digibotTamerElection({skillId:sk.id,slot:group.slot(),now,peers:[...group.peers.values()],partyId}))return;
    }
    const cmd=commands();if(typeof cmd?.tamerSkill!=='function')return;
    const sentAt=now;
    digibotTamer.retryAt=now+3000;digibotTamer.want=false;digibotTamer.since=0;
    digibotTamer.attempts++;cmd.tamerSkill();
    // Provisional claim covers propagation; server cooldown provides final confirmation.
    digibotTamer.last=sentAt;digibotTamer.cooldown=3000;
    groupPush(true);
    logEvent('bot',`Tamer-Skill angefordert: ${sk.name||sk.id} – ${reason}`);
  }

  function digibotHistoryState() {
    const st=window.dmo?.store?.getState?.(),net=window.dmo?.net,p=st?.me?.partner;
    const scene=digibotRawScene(),id=scene?.controlledId?.()||st?.me?.tamerEntityId;
    const actor=net?.state?.entities?.get?.(id);
    const cooldowns=Object.fromEntries(Object.entries(st?.cooldowns||{}).filter(([k])=>k==='tamer'||/^skill:[0-9]+$/.test(k)).slice(0,65).map(([k,v])=>[k,v?.end||0]));
    const effects=Object.fromEntries((st?.effects?.[p?.entityId]||[]).slice(0,100).map(e=>[e.id,e.end||0]));
    return {screen:st?.screen,map:st?.world?.mapId,room:st?.world?.roomId||net?.hello?.roomId,channel:st?.world?.channel,partner:p?.entityId,species:p?.species,target:st?.target?.id,hp:st?.target?.hp,x:actor?.x,y:actor?.y,cooldowns,effects,ready:digibotNetworkState(net,st)?.ready??!!(st?.screen==='world'&&p)};
  }
  function digibotTrackCommand(name,args=[]) {
    const st=window.dmo?.store?.getState?.();const snapshot=digibotHistoryState();
    if(name==='evolve')return digibotHistory.request('evolve',snapshot,{species:args[0],timeout:12000});
    if(name==='devolve')return digibotHistory.request('devolve',snapshot,{species:st?.me?.partner?.evolutions?.find(e=>!e.from)?.species,timeout:12000});
    if(name==='tamerSkill')return digibotHistory.request('tamer',snapshot,{skill:content()?.tamers?.[st?.me?.tamerId]?.skill?.id,timeout:5000});
    if(name==='switchChannel')return digibotHistory.request('channel',snapshot,{room:args[0]});
    if(name==='teleport')return digibotHistory.request('teleport',snapshot,{map:args[0]});
    if(name==='tapGround'&&args.every(Number.isFinite))return digibotHistory.request('move',snapshot,{x:args[0],y:args[1],timeout:Math.min(60000,Math.max(15000,Math.hypot(snapshot.x-args[0],snapshot.y-args[1])/60*1000+10000))});
    if(name==='attackTarget')return digibotHistory.request('attack',snapshot);
    return null;
  }
  function digibotInvoke(name,fn,args) {
    if(name==='select'){const s=digibotHistoryState();digibotCore.record('Zielwahl',{action:args[0]==null?'Ziel gelöscht':'Ziel gewählt',target:typeof args[0]==='string'?args[0]:undefined,map:s.map,channel:s.channel});}
    const id=digibotTrackCommand(name,args);
    try {
      const result=fn(...args);
      // Resolution only means the client call finished. It is NOT confirmation of game effect.
      if(result&&typeof result.then==='function')result.then(()=>{},e=>{if(id)digibotHistory.reject(id,e?.name||'Error');});
      return result;
    } catch(e){if(id)digibotHistory.reject(id,e?.name||'Error');throw e;}
  }
  function digibotTrackKey(code) {
    const st=window.dmo?.store?.getState?.(),s=digibotHistoryState();
    if(code==='Digit1')return digibotHistory.request('attack',s);
    if(/^Digit[2-6]$/.test(code)) {
      const ref=st?.me?.hotbar?.[Number(code.slice(5))-1];
      if(typeof ref==='string'&&/^skill:[0-9]+$/.test(ref)){const skill=st.me.partner?.skills?.[Number(ref.slice(6))];return digibotHistory.request('skill',s,{ref,skill:skill?.id,timeout:Math.min(60000,Math.max(8000,(skill?.castMs||content()?.skills?.[skill?.id]?.castMs||0)+digibotLatency(window.dmo?.net?.rttMs)+5000))});}
    }
    return null;
  }
  function digibotRenderHistory() {
    const el=panel?.querySelector('[data-f="command-history"]');if(!el)return;
    const names={requested:'angefordert',confirmed:'bestätigt',observed:'Zustandsänderung gesehen',cooldown_observed:'gemeinsame Abklingzeit gesehen',possible_rejection:'mögliche Ablehnung',progress:'Bewegung gesehen',rejected:'abgelehnt',timed_out:'unbestätigt abgelaufen',effect_unobserved:'Wirkung nicht eindeutig gesehen',cancelled:'abgebrochen',superseded:'ersetzt'};
    const rows=digibotHistory.recent(5);
    const summary=rows.length?rows.map(c=>`${c.id} · ${c.command}: ${names[c.status]||c.status}`).join('\n'):'Noch keine Befehle erfasst.';
    if(el.textContent!==summary)el.textContent=summary;
  }

  let digibotQueueLaunching=false;
  const digibotAccountQueue=createDigiBotAccountQueue();
  function digibotQueueStatus(message) {bot.status=message;digibotCore.record('Account-Runde',{action:message,slot:digibotAccountQueue.slot},true);schedule();}
  function digibotQueueQuiesce() {
    clearInterval(bot.timer);bot.on=false;bot.attackedId=null;bot.engage=null;bot.lastPress={};
    digibotHistory.cancel('Account-Wechsel');digibotCombat.reset();
    const scene=digibotRawScene(),st=window.dmo?.store?.getState?.();
    try{scene?.deps?.commands?.partnerStop?.();const me=controlled(st);if(me)scene?.tapGround?.(me.x,me.y);}catch{}
    autopilot.reset();autopilot.newRun();autopilot.avoidSpots.clear();autopilot.route=null;autopilot.sweepAt=null;autopilot.batchPhase='do';
    autopilot.lastEvolve=0;autopilot.lastSwitch=0;autopilot.lastTalk=0;autopilot.lastTap=0;autopilot.evoNote=null;autopilot.evoReasonKey=null;
    blacklist.clear();refusal.ban.clear();refusal.tries.clear();refusal.repos=null;lr.goal=null;lr.boss=null;lr.calcAt=0;
    hunt.goal=null;wb.goal=null;farm.reset();digibotFormation.reset();
    digibotCore.loginMode(true);
  }
  function digibotQueueStart(resume=false) {
    if(digibotAccountQueue.active)return;
    if(group.active()){digibotSignal('Quest-Runde läuft in einem Fenster. Zuerst bei „Dieses Fenster ist“ die Option „keine Gruppe“ wählen');return;}
    reloadAcc();const st=window.dmo?.store?.getState?.();
    if(!st?.challenge&&st?.session?.username&&st.screen==='world')cfgProfile(st);
    const result=resume?{type:digibotAccountQueue.resume()?'started':'none'}:digibotAccountQueue.start(accounts.list.map((a,slot)=>({...a,slot})).filter(a=>a.on&&a.user.trim()));
    if(result.type!=='started'){if(result.reason)digibotSignal(result.reason);return;}
    if(!digibotCore.start(digibotManual,true)){digibotAccountQueue.pause('Manuelle Freigabe oder Anmeldung erforderlich');return;}
    digibotNotice?.remove();digibotNotice=null;
    digibotQueueQuiesce();digibotQueueStatus('Quest-Runde gestartet – Accounts nacheinander');digibotQueueTick();
  }
  function digibotQueueBegin(token) {
    const st=window.dmo?.store?.getState?.();if(token!==digibotAccountQueue.generation||!digibotAccountQueue.active||!digibotCore.armed||digibotCore.latched)return;
    if(String(st?.session?.username||'').trim().toLowerCase()!==digibotAccountQueue.user)return;
    cfgProfile(st);
    noteCharacter(st,Date.now());
    cfg.autopilot=true;cfg.farm=false;cfg.dungeon=false;cfg.questMode=false;
    if(!digibotCore.loginMode(false))return;
    if(!bot.on){digibotQueueLaunching=true;try{bot.toggle(true);}finally{digibotQueueLaunching=false;}}
    if(!bot.on){digibotCore.stop('Autopilot konnte nicht gestartet werden',true);return;}
    digibotAccountQueue.began(token);digibotQueueStatus(`Quest-Runde: Account ${digibotAccountQueue.slot+1} – Autopilot läuft`);
  }
  function digibotQueueTick() {
    if(!digibotAccountQueue.active)return;
    digibotCore.run('Account-Runde',30,()=>{
      if(digibotAccountQueue.phase==='running'&&!cfg.autopilot){digibotCore.stop('Quest-Runde gestoppt: Betriebsart geändert',true);return;}
      const st=window.dmo?.store?.getState?.(),slot=digibotAccountQueue.slot,acc=accounts.list[slot];
      const action=digibotAccountQueue.step({screen:st?.screen,user:st?.session?.username,character:charName(st),characters:st?.session?.characters,busy:st?.session?.busy,error:!!st?.session?.error,challenge:!!st?.challenge,disconnected:st?.screen==='disconnected',ready:digibotNetworkState(window.dmo?.net,st)?.ready??!!st?.me?.partner,configuredUser:acc?.user,hasPassword:!!digibotQueuePasswords.get(String(acc?.user||'').trim().toLowerCase())});
      if(action.type==='pause'){digibotCore.stop(action.reason,true);return;}
      if(action.type==='none')return;
      if(action.type==='begin'){digibotQueueBegin(action.generation);return;}
      const client=digibotCommands(window.dmo?.client);
      const fn={logout:'logout',login:'login',enter:'enterWorld'}[action.type];
      if(typeof client?.[fn]!=='function'){digibotAccountQueue.pause('Client-Funktion für Account-Wechsel fehlt');digibotCore.stop('Account-Wechsel wird vom Client nicht unterstützt',true);return;}
      digibotQueueStatus(`Quest-Runde: Account ${slot+1} – ${{logout:'Abmelden',login:'Anmelden',enter:'Charakter betreten'}[action.type]}`);
      try{
        const result=action.type==='login'?client.login(acc.user.trim(),digibotQueuePasswords.get(acc.user.trim().toLowerCase())):action.type==='enter'?client.enterWorld(action.characterId):client.logout();
        Promise.resolve(result).then(()=>digibotAccountQueue.settled(action.generation),()=>{if(digibotAccountQueue.settled(action.generation,true))digibotCore.stop('Account-Wechsel fehlgeschlagen – im Spiel prüfen',true);});
      }catch{digibotAccountQueue.settled(action.generation,true);digibotCore.stop('Account-Wechsel fehlgeschlagen – im Spiel prüfen',true);}

    });
  }
  function digibotQueueComplete(st) {
    if(!digibotAccountQueue.active||digibotAccountQueue.phase!=='running')return false;
    if(String(st.session?.username||'').trim().toLowerCase()!==digibotAccountQueue.user){digibotCore.stop('Quest-Runde gestoppt: Account stimmt nicht überein',true);return true;}
    const actor=window.dmo?.net?.state?.entities?.get?.(st.me?.partner?.entityId);
    if(inCombat(st)||(actor?.flags&FLAG.InCombat)){bot.status='Quest-Runde: warte auf Kampfende vor dem Account-Wechsel';return true;}
    const pending=Object.values(st.me?.quests||{}).some(q=>q.state===2);
    const now=Date.now(),failed=[...autopilot.failed.values(),...autopilot.avoidSpots.values()].some(until=>until>now);
    if(pending||failed){digibotCore.stop(pending?'Quest-Runde pausiert: fertige Quests warten noch auf Abgabe':'Quest-Runde pausiert: Aufgaben wurden vorübergehend übersprungen',true);return true;}
    const outcome=digibotAccountQueue.complete();
    if(outcome.type==='done'){if(bot.waitForEvents('Quest-Runde abgeschlossen'))return true;digibotCore.stop('Quest-Runde abgeschlossen – alle ausgewählten Accounts bearbeitet',false);return true;}
    if(outcome.type==='next'){digibotQueueQuiesce();digibotQueueStatus(`Quest-Runde: nächster Account ${outcome.slot+1}`);return true;}
    return false;
  }
  function digibotQueueRender() {
    const el=panel?.querySelector('[data-f="account-queue"]');if(!el)return;
    const s=digibotAccountQueue.summary();
    panel.querySelectorAll('[data-act^="grp-"], [data-gmode], [data-accslot]').forEach(control=>{control.disabled=digibotAccountQueue.active;});
    const labels={idle:'Bereit',switching:'Account prüfen','await-login':'Abmeldung läuft','await-auth':'Anmeldung läuft','await-world':'Charakter lädt',starting:'Autopilot startet',running:'Quests laufen',paused:'Pausiert',done:'Abgeschlossen'};
    el.textContent=`${labels[s.phase]||s.phase} · ${s.index}/${s.total} Accounts bearbeitet${s.slot!==undefined?` · Account ${s.slot+1}`:''}${s.reason?` · ${s.reason}`:''}`;
  }

  window.__digibotDesktopVersion=1;
  const CDIGI_DESKTOP_KEY='digibot.desktop.launch.v1';
  let digibotDesktop=null,digibotDesktopControl=null,digibotDesktopJoining=false,digibotDesktopMessage='';
  const digibotDesktopWindows=new Map();
  function digibotDesktopRead(){try{const p=JSON.parse(localStorage.getItem(CDIGI_DESKTOP_KEY)||'null');return digibotDesktopValid(p,Date.now())?p:null;}catch{return null;}}
  function digibotDesktopWrite(p){try{localStorage.setItem(CDIGI_DESKTOP_KEY,JSON.stringify(p));return true;}catch{digibotDesktopStatus('Desktopstart: gemeinsamer Browser-Speicher ist nicht verfügbar.');return false;}}
  function digibotDesktopPublish(p,d,state){try{localStorage.setItem(digibotDesktopMemberKey(p.id,d.slot),JSON.stringify(state));return true;}catch{groupSend('stop');digibotCore.stop('Desktopstart: Fensterstatus konnte nicht gespeichert werden',true);return false;}}
  const digibotDesktopMemberKey=(id,slot)=>`${CDIGI_DESKTOP_KEY}.${id}.${slot}`;
  function digibotDesktopMembers(p){return p.slots.map(a=>{try{return JSON.parse(localStorage.getItem(digibotDesktopMemberKey(p.id,a.slot))||'null');}catch{return null;}}).filter(Boolean);}
  function digibotDesktopStatus(text){digibotDesktopMessage=text+(digibotDesktop?.layoutOk===false?' · Browser begrenzt die Fensterpositionierung.':'');const el=panel?.querySelector('[data-f="desktop-launch"]');if(el)el.textContent=digibotDesktopMessage;}
  function digibotDesktopCancel(reason='Desktopstart abgebrochen',force=false){
    const p=digibotDesktopRead();
    if(!p||p.phase==='running'||p.phase==='cancelled'||!force&&digibotDesktop?.id!==p.id&&digibotDesktopControl!==p.id)return;
    p.phase='cancelled';p.reason=String(reason).slice(0,200);digibotDesktopWrite(p);digibotDesktopStatus(p.reason);
  }
  function digibotDesktopPlace(win,rect){
    try{win.moveTo(rect.left,rect.top);win.resizeTo(rect.width,rect.height);return ![['screenX',rect.left],['screenY',rect.top],['outerWidth',rect.width],['outerHeight',rect.height]].some(([key,value])=>Number.isFinite(win[key])&&Math.abs(win[key]-value)>32);}catch{return false;}
  }
  function digibotDesktopJoin(id,slot){
    const p=digibotDesktopRead();
    if(!p||p.id!==id||p.phase==='cancelled'||p.phase==='running'||!p.slots.some(a=>a.slot===slot))return false;
    if(digibotDesktop?.id===id&&digibotDesktop.slot===slot)return true;
    if(digibotAccountQueue.active)return false;
    digibotDesktopJoining=true;
    try{if(bot.on)digibotCore.stop('Desktopstart vorbereiten',false);}finally{digibotDesktopJoining=false;}
    ss.set('digibot.slot',String(slot));ss.set('digibot.group','1');ss.set('digibot.go',null);
    digibotDesktop={id,slot,armed:false,started:false,committed:false,timer:null};
    group.peers.clear();group.talks=[];group.handled.clear();group.done=[];group.cur=null;group.invited.clear();
    window.name=`digibot-slot-${slot}`;
    const index=p.slots.findIndex(a=>a.slot===slot),rect=p.tiles?.[index];
    if(rect&&[rect.left,rect.top,rect.width,rect.height].every(Number.isFinite))digibotDesktop.layoutOk=digibotDesktopPlace(window,rect);
    groupPush(true);schedule();return true;
  }
  function digibotDesktopBootstrap(){
    const request=ss.get('digibot.desktop.request');ss.set('digibot.desktop.request',null);
    if(request)digibotDesktopJoin(request,group.slot());
  }
  window.addEventListener('message',e=>{
    const m=e.data;
    if(e.origin!==location.origin||!m||m.kind!=='digibot-desktop-prepare'||!Number.isInteger(m.slot)||window.name!==`digibot-slot-${m.slot}`)return;
    const p=digibotDesktopRead();if(!p||p.id!==m.id)return;
    digibotDesktopJoin(m.id,m.slot);
  });
  function digibotDesktopStart(){
    if(!digibotManual)return;
    if(digibotAccountQueue.active){digibotDesktopStatus('Zuerst die laufende Account-Runde stoppen.');return;}
    reloadAcc();const roster=digibotDesktopRoster(accounts),tiles=digibotDesktopTiles(window.screen);
    if(roster.error){digibotDesktopStatus(roster.error);return;}
    if(!tiles){digibotDesktopStatus('Vierer-Anordnung benötigt einen Desktop-Bildschirm mit mindestens 800 × 600 Pixeln.');return;}
    const st=getStore()?.getState?.(),user=String(st?.session?.username||'').trim().toLowerCase();
    const mine=roster.slots.find(a=>a.user.toLowerCase()===user)||(!user?roster.slots[0]:null);
    if(!mine){digibotDesktopStatus('Dieses Fenster muss mit einem der vier ausgewählten Accounts angemeldet sein.');return;}
    digibotDesktopCancel('Durch neuen Desktopstart ersetzt',true);
    const now=Date.now(),p={version:1,id:`${now.toString(36)}-${Math.random().toString(36).slice(2)}`,created:now,expires:now+600000,leader:accounts.leader,slots:roster.slots,tiles,phase:'waiting',startAt:0};
    digibotDesktopControl=p.id;
    if(!digibotDesktopWrite(p))return;
    accounts.mirror=false;accounts.leadBoss=false;accounts.dungeon=false;accounts.serve=false;accounts.popup=true;saveAcc();
    cfg.autopilot=true;cfg.farm=false;cfg.dungeon=false;cfg.questMode=false;saveCfg();
    digibotDesktopJoin(p.id,mine.slot);
    if(st?.screen==='world'&&st.me?.partner)digibotCore.enablePassive(true);
    let blocked=0;
    // All window.open calls stay inside the trusted click, before any waits.
    for(let i=0;i<p.slots.length;i++){
      const a=p.slots[i],r=tiles[i];if(a.slot===mine.slot)continue;
      const features=`popup=yes,left=${r.left},top=${r.top},width=${r.width},height=${r.height},resizable=yes,scrollbars=yes`;
      let w=digibotDesktopWindows.get(a.slot);
      try{if(!w||w.closed)w=window.open('',`digibot-slot-${a.slot}`,features);}catch{w=null;}
      if(!w){blocked++;continue;}
      digibotDesktopWindows.set(a.slot,w);digibotDesktopPlace(w,r);
      try{
        if(!w.location.href||w.location.href==='about:blank'||!w.__digibotDesktopVersion)w.location.href=`${location.origin}${location.pathname}#dbslot=${a.slot}&dblaunch=${p.id}`;
        else w.postMessage({kind:'digibot-desktop-prepare',id:p.id,slot:a.slot},location.origin);
      }catch{blocked++;}
    }
    if(blocked){digibotDesktopCancel(`${blocked} Fenster blockiert. Pop-ups für die Spielseite erlauben und Desktopstart erneut drücken.`,true);return;}
    digibotDesktopStatus('Vier Fenster vorbereitet. Falls nötig anmelden; danach Party bilden und gemeinsam starten.');
    logEvent('bot','Desktopstart: vier Accounts, Party und gemeinsamer Autopilot vorbereitet');
    digibotDesktopTick();
  }
  function digibotDesktopLocalState(p,st){
    const d=digibotDesktop,expected=p.slots.find(a=>a.slot===d.slot),user=String(st?.session?.username||'').trim();
    let reason='';
    if(digibotAccountQueue.active)reason='Account-Runde läuft in diesem Fenster';
    else if(digibotCore.latched||st?.challenge)reason='manuell pausiert – erst in diesem Fenster freigeben';
    else if(user.toLowerCase()!==expected.user.toLowerCase())reason=`mit ${expected.user} anmelden`;
    else if(st?.screen!=='world'||!st.me?.partner)reason='Charakter betreten und Spielwelt laden';
    else if(!charName(st))reason='Charaktername noch nicht verfügbar';
    const net=digibotNetworkState(window.dmo?.net,st);
    if(!reason&&net&&(net.transfer||!net.ready))reason='Verbindung oder Kartenwechsel noch nicht bereit';
    return {id:p.id,slot:d.slot,user,name:charName(st)||'',seen:Date.now(),ready:!reason,reason,armed:d.armed&&digibotCore.armed&&!digibotCore.latched,started:d.started,partyId:st?.party?.id||null,partyNames:(st?.party?.members||[]).map(m=>String(m.name||'').toLowerCase())};
  }
  function digibotDesktopPartyAllowed(st,now){
    const p=digibotDesktopRead();
    if(!p||!digibotDesktop||digibotDesktop.id!==p.id||p.phase==='running'||p.phase==='cancelled')return true;
    return digibotDesktopBarrier(p,digibotDesktopMembers(p),now,{party:false}).ok;
  }
  function digibotDesktopFinish(p){
    const d=digibotDesktop,now=Date.now(),current=digibotDesktopRead(),st=getStore()?.getState?.();
    if(!d||d.id!==p.id||d.started||!current||current.id!==p.id||current.phase!=='scheduled')return;
    if(now-current.startAt>3000||digibotCore.latched||!digibotCore.armed||!digibotDesktopLocalState(current,st).ready||!digibotDesktopBarrier(current,digibotDesktopMembers(current),now,{armed:true}).ok){digibotDesktopCancel('Gemeinsamer Start abgebrochen: Fenster oder Party nicht mehr bereit.');return;}
    cfg.autopilot=true;cfg.farm=false;cfg.questMode=false;cfg.dungeon=false;
    groupPush(true);if(!bot.on)bot.toggle(true);
    d.started=bot.on;
    if(!d.started){digibotDesktopCancel('Autopilot konnte nicht in allen Fenstern gestartet werden.');return;}
    if(!digibotDesktopPublish(p,d,digibotDesktopLocalState(current,st)))return;
    const completed=digibotDesktopMembers(current);
    if(completed.length===4&&completed.every(m=>m.started===true)){current.phase='running';digibotDesktopWrite(current);d.committed=true;}
    groupPush(true);digibotDesktopStatus('Autopilot gemeinsam gestartet.');
  }
  function digibotDesktopTick(){
    const p=digibotDesktopRead(),d=digibotDesktop,now=Date.now();
    if(!d){if(p?.id===digibotDesktopControl)digibotDesktopStatus(p.reason||'Desktopstart wird vorbereitet');return;}
    if(!p||p.id!==d.id||p.phase==='cancelled'){
      if(!d.committed){
        digibotDesktopJoining=true;try{if(d.armed||d.started)digibotCore.stop(p?.reason||'Desktopstart abgelaufen oder abgebrochen',false);}finally{digibotDesktopJoining=false;}
      }
      digibotDesktopStatus(p?.reason||'Desktopstart abgelaufen oder ersetzt.');digibotDesktop=null;return;
    }
    if(p.phase==='running'){d.committed=true;digibotDesktopStatus('Vierer-Party bereit – Autopilot in allen Fenstern gestartet.');return;}
    if(p.phase==='scheduled'&&now>p.startAt+3500){digibotDesktopCancel('Nicht alle Fenster haben rechtzeitig gestartet – gemeinsamen Start erneut auslösen.');return;}
    reloadAcc();
    if(accounts.leader!==p.leader||p.slots.some(a=>!accounts.list[a.slot]?.on||accounts.list[a.slot].user.trim().toLowerCase()!==a.user.toLowerCase())){digibotDesktopCancel('Account-Auswahl während des Desktopstarts geändert.');return;}
    const st=getStore()?.getState?.();let local=digibotDesktopLocalState(p,st);
    if(local.ready&&p.phase==='arming'&&!d.armed){d.armed=digibotCore.start(false);local=digibotDesktopLocalState(p,st);}
    if(!digibotDesktopPublish(p,d,local))return;
    groupPush(true);
    if(local.ready)digibotCore.runPassive('Gruppe',20,()=>groupParty(st,now));
    let members=digibotDesktopMembers(p),barrier=digibotDesktopBarrier(p,members,now,{armed:p.phase!=='waiting'});
    if(d.slot===p.leader){
      if(p.phase==='waiting'&&barrier.ok){p.phase='arming';digibotDesktopWrite(p);}
      else if(p.phase==='arming'&&barrier.ok){p.phase='scheduled';p.startAt=now+2000;digibotDesktopWrite(p);}
      else if(p.phase==='scheduled'&&barrier.ok&&members.every(m=>m.started)){p.phase='running';digibotDesktopWrite(p);d.committed=true;}
    }
    digibotDesktopStatus(p.phase==='scheduled'?'Vierer-Party vollständig – gemeinsamer Start in Kürze':barrier.ok?'Vierer-Party bereit – Startfreigaben sammeln':barrier.reason);
    if(p.phase==='scheduled'&&d.armed&&!d.started&&!d.timer){d.timer=digibotCore.defer(()=>digibotDesktopFinish(p),Math.max(0,p.startAt-now));}
  }
  function digibotDesktopResume(){if(digibotManual&&digibotCore.enablePassive(true))digibotDesktopTick();}

  function digibotDesktopSnapshot(){
    const p=digibotDesktopRead();if(!p)return {phase:'idle'};
    const members=digibotDesktopMembers(p);
    return {phase:p.phase,slot:digibotDesktop?.slot??null,leader:p.leader,selected:p.slots.map(a=>a.slot),ready:members.filter(m=>m.ready).map(m=>m.slot),armed:members.filter(m=>m.armed).map(m=>m.slot),started:members.filter(m=>m.started).map(m=>m.slot),startAt:p.startAt||null,reason:p.reason||digibotDesktopMessage};
  }


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
    .digibot__accwarn{font-size:10.5px;margin:0 0 6px;padding:4px 6px;border-radius:5px;background:#2a2410;color:#ffe08a}
    .digibot__accrow{display:grid;grid-template-columns:14px 14px 1fr 1fr;gap:2px 4px;align-items:center;margin:0 0 6px}
    .digibot__accrow input[type=text],.digibot__accrow input[type=password]{min-width:0;background:#0b1020;color:#e8ecf4;
      border:1px solid #3a4670;border-radius:4px;font:11px system-ui;padding:2px 4px;user-select:text}
    .digibot__accrow input[type=checkbox],.digibot__accrow input[type=radio]{margin:0;accent-color:#3fa0ff}
    .digibot__accinfo{grid-column:3/-1;font-size:10.5px;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .digibot__accinfo.on{opacity:1;color:#7ee2a8}
    .digibot__grpbtns{display:flex;gap:6px;margin:4px 0 6px}
    .digibot__grpbtns .digibot__btn{flex:1;padding:4px;font-weight:700}
    .digibot__grpinfo{font-size:11px;opacity:.85;margin-bottom:4px}
    .digibot__grpinfo.warn{opacity:1;color:#ffb86b}
    .digibot__slotsel{display:flex;align-items:center;gap:6px;margin:0 0 6px;font-size:11px}
    .digibot__slotsel select{flex:1;min-width:0;background:#0b1020;color:#e8ecf4;border:1px solid #3a4670;border-radius:4px;font:11px system-ui;padding:2px}
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
    .digibot__bosspick{display:flex;flex-direction:column;gap:2px;height:190px;overflow-y:scroll;padding-right:4px;margin-bottom:6px;
      border:1px solid #222a48;border-radius:6px;padding:3px}
    .digibot__search{display:block;width:100%;box-sizing:border-box;margin:0 0 4px;background:#0b1020;color:#e8ecf4;border:1px solid #3a4670;
      border-radius:5px;font:11px system-ui;padding:3px 6px;user-select:text}
    .digibot__search:focus{outline:none;border-color:#3fa0ff}
    .digibot__bosspick label.hide{display:none}
    .digibot__bosspick,.digibot__timers,.digibot__quests,.digibot__mobs,.digibot__log,.digibot__body{scrollbar-width:thin;scrollbar-color:#3a4670 #0b1020}
    .digibot ::-webkit-scrollbar{width:8px}
    .digibot ::-webkit-scrollbar-track{background:#0b1020;border-radius:4px}
    .digibot ::-webkit-scrollbar-thumb{background:#3a4670;border-radius:4px}
    .digibot ::-webkit-scrollbar-thumb:hover{background:#4d5c94}
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
    .digibot__btn.digibot__hunt.on{background:#3a2a12;border-color:#ffb43f;color:#fff;box-shadow:inset 0 -2px 0 #ffb43f}
    .digibot__modes button.on{background:#26305a;border-color:#3fa0ff;color:#fff;box-shadow:inset 0 -2px 0 #3fa0ff}
    .digibot__vitals{margin-top:4px}
    .digibot__row.mini{grid-template-columns:30px 1fr;margin:2px 0}
    .digibot__row.mini .digibot__lbl{font-size:10px}
    .digibot__row.mini .digibot__bar{height:11px;border-radius:3px}
    .digibot__row.mini .digibot__txt{font-size:9.5px;line-height:11px}
    .digibot.is-min .digibot__runbar{display:none}
    .digibot.is-min{width:auto;min-width:150px}
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
    .digibot{resize:horizontal;overflow:hidden;min-width:300px;max-width:640px}
    .digibot.is-min{resize:none;width:auto!important;min-width:150px}
    .digibot.is-compact .digibot__tabs,.digibot.is-compact .digibot__body{display:none}
    .digibot__gchip{flex:0 0 auto!important;font:600 10px system-ui;letter-spacing:0;padding:1px 6px;border-radius:9px;background:#161c33;border:1px solid #2a3355;color:#9aa5c4;white-space:nowrap}
    .digibot__gchip.on{color:#7ee2a8;border-color:#2b6b4a}
    .digibot__gchip:empty{display:none}
    .digibot__task{display:none;margin:2px 0 1px;font-size:11px}
    .digibot__task.on{display:block}
    .digibot__task .t{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#ffe08a}
    .digibot__task .pb{display:block;height:4px;background:#0b1020;border-radius:2px;overflow:hidden;margin-top:2px}
    .digibot__task .pb i{display:block;height:100%;width:0;background:linear-gradient(90deg,#b8860b,#ffd43b);transition:width .3s}
    .digibot__task .pb.none{display:none}
    .digibot__tabs button{display:flex;flex-direction:column;align-items:center;line-height:1.15;padding:4px 0 3px}
    .digibot__tabs button i{font-style:normal;font-size:13px}
    .digibot__tabs button small{font-size:9.5px;font-weight:600}
    .digibot__tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:6px}
    .digibot__tiles div{background:#161c33;border:1px solid #222a48;border-radius:6px;padding:3px 5px;text-align:center;min-width:0}
    .digibot__tiles b{display:block;font-size:12.5px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .digibot__tiles small{display:block;font-size:9.5px;opacity:.65;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .digibot__tiles [data-tip]{cursor:help}
    .digibot__sesshead{display:flex;align-items:center;gap:6px;margin-top:6px;font-size:10.5px;opacity:.8}
    .digibot__sesshead span{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .digibot__queue{display:flex;flex-direction:column;gap:3px;font-size:11px}
    .digibot__queue div{display:grid;grid-template-columns:16px 1fr;gap:4px;padding:3px 5px;border-radius:5px;background:#161c33;border-left:3px solid #3a4670}
    .digibot__queue div.cur{border-left-color:#ffd43b;background:#221d10}
    .digibot__queue div.digibot__none{display:block;background:none;border:0;padding:0}
    .digibot__queue b{opacity:.6;font-variant-numeric:tabular-nums}
    .digibot__queue span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .digibot__grp.is-off{opacity:.45}
    .digibot__grp.is-off>summary::after{content:attr(data-offnote);font:500 9.5px system-ui;color:#ffb86b;margin-left:6px}
    .digibot__lage{display:grid;gap:3px;font:500 11px system-ui;color:#c9d1e6}
    .digibot__lage .row{display:flex;gap:6px;align-items:baseline;min-width:0}
    .digibot__lage .row>span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
    .digibot__lage .k{color:#7c8496;flex:none;width:16px;text-align:center}
    .digibot__lage .mem{display:grid;grid-template-columns:auto 34px 1fr;gap:6px;align-items:center;padding:2px 0;border-top:1px solid #222a44}
    .digibot__lage .mem b{font-weight:700;white-space:nowrap}
    .digibot__lage .mem .hp{height:5px;background:#2a3355;border-radius:3px;overflow:hidden}
    .digibot__lage .mem .hp i{display:block;height:100%;background:#2ecc71}
    .digibot__lage .mem .hp.low i{background:#ff6b6b}
    .digibot__lage .mem .st{color:#9aa5c4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
    .digibot__offnote{font:500 9.5px system-ui;color:#ffb86b;font-style:normal}
    .digibot__qhead{font:700 10.5px system-ui;color:#9aa5c4;text-transform:uppercase;letter-spacing:.04em;margin:6px 0 3px;border-bottom:1px solid #2a3355;padding-bottom:2px}
    .digibot__scope{font:500 10.5px system-ui;color:#9aa5c4;background:#161c33;border:1px solid #2a3355;border-radius:5px;padding:4px 6px;margin:0 0 6px}
    .digibot__prof{font:600 10px system-ui;color:#9aa5c4;margin-left:auto;margin-right:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px}
    .digibot__prof:empty{display:none}
    .digibot__seg{display:grid;grid-template-columns:repeat(4,1fr);gap:3px;margin:0 0 6px}
    .digibot__seg button{background:#161c33;border:1px solid #2a3355;color:#9aa5c4;border-radius:5px;font:600 10.5px system-ui;padding:4px 2px;cursor:pointer}
    .digibot__seg button:hover{color:#e8ecf4;border-color:#3a4670}
    .digibot__seg button.on{background:#26305a;border-color:#3fa0ff;color:#fff;box-shadow:inset 0 -2px 0 #3fa0ff}
    .digibot__gcards{display:flex;flex-direction:column;gap:5px;margin:0 0 6px}
    .digibot__gcard{padding:5px 7px;border-radius:7px;background:#161c33;border-left:3px solid #3a4670;font-size:11px}
    .digibot__gcard.lead{border-left-color:#ffd43b}
    .digibot__gcard.off{opacity:.55}
    .digibot__gcard header{display:flex;align-items:center;gap:6px;font-weight:700}
    .digibot__gcard header span{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .digibot__gcard .role{font:700 9px system-ui;padding:0 5px;border-radius:3px;background:#3a4670;text-transform:uppercase}
    .digibot__gcard.lead .role{background:#ffd43b;color:#0b1020}
    .digibot__gcard .where{font-size:10px;opacity:.7;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .digibot__gcard .st{font-size:10.5px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.9}
    .digibot__gcard .hpb{height:5px;background:#0b1020;border-radius:3px;overflow:hidden;margin-top:3px}
    .digibot__gcard .hpb i{display:block;height:100%;background:linear-gradient(90deg,#c0392b,#e74c3c)}
    .digibot__gcard .sync{font-size:10px;margin-top:2px}
    .digibot__gcard .sync.ok{color:#7ee2a8}.digibot__gcard .sync.bad{color:#ffb86b}
    .digibot__grpbtns.three .digibot__btn{padding:4px 2px;font-size:10.5px}
    .digibot__logf{display:flex;flex-wrap:wrap;gap:3px;margin:0 0 5px}
    .digibot__logf button{background:#161c33;border:1px solid #2a3355;color:#9aa5c4;border-radius:10px;font:600 10px system-ui;padding:1px 7px;cursor:pointer}
    .digibot__logf button.on{background:#26305a;border-color:#3fa0ff;color:#fff}
    .digibot__heal{margin-left:2px;background:#0b1020;color:#9aa5c4;border:1px solid #3a4670;border-radius:4px;font:10px system-ui;padding:0 1px;max-width:78px}
    .digibot__heal.on{border-color:#2ecc71;color:#7ee2a8}
    .digibot__for{font-style:normal;font-weight:500;opacity:.7;font-size:10.5px}
    .digibot__lootsum{font-size:11px;margin-bottom:5px;line-height:1.5}
    .digibot__mobexp{margin-top:4px;max-height:160px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#3a4670 #0b1020}
    .digibot__mobexp div{display:flex;gap:6px;font-size:10.5px;padding:1px 0}
    .digibot__mobexp span{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .digibot__mobexp em{font-style:normal;opacity:.7;font-variant-numeric:tabular-nums;min-width:30px;text-align:right}
    .digibot__mobexp b{font-variant-numeric:tabular-nums;min-width:56px;text-align:right}
    .digibot__lootsum b{font-variant-numeric:tabular-nums}
    .digibot__lootsum .in{color:#7ee2a8}.digibot__lootsum .out{color:#ff8a8a}
    .digibot__loot{display:grid;grid-template-columns:1fr 1fr;gap:6px}
    .digibot__loot>div{background:#161c33;border:1px solid #222a48;border-radius:6px;padding:4px 5px;min-width:0}
    .digibot__loot>div>b{display:block;font-size:10.5px;opacity:.8;margin-bottom:2px}
    .digibot__loot [data-f]{max-height:120px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#3a4670 #0b1020}
    .digibot__loot [data-f] div{display:flex;gap:4px;font-size:10.5px}
    .digibot__loot [data-f] span{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .digibot__loot [data-f] em{font-style:normal;font-variant-numeric:tabular-nums;opacity:.85}
    .digibot__chk span{white-space:normal;line-height:1.3}
    .digibot__qsum:empty{display:none}
    .digibot__btnrow{display:flex;gap:4px;justify-content:flex-end;margin-bottom:4px}
    .digibot__tabs button{font-size:11px}
    .digibot__accrow input[type=text]{grid-column:3/-1}
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
    tamerAuto: true, evoWarp: false, apMapEvo: true, independentGroup: true, width: 320, compact: false, min: false,
    tab: 'data', lvlDiff: 5, radius: 300, hpPot: 40, dsPot: 20, tdsPot: 20,
    skills: { 2: true, 3: true, 4: true, 5: true, 6: true },
    heal: {},       // alt (vor 2.12): Heil-Skills je Taste – wird beim ersten Start in skillSets übernommen
    skillSets: {},  // { [Digimon-Art]: { skills: { [Taste]: an/aus }, heal: { [Taste]: HP-% } } } – je Digitationsform
    logFilter: 'all',
    mobs: {}, // { [mapId]: { 'kunemon|elite': false, ... } } – nicht gesetzt = Standard (Bosse aus, Rest an)
    questMode: false, // nur Monster für offene Quest-Ziele jagen, danach Bot stoppen
    questOff: {},     // { [questId]: true } – Quests, die der Quest-Modus ignorieren soll
    dodge: true,      // Flächenangriffen (Warnkreisen) ausweichen
    mirror: true,     // bei Spiegel/Reflexion des Ziels nicht angreifen
    koh: true,        // ClavisAngemon: große Raid-Angriffe mit „Key of Hope“ blocken
    tank: true,       // kleine Boss-Flächen (fester Schaden, höchstens ~1/3 der HP) tanken statt ausweichen
    skipTaken: true,  // keine Gegner angreifen, die andere Spieler gerade bekämpfen
    levelRoute: false, // Grinden: selbst zur besten Zone fürs Level reisen (Lern-Route)
    levelA2: true,    // Lern-Route nur in Adventure-02-Maps
    levelEvo: true,   // Lern-Route: zwischen den Kämpfen digitieren (Form je nach Map, siehe unten)
    levelEvoForm: '__max',   // … auf Maps ohne Dark Tower ('' = keine, '__max' = höchstmögliche, sonst Art)
    levelEvoDark: '__armor', // … auf Maps mit Dark Tower (dort klappt nur Armor; '__armor' = höchste freie Armor-Form)
    levelBoss: true,  // Lern-Route: Feldbosse der Map (ohne Enrage) mitnehmen, wenn sie leben oder gleich spawnen
    expPrio: true,    // Grinden: zuerst Monster +5…+8 über dem Digimon (×1,5 EXP), dann +4, +3, … – erst zuletzt über +8
    chCheck: false,   // Channel-Checker: auf den Kanal mit den wenigsten Spielern wechseln (nicht in der Boss-Rotation)
    safeCast: true,   // gegen Bosse: Skills nur, wenn danach noch Zeit zum Ausweichen bleibt (und kein Spiegel droht)
    autopilot: false, // Quests annehmen, hinreisen, erledigen, abgeben
    apGrind: true,    // Autopilot: bei Level-Sperren/Level-Zielen grinden statt stoppen
    apBatch: true,   // Autopilot: erst alle Ziele erledigen, dann alles abgeben, dann alles annehmen (keine Abgabe zwischendurch)
    apNoTurnin: false, // Autopilot: Quests annehmen und erledigen, aber nicht abgeben (fertige bleiben im Log, Abgeben macht man selbst)
    apOrder: 'near',  // 'near' = nächste Aufgabe zuerst, 'sweep' = Map für Map absteigend
    apStartMap: '',   // Start-Map der Runde ('' = höchste bzw. niedrigste erreichbare, je nach Richtung)
    apSweepDir: 'down', // Map für Map: 'down' = von oben nach unten, 'up' = von unten nach oben
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
    dungeon: false,       // Dungeon-Modus (Kera): betreten, Räume räumen, Boss, raus
    dgMode: 'easy',       // 'easy' = War Game, 'hard' = Revenge (allein kaum zu schaffen), 'apocalymon' / 'malomyotismon' = Raid
    expMess: false,       // EXP-Messung: je Kill Monster, EXP, Kampfdauer, Treffer mitschreiben (Reiter Log)
    hunt: false,          // Event (Mega-Jagd): zum angesagten Weltboss reisen, ihn suchen und bekämpfen – in jedem Modus
    wboss: false,         // Weltboss (z. B. BlackWarGreymon): beide Kanäle nach Spawnzeit abarbeiten – in jedem Modus
    eventsOnly: false,    // Modus „Nur Event/Weltboss“: nichts anderes tun, nur auf Event und Weltbosse warten (3.0.4)
    routeStart: '',       // Named-Runde: Start-Map (leer = niedrigste)
    routeEnd: '',         // Named-Runde: End-Map (leer = höchste)
    open: {},             // auf-/zugeklappte Gruppen im Panel
  };
  // One shared configuration; account identity remains separate for quest progress.
  const CFG_DEFAULTS = JSON.parse(JSON.stringify(cfg));
  const UI_KEYS = ['tab', 'open', 'logFilter', 'width', 'compact', 'min'];
  const CFG_BATCH_KEY = 'digibot.cfg.batch.v1';
  const CFG_SHARED_KEY = 'digibot.cfg.shared.v1';
  let cfgUser = null;
  function applyCfg(saved) {
    const checked = digibotConfig(saved, CFG_DEFAULTS);
    Object.assign(cfg, checked.value);
    // Neuer Standard „erst alles erledigen, dann abgeben“ – nur, wenn der Nutzer apBatch nie selbst gesetzt hat
    try{if(localStorage.getItem(CFG_BATCH_KEY)!=='1'&&!(digibotRecord(saved)&&Object.hasOwn(saved,'apBatch')))cfg.apBatch=true;}catch{}
    if (checked.issues.length) digibotCore.record('Einstellungen korrigiert', {action: checked.issues.join(', ')});
    const m = modeOf(); // alte Einstellungen mit mehreren Schaltern auf eine Betriebsart bringen
    cfg.questMode = m === 'quest'; cfg.autopilot = m === 'auto'; cfg.farm = m === 'farm'; cfg.dungeon = m === 'dungeon'; cfg.eventsOnly = m === 'events';
    cfg.mirror = true; cfg.safeCast = true; // immer an (siehe ALWAYS_ON)
  }
  // Betriebsart (genau eine): Grinden, Quest-Jagd (Quest-Modus), Quest-Autopilot oder Bosse (Rotation/Named-Runde)
  const MODES = { grind: 'Grinden', quest: 'Quest-Jagd', auto: 'Autopilot', farm: 'Bosse', dungeon: 'Dungeon', events: 'Nur Event/WB' };
  const modeOf = () => (cfg.dungeon ? 'dungeon' : cfg.farm ? 'farm' : cfg.autopilot ? 'auto' : cfg.questMode ? 'quest' : cfg.eventsOnly ? 'events' : 'grind');
  try { applyCfg(JSON.parse(localStorage.getItem(CFG_KEY) || localStorage.getItem('digibot.cfg') || '{}')); } catch {}
  const ALWAYS_ON = ['mirror', 'safeCast']; // früher Haken – ausgeschaltet schadete man sich nur selbst
  if (cfg.tab === 'care') cfg.tab = 'attack';
  const mobOn = (mapId, key, cat) => cfg.mobs[mapId]?.[key] ?? cat !== 'boss';
  const saveCfg = () => {
    applyCfg(cfg);
    try {
      localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
      localStorage.setItem(CFG_SHARED_KEY, '1');
      localStorage.setItem(CFG_BATCH_KEY, '1');
    } catch { digibotCore.record('Gemeinsame Einstellungen konnten nicht gespeichert werden'); }
  };
  // Import the first signed-in account's former settings once, then never load profiles again.
  function cfgProfile(st) {
    const u = String(st?.session?.username || '').trim().toLowerCase();
    if (!u || u === cfgUser) return;
    cfgUser = u;
    try {
      if (localStorage.getItem(CFG_SHARED_KEY) !== '1') {
        const saved = JSON.parse(localStorage.getItem(`${CFG_KEY}@${u}`) || 'null');
        if (digibotRecord(saved)) {
          const ui = Object.fromEntries(UI_KEYS.map(k => [k, cfg[k]]));
          applyCfg(saved);Object.assign(cfg,ui);
          syncCfgInputs();farm.reset();autopilot.reset();
        }
        saveCfg();
        logEvent('bot', 'Einstellungen: gemeinsames Profil für alle Accounts übernommen');
      }
    } catch { digibotCore.record('Bisherige Einstellungen konnten nicht übernommen werden'); }
    try{if(localStorage.getItem(CFG_BATCH_KEY)!=='1')saveCfg();}catch{}
    schedule();
  }
  window.addEventListener('storage', (event) => {
    if(event.key!==CFG_KEY || !event.newValue)return;
    try {
      const saved=JSON.parse(event.newValue);if(!digibotRecord(saved))return;
      const behavior=()=>JSON.stringify(Object.fromEntries(Object.entries(cfg).filter(([key])=>!UI_KEYS.includes(key))));
      const before=behavior();applyCfg(saved);syncCfgInputs();
      if(before!==behavior()){farm.reset();autopilot.reset();}
      schedule();
    } catch { digibotCore.record('Gemeinsame Einstellungen konnten nicht geladen werden'); }
  });
  // Panel-Elemente, die ihren Wert nur beim Aufbau aus cfg nehmen, nach einem Profilwechsel nachziehen
  function syncCfgInputs() {
    if (!panel) return;
    panel.querySelectorAll('[data-apflag]').forEach((el) => { el.checked = !!cfg[el.dataset.apflag]; });
    panel.querySelectorAll('input[data-cfg]').forEach((el) => {
      const k = el.dataset.cfg; el.value = cfg[k];
      const v = panel.querySelector(`[data-v="${k}"]`); if (v && LABELS[k]) v.textContent = LABELS[k](cfg[k]);
    });
    panel.querySelectorAll('[data-farmch]').forEach((el) => { el.checked = (cfg.farmChannels || []).includes(Number(el.dataset.farmch)); });
    const g = panel.querySelector('[data-apgrind]'); if (g) g.checked = !!cfg.apGrind;
    const bt = panel.querySelector('[data-apbatch]'); if (bt) bt.checked = !!cfg.apBatch;
    const em = panel.querySelector('[data-expmess]'); if (em) em.checked = !!cfg.expMess;
    mobListSig = ''; questSig = ''; farmPickSig = '';
  }

  // ---------- Accounts & Gruppe ----------
  // Bis zu 5 Accounts (localStorage, gilt für alle Fenster). Welcher Account in welchem Fenster läuft, steht in der
  // sessionStorage des Fensters (Slot) – die Bot-Einstellungen in localStorage teilen sich ja alle Fenster.
  const ACC_KEY = 'digibot.accounts';
  const ACC_MAX = 5;
  // Per-window volatile credentials; never serialize or broadcast this map.
  const digibotQueuePasswords = new Map();
  const accounts = { leader: 0, popup: true, mirror: false, mirrorAtk: true, leadBoss: false, dungeon: false, spread: false, serve: false, list: [] };
  function reloadAcc() {

    try {
      const a=JSON.parse(localStorage.getItem(ACC_KEY)||localStorage.getItem('digibot.accounts')||'null');
      if(digibotRecord(a)&&Array.isArray(a.list)) {
        accounts.leader=Number.isInteger(a.leader)&&a.leader>=0&&a.leader<ACC_MAX?a.leader:0;
        for(const k of ['popup','mirror','mirrorAtk','leadBoss','dungeon','spread','serve'])if(typeof a[k]==='boolean')accounts[k]=a[k];
        accounts.list=Array.from({length:ACC_MAX},(_,i)=>{
          const row=digibotRecord(a.list[i])?a.list[i]:{};
          const user=typeof row.user==='string'?row.user.slice(0,64):'';
          return {on:row.on===true,user,char:typeof row.char==='string'?row.char.slice(0,100):'',at:Number.isFinite(row.at)?row.at:0};
        });
      }
    } catch { digibotCore.record('Account-Einstellungen konnten nicht geladen werden'); }
    while(accounts.list.length<ACC_MAX)accounts.list.push({on:false,user:'',char:'',at:0});
  }
  reloadAcc();
  const saveAcc=()=>{try {localStorage.setItem(ACC_KEY,JSON.stringify({...accounts,list:accounts.list.map(({on,user,char,at})=>({on,user,char,at}))}));}catch {digibotSignal('Account-Einstellungen konnten nicht gespeichert werden');}};
  const ss = {
    get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch {} },
  };
  { // Neu laden: weder einloggen noch Bot starten. Fenster, die „Alle einloggen“ geöffnet hat, bringen Slot und
    // Slot-Zuordnung im Link mit (#dbslot=2).
    ss.set('digibot.go', null); ss.set('digibot.login', null);
    ss.set('digibot.desktop.request',null);
    const desktopRequest=/[&#]dblaunch=([a-z0-9-]{8,100})(?:&|$)/.exec(location.hash||'');
    if(desktopRequest)ss.set('digibot.desktop.request',desktopRequest[1]);
    const m = /[#&]dbslot=(\d)((?:&\w+=1)*)/.exec(location.hash || '');
    if (m) {
      ss.set('digibot.slot', m[1]); ss.set('digibot.group', '1');
      if (/&go=1/.test(m[2])) ss.set('digibot.go', '1');
      try { history.replaceState(null, '', location.pathname + location.search); } catch {}
    }
  }
  const GROUP_STALE_MS = 6000;           // so lange gilt die letzte Meldung eines Fensters
  const GROUP_WAIT_MS = 180000;          // Leader wartet höchstens so lange auf die anderen (Annehmen/Abgeben)
  const GROUP_TALK_KEEP_MS = 20 * 60000; // so lange können Mitläufer verpasste Gespräche nachholen
  const FOLLOW_DIST = 110;               // Mitläufer bleiben so nah am Leader
  const FOLLOW_FAR = 350;                // weiter weg: erst hinlaufen, nicht kämpfen
  const GROUP_BLOCK_MAX_MS = 300000;     // so lange hält der Leader eine Abgabe zurück, bis Mitläufer Reise-/Gesprächsziele haben
  const group = {
    bus: null, peers: new Map(), // Slot -> letzte Meldung
    talks: [],                   // Leader: letzte Gespräche (Annehmen/Abgeben/Sprechen) zum Nachmachen
    handled: new Set(), done: [], cur: null, // Mitläufer: abgearbeitete Gespräche
    seen: [],                    // Mitläufer: gesehen, aber zurückgestellt (NPC auf anderer Map, Leader noch hier)
    noFight: false, invited: new Map(), worldAt: 0, msg: '', blockSince: new Map(),
    login: { at: 0, tries: 0, outAt: 0, enterAt: 0, msg: '' },
    slot() { const v = ss.get('digibot.slot'); return v === null ? -1 : Number(v); },
    active() { return ss.get('digibot.group') === '1' && this.slot() >= 0 && this.slot() < ACC_MAX; },
    role() { return !this.active() ? null : this.slot() === accounts.leader ? 'leader' : 'follower'; },
  };
  try {
    group.bus = new BroadcastChannel('digibot-group-v1');
    group.bus.onmessage = (e) => onGroupMsg(e.data);
  } catch { /* kein BroadcastChannel – Gruppe nicht möglich */ }
  window.addEventListener('storage', (e) => { if (e.key === ACC_KEY) { reloadAcc(); schedule(); } });

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
    <div class="digibot__head"><span>DigiBot</span><span class="ver">v${typeof GM_info !== 'undefined' ? GM_info.script?.version || '' : '3.0.5'}</span>
      <span class="digibot__gchip" data-f="gchip"></span>
      <span class="digibot__prof" data-f="prof" title="Die Einstellungen (Modus, Skills, Bosse, Quests …) gehören zu diesem Account. Panel-Ansicht und Gruppe gelten für alle Fenster."></span>
      <button class="digibot__btn" data-act="compact" title="Kompakt: nur Start, Status und Aufgabe">▭</button>
      <button class="digibot__btn" data-act="pip" title="In eigenes Fenster (immer im Vordergrund)">⧉</button>
      <button class="digibot__btn" data-act="min" title="Ein-/Ausklappen">–</button>
    </div>
    <div class="digibot__runbar">
      <div class="digibot__modes">${Object.entries(MODES).map(([k, l]) => `<button data-mode="${k}" title="${escAttr({
        grind: 'Monster aus der Liste (Reiter Kampf) im Suchradius jagen',
        quest: 'Nur Monster für offene Quest-Ziele auf dieser Map jagen, danach stoppen',
        auto: 'Quests annehmen, hinreisen, erledigen und abgeben (Reiter Quests)',
        farm: 'Boss-Rotation oder Named-Elite-Runde (Reiter Bosse)',
        dungeon: 'Kera-Dungeon: zur Tür, betreten, Räume räumen, Boss, wieder hinaus (Reiter Bosse)',
        events: 'Nichts anderes tun: nur auf das Event (Mega-Jagd) und die Weltbosse warten, hinreisen und kämpfen. Schaltet 🎯 Event und 🌍 Weltboss ein.',
      }[k])}">${l}</button>`).join('')}</div>
      <button class="digibot__btn digibot__run" data-act="bot" title="Alt+B">▶ Start</button>
      <button class="digibot__btn digibot__hunt" data-act="hunt" title="Event (Mega-Jagd): Sobald der Weltboss angekündigt ist (6 min vorher), reist der Bot zur Map, Kanal 1, wartet, sucht ihn und kämpft. Danach weiter wie vorher. Gilt in jedem Modus.">🎯 Event</button>
      <button class="digibot__btn digibot__hunt" data-act="wboss" title="Weltboss (z. B. BlackWarGreymon): spawnt auf Kanal 1 und 2 mit eigenem Timer. Lebt er oder spawnt er in den nächsten 6 min, reist der Bot hin, wartet am Spawnpunkt und kämpft – zuerst der Kanal, der zuerst spawnt (gleichzeitig: Kanal 1), danach der andere. Danach weiter wie vorher. Das Event geht vor.">🌍 Weltboss</button>
      <button class="digibot__btn" data-act="digibot-stop">■ NOT-AUS (Esc)</button>
      <button class="digibot__btn" data-act="digibot-export">Diagnose exportieren</button>
      <button class="digibot__btn" data-act="preset-save" title="Alle Bot-Einstellungen (Modus, Tränke, Skills, Quests, Bosse …) als .txt-Datei speichern. Accounts und Passwörter kommen nicht hinein.">💾 Preset speichern</button>
      <button class="digibot__btn" data-act="preset-load" title="Bot-Einstellungen aus einer gespeicherten Preset-.txt laden. Accounts bleiben unverändert.">📂 Preset laden</button>
      ${check('independentGroup', 'Gruppe: eigene Wege und feste Bossplätze je Fenster')}
      <div class="digibot__status" data-f="status">Bot aus</div>
      <div class="digibot__task" data-f="task"><span class="t"></span><span class="pb"><i></i></span></div>
      <div class="digibot__vitals">${bar('hp mini', 'HP').replace('data-bar="hp mini"', 'data-bar="mhp"')}${bar('ds mini', 'DS').replace('data-bar="ds mini"', 'data-bar="mds"')}${bar('tg mini', 'Ziel').replace('data-bar="tg mini"', 'data-bar="mtg"')}</div>
    </div>
    <nav class="digibot__tabs">
      <button data-tab="data"><i>📊</i><small>Übersicht</small></button><button data-tab="mon"><i>🐣</i><small>Digimon</small></button><button data-tab="attack"><i>⚔️</i><small>Kampf</small></button><button data-tab="quest"><i>📜</i><small>Quests</small></button><button data-tab="farm"><i>👑</i><small>Bosse</small></button><button data-tab="acc"><i>👥</i><small>Gruppe</small></button><button data-tab="log"><i>📋</i><small>Log</small></button>
    </nav>
    <div class="digibot__body">
      <section data-page="data">
        ${grp('lage', 'Lage', '<div class="digibot__lage" data-f="lage"><div class="digibot__none">–</div></div>', true,
          'Auf einen Blick: Modus, Ort, aktuelles Ziel und Aufgabe – in der Gruppe eine Zeile je Bot (Rolle, HP, Ort, Status, bei ClavisAngemon Key of Hope).')}
        ${grp('digimon', '<span data-f="partner">Digimon</span>', `
          ${bar('exp', 'EXP')}
          <div class="digibot__tiles">
            <div data-tip="rate"><b data-f="rate">–</b><small>EXP / Min</small></div>
            <div data-tip="bitrate"><b data-f="bitrate">–</b><small>Bits / Min</small></div>
            <div><b data-f="eta">–</b><small>Level-Up in</small></div>
            <div><b data-f="kills">0</b><small>Kills</small></div>
            <div><b data-f="sturn">0</b><small>Quests abgegeben</small></div>
            <div><b data-f="sfaint">0</b><small>Bewusstlos</small></div>
          </div>
          <div class="digibot__sesshead" data-tip="nextmap"><span>Nächste Map: <b data-f="nextmap">–</b></span></div>
          <div class="digibot__sesshead"><span>Sitzung: <b data-f="sess">–</b></span><button class="digibot__btn" data-act="reset" title="Sitzungswerte zurücksetzen">↺</button></div>`, true, 'Werte seit Sitzungsbeginn. Maus über EXP / Min oder Bits / Min zeigt die Hochrechnung pro Stunde. HP, DS und Ziel stehen oben.')}
        ${grp('loot', 'Sitzung: Beute &amp; Verbrauch', `
          <div class="digibot__lootsum" data-f="lootsum">–</div>
          <div class="digibot__loot">
            <div><b>Erhalten</b><div data-f="lootin"><i class="digibot__none">noch nichts</i></div></div>
            <div><b>Verbraucht</b><div data-f="lootout"><i class="digibot__none">noch nichts</i></div></div>
          </div>`, true, 'Alles seit Sitzungsbeginn (↺ oben setzt zurück): Items, die ins Inventar kamen (Drops, Belohnungen) und die weniger wurden (Tränke, abgegebene Quest-Items). EXP aus allen Quellen (Kämpfe, Quests) und Bits rein/raus.')}
        ${grp('mobexp', 'Sitzung: EXP je Monster', `
          <div class="digibot__sesshead"><span>Nur Monster, die schon EXP gebracht haben</span><button class="digibot__btn" data-act="mobexp-reset" title="EXP je Monster zurücksetzen">↺</button></div>
          <div class="digibot__mobexp" data-f="mobexp"><i class="digibot__none">noch keine EXP von Monstern</i></div>`, true, 'Eigene Kills seit Sitzungsbeginn, über alle Maps: Anzahl, EXP zusammen und Anteil. Maus über eine Zeile: Ø EXP je Kill und die Maps. ↺ hier setzt nur diese Liste zurück (↺ bei den Sitzungswerten setzt sie mit zurück).')}
        ${grp('queue', 'Als Nächstes', `<div class="digibot__queue" data-f="queue"><div class="digibot__none">–</div></div>`, true, 'Aktuelle Aufgabe (gelb) und die nächsten Schritte des Autopiloten.')}
        ${grp('radar', '<span data-f="radar">Radar</span>', `
          <canvas class="digibot__radar" width="476" height="320"></canvas>
          <div class="digibot__legend">
            <span style="--c:#2ecc71">passend</span><span style="--c:#7c8496">aus / Level ≠</span>
            <span style="--c:#ff4d4d">greift an</span><span style="--c:#ffa94d">belegt</span>
            <span class="ring" style="--c:${CAT.elite.color}">Elite</span><span class="ring" style="--c:${CAT.boss.color}">Boss</span>
          </div>`)}
      </section>

      <section data-page="mon">
        ${grp('partner', 'Partner &amp; Digitation', `
          <div class="digibot__apcfg">
            <label>Quest-Digimon<select data-apsel="apQuestPartner"></select></label>
            <label>Digitation<select data-apsel="apEvo"></select></label>
            ${check('evoWarp', 'Freigegebene Warp-Digitation verwenden')}
            ${check('apMapEvo', 'Autopilot: Digitationsregeln der Lernroute übernehmen')}
            <div class="digibot__hint">Im Autopiloten gelten dann der Lernrouten-Schalter sowie „Form ohne Dark Tower“ und „Form mit Dark Tower“ im Reiter Kampf. Für eine feste Quest-Form den Haken ausschalten.</div>
            <label>Abgabe-Digimon<select data-apsel="apTurninPartner"></select></label>
          </div>`, true, 'Quest-Digimon: mit ihm werden Quests angenommen und erledigt. Digitation: diese Form nimmt es dafür an (gilt auch in der Boss-Rotation und im Dungeon – dort schon an der Tür, vor dem Betreten). Abgabe-Digimon: zum Abgeben wird beim NPC zurück-digitiert und gewechselt.')}
        ${grp('skills', 'Skills (Tasten 2–6) <i class="digibot__for" data-f="skillsfor"></i>', `<div class="digibot__skills">${SKILL_KEYS.map((k) => `
          <label class="digibot__skill" data-skill="${k}">
            <input type="checkbox" data-skillcfg="${k}" ${cfg.skills[k] ? 'checked' : ''}>
            <kbd>${k}</kbd><span>–</span><em></em>
            <select class="digibot__heal ${cfg.heal?.[k] ? 'on' : ''}" data-healcfg="${k}" title="Angriff = normal im Kampf wirken. Heal = nur wirken, wenn die HP des Digimons unter den Wert fallen (dann nicht im Angriff).">${[0, 30, 40, 50, 60, 70, 80].map((v) => `<option value="${v}" ${(cfg.heal?.[k] || 0) === v ? 'selected' : ''}>${v ? `Heal &lt;${v} %` : 'Angriff'}</option>`).join('')}</select>
          </label>`).join('')}</div>`, true, 'Haken = Skill wird automatisch gewirkt, sobald er bereit ist und genug DS da ist. Rechts „Heal <x %“: Heil-Skill, der nur bei niedrigen HP gewirkt wird.')}
        ${grp('pots', 'Tränke &amp; Food (F1–F3)', `
          ${slider('hpPot', 'Digimon HP (F1) unter', 0, 95, potLabel, 1)}
          ${slider('dsPot', 'Digimon DS (F2) unter', 0, 95, potLabel, 2)}
          ${slider('tdsPot', 'Tamer DS (F3) unter', 0, 95, potLabel, 3)}`, true,
          'Food/Tränke auf F1–F3 der Hotbar legen. Ist auf F1 nichts mehr da und die HP unter der Schwelle, beendet der Bot den Kampf und wartet auf 100 % HP (Ruhemodus).')}
        ${grp('tamer', 'Tamer', bar('tds', 'DS'), false)}
      </section>

      <section data-page="attack">
        ${grp('targeting', 'Zielwahl', `
          ${slider('lvlDiff', 'Max. Level über dem Digimon', 0, 100, (v) => `+${v}`)}
          ${slider('radius', 'Suchradius', 100, 800, (v) => `${v} px`, 0, 20)}
          ${check('skipTaken', 'Keine Gegner angreifen, die andere Spieler bekämpfen')}
          ${check('levelRoute', 'Lern-Route: beim Grinden selbst zur Zone mit den meisten EXP/min fürs Level reisen (Wechsel ab +15 %, frühestens nach 3 min)')}
          ${check('levelA2', 'Lern-Route nur in Adventure 02')}
          ${check('levelEvo', 'Lern-Route: zwischen den Kämpfen digitieren – Form je nach Map:')}
          <div class="digibot__apcfg">
            <label>Form ohne Dark Tower<select data-apsel="levelEvoForm"></select></label>
            <label>Form mit Dark Tower<select data-apsel="levelEvoDark"></select></label>
          </div>
          ${check('levelBoss', 'Lern-Route: Feldbosse der Map ohne Enrage mitnehmen (Timer aller Kanäle aus Reiter Bosse → Kanäle)')}
          ${check('expPrio', 'EXP-Priorität: zuerst Monster +5 bis +8, dann +4, +3 … (gemessen: +5 bis +8 gibt ×1,5 EXP)')}
          ${check('chCheck', 'Channel-Checker: auf den leersten Kanal wechseln')}`, true,
          'Schwächere Monster werden immer angegriffen, nur zu starke (über +Level) nicht. Angreifer werden immer abgewehrt. Channel-Checker: etwa jede Minute und nach jedem Map-Wechsel wechselt der Bot auf den Kanal mit den wenigsten Spielern (mind. 2 weniger) – nur außerhalb von Kämpfen, nicht in der Boss-Rotation; in der Gruppe entscheidet der Leader, die anderen folgen.')}
        ${grp('mech', 'Boss-Mechaniken', `
          ${check('dodge', 'Warnkreisen/-strahlen ausweichen')}
          ${check('tank', 'Kleine Boss-Treffer tanken statt ausweichen (mehr Schaden, Tränke heilen)')}
          ${check('koh', 'ClavisAngemon: große Raid-Angriffe mit Key of Hope blocken')}`, true,
          'Ausweichen: raus aus Kreisen, Strahlen und Fächern, möglichst nah am Boss. Immer aktiv: kein Angriff, solange das Ziel Schaden zurückwirft (Spiegel), und lange Casts nur, wenn eine mögliche Boss-Attacke noch Zeit zum Ausweichen lässt.')}

        ${grp('tamer-skills', 'Tamer-Fähigkeit', `${check('tamerAuto', 'Tamer-Skill situationsabhängig automatisch einsetzen')}<div class="digibot__hint">Heilung und Schutz nach Bedarf, Angriffsverstärkung in längeren Kämpfen. Gleiche Fähigkeiten werden zwischen DigiBot-Gruppenfenstern abgestimmt. Das Spiel entscheidet über Reichweite und gemeinsame Abklingzeiten.</div>`, true)}
        ${grp('bskills', 'Attacken des Bosses', `<div class="digibot__bskills" data-f="bskills"><div class="digibot__none">Kein Boss im Kampf – Attacken erscheinen hier, sobald du einen Boss anvisierst.</div></div>`, true,
          'Form, Ansage und Cooldown jeder Attacke. Der Countdown läuft ab dem ersten beobachteten Einsatz; „bereit“ heißt „kann jederzeit kommen“.')}
        ${grp('mobs', '<span data-f="mapname">Monster auf dieser Map</span>', `
          <div class="digibot__btnrow"><button class="digibot__btn" data-act="mobs-all">alle an</button><button class="digibot__btn" data-act="mobs-none">alle aus</button></div>
          <div class="digibot__mobs" data-f="mobs"><div class="digibot__none">warte auf Spielwelt…</div></div>`, true,
          'Haken = wird im Modus Grinden gejagt. Angreifer werden immer abgewehrt, auch wenn sie abgewählt sind. ⚔ = aggressiv.', 'data-modes="grind"')}
      </section>

      <section data-page="quest">
        <div class="digibot__apinfo" data-f="apinfo"></div>
        ${grp('apcfg', 'Autopilot-Einstellungen', `
          <label class="digibot__skill"><input type="checkbox" data-apgrind ${cfg.apGrind ? 'checked' : ''}><span>Bei Level-Sperren grinden statt stoppen</span></label>
          <label class="digibot__skill" title="Statt zwischendurch abzugeben: erst alle Ziele der angenommenen Quests erledigen, dann alle fertigen Quests abgeben, dann alle verfügbaren annehmen – und wieder von vorn. (In der Map-für-Map-Runde passiert das ohnehin pro Map.)"><input type="checkbox" data-apbatch ${cfg.apBatch ? 'checked' : ''}><span>Erst alle Quests erledigen, dann gemeinsam abgeben</span></label>
          <div class="digibot__apcfg">
            <label>Reihenfolge<select data-apsel="apOrder">
              <option value="near">Nächste Aufgabe zuerst</option>
              <option value="sweep">Map für Map: annehmen → erledigen → abgeben</option></select></label>
            <label data-sweeponly>Richtung<select data-apsel="apSweepDir"><option value="down">von oben nach unten (höchste Map zuerst)</option><option value="up">von unten nach oben (niedrigste Map zuerst)</option></select></label>
            <label data-sweeponly>Start-Map<select data-apsel="apStartMap"></select></label>
          </div>
          ${check('apNoTurnin', 'Quests nur erledigen, nicht abgeben (fertige bleiben stehen – Abgeben machst du selbst)')}
          ${check('apRepeat', 'Tägliche NPC-Quests (wiederholbar) mitnehmen')}
          ${check('apDailies', 'Daily-Board (ab Lv 11) mitnehmen')}
          ${check('apTeleport', 'Mit Digi-Phone schnellreisen (kostet Bits)')}`, false,
          'Gilt für den Modus Autopilot. Der Autopilot kämpft unterwegs nur gegen Angreifer.', 'data-modes="auto"')}
        ${grp('quests', 'Aktive Quests', `
          <div class="digibot__qsum" data-f="qsum"></div>
          <div class="digibot__quests" data-f="quests"><div class="digibot__none">warte auf Spielwelt…</div></div>`, true,
          'Haken weg = Quest wird ignoriert. Quest-Jagd jagt nur auf der aktuellen Map (Abgeben machst du); der Autopilot erledigt auch Gespräche, Reisen, Annehmen und Abgeben. Level-, Digitations- und Brut-Ziele erledigt keiner von beiden.', 'data-modes="auto quest"')}
      </section>

      <section data-page="farm">
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
          'Gilt für den Modus Bosse. Boss-Rotation: reist zum ausgewählten Boss, der als Nächstes da ist. Named-Elite-Runde: Maps von Start bis Ende ablaufen, je Kanal prüfen (lebt → kämpfen, Respawn unter 2 min → warten, sonst weiter), danach per Digi-Phone zurück. Kanalwechsel nur außerhalb des Kampfes; das Level-Limit gilt für diese Bosse nicht.', 'data-modes="farm"')}
        ${grp('dungeon', 'Dungeon (Kera)', `
          <div class="digibot__apcfg">
            <label>Modus<select data-apsel="dgMode"><option value="easy">Easy – War Game</option><option value="hard">Hard – Revenge (Gruppe)</option><option value="apocalymon">Apocalymon-Raid</option><option value="malomyotismon">MaloMyotismon-Raid</option></select></label>
          </div>`, true,
          'Gilt für den Modus Dungeon: zur Tür auf der Map Network, betreten (in der Gruppe nur der Leader, die anderen kommen mit), Raum 1: Terminals schützen – Tsumemon, die zu einem Terminal laufen, zuerst; dann durchs Tor, Boss Keramon (Chrysalimon, Infermon) und zum Ausgang. Ausweichen, Spiegel und Skill-Timing wie bei Bossen. Hard (Revenge): Diaboromon mit Uhr, dann Armageddemon mit Kuramon-Herde – der geteilte Treffer (240 % der HP) ist allein tödlich, also nur in der Gruppe sinnvoll. Apocalymon-Raid: über Spiral Summit zur Tür, digitieren, betreten, Megadramon-Adds zuerst, dann Apocalymon; nach dem Sieg wieder hinaus. MaloMyotismon-Raid genauso über Myotismon Castle: Phantomon und Illusionstürme zuerst, dann MaloMyotismon.', 'data-modes="dungeon"')}
        ${grp('timers', 'Timer', `<div class="digibot__timers" data-f="timers"><div class="digibot__none">Keine Bosse ausgewählt.</div></div>`, true,
          'Aus dem Boss-Fenster des Spiels, der Map-Info deines Kanals und eigenen Siegen. ★ = aktuelles Ziel, „hier“ = dein Standort.', 'data-modes="farm"')}
        ${grp('bosspick', 'Bosse auswählen', `<input class="digibot__search" type="text" data-bosssearch placeholder="🔍 Boss oder Map suchen…" autocomplete="off" spellcheck="false">
          <div class="digibot__bosspick" data-f="bosspick"><div class="digibot__none">warte auf Spielwelt…</div></div>`, false, 'Suchfeld filtert nach Boss- oder Map-Namen. Die Liste hat eine feste Höhe – mit dem Balken rechts scrollen.', 'data-farmmode="boss" data-modes="farm"')}
      </section>

      <section data-page="acc">
        <div class="digibot__scope">👥 Alles in diesem Reiter gilt für alle Gruppenfenster – außer „Dieses Fenster ist“.</div>
        <div class="digibot__seg">
          <button data-gmode="bots" title="Alle Fenster fahren ihren Bot: der Leader den Autopilot, die anderen folgen ihm und machen seine Quests mit.">📜 Quests</button><button data-gmode="boss" title="Alle Fenster fahren ihren Bot: der Leader die Boss-Rotation (Bosse im Tab Farmen auswählen), die anderen folgen ihm über Maps und Kanäle und kämpfen mit.">👑 Bosse</button><button data-gmode="dungeon" title="Alle Fenster fahren den Dungeon-Modus: an der Tür sammeln, der Leader betritt den Dungeon (die Gruppe kommt mit), dann räumt jeder mit – Terminal-Fresser zuerst, danach Boss und Ausgang.">🏰 Dungeon</button><button data-gmode="move" title="Du spielst den Leader selbst – die anderen Fenster (Bot aus) laufen ihm nach, auch über Maps und Kanäle.">👣 Spiegeln</button><button data-gmode="both" title="Wie Spiegeln, und die anderen greifen das Ziel des Leaders mit an – mit ihren Skills, Tränken und Ausweichen.">⚔️ + Angriff</button>
        </div>
        <label class="digibot__skill digibot__chk" title="Jedes Gruppenmitglied greift ein anderes Quest-Monster an (statt alle dasselbe). Ist keins mehr frei, hilft man mit. Bosse greifen alle gemeinsam an. Nicht beim Spiegeln und nicht in der Boss-Rotation."><input type="checkbox" data-accspread ${accounts.spread ? 'checked' : ''}><span>🎯 Ziele verteilen: jeder ein anderes Monster</span><em class="digibot__offnote" data-f="spreadoff"></em></label>
        <label class="digibot__skill digibot__chk" title="Der Leader kümmert sich nur um die Quests der Mitläufer (seine eigenen sind egal) und jagt, was ihnen fehlt. Die Mitläufer bleiben stehen und wehren nur Angreifer ab. Abgeben/Annehmen macht man bei ihnen selbst. Nur im Modus 📜 Quests."><input type="checkbox" data-accserve ${accounts.serve ? 'checked' : ''}><span>🤝 Leader erledigt die Quests der Mitläufer</span></label>
        <div class="digibot__grpbtns three"><button class="digibot__btn" data-act="grp-login" title="Fehlende Gruppenfenster öffnen – dort selbst anmelden und Charakter wählen">⧉ Fenster öffnen</button><button class="digibot__btn" data-act="grp-start" title="Bots in allen Gruppenfenstern starten">▶ Starten</button><button class="digibot__btn" data-act="grp-stop" title="Bots in allen Gruppenfenstern stoppen">■ Stoppen</button></div>
        <div class="digibot__grpbtns"><button class="digibot__btn" data-act="grp-invite" title="Der Leader lädt sofort alle Gruppenmitglieder in die Party ein, die noch nicht drin sind (geht aus jedem Gruppenfenster). Die Mitläufer nehmen automatisch an.">👥 Party einladen</button><button class="digibot__btn" data-act="grp-maptalk" title="In allen Gruppenfenstern: alle fertigen Quests auf der aktuellen Map abgeben und alle hier verfügbaren annehmen – jeder für sich. Danach geht es weiter wie vorher (lief der Bot nicht, stoppt er wieder).">📜 Abgeben &amp; Annehmen (diese Map)</button></div>
        <div class="digibot__grpbtns"><button class="digibot__btn" data-act="grp-desktop" title="Genau vier ausgewählte Accounts im 2×2-Desktoplayout: Leader lädt ein, danach gemeinsamer Autopilot-Start">▦ Vier Fenster + Party + Autopilot</button><button class="digibot__btn" data-act="grp-desktop-stop">Desktopstart abbrechen</button></div>
        <div class="digibot__hint" data-f="desktop-launch">Vier Accounts auswählen, Leader markieren und Pop-ups erlauben. Falls nötig in jedem Fenster selbst anmelden; Start erfolgt erst mit vollständiger Party. Der Browser muss die Fensterpositionierung zulassen.</div>
        <button class="digibot__btn" data-act="grp-desktop-resume" title="Manuelle Pause in diesem Fenster für den vorbereiteten Desktopstart aufheben">Desktopstart hier freigeben</button>
        <div class="digibot__gcards" data-f="gcards"></div>
        <label class="digibot__slotsel" title="Welcher Account läuft in diesem Fenster? Bestimmt, ob es Leader oder Mitläufer ist. Gilt nur für dieses Fenster.">Dieses Fenster ist
          <select data-accslot><option value="">– keine Gruppe –</option>${accounts.list.map((a, i) => `<option value="${i}">Account ${i + 1}${a.user ? ` (${escAttr(a.user)})` : ''}</option>`).join('')}</select></label>
        <div class="digibot__grpinfo" data-f="grpinfo">–</div>
        ${grp('account-queue', 'Accounts nacheinander: Quest-Runde', '<div class="digibot__hint">Ein Fenster, Account 1 → 5 mit Haken und Benutzername. Pro Account läuft der Autopilot bis zum normalen Abschluss. Keine Wiederholungsschleife. Das Fenster darf keiner laufenden Gruppe zugeordnet sein. Automatischer Account-Wechsel mit den unten eingegebenen Passwörtern. Passwörter gelten nur bis zum Neuladen dieses Fensters.</div><div class="digibot__grpbtns"><button class="digibot__btn" data-act="queue-start">▶ Quest-Runde starten</button><button class="digibot__btn" data-act="queue-resume">↪ Runde fortsetzen</button><button class="digibot__btn" data-act="queue-stop">■ Runde stoppen</button></div><div class="digibot__hint" data-f="account-queue">Bereit</div>', true)}
        ${grp('accounts', 'Accounts verwalten', `<div class="digibot__accwarn">Für die Quest-Runde: Passwörter einmal hier eingeben. Sie bleiben nur im Arbeitsspeicher dieses Fensters und werden beim Neuladen verworfen. <button class="digibot__btn" data-act="digibot-passwords">Alte gespeicherte Passwörter löschen</button></div>
          <div data-f="acclist">${accRows()}</div>
          <label class="digibot__skill digibot__chk"><input type="checkbox" data-accpopup ${accounts.popup ? 'checked' : ''}><span>Als eigene Fenster nebeneinander öffnen (empfohlen)</span></label>`, !accounts.list.some((a) => a.user),
          '☑ = in der Gruppe dabei · ◉ = Leader. Der Leader fährt den Autopilot und sucht die Monster aus. Die anderen folgen ihm, helfen beim Kämpfen und nehmen dieselben Quests an und geben sie mit ab. Der Charaktername wird beim Einloggen gemerkt.')}
        <div class="digibot__hint">Fenster im Hintergrund oder minimiert bremst der Browser stark – Fenster nebeneinander sichtbar lassen.</div>
      </section>

      <section data-page="log">
        ${grp('command-history', 'Befehlsstatus & Fehlerchronik', '<div class="digibot__hint">Anforderung, Bestätigung und beobachtete Wirkung werden getrennt erfasst. Der Diagnoseexport enthält die letzten Abläufe bei Problemen.</div><pre data-f="command-history" style="white-space:pre-wrap;font:11px/1.5 system-ui;margin:8px 0"></pre>', true)}
        <div class="digibot__listhead">
          <span class="digibot__title">Protokoll <i data-f="logcount"></i></span>
          <button class="digibot__btn" data-act="log-copy">Kopieren</button>
          <button class="digibot__btn" data-act="log-clear">Leeren</button>
        </div>
        <div class="digibot__listhead">
          <label class="digibot__skill" title="Für die Level-Simulation: je eigenem Kill Monster (Art, Level, HP), eigenes Digimon (Art, Level, EXP bis Level-Up), erhaltene EXP, Kampfdauer, Zeit bis zum nächsten Kill und eigene Treffer mitschreiben. Gespeichert im Browser."><input type="checkbox" data-expmess ${cfg.expMess ? 'checked' : ''}><span>EXP-Messung <i data-f="expmcount"></i></span></label>
          <button class="digibot__btn" data-act="expm-copy">Messung kopieren</button>
          <button class="digibot__btn" data-act="expm-clear">Messung löschen</button>
        </div>
        <div class="digibot__logf">${[['all', 'Alle'], ['quest', 'Quests'], ['group', 'Gruppe'], ['fight', 'Kampf'], ['map', 'Karte'], ['warn', 'Warnungen']].map(([k, l]) => `<button data-logf="${k}">${l}</button>`).join('')}</div>
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
      const cur = { level: p.level, exp: p.exp, expNext: p.expNext, id: p.entityId };
      const prev = this.last;
      this.last = cur;
      if (!prev) { this.start = now; return; }
      if (prev.id && cur.id && prev.id !== cur.id) return; // anderer Partner (oder neue Map): diesen Schritt nicht werten

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

  // ---------- EXP-Messung (für die Level-Simulation 1→99) ----------
  // Je eigenem Kill: Monster (Art, Level, Max-HP), eigenes Digimon (Art, Level, EXP bis Level-Up), erhaltene EXP (System-
  // Meldung im Chat, sonst EXP-Differenz), Kampfdauer, Zeit seit dem letzten Kill und eigene Treffer (Schaden, Krits,
  // Fehlschläge). Dazu je Level die EXP bis zum nächsten. Gespeichert im Browser (localStorage), Export im Reiter Log.
  const EXPM_KEY = 'digibot.expmess', EXPM_MAX = 3000, EXPM_WAIT_MS = 3000;
  const expm = { mobs: new Map(), pending: [], lastKillAt: 0, data: null, levels: null, used: new WeakSet(), dirty: false };
  function expmLoad() {
    if (expm.data) return;
    try { const o = JSON.parse(localStorage.getItem(EXPM_KEY) || '{}'); expm.data = Array.isArray(o.kills) ? o.kills : []; expm.levels = o.levels || {}; } catch { expm.data = []; expm.levels = {}; }
  }
  function expmSave() {
    expm.dirty = false;
    try { localStorage.setItem(EXPM_KEY, JSON.stringify({ v: 1, kills: expm.data.slice(-EXPM_MAX), levels: expm.levels })); } catch { /* voll */ }
  }
  function expmEvent(ev) { // aus net "evs": eigene Treffer sammeln, eigenen Kill vormerken
    if (!cfg.expMess || !ev) return;
    const st = getStore()?.getState?.(), me = st?.me;
    if (!me) return;
    const mine = new Set([me.tamerEntityId, me.partner?.entityId].filter(Boolean));
    if (ev.t === 'dmg' && mine.has(ev.src)) {
      const m = window.dmo?.net?.state?.entities?.get?.(ev.dst);
      if (!m || m.kind !== KIND.Mob) return;
      let r = expm.mobs.get(ev.dst);
      if (!r) {
        r = { sp: m.defId, lv: m.level, maxHp: m.maxHp, first: Date.now(), hits: 0, crit: 0, miss: 0, dmg: 0 };
        expm.mobs.set(ev.dst, r);
        if (expm.mobs.size > 200) expm.mobs.delete(expm.mobs.keys().next().value);
      }
      r.hits++; r.dmg += ev.amount || 0;
      if (ev.outcome === 'crit') r.crit++; else if (ev.outcome === 'miss') r.miss++;
    } else if (ev.t === 'die' && ev.id && expm.mobs.has(ev.id)) {
      const r = expm.mobs.get(ev.id), now = Date.now(), p = me.partner;
      expm.mobs.delete(ev.id);
      if (ev.killer && !mine.has(ev.killer)) return; // ein anderer hat ihn erledigt
      expm.pending.push({ ...r, t: now, dur: now - r.first, gap: expm.lastKillAt ? Math.max(0, r.first - expm.lastKillAt) : null,
        map: st.world?.mapId, pSp: p?.species || null, pLv: p?.level, exp0: p?.exp, expNext: p?.expNext, tLv: me.tamerLevel ?? null,
        party: (st.party?.members || []).length || 1 });
      expm.lastKillAt = now;
    }
  }
  // Im Render-Takt: EXP der vorgemerkten Kills zuordnen (Chat-Meldung „+341 EXP“, sonst EXP-Differenz), Level-Tabelle
  function expmTick(st, now) {
    if (!cfg.expMess) return;
    expmLoad();
    const p = st?.me?.partner;
    if (p?.level && p.expNext > 0 && expm.levels[p.level] !== p.expNext) { expm.levels[p.level] = p.expNext; expm.dirty = true; }
    const chat = st?.chat || [];
    for (const k of expm.pending) {
      const m = chat.find((c) => (c?.code === 'exp' || c?.code === 'exp_party') && c.ts >= k.t - 300 && !expm.used.has(c));
      if (m) { expm.used.add(m); k.exp = Number(m.params?.exp) || 0; k.bonus = m.params?.bonus ?? null; k.src = 'chat'; }
      else if (now - k.t > EXPM_WAIT_MS && p) { // keine Meldung: aus der EXP-Änderung (ungenau, wenn mehrere Kills dazwischen)
        k.exp = p.level === k.pLv ? p.exp - k.exp0 : p.level === k.pLv + 1 ? (k.expNext - k.exp0) + p.exp : null; k.src = 'delta';
      } else continue;
      k.done = true;
      const { first, done, ...row } = k;
      expm.data.push(row); expm.dirty = true;
      if (expm.data.length > EXPM_MAX + 200) expm.data.splice(0, expm.data.length - EXPM_MAX);
    }
    expm.pending = expm.pending.filter((k) => !k.done);
    if (expm.dirty) expmSave();
  }
  // EXP je Monsterart in dieser Sitzung (Übersicht): eigene Kills vormerken, EXP aus der Chat-Meldung „+341 EXP“ zuordnen.
  // Unabhängig von der EXP-Messung, immer an. Über alle Maps der Sitzung; Schlüssel: Name (Varianten wie *_ring zählen zusammen).
  const MOBEXP_WAIT_MS = 3000;
  const mobExp = { hit: new Map(), pending: [], used: new WeakSet(), by: new Map(), sig: '', at: 0 };
  function mobExpEvent(ev, mine) {
    if (ev.t === 'dmg' && mine.has(ev.src)) {
      if (mobExp.hit.has(ev.dst)) return;
      const m = window.dmo?.net?.state?.entities?.get?.(ev.dst);
      if (!m || m.kind !== KIND.Mob) return;
      mobExp.hit.set(ev.dst, { sp: m.defId, map: getStore()?.getState?.()?.world?.mapId });
      if (mobExp.hit.size > 200) mobExp.hit.delete(mobExp.hit.keys().next().value);
    } else if (ev.t === 'die' && ev.id && mobExp.hit.has(ev.id)) {
      const r = mobExp.hit.get(ev.id); mobExp.hit.delete(ev.id);
      if (ev.killer && !mine.has(ev.killer)) return; // ein anderer hat ihn erledigt
      mobExp.pending.push({ ...r, t: Date.now() });
    }
  }
  function mobExpTick(st, now) {
    if (!mobExp.pending.length) return;
    const chat = st?.chat || [];
    for (const k of mobExp.pending) {
      const m = chat.find((c) => (c?.code === 'exp' || c?.code === 'exp_party') && c.ts >= k.t - 300 && !mobExp.used.has(c));
      if (m) {
        mobExp.used.add(m);
        const name = content()?.digimon?.[k.sp]?.name || k.sp;
        const e = mobExp.by.get(name) || { name, exp: 0, kills: 0, maps: new Set() };
        e.exp += Number(m.params?.exp) || 0; e.kills++; if (k.map) e.maps.add(k.map); mobExp.by.set(name, e);
        k.done = true;
      } else if (now - k.t > MOBEXP_WAIT_MS) k.done = true; // keine Meldung (z. B. 0 EXP): verwerfen
    }
    mobExp.pending = mobExp.pending.filter((k) => !k.done);
  }
  const mobExpReset = () => { mobExp.by = new Map(); mobExp.pending = []; mobExp.sig = ''; };
  function renderMobExp(st) {
    const el = panel.querySelector('[data-f="mobexp"]');
    if (!el || !panel.querySelector('[data-page="data"]').classList.contains('on')) return;
    const now = Date.now(); if (now - mobExp.at < 1000) return; mobExp.at = now;
    const rows = [...mobExp.by.values()].filter((e) => e.exp > 0).sort((a, b) => b.exp - a.exp);
    const tot = rows.reduce((n, e) => n + e.exp, 0);
    const esc = (x) => String(x ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const html = rows.length
      ? rows.map((e) => `<div title="${fmt(e.kills)} Kills · Ø ${fmt(e.exp / e.kills)} EXP je Kill · ${esc([...e.maps].map((id) => content()?.maps?.[id]?.name || id).join(', '))}"><span>${esc(e.name)}</span><em>${fmt(e.kills)}×</em><b>${fmt(e.exp)}</b><em>${Math.round(e.exp / tot * 100)} %</em></div>`).join('')
      : '<i class="digibot__none">noch keine EXP von Monstern</i>';
    if (html === mobExp.sig) return;
    mobExp.sig = html; el.innerHTML = html;
  }
  async function copyExpm(btn) {
    expmLoad();
    const text = JSON.stringify({ v: 1, kills: expm.data, levels: expm.levels });
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch { /* Zwischenablage gesperrt */ }
    btn.textContent = ok ? `Kopiert ✓ (${expm.data.length})` : 'Fehler';
    setTimeout(() => { btn.textContent = 'Messung kopieren'; }, 1500);
  }

  // ---------- Protokoll ----------
  const LOG_MAX = 2000; // 3.0.3: länger aufheben (300 reichten keine 10 min – Ursachen waren schon überschrieben)
  const LOG_COLORS = { bot: '#4dabf7', kill: '#2ecc71', potion: '#f783ac', auto: '#ffd43b', quest: '#fab005',
    map: '#3bc9db', level: '#69db7c', warn: '#ff6b6b' };
  const logbook = [];
  const LOG_FILTERS = {
    all: () => true,
    quest: (e) => (e.type === 'quest' || e.type === 'auto') && !/^Gruppe/.test(e.text),
    group: (e) => /^Gruppe|Party/.test(e.text),
    fight: (e) => e.type === 'kill' || e.type === 'potion' || e.type === 'level' || /ausweich|Warnkreis|Warnstrahl|Spiegel|Heal|Schutzzone/i.test(e.text),
    map: (e) => e.type === 'map',
    warn: (e) => e.type === 'warn',
  };
  let logSig = 0;
  function logEvent(type, text) {
    if(['kill','warn','bot'].includes(type))digibotCore.record(type,{action:text},true);
    const last = logbook[logbook.length - 1];
    if (last && last.type === type && last.text === text) { last.n = (last.n || 1) + 1; last.t = new Date(); }
    else logbook.push({ t: new Date(), type, text });
    if (logbook.length > LOG_MAX) logbook.shift();
    logSig++;
  }

  // Beobachtet den Spielstand und protokolliert Map-Wechsel, Level-Ups, Quest-Änderungen und Kills –
  // egal ob der Bot läuft oder du selbst spielst.
  const watchPrev = { map: null, level: null, quests: null, target: null, toasts: new Set() };
  const sess = { kills: 0, turnins: 0, faints: 0, wasFainted: false }; // Sitzungswerte für die Übersicht
  // Beute & Verbrauch: Inventar laufend vergleichen – mehr = erhalten (Drops, Belohnungen), weniger = verbraucht
  const loot = { inv: null, gained: new Map(), used: new Map(), bitsIn: 0, bitsOut: 0, lastBits: null, sig: '', at: 0 };
  function trackLoot(st) {
    const me = st?.me;
    if (!me || st.screen !== 'world' || !Array.isArray(me.inventory)) return;
    const cur = new Map();
    for (const it of me.inventory) if (it?.itemId) cur.set(it.itemId, (cur.get(it.itemId) || 0) + (it.qty || 1));
    const add = (m, id, n) => m.set(id, (m.get(id) || 0) + n);
    if (loot.inv) {
      for (const id of new Set([...cur.keys(), ...loot.inv.keys()])) {
        const d = (cur.get(id) || 0) - (loot.inv.get(id) || 0);
        if (d > 0) add(loot.gained, id, d); else if (d < 0) add(loot.used, id, -d);
      }
    }
    loot.inv = cur;
    if (typeof me.bits === 'number') {
      if (loot.lastBits != null) { const d = me.bits - loot.lastBits; if (d > 0) loot.bitsIn += d; else loot.bitsOut -= d; }
      loot.lastBits = me.bits;
    }
  }
  function renderLoot() {
    if (!panel.querySelector('[data-page="data"]').classList.contains('on')) return;
    const now = Date.now();
    if (now - loot.at < 1000) return;
    loot.at = now;
    const C = content(), esc = (x) => String(x ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const list = (m) => [...m.entries()].sort((a, b) => b[1] - a[1])
      .map(([id, n]) => `<div><span title="${esc(C?.items?.[id]?.name || id)}">${esc(C?.items?.[id]?.name || id)}</span><em>×${fmt(n)}</em></div>`).join('');
    const sum = `EXP gesamt: <b>${fmt(exp.total)}</b> · Bits: <b class="in">+${fmt(loot.bitsIn)}</b> / <b class="out">−${fmt(loot.bitsOut)}</b> (netto ${loot.bitsIn - loot.bitsOut >= 0 ? '+' : '−'}${fmt(Math.abs(loot.bitsIn - loot.bitsOut))})`;
    const sig = sum + [...loot.gained].join() + '|' + [...loot.used].join();
    if (sig === loot.sig) return;
    loot.sig = sig;
    panel.querySelector('[data-f="lootsum"]').innerHTML = sum;
    panel.querySelector('[data-f="lootin"]').innerHTML = list(loot.gained) || '<i class="digibot__none">noch nichts</i>';
    panel.querySelector('[data-f="lootout"]').innerHTML = list(loot.used) || '<i class="digibot__none">noch nichts</i>';
  }
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
          if (q.state === 3) sess.turnins++;
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
    if (pt && t && pt.id === t.id && pt.hp > 0 && t.hp <= 0 && t.kind === 'mob') { logEvent('kill', `Besiegt: ${t.name} Lv ${t.level}`); sess.kills++; }
    const fainted = !!me.partner?.fainted;
    if (fainted && !sess.wasFainted) sess.faints++;
    sess.wasFainted = fainted;
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
  const FAN_SAFE_DEG = 25;      // so viel Winkel neben einem Fächer gilt als voller Sicherheitsabstand (alle Fächer ≤ 180°)
  const DODGE_BASIC_PAD = 4;    // Reserve inside the real basic-attack range.
  const DODGE_LATE_ABORT_MS = 3000; // begonnene Flucht abbrechen, wenn danach noch so viel Zeit bliebe
  const DODGE_BASIC_RANGE = 32;     // Grundangriff-Reichweite, falls die Spieldaten keine nennen
  const DODGE_EDGE_MARGIN = 8;      // Abstand der Angriffsposition zum Kreisrand (etwa Körperbreite des Digimons)
  const DODGE_WALK_PX_S = 130;   // vorsichtig geschätzte Laufgeschwindigkeit beim Ausweichen
  const DODGE_HOLD_RANGE = 220; // so nah an einer noch aktiven Zone wird nach dem Ausweichen gewartet
  // Kurz vor dem Einschlag nicht wieder angreifen, wenn das Ziel neben einer Zone steht: Bosse laufen weiter, das
  // Digimon folgt ihnen in den Kreis (Probelauf Hard: Volley 0,3 s vor dem Einschlag – 3 Clavis auf einmal)
  const DODGE_SOON_MS = 1200, DODGE_SOON_PAD = 70;
  const dodgeState = { active: false, lastTap: 0, lastFollow: 0, goal: null, late: false, basicTarget: null, lastStop: 0, approachTarget:null, approachStopped:false, approachGoal:null };
  const DODGE_GOAL_MS = 3000;      // Fluchtpunkt höchstens so lange festhalten
  const DODGE_GOAL_REACHED = 12;   // so nah = angekommen
  const DODGE_RETAP_MS = 1000;     // Klick auf denselben Fluchtpunkt so oft wiederholen
  // Kleine Boss-Treffer tanken: Ausweichen kostet Schaden pro Sekunde, ein Trank ist billiger. Tankbar ist eine Fläche
  // mit festem Schaden bis TANK_MAX_PCT der Max-HP, nach der noch TANK_KEEP_PCT übrig bleiben – ohne Zurück-Digitieren
  // und ohne geteilten Treffer (z. B. Keramon „Crazy Turn“ 28 000, Chrysalimon „Data Crusher“ 30 000 gegen ~90 000 HP;
  // Infermons Ramme 60 000 und Spider Shooter 45 000 + Zurück-Digitieren nicht). Gilt nur, wenn ALLE gerade angesagten
  // Flächen tankbar sind; unbekannte Flächen (ohne festen Schaden) weicht der Bot weiter aus.
  const TANK_MAX_PCT = 35, TANK_KEEP_PCT = 15, TANK_AFTER_MS = 800; // nach dem Treffer noch > 15 % übrig (F1 heilt); Kreis bleibt kurz stehen
  // Schaden einer Fläche: fester Schaden, sonst grob geschätzt aus dem Angriff des Wirkers (AT × Power % × 1,5 Reserve
  // für Krit/Element) – z. B. die Chrysalimon-Wächter in Raum 1 des Kera-Dungeons (Data Crusher, Power 220: ~2 500)
  function skillDamage(sk, srcId) {
    if (sk?.fixedDamage) return sk.fixedDamage;
    const e = srcId ? window.dmo?.net?.state?.entities?.get?.(srcId) : null, d = e && content()?.digimon?.[e.defId];
    if (!sk?.power || !d?.base?.at) return null;
    const at = d.base.at + (d.growth?.at || 0) * Math.max(0, (e.level || 1) - 1);
    return Math.round(at * sk.power / 100 * 1.5);
  }
  function tankable(sk, p, srcId) {
    const dmg = cfg.tank ? skillDamage(sk, srcId) : null;
    // nie tanken, was mehr als Schaden macht: packen (Tentacle Bug), zurück-digitieren, markieren, teilen, Debuffs
    if (!dmg || sk.innerRadius || sk.islands || sk.trap || sk.scatter || sk.chargeRing || sk.grab || sk.devolve || sk.share || sk.mark || sk.reflect || (sk.effects || []).length || !p?.maxHp) return false;
    return dmg <= p.maxHp * TANK_MAX_PCT / 100 && (p.hp - dmg) >= p.maxHp * TANK_KEEP_PCT / 100;
  }
  function tankNow(now) {
    if (!cfg.tank) return false;
    const p = getStore()?.getState?.()?.me?.partner;
    let any = false, sum = 0, n = 0, top = 0;
    const ents = window.dmo?.net?.state?.entities;
    for (const [src, log] of bossSkillLog) {
      if (ents?.get?.(src)?.kind !== KIND.Mob) continue; // nur Monster – eigene/verbündete Skills (z. B. Invincible Sword, Kreis) zählen nicht
      for (const [id, e] of log) {
        const live = (e.phase === 'cast' && e.castEnd > now - 300) || (e.phase === 'release' && now - (e.relAt || 0) < TANK_AFTER_MS);
        if (!live) continue;
        const sk = content()?.skills?.[id];
        if (!sk || sk.kind === 'buff' || sk.target === 'self' || (sk.shape !== 'circle' && sk.shape !== 'line')) continue;
        if (!tankable(sk, p, src)) return false;
        const dmg = skillDamage(sk, src) || 0;
        any = true; sum += dmg; n++; top = Math.max(top, dmg);
      }
    }
    // Dieselbe Attacke mehrfach gleichzeitig (z. B. 4 Kopien von Diaboromon) steht nur einmal im Protokoll: liegen mehr
    // Warnzonen am Boden als Ansagen, zählen die übrigen als weitere Treffer der stärksten Attacke
    if (any) { const sc = worldScene(); const zones = (sc?.telegraphs?.active || []).length + (sc?.mechB?.lines || []).length; if (zones > n) sum += (zones - n) * top; }
    // gleichzeitige Treffer zusammen: höchstens so viel, wie auch ein einzelner tankbarer Treffer sein dürfte
    return any && sum <= p.maxHp * TANK_MAX_PCT / 100 && p.hp - sum >= p.maxHp * TANK_KEEP_PCT / 100;
  }
  // Infermon „NOT HERE“: frisst ein Terminal (scene.mechB.view.meals = [{ boss, left, ms, dmg }], dmg 0..1 = Anteil des
  // Schadens, der die Mahlzeit abbricht). Dann zählt nur Schaden – alle Skills sofort, ohne Zurückhalten.
  const mealOn = (id) => { try { return (worldScene()?.mechB?.view?.meals || []).some((m) => m.boss === id && (m.dmg ?? 0) < 1); } catch { return false; } };
  const ZONE_HUGE_R = 320;
  const LINE_AFTER_MS = 800, lineMemo = new Map();
  function digibotCircleZone(c,scene) {
    const raw=(scene?.telegraphs?.circles||[]).find(o=>Math.abs(o.x-c.x)<2 && Math.abs(o.y-c.y)<2 && (!c.skill || o.skill?.id===c.skill));
    const skill=raw?.skill||content()?.skills?.[c.skill]||{};
    const holes=skill.islands?(scene?.telegraphs?.islands||[]).filter(i=>i.skill===skill.id && raw?.src!=null && i.src===raw.src && (!i.end||i.end>=performance.now())).map(i=>({x:i.x,y:i.y,r:i.r})):[];
    return {kind:'circle',x:c.x,y:c.y,r:c.r,skillId:skill.id||c.skill,src:raw?.src,end:raw?.end||0,innerRadius:skill.innerRadius||0,holes,chargeRing:!!skill.chargeRing,hpDamagePct:skill.hpDamagePct||0};
  }
  // Lade-Ring (Corona Sanctions, 400 px, 10 s): die Ladung bricht durch Schaden – drinbleiben und draufhauen statt
  // hinauszulaufen (3.0.5; vorher 10 s Flucht, 0× gebrochen). Nur, solange die HP den Treffer (hpDamagePct) überstehen.
  function digibotChargeRingStay(z){
    if(!z?.chargeRing)return false;
    const p=getStore()?.getState?.()?.me?.partner;
    return !!p?.maxHp && p.hp/p.maxHp*100 > (z.hpDamagePct||60)+10;
  }
  function digibotDodgeReset(){Object.assign(dodgeState,{active:false,lastTap:0,lastFollow:0,goal:null,late:false,basicTarget:null,lastStop:0,approachTarget:null,approachStopped:false,approachGoal:null});lineMemo.clear();}
  function digibotDodgeSpeed(st) {
    const entities=window.dmo?.net?.state?.entities;
    const speeds=[controlled(st)?.speed,entities?.get?.(st?.me?.partner?.entityId)?.speed].filter(v=>Number.isFinite(v)&&v>0);
    return Math.min(DODGE_WALK_PX_S,...speeds);
  }
  function dangerZones() {
    const sc = worldScene(), zones = [];
    const tank = tankNow(Date.now());
    // Markierungen (z. B. Apocalymons „Big Bang Mark“): ein Kreis folgt einem Spieler und trifft beim Einschlag alle darin.
    // Ein anderer ist markiert -> sein Kreis ist Gefahrenzone. Ich bin markiert -> weg von allen anderen Spielern/Digimon.
    try {
      const marks = sc?.telegraphs?.marksActive || [];
      if (marks.length) {
        const ents = window.dmo?.net?.state?.entities, me = getStore()?.getState?.()?.me;
        const mine = new Set([me?.tamerEntityId, me?.partner?.entityId].filter(Boolean));
        for (const m of marks) {
          const r = m.r || 32;
          if (mine.has(m.dst)) {
            ents?.forEach?.((e) => { if ((e.kind === KIND.Tamer || e.kind === KIND.Partner) && !mine.has(e.id) && isFinite(e.x) && isFinite(e.y)) zones.push({ kind: 'circle', x: e.x, y: e.y, r }); });
          } else {
            const d = ents?.get?.(m.dst);
            if (d && isFinite(d.x) && isFinite(d.y)) zones.push({ kind: 'circle', x: d.x, y: d.y, r });
          }
        }
      }
    } catch { /* ignore */ }
    if (!tank) try {
      for (const c of sc?.telegraphs?.active || []) {
        // Raumweite Kreise (z. B. Apocalymons „Total Annihilation“, 640 px) kann man nicht verlassen – nur den Boss vorher
        // erledigen: nicht ausweichen, weiter angreifen (live: 20 s stillgestanden, Boss heilte sich von 5 auf 8 %)
        if (c && c.r > 0 && c.r < ZONE_HUGE_R && isFinite(c.x) && isFinite(c.y)) { const z = digibotCircleZone(c,sc); if (!digibotChargeRingStay(z)) zones.push(z); }
      }
    } catch { /* ignore */ }
    if (!tank) try {
      const t = performance.now();
      // Greifarm (Tentacle Bug) und Ansturm treffen erst NACH der Ansage – deren Strahl verschwindet aber schon vorher:
      // noch LINE_AFTER_MS als Gefahr behalten
      const now = Date.now(), live = (sc?.mechB?.lines || []).filter((l) => l && isFinite(l.fx) && isFinite(l.tx) && !(l.end && t > l.end + 150));
      for (const l of live) if (l.skill?.grab || l.skill?.dash) lineMemo.set(`${l.src}|${l.skill.id}|${Math.round(l.tx)}|${Math.round(l.ty)}`, { l, until: now + LINE_AFTER_MS });
      for (const [k, m] of lineMemo) { if (m.until < now) lineMemo.delete(k); else if (!live.some((l) => l.src === m.l.src && l.skill?.id === m.l.skill?.id)) live.push({ ...m.l, end: 0 }); }
      for (const l of live) {
        const len = Math.hypot(l.tx - l.fx, l.ty - l.fy);
        if (l.skill?.sweep) {
          zones.push({ kind: 'fan', x: l.fx, y: l.fy, len: len + (l.r || 16), dir: Math.atan2(l.ty - l.fy, l.tx - l.fx),
            half: (l.skill.sweep.arc || 90) * Math.PI / 360, end: l.end || 0,
            cover: l.skill.cover || content()?.skills?.[l.skill.id]?.cover || null });
        } else {
          zones.push({ kind: 'line', x: l.fx, y: l.fy, tx: l.tx, ty: l.ty, len, r: l.r || 16, end: l.end || 0 });
        }
      }
    } catch { /* ignore */ }
    try {
      for(const trap of sc?.mechB?.view?.traps||[])if(Number.isFinite(trap.x)&&Number.isFinite(trap.y)&&trap.r>0)zones.push({kind:'circle',x:trap.x,y:trap.y,r:trap.r,persistent:true});
      const pn=performance.now(),elapsed=Math.max(0,pn-(sc?.mechB?.viewAt??pn));
      const drifts=typeof sc?.mechB?.drifts?.values==='function'?[...sc.mechB.drifts.values()]:(sc?.mechB?.view?.drifters||[]);
      for(const d of drifts){
        if(![d.x,d.y,d.tx,d.ty,d.v,d.r].every(Number.isFinite)||d.r<=0)continue;
        const horizon=Math.max(2,Math.min(6,180/digibotDodgeSpeed(getStore()?.getState?.())));
        const len=Math.hypot(d.tx-d.x,d.ty-d.y),at=Math.min(len,Math.max(0,d.v)*elapsed/1000),to=Math.min(len,at+Math.max(0,d.v)*horizon);
        const dx=len?(d.tx-d.x)/len:0,dy=len?(d.ty-d.y)/len:0;
        zones.push({kind:'line',x:d.x+dx*at,y:d.y+dy*at,tx:d.x+dx*to,ty:d.y+dy*to,r:d.r,persistent:true});
      }
    } catch {}
    return zones;
  }
  // Raumweite Kreise (ab ZONE_HUGE_R) stehen nicht in dangerZones: meist kommt man nicht heraus, dann weiterkämpfen.
  // Gefahr sind sie nur fürs Ausweichen – wenn man draußen steht (nicht hineinlaufen) oder vor dem Einschlag noch
  // herauskommt (Rand nah genug, Restzeit bekannt).
  function hugeZones() {
    if (tankNow(Date.now())) return [];
    try {
      return (worldScene()?.telegraphs?.active || []).filter((c) => c && c.r >= ZONE_HUGE_R && isFinite(c.x) && isFinite(c.y))
        .map((c) => ({...digibotCircleZone(c,worldScene()),huge:true})).filter((z) => !digibotChargeRingStay(z));
    } catch { return []; }
  }
  const DODGE_SEARCH_R = 328;     // so weit sucht das Ausweichen nach einem freien Punkt
  const DODGE_HUGE_MAX_R = 900;   // bei raumweiten Kreisen höchstens so weit (wenn die Restzeit reicht)
  const DODGE_LATE_K = 1.5, DODGE_LATE_PAD_MS = 1500; // lange Ansagen: loslaufen bei Laufzeit × K + Puffer vor dem Einschlag
  // Wie weit kommt das Digimon vor dem Einschlag eines raumweiten Kreises? (mindestens die normale Suchweite)
  const hugeReach = (left,speed=DODGE_WALK_PX_S) => Math.min(DODGE_HUGE_MAX_R, Math.max(DODGE_SEARCH_R, left != null ? (left - 300) / 1000 * speed : 0));
  function hugeCounts(h,p,speed=DODGE_WALK_PX_S) {
    const out=zoneDist(h,p).d;
    if (out >= DODGE_MARGIN) return true; // draußen
    const need = DODGE_MARGIN * 1.5 - out, left = zoneLeftMs(h);
    return left != null && need <= Math.min(hugeReach(left,speed),(left-300)/1000*speed);
  }
  // Deckung (z. B. Ultimate Flare: „hinter eine zerbrochene Platte“): skill.cover = { points: [Spawn-Punkte], radius }.
  // Geschützt ist, wer höchstens radius vom Punkt entfernt auf der vom Boss abgewandten Seite steht (live bestätigt).
  const COVER_BEHIND = 12; // so weit hinter dem Punkt wird angesteuert
  function coverSpots(z, mapId) {
    if (!z?.cover?.points) return [];
    const sp = world.maps[mapId]?.spawns || {};
    return z.cover.points.map((n) => sp[n]).filter(Boolean).map((s) => {
      const d = Math.hypot(s.x - z.x, s.y - z.y) || 1;
      return { s, r: z.cover.radius || 26, aim: { x: s.x + (s.x - z.x) / d * COVER_BEHIND, y: s.y + (s.y - z.y) / d * COVER_BEHIND } };
    });
  }
  function covered(z, p, mapId) {
    return coverSpots(z, mapId).some(({ s, r }) => Math.hypot(p.x - s.x, p.y - s.y) <= r * 0.85
      && (p.x - s.x) * (s.x - z.x) + (p.y - s.y) * (s.y - z.y) > 0);
  }
  // Abstand eines Punkts zur Zone (≤ 0 = drinnen) und der nächste Punkt der Zone (zum Weglaufen).
  function zoneDist(z, p) {
    if(z.kind==='circle'){
      const radius=Math.hypot(p.x-z.x,p.y-z.y);let d=radius-z.r,nx=z.x,ny=z.y;
      if(z.innerRadius){
        const inner=z.innerRadius-radius;
        if(inner>d){d=inner;const k=radius?(z.r+1)/radius:0;nx=z.x+(p.x-z.x)*k;ny=z.y+(p.y-z.y)*k;}
      }
      for(const h of z.holes||[]){const safe=h.r-Math.hypot(p.x-h.x,p.y-h.y);if(safe>d){d=safe;nx=2*p.x-h.x;ny=2*p.y-h.y;}}
      return {d,nx,ny};
    }
    if (z.kind === 'line') {
      const dx = z.tx - z.x, dy = z.ty - z.y, L2 = dx * dx + dy * dy || 1;
      const k = Math.max(0, Math.min(1, ((p.x - z.x) * dx + (p.y - z.y) * dy) / L2));
      const nx = z.x + dx * k, ny = z.y + dy * k;
      return { d: Math.hypot(p.x - nx, p.y - ny) - z.r, nx, ny };
    }
    // Fächer: Kreisausschnitt um den Boss. Außerhalb des Winkels zählt auch der Winkelabstand: FAN_SAFE_DEG neben dem
    // Fächer gelten wie der volle Sicherheitsabstand – so ist der Platz direkt hinter dem Boss frei, auch dicht dran,
    // und das Digimon schlägt von dort weiter zu (3.0.4; vorher galt nur der Abstand zur Spitze = zum Boss)
    const dist = Math.hypot(p.x - z.x, p.y - z.y);
    let diff = Math.abs(Math.atan2(p.y - z.y, p.x - z.x) - z.dir) % (2 * Math.PI);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    if (diff <= z.half) return { d: dist - z.len, nx: z.x, ny: z.y };
    const side = dist * Math.sin(Math.min(Math.PI / 2, diff - z.half));
    const ang = (diff - z.half) / (FAN_SAFE_DEG * Math.PI / 180) * DODGE_MARGIN * 1.5;
    return { d: Math.max(side, dist - z.len, ang), nx: z.x, ny: z.y };
  }
  function digibotDodgeZoneSafe(z,p,margin=DODGE_MARGIN){
    // Small protected islands need an interior reserve, not a 28px border that leaves only a 2px target.
    let required=margin;
    // Ring mit sicherem Innenkreis (Endless Surge 32 px, Rengokusou 40 px): im Innenkreis reichen wenige Pixel Reserve –
    // das Digimon steht beim Angriff ~26 px vom Boss und soll dort bleiben, nicht aus dem ganzen Ring hinauslaufen (3.0.5)
    if(z.innerRadius && Math.hypot(p.x-z.x,p.y-z.y)<z.innerRadius)required=Math.min(required,Math.max(4,z.innerRadius/8));
    for(const h of z.holes||[])if(Math.hypot(p.x-h.x,p.y-h.y)<h.r)required=Math.min(required,Math.max(10,h.r/3));
    // Schmaler Strahl/Ansturm (Trinity Arm 10 px, Behemoth 14 px): der Sicherheitsabstand schrumpft mit der Breite –
    // ein Schritt zur Seite reicht, das Digimon bleibt in Schlagweite (3.0.5; vorher 28/42 px wie bei breiten Kreisen)
    if(z.kind==='line' && Number.isFinite(z.r))required=required*Math.min(1,Math.max(12,z.r)/DODGE_MARGIN);
    return zoneDist(z,p).d>=required;
  }
  // Exact expanded circle edges supplement the coarse escape rings. Include the
  // nearest point, the boss-facing point and intersections of overlapping edges.
  // These are candidates only: terrain, other hazards and timing are checked below.
  function digibotDodgeCirclePoints(zones,from,target,maxDistance){
    const points=[],pad=DODGE_MARGIN*1.5+0.05;
    const circles=zones.filter(z=>z.kind==='circle'&&Number.isFinite(z.r)&&z.r>=0
      && Math.abs(Math.hypot(from.x-z.x,from.y-z.y)-(z.r+pad))<=maxDistance);
    const add=(x,y)=>{if(Math.hypot(x-from.x,y-from.y)<=maxDistance)points.push({x,y});};
    for(const z of circles){
      const r=z.r+pad,angle=Math.atan2(from.y-z.y,from.x-z.x);
      const angles=[angle];
      if(target)angles.push(Math.atan2(target.y-z.y,target.x-z.x));
      for(let i=0;i<64;i++)angles.push(angle+i*Math.PI/32);
      for(const a of angles)add(z.x+Math.cos(a)*r,z.y+Math.sin(a)*r);
    }
    for(let i=0;i<circles.length;i++)for(let j=i+1;j<circles.length;j++){
      const a=circles[i],b=circles[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
      const ar=a.r+pad,br=b.r+pad;
      if(!d||d>ar+br||d<Math.abs(ar-br))continue;
      const along=(ar*ar-br*br+d*d)/(2*d),side=Math.sqrt(Math.max(0,ar*ar-along*along));
      const x=a.x+dx*along/d,y=a.y+dy*along/d;
      add(x-dy*side/d,y+dx*side/d);add(x+dy*side/d,y-dx*side/d);
    }
    return points;
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
  // Draußen warten, Ziel steht in einer Warnzone: einen bereiten Fernkampf-Skill wirken, dessen Reichweite vom
  // aktuellen Platz des Digimons bis zum Ziel reicht (der normale Angriff ist bei allen Digimon Nahkampf).
  // Nur Skills auf ein Gegner-Ziel ab RANGED_MIN Reichweite, kein Ansturm (der würde in den Kreis führen).
  const RANGED_MIN = 64;
  // Nach dem Fernangriff läuft das Digimon dem Ziel zum Nahkampf hinterher – geradeaus. Erreicht es dabei eine Zone,
  // bevor sie einschlägt, nicht feuern (Probelauf Hard: Clavis liefen 0,6–1,2 s vor der Ultimate Flare in den Fächer).
  // Restzeit unbekannt: wie bisher erlaubt (im Spiel haben Kreise, Strahlen und Fächer eine Endzeit).
  function rangedSafe(from, target, zones) {
    const d = Math.hypot(target.x-from.x,target.y-from.y),n=Math.max(1,Math.ceil(d/12)),pn=performance.now(),walkSpeed=digibotDodgeSpeed(getStore()?.getState?.());
    for (const z of zones) {
      const left = z.kind === 'circle' ? zoneLeftMs(z) : z.end ? z.end - pn : null;
      // Restzeit unbekannt: Fernangriff erlaubt – das Digimon bleibt draußen (nach dem Cast hält dodge() es an,
      // statt es zum Nahkampf in die Zone laufen zu lassen)
      if (left == null) continue;
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        if (zoneDist(z, { x: from.x + (target.x - from.x) * k, y: from.y + (target.y - from.y) * k }).d >= DODGE_MARGIN * 0.5) continue;
        if (left + 300 >= d*k/walkSpeed*1000) return false; // schneller da als die Zone weg ist
        break;
      }
    }
    return true;
  }
  function rangedFromOutside(st, target, partner, now) {
    const p = st?.me?.partner;
    if (!p || p.evolving || p.fainted || st.target?.id !== target.id || (bot.engage?.id===target.id && bot.engage.noDmg) || noFightEarly(st,now)) return null;
    if (!bot.can('skill', SKILL_GAP_MS, now) || farmShielded(target, now) || (cfg.mirror && mirrorActive(target.id))) return null;
    const d = Math.hypot(target.x - partner.x, target.y - partner.y), C = content();
    for (const k of SKILL_KEYS) {
      if (!skillOn(st, k) || healAt(st, k)) continue;
      const s = skillOnKey(st, k);
      if (!s || isKoh(s.skill) || s.cdLeft > 0 || s.skill.unlocked === false || p.ds < (s.skill.dsCost || 0)) continue;
      const def = (s.skill.id && C?.skills?.[s.skill.id]) || {};
      if(digibotSkillAggroReason(st,target,s.skill)||digibotBossPeace(st))continue;
      const range = s.skill.range ?? def.range ?? 0, tgt = s.skill.target ?? def.target;
      if (range < RANGED_MIN || d > range || (tgt && tgt !== 'enemy') || s.skill.dash || def.dash) continue;
      if (!bot.can('Digit' + k, SKILL_GAP_MS * 2, now)) continue;
      bot.lastPress.skill = now;
      bot.hit('Digit' + k, now);
      dodgeState.rangedUntil = now + (s.skill.castMs ?? def.castMs ?? 600) + 300; // Cast nicht durch partnerStop abbrechen
      return s.skill.name || `Skill ${k}`;
    }
    return null;
  }
  // fromStart: der Abstand zu blockierten Feldern wächst erst vom Startpunkt aus auf radius an – wer dicht an einer Wand
  // steht, darf von ihr weggehen (sonst fiel jede Strecke schon am Start durch: alles „nicht erreichbar“, 3.0.2)
  function digibotDodgeGridClear(a,b,grid,radius=0,fromStart=false) {
    if(!grid?.blocked||!grid.w||!grid.h)return false;
    const len=Math.hypot(b.x-a.x,b.y-a.y),count=Math.max(1,Math.ceil(len/4)),tile=grid.tile||16,full=radius?radius+2:0;
    for(let i=0;i<=count;i++){
      const x=a.x+(b.x-a.x)*i/count,y=a.y+(b.y-a.y)*i/count,pad=fromStart?Math.min(full,len*i/count):full;
      for(let gy=Math.floor((y-pad)/tile);gy<=Math.floor((y+pad)/tile);gy++)for(let gx=Math.floor((x-pad)/tile);gx<=Math.floor((x+pad)/tile);gx++)if(gx<0||gy<0||gx>=grid.w||gy>=grid.h||grid.blocked[gy*grid.w+gx]===1)return false;
    }
    return true;
  }
  function digibotDodgeZonePath(a,b,zones,margin=DODGE_MARGIN) {
    const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/4));
    for(let i=0;i<=count;i++)if(zones.some(z=>!digibotDodgeZoneSafe(z,{x:a.x+(b.x-a.x)*i/count,y:a.y+(b.y-a.y)*i/count},margin)))return false;
    return true;
  }
  function digibotOutsideBasicPlan(st,target,partner,tamer,zones,soon) {
    if(soon||!target||!partner||!tamer||target.kind!==KIND.Mob||target.hp<=0||st.target?.id!==target.id)return null;
    const p=st.me?.partner,scene=worldScene(),C=content(),following=dodgeState.basicTarget===target.id;
    if(!p||p.fainted||p.evolving||(partner.flags&(FLAG.Dead|FLAG.Casting|FLAG.Evolving|FLAG.Held))||(!following&&(partner.flags&FLAG.Moving))||(target.flags&(FLAG.Dead|FLAG.Hidden|FLAG.Untargetable|FLAG.Moving)))return null;
    const def=C?.digimon?.[partner.defId||p.species],range=def?.basic?.range??DODGE_BASIC_RANGE,radius=Math.max(1,Math.min(C?.digimon?.[target.defId]?.radius??7,7)),grid=scene?.map?.grid;
    if(!Number.isFinite(range)||range<=0||(!following&&(tamer.flags&FLAG.Moving))||(!following&&scene?.approach?.phase==='walking'))return null;
    const tamerDist=Math.hypot(tamer.x-target.x,tamer.y-target.y);
    const tamerWalking=tamer.id!==partner.id && (tamerDist>180 || scene?.approach?.phase==='walking');
    // Current client approaches from beyond 192px and stops at 112px; check a slightly longer corridor.
    const tamerPoint=tamerWalking?{x:target.x+(tamer.x-target.x)*Math.min(1,108/(tamerDist||1)),y:target.y+(tamer.y-target.y)*Math.min(1,108/(tamerDist||1))}:tamer;
    if(!digibotDodgeZonePath(tamer,tamerPoint,zones)||!digibotDodgeGridClear(tamer,tamerPoint,grid,tamerWalking?5:0))return null;
    const positions=[partner],predicted=scene?.ownPartner;
    if(predicted?.moving&&!following)return null;
    if(predicted&&Number.isFinite(predicted.x)&&Number.isFinite(predicted.y))positions.push(predicted);
    let plan=null;
    for(const from of positions){
      const dist=Math.hypot(from.x-target.x,from.y-target.y),stand=Math.max(1,range+radius-DODGE_BASIC_PAD),fraction=dist>stand?stand/dist:1;
      const point={x:target.x+(from.x-target.x)*fraction,y:target.y+(from.y-target.y)*fraction};
      // Angriffsposition knapp vor dem Kreisrand (Körperbreite statt 28 px Reserve): ein Boss knapp im Kreis bleibt erreichbar
      if(!digibotDodgeZonePath(from,point,zones,DODGE_EDGE_MARGIN)||!digibotDodgeGridClear(from,point,grid,Math.max(1,Math.min(def?.radius??7,7)))||!digibotDodgeGridClear(from,target,grid))return null;
      plan={point,walking:dist>stand||tamerWalking};
    }
    return plan;
  }
  function digibotOutsideBasicReady(st,target,partner,tamer,zones,soon){const plan=digibotOutsideBasicPlan(st,target,partner,tamer,zones,soon);return !!plan&&!plan.walking;}
  function digibotOutsideStop(partner,now) {
    if((dodgeState.basicTarget || partner?.targetId) && now-dodgeState.lastStop>=500){
      dodgeState.lastStop=now;commands()?.partnerStop?.();bot.attackedId=null;
    }
    dodgeState.basicTarget=null;
  }
  // Restzeit eines Warnkreises (ms) aus den Daten des Spiels – null, wenn unbekannt (Strahlen, Markierungen)
  function zoneLeftMs(z) {
    if(z?.end)return Math.max(0,z.end-performance.now());
    if (z?.kind !== 'circle' || z.persistent) return null;
    try {
      const c = (worldScene()?.telegraphs?.circles || []).find((o) => Math.abs(o.x-z.x)<2 && Math.abs(o.y-z.y)<2 && (!z.skillId||o.skill?.id===z.skillId) && o.end);
      return c ? Math.max(0, c.end - performance.now()) : null;
    } catch { return null; }
  }
  const zoneName = (z) => (z.kind === 'circle' ? `Warnkreis (Radius ${Math.round(z.r)})` : z.kind === 'fan' ? 'Warnfächer' : 'Warnstrahl');
  function digibotDodgeApproach(st,target,tamer,partner,zones,now){
    if(!bot.on||!target||target.kind!==KIND.Mob||!tamer||!partner||noFightEarly(st,now)||digibotBossPeace(st))return null;
    const distance=Math.hypot(tamer.x-target.x,tamer.y-target.y);
    if(distance<=DODGE_HOLD_RANGE&&dodgeState.approachTarget!==target.id)return null;
    const starting=dodgeState.approachTarget!==target.id;
    dodgeState.approachTarget=target.id;dodgeState.active=true;
    digibotOutsideStop(partner,now);
    // Stop short of the boss, letting nearestSafe choose the closest reachable
    // point if a warning covers this position. No attack order is used here.
    const stand=96,ratio=Math.min(1,stand/(distance||1));
    let goal=dodgeState.approachGoal;
    if(starting||!goal||Math.hypot(goal.tx-target.x,goal.ty-target.y)>24)goal=dodgeState.approachGoal={x:target.x+(tamer.x-target.x)*ratio,y:target.y+(tamer.y-target.y)*ratio,tx:target.x,ty:target.y};
    const companion=tamer.id!==partner.id?partner:null;
    const result=walkTo(st,goal.x,goal.y,now,{zones,nearestSafe:true,companion});
    if(result==='stuck'){
      // Cancel an old native chase when its replacement cannot be proven safe.
      if(!dodgeState.approachStopped){worldScene()?.tapGround?.(tamer.x,tamer.y);autopilot.nav=null;autopilot.route=null;}
      dodgeState.approachStopped=true;
      return 'Warte außerhalb – derzeit kein sicherer Annäherungsweg';
    }
    dodgeState.approachStopped=false;
    const wp=autopilot.nav?.wp;
    if(companion&&wp&&(starting||now-dodgeState.lastFollow>1500)&&digibotDodgeZonePath(partner,wp,zones)&&digibotDodgeGridClear(partner,wp,worldScene()?.map?.grid)){
      dodgeState.lastFollow=now;commands()?.partnerFollow?.();
    }
    if(wp&&Math.hypot(tamer.x-wp.x,tamer.y-wp.y)<12)return 'Warte außerhalb – sicherer Platz nahe am Boss erreicht';
    return 'Nähere mich über sicheren Weg – halte Abstand zu Warnflächen';
  }
  function dodge(st, now) {
    const walkSpeed=digibotDodgeSpeed(st);
    if (!cfg.dodge) return null;
    const zones = dangerZones();
    const ents = window.dmo?.net?.state?.entities;
    const tamer = controlled(st), partner = ents?.get?.(st?.me?.partner?.entityId);
    const me0 = tamer || partner;
    if (me0) for (const h of hugeZones()) if ([tamer,partner].some(p=>p && hugeCounts(h,p,walkSpeed))) zones.push(h);
    // Hinter einer Deckung (Platte bei der Ultimate Flare) gilt man in deren Zone als sicher
    const cmap = st?.world?.mapId;
    const inZone = (p) => p && zones.find((z) => !digibotDodgeZoneSafe(z,p) && !covered(z,p,cmap));
    const approaching=!!dodgeState.approachTarget;
    const z = inZone(tamer) || inZone(partner);
    const tEnt = st?.target?.id ? ents?.get?.(st.target.id) : null;
    const target = tEnt && tEnt.hp > 0 ? tEnt : null;
    if (!z) {
      // A selected old enemy must not hold up a safe NPC route or boss-channel
      // transition. Their actual movement is checked by walkTo against hazards.
      if(noFightEarly(st,now)||(digibotBossPeace(st)&&!digibotChannelBasicAllowed(st,now))){
        digibotOutsideStop(partner,now);
        if(dodgeState.approachTarget){autopilot.nav=null;autopilot.route=null;}
        dodgeState.approachTarget=null;dodgeState.approachGoal=null;dodgeState.active=false;
        return null;
      }
      dodgeState.goal = null; dodgeState.late = false;
      // Draußen, aber der Angriff läuft noch: nicht wieder hineinlaufen (Taste 1 würde das Digimon zum Ziel in der
      // Zone schicken). Mit Ziel: weiterkämpfen, sobald das Ziel frei steht und der direkte Weg dorthin frei ist.
      // Ohne Ziel: warten, bis alle Zonen in der Nähe verschwunden sind. Das Digimon bleibt so lange beim Tamer.
      const near=zones.some(c=>[tamer,partner,target].some(p=>p&&zoneDist(c,p).d<DODGE_HOLD_RANGE)) || !!(target&&partner&&!lineClear(partner,target,zones));
      if(!zones.length&&dodgeState.approachTarget){dodgeState.approachTarget=null;dodgeState.approachGoal=null;dodgeState.approachStopped=false;autopilot.nav=null;autopilot.route=null;}
      const from = partner || tamer;
      // Strahl/Ansturm, der am Boss beginnt: nicht der Boss zählt (der steht immer „in“ der Linie), sondern die
      // Angriffsposition seitlich davor – sonst griff der Bot bei jedem Folge-Stoß 1,2 s lang nicht an (3.0.5)
      const basicRange = content()?.digimon?.[st?.me?.partner?.species]?.basic?.range;
      const stand0 = Number.isFinite(basicRange) ? basicRange + 7 : 40;
      const attackPos = target && from ? (() => { const d = Math.hypot(from.x - target.x, from.y - target.y) || 1, k = Math.min(1, stand0 / d); return { x: target.x + (from.x - target.x) * k, y: target.y + (from.y - target.y) * k }; })() : target;
      const soonNear = !!target && zones.some((c) => {
        const left = c.end ? c.end - performance.now() : zoneLeftMs(c);
        const narrow = c.kind === 'line' && (c.r || 16) < DODGE_MARGIN; // nur schmale Linien – breite Strahlen wie Kreise
        return left != null && left < DODGE_SOON_MS && zoneDist(c, narrow ? attackPos : target).d < (narrow ? Math.max(12, c.r || 16) + 12 : DODGE_SOON_PAD);
      });
      const plan=digibotOutsideBasicPlan(st,target,partner,tamer,zones,soonNear);
      // Ziel knapp im Warnkreis, Angriffsposition draußen frei: mit der 1 angreifen – auch ohne vorherigen Kampf
      if(near && plan && st.target?.id===target.id && !noFightEarly(st,now) && !farmShielded(target,now) && !mirrorActive(target.id)){
        if(dodgeState.approachTarget){autopilot.nav=null;autopilot.route=null;dodgeState.approachTarget=null;dodgeState.approachGoal=null;}
        dodgeState.active=true;dodgeState.basicTarget=target.id;
        if(bot.can('Digit1',ATTACK_REPEAT_MS,now))bot.hit('Digit1',now);
        return plan.walking?'Sicherer Weg zur Angriffsposition · normaler Angriff':'Außerhalb der Warnzone · normaler Angriff ohne Annäherung';
      }
      if(dodgeState.basicTarget)digibotOutsideStop(partner,now);
      const approach=zones.length?digibotDodgeApproach(st,target,tamer,partner,zones,now):null;
      if(approach)return approach;
      const blocked=!!target || dodgeState.active;
      if (near && blocked) {
        if (!(dodgeState.rangedUntil > now)) digibotOutsideStop(partner,now); // nach dem Fern-Cast: Digimon anhalten, draußen bleiben
        if (!dodgeState.active) { dodgeState.active = true; logEvent('warn', 'Ziel steht in einer Warnzone – warte draußen'); }
        const close = partner && tamer && Math.hypot(partner.x - tamer.x, partner.y - tamer.y) <= 40;

        // Fernkampf-Skills reichen oft bis zum Boss, ohne dass das Digimon in den Kreis muss
        const ra = target && close && !soonNear && rangedSafe(partner, target, zones) ? rangedFromOutside(st, target, partner, now) : null; // kurz vor dem Einschlag nicht: danach läuft das Digimon zum Nahkampf hinein
        return ra ? `Warte außerhalb · Fernangriff: ${ra}` : 'Warte außerhalb, bis der Flächenangriff vorbei ist…';
      }
      if (dodgeState.active) { dodgeState.active = false; logEvent('auto', 'Ausweichen beendet – weiter'); }
      return null;
    }
    dodgeState.approachTarget=null;dodgeState.approachGoal=null;dodgeState.approachStopped=false;
    if(dodgeState.basicTarget)digibotOutsideStop(partner,now);
    // Circle-edge candidates avoid unnecessary overshoot. Coarse rings remain
    // available for lines, cones and blocked edges. Every candidate must pass
    // the same terrain, warning-zone and time-budget checks.
    const me = tamer || partner;
    const g = worldScene()?.map?.grid, T = g?.tile || 16;
    const walkable = (x,y) => {
      if(!g?.blocked)return true;const gx=Math.floor(x/T),gy=Math.floor(y/T);
      return gx>=0&&gy>=0&&gx<g.w&&gy<g.h&&g.blocked[gy*g.w+gx]!==1;
    };
    const nz = zoneDist(z, me);
    let base = Math.atan2(me.y - nz.ny, me.x - nz.nx);
    if (!isFinite(base) || (me.x === nz.nx && me.y === nz.ny)) base = z.kind === 'line' ? Math.atan2(z.ty - z.y, z.tx - z.x) + Math.PI / 2 : 0;
    // Mit Ziel: unter allen freien Punkten, die vor dem Einschlag noch erreichbar sind, den nächsten am Ziel – dann
    // kann das Digimon von dort weiter angreifen (oft sogar mit der 1). Erreichbar = Laufweg passt in die Restzeit
    // des Warnkreises (unbekannt: höchstens 72 px weiter als zum nächsten freien Punkt).
    // Mehrere Kreise übereinander: es zählt der früheste Einschlag unter allen, in denen ich stehe
    const inside = zones.filter((c) => [tamer, partner].some((e) => e && !digibotDodgeZoneSafe(c,e) && !covered(c,e,cmap)));
    const lefts = inside.map(zoneLeftMs).filter((v) => v != null);
    const left = lefts.length ? Math.min(...lefts) : zoneLeftMs(z);
    // Laufweg: darf nicht durch einen ANDEREN Kreis/Strahl führen (aus denen, in denen ich stehe, muss ich ohnehin
    // heraus) – außer er schlägt nachweislich erst ein, wenn ich längst vorbei bin
    const others = zones.filter((c) => !inside.includes(c));
    const zoneLeft = (c) => (c.kind === 'circle' ? zoneLeftMs(c) : c.end ? Math.max(0, c.end - performance.now()) : null);
    const pathClear = (p) => {
      const ms = Math.hypot(p.x - me.x, p.y - me.y) / walkSpeed * 1000 + 500;
      return lineClear(me, p, others.filter((c) => { const l = zoneLeft(c); return l == null || l < ms; }));
    };
    // Golemon & Co.: nur Fluchtpunkte nahe am Startplatz des Monsters (Verfolgungsreichweite minus Sicherheitsabstand)
    const kg = target && KITE_GUARD[target.defId] !== undefined && (!KITE_GUARD[target.defId] || KITE_GUARD[target.defId] === st?.world?.mapId);
    const home = kg ? mobHome.get(target.id) : null;
    const leash = home ? (content()?.digimon?.[target.defId]?.mob?.leashRange || 320) - 80 : Infinity;
    const inLeash = (p) => !home || Math.hypot(p.x - home.x, p.y - home.y) <= leash;
    let first = null, firstRad = 0, best = null, bestScore = Infinity, safeOnly = null, crossOnly = null;
    // Schutzzonen meiden: dort kann man nicht kämpfen (danach erst wieder herauslaufen) – nur als letzter Ausweg
    const mapId = st.world?.mapId;
    // Fluchtpunkt festhalten, solange er frei bleibt und noch nicht erreicht ist – neu gesucht aus der jeweils
    // aktuellen Position sprang der beste Punkt beim Laufen zwischen Nachbarrichtungen hin und her (Eiern)
    const g0 = dodgeState.goal;
    let keep = g0 && now - g0.at < DODGE_GOAL_MS && Math.hypot(me.x - g0.x, me.y - g0.y) > DODGE_GOAL_REACHED
      && !zones.some((c) => !digibotDodgeZoneSafe(c,g0,DODGE_MARGIN*1.5) && !covered(c,g0,mapId)) && pathClear(g0);
    // Raumweiter Kreis (z. B. Marsmons Corona Sanctions, 400 px): so weit suchen, wie das Digimon in der Restzeit
    // kommt – dann aber nur Punkte mit geradem, begehbarem Weg (keine Wand dazwischen)
    const maxR = inside.some((c) => c.huge) ? hugeReach(left,walkSpeed) : DODGE_SEARCH_R;
    // Match safe approach checks: fine sampling and body clearance prevent
    // an otherwise valid edge point from cutting through a blocked tile corner.
    const walkLine = (p) => !g?.blocked || digibotDodgeGridClear(me,p,g,5);
    if(keep && !walkLine(g0))keep=false;
    if (keep) best = g0;
    else {
      const candidates=digibotDodgeCirclePoints(zones,me,target,maxR);
      for(let rad=40;rad<=maxR;rad+=24)for(let i=0;i<16;i++){
        const ang=base+(i%2?1:-1)*Math.ceil(i/2)*(Math.PI/8);
        candidates.push({x:me.x+Math.cos(ang)*rad,y:me.y+Math.sin(ang)*rad});
      }
      // Nearest valid escape establishes the time budget before comparing
      // boss-facing alternatives. Small moves need not round up to 40/64px.
      candidates.sort((a,b)=>Math.hypot(a.x-me.x,a.y-me.y)-Math.hypot(b.x-me.x,b.y-me.y));
      for(const p of candidates){
        const rad=Math.hypot(p.x-me.x,p.y-me.y);
        const budget=left!=null?Math.max(firstRad,(left-300)/1000*walkSpeed):firstRad+72;
        if(first&&rad>budget+0.001)break;
        if(!walkable(p.x,p.y)||zones.some(c=>!digibotDodgeZoneSafe(c,p,DODGE_MARGIN*1.5))||!walkLine(p))continue;
        const clear=pathClear(p);
        if(safeRectAt(mapId,p)){if(clear)safeOnly||=p;else crossOnly||=p;continue;}
        if(!clear){crossOnly||=p;continue;}
        if(!first){first=p;firstRad=rad;}
        const score=!target?rad:Math.hypot(p.x-target.x,p.y-target.y)
          +(lineClear(p,target,zones)||inZone(target)?0:200)+(inLeash(p)?0:1000);
        if(score<bestScore-0.001||(Math.abs(score-bestScore)<=0.001&&(!best||rad<Math.hypot(best.x-me.x,best.y-me.y)))){bestScore=score;best=p;}
        if(!target)break;
      }
    }
    if(!keep)for(const area of zones){
      const safePoints=[...(area.holes||[]),...(area.innerRadius?[{x:area.x,y:area.y}]:[])];
      for(const point of safePoints){
        if(!walkable(point.x,point.y)||!walkLine(point)||!pathClear(point)||zones.some(c=>!digibotDodgeZoneSafe(c,point)))continue;
        const distance=Math.hypot(point.x-me.x,point.y-me.y);
        if(left!=null && distance/walkSpeed*1000>left-300)continue;
        if(left==null && first && distance>firstRad+72)continue;
        const score=target?Math.hypot(point.x-target.x,point.y-target.y)+(inLeash(point)?0:1000):distance;
        if(!best||score<bestScore){best={x:point.x,y:point.y};bestScore=score;}
      }
    }
    best ||= first || safeOnly || crossOnly;
    // Deckung als Fluchtpunkt: hinter einer Platte, wenn der Weg dorthin kürzer ist als hinaus (Fächer der Ultimate Flare
    // ist 140° breit und ~380 px lang – aus dem Nahkampf oft ein weiter Weg)
    if (!keep) {
      const cl = inside.map(zoneLeft).filter((v) => v != null), covLeft = cl.length ? Math.min(...cl) : null;
      let cov = null, covD = Infinity;
      for (const z0 of inside) for (const { aim } of coverSpots(z0, mapId)) {
        const d = Math.hypot(aim.x - me.x, aim.y - me.y);
        if (d >= covD || !walkable(aim.x, aim.y) || !walkLine(aim) || !pathClear(aim)) continue;
        if (covLeft != null && d / walkSpeed * 1000 > covLeft - 300) continue; // nicht rechtzeitig dort
        if (zones.some((c) => zoneDist(c, aim).d < DODGE_MARGIN * 1.5 && !covered(c, aim, mapId))) continue; // andere Zone
        cov = aim; covD = d;
      }
      if (cov && (!best || covD < Math.hypot(best.x - me.x, best.y - me.y))) best = cov;
    }
    if (!best) { dodgeState.active = false; dodgeState.goal = null; return null; } // kein Fluchtpunkt: stehen bleiben hilft nicht – weiterkämpfen
    // Lange Ansage (z. B. Machinedramons Full Charge, 12 s): weiterkämpfen und erst so spät loslaufen, dass es
    // großzügig reicht (Laufzeit × 1,5 + 1,5 s) – sonst steht das Digimon ~10 s untätig draußen.
    // Nur, wenn die Restzeit jeder Zone bekannt ist, in der es steht; ein schon begonnener Lauf wird nicht abgebrochen.
    // Nicht, während ein Boss einen Key-of-Hope-Treffer ansagt: dann sammelt sich die Gruppe – wer erst spät losläuft,
    // steht beim Sammeln noch verstreut (Probelauf Raum 4: mehr Stürze)
    // Auch ohne Ziel (Add getötet, Zielwechsel, Formwechsel) – sonst rannte der Bot sofort Hunderte Pixel weg und stand
    // dann bis zum Kreisende untätig herum (2.32.1). Ein schon begonnener Lauf wird abgebrochen, wenn noch viel Zeit bleibt.
    if (!approaching && (!target || !partner || Math.hypot(partner.x-target.x,partner.y-target.y)<=DODGE_HOLD_RANGE) && inside.length && lefts.length === inside.length && !kohBlockPending(now)) {
      const runMs = Math.hypot(best.x - me.x, best.y - me.y) / walkSpeed * 1000;
      const spare = left - (runMs * DODGE_LATE_K + DODGE_LATE_PAD_MS);
      if (spare > 0 && (!keep || spare > DODGE_LATE_ABORT_MS)) {
        if (keep && me) { worldScene()?.tapGround?.(me.x, me.y); autopilot.nav = null; autopilot.route = null; } // begonnenen Lauf stoppen
        if (!dodgeState.late) { dodgeState.late = true; logEvent('auto', `${zoneName(z)} – kämpfe weiter, laufe ${(spare / 1000).toFixed(1)} s später heraus`); }
        dodgeState.goal = null; dodgeState.active = false;
        return null;
      }
    }
    dodgeState.late = false;
    if (!dodgeState.active) { dodgeState.active = true; logEvent('warn', `${zoneName(z)} – weiche aus`); }
    if (best !== g0) dodgeState.goal = { x: best.x, y: best.y, at: now };
    // Klick nur bei neuem Punkt sofort, sonst selten wiederholen (falls er verloren ging)
    if (best !== g0 || now - dodgeState.lastTap > DODGE_RETAP_MS) { dodgeState.lastTap = now;autopilot.nav=null;autopilot.route=null; worldScene()?.tapGround?.(best.x, best.y); }
    // Digimon-Steuerung: der Klick bewegt das Digimon selbst – „Folgen“ würde es zum Tamer zurückziehen (Zickzack)
    const ownMove = partner && tamer && tamer.id === partner.id;
    if (!ownMove && inZone(partner) && now - dodgeState.lastFollow > 1500) { dodgeState.lastFollow = now; commands()?.partnerFollow?.(); }
    return 'Weiche Flächenangriff aus…';
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
      net.on('me', (list) => { // privat: Dungeon-Stand (Raum, Welle begonnen, Stürze)
        for (const ev of Array.isArray(list) ? list : [list]) if (ev?.t === 'dungeon') dgNote(ev);
      });
      net.on('evs', (list) => {
        const now = Date.now();
        for (const ev of Array.isArray(list) ? list : [list]) {
          if (!ev) continue;
          if (cfg.expMess && (ev.t === 'dmg' || ev.t === 'die')) expmEvent(ev);
          if (ev.t === 'dmg' || ev.t === 'die') { const me0 = getStore()?.getState?.()?.me; if (me0) { const mine = new Set([me0.tamerEntityId, me0.partner?.entityId]); dpsNote(ev, mine); mobExpEvent(ev, mine); } }
          if (ev.t === 'die' && ev.id) { bossSkillLog.delete(ev.id); continue; }
          if (ev.t !== 'skill' || !ev.src || !ev.skill) continue;
          if (!bossSkillLog.has(ev.src)) bossSkillLog.set(ev.src, new Map());
          const log = bossSkillLog.get(ev.src);
          const def = content()?.skills?.[ev.skill];
          const e = log.get(ev.skill) || {};
          if (ev.phase === 'cast') Object.assign(e, { used: now, phase: 'cast', castEnd: now + (def?.castMs || 0) });
          else if (ev.phase === 'release') {
            e.relAt = now; if (!(e.phase === 'cast' && now - e.used < (def?.castMs || 0) + 3000)) e.used = now; e.phase = 'release'; e.castEnd = 0; }
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
  // Attacken eines Bosses: die der Art plus die aus den Spawn-Daten (Boss-Eintrag und Formen) (z. B. Infermon im Kera-Dungeon:
  // Ramme, Spider Shooter, Kokon, NOT HERE stehen nur bei der Form, nicht beim Digimon Infermon)
  function bossSkillDefs(species) {
    const C = content(), list = [...(C?.digimon?.[species]?.skills || [])];
    for (const sp of Object.values(C?.spawns || {})) {
      for (const b of sp.bosses || []) {
        // Attacken am Boss-Eintrag selbst (z. B. Diaboromon, Armageddemon im Kera-Dungeon) und an seinen Formen
        for (const fm of [b, ...(b.forms || [])]) {
          if (fm.species !== species) continue;
          for (const sk of fm.skills || []) if (!list.some((x) => x.id === sk.id)) list.push(sk);
        }
      }
    }
    return list;
  }
  function bossSkillRows(boss, now) {
    const log = bossSkillLog.get(boss.id) || new Map();
    return bossSkillDefs(boss.species).map((sk) => {
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
  // Reaktion + gemessener Ping werden pro Prüfung über digibotLatency berechnet.
  const DEFAULT_MOVE = 90;       // px/s, falls die Laufgeschwindigkeit unbekannt ist
  function skillUnsafe(st, t, skill, now, slot) {
    const aggro=digibotSkillAggroReason(st,t,skill);if(aggro)return aggro;
    if (!cfg.safeCast || !t || mealOn(t.id)) return null;
    // Gepackt (Greifarm): Ausweichen ist ohnehin unmöglich – keinen Skill zurückhalten, alles auf den Arm (3.0.5)
    if (window.dmo?.net?.state?.entities?.get?.(st?.me?.partner?.entityId)?.flags & FLAG.Held) return null;
    const boss = currentBoss(st);
    if (!boss || boss.id !== t.id) return null;
    // Skills für die nächste Mahlzeit des Bosses (Infermon „NOT HERE“) aufheben: wäre der Skill dann noch im Cooldown,
    // jetzt nicht wirken – beim Fressen zählt jeder Schaden (Abbruch nur mit 2 % der Max-HP in 5 s)
    const latency=digibotLatency(window.dmo?.net?.rttMs);
    const ownCd = skill.cooldownMs ?? content()?.skills?.[skill.id]?.cooldownMs ?? 0;
    for (const r of ownCd > 0 ? bossSkillRows(boss, now) : []) {
      if (r.sk.blink?.meal && r.state === 'cd' && r.left + r.castMs < ownCd) return `aufgehoben für „${r.name}“ (in ${Math.ceil(r.left / 1000)} s)`;
    }
    const ownCast = skill.castMs ?? content()?.skills?.[skill.id]?.castMs
      ?? content()?.digimon?.[st.me?.partner?.species]?.skills?.[slot]?.castMs ?? 0;
    const ents = window.dmo?.net?.state?.entities;
    const pe = ents?.get?.(st.me?.partner?.entityId), be = ents?.get?.(boss.id);
    const pSpecies = st.me?.partner?.species;
    const speed = Math.max(40, st.me?.partner?.stats?.ms || content()?.digimon?.[pSpecies]?.base?.ms || DEFAULT_MOVE);
    for (const r of bossSkillRows(boss, now)) {
      const sk = r.sk;
      const canStart = r.state === 'cast' || r.state === 'ready' || r.state === 'unk' || (r.state === 'cd' && r.left < ownCast + latency);
      if (!canStart) continue;
      const tell = r.state === 'cast' ? r.left : r.castMs;
      if (sk.reflect) {
        // Treffer landet nach Cast + Reaktion; die Reflexion beginnt mit dem Ende der Ansage
        if (ownCast + latency + MIRROR_LEAD_MS >= tell) return `${r.name} (Spiegel) möglich`;
        continue;
      }
      const zone = (sk.shape === 'circle' || sk.shape === 'line') && r.castMs > 0 && !sk.islands && !sk.protectionMs && !sk.chargeRing
        && sk.kind !== 'heal' && sk.kind !== 'buff' && sk.target !== 'self';
      if (!zone || r.state === 'cast' || tankable(sk, st.me?.partner, boss.id)) continue; // laufende Ansage: Ausweichen; tankbar: egal
      let dist;
      if (sk.shape === 'line') dist = sk.sweep ? 80 : (sk.radius || 16) + DODGE_MARGIN;
      else if (sk.origin === 'caster' && pe && be) dist = Math.max(0, (sk.radius || 40) - Math.hypot(pe.x - be.x, pe.y - be.y)) + DODGE_MARGIN;
      else dist = (sk.radius || 40) + DODGE_MARGIN; // Kreis auf einem Spieler: schlimmster Fall mittendrin
      const escape = dist / speed * 1000;
      // Nur zurückhalten, wenn erst unser Cast das Ausweichen unmöglich macht
      if (latency + escape < tell && ownCast + latency + escape >= tell) {
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
  // Ausgewähltes Ziel fehlt in der Spielwelt: erst nach TARGET_GONE_MS als verschwunden werten (kurze Aussetzer überbrücken)
  const TARGET_GONE_MS = 1000;
  const goneState = { id: null, since: 0 };
  function targetGone(id, now) {
    if (window.dmo?.net?.state?.entities?.get?.(id)) { if (goneState.id === id) goneState.id = null; return false; }
    if (goneState.id !== id) { goneState.id = id; goneState.since = now; }
    return now - goneState.since >= TARGET_GONE_MS;
  }
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
  const SAFE_FLIP_N = 3, SAFE_FLIP_MS = 12000, SAFE_HOLD_MS = 15000;
  const safeFlips = new Map(); // Ziel-ID -> Zeitpunkte, zu denen der Bot seinetwegen aus der Zone lief
  const safeHold = new Map();  // Ziel-ID -> bis wann in Ruhe lassen
  const safeHeld = (id, now = Date.now()) => (safeHold.get(id) || 0) > now;
  // Läuft der Bot wegen desselben Ziels immer wieder aus der Schutzzone (Ziel steht am Rand, das Digimon läuft beim
  // Angriff wieder hinein), wird das Ziel eine Weile in Ruhe gelassen. Liefert true, wenn das gerade passiert ist.
  function noteSafeFlip(id, name, now) {
    const list = (safeFlips.get(id) || []).filter((t) => now - t < SAFE_FLIP_MS);
    list.push(now);
    safeFlips.set(id, list);
    if (list.length < SAFE_FLIP_N) return false;
    safeFlips.delete(id);
    safeHold.set(id, now + SAFE_HOLD_MS);
    blacklist.set(id, now + SAFE_HOLD_MS);
    logEvent('warn', `${name || 'Ziel'}: steht an der Schutzzone, hin und her bringt nichts – ${SAFE_HOLD_MS / 1000} s in Ruhe lassen`);
    return true;
  }
  // Lehnt das Spiel einen Angriff/Skill ab, kommt ein Fehler-Hinweis mit Code (st.toasts: { kind: 'error', code }).
  //  unreachable    -> Digimon kommt nicht hin: Ziel sofort 1 min sperren (statt 12 s auf HP-Verlust zu warten)
  //  not_in_range   -> zu weit weg: ein Stück auf das Ziel zugehen
  //  safe_zone      -> Schutzzone: herauslaufen (auch wenn die Zone nicht in den Kartendaten steht)
  //  invalid_target -> Ziel kurz überspringen
  const refusal = { seen: new WeakSet(), safeAt: 0, rangeAt: 0, lastTap: 0, tries: new Map(), repos: null, ban: new Map() }; // ban: Ziel-ID -> bis wann (vom Spiel abgelehnt)
  const REPOS_MAX = 2;      // so oft eine andere Position versuchen, bevor das Ziel gesperrt wird
  const REPOS_MS = 5000;    // so lange höchstens zur neuen Position laufen
  const REPOS_DIST = 52;    // Abstand der neuen Position zum Ziel
  // Neue Angriffsposition rund ums Ziel: begehbar, keine Schutzzone, mit echtem Weg vom Tamer aus.
  // Versuch 1 bevorzugt die Seiten (±60°/±90° zur bisherigen Richtung), Versuch 2 die Rückseite des Ziels.
  function repositionSpot(st, targetId, attempt) {
    const ents = window.dmo?.net?.state?.entities;
    const te = ents?.get?.(targetId), me = controlled(st);
    if (!te || !me) return null;
    const g = worldScene()?.map?.grid, T = g?.tile || 16;
    const walkable = (x, y) => !g?.blocked || g.blocked[Math.floor(y / T) * g.w + Math.floor(x / T)] !== 1;
    const base = Math.atan2(me.y - te.y, me.x - te.x); // Richtung Ziel -> Tamer
    const deg = attempt === 1 ? [60, -60, 90, -90, 30, -30, 120, -120] : [180, 150, -150, 120, -120, 0];
    for (const d of deg) {
      const a = base + d * Math.PI / 180;
      for (const r of [REPOS_DIST, REPOS_DIST + 24]) {
        const p = { x: te.x + Math.cos(a) * r, y: te.y + Math.sin(a) * r };
        if (!walkable(p.x, p.y) || safeRectAt(st.world?.mapId, p)) continue;
        if (Math.hypot(p.x - me.x, p.y - me.y) < 20) continue;
        const path = gridRoute(me.x, me.y, p.x, p.y);
        if (g?.blocked && !path) continue; // kein Weg dorthin
        return p;
      }
    }
    return null;
  }
  // Ist gerade eine „friedliche“ Aufgabe dran – Abgeben, Annehmen, Gespräch oder Reise-Ziel? Dann wird unterwegs nicht
  // gekämpft, auch nicht gegen Angreifer (Map-Wechsel inklusive). Auch wenn der Autopilot die nächste Aufgabe noch
  // nicht gewählt hat (die alte ist erledigt, ein Angreifer kam dazwischen), wird vorausgeschaut (max. 1×/s).
  const PASSIVE = (tk) => !!tk && (tk.kind === 'talk' || tk.kind === 'reach');
  // Quest-Boss (3.0.2, wie die Boss-Rotation): unterwegs zum Boss nicht kämpfen, auch nicht gegen Verfolger – weiter
  // zum Spawnpunkt. Dort (FARM_ARRIVE, erst ab FARM_DEPART wieder „unterwegs“) Verfolger erledigen, solange der Boss
  // fehlt; ist er da, wird er bekämpft. Nur bei mindestens halben HP, sonst erst normal zu Ende kämpfen.
  function digibotQuestBossTravel(st, tk) {
    if (tk.kind !== 'hunt' || !tk.loc?.boss || tk.grind) return false;
    const p = st.me?.partner, me = controlled(st);
    if (!me || !p?.maxHp || p.hp / p.maxHp < 0.5) return false;
    const ents = window.dmo?.net?.state?.entities;
    let bossHere = false;
    ents?.forEach?.((e) => { if (e.kind === KIND.Mob && e.hp > 0 && (e.flags & FLAG.Boss) && tk.species?.has?.(e.defId)) bossHere = true; });
    if (bossHere) { tk.bossArrived = true; return false; }
    if (st.world?.mapId !== tk.loc.mapId) { tk.bossArrived = false; return true; }
    const d = Math.hypot(me.x - tk.loc.x, me.y - tk.loc.y);
    tk.bossArrived = d <= (tk.bossArrived ? FARM_DEPART : FARM_ARRIVE);
    return !tk.bossArrived;
  }
  const turninPeek = { at: 0, val: false };
  function nextIsTurnin(st, now) {
    if (group.role() === 'leader' && groupFighters(now).length && (Date.now() - (group.fightWait || now)) <= GROUP_FIGHT_MAX_MS) return false;
    if (group.role() === 'follower') {
      const tk = autopilot.task;
      if (tk && !taskDone(st, tk)) return PASSIVE(tk);
      const L = groupLeader(now);
      if (!L?.inWorld) return false;
      if (L.noFight || st.world?.mapId !== L.mapId) return true;
      const me = controlled(st);
      return !!me && L.x != null && Math.hypot(me.x - L.x, me.y - L.y) > FOLLOW_FAR;
    }
    const tk = autopilot.task;
    if (tk && !taskDone(st, tk)) return PASSIVE(tk) || digibotQuestBossTravel(st, tk);
    if (world.state !== 'ready') return false;
    if (now - turninPeek.at > 1000) {
      turninPeek.at = now;
      try { const nt = questTasks(st)[0]; turninPeek.val = PASSIVE(nt) || (!!nt && digibotQuestBossTravel(st, nt)); } catch { turninPeek.val = false; }
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
      else if (to.code === 'unreachable' && t?.id && t.kind === 'mob') {
        // Erst aus einer anderen Richtung versuchen (bis REPOS_MAX-mal), dann sperren
        const tries = (refusal.tries.get(t.id) || 0) + 1;
        refusal.tries.set(t.id, tries);
        const spot = tries <= REPOS_MAX ? repositionSpot(st, t.id, tries) : null;
        bot.attackedId = null; bot.engage = null;
        if (spot) {
          refusal.repos = { id: t.id, x: spot.x, y: spot.y, until: now + REPOS_MS };
          logEvent('auto', `${t.name || 'Ziel'}: Digimon kommt nicht hin – versuche andere Position (${tries}/${REPOS_MAX})`);
        } else {
          refusal.repos = null;
          blacklist.set(t.id, now + BAN_MS); refusal.ban.set(t.id, now + BAN_MS);
          commands()?.partnerFollow?.(); // nicht am alten Ziel hängen bleiben
          logEvent('warn', `${t.name || 'Ziel'}: Digimon kommt auch von anderer Position nicht hin – 1 min gesperrt`);
        }
      } else if (to.code === 'invalid_target' && t?.id && t.kind === 'mob') {
        blacklist.set(t.id, now + 15000); refusal.ban.set(t.id, now + 15000);
        bot.attackedId = null; bot.engage = null;
        logEvent('warn', `${t.name || 'Ziel'}: ungültiges Ziel – kurz übersprungen`);
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
  let digibotLastInputBlock=null;
  let digibotChannelPeace=null,digibotChannelCleanup=null,digibotAttackTravel=null,digibotBossWalk=null;
  // Am Spawnpunkt des gewählten Bosses (Lern-Route, Boss-Quest, Rotation), solange er nicht da ist: hier dürfen echte
  // Angreifer abgewehrt werden (sonst schlug der Bot beim Warten nicht zurück – live 2.30.5/2.48.2). Ist der Boss da, hat er
  // über den Fokus Vorrang.
  const BOSS_SPAWN_DEFEND_R = 300;
  function digibotAtBossSpawn(st){
    const me=controlled(st);if(!me)return false;
    const ch=st.world?.channel??1,map=st.world?.mapId;
    const near=(p)=>!p||Math.hypot(me.x-p.x,me.y-p.y)<=BOSS_SPAWN_DEFEND_R;
    if(lrOn()&&cfg.levelBoss&&lr.boss){const b=lr.boss;return map===b.b.map&&ch===b.ch&&!lrBossEnt(b.b)&&near(lrBossPos(b.b));}
    const t=autopilot.task;
    if(cfg.autopilot&&!cfg.farm&&!cfg.dungeon&&t?.loc?.boss&&map===t.loc.mapId){
      let alive=false;window.dmo?.net?.state?.entities?.forEach?.(e=>{if(e.kind===KIND.Mob&&e.hp>0&&!(e.flags&FLAG.Dead)&&t.species?.has(e.defId))alive=true;});
      return !alive&&near(Number.isFinite(t.loc.x)?t.loc:null);
    }
    if(cfg.farm&&farm.goal&&map===farm.goal.map&&ch===farm.goal.ch){
      const b=farmSelected().find(x=>x.map===farm.goal.map&&x.index===farm.goal.index);
      let up=false;if(b)window.dmo?.net?.state?.entities?.forEach?.(e=>{if(!up&&e.kind===KIND.Mob&&e.hp>0&&!(e.flags&FLAG.Dead)&&bossEntityMatch(b,e))up=true;});
      return !!b&&!up&&near(farmSpot(b));
    }
    return false;
  }
  // Ziel greift mich (Tamer/Digimon) gerade an
  function digibotTargetAttacksMe(st){
    const e=window.dmo?.net?.state?.entities?.get?.(st.target?.id);
    return !!e&&e.kind===KIND.Mob&&e.hp>0&&!!e.targetId&&(e.targetId===st.me?.partner?.entityId||e.targetId===st.me?.tamerEntityId);
  }
  function digibotBossPeace(st,now=Date.now()){
    if(!bot.on)return false;
    // Ziel liegt doch auf dem aktuellen Kanal (Boss erschien hier, Wechsel kam nicht durch): Kanal-Frieden aufheben
    if(digibotChannelPeace){
      const map=st.world?.mapId,ch=st.world?.channel??1;
      if((cfg.farm&&farm.goal&&farm.goal.map===map&&farm.goal.ch===ch)||(lr.boss&&lr.boss.b.map===map&&lr.boss.ch===ch)){digibotChannelPeace=null;digibotChannelCleanup=null;}
    }
    if(digibotChannelPeace && now-digibotChannelPeace.at<30000 && st.world?.mapId===digibotChannelPeace.map && (st.world?.channel??1)!==digibotChannelPeace.to)return true;
    if(lrOn() && cfg.levelBoss){
      if(lr.boss){const b=lr.boss;return st.world?.mapId!==b.b.map || (st.world?.channel??1)!==b.ch || !lrBossEnt(b.b);}
      if(lr.scanPeace)return true;
    }
    const t=autopilot.task;
    if(cfg.autopilot && !cfg.farm && !cfg.dungeon && t?.loc?.boss){
      let alive=false;window.dmo?.net?.state?.entities?.forEach?.(e=>{if(e.kind===KIND.Mob&&e.hp>0&&!(e.flags&FLAG.Dead)&&t.species?.has(e.defId))alive=true;});
      return st.world?.mapId!==t.loc.mapId || !alive;
    }
    return false;
  }
  function digibotOffensiveSkill(sk){return !!sk && sk.kind!=='heal' && sk.kind!=='buff' && !isKoh(sk);}
  function digibotSkillAggroReason(st,target,skill){
    if(!bot.on || !skill)return null;
    const def=content()?.skills?.[skill.id]||{},sk={...def,...skill};
    if(!digibotOffensiveSkill(sk))return null;
    const multi=sk.shape==='circle'||sk.shape==='line'||sk.sweep||sk.scatter||sk.chain||sk.chainCount>1||sk.bounces>0;
    if(!multi)return null;
    const ents=window.dmo?.net?.state?.entities,own=ents?.get?.(st.me?.partner?.entityId),dst=ents?.get?.(target?.id)||target;
    if(!own||!dst)return 'Flächenskill: Positionen zum Prüfen zusätzlicher Gegner fehlen';
    const range=Math.max(0,Number(sk.range)||0),radius=Math.max(16,Number(sk.radius)||0)+24;
    let hit=false;
    ents?.forEach?.(e=>{
      if(hit||e.kind!==KIND.Mob||e.id===dst.id||e.hp<=0||(e.flags&(FLAG.Dead|FLAG.Boss)))return;
      if(e.targetId && (e.targetId===st.me?.partner?.entityId||e.targetId===st.me?.tamerEntityId))return; // already engaged
      const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
      if(sk.shape==='circle'&&!sk.scatter&&!sk.chain){
        const center=sk.origin==='caster'?own:dst;
        // Caster-origin attacks may first approach their target. Protect both possible centers.
        hit=d(e,center)<=radius || sk.origin==='caster'&&d(e,dst)<=radius;
      }else{
        // Lines, fans, scatter and chains can cover more than a single target circle.
        // Use a conservative envelope rather than risking a fresh pack.
        hit=d(e,own)<=range+radius || d(e,dst)<=range+radius;
      }
    });
    return hit?'Flächenskill würde möglicherweise weitere Gegner anlocken':null;
  }
  function digibotChannelBasicAllowed(st,now=Date.now()){
    const c=digibotChannelCleanup,e=window.dmo?.net?.state?.entities?.get?.(st.target?.id);
    return !!(c && c.id===st.target?.id && c.map===st.world?.mapId && c.channel===(st.world?.channel??1) && now-c.at>=0 && now-c.at<1000 && e?.kind===KIND.Mob && e.hp>0 && !(e.flags&FLAG.Dead));
  }
  function digibotCombatPolicy(st,code){
    if(!bot.on)return null;
    const k=Number(code.slice(5)),s=k>1?skillOnKey(st,k):null;
    if(digibotBossWalk&&digibotBossWalk.id===st.target?.id&&digibotBossWalk.map===st.world?.mapId&&digibotBossWalk.channel===(st.world?.channel??1)&&Date.now()-digibotBossWalk.at<1000&&(k===1||!s||digibotOffensiveSkill({...content()?.skills?.[s.skill.id],...s.skill})))return 'Boss-Anmarsch: zuerst den Laufweg beenden';
    const defend=digibotTargetAttacksMe(st)&&digibotAtBossSpawn(st); // am Boss-Spawn: Angreifer abwehren
    if(!defend && digibotBossPeace(st) && (k===1?!digibotChannelBasicAllowed(st):!s || digibotOffensiveSkill({...content()?.skills?.[s.skill.id],...s.skill})))return 'Bosswechsel: keine Angriffe zwischen Bossen';
    if(k===1&&digibotBossPeace(st)&&digibotChannelBasicAllowed(st)&&cfg.dodge){
      const zones=dangerZones(),ents=window.dmo?.net?.state?.entities;
      if(zones.length&&!digibotOutsideBasicPlan(st,ents?.get?.(st.target?.id),ents?.get?.(st.me?.partner?.entityId),controlled(st),zones,false))return 'Bosswechsel: Angriffsweg durch Warnfläche gesperrt';
    }
    return s?digibotSkillAggroReason(st,st.target,s.skill):null;
  }
  function digibotChannelDisengage(st,sc,now){
    const ents=window.dmo?.net?.state?.entities,pe=ents?.get?.(st.me?.partner?.entityId),te=ents?.get?.(st.me?.tamerEntityId);
    const candidates=(sc?.attackers||[]).filter(m=>{
      const e=ents?.get?.(m.id);
      return e?.kind===KIND.Mob&&e.hp>0&&!(e.flags&FLAG.Dead)&&!m.banned&&m.reach!==false;
    });
    const current=candidates.find(m=>m.id===digibotChannelCleanup?.id) || candidates.find(m=>m.id===st.target?.id);
    const target=current||[...candidates].sort((a,b)=>(a.hp??Infinity)-(b.hp??Infinity)||(a.d??Infinity)-(b.d??Infinity))[0];
    if(!target){
      digibotChannelCleanup=null;lrBossIgnoreMobs(st,now);
      if(!((pe?.flags|te?.flags)&FLAG.InCombat))return null;
      return 'Bosswechsel: warte auf Kampfende – keine neuen Gegner';
    }
    const sent=digibotChannelCleanup?.id===target.id&&digibotChannelCleanup?.sent;
    if(digibotChannelCleanup?.id!==target.id)lrBossIgnoreMobs(st,now);
    digibotChannelCleanup={id:target.id,map:st.world?.mapId,channel:st.world?.channel??1,at:now,sent};
    if(st.target?.id!==target.id){
      if(bot.can('select',SELECT_GAP_MS,now)){bot.lastPress.select=now;worldScene()?.select?.(target.id);}
      return 'Bosswechsel: beende bestehenden Kampf nur mit Taste 1';
    }
    let blocked=null;
    if(!digibotChannelCleanup.sent || bot.can('Digit1',ATTACK_REPEAT_MS,now)){
      if(bot.hit('Digit1',now)!==false){bot.attackedId=target.id;digibotChannelCleanup.sent=true;}
      else blocked=digibotLastInputBlock?.reason;
    }
    return `Bosswechsel: Angreifer mit Taste 1 besiegen${blocked?` · ${blocked}`:''}`;
  }
  function digibotBossWalkIn(st,target,now){
    const scene=worldScene(),ents=window.dmo?.net?.state?.entities,raw=ents?.get?.(target.id),partner=ents?.get?.(st.me?.partner?.entityId),me=controlled(st),grid=scene?.map?.grid;
    if(!raw||raw.hp<=0||!partner||!me){digibotBossWalk=null;return null;}
    const key=`${st.world?.mapId}|${st.world?.channel??1}|${target.id}`;
    const range=content()?.digimon?.[st.me?.partner?.species]?.basic?.range;
    // A distant selected boss is not an attackable boss. Keep walking until
    // native attack approach only needs a short, unobstructed final stretch.
    const distance=Math.hypot(partner.x-raw.x,partner.y-raw.y),limit=Math.max(160,Number(range)||0);
    const ready=distance<=limit&&Math.hypot(me.x-raw.x,me.y-raw.y)<=180&&digibotDodgeGridClear(partner,raw,grid,5);
    if(ready){
      if(digibotBossWalk?.key===key){scene?.tapGround?.(me.x,me.y);autopilot.nav=null;autopilot.route=null;digibotAttackTravel=null;}
      digibotBossWalk=null;return null;
    }
    const starting=digibotBossWalk?.key!==key;
    digibotBossWalk={key,id:target.id,map:st.world?.mapId,channel:st.world?.channel??1,at:now,distance};
    if(starting){
      autopilot.nav=null;autopilot.route=null;
      if(me.id===partner.id)commands()?.partnerStop?.();else commands()?.partnerFollow?.();
    }
    bot.attackedId=null;bot.engage=null;
    const result=walkTo(st,raw.x,raw.y,now);
    if(result==='stuck'){
      blacklist.set(target.id,now+15000);autopilot.nav=null;autopilot.route=null;digibotBossWalk=null;
      logEvent('warn',`${target.name||raw.defId}: Laufweg blockiert – kurz neu planen, kein erfolgloser Kampf`);
      return 'Boss-Anmarsch: Laufweg blockiert – plane neu';
    }
    return `Laufe über Spiel-Wegfindung zum Boss (${Math.round(distance)} px) – Angriff erst bei freiem Zugang`;
  }
  function digibotNativeAttackTravel(st,target,now){
    const ents=window.dmo?.net?.state?.entities,partner=ents?.get?.(st.me?.partner?.entityId),tamer=controlled(st);
    if(!partner||!target||target.hp<=0){digibotAttackTravel=null;return false;}
    const key=`${st.world?.mapId}|${st.world?.channel??1}|${st.me?.partner?.entityId}|${target.id}`;
    let p=digibotAttackTravel;
    if(!p||p.key!==key)p=digibotAttackTravel={key,px:partner.x,py:partner.y,tx:tamer?.x,ty:tamer?.y,movedAt:-Infinity};
    if(Math.hypot(partner.x-p.px,partner.y-p.py)>=4 || tamer&&Math.hypot(tamer.x-p.tx,tamer.y-p.ty)>=4){
      p.px=partner.x;p.py=partner.y;p.tx=tamer?.x;p.ty=tamer?.y;p.movedAt=now;
    }
    const range=content()?.digimon?.[st.me?.partner?.species]?.basic?.range;
    const stand=Number.isFinite(range)?range+7:192;
    return Math.hypot(partner.x-target.x,partner.y-target.y)>stand+4 && now-p.movedAt<1000;
  }
  // Greifarme der Bosse auf dieser Map (Spieldaten: skill.grab.arm – Tentacle Bug, Creep Hands)
  function digibotGrabArms(st){
    const mapId=st?.world?.mapId,C=content();
    if(digibotGrabArms.mapId!==mapId||digibotGrabArms.C!==C){
      const set=new Set();
      for(const b of C?.spawns?.[mapId]?.bosses||[])for(const sk of b.skills||[])if(sk.grab?.arm)set.add(sk.grab.arm);
      for(const sk of Object.values(C?.skills||{}))if(sk?.grab?.arm)set.add(sk.grab.arm); // auch ohne Boss-Eintrag der Map (Event/Raum-Bosse)
      digibotGrabArms.mapId=mapId;digibotGrabArms.C=C;digibotGrabArms.set=set;
    }
    return digibotGrabArms.set;
  }
  function digibotCombatInputReason(st,now=performance.now()){
    const ents=window.dmo?.net?.state?.entities,own=ents?.get?.(st?.me?.partner?.entityId),queue=window.dmo?.client?.skillQueue;
    // Gepackt (Greifarm): Angriffe und Skills auf den Arm sind erlaubt – nur so kommt das Digimon frei (3.0.5; vorher
    // hielt der Bot 10+ s alle Eingaben zurück und wurde ausgesaugt)
    const heldByArm=!!(own?.flags&FLAG.Held)&&digibotGrabArms(st).has(ents?.get?.(st?.target?.id)?.defId);
    const locked=!!(own?.flags&(FLAG.Casting|FLAG.Evolving|(heldByArm?0:FLAG.Held)))||(digibotRawScene()?.ownPartner?.lockLeft?.(now)||0)>0;
    // The client's getter does not expire flight. Use its own timeout-aware API before inspecting it.
    if(typeof queue?.busy==='function')queue.busy(now,locked);
    if((own?.flags&FLAG.Held)&&!heldByArm)return 'Partner festgehalten';
    if(own?.flags&FLAG.Evolving)return 'Digitation läuft';
    if(own?.flags&FLAG.Casting)return 'Skill wird ausgeführt';
    if(locked)return 'Aktionssperre des Spielclients';
    if(queue?.inFlight)return 'Skill-Antwort wird abgewartet';
    return null;
  }
  function digibotInputSnapshot(){
    const st=getStore()?.getState?.(),own=window.dmo?.net?.state?.entities?.get?.(st?.me?.partner?.entityId),queue=window.dmo?.client?.skillQueue,pn=performance.now();
    return {at:Date.now(),bossApproach:digibotBossWalk,lastBlocked:digibotLastInputBlock,partnerHp:st?.me?.partner?.hp,partnerMaxHp:st?.me?.partner?.maxHp,tankEnabled:!!cfg.tank,partnerFlags:own?.flags,
      lockLeftMs:Math.max(0,digibotRawScene()?.ownPartner?.lockLeft?.(pn)||0),inFlight:typeof queue?.inFlight==='string'?queue.inFlight:!!queue?.inFlight,
      flightLeftMs:Number.isFinite(queue?.flight?.until)?Math.max(0,queue.flight.until-pn):null,queued:!!queue?.queued};
  }
  function press(code) {
    if (!digibotCore.allowed()) return false;
    const st=getStore()?.getState?.(),net=window.dmo?.net,id=st?.target?.id;
    const combat=/^Digit[1-6]$/.test(code);
    if(combat){
      const reason=digibotCombatPolicy(st,code) || digibotCombatInputReason(st) || (/^Digit[2-6]$/.test(code)&&window.dmo?.client?.skillQueue?.queued?'Skill wartet in der Warteschlange':null)
        || (code==='Digit1'&&id&&digibotCombat.waiting(id)?'Angriffsantwort wird abgewartet':null);
      if(reason){
        if(digibotLastInputBlock?.reason!==reason)digibotCore.record('Kampfeingabe zurückgehalten',{action:reason,target:id});
        digibotLastInputBlock={reason,code,at:Date.now()};return false;
      }
      digibotLastInputBlock=null;
    }
    if(code==='Digit1'&&id)digibotCombat.sent(id,net?.rttMs);
    const key=code.startsWith('Digit')?code.slice(5):code,opts={code,key,bubbles:true,cancelable:true};
    digibotKeys.set(code,opts);const requestId=digibotTrackKey(code);
    try{window.dispatchEvent(new KeyboardEvent('keydown',opts));}
    catch(e){if(requestId)digibotHistory.reject(requestId,e?.name||'Error');throw e;}
    setTimeout(()=>{digibotKeys.delete(code);window.dispatchEvent(new KeyboardEvent('keyup',opts));},60);
    return true;
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
  // Heil-Skill: Skill auf einer Taste, für die „Heal <x %“ eingestellt ist, wirken, sobald die HP des Digimons unter x %
  // fallen – sofern bereit und genug DS da sind. Liefert den Namen, wenn gewirkt wurde.
  // Skill-Einstellungen gelten je Digitationsform (auf derselben Taste liegt nach einer Digitation ein anderer Skill).
  // Gibt es für die Form noch keine Einstellung, gelten die alten (globalen) Haken, Heil-Skills aber nicht.
  const skillSet = (st) => { const sp = st?.me?.partner?.species; return sp ? cfg.skillSets?.[sp] || null : null; };
  const skillOn = (st, k) => { const s = skillSet(st); return s ? s.skills?.[k] ?? true : !!cfg.skills[k]; };
  const healAt = (st, k) => Number(skillSet(st)?.heal?.[k]) || 0;
  function editSkillSet(st) {
    const sp = st?.me?.partner?.species || '_';
    cfg.skillSets ||= {};
    return (cfg.skillSets[sp] ||= { skills: { ...cfg.skills }, heal: {} });
  }
  function healSkill(st, now) {
    const p = st?.me?.partner;
    if (!p || p.fainted || p.evolving) return null;
    const hp = pct(p.hp, p.maxHp);
    for (const k of SKILL_KEYS) {
      const lim = healAt(st, k);
      if (!lim || hp >= lim) continue;
      const s = skillOnKey(st, k);
      if (!s || s.cdLeft > 0 || s.skill.unlocked === false || p.ds < (s.skill.dsCost || 0)) continue;
      if (!bot.can('Digit' + k, SKILL_GAP_MS * 2, now) || !bot.can('skill', SKILL_GAP_MS, now)) continue;
      bot.lastPress.skill = now;
      bot.hit('Digit' + k, now);
      logEvent('potion', `Heal: ${s.skill.name} (HP ${Math.round(hp)} %)`);
      return s.skill.name;
    }
    return null;
  }

  // ---------- Key of Hope: große Raid-Angriffe blocken ----------
  // ClavisAngemons „Key of Hope“ schützt 2 s lang sich und die Gruppen-Partner im Umkreis von 128 px vor allem Schaden
  // (45 s Cooldown, kein Cast). Kündigt ein Raid-Boss einen der großen Angriffe an, zündet ein Clavis den Skill kurz vor
  // dem Einschlag. Mehrere Clavis in der Gruppe wechseln sich ab: der bereite mit der kleinsten Slot-Nummer zuerst; er
  // meldet es sofort an die anderen Fenster. Kommt von ihm nichts, springt KOH_STEP_MS später der nächste ein.
  const KOH_ID = 'clavisangemon.key_of_hope';
  // Nur, was man nicht ausweichen kann (geteilte Treffer). Allem anderen weicht man aus –
  // 4 Clavis haben 4 Blocks pro 45 s, Diaboromon feuert in der Zeit ~6 blockbare Attacken (Probelauf Hard: mit allen
  // Attacken im Block war für die Catastrophe Cannon oft keiner mehr bereit; nur für sie: 100 % geblockt).
  // Ultimate Flare (Fächer) weicht man aus: als Block fraß sie in Raum 4 die Hälfte der Keys, und für die Black-Rain-
  // Hülle war dann keiner mehr bereit (Probelauf ab Raum 4: geblockt 4/5 mit 6 Stürzen, ausgewichen 5/5 ohne Sturz).
  const KOH_BLOCK = new Set([
    'diaboromon.catastrophe_cannon', 'armageddemon.black_rain_shell',
    'infermon.spider_shooter_charged', 'infermon.cocoon_ram',
  ]);
  // Diese weicht man aus – schlagen sie aber kurz vor einem Block-Treffer ein, zündet der Clavis so früh, dass der
  // Schutz (2 s) beides abdeckt (die Gruppe steht dann schon gesammelt und weicht nicht mehr aus)
  const KOH_ALSO = new Set([
    'diaboromon.cannon_volley', 'diaboromon.tentacle_bug', 'diaboromon.copy_cannon',
    'armageddemon.black_rain', 'armageddemon.black_rain_storm', 'armageddemon.ultimate_flare', 'infermon.spider_shooter',
  ]);
  const KOH_GATHER_MS = 2000; // so lange vor dem Einschlag sammeln (vorher wird noch ausgewichen)
  const KOH_LEAD_MS = 700;    // so lange vor dem Einschlag zündet der erste Clavis (Schutz hält 2 s)
  const KOH_STEP_MS = 200;    // Abstand, bis der nächste Clavis einspringt
  const KOH_COVER_MS = 1700;  // Einschläge bis so lange nach dem Zünden gelten als abgedeckt
  const KOH_RANGE = 700;      // nur Angriffe von Bossen in dieser Entfernung (nicht für geteilte Treffer)
  const KOH_SHARED = new Set(['diaboromon.catastrophe_cannon', 'armageddemon.black_rain_shell']); // geteilt, auch ohne share in den Daten
  const KOH_GATHER_R = 80;     // so nah laufen die anderen ans Clavis-Digimon (Schutzkreis 128 px)
  const kohState = {
    claims: new Map(), // Boss-Entity -> Zeitpunkt, an dem ein Clavis Key of Hope gezündet hat
    plans: new Map(),  // Slot -> { x, y, mapId, end }: dieser Clavis zündet gleich, hier sammeln
    anchor: null, sentAt: 0, // ich zünde gleich: { src, end }
  };
  // Sagt gerade ein Boss einen Treffer an, gegen den Key of Hope zündet?
  function kohBlockPending(now) {
    for (const [, log] of bossSkillLog) for (const [sid, e] of log) if (KOH_BLOCK.has(sid) && e.phase === 'cast' && e.castEnd > now - 300) return true;
    return false;
  }
  const isKoh = (sk) => !!sk && (sk.id === KOH_ID || sk.name === 'Key of Hope');
  function kohSlot(st) {
    for (const k of SKILL_KEYS) { const s = skillOnKey(st, k); if (s && isKoh(s.skill)) return { k, s }; }
    return null;
  }
  // Für die Gruppe: ab wann mein Key of Hope bereit ist (null = kein Clavis / ausgeschaltet)
  function kohReadyAt(st, now) {
    const o = cfg.koh && kohSlot(st);
    if (!o || o.s.skill.unlocked === false) return null;
    // bewusstlos, in der Digitation oder zu wenig DS: kann nicht zünden – sonst wartete der nächste Clavis auf ihn, niemand sammelte
    const p = st?.me?.partner;
    if (!p || p.fainted || p.evolving || p.ds < (o.s.skill.dsCost || 0)) return null;
    return o.s.cdLeft > 0 ? now + o.s.cdLeft : now;
  }
  // Nächster großer, noch nicht abgedeckter Angriff eines Bosses in der Nähe (left = ms bis zum Einschlag)
  function kohUpcoming(st, now) {
    hookBossEvents();
    const ents = window.dmo?.net?.state?.entities;
    const me = ents?.get?.(st?.me?.partner?.entityId) || controlled(st);
    let hit = null;
    for (const [src, log] of bossSkillLog) {
      for (const [sid, e] of log) {
        if (!KOH_BLOCK.has(sid) || e.phase !== 'cast') continue;
        const left = e.castEnd - now;
        if (left < -300) continue;
        // Geteilte Treffer (Black-Rain-Hülle, Catastrophe Cannon) folgen einem Spieler, egal wie weit der Boss weg ist –
        // ohne Reichweiten-Grenze (Probelauf: bei den Kuramon-Clustern weit vom Boss sammelte sich niemand, 2 Stürze)
        const b = ents?.get?.(src), shared = !!content()?.skills?.[sid]?.share || KOH_SHARED.has(sid);
        if (!shared && b && me && Math.hypot(b.x - me.x, b.y - me.y) > KOH_RANGE) continue;
        const claim = kohState.claims.get(src);
        if (claim && e.castEnd <= claim + KOH_COVER_MS) continue; // ein Clavis hat schon gezündet
        if (!hit || left < hit.left) hit = { src, sid, left, castEnd: e.castEnd, main: e.castEnd };
      }
    }
    // Ausweich-Attacken, die kurz vor dem Block-Treffer einschlagen, gleich mit abdecken: früher zünden
    if (hit) {
      const win = KOH_COVER_MS - KOH_LEAD_MS; // so weit vor dem Haupt-Einschlag reicht ein Block noch
      for (const [, log] of bossSkillLog) for (const [sid, e] of log) {
        if (!KOH_ALSO.has(sid) || e.phase !== 'cast' || e.castEnd < now - 300) continue;
        if (e.castEnd < hit.castEnd && e.castEnd >= hit.main - win) { hit.castEnd = e.castEnd; hit.left = e.castEnd - now; hit.also = sid; }
      }
    }
    return hit;
  }
  const kohReady = (st, own) => { const p = st?.me?.partner, sk = own?.s; return !!sk && !!p && !p.fainted && !p.evolving && sk.cdLeft <= 0 && sk.skill.unlocked !== false && p.ds >= (sk.skill.dsCost || 0); };
  // Wie viele bereite Clavis auf derselben Map haben eine kleinere Slot-Nummer (sind vor mir dran)?
  function kohRank(st, now) {
    let rank = 0;
    if (!group.active()) return 0;
    for (const [slot, m] of group.peers) {
      if (slot < group.slot() && fresh(m, now) && m.kohAt != null && m.kohAt <= now && m.bot && m.inWorld && m.mapId === st.world?.mapId) rank++; // nur mit laufendem Bot
    }
    return rank;
  }
  // Ich bin als Nächster dran: Position meines Digimons laufend an die Gruppe melden, damit sich alle bei mir sammeln
  function kohAnchor(st, now) {
    const own = cfg.koh && group.active() && kohSlot(st);
    const hit = own && kohReady(st, own) ? kohUpcoming(st, now) : null;
    if (!hit || kohRank(st, now) > 0) { kohState.anchor = null; return; }
    kohState.anchor = { src: hit.src, end: hit.castEnd + 500 };
    if (now - kohState.sentAt < 200) return;
    const me = window.dmo?.net?.state?.entities?.get?.(st.me.partner.entityId) || controlled(st);
    if (!me) return;
    kohState.sentAt = now;
    try { digibotSend({ type: 'kohplan', slot: group.slot(), x: me.x, y: me.y, mapId: st.world?.mapId, end: hit.castEnd + 500 }); } catch { /* ignore */ }
  }
  // Ein anderer Clavis zündet gleich: hinlaufen (Tamer, das Digimon folgt) – Vorrang vor Ausweichen und Kampf.
  // Der Clavis, der zündet, bleibt stehen.
  function kohGather(st, now) {
    if (!cfg.koh || !group.active()) return null;
    // Bis kurz vor dem Einschlag gilt Ausweichen (z. B. eine Volley davor): erst in den letzten KOH_GATHER_MS sammeln
    // before: nur Zonen, die vor diesem Zeitpunkt einschlagen (Restzeit unbekannt zählt mit)
    const inDanger = (before = Infinity) => { const z = dangerZones(), ents0 = window.dmo?.net?.state?.entities, me0 = [controlled(st), ents0?.get?.(st?.me?.partner?.entityId)];
      const pn = performance.now();
      const left = (zz) => (zz.kind === 'circle' ? zoneLeftMs(zz) : zz.end ? zz.end - pn : null);
      return me0.some((e) => e && z.some((zz) => { if (zoneDist(zz, e).d >= DODGE_MARGIN) return false; const l = left(zz); return l == null || now + l < before; })); };
    // Einschlag vor dem Zünden (Key zündet KOH_LEAD_MS vor dem Treffer): den deckt der Schutz nicht – erst ausweichen
    const uncovered = (end) => inDanger(end - 500 - KOH_LEAD_MS - 100);
    if (kohState.anchor && kohState.anchor.end > now) {
      if ((kohState.anchor.end - 500 - now > KOH_GATHER_MS && inDanger()) || uncovered(kohState.anchor.end)) return null;
      return 'Key of Hope gleich – halte Position, Gruppe sammelt sich';
    }
    let plan = null;
    for (const [slot, pl] of kohState.plans) {
      if (pl.end <= now) { kohState.plans.delete(slot); continue; }
      if (pl.mapId === st.world?.mapId && (!plan || slot < plan.slot)) plan = pl;
    }
    if (!plan) return null;
    if ((plan.end - 500 - now > KOH_GATHER_MS && inDanger()) || uncovered(plan.end)) return null; // erst ausweichen, gleich danach sammeln
    const ents = window.dmo?.net?.state?.entities;
    const partner = ents?.get?.(st?.me?.partner?.entityId), tamer = controlled(st);
    const who = group.peers.get(plan.slot)?.name || `Slot ${plan.slot + 1}`;
    const d = (e) => (e ? Math.hypot(e.x - plan.x, e.y - plan.y) : 0);
    if (d(partner) <= KOH_GATHER_R && d(tamer) <= KOH_GATHER_R + 40) return `Key of Hope: im Schutzkreis von ${who}`;
    if (tamer && d(tamer) > 24 && bot.can('kohTap', 250, now)) { bot.lastPress.kohTap = now; worldScene()?.tapGround?.(plan.x, plan.y); }
    if (partner && d(partner) > KOH_GATHER_R && bot.can('kohFollow', 800, now)) { bot.lastPress.kohFollow = now; commands()?.partnerFollow?.(); }
    return `Key of Hope: laufe in den Schutzkreis von ${who}`;
  }
  function keyOfHope(st, now) {
    if (!cfg.koh) return null;
    const p = st?.me?.partner;
    if (!p || p.fainted || p.evolving) return null;
    const own = kohSlot(st);
    if (!own) return null;
    const hit = kohUpcoming(st, now);
    if (!hit || hit.left > KOH_LEAD_MS) return null;
    if (!kohReady(st, own)) return null;
    // Reihenfolge: bereite Clavis auf derselben Map mit kleinerer Slot-Nummer sind vor mir dran
    // Staffelung ab dem Moment, ab dem gezündet werden darf (der Zeitpunkt kann nach vorn springen, wenn eine Ausweich-
    // Attacke mit abgedeckt wird – sonst zünden zwei Clavis gleichzeitig)
    const dueKey = `${hit.src}|${hit.main}`;
    if (kohState.dueKey !== dueKey) { kohState.dueKey = dueKey; kohState.dueAt = now; }
    if (now - kohState.dueAt < kohRank(st, now) * KOH_STEP_MS) return null;
    if (!bot.can('Digit' + own.k, 300, now)) return null;
    kohState.claims.set(hit.src, now);
    try { digibotSend({ type: 'koh', slot: group.slot(), src: hit.src, skill: hit.sid }); } catch { /* ignore */ }
    bot.lastPress.skill = now;
    bot.hit('Digit' + own.k, now);
    const name = (content()?.skills?.[hit.sid]?.name || hit.sid) + (hit.also ? ` (+ ${content()?.skills?.[hit.also]?.name || hit.also})` : '');
    logEvent('warn', `Key of Hope gegen ${name}`);
    return `Key of Hope gegen ${name}`;
  }
  // Eigener schneller Takt: der Bot-Takt (250 ms) ist für die Staffelung zwischen den Clavis zu grob
  setInterval(() => {
    if (!bot.on || !cfg.koh || !bossSkillLog.size) return;
    digibotCore.run('Notfall-Skill', 100, () => { const st = getStore()?.getState?.(); if (st) { kohAnchor(st, Date.now()); keyOfHope(st, Date.now()); } });
  }, 50);

  function potionCount(me, fKey) {
    const ref = me?.hotbar?.[7 + fKey];
    if (typeof ref !== 'string' || !ref.startsWith('item:')) return null;
    const id = ref.slice(5);
    return (me.inventory || []).reduce((n, it) => n + (it?.itemId === id ? it.qty || 0 : 0), 0);
  }

  // ---------- Umgebung scannen ----------
  const KIND = { Tamer: 0, Partner: 1, Mob: 2, Npc: 3 };
  const FLAG = { Moving:1, Evolving: 4, Casting: 128, Held: 8192, Dead: 2, InCombat: 8, Boss: 16, Aggressive: 32, Hidden: 64, Untargetable: 256, Elite: 1024 };
  const mobHome = new Map();         // Monster-Entity -> zuerst gesehene Position (Startplatz für die Verfolgungsreichweite)
  // Monster mit Flächenangriff um sich herum: beim Ausweichen in ihrer Verfolgungsreichweite bleiben (sonst kitet man sie
  // Stück für Stück weg, bis sie zurücklaufen). Art -> Map (leer = überall)
  const KITE_GUARD = { golemon_peaks: 'holy_peaks' };
  const blacklist = new Map(); // Monster-ID -> gesperrt bis (Date.now()), z. B. weil unerreichbar
  const catOf = (flags) => (flags & FLAG.Boss ? 'boss' : flags & FLAG.Elite ? 'elite' : 'normal');
  // Pro Map gesehene Monster-Arten (z. B. Elite-Varianten, die nicht in der Spawn-Tabelle stehen) und ob sie aggressiv sind
  const seen = new Map(); // mapId -> Map(key -> { aggressive })

  // ---------- Wegekarte: Weglänge auf dem Kollisionsraster der Map ----------
  // Ein Monster jenseits eines Sees oder einer Schlucht ist in Luftlinie nah, zu Fuß aber weit weg oder gar nicht
  // erreichbar. Die Zielwahl rechnet deshalb mit der Weglänge des Digimons: Dijkstra über das Raster (8 Richtungen,
  // diagonal nur ohne Ecke – wie die Wegfindung des Spiels), bis etwas über den Suchradius hinaus. Getrennte begehbare
  // Bereiche (Insel, andere Seite einer Klippe ohne Übergang) erkennt eine Zusammenhangs-Karte wie im Spiel: kein Weg.
  const PATH_SLACK = 1.04; // Raster-Weg ist auf freier Fläche bis ~8 % länger als die Luftlinie – im Mittel ausgleichen
  const compCache = new WeakMap();
  function gridComps(g) {
    let c = compCache.get(g.blocked);
    if (c && c.length === g.w * g.h) return c;
    const W = g.w, N = W * g.h, q = new Int32Array(N);
    c = new Int32Array(N).fill(-1);
    let lab = 0;
    for (let o = 0; o < N; o++) {
      if (c[o] !== -1 || g.blocked[o] === 1) continue;
      let h = 0, t = 0; q[t++] = o; c[o] = lab;
      while (h < t) {
        const i = q[h++], x = i % W;
        const visit = (n) => { if (c[n] === -1 && g.blocked[n] !== 1) { c[n] = lab; q[t++] = n; } };
        if (x > 0) visit(i - 1);
        if (x < W - 1) visit(i + 1);
        if (i >= W) visit(i - W);
        if (i + W < N) visit(i + W);
      }
      lab++;
    }
    compCache.set(g.blocked, c);
    return c;
  }
  const pathMemo = { key: '', blocked: null, field: null, dist: null, hi: null, hk: null };
  const DX8 = [1, -1, 0, 0, 1, 1, -1, -1], DY8 = [0, 0, 1, -1, 1, -1, 1, -1];
  function pathField(st, self, capPx) {
    const g = worldScene()?.map?.grid;
    if (!g?.blocked || !g.w || !g.h || !self || !isFinite(self.x) || !isFinite(self.y)) return null;
    const T = g.tile || 16, W = g.w, H = g.h, N = W * H;
    const blocked = (x, y) => x < 0 || y < 0 || x >= W || y >= H || g.blocked[y * W + x] === 1;
    let sx = Math.floor(self.x / T), sy = Math.floor(self.y / T);
    if (blocked(sx, sy)) { // steht auf einem gesperrten Feld (Rand): nächstes freies Nachbarfeld
      let found = false;
      for (let r = 1; r <= 2 && !found; r++) for (let dy = -r; dy <= r && !found; dy++) for (let dx = -r; dx <= r && !found; dx++) if (!blocked(sx + dx, sy + dy)) { sx += dx; sy += dy; found = true; }
      if (!found) return null;
    }
    const cap = Math.ceil(capPx / T), key = `${st.world?.mapId}|${sx},${sy}|${cap}|${W}x${H}`;
    if (pathMemo.key === key && pathMemo.blocked === g.blocked) return pathMemo.field;
    if (!pathMemo.dist || pathMemo.dist.length !== N) pathMemo.dist = new Float32Array(N);
    const dist = pathMemo.dist; dist.fill(Infinity);
    // Binär-Heap (Feld-Index, Kosten)
    let hi = pathMemo.hi || new Int32Array(1024), hk = pathMemo.hk || new Float32Array(1024), n = 0;
    const push = (i, k) => {
      if (n === hi.length) { const a = new Int32Array(n * 2), b = new Float32Array(n * 2); a.set(hi); b.set(hk); hi = a; hk = b; }
      let j = n++;
      while (j > 0) { const p = (j - 1) >> 1; if (hk[p] <= k) break; hi[j] = hi[p]; hk[j] = hk[p]; j = p; }
      hi[j] = i; hk[j] = k;
    };
    const pop = () => {
      const top = hi[0], last = --n;
      if (last > 0) {
        const i = hi[last], k = hk[last]; let j = 0;
        for (;;) { let c = 2 * j + 1; if (c >= last) break; if (c + 1 < last && hk[c + 1] < hk[c]) c++; if (hk[c] >= k) break; hi[j] = hi[c]; hk[j] = hk[c]; j = c; }
        hi[j] = i; hk[j] = k;
      }
      return top;
    };
    const start = sy * W + sx;
    dist[start] = 0; push(start, 0);
    while (n > 0) {
      const k0 = hk[0], c = pop();
      if (k0 > dist[c]) continue; // veraltet
      if (k0 > cap) break;
      const cx = c % W, cy = (c - cx) / W;
      for (let a = 0; a < 8; a++) {
        const x = cx + DX8[a], y = cy + DY8[a];
        if (blocked(x, y) || (a >= 4 && (blocked(x, cy) || blocked(cx, y)))) continue; // diagonal nur ohne Ecke
        const i = y * W + x, nd = k0 + (a >= 4 ? Math.SQRT2 : 1);
        if (nd < dist[i]) { dist[i] = nd; push(i, nd); }
      }
    }
    pathMemo.hi = hi; pathMemo.hk = hk;
    const field = { T, W, H, dist, comp: gridComps(g), start };
    pathMemo.key = key; pathMemo.blocked = g.blocked; pathMemo.field = field;
    return field;
  }
  // Steht man auf dem Punkt p selbst (begehbar und im eigenen Bereich)? – für Laufziele, nicht für Monster am Ufer
  const pathFree = (field, p) => {
    const x = Math.floor(p.x / field.T), y = Math.floor(p.y / field.T);
    if (x < 0 || y < 0 || x >= field.W || y >= field.H) return false;
    const c = field.comp[y * field.W + x];
    return c !== -1 && c === field.comp[field.start];
  };
  // Weglänge (px) zum Punkt p und ob es überhaupt einen Weg gibt. Steht p auf einem gesperrten Feld (Ufer, Wand), zählt
  // das nächste freie Nachbarfeld – das Digimon schlägt ja von dort zu. Infinity = weiter als die Grenze der Wegekarte.
  function pathTo(field, p) {
    const { T, W, H, dist, comp, start } = field;
    const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T), home = comp[start];
    let best = Infinity, reach = false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = y * W + x;
      if (comp[i] === -1 || comp[i] !== home) continue;
      reach = true;
      const d = dist[i] + (dx || dy ? Math.hypot(dx, dy) : 0);
      if (d < best) best = d;
    }
    return { pd: best * T / PATH_SLACK, reach };
  }

  // Alle Monster in Sichtweite mit Abstand zum eigenen Digimon und Einordnung für Bot und Radar:
  //   attacker: greift mein Digimon/meinen Tamer an
  //   taken:    wird von einem anderen Spieler bekämpft (oder greift einen anderen an) -> nicht klauen
  //   inLvl:    liegt in der eingestellten Level-Range
  function scan(st) {
    const ents = window.dmo?.net?.state?.entities;
    const me = st?.me;
    if (!me || !ents?.forEach) return null;
    const mine = new Set([me.partner?.entityId, me.tamerEntityId].filter(Boolean));
    const party = groupEntityIds(); // Tamer/Digimon der anderen Gruppen-Fenster
    const ours = party.size ? new Set([...mine, ...party]) : mine;
    const self = ents.get?.(me.partner?.entityId) || ents.get?.(me.tamerEntityId);
    if (!self) return null;
    const tamer = ents.get?.(me.tamerEntityId);

    const grpTgt = spreadOn() ? groupTargets() : null;
    const takenByOthers = new Set();
    ents.forEach((e) => {
      if ((e.kind === KIND.Tamer || e.kind === KIND.Partner) && !ours.has(e.id) && e.targetId) takenByOthers.add(e.targetId);
    });

    const now = Date.now();
    const mapId = st.world?.mapId || '';
    if (!seen.has(mapId)) seen.set(mapId, new Map());
    const seenHere = seen.get(mapId);
    // Im Quest-Modus bestimmen die offenen Quest-Ziele, was gejagt wird (statt der Monsterliste);
    // schwächere Monster sind dann erlaubt, nur zu starke (über + Level-Unterschied) bleiben tabu.
    // (sobald das Jagdziel erfüllt ist, sofort nichts Neues mehr angreifen)
    const quest = cfg.autopilot
      ? { species: (autopilot.task && !taskDone(st, autopilot.task)) || (group.role() === 'follower' && !autopilot.task) ? autopilot.huntSpecies : new Set(), open: [] }
      : cfg.questMode ? questTargets(st, null) : null;
    const pLvl = me.partner?.level ?? 0;
    const farmSp = cfg.farm ? farmTargets(mapId) : null;
    // Boss-Quest im Autopilot: der Feldboss ist ein Gruppenkampf – auch angreifen, wenn andere ihn schon bekämpfen
    const qbSp = cfg.autopilot && !cfg.farm && autopilot.task?.loc?.boss ? new Map(questBossSel(autopilot.task).map((b) => [b.species, b])) : null;
    const assistId = group.role() === 'follower' ? leaderTargetId(now) : null;
    const mobs = [];
    // Kiten: erste gesehene Position jedes Monsters (≈ Startplatz) merken
    ents.forEach((e) => { if (e.kind === KIND.Mob && !mobHome.has(e.id)) mobHome.set(e.id, { x: e.x, y: e.y, t: now }); });
    if (mobHome.size > 800) { // erst verschwundene Monster, dann (falls nötig) die ältesten – lebende behalten Startplatz/Zeit
      for (const k of [...mobHome.keys()]) if (!ents.get?.(k)) mobHome.delete(k);
      if (mobHome.size > 800) { let n = 0; for (const k of mobHome.keys()) { if (n++ >= 300) break; mobHome.delete(k); } }
    }
    // Leader erledigt meine Quests: ich bleibe stehen – nur, was mich selbst angreift, ist ein Angreifer
    // „Ziele verteilen“: das Monster eines anderen ist sein Kampf, kein Angreifer für alle – sonst gehen wieder alle darauf
    const guardParty = !(group.role() === 'follower' && groupLeader()?.serve) && !spreadOn();
    const dgZone = dgHereZone(st, self); // Dungeon: nur Monster im Raum, in dem ich stehe (Reste früherer Räume ignorieren)
    ents.forEach((e) => {
      if (e.kind !== KIND.Mob || e.hp <= 0 || (e.flags & (FLAG.Dead | FLAG.Hidden | FLAG.Untargetable))) return;
      if (dgZone && !inRect(dgZone, e, 24)) return;
      // Angreifer: greift mich an – oder ein Gruppenmitglied in meiner Nähe
      const attacker = mine.has(e.targetId) || (guardParty && party.has(e.targetId) && Math.hypot(e.x - self.x, e.y - self.y) <= cfg.radius);
      const cat = catOf(e.flags), key = `${e.defId}|${cat}`;
      const aggressive = !!(e.flags & FLAG.Aggressive);
      const s = seenHere.get(key);
      if (!s) seenHere.set(key, { aggressive }); else if (aggressive) s.aggressive = true;
      mobs.push({
        id: e.id, species: e.defId, cat, key, mapBoss:cat==='boss'||isFarmMob(farmSp,e)||isFarmMob(qbSp,e), x: e.x, y: e.y, level: e.level, hp: e.hp, maxHp: e.maxHp,
        d: Math.hypot(e.x - self.x, e.y - self.y),
        attacker,
        // Bosse sind Gruppenkämpfe: ein Farm-Boss gilt nie als „von anderen belegt“
        taken: cfg.skipTaken && !attacker && !isFarmMob(farmSp, e) && !isFarmMob(qbSp, e)
          && (takenByOthers.has(e.id) || (!!e.targetId && !ours.has(e.targetId))),
        // nur zu starke Monster sind tabu, schwächere immer erlaubt; Farm-Bosse immer
        inLvl: e.level <= pLvl + lvlLimit(mapId) || isFarmMob(farmSp, e),
        enabled: farmSp ? isFarmMob(farmSp, e) : quest ? quest.species.has(e.defId) || e.id === assistId : mobOn(mapId, key, cat),
        aggressive,
        banned: (blacklist.get(e.id) || 0) > now,
        grpBy: grpTgt?.get(e.id) ?? null, // Slot des Gruppenmitglieds, das es schon angreift (Ziele verteilen)
      });
    });
    // Weglänge des Digimons zu jedem Monster (pd), unerreichbare (reach = false) ans Ende
    const pf = pathField(st, self, Math.max(cfg.radius * 1.6, 480) + 64);
    for (const m of mobs) {
      if (!pf) { m.pd = m.d; continue; }
      const r = pathTo(pf, m);
      m.reach = r.reach;
      m.pd = r.reach ? Math.max(m.d, r.pd) : Infinity;
    }
    const near = (m) => (isFinite(m.pd) ? m.pd : 1e9 + m.d);
    mobs.sort((a, b) => near(a) - near(b));
    // Angreifer ohne Weg (z. B. Fernkämpfer jenseits des Wassers): das Digimon kommt nicht hin – nicht abwehren wollen,
    // sonst steht der Bot bis zur Hängen-Erkennung (12 s) still und blockiert Lern-Route/Autopilot
    // Vom Spiel abgelehnte Ziele (unreachable/invalid_target) ebenso – sonst drückte der Bot endlos Taste 1 auf einen
    // Fernkämpfer am Ufer, der weiter auf ihn schoss (Hängen-Erkennung nimmt Angreifer aus)
    if (refusal.ban.size > 100) for (const [k, u] of refusal.ban) if (u <= now) refusal.ban.delete(k);
    return { mapId, self, tamer, mobs, quest, pf, attackers: mobs.filter((m) => m.attacker && m.reach !== false && !((refusal.ban.get(m.id) || 0) > now)) };
  }

  // Known bosses are eligible across the current map. A capped path distance
  // (Infinity) is not an unreachable component; normal mobs still use the radius.
  const usable = (m) => m.enabled && m.inLvl && !m.taken && !m.banned && m.reach !== false && (m.mapBoss || m.cat==='boss' || (m.pd ?? m.d) <= cfg.radius);

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
  const world = { state: 'idle', loaded: 0, total: 0, maps: {}, npcAt: new Map(), error: '', retryAt: 0 };

  async function loadWorld() {
    if (world.state === 'loading' || world.state === 'ready' || Date.now() < world.retryAt) return;
    const sc = worldScene();
    const list = sc?.deps?.manifest?.maps;
    if (!list) return;
    world.state = 'loading';
    world.error = '';
    const base = sc.deps.assetsBase || '/assets/';
    const ids = Object.keys(list);
    world.total = ids.length; world.loaded = ids.filter((id) => Object.hasOwn(world.maps, id)).length;
    let failures = 0;
    const prop = (o, n) => (o.properties || []).find((p) => p.name === n)?.value;
    const pending = ids.filter((id) => !Object.hasOwn(world.maps, id));
    async function loadMap(mapId) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(base + list[mapId].tmj, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const tmj = await response.json();
        if (!tmj || !Array.isArray(tmj.layers)) throw new Error('Ungültige Kartendaten');
        const m = { id: mapId, portals: [], npcs: [], zones: {}, spawns: {}, safe: [] };
        for (const layer of tmj.layers || []) {
          if (layer.type !== 'objectgroup') continue;
          for (const o of layer.objects || []) {
            const type = o.type || o.class;
            const rect = { x: o.x, y: o.y, w: o.width || 0, h: o.height || 0 };
            if (type === 'portal' && prop(o, 'toMap')) m.portals.push({ toMap: prop(o, 'toMap'), name: o.name || '', toSpawn: prop(o, 'toSpawn') || '', ...rect });
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
        world.loaded++;
      } catch (e) {
        failures++;
        world.error = `${mapId}: ${e.message}`;
      } finally {
        clearTimeout(timeout);
        schedule();
      }
    }
    // Höchstens vier Abrufe gleichzeitig; erfolgreiche Karten beim Retry behalten.
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(4, pending.length) }, async () => {
      while (next < pending.length) await loadMap(pending[next++]);
    }));
    world.state = failures ? 'error' : 'ready';
    world.retryAt = failures ? Date.now() + 10000 : 0;
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
  const UNREACH_SERIES = 3, UNREACH_WINDOW_MS = 15000; // so viele „nicht erreichbar“ so schnell hintereinander = Standortproblem
  const TASK_BAN_MS = 5 * 60000;  // gescheiterte Aufgabe so lange überspringen
  const HUNT_IDLE_MS = 90000;     // im Jagdgebiet so lange kein passendes Monster -> aufgeben

  const autopilot = {
    task: null, nav: null, failed: new Map(), huntSpecies: new Set(),
    bountyReturn:false, sweepAt: null, tp: null, tpBlock: new Map(), route: null, lastSwitch: 0, switchTries: 0, switchGiveUp: null, switchFollowAt: 0, lastEvolve: 0, evoTries: 0, evoGiveUp: null,
    dailyVisited: new Set(), dailyAccepted: new Set(),dailyAttempts:new Map(), dailyAt: 0, boardOnly: new Set(),
    avoidSpots: new Map(), // Jagdgebiet-Schlüssel -> bis wann gemieden (war leer)
    phase: 0, // aktuelle Phase der Map-für-Map-Runde (nur fürs Log)
    newRun() { // beim Start des Bots: Wechsel/Digitation/Dailies neu versuchen
      this.bountyReturn=false;this.turninPartnerHeld=false;this.questHome=null;this.questHomeUser=null;this.evoPartner=null;
      this.switchGiveUp = null; this.evoGiveUp = null; this.switchTries = 0; this.evoTries = 0;
      this.dailyVisited = new Set(); this.dailyAccepted = new Set();this.dailyAttempts=new Map(); this.failed = new Map(); this.tpBlock = new Map(); this.tp = null; this.phase = 0;
    },
    lastTap: 0, lastTalk: 0, talkTries: 0, dialogAt: 0, arrivedAt: 0, idleSince: 0,
    reset() {
      this.task = null; this.nav = null; this.huntSpecies = new Set();
      this.talkTries = 0; this.arrivedAt = 0; this.idleSince = 0;
    },
  };

  const commands = () => digibotCommands(digibotRawScene()?.deps?.commands);
  const activeAvoid = () => {
    const now = Date.now(), set = new Set();
    for (const [k, until] of autopilot.avoidSpots) if (until > now) set.add(k); else autopilot.avoidSpots.delete(k);
    return set;
  };
  // ---------- Gruppe: Meldungen zwischen den Fenstern ----------
  function onGroupMsg(m) {
    if (!digibotCore.accept(m, group.slot(), accounts.leader, i => accounts.list[i]?.on === true)) return;
    if (m.type === 'state') {
      if (m.objective && (!digibotRecord(m.objective) || typeof m.objective.mapId !== 'string' || typeof m.objective.boss !== 'string' || !Number.isInteger(m.objective.channel))) return;
      m = digibotClean(m);
    }
    if (m.type === 'state' && Number.isInteger(m.slot) && m.slot !== group.slot()) {
      const prev = group.peers.get(m.slot);
      group.peers.set(m.slot, { ...m, seen: Date.now() });
      // Hat sich beim anderen Fenster etwas Wichtiges geändert: gleich einen Bot-Schritt machen, nicht auf den Takt warten
      if (bot.on && group.active() && (!prev || groupSig(prev) !== groupSig(m))) kickTick();
    }
    if (m.type === 'pos' && m.slot === accounts.leader && m.slot !== group.slot()) group.leaderPos = { ...m, seen: Date.now() };
    if (m.type === 'koh' && m.src && m.slot !== group.slot()) kohState.claims.set(m.src, Date.now());
    if (m.type === 'kohplan' && Number.isInteger(m.slot) && m.slot !== group.slot()) kohState.plans.set(m.slot, { ...m, seen: Date.now() });
    if (!group.active()) return;
    if (m.type === 'start' && !bot.on) groupStartBot(m.manual === true && digibotCore.latched ? 'Gruppe: Start aus dem Leader-Fenster – Not-Aus aufgehoben' : 'Gruppe: Start aus dem Leader-Fenster', m.manual === true);
    // normales Stoppen (Bot/Gruppe) sperrt nicht – danach startet „Start“ wieder alle; der Not-Aus (Esc/Knopf, aus jedem
    // Fenster) sperrt, bis im Leader-Fenster von Hand auf Start geklickt wird
    if (m.type === 'stop') groupStopBot(m.scope === 'esc' ? 'Gruppe: Not-Aus (Esc) aus einem anderen Fenster' : m.scope === 'panic' ? 'Gruppe: Not-Aus aus einem anderen Fenster' : 'Gruppe: Stopp aus dem Leader-Fenster', m.scope!=='bot'&&m.scope!=='group');
    if (m.type === 'invite' && group.role() === 'leader') digibotCore.runPassive('Gruppe',20,()=>partyInviteNow()); // auch bei ausgeschaltetem Bot (Knopf im Mitläufer-Fenster)
    if (m.type === 'maptalk') startMapTalk('Gruppe: Abgeben & Annehmen auf dieser Map (aus einem anderen Fenster)');
  }
  // Was ein anderes Fenster sofort wissen muss (Ziel, Aufgabe, Gespräche, Kampf, Map, Quests) – Position nicht
  const groupSig = (m) => JSON.stringify([m.targetId, m.task?.key, m.talks?.[m.talks.length - 1]?.key, m.busy, m.done?.[m.done.length - 1],
    m.fight, m.mapId, m.channel, m.bot, m.noFight, m.inWorld, m.quests, m.objective, m.reservation,m.tamer,m.partyId]);
  function groupPush(force = false) {
    if (!group.active() || !group.bus) return;
    const st = getStore()?.getState?.(), now = Date.now();
    if (!st) return;
    const msg = groupState(st, now), sig = groupSig(msg);
    if (!force && sig === group.sig && now - group.sentAt < 1000) return;
    group.sig = sig; group.sentAt = now;
    try { digibotSend(msg); } catch { /* ignore */ }
  }
  function kickTick() {
    const now = Date.now();
    if (now - (group.kickAt || 0) < 120) return;
    group.kickAt = now;
    digibotCore.defer(() => { if (bot.on) bot.tick(); }, 0);
  }
  const charName = (st) => st?.session?.characters?.find?.((c) => c.id === window.dmo?.net?.charId)?.name || null;
  function groupState(st, now) {
    const me = st?.me, quests = {};
    for (const [id, q] of Object.entries(me?.quests || {})) if (q.state === 1 || q.state === 2) quests[id] = { state: q.state, counters: [...(q.counters || [])] };
    // abgeschlossene Quests (nur der Leader): Mitläufer holen nur auf, wenn der Leader eine Quest wirklich hinter sich hat
    const fin = group.role() === 'leader' ? Object.keys(me?.quests || {}).filter((id) => me.quests[id].state === 3) : [];
    const pos = controlled(st), t = st?.target, tk = autopilot.task;
    return {
      type: 'state', slot: group.slot(), role: group.role(), user: st?.session?.username || '', name: charName(st),
      inWorld: st?.screen === 'world' && !!me, mapId: st?.world?.mapId || null, channel: st?.world?.channel ?? 1,
      x: pos?.x ?? null, y: pos?.y ?? null, bot: bot.on, status: bot.status, quests,
      hp: me?.partner ? Math.round(pct(me.partner.hp, me.partner.maxHp)) : null,
      ents: [me?.tamerEntityId, me?.partner?.entityId].filter(Boolean),
      // nur ein Ziel, das ich wirklich angreife (nicht bloß ausgewählt, z. B. vom Spiel beim Angriff) und nicht unterwegs –
      // sonst greifen die Mitläufer es an (live: Leader auf dem Weg zum Boss, Makota prügelt sich mit dessen Auswahl)
      targetId: t?.kind === 'mob' && t.hp > 0 && !group.noFight && (bot.attackedId === t.id || window.dmo?.net?.state?.entities?.get?.(me?.partner?.entityId)?.targetId === t.id) ? t.id : null, hunt: cfg.autopilot ? [...autopilot.huntSpecies] : [], noFight: !!group.noFight, // Jagdliste nur im Autopilot (sonst jagen Mitläufer z. B. in der Boss-Rotation alte Quest-Monster)
      task: tk ? { key: tk.key, kind: tk.kind, label: tk.label } : null,
      talks: group.role() === 'leader' ? group.talks : [], done: group.done.slice(-30), busy: group.cur, login: group.login.msg, fin,
      deferred: group.seen.slice(-30),
      fight: inCombat(st), farm: !!cfg.farm,
      partyId:st.party?.id||null,tamer:{skill:digibotTamer.skill,want:digibotTamer.want,last:digibotTamer.last,cooldown:digibotTamer.cooldown},
      objective: digibotObjective(st), reservation: digibotFormation.reservation,
      kohAt: kohReadyAt(st, now),
      serve: serveOn(),
    };
  }
  const fresh = (p, now) => !!p && now - p.seen < GROUP_STALE_MS;
  function groupLeader(now = Date.now()) {
    if (group.role() !== 'follower') return null;
    const p = group.peers.get(accounts.leader);
    return fresh(p, now) && p.role === 'leader' ? p : null;
  }
  function groupMembers(now = Date.now()) {
    if (group.role() !== 'leader') return [];
    return [...group.peers.values()].filter((p) => fresh(p, now) && p.role === 'follower' && accounts.list[p.slot]?.on);
  }
  // Kämpft dieser Charakter gerade? Kampf-Flag des Spiels auf Tamer/Digimon oder eigener laufender Angriff
  const GROUP_FIGHT_MAX_MS = 120000; // länger wartet der Leader nicht auf ein Kampfende
  // Das Kampf-Flag des Spiels bleibt nach dem Kampf noch einige Sekunden stehen – deshalb zählt nur: eigener laufender
  // Angriff auf ein lebendes Monster, oder ein Monster greift mich gerade an. Wer schon zu einem Gespräch unterwegs
  // ist (Annehmen/Abgeben/Sprechen/Reise), kämpft nicht.
  function inCombat(st) {
    const ents = window.dmo?.net?.state?.entities, me = st?.me;
    if (!me || st.screen !== 'world') return false;
    const tk = autopilot.task;
    if (tk && PASSIVE(tk) && !taskDone(st, tk)) return false;
    const t = st.target;
    if (bot.on && bot.attackedId && t?.id === bot.attackedId && t.kind === 'mob' && t.hp > 0) return true;
    const mine = new Set([me.tamerEntityId, me.partner?.entityId].filter(Boolean));
    let attacked = false;
    ents?.forEach?.((e) => { if (!attacked && e.kind === KIND.Mob && e.hp > 0 && !(e.flags & FLAG.Dead) && mine.has(e.targetId)) attacked = true; });
    return attacked;
  }
  const groupFighters = (now = Date.now()) => groupMembers(now).filter((m) => m.inWorld && m.fight && !m.busy);
  // Leader: vor einem Gespräch (v. a. Abgabe) warten, bis niemand aus der Gruppe mehr kämpft
  function groupCombatWait(st, t, now) {
    if (group.role() !== 'leader' || t.kind !== 'talk' || st.dialog?.npc === t.npcId) { group.fightWait = 0; return null; }
    const f = groupFighters(now);
    if (!f.length) { group.fightWait = 0; return null; }
    group.fightWait ||= now;
    if (now - group.fightWait > GROUP_FIGHT_MAX_MS) return null;
    return `Gruppe: warte, bis ${f.map((m) => m.name || `Account ${m.slot + 1}`).join(', ')} den Kampf beendet`;
  }

  // Ziele verteilen: nur im Bot-Betrieb der Gruppe (nicht Spiegeln, nicht Boss-Rotation)
  const spreadNear = (m) => { const L = group.role() === 'follower' ? groupLeader() : null; return !L || L.x == null || Math.hypot(m.x - L.x, m.y - L.y) <= SPREAD_LEASH; };
  const SPREAD_LEASH = 250; // Ziele verteilen: Mitläufer greifen nur Monster in diesem Umkreis um den Leader an
  const spreadOn = () => group.active() && accounts.spread && !accounts.mirror && !cfg.farm;
  function groupTargets() {
    const out = new Map(), now = Date.now(), ents = window.dmo?.net?.state?.entities;
    for (const [slot, p] of group.peers) {
      if (!fresh(p, now) || !p.inWorld) continue;
      const ids = [p.targetId, ...(p.ents || []).map((id) => ents?.get?.(id)?.targetId)].filter(Boolean);
      for (const id of ids) if (!out.has(id) || out.get(id) > slot) out.set(id, slot);
    }
    return out;
  }
  function groupEntityIds() {
    const set = new Set(), now = Date.now();
    if (!group.active()) return set;
    for (const p of group.peers.values()) if (fresh(p, now)) for (const id of p.ents || []) set.add(id);
    return set;
  }
  // Leader plant mit dem Stand der ganzen Gruppe: Hat ein Mitläufer bei einer Quest noch offene Kampf-/Sammelziele,
  // gilt sie auch für den Leader als offen – er jagt weiter und gibt erst ab, wenn alle abgeben können.
  // „Leader erledigt die Quests der Mitläufer“ – nur im Quest-Betrieb der Gruppe
  const serveOn = () => group.role() === 'leader' && accounts.serve && !accounts.mirror && !cfg.farm && !autopilot.mapTalk;
  // Quests aller Mitläufer zusammen: aktiv, solange einer noch ein Ziel offen hat (Zähler = der kleinste);
  // fertig (abgeben), wenn alle, die sie haben, fertig sind
  function serveQuests() {
    const C = content(), out = {};
    for (const m of groupMembers().filter((x) => x.inWorld && x.quests)) {
      for (const [id, q] of Object.entries(m.quests)) {
        if (q.state !== 1 && q.state !== 2) continue;
        const objs = questDef(C, id)?.objectives || [];
        const full = (x) => (x.state === 2 ? objs.map((o) => o.count || 1) : objs.map((o, i) => x.counters?.[i] ?? 0));
        const cur = out[id];
        if (!cur) { out[id] = { state: q.state, counters: full(q), serve: true }; continue; }
        if (cur.state === 2 && q.state === 2) continue;
        const a = full(cur), b = full(q);
        out[id] = { state: 1, counters: a.map((v, i) => Math.min(v, b[i])), serve: true };
      }
    }
    return out;
  }
  function planQuests(st) {
    const own = st?.me?.quests || {};
    if (group.role() !== 'leader') return own;
    if (serveOn()) return serveQuests();
    const mem = groupMembers().filter((m) => m.inWorld && m.quests);
    if (!mem.length) return own;
    const C = content();
    let out = null;
    for (const [id, q] of Object.entries(own)) {
      if (q.state !== 1 && q.state !== 2) continue;
      const lag = mem.map((m) => m.quests[id]).filter((x) => x && x.state === 1);
      if (!lag.length) continue;
      const objs = questDef(C, id)?.objectives || [];
      let open = false, blocked = false;
      const counters = objs.map((o, i) => {
        const need = o.count || 1, mine = q.state === 2 ? need : q.counters?.[i] ?? 0;
        if (o.kind !== 'kill' && o.kind !== 'collect') { // dabei kann der Leader nicht helfen – nur warten
          if ((o.kind === 'reach' || o.kind === 'talk') && lag.some((x) => (x.counters?.[i] ?? 0) < need)) blocked = true;
          return mine;
        }
        const v = Math.min(mine, ...lag.map((x) => x.counters?.[i] ?? 0));
        if (v < need) open = true;
        return v;
      });
      if (blocked) { // Mitläufer muss noch hin / sprechen: Abgabe zurückhalten, aber nicht ewig
        const since = group.blockSince.get(id) ?? Date.now();
        group.blockSince.set(id, since);
        if (Date.now() - since > GROUP_BLOCK_MAX_MS) blocked = false;
      } else group.blockSince.delete(id);
      if (open || blocked) (out ||= { ...own })[id] = { ...q, state: 1, counters, group: true };
    }
    return out || own;
  }
  // Leader: Gespräch merken, damit die Mitläufer es nachmachen (Annehmen, Abgeben, Sprechen, Dailies)
  function groupNoteTalk(t, now) {
    if (group.role() !== 'leader' || (t.kind !== 'talk' && t.kind !== 'reach')) return;
    const e = { key: `${t.key}@${now}`, tkey: t.key, kind: t.kind, at: now, purpose: t.purpose, questId: t.questId || null, objIndex: t.objIndex ?? null,
      need: t.need ?? null, npcId: t.npcId, pool: t.def?.pool || null, loc: { mapId: t.loc.mapId, x: t.loc.x, y: t.loc.y }, label: t.label };
    group.talks = [...group.talks.filter((x) => now - x.at < GROUP_TALK_KEEP_MS), e].slice(-12);
  }
  // Leader: vor der nächsten Aufgabe warten, bis die Mitläufer das letzte Gespräch nachgemacht haben
  function groupWait(now) {
    if (group.role() !== 'leader') return null;
    const lt = group.talks[group.talks.length - 1];
    if (!lt || now - lt.at > GROUP_WAIT_MS) return null;
    // nur warten, bis jeder Mitläufer das Gespräch übernommen (oder übersprungen) hat – nicht bis zum Ende
    const waiting = groupMembers(now).filter((m) => m.inWorld && m.busy !== lt.key && !(m.done || []).includes(lt.key)
      && !(m.deferred || []).includes(lt.key) && now - lt.at < 15000);
    if (!waiting.length) return null;
    return `Gruppe: warte auf ${waiting.map((m) => m.name || `Slot ${m.slot + 1}`).join(', ')} (${lt.label})`;
  }
  // Leader will die Map verlassen: erst warten, bis die Mitläufer auf dieser Map ihre Gespräche beendet haben
  function groupLeaveWait(st, t, now) {
    if (group.role() !== 'leader' || !t?.loc?.mapId || t.loc.mapId === st.world?.mapId) return null;
    const lt = group.talks[group.talks.length - 1];
    if (lt && now - lt.at > GROUP_WAIT_MS) return null;
    // Wer gerade dasselbe Gespräch nachmacht (gleiches Ziel wie der Leader), läuft ohnehin mit – auf den nicht warten
    const sameAsMine = (m) => group.talks.some((x) => x.key === m.busy && x.tkey === t.key);
    const busy = groupMembers(now).filter((m) => m.inWorld && m.busy && m.mapId === st.world?.mapId && !sameAsMine(m));
    if (!busy.length) return null;
    return `Gruppe: warte vor dem Map-Wechsel auf ${busy.map((m) => m.name || `Slot ${m.slot + 1}`).join(', ')}`;
  }
  // Mitläufer: Gespräch des Leaders als eigene Aufgabe, wenn es für diesen Charakter passt
  function mirrorTask(st, lt) {
    const q = lt.questId ? st.me?.quests?.[lt.questId] : null;
    const def = lt.questId ? questDef(content(), lt.questId) : null;
    if (lt.kind === 'reach') { // „reise nach … / in die Zone …“
      return q?.state === 1 && (q.counters?.[lt.objIndex] ?? 0) < (lt.need || 1)
        ? { ...lt, key: lt.tkey, kind: 'reach', loc: { ...lt.loc }, def, mirror: lt.key } : null;
    }
    const sta = npcStation(lt.npcId, st.me?.quests || {});
    const base = { ...lt, key: lt.tkey, kind: 'talk', loc: sta && sta.mapId === lt.loc?.mapId ? sta : { ...lt.loc }, def, mirror: lt.key };
    if (lt.purpose === 'accept') {
      // nur nachmachen, wenn der NPC sie mir auch anbietet: Vorquests erledigt, Level reicht (sonst ~15 s Dialog-Versuche)
      const mine = st.me?.quests || {};
      if (!def || (def.prereq || []).some((p) => mine[p]?.state !== 3) || (def.minLevel ?? 1) > (st.me?.partner?.level ?? 1)) return null;
      return (q?.state ?? 0) === 0 || (q.state === 3 && repeatAvailable(def, q)) ? base : null;
    }
    if (lt.purpose === 'turnin') return q?.state === 2 && !cfg.apNoTurnin ? base : null;
    if (lt.purpose === 'objective') return q?.state === 1 && (q.counters?.[lt.objIndex] ?? 0) < lt.need ? base : null;
    if (lt.purpose === 'daily' && lt.pool) {
      const visitKey = `${lt.pool}|${activePartner(st)?.partnerId || 'p'}`;
      return autopilot.dailyVisited.has(visitKey) ? null : { ...base, visitKey, def: { pool: lt.pool } };
    }
    return null;
  }
  // Mitläufer: nächste Aufgabe = verpasstes Gespräch des Leaders, sonst dem Leader folgen (Status-Text)
  function followerPick(st, sc, now) {
    let t = autopilot.task;
    // Leader erledigt meine Quests: eine noch laufende eigene Aufgabe (Aufholen, Gespräch nachmachen) abbrechen und stehen bleiben
    if (t && groupLeader(now)?.serve) { autopilot.reset(); t = null; }
    if (t && taskDone(st, t)) { autopilot.reset(); t = null; }
    if (!t && group.cur) { group.done.push(group.cur); group.cur = null; }
    if (t) return t;
    const L = groupLeader(now);
    if (!L) { autopilot.huntSpecies = new Set(); return 'Gruppe: warte auf den Leader…'; }
    const at = followerAssign(st, L, now);
    if (at) return at;
    // Ohne eigenes Gespräch: liegengebliebene Dialoge/Daily-Board sofort schließen (z. B. nach einer Abgabe)
    if (st.dialog && !(st.dialog.npc === 'digiphone' && autopilot.tp)) commands()?.closeDialog?.();
    if (st.dailies?.board) commands()?.closeDailyBoard?.();
    return followLeader(st, sc, L, now);
  }
  // Mitläufer: nächstes eigenes Gespräch bestimmen – nachgemachtes Gespräch des Leaders oder Aufholen. Läuft auch
  // zwischen zwei Kämpfen (sonst kommt ein Mitläufer im Jagdgebiet nie dazu, weil immer ein Monster da ist).
  function followerAssign(st, L, now) {
    if (group.cur && !autopilot.task) { group.done.push(group.cur); group.cur = null; }
    if (L.farm || L.serve) return null; // Leader rotiert Bosse / führt nur: folgen und mitkämpfen
    for (const lt of L.talks || []) {
      if (group.handled.has(lt.key)) continue;
      const mt = mirrorTask(st, lt);
      // NPC auf einer anderen Map, der Leader steht aber noch hier: nicht allein loslaufen, sondern mit dem Leader
      // reisen – „gesehen“ melden (der Leader wartet dann nicht) und erst übernehmen, wenn er die Map gewechselt hat
      if (mt && mt.loc?.mapId && mt.loc.mapId !== st.world?.mapId && L.mapId === st.world?.mapId) { // auch während der Leader lädt
        if (!group.seen.includes(lt.key)) { group.seen.push(lt.key); group.seen = group.seen.slice(-30); }
        break;
      }
      group.handled.add(lt.key);
      if (!mt || (autopilot.failed.get(mt.key) || 0) > now) { group.done.push(lt.key); continue; }
      autopilot.reset();
      autopilot.task = mt; group.cur = lt.key;
      logEvent('auto', `Gruppe: ${mt.label}`);
      return mt;
    }
    group.done = group.done.slice(-30);
    // Aufholen (alle 3 s prüfen): Quests, bei denen der Leader schon weiter ist, selbst zu Ende bringen
    // (Gespräch, Zone, Abgabe) – und Quests annehmen, die der Leader aktiv hat, ich aber noch nicht
    if (now - (group.catchAt || 0) > 3000) {
      group.catchAt = now;
      const ct = followerCatchUp(st, L, now);
      if (ct) {
        autopilot.reset();
        autopilot.task = { ...ct, catchUp: true }; group.cur = `catchup:${ct.key}@${now}`;
        logEvent('auto', `Gruppe: hole nach – ${ct.label}`);
        return autopilot.task;
      }
    }
    return null;
  }
  function followerCatchUp(st, L, now) {
    const lq = L.quests || {}, own = st.me?.quests || {};
    let tasks;
    try { tasks = questTasks(st); } catch { return null; }
    return tasks.find((t) => {
      if ((autopilot.failed.get(t.key) || 0) > now || !t.questId) return false;
      // annehmen: Leader hat sie aktiv – oder es ist eine Story-Quest, die der Leader schon abgeschlossen hat (sonst
      // bleibt die Kette beim Mitläufer für immer hängen, z. B. fehlt „Word to Gennai“ -> „The Assembly Hall“ geht nicht)
      if (t.purpose === 'accept') return !!lq[t.questId] || ((L.fin || []).includes(t.questId) && isStory(t.questId));
      if (t.kind !== 'talk' && t.kind !== 'reach') return false;          // gejagt wird mit dem Leader
      const q = own[t.questId], l = lq[t.questId];
      if (!(q?.state === 1 || q?.state === 2)) return false;
      // Leader hat die Quest nicht aktiv: nur aufholen, wenn er sie abgeschlossen hat – nicht, wenn er sie erst noch annimmt
      if (!l) return (L.fin || []).includes(t.questId) && !(L.talks || []).some((x) => x.questId === t.questId && x.purpose === 'accept' && now - x.at < 600000);
      if (t.purpose === 'objective') return l.state === 2 || (l.counters?.[t.objIndex] ?? 0) >= (t.need || 1); // Leader hat dieses Ziel schon
      return false;
    }) || null;
  }
  function followLeader(st, sc, L, now) {
    const name = L.name || 'Leader';
    if (L.serve) {
      autopilot.huntSpecies = new Set(); autopilot.nav = null;
      // ein laufender Weg (Klickziel) läuft im Spiel sonst weiter: einmal auf die eigene Position tippen
      const me = controlled(st);
      if (me && (!group.standAt || Math.hypot(me.x - group.standAt.x, me.y - group.standAt.y) > 4) && bot.can('stand', 600, now)) {
        bot.lastPress.stand = now;
        group.standAt = { x: me.x, y: me.y };
        worldScene()?.tapGround?.(me.x, me.y);
      }
      return `Gruppe: bleibe stehen – ${name} erledigt meine Quests`;
    }
    group.standAt = null;
    if (!L.inWorld || !L.mapId) { autopilot.huntSpecies = new Set(); return `Gruppe: ${name} ist nicht in der Spielwelt`; }
    if (st.world?.mapId !== L.mapId) {
      autopilot.huntSpecies = new Set();
      const tr = travel(st, L.mapId, now);
      return tr === true ? 'Gruppe: angekommen' : `Gruppe: folge ${name} · ${tr}`;
    }
    const ch = L.channel ?? 1;
    if ((st.world?.channel ?? 1) !== ch) {
      const r = farmSwitch(st, sc, L.mapId, content()?.maps?.[L.mapId]?.name || L.mapId, ch, now);
      if (!r.done) return `Gruppe: zu ${name} · ${r.status}`;
    }
    autopilot.huntSpecies = new Set(L.hunt || []);
    const me = controlled(st);
    const d = me && L.x != null ? Math.hypot(me.x - L.x, me.y - L.y) : 0;
    if (d > FOLLOW_DIST) {
      if (walkTo(st, L.x, L.y, now) === 'stuck') autopilot.nav = null;
      return `Gruppe: folge ${name} (${Math.round(d)} px)`;
    }
    autopilot.nav = null;
    return `Gruppe: bei ${name}${L.task ? ` · ${L.task.label}` : ''}`;
  }
  // Mitläufer: Ziel des Leaders mit angreifen
  // Wen greift der Leader gerade an? Sein Digimon/Tamer steht auch in meiner Spielwelt – dort direkt nachsehen
  // (sofort, ohne auf seine Meldung zu warten). Nur wenn er nicht in Sichtweite ist: das gemeldete Ziel.
  function leaderTargetId(now = Date.now()) {
    const L = groupLeader(now);
    if (!L) return null;
    const ents = window.dmo?.net?.state?.entities;
    for (const id of [...(L.ents || [])].reverse()) { // Digimon zuerst
      const tid = ents?.get?.(id)?.targetId, m = tid && ents.get(tid);
      if (m && m.kind === KIND.Mob && m.hp > 0) return m.id;
    }
    return L.targetId || null;
  }
  // Ziel des Leaders mit angreifen – das Level-Limit des Mitläufers gilt dabei nicht (der Leader entscheidet)
  function groupAssist(sc) {
    const id = leaderTargetId();
    return id ? sc.mobs.find((m) => m.id === id && !m.banned && m.d <= cfg.radius * 1.5) || null : null;
  }
  // Gemeinsamer Fokus (ohne „Ziele verteilen“): Mitläufer bleiben auf dem Ziel des Leaders, auch wenn sie selbst
  // angegriffen werden – nur bei weniger als FOCUS_MIN_HP % HP wehren sie sich zuerst selbst
  const FOCUS_MIN_HP = 50;
  function focusAssist(sc) {
    if (group.role() !== 'follower' || !sc || spreadOn() || groupLeader()?.serve) return null;
    const p = getStore()?.getState?.()?.me?.partner;
    if (!p || (p.maxHp > 0 && p.hp / p.maxHp * 100 < FOCUS_MIN_HP)) return null;
    return groupAssist(sc);
  }
  // 👥 Party einladen (Knopf): Wartezeit zwischen Einladungen aufheben und sofort alle fehlenden einladen
  function partyInviteNow() {
    const st = getStore()?.getState?.();
    if (!st || group.role() !== 'leader') return;
    if (!commands()?.partyInvite || st.screen !== 'world') { group.msg = 'Einladen geht erst in der Spielwelt.'; schedule(); return; }
    group.invited.clear();
    const before = group.invited.size;
    groupParty(st, Date.now());
    const n = group.invited.size - before;
    group.msg = n ? `${n} Einladung${n > 1 ? 'en' : ''} verschickt.` : 'Alle Gruppenmitglieder sind schon in der Party (oder nicht in der Welt).';
    logEvent('bot', `Gruppe: Party einladen – ${group.msg}`);
    schedule();
  }
  // Party im Spiel: Leader lädt ein, Mitläufer nehmen Einladungen vom Leader an
  function groupParty(st, now) {
    if(!digibotDesktopPartyAllowed(st,now))return;
    const cmd = commands();
    if (!cmd?.partyInvite || st.screen !== 'world') return;
    if (group.role() === 'follower') {
      const inv = st.partyInvite, L = groupLeader(now);
      const from = String(inv?.from?.name ?? inv?.from ?? '').toLowerCase();
      if (inv && L?.name && from === L.name.toLowerCase()) {
        cmd.partyRespond?.(true);
        logEvent('bot', `Gruppe: Party-Einladung von ${L.name} angenommen`);
      }
      return;
    }
    if (group.role() !== 'leader') return;
    const inParty = (st.party?.members || []).map((x) => String(x.name || '').toLowerCase());
    for (const m of groupMembers(now)) {
      if (!m.inWorld || !m.name || inParty.includes(m.name.toLowerCase())) continue;
      if (now - (group.invited.get(m.name) || 0) < 30000) continue;
      group.invited.set(m.name, now);
      cmd.partyInvite(m.name);
      logEvent('bot', `Gruppe: lade ${m.name} in die Party ein`);
    }
  }
  // Charaktername pro Account merken (in jedem Fenster, auch ohne Gruppe)
  function noteCharacter(st, now) {
    if (st.screen !== 'world' || !st.me) return;
    const user = String(st.session?.username || '').trim().toLowerCase(), name = charName(st);
    if (!user || !name) return;
    const i = accounts.list.findIndex((a) => a.user.trim().toLowerCase() === user);
    if (i < 0 || (accounts.list[i].char === name && now - (accounts.list[i].at || 0) < 300000)) return;
    reloadAcc();
    accounts.list[i].char = name; accounts.list[i].at = now;
    saveAcc();
  }
  function groupTick() {
    if(digibotAccountQueue.active)return;
    const st = getStore()?.getState?.();
    if (!st) return;
    const now = Date.now();
    cfgProfile(st);
    noteCharacter(st, now);
    if (!group.active()) return;
    groupPush(true);
    groupParty(st, now);
    // Fenster aus „Gruppe starten“: Bot im Autopilot starten, sobald der Charakter in der Welt ist
    if (ss.get('digibot.go') === '1' && st.screen === 'world' && st.me?.partner) {
      group.worldAt ||= now;
      if (now - group.worldAt > 3000) {
        ss.set('digibot.go', null);
        if (!bot.on) groupStartBot(`Gruppe: Bot gestartet als ${group.role() === 'leader' ? 'Leader' : 'Mitläufer'}`);
      }
    } else if (st.screen !== 'world') group.worldAt = 0;
  }
  // Dieses Fenster einer Gruppe zuordnen: eingeloggter Account, sonst der Leader. Liefert die aktiven Accounts oder null.
  function claimSlot(st) {
    reloadAcc();
    const on = accounts.list.map((a, i) => ({ ...a, i })).filter((a) => a.on && a.user.trim());
    if (!on.length) { group.msg = 'Kein Account mit Haken und Benutzername.'; schedule(); return null; }
    if (!on.some((a) => a.i === accounts.leader)) { group.msg = 'Der Leader (◉) braucht auch einen Haken.'; schedule(); return null; }
    let mine = group.slot();
    if (!group.active() || !on.some((a) => a.i === mine)) {
      const u = String(st?.session?.username || '').toLowerCase();
      mine = (on.find((a) => a.user.trim().toLowerCase() === u) || on.find((a) => a.i === accounts.leader)).i;
      group.talks = []; group.handled = new Set(); group.done = []; group.cur = null;
    }
    ss.set('digibot.slot', String(mine)); ss.set('digibot.group', '1');
    return { on, mine };
  }
  // ▶ Bots starten: nur die Bots aller Gruppenfenster starten (kein Login, keine neuen Fenster)
  // ---------- Bewegungen spiegeln: Leader meldet seine Position, Mitläufer (Bot aus) laufen mit ----------
  const MIRROR_OFFSETS = [[-26, 18], [26, 18], [-26, -18], [26, -18]]; // kleine Formation um den Leader
  function mirrorTick() {
    if(digibotAccountQueue.active)return;
    if (!accounts.mirror || !group.active()) { if (group.mirroring) mirrorEnd(); return; }
    const st = getStore()?.getState?.(), now = Date.now();
    if (!st || st.screen !== 'world' || !st.me) return;
    if (group.role() === 'leader' && group.mirroring) mirrorEnd();
    if (group.role() === 'leader') { // Position melden, sobald sie sich ändert (sonst 1× pro Sekunde)
      if (!bot.on && !typingInField()) mirrorCare(st, now); // Leader spielt man selbst: Tränke/Heal trotzdem automatisch
      const me = controlled(st), lp = group.lastPos;
      if (!me || !group.bus) return;
      const ents = window.dmo?.net?.state?.entities;
      const tid = ents?.get?.(st.me.partner?.entityId)?.targetId || ents?.get?.(st.me.tamerEntityId)?.targetId || null;
      const tm = tid && ents.get(tid), atk = tm && tm.kind === KIND.Mob && tm.hp > 0 ? tid : null;
      const moved = !lp || lp.mapId !== st.world?.mapId || lp.atk !== atk || Math.hypot(lp.x - me.x, lp.y - me.y) >= 2;
      if (!moved && now - lp.at < 1000) return;
      group.lastPos = { mapId: st.world?.mapId, x: me.x, y: me.y, atk, at: now };
      try { digibotSend({ type: 'pos', slot: group.slot(), mapId: st.world?.mapId, channel: st.world?.channel ?? 1, x: me.x, y: me.y, atk }); } catch { /* ignore */ }
      return;
    }
    if (bot.on) { if (group.mirroring) mirrorEnd(); return; } // läuft der Bot, folgt er selbst
    group.mirroring = true;
    const P = group.leaderPos;
    const set = (t) => { if (bot.status !== t) { bot.status = t; schedule(); } };
    if (!P || now - P.seen > 3000) return set('Spiegeln: warte auf den Leader…');
    if (world.state !== 'ready') { loadWorld(); return set('Spiegeln: lade Weltkarte…'); }
    if (st.world?.mapId !== P.mapId) {
      const tr = travel(st, P.mapId, now);
      return set(tr === true ? 'Spiegeln: angekommen' : `Spiegeln: ${tr}`);
    }
    const ch = P.channel ?? 1;
    if ((st.world?.channel ?? 1) !== ch) {
      const r = farmSwitch(st, scan(st), P.mapId, content()?.maps?.[P.mapId]?.name || P.mapId, ch, now);
      if (!r.done) return set(`Spiegeln: ${r.status}`);
    }
    let atk = null;
    if (accounts.mirrorAtk) {
      atk = mirrorAttack(st, P, now);
      if (atk?.hold) return set(`Spiegeln: ${atk.text}`);
    }
    const followers = accounts.list.map((a, i) => i).filter((i) => i !== accounts.leader && accounts.list[i].on);
    const [ox, oy] = MIRROR_OFFSETS[Math.max(0, followers.indexOf(group.slot())) % MIRROR_OFFSETS.length];
    const tx = P.x + ox, ty = P.y + oy, me = controlled(st);
    if (!me) return;
    const d = Math.hypot(me.x - tx, me.y - ty);
    if (d < 6) { autopilot.nav = null; return set(atk ? `Spiegeln: ${atk.text}` : 'Spiegeln: beim Leader'); }
    if (d > LONG_WALK) { walkTo(st, tx, ty, now); return set(`Spiegeln: laufe zum Leader (${Math.round(d)} px)`); }
    const lt = group.mirrorTap;
    if (!lt || Math.hypot(lt.x - tx, lt.y - ty) > 4 || now - lt.at > 700) {
      worldScene()?.tapGround?.(tx, ty);
      group.mirrorTap = { x: tx, y: ty, at: now };
    }
    set(atk ? `Spiegeln: ${atk.text}` : 'Spiegeln: folge dem Leader');
  }
  // Angriff spiegeln: Ziel des Leaders anvisieren, mit 1 angreifen, Skills 2–6 (wie im Reiter Kampf), Tränke F1–F3,
  // Warnkreisen ausweichen, bei Spiegel/Reflexion nicht angreifen. Liefert { text, hold } oder null (kein Ziel).
  // Spiegeln: Tränke F1–F3 nach den eingestellten Schwellen und Heil-Skill – bei den Mitläufern und auch beim Leader,
  // den man selbst spielt (sein Bot ist dabei aus)
  function mirrorCare(st, now) {
    const me = st.me, p = me?.partner;
    if (!p || p.fainted) return;
    const potion = (fKey, below) => {
      if (below && potionCount(me, fKey) > 0 && bot.can('F' + fKey, POT_COOLDOWN_MS, now)) {
        bot.hit('F' + fKey, now);
        logEvent('potion', `F${fKey}: Trank benutzt (Spiegeln)`);
      }
    };
    potion(1, cfg.hpPot > 0 && pct(p.hp, p.maxHp) < cfg.hpPot);
    potion(2, cfg.dsPot > 0 && pct(p.ds, p.maxDs) < cfg.dsPot);
    potion(3, tamerFoodNeeded(me, now));
    healSkill(st, now);
  }
  function mirrorAttack(st, P, now) {
    const me = st.me, p = me?.partner;
    if (!p || p.fainted) return null;
    mirrorCare(st, now);
    noteBosses(now);
    const kh = digibotCore.priority(100,()=>keyOfHope(st, now));
    if (kh) return { text: kh, hold: true };
    const kg = digibotCore.priority(100,()=>kohGather(st, now));
    if (kg) { group.mirrorTap = null; return { text: kg, hold: true }; }
    const dg = digibotCore.priority(100,()=>dodge(st, now));
    if (dg) { group.mirrorTap = null; return { text: dg, hold: true }; }
    const ents = window.dmo?.net?.state?.entities;
    const id = leaderTargetId(now) || P.atk;
    const m = id && ents?.get?.(id);
    if (!m || m.kind !== KIND.Mob || m.hp <= 0 || (m.flags & FLAG.Dead)) { group.mirrorAtkId = null; return null; }
    const name = content()?.digimon?.[m.defId]?.name || m.defId;
    if (st.target?.id !== id) {
      if (bot.can('select', SELECT_GAP_MS, now)) { bot.lastPress.select = now; worldScene()?.select?.(id); }
      return { text: `ziele auf ${name}` };
    }
    if (cfg.mirror && mirrorActive(id)) { // Digimon zurückrufen (wie der Bot selbst) – sonst frisst es den zurückgeworfenen Schaden
      if (bot.can('follow', 1500, now)) { bot.lastPress.follow = now; commands()?.partnerFollow?.(); }
      return { text: `${name} spiegelt Schaden – warte`, hold: true };
    }
    if (group.mirrorAtkId !== id || bot.can('Digit1', ATTACK_REPEAT_MS, now)) { group.mirrorAtkId = id; bot.hit('Digit1', now); }
    let text = `greife ${name} an`;
    if (farmShielded(m, now)) text += ' · Spawn-Schutz – Skills warten';
    else if (!p.evolving && bot.can('skill', SKILL_GAP_MS, now)) {
      for (const k of SKILL_KEYS) {
        if (!skillOn(st, k) || healAt(st, k)) continue; // Heil-Skills nur über healSkill
        const sk = skillOnKey(st, k);
        if (sk && isKoh(sk.skill) && cfg.koh) continue; // nur gegen große Raid-Angriffe
        if (!sk || sk.cdLeft > 0 || sk.skill.unlocked === false || p.ds < (sk.skill.dsCost || 0)) continue;
        if (!bot.can('Digit' + k, SKILL_GAP_MS * 2, now)) continue;
        if (skillUnsafe(st, st.target, sk.skill, now, Number(String(sk.ref).slice(6)))) continue;
        bot.lastPress.skill = now;
        bot.hit('Digit' + k, now);
        text += ` · Skill ${k}`;
        break;
      }
    }
    return { text };
  }
  function mirrorEnd() {
    group.mirroring = false; group.mirrorTap = null; autopilot.nav = null;
    if (!bot.on) { bot.status = 'Bot aus'; schedule(); }
  }

  function startGroup() {
    const st = getStore()?.getState?.();
    if (!claimSlot(st)) return;
    group.msg = 'Bots gestartet.';
    if (!digibotCore.start(digibotManual)) return;
    groupStartBot('Gruppe: Bots gestartet');
    groupPush(true);groupSend('start');
    groupTick();
    schedule();
  }
  // 🔑 Alle einloggen: fehlende Fenster öffnen, überall den richtigen Account einloggen und den Charakter wählen
  function openGroupWindows() { // compatibility name: opens windows, never authenticates
    const st=getStore()?.getState?.(), now=Date.now(),c=claimSlot(st);if(!c)return;
    let opened=0;
    for(const a of c.on){if(a.i===c.mine||fresh(group.peers.get(a.i),now))continue;
      const w=window.open(`${location.origin}${location.pathname}#dbslot=${a.i}`,`digibot-slot-${a.i}`,accounts.popup?'popup,width=640,height=720':'');if(w)opened++;
    }
    group.msg=`${opened} Fenster geöffnet – in jedem Fenster selbst anmelden und Charakter wählen.`;schedule();
  }
  // Bot in diesem Gruppenfenster starten (Autopilot). Noch nicht in der Welt -> startet nach dem Einloggen.
  function groupStartBot(why, manual = false) {
    if (digibotCore.latched && !digibotManual && !manual) return;
    const st = getStore()?.getState?.();
    if (st?.screen !== 'world' || !st.me?.partner) { ss.set('digibot.go', '1'); group.worldAt = 0; return; }
    // Start von Hand im Leader-Fenster: zählt hier wie ein eigener Klick (hebt den Not-Aus auf)
    const prevManual = digibotManual; if (manual) digibotManual = true;
    try { groupStartNow(why); } finally { digibotManual = prevManual; }
  }
  function groupStartNow(why) {
    reloadAcc();
    const boss = group.role() === 'leader' && accounts.leadBoss && !accounts.mirror;
    const dgOn = accounts.dungeon && !accounts.mirror; // Dungeon: alle Fenster im Dungeon-Modus
    cfg.questMode = false; cfg.autopilot = !boss && !dgOn; cfg.farm = boss && !dgOn; cfg.dungeon = dgOn;
    if (dgOn) dg.reset();
    if (boss) cfg.farmMode = 'boss';
    loadWorld();
    if (!bot.on) bot.toggle(true);
    logEvent('bot', why);
    schedule();
  }
  // 📜 Abgeben & Annehmen: einmalige Runde nur mit Gesprächen auf der aktuellen Map (eigene Quests, keine Gruppen-Wartezeiten)
  function startMapTalk(why) {
    const st = getStore()?.getState?.();
    if (st?.screen !== 'world' || !st.me?.partner || autopilot.mapTalk) return;
    autopilot.mapTalk = { mapId: st.world?.mapId, n: 0, prev: { autopilot: cfg.autopilot, farm: cfg.farm, questMode: cfg.questMode, dungeon: cfg.dungeon, on: bot.on } };
    cfg.autopilot = true; cfg.farm = false; cfg.questMode = false; cfg.dungeon = false;
    autopilot.reset();
    loadWorld();
    if (!bot.on) bot.toggle(true); // still: kein Start/Stopp an die ganze Gruppe
    logEvent('auto', why);
    schedule();
  }
  function endMapTalk() {
    const mt = autopilot.mapTalk;
    if (!mt) return;
    autopilot.mapTalk = null;
    Object.assign(cfg, { autopilot: mt.prev.autopilot, farm: mt.prev.farm, questMode: mt.prev.questMode, dungeon: !!mt.prev.dungeon });
    autopilot.reset();
    logEvent('auto', `Abgeben & Annehmen fertig${mt.n ? ` (${mt.n} erledigt)` : ' – hier gab es nichts'}${mt.prev.on ? ' – weiter wie vorher' : ''}`);
    if (!mt.prev.on && bot.on) bot.toggle(true); // nur dieses Fenster – die anderen sind evtl. noch dabei
    schedule();
  }
  // Bot stoppen; das Fenster bleibt in der Gruppe (nächster Start geht wieder an alle)
  function groupStopBot(why,hard=true) {
    ss.set('digibot.go', null);
    group.msg = '';
    digibotCore.stop(why, hard); logEvent('bot', why);
    schedule();
  }
  const groupSend = (type,scope) => digibotSend({type,...scope?{scope}:{}});
  function stopGroup() {
    groupSend('stop','group');
    groupStopBot('Gruppe gestoppt',false);
    group.msg = 'Bots gestoppt.';
  }

  function controlled(st) {
    const ents = window.dmo?.net?.state?.entities;
    const id = worldScene()?.controlledId?.() || st?.me?.tamerEntityId;
    return ents?.get?.(id) || ents?.get?.(st?.me?.tamerEntityId) || null;
  }

  // Bester Ort zum Jagen einer Art: Spawn-Zone (oder Boss-Spawnpunkt) mit passendem Level, möglichst nah.
  // Bestes Jagdgebiet für ein Kill-/Sammel-Ziel. Pro Zone werden alle passenden Arten zusammengefasst
  // (mehr Arten = mehr mögliche Ziele). Feldbosse kommen für Sammel-Items nur infrage, wenn es keine normale
  // Quelle gibt – sie sind stark und brauchen Minuten bis zum Respawn. Verlangt ein Kill-Ziel genau den Boss,
  // ist er natürlich das Ziel. avoid = gerade gemiedene Gebiete (leer gewesen).
  function huntSpot(C, species, lvl, curMap, itemId, avoid) {
    const spots = new Map();
    const add = (key, mapId, pos, sp, lo, hi, boss) => {
      if (!pos || hops(curMap, mapId) === Infinity) return;
      let sp0 = spots.get(key);
      if (!sp0) spots.set(key, sp0 = { key, mapId, x: pos.x, y: pos.y, species: [], lo: Infinity, hi: -Infinity, boss });
      if (!sp0.species.includes(sp)) sp0.species.push(sp);
      sp0.lo = Math.min(sp0.lo, lo); sp0.hi = Math.max(sp0.hi, hi);
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
          add(`${mapId}|${zone}`, mapId, r && { x: r.x + r.w / 2, y: r.y + r.h / 2 }, en.species, lo, hi, false);
        }
      }
      for (const b of spawn.bosses || []) {
        const wanted = itemId ? dropsOf(C, b).some((d) => d.itemId === itemId) : species.includes(b.species);
        if (wanted) add(`${mapId}|boss|${b.at}`, mapId, wm.spawns[b.at] || (wm.zones[b.at] && { x: wm.zones[b.at].x + wm.zones[b.at].w / 2, y: wm.zones[b.at].y + wm.zones[b.at].h / 2 }), b.species, b.level, b.level, true);
      }
    }
    const score = (sp) => (sp.lo > lvl + cfg.lvlDiff ? 1000 : 0)
      + (sp.boss ? 500 : 0)                          // Boss-Spawn nur als letzte Quelle (Items und normale Kills)
      + (avoid?.has(sp.key) ? 300 : 0)                // gerade leer gewesen
      + hops(curMap, sp.mapId) * 10
      + Math.abs((Math.min(sp.hi, lvl + cfg.lvlDiff) + sp.lo) / 2 - lvl) * 0.5
      - Math.min(sp.species.length, 4) * 0.5;        // mehrere passende Arten: mehr Ziele
    let best = null;
    for (const sp of spots.values()) { sp.score = score(sp); if (!best || sp.score < best.score) best = sp; }
    if (!best || best.lo > lvl + cfg.lvlDiff) return null;
    best.names = best.species.map((sp) => C.digimon?.[sp]?.name || sp).join(', ');
    return best;
  }


  // Bester Ort zum Leveln: Zone, deren Monster im eigenen Level-Bereich liegen, möglichst nah.
  function grindSpot(C, lvl, curMap, avoid) {
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
        const key = `${mapId}|${zone}`;
        const score = h * 10 + Math.abs(avg - lvl) + (avoid?.has(key) ? 300 : 0); // gerade leer gewesen: hinten anstellen
        if (!best || score < best.score) {
          const species = [...new Set(fit.map((en) => en.species))];
          best = { mapId, key, x: r.x + r.w / 2, y: r.y + r.h / 2, score, species,
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
  // Eigene Merkliste „heute erledigt“ – je Account (sonst überspringt Account B eine Tagesquest, nur weil A sie heute hatte)
  const DONE_KEY = 'digibot.doneToday';
  const doneKey = () => (cfgUser ? `${DONE_KEY}@${cfgUser}` : DONE_KEY);
  let doneUser, doneList = {};
  function doneToday() {
    if (doneUser !== cfgUser) { doneUser = cfgUser; try { doneList = JSON.parse(localStorage.getItem(doneKey()) || '{}'); } catch { doneList = {}; } }
    return doneList;
  }
  function markDoneToday(id) {
    const d = doneToday();
    d[id] = gameDay();
    for (const [k, v] of Object.entries(d)) if (v < gameDay()) delete d[k]; // alte Tage aufräumen
    try { localStorage.setItem(doneKey(), JSON.stringify(d)); } catch {}
  }
  // Serie (Adventure / Adventure 02): Quests a2…_ gibt es nur in Welten der Serie 2 (wie im Spiel)
  const questSeries = (id) => (/^a2[a-z]?_/.test(id) ? 2 : 1);
  const worldSeries = (st) => st?.world?.series ?? content()?.maps?.[st?.world?.mapId]?.series ?? 1;
  // Für wiederholte Quests zählt im Spiel das höchste Level im Team
  const teamLevel = (st) => (st?.archive?.partners || []).reduce((m, p) => (p.carried ? Math.max(m, p.level || 0) : m), st?.me?.partner?.level ?? 1);
  function repeatAvailable(def, q) {
    if (!def || isStory(def.id) || q?.state !== 3) return false;
    if (doneToday()[def.id] === gameDay()) return false; // heute schon abgeschlossen (eigene Merkliste)
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
    if (group.role() === 'follower') return true; // Partner-IDs gehören zum Account des Leaders
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
    // Das Spiel lehnt den Wechsel im Kampf und 10 s nach dem letzten Wechsel ab – abwarten, ohne als Fehlversuch
    // zu zählen (sonst gibt der Bot auf und gibt mit dem falschen Digimon ab). Im Kampf das Digimon zurückrufen.
    const swCd = Math.max(0, (st?.cooldowns?.switch?.end ?? 0) - performance.now());
    if (swCd > 0) return `Partner-Wechsel in ${Math.ceil(swCd / 1000)} s (Abklingzeit)…`;
    const pe = window.dmo?.net?.state?.entities?.get?.(cur?.entityId);
    if (pe && (pe.flags & FLAG.InCombat)) {
      if (now - autopilot.switchFollowAt > 1500) { autopilot.switchFollowAt = now; commands()?.partnerFollow?.(); }
      return 'Partner-Wechsel: warte, bis der Kampf vorbei ist…';
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

  // „Höchstmögliche Digitation“: die tiefste freigeschaltete Form auf dem Ast des aktuellen Digimons (Kette über „from“).
  // DNA-Linie zuerst (wenn ein DNA-Partner da ist), sonst die tiefste; bei gleicher Tiefe Entwicklungsstufe (Armor unter
  // Champion) und Freischaltlevel. null = keine höhere Form.
  const EVO_MAX = '__max';
  function maxEvolution(p) {
    const evos = p?.evolutions || [];
    const by = new Map(evos.map((e) => [e.species, e]));
    const chain = (e) => { const out = []; for (let i = 0, x = e; x && i < 12; i++, x = by.get(x.from)) out.push(x); return out; };
    // Armor unter Champion: bei gleicher Tiefe nie die Armor-Form statt der normalen Linie
    const stageRank={rookie:1,'in-training':0,champion:2,armor:1.5,ultimate:3,mega:4,super:5,ultra:5};
    // DNA hat Vorrang, sofern möglich: jeder DNA-Schritt, der noch vor dem aktuellen Digimon liegt, braucht einen
    // verfügbaren DNA-Partner (vom Spiel in jogress.partner gemeldet)
    const isDna = (x) => x.stage === 'jogress' || !!x.jogress;
    const dnaOk = (c) => { const i = c.findIndex((x) => x.species === p.species); return c.slice(0, i < 0 ? c.length : i).every((x) => !isDna(x) || !!x.jogress?.partner?.partnerId); };
    let best = null, bestD = -1, bestDna = false;
    for (const e of evos) {
      const c = chain(e);
      if (!c.some((x) => x.species === p.species) || c.some((x) => x.unlocked === false || x.selected === false)) continue; // anderer Ast / gesperrt
      if (e.level && (p.level ?? 0) < e.level) continue;
      if (!dnaOk(c)) continue; // DNA-Partner fehlt
      const dna = c.some(isDna);
      const better = dna !== bestDna ? dna : c.length > bestD || c.length===bestD && ((stageRank[e.stage]||0)>(stageRank[best?.stage]||0) || (stageRank[e.stage]||0)===(stageRank[best?.stage]||0) && (e.level||0)>(best?.level||0));
      if (!best || better) { best = e; bestD = c.length; bestDna = dna; }
    }
    return best && best.species !== p.species ? best.species : null;
  }

  // Digitiert das aktive Digimon Schritt für Schritt zur gewünschten Form. Fehlt Tamer-DS, wird der F3-Trank
  // benutzt. true = passt (oder geht gerade nicht); sonst Statustext.
  function ensureEvolution(st, species, now) {
    // Mitläufer: gleiche Zielform wie der Leader – nur wenn ihr eigenes Digimon sie hat (sonst passiert unten nichts)
    const p = st?.me?.partner;
    digibotEvolutionContext(st);
    if (species === EVO_MAX) species = maxEvolution(p); // „höchstmögliche Digitation“
    // Schritt gelungen (andere Form als beim letzten Befehl): Fehlversuche neu zählen – sonst galt nach fünf gelungenen
    // Schritten (z. B. Patamon -> … -> Seraphimon, zurück, Angemon) der nächste als „klappt nicht“
    if (p && autopilot.evoFrom && p.species !== autopilot.evoFrom) { autopilot.evoTries = 0; autopilot.evoFrom = null; }
    if (!species || !p || p.species === species || p.evolving || autopilot.evoGiveUp === species) return true;
    const evos = p.evolutions || [];
    const target = evos.find((e) => e.species === species);
    const note=(reason)=>{const key=species+':'+reason;if(autopilot.evoNote!==key){autopilot.evoNote=key;logEvent('warn',`Digitation ${speciesName(species)}: ${reason}`);}return true;};
    if (!target) return note('Form im aktuellen Spielzustand nicht verfügbar');
    if(target.unlocked===false)return note(`gesperrt (${target.lock||'Voraussetzungen fehlen'})`);
    const warp=!!(cfg.evoWarp && target.warp && !target.warp.blocker && !lrDarkMap(st));
    if(target.blocked && !warp)return note(target.blockReason==='dark_tower'?'durch Dark Tower blockiert':target.blockReason==='reaper'?'durch Reaper blockiert':'vom Spiel blockiert');
    let step = target;
    for (let i = 0; !warp && i < 8 && step && step.from !== p.species; i++) step = evos.find((e) => e.species === step.from);
    if (!step || step.unlocked === false) return true; // Ziel liegt auf einem anderen Ast
    // Match the game client: only the actual next step supplies a fusion partner.
    // An existing fusion can evolve further even while its partner is locked/absent.
    const withPartner = warp ? undefined : step.jogress?.partner?.partnerId;
    if (evoCooldownLeft(st) > 0) return true;            // Abklingzeit: erst mal in aktueller Form weiter
    const cost=warp?target.warp.dsCost:step.dsCost;
    const ready=warp?!target.warp.blocker && (st.me.tamerDs??0)>=cost:step.canEvolveNow;
    if (!ready) {
      if ((st.me.tamerDs ?? 0) < (cost ?? 0) && potionCount(st.me, 3) > 0 && bot.can('F3', POT_COOLDOWN_MS, now)) {
        bot.hit('F3', now);
        logEvent('potion', 'F3: Tamer-DS für die Digitation aufgefüllt');
        return 'Fülle Tamer-DS für die Digitation auf…';
      }
      return note(target.warp?.blocker && cfg.evoWarp ? `Warp: ${target.warp.blocker}` : (st.me.tamerDs??0)<(cost??0)?'zu wenig Tamer-DS':'momentan nicht bereit');
    }
    if (now - autopilot.lastEvolve > 4000) {
      if (++autopilot.evoTries > 5) { autopilot.evoGiveUp = species; logEvent('warn', `Digitation zu ${speciesName(species)} klappt nicht`); return true; }
      autopilot.lastEvolve = now; autopilot.evoFrom = p.species;
      commands()?.evolve?.(step.species, withPartner, warp||undefined);
      logEvent('auto', `Digitiere: ${speciesName(p.species)} → ${speciesName(step.species)}`);
    }
    return `Digitiere zu ${speciesName(step.species)}…`;
  }

  // Lern-Route: Zielform je nach Map – unter Kaisers Dark Towers klappt nur die Armor-Digitation (live: Digitation brach ab)
  const EVO_ARMOR = '__armor';
  function maxArmor(p) {
    let best = null;
    for (const e of p?.evolutions || []) if (e.stage === 'armor' && e.unlocked !== false && (p.level ?? 0) >= (e.level || 0) && (!best || (e.level || 0) > (best.level || 0))) best = e;
    return best?.species || null;
  }
  function digibotEvoReason(st,reason) {
    const p=st?.me?.partner;
    // je Map und Grund nur einmal – nicht nach jedem Digitationsschritt erneut (live: dieselbe Meldung alle paar Sekunden)
    const key=`${st?.world?.mapId}|${reason}`;
    void p;
    if(autopilot.evoReasonKey!==key){autopilot.evoReasonKey=key;logEvent('warn',`Digitationsautomatik: ${reason}`);}
    return true;
  }
  function digibotEvolutionSnapshot() {
    const st=window.dmo?.store?.getState?.(),p=st?.me?.partner;
    return {mode:cfg.autopilot?'autopilot':cfg.farm?'farm':cfg.dungeon?'dungeon':'other',
      apMapEvo:!!cfg.apMapEvo,levelEvo:!!cfg.levelEvo,normalForm:cfg.levelEvoForm,darkForm:cfg.levelEvoDark,fixedForm:cfg.apEvo,
      questPartner:digibotConfiguredPartner(st,'apQuestPartner')||autopilot.questHome,turninPartner:digibotConfiguredPartner(st,'apTurninPartner'),activePartner:activePartner(st)?.partnerId,apBatch:!!cfg.apBatch,batchPhase:autopilot.batchPhase,turninPartnerHeld:!!autopilot.turninPartnerHeld,
      species:p?.species,darkTower:lrDarkMap(st),tamerDs:st?.me?.tamerDs,tamerMaxDs:st?.me?.tamerMaxDs,
      options:(p?.evolutions||[]).slice(0,60).map(e=>({species:e.species,stage:e.stage,from:e.from,level:e.level,unlocked:e.unlocked,selected:e.selected,blocked:e.blocked,blockReason:e.blockReason,canEvolveNow:e.canEvolveNow,dsCost:e.dsCost,lock:e.lock}))};
  }
  const lrDarkMap = (st) => digibotTowerState(st,content());
  function lrEvolve(st, now) {
    const p = st?.me?.partner; if (!p) return true;
    let sp = lrDarkMap(st) ? cfg.levelEvoDark : cfg.levelEvoForm;
    if (sp === EVO_ARMOR) {sp = maxArmor(p);if(!sp)return digibotEvoReason(st,'keine freigeschaltete Armor-Form für das aktuelle Level gefunden');}
    else if (sp === EVO_MAX) { // aus einer Armor-Form (z. B. nach einer Dark-Tower-Map) von der Grundform aus suchen
      const root = (p.evolutions || []).find((e) => !e.from)?.species;
      sp = maxEvolution(p) || (root ? maxEvolution({ ...p, species: root }) : null) || p.species;
    }
    if(sp && !(p.evolutions||[]).some(e=>e.species===sp) && sp!==p.species){
      digibotEvoReason(st,`Zielform ${speciesName(sp)} gehört nicht zu diesem Partner – verwende dessen höchste Form`);
      sp=lrDarkMap(st)?maxArmor(p):(maxEvolution(p)||p.species);
    }
    if (!sp) return digibotEvoReason(st,'für diese Map ist keine Zielform eingestellt');
    if (sp === p.species || p.evolving) return true;
    // Ziel auf einem anderen Ast (z. B. Mega -> Armor): erst zurück in die Grundform
    const evos = p.evolutions || [], tgt = evos.find((e) => e.species === sp);
    if (!tgt || tgt.unlocked === false || (p.level ?? 0) < (tgt.level || 0)) return true;
    if(cfg.evoWarp && tgt.warp && !tgt.warp.blocker && !lrDarkMap(st))return ensureEvolution(st,sp,now);
    let x = tgt; for (let i = 0; i < 8 && x && x.species !== p.species; i++) x = evos.find((e) => e.species === x.from);
    if (!x && p.stage && p.stage !== 'rookie' && p.stage !== 'in-training') {
      if (evoCooldownLeft(st) > 0) return true;
      if (now - autopilot.lastEvolve > 4000) {
        autopilot.lastEvolve = now; commands()?.devolve?.();
        logEvent('auto', `Zurück-Digitation: ${speciesName(p.species)} → Grundform (für ${speciesName(sp)}${lrDarkMap(st) ? ', Dark Tower' : ''})`);
      }
      return `Digitiere ${speciesName(p.species)} zurück (für ${speciesName(sp)})…`;
    }
    return ensureEvolution(st, sp, now);
  }


  // Autopilot uses precisely the same map-aware evolution resolver as the learning route.
  function autopilotEvolution(st, now) {
    if (cfg.autopilot && !cfg.farm && !cfg.dungeon && cfg.apMapEvo) {
      return cfg.levelEvo ? lrEvolve(st, now) : digibotEvoReason(st,'Digitationsregeln übernommen, aber Lernrouten-Digitation ist ausgeschaltet');
    }
    const p=st?.me?.partner;let sp=cfg.apEvo;
    if(sp && sp!==EVO_MAX && sp!==p?.species && !(p?.evolutions||[]).some(e=>e.species===sp)){
      digibotEvoReason(st,`Zielform ${speciesName(sp)} gehört nicht zu diesem Partner – verwende dessen höchste Form`);
      sp=EVO_MAX;
    }
    return ensureEvolution(st, sp, now);
  }

  // Event/Weltboss (3.0.5): auch außerhalb des Autopiloten vor dem Kampf digitieren – beim Warten am Spawnpunkt und
  // zwischen den Kämpfen (vorher nur Autopilot/Rotation/Dungeon: beim Grinden und im Modus „Nur Event/WB“ kämpfte der
  // Bot in der Grundform). Zielform wie im Autopilot (Lernrouten-Regel bzw. Quest-Digitation), sonst die höchste Form.
  function digibotEventEvolve(st, sc, now) {
    if (sc?.attackers?.length) return true;
    const p = st?.me?.partner; if (!p || p.evolving) return true;
    if (cfg.autopilot && !cfg.farm && !cfg.dungeon) return autopilotEvolution(st, now);
    return ensureEvolution(st, cfg.apEvo || EVO_MAX, now);
  }

  // IDs belong to one account. A missing saved partner means keep this account's active partner.
  function digibotConfiguredPartner(st,key) {
    const id=cfg[key];return id&&teamOf(st).some(p=>p.partnerId===id)?id:'';
  }

  function digibotEvolutionContext(st) {
    const key=activePartner(st)?.partnerId||st?.me?.partner?.entityId;
    if(key && autopilot.evoPartner!==key){
      autopilot.evoPartner=key;autopilot.evoGiveUp=null;autopilot.evoTries=0;autopilot.evoFrom=null;autopilot.evoNote=null;
    }
  }
  function digibotQuestPartner(st) {
    const explicit=digibotConfiguredPartner(st,'apQuestPartner');
    const user=String(st?.session?.username||'').trim().toLowerCase();
    if(autopilot.questHomeUser!==user){autopilot.questHome=null;autopilot.questHomeUser=user;}
    if(explicit){autopilot.questHome=explicit;return explicit;}
    if(autopilot.questHome && teamOf(st).some(p=>p.partnerId===autopilot.questHome))return autopilot.questHome;
    // Capture before a temporary turn-in switch, not after it.
    autopilot.questHome=activePartner(st)?.partnerId||null;
    return autopilot.questHome||'';
  }
  function digibotTurninPartner(st) {
    const home=digibotQuestPartner(st);
    autopilot.turninPartnerHeld=true;
    return digibotConfiguredPartner(st,'apTurninPartner')||home;
  }
  function digibotAutopilotEvolveTick(st,now) {
    if(!cfg.autopilot||cfg.farm||cfg.dungeon||group.role()==='follower')return true;
    digibotEvolutionContext(st);
    const home=digibotQuestPartner(st),task=autopilot.task;
    // A completed turn-in task must not keep the reward partner active during combat.
    const eventUp=cfg.hunt && (hunt.goal?.up || huntGoal(now)?.up);
    if(!eventUp){
      if(task?.purpose==='turnin' && (!task.questId || st.me?.quests?.[task.questId]?.state===2))return true;
      // Complete the hand-in sequence before restoring/evolving the quest partner.
      // The current task can already be done (or reset) while the planner has yet to select the next reward.
      if((autopilot.turninPartnerHeld || task?.purpose==='turnin') && (!task || task.purpose==='turnin')){
        if(world.state!=='ready')return true;
        const next=autopilot.mapTalk
          ?questTasks(st).find(t=>t.kind==='talk' && ['turnin','accept','objective'].includes(t.purpose) && t.loc?.mapId===autopilot.mapTalk.mapId)
          :questTasks(st)[0];
        if(next?.purpose==='turnin')return true;
      }
      autopilot.turninPartnerHeld=false;
    }

    const sw=ensurePartner(st,home,now);
    if(sw!==true)return sw;
    if(home&&activePartner(st)?.partnerId!==home)return true;
    return autopilotEvolution(st,now);
  }
  // ---------- Map-für-Map-Runde ----------
  // Alle normalen Maps (keine Raids/Sandbox), absteigend nach Level – von „Dream Ruins“ bis „Native Forest“ –
  // oder aufsteigend (Richtung „von unten nach oben“).
  function sweepList() {
    // wie das Digi-Phone: zuerst nach Serie (Feld series, fehlt = Adventure), dann nach Level – sonst landet z. B.
    // Spiral Mountain (Adventure, Lv 53–56) mitten zwischen den Adventure-02-Maps
    const list = Object.values(content()?.maps || {})
      .filter((m) => world.maps[m.id] && !isRaidMap(m.id) && !/^sandbox/.test(m.id))
      .sort((a, b) => (b.series ?? 1) - (a.series ?? 1) || (b.levelRange?.[0] ?? 0) - (a.levelRange?.[0] ?? 0) || (b.levelRange?.[1] ?? 0) - (a.levelRange?.[1] ?? 0)
        || a.name.localeCompare(b.name));
    return cfg.apSweepDir === 'up' ? list.reverse() : list;
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
  function digibotDailyOwned(st,id){
    if([1,2].includes(st?.me?.quests?.[id]?.state))return true;
    return !id.includes('#') && Object.entries(st?.me?.quests||{}).some(([key,q])=>[1,2].includes(q.state)&&questDef(content(),key)?.id===id);
  }
  function digibotDailyOffers(st,pool=null){
    const pending=Array.isArray(st?.dailies?.pending)?st.dailies.pending:Array.isArray(st?.dailies?.board)?st.dailies.board:null;
    if(!pending)return null;
    const C=content();
    return [...new Set(pending.filter(id=>typeof id==='string'))].filter(id=>{
      const def=questDef(C,id);
      return !!def && (!pool||def.pool===pool) && !autopilot.dailyAccepted.has(id) && !digibotDailyOwned(st,id);
    });
  }
  function digibotDailiesSnapshot(){
    const st=getStore()?.getState?.(),pending=Array.isArray(st?.dailies?.pending)?st.dailies.pending.filter(id=>typeof id==='string').slice(0,30):[];
    return {enabled:!!cfg.apDailies,boardNpc:typeof st?.dailies?.board==='string'?st.dailies.board:null,pending,
      pendingStates:Object.fromEntries(pending.map(id=>[id,st?.me?.quests?.[id]?.state??0])),
      attempts:[...(autopilot.dailyAttempts||[])].slice(-30).map(([id,a])=>({id,tries:a.tries,at:a.at})),confirmedCount:autopilot.dailyAccepted.size};
  }
  function acceptFromBoard(st,t,now){
    if(!t.remote && !st.dailies?.board && !st.windows?.dailies)return null;
    const C=content(),attempts=autopilot.dailyAttempts||=new Map();
    for(const [id,attempt]of attempts){
      const current=st.me?.quests?.[id]?.state;
      if(![1,2].includes(current) && !(current===3 && attempt.stateBefore!==3))continue;
      if(!autopilot.dailyAccepted.has(id)){autopilot.dailyAccepted.add(id);logEvent('auto',`Daily-Annahme bestätigt: ${questDef(C,id)?.name||id}`);}
      attempts.delete(id);
    }
    const offered=digibotDailyOffers(st)||[];
    // An offer may disappear without a matching quest update. Expire that pending
    // request instead of returning the finished-board status forever on every tick.
    const failed=[...attempts].filter(([id,a])=>!offered.includes(id)&&now-a.at>=2500).map(([id])=>id);
    for(const id of offered){
      const attempt=attempts.get(id);
      if(attempt && now-attempt.at<2500)return 'Daily-Annahme angefordert – warte auf Bestätigung…';
      if(attempt?.tries>=3){failed.push(id);continue;}
      if(now-autopilot.dailyAt<900)return `Nehme Dailies an (${offered.length} offen)…`;
      if(typeof commands()?.acceptDaily!=='function')return 'Daily-Annahme: Spielbefehl noch nicht verfügbar';
      autopilot.dailyAt=now;attempts.set(id,{at:now,tries:(attempt?.tries||0)+1,stateBefore:attempt?.stateBefore??st.me?.quests?.[id]?.state??0});
      commands().acceptDaily(id);
      logEvent('auto',`Daily-Annahme angefordert: ${questDef(C,id)?.name||id}`);
      return `Nehme Dailies an (${offered.length} offen)…`;
    }
    // pending can update before the owned quest list. Never report that as a confirmed acceptance.
    const awaiting=[...attempts].some(([id,a])=>now-a.at<2500 && ![1,2].includes(st.me?.quests?.[id]?.state));
    if(awaiting)return 'Daily-Board aktualisiert – warte auf Questzustand…';
    commands()?.closeDailyBoard?.();
    if(failed.length){
      for(const id of failed)attempts.delete(id);
      autopilot.failed.set(t.key||`daily:${t.visitKey}`,now+TASK_BAN_MS);if(!t.remote)autopilot.reset();
      logEvent('warn',`${failed.length} Daily-Annahme(n) unbestätigt – später erneut prüfen`);
      return 'Daily-Annahme unbestätigt – Aufgabe vorübergehend pausiert';
    }
    autopilot.dailyVisited.add(t.visitKey);
    return 'Daily-Board: keine weiteren angebotenen Quests';
  }

  function digibotDailyStep(st,now){
    if(!cfg.autopilot || !cfg.apDailies || cfg.farm || cfg.dungeon || autopilot.mapTalk || world.state!=='ready')return null;
    const key='daily:remote';
    if((autopilot.failed.get(key)||0)>now)return null;
    const offered=digibotDailyOffers(st);
    if(!offered?.length && !autopilot.dailyAttempts.size)return null;
    bot.questIdle=false;
    return acceptFromBoard(st,{key,visitKey:'remote',remote:true},now);
  }

  function digibotDailyAvailable(st,id,quests=st?.me?.quests||{}){
    const C=content(),def=C?.dailyById?.[id];
    const matches=Object.entries(quests).filter(([key])=>key===id || (def&&questDef(C,key)?.id===id)).map(([,q])=>q);
    if(matches.some(q=>q.state===1||q.state===2))return false;
    const completed=matches.filter(q=>q.state===3);
    if(completed.length)return !!cfg.apRepeat && completed.every(q=>repeatAvailable(def||{id},q));
    return true;
  }
  // Alle Aufgaben, die der Autopilot gerade erledigen könnte – sortiert nach Weg (Map-Wechsel) und Priorität.
  // Manche NPCs (z. B. Leomon) stehen je nach Quest-Stand woanders. Die Spieldaten nennen dafür „stations“:
  // { mapId, point (Spawn-Punkt der Map), when: { quest, state: available|active|ready|done } }. Die erste passende
  // Station gilt; passt keine, steht der NPC an seinem normalen Platz (null).
  const QSTATE = ['available', 'active', 'ready', 'done'];
  function npcStation(npcId, quests) {
    const C = content(), stations = C?.npcs?.[npcId]?.stations;
    if (!stations?.length) return null;
    for (const sta of stations) {
      const qid = sta.when?.quest;
      if (!qid) continue;
      const q = quests?.[qid], name = QSTATE[q?.state ?? 0] || 'available';
      if (!new Set([].concat(sta.when.state || [])).has(name)) continue;
      if (name === 'available' && (questDef(C, qid)?.prereq || []).some((p) => quests?.[p]?.state !== 3)) continue; // noch gar nicht verfügbar
      const p = world.maps[sta.mapId]?.spawns?.[sta.point];
      if (p) return { mapId: sta.mapId, x: p.x, y: p.y, station: sta.point };
    }
    return null;
  }

  function questTasks(st) {
    const C = content(), me = st?.me, mapId = st?.world?.mapId;
    if (!C || !me || world.state !== 'ready') return [];
    const ix = questIndex(C), lvl = me.partner?.level ?? 1, quests = autopilot.mapTalk ? (me.quests || {}) : planQuests(st);
    const npcName = (id) => C.npcs?.[id]?.name || id;
    // Manche NPCs gibt es mit derselben ID auf mehreren Maps (z. B. Gennai's Hologram), und jeder bietet nur die Quests
    // seiner Map an. Steht in der Quest die Map (giverMap/turnInMap), gilt der NPC dort – die Story-Station nur, wenn
    // sie auf dieser Map liegt.
    const npcLoc = (npcId, prefMap) => {
      const sta = npcStation(npcId, me.quests || {});
      if (sta && (!prefMap || sta.mapId === prefMap)) return sta;
      const locs = world.npcAt.get(npcId) || [];
      const onPref = prefMap && locs.find((l) => l.mapId === prefMap);
      if (onPref) return onPref;
      return sta || [...locs].sort((a, b) => hops(mapId, a.mapId) - hops(mapId, b.mapId))[0] || null;
    };
    let tasks = [];
    // „nur erledigen, nicht abgeben“: fertige Quests bleiben stehen – nur der Knopf „Abgeben & Annehmen“ gibt ab
    const noTurnin = cfg.apNoTurnin && !autopilot.mapTalk;
    for (const [id, q] of Object.entries(quests)) {
      if (cfg.questOff[id]) continue;
      const def = questDef(C, id);
      if (!def) continue;
      if (q.state === 2 && noTurnin) continue;
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
          const bountyMap=digibotIsYoungBounty(def)&&def.id!=='a2b_blackwargreymon'?digibotYoungBountyMap(st):null;
          const source=bountyMap?{...C,spawns:C.spawns?.[bountyMap]?{[bountyMap]:C.spawns[bountyMap]}:{}}:C;
          const spot = huntSpot(source, [].concat(o.species || []), lvl, mapId, o.kind === 'collect' ? o.itemId : null, activeAvoid());
          if (spot && !activeAvoid().has(spot.key)) tasks.push({ ...base, key: `hunt:${id}:${i}`, kind: 'hunt', species: new Set(spot.species), names: spot.names, loc: spot, prio: 3,
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
    // Daily offers are accepted remotely by digibotDailyStep; no NPC journey is required.
    if (grindTo < Infinity && cfg.apGrind && cfg.apOrder !== 'sweep') {
      const spot = grindSpot(C, lvl, mapId, activeAvoid());
      if (spot) tasks.push({ key: `grind:${grindTo}`, kind: 'hunt', grind: true, targetLevel: grindTo, species: new Set(spot.species),
        names: spot.names, loc: spot, prio: 50, label: `Grinde bis Lv ${grindTo} (${spot.names})` });
    }
    const now = Date.now();
    tasks=tasks.filter(t=>digibotYoungBountyAllowed(st,t,now));
    if(autopilot.bountyReturn)tasks=tasks.filter(t=>digibotIsYoungBounty(t.def)&&t.purpose==='turnin');
    // Board dailies stay active and collect incidental progress, but must not
    // trigger travel or postpone ordinary quest rewards while other work is feasible.
    if(!autopilot.mapTalk && tasks.some(t=>!t.def?.pool && (autopilot.failed.get(t.key)||0)<now && hops(mapId,t.loc.mapId)<Infinity)){
      tasks=tasks.filter(t=>!t.def?.pool);
    }
    // Runde: nur Quests, deren Geber auf der aktuellen Runden-Map steht (Ziele dürfen woanders liegen)
    const M = cfg.apOrder === 'sweep' && !serveOn() ? autopilot.sweepAt : null;
    if (serveOn()) tasks = tasks.filter((t) => t.kind === 'hunt' && !t.grind); // nur jagen, was den Mitläufern fehlt
    // Gerade mit einem NPC gesprochen: was es bei ihm noch abzugeben/anzunehmen gibt, sofort erledigen –
    // nicht erst zum nächsten NPC und später wieder zurück
    const ln = autopilot.lastNpc;
    const sameNpc = (t) => !!ln && now - ln.at < SAME_NPC_MS && t.kind === 'talk' && (t.purpose === 'accept' || t.purpose === 'turnin')
      && t.npcId === ln.npcId && t.loc?.mapId === ln.mapId;
    let available=tasks
      .filter((t) => {
        if(digibotIsYoungBounty(t.def)&&(t.kind==='hunt'||t.purpose==='turnin'))return true; // already checked against the route
        if(cfg.apBatch && !t.grind && taskPhase(t)===2)return true;
        if(cfg.apBatch && autopilot.batchPhase==='turnin' && t.purpose==='turnin')return true;
        if(!M)return true;if(t.grind)return false;
        return t.purpose==='daily'?t.loc.mapId===M:questOnMap(t.def,M);
      })
      .filter((t) => (autopilot.failed.get(t.key) || 0) < now && hops(mapId, t.loc.mapId) < Infinity);
    // Cache ETA once per planning pass; all boss objectives use confirmed timers,
    // independent of quest-log order or how far away the NPC list places them.
    available=available.map(t=>({...t,bossEta:digibotQuestBossETA(st,t,now),bossIdle:digibotQuestBossIdle(st,t,now)}));
    // Boss-Quests zuerst – außer der Boss braucht nach der Anreise noch lange bis zum Respawn: dann erst die anderen Ziele
    // (Grinden endet nie von selbst – es verdrängt keinen Boss)
    const bossRank=(t)=>!t.loc?.boss?(t.grind?3:1):t.bossIdle>BOSS_IDLE_DEFER_MS?2:0;
    // A nearby reward NPC never outranks another feasible objective, including on another map.
    // (nicht mitten in der Abgabe-Phase: begonnene Abgaben werden alle erledigt, auch wenn eine neue Quest schon offen ist)
    // Map-für-Map-Runde (3.0.3): abgegeben wird pro Map – nur offene Ziele von Quests DIESER Map halten die Abgaben auf;
    // Reste anderer Maps (z. B. Bounties, liegengebliebene Quests) kommen erst nach den Abgaben hier (Phase 4)
    const localDo=(t)=>!t.grind&&taskPhase(t)===2&&(!M||digibotQuestOfMap(t,M));
    if(cfg.apBatch && autopilot.batchPhase!=='turnin' && available.some(localDo))available=available.filter(t=>t.purpose!=='turnin');
    return available
      .map((t) => { const same=sameNpc(t);return {...t,sameNpc:same,cost:hops(mapId,t.loc.mapId)*10+t.prio,
        // Gespräche beim selben NPC zuerst (Abgeben/Annehmen in einem Besuch), auch im Batch-Modus
        phase:same?-1:M && !(cfg.apBatch && autopilot.batchPhase==='turnin')?(taskPhase(t)===2&&!t.grind&&!digibotQuestOfMap(t,M)?4:taskPhase(t)):cfg.apBatch?batchRank(t,mapId):0}; })
      .sort((a,b)=>a.phase-b.phase || Number(b.sameNpc)-Number(a.sameNpc) || bossRank(a)-bossRank(b) || (a.loc?.boss&&b.loc?.boss&&a.bossEta!==b.bossEta?a.bossEta-b.bossEta:0) || a.cost-b.cost);

  }
  // Gehört die Aufgabe zu einer Quest der Runden-Map M? (Geber steht dort)
  const digibotQuestOfMap = (t, M) => !!t.def && questOnMap(t.def, M);
  // Phasen der Map-für-Map-Runde: 1 = Quests annehmen, 2 = Ziele erledigen, 3 = abgeben, 4 = Reste anderer Maps.
  // So wird pro Map erst alles angenommen, dann alles erledigt und ganz zum Schluss abgegeben –
  // Digimon-Wechsel und Zurück-Digitation passieren nur einmal, beim Übergang zum Abgeben.
  const taskPhase = (t) => (t.purpose === 'accept' || t.purpose === 'daily' ? 1 : t.purpose === 'turnin' ? 3 : 2);
  const PHASE_NAMES = { 1: 'Quests annehmen', 2: 'Ziele erledigen', 3: 'Quests abgeben' };
  // „Erst alle Quests erledigen, dann gemeinsam abgeben“: Reihenfolge Ziele -> Abgaben -> Annahmen. Hat das Annehmen
  // begonnen, werden erst alle Quests auf dieser Map angenommen (sonst ginge es nach der ersten Annahme gleich jagen).
  // Annahmen auf anderen Maps kommen erst, wenn hier nichts mehr zu tun ist – sonst reist der Bot quer durch die Welt.
  const SAME_NPC_MS = 60000;
  function batchRank(t, mapId) {
    if (t.grind) return 9;
    const p = taskPhase(t);
    if (p === 1 && t.loc?.mapId !== mapId) return 3;
    // Phase bleibt, bis es darin nichts mehr gibt: erledigen -> abgeben -> annehmen -> erledigen …
    // nach dem Abgeben gleich annehmen (dann erst wieder erledigen) – sonst nahm der Bot pro NPC-Besuch nur eine Quest an
    return ({ accept: { 1: 0, 2: 1, 3: 2 }, turnin: { 3: 0, 1: 1, 2: 2 } }[autopilot.batchPhase] || { 2: 0, 3: 1, 1: 2 })[p];
  }

  function digibotQuestBossETA(st,t,now){
    if(t.kind!=='hunt'||!t.loc?.boss)return Infinity;
    let best=Infinity;
    for(const b of questBossSel(t))for(const ch of (cfg.farmChannels?.length?cfg.farmChannels:[1,2])){
      if((farm.chBan.get(`${b.map}#${ch}`)||0)>now)continue;
      const state=farmState(b,ch,now),trip=lrBossTripMs(st,b,ch);
      const eta=state.state==='up'?trip:state.state==='down'?Math.max(0,state.readyAt-now,trip):Infinity;
      best=Math.min(best,eta);
    }
    return best;
  }
  // Wartezeit am Boss nach der Anreise (bester Kanal): lebt = 0, tot = Rest-Respawn minus Reisezeit, unbekannt = 0 (nachsehen)
  const BOSS_IDLE_DEFER_MS = 90000;
  function digibotQuestBossIdle(st,t,now){
    if(t.kind!=='hunt'||!t.loc?.boss)return 0;
    let best=Infinity;
    for(const b of questBossSel(t))for(const ch of (cfg.farmChannels?.length?cfg.farmChannels:[1,2])){
      if((farm.chBan.get(`${b.map}#${ch}`)||0)>now)continue;
      const state=farmState(b,ch,now);
      best=Math.min(best,state.state==='down'?Math.max(0,state.readyAt-now-lrBossTripMs(st,b,ch)):0);
    }
    return best===Infinity?0:best;
  }
  function digibotQuestBossReplan(st,sc,now){
    const t=autopilot.task;
    if(!t?.loc?.boss||t.kind!=='hunt'||group.role()==='follower'||autopilot.mapTalk)return;
    if(!digibotYoungBountyAllowed(st,t,now)){autopilot.reset();autopilot.route=null;autopilot.tp=null;return;}
    if(sc?.mobs?.some(m=>t.species.has(m.species)&&!m.banned))return; // finish the living boss
    if(now-(autopilot.bossRankAt||0)<5000)return;
    autopilot.bossRankAt=now;
    const tasks=questTasks(st),first=tasks[0];
    if(first && first.key!==t.key && !first.loc?.boss && !first.grind && digibotQuestBossIdle(st,t,now)>BOSS_IDLE_DEFER_MS){
      logEvent('auto',`${t.names}: Respawn dauert noch – erst ${first.label||first.names||'andere Ziele'}`);
      autopilot.reset();autopilot.route=null;autopilot.tp=null;return;
    }
    const best=tasks.find(o=>o.kind==='hunt'&&o.loc?.boss);
    if(best && best.key!==t.key && best.bossEta+15000<digibotQuestBossETA(st,t,now)){
      logEvent('auto',`Boss-Reihenfolge: ${best.names} ist früher verfügbar – plane Questziel neu`);
      autopilot.reset();autopilot.route=null;autopilot.tp=null;
    }
  }

  function digibotIsYoungBounty(def){
    return ['a2b_blackwargreymon','a2b_daemon','a2b_ladydevimon','a2b_marinedevimon','a2b_skullsatamon'].includes(def?.id);
  }
  function digibotYoungBountyMap(st){
    if(cfg.apOrder!=='sweep'||autopilot.mapTalk||autopilot.bountyReturn||serveOn())return null;
    return autopilot.sweepAt||cfg.apSweepMap||sweepMap(st);
  }
  function digibotBlackBountyAvailable(st,now){
    let alive=false;
    window.dmo?.net?.state?.entities?.forEach?.(e=>{if(e.kind===KIND.Mob&&e.defId==='blackwargreymon'&&e.hp>0&&!(e.flags&(FLAG.Dead|FLAG.Hidden|FLAG.Untargetable)))alive=true;});
    if(alive)return true;
    return farmBossList().some(b=>b.species==='blackwargreymon'&&[1,2].some(ch=>farmState(b,ch,now).state==='up'));
  }
  function digibotYoungBountyAllowed(st,t,now=Date.now()){
    if(!digibotIsYoungBounty(t.def)||autopilot.mapTalk||t.mirror)return true;
    if(t.purpose==='accept')return true;
    if(t.kind==='hunt'&&t.def.id==='a2b_blackwargreymon')return digibotBlackBountyAvailable(st,now);
    const map=digibotYoungBountyMap(st);
    if(autopilot.bountyReturn)return t.purpose==='turnin';
    return !map||t.loc?.mapId===map;
  }
  function digibotYoungBountyFinalTasks(st){
    autopilot.bountyReturn=true;autopilot.sweepAt=null;
    return questTasks(st);
  }

  function taskDone(st, t) {
    if (t.grind) return (st?.me?.partner?.level ?? 0) >= t.targetLevel;
    if(t.purpose==='daily'){
      if(st.dailies?.board)return autopilot.dailyVisited.has(t.visitKey);
      const pool=content()?.dailies?.[t.def?.pool],offered=digibotDailyOffers(st,t.def?.pool);
      return autopilot.dailyVisited.has(t.visitKey) || (offered!==null ? !offered.length : !!pool && !(pool.quests||[]).some(d=>digibotDailyAvailable(st,d.id)));
    }
    const q = planQuests(st)[t.questId];
    if (t.purpose === 'turnin') return q?.state !== 2;
    if (t.purpose === 'accept') return q?.state === 1 || q?.state === 2;
    return !q || q.state !== 1 || (q.counters?.[t.objIndex] ?? 0) >= t.need;
  }

  // Prefer one native movement order. Portals, hazards or a stalled native
  // route require short segments checked against the current collision grid.
  const digibotNavigationTrail=[];
  function digibotNavigationContext(st){
    const task=autopilot.task,user=String(st?.session?.username||''),map=st?.world?.mapId,now=Date.now();
    if(!cfg.autopilot||cfg.farm||cfg.dungeon||group.role()==='follower'||hunt.goal||wb.goal||!task?.key||!map){digibotNavigationTrail.length=0;return;}
    const last=digibotNavigationTrail.at(-1);
    if(last && (last.user!==user||last.key!==task.key||last.goal!==task.loc?.mapId))digibotNavigationTrail.length=0;
    if(digibotNavigationTrail.at(-1)?.map===map)return;
    digibotNavigationTrail.push({user,key:task.key,goal:task.loc?.mapId,map,at:now});
    if(digibotNavigationTrail.length>8)digibotNavigationTrail.shift();
    const tail=digibotNavigationTrail.slice(-4);
    if(tail.length===4 && now-tail[0].at<90000 && tail[0].map===tail[2].map && tail[1].map===tail[3].map && tail[0].map!==tail[1].map){
      autopilot.failed.set(task.key,now+TASK_BAN_MS);autopilot.reset();
      logEvent('warn','Portal-Pendeln erkannt – unterbreche diese Aufgabe und plane neu');
      digibotNavigationTrail.length=0;
    }
  }
  function digibotNavigationSnapshot(){const t=autopilot.task,n=autopilot.nav;return {movement:n?{target:{x:n.tx,y:n.ty},waypoint:n.wp,nextWaypoint:n.nextWp,native:!!n.native,waitingForHazard:!!n.hazardWaitKey,fallback:!!n.fallback,nearestSafe:!!n.nearestSafe,idleMs:Math.max(0,Date.now()-n.progressAt),clicks:n.tries}:null,task:t?{key:t.key,kind:t.kind,purpose:t.purpose,questId:t.questId,npcId:t.npcId,mapId:t.loc?.mapId,x:t.loc?.x,y:t.loc?.y}:null,
    transitions:digibotNavigationTrail.map(({map,at,key,goal})=>({map,at,key,goal}))};}
  function digibotPortalRects(st){
    const scene=worldScene(),raw=world.maps[st?.world?.mapId]?.portals||scene?.map?.portals||[];
    return raw.map(p=>({...p,x:p.rect?.x??p.x,y:p.rect?.y??p.y,w:p.rect?.w??p.w,h:p.rect?.h??p.h})).filter(p=>[p.x,p.y,p.w,p.h].every(Number.isFinite)&&p.w>0&&p.h>0);
  }
  function digibotPortalKey(p){return p?`${p.toMap||''}/${p.x}/${p.y}/${p.w}/${p.h}`:'';}
  const PORTAL_CLEAR = 8; // Wegabstand der Laufprüfung (5 px + 2) plus 1 px Reserve
  function digibotPortalGrid(st,allowed=null){
    const grid=worldScene()?.map?.grid;if(!grid?.blocked)return grid;
    const portals=digibotPortalRects(st),permit=digibotPortalKey(allowed);
    if(!portals.length)return grid;
    const blocked=Uint8Array.from(grid.blocked),tile=grid.tile||16,pad=12;
    const me=controlled(st);
    for(const p of portals){
      if(permit && digibotPortalKey(p)===permit)continue;
      // Carve only a short outward corridor when arriving inside a trigger or its safety border.
      // Gesperrt werden ganze Kacheln (Portal + Rand, aufgerundet); der Ausweg gilt für genau diesen Bereich plus den
      // Wegabstand der Laufprüfung – sonst saß fest, wer 12–23 px neben einem Portal ankam (kein Ausweg, kein freier Schritt)
      const bx0=Math.floor((p.x-pad)/tile)*tile,bx1=(Math.floor((p.x+p.w+pad)/tile)+1)*tile,by0=Math.floor((p.y-pad)/tile)*tile,by1=(Math.floor((p.y+p.h+pad)/tile)+1)*tile,clr=PORTAL_CLEAR;
      const near=me&&me.x>=bx0-clr&&me.x<=bx1+clr&&me.y>=by0-clr&&me.y<=by1+clr;
      const exits=near?[{x:bx0-clr-tile/2,y:me.y},{x:bx1+clr+tile/2,y:me.y},{x:me.x,y:by0-clr-tile/2},{x:me.x,y:by1+clr+tile/2}].filter(q=>q.x>=0&&q.y>=0&&q.x<grid.w*tile&&q.y<grid.h*tile&&grid.blocked[Math.floor(q.y/tile)*grid.w+Math.floor(q.x/tile)]!==1):[];
      const escape=exits.sort((a,b)=>Math.hypot(a.x-me.x,a.y-me.y)-Math.hypot(b.x-me.x,b.y-me.y))[0];
      for(let y=Math.max(0,Math.floor((p.y-pad)/tile));y<=Math.min(grid.h-1,Math.floor((p.y+p.h+pad)/tile));y++)for(let x=Math.max(0,Math.floor((p.x-pad)/tile));x<=Math.min(grid.w-1,Math.floor((p.x+p.w+pad)/tile));x++){
        if(escape){const dx=escape.x-me.x,dy=escape.y-me.y,len=dx*dx+dy*dy||1,cx=(x+.5)*tile,cy=(y+.5)*tile,k=Math.max(0,Math.min(1,((cx-me.x)*dx+(cy-me.y)*dy)/len));const ownCell=x===Math.floor(me.x/tile)&&y===Math.floor(me.y/tile),outward=(cx-me.x)*dx+(cy-me.y)*dy>=0;if((ownCell||outward)&&Math.hypot(cx-me.x-dx*k,cy-me.y-dy*k)<tile*1.25)continue;
          // Felder, die der Wegabstand des ersten Schritts berührt, ebenfalls frei (sonst scheiterte schon der Start)
          if(Math.abs(cx-me.x)<=tile/2+clr&&Math.abs(cy-me.y)<=tile/2+clr)continue;}
        blocked[y*grid.w+x]=1;
      }
    }
    return {...grid,blocked};
  }
  function digibotNavigationZones(){return cfg.dodge?dangerZones():[];}
  function digibotNavigationZoneKey(zones){
    return zones.map(z=>[z.kind,z.x,z.y,z.r,z.tx,z.ty,z.len,z.dir,z.half,z.innerRadius,(z.holes||[]).map(h=>`${h.x},${h.y},${h.r}`).join(';')].join(',')).sort().join('|');
  }
  function digibotNavigationGrid(st,allowed,zones){
    const grid=digibotPortalGrid(st,allowed);
    if(!grid?.blocked||!zones.length)return grid;
    const blocked=Uint8Array.from(grid.blocked),tile=grid.tile||16;
    for(let y=0;y<grid.h;y++)for(let x=0;x<grid.w;x++){
      const i=y*grid.w+x;if(blocked[i]===1)continue;
      const p={x:(x+.5)*tile,y:(y+.5)*tile};
      if(zones.some(z=>!digibotDodgeZoneSafe(z,p)))blocked[i]=1;
    }
    // A safe current position can share a cell with a hazard boundary. Only
    // reopen that cell; segment checks still forbid crossing the actual danger.
    const me=controlled(st);
    if(me&&zones.every(z=>digibotDodgeZoneSafe(z,me))){
      const x=Math.floor(me.x/tile),y=Math.floor(me.y/tile);
      if(x>=0&&y>=0&&x<grid.w&&y<grid.h&&grid.blocked[y*grid.w+x]!==1)blocked[y*grid.w+x]=0;
    }
    return {...grid,blocked};
  }
  function digibotNavigationSegment(a,b,grid,zones){
    const actual=worldScene()?.map?.grid;
    return digibotDodgeGridClear(a,b,grid,5,true)&&(!actual?.blocked||actual.blocked===grid.blocked||digibotDodgeGridClear(a,b,actual,5,true))&&digibotDodgeZonePath(a,b,zones);
  }
  function gridRoute(fromX,fromY,toX,toY,grid=null,nearest=false) {
    const g=grid||worldScene()?.map?.grid;
    if(!g?.blocked||!g.w||!g.h)return null;
    const T=g.tile||16,W=g.w,H=g.h;
    const free=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&g.blocked[y*W+x]!==1;
    const nearFree=(x,y)=>{
      if(free(x,y))return [x,y];
      for(let r=1;r<=6;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(free(x+dx,y+dy))return [x+dx,y+dy];
      return null;
    };
    const gx=Math.floor(toX/T),gy=Math.floor(toY/T),blockedGoal=!free(gx,gy);
    const searchNearest=nearest||blockedGoal;
    const a=nearFree(Math.floor(fromX/T),Math.floor(fromY/T)),b=searchNearest?null:[gx,gy];
    if(!a)return null;
    const start=a[1]*W+a[0],goal=b?b[1]*W+b[0]:-1;
    const prev=new Int32Array(W*H).fill(-1),q=new Int32Array(W*H);
    prev[start]=start;q[0]=start;
    let head=0,tail=1,best=start,bestD=Infinity;
    while(head<tail){
      const c=q[head++],cx=c%W,cy=Math.floor(c/W);
      if(searchNearest){const d=((cx+.5)*T-toX)**2+((cy+.5)*T-toY)**2;if(d<bestD){bestD=d;best=c;}}
      else if(c===goal)break;
      for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
        const x=cx+dx,y=cy+dy;if(!free(x,y))continue;
        const n=y*W+x;if(prev[n]!==-1)continue;prev[n]=c;q[tail++]=n;
      }
    }
    const end=searchNearest?best:goal;if(prev[end]===-1||blockedGoal&&!nearest&&bestD>(6*T)**2)return null;
    const path=[];for(let c=end;c!==start;c=prev[c])path.push({x:(c%W+.5)*T,y:(Math.floor(c/W)+.5)*T});
    return path.reverse();
  }
  function digibotSamePoint(a,b){return !!a&&!!b&&Math.hypot(a.x-b.x,a.y-b.y)<1;}
  function digibotRouteCorners(path){
    const out=[];
    for(let i=0;i<path.length;i++){
      const a=path[i-1],b=path[i],c=path[i+1];
      if(!a||!c||(b.x-a.x)*(c.y-b.y)!==(b.y-a.y)*(c.x-b.x))out.push({point:b,index:i});
    }
    return out;
  }
  function digibotRouteLeg(r,from,after=-1,companion=null){
    const candidates=[...r.corners,{point:r.destination,index:r.path?.length||0}];
    for(let i=candidates.length-1;i>=0;i--){
      const leg=candidates[i];
      if(leg.index<=after||digibotSamePoint(from,leg.point))continue;
      if(digibotNavigationSegment(from,leg.point,r.grid,r.zones)&&(!companion||digibotNavigationSegment(companion,leg.point,r.grid,r.zones)))return leg;
    }
    // An off-center starting position may need the first raster step before
    // any corner is visible. This is a verified segment, never a random click.
    let step=null;
    for(let i=after+1;i<(r.path?.length||0);i++){
      const point=r.path[i];
      if(digibotSamePoint(from,point))continue;
      if(digibotNavigationSegment(from,point,r.grid,r.zones)&&(!companion||digibotNavigationSegment(companion,point,r.grid,r.zones)))step={point,index:i};
      else break;
    }
    return step;
  }
  function digibotRoutePlan(r,me,options){
    const current=digibotRouteLeg(r,me,-1,options.companion);
    if(!current){
      if(Math.hypot(me.x-r.destination.x,me.y-r.destination.y)<12&&digibotNavigationSegment(me,r.destination,r.grid,r.zones))return {current:{point:r.destination,index:r.path?.length||0},next:null};
      return null;
    }
    const next=digibotRouteLeg(r,current.point,current.index);
    return {current,next,blockedAhead:!next&&Math.hypot(current.point.x-r.destination.x,current.point.y-r.destination.y)>=12};
  }
  function digibotRouteDestination(r,x,y,nearest){
    const grid=r.grid,tile=grid.tile||16,gx=Math.floor(x/tile),gy=Math.floor(y/tile);
    const free=gx>=0&&gy>=0&&gx<grid.w&&gy<grid.h&&grid.blocked[gy*grid.w+gx]!==1;
    return !nearest&&free?{x,y}:r.path?.at(-1)||r.start;
  }
  function waypoint(me,x,y,now,st,allowedPortal=null,options={}){
    const zones=options.zones||digibotNavigationZones(),zoneKey=digibotNavigationZoneKey(zones);
    const base=worldScene()?.map?.grid,key=`${st?.world?.mapId||''}/${st?.world?.channel??1}/${digibotPortalKey(allowedPortal)}/${!!options.nearestSafe}`;
    const native=!digibotPortalRects(st).length&&!zones.length&&!options.fallback;
    let r=autopilot.route;
    const compatible=r&&r.key===key&&r.blocked===base?.blocked&&Math.hypot(r.tx-x,r.ty-y)<=24;
    const upcomingBlocked=compatible&&!r.native&&r.plan?.next&&!digibotNavigationSegment(r.plan.current.point,r.plan.next.point,r.grid,zones);
    const retryAhead=compatible&&r.plan?.blockedAhead&&now-r.at>=1000;
    if(!compatible||r.zoneKey!==zoneKey||r.native!==native||upcomingBlocked||retryAhead){
      const old=compatible?r:null,grid=digibotNavigationGrid(st,allowedPortal,zones);
      r={key,tx:x,ty:y,at:now,start:{x:me.x,y:me.y},blocked:base?.blocked,zoneKey,grid,zones,native,nearest:!!options.nearestSafe,path:null,corners:[],plan:null};
      autopilot.route=r;
      if(!grid?.blocked){
        if(native)r.plan={current:{point:{x,y},index:0},next:null};
        return r.plan?.current.point||null;
      }
      // On a change confined to the upcoming segment, keep the current move
      // intact and rebuild the continuation from its endpoint, not from me.
      const oldCurrent=old&&!old.native&&!native&&old.plan?.current;
      const issued=oldCurrent&&digibotSamePoint(autopilot.nav?.wp,oldCurrent.point);
      const keep=issued&&digibotNavigationSegment(me,oldCurrent.point,grid,zones)&&(!options.companion||digibotNavigationSegment(options.companion,oldCurrent.point,grid,zones));
      if(keep){
        const oldNext=old.plan.next,tile=grid.tile||16,gx=Math.floor(x/tile),gy=Math.floor(y/tile);
        const exactGoalFree=gx>=0&&gy>=0&&gx<grid.w&&gy<grid.h&&grid.blocked[gy*grid.w+gx]!==1;
        const betterGoal=exactGoalFree&&Math.hypot(old.destination.x-x,old.destination.y-y)>=12;
        r.path=old.path;r.corners=old.corners;r.destination=old.destination;
        if(!betterGoal&&!old.plan.blockedAhead&&(!oldNext||digibotNavigationSegment(oldCurrent.point,oldNext.point,grid,zones))){
          r.plan=old.plan;
        }else{
          const continuation=gridRoute(oldCurrent.point.x,oldCurrent.point.y,x,y,grid,!!options.nearestSafe);
          r.path=continuation?[oldCurrent.point,...continuation]:null;
          r.corners=digibotRouteCorners(r.path||[]);r.destination=digibotRouteDestination(r,x,y,!!options.nearestSafe);
          const current={point:oldCurrent.point,index:0};
          r.plan={current,next:continuation?digibotRouteLeg(r,current.point,0):null,blockedAhead:!continuation};
        }
      }else{
        r.path=gridRoute(me.x,me.y,x,y,grid,!!options.nearestSafe);
        r.corners=digibotRouteCorners(r.path||[]);r.destination=digibotRouteDestination(r,x,y,!!options.nearestSafe);
        if(native&&r.path)r.plan={current:{point:r.destination,index:r.path.length},next:null};
        else if(r.path)r.plan=digibotRoutePlan(r,me,options);
        else if(digibotNavigationSegment(me,{x,y},grid,zones))r.plan={current:{point:{x,y},index:0},next:null};
      }
    }
    if(!r.plan)return null;
    if(!r.native&&!digibotNavigationSegment(me,r.plan.current.point,r.grid,zones))return null;
    if(options.companion&&!digibotNavigationSegment(options.companion,r.plan.current.point,r.grid,zones))return null;
    if(r.plan.blockedAhead&&Math.hypot(me.x-r.plan.current.point.x,me.y-r.plan.current.point.y)<12)return null;
    return r.plan.current.point;
  }
  function digibotNavigationHandoff(me,r,companion){
    const plan=r?.plan;if(!plan?.next||r.native)return false;
    const distance=Math.hypot(me.x-plan.current.point.x,me.y-plan.current.point.y);
    const lead=Math.max(24,Math.min(64,(Number(me.speed)||130)*.35));
    if(distance>lead||!digibotNavigationSegment(me,plan.next.point,r.grid,r.zones)||companion&&!digibotNavigationSegment(companion,plan.next.point,r.grid,r.zones))return false;
    // The new click may skip the old endpoint only when the whole shortcut is
    // clear. A tight stair or corner therefore keeps its necessary turn.
    plan.current=plan.next;
    plan.next=digibotRouteLeg(r,plan.current.point,plan.current.index);
    if(!plan.next&&Math.hypot(plan.current.point.x-r.destination.x,plan.current.point.y-r.destination.y)>=12){
      const point=plan.current.point,rest=gridRoute(point.x,point.y,r.tx,r.ty,r.grid,r.nearest);
      r.path=rest?[point,...rest]:null;r.corners=digibotRouteCorners(r.path||[]);
      r.destination=digibotRouteDestination(r,r.tx,r.ty,r.nearest);
      plan.current={point,index:0};plan.next=rest?digibotRouteLeg(r,point,0):null;
      plan.blockedAhead=!rest||!plan.next&&Math.hypot(point.x-r.destination.x,point.y-r.destination.y)>=12;
    }else plan.blockedAhead=false;
    return true;
  }

  // Nächstes freies Feld mit Platz drumherum, wenn der Tamer selbst an/auf einem blockierten Feld steht (sonst null)
  function digibotFreeStep(me){
    const g=worldScene()?.map?.grid;
    if(!g?.blocked||!me||digibotDodgeGridClear(me,me,g,5))return null;
    const T=g.tile||16,cx=Math.floor(me.x/T),cy=Math.floor(me.y/T);
    const ownBlocked=cx<0||cy<0||cx>=g.w||cy>=g.h||g.blocked[cy*g.w+cx]===1;
    let best=null,bd=Infinity;
    for(let r=0;r<=6&&!best;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
      if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
      const p={x:(cx+dx+.5)*T,y:(cy+dy+.5)*T},d=Math.hypot(p.x-me.x,p.y-me.y);
      if(d>=bd||!digibotDodgeGridClear(p,p,g,5)||!(ownBlocked||digibotDodgeGridClear(me,p,g,5,true)))continue;
      best=p;bd=d;
    }
    return best;
  }
  // Keep a successful native movement order intact. Guarded routes keep two
  // verified segments ready and hand off early only across a safe shortcut.
  const LONG_WALK = 260; // weiter als das: über die Wegfindung laufen (Spiegeln zum Leader) – fehlte in CDigi, Spiegeln brach ab
  function walkTo(st,x,y,now,options={}) {
    const me=controlled(st);if(!me)return Infinity;
    const d=Math.hypot(me.x-x,me.y-y),context=`${st.world?.mapId}|${st.world?.channel??1}|${worldScene()?.controlledId?.()||''}`;
    let nav=autopilot.nav;
    if(!nav||nav.context!==context||Math.hypot(nav.tx-x,nav.ty-y)>24||nav.nearestSafe!==!!options.nearestSafe){
      nav=autopilot.nav={context,tx:x,ty:y,nearestSafe:!!options.nearestSafe,progressAt:now,lastPos:{x:me.x,y:me.y},tries:0};
      autopilot.route=null;
    }
    if(nav.lastCall&&now-nav.lastCall>3000){nav.progressAt=now;nav.lastPos={x:me.x,y:me.y};}
    nav.lastCall=now;
    if(Math.hypot(me.x-nav.lastPos.x,me.y-nav.lastPos.y)>=4){nav.lastPos={x:me.x,y:me.y};nav.progressAt=now;}
    const arrived=nav.wp&&!autopilot.route?.plan?.next&&!autopilot.route?.plan?.blockedAhead&&Math.hypot(me.x-nav.wp.x,me.y-nav.wp.y)<12;
    if(!arrived&&now-nav.progressAt>NAV_STUCK_MS)return 'stuck';
    const idle=!arrived&&now-nav.progressAt>=WALK_RETRY_MS;
    if(idle&&now-(nav.replannedAt||0)>=WALK_RETRY_MS){nav.fallback=true;nav.replannedAt=now;autopilot.route=null;}
    const zones=options.zones||digibotNavigationZones(),zoneKey=digibotNavigationZoneKey(zones);
    if(nav.hazardWaitKey===zoneKey&&nav.held&&now-nav.waitCheckAt<1000){nav.progressAt=now;return d;}
    nav.hazardWaitKey=null;
    let wp=waypoint(me,x,y,now,st,options.portal,{...options,zones,fallback:nav.fallback});
    if(!wp){autopilot.route=null;wp=waypoint(me,x,y,now,st,options.portal,{...options,zones,fallback:nav.fallback});}
    if(!wp){
      if(nav.wp&&!nav.held){worldScene()?.tapGround?.(me.x,me.y);if(st.me?.partner?.entityId)commands()?.partnerStop?.();nav.held=true;}
      // A temporary warning may close the only corridor. Keep the quest and
      // hold safely instead of counting that as an unreachable map location.
      if(zones.length&&zones.every(z=>digibotDodgeZoneSafe(z,me))&&gridRoute(me.x,me.y,x,y,digibotPortalGrid(st,options.portal),!!options.nearestSafe)){
        if(!nav.held){worldScene()?.tapGround?.(me.x,me.y);if(st.me?.partner?.entityId)commands()?.partnerStop?.();}
        nav.held=true;nav.wp={x:me.x,y:me.y};nav.progressAt=now;nav.hazardWaitKey=zoneKey;nav.waitCheckAt=now;nav.nextWp=null;
        return d;
      }
      // Steht der Tamer selbst auf/an einem blockierten Feld (nach Kampf oder Rückstoß), erst auf freien Boden gehen,
      // statt das Ziel als unerreichbar zu werten (3.0.2)
      if(nav.freeAt&&now-nav.freeAt<1500)return d;
      const free=(nav.freeTries||0)<3?digibotFreeStep(me):null;
      if(free){
        if(!nav.freeTries)logEvent('auto','Stehe an einer Wand – gehe erst auf freien Boden');
        worldScene()?.tapGround?.(free.x,free.y);autopilot.lastTap=now;autopilot.route=null;
        nav.freeTries=(nav.freeTries||0)+1;nav.freeAt=now;nav.wp=free;nav.held=false;nav.progressAt=now;
        return d;
      }
      return 'stuck';
    }
    const r=autopilot.route;
    if(digibotSamePoint(nav.wp,wp)&&digibotNavigationHandoff(me,r,options.companion))wp=r.plan.current.point;
    const replaced=nav.wp&&!digibotSamePoint(nav.wp,wp);
    const urgent=!!nav.wp&&!r.native&&!digibotNavigationSegment(me,nav.wp,r.grid,zones);
    if((!nav.wp||replaced||idle||nav.held)&&(urgent||now-autopilot.lastTap>=(idle?WALK_RETRY_MS:250))){
      worldScene()?.tapGround?.(wp.x,wp.y);
      autopilot.lastTap=now;nav.tries++;nav.wp=wp;nav.held=false;
    }
    nav.nextWp=digibotSamePoint(nav.wp,r.plan.current.point)?r.plan.next?.point||null:r.plan.current.point;nav.native=!!r.native;
    return d;
  }

  // Schnellreise per Digi-Phone: nur wenn auf der aktuellen Map ein Digi-Phone steht und das Ziel mindestens 2 Maps
  // entfernt ist. Ruft an („Make a call“), holt die Liste freigeschalteter Maps und reist zum Ziel – oder zur
  // freigeschalteten Map, die ihm am nächsten liegt. Liefert Statustext, oder null = zu Fuß weiter.
  const TELEPORT_MIN_HOPS = 2;
  const DIGIPHONE_CD_MS=10000,DIGIPHONE_CD_PAD_MS=300;
  const digibotPhoneCooldowns=new Map();
  const digibotPhoneAccount=st=>String(st?.session?.username||'__session').trim().toLowerCase();
  function digibotPhoneCooldownLeft(st,now){return Math.max(0,(digibotPhoneCooldowns.get(digibotPhoneAccount(st))||0)-now);}
  function digibotPhoneUsed(st,now){
    digibotPhoneCooldowns.set(digibotPhoneAccount(st),now+DIGIPHONE_CD_MS+DIGIPHONE_CD_PAD_MS);
    if(digibotPhoneCooldowns.size>20)for(const [key,until]of digibotPhoneCooldowns)if(until<=now)digibotPhoneCooldowns.delete(key);
  }
  function digibotPhoneServerEvent(st,event,now=Date.now()){
    if(event?.t!=='toast'||event.code!=='teleport_cooldown')return;
    digibotPhoneUsed(st,now);
    const tp=autopilot.tp;
    if(tp){
      tp.teleportTries=0;tp.asked=0;tp.at=0;tp.talkTries=0;
    }
    logEvent('auto','Digi-Phone: Server meldet Cooldown – warte, keine Fehlersperre');
  }

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
    const left=digibotPhoneCooldownLeft(st,now);
    if(left>0)return `Digi-Phone: Abklingzeit – warte ${Math.ceil(left/1000)} s`;
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
      if (!autopilot.tp.at || now-autopilot.tp.at>=DIGIPHONE_CD_MS+DIGIPHONE_CD_PAD_MS) {
        if ((autopilot.tp.teleportTries=(autopilot.tp.teleportTries||0)+1) > 3) return block('Reise klappt nicht (zu wenig Bits?)');
        autopilot.tp.at = now;
        autopilot.tp.teleportAt=now;digibotPhoneUsed(st,now);
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
      if ((autopilot.tp.talkTries=(autopilot.tp.talkTries||0)+1) > 4) return block('Digi-Phone antwortet nicht');
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
    const res = walkTo(st,portal.x+portal.w/2,portal.y+portal.h/2,now,{portal});
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
  const DIALOG_STEP_MS = 800;
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
      // dieser NPC bietet gerade nichts: auch seine anderen Pools für dieses Digimon abhaken
      const act = activePartner(st)?.partnerId || 'p';
      for (const pool of Object.values(content()?.dailies || {})) if ((pool.npcs || []).includes(t.npcId)) autopilot.dailyVisited.add(`${pool.id}|${act}`);
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
      // Annehmen/Abgeben schon 2× gewählt und nichts passiert: das Fenster zeigt eine alte Seite (z. B. nach einer Abgabe)
      // -> gleich frisch ansprechen statt 6× dieselbe Auswahl zu klicken
      const stale = step?.final && (t.finalPicks = (t.finalPicks || 0) + 1) > 2 && !t.retalked;
      if (step && !stale) {
        cmd?.chooseDialog?.(step.choice.id);
        const label = step.choice.label || step.choice.id;
        logEvent('auto', step.final ? `Dialog mit ${name}: ${accept ? 'Quest annehmen' : 'Quest abgeben'}` : `Dialog mit ${name}: „${label}“`);
        return step.final ? (accept ? 'Nehme Quest an…' : 'Gebe Quest ab…') : `Im Gespräch mit ${name}: „${label}“…`;
      }
    }
    if (!t.retalked) { // Fenster passt nicht (z. B. nach einer Abgabe) -> schließen und frisch ansprechen
      t.retalked = true;
      t.dlgSteps = 0; t.finalPicks = 0;
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

  // Recover a needed, visible boss even if an old navigation failure deferred its quest.
  function digibotQuestBossFocus(st,sc){
    if(!cfg.autopilot || cfg.farm || cfg.dungeon || autopilot.mapTalk || autopilot.turninPartnerHeld || group.role()==='follower')return null;
    const C=content(),map=st.world?.mapId,entities=window.dmo?.net?.state?.entities;
    for(const [id,q]of Object.entries(planQuests(st))){
      const def=questDef(C,id);
      if(q.state!==1 || !def || def.pool || cfg.questOff[id])continue;
      for(const [i,o]of (def.objectives||[]).entries()){
        if(o.kind!=='kill' || (q.counters?.[i]??0)>=(o.count||1))continue;
        const species=[].concat(o.species||[]);
        // Nur echte Bosse (Boss-Flag): ein named Boss teilt oft die Art mit normalen Monstern (Divermon Captain / Divermon)
        const isBoss=m=>{const e=entities?.get?.(m.id);return e?!!(e.flags&FLAG.Boss):farmBossList().some(b=>b.map===map&&b.species===m.species);};
        const mob=sc?.mobs?.find(m=>species.includes(m.species)&&!m.banned&&m.reach!==false&&isBoss(m));
        if(!mob)continue;
        const b=farmBossList().find(b=>b.map===map&&b.species===mob.species);
        const task={key:`hunt:${id}:${i}`,kind:'hunt',questId:id,objIndex:i,need:o.count||1,def,species:new Set([mob.species]),names:C?.digimon?.[mob.species]?.name||mob.species,loc:{mapId:map,x:mob.x,y:mob.y,boss:true,key:b?`${map}|boss|${b.at}`:null},prio:3,label:`${def.name}: sichtbaren Boss bekämpfen`};
        if(!digibotYoungBountyAllowed(st,task))continue;
        return {mob,task};
      }
    }
    return null;
  }
  function digibotHuntPathFailure(t,now){
    if(t.loc?.key)autopilot.avoidSpots.set(t.loc.key,now+TASK_BAN_MS);
    // Only this location is blocked; quest objectives, other locations and bosses remain eligible.
    if(!t.loc?.key)autopilot.failed.set(t.key,now+15000);
    autopilot.reset();
    logEvent('warn',`${t.label}: Jagdweg blockiert – nur diesen Laufpunkt meiden, neu planen`);
    return `${t.label}: Jagdweg blockiert – plane neu`;
  }

  // Läuft in jedem Bot-Takt:
  // - zusammengefasste Jagd: erledigte Teilziele fliegen raus (sonst jagt der Bot z. B. weiter Hagurumon, obwohl nur
  //   noch Guardromon das gesuchte Item fallen lässt)
  // - eine fertige Abgabe auf derselben Map wird zwischendurch erledigt (nicht in der Map-für-Map-Runde)
  const HUNT_STALL_MS = 240000; // so lange darf eine Jagd ohne Fortschritt dauern
  function apRefresh(st, now) {
    const t = autopilot.task;
    if (!t || t.kind !== 'hunt' || t.grind || group.role() === 'follower') return;
    if(!digibotYoungBountyAllowed(st,t,now)){autopilot.reset();autopilot.route=null;autopilot.tp=null;return;}
    if (t.parts) {
      const pq = planQuests(st);
      const open = t.parts.filter((p) => pq[p.questId]?.state === 1 && (pq[p.questId].counters?.[p.objIndex] ?? 0) < p.need && digibotYoungBountyAllowed(st,{...t,questId:p.questId,def:questDef(content(),p.questId)},now));
      const sp = new Set(open.flatMap((p) => [...p.species]));
      if (open.length && (sp.size !== t.species.size||[...sp].some(id=>!t.species.has(id)))) {
        t.species = sp; t.names = [...new Set(open.map((p) => p.names))].join(', ');
        if (st.world?.mapId === t.loc.mapId) autopilot.huntSpecies = sp;
        logEvent('auto', `Teilziel erledigt – jage nur noch ${t.names}`);
      }
    }
    // Notbremse: Jagd ohne jeden Fortschritt (Zähler steigen nicht) -> Gebiet meiden und neu planen
    {
      const pq = planQuests(st);
      const parts = t.parts || [{ questId: t.questId, objIndex: t.objIndex }];
      const prog = parts.reduce((n, p) => n + (pq[p.questId]?.counters?.[p.objIndex] ?? 0) + (pq[p.questId]?.state === 2 ? 1000 : 0), 0);
      if (t.prog === undefined || prog > t.prog) { t.prog = prog; t.progAt = now; }
      else if (now - t.progAt > HUNT_STALL_MS && !t.loc.boss) { // Boss-Quests warten bewusst auf den Respawn
        if (t.loc.key) autopilot.avoidSpots.set(t.loc.key, now + TASK_BAN_MS);
        logEvent('warn', `${t.label}: ${Math.round(HUNT_STALL_MS / 60000)} min ohne Fortschritt – meide dieses Gebiet und plane neu`);
        autopilot.reset();
        return;
      }
    }
    if (cfg.apOrder !== 'sweep' && !cfg.apBatch && world.state === 'ready' && now - (autopilot.peekAt || 0) > 5000) {
      autopilot.peekAt = now;
      const nt = questTasks(st)[0];
      if (nt?.kind === 'talk' && nt.purpose === 'turnin' && nt.loc.mapId === st.world?.mapId) {
        logEvent('auto', `Zwischendurch abgeben: ${nt.label}`);
        autopilot.reset();
      }
    }
  }

  // Ein Schritt des Autopiloten. Liefert den Statustext oder null, wenn es nichts mehr zu tun gibt.
  function autopilotStep(st, sc, now) {
    if (world.state !== 'ready') { loadWorld(); return `Lade Weltkarte… ${world.loaded}/${world.total || '?'}`; }
    if (st.screen !== 'world') return 'Warte auf Map-Wechsel…';
    const mt = autopilot.mapTalk;
    if (mt && st.world?.mapId !== mt.mapId) { endMapTalk(); return 'Abgeben & Annehmen: Map gewechselt – beendet'; }
    digibotQuestBossReplan(st,sc,now);
    const follower = group.role() === 'follower' && !mt; // Abgeben & Annehmen: jeder für sich
    let t = null;
    if (follower) {
      autopilot.sweepAt = null;
      const fp = followerPick(st, sc, now);
      if (typeof fp === 'string') return fp;
      t = fp;
    } else if (cfg.apOrder === 'sweep' && !mt) {
      if(!autopilot.bountyReturn)autopilot.sweepAt = sweepMap(st);
      if (!autopilot.sweepAt&&!autopilot.bountyReturn) { cfg.apSweepMap = ''; saveCfg(); return null; }
    } else autopilot.sweepAt = null;
    if (!follower) {
      t = autopilot.task;
      if(t&&!digibotYoungBountyAllowed(st,t,now)){t=null;autopilot.reset();autopilot.route=null;autopilot.tp=null;}
      if (t && taskDone(st, t)) {
        if (t.kind === 'talk' && (t.purpose === 'accept' || t.purpose === 'turnin')) autopilot.lastNpc = { npcId: t.npcId, mapId: t.loc?.mapId, at: Date.now() };
        t = null; autopilot.reset(); if (mt) mt.n++;
      }
    }
    if(!mt && t?.def?.pool && questTasks(st).some(o=>!o.def?.pool)){
      autopilot.reset();t=null;
    }
    const sweepM=cfg.apOrder==='sweep'?autopilot.sweepAt:null;
    if(cfg.apBatch && !mt && t?.purpose==='turnin' && questTasks(st).some(o=>!o.grind && taskPhase(o)===2 && (!sweepM||digibotQuestOfMap(o,sweepM)))){autopilot.reset();t=null;}
    if (!t && mt) { // Abgeben & Annehmen: nur Gespräche auf dieser Map
      t = autopilot.task = questTasks(st).find((o) => o.kind === 'talk' && (o.purpose === 'turnin' || o.purpose === 'accept' || o.purpose === 'objective') && o.loc?.mapId === mt.mapId) || null;
      if (!t) { endMapTalk(); return 'Abgeben & Annehmen fertig'; }
      logEvent('auto', `Abgeben & Annehmen: ${t.label}`);
      autopilot.nav = null; autopilot.talkTries = 0; autopilot.arrivedAt = 0; autopilot.idleSince = 0;
    }
    if (!t) {
      const gw = groupWait(now);
      if (gw) return gw;
      let all = questTasks(st);
      // Runde: auf dieser Map nichts mehr zu tun -> nächste Map (absteigend)
      for (let guard = 0; cfg.apOrder === 'sweep' && !autopilot.bountyReturn && !all.length && guard < 40; guard++) {
        const done = autopilot.sweepAt;
        const why = sweepSkipReasons(st, done);
        const next = sweepAdvance(st);
        logEvent('map', next ? `Runde: ${content()?.maps?.[done]?.name || done} erledigt${why} → weiter mit ${content()?.maps?.[next]?.name || next}`
          : `Runde: ${content()?.maps?.[done]?.name || done} erledigt${why} – Runde beendet`);
        if (!next){all=digibotYoungBountyFinalTasks(st);if(!all.length)return null;break;}
        autopilot.sweepAt = next;
        autopilot.phase = 0;
        all = questTasks(st);
      }
      t = autopilot.task = all[0] || null;
      if (cfg.apBatch && !t?.sameNpc) autopilot.batchPhase = !t ? 'do' : t.purpose === 'accept' || t.purpose === 'daily' ? 'accept' : t.purpose === 'turnin' ? 'turnin' : 'do';
      if (t?.kind === 'hunt' && !t.grind) {
        const same = all.filter((o) => o.kind === 'hunt' && !o.grind && o.loc.mapId === t.loc.mapId && o !== t && !!o.loc.boss===!!t.loc.boss && (!t.loc.boss || o.loc.key===t.loc.key));
        if (same.length) {
          // Teilziele merken: ist eines erledigt, fliegt seine Beute aus der Liste (apRefresh)
          t.parts = [t, ...same].map((o) => ({ questId: o.questId, objIndex: o.objIndex, need: o.need, species: o.species, names: o.names }));
          t.species = new Set([t.species, ...same.map((o) => o.species)].flatMap((x) => [...x]));
          t.names = [...new Set([t.names, ...same.map((o) => o.names)])].join(', ');
          t.label += ` (+${same.length} weitere${same.length > 1 ? '' : 's'} Ziel${same.length > 1 ? 'e' : ''})`;
        }
      }
      // Leader hält eine Abgabe für die Gruppe zurück (die anderen sind noch nicht so weit): in der Wartezeit nichts auf
      // einer anderen Map anfangen – sonst läuft er weg und muss danach den ganzen Weg zurück
      if (t && group.role() === 'leader' && t.loc?.mapId && t.loc.mapId !== st.world?.mapId) {
        const own = st.me?.quests || {}, pq = planQuests(st);
        const held = Object.keys(pq).filter((id) => pq[id]?.group && own[id]?.state === 2);
        if (held.length) {
          const local = all.find((o) => o.loc?.mapId === st.world?.mapId);
          t = autopilot.task = local || null;
          if (!t) {
            const C = content();
            return `Gruppe: warte hier, bis die anderen bei ${held.map((id) => `„${questDef(C, id)?.name || id}“`).join(', ')} so weit sind`;
          }
        }
      }
      if (t && t.phase > 0 && cfg.apOrder === 'sweep' && autopilot.sweepAt && t.phase !== autopilot.phase) {
        autopilot.phase = t.phase;
        logEvent('map', `Runde ${content()?.maps?.[autopilot.sweepAt]?.name || autopilot.sweepAt}: Phase ${t.phase}/3 – ${PHASE_NAMES[t.phase]}`);
      }
      if (t) { logEvent('auto', `Aufgabe: ${t.label}`); groupNoteTalk(t, now); }
      autopilot.nav = null; autopilot.talkTries = 0; autopilot.arrivedAt = 0; autopilot.idleSince = 0;
      if (!t) {
        autopilot.huntSpecies = new Set();
        if (group.role() === 'leader') {
          const own = st.me?.quests || {}, pq = planQuests(st);
          const held = Object.keys(pq).filter((id) => pq[id]?.group && own[id]?.state === 2);
          if (held.length) {
            const C = content();
            return `Gruppe: warte, bis die anderen bei ${held.map((id) => `„${questDef(C, id)?.name || id}“`).join(', ')} so weit sind`;
          }
          if (serveOn()) return 'Gruppe: bei den Mitläufern gibt es nichts mehr zu jagen – Abgeben/Annehmen bitte selbst';
        }
        return null;
      }
    }
    const C = content();
    const fail = (why) => {
      autopilot.failed.set(t.key, now + TASK_BAN_MS);
      autopilot.reset();
      logEvent('warn', `${t.label}: ${why} – 5 min übersprungen`);
      // Sicherheitsgurt (3.0.2): mehrere Ziele kurz hintereinander „nicht erreichbar“ liegt fast immer am eigenen
      // Standort – auf freien Boden gehen und die Ziele wieder freigeben, statt den Bot zu stoppen (höchstens 2× in 10 min)
      if (/nicht erreichbar/.test(why)) {
        const rec = (autopilot.unreach || []).filter((x) => now - x.at < UNREACH_WINDOW_MS);
        rec.push({ at: now, key: t.key }); autopilot.unreach = rec;
        const resets = (autopilot.unreachResets || []).filter((at) => now - at < 600000);
        if (rec.length >= UNREACH_SERIES && resets.length < 2) {
          autopilot.unreachResets = [...resets, now]; autopilot.unreach = [];
          for (const x of rec) autopilot.failed.delete(x.key);
          const free = digibotFreeStep(controlled(st));
          if (free) worldScene()?.tapGround?.(free.x, free.y);
          logEvent('warn', `${rec.length} Ziele hintereinander nicht erreichbar – liegt wohl am Standort${free ? ', gehe auf freien Boden' : ''} und versuche es erneut`);
          return 'Mehrere Ziele nicht erreichbar – versuche es erneut…';
        }
      }
      return `${t.label}: ${why} – übersprungen`;
    };
    const gc = autopilot.mapTalk ? null : groupCombatWait(st, t, now);
    if (gc) { autopilot.nav = null; autopilot.huntSpecies = new Set(); return gc; }
    const gl = autopilot.mapTalk ? null : groupLeaveWait(st, t, now);
    if (gl) { autopilot.nav = null; return gl; }
    // offener Dialog mit einem anderen NPC stört nur -> schließen
    if (st.dialog && st.dialog.npc !== t.npcId && !(st.dialog.npc === 'digiphone' && autopilot.tp)) commands()?.closeDialog?.();

    autopilot.huntSpecies = t.kind === 'hunt' && st.world?.mapId === t.loc.mapId ? t.species : new Set();
    // Quest-Digimon (in der gewählten Digitation) für Annehmen und Erledigen. In der Map-für-Map-Runde wird schon
    // vor dem ersten Annehmen digitiert. Das Abgabe-Digimon kommt erst beim Quest-Geber dran (zurück-digitieren,
    // wechseln, abgeben) – unterwegs scheitert der Wechsel an Kämpfen, und man läuft in der Grundform herum.
    if (t.purpose !== 'turnin') {
      const sw = ensurePartner(st, digibotQuestPartner(st), now);
      if (sw !== true) return `${t.label} · ${sw}`;
      if (cfg.apOrder === 'sweep' && (!digibotQuestPartner(st) || activePartner(st)?.partnerId === digibotQuestPartner(st))) {
        const ev = autopilotEvolution(st, now);
        if (ev !== true) return `${t.label} · ${ev}`;
      }
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
        const sw=ensurePartner(st,digibotTurninPartner(st),now);if(sw!==true)return `${t.label} · ${sw}`;
        // Dieser NPC öffnet nur das Daily-Board: direkte Abgabe versuchen, sonst einen anderen NPC des Pools nehmen
        commands()?.closeDailyBoard?.();
        autopilot.boardOnly.add(t.npcId);
        commands()?.turnInQuest?.(t.questId);
        logEvent('auto', `${name}: nur Daily-Board – versuche direkte Abgabe, sonst anderer NPC`);
        autopilot.reset();
        return `${t.label} · versuche direkte Abgabe…`;
      }
      if (t.purpose === 'turnin' && st.dialog?.npc === t.npcId) { // Abgabe-Digimon auch bei schon offenem Dialog
        const sw = ensurePartner(st, digibotTurninPartner(st), now);
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
        const sw = ensurePartner(st, digibotTurninPartner(st), now);
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
    if (!digibotQuestPartner(st) || activePartner(st)?.partnerId === digibotQuestPartner(st)) {
      const ev = autopilotEvolution(st, now);
      if (ev !== true) return `${t.label} · ${ev}`;
    }
    // Jagen: zum nächsten sichtbaren passenden Monster laufen, sonst ins Jagdgebiet, sonst warten
    const prey = (sc?.mobs || []).find((m) => t.species.has(m.species) && m.inLvl && !m.taken && !m.banned && m.reach !== false);
    if (prey) {
      autopilot.idleSince = 0;
      const r = walkTo(st, Math.round(prey.x / 16) * 16, Math.round(prey.y / 16) * 16, now);
      if (r === 'stuck') { blacklist.set(prey.id, now + BAN_MS); autopilot.nav = null; }
      return `${t.label} · laufe zu ${t.names} (${Math.round(prey.d)} px)`;
    }
    const dz = me ? Math.hypot(me.x - t.loc.x, me.y - t.loc.y) : Infinity;
    if (dz > 48) {
      const r = walkTo(st, t.loc.x, t.loc.y, now);
      return r === 'stuck' ? digibotHuntPathFailure(t,now) : `${t.label} · laufe ins Jagdgebiet (${Math.round(dz)} px)`;
    }
    autopilot.idleSince ||= now;
    // Boss nicht da: warten – nichts angreifen außer Angreifern (2.30.5; vorher wurden normale Monster am Spawn mitgenommen)
    if (t.loc.boss) { // Feldboss nicht da (Respawn oft 10 min): Kanal mit dem kürzesten Respawn wählen
      const bc = questBossSel(t).length ? bossChannelPlan(st, sc, t, now) : bossChannelHop(st, sc, t, now);
      if (bc) return `${t.label} · ${bc}`;
    }
    if (now - autopilot.idleSince > HUNT_IDLE_MS) {
      // Gebiet ist leer (z. B. Boss tot, andere Spieler jagen dort): 5 min meiden und neu planen – dann wird das
      // nächstbeste Gebiet mit derselben Beute gewählt. Gibt es keins, bleibt es bei diesem (weiter warten).
      if (t.loc.key) { // auch beim Grinden: ein anderes Gebiet (oder dasselbe, wenn es keins gibt) – nicht den Bot stoppen
        autopilot.avoidSpots.set(t.loc.key, now + TASK_BAN_MS);
        logEvent('warn', `${t.label}: hier keine ${t.names} – versuche ein anderes Jagdgebiet`);
        autopilot.reset();
        return `${t.label} · suche anderes Jagdgebiet…`;
      }
      return fail('keine passenden Monster');
    }
    return `${t.label} · warte auf ${t.names}…`;
  }

  // Boss-Jagd ohne Boss: erst BOSS_CH_WAIT_MS hier warten, dann den nächsten freien Kanal prüfen, dort wieder warten …
  // Sind alle Kanäle durch, wartet der Bot normal weiter. Mitläufer wechseln den Kanal mit (sie folgen dem Leader).
  const BOSS_CH_WAIT_MS = 20000;
  function bossChannelHop(st, sc, t, now) {
    const h = (t.chHop ||= { tried: new Map(), switchTo: null });
    const cur = st.world?.channel ?? 1, mapId = st.world?.mapId;
    const name = content()?.maps?.[mapId]?.name || mapId;
    if (!h.tried.has(cur)) h.tried.set(cur, now);
    if (h.switchTo != null) {
      if (cur === h.switchTo) { h.switchTo = null; h.tried.set(cur, now); autopilot.idleSince = now; farm.switchTries = 0; farm.opening = null; return null; }
      const r = farmSwitch(st, sc, mapId, name, h.switchTo, now,true);
      if (r.done) { h.switchTo = null; h.tried.set(cur, now); autopilot.idleSince = now; return null; }
      if (r.failed) { h.tried.set(h.switchTo, now); h.switchTo = null; return null; }
      return r.status;
    }
    if (now - h.tried.get(cur) < BOSS_CH_WAIT_MS) return null;
    const list = farmChannelList(st, now);
    if (!list) return 'lade Kanalliste…';
    let next = list.filter((r) => r.channel !== cur && !h.tried.has(r.channel) && !r.closing && !(r.maxClients && r.clients >= r.maxClients))
      .sort((a, b) => a.channel - b.channel)[0];
    if (!next && commands()?.openChannel) { // kein anderer Kanal offen: neuen öffnen, wenn das Spiel es erlaubt (Ch 2 immer)
      const nc = newChannelAllowed(list);
      if (nc.allowed && !h.tried.has(nc.channel)) next = { channel: nc.channel, open: true };
    }
    if (!next) return null; // alle Kanäle geprüft -> normal weiter warten
    h.switchTo = next.channel;
    autopilot.nav = null;
    logEvent('map', `${name}: ${t.names} ist auf Ch ${cur} nicht da – ${next.open ? 'öffne' : 'prüfe'} Ch ${next.channel}`);
    return `${next.open ? 'öffne' : 'prüfe'} Ch ${next.channel}…`;
  }
  function digibotQuestBossPool(st){
    const species=new Set(),C=content();
    for(const [id,q]of Object.entries(planQuests(st))){
      const def=questDef(C,id);if(q.state!==1||!def||def.pool||cfg.questOff[id])continue;
      for(const [i,o]of (def.objectives||[]).entries())if(o.kind==='kill'&&(q.counters?.[i]??0)<(o.count||1))for(const sp of [].concat(o.species||[]))species.add(sp);
    }
    return farmBossList().filter(b=>species.has(b.species));
  }
  // Feldboss(e) der aktuellen Boss-Jagd im Format der Boss-Rotation (für Timer und Kampf-Erkennung)
  function questBossSel(t) {
    if (!t?.loc?.boss || t.kind !== 'hunt') return [];
    const at = String(t.loc.key || '').split('|boss|')[1];
    return farmBossList().filter((b) => b.map === t.loc.mapId && (!at || b.at === at) && t.species?.has?.(b.species));
  }
  // Boss-Quest: für jeden Kanal schätzen, wann der Boss kämpfbar ist – lebt = gleich, tot = Respawn-Timer, unbekannt =
  // einmal nachsehen, neuer Kanal = Boss spawnt frisch – und auf dem schnellsten warten (wie die Boss-Rotation).
  const BOSS_UNKNOWN_ETA = 25000, BOSS_SWITCH_GAIN = 15000;
  function bossChannelPlan(st, sc, t, now) {
    const b = questBossSel(t)[0];
    const cur = st.world?.channel ?? 1, mapId = st.world?.mapId;
    const name = content()?.maps?.[mapId]?.name || mapId;
    const h = (t.chPlan ||= { switchTo: null, arrived: now });
    h.checked = ((autopilot.bossChecked ||= {})[mapId] ||= new Map()); // „nachgesehen“ je Kanalnummer – überlebt Neuplanung
    if (h.switchTo != null) { // Wechsel läuft
      if (cur === h.switchTo) { h.switchTo = null; h.arrived = now; autopilot.idleSince = now; farm.switchTries = 0; farm.opening = null; }
      else {
        const r = farmSwitch(st, sc, mapId, name, h.switchTo, now,true);
        if (r.done) { h.switchTo = null; h.arrived = now; farm.switchTries = 0; }
        else if (r.failed) { h.checked.set(h.switchTo, now); h.switchTo = null; }
        else return r.status;
      }
    }
    if (now - h.arrived < BOSS_CH_WAIT_MS) return null; // erst kurz hier warten (Boss evtl. gleich sichtbar)
    // hier ist er nicht: als „gerade nachgesehen“ merken, falls der Timer unbekannt ist
    if (farmState(b, cur, now).state !== 'down') h.checked.set(cur, now);
    const list = farmChannelList(st, now);
    if (!list) return 'lade Kanalliste…';
    const opts = [];
    for (const r of list) {
      if (r.closing || (r.maxClients && r.clients >= r.maxClients) || (farm.chBan.get(`${mapId}#${r.channel}`) || 0) > now) continue;
      const s = farmState(b, r.channel, now), sw = r.channel === cur ? 0 : 8000;
      let eta;
      if (s.state === 'up') eta = sw;
      else if (s.state === 'down') eta = Math.max(s.readyAt - now, sw);
      else eta = now - (h.checked.get(r.channel) || 0) < 180000 ? Infinity : sw + BOSS_UNKNOWN_ETA; // unbekannt: einmal nachsehen
      opts.push({ ch: r.channel, eta, s });
    }
    const nc = commands()?.openChannel ? newChannelAllowed(list) : { allowed: false };
    if (nc.allowed) { // neuer Kanal: der Boss ist dort nicht automatisch frisch – bekannten Timer der Kanalnummer nutzen
      const ns = farmState(b, nc.channel, now);
      const eta = ns.state === 'down' ? Math.max(ns.readyAt - now, 15000) : ns.state === 'up' ? 15000
        : now - (h.checked.get(nc.channel) || 0) < 180000 ? Infinity : 15000 + BOSS_UNKNOWN_ETA;
      opts.push({ ch: nc.channel, eta, s: ns.state === 'unknown' ? { state: 'new' } : ns, open: true });
    }
    opts.sort((x, y) => x.eta - y.eta);
    const best = opts[0], here = opts.find((o) => o.ch === cur);
    const fmtS = (o) => (!o ? '' : o.s.state === 'down' ? `Respawn in ${fmtClock(o.s.readyAt - now)}` : o.s.state === 'up' ? 'lebt' : o.s.state === 'new' ? 'neuer Kanal' : 'Timer unbekannt');
    if (best && best.eta < Infinity && best.ch !== cur && (!here || best.eta + BOSS_SWITCH_GAIN < here.eta)) {
      h.switchTo = best.ch;
      autopilot.nav = null;
      logEvent('map', `${name}: ${b.name} – Ch ${best.ch} ist am schnellsten (${fmtS(best)}${here ? `; Ch ${cur}: ${fmtS(here)}` : ''}) – ${best.open ? 'öffne' : 'wechsle zu'} Ch ${best.ch}`);
      return `${best.open ? 'öffne' : 'wechsle zu'} Ch ${best.ch} (${fmtS(best)})…`;
    }
    autopilot.idleSince = now; // bewusst warten – nicht als „leeres Gebiet“ werten
    return `warte auf ${b.name} (Ch ${cur}: ${fmtS(here) || 'Timer unbekannt'})`;
  }
  // Wie das Spiel entscheidet, ob „Neuer Kanal – Öffnen“ geht: mindestens 2 Kanäle immer, mehr erst, wenn die offenen
  // Kanäle zu openFill (~90 %) voll sind. Liefert die nächste freie Kanalnummer und ob sie geöffnet werden darf.
  function newChannelAllowed(list) {
    const used = new Set(list.map((r) => r.channel));
    let channel = 1;
    while (used.has(channel)) channel++;
    const total = list.reduce((n, r) => n + (r.clients || 0), 0);
    const max = list.find((r) => r.maxClients)?.maxClients || 40;
    const fill = list.find((r) => r.openFill !== undefined)?.openFill ?? 0.9;
    const per = Math.max(1, Math.ceil(Math.max(1, max) * fill));
    return { channel, allowed: list.length < Math.max(2, Math.floor(total / per) + 1) };
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

  // Channel-Checker: Kanal der aktuellen Map mit den wenigsten Spielern. Geprüft wird kurz nach der Ankunft auf einer
  // Map und dann etwa jede Minute; gewechselt wird nur, wenn dort mindestens CH_CHECK_MIN_GAIN Spieler weniger sind
  // (sonst Hin und Her, weil man selbst mitzählt). Nicht in der Boss-Rotation (die wählt den Kanal nach den Timern),
  // nicht bei Quest-Bossen, nicht im Dialog. In der Gruppe entscheidet der Leader – die Mitläufer folgen ihm.
  const CH_CHECK_MS = 60000, CH_CHECK_ARRIVE_MS = 5000, CH_CHECK_MIN_GAIN = 2, CH_CHECK_WAIT_MS = 8000;
  const chCheckState = { mapId: null, arrived: 0, last: 0, switching: null };
  function channelCheck(st, sc, now) {
    if (!cfg.chCheck || cfg.farm || cfg.dungeon || group.role() === 'follower' || world.state !== 'ready' || st.dialog) return null;
    if (questBossSel(autopilot.task).length) return null;
    if (lrOn() && lr.boss) return null; // Lern-Route: Boss in Sicht/auf dem Weg – nicht wegwechseln
    if (cfg.hunt && hunt.goal && st.world?.mapId === hunt.goal.mapId) return null; // Event: der Jagd-Boss ist nur auf Ch 1
    const C = chCheckState, mapId = st.world?.mapId, cur = st.world?.channel ?? 1;
    if (C.mapId !== mapId) { C.mapId = mapId; C.arrived = now; C.last = 0; C.switching = null; }
    if (C.switching) {
      if (cur === C.switching.ch) { C.switching = null; C.last = now; return null; }
      if (now - C.switching.at < CH_CHECK_WAIT_MS) return `Channel-Checker: wechsle auf Ch ${C.switching.ch}…`;
      C.switching = null; C.last = now; // hat nicht geklappt – beim nächsten Durchgang wieder
      return null;
    }
    if (now - C.arrived < CH_CHECK_ARRIVE_MS || (C.last && now - C.last < CH_CHECK_MS)) return null;
    const list = farmChannelList(st, now);
    if (!list) return null; // lädt noch
    C.last = now;
    const here = list.find((r) => r.channel === cur);
    if (!here) return null;
    const best = list.filter((r) => r.channel !== cur && !r.closing && !(r.maxClients && r.clients >= r.maxClients))
      .sort((a, b) => a.clients - b.clients || a.channel - b.channel)[0];
    // nach dem Wechsel zählt man dort selbst mit: lohnt nur, wenn es dann mindestens CH_CHECK_MIN_GAIN weniger sind
    if (!best || here.clients - (best.clients + 1) < CH_CHECK_MIN_GAIN) return null;
    C.switching = { ch: best.channel, at: now };
    autopilot.nav = null;
    farm.channels = null; // nach dem Wechsel frisch laden
    try { commands().switchChannel(best.roomId); } catch { /* ignore */ }
    const name = content()?.maps?.[mapId]?.name || mapId;
    logEvent('map', `Channel-Checker: ${name} Ch ${cur} (${here.clients} Spieler) → Ch ${best.channel} (${best.clients} Spieler)`);
    return `Channel-Checker: wechsle auf Ch ${best.channel}…`;
  }

  // Adds eines Bosses (aus den Spieldaten: adds/moreAdds aller Bosse, z. B. Apocalymon -> Megadramon,
  // MaloMyotismon -> Phantomon/Illusion Tower). In Raid-/Dungeon-Maps zählt zusätzlich jedes normale Monster nahe am
  // Boss (Wellen, Kopien – z. B. im Kera-Dungeon). Nur wenn ein Boss in der Nähe ist; nicht in der Boss-Rotation.
  // Adds nur vom Boss-Eintrag DIESER Map mit genau dieser Art (auch als Form) – live: auf Sea of Darkness stand der
  // Feldboss Divermon, und normale Divermon galten als Adds, weil MarineDevimon auf Odaiba Divermon ruft
  // Liefert Art -> { at: höchste HP-Schwelle (atHp, Anteil; 1 = immer), levels: Set der Add-Level, points: Spawnpunkte }.
  function addSpecies(mapId, bossSpecies) {
    const set = new Map();
    for (const b of content()?.spawns?.[mapId]?.bosses || []) {
      if (![b, ...(b.forms || [])].some((fm) => fm.species === bossSpecies)) continue;
      for (const a of [b.adds, ...(b.moreAdds || [])]) if (a?.species) {
        const at = Array.isArray(a.atHp) && a.atHp.length ? Math.max(...a.atHp) : 1;
        const e = set.get(a.species) || { at: 0, levels: new Set(), points: [] };
        e.at = Math.max(e.at, at);
        if (a.level) e.levels.add(a.level);
        for (const pt of a.points || []) { const p = world.maps[mapId]?.spawns?.[pt]; if (p) e.points.push(p); }
        set.set(a.species, e);
      }
    }
    return set;
  }
  const addSince = new Map(); // Boss-Entity -> wann er zuerst unter seiner Add-Schwelle gesehen wurde
  const ADD_RANGE = 500, ADD_BOSS_NEAR = 640, ADD_RAID_RADIUS = 300;
  function bossAdd(sc) {
    if (!sc) return null;
    // Greifarm (Tentacle Bug, Creep Hands), der mich oder ein Gruppenmitglied hält: sofort zerschlagen – in jedem Modus
    // außer Dungeon (dort regelt es dungeonFocus) (3.0.5)
    if (!cfg.dungeon) {
      const st0 = getStore()?.getState?.(), arms = digibotGrabArms(st0);
      if (arms.size) {
        const ents = window.dmo?.net?.state?.entities, mine = new Set([st0?.me?.tamerEntityId, st0?.me?.partner?.entityId]);
        const held = sc.mobs.find((m) => { if (!arms.has(m.species) || m.banned) return false; const h = ents?.get?.(ents?.get?.(m.id)?.targetId); return !!h && (mine.has(h.id) || (group.active() && (h.kind === KIND.Partner || h.kind === KIND.Tamer))); });
        if (held) return held;
      }
    }
    if (cfg.farm || cfg.dungeon) return null; // Dungeon: Reihenfolge macht dungeonFocus
    if (groupLeader()?.farm) return null; // Leader in der Boss-Rotation: Mitläufer greifen nur sein Ziel an
    const boss = sc.mobs.filter((m) => m.cat === 'boss').sort((a, b) => a.d - b.d)[0];
    if (!boss || boss.d > ADD_BOSS_NEAR) return null;
    const set = addSpecies(sc.mapId, boss.species), raid = isRaidMap(sc.mapId);
    // Feld-Adds erst, wenn der Boss die HP-Schwelle erreicht hat, und nur nahe am Boss (sie erscheinen an seinem Punkt) –
    // live: Arukenimon ruft Golemon erst ab 50 %, aber jeder normale Golemon in Tower Forest galt als Add
    // Feld-Adds zusätzlich: erst NACH dem Unterschreiten der Schwelle erschienen (die normalen Monster derselben Art standen
    // schon vorher da), mit dem Level aus den Spieldaten und am Boss oder an einem Add-Spawnpunkt – live: bei Puppetmon
    // galten alle umstehenden Pumpkinmon (Lv 45–51 in Spiral Forest) als Adds
    const pct = boss.maxHp > 0 ? boss.hp / boss.maxHp : 1, now = Date.now();
    const maxAt = Math.max(0, ...[...set.values()].map((e) => e.at));
    if (pct <= maxAt + 0.02 && !addSince.has(boss.id)) addSince.set(boss.id, now);
    if (addSince.size > 50) addSince.delete(addSince.keys().next().value);
    const since = addSince.get(boss.id);
    const fieldAdd = (m) => {
      const e = set.get(m.species);
      if (!e || pct > e.at + 0.02) return false;
      if (raid) return true;
      if (e.at < 1 && (since == null || (mobHome.get(m.id)?.t ?? 0) < since - 2000)) return false; // war schon vorher da
      if (e.levels.size && !e.levels.has(m.level)) return false;
      return Math.hypot(m.x - boss.x, m.y - boss.y) <= ADD_RAID_RADIUS || e.points.some((p) => Math.hypot(m.x - p.x, m.y - p.y) <= 150);
    };
    return sc.mobs.find((m) => m.cat !== 'boss' && !m.banned && m.d <= ADD_RANGE
      && (fieldAdd(m) || (raid && Math.hypot(m.x - boss.x, m.y - boss.y) <= ADD_RAID_RADIUS))) || null;
  }
  // Abgabe/Gespräch unterwegs (Autopilot) – dann auch keine Adds jagen
  const noFightEarly = (st, now) => cfg.autopilot && !cfg.farm && autopilot.task && PASSIVE(autopilot.task) && !taskDone(st, autopilot.task);

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
    leave: false,       // Boss-Ziel lebt woanders: nicht kämpfen, sofort hin
    reset() { this.goal = null; this.fight = null; this.switchTries = 0; this.route = null; this.opening = null; },
  };
  // Boss-Rotation unterwegs zum Boss (andere Map, anderer Kanal oder noch nicht am Spawnpunkt): keine Kämpfe – auch
  // nicht gegen Angreifer, die hinterherlaufen. Am Spawnpunkt darf er sie erledigen, solange der Boss nicht da ist.
  // Nur bei mindestens halben HP; sonst erst normal zu Ende kämpfen.
  const FARM_ARRIVE = 200;         // so nah am Spawnpunkt gilt der Bot als angekommen
  const FARM_MISS_MS = 20000;      // Boss mit viel HP aus der Sicht verloren: so lange suchen, bevor er als besiegt gilt
  const FARM_MISS_READY_MS = 5 * 60000; // dann: so lange als „besiegt“ (kurz – der nächste Boss-Timer korrigiert)
  // Vermisster Boss: erst zur letzten bekannten Position laufen (dann weiter zum Spawnpunkt – das macht der Aufrufer)
  function farmMissWalk(st, now, key) {
    const f = farm.fight;
    if (!f?.missingAt || f.key !== key || f.x == null || f.posDone) return null;
    const me = controlled(st);
    if (!me || Math.hypot(me.x - f.x, me.y - f.y) <= 60) { f.posDone = true; return null; }
    if (walkTo(st, f.x, f.y, now) === 'stuck') { f.posDone = true; autopilot.nav = null; }
    return `vermisst – suche an der letzten Position (${Math.round(Math.hypot(me.x - f.x, me.y - f.y))} px)`;
  }
  const FARM_DEPART = 350;         // … und erst so weit weg wieder als unterwegs (sonst pendelt er an der Grenze: Kampf – zurück – Kampf)
  function farmGoalElsewhere(st, p, now, sc) {
    if (cfg.farmMode === 'named' || world.state !== 'ready' || !farmChannels().length || !farmSelected().length) return false;
    if (p.maxHp > 0 && p.hp / p.maxHp < 0.5) return false;
    const o = farmPlan(st, now);
    if (!o) return false;
    if (o.map !== st.world?.mapId || o.ch !== (st.world?.channel ?? 1)) return true;
    if (sc?.mobs?.some((m) => m.enabled && (m.mapBoss||m.cat!=='normal') && !m.banned && m.reach!==false)) return false; // Boss in Sicht: kämpfen
    const spot = farmSpot(o.b), me = controlled(st);
    if (!spot || !me) return false;
    const d = Math.hypot(me.x - spot.x, me.y - spot.y), key = `${o.map}#${o.ch}#${spot.x},${spot.y}`;
    if (farm.arrived === key && d <= FARM_DEPART) return false;
    if (d <= FARM_ARRIVE) { farm.arrived = key; return false; }
    if (farm.arrived === key) farm.arrived = null;
    return true;
  }
  // Rotation: a selected reachable boss anywhere on this map has priority.
  const farmBossNear = (sc) => (cfg.farm && sc ? sc.mobs.find((m) => m.enabled && (m.mapBoss||m.cat!=='normal') && !m.banned && m.reach!==false) || null : null);

  // ---------- Event: Mega-Jagd ----------
  // Alle 2 h erscheint ein Mega-Weltboss (…_hunt) an einer zufälligen Stelle einer Feld-Map, nur auf Kanal 1; er greift
  // nie zuerst an. Das Event-Fenster des Spiels (Befehl requestEvents) nennt Boss, Map, Zustand und die nächste Jagd,
  // der Chat warnt 5 min vorher (hunt_warning). Den genauen Ort verrät das Spiel nicht: der Bot reist hin, wartet bis
  // zum Erscheinen und läuft dann die Jagdgebiete der Map ab, bis er ihn sieht – dann Kampf (Fokus wie bei Bossen).
  const HUNT_POLL_MS = 10000, HUNT_POLL_ACTIVE_MS = 5000; // Event-Fenster so oft abfragen (während einer Jagd öfter)
  const HUNT_QUEST_PREP_MS = 30000; // During quest autopilot, keep working through the early warning.
  const HUNT_WP_NEAR = 60;          // so nah = Suchpunkt abgehakt
  const hunt = { info: null, skew: 0, polledAt: 0, busy: false, goal: null, visited: new Set(), wp: null, wpAt: 0, warnTs: 0 };
  const HUNT_REQUEST_TIMEOUT_MS=15000;
  function huntPoll(now) {
    if(hunt.busy && now-(hunt.requestAt||0)<HUNT_REQUEST_TIMEOUT_MS)return;
    const c=commands();if(typeof c?.requestEvents!=='function')return;
    if(hunt.busy)logEvent('warn','Event-Abfrage ohne Antwort – frage erneut ab');
    const token=hunt.pollToken=(hunt.pollToken||0)+1;
    hunt.busy=true;hunt.requestAt=now;hunt.polledAt=now;
    let pending;try{pending=c.requestEvents();}catch{hunt.busy=false;return;}
    Promise.resolve(pending).then(list=>{
      if(token!==hunt.pollToken || !Array.isArray(list))return;
      const event=list.find(x=>x?.id==='mega_hunt'||/_hunt$/.test(x?.boss||''));
      hunt.info=event||null;
      if(event?.now)hunt.skew=event.now-Date.now();
    }).catch(()=>{}).finally(()=>{if(token===hunt.pollToken)hunt.busy=false;});
  }
  function digibotEventSnapshot(){
    const info=hunt.info,next=info?.next;
    return {enabled:!!cfg.hunt,worldBossEnabled:!!cfg.wboss,questStandby:!!bot.questIdle,polling:hunt.busy,lastPollAt:hunt.polledAt,
      questBosses:cfg.autopilot?questTasks(getStore()?.getState?.()).filter(t=>t.loc?.boss).slice(0,20).map(t=>({questId:t.questId,name:t.names,mapId:t.loc.mapId,etaMs:Number.isFinite(t.bossEta)?t.bossEta:null})):[],
      bossPeace:digibotBossPeace(getStore()?.getState?.()),
      grindBoss:{enabled:!!cfg.levelBoss,routeEnabled:lrOn(),mapId:lr.goal?.mapId??null,
        goal:lr.boss?{boss:lr.boss.b.species,mapId:lr.boss.b.map,channel:lr.boss.ch}:null,
        timers:lr.goal?lrBossSel(lr.goal.mapId,getStore()?.getState?.()?.me?.partner?.level).flatMap(b=>(cfg.farmChannels?.length?cfg.farmChannels:[1]).map(ch=>({boss:b.species,mapId:b.map,channel:ch,...farmState(b,ch,Date.now())}))):[]},
      current:info?{state:info.state,boss:info.boss,mapId:info.mapId,endMs:info.slot?.endMs}:null,
      next:next?{boss:next.boss,mapId:next.mapId,startMs:next.startMs}:null,
      goal:hunt.goal?{boss:hunt.goal.boss,mapId:hunt.goal.mapId,up:hunt.goal.up,at:hunt.goal.at}:null};
  }
  // Aktuelle Jagd: läuft gerade (state up) oder beginnt in der Vorlaufzeit der Event-Konfiguration
  function huntGoal(now) {
    const e = hunt.info, sn = now + hunt.skew;
    const policy=digibotHuntPolicy(content(),e);
    if (!e) return null;
    if (e.state === 'up' && e.boss && e.mapId && (!e.slot?.endMs || sn < e.slot.endMs)) return { boss: e.boss, mapId: e.mapId, ch: policy.channel, key: `${e.slot?.key || ''}|${e.boss}`, up: true };
    const n = e.next;
    if (n?.boss && n.mapId && n.startMs && n.startMs - sn <= policy.leadMs && n.startMs - sn > -120000) return { boss: n.boss, mapId: n.mapId, ch: policy.channel, key: `next@${n.startMs}|${n.boss}`, up: false, at: n.startMs - hunt.skew };
    return null;
  }
  // Suchpunkte: Mitten der Jagdgebiete (Zonen) der Map, sonst ihre Spawn-Punkte
  function huntWaypoints(mapId) {
    const m = world.maps[mapId];
    const pts = Object.values(m?.zones || {}).filter((r) => r.w > 0 && r.h > 0).map((r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 }));
    return pts.length ? pts : Object.values(m?.spawns || {}).map((p) => ({ x: p.x, y: p.y }));
  }
  // Jagd-Boss erkennen: dieselbe Art oder eine ihrer Formen (z. B. justimon_hunt -> justimon_hunt_blitz); auf der Event-Map
  // gibt es nur einen Jagd-Boss, also zählt jede …_hunt…-Art (live: Boss stand nah, wurde aber nicht erkannt)
  const isHuntDef = (defId, boss) => !!defId && !!boss && (defId === boss || defId.startsWith(boss + '_') || (/_hunt/.test(defId) && /_hunt/.test(boss)));
  const huntSeen = new Set();
  function huntBossEnt(boss, me) {
    let b = null;
    window.dmo?.net?.state?.entities?.forEach?.((e) => {
      if (e.kind !== KIND.Mob || e.hp <= 0 || (e.flags & FLAG.Dead) || !isHuntDef(e.defId, boss)) return;
      if (!huntSeen.has(e.id)) {
        huntSeen.add(e.id);
        logEvent('auto', `Event: Jagd-Boss gesehen – ${e.defId} (Flags ${e.flags}${me ? `, ${Math.round(Math.hypot(e.x - me.x, e.y - me.y))} px` : ''})`);
      }
      if (!(e.flags & (FLAG.Hidden | FLAG.Untargetable)) || !b) b = e;
    });
    return b;
  }
  // Fokus für den Kampf: der Jagd-Boss, sobald er in der Liste der Monster steht
  const huntFocus = (sc) => (cfg.hunt && hunt.goal && sc ? sc.mobs.find((m) => isHuntDef(m.species, hunt.goal.boss) && !m.banned) || null : null);
  // Jagd-Boss lebt auf dieser Map (auch versteckt, unangreifbar oder gesperrt) – oder war es vor Kurzem: Event hat Vorrang,
  // Abgabe/Rotation/Autopilot dürfen den Bot nicht wegziehen (kurze Lücken im Fokus, z. B. beim Formwechsel)
  const HUNT_HOLD_MS = 5000;
  function huntPresent(st, sc, now) {
    if (!cfg.hunt || !hunt.goal || st.world?.mapId !== hunt.goal.mapId) return false;
    if (huntFocus(sc) || huntBossEnt(hunt.goal.boss, null)) { hunt.seenAt = now; return true; }
    return now - (hunt.seenAt || 0) < HUNT_HOLD_MS;
  }
  // Ein Schritt der Jagd: Statuszeile, solange der Bot dafür unterwegs ist / sucht / wartet; null = nichts zu tun
  // (keine Jagd, Boss in Sicht – dann kämpft der normale Ablauf – oder erst Angreifer abwehren)
  function huntStep(st, sc, now) {
    if (!cfg.hunt) return null;
    const warn=(st.chat||[]).filter(m=>['hunt_warning','hunt_appeared','hunt_defeated','hunt_left','worldboss_warning'].includes(m?.code)).pop();
    if (warn?.ts && warn.ts > hunt.warnTs) { hunt.warnTs = warn.ts; hunt.polledAt = 0; } // Warnung im Chat: gleich nachfragen
    if (now-hunt.polledAt>(hunt.goal?HUNT_POLL_ACTIVE_MS:HUNT_POLL_MS) || hunt.busy&&now-(hunt.requestAt||0)>=HUNT_REQUEST_TIMEOUT_MS)huntPoll(now);
    const g = huntGoal(now), C = content();
    // Fenster vorbei / kein aktiver Boss mehr gemeldet / schon das nächste Event angesagt: lebt der bisherige Boss hier
    // noch, den Kampf zu Ende bringen (sonst übernahm mitten im Kampf Route/Rotation/Abgabe oder die Reise zum nächsten)
    if (hunt.goal && hunt.goal.up && (!g || g.key !== hunt.goal.key)) {
      const hg = hunt.goal;
      const still = st.world?.mapId === hg.mapId ? huntBossEnt(hg.boss, controlled(st)) : null;
      if (still) {
        hunt.seenAt=now; hg.overAt ||= now;
        if (hg.overAt === now) logEvent('auto', `Event-Fenster vorbei, ${C?.digimon?.[hg.boss]?.name || hg.boss} lebt noch – kämpfe weiter`);
        if (st.target?.id !== still.id && bot.can('select', SELECT_GAP_MS, now)) { bot.lastPress.select = now; hunt.selAt = now; worldScene()?.select?.(still.id); }
        return null;
      }
      if (!still && !digibotDeaths.has(st.target?.id) && st.world?.mapId===hg.mapId && now-(hunt.seenAt||0)<HUNT_HOLD_MS) return 'Boss kurz nicht sichtbar – warte';
      if (!g) { logEvent('auto', `Event vorbei: ${C?.digimon?.[hg.boss]?.name || hg.boss} – weiter wie vorher`); hunt.goal = null; autopilot.nav = null; }
    }
    if (!g) {
      if (hunt.goal) { logEvent('auto', `Event vorbei: ${C?.digimon?.[hunt.goal.boss]?.name || hunt.goal.boss} – weiter wie vorher`); hunt.goal = null; autopilot.nav = null; }
      return null;
    }
    if(cfg.autopilot && !cfg.farm && !g.up){
      const visible=st.world?.mapId===g.mapId && huntBossEnt(g.boss,controlled(st));
      const turningIn=!!autopilot.turninPartnerHeld || autopilot.task?.purpose==='turnin' && st.me?.quests?.[autopilot.task.questId]?.state===2;
      if(!visible && (g.at-now>HUNT_QUEST_PREP_MS || turningIn)){
        if(hunt.goal){hunt.goal=null;hunt.wp=null;autopilot.nav=null;logEvent('auto','Event erst angekündigt – erledige bis zum Aufbruch weiter Quests');}
        return null;
      }
    }
    const name = C?.digimon?.[g.boss]?.name || g.boss, where = C?.maps?.[g.mapId]?.name || g.mapId;
    if (hunt.goal?.key !== g.key) {
      hunt.seenAt=0; hunt.goal = g; hunt.visited = new Set(); hunt.wp = null;
      autopilot.nav=null;autopilot.route=null;autopilot.tp=null;
      if(st.dialog?.npc==='digiphone')commands()?.closeDialog?.();
      logEvent('auto', `Event: ${name} – ${where} (Kanal ${g.ch})${g.up ? ' – ist da, suche ihn' : ` – erscheint in ${Math.max(0, Math.round((g.at - now) / 60000))} min`}`);
    }
    hunt.goal.up = g.up; hunt.goal.overAt = 0;
    if (group.role() === 'follower' && groupLeader(now)) return null; // in der Gruppe führt der Leader, die anderen folgen ihm
    // vor Reise, Warten und erstem Angriff in die Kampfform digitieren (nicht, solange ein Angreifer dran ist)
    { const ev = digibotEventEvolve(st, sc, now); if (ev !== true) return `${name}: ${ev}`; }
    const here = st.world?.mapId === g.mapId;
    const b = here ? huntBossEnt(g.boss, controlled(st)) : null;
    if (b) { // in Sicht: anvisieren, den Kampf macht der normale Ablauf (huntFocus)
      if (st.target?.id !== b.id && bot.can('select', SELECT_GAP_MS, now)) { bot.lastPress.select = now; hunt.selAt = now; worldScene()?.select?.(b.id); }
      return null;
    }
    // unterwegs (Reise, Kanalwechsel, Suche) nicht kämpfen; beim Warten auf das Erscheinen Angreifer nur abwehren
    const busy = !!sc?.attackers?.length;
    if (!here) { wayRecall(st, sc, now); const tr = travel(st, g.mapId, now); return tr === true ? `${name}: angekommen in ${where}` : `${name} – reise nach ${where} · ${tr}`; }
    if ((st.world?.channel ?? 1) !== g.ch) { wayRecall(st, sc, now); const r = farmSwitch(st, sc, g.mapId, where, g.ch, now, true, false); if (!r.done) return `${name} – Kanal ${g.ch} · ${r.status}`; }
    if (!g.up) {
      if (busy) { bot.defendOnly = now; return null; } // wehre ab, fange nichts Neues an
      const s = Math.max(0, Math.round((g.at - now) / 1000)); return `${name} erscheint in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} in ${where} – warte`;
    }
    wayRecall(st, sc, now);
    // suchen: nächster noch nicht besuchter Punkt; sind alle abgehakt, von vorn
    const me = controlled(st);
    if (!me) return `${name}: suche…`;
    const pts = huntWaypoints(g.mapId);
    if (!pts.length) return `${name} ist irgendwo in ${where} – keine Kartendaten zum Suchen`;
    const key = (p) => `${Math.round(p.x)},${Math.round(p.y)}`;
    if (hunt.wp && (Math.hypot(me.x - hunt.wp.x, me.y - hunt.wp.y) <= HUNT_WP_NEAR || now - hunt.wpAt > 45000)) { hunt.visited.add(key(hunt.wp)); hunt.wp = null; }
    if (!hunt.wp) {
      let open = pts.filter((p) => !hunt.visited.has(key(p)));
      if (!open.length) { hunt.visited.clear(); open = pts; }
      hunt.wp = open.reduce((a, p) => (Math.hypot(p.x - me.x, p.y - me.y) < Math.hypot(a.x - me.x, a.y - me.y) ? p : a));
      hunt.wpAt = now;
    }
    if (walkTo(st, hunt.wp.x, hunt.wp.y, now) === 'stuck') { hunt.visited.add(key(hunt.wp)); hunt.wp = null; autopilot.nav = null; }
    return `${name} ist irgendwo in ${where} – suche (${hunt.visited.size}/${pts.length} Gebiete)`;
  }
  // ---------- Weltboss (z. B. BlackWarGreymon) ----------
  // Weltbosse (worldBoss in den Spieldaten) spawnen je Kanal (1 und 2) mit eigenem Timer, das Spiel warnt 5 min vorher im
  // Chat. Knopf 🌍 Weltboss: fällig ist ein Kanal, auf dem er lebt oder in den nächsten WB_LEAD_MS spawnt – dann hinreisen,
  // Kanal wechseln, am Spawnpunkt warten und kämpfen; danach der nächste Kanal. Reihenfolge nach Spawnzeit, gleichzeitig =
  // Kanal 1 zuerst. Timer, Kanalwechsel und Sieg-Erkennung wie in der Boss-Rotation.
  const WB_LEAD_MS = 6 * 60000, WB_CHANNELS = [1, 2], WB_MISS_MS = 8000;
  const WB_UP_KEEP_MS = 20 * 60000; // einmal lebend gesehen: so lange als „lebt“ merken (Timer-Info läuft nach 60 s ab)
  const wb = { goal: null, warnTs: 0, warnings: new Map(), upSince: new Map(), skip: new Map(), arrAt: 0, seenAt: 0 };
  const wbSel = () => farmBossList().filter((b) => b.kind === 'world');
  // Unterwegs zum Event/Weltboss angegriffen: nicht kämpfen – Digimon zurückrufen und weiterlaufen (wie die Rotation)
  function wayRecall(st, sc, now) {
    if (!sc?.attackers?.length) return;
    const pe = window.dmo?.net?.state?.entities?.get?.(st.me?.partner?.entityId);
    if ((pe?.targetId || bot.attackedId) && bot.can('follow', 1500, now)) { bot.lastPress.follow = now; commands()?.partnerFollow?.(); }
    bot.attackedId = null;
  }
  // Bosse, deren Timer abgefragt werden: Rotation bzw. Boss-Quest des Autopiloten, dazu die Weltbosse – eine gemeinsame
  // Liste, denn jede Timer-Antwort wird nur einmal ausgewertet
  function timerSel() {
    let fsel = cfg.farm ? farmSelected() : cfg.autopilot ? questBossSel(autopilot.task) : [];
    if(cfg.autopilot&&!cfg.farm){const ids=new Set(fsel.map(b=>b.id));fsel=[...fsel,...digibotQuestBossPool(getStore()?.getState?.()).filter(b=>!ids.has(b.id))];}
    if(lrOn() && cfg.levelBoss && lr.goal){const ids=new Set(fsel.map(b=>b.id));fsel=[...fsel,...lrBossSel(lr.goal.mapId,getStore()?.getState?.()?.me?.partner?.level).filter(b=>!ids.has(b.id))];}
    if (cfg.wboss) { const ids = new Set(fsel.map((b) => b.id)); fsel = [...fsel, ...wbSel().filter((b) => !ids.has(b.id))]; }
    return fsel;
  }
  const WB_WARN_MS = 25 * 60000; // nach der Chat-Warnung gelten Kanäle ohne Timer so lange als fällig
  const warned = (b, now) => { const w = wb.warnings.get(b.id || `${b.map}#${b.index}`); return w && now - w.at < WB_WARN_MS ? w : null; };
  function wbPlan(st, now) {
    const opts = [], C = content();
    for (const b of wbSel()) {
      if (hops(st.world?.mapId, b.map) === Infinity) continue;
      for (const ch of WB_CHANNELS) {
        const key = farmKey(b.map, b.index, ch), s = farmState(b, ch, now);
        if ((wb.skip.get(key) || 0) > now) continue;
        let at;
        if (s.state === 'up') { if (!wb.upSince.has(key)) wb.upSince.set(key, now); at = wb.upSince.get(key); }
        else if (s.state === 'down') { wb.upSince.delete(key); if (s.readyAt - now > WB_LEAD_MS) continue; at = s.readyAt; }
        else if (wb.upSince.has(key) && now - wb.upSince.get(key) < WB_UP_KEEP_MS) at = wb.upSince.get(key);
        // Angekündigt (Chat-Warnung genau dieses Bosses), Kanal-Timer noch unbekannt: fällig zum angesagten Spawn
        else if (warned(b, now)) at = warned(b, now).at + (C?.spawns?.[b.map]?.bosses?.[b.index]?.worldBoss?.warnMs || 300000);
        else continue;
        opts.push({ b, ch, at, s, key });
      }
    }
    opts.sort((x, y) => (x.at === y.at ? x.ch - y.ch : x.at - y.at));
    return opts[0] || null;
  }
  function wbStep(st, sc, now) {
    if (!cfg.wboss || world.state !== 'ready') { wb.goal = null; return null; }
    for(const warn of (st.chat||[]).filter(m=>m?.code==='worldboss_warning' && m.ts>wb.warnTs)) {
      wb.warnTs=Math.max(wb.warnTs,warn.ts);
      const species=warn.params?.boss, all=wbSel();
      // Boss aus der Meldung; nennt sie keinen und es gibt nur einen Weltboss, ist er gemeint
      const boss=all.find(b=>b.species===species||b.name===species)||(!species&&all.length===1?all[0]:null);
      if(!boss)continue;
      wb.warnings.set(boss.id||`${boss.map}#${boss.index}`,{at:now,ts:warn.ts,boss:boss.species}); // Empfangszeit (eigene Uhr)
      farm.lastPins=0;
      logEvent('auto',`Weltboss angekündigt: ${boss.name} – bestätigte Kanaltimer abfragen`);
    }
    farmUpdate(st, now, timerSel()); // Timer auch während Reise/Warten (der Tick kehrt danach vor seiner Abfrage zurück)
    const previous=wb.goal;
    const keep=previous && st.world?.mapId===previous.b.map && (st.world?.channel??1)===previous.ch && wbPresent(st,sc,now);
    const o = keep ? {b:previous.b,ch:previous.ch,key:previous.key,at:now,s:farmState(previous.b,previous.ch,now)} : wbPlan(st, now);
    if (!o) {
      if (wb.goal) { logEvent('auto', `Weltboss: ${wb.goal.b.name} – nichts mehr fällig, weiter wie vorher`); wb.goal = null; autopilot.nav = null;autopilot.route=null;autopilot.tp=null; }
      return null;
    }
    const b = o.b, label = `${b.name} (${b.mapName} Ch ${o.ch})`;
    if (wb.goal?.key !== o.key) {
      autopilot.nav=null;autopilot.route=null;autopilot.tp=null;
      if(st.dialog?.npc==='digiphone')commands()?.closeDialog?.();
      wb.goal = { key: o.key, b, ch: o.ch }; wb.arrAt = 0; wb.seenAt=0;
      logEvent('auto', `Weltboss: ${label} – ${o.at <= now ? 'lebt / ist fällig' : `spawnt in ${fmtClock(o.at - now)}`}`);
    }
    if (group.role() === 'follower' && groupLeader(now)) return null; // in der Gruppe führt der Leader
    { const ev = digibotEventEvolve(st, sc, now); if (ev !== true) return `${label} · ${ev}`; } // Kampfform vor Reise/Warten/Angriff
    const here = st.world?.mapId === b.map && (st.world?.channel ?? 1) === o.ch;
    const boss = here ? wbFocus(sc) : null;
    if (boss) { // in Sicht: anvisieren, den Kampf macht der normale Ablauf (Fokus)
      wb.arrAt = 0;
      if (st.target?.id !== boss.id && bot.can('select', SELECT_GAP_MS, now)) { bot.lastPress.select = now; hunt.selAt = now; worldScene()?.select?.(boss.id); }
      return null;
    }
    if (here && wbPresent(st, sc, now)) return null; // da, aber gerade nicht wählbar: der Tick wartet beim Boss
    // unterwegs (Reise, Kanalwechsel, zum Spawnpunkt) nicht kämpfen; am Spawnpunkt Angreifer nur abwehren
    const busy = !!sc?.attackers?.length;
    const tr = travel(st, b.map, now);
    if (tr !== true) { wayRecall(st, sc, now); return `${label} · ${tr}`; }
    const sw = farmSwitch(st, sc, b.map, b.mapName, o.ch, now, true, false);
    if (!sw.done) { wayRecall(st, sc, now); if (sw.failed) wb.skip.set(o.key, now + 120000); return `${label} · ${sw.status}`; }
    const mw = farmMissWalk(st, now, o.key);
    if (mw) { wayRecall(st, sc, now); return `${label} · ${mw}`; }
    const spot = farmSpot(b), me = controlled(st);
    if (spot && me && Math.hypot(me.x - spot.x, me.y - spot.y) > FARM_ARRIVE) {
      wayRecall(st, sc, now);
      wb.arrAt = 0;
      if (walkTo(st, spot.x, spot.y, now) === 'stuck') autopilot.nav = null;
      return `${label} · laufe zum Spawnpunkt (${Math.round(Math.hypot(me.x - spot.x, me.y - spot.y))} px)`;
    }
    if (busy) { bot.defendOnly = now; return null; } // am Spawnpunkt: abwehren, nichts Neues anfangen
    wb.arrAt ||= now;
    if (farm.fight?.missingAt && farm.fight.key === o.key) return `${label} · vermisst – suche am Spawnpunkt`; // farmUpdate entscheidet
    if (now >= o.at) {
      // müsste da sein, ist es aber nicht: schon besiegt (lebte) bzw. auf diesem Kanal nicht gespawnt -> nächster Kanal
      if (now - Math.max(wb.arrAt, o.at) > WB_MISS_MS) {
        wb.skip.set(o.key, now + 30000);
        logEvent('auto', `Weltboss: ${label} nicht sichtbar – später erneut prüfen, kein Tod bestätigt`);
        wb.arrAt = 0;
        return `${label} · nicht da`;
      }
      return `${label} · am Spawnpunkt – suche…`;
    }
    return `${label} · spawnt in ${fmtClock(o.at - now)} – warte am Spawnpunkt`;
  }
  // Fokus: der fällige Weltboss, sobald er in der Monsterliste steht (auch außerhalb des Suchradius)
  const wbFocus = (sc) => (cfg.wboss && wb.goal && sc && sc.mapId === wb.goal.b.map ? farmBossMob(sc, wb.goal.b) : null);
  // Weltboss lebt hier (auch versteckt/unangreifbar/gesperrt) oder war es vor Kurzem: Vorrang wie beim Event
  function wbPresent(st, sc, now) {
    if (!cfg.wboss || !wb.goal || st.world?.mapId !== wb.goal.b.map || (st.world?.channel??1)!==wb.goal.ch) return false;
    let alive = !!wbFocus(sc);
    if (!alive) window.dmo?.net?.state?.entities?.forEach?.((en) => { if (!alive && en.kind === KIND.Mob && en.hp > 0 && !(en.flags & FLAG.Dead) && bossEntityMatch(wb.goal.b, en)) alive = true; });
    if (alive) { wb.seenAt = now; return true; }
    return now - (wb.seenAt || 0) < HUNT_HOLD_MS;
  }
  // Bosse nehmen die ersten 3 s nach dem Respawn kaum Schaden (99 % Reduktion). Solange ein Boss frisch
  // aufgetaucht ist und volle HP hat, nur normal angreifen – Skills (Abklingzeit, DS) erst danach.
  // Gilt für jeden Boss und in allen Modi (Bot, Mitläufer, Spiegeln mit Angriff), nicht nur für die Boss-Rotation.
  const FARM_SPAWN_GUARD_MS = 3300;
  const bossSeen = new Map(); // Boss-Entity -> wann zuerst lebend gesehen
  function noteBosses(now) {
    const ents = window.dmo?.net?.state?.entities;
    if (!ents?.forEach) return;
    const alive = new Set();
    ents.forEach((en) => {
      if (en.kind !== KIND.Mob || !(en.flags & FLAG.Boss) || en.hp <= 0 || (en.flags & FLAG.Dead)) return;
      alive.add(en.id);
      if (!bossSeen.has(en.id)) bossSeen.set(en.id, now);
    });
    for (const id of bossSeen.keys()) if (!alive.has(id)) bossSeen.delete(id);
  }
  function farmShielded(t, now) {
    if (!t) return false;
    const a = farm.firstSeen.get(t.id), b = bossSeen.get(t.id);
    const since = a === undefined ? b : b === undefined ? a : Math.min(a, b);
    return since !== undefined && now - since < FARM_SPAWN_GUARD_MS && t.maxHp > 0 && t.hp >= t.maxHp * 0.99;
  }
  const farmKey = (map, index, ch) => `${map}#${index}#${ch}`;
  // Alle Feldbosse aus den Spieldaten (ohne Raids), sortiert nach Level
  function farmBossList() {
    const C = content(), out = [];
    for (const [map, sp] of Object.entries(C?.spawns || {})) {
      if (sp.raid) continue;
      (sp.bosses || []).forEach((b, index) => out.push({
        id: `${map}#${b.species}`, map, index, species: b.species, level: b.level, respawnMs: b.respawnMs || 0, at: b.at, statMult: b.statMult || 0,
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
    for (const b of farmSelected()) if (b.map === mapId && !m.has(b.species)) m.set(b.species, b);
    return m;
  }
  // Monster e (Entity) ist ein gewählter Farm-Boss? Wie bossEntityMatch: Boss-Flag, bei Named Elites die erhöhten HP –
  // sonst galt jeder normale Tyrannomon gleichen Levels in Harvest Hills als Ziel der Rotation/Named-Runde
  const isFarmMob = (ft, e) => { const b = ft?.get?.(e?.defId); return !!b && bossEntityMatch(b, e); };
  // Sichtbarer Boss b in der Monsterliste (Entity für den Werte-Abgleich aus der Spielwelt)
  const farmBossMob = (sc, b) => {
    const ents = window.dmo?.net?.state?.entities;
    return sc?.mobs?.find((m) => !m.banned && m.species === b.species && (() => { const en = ents?.get?.(m.id); return en ? bossEntityMatch(b, en) : m.cat !== 'normal' || m.level === b.level; })()) || null;
  };
  // Named Elites laufen oft zwischen normalen Monstern derselben Art und desselben Levels (live: Tyrannomon in Harvest
  // Hills – jeder normale galt als „besiegter Boss“). Hat der Boss-Eintrag einen Werte-Multiplikator (statMult), zählt
  // nur ein Monster mit entsprechend erhöhten HP; echte Bosse (Boss-Flag) wie bisher.
  const bossEntityMatch = (b, en) => {
    if (en.defId !== b.species) return false;
    if (en.flags & FLAG.Boss) return true;
    const d = content()?.digimon?.[b.species];
    if ((b.statMult || 0) > 1.2 && d?.base?.hp && en.maxHp) {
      const norm = d.base.hp + (d.growth?.hp || 0) * ((en.level || b.level) - 1);
      return en.maxHp >= norm * (1 + (b.statMult - 1) / 2);
    }
    return !!(en.flags & FLAG.Elite) || en.level === b.level;
  };
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
  function farmUpdate(st, now, selArg) {
    const sel = selArg || farmSelected();
    const knownBosses=farmBossList();
    // Jede Antwort nur einmal auswerten – sie bleibt im Spielzustand liegen und wäre sonst nach unserem Sieg veraltet
    const bp = st.bossPins;
    if (bp?.bosses && bp.at !== farm.pinsAt) {
      farm.pinsAt = bp.at;
      for (const e of bp.bosses) {
        if (knownBosses.some((b) => b.map === e.map && b.index === e.index)) farmLearn(e.map, e.index, e.channel ?? 1, e, bp.at);
      }
    }
    const mi = st.mapInfo, ch = st.world?.channel;
    if (mi?.bosses && mi.at !== farm.infoAt && mi.mapId === st.world?.mapId && (!mi.roomId || !st.world?.roomId || mi.roomId === st.world.roomId)) {
      farm.infoAt = mi.at;
      for (const e of mi.bosses) {
        if (knownBosses.some((b) => b.map === mi.mapId && b.index === e.index)) farmLearn(mi.mapId, e.index, ch, e, mi.at);
      }
    }
    // Sichtbare Bosse auf dieser Map/diesem Kanal: leben gerade
    const ents = window.dmo?.net?.state?.entities;
    const here = knownBosses.filter((b) => b.map === st.world?.mapId);
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
      if (farm.fight?.id === en.id) {farm.fight.pct = hp;farm.fight.x = en.x;farm.fight.y = en.y;if(farm.fight.missingAt){farm.fight.missingAt=0;farm.fight.posDone=false;logEvent('auto',`${b.name} wieder in Sicht – weiter`);}}
    });
    for (const id of farm.firstSeen.keys()) if (!alive.has(id)) farm.firstSeen.delete(id);
    // Unser Kampf ist vorbei und der Boss verschwunden -> besiegt, Respawn-Timer selbst setzen
    const f = farm.fight;
    if (f && !alive.has(f.id) && !(st.target?.id === f.id && st.target.hp > 0)) {
      // Sieg, wenn er zuletzt fast tot war, als Ziel 0 HP hat oder auf derselben Map/demselben Kanal verschwunden ist
      // (mit Hilfe anderer Spieler fällt ein Boss oft zwischen zwei Blicken). Kanal-/Mapwechsel zählen nicht.
      // Sieg nur mit Beleg: Tod gemeldet, 0 HP, als tot markiert oder zuletzt fast tot (≤15 %). Verschwindet er mit mehr HP
      // (Sichtweite, Verfolgung), ist er „vermisst“: suchen (letzte Position, dann Spawnpunkt); erst nach FARM_MISS_MS als
      // besiegt mit kurzem Timer – der nächste Boss-Timer korrigiert. Kanal-/Mapwechsel zählen nicht.
      const entity=ents?.get?.(f.id);
      const confirmed=digibotDeaths.has(f.id)||(entity && (entity.hp<=0 || (entity.flags & FLAG.Dead)))||(st.target?.id===f.id&&st.target.hp<=0)||(f.pct??100)<=15;
      const sameRoom = f.map === st.world?.mapId && f.ch === ch && st.screen === 'world';
      const b = knownBosses.find(x=>farmKey(x.map,x.index,f.ch)===f.key);
      if (b && confirmed) {
        farm.known.set(f.key, { up: false, readyAt: now + b.respawnMs, at: now, killed: true });
        logEvent('kill', `Boss besiegt: ${b.name} (Ch ${f.ch}) – Respawn in ${Math.round(b.respawnMs / 60000)} min`);
        farm.fight = null; farm.goal = null;
      } else if (b && sameRoom) {
        if (!f.missingAt) { f.missingAt = now; logEvent('warn', `${b.name} (Ch ${f.ch}) bei ${f.pct ?? '?'} % aus der Sicht verloren – suche ihn`); }
        else if (now - f.missingAt > FARM_MISS_MS) {
          farm.known.set(f.key, { up: false, readyAt: now + FARM_MISS_READY_MS, at: now, killed: true });
          digibotCore.record('Boss verschwunden; Tod unbestätigt',{target:f.id,hp:f.pct,map:f.map,channel:f.ch});
          logEvent('kill', `${b.name} (Ch ${f.ch}) nicht wiedergefunden – vermutlich besiegt (Timer ${Math.round(FARM_MISS_READY_MS / 60000)} min)`);
          farm.fight = null; farm.goal = null;
        }
      } else { farm.fight = null; farm.goal = null; }
    }
    // Boss-Timer und Map-Info regelmäßig nachfragen
    const cmd = commands();
    if (sel.length && now - farm.lastPins > FARM_PIN_MS) {
      farm.lastPins = now;
      try { cmd?.requestBossPins?.(pinBatch(st, sel).map((b) => ({ map: b.map, index: b.index }))); } catch { /* ignore */ }
    }
    if (here.length && now - farm.lastInfo > FARM_INFO_MS) {
      farm.lastInfo = now;
      try { cmd?.requestMapInfo?.(); } catch { /* ignore */ }
    }
  }
  // Boss-Timer fragt das Spiel höchstens für 8 Bosse auf einmal ab. Mehr gewählt (Named-Runde über viele Maps, große Rotation):
  // die 6 wichtigsten (Named-Runde: aktuelle und nächste Maps; sonst Ziel, dann nach Weg) und 2 der übrigen reihum
  function pinBatch(st, sel) {
    if (sel.length <= 8) return sel;
    const cur = st.world?.mapId, isGoal = (b) => (farm.goal && b.map === farm.goal.map && b.index === farm.goal.index ? 1 : 0);
    let ord;
    if (cfg.farm && cfg.farmMode === 'named') { const i = Math.min(farm.route?.i || 0, sel.length - 1); ord = [...sel.slice(i), ...sel.slice(0, i)]; }
    else ord = [...sel].sort((a, b) => isGoal(b) - isGoal(a) || hops(cur, a.map) - hops(cur, b.map));
    const head = ord.slice(0, 6), rest = ord.slice(6);
    farm.pinOff = ((farm.pinOff || 0) + 2) % rest.length;
    return [...head, ...[...rest, ...rest].slice(farm.pinOff, farm.pinOff + Math.min(2, rest.length))];
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
    // Ein gewählter Boss, der HIER auf diesem Kanal lebt, gewinnt immer – sonst wechselte der Bot weg und kam zurück
    const hereUp = best.map === cur && best.ch === curCh && best.s.state === 'up';
    if (g && !hereUp && !(best.eta < g.eta - 20000)) return g;
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
        // Antwort unter der Map ablegen, zu der die Räume gehören – kurz nach einem Map-Wechsel kam live noch die Liste der
        // alten Map; deren Raum-ID für „Ch 2“ brachte den Bot zurück auf die alte Map
        const rows = Array.isArray(list) ? list : [];
        farm.channels = { mapId: rows.find((r) => r?.mapId)?.mapId || mapId, at: Date.now(), list: rows };
      }).catch(() => { farm.channels = { mapId, at: Date.now(), list: [] }; }).finally(() => { farm.chLoading = false; });
    }
    return c && c.mapId === mapId ? c.list : null;
  }
  const CHANNEL_OPEN_WAIT_MS = 8000; // so lange nach "Kanal öffnen" auf den Wechsel warten
  const CHANNEL_RETRY_MS = 60000;    // fehlender Kanal: so lange meiden, dann erneut prüfen/öffnen
  // Wechselt auf Kanal ch der aktuellen Map. Liefert { done: true } (schon dort), { status } (läuft) oder
  // { status, failed: true } (Kanal voll/fehlt/Wechsel klappt nicht – dann 5 min gemieden).
  // leave: auch unter Angriff wechseln (Boss-Rotation auf dem Weg, Lern-Route zum nächsten Boss)
  // Vor dem Kanalwechsel aufräumen (Angreifer nur mit Taste 1 besiegen): nur bei höchstens CHANNEL_CLEANUP_MAX Angreifern
  // und höchstens CHANNEL_CLEANUP_MS lang – sonst gleich wechseln (in dichten Zonen kamen ständig neue nach, der Bot wechselte nie)
  const CHANNEL_CLEANUP_MAX = 2, CHANNEL_CLEANUP_MS = 10000;
  function farmSwitch(st, sc, mapId, mapName, ch, now, leave = farm.leave, cleanup = true) {
    const curCh = st.world?.channel ?? 1;
    if (curCh === ch) {digibotChannelPeace=null;digibotChannelCleanup=null;farm.cleanAt=null; farm.switchTries = 0; farm.opening = null; return { done: true }; }
    const peaceful=leave||lrOn()&&lr.scanPeace||!!questBossSel(autopilot.task).length;
    if(peaceful){
      digibotChannelPeace={map:mapId,to:ch,at:now};
      const cleanKey=`${mapId}#${ch}`;
      if(farm.cleanAt?.key!==cleanKey)farm.cleanAt={key:cleanKey,at:now};
      const n=(sc?.attackers||[]).filter(m=>!m.banned&&m.reach!==false).length;
      if(cleanup&&n<=CHANNEL_CLEANUP_MAX&&now-farm.cleanAt.at<CHANNEL_CLEANUP_MS){
        const disengage=digibotChannelDisengage(st,sc,now);
        if(disengage)return {status:disengage};
      } else digibotChannelCleanup=null; // zu viele Angreifer / zu lange: trotz Angriff wechseln
    }
    // neues Ziel: Fehlversuche neu zählen – sonst zählen gelungene Wechsel mit, wenn danach niemand mehr mit dem
    // erreichten Kanal nachfragt (live Lern-Route: nach drei Wechseln galt der vierte als „klappt nicht“, Ch 2 5 min gemieden)
    const swKey = `${mapId}#${ch}#${curCh}`;
    if (farm.switchKey !== swKey) { farm.switchKey = swKey; farm.switchTries = 0; }
    const attacked = !!sc?.attackers?.length;
    if (attacked && !leave) return { status: 'Kanalwechsel nach dem Kampf…' };
    const list = farmChannelList(st, now);
    if (!list) return { status: 'lade Kanalliste…' };
    const room = list.find((r) => r.channel === ch && (!r.mapId || r.mapId === mapId));
    const fail = (why, ms = TASK_BAN_MS) => {
      digibotChannelPeace=null;digibotChannelCleanup=null;
      farm.chBan.set(`${mapId}#${ch}`, now + ms);
      logEvent('warn', `${mapName}: Ch ${ch} ${why} – ${Math.round(ms / 60000)} min gemieden`);
      farm.switchTries = 0;
      return { status: `Ch ${ch} nicht verfügbar`, failed: true };
    };
    if (!room) {
      // Kanal noch nicht offen. Ist er die nächste freie Nummer, öffnet ihn der Bot selbst – wie „New channel – Open“
      // im Kanalfenster. Das Spiel erlaubt immer mindestens 2 Kanäle; ab Ch 3 erst, wenn die offenen Kanäle zu ~90 %
      // voll sind (newChannelAllowed). Klappt es nicht, wird der Kanal nur 1 min gemieden und dann erneut versucht.
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
          return fail('lässt sich gerade nicht öffnen (ab Ch 3 erst, wenn die anderen fast voll sind – oder es lief noch ein Kampf)', CHANNEL_RETRY_MS);
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
      if (!attacked && ++farm.switchTries > 3) return fail('– Wechsel klappt nicht');
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
    const boss = farmBossMob(sc, b);
    if (boss) {
      if (farm.fight?.id !== boss.id) farm.fight = { key: farmKey(b.map, b.index, ch), id: boss.id, ch, map: b.map, pct: Math.round(boss.hp / (boss.maxHp || boss.hp || 1) * 100) };
      R.zoneAt = 0;
      if (boss.d > 180) {
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
    const boss = farmBossMob(sc, b);
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
    // 4) Vermisst: erst an der letzten Position suchen; dann zum Spawnpunkt und dort warten
    const mw = farmMissWalk(st, now, farmKey(b.map, b.index, o.ch));
    if (mw) return `${label} · ${mw}`;
    const baseSpot = farmSpot(b);
    const spot = cfg.independentGroup && baseSpot ? digibotPoint(st, `farm/${b.map}/${b.index}/${o.ch}`, baseSpot) || baseSpot : baseSpot;
    const me = controlled(st);
    const d = spot && me ? Math.hypot(me.x - spot.x, me.y - spot.y) : 0;
    if (spot && d > (cfg.independentGroup && group.active() ? 20 : FARM_NEAR)) {
      if (walkTo(st, spot.x, spot.y, now) === 'stuck') {
        farm.chBan.set(`${b.map}#${o.ch}`, now + TASK_BAN_MS);
        logEvent('warn', `${b.name}: Spawnpunkt nicht erreichbar – 5 min übersprungen`);
        farm.goal = null;
      }
      return `${label} · laufe zum Spawnpunkt (${Math.round(d)} px)`;
    }
    const s = o.s;
    // Kein Timer zu bekommen und kein Boss zu sehen: als „gerade nicht da“ werten und in 2 min wieder prüfen
    if (farm.fight?.missingAt && farm.fight.key === farmKey(b.map, b.index, o.ch)) return `${label} · vermisst – suche am Spawnpunkt`;
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

  // ---------- Dungeon (Kera: Easy „War Game“) ----------
  // Aufbau aus den Spieldaten: spawns[map].raid = { id, gate: { mapId, portal }, dungeon: { rooms: [{ id, area, landing,
  // gate, waves, clear }], mode } }; spawns[map].terminals = [{ points, radius, eaters: [{ species, into }] }].
  // Der Server meldet den Stand privat (net "me": { t: 'dungeon', raid, room, rooms, roomId, pulled, deaths, deathLimit });
  // room === rooms heißt: alle Räume frei, der Ausgang ist offen. Terminals stehen in scene.mechB.view.terminals
  // ({ x, y, r, s }: s 0 = heil, 1 = wird gefressen, 2 = zerstört). Tsumemon laufen zu den Terminals und fressen sie
  // (8 s) – jedes zerstörte Terminal kostet Bonus und macht aus dem Fresser ein Keramon. Darum: Fresser zuerst,
  // der dem nächsten heilen Terminal am nächsten ist.
  const DG_DOOR_WAIT_MS = 20000; // Leader wartet so lange an der Tür auf die Gruppe
  const DG_DOOR_NEAR = 90;       // so nah an der Tür gilt ein Mitglied als „da“
  const DG_ENTER_MS = 4000;      // Betreten frühestens so oft versuchen
  const DG_TRIES = 3;            // gescheiterte Läufe so oft neu versuchen
  const DG_PULL_HP = 90;         // einen neuen Raum (Kampf beginnt beim Hineingehen) erst ab so viel HP betreten
  const dg = {
    dps: 0, dpsTrack: null, hud: null, hudAt: 0, inside: false, enterAt: 0, doorAt: 0, fails: 0, cleared: false, logRoom: -1,
    reset() { this.hud = null; this.hudAt = 0; this.inside = false; this.enterAt = 0; this.doorAt = 0; this.fails = 0; this.cleared = false; this.logRoom = -1; },
  };
  function dgNote(ev) {
    dg.hud = { raid: ev.raid, room: ev.room ?? 0, rooms: ev.rooms ?? 0, roomId: ev.roomId, pulled: !!ev.pulled, deaths: ev.deaths ?? 0, deathLimit: ev.deathLimit ?? 0 };
    dg.hudAt = Date.now();
    if (dg.hud.rooms && dg.hud.room >= dg.hud.rooms) dg.cleared = true;
    if (dg.logRoom !== dg.hud.room) {
      if (dg.logRoom >= 0 && dg.hud.room > dg.logRoom) logEvent('bot', `Dungeon: Raum ${dg.logRoom + 1} frei${dg.cleared ? ' – alle Räume geschafft' : ''}`);
      dg.logRoom = dg.hud.room;
    }
  }
  const dgRaid = (mapId) => { const r = content()?.spawns?.[mapId]?.raid; return r?.dungeon ? r : null; };
  // Einfacher Raid ohne Räume (z. B. Apocalymon): nur ein Boss mit Adds
  const plainRaid = (mapId) => { const r = content()?.spawns?.[mapId]?.raid; return r && !r.dungeon ? r : null; };
  const DG_RAIDS = { apocalymon: 'apocalymon', malomyotismon: 'malomyotismon' }; // Auswahl im Panel -> Raid-ID in den Spieldaten
  // gewählter Modus -> Dungeon-Map und Raid (Easy = Modus-Reihenfolge 0)
  function dgPick() {
    if (DG_RAIDS[cfg.dgMode]) {
      for (const [mapId, sp] of Object.entries(content()?.spawns || {})) if (sp.raid?.id === DG_RAIDS[cfg.dgMode]) return { mapId, raid: sp.raid };
      return null;
    }
    const want = cfg.dgMode === 'hard' ? 1 : 0;
    for (const [mapId, sp] of Object.entries(content()?.spawns || {})) {
      if (sp.raid?.dungeon && (sp.raid.dungeon.mode?.order ?? 0) === want) return { mapId, raid: sp.raid };
    }
    return null;
  }
  const inRect = (z, p, pad = 0) => !!z && !!p && p.x >= z.x - pad && p.x <= z.x + z.w + pad && p.y >= z.y - pad && p.y <= z.y + z.h + pad;
  // Raum, in dem ich stehe, und Raum, der gerade dran ist (nach Server-Stand; ohne Stand: der, in dem ich stehe)
  function dgRoom(st, raid) {
    const rooms = raid.dungeon.rooms, m = world.maps[st.world?.mapId], me = controlled(st);
    const zone = (i) => m?.zones?.[rooms[i]?.area];
    const here = rooms.findIndex((r, i) => inRect(zone(i), me));
    const h = dg.hud && dg.hud.raid === raid.id && Date.now() - dg.hudAt < 30 * 60000 ? dg.hud : null;
    return { rooms, here, cur: h ? Math.min(h.room, rooms.length) : Math.max(0, here), h, zone, m, me };
  }
  // Raum (Zone), in dem ich im Dungeon-Modus stehe – null außerhalb eines Dungeons oder zwischen den Räumen
  function dgHereZone(st, self) {
    if (!cfg.dungeon) return null;
    const raid = dgRaid(st?.world?.mapId), m = world.maps[st?.world?.mapId];
    if (!raid || !m || !self) return null;
    for (const r of raid.dungeon.rooms) { const z = m.zones?.[r.area]; if (inRect(z, self)) return z; }
    return null;
  }
  // Ziel im Dungeon (nur im eigenen Raum). Fresser zuerst – und zwar der, dessen Terminal noch zu retten ist:
  // Zeit bis zum Verlust (frisst schon: Rest der 8 s; unterwegs: Ankunft + Fresszeit) gegen die Zeit bis zum Kill
  // (HP / gemessener Schaden pro Sekunde + Laufweg des Digimons). Rettbare nach Dringlichkeit, dann nicht mehr
  // rettbare Fresser (sonst werden sie zu stärkeren Keramon), dann Angreifer, dann der Rest der Pflicht-Monster.
  const DG_SWITCH_MS = 1500; // Zielwechsel im Dungeon erst, wenn ein anderes Ziel so viel dringender ist
  const DG_EAT_MS = 8000, DG_EATER_SPEED = 110, DG_PARTNER_SPEED = 200, DG_DPS0 = 3000;
  function dgDps(t, now) { // Schaden pro Sekunde am aktuellen Ziel (alle Angreifer zusammen), gleitend gemittelt
    const k = dg.dpsTrack;
    if (t?.kind === 'mob' && t.hp > 0) {
      if (k && k.id === t.id && t.hp < k.hp && now - k.at >= 500) {
        const v = (k.hp - t.hp) / ((now - k.at) / 1000);
        dg.dps = dg.dps ? dg.dps * 0.6 + v * 0.4 : v;
        dg.dpsTrack = { id: t.id, hp: t.hp, at: now };
      } else if (!k || k.id !== t.id || t.hp > k.hp) dg.dpsTrack = { id: t.id, hp: t.hp, at: now };
    }
    return Math.max(500, dg.dps || DG_DPS0);
  }
  // Einfacher Raid: Adds des Bosses (füttern ihn sonst) vor dem Boss, Angreifer dazwischen, sonst nichts
  function raidFocus(sc) {
    const spawn = content()?.spawns?.[sc.mapId], adds = new Set();
    for (const b of spawn?.bosses || []) for (const a of [b.adds, ...(b.moreAdds || [])]) if (a?.species) adds.add(a.species);
    const score = (m) => (adds.has(m.species) ? 100 + m.d : m.cat === 'boss' ? 1000 + m.d : m.attacker ? 5000 + m.d : Infinity);
    const list = sc.mobs.filter((m) => !m.banned && !safeHeld(m.id) && score(m) < Infinity).sort((a, b) => score(a) - score(b));
    const cur = getStore()?.getState?.()?.target, keep = cur && list.find((m) => m.id === cur.id);
    return keep && score(keep) - score(list[0] || keep) < 150 ? keep : list[0] || null;
  }
  function dungeonFocus(sc) {
    if (!cfg.dungeon || !sc) return null;
    const st = getStore()?.getState?.(), raid = dgRaid(sc.mapId);
    if (st && !raid && plainRaid(sc.mapId)) return raidFocus(sc);
    if (!st || !raid) return null;
    const R = dgRoom(st, raid);
    if (R.here < 0) return null;
    const now = Date.now(), dps = dgDps(st.target, now);
    const z = R.zone(R.here), spawn = content()?.spawns?.[sc.mapId];
    const eaters = new Set((spawn?.terminals || []).flatMap((t) => (t.eaters || []).map((e) => e.species)));
    const optional = new Set();
    for (const w of R.rooms[R.here]?.waves || []) for (const g of w.mobs || []) if (g.required === false) optional.add(g.species);
    const mb = worldScene()?.mechB, age = mb?.viewAt ? Math.max(0, performance.now() - mb.viewAt) : 0;
    const terms = (mb?.view?.terminals || []).filter((t) => t.s === 0 || t.s === 1);
    const partner = window.dmo?.net?.state?.entities?.get?.(st.me?.partner?.entityId) || sc.self;
    const rate = (m) => { // { urgent: ms bis zum Verlust, save: rechtzeitig zu schaffen? } – nur für Fresser
      if (!eaters.has(m.species) || !terms.length) return null;
      let best = null;
      for (const t of terms) {
        const d = Math.hypot(m.x - t.x, m.y - t.y) - (t.r || 18);
        const ms = t.s === 1 && d <= 8 ? Math.max(0, (t.left ?? DG_EAT_MS) - age) : Math.max(0, d) / DG_EATER_SPEED * 1000 + DG_EAT_MS;
        if (!best || ms < best) best = ms;
      }
      const ttk = m.hp / dps * 1000 + Math.hypot(partner.x - m.x, partner.y - m.y) / DG_PARTNER_SPEED * 1000;
      return { urgent: best, save: ttk <= best + 300, slack: best - ttk };
    };
    // Boss-Mechaniken aus den Spawn-Daten: Greifarme (grab.arm), Herde (herd: läuft zum Ei), Brechbares (breakables)
    const arms = new Set(), breaks = new Set(); let herd = null;
    for (const b of spawn?.bosses || []) {
      for (const sk of b.skills || []) if (sk.grab?.arm) arms.add(sk.grab.arm);
      for (const br of b.breakables || []) if (br.species) breaks.add(br.species);
      if (b.herd?.species) herd = { species: b.herd.species, to: R.m?.spawns?.[b.herd.to] };
    }
    const mine = new Set([st.me?.tamerEntityId, st.me?.partner?.entityId]);
    const ents0 = window.dmo?.net?.state?.entities;
    const score = (m) => {
      if (arms.has(m.species)) { // hält mich fest: sofort brechen; hält ein Gruppenmitglied: mithelfen (der Gepackte macht nur halben Schaden am Arm)
        const held = ents0?.get?.(ents0?.get?.(m.id)?.targetId);
        return mine.has(held?.id) || m.attacker ? -20 : group.active() && held && (held.kind === KIND.Partner || held.kind === KIND.Tamer) ? -10 : 150;
      }
      // Herde nur in der Gruppe abfangen – allein schafft man kaum eine (je ~15 000 HP, ~3 s bis zum Ei), und die Zeit
      // fehlt dann beim Boss (Probelauf: 330 s statt 420 s bis zum Sieg, Enrage nach 480 s)
      if (herd && m.species === herd.species && herd.to) return group.active() ? 100 + Math.hypot(m.x - herd.to.x, m.y - herd.to.y) / 10 : 20000; // vor dem Ei abfangen
      if (breaks.has(m.species)) return 400 + m.d / 10;
      const r = rate(m);
      if (r) return r.save ? Math.max(0, r.slack) / 10 : 3000 + r.urgent / 10; // rettbar: kleinster Zeitpuffer zuerst
      return m.attacker ? 5000 + m.d : 10000 + m.d;
    };
    const copies = new Set((mb?.view?.copies || []).flatMap((c) => c.ids || [])); // Diaboromons Kopien: nur das Original angreifen
    const list = sc.mobs.filter((m) => inRect(z, m, 24) && !m.banned && !safeHeld(m.id) && !copies.has(m.id) && (m.attacker || !optional.has(m.species)));
    if (!list.length) return null;
    list.sort((a, b) => score(a) - score(b));
    const cur = st.target, keep = cur && list.find((m) => m.id === cur.id);
    // gewähltes Ziel behalten, solange kein anderes deutlich (DG_SWITCH_MS) dringender ist – kein Hin und Her
    if (keep && score(keep) - score(list[0]) < DG_SWITCH_MS / 10) return keep;
    return list[0];
  }
  // Laufen ohne Ziel: zur Tür, betreten, in den Raum, durchs Tor, zum Ausgang. Liefert den Status.
  function dungeonStep(st, sc, now) {
    const mapId = st.world?.mapId, raid = dgRaid(mapId);
    if (!raid && plainRaid(mapId)) return raidStep(st, now, plainRaid(mapId));
    if (!raid) return dungeonOutside(st, now);
    if (!dg.inside) { dg.inside = true; dg.doorAt = 0; logEvent('bot', `Dungeon betreten: ${content()?.maps?.[mapId]?.name || mapId}`); }
    const R = dgRoom(st, raid);
    if (!R.m || !R.me) return 'Lade Kartendaten…';
    const go = (x,y,what,portal=null) => (walkTo(st,x,y,now,{portal}) === 'stuck' ? `${what} – Weg blockiert` : what);
    if (R.cur >= R.rooms.length) { // alles frei -> Ausgang (Portal zur Tür-Map, das mir am nächsten ist)
      const exit = R.m.portals.filter((p) => p.toMap === raid.gate.mapId)
        .sort((a, b) => Math.hypot(a.x - R.me.x, a.y - R.me.y) - Math.hypot(b.x - R.me.x, b.y - R.me.y))[0];
      return exit ? go(exit.x + exit.w / 2, exit.y + exit.h / 2, 'Alle Räume frei – gehe zum Ausgang',exit) : 'Alle Räume frei – Ausgang nicht gefunden';
    }
    if (R.here >= 0 && R.here < R.cur) { // mein Raum ist schon frei -> durch sein Tor
      const gate = R.m.portals.find((p) => p.name === R.rooms[R.here].gate);
      if (gate) return go(gate.x + gate.w / 2, gate.y + gate.h / 2, `Raum ${R.here + 1} frei – gehe durchs Tor`,gate);
    }
    const z = R.zone(R.cur);
    if (!z) return 'Raum unbekannt';
    const cx = z.x + z.w / 2, cy = z.y + z.h / 2;
    const n = `Raum ${R.cur + 1}/${R.rooms.length}`;
    // Kampf hat noch nicht begonnen: erst mit (fast) vollen HP aus dem Schutzbereich heraus – sonst fällt man beim Boss sofort
    const hp = pct(st.me?.partner?.hp, st.me?.partner?.maxHp);
    const evo = !R.h?.pulled && safeRectAt(st.world?.mapId, R.me) ? dgEvoPending(st) : null;
    if (dgEvoWait(evo, Date.now())) return `${n}: warte im Schutzbereich auf die Digitation zu ${evo}…`;
    if (!R.h?.pulled && hp < DG_PULL_HP && safeRectAt(st.world?.mapId, R.me)) return `${n}: warte im Schutzbereich auf HP (${hp.toFixed(0)} %/${DG_PULL_HP} %)…`;
    if (Math.hypot(R.me.x - cx, R.me.y - cy) > 40) return go(cx, cy, R.h?.pulled ? `${n}: zurück in die Raummitte` : `${n}: gehe hinein – der Kampf beginnt`);
    return R.h?.pulled ? `${n}: warte auf die nächste Welle…` : `${n}: warte in der Raummitte…`;
  }
  // Einfacher Raid: zum Boss (aus dem Schutzbereich erst mit Digitation und ~voller HP), nach dem Sieg hinaus
  function raidStep(st, now, raid) {
    const mapId = st.world?.mapId, m = world.maps[mapId], me = controlled(st);
    const name = content()?.maps?.[mapId]?.name || mapId;
    if (!dg.inside) { dg.inside = true; dg.doorAt = 0; logEvent('bot', `Raid betreten: ${name}`); }
    if (!m || !me) return 'Lade Kartendaten…';
    const go = (x,y,what,portal=null) => (walkTo(st,x,y,now,{portal}) === 'stuck' ? `${what} – Weg blockiert` : what);
    if (st.raid?.cleared) { // geschafft -> hinaus (Portal zur Tür-Map, das mir am nächsten ist)
      if (!dg.cleared) { dg.cleared = true; logEvent('bot', `Raid geschafft: ${name}`); }
      const exit = m.portals.filter((p) => p.toMap === raid.gate.mapId).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
      return exit ? go(exit.x + exit.w / 2, exit.y + exit.h / 2, 'Raid geschafft – gehe hinaus',exit) : 'Raid geschafft – Ausgang nicht gefunden';
    }
    if (safeRectAt(mapId, me)) {
      const evo = dgEvoPending(st), hp = pct(st.me?.partner?.hp, st.me?.partner?.maxHp);
      if (dgEvoWait(evo, now)) return `Raid: warte im Schutzbereich auf die Digitation zu ${evo}…`;
      if (hp < DG_PULL_HP) return `Raid: warte im Schutzbereich auf HP (${hp.toFixed(0)} %/${DG_PULL_HP} %)…`;
    }
    const at = content()?.spawns?.[mapId]?.bosses?.[0]?.at, spot = at && m.spawns?.[at];
    if (!spot) return 'Raid: Boss-Platz unbekannt';
    return Math.hypot(me.x - spot.x, me.y - spot.y) > 80 ? go(spot.x, spot.y, 'Raid: gehe zum Boss') : 'Raid: warte auf den Boss…';
  }
  // Außerhalb: Lauf vorbei? Sonst zur Tür, auf die Gruppe warten, betreten (Leader bzw. allein)
  function dungeonOutside(st, now) {
    if (dg.inside) { // gerade herausgekommen
      dg.inside = false; dg.doorAt = 0;
      if (dg.cleared) {
        logEvent('bot', 'Dungeon geschafft – Bot gestoppt');
        notify('Dungeon geschafft.');
        bot.toggle(true);
        return 'Dungeon geschafft – Bot gestoppt';
      }
      dg.fails++;
      logEvent('warn', `Dungeon-Lauf gescheitert (${dg.fails}/${DG_TRIES})`);
      if (dg.fails >= DG_TRIES) { bot.toggle(true); return `Dungeon ${DG_TRIES}× gescheitert – Bot gestoppt`; }
      dg.hud = null;
    }
    const pick = dgPick();
    if (!pick) return 'Kein Dungeon in den Spieldaten';
    if (world.state !== 'ready') return 'Lade Kartendaten…';
    const gate = pick.raid.gate;
    const tr = travel(st, gate.mapId, now);
    if (tr !== true) return tr;
    const portal = world.maps[gate.mapId]?.portals.find((p) => p.name === gate.portal) || world.maps[gate.mapId]?.portals.find((p) => p.toMap === pick.mapId);
    if (!portal) return 'Dungeon-Tür nicht gefunden';
    const label = !pick.raid.dungeon ? (content()?.maps?.[pick.mapId]?.name || pick.raid.id) : pick.raid.dungeon.mode?.label === 'dg_mode_hard' ? 'Hard' : 'Easy';
    // Mitläufer warten an der Tür nur, wenn ihr Leader online ist, den Bot fährt und auf dieser Map steht – sonst gehen
    // sie allein hinein (live: Fenster als Mitläufer eingetragen, Leader gar nicht da – ewiges „warte auf den Leader“)
    const L = groupLeader(now);
    const lead = group.role() !== 'follower' || !(L && L.inWorld && L.bot && L.mapId === gate.mapId);
    // Tür-Fenster des Spiels ist offen: Leader (oder allein) betritt den gewählten Modus, die Gruppe an der Tür kommt mit
    if (st.raid && !st.raid.inside) {
      if (!lead) { commands()?.closeRaidGate?.(); return 'Warte, bis der Leader den Dungeon betritt…'; }
      if (now - dg.enterAt > DG_ENTER_MS) { dg.enterAt = now; commands()?.raidEnter?.(pick.raid.id); logEvent('bot', `Dungeon: betrete ${label}`); }
      return `Betrete den Dungeon (${label})…`;
    }
    const me = controlled(st), door = { x: portal.x + portal.w / 2, y: portal.y + portal.h + 28 };
    const d = me ? Math.hypot(me.x - door.x, me.y - door.y) : Infinity;
    if (!lead) { if (d > 20) walkTo(st, door.x, door.y, now); return 'An der Dungeon-Tür – warte auf den Leader'; }
    if (d > 20 && !dg.doorAt) { walkTo(st, door.x, door.y, now); return 'Gehe zur Dungeon-Tür'; }
    dg.doorAt ||= now;
    if (group.active()) {
      // nur Mitglieder, die gerade online sind (Fenster offen, in der Welt) – auf Ausgeloggte nicht 20 s warten
      const want = [...group.peers.values()].filter((p) => fresh(p, now) && p.inWorld && accounts.list[p.slot]?.on).length;
      const here = [...group.peers.values()].filter((p) => fresh(p, now) && p.mapId === gate.mapId && p.x != null && Math.hypot(p.x - door.x, p.y - door.y) <= DG_DOOR_NEAR).length;
      if (here < want && now - dg.doorAt < DG_DOOR_WAIT_MS) return `An der Tür: warte auf die Gruppe (${here + 1}/${want + 1})…`;
    }
    const evo = dgEvoPending(st);
    if (dgEvoWait(evo, now)) return `An der Tür: warte auf die Digitation zu ${evo}…`; // digitiert wird im Bot-Takt (ensureEvolution)
    walkTo(st,door.x,portal.y+portal.h/2,now,{portal});
    return 'Gehe durch die Dungeon-Tür';
  }
  // Eingestellte Digitation noch nicht erreicht (z. B. Abklingzeit)? Liefert den Namen der Zielform, sonst null.
  function dgEvoPending(st) {
    const p = st?.me?.partner;
    let sp = cfg.apEvo;
    if (!sp || !p) return null;
    if (sp === EVO_MAX) sp = maxEvolution(p);
    if (!sp || p.species === sp || autopilot.evoGiveUp === sp) return null;
    const t = (p.evolutions || []).find((e) => e.species === sp);
    return t && t.unlocked !== false ? speciesName(sp) : null;
  }
  // höchstens DG_EVO_WAIT_MS warten (z. B. kein Tamer-DS und kein F3) – dann in der aktuellen Form weiter
  const DG_EVO_WAIT_MS = 90000;
  function dgEvoWait(evo, now) {
    if (!evo) { dg.evoWait = 0; return false; }
    dg.evoWait ||= now;
    if (now - dg.evoWait < DG_EVO_WAIT_MS) return true;
    if (!dg.evoWarned) { dg.evoWarned = true; logEvent('warn', `Dungeon: Digitation zu ${evo} klappt nicht – gehe in der aktuellen Form`); }
    return false;
  }
  function dungeonLabel() {
    const h = dg.hud;
    if (!dg.inside || !h) return 'Dungeon: zur Tür / betreten';
    return h.room >= h.rooms ? 'Dungeon: alle Räume frei – zum Ausgang' : `Dungeon: Raum ${h.room + 1}/${h.rooms}${h.pulled ? ' · Kampf' : ''} · Stürze ${h.deaths}/${h.deathLimit}`;
  }

  function pickTarget(sc, resting) {
    if (!sc) return null;
    if (cfg.dungeon) { const att = sc.attackers.filter((m) => !safeHeld(m.id)); return (resting ? null : dungeonFocus(sc)) || att[0] || null; }
    const hf = resting ? null : huntFocus(sc) || wbFocus(sc) || digibotSharedFocus(sc); // Event-/Weltboss vor allem anderen
    if (hf && !safeHeld(hf.id)) return hf;
    const focus = resting ? null : focusAssist(sc);
    if (focus && !safeHeld(focus.id)) return focus;
    const fb = resting ? null : farmBossNear(sc);
    if (fb && !safeHeld(fb.id)) return fb;
    const att = sc.attackers.filter((m) => !safeHeld(m.id));
    // Leader hat gerade kein Ziel (sein Monster ist tot): wie er den Angreifer nehmen, der ihm am nächsten ist –
    // so geht die ganze Gruppe sofort gemeinsam auf dasselbe Monster (bei wenig HP: was mich angreift)
    if (att.length > 1 && !resting && group.role() === 'follower' && !spreadOn()) {
      const L = groupLeader(), p = getStore()?.getState?.()?.me?.partner;
      const lowHp = p && p.maxHp > 0 && p.hp / p.maxHp * 100 < FOCUS_MIN_HP;
      if (L && L.x != null && !L.serve && !lowHp) return att.slice().sort((a, b) => Math.hypot(a.x - L.x, a.y - L.y) - Math.hypot(b.x - L.x, b.y - L.y))[0];
    }
    if (att.length) return att[0];
    if (resting) return null;
    if (group.role() === 'follower' && groupLeader()?.serve) return null; // Leader erledigt meine Quests: stehen bleiben
    const spread = spreadOn();
    const assist = group.role() === 'follower' && !spread ? groupAssist(sc) : null; // Mitläufer: Ziel des Leaders
    if (assist) return assist;
    if (spread) { // Ziele verteilen: zuerst ein Monster, das noch kein anderes Gruppenmitglied angreift (Bosse gemeinsam)
      // Mitläufer nur in der Nähe des Leaders – sonst wandern sie Kill für Kill aus der Gruppe weg
      const L = group.role() === 'follower' ? groupLeader() : null;
      const near = (m) => !L || L.x == null || Math.hypot(m.x - L.x, m.y - L.y) <= SPREAD_LEASH;
      const free = sc.mobs.find((m) => usable(m) && near(m) && (m.grpBy === null || m.cat === 'boss'));
      if (free) return free;
      if (L) return groupAssist(sc) || sc.mobs.find((m) => usable(m) && near(m)) || null;
    }
    return expPick(sc.mobs.filter(usable)) || null;
  }
  // EXP-Priorität (gemessen, EXP-Messung 2.40): Faktor je Level-Abstand zum Monster: −15 %/Level darunter, +10 %/Level
  // darüber, +5 bis +8 = ×1,5, darüber wieder weniger. Stufen: +5…+8, dann +4, +3, … 0, −1, … und erst zuletzt über +8;
  // innerhalb einer Stufe das nächste Monster. Nur beim Grinden – Quest-Monster und Bosse wählt der Bot wie bisher.
  function expTier(d) { return d >= 5 && d <= 8 ? 0 : d >= 0 && d < 5 ? 5 - d : d < 0 ? 5 - d : 100 + d; }
  // EXP-Faktor je Level-Abstand (gemessen 2.40/2.41): darunter −15 %/Level, darüber +10 %/Level, +5…+8 ×1,5, dann fallend
  const expFac = (d) => (d <= 0 ? Math.max(0, 1 - 0.15 * -d) : d <= 5 ? 1 + 0.1 * d : d <= 8 ? 1.5 : Math.max(0.1, 1.48 - 0.0615 * (d - 8)));
  const expPerKill = (eb, ml, pl) => Math.max(1, Math.round((eb || 0) * Math.pow(ml, 1.1) * expFac(ml - pl)));
  // EXP bis zum nächsten Level (Digimon), gemessen Lv 1–33: 40·L^1,8 + 20, ab Lv 26 × (1 + 0,5·(L − 25)^0,6)
  const expNextOf = (L) => Math.round((40 * Math.pow(L, 1.8) + 20) * (L > 25 ? 1 + 0.5 * Math.pow(L - 25, 0.6) : 1));
  // Nächste Map (gleiche Serie): die mit dem nächsthöheren niedrigsten Monster-Level. Ziel-Level: ab dem die Lern-Route
  // wirklich wechselt – ihre beste Zone bringt LR_SWITCH_GAIN mehr als die beste der aktuellen Map (Bewertung wie lrBest,
  // mit Feldbossen; eigener Schaden wie jetzt). Liefert Map, Ziel-Level, die Raten dort und die EXP bis dahin.
  const nmCache = { key: '', at: 0, v: null };
  function nextMapInfo(st) {
    const C = content(), p = st?.me?.partner; if (!C?.spawns || !p?.level) return null;
    const low = (mapId) => { let lo = Infinity; for (const z of Object.values(C.spawns[mapId]?.zones || {})) for (const e of z.entries || []) if (e.level?.[0] != null) lo = Math.min(lo, e.level[0]); return lo; };
    const cur = (lrOn() && lr.goal?.mapId) || st.world?.mapId, curLo = low(cur); if (!isFinite(curLo)) return null;
    const ser = C.maps?.[cur]?.series || 1;
    let next = null;
    for (const [id, sp] of Object.entries(C.spawns)) {
      if (sp.raid || id === cur || (C.maps?.[id]?.series || 1) !== ser) continue;
      const lo = low(id); if (isFinite(lo) && lo > curLo && (!next || lo < next.lo)) next = { mapId: id, lo };
    }
    if (!next) return null;
    const ck = `${cur}|${next.mapId}|${p.level}|${p.species}|${cfg.lvlDiff}|${cfg.levelBoss}|${(cfg.farmChannels || []).join()}`, now = Date.now();
    if (nmCache.key !== ck || now - nmCache.at > 30000) {
      const dps = lrDps(p);
      const mapBest = (mapId, L) => {
        const bt = lrBossTerms(mapId, L, dps); let r = 0;
        for (const z of Object.values(C.spawns[mapId]?.zones || {})) {
          const g = lrZoneRate(C, z.entries, L, dps, lrExt(z.entries, L) || Math.min(cfg.lvlDiff, LR_MAX_ABOVE));
          if (g > 0) r = Math.max(r, g * bt.keep + bt.gain);
        }
        return r;
      };
      let level = null, rc = 0, rn = 0;
      for (let L = p.level; L <= p.level + 30; L++) {
        rc = mapBest(cur, L); rn = mapBest(next.mapId, L);
        if (rn > 0 && (rc <= 0 || rn > rc * LR_SWITCH_GAIN)) { level = L; break; }
      }
      nmCache.key = ck; nmCache.at = now; nmCache.v = { level, rc, rn };
    }
    const { level, rc, rn } = nmCache.v;
    let need = 0;
    if (level != null && p.level < level) { need = Math.max(0, (p.expNext || expNextOf(p.level)) - (p.exp || 0)); for (let L = p.level + 1; L < level; L++) need += expNextOf(L); }
    return { ...next, name: C.maps?.[next.mapId]?.name || next.mapId, curName: C.maps?.[cur]?.name || cur, level, need, rc, rn };
  }

  // ---------- Lern-Route (Grinden): beste Zone fürs Level ----------
  // Bewertet jede Zone mit Kartendaten: EXP pro Kill (Formel oben) und Kampfzeit (Monster-HP aus den Daten / eigener
  // Schaden, geschätzt aus Angriff und Angriffstempo: 1,55 × AT je Angriff, geeicht an Aquilamon) plus Suchzeit.
  // Gezählt werden die Monster, die die EXP-Priorität wirklich nähme (beste Stufen, mindestens LR_TOP_SHARE der Zone).
  // Wechsel nur bei deutlich mehr EXP/min und frühestens nach LR_MIN_STAY_MS – sonst pendelt er.
  const LR_GAP_S = 1.3, LR_TOP_SHARE = 0.35, LR_SWITCH_GAIN = 1.15, LR_MIN_STAY_MS = 180000, LR_CALC_MS = 30000, LR_MAX_ABOVE = 12;
  const lr = { goal: null, since: 0, calcAt: 0, calcLv: 0, best: null, boss: null, scan: null };
  const lrOn = () => cfg.levelRoute && !cfg.autopilot && !cfg.farm && !cfg.questMode && !cfg.dungeon;
  // Zone am oder über der Level-Grenze: immer mindestens ihre untersten beiden Stufen erlauben (bzw. ihren ganzen niedrigsten
  // Level-Bereich, z. B. Lv 40–41), höchstens LR_MAX_ABOVE – sonst steht oft gerade keins im Suchradius (live: Lv 32 mit +8
  // nur Lv 40 erlaubt, Bot suchte lange)
  function lrExt(entries, pl) {
    let lo = Infinity, hi = -Infinity;
    for (const e of entries || []) { const a = e.level?.[0], b = e.level?.[e.level.length - 1]; if (a == null) continue; if (a < lo) { lo = a; hi = b; } else if (a === lo) hi = Math.max(hi, b); }
    if (!isFinite(lo) || lo - pl > LR_MAX_ABOVE) return 0;
    const ext = Math.min(LR_MAX_ABOVE, Math.max(hi, lo + 1) - pl);
    return ext > cfg.lvlDiff ? ext : 0;
  }
  // Level-Grenze beim Grinden: in einer Lern-Zone ganz über der Grenze bis zu ihrem niedrigsten Monster-Level
  const lvlLimit = (mapId) => (lrOn() && lr.goal?.ext && lr.goal.mapId === mapId ? Math.max(cfg.lvlDiff, lr.goal.ext) : cfg.lvlDiff);
  // Eigener Schaden/s: gemessen (je Digimon-Form, gleitend über die letzten Kills), sonst geschätzt (1,55 × AT je Angriff)
  // – live lag die Schätzung für Shurimon gegen +11-Gegner 25 % zu hoch (4 015 statt 3 066/s)
  const dpsMeter = { mobs: new Map(), by: new Map() }; // Art -> { dmg, ms, n }
  function dpsNote(ev, mine) {
    if (ev.t === 'dmg' && mine.has(ev.src)) { const r = dpsMeter.mobs.get(ev.dst) || { first: Date.now(), dmg: 0 }; r.dmg += ev.amount || 0; dpsMeter.mobs.set(ev.dst, r); if (dpsMeter.mobs.size > 100) dpsMeter.mobs.delete(dpsMeter.mobs.keys().next().value); }
    else if (ev.t === 'die' && dpsMeter.mobs.has(ev.id)) {
      const r = dpsMeter.mobs.get(ev.id), ms = Date.now() - r.first; dpsMeter.mobs.delete(ev.id);
      const sp = getStore()?.getState?.()?.me?.partner?.species; if (!sp || ms < 300) return;
      const m = dpsMeter.by.get(sp) || { dmg: 0, ms: 0, n: 0 };
      m.dmg = m.dmg * 0.9 + r.dmg; m.ms = m.ms * 0.9 + ms; m.n++; dpsMeter.by.set(sp, m); // gleitend (~10 Kills)
    }
  }
  function lrDps(p) {
    const m = dpsMeter.by.get(p?.species);
    if (m && m.n >= 5 && m.ms > 0) return m.dmg / (m.ms / 1000);
    const at = p?.stats?.at, as = p?.stats?.as;
    return at > 0 ? 1.55 * at * 1000 / (as > 0 ? as : 1300) : 1000;
  }
  // cap: höchster erlaubter Level-Abstand für diese Bewertung
  function lrZoneRate(C, entries, pl, dps, cap = Math.min(cfg.lvlDiff, LR_MAX_ABOVE)) {
    const ms = []; let W = 0;
    for (const e of entries || []) {
      const d = C.digimon?.[e.species]; if (!d?.mob || !d.base) continue;
      const lo = e.level?.[0] ?? 1, hi = e.level?.[e.level.length - 1] ?? lo, n = hi - lo + 1;
      for (let ml = lo; ml <= hi; ml++) {
        if (ml - pl > cap) continue; // zu stark: würde der Bot nicht angreifen
        const w = (e.weight || 1) / n; W += w;
        ms.push({ w, t: expTier(ml - pl), xp: expPerKill(d.mob.expBase, ml, pl), hp: d.base.hp + (d.growth?.hp || 0) * (ml - 1) });
      }
    }
    if (!ms.length) return 0;
    ms.sort((a, b) => a.t - b.t);
    let acc = 0, xp = 0, t = 0;
    for (const m of ms) { xp += m.w * m.xp; t += m.w * (m.hp / dps + LR_GAP_S); acc += m.w; if (acc >= W * LR_TOP_SHARE) break; }
    return t > 0 ? xp / t * 60 : 0;
  }
  // Feldboss-Anteil einer Map für die Bewertung (Wunsch: Boss-Regel in den Wechsel einrechnen): die Bosse der Rotation
  // (lrBossSel: diese Map und bis zu zwei darunter) bringen je Respawn auf jedem erlaubten Kanal EXP, dafür fehlt Grind-Zeit
  // (Kampf, Weg, Kanalwechsel, Reise). Ergebnis: Rate = Grinden × keep + gain. Boss-EXP gemessen: Basis × Level^1,1 × 1,5 bei
  // +5…+8, darüber −0,0365 je Level, darunter wie bei Monstern.
  const LR_BOSS_WALK_S = 20, LR_CH_S = 8;
  // Reisezeit je Map-Wechsel: gemessen auf den Wegen zu Bossen (gleitend), anfangs 30 s – live 8–15 s statt der
  // angenommenen 45 s, der Bot stand dadurch ~30 s zu früh am Spawnpunkt
  const lrHop = { ms: 30000, n: 0 };
  const bossExpFac = (d) => (d > 8 ? Math.max(0, 1.5 - 0.0365 * (d - 8)) : d >= 5 ? 1.5 : expFac(d));
  function lrBossTerms(mapId, pl, dps) {
    if (!cfg.levelBoss || !(dps > 0)) return { keep: 1, gain: 0 };
    const C = content(), nCh = Math.max(1, cfg.farmChannels?.length || 1);
    let gain = 0, frac = 0;
    for (const b of lrBossSel(mapId, pl)) {
      const d = C?.digimon?.[b.species]; if (!d?.mob || !d.base || !(b.respawnMs > 0)) continue;
      const h = b.map === mapId ? 0 : hops(mapId, b.map); if (h === Infinity) continue;
      const hp = (d.base.hp + (d.growth?.hp || 0) * (b.level - 1)) * (b.statMult || 1);
      const xp = (d.mob.expBase || 0) * Math.pow(b.level, 1.1) * bossExpFac(b.level - pl);
      const cyc = b.respawnMs / 1000;
      gain += nCh * xp / (cyc / 60);
      frac += (nCh * (hp / dps + LR_BOSS_WALK_S + LR_CH_S) + 2 * h * lrHop.ms / 1000) / cyc;
    }
    return { keep: Math.max(0, 1 - frac), gain };
  }
  function lrBest(st) {
    const C = content(), p = st?.me?.partner; if (!C || !p) return null;
    const dps = lrDps(p); let best = null;
    for (const [mapId, sp] of Object.entries(C.spawns || {})) {
      if (sp.raid || !sp.zones) continue;
      if (cfg.levelA2 && (C.maps?.[mapId]?.series || 1) !== 2) continue;
      const bt = lrBossTerms(mapId, p.level, dps);
      for (const [zn, z] of Object.entries(sp.zones)) {
        const rect = world.maps[mapId]?.zones?.[zn]; if (!rect?.w) continue;
        // Zone ganz über der Level-Grenze: mit ihren niedrigsten Monstern rechnen (bis LR_MAX_ABOVE) – oft besser als
        // die beste Zone innerhalb der Grenze (live: Lv 29, Harvest Hills ab +11 ≈ +30 % gegenüber +5…+8 im Tal)
        const ext = lrExt(z.entries, p.level);
        const grind = lrZoneRate(C, z.entries, p.level, dps, ext || Math.min(cfg.lvlDiff, LR_MAX_ABOVE));
        const rate = grind > 0 ? grind * bt.keep + bt.gain : 0; // mit den Feldbossen der Rotation
        if (rate > 0 && (!best || rate > best.rate)) best = { mapId, zone: zn, rate, rect, ext };
      }
    }
    return best;
  }
  // Feldbosse der Lern-Map mitnehmen (ohne Enrage-Timer, unabhängig von der Level-Grenze): beim Ankommen jeden
  // erlaubten Kanal einmal ansehen – die Map-Info liefert Boss-Timer nur für den Kanal, auf dem man steht –, danach
  // hingehen, wenn einer lebt oder in unter LR_BOSS_SOON_MS spawnt. Nach dem Kampf zurück in die Zone.
  // erst losgehen, wenn der Respawn höchstens noch 10 s dauert (Wunsch: nicht ewig am Spawnpunkt warten)
  const LR_BOSS_SOON_MS = 10000, LR_SCAN_WAIT_MS = 7000, LR_BOSS_LOOK_MS = 20000, LR_BOSS_NEAR = 120;
  // Bosse sind von der Level-Grenze ausgenommen (Wunsch: lebt einer, hingehen – egal wie hoch)
  // nur echte Feldbosse – Named Elites geben kaum mehr EXP als ein normales Monster und sind den Umweg nicht wert
  // dazu die Feldbosse der LR_BELOW_DEPTH Maps darunter (gleiche Serie, nächstniedrigeres niedrigstes Monster-Level), solange
  // der Boss höchstens LR_BELOW_MAX Level unter dem Digimon liegt – gerechnet: Lv 40 in Kaiser's Canyon + Drimogemon ≈ +30 %
  // EXP/min; zwei Maps tiefer direkt nach dem Map-Wechsel (Lv 41 in Sunset Bay + Drimogemon) +14…18 %, ab Boss-Level +2 kaum noch
  const LR_BELOW_MAX = 2, LR_BELOW_DEPTH = 2;
  function lrMapLow(mapId) { let lo = Infinity; for (const z of Object.values(content()?.spawns?.[mapId]?.zones || {})) for (const e of z.entries || []) if (e.level?.[0] != null) lo = Math.min(lo, e.level[0]); return lo; }
  function lrMapBelow(mapId) {
    const C = content(), lo0 = lrMapLow(mapId); if (!C?.spawns || !isFinite(lo0)) return null;
    const ser = C.maps?.[mapId]?.series || 1; let best = null, bl = -Infinity;
    for (const [id, sp] of Object.entries(C.spawns)) {
      if (sp.raid || id === mapId || (C.maps?.[id]?.series || 1) !== ser) continue;
      const lo = lrMapLow(id); if (isFinite(lo) && lo < lo0 && lo > bl) { bl = lo; best = id; }
    }
    return best;
  }
  const lrBossSel = (mapId, pl) => {
    const below = new Set();
    for (let m = mapId, i = 0; pl != null && i < LR_BELOW_DEPTH; i++) { m = lrMapBelow(m); if (!m) break; below.add(m); }
    const avoid = lr.avoid, now = Date.now();
    return farmBossList().filter((b) => b.kind === 'field' && (b.map === mapId || (below.has(b.map) && b.level - pl >= -LR_BELOW_MAX))
      && !((avoid?.get(`${b.map}#${b.species}`) || 0) > now)); // hat das Digimon umgehauen: eine Weile nicht
  };
  function lrBossPos(b) {
    const m = world.maps[b.map], sp = m?.spawns?.[b.at], z = m?.zones?.[b.at];
    return sp ? { x: sp.x, y: sp.y } : z?.w ? { x: z.x + z.w / 2, y: z.y + z.h / 2 } : null;
  }
  function lrBossEnt(b) { let e0 = null; window.dmo?.net?.state?.entities?.forEach?.((en) => { if (en.kind === KIND.Mob && en.hp > 0 && !(en.flags & FLAG.Dead) && bossEntityMatch(b, en)) e0 = en; }); return e0; }
  // Leave early enough for travel, channel change and the walk to the spawn,
  // with a ten-second arrival reserve. Walking is estimated conservatively.
  function lrBossTripMs(st,b,ch){
    const here=st.world?.mapId,h=here===b.map?0:hops(here,b.map);
    if(h===Infinity)return Infinity;
    const pos=lrBossPos(b),me=controlled(st);
    const entities=window.dmo?.net?.state?.entities;
    const speeds=[me?.speed,entities?.get?.(st.me?.partner?.entityId)?.speed].filter(v=>Number.isFinite(v)&&v>0);
    const speed=Math.min(130,...speeds);
    const walk=here===b.map && pos && me?Math.max(0,Math.hypot(me.x-pos.x,me.y-pos.y)-LR_BOSS_NEAR)/speed*1350:LR_BOSS_WALK_S*1000;
    return h*lrHop.ms+(here===b.map && (st.world?.channel??1)===ch?0:LR_CH_S*1000)+walk;
  }
  function lrBossIgnoreMobs(st,now){
    if(digibotChannelBasicAllowed(st,now))return;
    const pe=window.dmo?.net?.state?.entities?.get?.(st.me?.partner?.entityId);
    if((pe?.targetId || bot.attackedId || window.dmo?.client?.skillQueue?.queued) && bot.can('follow',1500,now)){
      bot.lastPress.follow=now;commands()?.partnerFollow?.();
    }
    bot.attackedId=null;bot.engage=null;
  }
  const lrBossFocus = (sc) => { const lb = lrOn() && lr.boss; if (!lb || !sc) return null; const e = lrBossEnt(lb.b); return e ? sc.mobs.find((m) => m.id === e.id && !m.banned) || null : null; };
  // Bossziele haben auch unter Angriff Vorrang; unbekannte Kanäle werden außerhalb von Kämpfen geprüft.
  const LR_CHAIN_MS = 30000;
  function lrBossStep(st, sc, now, g, busy = false) {
    const p = st.me.partner, sel = lrBossSel(g.mapId, p.level);
    if (!sel.length) { lr.boss = null;lr.scanPeace=false;return null; }
    farmUpdate(st, now, sel);
    const here = st.world?.mapId, cur = st.world?.channel ?? 1, mapName = (id) => content()?.maps?.[id]?.name || id, where = mapName(here);
    const list = farmChannelList(st, now);
    // erlaubte Kanäle: offene, dazu der nächste freie, wenn das Spiel ihn öffnen lässt (Ch 2 immer) – live: nur Ch 1 offen,
    // Ch 2 wurde nie angesehen; farmSwitch öffnet ihn selbst
    const nc = list && commands()?.openChannel ? newChannelAllowed(list) : null;
    const allowed = (cfg.farmChannels?.length ? cfg.farmChannels : [1]).filter((c) => !list || list.some((r) => r.channel === c) || (nc?.allowed && c === nc.channel));
    // 1) beim Ankommen: jeden erlaubten Kanal einmal ansehen (Map-Info dort lesen) – auf der Lern-Map einmal je Ziel, auf der
    // Map darunter bei jedem Besuch (dort ist man nur für einen Boss)
    lr.scans ||= {};
    if (here !== lr.lastMap) { if (here !== g.mapId) delete lr.scans[here]; lr.lastMap = here; }
    let sn = sel.some((b) => b.map === here) ? lr.scans[here] : null;
    if (sel.some((b) => b.map === here) && (!sn || (here === g.mapId && sn.since !== lr.since))) sn = lr.scans[here] = { since: lr.since, done: new Set(), ch: null, at: 0 };
    // besiegt (Respawn-Timer gesetzt): gleich den nächsten wählen – wie die Boss-Rotation, ohne erst Angreifer abzuarbeiten
    if (lr.boss) { const s0 = farmState(lr.boss.b, lr.boss.ch, now); if (s0.state === 'down' && s0.readyAt - now > 60000 && (lr.boss.expectedReadyAt==null || s0.readyAt>lr.boss.expectedReadyAt+1000)) { lr.boss = null; lr.chainAt = now; } }
    // Kanäle, deren Boss-Zustand schon bekannt ist (gerade besiegt, Boss-Timer der Spielkarte), nicht eigens ansehen
    const hereB = sel.filter((b) => b.map === here), known = (c) => hereB.length && hereB.every((b) => farmState(b, c, now).state !== 'unknown');
    const todo = sn ? allowed.filter((c) => !sn.done.has(c) && !known(c)) : [];
    // 2) Ziel wählen: lebt oder spawnt bald (Kanalwechsel ~8 s eingerechnet)
    if (!lr.boss) {
      let best = null;
      for (const b of sel) for (const ch of (b.map === here ? allowed : (cfg.farmChannels?.length ? cfg.farmChannels : [1]))) {
        if ((farm.chBan.get(`${b.map}#${ch}`) || 0) > now) continue;
        // andere Map: Reisezeit dazu (FARM_HOP_MS je Map-Wechsel)
        const h = b.map === here ? 0 : hops(here, b.map); if (h === Infinity) continue;
        const s = farmState(b, ch, now), sw = lrBossTripMs(st,b,ch);
        const eta = s.state === 'up' ? sw : s.state === 'down' ? Math.max(s.readyAt - now, sw) : Infinity;
        if (eta <= LR_BOSS_SOON_MS + sw && (!best || eta < best.eta)) best = { b, ch, eta, s };
      }
      if (!best) {
        if (todo.length && !lr.boss && (!busy || lr.scanPeace || lr.chainAt && now-lr.chainAt<LR_CHAIN_MS)) {
          lr.scanPeace=true;lrBossIgnoreMobs(st,now);
          if (todo.includes(cur)) {
            if (sn.ch !== cur) { sn.ch = cur; sn.at = now; farm.lastInfo = 0; } // gleich nachfragen
            if (now - sn.at >= LR_SCAN_WAIT_MS) { sn.done.add(cur); logEvent('map', `Leveln: Boss-Timer ${where} Ch ${cur} gelesen`); }
            return `Boss-Timer ${where} Ch ${cur} lesen – keine Zwischenkämpfe…`; // auf der Lern-Map derweil weiter grinden
          }
          const r = farmSwitch(st, sc, here, where, todo[0], now,true);
          if (r.failed) { sn.done.add(todo[0]); return null; }
          return r.done ? null : `Boss-Timer: wechsle zu Ch ${todo[0]} · ${r.status}`;
        }
        lr.scanPeace=false;lr.chainAt=0;
        return null;
      }
      lr.scanPeace=false;
      lr.boss = { b: best.b, ch: best.ch, at: now, near: 0, expectedReadyAt:best.s.state==='down'?best.s.readyAt:null };
      logEvent('auto', `Leveln: ${best.b.name} (Ch ${best.ch}) ${best.s.state === 'up' ? 'lebt' : `spawnt in ${Math.round((best.s.readyAt - now) / 1000)} s`} – nehme ihn mit`);
    }
    // 3) hin und kämpfen
    const lb = lr.boss, st1 = farmState(lb.b, lb.ch, now);
    if (st1.state === 'down' && st1.readyAt - now > 60000 && (lb.expectedReadyAt==null || st1.readyAt>lb.expectedReadyAt+1000)) { lr.boss = null; return null; } // besiegt (Respawn-Timer gesetzt)
    const localBoss=here===lb.b.map && cur===lb.ch?lrBossEnt(lb.b):null;
    if(!localBoss)lrBossIgnoreMobs(st,now);
    if (here !== lb.b.map) {
      if (!lb.trav) { const h = hops(here, lb.b.map); if (h !== Infinity && h > 0) lb.trav = { at: now, h }; }
      const tr = travel(st, lb.b.map, now); return `${lb.b.name}: reise nach ${mapName(lb.b.map)} · ${tr === true ? 'angekommen' : tr}`;
    }
    if (lb.trav) { // angekommen: Reisezeit je Map-Wechsel messen
      const ms = Math.min(120000, Math.max(3000, (now - lb.trav.at) / lb.trav.h)); lb.trav = null;
      lrHop.ms = lrHop.n ? Math.round(lrHop.ms * 0.6 + ms * 0.4) : Math.round(ms); lrHop.n++;
      logEvent('map', `Leveln: Reisezeit gemessen – ${Math.round(ms / 1000)} s je Map-Wechsel (Schnitt ${Math.round(lrHop.ms / 1000)} s)`);
    }
    if (cur !== lb.ch) {
      const r = farmSwitch(st, sc, here, where, lb.ch, now, true);
      if (r.failed) { lr.boss = null; return null; }
      return r.done ? null : `${lb.b.name}: wechsle zu Ch ${lb.ch} · ${r.status}`;
    }
    const be = lrBossEnt(lb.b);
    if (be) { // sichtbar: anvisieren, den Kampf macht der normale Ablauf (Fokus)
      // gesperrt (Hängen-Erkennung/„unreachable“): das Digimon kommt nicht hin – eine Weile aus der Boss-Runde, statt endlos
      // davorzustehen (live-ähnlich nachgestellt: 200 s am Boss, 14× „unerreichbar“, 0 Kills)
      if ((blacklist.get(be.id) || 0) > now) {
        (lr.avoid ||= new Map()).set(`${lb.b.map}#${lb.b.species}`, now + 5 * 60000);
        logEvent('warn', `Leveln: ${lb.b.name} nicht zu erreichen – 5 min aus der Boss-Runde`);
        lr.boss = null; return null;
      }
      if (st.target?.id !== be.id && bot.can('select', SELECT_GAP_MS, now)) { bot.lastPress.select = now; worldScene()?.select?.(be.id); }
      return null;
    }
    const pos = lrBossPos(lb.b), me = controlled(st);
    if (pos && me && Math.hypot(me.x - pos.x, me.y - pos.y) > LR_BOSS_NEAR) {
      if (walkTo(st, pos.x, pos.y, now) === 'stuck') autopilot.nav = null;
      return `${lb.b.name}: laufe zum Spawnpunkt (${Math.round(Math.hypot(me.x - pos.x, me.y - pos.y))} px)`;
    }
    lb.near ||= now;
    if (busy) return null; // beim Warten am Spawnpunkt Angreifer abwehren (live: HP 99 -> 55 %, ohne zurückzuschlagen)
    const soon = st1.state === 'down' && st1.readyAt > now;
    // Suchzeit erst ab dem Respawn zählen – sonst gab der Bot nach frühem Ankommen genau zum Respawn auf
    if (soon) lb.lookAt = 0; else lb.lookAt ||= now;
    if (!soon && now - lb.lookAt > LR_BOSS_LOOK_MS) { // nicht da: als unbekannt vergessen, zurück in die Zone
      farm.known.delete(farmKey(lb.b.map, lb.b.index, lb.ch)); lr.boss = null;
      logEvent('warn', `Leveln: ${lb.b.name} (Ch ${lb.ch}) nicht da – zurück in die Zone`);
      return null;
    }
    return `warte auf ${lb.b.name} (Ch ${lb.ch}${soon ? `, Respawn in ${Math.max(0, Math.round((st1.readyAt - now) / 1000))} s` : ''})`;
  }
  // Welches Digimon ist aktiv? Partner-ID aus dem Archiv, sonst die Grundform (Digitationen ändern sie nicht)
  const partnerKey = (st) => activePartner(st)?.partnerId || (st?.me?.partner?.evolutions || []).find((e) => !e.from)?.species || st?.me?.partner?.species || null;
  // Ein Schritt: Statuszeile, solange der Bot zur Zone reist/läuft; null = dort angekommen (grinden) oder nichts zu tun
  function levelRouteStep(st, sc, now, attackers) {
    if (!lrOn() || world.state !== 'ready') return null;
    hookBossEvents(); // Kampf-Ereignisse für die Schadensmessung
    const p = st.me?.partner; if (!p) return null;
    // Digimon gewechselt: alles, was für das alte Digimon geplant war (Zone, Boss, Kanal-Timer), verwerfen
    const pk = partnerKey(st);
    if (pk && lr.partner !== pk) {
      if (lr.partner != null) {
        lr.goal = null; lr.boss = null; lr.calcAt = 0; lr.since = 0; lr.scans = {}; lr.roam = null; lr.chainAt = 0;
        autopilot.evoGiveUp = null; autopilot.evoTries = 0; autopilot.nav = null; bot.attackedId = null;
        logEvent('auto', `Leveln: Digimon gewechselt – plane neu für ${p.name || speciesName(p.species)} Lv ${p.level}`);
      }
      lr.partner = pk;
    }
    if (now - lr.calcAt > LR_CALC_MS || lr.calcLv !== p.level) {
      lr.calcAt = now; lr.calcLv = p.level; lr.best = lrBest(st);
      const b = lr.best, g = lr.goal;
      // aktuelle Zone neu bewerten (Level-Up, geänderte Level-Grenze) – bringt sie nichts mehr, sofort wechseln
      if (g) {
        const ents = content()?.spawns?.[g.mapId]?.zones?.[g.zone]?.entries || [];
        g.ext = lrExt(ents, p.level);
        const grind = lrZoneRate(content(), ents, p.level, lrDps(p), g.ext || Math.min(cfg.lvlDiff, LR_MAX_ABOVE)), bt = lrBossTerms(g.mapId, p.level, lrDps(p));
        g.rate = grind > 0 ? grind * bt.keep + bt.gain : 0;
      }
      if (b && (!g || (b.mapId !== g.mapId || b.zone !== g.zone) && (g.rate <= 0 || (b.rate > g.rate * LR_SWITCH_GAIN && now - lr.since > LR_MIN_STAY_MS)))) {
        lr.goal = { ...b }; lr.since = now;
        logEvent('auto', `Leveln: beste Zone für Lv ${p.level} – ${content()?.maps?.[b.mapId]?.name || b.mapId} / ${b.zone} (~${Math.round(b.rate)} EXP/min${b.ext ? `, nur die niedrigsten ab +${b.ext}` : ''})`);
      }
    }
    const g = lr.goal; if (!g) return null;
    const t = st.target;
    let fighting = !!t && t.kind === 'mob' && t.hp > 0 && bot.attackedId === t.id;
    // Angreifer weit über dem eigenen Level (kein Boss): aussichtslos – nicht kämpfen, Digimon zurückrufen und weiter zur Zone
    const strong = (id) => { const m = sc?.mobs?.find((x) => x.id === id); return !!m && m.cat !== 'boss' && (m.level ?? 0) - p.level > LR_FLEE_ABOVE; };
    // Die starken auch aus der Zielwahl des Ticks nehmen (sonst griff pickTarget sie sofort wieder an: Rückruf und Taste 1
    // wechselten sich ab) – kurz „in Ruhe lassen“, damit auch ein schon gewähltes Ziel nicht gültig bleibt
    const strongIds = !lr.boss ? attackers.filter(strong) : [];
    let fled = false;
    if (strongIds.length) {
      for (const id of strongIds) safeHold.set(id, now + 3000);
      if (sc) sc.attackers = sc.attackers.filter((m) => !strongIds.includes(m.id));
      if (t && strongIds.includes(t.id)) { bot.attackedId = null; fighting = false; }
      if (attackers.every(strong)) {
        const pe = window.dmo?.net?.state?.entities?.get?.(p.entityId);
        if ((pe?.targetId || bot.attackedId) && bot.can('follow', 1500, now)) { bot.lastPress.follow = now; commands()?.partnerFollow?.(); }
        if (!lr.fleeLog || now - lr.fleeLog > 15000) { lr.fleeLog = now; logEvent('warn', `Leveln: Angreifer über +${LR_FLEE_ABOVE} – nicht kämpfen, weiter zur Zone`); }
        bot.attackedId = null; fighting = false; fled = true;
      }
      attackers = attackers.filter((id) => !strongIds.includes(id));
    }
    // Digitation zuerst – auch auf dem Weg zum Boss und im Kampf (live: 12 min Angemon statt ClavisAngemon, weil zwischen
    // Bossen und Angreifern nie „zwischen den Kämpfen“ war). Im Kampf/unter Angriff nur den Befehl schicken, weiterkämpfen.
    if (cfg.levelEvo) {
      const ev = lrEvolve(st, now);
      if (ev !== true && !attackers.length && !fighting) return `Digitation: ${ev}`;
    }
    // Feldbosse der Map vor dem normalen Grinden: auf dem Weg zum Boss keine Kämpfe, auch nicht gegen Angreifer – Digimon
    // zurückrufen und weiterlaufen (live: der Weg wurde bei jedem Monster am Rand unterbrochen). Ohne Boss-Ziel: erst abwehren.
    if (cfg.levelBoss && (st.world?.mapId === g.mapId || lr.boss || lrBossSel(g.mapId, p.level).some((b) => b.map === st.world?.mapId))) {
      const bs = lrBossStep(st, sc, now, g, attackers.length > 0);
      if (bs) {
        return bs;
      }
      if (lr.boss) return null; // Boss in Sicht: Kampf über den Fokus
    } else lr.boss = null;
    if (attackers.length) return null; // erst Angreifer abwehren
    if (fighting) return null; // laufenden Kampf beenden
    const where = `${content()?.maps?.[g.mapId]?.name || g.mapId} / ${g.zone}`;
    if (st.world?.mapId !== g.mapId) { const tr = travel(st, g.mapId, now); return tr === true ? `angekommen in ${where}` : `reise zu ${where} · ${tr}`; }
    const me = controlled(st), r = g.rect;
    // auf der Lern-Map nur starke Angreifer: passende Monster in Sicht trotzdem bekämpfen (die starken sind aus der Zielwahl
    // genommen), sonst zum Zonenpunkt, der am weitesten von ihnen weg ist (sie lassen dann los)
    if (fled && me && !(sc && sc.mobs.some((m) => usable(m) && !strongIds.includes(m.id)))) {
      const foes = strongIds.map((id) => sc?.mobs?.find((m) => m.id === id)).filter(Boolean);
      const g0 = worldScene()?.map?.grid, T0 = g0?.tile || 16;
      const okAt = (q) => (sc?.pf ? pathFree(sc.pf, q) : !g0?.blocked || g0.blocked[Math.floor(q.y / T0) * g0.w + Math.floor(q.x / T0)] !== 1);
      let best = lr.flee && now - lr.flee.at < 4000 ? lr.flee : null, bd = -1;
      if (!best) {
        for (let k = 0; k < 16; k++) {
          const q = { x: r.x + 24 + Math.random() * Math.max(1, r.w - 48), y: r.y + 24 + Math.random() * Math.max(1, r.h - 48) };
          if (!okAt(q)) continue;
          const d = Math.min(...foes.map((m) => Math.hypot(m.x - q.x, m.y - q.y)));
          if (d > bd) { bd = d; best = q; }
        }
        if (best) lr.flee = { x: best.x, y: best.y, at: now };
      }
      if (best && walkTo(st, best.x, best.y, now) === 'stuck') { autopilot.nav = null; lr.flee = null; }
      const lvMax = Math.max(...foes.map((m) => (m.level ?? 0) - p.level));
      return `weiche Angreifer +${lvMax} aus`;
    }
    // außerhalb der Zone: passende Monster in Sicht weiter bekämpfen (live: nach jedem Kampf am Rand zurück zur Mitte und
    // wieder hinaus), sonst nur bis an den nächsten Punkt der Zone laufen statt zur Mitte
    if (me && !(me.x >= r.x - 24 && me.x <= r.x + r.w + 24 && me.y >= r.y - 24 && me.y <= r.y + r.h + 24)) {
      if (sc && sc.mobs.some(usable)) { lr.roam = null; return null; }
      const cx = Math.min(Math.max(me.x, r.x + Math.min(48, r.w / 2)), r.x + r.w - Math.min(48, r.w / 2));
      const cy = Math.min(Math.max(me.y, r.y + Math.min(48, r.h / 2)), r.y + r.h - Math.min(48, r.h / 2));
      if (walkTo(st, cx, cy, now) === 'stuck') autopilot.nav = null;
      return `laufe in die Zone ${where} (~${Math.round(g.rate)} EXP/min)`;
    }
    // in der Zone, aber nichts Passendes im Suchradius: einen anderen Punkt der Zone ansteuern statt zu warten
    if (me && sc && !sc.mobs.some(usable)) {
      const rp = lr.roam;
      if (!rp || now - rp.at > 15000 || Math.hypot(me.x - rp.x, me.y - rp.y) < 40) {
        // zufälliger Punkt der Zone – aber einer, zu dem es einen Weg gibt (sonst lief der Bot ins Wasser und hing 15 s)
        let pick = null;
        const g0 = worldScene()?.map?.grid, T0 = g0?.tile || 16;
        const okAt = (q) => (sc.pf ? pathFree(sc.pf, q) : !g0?.blocked || g0.blocked[Math.floor(q.y / T0) * g0.w + Math.floor(q.x / T0)] !== 1);
        for (let k = 0; k < 12 && !pick; k++) {
          const q = { x: r.x + 24 + Math.random() * Math.max(1, r.w - 48), y: r.y + 24 + Math.random() * Math.max(1, r.h - 48) };
          if (okAt(q)) pick = q;
        }
        lr.roam = pick ? { ...pick, at: now } : null; // nichts Begehbares getroffen: diesmal stehen bleiben, gleich neu würfeln
      }
      if (!lr.roam) return `suche Monster in ${where}`;
      if (walkTo(st, lr.roam.x, lr.roam.y, now) === 'stuck') { autopilot.nav = null; lr.roam = null; }
      return `suche Monster in ${where}`;
    }
    lr.roam = null;
    return null;
  }
  function expPick(list) {
    if (!list.length) return null;
    const pLv = getStore()?.getState?.()?.me?.partner?.level;
    if (!cfg.expPrio || !pLv || cfg.farm || cfg.dungeon || cfg.questMode || (cfg.autopilot && !autopilot.task?.grind)) return list[0];
    let best = null, bt = Infinity;
    for (const m of list) { const t = expTier((m.level ?? pLv) - pLv); if (t < bt || (t === bt && (m.pd ?? m.d) < (best.pd ?? best.d))) { best = m; bt = t; } }
    return best;
  }

  // Die Spielszene "world" kann ein Ziel direkt setzen (wie ein Mausklick auf das Monster).
  // Tippt der Spieler gerade (Chat o. ä.)? Knöpfe zählen nicht, das Bot-Panel auch nicht.
  function typingInField() {
    const el = document.activeElement;
    if (!el) return false;
    if (el.closest?.('.digibot')) return el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'password');
    return el.isContentEditable || el.tagName === 'TEXTAREA' ||
      (el.tagName === 'INPUT' && !['button', 'checkbox', 'radio', 'range', 'submit', 'reset'].includes(el.type));
  }

  function worldScene() {
    try {
      const sc = window.dmo?.game?.scene?.getScene?.('world');
      return typeof sc?.select === 'function' ? digibotScene(sc) : null;
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
  // Normale Monster, die gleich fallen, nicht mit Skills erschlagen (spart DS und DS-Tränke): Rest-HP höchstens so viele
  // Sekunden des eigenen Schadens (gemessen, je Form; enthält Skills – darum nur ein Teil davon)
  const OVERKILL_SHARE = 0.6;
  // Lern-Route: vor dem Kampf mit einem Feldboss auffüllen (live: Mummymon +15 bei 55 % HP begonnen)
  const LR_BOSS_PREP_HP = 70, LR_BOSS_PREP_DS = 40;
  // Lern-Route: Boss, der das Digimon umgehauen hat, so lange aus der Boss-Runde
  const LR_BOSS_FAINT_MS = 30 * 60000;
  // Lern-Route unterwegs: Angreifer, die so viel stärker sind, nicht bekämpfen – zurückrufen und weiter (nach einem
  // Digimon-Wechsel stand ein Lv-43-Digimon zwischen Golemon Lv 70+ und wollte sie besiegen)
  const LR_FLEE_ABOVE = 15;
  const POT_COOLDOWN_MS = 2000;  // gleichen Trank höchstens alle 2 s drücken
  // Geteilter Treffer (share: % der Max-HP des Ziels, auf alle im Kreis verteilt – allein nach den Spieldaten ⅓ von
  // 240 % = 80 %): wird gerade einer angesagt, vorher mit F1 auf SHARE_TOPUP % auffüllen
  const SHARE_TOPUP = 95;
  // Angesagter Treffer, der das DS der Tamer verbrennt (MaloMyotismons Pandæmonium Lost: 45 % der Max-DS je Welle).
  // Fällt das Tamer-DS leer, digitiert der Partner zurück („Eat to stay evolved!“) – live: alle 4 Clavis wurden Patamon.
  // Ergebnis: verbrannter Anteil (0 = nichts angesagt)
  function tamerBurnIncoming(now) {
    let f = 0;
    for (const log of bossSkillLog.values()) for (const [id, e] of log) {
      if (e.phase === 'cast' && e.castEnd > now - 300) f = Math.max(f, Number(content()?.skills?.[id]?.tamerDsBurn) || 0);
    }
    return f;
  }
  // Tamer-Essen (F3): unter der eingestellten Grenze – oder schon vor einem angesagten DS-Brand, wenn das Tamer-DS danach
  // unter die Grenze fiele (mindestens TAMER_BURN_MIN_PCT, damit es auch mit ausgeschalteter Grenze nicht leer läuft)
  const TAMER_BURN_MIN_PCT = 10;
  function tamerFoodNeeded(me, now) {
    if (!(me?.tamerMaxDs > 0)) return false;
    const cur = pct(me.tamerDs, me.tamerMaxDs);
    if (cfg.tdsPot > 0 && cur < cfg.tdsPot) return true;
    const burn = tamerBurnIncoming(now);
    return burn > 0 && cur - burn * 100 < Math.max(cfg.tdsPot, TAMER_BURN_MIN_PCT);
  }
  function shareIncoming(now) {
    for (const log of bossSkillLog.values()) for (const [id, e] of log) {
      if (e.phase === 'cast' && e.castEnd > now && content()?.skills?.[id]?.share) return true;
    }
    return false;
  }
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
    questIdle:false,
    waitForEvents(reason){
      if(!(cfg.hunt||cfg.wboss)||!this.on||!digibotCore.armed||digibotCore.latched)return false;
      this.questIdle=true;autopilot.reset();this.engage=null;this.attackedId=null;
      commands()?.partnerStop?.();this.status=`${reason} – Event-Bereitschaft`;logEvent('auto',this.status);return true;
    },

    can(code, ms, now) { return now - (this.lastPress[code] || 0) >= ms; },
    hit(code,now){if(press(code)===false)return false;this.lastPress[code]=now;return true;},

    toggle(quiet = false) { // quiet: Start/Stopp nicht an die ganze Gruppe melden
      if(digibotAccountQueue.active&&!digibotQueueLaunching){digibotCore.stop('Quest-Runde manuell gestoppt',true);return;}
      const starting = !this.on;
      this.questIdle=false;
      if (starting && !digibotCore.start(digibotManual)) return;
      if (!starting) digibotCore.stop('Bot gestoppt', false);
      this.on = starting;
      if (starting) { digibotNotice?.remove(); digibotNotice=null; }
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
      if (this.on && cfg.dungeon && !dg.inside) dg.reset(); // alter Lauf (geschafft/Fehlversuche/Raum-Stand) zählt nicht
      if (this.on) loadWorld(); // Kartendaten (Portale, Zonen, Schutzzonen) für alle Modi
      if (this.on) this.timer = setInterval(() => this.tick(), TICK_MS);
      this.status = this.on ? 'Bot läuft' : 'Bot aus';
      logEvent('bot', this.on ? `Bot gestartet${cfg.farm ? ' (Boss-Rotation)' : cfg.autopilot ? ' (Quest-Autopilot)' : cfg.questMode ? ' (Quest-Modus)' : ''}` : 'Bot gestoppt');
      if (group.role() === 'leader' && !quiet) {if(this.on)groupPush(true);if(this.on)digibotSend({type:'start',manual:digibotManual===true});else groupSend('stop','bot');}
      schedule();
    },

    tick() { if (!this.on) return; return digibotCore.run('Bot', 50, () => { const before=this.status;try{return this.tickBody();}finally{if(this.status!==before){const st=getStore()?.getState?.();digibotCore.record('Statuswechsel',{action:this.status,map:st?.world?.mapId,channel:st?.world?.channel,target:st?.target?.id,hp:st?.target?.hp});}} }); },
    tickBody() {
      const st = getStore()?.getState?.();
      const now = Date.now();
      digibotResetContext(st);
      if(!cfg.autopilot)this.questIdle=false;
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
        // Lern-Route: im Kampf mit einem Feldboss umgehauen -> diesen Boss eine Weile auslassen (keine Level-Grenze, aber
        // aus Erfahrung lernen)
        const lb = lrOn() && lr.boss;
        if (lb && farm.fight?.key?.startsWith(`${lb.b.map}#${lb.b.index}#`)) {
          (lr.avoid ||= new Map()).set(`${lb.b.map}#${lb.b.species}`, now + LR_BOSS_FAINT_MS);
          logEvent('warn', `Leveln: ${lb.b.name} hat das Digimon umgehauen – ${LR_BOSS_FAINT_MS / 60000} min aus der Boss-Runde`);
          lr.boss = null; farm.fight = null;
        }
        // „Zurück zum Lager“, sobald das Spiel es erlaubt – statt auf die automatische Rückkehr zu warten
        const pr = st.prompt;
        if (pr?.kind === 'fainted' && Date.now() >= (pr.canReviveAt || 0) && commands()?.revive && this.can('revive', 3000, now)) {
          this.lastPress.revive = now; commands().revive();
          logEvent('auto', 'Bewusstlos – zurück zum Lager, sobald es geht');
        }
        autopilot.nav = null; autopilot.arrivedAt = 0; autopilot.idleSince = 0; // nach dem Wiederbeleben Weg neu planen
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
      // geteilter Treffer angesagt (Catastrophe Cannon, Black-Rain-Hülle): bis zum Einschlag möglichst volle HP
      // Lern-Route auf dem Weg zum Feldboss / am Spawnpunkt: vorher auffüllen (im Kampf gelten die normalen Schwellen)
      const prep = lrOn() && !!lr.boss && !(t?.kind === 'mob' && t.hp > 0 && this.attackedId === t.id && lrBossEnt(lr.boss.b)?.id === t.id);
      potion(1, (cfg.hpPot > 0 && pct(p.hp, p.maxHp) < cfg.hpPot) || (shareIncoming(now) && pct(p.hp, p.maxHp) < SHARE_TOPUP)
        || (prep && pct(p.hp, p.maxHp) < LR_BOSS_PREP_HP));
      potion(2, (cfg.dsPot > 0 && pct(p.ds, p.maxDs) < cfg.dsPot) || (prep && pct(p.ds, p.maxDs) < LR_BOSS_PREP_DS));
      potion(3, tamerFoodNeeded(me, now));

      digibotTamerTick(st,now);
      // 1b) Flächenangriffen ausweichen hat Vorrang vor allem anderen
      const kh = keyOfHope(st, now);
      if (kh) { this.status = kh; return; }
      const kg = kohGather(st, now);
      if (kg) { this.status = kg; return; }
      const dg = dodge(st, now);
      if (dg) { this.status = dg; this.attackedId = null; return; }
      const apEvolution=digibotAutopilotEvolveTick(st,now);
      if(apEvolution!==true){this.status=`Autopilot: ${apEvolution}`;return;}
      healSkill(st, now); // Heil-Skill bei niedrigen HP (auch außerhalb des Kampfes)
      noteBosses(now);

      // 2) Ruhemodus: HP unter Schwelle und kein HP-Trank mehr -> keine neuen Kämpfe, bis HP wieder 100 %
      const hpPct = pct(p.hp, p.maxHp);
      if (cfg.autopilot && !cfg.farm) apRefresh(st, now);
      if (group.role() === 'follower' && cfg.autopilot && !autopilot.task) {
        const L = groupLeader(now);
        autopilot.huntSpecies = L && L.mapId === st.world?.mapId ? new Set(L.hunt || []) : new Set();
      }
      const sc = scan(st);
      const sharedMove=digibotSharedStep(st,sc,now);
      if(sharedMove){this.status=sharedMove;return;}
      let attackers = sc ? sc.attackers.map((m) => m.id) : [];
      // 1c) Event (Mega-Jagd): hinreisen, warten, suchen – geht jedem Modus vor (nicht im Dungeon)
      if (!cfg.dungeon && world.state === 'ready') {
        const hv = huntStep(st, sc, now);
        // Event läuft oder steht an: das Feldboss-Ziel der Lern-Route verwerfen (sonst Boss-Tränke über das ganze Event und
        // danach erst die Fahrt zum veralteten Boss) und die Lern-Route pausieren – auch auf dem Weg zur Event-Map
        const huntOn = !!(cfg.hunt && hunt.goal);
        // Weltboss: nur, wenn kein Event läuft oder ansteht (das Event geht vor)
        const wv = !huntOn ? wbStep(st, sc, now) : null;
        const wbOn = !huntOn && !!(cfg.wboss && wb.goal);
        if ((huntOn || wbOn) && lr.boss) { lr.boss = null; lr.chainAt = 0; }
        if (hv) { this.status = `Event: ${hv}`; this.attackedId = null; return; }
        if (wv) { this.status = `Weltboss: ${wv}`; this.attackedId = null; return; }
        if (hunt.selAt === now) { this.status = 'Event: Jagd-Boss anvisiert'; this.attackedId = null; kickTick(); return; }
        // Jagd (Boss in Sicht oder Angreifer): die Lern-Route nicht dazwischen funken lassen – live zog sie den Bot bei
        // Regalecusmon im Wechsel zurück in seine Zone, während der Boss neben ihm kämpfte
        const qb=!huntOn && !wbOn?digibotQuestBossFocus(st,sc):null;
        if(qb && (autopilot.task?.key!==qb.task.key || autopilot.task?.loc?.boss!==true || st.target?.id!==qb.mob.id)){
          autopilot.failed.delete(qb.task.key);
          if(qb.task.loc.key)autopilot.avoidSpots.delete(qb.task.loc.key);
          autopilot.reset();autopilot.task=qb.task;autopilot.huntSpecies=qb.task.species;
          autopilot.route=null;autopilot.tp=null;
          this.questIdle=false;this.attackedId=null;this.engage=null;
          if(this.can('select',SELECT_GAP_MS,now)){this.lastPress.select=now;worldScene()?.select?.(qb.mob.id);}
          this.status=`Autopilot: ${qb.task.label}`;kickTick();return;
        }
        const daily = !huntOn && !wbOn ? digibotDailyStep(st,now) : null;
        if(daily){this.status=`Autopilot: ${daily}`;return;}
        const lv = huntOn || wbOn || cfg.eventsOnly ? null : levelRouteStep(st, sc, now, attackers);
        if (lv) { this.status = `Leveln: ${lv}`; this.attackedId = null; return; }
        attackers = sc ? sc.attackers.map((m) => m.id) : []; // die Lern-Route nimmt aussichtslose Angreifer heraus
      }
      // Boss-Timer: Rotation bzw. Boss-Quest des Autopiloten, dazu die Weltbosse (eine gemeinsame Abfrage)
      if (world.state === 'ready') { const fsel = timerSel(); if (cfg.farm || fsel.length) farmUpdate(st, now, fsel); }
      checkRefusals(st, t, now);
      // Autopilot auf dem Weg zum Abgeben, Annehmen, Sprechen oder zu einem Reise-Ziel: keine Kämpfe, auch nicht gegen
      // Angreifer – Digimon zurückrufen und weiterlaufen
      // Mitläufer: offene Gespräche des Leaders (oder Aufholen) gehen vor – auch vor Angreifern. Sonst reißt ihn z. B. ein
      // Feldboss mitten aus einer Annehmen-/Abgeben-Folge beim NPC, und danach wird das Gespräch nicht mehr angeboten.
      if (group.role() === 'follower' && cfg.autopilot && !cfg.farm && !autopilot.task && !autopilot.mapTalk && world.state === 'ready') {
        const L0 = groupLeader(now);
        if (L0) followerAssign(st, L0, now);
      }
      // Liegengebliebener NPC-Dialog (z. B. die Folgeseite nach Annehmen/Abgeben), während der Bot schon etwas anderes
      // macht (oft gleich ein Kampf): nach kurzer Zeit schließen
      const talking = !!st.dialog && autopilot.task?.npcId === st.dialog.npc && !taskDone(st, autopilot.task);
      if (cfg.autopilot && st.dialog && !talking && !(st.dialog.npc === 'digiphone' && autopilot.tp)) {
        autopilot.dlgIdleAt ||= now;
        if (now - autopilot.dlgIdleAt > 1500) { commands()?.closeDialog?.(); autopilot.dlgIdleAt = 0; }
      } else autopilot.dlgIdleAt = 0;
      // Event-Boss in Sicht: kämpfen – auch wenn der Autopilot gerade zur Abgabe will oder die Rotation woanders hin
      const huntNow = huntPresent(st, sc, now) || wbPresent(st, sc, now) || !!digibotSharedFocus(sc);
      if(this.questIdle&&cfg.autopilot&&autopilot.bountyReturn&&questTasks(st).some(t=>t.purpose==='turnin'))this.questIdle=false;
      if(this.questIdle && !huntNow){
        if(!(cfg.hunt||cfg.wboss)){this.toggle();this.status='Quests fertig – Event-Funktionen ausgeschaltet';return;}
        if(this.attackedId || this.engage){commands()?.partnerStop?.();this.attackedId=null;this.engage=null;}
        this.status='Quests fertig – warte auf aktivierte Events';return;
      }
      // Modus „Nur Event/Weltboss“: außer Event und Weltboss nichts tun (keine Monster suchen, nicht grinden)
      if(cfg.eventsOnly && !huntNow){
        if(this.attackedId || this.engage){commands()?.partnerStop?.();this.attackedId=null;this.engage=null;}
        this.status=!(cfg.hunt||cfg.wboss)?'Nur Event/Weltboss: 🎯 Event und 🌍 Weltboss sind aus – nichts zu tun':`Nur Event/Weltboss: warte auf ${[cfg.hunt&&'Event',cfg.wboss&&'Weltboss'].filter(Boolean).join(' und ')}…`;
        return;
      }
      farm.leave = cfg.farm && !this.resting && !huntNow && farmGoalElsewhere(st, p, now, sc);
      const noFight = !huntNow && ((cfg.autopilot && !cfg.farm && nextIsTurnin(st, now)) || farm.leave);
      if (group.role() === 'leader') group.noFight = noFight; // Mitläufer kämpfen dann auch nicht
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

      // 2a) Boss ruft Adds: zuerst die Adds, dann wieder der Boss (nicht in der Boss-Rotation)
      const add = !noFightEarly(st, now) && !this.resting ? bossAdd(sc) : null;
      if (add && t?.id !== add.id) {
        if (this.can('select', SELECT_GAP_MS, now)) { this.lastPress.select = now; worldScene()?.select?.(add.id); }
        this.attackedId = null;
        this.status = `Adds zuerst: ${content()?.digimon?.[add.species]?.name || add.species}`;
        return;
      }

      // 2b) Channel-Checker: außerhalb von Kämpfen auf den leersten Kanal der Map
      if (!attackers.length && !(t && t.kind === 'mob' && t.hp > 0 && this.attackedId === t.id)) {
        const cc = channelCheck(st, sc, now);
        if (cc) { this.status = cc; return; }
      }

      // 3) Ziel prüfen
      const diff = t ? t.level - p.level : 0;
      // Ziel nicht mehr in der Spielwelt (z. B. Kuramon der Herde am Ei angekommen): nach kurzer Gnadenfrist fallen
      // lassen – sonst „greift“ der Bot minutenlang ein Ziel an, das es nicht mehr gibt (Probelauf Raum 4: 2 von 10 im Enrage)
      const tGone = !!t && t.kind === 'mob' && targetGone(t.id, now);
      const alive = t && t.kind === 'mob' && t.hp > 0 && !tGone;
      const isAttacker = alive && attackers.includes(t.id);
      const fighting = alive && this.attackedId === t.id; // laufender Kampf
      const info = alive && sc ? sc.mobs.find((m) => m.id === t.id) : null;
      // Gesperrt, von anderen belegt oder in der Liste abgewählt -> nicht (neu) angreifen; laufenden Kampf aber beenden
      const blocked = !!info && (info.banned || (!fighting && (info.taken || !info.enabled)));
      const dup = !!info && spreadOn() && !isAttacker && info.cat !== 'boss' && info.grpBy !== null && info.grpBy < group.slot()
        && info.maxHp > 0 && info.hp > info.maxHp * 0.5 && sc.mobs.some((m) => m.id !== info.id && usable(m) && m.grpBy === null && spreadNear(m));
      // Angreifer werden immer bekämpft (auch außerhalb der Level-Range).
      // Im Ruhemodus nur den laufenden Kampf beenden, sonst passende Ziele suchen.
      // Level-Prüfung wie bei der Zielwahl (scan): im Quest-Modus/Autopilot sind schwächere Monster erlaubt.
      // Sonst wählt der Bot ein Ziel aus und verwirft es gleich wieder – endlos.
      const lvlOk = info ? info.inLvl : diff <= cfg.lvlDiff;
      const addTarget = !!add && alive && t.id === add.id; // Add des Bosses: immer bekämpfen, auch außerhalb der Level-/Monster-Auswahl
      const focus = this.resting ? null : huntFocus(sc) || wbFocus(sc) || digibotSharedFocus(sc) || digibotQuestBossFocus(st,sc)?.mob || lrBossFocus(sc) || dungeonFocus(sc) || focusAssist(sc) || farmBossNear(sc); // Leader-Ziel bzw. Boss der Rotation zuerst
      const onFocus = !!focus && alive && t.id === focus.id, offFocus = !!focus && !onFocus && !addTarget; // anderes Ziel -> wechseln
      // ohne Weg zum Ziel (Insel, andere Klippenseite) nicht weiter draufhalten – außer Fokus (Boss/Leader-Ziel) und Adds
      const noPath = !!info && info.reach === false && !onFocus && !addTarget;
      const defendOnly = this.defendOnly === now && !onFocus; // Warten auf Event/Weltboss: nur Angreifer abwehren
      const valid = !noFight && !dup && !offFocus && !noPath && !(defendOnly && !isAttacker) && !(alive && safeHeld(t.id, now)) && (isAttacker || addTarget || onFocus || (!blocked && (this.resting ? fighting : alive && lvlOk)));
      // Kampf gegen gesuchte Beute: Gebiet ist nicht leer (die 90-s-Leerlaufuhr lief sonst während der Kämpfe weiter)
      if (valid && alive && cfg.autopilot && autopilot.task?.kind === 'hunt' && autopilot.task.species?.has?.(info?.species)) autopilot.idleSince = 0;
      if (!valid) {
        this.attackedId = null;
        this.engage = null;
        const scene = worldScene();
        if (scene && sc) {
          // Autopilot: vor dem Jagen erst in die gewünschte Form digitieren. Boss-Rotation genauso, zwischen den Kämpfen
          // (sonst digitieren in der Gruppe nur die Mitläufer, der Leader in der Rotation nicht).
          const at = autopilot.task;
          const folIdle = group.role() === 'follower' && !at; // Mitläufer zwischen den Kämpfen
          const questMon = !digibotQuestPartner(st) || activePartner(st)?.partnerId === digibotQuestPartner(st);
          const farmEvo = cfg.farm && questMon;
          // Dungeon: vor dem Betreten (an der Tür) und zwischen den Kämpfen – z. B. nach einem Zurück-Digitieren durch Infermon
          // Event/Weltboss (3.0.5): in jedem Modus – auch Grinden und „Nur Event/WB“ – und auch, wenn der Autopilot gerade
          // keine Jagd-Aufgabe hat (das Event setzt sie zurück: vorher kämpfte er beim Event in der Grundform)
          const eventEvo = (huntNow || (cfg.hunt && hunt.goal) || (cfg.wboss && wb.goal) || cfg.eventsOnly) && questMon && !cfg.dungeon;
          if (!attackers.length && (eventEvo || farmEvo || (cfg.dungeon && questMon) || (!cfg.farm && cfg.autopilot && (folIdle || (at?.kind === 'hunt' && st.world?.mapId === at.loc.mapId && questMon))))) {
            const ev = eventEvo ? digibotEventEvolve(st, sc, now) : autopilotEvolution(st, now);
            if (ev !== true) { this.status = `${eventEvo ? 'Event/Weltboss' : cfg.farm ? 'Bosse' : cfg.dungeon ? 'Dungeon' : 'Autopilot'}: ${ev}`; return; }
          }
          // Direkt das beste Ziel anvisieren
          // Mitläufer: vor dem nächsten Kampf prüfen, ob ein Gespräch nachzumachen oder aufzuholen ist
          const folBusy = group.role() === 'follower' && autopilot.task && PASSIVE(autopilot.task) && !taskDone(st, autopilot.task);
          const next = noFight || folBusy ? null : pickTarget(sc, this.resting);
          if (next) {
            if (this.can('select', SELECT_GAP_MS, now)) { this.lastPress.select = now; scene.select(next.id); kickTick(); } // gleich angreifen, nicht erst im nächsten Takt
            this.status = `${next.attacker ? 'Angreifer' : 'Nächstes Ziel'}: Lv ${next.level} · ${Math.round(next.d)} px`;
          } else if (huntNow && !this.resting) {
            this.status = `${wbPresent(st, sc, now) ? 'Weltboss' : 'Event: Jagd-Boss'} gerade nicht angreifbar – warte`;
          } else if (cfg.dungeon) {
            this.status = `Dungeon: ${dungeonStep(st, sc, now)}`;
          } else if (cfg.farm && !this.resting) {
            this.status = `Bosse: ${farmStep(st, sc, now)}`;
          } else if (cfg.autopilot && (!this.resting || noFight)) {
            const s = autopilotStep(st, sc, now);
            if (s === null) {
              if(digibotQueueComplete(st))return;
              // „nur erledigen, nicht abgeben“: sagen, wie viele fertig auf das Abgeben warten
              const ready = cfg.apNoTurnin ? Object.values(st.me?.quests || {}).filter((q) => q.state === 2).length : 0;
              const why = ready ? `alles erledigt – ${ready} Quest${ready > 1 ? 's' : ''} fertig zum Abgeben (machst du selbst)` : 'keine machbaren Quests mehr';
              if(this.waitForEvents(why))return;
              this.toggle();
              this.status = `Autopilot: ${why} – Bot gestoppt`;
              logEvent('auto', `${why[0].toUpperCase()}${why.slice(1)} – Bot gestoppt`);
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

      if(onFocus||info?.cat==='boss'){
        const walking=digibotBossWalkIn(st,t,now);
        if(walking){this.status=walking;return;}
      }
      const nativeTravel=digibotNativeAttackTravel(st,t,now);
      if(nativeTravel&&this.engage?.id===t.id)this.engage.since=now;
      // 4) Hängen-Erkennung: verliert das Ziel lange keine HP (unerreichbar?), aufgeben und 1 min sperren.
      //    Angreifer sind ausgenommen – die kommen ja zu uns.
      if (!this.engage || this.engage.id !== t.id || t.hp < this.engage.hp || t.maxHp !== this.engage.maxHp || digibotCombat.lastDamage(t.id) > this.engage.since) {
        this.engage = { id: t.id, hp: t.hp, maxHp:t.maxHp, since: now };
      } else if (!isAttacker && now - this.engage.since > STUCK_MS && onFocus && (huntFocus(sc)?.id === t.id || wbFocus(sc)?.id === t.id)) {
        // Event-/Weltboss (Schutzphase, Formwechsel): nicht sperren – weiter mit Taste 1, Skills erst, wenn er wieder HP verliert
        if (!this.engage.noDmg) { this.engage.noDmg = true; logEvent('warn', `${t.name}: nimmt gerade keinen Schaden – nur Taste 1, Skills warten`); }
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
      const rp = refusal.repos;
      if (rp && rp.id === t.id && now < rp.until) {
        const me3 = controlled(st);
        const dr = me3 ? Math.hypot(me3.x - rp.x, me3.y - rp.y) : 0;
        if (dr > 18) {
          if (now - refusal.lastTap > 600) { refusal.lastTap = now; worldScene()?.tapGround?.(rp.x, rp.y); }
          if (this.can('follow', 1500, now)) { this.lastPress.follow = now; commands()?.partnerFollow?.(); }
          this.engage = null; this.attackedId = null;
          this.status = `${t.name}: Digimon kam nicht hin – wechsle Position (${Math.round(dr)} px)…`;
          return;
        }
        refusal.repos = null; // angekommen -> gleich neu angreifen
      } else if (rp && (rp.id !== t.id || now >= rp.until)) refusal.repos = null;
      if (now - refusal.rangeAt < 2500) {
        const te = ents?.get?.(t.id), me2 = controlled(st);
        if (te && me2 && now - refusal.lastTap > 700) {
          refusal.lastTap = now;
          worldScene()?.tapGround?.(me2.x + (te.x - me2.x) * 0.6, me2.y + (te.y - me2.y) * 0.6);
        }
        this.status = `Zu weit weg – gehe näher an ${t.name} heran…`;
      }
      const sz = leaveSafeZone(st, ents?.get?.(t.id), now);
      if (sz) {
        this.engage = null; this.attackedId = null;
        // nur neue Ausflüge zählen: dazwischen wurde angegriffen (nicht jeden Takt desselben Herauslaufens)
        if (!safeState.inZone || safeState.flipFor !== t.id) noteSafeFlip(t.id, t.name, now);
        safeState.inZone = true; safeState.flipFor = t.id;
        this.status = safeHeld(t.id, now) ? `${t.name}: an der Schutzzone – lasse ihn kurz in Ruhe` : sz;
        if (safeHeld(t.id, now)) commands()?.partnerFollow?.();
        return;
      }
      safeState.inZone = false;

      const formationStatus=digibotPositionBoss(st,t,now);
      if(formationStatus){this.status=formationStatus;this.engage=null;return;}

      // 5) Angreifen
      let inputBlocked=null;
      if ((this.attackedId !== t.id || this.can('Digit1', ATTACK_REPEAT_MS, now)) && !(nativeTravel&&(this.attackedId===t.id||ents?.get?.(p.entityId)?.targetId===t.id))) {
        if(this.hit('Digit1',now)===false)inputBlocked=digibotLastInputBlock?.reason||'Kampfeingabe zurückgehalten';
        else this.attackedId=t.id;
      }
      this.status = `${this.resting ? 'Ruhe – beende Kampf' : isAttacker ? 'Wehre ab' : 'Greife an'}: ` +
        `${t.name} Lv ${t.level} (${diff > 0 ? '+' : ''}${diff})`;
      if(inputBlocked)this.status+=` · ${inputBlocked}`;

      if(nativeTravel){this.status+=' · Annäherung über Spiel-Wegfindung';return;}

      // 6) Skills auf 2–6: den ersten aktivierten, bereiten Skill wirken (einer pro Durchgang)
      if (p.evolving || !this.can('skill', SKILL_GAP_MS, now)) return;
      if (this.engage?.noDmg) { this.status += ' · nimmt keinen Schaden – Skills warten'; return; }
      if (farmShielded(t, now)) { this.status += ' · Spawn-Schutz – Skills warten'; return; }
      if (info?.cat === 'normal' && t.maxHp > 0 && t.hp <= lrDps(p) * OVERKILL_SHARE) return; // fällt gleich: DS sparen
      let held = null;
      for (const k of SKILL_KEYS) {
        if (!skillOn(st, k) || healAt(st, k)) continue; // Heil-Skills nur über healSkill
        const s = skillOnKey(st, k);
        if (s && isKoh(s.skill) && cfg.koh) continue; // nur gegen große Raid-Angriffe
        if (!s || s.cdLeft > 0 || s.skill.unlocked === false || p.ds < (s.skill.dsCost || 0)) continue;
        if (!this.can('Digit' + k, SKILL_GAP_MS * 2, now)) continue; // Server-Cooldown noch nicht angekommen
        const why = skillUnsafe(st, t, s.skill, now, Number(String(s.ref).slice(6))); // zu langer Cast vor einer möglichen Boss-Attacke -> nächster Skill
        if (why) { held ||= `${s.skill.name} zurückgehalten: ${why}`; continue; }
        if(this.hit('Digit'+k,now)===false){held=digibotLastInputBlock?.reason||'Kampfeingabe zurückgehalten';break;}
        this.lastPress.skill=now;
        this.status += ` · Skill ${k}: ${s.skill.name}`;
        held = null;
        break;
      }
      if(held && held!==inputBlocked)this.status+=` · ${held}`;
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
    digibotQueueRender();
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
    if (cfg.expMess) {
      hookBossEvents(); expmTick(st, now);
      const ec = panel.querySelector('[data-f="expmcount"]'), et = `(${expm.data?.length || 0} Kills, ${Object.keys(expm.levels || {}).length} Level)`;
      if (ec && ec.textContent !== et) ec.textContent = et;
    }
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
    // Nächste Map: Restzeit bis zum Level, ab dem ihre niedrigsten Monster in der Grenze liegen (bei der aktuellen EXP/min)
    const nm = nextMapInfo(st), nmEl = panel.querySelector('[data-f="nextmap"]');
    const nmTxt = !nm ? '–' : nm.level == null ? `${nm.name} – Wechsel nicht in Sicht` : nm.need <= 0 ? `${nm.name} – jetzt (ab Lv ${nm.level})` : `${nm.name} ab Lv ${nm.level} · ${rate > 0 ? 'noch ' + fmtDur(nm.need / rate * 60000) : 'noch keine EXP-Messung'}`;
    if (nmEl && nmEl.textContent !== nmTxt) nmEl.textContent = nmTxt;
    tip('nextmap', nm ? `Die Lern-Route wechselt, sobald ${nm.name} mindestens ${Math.round((LR_SWITCH_GAIN - 1) * 100)} % mehr EXP/min bringt als ${nm.curName} (Grinden + Feldbosse der Rotation)\n`
      + (nm.level == null ? 'In den nächsten 30 Level nicht.' : `Bei Lv ${nm.level}: ~${fmt(nm.rn)} gegenüber ~${fmt(nm.rc)} EXP/min (geschätzt)\n`)
      + (nm.need > 0 ? `Noch ${fmt(nm.need)} EXP${rate > 0 ? ` · bei ${fmt(rate)} EXP/min (Schnitt der letzten 5 min) ≈ ${fmtDur(nm.need / rate * 60000)}` : ''}` : 'Level erreicht')
      : 'Keine nächste Map gefunden (Stadt oder letzte Map der Serie).');
    panel.querySelector('[data-f="sess"]').textContent =
      exp.last ? `${fmt(exp.total)} (${fmtDur(now - exp.start)})` : '–';

    setBar(panel, 'tds', me?.tamerDs, me?.tamerMaxDs);

    const mtg = panel.querySelector('[data-bar="mtg"]');
    if (mtg) { const tn = t ? `Ziel: ${t.name ?? '?'}${t.level ? ' · Lv ' + t.level : ''}${t.boss ? ' · BOSS' : ''}` : 'Kein Ziel'; if (mtg.title !== tn) mtg.title = tn; }
    panel.querySelector('[data-f="kills"]').textContent = fmt(sess.kills);
    panel.querySelector('[data-f="sturn"]').textContent = fmt(sess.turnins);
    panel.querySelector('[data-f="sfaint"]').textContent = fmt(sess.faints);

    const sc = scan(st);
    drawRadar(panel.querySelector('.digibot__radar'), sc, t?.id);
    panel.querySelector('[data-f="radar"]').textContent = sc
      ? `Radar · ${sc.mobs.length} Monster · ${sc.mobs.filter(usable).length} passend im Radius`
      : 'Radar';
    renderMobList(st, sc);
    renderQuests(st, sc);
    renderFarm(st);
    syncModeScope();
    renderLage(st, Date.now());
    renderAccounts(st);
    renderTop(st);
    renderQueue(st);
    watchGame(st);
    renderLog();

    const run = panel.querySelector('[data-act="bot"]');
    run.classList.toggle('on', bot.on);
    const mode = modeOf();
    run.textContent = `${bot.on ? '■ Stopp' : '▶ Start'} · ${mode === 'farm' ? (cfg.farmMode === 'named' ? 'Named-Elite-Runde' : 'Boss-Rotation') : MODES[mode]}`;
    if(digibotAccountQueue.active)run.textContent='■ Quest-Runde stoppen';
    panel.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    panel.querySelector('[data-act="hunt"]')?.classList.toggle('on', !!cfg.hunt);
    panel.querySelector('[data-act="wboss"]')?.classList.toggle('on', !!cfg.wboss);
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
      // Haken und Heal-Auswahl zeigen die Einstellung der aktuellen Digitationsform
      const doc = row.ownerDocument, cb = row.querySelector('[data-skillcfg]'), hs = row.querySelector('[data-healcfg]');
      const on = skillOn(st, k), hv = String(healAt(st, k));
      if (cb && cb !== doc.activeElement && cb.checked !== on) cb.checked = on;
      if (hs && hs !== doc.activeElement && hs.value !== hv) hs.value = hv;
      hs?.classList.toggle('on', hv !== '0');
    }
    const sf = panel.querySelector('[data-f="skillsfor"]');
    const sfT = p?.species ? `· ${speciesName(p.species)}` : '';
    if (sf && sf.textContent !== sfT) { sf.textContent = sfT; sf.title = 'Haken und Heal gelten nur für diese Digitationsform'; }
    // alte Heil-Einstellung (vor 2.12, für alle Formen) einmalig der aktuellen Form zuordnen
    if (p?.species && cfg.heal && Object.keys(cfg.heal).length) {
      const set = editSkillSet(st);
      set.heal = { ...cfg.heal, ...set.heal };
      cfg.heal = {};
      saveCfg();
      logEvent('bot', `Heil-Skills gelten jetzt nur für ${speciesName(p.species)} (je Digitationsform einstellbar)`);
    }
    trackLoot(st);
    renderLoot();
    mobExpTick(st, Date.now()); renderMobExp(st);
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
    digibotRenderHistory();
    if (!panel.querySelector('[data-page="log"]').classList.contains('on') || logShown === logSig) return;
    logShown = logSig;
    const esc = (x) => String(x).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const fk = LOG_FILTERS[cfg.logFilter] ? cfg.logFilter : 'all';
    panel.querySelectorAll('[data-logf]').forEach((b) => b.classList.toggle('on', b.dataset.logf === fk));
    const list = logbook.filter(LOG_FILTERS[fk]);
    panel.querySelector('[data-f="logcount"]').textContent = fk === 'all' ? `· ${logbook.length}` : `· ${list.length} von ${logbook.length}`;
    panel.querySelector('[data-f="log"]').innerHTML = list.length
      ? list.slice().reverse().map((e) => `<div style="--c:${LOG_COLORS[e.type] || '#888'}"><time>${hhmmss(e.t)}</time>` +
        `<span>${esc(e.text)}${e.n > 1 ? ` <b>×${e.n}</b>` : ''}</span></div>`).join('')
      : `<div class="digibot__none">${logbook.length ? 'Keine Einträge in diesem Filter.' : 'Noch keine Einträge.'}</div>`;
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
        : /^levelEvo/.test(key) ? `${speciesName(val)} (anderes Digimon)`
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
    const dir = panel.querySelector('[data-apsel="apSweepDir"]');
    if (dir && panel.ownerDocument.activeElement !== dir) dir.value = cfg.apSweepDir === 'up' ? 'up' : 'down';
    panel.querySelectorAll('[data-sweeponly]').forEach((el) => el.classList.toggle('hide', cfg.apOrder !== 'sweep'));
    const team = teamOf(st);
    const teamOpts = team.map((p) => [p.partnerId, partnerLabel(p) + (p.active ? ' (aktiv)' : '')]);
    fillSelect('apQuestPartner', [['', 'aktuelles behalten'], ...teamOpts]);
    fillSelect('apTurninPartner', [['', 'wie Quest-Digimon'], ...teamOpts]);
    const act = activePartner(st);
    const evoFor = !digibotQuestPartner(st) || act?.partnerId === digibotQuestPartner(st);
    const evos = evoFor ? (st?.me?.partner?.evolutions || []).filter((e) => !e.isCurrent || e.species !== st.me.partner.species) : [];
    fillSelect('apEvo', [['', 'keine Digitation'], [EVO_MAX, '⬆ höchstmögliche Digitation'], ...evos.map((e) => [e.species,
      `${speciesName(e.species)} (${e.stage}, ab Lv ${e.level}${e.unlocked === false ? ', gesperrt' : ''})`])]);
    // Lern-Route: Formen des aktiven Digimons
    const allEvos = (st?.me?.partner?.evolutions || []).map((e) => [e.species, `${speciesName(e.species)} (${e.stage}, ab Lv ${e.level}${e.unlocked === false ? ', gesperrt' : ''})`]);
    fillSelect('levelEvoForm', [['', 'keine Digitation'], [EVO_MAX, '⬆ höchstmögliche Digitation'], [EVO_ARMOR, '🛡 höchste Armor-Form'], ...allEvos]);
    fillSelect('levelEvoDark', [['', 'keine Digitation'], [EVO_ARMOR, '🛡 höchste Armor-Form'], [EVO_MAX, '⬆ höchstmögliche Digitation'], ...allEvos]);
    fillSelect('apStartMap', world.state === 'ready'
      ? [['', cfg.apSweepDir === 'up' ? 'niedrigste erreichbare' : 'höchste erreichbare'], ...sweepList().map((m) => [m.id,
        `${(m.series ?? 1) === 2 ? 'A02' : 'A1'} · ${m.name} (${m.levelRange?.join('–')})${hops(st?.world?.mapId, m.id) === Infinity ? ' – nicht erreichbar' : ''}`])]
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

  const pageOn = (p) => !!panel.querySelector(`[data-page="${p}"]`)?.classList.contains('on');
  // Bereiche, die im aktuellen Modus nicht gelten, abblenden (z. B. Autopilot-Optionen in der Boss-Rotation)
  const MODE_NAMES = { grind: 'Grinden', quest: 'Quest-Jagd', auto: 'Autopilot', farm: 'Bosse', dungeon: 'Dungeon', events: 'Nur Event/Weltboss' };
  function syncModeScope() {
    const m = modeOf();
    panel.querySelectorAll('[data-modes]').forEach((el) => {
      const modes = el.dataset.modes.split(' '), off = !modes.includes(m);
      if (el.classList.contains('is-off') !== off) el.classList.toggle('is-off', off);
      const note = `· gilt nur im Modus ${modes.map((x) => MODE_NAMES[x] || x).join(' / ')}`;
      if (el.dataset.offnote !== note) el.dataset.offnote = note;
    });
    const prof = panel.querySelector('[data-f="prof"]'), txt = '🌐 Einstellungen für alle Accounts';
    if (prof && prof.textContent !== txt) prof.textContent = txt;
  }
  let farmPickSig = '';
  function renderFarm(st) {
    hookBossEvents();
    if (pageOn('attack')) renderBossSkills(st); // Boss-Attacken stehen im Kampf-Reiter
    if (!pageOn('farm')) return;
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
        <label data-q="${esc(`${b.name} ${b.mapName}`.toLowerCase())}"><input type="checkbox" data-farmboss="${esc(b.id)}" ${on.has(b.id) ? 'checked' : ''}>
          <span title="${esc(b.mapName)}">${esc(b.name)} · ${esc(b.mapName)}</span><em>Lv ${b.level} · ${Math.round(b.respawnMs / 60000)} min</em></label>`).join('')
        : '<div class="digibot__none">warte auf Spielwelt…</div>';
      filterBossPick();
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

  // Suchfeld über der Boss-Liste: Einträge ausblenden, deren Boss-/Map-Name den Suchtext nicht enthält
  function filterBossPick() {
    const q = (panel.querySelector('[data-bosssearch]')?.value || '').trim().toLowerCase();
    const box = panel.querySelector('[data-f="bosspick"]');
    let shown = 0;
    box.querySelectorAll('label[data-q]').forEach((l) => { const hit = !q || l.dataset.q.includes(q); l.classList.toggle('hide', !hit); if (hit) shown++; });
    let none = box.querySelector('.digibot__nohit');
    if (q && !shown) { if (!none) { none = document.createElement('div'); none.className = 'digibot__none digibot__nohit'; box.append(none); } none.textContent = `Kein Boss passt zu „${q}“.`; }
    else none?.remove();
  }

  function renderQuests(st, sc) {
    if ((pageOn('mon') || pageOn('attack')) && !pageOn('quest')) { renderApConfig(st); return; } // Partner/Digitation (Digimon), Lern-Route-Formen (Kampf)
    if (!pageOn('quest')) return;
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
    // nach Serie getrennt: Adventure und Adventure 02 – die Serie der aktuellen Map zuerst
    const cur = worldSeries(st), SERIES = { 1: 'Adventure', 2: 'Adventure 02' };
    const groups = [cur, ...[1, 2].filter((n) => n !== cur)].map((n) => [n, list.filter((q) => questSeries(q.id) === n)]).filter(([, qs]) => qs.length);
    const card = (q) => {
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
    };
    box.innerHTML = groups.map(([n, qs]) => `<div class="digibot__qhead">${SERIES[n]} · ${qs.length}</div>${qs.map(card).join('')}`).join('');
  }

  const CSS_ESC = (s) => (window.CSS?.escape ? window.CSS.escape(s) : s.replace(/["\\]/g, '\\$&'));

  function accRows() {
    return accounts.list.map((a, i) => `
      <div class="digibot__accrow">
        <input type="checkbox" data-acc="${i}" data-k="on" ${a.on ? 'checked' : ''} title="Beim Gruppenstart dabei">
        <input type="radio" name="digibot-leader" data-accleader="${i}" ${accounts.leader === i ? 'checked' : ''} title="Leader">
        <input type="text" data-acc="${i}" data-k="user" placeholder="Account ${i + 1}: Benutzername" value="${escAttr(a.user)}" autocomplete="off" spellcheck="false">
        <input type="password" data-queue-password="${i}" placeholder="Quest-Runde: Passwort bis zum Neuladen" autocomplete="new-password">
        <div class="digibot__accinfo" data-accinfo="${i}">–</div>
      </div>`).join('');
  }
  function renderAccounts(st) {
    if (!panel.querySelector('[data-page="acc"]').classList.contains('on')) return;
    const now = Date.now(), C = content();
    accounts.list.forEach((a, i) => {
      for (const k of ['user']) { // von einem anderen Fenster gespeichert -> übernehmen (nicht das Feld, in dem getippt wird)
        const el = panel.querySelector(`[data-acc="${i}"][data-k="${k}"]`);
        if (el && el !== document.activeElement && el.value !== a[k]) el.value = a[k];
      }
      const cb = panel.querySelector(`[data-acc="${i}"][data-k="on"]`); if (cb && cb.checked !== !!a.on) cb.checked = !!a.on;
      const rb = panel.querySelector(`[data-accleader="${i}"]`); if (rb && rb.checked !== (accounts.leader === i)) rb.checked = accounts.leader === i;
      const self = group.active() && group.slot() === i;
      const p = self ? groupState(st, now) : fresh(group.peers.get(i), now) ? group.peers.get(i) : null;
      const info = panel.querySelector(`[data-accinfo="${i}"]`);
      let text;
      if (p) {
        const where = p.inWorld ? `${C?.maps?.[p.mapId]?.name || p.mapId} Ch${p.channel}` : (p.login || 'nicht in der Welt');
        text = `● ${p.name || a.char || a.user}${self ? ' (dieses Fenster)' : ''} · ${p.role === 'leader' ? 'Leader' : 'folgt'} · ${where}${p.bot ? ` · ${p.status}` : ''}`;
      } else text = a.char ? `zuletzt: ${a.char}${a.at ? ` · vor ${fmtDur(now - a.at)}` : ''}` : a.user ? 'Charakter noch unbekannt' : '';
      if (info.textContent !== text) { info.textContent = text; info.title = text; }
      info.classList.toggle('on', !!p);
    });
    const sel = panel.querySelector('[data-accslot]');
    if (sel && sel !== document.activeElement) {
      accounts.list.forEach((a, i) => { const o = sel.options[i + 1], t = `Account ${i + 1}${a.user ? ` (${a.user})` : ''}`; if (o && o.textContent !== t) o.textContent = t; });
      const v = group.active() ? String(group.slot()) : '';
      if (sel.value !== v) sel.value = v;
    }
    // Ist hier ein anderer Account eingeloggt als der, für den das Fenster eingestellt ist?
    const slotUser = group.active() ? accounts.list[group.slot()]?.user?.trim() : '';
    const loggedIn = String(st?.session?.username || '');
    const wrong = !!slotUser && !!loggedIn && loggedIn.toLowerCase() !== slotUser.toLowerCase();
    const gi = panel.querySelector('[data-f="grpinfo"]');
    const text = group.active()
      ? `Dieses Fenster: Account ${group.slot() + 1} · ${group.role() === 'leader' ? 'Leader' : 'folgt dem Leader'}${wrong ? ` · ⚠ hier ist ${loggedIn} eingeloggt, nicht ${slotUser} – oben den richtigen Account wählen` : ''}${group.login.msg ? ` · ${group.login.msg}` : ''}${group.msg ? ` · ${group.msg}` : ''}`
      : `Dieses Fenster ist in keiner Gruppe.${group.msg ? ` · ${group.msg}` : ''}`;
    if (gi.textContent !== text) gi.textContent = text;
    gi.classList.toggle('warn', wrong);
    renderGroupCards(st, now);
  }
  // Gruppe: Modus-Schalter und eine Karte pro Mitglied (Name, Rolle, Ort, HP, Status, Quest-Abgleich mit dem Leader)
  function renderGroupCards(st, now) {
    const mode = !accounts.mirror ? (accounts.dungeon ? 'dungeon' : accounts.leadBoss ? 'boss' : 'bots') : accounts.mirrorAtk ? 'both' : 'move';
    const spr = panel.querySelector('[data-accspread]'); if (spr && spr !== document.activeElement) spr.checked = !!accounts.spread;
    // Verteilen wirkt nur, wenn alle ihren Bot fahren (Modus Quests) – beim Spiegeln, in Bosse und Dungeon nicht: sichtbar machen
    const sprOff = mode !== 'bots', sprNote = panel.querySelector('[data-f="spreadoff"]');
    if (spr) spr.closest('label').style.opacity = sprOff ? '.5' : '';
    if (sprNote && sprNote.textContent !== (sprOff ? ' · gilt nur im Modus 📜 Quests' : '')) sprNote.textContent = sprOff ? ' · gilt nur im Modus 📜 Quests' : '';
    const srv = panel.querySelector('[data-accserve]'); if (srv && srv !== document.activeElement) srv.checked = !!accounts.serve;
    panel.querySelectorAll('[data-gmode]').forEach((b) => b.classList.toggle('on', b.dataset.gmode === mode));
    const box = panel.querySelector('[data-f="gcards"]');
    const C = content(), esc = (x) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const stateOf = (i) => (group.active() && group.slot() === i ? groupState(st, now) : fresh(group.peers.get(i), now) ? group.peers.get(i) : null);
    const L = stateOf(accounts.leader);
    const active = (qs) => Object.entries(qs || {}).filter(([, q]) => q.state === 1 || q.state === 2).map(([id]) => id);
    const cards = accounts.list.map((a, i) => ({ a, i })).filter(({ a }) => a.on && a.user.trim()).map(({ a, i }) => {
      const p = stateOf(i), lead = i === accounts.leader;
      const name = p?.name || a.char || a.user;
      const where = p ? (p.inWorld ? `${C?.maps?.[p.mapId]?.name || p.mapId} · Ch ${p.channel}` : (p.login || 'nicht in der Welt'))
        : `offline${a.at ? ` · zuletzt vor ${fmtDur(now - a.at)}` : ''}`;
      let sync = '';
      if (!lead && p?.inWorld && L?.inWorld) {
        const mine = active(p.quests), theirs = active(L.quests);
        const diff = mine.filter((id) => !theirs.includes(id)).length + theirs.filter((id) => !mine.includes(id)).length;
        sync = diff ? `<div class="sync bad">⚠ ${diff} Quest${diff > 1 ? 's' : ''} anders als beim Leader</div>` : '<div class="sync ok">✓ gleiche Quests wie der Leader</div>';
      }
      return `<div class="digibot__gcard${lead ? ' lead' : ''}${p ? '' : ' off'}">
        <header><span>${p ? '●' : '○'} ${esc(name)}</span><b class="role">${lead ? 'Leader' : 'folgt'}</b></header>
        <div class="where">${esc(where)}</div>
        ${p?.hp != null ? `<div class="hpb" title="HP ${p.hp} %"><i style="width:${p.hp}%"></i></div>` : ''}
        ${p ? `<div class="st" title="${esc(p.bot ? p.status : 'Bot aus')}">${esc(p.bot ? p.status : 'Bot aus')}</div>` : ''}${sync}
      </div>`;
    });
    const html = cards.length ? cards.join('') : '<div class="digibot__none">Noch keine Accounts – unten unter „Accounts verwalten“ eintragen.</div>';
    if (box.innerHTML !== html) box.innerHTML = html;
  }
  // Übersicht „Lage“: Modus, Ort, Ziel, Aufgabe; in der Gruppe eine Zeile je Bot
  function renderLage(st, now) {
    if (!pageOn('data')) return;
    const box = panel.querySelector('[data-f="lage"]');
    if (!box) return;
    const C = content(), esc = (x) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const mapName = (id) => C?.maps?.[id]?.name || id || '?';
    const row = (k, txt, title = txt) => `<div class="row"><span class="k">${k}</span><span title="${esc(title)}">${esc(txt)}</span></div>`;
    const rows = [];
    rows.push(row(bot.on ? '▶' : '■', `${MODE_NAMES[modeOf()]} · ${bot.on ? 'läuft' : 'aus'} · ${st?.world ? `${mapName(st.world.mapId)} Ch ${st.world.channel ?? 1}` : 'nicht in der Welt'}`));
    const t = st?.target;
    if (t && t.hp > 0) rows.push(row('🎯', `${t.name ?? '?'}${t.level ? ` Lv ${t.level}` : ''} · ${t.maxHp ? Math.round(t.hp / t.maxHp * 100) : '?'} %`));
    const task = cfg.dungeon ? dungeonLabel() : cfg.farm ? (farm.goal ? `Boss: ${content()?.digimon?.[farm.goal.species]?.name || farm.goal.species} (${mapName(farm.goal.map)} Ch ${farm.goal.ch})` : '')
      : autopilot.mapTalk ? 'Abgeben & Annehmen auf dieser Map' : autopilot.task?.label || '';
    if (task) rows.push(row('📌', task));
    if (bot.status) rows.push(row('💬', bot.status));
    if (group.active()) {
      const stateOf = (i) => (group.slot() === i ? groupState(st, now) : fresh(group.peers.get(i), now) ? group.peers.get(i) : null);
      for (const [i, a] of accounts.list.entries()) {
        if (!a.on || !a.user.trim()) continue;
        const p = stateOf(i), lead = i === accounts.leader;
        const name = (lead ? '◉ ' : '') + (p?.name || a.char || a.user);
        if (!p) { rows.push(`<div class="mem"><b>${esc(name)}</b><span></span><span class="st">offline</span></div>`); continue; }
        const koh = p.kohAt == null ? '' : p.kohAt <= now ? ' · 🔑 bereit' : ` · 🔑 ${Math.ceil((p.kohAt - now) / 1000)} s`;
        const where = p.inWorld ? `${mapName(p.mapId)} Ch ${p.channel}` : 'nicht in der Welt';
        const stt = `${where}${koh} · ${p.bot ? p.status : 'Bot aus'}`;
        const hp = p.hp ?? 0;
        rows.push(`<div class="mem"><b>${esc(name)}</b><span class="hp${hp < 35 ? ' low' : ''}" title="HP ${hp} %"><i style="width:${hp}%"></i></span><span class="st" title="${esc(stt)}">${esc(stt)}</span></div>`);
      }
    }
    const html = rows.join('');
    if (box.innerHTML !== html) box.innerHTML = html;
  }
  // Kopfbereich: Gruppen-Chip und aktuelle Aufgabe mit Fortschritt
  function renderTop(st) {
    const now = Date.now();
    const chip = panel.querySelector('[data-f="gchip"]');
    let ct = '';
    if (group.active()) {
      const on = accounts.list.map((a, i) => i).filter((i) => accounts.list[i].on && accounts.list[i].user.trim());
      const online = on.filter((i) => i === group.slot() || fresh(group.peers.get(i), now)).length;
      ct = `● ${group.role() === 'leader' ? 'Leader' : 'Mitläufer'} ${online}/${on.length}`;
    }
    if (chip.textContent !== ct) chip.textContent = ct;
    chip.classList.toggle('on', !!ct);
    const box = panel.querySelector('[data-f="task"]'), at = autopilot.task;
    let tl = '', prog = null;
    if (bot.on && cfg.autopilot && !cfg.farm && at && st?.me) {
      tl = at.label;
      if (at.questId && at.objIndex != null && at.need) {
        const q = planQuests(st)[at.questId], c = Math.min(q?.counters?.[at.objIndex] ?? 0, at.need);
        tl += ` · ${c}/${at.need}`; prog = c / at.need;
      }
    }
    box.classList.toggle('on', !!tl);
    const te = box.querySelector('.t');
    if (te.textContent !== tl) { te.textContent = tl; te.title = tl; }
    box.querySelector('.pb').classList.toggle('none', prog == null);
    if (prog != null) box.querySelector('.pb i').style.width = `${Math.round(prog * 100)}%`;
  }
  // Übersicht: aktuelle Aufgabe und die nächsten Schritte (alle 2 s neu berechnet)
  const queueCache = { at: 0, html: '' };
  function renderQueue(st) {
    if (!panel.querySelector('[data-page="data"]').classList.contains('on')) return;
    const now = Date.now();
    if (now - queueCache.at < 2000) return;
    queueCache.at = now;
    const esc = (x) => String(x ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    let rows = [];
    if (group.role() === 'follower') {
      const L = groupLeader(now);
      if (autopilot.task) rows.push({ cur: true, text: autopilot.task.label });
      rows.push({ text: L ? `Folgt ${L.name || 'dem Leader'}${L.task ? ` – ${L.task.label}` : ''}` : 'Wartet auf den Leader' });
    } else if (cfg.autopilot && !cfg.farm && world.state === 'ready' && st?.screen === 'world') {
      const cur = autopilot.task;
      if (cur) rows.push({ cur: true, text: cur.label });
      try { for (const t of questTasks(st)) { if (rows.length >= 4) break; if (!cur || t.key !== cur.key) rows.push({ text: t.label }); } } catch { /* ignore */ }
      if (!rows.length) rows.push({ text: 'Nichts zu tun – keine machbaren Quests' });
    }
    const html = rows.length ? rows.map((r, i) => `<div${r.cur ? ' class="cur"' : ''}><b>${r.cur ? '▶' : i + (rows[0]?.cur ? 0 : 1)}</b><span title="${esc(r.text)}">${esc(r.text)}</span></div>`).join('')
      : '<div class="digibot__none">Nur im Modus Autopilot.</div>';
    if (html !== queueCache.html) { queueCache.html = html; panel.querySelector('[data-f="queue"]').innerHTML = html; }
  }

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
    if (cfg.min) { panel.classList.add('is-min'); panel.querySelector('[data-act="min"]').textContent = '+'; } // bleibt nach Neuladen eingeklappt
    if (cfg.compact) panel.classList.add('is-compact');
    if (cfg.width >= 300) panel.style.width = cfg.width + 'px';
    try { // Breite (am rechten unteren Rand ziehbar) merken
      let rt = 0;
      new ResizeObserver(() => {
        if (panel.classList.contains('is-min')) return;
        clearTimeout(rt);
        rt = setTimeout(() => { const w = Math.round(panel.getBoundingClientRect().width); if (w >= 300 && w !== cfg.width) { cfg.width = w; saveCfg(); } }, 400);
      }).observe(panel);
    } catch { /* ignore */ }

    makeDraggable(panel, panel.querySelector('.digibot__head'));
    setTab(['data', 'mon', 'attack', 'quest', 'farm', 'acc', 'log'].includes(cfg.tab) ? cfg.tab : 'data');
    // Tippen in die Account-Felder nicht ans Spiel weitergeben (sonst laufen/greifen Tasten im Spiel)
    for (const ev of ['keydown', 'keyup', 'keypress']) {
      panel.addEventListener(ev, (e) => { if (e.target.matches?.('input[type="text"],input[type="password"]')) e.stopPropagation(); });
    }
    // Gruppen auf/zu merken ("toggle" steigt nicht auf -> in der Capture-Phase abfangen)
    panel.addEventListener('toggle', (e) => {
      const k = e.target?.dataset?.grp;
      if (k) { cfg.open = { ...cfg.open, [k]: e.target.open }; saveCfg(); }
    }, true);
    panel.addEventListener('click', digibotUserIntent((e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if(digibotAccountQueue.active && ((act||'').startsWith('grp-')||e.target.closest('[data-gmode]')))return;
      if (act === 'min') { cfg.min = panel.classList.toggle('is-min'); saveCfg(); panel.querySelector('[data-act="min"]').textContent = cfg.min ? '+' : '–'; }
      if (act === 'pip') popOut();
      if (act === 'reset') {
        exp.reset(); bitsRate.last = null; bitsRate.gains = []; bitsRate.total = 0; sess.kills = 0; sess.turnins = 0; sess.faints = 0;
        loot.inv = null; loot.gained = new Map(); loot.used = new Map(); loot.bitsIn = 0; loot.bitsOut = 0; loot.lastBits = null; loot.sig = '';
        mobExpReset();
        schedule();
      }
      if (act === 'mobexp-reset') { mobExpReset(); mobExp.at = 0; schedule(); }
      if (act === 'compact') { cfg.compact = panel.classList.toggle('is-compact'); saveCfg(); }
      if (act === 'wboss') {
        cfg.wboss = !cfg.wboss; saveCfg(); wb.goal = null; farm.lastPins = 0;
        logEvent('auto', `Weltboss ${cfg.wboss ? `an – ${wbSel().map((b) => b.name).join(', ') || 'keine Weltbosse in den Spieldaten'}, Kanal 1 und 2 nach Spawnzeit` : 'aus'}`);
        schedule();
      }
      if (act === 'hunt') {
        cfg.hunt = !cfg.hunt; saveCfg(); hunt.goal = null; hunt.polledAt = 0;
        logEvent('auto', `Event (Mega-Jagd) ${cfg.hunt ? 'an – der Bot reist zum nächsten angekündigten Weltboss' : 'aus'}`);
        schedule();
      }
      const gm = e.target.closest('[data-gmode]')?.dataset.gmode;
      if (gm) {
        digibotCore.enablePassive(digibotManual);
        reloadAcc(); accounts.mirror = gm === 'move' || gm === 'both'; accounts.mirrorAtk = gm === 'both'; accounts.leadBoss = gm === 'boss'; accounts.dungeon = gm === 'dungeon'; saveAcc();
        logEvent('bot', `Gruppe: Modus ${{ bots: 'Quests (Autopilot)', boss: 'Bosse (Rotation)', dungeon: 'Dungeon', move: 'Bewegungen spiegeln', both: 'Bewegungen + Angriffe spiegeln' }[gm]}`);
        schedule();
      }
      const lf = e.target.closest('[data-logf]')?.dataset.logf;
      if (lf) { cfg.logFilter = lf; saveCfg(); logShown = -1; schedule(); }
      if (act === 'queue-start'){digibotQueueStart(false);return;}
      if (act === 'queue-resume'){digibotQueueStart(true);return;}
      if (act === 'queue-stop'){digibotCore.stop('Quest-Runde manuell gestoppt',true);return;}
      if (act === 'digibot-stop') { groupSend('stop','panic');digibotCore.stop('Not-Aus',true);return; }
      if (act === 'digibot-export') {digibotExport();return;}
      if (act === 'preset-save') {digibotPresetSave();return;}
      if (act === 'preset-load') {digibotPresetLoad();return;}
      if (act === 'digibot-passwords') {digibotClearLegacyPasswords();return;}
      if (act === 'bot') bot.toggle();
      if (act === 'grp-desktop'){digibotDesktopStart();return;}
      if (act === 'grp-desktop-stop'){digibotDesktopCancel('Desktopstart manuell abgebrochen',true);digibotDesktopTick();return;}
      if (act === 'grp-desktop-resume'){digibotDesktopResume();return;}
      if (act === 'grp-start') startGroup();
      if (act === 'grp-invite' && claimSlot(getStore()?.getState?.())) {digibotCore.enablePassive(digibotManual);digibotCore.runPassive('Gruppe',20,()=>{if(group.role()==='leader')partyInviteNow();else groupSend('invite');});}
      if (act === 'grp-maptalk' && claimSlot(getStore()?.getState?.())) { groupSend('maptalk'); startMapTalk('Gruppe: Abgeben & Annehmen auf dieser Map'); }
      if (act === 'grp-login') openGroupWindows();
      if (act === 'grp-stop') stopGroup();
      if (act === 'mobs-all') setAllMobs(true);
      if (act === 'log-copy') copyLog(e.target);
      if (act === 'log-clear') { logbook.length = 0; logSig++; schedule(); }
      if (act === 'expm-copy') copyExpm(e.target);
      if (act === 'expm-clear') { expm.data = []; expm.levels = {}; expm.pending = []; expmSave(); schedule(); }
      if (act === 'mobs-none') setAllMobs(false);
      const tab = e.target.closest('[data-tab]')?.dataset.tab;
      if (tab) setTab(tab);
      const mode = e.target.closest('[data-mode]')?.dataset.mode;
      if (mode && mode !== modeOf()) {
        cfg.questMode = mode === 'quest'; cfg.autopilot = mode === 'auto'; cfg.farm = mode === 'farm'; cfg.dungeon = mode === 'dungeon'; cfg.eventsOnly = mode === 'events';
        if (mode === 'events') { cfg.hunt = true; cfg.wboss = true; loadWorld(); } // ohne die beiden gäbe es nichts zu tun
        dg.reset();
        saveCfg(); autopilot.reset(); farm.reset(); questSig = '';
        if (mode === 'auto' || mode === 'farm') loadWorld();
        logEvent('auto', `Modus: ${MODES[mode]}`);
        e.target.blur();
        schedule();
      }
    }));
    panel.addEventListener('input', (e) => {
      if(e.target.dataset.queuePassword !== undefined){
        const row=accounts.list[Number(e.target.dataset.queuePassword)];
        const user=String(row?.user||'').trim().toLowerCase();
        if(user){if(e.target.value)digibotQueuePasswords.set(user,e.target.value);else digibotQueuePasswords.delete(user);}
        return;
      }
      const ai = e.target.dataset.acc;
      if (ai !== undefined) {
        reloadAcc();
        const k = e.target.dataset.k;
        if(!['user','on'].includes(k))return;
        accounts.list[Number(ai)][k] = k === 'on' ? e.target.checked : e.target.value;
        saveAcc();
        if (k === 'on') e.target.blur();
        schedule();
        return;
      }
      if (e.target.dataset.accleader !== undefined) {
        reloadAcc(); accounts.leader = Number(e.target.dataset.accleader); saveAcc(); e.target.blur();
        logEvent('bot', `Gruppe: Leader ist jetzt Account ${accounts.leader + 1}${accounts.list[accounts.leader].user ? ` (${accounts.list[accounts.leader].user})` : ''}`);
        schedule();
        return;
      }
      if (e.target.matches('[data-accslot]')) {
        if(digibotAccountQueue.active){e.target.value='';return;}
        const v = e.target.value;
        if (v === '') { ss.set('digibot.group', null); group.msg = ''; logEvent('bot', 'Gruppe: dieses Fenster ist in keiner Gruppe mehr'); }
        else {
          ss.set('digibot.slot', v); ss.set('digibot.group', '1');
          group.talks = []; group.handled = new Set(); group.done = []; group.cur = null; group.leaderPos = null; group.msg = '';
          autopilot.reset();
          logEvent('bot', `Gruppe: dieses Fenster ist jetzt Account ${Number(v) + 1}${accounts.list[v]?.user ? ` (${accounts.list[v].user})` : ''} – ${group.role() === 'leader' ? 'Leader' : 'Mitläufer'}`);

        }
        e.target.blur();
        groupPush(true);
        schedule();
        return;
      }
      if (e.target.matches('[data-accserve]')) {
        reloadAcc(); accounts.serve = e.target.checked; saveAcc(); e.target.blur(); autopilot.reset();
        logEvent('bot', `Gruppe: Leader erledigt die Quests der Mitläufer – ${accounts.serve ? 'an' : 'aus'}`);
        return;
      }
      if (e.target.matches('[data-accspread]')) {
        reloadAcc(); accounts.spread = e.target.checked; saveAcc(); e.target.blur();
        logEvent('bot', `Gruppe: Ziele verteilen ${accounts.spread ? 'an' : 'aus'}`);
        return;
      }
      if (e.target.matches('[data-accpopup]')) { reloadAcc(); accounts.popup = e.target.checked; saveAcc(); e.target.blur(); return; }
      if (e.target.matches('[data-accmirroratk]')) {
        reloadAcc(); accounts.mirrorAtk = e.target.checked; saveAcc(); e.target.blur();
        logEvent('bot', `Gruppe: Angriffe spiegeln ${accounts.mirrorAtk ? 'an' : 'aus'}`);
        return;
      }
      if (e.target.matches('[data-accmirror]')) {
        reloadAcc(); accounts.mirror = e.target.checked; saveAcc(); e.target.blur();
        logEvent('bot', `Gruppe: Bewegungen spiegeln ${accounts.mirror ? 'an' : 'aus'}`);
        return;
      }
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
        cfg.farmChannels = [...set].sort((a, b) => a - b); saveCfg(); e.target.blur(); farm.reset(); lr.calcAt = 0; schedule();
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
        if (flag === 'levelRoute' || flag === 'levelA2') { lr.goal = null; lr.calcAt = 0; }
        if (flag === 'levelBoss') { lr.boss = null; lr.calcAt = 0; } // Bewertung rechnet die Bosse mit ein
        logEvent('auto', `Einstellung: ${e.target.nextElementSibling?.textContent} = ${e.target.checked ? 'an' : 'aus'}`);
        return;
      }
      if (e.target.matches('[data-expmess]')) {
        cfg.expMess = e.target.checked; saveCfg(); e.target.blur(); expm.mobs.clear(); expm.lastKillAt = 0; schedule();
        logEvent('bot', `EXP-Messung ${cfg.expMess ? 'an' : 'aus'}`);
        return;
      }
      if (e.target.matches('[data-apbatch]')) {
        cfg.apBatch = e.target.checked; saveCfg(); e.target.blur(); autopilot.reset(); autopilot.batchPhase = 'do'; schedule();
        logEvent('auto', `Erst alle Quests erledigen, dann gemeinsam abgeben: ${cfg.apBatch ? 'an' : 'aus'}`);
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
      if (e.target.matches('[data-bosssearch]')) { filterBossPick(); return; }
      const hk = e.target.dataset.healcfg;
      if (hk) {
        const st = getStore()?.getState?.(), v = Number(e.target.value) || 0, set = editSkillSet(st);
        set.heal = { ...set.heal, [hk]: v };
        if (!v) delete set.heal[hk];
        saveCfg(); e.target.blur(); e.target.classList.toggle('on', !!v);
        logEvent('bot', `Skill ${hk} (${speciesName(st?.me?.partner?.species)}): ${v ? `Heil-Skill unter ${v} % HP` : 'normal im Angriff'}`);
        return;
      }
      const sk = e.target.dataset.skillcfg;
      if (sk) { editSkillSet(getStore()?.getState?.()).skills[sk] = e.target.checked; saveCfg(); e.target.blur(); return; }
      const key = e.target.dataset.cfg;
      if (!key) return;
      cfg[key] = Number(e.target.value);
      panel.querySelector(`[data-v="${key}"]`).textContent = LABELS[key](cfg[key]);
      saveCfg();
      if (key === 'lvlDiff') lr.calcAt = 0; // Lern-Route gleich neu bewerten
    });
    // Regler nach dem Loslassen entfokussieren, damit Spieltasten wieder ans Spiel gehen
    panel.addEventListener('change', (e) => {
      const key = e.target.dataset.apsel;
      if (key) {
        cfg[key] = e.target.value;
        if (key === 'apStartMap' || key === 'apOrder' || key === 'apSweepDir') cfg.apSweepMap = ''; // Runde neu beginnen
        if (key === 'apQuestPartner') cfg.apEvo = '';                     // Digitation gilt pro Digimon
        if (/^(farm|route)/.test(key)) farm.reset();
        saveCfg(); autopilot.reset(); e.target.blur(); questSig = ''; schedule();
        logEvent('auto', `Einstellung: ${e.target.closest('label')?.firstChild?.textContent?.trim() || key} = ${e.target.selectedOptions[0]?.textContent || '–'}`);
        return;
      }
      if (e.target.dataset.cfg) e.target.blur();
    });
    // Tastenkürzel: Alt+D oder Alt+H blendet das Panel ein/aus, Alt+B startet/stoppt den Bot. Alt+D springt in Chrome
    // sonst zusätzlich in die Adresszeile – das wird hier unterbunden.
    window.addEventListener('keydown', digibotUserIntent((e) => {
      if (!e.isTrusted || !e.altKey) return;
      if (e.code === 'KeyD' || e.code === 'KeyH') {
        e.preventDefault(); e.stopPropagation();
        panel.style.display = panel.style.display === 'none' ? '' : 'none';
      }
      if (e.code === 'KeyB') { e.preventDefault(); bot.toggle(); }
    }), true);
  }

  // ---------- Start: warten bis das Spiel seinen Store bereitstellt ----------
  getStore = () => window.dmo?.store;
  const boot = setInterval(() => {
    const store = getStore();
    if (!store?.subscribe) return;
    clearInterval(boot);
    mount();
    digibotDesktopBootstrap();
    digibotObserve();
    setInterval(digibotObserve, 500);
    setInterval(digibotDesktopTick,500);
    setInterval(digibotQueueTick, 1000);
    window.addEventListener('keydown',e=>{if(e.isTrusted&&e.code==='Escape'){groupSend('stop','esc');digibotCore.stop('Not-Aus',true);}},true);
    store.subscribe(schedule);
    if (cfg.autopilot || cfg.farm) setTimeout(loadWorld, 2000);
    setInterval(schedule, 250); // Fallback, falls ein Update am Store vorbeiläuft
    setInterval(() => {const st=getStore()?.getState?.();if(st?.screen==='world'&&st.me)digibotCore.runPassive('Gruppe',20,groupTick);}, 1000); // Gruppe: Meldungen, Login, Party, Autostart
    setInterval(() => groupPush(), 500); // Gruppe: Änderungen sofort melden
    setInterval(() => {const st=getStore()?.getState?.();if(st?.screen==='world'&&st.me&&group.active()&&accounts.mirror)digibotCore.runPassive('Spiegeln',10,mirrorTick);}, 100);   // Gruppe: Bewegungen des Leaders spiegeln
    render();
  }, 300);
})();
