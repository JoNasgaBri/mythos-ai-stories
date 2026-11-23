import {
  AlertTriangle,
  ChevronLeft,
  Compass,
  Eye,
  EyeOff,
  FastForward,
  Flame,
  Hammer,
  Heart,
  Map as MapIcon,
  MapPin,
  Moon,
  Pause,
  Play,
  Radio,
  Save,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { UI_COPY } from '../data/presets';
import {
  formatClockTime,
  WEATHER_META,
  WORLD_PERIOD_META,
} from '../engine/rpgSystem';
import type { AppSettings, AppView, Campaign } from '../types/game';
import { WEATHER_ICON } from './ClockWeatherPopover';

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
  onOpenMap?: () => void;
  onOpenClock?: () => void;
  onOpenCharacterInventory?: () => void;
  onOpenRelationships?: () => void;
  onOpenRumors?: () => void;
  onOpenWorkbench?: () => void;
  onLongRest?: () => void;
  onToggleAmbientSound?: () => void;
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
  onOpenMap,
  onOpenClock,
  onOpenCharacterInventory,
  onOpenRelationships,
  onOpenRumors,
  onOpenWorkbench,
  onLongRest,
  onToggleAmbientSound,
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
          Math.min(
            100,
            ((settings.livingWorldSeconds - pulseSecondsLeft) /
              settings.livingWorldSeconds) *
              100,
          ),
        )
      : 0;

  const isStage = view === 'stage' && Boolean(campaign);
  const clock = campaign?.worldClock;
  const weatherType = clock?.weatherType ?? 'cloudy';
  const WeatherIcon = WEATHER_ICON[weatherType];
  const weatherMeta = WEATHER_META[weatherType];
  const timeStr = clock
    ? formatClockTime(clock.hour ?? 8, clock.minute ?? 30)
    : null;
  const partyCount =
    campaign?.codex.npcs.filter((n) => n.inParty && n.status === 'alive')
      .length ?? 0;
  const freshRumors =
    campaign?.rumors?.filter((r) => !r.investigated).length ?? 0;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-glass)] backdrop-blur-xl">
      {/* Tier 1: Brand, Live Telemetry & System Controls */}
      <div className="mx-auto flex h-12 max-w-[1440px] items-center justify-between gap-2 px-3 sm:px-6">
        {/* Left: Back + Brand + Campaign Title */}
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          {view !== 'home' ? (
            <button
              type="button"
              onClick={onBackHome}
              title={copy.backHome}
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{copy.backHome}</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={onBackHome}
            className="flex shrink-0 items-center gap-2 text-left transition hover:opacity-85"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--accent)]">
              <Compass className="h-4 w-4" />
            </span>
            <span className="font-display text-sm font-semibold tracking-[0.18em] text-[var(--text-primary)]">
              MYTHOS
            </span>
          </button>

          {isStage && campaign ? (
            <span
              title={campaign.world.title}
              className="hidden max-w-[155px] truncate border-l border-[var(--border-subtle)] pl-2.5 text-xs font-semibold text-[var(--text-secondary)] xl:inline"
            >
              {campaign.world.title}
            </span>
          ) : null}
        </div>

        {/* Center: Live World Telemetry (Desktop, strictly single-line & truncated) */}
        {isStage && campaign ? (
          <div className="hidden min-w-0 flex-1 items-center justify-center gap-1.5 px-2 md:flex">
            <button
              type="button"
              onClick={onOpenMap}
              title={`Local atual: ${campaign.currentLocation} (Abrir Mapa)`}
              className="inline-flex max-w-[170px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <MapPin className="h-3 w-3 shrink-0 text-[var(--accent)]" />
              <span className="truncate">{campaign.currentLocation}</span>
            </button>

            {clock && timeStr ? (
              <button
                type="button"
                onClick={onOpenClock}
                title={`${weatherMeta.label[settings.language]} · ${weatherMeta.effectHint[settings.language]} (Clique para personalizar relógio, ritmo e clima)`}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
              >
                <WeatherIcon
                  className="h-3 w-3 shrink-0"
                  style={{ color: weatherMeta.color }}
                />
                <span className="font-mono-tech font-semibold text-[var(--text-primary)]">
                  D{clock.day} · {timeStr}
                </span>
                <span className="hidden text-[var(--text-muted)] lg:inline">
                  {WORLD_PERIOD_META[clock.period].label[settings.language]}
                </span>
              </button>
            ) : null}

            {clock?.countdown ? (
              <button
                type="button"
                onClick={onOpenClock}
                title={`${clock.countdown.daysLeft}d · ${clock.countdown.label}`}
                className="hidden max-w-[185px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[var(--warning)]/40 bg-[var(--warning)]/12 px-2.5 py-1 text-[10px] font-semibold text-[var(--warning)] transition hover:brightness-110 lg:inline-flex xl:max-w-[235px]"
              >
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {clock.countdown.daysLeft}d · {clock.countdown.label}
                </span>
              </button>
            ) : null}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Right: Compact System Controls */}
        <div className="flex shrink-0 items-center gap-1.5">
          {isStage && clock && timeStr && onOpenClock ? (
            <button
              type="button"
              onClick={onOpenClock}
              title={`Dia ${clock.day} · ${timeStr} · ${weatherMeta.label[settings.language]}`}
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)] md:hidden"
            >
              <WeatherIcon
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: weatherMeta.color }}
              />
              <span className="font-mono-tech">{timeStr}</span>
            </button>
          ) : null}

          {isStage ? (
            <button
              type="button"
              onClick={onOpenSaves}
              title="Salvar ou carregar um ponto desta crônica"
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)]"
            >
              <Save className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Saves</span>
              {saveSlotCount > 0 ? (
                <span className="font-mono-tech rounded bg-[var(--accent-soft)] px-1 text-[10px]">
                  {saveSlotCount}
                </span>
              ) : null}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => onOpenSettings('ai')}
            title={usingGemini ? 'Gemini IA Conectado' : 'Modo Demo Local'}
            className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-medium transition ${
              usingGemini
                ? 'border-[var(--success)]/40 bg-[var(--success)]/10 text-[var(--success)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
            }`}
          >
            <Sparkles className="h-3 w-3 shrink-0" />
            <span className="hidden sm:inline">
              {usingGemini ? copy.geminiBadge : copy.demoBadge}
            </span>
          </button>

          {view === 'stage' ? (
            <button
              type="button"
              onClick={onToggleFocus}
              title={focusMode ? 'Sair do Modo Foco' : copy.focusMode}
              className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition lg:flex ${
                focusMode
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
              }`}
            >
              {focusMode ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          ) : null}

          {onToggleAmbientSound ? (
            <button
              type="button"
              onClick={onToggleAmbientSound}
              title={
                settings.ambientSoundEnabled
                  ? 'Silenciar Som Ambiente'
                  : 'Ativar Som Ambiente Procedural'
              }
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
                settings.ambientSoundEnabled
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
              }`}
            >
              {settings.ambientSoundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
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
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:flex"
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
            title="Configurações"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tier 2: Tactical RPG Action Strip (Only during active Story Stage) */}
      {isStage && campaign ? (
        <div className="border-t border-[var(--border-subtle)]/70 bg-[var(--bg-canvas)]/45">
          <div className="mx-auto flex h-10 max-w-[1440px] items-center justify-between gap-2 px-3 sm:px-6">
            <nav
              aria-label="Atalhos da Campanha"
              className="no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-1"
            >
              {onOpenCharacterInventory ? (
                <button
                  type="button"
                  onClick={onOpenCharacterInventory}
                  title="Personagem, Equipamento, Depósito & Frota"
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  <Shield className="h-3.5 w-3.5 text-[var(--accent)]" />
                  <span>Inventário</span>
                </button>
              ) : null}

              {onOpenRelationships ? (
                <button
                  type="button"
                  onClick={onOpenRelationships}
                  title="Companheiros, Fichas BG3 & Teia de Vínculos"
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[#f472b6] hover:text-[#f472b6]"
                >
                  <Heart className="h-3.5 w-3.5 text-[#f472b6]" />
                  <span>Vínculos</span>
                  {partyCount > 0 ? (
                    <span className="font-mono-tech rounded bg-[#f472b6]/15 px-1.5 text-[10px] font-semibold text-[#f472b6]">
                      {partyCount}
                    </span>
                  ) : null}
                </button>
              ) : null}

              {onOpenRumors ? (
                <button
                  type="button"
                  onClick={onOpenRumors}
                  title="Rádio, Boletins & Quadro de Rumores Vivos"
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[#38bdf8] hover:text-[#38bdf8]"
                >
                  <Radio className="h-3.5 w-3.5 text-[#38bdf8]" />
                  <span>Rádio</span>
                  {freshRumors > 0 ? (
                    <span className="font-mono-tech rounded bg-[#38bdf8]/15 px-1.5 text-[10px] font-semibold text-[#38bdf8]">
                      {freshRumors}
                    </span>
                  ) : null}
                </button>
              ) : null}

              {onOpenWorkbench ? (
                <button
                  type="button"
                  onClick={onOpenWorkbench}
                  title="Bancada de Crafting & Oficina (Aprimorar Itens e Veículos)"
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[#fb923c] hover:text-[#fb923c]"
                >
                  <Hammer className="h-3.5 w-3.5 text-[#fb923c]" />
                  <span>Bancada</span>
                </button>
              ) : null}

              {onOpenMap ? (
                <button
                  type="button"
                  onClick={onOpenMap}
                  title="Mapa Visual & Atlas do Mundo"
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  <MapIcon className="h-3.5 w-3.5 text-[var(--accent)]" />
                  <span>Mapa</span>
                </button>
              ) : null}

              {campaign.status === 'active' && onLongRest ? (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={onLongRest}
                  title="Abrir Pausa / Descanso (Curto ou Longo)"
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--success)] hover:text-[var(--success)] disabled:opacity-45"
                >
                  <Flame className="h-3.5 w-3.5 text-[#fb923c]" />
                  <span>Descansar</span>
                </button>
              ) : null}
            </nav>

            {/* Optional Living World Pulse on right edge of Tier 2 */}
            {campaign.status === 'active' && settings.livingWorldEnabled ? (
              <div className="hidden shrink-0 items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-0.5 sm:flex">
                <span
                  className={`h-2 w-2 rounded-full ${
                    pulsePaused
                      ? 'bg-[var(--text-muted)]'
                      : 'animate-world-pulse bg-[var(--accent)]'
                  }`}
                />
                <span className="whitespace-nowrap text-[11px] font-medium text-[var(--text-secondary)]">
                  {pulsePaused
                    ? copy.paused
                    : `${copy.livingWorld} · ${pulseSecondsLeft}s`}
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
                  className="rounded-full p-0.5 text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                >
                  {pulsePaused ? (
                    <Play className="h-3 w-3" />
                  ) : (
                    <Pause className="h-3 w-3" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={onAdvanceWorldNow}
                  disabled={isBusy}
                  title={copy.advanceWorld}
                  className="rounded-full p-0.5 text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--accent)] disabled:opacity-40"
                >
                  <FastForward className="h-3 w-3" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
