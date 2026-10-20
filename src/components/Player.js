import * as THREE from 'three';
import { createParamedicVisual } from './CharacterArt.js';

// Preserve the exact JetBrains-era { group, model, state } contract.
export default function createPlayer() {
  const group = new THREE.Group();
  const model = createParamedicVisual();
  group.add(model);
  group.position.set(0,0,0);
  const state = { direction:null, progress:0, isMoving:false, targetX:0, targetY:0, startRotation:0 };
  return {group, model, state};
}
