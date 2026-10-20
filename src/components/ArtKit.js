import * as THREE from 'three';

// Small procedural asset library: no external textures, models or paid services.
export const palette = {
  cream: 0xf0ede1, paper: 0xfaf4e6, slate: 0x344853, asphalt: 0x465459,
  navy: 0x1b3646, navyDark: 0x172936, red: 0xc93d38, darkRed: 0x8f282c,
  orange: 0xf59a43, yellow: 0xf9c958, turquoise: 0x4eafaa,
  grass: 0x778967, steel: 0x6c7c83, earth: 0x8d7c63,
};
export function material(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.02, flatShading: true, ...opts });
}
export function addMesh(parent, geometry, mat, pos = [0, 0, 0], rotation = null) {
  const o = new THREE.Mesh(geometry, mat);
  o.position.set(...pos);
  if (rotation) o.rotation.set(...rotation);
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}
export function box(parent, dim, mat, pos = [0,0,0], rotation = null) {
  return addMesh(parent, new THREE.BoxGeometry(...dim), mat, pos, rotation);
}
export function sphere(parent, radius, mat, pos = [0,0,0], detail = 1) {
  return addMesh(parent, new THREE.IcosahedronGeometry(radius, detail), mat, pos);
}
export function cylinder(parent, top, bottom, height, mat, pos = [0,0,0], sides = 10) {
  const obj = addMesh(parent, new THREE.CylinderGeometry(top, bottom, height, sides), mat, pos);
  obj.rotation.x = Math.PI / 2; // Cylinder defaults Y vertical; our world is Z-up.
  return obj;
}
export function tube(parent, points, radius, mat, segments = 12) {
  return addMesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), segments, radius, 5, false), mat);
}
export function wheel(parent, x, y, z, radius = 4, tireMat = material(0x222d33)) {
  const tire = addMesh(parent, new THREE.CylinderGeometry(radius, radius, 2.2, 12), tireMat, [x, y, z]);
  // Axle follows Y; the wheel rolls on the XY ground (Z up).
  const rimMat = material(0xa5adb0, {metalness:0.4});
  const rim = addMesh(parent, new THREE.CylinderGeometry(radius*0.48, radius*0.48, 2.4, 10), rimMat, [x,y,z]);

  return tire;
}
export function cross(parent, x, y, z, scale = 1, face = 'side') {
  const red = material(palette.red);
  if (face === 'roof') {
    box(parent, [3.1*scale, 0.7*scale, 0.12], red, [x,y,z]);
    box(parent, [0.7*scale, 3.1*scale, 0.12], red, [x,y,z]);
  } else {
    box(parent, [3.1*scale, 0.14, 0.7*scale], red, [x,y,z]);
    box(parent, [0.7*scale, 0.14, 3.1*scale], red, [x,y,z]);
  }
}
export function labelPlane(parent, text, width = 18, height = 5, pos = [0,0,0], color = '#ffffff') {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,512,128);
  ctx.font = 'bold 66px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = color; ctx.fillText(text, 256, 70, 490);
  const tx = new THREE.CanvasTexture(canvas); tx.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshBasicMaterial({map:tx, transparent:true, side:THREE.DoubleSide, depthWrite:false});
  const textMesh = addMesh(parent, new THREE.PlaneGeometry(width,height), m, pos);
  textMesh.rotation.x = Math.PI / 2;
  textMesh.castShadow = false;
  return textMesh;
}
export function colorJitter(hex, fraction) {
  const col = new THREE.Color(hex);
  col.offsetHSL(0, 0, fraction);
  return col;
}
export function seeded(seed = 7123) {
  let value = seed >>> 0;
  return () => { value = (1664525 * value + 1013904223) >>> 0; return value / 4294967296; };
}
export function markShadows(root) {
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return root;
}
