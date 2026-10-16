import express from 'express';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync, statSync } from 'node:fs';
import { WebSocketServer, WebSocket } from 'ws';
import mineflayer from 'mineflayer';
import minecraftData from 'minecraft-data';
import { Vec3 } from 'vec3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
const clients = new Set();
const port = Number(process.env.PORT || 3001);
const profilesFolder = path.join(os.homedir(), '.blockcraft', 'profiles');
mkdirSync(profilesFolder, { recursive: true });

let bot = null;
let sessionToken = 0;
let snapshotTimer = null;
let entityTimer = null;
let snapshotBusy = false;
let lastSnapshotAt = 0;
let lastPlayerAt = 0;
const hostControlToken = randomBytes(32).toString('hex');
const hostedServerFolder = path.resolve(process.env.BLOCKCRAFT_HOST_DIR || path.join(os.homedir(), '.blockcraft', 'hosted-server'));
const hostedServerJar = path.join(hostedServerFolder, 'server.jar');
let hostedServerProcess = null;
let hostedServerStopTimer = null;
let hostStartInProgress = false;
let javaStatusCache = { checkedAt: 0, available: false, message: 'Java has not been checked yet.' };
let hostedServerState = { status: 'stopped', port: 25565, memoryMb: 2048, startedAt: null, exitCode: null, logs: [] };
let state = {
  status: 'disconnected',
  host: '',
  port: 25565,
  username: '',
  version: '',
  position: null,
  health: 20,
  food: 20,
  time: 0,
  auth: null,
  error: '',
};

app.use(express.json({ limit: '32kb' }));
app.disable('x-powered-by');

const gameDataCache = new Map();
const itemMetadataLabels = {
  dye: ['Ink Sac', 'Rose Red', 'Cactus Green', 'Cocoa Beans', 'Lapis Lazuli', 'Purple Dye', 'Cyan Dye', 'Light Gray Dye', 'Gray Dye', 'Pink Dye', 'Lime Dye', 'Dandelion Yellow', 'Light Blue Dye', 'Magenta Dye', 'Orange Dye', 'Bone Meal'],
  coal: ['Coal', 'Charcoal'],
  fish: ['Raw Fish', 'Raw Salmon', 'Clownfish', 'Pufferfish'],
  cooked_fish: ['Cooked Fish', 'Cooked Salmon'],
  golden_apple: ['Golden Apple', 'Enchanted Golden Apple'],
  skull: ['Skeleton Skull', 'Wither Skeleton Skull', 'Zombie Head', 'Player Head', 'Creeper Head', 'Dragon Head'],
};
const blockMetadataOverrides = {
  stone: ['Stone', 'Granite', 'Polished Granite', 'Diorite', 'Polished Diorite', 'Andesite', 'Polished Andesite'],
  sapling: ['Oak Sapling', 'Spruce Sapling', 'Birch Sapling', 'Jungle Sapling', 'Acacia Sapling', 'Dark Oak Sapling'],
};
const blockMetadataIndexes = {
  log: [0, 1, 2, 3], log2: [0, 1], leaves: [0, 1, 2, 3], leaves2: [0, 1],
  double_plant: [0, 1, 2, 3, 4, 5], wooden_slab: [0, 1, 2, 3, 4, 5],
  stone_slab: [0, 1, 2, 3, 4, 5, 6, 7], quartz_block: [0, 1, 2],
};
const hiddenBlockItems = new Set(['air', 'flowing_water', 'flowing_lava', 'fire', 'portal', 'end_portal', 'end_gateway', 'piston_head', 'moving_piston', 'structure_void']);
const legacyColorTints = ['#e6ddc9', '#ec8845', '#b75fb5', '#6c9bd1', '#e5c943', '#72b846', '#d981a1', '#4c5157', '#a39e8f', '#328d96', '#8650aa', '#40559d', '#77533a', '#5d7d39', '#b7423f', '#242326'];
const colorVariantBlocks = new Set(['wool', 'stained_glass', 'stained_glass_pane', 'stained_hardened_clay', 'carpet', 'concrete', 'concrete_powder']);
const oreTints = {
  coal_ore: '#555951', iron_ore: '#b88b6d', gold_ore: '#e5bf59', diamond_ore: '#57c9c0',
  emerald_ore: '#4cb86f', lapis_ore: '#4e6ac0', redstone_ore: '#ca594a', lit_redstone_ore: '#e36b4b',
  nether_quartz_ore: '#e0d2bd',
};

function gameItemCategory(name) {
  const value = String(name || '').toLowerCase();
  if (value.includes('water') || value.includes('lava')) return 'water';
  if (value.includes('glass') || value.includes('ice')) return 'glass';
  if (value.includes('wool') || value.includes('concrete') || value.includes('terracotta') || value.includes('dye')) return 'wool';
  if (value.includes('tnt')) return 'tnt';
  if (value.includes('bookshelf') || value.includes('book')) return 'book';
  if (value.includes('crafting_table')) return 'craft';
  if (value.includes('leaves') || value.includes('vine') || value.includes('sapling') || value.includes('flower') || value.includes('mushroom') || value.includes('cactus') || value.includes('sugar_cane')) return 'leaves';
  if (value.includes('grass') || value.includes('mycelium') || value.includes('podzol')) return 'grass';
  if (value.includes('dirt') || value.includes('mud') || value.includes('clay')) return 'dirt';
  if (value.includes('sand') || value.includes('gravel') || value.includes('snow')) return 'sand';
  if (/(sword|pickaxe|axe|shovel|hoe|shears|helmet|chestplate|leggings|boots|bow|arrow|shield)/.test(value)) return 'tool';
  if (/(beef|pork|chicken|mutton|rabbit|fish|apple|bread|carrot|potato|melon|pie|stew|cookie|beetroot|rotten_flesh|cake|golden_apple)/.test(value)) return 'food';
  if (value.includes('potion') || value.includes('brewing') || value.includes('experience_bottle')) return 'magic';
  if (value.includes('plank')) return 'planks';
  if (value.includes('log') || value.includes('wood') || value.includes('stem') || value.includes('hyphae') || value.includes('door') || value.includes('fence')) return 'wood';
  if (value.includes('ore') || value.includes('coal') || value.includes('diamond') || value.includes('iron_ingot') || value.includes('gold_ingot') || value.includes('emerald')) return 'ore';
  if (value.includes('torch') || value.includes('glowstone') || value.includes('redstone_lamp') || value.includes('fire_charge')) return 'torch';
  if (value.includes('brick')) return 'brick';
  if (value.includes('stone') || value.includes('cobble') || value.includes('andesite') || value.includes('granite') || value.includes('diorite')) return 'stone';
  if (value.includes('stick') || value.includes('ladder') || value.includes('boat') || value.includes('sign')) return 'wood';
  return 'stone';
}

function buildGameData(version) {
  if (gameDataCache.has(version)) return gameDataCache.get(version);
  const data = minecraftData(version);
  if (!data) throw new Error(`Game data for Minecraft ${version} is unavailable.`);
  const catalog = [];
  const keyByIdMetadata = new Map();
  const keysById = new Map();
  const addCatalogEntry = (entry) => {
    if (catalog.some((item) => item.name === entry.name)) return;
    catalog.push(entry);
    if (Number.isInteger(entry.id)) {
      const list = keysById.get(entry.id) || [];
      if (!list.includes(entry.name)) list.push(entry.name);
      keysById.set(entry.id, list);
      keyByIdMetadata.set(`${entry.id}:${entry.metadata}`, entry.name);
    }
  };

  for (const block of data.blocksArray) {
    if (block.name === 'air') continue;
    const itemData = data.itemsByName[block.name];
    const itemId = itemData?.id;
    const overrideLabels = blockMetadataOverrides[block.name];
    const permittedMetadata = blockMetadataIndexes[block.name];
    let variants;
    if (overrideLabels) variants = overrideLabels.map((displayName, metadata) => ({ metadata, displayName }));
    else if (itemData?.variations?.length) variants = itemData.variations;
    else if (permittedMetadata) variants = permittedMetadata.map((metadata) => ({
      metadata,
      displayName: block.variations?.find((variant) => variant.metadata === metadata)?.displayName || `${block.displayName} ${metadata}`,
    }));
    else variants = block.variations?.length ? block.variations : [{ metadata: 0, displayName: block.displayName }];
    for (const variant of variants) {
      const metadata = Number.isInteger(variant.metadata) ? variant.metadata : 0;
      const name = metadata === 0 ? block.name : `${block.name}@${metadata}`;
      const rawDrop = block.drops?.[0]?.drop ?? null;
      const dropId = rawDrop && typeof rawDrop === 'object' ? rawDrop.id : rawDrop;
      const dropMetadata = rawDrop && typeof rawDrop === 'object'
        ? (rawDrop.metadata ?? block.drops?.[0]?.metadata ?? metadata)
        : (block.drops?.[0]?.metadata ?? metadata);
      addCatalogEntry({
        name,
        label: variant.displayName || block.displayName,
        icon: gameItemCategory(block.name),
        category: gameItemCategory(block.name),
        kind: 'block',
        blockName: block.name,
        tint: colorVariantBlocks.has(block.name) ? legacyColorTints[metadata % legacyColorTints.length] : (oreTints[block.name] || null),
        id: Number.isInteger(itemId) ? itemId : null,
        metadata,
        placeable: !hiddenBlockItems.has(block.name),
        hardness: block.hardness,
        dropId,
        dropMetadata,
        harvestTools: block.harvestTools || null,
      });
    }
  }

  for (const item of data.itemsArray) {
    const blockItem = data.blocksByName[item.name];
    if (blockItem && data.itemsByName[item.name]?.id === item.id) continue;
    const variants = itemMetadataLabels[item.name] || item.variations?.map((variant) => variant.displayName);
    if (variants?.length) {
      for (let metadata = 0; metadata < variants.length; metadata += 1) {
        addCatalogEntry({
          name: metadata === 0 ? `item:${item.name}` : `item:${item.name}@${metadata}`,
          label: variants[metadata],
          icon: gameItemCategory(item.name),
          category: gameItemCategory(item.name),
          kind: 'item',
          itemName: item.name,
          id: item.id,
          metadata,
          placeable: false,
        });
      }
    } else {
      addCatalogEntry({
        name: `item:${item.name}`,
        label: item.displayName,
        icon: gameItemCategory(item.name),
        category: gameItemCategory(item.name),
        kind: 'item',
        itemName: item.name,
        id: item.id,
        metadata: 0,
        placeable: false,
      });
    }
  }

  const resolveItemKey = (id, metadata = 0) => {
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) return null;
    const exact = keyByIdMetadata.get(`${numericId}:${metadata}`);
    if (exact) return exact;
    if (metadata === -1) return keysById.get(numericId)?.[0] || null;
    return keyByIdMetadata.get(`${numericId}:0`) || keysById.get(numericId)?.[0] || null;
  };
  for (const entry of catalog) {
    if (entry.kind !== 'block' || !Number.isInteger(entry.dropId)) continue;
    entry.drop = resolveItemKey(entry.dropId, Number.isInteger(entry.dropMetadata) ? entry.dropMetadata : 0);
  }

  const normalizeCandidates = (value) => {
    if (value === null || value === undefined) return [];
    if (Array.isArray(value)) return value.flatMap(normalizeCandidates);
    const id = typeof value === 'number' ? value : value.id;
    const metadata = typeof value === 'object' && Number.isInteger(value.metadata) ? value.metadata : 0;
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) return [];
    if (metadata === -1) return (keysById.get(numericId) || []).map((key) => ({ key, id: numericId }));
    const key = resolveItemKey(numericId, metadata);
    return key ? [{ key, id: numericId, metadata }] : [];
  };
  const recipes = [];
  for (const group of Object.values(data.recipes || {})) {
    for (const recipe of group) {
      const outputKey = resolveItemKey(recipe.result?.id, recipe.result?.metadata ?? 0);
      if (!outputKey) continue;
      const rawSlots = Array.isArray(recipe.ingredients)
        ? recipe.ingredients
        : (recipe.inShape || []).flatMap((row) => Array.isArray(row) ? row : [row]);
      const inputs = rawSlots.map((slot) => ({
        alternatives: normalizeCandidates(slot).map((candidate) => candidate.key),
      })).filter((slot) => slot.alternatives.length);
      if (!inputs.length) continue;
      const output = catalog.find((item) => item.name === outputKey);
      recipes.push({
        name: `${output?.label || outputKey}${recipe.result.count > 1 ? ` ×${recipe.result.count}` : ''}`,
        output: outputKey,
        count: Number(recipe.result.count) || 1,
        inputs,
      });
    }
  }

  const catalogNames = new Set(catalog.map((item) => item.name));
  const rawSmeltingRecipes = [
    ['iron_ore', 'item:iron_ingot'], ['gold_ore', 'item:gold_ingot'], ['sand', 'glass'],
    ['cobblestone', 'stone'], ['item:clay_ball', 'item:brick'], ['item:beef', 'item:cooked_beef'],
    ['item:porkchop', 'item:cooked_porkchop'], ['item:chicken', 'item:cooked_chicken'],
    ['item:fish', 'item:cooked_fish'], ['item:fish@1', 'item:cooked_fish@1'],
    ['item:potato', 'item:baked_potato'], ['cactus', 'item:dye@2'],
    ['log', 'item:coal@1'], ['log@1', 'item:coal@1'], ['log@2', 'item:coal@1'], ['log@3', 'item:coal@1'],
    ['log2', 'item:coal@1'], ['log2@1', 'item:coal@1'], ['netherrack', 'item:netherbrick'],
  ];
  const fuelKeys = ['item:coal', 'item:coal@1', 'item:blaze_rod', 'item:lava_bucket', 'item:stick', 'planks', 'log', 'log@1', 'log@2', 'log@3']
    .filter((key) => catalogNames.has(key));
  const smelting = rawSmeltingRecipes.filter(([input, output]) => catalogNames.has(input) && catalogNames.has(output) && fuelKeys.length)
    .map(([input, output]) => {
      const item = catalog.find((entry) => entry.name === output);
      return {
        name: `Smelt: ${catalog.find((entry) => entry.name === input)?.label || input} → ${item?.label || output}`,
        output,
        count: 1,
        kind: 'smelt',
        fuel: fuelKeys,
        inputs: [{ alternatives: [input] }],
      };
    });
  const result = {
    version,
    blocks: data.blocksArray.length,
    itemTypes: data.itemsArray.length,
    catalog,
    recipes,
    smelting,
  };
  gameDataCache.set(version, result);
  return result;
}

function send(client, payload) {
  if (client?.readyState === WebSocket.OPEN) {
    try { client.send(JSON.stringify(payload)); } catch { /* A closing tab is harmless. */ }
  }
}

function broadcast(payload) {
  for (const client of clients) send(client, payload);
}

function sendState() {
  broadcast({ type: 'state', state });
}

function pushChat(text, kind = 'message') {
  const cleanText = String(text ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, 600);
  if (!cleanText) return;
  broadcast({ type: 'chat', text: cleanText, kind, at: Date.now() });
}

function flattenTextComponent(value, depth = 0) {
  if (depth > 8 || value === null || value === undefined) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try { return flattenTextComponent(JSON.parse(trimmed), depth + 1); } catch { /* Keep non-JSON kick strings as text. */ }
    }
    return value
      .replace(/(?:In)+(?=§)/g, String.fromCharCode(10))
      .replace(/§./g, '')
      .trim();
  }
  if (Array.isArray(value)) return value.map((part) => flattenTextComponent(part, depth + 1)).join('');
  if (typeof value === 'object') {
    const text = typeof value.text === 'string' ? value.text : (typeof value.message === 'string' ? value.message : '');
    const extra = Array.isArray(value.extra) ? value.extra : [];
    const translated = typeof value.translate === 'string' && !text ? value.translate : '';
    return `${flattenTextComponent(text || translated, depth + 1)}${extra.map((part) => flattenTextComponent(part, depth + 1)).join('')}`.trim();
  }
  return String(value);
}

function readableEndReason(reason) {
  const message = flattenTextComponent(reason);
  if (!message || /^(?:socketclosed|socket closed)$/i.test(message)) return '';
  return message.slice(0, 1000);
}

function inventoryPayload() {
  if (!bot?.inventory) return { type: 'inventory', items: [], selected: 0 };
  const start = bot.inventory.slots.length >= 45 ? 36 : 0;
  const items = bot.inventory.slots.slice(start, start + 9).map((item, index) => item ? {
    slot: index,
    name: item.name,
    displayName: item.displayName || item.name,
    count: item.count,
    type: item.type,
  } : null);
  return { type: 'inventory', items, selected: Number(bot.quickBarSlot || 0) };
}

function sendRemotePlayer() {
  if (!bot?.entity) return;
  const p = bot.entity.position;
  const position = { x: p.x, y: p.y, z: p.z };
  state.position = position;
  lastPlayerAt = Date.now();
  state.health = Number.isFinite(bot.health) ? bot.health : state.health;
  state.food = Number.isFinite(bot.food) ? bot.food : state.food;
  state.time = Number(bot.time?.timeOfDay || 0);
  broadcast({
    type: 'player',
    position,
    yaw: Number(bot.entity.yaw || 0),
    pitch: Number(bot.entity.pitch || 0),
    health: state.health,
    food: state.food,
    time: state.time,
    dimension: bot.game?.dimension || 'overworld',
  });
}

function collectRemoteEntities() {
  if (!bot?.entity?.position) return [];
  const origin = bot.entity.position;
  const entities = Object.values(bot.entities || {}).filter((entity) => {
    if (!entity || entity === bot.entity || entity.isValid === false || !entity.position) return false;
    if (!['mob', 'player'].includes(String(entity.type || ''))) return false;
    const dx = entity.position.x - origin.x;
    const dy = entity.position.y - origin.y;
    const dz = entity.position.z - origin.z;
    return Number.isFinite(dx) && Number.isFinite(dy) && Number.isFinite(dz)
      && dx * dx + dy * dy + dz * dz <= 32 * 32 && Math.abs(dy) <= 24;
  });
  return entities
    .sort((a, b) => a.position.distanceSquared(origin) - b.position.distanceSquared(origin))
    .slice(0, 80)
    .map((entity) => ({
      id: String(entity.id ?? entity.uuid ?? '').slice(0, 48),
      kind: String(entity.type || 'mob').slice(0, 12),
      name: String(entity.name || (entity.type === 'player' ? 'player' : 'unknown')).toLowerCase().replace(/[^a-z0-9_:-]/g, '').slice(0, 48),
      username: String(entity.username || '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 16),
      position: { x: entity.position.x, y: entity.position.y, z: entity.position.z },
      yaw: Number.isFinite(entity.yaw) ? entity.yaw : 0,
      pitch: Number.isFinite(entity.pitch) ? entity.pitch : 0,
    }));
}

function sendRemoteEntities() {
  if (!bot?.entity || state.status !== 'connected') return;
  broadcast({ type: 'entities', entities: collectRemoteEntities(), sentAt: Date.now() });
}

function sendSnapshot() {
  if (!bot?.entity || snapshotBusy || state.status !== 'connected') return;
  snapshotBusy = true;
  try {
    const pos = bot.entity.position;
    const centerX = Math.floor(pos.x);
    const centerY = Math.floor(pos.y);
    const centerZ = Math.floor(pos.z);
    const minWorldY = Number.isFinite(bot.game?.minY) ? bot.game.minY : 0;
    const worldHeight = Number.isFinite(bot.game?.height) ? bot.game.height : 256;
    const minY = Math.max(minWorldY, centerY - 8);
    const maxY = Math.min(minWorldY + worldHeight - 1, centerY + 9);
    const radius = 14;
    const blocks = [];

    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      for (let z = centerZ - radius; z <= centerZ + radius; z += 1) {
        for (let y = minY; y <= maxY; y += 1) {
          const block = bot.blockAt(new Vec3(x, y, z), false);
          if (!block || block.name === 'air' || block.name === 'cave_air' || block.name === 'void_air') continue;
          blocks.push([x, y, z, String(block.name).slice(0, 48)]);
          if (blocks.length >= 18000) break;
        }
        if (blocks.length >= 18000) break;
      }
      if (blocks.length >= 18000) break;
    }

    state.position = { x: pos.x, y: pos.y, z: pos.z };
    const payload = {
      type: 'snapshot',
      center: { x: centerX, y: centerY, z: centerZ },
      radius,
      minY,
      maxY,
      blocks,
      entities: collectRemoteEntities(),
      sentAt: Date.now(),
    };
    broadcast(payload);
    broadcast(inventoryPayload());
    sendRemotePlayer();
    lastSnapshotAt = Date.now();
  } catch (error) {
    console.error('[server bridge] snapshot failed:', error?.message || error);
  } finally {
    snapshotBusy = false;
  }
}

function clearBot(reason = 'Disconnected') {
  const previousBot = bot;
  bot = null;
  sessionToken += 1;
  if (snapshotTimer) clearInterval(snapshotTimer);
  if (entityTimer) clearInterval(entityTimer);
  snapshotTimer = null;
  entityTimer = null;
  snapshotBusy = false;
  state = {
    status: 'disconnected',
    host: '',
    port: 25565,
    username: '',
    version: '',
    position: null,
    health: 20,
    food: 20,
    time: 0,
    auth: null,
    error: '',
  };
  sendState();
  if (previousBot) {
    try { previousBot.quit(reason); } catch { /* The connection may already be gone. */ }
  }
}

function safeHost(host) {
  const value = String(host || '').trim();
  if (!value || value.length > 253) return false;
  if (/\s|[\\/<>"'`]/.test(value)) return false;
  return true;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'Blockcraft server bridge', status: state.status });
});

function isLoopbackAddress(address) {
  const value = String(address || '').toLowerCase().replace(/^::ffff:/, '');
  return value === '127.0.0.1' || value === '::1';
}

function isLocalHostOrigin(request) {
  if (!isLoopbackAddress(request.socket.remoteAddress)) return false;
  const origin = request.get('origin') || request.get('referer');
  if (!origin) return true;
  try {
    const hostname = new URL(origin).hostname.toLowerCase().replace(/^\[|\]$/g, '');
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

function requireLocalHostRequest(request, response, next) {
  if (!isLocalHostOrigin(request)) return response.status(403).json({ error: 'Local hosting controls are available only from this computer. Open Blockcraft at http://localhost:5173.' });
  next();
}

function requireHostControl(request, response, next) {
  if (!isLocalHostOrigin(request)) return response.status(403).json({ error: 'Local hosting controls are available only from this computer.' });
  const supplied = Buffer.from(String(request.get('x-blockcraft-host-token') || ''));
  const expected = Buffer.from(hostControlToken);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return response.status(403).json({ error: 'Local hosting session expired. Reopen the server screen and try again.' });
  }
  next();
}

function getLanAddresses() {
  const addresses = [];
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const details of interfaces || []) {
      if (!details || details.internal || !(details.family === 'IPv4' || details.family === 4)) continue;
      const ip = String(details.address || '');
      if (/^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(ip)) addresses.push(ip);
    }
  }
  return [...new Set(addresses)];
}

async function getJavaStatus() {
  if (Date.now() - javaStatusCache.checkedAt < 30_000) return javaStatusCache;
  const command = String(process.env.JAVA_BIN || 'java');
  javaStatusCache = await new Promise((resolve) => {
    let settled = false;
    let child;
    const finish = (available, message) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ checkedAt: Date.now(), available, message });
    };
    const timer = setTimeout(() => {
      try { child?.kill(); } catch { /* The version probe already exited. */ }
      finish(false, 'Java check timed out. Verify your Java installation and try again.');
    }, 4000);
    try {
      child = spawn(command, ['-version'], { stdio: 'ignore', windowsHide: true });
      child.once('error', (error) => finish(false, error?.code === 'ENOENT'
        ? 'Java was not found. Install a 64-bit Java runtime, then restart Blockcraft.'
        : `Could not run Java: ${String(error?.message || error).slice(0, 180)}`));
      child.once('exit', (code) => finish(code === 0, code === 0
        ? 'Java runtime ready.'
        : `Java version check exited with code ${code}.`));
    } catch (error) {
      finish(false, `Could not run Java: ${String(error?.message || error).slice(0, 180)}`);
    }
  });
  return javaStatusCache;
}

function hostStatusPayload(javaStatus = javaStatusCache) {
  let jarBytes = 0;
  if (existsSync(hostedServerJar)) {
    try { jarBytes = statSync(hostedServerJar).size; } catch { /* Report the JAR as unavailable if it cannot be read. */ }
  }
  return {
    ...hostedServerState,
    logs: hostedServerState.logs.slice(-80),
    jarReady: jarBytes > 0,
    jarBytes,
    javaAvailable: Boolean(javaStatus.available),
    javaMessage: javaStatus.message,
    lanAddresses: getLanAddresses(),
    addresses: hostedServerState.status === 'running' || hostedServerState.status === 'starting'
      ? getLanAddresses().map((address) => `${address}:${hostedServerState.port}`)
      : [],
  };
}

function appendHostLog(value) {
  const text = String(value || '').replace(/\u001b\[[0-9;]*m/g, '').trim();
  if (!text) return;
  const versionMatch = text.match(/Starting minecraft server version ([\w.-]+)/i);
  if (versionMatch) hostedServerState.version = versionMatch[1];
  if (/Done \([^)]*\)! For help, type ["']help["']/i.test(text)) hostedServerState.status = 'running';
  hostedServerState.logs.push(`${new Date().toLocaleTimeString()}  ${text.slice(0, 500)}`);
  if (hostedServerState.logs.length > 250) hostedServerState.logs.splice(0, hostedServerState.logs.length - 250);
}

function bindHostOutput(stream) {
  let pending = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    const lines = `${pending}${chunk}`.split(/\r?\n/);
    pending = lines.pop() || '';
    for (const line of lines) appendHostLog(line);
  });
  stream.on('end', () => appendHostLog(pending));
}

function updateServerProperty(contents, key, value) {
  const lines = contents.split(/\r?\n/);
  const prefix = `${key}=`;
  const index = lines.findIndex((line) => line.startsWith(prefix));
  if (index >= 0) lines[index] = `${prefix}${value}`;
  else lines.push(`${prefix}${value}`);
  return `${lines.join('\n').replace(/\n+$/, '')}\n`;
}

function requestGracefulHostStop() {
  const child = hostedServerProcess;
  if (!child || child.exitCode !== null || child.killed) {
    hostedServerState.status = 'stopped';
    hostedServerProcess = null;
    return false;
  }
  hostedServerState.status = 'stopping';
  try { child.stdin?.write('stop\n'); } catch { /* The server may have closed its input already. */ }
  if (hostedServerStopTimer) clearTimeout(hostedServerStopTimer);
  hostedServerStopTimer = setTimeout(() => {
    if (hostedServerProcess === child && child.exitCode === null) {
      appendHostLog('Graceful stop timed out; sending a termination signal.');
      try { child.kill('SIGTERM'); } catch { /* The process may already have exited. */ }
    }
  }, 20_000);
  hostedServerStopTimer.unref?.();
  return true;
}

app.get('/api/host/session', requireLocalHostRequest, (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ token: hostControlToken });
});

app.get('/api/host/status', requireLocalHostRequest, async (_req, res) => {
  const javaStatus = await getJavaStatus();
  res.set('Cache-Control', 'no-store');
  res.json(hostStatusPayload(javaStatus));
});

app.post('/api/host/upload', requireHostControl, express.raw({ type: 'application/octet-stream', limit: '128mb' }), (req, res) => {
  if (hostStartInProgress || (hostedServerProcess && hostedServerProcess.exitCode === null)) return res.status(409).json({ error: 'Stop the hosted server before replacing its JAR.' });
  if (!Buffer.isBuffer(req.body) || req.body.length < 4 || !req.body.subarray(0, 2).equals(Buffer.from('PK'))) {
    return res.status(400).json({ error: 'Choose a valid Java server JAR file (ZIP/JAR format).' });
  }
  try {
    mkdirSync(hostedServerFolder, { recursive: true });
    const temporaryPath = `${hostedServerJar}.uploading`;
    writeFileSync(temporaryPath, req.body, { mode: 0o600 });
    renameSync(temporaryPath, hostedServerJar);
    appendHostLog(`Server JAR uploaded (${(req.body.length / 1024 / 1024).toFixed(1)} MiB).`);
    res.json({ ok: true, jarBytes: req.body.length });
  } catch (error) {
    console.error('[server host] JAR upload failed:', error?.message || error);
    res.status(500).json({ error: 'Could not save the server JAR on this computer.' });
  }
});

app.post('/api/host/start', requireHostControl, async (req, res) => {
  const gamePort = Number(req.body?.port || 25565);
  const memoryMb = Number(req.body?.memoryMb || 2048);
  if (!Number.isInteger(gamePort) || gamePort < 1 || gamePort > 65535) return res.status(400).json({ error: 'Server port must be between 1 and 65535.' });
  if (![1024, 2048, 4096].includes(memoryMb)) return res.status(400).json({ error: 'Choose 1, 2, or 4 GiB of memory.' });
  if (req.body?.acceptEula !== true) return res.status(400).json({ error: 'Accept the Minecraft EULA before starting a server.' });
  if (hostStartInProgress || (hostedServerProcess && hostedServerProcess.exitCode === null)) return res.status(409).json({ error: 'A hosted server is already starting or running.' });
  if (!existsSync(hostedServerJar)) return res.status(400).json({ error: 'Upload a Minecraft Java server JAR first.' });

  hostStartInProgress = true;
  const javaStatus = await getJavaStatus();
  if (!javaStatus.available) {
    hostStartInProgress = false;
    return res.status(503).json({ error: javaStatus.message });
  }

  try {
    mkdirSync(hostedServerFolder, { recursive: true });
    writeFileSync(path.join(hostedServerFolder, 'eula.txt'), 'eula=true\n', { mode: 0o600 });
    const propertiesPath = path.join(hostedServerFolder, 'server.properties');
    let properties = existsSync(propertiesPath)
      ? readFileSync(propertiesPath, 'utf8')
      : 'server-port=25565\nserver-ip=\nmotd=Blockcraft Java Server\nonline-mode=true\n';
    properties = updateServerProperty(properties, 'server-port', String(gamePort));
    properties = updateServerProperty(properties, 'server-ip', '');
    writeFileSync(propertiesPath, properties, { mode: 0o600 });

    const javaCommand = String(process.env.JAVA_BIN || 'java');
    const child = spawn(javaCommand, ['-Xms512M', `-Xmx${memoryMb}M`, '-jar', hostedServerJar, 'nogui'], {
      cwd: hostedServerFolder,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    hostedServerProcess = child;
    hostedServerState = {
      status: 'starting', port: gamePort, memoryMb, startedAt: new Date().toISOString(),
      version: 'detecting', exitCode: null, logs: [],
    };
    bindHostOutput(child.stdout);
    bindHostOutput(child.stderr);
    appendHostLog(`Starting the server JAR on port ${gamePort} with ${memoryMb / 1024} GiB maximum memory.`);
    child.once('error', (error) => {
      appendHostLog(`Java process error: ${String(error?.message || error).slice(0, 240)}`);
      hostedServerState.status = 'error';
      hostedServerState.exitCode = -1;
      if (hostedServerProcess === child) hostedServerProcess = null;
    });
    child.once('exit', (code, signal) => {
      if (hostedServerStopTimer) clearTimeout(hostedServerStopTimer);
      hostedServerStopTimer = null;
      const wasStopping = hostedServerState.status === 'stopping';
      hostedServerState.status = code === 0 || wasStopping ? 'stopped' : 'error';
      hostedServerState.exitCode = Number.isInteger(code) ? code : null;
      appendHostLog(`Server process exited (${signal || `code ${code ?? 'unknown'}`}).`);
      if (hostedServerProcess === child) hostedServerProcess = null;
    });
    hostStartInProgress = false;
    res.status(202).json({ ok: true, status: 'starting' });
  } catch (error) {
    hostStartInProgress = false;
    console.error('[server host] could not start server:', error?.message || error);
    hostedServerState.status = 'error';
    res.status(500).json({ error: `Could not start the Java server: ${String(error?.message || error).slice(0, 220)}` });
  }
});

app.post('/api/host/stop', requireHostControl, (_req, res) => {
  const stopping = requestGracefulHostStop();
  res.json({ ok: true, status: stopping ? 'stopping' : 'stopped' });
});

app.get('/api/game-data', (req, res) => {
  const version = String(req.query.version || '1.12.2');
  if (version !== '1.12.2') return res.status(404).json({ error: 'The local game catalog currently supports Minecraft Java 1.12.2 only.' });
  try {
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(buildGameData(version));
  } catch (error) {
    console.error('Could not load Minecraft game data:', error);
    res.status(500).json({ error: 'Could not load the Minecraft 1.12.2 catalog.' });
  }
});

app.get('/api/server/status', (_req, res) => {
  res.json({ ...state, position: state.position ? { ...state.position } : null });
});

app.post('/api/server/connect', (req, res) => {
  const host = String(req.body?.host || '').trim();
  const gamePort = Number(req.body?.port || 25565);
  const username = String(req.body?.username || '').trim();
  const auth = req.body?.auth === 'microsoft' ? 'microsoft' : 'offline';
  const version = String(req.body?.version || '').trim();

  if (!safeHost(host)) return res.status(400).json({ error: 'Enter a valid server address.' });
  if (!Number.isInteger(gamePort) || gamePort < 1 || gamePort > 65535) return res.status(400).json({ error: 'Port must be between 1 and 65535.' });
  if (!/^[A-Za-z0-9_]{1,16}$/.test(username)) return res.status(400).json({ error: 'Player name must be 1–16 letters, numbers, or underscores.' });
  if (version && !/^\d+\.\d+(\.\d+)?$/.test(version)) return res.status(400).json({ error: 'Choose a valid Minecraft Java version.' });

  clearBot('Replacing previous connection');
  const token = sessionToken;
  state = {
    status: 'connecting', host, port: gamePort, username,
    version: version || 'auto', position: null, health: 20, food: 20,
    time: 0, auth: null, error: '',
  };
  sendState();

  try {
    let kickReason = '';
    let connectionError = '';
    const options = {
      host,
      port: gamePort,
      username,
      auth,
      version: version || false,
      profilesFolder,
      hideErrors: false,
      checkTimeoutInterval: 30_000,
      onMsaCode: (data) => {
        if (token !== sessionToken) return;
        state.auth = data || {};
        state.status = 'auth';
        sendState();
        broadcast({ type: 'auth', data: state.auth });
      },
    };
    bot = mineflayer.createBot(options);
    const activeBot = bot;

    activeBot.on('login', () => {
      if (token !== sessionToken) return;
      state.status = 'connected';
      state.username = activeBot.username || username;
      state.version = activeBot.version || version || 'unknown';
      state.error = '';
      sendState();
      pushChat(`Connected to ${host}:${gamePort} · Java ${state.version}`, 'notice');
      snapshotTimer = setInterval(sendSnapshot, 2200);
      entityTimer = setInterval(sendRemoteEntities, 350);
      if (activeBot.entity) {
        sendSnapshot();
        sendRemoteEntities();
      }
    });

    activeBot.once('spawn', () => {
      if (token !== sessionToken) return;
      state.status = 'connected';
      sendState();
      sendSnapshot();
      sendRemoteEntities();
    });

    activeBot.on('messagestr', (text) => {
      if (token === sessionToken) pushChat(text, 'message');
    });

    activeBot.on('health', () => {
      if (token !== sessionToken) return;
      state.health = Number.isFinite(activeBot.health) ? activeBot.health : state.health;
      state.food = Number.isFinite(activeBot.food) ? activeBot.food : state.food;
      sendRemotePlayer();
      broadcast(inventoryPayload());
    });

    activeBot.on('move', () => {
      if (token === sessionToken && Date.now() - lastPlayerAt > 80) sendRemotePlayer();
    });

    activeBot.on('blockUpdate', () => {
      if (token === sessionToken && Date.now() - lastSnapshotAt > 700) sendSnapshot();
    });

    activeBot.on('error', (error) => {
      if (token !== sessionToken) return;
      connectionError = flattenTextComponent(error?.message || error || 'Unknown connection error').slice(0, 1000);
      state.error = connectionError;
      state.status = 'error';
      sendState();
    });

    activeBot.on('kicked', (reason) => {
      if (token !== sessionToken) return;
      kickReason = flattenTextComponent(reason) || 'The server rejected the connection.';
      state.error = kickReason.slice(0, 1000);
      state.status = 'error';
      sendState();
    });

    activeBot.on('end', (reason) => {
      if (token !== sessionToken) return;
      const wasConnecting = state.status === 'connecting' || state.status === 'auth';
      const previousError = kickReason || connectionError || state.error;
      const endReason = readableEndReason(reason);
      if (previousError) {
        state.status = 'error';
        state.error = previousError.slice(0, 1000);
      } else if (wasConnecting) {
        state.status = 'error';
        state.error = endReason || 'Connection ended before login. Check the address, version, and account mode.';
      } else {
        state.status = 'disconnected';
        state.error = endReason;
      }
      if (snapshotTimer) clearInterval(snapshotTimer);
      if (entityTimer) clearInterval(entityTimer);
      snapshotTimer = null;
      entityTimer = null;
      bot = null;
      sendState();
      if (state.error && !previousError) pushChat(state.error, wasConnecting ? 'error' : 'notice');
    });

    res.json({ ok: true, status: 'connecting' });
  } catch (error) {
    const message = String(error?.message || error || 'Could not start connection.').slice(0, 240);
    state.status = 'error';
    state.error = message;
    sendState();
    res.status(500).json({ error: message });
  }
});

app.post('/api/server/disconnect', (_req, res) => {
  clearBot();
  res.json({ ok: true });
});

function targetedBlock() {
  if (!bot?.entity?.position || !bot.world) return null;
  const yaw = Number(bot.entity.yaw || 0);
  const pitch = Number(bot.entity.pitch || 0);
  const direction = new Vec3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)).normalize();
  const eye = bot.entity.position.offset(0, bot.entity.eyeHeight || 1.62, 0);
  return bot.world.raycast(eye, direction, 5.5);
}

function faceFromView(block) {
  if (!bot?.entity) return new Vec3(0, 1, 0);
  const yaw = Number(bot.entity.yaw || 0);
  const pitch = Number(bot.entity.pitch || 0);
  const direction = new Vec3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)).normalize();
  const eye = bot.entity.position.offset(0, bot.entity.eyeHeight || 1.62, 0);
  let previous = null;
  for (let distance = 0.05; distance <= 5.5; distance += 0.05) {
    const point = eye.plus(direction.scaled(distance));
    const cell = new Vec3(Math.floor(point.x), Math.floor(point.y), Math.floor(point.z));
    if (cell.equals(block.position)) {
      if (previous) return new Vec3(previous.x - cell.x, previous.y - cell.y, previous.z - cell.z);
      break;
    }
    previous = cell;
  }
  return new Vec3(0, 1, 0);
}

function handleSocketMessage(client, raw) {
  if (raw.length > 64 * 1024) return;
  let message;
  try { message = JSON.parse(raw.toString()); } catch { return; }
  if (!bot || state.status !== 'connected') return;

  try {
    if (message.type === 'control') {
      const key = String(message.key || '');
      const allowed = new Set(['forward', 'back', 'left', 'right', 'jump', 'sprint', 'sneak']);
      if (allowed.has(key)) bot.setControlState(key, Boolean(message.down));
    } else if (message.type === 'look') {
      const yaw = Number(message.yaw);
      const pitch = Number(message.pitch);
      if (Number.isFinite(yaw) && Number.isFinite(pitch)) {
        bot.look(yaw, Math.max(-1.55, Math.min(1.55, pitch))).catch(() => {});
      }
    } else if (message.type === 'action' && message.action === 'dig') {
      const block = targetedBlock();
      if (block && block.name !== 'air' && bot.canDigBlock(block)) {
        bot.dig(block, false, faceFromView(block)).then(() => sendSnapshot()).catch((error) => pushChat(error?.message || 'Could not mine that block.', 'error'));
      }
    } else if (message.type === 'action' && message.action === 'place') {
      const block = targetedBlock();
      if (block && bot.heldItem) {
        bot.placeBlock(block, faceFromView(block)).then(() => sendSnapshot()).catch((error) => pushChat(error?.message || 'Could not place that block.', 'error'));
      }
    } else if (message.type === 'select') {
      const slot = Number(message.slot);
      if (Number.isInteger(slot) && slot >= 0 && slot <= 8) {
        bot.setQuickBarSlot(slot);
        broadcast(inventoryPayload());
      }
    } else if (message.type === 'chat') {
      const text = String(message.text || '').trim().slice(0, 256);
      if (text) bot.chat(text);
    } else if (message.type === 'disconnect') {
      clearBot();
    }
  } catch (error) {
    pushChat(error?.message || 'That action could not be completed.', 'error');
  }
}

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  if (url.pathname !== '/socket') {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, (client) => {
    wss.emit('connection', client, request);
  });
});

wss.on('connection', (client) => {
  clients.add(client);
  send(client, { type: 'state', state });
  send(client, inventoryPayload());
  if (state.position) send(client, { type: 'player', position: state.position, health: state.health, food: state.food, time: state.time });
  if (state.status === 'connected') send(client, { type: 'entities', entities: collectRemoteEntities(), sentAt: Date.now() });
  client.on('message', (raw) => handleSocketMessage(client, raw));
  client.on('close', () => clients.delete(client));
  client.on('error', () => clients.delete(client));
});

app.use((error, request, response, next) => {
  if (response.headersSent) return next(error);
  if (error?.type === 'entity.too.large') return response.status(413).json({ error: 'Server JAR uploads are limited to 128 MiB.' });
  if (request.path.startsWith('/api/host/')) return response.status(400).json({ error: String(error?.message || 'Invalid hosting request.').slice(0, 240) });
  next(error);
});

const distDir = path.join(rootDir, 'dist');
if (existsSync(distDir)) {
  app.use(express.static(distDir, { maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

let shuttingDown = false;
function shutdownBridge() {
  if (shuttingDown) return;
  shuttingDown = true;
  clearBot('Bridge shutting down');
  for (const client of clients) {
    try { client.close(1001, 'Bridge shutting down'); } catch { /* Ignore sockets that are already closed. */ }
  }
  requestGracefulHostStop();
  server.close();
  const shutdownTimer = setTimeout(() => {
    if (hostedServerProcess && hostedServerProcess.exitCode === null) {
      try { hostedServerProcess.kill('SIGTERM'); } catch { /* The host process may already be gone. */ }
    }
    process.exit(1);
  }, 25_000);
  shutdownTimer.unref?.();
}
process.once('SIGINT', shutdownBridge);
process.once('SIGTERM', shutdownBridge);

server.listen(port, '0.0.0.0', () => {
  console.log(`[server bridge] listening on 0.0.0.0:${port}`);
  console.log(`[server bridge] Microsoft profiles stored in ${profilesFolder}`);
});
