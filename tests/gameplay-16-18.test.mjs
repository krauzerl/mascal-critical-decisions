import assert from 'node:assert/strict';
import { createTriageCore, GAME_DURATION } from '../src/components/TriageCore.js';
import {
  TEAM_STARTS, EVAC_POINT, routeDistance, routeIsClear, planRescueRoute,
  positionOnRoute, isRescueWalkable,
} from '../src/components/RescuePaths.js';

function advance(game, seconds, domino = 'secure', comms = 'repair') {
  for(let i=0;i<seconds*4;i++) {
    game.update(.25);
    if(game.state.incident.pending) assert.ok(game.resolveIncident(domino));
    if(game.state.comms.pending) assert.ok(game.resolveComms(comms));
  }
}

// An actual route avoids all collision footprints rather than flying through the wagon.
for (const variant of [0,1,2]) {
  const g=createTriageCore({variant});
  for(const p of g.state.patients) {
    for (const [a,b] of [[TEAM_STARTS[0],p.pos],[TEAM_STARTS[1],p.pos],[p.pos,EVAC_POINT]]) {
      const route=planRescueRoute(a,b);
      assert.ok(route.length>=2);
      assert.deepEqual(route[0],a);
      assert.deepEqual(route.at(-1),b);
      for(let i=1;i<route.length;i++)assert.ok(routeIsClear(route[i-1],route[i]),`${p.id}: obstruction on planned path`);
      const half=positionOnRoute(route,.5);
      assert.ok(isRescueWalkable(half),`${p.id}: halfway inside obstruction`);
      assert.ok(routeDistance(route)>=Math.hypot(a.x-b.x,a.y-b.y)-.01);
    }
  }
}

// A dispatched team first travels, then treats, then carries the patient to evacuation.
{
  const g=createTriageCore();
  const p=g.state.patients.find(p=>p.id==='02');
  g.tagPatient('02','red');
  const t=g.state.teams.find(t=>t.patientId==='02');
  assert.equal(t.phase,'travel');
  assert.equal(p.status,'treatment');
  const estimated=t.remaining;
  advance(g,2);
  assert.equal(t.phase,'travel');
  assert.ok(t.remaining<estimated);
  assert.equal(g.state.evacuated,0);
  let seenCare=false,seenTransport=false;
  for(let i=0;i<240;i++){
    g.update(.25);
    if(g.state.incident.pending)g.resolveIncident('continue');
    if(g.state.comms.pending)g.resolveComms('repair');
    if(t.phase==='care')seenCare=true;
    if(t.phase==='transport') {
      seenTransport=true;
      assert.equal(p.status,'transport');
      assert.equal(g.state.evacuated,0);
    }
    if(p.status==='evacuated')break;
  }
  assert.ok(seenCare);
  assert.ok(seenTransport);
  assert.equal(p.status,'evacuated');
  assert.equal(g.state.evacuated,1);
  assert.equal(t.phase,'idle');
  assert.deepEqual(t.at,EVAC_POINT);
  assert.ok(p.firstContactAt!==null && p.evacuatedAt>p.firstContactAt);
  assert.ok(g.state.performance.totalTravel>0 && g.state.performance.totalTransport>0);
}

// The farther away a patient is, the longer the outbound journey.
{
  const g=createTriageCore();
  g.tagPatient('03','yellow');g.tagPatient('05','yellow');
  assert.equal(g.state.teams.filter(t=>t.phase==='travel').length,2);
  for (const t of g.state.teams) {
    const p=g.state.patients.find(p=>p.id===t.patientId);
    assert.ok(t.phaseDuration>=Math.hypot(t.at.x-p.pos.x,t.at.y-p.pos.y)/22);
  }
}

// Preemption must preserve team position on route (no teleport), including patient return to queue.
{
  const g=createTriageCore();
  g.tagPatient('03','yellow');g.tagPatient('05','yellow');
  advance(g,3);
  const before=g.state.teams.map(t=>({id:t.id,pos:positionOnRoute(t.route,t.phaseElapsed/t.phaseDuration)}));
  g.tagPatient('02','red');
  assert.equal(g.state.redirected,1);
  const redirected=g.state.teams.find(t=>t.patientId==='02');
  assert.ok(redirected);
  assert.equal(redirected.phase,'travel');
  const previous=before.find(p=>p.id===redirected.id);
  assert.ok(Math.hypot(redirected.at.x-previous.pos.x,redirected.at.y-previous.pos.y)<.01);
  assert.ok(g.state.performance.priorityRedirects===1);
}

// A team paused by radio blackout must stop its exact route position and timer.
{
  const g=createTriageCore();
  g.tagPatient('03','yellow');g.tagPatient('04','red');
  advance(g,60,'continue','continue');
  const t=g.state.teams[1];
  const before=t.remaining;
  const at=positionOnRoute(t.route,t.phaseDuration? t.phaseElapsed/t.phaseDuration : 1);
  advance(g,4,'continue','continue');
  if(t.patientId!==null) {
    assert.equal(t.remaining,before);
    const after=positionOnRoute(t.route,t.phaseDuration ? t.phaseElapsed/t.phaseDuration:1);
    assert.deepEqual(after,at);
  }
}

// Deliberately losing the patient cannot create phantom evacuations or duplicate scores.
{
  const g=createTriageCore();
  const p=g.state.patients.find(p=>p.id==='02');
  p.health=1;p.decay=10;
  g.tagPatient('02','red');
  advance(g,8);
  assert.equal(p.status,'deceased');
  assert.equal(g.state.teams.every(t=>t.patientId!==p.id),true);
  assert.equal(g.state.evacuated,0);
  assert.equal(g.state.lost,1);
}

// End-of-mission report summarizes measured actions, not fabricated projections.
for(const variant of [0,1,2]) {
  const g=createTriageCore({variant});
  for(const [id,tag] of [['01','green'],['02','red'],['03','yellow'],['04','red'],['05','yellow'],['06','black']])g.tagPatient(id,tag);
  advance(g,GAME_DURATION,'secure','repair');
  assert.equal(g.state.phase,'ended');
  const s=g.state.summary;
  assert.equal(s.scenario.id,variant);
  assert.ok(s.quality>=0 && s.quality<=100);
  assert.match(s.grade,/^[ABCD]$/);
  assert.equal(s.gradedAccuracy,Math.round(s.correct/6*100));
  assert.equal(s.teamUtilization.length,2);
  assert.ok(s.teamUtilization.every(v=>v>=0 && v<=100));
  assert.ok(s.feedback.length>=1 && s.feedback.length<=3);
  assert.ok(s.performance.moments.some(m=>m.kind==='incident'));
  assert.ok(s.performance.moments.some(m=>m.kind==='comms'));
  assert.ok(s.patients.every(p=>Object.hasOwn(p,'firstContactAt')));
}

console.log('PASS: routes around hazards, 3-stage rescue, red priority, pause, death handling and quality debrief (all scenarios)');
