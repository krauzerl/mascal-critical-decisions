import * as THREE from 'three';

// Called only during visual scene construction; gameplay remains the owner of time.
export function setIncidentLight(scene) {
  scene.background = new THREE.Color(0x09131b);
  scene.fog = new THREE.Fog(0x09131b, 420, 980);
  for (const light of scene.children) {
    if (light.isHemisphereLight) {
      light.color.setHex(0x183043);
      light.groundColor.setHex(0x071015);
      light.intensity = 0.56;
      light.position.set(0, 0, 300);
    } else if (light.isDirectionalLight && light.castShadow) {
      light.color.setHex(0xd8e6ff);
      light.intensity = 1.35;
      light.position.set(-205, -170, 330);
      light.shadow.normalBias = 0.07;
      light.shadow.bias = -0.00016;
    } else if (light.isDirectionalLight) {
      light.color.setHex(0x5f90b8);
      light.intensity = 0.38;
      light.position.set(150, 150, 120);
    }
  }
}
