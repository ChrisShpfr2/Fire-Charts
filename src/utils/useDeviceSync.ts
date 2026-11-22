import { useCallback, useEffect, useRef, useState } from 'react';
import { isStandaloneNativeApp } from './clientDataApi';
import {
  buildWsUrlFromLocation,
  sanitizeRoomId,
  type DeviceSyncMessage,
  type ServerSyncMessage,
  type SyncedWorkspaceState,
} from './deviceSync';

const DEVICE_ID_STORAGE_KEY = 'apex-tv-4k-device-id';
const ROOM_STORAGE_KEY = 'apex-tv-4k-sync-room';
const AUTO_SYNC_STORAGE_KEY = 'apex-tv-4k-auto-sync';
const CUSTOM_SYNC_SERVER_KEY = 'apex-tv-4k-sync-server-url';

function getOrCreateDeviceId(): string {
  try {
    const existing = sessionStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing) return existing;
    const generated = `tv-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
    sessionStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
    return generated;
  } catch {
    return `tv-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function getInitialRoomId(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('room');
    if (fromUrl) {
      const clean = sanitizeRoomId(fromUrl);
      localStorage.setItem(ROOM_STORAGE_KEY, clean);
      return clean;
    }
    const saved = localStorage.getItem(ROOM_STORAGE_KEY);
    return sanitizeRoomId(saved);
  } catch {
    return 'global';
  }
}

function getInitialAutoSync(): boolean {
  try {
    const raw = localStorage.getItem(AUTO_SYNC_STORAGE_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

export function normalizeSyncServerUrl(raw?: string | null): string {
  const trimmed = String(raw ?? '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('ws://') ||
    trimmed.startsWith('wss://')
  ) {
    return trimmed;
  }
  return '';
}

function getInitialCustomSyncServerUrl(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = normalizeSyncServerUrl(params.get('syncServer'));
    if (fromUrl) {
      localStorage.setItem(CUSTOM_SYNC_SERVER_KEY, fromUrl);
      return fromUrl;
    }
    return normalizeSyncServerUrl(localStorage.getItem(CUSTOM_SYNC_SERVER_KEY));
  } catch {
    return '';
  }
}

function buildTargetWsUrl(customServerUrl: string): string | null {
  if (customServerUrl) {
    if (customServerUrl.startsWith('ws://') || customServerUrl.startsWith('wss://')) {
      return customServerUrl.endsWith('/ws') ? customServerUrl : `${customServerUrl}/ws`;
    }
    const parsed = new URL(customServerUrl);
    const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProto}//${parsed.host}/ws`;
  }
  if (isStandaloneNativeApp()) {
    return null;
  }
  return buildWsUrlFromLocation(window.location);
}

export interface OtaUpdateNotice {
  version: string;
  reason: string;
  secondsRemaining: number;
}

interface UseDeviceSyncOptions {
  currentState: SyncedWorkspaceState;
  onApplyRemoteState: (state: SyncedWorkspaceState) => void;
  onRemoteSyncNotice?: (msg: string) => void;
}

export function useDeviceSync({
  currentState,
  onApplyRemoteState,
  onRemoteSyncNotice,
}: UseDeviceSyncOptions) {
  const isStandalone = isStandaloneNativeApp();
  const [deviceId] = useState<string>(() => getOrCreateDeviceId());
  const [roomId, setRoomIdState] = useState<string>(() => getInitialRoomId());
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => getInitialAutoSync());
  const [customSyncServerUrl, setCustomSyncServerUrlState] = useState<string>(() =>
    getInitialCustomSyncServerUrl()
  );
  const [connected, setConnected] = useState(false);
  const [connectedCount, setConnectedCount] = useState(1);
  const [revision, setRevision] = useState(0);
  const [otaUpdateNotice, setOtaUpdateNotice] = useState<OtaUpdateNotice | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const bootVersionRef = useRef<string | null>(null);
  const applyingRemoteRef = useRef(false);
  const currentStateRef = useRef(currentState);
  currentStateRef.current = currentState;
  const onApplyRemoteRef = useRef(onApplyRemoteState);
  onApplyRemoteRef.current = onApplyRemoteState;
  const onNoticeRef = useRef(onRemoteSyncNotice);
  onNoticeRef.current = onRemoteSyncNotice;
  const autoSyncRef = useRef(autoSyncEnabled);
  autoSyncRef.current = autoSyncEnabled;

  const setRoomId = useCallback((nextRoom: string) => {
    const clean = sanitizeRoomId(nextRoom);
    setRoomIdState(clean);
    try {
      localStorage.setItem(ROOM_STORAGE_KEY, clean);
    } catch {
      // ignore
    }
  }, []);

  const setCustomSyncServerUrl = useCallback((nextUrl: string) => {
    const clean = normalizeSyncServerUrl(nextUrl);
    setCustomSyncServerUrlState(clean);
    try {
      if (clean) {
        localStorage.setItem(CUSTOM_SYNC_SERVER_KEY, clean);
      } else {
        localStorage.removeItem(CUSTOM_SYNC_SERVER_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleAutoSync = useCallback((next: boolean) => {
    setAutoSyncEnabled(next);
    try {
      localStorage.setItem(AUTO_SYNC_STORAGE_KEY, String(next));
    } catch {
      // ignore
    }
  }, []);

  const triggerOtaReloadFlow = useCallback((nextVersion: string, reason: string) => {
    setOtaUpdateNotice((prev) => {
      if (prev && prev.version === nextVersion) return prev;
      return { version: nextVersion, reason, secondsRemaining: 3 };
    });
  }, []);

  // Countdown & auto-reload when OTA update is pushed
  useEffect(() => {
    if (!otaUpdateNotice) return;
    if (otaUpdateNotice.secondsRemaining <= 0) {
      window.location.reload();
      return;
    }
    const timer = setTimeout(() => {
      setOtaUpdateNotice((prev) =>
        prev ? { ...prev, secondsRemaining: prev.secondsRemaining - 1 } : null
      );
    }, 1000);
    return () => clearTimeout(timer);
  }, [otaUpdateNotice]);

  // Connect WebSocket with auto-reconnect (skipped in standalone mode unless custom server URL is set)
  useEffect(() => {
    let wsUrl: string | null = null;
    try {
      wsUrl = buildTargetWsUrl(customSyncServerUrl);
    } catch {
      wsUrl = null;
    }

    if (!wsUrl) {
      setConnected(false);
      setConnectedCount(1);
      return;
    }

    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let backoffMs = 1000;

    const connect = () => {
      if (disposed || !wsUrl) return;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (disposed) {
          ws.close();
          return;
        }
        backoffMs = 1000;
        setConnected(true);
        const joinMsg: DeviceSyncMessage = {
          type: 'join',
          roomId,
          deviceId,
        };
        ws.send(JSON.stringify(joinMsg));
      };

      ws.onmessage = (event) => {
        let msg: ServerSyncMessage | null = null;
        try {
          msg = JSON.parse(String(event.data)) as ServerSyncMessage;
        } catch {
          return;
        }
        if (!msg) return;

        if (msg.type === 'init') {
          setConnectedCount(Math.max(1, msg.connectedCount));
          setRevision(msg.revision);

          if (!bootVersionRef.current) {
            bootVersionRef.current = msg.appVersion;
          } else if (msg.appVersion !== bootVersionRef.current) {
            triggerOtaReloadFlow(msg.appVersion, 'New build deployed on server');
          }

          if (autoSyncRef.current && msg.revision > 0 && Object.keys(msg.state).length > 0) {
            applyingRemoteRef.current = true;
            onApplyRemoteRef.current(msg.state);
            queueMicrotask(() => {
              applyingRemoteRef.current = false;
            });
          }
          return;
        }

        if (msg.type === 'presence') {
          setConnectedCount(Math.max(1, msg.connectedCount));
          return;
        }

        if (msg.type === 'state:sync') {
          setRevision(msg.revision);
          if (!autoSyncRef.current && !msg.force) return;
          if (msg.sourceDeviceId === deviceId) return;

          applyingRemoteRef.current = true;
          onApplyRemoteRef.current(msg.state);
          onNoticeRef.current?.('Live update synced from another device');
          queueMicrotask(() => {
            applyingRemoteRef.current = false;
          });
          return;
        }

        if (msg.type === 'app:update') {
          if (!bootVersionRef.current) {
            bootVersionRef.current = msg.appVersion;
            return;
          }
          if (msg.appVersion !== bootVersionRef.current) {
            triggerOtaReloadFlow(msg.appVersion, msg.reason);
          }
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        if (!disposed) {
          reconnectTimer = setTimeout(() => {
            backoffMs = Math.min(6000, backoffMs * 1.5);
            connect();
          }, backoffMs);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();
    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [roomId, deviceId, customSyncServerUrl, triggerOtaReloadFlow]);

  // Broadcast local workspace state changes (debounced, skipping remote updates)
  const patchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstMountRef = useRef(true);

  useEffect(() => {
    if (firstMountRef.current) {
      firstMountRef.current = false;
      return;
    }
    if (!autoSyncEnabled || applyingRemoteRef.current) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    if (patchTimerRef.current) clearTimeout(patchTimerRef.current);
    patchTimerRef.current = setTimeout(() => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN || applyingRemoteRef.current) return;
      const msg: DeviceSyncMessage = {
        type: 'state:patch',
        roomId,
        deviceId,
        patch: currentStateRef.current,
      };
      ws.send(JSON.stringify(msg));
    }, 150);

    return () => {
      if (patchTimerRef.current) clearTimeout(patchTimerRef.current);
    };
  }, [
    currentState.layoutCount,
    currentState.windows,
    currentState.settings,
    currentState.alerts,
    autoSyncEnabled,
    roomId,
    deviceId,
  ]);

  const pushWorkspaceNow = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    const msg: DeviceSyncMessage = {
      type: 'state:patch',
      roomId,
      deviceId,
      patch: currentStateRef.current,
      force: true,
    };
    ws.send(JSON.stringify(msg));
    return true;
  }, [roomId, deviceId]);

  const pushAppReloadToAllDevices = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    const msg: DeviceSyncMessage = {
      type: 'app:trigger-reload',
      roomId,
      deviceId,
    };
    ws.send(JSON.stringify(msg));
    return true;
  }, [roomId, deviceId]);

  const dismissOtaNotice = useCallback(() => {
    setOtaUpdateNotice(null);
  }, []);

  return {
    deviceId,
    isStandalone,
    customSyncServerUrl,
    setCustomSyncServerUrl,
    roomId,
    setRoomId,
    autoSyncEnabled,
    toggleAutoSync,
    connected,
    connectedCount,
    revision,
    otaUpdateNotice,
    dismissOtaNotice,
    pushWorkspaceNow,
    pushAppReloadToAllDevices,
  };
}
