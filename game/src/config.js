// SOLARA BAY — configuration: world size, palette, tuning, districts.
// Every number the game balances on lives here so the other modules stay small.
export const WORLD = 3600; // world is WORLD x WORLD world units
export const ROAD_EVERY = 400; // spacing of the road grid
export const ROAD_WIDTH = 96;
export const ROAD_FIRST = 200; // first road centre line
export const VIEW_W = 1280;
export const VIEW_H = 720;

export const PLAYER = {
  walkSpeed: 240,
  radius: 14,
  health: 100,
  punchDamage: 34,
  punchRange: 46,
  punchCooldown: 0.38,
};

export const CAR = {
  accel: 520,
  brake: 900,
  reverseAccel: 320,
  maxSpeed: 640,
  maxReverse: 220,
  turnRate: 2.6, // radians per second at full lock, scaled by speed
  grip: 3.2, // how fast velocity aligns with heading
  radius: 20,
};

export const WANTED = {
  max: 5,
  decayDelay: 9, // seconds with no crime before stars start falling
  decayInterval: 7, // seconds per star lost while evading
  bustTime: 2.2, // seconds a cop must stay touching a slow player to bust them
  bustFine: 250,
};

export const PALETTE = {
  grass: '#7fb069',
  grassDry: '#a8c686',
  sand: '#f2d492',
  water: '#2e86ab',
  waterDeep: '#1d5f7a',
  road: '#3d3a4a',
  roadEdge: '#2e2c38',
  sidewalk: '#c9bfa8',
  lane: '#f4e9c8',
  buildingRoofs: ['#e07a5f', '#f2cc8f', '#81b29a', '#e8c468', '#f4a261', '#90be6d', '#f28482', '#b5838d', '#8ecae6', '#ffb703'],
  buildingWall: '#6b5d4f',
  park: '#5da271',
  tree: '#2f7d4f',
  treeLight: '#57a773',
  carColors: ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#457b9d', '#f1faee', '#6d6875', '#ff7b00', '#90be6d', '#ef476f'],
  copBlue: '#1d3557',
  copWhite: '#f1faee',
  playerShirt: '#ff5d8f',
  playerSkin: '#e8b98a',
};

export const DISTRICTS = [
  { name: 'Marina Row', x: 0, y: 3000, w: 1800, h: 600 },
  { name: 'Coral Heights', x: 1800, y: 0, w: 1800, h: 1800 },
  { name: 'Dockside', x: 0, y: 0, w: 1800, h: 1200 },
  { name: 'Old Town', x: 0, y: 1200, w: 1800, h: 1800 },
  { name: 'Palm Court', x: 1800, y: 1800, w: 1800, h: 1200 },
];

export const CAR_MODELS = [
  { name: 'Breeze', color: '#e63946', speed: 1.0, len: 46, wid: 22 },
  { name: 'Comet', color: '#f4a261', speed: 1.08, len: 48, wid: 22 },
  { name: 'Tide Runner', color: '#2a9d8f', speed: 0.95, len: 52, wid: 24 },
  { name: 'Sunbeam', color: '#e9c46a', speed: 1.12, len: 44, wid: 21 },
  { name: 'Harbor Van', color: '#457b9d', speed: 0.85, len: 56, wid: 25 },
  { name: 'Coral GT', color: '#ef476f', speed: 1.18, len: 46, wid: 22 },
];

export const SAVE_KEY = 'solara-bay-save-v1';
