import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bookmark,
  CheckCircle2,
  CircleDot,
  Compass,
  Flag,
  GitBranch,
  Heart,
  History,
  MapPin,
  Maximize2,
  Search,
  Sparkles,
  Trophy,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildSagaGraph,
  computeSagaAnalytics,
  pickNextBranchColor,
  TIMELINE_BRANCH_COLORS,
  type SagaGraphNode,
} from '../engine/timelineSystem';
import type { Campaign, TimelineBranchPoint, TimelineNodeKind } from '../types/game';

interface TimelineTreeModalProps {
  open: boolean;
  activeCampaign: Campaign;
  allCampaigns: Campaign[];
  onClose: () => void;
  onBranchFromNode: (params: {
    sourceCampaignId: string;
    node: TimelineBranchPoint;
    branchName: string;
    branchColor: string;
  }) => Promise<void>;
  onSwitchCampaign: (campaignId: string) => void;
  onCreateManualMark: (label: string) => void;
}

const NODE_KIND_META: Record<
  TimelineNodeKind,
  { label: string; icon: typeof CircleDot; badgeClass: string }
> = {
  origin: {
    label: 'Origem',
    icon: Compass,
    badgeClass: 'text-[#d4af37] bg-[#d4af37]/15 border-[#d4af37]/40',
  },
  turn: {
    label: 'Turno',
    icon: CircleDot,
    badgeClass: 'text-[var(--text-secondary)] bg-[var(--bg-elevated)] border-[var(--border-subtle)]',
  },
  chapter: {
    label: 'Capítulo',
    icon: Bookmark,
    badgeClass: 'text-[#38bdf8] bg-[#38bdf8]/15 border-[#38bdf8]/40',
  },
  world_event: {
    label: 'Evento',
    icon: Zap,
    badgeClass: 'text-[#fbbf24] bg-[#fbbf24]/15 border-[#fbbf24]/40',
  },
  crisis: {
    label: 'Crise',
    icon: AlertTriangle,
    badgeClass: 'text-[#f87171] bg-[#f87171]/15 border-[#f87171]/40',
  },
  branch_root: {
    label: 'E Se?',
    icon: GitBranch,
    badgeClass: 'text-[#a78bfa] bg-[#a78bfa]/15 border-[#a78bfa]/40',
  },
  manual_mark: {
    label: 'Marco',
    icon: Flag,
    badgeClass: 'text-[#4ade80] bg-[#4ade80]/15 border-[#4ade80]/40',
  },
  ending: {
    label: 'Epílogo',
    icon: Trophy,
    badgeClass: 'text-[#f472b6] bg-[#f472b6]/15 border-[#f472b6]/40',
  },
};

const COL_STEP = 236;
const LANE_STEP = 132;
const NODE_W = 192;
const NODE_H = 82;
const PAD_X = 48;
const PAD_Y = 54;

export function TimelineTreeModal({
  open,
  activeCampaign,
  allCampaigns,
  onClose,
  onBranchFromNode,
  onSwitchCampaign,
  onCreateManualMark,
}: TimelineTreeModalProps) {
  const [tab, setTab] = useState<'tree' | 'stats'>('tree');
  const [search, setSearch] = useState('');
  const [filterLaneCampaignId, setFilterLaneCampaignId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Branch creation form state
  const [branchFormOpen, setBranchFormOpen] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchColor, setBranchColor] = useState<string>(TIMELINE_BRANCH_COLORS[1].hex);
  const [isBranching, setIsBranching] = useState(false);

  // Manual checkpoint mark state
  const [markInputOpen, setMarkInputOpen] = useState(false);
  const [markLabel, setMarkLabel] = useState('');

  // Desktop drag-to-pan ref
  const canvasScrollRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  }>({ dragging: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 });

  const graph = useMemo(
    () => buildSagaGraph(allCampaigns, activeCampaign),
    [allCampaigns, activeCampaign],
  );

  const analytics = useMemo(
    () => computeSagaAnalytics(allCampaigns, activeCampaign),
    [allCampaigns, activeCampaign],
  );

  // Auto-select current active head node on open
  useEffect(() => {
    if (!open) return;
    setTab('tree');
    setBranchFormOpen(false);
    setMarkInputOpen(false);
    setFilterLaneCampaignId(null);
    const head =
      graph.nodes.find((n) => n.isCurrentHead) ??
      graph.nodes[graph.nodes.length - 1] ??
      null;
    setSelectedNodeId(head?.id ?? null);
    setBranchColor(pickNextBranchColor(graph.lanes.map((l) => l.branchColor)));
  }, [open, activeCampaign.id]);

  // Auto-scroll desktop canvas to show the latest nodes on open
  useEffect(() => {
    if (!open || tab !== 'tree') return;
    const el = canvasScrollRef.current;
    if (!el) return;
    const timer = window.setTimeout(() => {
      el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [open, tab, graph.nodes.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const nodeMap = useMemo(() => {
    const m = new Map<string, SagaGraphNode>();
    for (const n of graph.nodes) m.set(n.id, n);
    return m;
  }, [graph.nodes]);

  const selectedNode: SagaGraphNode | null = useMemo(() => {
    if (selectedNodeId && nodeMap.has(selectedNodeId)) {
      return nodeMap.get(selectedNodeId)!;
    }
    return (
      graph.nodes.find((n) => n.isCurrentHead) ??
      graph.nodes[graph.nodes.length - 1] ??
      null
    );
  }, [selectedNodeId, nodeMap, graph.nodes]);

  const searchLower = search.trim().toLowerCase();

  const matchesSearch = (node: SagaGraphNode): boolean => {
    if (!searchLower) return true;
    return (
      node.title.toLowerCase().includes(searchLower) ||
      node.location.toLowerCase().includes(searchLower) ||
      (node.choiceSummary?.toLowerCase().includes(searchLower) ?? false) ||
      node.branchName.toLowerCase().includes(searchLower) ||
      node.highlights.some((h) => h.toLowerCase().includes(searchLower))
    );
  };

  const visibleNodes = useMemo(() => {
    return graph.nodes.filter((n) => {
      if (filterLaneCampaignId && n.campaignId !== filterLaneCampaignId) {
        return false;
      }
      return true;
    });
  }, [graph.nodes, filterLaneCampaignId]);

  if (!open) return null;

  const svgWidth = Math.max(760, PAD_X * 2 + graph.maxColumns * COL_STEP);
  const svgHeight = Math.max(
    320,
    PAD_Y * 2 + Math.max(1, graph.lanes.length) * LANE_STEP,
  );

  const nodeCenter = (n: SagaGraphNode) => ({
    x: PAD_X + n.columnIndex * COL_STEP,
    y: PAD_Y + n.laneIndex * LANE_STEP,
  });

  const handleOpenBranchForm = () => {
    if (!selectedNode) return;
    setBranchName(`E se: ${selectedNode.title.slice(0, 32)}`);
    setBranchColor(pickNextBranchColor(graph.lanes.map((l) => l.branchColor)));
    setBranchFormOpen(true);
  };

  const handleConfirmBranch = async () => {
    if (!selectedNode || isBranching) return;
    setIsBranching(true);
    try {
      await onBranchFromNode({
        sourceCampaignId: selectedNode.campaignId,
        node: selectedNode,
        branchName: branchName.trim() || `E se: Turno ${selectedNode.turn}`,
        branchColor,
      });
      setBranchFormOpen(false);
      onClose();
    } finally {
      setIsBranching(false);
    }
  };

  const handleSubmitMark = () => {
    const clean = markLabel.trim() || `Checkpoint · Turno ${activeCampaign.turnCount}`;
    onCreateManualMark(clean);
    setMarkLabel('');
    setMarkInputOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-[72] flex items-end justify-center bg-black/75 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Árvore de Linhas Temporais E Se?"
        className="flex h-[94dvh] w-full max-w-[1360px] flex-col overflow-hidden rounded-t-3xl border border-[var(--border-strong)] bg-[var(--bg-canvas)] shadow-[0_24px_80px_rgba(0,0,0,0.72)] sm:h-[90vh] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#a78bfa]/40 bg-[#a78bfa]/15 text-[#a78bfa]">
              <GitBranch className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display truncate text-base font-semibold text-[var(--text-primary)] sm:text-lg">
                  Linhas Temporais · {activeCampaign.world.title}
                </h2>
                <span className="rounded-full border border-[#a78bfa]/40 bg-[#a78bfa]/12 px-2 py-0.5 text-[10px] font-semibold text-[#c4b5fd]">
                  {graph.lanes.length}{' '}
                  {graph.lanes.length === 1 ? 'linha' : 'linhas'}
                </span>
              </div>
              <p className="truncate text-[11px] text-[var(--text-muted)]">
                Explore decisões passadas e ramifique futuros alternativos ("E Se?") sem perder seu save original.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-0.5">
              <button
                type="button"
                onClick={() => setTab('tree')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  tab === 'tree'
                    ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <GitBranch className="h-3.5 w-3.5" />
                <span>Árvore</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('stats')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  tab === 'stats'
                    ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Estatísticas</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMarkInputOpen((v) => !v)}
              className="hidden items-center gap-1.5 rounded-xl border border-[#4ade80]/40 bg-[#4ade80]/12 px-3 py-1.5 text-xs font-semibold text-[#4ade80] transition hover:bg-[#4ade80]/20 sm:inline-flex"
            >
              <Flag className="h-3.5 w-3.5" />
              <span>Marcar Agora</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar Linhas Temporais"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Optional Quick Manual Checkpoint Bar */}
        {markInputOpen ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[#4ade80]/30 bg-[#4ade80]/8 px-4 py-2.5 sm:px-5">
            <Flag className="h-4 w-4 shrink-0 text-[#4ade80]" />
            <input
              type="text"
              value={markLabel}
              onChange={(e) => setMarkLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmitMark();
              }}
              placeholder={`Ex.: Antes de negociar no ${activeCampaign.currentLocation}`}
              className="min-w-[180px] flex-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[#4ade80]"
            />
            <button
              type="button"
              onClick={handleSubmitMark}
              className="rounded-lg bg-[#4ade80] px-3 py-1.5 text-xs font-semibold text-[#08140d] transition hover:brightness-110"
            >
              Salvar Marco Exato
            </button>
            <button
              type="button"
              onClick={() => setMarkInputOpen(false)}
              className="rounded-lg px-2 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Cancelar
            </button>
          </div>
        ) : null}

        {/* Branch Selector & Search Toolbar */}
        {tab === 'tree' ? (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/55 px-4 py-2 sm:px-5">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => setFilterLaneCampaignId(null)}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                  filterLaneCampaignId === null
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                }`}
              >
                Todas ({graph.lanes.length})
              </button>
              {graph.lanes.map((lane) => {
                const activeFilter = filterLaneCampaignId === lane.campaignId;
                return (
                  <button
                    key={lane.campaignId}
                    type="button"
                    onClick={() =>
                      setFilterLaneCampaignId(activeFilter ? null : lane.campaignId)
                    }
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                      activeFilter
                        ? 'border-white/40 bg-white/10 text-[var(--text-primary)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: lane.branchColor }}
                    />
                    <span className="max-w-[140px] truncate">{lane.branchName}</span>
                    <span className="font-mono-tech text-[10px] text-[var(--text-muted)]">
                      T{lane.turnCount}
                    </span>
                    {lane.isActive ? (
                      <span className="rounded bg-[var(--accent)]/20 px-1 text-[9px] font-bold uppercase text-[var(--accent)]">
                        Atual
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filtrar cenas, locais..."
                  className="w-40 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] py-1 pr-2.5 pl-8 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)] sm:w-52"
                />
              </div>

              <div className="hidden items-center gap-1 sm:flex">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.65, +(z - 0.15).toFixed(2)))}
                  title="Diminuir zoom"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="font-mono-tech w-10 text-center text-[10px] text-[var(--text-muted)]">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(1.35, +(z + 0.15).toFixed(2)))}
                  title="Aumentar zoom"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  title="Resetar zoom"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Main Content */}
        {tab === 'tree' ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
            {/* Desktop Horizontal Interactive Graph Canvas */}
            <div
              ref={canvasScrollRef}
              onMouseDown={(e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                const el = canvasScrollRef.current;
                if (!el) return;
                dragStateRef.current = {
                  dragging: true,
                  startX: e.clientX,
                  startY: e.clientY,
                  scrollLeft: el.scrollLeft,
                  scrollTop: el.scrollTop,
                };
              }}
              onMouseMove={(e) => {
                if (!dragStateRef.current.dragging) return;
                const el = canvasScrollRef.current;
                if (!el) return;
                el.scrollLeft =
                  dragStateRef.current.scrollLeft -
                  (e.clientX - dragStateRef.current.startX);
                el.scrollTop =
                  dragStateRef.current.scrollTop -
                  (e.clientY - dragStateRef.current.startY);
              }}
              onMouseUp={() => {
                dragStateRef.current.dragging = false;
              }}
              onMouseLeave={() => {
                dragStateRef.current.dragging = false;
              }}
              className="relative hidden flex-1 cursor-grab overflow-auto bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:24px_24px] active:cursor-grabbing sm:block"
            >
              <div
                style={{
                  width: svgWidth * zoom,
                  height: svgHeight * zoom,
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: svgWidth,
                    height: svgHeight,
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                    position: 'relative',
                  }}
                >
                  {/* Lane background ribbons */}
                  {graph.lanes.map((lane) => (
                    <div
                      key={lane.campaignId}
                      style={{
                        top: PAD_Y + lane.laneIndex * LANE_STEP - 18,
                        height: NODE_H + 36,
                        borderColor: `${lane.branchColor}25`,
                      }}
                      className="pointer-events-none absolute right-0 left-0 border-y bg-white/[0.012]"
                    >
                      <span
                        style={{ color: lane.branchColor }}
                        className="sticky left-4 inline-flex items-center gap-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider opacity-75"
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: lane.branchColor }}
                        />
                        {lane.branchName}
                      </span>
                    </div>
                  ))}

                  {/* SVG Edges with smooth cubic Bezier curves */}
                  <svg
                    width={svgWidth}
                    height={svgHeight}
                    className="pointer-events-none absolute inset-0"
                  >
                    {graph.edges.map((edge) => {
                      const from = nodeMap.get(edge.fromId);
                      const to = nodeMap.get(edge.toId);
                      if (!from || !to) return null;
                      if (
                        filterLaneCampaignId &&
                        to.campaignId !== filterLaneCampaignId &&
                        from.campaignId !== filterLaneCampaignId
                      ) {
                        return null;
                      }
                      const p1 = nodeCenter(from);
                      const p2 = nodeCenter(to);
                      const x1 = p1.x + NODE_W;
                      const y1 = p1.y + NODE_H / 2;
                      const x2 = p2.x;
                      const y2 = p2.y + NODE_H / 2;
                      const midX = (x1 + x2) / 2;
                      const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
                      return (
                        <path
                          key={`${edge.fromId}->${edge.toId}`}
                          d={d}
                          fill="none"
                          stroke={edge.color}
                          strokeWidth={edge.isBranchSplit ? 3 : 2.25}
                          strokeDasharray={edge.isBranchSplit ? '6 4' : undefined}
                          strokeOpacity={edge.isBranchSplit ? 0.9 : 0.65}
                        />
                      );
                    })}
                  </svg>

                  {/* Interactive Node Cards */}
                  {visibleNodes.map((node) => {
                    const pos = nodeCenter(node);
                    const meta = NODE_KIND_META[node.kind];
                    const Icon = meta.icon;
                    const isSelected = selectedNode?.id === node.id;
                    const highlighted = matchesSearch(node);

                    return (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => {
                          setSelectedNodeId(node.id);
                          setBranchFormOpen(false);
                        }}
                        style={{
                          left: pos.x,
                          top: pos.y,
                          width: NODE_W,
                          height: NODE_H,
                          borderColor: isSelected
                            ? node.branchColor
                            : node.isCurrentHead
                              ? `${node.branchColor}99`
                              : undefined,
                          boxShadow: isSelected
                            ? `0 0 0 2px ${node.branchColor}55, 0 10px 26px rgba(0,0,0,0.45)`
                            : undefined,
                        }}
                        className={`absolute flex flex-col justify-between rounded-2xl border bg-[var(--bg-surface)]/95 p-2.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--border-strong)] ${
                          isSelected
                            ? ''
                            : 'border-[var(--border-subtle)]'
                        } ${highlighted ? 'opacity-100' : 'opacity-25'}`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${meta.badgeClass}`}
                          >
                            <Icon className="h-2.5 w-2.5" />
                            {meta.label}
                          </span>
                          <span className="font-mono-tech text-[10px] text-[var(--text-muted)]">
                            T{node.turn} · C{node.chapter}
                          </span>
                        </div>

                        <p className="line-clamp-1 text-xs font-semibold text-[var(--text-primary)]">
                          {node.title}
                        </p>

                        <div className="flex items-center justify-between gap-1 text-[10px] text-[var(--text-muted)]">
                          <span className="inline-flex min-w-0 items-center gap-1 truncate">
                            <MapPin className="h-2.5 w-2.5 shrink-0 text-[var(--accent)]" />
                            <span className="truncate">{node.location}</span>
                          </span>
                          {node.isCurrentHead ? (
                            <span
                              style={{ backgroundColor: node.branchColor }}
                              className="h-2 w-2 shrink-0 animate-pulse rounded-full"
                              title="Posição Atual"
                            />
                          ) : node.hasSnapshot ? (
                            <span
                              title="Snapshot exato disponível"
                              className="text-[9px] font-semibold text-[#4ade80]"
                            >
                              ●
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Mobile Vertical Timeline Feed (thumb-friendly, zero horizontal overflow) */}
            <div className="flex-1 overflow-y-auto p-3 sm:hidden">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[11px] font-medium text-[var(--text-muted)]">
                  Toque em qualquer momento para inspecionar ou ramificar
                </span>
                <button
                  type="button"
                  onClick={() => setMarkInputOpen((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#4ade80]/40 bg-[#4ade80]/12 px-2 py-1 text-[10px] font-semibold text-[#4ade80]"
                >
                  <Flag className="h-3 w-3" />
                  Marcar
                </button>
              </div>

              <div className="relative space-y-2 pl-4">
                <div className="pointer-events-none absolute top-2 bottom-2 left-1.5 w-0.5 bg-[var(--border-subtle)]" />
                {[...visibleNodes]
                  .filter(matchesSearch)
                  .reverse()
                  .map((node) => {
                    const meta = NODE_KIND_META[node.kind];
                    const Icon = meta.icon;
                    const isSelected = selectedNode?.id === node.id;
                    return (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => {
                          setSelectedNodeId(node.id);
                          setBranchFormOpen(false);
                        }}
                        style={{
                          borderColor: isSelected ? node.branchColor : undefined,
                        }}
                        className={`relative block w-full rounded-2xl border bg-[var(--bg-surface)] p-3 text-left transition ${
                          isSelected
                            ? 'ring-1 ring-white/20'
                            : 'border-[var(--border-subtle)]'
                        }`}
                      >
                        <span
                          style={{ backgroundColor: node.branchColor }}
                          className="absolute top-4 -left-[14px] h-2.5 w-2.5 rounded-full ring-2 ring-[var(--bg-canvas)]"
                        />
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${meta.badgeClass}`}
                            >
                              <Icon className="h-2.5 w-2.5" />
                              {meta.label}
                            </span>
                            <span
                              style={{ color: node.branchColor }}
                              className="max-w-[115px] truncate text-[10px] font-semibold"
                            >
                              {node.branchName}
                            </span>
                          </div>
                          <span className="font-mono-tech text-[10px] text-[var(--text-muted)]">
                            T{node.turn} · Cap {node.chapter}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs font-semibold text-[var(--text-primary)]">
                          {node.title}
                        </p>
                        {node.choiceSummary ? (
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--text-secondary)]">
                            {node.choiceSummary}
                          </p>
                        ) : null}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Right / Bottom Node Inspector & Branching Panel */}
            <aside className="flex max-h-[44dvh] w-full shrink-0 flex-col overflow-y-auto border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 lg:max-h-none lg:w-[360px] lg:border-t-0 lg:border-l">
              {selectedNode ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      style={{
                        color: selectedNode.branchColor,
                        borderColor: `${selectedNode.branchColor}55`,
                        backgroundColor: `${selectedNode.branchColor}18`,
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: selectedNode.branchColor }}
                      />
                      {selectedNode.branchName}
                    </span>

                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        selectedNode.hasSnapshot
                          ? 'border-[#4ade80]/40 bg-[#4ade80]/12 text-[#4ade80]'
                          : 'border-[var(--warning)]/40 bg-[var(--warning)]/12 text-[var(--warning)]'
                      }`}
                    >
                      {selectedNode.hasSnapshot
                        ? 'Snapshot Exato'
                        : 'Corte Retroativo'}
                    </span>
                  </div>

                  <h3 className="font-display mt-3 text-base font-semibold text-[var(--text-primary)]">
                    {selectedNode.title}
                  </h3>

                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
                    <span className="font-mono-tech">
                      Turno {selectedNode.turn} · Cap. {selectedNode.chapter}
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                      <MapPin className="h-3 w-3 text-[var(--accent)]" />
                      {selectedNode.location}
                    </span>
                  </div>

                  {selectedNode.choiceSummary ? (
                    <div className="mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/70 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Decisão / Momento
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--text-primary)]">
                        {selectedNode.choiceSummary}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/70 px-3 py-2">
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {activeCampaign.ruleset === 'dnd5e_2024' ? 'PV' : 'Vigor'}
                      </span>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                        <Heart className="h-3.5 w-3.5 text-[var(--danger)]" />
                        <span>
                          {selectedNode.maxVigor
                            ? activeCampaign.ruleset === 'dnd5e_2024'
                              ? `${selectedNode.vigor}/${selectedNode.maxVigor} PV`
                              : `${Math.round((selectedNode.vigor / Math.max(1, selectedNode.maxVigor)) * 100)}%`
                            : activeCampaign.ruleset === 'dnd5e_2024'
                              ? `${selectedNode.vigor} PV`
                              : `${selectedNode.vigor}%`}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/70 px-3 py-2">
                      <span className="text-[10px] text-[var(--text-muted)]">
                        Tensão
                      </span>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                        <Zap className="h-3.5 w-3.5 text-[var(--warning)]" />
                        <span>{selectedNode.tension}%</span>
                      </div>
                    </div>
                  </div>

                  {selectedNode.highlights.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Consequências Registradas
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {selectedNode.highlights.map((h, i) => (
                          <span
                            key={i}
                            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-1 text-[11px] text-[var(--text-secondary)]"
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Actions: Switch sibling timeline or Branch "E Se?" */}
                  <div className="mt-4 space-y-2.5 border-t border-[var(--border-subtle)] pt-4">
                    {selectedNode.campaignId !== activeCampaign.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          onSwitchCampaign(selectedNode.campaignId);
                          onClose();
                        }}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--accent)]/50 bg-[var(--accent-soft)] px-3.5 py-2.5 text-xs font-semibold text-[var(--accent)] transition hover:brightness-110"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        <span>Abrir Linha "{selectedNode.branchName}"</span>
                      </button>
                    ) : null}

                    {!branchFormOpen ? (
                      <button
                        type="button"
                        onClick={handleOpenBranchForm}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-3.5 py-2.5 text-xs font-semibold text-[var(--accent-contrast)] shadow-md transition hover:brightness-110"
                      >
                        <GitBranch className="h-4 w-4" />
                        <span>Ramificar daqui ("E Se?")</span>
                      </button>
                    ) : (
                      <div className="rounded-2xl border border-[#a78bfa]/45 bg-[#a78bfa]/8 p-3">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-[#c4b5fd]">
                          <Sparkles className="h-3.5 w-3.5" />
                          Criar Linha Temporal Alternativa
                        </p>
                        <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                          {selectedNode.hasSnapshot
                            ? 'Clona o estado exato deste momento sem alterar sua campanha original.'
                            : 'Cria uma nova campanha com a narrativa cortada até este turno (save original preservado).'}
                        </p>

                        <label className="mt-2.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                          Nome da Linha Alternativa
                        </label>
                        <input
                          type="text"
                          value={branchName}
                          onChange={(e) => setBranchName(e.target.value)}
                          placeholder="Ex.: E se eu aceitasse o acordo?"
                          className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[#a78bfa]"
                        />

                        <div className="mt-2.5 flex items-center gap-1.5">
                          <span className="text-[10px] text-[var(--text-muted)]">
                            Cor:
                          </span>
                          {TIMELINE_BRANCH_COLORS.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setBranchColor(c.hex)}
                              title={c.label}
                              style={{ backgroundColor: c.hex }}
                              className={`h-5 w-5 rounded-full transition ${
                                branchColor === c.hex
                                  ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[var(--bg-surface)]'
                                  : 'opacity-70 hover:opacity-100'
                              }`}
                            />
                          ))}
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isBranching}
                            onClick={() => void handleConfirmBranch()}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#a78bfa] px-3 py-2 text-xs font-semibold text-[#110b22] transition hover:brightness-110 disabled:opacity-50"
                          >
                            <GitBranch className="h-3.5 w-3.5" />
                            <span>
                              {isBranching ? 'Criando...' : 'Criar e Jogar'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setBranchFormOpen(false)}
                            className="rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center text-center text-xs text-[var(--text-muted)]">
                  <History className="mb-2 h-6 w-6 opacity-50" />
                  Selecione um nó na árvore para inspecionar.
                </div>
              )}
            </aside>
          </div>
        ) : (
          /* Saga Analytics Tab */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto max-w-4xl">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    label: 'Linhas Temporais',
                    value: analytics.totalBranches,
                    color: '#a78bfa',
                  },
                  {
                    label: 'Turnos Explorados',
                    value: analytics.totalTurnsExplored,
                    color: '#d4af37',
                  },
                  {
                    label: 'Locais Únicos',
                    value: analytics.uniqueLocationsCount,
                    color: '#4ade80',
                  },
                  {
                    label: 'NPCs Conhecidos',
                    value: analytics.uniqueNpcsCount,
                    color: '#f472b6',
                  },
                  {
                    label: 'Capítulo Máximo',
                    value: analytics.maxChapterReached,
                    color: '#38bdf8',
                  },
                  {
                    label: 'Eventos Resolvidos',
                    value: analytics.worldEventsResolved,
                    color: '#fbbf24',
                  },
                  {
                    label: 'Crises Enfrentadas',
                    value: analytics.crisesFaced,
                    color: '#f87171',
                  },
                  {
                    label: 'Finais Desbloqueados',
                    value: analytics.endingsUnlocked,
                    color: '#c084fc',
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
                  >
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {stat.label}
                    </p>
                    <p
                      style={{ color: stat.color }}
                      className="font-mono-tech mt-1 text-2xl font-bold"
                    >
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Linhas Temporais desta Saga ({graph.lanes.length})
                </h3>
                <div className="mt-3 space-y-2.5">
                  {graph.lanes.map((lane) => (
                    <div
                      key={lane.campaignId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3.5 w-3.5 shrink-0 rounded-full"
                          style={{ backgroundColor: lane.branchColor }}
                        />
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {lane.branchName}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            Turno {lane.turnCount} ·{' '}
                            {lane.status === 'active'
                              ? 'Ativa'
                              : lane.status === 'ended_victory'
                                ? 'Final Concluído'
                                : lane.status === 'ended_fallen'
                                  ? 'Caído'
                                  : 'Em Crise'}
                          </p>
                        </div>
                      </div>

                      {lane.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#4ade80]/40 bg-[#4ade80]/15 px-3 py-1 text-xs font-semibold text-[#4ade80]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Linha Aberta
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onSwitchCampaign(lane.campaignId);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        >
                          <span>Alternar para esta Linha</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
