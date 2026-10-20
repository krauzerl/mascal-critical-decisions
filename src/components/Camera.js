import * as THREE from 'three';

// Cinematic tactical camera. It stays independent of the player's rotation,
// so running/turning cannot accidentally spin the view.
const OFFSET = new THREE.Vector3(184, -210, 184);
const LOOK_AHEAD = new THREE.Vector3(10, 23, 10);
const SMOOTHING = 7.5;

export default function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    37, window.innerWidth / Math.max(window.innerHeight, 1), 1, 4500,
  );
  camera.up.set(0, 0, 1);
  camera.position.copy(OFFSET);
  camera.lookAt(LOOK_AHEAD);

  const targetPosition = new THREE.Vector3();
  const targetLook = new THREE.Vector3();
  const smoothLook = LOOK_AHEAD.clone();
  camera.userData.follow = (playerPosition, delta) => {
    const alpha = 1 - Math.exp(-SMOOTHING * Math.max(0, Math.min(delta, 0.1)));
    targetPosition.copy(playerPosition).add(OFFSET);
    targetLook.copy(playerPosition).add(LOOK_AHEAD);
    camera.position.lerp(targetPosition, alpha);
    smoothLook.lerp(targetLook, alpha);
    camera.lookAt(smoothLook);
  };
  return camera;
}
