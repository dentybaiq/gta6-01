// Wanted stars and the Solara Bay police: patrol cars spawn at the city edge,
// chase the player, ram their car, and bust them if they can hold them still.
import { WORLD, WANTED, CAR } from './config.js';
import { mulberry32, range, pick } from './rng.js';
import { randomRoadPoint } from './city.js';

export function createPolice(seed) {
  return {
    rand: mulberry32(seed),
    cops: [],
    wanted: 0,
    sinceCrime: 999,
    evadeTimer: 0,
    bustTimer: 0,
    heat: 0, // 0..1, how "seen" the player is — drives star decay
  };
}

export function addWanted(police, stars, reason) {
  police.wanted = Math.min(WANTED.max, police.wanted + stars);
  police.sinceCrime = 0;
  police.evadeTimer = 0;
  police.heat = 1;
  return reason;
}

export function spawnCop(police, px, py) {
  const p = randomRoadPoint(police.rand, px, py, 700);
  const cop = {
    x: p.x, y: p.y,
    vx: 0, vy: 0,
    angle: Math.atan2(py - p.y, px - p.x),
    speed: 0,
    maxSpeed: 560 + police.wanted * 22,
    sirenPhase: range(police.rand, 0, 1),
    ramCooldown: 0,
    stuck: 0,
  };
  police.cops.push(cop);
  return cop;
}

export function updatePolice(police, dt, player, city, onBusted, audio) {
  police.sinceCrime += dt;
  const want = police.wanted;
  const targetCops = want === 0 ? 0 : Math.min(1 + want, 6);
  while (police.cops.length < targetCops) spawnCop(police, player.x, player.y);
  if (police.cops.length > targetCops) police.cops.splice(targetCops);

  // Wanted decay: only after a quiet spell, and only while no cop is close.
  if (want > 0) {
    const nearest = police.cops.reduce((m, c) => Math.min(m, Math.hypot(c.x - player.x, c.y - player.y)), Infinity);
    if (police.sinceCrime > WANTED.decayDelay && nearest > 700) {
      police.evadeTimer += dt;
      if (police.evadeTimer >= WANTED.decayInterval) {
        police.wanted -= 1;
        police.evadeTimer = 0;
        police.sinceCrime = WANTED.decayDelay; // keep decaying
      }
    } else {
      police.evadeTimer = 0;
    }
  }

  const playerSpeed = player.inCar ? Math.hypot(player.car.vx, player.car.vy) : Math.hypot(player.vx, player.vy);
  let touchingCop = false;

  for (const cop of police.cops) {
    cop.ramCooldown -= dt;
    const dx = player.x - cop.x;
    const dy = player.y - cop.y;
    const dist = Math.hypot(dx, dy) || 1;
    const desired = Math.atan2(dy, dx);
    // Steer toward the player with a little wobble so pursuit looks alive.
    let diff = desired - cop.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cop.angle += Math.max(-3.2 * dt, Math.min(3.2 * dt, diff * 4 * dt));
    cop.speed += ((cop.maxSpeed - cop.speed) * Math.min(1, dt * 1.2));
    cop.vx = Math.cos(cop.angle) * cop.speed;
    cop.vy = Math.sin(cop.angle) * cop.speed;
    cop.x += cop.vx * dt;
    cop.y += cop.vy * dt;
    cop.x = Math.max(40, Math.min(WORLD - 40, cop.x));
    cop.y = Math.max(40, Math.min(WORLD - 40, cop.y));

    // Ram the player's car: shove it and slow it down.
    if (player.inCar && dist < 52 && cop.ramCooldown <= 0) {
      cop.ramCooldown = 0.7;
      player.car.vx += (dx / dist) * -160;
      player.car.vy += (dy / dist) * -160;
      player.car.speed *= 0.82;
      if (audio) audio.crash();
    }
    // On foot, a cop that catches the player starts the bust clock.
    if (!player.inCar && dist < 44) {
      touchingCop = true;
      if (playerSpeed < 60) {
        police.bustTimer += dt;
      } else {
        police.bustTimer = Math.max(0, police.bustTimer - dt * 2);
      }
    }
    // A cop ramming a slow car can also bust the driver.
    if (player.inCar && dist < 50 && playerSpeed < 40) {
      touchingCop = true;
      police.bustTimer += dt * 0.8;
    }
  }

  if (!touchingCop) police.bustTimer = Math.max(0, police.bustTimer - dt * 1.5);
  if (police.bustTimer >= WANTED.bustTime) {
    police.bustTimer = 0;
    police.wanted = 0;
    police.cops = [];
    onBusted();
  }
}

export function clearPolice(police) {
  police.cops = [];
  police.wanted = 0;
  police.bustTimer = 0;
  police.sinceCrime = 999;
}
