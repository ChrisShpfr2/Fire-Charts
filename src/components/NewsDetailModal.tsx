import { ExternalLink, X } from 'lucide-react';
import { useState } from 'react';
import type { NewsArticle } from '../types/trading';

interface NewsDetailModalProps {
  isOpen: boolean;
  articles: NewsArticle[];
  initialArticle?: NewsArticle;
  onClose: () => void;
}

export function NewsDetailModal({
  isOpen,
  articles,
  initialArticle,
  onClose,
}: NewsDetailModalProps) {
  const [sourceFilter, setSourceFilter] = useState<string>('All');
  const [selectedId, setSelectedId] = useState<string | null>(initialArticle?.id ?? null);

  if (!isOpen) return null;

  const sources = ['All', ...Array.from(new Set(articles.map((a) => a.source)))];
  const visible = articles.filter((a) => sourceFilter === 'All' || a.source === sourceFilter);
  const activeArticle =
    visible.find((a) => a.id === selectedId) ?? initialArticle ?? visible[0];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Breaking Financial News Reader"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#101622] border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[86vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-lg text-white">
              Breaking Financial News Wire
            </h2>
            <p className="text-xs text-slate-400">
              Aggregated live from Wall Street Journal, MarketWatch, Investing.com, and Cointelegraph.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close breaking news reader"
            className="tv-focusable p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-2.5 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto bg-[#0B0F17]">
          {sources.map((src) => (
            <button
              key={src}
              type="button"
              onClick={() => setSourceFilter(src)}
              className={`tv-focusable px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer ${
                sourceFilter === src
                  ? 'bg-[#8EE53F] text-[#080B11] font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {src}
            </button>
          ))}
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 min-h-0 overflow-hidden">
          <div className="md:col-span-2 border-r border-slate-800 overflow-y-auto divide-y divide-slate-800/70">
            {visible.map((article) => {
              const selected = activeArticle?.id === article.id;
              return (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => setSelectedId(article.id)}
                  className={`tv-focusable w-full text-left p-3.5 transition-colors cursor-pointer ${
                    selected ? 'bg-slate-800/70' : 'hover:bg-slate-800/35'
                  }`}
                >
                  <div className="text-[11px] font-medium text-sky-400 mb-1">
                    {article.source} · {new Date(article.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-xs font-semibold text-slate-100 leading-snug">
                    {article.title}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="md:col-span-3 p-6 overflow-y-auto bg-[#0B0F17]">
            {activeArticle ? (
              <div className="space-y-4">
                <div className="text-xs font-medium text-amber-400">
                  {activeArticle.source} · {activeArticle.category} ·{' '}
                  {new Date(activeArticle.publishedAt).toLocaleString()}
                </div>
                <h3 className="font-display font-bold text-xl text-white leading-snug">
                  {activeArticle.title}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">{activeArticle.summary}</p>
                {activeArticle.url && activeArticle.url !== '#' && (
                  <a
                    href={activeArticle.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tv-focusable inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                  >
                    <span>Read Full Story at {activeArticle.source}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-400">Select a headline to inspect details.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
