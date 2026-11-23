import {
  ChevronLeft,
  Compass,
  Eye,
  EyeOff,
  FastForward,
  Flame,
  Heart,
  Map as MapIcon,
  MapPin,
  Moon,
  Pause,
  Play,
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
            <div className="hidden min-w-0 items-center gap-2 border-l border-[var(--border-subtle)] pl-3 md:flex">
              <span className="truncate font-medium text-sm text-[var(--text-primary)] max-w-[165px]">
                {campaign.world.title}
              </span>
              <button
                type="button"
                onClick={onOpenMap}
                title="Abrir Mapa Visual do Mundo"
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-0.5 text-xs text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <MapPin className="h-3 w-3 text-[var(--accent)]" />
                <span className="truncate max-w-[130px]">{campaign.currentLocation}</span>
              </button>
              {campaign.worldClock ? (
                (() => {
                  const wt = campaign.worldClock.weatherType ?? 'cloudy';
                  const WIcon = WEATHER_ICON[wt];
                  const wMeta = WEATHER_META[wt];
                  const timeStr = formatClockTime(
                    campaign.worldClock.hour ?? 8,
                    campaign.worldClock.minute ?? 30,
                  );
                  return (
                    <button
                      type="button"
                      onClick={onOpenClock}
                      title={`${wMeta.label[settings.language]} · ${wMeta.effectHint[settings.language]} (Clique para personalizar relógio, ritmo e clima)`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-0.5 text-[11px] text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
                    >
                      <WIcon className="h-3 w-3 shrink-0" style={{ color: wMeta.color }} />
                      <span className="font-mono-tech font-medium text-[var(--text-primary)]">
                        D{campaign.worldClock.day} · {timeStr}
                      </span>
                      <span className="hidden xl:inline text-[var(--text-muted)]">
                        {WORLD_PERIOD_META[campaign.worldClock.period].label[settings.language]}
                      </span>
                    </button>
                  );
                })()
              ) : null}
              {campaign.worldClock?.countdown ? (
                <button
                  type="button"
                  onClick={onOpenClock}
                  className="hidden items-center gap-1 rounded-full border border-[var(--warning)]/40 bg-[var(--warning)]/12 px-2 py-0.5 text-[10px] font-semibold text-[var(--warning)] transition hover:brightness-110 2xl:inline-flex"
                >
                  {campaign.worldClock.countdown.daysLeft}d · {campaign.worldClock.countdown.label}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Right: Character, Clock (mobile), Map, Rest, Saves, Living World Pulse, Focus, Audio, Mode & Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {view === 'stage' && campaign ? (
            <>
              {campaign.worldClock && onOpenClock ? (
                (() => {
                  const wt = campaign.worldClock.weatherType ?? 'cloudy';
                  const WIcon = WEATHER_ICON[wt];
                  const wMeta = WEATHER_META[wt];
                  return (
                    <button
                      type="button"
                      onClick={onOpenClock}
                      title="Relógio & Clima"
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] md:hidden"
                    >
                      <WIcon className="h-3.5 w-3.5" style={{ color: wMeta.color }} />
                      <span className="font-mono-tech">
                        {formatClockTime(
                          campaign.worldClock.hour ?? 8,
                          campaign.worldClock.minute ?? 30,
                        )}
                      </span>
                    </button>
                  );
                })()
              ) : null}

              {onOpenCharacterInventory ? (
                <button
                  type="button"
                  onClick={onOpenCharacterInventory}
                  title="Abrir Personagem & Inventário Visual (BG3)"
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  <Shield className="h-3.5 w-3.5 text-[var(--accent)]" />
                  <span className="hidden lg:inline">Inventário</span>
                </button>
              ) : null}

              {onOpenRelationships ? (
                (() => {
                  const partyCount = campaign.codex.npcs.filter(
                    (n) => n.inParty && n.status === 'alive',
                  ).length;
                  return (
                    <button
                      type="button"
                      onClick={onOpenRelationships}
                      title="Abrir Companheiros & Relacionamentos (Fichas BG3 & Teia SVG)"
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[#f472b6] hover:text-[#f472b6]"
                    >
                      <Heart className="h-3.5 w-3.5 text-[#f472b6]" />
                      <span className="hidden lg:inline">Vínculos</span>
                      {partyCount > 0 ? (
                        <span className="font-mono-tech rounded bg-[#f472b6]/15 px-1 text-[10px] font-semibold text-[#f472b6]">
                          {partyCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })()
              ) : null}

              <button
                type="button"
                onClick={onOpenMap}
                title="Mapa Visual & Atlas"
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <MapIcon className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">Mapa</span>
              </button>

              {campaign.status === 'active' && onLongRest ? (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={onLongRest}
                  title="Abrir Pausa / Descanso (Curto ou Longo)"
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--success)] hover:text-[var(--success)] disabled:opacity-45"
                >
                  <Flame className="h-3.5 w-3.5 text-[#fb923c]" />
                  <span className="hidden md:inline">Descansar</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={onOpenSaves}
                title="Salvar ou carregar um ponto desta crônica"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)]"
              >
                <Save className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Saves</span>
                {saveSlotCount > 0 ? (
                  <span className="font-mono-tech rounded bg-[var(--accent-soft)] px-1.5 text-[10px]">
                    {saveSlotCount}
                  </span>
                ) : null}
              </button>
            </>
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

          {onToggleAmbientSound ? (
            <button
              type="button"
              onClick={onToggleAmbientSound}
              title={
                settings.ambientSoundEnabled
                  ? 'Silenciar Som Ambiente'
                  : 'Ativar Som Ambiente Procedural'
              }
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
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
