import {
  AlertTriangle,
  CloudLightning,
  Dices,
  Heart,
  Home,
  Scale,
  Send,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import {
  ATTRIBUTE_META,
  getSupplyMetaForTheme,
  RELATIONSHIP_META,
  SUPPLY_KEYS,
} from '../engine/rpgSystem';
import type {
  Campaign,
  LanguageId,
  WorldEventCategory,
  WorldEventChoice,
  WorldEventRecord,
} from '../types/game';

interface WorldEventModalProps {
  open: boolean;
  event: WorldEventRecord | null;
  campaign: Campaign;
  language: LanguageId;
  isBusy: boolean;
  canDefer: boolean;
  onDefer: () => void;
  onSelectChoice: (choice: WorldEventChoice) => void;
  onSubmitCustomDecision: (customText: string) => void;
}

const CATEGORY_META: Record<
  WorldEventCategory,
  { label: string; accent: string; bg: string; Icon: typeof Zap }
> = {
  crisis: {
    label: 'Emergência no Mundo',
    accent: '#f87171',
    bg: 'rgba(248, 113, 113, 0.14)',
    Icon: AlertTriangle,
  },
  dilemma: {
    label: 'Dilema Decisivo',
    accent: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.14)',
    Icon: Scale,
  },
  opportunity: {
    label: 'Oportunidade Rara',
    accent: '#4ade80',
    bg: 'rgba(74, 222, 128, 0.14)',
    Icon: Sparkles,
  },
  encounter: {
    label: 'Encontro Inesperado',
    accent: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.14)',
    Icon: Users,
  },
  base: {
    label: 'Evento na Base',
    accent: '#c084fc',
    bg: 'rgba(192, 132, 252, 0.14)',
    Icon: Home,
  },
  weather: {
    label: 'Clima & Ambiente',
    accent: '#60a5fa',
    bg: 'rgba(96, 165, 250, 0.14)',
    Icon: CloudLightning,
  },
};

export function WorldEventModal({
  open,
  event,
  campaign,
  language,
  isBusy,
  canDefer,
  onDefer,
  onSelectChoice,
  onSubmitCustomDecision,
}: WorldEventModalProps) {
  const [customText, setCustomText] = useState('');

  if (!open || !event) return null;

  const meta = CATEGORY_META[event.category] ?? CATEGORY_META.dilemma;
  const CatIcon = meta.Icon;
  const supplyMeta = getSupplyMetaForTheme(campaign.world.primaryTheme);

  const reactionNpc = event.companionReaction
    ? campaign.codex.npcs.find((n) =>
        n.name
          .toLowerCase()
          .includes(event.companionReaction!.speaker.toLowerCase()),
      )
    : undefined;
  const reactionRel = reactionNpc
    ? RELATIONSHIP_META[reactionNpc.relationship ?? 'friend']
    : null;
  const isRomanticCompanion =
    reactionNpc?.relationship === 'romance' ||
    reactionNpc?.relationship === 'partner';

  const buildImpactChips = (choice: WorldEventChoice) => {
    const chips: Array<{ label: string; positive?: boolean; neutral?: boolean }> = [];

    if (choice.requiresRoll) {
      const attrShort = choice.attribute
        ? ATTRIBUTE_META[choice.attribute].short[language]
        : 'd20';
      chips.push({ label: `Teste d20 (${attrShort})`, neutral: true });
    }

    if (choice.supplyDeltas) {
      for (const k of SUPPLY_KEYS) {
        const d = choice.supplyDeltas[k];
        if (typeof d === 'number' && d !== 0) {
          chips.push({
            label: `${d > 0 ? '+' : ''}${d} ${supplyMeta[k].label}`,
            positive: d > 0,
          });
        }
      }
    }
    if (typeof choice.currencyDelta === 'number' && choice.currencyDelta !== 0) {
      const unit = campaign.player.currency?.label ?? 'Ouro';
      chips.push({
        label: `${choice.currencyDelta > 0 ? '+' : ''}${choice.currencyDelta} ${unit}`,
        positive: choice.currencyDelta > 0,
      });
    }
    if (typeof choice.defenseDelta === 'number' && choice.defenseDelta !== 0) {
      chips.push({
        label: `${choice.defenseDelta > 0 ? '+' : ''}${choice.defenseDelta} Defesa`,
        positive: choice.defenseDelta > 0,
      });
    }
    if (typeof choice.affinityDelta === 'number' && choice.affinityDelta !== 0) {
      chips.push({
        label: `${choice.affinityDelta > 0 ? '+' : ''}${choice.affinityDelta} Afinidade${choice.targetNpcName ? ` (${choice.targetNpcName})` : ''}`,
        positive: choice.affinityDelta > 0,
      });
    }
    if (typeof choice.vigorDelta === 'number' && choice.vigorDelta !== 0) {
      chips.push({
        label: `${choice.vigorDelta > 0 ? '+' : ''}${choice.vigorDelta} Vigor`,
        positive: choice.vigorDelta > 0,
      });
    }
    if (typeof choice.tensionDelta === 'number' && choice.tensionDelta !== 0) {
      chips.push({
        label: `${choice.tensionDelta > 0 ? '+' : ''}${choice.tensionDelta} Tensão`,
        positive: choice.tensionDelta < 0,
      });
    }
    return chips;
  };

  const handleCustomSubmit = () => {
    const trimmed = customText.trim();
    if (!trimmed || isBusy) return;
    setCustomText('');
    onSubmitCustomDecision(trimmed);
  };

  return (
    <div
      onClick={canDefer ? onDefer : undefined}
      className="animate-backdrop-in fixed inset-0 z-50 flex items-center justify-center bg-black/78 p-2.5 sm:p-4 backdrop-blur-md"
      role="dialog"
      aria-label="Evento Dinâmico do Mundo"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-modal-spring flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border bg-[var(--bg-surface)] shadow-[0_24px_70px_rgba(0,0,0,0.65)]"
        style={{ borderColor: `${meta.accent}60` }}
      >
        {/* Dramatic Category Header */}
        <div
          className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4"
          style={{
            background: `linear-gradient(135deg, ${meta.bg}, transparent 75%)`,
          }}
        >
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border"
              style={{
                borderColor: `${meta.accent}60`,
                backgroundColor: meta.bg,
                color: meta.accent,
              }}
            >
              <CatIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                <span style={{ color: meta.accent }}>{meta.label}</span>
                <span className="text-[var(--text-muted)]">·</span>
                <span className="font-mono-tech text-[var(--text-secondary)]">
                  Dia {event.dayTriggered} · {event.timeTriggered}
                </span>
                {event.urgency === 'urgent' ? (
                  <span className="rounded-full bg-[#f87171]/20 px-2 py-0.5 text-[9px] text-[#f87171]">
                    URGENTE
                  </span>
                ) : null}
              </div>
              <h2 className="font-display mt-0.5 text-base font-semibold text-[var(--text-primary)] sm:text-lg">
                {event.title}
              </h2>
              {event.triggerReason ? (
                <p className="mt-0.5 text-[10px] italic text-[var(--text-muted)]">
                  Gatilho do Mundo Vivo: {event.triggerReason}
                </p>
              ) : null}
            </div>
          </div>

          {canDefer ? (
            <button
              type="button"
              onClick={onDefer}
              title="Minimizar para a Dynamic Island e decidir depois"
              className="rounded-lg border border-[var(--border-subtle)] p-1.5 text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* Event Narrative */}
          <p className="font-reading text-[15px] leading-relaxed text-[var(--text-primary)] sm:text-base">
            {event.description}
          </p>

          {/* Companion Opinion Bubble */}
          {event.companionReaction ? (
            <div className="animate-bubble-left flex items-start gap-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
              {reactionNpc?.portraitUrl ? (
                <img
                  src={reactionNpc.portraitUrl}
                  alt={event.companionReaction.speaker}
                  className="h-9 w-9 shrink-0 rounded-xl border object-cover"
                  style={{ borderColor: reactionRel?.color || 'var(--accent)' }}
                />
              ) : (
                <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
                  {event.companionReaction.speaker.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span style={{ color: reactionRel?.color || 'var(--accent)' }}>
                    {event.companionReaction.speaker}
                  </span>
                  {isRomanticCompanion ? (
                    <Heart className="h-3 w-3 fill-[#f472b6] text-[#f472b6]" />
                  ) : null}
                  <span className="text-[10px] font-normal text-[var(--text-muted)]">
                    opina antes da sua decisão
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed italic text-[var(--text-secondary)] sm:text-[13px]">
                  “{event.companionReaction.quote}”
                </p>
              </div>
            </div>
          ) : null}

          {/* 3 Tactical Choices */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-[var(--accent)]" />
                Como você responde a isso?
              </span>
              <span>Escolha 1 decisão</span>
            </div>

            {event.choices.map((choice, idx) => {
              const chips = buildImpactChips(choice);
              return (
                <button
                  key={choice.id}
                  type="button"
                  disabled={isBusy}
                  style={{ animationDelay: `${idx * 55}ms` }}
                  onClick={() => onSelectChoice(choice)}
                  className="animate-choice-in group block w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-[var(--bg-elevated)]/90 hover:shadow-md disabled:opacity-45"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] sm:text-sm">
                      {idx + 1}. {choice.label}
                    </span>
                    {choice.requiresRoll ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[var(--warning)]/40 bg-[var(--warning)]/12 px-1.5 py-0.5 text-[10px] font-bold text-[var(--warning)]">
                        <Dices className="h-3 w-3" />
                        d20
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {choice.consequenceHint}
                  </p>

                  {chips.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {chips.map((chip, cIdx) => (
                        <span
                          key={cIdx}
                          className={`font-mono-tech rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                            chip.neutral
                              ? 'bg-[var(--warning)]/14 text-[var(--warning)]'
                              : chip.positive
                                ? 'bg-[var(--success)]/14 text-[var(--success)]'
                                : 'bg-[var(--danger)]/14 text-[var(--danger)]'
                          }`}
                        >
                          {chip.label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Freeform Decision Fallback */}
          <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-canvas)]/55 p-3">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Ou faça do seu próprio jeito (Decisão Livre)
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCustomSubmit();
                }}
                placeholder="Descreva exatamente como você lida com este evento..."
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
              />
              <button
                type="button"
                disabled={isBusy || !customText.trim()}
                onClick={handleCustomSubmit}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-[var(--accent-ink)] transition hover:brightness-110 disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
                Agir
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        {canDefer ? (
          <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)]/60 px-5 py-2.5 text-[11px] text-[var(--text-muted)]">
            <span>Você pode checar sua Base/Inventário antes de decidir.</span>
            <button
              type="button"
              onClick={onDefer}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Manter na Dynamic Island
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
