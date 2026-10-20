/**
 * MASCAL 2.0: deterministic, rare physical pickups + fictional telemetry.
 * These values are game signals, NOT medical measurements or clinical thresholds.
 * Dependency-free so balance can be tested without Three.js.
 */
import { isRescueWalkable, planRescueRoute, routeIsClear } from './RescuePaths.js';

export const PICKUP_RADIUS = 19;
export const PATIENT_INTERACTION_RADIUS = 31;
export const STT_MONITOR_SECONDS = 45;
export const MEDKIT_SECONDS = 20;
export const TYPES = Object.freeze(['stt','lpr','psp','medkit']);
const LOCATIONS = Object.freeze([
  { x: -12, y: -78 }, { x: -206, y: 28 }, { x: 17, y: 145 },
  { x: 196, y: -63 }, { x: -186, y: -155 }, { x: 170, y: 202 },
  { x: 8, y: -160 }, { x: 256, y: 142 }, { x: -265, y: -93 },
  { x: 170, y: 13 }, { x: -55, y: 204 }, { x: 273, y: -169 },
  { x: -273, y: 176 }, { x: 85, y: -181 },
]);

export function gameRng(seed = 1) {
  let n = (Number(seed) >>> 0) || 0x9e3779b9;
  // Avalanche before the first draw: small consecutive seeds must not bias rarity.
  n ^= n >>> 16; n = Math.imul(n, 0x7feb352d);
  n ^= n >>> 15; n = Math.imul(n, 0x846ca68b);
  n ^= n >>> 16;
  return () => { n ^= n << 13; n ^= n >>> 17; n ^= n << 5; return (n >>> 0) / 4294967296; };
}

/** 50% none; 40% one; 10% two. Never duplicates a type, no respawns. */
export function createMapPickups({ seed = 1, round = 1, patientPositions = [] } = {}) {
  const rnd = gameRng((Number(seed) >>> 0) ^ Math.imul(round, 0x45d9f3b) ^ 0xb4782f1);
  const roll = rnd();
  const count = roll < 0.50 ? 0 : roll < 0.90 ? 1 : 2;
  const choices = [
    {type:'stt',weight:.44}, {type:'lpr',weight:.22},
    {type:'psp',weight:.18}, {type:'medkit',weight:.16},
  ];
  const valid = LOCATIONS.filter(point =>
    isRescueWalkable(point) &&
    patientPositions.every(p => Math.hypot(p.x-point.x,p.y-point.y) > 45) &&
    routeIsClear(point,point) &&
    (()=>{
      const path=planRescueRoute({x:0,y:0},point);
      return path.length>0 && path.slice(1).every((p,i)=>routeIsClear(path[i],p));
    })()
  );
  if (valid.length < count) return [];
  const available = [...valid];
  const result=[];
  for (let i=0;i<count;i++) {
    const total=choices.reduce((n,c)=>n+c.weight,0);
    let target=rnd()*total;
    let choiceIndex=choices.length-1;
    for(let j=0;j<choices.length;j++) if ((target-=choices[j].weight)<0) {choiceIndex=j;break;}
    const [{type}]=choices.splice(choiceIndex,1);
    const locationIndex=Math.floor(rnd()*available.length);
    const location=available.splice(locationIndex,1)[0];
    for(let j=available.length-1;j>=0;j--)
      if(Math.hypot(available[j].x-location.x,available[j].y-location.y)<90) available.splice(j,1);
    result.push({ id:`BONUS-${i+1}`,type,pos:{...location},
      bands:type==='stt'?2+Math.floor(rnd()*3):0, collected:false });
    if(!available.length) break;
  }
  return result;
}

const clamp = (n,min,max) => Math.max(min,Math.min(max,n));

/** Full simulation updates for every living patient; only STT exposes a live HUD. */
export function sampleGameVitals(patient, elapsed = 0) {
  if (patient.category === 'black' || patient.status === 'deceased' || patient.health <= 0)
    return { hr:0, spo2:0, trend:'No reading' };
  const seed = (Number(patient.id) || 1) * 0.77 + (patient.variant || 0) * 0.41;
  const base = patient.category === 'red' ? {hr:123,spo2:94} :
    patient.category === 'yellow' ? {hr:103,spo2:97} : {hr:83,spo2:99};
  const healthLoss=clamp((patient.initialHealth ?? patient.health)-patient.health,0,100);
  const pressure=(100-clamp(patient.health,0,100));
  // Small, continuous natural variation; deterministic for the same round and timestamp.
  const oscillation=Math.sin(elapsed*.63+seed)*2.4+Math.sin(elapsed*.18+seed*3)*1.3;
  // Patients scripted to worsen develop simulated warning signs shortly beforehand.
  const timeToWorsening=patient.worsensAt == null ? Infinity : patient.worsensAt-elapsed;
  const preWorsen=patient.category==='yellow' && timeToWorsening>=0 && timeToWorsening<28
    ? (28-timeToWorsening)/28 : 0;
  const hr=clamp(Math.round(base.hr+pressure*(patient.category==='red'?.18:.1)+healthLoss*.29+
    preWorsen*21+oscillation),48,186);
  const spo2=clamp(Math.round(base.spo2-pressure*(patient.category==='red'?.065:.025)-
    healthLoss*.073-preWorsen*7+Math.sin(elapsed*.44+seed)*.8),72,100);
  const trend=preWorsen>.5 || spo2<=90 || hr>=135 ? 'Warning: abnormal trend'
    : healthLoss>5 || preWorsen>.13 ? 'Vitals fluctuating' : 'No significant change';
  return {hr,spo2,trend};
}
