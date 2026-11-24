import {
  AlertTriangle,
  BookOpen,
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
  Zap,
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
  onOpenWorldEvent?: () => void;
  isGeneratingEvent?: boolean;
  onToggleAmbientSound?: () => void;
  onToggleColorMode: () => void;
  onOpenDocs?: () => void;
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
  onOpenWorldEvent,
  isGeneratingEvent,
  onToggleAmbientSound,
  onToggleColorMode,
  onOpenDocs,
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
  const urgentCountdown =
    Boolean(clock?.countdown) && (clock?.countdown?.daysLeft ?? 99) <= 2;

  return (
    <header
      className="pointer-events-none sticky top-0 z-30 w-full shrink-0 px-2 pb-1 sm:px-4"
      style={{ paddingTop: 'max(0.45rem, env(safe-area-inset-top))' }}
    >
      <div className="mx-auto grid h-9 w-full max-w-[1860px] grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2">
        {/* Left Floating Island: Zen Left Toggle + Navigation + Brand */}
        <div className="flex min-w-0 items-center justify-start">
          <div className="animate-island-drop pointer-events-auto inline-flex h-9 max-w-full items-center gap-0.5 sm:gap-1 rounded-full border border-[var(--border-subtle)]/90 bg-[var(--bg-glass)] px-1 sm:px-1.5 shadow-[0_6px_24px_rgba(0,0,0,0.28)] backdrop-blur-2xl transition-all duration-200 hover:border-[var(--border-strong)]">
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
                    : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
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
                className="inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-1.5 sm:px-2 text-[11px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{copy.backHome}</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={onBackHome}
              className={`flex h-7 shrink-0 items-center gap-1.5 rounded-full px-1.5 sm:px-2 text-left transition hover:bg-[var(--bg-surface)] ${
                isStage ? 'hidden sm:flex' : 'flex'
              }`}
            >
              <Compass className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span className="font-display text-xs font-semibold tracking-[0.18em] text-[var(--text-primary)]">
                MYTHOS
              </span>
            </button>

            {isStage && campaign ? (
              <span
                title={campaign.world.title}
                className="hidden max-w-[180px] truncate border-l border-[var(--border-subtle)]/80 pr-2 pl-2.5 text-[11px] font-medium text-[var(--text-muted)] xl:inline"
              >
                {campaign.world.title}
              </span>
            ) : null}
          </div>
        </div>

        {/* Center Floating Dynamic Island (iPhone-inspired pill, only during stage) */}
        <div className="flex min-w-0 items-center justify-center">
          {isStage && campaign ? (
            <div
              style={{ animationDelay: '45ms' }}
              className={`animate-island-drop pointer-events-auto inline-flex h-9 items-center gap-1 rounded-full border bg-[var(--bg-surface)]/92 px-2 shadow-[0_8px_30px_rgba(0,0,0,0.42)] backdrop-blur-2xl transition-all duration-300 hover:scale-[1.02] ${
                urgentCountdown
                  ? 'border-[var(--warning)]/55'
                  : 'border-[var(--border-strong)]/80 hover:border-[var(--accent)]/60'
              }`}
            >
              {clock && timeStr ? (
                <button
                  type="button"
                  onClick={onOpenClock}
                  title={`Dia ${clock.day} · ${timeStr} · ${weatherMeta.label[settings.language]} — Clique para ajustar relógio, ritmo e clima`}
                  className="inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[11px] font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-elevated)]"
                >
                  <WeatherIcon
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: weatherMeta.color }}
                  />
                  <span className="font-mono-tech font-semibold tracking-tight">
                    <span className="hidden sm:inline">D{clock.day} · </span>
                    {timeStr}
                  </span>
                </button>
              ) : null}

              {clock && timeStr ? (
                <span className="h-3.5 w-px bg-[var(--border-subtle)]" />
              ) : null}

              <button
                type="button"
                onClick={onOpenMap}
                title={`Local atual: ${campaign.currentLocation} (Abrir Mapa Visual)`}
                className="inline-flex h-7 max-w-[200px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-1.5 sm:px-2 text-[11px] text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--accent)] xl:max-w-[250px]"
              >
                <MapPin className="h-3.5 w-3.5 md:h-3 md:w-3 shrink-0 text-[var(--accent)]" />
                <span className="hidden truncate md:inline">{campaign.currentLocation}</span>
              </button>

              {clock?.countdown ? (
                <>
                  <span className="hidden h-3.5 w-px bg-[var(--border-subtle)] lg:block" />
                  <button
                    type="button"
                    onClick={onOpenClock}
                    title={`${clock.countdown.daysLeft}d · ${clock.countdown.label}`}
                    className={`hidden h-6 max-w-[200px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[10px] font-semibold transition hover:brightness-110 lg:inline-flex xl:max-w-[260px] ${
                      urgentCountdown
                        ? 'bg-[var(--warning)]/18 text-[var(--warning)]'
                        : 'bg-[var(--bg-elevated)] text-[var(--warning)]'
                    }`}
                  >
                    <AlertTriangle
                      className={`h-3 w-3 shrink-0 ${
                        urgentCountdown ? 'animate-pulse' : ''
                      }`}
                    />
                    <span className="truncate">
                      {clock.countdown.daysLeft}d · {clock.countdown.label}
                    </span>
                  </button>
                </>
              ) : null}

              {campaign.activeWorldEvent && onOpenWorldEvent ? (
                <>
                  <span className="h-3.5 w-px bg-[var(--border-subtle)]" />
                  <button
                    type="button"
                    onClick={onOpenWorldEvent}
                    title={`Evento ativo: ${campaign.activeWorldEvent.title} — Clique para decidir!`}
                    className="inline-flex h-6 max-w-[165px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[#fbbf24]/55 bg-[#fbbf24]/20 px-2.5 text-[10px] font-bold text-[#fbbf24] shadow-sm transition hover:scale-[1.03] hover:bg-[#fbbf24]/30"
                  >
                    <Zap className="h-3 w-3 shrink-0 animate-pulse" />
                    <span className="truncate">
                      {campaign.activeWorldEvent.title}
                    </span>
                  </button>
                </>
              ) : isGeneratingEvent ? (
                <>
                  <span className="h-3.5 w-px bg-[var(--border-subtle)]" />
                  <span className="inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-[var(--bg-elevated)] px-2 text-[10px] font-medium text-[#fbbf24]">
                    <Zap className="h-3 w-3 animate-pulse" />
                    <span className="hidden sm:inline">Mundo...</span>
                  </span>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Right Floating Island: System Controls + Zen Right Split Toggle */}
        <div className="flex items-center justify-end">
          <div
            style={{ animationDelay: '90ms' }}
            className="animate-island-drop pointer-events-auto inline-flex h-9 shrink-0 items-center gap-0.5 rounded-full border border-[var(--border-subtle)]/90 bg-[var(--bg-glass)] px-1.5 shadow-[0_6px_24px_rgba(0,0,0,0.28)] backdrop-blur-2xl transition-all duration-200 hover:border-[var(--border-strong)]"
          >
            <button
              type="button"
              onClick={() => onOpenSettings('ai')}
              title={usingGemini ? 'Gemini IA Conectado' : 'Modo Demo Local'}
              className={`inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[10px] font-semibold transition ${
                usingGemini
                  ? 'text-[var(--success)] hover:bg-[var(--success)]/12'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
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
                className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                  settings.ambientSoundEnabled
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
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
              className="hidden h-7 w-7 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] sm:flex"
            >
              {settings.colorMode === 'dark' ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </button>

            {onOpenDocs ? (
              <button
                type="button"
                onClick={onOpenDocs}
                title={
                  view === 'docs'
                    ? 'Fechar Documentação e voltar'
                    : 'Documentação & Guias do MYTHOS'
                }
                className={`inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[10px] font-semibold transition ${
                  view === 'docs'
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden md:inline">Docs</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => onOpenSettings('game')}
              title="Configurações"
              className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>

            {isStage ? (
              <>
                <span className="mx-0.5 h-3.5 w-px bg-[var(--border-subtle)]" />
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
                      : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <PanelRight className="h-3.5 w-3.5" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
