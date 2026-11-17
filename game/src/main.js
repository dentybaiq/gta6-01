// SOLARA BAY — main loop: game state, player on foot / in a car, stealing,
// wanted heat, mission progression, camera, save, and the screen state machine.
import { WORLD, VIEW_W, VIEW_H, PLAYER, CAR, WANTED, CAR_MODELS, PALETTE } from './config.js';
import { mulberry32, pick, range } from './rng.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { generateCity, collideBuildings, clampToWorld, randomRoadPoint, nearestRoadPoint } from './city.js';
import { createTraffic, spawnTrafficCar, spawnPedestrian, maintainPopulation, updateTraffic, scarePeds, removePed } from './traffic.js';
import { createPolice, addWanted, updatePolice, clearPolice } from './police.js';
import { missionList, startMission, currentStep, objectiveText } from './missions.js';
import { createCombat, spawnThug, spawnPickup, fireBullet, punch, updateCombat } from './combat.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSE, SCREEN_BUSTED, SCREEN_WASTED, SCREEN_WIN } from './render.js';
import { loadSave, writeSave } from './save.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const input = createInput(canvas);
const audio = createAudio();
const renderer = createRenderer(canvas);
const statusEl = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function makePlayerCar(model, x, y, angle) {
  return {
    x, y, angle,
    vx: 0, vy: 0,
    speed: 0,
    model,
    color: model.color,
    parked: false,
    taken: false,
  };
}

function createState() {
  const rand = mulberry32(20261117);
  const city = generateCity(20261117);
  const save = loadSave();
  const state = {
    city,
    rand,
    screen: SCREEN_TITLE,
    time: 0,
    money: save ? save.money : 0,
    bestMoney: save ? Math.max(save.bestMoney || 0, save.money || 0) : 0,
    missionIndex: save ? (save.missionIndex || 0) : 0,
    missionsDone: save ? (save.missionsDone || 0) : 0,
    save: save || null,
    player: {
      x: 1000, y: 1000, vx: 0, vy: 0,
      angle: 0, bob: 0,
      health: save ? (save.health || 100) : 100,
      ammo: save ? (save.ammo ?? 24) : 24,
      inCar: false,
      car: null,
    },
    cam: { x: 0, y: 0 },
    traffic: createTraffic(77),
    police: createPolice(99),
    combat: createCombat(55),
    parkedCars: [],
    mission: null,
    missionStep: null,
    missionCard: null,
    missionCardTimer: 0,
    particles: [],
    toast: '',
    toastTimer: 0,
    passenger: null, // {x, y} waiting rider for the pickup step
    stealTarget: null,
    autosaveTimer: 0,
  };
  // A few parked cars the player can steal, near the spawn.
  for (let i = 0; i < 9; i += 1) {
    const p = randomRoadPoint(rand, state.player.x, state.player.y, i === 0 ? 120 : 300);
    const model = pick(rand, CAR_MODELS);
    const car = makePlayerCar(model, p.x, p.y, pick(rand, [0, Math.PI / 2, Math.PI, -Math.PI / 2]));
    car.parked = true;
    state.parkedCars.push(car);
  }
  // A starter car right by the player so the first drive is instant.
  const starter = makePlayerCar(CAR_MODELS[3], 1060, 1000, 0);
  starter.parked = true;
  state.parkedCars.push(starter);
  for (let i = 0; i < 14; i += 1) spawnTrafficCar(state.traffic);
  for (let i = 0; i < 26; i += 1) spawnPedestrian(state.traffic);
  spawnPickup(state.combat, 1120, 940, 'ammo', 12);
  spawnPickup(state.combat, 940, 1120, 'health', 30);
  return state;
}

let state = createState();

function showToast(text, seconds) {
  state.toast = text;
  state.toastTimer = seconds || 3;
}

function addParticles(x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = (speed || 120) * (0.4 + Math.random() * 0.8);
    state.particles.push({
      x, y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 0.5 + Math.random() * 0.4, maxLife: 0.9,
      size: 2 + Math.random() * 3.5,
      color,
    });
  }
}

function beginMission(index) {
  const defs = missionList();
  if (index >= defs.length) {
    state.screen = SCREEN_WIN;
    audio.missionDone();
    return;
  }
  const def = defs[index];
  state.mission = startMission(def, state.rand, state.player);
  state.missionStep = currentStep(state.mission);
  state.missionCard = state.mission;
  state.missionCardTimer = 4.5;
  if (def.wantedAtStart) addWanted(state.police, def.wantedAtStart, 'job heat');
  if (def.id === 'debt-collection') {
    // Thugs hang around the marker.
    for (let i = 0; i < def.thugs; i += 1) {
      spawnThug(state.combat, state.mission.marker.x + range(state.rand, -90, 90), state.mission.marker.y + range(state.rand, -90, 90));
    }
    state.mission.thugsSpawned = true;
  }
  if (def.id === 'big-score') {
    // The Coral GT waits at the steal marker.
    const gt = makePlayerCar(CAR_MODELS[5], state.mission.stealPoint.x, state.mission.stealPoint.y, 0);
    gt.parked = true;
    gt.isTarget = true;
    state.parkedCars.push(gt);
    state.stealTarget = gt;
  }
  if (def.id === 'first-fare' || def.id === 'hot-package' || def.id === 'sunset-run') {
    state.passenger = { x: state.mission.pickupPoint.x, y: state.mission.pickupPoint.y };
  }
  audio.missionStart();
  if (statusEl) statusEl.textContent = def.title + ': ' + objectiveText(state.mission);
}

function advanceMissionStep() {
  const m = state.mission;
  if (!m) return;
  m.stepIndex += 1;
  if (m.stepIndex >= m.def.steps.length) {
    completeMission();
    return;
  }
  state.missionStep = currentStep(m);
  if (state.missionStep === 'dropoff' || state.missionStep === 'deliver') {
    m.marker = m.dropoffPoint;
    m.message = state.missionStep === 'deliver' ? 'Deliver the Coral GT to the garage' : 'Deliver to the green marker';
  } else if (state.missionStep === 'loseCops') {
    m.marker = null;
    m.message = 'Lose the cops — drop every star!';
  } else if (state.missionStep === 'collect') {
    m.marker = null;
    m.message = 'Collect the dropped cash';
  }
  audio.blip();
}

function completeMission() {
  const m = state.mission;
  state.money += m.def.reward;
  state.bestMoney = Math.max(state.bestMoney, state.money);
  state.missionsDone += 1;
  state.missionIndex += 1;
  state.mission.done = true;
  state.missionStep = null;
  showToast(`JOB COMPLETE — +$${m.def.reward}`, 4);
  audio.missionDone();
  addParticles(state.player.x, state.player.y, '#ffd60a', 26, 200);
  writeSave(state);
  if (state.missionIndex >= missionList().length) {
    setTimeout(() => { state.screen = SCREEN_WIN; }, 1600);
  }
}

function failMission(reason) {
  const m = state.mission;
  if (!m) return;
  showToast('JOB FAILED — ' + reason, 4);
  state.mission = null;
  state.missionStep = null;
  state.passenger = null;
  audio.busted();
}

function nearestStealableCar(maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of state.parkedCars) {
    if (car.taken) continue;
    const d = Math.hypot(car.x - state.player.x, car.y - state.player.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function enterCar(car) {
  car.taken = true;
  car.parked = false;
  state.player.inCar = true;
  state.player.car = car;
  state.player.x = car.x;
  state.player.y = car.y;
  audio.horn();
}

function exitCar() {
  const car = state.player.car;
  if (!car) return;
  car.vx = 0;
  car.vy = 0;
  car.speed = 0;
  car.parked = true;
  state.player.inCar = false;
  state.player.car = null;
  state.player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
  state.player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
  const pos = collideBuildings(state.city, state.player.x, state.player.y, PLAYER.radius);
  state.player.x = pos.x;
  state.player.y = pos.y;
}

function onBusted() {
  const fine = Math.min(state.money, WANTED.bustFine);
  state.money -= fine;
  state.bestMoney = Math.max(state.bestMoney, state.money);
  if (state.player.inCar) exitCar();
  const road = nearestRoadPoint(state.player.x, state.player.y);
  state.player.x = road.x;
  state.player.y = road.y;
  state.player.health = Math.max(40, state.player.health);
  if (state.mission) failMission('you got busted');
  audio.busted();
  writeSave(state);
  state.screen = SCREEN_BUSTED;
}

function onWasted() {
  state.player.health = 100;
  state.player.x = 1000;
  state.player.y = 1000;
  if (state.player.inCar) exitCar();
  if (state.mission) failMission('you got knocked out');
  clearPolice(state.police);
  writeSave(state);
  state.screen = SCREEN_WASTED;
}

function onCombatEvent(kind, data) {
  if (kind === 'thugDown') {
    if (state.mission && state.mission.def.id === 'debt-collection' && state.missionStep === 'beat') {
      state.mission.collected += 1;
      showToast(`Deadbeat down (${state.mission.collected}/${state.mission.needed})`, 2.5);
      if (state.mission.collected >= state.mission.needed) advanceMissionStep();
    }
  } else if (kind === 'playerHit') {
    state.player.health -= data.damage;
    addParticles(state.player.x, state.player.y, '#ef476f', 6, 90);
    if (state.player.health <= 0) onWasted();
  } else if (kind === 'pickup') {
    if (data.kind === 'cash') {
      state.money += data.amount;
      state.bestMoney = Math.max(state.bestMoney, state.money);
      audio.cash();
      addParticles(state.player.x, state.player.y, '#2ec4b6', 10, 120);
      if (state.mission && state.mission.def.id === 'debt-collection' && state.missionStep === 'collect') {
        state.mission.collected += 1;
        if (state.mission.collected >= state.mission.needed) advanceMissionStep();
        else showToast(`Cash collected (${state.mission.collected}/${state.mission.needed})`, 2);
      }
    } else if (data.kind === 'ammo') {
      state.player.ammo += data.amount;
      audio.pickup();
      showToast(`+${data.amount} ammo`, 2);
    } else if (data.kind === 'health') {
      state.player.health = Math.min(100, state.player.health + data.amount);
      audio.pickup();
      showToast(`+${data.amount} health`, 2);
    }
  }
}

// --- Player movement: on foot ---
function updateOnFoot(dt) {
  const p = state.player;
  const axis = input.axis();
  const len = Math.hypot(axis.x, axis.y) || 1;
  const moving = axis.x !== 0 || axis.y !== 0;
  if (moving) {
    p.vx = (axis.x / len) * PLAYER.walkSpeed;
    p.vy = (axis.y / len) * PLAYER.walkSpeed;
    p.angle = Math.atan2(input.worldY - p.y, input.worldX - p.x);
    p.bob += dt * 10;
  } else {
    p.vx *= Math.max(0, 1 - dt * 10);
    p.vy *= Math.max(0, 1 - dt * 10);
    p.angle = Math.atan2(input.worldY - p.y, input.worldX - p.x);
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  const pos = collideBuildings(state.city, p.x, p.y, PLAYER.radius);
  p.x = pos.x;
  p.y = pos.y;
  const clamped = clampToWorld(p.x, p.y, 30);
  p.x = clamped.x;
  p.y = clamped.y;

  // Steal / enter a car.
  if (input.wasPressed('KeyE')) {
    const car = nearestStealableCar(70);
    if (car) {
      const wasTarget = car.isTarget;
      enterCar(car);
      addWanted(state.police, 1, 'grand theft auto');
      scarePeds(state.traffic, p.x, p.y, 320);
      showToast(wasTarget ? 'You took the Coral GT — LOSE THE HEAT!' : 'Car stolen — the cops noticed!', 3);
      if (state.mission && state.mission.def.id === 'big-score' && state.missionStep === 'steal' && wasTarget) {
        advanceMissionStep();
      }
    }
  }
  // Punch.
  if (input.wasPressed('Space') && state.combat.punchCooldown <= 0) {
    const hit = punch(state.combat, p, onCombatEvent);
    if (hit) {
      audio.punch();
      addWanted(state.police, 0, 'assault'); // punching a thug is the job, no heat
      addParticles(p.x + Math.cos(p.angle) * 34, p.y + Math.sin(p.angle) * 34, '#fff', 5, 80);
    }
  }
  // Shoot toward the mouse.
  if ((input.mousePressed || input.mouseDown) && state.combat.shootCooldown <= 0 && p.ammo > 0) {
    p.ammo -= 1;
    const angle = Math.atan2(input.worldY - p.y, input.worldX - p.x);
    fireBullet(state.combat, p.x + Math.cos(angle) * 24, p.y + Math.sin(angle) * 24, angle);
    audio.shot();
    if (state.police.wanted < 2) addWanted(state.police, 1, 'shots fired');
  }
  // Hitting a pedestrian on foot with a punch is a crime; running one over is too.
  for (const ped of [...state.traffic.peds]) {
    if (Math.hypot(ped.x - p.x, ped.y - p.y) < 22 && input.wasPressed('Space')) {
      addWanted(state.police, 1, 'assault');
      scarePeds(state.traffic, p.x, p.y, 300);
      removePed(state.traffic, ped);
      addParticles(ped.x, ped.y, '#ef476f', 8, 100);
    }
  }
}

// --- Player movement: driving ---
function updateDriving(dt) {
  const p = state.player;
  const car = p.car;
  const axis = input.axis();
  const forward = -axis.y; // W = forward
  const steer = axis.x; // A/D steer
  const speedAlong = car.vx * Math.cos(car.angle) + car.vy * Math.sin(car.angle);

  if (forward > 0) car.speed += CAR.accel * car.model.speed * dt;
  else if (forward < 0) {
    if (speedAlong > 20) car.speed -= CAR.brake * dt;
    else car.speed -= CAR.reverseAccel * dt;
  } else {
    car.speed -= Math.sign(car.speed) * 260 * dt;
    if (Math.abs(car.speed) < 8) car.speed = 0;
  }
  if (input.isDown('Space')) car.speed -= Math.sign(car.speed) * 900 * dt; // handbrake
  const maxF = CAR.maxSpeed * car.model.speed;
  car.speed = Math.max(-CAR.maxReverse, Math.min(maxF, car.speed));

  const steerAmount = steer * CAR.turnRate * Math.min(1, Math.abs(speedAlong) / 160) * Math.sign(speedAlong || 1);
  car.angle += steerAmount * dt;

  // Velocity follows heading with grip; the car slides a little.
  const targetVx = Math.cos(car.angle) * car.speed;
  const targetVy = Math.sin(car.angle) * car.speed;
  car.vx += (targetVx - car.vx) * Math.min(1, CAR.grip * dt);
  car.vy += (targetVy - car.vy) * Math.min(1, CAR.grip * dt);
  const oldX = car.x;
  const oldY = car.y;
  car.x += car.vx * dt;
  car.y += car.vy * dt;
  const pos = collideBuildings(state.city, car.x, car.y, CAR.radius);
  if (pos.x !== car.x || pos.y !== car.y) {
    // Scraped a building: lose speed, spark, thud.
    if (Math.hypot(car.vx, car.vy) > 200) {
      audio.crash();
      addParticles(car.x, car.y, '#ffb703', 8, 140);
    }
    car.x = pos.x;
    car.y = pos.y;
    car.vx *= 0.4;
    car.vy *= 0.4;
    car.speed *= 0.5;
  }
  const clamped = clampToWorld(car.x, car.y, 30);
  car.x = clamped.x;
  car.y = clamped.y;

  // Skid smoke when handbraking or turning hard at speed.
  if ((input.isDown('Space') && Math.abs(speedAlong) > 200) || (Math.abs(steer) > 0 && Math.abs(speedAlong) > 420)) {
    addParticles(car.x - Math.cos(car.angle) * 20, car.y - Math.sin(car.angle) * 20, 'rgba(200,200,200,0.7)', 1, 30);
  }

  // Hit a pedestrian: crime + they go down.
  for (const ped of [...state.traffic.peds]) {
    if (Math.hypot(ped.x - car.x, ped.y - car.y) < 26) {
      addWanted(state.police, 1, 'hit and run');
      scarePeds(state.traffic, car.x, car.y, 380);
      removePed(state.traffic, ped);
      addParticles(ped.x, ped.y, '#ef476f', 10, 120);
      car.speed *= 0.92;
      audio.crash();
    }
  }
  // Bump traffic cars.
  for (const tcar of state.traffic.cars) {
    const dx = tcar.x - car.x;
    const dy = tcar.y - car.y;
    const d = Math.hypot(dx, dy);
    if (d < 46 && d > 0.01) {
      const push = (46 - d) * 0.5;
      car.x -= (dx / d) * push * 0.5;
      car.y -= (dy / d) * push * 0.5;
      tcar.x += (dx / d) * push;
      tcar.y += (dy / d) * push;
      if (Math.abs(speedAlong) > 260) {
        audio.crash();
        addParticles(tcar.x, tcar.y, '#fff', 6, 100);
        addWanted(state.police, 0, 'fender bender');
      }
      car.speed *= 0.94;
    }
  }

  // Exit the car.
  if (input.wasPressed('KeyE')) exitCar();
  if (input.wasPressed('KeyH')) audio.horn();
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
}

function checkMissionTriggers(dt) {
  const m = state.mission;
  if (!m || m.done) return;
  const p = state.player;
  if (m.timer > 0) {
    m.timer -= dt;
    if (m.timer <= 0) {
      failMission('out of time');
      return;
    }
  }
  const step = state.missionStep;
  const near = (point, r) => point && Math.hypot(p.x - point.x, p.y - point.y) < r;
  if (step === 'pickup' && near(m.pickupPoint, 64)) {
    if (m.def.wantedOnPickup) addWanted(state.police, m.def.wantedOnPickup, 'the package is hot');
    if (m.def.id === 'sunset-run') showToast('Package secured — GO! 150 seconds!', 3);
    else if (state.passenger) {
      showToast('Passenger aboard — drive them to the green marker', 3);
      state.passenger = null;
    } else {
      showToast('Package secured — deliver it!', 3);
    }
    audio.pickup();
    advanceMissionStep();
  } else if ((step === 'dropoff' || step === 'deliver') && near(m.dropoffPoint, 64)) {
    advanceMissionStep();
  } else if (step === 'reach' && near(m.marker, 64)) {
    showToast('At the hideout — now lose the cops!', 3);
    advanceMissionStep();
  } else if (step === 'loseCops' && state.police.wanted === 0) {
    advanceMissionStep();
  } else if (step === 'steal' && near(m.stealPoint, 70)) {
    // The steal completes when the player actually takes the car (handled in updateOnFoot).
  }
}

function update(dt) {
  state.time += dt;
  if (state.missionCardTimer > 0) state.missionCardTimer -= dt;
  if (state.toastTimer > 0) state.toastTimer -= dt;
  state.autosaveTimer += dt;
  if (state.autosaveTimer > 20) {
    state.autosaveTimer = 0;
    writeSave(state);
  }

  // World-space mouse for aiming.
  input.worldX = state.cam.x + (input.mouseX / window.innerWidth) * VIEW_W;
  input.worldY = state.cam.y + (input.mouseY / window.innerHeight) * VIEW_H;

  if (state.player.inCar) updateDriving(dt);
  else updateOnFoot(dt);

  updateTraffic(state.traffic, dt, state.player, state.time);
  updatePolice(state.police, dt, state.player, state.city, onBusted, audio);
  updateCombat(state.combat, dt, state.player, state.city, onCombatEvent);
  maintainPopulation(state.traffic, state.player.x, state.player.y, 16, 30);
  checkMissionTriggers(dt);

  // Passenger rider waits at the pickup marker.
  if (state.passenger) {
    state.passenger.bob = (state.passenger.bob || 0) + dt * 6;
  }

  // Particles.
  for (const part of state.particles) {
    part.x += part.vx * dt;
    part.y += part.vy * dt;
    part.vx *= Math.max(0, 1 - dt * 2);
    part.vy *= Math.max(0, 1 - dt * 2);
    part.life -= dt;
  }
  state.particles = state.particles.filter((part) => part.life > 0);

  // Camera follows the player, clamped to the world.
  const targetX = state.player.x - VIEW_W / 2;
  const targetY = state.player.y - VIEW_H / 2;
  state.cam.x += (targetX - state.cam.x) * Math.min(1, dt * 5);
  state.cam.y += (targetY - state.cam.y) * Math.min(1, dt * 5);
  state.cam.x = Math.max(-80, Math.min(WORLD - VIEW_W + 80, state.cam.x));
  state.cam.y = Math.max(-80, Math.min(WORLD - VIEW_H + 80, state.cam.y));

  const speedRatio = state.player.inCar
    ? Math.min(1, Math.hypot(state.player.car.vx, state.player.car.vy) / CAR.maxSpeed)
    : 0;
  audio.update(dt, speedRatio, state.police.wanted);
}

function draw() {
  const ctx = renderer.ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // Scale the 1280x720 view to the window.
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  const ox = (window.innerWidth - VIEW_W * scale) / 2;
  const oy = (window.innerHeight - VIEW_H * scale) / 2;
  ctx.setTransform(scale, 0, 0, scale, ox, oy);
  ctx.fillStyle = '#11141b';
  ctx.fillRect(-ox / scale, -oy / scale, window.innerWidth / scale, window.innerHeight / scale);

  if (state.screen === SCREEN_TITLE) {
    renderer.drawTitle(state, state.time);
  } else if (state.screen === SCREEN_PAUSE) {
    renderer.drawWorld(state, state.cam, state.time);
    renderer.drawHUD(state, state.time);
    renderer.drawPause(state);
  } else if (state.screen === SCREEN_BUSTED || state.screen === SCREEN_WASTED || state.screen === SCREEN_WIN) {
    renderer.drawWorld(state, state.cam, state.time);
    renderer.drawEnd(state, state.screen === SCREEN_WIN ? 'win' : state.screen === SCREEN_BUSTED ? 'busted' : 'wasted');
  } else {
    renderer.drawWorld(state, state.cam, state.time);
    // Draw the waiting passenger.
    if (state.passenger) {
      const px = state.passenger.x - state.cam.x;
      const py = state.passenger.y - state.cam.y;
      renderer.drawPersonShape(px, py, 0, '#06d6a0', '#f2c9a0', state.passenger.bob || 0);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', px, py - 26);
    }
    renderer.drawHUD(state, state.time);
    renderer.drawMissionCard(state, state.time);
  }
}

function startGame() {
  audio.init();
  if (state.screen === SCREEN_TITLE) {
    if (state.missionIndex < missionList().length && !state.mission) beginMission(state.missionIndex);
    state.screen = SCREEN_PLAY;
  } else if (state.screen === SCREEN_BUSTED || state.screen === SCREEN_WASTED || state.screen === SCREEN_WIN) {
    // Fresh run after an ending: keep money and progress, reset the player.
    state.player.health = 100;
    state.player.x = 1000;
    state.player.y = 1000;
    if (state.player.inCar) exitCar();
    clearPolice(state.police);
    if (state.screen === SCREEN_WIN) {
      state.missionIndex = 0;
      state.missionsDone = 0;
    }
    state.mission = null;
    state.missionStep = null;
    state.screen = SCREEN_PLAY;
    if (state.missionIndex < missionList().length) beginMission(state.missionIndex);
  }
  writeSave(state);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (input.wasPressed('Enter')) {
    if (state.screen === SCREEN_TITLE || state.screen === SCREEN_BUSTED || state.screen === SCREEN_WASTED || state.screen === SCREEN_WIN) {
      startGame();
    } else if (state.screen === SCREEN_PAUSE) {
      writeSave(state);
      state.screen = SCREEN_PLAY;
    }
  }
  if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
    if (state.screen === SCREEN_PLAY) state.screen = SCREEN_PAUSE;
    else if (state.screen === SCREEN_PAUSE) state.screen = SCREEN_PLAY;
  }
  if (input.wasPressed('KeyM')) {
    if (state.screen === SCREEN_PLAY) {
      if (!state.mission) {
        if (state.missionIndex < missionList().length) beginMission(state.missionIndex);
        else showToast('All jobs done — Solara Bay is yours!', 3);
      } else {
        showToast('Finish the current job first!', 2);
      }
    } else if (state.screen === SCREEN_PAUSE) {
      if (audio.toggleMute()) showToast('Sound muted', 2);
      else showToast('Sound on', 2);
    }
  }
  if (input.anyKey) audio.init();

  if (state.screen === SCREEN_PLAY) update(dt);
  else if (state.screen === SCREEN_TITLE) state.time += dt;

  draw();
  input.endFrame();
  requestAnimationFrame(frame);
}

// Staged screenshot mode: ?shot=start|drive|chase|mission renders a fixed,
// deterministic scene of the real game and freezes it for the screenshot.
if (shotName) {
  const staged = stageShot(shotName, state, { beginMission, startGame, addWanted, showToast });
  state.screen = staged.screen;
  state.time = staged.time;
  requestAnimationFrame(() => {
    draw();
  });
} else {
  requestAnimationFrame(frame);
}
