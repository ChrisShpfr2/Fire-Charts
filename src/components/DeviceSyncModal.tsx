import {
  Check,
  Copy,
  MonitorSmartphone,
  RefreshCw,
  Send,
  Tv,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { sanitizeRoomId } from '../utils/deviceSync';

interface DeviceSyncModalProps {
  isOpen: boolean;
  roomId: string;
  connected: boolean;
  connectedCount: number;
  revision: number;
  autoSyncEnabled: boolean;
  onChangeRoomId: (room: string) => void;
  onToggleAutoSync: (enabled: boolean) => void;
  onPushWorkspaceNow: () => boolean;
  onPushAppReload: () => boolean;
  onClose: () => void;
}

export function DeviceSyncModal({
  isOpen,
  roomId,
  connected,
  connectedCount,
  revision,
  autoSyncEnabled,
  onChangeRoomId,
  onToggleAutoSync,
  onPushWorkspaceNow,
  onPushAppReload,
  onClose,
}: DeviceSyncModalProps) {
  const [roomInput, setRoomInput] = useState(roomId);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const pairingUrl = `${window.location.origin}/?room=${encodeURIComponent(roomId)}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(pairingUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      setFeedback('Copy link manually from the box above.');
    }
  };

  const handleApplyRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeRoomId(roomInput);
    setRoomInput(clean);
    onChangeRoomId(clean);
    setFeedback(`Switched to sync channel "${clean}".`);
  };

  const handlePushState = () => {
    const ok = onPushWorkspaceNow();
    setFeedback(
      ok
        ? 'Layout, indicators, settings, and price alerts pushed to all connected devices.'
        : 'Waiting for WebSocket connection to push changes.'
    );
  };

  const handlePushOtaReload = () => {
    const ok = onPushAppReload();
    setFeedback(
      ok
        ? 'OTA refresh signal broadcast to all connected Fire TVs & browsers.'
        : 'Waiting for WebSocket connection to push update.'
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Multi-Device Push Sync and Fire TV APK"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#101622] border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MonitorSmartphone className="w-5 h-5 text-[#8EE53F]" />
            <div>
              <h2 className="font-display font-bold text-lg text-white">
                Multi-Device Push Sync &amp; Fire TV APK
              </h2>
              <p className="text-xs text-slate-400">
                Real-time WebSocket state &amp; OTA update push across all Fire TVs and browsers.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close multi-device sync modal"
            className="tv-focusable p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {/* Live Connection & Channel Bar */}
          <div className="p-3.5 rounded-lg bg-[#0B0F17] border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {connected ? (
                <Wifi className="w-4 h-4 text-[#8EE53F]" />
              ) : (
                <WifiOff className="w-4 h-4 text-amber-400" />
              )}
              <div>
                <div className="text-sm font-semibold text-white">
                  {connected ? 'Live Push Bus Connected' : 'Reconnecting to Push Bus…'}
                </div>
                <div className="text-xs font-mono-num text-slate-400">
                  Channel: <strong className="text-sky-300">{roomId}</strong> ·{' '}
                  <strong className="text-[#8EE53F]">{connectedCount}</strong> active device
                  {connectedCount === 1 ? '' : 's'} · rev #{revision}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onToggleAutoSync(!autoSyncEnabled)}
              aria-pressed={autoSyncEnabled}
              className={`tv-focusable px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                autoSyncEnabled
                  ? 'bg-[#8EE53F]/20 text-[#8EE53F] border-[#8EE53F]/50'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              Auto-Push: {autoSyncEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Instant Push Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handlePushState}
              className="tv-focusable flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#8EE53F] hover:bg-[#9EEB54] text-[#080B11] text-xs font-bold transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Push Setup to All Devices</span>
            </button>

            <button
              type="button"
              onClick={handlePushOtaReload}
              className="tv-focusable flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-500/40 text-xs font-bold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Push App Reload to All TVs</span>
            </button>
          </div>

          {feedback && (
            <div
              role="status"
              className="px-3 py-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-xs text-sky-200"
            >
              {feedback}
            </div>
          )}

          {/* Sync Channel & Pairing Link */}
          <div className="p-3.5 rounded-lg bg-[#0B0F17] border border-slate-800 space-y-2.5">
            <form onSubmit={handleApplyRoom} className="flex flex-wrap items-center gap-2">
              <label htmlFor="sync-room-input" className="text-xs font-semibold text-slate-300">
                Sync Channel ID:
              </label>
              <input
                id="sync-room-input"
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder="global"
                className="tv-focusable flex-1 min-w-[140px] bg-[#111827] border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono-num text-white focus:border-sky-400 outline-none"
              />
              <button
                type="submit"
                className="tv-focusable px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white cursor-pointer"
              >
                Join Channel
              </button>
            </form>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={pairingUrl}
                aria-label="Device pairing URL"
                className="flex-1 min-w-0 bg-[#111827] border border-slate-800 rounded px-2.5 py-1.5 text-[11px] font-mono-num text-slate-300"
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                className="tv-focusable flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer shrink-0"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-[#8EE53F]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
          </div>

          {/* Fire TV APK Packaging Info */}
          <div className="p-3.5 rounded-lg bg-[#0B0F17] border border-amber-400/35 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
              <Tv className="w-4 h-4" />
              <span>Amazon Fire TV APK Wrapper &amp; Auto-CI Build</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This container runs the web terminal directly (Android SDK is not installed here to pre-compile a binary{' '}
              <code className="text-amber-200">.apk</code>). A complete Fire TV Leanback WebView Android project is included under{' '}
              <code className="text-sky-300">android-tv/</code> along with a GitHub Actions workflow (
              <code className="text-sky-300">.github/workflows/build-firetv-apk.yml</code>) that builds the{' '}
              <code className="text-amber-200">.apk</code> on Git push. Because the Fire TV APK loads this live terminal URL over WebSockets, any chart, alert, or app code updates pushed to the server appear on all connected Fire TVs automatically without re-sideloading.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
