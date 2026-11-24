import {
  ChevronRight,
  FastForward,
  Flame,
  Hammer,
  Heart,
  Layers,
  Map as MapIcon,
  PanelLeftClose,
  Pause,
  Pin,
  PinOff,
  Play,
  Radio,
  Save,
  Shield,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { UI_COPY } from '../data/presets';
import type { AppSettings, Campaign } from '../types/game';

export type ZenRailMode = 'compact' | 'pinned' | 'hidden';

interface ZenLeftRailProps {
  campaign: Campaign;
  settings: AppSettings;
  saveSlotCount: number;
  isBusy: boolean;
  mode: ZenRailMode;
  mobileOpen: boolean;
  pulsePaused: boolean;
  pulseSecondsLeft: number;
  onChangeMode: (mode: ZenRailMode) => void;
  onCloseMobile: () => void;
  onOpenInventory: () => void;
  onOpenRelationships: () => void;
  onOpenRumors: () => void;
  onOpenWorkbench: () => void;
  onOpenBaseBlueprint: () => void;
  onOpenMap: () => void;
  onOpenRest: () => void;
  onOpenSaves: () => void;
  onOpenOrTriggerWorldEvent?: () => void;
  isGeneratingEvent?: boolean;
  onTogglePulsePause: () => void;
  onAdvanceWorldNow: () => void;
}

interface RailActionItem {
  id: string;
  label: string;
  subtitle: string;
  icon: typeof Shield;
  accent: string;
  badge?: number;
  disabled?: boolean;
  onClick: () => void;
}

export function ZenLeftRail({
  campaign,
  settings,
  saveSlotCount,
  isBusy,
  mode,
  mobileOpen,
  pulsePaused,
  pulseSecondsLeft,
  onChangeMode,
  onCloseMobile,
  onOpenInventory,
  onOpenRelationships,
  onOpenRumors,
  onOpenWorkbench,
  onOpenBaseBlueprint,
  onOpenMap,
  onOpenRest,
  onOpenSaves,
  onOpenOrTriggerWorldEvent,
  isGeneratingEvent,
  onTogglePulsePause,
  onAdvanceWorldNow,
}: ZenLeftRailProps) {
  const [hoverPeek, setHoverPeek] = useState(false);
  const copy = UI_COPY[settings.language];

  const partyCount = campaign.codex.npcs.filter(
    (n) => n.inParty && n.status === 'alive',
  ).length;
  const freshRumors = (campaign.rumors ?? []).filter((r) => !r.investigated).length;
  const materials = campaign.stronghold?.supplies?.materials ?? 0;
  const vehicleCount = campaign.stronghold?.vehicles?.length ?? 0;
  const defense = campaign.stronghold?.defense ?? 20;

  const progressPct =
    settings.livingWorldSeconds > 0
      ? Math.max(
          0,
          Math.min(
            100,
            ((settings.livingWorldSeconds - pulseSecondsLeft) /
              settings.livingWorldSeconds) *
              100,
          ),
        )
      : 0;

  const items: RailActionItem[] = [
    {
      id: 'inventory',
      label: 'Inventário',
      subtitle: `${campaign.player.inventory.length} itens`,
      icon: Shield,
      accent: 'var(--accent)',
      onClick: onOpenInventory,
    },
    {
      id: 'relationships',
      label: 'Vínculos',
      subtitle:
        partyCount > 0
          ? `${partyCount} no grupo`
          : `${campaign.codex.npcs.length} pessoas`,
      icon: Heart,
      accent: '#f472b6',
      badge: partyCount > 0 ? partyCount : undefined,
      onClick: onOpenRelationships,
    },
    {
      id: 'rumors',
      label: 'Rádio & Rumores',
      subtitle: freshRumors > 0 ? `${freshRumors} boletins` : 'Sintonizar mundo',
      icon: Radio,
      accent: '#38bdf8',
      badge: freshRumors > 0 ? freshRumors : undefined,
      onClick: onOpenRumors,
    },
    ...(campaign.status === 'active' && onOpenOrTriggerWorldEvent
      ? [
          {
            id: 'world-event',
            label: campaign.activeWorldEvent
              ? 'Evento Pendente!'
              : 'Evento do Mundo',
            subtitle: isGeneratingEvent
              ? 'Gerando dilema...'
              : campaign.activeWorldEvent
                ? campaign.activeWorldEvent.title
                : 'Disparar dilema vivo',
            icon: Zap,
            accent: '#fbbf24',
            badge: campaign.activeWorldEvent ? 1 : undefined,
            disabled: isBusy || isGeneratingEvent,
            onClick: onOpenOrTriggerWorldEvent,
          },
        ]
      : []),
    {
      id: 'workbench',
      label: 'Bancada',
      subtitle:
        vehicleCount > 0
          ? `${materials} mat · ${vehicleCount} veíc`
          : `${materials} materiais`,
      icon: Hammer,
      accent: '#fb923c',
      onClick: onOpenWorkbench,
    },
    {
      id: 'base',
      label: 'Planta da Base',
      subtitle: `Defesa ${defense}`,
      icon: Layers,
      accent: '#c084fc',
      onClick: onOpenBaseBlueprint,
    },
    {
      id: 'map',
      label: 'Mapa Visual',
      subtitle: `${campaign.codex.locations.length} locais`,
      icon: MapIcon,
      accent: '#4ade80',
      onClick: onOpenMap,
    },
    ...(campaign.status === 'active'
      ? [
          {
            id: 'rest',
            label: 'Descansar',
            subtitle: 'Pausa curta / longa',
            icon: Flame,
            accent: '#f59e0b',
            disabled: isBusy,
            onClick: onOpenRest,
          },
        ]
      : []),
  ];

  const isPinned = mode === 'pinned';
  const isHidden = mode === 'hidden';
  const isExpanded = isPinned || hoverPeek;

  const renderActionList = (expanded: boolean, closeOnTap: boolean) => (
    <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-1.5 py-2">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            disabled={item.disabled}
            onClick={() => {
              item.onClick();
              if (closeOnTap) onCloseMobile();
            }}
            title={!expanded ? `${item.label} · ${item.subtitle}` : undefined}
            className={`group relative flex items-center rounded-xl border border-transparent transition-all duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)] disabled:opacity-45 ${
              expanded ? 'gap-2.5 px-2.5 py-2 text-left' : 'h-10 w-10 justify-center'
            }`}
          >
            <span
              className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/70 transition group-hover:scale-105"
              style={{ color: item.accent }}
            >
              <Icon className="h-3.5 w-3.5" />
              {!expanded && item.badge ? (
                <span
                  className="font-mono-tech absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-black shadow-sm"
                  style={{ backgroundColor: item.accent }}
                >
                  {item.badge}
                </span>
              ) : null}
            </span>

            {expanded ? (
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-xs font-semibold text-[var(--text-primary)]">
                    {item.label}
                  </span>
                  {item.badge ? (
                    <span
                      className="font-mono-tech shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                      style={{
                        color: item.accent,
                        backgroundColor: `${item.accent}22`,
                      }}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <div className="truncate text-[10px] text-[var(--text-muted)]">
                  {item.subtitle}
                </div>
              </div>
            ) : null}
          </button>
        );
      })}

      <div className="my-1 border-t border-[var(--border-subtle)]/70" />

      <button
        type="button"
        onClick={() => {
          onOpenSaves();
          if (closeOnTap) onCloseMobile();
        }}
        title={!expanded ? `Saves (${saveSlotCount})` : undefined}
        className={`group relative flex items-center rounded-xl border border-transparent transition-all duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)] ${
          expanded ? 'gap-2.5 px-2.5 py-2 text-left' : 'h-10 w-10 justify-center'
        }`}
      >
        <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--border-strong)]/60 bg-[var(--accent-soft)] text-[var(--accent)]">
          <Save className="h-3.5 w-3.5" />
          {!expanded && saveSlotCount > 0 ? (
            <span className="font-mono-tech absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-bold text-[var(--accent-ink)]">
              {saveSlotCount}
            </span>
          ) : null}
        </span>
        {expanded ? (
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-xs font-semibold text-[var(--accent)]">
                Saves
              </span>
              {saveSlotCount > 0 ? (
                <span className="font-mono-tech rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--accent)]">
                  {saveSlotCount}
                </span>
              ) : null}
            </div>
            <div className="truncate text-[10px] text-[var(--text-muted)]">
              Pontos salvos & JSON
            </div>
          </div>
        ) : null}
      </button>
    </div>
  );

  const renderLivingPulse = (expanded: boolean) =>
    campaign.status === 'active' && settings.livingWorldEnabled ? (
      <div className="border-t border-[var(--border-subtle)]/70 p-2">
        {expanded ? (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/70 p-2">
            <div className="flex items-center justify-between gap-1.5 text-[10px]">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--text-secondary)]">
                <span
                  className={`h-2 w-2 rounded-full ${
                    pulsePaused
                      ? 'bg-[var(--text-muted)]'
                      : 'animate-world-pulse bg-[var(--accent)]'
                  }`}
                />
                {pulsePaused ? copy.paused : `${pulseSecondsLeft}s`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onTogglePulsePause}
                  title={pulsePaused ? 'Retomar Mundo Vivo' : 'Pausar Mundo Vivo'}
                  className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                >
                  {pulsePaused ? (
                    <Play className="h-3 w-3" />
                  ) : (
                    <Pause className="h-3 w-3" />
                  )}
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={onAdvanceWorldNow}
                  title={copy.advanceWorld}
                  className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--accent)] disabled:opacity-40"
                >
                  <FastForward className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-700"
                style={{ width: `${pulsePaused ? 0 : progressPct}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title={`${copy.livingWorld} · ${pulseSecondsLeft}s`}>
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                pulsePaused
                  ? 'bg-[var(--text-muted)]'
                  : 'animate-world-pulse bg-[var(--accent)]'
              }`}
            />
          </div>
        )}
      </div>
    ) : null;

  return (
    <>
      {/* Desktop Zen Left Split / Compact / Auto-Peek Rail */}
      <aside
        className={`relative hidden shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:block ${
          isPinned ? 'w-[220px]' : isHidden ? 'w-0' : 'w-[54px]'
        }`}
      >
        {/* Zen Edge Pull-Handle when hidden */}
        {isHidden && !hoverPeek ? (
          <button
            type="button"
            onMouseEnter={() => setHoverPeek(true)}
            onClick={() => onChangeMode('compact')}
            title="Puxar Barra Lateral Esquerda (Ferramentas RPG)"
            className="fixed top-1/2 left-0 z-30 flex -translate-y-1/2 flex-col items-center gap-1 rounded-r-xl border border-l-0 border-[var(--border-strong)] bg-[var(--bg-glass)] px-1 py-4 text-[var(--text-muted)] shadow-lg backdrop-blur-xl transition hover:px-1.5 hover:text-[var(--accent)]"
          >
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="h-6 w-0.5 rounded-full bg-[var(--accent)]/60" />
          </button>
        ) : null}

        {/* Actual Sliding Zen Panel */}
        {!isHidden || hoverPeek ? (
          <div
            onMouseEnter={() => {
              if (!isPinned) setHoverPeek(true);
            }}
            onMouseLeave={() => {
              if (!isPinned) setHoverPeek(false);
            }}
            className={`flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-glass)] backdrop-blur-2xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isPinned
                ? 'w-[220px] shadow-[var(--shadow-card)]'
                : hoverPeek
                  ? 'absolute top-0 left-0 z-40 h-full w-[228px] border-[var(--border-strong)] shadow-[0_18px_50px_rgba(0,0,0,0.55)]'
                  : 'w-[54px] shadow-[var(--shadow-card)]'
            }`}
          >
            {/* Zen Rail Top Controls */}
            <div
              className={`flex items-center border-b border-[var(--border-subtle)]/70 px-2 py-2 ${
                isExpanded ? 'justify-between' : 'justify-center'
              }`}
            >
              {isExpanded ? (
                <span className="pl-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Atalhos
                </span>
              ) : null}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setHoverPeek(false);
                    onChangeMode(isPinned ? 'compact' : 'pinned');
                  }}
                  title={
                    isPinned
                      ? 'Modo Zen Compacto (expande ao passar o mouse)'
                      : 'Fixar barra aberta em Split'
                  }
                  className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
                    isPinned
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'border-transparent text-[var(--text-muted)] hover:border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {isPinned ? (
                    <PinOff className="h-3.5 w-3.5" />
                  ) : (
                    <Pin className="h-3.5 w-3.5" />
                  )}
                </button>
                {isExpanded ? (
                  <button
                    type="button"
                    onClick={() => {
                      setHoverPeek(false);
                      onChangeMode('hidden');
                    }}
                    title="Ocultar na borda esquerda (Zen Foco)"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-[var(--text-muted)] transition hover:border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                  >
                    <PanelLeftClose className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            {renderActionList(isExpanded, false)}
            {renderLivingPulse(isExpanded)}
          </div>
        ) : null}
      </aside>

      {/* Mobile Left Slide-Over Drawer */}
      {mobileOpen ? (
        <div className="animate-backdrop-in fixed inset-0 z-50 flex justify-start bg-black/60 backdrop-blur-sm lg:hidden">
          <div className="animate-drawer-left relative z-10 flex h-full w-[264px] max-w-[82vw] flex-col border-r border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
              <div>
                <div className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                  Painel Tático
                </div>
                <div className="truncate text-[11px] text-[var(--text-muted)]">
                  {campaign.world.title}
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                className="rounded-lg border border-[var(--border-subtle)] p-1.5 text-[var(--text-secondary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {renderActionList(true, true)}
            {renderLivingPulse(true)}
          </div>
          <div
            className="flex-1"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
        </div>
      ) : null}
    </>
  );
}
