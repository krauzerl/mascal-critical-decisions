import * as THREE from 'three';
import { box, sphere, cylinder, material, markShadows } from './ArtKit.js';
import { createCivilianVisual } from './CharacterArt.js';

/**
 * Patient visuals for MASCAL Gameplay 1.1. Purely cosmetic.
 * XY = ground, Z = up. All shapes stay inside the original patient interaction radius.
 * The factory preserves the familiar model.userData.animate(time, moving) contract.
 */
const shirtColors = [0x78908c, 0xb17958, 0x6d7999, 0xc0a173, 0x63776a, 0x956d79];
const pantColors = [0x33434e, 0x5b5249, 0x4d5660, 0x3c414c];
const skinColors = [0xe0ac86, 0xc98b69, 0xa36e54, 0xefd0ac];
const hairColors = [0x382e2b, 0x5a4035, 0x2a3135, 0x806448];
const sole = material(0x212a2b);
const linen = material(0xd7d8ca);
const blanket = material(0x657987, { roughness: 0.95 });

function paletteFor(variant) {
  const i = Math.abs(Number(variant) || 0) | 0;
  return {
    skin: material(skinColors[i % skinColors.length]),
    hair: material(hairColors[i % hairColors.length]),
    top: material(shirtColors[i % shirtColors.length]),
    trouser: material(pantColors[i % pantColors.length]),
    detail: material(i % 2 ? 0xe4d7bc : 0x485b66),
    index: i,
  };
}

function faceDetails(group, skin, hair, x, y, z, scale = 1) {
  sphere(group, 2.05 * scale, skin, [x, y, z], 1);
  // An asymmetrical hair cap, intentionally readable from above.
  sphere(group, 1.8 * scale, hair, [x - .28 * scale, y - .42 * scale, z + .86 * scale], 1);
  const eyeMat = material(0x27333a);
  for (const offset of [-.7, .7]) {
    sphere(group, .13 * scale, eyeMat, [x + offset * scale, y + 1.55 * scale, z + .35 * scale], 0);
  }
}

function createLyingPatient(variant) {
  const p = paletteFor(variant);
  const root = new THREE.Group();
  root.name = 'MASCAL | patient lying';
  // Ground-level clothing, limbs and head. The model is built lying down,
  // rather than turning an upright character sideways through the terrain.
  const clothing = new THREE.Group();
  root.add(clothing);
  box(clothing, [8.8, 5.5, 3.6], p.top, [-2.6, 0, 3.0]);
  box(clothing, [2.2, 5.15, 3.65], p.trouser, [2.8, 0, 2.65]);
  for (const side of [-1, 1]) {
    box(root, [8.5, 2.35, 2.35], p.trouser, [8.7, side * 1.32, 2.15], [0, side * .03, 0]);
    box(root, [3.2, 2.35, 1.8], sole, [14.15, side * 1.32, 1.55]);
  }
  // Head rests toward -X. Bandage/collar makes the pose clear without gore.
  box(root, [1.5, 2.5, 1.3], p.skin, [-7.5, 0, 3]);
  faceDetails(root, p.skin, p.hair, -9.6, 0, 3.45, .91);
  box(root, [1.0, 5.8, .38], linen, [-6.25, 0, 4.92]);
  // Arms are deliberately posed differently to avoid rigid mannequin silhouettes.
  const arm = new THREE.Group();
  arm.position.set(-3.25, -3.42, 3.75);
  root.add(arm);
  box(arm, [6.3, 2.05, 2.0], p.top, [1.75, -1.0, -.15], [0,0,-.31]);
  sphere(arm, .9, p.skin, [5.35, -2.15, -.15], 1);
  box(root, [5.25, 2.0, 2.0], p.top, [-2.2, 4.1, 3.1], [0,0,.29]);
  sphere(root, .85, p.skin, [.55, 4.85, 3.1], 1);
  if (p.index % 2 === 0) {
    box(root, [2.3, 2.47, .48], linen, [8, 1.32, 3.25]);
  }
  root.rotation.z = (p.index % 4 - 1.5) * .14;
  root.userData.animate = (seconds) => {
    // Breath is an almost imperceptible chest rise; the patient stays on the ground.
    clothing.position.z = Math.sin(seconds * 1.2 + p.index) * .095;
  };
  markShadows(root);
  return root;
}

function createSeatedPatient(variant) {
  const p = paletteFor(variant);
  const root = new THREE.Group();
  root.name = 'MASCAL | patient seated';
  // Small folded thermal mat instead of a block-shaped 'chair'.
  box(root, [11, 13, .32], blanket, [0, 2, .19], [0,0,.13]);
  box(root, [6.5, 5.5, 3.4], p.trouser, [0, 0, 4.4]);
  const torso = new THREE.Group();
  torso.position.set(0, -.2, 6.15);
  root.add(torso);
  box(torso, [6.5, 4.45, 7.9], p.top, [0, 0, 3.6], [.12,0,0]);
  box(torso, [5.9, 4.65, .8], p.detail, [0, 0, 7.1]);
  box(torso, [1.4, 1.4, 1.6], p.skin, [0, 0, 8.35]);
  faceDetails(torso, p.skin, p.hair, 0, .25, 11.0, .91);
  // Both thighs extend forward; the shins fold toward the ground.
  for (const side of [-1,1]) {
    const x = side * 1.68;
    box(root, [2.5, 7.2, 2.45], p.trouser, [x, 3.45, 4.6]);
    cylinder(root, 1.2, 1.05, 3.6, p.trouser, [x, 7.4, 2.3], 8);
    box(root, [2.6, 3.3, 1.65], sole, [x, 8.4, 1.1]);
    // Sleeves hanging onto the lap, with hands visible at the ends.
    box(torso, [2.05, 2.2, 5.3], p.top, [side * 4.1, 1.1, 3.3], [side * .06, 0, side * .10]);
    sphere(torso, .86, p.skin, [side * 4.22, 2.7, .5], 1);
  }
  if (p.index % 2 === 0) box(torso, [1.45, 3.8, 1.0], linen, [-4.28, .25, 3.2]);
  root.rotation.z = (p.index % 3 - 1) * .26;
  root.userData.animate = (seconds) => {
    torso.rotation.x = Math.sin(seconds * 1.15 + p.index) * .024;
    torso.position.z = 6.15 + Math.sin(seconds * 1.15 + p.index) * .085;
  };
  markShadows(root);
  return root;
}

export function createPatientVisual(variant = 0, pose = 'standing') {
  if (pose === 'lying') return createLyingPatient(variant);
  if (pose === 'seated') return createSeatedPatient(variant);
  return createCivilianVisual(variant);
}
