// The city of Solara Bay: a road grid, buildings inside every block, a central park,
// a beach and ocean along the south edge, and the collision / road helpers the
// traffic, police and missions all share.
import { WORLD, ROAD_EVERY, ROAD_WIDTH, ROAD_FIRST, PALETTE } from './config.js';
import { mulberry32, pick, range, intRange } from './rng.js';

export function roadCenters() {
  const centers = [];
  for (let c = ROAD_FIRST; c < WORLD; c += ROAD_EVERY) centers.push(c);
  return centers;
}

export function isOnRoad(x, y) {
  const half = ROAD_WIDTH / 2;
  for (const c of roadCenters()) {
    if (Math.abs(x - c) < half || Math.abs(y - c) < half) return true;
  }
  return false;
}

export function nearestRoadPoint(x, y) {
  const centers = roadCenters();
  let bx = centers[0];
  let by = centers[0];
  for (const c of centers) {
    if (Math.abs(c - x) < Math.abs(bx - x)) bx = c;
    if (Math.abs(c - y) < Math.abs(by - y)) by = c;
  }
  // Snap to whichever axis road is closer.
  if (Math.abs(bx - x) <= Math.abs(by - y)) return { x: bx, y, axis: 'v' };
  return { x, y: by, axis: 'h' };
}

export function generateCity(seed) {
  const rand = mulberry32(seed);
  const centers = roadCenters();
  const buildings = [];
  const trees = [];
  const parks = [];

  // Central park block (between roads 3 and 4, both axes).
  const parkBlock = { x: centers[3] + ROAD_WIDTH / 2 + 8, y: centers[3] + ROAD_WIDTH / 2 + 8, w: ROAD_EVERY - ROAD_WIDTH - 16, h: ROAD_EVERY - ROAD_WIDTH - 16 };
  parks.push(parkBlock);

  for (let i = 0; i < centers.length - 1; i += 1) {
    for (let j = 0; j < centers.length - 1; j += 1) {
      const x0 = centers[i] + ROAD_WIDTH / 2 + 10;
      const y0 = centers[j] + ROAD_WIDTH / 2 + 10;
      const w = ROAD_EVERY - ROAD_WIDTH - 20;
      const h = ROAD_EVERY - ROAD_WIDTH - 20;
      // Skip the park block and the beach strip (south edge).
      if (i === 3 && j === 3) continue;
      if (j === centers.length - 2) continue; // beach row, no buildings
      const count = intRange(rand, 1, 4);
      if (count === 1) {
        buildings.push(makeBuilding(rand, x0, y0, w, h));
      } else if (count === 2) {
        buildings.push(makeBuilding(rand, x0, y0, w / 2 - 8, h));
        buildings.push(makeBuilding(rand, x0 + w / 2 + 8, y0, w / 2 - 8, h));
      } else if (count === 3) {
        buildings.push(makeBuilding(rand, x0, y0, w / 2 - 8, h / 2 - 8));
        buildings.push(makeBuilding(rand, x0 + w / 2 + 8, y0, w / 2 - 8, h / 2 - 8));
        buildings.push(makeBuilding(rand, x0, y0 + h / 2 + 8, w, h / 2 - 8));
      } else {
        buildings.push(makeBuilding(rand, x0, y0, w / 2 - 8, h / 2 - 8));
        buildings.push(makeBuilding(rand, x0 + w / 2 + 8, y0, w / 2 - 8, h / 2 - 8));
        buildings.push(makeBuilding(rand, x0, y0 + h / 2 + 8, w / 2 - 8, h / 2 - 8));
        buildings.push(makeBuilding(rand, x0 + w / 2 + 8, y0 + h / 2 + 8, w / 2 - 8, h / 2 - 8));
      }
      // A few palm trees scattered in the block's gaps.
      const treeCount = intRange(rand, 2, 6);
      for (let t = 0; t < treeCount; t += 1) {
        trees.push({ x: range(rand, x0, x0 + w), y: range(rand, y0, y0 + h), r: range(rand, 7, 11) });
      }
    }
  }

  // Palm-lined beach: trees along the sand strip, ocean south of it.
  for (let x = 60; x < WORLD; x += 90) {
    trees.push({ x: x + range(rand, -20, 20), y: WORLD - 170 + range(rand, -14, 14), r: range(rand, 8, 12) });
  }

  return { buildings, trees, parks, centers, beachY: WORLD - 220, oceanY: WORLD - 120 };
}

function makeBuilding(rand, x, y, w, h) {
  return {
    x, y, w, h,
    roof: pick(rand, PALETTE.buildingRoofs),
    height: intRange(rand, 1, 3), // shadow depth / storeys
    lit: rand() < 0.5,
  };
}

// Circle-vs-buildings collision: returns the pushed-out position.
export function collideBuildings(city, x, y, radius) {
  let px = x;
  let py = y;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(px, b.x + b.w));
    const cy = Math.max(b.y, Math.min(py, b.y + b.h));
    const dx = px - cx;
    const dy = py - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 < 0.0001) {
        py = b.y - radius;
      } else {
        const d = Math.sqrt(d2);
        px = cx + (dx / d) * radius;
        py = cy + (dy / d) * radius;
      }
    }
  }
  return { x: px, y: py };
}

export function clampToWorld(x, y, margin) {
  return {
    x: Math.max(margin, Math.min(WORLD - margin, x)),
    y: Math.max(margin, Math.min(WORLD - margin, y)),
  };
}

// A random point on a road, optionally far from (fx, fy).
export function randomRoadPoint(rand, fx, fy, minDist) {
  const centers = roadCenters();
  for (let tries = 0; tries < 40; tries += 1) {
    const horizontal = rand() < 0.5;
    const c = pick(rand, centers);
    const along = range(rand, 120, WORLD - 120);
    const p = horizontal ? { x: along, y: c } : { x: c, y: along };
    if (fx === undefined || Math.hypot(p.x - fx, p.y - fy) >= (minDist || 0)) return p;
  }
  return { x: centers[4], y: centers[4] };
}
