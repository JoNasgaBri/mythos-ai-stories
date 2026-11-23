import {
  Compass,
  MapPin,
  Navigation,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  LOCATION_KIND_META,
  LOCATION_STATUS_META,
} from '../engine/rpgSystem';
import type { Campaign, LocationRecord } from '../types/game';

interface WorldMapModalProps {
  open: boolean;
  campaign: Campaign;
  onClose: () => void;
  onTravelLocation: (loc: LocationRecord) => void;
}

interface PositionedNode {
  loc: LocationRecord;
  x: number;
  y: number;
  isCurrent: boolean;
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const DANGER_BADGE: Record<
  LocationRecord['danger'],
  { label: string; color: string }
> = {
  safe: { label: 'Seguro', color: 'var(--success)' },
  tense: { label: 'Tenso', color: 'var(--warning)' },
  hostile: { label: 'Hostil', color: 'var(--danger)' },
};

export function WorldMapModal({
  open,
  campaign,
  onClose,
  onTravelLocation,
}: WorldMapModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const nodes = useMemo<PositionedNode[]>(() => {
    const list =
      campaign.codex.locations.length > 0
        ? campaign.codex.locations
        : [
            {
              id: 'loc_current_fallback',
              name: campaign.currentLocation || 'Ponto de Partida',
              description: campaign.world.premise || 'Local atual da crônica.',
              danger: 'tense' as const,
              kind: 'city' as const,
              status: 'explored' as const,
              visitCount: 1,
              firstVisitedTurn: 0,
            },
          ];

    const cx = 400;
    const cy = 225;
    const total = list.length;

    return list.map((loc, index) => {
      const isCurrent =
        loc.name.toLowerCase() === campaign.currentLocation.toLowerCase();
      if (total === 1) {
        return { loc, x: cx, y: cy, isCurrent };
      }

      const ring = index < 6 ? 1 : 2;
      const slotsInRing = ring === 1 ? Math.min(total, 6) : Math.max(1, total - 6);
      const slotIdx = ring === 1 ? index : index - 6;
      const baseAngle =
        (slotIdx / slotsInRing) * Math.PI * 2 - Math.PI / 2 + (ring === 2 ? 0.35 : 0);
      const h = hashString(loc.name);
      const jitterR = ((h % 27) - 13) * 1.4;
      const jitterA = (((h >> 4) % 19) - 9) * 0.015;
      const rx = (ring === 1 ? 195 : 300) + jitterR;
      const ry = (ring === 1 ? 118 : 168) + jitterR * 0.55;

      const x = Math.max(88, Math.min(712, Math.round(cx + Math.cos(baseAngle + jitterA) * rx)));
      const y = Math.max(66, Math.min(384, Math.round(cy + Math.sin(baseAngle + jitterA) * ry)));
      return { loc, x, y, isCurrent };
    });
  }, [campaign.codex.locations, campaign.currentLocation, campaign.world.premise]);

  const selectedNode =
    nodes.find((n) => n.loc.id === selectedId) ??
    nodes.find((n) => n.isCurrent) ??
    nodes[0];

  if (!open) return null;

  const strongholdLoc = campaign.stronghold?.location?.toLowerCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-label="Mapa Visual do Mundo"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-[var(--shadow-elevated)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--accent)]">
              <Compass className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold tracking-wide text-[var(--text-primary)]">
                Mapa & Atlas · {campaign.world.title}
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                {nodes.length} {nodes.length === 1 ? 'local descoberto' : 'locais descobertos'} · Clique em um ponto para inspecionar ou viajar
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border-subtle)] p-1.5 text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Interactive SVG Canvas */}
        <div className="relative flex-1 overflow-hidden bg-[var(--bg-canvas)]">
          <svg
            viewBox="0 0 800 450"
            className="h-[340px] w-full sm:h-[410px]"
            role="img"
            aria-label="Mapa interativo dos locais descobertos"
          >
            <defs>
              <radialGradient id="mapBgGlow" cx="50%" cy="50%" r="55%">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.14" />
                <stop offset="100%" stopColor="var(--bg-canvas)" stopOpacity="0" />
              </radialGradient>
              <pattern
                id="mapGrid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="var(--border-subtle)"
                  strokeWidth="0.6"
                  strokeOpacity="0.45"
                />
              </pattern>
            </defs>

            <rect width="800" height="450" fill="url(#mapGrid)" />
            <rect width="800" height="450" fill="url(#mapBgGlow)" />

            {/* Compass Rose Accent */}
            <g opacity="0.18" transform="translate(725, 68)">
              <circle r="28" fill="none" stroke="var(--accent)" strokeWidth="1" />
              <path d="M0,-32 L5,-6 L0,0 L-5,-6 Z" fill="var(--accent)" />
              <path d="M0,32 L5,6 L0,0 L-5,6 Z" fill="var(--text-muted)" />
              <path d="M-32,0 L-6,-5 L0,0 L-6,5 Z" fill="var(--text-muted)" />
              <path d="M32,0 L6,-5 L0,0 L6,5 Z" fill="var(--text-muted)" />
            </g>

            {/* Route Edges connecting discovered locations in chronological discovery order */}
            {nodes.map((node, i) => {
              if (i === 0) return null;
              const prev = nodes[i - 1];
              const highlightRoute = node.isCurrent || prev.isCurrent;
              return (
                <line
                  key={`edge_${prev.loc.id}_${node.loc.id}`}
                  x1={prev.x}
                  y1={prev.y}
                  x2={node.x}
                  y2={node.y}
                  stroke={highlightRoute ? 'var(--accent)' : 'var(--border-strong)'}
                  strokeWidth={highlightRoute ? '2' : '1.4'}
                  strokeDasharray={node.loc.kind === 'secret' ? '3 5' : '6 5'}
                  strokeOpacity={highlightRoute ? '0.85' : '0.5'}
                />
              );
            })}

            {/* Location Nodes */}
            {nodes.map((node) => {
              const kind = node.loc.kind ?? 'city';
              const kindMeta = LOCATION_KIND_META[kind];
              const isSelected = selectedNode?.loc.id === node.loc.id;
              const isStronghold =
                Boolean(strongholdLoc) &&
                node.loc.name.toLowerCase() === strongholdLoc;

              return (
                <g
                  key={node.loc.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => setSelectedId(node.loc.id)}
                  className="cursor-pointer"
                >
                  {node.isCurrent ? (
                    <circle
                      r="22"
                      fill="var(--accent)"
                      fillOpacity="0.16"
                      stroke="var(--accent)"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />
                  ) : null}

                  {isSelected ? (
                    <circle
                      r="17"
                      fill="none"
                      stroke="var(--text-primary)"
                      strokeWidth="1.8"
                      strokeOpacity="0.8"
                    />
                  ) : null}

                  <circle
                    r={kind === 'dungeon' ? 12 : 10}
                    fill="var(--bg-surface)"
                    stroke={node.isCurrent ? 'var(--accent)' : kindMeta.color}
                    strokeWidth={node.isCurrent ? '3' : '2.2'}
                  />

                  <circle
                    r="4"
                    fill={node.isCurrent ? 'var(--accent)' : kindMeta.color}
                  />

                  {/* Label Pill */}
                  <g transform="translate(0, 24)">
                    <rect
                      x="-64"
                      y="-10"
                      width="128"
                      height="20"
                      rx="6"
                      fill="var(--bg-surface)"
                      fillOpacity="0.92"
                      stroke={
                        node.isCurrent
                          ? 'var(--accent)'
                          : isSelected
                            ? 'var(--border-strong)'
                            : 'var(--border-subtle)'
                      }
                      strokeWidth="1"
                    />
                    <text
                      textAnchor="middle"
                      y="3"
                      fill="var(--text-primary)"
                      fontSize="10"
                      fontWeight={node.isCurrent ? '700' : '500'}
                    >
                      {node.loc.name.length > 18
                        ? `${node.loc.name.slice(0, 17)}…`
                        : node.loc.name}
                    </text>
                  </g>

                  {isStronghold ? (
                    <text
                      textAnchor="middle"
                      y="-15"
                      fill="var(--success)"
                      fontSize="9"
                      fontWeight="700"
                    >
                      ★ REFÚGIO
                    </text>
                  ) : node.loc.status === 'cleared' ? (
                    <text
                      textAnchor="middle"
                      y="-15"
                      fill="var(--success)"
                      fontSize="9"
                      fontWeight="700"
                    >
                      ✓ LIMPO
                    </text>
                  ) : kind === 'dungeon' ? (
                    <text
                      textAnchor="middle"
                      y="-15"
                      fill="#c084fc"
                      fontSize="9"
                      fontWeight="700"
                    >
                      DUNGEON
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>

          {/* Compact Legend */}
          <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-1.5">
            {(['city', 'safehouse', 'market', 'dungeon', 'secret', 'wilderness'] as const).map(
              (k) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]/85 px-2 py-0.5 text-[10px] text-[var(--text-secondary)] backdrop-blur-sm"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: LOCATION_KIND_META[k].color }}
                  />
                  {LOCATION_KIND_META[k].label}
                </span>
              ),
            )}
          </div>
        </div>

        {/* Selected Node Details Bar */}
        {selectedNode ? (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-5 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <MapPin className="h-4 w-4 text-[var(--accent)]" />
                <span className="font-display text-sm font-semibold text-[var(--text-primary)]">
                  {selectedNode.loc.name}
                </span>
                {selectedNode.isCurrent ? (
                  <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                    Você está aqui
                  </span>
                ) : null}
                <span
                  className="rounded-md bg-[var(--bg-surface)] px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    color:
                      LOCATION_KIND_META[selectedNode.loc.kind ?? 'city'].color,
                  }}
                >
                  {LOCATION_KIND_META[selectedNode.loc.kind ?? 'city'].label}
                </span>
                <span
                  className="rounded-md bg-[var(--bg-surface)] px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    color:
                      LOCATION_STATUS_META[selectedNode.loc.status ?? 'explored']
                        .color,
                  }}
                >
                  {
                    LOCATION_STATUS_META[selectedNode.loc.status ?? 'explored']
                      .label
                  }
                </span>
                <span
                  className="rounded-md bg-[var(--bg-surface)] px-2 py-0.5 text-[10px] font-medium"
                  style={{ color: DANGER_BADGE[selectedNode.loc.danger].color }}
                >
                  {DANGER_BADGE[selectedNode.loc.danger].label}
                </span>
                {selectedNode.loc.recommendedLevel ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[var(--bg-surface)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                    <Sparkles className="h-2.5 w-2.5 text-[var(--accent)]" />
                    Nv.{selectedNode.loc.recommendedLevel}+
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                {selectedNode.loc.description ||
                  'Território registrado na sua crônica.'}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {campaign.stronghold &&
              selectedNode.loc.name.toLowerCase() === strongholdLoc ? (
                <span className="inline-flex items-center gap-1 rounded-xl border border-[var(--success)]/35 bg-[var(--success)]/10 px-3 py-2 text-xs font-medium text-[var(--success)]">
                  <Shield className="h-3.5 w-3.5" />
                  Defesa {campaign.stronghold.defense}
                </span>
              ) : null}

              {!selectedNode.isCurrent ? (
                <button
                  type="button"
                  onClick={() => {
                    onTravelLocation(selectedNode.loc);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[#111] shadow transition hover:brightness-110"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  <span>Viajar até aqui</span>
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
