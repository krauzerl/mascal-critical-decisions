import * as THREE from 'three';
import { createCivilianVisual } from './CharacterArt.js';
import { validateMovement, ENEMY_RADIUS, PLAYER_RADIUS } from './Collision.js';

// --- Configurable constants (base values; difficulty scaling adjusts at runtime) ---
const BASE_SPAWN_DELAY = 3000; // base milliseconds between spawns
const BASE_ENEMY_SPEED = 0.08; // base frame-rate-independent movement speed
const MAX_ENEMIES = 20;        // limit active civilians
const MAP_HALF = 900;          // spawn corners near the edge of the 2000×2000 ground
const STOP_DISTANCE = 8;       // minimum distance to the paramedic before stopping
const SEPARATION_DIST = 10;    // minimum distance between civilians on XY plane
const SEPARATION_STRENGTH = 0.05; // steering force to push apart overlapping civilians

// Runtime difficulty-adjusted values (updated each frame from main.js)
let currentSpawnDelay = BASE_SPAWN_DELAY;
let currentEnemySpeed = BASE_ENEMY_SPEED;

// Four spawn locations at the corners of the map
const spawnLocations = [
  { x: -MAP_HALF, y: -MAP_HALF },
  { x: MAP_HALF, y: -MAP_HALF },
  { x: -MAP_HALF, y: MAP_HALF },
  { x: MAP_HALF, y: MAP_HALF }
];

let spawnTimer = 0;
let spawnIndex = 0;

/** Spawn a visually distinct, rigged civilian; the old pursuit API is unchanged. */
function createCivilian() {
  const civilian = createCivilianVisual(Math.floor(Math.random() * 24));
  civilian.userData.lastX = null;
  civilian.userData.lastY = null;
  return civilian;
}

export default function createEnemySystem() {
  const enemies = [];

  return {
    enemies,

    /**
     * Periodically spawn a new civilian at one of the four map corners.
     * Stops spawning when the maximum number of active civilians is reached.
     * Uses an accumulated timer advanced by clock.getDelta() (seconds).
     * @param {THREE.Scene} scene
     * @param {number} deltaSeconds — seconds since the last call (from clock.getDelta())
     */
    updateSpawning(scene, deltaSeconds) {
      // Do not spawn if we've reached the limit
      if (enemies.length >= MAX_ENEMIES) {
        return;
      }

      spawnTimer += deltaSeconds * 1000; // convert seconds to ms for comparison
      if (spawnTimer >= currentSpawnDelay) {
        spawnTimer = 0;

        const loc = spawnLocations[spawnIndex % spawnLocations.length];
        spawnIndex++;

        const civilian = createCivilian();
        civilian.position.set(loc.x, loc.y, 0);
        scene.add(civilian);

        enemies.push(civilian);
      }
    },

    /**
     * Check if any enemy is within the Game Over contact distance of the player.
     * This check must happen BEFORE collision prevention blocks the movement,
     * so that contact still triggers Game Over.
     * Since STOP_DISTANCE prevents enemies from moving closer than 8 units,
     * and the combined collision radius is 7 (PLAYER_RADIUS + ENEMY_RADIUS),
     * we check if any enemy is within STOP_DISTANCE of the player — meaning
     * it has reached the point where it would contact the player if not blocked.
     * @param {number} playerX
     * @param {number} playerY
     * @returns {boolean} true if any enemy has reached the player's collision boundary
     */
    checkGameOver(playerX, playerY) {
      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        const dx = playerX - enemy.position.x;
        const dy = playerY - enemy.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < STOP_DISTANCE) return true;
      }
      return false;
    },

    /**
     * Move every enemy toward the paramedic's current XY position.
     * Apply separation steering so civilians don't overlap.
     * Stop near the paramedic at STOP_DISTANCE; resume if the paramedic moves away.
     * Validate movement against the wagon, obstacles, and other characters before moving.
     * Rotate each enemy to face the movement direction.
     * @param {number} playerX
     * @param {number} playerY
     * @param {THREE.Group} wagonGroup - the damaged wagon for collision checks
     * @param {Array<THREE.Group>} [obstacleGroups=[]] - obstacle groups (ambulance, tent, container)
     */
    updateMovement(playerX, playerY, wagonGroup, obstacleGroups = []) {
      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];

        // --- Direction toward the paramedic ---
        const dx = playerX - enemy.position.x;
        const dy = playerY - enemy.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Stop if within the minimum distance to the paramedic
        if (dist < STOP_DISTANCE) continue;

        // Normalised direction toward the player
        let moveX = dx / dist;
        let moveY = dy / dist;

        // --- Separation steering: push away from nearby civilians ---
        for (let j = 0; j < enemies.length; j++) {
          if (i === j) continue;

          const other = enemies[j];
          const sx = enemy.position.x - other.position.x;
          const sy = enemy.position.y - other.position.y;
          const sDist = Math.sqrt(sx * sx + sy * sy);

          if (sDist < SEPARATION_DIST && sDist > 0) {
            // Push away inversely proportional to distance
            const force = (SEPARATION_DIST - sDist) / SEPARATION_DIST * SEPARATION_STRENGTH;
            moveX += (sx / sDist) * force;
            moveY += (sy / sDist) * force;
          }
        }

        // Re-normalise the combined direction vector
        const moveDist = Math.sqrt(moveX * moveX + moveY * moveY);
        if (moveDist > 0) {
          moveX /= moveDist;
          moveY /= moveDist;
        }

        // --- Calculate intended new position ---
        const step = currentEnemySpeed * 20;
        const fromX = enemy.position.x;
        const fromY = enemy.position.y;
        const toX = fromX + moveX * step;
        const toY = fromY + moveY * step;

        // --- Build obstacle list: paramedic + other civilians ---
        const obstacles = [];
        obstacles.push({ x: playerX, y: playerY, radius: PLAYER_RADIUS });
        for (let j = 0; j < enemies.length; j++) {
          if (i === j) continue;
          obstacles.push({
            x: enemies[j].position.x,
            y: enemies[j].position.y,
            radius: ENEMY_RADIUS
          });
        }

        // --- Validate movement: skip if blocked by wagon, obstacles, or another character ---
        if (!validateMovement(fromX, fromY, toX, toY, ENEMY_RADIUS, wagonGroup, obstacles, obstacleGroups)) {
          continue;
        }

        // Apply movement
        enemy.position.x = toX;
        enemy.position.y = toY;

        // Rotate to face the movement direction (Z-up, rotation around Z axis)
        enemy.rotation.z = Math.atan2(moveX, moveY);
      }
    },


    /** Procedural limb animation does not change enemy positions or collision bounds. */
    updateVisuals(timeSeconds) {
      for (const enemy of enemies) {
        const lastX = enemy.userData.lastX;
        const lastY = enemy.userData.lastY;
        const moved = lastX !== null && Math.hypot(enemy.position.x-lastX, enemy.position.y-lastY) > 0.002;
        enemy.userData.animate?.(timeSeconds, moved);
        enemy.userData.lastX = enemy.position.x;
        enemy.userData.lastY = enemy.position.y;
      }
    },

    /**
     * Remove all civilians from the scene and reset spawning state.
     * Used for game restart.
     * @param {THREE.Scene} scene
     */
    clearEnemies(scene) {
      for (const enemy of enemies) {
        scene.remove(enemy);
      }
      enemies.length = 0;
      spawnTimer = 0;
      spawnIndex = 0;
    },

    /**
     * Update difficulty-adjusted parameters from the main loop.
     * @param {number} spawnDelay - current spawn delay in ms
     * @param {number} enemySpeed - current enemy movement speed
     */
    setDifficultyParams(spawnDelay, enemySpeed) {
      currentSpawnDelay = spawnDelay;
      currentEnemySpeed = enemySpeed;
    }
  };
}
