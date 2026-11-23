import {
  AlertTriangle,
  BookmarkPlus,
  CheckCircle2,
  Compass,
  MapPin,
  Newspaper,
  Radio,
  RefreshCw,
  ScrollText,
  Signal,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';
import {
  formatClockTime,
  WEATHER_META,
} from '../engine/rpgSystem';
import type {
  Campaign,
  LanguageId,
  RumorUrgency,
  WorldRumorItem,
  WorldThemeId,
} from '../types/game';

interface NewsRumorsModalProps {
  open: boolean;
  campaign: Campaign;
  language: LanguageId;
  isFetching: boolean;
  isBusy: boolean;
  onClose: () => void;
  onFetchRumors: () => void;
  onInvestigateRumor: (rumor: WorldRumorItem) => void;
  onTrackRumorQuest: (rumor: WorldRumorItem) => void;
}

const CHANNEL_THEME_META: Record<
  WorldThemeId,
  {
    title: string;
    subtitle: string;
    buttonLabel: string;
    accent: string;
    Icon: typeof Radio;
  }
> = {
  zombies: {
    title: 'Frequência de Rádio & Boletins',
    subtitle: 'Monitoramento de emergência, notícias civis e transmissões locais',
    buttonLabel: 'Sintonizar Frequências',
    accent: '#86efac',
    Icon: Radio,
  },
  apocalyptic: {
    title: 'Onda Curta & Rádio dos Comboios',
    subtitle: 'Sinais interceptados nas estradas, alertas e trocas entre refúgios',
    buttonLabel: 'Varrer Onda Curta',
    accent: '#fb923c',
    Icon: Radio,
  },
  cyberpunk: {
    title: 'Feed Darknet & Rede Urbana',
    subtitle: 'Vazamentos corporativos, contratos de sombra e alertas de setor',
    buttonLabel: 'Atualizar Feed Darknet',
    accent: '#38bdf8',
    Icon: Terminal,
  },
  mystery: {
    title: 'Edição Extra & Boletim Policial',
    subtitle: 'Recortes do dia, ocorrências discretas e sussurros na cidade',
    buttonLabel: 'Buscar Novas Pistas',
    accent: '#fbbf24',
    Icon: Newspaper,
  },
  fantasy: {
    title: 'Quadro da Taverna & Pergaminhos',
    subtitle: 'Contratos afixados, rumores de estradas e notícias dos reinos',
    buttonLabel: 'Ouvir Novos Boatos',
    accent: '#d4af37',
    Icon: ScrollText,
  },
};

const URGENCY_META: Record<
  RumorUrgency,
  { label: string; color: string; bg: string }
> = {
  urgent: {
    label: 'URGENTE',
    color: '#f87171',
    bg: 'rgba(248, 113, 113, 0.14)',
  },
  medium: {
    label: 'EM DESTAQUE',
    color: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.14)',
  },
  low: {
    label: 'RUMOR',
    color: '#93c5fd',
    bg: 'rgba(147, 197, 253, 0.14)',
  },
};

export function NewsRumorsModal({
  open,
  campaign,
  language,
  isFetching,
  isBusy,
  onClose,
  onFetchRumors,
  onInvestigateRumor,
  onTrackRumorQuest,
}: NewsRumorsModalProps) {
  if (!open) return null;

  const theme = campaign.world.primaryTheme;
  const meta = CHANNEL_THEME_META[theme] ?? CHANNEL_THEME_META.fantasy;
  const ThemeIcon = meta.Icon;
  const clock = campaign.worldClock;
  const rumors = campaign.rumors ?? [];
  const isEnded =
    campaign.status === 'ended_fallen' || campaign.status === 'ended_victory';

  const weatherMeta = clock
    ? WEATHER_META[clock.weatherType ?? 'cloudy']
    : null;

  return (
    <div
      onClick={onClose}
      className="animate-backdrop-in fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2.5 sm:p-4 backdrop-blur-md"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-modal-spring flex h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-2xl"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-strong)]"
              style={{ backgroundColor: `${meta.accent}18`, color: meta.accent }}
            >
              <ThemeIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display truncate text-sm font-semibold text-[var(--text-primary)] sm:text-base">
                  {meta.title}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--success)]">
                  <Signal className="h-2.5 w-2.5" />
                  AO VIVO
                </span>
              </div>
              <p className="truncate text-[11px] text-[var(--text-muted)]">
                {meta.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEnded ? (
              <button
                type="button"
                disabled={isFetching}
                onClick={onFetchRumors}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--accent-ink)] transition hover:brightness-110 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}
                />
                <span>{isFetching ? 'Sintonizando...' : meta.buttonLabel}</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--border-subtle)] p-1.5 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Live Context Telemetry Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/70 px-4 py-2 text-[11px] text-[var(--text-secondary)] sm:px-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 text-[var(--accent)]" />
              {campaign.currentLocation}
            </span>
            {clock ? (
              <span className="font-mono-tech text-[var(--text-primary)]">
                Dia {clock.day} · {formatClockTime(clock.hour ?? 8, clock.minute ?? 30)}
              </span>
            ) : null}
            {weatherMeta ? (
              <span style={{ color: weatherMeta.color }}>
                {weatherMeta.label[language]}
              </span>
            ) : null}
          </div>
          {clock?.countdown ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--warning)]/40 bg-[var(--warning)]/12 px-2 py-0.5 text-[10px] font-semibold text-[var(--warning)]">
              <AlertTriangle className="h-3 w-3" />
              {clock.countdown.daysLeft}d · {clock.countdown.label}
            </span>
          ) : null}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {rumors.length === 0 ? (
            <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-canvas)]/40 p-6 text-center">
              <ThemeIcon
                className="mb-3 h-10 w-10 opacity-75"
                style={{ color: meta.accent }}
              />
              <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">
                Nenhum boletim captado ainda
              </h3>
              <p className="mt-1.5 max-w-md text-xs leading-relaxed text-[var(--text-muted)]">
                Clique em <strong>{meta.buttonLabel}</strong> para ouvir o que está acontecendo no mundo agora (no dia e hora exatos da sua campanha) e descobrir ganchos, suprimentos e missões extras.
              </p>
              {!isEnded ? (
                <button
                  type="button"
                  disabled={isFetching}
                  onClick={onFetchRumors}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-semibold text-[var(--accent-ink)] transition hover:brightness-110 disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  {isFetching ? 'Captando sinais do mundo...' : meta.buttonLabel}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {rumors.map((rumor) => {
                const urg = URGENCY_META[rumor.urgency] ?? URGENCY_META.medium;
                const alreadyTracked = campaign.player.quests.some(
                  (q) =>
                    q.title.toLowerCase() ===
                    (rumor.questTitle || rumor.headline).toLowerCase(),
                );
                return (
                  <article
                    key={rumor.id}
                    className={`rounded-2xl border p-4 transition ${
                      rumor.investigated
                        ? 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 opacity-75'
                        : 'border-[var(--border-strong)]/60 bg-[var(--bg-elevated)] hover:border-[var(--accent)]/60'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px]">
                          <span
                            className="rounded-full px-2 py-0.5 font-bold tracking-wider"
                            style={{ color: urg.color, backgroundColor: urg.bg }}
                          >
                            {urg.label}
                          </span>
                          <span className="font-semibold text-[var(--text-secondary)]">
                            {rumor.source}
                          </span>
                          <span className="text-[var(--text-muted)]">·</span>
                          <span className="font-mono-tech text-[var(--text-muted)]">
                            Dia {rumor.dayGenerated}, {rumor.timeGenerated}
                          </span>
                          {rumor.locationHint ? (
                            <span className="inline-flex items-center gap-1 rounded bg-[var(--bg-surface)] px-1.5 py-0.5 text-[var(--accent)]">
                              <MapPin className="h-2.5 w-2.5" />
                              {rumor.locationHint}
                            </span>
                          ) : null}
                        </div>

                        <h3 className="font-display text-sm font-semibold text-[var(--text-primary)] sm:text-[15px]">
                          {rumor.headline}
                        </h3>
                      </div>

                      {rumor.investigated ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--success)]/40 bg-[var(--success)]/12 px-2 py-0.5 text-[10px] font-semibold text-[var(--success)]">
                          <CheckCircle2 className="h-3 w-3" />
                          Investigado
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-[13px]">
                      {rumor.body}
                    </p>

                    {!isEnded ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-3">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            onInvestigateRumor(rumor);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-ink)] transition hover:brightness-110 disabled:opacity-45"
                        >
                          <Compass className="h-3.5 w-3.5" />
                          Investigar Agora
                        </button>

                        <button
                          type="button"
                          disabled={alreadyTracked}
                          onClick={() => onTrackRumorQuest(rumor)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
                        >
                          <BookmarkPlus className="h-3.5 w-3.5" />
                          {alreadyTracked ? 'Já está em Missões' : 'Salvar como Missão'}
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
