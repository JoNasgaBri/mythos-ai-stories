import {
  AlertTriangle,
  ChevronLeft,
  Compass,
  MapPin,
  Moon,
  PanelLeft,
  PanelRight,
  Settings,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { UI_COPY } from '../data/presets';
import { formatClockTime, WEATHER_META } from '../engine/rpgSystem';
import type { AppSettings, AppView, Campaign } from '../types/game';
import { WEATHER_ICON } from './ClockWeatherPopover';
import type { ZenRailMode } from './ZenLeftRail';

interface TopBarProps {
  view: AppView;
  campaign: Campaign | null;
  settings: AppSettings;
  usingGemini: boolean;
  leftRailMode: ZenRailMode;
  rightHudOpen: boolean;
  onBackHome: () => void;
  onToggleLeftRail: () => void;
  onToggleRightHud: () => void;
  onOpenClock?: () => void;
  onOpenMap?: () => void;
  onToggleAmbientSound?: () => void;
  onToggleColorMode: () => void;
  onOpenSettings: (initialTab?: 'ai' | 'game' | 'reading') => void;
}

export function TopBar({
  view,
  campaign,
  settings,
  usingGemini,
  leftRailMode,
  rightHudOpen,
  onBackHome,
  onToggleLeftRail,
  onToggleRightHud,
  onOpenClock,
  onOpenMap,
  onToggleAmbientSound,
  onToggleColorMode,
  onOpenSettings,
}: TopBarProps) {
  const copy = UI_COPY[settings.language];
  const isStage = view === 'stage' && Boolean(campaign);
  const clock = campaign?.worldClock;
  const weatherType = clock?.weatherType ?? 'cloudy';
  const WeatherIcon = WEATHER_ICON[weatherType];
  const weatherMeta = WEATHER_META[weatherType];
  const timeStr = clock
    ? formatClockTime(clock.hour ?? 8, clock.minute ?? 30)
    : null;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)]/80 bg-[var(--bg-glass)] backdrop-blur-2xl">
      <div className="mx-auto grid h-10 max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-2 px-2.5 sm:h-9 sm:px-4">
        {/* Left: GNOME Activities / Left Zen Rail Toggle + Brand */}
        <div className="flex min-w-0 items-center gap-1.5">
          {isStage ? (
            <button
              type="button"
              onClick={onToggleLeftRail}
              title={
                leftRailMode === 'pinned'
                  ? 'Modo Zen Compacto (Barra Esquerda)'
                  : leftRailMode === 'compact'
                    ? 'Fixar Barra Esquerda em Split'
                    : 'Mostrar Barra Esquerda'
              }
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${
                leftRailMode === 'pinned'
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-subtle)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
              }`}
            >
              <PanelLeft className="h-3.5 w-3.5" />
            </button>
          ) : null}

          {view !== 'home' ? (
            <button
              type="button"
              onClick={onBackHome}
              title={copy.backHome}
              className="inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[11px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{copy.backHome}</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={onBackHome}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-1.5 py-0.5 text-left transition hover:bg-[var(--bg-surface)]"
          >
            <Compass className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span className="font-display text-xs font-semibold tracking-[0.18em] text-[var(--text-primary)]">
              MYTHOS
            </span>
          </button>

          {isStage && campaign ? (
            <span
              title={campaign.world.title}
              className="hidden max-w-[160px] truncate border-l border-[var(--border-subtle)] pl-2 text-[11px] font-medium text-[var(--text-muted)] xl:inline"
            >
              {campaign.world.title}
            </span>
          ) : null}
        </div>

        {/* Center: Iconic GNOME Center Clock, Weather, Location & Countdown Pill */}
        <div className="flex min-w-0 items-center justify-center gap-1.5">
          {isStage && campaign ? (
            <>
              {clock && timeStr ? (
                <button
                  type="button"
                  onClick={onOpenClock}
                  title={`Dia ${clock.day} · ${timeStr} · ${weatherMeta.label[settings.language]} — Clique para ajustar relógio, ritmo e clima`}
                  className="inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--border-subtle)]/80 bg-[var(--bg-surface)]/80 px-2.5 text-[11px] font-medium text-[var(--text-primary)] transition hover:border-[var(--accent)]"
                >
                  <WeatherIcon
                    className="h-3 w-3 shrink-0"
                    style={{ color: weatherMeta.color }}
                  />
                  <span className="font-mono-tech font-semibold">
                    <span className="hidden sm:inline">D{clock.day} · </span>
                    {timeStr}
                  </span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={onOpenMap}
                title={`Local atual: ${campaign.currentLocation} (Abrir Mapa Visual)`}
                className="hidden h-7 max-w-[165px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-transparent px-2 text-[11px] text-[var(--text-secondary)] transition hover:border-[var(--border-subtle)] hover:bg-[var(--bg-surface)] hover:text-[var(--accent)] md:inline-flex"
              >
                <MapPin className="h-3 w-3 shrink-0 text-[var(--accent)]" />
                <span className="truncate">{campaign.currentLocation}</span>
              </button>

              {clock?.countdown ? (
                <button
                  type="button"
                  onClick={onOpenClock}
                  title={`${clock.countdown.daysLeft}d · ${clock.countdown.label}`}
                  className="hidden h-6 max-w-[175px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[var(--warning)]/35 bg-[var(--warning)]/12 px-2 text-[10px] font-semibold text-[var(--warning)] transition hover:brightness-110 lg:inline-flex xl:max-w-[220px]"
                >
                  <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">
                    {clock.countdown.daysLeft}d · {clock.countdown.label}
                  </span>
                </button>
              ) : null}
            </>
          ) : null}
        </div>

        {/* Right: GNOME Quick Settings Pill + Right Zen Split Toggle */}
        <div className="flex items-center justify-end gap-1.5">
          <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-[var(--border-subtle)]/80 bg-[var(--bg-surface)]/75 px-1 py-0.5">
            <button
              type="button"
              onClick={() => onOpenSettings('ai')}
              title={usingGemini ? 'Gemini IA Conectado' : 'Modo Demo Local'}
              className={`inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[10px] font-semibold transition ${
                usingGemini
                  ? 'text-[var(--success)] hover:bg-[var(--success)]/12'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Sparkles className="h-3 w-3 shrink-0" />
              <span className="hidden sm:inline">
                {usingGemini ? 'IA' : 'Demo'}
              </span>
            </button>

            {onToggleAmbientSound ? (
              <button
                type="button"
                onClick={onToggleAmbientSound}
                title={
                  settings.ambientSoundEnabled
                    ? 'Silenciar Som Ambiente'
                    : 'Ativar Som Ambiente'
                }
                className={`flex h-6 w-6 items-center justify-center rounded-full transition ${
                  settings.ambientSoundEnabled
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                }`}
              >
                {settings.ambientSoundEnabled ? (
                  <Volume2 className="h-3.5 w-3.5" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5" />
                )}
              </button>
            ) : null}

            <button
              type="button"
              onClick={onToggleColorMode}
              title={
                settings.colorMode === 'dark'
                  ? 'Modo Papel Claro'
                  : 'Modo Atmosférico Escuro'
              }
              className="hidden h-6 w-6 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] sm:flex"
            >
              {settings.colorMode === 'dark' ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onOpenSettings('game')}
              title="Configurações"
              className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>

          {isStage ? (
            <button
              type="button"
              onClick={onToggleRightHud}
              title={
                rightHudOpen
                  ? 'Recolher Painel Direito (Ficha & Mundo)'
                  : 'Expandir Painel Direito (Ficha & Mundo)'
              }
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${
                rightHudOpen
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-subtle)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
              }`}
            >
              <PanelRight className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
