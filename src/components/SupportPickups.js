import * as THREE from 'three';

// World collectibles for MASCAL 2.0. All decorative and non-collidable.
// Gameplay and rarity live in TacticalSupport.js; this module never awards items.
const TYPES={
  stt:{label:'STT',color:0x56d8f0},
  lpr:{label:'HEMS',color:0xffbc78},
  psp:{label:'FIRE',color:0xff805b},
  medkit:{label:'MED',color:0x94e4ac},
};
function mat(color,emissive=0x000000,strength=0){
  return new THREE.MeshStandardMaterial({color,roughness:.58,metalness:.17,emissive,emissiveIntensity:strength});
}
function mesh(group,geometry,material,x=0,y=0,z=0){
  const part=new THREE.Mesh(geometry,material);
  part.position.set(x,y,z);part.castShadow=true;part.receiveShadow=true;group.add(part);return part;
}
function banner(label,color){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='rgba(5,16,25,0.92)';
  ctx.beginPath();ctx.roundRect(12,12,488,135,26);ctx.fill();
  ctx.lineWidth=9;ctx.strokeStyle=`#${color.toString(16).padStart(6,'0')}`;ctx.stroke();
  ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='bold 66px Arial';ctx.fillText(label,256,83);
  const tx=new THREE.CanvasTexture(canvas);tx.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tx,transparent:true,depthTest:false,depthWrite:false}));
  sprite.scale.set(33,10.5,1);sprite.position.z=32;sprite.renderOrder=12;
  return sprite;
}
function worldObject(item){
  const tint=TYPES[item.type];
  const root=new THREE.Group();root.position.set(item.pos.x,item.pos.y,0);
  root.name=`Pickup | ${tint.label}`;
  const base=mat(0x192d37),bright=mat(tint.color,tint.color,.44);
  const holder=new THREE.Group();holder.position.z=8;root.add(holder);
  mesh(holder,new THREE.CylinderGeometry(7.2,8,2,8),base,0,0,-4.5).rotation.x=Math.PI/2;
  const main=mesh(holder,new THREE.BoxGeometry(12,10,7),base);
  main.rotation.z=.1;
  mesh(holder,new THREE.BoxGeometry(11,2.6,1.6),bright,0,0,4.2);
  for(const x of [-5.5,5.5])mesh(holder,new THREE.BoxGeometry(.9,10,4.1),bright,x,0,0);
  if(item.type==='stt'){
    // Optical cue: several rings contained inside one case.
    for(const x of [-3.5,0,3.5]) {
      const ring=mesh(holder,new THREE.TorusGeometry(1.55,.48,7,14),bright,x,0,6.7);
      ring.rotation.x=.35;
    }
  } else if(item.type==='lpr') {
    const rotor=mesh(holder,new THREE.BoxGeometry(10,.75,.45),bright,0,0,7.5);
    rotor.rotation.z=Math.PI/4;
    mesh(holder,new THREE.BoxGeometry(10,.75,.45),bright,0,0,7.5).rotation.z=-Math.PI/4;
  } else if(item.type==='psp') {
    mesh(holder,new THREE.ConeGeometry(3.4,5,5),bright,0,0,7.5).rotation.x=Math.PI/2;
  } else {
    mesh(holder,new THREE.BoxGeometry(5.2,1,1),bright,0,0,7.2);
    mesh(holder,new THREE.BoxGeometry(1,5.2,1),bright,0,0,7.2);
  }
  const ring=mesh(root,new THREE.RingGeometry(10.3,11.35,28),
    new THREE.MeshBasicMaterial({color:tint.color,transparent:true,opacity:.76,depthWrite:false,side:THREE.DoubleSide}),0,0,.7);
  ring.castShadow=false;
  const disk=mesh(root,new THREE.CircleGeometry(9.8,28),
    new THREE.MeshBasicMaterial({color:tint.color,transparent:true,opacity:.12,depthWrite:false}),0,0,.6);
  disk.castShadow=false;
  root.add(banner(`${tint.label}${item.type==='stt'?' ×'+item.bands:''}`,tint.color));
  const lamp=new THREE.PointLight(tint.color,7,70,2);lamp.position.z=13;root.add(lamp);
  return {root,holder,ring,lamp};
}
export function createWorldPickups(scene,core){
  const root=new THREE.Group();root.name='MASCAL | rare collectible support';
  const objects=core.state.pickups.map(item=>({item,...worldObject(item)}));
  objects.forEach(o=>root.add(o.root));scene.add(root);
  return {
    update(t){
      for(const o of objects){
        o.root.visible=!o.item.collected && core.state.phase==='playing';
        if(!o.root.visible)continue;
        o.holder.position.z=8+Math.sin(t*2.3+o.item.pos.x*.09)*1.65;
        o.holder.rotation.z=t*.27;
        o.ring.material.opacity=.5+.25*(.5+.5*Math.sin(t*2.7));
        o.lamp.intensity=4+2*Math.sin(t*2.4);
      }
    },
    dispose(){scene.remove(root);},
  };
}
