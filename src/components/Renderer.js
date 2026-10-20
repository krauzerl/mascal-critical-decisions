import * as THREE from 'three';

export default function createRenderer() {
  const canvas = document.querySelector('canvas.game');
  if (!canvas) throw new Error('MASCAL: canvas.game is missing');

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: false,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

  const resize = () => renderer.setSize(window.innerWidth, window.innerHeight);
  window.addEventListener('resize', resize);
  resize();
  return renderer;
}
