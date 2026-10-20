import './DominoEvent.css';
import * as THREE from 'three';
import { createCivilianVisual } from './CharacterArt.js';
import { createRescueTeams } from './RescueTeams.js';
import { createWorldPickups } from './SupportPickups.js';
import { createLprVisual } from './HelicopterSupport.js';
import { PICKUP_RADIUS } from './TacticalSupport.js';
import { EVAC_POINT } from './RescuePaths.js';
import { createTriageCore, GREEN_ASSEMBLY_SECONDS, SCENARIOS, MAX_ROUND, getRoundConfig } from './TriageCore.js';

const PALETTE = {
  none: '#e7e7d7', green: '#69cf8c', yellow: '#f8ce69',
  red: '#ef7b73', black: '#a9adb5',
};
const LABELS = { green: 'GREEN', yellow: 'YELLOW', red: 'RED', black: 'BLACK' };
const ASSEMBLY = { x: -158, y: -82 };
const STATES = { waiting:'Waiting for aid', treatment:'Rescue team responding', transport:'Stretcher evacuation', 'self-evacuation':'Walking to assembly point', evacuated:'Evacuated', deceased:'Deceased' };

function createMarker(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const c = canvas.getContext('2d');
  c.fillStyle = 'rgba(12, 34, 39, .90)';
  c.beginPath(); c.arc(128, 123, 87, 0, Math.PI*2); c.fill();
  c.lineWidth = 12; c.strokeStyle = color; c.stroke();
  c.font = 'bold 86px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#fff'; c.fillText(text, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent:true, depthTest:false }));
  sprite.scale.set(21,21,1);
  sprite.renderOrder = 15;
  return sprite;
}

function createPatientActors(scene, core) {
  const root = new THREE.Group();
  root.name = 'MASCAL | interactive casualties';
  const actors = new Map();
  // Green (walking) patients visibly travel to the safe assembly area.
  // No extra controls or collision changes are introduced.
  const zone = new THREE.Group();
  zone.position.set(ASSEMBLY.x, ASSEMBLY.y, 0);
  const zoneDisk = new THREE.Mesh(new THREE.CircleGeometry(18, 32),
    new THREE.MeshBasicMaterial({ color: 0x3b9570, transparent: true, opacity: 0.28, depthWrite: false }));
  zoneDisk.position.z = 0.9;
  const zoneRing = new THREE.Mesh(new THREE.RingGeometry(17, 19, 32),
    new THREE.MeshBasicMaterial({ color: 0xb0f1b4, side: THREE.DoubleSide, depthWrite: false }));
  zoneRing.position.z = 1;
  zone.add(zoneDisk, zoneRing);
  const zoneMarker = createMarker('Z', '#89f4b0');
  zoneMarker.position.z = 37;
  zone.add(zoneMarker);
  root.add(zone);
  for (const p of core.state.patients) {
    const anchor = new THREE.Group();
    anchor.position.set(p.pos.x, p.pos.y, 0);
    anchor.userData.patientId = p.id;
    const model = createCivilianVisual(p.variant);
    if (p.pose === 'lying') {
      model.rotation.x = Math.PI / 2;
      model.position.z = 3.2;
    } else if (p.pose === 'seated') {
      model.scale.set(.94, .94, .79);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(7,5,4), new THREE.MeshStandardMaterial({color:0x7a6d59,roughness:1}));
      seat.position.z = 2; seat.castShadow = true; anchor.add(seat);
      model.position.z = 3.2;
    }
    anchor.add(model);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(9.1,10.1,32),
      new THREE.MeshBasicMaterial({color:0xc0d8c3,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false})
    );
    ring.position.z = .6;
    anchor.add(ring);
    const marker = createMarker(p.id, PALETTE.none);
    marker.position.set(0,0,36);
    anchor.add(marker);
    root.add(anchor);
    actors.set(p.id, { anchor, model, marker, ring, previousKey:'' });
  }
  scene.add(root);
  return {
    actors,
    update(now) {
      for (const p of core.state.patients) {
        const a = actors.get(p.id);
        const inAssembly = p.tagged === 'green' && p.category === 'green'
          && (p.status === 'self-evacuation' || p.status === 'evacuated');
        a.anchor.visible = (!['evacuated','transport'].includes(p.status)) || inAssembly;
        if (inAssembly) {
          const progress = p.status === 'evacuated' ? 1 :
            Math.min(1, Math.max(0, 1 - p.evacuationTimer / GREEN_ASSEMBLY_SECONDS));
          a.anchor.position.set(
            THREE.MathUtils.lerp(p.pos.x, ASSEMBLY.x, progress),
            THREE.MathUtils.lerp(p.pos.y, ASSEMBLY.y, progress),
            0,
          );
          if (p.pose === 'standing') a.model.userData.animate?.(now + Number(p.id), progress < 1);
        } else {
          a.anchor.position.set(p.pos.x, p.pos.y, 0);
        }
        const marked = p.tagged || 'none';
        const key = `${marked}-${p.status}`;
        if (key !== a.previousKey) {
          const newMarker = createMarker(p.id, PALETTE[marked]);
          a.marker.material.map.dispose(); a.marker.material.dispose();
          a.marker.material = newMarker.material;
          a.marker.scale.copy(newMarker.scale);
          a.previousKey = key;
          a.ring.material.color.set(PALETTE[marked]);
        }
        a.marker.position.z = 36 + Math.sin(now*1.3 + Number(p.id)) * 1.1;
        if (p.pose === 'standing' && !inAssembly) a.model.userData.animate?.(now + Number(p.id), false);
        if (p.pose === 'lying') a.model.scale.z = 1 + .007 * Math.sin(now * 1.1 + Number(p.id));
      }
    },
  };
}

function div(className, html, parent = document.body) {
  const node = document.createElement('div');
  node.className = className;
  node.innerHTML = html;
  parent.append(node);
  return node;
}

function formatClock(seconds) {
  const n = Math.ceil(seconds);
  return `${String(Math.floor(n / 60)).padStart(2,'0')}:${String(n % 60).padStart(2,'0')}`;
}

export function createTriageScene(scene, player, inputHandler, movementState) {
  // A browser refresh always starts a new operation in round 1.
  // A genuine Next Round click places a one-time ticket in sessionStorage.
  // This prevents old URL parameters or saved progress from reopening round 4.
  const url = new URLSearchParams(window.location.search);
  const rawRound = Number(url.get('round'));
  let transitionRound = null;
  try {
    const pending = JSON.parse(sessionStorage.getItem('mascal-next-round-once') || 'null');
    sessionStorage.removeItem('mascal-next-round-once');
    if (pending && pending.id === url.get('next') &&
        Number.isInteger(pending.round) && pending.round >= 1 && pending.round <= MAX_ROUND &&
        pending.round === rawRound && Date.now() - pending.created < 30000) {
      transitionRound = pending.round;
    }
  } catch (_) { /* Private mode: safe default is always round 1. */ }
  const selectedRound = transitionRound ?? 1;
  const forcedVariant = url.has('scenario') && /^(0|1|2)$/.test(url.get('scenario'))
    ? Number(url.get('scenario')) : null;
  const variant = forcedVariant ?? Math.floor(Math.random() * SCENARIOS.length);
  const querySeed = Number(url.get('seed'));
  const runSeed = url.has('seed') && Number.isInteger(querySeed)
    ? querySeed : Math.floor(Math.random() * 2147483647) + 1;
  const core = createTriageCore({ variant, round: selectedRound, seed: runSeed });

  // Remove one-time parameters immediately. F5 on any round reopens round 1.
  if (['round','next','seed','scenario'].some(key => url.has(key))) {
    try {
      const clean = new URL(window.location.href);
      for (const key of ['round','next','seed','scenario']) clean.searchParams.delete(key);
      window.history.replaceState(window.history.state, '', clean.pathname + clean.search + clean.hash);
    } catch (_) { /* The default round remains 1 even without history support. */ }
  }

  function goToRound(nextRound) {
    const next = new URL(window.location.href);
    // Clean old parameters before doing an intentional transition.
    for (const key of ['round','next','seed','scenario']) next.searchParams.delete(key);
    const round = Math.max(1, Math.min(MAX_ROUND, Number(nextRound) || 1));
    const id = `${Math.random().toString(36).slice(2)}-${Date.now()}`;
    try {
      sessionStorage.setItem('mascal-next-round-once', JSON.stringify({ round, id, created: Date.now() }));
      next.searchParams.set('round', String(round));
      next.searchParams.set('next', id);
    } catch (_) {
      // SessionStorage blocked: the next load safely resets to round 1.
    }
    window.location.assign(next.toString());
  }
  function replay() { goToRound(selectedRound); }
  const visuals = createPatientActors(scene, core);
  const responderVisuals = createRescueTeams(scene, core);
  const pickupVisuals = createWorldPickups(scene, core);
  const lprVisuals = createLprVisual(scene, core);
  // Clear destination marker: matches the evacuation point used by actual team routes.
  const deliveryZone = new THREE.Group();
  deliveryZone.position.set(EVAC_POINT.x, EVAC_POINT.y, 0);
  const deck = new THREE.Mesh(new THREE.CircleGeometry(13, 32),
    new THREE.MeshBasicMaterial({color:0x3a96b1,transparent:true,opacity:.19,depthWrite:false}));
  deck.position.z=.75;
  const ring = new THREE.Mesh(new THREE.RingGeometry(12,13.6,32),
    new THREE.MeshBasicMaterial({color:0x78deff,side:THREE.DoubleSide,depthWrite:false}));
  ring.position.z=.85;
  const label = createMarker('E','#72d8ff');
  label.position.z=35;
  deliveryZone.add(deck,ring,label);
  scene.add(deliveryZone);
  const hud = div('triage-mission-hud', `
    <div class="ops-panel-bar"><span>01 / COMMAND</span><span class="ops-live-pulse">ACTIVE</span></div>
    <div class="mission-time-caption">ROUND <span id="round-number"></span> / ${MAX_ROUND} · <span id="scenario-name"></span></div>
    <div class="round-description">${core.state.roundTitle} · ${core.state.patients.length} casualties</div>
    <div class="ops-time-header"><span>TIME REMAINING</span><span>T − ${formatClock(core.state.duration)}</span></div>
    <div class="mission-time">${formatClock(core.state.duration)}</div>
    <div class="ops-timer-track"><div id="ops-timer-fill"></div></div>
    <div class="mission-stat">Assessed: <b id="assessment-count">0/${core.state.patients.length}</b> · Evacuated: <b id="evac-count">0</b></div>
    <div class="ops-divider-heading"><span>01</span> TEAM STATUS</div>
    <div class="team-indicators"><span id="crew-1">TEAM 1: AVAILABLE</span><span id="crew-2">TEAM 2: AVAILABLE</span></div>
    <div class="dispatch-queue"><span>02 / DISPATCH QUEUE</span><strong id="dispatch-queue-text">No assessed casualties waiting</strong></div>
    <div class="team-process-key">TEAM: <span>→ EN ROUTE</span><span>✚ TREATING</span><span>▰ TRANSPORT</span><small>Evacuation handover point: blue E beside the road</small></div>
    <div class="ops-divider-heading"><span>03</span> INCIDENT STATUS</div>
    <div class="domino-status"><span>DOMINO EFFECT</span><strong id="domino-status-text">Awaiting incident updates</strong></div>
    <div class="domino-status"><span>COMMS</span><strong id="comms-status-text">RADIO: online</strong></div>
    <div class="domino-status support-status"><span>HEMS · F (AFTER COLLECTING)</span><strong id="support-status-text">Find a support crate on the map</strong></div>
    <div class="tactical-support-block">
      <div class="tactical-support-heading">04 / FIELD EQUIPMENT <small>RARE FINDS</small></div>
      <div id="bonus-inventory" class="bonus-inventory">STT 0 · HEMS — · FIRE 0 · MEDKIT 0</div>
      <div class="bonus-controls">E — collect · T — attach STT · G — medkit · F — HEMS</div>
      <div class="support-note">STT telemetry: right-hand console →</div>
    </div>
  `);
  hud.querySelector('#scenario-name').textContent = core.state.scenario.name.toUpperCase();
  hud.querySelector('#round-number').textContent = selectedRound;
  const headerSubtitle = document.querySelector('.mission-head small');
  if (headerSubtitle) headerSubtitle.textContent = `CRITICAL DECISIONS · ROUND ${selectedRound}/${MAX_ROUND} · NIGHT OPS`;
  const prompt = div('triage-action-prompt', 'Approach a marked casualty and press <kbd>E</kbd>');
  const toast = div('triage-radio', `
    <div class="signal-feed-head"><span class="signal-emblem">///</span><b>COMMS / CHANNEL 01</b><span class="signal-live">ON AIR</span></div>
    <div class="signal-feed-list" id="signal-feed-list" role="log" aria-live="polite" aria-relevant="additions"></div>
  `);
  function radioMessage(message, type = 'radio') {
    const feed = toast.querySelector('#signal-feed-list');
    const entry = document.createElement('div');
    entry.className = `signal-entry signal-${type}`;
    const time = document.createElement('time');
    time.textContent = formatClock(core.state.elapsed);
    const text = document.createElement('span');
    text.textContent = message.replace(/^RADIO\s*[·:—-]\s*/i, '');
    entry.append(time, text);
    feed.prepend(entry);
    while (feed.children.length > 3) feed.lastElementChild.remove();
    toast.dataset.type = type;
  }
  radioMessage('Begin casualty assessment.', 'radio');
  const sttPanel = div('stt-monitor-panel', `
    <div class="stt-panel-head"><span class="telemetry-id">02 / TELEMETRY</span><strong>SMART TRIAGE TAG</strong><small>CASUALTY MONITORING</small></div>
    <div class="stt-panel-subline">
      <span id="stt-panel-status">ACTIVE 0</span>
      <span id="stt-panel-inventory">SPARE 0</span>
    </div>
    <div id="stt-live-readings" class="stt-live-readings is-panel" aria-live="off"></div>
  `);
  const modal = div('triage-patient-modal', `
    <div class="triage-modal-content">
      <span class="mission-time-caption">CASUALTY ASSESSMENT</span>
      <h2 id="patient-title"></h2>
      <p id="patient-status"></p>
      <ul id="patient-signs"></ul>
      <div id="patient-live-vitals" class="patient-live-vitals"></div>
      <div class="patient-item-actions">
        <button type="button" id="patient-attach-stt">T · Attach STT</button>
        <button type="button" id="patient-apply-kit">G · Medkit</button>
      </div>
      <p class="triage-instruction">Set a triage priority. Your choice determines the two teams’ dispatch order.</p>
      <div class="triage-choices">
        <button type="button" data-tag="green"><kbd>1</kbd> Green</button>
        <button type="button" data-tag="yellow"><kbd>2</kbd> Yellow</button>
        <button type="button" data-tag="red"><kbd>3</kbd> Red</button>
        <button type="button" data-tag="black"><kbd>4</kbd> Black</button>
      </div>
      <span class="triage-close">ESC — close · Simplified fictional game rules</span>
    </div>
  `);
  const end = div('triage-end-modal', `
    <div class="triage-end-panel"><span class="mission-time-caption">MISSION COMPLETE</span>
      <h1>MISSION DEBRIEF</h1><p id="end-stats"></p>
      <div id="end-grade"></div>
      <h3>Key moments</h3><div id="end-moments"></div>
      <h3>What to improve next time</h3><div id="end-feedback"></div>
      <h3>Casualty triage results</h3><div id="end-patients"></div>
      <div id="round-outcome" class="round-outcome"></div>
      <div class="round-end-actions">
        <button id="restart-mission" type="button">Replay round — R</button>
        <button id="next-round" type="button" hidden>Next round — N</button>
      </div>
      <p class="triage-disclaimer">Fictional game, not a validated medical triage protocol.</p>
    </div>
  `);
  end.querySelector('#restart-mission').addEventListener('click', replay);
  end.querySelector('#next-round').addEventListener('click', () => goToRound(Math.min(MAX_ROUND, selectedRound + 1)));
  const dilemma = div('domino-event-modal', `
    <section class="domino-event-card" role="dialog" aria-modal="true" aria-labelledby="domino-title">
      <span class="domino-eyebrow">UNEXPECTED EVENT · CRITICAL DECISION</span>
      <h2 id="domino-title">SMOKE NEAR THE TENTS</h2>
      <p class="domino-lede">Smoke is spreading from the railcar, putting casualty <strong>05</strong>.
      You have two options. The mission timer is paused until you decide.</p>
      <div class="domino-options">
        <button type="button" data-domino="secure">
          <span class="domino-key">1</span>
          <span><strong>SECURE THE SITE</strong><small>One rescue team is unavailable for 24 s and may interrupt current care. Casualty 05 avoids additional exposure.</small></span>
        </button>
        <button type="button" data-domino="continue">
          <span class="domino-key">2</span>
          <span><strong>CONTINUE EVACUATION</strong><small>Both teams keep working. If casualty 05 is not evacuated, their condition may deteriorate.</small></span>
        </button>
      </div>
      <div class="domino-footnote">Your decision will appear in the debrief · Simplified game mechanic</div>
    </section>
  `);
  const radioDilemma = div('domino-event-modal', `
    <section class="domino-event-card" role="dialog" aria-modal="true" aria-labelledby="radio-title">
      <span class="domino-eyebrow">UNEXPECTED COMMUNICATIONS FAILURE</span>
      <h2 id="radio-title">RADIO BLACKOUT</h2>
      <p class="domino-lede">Team 2 has lost contact. Choose how to handle the delay. The mission timer is paused until you decide.</p>
      <div class="domino-options">
        <button type="button" data-comms="repair"><span class="domino-key">1</span>
          <span><strong>REPAIR THE RADIO</strong><small>Your responder is immobilized for 12 s and cannot assess casualties. Both teams continue working.</small></span>
        </button>
        <button type="button" data-comms="continue"><span class="domino-key">2</span>
          <span><strong>KEEP MOVING</strong><small>You can keep moving. Team 2 pauses treatment and dispatch for 24 s.</small></span>
        </button>
      </div>
      <div class="domino-footnote">Watch the dispatch queue and workload. Every choice has a cost.</div>
    </section>
  `);
  let commsModalVisible = false;
  let playerRadioLocked = false;
  function chooseComms(choice) {
    if (!core.resolveComms(choice)) return;
    commsModalVisible = false;
    radioDilemma.classList.remove('is-open');
    if (choice === 'repair') {
      playerRadioLocked = true;
      inputHandler.setDisabled();
    } else {
      inputHandler.enableAndClear();
    }
  }
  radioDilemma.querySelectorAll('[data-comms]').forEach(button =>
    button.addEventListener('click', () => chooseComms(button.dataset.comms)));

  let incidentModalVisible = false;
  function chooseIncident(choice) {
    if (!core.resolveIncident(choice)) return;
    incidentModalVisible = false;
    dilemma.classList.remove('is-open');
    inputHandler.enableAndClear();
  }
  dilemma.querySelectorAll('[data-domino]').forEach(button =>
    button.addEventListener('click', () => chooseIncident(button.dataset.domino)));

  let selected = null;
  let lastEventCount = 0;
  let lastDisplay = '';
  let lastPrompt = '';
  let lastQueue = '';
  let lastDomino = '';
  let lastComms = '';
  let lastSupport = '';
  let lastInventory = '';
  let lastReadings = '';
  let lastPatientVitals = '';
  let lastEventSerial = 0;

  function nearbyPatient() {
    return core.state.patients
      .filter(p => (!['evacuated','deceased','transport'].includes(p.status)) || p.category === 'black')
      .map(p => ({ p, distance: Math.hypot(player.position.x - p.pos.x, player.position.y - p.pos.y) }))
      .filter(item => item.distance < 31)
      .sort((a,b) => a.distance-b.distance)[0]?.p || null;
  }
  function nearbyPickup() {
    return core.state.pickups.filter(o=>!o.collected)
      .map(o=>({o,d:Math.hypot(player.position.x-o.pos.x,player.position.y-o.pos.y)}))
      .filter(it=>it.d<=PICKUP_RADIUS)
      .sort((a,b)=>a.d-b.d)[0]?.o || null;
  }
  function nearestAssessedPatient(){
    return core.state.patients.filter(p=>p.tagged && p.health>0 && ['waiting','treatment'].includes(p.status))
      .map(p=>({p,d:Math.hypot(player.position.x-p.pos.x,player.position.y-p.pos.y)}))
      .filter(it=>it.d<=31).sort((a,b)=>a.d-b.d)[0]?.p || null;
  }
  function useSTT() {
    const p=selected || nearestAssessedPatient();
    if(!p || !core.attachSTT(p.id,player.position)) {
      radioMessage('STT: you need an unused band and a nearby assessed casualty. One active band per person.', 'warning');
      return false;
    }
    updateSelectedVitals();
    return true;
  }
  function useMedkit() {
    const p=selected || nearestAssessedPatient();
    if(!p || !core.applyMedkit(p.id,player.position)) {
      radioMessage('MEDKIT: you need a collected kit and a nearby assessed casualty.', 'warning');
      return false;
    }
    return true;
  }
  function patientVitalsHTML(p) {
    const seconds=Math.max(0,Math.ceil(p.monitorUntil-core.state.elapsed));
    return seconds && !['evacuated','deceased'].includes(p.status)
      ? `<div class="stt-vitals-title">SMART TRIAGE TAG · MONITORING ${seconds}s</div>
        <div class="stt-values"><span>HR <strong>${p.vitals.hr}/min</strong></span><span>SpO₂ <strong>${p.vitals.spo2}%</strong></span></div>
        <small class="${p.monitorAlert?'stt-alert':''}">${p.vitals.trend} · simulated values</small>`
      : '<small>Vitals change over time. Continuous readings require an STT band.</small>';
  }
  function updateSelectedVitals(){
    if(!selected) return;
    const markup=patientVitalsHTML(selected);
    if(markup!==lastPatientVitals){modal.querySelector('#patient-live-vitals').innerHTML=markup;lastPatientVitals=markup;}
    modal.querySelector('#patient-attach-stt').disabled=!core.state.inventory.stt || selected.monitorUntil>core.state.elapsed || !selected.tagged;
    modal.querySelector('#patient-apply-kit').disabled=!core.state.inventory.medkit || selected.stabilizedUntil>core.state.elapsed || !selected.tagged;
  }
  modal.querySelector('#patient-attach-stt').addEventListener('click',useSTT);
  modal.querySelector('#patient-apply-kit').addEventListener('click',useMedkit);
  function closeCard() {
    selected = null;
    lastPatientVitals='';
    modal.classList.remove('is-open');
    inputHandler.enableAndClear();
  }
  function openCard(p) {
    selected = p;
    movementState.isMoving = false;
    player.position.z = 0;
    inputHandler.setDisabled();
    inputHandler.queue.length = 0;
    modal.querySelector('#patient-title').textContent = `${p.id} · ${p.name}`;
    modal.querySelector('#patient-status').textContent = `${STATES[p.status]}${p.tagged ? ` · Triage tag: ${LABELS[p.tagged]}` : ''}`;
    modal.querySelector('#patient-signs').innerHTML = p.signs.map(s => `<li>${s}</li>`).join('');
    modal.querySelectorAll('[data-tag]').forEach(button => { button.disabled = p.status === 'self-evacuation' || p.status === 'evacuated'; });
    modal.classList.add('is-open');
    updateSelectedVitals();
  }
  function choose(tag) {
    if (!selected) return;
    if (core.tagPatient(selected.id, tag)) closeCard();
  }
  modal.querySelectorAll('[data-tag]').forEach(button => button.addEventListener('click', () => choose(button.dataset.tag)));
  function keydown(event) {
    if (['e','E','f','F','t','T','g','G','Escape','1','2','3','4','r','R','n','N'].includes(event.key)) event.preventDefault();
    if (core.state.phase !== 'playing') {
      if (!event.repeat && event.key.toLowerCase() === 'r') replay();
      if (!event.repeat && event.key.toLowerCase() === 'n' && core.state.summary?.passed && selectedRound < MAX_ROUND) goToRound(selectedRound + 1);
      return;
    }
    if (event.repeat) return;
    if (core.state.comms.pending) {
      if (event.key === '1') chooseComms('repair');
      if (event.key === '2') chooseComms('continue');
      return;
    }
    if (core.state.comms.playerLockRemaining > 0) return;
    if (core.state.incident.pending) {
      if (event.key === '1') chooseIncident('secure');
      if (event.key === '2') chooseIncident('continue');
      return;
    }
    if (selected) {
      if(event.key.toLowerCase()==='t'){useSTT();return;}
      if(event.key.toLowerCase()==='g'){useMedkit();return;}
      if (event.key === 'Escape' || event.key.toLowerCase() === 'e') closeCard();
      const choice = {'1':'green', '2':'yellow', '3':'red', '4':'black'}[event.key];
      if (choice) choose(choice);
      return;
    }
    if (event.key.toLowerCase() === 't') {useSTT();return;}
    if (event.key.toLowerCase() === 'g') {useMedkit();return;}
    if (event.key.toLowerCase() === 'f') {
      core.requestSupport();
      return;
    }
    if (event.key.toLowerCase() === 'e') {
      const item=nearbyPickup();
      if(item){core.collectPickup(item.id,player.position);return;}
      const p = nearbyPatient();
      if (p && !movementState.isMoving) openCard(p);
      else radioMessage(p ? 'Stop moving before assessing a casualty.' : 'Move closer to a casualty.', 'radio');
    }
  }
  window.addEventListener('keydown', keydown);
  function showEnd() {
    if (end.classList.contains('is-open')) return;
    const s = core.state.summary;
    end.querySelector('#end-stats').innerHTML = `Round <strong>${s.round}/${MAX_ROUND}</strong> · Score: <strong>${s.score}</strong> pts · Correct triage: <strong>${s.correct}/${s.total}</strong> · Evacuated: <strong>${s.evacuated}</strong> · Lost during mission: <strong>${s.lost}</strong>`;
    const completed = s.passed;
    const nextButton = end.querySelector('#next-round');
    nextButton.hidden = !completed || selectedRound >= MAX_ROUND;
    end.querySelector('#round-outcome').textContent = completed
      ? (selectedRound === MAX_ROUND ? 'ALL 5 ROUNDS COMPLETE — WELL DONE!' : `ROUND PASSED · round ${selectedRound + 1} unlocked`)
      : 'ROUND FAILED · assess at least 65% of casualties, achieve 55% triage accuracy and evacuate at least one person.';
    end.querySelector('#round-outcome').classList.toggle('passed', completed);
    if (completed) {
      try {
        const previous = Number(localStorage.getItem('mascal-unlocked-round')) || 1;
        localStorage.setItem('mascal-unlocked-round', String(Math.min(MAX_ROUND, Math.max(previous, selectedRound + 1))));
      } catch (_) { /* private browsing: current round still works */ }
    }
    const teamUse = s.teamUtilization.map((n,i)=>`T${i+1}: ${n}%`).join(' · ');
    const response = s.redResponse === null ? 'no data' : `${s.redResponse} s`;
    end.querySelector('#end-grade').innerHTML = `
      <div class="mission-grade"><span>COMMAND RATING</span><strong>${s.grade}</strong><b>${s.quality}/100</b></div>
      <div class="mission-metrics"><div><small>TRIAGE ACCURACY</small><strong>${s.gradedAccuracy}%</strong></div>
      <div><small>AVG. TIME TO FIRST CARE (RED)</small><strong>${response}</strong></div>
      <div><small>TEAM UTILIZATION</small><strong>${teamUse}</strong></div>
      <div><small>RED-PRIORITY REASSIGNMENTS</small><strong>${s.performance.priorityRedirects}</strong></div></div>`;
    const moments = s.performance.moments.filter(m=>['incident','comms','support','red-priority','assessment','arrival'].includes(m.kind));
    const significant=[
      ...moments.filter(m=>['incident','comms','red-priority','support'].includes(m.kind)),
      ...moments.filter(m=>['assessment','arrival'].includes(m.kind)),
    ].slice(0,3);
    end.querySelector('#end-moments').innerHTML = significant.length
      ? significant.map(m=>`<div class="decision-moment"><small>${formatClock(m.at)}</small><div><strong>${m.title}</strong><p>${m.detail}</p></div></div>`).join('')
      : '<p class="summary-muted">No noteworthy decisions this round.</p>';
    end.querySelector('#end-feedback').innerHTML = s.feedback.map(item => {
      const entry=document.createElement('span'); entry.textContent=item;
      return `<div class="mission-feedback">${entry.innerHTML}</div>`;
    }).join('');
    const incidentDesc = s.incident.choice === 'secure'
      ? 'Access secured: one team was diverted for 24 s, reducing the risk to casualty 05.'
      : s.incident.choice === 'continue'
        ? 'Evacuation continued: both teams worked without interruption, but casualty 05 was exposed to deterioration.'
        : 'No decision was made regarding smoke near the tent.';
    const decisionInfo = document.createElement('p');
    decisionInfo.className = 'domino-end-summary';
    decisionInfo.textContent = `DOMINO EFFECT · ${incidentDesc}`;
    end.querySelector('#end-stats').after(decisionInfo);
    const commsInfo = document.createElement('p');
    commsInfo.className = 'domino-end-summary';
    commsInfo.textContent = s.comms.choice === 'repair'
      ? 'COMMS · Responder lost 12 s, but rescue teams continued working.'
      : s.comms.choice === 'continue'
        ? 'COMMS · Team 2 was unavailable for 24 s, but the responder could keep moving.'
        : 'COMMS · No communications incident occurred.';
    decisionInfo.after(commsInfo);
    const supportInfo = document.createElement('p');
    supportInfo.className = 'domino-end-summary';
    supportInfo.textContent = s.support.status === 'completed'
      ? `SUPPORT · Evacuation support reached casualty #${s.support.patientId}.`
      : s.support.status === 'missed'
        ? `SUPPORT · Assistance arrived too late for #${s.support.patientId}.`
        : s.support.used ? 'SUPPORT · Called, but the mission ended before it arrived.'
          : 'HEMS · Not called (crate not found or support unused).';
    commsInfo.after(supportInfo);
    const bonusInfo=document.createElement('p');
    bonusInfo.className='domino-end-summary';
    const b=s.bonusStats;
    bonusInfo.textContent=`FIELD SUPPORT · collected ${b.collected} · STT bands used ${b.sttApplied} · vitals alerts ${b.alerts} · fire crew boosts ${b.pspUses} · medkits ${b.stabilizations}.`;
    supportInfo.after(bonusInfo);
    end.querySelector('#end-patients').innerHTML = s.patients.map(p => `<div class="patient-result"><span>Casualty ${p.id}</span><span>${p.tagged ? LABELS[p.tagged] : 'NOT ASSESSED'}</span><span>${p.tagged === p.expected ? '✓' : `→ ${LABELS[p.expected]}`}</span></div>`).join('');
    end.classList.add('is-open');
    inputHandler.setDisabled();
    selected = null;
    lastPatientVitals='';
    modal.classList.remove('is-open');
  }
  function render(deltaSeconds, now) {
    core.update(deltaSeconds);
    if (core.state.incident.pending && !incidentModalVisible) {
      incidentModalVisible = true;
      selected = null;
      modal.classList.remove('is-open');
      inputHandler.setDisabled();
      inputHandler.queue.length = 0;
      movementState.isMoving = false;
      dilemma.classList.add('is-open');
    }
    if (core.state.comms.pending && !commsModalVisible) {
      commsModalVisible = true;
      selected = null;
      modal.classList.remove('is-open');
      inputHandler.setDisabled();
      inputHandler.queue.length = 0;
      movementState.isMoving = false;
      radioDilemma.classList.add('is-open');
    }
    if (playerRadioLocked && core.state.comms.playerLockRemaining === 0) {
      playerRadioLocked = false;
      inputHandler.enableAndClear();
    }
    visuals.update(core.state.elapsed);
    responderVisuals.update(core.state.elapsed);
    pickupVisuals.update(now);
    lprVisuals.update(now);
    updateSelectedVitals();
    const pickup=nearbyPickup();
    const p = nearbyPatient();
    const wanted = playerRadioLocked ? 'Radio repair in progress — please wait...' : selected ? 'Triage 1–4 · T: STT · G: medkit' : pickup ? `Found ${{lpr:'HEMS',psp:'FIRE',medkit:'MEDKIT',stt:'STT'}[pickup.type] || pickup.type.toUpperCase()}${pickup.type==='stt'?' ×'+pickup.bands:''} · press E to collect` : p ? `Casualty ${p.id} · E assess · T band · G medkit` : 'Find casualties and search for rare support crates';
    if (wanted !== lastPrompt) { prompt.innerHTML = wanted; lastPrompt = wanted; }
    if (core.state.eventSerial > lastEventSerial) {
      const evt = core.state.events[core.state.events.length-1];
      // Prioritize visibility of reassignment announcements, even when dispatch
      // immediately follows and generates another event in the same frame.
      const fresh = core.state.events.filter(e=>e.seq>lastEventSerial);
      const important = [...fresh].reverse().find(e => e.message.includes('reassigned'));
      // Show a compact three-message event history rather than one chat-like toast.
      // Keep important dispatch messages even if multiple core events arrive in a frame.
      const prioritized = important ? [...fresh.filter(e => e !== important), important] : fresh;
      prioritized.slice(-3).forEach(e => radioMessage(e.message, e.type));
      lastEventSerial = core.state.eventSerial;
    }
    if (core.state.phase === 'ended') { showEnd(); return; }
    const a = core.state;
    const support = a.support;
    const supportText = support.status === 'locked' ? 'UNAVAILABLE — find a HEMS crate'
      : support.status === 'enroute'
      ? `EN ROUTE TO #${support.patientId} · ${Math.ceil(support.remaining)} s`
      : support.status === 'completed' ? `USED · rescued #${support.patientId}`
      : support.status === 'missed' ? `USED · too late for #${support.patientId}`
      : 'HEMS READY — press F after tagging RED';
    if (supportText !== lastSupport) {
      hud.querySelector('#support-status-text').textContent = supportText;
      lastSupport = supportText;
    }
    const inventoryText=`STT ${a.inventory.stt} · HEMS ${a.inventory.lpr?'READY':'—'} · FIRE ${a.inventory.psp} · MEDKIT ${a.inventory.medkit}`;
    if(inventoryText!==lastInventory){hud.querySelector('#bonus-inventory').textContent=inventoryText;lastInventory=inventoryText;}
    const activeMonitors=a.patients
      .filter(p=>p.monitorUntil>a.elapsed && !['evacuated','deceased'].includes(p.status))
      .sort((a,b)=>a.monitorUntil-b.monitorUntil || String(a.id).localeCompare(String(b.id))); // stable patient-to-slot association; alerts change color, never position
    sttPanel.querySelector('#stt-panel-status').textContent=`ACTIVE ${activeMonitors.length} / ${Math.max(3, activeMonitors.length)}`;
    sttPanel.querySelector('#stt-panel-inventory').textContent=`SPARE ${a.inventory.stt}`;
    const slotMarkup = Array.from({length:Math.min(4,Math.max(3,activeMonitors.length))}, (_, index) => {
      const p = activeMonitors[index];
      if (!p) return `<div class="stt-slot empty"><div class="stt-slot-index">STT ${String(index+1).padStart(2,'0')}</div><div class="stt-slot-body"><strong>STANDBY</strong><small>No active telemetry · press T to attach a band</small></div></div>`;
      return `<div class="stt-slot ${p.monitorAlert?'urgent':''}"><div class="stt-slot-index">STT ${String(index+1).padStart(2,'0')}</div><div class="stt-slot-body"><strong>CASUALTY ${p.id}</strong><div class="stt-slot-values"><span>HR <b>${p.vitals.hr}</b></span><span>SpO₂ <b>${p.vitals.spo2}%</b></span></div><small>${p.vitals.trend} · ${Math.ceil(p.monitorUntil-a.elapsed)} s</small></div></div>`;
    }).join('');
    const overflow = activeMonitors.length>4 ? `<div class="stt-overflow">+${activeMonitors.length-4} more monitored casualties</div>` : '';
    const readings=(slotMarkup + overflow);
    if(readings!==lastReadings){sttPanel.querySelector('#stt-live-readings').innerHTML=readings;lastReadings=readings;}
    const display = `${Math.ceil(a.timeLeft)}-${a.score}-${a.assessed}-${a.evacuated}-${a.teams.map(t=>`${t.busyTask || t.phase}:${Math.ceil(t.remaining)}`).join(',')}`;
    const queue = core.dispatchQueue();
    const queueText = queue.length
      ? queue.map(p => `#${p.id} ${p.tagged === 'red' ? '🔴 RED' : '🟡 YELLOW'}`).join('  ·  ')
      : 'No assessed casualties waiting';
    if (queueText !== lastQueue) {
      hud.querySelector('#dispatch-queue-text').textContent = queueText;
      hud.classList.toggle('has-critical', queue.some(p => p.tagged === 'red'));
      lastQueue = queueText;
    }
    const dominoText = a.incident.pending ? 'ALERT — choose 1 or 2'
      : a.incident.choice === 'secure' ? 'Securing access: 1 team diverted'
      : a.incident.choice === 'continue' ? 'Evacuation in progress — watch casualty 05'
      : 'Awaiting incident updates';
    if (dominoText !== lastDomino) {
      hud.querySelector('#domino-status-text').textContent = dominoText;
      lastDomino = dominoText;
    }
    const c = a.comms;
    const commsText = c.pending ? 'ALERT — choose 1 or 2'
      : c.playerLockRemaining > 0 ? `REPAIR: ${Math.ceil(c.playerLockRemaining)} s — responder immobilized`
      : c.teamOutageRemaining > 0 ? `TEAM 2 OFFLINE: ${Math.ceil(c.teamOutageRemaining)} s`
      : c.choice ? 'COMMS RESTORED' : 'RADIO: online';
    if (commsText !== lastComms) {
      hud.querySelector('#comms-status-text').textContent = commsText;
      lastComms = commsText;
    }
    if (lastDisplay === display) return;
    lastDisplay = display;
    hud.querySelector('.mission-time').textContent = formatClock(a.timeLeft);
    hud.querySelector('#ops-timer-fill').style.width = `${Math.max(0, Math.min(100, a.timeLeft / a.duration * 100))}%`;
    hud.classList.toggle('ops-timer-critical', a.timeLeft <= 45);
    hud.querySelector('#assessment-count').textContent = `${a.assessed}/${a.patients.length}`;
    hud.querySelector('#evac-count').textContent = a.evacuated;
    a.teams.forEach(t => {
      const e = hud.querySelector(`#crew-${t.id}`);
      e.textContent = t.id === 2 && a.comms.teamOutageRemaining > 0
        ? `TEAM 2: RADIO OFFLINE · ${Math.ceil(a.comms.teamOutageRemaining)}s`
        : t.busyTask === 'securing'
        ? `TEAM ${t.id}: SECURING SITE · ${Math.ceil(t.remaining)}s`
        : t.patientId ? `TEAM ${t.id}: ${{travel:'→ EN ROUTE',care:'✚ TREATING',transport:'▰ TRANSPORT'}[t.phase] || 'WORKING'} #${t.patientId} · ${Math.ceil(t.remaining)}s` : `TEAM ${t.id}: AVAILABLE`;
      e.classList.toggle('busy', !!t.patientId || !!t.busyTask || (t.id === 2 && a.comms.teamOutageRemaining > 0));
    });
    document.querySelector('.score strong').textContent = a.score;
  }
  return { core, render, dispose() { window.removeEventListener('keydown',keydown); pickupVisuals.dispose(); lprVisuals.dispose(); responderVisuals.dispose(); dilemma.remove(); radioDilemma.remove(); } };
}
