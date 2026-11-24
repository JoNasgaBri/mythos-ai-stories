import { ArrowRight, BookOpen, CornerDownLeft, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DOC_ARTICLES, searchDocsCatalog } from '../../data/docsCatalog';

interface DocsSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelectArticle: (articleId: string) => void;
}

const SUGGESTED_QUERIES = [
  'd20',
  'Dirigir',
  'Atlas GPS',
  'Guilda',
  'Inspiração',
  'Android iOS',
];

export function DocsSearchModal({
  open,
  onClose,
  onSelectArticle,
}: DocsSearchModalProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const hits = useMemo(() => searchDocsCatalog(query), [query]);

  const fallbackArticles = useMemo(() => DOC_ARTICLES.slice(0, 6), []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      const listLen = query.trim() ? hits.length : fallbackArticles.length;
      if (listLen === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % listLen);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + listLen) % listLen);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const chosen = query.trim()
          ? hits[activeIndex]?.article
          : fallbackArticles[activeIndex];
        if (chosen) {
          onSelectArticle(chosen.id);
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, query, hits, fallbackArticles, activeIndex, onClose, onSelectArticle]);

  if (!open) return null;

  return (
    <div
      className="animate-backdrop-in fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-3 pt-12 backdrop-blur-md sm:pt-20"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Buscar na documentação"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-modal-spring w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-2xl"
      >
        {/* Search Input Row */}
        <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-[var(--accent)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar mecânicas, dados d20, Atlas, Guilda, prompts..."
            className="w-full bg-transparent text-[16px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none sm:text-sm"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-md p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="hidden rounded-md border border-[var(--border-subtle)] px-1.5 py-0.5 font-mono-tech text-[10px] text-[var(--text-muted)] sm:inline-block"
          >
            ESC
          </button>
        </div>

        {/* Suggested Quick Chips */}
        {!query.trim() ? (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border-subtle)]/70 bg-[var(--bg-canvas)]/45 px-4 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Populares:
            </span>
            {SUGGESTED_QUERIES.map((sq) => (
              <button
                key={sq}
                type="button"
                onClick={() => setQuery(sq)}
                className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-0.5 text-[11px] text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {sq}
              </button>
            ))}
          </div>
        ) : null}

        {/* Results */}
        <div className="max-h-[60dvh] overflow-y-auto p-2">
          {query.trim() ? (
            hits.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-[var(--text-muted)]">
                Nenhum guia encontrado para “{query}”. Tente termos como{' '}
                <strong className="text-[var(--text-secondary)]">d20</strong>,{' '}
                <strong className="text-[var(--text-secondary)]">Atlas</strong>,{' '}
                <strong className="text-[var(--text-secondary)]">Guilda</strong> ou{' '}
                <strong className="text-[var(--text-secondary)]">Dirigir</strong>.
              </div>
            ) : (
              <div className="space-y-1">
                {hits.map((hit, i) => {
                  const selected = i === activeIndex;
                  return (
                    <button
                      key={hit.article.id}
                      type="button"
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => {
                        onSelectArticle(hit.article.id);
                        onClose();
                      }}
                      className={`flex w-full items-start justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left transition ${
                        selected
                          ? 'bg-[var(--accent-soft)] text-[var(--text-primary)]'
                          : 'hover:bg-[var(--bg-elevated)]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                          <span>{hit.category.title}</span>
                        </div>
                        <div className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
                          {hit.article.title}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-secondary)]">
                          {hit.snippet}
                        </p>
                      </div>
                      <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Guias Essenciais
              </div>
              {fallbackArticles.map((art, i) => {
                const selected = i === activeIndex;
                return (
                  <button
                    key={art.id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => {
                      onSelectArticle(art.id);
                      onClose();
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left transition ${
                      selected
                        ? 'bg-[var(--accent-soft)]'
                        : 'hover:bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <BookOpen className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-[var(--text-primary)]">
                          {art.title}
                        </div>
                        <div className="truncate text-xs text-[var(--text-muted)]">
                          {art.summary}
                        </div>
                      </div>
                    </div>
                    <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer keyboard hints */}
        <div className="hidden items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 px-4 py-2 text-[10px] text-[var(--text-muted)] sm:flex">
          <div className="flex items-center gap-3">
            <span>↑↓ navegar</span>
            <span>↵ abrir artigo</span>
            <span>ESC fechar</span>
          </div>
          <span>MYTHOS Docs Search</span>
        </div>
      </div>
    </div>
  );
}
