import { useEffect, useRef, useState } from 'react';
import { formatOutcomeLabel } from '../engine/diceEngine';
import type { DiceRollResult, LanguageId } from '../types/game';

interface DiceRollOverlayProps {
  roll: DiceRollResult | null;
  language: LanguageId;
  onComplete: () => void;
}

export function DiceRollOverlay({
  roll,
  language,
  onComplete,
}: DiceRollOverlayProps) {
  const [phase, setPhase] = useState<'rolling' | 'landed'>('rolling');
  const [displayNumber, setDisplayNumber] = useState<number>(12);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!roll) return;
    setPhase('rolling');
    setDisplayNumber(((roll.roll + 7) % 20) + 1);

    const cycleId = window.setInterval(() => {
      setDisplayNumber(Math.floor(Math.random() * 20) + 1);
    }, 65);

    const landTimer = window.setTimeout(() => {
      window.clearInterval(cycleId);
      setDisplayNumber(roll.roll);
      setPhase('landed');
    }, 640);

    const closeTimer = window.setTimeout(() => {
      onCompleteRef.current();
    }, 1620);

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
  }, [roll]);

  if (!roll) return null;

  const isSuccess =
    roll.outcome === 'critical_success' || roll.outcome === 'success';
  const isPartial = roll.outcome === 'partial';
  const outcomeColor = isSuccess
    ? 'var(--success)'
    : isPartial
      ? 'var(--warning)'
      : 'var(--danger)';

  return (
    <div
      onClick={() => onCompleteRef.current()}
      role="dialog"
      aria-label="Rolagem de destino"
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/55 backdrop-blur-sm"
    >
      <div className="relative flex w-full max-w-xs flex-col items-center rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)]/95 px-7 py-7 text-center shadow-[var(--shadow-elevated)]">
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">
          Teste de Destino · d20
        </span>

        {/* Animated Icosahedron d20 SVG */}
        <div
          className={`relative mt-4 flex h-28 w-28 items-center justify-center ${
            phase === 'rolling' ? 'animate-dice-tumble' : 'animate-dice-snap'
          }`}
        >
          <svg
            viewBox="0 0 120 120"
            className="h-full w-full drop-shadow-[0_0_22px_var(--accent-glow)]"
          >
            <polygon
              points="60,6 108,33 108,87 60,114 12,87 12,33"
              fill="var(--bg-elevated)"
              stroke={phase === 'landed' ? outcomeColor : 'var(--accent)'}
              strokeWidth="3"
            />
            <polygon
              points="60,22 92,42 78,86 42,86 28,42"
              fill="var(--accent-soft)"
              stroke={phase === 'landed' ? outcomeColor : 'var(--border-strong)'}
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
            className="font-display absolute text-3xl font-bold tabular-nums"
            style={{
              color: phase === 'landed' ? outcomeColor : 'var(--text-primary)',
            }}
          >
            {displayNumber}
          </span>
        </div>

        {/* Outcome & Math Readout */}
        <div className="mt-4 min-h-[56px]">
          {phase === 'rolling' ? (
            <p className="text-xs italic text-[var(--text-muted)]">
              Lançando os dados contra DC {roll.dc}...
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
                d20 ({roll.roll})
                {roll.bonus > 0 ? ` + ${roll.bonus} (${roll.bonusSource})` : ''} ={' '}
                <strong className="text-[var(--text-primary)]">{roll.total}</strong> vs DC {roll.dc}
              </div>
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
