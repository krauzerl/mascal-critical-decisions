import assert from 'node:assert/strict';
import {createTriageCore, SCENARIOS, GAME_DURATION, SUPPORT_ETA_SECONDS} from '../src/components/TriageCore.js';
import {readFileSync} from 'node:fs';
const progress=(g,sec)=>{
  for(let i=0;i<sec*4;i++){
    g.update(.25);
    if(g.state.incident.pending)g.resolveIncident('secure');
    if(g.state.comms.pending)g.resolveComms('repair');
  }
};

// All three scenarios must preserve the six-person map and key game assumptions.
for(const scenario of SCENARIOS){
  const g=createTriageCore({variant:scenario.id});
  assert.equal(g.state.scenario.id,scenario.id);
  assert.equal(g.state.patients.length,6);
  assert.equal(g.state.teams.length,2);
  assert.equal(g.state.timeLeft,GAME_DURATION);
  assert.equal(g.state.patients.find(p=>p.id==='06').category,'black');
  assert.equal(g.state.patients.find(p=>p.id==='05').category,'yellow');
  for(let i=0;i<scenario.smokeAt*4;i++)g.update(.25);
  assert.equal(g.state.incident.pending,true,`Variant ${scenario.id}: smoke must trigger at configured time`);
  assert.equal(g.resolveIncident('secure'),true);
  progress(g,scenario.radioAt-scenario.smokeAt);
  // Progress auto-resolves a radio alert triggered at the last tick.
  assert.equal(g.state.comms.triggered,true,`Variant ${scenario.id}: radio event must trigger`);
}

// No red has been assessed yet: support call should not burn the only charge.
{
  const g=createTriageCore();
  assert.equal(g.requestSupport(),false);
  assert.equal(g.state.support.used,false);
  g.tagPatient('03','yellow');
  assert.equal(g.requestSupport(),false);
  assert.equal(g.state.support.used,false);
}

// Select the assessed red patient with the least remaining health and rescue him once.
{
  const g=createTriageCore();
  g.tagPatient('02','red');
  g.tagPatient('04','red');
  const selected=['02','04'].sort((a,b)=>g.state.patients.find(p=>p.id===a).health-g.state.patients.find(p=>p.id===b).health)[0];
  assert.equal(g.requestSupport(),true);
  assert.equal(g.state.support.patientId,selected);
  assert.equal(g.requestSupport(),false,'Only one support request per round');
  const evacBefore=g.state.evacuated;
  progress(g,SUPPORT_ETA_SECONDS);
  assert.equal(g.state.support.status,'completed');
  assert.equal(g.state.patients.find(p=>p.id===selected).status,'evacuated');
  assert.equal(g.state.evacuated,evacBefore+1);
  assert.equal(g.state.teams.some(t=>t.patientId===selected),false,'Assigned team must be freed');
  progress(g,2);
  assert.equal(g.state.evacuated,evacBefore+1,'No double counting');
}

// The support timer pauses while the player is making the smoke decision.
{
  const g=createTriageCore();
  g.tagPatient('02','red');
  progress(g,29);
  assert.equal(g.requestSupport(),true);
  for(let i=0;i<4;i++)g.update(.25);
  assert.equal(g.state.incident.pending,true);
  const before=g.state.support.remaining;
  for(let i=0;i<40;i++)g.update(.25);
  assert.equal(g.state.support.remaining,before);
  g.resolveIncident('secure');
  progress(g,2);
  assert.ok(g.state.support.remaining<before);
}

// When help arrives after the patient dies, the call has a meaningful negative outcome.
{
  const g=createTriageCore({variant:1});
  const patient=g.state.patients.find(p=>p.id==='02');
  patient.health=2;patient.decay=3;
  g.tagPatient('02','red');
  assert.equal(g.requestSupport(),true);
  progress(g,SUPPORT_ETA_SECONDS);
  assert.equal(g.state.support.status,'missed');
  assert.equal(g.state.support.outcome,'too-late');
  assert.equal(g.requestSupport(),false);
}

// Rotation check: forward is +Y in the character rig, so right is a -90 deg Z rotation.
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
assert.match(main,/left:\s*\{ x:-1,y:0,rot:Math\.PI\/2 \}/);
assert.match(main,/right:\s*\{ x:1,y:0,rot:-Math\.PI\/2 \}/);
for(const [rot,x,y] of [[-Math.PI/2,1,0],[Math.PI/2,-1,0]]){
  assert.ok(Math.abs(-Math.sin(rot)-x)<1e-9);
  assert.ok(Math.abs(Math.cos(rot)-y)<1e-9);
}
console.log('PASS: movement directions, all 3 scenario variants, support request, unique rescue, pause, timeout and regressions.');
