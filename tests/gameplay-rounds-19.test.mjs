import assert from 'node:assert/strict';
import { createTriageCore, ROUND_CONFIGS, MAX_ROUND } from '../src/components/TriageCore.js';
import { planRescueRoute, routeIsClear, TEAM_STARTS, EVAC_POINT, isRescueWalkable } from '../src/components/RescuePaths.js';

const expectedNumbers=[6,8,10,12,14];
const expectedTime=[300,285,260,235,210];
assert.equal(MAX_ROUND,5);
assert.deepEqual(ROUND_CONFIGS.map(x=>x.patients),expectedNumbers);
assert.deepEqual(ROUND_CONFIGS.map(x=>x.duration),expectedTime);

function make(round,seed=12345,variant=0) {return createTriageCore({round,seed,variant});}
function tick(game,secs,incident='continue',comms='repair') {
  for(let i=0;i<secs*4;i++) {
    game.update(.25);
    if(game.state.incident.pending)assert.equal(game.resolveIncident(incident),true);
    if(game.state.comms.pending)assert.equal(game.resolveComms(comms),true);
  }
}
for(let round=1;round<=MAX_ROUND;round++) {
  for(const seed of [12345,56789,2026]) {
    for(const variant of [0,1,2]) {
      const game=make(round,seed,variant);
      const {patients,duration}=game.state;
      assert.equal(patients.length,expectedNumbers[round-1]);
      assert.equal(duration,expectedTime[round-1]);
      assert.equal(game.state.timeLeft,duration);
      assert.equal(game.state.round,round);
      assert.equal(new Set(patients.map(p=>p.id)).size,patients.length);
      assert.equal(patients.find(p=>p.id==='05').category,'yellow');
      assert.ok(patients.some(p=>p.category==='red'));
      assert.ok(patients.some(p=>p.category==='green'));
      assert.ok(patients.some(p=>p.category==='black'));
      for(const p of patients) {
        assert.ok(p.signs.length>=3, `round ${round}: ${p.id} clues absent`);
        assert.ok(isRescueWalkable(p.pos), `round ${round}: ${p.id} inside obstacle`);
        for(const target of [TEAM_STARTS[0],TEAM_STARTS[1],EVAC_POINT]) {
          const path=planRescueRoute(target,p.pos);
          for(let i=1;i<path.length;i++) assert.ok(routeIsClear(path[i-1],path[i]),`round ${round}: ${p.id} route obstructed`);
        }
      }
      assert.deepEqual(patients.map(p=>p.category),make(round,seed,variant).state.patients.map(p=>p.category));
    }
  }
}
assert.notDeepEqual(make(1,12345).state.patients.map(p=>p.category),make(1,1).state.patients.map(p=>p.category), 'replay should reshuffle acuity');
assert.notDeepEqual(make(1,12345).state.patients.map(p=>p.signs),make(1,1).state.patients.map(p=>p.signs), 'replay should vary symptoms');

// New difficulty must meaningfully change the scene, not merely an on-screen counter.
for(let round=1;round<=MAX_ROUND;round++){
  const g=make(round,2026);
  for(const p of g.state.patients)g.tagPatient(p.id,p.category);
  tick(g,g.state.duration+2,'secure','repair');
  assert.equal(g.state.phase,'ended');
  assert.equal(g.state.summary.total,expectedNumbers[round-1]);
  assert.equal(g.state.summary.round,round);
  assert.ok(Number.isFinite(g.state.summary.quality));
  assert.ok(g.state.summary.quality>=0 && g.state.summary.quality<=100);
  assert.ok(typeof g.state.summary.passed==='boolean');
  assert.ok(g.state.evacuated<=g.state.patients.length);
  assert.ok(g.state.patients.every(p=>p.health>=0));
}

// Correctly assessed and safely evacuated patients should unlock the next level.
{
  const g=make(1,12345);
  for(const p of g.state.patients)g.tagPatient(p.id,p.category);
  tick(g,300,'secure');
  assert.ok(g.state.summary.assessed>=5);
  assert.ok(g.state.summary.gradedAccuracy>=55);
  assert.equal(g.state.summary.passed,true);
}

// Deadline loss: no assessments means no unlock.
{
  const g=make(5,12345);
  tick(g,210,'continue');
  assert.equal(g.state.phase,'ended');
  assert.equal(g.state.summary.passed,false);
}

// Dynamic patient deterioration (apart from the scripted #05) must change categories.
{
  const g=make(5,12345);
  const targets=g.state.patients.filter(p=>p.id!=='05' && p.worsensAt);
  assert.ok(targets.length>=2);
  tick(g,185,'continue','repair');
  assert.ok(targets.some(p=>p.category==='red' || p.status==='deceased'));
}
console.log('PASS: 5 rounds, 6–14 varied patients, scaling difficulty, pathfinding, random seed, unlocking and deterioration');

// Retagging a patient during dispatch must never leave a stranded team or a NaN timer.
{
  const g=make(2,111);
  const p=g.state.patients.find(p=>p.category==='red');
  assert.ok(g.tagPatient(p.id,'red'));
  assert.ok(g.state.teams.some(t=>t.patientId===p.id));
  assert.ok(g.tagPatient(p.id,'green'));
  assert.equal(g.state.teams.some(t=>t.patientId===p.id),false);
  assert.equal(p.status,'waiting');
  assert.ok(g.tagPatient(p.id,'red'));
  assert.ok(g.state.teams.some(t=>t.patientId===p.id));
  tick(g,10);
  assert.ok(g.state.teams.every(t=>Number.isFinite(t.remaining)));
}
