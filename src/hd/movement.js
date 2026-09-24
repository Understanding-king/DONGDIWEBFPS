// Distances are metres; yaw uses Three.js's right-handed Y rotation.
const FIXED_STEP = 1 / 120;
const MAX_FRAME = 0.25;
const RADIUS = 0.38;
const STAND_HEIGHT = 1.78;
const CROUCH_HEIGHT = 1.18;
const GRAVITY = 16.8;
const JUMP_SPEED = 5.35;
const RUN_SPEED = 5.8;
const WALK_SPEED = 2.65;
const CROUCH_SPEED = 2.35;
const GROUND_ACCEL = 10;
const AIR_ACCEL = 10;
const AIR_WISH_CAP = 0.7;
const GROUND_FRICTION = 6;
const STOP_SPEED = 2;
const JUMP_BUFFER = 0.12;
const STEP_HEIGHT = 0.42;
const EPSILON = 1e-6;
const SUPPORT_EPSILON = 0.002;

export function createMovement(collision = {}) {
  const solids = normalizeSolids(collision.solids || collision.blockers || []);
  const floorY = finite(collision.floorY, 0);
  const position = { x: 0, y: floorY, z: 0 };
  const velocity = { x: 0, y: 0, z: 0 };
  let grounded = false;
  let crouch = false;
  let jumpQueued = 0;
  let accumulator = 0;
  let lastJump = false;
  let yaw = 0;

  const api = {
    position,
    velocity,
    get speed() { return Math.hypot(velocity.x, velocity.z); },
    get grounded() { return grounded; },
    get crouch() { return crouch; },
    update(dt = 0, input = {}) {
      accumulator += clamp(finite(dt, 0), 0, MAX_FRAME);
      if (input.jump && !lastJump) jumpQueued = JUMP_BUFFER;
      lastJump = Boolean(input.jump);
      yaw = finite(input.yaw, yaw);
      while (accumulator + EPSILON >= FIXED_STEP) {
        step(input);
        accumulator = Math.max(0, accumulator - FIXED_STEP);
      }
      return api;
    },
    reset(next = {}) {
      position.x = finite(next.x ?? collision.spawn?.x, 0);
      position.y = Math.max(floorY, finite(next.y ?? collision.spawn?.y, floorY));
      position.z = finite(next.z ?? collision.spawn?.z, 0);
      velocity.x = velocity.y = velocity.z = 0;
      crouch = false;
      grounded = hasSupport();
      jumpQueued = 0;
      lastJump = false;
      accumulator = 0;
      yaw = 0;
      return api;
    }
  };

  function hasSupport() {
    if (Math.abs(position.y - floorY) <= SUPPORT_EPSILON) return true;
    return solids.some((solid) => Math.abs(position.y - solid.maxY) <= SUPPORT_EPSILON
      && circleContact(position.x, position.z, solid));
  }

  function canOccupy(x, y, z, height) {
    return !solids.some((solid) => verticalOverlap(y, height, solid) && circleContact(x, z, solid));
  }

  function step(input) {
    if (input.crouch) crouch = true;
    else if (!crouch || canOccupy(position.x, position.y, position.z, STAND_HEIGHT)) crouch = false;
    const height = crouch ? CROUCH_HEIGHT : STAND_HEIGHT;
    grounded = velocity.y <= 0 && hasSupport();

    // Consume a rising-edge request before friction. Holding Space never queues
    // another jump; a timed press just before landing survives in simulation time.
    if (jumpQueued > 0 && grounded) {
      velocity.y = JUMP_SPEED;
      grounded = false;
      jumpQueued = 0;
    }

    if (grounded) {
      const speed = Math.hypot(velocity.x, velocity.z);
      if (speed > 0) {
        const nextSpeed = Math.max(0, speed - Math.max(speed, STOP_SPEED) * GROUND_FRICTION * FIXED_STEP);
        velocity.x *= nextSpeed / speed;
        velocity.z *= nextSpeed / speed;
      }
    }

    const forward = clamp(finite(input.forward, 0), -1, 1);
    const strafe = clamp(finite(input.strafe, 0), -1, 1);
    const length = Math.hypot(forward, strafe);
    if (length > EPSILON) {
      const f = forward / length;
      const s = strafe / length;
      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);
      const wishX = -sin * f + cos * s;
      const wishZ = -cos * f - sin * s;
      const wishSpeed = (crouch ? CROUCH_SPEED : input.walk ? WALK_SPEED : RUN_SPEED) * Math.min(1, length);
      const projected = velocity.x * wishX + velocity.z * wishZ;
      const addSpeed = (grounded ? wishSpeed : Math.min(AIR_WISH_CAP, wishSpeed)) - projected;
      if (addSpeed > 0) {
        const amount = Math.min(addSpeed, (grounded ? GROUND_ACCEL : AIR_ACCEL) * wishSpeed * FIXED_STEP);
        velocity.x += wishX * amount;
        velocity.z += wishZ * amount;
      }
    }

    moveHorizontal(height);
    velocity.y -= GRAVITY * FIXED_STEP;
    moveVertical(height);
    jumpQueued = Math.max(0, jumpQueued - FIXED_STEP);
  }

  function moveHorizontal(height) {
    // Substeps also prevent a high-speed player from crossing a thin wall.
    const count = Math.max(1, Math.ceil(Math.hypot(velocity.x, velocity.z) * FIXED_STEP / (RADIUS * 0.5)));
    const dt = FIXED_STEP / count;
    for (let substep = 0; substep < count; substep += 1) {
      position.x += velocity.x * dt;
      position.z += velocity.z * dt;
      for (let pass = 0; pass < 6; pass += 1) {
        let blocked = false;
        for (const solid of solids) {
          if (!verticalOverlap(position.y, height, solid)) continue;
          const contact = circleContact(position.x, position.z, solid);
          if (!contact) continue;
          const stepUp = solid.maxY - position.y;
          if (grounded && stepUp > EPSILON && stepUp <= STEP_HEIGHT
            && canOccupy(position.x, solid.maxY, position.z, height)) {
            position.y = solid.maxY;
            continue;
          }
          position.x += contact.x * (contact.depth + EPSILON);
          position.z += contact.z * (contact.depth + EPSILON);
          const intoWall = velocity.x * contact.x + velocity.z * contact.z;
          if (intoWall < 0) {
            velocity.x -= contact.x * intoWall;
            velocity.z -= contact.z * intoWall;
          }
          blocked = true;
        }
        if (!blocked) break;
      }
    }
  }

  function moveVertical(height) {
    const oldY = position.y;
    const nextY = oldY + velocity.y * FIXED_STEP;
    if (velocity.y <= 0) {
      let landing = floorY;
      for (const solid of solids) {
        // Use the whole swept foot segment, including falls spanning a box top.
        if (solid.maxY <= oldY + SUPPORT_EPSILON && solid.maxY >= nextY - EPSILON
          && solid.maxY > landing && circleContact(position.x, position.z, solid)) landing = solid.maxY;
      }
      if (nextY <= landing) {
        position.y = landing;
        velocity.y = 0;
        grounded = true;
        return;
      }
    } else {
      let ceiling = Infinity;
      for (const solid of solids) {
        if (solid.minY >= oldY + height - EPSILON && solid.minY <= nextY + height
          && circleContact(position.x, position.z, solid)) ceiling = Math.min(ceiling, solid.minY);
      }
      if (ceiling !== Infinity) {
        position.y = ceiling - height;
        velocity.y = 0;
        grounded = false;
        return;
      }
    }
    position.y = nextY;
    grounded = false;
  }

  return api.reset();
}

function normalizeSolids(source) {
  return source.map((solid) => {
    const min = solid.min || [solid.minX, solid.minY ?? 0, solid.minZ];
    const max = solid.max || [solid.maxX, solid.maxY, solid.maxZ];
    const minX = finite(min[0], 0);
    const minY = finite(min[1], 0);
    const minZ = finite(min[2], 0);
    const maxX = finite(max[0], 0);
    const maxY = finite(max[1], 0);
    const maxZ = finite(max[2], 0);
    const angle = solid.shape === 'obb' ? finite(solid.rotationY, 0) : 0;
    return {
      cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2,
      hx: (maxX - minX) / 2, hz: (maxZ - minZ) / 2,
      minY, maxY, cos: Math.cos(angle), sin: Math.sin(angle)
    };
  }).filter((solid) => solid.hx > 0 && solid.hz > 0 && solid.maxY > solid.minY);
}

function verticalOverlap(y, height, solid) {
  return y < solid.maxY - EPSILON && y + height > solid.minY + EPSILON;
}

function circleContact(x, z, solid) {
  const dx = x - solid.cx;
  const dz = z - solid.cz;
  // Inverse Three.js rotation: world-to-local, never the OBB's enclosing AABB.
  const lx = solid.cos * dx - solid.sin * dz;
  const lz = solid.sin * dx + solid.cos * dz;
  let nx = lx - clamp(lx, -solid.hx, solid.hx);
  let nz = lz - clamp(lz, -solid.hz, solid.hz);
  const distance = Math.hypot(nx, nz);
  let depth;
  if (distance >= RADIUS - EPSILON) return null;
  if (distance > EPSILON) {
    nx /= distance;
    nz /= distance;
    depth = RADIUS - distance;
  } else if (solid.hx - Math.abs(lx) < solid.hz - Math.abs(lz)) {
    nx = lx < 0 ? -1 : 1;
    nz = 0;
    depth = RADIUS + solid.hx - Math.abs(lx);
  } else {
    nx = 0;
    nz = lz < 0 ? -1 : 1;
    depth = RADIUS + solid.hz - Math.abs(lz);
  }
  return {
    x: solid.cos * nx + solid.sin * nz,
    z: -solid.sin * nx + solid.cos * nz,
    depth
  };
}

function finite(value, fallback) { return Number.isFinite(Number(value)) ? Number(value) : fallback; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
