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

const blockCatalog = [
  { name: 'grass_block', label: 'Grass Block', icon: 'grass', category: 'grass' },
  { name: 'dirt', label: 'Dirt', icon: 'dirt', category: 'dirt' },
  { name: 'stone', label: 'Stone', icon: 'stone', category: 'stone' },
  { name: 'oak_log', label: 'Oak Log', icon: 'wood', category: 'wood' },
  { name: 'oak_leaves', label: 'Oak Leaves', icon: 'leaves', category: 'leaves' },
  { name: 'sand', label: 'Sand', icon: 'sand', category: 'sand' },
  { name: 'oak_planks', label: 'Oak Planks', icon: 'planks', category: 'planks' },
  { name: 'glass', label: 'Glass', icon: 'glass', category: 'glass' },
  { name: 'torch', label: 'Torch', icon: 'torch', category: 'torch' },
  { name: 'cobblestone', label: 'Cobblestone', icon: 'stone', category: 'stone' },
  { name: 'mossy_cobblestone', label: 'Mossy Cobblestone', icon: 'leaves', category: 'stone' },
  { name: 'deepslate', label: 'Deepslate', icon: 'stone', category: 'stone' },
  { name: 'coal_ore', label: 'Coal Ore', icon: 'ore', category: 'ore' },
  { name: 'iron_ore', label: 'Iron Ore', icon: 'ore', category: 'ore' },
  { name: 'diamond_ore', label: 'Diamond Ore', icon: 'ore', category: 'ore' },
  { name: 'spruce_log', label: 'Spruce Log', icon: 'wood', category: 'wood' },
  { name: 'birch_log', label: 'Birch Log', icon: 'wood', category: 'wood' },
  { name: 'stripped_oak_log', label: 'Stripped Oak Log', icon: 'wood', category: 'wood' },
  { name: 'spruce_leaves', label: 'Spruce Leaves', icon: 'leaves', category: 'leaves' },
  { name: 'coarse_dirt', label: 'Coarse Dirt', icon: 'dirt', category: 'dirt' },
  { name: 'red_sand', label: 'Red Sand', icon: 'sand', category: 'sand' },
  { name: 'sandstone', label: 'Sandstone', icon: 'sand', category: 'sand' },
  { name: 'gravel', label: 'Gravel', icon: 'sand', category: 'sand' },
  { name: 'spruce_planks', label: 'Spruce Planks', icon: 'planks', category: 'planks' },
  { name: 'birch_planks', label: 'Birch Planks', icon: 'planks', category: 'planks' },
  { name: 'stone_bricks', label: 'Stone Bricks', icon: 'stone', category: 'stone' },
  { name: 'bricks', label: 'Bricks', icon: 'brick', category: 'brick' },
  { name: 'moss_block', label: 'Moss Block', icon: 'leaves', category: 'leaves' },
  { name: 'tinted_glass', label: 'Tinted Glass', icon: 'glass', category: 'glass' },
  { name: 'ice', label: 'Ice', icon: 'glass', category: 'glass' },
  { name: 'white_wool', label: 'White Wool', icon: 'wool', category: 'wool' },
  { name: 'red_wool', label: 'Red Wool', icon: 'wool', category: 'wool' },
  { name: 'blue_wool', label: 'Blue Wool', icon: 'wool', category: 'wool' },
  { name: 'terracotta', label: 'Terracotta', icon: 'brick', category: 'brick' },
  { name: 'glowstone', label: 'Glowstone', icon: 'torch', category: 'torch' },
  { name: 'lantern', label: 'Lantern', icon: 'torch', category: 'torch' },
  { name: 'crafting_table', label: 'Crafting Table', icon: 'planks', category: 'craft' },
  { name: 'furnace', label: 'Furnace', icon: 'stone', category: 'stone' },
  { name: 'chest', label: 'Chest', icon: 'wood', category: 'wood' },
  { name: 'barrel', label: 'Barrel', icon: 'wood', category: 'wood' },
  { name: 'bookshelf', label: 'Bookshelf', icon: 'book', category: 'book' },
  { name: 'tnt', label: 'TNT', icon: 'tnt', category: 'tnt' },
  { name: 'water', label: 'Water', icon: 'glass', category: 'water' },
  { name: 'lava', label: 'Lava', icon: 'torch', category: 'water' },
  { name: 'coal', label: 'Coal', icon: 'ore', category: 'ore', placeable: false },
  { name: 'stick', label: 'Stick', icon: 'wood', category: 'wood', placeable: false },
];
const catalogByName = new Map(blockCatalog.map((block) => [block.name, block]));
const defaultHotbar = blockCatalog.slice(0, 9).map((block) => block.name);
const recipes = [
  { name: 'Oak Planks ×4', inputs: { oak_log: 1 }, output: { oak_planks: 4 } },
  { name: 'Sticks ×4', inputs: { oak_planks: 2 }, output: { stick: 4 } },
  { name: 'Torches ×4', inputs: { coal: 1, stick: 1 }, output: { torch: 4 } },
  { name: 'Stone Bricks ×4', inputs: { stone: 4 }, output: { stone_bricks: 4 } },
];

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
  if (name.includes('leaves') || name.includes('vine') || name.includes('moss_carpet') || name.includes('moss_block')) return 'leaves';
  if (name.includes('grass_block') || name === 'grass' || name.includes('mycelium') || name.includes('podzol')) return 'grass';
  if (name.includes('dirt') || name.includes('mud') || name.includes('clay')) return 'dirt';
  if (name.includes('sand') || name.includes('gravel') || name.includes('snow')) return 'sand';
  if (name.includes('log') || name.includes('wood') || name.includes('stem') || name.includes('hyphae')) return 'wood';
  if (name.includes('planks') || name.includes('bamboo_block')) return 'planks';
  if (name.includes('ore') || name.includes('raw_')) return 'ore';
  if (name.includes('torch') || name.includes('lantern') || name.includes('candle') || name.includes('glowstone')) return 'torch';
  if (name.includes('stone_brick')) return 'stone';
  if (name.includes('brick') || name.includes('terracotta')) return 'brick';
  if (name.includes('stone') || name.includes('deepslate') || name.includes('cobble') || name.includes('andesite') || name.includes('granite') || name.includes('diorite') || name.includes('basalt')) return 'stone';
  return 'stone';
}
function itemInfo(name) {
  const known = catalogByName.get(name);
  if (known) return known;
  const category = visualCategory(name);
  const label = String(name || 'Unknown item').split('_').map((word) => word ? word[0].toUpperCase() + word.slice(1) : '').join(' ');
  return { name, label, icon: category, category };
}
function isWater(name) { return name === 'water' || name === 'lava' || String(name).includes('water'); }
function isSolid(name) { return Boolean(name) && !isWater(name); }

let worldSeed = 482901;
let worldName = 'Cedar Valley';
let gameMode = 'creative';
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
let lastWorldSave = 0;
let lastTargetUpdate = 0;
let remoteTargetHint = 'Server world stream';
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
    if (!groups.has(category)) groups.set(category, []);
    const [x, y, z] = parseKey(key);
    groups.get(category).push([x, y, z]);
  }
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  for (const [category, positions] of groups) {
    if (!positions.length) continue;
    const mesh = new THREE.InstancedMesh(blockGeometry, materialsFor(category), positions.length);
    mesh.name = `block-${category}`;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    for (let index = 0; index < positions.length; index += 1) {
      const [x, y, z] = positions[index];
      position.set(x + 0.5, y + 0.5, z + 0.5);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    worldGroup.add(mesh);
  }
}

function generateWorld(seed, savedEdits = []) {
  worldSeed = Number.isFinite(Number(seed)) ? Number(seed) : 482901;
  worldMap.clear();
  edits.clear();
  const radius = 36;
  const seaLevel = 5;
  for (let x = -radius; x <= radius; x += 1) {
    for (let z = -radius; z <= radius; z += 1) {
      const surface = heightAt(x, z, worldSeed);
      const shoreline = surface <= seaLevel + 1;
      for (let y = 0; y <= surface; y += 1) {
        let name = 'stone';
        if (y === 0) name = 'bedrock';
        else if (y === surface) name = shoreline ? 'sand' : 'grass_block';
        else if (y >= surface - 3) name = shoreline ? 'sand' : 'dirt';
        else if (y > 1 && y < surface - 3) {
          const roll = hash01(x, y, z, worldSeed + 197);
          if (roll < 0.018) name = 'coal_ore';
          else if (roll < 0.023) name = 'iron_ore';
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
      if (chance > 0.115 || (Math.abs(x) < 5 && Math.abs(z - 18) < 5)) continue;
      const ground = heightAt(x, z, worldSeed);
      if (ground <= seaLevel + 1) continue;
      const trunkHeight = 3 + Math.floor(hash01(x, 8, z, worldSeed) * 2);
      for (let dy = 1; dy <= trunkHeight; dy += 1) worldMap.set(keyOf(x, ground + dy, z), 'oak_log');
      const crownY = ground + trunkHeight;
      for (let dx = -2; dx <= 2; dx += 1) {
        for (let dz = -2; dz <= 2; dz += 1) {
          for (let dy = -1; dy <= 2; dy += 1) {
            const distance = Math.abs(dx) + Math.abs(dz) + Math.max(0, dy - 1);
            if (distance > 4 || (Math.abs(dx) === 2 && Math.abs(dz) === 2)) continue;
            const leafKey = keyOf(x + dx, crownY + dy, z + dz);
            if (!worldMap.has(leafKey)) worldMap.set(leafKey, 'oak_leaves');
          }
        }
      }
    }
  }

  for (const [key, value] of savedEdits || []) {
    if (typeof key !== 'string') continue;
    if (value) worldMap.set(key, String(value));
    else worldMap.delete(key);
    edits.set(key, value || null);
  }
  drawBlockWorld(worldMap);
}

function getSurfaceY(x, z) {
  for (let y = 32; y >= -1; y -= 1) {
    const name = worldMap.get(keyOf(Math.floor(x), y, Math.floor(z)));
    if (isSolid(name) && name !== 'oak_leaves') return y + 1;
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

function freshInventory(mode) {
  const items = Object.fromEntries(blockCatalog.map((block) => [block.name, mode === 'creative' ? 64 : 0]));
  if (mode === 'creative') {
    items.coal = 32;
    items.stick = 16;
    return items;
  }
  Object.assign(items, { grass_block: 32, dirt: 48, stone: 32, oak_log: 8, oak_leaves: 12, sand: 12, oak_planks: 4, glass: 4, torch: 8 });
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
    lastHungerTick = performance.now();
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
  for (const id of hideableLayers) $(id).classList.toggle('hidden', id !== layerId);
  screen = layerId ? layerId.replace('-screen', '') : 'game';
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
  const selectedName = items[selected] || hotbar[selectedSlot] || 'grass_block';
  $('selected-name').textContent = itemInfo(selectedName).label;
}
function renderInventory() {
  const list = remoteActive
    ? remoteHotbar.map((item) => item?.name).filter(Boolean).map((name) => ({ ...itemInfo(name), count: remoteHotbar.find((item) => item?.name === name)?.count || 0 }))
    : blockCatalog.map((item) => ({ ...item, count: gameMode === 'creative' ? '∞' : Number(inventory[item.name] || 0) }));
  $('inventory-grid').innerHTML = list.map((item) => `<button class="inventory-slot ${item.name === (remoteActive ? remoteHotbar[remoteSelected]?.name : hotbar[selectedSlot]) ? 'active' : ''}" data-item="${escapeHtml(item.name)}" title="Select ${escapeHtml(item.label)}"><i class="block-icon ${item.icon}"></i><span>${escapeHtml(item.label)}</span><b class="slot-count">${item.count}</b></button>`).join('');
  if (remoteActive) {
    $('recipe-list').innerHTML = '<div class="recipe-row">Server inventory is managed by the server.</div>';
    $('switch-mode-button').classList.add('hidden');
    $('inventory-mode').textContent = 'Server';
    $('inventory-time').textContent = remoteSession?.version || 'Java Edition';
  } else {
    $('switch-mode-button').classList.remove('hidden');
    $('inventory-mode').textContent = gameMode === 'creative' ? 'Creative' : 'Survival';
    $('inventory-time').textContent = timeName();
    $('recipe-list').innerHTML = recipes.map((recipe, index) => {
      const canCraft = gameMode === 'creative' || Object.entries(recipe.inputs).every(([name, count]) => Number(inventory[name] || 0) >= count);
      return `<div class="recipe-row"><span>${escapeHtml(recipe.name)}</span><button data-recipe="${index}" ${canCraft ? '' : 'disabled'}>Craft</button></div>`;
    }).join('');
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
  if (gameMode !== 'creative') {
    for (const [name, count] of Object.entries(recipe.inputs)) {
      if (Number(inventory[name] || 0) < count) {
        showToast(`Need ${count} ${itemInfo(name).label.toLowerCase()}.`);
        return;
      }
    }
    for (const [name, count] of Object.entries(recipe.inputs)) inventory[name] = Math.max(0, Number(inventory[name] || 0) - count);
  }
  for (const [name, count] of Object.entries(recipe.output)) inventory[name] = Number(inventory[name] || 0) + count;
  const outputName = Object.keys(recipe.output)[0];
  if (!hotbar.includes(outputName) && catalogByName.get(outputName)?.placeable !== false) hotbar[selectedSlot] = outputName;
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
  $('weather-icon').textContent = weather === 'rain' ? '☂' : worldTime % 240 < 36 || worldTime % 240 > 200 ? '☾' : '☀';
  const fill = ((worldTime % 240) / 240) * 100;
  $('xp-fill').style.width = `${Math.max(5, Math.min(95, (playSeconds % 90) / 90 * 100))}%`;
  $('xp-level').textContent = String(Math.floor(playSeconds / 60) + 1).padStart(2, '0');
  $('fps-count').textContent = String(fpsEstimate);
  if (remoteActive) $('biome-name').textContent = remoteSession?.dimension || 'SERVER WORLD';
  else {
    const localHeight = heightAt(Math.floor(player.position.x), Math.floor(player.position.z), worldSeed);
    $('biome-name').textContent = localHeight >= 13 ? 'HIGHLAND' : (localHeight <= 5 ? 'RIVERBANK' : 'MEADOW');
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
  if (gameMode === 'survival' && performance.now() - lastHungerTick > 90000) {
    player.food = Math.max(0, player.food - 1);
    lastHungerTick = performance.now();
  }
  if (gameMode === 'survival' && player.food > 16 && player.health < 20 && performance.now() - lastHungerTick > 6000) player.health = Math.min(20, player.health + 1);
}
function respawnPlayer() {
  player.health = 20;
  player.food = Math.max(8, player.food);
  player.position.copy(findStartPosition());
  player.velocity.set(0, 0, 0);
  player.onGround = false;
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
    if (worldMap.has(key)) return { x, y, z, key, name: worldMap.get(key), adjacent: prevCell || { x, y: y + 1, z } };
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
function mineLocalBlock() {
  if (screen !== 'game' || remoteSession) return;
  const hit = pickLocalBlock();
  if (!hit) return;
  modifyBlock(hit.x, hit.y, hit.z, null);
  if (gameMode === 'survival') {
    const drop = hit.name === 'coal_ore' ? 'coal' : hit.name;
    inventory[drop] = Number(inventory[drop] || 0) + 1;
  }
  showToast(`Mined ${itemInfo(hit.name).label}.`);
  renderInventory();
}
function placeLocalBlock() {
  if (screen !== 'game' || remoteSession) return;
  const hit = pickLocalBlock();
  if (!hit) { showToast('Look at a block to place against.'); return; }
  const selected = hotbar[selectedSlot];
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
    appendCommand('/time set day|night · /weather clear|rain · /gamemode creative|survival · /tp x y z · /setblock x y z block · /seed');
  } else if (command === 'seed') {
    appendCommand(`World seed: ${worldSeed}`);
  } else if (command === 'time' && parts[0] === 'set') {
    if (parts[1] === 'day') worldTime = 56;
    else if (parts[1] === 'night') worldTime = 190;
    else { appendCommand('Use /time set day or /time set night.'); return; }
    updateLighting(); appendCommand(`Time set to ${parts[1]}.`); updateHud(); scheduleSave();
  } else if (command === 'weather' && ['clear', 'rain'].includes(parts[0])) {
    weather = parts[0]; updateLighting(); updateHud(); appendCommand(`Weather changed to ${weather}.`);
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
    const block = parts[3].toLowerCase();
    if (![x, y, z].every(Number.isFinite)) appendCommand('Coordinates must be numbers.');
    else if (!catalogByName.has(block)) appendCommand(`Unknown block: ${block}. Try grass_block, dirt, stone, oak_log, glass.`);
    else { modifyBlock(Math.floor(x), Math.floor(y), Math.floor(z), block); appendCommand(`Placed ${block} at ${Math.floor(x)}, ${Math.floor(y)}, ${Math.floor(z)}.`); }
  } else appendCommand(`Unknown command: /${command}. Try /help.`);
}
function setGameMode(mode) {
  const previousMode = gameMode;
  gameMode = mode === 'survival' ? 'survival' : 'creative';
  if (gameMode === 'survival' && previousMode === 'creative') inventory = freshInventory('survival');
  if (!inventory || !Object.keys(inventory).length) inventory = freshInventory(gameMode);
  if (gameMode === 'creative') {
    for (const item of blockCatalog) inventory[item.name] = Math.max(Number(inventory[item.name] || 0), 64);
  }
  updateWorldMeta();
  renderHotbar();
  renderInventory();
  scheduleSave();
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
      $('remote-status').classList.remove('hidden');
      $('remote-status').querySelector('span:last-child').textContent = next.error || 'Could not connect.';
      $('server-overlay').classList.remove('hidden');
      $('auth-card').classList.add('hidden');
      appendServerChat(next.error || 'Connection failed.', 'error');
    } else if (remoteStatus === 'disconnected') {
      const disconnectError = next.error || remoteSession?.error;
      $('auth-card').classList.add('hidden');
      if (remoteSession?.disconnecting) {
        $('remote-status').classList.add('hidden');
        $('server-overlay').classList.add('hidden');
      } else if (disconnectError) {
        if (remoteActive) {
          remoteActive = false;
          drawBlockWorld(worldMap);
          renderHotbar();
          updateHud();
        }
        document.body.classList.add('server-mode');
        $('remote-status').classList.remove('hidden');
        $('remote-status').querySelector('span:last-child').textContent = disconnectError;
        $('server-overlay').classList.remove('hidden');
      } else {
        $('remote-status').classList.add('hidden');
        $('server-overlay').classList.add('hidden');
        if (remoteActive) {
          remoteActive = false;
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
    remoteTargetHint = `${remoteBlocks.size.toLocaleString()} nearby blocks streamed`;
    $('remote-hint').innerHTML = `Server world stream <span>·</span> ${remoteBlocks.size.toLocaleString()} nearby blocks`;
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
  remoteSession = remoteSession || {};
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
  remoteSession = null;
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
    $('server-overlay').classList.remove('hidden');
    $('remote-status').classList.remove('hidden');
    $('remote-status').querySelector('span:last-child').textContent = error.message || 'Connection failed.';
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
  if (document.pointerLockElement) document.exitPointerLock();
});
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
    else if (catalogByName.get(name)?.placeable === false) showToast(`${itemInfo(name).label} is not a placeable block.`);
    else {
      hotbar[selectedSlot] = name;
      renderHotbar();
      renderInventory();
      scheduleSave();
      showToast(`${itemInfo(name).label} added to hotbar.`);
    }
  }
});
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
