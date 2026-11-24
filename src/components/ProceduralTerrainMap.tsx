import {
  Crosshair,
  Image as ImageIcon,
  Loader2,
  Map as MapIcon,
  Maximize2,
  Minus,
  Plus,
  Sparkles,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LOCATION_KIND_META } from '../engine/rpgSystem';
import type { LocationRecord, WorldThemeId } from '../types/game';

interface ProceduralTerrainMapProps {
  seedKey: string;
  theme: WorldThemeId;
  worldTitle: string;
  locations: LocationRecord[];
  currentLocation: string;
  strongholdLocation?: string;
  selectedId: string | null;
  customArtMapUrl?: string;
  isGeneratingArt: boolean;
  onSelectLocation: (id: string) => void;
  onGenerateArt: () => void;
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function valueNoise2D(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const fade = (t: number) => t * t * (3 - 2 * t);
  const hash = (ix: number, iy: number) => {
    let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
    n = (n ^ (n >>> 13)) * 1274126177;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };

  const u = fade(xf);
  const v = fade(yf);
  const n00 = hash(xi, yi);
  const n10 = hash(xi + 1, yi);
  const n01 = hash(xi, yi + 1);
  const n11 = hash(xi + 1, yi + 1);

  const nx0 = n00 + u * (n10 - n00);
  const nx1 = n01 + u * (n11 - n01);
  return nx0 + v * (nx1 - nx0);
}

function fbm(x: number, y: number, seed: number): number {
  let total = 0;
  let amp = 0.52;
  let freq = 1;
  let maxVal = 0;
  for (let o = 0; o < 4; o++) {
    total += valueNoise2D(x * freq, y * freq, seed + o * 79) * amp;
    maxVal += amp;
    amp *= 0.5;
    freq *= 2.05;
  }
  return total / maxVal;
}

interface TerrainPalette {
  deepWater: [number, number, number];
  shallowWater: [number, number, number];
  coast: [number, number, number];
  lowland: [number, number, number];
  highland: [number, number, number];
  peak: [number, number, number];
  contour: string;
}

const TERRAIN_PALETTES: Record<WorldThemeId, TerrainPalette> = {
  fantasy: {
    deepWater: [14, 21, 28],
    shallowWater: [22, 36, 44],
    coast: [58, 52, 39],
    lowland: [36, 46, 36],
    highland: [55, 52, 42],
    peak: [88, 82, 68],
    contour: 'rgba(214, 179, 106, 0.22)',
  },
  cyberpunk: {
    deepWater: [8, 12, 24],
    shallowWater: [15, 25, 48],
    coast: [26, 40, 68],
    lowland: [19, 24, 38],
    highland: [34, 26, 56],
    peak: [64, 38, 92],
    contour: 'rgba(34, 211, 238, 0.22)',
  },
  zombies: {
    deepWater: [12, 18, 17],
    shallowWater: [20, 31, 28],
    coast: [44, 48, 38],
    lowland: [28, 37, 27],
    highland: [45, 50, 36],
    peak: [70, 72, 54],
    contour: 'rgba(163, 230, 53, 0.18)',
  },
  apocalyptic: {
    deepWater: [18, 16, 15],
    shallowWater: [32, 27, 22],
    coast: [64, 50, 36],
    lowland: [46, 37, 28],
    highland: [68, 51, 36],
    peak: [96, 73, 52],
    contour: 'rgba(245, 158, 11, 0.2)',
  },
  mystery: {
    deepWater: [14, 16, 22],
    shallowWater: [23, 27, 36],
    coast: [46, 44, 42],
    lowland: [30, 32, 38],
    highland: [46, 45, 52],
    peak: [72, 68, 76],
    contour: 'rgba(196, 181, 253, 0.18)',
  },
};

function lerpColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  const c = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * c),
    Math.round(a[1] + (b[1] - a[1]) * c),
    Math.round(a[2] + (b[2] - a[2]) * c),
  ];
}

function inferRegionName(loc: LocationRecord): string {
  if (loc.region?.trim()) return loc.region.trim();
  const commaParts = loc.name.split(',');
  if (commaParts.length >= 2) {
    return commaParts[commaParts.length - 1].trim();
  }
  return 'Terras Centrais';
}

const WORLD_W = 1000;
const WORLD_H = 562;

export function ProceduralTerrainMap({
  seedKey,
  theme,
  worldTitle,
  locations,
  currentLocation,
  strongholdLocation,
  selectedId,
  customArtMapUrl,
  isGeneratingArt,
  onSelectLocation,
  onGenerateArt,
}: ProceduralTerrainMapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [useAiArt, setUseAiArt] = useState(Boolean(customArtMapUrl));
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origPanX: number;
    origPanY: number;
    moved: boolean;
  }>({ active: false, startX: 0, startY: 0, origPanX: 0, origPanY: 0, moved: false });

  useEffect(() => {
    if (customArtMapUrl) setUseAiArt(true);
  }, [customArtMapUrl]);

  const numericSeed = useMemo(() => hashString(`${seedKey}:${theme}`), [seedKey, theme]);

  // Render procedural topographical landmass to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 320;
    const h = 180;
    canvas.width = w;
    canvas.height = h;
    const img = ctx.createImageData(w, h);
    const palette = TERRAIN_PALETTES[theme] ?? TERRAIN_PALETTES.fantasy;

    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const nx = px / w;
        const ny = py / h;

        // Island / continent vignette falloff so oceans naturally frame the edges
        const dx = (nx - 0.5) * 1.9;
        const dy = (ny - 0.5) * 2.05;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const raw = fbm(nx * 4.4, ny * 3.1, numericSeed);
        const elev = raw - Math.pow(dist, 1.85) * 0.42 + 0.12;

        let rgb: [number, number, number];
        if (elev < 0.31) {
          rgb = lerpColor(palette.deepWater, palette.shallowWater, elev / 0.31);
        } else if (elev < 0.39) {
          rgb = lerpColor(palette.shallowWater, palette.coast, (elev - 0.31) / 0.08);
        } else if (elev < 0.56) {
          rgb = lerpColor(palette.coast, palette.lowland, (elev - 0.39) / 0.17);
        } else if (elev < 0.72) {
          rgb = lerpColor(palette.lowland, palette.highland, (elev - 0.56) / 0.16);
        } else {
          rgb = lerpColor(palette.highland, palette.peak, (elev - 0.72) / 0.25);
        }

        // Subtle topographic contour rings on land
        const contourBand = Math.abs(((elev * 14) % 1) - 0.5);
        if (elev > 0.37 && contourBand < 0.032) {
          rgb = [
            Math.min(255, rgb[0] + 18),
            Math.min(255, rgb[1] + 18),
            Math.min(255, rgb[2] + 16),
          ];
        }

        const idx = (py * w + px) * 4;
        img.data[idx] = rgb[0];
        img.data[idx + 1] = rgb[1];
        img.data[idx + 2] = rgb[2];
        img.data[idx + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
  }, [numericSeed, theme]);

  // Deterministically place locations grouped by region on habitable land zones
  const positioned = useMemo(() => {
    const regions = new Map<string, LocationRecord[]>();
    for (const loc of locations) {
      const reg = inferRegionName(loc);
      const list = regions.get(reg) ?? [];
      list.push(loc);
      regions.set(reg, list);
    }

    const regionNames = Array.from(regions.keys());
    const regionCenters = new Map<string, { x: number; y: number }>();

    regionNames.forEach((reg, idx) => {
      if (regionNames.length === 1) {
        regionCenters.set(reg, { x: WORLD_W / 2, y: WORLD_H / 2 });
        return;
      }
      const h = hashString(`${seedKey}:${reg}`);
      const angle = (idx / regionNames.length) * Math.PI * 2 - Math.PI / 2 + ((h % 19) - 9) * 0.03;
      const rx = 255 + ((h >> 3) % 70) - 35;
      const ry = 148 + ((h >> 6) % 45) - 22;
      regionCenters.set(reg, {
        x: Math.max(135, Math.min(WORLD_W - 135, WORLD_W / 2 + Math.cos(angle) * rx)),
        y: Math.max(95, Math.min(WORLD_H - 95, WORLD_H / 2 + Math.sin(angle) * ry)),
      });
    });

    const out: Array<{
      loc: LocationRecord;
      region: string;
      x: number;
      y: number;
      isCurrent: boolean;
    }> = [];

    const currentLower = currentLocation.toLowerCase();
    for (const [reg, locs] of regions.entries()) {
      const center = regionCenters.get(reg) ?? { x: WORLD_W / 2, y: WORLD_H / 2 };
      locs.forEach((loc, i) => {
        const radius = i === 0 ? 0 : 28 + Math.sqrt(i) * 26;
        const theta = i * 2.399963229728653 + (hashString(loc.id) % 10) * 0.1;
        const x = Math.max(68, Math.min(WORLD_W - 68, center.x + Math.cos(theta) * radius));
        const y = Math.max(58, Math.min(WORLD_H - 58, center.y + Math.sin(theta) * radius * 0.78));
        out.push({
          loc,
          region: reg,
          x,
          y,
          isCurrent: loc.name.toLowerCase() === currentLower,
        });
      });
    }

    return { nodes: out, regionCenters };
  }, [locations, currentLocation, seedKey]);

  const strongholdLower = strongholdLocation?.toLowerCase();

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom((z) => Math.max(0.65, Math.min(3.2, Number((z * factor).toFixed(3)))));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origPanX: pan.x,
      origPanY: pan.y,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.active) return;
    const dx = e.clientX - dragStateRef.current.startX;
    const dy = e.clientY - dragStateRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragStateRef.current.moved = true;
    }
    setPan({
      x: dragStateRef.current.origPanX + dx,
      y: dragStateRef.current.origPanY + dy,
    });
  };

  const handlePointerUp = () => {
    dragStateRef.current.active = false;
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleFocusCurrent = () => {
    const cur = positioned.nodes.find((n) => n.isCurrent) ?? positioned.nodes[0];
    if (!cur) return;
    const nextZoom = 1.65;
    setZoom(nextZoom);
    setPan({
      x: (WORLD_W / 2 - cur.x) * nextZoom * 0.75,
      y: (WORLD_H / 2 - cur.y) * nextZoom * 0.75,
    });
  };

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-[#0a0d0b] select-none cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Interactive Pan/Zoom Stage */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: dragStateRef.current.active ? 'none' : 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div className="relative aspect-[16/9] w-full max-w-[1000px]">
          {/* Base Terrain Canvas */}
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 h-full w-full rounded-xl object-cover transition-opacity duration-500 ${
              useAiArt && customArtMapUrl ? 'opacity-20' : 'opacity-100'
            }`}
            style={{ imageRendering: 'auto' }}
          />

          {/* Optional AI Illustrated Cartographic Map */}
          {useAiArt && customArtMapUrl ? (
            <img
              src={customArtMapUrl}
              alt={`Mapa de ${worldTitle}`}
              draggable={false}
              className="absolute inset-0 h-full w-full rounded-xl object-cover opacity-90"
            />
          ) : null}

          {/* Subtle dark vignette + coordinate grid + interactive SVG pins */}
          <svg
            viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
            className="absolute inset-0 h-full w-full"
          >
            <defs>
              <pattern
                id="procGrid"
                width="50"
                height="50"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 50 0 L 0 0 0 50"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="0.7"
                />
              </pattern>
              <radialGradient id="procVignette" cx="50%" cy="50%" r="65%">
                <stop offset="60%" stopColor="rgba(0,0,0,0)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.48)" />
              </radialGradient>
            </defs>

            <rect width={WORLD_W} height={WORLD_H} fill="url(#procGrid)" />
            <rect width={WORLD_W} height={WORLD_H} fill="url(#procVignette)" />

            {/* Compass Rose */}
            <g opacity="0.32" transform="translate(935, 68)">
              <circle r="24" fill="none" stroke="var(--accent)" strokeWidth="1" />
              <path d="M0,-28 L4,-5 L0,0 L-4,-5 Z" fill="var(--accent)" />
              <path d="M0,28 L4,5 L0,0 L-4,5 Z" fill="#cbd5e1" />
              <path d="M-28,0 L-5,-4 L0,0 L-5,4 Z" fill="#cbd5e1" />
              <path d="M28,0 L5,-4 L0,0 L5,4 Z" fill="#cbd5e1" />
              <text
                y="-32"
                textAnchor="middle"
                fill="var(--accent)"
                fontSize="9"
                fontWeight="700"
              >
                N
              </text>
            </g>

            {/* Region Watermarks */}
            {Array.from(positioned.regionCenters.entries()).map(([reg, pos]) => (
              <text
                key={`reg_${reg}`}
                x={pos.x}
                y={pos.y - 36}
                textAnchor="middle"
                fill="rgba(255,255,255,0.42)"
                fontSize={zoom > 1.3 ? 9 : 11}
                fontWeight="700"
                letterSpacing="1.6"
                style={{ textTransform: 'uppercase', pointerEvents: 'none' }}
              >
                {reg}
              </text>
            ))}

            {/* Routes between sequential discoveries */}
            {positioned.nodes.map((node, i) => {
              if (i === 0) return null;
              const prev = positioned.nodes[i - 1];
              const highlight =
                node.isCurrent ||
                prev.isCurrent ||
                node.loc.id === selectedId ||
                prev.loc.id === selectedId;
              return (
                <line
                  key={`proc_edge_${prev.loc.id}_${node.loc.id}`}
                  x1={prev.x}
                  y1={prev.y}
                  x2={node.x}
                  y2={node.y}
                  stroke={highlight ? 'var(--accent)' : 'rgba(255,255,255,0.22)'}
                  strokeWidth={highlight ? 1.8 / Math.sqrt(zoom) : 1 / Math.sqrt(zoom)}
                  strokeDasharray="5 5"
                  strokeOpacity={highlight ? 0.85 : 0.45}
                />
              );
            })}

            {/* Location Markers */}
            {positioned.nodes.map((node) => {
              const kind = node.loc.kind ?? 'city';
              const kindMeta = LOCATION_KIND_META[kind];
              const isSelected = node.loc.id === selectedId;
              const isHovered = node.loc.id === hoveredId;
              const isStronghold =
                Boolean(strongholdLower) &&
                node.loc.name.toLowerCase() === strongholdLower;
              const showLabel =
                node.isCurrent ||
                isSelected ||
                isHovered ||
                isStronghold ||
                zoom >= 1.35 ||
                positioned.nodes.length <= 16;

              const invScale = 1 / Math.sqrt(zoom);

              return (
                <g
                  key={node.loc.id}
                  transform={`translate(${node.x}, ${node.y}) scale(${invScale})`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredId(node.loc.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!dragStateRef.current.moved) {
                      onSelectLocation(node.loc.id);
                    }
                  }}
                >
                  {node.isCurrent ? (
                    <circle
                      r="17"
                      fill="var(--accent)"
                      fillOpacity="0.18"
                      stroke="var(--accent)"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />
                  ) : null}

                  {isSelected ? (
                    <circle
                      r="14"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1.8"
                      strokeOpacity="0.85"
                    />
                  ) : null}

                  <circle
                    r={node.isCurrent ? 9 : 7}
                    fill="rgba(12,16,14,0.92)"
                    stroke={node.isCurrent ? 'var(--accent)' : kindMeta.color}
                    strokeWidth={node.isCurrent ? 2.6 : 2}
                  />
                  <circle
                    r={node.isCurrent ? 3.5 : 2.8}
                    fill={node.isCurrent ? 'var(--accent)' : kindMeta.color}
                  />

                  {isStronghold ? (
                    <text
                      y="-13"
                      textAnchor="middle"
                      fill="var(--success)"
                      fontSize="9"
                      fontWeight="700"
                    >
                      ★ REFÚGIO
                    </text>
                  ) : null}

                  {showLabel ? (
                    <g transform="translate(0, 19)">
                      <rect
                        x="-62"
                        y="-9"
                        width="124"
                        height="16"
                        rx="6"
                        fill="rgba(10,13,11,0.88)"
                        stroke={
                          node.isCurrent || isSelected
                            ? 'var(--accent)'
                            : 'rgba(255,255,255,0.14)'
                        }
                        strokeWidth="0.9"
                      />
                      <text
                        textAnchor="middle"
                        y="2"
                        fill={node.isCurrent ? 'var(--accent)' : '#f8fafc'}
                        fontSize="9.2"
                        fontWeight={node.isCurrent || isSelected ? '700' : '500'}
                      >
                        {node.loc.name.length > 20
                          ? `${node.loc.name.slice(0, 19)}…`
                          : node.loc.name}
                      </text>
                    </g>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Top-Left Title & Layer Toggle */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2">
        <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 px-3 py-1.5 text-[11px] font-medium text-[var(--text-primary)] shadow-lg backdrop-blur-md">
          <MapIcon className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span>{worldTitle} · Terreno Procedural</span>
        </div>

        {customArtMapUrl ? (
          <div className="flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 p-1 shadow-lg backdrop-blur-md">
            <button
              type="button"
              onClick={() => setUseAiArt(true)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
                useAiArt
                  ? 'bg-[var(--accent)] text-[#111] font-semibold'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              Arte IA
            </button>
            <button
              type="button"
              onClick={() => setUseAiArt(false)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
                !useAiArt
                  ? 'bg-[var(--accent)] text-[#111] font-semibold'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              Topografia
            </button>
          </div>
        ) : null}
      </div>

      {/* Top-Right Generate AI Illustrated Map CTA */}
      <div className="absolute top-3 right-3 z-20">
        <button
          type="button"
          onClick={onGenerateArt}
          disabled={isGeneratingArt}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/40 bg-[var(--bg-surface)]/92 px-3 py-1.5 text-[11px] font-semibold text-[var(--accent)] shadow-lg backdrop-blur-md transition hover:bg-[var(--accent-soft)] disabled:opacity-60"
        >
          {isGeneratingArt ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Ilustrando Mapa...</span>
            </>
          ) : (
            <>
              {customArtMapUrl ? (
                <ImageIcon className="h-3.5 w-3.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>{customArtMapUrl ? 'Regerar Arte (IA)' : 'Gerar Arte do Mapa (IA)'}</span>
            </>
          )}
        </button>
      </div>

      {/* Bottom-Right Zoom & Reset Controls */}
      <div className="absolute right-3 bottom-3 z-20 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleFocusCurrent}
          title="Centralizar no local atual"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/92 text-[var(--accent)] shadow-lg backdrop-blur-md transition hover:bg-[var(--bg-elevated)]"
        >
          <Crosshair className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleReset}
          title="Enquadrar mapa inteiro"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/92 text-[var(--text-secondary)] shadow-lg backdrop-blur-md transition hover:text-[var(--text-primary)]"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/92 shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3.2, Number((z * 1.2).toFixed(2))))}
            title="Aproximar"
            className="flex h-8 w-9 items-center justify-center border-b border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.65, Number((z / 1.2).toFixed(2))))}
            title="Afastar"
            className="flex h-8 w-9 items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Zoom hint */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 px-2.5 py-1 text-[10px] text-[var(--text-muted)] backdrop-blur-sm">
        Arraste para mover · Scroll para zoom ({Math.round(zoom * 100)}%)
      </div>
    </div>
  );
}
