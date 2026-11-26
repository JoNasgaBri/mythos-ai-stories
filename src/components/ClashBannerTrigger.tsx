import {
  Flame,
  Footprints,
  Loader2,
  Scale,
  Sparkles,
  Swords,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CLASH_ARCHETYPE_META } from '../engine/clashSystem';
import type { ClashArchetype, SuggestedClashCue } from '../types/game';

interface ClashSuggestionCardProps {
  suggestion: SuggestedClashCue;
  isStarting: boolean;
  onAccept: (archetype: ClashArchetype) => void;
  onDismiss: () => void;
}

export function ClashSuggestionCard({
  suggestion,
  isStarting,
  onAccept,
  onDismiss,
}: ClashSuggestionCardProps) {
  const meta = CLASH_ARCHETYPE_META[suggestion.archetype];
  return (
    <div
      style={{ borderColor: `${meta.color}66` }}
      className="animate-beat-enter rounded-2xl border bg-[var(--bg-surface)]/95 p-4 shadow-[var(--shadow-elevated)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            style={{
              backgroundColor: `${meta.color}1F`,
              color: meta.color,
              borderColor: `${meta.color}4D`,
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
          >
            <Zap className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                style={{ color: meta.color }}
                className="text-[10px] font-bold uppercase tracking-wider"
              >
                Confronto Detectado · {meta.label}
              </span>
            </div>
            <h4 className="font-display mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
              {suggestion.title}
            </h4>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              {suggestion.reason}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isStarting}
            onClick={() => onAccept(suggestion.archetype)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-[var(--accent-contrast)] shadow-md transition hover:brightness-110 disabled:opacity-50"
          >
            {isStarting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Swords className="h-3.5 w-3.5" />
            )}
            <span>
              {isStarting ? 'Preparando arena...' : 'Ativar Modo Confronto'}
            </span>
          </button>
          <button
            type="button"
            disabled={isStarting}
            onClick={onDismiss}
            className="rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            Continuar só no texto
          </button>
        </div>
      </div>
    </div>
  );
}

interface ClashLauncherModalProps {
  open: boolean;
  isStarting: boolean;
  onClose: () => void;
  onStartClash: (opts: {
    requestedArchetype?: ClashArchetype;
    customPremise?: string;
  }) => void;
}

const ARCHETYPE_CARDS: Array<{
  id: ClashArchetype | 'auto';
  title: string;
  desc: string;
  color: string;
  icon: typeof Swords;
}> = [
  {
    id: 'auto',
    title: 'Detectar da Cena (Auto)',
    desc: 'A IA lê a cena atual e monta o arquétipo e inimigos automaticamente.',
    color: '#d4af37',
    icon: Sparkles,
  },
  {
    id: 'combat',
    title: 'Combate / Chefe',
    desc: 'Vigor, Postura/Quebra, 3 zonas de distância, terreno e combos.',
    color: '#f87171',
    icon: Swords,
  },
  {
    id: 'chase',
    title: 'Perseguição & Fuga',
    desc: 'Cabo-de-guerra Fuga vs. Perseguidor com atalhos e obstáculos.',
    color: '#38bdf8',
    icon: Footprints,
  },
  {
    id: 'social',
    title: 'Duelo Social / Interrogatório',
    desc: 'Compostura no lugar de HP + Provas e Fatos Canônicos como armas.',
    color: '#c084fc',
    icon: Scale,
  },
  {
    id: 'siege',
    title: 'Cerco / Horda',
    desc: 'Ondas sucessivas + integridade da Barricada + suprimentos.',
    color: '#fb923c',
    icon: Flame,
  },
];

export function ClashLauncherModal({
  open,
  isStarting,
  onClose,
  onStartClash,
}: ClashLauncherModalProps) {
  const [selected, setSelected] = useState<ClashArchetype | 'auto'>('auto');
  const [customPremise, setCustomPremise] = useState('');

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[55] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Iniciar Modo Confronto Tático"
        className="w-full max-w-lg rounded-t-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-5 shadow-2xl sm:rounded-3xl"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#f87171]/45 bg-[#f87171]/15 text-[#f87171]">
              <Swords className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
                Modo Confronto Tático
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Escolha o arquétipo para transformar esta cena em confronto tático.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {ARCHETYPE_CARDS.map((card) => {
            const Icon = card.icon;
            const active = selected === card.id;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setSelected(card.id)}
                style={
                  active
                    ? {
                        borderColor: card.color,
                        backgroundColor: `${card.color}18`,
                      }
                    : undefined
                }
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                  active
                    ? ''
                    : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]/65 hover:border-[var(--border-strong)]'
                }`}
              >
                <div
                  style={{ color: card.color }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/30"
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    {card.title}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {card.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Contexto opcional (se quiser guiar quem enfrenta)
          </label>
          <input
            type="text"
            value={customPremise}
            onChange={(e) => setCustomPremise(e.target.value)}
            placeholder="Ex.: Emboscada de 2 mercenários no estacionamento..."
            className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border-subtle)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isStarting}
            onClick={() =>
              onStartClash({
                requestedArchetype: selected === 'auto' ? undefined : selected,
                customPremise: customPremise.trim() || undefined,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] shadow-md transition hover:brightness-110 disabled:opacity-50"
          >
            {isStarting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            <span>{isStarting ? 'Iniciando...' : 'Iniciar Confronto'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
