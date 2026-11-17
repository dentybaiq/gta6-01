// Traffic cars that follow the road grid and pedestrians who stroll the
// sidewalks — and flee when a crime happens near them.
import { WORLD, ROAD_WIDTH, CAR_MODELS, PALETTE } from './config.js';
import { mulberry32, pick, range, intRange } from './rng.js';
import { roadCenters, randomRoadPoint } from './city.js';

const LANE = ROAD_WIDTH / 2 - 16; // lane offset from a road centre line

export function createTraffic(seed) {
  return {
    rand: mulberry32(seed),
    cars: [],
    peds: [],
  };
}

export function spawnTrafficCar(traffic, x, y) {
  const rand = traffic.rand;
  const model = pick(rand, CAR_MODELS);
  const centers = roadCenters();
  let axis;
  let lane;
  let dir;
  if (x !== undefined) {
    // Place on the nearest road, driving along it.
    let best = Infinity;
    let bestAxis = 'h';
    for (const c of centers) {
      if (Math.abs(c - y) < best) { best = Math.abs(c - y); bestAxis = 'h'; }
      if (Math.abs(c - x) < best) { best = Math.abs(c - x); bestAxis = 'v'; }
    }
    axis = bestAxis;
    if (axis === 'h') { y = centers.reduce((a, c) => (Math.abs(c - y) < Math.abs(a - y) ? c : a)); lane = (rand() < 0.5 ? -1 : 1) * LANE; dir = lane < 0 ? 1 : -1; }
    else { x = centers.reduce((a, c) => (Math.abs(c - x) < Math.abs(a - x) ? c : a)); lane = (rand() < 0.5 ? -1 : 1) * LANE; dir = lane < 0 ? 1 : -1; }
  } else {
    axis = rand() < 0.5 ? 'h' : 'v';
    const c = pick(rand, centers);
    lane = (rand() < 0.5 ? -1 : 1) * LANE;
    dir = lane < 0 ? 1 : -1;
    if (axis === 'h') { x = range(rand, 80, WORLD - 80); y = c + lane; }
    else { x = c + lane; y = range(rand, 80, WORLD - 80); }
  }
  const car = {
    x, y, axis, dir,
    speed: range(rand, 90, 170),
    baseSpeed: 0,
    model,
    color: pick(rand, PALETTE.carColors),
    angle: axis === 'h' ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2),
    stopped: 0,
  };
  car.baseSpeed = car.speed;
  traffic.cars.push(car);
  return car;
}

export function spawnPedestrian(traffic, x, y) {
  const rand = traffic.rand;
  const ped = {
    x: x !== undefined ? x : range(rand, 120, WORLD - 120),
    y: y !== undefined ? y : range(rand, 120, WORLD - 120),
    vx: 0, vy: 0,
    speed: range(rand, 28, 55),
    angle: range(rand, 0, Math.PI * 2),
    color: pick(rand, PALETTE.carColors),
    skin: pick(rand, ['#e8b98a', '#c98d5f', '#8a5a3b', '#f2c9a0']),
    flee: 0,
    wander: range(rand, 1, 4),
    bob: rand() * 10,
  };
  traffic.peds.push(ped);
  return ped;
}

// Keep the streets alive: traffic near the player, peds everywhere on foot paths.
export function maintainPopulation(traffic, px, py, wantCars, wantPeds) {
  while (traffic.cars.length < wantCars) {
    const p = randomRoadPoint(traffic.rand, px, py, 500);
    spawnTrafficCar(traffic, p.x, p.y);
  }
  while (traffic.peds.length < wantPeds) {
    const p = randomRoadPoint(traffic.rand, px, py, 260);
    spawnPedestrian(traffic, p.x, p.y);
  }
  // Recycle far-away traffic so the count stays bounded.
  traffic.cars = traffic.cars.filter((c) => Math.hypot(c.x - px, c.y - py) < 1600);
  traffic.peds = traffic.peds.filter((p) => Math.hypot(p.x - px, p.y - py) < 1400);
}

function carAhead(traffic, car, dist) {
  for (const other of traffic.cars) {
    if (other === car) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const along = car.axis === 'h' ? dx * car.dir : dy * car.dir;
    const side = car.axis === 'h' ? Math.abs(dy) : Math.abs(dx);
    if (along > 0 && along < dist && side < 30) return true;
  }
  return false;
}

export function updateTraffic(traffic, dt, player, time) {
  const centers = roadCenters();
  for (const car of traffic.cars) {
    // Slow down for the car ahead; stop at a player car blocking the lane.
    const blocked = carAhead(traffic, car, 90);
    let target = car.baseSpeed;
    if (blocked) target = 0;
    if (player.inCar) {
      const dx = player.car.x - car.x;
      const dy = player.car.y - car.y;
      const along = car.axis === 'h' ? dx * car.dir : dy * car.dir;
      const side = car.axis === 'h' ? Math.abs(dy) : Math.abs(dx);
      if (along > 0 && along < 110 && side < 34) target = 0;
    }
    car.speed += (target - car.speed) * Math.min(1, dt * 2.5);
    const step = car.speed * dt;
    if (car.axis === 'h') car.x += step * car.dir;
    else car.y += step * car.dir;

    // At an intersection, sometimes turn onto the crossing road.
    const near = centers.find((c) => Math.abs((car.axis === 'h' ? car.x : car.y) - c) < 14);
    if (near !== undefined && traffic.rand() < 0.35 * dt * 10 && car.speed > 40) {
      const turn = traffic.rand();
      if (turn < 0.3) {
        if (car.axis === 'h') {
          car.axis = 'v';
          car.y = near + (traffic.rand() < 0.5 ? -LANE : LANE);
          car.dir = car.y - near < 0 ? 1 : -1;
          car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        } else {
          car.axis = 'h';
          car.x = near + (traffic.rand() < 0.5 ? -LANE : LANE);
          car.dir = car.x - near < 0 ? 1 : -1;
          car.angle = car.dir > 0 ? 0 : Math.PI;
        }
      }
    }
    if (car.x < 60 || car.x > WORLD - 60 || car.y < 60 || car.y > WORLD - 60) {
      car.dead = true;
    }
  }
  traffic.cars = traffic.cars.filter((c) => !c.dead);

  for (const ped of traffic.peds) {
    ped.bob += dt * 6;
    ped.wander -= dt;
    if (ped.flee > 0) {
      ped.flee -= dt;
      const dx = ped.x - player.x;
      const dy = ped.y - player.y;
      const d = Math.hypot(dx, dy) || 1;
      ped.vx = (dx / d) * 150;
      ped.vy = (dy / d) * 150;
    } else {
      if (ped.wander <= 0) {
        ped.wander = range(traffic.rand, 2, 6);
        ped.angle = range(traffic.rand, 0, Math.PI * 2);
      }
      ped.vx = Math.cos(ped.angle) * ped.speed;
      ped.vy = Math.sin(ped.angle) * ped.speed;
    }
    ped.x += ped.vx * dt;
    ped.y += ped.vy * dt;
    // Peds stay on the pavement: drift back toward the nearest road edge.
    const onRoad = centers.some((c) => Math.abs(ped.x - c) < ROAD_WIDTH / 2 || Math.abs(ped.y - c) < ROAD_WIDTH / 2);
    if (!onRoad && ped.flee <= 0) {
      ped.angle += Math.PI * 0.5 * dt;
    }
    ped.x = Math.max(40, Math.min(WORLD - 40, ped.x));
    ped.y = Math.max(40, Math.min(WORLD - 40, ped.y));
  }
}

// Every pedestrian within `radius` of (x, y) runs away.
export function scarePeds(traffic, x, y, radius) {
  for (const ped of traffic.peds) {
    if (Math.hypot(ped.x - x, ped.y - y) < radius) ped.flee = 2.5;
  }
}

export function removePed(traffic, ped) {
  const i = traffic.peds.indexOf(ped);
  if (i >= 0) traffic.peds.splice(i, 1);
}
