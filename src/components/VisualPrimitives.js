import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { addMesh } from './ArtKit.js';

// Shared, low-segment geometry for the miniature art direction.
const shapes = new Map();
export function softBox(parent, size, mat, position=[0,0,0], radius=.35, rotation=null) {
  const r=Math.min(radius,...size.map(v=>v*.45));
  const key=[...size,r].join(',');
  if(!shapes.has(key)) shapes.set(key,new RoundedBoxGeometry(...size,1,r));
  return addMesh(parent,shapes.get(key),mat,position,rotation);
}
export function rod(parent,a,b,radius,mat,sides=8) {
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
  const delta=end.clone().sub(start);
  const mesh=addMesh(parent,new THREE.CylinderGeometry(radius,radius,delta.length(),sides),mat);
  mesh.position.copy(start).add(end).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  return mesh;
}
export function hoop(parent, points, radius, mat) {
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  return addMesh(parent,new THREE.TubeGeometry(curve,18,radius,6,false),mat);
}
