import type {
  ChartWindowConfig,
  LayoutCount,
  PriceAlert,
  TerminalSettings,
} from '../types/trading';

export interface SyncedWorkspaceState {
  layoutCount?: LayoutCount;
  windows?: ChartWindowConfig[];
  settings?: TerminalSettings;
  alerts?: PriceAlert[];
}

export interface RoomSyncRecord {
  roomId: string;
  revision: number;
  updatedAt: number;
  updatedByDeviceId: string | null;
  state: SyncedWorkspaceState;
}

export type DeviceSyncMessage =
  | {
      type: 'join';
      roomId: string;
      deviceId: string;
    }
  | {
      type: 'state:patch';
      roomId: string;
      deviceId: string;
      patch: SyncedWorkspaceState;
      force?: boolean;
    }
  | {
      type: 'app:trigger-reload';
      roomId: string;
      deviceId: string;
    };

export type ServerSyncMessage =
  | {
      type: 'init';
      roomId: string;
      revision: number;
      appVersion: string;
      connectedCount: number;
      state: SyncedWorkspaceState;
    }
  | {
      type: 'state:sync';
      roomId: string;
      revision: number;
      sourceDeviceId: string;
      state: SyncedWorkspaceState;
      force?: boolean;
    }
  | {
      type: 'presence';
      roomId: string;
      connectedCount: number;
    }
  | {
      type: 'app:update';
      appVersion: string;
      reason: string;
    };

export function sanitizeRoomId(raw?: string | null): string {
  const cleaned = String(raw ?? 'global')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32);
  return cleaned || 'global';
}

export function isValidLayoutCount(val: unknown): val is LayoutCount {
  return typeof val === 'number' && Number.isInteger(val) && val >= 1 && val <= 12;
}

export function sanitizeSyncedPatch(patch: unknown): SyncedWorkspaceState {
  if (!patch || typeof patch !== 'object') return {};
  const p = patch as Record<string, unknown>;
  const out: SyncedWorkspaceState = {};

  if (isValidLayoutCount(p.layoutCount)) {
    out.layoutCount = p.layoutCount;
  }
  if (Array.isArray(p.windows) && p.windows.length === 12) {
    out.windows = p.windows as ChartWindowConfig[];
  }
  if (p.settings && typeof p.settings === 'object' && !Array.isArray(p.settings)) {
    out.settings = p.settings as TerminalSettings;
  }
  if (Array.isArray(p.alerts)) {
    out.alerts = (p.alerts as PriceAlert[]).filter(
      (a) =>
        Boolean(a) &&
        typeof a.id === 'string' &&
        typeof a.windowId === 'string' &&
        typeof a.symbol === 'string' &&
        typeof a.targetPrice === 'number' &&
        Number.isFinite(a.targetPrice)
    );
  }
  return out;
}

export function applyWorkspacePatch(
  current: RoomSyncRecord | undefined,
  roomId: string,
  deviceId: string,
  rawPatch: unknown,
  nowMs = Date.now()
): { record: RoomSyncRecord; appliedKeys: Array<keyof SyncedWorkspaceState> } {
  const cleanRoom = sanitizeRoomId(roomId);
  const base: RoomSyncRecord = current ?? {
    roomId: cleanRoom,
    revision: 0,
    updatedAt: nowMs,
    updatedByDeviceId: null,
    state: {},
  };

  const cleanPatch = sanitizeSyncedPatch(rawPatch);
  const appliedKeys = Object.keys(cleanPatch) as Array<keyof SyncedWorkspaceState>;

  if (appliedKeys.length === 0) {
    return { record: base, appliedKeys: [] };
  }

  const nextState: SyncedWorkspaceState = {
    ...base.state,
    ...cleanPatch,
  };

  return {
    record: {
      roomId: cleanRoom,
      revision: base.revision + 1,
      updatedAt: nowMs,
      updatedByDeviceId: deviceId,
      state: nextState,
    },
    appliedKeys,
  };
}

export function buildWsUrlFromLocation(loc: {
  protocol: string;
  host: string;
}): string {
  const wsProto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProto}//${loc.host}/ws`;
}
