import * as THREE from 'three';
import './style.css';
import './field-command.css';
import './start-screen.css';
import createCamera from './components/Camera.js';
import createRenderer from './components/Renderer.js';
import createPlayer from './components/Player.js';
import { createRescueDressing } from './components/RescueDressing.js';
import createInputHandler from './components/InputHandler.js';
import { createMap } from './components/Map.js';
import { createRailIncident } from './components/RailwayScene.js';
import { createObstacle, OBSTACLE_TYPES } from './components/Obstacle.js';
import { validateMovement, PLAYER_RADIUS } from './components/Collision.js';
import { createTriageScene } from './components/TriageScene.js';
import { applyComicOutline } from './components/ComicStyle.js';
import { createStartScreen } from './components/StartScreen.js';

// --- Style 7 direction: moody night rescue scene with emergency contrast. ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x081018);
scene.fog = new THREE.Fog(0x081018, 420, 1120);

const skyFill = new THREE.HemisphereLight(0x163447, 0x071015, 0.42);
scene.add(skyFill);
const sun = new THREE.DirectionalLight(0xcfe1ff, 0.78);
sun.position.set(-220, -160, 330);
sun.target.position.set(40, 48, 0);
scene.add(sun.target);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -350;
sun.shadow.camera.right = 350;
sun.shadow.camera.top = 350;
sun.shadow.camera.bottom = -350;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 950;
sun.shadow.normalBias = 0.055;
sun.shadow.bias = -0.00018;
sun.shadow.radius = 2;
scene.add(sun);
const bounce = new THREE.DirectionalLight(0x5b86aa, 0.22);
bounce.position.set(150, 120, 140);
scene.add(bounce);
const ambientMist = new THREE.PointLight(0x2d6a9a, 9, 360, 2);
ambientMist.position.set(20, 30, 90);
scene.add(ambientMist);

// One Z-up environment root. New art does not change the gameplay state machine.
const mapGroup = createMap();
scene.add(mapGroup);
const {wagonGroup} = createRailIncident(scene);
// Extra low-poly equipment by Junie (visual only; deliberately no extra collision obstacles).
const rescueDressing = createRescueDressing(scene);

const obstacleGroups = [];
const ambulance = createObstacle(OBSTACLE_TYPES.AMBULANCE);
ambulance.position.set(-65,-104,.2);
ambulance.rotation.z = Math.PI / 12;
scene.add(ambulance);
obstacleGroups.push(ambulance);

const tent = createObstacle(OBSTACLE_TYPES.TENT);
tent.position.set(-131,99,.2);
tent.rotation.z = -Math.PI/2;
scene.add(tent);
obstacleGroups.push(tent);

const container = createObstacle(OBSTACLE_TYPES.CONTAINER);
container.position.set(165,-112,.2);
container.rotation.z = -Math.PI/7;
scene.add(container);
obstacleGroups.push(container);

const emergencyRed = new THREE.PointLight(0xff5a48, 18, 220, 2);
emergencyRed.position.set(-54, -98, 34);
scene.add(emergencyRed);
const emergencyBlue = new THREE.PointLight(0x4db9ff, 18, 220, 2);
emergencyBlue.position.set(-73, -110, 34);
scene.add(emergencyBlue);
const triageLight = new THREE.PointLight(0x8ee2ff, 13, 220, 2);
triageLight.position.set(-128, 99, 28);
scene.add(triageLight);
const wreckGlow = new THREE.PointLight(0xff8b3d, 16, 180, 2);
wreckGlow.position.set(110, 65, 24);
scene.add(wreckGlow);

const triageFloodA = new THREE.SpotLight(0xe6f4ff, 1500, 340, Math.PI / 5.2, 0.42, 1.7);
triageFloodA.position.set(-188, 132, 96);
triageFloodA.target.position.set(-145, 104, 0);
triageFloodA.castShadow = false;
scene.add(triageFloodA, triageFloodA.target);
const triageFloodB = new THREE.SpotLight(0xbfdfff, 1100, 290, Math.PI / 5.6, 0.46, 1.6);
triageFloodB.position.set(-82, 142, 88);
triageFloodB.target.position.set(-134, 102, 0);
scene.add(triageFloodB, triageFloodB.target);
const wreckFlood = new THREE.SpotLight(0xffc483, 980, 250, Math.PI / 5.3, 0.52, 1.7);
wreckFlood.position.set(150, 30, 82);
wreckFlood.target.position.set(95, 60, 5);
scene.add(wreckFlood, wreckFlood.target);

applyComicOutline(ambulance, { thickness: 0.06, color: 0x0b1620 });
applyComicOutline(tent, { thickness: 0.05, color: 0x0d1620 });
applyComicOutline(container, { thickness: 0.05, color: 0x0d1620 });
applyComicOutline(wagonGroup, { thickness: 0.045, color: 0x101722 });

// --- Player + decoupled damped tactical follow camera ---
const { group: player, model, state } = createPlayer();
scene.add(player);
applyComicOutline(player, { thickness: 0.058, color: 0x0a141d });
const camera = createCamera();
scene.add(camera);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});
const renderer = createRenderer();
const inputHandler = createInputHandler();

// --- Core HUD: preserved from Visual Overhaul 2.0 ---
const scoreDiv = document.createElement('div');
scoreDiv.className = 'score';
scoreDiv.innerHTML = '<div class="score-kicker">MISSION / SCORE</div><div class="score-line"><strong>0</strong><small>PTS</small></div><span class="score-annotation">MASCAL — LIVE DATA</span>';
document.body.appendChild(scoreDiv);
const header = document.createElement('div');
header.className = 'mission-head';
header.innerHTML = '<span class="mission-mark">M</span><div class="brand-lockup"><b>MASCAL</b><small>CRITICAL DECISIONS · MISSION 01 · NIGHT OPS</small></div><span class="mission-brand-divider" aria-hidden="true"></span><span class="status-dot">LIVE <i aria-hidden="true"></i> MISSION ACTIVE</span>';
document.body.appendChild(header);
const help = document.createElement('div');
help.className = 'controls-help';
help.innerHTML = `<div class="controls-title"><strong>CONTROLS</strong><button type="button" id="open-mission-guide" class="ops-help-button" aria-label="Open the guide and pause the game">HELP <kbd>H</kbd></button></div>
  <div class="control-grid">
    <span><kbd>WASD</kbd>Move</span><span><kbd>E</kbd>Assess / pick up</span>
    <span><kbd>1–4</kbd>Triage</span><span><kbd>T</kbd>STT band</span>
    <span><kbd>G</kbd>Medkit</span><span><kbd>F</kbd>HEMS</span>
  </div>`;
document.body.appendChild(help);

// --- Six patients, two autonomous teams, five-minute mission ---
const mission = createTriageScene(scene, player, inputHandler, state);
const onboarding = createStartScreen({ mission, inputHandler, helpButton: help.querySelector('#open-mission-guide') });
// Confirm the actual source version in DevTools and remove the pre-JS loading screen.
window.MASCAL_BUILD = 'EN-COMPETITION-2026-10-19';
document.getElementById('mascal-initial-load')?.remove();
console.info('[MASCAL] EN-COMPETITION-2026-10-19 · start screen enabled · refresh resets to round 1');
const clock = new THREE.Clock();
const directionMap = {
  forward: { x:0,y:1,rot:0 }, backward:{ x:0,y:-1,rot:Math.PI },
  left:{ x:-1,y:0,rot:Math.PI/2 }, right:{ x:1,y:0,rot:-Math.PI/2 },
};
const WALK_SPEED = 116; // world units per second, not per frame

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), .055);
  const direction = (onboarding.isBlocking() || inputHandler.isDisabled()) ? null : inputHandler.getHeldDirection();
  while (inputHandler.hasPending()) inputHandler.getNext(); // old queue not used for continuous walking
  state.isMoving = Boolean(direction) && mission.core.state.phase === 'playing';
  if (state.isMoving && directionMap[direction]) {
    const d = directionMap[direction];
    const distance = WALK_SPEED * delta;
    const nextX = player.position.x + d.x * distance;
    const nextY = player.position.y + d.y * distance;
    if (validateMovement(player.position.x, player.position.y, nextX, nextY,
      PLAYER_RADIUS, wagonGroup, [], obstacleGroups)) {
      player.position.set(nextX,nextY,0);
    }
    model.rotation.z = d.rot;
  }
  const time = clock.elapsedTime;
  model.userData.animate?.(time, state.isMoving, 0);
  const beaconPulse = Math.pow(0.5 + 0.5 * Math.sin(time * 8.2), 5);
  const bluePulse = Math.pow(0.5 + 0.5 * Math.sin(time * 8.2 + Math.PI), 5);
  emergencyRed.intensity = 12 + beaconPulse * 56;
  emergencyBlue.intensity = 10 + bluePulse * 52;
  triageLight.intensity = 10 + Math.sin(time * 1.7) * 1.4;
  wreckGlow.intensity = 12 + Math.sin(time * 2.5 + 0.7) * 2.4;
  triageFloodA.intensity = 1160 + Math.sin(time * 0.9) * 40;
  triageFloodB.intensity = 880 + Math.sin(time * 1.15 + 0.8) * 35;
  wreckFlood.intensity = 860 + Math.sin(time * 1.35 + 0.4) * 48;
  rescueDressing.update(time);
  if (!onboarding.isBlocking()) mission.render(delta, time);
  camera.userData.follow(player.position, delta);
  renderer.render(scene, camera);
});
