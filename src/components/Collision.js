import * as THREE from 'three';

// --- Configurable collision distances ---
const PLAYER_RADIUS = 4;    // paramedic half-width from model (torso 6 wide → radius 3, plus arms → 4)
const ENEMY_RADIUS = 3;     // civilian half-width from model (torso 5 wide → radius 2.5, plus arms → 3)
const WAGON_PADDING = 2;    // extra clearance around wagon geometry
const OBSTACLE_PADDING = 2; // extra clearance around obstacle geometry

/**
 * Compute an oriented bounding box (OBB) for any THREE.Group on the XY plane.
 * Uses the group's bounding box to determine half-extents, then applies rotation.
 * @param {THREE.Group} group - the object group
 * @param {number} padding - extra clearance around the geometry
 * @returns {Array<{x: number, y: number}>} 4 corner points in world space
 */
function getGroupOBB(group, padding = 0) {
  // Preferred: hand-authored local footprint for stylized models.
  // The previous implementation used Box3.setFromObject (already world-space)
  // and then rotated/transformed its corners a second time.
  const footprint = group.userData?.collisionSize;
  let hx,hy;
  if (footprint) {
    hx = footprint.x / 2 + padding;
    hy = footprint.y / 2 + padding;
  } else {
    const worldBox = new THREE.Box3().setFromObject(group);
    hx = worldBox.getSize(new THREE.Vector3()).x / 2 + padding;
    hy = worldBox.getSize(new THREE.Vector3()).y / 2 + padding;
  }
  const angle = footprint ? group.rotation.z : 0;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const corners=[];
  for (const [sx,sy] of [[-1,-1],[1,-1],[1,1],[-1,1]]) {
    const x=sx*hx,y=sy*hy;
    const px=x*cos-y*sin, py=x*sin+y*cos;
    corners.push({x:group.position.x+px,y:group.position.y+py});
  }
  return corners;
}

/**
 * Compute the wagon's oriented bounding box (OBB) corners on the XY plane.
 * Preserved for backward compatibility.
 */
function getWagonOBB(wagonGroup) {
  return getGroupOBB(wagonGroup, WAGON_PADDING);
}

/**
 * Check if a point (px, py) with a given radius is inside or touching an OBB.
 * Uses the separating axis theorem for a circle vs convex polygon.
 */
function circleIntersectsOBB(px, py, radius, corners) {
  // Inside the obstacle must count as a collision even if far from its edges.
  let inside = true;
  let side = null;
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i], b = corners[(i+1)%corners.length];
    const cross = (b.x-a.x)*(py-a.y)-(b.y-a.y)*(px-a.x);
    if (Math.abs(cross) < 1e-7) continue;
    const sign = Math.sign(cross);
    if (side === null) side = sign;
    else if (sign !== side) { inside = false; break; }
  }
  if (inside) return true;
  // For each edge of the polygon, find the closest point on the edge segment
  const n = corners.length;
  for (let i = 0; i < n; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % n];

    // Vector from a to b
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const eLenSq = ex * ex + ey * ey;

    // Project point onto edge, clamp to segment
    let t = eLenSq > 0 ? ((px - a.x) * ex + (py - a.y) * ey) / eLenSq : 0;
    t = Math.max(0, Math.min(1, t));

    const closestX = a.x + t * ex;
    const closestY = a.y + t * ey;

    const dx = px - closestX;
    const dy = py - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq <= radius * radius) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a circle at (cx, cy) with radius r overlaps another circle.
 */
function circleIntersectsCircle(cx1, cy1, r1, cx2, cy2, r2) {
  const dx = cx1 - cx2;
  const dy = cy1 - cy2;
  const minDist = r1 + r2;
  return dx * dx + dy * dy <= minDist * minDist;
}

/**
 * Validate intended XY movement.
 * Returns true if the movement is allowed (no collision), false if blocked.
 *
 * @param {number} fromX - starting X
 * @param {number} fromY - starting Y
 * @param {number} toX   - intended target X
 * @param {number} toY   - intended target Y
 * @param {number} radius - collision radius of the moving entity
 * @param {THREE.Group} wagonGroup - the wagon group for OBB check
 * @param {Array} characterObstacles - array of {x, y, radius} for other characters
 * @param {Array<THREE.Group>} [obstacleGroups=[]] - array of obstacle groups (ambulance, tent, container)
 * @returns {boolean}
 */
function validateMovement(fromX, fromY, toX, toY, radius, wagonGroup, characterObstacles, obstacleGroups = []) {
  // Check wagon collision at the target position
  const wagonOBB = getWagonOBB(wagonGroup);
  if (circleIntersectsOBB(toX, toY, radius, wagonOBB)) {
    return false;
  }

  // Check obstacle collisions at the target position
  for (const obstacleGroup of obstacleGroups) {
    const obstacleOBB = getGroupOBB(obstacleGroup, OBSTACLE_PADDING);
    if (circleIntersectsOBB(toX, toY, radius, obstacleOBB)) {
      return false;
    }
  }

  // Check character-vs-character collision at the target position
  for (const obs of characterObstacles) {
    if (circleIntersectsCircle(toX, toY, radius, obs.x, obs.y, obs.radius)) {
      return false;
    }
  }

  // Also check along the path: sample mid-point to avoid tunneling through thin obstacles
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;
  if (circleIntersectsOBB(midX, midY, radius, wagonOBB)) {
    return false;
  }
  for (const obstacleGroup of obstacleGroups) {
    const obstacleOBB = getGroupOBB(obstacleGroup, OBSTACLE_PADDING);
    if (circleIntersectsOBB(midX, midY, radius, obstacleOBB)) {
      return false;
    }
  }
  for (const obs of characterObstacles) {
    if (circleIntersectsCircle(midX, midY, radius, obs.x, obs.y, obs.radius)) {
      return false;
    }
  }

  return true;
}

export {
  PLAYER_RADIUS,
  ENEMY_RADIUS,
  OBSTACLE_PADDING,
  getWagonOBB,
  getGroupOBB,
  circleIntersectsOBB,
  circleIntersectsCircle,
  validateMovement
};
