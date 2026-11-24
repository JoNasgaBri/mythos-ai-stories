import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Crosshair,
  Globe2,
  Layers,
  Loader2,
  Maximize2,
  Minus,
  Plus,
  Sparkles,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LOCATION_KIND_META } from '../engine/rpgSystem';
import type { LocationRecord } from '../types/game';

type TilePresetId = 'dark' | 'satellite' | 'streets';

const TILE_PRESETS: Record<
  TilePresetId,
  { label: string; url: string; attribution: string; maxZoom: number }
> = {
  dark: {
    label: 'Tático Escuro',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19,
  },
  satellite: {
    label: 'Satélite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri World Imagery',
    maxZoom: 18,
  },
  streets: {
    label: 'Urbano',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19,
  },
};

interface RealWorldLeafletMapProps {
  locations: LocationRecord[];
  totalLocationsCount: number;
  currentLocation: string;
  strongholdLocation?: string;
  selectedId: string | null;
  centerLat?: number;
  centerLng?: number;
  defaultZoom?: number;
  regionLabel?: string;
  isSyncingGeo: boolean;
  onSelectLocation: (id: string) => void;
  onSyncGeo: () => void;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function RealWorldLeafletMap({
  locations,
  totalLocationsCount,
  currentLocation,
  strongholdLocation,
  selectedId,
  centerLat,
  centerLng,
  defaultZoom,
  regionLabel,
  isSyncingGeo,
  onSelectLocation,
  onSyncGeo,
}: RealWorldLeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const hasAutoFittedRef = useRef(false);

  const [tilePreset, setTilePreset] = useState<TilePresetId>('dark');

  const geoLocations = useMemo(
    () =>
      locations.filter(
        (l): l is LocationRecord & { lat: number; lng: number } =>
          typeof l.lat === 'number' &&
          Number.isFinite(l.lat) &&
          typeof l.lng === 'number' &&
          Number.isFinite(l.lng),
      ),
    [locations],
  );

  const currentLocGeo = useMemo(
    () =>
      geoLocations.find(
        (l) => l.name.toLowerCase() === currentLocation.toLowerCase(),
      ),
    [geoLocations, currentLocation],
  );

  // Initialize Leaflet map once
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const initialCenter: [number, number] =
      typeof centerLat === 'number' && typeof centerLng === 'number'
        ? [centerLat, centerLng]
        : geoLocations[0]
          ? [geoLocations[0].lat, geoLocations[0].lng]
          : [25.645, -80.345];

    const map = L.map(el, {
      center: initialCenter,
      zoom: defaultZoom ?? 11,
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
    });

    const preset = TILE_PRESETS.dark;
    tileLayerRef.current = L.tileLayer(preset.url, {
      attribution: preset.attribution,
      maxZoom: preset.maxZoom,
    }).addTo(map);

    routeLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();
    }, 140);

    return () => {
      window.clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      markersLayerRef.current = null;
      routeLayerRef.current = null;
      hasAutoFittedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch tile layer preset smoothly
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const preset = TILE_PRESETS[tilePreset];
    tileLayerRef.current = L.tileLayer(preset.url, {
      attribution: preset.attribution,
      maxZoom: preset.maxZoom,
    }).addTo(map);
  }, [tilePreset]);

  // Render markers and chronological tactical route
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    const routeLayer = routeLayerRef.current;
    if (!map || !markersLayer || !routeLayer) return;

    markersLayer.clearLayers();
    routeLayer.clearLayers();

    if (geoLocations.length === 0) return;

    // Subtle dashed tactical path in chronological discovery order
    const ordered = [...geoLocations].sort(
      (a, b) => (a.firstVisitedTurn ?? 0) - (b.firstVisitedTurn ?? 0),
    );
    if (ordered.length >= 2) {
      L.polyline(
        ordered.map((l) => [l.lat, l.lng] as [number, number]),
        {
          color: '#a3e635',
          weight: 1.6,
          opacity: 0.34,
          dashArray: '5 7',
          interactive: false,
        },
      ).addTo(routeLayer);
    }

    const strongholdLower = strongholdLocation?.toLowerCase();
    const currentLower = currentLocation.toLowerCase();

    for (const loc of geoLocations) {
      const kind = loc.kind ?? 'city';
      const kindMeta = LOCATION_KIND_META[kind];
      const isCurrent = loc.name.toLowerCase() === currentLower;
      const isSelected = loc.id === selectedId;
      const isStronghold =
        Boolean(strongholdLower) && loc.name.toLowerCase() === strongholdLower;

      const pinColor = isCurrent ? 'var(--accent, #a3e635)' : kindMeta.color;
      const size = isCurrent ? 22 : isSelected ? 20 : 14;

      const html = `
        <div class="mythos-map-pin ${isCurrent ? 'is-current' : ''} ${isSelected ? 'is-selected' : ''}" style="--pin-color:${pinColor};width:${size}px;height:${size}px;">
          ${isCurrent ? '<span class="mythos-map-pin-pulse"></span>' : ''}
          <span class="mythos-map-pin-core"></span>
          ${isStronghold ? '<span class="mythos-map-pin-star">★</span>' : ''}
        </div>
      `;

      const icon = L.divIcon({
        html,
        className: 'mythos-leaflet-icon',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([loc.lat, loc.lng], {
        icon,
        zIndexOffset: isCurrent ? 900 : isSelected ? 700 : isStronghold ? 500 : 100,
      });

      const tooltipHtml = `
        <div class="mythos-leaflet-tip">
          <strong>${escapeHtml(loc.name)}</strong>
          ${loc.region ? `<span>${escapeHtml(loc.region)} · ${escapeHtml(kindMeta.label)}</span>` : `<span>${escapeHtml(kindMeta.label)}</span>`}
        </div>
      `;

      marker.bindTooltip(tooltipHtml, {
        direction: 'top',
        offset: [0, -10],
        opacity: 0.96,
        className: 'mythos-leaflet-tooltip-box',
      });

      marker.on('click', () => {
        onSelectLocation(loc.id);
      });

      marker.addTo(markersLayer);
    }

    if (!hasAutoFittedRef.current) {
      hasAutoFittedRef.current = true;
      if (geoLocations.length === 1) {
        map.setView([geoLocations[0].lat, geoLocations[0].lng], defaultZoom ?? 13);
      } else {
        const bounds = L.latLngBounds(
          geoLocations.map((l) => [l.lat, l.lng] as [number, number]),
        );
        map.fitBounds(bounds, { padding: [46, 46], maxZoom: 14 });
      }
    }
  }, [
    geoLocations,
    currentLocation,
    strongholdLocation,
    selectedId,
    defaultZoom,
    onSelectLocation,
  ]);

  // Smooth flyTo when user selects a location
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const target = geoLocations.find((l) => l.id === selectedId);
    if (!target) return;
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 13), {
      duration: 0.55,
    });
  }, [selectedId, geoLocations]);

  const handleFitAll = () => {
    const map = mapRef.current;
    if (!map || geoLocations.length === 0) return;
    if (geoLocations.length === 1) {
      map.flyTo([geoLocations[0].lat, geoLocations[0].lng], 13, { duration: 0.55 });
      return;
    }
    const bounds = L.latLngBounds(
      geoLocations.map((l) => [l.lat, l.lng] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [46, 46], maxZoom: 14 });
  };

  const handleFocusPlayer = () => {
    const map = mapRef.current;
    if (!map) return;
    if (currentLocGeo) {
      map.flyTo([currentLocGeo.lat, currentLocGeo.lng], 14, { duration: 0.6 });
    } else if (typeof centerLat === 'number' && typeof centerLng === 'number') {
      map.flyTo([centerLat, centerLng], defaultZoom ?? 11, { duration: 0.6 });
    }
  };

  const missingGeoCount = Math.max(0, totalLocationsCount - geoLocations.length);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a0d0b]">
      {/* Leaflet Canvas */}
      <div ref={containerRef} className="h-full w-full z-0" />

      {/* Top-Left Region Badge */}
      <div className="pointer-events-none absolute top-3 left-3 z-[400] flex flex-wrap items-center gap-2">
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 px-3 py-1.5 text-[11px] font-medium text-[var(--text-primary)] shadow-lg backdrop-blur-md">
          <Globe2 className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span>{regionLabel || 'Mapa Real (GPS)'}</span>
          <span className="rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
            {geoLocations.length} pins
          </span>
        </div>

        {missingGeoCount > 0 && geoLocations.length > 0 ? (
          <button
            type="button"
            onClick={onSyncGeo}
            disabled={isSyncingGeo}
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/40 bg-[var(--bg-surface)]/90 px-3 py-1.5 text-[11px] font-semibold text-[var(--accent)] shadow-lg backdrop-blur-md transition hover:bg-[var(--accent-soft)] disabled:opacity-60"
          >
            {isSyncingGeo ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            <span>+{missingGeoCount} sem GPS · Sincronizar</span>
          </button>
        ) : null}
      </div>

      {/* Top-Right Tile Layer Switcher */}
      <div className="absolute top-3 right-3 z-[400] flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 p-1 shadow-lg backdrop-blur-md">
        <Layers className="ml-2 mr-1 h-3.5 w-3.5 text-[var(--text-muted)]" />
        {(Object.keys(TILE_PRESETS) as TilePresetId[]).map((presetKey) => {
          const active = tilePreset === presetKey;
          return (
            <button
              key={presetKey}
              type="button"
              onClick={() => setTilePreset(presetKey)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                active
                  ? 'bg-[var(--accent)] text-[#111] font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {TILE_PRESETS[presetKey].label}
            </button>
          );
        })}
      </div>

      {/* Bottom-Right Map Navigation Controls */}
      <div className="absolute right-3 bottom-8 z-[400] flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleFocusPlayer}
          title="Centralizar na sua posição atual"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/92 text-[var(--accent)] shadow-lg backdrop-blur-md transition hover:border-[var(--accent)]/60 hover:bg-[var(--bg-elevated)]"
        >
          <Crosshair className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleFitAll}
          title="Enquadrar todos os locais"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/92 text-[var(--text-secondary)] shadow-lg backdrop-blur-md transition hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/92 shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            title="Aproximar"
            className="flex h-8 w-9 items-center justify-center border-b border-[var(--border-subtle)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            title="Afastar"
            className="flex h-8 w-9 items-center justify-center text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Empty GPS Overlay CTA */}
      {geoLocations.length === 0 ? (
        <div className="absolute inset-0 z-[410] flex items-center justify-center bg-black/55 p-6 backdrop-blur-[2px]">
          <div className="max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)]/95 p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Globe2 className="h-6 w-6" />
            </div>
            <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
              Geolocalizar locais no Mapa Real
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
              A IA identifica automaticamente os bairros, avenidas e pontos reais
              da sua crônica ({totalLocationsCount} locais descobertos) e posiciona
              cada pino nas coordenadas GPS reais.
            </p>
            <button
              type="button"
              onClick={onSyncGeo}
              disabled={isSyncingGeo}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-semibold text-[#111] shadow-lg transition hover:brightness-110 disabled:opacity-60"
            >
              {isSyncingGeo ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Mapeando coordenadas GPS...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Sincronizar GPS com IA</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
