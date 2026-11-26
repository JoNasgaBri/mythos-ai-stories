import {
  Activity,
  Award,
  Backpack,
  BookOpen,
  Brain,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coins,
  Compass,
  Eye,
  FilePlus2,
  Flag,
  Flame,
  Footprints,
  Globe2,
  Hammer,
  Heart,
  Home,
  Key,
  Layers,
  Map as MapIcon,
  MapPin,
  MessageSquare,
  Navigation,
  Pencil,
  Pin,
  Plus,
  Scale,
  ScrollText,
  Shield,
  Skull,
  Sparkles,
  Sword,
  Target,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  Wand2,
  Wrench,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import {
  DND_BACKGROUNDS,
  DND_CLASSES,
  DND_CONDITIONS,
  DND_FEATS,
  DND_SKILLS,
  DND_SPECIES,
  DND_SPELLS,
  DND_WEAPON_MASTERIES,
} from '../data/dnd52Catalog';
import { DIFFICULTIES, STORY_PACE_OPTIONS, UI_COPY } from '../data/presets';
import {
  computeArmorClass,
  computeInitiativeBonus,
  computePassiveScore,
  computeSavingThrowModifier,
  computeSkillModifier,
  computeSpeedFeet,
  computeSpellcastingInfo,
  formatSpeedMetric,
  getMaxInspirationForRuleset,
  getThemedClassLabel,
  getThemedSkillLabel,
  getThemedSpeciesLabel,
  getThemedSpellLabel,
  isDndRuleset,
} from '../engine/dnd52Rules';
import {
  ALL_EQUIP_SLOTS,
  ATTRIBUTE_KEYS,
  ATTRIBUTE_META,
  EQUIP_SLOT_LABEL,
  formatModifier,
  getAttributeModifier,
  getAttributeTierMeta,
  getEffectiveAttributes,
  getEquippedGearBonuses,
  getNextAsiLevel,
  getProficiencyBonus,
  LOCATION_KIND_META,
  LOCATION_STATUS_META,
  MAX_LEVEL,
  MAX_PARTY_SIZE,
  NATURAL_ATTRIBUTE_CAP,
  RARITY_META,
  RELATIONSHIP_META,
  STRONGHOLD_UPGRADE_CATALOG,
} from '../engine/rpgSystem';
import type {
  AttributeId,
  Campaign,
  DndSkillId,
  EquipSlot,
  FactionStanding,
  InventoryItem,
  ItemCategory,
  LanguageId,
  LocationDanger,
  LocationRecord,
  NpcRecord,
  NpcStance,
  WorldConfig,
} from '../types/game';

interface ContextHudProps {
  campaign: Campaign;
  language: LanguageId;
  useClassicDndNames?: boolean;
  isSummarizing: boolean;
  isGeneratingPortrait: boolean;
  generatingNpcPortraitId?: string | null;
  onUseItem: (item: InventoryItem) => void;
  onToggleEquipItem?: (itemId: string) => void;
  onSpendAttributePoint?: (attr: AttributeId) => void;
  onTogglePartyMember?: (npcId: string) => void;
  onGenerateNpcPortrait?: (npcId: string) => void;
  onBuildStrongholdUpgrade?: (upgradeId: string) => void;
  onOpenWorldMap?: () => void;
  onOpenCharacterInventory?: () => void;
  onOpenBaseBlueprint?: () => void;
  onOpenRelationships?: (npcId?: string) => void;
  onOpenEditProtagonist?: () => void;
  onOpenLevelUpModal?: () => void;
  onMigrateToDnd52?: () => void;
  onMentionNpc: (npc: NpcRecord) => void;
  onTravelLocation: (loc: LocationRecord) => void;
  onAddCanonFact: (factText: string) => void;
  onRemoveCanonFact: (factId: string) => void;
  onUpdateWorldNotes?: (
    patch: Partial<Pick<WorldConfig, 'era' | 'history' | 'premise' | 'creativePrompt'>>,
  ) => void;
  onSummarizeNow: () => void;
  onConcludeCampaign: () => void;
  onGeneratePortrait: () => void;
  onZoomImage?: (url: string, caption?: string, engine?: 'gemini' | 'demo') => void;
}

const CATEGORY_ICON: Record<ItemCategory, typeof Sword> = {
  weapon: Sword,
  tool: Wrench,
  relic: Sparkles,
  consumable: Flame,
  clue: Key,
  misc: Backpack,
};

const STANCE_META: Record<
  NpcStance,
  { label: string; color: string; bg: string }
> = {
  ally: { label: 'Aliado', color: 'var(--success)', bg: 'rgba(110, 196, 134, 0.14)' },
  neutral: { label: 'Neutro', color: 'var(--text-secondary)', bg: 'var(--bg-surface)' },
  suspicious: { label: 'Suspeito', color: 'var(--warning)', bg: 'rgba(234, 179, 8, 0.14)' },
  hostile: { label: 'Hostil', color: 'var(--danger)', bg: 'rgba(224, 93, 82, 0.14)' },
  unknown: { label: 'Incerto', color: 'var(--text-muted)', bg: 'var(--bg-surface)' },
};

const FACTION_META: Record<
  FactionStanding,
  { label: string; color: string; bg: string }
> = {
  allied: { label: 'Aliada', color: 'var(--success)', bg: 'rgba(110, 196, 134, 0.14)' },
  neutral: { label: 'Neutra', color: 'var(--text-secondary)', bg: 'var(--bg-surface)' },
  wary: { label: 'Cautelosa', color: 'var(--warning)', bg: 'rgba(234, 179, 8, 0.14)' },
  hostile: { label: 'Hostil', color: 'var(--danger)', bg: 'rgba(224, 93, 82, 0.14)' },
};

const DANGER_META: Record<LocationDanger, { label: string; color: string }> = {
  safe: { label: 'Seguro', color: 'var(--success)' },
  tense: { label: 'Tenso', color: 'var(--warning)' },
  hostile: { label: 'Hostil', color: 'var(--danger)' },
};

export function ContextHud({
  campaign,
  language,
  useClassicDndNames = false,
  isSummarizing,
  isGeneratingPortrait,
  generatingNpcPortraitId,
  onUseItem,
  onToggleEquipItem,
  onSpendAttributePoint,
  onTogglePartyMember,
  onGenerateNpcPortrait,
  onBuildStrongholdUpgrade,
  onOpenWorldMap,
  onOpenCharacterInventory,
  onOpenBaseBlueprint,
  onOpenRelationships,
  onOpenEditProtagonist,
  onOpenLevelUpModal,
  onMigrateToDnd52,
  onMentionNpc,
  onTravelLocation,
  onAddCanonFact,
  onRemoveCanonFact,
  onUpdateWorldNotes,
  onSummarizeNow,
  onConcludeCampaign,
  onGeneratePortrait,
  onZoomImage,
}: ContextHudProps) {
  const [activeTab, setActiveTab] = useState<
    'sheet' | 'pack' | 'world' | 'quests' | 'chronicle'
  >('sheet');
  const [worldSubTab, setWorldSubTab] = useState<'lore' | 'memory' | 'codex' | 'base'>('lore');
  const [newFactInput, setNewFactInput] = useState('');
  const [showAll18Skills, setShowAll18Skills] = useState(false);
  const [showGrimoireSection, setShowGrimoireSection] = useState(false);
  const [isEditingLore, setIsEditingLore] = useState(false);
  const [draftEra, setDraftEra] = useState(campaign.world.era);
  const [draftHistory, setDraftHistory] = useState(campaign.world.history);
  const [draftPremise, setDraftPremise] = useState(campaign.world.premise);
  const [draftCreativePrompt, setDraftCreativePrompt] = useState(
    campaign.world.creativePrompt ?? '',
  );

  const startEditingLore = () => {
    setDraftEra(campaign.world.era);
    setDraftHistory(campaign.world.history);
    setDraftPremise(campaign.world.premise);
    setDraftCreativePrompt(campaign.world.creativePrompt ?? '');
    setIsEditingLore(true);
  };

  const saveEditingLore = () => {
    onUpdateWorldNotes?.({
      era: draftEra.trim() || campaign.world.era,
      history: draftHistory.trim() || campaign.world.history,
      premise: draftPremise.trim() || campaign.world.premise,
      creativePrompt: draftCreativePrompt.trim() || undefined,
    });
    setIsEditingLore(false);
  };

  const copy = UI_COPY[language];
  const { player, codex, world } = campaign;
  const isDnd = isDndRuleset(campaign);
  const dnd = player.dnd;
  const effectiveAttrs = getEffectiveAttributes(player);
  const gearBonuses = getEquippedGearBonuses(player.inventory);
  const difficultyMeta = DIFFICULTIES.find((d) => d.id === campaign.difficulty);
  const paceMeta = STORY_PACE_OPTIONS.find((p) => p.id === world.storyPace);
  const maxInsp = getMaxInspirationForRuleset(campaign.ruleset);
  const acInfo = isDnd ? computeArmorClass(player) : null;
  const initBonus = isDnd ? computeInitiativeBonus(player) : 0;
  const speedFeet = isDnd ? computeSpeedFeet(player) : 30;
  const passivePerception = isDnd ? computePassiveScore(player, 'perception') : 10;
  const spellcastingInfo = isDnd ? computeSpellcastingInfo(player) : null;
  const hasPendingLevelChoices = Boolean(
    isDnd &&
      dnd &&
      (dnd.pendingSubclassChoice ||
        (dnd.pendingAsiOrFeat ?? 0) > 0 ||
        dnd.pendingEpicBoon),
  );
  const vigorPct = Math.max(
    0,
    Math.min(100, (player.vigor / Math.max(1, player.maxVigor)) * 100),
  );

  const initials = player.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  const activeQuests = player.quests.filter((q) => q.status === 'active');
  const resolvedQuests = player.quests.filter((q) => q.status !== 'active');
  const worldCount =
    codex.npcs.length + codex.locations.length + codex.canonFacts.length;
  const isEnded =
    campaign.status === 'ended_fallen' || campaign.status === 'ended_victory';
  const partyMembers = codex.npcs.filter(
    (n) => n.inParty && n.status === 'alive',
  );
  const inspirationCount = Math.min(maxInsp, player.inspiration ?? (isDnd ? 1 : 1));

  const handlePinFact = () => {
    const trimmed = newFactInput.trim();
    if (!trimmed) return;
    onAddCanonFact(trimmed);
    setNewFactInput('');
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 shadow-[var(--shadow-card)] backdrop-blur-md">
      {/* Main 5 Tabs */}
      <div className="grid grid-cols-5 gap-1 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/45 p-1.5">
        {(
          [
            { id: 'sheet', label: copy.sheetTab, icon: Shield },
            { id: 'pack', label: copy.inventoryTab, icon: Backpack, count: player.inventory.length },
            { id: 'world', label: copy.worldTab, icon: Globe2, count: worldCount },
            { id: 'quests', label: copy.questsTab, icon: Target, count: activeQuests.length },
            { id: 'chronicle', label: copy.chronicleTab, icon: BookOpen, count: player.journal.length + campaign.eraSummaries.length },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition ${
                active
                  ? 'border border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
              }`}
            >
              <div className="relative">
                <Icon className="h-3.5 w-3.5" />
                {'count' in tab && tab.count > 0 ? (
                  <span className="font-mono-tech absolute -top-1.5 -right-2.5 rounded-full bg-[var(--bg-elevated)] px-1 text-[9px] text-[var(--text-secondary)]">
                    {tab.count}
                  </span>
                ) : null}
              </div>
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div key={activeTab} className="animate-tab-fade flex-1 overflow-y-auto p-4">
        {activeTab === 'sheet' ? (
          <div className="space-y-4">
            {/* Legacy 1-Click Migration Banner */}
            {!isDnd && !isEnded && onMigrateToDnd52 ? (
              <div className="rounded-xl border border-amber-400/45 bg-amber-500/10 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-200">
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                      Campanha no Modo Legado (MYTHOS Clássico)
                    </div>
                    <p className="mt-0.5 text-[10px] leading-snug text-amber-100/80">
                      Converta herói e aliados para D&amp;D 5e 2024 (CA, 18 Perícias, Salvaguardas, Magias &amp; Maestrias). Um backup automático é salvo antes.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onMigrateToDnd52}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-[11px] font-bold text-slate-950 transition hover:brightness-110"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Migrar para D&amp;D 5.2 (2024)
                </button>
              </div>
            ) : null}

            {/* Pending Level-Up Modal Banner (Subclass / ASI / Feat / Epic Boon) */}
            {hasPendingLevelChoices && !isEnded && onOpenLevelUpModal ? (
              <button
                type="button"
                onClick={onOpenLevelUpModal}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-amber-400/60 bg-gradient-to-r from-amber-500/20 to-violet-500/20 px-3.5 py-2.5 text-left shadow-sm transition hover:brightness-110"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-200">
                    <Award className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>Evolução Pendente (Nv.{player.level})!</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-amber-100/80">
                    {[
                      dnd?.pendingSubclassChoice ? 'Escolher Subclasse' : null,
                      (dnd?.pendingAsiOrFeat ?? 0) > 0 ? 'ASI (+2) ou Talento' : null,
                      dnd?.pendingEpicBoon ? 'Dádiva Épica (Nv.19)' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-amber-400 px-2.5 py-1 text-[10px] font-bold text-slate-950">
                  Escolher
                </span>
              </button>
            ) : null}

            {/* Portrait / Crest + Identity */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3.5">
                {player.portraitUrl ? (
                  <button
                    type="button"
                    onClick={() =>
                      onZoomImage?.(
                        player.portraitUrl!,
                        `${player.name} · ${player.occupation}`,
                        player.portraitEngine,
                      )
                    }
                    title="Ampliar retrato"
                    className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-md transition hover:border-[var(--accent)]"
                  >
                    <img
                      src={player.portraitUrl}
                      alt={player.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </button>
                ) : (
                  <div className="font-display flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--accent-soft)] text-base font-bold text-[var(--accent)]">
                    {initials || 'M'}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate text-base font-semibold text-[var(--text-primary)]">
                      {player.name}
                    </h3>
                    <span className="font-mono-tech shrink-0 rounded-md border border-[var(--accent)]/50 bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                      Nv.{player.level}
                    </span>
                  </div>
                  {isDnd && dnd ? (
                    <p className="truncate text-xs font-medium text-[var(--accent)]">
                      {getThemedClassLabel(dnd.classId, world.primaryTheme, useClassicDndNames)}
                      {dnd.subclassId
                        ? ` (${DND_CLASSES[dnd.classId]?.subclasses.find((s) => s.id === dnd.subclassId)?.label ?? dnd.subclassId})`
                        : ''}{' '}
                      · {getThemedSpeciesLabel(dnd.speciesId, world.primaryTheme, useClassicDndNames)}
                    </p>
                  ) : null}
                  <p className="truncate text-[11px] text-[var(--text-secondary)]">
                    {isDnd && dnd
                      ? `${DND_BACKGROUNDS[dnd.backgroundId]?.label ?? player.occupation} · ${player.age} anos`
                      : `${player.occupation} · ${player.age} anos${player.height ? ` · ${player.height}` : ''}`}
                  </p>
                  {player.physique ? (
                    <p className="truncate text-[10px] text-[var(--text-muted)]">
                      Porte: {player.physique}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {onOpenEditProtagonist && !isEnded ? (
                  <button
                    type="button"
                    onClick={onOpenEditProtagonist}
                    title="Editar Nome, Altura, Porte Físico e Atributos"
                    className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[var(--border-strong)] bg-[var(--accent-soft)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--accent)] transition hover:brightness-110"
                  >
                    <Pencil className="h-3 w-3" />
                    <span>Editar</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={isGeneratingPortrait}
                  onClick={onGeneratePortrait}
                  title={player.portraitUrl ? 'Gerar novo retrato' : 'Gerar retrato do personagem'}
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--accent)] transition hover:border-[var(--accent)] disabled:opacity-50"
                >
                  <Camera className={`h-3.5 w-3.5 ${isGeneratingPortrait ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingPortrait ? '...' : player.portraitUrl ? 'Novo' : 'Retrato'}</span>
                </button>
              </div>
            </div>

            {/* 4-Badge D&D 5.2 Combat Strip (AC / Initiative / Speed / Passive Perception) */}
            {isDnd && acInfo ? (
              <div className="grid grid-cols-4 gap-1.5">
                <div
                  title={`Classe de Armadura: ${acInfo.formula}`}
                  className="flex flex-col items-center rounded-xl border border-sky-400/35 bg-sky-500/10 px-1.5 py-1.5 text-center"
                >
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase text-sky-300">
                    <Shield className="h-2.5 w-2.5" />
                    CA
                  </span>
                  <span className="font-mono-tech text-sm font-black text-[var(--text-primary)]">
                    {acInfo.ac}
                  </span>
                </div>
                <div
                  title="Bônus de Iniciativa (1d20 + DES + talentos)"
                  className="flex flex-col items-center rounded-xl border border-amber-400/35 bg-amber-500/10 px-1.5 py-1.5 text-center"
                >
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase text-amber-300">
                    <Zap className="h-2.5 w-2.5" />
                    Ini
                  </span>
                  <span className="font-mono-tech text-sm font-black text-[var(--text-primary)]">
                    {formatModifier(initBonus)}
                  </span>
                </div>
                <div
                  title={`Deslocamento: ${speedFeet} pés (${formatSpeedMetric(speedFeet)})`}
                  className="flex flex-col items-center rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-1.5 py-1.5 text-center"
                >
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase text-emerald-300">
                    <Footprints className="h-2.5 w-2.5" />
                    Mov
                  </span>
                  <span className="font-mono-tech text-sm font-black text-[var(--text-primary)]">
                    {formatSpeedMetric(speedFeet)}
                  </span>
                </div>
                <div
                  title={`Percepção Passiva = 10 + Percepção (${formatModifier(computeSkillModifier(player, 'perception'))})`}
                  className="flex flex-col items-center rounded-xl border border-violet-400/35 bg-violet-500/10 px-1.5 py-1.5 text-center"
                >
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase text-violet-300">
                    <Eye className="h-2.5 w-2.5" />
                    Pas
                  </span>
                  <span className="font-mono-tech text-sm font-black text-[var(--text-primary)]">
                    {passivePerception}
                  </span>
                </div>
              </div>
            ) : null}

            {/* Level XP Bar + Proficiency + Next ASI */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5">
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--accent)]">
                  <Award className="h-3.5 w-3.5" />
                  Nível {player.level}/{MAX_LEVEL} · BP +{getProficiencyBonus(player.level)}
                </span>
                <span className="font-mono-tech text-[10px] text-[var(--text-secondary)]">
                  {player.level >= MAX_LEVEL
                    ? 'NÍVEL MÁXIMO'
                    : `${player.xp} / ${player.xpToNextLevel} XP`}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-canvas)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                  style={{
                    width: `${
                      player.level >= MAX_LEVEL
                        ? 100
                        : Math.max(0, Math.min(100, (player.xp / Math.max(1, player.xpToNextLevel)) * 100))
                    }%`,
                  }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                <span>
                  {(() => {
                    const nextAsi = getNextAsiLevel(player.level);
                    return nextAsi
                      ? `Próximo ASI/Talento: Nv.${nextAsi}`
                      : 'Todos os ASIs (4/8/12/16/19) alcançados';
                  })()}
                </span>
                <span>{isDnd ? 'D&D 5.2 (2024)' : `Teto Natural: ${NATURAL_ATTRIBUTE_CAP}`}</span>
              </div>
              {player.attributePoints > 0 && onSpendAttributePoint && !isEnded ? (
                <div className="mt-2 flex items-center justify-between rounded-lg border border-[var(--accent)]/60 bg-[var(--accent-soft)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--accent)]">
                  <span>Pontos ASI disponíveis!</span>
                  <span className="font-mono-tech">+{player.attributePoints}</span>
                </div>
              ) : null}
            </div>

            {/* 6-Attribute + Integrated Saving Throw Grid */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {isDnd ? 'Atributos & Salvaguardas' : `Atributos (BG3 · Teto ${NATURAL_ATTRIBUTE_CAP})`}
                </h4>
                {onOpenEditProtagonist && !isEnded ? (
                  <button
                    type="button"
                    onClick={onOpenEditProtagonist}
                    className="text-[10px] font-semibold text-[var(--accent)] hover:underline"
                  >
                    Recalibrar build
                  </button>
                ) : null}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {ATTRIBUTE_KEYS.map((key) => {
                  const meta = ATTRIBUTE_META[key];
                  const baseScore = player.attributes[key] ?? 10;
                  const effScore = effectiveAttrs[key];
                  const mod = getAttributeModifier(effScore);
                  const gearAdd = gearBonuses[key] ?? 0;
                  const tier = getAttributeTierMeta(effScore);
                  const saveProf = Boolean(isDnd && dnd?.savingThrowProficiencies.includes(key));
                  const saveMod = isDnd ? computeSavingThrowModifier(player, key) : mod;
                  const canSpend =
                    player.attributePoints > 0 &&
                    baseScore < NATURAL_ATTRIBUTE_CAP &&
                    Boolean(onSpendAttributePoint) &&
                    !isEnded;

                  return (
                    <div
                      key={key}
                      title={`${meta.full[language]}: ${meta.hint[language]}${isDnd ? ` · Salvaguarda ${formatModifier(saveMod)}${saveProf ? ' (Proficiente)' : ''}` : ''}`}
                      className={`relative flex flex-col items-center rounded-xl border px-2 py-2 text-center transition ${
                        canSpend
                          ? 'border-[var(--accent)]/70 bg-[var(--accent-soft)]/50'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]'
                      }`}
                    >
                      <span className="text-[10px] font-bold tracking-wider text-[var(--text-muted)]">
                        {meta.short[language]}
                      </span>
                      <span className="font-display mt-0.5 text-lg leading-tight font-bold text-[var(--text-primary)]">
                        {formatModifier(mod)}
                      </span>
                      <span className="font-mono-tech text-[10px] text-[var(--text-secondary)]">
                        {effScore}
                        {gearAdd !== 0 ? (
                          <span className="ml-0.5 text-[var(--success)]">
                            ({gearAdd > 0 ? `+${gearAdd}` : gearAdd})
                          </span>
                        ) : null}
                      </span>
                      {isDnd ? (
                        <span
                          className={`font-mono-tech mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                            saveProf
                              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                              : 'bg-[var(--bg-canvas)]/70 text-[var(--text-muted)]'
                          }`}
                        >
                          <span>{saveProf ? '●' : '○'}</span>
                          <span>Salv {formatModifier(saveMod)}</span>
                        </span>
                      ) : (
                        <span
                          className="mt-0.5 max-w-full truncate text-[9px] font-medium"
                          style={{ color: tier.color }}
                        >
                          {tier.label}
                        </span>
                      )}
                      {canSpend ? (
                        <button
                          type="button"
                          onClick={() => onSpendAttributePoint?.(key)}
                          title={`Aumentar ${meta.full[language]} (+1)`}
                          className="mt-1.5 w-full rounded-md bg-[var(--accent)] py-0.5 text-[10px] font-bold text-[var(--accent-contrast)] transition hover:brightness-110"
                        >
                          +1
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PV / Vigor, Hit Dice, Tension, Heroic Inspiration, Conditions & Exhaustion */}
            <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5">
              <div>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
                    <Activity className="h-3.5 w-3.5 text-[var(--success)]" />
                    {isDnd ? 'Pontos de Vida (PV)' : 'Vigor'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono-tech font-semibold text-[var(--text-primary)]">
                      {player.vigor}/{player.maxVigor}
                    </span>
                    {isDnd && (dnd?.tempHp ?? 0) > 0 ? (
                      <span
                        title="Pontos de Vida Temporários (absorvem dano primeiro)"
                        className="font-mono-tech rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300"
                      >
                        +{dnd!.tempHp} Temp
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-canvas)]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${vigorPct}%`,
                      backgroundColor:
                        vigorPct > 55
                          ? 'var(--success)'
                          : vigorPct > 28
                            ? 'var(--warning)'
                            : 'var(--danger)',
                    }}
                  />
                </div>
                {isDnd && dnd ? (
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                    <span>
                      🎲 Dados de Vida:{' '}
                      <strong className="font-mono-tech text-[var(--text-secondary)]">
                        {dnd.hitDiceRemaining}/{player.level} d{dnd.hitDie}
                      </strong>
                    </span>
                    {player.vigor <= 0 ? (
                      <span className="font-mono-tech font-bold text-rose-400">
                        Morte: ✓{dnd.deathSaves.successes} / ✕{dnd.deathSaves.failures}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
                    <Flame className="h-3.5 w-3.5 text-[var(--warning)]" />
                    Tensão da Cena
                  </span>
                  <span className="font-mono-tech text-[var(--text-primary)]">
                    {player.tension}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-canvas)]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(0, Math.min(100, player.tension))}%`,
                      backgroundColor:
                        player.tension >= 85 ? 'var(--danger)' : 'var(--accent)',
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-2.5 text-xs">
                <span
                  title={
                    isDnd
                      ? 'Inspiração Heroica (2024): binária (0/1). Gaste para rerrolar qualquer dado!'
                      : "Gaste 1 Inspiração para rerrolar um dado d20 que falhou (Estilo Baldur's Gate 3)"
                  }
                  className="inline-flex items-center gap-1.5 font-medium text-[#fbbf24]"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {isDnd ? 'Inspiração Heroica' : 'Inspiração BG3'}
                </span>
                <div className="flex items-center gap-1">
                  {isDnd ? (
                    <span
                      className={`font-mono-tech inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                        inspirationCount >= 1
                          ? 'border-amber-400/70 bg-amber-400/20 text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.35)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-muted)]'
                      }`}
                    >
                      {inspirationCount >= 1 ? '★ Ativa (1/1)' : '☆ 0/1'}
                    </span>
                  ) : (
                    <>
                      {Array.from({ length: maxInsp }).map((_, i) => (
                        <span
                          key={i}
                          className={`h-2.5 w-2.5 rounded-full border transition ${
                            i < inspirationCount
                              ? 'border-[#fbbf24] bg-[#fbbf24] shadow-[0_0_6px_rgba(251,191,36,0.6)]'
                              : 'border-[var(--border-strong)] bg-[var(--bg-canvas)]'
                          }`}
                        />
                      ))}
                      <span className="font-mono-tech ml-1 text-[11px] font-semibold text-[#fbbf24]">
                        {inspirationCount}/{maxInsp}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Zero-Noise Active Conditions & Exhaustion (only visible when active!) */}
              {isDnd && dnd && (dnd.conditions.length > 0 || dnd.exhaustion > 0) ? (
                <div className="space-y-1.5 border-t border-[var(--border-subtle)] pt-2.5">
                  {dnd.exhaustion > 0 ? (
                    <div className="flex items-center justify-between rounded-lg border border-rose-500/40 bg-rose-500/12 px-2.5 py-1.5 text-[10px] font-semibold text-rose-300">
                      <span className="inline-flex items-center gap-1">
                        <Skull className="h-3 w-3" />
                        Exaustão Nv.{dnd.exhaustion}/6
                      </span>
                      <span className="font-mono-tech">
                        −{dnd.exhaustion * 2} em d20 · −{Math.round(dnd.exhaustion * 1.5 * 2) / 2}m
                      </span>
                    </div>
                  ) : null}
                  {dnd.conditions.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {dnd.conditions.map((condId) => {
                        const meta = DND_CONDITIONS[condId];
                        if (!meta) return null;
                        return (
                          <span
                            key={condId}
                            title={meta.summary}
                            className="inline-flex items-center gap-1 rounded-md border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200"
                          >
                            <span>{meta.icon}</span>
                            <span>{meta.label}</span>
                          </span>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* 1-Row Spell Slots & Class Resources Strip (D&D 5.2) */}
            {isDnd && dnd && (
              Object.keys(dnd.spellSlots.tiers ?? {}).length > 0 ||
              (dnd.spellSlots.pactMax ?? 0) > 0 ||
              dnd.classResources.length > 0 ||
              dnd.concentrationSpellId
            ) ? (
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
                <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <span>Recursos & Espaços de Magia</span>
                  {spellcastingInfo ? (
                    <span className="font-mono-tech text-[var(--accent)]">
                      CD {spellcastingInfo.saveDc} · Atq {formatModifier(spellcastingInfo.attackBonus)}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(dnd.spellSlots.tiers ?? {}).map(([circle, tier]) => (
                    <span
                      key={`slot_${circle}`}
                      title={`Espaços de ${circle}º Círculo: ${tier.current}/${tier.max}`}
                      className="font-mono-tech inline-flex items-center gap-1 rounded-lg border border-violet-400/35 bg-violet-500/12 px-2 py-1 text-[10px] font-semibold text-violet-200"
                    >
                      <span>{circle}º</span>
                      <span className="tracking-tight text-violet-300">
                        {'●'.repeat(Math.max(0, tier.current))}
                        {'○'.repeat(Math.max(0, tier.max - tier.current))}
                      </span>
                    </span>
                  ))}
                  {(dnd.spellSlots.pactMax ?? 0) > 0 ? (
                    <span
                      title={`Magia de Pacto (${dnd.spellSlots.pactSlotLevel ?? 1}º Círculo — recarrega em Descanso Curto)`}
                      className="font-mono-tech inline-flex items-center gap-1 rounded-lg border border-fuchsia-400/40 bg-fuchsia-500/15 px-2 py-1 text-[10px] font-semibold text-fuchsia-200"
                    >
                      <span>Pacto {dnd.spellSlots.pactSlotLevel ?? 1}º</span>
                      <span>
                        {'●'.repeat(Math.max(0, dnd.spellSlots.pactCurrent ?? 0))}
                        {'○'.repeat(
                          Math.max(0, (dnd.spellSlots.pactMax ?? 0) - (dnd.spellSlots.pactCurrent ?? 0)),
                        )}
                      </span>
                    </span>
                  ) : null}
                  {dnd.classResources.map((res) => (
                    <span
                      key={res.id}
                      title={`${res.name}: ${res.current}/${res.max}`}
                      className="font-mono-tech inline-flex items-center gap-1 rounded-lg border border-emerald-400/35 bg-emerald-500/12 px-2 py-1 text-[10px] font-semibold text-emerald-200"
                    >
                      <span>{res.shortName}</span>
                      <span>
                        {res.max <= 6
                          ? `${'●'.repeat(Math.max(0, res.current))}${'○'.repeat(Math.max(0, res.max - res.current))}`
                          : `${res.current}/${res.max}`}
                      </span>
                    </span>
                  ))}
                  {dnd.concentrationSpellId ? (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/45 bg-cyan-500/15 px-2 py-1 text-[10px] font-semibold text-cyan-200">
                      <span>◎</span>
                      <span>
                        {getThemedSpellLabel(
                          dnd.concentrationSpellId,
                          world.primaryTheme,
                          useClassicDndNames,
                          true,
                        )}
                      </span>
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Active Party Companions Strip */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <Users className="h-3.5 w-3.5 text-[var(--accent)]" />
                  Seu Grupo ({partyMembers.length}/{MAX_PARTY_SIZE})
                </span>
                {onOpenRelationships ? (
                  <button
                    type="button"
                    onClick={() => onOpenRelationships(partyMembers[0]?.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-[#f472b6]/35 bg-[#f472b6]/10 px-2 py-0.5 text-[10px] font-semibold text-[#f472b6] transition hover:bg-[#f472b6]/20"
                  >
                    <Heart className="h-2.5 w-2.5" />
                    Fichas & Vínculos
                  </button>
                ) : partyMembers.length > 0 ? (
                  <span className="text-[10px] text-[var(--success)]">
                    Vantagem 2×d20 ativa
                  </span>
                ) : null}
              </div>

              {partyMembers.length === 0 ? (
                <p className="text-[11px] text-[var(--text-muted)]">
                  Nenhum companheiro no grupo. Convide aliados na aba{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('world');
                      setWorldSubTab('codex');
                    }}
                    className="font-semibold text-[var(--accent)] hover:underline"
                  >
                    Mundo → Códice
                  </button>{' '}
                  para ganhar Vantagem (2× d20) nos testes!
                </p>
              ) : (
                <div className="space-y-1.5">
                  {partyMembers.map((member) => {
                    const attrShort =
                      ATTRIBUTE_META[member.assistAttribute ?? 'wis'].short[language];
                    const rel =
                      RELATIONSHIP_META[member.relationship ?? 'friend'] ??
                      RELATIONSHIP_META.friend;
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 transition hover:border-[#f472b6]/50"
                      >
                        <button
                          type="button"
                          onClick={() => onOpenRelationships?.(member.id)}
                          title="Abrir Ficha Completa deste Companheiro"
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          {member.portraitUrl ? (
                            <img
                              src={member.portraitUrl}
                              alt={member.name}
                              className="h-7 w-7 shrink-0 rounded-lg border border-[var(--border-strong)] object-cover"
                            />
                          ) : (
                            <span className="font-display flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[10px] font-bold text-[var(--accent)]">
                              {member.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-xs font-semibold text-[var(--text-primary)]">
                                {member.name}
                              </span>
                              {isDnd && member.vigor !== undefined && member.maxVigor !== undefined ? (
                                <span className="font-mono-tech text-[9px] text-[var(--success)]">
                                  {member.vigor}/{member.maxVigor} PV
                                </span>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                              <span className="font-mono-tech font-semibold text-[var(--success)]">
                                Vant. {attrShort}
                              </span>
                              <span>·</span>
                              <span style={{ color: rel.color }}>{rel.label}</span>
                            </div>
                          </div>
                        </button>
                        {onTogglePartyMember && !isEnded ? (
                          <button
                            type="button"
                            onClick={() => onTogglePartyMember(member.id)}
                            title="Remover do grupo"
                            className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--danger)]"
                          >
                            <UserMinus className="h-3 w-3" />
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Difficulty & Arc Badge */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2">
                <div className="text-[10px] text-[var(--text-muted)]">Destino</div>
                <div className="font-mono-tech mt-0.5 font-semibold text-[var(--accent)]">
                  {difficultyMeta?.label[language]}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2">
                <div className="text-[10px] text-[var(--text-muted)]">Livro / Arco</div>
                <div className="font-mono-tech mt-0.5 font-semibold text-[var(--text-primary)]">
                  Arco {campaign.arcNumber} · Cap. {campaign.currentChapter}
                </div>
              </div>
            </div>

            {/* D&D 5.2 Proficient Skills + Collapsible 18 Skills (replaces duplicate legacy skillLevels!) */}
            {isDnd && dnd ? (
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Perícias D&amp;D 5.2 ({dnd.skillProficiencies.length} prof.)
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAll18Skills((v) => !v)}
                    className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[var(--accent)] hover:underline"
                  >
                    <span>{showAll18Skills ? 'Recolher' : 'Ver todas as 18'}</span>
                    {showAll18Skills ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                </div>

                {!showAll18Skills ? (
                  <div className="flex flex-wrap gap-1.5">
                    {dnd.skillProficiencies.map((skillId) => {
                      const isExp = dnd.skillExpertise.includes(skillId);
                      const mod = computeSkillModifier(player, skillId);
                      return (
                        <span
                          key={skillId}
                          title={`${DND_SKILLS[skillId]?.label} (${ATTRIBUTE_META[DND_SKILLS[skillId]?.attribute ?? 'wis'].short[language]})${isExp ? ' · Especialização (2× BP)' : ' · Proficiente'}`}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium ${
                            isExp
                              ? 'border-amber-400/50 bg-amber-500/15 text-amber-200'
                              : 'border-[var(--border-strong)] bg-[var(--accent-soft)]/50 text-[var(--text-primary)]'
                          }`}
                        >
                          <span className="text-[9px] text-[var(--accent)]">
                            {isExp ? '◈' : '●'}
                          </span>
                          <span>
                            {getThemedSkillLabel(skillId, world.primaryTheme, useClassicDndNames)}
                          </span>
                          <span className="font-mono-tech text-[10px] font-bold text-[var(--accent)]">
                            {formatModifier(mod)}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {(Object.keys(DND_SKILLS) as DndSkillId[]).map((skillId) => {
                      const sk = DND_SKILLS[skillId];
                      const isExp = dnd.skillExpertise.includes(skillId);
                      const isProf = isExp || dnd.skillProficiencies.includes(skillId);
                      const mod = computeSkillModifier(player, skillId);
                      return (
                        <div
                          key={skillId}
                          className={`flex items-center justify-between rounded-lg border px-2 py-1 text-[11px] ${
                            isProf
                              ? 'border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)]'
                              : 'border-transparent bg-[var(--bg-canvas)]/45 text-[var(--text-secondary)]'
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-1.5 truncate">
                            <span
                              className={
                                isExp
                                  ? 'text-amber-400'
                                  : isProf
                                    ? 'text-[var(--accent)]'
                                    : 'text-[var(--text-muted)]'
                              }
                            >
                              {isExp ? '◈' : isProf ? '●' : '○'}
                            </span>
                            <span className="truncate">
                              {getThemedSkillLabel(skillId, world.primaryTheme, useClassicDndNames)}
                            </span>
                            <span className="text-[9px] text-[var(--text-muted)]">
                              {ATTRIBUTE_META[sk.attribute].short[language]}
                            </span>
                          </span>
                          <span className="font-mono-tech shrink-0 text-[11px] font-bold text-[var(--accent)]">
                            {formatModifier(mod)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Legacy Leveled Skills */
              <div>
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Habilidades Evoluíveis
                </h4>
                <div className="space-y-1.5">
                  {player.skillLevels.length > 0 ? (
                    player.skillLevels.map((sk) => (
                      <div
                        key={sk.name}
                        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate font-medium text-[var(--text-primary)]">
                            {sk.name}
                          </span>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <span className="font-mono-tech rounded bg-[var(--bg-canvas)] px-1.5 py-0.5 text-[9px] text-[var(--text-muted)]">
                              {ATTRIBUTE_META[sk.attribute].short[language]}
                            </span>
                            <span className="font-mono-tech rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                              Nv.{sk.level} (+{sk.level})
                            </span>
                          </div>
                        </div>
                        {sk.level < 5 ? (
                          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--bg-canvas)]">
                            <div
                              className="h-full rounded-full bg-[var(--accent)]/80 transition-all duration-500"
                              style={{ width: `${Math.max(4, Math.min(100, sk.xp))}%` }}
                            />
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">
                      Treine ou pratique na história para desenvolver habilidades.
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Collapsible D&D Grimoire, Weapon Masteries & Feats */}
            {isDnd && dnd ? (
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
                <button
                  type="button"
                  onClick={() => setShowGrimoireSection((v) => !v)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Grimório, Maestrias &amp; Talentos ({dnd.featIds.length + dnd.weaponMasteries.length + dnd.cantripIds.length + dnd.preparedSpellIds.length})
                  </span>
                  {showGrimoireSection ? (
                    <ChevronUp className="h-3.5 w-3.5 text-[var(--accent)]" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-[var(--accent)]" />
                  )}
                </button>

                {showGrimoireSection ? (
                  <div className="mt-3 space-y-3 border-t border-[var(--border-subtle)] pt-2.5 text-xs">
                    {dnd.weaponMasteries.length > 0 ? (
                      <div>
                        <div className="mb-1 text-[10px] font-bold uppercase text-amber-300">
                          Maestrias de Arma (2024)
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {dnd.weaponMasteries.map((mId) => {
                            const m = DND_WEAPON_MASTERIES[mId];
                            if (!m) return null;
                            return (
                              <span
                                key={mId}
                                title={m.summary}
                                className="rounded-md border border-amber-400/35 bg-amber-500/12 px-2 py-0.5 text-[10px] font-semibold text-amber-200"
                              >
                                {m.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {(dnd.cantripIds.length > 0 || dnd.preparedSpellIds.length > 0) ? (
                      <div>
                        <div className="mb-1 text-[10px] font-bold uppercase text-violet-300">
                          Truques &amp; Magias Preparadas
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {dnd.cantripIds.map((spId) => (
                            <span
                              key={spId}
                              title={DND_SPELLS[spId]?.summary}
                              className="rounded-md border border-cyan-400/30 bg-cyan-500/12 px-2 py-0.5 text-[10px] text-cyan-200"
                            >
                              ✦ {getThemedSpellLabel(spId, world.primaryTheme, useClassicDndNames)}
                            </span>
                          ))}
                          {dnd.preparedSpellIds.map((spId) => {
                            const sp = DND_SPELLS[spId];
                            return (
                              <span
                                key={spId}
                                title={sp?.summary}
                                className="rounded-md border border-violet-400/35 bg-violet-500/12 px-2 py-0.5 text-[10px] text-violet-200"
                              >
                                {sp ? `${sp.level}º ` : ''}
                                {getThemedSpellLabel(spId, world.primaryTheme, useClassicDndNames)}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <div className="mb-1 text-[10px] font-bold uppercase text-[var(--accent)]">
                        Talentos D&amp;D 5.2 &amp; Traços de Espécie
                      </div>
                      <div className="space-y-1.5">
                        {dnd.featIds.map((fId) => {
                          const f = DND_FEATS[fId];
                          if (!f) return null;
                          return (
                            <div
                              key={fId}
                              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
                            >
                              <div className="text-[11px] font-semibold text-[var(--text-primary)]">
                                {f.label}
                              </div>
                              <p className="text-[10px] text-[var(--text-muted)]">{f.summary}</p>
                            </div>
                          );
                        })}
                        {(DND_SPECIES[dnd.speciesId]?.traits ?? []).map((tr) => (
                          <div
                            key={tr}
                            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/60 px-2.5 py-1 text-[10px] text-[var(--text-secondary)]"
                          >
                            • {tr}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Traits */}
            <div>
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Traços
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {player.traits.length > 0 ? (
                  player.traits.map((trait) => (
                    <span
                      key={trait}
                      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs text-[var(--text-secondary)]"
                    >
                      {trait}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">—</span>
                )}
              </div>
            </div>

            {/* Story Talents / Passives */}
            <div>
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Talentos Narrativos ({player.talents.length})
              </h4>
              {player.talents.length > 0 ? (
                <div className="space-y-2">
                  {player.talents.map((tal) => (
                    <div
                      key={tal.id}
                      className="rounded-xl border border-[var(--accent)]/35 bg-[var(--accent-soft)]/50 p-2.5"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]">
                        <Sparkles className="h-3 w-3 shrink-0" />
                        <span>{tal.name}</span>
                      </div>
                      <p className="mt-1 text-[11px] leading-snug text-[var(--text-secondary)]">
                        {tal.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">
                  Novos talentos narrativos despertam conforme você supera marcos da crônica.
                </p>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === 'pack' ? (
          <div className="space-y-3">
            {/* Currency & Resources */}
            <div className="flex items-center justify-between rounded-xl border border-[var(--border-strong)] bg-[var(--accent-soft)]/60 px-3.5 py-2.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]">
                <Coins className="h-4 w-4" />
                Recursos / Carteira
              </span>
              <span className="font-mono-tech text-sm font-bold text-[var(--text-primary)]">
                {player.currency.amount.toLocaleString('pt-BR')} {player.currency.label}
              </span>
            </div>

            {/* Equipped 6-Slot Visual Summary + Full BG3 Modal Trigger */}
            {onOpenCharacterInventory ? (
              <button
                type="button"
                onClick={onOpenCharacterInventory}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--accent)]/60 bg-[var(--accent-soft)] py-2 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-[#111]"
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Abrir Personagem & Inventário Visual (BG3)</span>
              </button>
            ) : null}

            <div className="grid grid-cols-3 gap-1.5">
              {ALL_EQUIP_SLOTS.map((slot: EquipSlot) => {
                const eq = player.inventory.find(
                  (i) => i.equipped && i.equipSlot === slot,
                );
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => onOpenCharacterInventory?.()}
                    className={`rounded-xl border p-2 text-center transition ${
                      eq
                        ? 'border-[var(--accent)]/50 bg-[var(--bg-elevated)] hover:border-[var(--accent)]'
                        : 'border-dashed border-[var(--border-subtle)] bg-[var(--bg-canvas)]/40 hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      {EQUIP_SLOT_LABEL[slot]}
                    </div>
                    <div className="mt-0.5 truncate text-[10px] font-medium text-[var(--text-primary)]">
                      {eq ? eq.name : 'Vazio'}
                    </div>
                  </button>
                );
              })}
            </div>

            {player.inventory.length === 0 ? (
              <p className="py-6 text-center text-xs text-[var(--text-muted)]">
                Sua mochila está vazia.
              </p>
            ) : (
              player.inventory.map((item) => {
                const Icon = CATEGORY_ICON[item.category] ?? Backpack;
                const rarityMeta = RARITY_META[item.rarity ?? 'common'];
                const bonusPills: string[] = [];
                if (item.bonuses) {
                  for (const key of ATTRIBUTE_KEYS) {
                    const val = item.bonuses[key];
                    if (typeof val === 'number' && val !== 0) {
                      bonusPills.push(
                        `${val > 0 ? '+' : ''}${val} ${ATTRIBUTE_META[key].short[language]}`,
                      );
                    }
                  }
                  if (item.bonuses.maxVigor) {
                    bonusPills.push(`+${item.bonuses.maxVigor} Vigor Máx`);
                  }
                }
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border bg-[var(--bg-elevated)] p-3 transition ${
                      item.equipped
                        ? 'border-[var(--accent)] shadow-sm'
                        : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-semibold text-[var(--text-primary)]">
                            {item.name}
                          </span>
                          {item.quantity > 1 ? (
                            <span className="font-mono-tech text-[11px] text-[var(--accent)]">
                              x{item.quantity}
                            </span>
                          ) : null}
                          {item.rarity && item.rarity !== 'common' ? (
                            <span
                              className="rounded px-1.5 py-0.5 text-[9px] font-semibold"
                              style={{
                                color: rarityMeta.color,
                                backgroundColor: rarityMeta.bg,
                              }}
                            >
                              {rarityMeta.label}
                            </span>
                          ) : null}
                        </div>
                        {bonusPills.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {bonusPills.map((bp) => (
                              <span
                                key={bp}
                                className="font-mono-tech rounded bg-[var(--success)]/12 px-1.5 py-0.5 text-[9px] font-semibold text-[var(--success)]"
                              >
                                {bp}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {item.note ? (
                          <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">
                            {item.note}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-2.5 flex gap-1.5">
                      {item.equipSlot && onToggleEquipItem ? (
                        <button
                          type="button"
                          disabled={isEnded}
                          onClick={() => onToggleEquipItem(item.id)}
                          className={`flex-1 rounded-lg border py-1.5 text-[11px] font-semibold transition disabled:opacity-40 ${
                            item.equipped
                              ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]'
                              : 'border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--accent)]'
                          }`}
                        >
                          {item.equipped
                            ? `Equipado (${EQUIP_SLOT_LABEL[item.equipSlot]})`
                            : `Equipar (${EQUIP_SLOT_LABEL[item.equipSlot]})`}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={isEnded}
                        onClick={() => onUseItem(item)}
                        className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] py-1.5 text-[11px] font-medium text-[var(--accent)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] disabled:opacity-40"
                      >
                        {copy.useInAction}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : null}

        {/* WORLD TAB: Lore + Memória IA + Códice */}
        {activeTab === 'world' ? (
          <div className="space-y-4">
            {/* Sub-pills */}
            <div className="grid grid-cols-4 gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/60 p-1">
              {(
                [
                  { id: 'lore', label: 'Lore' },
                  { id: 'memory', label: `Memória` },
                  { id: 'codex', label: `Códice` },
                  { id: 'base', label: `Refúgio` },
                ] as const
              ).map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setWorldSubTab(sub.id)}
                  className={`rounded-lg py-1.5 text-[11px] font-semibold transition ${
                    worldSubTab === sub.id
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {worldSubTab === 'lore' ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5">
                  <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                    <span className="truncate">{world.era}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span>{paceMeta?.label[language]}</span>
                      {onUpdateWorldNotes && !isEnded ? (
                        <button
                          type="button"
                          onClick={() =>
                            isEditingLore
                              ? setIsEditingLore(false)
                              : startEditingLore()
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-[var(--accent)] hover:brightness-110"
                        >
                          {isEditingLore ? (
                            <>
                              <X className="h-2.5 w-2.5" />
                              Cancelar
                            </>
                          ) : (
                            <>
                              <Pencil className="h-2.5 w-2.5" />
                              Editar Lore / Prompt
                            </>
                          )}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {isEditingLore ? (
                    <div className="mt-3 space-y-2.5">
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                          Momento / Época
                        </label>
                        <input
                          type="text"
                          value={draftEra}
                          onChange={(e) => setDraftEra(e.target.value)}
                          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                          História do Mundo
                        </label>
                        <textarea
                          rows={3}
                          value={draftHistory}
                          onChange={(e) => setDraftHistory(e.target.value)}
                          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                          Premissa Atual
                        </label>
                        <textarea
                          rows={2}
                          value={draftPremise}
                          onChange={(e) => setDraftPremise(e.target.value)}
                          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                          Direção Criativa da IA (Prompt)
                        </label>
                        <textarea
                          rows={3}
                          value={draftCreativePrompt}
                          onChange={(e) => setDraftCreativePrompt(e.target.value)}
                          placeholder="Ex: Ainda falta 1 semana para o surto, não existem infectados na rua ainda..."
                          className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsEditingLore(false)}
                          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)]"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={saveEditingLore}
                          className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[11px] font-semibold text-[var(--accent-contrast)] hover:brightness-110"
                        >
                          <Check className="h-3 w-3" />
                          Salvar na Memória
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h4 className="font-display mt-1.5 text-sm font-semibold text-[var(--text-primary)]">
                        História do Mundo
                      </h4>
                      <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                        {world.history || world.premise}
                      </p>
                    </>
                  )}
                </div>

                {world.worldLaws ? (
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                      <Scale className="h-3.5 w-3.5 text-[var(--accent)]" />
                      Leis deste Universo
                    </h4>
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                      {world.worldLaws}
                    </p>
                  </div>
                ) : null}

                {world.creativePrompt ? (
                  <div className="rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] p-3.5">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Inspiração & Direção Criativa
                    </h4>
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-primary)]">
                      {world.creativePrompt}
                    </p>
                  </div>
                ) : null}

                <div>
                  <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    <Flag className="h-3.5 w-3.5 text-[var(--accent)]" />
                    Facções em Conflito ({codex.factions.length})
                  </h4>
                  <div className="space-y-2">
                    {codex.factions.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)]">
                        Nenhuma facção registrada ainda.
                      </p>
                    ) : (
                      codex.factions.map((fac) => {
                        const meta = FACTION_META[fac.standing] ?? FACTION_META.neutral;
                        return (
                          <div
                            key={fac.id}
                            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-[var(--text-primary)]">
                                {fac.name}
                              </span>
                              <span
                                className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
                                style={{ color: meta.color, backgroundColor: meta.bg }}
                              >
                                {meta.label}
                              </span>
                            </div>
                            {fac.description ? (
                              <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                                {fac.description}
                              </p>
                            ) : null}
                            <div className="mt-1.5 text-[10px] text-[var(--accent)]">
                              Influência: {fac.influence}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {worldSubTab === 'memory' ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--accent-soft)] p-3 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                  <div className="mb-1 flex items-center gap-1.5 font-semibold text-[var(--accent)]">
                    <Brain className="h-3.5 w-3.5" />
                    Memória Persistente da IA
                  </div>
                  A IA consulta todos estes fatos em cada turno — inclusive depois de você salvar e carregar semanas depois.
                </div>

                {/* Add custom fact */}
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newFactInput}
                    onChange={(e) => setNewFactInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePinFact()}
                    placeholder="Fixar fato importante para a IA lembrar..."
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    type="button"
                    onClick={handlePinFact}
                    title="Fixar fato"
                    className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2.5 text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Canon Facts */}
                <div className="space-y-2">
                  {codex.canonFacts.length === 0 ? (
                    <p className="py-4 text-center text-xs text-[var(--text-muted)]">
                      Nenhum fato fixado ainda.
                    </p>
                  ) : (
                    codex.canonFacts.map((fact) => (
                      <div
                        key={fact.id}
                        className="flex items-start justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2.5"
                      >
                        <div className="flex items-start gap-2">
                          <Pin className="mt-0.5 h-3 w-3 shrink-0 text-[var(--accent)]" />
                          <div>
                            <p className="text-[11px] leading-relaxed text-[var(--text-primary)]">
                              {fact.text}
                            </p>
                            <span className="font-mono-tech text-[9px] text-[var(--text-muted)]">
                              Turno {fact.turn}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveCanonFact(fact.id)}
                          className="shrink-0 p-1 text-[var(--text-muted)] hover:text-[var(--danger)]"
                          title="Remover fato"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Past Era Archives */}
                {campaign.eraSummaries.length > 0 ? (
                  <div className="space-y-2 border-t border-[var(--border-subtle)] pt-3">
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Arquivos de Arcos Anteriores ({campaign.eraSummaries.length})
                    </h4>
                    {campaign.eraSummaries.map((era) => (
                      <div
                        key={era.id}
                        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 p-3"
                      >
                        <div className="text-[11px] font-semibold text-[var(--accent)]">
                          {era.title}
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                          {era.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {worldSubTab === 'codex' ? (
              <div className="space-y-5">
                {/* NPCs */}
                <div>
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Pessoas & Relações ({codex.npcs.length})
                    </h4>
                    {onOpenRelationships ? (
                      <button
                        type="button"
                        onClick={() => onOpenRelationships()}
                        className="inline-flex items-center gap-1 rounded-md border border-[#f472b6]/40 bg-[#f472b6]/10 px-2 py-0.5 text-[10px] font-semibold text-[#f472b6] hover:bg-[#f472b6]/20"
                      >
                        <Heart className="h-3 w-3" />
                        Menu de Vínculos
                      </button>
                    ) : null}
                  </div>
                  {codex.npcs.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[var(--border-subtle)] p-4 text-center text-xs text-[var(--text-muted)]">
                      Nenhum NPC registrado ainda.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {codex.npcs.map((npc) => {
                        const stance = STANCE_META[npc.stance] ?? STANCE_META.neutral;
                        const rel =
                          RELATIONSHIP_META[npc.relationship ?? 'stranger'] ??
                          RELATIONSHIP_META.stranger;
                        const affinity = npc.affinity ?? 0;
                        const affinityPercent = Math.max(
                          0,
                          Math.min(100, Math.round(((affinity + 100) / 200) * 100)),
                        );
                        const npcInitials = npc.name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((p) => p[0]?.toUpperCase() ?? '')
                          .join('');
                        return (
                          <div
                            key={npc.id}
                            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                {npc.portraitUrl ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onZoomImage?.(
                                        npc.portraitUrl!,
                                        `${npc.name} · ${npc.role}`,
                                      )
                                    }
                                    className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)]"
                                  >
                                    <img
                                      src={npc.portraitUrl}
                                      alt={npc.name}
                                      className="h-full w-full object-cover"
                                    />
                                  </button>
                                ) : (
                                  <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
                                    {npcInitials || '?'}
                                  </span>
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="truncate text-xs font-semibold text-[var(--text-primary)]">
                                      {npc.name}
                                    </span>
                                    {npc.inParty ? (
                                      <span className="rounded bg-[var(--success)]/15 px-1.5 py-0.5 text-[9px] font-bold text-[var(--success)]">
                                        GRUPO
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="truncate text-[11px] text-[var(--text-muted)]">
                                    {npc.role}
                                    {npc.assistAttribute
                                      ? ` · Ajuda ${ATTRIBUTE_META[npc.assistAttribute].short[language]}`
                                      : ''}
                                  </div>
                                </div>
                              </div>
                              <span
                                className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold"
                                style={{
                                  color:
                                    npc.status === 'alive' ? rel.color : stance.color,
                                  backgroundColor:
                                    npc.status === 'alive' ? rel.bg : stance.bg,
                                }}
                              >
                                {npc.status === 'dead'
                                  ? 'Morto'
                                  : npc.status === 'missing'
                                    ? 'Sumido'
                                    : rel.label}
                              </span>
                            </div>

                            {/* Affinity / Bond Meter */}
                            {npc.status === 'alive' ? (
                              <div className="mt-2">
                                <div className="mb-0.5 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                                  <span className="inline-flex items-center gap-1">
                                    <Heart className="h-2.5 w-2.5" style={{ color: rel.color }} />
                                    Afinidade
                                  </span>
                                  <span className="font-mono-tech" style={{ color: rel.color }}>
                                    {affinity > 0 ? `+${affinity}` : affinity}
                                  </span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-canvas)]">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${affinityPercent}%`,
                                      backgroundColor: rel.color,
                                    }}
                                  />
                                </div>
                              </div>
                            ) : null}

                            {npc.notes ? (
                              <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                                {npc.notes}
                              </p>
                            ) : null}

                            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-[var(--border-subtle)] pt-2">
                              <span className="truncate text-[10px] text-[var(--text-muted)]">
                                {npc.lastSeenLocation}
                              </span>
                              {npc.status === 'alive' && !isEnded ? (
                                <div className="flex flex-wrap items-center gap-1">
                                  {onOpenRelationships ? (
                                    <button
                                      type="button"
                                      onClick={() => onOpenRelationships(npc.id)}
                                      title="Ver Ficha Completa, Atributos e Vínculo"
                                      className="inline-flex items-center gap-1 rounded-md border border-[#f472b6]/40 bg-[#f472b6]/10 px-2 py-1 text-[10px] font-semibold text-[#f472b6] hover:bg-[#f472b6]/20"
                                    >
                                      <Heart className="h-2.5 w-2.5" />
                                      Ficha
                                    </button>
                                  ) : null}
                                  {onGenerateNpcPortrait ? (
                                    <button
                                      type="button"
                                      disabled={Boolean(generatingNpcPortraitId)}
                                      onClick={() => onGenerateNpcPortrait(npc.id)}
                                      title="Gerar retrato deste NPC"
                                      className="inline-flex items-center gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-[10px] font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-45"
                                    >
                                      <Camera
                                        className={`h-2.5 w-2.5 ${
                                          generatingNpcPortraitId === npc.id
                                            ? 'animate-spin'
                                            : ''
                                        }`}
                                      />
                                      {generatingNpcPortraitId === npc.id
                                        ? '...'
                                        : 'Retrato'}
                                    </button>
                                  ) : null}
                                  {onTogglePartyMember ? (
                                    <button
                                      type="button"
                                      disabled={
                                        !npc.inParty &&
                                        partyMembers.length >= MAX_PARTY_SIZE
                                      }
                                      onClick={() => onTogglePartyMember(npc.id)}
                                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold transition disabled:opacity-40 ${
                                        npc.inParty
                                          ? 'border-[var(--success)]/45 bg-[var(--success)]/12 text-[var(--success)]'
                                          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--accent)]'
                                      }`}
                                    >
                                      {npc.inParty ? (
                                        <>
                                          <UserMinus className="h-2.5 w-2.5" />
                                          No Grupo
                                        </>
                                      ) : (
                                        <>
                                          <UserPlus className="h-2.5 w-2.5" />
                                          Convidar
                                        </>
                                      )}
                                    </button>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() => onMentionNpc(npc)}
                                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-[10px] font-medium text-[var(--accent)] hover:border-[var(--accent)]"
                                  >
                                    <MessageSquare className="h-2.5 w-2.5" />
                                    Falar
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Atlas of Locations & Dungeons */}
                <div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Atlas & Dungeons ({codex.locations.length})
                    </h4>
                    {onOpenWorldMap ? (
                      <button
                        type="button"
                        onClick={onOpenWorldMap}
                        className="inline-flex items-center gap-1 rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                      >
                        <MapIcon className="h-3 w-3" />
                        Mapa Visual
                      </button>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {codex.locations.map((loc) => {
                      const isCurrent =
                        loc.name.toLowerCase() === campaign.currentLocation.toLowerCase();
                      const danger = DANGER_META[loc.danger] ?? DANGER_META.tense;
                      const kindMeta = LOCATION_KIND_META[loc.kind ?? 'city'];
                      const statusMeta = LOCATION_STATUS_META[loc.status ?? 'explored'];
                      return (
                        <div
                          key={loc.id}
                          className={`rounded-xl border p-3 ${
                            isCurrent
                              ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <MapPin
                                className={`h-3.5 w-3.5 shrink-0 ${
                                  isCurrent ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                                }`}
                              />
                              <span className="text-xs font-semibold text-[var(--text-primary)]">
                                {loc.name}
                              </span>
                            </div>
                            <span
                              className="text-[10px] font-semibold"
                              style={{ color: danger.color }}
                            >
                              {danger.label}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span
                              className="rounded bg-[var(--bg-canvas)]/70 px-1.5 py-0.5 font-semibold"
                              style={{ color: kindMeta.color }}
                            >
                              {kindMeta.label}
                            </span>
                            <span
                              className="rounded bg-[var(--bg-canvas)]/70 px-1.5 py-0.5 font-medium"
                              style={{ color: statusMeta.color }}
                            >
                              {statusMeta.label}
                            </span>
                            {loc.recommendedLevel ? (
                              <span className="font-mono-tech rounded bg-[var(--bg-canvas)]/70 px-1.5 py-0.5 text-[var(--text-muted)]">
                                Nv.{loc.recommendedLevel}+
                              </span>
                            ) : null}
                          </div>
                          {loc.description ? (
                            <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                              {loc.description}
                            </p>
                          ) : null}
                          {!isCurrent && !isEnded ? (
                            <button
                              type="button"
                              onClick={() => onTravelLocation(loc)}
                              className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-[var(--accent)] hover:underline"
                            >
                              <Navigation className="h-2.5 w-2.5" />
                              Seguir para este local
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {worldSubTab === 'base' ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-[var(--accent)]" />
                      <div>
                        <h4 className="font-display text-sm font-semibold text-[var(--text-primary)]">
                          {campaign.stronghold?.name || 'Refúgio'}
                        </h4>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {campaign.stronghold?.location || campaign.currentLocation}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono-tech rounded-lg border border-[var(--success)]/35 bg-[var(--success)]/12 px-2 py-0.5 text-[11px] font-semibold text-[var(--success)]">
                      Defesa {campaign.stronghold?.defense ?? 20}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2 text-[11px]">
                    <span className="text-[var(--text-muted)]">Recursos disponíveis</span>
                    <span className="font-mono-tech inline-flex items-center gap-1 font-semibold text-[#fbbf24]">
                      <Coins className="h-3 w-3" />
                      {(player.currency?.amount ?? 0).toLocaleString('pt-BR')}{' '}
                      {player.currency?.label ?? 'Ouro'}
                    </span>
                  </div>
                  {onOpenBaseBlueprint ? (
                    <button
                      type="button"
                      onClick={onOpenBaseBlueprint}
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--accent)]/55 bg-[var(--accent-soft)] py-1.5 text-[11px] font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-[#111]"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span>Abrir Planta Visual da Base</span>
                    </button>
                  ) : null}
                </div>

                {/* Installed Upgrades */}
                {(campaign.stronghold?.upgrades?.length ?? 0) > 0 ? (
                  <div>
                    <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Melhorias Instaladas ({campaign.stronghold?.upgrades.length})
                    </h4>
                    <div className="space-y-2">
                      {campaign.stronghold?.upgrades.map((up) => (
                        <div
                          key={up.id}
                          className="rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/8 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[var(--text-primary)]">
                              {up.name}
                            </span>
                            <span className="text-[10px] font-semibold text-[var(--success)]">
                              Ativo ✓
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                            {up.bonus}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Upgrade Blueprints Catalog */}
                <div>
                  <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    <Hammer className="h-3.5 w-3.5 text-[var(--accent)]" />
                    Construir & Fortificar
                  </h4>
                  <div className="space-y-2.5">
                    {STRONGHOLD_UPGRADE_CATALOG.map((bp) => {
                      const alreadyBuilt = Boolean(
                        campaign.stronghold?.upgrades.some((u) => u.id === bp.id),
                      );
                      const canAfford = (player.currency?.amount ?? 0) >= bp.cost;
                      return (
                        <div
                          key={bp.id}
                          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-[var(--text-primary)]">
                              {bp.name[language]}
                            </span>
                            <span className="font-mono-tech shrink-0 text-[11px] font-semibold text-[#fbbf24]">
                              {bp.cost} {player.currency?.label ?? 'Ouro'}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                            {bp.description[language]}
                          </p>
                          <div className="mt-1.5 text-[10px] font-medium text-[var(--success)]">
                            {bp.bonusLabel[language]}
                          </div>
                          {onBuildStrongholdUpgrade && !isEnded ? (
                            <button
                              type="button"
                              disabled={alreadyBuilt || !canAfford}
                              onClick={() => onBuildStrongholdUpgrade(bp.id)}
                              className={`mt-2.5 w-full rounded-lg border py-1.5 text-[11px] font-semibold transition disabled:opacity-45 ${
                                alreadyBuilt
                                  ? 'border-[var(--success)]/35 bg-[var(--success)]/12 text-[var(--success)]'
                                  : canAfford
                                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#111]'
                                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)]'
                              }`}
                            >
                              {alreadyBuilt
                                ? 'Já instalado ✓'
                                : canAfford
                                  ? `Construir (${bp.cost} ${player.currency?.label ?? 'Ouro'})`
                                  : `Recursos insuficientes (${bp.cost})`}
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'quests' ? (
          <div className="space-y-4">
            <div className="space-y-2.5">
              {activeQuests.length === 0 ? (
                <p className="py-6 text-center text-xs text-[var(--text-muted)]">
                  Nenhum objetivo ativo no momento.
                </p>
              ) : (
                activeQuests.map((q) => (
                  <div
                    key={q.id}
                    className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-3.5"
                  >
                    <div className="flex items-start gap-2">
                      <Compass className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">
                          {q.title}
                        </div>
                        {q.description ? (
                          <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                            {q.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {resolvedQuests.length > 0 ? (
              <div className="space-y-2 border-t border-[var(--border-subtle)] pt-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Histórico
                </span>
                {resolvedQuests.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-start gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/40 px-3 py-2 text-xs text-[var(--text-muted)]"
                  >
                    {q.status === 'completed' ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--success)]" />
                    ) : (
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--danger)]" />
                    )}
                    <span className="line-through">{q.title}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'chronicle' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                disabled={isSummarizing || campaign.entries.length === 0}
                onClick={onSummarizeNow}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--accent-soft)] py-2 text-xs font-semibold text-[var(--accent)] transition hover:brightness-110 disabled:opacity-50"
              >
                <FilePlus2 className="h-3.5 w-3.5" />
                <span>{isSummarizing ? 'Arquivando...' : copy.summarizeNow}</span>
              </button>

              {!isEnded ? (
                <button
                  type="button"
                  disabled={campaign.turnCount < 1}
                  onClick={onConcludeCampaign}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-2 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
                >
                  <Award className="h-3.5 w-3.5" />
                  <span>Encerrar & Gerar Epílogo</span>
                </button>
              ) : null}
            </div>

            {campaign.eraSummaries.length > 0 ? (
              <div className="space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  Livros / Arcos Anteriores
                </span>
                {campaign.eraSummaries.map((era) => (
                  <div
                    key={era.id}
                    className="rounded-xl border border-[var(--border-strong)] bg-[var(--accent-soft)] p-3"
                  >
                    <div className="text-xs font-semibold text-[var(--text-primary)]">
                      {era.title}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                      {era.summary}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {player.journal.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-4 text-center text-xs leading-relaxed text-[var(--text-muted)]">
                A crônica resume os últimos capítulos automaticamente a cada 5 turnos, arquivando eras completas sem perder a memória do mundo.
              </div>
            ) : (
              <div className="relative space-y-4 border-l border-[var(--border-strong)] pl-4">
                {player.journal.map((entry) => (
                  <div key={entry.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border border-[var(--bg-surface)] bg-[var(--accent)]" />
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono-tech text-[10px] uppercase tracking-wider text-[var(--accent)]">
                        Cap. {entry.chapter} · {entry.turnRange}
                      </span>
                    </div>
                    <h4 className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                      <ScrollText className="h-3 w-3 text-[var(--accent)]" />
                      {entry.title}
                    </h4>
                    <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                      {entry.summary}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
