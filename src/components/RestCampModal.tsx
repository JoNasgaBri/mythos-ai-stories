import {
  AlertTriangle,
  BookOpen,
  Coffee,
  Flame,
  Heart,
  Home,
  Moon,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { isDndRuleset } from '../engine/dnd52Rules';
import {
  formatClockTime,
  getAttributeModifier,
  getEffectiveAttributes,
  getProficiencyBonus,
  MAX_SHORT_RESTS_PER_DAY,
} from '../engine/rpgSystem';
import type { Campaign, WorldThemeId } from '../types/game';

export type RestKind = 'short' | 'long';

export type RestFocus =
  | 'quiet'
  | 'companion'
  | 'train'
  | 'refuge';

export interface RestChoicePayload {
  kind: RestKind;
  focus: RestFocus;
  companionName?: string;
  skillName?: string;
  customNote?: string;
  narrateScene: boolean;
  hitDiceToSpend?: number;
}

interface RestCampModalProps {
  open: boolean;
  campaign: Campaign;
  isBusy: boolean;
  onClose: () => void;
  onConfirmRest: (payload: RestChoicePayload) => void;
}

const REST_FLAVOR: Record<
  WorldThemeId,
  { title: string; subtitle: string; longLabel: string; refugeLabel: string }
> = {
  fantasy: {
    title: 'Pausa & Acampamento',
    subtitle: 'Escolha como recuperar forças na estalagem, abrigo ou acampamento.',
    longLabel: 'Descanso Longo (Dormir até o Amanhecer)',
    refugeLabel: 'Cuidar do acampamento, suprimentos e vigília',
  },
  cyberpunk: {
    title: 'Pausa no Esconderijo',
    subtitle: 'Recupere o fôlego, revise implantes/equipamentos ou passe a noite em segurança.',
    longLabel: 'Descanso Longo (Pernoite no Esconderijo)',
    refugeLabel: 'Checar travas, equipamentos e sinais da rede',
  },
  mystery: {
    title: 'Pausa & Pernoite',
    subtitle: 'Organize suas pistas, converse com aliados ou durma até o dia seguinte.',
    longLabel: 'Descanso Longo (Dormir até o Dia Seguinte)',
    refugeLabel: 'Organizar anotações, pistas e recursos',
  },
  zombies: {
    title: 'Pausa no Refúgio',
    subtitle: 'Descanse com segurança no apartamento/abrigo sem desconectar da sua cena.',
    longLabel: 'Descanso Longo (Dormir até 07:30)',
    refugeLabel: 'Checar portas, estoque de comida e suprimentos',
  },
  apocalyptic: {
    title: 'Pausa no Abrigo',
    subtitle: 'Economize energia, faça manutenção ou passe a noite sob proteção.',
    longLabel: 'Descanso Longo (Dormir até o Amanhecer)',
    refugeLabel: 'Reforçar abrigo, água e manutenção',
  },
};

export function RestCampModal({
  open,
  campaign,
  isBusy,
  onClose,
  onConfirmRest,
}: RestCampModalProps) {
  const [kind, setKind] = useState<RestKind>('short');
  const [focus, setFocus] = useState<RestFocus>('quiet');
  const [companionName, setCompanionName] = useState('');
  const [skillName, setSkillName] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [narrateScene, setNarrateScene] = useState(true);
  const [hitDiceToSpend, setHitDiceToSpend] = useState(0);

  const isDnd = isDndRuleset(campaign);
  const dnd = campaign.player.dnd;
  const hitDiceAvailable = dnd?.hitDiceRemaining ?? 0;
  const hitDieSize = dnd?.hitDie ?? 10;
  const missingHp = Math.max(0, campaign.player.maxVigor - campaign.player.vigor);
  const effConMod = getAttributeModifier(getEffectiveAttributes(campaign.player).con);
  const pb = getProficiencyBonus(campaign.player.level);

  const aliveNpcs = campaign.codex.npcs.filter((n) => n.status === 'alive');
  const partyFirst = [
    ...aliveNpcs.filter((n) => n.inParty),
    ...aliveNpcs.filter((n) => !n.inParty),
  ];
  const skills = campaign.player.skillLevels ?? [];

  const recommendedHitDice =
    isDnd && missingHp > 0 && hitDiceAvailable > 0
      ? Math.min(
          hitDiceAvailable,
          Math.max(1, Math.ceil(missingHp / Math.max(1, Math.floor(hitDieSize / 2) + 1 + effConMod))),
        )
      : 0;

  useEffect(() => {
    if (!open) return;
    const used = campaign.worldClock?.shortRestsUsedToday ?? 0;
    setKind(!isDnd && used >= MAX_SHORT_RESTS_PER_DAY ? 'long' : 'short');
    setFocus('quiet');
    setCompanionName(partyFirst[0]?.name ?? '');
    setSkillName(skills[0]?.name ?? '');
    setCustomNote('');
    setNarrateScene(true);
    setHitDiceToSpend(recommendedHitDice);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const flavor =
    REST_FLAVOR[campaign.world.primaryTheme] ?? REST_FLAVOR.fantasy;
  const shortRestsUsed = campaign.worldClock?.shortRestsUsedToday ?? 0;
  const shortRestsLeft = Math.max(0, MAX_SHORT_RESTS_PER_DAY - shortRestsUsed);
  const hasMedbay = Boolean(
    campaign.stronghold?.upgrades.some((u) => u.id === 'medbay'),
  );
  const longVigorGain = hasMedbay ? 80 : 55;
  const isHighTension = campaign.player.tension >= 75;
  const clockTime = formatClockTime(
    campaign.worldClock?.hour ?? 8,
    campaign.worldClock?.minute ?? 30,
  );

  const handleConfirm = () => {
    if (isBusy) return;
    onConfirmRest({
      kind,
      focus,
      companionName: focus === 'companion' ? companionName || undefined : undefined,
      skillName: focus === 'train' ? skillName || undefined : undefined,
      customNote: customNote.trim() || undefined,
      narrateScene,
      hitDiceToSpend: isDnd && kind === 'short' ? hitDiceToSpend : undefined,
    });
    onClose();
  };

  return (
    <div
      className="animate-backdrop-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-label="Descanso Contextual"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-modal-spring w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-[var(--shadow-elevated)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/55 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--accent-soft)] text-[#fb923c]">
              <Flame className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
                {flavor.title}
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                {campaign.currentLocation} · Dia {campaign.worldClock?.day ?? 1} ({clockTime})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border-subtle)] p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[75vh] space-y-4 overflow-y-auto p-5">
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
            {flavor.subtitle}
          </p>

          {isHighTension ? (
            <div className="flex items-start gap-2.5 rounded-2xl border border-[var(--warning)]/50 bg-[var(--warning)]/10 p-3 text-xs text-[var(--warning)]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>Tensão alta ({campaign.player.tension}%):</strong> descansar agora neste local pode exigir vigília ou atrair complicações se você não estiver protegido.
              </span>
            </div>
          ) : null}

          {/* Rest Type Picker: Short vs Long (D&D 2024 SRD 5.2 / Legacy) */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={!isDnd && shortRestsLeft <= 0}
              onClick={() => setKind('short')}
              className={`rounded-2xl border p-3.5 text-left transition disabled:opacity-45 ${
                kind === 'short'
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                  <Coffee className="h-3.5 w-3.5 text-[var(--accent)]" />
                  Descanso Curto
                </span>
                <span className="font-mono-tech rounded bg-[var(--bg-canvas)]/70 px-1.5 py-0.5 text-[10px] text-[var(--accent)]">
                  {isDnd ? `${hitDiceAvailable}/${campaign.player.level} d${hitDieSize}` : `${shortRestsLeft}/${MAX_SHORT_RESTS_PER_DAY}`}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-[var(--text-secondary)]">
                {isDnd ? (
                  <>
                    Avança <strong>+1h</strong>, permite gastar <strong>Dados de Vida</strong> (d{hitDieSize}{effConMod >= 0 ? `+${effConMod}` : effConMod}) e recarrega recursos curtos.
                  </>
                ) : (
                  <>
                    Avança <strong>+1h30</strong>, recupera <strong>+20 Vigor</strong> e mantém você na cena atual.
                  </>
                )}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setKind('long')}
              className={`rounded-2xl border p-3.5 text-left transition ${
                kind === 'long'
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                  <Moon className="h-3.5 w-3.5 text-[#818cf8]" />
                  Descanso Longo
                </span>
                <span className="font-mono-tech rounded bg-[var(--bg-canvas)]/70 px-1.5 py-0.5 text-[10px] text-[var(--success)]">
                  {isDnd ? '8h · 100%' : '07:30'}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-[var(--text-secondary)]">
                {isDnd ? (
                  <>
                    <strong>100% PV</strong>, <strong>todos os Dados de Vida</strong>, Espaços de Magia, <strong>−1 Exaustão</strong>{hasMedbay ? ` e +${campaign.player.level + pb} PV Temp` : ''}.
                  </>
                ) : (
                  <>
                    Passa para o <strong>Dia {(campaign.worldClock?.day ?? 1) + 1}</strong>, recupera <strong>+{longVigorGain} Vigor</strong>{hasMedbay ? ' (Enfermaria)' : ''} e alivia tensão.
                  </>
                )}
              </p>
            </button>
          </div>

          {/* Cancel-Safe Hit Dice Stepper for D&D 5.2 Short Rest */}
          {isDnd && kind === 'short' && missingHp > 0 && hitDiceAvailable > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent-soft)]/50 px-3.5 py-2.5 text-xs">
              <div>
                <div className="font-semibold text-[var(--text-primary)]">
                  Gastar Dados de Vida (d{hitDieSize}{effConMod >= 0 ? `+${effConMod}` : effConMod})
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  PV atual: {campaign.player.vigor}/{campaign.player.maxVigor} · Rolado ao confirmar
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setHitDiceToSpend((n) => Math.max(0, n - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] font-bold"
                >
                  −
                </button>
                <span className="font-mono-tech min-w-[44px] text-center font-bold text-[var(--accent)]">
                  {hitDiceToSpend}/{hitDiceAvailable}
                </span>
                <button
                  type="button"
                  onClick={() => setHitDiceToSpend((n) => Math.min(hitDiceAvailable, n + 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] font-bold"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setHitDiceToSpend(recommendedHitDice)}
                  className="rounded-lg bg-[var(--accent)]/20 px-2 py-1 text-[10px] font-bold text-[var(--accent)]"
                >
                  Auto
                </button>
              </div>
            </div>
          ) : null}

          {/* Focus Picker */}
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              O que fazer durante essa pausa?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFocus('quiet')}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition ${
                  focus === 'quiet'
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>Apenas descansar</span>
              </button>

              <button
                type="button"
                disabled={partyFirst.length === 0}
                onClick={() => setFocus('companion')}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition disabled:opacity-40 ${
                  focus === 'companion'
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                }`}
              >
                <Heart className="h-3.5 w-3.5 shrink-0 text-[#f472b6]" />
                <span>Conversar com NPC</span>
              </button>

              <button
                type="button"
                onClick={() => setFocus('train')}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition ${
                  focus === 'train'
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0 text-[#60a5fa]" />
                <span>Treinar habilidade</span>
              </button>

              <button
                type="button"
                onClick={() => setFocus('refuge')}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition ${
                  focus === 'refuge'
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                }`}
              >
                <Home className="h-3.5 w-3.5 shrink-0 text-[var(--success)]" />
                <span>Preparar / Refúgio</span>
              </button>
            </div>

            {focus === 'companion' && partyFirst.length > 0 ? (
              <div className="mt-2.5">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Com quem você quer conversar?
                </label>
                <select
                  value={companionName}
                  onChange={(e) => setCompanionName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                >
                  {partyFirst.map((n) => (
                    <option key={n.id} value={n.name}>
                      {n.name} {n.inParty ? '(No Grupo)' : `(${n.role})`}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {focus === 'train' ? (
              <div className="mt-2.5">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Qual habilidade praticar ou estudar?
                </label>
                {skills.length > 0 ? (
                  <select
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  >
                    {skills.map((sk) => (
                      <option key={sk.name} value={sk.name}>
                        {sk.name} (Nv.{sk.level})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value)}
                    placeholder="Ex: Primeiros Socorros, Combate, Negociação..."
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                )}
              </div>
            ) : null}

            {focus === 'refuge' ? (
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                <Shield className="mr-1 inline h-3 w-3 text-[var(--success)]" />
                {flavor.refugeLabel} (Defesa atual: {campaign.stronghold?.defense ?? 20}).
              </p>
            ) : null}
          </div>

          {/* Optional Note */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Detalhe opcional para a IA (se quiser direcionar a pausa)
            </label>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Ex: Chamo minha vizinha para jantar e conversar sobre o plano..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Narrate toggle */}
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-xs">
            <div>
              <div className="font-medium text-[var(--text-primary)]">
                Narrar cena de descanso com a IA
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">
                Desmarque para apenas recuperar Vigor e avançar o relógio silenciosamente.
              </div>
            </div>
            <input
              type="checkbox"
              checked={narrateScene}
              onChange={(e) => setNarrateScene(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[#111] shadow transition hover:brightness-110 disabled:opacity-50"
          >
            {kind === 'short' ? (
              <Coffee className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
            <span>
              {kind === 'short'
                ? 'Fazer Descanso Curto'
                : 'Fazer Descanso Longo'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
