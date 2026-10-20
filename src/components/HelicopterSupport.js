import * as THREE from 'three';
import { SUPPORT_ETA_SECONDS } from './TriageCore.js';

// A short visual fly-in for an awarded LPR pickup.
// No helicopter in ordinary rounds; geometry never affects collisions or rescue timers.
const amber=new THREE.MeshStandardMaterial({color:0xe5aa49,roughness:.64,flatShading:true});
const ivory=new THREE.MeshStandardMaterial({color:0xe8eee9,roughness:.68,flatShading:true});
const dark=new THREE.MeshStandardMaterial({color:0x172734,roughness:.55,flatShading:true});
const glass=new THREE.MeshStandardMaterial({color:0x4ca1bd,metalness:.26,roughness:.22,flatShading:true});
const whiteLamp=new THREE.MeshBasicMaterial({color:0xd1f4ff,toneMapped:false});
function solid(parent,geo,mat,at=[0,0,0]){
  const mesh=new THREE.Mesh(geo,mat);mesh.position.set(...at);mesh.castShadow=true;parent.add(mesh);return mesh;
}
function helicopter(){
  const g=new THREE.Group();
  // +Y points to the front, +Z up (project coordinate convention).
  const hull=solid(g,new THREE.SphereGeometry(10,12,8),ivory,[0,0,0]);hull.scale.set(1.1,1.9,.78);
  const nose=solid(g,new THREE.SphereGeometry(8.3,12,8),glass,[0,10,1.5]);nose.scale.set(1.06,1.12,.66);
  solid(g,new THREE.BoxGeometry(18,1.5,2.6),amber,[0,-4,-1]);
  solid(g,new THREE.BoxGeometry(5,28,5),dark,[0,-26,1]);
  solid(g,new THREE.BoxGeometry(17,7,1),amber,[0,-40,1]);
  const skidMat=dark;
  for(const x of [-8,8]){
    solid(g,new THREE.BoxGeometry(.9,30,1),skidMat,[x,0,-9]);
    for(const y of [-9,11]) solid(g,new THREE.BoxGeometry(.9,1,9),skidMat,[x,y,-5]);
  }
  solid(g,new THREE.CylinderGeometry(1.6,1.6,4,8),dark,[0,0,10.4]).rotation.x=Math.PI/2;
  const rotor=new THREE.Group();rotor.position.z=12;g.add(rotor);
  solid(rotor,new THREE.BoxGeometry(63,3.1,.65),dark);
  solid(rotor,new THREE.BoxGeometry(3.1,63,.65),dark);
  const tailRotor=new THREE.Group();tailRotor.position.set(0,-41,7);g.add(tailRotor);
  solid(tailRotor,new THREE.BoxGeometry(9,.8,.7),dark);
  solid(tailRotor,new THREE.BoxGeometry(.8,.7,9),dark);
  const light=solid(g,new THREE.SphereGeometry(1.3,10,6),whiteLamp,[0,15,-4]);
  const halo=new THREE.PointLight(0xc9edff,5,105,2);halo.position.set(0,13,-7);g.add(halo);
  g.scale.setScalar(.58);
  return {g,rotor,tailRotor,light};
}
export function createLprVisual(scene,core){
  const {g,rotor,tailRotor,light}=helicopter();
  g.name='LPR | visual support helicopter';g.visible=false;
  scene.add(g);
  let completedTime=null;
  return {
    update(now){
      const {support,patients}=core.state;
      const patient=patients.find(p=>p.id===support.patientId);
      if(!patient || !['enroute','completed','missed'].includes(support.status)){
        g.visible=false;return;
      }
      let progress;
      if(support.status==='enroute') {
        completedTime=null;
        progress=1-Math.max(0,support.remaining)/SUPPORT_ETA_SECONDS;
        g.visible=true;
      }else{
        completedTime??=now;
        progress=1+Math.max(0,now-completedTime)*.25;
        g.visible=now-completedTime<3.2;
      }
      const end={x:patient.pos.x+25,y:patient.pos.y+27};
      const start={x:end.x+145,y:end.y+175};
      const t=Math.min(1,Math.max(0,progress));
      g.position.set(start.x+(end.x-start.x)*t+(progress>1?(progress-1)*65:0),
        start.y+(end.y-start.y)*t+(progress>1?(progress-1)*100:0),
        120-(60*t)+(progress>1?(progress-1)*30:0)+Math.sin(now*3)*.55);
      g.rotation.z=-.7+.1*Math.sin(now*.95);
      rotor.rotation.z=now*21;
      tailRotor.rotation.y=now*24;
      light.visible=Math.sin(now*6)>-.3;
    },
    dispose(){scene.remove(g);},
  };
}
