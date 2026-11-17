// Rendering: the sun-soaked city, the cars and people on it, the HUD with its
// minimap and wanted stars, and the title / pause / busted / wasted screens.
// Everything is drawn with canvas 2D shapes — no image assets at all.
import { WORLD, VIEW_W, VIEW_H, PALETTE, ROAD_WIDTH, WANTED } from './config.js';

const WANTED_BUST_FINE = WANTED.bustFine;

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_WIN = 'win';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const renderer = { ctx, canvas };

  function drawCarShape(x, y, angle, len, wid, color, opts) {
    const o = opts || {};
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    // Soft shadow to the south-east — the low sun.
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    roundRect(ctx, -len / 2 + 4, -wid / 2 + 5, len, wid, 8);
    ctx.fill();
    ctx.fillStyle = color;
    roundRect(ctx, -len / 2, -wid / 2, len, wid, 8);
    ctx.fill();
    // Windshield + rear window.
    ctx.fillStyle = 'rgba(20,30,50,0.85)';
    roundRect(ctx, len * 0.12, -wid / 2 + 3, len * 0.22, wid - 6, 4);
    ctx.fill();
    roundRect(ctx, -len * 0.38, -wid / 2 + 3, len * 0.16, wid - 6, 4);
    ctx.fill();
    // Headlights.
    ctx.fillStyle = '#fff8c0';
    ctx.fillRect(len / 2 - 2, -wid / 2 + 3, 3, 5);
    ctx.fillRect(len / 2 - 2, wid / 2 - 8, 3, 5);
    if (o.police) {
      // White doors + light bar.
      ctx.fillStyle = PALETTE.copWhite;
      ctx.fillRect(-len * 0.08, -wid / 2, len * 0.2, wid);
      ctx.fillStyle = o.sirenRed ? '#ff2d2d' : '#2d6bff';
      ctx.fillRect(-6, -wid / 2 - 1, 12, 6);
      ctx.fillStyle = o.sirenRed ? '#2d6bff' : '#ff2d2d';
      ctx.fillRect(-6, wid / 2 - 5, 12, 6);
    }
    if (o.taxi) {
      ctx.fillStyle = '#111';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TAXI', 0, 3);
    }
    ctx.restore();
  }
  renderer.drawCarShape = drawCarShape;

  function drawPersonShape(x, y, angle, shirt, skin, bob) {
    const lift = Math.sin(bob || 0) * 1.5;
    ctx.save();
    ctx.translate(x, y + lift * 0.4);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(2, 4, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(angle);
    // Body.
    ctx.fillStyle = shirt;
    roundRect(ctx, -7, -8, 14, 16, 6);
    ctx.fill();
    // Head.
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(10, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();
    // Legs stepping.
    ctx.fillStyle = '#2b2d42';
    ctx.fillRect(-7, -6 + lift, 4, 6);
    ctx.fillRect(-7, 2 - lift, 4, 6);
    ctx.restore();
  }
  renderer.drawPersonShape = drawPersonShape;

  renderer.drawWorld = (state, cam, time) => {
    const { city } = state;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    // Sky-warm ground: dry grass everywhere, sand + ocean at the south edge.
    ctx.fillStyle = PALETTE.grassDry;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const sandY = city.beachY - cam.y;
    const oceanY = city.oceanY - cam.y;
    if (sandY < VIEW_H) {
      ctx.fillStyle = PALETTE.sand;
      ctx.fillRect(0, Math.max(0, sandY), VIEW_W, VIEW_H - Math.max(0, sandY));
    }
    if (oceanY < VIEW_H) {
      ctx.fillStyle = PALETTE.water;
      ctx.fillRect(0, Math.max(0, oceanY), VIEW_W, VIEW_H - Math.max(0, oceanY));
      ctx.fillStyle = PALETTE.waterDeep;
      for (let x = 0; x < VIEW_W; x += 90) {
        const wave = Math.sin(time * 1.4 + x * 0.02 + cam.x * 0.01) * 3;
        ctx.fillRect(x, Math.max(0, oceanY) + 26 + wave, 44, 3);
        ctx.fillRect(x + 30, Math.max(0, oceanY) + 62 - wave, 36, 3);
      }
    }

    // Parks.
    for (const park of city.parks) {
      const px = park.x - cam.x;
      const py = park.y - cam.y;
      if (px > VIEW_W || py > VIEW_H || px + park.w < 0 || py + park.h < 0) continue;
      ctx.fillStyle = PALETTE.park;
      roundRect(ctx, px, py, park.w, park.h, 12);
      ctx.fill();
      ctx.fillStyle = '#8ecae6';
      ctx.beginPath();
      ctx.ellipse(px + park.w / 2, py + park.h / 2, 46, 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Roads: asphalt, sidewalk border, dashed centre line.
    ctx.fillStyle = PALETTE.sidewalk;
    for (const c of city.centers) {
      ctx.fillRect(c - ROAD_WIDTH / 2 - 10 - cam.x, -cam.y, ROAD_WIDTH + 20, WORLD);
      ctx.fillRect(-cam.x, c - ROAD_WIDTH / 2 - 10 - cam.y, WORLD, ROAD_WIDTH + 20);
    }
    ctx.fillStyle = PALETTE.road;
    for (const c of city.centers) {
      ctx.fillRect(c - ROAD_WIDTH / 2 - cam.x, -cam.y, ROAD_WIDTH, WORLD);
      ctx.fillRect(-cam.x, c - ROAD_WIDTH / 2 - cam.y, WORLD, ROAD_WIDTH);
    }
    ctx.fillStyle = PALETTE.lane;
    const dash = 26;
    for (const c of city.centers) {
      for (let d = 0; d < WORLD; d += dash * 2) {
        ctx.fillRect(c - 2 - cam.x, d - cam.y, 4, dash);
        ctx.fillRect(d - cam.x, c - 2 - cam.y, dash, 4);
      }
    }

    // Buildings with a sun shadow and a lit roof edge.
    for (const b of city.buildings) {
      const bx = b.x - cam.x;
      const by = b.y - cam.y;
      if (bx > VIEW_W || by > VIEW_H || bx + b.w < 0 || by + b.h < 0) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(bx + 8 + b.height * 3, by + 8 + b.height * 3, b.w, b.h);
      ctx.fillStyle = PALETTE.buildingWall;
      ctx.fillRect(bx, by, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(bx + 4, by + 4, b.w - 8, b.h - 8);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(bx + 4, by + 4, b.w - 8, 6);
      if (b.lit) {
        ctx.fillStyle = 'rgba(255,240,170,0.5)';
        ctx.fillRect(bx + b.w * 0.25, by + b.h * 0.3, b.w * 0.14, b.h * 0.16);
        ctx.fillRect(bx + b.w * 0.6, by + b.h * 0.55, b.w * 0.14, b.h * 0.16);
      }
    }

    // Palm trees.
    for (const t of city.trees) {
      const tx = t.x - cam.x;
      const ty = t.y - cam.y;
      if (tx < -30 || ty < -30 || tx > VIEW_W + 30 || ty > VIEW_H + 30) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(tx + 4, ty + 5, t.r, t.r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7a5a3a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + 3, ty - 6);
      ctx.stroke();
      ctx.fillStyle = t.r > 9 ? PALETTE.tree : PALETTE.treeLight;
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2 + time * 0.1;
        ctx.beginPath();
        ctx.ellipse(tx + Math.cos(a) * t.r * 0.9, ty - 6 + Math.sin(a) * t.r * 0.5, t.r * 0.85, t.r * 0.32, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Mission marker: a pulsing beacon + light column.
    if (state.mission && state.mission.marker && !state.mission.done) {
      const m = state.mission.marker;
      const mx = m.x - cam.x;
      const my = m.y - cam.y;
      const pulse = 1 + Math.sin(time * 5) * 0.18;
      ctx.save();
      ctx.globalAlpha = 0.16 + Math.sin(time * 5) * 0.05;
      ctx.fillStyle = state.missionStep === 'dropoff' || state.missionStep === 'deliver' ? '#2ec4b6' : '#ffbf00';
      ctx.fillRect(mx - 14, my - 260, 28, 260);
      ctx.restore();
      ctx.fillStyle = state.missionStep === 'dropoff' || state.missionStep === 'deliver' ? '#2ec4b6' : '#ffbf00';
      ctx.beginPath();
      ctx.arc(mx, my, 16 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(mx, my, 22 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(mx, my + 26);
      ctx.lineTo(mx - 8, my + 10);
      ctx.lineTo(mx + 8, my + 10);
      ctx.closePath();
      ctx.fill();
    }

    // Pickups.
    for (const p of state.combat.pickups) {
      const px = p.x - cam.x;
      const py = p.y - cam.y + Math.sin(p.bob) * 3;
      if (px < -20 || py < -20 || px > VIEW_W + 20 || py > VIEW_H + 20) continue;
      ctx.save();
      ctx.translate(px, py);
      if (p.kind === 'cash') {
        ctx.fillStyle = '#2ec4b6';
        roundRect(ctx, -11, -7, 22, 14, 3);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('$', 0, 4);
      } else if (p.kind === 'ammo') {
        ctx.fillStyle = '#ffb703';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#111';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('A', 0, 3);
      } else {
        ctx.fillStyle = '#e63946';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(-2, -6, 4, 12);
        ctx.fillRect(-6, -2, 12, 4);
      }
      ctx.restore();
    }

    // Parked / stealable cars, traffic, cops, thugs, peds, player.
    for (const car of state.parkedCars) {
      if (car.taken) continue;
      drawCarShape(car.x - cam.x, car.y - cam.y, car.angle, car.model.len, car.model.wid, car.color);
    }
    for (const car of state.traffic.cars) {
      drawCarShape(car.x - cam.x, car.y - cam.y, car.angle, car.model.len, car.model.wid, car.color);
    }
    for (const cop of state.police.cops) {
      drawCarShape(cop.x - cam.x, cop.y - cam.y, cop.angle, 48, 23, PALETTE.copBlue, { police: true, sirenRed: Math.floor(time * 3 + cop.sirenPhase) % 2 === 0 });
    }
    for (const thug of state.combat.thugs) {
      if (thug.state === 'down') {
        ctx.save();
        ctx.translate(thug.x - cam.x, thug.y - cam.y);
        ctx.rotate(1.2);
        ctx.fillStyle = thug.color;
        roundRect(ctx, -12, -7, 24, 14, 6);
        ctx.fill();
        ctx.restore();
      } else {
        drawPersonShape(thug.x - cam.x, thug.y - cam.y, thug.angle, thug.color, '#c98d5f', time * 6);
        ctx.fillStyle = '#e63946';
        ctx.fillRect(thug.x - cam.x - 12, thug.y - cam.y - 24, 24 * Math.max(0, thug.hp / 60), 4);
      }
    }
    for (const ped of state.traffic.peds) {
      drawPersonShape(ped.x - cam.x, ped.y - cam.y, Math.atan2(ped.vy, ped.vx), ped.color, ped.skin, ped.bob);
    }

    // Bullets + muzzle flash.
    ctx.fillStyle = '#ffe66d';
    for (const b of state.combat.bullets) {
      ctx.beginPath();
      ctx.arc(b.x - cam.x, b.y - cam.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (state.combat.muzzle > 0 && !state.player.inCar) {
      const mx = state.player.x + Math.cos(state.player.angle) * 26 - cam.x;
      const my = state.player.y + Math.sin(state.player.angle) * 26 - cam.y;
      ctx.fillStyle = '#ffd60a';
      ctx.beginPath();
      ctx.arc(mx, my, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    // The player: on foot a walker, in a car the car itself (drawn last, on top).
    if (state.player.inCar) {
      const car = state.player.car;
      drawCarShape(car.x - cam.x, car.y - cam.y, car.angle, car.model.len, car.model.wid, car.color);
    } else {
      drawPersonShape(state.player.x - cam.x, state.player.y - cam.y, state.player.angle, PALETTE.playerShirt, PALETTE.playerSkin, state.player.bob);
      // Pistol in hand when aiming.
      if (state.player.ammo > 0) {
        ctx.save();
        ctx.translate(state.player.x - cam.x, state.player.y - cam.y);
        ctx.rotate(state.player.angle);
        ctx.fillStyle = '#222';
        ctx.fillRect(10, -2, 12, 4);
        ctx.restore();
      }
    }

    // Particles (skid smoke, impacts, cash sparkle).
    for (const part of state.particles) {
      ctx.globalAlpha = Math.max(0, part.life / part.maxLife);
      ctx.fillStyle = part.color;
      ctx.beginPath();
      ctx.arc(part.x - cam.x, part.y - cam.y, part.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Off-screen marker arrow: always point at the objective.
    if (state.mission && state.mission.marker && !state.mission.done) {
      const m = state.mission.marker;
      const mx = m.x - cam.x;
      const my = m.y - cam.y;
      if (mx < 40 || mx > VIEW_W - 40 || my < 40 || my > VIEW_H - 40) {
        const cx = VIEW_W / 2;
        const cy = VIEW_H / 2;
        const ang = Math.atan2(my - cy, mx - cx);
        const ax = cx + Math.cos(ang) * 260;
        const ay = cy + Math.sin(ang) * 200;
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(ang);
        ctx.fillStyle = '#ffbf00';
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(-10, -11);
        ctx.lineTo(-10, 11);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(Math.hypot(m.x - state.player.x, m.y - state.player.y))}m`, ax, ay + 30);
      }
    }
  };

  renderer.drawHUD = (state, time) => {
    const p = state.player;
    // Top-left: health, money, ammo.
    ctx.fillStyle = 'rgba(10,12,24,0.55)';
    roundRect(ctx, 12, 12, 250, 92, 10);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('KAI ROOK', 24, 34);
    ctx.fillStyle = '#2ec4b6';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`$${state.money}`, 24, 60);
    ctx.fillStyle = '#888';
    ctx.font = '12px sans-serif';
    ctx.fillText(`AMMO ${p.ammo}   •   JOB ${state.missionIndex + 1}/6`, 24, 80);
    // Health bar.
    ctx.fillStyle = '#333';
    roundRect(ctx, 24, 88, 120, 8, 4);
    ctx.fill();
    ctx.fillStyle = p.health > 30 ? '#06d6a0' : '#ef476f';
    roundRect(ctx, 24, 88, 120 * Math.max(0, p.health / 100), 8, 4);
    ctx.fill();

    // Top-centre: wanted stars.
    ctx.fillStyle = 'rgba(10,12,24,0.55)';
    roundRect(ctx, VIEW_W / 2 - 110, 12, 220, 44, 10);
    ctx.fill();
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = i < state.police.wanted ? '#ffd60a' : 'rgba(255,255,255,0.25)';
      drawStar(ctx, VIEW_W / 2 - 88 + i * 40, 34, i < state.police.wanted ? 15 : 12);
    }
    if (state.police.bustTimer > 0.2) {
      ctx.fillStyle = '#ff2d2d';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BUSTED?! RUN!', VIEW_W / 2, 76);
    }

    // Mission objective, under the stars.
    if (state.mission) {
      const text = state.mission.done ? 'JOB COMPLETE — press M for the next job' : state.mission.message;
      ctx.font = 'bold 15px sans-serif';
      const w = ctx.measureText(text).width + 28;
      ctx.fillStyle = 'rgba(10,12,24,0.55)';
      roundRect(ctx, VIEW_W / 2 - w / 2, 64, w, 32, 8);
      ctx.fill();
      ctx.fillStyle = state.mission.done ? '#06d6a0' : '#ffd60a';
      ctx.textAlign = 'center';
      ctx.fillText(text, VIEW_W / 2, 85);
      if (state.mission.timer > 0) {
        ctx.fillStyle = state.mission.timer < 30 ? '#ff2d2d' : '#fff';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(`${Math.ceil(state.mission.timer)}s`, VIEW_W / 2, 116);
      }
    }

    // Bottom-left: controls reminder + speed.
    ctx.fillStyle = 'rgba(10,12,24,0.55)';
    roundRect(ctx, 12, VIEW_H - 64, 330, 52, 10);
    ctx.fill();
    ctx.fillStyle = '#ddd';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(p.inCar ? 'WASD drive  •  E exit car  •  SPACE handbrake' : 'WASD walk  •  E steal car  •  CLICK shoot  •  SPACE punch', 24, VIEW_H - 42);
    ctx.fillText('M next job  •  P pause  •  H horn', 24, VIEW_H - 24);
    if (p.inCar) {
      const kmh = Math.round(Math.hypot(p.car.vx, p.car.vy) * 0.36);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${kmh}`, VIEW_W - 280, VIEW_H - 26);
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('km/h', VIEW_W - 272, VIEW_H - 26);
    }

    // Toast messages.
    if (state.toast && state.toastTimer > 0) {
      ctx.globalAlpha = Math.min(1, state.toastTimer);
      ctx.fillStyle = 'rgba(10,12,24,0.7)';
      const w = ctx.measureText(state.toast).width + 32;
      ctx.font = 'bold 16px sans-serif';
      roundRect(ctx, VIEW_W / 2 - w / 2, VIEW_H - 130, w, 36, 8);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(state.toast, VIEW_W / 2, VIEW_H - 106);
      ctx.globalAlpha = 1;
    }

    drawMinimap(state, time);
  };

  function drawStar(ctx2, x, y, r) {
    ctx2.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const ang = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * 0.45;
      const px = x + Math.cos(ang) * rad;
      const py = y + Math.sin(ang) * rad;
      if (i === 0) ctx2.moveTo(px, py);
      else ctx2.lineTo(px, py);
    }
    ctx2.closePath();
    ctx2.fill();
  }

  function drawMinimap(state, time) {
    const size = 190;
    const mx = VIEW_W - size - 14;
    const my = VIEW_H - size - 14;
    const scale = size / WORLD;
    ctx.fillStyle = 'rgba(10,12,24,0.72)';
    roundRect(ctx, mx - 6, my - 6, size + 12, size + 12, 10);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.rect(mx, my, size, size);
    ctx.clip();
    // Ground + water + roads.
    ctx.fillStyle = '#3a5a3a';
    ctx.fillRect(mx, my, size, size);
    ctx.fillStyle = '#2e86ab';
    ctx.fillRect(mx, my + (state.city.oceanY * scale), size, size);
    ctx.fillStyle = '#555';
    for (const c of state.city.centers) {
      ctx.fillRect(mx + c * scale - 1, my, 2, size);
      ctx.fillRect(mx, my + c * scale - 1, size, 2);
    }
    // Buildings.
    ctx.fillStyle = '#8a7a63';
    for (const b of state.city.buildings) {
      ctx.fillRect(mx + b.x * scale, my + b.y * scale, Math.max(1.5, b.w * scale), Math.max(1.5, b.h * scale));
    }
    // Mission marker.
    if (state.mission && state.mission.marker && !state.mission.done) {
      const pulse = 3 + Math.sin(time * 5) * 1.5;
      ctx.fillStyle = '#ffbf00';
      ctx.beginPath();
      ctx.arc(mx + state.mission.marker.x * scale, my + state.mission.marker.y * scale, pulse, 0, Math.PI * 2);
      ctx.fill();
    }
    // Cops (blue), traffic (grey), player (white ring + pink dot).
    ctx.fillStyle = '#4cc9f0';
    for (const cop of state.police.cops) {
      ctx.fillRect(mx + cop.x * scale - 2, my + cop.y * scale - 2, 4, 4);
    }
    ctx.fillStyle = '#bbb';
    for (const car of state.traffic.cars) {
      ctx.fillRect(mx + car.x * scale - 1.5, my + car.y * scale - 1.5, 3, 3);
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(mx + state.player.x * scale, my + state.player.y * scale, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.playerShirt;
    ctx.beginPath();
    ctx.arc(mx + state.player.x * scale, my + state.player.y * scale, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Viewport rectangle.
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    const vx = mx + (state.cam.x * scale);
    const vy = my + (state.cam.y * scale);
    ctx.strokeRect(vx, vy, VIEW_W * scale, VIEW_H * scale);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SOLARA BAY', mx, my - 10 + 0);
  }

  renderer.drawTitle = (state, time) => {
    drawBackdrop(state, time);
    // Sun-soaked title card.
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    grad.addColorStop(0, 'rgba(255,170,80,0.15)');
    grad.addColorStop(1, 'rgba(20,10,40,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd60a';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('WELCOME TO', VIEW_W / 2, 170);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 96px sans-serif';
    ctx.shadowColor = '#ff5d8f';
    ctx.shadowBlur = 30;
    ctx.fillText('SOLARA BAY', VIEW_W / 2, 270);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffb703';
    ctx.font = 'italic bold 26px sans-serif';
    ctx.fillText('a sun-soaked street story', VIEW_W / 2, 312);
    ctx.fillStyle = '#fff';
    ctx.font = '17px sans-serif';
    ctx.fillText('Steal cars. Outrun the law. Run Lena Voss\'s jobs and own the city.', VIEW_W / 2, 360);
    ctx.fillStyle = 'rgba(10,12,24,0.65)';
    roundRect(ctx, VIEW_W / 2 - 260, 400, 520, 130, 12);
    ctx.fill();
    ctx.fillStyle = '#ddd';
    ctx.font = '15px sans-serif';
    ctx.fillText('WASD / arrows — walk & drive      E — steal / exit car', VIEW_W / 2, 430);
    ctx.fillText('MOUSE — aim pistol      CLICK — shoot      SPACE — punch', VIEW_W / 2, 456);
    ctx.fillText('M — next job      P — pause      H — horn', VIEW_W / 2, 482);
    ctx.fillStyle = '#ffd60a';
    ctx.font = 'bold 22px sans-serif';
    const blink = Math.sin(time * 4) > -0.2;
    if (blink) ctx.fillText(state.save ? 'PRESS ENTER — CONTINUE ($' + state.save.money + ', JOB ' + (state.save.missionIndex + 1) + '/6)' : 'PRESS ENTER TO START', VIEW_W / 2, 580);
    ctx.fillStyle = '#aaa';
    ctx.font = '13px sans-serif';
    ctx.fillText('An original game. No real city, no real gangsters — just Solara Bay.', VIEW_W / 2, 640);
    ctx.fillText('Best run: $' + state.bestMoney, VIEW_W / 2, 664);
  };

  function drawBackdrop(state, time) {
    // A slow pan over the city behind the menus.
    const cam = {
      x: 400 + Math.sin(time * 0.05) * 300,
      y: 400 + Math.cos(time * 0.04) * 300,
    };
    const savedMission = state.mission;
    state.mission = null;
    renderer.drawWorld(state, cam, time);
    state.mission = savedMission;
  }

  renderer.drawPause = (state) => {
    ctx.fillStyle = 'rgba(8,10,20,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 40);
    ctx.font = '17px sans-serif';
    ctx.fillStyle = '#ddd';
    ctx.fillText('P or ESC — resume      M — mute sound      ENTER — save & resume', VIEW_W / 2, VIEW_H / 2 + 10);
    ctx.fillText(`Money $${state.money}   •   Job ${state.missionIndex + 1}/6   •   Jobs done ${state.missionsDone}`, VIEW_W / 2, VIEW_H / 2 + 44);
  };

  renderer.drawEnd = (state, kind) => {
    ctx.fillStyle = kind === 'win' ? 'rgba(10,40,20,0.72)' : 'rgba(30,8,16,0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    const title = kind === 'busted' ? 'BUSTED!' : kind === 'wasted' ? 'WASTED' : 'SOLARA BAY IS YOURS';
    ctx.fillStyle = kind === 'win' ? '#06d6a0' : '#ff2d2d';
    ctx.font = 'bold 72px sans-serif';
    ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 60);
    ctx.fillStyle = '#fff';
    ctx.font = '19px sans-serif';
    const lines = {
      busted: ['The Solara Bay PD dragged you out of the car.', 'They took $' + WANTED_BUST_FINE + ' and your heat — but the debt is still there.'],
      wasted: ['You got knocked out cold on the streets of Solara Bay.', 'Lena patched you up. The debt is still there.'],
      win: ['Six jobs. Debt paid. The Coral GT is in the garage.', 'Kai Rook owns Solara Bay now — and the sunset is all yours.'],
    };
    const body = lines[kind] || lines.busted;
    ctx.fillText(body[0], VIEW_W / 2, VIEW_H / 2);
    ctx.fillText(body[1], VIEW_W / 2, VIEW_H / 2 + 30);
    ctx.fillStyle = '#ffd60a';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`Money $${state.money}   •   Jobs done ${state.missionsDone}/6`, VIEW_W / 2, VIEW_H / 2 + 80);
    ctx.fillStyle = '#ddd';
    ctx.font = '16px sans-serif';
    ctx.fillText('PRESS ENTER TO PLAY AGAIN', VIEW_W / 2, VIEW_H / 2 + 130);
  };

  renderer.drawMissionCard = (state, time) => {
    if (!state.missionCardTimer || state.missionCardTimer <= 0) return;
    const m = state.missionCard;
    const alpha = Math.min(1, state.missionCardTimer);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(10,12,24,0.8)';
    roundRect(ctx, VIEW_W / 2 - 320, 130, 640, 150, 14);
    ctx.fill();
    ctx.strokeStyle = '#ffd60a';
    ctx.lineWidth = 2;
    ctx.strokeRect(VIEW_W / 2 - 320, 130, 640, 150);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd60a';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(m.def.title.toUpperCase(), VIEW_W / 2, 168);
    ctx.fillStyle = '#fff';
    ctx.font = '15px sans-serif';
    ctx.fillText(m.def.giver + '  •  Reward $' + m.def.reward, VIEW_W / 2, 196);
    ctx.fillStyle = '#ddd';
    ctx.font = '14px sans-serif';
    wrapText(ctx, m.def.brief, VIEW_W / 2, 222, 600, 20);
    ctx.restore();
  };

  function wrapText(ctx2, text, cx, y, maxW, lineH) {
    const words = text.split(' ');
    let line = '';
    let yy = y;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx2.measureText(test).width > maxW && line) {
        ctx2.fillText(line, cx, yy);
        line = word;
        yy += lineH;
      } else {
        line = test;
      }
    }
    if (line) ctx2.fillText(line, cx, yy);
  }

  return renderer;
}
