import * as THREE from 'three';
import { createParamedicVisual, createCivilianVisual } from './CharacterArt.js';
import { material, box, cylinder } from './ArtKit.js';
import { rod } from './VisualPrimitives.js';
import { positionOnRoute, EVAC_POINT } from './RescuePaths.js';

// Two lightweight animated rescue teams. Their positions are driven ONLY by
// TriageCore phase/timer/route; rendering cannot advance or alter gameplay.
const TEAM_COLORS = [0x54c5f4, 0xffbd6c];
const DARK = material(0x15242d);
const METAL = material(0x94b3bf,{metalness:0.4,roughness:0.4});
const BED = material(0xeddfc2);
const STRAPS = material(0xe1b64c);

function createTeamTag(id, tint) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 128;
  const c = canvas.getContext('2d');
  c.fillStyle = 'rgba(8,20,31,.92)';
  c.beginPath(); c.roundRect(25, 11, 205, 100, 22); c.fill();
  c.strokeStyle = `#${tint.toString(16).padStart(6, '0')}`;
  c.lineWidth = 7; c.stroke();
  c.fillStyle = 'white'; c.font = 'bold 64px Arial';
  c.textBaseline = 'middle'; c.textAlign = 'center';
  c.fillText(`Z${id}`,128,64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false,transparent:true}));
  sprite.scale.set(19,10,1); sprite.position.z = 35;
  return sprite;
}

function responder(id, index) {
  const holder = new THREE.Group();
  const rig = createParamedicVisual();
  rig.scale.setScalar(index ? .81 : .87);
  if(index) rig.rotation.z = .10;
  holder.add(rig);
  // Distinguish support teams from the player with blue/yellow vest panels.
  const jacket = material(TEAM_COLORS[id - 1],{emissive:TEAM_COLORS[id-1],emissiveIntensity:.075});
  box(holder,[4.5,.8,3.6],jacket,[0,2.65,11.8]);
  return { holder, rig };
}

function stretcher() {
  const root = new THREE.Group();
  box(root,[8.4,21,1.2],DARK,[0,0,5.5]);
  box(root,[7.6,19,.85],BED,[0,0,6.35]);
  for(const x of [-4.45,4.45]) rod(root,[x,-11,6.3],[x,11,6.3],.4,METAL);
  for(const y of [-10,10]) rod(root,[-5.6,y,6.4],[5.6,y,6.4],.32,METAL);
  for(const y of [-4.2,4.2]) box(root,[8.3,1.3,.15],STRAPS,[0,y,7]);
  for(const y of [-8,8])for(const x of [-3.2,3.2]) {
    rod(root,[x,y,1.2],[x,y,5.4],.36,METAL);
    const w=cylinder(root,1.1,1.1,.8,DARK,[x,y,1.1],10);
    w.rotation.x = Math.PI/2;
  }
  return root;
}

function position(team) {
  if (team.phase === 'travel' || team.phase === 'transport') {
    const progress = team.phaseDuration > 0 ? team.phaseElapsed / team.phaseDuration : 1;
    return positionOnRoute(team.route,progress);
  }
  return team.at;
}

function directionOnRoute(route, progress) {
  if(!route || route.length < 2) return null;
  const p = positionOnRoute(route, Math.max(0,progress - .012));
  const q = positionOnRoute(route, Math.min(1,progress + .012));
  const dx = q.x-p.x, dy=q.y-p.y;
  if(Math.hypot(dx,dy)<.01) return null;
  return Math.atan2(-dx,dy);
}

export function createRescueTeams(scene, core) {
  const root = new THREE.Group();
  root.name = 'MASCAL | animated rescue crew & stretcher evacuation';
  const renderTeams = core.state.teams.map(team => {
    const anchor = new THREE.Group();
    root.add(anchor);
    const a = responder(team.id,0), b = responder(team.id,1);
    anchor.add(a.holder,b.holder);
    const bed = stretcher();
    bed.visible = false;
    anchor.add(bed);
    const tag = createTeamTag(team.id,TEAM_COLORS[team.id-1]);
    anchor.add(tag);
    return {anchor, a, b, bed, tag, patientModel:null, patientId:null, lastAngle:0};
  });
  scene.add(root);
  return {
    update(now) {
      core.state.teams.forEach((team,i) => {
        const r=renderTeams[i];
        const pt=position(team);
        r.anchor.position.set(pt.x,pt.y,0);
        const moving = team.phase === 'travel' || team.phase === 'transport';
        if(moving){
          const progress=team.phaseDuration>0?team.phaseElapsed/team.phaseDuration:0;
          const angle=directionOnRoute(team.route,progress);
          if(angle!==null)r.lastAngle=angle;
        }
        r.anchor.rotation.z=r.lastAngle;
        r.a.holder.position.set(team.phase==='care'?-6:-4.7,team.phase==='transport'?10:0,0);
        r.b.holder.position.set(team.phase==='care'?6:4.7,team.phase==='transport'?-10:0,0);
        if(team.phase==='transport') {
          // Carrying orientation: each team member is at one stretcher handle.
          r.b.holder.rotation.z=Math.PI;
        } else r.b.holder.rotation.z=0;
        r.a.rig.userData.animate?.(now+i*1.3,moving);
        r.b.rig.userData.animate?.(now+1+i*1.3,moving);
        r.bed.visible=team.phase==='transport';
        const p=core.state.patients.find(p=>p.id===team.patientId);
        if(team.phase==='transport' && p) {
          if(r.patientId!==p.id) {
            if(r.patientModel) {r.bed.remove(r.patientModel);r.patientModel=null;}
            const casualty=createCivilianVisual(p.variant);
            casualty.scale.setScalar(.66);
            casualty.rotation.x=Math.PI/2;
            casualty.position.set(0,-6.5,8.4);
            r.bed.add(casualty);
            r.patientModel=casualty;
            r.patientId=p.id;
          }
        } else if(r.patientModel) {
          r.bed.remove(r.patientModel);
          r.patientModel=null;
          r.patientId=null;
        }
        r.tag.visible=team.patientId!==null || team.busyTask!==null;
        r.tag.position.z=32+Math.sin(now*1.45+i)*1.2;
      });
    },
    dispose() { scene.remove(root); },
    root,
    evacuationPoint:EVAC_POINT,
  };
}
