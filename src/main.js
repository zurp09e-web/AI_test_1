import * as THREE from 'three';
import './style.css';

const $ = (id) => document.getElementById(id);
const canvas = $('game-canvas');
const hotbarNode = $('hotbar');
const worldMap = new Map();
const edits = new Map();
const keyState = new Set();
const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
const player = {
  position: new THREE.Vector3(0.5, 9, 18.5),
  velocity: new THREE.Vector3(),
  yaw: 0,
  pitch: 0,
  onGround: false,
  fallStart: 0,
  health: 20,
  food: 20,
};

const fallbackBlockCatalog = [
  { name: 'grass', label: 'Grass Block', icon: 'grass', category: 'grass', kind: 'block', placeable: true },
  { name: 'dirt', label: 'Dirt', icon: 'dirt', category: 'dirt', kind: 'block', placeable: true },
  { name: 'stone', label: 'Stone', icon: 'stone', category: 'stone', kind: 'block', placeable: true },
  { name: 'log', label: 'Oak Wood', icon: 'wood', category: 'wood', kind: 'block', placeable: true },
  { name: 'leaves', label: 'Oak Leaves', icon: 'leaves', category: 'leaves', kind: 'block', placeable: true },
  { name: 'sand', label: 'Sand', icon: 'sand', category: 'sand', kind: 'block', placeable: true },
  { name: 'planks', label: 'Oak Planks', icon: 'planks', category: 'planks', kind: 'block', placeable: true },
  { name: 'glass', label: 'Glass', icon: 'glass', category: 'glass', kind: 'block', placeable: true },
  { name: 'torch', label: 'Torch', icon: 'torch', category: 'torch', kind: 'block', placeable: true },
  { name: 'cobblestone', label: 'Cobblestone', icon: 'stone', category: 'stone', kind: 'block', placeable: true },
  { name: 'stonebrick', label: 'Stone Bricks', icon: 'stone', category: 'stone', kind: 'block', placeable: true },
  { name: 'coal_ore', label: 'Coal Ore', icon: 'ore', category: 'ore', kind: 'block', placeable: true },
  { name: 'iron_ore', label: 'Iron Ore', icon: 'ore', category: 'ore', kind: 'block', placeable: true },
  { name: 'diamond_ore', label: 'Diamond Ore', icon: 'ore', category: 'ore', kind: 'block', placeable: true },
  { name: 'water', label: 'Water', icon: 'water', category: 'water', kind: 'block', placeable: true },
  { name: 'lava', label: 'Lava', icon: 'torch', category: 'water', kind: 'block', placeable: true },
  { name: 'item:coal', label: 'Coal', icon: 'ore', category: 'ore', kind: 'item', placeable: false },
  { name: 'item:stick', label: 'Stick', icon: 'wood', category: 'wood', kind: 'item', placeable: false },
];
const legacyBlockAliases = {
  grass_block: 'grass', oak_log: 'log', oak_leaves: 'leaves', oak_planks: 'planks',
  spruce_log: 'log@1', birch_log: 'log@2', jungle_log: 'log@3', acacia_log: 'log2', dark_oak_log: 'log2@1',
  spruce_leaves: 'leaves@1', birch_leaves: 'leaves@2', jungle_leaves: 'leaves@3', acacia_leaves: 'leaves@4', dark_oak_leaves: 'leaves@5',
  spruce_planks: 'planks@1', birch_planks: 'planks@2', jungle_planks: 'planks@3', acacia_planks: 'planks@4', dark_oak_planks: 'planks@5',
  coarse_dirt: 'dirt@1', podzol: 'dirt@2', red_sand: 'sand@1', stone_bricks: 'stonebrick',
  white_wool: 'wool', orange_wool: 'wool@1', magenta_wool: 'wool@2', light_blue_wool: 'wool@3', yellow_wool: 'wool@4',
  lime_wool: 'wool@5', pink_wool: 'wool@6', gray_wool: 'wool@7', light_gray_wool: 'wool@8', cyan_wool: 'wool@9',
  purple_wool: 'wool@10', blue_wool: 'wool@11', brown_wool: 'wool@12', green_wool: 'wool@13', red_wool: 'wool@14', black_wool: 'wool@15',
  terracotta: 'hardened_clay', tinted_glass: 'glass', deepslate: 'stone', moss_block: 'mossy_cobblestone',
  barrel: 'chest', lantern: 'torch', stripped_oak_log: 'log',
  coal: 'item:coal', charcoal: 'item:coal@1', stick: 'item:stick',
  ink_sac: 'item:dye', rose_red: 'item:dye@1', cactus_green: 'item:dye@2', cocoa_beans: 'item:dye@3',
  lapis_lazuli: 'item:dye@4', bone_meal: 'item:dye@15', raw_salmon: 'item:fish@1', cooked_salmon: 'item:cooked_fish@1',
  enchanted_golden_apple: 'item:golden_apple@1',
};
let blockCatalog = [...fallbackBlockCatalog];
let catalogByName = new Map(blockCatalog.map((block) => [block.name, block]));
let defaultHotbar = ['grass', 'dirt', 'stone', 'log', 'leaves', 'sand', 'planks', 'glass', 'torch'];
let recipes = [
  { name: 'Oak Planks ×4', output: 'planks', count: 4, inputs: [{ alternatives: ['log'] }] },
  { name: 'Sticks ×4', output: 'item:stick', count: 4, inputs: [{ alternatives: ['planks'] }, { alternatives: ['planks'] }] },
];
let gameDataReady = false;
let inventoryTab = 'all';
let catalogSearch = '';
let recipeSearch = '';


const scene = new THREE.Scene();
scene.background = new THREE.Color('#91bfbd');
scene.fog = new THREE.Fog('#91bfbd', 48, 108);
const camera = new THREE.PerspectiveCamera(78, 1, 0.08, 180);
camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.setSize(window.innerWidth, window.innerHeight, false);

const hemisphere = new THREE.HemisphereLight(0xe0f3f0, 0x59684a, 1.5);
scene.add(hemisphere);
const sunLight = new THREE.DirectionalLight(0xffe6b4, 2.5);
sunLight.position.set(-40, 70, 35);
scene.add(sunLight);
const worldGroup = new THREE.Group();
scene.add(worldGroup);
const mobGroup = new THREE.Group();
scene.add(mobGroup);
const remoteEntityGroup = new THREE.Group();
remoteEntityGroup.visible = false;
scene.add(remoteEntityGroup);
const remoteEntities = new Map();
const mobs = [];
const targetOutline = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.025, 1.025, 1.025)),
  new THREE.LineBasicMaterial({ color: 0xf1f6e9, transparent: true, opacity: 0.72 }),
);
targetOutline.visible = false;
scene.add(targetOutline);

function hash32(a, b, c, seed) {
  let value = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 2246822519) + Math.imul(seed | 0, 3266489917)) | 0;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return (value ^ (value >>> 16)) >>> 0;
}
function hash01(a, b, c, seed) { return hash32(a, b, c, seed) / 4294967295; }
function smooth(t) { return t * t * (3 - 2 * t); }
function lerp(a, b, t) { return a + (b - a) * t; }
function valueNoise(x, z, scale, seed) {
  const gx = x / scale;
  const gz = z / scale;
  const ix = Math.floor(gx);
  const iz = Math.floor(gz);
  const tx = smooth(gx - ix);
  const tz = smooth(gz - iz);
  const a = hash01(ix, 0, iz, seed);
  const b = hash01(ix + 1, 0, iz, seed);
  const c = hash01(ix, 0, iz + 1, seed);
  const d = hash01(ix + 1, 0, iz + 1, seed);
  return lerp(lerp(a, b, tx), lerp(c, d, tx), tz);
}
function valueNoise3D(x, y, z, scale, seed) {
  const gx = x / scale;
  const gy = y / scale;
  const gz = z / scale;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const iz = Math.floor(gz);
  const tx = smooth(gx - ix);
  const ty = smooth(gy - iy);
  const tz = smooth(gz - iz);
  const lower = lerp(
    lerp(hash01(ix, iy, iz, seed), hash01(ix + 1, iy, iz, seed), tx),
    lerp(hash01(ix, iy, iz + 1, seed), hash01(ix + 1, iy, iz + 1, seed), tx),
    tz,
  );
  const upper = lerp(
    lerp(hash01(ix, iy + 1, iz, seed), hash01(ix + 1, iy + 1, iz, seed), tx),
    lerp(hash01(ix, iy + 1, iz + 1, seed), hash01(ix + 1, iy + 1, iz + 1, seed), tx),
    tz,
  );
  return lerp(lower, upper, ty);
}
function biomeAt(x, z, seed) {
  const temperature = valueNoise(x, z, 48, seed + 271);
  const rainfall = valueNoise(x, z, 39, seed + 619);
  const elevation = heightAt(x, z, seed);
  if (elevation <= 4) return 'river';
  if (temperature < 0.2) return 'snowy_tundra';
  if (temperature > 0.79 && rainfall < 0.49) return 'desert';
  if (temperature > 0.76 && rainfall < 0.69) return 'savanna';
  if (temperature > 0.64 && rainfall > 0.7) return 'jungle';
  if (rainfall > 0.8) return 'swamp';
  if (rainfall > 0.62 && temperature < 0.5) return 'taiga';
  if (elevation >= 14) return 'mountains';
  if (rainfall > 0.43) return 'forest';
  return 'plains';
}
function heightAt(x, z, seed) {
  const broad = (valueNoise(x, z, 22, seed) - 0.5) * 10;
  const hills = (valueNoise(x, z, 9, seed + 19) - 0.5) * 4;
  const detail = (valueNoise(x, z, 4, seed + 83) - 0.5) * 1.6;
  const rolling = Math.sin((x + seed % 41) * 0.115) * 0.75 + Math.cos((z - seed % 29) * 0.13) * 0.8;
  return THREE.MathUtils.clamp(Math.round(7 + broad + hills + detail + rolling), 2, 17);
}
function keyOf(x, y, z) { return `${x},${y},${z}`; }
function parseKey(key) { return key.split(',').map(Number); }
function setBlockInMap(map, x, y, z, name) {
  const key = keyOf(x, y, z);
  if (name) map.set(key, name);
  else map.delete(key);
}

function makeTexture(base, accent, pattern = 'noise', seed = 1) {
  const canvasTex = document.createElement('canvas');
  canvasTex.width = 16;
  canvasTex.height = 16;
  const ctx = canvasTex.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 16, 16);
  for (let i = 0; i < 54; i += 1) {
    const r = hash32(i, seed, 7, seed);
    const x = r % 16;
    const y = (r >>> 8) % 16;
    const shade = (r >>> 18) % 5;
    ctx.globalAlpha = 0.1 + shade * 0.035;
    ctx.fillStyle = (r & 1) ? accent : '#ffffff';
    const size = pattern === 'grain' && i % 3 === 0 ? 2 : 1;
    ctx.fillRect(x, y, size, 1);
  }
  ctx.globalAlpha = 1;
  if (pattern === 'grass-top') {
    for (let i = 0; i < 18; i += 1) {
      const r = hash32(i, seed, 13, seed);
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = (r & 1) ? '#e4e79a' : '#315c3d';
      ctx.fillRect(r % 16, (r >>> 8) % 16, 1, 1);
    }
    ctx.globalAlpha = 1;
  } else if (pattern === 'log-top') {
    ctx.strokeStyle = 'rgba(60,40,24,.58)';
    ctx.lineWidth = 1;
    ctx.strokeRect(2, 2, 12, 12);
    ctx.strokeRect(5, 5, 6, 6);
    ctx.fillStyle = 'rgba(238,202,143,.35)';
    ctx.fillRect(7, 7, 2, 2);
  } else if (pattern === 'glass') {
    ctx.clearRect(0, 0, 16, 16);
    ctx.fillStyle = 'rgba(169,219,213,.35)';
    ctx.fillRect(1, 1, 14, 14);
    ctx.fillStyle = 'rgba(235,255,238,.7)';
    ctx.fillRect(2, 2, 2, 12);
    ctx.fillRect(2, 2, 11, 1);
    ctx.fillStyle = 'rgba(60,122,126,.35)';
    ctx.fillRect(12, 4, 2, 10);
  } else if (pattern === 'ore') {
    for (let i = 0; i < 10; i += 1) {
      const r = hash32(i, seed, 29, seed);
      ctx.fillStyle = i % 2 ? '#aa7954' : '#cf9a67';
      ctx.fillRect(r % 15, (r >>> 9) % 15, 2, 2);
    }
  } else if (pattern === 'cobble') {
    for (let i = 0; i < 13; i += 1) {
      const r = hash32(i, seed, 37, seed);
      const x = r % 13;
      const y = (r >>> 8) % 13;
      const width = 3 + ((r >>> 16) % 3);
      const height = 2 + ((r >>> 21) % 3);
      ctx.fillStyle = i % 2 ? '#9ca096' : '#61675f';
      ctx.fillRect(x, y, width, height);
      ctx.fillStyle = 'rgba(230,232,218,.28)';
      ctx.fillRect(x, y, width, 1);
      ctx.fillStyle = 'rgba(35,41,37,.42)';
      ctx.fillRect(x, y + height - 1, width, 1);
    }
  } else if (pattern === 'masonry') {
    ctx.fillStyle = 'rgba(50,57,54,.55)';
    for (let y = 0; y < 16; y += 5) {
      ctx.fillRect(0, y, 16, 1);
      const offset = Math.floor(y / 5) % 2 ? 0 : 7;
      for (let x = offset; x < 16; x += 8) ctx.fillRect(x, y, 1, 5);
    }
    ctx.fillStyle = 'rgba(237,236,220,.25)';
    ctx.fillRect(1, 1, 5, 1);
    ctx.fillRect(9, 6, 5, 1);
  } else if (pattern === 'brick') {
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#e1b68f';
    for (let y = 0; y < 16; y += 5) {
      ctx.fillRect(0, y, 16, 1);
      const offset = Math.floor(y / 5) % 2 ? 0 : 4;
      for (let x = offset; x < 16; x += 8) ctx.fillRect(x, y, 1, 5);
    }
    ctx.globalAlpha = 1;
  } else if (pattern === 'book') {
    const colors = ['#a74f40', '#d2a85c', '#4e7791', '#638355'];
    for (let x = 1; x < 16; x += 4) {
      ctx.fillStyle = colors[Math.floor(x / 4) % colors.length];
      ctx.fillRect(x, 2, 3, 12);
      ctx.fillStyle = 'rgba(255,238,187,.6)';
      ctx.fillRect(x, 3, 1, 10);
    }
  } else if (pattern === 'tnt') {
    ctx.fillStyle = '#e6d8c0';
    ctx.fillRect(0, 5, 16, 6);
    ctx.fillStyle = '#593e36';
    for (let x = 3; x < 15; x += 5) ctx.fillRect(x, 7, 2, 2);
  }
  const texture = new THREE.CanvasTexture(canvasTex);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  return texture;
}

const textureSets = {
  grassTop: makeTexture('#79a95d', '#b3cf75', 'grass-top', 2),
  grassSide: makeTexture('#70583b', '#94724d', 'noise', 4),
  dirt: makeTexture('#806145', '#bc9161', 'noise', 5),
  stone: makeTexture('#858b81', '#c4c8b6', 'noise', 7),
  cobble: makeTexture('#73796f', '#aeb1a3', 'cobble', 29),
  masonry: makeTexture('#99998c', '#d1cebd', 'masonry', 30),
  ore: makeTexture('#777b70', '#aeaa91', 'ore', 8),
  woodSide: makeTexture('#916c43', '#c69b5f', 'grain', 9),
  woodTop: makeTexture('#b28b58', '#d8b975', 'log-top', 11),
  leaves: makeTexture('#54824e', '#8fb06a', 'noise', 12),
  sand: makeTexture('#d9c78d', '#f2dfaa', 'noise', 14),
  planks: makeTexture('#b48958', '#dfbb7d', 'grain', 17),
  glass: makeTexture('#b4d9d3', '#e7fff3', 'glass', 18),
  torch: makeTexture('#a8783f', '#f5c86b', 'grain', 19),
  brick: makeTexture('#a96b54', '#d4a07b', 'brick', 22),
  wool: makeTexture('#dfd9c9', '#f7f1dd', 'noise', 23),
  book: makeTexture('#896847', '#ceb078', 'book', 24),
  tnt: makeTexture('#b74f42', '#e9a290', 'tnt', 25),
  water: makeTexture('#5a9fa7', '#a2d6c7', 'noise', 21),
};
const materialCache = new Map();
function mat(texture, options = {}) {
  return new THREE.MeshLambertMaterial({ map: texture, ...options });
}
function materialsFor(category) {
  if (materialCache.has(category)) return materialCache.get(category);
  let result;
  if (category === 'grass') result = [mat(textureSets.grassSide), mat(textureSets.grassSide), mat(textureSets.grassTop), mat(textureSets.dirt), mat(textureSets.grassSide), mat(textureSets.grassSide)];
  else if (category === 'dirt') result = mat(textureSets.dirt);
  else if (category === 'stone') result = mat(textureSets.stone);
  else if (category === 'cobble') result = mat(textureSets.cobble);
  else if (category === 'masonry') result = mat(textureSets.masonry);
  else if (category === 'ore') result = mat(textureSets.ore);
  else if (category === 'wood') result = [mat(textureSets.woodSide), mat(textureSets.woodSide), mat(textureSets.woodTop), mat(textureSets.woodTop), mat(textureSets.woodSide), mat(textureSets.woodSide)];
  else if (category === 'leaves') result = mat(textureSets.leaves, { color: 0xffffff, transparent: true, opacity: 0.94, alphaTest: 0.02 });
  else if (category === 'sand') result = mat(textureSets.sand);
  else if (category === 'planks') result = mat(textureSets.planks);
  else if (category === 'glass') result = mat(textureSets.glass, { transparent: true, opacity: 0.52, depthWrite: false });
  else if (category === 'water') result = mat(textureSets.water, { transparent: true, opacity: 0.52, depthWrite: false, side: THREE.DoubleSide });
  else if (category === 'torch') result = mat(textureSets.torch, { emissive: 0x6f4118, emissiveIntensity: 0.23 });
  else if (category === 'brick') result = mat(textureSets.brick);
  else if (category === 'wool') result = mat(textureSets.wool);
  else if (category === 'book') result = mat(textureSets.book);
  else if (category === 'tnt') result = mat(textureSets.tnt);
  else if (category === 'craft') result = mat(textureSets.planks);
  else result = mat(textureSets.stone);
  materialCache.set(category, result);
  return result;
}

function visualCategory(blockName) {
  const name = String(blockName || '').toLowerCase();
  if (name.includes('water') || name.includes('lava')) return 'water';
  if (name.includes('glass') || name.includes('ice')) return 'glass';
  if (name.includes('wool') || name.includes('concrete') || name.includes('terracotta')) return 'wool';
  if (name.includes('tnt')) return 'tnt';
  if (name.includes('bookshelf')) return 'book';
  if (name.includes('crafting_table')) return 'craft';
  if (name.includes('leaves') || name.includes('vine') || name.includes('sapling') || name.includes('flower') || name.includes('mushroom') || name.includes('cactus') || name.includes('tallgrass') || name.includes('fern') || name.includes('deadbush') || name.includes('moss_carpet') || name.includes('moss_block')) return 'leaves';
  if (name.includes('grass') || name.includes('mycelium') || name.includes('podzol')) return 'grass';
  if (name.includes('dirt') || name.includes('mud') || name.includes('clay')) return 'dirt';
  if (name.includes('sand') || name.includes('gravel') || name.includes('snow')) return 'sand';
  if (name.includes('log') || name.includes('wood') || name.includes('stem') || name.includes('hyphae')) return 'wood';
  if (name.includes('planks') || name.includes('bamboo_block')) return 'planks';
  if (name.includes('cobble')) return 'cobble';
  if (name.includes('stonebrick') || name.includes('stone_brick')) return 'masonry';
  if (name.includes('ore') || name.includes('raw_')) return 'ore';
  if (name.includes('torch') || name.includes('lantern') || name.includes('candle') || name.includes('glowstone')) return 'torch';
  if (name.includes('brick') || name.includes('terracotta')) return 'brick';
  if (name.includes('stone') || name.includes('deepslate') || name.includes('cobble') || name.includes('andesite') || name.includes('granite') || name.includes('diorite') || name.includes('basalt')) return 'stone';
  return 'stone';
}
function canonicalCatalogKey(value, onlyBlocks = false) {
  const name = String(value || '');
  const direct = catalogByName.get(name);
  if (direct && (!onlyBlocks || direct.kind === 'block')) return name;
  const alias = legacyBlockAliases[name];
  if (alias) {
    const entry = catalogByName.get(alias);
    if (entry && (!onlyBlocks || entry.kind === 'block')) return alias;
  }
  return '';
}
function applyGameData(payload) {
  if (!Array.isArray(payload?.catalog) || !Array.isArray(payload?.recipes)) return;
  const oldInventory = inventory || {};
  const oldHotbar = Array.isArray(hotbar) ? hotbar : [...defaultHotbar];
  blockCatalog = payload.catalog;
  catalogByName = new Map(blockCatalog.map((item) => [item.name, item]));
  defaultHotbar = ['grass', 'dirt', 'stone', 'log', 'leaves', 'sand', 'planks', 'glass', 'torch']
    .map((name) => canonicalCatalogKey(name, true))
    .filter(Boolean);
  while (defaultHotbar.length < 9) defaultHotbar.push(defaultHotbar[defaultHotbar.length % Math.max(1, defaultHotbar.length)] || 'stone');
  recipes = [...payload.recipes, ...(Array.isArray(payload.smelting) ? payload.smelting : [])];
  const migratedInventory = Object.fromEntries(blockCatalog.map((item) => [item.name, gameMode === 'creative' ? 64 : 0]));
  for (const [name, count] of Object.entries(oldInventory)) {
    const key = canonicalCatalogKey(name);
    if (key) migratedInventory[key] = gameMode === 'creative' ? 64 : Number(migratedInventory[key] || 0) + (Number(count) || 0);
  }
  inventory = migratedInventory;
  hotbar = oldHotbar.map((name) => canonicalCatalogKey(name, true) || defaultHotbar[0] || 'stone').slice(0, 9);
  while (hotbar.length < 9) hotbar.push(defaultHotbar[hotbar.length] || 'stone');

  for (const [key, name] of worldMap) {
    const canonical = canonicalCatalogKey(name, true);
    if (canonical && canonical !== name) worldMap.set(key, canonical);
  }
  for (const [key, name] of edits) {
    if (!name) continue;
    const canonical = canonicalCatalogKey(name, true);
    if (canonical && canonical !== name) edits.set(key, canonical);
  }
  gameDataReady = true;
  drawBlockWorld(worldMap);
  renderHotbar();
  renderInventory();
  updateWorldMeta();
  scheduleSave();
}
async function loadGameData() {
  try {
    const response = await fetch('/api/game-data?version=1.12.2');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    applyGameData(payload);
  } catch (error) {
    console.warn('Using the built-in fallback catalog:', error);
    const note = $('catalog-status');
    if (note) note.textContent = 'Offline catalog · reconnect to load all 1.12.2 items';
  }
}
function itemInfo(name) {
  const known = catalogByName.get(name) || catalogByName.get(canonicalCatalogKey(name));
  if (known) return known;
  const category = visualCategory(name);
  const label = String(name || 'Unknown item').split('_').map((word) => word ? word[0].toUpperCase() + word.slice(1) : '').join(' ');
  return { name, label, icon: category, category };
}
function isWater(name) { return name === 'water' || name === 'lava' || String(name).includes('water') || String(name).includes('lava'); }
function isSolid(name) { return Boolean(name) && !isWater(name); }

let worldSeed = 482901;
let worldName = 'Cedar Valley';
let gameMode = 'creative';
let difficulty = 'normal';
let experience = 0;
let spawnPosition = null;
let nextMobId = 1;
let hostileSpawnTimer = 0;
let hotbar = [...defaultHotbar];
let inventory = {};
let selectedSlot = 0;
let worldTime = 56;
let playSeconds = 0;
let weather = 'clear';
let screen = 'menu';
let gameStarted = false;
let remoteActive = false;
let remoteStatus = 'disconnected';
let remoteBlocks = new Map();
let remoteHotbar = Array.from({ length: 9 }, () => null);
let remoteSelected = 0;
let remoteSocket = null;
let remoteSession = null;
let hostControlToken = null;
let hostStatusPolling = null;
let hostStatusBusy = false;
let hostStatusCache = null;
let pointerLocked = false;
let lastFrame = performance.now();
let frameCount = 0;
let fpsWindowStart = performance.now();
let fpsEstimate = 60;
let targetBlock = null;
let saveTimeout = null;
let toastTimeout = null;
let audioContext = null;
let ambientNodes = null;
let ambientEnabled = false;
let lastHungerTick = 0;
let lastRegenTick = 0;
let lastStarveTick = 0;
let lastWorldSave = 0;
let lastTargetUpdate = 0;
let remoteTargetHint = 'Server world stream';
let lastDisplayedServerError = '';
const hideableLayers = ['menu-screen', 'pause-screen', 'inventory-screen', 'server-screen', 'settings-screen', 'chat-screen'];
const remoteControls = {
  KeyW: 'forward', KeyS: 'back', KeyA: 'left', KeyD: 'right',
  Space: 'jump', ShiftLeft: 'sneak', ShiftRight: 'sneak', ControlLeft: 'sprint', ControlRight: 'sprint',
};

function drawBlockWorld(map) {
  while (worldGroup.children.length) worldGroup.remove(worldGroup.children[0]);
  const groups = new Map();
  for (const [key, name] of map) {
    const category = visualCategory(name);
    const tint = catalogByName.get(name)?.tint || '#ffffff';
    const groupKey = `${category}|${tint}`;
    if (!groups.has(groupKey)) groups.set(groupKey, { category, tint, positions: [] });
    const [x, y, z] = parseKey(key);
    groups.get(groupKey).positions.push([x, y, z]);
  }
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  for (const { category, tint, positions } of groups.values()) {
    if (!positions.length) continue;
    const mesh = new THREE.InstancedMesh(blockGeometry, materialsFor(category), positions.length);
    mesh.name = `block-${category}`;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    const color = new THREE.Color(tint);
    for (let index = 0; index < positions.length; index += 1) {
      const [x, y, z] = positions[index];
      position.set(x + 0.5, y + 0.5, z + 0.5);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    worldGroup.add(mesh);
  }
}

function generateWorld(seed, savedEdits = []) {
  worldSeed = Number.isFinite(Number(seed)) ? Number(seed) : 482901;
  worldMap.clear();
  edits.clear();
  const radius = 48;
  const seaLevel = 5;
  for (let x = -radius; x <= radius; x += 1) {
    for (let z = -radius; z <= radius; z += 1) {
      const surface = heightAt(x, z, worldSeed);
      const biome = biomeAt(x, z, worldSeed);
      const shoreline = surface <= seaLevel + 1;
      const desert = biome === 'desert';
      for (let y = 0; y <= surface; y += 1) {
        let name = 'stone';
        if (y === 0) name = 'bedrock';
        else if (y === surface) {
          const topRoll = hash01(x, y, z, worldSeed + 901);
          if (shoreline || desert) name = 'sand';
          else if (biome === 'snowy_tundra') name = 'snow';
          else if (biome === 'taiga') name = 'dirt@2';
          else if (biome === 'savanna' && topRoll < 0.36) name = 'dirt@1';
          else if (biome === 'swamp' && topRoll < 0.12) name = 'mycelium';
          else name = 'grass';
        } else if (y >= surface - 3) name = shoreline || desert ? 'sand' : 'dirt';
        else if (y > 1 && y < surface - 3) {
          const caveA = valueNoise3D(x, y, z, 8, worldSeed + 411);
          const caveB = valueNoise3D(x + 11, y - 7, z, 4, worldSeed + 991);
          const protectedSpawn = Math.abs(x) < 6 && Math.abs(z - 18) < 6;
          if (!protectedSpawn && y > 2 && caveA > 0.69 && caveB > 0.56) continue;
          const roll = hash01(x, y, z, worldSeed + 197);
          if (y < 13 && roll < 0.0035) name = 'diamond_ore';
          else if (y < 18 && roll < 0.007) name = 'redstone_ore';
          else if (y < 28 && roll < 0.010) name = biome === 'mountains' ? 'emerald_ore' : 'gold_ore';
          else if (y < 34 && roll < 0.015) name = 'lapis_ore';
          else if (roll < 0.029) name = 'coal_ore';
          else if (roll < 0.040) name = 'iron_ore';
        }
        worldMap.set(keyOf(x, y, z), name);
      }
      if (surface < seaLevel) {
        for (let y = surface + 1; y <= seaLevel; y += 1) worldMap.set(keyOf(x, y, z), 'water');
      }
    }
  }

  for (let x = -radius + 3; x <= radius - 3; x += 3) {
    for (let z = -radius + 3; z <= radius - 3; z += 3) {
      const chance = hash01(x, 3, z, worldSeed + 1234);
      if (chance > 0.115 || (Math.abs(x) < 6 && Math.abs(z - 18) < 6)) continue;
      const ground = heightAt(x, z, worldSeed);
      const biome = biomeAt(x, z, worldSeed);
      if (ground <= seaLevel + 1 || biome === 'desert') continue;
      const treeType = biome === 'snowy_tundra' || biome === 'taiga' ? 1 : (biome === 'jungle' ? 3 : (biome === 'savanna' ? 4 : Math.floor(hash01(x, 7, z, worldSeed + 18) * 4)));
      const logName = treeType === 4 ? 'log2' : (treeType === 1 ? 'log@1' : (treeType === 2 ? 'log@2' : (treeType === 3 ? 'log@3' : 'log')));
      const leavesName = treeType === 4 ? 'leaves2' : (treeType === 1 ? 'leaves@1' : (treeType === 2 ? 'leaves@2' : (treeType === 3 ? 'leaves@3' : 'leaves')));
      const trunkHeight = 3 + Math.floor(hash01(x, 8, z, worldSeed) * 3);
      for (let dy = 1; dy <= trunkHeight; dy += 1) worldMap.set(keyOf(x, ground + dy, z), logName);
      const crownY = ground + trunkHeight;
      const spread = treeType === 3 ? 3 : 2;
      for (let dx = -spread; dx <= spread; dx += 1) {
        for (let dz = -spread; dz <= spread; dz += 1) {
          for (let dy = -1; dy <= 2; dy += 1) {
            const distance = Math.abs(dx) + Math.abs(dz) + Math.max(0, dy - 1);
            if (distance > spread + 2 || (Math.abs(dx) === spread && Math.abs(dz) === spread)) continue;
            const leafKey = keyOf(x + dx, crownY + dy, z + dz);
            if (!worldMap.has(leafKey)) worldMap.set(leafKey, leavesName);
          }
        }
      }
    }
  }

  for (let x = -radius + 2; x <= radius - 2; x += 2) {
    for (let z = -radius + 2; z <= radius - 2; z += 2) {
      const surface = heightAt(x, z, worldSeed);
      const biome = biomeAt(x, z, worldSeed);
      const roll = hash01(x, 17, z, worldSeed + 882);
      if (surface <= seaLevel + 1 || worldMap.has(keyOf(x, surface + 1, z))) continue;
      if (biome === 'desert' && roll < 0.13) {
        const height = 1 + Math.floor(hash01(x, 22, z, worldSeed) * 3);
        for (let dy = 1; dy <= height; dy += 1) worldMap.set(keyOf(x, surface + dy, z), 'cactus');
      } else if (biome === 'plains' && roll < 0.08) {
        const flower = roll < 0.025 ? `red_flower@${Math.floor(hash01(x, 4, z, worldSeed) * 9)}` : 'yellow_flower';
        worldMap.set(keyOf(x, surface + 1, z), flower);
      } else if ((biome === 'forest' || biome === 'swamp') && roll < 0.025) {
        worldMap.set(keyOf(x, surface + 1, z), 'red_mushroom');
      }
    }
  }

  for (const [key, value] of savedEdits || []) {
    if (typeof key !== 'string') continue;
    const canonical = value ? (canonicalCatalogKey(value, true) || String(value)) : null;
    if (canonical) worldMap.set(key, canonical);
    else worldMap.delete(key);
    edits.set(key, canonical);
  }
  drawBlockWorld(worldMap);
  spawnMobs();
}
function getSurfaceY(x, z) {
  for (let y = 32; y >= -1; y -= 1) {
    const name = worldMap.get(keyOf(Math.floor(x), y, Math.floor(z)));
    const value = String(name || '');
    const decoration = ['leaves', 'log', 'flower', 'mushroom', 'cactus', 'sapling', 'tallgrass', 'fern'].some((part) => value.includes(part));
    if (isSolid(name) && !decoration) return y + 1;
  }
  return 8;
}
function findStartPosition() {
  for (let radius = 0; radius <= 8; radius += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dz = -radius; dz <= radius; dz += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;
        const x = dx;
        const z = 18 + dz;
        const groundY = getSurfaceY(x, z);
        const groundName = worldMap.get(keyOf(Math.floor(x), groundY - 1, Math.floor(z)));
        if (groundName && !isWater(groundName)) return new THREE.Vector3(x + 0.5, groundY + 0.001, z + 0.5);
      }
    }
  }
  return new THREE.Vector3(0.5, getSurfaceY(0, 18) + 0.001, 18.5);
}

const mobPalette = {
  pig: { body: 0xd99491, head: 0xe7a9a1, leg: 0xb66f70 },
  cow: { body: 0x8e6445, head: 0xb68b65, leg: 0x514238 },
  sheep: { body: 0xe3e1d5, head: 0x8b6852, leg: 0x534b45 },
  chicken: { body: 0xf0eee4, head: 0xf3eee3, leg: 0xd09c37 },
  rabbit: { body: 0x947657, head: 0xb18d68, leg: 0x594638 },
  zombie: { body: 0x3e8261, head: 0x57916b, leg: 0x324b87 },
  skeleton: { body: 0xcac9bc, head: 0xe2dfd0, leg: 0x9a988e },
  creeper: { body: 0x3b9753, head: 0x54aa62, leg: 0x317943 },
  spider: { body: 0x332a27, head: 0x4b3931, leg: 0x24211f },
  enderman: { body: 0x211e2d, head: 0x31283d, leg: 0x17151f },
  witch: { body: 0x64504b, head: 0x887267, leg: 0x4e4052 },
  wolf: { body: 0x9b9c91, head: 0xb2b2a5, leg: 0x696b64 },
  ocelot: { body: 0xd6b45c, head: 0xe1c678, leg: 0x725b30 },
  horse: { body: 0x8a6242, head: 0xa27a59, leg: 0x4c3a2e },
  villager: { body: 0x886b52, head: 0xc39e75, leg: 0x5b4c43 },
  squid: { body: 0x454b86, head: 0x606bb3, leg: 0x373c70 },
  llama: { body: 0xc8ad86, head: 0xd3bb97, leg: 0x9b8060 },
  donkey: { body: 0x796c5b, head: 0x91816c, leg: 0x554c43 },
  mule: { body: 0x80694f, head: 0x967b5e, leg: 0x574535 },
  polar_bear: { body: 0xe4e2d5, head: 0xf0eee3, leg: 0xb5b7ae },
  mooshroom: { body: 0xa64c42, head: 0xc07769, leg: 0x754d41 },
  parrot: { body: 0x37a56d, head: 0xe3bf41, leg: 0xa44d3c },
  bat: { body: 0x4f3f4d, head: 0x6c5666, leg: 0x352d37 },
};
const mobMaterialCache = new Map();
function mobMaterial(color) {
  const key = Number(color) >>> 0;
  if (!mobMaterialCache.has(key)) {
    const base = `#${new THREE.Color(key).getHexString()}`;
    const accent = `#${new THREE.Color(key).lerp(new THREE.Color(0xffffff), 0.24).getHexString()}`;
    const texture = makeTexture(base, accent, 'noise', key);
    mobMaterialCache.set(key, new THREE.MeshStandardMaterial({ map: texture, roughness: 0.88, flatShading: true }));
  }
  return mobMaterialCache.get(key);
}
function addMobPart(group, size, position, material, mob, legs = false) {
  const part = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  part.position.set(...position);
  part.castShadow = false;
  part.receiveShadow = false;
  part.userData.mob = mob;
  if (legs) mob.legs.push(part);
  group.add(part);
  return part;
}
function createMobMesh(mob, targetGroup = mobGroup) {
  const palette = mobPalette[mob.type] || mobPalette.pig;
  const group = new THREE.Group();
  mob.legs = [];
  const body = mobMaterial(palette.body);
  const head = mobMaterial(palette.head);
  const leg = mobMaterial(palette.leg);
  const dark = mobMaterial(mob.type === 'creeper' ? 0x183b2a : 0x493c32);
  if (['pig', 'cow', 'sheep', 'chicken', 'rabbit', 'wolf', 'ocelot', 'horse', 'squid', 'llama', 'donkey', 'mule', 'polar_bear', 'mooshroom', 'parrot', 'bat'].includes(mob.type)) {
    const chicken = mob.type === 'chicken';
    const bird = ['chicken', 'parrot', 'bat'].includes(mob.type);
    const rabbit = mob.type === 'rabbit';
    const horse = ['horse', 'llama', 'donkey', 'mule'].includes(mob.type);
    const squid = mob.type === 'squid';
    const polarBear = mob.type === 'polar_bear';
    const bodySize = bird ? [0.48, 0.5, 0.55] : (rabbit ? [0.44, 0.42, 0.62] : (horse ? [0.9, 0.9, mob.type === 'llama' ? 1.1 : 1.35] : (squid ? [0.7, 0.75, 0.7] : (polarBear ? [0.92, 0.82, 1.15] : [0.78, 0.68, 1.05]))));
    addMobPart(group, bodySize, bird ? [0, 0.49, 0] : [0, rabbit ? 0.42 : (horse ? 0.81 : 0.65), 0], body, mob);
    addMobPart(group, chicken ? [0.34, 0.34, 0.35] : (bird ? [0.38, 0.38, 0.38] : [0.43, 0.42, 0.42]), bird ? [0, 0.82, -0.29] : [0, rabbit ? 0.7 : (horse ? 1.35 : 0.77), -0.58], head, mob);
    if (mob.type === 'pig' || mob.type === 'cow') addMobPart(group, [0.29, 0.2, 0.15], [0, 0.68, -0.8], mobMaterial(mob.type === 'pig' ? 0xc66f73 : 0x754e38), mob);
    if (mob.type === 'chicken') addMobPart(group, [0.12, 0.12, 0.2], [0, 0.75, -0.48], mobMaterial(0xe7a735), mob);
    const legSize = bird ? [0.1, 0.28, 0.1] : [0.18, 0.43, 0.2];
    for (const x of [-0.24, 0.24]) for (const z of [-0.34, 0.34]) {
      addMobPart(group, legSize, [x, bird ? 0.16 : 0.22, z], leg, mob, true);
    }
    if (mob.type === 'cow' || mob.type === 'mooshroom') {
      addMobPart(group, [0.12, 0.17, 0.12], [-0.26, 0.9, -0.65], mobMaterial(0xd8cfb7), mob);
      addMobPart(group, [0.12, 0.17, 0.12], [0.26, 0.9, -0.65], mobMaterial(0xd8cfb7), mob);
    }
    if (rabbit) {
      addMobPart(group, [0.1, 0.38, 0.1], [-0.12, 0.98, -0.6], head, mob);
      addMobPart(group, [0.1, 0.38, 0.1], [0.12, 0.98, -0.6], head, mob);
    }
  } else if (mob.type === 'spider') {
    addMobPart(group, [0.78, 0.42, 1.05], [0, 0.53, 0.05], body, mob);
    addMobPart(group, [0.45, 0.38, 0.42], [0, 0.7, -0.63], head, mob);
    for (const side of [-1, 1]) {
      for (const z of [-0.52, -0.2, 0.12, 0.43]) {
        const legPart = addMobPart(group, [0.58, 0.09, 0.1], [side * 0.56, 0.46, z], leg, mob, true);
        legPart.rotation.y = side * 0.35;
      }
    }
    addMobPart(group, [0.1, 0.09, 0.04], [-0.12, 0.77, -0.85], mobMaterial(0xd43227), mob);
    addMobPart(group, [0.1, 0.09, 0.04], [0.12, 0.77, -0.85], mobMaterial(0xd43227), mob);
  } else {
    const creeper = mob.type === 'creeper';
    const skeleton = mob.type === 'skeleton';
    const torsoMaterial = creeper ? body : mobMaterial(skeleton ? 0xbdbbb0 : (mob.type === 'zombie' ? 0x357e5b : palette.body));
    const pants = mobMaterial(skeleton ? 0x96958d : (mob.type === 'zombie' ? 0x354f8a : palette.leg));
    addMobPart(group, creeper ? [0.58, 0.86, 0.42] : [0.54, 0.8, 0.3], [0, 0.92, 0], torsoMaterial, mob);
    addMobPart(group, [0.54, 0.54, 0.54], [0, 1.62, -0.02], head, mob);
    if (creeper) {
      addMobPart(group, [0.11, 0.13, 0.05], [-0.13, 1.72, -0.3], dark, mob);
      addMobPart(group, [0.11, 0.13, 0.05], [0.13, 1.72, -0.3], dark, mob);
      addMobPart(group, [0.2, 0.2, 0.05], [0, 1.48, -0.3], dark, mob);
    } else {
      addMobPart(group, [0.16, 0.13, 0.05], [-0.13, 1.7, -0.3], dark, mob);
      addMobPart(group, [0.16, 0.13, 0.05], [0.13, 1.7, -0.3], dark, mob);
      addMobPart(group, [0.14, 0.28, 0.05], [0, 1.42, -0.3], dark, mob);
      addMobPart(group, [0.18, 0.72, 0.2], [-0.42, 0.95, 0], torsoMaterial, mob);
      addMobPart(group, [0.18, 0.72, 0.2], [0.42, 0.95, 0], torsoMaterial, mob);
    }
    for (const x of [-0.17, 0.17]) addMobPart(group, [0.19, 0.68, 0.21], [x, 0.34, 0.02], pants, mob, true);
  }
  if (mob.type === 'enderman') group.scale.set(0.82, 1.32, 0.82);
  if (mob.type === 'witch') group.scale.set(0.92, 1.06, 0.92);
  group.position.set(mob.x + 0.5, mob.y, mob.z + 0.5);
  group.userData.mob = mob;
  mob.mesh = group;
  targetGroup.add(group);
  return group;
}

const remotePlayerMaterials = new Map();
function remotePlayerMaterial(username, part) {
  const cacheKey = `${username || 'Player'}:${part}`;
  if (remotePlayerMaterials.has(cacheKey)) return remotePlayerMaterials.get(cacheKey);
  let seed = 0;
  for (const character of String(username || 'Player')) seed = (Math.imul(seed, 31) + character.charCodeAt(0)) >>> 0;
  const shirts = ['#4f7b58', '#52718e', '#8b5d54', '#a37c45', '#6f5d8c', '#407c7c'];
  const trousers = ['#344c83', '#4a535b', '#6a4e39', '#3f6948'];
  const skins = ['#c58c64', '#dfad7e', '#a96f50', '#e0bd91'];
  const base = part === 'head' ? skins[seed % skins.length] : (part === 'legs' ? trousers[seed % trousers.length] : shirts[seed % shirts.length]);
  const accent = part === 'head' ? '#5b4031' : '#e0d1a5';
  const image = document.createElement('canvas');
  image.width = 16;
  image.height = 16;
  const context = image.getContext('2d');
  context.fillStyle = base;
  context.fillRect(0, 0, 16, 16);
  for (let index = 0; index < 36; index += 1) {
    const value = hash32(index, seed, part.length, seed);
    context.globalAlpha = 0.12 + ((value >>> 16) % 4) * 0.07;
    context.fillStyle = value & 1 ? accent : '#ffffff';
    context.fillRect(value % 16, (value >>> 8) % 16, 1 + ((value >>> 4) % 2), 1);
  }
  context.globalAlpha = 1;
  if (part === 'head') {
    context.fillStyle = '#493327';
    context.fillRect(0, 0, 16, 4);
    context.fillRect(0, 3, 2, 5);
    context.fillRect(14, 3, 2, 5);
    context.fillStyle = '#f0e7ce';
    context.fillRect(4, 7, 2, 2);
    context.fillRect(10, 7, 2, 2);
    context.fillStyle = '#293337';
    context.fillRect(5, 7, 1, 1);
    context.fillRect(11, 7, 1, 1);
    context.fillStyle = '#8a5147';
    context.fillRect(7, 11, 2, 1);
  }
  const texture = new THREE.CanvasTexture(image);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, flatShading: true });
  remotePlayerMaterials.set(cacheKey, material);
  return material;
}

function makePlayerNameTag(username) {
  const image = document.createElement('canvas');
  image.width = 256;
  image.height = 48;
  const context = image.getContext('2d');
  context.fillStyle = 'rgba(15,22,19,.56)';
  context.fillRect(6, 5, 244, 38);
  context.font = 'bold 24px Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.lineWidth = 5;
  context.strokeStyle = 'rgba(8,12,10,.9)';
  context.strokeText(username.slice(0, 16), 128, 24, 228);
  context.fillStyle = '#f0f5e9';
  context.fillText(username.slice(0, 16), 128, 24, 228);
  const texture = new THREE.CanvasTexture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true, depthWrite: false }));
  sprite.scale.set(2.15, 0.4, 1);
  sprite.position.set(0, 2.22, 0);
  return sprite;
}

function createRemotePlayerMesh(username) {
  const group = new THREE.Group();
  const skin = remotePlayerMaterial(username, 'head');
  const shirt = remotePlayerMaterial(username, 'body');
  const pants = remotePlayerMaterial(username, 'legs');
  const addPart = (size, position, material) => {
    const part = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    part.position.set(...position);
    group.add(part);
  };
  addPart([0.48, 0.48, 0.48], [0, 1.55, 0], skin);
  addPart([0.5, 0.72, 0.28], [0, 0.94, 0], shirt);
  addPart([0.2, 0.7, 0.22], [-0.36, 0.95, 0], shirt);
  addPart([0.2, 0.7, 0.22], [0.36, 0.95, 0], shirt);
  addPart([0.22, 0.7, 0.22], [-0.13, 0.35, 0], pants);
  addPart([0.22, 0.7, 0.22], [0.13, 0.35, 0], pants);
  group.add(makePlayerNameTag(username || 'Player'));
  group.userData.remoteEntityKind = 'player';
  return group;
}

function normalizeRemoteMobType(name) {
  const value = String(name || '').toLowerCase().replace(/^minecraft:/, '').replace(/[^a-z0-9_]/g, '');
  const aliases = {
    cave_spider: 'spider', husk: 'zombie', zombie_villager: 'zombie', stray: 'skeleton',
    skeleton_horse: 'horse', zombie_horse: 'horse', guardian: 'squid', elder_guardian: 'squid',
    mooshroom: 'mooshroom', snow_golem: 'villager', iron_golem: 'villager',
    evocation_illager: 'villager', vindicator: 'villager', vindication_illager: 'villager',
    silverfish: 'spider', endermite: 'spider', slime: 'pig', magma_cube: 'pig',
    ghast: 'creeper', blaze: 'skeleton', vex: 'bat',
  };
  const type = aliases[value] || value;
  return mobPalette[type] ? type : 'pig';
}

function disposeRemoteEntity(id) {
  const record = remoteEntities.get(id);
  if (!record) return;
  remoteEntityGroup.remove(record.mesh);
  record.mesh.traverse((part) => {
    if (part.geometry) part.geometry.dispose();
    if (part.isSprite && part.material) {
      part.material.map?.dispose();
      part.material.dispose();
    }
  });
  remoteEntities.delete(id);
}

function updateRemoteEntities(entries) {
  if (!Array.isArray(entries)) return;
  const seen = new Set();
  for (const entry of entries.slice(0, 80)) {
    if (!entry || entry.id === undefined || !entry.position) continue;
    const x = Number(entry.position.x);
    const y = Number(entry.position.y);
    const z = Number(entry.position.z);
    if (![x, y, z].every(Number.isFinite)) continue;
    const id = String(entry.id).slice(0, 48);
    if (!id) continue;
    const isPlayer = entry.kind === 'player' || entry.name === 'player';
    const username = String(entry.username || '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 16) || 'Player';
    const mobType = normalizeRemoteMobType(entry.name);
    const visualKey = isPlayer ? `player:${username}` : `mob:${mobType}`;
    let record = remoteEntities.get(id);
    if (record && record.visualKey !== visualKey) {
      disposeRemoteEntity(id);
      record = null;
    }
    if (!record) {
      const mesh = isPlayer
        ? createRemotePlayerMesh(username)
        : createMobMesh({ id, type: mobType, x, y, z, health: 20, legs: [] }, remoteEntityGroup);
      if (!mesh) continue;
      mesh.position.set(x, y, z);
      if (isPlayer) remoteEntityGroup.add(mesh);
      record = { mesh, visualKey };
      remoteEntities.set(id, record);
    }
    const targetPosition = record.mesh.userData.targetPosition || new THREE.Vector3(x, y, z);
    targetPosition.set(x, y, z);
    record.mesh.userData.targetPosition = targetPosition;
    record.mesh.userData.targetYaw = Number.isFinite(Number(entry.yaw)) ? Number(entry.yaw) : 0;
    record.mesh.visible = true;
    seen.add(id);
  }
  for (const id of remoteEntities.keys()) if (!seen.has(id)) disposeRemoteEntity(id);
}

function clearRemoteEntities() {
  for (const id of [...remoteEntities.keys()]) disposeRemoteEntity(id);
}

function animateRemoteEntities(dt) {
  const smoothing = 1 - Math.exp(-13 * dt);
  for (const { mesh } of remoteEntities.values()) {
    const target = mesh.userData.targetPosition;
    if (target) mesh.position.lerp(target, smoothing);
    const targetYaw = mesh.userData.targetYaw;
    if (Number.isFinite(targetYaw)) {
      const difference = THREE.MathUtils.euclideanModulo(targetYaw - mesh.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
      mesh.rotation.y += difference * smoothing;
    }
  }
}

function spawnMob(type, x, z) {
  const allowed = Object.keys(mobPalette);
  if (!allowed.includes(type)) return null;
  const aquatic = type === 'squid';
  const ground = aquatic ? 4.6 : getSurfaceY(x, z);
  const floorBlock = worldMap.get(keyOf(Math.floor(x), aquatic ? 5 : ground - 1, Math.floor(z)));
  if (aquatic ? !isWater(floorBlock) : (!floorBlock || isWater(floorBlock))) return null;
  if (mobs.some((mob) => Math.hypot(mob.x - x, mob.z - z) < 2)) return null;
  const hostile = ['zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'witch'].includes(type);
  const mob = {
    id: nextMobId++, type, x, y: ground, z,
    health: type === 'creeper' ? 16 : (hostile ? 20 : 10),
    hostile, fuse: 0, attackCooldown: 0, wanderTimer: 0, targetX: x, targetZ: z,
    phase: Math.random() * Math.PI * 2, legs: [], mesh: null,
  };
  createMobMesh(mob);
  mobs.push(mob);
  return mob;
}
function spawnMobs() {
  while (mobs.length) {
    const mob = mobs.pop();
    if (mob.mesh) mobGroup.remove(mob.mesh);
  }
  nextMobId = 1;
  hostileSpawnTimer = 0;
  const animals = ['sheep', 'pig', 'cow', 'chicken', 'rabbit', 'wolf', 'ocelot', 'horse', 'villager', 'squid'];
  for (let index = 0; index < 11; index += 1) {
    const angle = hash01(index, 53, worldSeed, worldSeed + 771) * Math.PI * 2;
    const distance = 11 + hash01(index, 91, worldSeed, worldSeed + 883) * 26;
    const x = Math.round(Math.cos(angle) * distance);
    const z = Math.round(18 + Math.sin(angle) * distance);
    const type = animals[Math.floor(hash01(index, 29, worldSeed, worldSeed + 331) * animals.length)];
    spawnMob(type, x, z);
  }
  for (let index = 0; index < 5; index += 1) {
    const x = Math.floor(-40 + hash01(index, 7, worldSeed, worldSeed + 511) * 80);
    const z = Math.floor(-30 + hash01(index, 11, worldSeed, worldSeed + 733) * 80);
    spawnMob('squid', x, z);
  }
}
function isNightTime() {
  const phase = ((worldTime % 240) + 240) % 240;
  return phase > 174 || phase < 26;
}
function explodeCreeper(mob) {
  const dx = player.position.x - (mob.x + 0.5);
  const dy = player.position.y - mob.y;
  const dz = player.position.z - (mob.z + 0.5);
  const distance = Math.hypot(dx, dy, dz);
  if (gameMode === 'survival' && distance < 5) {
    const damage = Math.max(1, Math.ceil((5 - distance) * 2.2));
    player.health = Math.max(0, player.health - damage);
    player.velocity.x += dx / Math.max(distance, 1) * 5;
    player.velocity.y = Math.max(player.velocity.y, 4.5);
    player.velocity.z += dz / Math.max(distance, 1) * 5;
    if (player.health <= 0) respawnPlayer();
  }
  for (let x = Math.floor(mob.x) - 2; x <= Math.floor(mob.x) + 2; x += 1) {
    for (let y = Math.floor(mob.y) - 1; y <= Math.floor(mob.y) + 3; y += 1) {
      for (let z = Math.floor(mob.z) - 2; z <= Math.floor(mob.z) + 2; z += 1) {
        if (Math.hypot(x - mob.x, (y - mob.y) * 0.8, z - mob.z) > 2.4) continue;
        const key = keyOf(x, y, z);
        if (worldMap.get(key) && worldMap.get(key) !== 'bedrock') { worldMap.delete(key); edits.set(key, null); }
      }
    }
  }
  mobGroup.remove(mob.mesh);
  const index = mobs.indexOf(mob);
  if (index >= 0) mobs.splice(index, 1);
  drawBlockWorld(worldMap);
  updateHud();
  scheduleSave();
  showToast('Creeper exploded!');
}
function updateMobs(dt) {
  if (remoteActive || screen !== 'game') return;
  mobGroup.visible = true;
  const night = isNightTime() && difficulty !== 'peaceful';
  hostileSpawnTimer -= dt;
  if (night && gameMode === 'survival' && hostileSpawnTimer <= 0 && mobs.filter((mob) => mob.hostile).length < 7) {
    hostileSpawnTimer = 12 + Math.random() * 8;
    const angle = Math.random() * Math.PI * 2;
    const distance = 10 + Math.random() * 9;
    const x = Math.floor(player.position.x + Math.cos(angle) * distance);
    const z = Math.floor(player.position.z + Math.sin(angle) * distance);
    const hostiles = ['zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'witch'];
    const type = hostiles[Math.floor(Math.random() * hostiles.length)];
    spawnMob(type, x, z);
  }
  for (let index = mobs.length - 1; index >= 0; index -= 1) {
    const mob = mobs[index];
    if (!mob.mesh) continue;
    mob.mesh.visible = !mob.hostile || night;
    if (!mob.mesh.visible) continue;
    mob.attackCooldown = Math.max(0, mob.attackCooldown - dt);
    mob.wanderTimer -= dt;
    const dx = player.position.x - (mob.x + 0.5);
    const dz = player.position.z - (mob.z + 0.5);
    const distance = Math.hypot(dx, dz);
    let moveX = 0;
    let moveZ = 0;
    if (mob.type === 'creeper' && (gameMode !== 'survival' || distance >= 3.5)) { mob.fuse = 0; mob.mesh.scale.setScalar(1); }
    if (mob.type === 'creeper' && gameMode === 'survival' && distance < 3.5) {
      mob.fuse = (mob.fuse || 0) + dt;
      mob.mesh.scale.setScalar(1 + Math.min(0.28, mob.fuse / 5) * (0.7 + Math.abs(Math.sin(mob.fuse * 16))));
      if (mob.fuse >= 1.8) { explodeCreeper(mob); continue; }
      if (distance > 2.2) { moveX = dx / Math.max(distance, 0.001); moveZ = dz / Math.max(distance, 0.001); }
    } else if (mob.hostile && gameMode === 'survival' && distance < 11) {
      if (mob.type === 'creeper') { mob.fuse = 0; mob.mesh.scale.setScalar(1); }
      if (distance > 1.45) { moveX = dx / Math.max(distance, 0.001); moveZ = dz / Math.max(distance, 0.001); }
      else if (mob.type !== 'creeper' && mob.attackCooldown <= 0) {
        const damage = difficulty === 'hard' ? 4 : (difficulty === 'easy' ? 1 : 2);
        player.health = Math.max(0, player.health - damage);
        player.velocity.x += dx / Math.max(distance, 1) * 1.5;
        player.velocity.z += dz / Math.max(distance, 1) * 1.5;
        mob.attackCooldown = 1.4;
        showToast(`${mob.type[0].toUpperCase()}${mob.type.slice(1)} hit you for ${damage}.`);
        if (player.health <= 0) respawnPlayer();
      }
    } else {
      if (mob.wanderTimer <= 0) {
        mob.wanderTimer = 2 + Math.random() * 5;
        const angle = Math.random() * Math.PI * 2;
        mob.targetX = mob.x + Math.cos(angle) * (1 + Math.random() * 3);
        mob.targetZ = mob.z + Math.sin(angle) * (1 + Math.random() * 3);
      }
      const tx = mob.targetX - mob.x;
      const tz = mob.targetZ - mob.z;
      const wanderDistance = Math.hypot(tx, tz);
      if (wanderDistance > 0.35) { moveX = tx / wanderDistance; moveZ = tz / wanderDistance; }
    }
    const speed = mob.hostile ? 1.8 : 0.7;
    const nextX = mob.x + moveX * speed * dt;
    const nextZ = mob.z + moveZ * speed * dt;
    const nextGround = mob.type === 'squid' ? 4.6 : getSurfaceY(nextX, nextZ);
    const validGround = mob.type === 'squid'
      ? isWater(worldMap.get(keyOf(Math.floor(nextX), 5, Math.floor(nextZ))))
      : (Math.abs(nextGround - mob.y) <= 1.1 && !isWater(worldMap.get(keyOf(Math.floor(nextX), nextGround - 1, Math.floor(nextZ)))));
    if (validGround) {
      mob.x = nextX;
      mob.z = nextZ;
      mob.y = nextGround;
    }
    mob.mesh.position.set(mob.x + 0.5, mob.y, mob.z + 0.5);
    if (moveX || moveZ) mob.mesh.rotation.y = Math.atan2(-moveX, -moveZ);
    const stride = Math.sin(performance.now() / 140 + mob.phase) * (Math.abs(moveX) + Math.abs(moveZ)) * 0.35;
    for (let legIndex = 0; legIndex < mob.legs.length; legIndex += 1) mob.legs[legIndex].rotation.x = legIndex % 2 ? stride : -stride;
  }
}
function freshInventory(mode) {
  const items = Object.fromEntries(blockCatalog.map((block) => [block.name, mode === 'creative' ? 64 : 0]));
  if (mode === 'creative') return items;
  const starterItems = {
    grass: 32, dirt: 48, stone: 32, log: 8, leaves: 12, sand: 12, planks: 4,
    glass: 4, torch: 8, 'item:stick': 16,
  };
  for (const [name, count] of Object.entries(starterItems)) {
    const key = canonicalCatalogKey(name) || name;
    if (key in items) items[key] = count;
  }
  return items;
}
function loadSave() {
  try {
    const raw = localStorage.getItem('blockcraft-world-v1');
    if (!raw) return false;
    const save = JSON.parse(raw);
    if (!save || !Number.isFinite(Number(save.seed))) return false;
    worldSeed = Number(save.seed);
    worldName = typeof save.name === 'string' ? save.name.slice(0, 32) : 'Cedar Valley';
    gameMode = save.mode === 'survival' ? 'survival' : 'creative';
    hotbar = Array.isArray(save.hotbar) && save.hotbar.length === 9 ? save.hotbar.map(String) : [...defaultHotbar];
    inventory = save.inventory && typeof save.inventory === 'object' ? { ...freshInventory(gameMode), ...save.inventory } : freshInventory(gameMode);
    selectedSlot = Number.isInteger(save.selected) ? THREE.MathUtils.clamp(save.selected, 0, 8) : 0;
    worldTime = Number.isFinite(save.time) ? save.time : 56;
    playSeconds = Number.isFinite(save.playSeconds) ? save.playSeconds : 0;
    player.health = Number.isFinite(save.health) ? save.health : 20;
    player.food = Number.isFinite(save.food) ? save.food : 20;
    experience = Number.isFinite(save.experience) ? save.experience : 0;
    spawnPosition = save.spawnPosition && [save.spawnPosition.x, save.spawnPosition.y, save.spawnPosition.z].every(Number.isFinite)
      ? new THREE.Vector3(save.spawnPosition.x, save.spawnPosition.y, save.spawnPosition.z) : null;
    difficulty = ['peaceful', 'easy', 'normal', 'hard'].includes(save.difficulty) ? save.difficulty : 'normal';
    lastHungerTick = performance.now();
    lastRegenTick = lastHungerTick;
    lastStarveTick = lastHungerTick;
    player.yaw = Number.isFinite(save.yaw) ? save.yaw : 0;
    player.pitch = Number.isFinite(save.pitch) ? save.pitch : 0;
    generateWorld(worldSeed, Array.isArray(save.edits) ? save.edits : []);
    if (save.position && Number.isFinite(save.position.x) && Number.isFinite(save.position.y) && Number.isFinite(save.position.z)) {
      player.position.set(save.position.x, save.position.y, save.position.z);
    } else {
      player.position.copy(findStartPosition());
    }
    player.velocity.set(0, 0, 0);
    updateWorldMeta();
    return true;
  } catch (error) {
    console.warn('Could not load local world save:', error);
    return false;
  }
}

function saveWorld() {
  if (remoteActive || !worldMap.size) return;
  try {
    const save = {
      seed: worldSeed,
      name: worldName,
      mode: gameMode,
      hotbar,
      inventory,
      selected: selectedSlot,
      time: worldTime,
      playSeconds,
      position: { x: player.position.x, y: player.position.y, z: player.position.z },
      yaw: player.yaw,
      pitch: player.pitch,
      health: player.health,
      food: player.food,
      experience,
      difficulty,
      spawnPosition: spawnPosition ? { x: spawnPosition.x, y: spawnPosition.y, z: spawnPosition.z } : null,
      edits: [...edits.entries()],
      savedAt: Date.now(),
    };
    localStorage.setItem('blockcraft-world-v1', JSON.stringify(save));
    localStorage.setItem('blockcraft-has-save', '1');
  } catch (error) {
    console.warn('World save failed:', error);
    showToast('Could not save — browser storage may be full.');
  }
}
function scheduleSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveWorld, 250);
}
function createNewWorld() {
  const seedText = $('seed-input').value.trim();
  const seed = seedText && /^-?\d+$/.test(seedText) ? Number(seedText) : Math.floor(Math.random() * 900000000 + 100000000);
  worldName = ['Cedar Valley', 'Mosslight Hollow', 'Pinewater', 'Softstone Ridge', 'Fernfield'][Math.abs(seed) % 5];
  gameMode = $('new-world-mode').value === 'survival' ? 'survival' : 'creative';
  inventory = freshInventory(gameMode);
  hotbar = [...defaultHotbar];
  selectedSlot = 0;
  worldTime = 56;
  playSeconds = 0;
  lastHungerTick = performance.now();
  lastRegenTick = lastHungerTick;
  lastStarveTick = lastHungerTick;
  experience = 0;
  spawnPosition = null;
  weather = 'clear';
  player.health = 20;
  player.food = 20;
  player.yaw = 0;
  player.pitch = 0;
  generateWorld(seed);
  player.position.copy(findStartPosition());
  player.velocity.set(0, 0, 0);
  player.onGround = false;
  updateWorldMeta();
  renderHotbar();
  renderInventory();
  saveWorld();
  enterGame();
}

function setActiveLayer(layerId) {
  const previousScreen = screen;
  for (const id of hideableLayers) $(id).classList.toggle('hidden', id !== layerId);
  screen = layerId ? layerId.replace('-screen', '') : 'game';
  if (previousScreen === 'server' && screen !== 'server') stopHostStatusPolling();
  document.body.classList.toggle('menu-open', screen === 'menu');
  document.body.classList.toggle('overlay-open', screen !== 'game');
  if (screen !== 'game') {
    keyState.clear();
    if (remoteSession) for (const control of new Set(Object.values(remoteControls))) sendSocket({ type: 'control', key: control, down: false });
  }
}
function enterGame() {
  gameStarted = true;
  setActiveLayer(null);
  $('mode-label').textContent = gameMode.toUpperCase();
  $('world-label').textContent = remoteActive ? remoteSession?.label || 'Server world' : worldName;
  updateHud();
  renderer.domElement.focus({ preventScroll: true });
  requestPointerLock();
  scheduleSave();
}
function requestPointerLock() {
  if (!renderer.domElement.requestPointerLock || document.pointerLockElement === renderer.domElement) return;
  const result = renderer.domElement.requestPointerLock();
  if (result?.catch) result.catch(() => {});
}
function openPause() {
  if (!gameStarted || remoteSession) {
    if (remoteActive) openInventory();
    return;
  }
  saveWorld();
  setActiveLayer('pause-screen');
  if (document.pointerLockElement) document.exitPointerLock();
}
function openInventory() {
  if (!gameStarted) return;
  renderInventory();
  setActiveLayer('inventory-screen');
  if (document.pointerLockElement) document.exitPointerLock();
}
function closeOverlay() {
  setActiveLayer(null);
  if (gameStarted) requestPointerLock();
}
function showMenu() {
  if (document.pointerLockElement) document.exitPointerLock();
  saveWorld();
  if (remoteSession) disconnectServer(true);
  gameStarted = false;
  setActiveLayer('menu-screen');
  $('play-label').textContent = 'Create new world';
  $('world-label').textContent = worldName;
  document.body.classList.remove('server-mode');
}
function showToast(text) {
  const node = $('toast');
  node.textContent = text;
  node.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => node.classList.remove('show'), 2100);
}
function updateWorldMeta() {
  $('world-label').textContent = worldName;
  $('mode-label').textContent = gameMode.toUpperCase();
  $('inventory-mode').textContent = gameMode === 'creative' ? 'Creative' : 'Survival';
  $('inventory-seed').textContent = String(worldSeed);
  $('new-world-mode').value = gameMode;
  $('seed-input').placeholder = String(worldSeed);
  $('switch-mode-button').textContent = gameMode === 'creative' ? 'Switch to survival' : 'Switch to creative';
  if ($('difficulty-setting')) $('difficulty-setting').value = difficulty;
  const exists = Boolean(localStorage.getItem('blockcraft-has-save'));
  $('resume-button').classList.toggle('hidden', !exists);
  $('resume-button').querySelector('b').textContent = `Continue ${worldName}`;
  $('resume-button').querySelector('small').textContent = `${formatDuration(playSeconds)} played · Auto-saved`;
  $('play-time').textContent = formatDuration(playSeconds);
}
function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function blockCount(name) {
  if (remoteActive) return remoteHotbar.find((item) => item?.name === name)?.count || 0;
  return gameMode === 'creative' ? 64 : Number(inventory[name] || 0);
}
function renderHotbar() {
  const items = remoteActive ? remoteHotbar.map((item) => item?.name || '') : hotbar;
  const selected = remoteActive ? remoteSelected : selectedSlot;
  hotbarNode.innerHTML = items.map((name, index) => {
    const info = itemInfo(name || 'stone');
    const count = remoteActive ? (remoteHotbar[index]?.count || '') : (gameMode === 'creative' ? '64' : Number(inventory[name] || 0));
    return `<button class="hotbar-slot ${index === selected ? 'selected' : ''}" data-slot="${index}" title="${escapeHtml(info.label)} · ${index + 1}"><span class="slot-key">${index + 1}</span><i class="block-icon ${info.icon}"></i><span class="slot-count">${count}</span></button>`;
  }).join('');
  const selectedName = items[selected] || hotbar[selectedSlot] || 'grass';
  $('selected-name').textContent = itemInfo(selectedName).label;
}
function allocateRecipeIngredients(recipe) {
  const consumed = {};
  const slots = Array.isArray(recipe?.inputs) ? recipe.inputs : [];
  const visit = (index) => {
    if (index >= slots.length) {
      if (recipe.kind !== 'smelt' || gameMode === 'creative') return true;
      for (const fuel of recipe.fuel || []) {
        if (Number(inventory[fuel] || 0) - Number(consumed[fuel] || 0) <= 0) continue;
        consumed[fuel] = Number(consumed[fuel] || 0) + 1;
        return true;
      }
      return false;
    }
    const candidates = [...new Set(slots[index].alternatives || [])]
      .sort((a, b) => Number(inventory[a] || 0) - Number(inventory[b] || 0));
    for (const name of candidates) {
      const remaining = Number(inventory[name] || 0) - Number(consumed[name] || 0);
      if (gameMode !== 'creative' && remaining <= 0) continue;
      consumed[name] = Number(consumed[name] || 0) + 1;
      if (visit(index + 1)) return true;
      consumed[name] -= 1;
    }
    return false;
  };
  return visit(0) ? consumed : null;
}
function renderInventory() {
  const remoteItems = remoteHotbar.map((item) => item?.name).filter(Boolean).map((name) => ({
    ...itemInfo(name),
    count: remoteHotbar.find((item) => item?.name === name)?.count || 0,
  }));
  const query = String($('inventory-search')?.value || '').trim().toLowerCase();
  const category = inventoryTab;
  const localItems = blockCatalog.filter((item) => {
    if (category === 'blocks' && item.kind !== 'block') return false;
    if (category === 'items' && item.kind !== 'item') return false;
    if (!query) return true;
    return `${item.label} ${item.blockName || ''} ${item.itemName || ''}`.toLowerCase().includes(query);
  }).map((item) => ({
    ...item,
    count: gameMode === 'creative' ? '∞' : Number(inventory[item.name] || 0),
  }));
  const list = remoteActive ? remoteItems : localItems;
  const activeName = remoteActive ? remoteHotbar[remoteSelected]?.name : hotbar[selectedSlot];
  $('inventory-grid').innerHTML = list.map((item) => `<button class="inventory-slot ${item.name === activeName ? 'active' : ''}" data-item="${escapeHtml(item.name)}" title="${escapeHtml(item.label)} · ${item.kind === 'item' ? 'Item' : 'Block'}"><i class="block-icon ${escapeHtml(item.icon || 'stone')}"${item.tint ? ` style="--item-tint:${escapeHtml(item.tint)}"` : ''}></i><span>${escapeHtml(item.label)}</span><b class="slot-count">${item.count}</b></button>`).join('') || '<div class="inventory-empty">No matching items.</div>';
  $('catalog-status').textContent = gameDataReady
    ? `Minecraft Java 1.12.2 · ${blockCatalog.length} entries`
    : 'Built-in starter catalog';
  for (const tab of document.querySelectorAll('[data-inventory-tab]')) tab.classList.toggle('active', tab.dataset.inventoryTab === category);

  if (remoteActive) {
    $('recipe-list').innerHTML = '<div class="recipe-row">Server inventory is managed by the server.</div>';
    $('recipe-count').textContent = 'Recipes are server-managed';
    $('switch-mode-button').classList.add('hidden');
    $('inventory-mode').textContent = 'Server';
    $('inventory-time').textContent = remoteSession?.version || 'Java Edition';
  } else {
    $('switch-mode-button').classList.remove('hidden');
    $('inventory-mode').textContent = gameMode === 'creative' ? 'Creative' : 'Survival';
    $('inventory-time').textContent = timeName();
    const recipeQuery = String($('recipe-search')?.value || '').trim().toLowerCase();
    const matchingRecipes = recipes.map((recipe, index) => ({ recipe, index, available: Boolean(allocateRecipeIngredients(recipe)) }))
      .filter(({ recipe }) => !recipeQuery || recipe.name.toLowerCase().includes(recipeQuery));
    const visibleRecipes = recipeQuery ? matchingRecipes.slice(0, 80) : matchingRecipes.slice(0, 64);
    $('recipe-count').textContent = `${recipes.length} recipes · ${recipeQuery ? `${matchingRecipes.length} matches` : 'search to filter'}`;
    $('recipe-list').innerHTML = visibleRecipes.map(({ recipe, index, available }) => {
      const canCraft = gameMode === 'creative' || available;
      const inputText = `${recipe.inputs.map((slot) => (slot.alternatives || []).map((name) => itemInfo(name).label).join(' / ')).join(' + ')}${recipe.kind === 'smelt' ? ` · fuel: ${(recipe.fuel || []).slice(0, 3).map((name) => itemInfo(name).label).join(' / ')}` : ''}`;
      const action = recipe.kind === 'smelt' ? 'Smelt' : 'Craft';
      return `<div class="recipe-row"><span title="${escapeHtml(inputText)}">${escapeHtml(recipe.name)}<small>${escapeHtml(inputText)}</small></span><button data-recipe="${index}" ${canCraft ? '' : 'disabled'}>${action}</button></div>`;
    }).join('') || '<div class="recipe-row">No matching recipes.</div>';
  }
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function selectSlot(index) {
  if (index < 0 || index > 8) return;
  if (remoteActive) {
    remoteSelected = index;
    sendSocket({ type: 'select', slot: index });
  } else selectedSlot = index;
  renderHotbar();
  if (screen === 'inventory') renderInventory();
  scheduleSave();
}
function craftRecipe(index) {
  const recipe = recipes[index];
  if (!recipe || remoteActive) return;
  const consumed = allocateRecipeIngredients(recipe);
  if (!consumed && gameMode !== 'creative') {
    showToast('You do not have the ingredients for that recipe.');
    return;
  }
  if (gameMode !== 'creative') {
    for (const [name, count] of Object.entries(consumed || {})) inventory[name] = Math.max(0, Number(inventory[name] || 0) - count);
  }
  inventory[recipe.output] = Number(inventory[recipe.output] || 0) + (Number(recipe.count) || 1);
  const outputInfo = catalogByName.get(recipe.output);
  if (outputInfo?.kind === 'block' && outputInfo.placeable && !hotbar.includes(recipe.output)) hotbar[selectedSlot] = recipe.output;
  renderHotbar();
  renderInventory();
  scheduleSave();
  showToast(`Crafted ${recipe.name}.`);
}

function updateHud() {
  $('mode-label').textContent = remoteActive ? 'SERVER' : gameMode.toUpperCase();
  $('health-hearts').innerHTML = Array.from({ length: 10 }, (_, i) => `<i class="${player.health >= (i + 1) * 2 - 0.25 ? '' : 'empty'}">♥</i>`).join('');
  $('food-icons').innerHTML = Array.from({ length: 10 }, (_, i) => `<i class="${player.food >= (i + 1) * 2 - 0.25 ? '' : 'empty'}">▰</i>`).join('');
  const p = remoteActive && remoteSession?.position ? remoteSession.position : player.position;
  $('coord-x').textContent = Math.floor(p.x);
  $('coord-y').textContent = Math.floor(p.y);
  $('coord-z').textContent = Math.floor(p.z);
  $('remote-coords').textContent = `XYZ ${Math.floor(p.x)}, ${Math.floor(p.y)}, ${Math.floor(p.z)}`;
  const yaw = remoteActive && Number.isFinite(remoteSession?.yaw) ? remoteSession.yaw : player.yaw;
  $('compass-direction').textContent = ['N', 'W', 'S', 'E'][Math.round((yaw / (Math.PI / 2) + 8) % 4) % 4];
  $('day-number').textContent = String(Math.floor(worldTime / 240) + 1).padStart(2, '0');
  $('play-time').textContent = formatDuration(playSeconds);
  $('inventory-time').textContent = timeName();
  $('weather-icon').textContent = weather === 'thunder' ? 'ϟ' : (weather === 'rain' ? '☂' : (isNightTime() ? '☾' : '☀'));
  $('xp-fill').style.width = `${Math.max(5, (experience % 10) * 10)}%`;
  $('xp-level').textContent = String(Math.floor(experience / 10)).padStart(2, '0');
  $('fps-count').textContent = String(fpsEstimate);
  if (remoteActive) $('biome-name').textContent = remoteSession?.dimension || 'SERVER WORLD';
  else {
    const biome = biomeAt(Math.floor(player.position.x), Math.floor(player.position.z), worldSeed);
    $('biome-name').textContent = biome.replaceAll('_', ' ').toUpperCase();
  }
  const coordSetting = $('coords-setting');
  if (coordSetting) $('coord-grid').style.display = coordSetting.checked ? 'grid' : 'none';
}
function timeName() {
  const phase = (worldTime % 240) / 240;
  if (phase < 0.16) return 'Dawn';
  if (phase < 0.42) return 'Morning';
  if (phase < 0.58) return 'Afternoon';
  if (phase < 0.72) return 'Dusk';
  return 'Night';
}
function updateLighting(timeValue = worldTime) {
  let phase = ((timeValue % 240) / 240 + 1) % 1;
  const daylight = Math.max(0.05, Math.sin((phase - 0.25) * Math.PI * 2) * 0.5 + 0.52);
  const night = Math.max(0, 1 - daylight * 1.45);
  const skyDay = new THREE.Color('#8dbbc2');
  const skySunset = new THREE.Color('#d19674');
  const skyNight = new THREE.Color('#1d3041');
  let sky;
  if (phase > 0.46 && phase < 0.56) sky = skyDay.clone().lerp(skySunset, 0.75);
  else if (phase > 0.66 && phase < 0.78) sky = skyNight.clone().lerp(skySunset, 0.42);
  else sky = skyDay.clone().lerp(skyNight, night);
  if (weather === 'rain') sky.lerp(new THREE.Color('#77888a'), 0.35);
  if (weather === 'thunder') sky.lerp(new THREE.Color('#4a5862'), 0.58);
  scene.background.copy(sky);
  scene.fog.color.copy(sky);
  hemisphere.intensity = 0.72 + daylight * 0.92;
  sunLight.intensity = 0.28 + daylight * 2.55;
  sunLight.color.set(phase > 0.45 && phase < 0.62 ? '#f0b678' : '#fff0ce');
  const angle = phase * Math.PI * 2;
  sunLight.position.set(Math.cos(angle) * 65, Math.sin(angle) * 70, Math.sin(angle * 0.65) * 50);
  document.documentElement.style.setProperty('--world-light', String(daylight));
}

function requestSaveIfNeeded() {
  if (!remoteActive && screen === 'game' && performance.now() - lastWorldSave > 5000) {
    saveWorld();
    lastWorldSave = performance.now();
  }
}
function isOccupiedAt(x, feetY, z) {
  const minX = Math.floor(x - 0.28);
  const maxX = Math.floor(x + 0.28);
  const minZ = Math.floor(z - 0.28);
  const maxZ = Math.floor(z + 0.28);
  const minY = Math.floor(feetY + 0.05);
  const maxY = Math.floor(feetY + 1.72);
  for (let bx = minX; bx <= maxX; bx += 1) {
    for (let bz = minZ; bz <= maxZ; bz += 1) {
      for (let by = minY; by <= maxY; by += 1) {
        if (isSolid(worldMap.get(keyOf(bx, by, bz)))) return true;
      }
    }
  }
  return false;
}
function groundBelow(x, feetY, z) {
  const y = Math.floor(feetY - 0.08);
  for (const dx of [-0.22, 0.22]) {
    for (const dz of [-0.22, 0.22]) {
      const bx = Math.floor(x + dx);
      const bz = Math.floor(z + dz);
      if (isSolid(worldMap.get(keyOf(bx, y, bz)))) return y;
    }
  }
  return null;
}
function inWaterAt(x, feetY, z) {
  return isWater(worldMap.get(keyOf(Math.floor(x), Math.floor(feetY + 0.2), Math.floor(z)))) || isWater(worldMap.get(keyOf(Math.floor(x), Math.floor(feetY + 1), Math.floor(z))));
}
function updateSurvival() {
  if (gameMode !== 'survival') return;
  const now = performance.now();
  if (difficulty === 'peaceful') {
    player.food = 20;
    if (player.health < 20 && now - lastRegenTick > 2500) { player.health = Math.min(20, player.health + 1); lastRegenTick = now; updateHud(); }
    return;
  }
  if (player.food > 0 && now - lastHungerTick > 45000) {
    player.food = Math.max(0, player.food - 1);
    lastHungerTick = now;
    scheduleSave();
  }
  if (player.food >= 18 && player.health < 20 && now - lastRegenTick > 4500) {
    player.health = Math.min(20, player.health + 1);
    player.food = Math.max(0, player.food - 1);
    lastRegenTick = now;
    updateHud();
    scheduleSave();
  }
  const starvationFloor = difficulty === 'easy' ? 10 : (difficulty === 'normal' ? 1 : 0);
  if (player.food === 0 && player.health > starvationFloor && now - lastStarveTick > 5000) {
    player.health = Math.max(starvationFloor, player.health - (difficulty === 'hard' ? 2 : 1));
    lastStarveTick = now;
    updateHud();
    if (player.health <= 0) respawnPlayer();
  }
}
function simulateLocal(dt) {
  const fwdInput = Number(keyState.has('KeyW')) - Number(keyState.has('KeyS'));
  const sideInput = Number(keyState.has('KeyD')) - Number(keyState.has('KeyA'));
  const sprint = keyState.has('ControlLeft') || keyState.has('ControlRight');
  const sneak = keyState.has('ShiftLeft') || keyState.has('ShiftRight');
  const speed = sneak ? 2.15 : (sprint ? 8.5 : 5.5);
  const length = Math.hypot(fwdInput, sideInput) || 1;
  const forwardX = -Math.sin(player.yaw);
  const forwardZ = -Math.cos(player.yaw);
  const rightX = Math.cos(player.yaw);
  const rightZ = -Math.sin(player.yaw);
  const inputX = (forwardX * fwdInput + rightX * sideInput) / length;
  const inputZ = (forwardZ * fwdInput + rightZ * sideInput) / length;
  const acceleration = player.onGround ? 32 : 12;
  player.velocity.x += (inputX * speed - player.velocity.x) * Math.min(1, acceleration * dt);
  player.velocity.z += (inputZ * speed - player.velocity.z) * Math.min(1, acceleration * dt);
  if (fwdInput === 0 && sideInput === 0) {
    player.velocity.x *= Math.max(0, 1 - dt * (player.onGround ? 12 : 1.3));
    player.velocity.z *= Math.max(0, 1 - dt * (player.onGround ? 12 : 1.3));
  }

  const wet = inWaterAt(player.position.x, player.position.y, player.position.z);
  if (keyState.has('Space') && player.onGround) {
    player.velocity.y = wet ? 5.2 : 8.15;
    player.fallStart = player.position.y;
    player.onGround = false;
  }
  player.velocity.y -= (wet ? 7 : 22) * dt;
  player.velocity.y = Math.max(player.velocity.y, wet ? -3 : -40);

  let nextX = player.position.x + player.velocity.x * dt;
  if (isOccupiedAt(nextX, player.position.y, player.position.z)) {
    if (player.onGround && !isOccupiedAt(nextX, player.position.y + 0.55, player.position.z)) player.position.y += 0.55;
    else { nextX = player.position.x; player.velocity.x = 0; }
  }
  player.position.x = nextX;

  let nextZ = player.position.z + player.velocity.z * dt;
  if (isOccupiedAt(player.position.x, player.position.y, nextZ)) {
    if (player.onGround && !isOccupiedAt(player.position.x, player.position.y + 0.55, nextZ)) player.position.y += 0.55;
    else { nextZ = player.position.z; player.velocity.z = 0; }
  }
  player.position.z = nextZ;

  const wasGrounded = player.onGround;
  let nextY = player.position.y + player.velocity.y * dt;
  if (player.velocity.y <= 0) {
    const groundY = groundBelow(player.position.x, nextY, player.position.z);
    if (groundY !== null && nextY < groundY + 1) {
      nextY = groundY + 1;
      if (!wasGrounded) {
        const fall = player.fallStart - nextY;
        if (gameMode === 'survival' && fall > 4.5) {
          player.health = Math.max(0, player.health - Math.ceil((fall - 3) * 1.15));
          if (player.health <= 0) respawnPlayer();
        }
      }
      player.onGround = true;
      player.fallStart = nextY;
      player.velocity.y = 0;
    } else {
      if (wasGrounded) player.fallStart = player.position.y;
      player.onGround = false;
    }
  } else if (isOccupiedAt(player.position.x, nextY, player.position.z)) {
    nextY = Math.floor(nextY + 1.72) - 1.72;
    player.velocity.y = 0;
    player.onGround = false;
  } else player.onGround = false;
  player.position.y = nextY;
  if (player.position.y < -20) respawnPlayer();
  updateSurvival();
  updateMobs(dt);
}
function respawnPlayer() {
  player.health = 20;
  player.food = Math.max(8, player.food);
  player.position.copy(spawnPosition || findStartPosition());
  player.velocity.set(0, 0, 0);
  player.onGround = false;
  lastHungerTick = performance.now();
  lastRegenTick = lastHungerTick;
  lastStarveTick = lastHungerTick;
  updateHud();
  showToast('You woke up back at home.');
}
function pickLocalBlock(maxDistance = 5.7) {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const origin = camera.position.clone();
  let prevCell = null;
  for (let distance = 0.08; distance <= maxDistance; distance += 0.07) {
    const point = origin.clone().addScaledVector(dir, distance);
    const x = Math.floor(point.x);
    const y = Math.floor(point.y);
    const z = Math.floor(point.z);
    const key = keyOf(x, y, z);
    if (worldMap.has(key)) return { x, y, z, key, name: worldMap.get(key), distance, adjacent: prevCell || { x, y: y + 1, z } };
    prevCell = { x, y, z };
  }
  return null;
}
function updateTarget() {
  if (remoteSession || screen !== 'game') {
    targetOutline.visible = false;
    $('target-hint').textContent = remoteActive ? remoteTargetHint : '';
    return;
  }
  const mobTarget = pickLocalMob();
  if (mobTarget) {
    targetBlock = null;
    targetOutline.visible = false;
    $('target-hint').textContent = `${mobTarget.mob.type.toUpperCase()} · ${mobTarget.mob.health} HP`;
    return;
  }
  targetBlock = pickLocalBlock();
  if (targetBlock) {
    targetOutline.position.set(targetBlock.x + 0.5, targetBlock.y + 0.5, targetBlock.z + 0.5);
    targetOutline.visible = Boolean($('outline-setting').checked);
    $('target-hint').textContent = itemInfo(targetBlock.name).label.toUpperCase();
  } else {
    targetOutline.visible = false;
    $('target-hint').textContent = '';
  }
}
function modifyBlock(x, y, z, name) {
  const key = keyOf(x, y, z);
  if (name) worldMap.set(key, name);
  else worldMap.delete(key);
  edits.set(key, name || null);
  drawBlockWorld(worldMap);
  renderHotbar();
  scheduleSave();
}
function pickLocalMob(maxDistance = 5.5) {
  const visibleMobs = mobs.filter((mob) => mob.mesh?.visible);
  if (!visibleMobs.length) return null;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const intersections = raycaster.intersectObjects(visibleMobs.map((mob) => mob.mesh), true);
  const intersection = intersections.find((hit) => hit.object.userData.mob && hit.distance <= maxDistance);
  if (!intersection) return null;
  const blockHit = pickLocalBlock(maxDistance);
  if (blockHit && blockHit.distance < intersection.distance) return null;
  return { mob: intersection.object.userData.mob, distance: intersection.distance };
}
function dropForMob(mob) {
  const drops = {
    pig: [['item:porkchop', 2]], cow: [['item:beef', 2], ['item:leather', 1]],
    sheep: [['item:mutton', 2], ['wool', 1]], chicken: [['item:chicken', 1], ['item:feather', 1]],
    rabbit: [['item:rabbit', 1], ['item:rabbit_hide', 1]], horse: [['item:leather', 2]], squid: [['item:dye', 1]],
    spider: [['item:string', 2], ['item:spider_eye', 1]], enderman: [['item:ender_pearl', 1]],
    witch: [['item:glass_bottle', 1], ['item:glowstone_dust', 1]], zombie: [['item:rotten_flesh', 2]],
    skeleton: [['item:bone', 2], ['item:arrow', 2]], creeper: [['item:gunpowder', 2]],
  };
  for (const [rawName, rawCount] of drops[mob.type] || []) {
    const name = canonicalCatalogKey(rawName) || rawName;
    if (name in inventory) inventory[name] = Number(inventory[name] || 0) + rawCount;
  }
}
function attackLocalMob() {
  const target = pickLocalMob();
  if (!target) return false;
  const weapon = catalogByName.get(hotbar[selectedSlot]);
  const weaponName = String(weapon?.itemName || '');
  let damage = /_sword$/.test(weaponName) ? 6 : (/_axe$/.test(weaponName) ? 5 : (/_pickaxe$/.test(weaponName) ? 3 : 2));
  if (!player.onGround && player.velocity.y < 0) damage += 1;
  target.mob.health -= damage;
  showToast(`${itemInfo(target.mob.type).label || target.mob.type} hit for ${damage} · ${Math.max(0, target.mob.health)} health.`);
  if (target.mob.health <= 0) {
    if (gameMode === 'survival') dropForMob(target.mob);
    experience += 1 + Math.floor(Math.random() * 4);
    mobGroup.remove(target.mob.mesh);
    const index = mobs.indexOf(target.mob);
    if (index >= 0) mobs.splice(index, 1);
    showToast(`${target.mob.type[0].toUpperCase()}${target.mob.type.slice(1)} defeated · loot and XP collected.`);
    renderInventory();
    scheduleSave();
  }
  updateHud();
  return true;
}
function mineLocalBlock() {
  if (screen !== 'game' || remoteSession) return;
  if (attackLocalMob()) return;
  const hit = pickLocalBlock();
  if (!hit) return;
  const block = catalogByName.get(hit.name);
  if (gameMode === 'survival' && block?.hardness < 0) {
    showToast('That block cannot be broken.');
    return;
  }
  const selectedInfo = catalogByName.get(hotbar[selectedSlot]);
  const toolClass = String(selectedInfo?.itemName || '').match(/(?:wooden|stone|iron|diamond|golden)_(?:pickaxe|axe|shovel|hoe|sword)|shears/);
  const canHarvest = !block?.harvestTools || Boolean(toolClass && selectedInfo?.id && block.harvestTools[selectedInfo.id]);
  modifyBlock(hit.x, hit.y, hit.z, null);
  if (gameMode === 'survival' && canHarvest && block?.drop) {
    inventory[block.drop] = Number(inventory[block.drop] || 0) + 1;
  } else if (gameMode === 'survival' && !block && hit.name !== 'bedrock') {
    inventory[hit.name] = Number(inventory[hit.name] || 0) + 1;
  }
  const dropLabel = block?.drop ? ` · ${itemInfo(block.drop).label}` : '';
  showToast(`Mined ${itemInfo(hit.name).label}${dropLabel}.`);
  renderInventory();
  scheduleSave();
}
function eatSelectedItem(name) {
  const itemName = String(name || '').replace(/^item:/, '').split('@')[0];
  const foodValues = {
    apple: 4, bread: 5, beef: 3, porkchop: 3, chicken: 2, cooked_beef: 8,
    cooked_porkchop: 8, cooked_chicken: 6, cooked_fish: 5, cooked_rabbit: 5,
    cooked_mutton: 6, carrot: 3, potato: 1, baked_potato: 5, melon: 2,
    pumpkin_pie: 8, cake: 2, mushroom_stew: 6, rabbit_stew: 10,
    beetroot: 1, beetroot_soup: 6, golden_apple: 4, rotten_flesh: 4,
    cookie: 2, chorus_fruit: 4, fish: 2,
  };
  const food = foodValues[itemName];
  if (!food) return false;
  if (gameMode === 'survival' && Number(inventory[name] || 0) <= 0) {
    showToast(`No ${itemInfo(name).label.toLowerCase()} left.`);
    return true;
  }
  if (gameMode === 'survival' && player.food >= 20 && !['golden_apple', 'rotten_flesh'].includes(itemName)) {
    showToast('You are not hungry.');
    return true;
  }
  if (gameMode === 'survival') {
    inventory[name] = Math.max(0, Number(inventory[name] || 0) - 1);
    player.food = Math.min(20, player.food + food);
    if (itemName === 'golden_apple') player.health = Math.min(20, player.health + 4);
    renderInventory();
    updateHud();
    scheduleSave();
  }
  showToast(`Ate ${itemInfo(name).label}.`);
  return true;
}
function placeLocalBlock() {
  if (screen !== 'game' || remoteSession) return;
  const selected = hotbar[selectedSlot];
  const selectedInfo = catalogByName.get(selected);
  if (selectedInfo?.kind === 'item') {
    if (eatSelectedItem(selected)) return;
    showToast(`${selectedInfo.label} cannot be placed.`);
    return;
  }
  const hit = pickLocalBlock();
  if (!hit) { showToast('Look at a block to place against.'); return; }
  if (!selected || !catalogByName.has(selected) || catalogByName.get(selected)?.placeable === false) return;
  const count = Number(inventory[selected] || 0);
  if (gameMode === 'survival' && count <= 0) { showToast(`No ${itemInfo(selected).label.toLowerCase()} left.`); return; }
  const target = hit.adjacent;
  if (isOccupiedAt(player.position.x, player.position.y, player.position.z) || (Math.abs(target.x + 0.5 - player.position.x) < 0.8 && Math.abs(target.z + 0.5 - player.position.z) < 0.8 && target.y >= player.position.y && target.y <= player.position.y + 1.7)) {
    showToast('There is no room to place that block.');
    return;
  }
  if (worldMap.has(keyOf(target.x, target.y, target.z))) return;
  modifyBlock(target.x, target.y, target.z, selected);
  if (gameMode === 'survival') inventory[selected] = Math.max(0, count - 1);
  renderInventory();
  showToast(`Placed ${itemInfo(selected).label}.`);
}

function setCamera() {
  if (remoteActive && remoteSession?.position) {
    const p = remoteSession.position;
    camera.position.set(p.x, p.y + 1.62, p.z);
    const yaw = Number.isFinite(remoteSession.yaw) ? remoteSession.yaw : player.yaw;
    const pitch = Number.isFinite(remoteSession.pitch) ? remoteSession.pitch : player.pitch;
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
  } else {
    camera.position.set(player.position.x, player.position.y + 1.62, player.position.z);
    camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
  }
}
function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.fov = Number($('fov-setting').value || 78);
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
}

function openSettings() {
  if (!gameStarted) return;
  setActiveLayer('settings-screen');
  if (document.pointerLockElement) document.exitPointerLock();
}
function openChat() {
  if (!gameStarted) return;
  if (remoteActive) {
    $('chat-input').focus();
    return;
  }
  $('command-log').innerHTML = '<div>Welcome to your world. Try <b>/help</b> for a few world commands.</div>';
  setActiveLayer('chat-screen');
  if (document.pointerLockElement) document.exitPointerLock();
  $('command-input').focus();
}
function appendCommand(text) {
  const node = document.createElement('div');
  node.textContent = text;
  $('command-log').append(node);
  $('command-log').scrollTop = $('command-log').scrollHeight;
}
function findCatalogKey(input, onlyBlocks = false) {
  const name = String(input || '').toLowerCase().replace(/^minecraft:/, '');
  const direct = canonicalCatalogKey(name, onlyBlocks);
  if (direct) return direct;
  return canonicalCatalogKey(`item:${name}`, onlyBlocks);
}
function runCommand(text) {
  const raw = text.trim();
  if (!raw) return;
  appendCommand(`› ${raw}`);
  if (!raw.startsWith('/')) {
    appendCommand(`You: ${raw}`);
    return;
  }
  const parts = raw.slice(1).trim().split(/\s+/);
  const command = (parts.shift() || '').toLowerCase();
  if (command === 'help') {
    appendCommand('/help · /seed · /time set day|night|<ticks> · /weather clear|rain|thunder · /difficulty peaceful|easy|normal|hard');
    appendCommand('/gamemode creative|survival · /tp x y z · /setblock x y z block · /fill x1 y1 z1 x2 y2 z2 block');
    appendCommand('/give item [count] · /summon pig|cow|sheep|chicken|rabbit|wolf|ocelot|horse|llama|polar_bear|mooshroom|parrot|bat|villager|zombie|skeleton|creeper|spider|enderman|witch|squid · /kill [@e] · /spawnpoint');
  } else if (command === 'seed') {
    appendCommand(`World seed: ${worldSeed}`);
  } else if (command === 'time' && parts[0] === 'set') {
    const time = String(parts[1] || '').toLowerCase();
    if (time === 'day') worldTime = 56;
    else if (time === 'night') worldTime = 190;
    else if (Number.isFinite(Number(time))) worldTime = Math.max(0, Number(time)) / 100;
    else { appendCommand('Use /time set day, /time set night, or /time set <ticks>.'); return; }
    updateLighting(); appendCommand(`Time set to ${time}.`); updateHud(); scheduleSave();
  } else if (command === 'weather' && ['clear', 'rain', 'thunder'].includes(parts[0])) {
    weather = parts[0]; updateLighting(); updateHud(); appendCommand(`Weather changed to ${weather}.`); scheduleSave();
  } else if (command === 'difficulty' && ['peaceful', 'easy', 'normal', 'hard'].includes(parts[0])) {
    difficulty = parts[0];
    lastHungerTick = performance.now(); lastRegenTick = lastHungerTick; lastStarveTick = lastHungerTick;
    if (difficulty === 'peaceful') {
      for (let index = mobs.length - 1; index >= 0; index -= 1) {
        if (mobs[index].hostile) { mobGroup.remove(mobs[index].mesh); mobs.splice(index, 1); }
      }
    }
    updateWorldMeta(); appendCommand(`Difficulty set to ${difficulty}.`); scheduleSave();
  } else if (command === 'gamemode' && ['creative', 'survival'].includes(parts[0])) {
    setGameMode(parts[0]); appendCommand(`Game mode set to ${gameMode}.`);
  } else if (command === 'tp' && parts.length >= 3) {
    const coords = parts.slice(0, 3).map(Number);
    if (coords.every(Number.isFinite)) {
      player.position.set(coords[0] + 0.5, coords[1], coords[2] + 0.5);
      player.velocity.set(0, 0, 0);
      appendCommand(`Teleported to ${coords.join(', ')}.`);
    } else appendCommand('Coordinates must be numbers.');
  } else if (command === 'setblock' && parts.length >= 4) {
    const [x, y, z] = parts.slice(0, 3).map(Number);
    const block = findCatalogKey(parts[3], true);
    if (![x, y, z].every(Number.isFinite)) appendCommand('Coordinates must be numbers.');
    else if (!block) appendCommand(`Unknown 1.12.2 block: ${parts[3]}. Try grass, planks, wool@14, glass, or stone.`);
    else { modifyBlock(Math.floor(x), Math.floor(y), Math.floor(z), block); appendCommand(`Placed ${itemInfo(block).label} at ${Math.floor(x)}, ${Math.floor(y)}, ${Math.floor(z)}.`); }
  } else if (command === 'fill' && parts.length >= 7) {
    const coords = parts.slice(0, 6).map(Number);
    const block = findCatalogKey(parts[6], true);
    if (!coords.every(Number.isFinite)) appendCommand('Fill coordinates must be numbers.');
    else if (!block) appendCommand(`Unknown block: ${parts[6]}.`);
    else {
      const [x1, y1, z1, x2, y2, z2] = coords.map(Math.floor);
      const volume = (Math.abs(x2 - x1) + 1) * (Math.abs(y2 - y1) + 1) * (Math.abs(z2 - z1) + 1);
      if (volume > 2048) appendCommand('Fill limited to 2,048 blocks at a time.');
      else {
        const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
        const minZ = Math.min(z1, z2), maxZ = Math.max(z1, z2);
        for (let x = minX; x <= maxX; x += 1) for (let y = minY; y <= maxY; y += 1) for (let z = minZ; z <= maxZ; z += 1) {
          const key = keyOf(x, y, z); worldMap.set(key, block); edits.set(key, block);
        }
        drawBlockWorld(worldMap); renderHotbar(); scheduleSave();
        appendCommand(`Filled ${volume} blocks with ${itemInfo(block).label}.`);
      }
    }
  } else if (command === 'give' && parts.length) {
    const name = findCatalogKey(parts[0]);
    const count = Math.max(1, Math.min(64, Math.floor(Number(parts[1]) || 1)));
    if (!name) appendCommand(`Unknown item: ${parts[0]}. Search the inventory to see available 1.12.2 items.`);
    else {
      inventory[name] = Number(inventory[name] || 0) + count;
      if (!hotbar.includes(name)) hotbar[selectedSlot] = name;
      renderHotbar(); renderInventory(); scheduleSave();
      appendCommand(`Gave ${count} ${itemInfo(name).label}.`);
    }
  } else if (command === 'summon' && parts.length) {
    const type = parts[0].toLowerCase().replace(/^minecraft:/, '');
    const x = Number.isFinite(Number(parts[1])) ? Math.floor(Number(parts[1])) : Math.floor(player.position.x + Math.cos(player.yaw) * 4);
    const z = Number.isFinite(Number(parts[3])) ? Math.floor(Number(parts[3])) : Math.floor(player.position.z - Math.cos(player.yaw) * 4);
    const mob = spawnMob(type, x, z);
    if (mob) appendCommand(`Summoned ${type} at ${x}, ${Math.floor(mob.y)}, ${z}.`);
    else appendCommand(`Could not spawn ${type} there. Try a dry, open block near you.`);
  } else if (command === 'kill') {
    if (parts[0] === '@e') {
      const removed = mobs.length;
      while (mobs.length) mobGroup.remove(mobs.pop().mesh);
      appendCommand(`Removed ${removed} local mobs.`);
    } else {
      player.health = 0; respawnPlayer(); updateHud(); appendCommand('You were killed and respawned.');
    }
  } else if (command === 'spawnpoint') {
    const coords = parts.length >= 3 ? parts.slice(0, 3).map(Number) : [Math.floor(player.position.x), Math.floor(player.position.y), Math.floor(player.position.z)];
    if (!coords.every(Number.isFinite)) appendCommand('Spawnpoint coordinates must be numbers.');
    else {
      const x = Math.floor(coords[0]), z = Math.floor(coords[2]);
      const y = Number.isFinite(coords[1]) ? coords[1] : getSurfaceY(x, z);
      spawnPosition = new THREE.Vector3(x + 0.5, y, z + 0.5);
      scheduleSave(); appendCommand(`Spawn point set to ${x}, ${Math.floor(y)}, ${z}.`);
    }
  } else if (command === 'xp' && parts[0] === 'add' && Number.isFinite(Number(parts[1]))) {
    experience = Math.max(0, experience + Math.floor(Number(parts[1])));
    updateHud(); scheduleSave(); appendCommand(`Experience is now ${experience}.`);
  } else appendCommand(`Unknown command: /${command}. Try /help.`);
}
function setGameMode(mode) {
  const previousMode = gameMode;
  gameMode = mode === 'survival' ? 'survival' : 'creative';
  if (gameMode === 'survival' && previousMode === 'creative') {
    inventory = freshInventory('survival');
    lastHungerTick = performance.now();
    lastRegenTick = lastHungerTick;
    lastStarveTick = lastHungerTick;
  }
  if (!inventory || !Object.keys(inventory).length) inventory = freshInventory(gameMode);
  if (gameMode === 'creative') {
    for (const item of blockCatalog) inventory[item.name] = Math.max(Number(inventory[item.name] || 0), 64);
  }
  updateWorldMeta();
  renderHotbar();
  renderInventory();
  scheduleSave();
}

function showServerFailure(reason) {
  const message = String(reason || 'The server connection ended unexpectedly.');
  const ipPolicy = /vpn|proxy|(?:change|changing|alter|mask).{0,24}ip|ip.{0,24}(?:filter|ban|block)/i.test(message);
  const visibleMessage = ipPolicy
    ? 'The server rejected the bridge connection under its VPN/IP policy.'
    : message.slice(0, 220);
  $('remote-status').classList.remove('hidden');
  $('remote-status').querySelector('span:last-child').textContent = visibleMessage;
  $('server-overlay').classList.remove('hidden');
  $('auth-card').classList.add('hidden');
  if (lastDisplayedServerError !== message) {
    appendServerChat(message, 'error');
    if (ipPolicy) {
      appendServerChat('This is the server’s IP policy, not a client-version issue. A hosted preview may exit through a cloud IP. Run Blockcraft locally on your normal connection with VPN/proxy off, or contact the server staff if you are not using one. Blockcraft will not bypass the server’s filter.', 'notice');
    }
    lastDisplayedServerError = message;
  }
}

function serverMessage(payload) {
  if (!payload || typeof payload !== 'object') return;
  if (payload.type === 'state') {
    const next = payload.state || {};
    remoteStatus = next.status || 'disconnected';
    if (remoteSession) {
      remoteSession.host = next.host || remoteSession.host;
      remoteSession.username = next.username || remoteSession.username;
      remoteSession.version = next.version || remoteSession.version;
      remoteSession.error = next.error || '';
    }
    if (remoteStatus === 'connected') {
      $('remote-status').classList.add('hidden');
      $('server-overlay').classList.remove('hidden');
      $('connected-server-title').textContent = next.host ? `${next.host}:${next.port}` : 'Java Edition server';
      $('connected-server-subtitle').textContent = `${next.username || 'Player'} · Java ${next.version || 'auto'}`;
      if (!remoteActive) activateRemote();
    } else if (remoteStatus === 'connecting') {
      $('remote-status').classList.remove('hidden');
      $('remote-status').querySelector('span:last-child').textContent = 'Connecting to server…';
      $('server-overlay').classList.remove('hidden');
      $('auth-card').classList.add('hidden');
    } else if (remoteStatus === 'auth') {
      $('remote-status').classList.add('hidden');
      $('server-overlay').classList.remove('hidden');
      $('auth-card').classList.remove('hidden');
    } else if (remoteStatus === 'error') {
      if (remoteActive) {
        remoteActive = false;
        remoteEntityGroup.visible = false;
        clearRemoteEntities();
        mobGroup.visible = true;
        drawBlockWorld(worldMap);
        renderHotbar();
        updateHud();
      }
      showServerFailure(next.error || 'Could not connect.');
    } else if (remoteStatus === 'disconnected') {
      const disconnectError = next.error || remoteSession?.error;
      $('auth-card').classList.add('hidden');
      if (remoteSession?.disconnecting) {
        $('remote-status').classList.add('hidden');
        $('server-overlay').classList.add('hidden');
      } else if (disconnectError) {
        if (remoteActive) {
          remoteActive = false;
          remoteEntityGroup.visible = false;
          clearRemoteEntities();
          mobGroup.visible = true;
          drawBlockWorld(worldMap);
          renderHotbar();
          updateHud();
        }
        document.body.classList.add('server-mode');
        showServerFailure(disconnectError);
      } else {
        $('remote-status').classList.add('hidden');
        $('server-overlay').classList.add('hidden');
        if (remoteActive) {
          remoteActive = false;
          remoteEntityGroup.visible = false;
          clearRemoteEntities();
          mobGroup.visible = true;
          drawBlockWorld(worldMap);
          renderHotbar();
          updateHud();
          showToast('Server connection closed.');
        }
        remoteSession = null;
        document.body.classList.remove('server-mode');
      }
    }
    if (next.auth) updateAuth(next.auth);
  } else if (payload.type === 'auth') {
    updateAuth(payload.data || {});
  } else if (payload.type === 'snapshot') {
    remoteBlocks = new Map();
    for (const entry of payload.blocks || []) {
      if (!Array.isArray(entry) || entry.length < 4) continue;
      remoteBlocks.set(keyOf(Number(entry[0]), Number(entry[1]), Number(entry[2])), String(entry[3]));
    }
    drawBlockWorld(remoteBlocks);
    updateRemoteEntities(payload.entities || []);
    remoteTargetHint = `${remoteBlocks.size.toLocaleString()} nearby blocks streamed`;
    $('remote-hint').textContent = `Server world stream · ${remoteBlocks.size.toLocaleString()} nearby blocks`;
  } else if (payload.type === 'entities') {
    updateRemoteEntities(payload.entities || []);
    const entities = Array.isArray(payload.entities) ? payload.entities : [];
    const playersNearby = entities.filter((entity) => entity.kind === 'player' || entity.name === 'player').length;
    const animalsNearby = entities.length - playersNearby;
    $('remote-hint').textContent = `Nearby players: ${playersNearby} · animals/mobs: ${animalsNearby}`;
  } else if (payload.type === 'player') {
    if (!remoteSession) remoteSession = {};
    remoteSession.position = payload.position || remoteSession.position;
    remoteSession.yaw = Number.isFinite(payload.yaw) ? payload.yaw : remoteSession.yaw;
    remoteSession.pitch = Number.isFinite(payload.pitch) ? payload.pitch : remoteSession.pitch;
    remoteSession.dimension = String(payload.dimension || remoteSession.dimension || 'overworld').replaceAll('_', ' ').toUpperCase();
    if (Number.isFinite(payload.health)) player.health = payload.health;
    if (Number.isFinite(payload.food)) player.food = payload.food;
    if (Number.isFinite(payload.time)) worldTime = payload.time / 100;
    updateHud();
  } else if (payload.type === 'inventory') {
    remoteHotbar = Array.isArray(payload.items) ? payload.items.slice(0, 9) : Array.from({ length: 9 }, () => null);
    remoteSelected = Number.isInteger(payload.selected) ? payload.selected : 0;
    renderHotbar();
    if (screen === 'inventory') renderInventory();
  } else if (payload.type === 'chat') {
    appendServerChat(payload.text, payload.kind);
  }
}
function updateAuth(data) {
  const verificationUri = data.verification_uri || data.verificationUri || data.url || 'https://microsoft.com/link';
  const userCode = data.user_code || data.userCode || data.code || '';
  $('auth-link').href = verificationUri;
  $('auth-code').textContent = userCode || 'Check server log';
  $('auth-message').textContent = data.message || 'Open the Microsoft sign-in page and enter this code. This app never asks you to paste a password here.';
  $('auth-card').classList.remove('hidden');
}
function appendServerChat(text, kind = 'message') {
  if (!text) return;
  const node = document.createElement('div');
  node.className = `chat-line ${kind === 'error' ? 'error' : kind === 'notice' ? 'notice' : ''}`;
  node.textContent = String(text).slice(0, 600);
  $('chat-messages').append(node);
  while ($('chat-messages').children.length > 80) $('chat-messages').firstElementChild.remove();
  $('chat-messages').scrollTop = $('chat-messages').scrollHeight;
}
function sendSocket(message) {
  if (remoteSocket?.readyState === WebSocket.OPEN) remoteSocket.send(JSON.stringify(message));
}
function openSocket() {
  if (remoteSocket && remoteSocket.readyState <= WebSocket.OPEN) return;
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  remoteSocket = new WebSocket(`${protocol}//${location.host}/socket`);
  remoteSocket.addEventListener('message', (event) => {
    try { serverMessage(JSON.parse(event.data)); } catch (error) { console.warn('Bad server bridge message', error); }
  });
  remoteSocket.addEventListener('error', () => showToast('Server bridge socket failed. Is the local bridge running?'));
  remoteSocket.addEventListener('close', () => {
    if (remoteActive && remoteStatus !== 'disconnected') appendServerChat('Server bridge connection lost.', 'error');
  });
}
function activateRemote() {
  if (remoteActive) return;
  saveWorld();
  remoteActive = true;
  remoteBlocks.clear();
  clearRemoteEntities();
  remoteEntityGroup.visible = true;
  remoteSession = remoteSession || {};
  mobGroup.visible = false;
  while (worldGroup.children.length) worldGroup.remove(worldGroup.children[0]);
  targetOutline.visible = false;
  document.body.classList.add('server-mode');
  $('world-label').textContent = remoteSession.host || 'Java Edition server';
  $('mode-label').textContent = 'SERVER';
  $('remote-status').classList.add('hidden');
  renderHotbar();
  requestPointerLock();
  appendServerChat(`You are connected as ${remoteSession.username || 'player'}.`, 'notice');
}
function leaveRemoteMode() {
  remoteActive = false;
  remoteStatus = 'disconnected';
  remoteBlocks.clear();
  clearRemoteEntities();
  remoteEntityGroup.visible = false;
  remoteSession = null;
  mobGroup.visible = true;
  document.body.classList.remove('server-mode');
  drawBlockWorld(worldMap);
  $('world-label').textContent = worldName;
  $('mode-label').textContent = gameMode.toUpperCase();
  renderHotbar();
  updateHud();
  if (gameStarted && screen === 'game') requestPointerLock();
}
async function connectToServer(formData) {
  if (remoteActive) disconnectServer(false);
  remoteSession = {
    host: formData.host,
    port: formData.port,
    username: formData.username,
    version: formData.version || 'auto',
    label: `${formData.host}:${formData.port}`,
    disconnecting: false,
  };
  remoteStatus = 'connecting';
  remoteActive = false;
  lastDisplayedServerError = '';
  gameStarted = true;
  $('server-chat').classList.remove('chat-hidden');
  $('chat-messages').innerHTML = '';
  $('server-overlay').classList.remove('hidden');
  $('remote-status').classList.remove('hidden');
  $('remote-status').querySelector('span:last-child').textContent = 'Connecting to server…';
  $('auth-card').classList.add('hidden');
  setActiveLayer(null);
  document.body.classList.add('server-mode');
  openSocket();
  requestPointerLock();
  $('connect-button').disabled = true;
  $('connect-button').querySelector('b').textContent = 'Connecting…';
  try {
    const response = await fetch('/api/server/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, port: Number(formData.port) }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not start the connection.');
    $('server-screen').classList.add('hidden');
    screen = 'game';
  } catch (error) {
    remoteStatus = 'error';
    showServerFailure(error.message || 'Connection failed.');
    showToast(error.message || 'Could not connect.');
  } finally {
    $('connect-button').disabled = false;
    $('connect-button').querySelector('b').textContent = 'Connect';
  }
}
async function disconnectServer(callApi = true) {
  if (remoteSession) remoteSession.disconnecting = true;
  if (callApi) {
    try { await fetch('/api/server/disconnect', { method: 'POST' }); } catch { /* A lost bridge is already disconnected. */ }
  } else sendSocket({ type: 'disconnect' });
  if (remoteSocket) {
    try { remoteSocket.close(); } catch { /* Ignore already closed sockets. */ }
    remoteSocket = null;
  }
  $('server-overlay').classList.add('hidden');
  $('remote-status').classList.add('hidden');
  $('auth-card').classList.add('hidden');
  if (remoteActive) leaveRemoteMode();
  else {
    document.body.classList.remove('server-mode');
    drawBlockWorld(worldMap);
    $('world-label').textContent = worldName;
    $('mode-label').textContent = gameMode.toUpperCase();
  }
  remoteSession = null;
  remoteActive = false;
  remoteStatus = 'disconnected';
  if (!gameStarted) setActiveLayer('menu-screen');
  else if (screen !== 'game') setActiveLayer(null);
}

async function parseHostResponse(response) {
  let payload = {};
  try { payload = await response.json(); } catch { /* The bridge may have returned a non-JSON error page. */ }
  if (!response.ok) throw new Error(payload.error || `Hosting request failed (HTTP ${response.status}).`);
  return payload;
}

async function ensureHostControlToken() {
  if (hostControlToken) return hostControlToken;
  const response = await fetch('/api/host/session', { cache: 'no-store' });
  const payload = await parseHostResponse(response);
  if (!payload.token) throw new Error('Could not create a local hosting session. Open the app at localhost on the computer that should host the server.');
  hostControlToken = payload.token;
  return hostControlToken;
}

async function hostRequest(path, options = {}) {
  const token = await ensureHostControlToken();
  const headers = new Headers(options.headers || {});
  headers.set('X-Blockcraft-Host-Token', token);
  const response = await fetch(path, { ...options, headers, cache: 'no-store' });
  try {
    return await parseHostResponse(response);
  } catch (error) {
    if (response.status === 403) hostControlToken = null;
    throw error;
  }
}

function renderHostUnavailable(message) {
  hostControlToken = null;
  hostStatusCache = null;
  const banner = $('host-runtime-status');
  banner.className = 'host-runtime-status status-error';
  $('host-status-text').textContent = message;
  $('host-start-button').disabled = true;
  $('host-console').classList.add('hidden');
}

function renderHostStatus(data) {
  hostStatusCache = data;
  const banner = $('host-runtime-status');
  banner.className = `host-runtime-status status-${String(data.status || 'stopped')}`;
  const descriptions = {
    starting: 'Java server is starting…', running: `Server is running · Java ${data.version || '1.12.2'}`,
    stopping: 'Server is saving and stopping…', stopped: 'Server stopped.', error: 'The server reported an error. Check its log below.',
  };
  $('host-status-text').textContent = data.javaAvailable ? descriptions[data.status] || descriptions.stopped : data.javaMessage || 'Install Java to host a server.';
  const active = ['starting', 'running', 'stopping'].includes(data.status);
  $('host-server-form').classList.toggle('hidden', active);
  $('host-console').classList.toggle('hidden', !active && data.status !== 'error');
  $('host-console-status').textContent = descriptions[data.status] || descriptions.stopped;
  $('host-stop-button').disabled = !['starting', 'running'].includes(data.status);
  $('host-jar-file').required = !data.jarReady && !$('host-jar-file').files.length;
  if (data.jarReady) {
    $('host-jar-note').textContent = `A server JAR is saved on this computer (${(data.jarBytes / 1024 / 1024).toFixed(1)} MiB). Choose another file to replace it.`;
  } else if (!$('host-jar-file').files.length) {
    $('host-jar-note').textContent = 'Select a trusted Minecraft Java 1.12.2 server JAR (up to 128 MiB).';
  }
  const canStart = data.javaAvailable && !active && Boolean(data.jarReady || $('host-jar-file').files.length) && $('host-eula').checked;
  $('host-start-button').disabled = !canStart;
  const addressNode = $('host-addresses');
  addressNode.replaceChildren();
  const addresses = Array.isArray(data.addresses) ? data.addresses : [];
  if (addresses.length) {
    for (const address of addresses) {
      const item = document.createElement('code');
      item.textContent = address;
      addressNode.append(item);
    }
    $('host-address-note').textContent = 'Share a private LAN address below with friends on the same network.';
  } else if (data.status === 'running' || data.status === 'starting') {
    $('host-address-note').textContent = `Share this computer’s private LAN IP with port ${data.port}.`;
  }
  $('host-log').textContent = Array.isArray(data.logs) ? data.logs.join('\n') : '';
  $('host-log').scrollTop = $('host-log').scrollHeight;
}

async function refreshHostStatus() {
  if (hostStatusBusy) return;
  hostStatusBusy = true;
  try {
    const response = await fetch('/api/host/status', { cache: 'no-store' });
    const payload = await parseHostResponse(response);
    renderHostStatus(payload);
  } catch (error) {
    if (/localhost|Local hosting controls|this computer/i.test(error.message)) {
      stopHostStatusPolling();
      renderHostUnavailable('Local hosting controls work only when Blockcraft runs on this computer. Open http://localhost:5173; an Arena preview cannot expose a Minecraft server port.');
    } else {
      $('host-status-text').textContent = error.message || 'Could not check the local Java server.';
      $('host-runtime-status').className = 'host-runtime-status status-error';
    }
  } finally {
    hostStatusBusy = false;
  }
}

function startHostStatusPolling() {
  if (hostStatusPolling) return;
  void refreshHostStatus();
  hostStatusPolling = window.setInterval(() => void refreshHostStatus(), 2500);
}

function selectServerTab(tabName) {
  const selected = tabName === 'host' ? 'host' : 'join';
  for (const tab of document.querySelectorAll('[data-server-tab]')) {
    const active = tab.dataset.serverTab === selected;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  }
  $('join-server-panel').classList.toggle('hidden', selected !== 'join');
  $('host-server-panel').classList.toggle('hidden', selected !== 'host');
  if (selected === 'host') startHostStatusPolling();
}

function stopHostStatusPolling() {
  if (hostStatusPolling) window.clearInterval(hostStatusPolling);
  hostStatusPolling = null;
}

async function startHostedServer(event) {
  event.preventDefault();
  const button = $('host-start-button');
  const jarFile = $('host-jar-file').files[0];
  const originalLabel = button.querySelector('b').textContent;
  button.disabled = true;
  button.querySelector('b').textContent = jarFile ? 'Saving server JAR…' : 'Starting server…';
  try {
    await ensureHostControlToken();
    if (jarFile) {
      await hostRequest('/api/host/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: jarFile,
      });
    }
    button.querySelector('b').textContent = 'Starting server…';
    await hostRequest('/api/host/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        port: Number($('host-port').value),
        memoryMb: Number($('host-memory').value),
        acceptEula: $('host-eula').checked,
      }),
    });
    $('host-console').classList.remove('hidden');
    startHostStatusPolling();
    await refreshHostStatus();
  } catch (error) {
    $('host-runtime-status').className = 'host-runtime-status status-error';
    $('host-status-text').textContent = error.message || 'Could not start the local server.';
    showToast(error.message || 'Could not start the local server.');
    await refreshHostStatus();
  } finally {
    button.querySelector('b').textContent = originalLabel;
    if (hostStatusCache) renderHostStatus(hostStatusCache);
  }
}

async function stopHostedServer() {
  $('host-stop-button').disabled = true;
  try {
    await hostRequest('/api/host/stop', { method: 'POST' });
    await refreshHostStatus();
  } catch (error) {
    $('host-status-text').textContent = error.message || 'Could not stop the server.';
    $('host-runtime-status').className = 'host-runtime-status status-error';
  }
}

function startAmbience() {
  if (!audioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) { showToast('Ambient audio is not supported in this browser.'); return; }
    audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 110;
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    gain.gain.value = 0;
    oscillator.connect(filter).connect(gain).connect(audioContext.destination);
    oscillator.start();
    ambientNodes = { oscillator, filter, gain };
  }
  audioContext.resume();
  ambientEnabled = !ambientEnabled;
  ambientNodes.gain.gain.setTargetAtTime(ambientEnabled ? 0.012 : 0, audioContext.currentTime, 0.12);
  $('sound-button').style.color = ambientEnabled ? '#c8e7a5' : '';
  $('sound-button').title = ambientEnabled ? 'Mute ambient tone' : 'Toggle ambient sound';
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.04, (now - lastFrame) / 1000 || 0);
  lastFrame = now;
  frameCount += 1;
  if (now - fpsWindowStart >= 1000) {
    fpsEstimate = frameCount;
    frameCount = 0;
    fpsWindowStart = now;
  }
  if (screen === 'game') {
    if (remoteSession) {
      if (remoteActive) {
        animateRemoteEntities(dt);
        setCamera();
        updateLighting(worldTime);
        updateHud();
      }
    } else {
      simulateLocal(dt);
      setCamera();
      worldTime += dt;
      playSeconds += dt;
      updateLighting();
      if (now - lastTargetUpdate > 115) {
        updateTarget();
        lastTargetUpdate = now;
      }
      requestSaveIfNeeded();
      if (now % 180 < 20) updateHud();
    }
  } else if (remoteActive && remoteSession?.position) {
    setCamera();
  }
  renderer.render(scene, camera);
}

// Load the exact 1.12.2 registry and recipe data alongside the local save.
void loadGameData();
// Load or create the local world before the title screen appears.
if (!loadSave()) {
  inventory = freshInventory(gameMode);
  generateWorld(worldSeed);
  player.position.copy(findStartPosition());
  updateWorldMeta();
  renderHotbar();
}
renderHotbar();
renderInventory();
updateLighting();
updateHud();
onResize();
requestAnimationFrame(animate);

// Main menu, pause, inventory, and settings.
$('play-button').addEventListener('click', createNewWorld);
$('resume-button').addEventListener('click', () => {
  if (!worldMap.size) loadSave();
  updateWorldMeta();
  enterGame();
});
$('server-menu-button').addEventListener('click', () => {
  setActiveLayer('server-screen');
  selectServerTab('join');
  if (document.pointerLockElement) document.exitPointerLock();
});
document.querySelectorAll('[data-server-tab]').forEach((tab) => tab.addEventListener('click', () => selectServerTab(tab.dataset.serverTab)));
$('server-close').addEventListener('click', () => setActiveLayer('menu-screen'));
$('home-button').addEventListener('click', showMenu);
$('pause-button').addEventListener('click', openPause);
$('resume-game-button').addEventListener('click', closeOverlay);
$('inventory-button').addEventListener('click', openInventory);
$('pause-settings-button').addEventListener('click', openSettings);
$('save-exit-button').addEventListener('click', showMenu);
$('inventory-close').addEventListener('click', closeOverlay);
$('settings-button').addEventListener('click', openSettings);
$('settings-close').addEventListener('click', closeOverlay);
$('fov-setting').addEventListener('input', (event) => {
  $('fov-value').textContent = `${event.target.value}°`;
  camera.fov = Number(event.target.value);
  camera.updateProjectionMatrix();
});
$('distance-setting').addEventListener('input', (event) => {
  $('distance-value').textContent = event.target.value;
  scene.fog.near = Number(event.target.value) * 0.72;
  scene.fog.far = Number(event.target.value) * 1.65;
});
$('outline-setting').addEventListener('change', (event) => {
  targetOutline.visible = Boolean(event.target.checked && targetBlock && screen === 'game');
});
$('coords-setting').addEventListener('change', updateHud);
$('difficulty-setting').addEventListener('change', (event) => {
  difficulty = ['peaceful', 'easy', 'normal', 'hard'].includes(event.target.value) ? event.target.value : 'normal';
  lastHungerTick = performance.now(); lastRegenTick = lastHungerTick; lastStarveTick = lastHungerTick;
  updateWorldMeta();
  scheduleSave();
  showToast(`Difficulty: ${difficulty}.`);
});
$('sound-button').addEventListener('click', startAmbience);
$('switch-mode-button').addEventListener('click', () => {
  if (remoteActive) return;
  setGameMode(gameMode === 'creative' ? 'survival' : 'creative');
  showToast(`Mode: ${gameMode}.`);
});

// Inventory and hotbar actions.
hotbarNode.addEventListener('click', (event) => {
  const slot = event.target.closest('[data-slot]');
  if (slot) selectSlot(Number(slot.dataset.slot));
});
$('inventory-grid').addEventListener('click', (event) => {
  const slot = event.target.closest('[data-item]');
  if (!slot) return;
  const name = slot.dataset.item;
  if (remoteActive) {
    const index = remoteHotbar.findIndex((item) => item?.name === name);
    if (index >= 0) selectSlot(index);
  } else {
    const index = hotbar.indexOf(name);
    if (index >= 0) selectSlot(index);
    else if (catalogByName.has(name)) {
      hotbar[selectedSlot] = name;
      renderHotbar();
      renderInventory();
      scheduleSave();
      showToast(`${itemInfo(name).label} added to hotbar.`);
    }
  }
});
document.querySelectorAll('[data-inventory-tab]').forEach((tab) => tab.addEventListener('click', () => {
  inventoryTab = tab.dataset.inventoryTab || 'all';
  renderInventory();
}));
$('inventory-search').addEventListener('input', () => { renderInventory(); });
$('recipe-search').addEventListener('input', () => { renderInventory(); });
$('recipe-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-recipe]');
  if (button && !button.disabled) craftRecipe(Number(button.dataset.recipe));
});

// Java server bridge, chat, and Microsoft device-code sign-in.
$('server-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.currentTarget).entries());
  if (!formData.version) formData.version = '';
  if (!formData.host || !formData.username) return;
  connectToServer(formData);
});
$('host-server-form').addEventListener('submit', startHostedServer);
$('host-stop-button').addEventListener('click', stopHostedServer);
$('host-eula').addEventListener('change', () => {
  if (hostStatusCache) renderHostStatus(hostStatusCache);
});
$('host-jar-file').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file && file.size > 128 * 1024 * 1024) {
    event.target.value = '';
    showToast('Server JAR exceeds the 128 MiB upload limit.');
  } else if (file && !file.name.toLowerCase().endsWith('.jar')) {
    event.target.value = '';
    showToast('Choose a .jar server file.');
  }
  if (hostStatusCache) renderHostStatus(hostStatusCache);
});
$('disconnect-button').addEventListener('click', () => disconnectServer(true));
$('copy-code').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('auth-code').textContent);
    showToast('Sign-in code copied.');
  } catch { showToast('Select the code to copy it.'); }
});
$('chat-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = $('chat-input');
  const text = input.value.trim();
  if (text) sendSocket({ type: 'chat', text });
  input.value = '';
  input.focus();
});
$('chat-close').addEventListener('click', () => $('server-chat').classList.toggle('chat-hidden'));
$('command-form').addEventListener('submit', (event) => {
  event.preventDefault();
  runCommand($('command-input').value);
  $('command-input').value = '';
});

canvas.addEventListener('contextmenu', (event) => event.preventDefault());
canvas.addEventListener('click', () => {
  if (screen === 'game' && !pointerLocked) requestPointerLock();
});
document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === canvas;
  document.body.classList.toggle('pointer-locked', pointerLocked);
});
document.addEventListener('mousemove', (event) => {
  if (!pointerLocked || screen !== 'game') return;
  const sensitivity = 0.0021;
  if (remoteActive) {
    if (remoteSession) {
      remoteSession.yaw = ((remoteSession.yaw || 0) - event.movementX * sensitivity + Math.PI * 4) % (Math.PI * 2);
      remoteSession.pitch = THREE.MathUtils.clamp((remoteSession.pitch || 0) - event.movementY * sensitivity, -1.5, 1.5);
      sendSocket({ type: 'look', yaw: remoteSession.yaw, pitch: remoteSession.pitch });
    }
  } else {
    player.yaw = (player.yaw - event.movementX * sensitivity + Math.PI * 4) % (Math.PI * 2);
    player.pitch = THREE.MathUtils.clamp(player.pitch - event.movementY * sensitivity, -1.48, 1.48);
  }
});
canvas.addEventListener('mousedown', (event) => {
  if (screen !== 'game' || !pointerLocked) return;
  if (event.button === 0) {
    if (remoteActive) sendSocket({ type: 'action', action: 'dig' });
    else mineLocalBlock();
  } else if (event.button === 2) {
    if (remoteActive) sendSocket({ type: 'action', action: 'place' });
    else placeLocalBlock();
  }
});
canvas.addEventListener('wheel', (event) => {
  if (screen !== 'game') return;
  event.preventDefault();
  const delta = event.deltaY > 0 ? 1 : -1;
  selectSlot(((remoteActive ? remoteSelected : selectedSlot) + delta + 9) % 9);
}, { passive: false });

window.addEventListener('keydown', (event) => {
  const target = event.target;
  const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
  if (isTyping) {
    if (event.code === 'Escape') {
      event.preventDefault();
      if (target.id === 'command-input') closeOverlay();
      else { target.blur(); if (remoteActive) requestPointerLock(); }
    }
    return;
  }
  if (event.code === 'Escape') {
    event.preventDefault();
    if (screen === 'server' && !gameStarted) setActiveLayer('menu-screen');
    else if (screen === 'inventory' || screen === 'settings' || screen === 'chat' || screen === 'server') closeOverlay();
    else if (screen === 'pause') closeOverlay();
    else if (screen === 'game' && !remoteActive) openPause();
    else if (screen === 'game' && remoteActive) {
      if (document.pointerLockElement) document.exitPointerLock();
      $('chat-input').blur();
    }
    return;
  }
  if (!gameStarted || screen !== 'game') return;
  if (remoteSession) {
    if (remoteActive && (event.code === 'KeyT' || event.code === 'Enter')) {
      event.preventDefault();
      $('chat-input').focus();
      return;
    }
    if (remoteActive && event.code === 'KeyE') { event.preventDefault(); openInventory(); return; }
    if (!remoteActive) return;
    const control = remoteControls[event.code];
    if (control) {
      event.preventDefault();
      if (!event.repeat) sendSocket({ type: 'control', key: control, down: true });
    }
  } else {
    if (event.code === 'KeyE') { event.preventDefault(); openInventory(); return; }
    if (event.code === 'KeyT' || event.code === 'Enter') { event.preventDefault(); openChat(); return; }
    if (event.code.startsWith('Digit')) {
      const slot = Number(event.code.slice(5)) - 1;
      if (slot >= 0 && slot <= 8) selectSlot(slot);
    }
    if (event.code === 'Space') event.preventDefault();
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight'].includes(event.code)) keyState.add(event.code);
  }
});
window.addEventListener('keyup', (event) => {
  keyState.delete(event.code);
  if (remoteSession) {
    const control = remoteControls[event.code];
    if (control) sendSocket({ type: 'control', key: control, down: false });
  }
});
window.addEventListener('blur', () => {
  if (remoteSession) for (const control of new Set(Object.values(remoteControls))) sendSocket({ type: 'control', key: control, down: false });
  keyState.clear();
});
window.addEventListener('resize', onResize);
window.addEventListener('beforeunload', () => {
  saveWorld();
  if (remoteSocket?.readyState === WebSocket.OPEN) sendSocket({ type: 'disconnect' });
});

// Make sure that the game canvas is active when returning from title/pause.
$('menu-screen').addEventListener('click', (event) => {
  if (event.target === $('menu-screen')) return;
});
