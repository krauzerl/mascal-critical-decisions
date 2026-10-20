import * as THREE from 'three';
import { box, sphere, cylinder, material, markShadows } from './ArtKit.js';
import {softBox,rod} from './VisualPrimitives.js';

// Procedural character rigs. Z is up, +Y is forward. No external models or paid assets.
// Keep figures within the old gameplay collision footprints: the rigs are visual only.
const uniform = {
  red: material(0xe05c36), redLight: material(0xf08a51), redDark: material(0xa33f32),
  yellow: material(0xe6efc5, { emissive: 0x604817, emissiveIntensity: 0.12 }),
  yellowAlt: material(0xf9efb5),
  navy: material(0x283943), navyLight: material(0x425662),
  boot: material(0x1b272a), gloves: material(0x508d9b),
  white: material(0xe4e7db), metal: material(0x8fa3a6, { metalness: 0.35, roughness: 0.48 }),
  radio: material(0x172831), glass: material(0x7fc0c9, { metalness: .11, roughness: .32 }),
};
const skinTones = [0xe7b28d, 0xc98b68, 0x9b6349, 0xf2c29e];
const civilianColors = [0x508f91, 0xc58a54, 0x687ca1, 0xd9ad59, 0x76937b, 0xae6e76];
const trousersColors = [0x33434e, 0x52595b, 0x56504e, 0x343a49];
const hairColors = [0x382f2d, 0x654832, 0x252a30, 0x806446, 0x3d3b35];

// Tapered, softly bevelled jacket. All original rig pivots stay unchanged.
function jacket(parent, width, depth, height, mat, z) {
  const w=width/2, h=height/2;
  const outline=new THREE.Shape();
  outline.moveTo(-w*.84,-h); outline.lineTo(w*.84,-h);
  outline.lineTo(w,h*.56); outline.lineTo(w*.72,h);
  outline.lineTo(-w*.72,h); outline.lineTo(-w,h*.56); outline.closePath();
  const geo=new THREE.ExtrudeGeometry(outline,{depth:depth-.5,steps:1,
    bevelEnabled:true,bevelThickness:.25,bevelSize:.22,bevelSegments:1});
  const mesh=new THREE.Mesh(geo,mat);
  mesh.rotation.x=Math.PI/2;
  mesh.position.set(0,(depth-.5)/2,z);
  parent.add(mesh);
  return mesh;
}

function createLeg(parent, x, pants, boots, scale = 1) {
  const hip = new THREE.Group();
  hip.position.set(x, 0, 8.6 * scale);
  parent.add(hip);
  cylinder(hip, 1.34*scale, 1.15*scale, 4.4*scale, pants, [0,0,-2.4*scale], 9);
  const knee = new THREE.Group();
  knee.position.set(0,0,-4.0*scale);
  hip.add(knee);
  cylinder(knee, 1.15*scale, .93*scale, 3.4*scale, pants, [0,0,-1.6*scale], 9);
  softBox(knee,[2.45*scale,3.55*scale,1.65*scale],boots,[0,.72*scale,-3.15*scale],.45);
  softBox(knee,[2.5*scale,3.6*scale,.35*scale],uniform.navyLight,[0,.72*scale,-3.85*scale],.1);
  for(const y of [.4,1,1.6])box(knee,[1.2*scale,.13,.1],uniform.metal,[0,y*scale,-2.28*scale]);
  return { hip, knee };
}

function createArm(parent, x, cloth, hand, glove = null, scale = 1) {
  const shoulder = new THREE.Group();
  shoulder.position.set(x,0,13.5*scale);
  parent.add(shoulder);
  sphere(shoulder,1.15*scale,cloth,[0,0,-.35*scale],1);
  cylinder(shoulder,1.13*scale,.97*scale,4.4*scale,cloth,[0,0,-2.35*scale],8);
  const elbow = new THREE.Group();
  elbow.position.set(0,0,-4.3*scale);
  shoulder.add(elbow);
  cylinder(elbow, .94*scale,.75*scale,2.7*scale,cloth,[0,0,-1.35*scale],8);
  softBox(elbow,[1.3*scale,1.35*scale,1.6*scale],glove||hand,[0,0,-2.9*scale],.4);
  sphere(elbow,.38*scale,glove||hand,[-Math.sign(x)*.65,.35,-2.6*scale],0);
  return { shoulder, elbow };
}

function createHead(parent, face, hair, options = {}) {
  const head = new THREE.Group();
  head.position.z = 17.2;
  parent.add(head);
  cylinder(head,1.03,1.08,1.5,face,[0,0,-.15],8);
  const faceMesh=sphere(head,2.12,face,[0,0,1.4],2);
  faceMesh.scale.set(.88,.87,1.06);
  for(const x of [-1.9,1.9]) sphere(head,.36,face,[x,0,1.25],0);
  // Simplified eyes and nose read in an elevated three-quarter camera.
  const eye=material(0x29343a);
  for(const x of [-.72,.72]) {
    softBox(head,[.35,.13,.23],eye,[x,1.77,1.52],.07);
    box(head,[.5,.12,.1],hair,[x,1.72,1.95],[0,-Math.sign(x)*.1,0]);
  }
  softBox(head,[.6,.12,.13],material(0x9e6554),[0,1.83,.25],.04);
  softBox(head,[.4,.52,.64],face,[0,1.85,.95],.18);
  if(options.helmet) {
    // A helmet dome, not a second full sphere perched above the head.
    const helmetGeo=new THREE.SphereGeometry(2.45,12,5,0,Math.PI*2,0,Math.PI/2);
    helmetGeo.rotateX(Math.PI/2);
    const shell=new THREE.Mesh(helmetGeo,uniform.white);
    shell.position.set(0,0,2.5); shell.scale.z=.65; head.add(shell);
    cylinder(head,2.43,2.43,.3,uniform.red,[0,0,2.52],12);
    box(head,[4.65,1.25,.26],uniform.white,[0,1.35,2.38]);
    box(head,[1.2,.5,.65],uniform.radio,[0,2.1,2.86]);
    box(head,[.8,.2,.4],uniform.glass,[0,2.39,2.87]);
    // Chin strap, kept visible from isometric perspective.
    box(head,[.26,.35,2.3],uniform.metal,[-2.1,.2,.39]);
    box(head,[.26,.35,2.3],uniform.metal,[2.1,.2,.39]);
  } else {
    const hairGeo=new THREE.SphereGeometry(2.15,10,4,0,Math.PI*2,0,Math.PI*.54);
    hairGeo.rotateX(Math.PI/2);
    const cap=new THREE.Mesh(hairGeo,hair);cap.position.set(0,-.12,1.97);cap.scale.set(.92,.93,.72);head.add(cap);
    softBox(head,[1.4,1.1,.8],hair,[-.7,1.05,2.65],.3,[0,.15,-.22]);
    if(options.longHair) {
      softBox(head,[3.7,1.4,3.1],hair,[0,-1.35,.4],.6);
      const pony=sphere(head,1.15,hair,[0,-2.15,1.7],1);pony.scale.set(.75,1,1.35);
    }
  }
  return head;
}

function attachAnimator(model, joints, options = {}) {
  const { leftLeg, rightLeg, leftArm, rightArm, torso, head } = joints;
  const seed = options.seed || 0;
  model.userData.animate = (seconds, moving = false, movementProgress = 0) => {
    const t = seconds + seed;
    const gait = moving ? 1 : 0;
    // Gait phase follows elapsed time to avoid teleporting joints when stepping ends.
    const wave = Math.sin(t * (moving ? 11 : 1.3));
    const idleBreathing = Math.sin(t * 2.1 + seed) * .055;
    leftLeg.hip.rotation.x = wave * .34 * gait;
    rightLeg.hip.rotation.x = -wave * .34 * gait;
    leftLeg.knee.rotation.x = Math.max(0,-wave) * .18 * gait;
    rightLeg.knee.rotation.x = Math.max(0,wave) * .18 * gait;
    leftArm.shoulder.rotation.x = -wave * .27 * gait;
    rightArm.shoulder.rotation.x = wave * .27 * gait;
    torso.position.z = 10 + idleBreathing + Math.abs(wave) * .10 * gait;
    torso.rotation.y = wave * .025 * gait;
    head.rotation.z = Math.sin(t * 0.7) * .018;
    // Actual movement/jump coordinates stay owned by main.js.
  };
}

export function createParamedicVisual() {
  const model = new THREE.Group();
  const suit = material(0xcf4c35, { emissive: 0x38150f, emissiveIntensity: 0.18 });
  const suitDark = material(0x992f28);
  const trim = material(0xf3e2a0, { emissive: 0x6a511c, emissiveIntensity: 0.18 });
  const navy = material(0x223340);
  const panel = material(0xe7ecdf);
  const strap = material(0x3f5660);
  const helmetShell = material(0xf0f1ea);
  const visor = material(0x84d5e6, { metalness: 0.28, roughness: 0.2, emissive: 0x143642, emissiveIntensity: 0.28 });
  const skin = material(0xd9a47d);
  const leftLeg = createLeg(model, -1.7, navy, uniform.boot, 1.06);
  const rightLeg = createLeg(model, 1.7, navy, uniform.boot, 1.06);
  for (const leg of [leftLeg, rightLeg]) {
    cylinder(leg.hip, 1.25, 1.2, 1.1, suitDark, [0, 0, -0.75], 8);
    cylinder(leg.knee, 1.1, 1.08, 0.85, trim, [0, 0, -0.95], 8);
    softBox(leg.knee, [2.5, 0.46, 1.9], strap, [0, 1.12, -0.1], 0.12);
    softBox(leg.knee, [2.95, 3.9, 0.4], uniform.boot, [0, 0.82, -4.1], 0.12);
  }

  const torso = new THREE.Group();
  torso.position.z = 10.35;
  model.add(torso);
  jacket(torso, 7.1, 4.6, 9.6, suit, 1.0);
  softBox(torso, [7.55, 4.9, 1.0], suitDark, [0, 0, -2.62], 0.36);
  softBox(torso, [6.75, 4.5, 0.75], navy, [0, 0, -3.62], 0.2);
  softBox(torso, [6.15, 4.85, 3.05], panel, [0, 0.55, 2.75], 0.45);
  box(torso, [0.26, 0.18, 7.65], suitDark, [0, 2.34, 1.15]);
  box(torso, [7.0, 4.95, 0.45], trim, [0, 0, -0.25]);
  for (const x of [-2.72, 2.72]) box(torso, [0.56, 4.95, 6.85], trim, [x, 0, 1.0]);
  softBox(torso, [7.6, 1.0, 1.6], strap, [0, 0.8, 4.22], 0.2);
  softBox(torso, [5.15, 3.35, 6.15], strap, [0, -2.9, 1.05], 0.65);
  softBox(torso, [3.8, 1.6, 2.55], suitDark, [0, -4.08, 0.52], 0.35);
  box(torso, [2.3, 0.28, 2.3], panel, [0, -4.22, 0.9]);
  box(torso, [1.48, 0.28, 0.44], uniform.red, [0, -4.34, 0.9]);
  box(torso, [0.44, 0.28, 1.48], uniform.red, [0, -4.34, 0.9]);
  // shoulder epaulettes and small patches
  for (const x of [-2.6, 2.6]) {
    softBox(torso, [1.9, 2.0, 1.1], suitDark, [x, 0.2, 4.2], 0.28);
    softBox(torso, [1.55, 0.3, 1.25], trim, [x, 2.35, 3.02], 0.1);
  }
  softBox(torso, [1.95, 0.35, 1.62], panel, [-1.75, 2.42, 2.8], 0.12);
  softBox(torso, [1.1, 0.34, 1.1], trim, [2.48, 2.42, 2.84], 0.1);
  softBox(torso, [1.65, 0.22, 1.3], suitDark, [0, 2.46, 3.45], 0.08);

  const leftArm = createArm(model, -4.15, suit, skin, uniform.gloves, 1.04);
  const rightArm = createArm(model, 4.15, suit, skin, uniform.gloves, 1.04);
  for (const arm of [leftArm, rightArm]) {
    softBox(arm.shoulder, [1.75, 1.15, 1.3], suitDark, [0, 0, -0.55], 0.24);
    cylinder(arm.elbow, 1.02, 1.0, 0.72, trim, [0, 0, -0.86], 8);
    softBox(arm.elbow, [1.36, 1.4, 1.72], uniform.gloves, [0, 0, -3.02], 0.48);
  }

  const head = new THREE.Group();
  head.position.z = 17.9;
  model.add(head);
  cylinder(head, 1.16, 1.18, 1.75, skin, [0, 0, -0.2], 8);
  const face = sphere(head, 2.22, skin, [0, 0, 1.38], 2);
  face.scale.set(0.88, 0.88, 1.06);
  for (const x of [-0.76, 0.76]) softBox(head, [0.4, 0.15, 0.24], navy, [x, 1.82, 1.58], 0.08);
  softBox(head, [0.56, 0.12, 0.12], material(0x8f5e50), [0, 1.86, 0.3], 0.04);
  softBox(head, [0.46, 0.54, 0.68], skin, [0, 1.83, 0.96], 0.18);
  const helmetGeo = new THREE.SphereGeometry(2.8, 14, 7, 0, Math.PI * 2, 0, Math.PI * 0.67);
  helmetGeo.rotateX(Math.PI / 2);
  const shell = new THREE.Mesh(helmetGeo, helmetShell);
  shell.position.set(0, -0.02, 2.68);
  shell.scale.set(1.02, 1.0, 0.76);
  head.add(shell);
  softBox(head, [5.15, 1.65, 0.46], suit, [0, 1.2, 2.58], 0.22);
  softBox(head, [4.45, 1.1, 0.18], trim, [0, 1.28, 2.74], 0.08);
  softBox(head, [2.3, 1.4, 0.68], navy, [0, 1.93, 2.38], 0.2);
  const visorShield = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.26, 1.22), visor);
  visorShield.position.set(0, 2.06, 2.34);
  head.add(visorShield);
  box(head, [1.05, 0.54, 0.68], navy, [0, 2.32, 2.84]);
  box(head, [0.68, 0.18, 0.22], visor, [0, 2.48, 2.88]);
  box(head, [0.28, 0.35, 2.6], uniform.metal, [-2.35, 0.15, 0.45]);
  box(head, [0.28, 0.35, 2.6], uniform.metal, [2.35, 0.15, 0.45]);
  softBox(head, [2.25, 0.42, 0.26], helmetShell, [0, -1.84, 1.56], 0.1);

  // utility silhouette
  softBox(model, [6.8, 1.38, 1.18], strap, [0, 0.18, 9.12], 0.16);
  softBox(model, [1.1, 1.05, 1.82], navy, [2.22, 1.03, 9.0], 0.16);
  softBox(model, [1.45, 0.95, 2.0], navy, [-2.12, 1.05, 8.94], 0.18);
  softBox(model, [2.05, 1.95, 4.6], suitDark, [0, -2.95, 14.15], 0.35);
  softBox(model, [1.2, 1.45, 2.3], uniform.radio, [3.22, 1.12, 15.18], 0.18);
  cylinder(model, 0.08, 0.08, 2.95, uniform.radio, [3.38, 1.14, 17.58], 6);

  attachAnimator(model, { leftLeg, rightLeg, leftArm, rightArm, torso, head });
  markShadows(model);
  return model;
}

export function createCivilianVisual(variant=0) {
  const model=new THREE.Group();
  const idx=Math.abs(variant)|0;
  const jacketColor=material(civilianColors[idx % civilianColors.length], { emissive: 0x111111, emissiveIntensity: 0.04 });
  const pants=material(trousersColors[idx % trousersColors.length]);
  const skin=material(skinTones[idx % skinTones.length]);
  const hair=material(hairColors[idx % hairColors.length]);
  const accent=material(idx % 2 === 0 ? 0xe3d7bc : 0xbcd7db);
  const bandage=material(0xe8e3d4);
  const leftLeg=createLeg(model,-1.36,pants,uniform.boot,.87);
  const rightLeg=createLeg(model,1.36,pants,uniform.boot,.87);
  for (const leg of [leftLeg, rightLeg]) softBox(leg.knee,[2.1,.25,1.2],accent,[0,1.05,-0.42],.08);
  const torso=new THREE.Group(); torso.position.z=10.05;model.add(torso);
  jacket(torso,5.9,3.78,7.85,jacketColor,.25);
  softBox(torso,[6.08,3.95,.82],pants,[0,0,-3.28],.18);
  softBox(torso,[5.0,3.3,2.0],accent,[0,.4,2.35],.34);
  const collar=material(0xe2d6bd);
  box(torso,[1.15,3.95,.82],collar,[0,0,3.78]);
  box(torso,[.15,.18,5.95],pants,[0,1.88,-.02]);
  if(idx % 3 === 0) {
    softBox(torso,[2.45,1.45,3.0],pants,[2.24,2.15,-1.0],.28);
    const strap=box(torso,[.42,.28,7.2],collar,[-.65,2.2,.65]);
    strap.rotation.y = .45;
  }
  if(idx % 3 === 1) softBox(torso,[4.75,1.22,2.45],pants,[0,-2.42,1.18],.18);
  if(idx % 3 === 2) softBox(torso,[2.7,.24,1.2],bandage,[1.35,2.08,1.5],.08);
  const leftArm=createArm(model,-3.32,jacketColor,skin, null, .95);
  const rightArm=createArm(model,3.32,jacketColor,skin, null, .95);
  const head=createHead(model,skin,hair,{longHair:idx % 4===0});
  if(idx%2===0) {
    const hood=sphere(torso,2.05,jacketColor,[0,-.82,3.56],1);hood.scale.set(1.25,.9,.66);
    for(const x of [-.65,.65])rod(torso,[x,2,3.25],[x,2.1,1.45],.07,collar);
  } else {
    softBox(torso,[1.72,.35,1.55],pants,[-1.7,1.92,1.42],.15);
    for(const z of [-1,0,1,2])sphere(torso,.11,collar,[0,2,z],0);
  }
  if(idx%4===1) {
    softBox(leftArm.elbow,[1.05,1.2,1.0],bandage,[0,0,-2.55],.3);
  }
  if(idx%4===2) {
    softBox(head,[1.65,.15,.9],bandage,[0,2.03,1.72],.08);
  }
  if(idx%4===3) {
    for(const x of [-.78,.78])softBox(head,[1.2,.2,.7],uniform.radio,[x,1.83,1.55],.18);
    rod(head,[-.2,1.9,1.55],[.2,1.9,1.55],.08,uniform.metal);
  }
  attachAnimator(model,{leftLeg,rightLeg,leftArm,rightArm,torso,head},{seed:idx * .61});
  if(idx===4 || idx===11) {
    for(const leg of [leftLeg,rightLeg]) {leg.hip.rotation.x=1.35;leg.knee.rotation.x=-1.35;}
    leftArm.shoulder.rotation.x=.45;rightArm.shoulder.rotation.x=.45;
    leftArm.elbow.rotation.x=.65;rightArm.elbow.rotation.x=.65;
    for(const child of model.children)child.position.z-=4.2;
  }
  model.userData.variant=idx;
  markShadows(model);
  return model;
}

