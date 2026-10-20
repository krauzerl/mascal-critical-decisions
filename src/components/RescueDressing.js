import * as THREE from 'three';
import {
  createTriageStation, createDebrisField, createStretcher, createMedicalBag,
  createEmergencyLight, createSafetyBarrier, createCone, createCautionTape,
  createLuggage, createFireExtinguisher, createWaterCanister, createRadio,
  createSandbagBarricade, createSmokeCloud, createMakeshiftTarp,
  createScatteredPapers, createEmergencyBlanket, createDroppedHelmet,
  createGenerator
} from './RescueProps.js';

/**
 * Visual-only set dressing. Props from Junie are locally Y-up; this adapter
 * converts them to MASCAL's Z-up world, without changing collision/gameplay.
 * Do not register decoration groups in the collision system.
 */
export function createRescueDressing(scene) {
  const root = new THREE.Group();
  root.name = 'MASCAL | Emergency rescue scene decoration';
  scene.add(root);
  const lights = [];

  function place(factory, name, x, y, yaw = 0, scale = 1, z = 0) {
    const anchor = new THREE.Group();
    anchor.name = name;
    anchor.position.set(x,y,z);
    anchor.rotation.z = yaw;
    anchor.scale.setScalar(scale);
    const object = factory();
    // Local Three.js assets use Y for height: +90° around X maps it to world Z.
    object.rotation.x += Math.PI/2;
    anchor.add(object);
    root.add(anchor);
    object.traverse(n => {
      if (n.isLight && n.isPointLight) lights.push({light:n,base:n.intensity,phase:lights.length*2.1});
    });
    return anchor;
  }

  // Triage area beside the emergency tent, kept clear of wagon and tracks.
  place(createTriageStation, 'Triage station equipment', -158, 63, 0.2, 1.0);
  place(createStretcher, 'Stretcher ready', -106, 75, 0.3, 0.8);
  place(createStretcher, 'Stretcher folded', -183, 33, -0.5, 0.75);
  place(createMedicalBag, 'Medical bag on scene', -124, 45, 0, 1);
  place(createWaterCanister, 'Water supply', -180, 67, 0, 1);
  place(createRadio, 'Emergency portable radio', -180, 48, 0, 1);
  place(() => createEmergencyLight('red'), 'Red beacon', -193, 79);
  place(() => createEmergencyLight('blue'), 'Blue beacon', -100, -83);
  place(createGenerator, 'Generator by rescue camp', -205, 41, 0.2, 0.8);
  place(createMakeshiftTarp, 'First response shelter', -224, 110, -.3, 1);

  // Perimeter on both sides of the incident; decoration does not block player.
  for (const [x,y,theta] of [[20,112,0.25],[48,132,-.2],[174,106,.2],[180,32,-.2]]) {
    place(createSafetyBarrier, 'Scene barrier', x, y, theta, 0.9);
  }
  for (const [x,y] of [[15,92],[31,117],[151,119],[188,72],[-115,-72],[-93,-91]]) {
    place(createCone,'Warning cone',x,y,0,1);
  }
  place(createCautionTape, 'Cordon tape', 90,144,.1,1);

  // Carefully composed wreckage instead of random clutter everywhere.
  place(createDebrisField, 'Scattered personal belongings', 157,100, 0.3, 0.65);
  place(() => createLuggage('suitcase'), 'Passenger suitcase', 151,18, .7, 1);
  place(() => createLuggage('backpack'), 'Passenger backpack', 168,52,-.5,1);
  place(createScatteredPapers,'Tickets and documents', 128,144,0,1);
  place(createDroppedHelmet,'Dropped protective helmet', 60,143,0,0.85);
  place(createFireExtinguisher,'Extinguisher',123,129,-.5,1);
  place(createEmergencyBlanket,'Survival blanket',98,149,.1,1);
  place(createSandbagBarricade,'Temporary barrier',-222,-23,.3,.8);
  // RailwayScene owns the soft drifting smoke; avoid a second opaque-looking cloud.

  return {
    group: root,
    update(seconds) {
      for (const {light,base,phase} of lights) {
        light.intensity = base * (0.68 + 0.32 * (1 + Math.sin(seconds*4 + phase)) / 2);
      }
    },
  };
}
