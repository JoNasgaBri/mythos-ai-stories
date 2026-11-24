import {
  Dices,
  Eye,
  Footprints,
  MessageSquare,
  Pencil,
  Shield,
  Sparkles,
  Swords,
  X,
} from 'lucide-react';
import { useEffect } from 'react';
import { INTENT_LABELS } from '../data/presets';
import { assessSuggestedAction } from '../engine/diceEngine';
import { ATTRIBUTE_META, formatModifier } from '../engine/rpgSystem';
import type {
  ActionIntent,
  Campaign,
  CharacterAttributes,
  DiceRollPolicy,
  LanguageId,
  TacticalAction,
} from '../types/game';

const INTENT_ICON: Record<ActionIntent, typeof Swords> = {
  bold: Swords,
  stealth: Footprints,
  diplomatic: MessageSquare,
  investigate: Eye,
  survival: Shield,
  item: Sparkles,
};

interface MobileChoicesSheetProps {
  open: boolean;
  campaign: Campaign;
  language: LanguageId;
  dicePolicy: DiceRollPolicy;
  effectiveAttrs: CharacterAttributes;
  isBusy: boolean;
  onClose: () => void;
  onSelectAction: (action: TacticalAction) => void;
  onCustomizeAction: (e: React.MouseEvent, action: TacticalAction) => void;
}

export function MobileChoicesSheet({
  open,
  campaign,
  language,
  dicePolicy,
  effectiveAttrs,
  isBusy,
  onClose,
  onSelectAction,
  onCustomizeAction,
}: MobileChoicesSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || campaign.actions.length === 0) return null;

  return (
    <div
      className="animate-backdrop-in fixed inset-0 z-50 flex flex-col justify-end bg-black/65 backdrop-blur-sm md:hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Suas Escolhas"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet-up flex max-h-[80dvh] w-full flex-col rounded-t-3xl border-t border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-[0_-16px_48px_rgba(0,0,0,0.65)]"
        style={{
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        }}
      >
        {/* Native iOS / Android grabber bar */}
        <div className="flex justify-center pt-2.5 pb-1">
          <span className="h-1 w-10 rounded-full bg-[var(--border-strong)]/90" />
        </div>

        {/* Sheet Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 pt-1 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">
                Suas Escolhas
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Toque para agir ou no lápis para editar
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar escolhas"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Action Cards */}
        <div className="flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-3.5 py-3">
          {campaign.actions.map((action, idx) => {
            const Icon = INTENT_ICON[action.intent] ?? Sparkles;
            const cardCheck = assessSuggestedAction(
              action,
              campaign.player.skills,
              campaign.difficulty,
              campaign.player.tension,
              dicePolicy,
              effectiveAttrs,
              campaign.player.skillLevels,
            );
            const isHighRisk = action.risk === 'high';
            const attrShort = ATTRIBUTE_META[cardCheck.attribute].short[language];

            return (
              <div
                key={action.id}
                style={{ animationDelay: `${idx * 35}ms` }}
                onClick={() => {
                  if (isBusy) return;
                  onClose();
                  onSelectAction(action);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (isBusy) return;
                    onClose();
                    onSelectAction(action);
                  }
                }}
                className={`animate-choice-in flex items-start justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/90 p-3.5 text-left transition active:scale-[0.98] active:border-[var(--accent)] ${
                  isBusy ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                <div className="flex min-w-0 flex-1 items-start gap-2.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      <span>
                        {action.effectTag || INTENT_LABELS[action.intent][language]}
                      </span>
                      <span className="font-mono-tech rounded bg-[var(--bg-canvas)]/80 px-1.5 py-0.5 text-[10px] font-bold tracking-normal text-[var(--text-secondary)]">
                        {attrShort} {formatModifier(cardCheck.attributeMod)}
                      </span>
                      {cardCheck.requiresRoll ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-normal normal-case ${
                            isHighRisk
                              ? 'border-[var(--danger)]/45 bg-[var(--danger)]/12 text-[var(--danger)]'
                              : 'border-[var(--warning)]/45 bg-[var(--warning)]/12 text-[var(--warning)]'
                          }`}
                        >
                          <Dices className="h-3 w-3" />
                          d20
                          {cardCheck.totalBonus !== 0
                            ? ` ${formatModifier(cardCheck.totalBonus)}`
                            : ''}
                        </span>
                      ) : (
                        <span className="rounded-md bg-[var(--bg-canvas)]/70 px-1.5 py-0.5 text-[10px] font-semibold tracking-normal normal-case text-[var(--success)]">
                          Livre
                        </span>
                      )}
                      {action.unlockHint ? (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold tracking-normal normal-case text-[var(--accent)]">
                          <Sparkles className="h-2.5 w-2.5" />
                          {action.unlockHint}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[13.5px] leading-snug font-medium text-[var(--text-primary)]">
                      {action.label}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    onClose();
                    onCustomizeAction(e, action);
                  }}
                  aria-label="Editar escolha antes de enviar"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] active:scale-95"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
