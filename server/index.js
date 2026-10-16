import express from 'express';
import { createServer } from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { mkdirSync, existsSync } from 'node:fs';
import { WebSocketServer, WebSocket } from 'ws';
import mineflayer from 'mineflayer';
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
let snapshotBusy = false;
let lastSnapshotAt = 0;
let lastPlayerAt = 0;
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
  snapshotTimer = null;
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
      if (activeBot.entity) sendSnapshot();
    });

    activeBot.once('spawn', () => {
      if (token !== sessionToken) return;
      state.status = 'connected';
      sendState();
      sendSnapshot();
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
      const message = String(error?.message || error || 'Unknown connection error').slice(0, 240);
      state.error = message;
      state.status = 'error';
      sendState();
      pushChat(`Connection error: ${message}`, 'error');
    });

    activeBot.on('kicked', (reason) => {
      if (token !== sessionToken) return;
      const message = typeof reason === 'string' ? reason : JSON.stringify(reason);
      state.error = String(message).slice(0, 240);
      state.status = 'error';
      sendState();
      pushChat(`Kicked: ${state.error}`, 'error');
    });

    activeBot.on('end', (reason) => {
      if (token !== sessionToken) return;
      const wasConnecting = state.status === 'connecting' || state.status === 'auth';
      state.status = wasConnecting ? 'error' : 'disconnected';
      state.error = String(reason || (wasConnecting ? 'Connection closed before joining.' : 'Connection closed.')).slice(0, 240);
      if (snapshotTimer) clearInterval(snapshotTimer);
      snapshotTimer = null;
      bot = null;
      sendState();
      pushChat(state.error, wasConnecting ? 'error' : 'notice');
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
  client.on('message', (raw) => handleSocketMessage(client, raw));
  client.on('close', () => clients.delete(client));
  client.on('error', () => clients.delete(client));
});

const distDir = path.join(rootDir, 'dist');
if (existsSync(distDir)) {
  app.use(express.static(distDir, { maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

server.listen(port, '0.0.0.0', () => {
  console.log(`[server bridge] listening on 0.0.0.0:${port}`);
  console.log(`[server bridge] Microsoft profiles stored in ${profilesFolder}`);
});
