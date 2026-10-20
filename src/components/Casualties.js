import * as THREE from 'three';
import { material, box, sphere, cylinder, markShadows } from './ArtKit.js';
import { createCivilianVisual } from './CharacterArt.js';

/**
 * Visual-only casualty actors for the railway incident set dressing.
 * They are deliberately NOT in EnemySystem's active list, so they do not
 * trigger Game Over, rescue scores, or enemy movement. A real triage system
 * can adopt these actors in a future phase.
 */
export function createCasualtyScene(scene) {
  const root = new THREE.Group();
  root.name = 'MASCAL | Visual casualty actors';
  const actors=[];

  // Two conscious-but-injured civilians rest on their sides by the derailed wagon.
  for(const [i,x,y,heading] of [[2,139,113,.14],[5,92,151,-.25]]) {
    const actor = createCivilianVisual(i);
    const pivot=new THREE.Group();
    pivot.position.set(x,y,2.7);
    pivot.rotation.z=heading;
    actor.rotation.x = Math.PI/2; // original Z-up body laid flat on XY
    actor.rotation.z=.10;
    pivot.add(actor);
    root.add(pivot);
    actors.push({type:'lying', group:actor, phase:i*.64});
  }

  // A seated passenger with one arm slightly raised; constructed in a clear silhouette.
  const sitting = new THREE.Group();
  sitting.position.set(42,116,0);
  sitting.rotation.z = -.45;
  const skin=material(0xd5a080), coat=material(0xa77b6a), trousers=material(0x344a57),
    shoes=material(0x283337),hair=material(0x514235);
  // Legs fold forward in +Y, shins come back down to the ground.
  box(sitting,[6.1,3.9,6.5],coat,[0,0,9.3]);
  cylinder(sitting,1.05,1.1,1.5,skin,[0,0,13.25],8);
  sphere(sitting,2.3,skin,[0,.1,15.5],1);
  sphere(sitting,2.15,hair,[0,-.45,16.3],1);
  for(const sign of [-1,1]) {
    box(sitting,[2.3,6.2,2.4],trousers,[sign*1.48,2.35,5.6]);
    cylinder(sitting,1.1,1.15,4.8,trousers,[sign*1.48,5.15,2.9],7);
    box(sitting,[2.6,3.3,1.5],shoes,[sign*1.48,5.8,.6]);
  }
  const leftArm = new THREE.Group();
  leftArm.position.set(-3.8,0,11.8);
  sitting.add(leftArm);
  cylinder(leftArm,1,1.05,5.4,coat,[0,0,-2.5],8);
  sphere(leftArm,.92,skin,[0,.25,-5.2],1);
  const rightArm = new THREE.Group();
  rightArm.position.set(3.8,0,11.8);
  sitting.add(rightArm);
  rightArm.rotation.x=.65;
  cylinder(rightArm,1,1.05,5.4,coat,[0,0,-2.5],8);
  sphere(rightArm,.92,skin,[0,.25,-5.2],1);
  markShadows(sitting);
  root.add(sitting);
  actors.push({type:'seated',group:sitting,arm:rightArm,phase:1.9});

  scene.add(root);
  return {
    group: root,
    update(seconds) {
      for(const actor of actors) {
        const t=seconds + actor.phase;
        if(actor.type==='lying') {
          // Quiet breathing only, keep positions fixed on terrain.
          actor.group.scale.set(1,1,1 + Math.sin(t*1.2)*.006);
        } else if(actor.type==='seated') {
          actor.arm.rotation.x=.65 + Math.sin(t * .95)*.18;
        }
      }
    },
  };
}
