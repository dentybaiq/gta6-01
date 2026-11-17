// Staged screenshot scenes behind ?shot=start|drive|chase|mission. Each one
// arranges the real game state deterministically — the same seed, the same
// placements — then the page renders exactly one frame of the live game, so
// every screenshot is a genuine render of the code that ships.
import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';
import { spawnCop } from './police.js';
import { spawnTrafficCar, spawnPedestrian } from './traffic.js';
import { WORLD, VIEW_W, VIEW_H } from './config.js';

function centreCamera(state) {
  state.cam.x = Math.max(-80, Math.min(WORLD - VIEW_W + 80, state.player.x - VIEW_W / 2));
  state.cam.y = Math.max(-80, Math.min(WORLD - VIEW_H + 80, state.player.y - VIEW_H / 2));
}

function placePlayerCar(state, x, y, angle, speed) {
  const car = state.parkedCars[0];
  car.x = x;
  car.y = y;
  car.angle = angle;
  car.speed = speed || 0;
  car.vx = Math.cos(angle) * (speed || 0);
  car.vy = Math.sin(angle) * (speed || 0);
  car.taken = true;
  car.parked = false;
  state.player.inCar = true;
  state.player.car = car;
  state.player.x = x;
  state.player.y = y;
  state.player.angle = angle;
  return car;
}

function ringTraffic(state, cx, cy) {
  // Deterministic traffic around a point: cars on the same road ahead and
  // behind, plus cross traffic on the intersecting road.
  const spots = [
    { x: cx + 260, y: cy, axis: 'h' },
    { x: cx - 320, y: cy, axis: 'h' },
    { x: cx + 480, y: cy, axis: 'h' },
    { x: cx, y: cy - 260, axis: 'v' },
    { x: cx, y: cy + 300, axis: 'v' },
    { x: cx - 140, y: cy + 48, axis: 'h' },
  ];
  for (const s of spots) spawnTrafficCar(state.traffic, s.x, s.y);
  const peds = [
    { x: cx + 90, y: cy + 70 },
    { x: cx - 60, y: cy - 80 },
    { x: cx + 200, y: cy - 70 },
    { x: cx - 220, y: cy + 80 },
  ];
  for (const p of peds) spawnPedestrian(state.traffic, p.x, p.y);
}

/**
 * Set `state` to the named scene and return the screen to draw and the time
 * to freeze at. Any unknown name is the title screen.
 */
export function stageShot(name, state, helpers) {
  const { beginMission, addWanted } = helpers;
  state.time = 12.4; // fixed sun angle, wave phase and marker pulse
  // The mission intro card would cover the middle of the frame — staged
  // shots show the action, so dismiss it right away.
  const beginQuiet = (index) => {
    beginMission(index);
    state.missionCardTimer = 0;
  };
  if (name === 'drive') {
    state.money = 150;
    beginQuiet(0);
    placePlayerCar(state, 1400, 1400, 0, 380);
    ringTraffic(state, 1400, 1400);
    centreCamera(state);
    return { screen: SCREEN_PLAY, time: 12.4 };
  }
  if (name === 'chase') {
    state.money = 620;
    state.missionIndex = 1;
    state.player.health = 88;
    state.player.ammo = 18;
    beginQuiet(1); // Hot Package: wanted heat + delivery marker on the HUD
    addWanted(state.police, 3, 'staged chase');
    placePlayerCar(state, 1400, 1000, 0, 430);
    ringTraffic(state, 1400, 1000);
    // Three pursuit cars closing in from behind and the side streets.
    const c1 = spawnCop(state.police, state.player.x, state.player.y);
    c1.x = 1180; c1.y = 1000; c1.angle = 0; c1.speed = 470;
    const c2 = spawnCop(state.police, state.player.x, state.player.y);
    c2.x = 1400; c2.y = 780; c2.angle = Math.PI / 2; c2.speed = 430;
    const c3 = spawnCop(state.police, state.player.x, state.player.y);
    c3.x = 1660; c3.y = 1060; c3.angle = Math.PI; c3.speed = 450;
    state.police.bustTimer = 0;
    centreCamera(state);
    return { screen: SCREEN_PLAY, time: 12.4 };
  }
  if (name === 'mission') {
    state.money = 450;
    state.missionIndex = 3;
    state.player.health = 82;
    state.player.ammo = 18;
    beginQuiet(3); // Debt Collection: thugs on foot around the marker
    const m = state.mission.marker;
    state.player.x = m.x - 150;
    state.player.y = m.y + 90;
    state.player.angle = Math.atan2(m.y - state.player.y, m.x - state.player.x);
    state.player.inCar = false;
    state.player.car = null;
    // A couple of bystanders watch the fight from the sidewalk.
    spawnPedestrian(state.traffic, m.x + 130, m.y - 60);
    spawnPedestrian(state.traffic, m.x - 200, m.y - 120);
    centreCamera(state);
    return { screen: SCREEN_PLAY, time: 12.4 };
  }
  // start: the title screen over a slow pan of the city. time 0.6 keeps the
  // blinking "PRESS ENTER" prompt visible in the frozen frame.
  state.screen = SCREEN_TITLE;
  return { screen: SCREEN_TITLE, time: 0.6 };
}
