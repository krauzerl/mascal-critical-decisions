import * as THREE from 'three';
import { material, box, sphere, cylinder, seeded } from './ArtKit.js';
import {rod} from './VisualPrimitives.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Art pass only: all navigation, positions and collision footprints stay unchanged.
// Z is up, XY is the collision plane. No additional solid obstacles.

function proceduralGroundTexture(seed = 76231) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const data = ctx.createImageData(size, size);
  const rand = seeded(seed);
  const coarse = Array.from({ length: 33 * 33 }, () => rand());
  const fine = Array.from({ length: 129 * 129 }, () => rand());
  // Smooth, repeatable multi-scale value noise: generated once, no network assets.
  function sample(grid, n, x, y) {
    const xx = (x * (n-1)) / size, yy = (y * (n-1)) / size;
    const x0 = Math.floor(xx), y0 = Math.floor(yy);
    const u = xx-x0, v = yy-y0;
    const sx=u*u*(3-2*u), sy=v*v*(3-2*v);
    const a=grid[y0*n+x0], b=grid[y0*n+Math.min(x0+1,n-1)];
    const c=grid[Math.min(y0+1,n-1)*n+x0], d=grid[Math.min(y0+1,n-1)*n+Math.min(x0+1,n-1)];
    return (a+(b-a)*sx)*(1-sy) + (c+(d-c)*sx)*sy;
  }
  for (let y=0; y<size; y++) for (let x=0; x<size; x++) {
    const a=sample(coarse,33,x,y), b=sample(fine,129,x,y);
    const dust = Math.max(0, b*1.3 + a*.6 - 1.11);
    const grain=(rand()-.5)*5;
    const shade = (a-.5)*14 + (b-.5)*5 + grain;
    const ix=(y*size+x)*4;
    data.data[ix] = Math.min(255,Math.max(0,74 + shade * .8 + dust * 15));
    data.data[ix+1] = Math.min(255,Math.max(0,86 + shade * .9 + dust * 12));
    data.data[ix+2] = Math.min(255,Math.max(0,76 + shade * .7 + dust * 9));
    data.data[ix+3]=255;
  }
  ctx.putImageData(data,0,0);
  const tex=new THREE.CanvasTexture(canvas);
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.repeat.set(8,8);
  tex.anisotropy=8;
  return tex;
}

function softPatchTexture() {
  const cvs=document.createElement('canvas');
  cvs.width=cvs.height=256;
  const c=cvs.getContext('2d');
  const g=c.createRadialGradient(128,128,12,128,128,128);
  g.addColorStop(0,'rgba(85,72,51,.34)');
  g.addColorStop(.43,'rgba(94,80,57,.20)');
  g.addColorStop(.78,'rgba(100,90,67,.07)');
  g.addColorStop(1,'rgba(99,91,71,0)');
  c.fillStyle=g; c.fillRect(0,0,256,256);
  return new THREE.CanvasTexture(cvs);
}

function addPatch(group, tex, x, y, w, h, rotation=0, opacity=1, z=-.29) {
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(w,h),
    new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1})
  );
  decal.position.set(x,y,z);
  decal.rotation.z=rotation;
  decal.receiveShadow=false; decal.castShadow=false;
  group.add(decal);
  return decal;
}

function buildTrackBed(root, rand, dustTex) {
  // Smooth, dusty side shoulders + compacted railway ballast bed.
  const shoulder=material(0x555647,{roughness:1});
  const gravelBed=material(0x66685e,{roughness:1});
  box(root,[1210,51,.25],shoulder,[0,0,-.19]).receiveShadow=true;
  box(root,[1200,45,.32],gravelBed,[0,0,.06]).receiveShadow=true;
  const grit=[material(0x8d8c77),material(0x615f55),material(0xa09d87),material(0x7b766a)];
  const instanceCount=740;
  const geo=new THREE.IcosahedronGeometry(1,0);
  const chunks = grit.map(mat => {
    const m=new THREE.InstancedMesh(geo,mat,instanceCount);
    m.castShadow=false; m.receiveShadow=true; m.frustumCulled=false;
    root.add(m); return m;
  });
  const index=[0,0,0,0];
  const ob=new THREE.Object3D();
  for (let i=0;i<instanceCount;i++) {
    const pick=Math.floor(rand()*4);
    ob.position.set((rand()-.5)*1190,(rand()-.5)*47,.24 + rand()*.09);
    ob.scale.set(.5+rand()*1.5,.45+rand()*1.25,.24+rand()*.32);
    ob.rotation.z=rand()*Math.PI;
    ob.updateMatrix();
    chunks[pick].setMatrixAt(index[pick]++,ob.matrix);
  }
  for(let i=0;i<4;i++) {chunks[i].count=index[i];chunks[i].instanceMatrix.needsUpdate=true;}
  for(const [x,y,w,h,a] of [[58,61,240,110,.2],[153,110,188,120,-.35],[24,-67,170,60,.0]]) {
    addPatch(root,dustTex,x,y,w,h,a,.9,-.11);
  }
}

function buildAccessRoad(root, rand, dustTex) {
  const road = new THREE.Group();
  road.position.set(-91,-116,.13);
  road.rotation.z=-Math.PI/12;
  root.add(road);
  const shoulder=material(0x6a6556,{roughness:1});
  const asphalt=material(0x3b4348,{roughness:1});
  const scuffed=material(0x30383d,{roughness:1});
  const marking=material(0xb8b098,{roughness:1, emissive: 0x2b261d, emissiveIntensity: 0.05});
  box(road,[334,82,.25],shoulder,[0,0,-.1]);
  box(road,[326,72,.28],asphalt,[0,0,.08]);
  for (const y of [-35.6,35.6]) box(road,[315,.65,.06],marking,[0,y,.255]);
  for(let i=-5;i<=5;i++) {
    const x=i*25 + 2;
    box(road,[10.5,.65,.05],marking,[x,0,.26]);
  }
  // Two subtle traffic wear tracks and dark asphalt crack fragments.
  for(const y of [-14,14]) box(road,[295,1.6,.04],scuffed,[0,y,.245]);
  const crackMat=material(0x3b4140);
  for(let i=0;i<26;i++) {
    const x=(rand()-.5)*304,y=(rand()-.5)*64;
    const crack=box(road,[2+rand()*6,.18,.023],crackMat,[x,y,.258]);
    crack.rotation.z=(rand()-.5)*.8;
  }
  addPatch(root,dustTex,-208,-75,115,85,-.26,.5,-.21);
  addPatch(root,dustTex,40,-147,115,70,-.26,.6,-.21);
}

function buildMedicalZone(root, rand, dustTex) {
  // A compact operational zone, not a giant empty lawn behind the tents.
  const pad=material(0x6f716a,{roughness:1});
  const edge=material(0x8c816d,{roughness:1});
  const turf=material(0x545d50,{roughness:1});
  box(root,[204,118,.14],edge,[-162,113,-.24]);
  box(root,[198,112,.16],pad,[-162,113,-.13]);
  for(const [x,y] of [[-253,57],[-71,57],[-253,168],[-71,168]]) {
    box(root,[7,7,.18],turf,[x,y,-.01]);
  }
  addPatch(root,dustTex,-166,119,270,205,.1,.35,-.12);
  // Strongly restrained ground stains / footprints, never opaque decals.
  const footprints=material(0x706f62,{roughness:1,transparent:true,opacity:.4});
  for(let i=0;i<55;i++) {
    const x=-244+rand()*165,y=66+rand()*94;
    if(Math.abs(x+131)<31 && Math.abs(y-99)<26) continue;
    const f=box(root,[.65,2.4,.025],footprints,[x,y,.04]);
    f.rotation.z=(rand()-.5)*.5;
  }
}

function buildVegetation(root, rand) {
  // Outskirts: instanced stones and small vegetation; the accident corridor stays clear.
  const colors=[0x4f6c5b,0x708467,0x375349,0x899070];
  const canopy=colors.map(c=>material(c,{roughness:1}));
  const bark=material(0x665c4c);
  const treeBatch=new THREE.Group();
  for(let i=0;i<100;i++) {
    const x=(rand()-.5)*1340,y=(rand()-.5)*970;
    if (Math.abs(x)<280 && Math.abs(y)<230) continue;
    const tree=new THREE.Group();
    tree.position.set(x,y,-.20);
    const h=8+rand()*7;
    cylinder(tree,.85,1.4,h,bark,[0,0,h/2],7);
    const size=6+rand()*4;
    for(const [dx,dy,dz,k] of [[-3,1,1,1],[3,-1,3,.8],[0,0,7,.78]]) {
      rod(tree,[0,0,h*.6],[dx,dy,h+dz],.5,bark);
      const crown=sphere(tree,size*k,canopy[Math.floor(rand()*canopy.length)],[dx,dy,h+dz],1);
      crown.scale.set(1,.85,.85);
    }
    treeBatch.add(tree);
  }
  // Merge static trees by material: richer crowns without hundreds of draw calls.
  treeBatch.updateMatrixWorld(true);
  const batches=new Map();
  treeBatch.traverse(o=>{
    if(!o.isMesh)return;
    if(!batches.has(o.material))batches.set(o.material,[]);
    const geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
    batches.get(o.material).push(geometry.applyMatrix4(o.matrixWorld));
    o.geometry.dispose();
  });
  for(const [mat,geometries] of batches) {
    const merged=mergeGeometries(geometries);
    const mesh=new THREE.Mesh(merged,mat);mesh.castShadow=true;mesh.receiveShadow=true;
    root.add(mesh);geometries.forEach(geo=>geo.dispose());
  }
  const grassMats=colors.map(c=>material(c));
  const tuftGeo=new THREE.ConeGeometry(1,3,3);
  tuftGeo.rotateX(Math.PI/2); // three cone Y up -> Z up
  const tufts=grassMats.map(mat=>{
    const mesh=new THREE.InstancedMesh(tuftGeo,mat,220);
    mesh.castShadow=false;mesh.receiveShadow=false;
    root.add(mesh);return mesh;
  });
  const counts=[0,0,0,0], dummy=new THREE.Object3D();
  for(let i=0;i<690;i++) {
    const x=(rand()-.5)*920,y=(rand()-.5)*660;
    // Preserve patient access routes and road, tents, rails and wagon.
    if (Math.abs(y)<53 || (x>-270 && x<25 && y>-177 && y<190) ||
        (x>25 && x<255 && y>0 && y<200)) continue;
    const which=Math.floor(rand()*4);
    dummy.position.set(x,y,.4);
    dummy.scale.set(.5+rand()*.7,.55+rand()*.7,.5+rand()*1.2);
    dummy.rotation.set(0,0,rand()*6.28);
    dummy.updateMatrix();
    tufts[which].setMatrixAt(counts[which]++,dummy.matrix);
  }
  for(let i=0;i<4;i++) {tufts[i].count=counts[i];tufts[i].instanceMatrix.needsUpdate=true;}
}

export function createMap() {
  const root=new THREE.Group();
  root.name='MASCAL | Ground art · Sprint 1';
  const rand=seeded(91375);
  const soil=new THREE.Mesh(
    new THREE.PlaneGeometry(2400,2400),
    new THREE.MeshStandardMaterial({map:proceduralGroundTexture(),roughness:1,metalness:0,color:0xb8c4b2})
  );
  soil.position.z=-.48;
  soil.receiveShadow=true;
  root.add(soil);
  const dustTex=softPatchTexture();
  buildTrackBed(root,rand,dustTex);
  buildAccessRoad(root,rand,dustTex);
  buildMedicalZone(root,rand,dustTex);
  buildVegetation(root,rand);
  const line=material(0xe3d9b7,{roughness:1});
  for(const x of [-240,-210]) {
    for(const y of [72,146])box(root,[17,.5,.06],line,[x,y,.09]);
    box(root,[.5,74,.06],line,[x-8,109,.09]);
  }
  return root;
}
