import {
  Award,
  Check,
  Pencil,
  Ruler,
  Scale,
  Shield,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  ASI_LEVELS,
  ATTRIBUTE_KEYS,
  ATTRIBUTE_META,
  BG3_BUILD_PRESETS,
  formatModifier,
  getAttributeModifier,
  getAttributeTierMeta,
  getEquippedGearBonuses,
  getNextAsiLevel,
  getProficiencyBonus,
  MAX_LEVEL,
  NATURAL_ATTRIBUTE_CAP,
} from '../engine/rpgSystem';
import type {
  Campaign,
  CharacterAttributes,
  LanguageId,
  PlayerState,
} from '../types/game';

interface ProtagonistEditModalProps {
  open: boolean;
  campaign: Campaign;
  language: LanguageId;
  onClose: () => void;
  onSaveProfile: (
    patch: Partial<
      Pick<
        PlayerState,
        | 'name'
        | 'age'
        | 'occupation'
        | 'height'
        | 'physique'
        | 'appearance'
        | 'attributes'
      >
    >,
  ) => void;
}

const PHYSIQUE_PRESETS = [
  'Franzino',
  'Comum / Não atlético',
  'Médio',
  'Atlético',
  'Forte / Robusto',
];

export function ProtagonistEditModal({
  open,
  campaign,
  language,
  onClose,
  onSaveProfile,
}: ProtagonistEditModalProps) {
  const player = campaign.player;
  const [name, setName] = useState(player.name);
  const [age, setAge] = useState(String(player.age));
  const [occupation, setOccupation] = useState(player.occupation);
  const [height, setHeight] = useState(player.height ?? '');
  const [physique, setPhysique] = useState(player.physique ?? '');
  const [appearance, setAppearance] = useState(player.appearance ?? '');
  const [attrs, setAttrs] = useState<CharacterAttributes>({
    ...player.attributes,
  });

  useEffect(() => {
    if (!open) return;
    setName(player.name);
    setAge(String(player.age));
    setOccupation(player.occupation);
    setHeight(player.height ?? '');
    setPhysique(player.physique ?? '');
    setAppearance(player.appearance ?? '');
    setAttrs({ ...player.attributes });
  }, [open, player]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const gearBonuses = getEquippedGearBonuses(player.inventory);
  const level = Math.max(1, Math.min(MAX_LEVEL, player.level));
  const profBonus = getProficiencyBonus(level);
  const earnedAsis = ASI_LEVELS.filter((lv) => lv <= level).length;
  const nextAsi = getNextAsiLevel(level);

  // Authentic BG3/5e baseline sum: 72–75 at Lv1 (27-pt buy + racial +2/+1) + 2 per ASI earned
  const baseSum = ATTRIBUTE_KEYS.reduce((acc, k) => acc + (attrs[k] ?? 10), 0);
  const recommendedMin = 71 + earnedAsis * 2;
  const recommendedMax = 76 + earnedAsis * 2;
  const balanceStatus =
    baseSum > recommendedMax
      ? {
          label: `Acima da curva BG3 para Nv.${level} (recomendado ${recommendedMin}–${recommendedMax})`,
          color: '#fb923c',
        }
      : baseSum < recommendedMin
        ? {
            label: `Build desafiadora para Nv.${level} (padrão BG3: ${recommendedMin}–${recommendedMax})`,
            color: '#38bdf8',
          }
        : {
            label: `Equilibrada no padrão BG3 Nv.${level} (${recommendedMin}–${recommendedMax} pts totais)`,
            color: 'var(--success)',
          };

  const applyPreset = (presetAttrs: CharacterAttributes) => {
    // Apply preset + distribute earned ASIs evenly onto highest 1-2 stats without exceeding cap 20
    const next: CharacterAttributes = { ...presetAttrs };
    const sorted = [...ATTRIBUTE_KEYS].sort((a, b) => next[b] - next[a]);
    let asiPoints = earnedAsis * 2;
    let idx = 0;
    while (asiPoints > 0 && idx < sorted.length) {
      const key = sorted[idx];
      if (next[key] < NATURAL_ATTRIBUTE_CAP) {
        next[key] += 1;
        asiPoints -= 1;
      } else {
        idx += 1;
      }
    }
    setAttrs(next);
  };

  const handleSave = () => {
    const clampedAttrs: CharacterAttributes = {
      str: Math.max(6, Math.min(NATURAL_ATTRIBUTE_CAP, Math.round(attrs.str))),
      dex: Math.max(6, Math.min(NATURAL_ATTRIBUTE_CAP, Math.round(attrs.dex))),
      con: Math.max(6, Math.min(NATURAL_ATTRIBUTE_CAP, Math.round(attrs.con))),
      int: Math.max(6, Math.min(NATURAL_ATTRIBUTE_CAP, Math.round(attrs.int))),
      wis: Math.max(6, Math.min(NATURAL_ATTRIBUTE_CAP, Math.round(attrs.wis))),
      cha: Math.max(6, Math.min(NATURAL_ATTRIBUTE_CAP, Math.round(attrs.cha))),
    };

    onSaveProfile({
      name: name.trim() || player.name,
      age: Math.max(14, Math.min(120, Math.round(Number(age) || player.age))),
      occupation: occupation.trim() || player.occupation,
      height: height.trim() || undefined,
      physique: physique.trim() || undefined,
      appearance: appearance.trim() || undefined,
      attributes: clampedAttrs,
    });
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="animate-backdrop-in fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2.5 sm:p-4 backdrop-blur-md"
      role="dialog"
      aria-label="Editar Ficha do Protagonista"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-modal-spring flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-[var(--shadow-elevated)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/65 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--accent)]">
              <Pencil className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-sm font-semibold tracking-wide text-[var(--text-primary)] sm:text-base">
                Editar Protagonista & Build BG3
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Nível {level}/{MAX_LEVEL} · Proficiência +{profBonus} ·{' '}
                {nextAsi ? `Próx. ASI: Nv.${nextAsi}` : 'Nível Máximo'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border-subtle)] p-1.5 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Identity & Biometrics */}
          <section className="space-y-3">
            <h3 className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              <User className="h-3.5 w-3.5" />
              Identidade & Biometria
            </h3>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <label className="block sm:col-span-2">
                <span className="text-[11px] text-[var(--text-muted)]">
                  Nome do Protagonista
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Jonas"
                  className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </label>

              <label className="block">
                <span className="text-[11px] text-[var(--text-muted)]">Idade</span>
                <input
                  type="number"
                  min={14}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <label className="block sm:col-span-2">
                <span className="text-[11px] text-[var(--text-muted)]">
                  Ocupação / Classe
                </span>
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="Ex.: Investigador / Estrategista Civil"
                  className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </label>

              <label className="block">
                <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                  <Ruler className="h-3 w-3 text-[var(--accent)]" />
                  Altura
                </span>
                <input
                  type="text"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="Ex.: 1,70m"
                  className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </label>
            </div>

            <div>
              <label className="block">
                <span className="text-[11px] text-[var(--text-muted)]">
                  Porte Físico (influencia testes físicos e realismo da IA)
                </span>
                <input
                  type="text"
                  value={physique}
                  onChange={(e) => setPhysique(e.target.value)}
                  placeholder="Ex.: Comum / Não atlético"
                  className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {PHYSIQUE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPhysique(preset)}
                    className={`rounded-lg border px-2 py-0.5 text-[10px] font-medium transition ${
                      physique === preset
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-[11px] text-[var(--text-muted)]">
                Aparência & Detalhes (usado pela IA e geração de retrato)
              </span>
              <textarea
                rows={2}
                value={appearance}
                onChange={(e) => setAppearance(e.target.value)}
                placeholder="Ex.: 1,70m, porte comum não atlético, cabelo castanho curto, olhar atento..."
                className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </label>
          </section>

          {/* BG3 Attributes & Build Calibration */}
          <section className="space-y-3 border-t border-[var(--border-subtle)] pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                <Award className="h-3.5 w-3.5" />
                Atributos Base — Escala BG3 / D&D 5e (6 a 20)
              </h3>
              <span
                className="font-mono-tech inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-0.5 text-[10px] font-semibold"
                style={{ color: balanceStatus.color }}
              >
                <Scale className="h-3 w-3" />
                Soma: {baseSum} pts
              </span>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/70 p-3 text-[11px] leading-relaxed text-[var(--text-secondary)]">
              <div className="font-semibold" style={{ color: balanceStatus.color }}>
                {balanceStatus.label}
              </div>
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                <strong>Escala BG3:</strong> <strong>8–9</strong> = abaixo da média ·{' '}
                <strong>10–11</strong> = civil comum · <strong>14–15</strong> = profissional ·{' '}
                <strong>16–17</strong> = elite · <strong>20</strong> = teto natural sobre-humano (só equipamentos lendários ultrapassam até 24). ASIs (+2 pts) vêm nos níveis{' '}
                <strong>4, 8, 12, 16 e 20</strong>.
              </p>
            </div>

            {/* 1-Click BG3 Build Presets */}
            <div>
              <div className="mb-1.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                <Sparkles className="h-3 w-3 text-[var(--accent)]" />
                Presets Equilibrados de Build (ajustados para Nv.{level})
              </div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {BG3_BUILD_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.attributes)}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-left transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/40"
                  >
                    <div className="text-xs font-semibold text-[var(--text-primary)]">
                      {preset.label}
                    </div>
                    <div className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                      {preset.summary}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 6 Attribute Steppers with live BG3 Tier Labels */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {ATTRIBUTE_KEYS.map((key) => {
                const meta = ATTRIBUTE_META[key];
                const baseVal = attrs[key] ?? 10;
                const gearAdd = gearBonuses[key] ?? 0;
                const effVal = Math.min(24, baseVal + gearAdd);
                const mod = getAttributeModifier(effVal);
                const tier = getAttributeTierMeta(baseVal);

                return (
                  <div
                    key={key}
                    className="flex flex-col items-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-center"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      {meta.short[language]} · {meta.full[language]}
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={baseVal <= 6}
                        onClick={() =>
                          setAttrs((prev) => ({
                            ...prev,
                            [key]: Math.max(6, (prev[key] ?? 10) - 1),
                          }))
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm font-bold text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-35"
                      >
                        -
                      </button>
                      <div className="min-w-[44px]">
                        <div className="font-display text-lg font-bold text-[var(--text-primary)]">
                          {baseVal}
                        </div>
                        <div className="font-mono-tech text-[10px] text-[var(--accent)]">
                          {formatModifier(mod)}
                          {gearAdd !== 0 ? (
                            <span className="ml-0.5 text-[var(--success)]">
                              ({gearAdd > 0 ? `+${gearAdd}` : gearAdd})
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={baseVal >= NATURAL_ATTRIBUTE_CAP}
                        onClick={() =>
                          setAttrs((prev) => ({
                            ...prev,
                            [key]: Math.min(
                              NATURAL_ATTRIBUTE_CAP,
                              (prev[key] ?? 10) + 1,
                            ),
                          }))
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm font-bold text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-35"
                      >
                        +
                      </button>
                    </div>
                    <span
                      className="mt-1.5 rounded-full bg-[var(--bg-canvas)]/80 px-2 py-0.5 text-[9px] font-semibold"
                      style={{ color: tier.color }}
                    >
                      {tier.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)]/60 px-5 py-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <Shield className="h-3.5 w-3.5 text-[var(--accent)]" />
            Sincronizado na hora com dados e memória da IA
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--border-subtle)] px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[var(--accent-ink)] transition hover:brightness-110"
            >
              <Check className="h-3.5 w-3.5" />
              Salvar Ficha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
