import {
  Compass,
  Globe2,
  Loader2,
  Map as MapIcon,
  MapPin,
  Navigation,
  Network,
  Search,
  Shield,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  LOCATION_KIND_META,
  LOCATION_STATUS_META,
} from '../engine/rpgSystem';
import type { Campaign, LocationKind, LocationRecord } from '../types/game';
import { ObsidianGraphMap } from './ObsidianGraphMap';
import { ProceduralTerrainMap } from './ProceduralTerrainMap';
import { RealWorldLeafletMap } from './RealWorldLeafletMap';

interface WorldMapModalProps {
  open: boolean;
  campaign: Campaign;
  isSyncingGeo: boolean;
  isGeneratingMapArt: boolean;
  onClose: () => void;
  onTravelLocation: (loc: LocationRecord) => void;
  onSyncMapGeocode: () => void;
  onGenerateFictionalMapArt: () => void;
  onDeleteLocation: (locId: string) => void;
}

const DANGER_BADGE: Record<
  LocationRecord['danger'],
  { label: string; color: string }
> = {
  safe: { label: 'Seguro', color: 'var(--success)' },
  tense: { label: 'Tenso', color: 'var(--warning)' },
  hostile: { label: 'Hostil', color: 'var(--danger)' },
};

const ALL_KINDS: LocationKind[] = [
  'city',
  'safehouse',
  'market',
  'dungeon',
  'secret',
  'wilderness',
];

const REAL_WORLD_HINT_REGEX =
  /\b(miami|redland|brickell|homestead|florida|flórida|são paulo|sao paulo|rio de janeiro|brasil|brazil|new york|nova york|manhattan|brooklyn|london|londres|paris|tokyo|tóquio|toquio|los angeles|chicago|lisboa|lisbon|berlin|berlim|roma|rome|madrid|buenos aires|seoul|seul|eua|usa)\b/i;

export function WorldMapModal({
  open,
  campaign,
  isSyncingGeo,
  isGeneratingMapArt,
  onClose,
  onTravelLocation,
  onSyncMapGeocode,
  onGenerateFictionalMapArt,
  onDeleteLocation,
}: WorldMapModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cartographic' | 'graph'>('cartographic');
  const [cartoOverride, setCartoOverride] = useState<'auto' | 'real' | 'procedural'>('auto');
  const [searchQuery, setSearchQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<LocationKind | 'all'>('all');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const allLocations = useMemo<LocationRecord[]>(() => {
    if (campaign.codex.locations.length > 0) {
      return campaign.codex.locations;
    }
    return [
      {
        id: 'loc_current_fallback',
        name: campaign.currentLocation || 'Ponto de Partida',
        description: campaign.world.premise || 'Local atual da crônica.',
        danger: 'tense',
        kind: 'city',
        status: 'explored',
        visitCount: 1,
        firstVisitedTurn: 0,
      },
    ];
  }, [campaign.codex.locations, campaign.currentLocation, campaign.world.premise]);

  const hasGeoCoords = useMemo(
    () =>
      allLocations.some(
        (l) => typeof l.lat === 'number' && typeof l.lng === 'number',
      ),
    [allLocations],
  );

  const inferredRealWorld = useMemo(() => {
    if (typeof campaign.mapMeta?.isRealWorld === 'boolean') {
      return campaign.mapMeta.isRealWorld;
    }
    if (hasGeoCoords) return true;
    const sample = `${campaign.world.title} ${campaign.world.era} ${campaign.world.premise} ${campaign.currentLocation}`;
    return REAL_WORLD_HINT_REGEX.test(sample);
  }, [campaign.mapMeta?.isRealWorld, campaign.world, campaign.currentLocation, hasGeoCoords]);

  const effectiveCartoMode: 'real' | 'procedural' =
    cartoOverride === 'auto'
      ? inferredRealWorld
        ? 'real'
        : 'procedural'
      : cartoOverride;

  const filteredLocations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allLocations.filter((loc) => {
      const kind = loc.kind ?? 'city';
      if (kindFilter !== 'all' && kind !== kindFilter) return false;
      if (!q) return true;
      return (
        loc.name.toLowerCase().includes(q) ||
        (loc.region ?? '').toLowerCase().includes(q) ||
        (loc.description ?? '').toLowerCase().includes(q)
      );
    });
  }, [allLocations, kindFilter, searchQuery]);

  const kindCounts = useMemo(() => {
    const counts: Record<LocationKind, number> = {
      city: 0,
      safehouse: 0,
      market: 0,
      dungeon: 0,
      secret: 0,
      wilderness: 0,
    };
    for (const loc of allLocations) {
      counts[loc.kind ?? 'city'] += 1;
    }
    return counts;
  }, [allLocations]);

  const currentLower = campaign.currentLocation.toLowerCase();
  const strongholdLower = campaign.stronghold?.location?.toLowerCase();

  const selectedLocation = useMemo(() => {
    return (
      filteredLocations.find((l) => l.id === selectedId) ??
      allLocations.find((l) => l.id === selectedId) ??
      filteredLocations.find((l) => l.name.toLowerCase() === currentLower) ??
      filteredLocations[0] ??
      allLocations[0]
    );
  }, [filteredLocations, allLocations, selectedId, currentLower]);

  if (!open) return null;

  const isSelectedCurrent =
    Boolean(selectedLocation) &&
    selectedLocation.name.toLowerCase() === currentLower;
  const isSelectedStronghold =
    Boolean(selectedLocation) &&
    Boolean(strongholdLower) &&
    selectedLocation.name.toLowerCase() === strongholdLower;
  const canDeleteSelected =
    Boolean(selectedLocation) &&
    selectedLocation.id !== 'loc_current_fallback' &&
    !isSelectedCurrent &&
    allLocations.length > 1;

  return (
    <div
      className="mythos-backdrop-in fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="mythos-modal-pop flex h-[94dvh] sm:h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex flex-col gap-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/75 px-3.5 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-center justify-between gap-2.5">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--accent)]/35 bg-[var(--accent-soft)] text-[var(--accent)]">
                <Compass className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate font-display text-sm sm:text-base font-semibold text-[var(--text-primary)]">
                  Atlas · {campaign.world.title}
                </h2>
                <p className="truncate text-[11px] text-[var(--text-muted)]">
                  {allLocations.length} locais descobertos
                  {campaign.mapMeta?.realWorldRegion
                    ? ` · ${campaign.mapMeta.realWorldRegion}`
                    : ''}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar Atlas"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* View Mode Tabs + Sync GPS */}
          <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
            {/* Primary 2-Tab Switcher */}
            <div className="flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/70 p-1">
              <button
                type="button"
                onClick={() => setActiveTab('cartographic')}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                  activeTab === 'cartographic'
                    ? 'bg-[var(--accent)] text-[#111] font-semibold shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {effectiveCartoMode === 'real' ? (
                  <Globe2 className="h-3.5 w-3.5" />
                ) : (
                  <MapIcon className="h-3.5 w-3.5" />
                )}
                <span>Mapa {effectiveCartoMode === 'real' ? 'Real' : 'Procedural'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('graph')}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                  activeTab === 'graph'
                    ? 'bg-[var(--accent)] text-[#111] font-semibold shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Network className="h-3.5 w-3.5" />
                <span>Grafo Obsidian</span>
              </button>
            </div>

            {/* Real vs Procedural Quick Switch when in Cartographic Tab */}
            {activeTab === 'cartographic' ? (
              <div className="hidden sm:flex items-center gap-0.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setCartoOverride('real')}
                  className={`rounded-full px-2.5 py-1 transition ${
                    effectiveCartoMode === 'real'
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Terra Real
                </button>
                <button
                  type="button"
                  onClick={() => setCartoOverride('procedural')}
                  className={`rounded-full px-2.5 py-1 transition ${
                    effectiveCartoMode === 'procedural'
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Procedural
                </button>
              </div>
            ) : null}

            {/* Global AI GPS & Region Sync Button */}
            <button
              type="button"
              onClick={onSyncMapGeocode}
              disabled={isSyncingGeo}
              title="Usar IA para detectar regiões e posicionar todos os locais em coordenadas GPS reais"
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] transition hover:brightness-110 disabled:opacity-60"
            >
              {isSyncingGeo ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span className="hidden md:inline">
                {isSyncingGeo ? 'Sincronizando...' : 'Sincronizar GPS (IA)'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar Atlas"
              className="hidden h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:flex"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search & Interactive Category Filter Bar */}
        <div className="flex flex-col gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:px-5 sm:py-2.5">
          <div className="relative w-full sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar local, bairro ou região..."
              className="w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/70 py-1.5 pr-7 pl-8 text-[16px] sm:text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </div>

          <div className="no-scrollbar flex flex-nowrap items-center gap-1.5 overflow-x-auto sm:flex-wrap">
            <button
              type="button"
              onClick={() => setKindFilter('all')}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                kindFilter === 'all'
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>Todos</span>
              <span className="opacity-70">{allLocations.length}</span>
            </button>

            {ALL_KINDS.map((k) => {
              const active = kindFilter === k;
              const count = kindCounts[k];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKindFilter(active ? 'all' : k)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)] font-semibold'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: LOCATION_KIND_META[k].color }}
                  />
                  <span>{LOCATION_KIND_META[k].label}</span>
                  {count > 0 ? <span className="opacity-65">{count}</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Interactive Map Viewport */}
        <div className="relative flex-1 min-h-0 w-full overflow-hidden">
          {filteredLocations.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                Nenhum local encontrado para esse filtro.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setKindFilter('all');
                }}
                className="rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
              >
                Limpar filtros
              </button>
            </div>
          ) : activeTab === 'graph' ? (
            <ObsidianGraphMap
              locations={filteredLocations}
              currentLocation={campaign.currentLocation}
              strongholdLocation={campaign.stronghold?.location}
              selectedId={selectedLocation?.id ?? null}
              onSelectLocation={setSelectedId}
            />
          ) : effectiveCartoMode === 'real' ? (
            <RealWorldLeafletMap
              locations={filteredLocations}
              totalLocationsCount={allLocations.length}
              currentLocation={campaign.currentLocation}
              strongholdLocation={campaign.stronghold?.location}
              selectedId={selectedLocation?.id ?? null}
              centerLat={campaign.mapMeta?.centerLat}
              centerLng={campaign.mapMeta?.centerLng}
              defaultZoom={campaign.mapMeta?.defaultZoom}
              regionLabel={campaign.mapMeta?.realWorldRegion}
              isSyncingGeo={isSyncingGeo}
              onSelectLocation={setSelectedId}
              onSyncGeo={onSyncMapGeocode}
            />
          ) : (
            <ProceduralTerrainMap
              seedKey={`${campaign.id}:${campaign.world.title}`}
              theme={campaign.world.primaryTheme}
              worldTitle={campaign.world.title}
              locations={filteredLocations}
              currentLocation={campaign.currentLocation}
              strongholdLocation={campaign.stronghold?.location}
              selectedId={selectedLocation?.id ?? null}
              customArtMapUrl={campaign.mapMeta?.customArtMapUrl}
              isGeneratingArt={isGeneratingMapArt}
              onSelectLocation={setSelectedId}
              onGenerateArt={onGenerateFictionalMapArt}
            />
          )}
        </div>

        {/* Selected Location Inspector Footer */}
        {selectedLocation ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3.5 sm:px-5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                <span className="font-display text-sm font-semibold text-[var(--text-primary)]">
                  {selectedLocation.name}
                </span>
                {isSelectedCurrent ? (
                  <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                    Você está aqui
                  </span>
                ) : null}
                {campaign.organization?.outposts.some(
                  (o) =>
                    o.locationId === selectedLocation.id ||
                    o.locationName.toLowerCase() ===
                      selectedLocation.name.toLowerCase(),
                ) ? (
                  <span className="rounded-full border border-[#fbbf24]/45 bg-[#fbbf24]/15 px-2 py-0.5 text-[10px] font-semibold text-[#fbbf24]">
                    ⚑ Posto · {campaign.organization.name}
                  </span>
                ) : null}
                {selectedLocation.region ? (
                  <span className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                    {selectedLocation.region}
                  </span>
                ) : null}
                <span
                  className="rounded-md bg-[var(--bg-surface)] px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    color:
                      LOCATION_KIND_META[selectedLocation.kind ?? 'city'].color,
                  }}
                >
                  {LOCATION_KIND_META[selectedLocation.kind ?? 'city'].label}
                </span>
                <span
                  className="rounded-md bg-[var(--bg-surface)] px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    color:
                      LOCATION_STATUS_META[selectedLocation.status ?? 'explored']
                        .color,
                  }}
                >
                  {
                    LOCATION_STATUS_META[selectedLocation.status ?? 'explored']
                      .label
                  }
                </span>
                <span
                  className="rounded-md bg-[var(--bg-surface)] px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    color: DANGER_BADGE[selectedLocation.danger].color,
                  }}
                >
                  {DANGER_BADGE[selectedLocation.danger].label}
                </span>
                {typeof selectedLocation.lat === 'number' &&
                typeof selectedLocation.lng === 'number' ? (
                  <span className="hidden md:inline-flex items-center rounded-md bg-[var(--bg-canvas)]/70 px-2 py-0.5 font-mono-tech text-[10px] text-[var(--text-muted)]">
                    {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                  </span>
                ) : null}
                {selectedLocation.recommendedLevel ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[var(--bg-surface)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                    <Sparkles className="h-2.5 w-2.5 text-[var(--accent)]" />
                    Nv.{selectedLocation.recommendedLevel}+
                  </span>
                ) : null}
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                {selectedLocation.description ||
                  'Território registrado na sua crônica.'}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {campaign.stronghold && isSelectedStronghold ? (
                <span className="inline-flex items-center gap-1 rounded-xl border border-[var(--success)]/35 bg-[var(--success)]/10 px-3 py-2 text-xs font-medium text-[var(--success)]">
                  <Shield className="h-3.5 w-3.5" />
                  Defesa {campaign.stronghold.defense}
                </span>
              ) : null}

              {canDeleteSelected ? (
                <button
                  type="button"
                  onClick={() => {
                    const idToRemove = selectedLocation.id;
                    setSelectedId(null);
                    onDeleteLocation(idToRemove);
                  }}
                  title="Remover este marcador do Atlas (útil para limpar cômodos duplicados)"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-medium text-[var(--text-muted)] transition hover:border-[var(--danger)]/50 hover:text-[var(--danger)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Remover</span>
                </button>
              ) : null}

              {!isSelectedCurrent ? (
                <button
                  type="button"
                  onClick={() => {
                    onTravelLocation(selectedLocation);
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
