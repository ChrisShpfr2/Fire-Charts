import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import type { AssetType } from './src/types/trading.ts';
import {
  applyWorkspacePatch,
  sanitizeRoomId,
  type DeviceSyncMessage,
  type RoomSyncRecord,
  type ServerSyncMessage,
} from './src/utils/deviceSync.ts';
import { createMarketApi } from './src/utils/marketApi.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;
const SYNC_STATE_FILE = path.join(__dirname, '.apex-sync-state.json');

function computeInitialAppVersion(): string {
  const pkgPath = path.join(__dirname, 'package.json');
  let pkgVer = '1.0.0';
  try {
    const raw = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version?: string };
    if (raw.version) pkgVer = raw.version;
  } catch {
    // ignore
  }
  const distIndex = path.join(__dirname, 'dist', 'index.html');
  let mtime = Date.now();
  try {
    if (fs.existsSync(distIndex)) {
      mtime = Math.floor(fs.statSync(distIndex).mtimeMs);
    }
  } catch {
    // ignore
  }
  return `${pkgVer}-${mtime}`;
}

function loadSyncRoomsFromDisk(): Map<string, RoomSyncRecord> {
  const map = new Map<string, RoomSyncRecord>();
  try {
    if (!fs.existsSync(SYNC_STATE_FILE)) return map;
    const raw = JSON.parse(fs.readFileSync(SYNC_STATE_FILE, 'utf8')) as Record<string, RoomSyncRecord>;
    for (const [k, rec] of Object.entries(raw)) {
      if (rec && typeof rec.revision === 'number' && rec.state) {
        map.set(sanitizeRoomId(k), rec);
      }
    }
  } catch {
    // Start fresh if file corrupted
  }
  return map;
}

async function fetchTextWithTimeout(url: string, timeoutMs = 4500): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
        Accept: 'application/json, application/rss+xml, application/xml, text/xml, */*',
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

const marketApi = createMarketApi(fetchTextWithTimeout);

async function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.get('/api/symbols', (_req, res) => {
    res.json(marketApi.getSymbols());
  });

  app.get('/api/ticker-tape', async (_req, res) => {
    try {
      const items = await marketApi.getTickerTape();
      res.json({ items });
    } catch (err) {
      res.status(500).json({
        items: [],
        error: err instanceof Error ? err.message : 'Ticker fetch failed',
      });
    }
  });

  app.get('/api/news', async (_req, res) => {
    try {
      const items = await marketApi.getBreakingNews();
      res.json({ items });
    } catch (err) {
      res.status(500).json({
        items: [],
        error: err instanceof Error ? err.message : 'News fetch failed',
      });
    }
  });

  app.get('/api/klines', async (req, res) => {
    const rawSymbol = String(req.query.symbol ?? 'BTCUSDT');
    const assetType = (String(req.query.assetType ?? 'crypto') === 'stock'
      ? 'stock'
      : 'crypto') as AssetType;
    const rawTf = String(req.query.timeframe ?? '15m');
    const payload = await marketApi.getKlines({
      symbol: rawSymbol,
      assetType,
      timeframe: rawTf,
    });
    res.json(payload);
  });

  let currentAppVersion = computeInitialAppVersion();
  const roomRecords = loadSyncRoomsFromDisk();
  let persistTimer: ReturnType<typeof setTimeout> | null = null;

  const schedulePersistRooms = () => {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      try {
        const obj: Record<string, RoomSyncRecord> = {};
        for (const [k, v] of roomRecords.entries()) {
          obj[k] = v;
        }
        fs.writeFileSync(SYNC_STATE_FILE, JSON.stringify(obj), 'utf8');
      } catch {
        // Ignore read-only filesystem edge cases
      }
    }, 300);
  };

  app.get('/api/version', (_req, res) => {
    res.json({ version: currentAppVersion, timestamp: Date.now() });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clientMeta = new WeakMap<WebSocket, { roomId: string; deviceId: string }>();

  const sendWs = (ws: WebSocket, payload: ServerSyncMessage) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  };

  const getRoomClientCount = (roomId: string): number => {
    let count = 0;
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN && clientMeta.get(client)?.roomId === roomId) {
        count++;
      }
    }
    return count;
  };

  const broadcastToRoom = (
    roomId: string,
    payload: ServerSyncMessage,
    exclude?: WebSocket
  ) => {
    for (const client of wss.clients) {
      if (client === exclude) continue;
      if (client.readyState === WebSocket.OPEN && clientMeta.get(client)?.roomId === roomId) {
        client.send(JSON.stringify(payload));
      }
    }
  };

  const broadcastAppUpdate = (reason: string, targetRoomId?: string) => {
    currentAppVersion = `${currentAppVersion.split('-')[0]}-${Date.now()}`;
    const msg: ServerSyncMessage = {
      type: 'app:update',
      appVersion: currentAppVersion,
      reason,
    };
    for (const client of wss.clients) {
      if (client.readyState !== WebSocket.OPEN) continue;
      if (targetRoomId && clientMeta.get(client)?.roomId !== targetRoomId) continue;
      client.send(JSON.stringify(msg));
    }
    return currentAppVersion;
  };

  app.post('/api/push-update', (req, res) => {
    const reason =
      typeof req.body?.reason === 'string' && req.body.reason.trim()
        ? req.body.reason.trim()
        : 'Manual remote update push';
    const nextVersion = broadcastAppUpdate(reason);
    res.json({ ok: true, version: nextVersion });
  });

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      let msg: DeviceSyncMessage | null = null;
      try {
        msg = JSON.parse(String(raw)) as DeviceSyncMessage;
      } catch {
        return;
      }
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'join') {
        const roomId = sanitizeRoomId(msg.roomId);
        const deviceId = String(msg.deviceId || 'unknown').slice(0, 48);
        const prevRoom = clientMeta.get(ws)?.roomId;
        clientMeta.set(ws, { roomId, deviceId });

        if (prevRoom && prevRoom !== roomId) {
          broadcastToRoom(prevRoom, {
            type: 'presence',
            roomId: prevRoom,
            connectedCount: getRoomClientCount(prevRoom),
          });
        }

        const record = roomRecords.get(roomId);
        const connectedCount = getRoomClientCount(roomId);
        sendWs(ws, {
          type: 'init',
          roomId,
          revision: record?.revision ?? 0,
          appVersion: currentAppVersion,
          connectedCount,
          state: record?.state ?? {},
        });
        broadcastToRoom(
          roomId,
          {
            type: 'presence',
            roomId,
            connectedCount,
          },
          ws
        );
        return;
      }

      if (msg.type === 'state:patch') {
        const meta = clientMeta.get(ws);
        const roomId = sanitizeRoomId(msg.roomId ?? meta?.roomId);
        const deviceId = String(msg.deviceId ?? meta?.deviceId ?? 'unknown').slice(0, 48);
        const existing = roomRecords.get(roomId);
        const { record, appliedKeys } = applyWorkspacePatch(existing, roomId, deviceId, msg.patch);
        if (appliedKeys.length === 0) return;

        roomRecords.set(roomId, record);
        schedulePersistRooms();

        broadcastToRoom(
          roomId,
          {
            type: 'state:sync',
            roomId,
            revision: record.revision,
            sourceDeviceId: deviceId,
            state: record.state,
            force: Boolean(msg.force),
          },
          ws
        );
        return;
      }

      if (msg.type === 'app:trigger-reload') {
        const meta = clientMeta.get(ws);
        const roomId = sanitizeRoomId(msg.roomId ?? meta?.roomId);
        broadcastAppUpdate('Pushed from connected device', roomId);
      }
    });

    ws.on('close', () => {
      const meta = clientMeta.get(ws);
      if (!meta) return;
      const count = Math.max(0, getRoomClientCount(meta.roomId));
      broadcastToRoom(meta.roomId, {
        type: 'presence',
        roomId: meta.roomId,
        connectedCount: count,
      });
    });
  });

  // Watch source edits in dev mode (ignoring test files) so connected Fire TVs auto-receive updates
  if (process.env.NODE_ENV !== 'production') {
    const srcDir = path.join(__dirname, 'src');
    let watchDebounce: ReturnType<typeof setTimeout> | null = null;
    try {
      fs.watch(srcDir, { recursive: true }, (_event, filename) => {
        if (!filename || filename.includes('.test.')) return;
        if (watchDebounce) clearTimeout(watchDebounce);
        watchDebounce = setTimeout(() => {
          broadcastAppUpdate(`Source updated (${filename})`);
        }, 1200);
      });
    } catch {
      // Recursive watch may not be supported on all platforms
    }
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Apex 4K Financial TV server running on http://0.0.0.0:${PORT}`);
  });
}

createApp();
