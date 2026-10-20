import assert from 'node:assert/strict';
import { createTriageCore, GAME_DURATION, DOMINO_EVENT_SECOND, DOMINO_SECURITY_SECONDS, RADIO_EVENT_SECOND, RADIO_REPAIR_SECONDS, RADIO_OUTAGE_SECONDS } from '../src/components/TriageCore.js';
const advance = (game,seconds, autoRadio = true)=>{for(let i=0;i<seconds*4;i++){game.update(.25); if (game.state.incident.pending) game.resolveIncident('continue'); if (autoRadio && game.state.comms.pending) game.resolveComms('repair');}};
{
 const g=createTriageCore();
 assert.equal(g.state.patients.length,6);
 assert.equal(g.state.teams.length,2);
 assert.equal(g.state.timeLeft,300);
 assert.equal(g.tagPatient('01','green'),true);
 assert.equal(g.state.score,24);
 advance(g,16);
 assert.equal(g.state.patients[0].status,'evacuated');
 assert.equal(g.state.evacuated,1);
 assert.equal(g.state.score,94);
 assert.equal(g.tagPatient('01','green'),false);
}
{
 const g=createTriageCore();
 g.tagPatient('02','red'); g.tagPatient('04','red');
 assert.equal(g.state.teams.filter(team=>team.patientId).length,2);
 advance(g,65);
 assert.equal(g.state.patients.find(p=>p.id==='02').status,'evacuated');
 assert.equal(g.state.patients.find(p=>p.id==='04').status,'evacuated');
 assert.equal(g.state.evacuated,2);
}
{
 const g=createTriageCore();
 g.tagPatient('02','yellow');
 assert.equal(g.state.score,-12);
 g.tagPatient('02','red');
 assert.equal(g.state.score,24);
 g.tagPatient('02','red');
 assert.equal(g.state.score,24);
}
{
 const g=createTriageCore();
 advance(g,93);
 assert.equal(g.state.patients.find(p=>p.id==='05').category,'red');
 assert.equal(g.state.events.some(e=>e.message.includes('has deteriorated')),true);
}
{
 const g=createTriageCore();
 advance(g,GAME_DURATION);
 assert.equal(g.state.timeLeft,0);
 assert.equal(g.state.phase,'ended');
 assert.equal(g.state.summary.assessed,0);
 assert.equal(g.state.summary.totalAlive,5);
}
{
 const g = createTriageCore();
 // Yellow teams were dispatched first because those patients were found first.
 g.tagPatient('03','yellow'); g.tagPatient('05','yellow');
 assert.equal(g.state.teams.every(t => ['03','05'].includes(t.patientId)), true);
 g.tagPatient('02','red');
 assert.ok(g.state.teams.some(t => t.patientId === '02'), 'Red patient must take precedence');
 assert.ok(g.state.patients.find(p => p.id === '03').status === 'waiting'
   || g.state.patients.find(p => p.id === '05').status === 'waiting',
   'A yellow patient must be returned to the queue');
 assert.equal(g.state.redirected, 1);
 g.tagPatient('04','red');
 assert.deepEqual(g.state.teams.map(t => t.patientId).sort(), ['02','04']);
 assert.deepEqual(g.dispatchQueue().map(p => p.id), ['03','05']);
 advance(g, 70);
 assert.equal(g.state.patients.find(p => p.id === '02').status, 'evacuated');
 assert.equal(g.state.patients.find(p => p.id === '04').status, 'evacuated');
}
{
 const g = createTriageCore();
 g.tagPatient('01','green');
 assert.equal(g.state.teams.every(t => t.patientId === null),true,'Green uses no rescue teams');
 advance(g,15);
 assert.equal(g.state.patients.find(p => p.id === '01').status,'evacuated');
}
{
 const g=createTriageCore();
 // A pending yellow case cannot preempt a team already serving a red case.
 g.tagPatient('02','red'); g.tagPatient('04','red');
 g.tagPatient('03','yellow');
 assert.deepEqual(g.state.teams.map(t=>t.patientId).sort(), ['02','04']);
 assert.equal(g.dispatchQueue()[0].id,'03');
}
// Gameplay 1.2: the choice interrupts the action and the game clock freezes until the player decides.
{
 const g=createTriageCore();
 for(let i=0;i<DOMINO_EVENT_SECOND*4;i++)g.update(.25);
 assert.equal(g.state.incident.pending,true,'Incident must open at second 30');
 const paused=g.state.elapsed;
 for(let i=0;i<400;i++)g.update(.25);
 assert.equal(g.state.elapsed,paused,'Mission timer must pause for the decision');
 assert.equal(g.resolveIncident('invalid'),false);
 assert.equal(g.state.incident.pending,true);
 assert.equal(g.resolveIncident('continue'),true);
 assert.equal(g.resolveIncident('secure'),false,'Cannot decide twice');
 advance(g,1);
 assert.ok(g.state.elapsed>paused,'Mission resumes after selection');
}
// Action 1: securing the area has a real team-capacity cost and avoids deterioration of #05.
{
 const g=createTriageCore();
 g.tagPatient('02','red'); g.tagPatient('03','yellow');
 for(let i=0;i<DOMINO_EVENT_SECOND*4;i++)g.update(.25);
 assert.equal(g.state.incident.pending,true);
 assert.equal(g.resolveIncident('secure'),true);
 assert.equal(g.state.teams.filter(t=>t.busyTask==='securing').length,1);
 assert.equal(g.state.teams.find(t=>t.busyTask==='securing').remaining,DOMINO_SECURITY_SECONDS);
 assert.equal(g.state.patients.find(p=>p.id==='05').worsensAt,null);
 advance(g,24);
 assert.equal(g.state.teams.every(t=>!t.busyTask),true,'Secure team must return automatically');
 advance(g,70);
 assert.equal(g.state.patients.find(p=>p.id==='05').category,'yellow','Protection prevents the scripted deterioration');
 assert.equal(g.state.incident.choice,'secure');
}
// Action 2: continuing preserves teams, but #05 deteriorates if still waiting.
{
 const g=createTriageCore();
 for(let i=0;i<DOMINO_EVENT_SECOND*4;i++)g.update(.25);
 assert.equal(g.resolveIncident('continue'),true);
 assert.equal(g.state.teams.some(t=>t.busyTask),false);
 advance(g,51);
 assert.equal(g.state.patients.find(p=>p.id==='05').category,'red');
 assert.equal(g.state.incident.choice,'continue');
 assert.equal(g.state.events.some(e=>e.message.includes('DOMINO EFFECT')),true);
}
// Gameplay 1.3: the second decision triggers, pauses the game and is single-use.
{
 const g=createTriageCore();
 advance(g,RADIO_EVENT_SECOND,false);
 assert.equal(g.state.comms.pending,true, 'Second event must appear at 60 s');
 const paused=g.state.elapsed;
 for(let i=0;i<100;i++)g.update(.25);
 assert.equal(g.state.elapsed,paused,'Clock pauses while deciding about radio');
 assert.equal(g.resolveComms('invalid'),false);
 assert.equal(g.resolveComms('repair'),true);
 assert.equal(g.resolveComms('repair'),false,'Second choice must be single-use');
 assert.equal(g.state.comms.playerLockRemaining,RADIO_REPAIR_SECONDS);
 assert.equal(g.state.comms.teamOutageRemaining,0);
 advance(g,RADIO_REPAIR_SECONDS);
 assert.equal(g.state.comms.playerLockRemaining,0,'Repair lock must clear on time');
 assert.ok(g.state.events.some(e=>e.message.includes('radio restored')));
}
// Gameplay 1.3: choosing to continue blocks team 2 but not team 1.
{
 const g=createTriageCore();
 g.tagPatient('02','red'); g.tagPatient('04','red');
 advance(g,30);
 const byId=(id)=>g.state.teams.find(t=>t.id===id);
 // At this time the first intervention could already be complete; force a second red/yellow pending assignment.
 g.tagPatient('03','yellow');g.tagPatient('05','yellow');
 advance(g,30,false);
 assert.equal(g.state.comms.pending,true);
 assert.equal(g.resolveComms('continue'),true);
 assert.equal(g.state.comms.teamOutageRemaining,RADIO_OUTAGE_SECONDS);
 assert.equal(g.state.comms.playerLockRemaining,0);
 const before=byId(2).remaining;
 const team1before=byId(1).remaining;
 advance(g,10);
 assert.equal(byId(2).remaining,before,'Team 2 timer must pause');
 assert.ok(byId(1).remaining < team1before || byId(1).patientId === null,'Team 1 still operates');
 advance(g,RADIO_OUTAGE_SECONDS-10);
 assert.equal(g.state.comms.teamOutageRemaining,0,'Blackout must end on schedule');
 assert.ok(g.state.events.some(e=>e.message.includes('back online')));
}
console.log('PASS: Gameplay 1.1 + 1.2 + 1.3, both decisions, pause, teams, and regression tests.');
// During a radio outage, an idle team 2 must NOT take work; red can redirect team 1.
{
 const g=createTriageCore();
 advance(g,RADIO_EVENT_SECOND,false);
 assert.equal(g.resolveComms('continue'),true);
 g.tagPatient('03','yellow');
 assert.equal(g.state.teams[0].patientId,'03');
 assert.equal(g.state.teams[1].patientId,null);
 g.tagPatient('02','red');
 assert.equal(g.state.teams[0].patientId,'02','Red redirects team 1 even when team 2 is unavailable');
 assert.equal(g.state.teams[1].patientId,null,'Unavailable team 2 must remain unassigned');
 advance(g,RADIO_OUTAGE_SECONDS);
 assert.equal(g.state.comms.teamOutageRemaining,0);
 assert.equal(g.state.teams[1].patientId,'03','Team 2 can accept a waiting yellow after reconnection');
}
