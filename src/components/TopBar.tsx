import {
  ChevronLeft,
  Compass,
  Eye,
  EyeOff,
  FastForward,
  MapPin,
  Moon,
  Pause,
  Play,
  Save,
  Settings,
  Sparkles,
  Sun,
} from 'lucide-react';
import { UI_COPY } from '../data/presets';
import type { AppSettings, AppView, Campaign } from '../types/game';

interface TopBarProps {
  view: AppView;
  campaign: Campaign | null;
  saveSlotCount: number;
  settings: AppSettings;
  usingGemini: boolean;
  focusMode: boolean;
  pulsePaused: boolean;
  pulseSecondsLeft: number;
  isBusy: boolean;
  onBackHome: () => void;
  onOpenSaves: () => void;
  onToggleFocus: () => void;
  onTogglePulsePause: () => void;
  onAdvanceWorldNow: () => void;
  onToggleColorMode: () => void;
  onOpenSettings: (initialTab?: 'ai' | 'game' | 'reading') => void;
}

export function TopBar({
  view,
  campaign,
  saveSlotCount,
  settings,
  usingGemini,
  focusMode,
  pulsePaused,
  pulseSecondsLeft,
  isBusy,
  onBackHome,
  onOpenSaves,
  onToggleFocus,
  onTogglePulsePause,
  onAdvanceWorldNow,
  onToggleColorMode,
  onOpenSettings,
}: TopBarProps) {
  const copy = UI_COPY[settings.language];
  const progressPct =
    settings.livingWorldSeconds > 0
      ? Math.max(
          0,
          Math.min(100, ((settings.livingWorldSeconds - pulseSecondsLeft) / settings.livingWorldSeconds) * 100),
        )
      : 0;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-glass)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6">
        {/* Left: Brand & Context */}
        <div className="flex min-w-0 items-center gap-3">
          {view !== 'home' ? (
            <button
              type="button"
              onClick={onBackHome}
              title={copy.backHome}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{copy.backHome}</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={onBackHome}
            className="flex items-center gap-2 text-left transition hover:opacity-85"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--accent)]">
              <Compass className="h-4 w-4" />
            </span>
            <span className="font-display text-sm font-semibold tracking-[0.18em] text-[var(--text-primary)] sm:text-base">
              MYTHOS
            </span>
          </button>

          {view === 'stage' && campaign ? (
            <div className="hidden min-w-0 items-center gap-2.5 border-l border-[var(--border-subtle)] pl-3 md:flex">
              <span className="truncate font-medium text-sm text-[var(--text-primary)] max-w-[190px]">
                {campaign.world.title}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-0.5 text-xs text-[var(--text-secondary)]">
                <MapPin className="h-3 w-3 text-[var(--accent)]" />
                <span className="truncate max-w-[140px]">{campaign.currentLocation}</span>
              </span>
              <span className="font-mono-tech text-[11px] text-[var(--text-muted)]">
                Arco {campaign.arcNumber} · Cap. {campaign.currentChapter} · T{campaign.turnCount}
              </span>
            </div>
          ) : null}
        </div>

        {/* Right: Saves, Living World Pulse, Focus, Mode & Settings */}
        <div className="flex items-center gap-2">
          {view === 'stage' && campaign ? (
            <button
              type="button"
              onClick={onOpenSaves}
              title="Salvar ou carregar um ponto desta crônica"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)]"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Saves</span>
              {saveSlotCount > 0 ? (
                <span className="font-mono-tech rounded bg-[var(--accent-soft)] px-1.5 text-[10px]">
                  {saveSlotCount}
                </span>
              ) : null}
            </button>
          ) : null}

          {view === 'stage' &&
          campaign &&
          campaign.status === 'active' &&
          settings.livingWorldEnabled ? (
            <div className="hidden items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 sm:flex">
              <span
                className={`h-2 w-2 rounded-full ${
                  pulsePaused
                    ? 'bg-[var(--text-muted)]'
                    : 'animate-world-pulse bg-[var(--accent)]'
                }`}
              />
              <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                {pulsePaused ? copy.paused : `${copy.livingWorld} · ${pulseSecondsLeft}s`}
              </span>
              <div className="h-1 w-10 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-700"
                  style={{ width: `${pulsePaused ? 0 : progressPct}%` }}
                />
              </div>
              <button
                type="button"
                onClick={onTogglePulsePause}
                title={pulsePaused ? 'Retomar Mundo Vivo' : 'Pausar Mundo Vivo'}
                className="rounded-full p-1 text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              >
                {pulsePaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              </button>
              <button
                type="button"
                onClick={onAdvanceWorldNow}
                disabled={isBusy}
                title={copy.advanceWorld}
                className="rounded-full p-1 text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--accent)] disabled:opacity-40"
              >
                <FastForward className="h-3 w-3" />
              </button>
            </div>
          ) : null}

          {view === 'stage' ? (
            <button
              type="button"
              onClick={onToggleFocus}
              title={copy.focusMode}
              className={`hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition lg:inline-flex ${
                focusMode
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
              }`}
            >
              {focusMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              <span>{copy.focusMode}</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => onOpenSettings('ai')}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
              usingGemini
                ? 'border-[var(--success)]/40 bg-[var(--success)]/10 text-[var(--success)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
            }`}
          >
            <Sparkles className="h-3 w-3" />
            <span>{usingGemini ? copy.geminiBadge : copy.demoBadge}</span>
          </button>

          <button
            type="button"
            onClick={onToggleColorMode}
            title={settings.colorMode === 'dark' ? 'Modo Papel Claro' : 'Modo Atmosférico Escuro'}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            {settings.colorMode === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onOpenSettings('game')}
            title={copy.settings}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
