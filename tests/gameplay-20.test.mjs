import assert from 'node:assert/strict';
import {createTriageCore} from '../src/components/TriageCore.js';
import {createMapPickups, sampleGameVitals, PICKUP_RADIUS, STT_MONITOR_SECONDS} from '../src/components/TacticalSupport.js';
import {isRescueWalkable, planRescueRoute,routeIsClear} from '../src/components/RescuePaths.js';

const make=(seed,round=3)=>createTriageCore({round,seed,variant:0});
const advance=(g,secs)=>{
  for(let n=0;n<secs*4;n++) {
    g.update(.25);
    if(g.state.incident.pending)g.resolveIncident('secure');
    if(g.state.comms.pending)g.resolveComms('repair');
  }
};
const find=(type)=>{
  for(let seed=1;seed<=10000;seed++) {
    const g=make(seed);
    const item=g.state.pickups.find(p=>p.type===type);
    if(item)return {g,item,seed};
  }
  throw new Error('No seed for '+type);
};

// A real, visibly rare mechanic rather than guaranteed bonuses.
let counts=[0,0,0];let stt=0;
for(let seed=1;seed<=1000;seed++) {
  const g=make(seed);
  const same=make(seed);
  assert.deepEqual(g.state.pickups,same.state.pickups);
  counts[g.state.pickups.length]++;
  const types=g.state.pickups.map(p=>p.type);
  assert.equal(new Set(types).size,types.length,'only one pickup per type in a round');
  for(const p of g.state.pickups){
    if(p.type==='stt'){stt++;assert.ok(p.bands>=2&&p.bands<=4);}
    assert.ok(isRescueWalkable(p.pos),'pickup must be reachable');
    assert.ok(g.state.patients.every(q=>Math.hypot(p.pos.x-q.pos.x,p.pos.y-q.pos.y)>45));
    const route=planRescueRoute({x:0,y:0},p.pos);
    assert.ok(route.length>0);
    assert.ok(route.slice(1).every((q,i)=>routeIsClear(route[i],q)));
  }
}
assert.ok(counts[0]>400&&counts[0]<600,`rarity: ${counts}`);
assert.ok(counts[1]>330&&counts[1]<500);
assert.ok(counts[2]>45&&counts[2]<150);
assert.ok(stt>150,'STT must be findable, but not in every mission');

// Collecting must be spatial. Picking up an STT kit grants 2–4 consumable bands.
{
  const {g,item}=find('stt');
  assert.equal(g.collectPickup(item.id,{x:0,y:0}),false);
  assert.equal(g.state.inventory.stt,0);
  assert.equal(g.collectPickup(item.id,{x:item.pos.x+PICKUP_RADIUS+0.1,y:item.pos.y}),false);
  assert.equal(g.collectPickup(item.id,{...item.pos}),true);
  assert.equal(g.collectPickup(item.id,{...item.pos}),false,'no double pickup');
  assert.equal(g.state.inventory.stt,item.bands);
  const p=g.state.patients.find(p=>p.category==='yellow' && p.id!=='05');
  assert.ok(p);
  assert.equal(g.attachSTT(p.id,p.pos),false,'patient must be assessed first');
  g.tagPatient(p.id,'yellow');
  assert.equal(g.attachSTT(p.id,{x:0,y:-250}),false);
  const before=g.state.inventory.stt;
  assert.equal(g.attachSTT(p.id,p.pos),true);
  assert.equal(g.state.inventory.stt,before-1);
  assert.equal(g.attachSTT(p.id,p.pos),false,'no stacking a second band on the same patient');
  assert.equal(g.state.bonusStats.sttApplied,1);
  assert.equal(g.state.patients.find(q=>q.id===p.id).monitorUntil,STT_MONITOR_SECONDS);
  const beforeVitals={...p.vitals};
  advance(g,8);
  assert.notDeepEqual(p.vitals,beforeVitals,'vitals must evolve with time');
  assert.equal(p.category,'yellow','STT must not auto-triage');
  advance(g,STT_MONITOR_SECONDS);
  assert.equal(p.monitorUntil,0,'STT must expire');
  assert.ok(g.state.inventory.stt>=0);
}

// STT notices a developing condition BEFORE scripted deterioration without fixing it.
{
  const {g,item}=find('stt');
  g.collectPickup(item.id,item.pos);
  const p=g.state.patients.find(p=>p.category==='yellow' && p.id!=='05');
  g.tagPatient(p.id,'yellow');
  p.worsensAt=25;
  assert.equal(g.attachSTT(p.id,p.pos),true);
  advance(g,12);
  assert.ok(g.state.bonusStats.alerts>=1,'changing vitals should drive a monitor alert');
  assert.equal(p.tagged,'yellow');
  assert.ok(g.state.events.some(e=>e.message.includes('STT #')));
}

// The legacy free F request is disabled only in progression. LPR unlocks one call.
{
  const {g,item}=find('lpr');
  const p=g.state.patients.find(p=>p.category==='red');
  g.tagPatient(p.id,'red');
  assert.equal(g.requestSupport(),false,'no free support without a field pickup');
  assert.equal(g.state.support.used,false);
  assert.equal(g.collectPickup(item.id,item.pos),true);
  assert.equal(g.state.inventory.lpr,1);
  assert.equal(g.requestSupport(),true);
  assert.equal(g.state.inventory.lpr,0);
  assert.equal(g.requestSupport(),false);
  advance(g,18);
  assert.equal(g.state.support.status,'completed');
}

// PSP buffs a single actual dispatch, not all future assignments.
{
  const {g,item}=find('psp');
  assert.equal(g.collectPickup(item.id,item.pos),true);
  assert.equal(g.state.inventory.psp,1);
  const p=g.state.patients.find(p=>p.category==='red');
  g.tagPatient(p.id,'red');
  assert.equal(g.state.bonusStats.pspUses,1);
  assert.equal(g.state.inventory.psp,0);
  assert.equal(g.state.teams.some(t=>t.patientId===p.id),true);
}

// The medical pack slows actual HP loss; it does not heal or evacuate instantly.
{
  const {g,item,seed}=find('medkit');
  const control=make(seed);
  const p=g.state.patients.find(p=>p.category==='red');
  const q=control.state.patients.find(q=>q.id===p.id);
  g.tagPatient(p.id,'red');control.tagPatient(q.id,'red');
  g.collectPickup(item.id,item.pos);
  assert.equal(g.applyMedkit(p.id,p.pos),true);
  assert.equal(g.applyMedkit(p.id,p.pos),false);
  advance(g,10);advance(control,10);
  assert.ok(p.health>q.health,`kit should preserve HP (${p.health} vs ${q.health})`);
  assert.equal(p.status!=='evacuated',true);
}

// Fictional vital signals are always clamped and deceased readings show zero.
{
  const g=make(4);
  for(const p of g.state.patients){
    const v=sampleGameVitals(p,123);
    assert.ok(Number.isInteger(v.hr)&&Number.isInteger(v.spo2));
    if(p.category!=='black')assert.ok(v.hr>=48&&v.hr<=186&&v.spo2>=72&&v.spo2<=100);
    else assert.deepEqual({hr:v.hr,spo2:v.spo2},{hr:0,spo2:0});
  }
}
console.log('PASS: Tactical Support 2.0 — rarity, reachable pickups, 2–4 STT bands, time-varying vitals, alarms, LPR, PSP, medkit.');
