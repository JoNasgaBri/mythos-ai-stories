import {
  AlertTriangle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Compass,
  Dices,
  Eye,
  Flag,
  Flame,
  Footprints,
  ImagePlus,
  Maximize2,
  MessageSquare,
  Pencil,
  Pin,
  RotateCcw,
  Scale,
  Send,
  Shield,
  Skull,
  Sparkles,
  Square,
  Swords,
  Undo2,
  Volume2,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { INTENT_LABELS, UI_COPY } from '../data/presets';
import {
  assessFreeAction,
  assessSuggestedAction,
  DIFFICULTY_DC,
  formatOutcomeLabel,
} from '../engine/diceEngine';
import {
  ATTRIBUTE_META,
  formatModifier,
  getEffectiveAttributes,
} from '../engine/rpgSystem';
import type {
  ActionIntent,
  ActionRisk,
  AppSettings,
  AttributeId,
  Campaign,
  CommandInputMode,
  DiceRollPolicy,
  InventoryItem,
  LanguageId,
  LocationRecord,
  NpcRecord,
  TacticalAction,
  WorldConfig,
} from '../types/game';
import { ContextHud } from './ContextHud';
import { EpiloguePanel } from './EpiloguePanel';
import {
  extractPlayerSpeech,
  SceneBeatsRenderer,
} from './SceneBeatsRenderer';
import { ZenLeftRail, type ZenRailMode } from './ZenLeftRail';

interface StoryStageProps {
  campaign: Campaign;
  settings: AppSettings;
  saveSlotCount: number;
  language: LanguageId;
  dialogueStyle?: 'bubbles' | 'classic';
  focusMode: boolean;
  leftRailMode: ZenRailMode;
  mobileLeftRailOpen: boolean;
  mobileRightHudOpen: boolean;
  pulsePaused: boolean;
  pulseSecondsLeft: number;
  onChangeLeftRailMode: (mode: ZenRailMode) => void;
  onCloseMobileLeftRail: () => void;
  onToggleRightHud: () => void;
  onCloseMobileRightHud: () => void;
  onTogglePulsePause: () => void;
  onAdvanceWorldNow: () => void;
  isBusy: boolean;
  isSummarizing: boolean;
  illustratingEntryId: string | null;
  isGeneratingPortrait: boolean;
  generatingNpcPortraitId?: string | null;
  speakingEntryId?: string | null;
  loadingSpeechEntryId?: string | null;
  canUndo?: boolean;
  canRegenerate?: boolean;
  canRerollLastTurn?: boolean;
  restoredDraft?: { id: number; text: string } | null;
  onConsumeRestoredDraft?: () => void;
  queuedUseItem?: InventoryItem | null;
  onConsumeQueuedUseItem?: () => void;
  queuedSayNpc?: NpcRecord | null;
  onConsumeQueuedSayNpc?: () => void;
  onUndoTurn?: () => void;
  onRegenerateTurn?: () => void;
  onRerollLastTurn?: () => void;
  onToggleSpeakEntry?: (entryId: string, text: string) => void;
  onTogglePartyMember?: (npcId: string) => void;
  onGenerateNpcPortrait?: (npcId: string) => void;
  onBuildStrongholdUpgrade?: (upgradeId: string) => void;
  onOpenWorldMap?: () => void;
  onOpenCharacterInventory?: () => void;
  onOpenBaseBlueprint?: () => void;
  onOpenRelationships?: (npcId?: string) => void;
  onOpenRumors?: () => void;
  onOpenWorkbench?: () => void;
  onOpenRest?: () => void;
  onSendAction: (
    text: string,
    intent?: ActionIntent,
    risk?: ActionRisk,
    requiresRoll?: boolean,
    isDirection?: boolean,
    forcedAttribute?: AttributeId,
  ) => void;
  onTypingActivity: () => void;
  onSummarizeNow: () => void;
  onAddCanonFact: (factText: string) => void;
  onRemoveCanonFact: (factId: string) => void;
  onUpdateWorldNotes?: (
    patch: Partial<Pick<WorldConfig, 'era' | 'history' | 'premise' | 'creativePrompt'>>,
  ) => void;
  onSpendAttributePoint?: (attr: AttributeId) => void;
  onToggleEquipItem?: (itemId: string) => void;
  onResolveVigorCrisis: (
    choice: 'survival_roll' | 'use_consumable' | 'accept_end',
    consumable?: InventoryItem,
  ) => void;
  onConcludeCampaign: () => void;
  onIllustrateEntry: (entryId: string) => void;
  onGeneratePortrait: () => void;
  onOpenSaves: () => void;
  onExportCampaign: () => void;
  onBackHome: () => void;
}

const INTENT_ICON: Record<ActionIntent, typeof Swords> = {
  bold: Swords,
  stealth: Footprints,
  diplomatic: MessageSquare,
  investigate: Eye,
  survival: Shield,
  item: Sparkles,
};

export function StoryStage({
  campaign,
  settings,
  saveSlotCount,
  language,
  dialogueStyle = 'bubbles',
  focusMode,
  leftRailMode,
  mobileLeftRailOpen,
  mobileRightHudOpen,
  pulsePaused,
  pulseSecondsLeft,
  onChangeLeftRailMode,
  onCloseMobileLeftRail,
  onToggleRightHud,
  onCloseMobileRightHud,
  onTogglePulsePause,
  onAdvanceWorldNow,
  isBusy,
  isSummarizing,
  illustratingEntryId,
  isGeneratingPortrait,
  generatingNpcPortraitId,
  speakingEntryId,
  loadingSpeechEntryId,
  canUndo,
  canRegenerate,
  canRerollLastTurn,
  restoredDraft,
  onConsumeRestoredDraft,
  queuedUseItem,
  onConsumeQueuedUseItem,
  queuedSayNpc,
  onConsumeQueuedSayNpc,
  onUndoTurn,
  onRegenerateTurn,
  onRerollLastTurn,
  onToggleSpeakEntry,
  onTogglePartyMember,
  onGenerateNpcPortrait,
  onBuildStrongholdUpgrade,
  onOpenWorldMap,
  onOpenCharacterInventory,
  onOpenBaseBlueprint,
  onOpenRelationships,
  onOpenRumors,
  onOpenWorkbench,
  onOpenRest,
  onSendAction,
  onTypingActivity,
  onSummarizeNow,
  onAddCanonFact,
  onRemoveCanonFact,
  onUpdateWorldNotes,
  onSpendAttributePoint,
  onToggleEquipItem,
  onResolveVigorCrisis,
  onConcludeCampaign,
  onIllustrateEntry,
  onGeneratePortrait,
  onOpenSaves,
  onExportCampaign,
  onBackHome,
}: StoryStageProps) {
  const copy = UI_COPY[language];
  const [inputText, setInputText] = useState('');
  const [inputMode, setInputMode] = useState<CommandInputMode>('act');
  const [dicePolicy, setDicePolicy] = useState<DiceRollPolicy>('auto');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [rightHudPeek, setRightHudPeek] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    caption?: string;
    engine?: 'gemini' | 'demo';
  } | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [campaign.entries.length, isBusy, campaign.status]);

  useEffect(() => {
    if (!lightboxImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxImage(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxImage]);

  useEffect(() => {
    if (!restoredDraft) return;
    setInputText(restoredDraft.text);
    onConsumeRestoredDraft?.();
    textareaRef.current?.focus();
  }, [onConsumeRestoredDraft, restoredDraft]);

  useEffect(() => {
    if (!queuedUseItem) return;
    setSelectedItem(queuedUseItem);
    onConsumeQueuedUseItem?.();
    textareaRef.current?.focus();
  }, [onConsumeQueuedUseItem, queuedUseItem]);

  useEffect(() => {
    if (!queuedSayNpc) return;
    setInputMode('say');
    setInputText(`Para ${queuedSayNpc.name}: `);
    onConsumeQueuedSayNpc?.();
    textareaRef.current?.focus();
  }, [onConsumeQueuedSayNpc, queuedSayNpc]);

  const isEnded =
    campaign.status === 'ended_fallen' || campaign.status === 'ended_victory';
  const isVigorCrisis = campaign.status === 'crisis_vigor';
  const isTensionCrisis = campaign.status === 'crisis_tension';
  const consumables = campaign.player.inventory.filter(
    (item) => item.category === 'consumable',
  );

  const effectiveAttrs = getEffectiveAttributes(campaign.player);

  const liveAssessment = assessFreeAction(
    inputText,
    inputMode,
    campaign.player.skills,
    campaign.player.tension,
    campaign.difficulty,
    dicePolicy,
    language,
    effectiveAttrs,
    campaign.player.skillLevels,
  );

  const cycleDicePolicy = () => {
    setDicePolicy((prev) =>
      prev === 'auto' ? 'force' : prev === 'force' ? 'off' : 'auto',
    );
  };

  const formatSayText = (raw: string): string => {
    const alreadyFormatted =
      /^(você diz:|para\s+\S+:?|falar com|you say:|to\s+\S+:?|vous dites\s*:|[«"'])/i.test(
        raw,
      );
    if (alreadyFormatted) return raw;
    if (language === 'en') return `You say: "${raw}"`;
    if (language === 'fr') return `Vous dites : « ${raw} »`;
    return `Você diz: "${raw}"`;
  };

  const handleSubmit = () => {
    const trimmed = inputText.trim();
    if (!trimmed && !selectedItem) return;
    if (isBusy || isEnded || isVigorCrisis) return;

    if (inputMode === 'direct') {
      const baseText = selectedItem
        ? trimmed
          ? `${trimmed} (usando ${selectedItem.name})`
          : `Destacar ${selectedItem.name} na cena`
        : trimmed;
      setInputText('');
      setSelectedItem(null);
      onSendAction(
        `[DIREÇÃO DO AUTOR]: ${baseText}`,
        'investigate',
        'safe',
        false,
        true,
      );
      return;
    }

    const finalPrompt = selectedItem
      ? trimmed
        ? inputMode === 'say'
          ? `Mostrando ${selectedItem.name}, você diz: "${trimmed}"`
          : `Usar ${selectedItem.name}: ${trimmed}`
        : `Usar ${selectedItem.name} na cena atual`
      : inputMode === 'say'
        ? formatSayText(trimmed)
        : trimmed;

    const intentToUse: ActionIntent = selectedItem
      ? 'item'
      : liveAssessment.inferredIntent;
    const willRoll = liveAssessment.requiresRoll;
    const riskToUse: ActionRisk = willRoll
      ? liveAssessment.inferredRisk
      : 'safe';

    setInputText('');
    setSelectedItem(null);
    onSendAction(
      finalPrompt,
      intentToUse,
      riskToUse,
      willRoll,
      false,
      liveAssessment.attribute,
    );
  };

  const handleUseItemFromHud = (item: InventoryItem) => {
    setSelectedItem(item);
    onCloseMobileRightHud();
    setRightHudPeek(false);
    textareaRef.current?.focus();
  };

  const handleMentionNpcFromHud = (npc: NpcRecord) => {
    setInputMode('say');
    setInputText((prev) =>
      prev.trim() ? `${prev.trim()} (para ${npc.name})` : `Para ${npc.name}: `,
    );
    onCloseMobileRightHud();
    setRightHudPeek(false);
    textareaRef.current?.focus();
  };

  const handleTravelFromHud = (loc: LocationRecord) => {
    setInputMode('act');
    setInputText(`Seguir em direção a ${loc.name}`);
    onCloseMobileRightHud();
    setRightHudPeek(false);
    textareaRef.current?.focus();
  };

  const handleActionCardClick = (action: TacticalAction) => {
    if (isBusy || isEnded || isVigorCrisis) return;
    const cardCheck = assessSuggestedAction(
      action,
      campaign.player.skills,
      campaign.difficulty,
      campaign.player.tension,
      dicePolicy,
      effectiveAttrs,
      campaign.player.skillLevels,
    );
    onSendAction(
      action.label,
      action.intent,
      action.risk,
      cardCheck.requiresRoll,
      false,
      cardCheck.attribute,
    );
  };

  const handleCustomizeAction = (
    e: React.MouseEvent,
    action: TacticalAction,
  ) => {
    e.stopPropagation();
    setInputMode(action.intent === 'diplomatic' ? 'say' : 'act');
    setInputText(action.label);
    textareaRef.current?.focus();
  };

  const renderProseParagraphs = (text: string, useDropCap: boolean) => {
    const paragraphs = text.split(/\n+/).filter(Boolean);
    return paragraphs.map((para, idx) => (
      <p
        key={idx}
        className={`font-prose text-[var(--text-primary)] ${
          idx > 0 ? 'mt-4' : ''
        } ${useDropCap && idx === 0 ? 'story-dropcap' : ''}`}
      >
        {para}
      </p>
    ));
  };

  const firstNarratorIndex = campaign.entries.findIndex(
    (e) => e.role === 'narrator',
  );
  let lastNarratorIndex = -1;
  for (let i = campaign.entries.length - 1; i >= 0; i--) {
    if (campaign.entries[i].role === 'narrator') {
      lastNarratorIndex = i;
      break;
    }
  }

  return (
    <div className="animate-view-enter relative z-10 mx-auto flex h-[calc(100dvh-3.05rem)] w-full max-w-[1860px] gap-3 px-2.5 py-2 sm:gap-4 sm:px-4 sm:py-2.5">
      {/* Left Zen Browser Retractable Tactical Rail */}
      <ZenLeftRail
        campaign={campaign}
        settings={settings}
        saveSlotCount={saveSlotCount}
        isBusy={isBusy}
        mode={leftRailMode}
        mobileOpen={mobileLeftRailOpen}
        pulsePaused={pulsePaused}
        pulseSecondsLeft={pulseSecondsLeft}
        onChangeMode={onChangeLeftRailMode}
        onCloseMobile={onCloseMobileLeftRail}
        onOpenInventory={() => onOpenCharacterInventory?.()}
        onOpenRelationships={() => onOpenRelationships?.()}
        onOpenRumors={() => onOpenRumors?.()}
        onOpenWorkbench={() => onOpenWorkbench?.()}
        onOpenBaseBlueprint={() => onOpenBaseBlueprint?.()}
        onOpenMap={() => onOpenWorldMap?.()}
        onOpenRest={() => onOpenRest?.()}
        onOpenSaves={onOpenSaves}
        onTogglePulsePause={onTogglePulsePause}
        onAdvanceWorldNow={onAdvanceWorldNow}
      />

      {/* Main Narrative Theater */}
      <section className="flex min-w-0 flex-1 flex-col">
        {/* Scrollable Editorial Chronicle */}
        <div className="flex-1 overflow-y-auto pr-1 pb-6">
          <div className="mx-auto max-w-[960px] space-y-6 pt-2 2xl:max-w-[1060px]">
            {campaign.entries.map((entry, idx) => {
              if (entry.role === 'prologue') {
                const isIllustrating = illustratingEntryId === entry.id;
                return (
                  <article
                    key={entry.id}
                    className="animate-beat-enter overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-[var(--shadow-elevated)]"
                  >
                    {isIllustrating ? (
                      <div className="animate-shimmer aspect-video w-full" />
                    ) : entry.imageUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxImage({
                            url: entry.imageUrl!,
                            caption: entry.imageCaption || campaign.world.title,
                            engine: entry.imageEngine,
                          })
                        }
                        className="group relative block aspect-video w-full overflow-hidden bg-[var(--bg-elevated)] text-left"
                      >
                        <img
                          src={entry.imageUrl}
                          alt={entry.imageCaption || campaign.world.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-surface)] via-transparent to-black/30" />
                        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                          <Maximize2 className="h-3 w-3" />
                          {entry.imageEngine === 'gemini' ? 'Nano Banana 2.1' : 'Arte Demo'}
                        </span>
                      </button>
                    ) : null}

                    <div className="border-b border-[var(--border-subtle)] bg-[var(--accent-soft)] px-6 py-4 sm:px-8">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Prólogo · Crônica do Mundo</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[var(--text-secondary)]">
                            {campaign.world.era}
                          </span>
                          <button
                            type="button"
                            disabled={Boolean(illustratingEntryId)}
                            onClick={() => onIllustrateEntry(entry.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent)] transition hover:bg-[var(--bg-elevated)] disabled:opacity-45"
                          >
                            <ImagePlus className="h-3 w-3" />
                            <span>{entry.imageUrl ? 'Regerar' : 'Ilustrar'}</span>
                          </button>
                        </div>
                      </div>
                      <h1 className="font-display mt-1.5 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">
                        {campaign.world.title}
                      </h1>
                    </div>

                    <div className="p-6 sm:p-8">
                      <div>{renderProseParagraphs(entry.text, true)}</div>

                      {(campaign.world.worldLaws || campaign.codex.factions.length > 0) ? (
                        <div className="mt-6 grid gap-3 border-t border-[var(--border-subtle)] pt-5 sm:grid-cols-2">
                          {campaign.world.worldLaws ? (
                            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5">
                              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                                <Scale className="h-3.5 w-3.5" />
                                <span>Leis deste Universo</span>
                              </div>
                              <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                                {campaign.world.worldLaws}
                              </p>
                            </div>
                          ) : null}

                          {campaign.codex.factions.length > 0 ? (
                            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5">
                              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                                <Flag className="h-3.5 w-3.5" />
                                <span>Forças & Facções</span>
                              </div>
                              <ul className="space-y-1 text-xs text-[var(--text-secondary)]">
                                {campaign.codex.factions.slice(0, 4).map((fac) => (
                                  <li key={fac.id}>
                                    <strong className="text-[var(--text-primary)]">{fac.name}:</strong>{' '}
                                    {fac.influence}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              }

              if (entry.role === 'player') {
                const playerSpeech =
                  dialogueStyle !== 'classic' && !entry.isDirection
                    ? extractPlayerSpeech(entry.text)
                    : { isSpeech: false, spokenText: entry.text };

                if (playerSpeech.isSpeech) {
                  const protagInitials = campaign.player.name
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase() ?? '')
                    .join('');
                  return (
                    <div
                      key={entry.id}
                      className="animate-beat-enter flex flex-row-reverse items-start gap-2.5"
                    >
                      {campaign.player.portraitUrl ? (
                        <img
                          src={campaign.player.portraitUrl}
                          alt={campaign.player.name}
                          className="mt-0.5 h-9 w-9 shrink-0 rounded-2xl border-2 border-[var(--accent)] object-cover shadow-sm"
                        />
                      ) : (
                        <span className="font-display mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--accent)] bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
                          {protagInitials || 'V'}
                        </span>
                      )}
                      <div className="flex max-w-[85%] flex-col items-end gap-1.5 sm:max-w-[78%]">
                        <div className="flex flex-wrap items-center justify-end gap-1.5 px-1 text-xs">
                          {playerSpeech.recipient ? (
                            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                              Para {playerSpeech.recipient}
                            </span>
                          ) : null}
                          <span className="font-bold text-[var(--accent)]">
                            {campaign.player.name}
                          </span>
                        </div>
                        <div className="rounded-2xl rounded-tr-sm border border-[var(--accent)]/45 bg-[var(--accent-soft)] px-3.5 py-2.5 text-[15px] leading-relaxed text-[var(--text-primary)] shadow-sm sm:px-4">
                          <p className="whitespace-pre-wrap">{playerSpeech.spokenText}</p>
                        </div>
                        {entry.diceRoll ? (
                          <div className="font-mono-tech inline-flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px]">
                            <Dices className="h-3.5 w-3.5 text-[var(--accent)]" />
                            <span className="text-[var(--text-secondary)]">
                              {entry.diceRoll.rolls
                                ? `2×d20 (${entry.diceRoll.rolls[0]}, ${entry.diceRoll.rolls[1]} → ${entry.diceRoll.roll})`
                                : `d20 (${entry.diceRoll.roll})`}
                              {' = '}
                              <strong className="text-[var(--text-primary)]">
                                {entry.diceRoll.total}
                              </strong>{' '}
                              vs DC {entry.diceRoll.dc}
                            </span>
                            <span
                              className="font-semibold"
                              style={{
                                color:
                                  entry.diceRoll.outcome === 'critical_success' ||
                                  entry.diceRoll.outcome === 'success'
                                    ? 'var(--success)'
                                    : entry.diceRoll.outcome === 'partial'
                                      ? 'var(--warning)'
                                      : 'var(--danger)',
                              }}
                            >
                              · {formatOutcomeLabel(entry.diceRoll.outcome, language)}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={entry.id}
                    className={`animate-beat-enter flex items-start gap-2.5 border-l-2 py-1 pl-4 ${
                      entry.isDirection
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]/35 pr-3 rounded-r-xl'
                        : 'border-[var(--accent)]/60'
                    }`}
                  >
                    <span
                      className={`mt-1 shrink-0 text-xs font-semibold uppercase tracking-wider ${
                        entry.isDirection
                          ? 'inline-flex items-center gap-1 rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] text-[var(--accent)]'
                          : 'text-[var(--accent)]'
                      }`}
                    >
                      {entry.isDirection ? (
                        <>
                          <Wand2 className="h-3 w-3" />
                          <span>Direção</span>
                        </>
                      ) : (
                        '▸ Você'
                      )}
                    </span>
                    <div className="space-y-1.5">
                      <p className="text-sm italic leading-relaxed text-[var(--text-secondary)] sm:text-base">
                        {entry.text}
                      </p>
                      {entry.diceRoll ? (
                        <div className="font-mono-tech inline-flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px]">
                          <Dices className="h-3.5 w-3.5 text-[var(--accent)]" />
                          <span className="text-[var(--text-secondary)]">
                            {entry.diceRoll.rolls
                              ? `2×d20 (${entry.diceRoll.rolls[0]}, ${entry.diceRoll.rolls[1]} → ${entry.diceRoll.roll})`
                              : `d20 (${entry.diceRoll.roll})`}
                            {entry.diceRoll.attribute &&
                            typeof entry.diceRoll.attributeMod === 'number' &&
                            entry.diceRoll.attributeMod !== 0
                              ? ` ${entry.diceRoll.attributeMod > 0 ? '+' : '-'} ${Math.abs(entry.diceRoll.attributeMod)} (${ATTRIBUTE_META[entry.diceRoll.attribute].short[language]})`
                              : ''}
                            {entry.diceRoll.skillLevelBonus &&
                            entry.diceRoll.skillLevelBonus > 0 &&
                            entry.diceRoll.bonusSource
                              ? ` + ${entry.diceRoll.skillLevelBonus} (${entry.diceRoll.bonusSource})`
                              : !entry.diceRoll.attribute && entry.diceRoll.bonus !== 0
                                ? ` ${formatModifier(entry.diceRoll.bonus)}${entry.diceRoll.bonusSource ? ` (${entry.diceRoll.bonusSource})` : ''}`
                                : ''}{' '}
                            = <strong className="text-[var(--text-primary)]">{entry.diceRoll.total}</strong> vs DC {entry.diceRoll.dc}
                          </span>
                          {entry.diceRoll.advantageSource ? (
                            <span className="rounded bg-[var(--success)]/12 px-1.5 py-0.5 text-[10px] font-medium text-[var(--success)]">
                              Vantagem ({entry.diceRoll.advantageSource})
                            </span>
                          ) : null}
                          {entry.diceRoll.rerolledWithInspiration ? (
                            <span className="rounded bg-[#fbbf24]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#fbbf24]">
                              ✦ Inspiração
                            </span>
                          ) : null}
                          <span
                            className="font-semibold"
                            style={{
                              color:
                                entry.diceRoll.outcome === 'critical_success' ||
                                entry.diceRoll.outcome === 'success'
                                  ? 'var(--success)'
                                  : entry.diceRoll.outcome === 'partial'
                                    ? 'var(--warning)'
                                    : 'var(--danger)',
                            }}
                          >
                            · {formatOutcomeLabel(entry.diceRoll.outcome, language)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              }

              if (entry.role === 'pulse') {
                return (
                  <div
                    key={entry.id}
                    className="animate-beat-enter rounded-2xl border border-[var(--warning)]/30 bg-[var(--bg-surface)]/80 px-5 py-4"
                  >
                    <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--warning)]">
                      <Flame className="h-3.5 w-3.5" />
                      <span>Pulso do Mundo Vivo</span>
                    </div>
                    <p className="font-prose text-[var(--text-secondary)]">{entry.text}</p>
                  </div>
                );
              }

              if (entry.role === 'system') {
                return (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-dashed border-[var(--border-subtle)] px-4 py-2 text-center text-xs text-[var(--text-muted)]"
                  >
                    {entry.text}
                  </div>
                );
              }

              // Narrator entry
              const prevNarrator = campaign.entries
                .slice(0, idx)
                .reverse()
                .find((e) => e.role === 'narrator');
              const showSceneHeader =
                idx === firstNarratorIndex ||
                (entry.sceneTitle && entry.sceneTitle !== prevNarrator?.sceneTitle);

              const isIllustrating = illustratingEntryId === entry.id;

              return (
                <article
                  key={entry.id}
                  className="group animate-beat-enter overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/70 shadow-[var(--shadow-card)]"
                >
                  {isIllustrating ? (
                    <div className="animate-shimmer aspect-video w-full" />
                  ) : entry.imageUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxImage({
                          url: entry.imageUrl!,
                          caption: entry.imageCaption || entry.sceneTitle || campaign.currentLocation,
                          engine: entry.imageEngine,
                        })
                      }
                      className="group/img relative block aspect-video w-full overflow-hidden bg-[var(--bg-elevated)] text-left"
                    >
                      <img
                        src={entry.imageUrl}
                        alt={entry.imageCaption || entry.sceneTitle || 'Cena'}
                        className="h-full w-full object-cover transition duration-500 group-hover/img:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-surface)] via-transparent to-black/25" />
                      <div className="absolute right-3 bottom-2.5 left-3 flex items-center justify-between text-[11px] text-white/90">
                        <span className="truncate rounded-full bg-black/55 px-2.5 py-0.5 backdrop-blur-sm">
                          {entry.imageCaption || entry.location}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-0.5 text-[10px] backdrop-blur-sm">
                          <Maximize2 className="h-2.5 w-2.5" />
                          {entry.imageEngine === 'gemini' ? 'Nano Banana 2.1' : 'Arte Demo'}
                        </span>
                      </div>
                    </button>
                  ) : null}

                  <div className="p-5 sm:p-7">
                    <header className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
                      <div className="flex items-center gap-2">
                        <Compass className="h-4 w-4 text-[var(--accent)]" />
                        <h2 className="font-display text-sm font-semibold tracking-wider text-[var(--accent)] uppercase">
                          {showSceneHeader
                            ? entry.sceneTitle || campaign.world.title
                            : `${entry.location || campaign.currentLocation} · Turno ${entry.turn}`}
                        </h2>
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.mood ? (
                          <span className="rounded-full bg-[var(--bg-elevated)] px-2.5 py-0.5 text-[11px] text-[var(--text-muted)]">
                            {entry.mood}
                          </span>
                        ) : null}
                        {onToggleSpeakEntry ? (
                          <button
                            type="button"
                            disabled={
                              Boolean(loadingSpeechEntryId) &&
                              loadingSpeechEntryId !== entry.id
                            }
                            onClick={() => onToggleSpeakEntry(entry.id, entry.text)}
                            title={
                              speakingEntryId === entry.id
                                ? 'Parar narração em voz'
                                : 'Ouvir cena narrada (Gemini 3.8 TTS)'
                            }
                            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-45 ${
                              speakingEntryId === entry.id
                                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                                : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                            }`}
                          >
                            {speakingEntryId === entry.id ? (
                              <>
                                <Square className="h-3 w-3" />
                                <span>Parar</span>
                              </>
                            ) : (
                              <>
                                <Volume2
                                  className={`h-3 w-3 ${
                                    loadingSpeechEntryId === entry.id
                                      ? 'animate-pulse text-[var(--accent)]'
                                      : ''
                                  }`}
                                />
                                <span>
                                  {loadingSpeechEntryId === entry.id ? '...' : 'Ouvir'}
                                </span>
                              </>
                            )}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={Boolean(illustratingEntryId)}
                          onClick={() => onIllustrateEntry(entry.id)}
                          title="Gerar ilustração desta cena"
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-45"
                        >
                          <ImagePlus className="h-3 w-3" />
                          <span>{entry.imageUrl ? 'Regerar' : 'Ilustrar'}</span>
                        </button>
                      </div>
                    </header>

                    <div>
                      {dialogueStyle === 'classic' ? (
                        renderProseParagraphs(entry.text, idx === firstNarratorIndex)
                      ) : (
                        <SceneBeatsRenderer
                          campaign={campaign}
                          text={entry.text}
                          beats={entry.beats}
                          dialogueStyle={dialogueStyle}
                          onOpenRelationships={onOpenRelationships}
                        />
                      )}
                    </div>

                    {entry.deltas && entry.deltas.length > 0 ? (
                      <footer className="mt-4 flex flex-wrap gap-1.5 border-t border-[var(--border-subtle)] pt-3">
                        {entry.deltas.map((d, dIdx) => (
                          <span
                            key={dIdx}
                            className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                              d.positive
                                ? 'border-[var(--success)]/35 bg-[var(--success)]/10 text-[var(--success)]'
                                : 'border-[var(--danger)]/35 bg-[var(--danger)]/10 text-[var(--danger)]'
                            }`}
                          >
                            {d.label}
                          </span>
                        ))}
                      </footer>
                    ) : null}

                    {/* Latest Turn Controls: Undo, Regenerate, BG3 Inspiration Reroll */}
                    {idx === lastNarratorIndex &&
                    !isEnded &&
                    !isBusy &&
                    (canUndo || canRegenerate || canRerollLastTurn) ? (
                      <div className="mt-3.5 flex flex-wrap items-center justify-end gap-1.5 border-t border-[var(--border-subtle)]/70 pt-2.5">
                        {canRerollLastTurn && onRerollLastTurn ? (
                          <button
                            type="button"
                            onClick={onRerollLastTurn}
                            title="Gastar 1 Ponto de Inspiração BG3 para rerrolar o dado d20 deste turno"
                            className="inline-flex items-center gap-1 rounded-lg border border-[#fbbf24]/50 bg-[#fbbf24]/12 px-2.5 py-1 text-[11px] font-semibold text-[#fbbf24] transition hover:bg-[#fbbf24]/22"
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>
                              Rerrolar d20 (Inspiração {campaign.player.inspiration ?? 1})
                            </span>
                          </button>
                        ) : null}
                        {canRegenerate && onRegenerateTurn ? (
                          <button
                            type="button"
                            onClick={onRegenerateTurn}
                            title="Gerar uma versão alternativa desta última resposta da IA"
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Regerar Cena</span>
                          </button>
                        ) : null}
                        {canUndo && onUndoTurn ? (
                          <button
                            type="button"
                            onClick={onUndoTurn}
                            title="Voltar 1 turno instantaneamente (sem perder o progresso anterior)"
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--warning)] hover:text-[var(--warning)]"
                          >
                            <Undo2 className="h-3 w-3" />
                            <span>Voltar 1 Turno</span>
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}

            {isEnded && campaign.epilogue ? (
              <EpiloguePanel
                epilogue={campaign.epilogue}
                onOpenSaves={onOpenSaves}
                onExport={onExportCampaign}
                onBackHome={onBackHome}
              />
            ) : null}

            {isBusy ? (
              <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 px-5 py-4 text-sm text-[var(--text-secondary)]">
                <span className="h-2.5 w-2.5 animate-ping rounded-full bg-[var(--accent)]" />
                <span className="font-prose italic">{copy.weaving}</span>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Bottom Command Dock */}
        {!isEnded ? (
          <div className="mx-auto w-full max-w-[960px] shrink-0 pt-2 2xl:max-w-[1060px]">
            {isVigorCrisis ? (
              <div className="animate-beat-enter rounded-2xl border border-[var(--danger)]/60 bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-elevated)]">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--danger)]/15 text-[var(--danger)]">
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <h3 className="font-display text-base font-semibold text-[var(--danger)]">
                      À Beira do Colapso · Vigor 0
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                      Seu personagem atingiu o limite físico. Role um Teste de Sobrevivência (d20 vs DC {DIFFICULTY_DC[campaign.difficulty]}), consuma um suprimento de emergência ou aceite o desfecho trágico.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onResolveVigorCrisis('survival_roll')}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-semibold text-[var(--accent-contrast)] transition hover:brightness-110 disabled:opacity-50"
                      >
                        <Dices className="h-4 w-4" />
                        <span>Rolar Teste de Sobrevivência (d20)</span>
                      </button>

                      {consumables.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            onResolveVigorCrisis('use_consumable', item)
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--success)]/50 bg-[var(--success)]/15 px-3.5 py-2.5 text-xs font-semibold text-[var(--success)] transition hover:brightness-110 disabled:opacity-50"
                        >
                          <Flame className="h-3.5 w-3.5" />
                          <span>Usar {item.name} (+30 Vigor)</span>
                        </button>
                      ))}

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onResolveVigorCrisis('accept_end')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--danger)]/50 bg-[var(--danger)]/10 px-3.5 py-2.5 text-xs font-medium text-[var(--danger)] transition hover:bg-[var(--danger)]/20 disabled:opacity-50"
                      >
                        <Skull className="h-3.5 w-3.5" />
                        <span>Aceitar o Destino</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {isTensionCrisis ? (
                  <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-[var(--warning)]/60 bg-[var(--warning)]/12 px-4 py-2.5 text-xs text-[var(--warning)]">
                    <Zap className="h-4 w-4 shrink-0" />
                    <span>
                      <strong>Ponto de Ruptura (Tensão 100%):</strong> sua próxima ação desencadeia uma virada climática decisiva na cena!
                    </span>
                  </div>
                ) : null}

                {campaign.actions.length > 0 ? (
                  <div className="mb-3 space-y-1.5">
                    <div className="flex items-center justify-between px-1 text-[11px]">
                      <span className="font-semibold uppercase tracking-wider text-[var(--accent)]">
                        Suas Escolhas
                      </span>
                      <span className="text-[var(--text-muted)]">
                        Clique para escolher ou escreva abaixo
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
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
                      const attrShort =
                        ATTRIBUTE_META[cardCheck.attribute].short[language];
                      return (
                        <div
                          key={action.id}
                          style={{ animationDelay: `${idx * 45}ms` }}
                          onClick={() => handleActionCardClick(action)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleActionCardClick(action);
                            }
                          }}
                          className={`animate-choice-in group flex cursor-pointer items-start justify-between gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-[var(--bg-elevated)] hover:shadow-md active:translate-y-0 active:scale-[0.99] ${
                            isBusy ? 'pointer-events-none opacity-50' : ''
                          }`}
                        >
                          <div className="flex min-w-0 flex-1 items-start gap-2.5">
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="mb-0.5 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                                <span>
                                  {action.effectTag ||
                                    INTENT_LABELS[action.intent][language]}
                                </span>
                                <span
                                  title={`${ATTRIBUTE_META[cardCheck.attribute].full[language]} ${formatModifier(cardCheck.attributeMod)}`}
                                  className="font-mono-tech rounded bg-[var(--bg-canvas)]/80 px-1.5 py-0.5 text-[9px] font-bold tracking-normal text-[var(--text-secondary)]"
                                >
                                  {attrShort} {formatModifier(cardCheck.attributeMod)}
                                </span>
                                {cardCheck.requiresRoll ? (
                                  <span
                                    title={`${cardCheck.reason || 'Teste de risco'} · ${attrShort} ${formatModifier(cardCheck.attributeMod)}${
                                      cardCheck.bonusSource
                                        ? ` + ${cardCheck.bonusSource}`
                                        : ''
                                    }`}
                                    className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold tracking-normal normal-case ${
                                      isHighRisk
                                        ? 'border-[var(--danger)]/45 bg-[var(--danger)]/12 text-[var(--danger)]'
                                        : 'border-[var(--warning)]/45 bg-[var(--warning)]/12 text-[var(--warning)]'
                                    }`}
                                  >
                                    <Dices className="h-2.5 w-2.5" />
                                    d20
                                    {cardCheck.totalBonus !== 0
                                      ? ` · ${formatModifier(cardCheck.totalBonus)}`
                                      : ''}
                                  </span>
                                ) : (
                                  <span
                                    title="Avança a história sem rolagem de dado"
                                    className="rounded-md bg-[var(--bg-canvas)]/70 px-1.5 py-0.5 text-[9px] font-semibold tracking-normal normal-case text-[var(--success)]"
                                  >
                                    Livre
                                  </span>
                                )}
                                {action.unlockHint ? (
                                  <span className="inline-flex items-center gap-0.5 rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-[9px] font-semibold tracking-normal normal-case text-[var(--accent)]">
                                    <Sparkles className="h-2.5 w-2.5" />
                                    {action.unlockHint}
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-xs leading-snug font-medium text-[var(--text-primary)]">
                                {action.label}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleCustomizeAction(e, action)}
                            title="Editar ação antes de enviar"
                            className="shrink-0 rounded-md p-1 text-[var(--text-muted)] opacity-60 transition hover:bg-[var(--bg-canvas)] hover:text-[var(--accent)] group-hover:opacity-100"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                ) : null}

                {/* Spotlight Command Bar */}
                <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-2.5 shadow-[var(--shadow-elevated)]">
                  <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
                    {/* Clear 3-mode pill toggle: Agir vs Falar vs Dirigir */}
                    <div className="inline-flex rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/70 p-0.5">
                      <button
                        type="button"
                        onClick={() => setInputMode('act')}
                        title="Descrever uma ação, movimento, exploração ou combate"
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                          inputMode === 'act'
                            ? 'bg-[var(--accent-soft)] text-[var(--accent)] shadow-sm'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <Compass className="h-3.5 w-3.5" />
                        <span>
                          {language === 'en' ? 'Act' : 'Agir'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputMode('say')}
                        title="Falar em diálogo com personagens da cena"
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                          inputMode === 'say'
                            ? 'bg-[var(--accent-soft)] text-[var(--accent)] shadow-sm'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>
                          {language === 'en'
                            ? 'Say'
                            : language === 'fr'
                              ? 'Parler'
                              : 'Falar'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputMode('direct')}
                        title="Guiar a história como co-autor: mudar linha do tempo, apresentar personagens ou corrigir o cenário (sempre sem dado)"
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                          inputMode === 'direct'
                            ? 'bg-[var(--accent-soft)] text-[var(--accent)] shadow-sm'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <Wand2 className="h-3.5 w-3.5" />
                        <span>
                          {language === 'en'
                            ? 'Direct'
                            : language === 'fr'
                              ? 'Diriger'
                              : 'Dirigir'}
                        </span>
                      </button>
                    </div>

                    {/* Transparent Dice Policy & Live Trigger Pill */}
                    <button
                      type="button"
                      disabled={inputMode === 'direct'}
                      onClick={cycleDicePolicy}
                      title={
                        inputMode === 'direct'
                          ? 'Modo Dirigir nunca rola dado — a IA obedece sua direção narrativa'
                          : 'Clique para alternar: d20 Automático (só quando há risco) → Forçar teste → Sem dado'
                      }
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                        inputMode === 'direct'
                          ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]'
                          : dicePolicy === 'force'
                            ? 'border-[var(--accent)]/60 bg-[var(--accent-soft)] text-[var(--accent)]'
                            : dicePolicy === 'off'
                              ? 'border-[var(--success)]/45 bg-[var(--success)]/12 text-[var(--success)]'
                              : liveAssessment.requiresRoll
                                ? 'border-[var(--warning)]/60 bg-[var(--warning)]/14 text-[var(--warning)]'
                                : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <Dices className="h-3.5 w-3.5" />
                      <span>
                        {inputMode === 'direct'
                          ? 'Sem dado · Direção da História'
                          : dicePolicy === 'force'
                            ? 'd20: Forçar teste'
                            : dicePolicy === 'off'
                              ? 'Sem dado (Narrativo)'
                              : liveAssessment.requiresRoll
                                ? `Rolará d20 · ${liveAssessment.reason}${
                                    liveAssessment.attribute
                                      ? ` (${ATTRIBUTE_META[liveAssessment.attribute].short[language]}${
                                          typeof liveAssessment.totalBonus === 'number' &&
                                          liveAssessment.totalBonus !== 0
                                            ? ` ${formatModifier(liveAssessment.totalBonus)}`
                                            : ''
                                        })`
                                      : ''
                                  }`
                                : 'd20 Auto · Sem dado'}
                      </span>
                    </button>

                    {selectedItem ? (
                      <span className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent)]">
                        <span>Item: {selectedItem.name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedItem(null)}
                          className="hover:text-[var(--text-primary)]"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-end gap-2">
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      value={inputText}
                      onChange={(e) => {
                        setInputText(e.target.value);
                        onTypingActivity();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit();
                        }
                      }}
                      placeholder={
                        inputMode === 'direct'
                          ? language === 'en'
                            ? 'Guide the story, adjust the timeline, introduce an NPC or rewrite the scene context...'
                            : language === 'fr'
                              ? 'Orientez le récit, ajustez la chronologie ou introduisez un personnage...'
                              : 'Guie a narrativa, volte no tempo, apresente um personagem ou ajuste o cenário (ex: "Ainda falta 1 semana para o surto e Jonas tem uma vizinha...")...'
                          : inputMode === 'say'
                            ? language === 'en'
                              ? 'Write what you say aloud (e.g. "Who passed through here last night?")...'
                              : language === 'fr'
                                ? 'Écrivez ce que vous dites à voix haute...'
                                : 'Escreva o que você diz em diálogo (ex: "Quem esteve aqui ontem à noite?")...'
                            : language === 'en'
                              ? 'Describe what you do (explore, inspect, confront, sneak)...'
                              : language === 'fr'
                                ? 'Décrivez votre action (explorer, observer, combattre)...'
                                : 'Descreva o que você faz (explorar, examinar, lutar, agir)...'
                      }
                      className="max-h-32 min-h-[42px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
                    />
                    <button
                      type="button"
                      disabled={isBusy || (!inputText.trim() && !selectedItem)}
                      onClick={handleSubmit}
                      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 text-xs font-semibold text-[var(--accent-contrast)] transition hover:brightness-110 disabled:opacity-40"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>
                        {inputMode === 'direct'
                          ? language === 'en'
                            ? 'Direct'
                            : language === 'fr'
                              ? 'Diriger'
                              : 'Guiar'
                          : inputMode === 'say'
                            ? language === 'en'
                              ? 'Say'
                              : language === 'fr'
                                ? 'Parler'
                                : 'Falar'
                            : copy.sendAction}
                      </span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : null}
      </section>

      {/* Desktop Right Zen Browser Split / Auto-Peek HUD */}
      {!focusMode ? (
        <aside className="relative hidden w-[350px] shrink-0 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:block xl:w-[395px] 2xl:w-[415px]">
          <button
            type="button"
            onClick={onToggleRightHud}
            title="Recolher Painel Direito (Zen Foco)"
            className="absolute top-1/2 -left-3 z-20 flex h-12 w-5 -translate-y-1/2 items-center justify-center rounded-l-lg border border-r-0 border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-muted)] shadow-md transition hover:bg-[var(--bg-elevated)] hover:text-[var(--accent)]"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <ContextHud
            campaign={campaign}
            language={language}
            isSummarizing={isSummarizing}
            isGeneratingPortrait={isGeneratingPortrait}
            generatingNpcPortraitId={generatingNpcPortraitId}
            onUseItem={handleUseItemFromHud}
            onToggleEquipItem={onToggleEquipItem}
            onSpendAttributePoint={onSpendAttributePoint}
            onTogglePartyMember={onTogglePartyMember}
            onGenerateNpcPortrait={onGenerateNpcPortrait}
            onBuildStrongholdUpgrade={onBuildStrongholdUpgrade}
            onOpenWorldMap={onOpenWorldMap}
            onOpenCharacterInventory={onOpenCharacterInventory}
            onOpenBaseBlueprint={onOpenBaseBlueprint}
            onOpenRelationships={onOpenRelationships}
            onMentionNpc={handleMentionNpcFromHud}
            onTravelLocation={handleTravelFromHud}
            onAddCanonFact={onAddCanonFact}
            onRemoveCanonFact={onRemoveCanonFact}
            onUpdateWorldNotes={onUpdateWorldNotes}
            onSummarizeNow={onSummarizeNow}
            onConcludeCampaign={onConcludeCampaign}
            onGeneratePortrait={onGeneratePortrait}
            onZoomImage={(url, caption, engine) =>
              setLightboxImage({ url, caption, engine })
            }
          />
        </aside>
      ) : (
        <div className="hidden lg:block">
          {!rightHudPeek ? (
            <button
              type="button"
              onMouseEnter={() => setRightHudPeek(true)}
              onClick={onToggleRightHud}
              title="Puxar Painel Direito (Ficha & Mundo)"
              className="fixed top-1/2 right-0 z-30 flex -translate-y-1/2 flex-col items-center gap-1 rounded-l-xl border border-r-0 border-[var(--border-strong)] bg-[var(--bg-glass)] px-1 py-4 text-[var(--text-muted)] shadow-lg backdrop-blur-xl transition hover:px-1.5 hover:text-[var(--accent)]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="h-6 w-0.5 rounded-full bg-[var(--accent)]/60" />
            </button>
          ) : (
            <div
              onMouseLeave={() => setRightHudPeek(false)}
              className="animate-zen-peek-right fixed top-12 right-3 bottom-3 z-40 flex w-[380px] flex-col overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-canvas)]/95 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
            >
              <div className="mb-1.5 flex items-center justify-between px-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Ficha & Mundo (Prévia Zen)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRightHudPeek(false);
                    onToggleRightHud();
                  }}
                  title="Fixar Painel Direito em Split"
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)] transition hover:brightness-110"
                >
                  <Pin className="h-3 w-3" />
                  Fixar Split
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <ContextHud
                  campaign={campaign}
                  language={language}
                  isSummarizing={isSummarizing}
                  isGeneratingPortrait={isGeneratingPortrait}
                  generatingNpcPortraitId={generatingNpcPortraitId}
                  onUseItem={handleUseItemFromHud}
                  onToggleEquipItem={onToggleEquipItem}
                  onSpendAttributePoint={onSpendAttributePoint}
                  onTogglePartyMember={onTogglePartyMember}
                  onGenerateNpcPortrait={onGenerateNpcPortrait}
                  onBuildStrongholdUpgrade={onBuildStrongholdUpgrade}
                  onOpenWorldMap={() => {
                    setRightHudPeek(false);
                    onOpenWorldMap?.();
                  }}
                  onOpenCharacterInventory={() => {
                    setRightHudPeek(false);
                    onOpenCharacterInventory?.();
                  }}
                  onOpenBaseBlueprint={() => {
                    setRightHudPeek(false);
                    onOpenBaseBlueprint?.();
                  }}
                  onOpenRelationships={(npcId) => {
                    setRightHudPeek(false);
                    onOpenRelationships?.(npcId);
                  }}
                  onMentionNpc={handleMentionNpcFromHud}
                  onTravelLocation={handleTravelFromHud}
                  onAddCanonFact={onAddCanonFact}
                  onRemoveCanonFact={onRemoveCanonFact}
                  onUpdateWorldNotes={onUpdateWorldNotes}
                  onSummarizeNow={onSummarizeNow}
                  onConcludeCampaign={onConcludeCampaign}
                  onGeneratePortrait={onGeneratePortrait}
                  onZoomImage={(url, caption, engine) =>
                    setLightboxImage({ url, caption, engine })
                  }
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile Right HUD Slide-over Sheet (Triggered from GNOME TopBar Right Button) */}
      {mobileRightHudOpen ? (
        <div className="animate-backdrop-in fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm lg:hidden">
          <div
            className="fixed inset-0"
            onClick={onCloseMobileRightHud}
            aria-hidden="true"
          />
          <div className="animate-drawer-right relative z-10 flex h-full w-full max-w-sm flex-col bg-[var(--bg-canvas)] p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="font-display text-sm font-semibold text-[var(--accent)]">
                Mundo, Memória & Ficha
              </span>
              <button
                type="button"
                onClick={onCloseMobileRightHud}
                className="rounded-lg border border-[var(--border-subtle)] p-1.5 text-[var(--text-secondary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ContextHud
                campaign={campaign}
                language={language}
                isSummarizing={isSummarizing}
                isGeneratingPortrait={isGeneratingPortrait}
                generatingNpcPortraitId={generatingNpcPortraitId}
                onUseItem={handleUseItemFromHud}
                onToggleEquipItem={onToggleEquipItem}
                onSpendAttributePoint={onSpendAttributePoint}
                onTogglePartyMember={onTogglePartyMember}
                onGenerateNpcPortrait={onGenerateNpcPortrait}
                onBuildStrongholdUpgrade={onBuildStrongholdUpgrade}
                onOpenWorldMap={() => {
                  onCloseMobileRightHud();
                  onOpenWorldMap?.();
                }}
                onOpenCharacterInventory={() => {
                  onCloseMobileRightHud();
                  onOpenCharacterInventory?.();
                }}
                onOpenBaseBlueprint={() => {
                  onCloseMobileRightHud();
                  onOpenBaseBlueprint?.();
                }}
                onOpenRelationships={(npcId) => {
                  onCloseMobileRightHud();
                  onOpenRelationships?.(npcId);
                }}
                onMentionNpc={handleMentionNpcFromHud}
                onTravelLocation={handleTravelFromHud}
                onAddCanonFact={onAddCanonFact}
                onRemoveCanonFact={onRemoveCanonFact}
                onUpdateWorldNotes={onUpdateWorldNotes}
                onSummarizeNow={onSummarizeNow}
                onConcludeCampaign={onConcludeCampaign}
                onGeneratePortrait={onGeneratePortrait}
                onZoomImage={(url, caption, engine) =>
                  setLightboxImage({ url, caption, engine })
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Fullscreen Image Lightbox */}
      {lightboxImage ? (
        <div
          onClick={() => setLightboxImage(null)}
          className="animate-backdrop-in fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-modal-spring relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 z-10 rounded-full bg-black/65 p-2 text-white transition hover:bg-black"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.caption || 'Ilustração'}
              className="max-h-[80vh] w-full object-contain"
            />
            {lightboxImage.caption ? (
              <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-4 py-3 text-xs text-[var(--text-secondary)]">
                <span>{lightboxImage.caption}</span>
                <span className="text-[11px] text-[var(--accent)]">
                  {lightboxImage.engine === 'gemini' ? 'Gemini Nano Banana 2.1' : 'Arte Procedural Demo'}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
