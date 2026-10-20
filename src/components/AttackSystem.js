import * as THREE from 'three';

// --- Configurable constants (base values; difficulty scaling adjusts at runtime) ---
const BASE_RESCUE_COOLDOWN = 1000; // base milliseconds between rescue actions
const BASE_RESCUE_RADIUS = 30;     // base radius on XY plane to detect civilians for rescue
const VISUAL_DURATION = 400;       // how long the yellow circle stays visible (ms)

// Runtime difficulty-adjusted values (updated each frame from main.js)
let currentRescueCooldown = BASE_RESCUE_COOLDOWN;
let currentRescueRadius = BASE_RESCUE_RADIUS;

/**
 * Build the yellow circle visual effect for a rescue action.
 * Placed on the XY ground plane at Z = 0.25, centred at the player's position.
 * @param {number} x - player X position
 * @param {number} y - player Y position
 * @returns {THREE.Mesh} the circle mesh
 */
function createRescueVisual(x, y, radius) {
  const geo = new THREE.CircleGeometry(radius, 32);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide
  });
  const circle = new THREE.Mesh(geo, mat);
  // CircleGeometry lies in the XY plane by default — rotate to lie flat on XY for Z-up
  circle.rotation.x = 0;
  circle.rotation.y = 0;
  circle.position.set(x, y, 0.25);
  return circle;
}

export default function createAttackSystem() {
  let cooldownTimer = 0;
  let visualMesh = null;
  let visualTimer = 0;
  let currentRescueRadius = BASE_RESCUE_RADIUS; // local copy for triggerAttack

  return {
    /**
     * Trigger a rescue action if cooldown has expired.
     * Detects civilians within RESCUE_RADIUS and removes them.
     * @param {THREE.Scene} scene
     * @param {number} playerX - paramedic X position
     * @param {number} playerY - paramedic Y position
     * @param {Array} enemies - the active enemies array (mutated: rescued civilians removed)
     * @returns {boolean} true if rescue was triggered
     */
    triggerAttack(scene, playerX, playerY, enemies) {
      if (cooldownTimer > 0) return { rescued: 0 };

      // Start cooldown with current difficulty-adjusted value
      cooldownTimer = currentRescueCooldown;

      // Show visual feedback — remove previous visual if still present
      if (visualMesh) {
        scene.remove(visualMesh);
        visualMesh.geometry.dispose();
        visualMesh.material.dispose();
      }
      visualMesh = createRescueVisual(playerX, playerY, currentRescueRadius);
      visualTimer = VISUAL_DURATION;
      scene.add(visualMesh);

      // Detect and remove civilians within rescue radius
      let rescued = 0;
      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const dx = enemy.position.x - playerX;
        const dy = enemy.position.y - playerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= currentRescueRadius) {
          // Remove from scene and tracking array
          scene.remove(enemy);
          enemies.splice(i, 1);
          rescued++;
        }
      }

      return { rescued };
    },

    /**
     * Update cooldown timer and visual effect fade-out.
     * Call every frame with delta time in milliseconds.
     * @param {THREE.Scene} scene
     * @param {number} deltaMs - milliseconds since last call
     */
    update(scene, deltaMs) {
      // Decrease cooldown
      if (cooldownTimer > 0) {
        cooldownTimer = Math.max(0, cooldownTimer - deltaMs);
      }

      // Fade out visual effect
      if (visualMesh && visualTimer > 0) {
        visualTimer -= deltaMs;
        const opacity = Math.max(0, (visualTimer / VISUAL_DURATION) * 0.6);
        visualMesh.material.opacity = opacity;

        if (visualTimer <= 0) {
          scene.remove(visualMesh);
          visualMesh.geometry.dispose();
          visualMesh.material.dispose();
          visualMesh = null;
        }
      }
    },

    /**
     * Check whether the rescue action is available (cooldown expired).
     * @returns {boolean}
     */
    isReady() {
      return cooldownTimer <= 0;
    },

    /**
     * Reset cooldown timer (used on game restart).
     */
    resetCooldown() {
      cooldownTimer = 0;
    },

    /**
     * Update difficulty-adjusted parameters from the main loop.
     * @param {number} rescueCooldown - current rescue cooldown in ms
     * @param {number} rescueRadius - current rescue radius
     */
    setDifficultyParams(rescueCooldown, rescueRadius) {
      currentRescueCooldown = rescueCooldown;
      currentRescueRadius = rescueRadius;
    }
  };
}
