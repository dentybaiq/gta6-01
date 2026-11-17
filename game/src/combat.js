// Combat: fists on foot, a pistol aimed with the mouse, bullets, thugs who
// fight back, and cash/ammo/health pickups that drop on the street.
import { PLAYER } from './config.js';
import { mulberry32, range, pick } from './rng.js';

export function createCombat(seed) {
  return {
    rand: mulberry32(seed),
    bullets: [],
    thugs: [],
    pickups: [],
    shootCooldown: 0,
    punchCooldown: 0,
    muzzle: 0,
  };
}

export function spawnThug(combat, x, y) {
  const thug = {
    x, y,
    vx: 0, vy: 0,
    hp: 60,
    angle: range(combat.rand, 0, Math.PI * 2),
    speed: 130,
    attackCooldown: 0,
    state: 'idle', // idle | chase | down
    color: pick(combat.rand, ['#6d6875', '#3a3a3a', '#7f4f24']),
    cash: 120,
  };
  combat.thugs.push(thug);
  return thug;
}

export function spawnPickup(combat, x, y, kind, amount) {
  combat.pickups.push({
    x, y, kind, // 'cash' | 'ammo' | 'health'
    amount: amount || (kind === 'cash' ? 80 : kind === 'ammo' ? 12 : 30),
    bob: 0,
    life: 45,
  });
}

export function fireBullet(combat, x, y, angle) {
  combat.bullets.push({
    x, y,
    vx: Math.cos(angle) * 900,
    vy: Math.sin(angle) * 900,
    life: 0.9,
  });
  combat.shootCooldown = 0.28;
  combat.muzzle = 0.07;
}

// A punch: a short arc in front of the player that hurts thugs and peds.
export function punch(combat, player, onHit) {
  combat.punchCooldown = PLAYER.punchCooldown;
  const px = player.x + Math.cos(player.angle) * 30;
  const py = player.y + Math.sin(player.angle) * 30;
  let hitAnything = false;
  for (const thug of combat.thugs) {
    if (thug.state === 'down') continue;
    if (Math.hypot(thug.x - px, thug.y - py) < PLAYER.punchRange) {
      thug.hp -= PLAYER.punchDamage;
      thug.vx = Math.cos(player.angle) * 220;
      thug.vy = Math.sin(player.angle) * 220;
      hitAnything = true;
      if (thug.hp <= 0) {
        thug.state = 'down';
        spawnPickup(combat, thug.x, thug.y, 'cash', thug.cash);
        onHit('thugDown', thug);
      }
    }
  }
  return hitAnything;
}

export function updateCombat(combat, dt, player, city, onEvent) {
  combat.shootCooldown = Math.max(0, combat.shootCooldown - dt);
  combat.punchCooldown = Math.max(0, combat.punchCooldown - dt);
  combat.muzzle = Math.max(0, combat.muzzle - dt);

  for (const b of combat.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    // Hit a thug?
    for (const thug of combat.thugs) {
      if (thug.state === 'down') continue;
      if (Math.hypot(thug.x - b.x, thug.y - b.y) < 20) {
        thug.hp -= 25;
        b.life = 0;
        if (thug.hp <= 0) {
          thug.state = 'down';
          spawnPickup(combat, thug.x, thug.y, 'cash', thug.cash);
          onEvent('thugDown', thug);
        }
        break;
      }
    }
    // Hit a building? Stop the bullet.
    if (b.life > 0) {
      for (const building of city.buildings) {
        if (b.x > building.x && b.x < building.x + building.w && b.y > building.y && b.y < building.y + building.h) {
          b.life = 0;
          break;
        }
      }
    }
  }
  combat.bullets = combat.bullets.filter((b) => b.life > 0);

  // Thugs chase the player when close and swing when in range.
  for (const thug of combat.thugs) {
    if (thug.state === 'down') continue;
    thug.attackCooldown -= dt;
    const dx = player.x - thug.x;
    const dy = player.y - thug.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < 420 && !player.inCar) {
      thug.state = 'chase';
      thug.angle = Math.atan2(dy, dx);
      thug.vx = (dx / dist) * thug.speed;
      thug.vy = (dy / dist) * thug.speed;
    } else if (thug.state === 'chase' && dist > 520) {
      thug.state = 'idle';
    }
    if (thug.state === 'chase') {
      thug.x += thug.vx * dt;
      thug.y += thug.vy * dt;
      if (dist < 34 && thug.attackCooldown <= 0) {
        thug.attackCooldown = 0.9;
        onEvent('playerHit', { damage: 9 });
      }
    } else {
      // Idle thugs wander a little.
      thug.x += Math.cos(thug.angle) * 12 * dt;
      thug.y += Math.sin(thug.angle) * 12 * dt;
    }
  }

  for (const p of combat.pickups) {
    p.bob += dt * 4;
    p.life -= dt;
    const d = Math.hypot(p.x - player.x, p.y - player.y);
    if (d < 34 && !player.inCar) {
      p.taken = true;
      onEvent('pickup', p);
    }
  }
  combat.pickups = combat.pickups.filter((p) => !p.taken && p.life > 0);
}
