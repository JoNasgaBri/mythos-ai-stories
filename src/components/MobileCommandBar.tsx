import {
  ChevronUp,
  Compass,
  Dices,
  MessageSquare,
  Send,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import type { RefObject } from 'react';
import { ATTRIBUTE_META, formatModifier } from '../engine/rpgSystem';
import type {
  AttributeId,
  CommandInputMode,
  DiceRollPolicy,
  InventoryItem,
  LanguageId,
} from '../types/game';

interface MobileCommandBarProps {
  language: LanguageId;
  inputText: string;
  inputMode: CommandInputMode;
  dicePolicy: DiceRollPolicy;
  liveAssessment: {
    requiresRoll: boolean;
    reason?: string;
    attribute?: AttributeId;
    totalBonus?: number;
  };
  selectedItem: InventoryItem | null;
  actionsCount: number;
  isBusy: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onChangeInputText: (val: string) => void;
  onChangeInputMode: (mode: CommandInputMode) => void;
  onCycleDicePolicy: () => void;
  onClearSelectedItem: () => void;
  onOpenChoicesSheet: () => void;
  onSubmit: () => void;
}

export function MobileCommandBar({
  language,
  inputText,
  inputMode,
  dicePolicy,
  liveAssessment,
  selectedItem,
  actionsCount,
  isBusy,
  textareaRef,
  onChangeInputText,
  onChangeInputMode,
  onCycleDicePolicy,
  onClearSelectedItem,
  onOpenChoicesSheet,
  onSubmit,
}: MobileCommandBarProps) {
  const cycleInputMode = () => {
    onChangeInputMode(
      inputMode === 'act' ? 'say' : inputMode === 'say' ? 'direct' : 'act',
    );
  };

  const modeLabel =
    inputMode === 'direct'
      ? language === 'en'
        ? 'Direct'
        : language === 'fr'
          ? 'Diriger'
          : 'Dirigir'
      : inputMode === 'say'
        ? language === 'en'
          ? 'Say'
          : language === 'fr'
            ? 'Parler'
            : 'Falar'
        : language === 'en'
          ? 'Act'
          : 'Agir';

  const ModeIcon =
    inputMode === 'direct'
      ? Wand2
      : inputMode === 'say'
        ? MessageSquare
        : Compass;

  const diceShortLabel =
    inputMode === 'direct'
      ? 'Livre'
      : dicePolicy === 'force'
        ? 'd20 Forçar'
        : dicePolicy === 'off'
          ? 'Sem dado'
          : liveAssessment.requiresRoll
            ? `d20${
                liveAssessment.attribute
                  ? ` · ${ATTRIBUTE_META[liveAssessment.attribute].short[language]}${
                      typeof liveAssessment.totalBonus === 'number' &&
                      liveAssessment.totalBonus !== 0
                        ? formatModifier(liveAssessment.totalBonus)
                        : ''
                    }`
                  : ''
              }`
            : 'd20 Auto';

  const placeholder =
    inputMode === 'direct'
      ? language === 'en'
        ? 'Direct the scene or world...'
        : 'Guiar a cena ou o mundo...'
      : inputMode === 'say'
        ? language === 'en'
          ? 'Say something aloud...'
          : 'Falar na cena...'
        : language === 'en'
          ? 'Describe your action...'
          : 'Escreva sua ação...';

  return (
    <div
      data-tour="mobile-command-bar"
      className="md:hidden rounded-t-2xl border-t border-[var(--border-strong)]/90 bg-[var(--bg-surface)]/95 px-2.5 pt-2 shadow-[0_-8px_28px_rgba(0,0,0,0.35)] backdrop-blur-xl"
      style={{
        paddingBottom: 'max(0.55rem, env(safe-area-inset-bottom))',
      }}
    >
      {/* Ultra-compact single-row control strip */}
      <div className="no-scrollbar mb-1.5 flex items-center gap-1.5 overflow-x-auto">
        {actionsCount > 0 ? (
          <button
            type="button"
            data-tour="mobile-choices-btn"
            disabled={isBusy}
            onClick={onOpenChoicesSheet}
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-[var(--accent)]/55 bg-[var(--accent-soft)] px-2.5 text-[11px] font-semibold text-[var(--accent)] shadow-sm transition active:scale-95 disabled:opacity-45"
          >
            <Sparkles className="h-3 w-3 shrink-0" />
            <span>Escolhas ({actionsCount})</span>
            <ChevronUp className="h-3 w-3 shrink-0" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={cycleInputMode}
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/75 px-2.5 text-[11px] font-semibold text-[var(--text-primary)] transition active:scale-95"
        >
          <ModeIcon className="h-3 w-3 text-[var(--accent)]" />
          <span>{modeLabel}</span>
        </button>

        <button
          type="button"
          disabled={inputMode === 'direct'}
          onClick={onCycleDicePolicy}
          className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium transition active:scale-95 ${
            inputMode === 'direct'
              ? 'border-[var(--accent)]/35 bg-[var(--accent-soft)] text-[var(--accent)]'
              : dicePolicy === 'force'
                ? 'border-[var(--accent)]/60 bg-[var(--accent-soft)] text-[var(--accent)]'
                : dicePolicy === 'off'
                  ? 'border-[var(--success)]/45 bg-[var(--success)]/12 text-[var(--success)]'
                  : liveAssessment.requiresRoll
                    ? 'border-[var(--warning)]/60 bg-[var(--warning)]/14 text-[var(--warning)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)]/60 text-[var(--text-secondary)]'
          }`}
        >
          <Dices className="h-3 w-3 shrink-0" />
          <span>{diceShortLabel}</span>
        </button>

        {selectedItem ? (
          <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 text-[11px] font-medium text-[var(--accent)]">
            <span className="max-w-[110px] truncate">{selectedItem.name}</span>
            <button
              type="button"
              onClick={onClearSelectedItem}
              aria-label="Remover item"
              className="p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ) : null}
      </div>

      {/* Native-feeling composer row (16px font prevents iOS Safari auto-zoom!) */}
      <div className="flex items-end gap-2">
        <div className="flex min-h-[42px] flex-1 items-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/80 px-3 py-1 focus-within:border-[var(--accent)]">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={(e) => onChangeInputText(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                !e.repeat &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder={placeholder}
            className="max-h-24 w-full resize-none bg-transparent py-1 text-[16px] leading-snug text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
          />
        </div>

        <button
          type="button"
          disabled={isBusy || (!inputText.trim() && !selectedItem)}
          onClick={onSubmit}
          aria-label="Enviar ação"
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--accent-contrast)] shadow-md transition active:scale-95 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
