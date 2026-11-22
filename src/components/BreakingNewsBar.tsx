import { ChevronLeft, ChevronRight, Newspaper } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { NewsArticle } from '../types/trading';

interface BreakingNewsBarProps {
  articles: NewsArticle[];
  loading: boolean;
  rotateSec?: number;
  onOpenReader: (selected?: NewsArticle) => void;
}

function timeAgoLabel(iso: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export function BreakingNewsBar({
  articles,
  loading,
  rotateSec = 8,
  onOpenReader,
}: BreakingNewsBarProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (articles.length <= 1 || paused) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % articles.length);
    }, Math.max(2, rotateSec) * 1000);
    return () => clearInterval(timer);
  }, [articles.length, paused, rotateSec]);

  const current = articles[index % Math.max(1, articles.length)];

  return (
    <div
      className="h-9 bg-[#0E131D] border-b border-slate-800/90 flex items-center justify-between px-3.5 gap-3 shrink-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      data-testid="breaking-news-bar"
      aria-label="Breaking Financial News"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="text-[11px] font-display font-bold tracking-wider text-amber-400 uppercase whitespace-nowrap shrink-0">
          Breaking News
        </span>
        <span className="text-slate-600 shrink-0" aria-hidden="true">
          |
        </span>

        {loading && !current ? (
          <span className="text-xs text-slate-400 truncate">
            Fetching financial headlines from Wall Street Journal, MarketWatch, Investing.com...
          </span>
        ) : current ? (
          <button
            type="button"
            onClick={() => onOpenReader(current)}
            className="tv-focusable flex items-center gap-2.5 min-w-0 flex-1 text-left hover:text-white text-slate-200 transition-colors cursor-pointer"
          >
            <span className="text-xs font-semibold text-sky-400 whitespace-nowrap shrink-0">
              {current.source}
            </span>
            <span className="text-slate-600 shrink-0" aria-hidden="true">
              ·
            </span>
            <span className="text-xs font-medium truncate">{current.title}</span>
            <span className="text-[11px] font-mono-num text-slate-400 whitespace-nowrap shrink-0 hidden sm:inline">
              {timeAgoLabel(current.publishedAt)}
            </span>
          </button>
        ) : (
          <span className="text-xs text-slate-400">No headlines available</span>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() =>
            setIndex((prev) => (prev - 1 + Math.max(1, articles.length)) % Math.max(1, articles.length))
          }
          aria-label="Previous breaking news headline"
          className="tv-focusable p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setIndex((prev) => (prev + 1) % Math.max(1, articles.length))}
          aria-label="Next breaking news headline"
          className="tv-focusable p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onOpenReader(current)}
          className="tv-focusable flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 transition-colors whitespace-nowrap shrink-0 cursor-pointer ml-1"
        >
          <Newspaper className="w-3.5 h-3.5 text-amber-400" />
          <span>All Headlines ({articles.length})</span>
        </button>
      </div>
    </div>
  );
}
