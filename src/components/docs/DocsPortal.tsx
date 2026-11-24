import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  Crown,
  Dices,
  Globe2,
  List,
  Menu,
  Rocket,
  Search,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DOC_ARTICLES,
  DOC_CATEGORIES,
  getArticleHeadings,
} from '../../data/docsCatalog';
import type { DocBadgeKind, DocIconName } from '../../data/docsTypes';
import { DocBlockRenderer } from './DocBlockRenderer';
import { DocsSearchModal } from './DocsSearchModal';

const READ_STORAGE_KEY = 'mythos_docs_read_v1';

const CATEGORY_ICON: Record<DocIconName, typeof Rocket> = {
  rocket: Rocket,
  dices: Dices,
  users: Users,
  shield: Shield,
  globe: Globe2,
  crown: Crown,
};

const BADGE_META: Record<
  DocBadgeKind,
  { label: string; color: string }
> = {
  essential: { label: 'Essencial', color: '#4ade80' },
  mechanics: { label: 'Mecânica', color: '#38bdf8' },
  reference: { label: 'Referência Técnica', color: '#c084fc' },
  'pro-tip': { label: 'Guia Avançado', color: '#fbbf24' },
};

interface DocsPortalProps {
  initialArticleId?: string;
  hasActiveCampaign: boolean;
  activeCampaignTitle?: string;
  onReturn: () => void;
  onStartInteractiveTour?: () => void;
}

function loadReadIds(): string[] {
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === 'string')
      : [];
  } catch {
    return [];
  }
}

export function DocsPortal({
  initialArticleId,
  hasActiveCampaign,
  activeCampaignTitle,
  onReturn,
  onStartInteractiveTour,
}: DocsPortalProps) {
  const [activeArticleId, setActiveArticleId] = useState<string>(
    initialArticleId && DOC_ARTICLES.some((a) => a.id === initialArticleId)
      ? initialArticleId
      : DOC_ARTICLES[0].id,
  );
  const [readIds, setReadIds] = useState<string[]>(() => loadReadIds());
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const contentTopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (
      initialArticleId &&
      DOC_ARTICLES.some((a) => a.id === initialArticleId)
    ) {
      setActiveArticleId(initialArticleId);
    }
  }, [initialArticleId]);

  const activeIndex = useMemo(
    () => Math.max(0, DOC_ARTICLES.findIndex((a) => a.id === activeArticleId)),
    [activeArticleId],
  );
  const activeArticle = DOC_ARTICLES[activeIndex] ?? DOC_ARTICLES[0];
  const activeCategory = useMemo(
    () =>
      DOC_CATEGORIES.find((c) => c.id === activeArticle.categoryId) ??
      DOC_CATEGORIES[0],
    [activeArticle.categoryId],
  );
  const prevArticle = activeIndex > 0 ? DOC_ARTICLES[activeIndex - 1] : null;
  const nextArticle =
    activeIndex < DOC_ARTICLES.length - 1
      ? DOC_ARTICLES[activeIndex + 1]
      : null;

  const headings = useMemo(
    () => getArticleHeadings(activeArticle),
    [activeArticle],
  );

  // Ctrl+K / Cmd+K or '/' shortcut opens DocSearch
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      } else if (
        e.key === '/' &&
        !searchOpen &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  // Scroll-spy for right-hand "Nesta página" TOC
  useEffect(() => {
    setActiveHeadingId(headings[0]?.id ?? null);
    if (headings.length === 0) return;

    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((en) => en.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) {
          setActiveHeadingId(visible[0].target.id);
        }
      },
      { rootMargin: '-85px 0px -65% 0px', threshold: 0.1 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  const selectArticle = (id: string) => {
    setActiveArticleId(id);
    setMobileNavOpen(false);
    setMobileTocOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    contentTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleRead = (id: string) => {
    setReadIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      try {
        localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage failure
      }
      return next;
    });
  };

  const jumpToHeading = (headingId: string) => {
    setMobileTocOpen(false);
    setActiveHeadingId(headingId);
    const el = document.getElementById(headingId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const isRead = readIds.includes(activeArticle.id);
  const badgeMeta = BADGE_META[activeArticle.badge];
  const progressPct = Math.round((readIds.length / DOC_ARTICLES.length) * 100);

  const renderSidebarNav = () => (
    <div className="space-y-4">
      {/* Search Trigger Button */}
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/80 px-3 py-2 text-xs text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
      >
        <span className="inline-flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span>Buscar nos guias...</span>
        </span>
        <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono-tech text-[10px]">
          Ctrl K
        </kbd>
      </button>

      {/* Reading Progress Pill */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/65 p-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-[var(--text-primary)]">
            Trilha de Domínio
          </span>
          <span className="font-mono-tech text-[var(--accent)]">
            {readIds.length}/{DOC_ARTICLES.length}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-canvas)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Category Groups */}
      <nav aria-label="Sumário da Documentação" className="space-y-4">
        {DOC_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICON[cat.icon];
          const articles = DOC_ARTICLES.filter((a) => a.categoryId === cat.id);
          return (
            <div key={cat.id}>
              <div className="mb-1.5 flex items-center gap-2 px-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>{cat.title}</span>
              </div>
              <ul className="space-y-0.5 border-l border-[var(--border-subtle)] pl-2">
                {articles.map((art) => {
                  const active = art.id === activeArticle.id;
                  const done = readIds.includes(art.id);
                  return (
                    <li key={art.id}>
                      <button
                        type="button"
                        onClick={() => selectArticle(art.id)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                          active
                            ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span className="truncate">{art.shortTitle}</span>
                        {done ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--success)]" />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div
      ref={contentTopRef}
      className="animate-view-enter relative z-10 mx-auto w-full max-w-[1440px] px-3 pt-2 pb-16 sm:px-6 sm:pt-4"
    >
      {/* Mobile Sticky Docs Utility Bar */}
      <div className="sticky top-[calc(3.1rem+env(safe-area-inset-top))] z-20 mb-4 flex items-center justify-between gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 px-2.5 py-2 shadow-md backdrop-blur-xl lg:hidden">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)]"
        >
          <Menu className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span>Tópicos</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex flex-1 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/75 px-3 py-1.5 text-xs text-[var(--text-muted)]"
        >
          <Search className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span className="truncate">Buscar nos guias...</span>
        </button>

        <button
          type="button"
          onClick={onReturn}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#111]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{hasActiveCampaign ? 'Jogo' : 'Início'}</span>
        </button>
      </div>

      {/* 3-Column Documentation Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[265px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)_235px]">
        {/* COLUMN 1: Left Sticky Navigation (Desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-16 max-h-[calc(100vh-5rem)] overflow-y-auto pr-2 pb-6">
            <button
              type="button"
              onClick={onReturn}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-3.5 py-2.5 text-xs font-bold text-[#111] shadow-sm transition hover:brightness-110"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="truncate">
                {hasActiveCampaign
                  ? `Voltar: ${activeCampaignTitle || 'Crônica'}`
                  : 'Voltar para a Tela Inicial'}
              </span>
            </button>
            {renderSidebarNav()}
          </div>
        </aside>

        {/* COLUMN 2: Center Editorial Article */}
        <main className="min-w-0">
          <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/85 p-5 shadow-[var(--shadow-card)] sm:p-8 lg:p-10">
            {/* Breadcrumbs */}
            <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <BookOpen className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span>MYTHOS Docs</span>
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
              <span>{activeCategory.title}</span>
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
              <span className="font-medium text-[var(--text-primary)]">
                {activeArticle.shortTitle}
              </span>
            </div>

            {/* Article Title & Metadata */}
            <header className="border-b border-[var(--border-subtle)] pb-6">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: `${badgeMeta.color}1F`,
                    color: badgeMeta.color,
                  }}
                >
                  {badgeMeta.label}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
                  <Clock className="h-3 w-3" />
                  {activeArticle.readMinutes} min de leitura
                </span>
                <span className="font-mono-tech rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/70 px-2.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                  {activeArticle.updatedVersion}
                </span>
              </div>

              <h1 className="font-display text-2xl font-semibold leading-tight text-[var(--text-primary)] sm:text-3xl">
                {activeArticle.title}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
                {activeArticle.summary}
              </p>

              {/* Inline Collapsible Mobile/Tablet TOC */}
              {headings.length > 0 ? (
                <div className="mt-4 xl:hidden">
                  <button
                    type="button"
                    onClick={() => setMobileTocOpen((v) => !v)}
                    className="flex w-full items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/70 px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <List className="h-3.5 w-3.5 text-[var(--accent)]" />
                      <span>
                        Nesta página ({headings.length}{' '}
                        {headings.length === 1 ? 'seção' : 'seções'})
                      </span>
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        mobileTocOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {mobileTocOpen ? (
                    <ul className="mt-1.5 space-y-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/60 p-2.5 text-xs">
                      {headings.map((h) => (
                        <li key={h.id}>
                          <button
                            type="button"
                            onClick={() => jumpToHeading(h.id)}
                            className="w-full rounded-lg px-2 py-1 text-left text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--accent)]"
                          >
                            {h.text}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </header>

            {/* Interactive Tour CTA Banner on Overview */}
            {onStartInteractiveTour && activeArticle.id === 'overview' ? (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#a78bfa]/40 bg-[#a78bfa]/10 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#a78bfa]/20 text-[#c4b5fd]">
                    <Compass className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                      Prefere aprender clicando diretamente na interface?
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Faça o Tour Interativo guiado de 9 passos com destaques ao vivo no palco.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onStartInteractiveTour}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#a78bfa] px-3.5 py-2 text-xs font-semibold text-[#110b22] transition hover:brightness-110"
                >
                  <span>Iniciar Tour Interativo</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}

            {/* Editorial Content Blocks */}
            <div className="mt-6">
              <DocBlockRenderer
                blocks={activeArticle.blocks}
                onAnchorClick={jumpToHeading}
              />
            </div>

            {/* Read Completion Action */}
            <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/65 p-4">
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  {isRead
                    ? 'Guia concluído na sua trilha!'
                    : 'Terminou de ler este guia?'}
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Marque para acompanhar seu progresso de domínio ({readIds.length}/
                  {DOC_ARTICLES.length}).
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleRead(activeArticle.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  isRead
                    ? 'border border-[var(--success)]/50 bg-[var(--success)]/15 text-[var(--success)]'
                    : 'bg-[var(--accent)] text-[#111] hover:brightness-110'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{isRead ? 'Concluído' : 'Marcar como lido'}</span>
              </button>
            </div>

            {/* Prev / Next Article Pagination (VitePress / Google Docs style) */}
            <footer className="mt-8 grid gap-3 border-t border-[var(--border-subtle)] pt-6 sm:grid-cols-2">
              {prevArticle ? (
                <button
                  type="button"
                  onClick={() => selectArticle(prevArticle.id)}
                  className="group flex flex-col items-start rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/45 p-4 text-left transition hover:border-[var(--accent)] hover:bg-[var(--bg-elevated)]"
                >
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
                    <span>Anterior</span>
                  </span>
                  <span className="mt-1 font-display text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                    {prevArticle.shortTitle}
                  </span>
                </button>
              ) : (
                <div />
              )}

              {nextArticle ? (
                <button
                  type="button"
                  onClick={() => selectArticle(nextArticle.id)}
                  className="group flex flex-col items-end rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/45 p-4 text-right transition hover:border-[var(--accent)] hover:bg-[var(--bg-elevated)]"
                >
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    <span>Próximo</span>
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                  <span className="mt-1 font-display text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                    {nextArticle.shortTitle}
                  </span>
                </button>
              ) : null}
            </footer>
          </article>
        </main>

        {/* COLUMN 3: Right Sticky "Nesta página" TOC (xl+) */}
        <aside className="hidden xl:block">
          <div className="sticky top-16 space-y-5">
            {headings.length > 0 ? (
              <div>
                <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Nesta página
                </h3>
                <ul className="space-y-1 border-l border-[var(--border-subtle)] pl-3 text-xs">
                  {headings.map((h) => {
                    const active = activeHeadingId === h.id;
                    return (
                      <li key={h.id}>
                        <button
                          type="button"
                          onClick={() => jumpToHeading(h.id)}
                          className={`block w-full py-1 text-left transition ${
                            h.level === 3 ? 'pl-2.5' : ''
                          } ${
                            active
                              ? 'font-semibold text-[var(--accent)]'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {h.text}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 p-3.5">
              <p className="text-[11px] font-semibold text-[var(--text-primary)]">
                Atalho Rápido
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
                Pressione <kbd className="rounded border border-[var(--border-subtle)] px-1 font-mono-tech text-[10px]">Ctrl K</kbd> ou <kbd className="rounded border border-[var(--border-subtle)] px-1 font-mono-tech text-[10px]">/</kbd> para pesquisar qualquer regra ou sistema.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Left Navigation Drawer */}
      {mobileNavOpen ? (
        <div
          className="animate-backdrop-in fixed inset-0 z-50 flex justify-start bg-black/65 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-drawer-left flex h-full w-[290px] max-w-[85vw] flex-col border-r border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-2xl"
            style={{
              paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
              paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
            }}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[var(--accent)]" />
                <span className="font-display text-sm font-semibold text-[var(--text-primary)]">
                  MYTHOS Docs
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Fechar menu de tópicos"
                className="rounded-lg border border-[var(--border-subtle)] p-1.5 text-[var(--text-secondary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain p-3.5">
              {renderSidebarNav()}
            </div>
          </div>
        </div>
      ) : null}

      {/* Ctrl+K Search Palette */}
      <DocsSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectArticle={selectArticle}
      />
    </div>
  );
}
