import { Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatOutcomeLabel } from '../engine/diceEngine';
import { ATTRIBUTE_META, formatModifier } from '../engine/rpgSystem';
import type { DiceRollResult, LanguageId } from '../types/game';

interface DiceRollOverlayProps {
  roll: DiceRollResult | null;
  language: LanguageId;
  inspirationCount?: number;
  canRerollWithInspiration?: boolean;
  onRerollWithInspiration?: () => void;
  onComplete: () => void;
}

function IcosahedronDie({
  value,
  strokeColor,
  textColor,
  phase,
  sizeClass,
  dimmed = false,
}: {
  value: number;
  strokeColor: string;
  textColor: string;
  phase: 'rolling' | 'landed';
  sizeClass: string;
  dimmed?: boolean;
}) {
  return (
    <div
      className={`relative flex items-center justify-center transition-all ${sizeClass} ${
        phase === 'rolling' ? 'animate-dice-tumble' : 'animate-dice-snap'
      } ${dimmed ? 'scale-90 opacity-40' : ''}`}
    >
      <svg
        viewBox="0 0 120 120"
        className="h-full w-full drop-shadow-[0_0_20px_var(--accent-glow)]"
      >
        <polygon
          points="60,6 108,33 108,87 60,114 12,87 12,33"
          fill="var(--bg-elevated)"
          stroke={phase === 'landed' ? strokeColor : 'var(--accent)'}
          strokeWidth="3"
        />
        <polygon
          points="60,22 92,42 78,86 42,86 28,42"
          fill="var(--accent-soft)"
          stroke={phase === 'landed' ? strokeColor : 'var(--border-strong)'}
          strokeWidth="1.5"
        />
        <line x1="60" y1="6" x2="60" y2="22" stroke="var(--border-strong)" strokeWidth="1.5" />
        <line x1="108" y1="33" x2="92" y2="42" stroke="var(--border-strong)" strokeWidth="1.5" />
        <line x1="108" y1="87" x2="78" y2="86" stroke="var(--border-strong)" strokeWidth="1.5" />
        <line x1="60" y1="114" x2="42" y2="86" stroke="var(--border-strong)" strokeWidth="1.5" />
        <line x1="60" y1="114" x2="78" y2="86" stroke="var(--border-strong)" strokeWidth="1.5" />
        <line x1="12" y1="87" x2="42" y2="86" stroke="var(--border-strong)" strokeWidth="1.5" />
        <line x1="12" y1="33" x2="28" y2="42" stroke="var(--border-strong)" strokeWidth="1.5" />
      </svg>

      <span
        className={`font-display absolute font-bold tabular-nums ${
          sizeClass.includes('h-20') ? 'text-2xl' : 'text-3xl'
        }`}
        style={{
          color: phase === 'landed' ? textColor : 'var(--text-primary)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function DiceRollOverlay({
  roll,
  language,
  inspirationCount = 0,
  canRerollWithInspiration = false,
  onRerollWithInspiration,
  onComplete,
}: DiceRollOverlayProps) {
  const [phase, setPhase] = useState<'rolling' | 'landed'>('rolling');
  const [displayNumber, setDisplayNumber] = useState<number>(12);
  const [displaySecond, setDisplaySecond] = useState<number>(8);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const canOfferReroll = Boolean(
    roll &&
      canRerollWithInspiration &&
      onRerollWithInspiration &&
      inspirationCount > 0 &&
      !roll.rerolledWithInspiration &&
      (roll.outcome === 'failure' ||
        roll.outcome === 'critical_failure' ||
        roll.outcome === 'partial'),
  );

  useEffect(() => {
    if (!roll) return;
    setPhase('rolling');
    setDisplayNumber(((roll.roll + 7) % 20) + 1);
    setDisplaySecond(((roll.roll + 13) % 20) + 1);

    const cycleId = window.setInterval(() => {
      setDisplayNumber(Math.floor(Math.random() * 20) + 1);
      setDisplaySecond(Math.floor(Math.random() * 20) + 1);
    }, 65);

    const landTimer = window.setTimeout(() => {
      window.clearInterval(cycleId);
      setDisplayNumber(roll.rolls ? roll.rolls[0] : roll.roll);
      if (roll.rolls) setDisplaySecond(roll.rolls[1]);
      setPhase('landed');
    }, 640);

    const closeTimer = window.setTimeout(
      () => {
        onCompleteRef.current();
      },
      canOfferReroll ? 4100 : 1850,
    );

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        onCompleteRef.current();
      }
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      window.clearInterval(cycleId);
      window.clearTimeout(landTimer);
      window.clearTimeout(closeTimer);
      window.removeEventListener('keydown', handleKey);
    };
  }, [roll, canOfferReroll]);

  if (!roll) return null;

  const isSuccess =
    roll.outcome === 'critical_success' || roll.outcome === 'success';
  const isPartial = roll.outcome === 'partial';
  const outcomeColor = isSuccess
    ? 'var(--success)'
    : isPartial
      ? 'var(--warning)'
      : 'var(--danger)';

  const targetTag = roll.testKind === 'attack_roll' ? 'CA' : 'CD';
  const testTitle =
    roll.testKind === 'death_save'
      ? 'Teste Contra a Morte · d20'
      : roll.testKind === 'saving_throw'
        ? `Salvaguarda · ${roll.attribute ? ATTRIBUTE_META[roll.attribute].short[language] : 'd20'}`
        : roll.testKind === 'attack_roll'
          ? 'Rolagem de Ataque · d20'
          : roll.rollMode === 'advantage'
            ? 'Vantagem · 2× d20'
            : roll.rollMode === 'disadvantage'
              ? 'Desvantagem · 2× d20'
              : roll.rerolledWithInspiration
                ? 'Inspiração Heroica ★ · Rerrolado'
                : 'Teste D20 · SRD 5.2';

  const hasTwoDice = Boolean(roll.rolls && roll.rollMode && roll.rollMode !== 'normal');
  const pickFirst = hasTwoDice && roll.rolls ? roll.rolls[0] === roll.roll : true;

  return (
    <div
      onClick={() => onCompleteRef.current()}
      role="dialog"
      aria-label="Rolagem de destino"
      className="fixed inset-0 z-[65] flex cursor-pointer items-center justify-center bg-black/55 backdrop-blur-sm"
    >
      <div
        onClick={(e) => {
          if (canOfferReroll && phase === 'landed') {
            e.stopPropagation();
          }
        }}
        className="relative flex w-full max-w-xs flex-col items-center rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)]/95 px-6 py-6 text-center shadow-[var(--shadow-elevated)]"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
          {testTitle}
        </span>

        {roll.opposedLabel ? (
          <span className="mt-1 text-[11px] font-medium text-[var(--text-secondary)]">
            {roll.opposedLabel}
          </span>
        ) : null}

        {roll.rollMode === 'advantage' && roll.advantageSource ? (
          <span className="mt-1 rounded-full bg-[var(--success)]/12 px-2.5 py-0.5 text-[10px] font-medium text-[var(--success)]">
            Vantagem: {roll.advantageSource}
          </span>
        ) : null}

        {roll.rollMode === 'disadvantage' && (roll.disadvantageSource || roll.advantageSource) ? (
          <span className="mt-1 rounded-full bg-[var(--danger)]/14 px-2.5 py-0.5 text-[10px] font-medium text-[var(--danger)]">
            Desvantagem: {roll.disadvantageSource ?? roll.advantageSource}
          </span>
        ) : null}

        {/* Dual Side-by-Side d20 (h-20 w-20, mobile-safe!) for Advantage/Disadvantage, or Single d20 */}
        <div className="mt-4 flex items-center justify-center gap-3">
          {hasTwoDice && roll.rolls ? (
            <>
              <IcosahedronDie
                value={displayNumber}
                strokeColor={pickFirst ? outcomeColor : 'var(--border-strong)'}
                textColor={pickFirst ? outcomeColor : 'var(--text-muted)'}
                phase={phase}
                sizeClass="h-20 w-20"
                dimmed={phase === 'landed' && !pickFirst}
              />
              <IcosahedronDie
                value={displaySecond}
                strokeColor={!pickFirst ? outcomeColor : 'var(--border-strong)'}
                textColor={!pickFirst ? outcomeColor : 'var(--text-muted)'}
                phase={phase}
                sizeClass="h-20 w-20"
                dimmed={phase === 'landed' && pickFirst}
              />
            </>
          ) : (
            <IcosahedronDie
              value={displayNumber}
              strokeColor={outcomeColor}
              textColor={outcomeColor}
              phase={phase}
              sizeClass="h-28 w-28"
            />
          )}
        </div>

        {/* Outcome & Math Readout */}
        <div className="mt-4 min-h-[58px]">
          {phase === 'rolling' ? (
            <p className="text-xs italic text-[var(--text-muted)]">
              Lançando os dados contra {targetTag} {roll.dc}...
            </p>
          ) : (
            <div className="animate-beat-enter space-y-1.5">
              <div
                className="font-display text-lg font-bold tracking-wider uppercase"
                style={{ color: outcomeColor }}
              >
                {formatOutcomeLabel(roll.outcome, language)}
              </div>
              <div className="font-mono-tech text-xs text-[var(--text-secondary)]">
                {roll.rolls ? (
                  <>
                    2×d20 (
                    <span className={pickFirst ? 'font-bold text-[var(--text-primary)]' : 'line-through opacity-55'}>
                      {roll.rolls[0]}
                    </span>
                    ,{' '}
                    <span className={!pickFirst ? 'font-bold text-[var(--text-primary)]' : 'line-through opacity-55'}>
                      {roll.rolls[1]}
                    </span>
                    )
                  </>
                ) : (
                  <>d20 ({roll.roll})</>
                )}
                {roll.attribute && typeof roll.attributeMod === 'number' && roll.attributeMod !== 0
                  ? ` ${roll.attributeMod > 0 ? '+' : '−'} ${Math.abs(roll.attributeMod)} (${ATTRIBUTE_META[roll.attribute].short[language]})`
                  : ''}
                {typeof roll.proficiencyBonus === 'number' && roll.proficiencyBonus > 0
                  ? ` + ${roll.proficiencyBonus} (PB)`
                  : roll.skillLevelBonus && roll.skillLevelBonus !== 0 && roll.bonusSource
                    ? ` ${roll.skillLevelBonus > 0 ? '+' : '−'} ${Math.abs(roll.skillLevelBonus)} (${roll.bonusSource})`
                    : !roll.attribute && roll.bonus !== 0
                      ? ` ${formatModifier(roll.bonus)}${roll.bonusSource ? ` (${roll.bonusSource})` : ''}`
                      : ''}
                {roll.exhaustionPenalty && roll.exhaustionPenalty > 0
                  ? ` − ${roll.exhaustionPenalty} (Exaustão)`
                  : ''}{' '}
                = <strong className="text-[var(--text-primary)]">{roll.total}</strong> vs {targetTag} {roll.dc}
              </div>

              {roll.damageFormula && typeof roll.damageTotal === 'number' ? (
                <div className="font-mono-tech text-[11px] font-semibold text-[#fbbf24]">
                  Dano ({roll.damageFormula}): {roll.damageTotal}
                </div>
              ) : null}

              {canOfferReroll ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRerollWithInspiration?.();
                  }}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border border-[#fbbf24]/50 bg-[#fbbf24]/15 px-3.5 py-2 text-xs font-semibold text-[#fbbf24] transition hover:bg-[#fbbf24]/25"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Gastar Inspiração Heroica ★ · Rerrolar</span>
                </button>
              ) : null}
            </div>
          )}
        </div>

        <span className="mt-2 text-[10px] text-[var(--text-muted)]">
          Clique ou Esc para continuar
        </span>
      </div>
    </div>
  );
}
