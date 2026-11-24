import {
  Crosshair,
  Maximize2,
  Minus,
  Network,
  Plus,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LOCATION_KIND_META } from '../engine/rpgSystem';
import type { LocationRecord } from '../types/game';

interface ObsidianGraphMapProps {
  locations: LocationRecord[];
  currentLocation: string;
  strongholdLocation?: string;
  selectedId: string | null;
  onSelectLocation: (id: string) => void;
}

interface GraphNode {
  id: string;
  type: 'region' | 'location';
  label: string;
  region: string;
  loc?: LocationRecord;
  isCurrent: boolean;
  isStronghold: boolean;
  x: number;
  y: number;
  radius: number;
  color: string;
}

interface GraphEdge {
  source: string;
  target: string;
  kind: 'cluster' | 'route';
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function inferRegion(loc: LocationRecord): string {
  if (loc.region?.trim()) return loc.region.trim();

  const commaParts = loc.name.split(',');
  if (commaParts.length >= 2) {
    const tail = commaParts[commaParts.length - 1].trim();
    if (tail.length >= 3 && tail.length <= 32) return tail;
  }

  const lower = loc.name.toLowerCase();
  if (lower.includes('redland') || lower.includes('chácara') || lower.includes('galpão') || lower.includes('pátio')) {
    return 'Redland';
  }
  if (lower.includes('brickell')) return 'Brickell';
  if (lower.includes('krome')) return 'Krome Avenue';
  if (lower.includes('homestead')) return 'Homestead';
  if (lower.includes('miami')) return 'Miami';

  return 'Região Principal';
}

export function ObsidianGraphMap({
  locations,
  currentLocation,
  strongholdLocation,
  selectedId,
  onSelectLocation,
}: ObsidianGraphMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState({ width: 960, height: 540 });
  const [zoom, setZoom] = useState(0.92);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [customOffsets, setCustomOffsets] = useState<Record<string, { x: number; y: number }>>({});

  const interactionRef = useRef<{
    mode: 'idle' | 'pan' | 'drag-node';
    nodeId?: string;
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
    startNodeX: number;
    startNodeY: number;
    moved: boolean;
  }>({
    mode: 'idle',
    startClientX: 0,
    startClientY: 0,
    startPanX: 0,
    startPanY: 0,
    startNodeX: 0,
    startNodeY: 0,
    moved: false,
  });

  // Track container dimensions for crisp centered projection
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      setViewport({
        width: Math.max(320, el.clientWidth),
        height: Math.max(280, el.clientHeight),
      });
    };
    updateSize();
    const obs = new ResizeObserver(updateSize);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Build deterministic Obsidian Force-Directed Graph
  const { nodes, edges, adjacency, regionCount } = useMemo(() => {
    const currentLower = currentLocation.toLowerCase();
    const strongholdLower = strongholdLocation?.toLowerCase();

    const byRegion = new Map<string, LocationRecord[]>();
    for (const loc of locations) {
      const reg = inferRegion(loc);
      const list = byRegion.get(reg) ?? [];
      list.push(loc);
      byRegion.set(reg, list);
    }

    const regionKeys = Array.from(byRegion.keys());
    const graphNodes: GraphNode[] = [];
    const graphEdges: GraphEdge[] = [];
    const nodeIndex = new Map<string, number>();

    // Create region hub nodes when a region has >= 2 locations (or > 1 region total)
    const createHubs = regionKeys.length > 1 || locations.length >= 6;
    const hubRadius = Math.max(170, Math.min(340, 120 + regionKeys.length * 36));

    regionKeys.forEach((reg, idx) => {
      const angle = (idx / Math.max(1, regionKeys.length)) * Math.PI * 2 - Math.PI / 2;
      const hx = regionKeys.length === 1 ? 0 : Math.cos(angle) * hubRadius;
      const hy = regionKeys.length === 1 ? 0 : Math.sin(angle) * hubRadius * 0.8;
      const hubId = `hub::${reg}`;

      if (createHubs) {
        nodeIndex.set(hubId, graphNodes.length);
        graphNodes.push({
          id: hubId,
          type: 'region',
          label: reg,
          region: reg,
          isCurrent: false,
          isStronghold: false,
          x: hx,
          y: hy,
          radius: 11,
          color: 'var(--accent)',
        });
      }

      const locs = byRegion.get(reg) ?? [];
      locs.forEach((loc, i) => {
        const h = hashString(loc.id || loc.name);
        const r = 68 + Math.sqrt(i + 1) * 34;
        const theta = i * 2.399963229728653 + (h % 100) * 0.01;
        const kind = loc.kind ?? 'city';
        const isCurrent = loc.name.toLowerCase() === currentLower;
        const isStronghold =
          Boolean(strongholdLower) && loc.name.toLowerCase() === strongholdLower;

        nodeIndex.set(loc.id, graphNodes.length);
        graphNodes.push({
          id: loc.id,
          type: 'location',
          label: loc.name,
          region: reg,
          loc,
          isCurrent,
          isStronghold,
          x: hx + Math.cos(theta) * r,
          y: hy + Math.sin(theta) * r,
          radius: isCurrent ? 9.5 : isStronghold ? 8.5 : 6.2,
          color: isCurrent ? 'var(--accent)' : LOCATION_KIND_META[kind].color,
        });

        if (createHubs) {
          graphEdges.push({
            source: hubId,
            target: loc.id,
            kind: 'cluster',
          });
        }
      });
    });

    // Connect region hubs in a clean ring / backbone so graph stays unified
    if (createHubs && regionKeys.length > 1) {
      for (let i = 0; i < regionKeys.length; i++) {
        const a = `hub::${regionKeys[i]}`;
        const b = `hub::${regionKeys[(i + 1) % regionKeys.length]}`;
        graphEdges.push({ source: a, target: b, kind: 'route' });
      }
    }

    // Add sparse chronological route links between consecutive visits in DIFFERENT regions
    const chronological = [...locations].sort(
      (a, b) => (a.firstVisitedTurn ?? 0) - (b.firstVisitedTurn ?? 0),
    );
    for (let i = 1; i < chronological.length; i++) {
      const prev = chronological[i - 1];
      const curr = chronological[i];
      if (!createHubs || inferRegion(prev) !== inferRegion(curr)) {
        graphEdges.push({
          source: prev.id,
          target: curr.id,
          kind: 'route',
        });
      }
    }

    // Fast Force-Directed Relaxation (repulsion + spring + gentle gravity)
    const n = graphNodes.length;
    const vx = new Float64Array(n);
    const vy = new Float64Array(n);
    const iterations = n > 120 ? 75 : 125;
    const repulsion = n > 80 ? 2900 : 3800;

    for (let iter = 0; iter < iterations; iter++) {
      const cooling = 1 - iter / iterations;

      // Pairwise Coulomb repulsion
      for (let i = 0; i < n; i++) {
        const a = graphNodes[i];
        for (let j = i + 1; j < n; j++) {
          const b = graphNodes[j];
          const dx = b.x - a.x || 0.01;
          const dy = b.y - a.y || 0.01;
          const distSq = dx * dx + dy * dy + 22;
          if (distSq > 260000) continue;
          const dist = Math.sqrt(distSq);
          const hubMult = a.type === 'region' && b.type === 'region' ? 2.4 : 1;
          const force = (repulsion * hubMult) / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          vx[i] -= fx;
          vy[i] -= fy;
          vx[j] += fx;
          vy[j] += fy;
        }
      }

      // Hooke spring attraction along edges
      for (const edge of graphEdges) {
        const si = nodeIndex.get(edge.source);
        const ti = nodeIndex.get(edge.target);
        if (si === undefined || ti === undefined) continue;
        const a = graphNodes[si];
        const b = graphNodes[ti];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetDist = edge.kind === 'cluster' ? 88 : 195;
        const k = edge.kind === 'cluster' ? 0.055 : 0.016;
        const force = (dist - targetDist) * k;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        vx[si] += fx;
        vy[si] += fy;
        vx[ti] -= fx;
        vy[ti] -= fy;
      }

      // Gentle gravity toward origin + velocity integration
      for (let i = 0; i < n; i++) {
        const node = graphNodes[i];
        vx[i] = (vx[i] - node.x * 0.008) * 0.72;
        vy[i] = (vy[i] - node.y * 0.008) * 0.72;
        const maxStep = 24 * cooling + 2;
        const speed = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
        if (speed > maxStep) {
          vx[i] = (vx[i] / speed) * maxStep;
          vy[i] = (vy[i] / speed) * maxStep;
        }
        node.x += vx[i];
        node.y += vy[i];
      }
    }

    // Build adjacency map for instant Obsidian neighbor spotlight
    const adj = new Map<string, Set<string>>();
    for (const node of graphNodes) {
      adj.set(node.id, new Set([node.id]));
    }
    for (const edge of graphEdges) {
      adj.get(edge.source)?.add(edge.target);
      adj.get(edge.target)?.add(edge.source);
    }

    return {
      nodes: graphNodes,
      edges: graphEdges,
      adjacency: adj,
      regionCount: regionKeys.length,
    };
  }, [locations, currentLocation, strongholdLocation]);

  // Resolved positions applying any user node drag offsets
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const node of nodes) {
      const off = customOffsets[node.id];
      map.set(
        node.id,
        off ? { ...node, x: node.x + off.x, y: node.y + off.y } : node,
      );
    }
    return map;
  }, [nodes, customOffsets]);

  const activeFocusId = hoveredId ?? selectedId;
  const highlightedSet = activeFocusId ? adjacency.get(activeFocusId) : null;

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    const nextZoom = Math.max(0.28, Math.min(3.2, Number((zoom * factor).toFixed(3))));
    const ratio = nextZoom / zoom;

    // Zoom smoothly toward mouse cursor
    const cx = e.clientX - rect.left - rect.width / 2;
    const cy = e.clientY - rect.top - rect.height / 2;
    setPan((prev) => ({
      x: cx - (cx - prev.x) * ratio,
      y: cy - (cy - prev.y) * ratio,
    }));
    setZoom(nextZoom);
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    interactionRef.current = {
      mode: 'pan',
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
      startNodeX: 0,
      startNodeY: 0,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleNodePointerDown = (
    e: React.PointerEvent<SVGGElement>,
    node: GraphNode,
  ) => {
    e.stopPropagation();
    const existing = customOffsets[node.id] ?? { x: 0, y: 0 };
    interactionRef.current = {
      mode: 'drag-node',
      nodeId: node.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
      startNodeX: existing.x,
      startNodeY: existing.y,
      moved: false,
    };
    containerRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = interactionRef.current;
    if (st.mode === 'idle') return;
    const dx = e.clientX - st.startClientX;
    const dy = e.clientY - st.startClientY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      st.moved = true;
    }

    if (st.mode === 'pan') {
      setPan({ x: st.startPanX + dx, y: st.startPanY + dy });
    } else if (st.mode === 'drag-node' && st.nodeId) {
      const targetId = st.nodeId;
      setCustomOffsets((prev) => ({
        ...prev,
        [targetId]: {
          x: st.startNodeX + dx / zoom,
          y: st.startNodeY + dy / zoom,
        },
      }));
    }
  };

  const handlePointerUp = () => {
    interactionRef.current.mode = 'idle';
  };

  const handleResetView = () => {
    setZoom(0.9);
    setPan({ x: 0, y: 0 });
  };

  const handleFocusCurrent = () => {
    const cur = Array.from(nodeMap.values()).find((n) => n.isCurrent);
    if (!cur) return;
    const nextZoom = 1.45;
    setZoom(nextZoom);
    setPan({ x: -cur.x * nextZoom, y: -cur.y * nextZoom });
  };

  const cx = viewport.width / 2 + pan.x;
  const cy = viewport.height / 2 + pan.y;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-[#090c0a] select-none cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Subtle Obsidian Dot-Matrix Backdrop */}
      <svg className="h-full w-full">
        <defs>
          <pattern
            id="obsidianDots"
            width={28 * zoom}
            height={28 * zoom}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${cx % (28 * zoom)}, ${cy % (28 * zoom)})`}
          >
            <circle cx="1.5" cy="1.5" r="1" fill="rgba(255,255,255,0.06)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#obsidianDots)" />

        <g transform={`translate(${cx}, ${cy}) scale(${zoom})`}>
          {/* Graph Edges */}
          {edges.map((edge, i) => {
            const a = nodeMap.get(edge.source);
            const b = nodeMap.get(edge.target);
            if (!a || !b) return null;

            const isHighlighted =
              !highlightedSet ||
              (highlightedSet.has(edge.source) && highlightedSet.has(edge.target));

            const isDirect =
              activeFocusId === edge.source || activeFocusId === edge.target;

            return (
              <line
                key={`e_${i}_${edge.source}_${edge.target}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={
                  isDirect
                    ? 'var(--accent)'
                    : edge.kind === 'route'
                      ? 'rgba(163, 230, 53, 0.32)'
                      : 'rgba(255, 255, 255, 0.16)'
                }
                strokeWidth={(isDirect ? 2 : edge.kind === 'route' ? 1.3 : 1) / Math.sqrt(zoom)}
                strokeDasharray={edge.kind === 'route' ? '5 5' : undefined}
                strokeOpacity={isHighlighted ? (isDirect ? 0.92 : 0.6) : 0.08}
                style={{ transition: 'stroke-opacity 180ms ease' }}
              />
            );
          })}

          {/* Graph Nodes */}
          {Array.from(nodeMap.values()).map((node) => {
            const isSelected = node.id === selectedId;
            const isHovered = node.id === hoveredId;
            const isLit = !highlightedSet || highlightedSet.has(node.id);
            const isHub = node.type === 'region';

            const showLabel =
              isHub ||
              node.isCurrent ||
              node.isStronghold ||
              isSelected ||
              isHovered ||
              (highlightedSet && highlightedSet.has(node.id) && zoom >= 0.75) ||
              zoom >= 1.25 ||
              nodes.length <= 18;

            const fontSize = Math.max(8, (isHub ? 11.5 : 10) / Math.pow(zoom, 0.45));

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                opacity={isLit ? 1 : 0.16}
                className="cursor-pointer"
                style={{ transition: 'opacity 180ms ease' }}
                onPointerDown={(e) => handleNodePointerDown(e, node)}
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!interactionRef.current.moved && node.loc) {
                    onSelectLocation(node.loc.id);
                  }
                }}
              >
                {node.isCurrent ? (
                  <circle
                    r={node.radius + 9}
                    fill="var(--accent)"
                    fillOpacity="0.14"
                    stroke="var(--accent)"
                    strokeWidth={1.5 / Math.sqrt(zoom)}
                    strokeDasharray="4 3"
                  />
                ) : null}

                {isSelected || isHovered ? (
                  <circle
                    r={node.radius + 5.5}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={1.6 / Math.sqrt(zoom)}
                    strokeOpacity="0.85"
                  />
                ) : null}

                {isHub ? (
                  <>
                    <circle
                      r={node.radius + 4}
                      fill="var(--accent)"
                      fillOpacity="0.1"
                    />
                    <circle
                      r={node.radius}
                      fill="var(--bg-surface)"
                      stroke="var(--accent)"
                      strokeWidth={2 / Math.sqrt(zoom)}
                    />
                    <circle r={4} fill="var(--accent)" />
                  </>
                ) : (
                  <>
                    <circle
                      r={node.radius}
                      fill={node.color}
                      stroke="rgba(9,12,10,0.9)"
                      strokeWidth={1.6 / Math.sqrt(zoom)}
                    />
                    {node.isStronghold ? (
                      <text
                        y={-node.radius - 5}
                        textAnchor="middle"
                        fill="var(--success)"
                        fontSize={10 / Math.pow(zoom, 0.35)}
                        fontWeight="700"
                      >
                        ★
                      </text>
                    ) : null}
                  </>
                )}

                {showLabel ? (
                  <text
                    y={node.radius + fontSize + 3}
                    textAnchor="middle"
                    fill={
                      isHub
                        ? 'var(--accent)'
                        : node.isCurrent || isSelected || isHovered
                          ? '#ffffff'
                          : 'rgba(226,232,240,0.84)'
                    }
                    fontSize={fontSize}
                    fontWeight={isHub || node.isCurrent || isSelected ? '700' : '500'}
                    style={{
                      pointerEvents: 'none',
                      paintOrder: 'stroke',
                      stroke: 'rgba(9,12,10,0.92)',
                      strokeWidth: 3.5 / Math.sqrt(zoom),
                      strokeLinejoin: 'round',
                    }}
                  >
                    {node.label.length > 26
                      ? `${node.label.slice(0, 25)}…`
                      : node.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Top-Left Obsidian Graph Telemetry */}
      <div className="pointer-events-none absolute top-3 left-3 z-20 flex items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 px-3 py-1.5 text-[11px] font-medium text-[var(--text-primary)] shadow-lg backdrop-blur-md">
          <Network className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span>Grafo Obsidian</span>
          <span className="rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
            {locations.length} nós · {regionCount} regiões
          </span>
        </div>
      </div>

      {/* Bottom-Right Controls */}
      <div className="absolute right-3 bottom-3 z-20 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleFocusCurrent}
          title="Focar na sua localização atual"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/92 text-[var(--accent)] shadow-lg backdrop-blur-md transition hover:bg-[var(--bg-elevated)]"
        >
          <Crosshair className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleResetView}
          title="Centralizar grafo"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/92 text-[var(--text-secondary)] shadow-lg backdrop-blur-md transition hover:text-[var(--text-primary)]"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/92 shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3.2, Number((z * 1.22).toFixed(2))))}
            title="Aproximar"
            className="flex h-8 w-9 items-center justify-center border-b border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.28, Number((z / 1.22).toFixed(2))))}
            title="Afastar"
            className="flex h-8 w-9 items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Interactive Hint */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 px-2.5 py-1 text-[10px] text-[var(--text-muted)] backdrop-blur-sm">
        Arraste nós ou fundo · Passe o mouse para focar conexões · Zoom {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
