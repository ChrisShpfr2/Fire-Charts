import type { Timeframe } from '../types/trading';

export interface TimeframeMeta {
  id: Timeframe;
  label: string;
  seconds: number;
  group: 'Seconds' | 'Minutes' | 'Hours';
}

export const ALL_TIMEFRAMES: TimeframeMeta[] = [
  { id: '10s', label: '10s', seconds: 10, group: 'Seconds' },
  { id: '1m', label: '1m', seconds: 60, group: 'Minutes' },
  { id: '3m', label: '3m', seconds: 180, group: 'Minutes' },
  { id: '6m', label: '6m', seconds: 360, group: 'Minutes' },
  { id: '7m', label: '7m', seconds: 420, group: 'Minutes' },
  { id: '9m', label: '9m', seconds: 540, group: 'Minutes' },
  { id: '12m', label: '12m', seconds: 720, group: 'Minutes' },
  { id: '15m', label: '15m', seconds: 900, group: 'Minutes' },
  { id: '24m', label: '24m', seconds: 1440, group: 'Minutes' },
  { id: '30m', label: '30m', seconds: 1800, group: 'Minutes' },
  { id: '45m', label: '45m', seconds: 2700, group: 'Minutes' },
  { id: '1h', label: '1h', seconds: 3600, group: 'Hours' },
  { id: '2h', label: '2h', seconds: 7200, group: 'Hours' },
  { id: '3h', label: '3h', seconds: 10800, group: 'Hours' },
  { id: '4h', label: '4h', seconds: 14400, group: 'Hours' },
  { id: '7h', label: '7h', seconds: 25200, group: 'Hours' },
  { id: '8h', label: '8h', seconds: 28800, group: 'Hours' },
  { id: '12h', label: '12h', seconds: 43200, group: 'Hours' },
];

export const TIMEFRAME_MAP: Record<Timeframe, TimeframeMeta> = Object.fromEntries(
  ALL_TIMEFRAMES.map((tf) => [tf.id, tf])
) as Record<Timeframe, TimeframeMeta>;

export function getTimeframeSeconds(tf: Timeframe): number {
  return TIMEFRAME_MAP[tf]?.seconds ?? 900;
}

export function isValidTimeframe(value: string): value is Timeframe {
  return value in TIMEFRAME_MAP;
}
