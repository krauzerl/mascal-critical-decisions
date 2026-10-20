import * as THREE from 'three';
import {material,box,cylinder,wheel,addMesh,markShadows,labelPlane} from './ArtKit.js';
import {softBox,rod,hoop} from './VisualPrimitives.js';

export const OBSTACLE_TYPES=Object.freeze({AMBULANCE:'ambulance',TENT:'tent',CONTAINER:'container'});

function profile(parent,vertices,depth,mat) {
  const shape=new THREE.Shape();
  vertices.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSegments:1,bevelThickness:.35,bevelSize:.4});
  return addMesh(parent,geo,mat,[0,depth/2,0],[Math.PI/2,0,0]);
}
function createAmbulance() {
  const g=new THREE.Group();g.name='Ambulance | comic-premium rescue van';
  const ivory=material(0xf0eadb),red=material(0xe2523d,{emissive:0x3a120d,emissiveIntensity:.08}),charcoal=material(0x1d313b),
    trim=material(0x7d959d,{metalness:.5,roughness:.4}),glass=material(0x2f5868,{metalness:.35,roughness:.24,emissive:0x10303d,emissiveIntensity:.15}),
    blue=material(0x67d0ff,{emissive:0x1eaaff,emissiveIntensity:1.8}),
    headlight=material(0xfff8da,{emissive:0xffe1a8,emissiveIntensity:1.1}),
    glowRed=material(0xff7b66,{emissive:0xff4f2f,emissiveIntensity:1.4}),
    white=material(0xffffe7,{emissive:0xffdfb1,emissiveIntensity:.7});
  softBox(g,[32,18,21],ivory,[-9,0,15],1.5);
  profile(g,[[6,5],[25,5],[25,12],[22,15],[17,22],[8,23],[6,20]],17,ivory);
  softBox(g,[47,17,2.5],charcoal,[0,0,5],.7);
  softBox(g,[31.4,18.4,3.25],red,[-9,0,10.8],.38);
  softBox(g,[23.5,.22,2.1],white,[-8.7,-9.22,11.5],.18,[0,.1,0]);
  softBox(g,[23.5,.22,2.1],white,[-8.7,9.22,11.5],.18,[0,-.1,0]);
  box(g,[8.7,13.9,.35],glass,[19.8,0,18.6],[0,.89,0]);
  softBox(g,[4.2,14.2,1.1],charcoal,[21.3,0,13.2],.5);
  for(const y of [-4.8,4.8]) rod(g,[19,y,19.8],[22,y*.4,15.8],.12,charcoal);
  softBox(g,[.6,12,3.2],charcoal,[25.25,0,9.8],.25);
  for(const z of [9,10,11]) box(g,[.7,11,.16],trim,[25.5,0,z]);
  softBox(g,[1.2,18.2,2],charcoal,[25,0,6.5],.5);
  softBox(g,[1.8,13.4,6.2],charcoal,[24.5,0,10.5],.42);
  for(const z of [8.7,9.9,11.1,12.3]) box(g,[2,11.4,.18],trim,[25.15,0,z]);
  softBox(g,[3.4,18,1.1],charcoal,[23.9,0,4.5],.38);
  for(const sign of [-1,1]) {
    const y=sign*9.18;
    softBox(g,[7.3,.35,6.5],glass,[11,y,18],.5);
    box(g,[.14,.2,14],trim,[6,y,14]);
    softBox(g,[2,.6,.5],charcoal,[8,y*1.02,13.6],.15);
    rod(g,[18,sign*8.5,16],[18,sign*10.9,16],.25,charcoal);
    softBox(g,[1.5,1,3.4],charcoal,[18,sign*10.8,17],.35);
    softBox(g,[4.7,.25,2],headlight,[23,sign*7.5,12.3],.25);
    softBox(g,[3.1,.32,.55],glowRed,[23,sign*7.65,11],.18);
    for(const x of [-15,14]) {
      wheel(g,x,sign*9.25,4,4.1);
      const arc=[];for(let i=0;i<=10;i++){const a=i*Math.PI/10;arc.push([x+4.6*Math.cos(a),sign*9.3,4+4.6*Math.sin(a)]);}
      hoop(g,arc,.45,ivory);
    }
    for(const x of [-22,-18,-14,-10]) box(g,[2,.24,1.5],ivory,[x,y*1.02,10.8],[0,sign*.45,0]);
    softBox(g,[7.4,.3,7.4],charcoal,[-16,y,19],.72);
    for(const angle of [0,Math.PI/3,-Math.PI/3]) box(g,[1.28,.38,5.45],ivory,[-16,y*1.025,19],[0,angle,0]);
    labelPlane(g,'RESCUE',16,2.5,[-2,y*1.02,16.5],'#23404c');
    labelPlane(g,'MED',8,2.1,[8.8,y*1.02,16.2],'#f6efe3');
    rod(g,[-23,y,7],[-3,y,7],.15,trim);
  }
  for(const y of [-4.3,4.3]) {
    softBox(g,[.5,7.4,16],ivory,[-25.3,y,15],.2);
    softBox(g,[.55,5.7,5.5],glass,[-25.65,y,19],.35);
    box(g,[.65,.45,2],charcoal,[-25.7,y-1.5,12]);
  }
  for(const y of [-7.8,7.8]) softBox(g,[.7,1,4.5],red,[-25.7,y,11],.2);
  softBox(g,[7.5,16,1],charcoal,[7,0,25.8],.3);
  const lamps=[];
  for(const y of [-5.7,5.7]) lamps.push(softBox(g,[6.5,4.2,1.8],blue.clone(),[7,y,27],.5));
  softBox(g,[12,9,1.6],ivory,[-12,0,26.8],.6);
  for(const x of [-16,-13,-10,-7]) box(g,[.3,6,.18],trim,[x,0,27.7]);
  softBox(g,[9.2,18.3,1.2],red,[-8.6,0,15.1],.18);
  softBox(g,[4.5,6.2,1.2],red,[7.1,0,15.1],.18);
  softBox(g,[6.2,2.6,.55],trim,[-5.5,0,28.1],.16);
  const start=performance.now();
  lamps[0].onBeforeRender=()=>{
    const t=(performance.now()-start)*.001;
    lamps.forEach((lamp,i)=>lamp.material.emissiveIntensity=.65+2.7*Math.pow(Math.max(0,Math.sin(t*9+i*Math.PI)),6));
  };
  g.userData.collisionSize={x:52,y:20};return markShadows(g);
}

function createTent() {
  const g=new THREE.Group();g.name='Medical shelter | inflatable arch';
  const fabric=material(0xede7d4,{side:THREE.DoubleSide}),rib=material(0xd66b40),
    teal=material(0x35636c),dark=material(0x243e48),glass=material(0x759a9b,{metalness:.1}),
    floor=material(0x617b77),white=material(0xfbf1db);
  softBox(g,[42,32,.65],floor,[0,0,.5],.25);
  // The curved fabric is one indexed skin; X remains the shelter's length.
  const section=[[-16,1],[-16,11],[-14.5,16],[-10,21],[-5,23.5],[0,24.2],[5,23.5],[10,21],[14.5,16],[16,11],[16,1]];
  const pos=[],indices=[];
  for(const x of [-20,20]) for(const [y,z] of section)pos.push(x,y,z);
  for(let i=0;i<section.length-1;i++){const n=section.length;indices.push(i,i+1,n+i,i+1,n+i+1,n+i);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(indices);geo.computeVertexNormals();
  addMesh(g,geo,fabric);
  for(const x of [-19.5,0,19.5]) hoop(g,section.map(([y,z])=>[x,y,z]),1,rib);
  for(const y of [-16,16]) {
    softBox(g,[39,.7,2.7],teal,[0,y,2],.3);
    for(const x of [-10,10]) {
      softBox(g,[8,.35,5],teal,[x,y*1.01,10],.3);
      softBox(g,[6.8,.4,3.8],glass,[x,y*1.025,10],.3);
      box(g,[.35,.45,4],white,[x,y*1.04,10]);
    }
    rod(g,[-19,y,5],[19,y,5],.1,rib);
  }
  // End walls leave a real, open doorway and a visible folding treatment bed.
  const endShape=new THREE.Shape();section.forEach(([y,z],i)=>i?endShape.lineTo(y,z):endShape.moveTo(y,z));endShape.closePath();
  const back=new THREE.Mesh(new THREE.ShapeGeometry(endShape),fabric);
  back.rotation.set(Math.PI/2,0,Math.PI/2);back.position.x=-19.9;g.add(back);
  for(const sign of [-1,1]) {
    softBox(g,[.5,7,14],fabric,[20,sign*12,8],.3);
    softBox(g,[1.3,1.3,16],teal,[20.5,sign*8,9],.5);
    softBox(g,[1.7,2,14],rib,[20.7,sign*9.5,8.5],.7);
  }
  softBox(g,[.7,17,4.5],teal,[20.7,0,18],.3);
  // Medical symbol faces out along +X.
  box(g,[.8,4.8,.95],white,[21.15,0,18]);box(g,[.8,.95,3.3],white,[21.15,0,18]);
  softBox(g,[21,9,1.2],dark,[-3,0,6.7],.4);
  softBox(g,[6,8,1],fabric,[-10,0,7.8],.4);
  for(const x of [-10,5])for(const y of [-3.8,3.8])rod(g,[x,y,6.2],[x+(x<0?2:-2),y,.8],.3,teal);
  // Rolled-up entrance fabric under the front arch.
  const rolled=cylinder(g,1.4,1.4,15,fabric,[20,0,21],10);rolled.rotation.x=0;
  g.userData.collisionSize={x:44,y:34};return markShadows(g);
}

function createContainer() {
  const g=new THREE.Group();g.name='Field logistics | steel module';
  const teal=material(0x356674),deep=material(0x244450),edge=material(0x749598),ivory=material(0xe1d7b9),orange=material(0xe6ac55);
  softBox(g,[40,19,19],teal,[0,0,11],.65);
  softBox(g,[41,20,1.2],deep,[0,0,20.8],.3);
  for(const y of [-9.6,9.6]) {
    for(let x=-17.5;x<=17.5;x+=3.5)softBox(g,[.7,.6,16.5],edge,[x,y,11],.18);
    box(g,[38,.4,1.5],orange,[0,y*1.03,5]);
    softBox(g,[20,.5,6],deep,[-2,y*1.04,13],.3);
    labelPlane(g,'RESCUE / 01',18,3,[-2,y*1.075,13],'#eee3c8');
  }
  for(const x of [-19,19])for(const y of [-8.8,8.8])softBox(g,[1.5,1.5,21],deep,[x,y,10.7],.2);
  for(const y of [-4.4,4.4]){
    softBox(g,[.6,8.4,17],deep,[20.4,y,11],.3);
    softBox(g,[.7,7.6,16],teal,[20.8,y,11],.3);
    rod(g,[21.3,y,4],[21.3,y,18],.22,ivory);
    box(g,[.8,2,.5],ivory,[21.6,y,10]);
  }
  for(const x of [-14,14])for(const y of [-7,7])softBox(g,[3,3,2],deep,[x,y,1],.3);
  g.userData.collisionSize={x:42,y:21};return markShadows(g);
}
export function createObstacle(type) {
  if(type===OBSTACLE_TYPES.AMBULANCE)return createAmbulance();
  if(type===OBSTACLE_TYPES.TENT)return createTent();
  if(type===OBSTACLE_TYPES.CONTAINER)return createContainer();
  throw new Error('Unknown obstacle type: '+type);
}
