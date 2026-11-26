import { Award, Check, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { DND_CLASSES, DND_FEATS } from '../data/dnd52Catalog';
import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_META,
  EPIC_BOON_ATTRIBUTE_CAP,
  NATURAL_ATTRIBUTE_CAP,
} from '../engine/rpgSystem';
import type { AttributeId, Campaign, LanguageId } from '../types/game';

export interface LevelUpChoicePayload {
  subclassId?: string;
  asiIncreases?: Partial<Record<AttributeId, number>>;
  featId?: string;
  featAbility?: AttributeId;
  epicBoonId?: string;
  epicBoonAbility?: AttributeId;
}

interface LevelUpModalProps {
  open: boolean;
  campaign: Campaign;
  language: LanguageId;
  onClose: () => void;
  onConfirm: (payload: LevelUpChoicePayload) => void;
}

const GENERAL_FEATS = Object.values(DND_FEATS).filter((f) => f.category === 'general');
const EPIC_BOONS = Object.values(DND_FEATS).filter((f) => f.category === 'epic_boon');

export function LevelUpModal({
  open,
  campaign,
  language,
  onClose,
  onConfirm,
}: LevelUpModalProps) {
  const dnd = campaign.player.dnd;
  const cls = dnd ? DND_CLASSES[dnd.classId] : undefined;

  const needsSubclass = Boolean(dnd?.pendingSubclassChoice && !dnd.subclassId && cls);
  const needsAsi = (dnd?.pendingAsiOrFeat ?? 0) > 0;
  const needsBoon = Boolean(dnd?.pendingEpicBoon);

  const [subclassId, setSubclassId] = useState<string>(cls?.subclasses[0]?.id ?? '');
  const [asiMode, setAsiMode] = useState<'asi' | 'feat'>('asi');
  const [asiPoints, setAsiPoints] = useState<Partial<Record<AttributeId, number>>>({});
  const [selectedFeatId, setSelectedFeatId] = useState<string>(GENERAL_FEATS[0]?.id ?? 'grappler');
  const [featAbility, setFeatAbility] = useState<AttributeId>('str');
  const [epicBoonId, setEpicBoonId] = useState<string>(EPIC_BOONS[0]?.id ?? 'boon_combat_prowess');
  const [epicBoonAbility, setEpicBoonAbility] = useState<AttributeId>('str');

  if (!open || !dnd || !cls) return null;

  const spentAsi = Object.values(asiPoints).reduce((s, n) => s + (n ?? 0), 0);
  const chosenFeat = DND_FEATS[selectedFeatId];
  const featOpts = chosenFeat?.abilityBonusOptions ?? ATTRIBUTE_KEYS;
  const validFeatAbility = featOpts.includes(featAbility) ? featAbility : featOpts[0];

  const adjustAsi = (key: AttributeId, delta: number) => {
    const base = campaign.player.attributes[key] ?? 10;
    const cur = asiPoints[key] ?? 0;
    const next = cur + delta;
    if (next < 0 || next > 2) return;
    if (base + next > NATURAL_ATTRIBUTE_CAP) return;
    if (spentAsi + delta > 2) return;
    setAsiPoints((prev) => ({ ...prev, [key]: next }));
  };

  const canSubmit =
    (!needsSubclass || Boolean(subclassId)) &&
    (!needsAsi || asiMode === 'feat' || spentAsi === 2) &&
    (!needsBoon || Boolean(epicBoonId));

  const handleConfirm = () => {
    if (!canSubmit) return;
    onConfirm({
      subclassId: needsSubclass ? subclassId : undefined,
      asiIncreases: needsAsi && asiMode === 'asi' ? asiPoints : undefined,
      featId: needsAsi && asiMode === 'feat' ? selectedFeatId : undefined,
      featAbility: needsAsi && asiMode === 'feat' ? validFeatAbility : undefined,
      epicBoonId: needsBoon ? epicBoonId : undefined,
      epicBoonAbility: needsBoon ? epicBoonAbility : undefined,
    });
    onClose();
  };

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Evolução de Nível D&D 5.2"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--accent)]/50 bg-[var(--bg-surface)] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/70 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Award className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-base font-bold text-[var(--text-primary)]">
                Evolução D&D 5.2 · Nível {campaign.player.level}
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                {cls.label} · Escolha os avanços desbloqueados
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border-subtle)] p-1.5 text-[var(--text-secondary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[72vh] space-y-5 overflow-y-auto p-5">
          {/* Subclass Picker (Level 3) */}
          {needsSubclass ? (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                1. Escolha sua Subclasse (Nível 3)
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {cls.subclasses.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSubclassId(sub.id)}
                    className={`rounded-2xl border p-3 text-left transition ${
                      subclassId === sub.id
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        {sub.label}
                      </span>
                      <span className="rounded bg-black/30 px-1.5 py-0.5 text-[9px] uppercase text-[var(--text-muted)]">
                        {sub.source === 'srd52' ? 'SRD 5.2' : 'MYTHOS'}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{sub.summary}</p>
                    <p className="mt-1.5 text-[10px] font-semibold text-[var(--accent)]">
                      ★ {sub.bonusFeatureLabel}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* ASI (+2) vs 2024 General Feat (+1 stat + power) */}
          {needsAsi ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                  Aprimoramento (ASI) ou Talento Geral
                </h3>
                <div className="flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-0.5 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setAsiMode('asi')}
                    className={`rounded-md px-2.5 py-1 ${
                      asiMode === 'asi' ? 'bg-[var(--accent)] text-black' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    +2 Atributos
                  </button>
                  <button
                    type="button"
                    onClick={() => setAsiMode('feat')}
                    className={`rounded-md px-2.5 py-1 ${
                      asiMode === 'feat' ? 'bg-[var(--accent)] text-black' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    Talento (+1)
                  </button>
                </div>
              </div>

              {asiMode === 'asi' ? (
                <div>
                  <p className="mb-2 text-[11px] text-[var(--text-muted)]">
                    Distribua <strong>{2 - spentAsi}</strong> ponto(s) restante(s) (teto natural {NATURAL_ATTRIBUTE_CAP}):
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {ATTRIBUTE_KEYS.map((key) => {
                      const base = campaign.player.attributes[key] ?? 10;
                      const add = asiPoints[key] ?? 0;
                      return (
                        <div
                          key={key}
                          className="flex flex-col items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2"
                        >
                          <span className="text-[10px] font-bold text-[var(--text-muted)]">
                            {ATTRIBUTE_META[key].short[language]}
                          </span>
                          <span className="font-mono-tech text-base font-bold text-[var(--text-primary)]">
                            {base + add}
                            {add > 0 ? <span className="text-xs text-[var(--success)]"> (+{add})</span> : null}
                          </span>
                          <div className="mt-1.5 flex gap-1">
                            <button
                              type="button"
                              disabled={add <= 0}
                              onClick={() => adjustAsi(key, -1)}
                              className="h-6 w-6 rounded border border-[var(--border-strong)] text-xs font-bold disabled:opacity-35"
                            >
                              −
                            </button>
                            <button
                              type="button"
                              disabled={spentAsi >= 2 || base + add >= NATURAL_ATTRIBUTE_CAP}
                              onClick={() => adjustAsi(key, 1)}
                              className="h-6 w-6 rounded bg-[var(--accent)] text-xs font-bold text-black disabled:opacity-35"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {GENERAL_FEATS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedFeatId(f.id)}
                        className={`rounded-xl border p-2.5 text-left transition ${
                          selectedFeatId === f.id
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]'
                        }`}
                      >
                        <div className="text-xs font-bold text-[var(--text-primary)]">{f.label}</div>
                        <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">{f.summary}</p>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs">
                    <span className="text-[var(--text-secondary)]">+1 em Atributo (2024):</span>
                    <div className="flex gap-1">
                      {featOpts.map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setFeatAbility(a)}
                          className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                            validFeatAbility === a
                              ? 'bg-[var(--accent)] text-black'
                              : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
                          }`}
                        >
                          {ATTRIBUTE_META[a].short[language]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Level 19 Epic Boon (cap 30!) */}
          {needsBoon ? (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#fbbf24]">
                Dádiva Épica (Nível 19 · +1 Atributo até {EPIC_BOON_ATTRIBUTE_CAP})
              </h3>
              <div className="space-y-2">
                {EPIC_BOONS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setEpicBoonId(b.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      epicBoonId === b.id
                        ? 'border-[#fbbf24] bg-[#fbbf24]/15'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <div className="text-xs font-bold text-[#fef08a]">{b.label}</div>
                    <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">{b.summary}</p>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs">
                <span>Atributo +1 (teto 30):</span>
                <div className="flex gap-1">
                  {ATTRIBUTE_KEYS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setEpicBoonAbility(a)}
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        epicBoonAbility === a
                          ? 'bg-[#fbbf24] text-black'
                          : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {ATTRIBUTE_META[a].short[language]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)]/60 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border-subtle)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)]"
          >
            Depois
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-bold text-black shadow transition hover:brightness-110 disabled:opacity-40"
          >
            <Check className="h-4 w-4" />
            <Sparkles className="h-3.5 w-3.5" />
            <span>Confirmar Evolução</span>
          </button>
        </div>
      </div>
    </div>
  );
}
