import {
  Camera,
  Check,
  Dices,
  Loader2,
  Minus,
  Plus,
  Shield,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import {
  DND_BACKGROUND_LIST,
  DND_BACKGROUNDS,
  DND_CLASS_LIST,
  DND_CLASSES,
  DND_FEATS,
  DND_SKILLS,
  DND_SPECIES,
  DND_SPECIES_LIST,
  DND_SPELLS,
  DND_WEAPON_MASTERIES,
} from '../data/dnd52Catalog';
import type { ArchetypePreset } from '../data/presets';
import {
  getThemedClassLabel,
  getThemedSkillLabel,
  getThemedSpeciesLabel,
  getThemedSpellLabel,
} from '../engine/dnd52Rules';
import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_META,
  computePointBuySpent,
  formatModifier,
  getAttributeModifier,
  POINT_BUY_BUDGET,
  POINT_BUY_MAX,
  POINT_BUY_MIN,
} from '../engine/rpgSystem';
import type {
  AttributeId,
  CharacterAttributes,
  Dnd5ePlayerSheet,
  DndBackgroundId,
  DndClassId,
  DndSkillId,
  DndSpeciesId,
  ForgeArchitectMode,
  LanguageId,
  WeaponMasteryId,
  WorldThemeId,
} from '../types/game';
import { PixelHeroSprite, type HeroSpriteId } from './PixelBattleSprites';

export interface WorldForgeDndStep2Props {
  primaryTheme: WorldThemeId;
  language: LanguageId;
  useClassicDnd: boolean;
  archetypes: ArchetypePreset[];
  resolveSpriteForArchetype: (archId: string) => HeroSpriteId;
  resolveClassForArchetype: (archId: string) => DndClassId;
  forgeMode: 'quick' | 'custom';
  setForgeMode: (mode: 'quick' | 'custom') => void;
  customSubTab: 'class' | 'stats' | 'skills' | 'magic';
  setCustomSubTab: (tab: 'class' | 'stats' | 'skills' | 'magic') => void;
  selectedArchetypeId: string;
  onApplyArchetype: (arch: ArchetypePreset) => void;
  dndClassId: DndClassId;
  onSelectDndClass: (id: DndClassId) => void;
  dndSpeciesId: DndSpeciesId;
  onSelectDndSpecies: (id: DndSpeciesId) => void;
  dndBackgroundId: DndBackgroundId;
  onSelectDndBackground: (id: DndBackgroundId) => void;
  statMethod: 'standard' | 'pointbuy' | 'roll4d6';
  onApplyStatMethod: (method: 'standard' | 'pointbuy' | 'roll4d6') => void;
  attributes: CharacterAttributes;
  finalAttributes: CharacterAttributes;
  pointsRemaining: number;
  onAdjustAttribute: (key: AttributeId, delta: 1 | -1) => void;
  bgPlusTwo: AttributeId;
  setBgPlusTwo: (attr: AttributeId) => void;
  bgPlusOne: AttributeId;
  setBgPlusOne: (attr: AttributeId) => void;
  chosenClassSkills: DndSkillId[];
  setChosenClassSkills: React.Dispatch<React.SetStateAction<DndSkillId[]>>;
  chosenExpertise: DndSkillId[];
  setChosenExpertise: React.Dispatch<React.SetStateAction<DndSkillId[]>>;
  chosenCantrips: string[];
  setChosenCantrips: React.Dispatch<React.SetStateAction<string[]>>;
  chosenSpells: string[];
  setChosenSpells: React.Dispatch<React.SetStateAction<string[]>>;
  chosenFightingStyle: string;
  setChosenFightingStyle: (id: string) => void;
  chosenMasteries: WeaponMasteryId[];
  setChosenMasteries: React.Dispatch<React.SetStateAction<WeaponMasteryId[]>>;
  previewDnd: Dnd5ePlayerSheet;
  previewMaxHp: number;
  previewAc: number;
  previewSpriteId: HeroSpriteId;
  playerName: string;
  setPlayerName: (v: string) => void;
  playerAge: number;
  setPlayerAge: (v: number) => void;
  occupation: string;
  setOccupation: (v: string) => void;
  traits: string[];
  setTraits: React.Dispatch<React.SetStateAction<string[]>>;
  customTrait: string;
  setCustomTrait: (v: string) => void;
  portraitUrl?: string;
  portraitEngine?: 'gemini' | 'demo';
  isGeneratingPortrait: boolean;
  onGeneratePreviewPortrait: () => void;
  onRandomizeCharacter: () => void;
  characterIdeaInput: string;
  setCharacterIdeaInput: (v: string) => void;
  isForgingWithAi: boolean;
  activeForgeAction: ForgeArchitectMode | null;
  onRunAiProtagonist: () => void;
}

const FIGHTING_STYLES = Object.values(DND_FEATS).filter(
  (f) => f.category === 'fighting_style',
);
const ALL_MASTERIES = Object.values(DND_WEAPON_MASTERIES);

export function WorldForgeDndStep2({
  primaryTheme,
  language,
  useClassicDnd,
  archetypes,
  resolveSpriteForArchetype,
  resolveClassForArchetype,
  forgeMode,
  setForgeMode,
  customSubTab,
  setCustomSubTab,
  selectedArchetypeId,
  onApplyArchetype,
  dndClassId,
  onSelectDndClass,
  dndSpeciesId,
  onSelectDndSpecies,
  dndBackgroundId,
  onSelectDndBackground,
  statMethod,
  onApplyStatMethod,
  attributes,
  finalAttributes,
  pointsRemaining,
  onAdjustAttribute,
  bgPlusTwo,
  setBgPlusTwo,
  bgPlusOne,
  setBgPlusOne,
  chosenClassSkills,
  setChosenClassSkills,
  chosenExpertise,
  setChosenExpertise,
  chosenCantrips,
  setChosenCantrips,
  chosenSpells,
  setChosenSpells,
  chosenFightingStyle,
  setChosenFightingStyle,
  chosenMasteries,
  setChosenMasteries,
  previewDnd,
  previewMaxHp,
  previewAc,
  previewSpriteId,
  playerName,
  setPlayerName,
  playerAge,
  setPlayerAge,
  occupation,
  setOccupation,
  traits,
  setTraits,
  customTrait,
  setCustomTrait,
  portraitUrl,
  portraitEngine,
  isGeneratingPortrait,
  onGeneratePreviewPortrait,
  onRandomizeCharacter,
  characterIdeaInput,
  setCharacterIdeaInput,
  isForgingWithAi,
  activeForgeAction,
  onRunAiProtagonist,
}: WorldForgeDndStep2Props) {
  const cls = DND_CLASSES[dndClassId];
  const sp = DND_SPECIES[dndSpeciesId];
  const bg = DND_BACKGROUNDS[dndBackgroundId];
  const originFeat = DND_FEATS[bg.originFeatId];
  const allowedSkillCount = cls.skillChoicesCount + (sp.extraSkill ? 1 : 0);

  const classCantripChoices = Object.values(DND_SPELLS).filter(
    (s) => s.level === 0 && s.classes.includes(dndClassId),
  );
  const classLv1SpellChoices = Object.values(DND_SPELLS).filter(
    (s) => s.level === 1 && s.classes.includes(dndClassId),
  );
  const maxCantrips = Math.max(cls.defaultCantrips.length, classCantripChoices.length > 0 ? 2 : 0);
  const maxLv1Spells = Math.max(cls.defaultSpells.length, classLv1SpellChoices.length > 0 ? 2 : 0);

  const toggleClassSkill = (sk: DndSkillId) => {
    if (bg.skills.includes(sk)) return;
    setChosenClassSkills((prev) => {
      if (prev.includes(sk)) return prev.filter((x) => x !== sk);
      if (prev.length >= allowedSkillCount) return prev;
      return [...prev, sk];
    });
  };

  const toggleExpertise = (sk: DndSkillId) => {
    const maxExp = dndClassId === 'rogue' ? 2 : dndClassId === 'bard' ? 2 : 0;
    if (maxExp <= 0) return;
    setChosenExpertise((prev) => {
      if (prev.includes(sk)) return prev.filter((x) => x !== sk);
      if (prev.length >= maxExp) return prev;
      return [...prev, sk];
    });
  };

  const toggleCantrip = (id: string) => {
    setChosenCantrips((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxCantrips) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const toggleSpell = (id: string) => {
    setChosenSpells((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxLv1Spells) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const toggleMastery = (id: WeaponMasteryId) => {
    if (cls.weaponMasteryCount <= 0) return;
    setChosenMasteries((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= cls.weaponMasteryCount) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  return (
    <div className="space-y-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)] sm:p-7">
      {/* Top Header + Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-1">
          <button
            type="button"
            onClick={() => setForgeMode('quick')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              forgeMode === 'quick'
                ? 'bg-[var(--accent)] text-[#0a0a0c] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            ⚡ Rápido (1 Clique)
          </button>
          <button
            type="button"
            onClick={() => setForgeMode('custom')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              forgeMode === 'custom'
                ? 'bg-[var(--accent)] text-[#0a0a0c] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            🎲 Personalizar D&D 5.2
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isGeneratingPortrait}
            onClick={onGeneratePreviewPortrait}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:brightness-110 disabled:opacity-50"
          >
            <Camera className={`h-3.5 w-3.5 ${isGeneratingPortrait ? 'animate-spin' : ''}`} />
            <span>
              {isGeneratingPortrait ? 'Gerando...' : portraitUrl ? 'Novo Retrato' : 'Gerar Retrato'}
            </span>
          </button>
          <button
            type="button"
            onClick={onRandomizeCharacter}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:border-[var(--accent)]"
          >
            <Dices className="h-3.5 w-3.5" />
            Sortear
          </button>
        </div>
      </div>

      {/* Live D&D 5.2 Build Strip + Pixel Hero Sprite */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)]/85 px-3.5 py-2.5">
        <div className="flex items-center gap-3">
          {portraitUrl ? (
            <img
              src={portraitUrl}
              alt={playerName}
              className="h-14 w-14 shrink-0 rounded-xl border border-[var(--border-strong)] object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--bg-canvas)]/70 p-1">
              <PixelHeroSprite spriteId={previewSpriteId} className="h-14 w-14" />
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
              <span>{getThemedClassLabel(dndClassId, primaryTheme, useClassicDnd)}</span>
              <span className="text-[var(--text-muted)]">·</span>
              <span className="text-[var(--accent)]">
                {getThemedSpeciesLabel(dndSpeciesId, primaryTheme, useClassicDnd)}
              </span>
              <span className="text-[var(--text-muted)]">·</span>
              <span className="text-[var(--text-secondary)]">{bg.label}</span>
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
              {portraitUrl
                ? `Retrato pronto (${portraitEngine === 'gemini' ? 'Nano Banana 2.1' : 'Arte Demo'}) · `
                : ''}
              Talento: {originFeat?.label ?? 'Origem'} · Salvaguardas:{' '}
              {cls.savingThrows.map((a) => ATTRIBUTE_META[a].short[language]).join(' & ')}
            </div>
          </div>
        </div>
        <div className="font-mono-tech flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 font-bold text-emerald-300">
            ❤ {previewMaxHp} PV
          </span>
          <span className="rounded-lg border border-sky-500/35 bg-sky-500/10 px-2 py-1 font-bold text-sky-300">
            🛡 CA {previewAc}
          </span>
          <span className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 text-[var(--text-secondary)]">
            d{cls.hitDie} · PB +2
          </span>
        </div>
      </div>

      {/* Criar Protagonista sob medida com IA */}
      <div className="flex flex-col gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)]/80 p-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={characterIdeaInput}
          onChange={(e) => setCharacterIdeaInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onRunAiProtagonist();
            }
          }}
          placeholder="Descreva o personagem que imagina (opcional, ex: ex-cartógrafo cego que lê mapas pelo tato)..."
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/70 px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
        <button
          type="button"
          disabled={isForgingWithAi}
          onClick={onRunAiProtagonist}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[var(--accent)]/60 bg-[var(--accent-soft)] px-3.5 py-2 text-xs font-semibold text-[var(--accent)] transition hover:brightness-110 disabled:opacity-50"
        >
          {isForgingWithAi && activeForgeAction === 'protagonist_only' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          <span>
            {isForgingWithAi && activeForgeAction === 'protagonist_only'
              ? 'Criando...'
              : 'Criar com IA'}
          </span>
        </button>
      </div>

      {/* Identity Inputs (always accessible in both Quick and Custom modes) */}
      <div className="grid gap-3 sm:grid-cols-12">
        <div className="sm:col-span-5">
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
            Nome
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
            Idade
          </label>
          <input
            type="number"
            min={16}
            max={999}
            value={playerAge}
            onChange={(e) => setPlayerAge(Number(e.target.value))}
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div className="sm:col-span-5">
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
            Título / Ocupação
          </label>
          <input
            type="text"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      {/* LAYER 1: QUICK 1-CLICK ARCHETYPES */}
      {forgeMode === 'quick' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Arquétipos D&D 5.2 Prontos (1 Clique)
            </label>
            <button
              type="button"
              onClick={() => setForgeMode('custom')}
              className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
            >
              Personalizar Classe, Raça & Magias →
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {archetypes.map((arch) => {
              const active = selectedArchetypeId === arch.id;
              const archCls = resolveClassForArchetype(arch.id);
              const archSprite = resolveSpriteForArchetype(arch.id);
              const clsMeta = DND_CLASSES[archCls];
              return (
                <button
                  key={arch.id}
                  type="button"
                  onClick={() => onApplyArchetype(arch)}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/70">
                    <PixelHeroSprite spriteId={archSprite} className="h-10 w-10" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {arch.label[language]}
                      </span>
                      {active ? <Check className="h-4 w-4 shrink-0 text-[var(--accent)]" /> : null}
                    </div>
                    <div className="mt-0.5 text-[10px] font-semibold text-[var(--accent)]">
                      {getThemedClassLabel(archCls, primaryTheme, useClassicDnd)} · Dado d{clsMeta.hitDie}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">
                      {arch.summary[language]}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* LAYER 2: FULL D&D 5.2 CUSTOM BUILDER (4 SUB-TABS) */
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1 sm:grid-cols-4">
            {(
              [
                { id: 'class', label: '1. Classe & Raça' },
                { id: 'stats', label: '2. Atributos' },
                { id: 'skills', label: '3. Perícias' },
                { id: 'magic', label: '4. Magias / Arma' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCustomSubTab(tab.id)}
                className={`rounded-lg px-2.5 py-2 text-xs font-semibold transition ${
                  customSubTab === tab.id
                    ? 'border border-[var(--accent)]/60 bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* SUB-TAB 1: CLASS, SPECIES & BACKGROUND */}
          {customSubTab === 'class' ? (
            <div className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Classe D&D 5.2 (12 Oficiais)
                  </label>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {cls.summary}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {DND_CLASS_LIST.map((c) => {
                    const active = c.id === dndClassId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => onSelectDndClass(c.id)}
                        className={`rounded-xl border p-2.5 text-left transition ${
                          active
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate text-xs font-bold text-[var(--text-primary)]">
                            {getThemedClassLabel(c.id, primaryTheme, useClassicDnd)}
                          </span>
                          <span className="font-mono-tech rounded bg-[var(--bg-canvas)] px-1.5 py-0.5 text-[10px] text-[var(--accent)]">
                            d{c.hitDie}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-[var(--text-muted)]">
                          <span>{c.primaryAbilities.map((a) => ATTRIBUTE_META[a].short[language]).join('/')}</span>
                          {c.casterType !== 'none' ? <span>· ✨ Magia</span> : null}
                          {c.weaponMasteryCount > 0 ? <span>· ⚔️ {c.weaponMasteryCount}M</span> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Espécie / Origem (9 D&D 5.2)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DND_SPECIES_LIST.map((s) => {
                    const active = s.id === dndSpeciesId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onSelectDndSpecies(s.id)}
                        className={`rounded-xl border p-2 text-left transition ${
                          active
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div className="truncate text-xs font-semibold text-[var(--text-primary)]">
                          {getThemedSpeciesLabel(s.id, primaryTheme, useClassicDnd)}
                        </div>
                        <div className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">
                          {s.speedFeet}ft{s.darkvisionFeet > 0 ? ` · Escuro ${s.darkvisionFeet}ft` : ''}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 px-3 py-1.5 text-[11px] text-[var(--text-secondary)]">
                  <strong>Traços de {getThemedSpeciesLabel(dndSpeciesId, primaryTheme, useClassicDnd)}:</strong>{' '}
                  {sp.traits.join(' · ')}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Antecedente (2024: +2/+1 Atributos + Talento de Origem)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DND_BACKGROUND_LIST.map((b) => {
                    const active = b.id === dndBackgroundId;
                    const feat = DND_FEATS[b.originFeatId];
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => onSelectDndBackground(b.id)}
                        className={`rounded-xl border p-2.5 text-left transition ${
                          active
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-[var(--text-primary)]">
                            {b.label}
                          </span>
                          <span className="text-[10px] text-[var(--accent)]">
                            {feat?.label ?? ''}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                          {b.abilityOptions.map((a) => ATTRIBUTE_META[a].short[language]).join(' / ')} ·{' '}
                          {b.skills.map((sk) => getThemedSkillLabel(sk, primaryTheme, useClassicDnd)).join(', ')}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {/* SUB-TAB 2: ATTRIBUTES (POINT BUY / STANDARD ARRAY / 4d6 + BACKGROUND +2/+1) */}
          {customSubTab === 'stats' ? (
            <div className="space-y-4 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-elevated)]/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'pointbuy', label: 'Point Buy (27 pts)' },
                      { id: 'standard', label: 'Padrão (15/14/13/12/10/8)' },
                      { id: 'roll4d6', label: '🎲 Rolar 4d6 (descarta menor)' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onApplyStatMethod(m.id)}
                      className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                        statMethod === m.id
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                {statMethod === 'pointbuy' ? (
                  <span
                    className={`font-mono-tech rounded-full border px-3 py-1 text-xs font-semibold ${
                      pointsRemaining > 0
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
                    }`}
                  >
                    Restantes: {pointsRemaining} / {POINT_BUY_BUDGET}
                  </span>
                ) : null}
              </div>

              {/* 2024 Background +2 / +1 Assignment */}
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs">
                <span className="font-semibold text-[var(--text-secondary)]">
                  Bônus de {bg.label} (2024):
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-emerald-300">+2:</span>
                  {bg.abilityOptions.map((a) => (
                    <button
                      key={`p2_${a}`}
                      type="button"
                      onClick={() => {
                        setBgPlusTwo(a);
                        if (bgPlusOne === a) {
                          const alt = bg.abilityOptions.find((x) => x !== a);
                          if (alt) setBgPlusOne(alt);
                        }
                      }}
                      className={`rounded-md px-2 py-0.5 text-[11px] font-bold transition ${
                        bgPlusTwo === a
                          ? 'bg-emerald-500/25 text-emerald-200 ring-1 ring-emerald-400/60'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                      }`}
                    >
                      {ATTRIBUTE_META[a].short[language]}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-sky-300">+1:</span>
                  {bg.abilityOptions.map((a) => (
                    <button
                      key={`p1_${a}`}
                      type="button"
                      disabled={a === bgPlusTwo}
                      onClick={() => setBgPlusOne(a)}
                      className={`rounded-md px-2 py-0.5 text-[11px] font-bold transition disabled:opacity-30 ${
                        bgPlusOne === a
                          ? 'bg-sky-500/25 text-sky-200 ring-1 ring-sky-400/60'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                      }`}
                    >
                      {ATTRIBUTE_META[a].short[language]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {ATTRIBUTE_KEYS.map((key) => {
                  const meta = ATTRIBUTE_META[key];
                  const baseScore = attributes[key];
                  const bgBonus = (key === bgPlusTwo ? 2 : 0) + (key === bgPlusOne ? 1 : 0);
                  const totalScore = finalAttributes[key];
                  const mod = getAttributeModifier(totalScore);
                  const canDec = statMethod === 'pointbuy' && baseScore > POINT_BUY_MIN;
                  const nextCandidate = { ...attributes, [key]: baseScore + 1 };
                  const canInc =
                    statMethod === 'pointbuy' &&
                    baseScore < POINT_BUY_MAX &&
                    computePointBuySpent(nextCandidate) <= POINT_BUY_BUDGET;

                  return (
                    <div
                      key={key}
                      title={meta.hint[language]}
                      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-center"
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                        {meta.short[language]} · {meta.full[language]}
                      </div>
                      <div className="font-display mt-1 text-2xl font-bold text-[var(--text-primary)]">
                        {formatModifier(mod)}
                      </div>
                      <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                        Base {baseScore}
                        {bgBonus > 0 ? (
                          <span className="font-bold text-emerald-300"> +{bgBonus}</span>
                        ) : null}
                      </div>
                      <div className="mt-2 flex items-center justify-center gap-2">
                        <button
                          type="button"
                          disabled={!canDec}
                          onClick={() => onAdjustAttribute(key, -1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition hover:border-[var(--accent)] disabled:opacity-30"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="font-mono-tech w-8 text-sm font-bold text-[var(--text-primary)]">
                          {totalScore}
                        </span>
                        <button
                          type="button"
                          disabled={!canInc}
                          onClick={() => onAdjustAttribute(key, 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition hover:border-[var(--accent)] disabled:opacity-30"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* SUB-TAB 3: 18 OFFICIAL SKILLS & EXPERTISE */}
          {customSubTab === 'skills' ? (
            <div className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                    Perícias de Classe ({chosenClassSkills.length} / {allowedSkillCount})
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Antecedente {bg.label} já concede:{' '}
                    {bg.skills.map((sk) => getThemedSkillLabel(sk, primaryTheme, useClassicDnd)).join(', ')}.
                    {sp.extraSkill ? ' (+1 perícia bônus de Humano)' : ''}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {cls.allowedSkills.map((sk) => {
                  const fromBg = bg.skills.includes(sk);
                  const picked = fromBg || chosenClassSkills.includes(sk);
                  const isExp = chosenExpertise.includes(sk);
                  const attr = DND_SKILLS[sk].attribute;
                  const bonus =
                    getAttributeModifier(finalAttributes[attr]) +
                    (picked ? (isExp ? 4 : 2) : 0);
                  return (
                    <button
                      key={sk}
                      type="button"
                      onClick={() => toggleClassSkill(sk)}
                      className={`flex items-center justify-between rounded-xl border px-2.5 py-2 text-left text-xs transition ${
                        picked
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <span className="truncate font-medium">
                        {fromBg ? '★ ' : picked ? '● ' : '○ '}
                        {getThemedSkillLabel(sk, primaryTheme, useClassicDnd)}
                      </span>
                      <span className="font-mono-tech ml-1 shrink-0 text-[11px] font-bold text-[var(--accent)]">
                        {formatModifier(bonus)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {dndClassId === 'rogue' || dndClassId === 'bard' ? (
                <div className="border-t border-[var(--border-subtle)] pt-3">
                  <div className="mb-1.5 text-[11px] font-semibold text-amber-300">
                    Especialização (2× Bônus de Proficiência · escolha até 2 perícias proficientes):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {previewDnd.skillProficiencies.map((sk) => {
                      const active = chosenExpertise.includes(sk);
                      return (
                        <button
                          key={`exp_${sk}`}
                          type="button"
                          onClick={() => toggleExpertise(sk)}
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                            active
                              ? 'border-amber-400/70 bg-amber-500/20 text-amber-200'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                          }`}
                        >
                          {active ? '★★ ' : '☆ '}
                          {getThemedSkillLabel(sk, primaryTheme, useClassicDnd)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* SUB-TAB 4: SPELLS, CANTRIPS, WEAPON MASTERIES & FIGHTING STYLE */}
          {customSubTab === 'magic' ? (
            <div className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 p-4">
              {classCantripChoices.length > 0 ? (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-purple-300">
                      <Wand2 className="h-3.5 w-3.5" />
                      Truques / Cantrips ({chosenCantrips.length}/{maxCantrips})
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">Uso ilimitado</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {classCantripChoices.map((spDef) => {
                      const active = chosenCantrips.includes(spDef.id);
                      return (
                        <button
                          key={spDef.id}
                          type="button"
                          onClick={() => toggleCantrip(spDef.id)}
                          className={`rounded-xl border p-2.5 text-left transition ${
                            active
                              ? 'border-purple-400/70 bg-purple-500/15'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                            <span>{getThemedSpellLabel(spDef.id, primaryTheme, useClassicDnd)}</span>
                            {active ? <Check className="h-3.5 w-3.5 text-purple-300" /> : null}
                          </div>
                          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{spDef.summary}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {classLv1SpellChoices.length > 0 ? (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-sky-300">
                      Magias de 1º Círculo ({chosenSpells.length}/{maxLv1Spells})
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {cls.casterType === 'pact'
                        ? 'Recarrega no Descanso Curto'
                        : 'Espaços de Magia 2024'}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {classLv1SpellChoices.map((spDef) => {
                      const active = chosenSpells.includes(spDef.id);
                      return (
                        <button
                          key={spDef.id}
                          type="button"
                          onClick={() => toggleSpell(spDef.id)}
                          className={`rounded-xl border p-2.5 text-left transition ${
                            active
                              ? 'border-sky-400/70 bg-sky-500/15'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                            <span>{getThemedSpellLabel(spDef.id, primaryTheme, useClassicDnd)}</span>
                            <span className="text-[10px] text-sky-300">
                              {spDef.castingTime === 'bonus'
                                ? 'Bônus'
                                : spDef.castingTime === 'reaction'
                                  ? 'Reação'
                                  : 'Ação'}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{spDef.summary}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {cls.weaponMasteryCount > 0 ? (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300">
                      <Shield className="h-3.5 w-3.5" />
                      Maestrias de Arma 2024 ({chosenMasteries.length}/{cls.weaponMasteryCount})
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ALL_MASTERIES.map((m) => {
                      const active = chosenMasteries.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleMastery(m.id)}
                          className={`rounded-xl border p-2.5 text-left transition ${
                            active
                              ? 'border-amber-400/70 bg-amber-500/15'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                            <span>{m.label}</span>
                            {active ? <Check className="h-3.5 w-3.5 text-amber-300" /> : null}
                          </div>
                          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{m.summary}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {dndClassId === 'fighter' ? (
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                    Estilo de Luta (Guerreiro Nv.1)
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {FIGHTING_STYLES.map((fs) => {
                      const active = chosenFightingStyle === fs.id;
                      return (
                        <button
                          key={fs.id}
                          type="button"
                          onClick={() => setChosenFightingStyle(fs.id)}
                          className={`rounded-xl border p-2.5 text-left transition ${
                            active
                              ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'
                          }`}
                        >
                          <div className="text-xs font-bold text-[var(--text-primary)]">{fs.label}</div>
                          <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{fs.summary}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {classCantripChoices.length === 0 &&
              classLv1SpellChoices.length === 0 &&
              cls.weaponMasteryCount === 0 ? (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-xs text-[var(--text-secondary)]">
                  <strong>{getThemedClassLabel(dndClassId, primaryTheme, useClassicDnd)}</strong> usa
                  Artes Marciais e Pontos de Foco desbloqueados automaticamente com sua classe (sem
                  magias preparadas no Nível 1).
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {/* Personality Traits */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Traços de Personalidade
        </label>
        <div className="flex flex-wrap gap-2">
          {traits.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--text-primary)]"
            >
              {t}
              <button
                type="button"
                onClick={() => setTraits((prev) => prev.filter((x) => x !== t))}
                className="text-[var(--text-muted)] hover:text-[var(--danger)]"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2.5 flex max-w-xs gap-2">
          <input
            type="text"
            value={customTrait}
            onChange={(e) => setCustomTrait(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customTrait.trim()) {
                setTraits((p) => [...p, customTrait.trim()]);
                setCustomTrait('');
              }
            }}
            placeholder="Adicionar traço..."
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            onClick={() => {
              if (!customTrait.trim()) return;
              setTraits((p) => [...p, customTrait.trim()]);
              setCustomTrait('');
            }}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 text-xs hover:border-[var(--accent)]"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
