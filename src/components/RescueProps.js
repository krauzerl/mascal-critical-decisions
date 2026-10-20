import * as THREE from 'three';
import { material, box, sphere, addMesh, markShadows, seeded } from './ArtKit.js';

// Junie authored these assets mostly in local Y-up coordinates.
// Keep them coherent in that space; RescueDressing rotates each complete asset
// into the game's Z-up coordinate system. The original ArtKit helpers use Z-up.
function cylinder(parent, top, bottom, height, mat, pos = [0,0,0], sides = 10) {
  return addMesh(parent, new THREE.CylinderGeometry(top,bottom,height,sides), mat, pos);
}
function cross(parent, x, y, z, scale = 1) {
  const red = material(0xc93d38);
  box(parent, [3.1*scale,0.7*scale,0.14], red, [x,y,z]);
  box(parent, [0.7*scale,3.1*scale,0.14], red, [x,y,z]);
}
function labelPlane(parent, text, width=18, height=5, pos=[0,0,0], color='#ffffff') {
  const canvas=document.createElement('canvas');
  canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d');
  ctx.font='bold 64px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle=color;ctx.fillText(text,256,65,495);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false});
  const mesh=addMesh(parent,new THREE.PlaneGeometry(width,height),m,pos);
  mesh.castShadow=false;
  return mesh;
}

/**
 * Emergency Scene Props Pack — MASCAL: Critical Decisions
 *
 * Reusable procedural props for the railway disaster environment.
 * Z-up coordinate system.  Flat-shaded low-poly aesthetic.
 *
 * Each factory returns a THREE.Group ready to add to any scene.
 * Scales are consistent with the existing world (player ≈ 40 units tall,
 * train carriage ≈ 100 × 25 units).
 */

// ── Shared materials ──────────────────────────────────────────────────

function m(color, opts = {}) {
  return material(color, opts);
}

const steelMat   = m(0x6c7c83, { metalness: 0.35, roughness: 0.45 });
const darkSteel  = m(0x3a4449, { metalness: 0.3, roughness: 0.5 });
const rust       = m(0x8a5a3a);
const orange     = m(0xee7841);
const brightOrange = m(0xf59a43, { emissive: 0x3a1a00, emissiveIntensity: 0.15 });
const red        = m(0xc93d38);
const darkRed    = m(0x8f282c);
const white      = m(0xf0ede1);
const cream      = m(0xfaf4e6);
const navy       = m(0x1b3646);
const teal       = m(0x248f8d);
const green      = m(0x546f54);
const yellow     = m(0xf9c958);
const reflective = m(0xe9e3ad, { emissive: 0x494128, emissiveIntensity: 0.12 });
const glassMat   = m(0x5d91a0, { metalness: 0.22, roughness: 0.17 });
const skin       = m(0xe2a981);
const black      = m(0x202d36);
const wood       = m(0x665846);
const fabric     = m(0x8d7c63);
const tarpGreen  = m(0x4a6b53, { side: THREE.DoubleSide });
const tarpBlue   = m(0x3c6475, { side: THREE.DoubleSide });
const blood      = m(0x6b1a1a);
const plastic    = m(0x4eafaa);
const caution    = m(0xf3c765);
const hazard     = m(0x2a2a2a);
const foam       = m(0xd4cfc4, { transparent: true, opacity: 0.75 });
const smoke      = m(0x555c56, { transparent: true, opacity: 0.35 });
const ember      = m(0xe29a4b, { emissive: 0x6a3a00, emissiveIntensity: 0.6 });
const glowRed    = m(0xff3333, { emissive: 0xff0000, emissiveIntensity: 0.8 });
const glowBlue   = m(0x318cca, { emissive: 0x073454, emissiveIntensity: 0.5 });
const glowGreen  = m(0x33cc55, { emissive: 0x00aa22, emissiveIntensity: 0.5 });
const metal      = m(0x9ba9a6, { metalness: 0.4, roughness: 0.4 });
const oxide      = m(0x866a58);
const scrap      = m(0x777d78);

// ── 1. STRETCHER ──────────────────────────────────────────────────────

/**
 * A folding stretcher with canvas bed, metal frame, wheels, and straps.
 * ~50 units long, ~10 units wide, ~12 units tall (raised).
 */
export function createStretcher() {
  const g = new THREE.Group();

  // Metal frame rails
  box(g, [52, 0.6, 0.6], steelMat, [0, 0, 5]);
  box(g, [52, 0.6, 0.6], steelMat, [0, 0, -5]);
  // Cross bars
  for (let x = -22; x <= 22; x += 11) {
    box(g, [0.5, 0.5, 10.6], steelMat, [x, 0, 0]);
  }
  // Canvas bed (slightly sagging look via two panels)
  box(g, [50, 0.3, 9], fabric, [0, 0.3, 0], [0.04, 0, 0]);
  // Head pillow
  box(g, [8, 1.2, 7], white, [-22, 1.0, 0]);
  // Straps (red webbing)
  for (let x = -10; x <= 10; x += 10) {
    box(g, [0.4, 0.15, 9.5], red, [x, 0.6, 0]);
  }
  // Wheels at foot end
  for (const z of [4, -4]) {
    const wheelGeo = new THREE.CylinderGeometry(1.8, 1.8, 0.8, 8);
    const wh = new THREE.Mesh(wheelGeo, black);
    wh.position.set(24, 0, z);
    wh.rotation.x = Math.PI / 2;
    wh.castShadow = true;
    g.add(wh);
  }
  // Handle at head end
  box(g, [0.5, 0.5, 12], darkSteel, [-26, 0, 0]);
  box(g, [0.5, 4, 0.5], darkSteel, [-26, 2, 5.5]);
  box(g, [0.5, 4, 0.5], darkSteel, [-26, 2, -5.5]);
  box(g, [0.5, 0.5, 11.5], darkSteel, [-26, 4, 0]);

  // Legs (folded supports)
  for (const x of [-18, 18]) {
    for (const z of [4.5, -4.5]) {
      box(g, [0.5, 0.5, 0.5], steelMat, [x, 0, z]);
    }
  }

  markShadows(g);
  return g;
}

// ── 2. MEDICAL BAG (Trauma Kit) ───────────────────────────────────────

/**
 * A paramedic's trauma bag — rectangular with handles, cross, and pockets.
 * ~12 × 8 × 10 units.
 */
export function createMedicalBag() {
  const g = new THREE.Group();

  // Main body
  box(g, [12, 8, 10], navy, [0, 4, 0]);
  // Top flap
  box(g, [12.4, 0.5, 10.4], darkRed, [0, 8.2, 0]);
  // Red cross on front
  cross(g, 0, 4.5, 5.1, 0.7);
  // Handles
  const handlePoints = [[-3, 8.2, 0], [-2, 10.5, 0], [2, 10.5, 0], [3, 8.2, 0]];
  const curve = new THREE.CatmullRomCurve3(handlePoints.map(p => new THREE.Vector3(...p)));
  const tubeGeo = new THREE.TubeGeometry(curve, 8, 0.35, 5, false);
  addMesh(g, tubeGeo, darkSteel, [0, 0, 0]);
  // Side pockets
  box(g, [0.4, 5, 7], darkRed, [6.2, 4, 0]);
  box(g, [0.4, 5, 7], darkRed, [-6.2, 4, 0]);
  // Buckles
  for (const z of [3, -3]) {
    box(g, [1.5, 1.5, 0.4], metal, [0, 6, z]);
  }
  // Zipper line
  box(g, [11.5, 0.2, 0.2], metal, [0, 8.0, 0]);

  markShadows(g);
  return g;
}

// ── 3. TRIAGE TABLE ───────────────────────────────────────────────────

/**
 * A folding field table with a white top and metal legs.
 * ~30 × 15 units, height 8 units.
 */
export function createTriageTable() {
  const g = new THREE.Group();

  // Table top
  box(g, [30, 0.8, 15], white, [0, 8, 0]);
  // Metal legs
  for (const x of [-13, 13]) {
    for (const z of [-6, 6]) {
      box(g, [0.6, 8, 0.6], steelMat, [x, 4, z]);
    }
  }
  // Cross brace
  box(g, [26, 0.4, 0.4], steelMat, [0, 2, 0]);
  box(g, [0.4, 0.4, 12], steelMat, [0, 2, 0]);

  markShadows(g);
  return g;
}

// ── 4. OXYGEN TANK ────────────────────────────────────────────────────

/**
 * A standing oxygen cylinder with regulator and hose.
 * ~6 diameter, ~20 tall.
 */
export function createOxygenTank() {
  const g = new THREE.Group();

  // Cylinder body
  cylinder(g, 3, 3, 18, teal, [0, 9, 0], 10);
  // Top cap
  cylinder(g, 2.5, 3, 2, darkSteel, [0, 19, 0], 10);
  // Valve
  box(g, [1.5, 3, 1.5], metal, [0, 20.5, 0]);
  // Regulator gauge
  cylinder(g, 1.2, 1.2, 0.6, white, [0, 21, 1.5], 8);
  box(g, [0.8, 0.8, 0.3], black, [0, 21, 1.9]);
  // Hose (curved tube)
  const hosePoints = [
    [0, 20, 2], [2, 18, 4], [4, 14, 5], [5, 10, 4], [4, 6, 3]
  ];
  const hoseCurve = new THREE.CatmullRomCurve3(hosePoints.map(p => new THREE.Vector3(...p)));
  const hoseGeo = new THREE.TubeGeometry(hoseCurve, 10, 0.3, 5, false);
  addMesh(g, hoseGeo, black, [0, 0, 0]);
  // Mask at end of hose
  box(g, [2.5, 1.5, 1.8], white, [4, 5.5, 3]);
  // Label band
  box(g, [6.2, 4, 0.3], white, [0, 12, 3.1]);
  labelPlane(g, 'O2', 4, 2, [0, 12, 3.3], '#248f8d');
  // Base ring
  cylinder(g, 3.3, 3.3, 0.6, darkSteel, [0, 0.3, 0], 10);

  markShadows(g);
  return g;
}

// ── 5. FIRST AID KIT (Wall-mounted box) ───────────────────────────────

/**
 * A red wall-mounted first aid cabinet with a white cross.
 * ~10 × 12 × 3 units.
 */
export function createFirstAidBox() {
  const g = new THREE.Group();

  box(g, [10, 12, 3], red, [0, 6, 0]);
  box(g, [9.5, 11.5, 0.3], darkRed, [0, 6, 1.6]);
  cross(g, 0, 6, 1.8, 1.0);
  // Hinges
  for (const y of [2, 10]) {
    box(g, [0.4, 0.4, 2], metal, [4.5, y, 0]);
  }
  // Handle
  box(g, [0.4, 2, 0.4], metal, [-3.5, 6, 1.8]);

  markShadows(g);
  return g;
}

// ── 6. EMERGENCY LIGHT (Flashing beacon) ──────────────────────────────

/**
 * A portable emergency light tower with a rotating beacon.
 * ~4 base, ~25 tall.
 */
export function createEmergencyLight(color = 'red') {
  const g = new THREE.Group();

  // Base
  cylinder(g, 3, 4, 2, black, [0, 1, 0], 8);
  // Pole
  cylinder(g, 0.5, 0.5, 20, steelMat, [0, 12, 0], 6);
  // Light housing
  cylinder(g, 2.5, 2, 4, black, [0, 23, 0], 8);
  // Lens
  const lensColor = color === 'red' ? glowRed : color === 'blue' ? glowBlue : glowGreen;
  cylinder(g, 2.2, 2.2, 0.5, lensColor, [0, 25.2, 0], 8);
  // Top cap
  cylinder(g, 1.5, 2.5, 1, black, [0, 26, 0], 8);
  // Solar panel on top
  box(g, [5, 0.3, 3], navy, [0, 26.8, 0]);

  // Point light for atmosphere
  const light = new THREE.PointLight(
    color === 'red' ? 0xff3333 : color === 'blue' ? 0x3388ff : 0x33cc55,
    2, 60
  );
  light.position.set(0, 25, 0);
  g.add(light);
  g.userData.light = light;

  markShadows(g);
  return g;
}

// ── 7. WARNING SIGN (Tripod-mounted) ──────────────────────────────────

/**
 * A caution sign on a tripod stand.
 */
export function createWarningSign(text = 'CAUTION') {
  const g = new THREE.Group();

  // Tripod legs
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const x = Math.cos(angle) * 3;
    const z = Math.sin(angle) * 3;
    cylinder(g, 0.2, 0.2, 14, darkSteel, [x, 7, z], 5);
  }
  // Sign board (diamond shape via rotated square)
  const board = box(g, [10, 10, 0.4], caution, [0, 16, 0]);
  board.rotation.z = Math.PI / 4;
  // Border
  const border = box(g, [10.4, 10.4, 0.2], hazard, [0, 16, 0]);
  border.rotation.z = Math.PI / 4;
  // Text
  labelPlane(g, text, 7, 2, [0, 16, 0.4], '#2a2a2a');

  markShadows(g);
  return g;
}

// ── 8. SAFETY BARRIER (Water-filled) ──────────────────────────────────

/**
 * A water-filled plastic safety barrier with reflective stripes.
 * ~20 × 10 units.
 */
export function createSafetyBarrier() {
  const g = new THREE.Group();

  // Main body (slightly tapered)
  box(g, [20, 8, 10], orange, [0, 5, 0]);
  // Top ridge
  box(g, [20.4, 0.8, 10.4], brightOrange, [0, 9.4, 0]);
  // Reflective stripes
  box(g, [20.2, 1.5, 0.3], reflective, [0, 5, 5.1]);
  box(g, [20.2, 1.5, 0.3], reflective, [0, 5, -5.1]);
  // End caps
  box(g, [0.4, 10, 10.4], brightOrange, [10.2, 5, 0]);
  box(g, [0.4, 10, 10.4], brightOrange, [-10.2, 5, 0]);
  // Interlock hooks
  box(g, [0.6, 2, 1.5], black, [10.5, 3, 3]);
  box(g, [0.6, 2, 1.5], black, [10.5, 3, -3]);
  box(g, [0.6, 2, 1.5], black, [-10.5, 3, 3]);
  box(g, [0.6, 2, 1.5], black, [-10.5, 3, -3]);

  markShadows(g);
  return g;
}

// ── 9. SCATTERED LUGGAGE ──────────────────────────────────────────────

/**
 * A piece of scattered luggage — suitcase, backpack, or bag.
 * @param {string} type - 'suitcase', 'backpack', or 'tote'
 */
export function createLuggage(type = 'suitcase') {
  const g = new THREE.Group();

  if (type === 'suitcase') {
    // Hard-shell suitcase
    const colors = [m(0x5a4a3a), m(0x3a4a5a), m(0x6a3a3a), m(0x4a5a3a)];
    const col = colors[Math.floor(Math.random() * colors.length)];
    box(g, [10, 7, 6], col, [0, 3.5, 0]);
    // Handle
    box(g, [0.4, 3, 0.4], darkSteel, [0, 7.5, 0]);
    box(g, [4, 0.4, 0.4], darkSteel, [0, 9, 0]);
    // Wheels
    for (const z of [2, -2]) {
      sphere(g, 0.6, black, [0, 0.6, z], 1);
    }
    // Zipper line
    box(g, [9.5, 0.2, 0.2], metal, [0, 7.1, 0]);
    // Strap
    box(g, [10.2, 0.8, 6.2], darkSteel, [0, 3.5, 0]);

  } else if (type === 'backpack') {
    // Soft backpack
    const colors = [m(0x3a3a4a), m(0x4a3a2a), m(0x2a4a3a)];
    const col = colors[Math.floor(Math.random() * colors.length)];
    box(g, [8, 10, 5], col, [0, 5, 0]);
    // Front pocket
    box(g, [6, 4, 0.4], m(0x2a2a3a), [0, 3, 2.7]);
    // Straps
    const sp1 = [[-2, 10, -2.5], [-2, 12, -4], [-2, 10, -5]];
    const c1 = new THREE.CatmullRomCurve3(sp1.map(p => new THREE.Vector3(...p)));
    addMesh(g, new THREE.TubeGeometry(c1, 6, 0.25, 4, false), m(0x2a2a3a), [0, 0, 0]);
    const sp2 = [[2, 10, -2.5], [2, 12, -4], [2, 10, -5]];
    const c2 = new THREE.CatmullRomCurve3(sp2.map(p => new THREE.Vector3(...p)));
    addMesh(g, new THREE.TubeGeometry(c2, 6, 0.25, 4, false), m(0x2a2a3a), [0, 0, 0]);
    // Top handle
    box(g, [3, 0.4, 0.4], m(0x2a2a3a), [0, 10.2, 0]);

  } else {
    // Tote bag / shopping bag
    const colors = [m(0xc4a882), m(0x82a4c4), m(0xa482c4)];
    const col = colors[Math.floor(Math.random() * colors.length)];
    box(g, [8, 6, 6], col, [0, 3, 0]);
    // Handles
    const hp1 = [[-2, 6, 0], [-2, 9, 0], [-2, 9.5, 0]];
    const ch1 = new THREE.CatmullRomCurve3(hp1.map(p => new THREE.Vector3(...p)));
    addMesh(g, new THREE.TubeGeometry(ch1, 6, 0.2, 4, false), m(0x5a4a3a), [0, 0, 0]);
    const hp2 = [[2, 6, 0], [2, 9, 0], [2, 9.5, 0]];
    const ch2 = new THREE.CatmullRomCurve3(hp2.map(p => new THREE.Vector3(...p)));
    addMesh(g, new THREE.TubeGeometry(ch2, 6, 0.2, 4, false), m(0x5a4a3a), [0, 0, 0]);
  }

  markShadows(g);
  return g;
}

// ── 10. DAMAGED RAILWAY PARTS ─────────────────────────────────────────

/**
 * A broken piece of railway infrastructure — rail segment, signal, or coupling.
 * @param {string} type - 'rail', 'signal', or 'coupling'
 */
export function createDamagedRailPart(type = 'rail') {
  const g = new THREE.Group();

  if (type === 'rail') {
    // Bent rail segment
    const points = [
      [-15, 0, 1], [-10, 0.5, 1.5], [-5, 1, 2], [0, 2, 2.5],
      [5, 3, 2], [10, 2.5, 1.5], [15, 1, 1]
    ];
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const railGeo = new THREE.TubeGeometry(curve, 16, 0.5, 6, false);
    addMesh(g, railGeo, steelMat, [0, 0, 0]);
    // Rail head (flat top)
    const headGeo = new THREE.TubeGeometry(curve, 16, 0.8, 6, false);
    addMesh(g, headGeo, darkSteel, [0, 0.5, 0]);
    // Sparks / damage marks
    for (let i = 0; i < 5; i++) {
      const t = Math.random();
      const pos = curve.getPoint(t);
      sphere(g, 0.3 + Math.random() * 0.4, ember, [pos.x, pos.y + 1, pos.z], 0);
    }

  } else if (type === 'signal') {
    // Fallen railway signal
    cylinder(g, 1, 1, 18, darkSteel, [0, 9, 0], 8);
    // Signal head
    box(g, [3, 8, 3], black, [0, 19, 0]);
    // Lights
    cylinder(g, 0.8, 0.8, 0.5, glowRed, [0, 21, 1.6], 8);
    cylinder(g, 0.8, 0.8, 0.5, glowGreen, [0, 18, 1.6], 8);
    cylinder(g, 0.8, 0.8, 0.5, caution, [0, 15, 1.6], 8);
    // Base plate
    box(g, [4, 0.5, 4], darkSteel, [0, 0.2, 0]);
    // Broken pole (angled)
    g.rotation.z = 0.6;

  } else {
    // Train coupling / buffer
    cylinder(g, 3, 3, 4, darkSteel, [0, 2, 0], 10);
    cylinder(g, 2, 3, 2, rust, [0, 4.5, 0], 10);
    // Hook mechanism
    box(g, [1, 3, 1], steelMat, [0, 6, 0]);
    box(g, [3, 1, 1], steelMat, [0, 7.5, 0]);
    // Buffer springs
    for (let i = 0; i < 3; i++) {
      cylinder(g, 1.5, 1.5, 0.4, steelMat, [0, 1 + i * 0.6, 0], 8);
    }
  }

  markShadows(g);
  return g;
}

// ── 11. DEBRIS PILE ───────────────────────────────────────────────────

/**
 * A cluster of scattered debris — twisted metal, broken wood, and fragments.
 */
export function createDebrisPile() {
  const g = new THREE.Group();
  const rand = seeded(Math.floor(Math.random() * 99999));

  const mats = [scrap, oxide, rust, darkSteel, wood, fabric];

  for (let i = 0; i < 18; i++) {
    const x = (rand() - 0.5) * 20;
    const y = (rand() - 0.5) * 16;
    const z = rand() * 3;
    const w = 1 + rand() * 5;
    const h = 0.5 + rand() * 2;
    const d = 0.5 + rand() * 2;
    const piece = box(g, [w, h, d], mats[Math.floor(rand() * mats.length)], [x, z + d / 2, y]);
    piece.rotation.z = rand() * Math.PI * 2;
    piece.rotation.x = (rand() - 0.5) * 0.5;
  }

  // A few larger twisted pieces
  for (let i = 0; i < 3; i++) {
    const x = (rand() - 0.5) * 14;
    const y = (rand() - 0.5) * 10;
    const z = 1 + rand() * 2;
    const piece = box(g, [3 + rand() * 4, 1 + rand() * 2, 1 + rand()], steelMat, [x, z, y]);
    piece.rotation.z = rand() * Math.PI;
    piece.rotation.y = rand() * Math.PI;
  }

  markShadows(g);
  return g;
}

// ── 12. EMERGENCY BLANKET (Thermal) ───────────────────────────────────

/**
 * A crumpled thermal emergency blanket on the ground.
 */
export function createEmergencyBlanket() {
  const g = new THREE.Group();

  // Main sheet (slightly crumpled via multiple panels)
  const sheetMat = m(0xd4a017, { metalness: 0.5, roughness: 0.3, side: THREE.DoubleSide });
  box(g, [14, 0.2, 10], sheetMat, [0, 0.3, 0], [0.05, 0.03, 0]);
  box(g, [10, 0.2, 8], sheetMat, [1, 0.5, -0.5], [-0.03, 0.05, 0.02]);
  // Folded edge
  box(g, [14.2, 0.15, 1.5], m(0xc49010, { metalness: 0.5, roughness: 0.3 }), [0, 0.2, 4.5]);

  markShadows(g);
  return g;
}

// ── 13. WATER CANISTER ────────────────────────────────────────────────

/**
 * A large water canister / jerry can.
 */
export function createWaterCanister() {
  const g = new THREE.Group();

  // Body
  box(g, [6, 8, 4], navy, [0, 4, 0]);
  // Rounded top
  box(g, [5.5, 0.5, 3.5], navy, [0, 8.2, 0]);
  // Handle
  const hp = [[-1.5, 8, 0], [-1.5, 10, 0], [1.5, 10, 0], [1.5, 8, 0]];
  const hc = new THREE.CatmullRomCurve3(hp.map(p => new THREE.Vector3(...p)));
  addMesh(g, new THREE.TubeGeometry(hc, 8, 0.25, 4, false), navy, [0, 0, 0]);
  // Cap
  cylinder(g, 0.8, 1, 1, white, [0, 8.8, 0], 6);
  // Label
  box(g, [5.6, 3, 0.2], white, [0, 5, 2.1]);
  labelPlane(g, 'WATER', 5, 1.5, [0, 5, 2.3], '#1b3646');

  markShadows(g);
  return g;
}

// ── 14. RADIO / COMMUNICATIONS GEAR ───────────────────────────────────

/**
 * A portable radio on a small tripod.
 */
export function createRadio() {
  const g = new THREE.Group();

  // Radio body
  box(g, [4, 5, 2.5], black, [0, 3, 0]);
  // Screen
  box(g, [3, 2, 0.2], glassMat, [0, 4, 1.35]);
  // Antenna
  cylinder(g, 0.15, 0.15, 8, darkSteel, [1.5, 9, 0], 5);
  sphere(g, 0.4, orange, [1.5, 13, 0], 1);
  // Buttons
  for (let i = 0; i < 3; i++) {
    cylinder(g, 0.3, 0.3, 0.2, metal, [-1 + i * 1.2, 1.5, 1.35], 6);
  }
  // Speaker grille
  for (let i = 0; i < 4; i++) {
    box(g, [2.5, 0.15, 0.1], darkSteel, [0, 1.2 + i * 0.35, 1.3]);
  }
  // Side handle
  box(g, [0.3, 4, 0.3], black, [2.2, 3, 0]);
  box(g, [0.3, 0.3, 1.5], black, [2.2, 5, 0]);

  markShadows(g);
  return g;
}

// ── 15. BLOODSTAIN / IMPACT MARK ──────────────────────────────────────

/**
 * A ground-level bloodstain or impact mark.
 */
export function createBloodstain() {
  const g = new THREE.Group();

  // Main stain (irregular shape via overlapping circles)
  const stainMat = m(0x5a1515, { transparent: true, opacity: 0.7 });
  addMesh(g,new THREE.CircleGeometry(3,13),stainMat,[0,0.15,0]).rotation.x=-Math.PI/2;
  addMesh(g,new THREE.CircleGeometry(2,11),stainMat,[1.5,0.16,1]).rotation.x=-Math.PI/2;
  addMesh(g,new THREE.CircleGeometry(1.5,9),stainMat,[-1,0.17,-0.5]).rotation.x=-Math.PI/2;
  // Drip marks
  const dripMat = m(0x4a1010, { transparent: true, opacity: 0.6 });
  sphere(g, 0.5, dripMat, [3, 0.1, 1.5], 0);
  sphere(g, 0.4, dripMat, [-2, 0.1, 2], 0);
  sphere(g, 0.6, dripMat, [2, 0.1, -1], 0);

  g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
  return g;
}

// ── 16. CONE (Enhanced) ───────────────────────────────────────────────

/**
 * An enhanced traffic cone with reflective bands.
 */
export function createCone() {
  const g = new THREE.Group();

  // Cone body
  const coneGeo = new THREE.ConeGeometry(2.5, 7, 8);
  const cone = new THREE.Mesh(coneGeo, brightOrange);
  cone.position.set(0, 3.5, 0);
  cone.castShadow = true;
  cone.receiveShadow = true;
  g.add(cone);
  // Reflective bands
  for (let i = 0; i < 2; i++) {
    const y = 2.5 + i * 2.5;
    const r = 2.5 * (1 - (y - 0) / 7);
    cylinder(g, r, r, 0.5, reflective, [0, y, 0], 8);
  }
  // Base
  cylinder(g, 3, 3, 0.5, black, [0, 0.25, 0], 8);

  return g;
}

// ── 17. CAUTION TAPE (Between two posts) ──────────────────────────────

/**
 * A length of caution tape strung between two posts.
 */
export function createCautionTape(length = 30) {
  const g = new THREE.Group();

  // Posts
  for (const x of [-length / 2, length / 2]) {
    cylinder(g, 0.4, 0.5, 8, darkSteel, [x, 4, 0], 6);
    sphere(g, 0.6, orange, [x, 8.3, 0], 1);
  }
  // Tape (sagging slightly)
  const points = [];
  const segments = 12;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = -length / 2 + t * length;
    const y = 6 - Math.sin(t * Math.PI) * 1.5;
    points.push(new THREE.Vector3(x, y, 0));
  }
  const tapeCurve = new THREE.CatmullRomCurve3(points);
  const tapeGeo = new THREE.TubeGeometry(tapeCurve, segments, 0.25, 4, false);
  addMesh(g, tapeGeo, caution, [0, 0, 0]);

  // "CAUTION" text repeated on tape
  for (let i = 0; i < Math.floor(length / 8); i++) {
    labelPlane(g, '⚠', 2, 1.5, [-length / 2 + 4 + i * 8, 6, 0.4], '#f3c765');
  }

  return g;
}

// ── 18. INJURED PERSON (Mannequin / Dummy) ────────────────────────────

/**
 * A simplified figure representing an injured person lying on the ground.
 */
export function createInjuredPerson() {
  const g = new THREE.Group();

  const clothColors = [
    { body: m(0x5a6a7a), pants: m(0x3a4a5a) },
    { body: m(0x7a5a5a), pants: m(0x4a3a3a) },
    { body: m(0x5a7a5a), pants: m(0x3a5a3a) },
  ];
  const cloth = clothColors[Math.floor(Math.random() * clothColors.length)];

  // Lying on back — body is along X axis
  // Torso
  box(g, [10, 4, 6], cloth.body, [0, 1, 0]);
  // Legs
  box(g, [14, 3.5, 5], cloth.pants, [8, 1, 0]);
  // Feet
  for (const z of [1.5, -1.5]) {
    box(g, [3, 2.5, 2], m(0x2a2a2a), [17, 0.5, z]);
  }
  // Head
  sphere(g, 2.2, skin, [-7, 2, 0], 1);
  // Arms (one raised, one at side)
  box(g, [5, 1.5, 1.5], cloth.body, [-2, 2.5, 4]);
  box(g, [5, 1.5, 1.5], cloth.body, [-2, 2.5, -4]);
  // Hands
  sphere(g, 1, skin, [0.5, 2.5, 4.5], 1);
  sphere(g, 1, skin, [0.5, 2.5, -4.5], 1);

  // Bandage on leg
  box(g, [3, 0.3, 4.5], white, [10, 2.8, 0]);

  // Already lying along X on local XZ ground plane.
  g.position.y = 0.5;

  markShadows(g);
  return g;
}

// ── 19. SMOKE / DUST CLOUD ────────────────────────────────────────────

/**
 * A semi-transparent smoke/dust cloud cluster.
 */
export function createSmokeCloud() {
  const g = new THREE.Group();
  const rand = seeded(Math.floor(Math.random() * 99999));

  const smokeMats = [
    m(0x555c56, { transparent: true, opacity: 0.25 }),
    m(0x6a6a60, { transparent: true, opacity: 0.18 }),
    m(0x4a4a44, { transparent: true, opacity: 0.3 }),
  ];

  for (let i = 0; i < 8; i++) {
    const r = 3 + rand() * 6;
    const sm = smokeMats[Math.floor(rand() * smokeMats.length)];
    sphere(g, r, sm, [
      (rand() - 0.5) * 10,
      3 + rand() * 8,
      (rand() - 0.5) * 10
    ], 1);
  }

  g.traverse(o => {
    if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; }
  });
  return g;
}

// ── 20. SPARKS / EMBERS ───────────────────────────────────────────────

/**
 * A cluster of glowing sparks/embers near wreckage.
 */
export function createSparks() {
  const g = new THREE.Group();
  const rand = seeded(Math.floor(Math.random() * 99999));

  for (let i = 0; i < 12; i++) {
    const r = 0.2 + rand() * 0.5;
    sphere(g, r, ember, [
      (rand() - 0.5) * 8,
      rand() * 4,
      (rand() - 0.5) * 8
    ], 0);
  }

  // Small point light for glow
  const light = new THREE.PointLight(0xe29a4b, 1.5, 25);
  light.position.set(0, 2, 0);
  g.add(light);
  g.userData.light = light;

  return g;
}

// ── 21. TARPS / TENTS (Makeshift) ─────────────────────────────────────

/**
 * A makeshift tarp shelter draped over debris.
 */
export function createMakeshiftTarp() {
  const g = new THREE.Group();

  // Support poles
  for (const [x, z] of [[-8, -5], [8, -5], [-8, 5], [8, 5]]) {
    cylinder(g, 0.3, 0.4, 10, wood, [x, 5, z], 5);
  }
  // Tarp (draped, slightly sagging)
  const tarpMat = Math.random() > 0.5 ? tarpGreen : tarpBlue;
  box(g, [18, 0.3, 12], tarpMat, [0, 9, 0], [0.08, 0, 0.05]);
  // Ropes / guy lines
  for (const [x, z] of [[-9, -6], [9, -6], [-9, 6], [9, 6]]) {
    const rp = [[x * 0.8, 9, z * 0.8], [x, 4, z]];
    const rc = new THREE.CatmullRomCurve3(rp.map(p => new THREE.Vector3(...p)));
    addMesh(g, new THREE.TubeGeometry(rc, 4, 0.1, 4, false), m(0x8a7a6a), [0, 0, 0]);
  }
  // Weights (stones) on corners
  for (const [x, z] of [[-9, -6], [9, -6], [-9, 6], [9, 6]]) {
    sphere(g, 0.8, m(0x7a7a70), [x, 0.5, z], 0);
  }

  markShadows(g);
  return g;
}

// ── 22. SCATTERED PAPERS / DOCUMENTS ──────────────────────────────────

/**
 * Papers scattered on the ground — tickets, documents, photos.
 */
export function createScatteredPapers() {
  const g = new THREE.Group();
  const rand = seeded(Math.floor(Math.random() * 99999));

  const paperMats = [
    m(0xfaf4e6, { side: THREE.DoubleSide }),
    m(0xe8e0cf, { side: THREE.DoubleSide }),
    m(0xd4cfc4, { side: THREE.DoubleSide }),
  ];

  for (let i = 0; i < 7; i++) {
    const w = 2 + rand() * 3;
    const h = 2 + rand() * 3;
    const paper = box(g, [w, 0.05, h], paperMats[Math.floor(rand() * paperMats.length)], [
      (rand() - 0.5) * 10,
      0.1 + rand() * 0.3,
      (rand() - 0.5) * 8
    ]);
    paper.rotation.z = rand() * Math.PI * 2;
    paper.rotation.x = (rand() - 0.5) * 0.15;
  }

  g.traverse(o => { if (o.isMesh) o.castShadow = false; });
  return g;
}

// ── 23. FLASHLIGHT ────────────────────────────────────────────────────

/**
 * A dropped flashlight on the ground.
 */
export function createFlashlight() {
  const g = new THREE.Group();

  // Body
  cylinder(g, 0.6, 0.7, 6, darkSteel, [0, 3, 0], 8);
  // Head
  cylinder(g, 0.9, 0.6, 1.5, metal, [0, 6.5, 0], 8);
  // Lens
  cylinder(g, 0.8, 0.8, 0.2, glassMat, [0, 7.3, 0], 8);
  // Tail cap
  cylinder(g, 0.7, 0.7, 0.5, black, [0, 0.2, 0], 8);
  // Grip rings
  for (let i = 0; i < 3; i++) {
    cylinder(g, 0.75, 0.75, 0.15, black, [0, 1.5 + i * 1.5, 0], 8);
  }

  // Light beam (cone)
  const beamMat = m(0xfff1d8, { transparent: true, opacity: 0.08, side: THREE.DoubleSide });
  const beamGeo = new THREE.ConeGeometry(4, 15, 8, 1, true);
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.set(0, 15, 0);
  g.add(beam);

  // Point light
  const light = new THREE.PointLight(0xfff1d8, 1, 30);
  light.position.set(0, 8, 0);
  g.add(light);
  g.userData.light = light;

  markShadows(g);
  return g;
}

// ── 24. HELMET (Dropped) ──────────────────────────────────────────────

/**
 * A dropped rescue helmet on the ground.
 */
export function createDroppedHelmet() {
  const g = new THREE.Group();

  const helmetColors = [m(0xe0e7df), m(0xf5a623), m(0xee7841)];
  const hColor = helmetColors[Math.floor(Math.random() * helmetColors.length)];

  // Dome (half sphere)
  const domeGeo = new THREE.SphereGeometry(3, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  addMesh(g, domeGeo, hColor, [0, 0, 0]);
  // Brim
  cylinder(g, 4, 3.5, 0.3, hColor, [0, 0.1, 0], 10);
  // Ridge
  box(g, [0.3, 2, 5], hColor, [0, 2, 0]);
  // Chin strap
  const sp = [[-2, 0.5, 2], [-2.5, -0.5, 3], [-2, -1, 2.5]];
  const sc = new THREE.CatmullRomCurve3(sp.map(p => new THREE.Vector3(...p)));
  addMesh(g, new THREE.TubeGeometry(sc, 6, 0.15, 4, false), black, [0, 0, 0]);

  // Badge / cross
  cross(g, 0, 1.5, 2.8, 0.35);

  g.rotation.x = Math.PI / 2; // Lying on side
  g.rotation.z = (Math.random() - 0.5) * 0.5;

  markShadows(g);
  return g;
}

// ── 25. IV STAND WITH BAG ─────────────────────────────────────────────

/**
 * An IV drip stand with a hanging fluid bag.
 */
export function createIVStand() {
  const g = new THREE.Group();

  // Base
  const baseGeo = new THREE.CylinderGeometry(3, 3.5, 0.5, 5);
  const base = new THREE.Mesh(baseGeo, darkSteel);
  base.position.set(0, 0.25, 0);
  // Cylinder is already Y-up in this asset's local space.
  base.castShadow = true;
  g.add(base);
  // Legs (star pattern)
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.cos(angle) * 3;
    const z = Math.sin(angle) * 3;
    box(g, [0.4, 0.4, 3], darkSteel, [x / 2, 0.25, z / 2]);
  }
  // Pole
  cylinder(g, 0.3, 0.3, 22, steelMat, [0, 11, 0], 6);
  // Hooks
  for (let i = 0; i < 3; i++) {
    const hookPoints = [[0, 20 + i * 1.5, 0.5], [0.8, 20 + i * 1.5 - 0.5, 0.5]];
    const hc = new THREE.CatmullRomCurve3(hookPoints.map(p => new THREE.Vector3(...p)));
    addMesh(g, new THREE.TubeGeometry(hc, 4, 0.1, 4, false), metal, [0, 0, 0]);
  }
  // IV bag
  box(g, [2.5, 4, 1.5], m(0xc8dce8, { transparent: true, opacity: 0.85 }), [0, 17, 0]);
  // Fluid inside
  box(g, [2.2, 2.5, 1.2], m(0x88ccee, { transparent: true, opacity: 0.6 }), [0, 16, 0]);
  // Tube
  const tp = [[0, 14.5, 0], [0.5, 12, 0.3], [0, 10, 0], [-0.3, 8, 0.2]];
  const tc = new THREE.CatmullRomCurve3(tp.map(p => new THREE.Vector3(...p)));
  addMesh(g, new THREE.TubeGeometry(tc, 8, 0.08, 4, false), m(0xc8dce8, { transparent: true, opacity: 0.7 }), [0, 0, 0]);

  markShadows(g);
  return g;
}

// ── 26. FIRE EXTINGUISHER ─────────────────────────────────────────────

/**
 * A fire extinguisher lying on the ground.
 */
export function createFireExtinguisher() {
  const g = new THREE.Group();

  // Body
  cylinder(g, 1.5, 1.5, 7, red, [0, 3.5, 0], 10);
  // Top
  cylinder(g, 1.2, 1.5, 1, darkRed, [0, 7.2, 0], 10);
  // Nozzle
  cylinder(g, 0.3, 0.4, 2, black, [0, 8.2, 0], 6);
  // Hose
  const hp = [[0, 8, 0.5], [0.5, 7.5, 1.5], [0.3, 6.5, 2]];
  const hc = new THREE.CatmullRomCurve3(hp.map(p => new THREE.Vector3(...p)));
  addMesh(g, new THREE.TubeGeometry(hc, 6, 0.2, 4, false), black, [0, 0, 0]);
  // Label
  box(g, [3.1, 2.5, 0.2], white, [0, 4, 1.55]);
  labelPlane(g, 'FIRE', 3, 1, [0, 4, 1.75], '#c93d38');

  g.rotation.z = Math.PI / 3; // Tilted on ground

  markShadows(g);
  return g;
}

// ── 27. TRASH / LITTER CLUSTER ────────────────────────────────────────

/**
 * Scattered litter — bottles, cans, wrappers.
 */
export function createLitterCluster() {
  const g = new THREE.Group();
  const rand = seeded(Math.floor(Math.random() * 99999));

  // Plastic bottles
  for (let i = 0; i < 3; i++) {
    const bg = new THREE.Group();
    cylinder(bg, 0.5, 0.6, 3, m(0x88aacc, { transparent: true, opacity: 0.6 }), [0, 1.5, 0], 6);
    cylinder(bg, 0.3, 0.5, 0.8, m(0x88aacc, { transparent: true, opacity: 0.6 }), [0, 3.4, 0], 6);
    cylinder(bg, 0.35, 0.35, 0.3, m(0xcc4444), [0, 3.9, 0], 6);
    bg.position.set((rand() - 0.5) * 12, 0, (rand() - 0.5) * 10);
    bg.rotation.z = rand() * Math.PI;
    bg.rotation.x = (rand() - 0.5) * 0.5;
    g.add(bg);
  }

  // Cans
  for (let i = 0; i < 2; i++) {
    cylinder(g, 0.6, 0.6, 1.5, m(0xcccccc, { metalness: 0.4 }), [
      (rand() - 0.5) * 10, 0.75, (rand() - 0.5) * 8
    ], 6);
  }

  // Wrappers (flat crumpled shapes)
  for (let i = 0; i < 4; i++) {
    box(g, [1 + rand() * 2, 0.05, 0.5 + rand()], m(0xd4cfc4, { side: THREE.DoubleSide }), [
      (rand() - 0.5) * 10, 0.08, (rand() - 0.5) * 8
    ]);
  }

  g.traverse(o => { if (o.isMesh) o.castShadow = false; });
  return g;
}

// ── 28. EMERGENCY PHONE / BOOTH ───────────────────────────────────────

/**
 * An emergency phone box / kiosk.
 */
export function createEmergencyPhone() {
  const g = new THREE.Group();

  // Post
  cylinder(g, 0.6, 0.8, 10, darkSteel, [0, 5, 0], 8);
  // Box
  box(g, [5, 6, 3], red, [0, 12, 0]);
  // Glass window
  box(g, [4, 4, 0.3], glassMat, [0, 12.5, 1.65]);
  // Phone handset
  box(g, [1.5, 0.5, 0.5], black, [0, 11, 1.8]);
  // Sign
  box(g, [6, 2, 0.3], white, [0, 16, 0]);
  labelPlane(g, 'SOS', 4, 1.5, [0, 16, 0.3], '#c93d38');
  // Roof
  box(g, [6, 0.4, 4], darkRed, [0, 17.2, 0]);

  markShadows(g);
  return g;
}

// ── 29. GENERATOR ─────────────────────────────────────────────────────

/**
 * A portable diesel generator.
 */
export function createGenerator() {
  const g = new THREE.Group();

  // Frame
  box(g, [14, 10, 8], darkSteel, [0, 5, 0]);
  // Engine housing
  box(g, [10, 8, 6], navy, [0, 5, 0]);
  // Exhaust pipe
  cylinder(g, 0.5, 0.5, 5, darkSteel, [7, 7, 0], 6);
  cylinder(g, 0.8, 0.5, 1, black, [9.5, 7, 0], 6);
  // Fuel tank
  box(g, [4, 3, 3], orange, [-5, 3, 0]);
  // Control panel
  box(g, [3, 2, 0.3], black, [0, 8, 3.15]);
  // Buttons
  cylinder(g, 0.2, 0.2, 0.2, glowRed, [-0.5, 8, 3.35], 6);
  cylinder(g, 0.2, 0.2, 0.2, glowGreen, [0.5, 8, 3.35], 6);
  // Wheels
  for (const z of [3, -3]) {
    cylinder(g, 1.2, 1.2, 0.6, black, [5, 1.2, z], 8);
  }
  // Handle
  box(g, [0.4, 0.4, 10], steelMat, [7, 8, 0]);

  markShadows(g);
  return g;
}

// ── 30. BARRICADE (Sandbags) ──────────────────────────────────────────

/**
 * A stack of sandbags forming a small barricade.
 */
export function createSandbagBarricade() {
  const g = new THREE.Group();

  const sandMat = m(0xb2a594);
  const sandMat2 = m(0xa89a84);

  // Bottom row
  for (let i = 0; i < 5; i++) {
    const bag = box(g, [5, 2, 3], i % 2 === 0 ? sandMat : sandMat2, [i * 4.5 - 9, 1, 0]);
    bag.rotation.y = (Math.random() - 0.5) * 0.1;
  }
  // Second row
  for (let i = 0; i < 4; i++) {
    const bag = box(g, [5, 2, 3], i % 2 === 0 ? sandMat2 : sandMat, [i * 4.5 - 6.75, 3, 0]);
    bag.rotation.y = (Math.random() - 0.5) * 0.1;
  }
  // Top row
  for (let i = 0; i < 3; i++) {
    const bag = box(g, [5, 2, 3], sandMat, [i * 4.5 - 4.5, 5, 0]);
    bag.rotation.y = (Math.random() - 0.5) * 0.1;
  }

  markShadows(g);
  return g;
}

// ── SCENE COMPOSERS ───────────────────────────────────────────────────

/**
 * Create a triage station — a complete area with table, supplies, and signage.
 */
export function createTriageStation() {
  const g = new THREE.Group();

  const table = createTriageTable();
  table.position.set(0, 0, 0);
  g.add(table);

  // Medical supplies on table
  const medBag = createMedicalBag();
  medBag.position.set(-8, 8.5, 2);
  g.add(medBag);

  const o2 = createOxygenTank();
  o2.position.set(8, 0, -3);
  g.add(o2);

  const iv = createIVStand();
  iv.position.set(10, 0, 5);
  g.add(iv);

  const faBox = createFirstAidBox();
  faBox.position.set(-10, 8.5, -2);
  g.add(faBox);

  // Sign
  const sign = createWarningSign('TRIAGE');
  sign.position.set(0, 0, -12);
  g.add(sign);

  // Emergency light
  const light = createEmergencyLight('red');
  light.position.set(-15, 0, -8);
  g.add(light);

  return g;
}

/**
 * Create a debris field — scattered wreckage, luggage, and environmental details.
 */
export function createDebrisField() {
  const g = new THREE.Group();
  const rand = seeded(7777);

  // Main debris pile
  const pile = createDebrisPile();
  pile.position.set(0, 0, 0);
  g.add(pile);

  // Damaged rail parts
  const rail = createDamagedRailPart('rail');
  rail.position.set(15, 0, 8);
  rail.rotation.y = rand() * Math.PI;
  g.add(rail);

  const signal = createDamagedRailPart('signal');
  signal.position.set(-12, 0, -5);
  g.add(signal);

  // Scattered luggage
  const luggageTypes = ['suitcase', 'backpack', 'tote'];
  for (let i = 0; i < 5; i++) {
    const type = luggageTypes[Math.floor(rand() * luggageTypes.length)];
    const bag = createLuggage(type);
    bag.position.set((rand() - 0.5) * 30, 0, (rand() - 0.5) * 25);
    bag.rotation.z = rand() * Math.PI * 2;
    bag.rotation.x = (rand() - 0.5) * 0.3;
    g.add(bag);
  }

  // Papers
  const papers = createScatteredPapers();
  papers.position.set(5, 0, -8);
  g.add(papers);

  // Litter
  const litter = createLitterCluster();
  litter.position.set(-8, 0, 10);
  g.add(litter);

  // Dropped helmet
  const helmet = createDroppedHelmet();
  helmet.position.set(10, 0, -12);
  g.add(helmet);

  // Flashlight
  const flashlight = createFlashlight();
  flashlight.position.set(-5, 0, 12);
  flashlight.rotation.z = Math.PI / 2;
  flashlight.rotation.y = rand() * Math.PI;
  g.add(flashlight);

  // Bloodstain
  const blood = createBloodstain();
  blood.position.set(3, 0, 5);
  g.add(blood);

  // Sparks
  const sparks = createSparks();
  sparks.position.set(-3, 0, -3);
  g.add(sparks);

  return g;
}

/**
 * Create a full emergency scene — combines all prop categories into a cohesive
 * accident scene layout around the railway wreckage.
 */
export function createEmergencyScene() {
  const g = new THREE.Group();
  const rand = seeded(4242);

  // ── Triage area (near ambulance) ──
  const triage = createTriageStation();
  triage.position.set(-80, 0, -90);
  triage.rotation.y = Math.PI / 6;
  g.add(triage);

  // ── Debris field (near wreckage) ──
  const debris = createDebrisField();
  debris.position.set(60, 0, 50);
  g.add(debris);

  // ── Stretchers ──
  for (let i = 0; i < 3; i++) {
    const stretcher = createStretcher();
    stretcher.position.set(-70 + i * 15, 0, -75 + rand() * 10);
    stretcher.rotation.y = rand() * 0.5;
    g.add(stretcher);
  }

  // ── Emergency blankets ──
  for (let i = 0; i < 2; i++) {
    const blanket = createEmergencyBlanket();
    blanket.position.set(-60 + i * 20, 0, -65 + rand() * 8);
    blanket.rotation.y = rand() * Math.PI;
    g.add(blanket);
  }

  // ── Injured persons ──
  for (let i = 0; i < 2; i++) {
    const person = createInjuredPerson();
    person.position.set(-55 + i * 18, 0, -60 + rand() * 12);
    person.rotation.y = rand() * Math.PI * 2;
    g.add(person);
  }

  // ── Safety barriers ──
  for (let i = 0; i < 4; i++) {
    const barrier = createSafetyBarrier();
    barrier.position.set(30 + i * 22, 0, 90);
    barrier.rotation.y = 0.15;
    g.add(barrier);
  }

  // ── Cones ──
  const conePositions = [
    [20, 75], [40, 85], [60, 70], [80, 90],
    [100, 78], [120, 88], [-30, 80], [-50, 72]
  ];
  conePositions.forEach(([x, y]) => {
    const cone = createCone();
    cone.position.set(x, 0, y);
    g.add(cone);
  });

  // ── Caution tape ──
  const tape = createCautionTape(50);
  tape.position.set(50, 0, 95);
  tape.rotation.y = 0.2;
  g.add(tape);

  // ── Smoke clouds ──
  for (let i = 0; i < 3; i++) {
    const smoke = createSmokeCloud();
    smoke.position.set(50 + i * 25, 0, 40 + rand() * 30);
    g.add(smoke);
  }

  // ── Makeshift tarp shelter ──
  const tarp = createMakeshiftTarp();
  tarp.position.set(-100, 0, 60);
  tarp.rotation.y = rand() * 0.5;
  g.add(tarp);

  // ── Fire extinguisher ──
  const extinguisher = createFireExtinguisher();
  extinguisher.position.set(90, 0, 65);
  g.add(extinguisher);

  // ── Sandbag barricade ──
  const sandbags = createSandbagBarricade();
  sandbags.position.set(130, 0, 80);
  sandbags.rotation.y = Math.PI / 4;
  g.add(sandbags);

  // ── Generator ──
  const generator = createGenerator();
  generator.position.set(-120, 0, -80);
  g.add(generator);

  // ── Emergency phone ──
  const phone = createEmergencyPhone();
  phone.position.set(-40, 0, 100);
  g.add(phone);

  // ── Water canisters ──
  for (let i = 0; i < 3; i++) {
    const water = createWaterCanister();
    water.position.set(-95 + i * 8, 0, -100);
    water.rotation.z = (rand() - 0.5) * 0.3;
    g.add(water);
  }

  // ── Radio ──
  const radio = createRadio();
  radio.position.set(-85, 0, -85);
  g.add(radio);

  // ── Additional emergency lights ──
  const blueLight = createEmergencyLight('blue');
  blueLight.position.set(-60, 0, -100);
  g.add(blueLight);

  const greenLight = createEmergencyLight('green');
  greenLight.position.set(100, 0, 95);
  g.add(greenLight);

  return g;
}


/**
 * Export all individual prop creators for selective use.
 */
export const RESCUE_PROPS = {
  stretcher: createStretcher,
  medicalBag: createMedicalBag,
  triageTable: createTriageTable,
  oxygenTank: createOxygenTank,
  firstAidBox: createFirstAidBox,
  emergencyLight: createEmergencyLight,
  warningSign: createWarningSign,
  safetyBarrier: createSafetyBarrier,
  luggage: createLuggage,
  damagedRailPart: createDamagedRailPart,
  debrisPile: createDebrisPile,
  emergencyBlanket: createEmergencyBlanket,
  waterCanister: createWaterCanister,
  radio: createRadio,
  bloodstain: createBloodstain,
  cone: createCone,
  cautionTape: createCautionTape,
  injuredPerson: createInjuredPerson,
  smokeCloud: createSmokeCloud,
  sparks: createSparks,
  makeshiftTarp: createMakeshiftTarp,
  scatteredPapers: createScatteredPapers,
  flashlight: createFlashlight,
  droppedHelmet: createDroppedHelmet,
  ivStand: createIVStand,
  fireExtinguisher: createFireExtinguisher,
  litterCluster: createLitterCluster,
  emergencyPhone: createEmergencyPhone,
  generator: createGenerator,
  sandbagBarricade: createSandbagBarricade,
  // Scene composers
  triageStation: createTriageStation,
  debrisField: createDebrisField,
  emergencyScene: createEmergencyScene,
};
