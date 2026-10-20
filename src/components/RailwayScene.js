import * as THREE from 'three';
import {setIncidentLight} from './SceneAtmosphere.js';
import {softBox,rod} from './VisualPrimitives.js';
import { material, box, cylinder, wheel, seeded, markShadows } from './ArtKit.js';

// Visuals only. XY ground / Z up; the collision root and public return stay intact.
function softTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 63);
  gradient.addColorStop(0, 'rgba(255,255,255,.8)');
  gradient.addColorStop(.38, 'rgba(255,255,255,.45)');
  gradient.addColorStop(.72, 'rgba(255,255,255,.12)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function groundWash(parent, texture, x, y, w, h, angle, color, opacity) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: texture, color, transparent: true,
      opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
  mesh.position.set(x, y, .3);
  mesh.rotation.z = angle;
  parent.add(mesh);
  return mesh;
}

// Jagged sheets give the silhouette actual damage instead of painted scratch boxes.
function sheet(parent, points, mat, position, rotation = [0, 0, 0]) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y));
  shape.closePath();
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

export function createRailIncident(scene) {
  setIncidentLight(scene);
  const tracks = new THREE.Group();
  tracks.name = 'Railway | restrained gauge and impact trail';
  const timber = material(0xffffff), steel = material(0x68716c, { metalness: .38, roughness: .64 });
  const railEdge = material(0x414b45, { metalness: .18, roughness: .8 });
  const ties = new THREE.InstancedMesh(new THREE.BoxGeometry(3.5, 37, 1.1), timber, 99);
  const dummy = new THREE.Object3D(), rand = seeded(4125);
  const color = new THREE.Color();
  for (let i = 0; i < 99; i++) {
    const x = (i - 49) * 12.1;
    // Only the sleepers close to the derailment are disturbed.
    const damage = x > 30 && x < 135;
    dummy.position.set(x, damage ? Math.sin(i * 2.7) * 1.6 : 0, .6);
    dummy.rotation.set(0, 0, damage ? Math.sin(i * 1.7) * .075 : 0);
    dummy.updateMatrix();
    ties.setMatrixAt(i, dummy.matrix);
    ties.setColorAt(i, color.setHex(0x716754).lerp(new THREE.Color(0x998768), rand() * .5));
  }
  ties.instanceMatrix.needsUpdate = true;
  ties.instanceColor.needsUpdate = true;
  ties.receiveShadow = true; // Tiny sleepers do not need a shadow draw pass.
  tracks.add(ties);
  for (const y of [-13.5, 13.5]) {
    box(tracks, [1200, 1.8, 2.2], railEdge, [0, y, 1.9]);
    box(tracks, [1200, 2.5, .45], steel, [0, y, 3.25]);
  }
  const fasteners = new THREE.InstancedMesh(new THREE.BoxGeometry(2.2, 3.7, .35), railEdge, 198);
  for (let i = 0; i < 99; i++) for (let j = 0; j < 2; j++) {
    dummy.position.set((i - 49) * 12.1, j ? 13.5 : -13.5, 1.4);
    dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
    fasteners.setMatrixAt(i * 2 + j, dummy.matrix);
  }
  fasteners.instanceMatrix.needsUpdate = true;
  tracks.add(fasteners);
  scene.add(tracks);

  const wreck = new THREE.Group();
  wreck.name = 'Derailment | peeled roof and exposed passenger cabin';
  const side = material(0xa83d39, { roughness: .82, emissive: 0x210705, emissiveIntensity: .07 });
  const red = material(0xc64e41, { roughness: .76, side: THREE.DoubleSide, emissive: 0x2b0b06, emissiveIntensity: .07 });
  const roof = material(0x5c7077, { metalness: .25, roughness: .75, side: THREE.DoubleSide });
  const edge = material(0x8c9a94, { metalness: .42, roughness: .56, side: THREE.DoubleSide });
  const glass = material(0x608b98, { metalness: .35, roughness: .28, side: THREE.DoubleSide });
  const dark = material(0x1d292d), stripe = material(0xdbcfae);
  const seat = material(0x596e63), interior = material(0x998c6d);
  const warm = material(0xffd697, { emissive: 0xffa341, emissiveIntensity: 1.7 });

  box(wreck, [102, 23, 3], dark, [0, 0, -11]);
  box(wreck, [96, 21, 1], interior, [0, 0, -9]);
  // Open shell: the broken windows and roof reveal real interior geometry.
  for (const sign of [-1, 1]) {
    const y = sign * 11.5;
    box(wreck, [99, 1.1, 11], side, [0, y, -4]);
    box(wreck, [98, 1.3, 1.5], stripe, [0, y, -4.7]);
    box(wreck, [91, 1.1, 3.5], side, [-3, y, 11.5]);
    for (let i = 0; i < 7; i++) {
      const x = -39 + i * 12;
      const broken = (sign < 0 && (i === 3 || i === 6)) || (sign > 0 && i === 5);
      box(wreck, [2.7, 1.25, 10], side, [x - 5.7, y, 5]);
      // Dark recessed frame, with an open center when the glass is missing.
      for (const z of [1.3, 9.6]) box(wreck, [9.2, 1.3, .65], dark, [x, y, z]);
      for (const dx of [-4.3, 4.3]) box(wreck, [.5, 1.3, 8.5], dark, [x + dx, y, 5.4]);
      if (!broken) {
        const pane=box(wreck, [8, .2, 7.5], glass, [x, y, 5.5]);
        pane.castShadow=false;pane.receiveShadow=false;
        box(wreck, [5.5, .24, .32], edge, [x - .6, y + sign * .2, 8.5]);
      } else {
        sheet(wreck, [[-4, 0], [-3, 2.7], [-.7, .7], [1, 1.5], [3.9, 0]],
          glass, [x, y + sign * .2, 1.6], [Math.PI / 2, 0, 0]);
        sheet(wreck, [[-4, 0], [-1.8, -2.1], [-1, 0], [4, 0]],
          glass, [x, y + sign * .2, 9.3], [Math.PI / 2, 0, 0]);
      }
    }
    box(wreck, [5, 1.3, 24], red, [-47, y, 1]);
    box(wreck, [.6, 1.6, 4.5], stripe, [-45.5, y, -.5]);
    // Collapsed front corner, with a panel peeled outward.
    sheet(wreck, [[0, 0], [10, 2], [8, 11], [4, 9], [2, 17], [0, 16]],
      red, [39, y, -8], [Math.PI / 2, 0, sign * .17]);
    for (const x of [-32, -8, 16, 33]) {
      box(wreck, [5, 5, 1.3], seat, [x, sign * 6.3, -4]);
      box(wreck, [1.2, 5, 6], seat, [x - 2.2, sign * 6.3, -1.5]);
    }
  }
  box(wreck, [1.7, 23, 23], side, [-49, 0, 1]);
  // comic-premium read: brighter rescue doors and cleaner edge highlights.
  softBox(wreck, [6.2, 1.25, 11.2], material(0xd39d37, { emissive: 0x452e08, emissiveIntensity: .15 }), [-7.5, -11.55, 4.8], .18);
  softBox(wreck, [6.2, 1.25, 11.2], material(0xd39d37, { emissive: 0x452e08, emissiveIntensity: .15 }), [17.5, 11.55, 4.8], .18);
  box(wreck, [.35, 13, 8], glass, [-50, 0, 4]);
  box(wreck, [73, 23.6, 1.8], roof, [-13, 0, 14]);
  for (const x of [-37, -20, -3, 14]) box(wreck, [.55, 23.8, .35], edge, [x, 0, 15.1]);
  // Peeled roof is the main visual landmark; the last bay is genuinely open.
  sheet(wreck, [[0, -11.8], [20, -11.8], [17, -5], [24, -1], [15, 3], [19, 11.8], [0, 11.8]],
    roof, [23, 0, 14], [0, -.5, .025]);
  for (const x of [30, 40]) {
    box(wreck, [.8, 22, .9], edge, [x, 0, 10.5], [0, .18, .07]);
  }
  box(wreck, [2, 20, 11], dark, [46, 0, -5], [0, -.27, .08]);
  box(wreck, [7, 24, 4], red, [46, 0, -8], [0, -.2, .12]);
  for (const x of [-32, 30]) {
    box(wreck, [18, 18, 3], dark, [x, 0, -13]);
    for (const y of [-13, 13]) wheel(wreck, x, y, -12, 4.5);
  }
  // Warm surviving emergency strip inside the exposed cabin.
  box(wreck, [17, .8, .7], warm, [27, 9.8, 9]);
  const cabinLight = new THREE.PointLight(0xffad58, 32, 34, 2);
  cabinLight.position.set(31, 0, 5);
  wreck.add(cabinLight);
  const scorch = material(0x393931, { roughness: 1 });
  for (const [x, y, w] of [[-30, -12.1, 13], [10, -12.1, 16], [31, 12.1, 9]]) {
    box(wreck, [w, .1, .3], scorch, [x, y, -2.5], [0, .04, 0]);
  }
  // Do not move this root or change its collision metadata.
  wreck.position.set(80, 60, 14);
  wreck.rotation.z = .25;
  wreck.rotation.y = .4;
  wreck.userData.collisionSize = { x: 105, y: 25 };
  // A visual sub-root settles the wheels while leaving the collision root untouched.
  const shell=new THREE.Group();
  for(const child of [...wreck.children])shell.add(child);
  shell.rotation.y=-.22;shell.rotation.x=.12;shell.position.z=1.5;
  wreck.add(shell);
  markShadows(wreck);
  wreck.traverse(o=>{if(o.isMesh && o.material===glass){o.castShadow=false;o.receiveShadow=false;}});
  scene.add(wreck);

  const dressing = new THREE.Group();
  dressing.name = 'Incident atmosphere | decorative, no collision';
  scene.add(dressing);
  const soft = softTexture();
  // A canted signal at the impact approach anchors the scene's railway identity.
  const signal=new THREE.Group();signal.position.set(158,-30,0);dressing.add(signal);
  softBox(signal,[5,5,2.5],dark,[0,0,1.25],.4);
  rod(signal,[0,0,2],[2,0,26],.6,edge);
  softBox(signal,[4.5,2.1,9],dark,[2,0,27],.8,[0,.07,0]);
  const redLens=material(0xe55737,{emissive:0xff391b,emissiveIntensity:1.6});
  for(const z of [25,29]) {
    const lens=new THREE.Mesh(new THREE.SphereGeometry(.95,10,6),z===29?redLens:dark);
    lens.scale.set(1,.35,1);lens.position.set(2,-1.15,z);signal.add(lens);
  }
  softBox(signal,[3,.4,4],stripe,[1,-.5,17],.15,[0,.07,0]);
  groundWash(dressing, soft, 87, 63, 132, 56, .25, 0x292d27, .63);
  // Wheel furrows lead the eye from the track toward the carriage.
  for (const dy of [-5, 5]) {
    groundWash(dressing, soft, 71, 31 + dy, 66, 5, .52, 0x3c362a, .66);
  }
  for (let i = 0; i < 18; i++) {
    const x = 46 + rand() * 102, y = 27 + rand() * 74;
    box(dressing, [1 + rand() * 4, .8 + rand() * 2, .35 + rand()],
      i % 4 === 0 ? red : edge, [x, y, .6], [0, rand() * .2, rand() * 6.28]);
  }
  // Two identifiable components, rather than a field of random cubes.
  box(dressing, [14, 8, .65], red, [134, 71, .7], [.07, -.03, .42]);
  box(dressing, [10, 6, .2], dark, [134, 71, 1.1], [.07, -.03, .42]);
  box(dressing, [19, 1, 1], edge, [115, 41, .9], [0, 0, -.31]);
  // Memorable human detail: an abandoned suitcase with a red scarf nearby.
  const hazard = material(0xf0a13a, { emissive: 0x5a2e00, emissiveIntensity: .14 });
  for (const [x, y, r] of [[145, 72, .2], [158, 48, -.3], [103, 96, .5]]) {
    softBox(dressing, [10, 3.6, 3.4], hazard, [x, y, 1.75], .4, [0, 0, r]);
    cylinder(dressing, 1.1, 1.5, 5.8, dark, [x + 5, y - 1, 2.8], 6);
  }
  const luggage = material(0xb18a54), cloth = material(0xca5842, { side: THREE.DoubleSide });
  box(dressing, [5.5, 3.6, 2.8], luggage, [55, 78, 1.5], [0, 0, -.3]);
  box(dressing, [2, .45, .6], dark, [55, 78, 3.2], [0, 0, -.3]);
  sheet(dressing, [[0, 0], [2, .4], [4, -.5], [8, 1], [8.4, 2], [4, .7], [1, 1.6]],
    cloth, [55, 78, .4]);
  const orange = material(0xd97838), white = material(0xe7d5ac);
  for (const [x, y] of [[18, 70], [31, 86], [168, 29], [171, 110]]) {
    cylinder(dressing, .25, 2.5, 6.3, orange, [x, y, 3.15], 6);
    cylinder(dressing, 1.4, 1.5, .9, white, [x, y, 2.8], 6);
    box(dressing, [5, 5, .65], dark, [x, y, .25]);
  }
  // Self-contained render-driven animation: no gameplay loop or timers changed.
  const puffs = [];
  for (let i = 0; i < 8; i++) {
    const puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: 0x8b928a,
      transparent: true, opacity: 0, depthWrite: false, toneMapped: true }));
    puff.frustumCulled = false;
    dressing.add(puff);
    puffs.push(puff);
  }
  const beaconMat = material(0xffb64c, { emissive: 0xff8c20, emissiveIntensity: 1 });
  cylinder(dressing, 1.2, 1.5, 1.8, beaconMat, [31, 86, 7], 8);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: 0xffaf43,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  halo.position.set(31, 86, 7); halo.scale.set(10, 10, 1);
  dressing.add(halo);
  const pool = groundWash(dressing, soft, 31, 86, 21, 21, 0, 0xffae53, .12);
  const started = performance.now();
  // Sprite callbacks still run when the rails leave the camera's view.
  puffs[0].onBeforeRender = () => {
    const time = (performance.now() - started) * .001;
    for (let i = 0; i < puffs.length; i++) {
      const phase = (time * .085 + i / puffs.length) % 1;
      const puff = puffs[i];
      const size = 7 + phase * 19;
      puff.position.set(117 + phase * 16 + Math.sin(i * 2.4 + time * .3) * 1.4,
        67 + phase * 8, 9 + phase * 42);
      puff.scale.set(size * 1.3, size, 1);
      puff.material.opacity = Math.sin(phase * Math.PI) * .16;
      puff.material.rotation = i * 1.7 + time * .035;
      puff.updateMatrixWorld();
    }
    const pulse = Math.pow(.5 + .5 * Math.sin(time * 4.2), 5);
    beaconMat.emissiveIntensity = .65 + pulse * 2.2;
    halo.material.opacity = .15 + pulse * .45;
    pool.material.opacity = .035 + pulse * .12;
  };
  return { wagonGroup: wreck, tracks };
}
