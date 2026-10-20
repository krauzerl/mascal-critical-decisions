import * as THREE from 'three';

// Lightweight comic-premium helpers.
// Purely visual: no gameplay state or collisions are modified.

export function applyComicOutline(root, {
  color = 0x0f1820,
  thickness = 0.055,
  skipTransparent = true,
} = {}) {
  const targets = [];
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry || obj.userData?.isOutline) return;
    targets.push(obj);
  });

  for (const obj of targets) {
    const baseMat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
    if (!baseMat) continue;
    if (skipTransparent && baseMat.transparent && baseMat.opacity < 0.97) continue;
    if (baseMat.type === 'MeshBasicMaterial' && baseMat.map) continue; // skip text/labels
    if (obj.userData?.noOutline) continue;

    const outlineMat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.BackSide,
      fog: false,
      toneMapped: false,
    });

    const outline = new THREE.Mesh(obj.geometry, outlineMat);
    outline.name = `${obj.name || 'mesh'}_outline`;
    outline.userData.isOutline = true;
    outline.castShadow = false;
    outline.receiveShadow = false;
    outline.renderOrder = (obj.renderOrder || 0) - 1;
    outline.scale.multiplyScalar(1 + thickness);
    obj.add(outline);
  }

  return root;
}

export function addGroundShadow(parent, {
  x = 0,
  y = 0,
  z = 0.12,
  radiusX = 12,
  radiusY = 8,
  opacity = 0.18,
  color = 0x081015,
} = {}) {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1, 28),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      toneMapped: false,
    })
  );
  shadow.scale.set(radiusX, radiusY, 1);
  shadow.position.set(x, y, z);
  shadow.rotation.z = 0;
  parent.add(shadow);
  return shadow;
}
