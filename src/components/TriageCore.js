/**
 * MASCAL 01 — fictional game-rules triage simulation.
 * These rules are NOT a clinical algorithm or an educational medical reference.
 * Pure JavaScript: testable without Three.js or a browser.
 */
import { EVAC_POINT, TEAM_STARTS, planRescueRoute, routeDistance, positionOnRoute } from './RescuePaths.js';
import { createMapPickups, sampleGameVitals, PICKUP_RADIUS, PATIENT_INTERACTION_RADIUS, STT_MONITOR_SECONDS, MEDKIT_SECONDS } from './TacticalSupport.js';

export const GAME_DURATION = 300;
export const TRIAGE_CHOICES = ['green', 'yellow', 'red', 'black'];

const PATIENT_TEMPLATES = [
  { id: '01', name: 'Passenger by the tracks', category: 'green', health: 100, decay: 0,
    signs: ['Can walk unaided', 'Alert and speaking', 'Breathing normally'], variant: 1, pose: 'standing' },
  { id: '02', name: 'Passenger near the overturned car', category: 'red', health: 68, decay: .42,
    signs: ['Unable to stand', 'Confused, difficult to communicate', 'Heavy bleeding'], variant: 6, pose: 'lying' },
  { id: '03', name: 'Traveller by the luggage', category: 'yellow', health: 87, decay: .13,
    signs: ['Cannot walk unaided', 'Conscious and responsive', 'Breathing calmly'], variant: 4, pose: 'seated' },
  { id: '04', name: 'Passenger near the railcar', category: 'red', health: 61, decay: .48,
    signs: ['Lying motionless', 'Weak response to voice', 'Irregular breathing'], variant: 9, pose: 'lying' },
  { id: '05', name: 'Passenger near the tent', category: 'yellow', health: 91, decay: .10,
    signs: ['Unable to walk without assistance', 'Responsive', 'Regular breathing'], variant: 11, pose: 'seated', worsensAt: 92 },
  { id: '06', name: 'Passenger near the debris', category: 'black', health: 0, decay: 0,
    signs: ['Unresponsive', 'No visible signs of breathing', 'No movement'], variant: 14, pose: 'lying' },
];

const PLACEMENTS = [
  [-50, 24], [34, 102], [96, 165], [175, 128], [-120, 53], [218, 78]
];

const TREATMENT_TIME = { red: 20, yellow: 13 };
const APPROACH_SPEED = 22;
const TRANSPORT_SPEED = 21;
export { EVAC_POINT, TEAM_STARTS };
const POINTS = { correct: 24, wrong: -12, evacuated: 70, lost: -75, evaluated: 0 };
const DISPATCH_ORDER = { red: 0, yellow: 1 }; // Only the player's assessed labels drive dispatch
export const GREEN_ASSEMBLY_SECONDS = 15;
export const DOMINO_EVENT_SECOND = 30;
export const DOMINO_SECURITY_SECONDS = 24;
export const DOMINO_WORSEN_SECOND = 80;
// Second independent strategic dilemma: game clock time, in seconds.
export const RADIO_EVENT_SECOND = 60;
export const RADIO_REPAIR_SECONDS = 12;
export const RADIO_OUTAGE_SECONDS = 24;
export const SUPPORT_ETA_SECONDS = 18;

// Gameplay 1.4: three authored variants, randomized per browser run.
// Variant 0 is the original mission and remains the deterministic default for tests.
export const SCENARIOS = Object.freeze([
  { id: 0, name: 'Derailment', smokeAt: 30, radioAt: 60,
    teamMultiplier: 1, patientChanges: {} },
  { id: 1, name: 'Derailment — initial chaos', smokeAt: 42, radioAt: 74,
    teamMultiplier: 1, patientChanges: {
      '02': { health: 56, decay: .56 },
      '04': { health: 70, decay: .36 },
      '03': { health: 78, decay: .18 },
    } },
  { id: 2, name: 'Derailment — blocked access', smokeAt: 24, radioAt: 84,
    teamMultiplier: 1.2, patientChanges: {
      '02': { health: 76, decay: .32 },
      '04': { health: 52, decay: .58 },
      '05': { health: 84, decay: .15 },
    } },
]);


/** Game balancing: five progressively harder MASCAL rounds. */
export const ROUND_CONFIGS = Object.freeze([
  { round: 1, title: 'FIRST RESPONSE', patients: 6, duration: 300, careMultiplier: 1.00, extraDeteriorations: 0 },
  { round: 2, title: 'RISING PRESSURE', patients: 8, duration: 285, careMultiplier: 1.05, extraDeteriorations: 1 },
  { round: 3, title: 'LIMITED RESOURCES', patients: 10, duration: 260, careMultiplier: 1.10, extraDeteriorations: 1 },
  { round: 4, title: 'SECONDARY HAZARDS', patients: 12, duration: 235, careMultiplier: 1.15, extraDeteriorations: 2 },
  { round: 5, title: 'CRITICAL OPERATION', patients: 14, duration: 210, careMultiplier: 1.20, extraDeteriorations: 3 },
]);
export const MAX_ROUND = ROUND_CONFIGS.length;
export function getRoundConfig(level = 1) {
  const safe = Math.max(1, Math.min(MAX_ROUND, Math.trunc(Number(level) || 1)));
  return ROUND_CONFIGS[safe - 1];
}

// Stable, dependency-free RNG. Replays vary, but ?seed=123 repeats exactly.
function seededRandom(seed) {
  let n = (Number(seed) >>> 0) || 0x9e3779b9;
  return () => { n ^= n << 13; n ^= n >>> 17; n ^= n << 5; return (n >>> 0) / 4294967296; };
}
const EXTRA_PLACEMENTS = [
  [-210, 10], [-214, 160], [-38, 154], [24, 198],
  [221, 198], [234, -10], [95, -83], [-30, -193],
  [-236, -192], [250, -196], [230, 22], [-255, 19],
];
const PATIENT_CASES = Object.freeze({
  green: [
    ['Can walk unaided', 'Alert, answers questions', 'Breathing calmly'],
    ['Reports minor abrasions', 'Stands without assistance', 'Kontakt zachowany'],
    ['Moves without assistance', 'Reports mild arm pain', 'Responds appropriately'],
  ],
  yellow: [
    ['Cannot walk without assistance', 'Alert and oriented', 'Regular breathing'],
    ['Reports severe limb pain', 'Conscious and oriented', 'No rapid deterioration observed'],
    ['Needs help to stand', 'Kontakt zachowany', 'Breathing evenly'],
  ],
  red: [
    ['Unable to stand', 'Delayed responses', 'Condition clearly unstable'],
    ['Severe weakness', 'Concerning bleeding', 'Needs urgent intervention'],
    ['Lying down, difficult to rouse', 'Irregular breathing', 'Rapid deterioration'],
  ],
  black: [
    ['No response to voice', 'No visible signs of breathing', 'No movement'],
    ['No response to stimuli', 'No visible breathing', 'Remains motionless'],
  ],
});
const GENERIC_NAMES = [
  'Passenger by the tracks', 'Passenger near the overturned car', 'Person by the luggage',
  'Traveller by the wreck', 'Passenger near the tent', 'Person by the debris',
  'Traveller by the road', 'Passenger by the fence', 'Person across the tracks',
  'Traveller by the trees', 'Passenger by the roadside', 'Person at the incident scene',
  'Traveller near the barriers', 'Passenger by the signal',
];

export function createRoundPatients(round, seed, scenario) {
  const config = getRoundConfig(round);
  const rnd = seededRandom(seed);
  const n = config.patients;
  // #05 stays yellow at the beginning for the existing smoke dilemma.
  const blackCount = n >= 12 ? 2 : 1;
  const greenCount = n >= 10 ? 2 : n >= 8 ? 2 : 1;
  const redCount = Math.min(n - 1 - blackCount - greenCount, Math.round(n * (0.32 + (round - 1) * .025)));
  const yellowCount = n - blackCount - greenCount - redCount;
  const deck = [
    ...Array(blackCount).fill('black'), ...Array(greenCount).fill('green'),
    ...Array(redCount).fill('red'), ...Array(yellowCount - 1).fill('yellow'),
  ];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const poses = { green: 'standing', yellow: 'seated', red: 'lying', black: 'lying' };
  let pointer = 0;
  const patients = Array.from({ length: n }, (_, i) => {
    const id = String(i + 1).padStart(2, '0');
    const category = i === 4 ? 'yellow' : deck[pointer++];
    const v = Math.floor(rnd() * PATIENT_CASES[category].length);
    const hp = category === 'red' ? 64 + rnd() * 28 : category === 'yellow' ? 83 + rnd() * 17 : category === 'green' ? 98 : 0;
    const decay = category === 'red' ? .18 + (round - 1) * .037 + rnd() * .15
      : category === 'yellow' ? .038 + (round - 1) * .015 + rnd() * .065 : 0;
    const point = (i < PLACEMENTS.length ? PLACEMENTS[i] : EXTRA_PLACEMENTS[i - PLACEMENTS.length]);
    if (!point) throw new Error(`Missing placement for patient ${id}`);
    return {
      id, name: GENERIC_NAMES[i] || `Passenger ${id}`, category,
      health: Math.round(hp * 10) / 10, decay, signs: [...PATIENT_CASES[category][v]],
      variant: Math.floor(rnd() * 20) + 1, pose: poses[category],
      pos: { x: point[0], y: point[1] },
      worsensAt: null,
    };
  });
  // Extra events affect unrescued yellow patients, not predetermined IDs.
  const candidates = patients.filter(p => p.category === 'yellow' && p.id !== '05');
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1)); [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  for (const patient of candidates.slice(0, config.extraDeteriorations))
    patient.worsensAt = Math.round(65 + rnd() * (config.duration * .43));
  // Keep scenario modifiers meaningful without overwriting patient categories.
  for (const patient of patients) {
    const change = scenario.patientChanges[patient.id];
    if (change && patient.category !== 'black') {
      patient.health = Math.max(15, Math.min(100, patient.health + (change.health - (PATIENT_TEMPLATES.find(p => p.id === patient.id)?.health || 80)) * .38));
      patient.decay = Math.max(0, patient.decay + ((change.decay || 0) - (PATIENT_TEMPLATES.find(p => p.id === patient.id)?.decay || 0)) * .25);
    }
  }
  return patients;
}


export function createTriageCore(options = {}) {
  const requested = Number(options.variant ?? 0);
  const variant = Number.isInteger(requested) && requested >= 0 && requested < SCENARIOS.length ? requested : 0;
  const scenario = SCENARIOS[variant];
  const progression = options.round != null || options.seed != null;
  const round = progression ? getRoundConfig(options.round) : getRoundConfig(1);
  const roundPatients = progression ? createRoundPatients(round.round, options.seed ?? 1, scenario) : PATIENT_TEMPLATES.map((template, index) => ({
    ...template, pos: { x: PLACEMENTS[index][0], y: PLACEMENTS[index][1] },
  }));
  const activeScenario = progression ? { ...scenario, teamMultiplier: scenario.teamMultiplier * round.careMultiplier, smokeAt: Math.max(14, scenario.smokeAt - (round.round - 1) * 2), radioAt: Math.max(42, scenario.radioAt - (round.round - 1) * 3) } : scenario;
  const loot = progression ? createMapPickups({seed: options.seed ?? 1, round: round.round, patientPositions: roundPatients.map(p=>p.pos)}) : [];
  const state = {
    pickups: loot,
    inventory: { stt: 0, lpr: 0, psp: 0, medkit: 0 },
    bonusStats: { collected: 0, sttApplied: 0, alerts: 0, stabilizations: 0, pspUses: 0 },
    eventSerial: 0,
    timeLeft: progression ? round.duration : GAME_DURATION, elapsed: 0, phase: 'playing', score: 0,
    round: round.round, duration: progression ? round.duration : GAME_DURATION,
    roundTitle: round.title, isProgression: progression, seed: options.seed ?? null,
    assessed: 0, evacuated: 0, lost: 0, redirected: 0, events: [],
    scenario: { id: scenario.id, name: scenario.name, smokeAt: activeScenario.smokeAt, radioAt: activeScenario.radioAt },
    support: { used: false, status: progression ? 'locked' : 'ready', patientId: null, remaining: 0, outcome: null },
    performance: {
      assignments: 0, totalTravel: 0, totalTreatment: 0, totalTransport: 0,
      priorityRedirects: 0, firstAssessmentAt: null, moments: [],
    },
    patients: roundPatients.map((template) => ({
      ...template, ...(!progression ? scenario.patientChanges[template.id] || {} : {}), category: template.category, tagged: null, tagScore: 0,
      pos: { ...template.pos },
      status: template.category === 'black' ? 'deceased' : 'waiting',
      teamId: null, evacuationTimer: 0, deteriorationAlertSent: false,
      assessedAt: null, dispatchedAt: null, firstContactAt: null, evacuatedAt: null,
      queuedSeconds: 0,
      initialHealth: template.health,
      vitals: {hr:0,spo2:0,trend:'No reading'},
      monitorUntil: 0, monitorLastAlertAt: -1e6, monitorAlert: false,
      stabilizedUntil: 0,
    })),
    teams: [1, 2].map(id => ({
      id, patientId: null, remaining: 0, busyTask: null,
      phase: 'idle', phaseDuration: 0, phaseElapsed: 0, route: [],
      at: { ...TEAM_STARTS[id - 1] }, target: null,
      routeFrom: { ...TEAM_STARTS[id - 1] },
      assignedAt: null, workload: 0,
    })),
    incident: { pending: false, choice: null, triggered: false, secured: false, outcomeNotified: false },
    comms: { pending: false, triggered: false, choice: null, playerLockRemaining: 0, teamOutageRemaining: 0, resolvedAt: null },
  };
  // Sampling is independent of collection; monitoring only reveals existing game signals.
  for(const p of state.patients) p.vitals = sampleGameVitals(p, 0);
  let lastRadioSecond = -1;
  function notify(message, type = 'info') {
    state.events.push({ message, type, at: Math.round(state.elapsed), seq: ++state.eventSerial });
    if (state.events.length > 80) state.events.shift();
  }

  function recordMoment(kind, title, detail, patientId = null) {
    state.performance.moments.push({
      kind, title, detail, patientId, at: Math.round(state.elapsed),
    });
    if (state.performance.moments.length > 30) state.performance.moments.shift();
  }

  function resetTeam(team) {
    if ((team.phase === 'travel' || team.phase === 'transport') && team.phaseElapsed < team.phaseDuration - 1e-7)
      team.at = positionOnRoute(team.route, team.phaseDuration > 0 ? team.phaseElapsed / team.phaseDuration : 1);
    team.patientId = null;
    team.remaining = 0;
    team.phase = 'idle';
    team.phaseDuration = 0;
    team.phaseElapsed = 0;
    team.route = [];
    team.target = null;
    team.assignedAt = null;
  }

  function setPhase(team, phase, path, duration) {
    team.phase = phase;
    team.route = path;
    team.phaseDuration = Math.max(0.01, duration);
    team.phaseElapsed = 0;
  }

  function beginTransport(team, patient) {
    const route = planRescueRoute(patient.pos, EVAC_POINT);
    const seconds = routeDistance(route) / TRANSPORT_SPEED * activeScenario.teamMultiplier;
    setPhase(team, 'transport', route, seconds);
    patient.status = 'transport';
    notify(`Team ${team.id}: transporting casualty ${patient.id} to the evacuation zone.`, 'dispatch');
  }

  function advanceTeam(team, delta) {
    if (team.busyTask === 'securing') {
      team.remaining = Math.max(0, team.remaining - delta);
      team.workload += delta;
      if (team.remaining <= 0) {
        team.busyTask = null;
        notify(`Team ${team.id} finished securing the area and is available again.`, 'success');
      }
      return;
    }
    if (team.patientId === null) return;
    const patient = state.patients.find(p => p.id === team.patientId);
    if (!patient || patient.status === 'deceased' || patient.status === 'evacuated') { resetTeam(team); return; }
    let dt = delta;
    let safety = 0;
    while (dt > 0 && team.patientId !== null && safety++ < 4) {
      const step = Math.min(dt, team.phaseDuration - team.phaseElapsed);
      team.phaseElapsed += step;
      team.remaining = Math.max(0, team.remaining - step);
      team.workload += step;
      if (team.phase === 'travel') state.performance.totalTravel += step;
      if (team.phase === 'care') state.performance.totalTreatment += step;
      if (team.phase === 'transport') state.performance.totalTransport += step;
      dt -= step;
      if (team.phaseElapsed < team.phaseDuration - 1e-7) break;
      if (team.phase === 'travel') {
        team.at = { ...patient.pos };
        patient.firstContactAt ??= state.elapsed;
        recordMoment('arrival', `Team ${team.id} reached #${patient.id}`,
          `Time from assessment to first care: ${Math.max(0, Math.round(state.elapsed - (patient.assessedAt ?? state.elapsed)))} s.`, patient.id);
        setPhase(team, 'care', [{...team.at}], (TREATMENT_TIME[patient.tagged] + (progression ? Math.max(0, round.round - 2) * 2 : 0)) * activeScenario.teamMultiplier);
      } else if (team.phase === 'care') {
        beginTransport(team, patient);
      } else if (team.phase === 'transport') {
        team.at = { ...EVAC_POINT };
        patient.status = 'evacuated';
        patient.teamId = null;
        patient.evacuatedAt = state.elapsed;
        state.evacuated++;
        state.score += POINTS.evacuated;
        notify(`Team ${team.id} handed over casualty ${patient.id} at the evacuation point.`, 'success');
        resetTeam(team);
      }
    }
  }

  function availablePatients() {
    return state.patients.filter(p => !['evacuated', 'deceased'].includes(p.status));
  }
  function dispatchQueue() {
    return state.patients
      .filter(p => p.tagged && p.status === 'waiting' && p.category !== 'black'
        && Object.hasOwn(DISPATCH_ORDER, p.tagged))
      .sort((a, b) => DISPATCH_ORDER[a.tagged] - DISPATCH_ORDER[b.tagged]
        || a.health - b.health || a.id.localeCompare(b.id));
  }

  function dispatchTeams() {
    // The rescue team knows ONLY the tags already assigned by the player.
    // An undiscovered red patient cannot be prioritized in advance.
    const waiting = dispatchQueue();
    if (!waiting.length) return;

    // Arcade rule: when newly assessed red patients must wait, redirect a team
    // currently assigned to a yellow patient. The yellow returns to the queue.
    // Avoid interrupting another red case and never dispatch the same patient twice.
    const waitingRed = waiting.filter(p => p.tagged === 'red');
    if (waitingRed.length && state.teams.every(t => t.patientId !== null || t.busyTask || (t.id === 2 && state.comms.teamOutageRemaining > 0))) {
      const yellowTeams = state.teams.filter(team => {
        const assigned = state.patients.find(p => p.id === team.patientId);
        return assigned?.status === 'treatment' && assigned.tagged === 'yellow'
          && !(team.id === 2 && state.comms.teamOutageRemaining > 0);
      });
      if (!yellowTeams.length) return;
      // Redirect the team with the most remaining time (least progress lost).
      yellowTeams.sort((a, b) => b.remaining - a.remaining);
      const team = yellowTeams[0];
      const oldPatient = state.patients.find(p => p.id === team.patientId);
      oldPatient.status = 'waiting';
      oldPatient.teamId = null;
      resetTeam(team);
      state.redirected++;
      state.performance.priorityRedirects++;
      recordMoment('red-priority', 'Urgent RED priority',
        `Team ${team.id} left casualty #${oldPatient.id} for a higher-priority call.`, oldPatient.id);
      notify(`RED PRIORITY: team ${team.id} reassigned from casualty ${oldPatient.id}.`, 'warning');
      // The freed slot is allocated by the priority queue below.
    }

    const candidates = dispatchQueue();
    for (const team of state.teams) {
      if (team.patientId !== null || team.busyTask || !candidates.length
        || (team.id === 2 && state.comms.teamOutageRemaining > 0)) continue;
      const patient = candidates.shift();
      const route = planRescueRoute(team.at, patient.pos);
      // PSP clears an access route for one dispatch. It never teleports a casualty.
      const pspBonus = state.inventory.psp > 0 ? 0.80 : 1;
      const outbound = routeDistance(route) / APPROACH_SPEED * activeScenario.teamMultiplier * pspBonus;
      if (pspBonus < 1) {
        state.inventory.psp--; state.bonusStats.pspUses++;
        notify(`FIRE CREW: cleared access for team ${team.id} to casualty ${patient.id}.`, 'success');
        recordMoment('bonus', 'Fire crew support', `Approach time to #${patient.id} reduced by 20%.`, patient.id);
      }
      const inbound = routeDistance(planRescueRoute(patient.pos, EVAC_POINT)) / TRANSPORT_SPEED * activeScenario.teamMultiplier;
      const treatment = (TREATMENT_TIME[patient.tagged] + (progression ? Math.max(0, round.round - 2) * 2 : 0)) * activeScenario.teamMultiplier;
      team.patientId = patient.id;
      team.remaining = outbound + treatment + inbound;
      team.assignedAt = state.elapsed;
      setPhase(team, 'travel', route, outbound);
      patient.teamId = team.id;
      patient.dispatchedAt ??= state.elapsed;
      patient.status = 'treatment';
      state.performance.assignments++;
      notify(`Team ${team.id} → casualty ${patient.id} (${patient.tagged.toUpperCase()}, ${Math.ceil(team.remaining)} s)`, 'dispatch');
    }
  }

  function finish() {
    if (state.phase !== 'playing') return;
    state.phase = 'ended';
    const correct = state.patients.filter(p => p.tagged === p.category).length;
    const errors = state.patients.filter(p => p.tagged && p.tagged !== p.category).length;
    const totalAlive = state.patients.filter(p => p.category !== 'black').length;
    const total = state.patients.length;
    const gradedAccuracy = Math.round(correct / total * 100);
    const redPatients = state.patients.filter(p => p.tagged === 'red');
    const responseTimes = redPatients.filter(p => p.firstContactAt !== null && p.assessedAt !== null)
      .map(p => Math.max(0, p.firstContactAt-p.assessedAt));
    const redResponse = responseTimes.length
      ? Math.round(responseTimes.reduce((sum,n)=>sum+n,0) / responseTimes.length) : null;
    const teamUtilization = state.teams.map(t => Math.round(t.workload / Math.max(1,state.elapsed) * 100));
    const rescueRate = state.evacuated / Math.max(1,totalAlive);
    const quality = Math.max(0,Math.min(100,Math.round(
      gradedAccuracy * .40 + rescueRate * 100 * .45 +
      (state.assessed === total ? 10 : state.assessed / total * 10) -
      Math.min(12,state.lost * 4) + (state.redirected ? 5 : 0)
    )));
    const feedback = [];
    if (state.assessed < total) feedback.push(`Only ${state.assessed}/${total} casualties assessed. Survey the entire scene early.`);
    if (errors) feedback.push(`${errors} casualties received an incorrect triage category. Check the signs before assigning priority.`);
    if (state.lost) feedback.push(`${state.lost} casualties died during the response. Reduce the time to assessment and care.`);
    if (state.incident.choice === 'continue' && state.patients.find(p=>p.id==='05')?.deteriorationAlertSent)
      feedback.push('Continuing evacuation exposed casualty #05 to further deterioration. Securing the approach could have prevented this.');
    if (state.comms.choice === 'continue')
      feedback.push('The unresolved radio outage halted Team 2. Compare this outcome with repairing communications.');
    if (state.support.used === false && state.support.status === 'ready') feedback.push('Available helicopter support was left unused.');
    if (state.bonusStats.sttApplied > 0) feedback.push(`STT monitored ${state.bonusStats.sttApplied} casualties; ${state.bonusStats.alerts} trend alerts triggered.`);
    if (!feedback.length) feedback.push('Good decision quality and effective use of available rescue teams.');
    const passed = state.assessed >= Math.ceil(total * .65) && gradedAccuracy >= 55 && state.evacuated >= 1;
    state.summary = {
      round: state.round, duration: state.duration, passed, total,
      correct, errors, quality, grade: quality>=85?'A':quality>=70?'B':quality>=50?'C':'D',
      gradedAccuracy, redResponse, teamUtilization,
      performance: { ...state.performance, moments: state.performance.moments.slice() },
      feedback: feedback.slice(0,3),
      assessed: state.patients.filter(p => p.tagged).length,
      evacuated: state.evacuated,
      lost: state.lost,
      totalAlive,
      score: state.score,
      incident: { ...state.incident },
      comms: { ...state.comms },
      support: { ...state.support },
      bonusStats: { ...state.bonusStats },
      inventory: { ...state.inventory },
      scenario: { ...state.scenario },
      patients: state.patients.map(p => ({ id: p.id, expected: p.category, tagged: p.tagged, status: p.status, assessedAt: p.assessedAt, firstContactAt: p.firstContactAt, evacuatedAt: p.evacuatedAt })),
    };
    notify('Mission complete — debrief ready.', 'end');
  }

  /** Collect an actual world object: within range, at most once, no auto-use. */
  function collectPickup(id, playerPosition) {
    if (state.phase !== 'playing' || state.incident.pending || state.comms.pending || state.comms.playerLockRemaining > 0) return false;
    const pickup=state.pickups.find(p=>p.id===id && !p.collected);
    if(!pickup || !playerPosition || Math.hypot(playerPosition.x-pickup.pos.x,playerPosition.y-pickup.pos.y)>PICKUP_RADIUS) return false;
    pickup.collected=true;
    state.bonusStats.collected++;
    if(pickup.type==='stt') {
      state.inventory.stt+=pickup.bands;
      notify(`STT FOUND: ${pickup.bands} bands. Approach an assessed casualty and press T.`, 'success');
    } else if(pickup.type==='lpr') {
      state.inventory.lpr=1;
      if(!state.support.used) state.support.status='ready';
      notify('HEMS FOUND: press F for one-time helicopter support for a RED casualty.', 'success');
    } else if(pickup.type==='psp') {
      state.inventory.psp++;
      notify('FIRE CREW FOUND: the next rescue team approach will be 20% faster.', 'success');
      dispatchTeams();
    } else {
      state.inventory.medkit++;
      notify('MEDKIT FOUND: approach an assessed casualty and press G.', 'success');
    }
    recordMoment('bonus', `Collected ${{lpr:'HEMS',psp:'FIRE',medkit:'MEDKIT',stt:'STT'}[pickup.type] || pickup.type.toUpperCase()}`,
      pickup.type==='stt' ? `Kit contains ${pickup.bands} monitoring bands.` : 'Support item collected on the map.');
    return true;
  }

  function nearPatientForItem(id, playerPosition) {
    const p=state.patients.find(p=>p.id===id);
    if(!playerPosition || !p || !p.tagged || p.category==='black' ||
      !['waiting','treatment'].includes(p.status) || p.health<=0 ||
      Math.hypot(playerPosition.x-p.pos.x,playerPosition.y-p.pos.y)>PATIENT_INTERACTION_RADIUS) return null;
    return p;
  }
  function attachSTT(id, playerPosition) {
    if(state.phase!=='playing' || state.inventory.stt<=0 || state.incident.pending || state.comms.pending || state.comms.playerLockRemaining>0) return false;
    const p=nearPatientForItem(id,playerPosition);
    if(!p || p.monitorUntil>state.elapsed) return false;
    state.inventory.stt--;
    p.monitorUntil=state.elapsed+STT_MONITOR_SECONDS;
    p.monitorLastAlertAt=-1e6;
    p.monitorAlert=false;
    state.bonusStats.sttApplied++;
    notify(`STT attached to casualty #${id}. Telemetry active for ${STT_MONITOR_SECONDS} s.`, 'success');
    recordMoment('bonus', `STT monitoring #${id}`, 'The band reveals changes in simulated vitals; the player makes the call.', id);
    return true;
  }
  function applyMedkit(id, playerPosition) {
    if(state.phase!=='playing' || state.inventory.medkit<=0 || state.incident.pending || state.comms.pending || state.comms.playerLockRemaining>0) return false;
    const p=nearPatientForItem(id,playerPosition);
    if(!p || p.stabilizedUntil>state.elapsed) return false;
    state.inventory.medkit--;
    p.stabilizedUntil=state.elapsed+MEDKIT_SECONDS;
    state.bonusStats.stabilizations++;
    notify(`MEDKIT: slowed deterioration for #${id} for ${MEDKIT_SECONDS} s.`, 'success');
    recordMoment('bonus', `Medical kit #${id}`, 'Slowed deterioration; no automatic evacuation.',id);
    return true;
  }
  function updateTelemetry() {
    for(const p of state.patients) {
      p.vitals=sampleGameVitals(p,state.elapsed);
      if(p.monitorUntil>0 && state.elapsed>=p.monitorUntil) {
        p.monitorUntil=0;
        p.monitorAlert=false;
        notify(`STT #${p.id}: monitoring session ended.`, 'radio');
      }
      if(p.monitorUntil<=state.elapsed || !['waiting','treatment','self-evacuation'].includes(p.status)) continue;
      const suspicious=p.vitals.trend==='Warning: abnormal trend' ||
        (p.category==='yellow' && p.vitals.spo2<=93 && p.vitals.hr>=112);
      p.monitorAlert=suspicious;
      if(suspicious && state.elapsed-p.monitorLastAlertAt>=18) {
        p.monitorLastAlertAt=state.elapsed;
        state.bonusStats.alerts++;
        notify(`STT #${p.id}: VITALS ALERT · HR ${p.vitals.hr}/min, SpO₂ ${p.vitals.spo2}% — reassess casualty.`, 'warning');
        recordMoment('stt-warning', `STT alert for #${p.id}`,
          'Abnormal trend detected. STT does not automatically change the triage category.', p.id);
      }
    }
  }

  function tagPatient(id, label) {
    if (state.phase !== 'playing' || !TRIAGE_CHOICES.includes(label)) return false;
    const patient = state.patients.find(p => p.id === id);
    if (!patient || patient.status === 'evacuated' || ['self-evacuation','transport'].includes(patient.status) || (patient.status === 'deceased' && patient.category !== 'black')) return false;
    // Reassessment must invalidate an obsolete dispatch, otherwise switching a
    // patient from yellow/red to green/black leaves a phantom medical team.
    if (patient.tagged !== label && patient.status === 'treatment') {
      for (const team of state.teams) {
        if (team.patientId === patient.id) resetTeam(team);
      }
      patient.status = 'waiting';
      patient.teamId = null;
    }
    // Reassessment is possible, but never repeatedly rewards points for the same patient.
    if (patient.tagged === null) {
      state.assessed++;
      patient.assessedAt = state.elapsed;
      state.performance.firstAssessmentAt ??= state.elapsed;
    }
    state.score -= patient.tagScore;
    patient.tagged = label;
    patient.tagScore = label === patient.category ? POINTS.correct : POINTS.wrong;
    state.score += patient.tagScore;
    notify(`Triage ${patient.id}: ${label.toUpperCase()}`, label === patient.category ? 'assessment' : 'warning');
    if (label !== patient.category) recordMoment('assessment', `Triage #${patient.id} needs review`,
      'Assigned triage category did not match the casualty’s condition in this round.', patient.id);
    if (label === 'green' && patient.category === 'green' && patient.status === 'waiting') {
      patient.evacuationTimer = GREEN_ASSEMBLY_SECONDS;
      patient.status = 'self-evacuation';
      notify(`Casualty ${id} is moving to the assembly area.`, 'dispatch');
    }
    dispatchTeams();
    return true;
  }

  // Gameplay 1.5: one request for outside help. It arrives after 18 game seconds,
  // automatically taking the most critical already-triaged RED patient.
  // Unlike a magic instant rescue, a late call may still fail.
  function requestSupport() {
    if (state.phase !== 'playing' || state.incident.pending || state.comms.pending || state.support.used) return false;
    if(state.isProgression && state.inventory.lpr<=0) {
      notify('HEMS: first locate and collect a support crate on the map.', 'warning');
      return false;
    }
    const eligible = state.patients
      .filter(p => p.tagged === 'red' && p.category === 'red' && ['waiting', 'treatment'].includes(p.status))
      .sort((a, b) => a.health - b.health || a.id.localeCompare(b.id));
    if (!eligible.length) {
      notify('SUPPORT: first assess a RED-priority casualty.', 'warning');
      return false;
    }
    const target = eligible[0];
    state.support.used = true;
    if(state.isProgression) state.inventory.lpr=0;
    state.support.status = 'enroute';
    state.support.patientId = target.id;
    state.support.remaining = SUPPORT_ETA_SECONDS;
    recordMoment('support', `Helicopter dispatched to #${target.id}`,
      `Called at ${Math.round(state.elapsed)} s, ETA ${SUPPORT_ETA_SECONDS} s.`, target.id);
    notify(`HEMS DISPATCHED: casualty #${target.id}, ETA ${SUPPORT_ETA_SECONDS} s.`, 'dispatch');
    return true;
  }

  function updateSupport(delta) {
    if (state.support.status !== 'enroute') return;
    state.support.remaining = Math.max(0, state.support.remaining - delta);
    if (state.support.remaining > 0) return;
    const patient = state.patients.find(p => p.id === state.support.patientId);
    if (patient && ['waiting', 'treatment'].includes(patient.status) && patient.health > 0) {
      // An assigned core team is immediately freed when the reinforcement takes over.
      for (const team of state.teams) {
        if (team.patientId === patient.id) resetTeam(team);
      }
      patient.teamId = null;
      patient.status = 'evacuated';
      patient.evacuatedAt = state.elapsed;
      state.evacuated++;
      state.score += POINTS.evacuated;
      state.support.status = 'completed';
      state.support.outcome = 'rescued';
      notify(`SUPPORT: casualty #${patient.id} evacuated; the team is available again.`, 'success');
    } else {
      state.support.status = 'missed';
      state.support.outcome = patient?.status === 'deceased' ? 'too-late' : 'already-evacuated';
      notify(`SUPPORT: arrived too late for casualty #${state.support.patientId}.`, 'warning');
    }
  }

  function resolveIncident(choice) {
    if (state.phase !== 'playing' || !state.incident.pending || !['secure', 'continue'].includes(choice)) return false;
    state.incident.pending = false;
    state.incident.choice = choice;
    const patient05 = state.patients.find(p => p.id === '05');
    if (choice === 'secure') {
      // Trade-off: make one team unavailable for 24 game seconds.
      // Prefer an idle team, then an occupied yellow case, then an occupied red case.
      const team = state.teams.find(t => !t.busyTask && t.patientId === null)
        || state.teams.find(t => state.patients.find(p => p.id === t.patientId)?.tagged === 'yellow')
        || state.teams.find(t => !t.busyTask);
      if (team) {
        if (team.patientId !== null) {
          const interrupted = state.patients.find(p => p.id === team.patientId);
          if (interrupted?.status === 'treatment') {
            interrupted.status = 'waiting';
            interrupted.teamId = null;
            notify(`Team ${team.id} paused care for casualty ${interrupted.id} to secure the site.`, 'warning');
          }
        }
        resetTeam(team);
        team.busyTask = 'securing';
        team.phase = 'securing';
        team.remaining = DOMINO_SECURITY_SECONDS;
      }
      if (patient05 && patient05.category === 'yellow' && !['deceased', 'evacuated'].includes(patient05.status)) {
        patient05.worsensAt = null;
        state.incident.secured = true;
      }
      recordMoment('incident', 'Approach secured',
        'One team diverted for 24 s, reducing the risk to casualty #05.', '05');
      notify('DECISION: secure the site. One team unavailable for 24 s.', 'dispatch');
    } else {
      if (patient05 && patient05.category === 'yellow' && !['deceased', 'evacuated'].includes(patient05.status)) {
        patient05.worsensAt = activeScenario.smokeAt + (DOMINO_WORSEN_SECOND - DOMINO_EVENT_SECOND);
      }
      recordMoment('incident', 'Evacuation continued despite smoke',
        'Both teams remain active, but casualty #05 stays at risk.', '05');
      notify('DECISION: continue evacuation. Casualty #05 may deteriorate.', 'warning');
    }
    dispatchTeams();
    return true;
  }

  function resolveComms(choice) {
    if (state.phase !== 'playing' || !state.comms.pending || !['repair', 'continue'].includes(choice)) return false;
    state.comms.pending = false;
    state.comms.choice = choice;
    state.comms.resolvedAt = Math.round(state.elapsed);
    if (choice === 'repair') {
      state.comms.playerLockRemaining = RADIO_REPAIR_SECONDS;
      notify(`COMMS: responder repairs the radio for ${RADIO_REPAIR_SECONDS} s. Teams continue working.`, 'warning');
    } else {
      state.comms.teamOutageRemaining = RADIO_OUTAGE_SECONDS;
      notify(`COMMS: responder continues. Team 2 is offline for ${RADIO_OUTAGE_SECONDS} s.`, 'warning');
    }
    recordMoment('comms', choice === 'repair' ? 'Communications restored' : 'Continued without communications',
      choice === 'repair' ? 'Responder spends 12 s on repairs.' : 'Team 2 loses 24 s of operation.');
    dispatchTeams();
    return true;
  }

  function update(rawDelta) {
    if (state.phase !== 'playing' || state.incident.pending || state.comms.pending) return;
    const delta = Math.min(Math.max(rawDelta, 0), 0.25);
    state.timeLeft = Math.max(0, state.timeLeft - delta);
    state.elapsed = state.duration - state.timeLeft;
    if (!state.incident.triggered && state.elapsed >= activeScenario.smokeAt) {
      state.incident.triggered = true;
      state.incident.pending = true;
      notify('ALERT: Smoke near the tents. Secure access or continue evacuation?', 'warning');
      return; // The mission clock stays paused until the player chooses.
    }
    if (!state.comms.triggered && state.elapsed >= activeScenario.radioAt) {
      state.comms.triggered = true;
      state.comms.pending = true;
      notify('COMMS ALERT: Team 2 lost contact. Repair the radio or continue?', 'warning');
      return;
    }
    if (state.comms.playerLockRemaining > 0) {
      const old = state.comms.playerLockRemaining;
      state.comms.playerLockRemaining = Math.max(0, old - delta);
      if (old > 0 && state.comms.playerLockRemaining === 0)
        notify('COMMS: radio restored — responder can move again.', 'success');
    }
    if (state.comms.teamOutageRemaining > 0) {
      const old = state.comms.teamOutageRemaining;
      state.comms.teamOutageRemaining = Math.max(0, old - delta);
      if (old > 0 && state.comms.teamOutageRemaining === 0)
        notify('COMMS: Team 2 is back online.', 'success');
    }

    for (const p of state.patients) {
      if (['evacuated', 'deceased'].includes(p.status)) continue;
      if (p.worsensAt && state.elapsed >= p.worsensAt && p.category === 'yellow' && p.status !== 'transport') {
        p.category = 'red';
        p.worsensAt = null;
        p.decay = Math.max(p.decay, .35 + (state.round - 1) * .04);
        p.signs = ['Unable to stand', 'Responsiveness decreasing', 'Condition deteriorating rapidly'];
        if (!p.deteriorationAlertSent) {
          notify(`${p.id === '05' ? 'DOMINO EFFECT' : 'URGENT'}: casualty ${p.id} has deteriorated — reassess now!`, 'warning');
          p.deteriorationAlertSent = true;
        }
        // A previously assigned yellow tag becomes inaccurate; no automatic update.
        if (p.tagged) { state.score -= p.tagScore; p.tagScore = p.tagged === p.category ? POINTS.correct : POINTS.wrong; state.score += p.tagScore; }
      }
      // During a radio blackout team 2 pauses treatment; patient health continues to change.
      const affectedByOutage = p.teamId === 2 && state.comms.teamOutageRemaining > 0;
      const assignedTeam = state.teams.find(t => t.patientId === p.id);
      const careFactor = assignedTeam?.phase === 'care' && !affectedByOutage ? .16 : 1;
      const kitFactor = p.stabilizedUntil>state.elapsed ? .32 : 1;
      p.health = Math.max(0, p.health - p.decay * delta * careFactor * kitFactor);
      if (p.health <= 0) {
        p.status = 'deceased';
        p.teamId = null;
        state.lost++;
        state.score += POINTS.lost;
        notify(`Casualty ${p.id} has died.`, 'warning');
        for (const team of state.teams) if (team.patientId === p.id) resetTeam(team);
      }
      if (p.status === 'self-evacuation') {
        p.evacuationTimer -= delta;
        if (p.evacuationTimer <= 0) {
          p.status = 'evacuated'; p.evacuatedAt = state.elapsed;
          state.evacuated++; state.score += POINTS.evacuated;
          notify(`Casualty ${p.id} reached the safe zone.`, 'success');
        }
      }
    }

    updateTelemetry();
    updateSupport(delta);

    for (const patient of state.patients) {
      if (patient.status === 'waiting' && patient.tagged === 'red') patient.queuedSeconds += delta;
    }
    for (const team of state.teams) {
      if (team.id === 2 && state.comms.teamOutageRemaining > 0) continue;
      advanceTeam(team, delta);
    }
    dispatchTeams();
    if (!state.incident.outcomeNotified && state.incident.choice === 'secure' && state.elapsed >= 92) {
      state.incident.outcomeNotified = true;
      notify('DOMINO EFFECT: securing access prevented additional risk to casualty #05.', 'success');
    }
    const second = Math.floor(state.elapsed);
    if (second !== lastRadioSecond) {
      lastRadioSecond = second;
      if (second === 45) notify('Dispatch: only two rescue teams available. Prioritize carefully.', 'radio');
      if (second === 120) notify('Dispatch: check any casualties you have not yet assessed.', 'radio');
    }
    if (state.timeLeft <= 0 || (state.patients.every(p => p.tagged) && state.patients.every(p => ['evacuated', 'deceased'].includes(p.status)))) finish();
  }

  return { state, tagPatient, resolveIncident, resolveComms, requestSupport, collectPickup, attachSTT, applyMedkit, update, finish, notify, dispatchTeams, dispatchQueue, availablePatients };
}
