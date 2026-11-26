import { useCallback, useEffect, useRef, useState } from 'react';
import { BaseBlueprintModal } from './components/BaseBlueprintModal';
import { CharacterInventoryModal } from './components/CharacterInventoryModal';
import { ChapterBanner } from './components/ChapterBanner';
import { ClashBattleArena } from './components/ClashBattleArena';
import { ClashLauncherModal } from './components/ClashBannerTrigger';
import { ClockWeatherPopover } from './components/ClockWeatherPopover';
import { DiceRollOverlay } from './components/DiceRollOverlay';
import { DocsPortal } from './components/docs/DocsPortal';
import { InteractiveTourOverlay } from './components/InteractiveTourOverlay';
import { LevelUpModal, type LevelUpChoicePayload } from './components/LevelUpModal';
import { NewsRumorsModal } from './components/NewsRumorsModal';
import { OrganizationModal } from './components/OrganizationModal';
import { ProtagonistEditModal } from './components/ProtagonistEditModal';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { QrSyncModal } from './components/QrSyncModal';
import { RelationshipsModal } from './components/RelationshipsModal';
import { RestCampModal, type RestChoicePayload } from './components/RestCampModal';
import { SanctuaryHome } from './components/SanctuaryHome';
import { SaveSlotsDrawer } from './components/SaveSlotsDrawer';
import { SettingsDrawer } from './components/SettingsDrawer';
import { StoryStage } from './components/StoryStage';
import { TimelineTreeModal } from './components/TimelineTreeModal';
import { ToastStack } from './components/ToastStack';
import { TopBar } from './components/TopBar';
import { WeatherAtmosphere } from './components/WeatherAtmosphere';
import { WorkbenchModal } from './components/WorkbenchModal';
import { WorldForge } from './components/WorldForge';
import { WorldMapModal } from './components/WorldMapModal';
import type { ZenRailMode } from './components/ZenLeftRail';
import { createInstantDemoCampaign } from './data/presets';
import type { TourStep } from './data/tourSteps';
import { usePwaInstall } from './hooks/usePwaInstall';
import { ambientAudio } from './engine/ambientAudio';
import {
  appendTimelineNode,
  buildCleanTimelineSnapshot,
  createBranchedCampaign,
  ensureCampaignTimeline,
} from './engine/timelineSystem';
import {
  buildClashRollModifiers,
  CLASH_ARCHETYPE_META,
  convertChaseToCombat,
  extractClashChoreographyBeats,
  hydrateClashState,
  resolveClashRound,
  type ClashChoreographyBeat,
  type ClashRoundResolution,
  type ClashVfxKind,
} from './engine/clashSystem';
import {
  evaluateStorytellerTrigger,
  pickStorytellerCategory,
} from './engine/eventDirector';
import {
  advanceOrgOperations,
  computeOrgTierFromRenown,
  createStarterOperationsForCampaign,
  createStarterRecruitsForCampaign,
  estimateOperationSuccess,
  FACTION_TREATY_META,
  ORG_DIVISION_META,
  ORG_OUTPOST_SPECIALTY_META,
  processDailyOrgUpkeep,
  resolveOperationDeterministically,
} from './engine/orgSystem';
import { DND_CLASSES, DND_FEATS } from './data/dnd52Catalog';
import {
  detectOpposedNpc,
  evaluateOpposedContest,
  findPartyAdvantage,
  inferActionAttribute,
  isUnarmedContest,
  resolveDndDeathSave,
  resolveDndSavingThrow,
  resolveFateCheck,
} from './engine/diceEngine';
import {
  executeDnd52BonusAction,
  executeDnd52FreeMove,
  resolveDnd52ClashRound,
} from './engine/dnd52ClashResolver';
import {
  applyDnd2024LongRest,
  applyDnd2024ShortRest,
  applyDndDamageWithTempHp,
  buildDnd5eSheetFromConfig,
  computeMaxHpForRuleset,
  computeNpcArmorClass,
  computeNpcMaxHpForRuleset,
  getXpDeltaForRuleset,
  hydrateDnd5eSheetFromLegacy,
  isDndRuleset,
  rollDiceFormula,
} from './engine/dnd52Rules';
import {
  advanceClockByMinutes,
  advanceClockToNextMorning,
  ATTRIBUTE_META,
  DEFAULT_ATTRIBUTES,
  defaultBaseSuppliesForTheme,
  defaultCurrencyForTheme,
  defaultNpcAttributes,
  defaultStrongholdForTheme,
  defaultWorldClockForTheme,
  deriveRelationshipFromAffinity,
  EPIC_BOON_ATTRIBUTE_CAP,
  formatClockTime,
  getEffectiveAttributes,
  getProficiencyBonus,
  getSupplyMetaForTheme,
  inferItemStorage,
  isVehicleLikeItem,
  MAX_LEVEL,
  MAX_PARTY_SIZE,
  MAX_SHORT_RESTS_PER_DAY,
  NATURAL_ATTRIBUTE_CAP,
  STRONGHOLD_UPGRADE_CATALOG,
  SUPPLY_KEYS,
} from './engine/rpgSystem';
import {
  applyCodexChanges,
  applyStateChanges,
  fetchApiHealth,
  requestCampaignEpilogue,
  requestClashInit,
  requestCraftUpgrade,
  requestFictionalMapArt,
  requestJournalSummary,
  requestLivingWorldPulse,
  requestMapGeocode,
  requestNpcPortrait,
  requestOrgOperationReport,
  requestOrgOperations,
  requestOrgRecruits,
  requestPortraitIllustration,
  requestSceneIllustration,
  requestSceneSpeech,
  requestStoryStart,
  requestStoryTurn,
  requestWorldEvent,
  requestWorldRumors,
  shouldUseGemini,
  type ApiHealthStatus,
} from './services/storyApi';
import {
  createSaveSlotAsync,
  deleteCampaignAsync,
  deleteSaveSlotAsync,
  exportCampaignJson,
  loadCampaignsAsync,
  loadSaveSlotsAsync,
  loadSettings,
  loadTimelineSnapshotAsync,
  parseImportedCampaign,
  pruneTimelineSnapshotsAsync,
  saveCampaignAsync,
  saveSettings,
  saveTimelineSnapshotAsync,
} from './storage/campaignStore';
import type {
  ActionIntent,
  ActionRisk,
  AppSettings,
  AppView,
  AttributeId,
  Campaign,
  CampaignEpilogue,
  CampaignStatus,
  ChapterTransitionEvent,
  ClashActionPayload,
  ClashAllyDirective,
  ClashArchetype,
  ClashEnemy,
  ClashZone,
  CraftRequest,
  CraftResponse,
  DiceRollResult,
  DifficultyId,
  FactionRecord,
  FactionTreaty,
  InventoryItem,
  ItemStorageLocation,
  JournalEntry,
  LocationRecord,
  NpcRecord,
  OrganizationArchetype,
  OrganizationState,
  OrgDivisionId,
  OrgOperation,
  OrgOutpostSpecialty,
  OrgPolicies,
  OrgRecruitCandidate,
  PlayerState,
  SaveSlot,
  StateDelta,
  StoryEntry,
  SuggestedClashCue,
  SupplyType,
  TacticalAction,
  TimelineBranchPoint,
  TimelineNodeKind,
  ToastMessage,
  VehicleRecord,
  WorldClock,
  WorldConfig,
  WorldEventCategory,
  WorldEventChoice,
  WorldEventRecord,
  WorldRumorItem,
  WorldThemeId,
} from './types/game';

function toTacticalActions(
  raw: Array<{
    label: string;
    intent: ActionIntent;
    risk: ActionRisk;
    requiresRoll?: boolean;
    rollSkillHint?: string;
    attribute?: AttributeId;
    effectTag?: string;
    unlockHint?: string;
  }>,
): TacticalAction[] {
  return raw.map((a, idx) => ({
    id: `act_${Date.now()}_${idx}`,
    label: a.label,
    intent: a.intent,
    risk: a.risk,
    requiresRoll: a.requiresRoll,
    rollSkillHint: a.rollSkillHint,
    attribute: a.attribute,
    effectTag: a.effectTag,
    unlockHint: a.unlockHint,
  }));
}

function evaluateStatus(vigor: number, tension: number): CampaignStatus {
  if (vigor <= 0) return 'crisis_vigor';
  if (tension >= 100) return 'crisis_tension';
  return 'active';
}

export function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [saveSlots, setSaveSlots] = useState<SaveSlot[]>([]);
  const [view, setView] = useState<AppView>('home');
  const [docsReturnView, setDocsReturnView] = useState<'home' | 'forge' | 'stage'>('home');
  const [docsInitialArticleId, setDocsInitialArticleId] = useState<string | undefined>(undefined);
  const [previewTheme, setPreviewTheme] = useState<WorldThemeId>('fantasy');

  const [apiHealth, setApiHealth] = useState<ApiHealthStatus>({
    ok: false,
    hasServerKey: false,
    defaultModel: 'gemini-3.8-flash',
  });

  const [isBusy, setIsBusy] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [illustratingEntryId, setIllustratingEntryId] = useState<string | null>(null);
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false);
  const [generatingNpcPortraitId, setGeneratingNpcPortraitId] = useState<string | null>(null);
  const [speakingEntryId, setSpeakingEntryId] = useState<string | null>(null);
  const [loadingSpeechEntryId, setLoadingSpeechEntryId] = useState<string | null>(null);
  const [worldMapOpen, setWorldMapOpen] = useState(false);
  const [isSyncingMapGeo, setIsSyncingMapGeo] = useState(false);
  const [isGeneratingMapArt, setIsGeneratingMapArt] = useState(false);
  const [clockOpen, setClockOpen] = useState(false);
  const [restModalOpen, setRestModalOpen] = useState(false);
  const [charInventoryOpen, setCharInventoryOpen] = useState(false);
  const [editProtagonistOpen, setEditProtagonistOpen] = useState(false);
  const [baseBlueprintOpen, setBaseBlueprintOpen] = useState(false);
  const [relationshipsOpen, setRelationshipsOpen] = useState(false);
  const [relationshipsFocusNpcId, setRelationshipsFocusNpcId] = useState<string | null>(null);
  const [organizationOpen, setOrganizationOpen] = useState(false);
  const [isLoadingOrgRecruits, setIsLoadingOrgRecruits] = useState(false);
  const [isLoadingOrgOps, setIsLoadingOrgOps] = useState(false);
  const [resolvingOrgOpId, setResolvingOrgOpId] = useState<string | null>(null);
  const [lastOrgReportBanner, setLastOrgReportBanner] = useState<{
    opTitle: string;
    grade: string;
    rollSummary: string;
    narrativeReport: string;
    squadQuote?: { speaker: string; text: string };
  } | null>(null);
  const [rumorsOpen, setRumorsOpen] = useState(false);
  const [isFetchingRumors, setIsFetchingRumors] = useState(false);
  const [workbenchOpen, setWorkbenchOpen] = useState(false);
  const [isCrafting, setIsCrafting] = useState(false);
  const [lastCraftResult, setLastCraftResult] = useState<CraftResponse | null>(null);
  const [focusEventNonce, setFocusEventNonce] = useState(0);
  const [isGeneratingEvent, setIsGeneratingEvent] = useState(false);
  const [queuedUseItem, setQueuedUseItem] = useState<InventoryItem | null>(null);
  const [queuedSayNpc, setQueuedSayNpc] = useState<NpcRecord | null>(null);
  const [undoStack, setUndoStack] = useState<Campaign[]>([]);
  const [lastTurnMeta, setLastTurnMeta] = useState<{
    preTurnSnapshot: Campaign;
    actionText: string;
    intent: ActionIntent;
    risk: ActionRisk;
    requiresRoll?: boolean;
    isDirection: boolean;
    forcedAttribute?: AttributeId;
    diceRoll?: DiceRollResult;
    clashAction?: ClashActionPayload;
    clashResolution?: ClashRoundResolution;
  } | null>(null);
  const [clashLauncherOpen, setClashLauncherOpen] = useState(false);
  const [isStartingClash, setIsStartingClash] = useState(false);
  const [suggestedClash, setSuggestedClash] = useState<SuggestedClashCue | null>(
    null,
  );
  const [arenaDiceRoll, setArenaDiceRoll] = useState<DiceRollResult | null>(null);
  const [arenaBeats, setArenaBeats] = useState<ClashChoreographyBeat[]>([]);
  const [arenaBattleNonce, setArenaBattleNonce] = useState(0);
  const [arenaBossArtUrl, setArenaBossArtUrl] = useState<string | null>(null);
  const [isGeneratingBossArt, setIsGeneratingBossArt] = useState(false);
  const [isFinishingClash, setIsFinishingClash] = useState(false);
  const [levelUpModalOpen, setLevelUpModalOpen] = useState(false);
  const [lastArenaTurnSnapshot, setLastArenaTurnSnapshot] = useState<{
    campSnapshot: Campaign;
    payload: ClashActionPayload;
    vfx: ClashVfxKind;
  } | null>(null);
  const [activeDiceRoll, setActiveDiceRoll] = useState<DiceRollResult | null>(null);
  const [chapterBanner, setChapterBanner] = useState<ChapterTransitionEvent | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [leftRailMode, setLeftRailMode] = useState<ZenRailMode>('compact');
  const [mobileLeftRailOpen, setMobileLeftRailOpen] = useState(false);
  const [mobileRightHudOpen, setMobileRightHudOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savesOpen, setSavesOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [iosInstallGuideOpen, setIosInstallGuideOpen] = useState(false);
  const pwa = usePwaInstall();
  const [qrSyncState, setQrSyncState] = useState<{
    open: boolean;
    mode: 'send' | 'receive';
    campaign: Campaign | null;
    receiveCode?: string;
  }>({
    open: false,
    mode: 'send',
    campaign: null,
  });
  const [settingsInitialTab, setSettingsInitialTab] = useState<
    'ai' | 'game' | 'reading'
  >('game');

  const [pulsePaused, setPulsePaused] = useState(false);
  const [pulseSecondsLeft, setPulseSecondsLeft] = useState(
    settings.livingWorldSeconds,
  );

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [restoredDraft, setRestoredDraft] = useState<{
    id: number;
    text: string;
  } | null>(null);

  const activeCampaignRef = useRef<Campaign | null>(activeCampaign);
  activeCampaignRef.current = activeCampaign;
  const bannerTimerRef = useRef<number | null>(null);
  const speechAudioRef = useRef<HTMLAudioElement | null>(null);
  const turnSeqRef = useRef(0);
  const isTurnInFlightRef = useRef(false);
  const turnAbortRef = useRef<AbortController | null>(null);
  const pulseSecondsRef = useRef(settings.livingWorldSeconds);
  pulseSecondsRef.current = pulseSecondsLeft;

  const cancelActiveTurnRequest = useCallback(() => {
    turnSeqRef.current += 1;
    if (turnAbortRef.current) {
      turnAbortRef.current.abort();
      turnAbortRef.current = null;
    }
    isTurnInFlightRef.current = false;
  }, []);

  const triggerChapterBanner = useCallback(
    (eyebrow: string, title: string, subtitle?: string) => {
      if (bannerTimerRef.current) {
        window.clearTimeout(bannerTimerRef.current);
      }
      setChapterBanner({
        id: `banner_${Date.now()}`,
        eyebrow,
        title,
        subtitle,
      });
      bannerTimerRef.current = window.setTimeout(() => {
        setChapterBanner(null);
      }, 2750);
    },
    [],
  );

  const pushToast = useCallback(
    (kind: ToastMessage['kind'], message: string) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, kind, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    [],
  );

  useEffect(() => {
    void fetchApiHealth().then(setApiHealth);
    void loadCampaignsAsync().then(setCampaigns);

    // Auto-detect scanned QR sync link (?sync=CODIGO) or PWA shortcuts (?view=docs / ?action=receive-qr)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const syncCode = params.get('sync')?.trim();
      const viewParam = params.get('view')?.trim();
      const actionParam = params.get('action')?.trim();
      let cleaned = false;

      if (syncCode && syncCode.length >= 4) {
        params.delete('sync');
        cleaned = true;
        setQrSyncState({
          open: true,
          mode: 'receive',
          campaign: null,
          receiveCode: syncCode.toUpperCase(),
        });
      } else if (viewParam === 'docs') {
        params.delete('view');
        cleaned = true;
        setView('docs');
      } else if (actionParam === 'receive-qr') {
        params.delete('action');
        cleaned = true;
        setQrSyncState({
          open: true,
          mode: 'receive',
          campaign: null,
        });
      }

      if (cleaned) {
        const nextUrl = `${window.location.pathname}${
          params.toString() ? `?${params.toString()}` : ''
        }${window.location.hash}`;
        window.history.replaceState({}, '', nextUrl);
      }
    }
  }, []);

  useEffect(() => {
    if (!activeCampaign) {
      setSaveSlots([]);
      return;
    }
    void loadSaveSlotsAsync(activeCampaign.id).then(setSaveSlots);
  }, [activeCampaign?.id]);

  const effectiveTheme: WorldThemeId =
    view === 'stage' && activeCampaign
      ? activeCampaign.world.primaryTheme
      : previewTheme;

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-world-theme', effectiveTheme);
    root.setAttribute('data-color-mode', settings.colorMode);
    root.style.setProperty('--reader-font', settings.readerFont);
    root.style.setProperty('--reader-size', `${settings.readerFontSize}px`);
  }, [
    effectiveTheme,
    settings.colorMode,
    settings.readerFont,
    settings.readerFontSize,
  ]);

  const activeWeather =
    view === 'stage' && activeCampaign?.worldClock?.weatherType
      ? activeCampaign.worldClock.weatherType
      : 'cloudy';
  const activeTension =
    view === 'stage' && activeCampaign ? activeCampaign.player.tension : 15;

  useEffect(() => {
    if (settings.ambientSoundEnabled) {
      ambientAudio.start(effectiveTheme, settings.ambientVolume);
      ambientAudio.setTheme(effectiveTheme);
      ambientAudio.setWeather(activeWeather);
      ambientAudio.setTension(activeTension);
      ambientAudio.setVolume(settings.ambientVolume);
    } else {
      ambientAudio.stop();
    }
  }, [
    activeTension,
    activeWeather,
    effectiveTheme,
    settings.ambientSoundEnabled,
    settings.ambientVolume,
  ]);

  useEffect(() => {
    return () => {
      ambientAudio.stop();
      if (speechAudioRef.current) {
        speechAudioRef.current.pause();
        speechAudioRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopSpeechPlayback = useCallback(() => {
    if (speechAudioRef.current) {
      speechAudioRef.current.pause();
      speechAudioRef.current.currentTime = 0;
      speechAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingEntryId(null);
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      if (typeof patch.livingWorldSeconds === 'number') {
        setPulseSecondsLeft(patch.livingWorldSeconds);
      }
      return next;
    });
  }, []);

  const persistActiveCampaign = useCallback((next: Campaign) => {
    activeCampaignRef.current = next;
    setActiveCampaign(next);
    void saveCampaignAsync(next).then(setCampaigns);
  }, []);

  const runJournalCompressionIfNeeded = useCallback(
    async (camp: Campaign, manual = false) => {
      if (isSummarizing) return;
      setIsSummarizing(true);
      try {
        const chapterRes = await requestJournalSummary(
          camp,
          'chapter',
          settings,
          apiHealth,
        );

        const nextEntryCount = camp.journalEntryCount + 1;
        const newEntry: JournalEntry = {
          id: `jour_${Date.now()}`,
          chapter: camp.currentChapter,
          title: chapterRes.title,
          summary: chapterRes.summary,
          turnRange: `T${Math.max(1, camp.turnCount - 4)}–T${camp.turnCount}`,
          createdAt: Date.now(),
        };

        let nextJournal = [...camp.player.journal, newEntry];
        let nextChapter = camp.currentChapter;
        let nextArcNumber = camp.arcNumber;
        let nextEraSummaries = [...camp.eraSummaries];

        // Layer 2: Every 10 chapter summaries, archive the Book/Arc permanently into eraSummaries
        if (nextEntryCount % 10 === 0) {
          const arcRes = await requestJournalSummary(
            { ...camp, player: { ...camp.player, journal: nextJournal } },
            'arc_compression',
            settings,
            apiHealth,
          );
          nextEraSummaries = [
            ...nextEraSummaries,
            {
              id: `arc_${Date.now()}`,
              chapter: camp.arcNumber,
              title: arcRes.title,
              summary: arcRes.summary,
              turnRange: `Arco ${camp.arcNumber}`,
              isArcCompression: true,
              createdAt: Date.now(),
            },
          ];
          nextJournal = [];
          nextArcNumber += 1;
          nextChapter += 1;
        }

        const latestCamp = activeCampaignRef.current;
        if (latestCamp && latestCamp.id === camp.id) {
          persistActiveCampaign({
            ...latestCamp,
            currentChapter: nextChapter,
            arcNumber: nextArcNumber,
            eraSummaries: nextEraSummaries,
            journalEntryCount: nextEntryCount,
            player: {
              ...latestCamp.player,
              journal: nextJournal,
            },
          });
          if (nextChapter > camp.currentChapter) {
            triggerChapterBanner(
              `Arco ${nextArcNumber} · Novo Livro`,
              `Capítulo ${nextChapter}`,
              chapterRes.title,
            );
          }
          pushToast(
            'journal',
            manual
              ? `Capítulo registrado: ${chapterRes.title}`
              : `Crônica atualizada: ${chapterRes.title}`,
          );
        }
      } catch (err) {
        if (manual) {
          pushToast(
            'error',
            err instanceof Error ? err.message : 'Erro ao resumir crônica.',
          );
        }
      } finally {
        setIsSummarizing(false);
      }
    },
    [
      apiHealth,
      isSummarizing,
      persistActiveCampaign,
      pushToast,
      settings,
      triggerChapterBanner,
    ],
  );

  const handleGenerateEpilogue = useCallback(
    async (outcome: 'fallen' | 'victory', overrideCamp?: Campaign) => {
      const camp = overrideCamp ?? activeCampaignRef.current;
      if (!camp) return;

      setIsBusy(true);
      try {
        const res = await requestCampaignEpilogue(
          camp,
          outcome,
          settings,
          apiHealth,
        );

        const criticalHits = camp.entries.filter(
          (e) => e.diceRoll?.outcome === 'critical_success',
        ).length;
        const criticalFails = camp.entries.filter(
          (e) => e.diceRoll?.outcome === 'critical_failure',
        ).length;

        const epilogue: CampaignEpilogue = {
          title: res.title,
          outcome,
          summary: res.summary,
          finalWords: res.finalWords,
          stats: {
            turns: camp.turnCount,
            chapters: camp.currentChapter,
            npcsMet: camp.codex.npcs.length,
            locationsDiscovered: camp.codex.locations.length,
            questsCompleted: camp.player.quests.filter(
              (q) => q.status === 'completed',
            ).length,
            criticalHits,
            criticalFails,
          },
          createdAt: Date.now(),
        };

        persistActiveCampaign({
          ...camp,
          status: outcome === 'fallen' ? 'ended_fallen' : 'ended_victory',
          epilogue,
          actions: [],
          engineUsed: res.engineUsed,
        });

        pushToast(
          outcome === 'fallen' ? 'crisis' : 'save',
          `Epílogo gerado: ${res.title}`,
        );
      } catch (err) {
        pushToast(
          'error',
          err instanceof Error ? err.message : 'Erro ao gerar epílogo.',
        );
      } finally {
        setIsBusy(false);
      }
    },
    [apiHealth, persistActiveCampaign, pushToast, settings],
  );

  const handleIllustrateEntry = useCallback(
    async (entryId: string, campOverride?: Campaign) => {
      const camp = campOverride ?? activeCampaignRef.current;
      if (!camp || illustratingEntryId) return;
      const targetEntry = camp.entries.find((e) => e.id === entryId);
      if (!targetEntry) return;

      setIllustratingEntryId(entryId);
      try {
        const res = await requestSceneIllustration(
          camp,
          targetEntry,
          settings,
          apiHealth,
        );

        const latest = activeCampaignRef.current;
        const base = latest && latest.id === camp.id ? latest : camp;
        const updatedEntries = base.entries.map((e) =>
          e.id === entryId
            ? {
                ...e,
                imageUrl: res.dataUrl,
                imageCaption: res.caption,
                imageEngine: res.engineUsed,
              }
            : e,
        );

        persistActiveCampaign({
          ...base,
          coverImageUrl: res.dataUrl,
          entries: updatedEntries,
        });
        pushToast('info', `Ilustração gerada: ${res.caption}`);
      } catch (err) {
        pushToast(
          'error',
          err instanceof Error ? err.message : 'Falha ao ilustrar cena.',
        );
      } finally {
        setIllustratingEntryId(null);
      }
    },
    [apiHealth, illustratingEntryId, persistActiveCampaign, pushToast, settings],
  );

  const handleGeneratePortrait = useCallback(async () => {
    const camp = activeCampaignRef.current;
    if (!camp || isGeneratingPortrait) return;

    setIsGeneratingPortrait(true);
    try {
      const equippedItems = camp.player.inventory
        .filter((i) => i.equipped)
        .map((i) => i.name);
      const res = await requestPortraitIllustration(
        camp.world,
        {
          name: camp.player.name,
          occupation: camp.player.occupation,
          traits: camp.player.traits,
          equippedItems,
        },
        settings,
        apiHealth,
      );
      const latest = activeCampaignRef.current;
      if (latest && latest.id === camp.id) {
        persistActiveCampaign({
          ...latest,
          player: {
            ...latest.player,
            portraitUrl: res.dataUrl,
            portraitEngine: res.engineUsed,
          },
        });
        pushToast('info', `Retrato atualizado: ${camp.player.name}`);
      }
    } catch (err) {
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Falha ao gerar retrato.',
      );
    } finally {
      setIsGeneratingPortrait(false);
    }
  }, [apiHealth, isGeneratingPortrait, persistActiveCampaign, pushToast, settings]);

  const handleStartForgedCampaign = async (draft: Campaign) => {
    stopSpeechPlayback();
    setUndoStack([]);
    setLastTurnMeta(null);
    setIsBusy(true);
    setActiveCampaign(draft);
    setPreviewTheme(draft.world.primaryTheme);
    setView('stage');
    setPulseSecondsLeft(settings.livingWorldSeconds);
    setPulsePaused(false);
    triggerChapterBanner(
      'Prólogo · Crônica do Mundo',
      draft.world.title,
      draft.world.era,
    );

    try {
      const response = await requestStoryStart(draft, settings, apiHealth);
      const { nextPlayer, deltas: playerDeltas } = applyStateChanges(
        draft.player,
        response.stateChanges,
      );
      const { nextCodex, deltas: codexDeltas } = applyCodexChanges(
        draft.codex,
        response.location,
        0,
        response.stateChanges,
      );
      const allDeltas = [...playerDeltas, ...codexDeltas];
      const nextActions = toTacticalActions(response.actions);

      const prologueText =
        response.worldPrologue?.trim() || draft.world.history || draft.world.premise;

      const prologueEntry: StoryEntry = {
        id: `entry_prologue_${Date.now()}`,
        role: 'prologue',
        turn: 0,
        chapter: 0,
        sceneTitle: `Prólogo · ${draft.world.title}`,
        location: draft.world.era,
        mood: draft.world.tone,
        text: prologueText,
        timestamp: Date.now() - 500,
      };

      const openingEntry: StoryEntry = {
        id: `entry_${Date.now()}`,
        role: 'narrator',
        turn: 0,
        chapter: 1,
        sceneTitle: response.sceneTitle,
        location: response.location,
        mood: response.mood,
        text: response.narration,
        beats: response.beats,
        deltas: allDeltas,
        timestamp: Date.now(),
      };

      const readyCampaign: Campaign = {
        ...draft,
        currentLocation: response.location,
        currentMood: response.mood,
        player: nextPlayer,
        codex: nextCodex,
        status: 'active',
        arcNumber: 1,
        eraSummaries: [],
        actions: nextActions,
        entries: [prologueEntry, openingEntry],
        interactionId: response.interactionId,
        engineUsed: response.engineUsed,
      };

      persistActiveCampaign(readyCampaign);

      for (const d of allDeltas.slice(0, 3)) {
        pushToast(d.kind, d.label);
      }

      if (settings.autoIllustrateScenes) {
        void handleIllustrateEntry(prologueEntry.id, readyCampaign);
      }
    } catch (err) {
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Erro ao iniciar a crônica.',
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handlePlayInstantDemo = () => {
    stopSpeechPlayback();
    setUndoStack([]);
    setLastTurnMeta(null);
    const demo = ensureCampaignTimeline(
      createInstantDemoCampaign(settings.language),
    );
    const originNode = demo.timeline?.nodes[0];
    if (originNode) {
      originNode.hasSnapshot = true;
      void saveTimelineSnapshotAsync(
        buildCleanTimelineSnapshot(demo, originNode.id),
      );
    }
    persistActiveCampaign(demo);
    setPreviewTheme(demo.world.primaryTheme);
    setPulseSecondsLeft(settings.livingWorldSeconds);
    setPulsePaused(false);
    setView('stage');
    triggerChapterBanner(
      'Prólogo · Crônica do Mundo',
      demo.world.title,
      demo.world.era,
    );
    pushToast('save', `Crônica aberta: ${demo.world.title}`);
  };

  const handleStartFreeformStory = (
    difficulty: DifficultyId,
    theme: WorldThemeId,
  ) => {
    const now = Date.now();
    const lang = settings.language;
    updateSettings({ difficulty });

    const openingText =
      lang === 'en'
        ? 'Welcome to MYTHOS Freeform Mode (No Limits). There is no pre-written lore locking you in.\n\nTell me in your own words: what world, genre mix, era, and character do you want to play today? You can start days before an outbreak, inside a fantasy guild, in a modern city, or anywhere else—and we will build your world, bonds, dungeons, and progression together. (Tip: you also have +6 free BG3 Attribute Points waiting in your Character Sheet!)'
        : lang === 'fr'
          ? 'Bienvenue en Mode Histoire Libre (Sans Limites). Aucun lore figé ne vous retient.\n\nDécrivez librement le monde, le mélange de genres, l’époque et le personnage que vous souhaitez incarner — nous construirons votre aventure, vos liens et votre progression ensemble.'
          : 'Bem-vindo ao Modo História Livre (Sem Limites). Não existe nenhum lore pré-fabricado te prendendo aqui.\n\nMe conte do seu jeito: qual mundo, mistura de gêneros, época e personagem você quer viver hoje? Você pode começar uma semana antes de um colapso, num reino de fantasia com dungeons, numa cidade moderna ou em qualquer ideia sua — a ficha BG3, habilidades, dinheiro, vínculos e escolhas vão evoluir com você desde a primeira mensagem. (Dica: você já começa com +6 pontos livres de atributo para distribuir na Ficha!)';

    const starterActions: TacticalAction[] =
      lang === 'en'
        ? [
            {
              id: `ff_1_${now}`,
              label: 'Modern city, 1 week before a mysterious outbreak — I want to prepare, gather money, and protect someone close.',
              intent: 'survival',
              risk: 'safe',
              requiresRoll: false,
              attribute: 'wis',
              effectTag: 'Pre-Apocalypse',
            },
            {
              id: `ff_2_${now}`,
              label: 'Dark fantasy realm full of dungeons, guilds, magic training, and rival adventurers.',
              intent: 'bold',
              risk: 'safe',
              requiresRoll: false,
              attribute: 'str',
              effectTag: 'Dungeon RPG',
            },
            {
              id: `ff_3_${now}`,
              label: 'Neo-noir cyberpunk metropolis where I climb from street runner to syndicate legend.',
              intent: 'stealth',
              risk: 'safe',
              requiresRoll: false,
              attribute: 'dex',
              effectTag: 'Cyberpunk',
            },
            {
              id: `ff_4_${now}`,
              label: 'Grounded drama, intrigue, relationships, and hidden secrets in a normal city.',
              intent: 'diplomatic',
              risk: 'safe',
              requiresRoll: false,
              attribute: 'cha',
              effectTag: 'Bonds & Mystery',
            },
          ]
        : [
            {
              id: `ff_1_${now}`,
              label: 'Cidade moderna, 1 semana antes de um surto misterioso — quero me preparar, levantar dinheiro e proteger alguém próximo.',
              intent: 'survival',
              risk: 'safe',
              requiresRoll: false,
              attribute: 'wis',
              effectTag: 'Pré-Apocalipse',
            },
            {
              id: `ff_2_${now}`,
              label: 'Fantasia medieval com guildas, dungeons inexploradas, treino de habilidades e companheiros.',
              intent: 'bold',
              risk: 'safe',
              requiresRoll: false,
              attribute: 'str',
              effectTag: 'Dungeon RPG',
            },
            {
              id: `ff_3_${now}`,
              label: 'Metrópole cyberpunk onde começo do zero, faço contatos, hackeio corporações e subo na vida.',
              intent: 'stealth',
              risk: 'safe',
              requiresRoll: false,
              attribute: 'dex',
              effectTag: 'Cyberpunk',
            },
            {
              id: `ff_4_${now}`,
              label: 'Mistério urbano com foco em relacionamentos, escolhas morais, segredos e investigação livre.',
              intent: 'diplomatic',
              risk: 'safe',
              requiresRoll: false,
              attribute: 'cha',
              effectTag: 'Vínculos',
            },
          ];

    const freeformAttrs = { ...DEFAULT_ATTRIBUTES };
    const freeformDnd = buildDnd5eSheetFromConfig({
      classId: 'fighter',
      speciesId: 'human',
      backgroundId: 'wayfarer',
      level: 1,
      attributes: freeformAttrs,
    });
    const freeformMaxHp = computeMaxHpForRuleset('dnd5e_2024', {
      level: 1,
      attributes: freeformAttrs,
      inventory: [],
      dnd: freeformDnd,
    } as unknown as PlayerState);

    const freeformCampaign: Campaign = {
      id: `camp_free_${now}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now,
      updatedAt: now,
      ruleset: 'dnd5e_2024',
      progressionMode: 'xp',
      freeformMode: true,
      world: {
        title: lang === 'en' ? 'New Freeform Chronicle' : 'Nova História Livre',
        primaryTheme: theme,
        genres: [lang === 'en' ? 'Freeform' : 'Livre'],
        tone: lang === 'en' ? 'Adaptive' : 'Adaptativo',
        era: lang === 'en' ? 'Defined in Session Zero' : 'Definida na conversa',
        history:
          lang === 'en'
            ? 'Open canvas shaped collaboratively by the player from turn one.'
            : 'Tela em branco moldada em colaboração com o jogador desde a primeira mensagem.',
        worldLaws: '',
        premise: '',
        storyPace: 'endless',
        matureMode: true,
      },
      player: {
        name: lang === 'en' ? 'Protagonist' : 'Protagonista',
        age: 25,
        occupation: lang === 'en' ? 'To be defined' : 'A definir na história',
        level: 1,
        xp: 0,
        xpToNextLevel: getXpDeltaForRuleset(1, 'dnd5e_2024'),
        attributePoints: 0,
        attributes: freeformAttrs,
        vigor: freeformMaxHp,
        maxVigor: freeformMaxHp,
        tension: 10,
        inspiration: 1,
        traits: [],
        skills: [],
        skillLevels: [],
        talents: [],
        dnd: freeformDnd,
        currency: defaultCurrencyForTheme(theme, lang),
        inventory: [],
        quests: [],
        journal: [],
      },
      codex: {
        npcs: [],
        locations: [],
        factions: [],
        canonFacts: [],
      },
      status: 'active',
      arcNumber: 1,
      eraSummaries: [],
      difficulty,
      language: lang,
      currentChapter: 1,
      currentLocation: lang === 'en' ? 'Session Zero' : 'Sessão Zero',
      currentMood: lang === 'en' ? 'Open Horizon' : 'Horizonte Aberto',
      turnCount: 0,
      journalEntryCount: 0,
      entries: [
        {
          id: `entry_free_open_${now}`,
          role: 'narrator',
          turn: 0,
          chapter: 1,
          sceneTitle:
            lang === 'en'
              ? 'Session Zero · Craft Your Story'
              : 'Sessão Zero · Sua História Sem Limites',
          location: lang === 'en' ? 'Open Canvas' : 'Início Livre',
          mood: lang === 'en' ? 'Collaborative' : 'Colaborativo',
          text: openingText,
          timestamp: now,
        },
      ],
      actions: starterActions,
      worldClock: defaultWorldClockForTheme(theme, lang),
      stronghold: defaultStrongholdForTheme(
        theme,
        lang === 'en' ? 'Initial Refuge' : 'Refúgio Inicial',
        lang,
      ),
      engineUsed: shouldUseGemini(settings, apiHealth) ? 'gemini' : 'demo',
    };

    const seededFreeform = ensureCampaignTimeline(freeformCampaign);
    const originNode = seededFreeform.timeline?.nodes[0];
    if (originNode) {
      originNode.hasSnapshot = true;
      void saveTimelineSnapshotAsync(
        buildCleanTimelineSnapshot(seededFreeform, originNode.id),
      );
    }

    stopSpeechPlayback();
    setUndoStack([]);
    setLastTurnMeta(null);
    persistActiveCampaign(seededFreeform);
    setPreviewTheme(theme);
    setPulseSecondsLeft(settings.livingWorldSeconds);
    setPulsePaused(false);
    setView('stage');
    triggerChapterBanner(
      'Sessão Zero · História Livre',
      freeformCampaign.world.title,
      'Escreva sua ideia ou escolha uma semente abaixo',
    );
  };

  const handleOpenCampaign = (camp: Campaign) => {
    cancelActiveTurnRequest();
    stopSpeechPlayback();
    setIsBusy(false);
    setUndoStack([]);
    setLastTurnMeta(null);
    setSuggestedClash(null);
    activeCampaignRef.current = camp;
    setActiveCampaign(camp);
    setPreviewTheme(camp.world.primaryTheme);
    setPulseSecondsLeft(settings.livingWorldSeconds);
    setPulsePaused(false);
    setView('stage');
  };

  const handleQrCampaignReceived = (received: Campaign, openImmediately: boolean) => {
    void saveCampaignAsync(received).then((updated) => {
      setCampaigns(updated);
      if (openImmediately) {
        handleOpenCampaign(received);
        pushToast('save', `Crônica recebida e aberta: ${received.world.title}`);
      } else {
        pushToast('save', `Crônica recebida e salva na estante: ${received.world.title}`);
      }
    });
  };

  const recordTimelineCheckpoint = useCallback(
    (
      camp: Campaign,
      opts: {
        kind?: TimelineNodeKind;
        title: string;
        choiceSummary?: string;
        deltas?: StateDelta[];
      },
    ): Campaign => {
      const { nextCampaign, node, keepSnapshotIds } = appendTimelineNode(camp, {
        ...opts,
        hasSnapshot: true,
      });
      const snapshotRecord = buildCleanTimelineSnapshot(nextCampaign, node.id);
      void saveTimelineSnapshotAsync(snapshotRecord).then(() =>
        pruneTimelineSnapshotsAsync(nextCampaign.id, keepSnapshotIds),
      );
      return nextCampaign;
    },
    [],
  );

  const handleBranchFromTimelineNode = async (params: {
    sourceCampaignId: string;
    node: TimelineBranchPoint;
    branchName: string;
    branchColor: string;
  }) => {
    const source =
      (activeCampaignRef.current?.id === params.sourceCampaignId
        ? activeCampaignRef.current
        : campaigns.find((c) => c.id === params.sourceCampaignId)) ??
      activeCampaignRef.current;
    if (!source) return;

    const snapRecord = params.node.hasSnapshot
      ? await loadTimelineSnapshotAsync(params.node.id)
      : null;

    const { branchedCampaign, rootNode, usedExactSnapshot } =
      createBranchedCampaign({
        sourceCampaign: source,
        targetNode: params.node,
        exactSnapshot: snapRecord?.snapshot ?? null,
        branchName: params.branchName,
        branchColor: params.branchColor,
      });

    await saveTimelineSnapshotAsync(
      buildCleanTimelineSnapshot(branchedCampaign, rootNode.id),
    );
    const updatedList = await saveCampaignAsync(branchedCampaign);
    setCampaigns(updatedList);
    handleOpenCampaign(branchedCampaign);
    triggerChapterBanner(
      'Nova Linha Temporal · E Se?',
      branchedCampaign.timeline?.branchName || params.branchName,
      usedExactSnapshot
        ? `Ramificação exata a partir do Turno ${params.node.turn}`
        : `Ramificação retroativa a partir do Turno ${params.node.turn}`,
    );
    pushToast(
      'save',
      `Linha temporal "${params.branchName}" criada! Original preservada.`,
    );
  };

  const handleCreateManualTimelineMark = (label: string) => {
    const current = activeCampaignRef.current;
    if (!current) return;
    const withMark = recordTimelineCheckpoint(current, {
      kind: 'manual_mark',
      title: label,
      choiceSummary: `Marco manual salvo em ${current.currentLocation} (Turno ${current.turnCount})`,
    });
    persistActiveCampaign(withMark);
    pushToast('save', `Marco salvo na Árvore: ${label}`);
  };

  const handleSwitchTimelineCampaign = (campaignId: string) => {
    const target = campaigns.find((c) => c.id === campaignId);
    if (!target) return;
    handleOpenCampaign(target);
    pushToast(
      'info',
      `Alternado para: ${target.timeline?.branchName || target.world.title}`,
    );
  };

  const handleStartInteractiveTour = useCallback(() => {
    setSettingsOpen(false);
    setSavesOpen(false);
    setTimelineOpen(false);
    setMobileLeftRailOpen(false);
    setMobileRightHudOpen(false);

    if (activeCampaignRef.current) {
      setFocusMode(false);
      setLeftRailMode('compact');
      setView('stage');
      window.setTimeout(() => setTourOpen(true), 180);
      return;
    }

    if (campaigns.length > 0) {
      handleOpenCampaign(campaigns[0]);
      setFocusMode(false);
      setLeftRailMode('compact');
      window.setTimeout(() => setTourOpen(true), 220);
      return;
    }

    // Create a clean demo campaign so first-time visitors can learn on the real live stage
    const demo = ensureCampaignTimeline(
      createInstantDemoCampaign(settings.language),
    );
    const originNode = demo.timeline?.nodes[0];
    if (originNode) {
      originNode.hasSnapshot = true;
      void saveTimelineSnapshotAsync(
        buildCleanTimelineSnapshot(demo, originNode.id),
      );
    }
    stopSpeechPlayback();
    setUndoStack([]);
    setLastTurnMeta(null);
    persistActiveCampaign(demo);
    setPreviewTheme(demo.world.primaryTheme);
    setPulseSecondsLeft(settings.livingWorldSeconds);
    setPulsePaused(false);
    setFocusMode(false);
    setLeftRailMode('compact');
    setView('stage');
    window.setTimeout(() => setTourOpen(true), 240);
  }, [campaigns, settings.language, settings.difficulty, settings.livingWorldSeconds]);

  const handlePrepareTourStep = useCallback((step: TourStep) => {
    if (step.ensureMobileDrawer === 'close_all') {
      setMobileLeftRailOpen(false);
      setMobileRightHudOpen(false);
    } else if (step.ensureMobileDrawer === 'open_left') {
      setMobileRightHudOpen(false);
      setMobileLeftRailOpen(true);
    }
  }, []);

  const handleCloseTour = useCallback(
    (completed: boolean) => {
      setTourOpen(false);
      try {
        localStorage.setItem('mythos_tour_completed_v1', '1');
      } catch {
        // ignore
      }
      if (completed) {
        pushToast('save', 'Tour concluído! Agora o mundo é todo seu.');
      }
    },
    [pushToast],
  );

  const triggerWorldEvent = async (opts?: {
    campaignOverride?: Campaign;
    lastActionText?: string;
    suggestedCategory?: WorldEventCategory;
    triggerReason?: string;
    openImmediately?: boolean;
  }) => {
    const camp = opts?.campaignOverride ?? activeCampaignRef.current;
    if (!camp || isGeneratingEvent || camp.status !== 'active') return;
    setIsGeneratingEvent(true);
    try {
      const res = await requestWorldEvent(camp, settings, apiHealth, {
        lastActionText: opts?.lastActionText,
        suggestedCategory: opts?.suggestedCategory,
        triggerReason: opts?.triggerReason,
      });
      const latest = activeCampaignRef.current;
      if (!latest || latest.id !== camp.id) return;

      const clock = latest.worldClock;
      const eventRecord: WorldEventRecord = {
        id: `ev_${Date.now()}`,
        title: res.title,
        category: res.category,
        urgency: res.urgency,
        description: res.description,
        companionReaction: res.companionReaction,
        choices: res.choices.map((c, idx) => ({
          ...c,
          id: `evc_${Date.now()}_${idx}`,
        })),
        triggerTurn: latest.turnCount,
        dayTriggered: clock?.day ?? 1,
        timeTriggered: formatClockTime(clock?.hour ?? 8, clock?.minute ?? 30),
        triggerReason: opts?.triggerReason,
      };

      persistActiveCampaign({
        ...latest,
        activeWorldEvent: eventRecord,
        lastWorldEventTurn: latest.turnCount,
      });

      setFocusEventNonce((n) => n + 1);
      pushToast('crisis', `⚡ Evento no Mundo: ${eventRecord.title}`);
    } catch (err) {
      if (opts?.openImmediately) {
        pushToast(
          'error',
          err instanceof Error ? err.message : 'Falha ao gerar evento do mundo.',
        );
      }
    } finally {
      setIsGeneratingEvent(false);
    }
  };

  const executeStoryTurn = async (
    baseCamp: Campaign,
    actionText: string,
    intent: ActionIntent,
    risk: ActionRisk,
    requiresRoll: boolean | undefined,
    isDirection: boolean,
    forcedAttribute: AttributeId | undefined,
    options?: {
      precomputedDiceRoll?: DiceRollResult;
      pushToUndoStack?: boolean;
      extraPromptNote?: string;
      skipStoryteller?: boolean;
      forceReplace?: boolean;
      clashAction?: ClashActionPayload;
      precomputedClashResolution?: ClashRoundResolution;
    },
  ) => {
    // Synchronous mutex prevents double-fire / duplicate AI responses overwriting each other
    if (isTurnInFlightRef.current && !options?.forceReplace) {
      return;
    }
    if (turnAbortRef.current) {
      turnAbortRef.current.abort();
      turnAbortRef.current = null;
    }
    const mySeq = ++turnSeqRef.current;
    const abortController = new AbortController();
    turnAbortRef.current = abortController;
    isTurnInFlightRef.current = true;

    const activeClashBefore = baseCamp.activeClash;
    const isRoundClash =
      activeClashBefore?.status === 'active' && !isDirection;

    const crisisMode =
      !isRoundClash && baseCamp.status === 'crisis_tension'
        ? 'breaking_point'
        : undefined;

    const cleanVisibleText = actionText
      .replace(/^\[DIREÇÃO DO AUTOR\]:\s*/i, '')
      .trim();

    let diceRoll = options?.precomputedDiceRoll;
    if (!diceRoll && !isDirection) {
      const baseAttr =
        forcedAttribute ??
        options?.clashAction?.attribute ??
        inferActionAttribute(actionText, intent);

      if (isRoundClash && activeClashBefore) {
        const clashHints = buildClashRollModifiers(
          baseCamp,
          activeClashBefore,
          options?.clashAction,
          baseAttr,
        );
        const partyHelper = findPartyAdvantage(
          clashHints.attribute,
          baseCamp.codex.npcs,
        );
        const effectiveAttrs = getEffectiveAttributes(baseCamp.player);
        const resolvedRollMode =
          clashHints.grantAdvantage || partyHelper ? 'advantage' : 'normal';
        const resolvedSource =
          clashHints.advantageSource ?? partyHelper?.name;

        const forceClashRoll =
          options?.clashAction?.kind !== 'reposition' &&
          options?.clashAction?.kind !== 'guild_support';

        diceRoll = resolveFateCheck(
          actionText,
          intent,
          risk === 'safe' ? 'medium' : risk,
          baseCamp.difficulty,
          baseCamp.player.skills,
          forceClashRoll ? true : requiresRoll,
          baseCamp.player.tension,
          {
            attributes: effectiveAttrs,
            skillLevels: baseCamp.player.skillLevels,
            forcedAttribute: clashHints.attribute,
            rollMode: resolvedRollMode,
            advantageSource: resolvedSource,
            opposedLabel: clashHints.opposedLabel,
            dcOverride: clashHints.dcOverride,
            weatherType: baseCamp.worldClock?.weatherType,
          },
        );
      } else {
        const opposedNpc = detectOpposedNpc(actionText, baseCamp.codex.npcs);
        const opposed = opposedNpc
          ? evaluateOpposedContest(baseCamp.player, opposedNpc, baseAttr, actionText)
          : undefined;
        const partyHelper = findPartyAdvantage(
          baseAttr,
          baseCamp.codex.npcs,
          opposedNpc?.id,
        );
        const effectiveAttrs = isUnarmedContest(actionText)
          ? baseCamp.player.attributes
          : getEffectiveAttributes(baseCamp.player);

        // BG3 rule: Advantage and Disadvantage cancel each other to Normal
        const resolvedRollMode =
          opposed?.disadvantage && partyHelper
            ? 'normal'
            : opposed?.disadvantage
              ? 'disadvantage'
              : partyHelper
                ? 'advantage'
                : 'normal';
        const resolvedSource =
          resolvedRollMode === 'disadvantage'
            ? opposed?.disadvantageSource
            : resolvedRollMode === 'advantage'
              ? partyHelper?.name
              : undefined;

        diceRoll = resolveFateCheck(
          actionText,
          intent,
          risk,
          baseCamp.difficulty,
          baseCamp.player.skills,
          requiresRoll,
          baseCamp.player.tension,
          {
            ruleset: baseCamp.ruleset,
            player: baseCamp.player,
            attributes: effectiveAttrs,
            skillLevels: baseCamp.player.skillLevels,
            forcedAttribute: baseAttr,
            rollMode: resolvedRollMode,
            advantageSource: resolvedSource,
            opposedLabel: opposed?.opposedLabel,
            dcOverride: opposed?.opposedDc,
            weatherType: baseCamp.worldClock?.weatherType,
          },
        );
      }
    }

    if (settings.diceAnimations && diceRoll) {
      setActiveDiceRoll(diceRoll);
    }

    const preTurnSnapshot = structuredClone(baseCamp);
    if (options?.pushToUndoStack !== false) {
      setUndoStack((prev) => [...prev.slice(-4), preTurnSnapshot]);
    }

    // Deterministic Tactical Clash resolution (AFTER preTurnSnapshot so Undo/Reroll stay pure!)
    const clashResolution: ClashRoundResolution | undefined =
      isRoundClash && activeClashBefore
        ? options?.precomputedClashResolution ??
          resolveClashRound({
            campaign: baseCamp,
            clash: activeClashBefore,
            actionText: cleanVisibleText || actionText,
            clashAction: options?.clashAction,
            diceRoll,
          })
        : undefined;

    setLastTurnMeta({
      preTurnSnapshot,
      actionText,
      intent,
      risk,
      requiresRoll,
      isDirection,
      forcedAttribute,
      diceRoll,
      clashAction: options?.clashAction,
      clashResolution,
    });

    const nextTurn = baseCamp.turnCount + 1;

    const playerEntry: StoryEntry = {
      id: `entry_p_${Date.now()}`,
      role: 'player',
      turn: nextTurn,
      text: cleanVisibleText || actionText,
      diceRoll,
      isDirection,
      timestamp: Date.now(),
    };

    const optimisticCampaign: Campaign = {
      ...baseCamp,
      turnCount: nextTurn,
      entries: [...baseCamp.entries, playerEntry],
    };

    activeCampaignRef.current = optimisticCampaign;
    setActiveCampaign(optimisticCampaign);
    setIsBusy(true);
    setPulseSecondsLeft(settings.livingWorldSeconds);
    if (isRoundClash) {
      setSuggestedClash(null);
    }

    try {
      const aiActionInput = options?.extraPromptNote
        ? `${actionText}\n\n${options.extraPromptNote}`
        : actionText;

      const response = await requestStoryTurn(
        optimisticCampaign,
        aiActionInput,
        diceRoll,
        settings,
        apiHealth,
        crisisMode,
        abortController.signal,
        clashResolution?.promptDigest,
      );

      // Discard stale/superseded response (e.g. after Inspiration Reroll, Undo, or campaign switch)
      if (mySeq !== turnSeqRef.current) {
        return;
      }

      const hasTrainingStation = Boolean(
        optimisticCampaign.stronghold?.upgrades.some((u) => u.id === 'training'),
      );

      const rawPendingSave =
        isDndRuleset(optimisticCampaign) &&
        !clashResolution &&
        response.stateChanges?.pendingSavingThrow &&
        response.stateChanges.pendingSavingThrow.ability &&
        typeof response.stateChanges.pendingSavingThrow.dc === 'number'
          ? {
              id: `save_${Date.now()}`,
              ability: response.stateChanges.pendingSavingThrow.ability,
              dc: Math.max(5, Math.min(30, Math.round(response.stateChanges.pendingSavingThrow.dc))),
              reason:
                String(response.stateChanges.pendingSavingThrow.reason || 'Perigo na Cena').trim(),
              failDamageDice: response.stateChanges.pendingSavingThrow.failDamageDice,
              halfOnSuccess: Boolean(response.stateChanges.pendingSavingThrow.halfOnSuccess),
              failCondition: response.stateChanges.pendingSavingThrow.failCondition,
              sourceTurn: nextTurn,
            }
          : null;

      // Single source of truth during Tactical Clash or Pending Saving Throw: zero out AI vigorDelta to prevent double damage!
      const mergedChanges = {
        ...response.stateChanges,
        vigorDelta: clashResolution
          ? clashResolution.playerVigorDelta
          : rawPendingSave
            ? 0
            : response.stateChanges?.vigorDelta,
        tensionDelta: clashResolution
          ? clashResolution.playerTensionDelta
          : response.stateChanges?.tensionDelta,
        xpGain: clashResolution
          ? Math.max(response.stateChanges?.xpGain ?? 0, clashResolution.xpBonus)
          : response.stateChanges?.xpGain,
        inspirationGain:
          (response.stateChanges?.inspirationGain ?? 0) +
          (diceRoll?.outcome === 'critical_success' ? 1 : 0),
      };

      const {
        nextPlayer,
        deltas: playerDeltas,
        worldIdentityPatch,
      } = applyStateChanges(
        optimisticCampaign.player,
        mergedChanges,
        nextTurn,
        { hasTrainingStation, ruleset: optimisticCampaign.ruleset },
      );
      const resolvedLocation =
        response.location || optimisticCampaign.currentLocation;
      const { nextCodex, deltas: codexDeltas } = applyCodexChanges(
        optimisticCampaign.codex,
        resolvedLocation,
        nextTurn,
        response.stateChanges,
        optimisticCampaign.ruleset,
      );

      const extraDeltas: StateDelta[] = [];

      // Advance Living World Clock respecting the player's chosen advanceMode
      let nextClock =
        optimisticCampaign.worldClock ??
        defaultWorldClockForTheme(
          optimisticCampaign.world.primaryTheme,
          optimisticCampaign.language,
        );
      const advanceMode = nextClock.advanceMode ?? 'ai_auto';
      const at = response.stateChanges?.advanceTime;
      const prevWeather = nextClock.weatherType;

      let minutesElapsed = 0;
      if (clashResolution) {
        minutesElapsed = 1; // 1 tactical minute per clash round (prevents day rollover / org upkeep mid-fight)
      } else if (advanceMode === 'fixed_step') {
        minutesElapsed = nextClock.fixedStepMinutes ?? 15;
      } else if (advanceMode === 'ai_auto') {
        if (typeof at?.minutes === 'number' && at.minutes >= 0) {
          minutesElapsed = Math.min(720, Math.round(at.minutes));
        } else if (typeof at?.periods === 'number' && at.periods > 0) {
          minutesElapsed = Math.min(720, Math.round(at.periods) * 180);
        } else {
          minutesElapsed = 10; // realistic short beat by default (no abrupt period jumps!)
        }
      }

      if (
        minutesElapsed > 0 ||
        at?.weather ||
        at?.weatherType ||
        at?.setCountdown ||
        typeof at?.countdownDelta === 'number'
      ) {
        nextClock = advanceClockByMinutes(nextClock, minutesElapsed, {
          weather: at?.weather,
          weatherType: at?.weatherType,
          countdownDelta: at?.countdownDelta,
          setCountdown: at?.setCountdown,
          lang: optimisticCampaign.language,
        });
        if (minutesElapsed >= 60 || at?.setCountdown) {
          extraDeltas.push({
            kind: 'time',
            label: `Dia ${nextClock.day} · ${formatClockTime(nextClock.hour, nextClock.minute)}`,
            positive: true,
          });
        }
        if (nextClock.weatherType && nextClock.weatherType !== prevWeather) {
          extraDeltas.push({
            kind: 'time',
            label: `Clima: ${nextClock.weather}`,
            positive: true,
          });
        }
      }

      // Stronghold narrative upgrade
      let nextStronghold =
        optimisticCampaign.stronghold ??
        defaultStrongholdForTheme(
          optimisticCampaign.world.primaryTheme,
          resolvedLocation,
          optimisticCampaign.language,
        );
      if (response.stateChanges?.addBaseUpgrade?.name?.trim()) {
        const up = response.stateChanges.addBaseUpgrade;
        const alreadyExists = nextStronghold.upgrades.some(
          (u) => u.name.toLowerCase() === up.name.trim().toLowerCase(),
        );
        if (!alreadyExists) {
          nextStronghold = {
            ...nextStronghold,
            defense: nextStronghold.defense + 10,
            upgrades: [
              ...nextStronghold.upgrades,
              {
                id: `up_ai_${Date.now()}`,
                name: up.name.trim(),
                description: up.description?.trim() || '',
                bonus: up.bonus?.trim() || '+10 Defesa',
                builtTurn: nextTurn,
              },
            ],
          };
          extraDeltas.push({
            kind: 'base',
            label: `Refúgio: +${up.name.trim()}`,
            positive: true,
          });
        }
      }

      // Base Strategic Supplies delta
      if (response.stateChanges?.supplyDeltas) {
        const baseSupplies = {
          ...(nextStronghold.supplies ??
            defaultBaseSuppliesForTheme(optimisticCampaign.world.primaryTheme)),
        };
        const supMeta = getSupplyMetaForTheme(optimisticCampaign.world.primaryTheme);
        let changed = false;
        for (const k of SUPPLY_KEYS) {
          const delta = response.stateChanges.supplyDeltas[k];
          if (typeof delta === 'number' && delta !== 0) {
            const rounded = Math.round(delta);
            baseSupplies[k] = Math.max(0, (baseSupplies[k] ?? 0) + rounded);
            changed = true;
            extraDeltas.push({
              kind: 'base',
              label: `${rounded > 0 ? '+' : ''}${rounded} ${supMeta[k].label}`,
              positive: rounded > 0,
            });
          }
        }
        if (changed) {
          nextStronghold = { ...nextStronghold, supplies: baseSupplies };
        }
      }

      // Garage / Vehicle upsert
      if (response.stateChanges?.upsertVehicle?.name?.trim()) {
        const uv = response.stateChanges.upsertVehicle;
        const currentVehicles = [...(nextStronghold.vehicles ?? [])];
        const existingIdx = currentVehicles.findIndex(
          (v) => v.name.toLowerCase() === uv.name.trim().toLowerCase(),
        );
        if (existingIdx >= 0) {
          const prevV = currentVehicles[existingIdx];
          currentVehicles[existingIdx] = {
            ...prevV,
            kind: uv.kind?.trim() || prevV.kind,
            fuel: Math.max(
              0,
              Math.min(100, prevV.fuel + Math.round(uv.fuelDelta ?? 0)),
            ),
            condition: Math.max(
              0,
              Math.min(100, prevV.condition + Math.round(uv.conditionDelta ?? 0)),
            ),
            note: uv.note?.trim() || prevV.note,
          };
        } else {
          currentVehicles.push({
            id: `veh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: uv.name.trim(),
            kind: uv.kind?.trim() || 'Veículo / Transporte',
            fuel: Math.max(
              0,
              Math.min(100, 80 + Math.round(uv.fuelDelta ?? 0)),
            ),
            condition: Math.max(
              0,
              Math.min(100, 100 + Math.round(uv.conditionDelta ?? 0)),
            ),
            note: uv.note?.trim(),
          });
          extraDeltas.push({
            kind: 'base',
            label: `Garagem: ${uv.name.trim()}`,
            positive: true,
          });
        }
        nextStronghold = { ...nextStronghold, vehicles: currentVehicles };
      }

      // MYTHOS 9.0 — Organization progression, squad operation timers & daily upkeep
      let nextOrganization = optimisticCampaign.organization;
      let finalPlayer = nextPlayer;
      let finalCodex = nextCodex;
      const readyOrgOpTitles: string[] = [];

      if (nextOrganization) {
        const adv = advanceOrgOperations(
          nextOrganization,
          Math.max(0.25, minutesElapsed / 60),
          1,
        );
        nextOrganization = adv.nextOrg;
        readyOrgOpTitles.push(...adv.newlyReadyTitles);

        // Apply optional narrative org stateChanges from Gemini
        const sc = response.stateChanges;
        if (
          typeof sc?.orgMoraleDelta === 'number' ||
          typeof sc?.orgHeatDelta === 'number' ||
          typeof sc?.orgRenownGain === 'number'
        ) {
          const nextRenown = Math.max(
            0,
            nextOrganization.renown + Math.round(sc.orgRenownGain ?? 0),
          );
          const { tier } = computeOrgTierFromRenown(nextRenown);
          nextOrganization = {
            ...nextOrganization,
            renown: nextRenown,
            tier,
            morale: Math.max(
              0,
              Math.min(
                100,
                nextOrganization.morale + Math.round(sc.orgMoraleDelta ?? 0),
              ),
            ),
            heat: Math.max(
              0,
              Math.min(
                100,
                nextOrganization.heat + Math.round(sc.orgHeatDelta ?? 0),
              ),
            ),
          };
        }

        if (sc?.recruitNpcToOrg?.name?.trim()) {
          const targetLower = sc.recruitNpcToOrg.name.trim().toLowerCase();
          finalCodex = {
            ...finalCodex,
            npcs: finalCodex.npcs.map((n) =>
              n.name.toLowerCase() === targetLower
                ? {
                    ...n,
                    orgMember: true,
                    orgRank: sc.recruitNpcToOrg?.rank ?? n.orgRank ?? 'member',
                    orgDivision:
                      sc.recruitNpcToOrg?.division ?? n.orgDivision ?? 'reserve',
                    orgDuty: n.inParty ? ('in_party' as const) : ('available' as const),
                    dailyWage: sc.recruitNpcToOrg?.dailyWage ?? n.dailyWage ?? 0,
                  }
                : n,
            ),
          };
          extraDeltas.push({
            kind: 'faction',
            label: `${sc.recruitNpcToOrg.name.trim()} entrou na organização`,
            positive: true,
          });
        }

        // Daily Organization Upkeep when the world clock turns to a new day (never mid-clash!)
        if (!clashResolution && nextClock.day > (nextOrganization.lastUpkeepDay ?? 1)) {
          const baseSupplies =
            nextStronghold.supplies ??
            defaultBaseSuppliesForTheme(optimisticCampaign.world.primaryTheme);
          const upkeep = processDailyOrgUpkeep(
            nextOrganization,
            finalCodex.npcs,
            baseSupplies,
            finalPlayer.currency?.amount ?? 0,
            finalCodex.factions,
            nextClock.day,
            nextTurn,
          );
          nextOrganization = upkeep.nextOrg;
          finalCodex = { ...finalCodex, npcs: upkeep.nextNpcs };
          nextStronghold = { ...nextStronghold, supplies: upkeep.nextSupplies };
          finalPlayer = {
            ...finalPlayer,
            currency: {
              ...finalPlayer.currency,
              amount: upkeep.nextCurrencyAmount,
            },
          };
          extraDeltas.push({
            kind: upkeep.shortageWarning ? 'crisis' : 'base',
            label: upkeep.shortageWarning
              ? `Organização: ${upkeep.shortageWarning}`
              : `Balanço Dia ${nextClock.day} (${nextOrganization.name})`,
            positive: !upkeep.shortageWarning,
          });
        }

        for (const opTitle of readyOrgOpTitles) {
          extraDeltas.push({
            kind: 'quest',
            label: `Esquadrão retornou: ${opTitle}`,
            positive: true,
          });
        }
      }

      // MYTHOS 11.0 — Apply deterministic Tactical Clash side-effects (ally vigor, affinity, supplies, org morale)
      if (clashResolution) {
        if (clashResolution.allyVigorUpdates.length > 0) {
          const updateMap = new Map(
            clashResolution.allyVigorUpdates.map((u) => [u.npcId, u]),
          );
          finalCodex = {
            ...finalCodex,
            npcs: finalCodex.npcs.map((n) => {
              const u = updateMap.get(n.id);
              if (!u) return n;
              const nextAff =
                clashResolution.affinityBonus > 0
                  ? Math.max(-100, Math.min(100, (n.affinity ?? 0) + clashResolution.affinityBonus))
                  : n.affinity;
              return {
                ...n,
                vigor: u.vigor,
                affinity: nextAff,
                relationship:
                  typeof nextAff === 'number'
                    ? deriveRelationshipFromAffinity(nextAff)
                    : n.relationship,
                injuryNote: u.downed
                  ? 'Ferido no confronto recente'
                  : n.injuryNote,
              };
            }),
          };
        }

        if (
          clashResolution.supplyChanges.ammo ||
          clashResolution.supplyChanges.materials
        ) {
          const baseSupplies =
            nextStronghold.supplies ??
            defaultBaseSuppliesForTheme(optimisticCampaign.world.primaryTheme);
          nextStronghold = {
            ...nextStronghold,
            supplies: {
              ...baseSupplies,
              ammo: Math.max(
                0,
                baseSupplies.ammo + (clashResolution.supplyChanges.ammo ?? 0),
              ),
              materials: Math.max(
                0,
                baseSupplies.materials +
                  (clashResolution.supplyChanges.materials ?? 0),
              ),
            },
          };
        }

        if (nextOrganization && clashResolution.orgMoraleDelta !== 0) {
          nextOrganization = {
            ...nextOrganization,
            morale: Math.max(
              0,
              Math.min(
                100,
                nextOrganization.morale + clashResolution.orgMoraleDelta,
              ),
            ),
          };
        }

        extraDeltas.push(...clashResolution.deltas);
      }

      const nextStatus = evaluateStatus(finalPlayer.vigor, finalPlayer.tension);
      const nextActions = toTacticalActions(response.actions);
      const allDeltas: StateDelta[] = [
        ...playerDeltas,
        ...codexDeltas,
        ...extraDeltas,
      ];

      if (nextStatus === 'crisis_vigor') {
        allDeltas.push({
          kind: 'crisis',
          label: 'Crise: Vigor Esgotado!',
          positive: false,
        });
      } else if (nextStatus === 'crisis_tension') {
        allDeltas.push({
          kind: 'crisis',
          label: 'Ponto de Ruptura: Tensão 100%!',
          positive: false,
        });
      }

      const narratorEntry: StoryEntry = {
        id: `entry_n_${Date.now()}`,
        role: 'narrator',
        turn: nextTurn,
        chapter: optimisticCampaign.currentChapter,
        sceneTitle: response.sceneTitle,
        location: resolvedLocation,
        mood: response.mood,
        text: response.narration,
        beats: response.beats,
        deltas: allDeltas,
        timestamp: Date.now(),
      };

      const resolvedActiveClash = clashResolution
        ? clashResolution.endedOutcome === 'active'
          ? clashResolution.nextClash
          : null
        : optimisticCampaign.activeClash ?? null;

      const completedCampaign: Campaign = recordTimelineCheckpoint(
        {
          ...optimisticCampaign,
          world: worldIdentityPatch
            ? { ...optimisticCampaign.world, ...worldIdentityPatch }
            : optimisticCampaign.world,
          currentLocation: resolvedLocation,
          currentMood: response.mood || optimisticCampaign.currentMood,
          worldClock: nextClock,
          stronghold: nextStronghold,
          organization: nextOrganization,
          player: finalPlayer,
          codex: finalCodex,
          status: nextStatus,
          actions: nextActions,
          entries: [...optimisticCampaign.entries, narratorEntry],
          activeClash: resolvedActiveClash,
          pendingSavingThrow: rawPendingSave,
          interactionId: response.interactionId ?? optimisticCampaign.interactionId,
          engineUsed: response.engineUsed,
        },
        {
          title:
            clashResolution && clashResolution.endedOutcome !== 'active'
              ? `${
                  clashResolution.endedOutcome === 'victory'
                    ? 'Vitória'
                    : clashResolution.endedOutcome === 'escaped'
                      ? 'Fuga'
                      : 'Revés'
                }: ${clashResolution.nextClash.title}`
              : response.sceneTitle || `Turno ${nextTurn}`,
          choiceSummary: cleanVisibleText,
          deltas: allDeltas,
        },
      );

      persistActiveCampaign(completedCampaign);

      if (clashResolution && clashResolution.endedOutcome !== 'active') {
        triggerChapterBanner(
          clashResolution.endedOutcome === 'victory'
            ? 'Confronto Vencido'
            : clashResolution.endedOutcome === 'escaped'
              ? 'Fuga Bem-Sucedida'
              : 'Confronto Encerrado',
          clashResolution.nextClash.title,
          clashResolution.xpBonus > 0
            ? `+${clashResolution.xpBonus} XP conquistado`
            : clashResolution.nextClash.stakes,
        );
      } else if (
        !clashResolution &&
        completedCampaign.activeClash?.status !== 'active' &&
        response.suggestedClash
      ) {
        setSuggestedClash(response.suggestedClash);
      } else if (!clashResolution) {
        setSuggestedClash(null);
      }

      const newLocationDiscovered = codexDeltas.some(
        (d) => d.kind === 'location',
      );
      if (newLocationDiscovered) {
        triggerChapterBanner(
          'Novo Local Descoberto',
          resolvedLocation,
          response.sceneTitle,
        );
        if (settings.autoIllustrateScenes) {
          void handleIllustrateEntry(narratorEntry.id, completedCampaign);
        }
      }

      for (const delta of allDeltas.slice(0, 3)) {
        pushToast(delta.kind, delta.label);
      }

      if (nextTurn > 0 && nextTurn % 5 === 0) {
        void runJournalCompressionIfNeeded(completedCampaign, false);
      }

      // Prompt LevelUpModal when D&D 5.2 level-up unlocks Subclass, ASI/Feat, or Epic Boon!
      if (
        finalPlayer.level > optimisticCampaign.player.level &&
        finalPlayer.dnd &&
        (finalPlayer.dnd.pendingSubclassChoice ||
          (finalPlayer.dnd.pendingAsiOrFeat ?? 0) > 0 ||
          finalPlayer.dnd.pendingEpicBoon)
      ) {
        setLevelUpModalOpen(true);
      }

      // AI Storyteller evaluation after non-direction turns (skip if a reactive Saving Throw is pending!)
      if (!isDirection && !options?.skipStoryteller && !rawPendingSave) {
        const dayChanged =
          (completedCampaign.worldClock?.day ?? 1) >
          (baseCamp.worldClock?.day ?? 1);
        const storytellerEval = evaluateStorytellerTrigger({
          campaign: completedCampaign,
          profile: settings.storytellerProfile ?? 'balanced',
          lastActionText: cleanVisibleText,
          dayChanged,
        });
        if (storytellerEval.shouldTrigger) {
          void triggerWorldEvent({
            campaignOverride: completedCampaign,
            lastActionText: cleanVisibleText,
            suggestedCategory: storytellerEval.suggestedCategory,
            triggerReason: storytellerEval.triggerReason,
          });
        }
      }
    } catch (err) {
      if (
        mySeq !== turnSeqRef.current ||
        (err instanceof DOMException && err.name === 'AbortError')
      ) {
        return;
      }
      activeCampaignRef.current = baseCamp;
      setActiveCampaign(baseCamp);
      setRestoredDraft({
        id: Date.now(),
        text: cleanVisibleText || actionText,
      });
      pushToast(
        'error',
        err instanceof Error
          ? `${err.message} (Mensagem restaurada na barra abaixo.)`
          : 'Falha ao gerar resposta — sua mensagem foi restaurada na barra abaixo.',
      );
    } finally {
      if (mySeq === turnSeqRef.current) {
        if (turnAbortRef.current === abortController) {
          turnAbortRef.current = null;
        }
        isTurnInFlightRef.current = false;
        setIsBusy(false);
      }
    }
  };

  const handleSendAction = async (
    actionText: string,
    intent: ActionIntent = 'bold',
    risk: ActionRisk = 'safe',
    requiresRoll?: boolean,
    isDirection = false,
    forcedAttribute?: AttributeId,
  ) => {
    const camp = activeCampaignRef.current;
    if (
      !camp ||
      isBusy ||
      isTurnInFlightRef.current ||
      camp.activeWorldEvent ||
      camp.pendingSavingThrow ||
      camp.activeClash?.status === 'active' ||
      camp.status === 'ended_fallen' ||
      camp.status === 'ended_victory'
    ) {
      return;
    }

    await executeStoryTurn(
      camp,
      actionText,
      intent,
      risk,
      requiresRoll,
      isDirection,
      forcedAttribute,
    );
  };

  const handleOpenOrTriggerWorldEvent = () => {
    const camp = activeCampaignRef.current;
    if (!camp || camp.status !== 'active') return;
    if (camp.activeWorldEvent) {
      setFocusEventNonce((n) => n + 1);
      return;
    }
    const suggestedCategory = pickStorytellerCategory(camp);
    void triggerWorldEvent({
      suggestedCategory,
      triggerReason: 'evento invocado manualmente pelo jogador',
      openImmediately: true,
    });
  };

  const applyWorldEventResolution = (
    event: WorldEventRecord,
    summaryLabel: string,
    narrativeHook: string,
    meta: {
      intent: ActionIntent;
      risk: ActionRisk;
      requiresRoll: boolean;
      attribute?: AttributeId;
      choice?: WorldEventChoice;
    },
  ) => {
    const camp = activeCampaignRef.current;
    if (!camp || isBusy || isTurnInFlightRef.current || !camp.activeWorldEvent) {
      return;
    }

    const choice = meta.choice;
    const stronghold =
      camp.stronghold ??
      defaultStrongholdForTheme(
        camp.world.primaryTheme,
        camp.currentLocation,
        camp.language,
      );
    const nextSupplies = {
      ...(stronghold.supplies ?? defaultBaseSuppliesForTheme(camp.world.primaryTheme)),
    };
    if (choice?.supplyDeltas) {
      for (const k of SUPPLY_KEYS) {
        const d = choice.supplyDeltas[k];
        if (typeof d === 'number' && d !== 0) {
          nextSupplies[k] = Math.max(0, nextSupplies[k] + d);
        }
      }
    }

    const nextDefense = Math.max(
      0,
      stronghold.defense + (choice?.defenseDelta ?? 0),
    );
    const nextCurrencyAmount = Math.max(
      0,
      (camp.player.currency?.amount ?? 0) + (choice?.currencyDelta ?? 0),
    );
    const nextVigor = Math.max(
      1,
      Math.min(camp.player.maxVigor, camp.player.vigor + (choice?.vigorDelta ?? 0)),
    );
    const nextTension = Math.max(
      0,
      Math.min(100, camp.player.tension + (choice?.tensionDelta ?? 0)),
    );

    const nextNpcs = camp.codex.npcs.map((n) => {
      if (
        !choice?.affinityDelta ||
        (!choice.targetNpcName && !n.inParty)
      ) {
        return n;
      }
      const matchesTarget = choice.targetNpcName
        ? n.name.toLowerCase().includes(choice.targetNpcName.toLowerCase())
        : n.inParty && n.status === 'alive';
      if (!matchesTarget) return n;
      const nextAff = Math.max(-100, Math.min(100, (n.affinity ?? 0) + choice.affinityDelta));
      const nextRel =
        n.relationship === 'romance' || n.relationship === 'partner'
          ? n.relationship
          : deriveRelationshipFromAffinity(nextAff, n.relationship);
      return {
        ...n,
        affinity: nextAff,
        relationship: nextRel,
        bondMemories: [
          ...(n.bondMemories ?? []),
          {
            turn: camp.turnCount,
            text: `Evento "${event.title}": ${summaryLabel}`,
            approved: choice.affinityDelta > 0,
          },
        ].slice(-15),
      };
    });

    const eventSystemEntry: StoryEntry = {
      id: `entry_ev_${Date.now()}`,
      role: 'system',
      turn: camp.turnCount,
      text: `⚡ Evento do Mundo (${event.title}): ${summaryLabel}`,
      timestamp: Date.now(),
    };

    const updatedCamp: Campaign = {
      ...camp,
      interactionId: undefined,
      activeWorldEvent: null,
      lastWorldEventTurn: camp.turnCount,
      eventHistory: [
        ...(camp.eventHistory ?? []),
        {
          id: event.id,
          title: event.title,
          turn: camp.turnCount,
          chosenSummary: summaryLabel,
        },
      ].slice(-12),
      player: {
        ...camp.player,
        vigor: nextVigor,
        tension: nextTension,
        currency: {
          ...camp.player.currency,
          amount: nextCurrencyAmount,
        },
      },
      stronghold: {
        ...stronghold,
        defense: nextDefense,
        supplies: nextSupplies,
      },
      codex: {
        ...camp.codex,
        npcs: nextNpcs,
        canonFacts: [
          ...camp.codex.canonFacts,
          {
            id: `fact_ev_${Date.now()}`,
            text: `Evento "${event.title}" (Dia ${event.dayTriggered}): ${summaryLabel}.`,
            turn: camp.turnCount,
            pinned: false,
          },
        ],
      },
      entries: [...camp.entries, eventSystemEntry],
    };

    persistActiveCampaign(updatedCamp);

    void executeStoryTurn(
      updatedCamp,
      narrativeHook,
      meta.intent,
      meta.risk,
      meta.requiresRoll,
      false,
      meta.attribute,
      { skipStoryteller: true },
    );
  };

  const handleResolveWorldEventChoice = (choice: WorldEventChoice) => {
    const event = activeCampaignRef.current?.activeWorldEvent;
    if (!event) return;
    applyWorldEventResolution(event, choice.label, choice.narrativeHook, {
      intent: choice.intent,
      risk: choice.risk,
      requiresRoll: choice.requiresRoll,
      attribute: choice.attribute,
      choice,
    });
  };

  const handleUndoTurn = () => {
    if (isBusy || isTurnInFlightRef.current || undoStack.length === 0) return;
    cancelActiveTurnRequest();
    stopSpeechPlayback();
    const prevSnapshot = undoStack[undoStack.length - 1];
    setUndoStack((stack) => stack.slice(0, -1));
    setLastTurnMeta(null);
    setSuggestedClash(null);
    persistActiveCampaign(prevSnapshot);
    pushToast('info', 'Turno desfeito — estado anterior restaurado.');
  };

  const handleRegenerateTurn = async () => {
    if (isBusy || isTurnInFlightRef.current || !lastTurnMeta) return;
    stopSpeechPlayback();
    await executeStoryTurn(
      lastTurnMeta.preTurnSnapshot,
      lastTurnMeta.actionText,
      lastTurnMeta.intent,
      lastTurnMeta.risk,
      lastTurnMeta.requiresRoll,
      lastTurnMeta.isDirection,
      lastTurnMeta.forcedAttribute,
      {
        precomputedDiceRoll: lastTurnMeta.diceRoll,
        pushToUndoStack: false,
        clashAction: lastTurnMeta.clashAction,
        precomputedClashResolution: lastTurnMeta.clashResolution,
        extraPromptNote:
          '[DIRETRIZ DE REGENERAÇÃO: Escreva uma versão alternativa fresca, criativa e diferente desta cena, mantendo fidelidade total ao estado atual.]',
      },
    );
  };

  const handleRerollLastTurnWithInspiration = async () => {
    if (!lastTurnMeta || !lastTurnMeta.diceRoll) return;
    const preCamp = lastTurnMeta.preTurnSnapshot;
    const currentInsp = preCamp.player.inspiration ?? 1;
    if (currentInsp <= 0) {
      pushToast('error', 'Sem Pontos de Inspiração disponíveis.');
      return;
    }

    stopSpeechPlayback();
    setActiveDiceRoll(null);

    const spentCamp: Campaign = {
      ...structuredClone(preCamp),
      player: {
        ...structuredClone(preCamp.player),
        inspiration: Math.max(0, currentInsp - 1),
      },
    };

    const targetAttr =
      lastTurnMeta.diceRoll.attribute ??
      lastTurnMeta.forcedAttribute ??
      inferActionAttribute(lastTurnMeta.actionText, lastTurnMeta.intent);
    const isClashReroll = spentCamp.activeClash?.status === 'active';
    const clashHints =
      isClashReroll && spentCamp.activeClash
        ? buildClashRollModifiers(
            spentCamp,
            spentCamp.activeClash,
            lastTurnMeta.clashAction,
            targetAttr,
          )
        : undefined;
    const opposedNpc = isClashReroll
      ? undefined
      : detectOpposedNpc(lastTurnMeta.actionText, spentCamp.codex.npcs);
    const opposed = opposedNpc
      ? evaluateOpposedContest(
          spentCamp.player,
          opposedNpc,
          targetAttr,
          lastTurnMeta.actionText,
        )
      : undefined;
    const partyHelper = findPartyAdvantage(
      clashHints?.attribute ?? targetAttr,
      spentCamp.codex.npcs,
      opposedNpc?.id,
    );
    const effectiveAttrs = isUnarmedContest(lastTurnMeta.actionText)
      ? spentCamp.player.attributes
      : getEffectiveAttributes(spentCamp.player);

    const resolvedRollMode = clashHints
      ? clashHints.grantAdvantage || partyHelper
        ? 'advantage'
        : 'normal'
      : opposed?.disadvantage && partyHelper
        ? 'normal'
        : opposed?.disadvantage
          ? 'disadvantage'
          : partyHelper
            ? 'advantage'
            : 'normal';
    const resolvedSource = clashHints
      ? clashHints.advantageSource ?? partyHelper?.name
      : resolvedRollMode === 'disadvantage'
        ? opposed?.disadvantageSource
        : resolvedRollMode === 'advantage'
          ? partyHelper?.name
          : undefined;

    const newRoll = resolveFateCheck(
      lastTurnMeta.actionText,
      lastTurnMeta.intent,
      lastTurnMeta.risk,
      spentCamp.difficulty,
      spentCamp.player.skills,
      true,
      spentCamp.player.tension,
      {
        ruleset: spentCamp.ruleset,
        player: spentCamp.player,
        attributes: effectiveAttrs,
        skillLevels: spentCamp.player.skillLevels,
        forcedAttribute: clashHints?.attribute ?? targetAttr,
        rollMode: resolvedRollMode,
        advantageSource: resolvedSource,
        opposedLabel: clashHints?.opposedLabel ?? opposed?.opposedLabel,
        dcOverride: clashHints?.dcOverride ?? opposed?.opposedDc,
        rerolledWithInspiration: true,
        weatherType: spentCamp.worldClock?.weatherType,
      },
    );

    pushToast('inspiration', '1 Inspiração gasta · Rerrolando d20!');

    await executeStoryTurn(
      spentCamp,
      lastTurnMeta.actionText,
      lastTurnMeta.intent,
      lastTurnMeta.risk,
      true,
      false,
      clashHints?.attribute ?? targetAttr,
      {
        precomputedDiceRoll: newRoll,
        pushToUndoStack: false,
        forceReplace: true,
        clashAction: lastTurnMeta.clashAction,
      },
    );
  };

  const handleResolveVigorCrisis = async (
    choice: 'survival_roll' | 'use_consumable' | 'accept_end',
    consumable?: InventoryItem,
  ) => {
    const camp = activeCampaignRef.current;
    if (!camp || isBusy) return;

    if (choice === 'accept_end') {
      await handleGenerateEpilogue('fallen', camp);
      return;
    }

    if (choice === 'use_consumable' && consumable) {
      const dndMode = isDndRuleset(camp);
      const healAmount = dndMode
        ? rollDiceFormula(consumable.dndStats?.healDice ?? '2d4+2').total +
          (camp.player.dnd?.featIds.includes('field_medic')
            ? getProficiencyBonus(camp.player.level)
            : 0)
        : 30;
      const { nextPlayer, deltas } = applyStateChanges(
        camp.player,
        {
          removeItems: [consumable.name],
          vigorDelta: healAmount,
        },
        camp.turnCount,
        { ruleset: camp.ruleset },
      );

      const entry: StoryEntry = {
        id: `entry_crisis_item_${Date.now()}`,
        role: 'narrator',
        turn: camp.turnCount,
        chapter: camp.currentChapter,
        sceneTitle: 'Fôlego Recuperado',
        location: camp.currentLocation,
        mood: camp.currentMood,
        text: `No limiar da inconsciência, você recorre a **${consumable.name}** (+${healAmount} ${dndMode ? 'PV' : 'Vigor'}). A dor recua o suficiente para que seus joelhos não cedam — você ainda está na luta.`,
        deltas,
        isCrisisResolution: true,
        timestamp: Date.now(),
      };

      persistActiveCampaign({
        ...camp,
        player: nextPlayer,
        status: evaluateStatus(nextPlayer.vigor, nextPlayer.tension),
        entries: [...camp.entries, entry],
      });
      pushToast('vigor', `${consumable.name} usado · +${healAmount} ${dndMode ? 'PV' : 'Vigor'}`);
      return;
    }

    if (choice === 'survival_roll') {
      const roll = resolveFateCheck(
        'Lutar para sobreviver ao colapso',
        'survival',
        'high',
        camp.difficulty,
        camp.player.skills,
        true,
        camp.player.tension,
        {
          attributes: getEffectiveAttributes(camp.player),
          skillLevels: camp.player.skillLevels,
          forcedAttribute: 'con',
        },
      );

      if (settings.diceAnimations && roll) {
        setActiveDiceRoll(roll);
      }

      const playerRollEntry: StoryEntry = {
        id: `entry_p_surv_${Date.now()}`,
        role: 'player',
        turn: camp.turnCount + 1,
        text: 'Teste de Sobrevivência à beira do colapso',
        diceRoll: roll,
        timestamp: Date.now(),
      };

      const survived =
        roll?.outcome === 'critical_success' ||
        roll?.outcome === 'success' ||
        roll?.outcome === 'partial';

      if (!survived) {
        const fallenEntry: StoryEntry = {
          id: `entry_fall_${Date.now()}`,
          role: 'narrator',
          turn: camp.turnCount + 1,
          chapter: camp.currentChapter,
          sceneTitle: 'Último Suspiro',
          location: camp.currentLocation,
          mood: 'Silêncio Final',
          text: `O esforço final não basta. As forças abandonam ${camp.player.name} em ${camp.currentLocation}, e a escuridão fecha a cortina sobre esta jornada.`,
          isCrisisResolution: true,
          timestamp: Date.now(),
        };

        const updatedBeforeEpilogue: Campaign = {
          ...camp,
          turnCount: camp.turnCount + 1,
          entries: [...camp.entries, playerRollEntry, fallenEntry],
        };
        persistActiveCampaign(updatedBeforeEpilogue);
        await handleGenerateEpilogue('fallen', updatedBeforeEpilogue);
        return;
      }

      const nextTurn = camp.turnCount + 1;
      const scarTrait =
        camp.language === 'en'
          ? 'Marked by Death'
          : camp.language === 'fr'
            ? 'Marqué par la Mort'
            : 'Marcado pela Morte';

      const optimisticCamp: Campaign = {
        ...camp,
        turnCount: nextTurn,
        entries: [...camp.entries, playerRollEntry],
      };

      setActiveCampaign(optimisticCamp);
      setIsBusy(true);
      try {
        const res = await requestStoryTurn(
          optimisticCamp,
          'Sobreviver ao colapso e arrancar uma última saída',
          roll,
          settings,
          apiHealth,
          'survival_test',
        );

        const { nextPlayer, deltas: playerDeltas } = applyStateChanges(
          optimisticCamp.player,
          {
            ...res.stateChanges,
            vigorDelta: isDndRuleset(optimisticCamp)
              ? Math.max(2, Math.ceil(optimisticCamp.player.maxVigor * 0.25))
              : 25,
            addTraits: [...(res.stateChanges.addTraits ?? []), scarTrait],
          },
          nextTurn,
          { ruleset: optimisticCamp.ruleset },
        );
        const resolvedLoc = res.location || optimisticCamp.currentLocation;
        const { nextCodex, deltas: codexDeltas } = applyCodexChanges(
          optimisticCamp.codex,
          resolvedLoc,
          nextTurn,
          res.stateChanges,
          optimisticCamp.ruleset,
        );

        const survivorEntry: StoryEntry = {
          id: `entry_surv_${Date.now()}`,
          role: 'narrator',
          turn: nextTurn,
          chapter: optimisticCamp.currentChapter,
          sceneTitle: res.sceneTitle,
          location: resolvedLoc,
          mood: res.mood,
          text: res.narration,
          beats: res.beats,
          deltas: [...playerDeltas, ...codexDeltas],
          isCrisisResolution: true,
          timestamp: Date.now(),
        };

        persistActiveCampaign({
          ...optimisticCamp,
          currentLocation: resolvedLoc,
          currentMood: res.mood || optimisticCamp.currentMood,
          player: nextPlayer,
          codex: nextCodex,
          status: evaluateStatus(nextPlayer.vigor, nextPlayer.tension),
          actions: toTacticalActions(res.actions),
          entries: [...optimisticCamp.entries, survivorEntry],
          interactionId: res.interactionId ?? optimisticCamp.interactionId,
          engineUsed: res.engineUsed,
        });
        pushToast('crisis', 'Sobreviveu por um fio! (+25 Vigor)');
      } catch (err) {
        pushToast(
          'error',
          err instanceof Error ? err.message : 'Erro no teste de sobrevivência.',
        );
      } finally {
        setIsBusy(false);
      }
    }
  };

  // MYTHOS 12.0 — D&D 5.2 Reactive Saving Throw, Story Death Save, Level-Up & Legacy Migration
  const handleResolvePendingSavingThrow = () => {
    const camp = activeCampaignRef.current;
    const pending = camp?.pendingSavingThrow;
    if (!camp || !pending || isBusy) return;

    const saveRoll = resolveDndSavingThrow(
      camp.player,
      pending.ability,
      pending.dc,
      pending.reason,
    );
    if (settings.diceAnimations) {
      setActiveDiceRoll(saveRoll);
    }

    const passed = saveRoll.outcome === 'success' || saveRoll.outcome === 'critical_success';
    let nextPlayer: PlayerState = structuredClone(camp.player);
    let damageTaken = 0;
    let absorbed = 0;
    let concNote = '';

    if (pending.failDamageDice) {
      const rolled = rollDiceFormula(pending.failDamageDice);
      const rawDmg = passed
        ? pending.halfOnSuccess
          ? Math.floor(rolled.total / 2)
          : 0
        : rolled.total;
      if (rawDmg > 0) {
        const applied = applyDndDamageWithTempHp(
          nextPlayer.vigor,
          nextPlayer.dnd?.tempHp ?? 0,
          rawDmg,
        );
        nextPlayer.vigor = applied.nextHp;
        if (nextPlayer.dnd) nextPlayer.dnd.tempHp = applied.nextTempHp;
        damageTaken = rawDmg;
        absorbed = applied.absorbed;
        if (applied.hpLost > 0 && nextPlayer.dnd?.concentrationSpellId) {
          const concDc = Math.max(10, Math.floor(applied.hpLost / 2));
          const cRoll = resolveDndSavingThrow(nextPlayer, 'con', concDc, 'Concentração', {
            rollMode: nextPlayer.dnd.featIds.includes('war_focus') ? 'advantage' : 'normal',
          });
          if (cRoll.outcome !== 'success') {
            nextPlayer.dnd.concentrationSpellId = null;
            concNote = ` · Concentração perdida (CON ${cRoll.total} vs CD ${concDc})`;
          }
        }
      }
    }

    if (!passed && pending.failCondition && nextPlayer.dnd) {
      if (!nextPlayer.dnd.conditions.includes(pending.failCondition)) {
        nextPlayer.dnd.conditions = [...nextPlayer.dnd.conditions, pending.failCondition];
      }
    }

    const attrShort = ATTRIBUTE_META[pending.ability].short[settings.language];
    const outcomeSummary = passed
      ? `PASSOU (${saveRoll.total} vs CD ${pending.dc})${damageTaken > 0 ? ` · metade do dano (−${damageTaken} PV)` : ' · efeito evitado!'}`
      : `FALHOU (${saveRoll.total} vs CD ${pending.dc})${damageTaken > 0 ? ` · −${damageTaken} PV${absorbed > 0 ? ` (${absorbed} absorvido)` : ''}` : ''}${pending.failCondition ? ` · Condição: ${pending.failCondition}` : ''}`;

    const sysEntry: StoryEntry = {
      id: `entry_save_${Date.now()}`,
      role: 'system',
      turn: camp.turnCount,
      text: `Salvaguarda de ${attrShort} contra ${pending.reason}: ${outcomeSummary}${concNote}`,
      diceRoll: saveRoll,
      timestamp: Date.now(),
    };

    const nextStatus = evaluateStatus(nextPlayer.vigor, nextPlayer.tension);
    persistActiveCampaign({
      ...camp,
      player: nextPlayer,
      pendingSavingThrow: null,
      status: nextStatus,
      entries: [...camp.entries, sysEntry],
    });
    pushToast(
      passed ? 'vigor' : 'crisis',
      `Salvaguarda ${attrShort}: ${passed ? 'Sucesso!' : `Falhou${damageTaken > 0 ? ` (−${damageTaken} PV)` : ''}`}`,
    );
  };

  const handleRollStoryDeathSave = async () => {
    const camp = activeCampaignRef.current;
    if (!camp || !camp.player.dnd || isBusy) return;

    const dsRoll = resolveDndDeathSave(false);
    if (settings.diceAnimations) {
      setActiveDiceRoll(dsRoll);
    }

    const nextPlayer: PlayerState = structuredClone(camp.player);
    const dnd = nextPlayer.dnd!;
    let summary = '';
    let nextStatus: CampaignStatus = camp.status;

    if (dsRoll.outcome === 'critical_success') {
      nextPlayer.vigor = 1;
      dnd.deathSaves = { successes: 0, failures: 0, stabilized: false };
      dnd.conditions = dnd.conditions.filter((c) => c !== 'unconscious');
      nextStatus = 'active';
      summary = `✨ 20 NATURAL no Teste Contra a Morte! ${nextPlayer.name} desperta imediatamente com 1 PV!`;
    } else if (dsRoll.outcome === 'critical_failure') {
      dnd.deathSaves.failures = Math.min(3, dnd.deathSaves.failures + 2);
      summary = `💀 1 Natural no Teste Contra a Morte (+2 falhas → ${dnd.deathSaves.failures}/3).`;
    } else if (dsRoll.outcome === 'success') {
      dnd.deathSaves.successes = Math.min(3, dnd.deathSaves.successes + 1);
      if (dnd.deathSaves.successes >= 3) {
        nextPlayer.vigor = 1;
        dnd.deathSaves = { successes: 0, failures: 0, stabilized: true };
        dnd.conditions = dnd.conditions.filter((c) => c !== 'unconscious');
        nextStatus = 'active';
        summary = `💚 3/3 Sucessos no Teste Contra a Morte! ${nextPlayer.name} estabilizou e recobrou o fôlego (1 PV).`;
      } else {
        summary = `Teste Contra a Morte: Sucesso (${dsRoll.roll} vs CD 10 · ${dnd.deathSaves.successes}/3 sucessos, ${dnd.deathSaves.failures}/3 falhas).`;
      }
    } else {
      dnd.deathSaves.failures = Math.min(3, dnd.deathSaves.failures + 1);
      summary = `Teste Contra a Morte: Falha (${dsRoll.roll} vs CD 10 · ${dnd.deathSaves.successes}/3 sucessos, ${dnd.deathSaves.failures}/3 falhas).`;
    }

    const sysEntry: StoryEntry = {
      id: `entry_ds_${Date.now()}`,
      role: 'system',
      turn: camp.turnCount,
      text: summary,
      diceRoll: dsRoll,
      timestamp: Date.now(),
    };

    const updatedCamp: Campaign = {
      ...camp,
      player: nextPlayer,
      status: nextStatus,
      entries: [...camp.entries, sysEntry],
    };
    persistActiveCampaign(updatedCamp);

    if (dnd.deathSaves.failures >= 3) {
      pushToast('crisis', '3 falhas no Teste Contra a Morte — a jornada chegou ao fim.');
      await handleGenerateEpilogue('fallen', updatedCamp);
    } else {
      pushToast(nextStatus === 'active' ? 'vigor' : 'info', summary);
    }
  };

  const handleConfirmLevelUp = (payload: LevelUpChoicePayload) => {
    const camp = activeCampaignRef.current;
    if (!camp?.player.dnd) return;

    const nextPlayer: PlayerState = structuredClone(camp.player);
    const dnd = nextPlayer.dnd!;
    const notes: string[] = [];

    if (payload.subclassId && !dnd.subclassId) {
      dnd.subclassId = payload.subclassId;
      dnd.pendingSubclassChoice = false;
      const sc = DND_CLASSES[dnd.classId].subclasses.find((s) => s.id === payload.subclassId);
      if (sc) notes.push(`Subclasse: ${sc.label}`);
    }

    if (payload.asiIncreases) {
      for (const [attr, pts] of Object.entries(payload.asiIncreases) as Array<[AttributeId, number]>) {
        if (!pts || pts <= 0) continue;
        nextPlayer.attributes[attr] = Math.min(
          NATURAL_ATTRIBUTE_CAP,
          (nextPlayer.attributes[attr] ?? 10) + pts,
        );
        notes.push(`+${pts} ${ATTRIBUTE_META[attr].short[settings.language]}`);
      }
      dnd.pendingAsiOrFeat = Math.max(0, (dnd.pendingAsiOrFeat ?? 0) - 1);
    }

    if (payload.featId) {
      if (!dnd.featIds.includes(payload.featId)) {
        dnd.featIds.push(payload.featId);
      }
      if (payload.featAbility) {
        nextPlayer.attributes[payload.featAbility] = Math.min(
          NATURAL_ATTRIBUTE_CAP,
          (nextPlayer.attributes[payload.featAbility] ?? 10) + 1,
        );
      }
      dnd.pendingAsiOrFeat = Math.max(0, (dnd.pendingAsiOrFeat ?? 0) - 1);
      const fMeta = DND_FEATS[payload.featId];
      if (fMeta) notes.push(`Talento: ${fMeta.label}`);
    }

    if (payload.epicBoonId) {
      if (!dnd.featIds.includes(payload.epicBoonId)) {
        dnd.featIds.push(payload.epicBoonId);
      }
      if (payload.epicBoonAbility) {
        nextPlayer.attributes[payload.epicBoonAbility] = Math.min(
          EPIC_BOON_ATTRIBUTE_CAP,
          (nextPlayer.attributes[payload.epicBoonAbility] ?? 10) + 1,
        );
      }
      dnd.pendingEpicBoon = false;
      const bMeta = DND_FEATS[payload.epicBoonId];
      if (bMeta) notes.push(`Dádiva Épica: ${bMeta.label}`);
    }

    const oldMax = nextPlayer.maxVigor;
    const newMax = computeMaxHpForRuleset(camp.ruleset, nextPlayer);
    const hpGain = Math.max(0, newMax - oldMax);
    nextPlayer.maxVigor = newMax;
    nextPlayer.vigor = Math.min(newMax, nextPlayer.vigor + hpGain);

    persistActiveCampaign({
      ...camp,
      interactionId: undefined,
      player: nextPlayer,
    });
    setLevelUpModalOpen(false);
    pushToast('level', `Evolução D&D 5.2 aplicada! ${notes.join(' · ')}`);
  };

  const handleMigrateCampaignToDnd52 = async () => {
    const camp = activeCampaignRef.current;
    if (!camp || isDndRuleset(camp) || isBusy) return;
    if (camp.activeClash?.status === 'active') {
      pushToast('error', 'Conclua o Confronto Tático antes de migrar para D&D 5.2.');
      return;
    }

    const updatedSlots = await createSaveSlotAsync(camp, 'Backup pré-migração D&D 5.2');
    setSaveSlots(updatedSlots);

    const migrated = hydrateDnd5eSheetFromLegacy(camp);
    const sysEntry: StoryEntry = {
      id: `entry_mig_${Date.now()}`,
      role: 'system',
      turn: migrated.turnCount,
      text: `Campanha migrada com segurança para D&D 5e (2024 / SRD 5.2)! Backup salvo automaticamente. Herói: ${migrated.player.vigor}/${migrated.player.maxVigor} PV · ${migrated.codex.npcs.length} NPC(s) convertidos proporcionalmente.`,
      timestamp: Date.now(),
    };

    setUndoStack([]);
    setLastTurnMeta(null);
    persistActiveCampaign({
      ...migrated,
      interactionId: undefined,
      entries: [...migrated.entries, sysEntry],
    });
    pushToast('level', 'Campanha migrada para D&D 5.2 (2024) com backup automático!');
  };

  const handleAdvanceWorld = useCallback(async () => {
    const camp = activeCampaignRef.current;
    if (
      !camp ||
      isBusy ||
      isTurnInFlightRef.current ||
      camp.activeWorldEvent ||
      camp.pendingSavingThrow ||
      camp.activeClash?.status === 'active' ||
      camp.status !== 'active'
    ) {
      return;
    }

    const mySeq = ++turnSeqRef.current;
    const abortController = new AbortController();
    turnAbortRef.current = abortController;
    isTurnInFlightRef.current = true;
    setIsBusy(true);
    try {
      const response = await requestLivingWorldPulse(
        camp,
        settings,
        apiHealth,
        abortController.signal,
      );
      if (mySeq !== turnSeqRef.current) {
        return;
      }
      const latest = activeCampaignRef.current;
      if (!latest || latest.id !== camp.id || latest.turnCount !== camp.turnCount) {
        return;
      }

      const { nextPlayer, deltas: playerDeltas } = applyStateChanges(
        latest.player,
        response.stateChanges,
        latest.turnCount,
        { ruleset: latest.ruleset },
      );
      const resolvedLoc = response.location || latest.currentLocation;
      const { nextCodex, deltas: codexDeltas } = applyCodexChanges(
        latest.codex,
        resolvedLoc,
        latest.turnCount,
        response.stateChanges,
        latest.ruleset,
      );
      const nextStatus = evaluateStatus(nextPlayer.vigor, nextPlayer.tension);

      const pulseEntry: StoryEntry = {
        id: `entry_pulse_${Date.now()}`,
        role: 'pulse',
        turn: latest.turnCount,
        sceneTitle: response.sceneTitle,
        location: resolvedLoc,
        mood: response.mood,
        text: response.narration,
        deltas: [...playerDeltas, ...codexDeltas] as StateDelta[],
        timestamp: Date.now(),
      };

      persistActiveCampaign({
        ...latest,
        currentLocation: resolvedLoc,
        currentMood: response.mood || latest.currentMood,
        player: nextPlayer,
        codex: nextCodex,
        status: nextStatus,
        actions:
          response.actions.length > 0
            ? toTacticalActions(response.actions)
            : latest.actions,
        entries: [...latest.entries, pulseEntry],
        engineUsed: response.engineUsed,
      });
      setPulseSecondsLeft(settings.livingWorldSeconds);
      if (response.waitingForResponse || nextStatus !== 'active') {
        setPulsePaused(true);
      }
    } catch (err) {
      if (
        mySeq !== turnSeqRef.current ||
        (err instanceof DOMException && err.name === 'AbortError')
      ) {
        return;
      }
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Erro no Pulso do Mundo Vivo.',
      );
    } finally {
      if (mySeq === turnSeqRef.current) {
        if (turnAbortRef.current === abortController) {
          turnAbortRef.current = null;
        }
        isTurnInFlightRef.current = false;
        setIsBusy(false);
      }
    }
  }, [apiHealth, isBusy, persistActiveCampaign, pushToast, settings]);

  useEffect(() => {
    if (
      view !== 'stage' ||
      !activeCampaign ||
      activeCampaign.status !== 'active' ||
      Boolean(activeCampaign.activeWorldEvent) ||
      Boolean(activeCampaign.activeClash?.status === 'active') ||
      !settings.livingWorldEnabled ||
      pulsePaused ||
      isBusy ||
      settingsOpen ||
      savesOpen
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      if (isTurnInFlightRef.current) return;
      const next = pulseSecondsRef.current - 1;
      if (next <= 0) {
        pulseSecondsRef.current = settings.livingWorldSeconds;
        setPulseSecondsLeft(settings.livingWorldSeconds);
        void handleAdvanceWorld();
      } else {
        pulseSecondsRef.current = next;
        setPulseSecondsLeft(next);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    activeCampaign,
    handleAdvanceWorld,
    isBusy,
    pulsePaused,
    savesOpen,
    settings.livingWorldEnabled,
    settings.livingWorldSeconds,
    settingsOpen,
    view,
  ]);

  const handleAddCanonFact = (factText: string) => {
    const camp = activeCampaignRef.current;
    if (!camp) return;
    const text = factText.trim();
    if (!text) return;

    const updated: Campaign = {
      ...camp,
      // Clear interactionId so Gemini reads the newly pinned fact cleanly on the next turn
      interactionId: undefined,
      codex: {
        ...camp.codex,
        canonFacts: [
          ...camp.codex.canonFacts,
          {
            id: `fact_pin_${Date.now()}`,
            text,
            turn: camp.turnCount,
            pinned: true,
          },
        ],
      },
    };
    persistActiveCampaign(updated);
    pushToast('memory', 'Fato fixado na memória da IA.');
  };

  const handleRemoveCanonFact = (factId: string) => {
    const camp = activeCampaignRef.current;
    if (!camp) return;
    persistActiveCampaign({
      ...camp,
      interactionId: undefined,
      codex: {
        ...camp.codex,
        canonFacts: camp.codex.canonFacts.filter((f) => f.id !== factId),
      },
    });
  };

  const handleUpdateWorldNotes = (
    patch: Partial<Pick<WorldConfig, 'era' | 'history' | 'premise' | 'creativePrompt'>>,
  ) => {
    const camp = activeCampaignRef.current;
    if (!camp) return;
    const updated: Campaign = {
      ...camp,
      interactionId: undefined,
      world: {
        ...camp.world,
        ...patch,
      },
    };
    persistActiveCampaign(updated);
    pushToast('memory', 'Contexto do mundo atualizado na memória da IA.');
  };

  const handleSpendAttributePoint = (attr: AttributeId) => {
    const camp = activeCampaignRef.current;
    if (!camp || camp.player.attributePoints <= 0) return;
    const currentVal = camp.player.attributes[attr] ?? 10;
    const hasEpicBoon = Boolean(
      camp.player.dnd?.featIds.some((id) => DND_FEATS[id]?.category === 'epic_boon'),
    );
    const attrCap = hasEpicBoon ? EPIC_BOON_ATTRIBUTE_CAP : NATURAL_ATTRIBUTE_CAP;
    if (currentVal >= attrCap) return;

    const nextAttributes = {
      ...camp.player.attributes,
      [attr]: currentVal + 1,
    };
    const nextMaxVigor = computeMaxHpForRuleset(camp.ruleset, {
      ...camp.player,
      attributes: nextAttributes,
    });
    const vigorBonus = Math.max(0, nextMaxVigor - camp.player.maxVigor);

    persistActiveCampaign({
      ...camp,
      player: {
        ...camp.player,
        attributes: nextAttributes,
        attributePoints: camp.player.attributePoints - 1,
        maxVigor: nextMaxVigor,
        vigor:
          camp.player.vigor <= 0
            ? 0
            : Math.min(nextMaxVigor, camp.player.vigor + vigorBonus),
      },
    });
    pushToast(
      'level',
      `${ATTRIBUTE_META[attr].full[settings.language]} aumentou para ${currentVal + 1}!`,
    );
  };

  const handleUpdatePlayerProfile = (
    patch: Partial<
      Pick<
        PlayerState,
        'name' | 'age' | 'occupation' | 'height' | 'physique' | 'appearance' | 'attributes'
      >
    >,
  ) => {
    const camp = activeCampaignRef.current;
    if (!camp) return;
    const nextAttributes = patch.attributes
      ? { ...camp.player.attributes, ...patch.attributes }
      : camp.player.attributes;
    const nextMaxVigor = computeMaxHpForRuleset(camp.ruleset, {
      ...camp.player,
      attributes: nextAttributes,
    });
    const nextVigor =
      camp.player.vigor <= 0
        ? 0
        : Math.min(
            nextMaxVigor,
            camp.player.vigor + Math.max(0, nextMaxVigor - camp.player.maxVigor),
          );

    persistActiveCampaign({
      ...camp,
      interactionId: undefined,
      player: {
        ...camp.player,
        ...patch,
        attributes: nextAttributes,
        maxVigor: nextMaxVigor,
        vigor: nextVigor,
      },
    });
    pushToast('memory', 'Perfil, biometria e atributos atualizados na memória da IA!');
  };

  const handleToggleEquipItem = (itemId: string) => {
    const camp = activeCampaignRef.current;
    if (!camp) return;
    const target = camp.player.inventory.find((i) => i.id === itemId);
    if (!target || !target.equipSlot) return;

    const equipping = !target.equipped;
    const dndMode = isDndRuleset(camp);

    // D&D 5.2 Attunement Limit (max 3 attuned items simultaneously!)
    if (equipping && dndMode && target.dndStats?.requiresAttunement) {
      const currentAttuned = camp.player.inventory.filter(
        (i) => i.equipped && i.dndStats?.requiresAttunement && i.id !== itemId,
      ).length;
      if (currentAttuned >= 3) {
        pushToast(
          'error',
          'Limite D&D 5.2 de Sintonia atingido (máx. 3 itens mágicos sintonizados). Desequipe um primeiro.',
        );
        return;
      }
    }

    const equippingTwoHanded =
      equipping &&
      target.equipSlot === 'weapon' &&
      Boolean(target.dndStats?.properties?.includes('two_handed'));
    const equippingShield =
      equipping &&
      target.equipSlot === 'offhand' &&
      target.dndStats?.armorCategory === 'shield';

    const nextInventory = camp.player.inventory.map((item) => {
      if (item.id === itemId) {
        return { ...item, equipped: equipping };
      }
      if (equipping && item.equipSlot === target.equipSlot && item.equipped) {
        return { ...item, equipped: false };
      }
      if (equippingTwoHanded && item.equipSlot === 'offhand' && item.equipped) {
        return { ...item, equipped: false };
      }
      if (
        equippingShield &&
        item.equipSlot === 'weapon' &&
        item.equipped &&
        item.dndStats?.properties?.includes('two_handed')
      ) {
        return { ...item, equipped: false };
      }
      return item;
    });

    const nextMaxVigor = computeMaxHpForRuleset(camp.ruleset, {
      ...camp.player,
      inventory: nextInventory,
    });

    persistActiveCampaign({
      ...camp,
      player: {
        ...camp.player,
        inventory: nextInventory,
        maxVigor: nextMaxVigor,
        vigor: Math.min(nextMaxVigor, camp.player.vigor),
      },
    });
    pushToast(
      'item_add',
      equipping ? `Equipado: ${target.name}` : `Desequipado: ${target.name}`,
    );
  };

  const handleTogglePartyMember = (npcId: string) => {
    const camp = activeCampaignRef.current;
    if (!camp) return;
    const target = camp.codex.npcs.find((n) => n.id === npcId);
    if (!target || target.status !== 'alive') return;

    const currentPartyCount = camp.codex.npcs.filter(
      (n) => n.inParty && n.status === 'alive',
    ).length;

    if (!target.inParty && currentPartyCount >= MAX_PARTY_SIZE) {
      pushToast('error', `Seu grupo já está cheio (${MAX_PARTY_SIZE}/${MAX_PARTY_SIZE}).`);
      return;
    }

    const joining = !target.inParty;
    const nextNpcs = camp.codex.npcs.map((n) =>
      n.id === npcId ? { ...n, inParty: joining } : n,
    );

    persistActiveCampaign({
      ...camp,
      codex: {
        ...camp.codex,
        npcs: nextNpcs,
      },
    });

    const attrLabel =
      ATTRIBUTE_META[target.assistAttribute ?? 'wis'].short[settings.language];
    pushToast(
      'bond',
      joining
        ? `${target.name} entrou no grupo! (Vantagem 2×d20 em ${attrLabel})`
        : `${target.name} saiu do grupo.`,
    );
  };

  const handleGenerateNpcPortrait = async (npcId: string) => {
    const camp = activeCampaignRef.current;
    if (!camp || generatingNpcPortraitId) return;
    const npc = camp.codex.npcs.find((n) => n.id === npcId);
    if (!npc) return;

    setGeneratingNpcPortraitId(npcId);
    try {
      const res = await requestNpcPortrait(camp.world, npc, settings, apiHealth);
      const latest = activeCampaignRef.current;
      if (latest && latest.id === camp.id) {
        persistActiveCampaign({
          ...latest,
          codex: {
            ...latest.codex,
            npcs: latest.codex.npcs.map((n) =>
              n.id === npcId ? { ...n, portraitUrl: res.dataUrl } : n,
            ),
          },
        });
        pushToast('npc', `Retrato gerado para ${npc.name}`);
      }
    } catch (err) {
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Falha ao gerar retrato do NPC.',
      );
    } finally {
      setGeneratingNpcPortraitId(null);
    }
  };

  const openRelationships = (npcId?: string) => {
    setRelationshipsFocusNpcId(npcId ?? null);
    setRelationshipsOpen(true);
  };

  const handleUpdateNpcProfile = (npcId: string, patch: Partial<NpcRecord>) => {
    const camp = activeCampaignRef.current;
    if (!camp) return;
    const target = camp.codex.npcs.find((n) => n.id === npcId);
    if (!target) return;

    const nextNpcs = camp.codex.npcs.map((n) => {
      if (n.id !== npcId) return n;
      const mergedAttrs = patch.attributes
        ? {
            ...(n.attributes ?? defaultNpcAttributes(n.assistAttribute ?? 'wis')),
            ...patch.attributes,
          }
        : n.attributes ?? defaultNpcAttributes(n.assistAttribute ?? 'wis');
      const nextLevel = patch.level ?? n.level ?? camp.player.level;
      const nextDraftNpc = { ...n, ...patch, level: nextLevel, attributes: mergedAttrs };
      const nextMaxVigor = computeNpcMaxHpForRuleset(camp.ruleset, nextDraftNpc);
      const currentVigor = n.vigor ?? nextMaxVigor;
      const nextVigor =
        currentVigor <= 0
          ? 0
          : Math.min(
              nextMaxVigor,
              currentVigor + Math.max(0, nextMaxVigor - (n.maxVigor ?? nextMaxVigor)),
            );
      return {
        ...nextDraftNpc,
        maxVigor: nextMaxVigor,
        vigor: nextVigor,
        armorClass: isDndRuleset(camp)
          ? patch.armorClass ?? computeNpcArmorClass(nextDraftNpc)
          : patch.armorClass ?? n.armorClass,
      };
    });

    persistActiveCampaign({
      ...camp,
      interactionId: undefined,
      codex: {
        ...camp.codex,
        npcs: nextNpcs,
      },
    });
    pushToast('bond', `Ficha de ${target.name} salva na memória da IA!`);
  };

  const handleGiftItemToNpc = (npcId: string, itemId: string) => {
    const camp = activeCampaignRef.current;
    if (!camp) return;
    const npc = camp.codex.npcs.find((n) => n.id === npcId);
    const item = camp.player.inventory.find((i) => i.id === itemId);
    if (!npc || !item) return;

    const rarityGain: Record<string, number> = {
      common: 8,
      uncommon: 12,
      rare: 16,
      epic: 22,
      legendary: 30,
    };
    const itemLower = `${item.name} ${item.note ?? ''}`.toLowerCase();
    const matchedLike = (npc.likes ?? []).some((like) =>
      like
        .toLowerCase()
        .split(/\s+/)
        .some((w) => w.length >= 4 && itemLower.includes(w)),
    );
    const gain = (rarityGain[item.rarity ?? 'common'] ?? 8) + (matchedLike ? 6 : 0);

    const nextInventory = camp.player.inventory
      .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
      .filter((i) => i.quantity > 0);

    const nextAffinity = Math.min(100, (npc.affinity ?? 0) + gain);
    const nextRelationship =
      npc.relationship === 'romance' || npc.relationship === 'partner'
        ? npc.relationship
        : deriveRelationshipFromAffinity(nextAffinity, npc.relationship);

    const nextNpcs = camp.codex.npcs.map((n) =>
      n.id === npcId
        ? {
            ...n,
            affinity: nextAffinity,
            relationship: nextRelationship,
            stance: nextAffinity >= 15 ? ('ally' as const) : n.stance,
            currentMood: matchedLike ? 'Encantada(o)' : 'Grata(o)',
            bondMemories: [
              ...(n.bondMemories ?? []),
              {
                turn: camp.turnCount,
                text: `Presenteou com ${item.name}${matchedLike ? ' (adorou!)' : ''} (+${gain} afinidade).`,
                approved: true,
              },
            ].slice(-15),
          }
        : n,
    );

    const giftEntry: StoryEntry = {
      id: `entry_gift_${Date.now()}`,
      role: 'system',
      turn: camp.turnCount,
      text: `Você presenteou ${npc.name} com ${item.name}. Afinidade +${gain}${matchedLike ? ' (Bônus de gosto pessoal!)' : ''}.`,
      timestamp: Date.now(),
    };

    persistActiveCampaign({
      ...camp,
      interactionId: undefined,
      player: {
        ...camp.player,
        inventory: nextInventory,
      },
      codex: {
        ...camp.codex,
        npcs: nextNpcs,
      },
      entries: [...camp.entries, giftEntry],
    });
    pushToast(
      'bond',
      `${npc.name} adorou ${item.name}! (+${gain} afinidade)`,
    );
  };

  const handleSpendQualityTime = (npc: NpcRecord) => {
    const isRomantic =
      npc.relationship === 'romance' || npc.relationship === 'partner';
    const actionPrompt = isRomantic
      ? `Passar um momento especial a sós com ${npc.name}, conversando com carinho, ouvindo seus pensamentos e fortalecendo nosso relacionamento.`
      : `Passar um tempo conversando em particular com ${npc.name} para conhecer melhor sua história, habilidades e fortalecer nosso vínculo.`;
    void handleSendAction(
      actionPrompt,
      'diplomatic',
      'safe',
      false,
      false,
      'cha',
    );
  };

  const handleFetchRumors = async () => {
    const camp = activeCampaignRef.current;
    if (!camp || isFetchingRumors) return;
    setIsFetchingRumors(true);
    try {
      const res = await requestWorldRumors(camp, settings, apiHealth);
      const latest = activeCampaignRef.current;
      if (!latest || latest.id !== camp.id) return;
      const clock = latest.worldClock;
      const dayGenerated = clock?.day ?? 1;
      const timeGenerated = formatClockTime(clock?.hour ?? 8, clock?.minute ?? 30);
      const freshItems: WorldRumorItem[] = res.items.map((item, idx) => ({
        id: `rumor_${Date.now()}_${idx}`,
        headline: item.headline,
        source: item.source,
        body: item.body,
        locationHint: item.locationHint,
        urgency: item.urgency,
        hookAction: item.hookAction,
        questTitle: item.questTitle,
        dayGenerated,
        timeGenerated,
        investigated: false,
      }));
      persistActiveCampaign({
        ...latest,
        rumors: [...freshItems, ...(latest.rumors ?? [])].slice(0, 12),
      });
      pushToast('info', `${freshItems.length} novos boletins captados em ${res.channelName}!`);
    } catch (err) {
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Falha ao captar boletins do mundo.',
      );
    } finally {
      setIsFetchingRumors(false);
    }
  };

  const handleTrackRumorQuest = (rumor: WorldRumorItem) => {
    const camp = activeCampaignRef.current;
    if (!camp) return;
    const title = rumor.questTitle || rumor.headline;
    const exists = camp.player.quests.some(
      (q) => q.title.toLowerCase() === title.toLowerCase(),
    );
    if (exists) return;

    persistActiveCampaign({
      ...camp,
      interactionId: undefined,
      player: {
        ...camp.player,
        quests: [
          ...camp.player.quests,
          {
            id: `quest_rumor_${Date.now()}`,
            title,
            description: `${rumor.body}${rumor.locationHint ? ` (Local: ${rumor.locationHint})` : ''}`,
            status: 'active',
            primary: false,
          },
        ],
      },
    });
    pushToast('quest', `Missão adicionada: ${title}`);
  };

  const handleInvestigateRumor = (rumor: WorldRumorItem) => {
    const camp = activeCampaignRef.current;
    if (!camp) return;
    const title = rumor.questTitle || rumor.headline;
    const exists = camp.player.quests.some(
      (q) => q.title.toLowerCase() === title.toLowerCase(),
    );
    const nextQuests = exists
      ? camp.player.quests
      : [
          ...camp.player.quests,
          {
            id: `quest_rumor_${Date.now()}`,
            title,
            description: `${rumor.body}${rumor.locationHint ? ` (Local: ${rumor.locationHint})` : ''}`,
            status: 'active' as const,
            primary: false,
          },
        ];

    const updated: Campaign = {
      ...camp,
      interactionId: undefined,
      player: {
        ...camp.player,
        quests: nextQuests,
      },
      rumors: (camp.rumors ?? []).map((r) =>
        r.id === rumor.id ? { ...r, investigated: true } : r,
      ),
    };
    persistActiveCampaign(updated);
    void handleSendAction(
      rumor.hookAction,
      'investigate',
      'low',
      false,
      false,
      'wis',
    );
  };

  const handleExecuteCraft = async (request: CraftRequest) => {
    const camp = activeCampaignRef.current;
    if (!camp || isCrafting) return;
    setIsCrafting(true);
    try {
      const res = await requestCraftUpgrade(camp, request, settings, apiHealth);
      const latest = activeCampaignRef.current;
      if (!latest || latest.id !== camp.id) return;

      const stronghold =
        latest.stronghold ??
        defaultStrongholdForTheme(
          latest.world.primaryTheme,
          latest.currentLocation,
          latest.language,
        );
      const currentSupplies =
        stronghold.supplies ?? defaultBaseSuppliesForTheme(latest.world.primaryTheme);
      const nextMaterials = Math.max(
        0,
        currentSupplies.materials - Math.max(0, request.materialsSpent),
      );

      let nextInventory = [...latest.player.inventory];
      if (request.secondaryItemId) {
        nextInventory = nextInventory
          .map((item) =>
            item.id === request.secondaryItemId
              ? { ...item, quantity: item.quantity - 1 }
              : item,
          )
          .filter((item) => item.quantity > 0);
      }

      let nextVehicles = [...(stronghold.vehicles ?? [])];
      if (request.targetKind === 'item' && res.upgradedItem) {
        nextInventory = nextInventory.map((item) =>
          item.id === request.targetId
            ? {
                ...item,
                name: res.upgradedItem!.name,
                category: res.upgradedItem!.category,
                rarity: res.upgradedItem!.rarity,
                note: res.upgradedItem!.note,
                equipSlot: res.upgradedItem!.equipSlot ?? item.equipSlot,
                bonuses: res.upgradedItem!.bonuses ?? item.bonuses,
              }
            : item,
        );
      } else if (request.targetKind === 'vehicle' && res.upgradedVehicle) {
        nextVehicles = nextVehicles.map((veh) =>
          veh.id === request.targetId
            ? {
                ...veh,
                name: res.upgradedVehicle!.name,
                kind: res.upgradedVehicle!.kind,
                condition: Math.min(100, veh.condition + res.upgradedVehicle!.conditionGain),
                fuel: Math.min(100, veh.fuel + res.upgradedVehicle!.fuelGain),
                note: res.upgradedVehicle!.note,
              }
            : veh,
        );
      }

      const { nextPlayer: craftedPlayer } = applyStateChanges(
        {
          ...latest.player,
          inventory: nextInventory,
        },
        { xpGain: res.xpGain },
        latest.turnCount,
        { ruleset: latest.ruleset },
      );
      const nextMaxVigor = computeMaxHpForRuleset(latest.ruleset, craftedPlayer);

      const craftEntry: StoryEntry = {
        id: `entry_craft_${Date.now()}`,
        role: 'system',
        turn: latest.turnCount,
        text: `Bancada: ${res.narrativeLog}`,
        timestamp: Date.now(),
      };

      persistActiveCampaign({
        ...latest,
        interactionId: undefined,
        player: {
          ...craftedPlayer,
          maxVigor: nextMaxVigor,
          vigor: Math.min(nextMaxVigor, craftedPlayer.vigor),
        },
        stronghold: {
          ...stronghold,
          supplies: {
            ...currentSupplies,
            materials: nextMaterials,
          },
          vehicles: nextVehicles,
        },
        entries: [...latest.entries, craftEntry],
      });

      setLastCraftResult(res);
      pushToast(
        'base',
        res.upgradedVehicle
          ? `Veículo modificado: ${res.upgradedVehicle.name} (+${res.xpGain} XP)`
          : `Item aprimorado: ${res.upgradedItem?.name ?? 'Equipamento'} (+${res.xpGain} XP)`,
      );
    } catch (err) {
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Falha ao processar projeto na bancada.',
      );
    } finally {
      setIsCrafting(false);
    }
  };

  const handleBuildStrongholdUpgrade = (upgradeId: string) => {
    const camp = activeCampaignRef.current;
    if (!camp) return;
    const bp = STRONGHOLD_UPGRADE_CATALOG.find((u) => u.id === upgradeId);
    if (!bp) return;

    const stronghold =
      camp.stronghold ??
      defaultStrongholdForTheme(
        camp.world.primaryTheme,
        camp.currentLocation,
        camp.language,
      );

    if (stronghold.upgrades.some((u) => u.id === bp.id)) return;
    const currentAmount = camp.player.currency?.amount ?? 0;
    if (currentAmount < bp.cost) {
      pushToast('error', `Recursos insuficientes (${bp.cost} ${camp.player.currency?.label ?? 'Ouro'}).`);
      return;
    }

    const lang = camp.language;
    const builtUpgrade = {
      id: bp.id,
      name: bp.name[lang],
      description: bp.description[lang],
      bonus: bp.bonusLabel[lang],
      builtTurn: camp.turnCount,
    };

    const nextStronghold = {
      ...stronghold,
      defense: stronghold.defense + bp.defenseGain,
      upgrades: [...stronghold.upgrades, builtUpgrade],
    };

    const systemEntry: StoryEntry = {
      id: `entry_base_${Date.now()}`,
      role: 'system',
      turn: camp.turnCount,
      text: `Refúgio fortalecido: ${builtUpgrade.name} instalado (${builtUpgrade.bonus}).`,
      timestamp: Date.now(),
    };

    persistActiveCampaign({
      ...camp,
      stronghold: nextStronghold,
      player: {
        ...camp.player,
        currency: {
          ...camp.player.currency,
          amount: Math.max(0, currentAmount - bp.cost),
        },
      },
      entries: [...camp.entries, systemEntry],
    });
    pushToast('base', `Construído no Refúgio: ${builtUpgrade.name}`);
  };

  /* ============================================================================
   * MYTHOS 9.0 — Organization / Guild / Mercenaries / Squads Handlers
   * ============================================================================ */

  const handleFoundOrganization = (payload: {
    name: string;
    motto: string;
    archetype: OrganizationArchetype;
    founderNpcIds: string[];
  }) => {
    const camp = activeCampaignRef.current;
    if (!camp) return;

    const currentDay = camp.worldClock?.day ?? 1;
    const starterOps = createStarterOperationsForCampaign(camp);
    const starterRecruits = createStarterRecruitsForCampaign(camp);
    const initialMorale = payload.archetype === 'community' ? 80 : 70;

    const newOrg: OrganizationState = {
      name: payload.name,
      motto: payload.motto,
      archetype: payload.archetype,
      foundedTurn: camp.turnCount,
      renown: 20,
      tier: 1,
      morale: initialMorale,
      heat: 8,
      policies: {
        rations: 'standard',
        conduct: 'pragmatic',
        recruitment: payload.archetype === 'mercenary' ? 'contract' : 'selective',
      },
      outposts: [],
      operations: starterOps,
      recruitPool: starterRecruits,
      lastUpkeepDay: currentDay,
      historyLog: [
        {
          id: `org_found_${Date.now()}`,
          day: currentDay,
          turn: camp.turnCount,
          kind: 'founded',
          text: `${payload.name} foi fundada (${payload.founderNpcIds.length} fundadores).`,
        },
      ],
    };

    const founderSet = new Set(payload.founderNpcIds);
    const nextNpcs = camp.codex.npcs.map((n) => {
      if (!founderSet.has(n.id)) return n;
      const autoDiv: OrgDivisionId =
        n.assistAttribute === 'str' || n.assistAttribute === 'con'
          ? 'security'
          : n.assistAttribute === 'int'
            ? 'logistics'
            : n.assistAttribute === 'cha'
              ? 'diplomacy'
              : 'intel';
      return {
        ...n,
        orgMember: true,
        orgRank: (n.inParty ? 'lieutenant' : 'member') as NpcRecord['orgRank'],
        orgDivision: autoDiv,
        orgDuty: (n.inParty ? 'in_party' : 'available') as NpcRecord['orgDuty'],
        dailyWage: n.dailyWage ?? 0,
      };
    });

    const sysEntry: StoryEntry = {
      id: `entry_org_found_${Date.now()}`,
      role: 'system',
      turn: camp.turnCount,
      text: `👑 Organização fundada: ${payload.name} — “${payload.motto}”.`,
      timestamp: Date.now(),
    };

    persistActiveCampaign({
      ...camp,
      interactionId: undefined,
      organization: newOrg,
      codex: {
        ...camp.codex,
        npcs: nextNpcs,
        canonFacts: [
          ...camp.codex.canonFacts,
          {
            id: `fact_org_${Date.now()}`,
            text: `${camp.player.name} fundou a organização "${payload.name}" (${payload.motto}).`,
            turn: camp.turnCount,
            pinned: true,
          },
        ],
      },
      entries: [...camp.entries, sysEntry],
    });
    pushToast('faction', `Organização fundada: ${payload.name}!`);
  };

  const handleUpdateOrgPolicies = (patch: Partial<OrgPolicies>) => {
    const camp = activeCampaignRef.current;
    if (!camp?.organization) return;
    persistActiveCampaign({
      ...camp,
      interactionId: undefined,
      organization: {
        ...camp.organization,
        policies: { ...camp.organization.policies, ...patch },
      },
    });
    pushToast('info', 'Leis internas da organização atualizadas.');
  };

  const handleAssignOrgDivision = (npcId: string, division: OrgDivisionId) => {
    const camp = activeCampaignRef.current;
    if (!camp?.organization) return;
    const target = camp.codex.npcs.find((n) => n.id === npcId);
    if (!target) return;

    persistActiveCampaign({
      ...camp,
      codex: {
        ...camp.codex,
        npcs: camp.codex.npcs.map((n) =>
          n.id === npcId ? { ...n, orgDivision: division } : n,
        ),
      },
    });
    pushToast('info', `${target.name} alocado(a) em ${ORG_DIVISION_META[division].short}.`);
  };

  const handleInviteNpcToOrg = (npcId: string, division: OrgDivisionId) => {
    const camp = activeCampaignRef.current;
    if (!camp?.organization) return;
    const target = camp.codex.npcs.find((n) => n.id === npcId);
    if (!target) return;

    persistActiveCampaign({
      ...camp,
      interactionId: undefined,
      codex: {
        ...camp.codex,
        npcs: camp.codex.npcs.map((n) =>
          n.id === npcId
            ? {
                ...n,
                orgMember: true,
                orgRank: n.inParty ? ('lieutenant' as const) : ('member' as const),
                orgDivision: division,
                orgDuty: n.inParty ? ('in_party' as const) : ('available' as const),
                dailyWage: n.dailyWage ?? 0,
              }
            : n,
        ),
      },
      organization: {
        ...camp.organization,
        historyLog: [
          {
            id: `org_inv_${Date.now()}`,
            day: camp.worldClock?.day ?? 1,
            turn: camp.turnCount,
            kind: 'recruit' as const,
            text: `${target.name} juntou-se à organização (${ORG_DIVISION_META[division].short}).`,
          },
          ...camp.organization.historyLog,
        ].slice(0, 24),
      },
    });
    pushToast('npc', `${target.name} entrou para ${camp.organization.name}!`);
  };

  const handleDismissOrgMember = (npcId: string) => {
    const camp = activeCampaignRef.current;
    if (!camp?.organization) return;
    const target = camp.codex.npcs.find((n) => n.id === npcId);
    if (!target) return;

    persistActiveCampaign({
      ...camp,
      codex: {
        ...camp.codex,
        npcs: camp.codex.npcs.map((n) =>
          n.id === npcId
            ? { ...n, orgMember: false, orgDuty: undefined, orgDivision: undefined }
            : n,
        ),
      },
    });
    pushToast('info', `${target.name} foi dispensado(a) da organização.`);
  };

  const handleRefreshOrgRecruits = async () => {
    const camp = activeCampaignRef.current;
    if (!camp?.organization || isLoadingOrgRecruits) return;
    setIsLoadingOrgRecruits(true);
    try {
      const res = await requestOrgRecruits(camp, settings, apiHealth);
      const latest = activeCampaignRef.current;
      if (!latest?.organization || latest.id !== camp.id) return;
      const now = Date.now();
      const pool: OrgRecruitCandidate[] = res.candidates.map((c, idx) => ({
        ...c,
        id: `rec_${now}_${idx}`,
      }));
      persistActiveCampaign({
        ...latest,
        organization: {
          ...latest.organization,
          recruitPool: pool,
        },
      });
      pushToast('npc', `${pool.length} novos candidatos disponíveis para recrutamento!`);
    } catch (err) {
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Falha ao buscar candidatos.',
      );
    } finally {
      setIsLoadingOrgRecruits(false);
    }
  };

  const handleHireOrgCandidate = (candidate: OrgRecruitCandidate) => {
    const camp = activeCampaignRef.current;
    if (!camp?.organization) return;
    const cost =
      camp.organization.policies.recruitment === 'open'
        ? Math.round(candidate.hireCost * 0.75)
        : candidate.hireCost;
    const currentAmount = camp.player.currency?.amount ?? 0;
    if (currentAmount < cost) {
      pushToast('error', `Recursos insuficientes (${cost} ${camp.player.currency?.label ?? 'Ouro'}).`);
      return;
    }

    const recruitLevel = Math.max(1, Math.min(camp.player.level, 5));
    const draftNpc = {
      role: candidate.role,
      level: recruitLevel,
      attributes: candidate.attributes,
      assistAttribute: ORG_DIVISION_META[candidate.recommendedDivision].primaryAttr,
    };
    const maxHp = computeNpcMaxHpForRuleset(camp.ruleset, draftNpc);
    const newNpc: NpcRecord = {
      id: `npc_merc_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      name: candidate.name,
      role: candidate.role,
      stance: 'ally',
      status: 'alive',
      affinity: 25,
      relationship: 'friend',
      inParty: false,
      assistAttribute: ORG_DIVISION_META[candidate.recommendedDivision].primaryAttr,
      assistSpecialty: candidate.role,
      age: candidate.age,
      height: candidate.height,
      personality: candidate.personality,
      currentMood: 'Pronto para o serviço',
      level: recruitLevel,
      vigor: maxHp,
      maxVigor: maxHp,
      armorClass: isDndRuleset(camp) ? computeNpcArmorClass(draftNpc) : undefined,
      attributes: candidate.attributes,
      skills: candidate.skills,
      traits: candidate.traits,
      likes: [],
      dislikes: [],
      bondMemories: [
        {
          turn: camp.turnCount,
          text: `Recrutado(a) para ${camp.organization.name}.`,
          approved: true,
        },
      ],
      orgMember: true,
      orgRank: candidate.dailyWage > 0 ? 'hired_merc' : 'specialist',
      orgDivision: candidate.recommendedDivision,
      orgDuty: 'available',
      dailyWage: candidate.dailyWage,
      hiddenFlaw: candidate.visibleFlaw,
      lastSeenLocation: camp.currentLocation,
      notes: candidate.pitch,
      firstMetTurn: camp.turnCount,
    };

    persistActiveCampaign({
      ...camp,
      interactionId: undefined,
      player: {
        ...camp.player,
        currency: {
          ...camp.player.currency,
          amount: Math.max(0, currentAmount - cost),
        },
      },
      codex: {
        ...camp.codex,
        npcs: [newNpc, ...camp.codex.npcs],
      },
      organization: {
        ...camp.organization,
        recruitPool: camp.organization.recruitPool.filter(
          (c) => c.id !== candidate.id,
        ),
        historyLog: [
          {
            id: `org_hire_${Date.now()}`,
            day: camp.worldClock?.day ?? 1,
            turn: camp.turnCount,
            kind: 'recruit' as const,
            text: `Recrutado(a): ${candidate.name} (${candidate.role}) por ${cost} ${camp.player.currency?.label ?? 'Ouro'}.`,
          },
          ...camp.organization.historyLog,
        ].slice(0, 24),
      },
    });
    pushToast('npc', `${candidate.name} recrutado(a) para ${camp.organization.name}!`);
  };

  const handleRefreshOrgOperations = async () => {
    const camp = activeCampaignRef.current;
    if (!camp?.organization || isLoadingOrgOps) return;
    setIsLoadingOrgOps(true);
    try {
      const res = await requestOrgOperations(camp, settings, apiHealth);
      const latest = activeCampaignRef.current;
      if (!latest?.organization || latest.id !== camp.id) return;
      const now = Date.now();
      const preserved = latest.organization.operations.filter(
        (o) =>
          o.status === 'active' ||
          o.status === 'ready_to_claim' ||
          o.kind === 'rescue',
      );
      const fresh: OrgOperation[] = res.operations.map((o, idx) => ({
        ...o,
        id: `op_${now}_${idx}`,
        status: 'available',
      }));
      persistActiveCampaign({
        ...latest,
        organization: {
          ...latest.organization,
          operations: [...preserved, ...fresh],
        },
      });
      pushToast('quest', `${fresh.length} novas operações disponíveis no Quadro!`);
    } catch (err) {
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Falha ao gerar contratos.',
      );
    } finally {
      setIsLoadingOrgOps(false);
    }
  };

  const handleDispatchOrgSquad = (
    opId: string,
    npcIds: string[],
    vehicleId?: string,
  ) => {
    const camp = activeCampaignRef.current;
    if (!camp?.organization || npcIds.length === 0) return;
    const op = camp.organization.operations.find((o) => o.id === opId);
    if (!op) return;

    const squadNpcs = camp.codex.npcs.filter((n) => npcIds.includes(n.id));
    const vehicle = (camp.stronghold?.vehicles ?? []).find(
      (v) => v.id === vehicleId,
    );
    const est = estimateOperationSuccess(
      op,
      camp.organization,
      squadNpcs,
      vehicle,
      camp.codex.factions,
    );

    const npcSet = new Set(npcIds);
    const nextNpcs = camp.codex.npcs.map((n) =>
      npcSet.has(n.id)
        ? { ...n, orgDuty: 'on_mission' as const, inParty: false }
        : n,
    );

    const nextVehicles = (camp.stronghold?.vehicles ?? []).map((v) =>
      v.id === vehicleId
        ? { ...v, fuel: Math.max(0, v.fuel - 15) }
        : v,
    );

    const nextOps = camp.organization.operations.map((o) =>
      o.id === opId
        ? {
            ...o,
            status: 'active' as const,
            assignedNpcIds: npcIds,
            assignedVehicleId: vehicleId,
            hoursRemaining: est.effectiveHours,
            turnsRemaining: est.effectiveTurns,
            startedTurn: camp.turnCount,
          }
        : o,
    );

    persistActiveCampaign({
      ...camp,
      interactionId: undefined,
      codex: { ...camp.codex, npcs: nextNpcs },
      stronghold: camp.stronghold
        ? { ...camp.stronghold, vehicles: nextVehicles }
        : camp.stronghold,
      organization: {
        ...camp.organization,
        operations: nextOps,
        historyLog: [
          {
            id: `org_disp_${Date.now()}`,
            day: camp.worldClock?.day ?? 1,
            turn: camp.turnCount,
            kind: 'operation' as const,
            text: `Esquadrão (${squadNpcs.map((n) => n.name).join(', ')}) despachado para "${op.title}".`,
          },
          ...camp.organization.historyLog,
        ].slice(0, 24),
      },
    });
    pushToast(
      'quest',
      `Esquadrão despachado para ${op.targetLocationName} (${est.effectiveHours}h / ${est.effectiveTurns}t)!`,
    );
  };

  const handleResolveOrgOperation = async (opId: string) => {
    const camp = activeCampaignRef.current;
    if (!camp?.organization || resolvingOrgOpId) return;
    const op = camp.organization.operations.find((o) => o.id === opId);
    if (!op) return;

    setResolvingOrgOpId(opId);
    try {
      const squadIds = op.assignedNpcIds ?? [];
      const squadNpcs = camp.codex.npcs.filter((n) => squadIds.includes(n.id));
      const vehicle = (camp.stronghold?.vehicles ?? []).find(
        (v) => v.id === op.assignedVehicleId,
      );

      const det = resolveOperationDeterministically(
        op,
        camp.organization,
        squadNpcs,
        vehicle,
        camp.codex.factions,
      );

      const injuredNpc = squadNpcs.find((n) => n.id === det.injuredNpcId);
      const capturedNpc = squadNpcs.find((n) => n.id === det.capturedNpcId);

      const report = await requestOrgOperationReport(
        camp,
        {
          operation: op,
          outcomeGrade: det.grade,
          rollSummary: det.rollSummary,
          squadNames: squadNpcs.map((n) => n.name),
          vehicleName: vehicle?.name,
          injuredName: injuredNpc?.name,
          capturedName: capturedNpc?.name,
        },
        settings,
        apiHealth,
      );

      const latest = activeCampaignRef.current;
      if (!latest?.organization || latest.id !== camp.id) return;

      const squadSet = new Set(squadIds);
      const nextNpcs = latest.codex.npcs.map((n) => {
        if (det.rescuedNpcId && n.id === det.rescuedNpcId) {
          return {
            ...n,
            orgDuty: 'available' as const,
            injuryNote: undefined,
            recoveryHoursLeft: 0,
            affinity: Math.min(100, (n.affinity ?? 0) + 18),
          };
        }
        if (!squadSet.has(n.id)) return n;
        if (det.capturedNpcId === n.id) {
          return { ...n, orgDuty: 'captured' as const };
        }
        if (det.injuredNpcId === n.id) {
          return {
            ...n,
            orgDuty: 'injured' as const,
            injuryNote: det.injuryNote,
            recoveryHoursLeft: 24,
            vigor: Math.max(1, Math.round((n.maxVigor ?? 10) * 0.45)),
          };
        }
        const levelUp = det.grade === 'critical' && (n.level ?? 1) < MAX_LEVEL;
        return {
          ...n,
          orgDuty: 'available' as const,
          level: levelUp ? (n.level ?? 1) + 1 : n.level,
        };
      });

      const stronghold =
        latest.stronghold ??
        defaultStrongholdForTheme(
          latest.world.primaryTheme,
          latest.currentLocation,
          latest.language,
        );
      const nextSupplies = {
        ...(stronghold.supplies ??
          defaultBaseSuppliesForTheme(latest.world.primaryTheme)),
      };
      for (const k of SUPPLY_KEYS) {
        const d = det.supplyDeltas[k];
        if (typeof d === 'number' && d > 0) {
          nextSupplies[k] = (nextSupplies[k] ?? 0) + d;
        }
      }

      const nextRenown = latest.organization.renown + det.renownGain;
      const { tier: nextTier } = computeOrgTierFromRenown(nextRenown);
      const nextMorale = Math.max(
        0,
        Math.min(100, latest.organization.morale + det.moraleDelta),
      );
      const nextHeat = Math.max(
        0,
        Math.min(100, latest.organization.heat + det.heatDelta),
      );

      let nextOps = latest.organization.operations.map((o) =>
        o.id === opId
          ? {
              ...o,
              status:
                det.grade === 'disaster'
                  ? ('failed' as const)
                  : ('completed' as const),
              outcomeGrade: det.grade,
              outcomeRollSummary: det.rollSummary,
              outcomeLog: report.narrativeReport,
            }
          : o,
      );
      if (det.spawnRescueOp) {
        nextOps = [det.spawnRescueOp, ...nextOps];
      }

      const nextFacts = report.canonFact
        ? [
            ...latest.codex.canonFacts,
            {
              id: `fact_op_${Date.now()}`,
              text: report.canonFact,
              turn: latest.turnCount,
            },
          ]
        : latest.codex.canonFacts;

      const sysEntry: StoryEntry = {
        id: `entry_op_res_${Date.now()}`,
        role: 'system',
        turn: latest.turnCount,
        text: `📋 Relatório de Esquadrão (${op.title}): ${det.rollSummary}${det.currencyDelta > 0 ? ` · +${det.currencyDelta} ${latest.player.currency?.label ?? 'Ouro'}` : ''} · +${det.renownGain} Renome.`,
        timestamp: Date.now(),
      };

      persistActiveCampaign({
        ...latest,
        interactionId: undefined,
        player: {
          ...latest.player,
          currency: {
            ...latest.player.currency,
            amount: (latest.player.currency?.amount ?? 0) + det.currencyDelta,
          },
        },
        stronghold: {
          ...stronghold,
          supplies: nextSupplies,
        },
        codex: {
          ...latest.codex,
          npcs: nextNpcs,
          canonFacts: nextFacts,
        },
        organization: {
          ...latest.organization,
          renown: nextRenown,
          tier: nextTier,
          morale: nextMorale,
          heat: nextHeat,
          operations: nextOps,
          historyLog: [
            {
              id: `org_rep_${Date.now()}`,
              day: latest.worldClock?.day ?? 1,
              turn: latest.turnCount,
              kind: 'operation' as const,
              text: `${op.title}: ${det.rollSummary}.`,
            },
            ...latest.organization.historyLog,
          ].slice(0, 24),
        },
        entries: [...latest.entries, sysEntry],
      });

      setLastOrgReportBanner({
        opTitle: op.title,
        grade: det.grade,
        rollSummary: det.rollSummary,
        narrativeReport: report.narrativeReport,
        squadQuote: report.squadQuote,
      });

      if (det.spawnRescueOp) {
        pushToast('crisis', `⚠ ${capturedNpc?.name} foi capturado(a)! Missão de Resgate aberta!`);
      } else {
        pushToast('quest', `Operação resolvida: ${op.title} (+${det.renownGain} Renome)`);
      }
    } catch (err) {
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Falha ao gerar relatório da operação.',
      );
    } finally {
      setResolvingOrgOpId(null);
    }
  };

  const handlePlayOrgOperationInChat = (op: OrgOperation) => {
    const camp = activeCampaignRef.current;
    if (!camp?.organization) return;
    persistActiveCampaign({
      ...camp,
      organization: {
        ...camp.organization,
        operations: camp.organization.operations.filter((o) => o.id !== op.id),
      },
    });
    void handleSendAction(
      `Assumo pessoalmente a liderança da operação "${op.title}" em ${op.targetLocationName} pela nossa organização (${camp.organization.name}): ${op.briefing}`,
      op.kind === 'diplomacy'
        ? 'diplomatic'
        : op.kind === 'recon'
          ? 'stealth'
          : 'bold',
      op.difficulty === 'low' ? 'low' : 'medium',
      false,
      false,
      op.recommendedAttributes[0] ?? 'wis',
    );
  };

  const handleClaimOrgOutpost = (
    loc: LocationRecord,
    specialty: OrgOutpostSpecialty,
  ) => {
    const camp = activeCampaignRef.current;
    if (!camp?.organization) return;
    const specMeta = ORG_OUTPOST_SPECIALTY_META[specialty];
    const stronghold =
      camp.stronghold ??
      defaultStrongholdForTheme(
        camp.world.primaryTheme,
        camp.currentLocation,
        camp.language,
      );
    const curSupplies =
      stronghold.supplies ?? defaultBaseSuppliesForTheme(camp.world.primaryTheme);
    const curCurrency = camp.player.currency?.amount ?? 0;

    if (
      curSupplies.materials < specMeta.claimCostMaterials ||
      curCurrency < specMeta.claimCostCurrency
    ) {
      pushToast('error', 'Materiais ou recursos insuficientes para reivindicar este posto.');
      return;
    }

    const newOutpost = {
      id: `outpost_${Date.now()}`,
      locationId: loc.id,
      locationName: loc.name,
      specialty,
      dailyYield: specMeta.baseYield,
      defenseBonus: 6,
      garrisonNpcIds: [],
      establishedTurn: camp.turnCount,
    };

    const nextRenown = camp.organization.renown + 25;
    const { tier } = computeOrgTierFromRenown(nextRenown);

    persistActiveCampaign({
      ...camp,
      interactionId: undefined,
      player: {
        ...camp.player,
        currency: {
          ...camp.player.currency,
          amount: Math.max(0, curCurrency - specMeta.claimCostCurrency),
        },
      },
      stronghold: {
        ...stronghold,
        supplies: {
          ...curSupplies,
          materials: Math.max(0, curSupplies.materials - specMeta.claimCostMaterials),
        },
      },
      organization: {
        ...camp.organization,
        renown: nextRenown,
        tier,
        outposts: [...camp.organization.outposts, newOutpost],
        historyLog: [
          {
            id: `org_out_${Date.now()}`,
            day: camp.worldClock?.day ?? 1,
            turn: camp.turnCount,
            kind: 'outpost' as const,
            text: `Posto Avançado estabelecido em ${loc.name} (${specMeta.label}).`,
          },
          ...camp.organization.historyLog,
        ].slice(0, 24),
      },
    });
    pushToast('location', `Posto Avançado reivindicado: ${loc.name}!`);
  };

  const handleReleaseOrgOutpost = (outpostId: string) => {
    const camp = activeCampaignRef.current;
    if (!camp?.organization) return;
    persistActiveCampaign({
      ...camp,
      organization: {
        ...camp.organization,
        outposts: camp.organization.outposts.filter((o) => o.id !== outpostId),
      },
    });
    pushToast('info', 'Posto avançado desmobilizado.');
  };

  const handleSetFactionTreaty = (factionId: string, treaty: FactionTreaty) => {
    const camp = activeCampaignRef.current;
    if (!camp?.organization) return;
    const fac = camp.codex.factions.find((f) => f.id === factionId);
    if (!fac) return;

    const nextStanding =
      treaty === 'alliance'
        ? ('allied' as const)
        : treaty === 'war'
          ? ('hostile' as const)
          : fac.standing;

    persistActiveCampaign({
      ...camp,
      interactionId: undefined,
      codex: {
        ...camp.codex,
        factions: camp.codex.factions.map((f) =>
          f.id === factionId ? { ...f, treaty, standing: nextStanding } : f,
        ),
      },
      organization: {
        ...camp.organization,
        heat:
          treaty === 'war'
            ? Math.min(100, camp.organization.heat + 12)
            : camp.organization.heat,
        historyLog: [
          {
            id: `org_dip_${Date.now()}`,
            day: camp.worldClock?.day ?? 1,
            turn: camp.turnCount,
            kind: 'diplomacy' as const,
            text: `${fac.name}: status diplomático alterado para ${FACTION_TREATY_META[treaty].label}.`,
          },
          ...camp.organization.historyLog,
        ].slice(0, 24),
      },
    });
    pushToast('faction', `${fac.name}: ${FACTION_TREATY_META[treaty].label}`);
  };

  const handleNegotiateFactionInChat = (faction: FactionRecord) => {
    const camp = activeCampaignRef.current;
    if (!camp) return;
    const orgPart = camp.organization ? ` em nome de ${camp.organization.name}` : '';
    void handleSendAction(
      `Busco contato diplomático com representantes de ${faction.name}${orgPart} para negociar um acordo ou aliviar tensões na região.`,
      'diplomatic',
      'low',
      false,
      false,
      'cha',
    );
  };

  const handleUpdateClock = (nextClock: WorldClock, toastMessage?: string) => {
    const camp = activeCampaignRef.current;
    if (!camp) return;
    persistActiveCampaign({
      ...camp,
      worldClock: nextClock,
    });
    if (toastMessage) {
      pushToast('time', toastMessage);
    }
  };

  const handleSyncMapGeocode = async () => {
    const camp = activeCampaignRef.current;
    if (!camp || isSyncingMapGeo) return;
    setIsSyncingMapGeo(true);
    try {
      const geo = await requestMapGeocode(camp, settings, apiHealth);
      const latest = activeCampaignRef.current;
      if (!latest || latest.id !== camp.id) return;

      const geoById = new Map(geo.locations.map((item) => [item.id, item]));
      const nextLocations = latest.codex.locations.map((loc) => {
        const match = geoById.get(loc.id);
        if (!match) return loc;
        return {
          ...loc,
          region: match.region || loc.region,
          lat: typeof match.lat === 'number' ? match.lat : loc.lat,
          lng: typeof match.lng === 'number' ? match.lng : loc.lng,
        };
      });

      const updated: Campaign = {
        ...latest,
        mapMeta: {
          ...latest.mapMeta,
          isRealWorld: geo.isRealWorld,
          realWorldRegion: geo.realWorldRegion,
          centerLat: geo.centerLat ?? latest.mapMeta?.centerLat,
          centerLng: geo.centerLng ?? latest.mapMeta?.centerLng,
          defaultZoom: geo.defaultZoom ?? latest.mapMeta?.defaultZoom ?? 11,
          lastSyncedCount: nextLocations.length,
        },
        codex: {
          ...latest.codex,
          locations: nextLocations,
        },
      };

      persistActiveCampaign(updated);
      const mappedCount = geo.locations.filter(
        (l) => typeof l.lat === 'number' && typeof l.lng === 'number',
      ).length;
      pushToast(
        'info',
        geo.isRealWorld
          ? `Mapa Real sincronizado: ${mappedCount} locais posicionados em ${geo.realWorldRegion}.`
          : `Atlas organizado: ${geo.locations.length} locais agrupados por região em ${geo.realWorldRegion}.`,
      );
    } catch (err) {
      pushToast(
        'error',
        err instanceof Error
          ? err.message
          : 'Não foi possível sincronizar o GPS do Atlas.',
      );
    } finally {
      setIsSyncingMapGeo(false);
    }
  };

  const handleGenerateFictionalMapArt = async () => {
    const camp = activeCampaignRef.current;
    if (!camp || isGeneratingMapArt) return;
    setIsGeneratingMapArt(true);
    try {
      const art = await requestFictionalMapArt(camp, settings, apiHealth);
      const latest = activeCampaignRef.current;
      if (!latest || latest.id !== camp.id) return;

      persistActiveCampaign({
        ...latest,
        mapMeta: {
          ...latest.mapMeta,
          isRealWorld: latest.mapMeta?.isRealWorld ?? false,
          customArtMapUrl: art.dataUrl,
        },
      });
      pushToast('info', 'Arte cartográfica do mundo gerada com sucesso!');
    } catch (err) {
      pushToast(
        'error',
        err instanceof Error
          ? err.message
          : 'Falha ao gerar arte cartográfica do mapa.',
      );
    } finally {
      setIsGeneratingMapArt(false);
    }
  };

  const handleDeleteLocation = (locId: string) => {
    const camp = activeCampaignRef.current;
    if (!camp) return;
    const target = camp.codex.locations.find((l) => l.id === locId);
    if (!target) return;
    const nextLocations = camp.codex.locations.filter((l) => l.id !== locId);
    if (nextLocations.length === 0) return;

    persistActiveCampaign({
      ...camp,
      codex: {
        ...camp.codex,
        locations: nextLocations,
      },
    });
    pushToast('info', `Marcador "${target.name}" removido do Atlas.`);
  };

  const handleConsumeItemNow = (itemId: string) => {
    const camp = activeCampaignRef.current;
    if (!camp) return;
    const target = camp.player.inventory.find((i) => i.id === itemId);
    if (!target || target.category !== 'consumable') return;

    const dndMode = isDndRuleset(camp);
    const activeClash = camp.activeClash?.status === 'active' ? camp.activeClash : null;

    if (activeClash && dndMode && camp.player.dnd) {
      if (activeClash.bonusActionUsed) {
        pushToast('error', 'Ação Bônus já usada nesta rodada D&D 5.2!');
        return;
      }
      const res = executeDnd52BonusAction(camp, activeClash, {
        kind: 'potion',
        item: target,
      });
      if (!res) return;
      persistActiveCampaign({
        ...camp,
        player: res.nextPlayer,
        activeClash: res.nextClash,
      });
      setArenaBeats([
        {
          id: `bonus_pot_${Date.now()}`,
          actorSide: 'hero',
          actorId: 'player',
          targetSide: 'hero',
          targetId: 'player',
          vfx: res.vfx ?? 'heal',
          caption: res.caption,
          floatingText: res.floatingText,
          floatingColor: res.floatingColor,
        },
      ]);
      setArenaBattleNonce((n) => n + 1);
      pushToast('vigor', res.caption);
      return;
    }

    if (activeClash && activeClash.bonusItemUsedRound === activeClash.round) {
      pushToast(
        'error',
        'Ação Bônus já usada nesta rodada do confronto (máx. 1 consumível/rodada).',
      );
      return;
    }

    const healAmount = dndMode
      ? rollDiceFormula(target.dndStats?.healDice ?? '2d4+2').total +
        (camp.player.dnd?.featIds.includes('field_medic')
          ? getProficiencyBonus(camp.player.level)
          : 0)
      : 25;
    const { nextPlayer } = applyStateChanges(
      camp.player,
      {
        removeItems: [target.name],
        vigorDelta: healAmount,
      },
      camp.turnCount,
      { ruleset: camp.ruleset },
    );
    const unitLabel = dndMode ? 'PV' : 'Vigor';
    const sysEntry: StoryEntry = {
      id: `entry_use_${Date.now()}`,
      role: 'system',
      turn: camp.turnCount,
      text: `Você consumiu ${target.name} (+${healAmount} ${unitLabel})${activeClash ? ' como Ação Bônus no confronto.' : '.'}`,
      timestamp: Date.now(),
    };
    persistActiveCampaign({
      ...camp,
      player: nextPlayer,
      status: evaluateStatus(nextPlayer.vigor, nextPlayer.tension),
      activeClash: activeClash
        ? { ...activeClash, bonusItemUsedRound: activeClash.round }
        : camp.activeClash,
      entries: [...camp.entries, sysEntry],
    });
    pushToast(
      'vigor',
      `${target.name} usado · +${healAmount} ${unitLabel}${activeClash ? ' (Ação Bônus)' : ''}`,
    );
  };

  // MYTHOS 11.5 — Instant JRPG Battle Arena Lifecycle Handlers
  const handleStartClash = async (opts: {
    requestedArchetype?: ClashArchetype;
    customPremise?: string;
  }) => {
    const camp = activeCampaignRef.current;
    if (!camp || isStartingClash || camp.status !== 'active') return;
    setIsStartingClash(true);
    try {
      const initRes = await requestClashInit(camp, settings, apiHealth, opts);
      const latest = activeCampaignRef.current;
      if (!latest || latest.id !== camp.id) return;

      const hydrated = hydrateClashState(latest, initRes);
      const withMark = recordTimelineCheckpoint(
        {
          ...latest,
          activeClash: hydrated,
        },
        {
          kind: 'manual_mark',
          title: `Início de Confronto: ${hydrated.title}`,
          choiceSummary: `${CLASH_ARCHETYPE_META[hydrated.archetype].label} · ${hydrated.objective}`,
        },
      );
      setSuggestedClash(null);
      setClashLauncherOpen(false);
      setArenaDiceRoll(null);
      setArenaBeats([]);
      setArenaBattleNonce(0);
      setLastArenaTurnSnapshot(null);
      setArenaBossArtUrl(null);
      setIsFinishingClash(false);
      persistActiveCampaign(withMark);
    } catch (err) {
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Falha ao iniciar confronto tático.',
      );
    } finally {
      setIsStartingClash(false);
    }
  };

  const handleSelectClashTarget = (enemyId: string) => {
    const camp = activeCampaignRef.current;
    if (!camp?.activeClash || camp.activeClash.status !== 'active') return;
    persistActiveCampaign({
      ...camp,
      activeClash: {
        ...camp.activeClash,
        selectedTargetId: enemyId,
      },
    });
  };

  const handleChangeClashAllyDirective = (
    npcId: string,
    directive: ClashAllyDirective,
  ) => {
    const camp = activeCampaignRef.current;
    if (!camp?.activeClash || camp.activeClash.status !== 'active') return;
    persistActiveCampaign({
      ...camp,
      activeClash: {
        ...camp.activeClash,
        allies: camp.activeClash.allies.map((a) =>
          a.npcId === npcId ? { ...a, directive } : a,
        ),
      },
    });
  };

  /**
   * Instant JRPG turn inside ClashBattleArena: resolves d20, posture/damage,
   * party directives, and enemy counter-attacks in < 2ms with zero AI wait!
   */
  const handleArenaFreeMove = (zone: ClashZone) => {
    const camp = activeCampaignRef.current;
    const clash = camp?.activeClash;
    if (!camp || !clash || clash.status !== 'active') return;
    const res = executeDnd52FreeMove(camp, clash, zone);
    if (!res) {
      pushToast('error', 'Deslocamento já usado neste turno ou impedido por condição.');
      return;
    }
    persistActiveCampaign({
      ...camp,
      player: res.nextPlayer,
      activeClash: res.nextClash,
    });
    setArenaBeats([
      {
        id: `move_${Date.now()}`,
        actorSide: 'hero',
        actorId: 'player',
        targetSide: 'hero',
        targetId: res.targetId,
        vfx: res.vfx ?? 'shield',
        caption: res.caption,
        floatingText: res.floatingText,
        floatingColor: res.floatingColor,
      },
    ]);
    setArenaBattleNonce((n) => n + 1);
  };

  const handleArenaBonusResource = (resourceId: string) => {
    const camp = activeCampaignRef.current;
    const clash = camp?.activeClash;
    if (!camp || !clash || clash.status !== 'active') return;
    const res = executeDnd52BonusAction(camp, clash, { kind: 'resource', resourceId });
    if (!res) {
      pushToast('error', 'Recurso indisponível ou Ação Bônus já gasta neste turno.');
      return;
    }
    persistActiveCampaign({
      ...camp,
      player: res.nextPlayer,
      activeClash: res.nextClash,
    });
    setArenaBeats([
      {
        id: `res_${Date.now()}`,
        actorSide: 'hero',
        actorId: 'player',
        targetSide: res.targetId && res.targetId !== 'player' ? 'enemy' : 'hero',
        targetId: res.targetId ?? 'player',
        vfx: res.vfx ?? 'heal',
        caption: res.caption,
        floatingText: res.floatingText,
        floatingColor: res.floatingColor,
      },
    ]);
    setArenaBattleNonce((n) => n + 1);
  };

  const handleArenaBonusSpell = (spellId: string) => {
    const camp = activeCampaignRef.current;
    const clash = camp?.activeClash;
    if (!camp || !clash || clash.status !== 'active') return;
    const res = executeDnd52BonusAction(camp, clash, { kind: 'spell', spellId });
    if (!res) {
      pushToast('error', 'Espaço indisponível ou Ação Bônus já usada neste turno.');
      return;
    }
    persistActiveCampaign({
      ...camp,
      player: res.nextPlayer,
      activeClash: res.nextClash,
    });
    setArenaBeats([
      {
        id: `bsp_${Date.now()}`,
        actorSide: 'hero',
        actorId: 'player',
        targetSide: res.targetId && res.targetId !== 'player' ? 'enemy' : 'hero',
        targetId: res.targetId ?? 'player',
        vfx: res.vfx ?? 'psychic',
        caption: res.caption,
        floatingText: res.floatingText,
        floatingColor: res.floatingColor,
      },
    ]);
    setArenaBattleNonce((n) => n + 1);
  };

  const handleArenaToggleReaction = () => {
    const camp = activeCampaignRef.current;
    const clash = camp?.activeClash;
    if (!camp || !clash || clash.status !== 'active') return;
    const dnd = camp.player.dnd;
    const canShield = Boolean(dnd?.preparedSpellIds.includes('shield'));
    const canUncanny = Boolean(dnd?.classId === 'rogue' && camp.player.level >= 5);
    const defaultReaction = canShield ? 'shield' : canUncanny ? 'uncanny_dodge' : null;
    const nextReaction = clash.preArmedReaction ? null : defaultReaction;
    persistActiveCampaign({
      ...camp,
      activeClash: {
        ...clash,
        preArmedReaction: nextReaction,
      },
    });
  };

  const handleRerollArenaWithInspiration = () => {
    if (!lastArenaTurnSnapshot) return;
    const { campSnapshot, payload, vfx } = lastArenaTurnSnapshot;
    const currentInsp = campSnapshot.player.inspiration ?? 0;
    if (currentInsp <= 0) {
      pushToast('error', 'Sem Inspiração Heroica disponível.');
      return;
    }
    const spentCamp: Campaign = structuredClone(campSnapshot);
    spentCamp.player.inspiration = Math.max(0, currentInsp - 1);
    activeCampaignRef.current = spentCamp;
    setLastArenaTurnSnapshot(null);
    pushToast('inspiration', '★ Inspiração Heroica gasta — rerrolando rodada na Arena!');
    handleExecuteInstantClashTurn(payload, vfx, true);
  };

  const handleExecuteInstantClashTurn = (
    payload: ClashActionPayload,
    vfx: ClashVfxKind,
    isInspirationReroll = false,
  ) => {
    const camp = activeCampaignRef.current;
    const beforeClash = camp?.activeClash;
    if (!camp || !beforeClash || beforeClash.status !== 'active') return;

    if (!isInspirationReroll) {
      setLastArenaTurnSnapshot({
        campSnapshot: structuredClone(camp),
        payload,
        vfx,
      });
    }

    // MYTHOS 12.0 — Official D&D 5.2 (2024) Battle Resolver for Combat & Siege!
    if (
      isDndRuleset(camp) &&
      camp.player.dnd &&
      beforeClash.archetype !== 'social' &&
      beforeClash.archetype !== 'chase'
    ) {
      const resolution = resolveDnd52ClashRound({
        campaign: camp,
        clash: beforeClash,
        actionText: payload.label,
        clashAction: payload,
      });
      const diceRoll = resolution.diceRoll
        ? { ...resolution.diceRoll, rerolledWithInspiration: isInspirationReroll }
        : undefined;

      const beats = extractClashChoreographyBeats(
        beforeClash,
        resolution as unknown as ClashRoundResolution,
        vfx,
        diceRoll,
      );

      const nextTension = Math.max(
        0,
        Math.min(94, resolution.nextPlayer.tension + resolution.playerTensionDelta),
      );

      const { nextPlayer } = applyStateChanges(
        {
          ...resolution.nextPlayer,
          tension: nextTension,
        },
        {
          xpGain: resolution.xpBonus,
          inspirationGain: diceRoll?.outcome === 'critical_success' ? 1 : 0,
        },
        camp.turnCount,
        { ruleset: camp.ruleset },
      );

      let nextCodex = camp.codex;
      if (resolution.allyVigorUpdates.length > 0) {
        const updateMap = new Map(resolution.allyVigorUpdates.map((u) => [u.npcId, u]));
        nextCodex = {
          ...camp.codex,
          npcs: camp.codex.npcs.map((n) => {
            const u = updateMap.get(n.id);
            if (!u) return n;
            const nextAff =
              resolution.affinityBonus > 0
                ? Math.max(-100, Math.min(100, (n.affinity ?? 0) + resolution.affinityBonus))
                : n.affinity;
            return {
              ...n,
              vigor: u.vigor,
              affinity: nextAff,
              relationship:
                typeof nextAff === 'number'
                  ? deriveRelationshipFromAffinity(nextAff)
                  : n.relationship,
              injuryNote: u.downed ? 'Ferido no confronto recente' : n.injuryNote,
            };
          }),
        };
      }

      let nextStronghold = camp.stronghold;
      if (
        nextStronghold &&
        (resolution.supplyChanges.ammo || resolution.supplyChanges.materials)
      ) {
        const baseSup =
          nextStronghold.supplies ?? defaultBaseSuppliesForTheme(camp.world.primaryTheme);
        nextStronghold = {
          ...nextStronghold,
          supplies: {
            ...baseSup,
            ammo: Math.max(0, baseSup.ammo + (resolution.supplyChanges.ammo ?? 0)),
            materials: Math.max(0, baseSup.materials + (resolution.supplyChanges.materials ?? 0)),
          },
        };
      }

      let nextOrg = camp.organization;
      if (nextOrg && resolution.orgMoraleDelta !== 0) {
        nextOrg = {
          ...nextOrg,
          morale: Math.max(0, Math.min(100, nextOrg.morale + resolution.orgMoraleDelta)),
        };
      }

      persistActiveCampaign({
        ...camp,
        player: nextPlayer,
        codex: nextCodex,
        stronghold: nextStronghold,
        organization: nextOrg,
        activeClash: resolution.nextClash,
      });

      setArenaDiceRoll(diceRoll ?? null);
      setArenaBeats(beats);
      setArenaBattleNonce((n) => n + 1);
      if (
        nextPlayer.level > camp.player.level &&
        nextPlayer.dnd &&
        (nextPlayer.dnd.pendingSubclassChoice ||
          (nextPlayer.dnd.pendingAsiOrFeat ?? 0) > 0 ||
          nextPlayer.dnd.pendingEpicBoon)
      ) {
        setLevelUpModalOpen(true);
      }
      return;
    }

    const intent: ActionIntent =
      payload.kind === 'defend' || payload.kind === 'reposition'
        ? 'survival'
        : payload.kind === 'evidence'
          ? 'investigate'
          : beforeClash.archetype === 'social'
            ? 'diplomatic'
            : 'bold';
    const risk: ActionRisk =
      payload.kind === 'reposition' || payload.kind === 'defend'
        ? 'low'
        : 'high';
    const baseAttr =
      payload.attribute ?? inferActionAttribute(payload.label, intent);

    const clashHints = buildClashRollModifiers(
      camp,
      beforeClash,
      payload,
      baseAttr,
    );
    const partyHelper = findPartyAdvantage(
      clashHints.attribute,
      camp.codex.npcs,
    );
    const effectiveAttrs = getEffectiveAttributes(camp.player);
    const resolvedRollMode =
      clashHints.grantAdvantage || partyHelper ? 'advantage' : 'normal';
    const resolvedSource = clashHints.advantageSource ?? partyHelper?.name;
    const needsRoll =
      payload.kind !== 'reposition' && payload.kind !== 'guild_support';

    const diceRoll = needsRoll
      ? resolveFateCheck(
          payload.label,
          intent,
          risk,
          camp.difficulty,
          camp.player.skills,
          true,
          camp.player.tension,
          {
            attributes: effectiveAttrs,
            skillLevels: camp.player.skillLevels,
            forcedAttribute: clashHints.attribute,
            rollMode: resolvedRollMode,
            advantageSource: resolvedSource,
            opposedLabel: clashHints.opposedLabel,
            dcOverride: clashHints.dcOverride,
            weatherType: camp.worldClock?.weatherType,
          },
        )
      : undefined;

    const resolution = resolveClashRound({
      campaign: camp,
      clash: beforeClash,
      actionText: payload.label,
      clashAction: payload,
      diceRoll,
    });

    const beats = extractClashChoreographyBeats(
      beforeClash,
      resolution,
      vfx,
      diceRoll,
    );

    // Apply player vigor, tension & XP immediately so arena bars slide smoothly
    const nextVigor = Math.max(
      0,
      Math.min(
        camp.player.maxVigor,
        camp.player.vigor + resolution.playerVigorDelta,
      ),
    );
    const nextTension = Math.max(
      0,
      Math.min(94, camp.player.tension + resolution.playerTensionDelta),
    );

    // If physical vigor reached 0 outside social duels, mark battle defeat cleanly
    const finalClash =
      beforeClash.archetype !== 'social' &&
      nextVigor <= 0 &&
      resolution.nextClash.status === 'active'
        ? { ...resolution.nextClash, status: 'defeat' as const }
        : resolution.nextClash;

    const { nextPlayer } = applyStateChanges(
      {
        ...camp.player,
        vigor: nextVigor,
        tension: nextTension,
      },
      {
        xpGain: resolution.xpBonus,
        inspirationGain: diceRoll?.outcome === 'critical_success' ? 1 : 0,
      },
      camp.turnCount,
      { ruleset: camp.ruleset },
    );

    // Sync party ally vigor + bond affinity
    let nextCodex = camp.codex;
    if (resolution.allyVigorUpdates.length > 0) {
      const updateMap = new Map(
        resolution.allyVigorUpdates.map((u) => [u.npcId, u]),
      );
      nextCodex = {
        ...camp.codex,
        npcs: camp.codex.npcs.map((n) => {
          const u = updateMap.get(n.id);
          if (!u) return n;
          const nextAff =
            resolution.affinityBonus > 0
              ? Math.max(-100, Math.min(100, (n.affinity ?? 0) + resolution.affinityBonus))
              : n.affinity;
          return {
            ...n,
            vigor: u.vigor,
            affinity: nextAff,
            relationship:
              typeof nextAff === 'number'
                ? deriveRelationshipFromAffinity(nextAff)
                : n.relationship,
            injuryNote: u.downed ? 'Ferido no confronto recente' : n.injuryNote,
          };
        }),
      };
    }

    // Sync siege/guild supply costs & org morale
    let nextStronghold = camp.stronghold;
    if (
      nextStronghold &&
      (resolution.supplyChanges.ammo || resolution.supplyChanges.materials)
    ) {
      const baseSup =
        nextStronghold.supplies ??
        defaultBaseSuppliesForTheme(camp.world.primaryTheme);
      nextStronghold = {
        ...nextStronghold,
        supplies: {
          ...baseSup,
          ammo: Math.max(0, baseSup.ammo + (resolution.supplyChanges.ammo ?? 0)),
          materials: Math.max(
            0,
            baseSup.materials + (resolution.supplyChanges.materials ?? 0),
          ),
        },
      };
    }

    let nextOrg = camp.organization;
    if (nextOrg && resolution.orgMoraleDelta !== 0) {
      nextOrg = {
        ...nextOrg,
        morale: Math.max(0, Math.min(100, nextOrg.morale + resolution.orgMoraleDelta)),
      };
    }

    persistActiveCampaign({
      ...camp,
      player: nextPlayer,
      codex: nextCodex,
      stronghold: nextStronghold,
      organization: nextOrg,
      activeClash: finalClash,
    });

    setArenaDiceRoll(diceRoll ?? null);
    setArenaBeats(beats);
    setArenaBattleNonce((n) => n + 1);
  };

  /**
   * Closes the finished Battle Arena and fires ONE single cinematic AI story turn
   * narrating the whole battle climax, aftermath, loot, and consequences into the chronicle!
   */
  const handleFinishClashToStory = async () => {
    const camp = activeCampaignRef.current;
    const finished = camp?.activeClash;
    if (!camp || !finished || isFinishingClash) return;

    setIsFinishingClash(true);
    const meta = CLASH_ARCHETYPE_META[finished.archetype];
    const outcomeWord =
      finished.status === 'victory'
        ? 'VITÓRIA'
        : finished.status === 'escaped'
          ? 'FUGA BEM-SUCEDIDA'
          : 'REVÉS / DERROTA';

    const logDigest = finished.roundLog
      .slice(-8)
      .map((l) => `[R${l.round}] ${l.summary}`)
      .join(' | ');

    // On D&D 5.2 victory while unconscious (0 PV), party stabilizes hero at 1 PV!
    const stabilizedPlayer =
      finished.status === 'victory' && camp.player.vigor <= 0 && isDndRuleset(camp)
        ? {
            ...camp.player,
            vigor: 1,
            dnd: camp.player.dnd
              ? {
                  ...camp.player.dnd,
                  deathSaves: { successes: 0, failures: 0, stabilized: false },
                  conditions: camp.player.dnd.conditions.filter((c) => c !== 'unconscious'),
                }
              : camp.player.dnd,
          }
        : camp.player;

    const clearedCamp: Campaign = {
      ...camp,
      player: stabilizedPlayer,
      status:
        stabilizedPlayer.vigor <= 0 && finished.archetype !== 'social'
          ? 'crisis_vigor'
          : 'active',
      activeClash: null,
    };

    persistActiveCampaign(clearedCamp);
    setArenaBossArtUrl(null);
    setArenaBeats([]);
    setArenaDiceRoll(null);
    setLastArenaTurnSnapshot(null);
    setIsFinishingClash(false);

    if (clearedCamp.status === 'crisis_vigor') {
      pushToast('crisis', 'Vigor esgotado na batalha! Resolva a crise de sobrevivência.');
      return;
    }

    const summaryAction =
      finished.status === 'escaped'
        ? `Concluí a fuga em "${finished.title}" (${finished.round} rodadas).`
        : finished.status === 'victory'
          ? `Venci o confronto "${finished.title}" contra ${finished.enemies.map((e) => e.name).join(', ')} em ${finished.round} rodadas!`
          : `Sobrevivi ao revés em "${finished.title}" (${finished.round} rodadas).`;

    const extraNote = [
      `[TACTICAL BATTLE ARENA CONCLUDED — ${outcomeWord}]`,
      `Archetype: ${meta.label} | Title: ${finished.title} | Rounds: ${finished.round}`,
      `Enemies: ${finished.enemies.map((e) => `${e.name} (${e.hp}/${e.maxHp})`).join(', ')}`,
      `Key Battle Highlights: ${logDigest}`,
      `NARRATE THIS EPIC CLIMAX AND AFTERMATH in vivid literary prose/dialogue beats! Reward fitting loot/clues/canonFacts if victorious. Set vigorDelta = 0 and tensionDelta = 0 (already applied during battle).`,
    ].join('\n');

    await executeStoryTurn(
      clearedCamp,
      summaryAction,
      'bold',
      'safe',
      false,
      false,
      undefined,
      {
        skipStoryteller: true,
        extraPromptNote: extraNote,
      },
    );
  };

  const handleGenerateClashBossArt = async (enemy: ClashEnemy) => {
    const camp = activeCampaignRef.current;
    if (!camp || isGeneratingBossArt) return;
    setIsGeneratingBossArt(true);
    try {
      const res = await requestNpcPortrait(
        camp.world,
        {
          name: enemy.name,
          role: enemy.role,
          notes: `Dramatic JRPG boss battle portrait in ${camp.currentLocation}. Weaknesses: ${enemy.weaknesses.join(', ')}`,
        },
        settings,
        apiHealth,
      );
      if (res.dataUrl) {
        setArenaBossArtUrl(res.dataUrl);
      }
    } catch {
      pushToast('error', 'Não foi possível gerar a arte do inimigo agora.');
    } finally {
      setIsGeneratingBossArt(false);
    }
  };

  const handleConvertChaseToCombat = () => {
    const camp = activeCampaignRef.current;
    if (!camp?.activeClash || camp.activeClash.archetype !== 'chase') return;
    const nextClash = convertChaseToCombat(camp.activeClash, camp);
    persistActiveCampaign({
      ...camp,
      activeClash: nextClash,
    });
    pushToast('crisis', '⚔️ Encurralado! Perseguição convertida em Combate!');
  };

  const handleRetreatFromClash = () => {
    const camp = activeCampaignRef.current;
    if (!camp?.activeClash || isBusy) return;
    const endedTitle = camp.activeClash.title;
    persistActiveCampaign({
      ...camp,
      activeClash: null,
    });
    setSuggestedClash(null);
    setArenaBossArtUrl(null);
    pushToast('info', `Você recuou de "${endedTitle}" e voltou para a história.`);
  };

  const handleMoveItemStorage = (
    itemId: string,
    targetStorage: ItemStorageLocation,
  ) => {
    const camp = activeCampaignRef.current;
    if (!camp) return;
    const target = camp.player.inventory.find((i) => i.id === itemId);
    if (!target) return;

    const nextInventory = camp.player.inventory.map((i) => {
      if (i.id !== itemId) return i;
      return {
        ...i,
        storage: targetStorage,
        equipped: targetStorage === 'carry' ? i.equipped : false,
      };
    });

    const nextMaxVigor = computeMaxHpForRuleset(camp.ruleset, {
      ...camp.player,
      inventory: nextInventory,
    });

    persistActiveCampaign({
      ...camp,
      player: {
        ...camp.player,
        inventory: nextInventory,
        maxVigor: nextMaxVigor,
        vigor: Math.min(nextMaxVigor, camp.player.vigor),
      },
    });

    const destLabel =
      targetStorage === 'base'
        ? 'Depósito da Base'
        : targetStorage === 'vehicle'
          ? 'Porta-Malas'
          : 'Mochila';
    pushToast('base', `${target.name} → ${destLabel}`);
  };

  const handleAutoOrganizeInventory = () => {
    const camp = activeCampaignRef.current;
    if (!camp) return;

    const base =
      camp.stronghold ??
      defaultStrongholdForTheme(
        camp.world.primaryTheme,
        camp.currentLocation,
        camp.language,
      );
    const supplies = {
      ...(base.supplies ??
        defaultBaseSuppliesForTheme(camp.world.primaryTheme)),
    };
    const vehicles: VehicleRecord[] = [...(base.vehicles ?? [])];

    let movedToBase = 0;
    let vehiclesPromoted = 0;
    const nextInventory: InventoryItem[] = [];

    for (const item of camp.player.inventory) {
      if (!item.equipped && isVehicleLikeItem(item.name)) {
        const exists = vehicles.some(
          (v) => v.name.toLowerCase() === item.name.toLowerCase(),
        );
        if (!exists) {
          vehicles.push({
            id: `veh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: item.name,
            kind: 'Veículo / Frota',
            fuel: 80,
            condition: 100,
            note: item.note,
          });
        }
        vehiclesPromoted += 1;
        continue;
      }

      if (
        !item.equipped &&
        (item.storage ?? 'carry') === 'carry' &&
        inferItemStorage(item.name, item.category, item.quantity) === 'base'
      ) {
        nextInventory.push({ ...item, storage: 'base' });
        movedToBase += 1;
        const lower = item.name.toLowerCase();
        if (/(combust[ií]vel|gasolina|diesel|gal[aã]o|gal[oõ]es|fuel)/i.test(lower)) {
          supplies.fuel += Math.max(1, item.quantity);
        } else if (/(muni[cç][aã]o|ammo|cartucho|balas)/i.test(lower)) {
          supplies.ammo += Math.max(20, item.quantity * 20);
        } else if (/(provis[oõ]es|comida|ra[cç][aã]o|enlatad|filtro.*água|food)/i.test(lower)) {
          supplies.food += Math.max(3, item.quantity * 2);
        } else if (/(m[eé]dic|trauma|primeiros socorros|rem[eé]dio|medkit)/i.test(lower)) {
          supplies.meds += Math.max(1, item.quantity);
        } else if (/(ferrag|corrent|solar|gerador|pe[cç]a|material)/i.test(lower)) {
          supplies.materials += Math.max(3, item.quantity * 2);
        }
      } else {
        nextInventory.push(item);
      }
    }

    if (movedToBase === 0 && vehiclesPromoted === 0) {
      pushToast('info', 'Sua mochila já está bem organizada!');
      return;
    }

    persistActiveCampaign({
      ...camp,
      player: {
        ...camp.player,
        inventory: nextInventory,
      },
      stronghold: {
        ...base,
        supplies,
        vehicles,
      },
    });

    const parts: string[] = [];
    if (movedToBase > 0) parts.push(`${movedToBase} item(ns) → Base`);
    if (vehiclesPromoted > 0) parts.push(`${vehiclesPromoted} veículo(s) → Garagem`);
    pushToast('base', `Auto-organizado: ${parts.join(' · ')}`);
  };

  const handleAdjustSupply = (supply: SupplyType, delta: number) => {
    const camp = activeCampaignRef.current;
    if (!camp) return;
    const base =
      camp.stronghold ??
      defaultStrongholdForTheme(
        camp.world.primaryTheme,
        camp.currentLocation,
        camp.language,
      );
    const supplies = {
      ...(base.supplies ??
        defaultBaseSuppliesForTheme(camp.world.primaryTheme)),
    };
    supplies[supply] = Math.max(0, (supplies[supply] ?? 0) + Math.round(delta));

    persistActiveCampaign({
      ...camp,
      stronghold: {
        ...base,
        supplies,
      },
    });
  };

  const handleRefuelVehicle = (vehicleId: string) => {
    const camp = activeCampaignRef.current;
    if (!camp || !camp.stronghold) return;
    const supplies = {
      ...(camp.stronghold.supplies ??
        defaultBaseSuppliesForTheme(camp.world.primaryTheme)),
    };
    if ((supplies.fuel ?? 0) <= 0) {
      pushToast('error', 'Sem combustível disponível no estoque da base.');
      return;
    }
    const target = (camp.stronghold.vehicles ?? []).find(
      (v) => v.id === vehicleId,
    );
    if (!target || target.fuel >= 100) return;

    supplies.fuel = Math.max(0, supplies.fuel - 1);
    const nextVehicles = (camp.stronghold.vehicles ?? []).map((v) =>
      v.id === vehicleId ? { ...v, fuel: Math.min(100, v.fuel + 25) } : v,
    );
    persistActiveCampaign({
      ...camp,
      stronghold: {
        ...camp.stronghold,
        supplies,
        vehicles: nextVehicles,
      },
    });
    pushToast('base', `${target.name} abastecido (+25% tanque)`);
  };

  const handleConfirmRest = async (payload: RestChoicePayload) => {
    const camp = activeCampaignRef.current;
    if (!camp || isBusy || camp.status !== 'active') return;
    if (camp.activeClash?.status === 'active') {
      pushToast('error', 'Não é possível descansar no meio de um Confronto Tático!');
      return;
    }

    const currentClock =
      camp.worldClock ??
      defaultWorldClockForTheme(camp.world.primaryTheme, camp.language);

    const dndMode = isDndRuleset(camp);
    const isShort = payload.kind === 'short';
    if (!dndMode && isShort && (currentClock.shortRestsUsedToday ?? 0) >= MAX_SHORT_RESTS_PER_DAY) {
      pushToast('error', 'Você já usou seus 2 Descansos Curtos de hoje.');
      return;
    }

    const hasMedbay = Boolean(
      camp.stronghold?.upgrades.some((u) => u.id === 'medbay'),
    );

    const nextClock: WorldClock = isShort
      ? {
          ...advanceClockByMinutes(currentClock, dndMode ? 60 : 90, { lang: camp.language }),
          shortRestsUsedToday: dndMode
            ? (currentClock.shortRestsUsedToday ?? 0) + 1
            : Math.min(
                MAX_SHORT_RESTS_PER_DAY,
                (currentClock.shortRestsUsedToday ?? 0) + 1,
              ),
        }
      : advanceClockToNextMorning(currentClock);

    const tensionDrop = isShort ? 8 : 20;
    let nextPlayer: PlayerState;
    let restSummaryBadge = '';

    if (dndMode && camp.player.dnd) {
      if (isShort) {
        const sr = applyDnd2024ShortRest(camp.player, payload.hitDiceToSpend ?? 0);
        nextPlayer = {
          ...sr.nextPlayer,
          tension: Math.max(0, camp.player.tension - tensionDrop),
        };
        restSummaryBadge = [
          sr.healedHp > 0 ? `+${sr.healedHp} PV` : null,
          ...sr.rechargedNotes,
        ]
          .filter(Boolean)
          .join(' · ') || 'Fôlego renovado (1h)';
      } else {
        const lr = applyDnd2024LongRest(camp.player, hasMedbay);
        nextPlayer = {
          ...lr.nextPlayer,
          tension: Math.max(0, camp.player.tension - tensionDrop),
        };
        restSummaryBadge = lr.notes.join(' · ');
      }
    } else {
      const vigorGain = isShort ? 20 : hasMedbay ? 80 : 55;
      const nextVigor = Math.min(camp.player.maxVigor, camp.player.vigor + vigorGain);
      const actualVigorGain = nextVigor - camp.player.vigor;
      nextPlayer = {
        ...camp.player,
        vigor: nextVigor,
        tension: Math.max(0, camp.player.tension - tensionDrop),
      };
      restSummaryBadge = `+${actualVigorGain} Vigor`;
    }

    if (payload.focus === 'train' && payload.skillName?.trim()) {
      const trained = applyStateChanges(
        nextPlayer,
        {
          skillTraining: [
            {
              name: payload.skillName.trim(),
              xpGain: isShort ? 25 : 45,
            },
          ],
        },
        camp.turnCount,
        {
          hasTrainingStation: Boolean(
            camp.stronghold?.upgrades.some((u) => u.id === 'training'),
          ),
          ruleset: camp.ruleset,
        },
      );
      nextPlayer = trained.nextPlayer;
    }

    // Long Rest restores living party NPCs to full HP & triggers daily org upkeep once!
    let nextCodex = camp.codex;
    let nextOrg = camp.organization;
    let nextStronghold = camp.stronghold;
    if (!isShort) {
      nextCodex = {
        ...camp.codex,
        npcs: camp.codex.npcs.map((n) =>
          n.inParty && n.status === 'alive'
            ? { ...n, vigor: n.maxVigor ?? n.vigor, injuryNote: undefined }
            : n,
        ),
      };
      if (nextOrg && nextClock.day > (nextOrg.lastUpkeepDay ?? 1)) {
        const baseSupplies =
          nextStronghold?.supplies ?? defaultBaseSuppliesForTheme(camp.world.primaryTheme);
        const upkeep = processDailyOrgUpkeep(
          nextOrg,
          nextCodex.npcs,
          baseSupplies,
          nextPlayer.currency?.amount ?? 0,
          nextCodex.factions,
          nextClock.day,
          camp.turnCount,
        );
        nextOrg = upkeep.nextOrg;
        nextCodex = { ...nextCodex, npcs: upkeep.nextNpcs };
        if (nextStronghold) {
          nextStronghold = { ...nextStronghold, supplies: upkeep.nextSupplies };
        }
        nextPlayer = {
          ...nextPlayer,
          currency: {
            ...nextPlayer.currency,
            amount: upkeep.nextCurrencyAmount,
          },
        };
      }
    }

    const restedCamp: Campaign = {
      ...camp,
      worldClock: nextClock,
      player: nextPlayer,
      codex: nextCodex,
      organization: nextOrg,
      stronghold: nextStronghold,
    };

    const timeLabel = `Dia ${nextClock.day} · ${formatClockTime(nextClock.hour, nextClock.minute)}`;
    pushToast(
      'time',
      `${isShort ? 'Descanso Curto' : 'Descanso Longo'} (${timeLabel}) · ${restSummaryBadge}`,
    );

    if (!payload.narrateScene) {
      const sysEntry: StoryEntry = {
        id: `entry_rest_silent_${Date.now()}`,
        role: 'system',
        turn: camp.turnCount,
        text: `${isShort ? 'Descanso Curto' : 'Descanso Longo'} em ${camp.currentLocation} → ${timeLabel} (${restSummaryBadge}).`,
        timestamp: Date.now(),
      };
      persistActiveCampaign({
        ...restedCamp,
        entries: [...restedCamp.entries, sysEntry],
      });
      return;
    }

    const focusActionMap = {
      quiet: isShort
        ? `Fazer uma breve pausa para recuperar o fôlego em ${camp.currentLocation}`
        : `Descansar até o amanhecer do Dia ${nextClock.day} em ${camp.currentLocation}`,
      companion: payload.companionName
        ? `Aproveitar a pausa para conversar com ${payload.companionName}`
        : `Aproveitar a pausa para conversar com o grupo`,
      train: payload.skillName
        ? `Usar a pausa para treinar ${payload.skillName}`
        : `Usar a pausa para treinar minhas habilidades`,
      refuge: `Usar a pausa para organizar suprimentos e verificar a segurança em ${camp.currentLocation}`,
    };

    const visibleRestAction = payload.customNote
      ? `${focusActionMap[payload.focus]}: ${payload.customNote}`
      : focusActionMap[payload.focus];

    await executeStoryTurn(
      restedCamp,
      visibleRestAction,
      'survival',
      'safe',
      false,
      false,
      'wis',
      {
        extraPromptNote: `[PAUSA / ${isShort ? 'DESCANSO CURTO (+1h30)' : 'DESCANSO LONGO (ATÉ 07:30 DO DIA SEGUINTE)'}: Mantenha total coerência com o local atual (${camp.currentLocation}), o gênero da história e o horário (${timeLabel}, clima ${nextClock.weather}). NÃO invente acampamento medieval se a história for urbana/moderna! Foco escolhido pelo jogador: ${payload.focus}${
          payload.companionName ? ` com ${payload.companionName}` : ''
        }${payload.skillName ? ` treinando ${payload.skillName}` : ''}${
          payload.customNote ? `. Nota do jogador: ${payload.customNote}` : ''
        }${
          nextClock.countdown
            ? `. Contagem regressiva ativa: ${nextClock.countdown.daysLeft}d para ${nextClock.countdown.label}.`
            : ''
        }]`,
      },
    );
  };

  const handleToggleSpeakEntry = async (entryId: string, text: string) => {
    if (speakingEntryId === entryId) {
      stopSpeechPlayback();
      return;
    }

    stopSpeechPlayback();
    const camp = activeCampaignRef.current;
    if (!camp) return;

    setLoadingSpeechEntryId(entryId);
    try {
      const res = await requestSceneSpeech(
        entryId,
        text,
        camp.language,
        camp.world.primaryTheme,
        settings,
        apiHealth,
      );

      if (res?.dataUrl) {
        const audio = new Audio(res.dataUrl);
        speechAudioRef.current = audio;
        setSpeakingEntryId(entryId);
        audio.onended = () => {
          setSpeakingEntryId((cur) => (cur === entryId ? null : cur));
          speechAudioRef.current = null;
        };
        audio.onerror = () => {
          setSpeakingEntryId(null);
          speechAudioRef.current = null;
        };
        await audio.play();
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        // Offline / Demo Mode browser speech fallback
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang =
          camp.language === 'en'
            ? 'en-US'
            : camp.language === 'fr'
              ? 'fr-FR'
              : 'pt-BR';
        utter.rate = 0.96;
        utter.onend = () => {
          setSpeakingEntryId((cur) => (cur === entryId ? null : cur));
        };
        utter.onerror = () => setSpeakingEntryId(null);
        setSpeakingEntryId(entryId);
        window.speechSynthesis.speak(utter);
      } else {
        pushToast('error', 'Narração em voz indisponível neste navegador.');
      }
    } catch (err) {
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Falha ao gerar narração em voz.',
      );
      setSpeakingEntryId(null);
    } finally {
      setLoadingSpeechEntryId(null);
    }
  };

  const handleTravelFromMap = (loc: LocationRecord) => {
    if (activeCampaignRef.current?.activeClash?.status === 'active') {
      pushToast('error', 'Encerre ou recue do Confronto Tático antes de viajar pelo Atlas!');
      return;
    }
    void handleSendAction(`Viajar até ${loc.name}`, 'investigate', 'safe', false, false, 'wis');
  };

  const handleCreateSaveSlot = async (slotName: string) => {
    const camp = activeCampaignRef.current;
    if (!camp) return;
    const updatedSlots = await createSaveSlotAsync(camp, slotName);
    setSaveSlots(updatedSlots);
    pushToast('save', `Ponto salvo: ${slotName}`);
  };

  const handleLoadSaveSlot = (slot: SaveSlot) => {
    const restored: Campaign = {
      ...structuredClone(slot.snapshot),
      interactionId: undefined,
      updatedAt: Date.now(),
    };
    setSuggestedClash(null);
    persistActiveCampaign(restored);
    setSavesOpen(false);
    setPulseSecondsLeft(settings.livingWorldSeconds);
    setPulsePaused(false);
    pushToast('save', `Save carregado: ${slot.name} (memória do mundo restaurada)`);
  };

  const handleDeleteSaveSlot = async (slotId: string) => {
    const camp = activeCampaignRef.current;
    const updatedSlots = await deleteSaveSlotAsync(slotId, camp?.id);
    setSaveSlots(updatedSlots);
    pushToast('info', 'Ponto salvo removido.');
  };

  const handleTypingActivity = useCallback(() => {
    setPulseSecondsLeft(settings.livingWorldSeconds);
  }, [settings.livingWorldSeconds]);

  const handleChangeCampaignDifficulty = (difficulty: DifficultyId) => {
    if (!activeCampaign) return;
    persistActiveCampaign({ ...activeCampaign, difficulty });
    pushToast('info', `Dificuldade alterada para: ${difficulty}`);
  };

  const handleImportCampaign = (rawJson: string) => {
    try {
      const imported = parseImportedCampaign(rawJson);
      void saveCampaignAsync(imported).then((updated) => {
        setCampaigns(updated);
        pushToast('save', `Crônica importada: ${imported.world.title}`);
      });
    } catch {
      pushToast('error', 'Arquivo JSON inválido para campanha MYTHOS.');
    }
  };

  const usingGemini = shouldUseGemini(settings, apiHealth);

  const canRerollLastTurn = Boolean(
    activeCampaign &&
      lastTurnMeta?.diceRoll &&
      !lastTurnMeta.diceRoll.rerolledWithInspiration &&
      (activeCampaign.player.inspiration ?? 1) > 0 &&
      (lastTurnMeta.diceRoll.outcome === 'failure' ||
        lastTurnMeta.diceRoll.outcome === 'critical_failure' ||
        lastTurnMeta.diceRoll.outcome === 'partial'),
  );

  const handleToggleLeftRail = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileRightHudOpen(false);
      setMobileLeftRailOpen((o) => !o);
      return;
    }
    setLeftRailMode((prev) =>
      prev === 'compact' ? 'pinned' : prev === 'pinned' ? 'hidden' : 'compact',
    );
  };

  const handleToggleRightHud = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileLeftRailOpen(false);
      setMobileRightHudOpen((o) => !o);
      return;
    }
    setFocusMode((f) => !f);
  };

  const handleOpenDocs = (articleId?: string) => {
    if (view === 'docs') {
      setView(docsReturnView);
      return;
    }
    setDocsReturnView(view);
    setDocsInitialArticleId(articleId);
    setMobileLeftRailOpen(false);
    setMobileRightHudOpen(false);
    setView('docs');
  };

  const handleReturnFromDocs = () => {
    if (docsReturnView === 'stage' && activeCampaign) {
      setView('stage');
    } else if (docsReturnView === 'forge') {
      setView('forge');
    } else {
      setView('home');
    }
  };

  const activeSagaId = activeCampaign?.timeline?.sagaId ?? (activeCampaign ? `saga_${activeCampaign.id}` : null);
  const activeSagaBranchCount = activeSagaId
    ? Math.max(
        1,
        campaigns.filter(
          (c) => (c.timeline?.sagaId ?? `saga_${c.id}`) === activeSagaId,
        ).length,
      )
    : 1;

  return (
    <div
      className={
        view === 'stage'
          ? 'relative flex h-dvh flex-col overflow-hidden'
          : 'relative min-h-dvh'
      }
    >
      <div className="mythos-ambient" />
      <div className="mythos-grain" />
      {view === 'stage' && activeCampaign ? (
        <WeatherAtmosphere
          weatherType={activeCampaign.worldClock?.weatherType}
          period={activeCampaign.worldClock?.period}
          enabled={settings.weatherEffectsEnabled}
        />
      ) : null}

      <TopBar
        view={view}
        campaign={activeCampaign}
        settings={settings}
        usingGemini={usingGemini}
        isOnline={pwa.isOnline}
        leftRailMode={leftRailMode}
        rightHudOpen={!focusMode}
        onBackHome={() => {
          stopSpeechPlayback();
          setMobileLeftRailOpen(false);
          setMobileRightHudOpen(false);
          setView('home');
        }}
        onToggleLeftRail={handleToggleLeftRail}
        onToggleRightHud={handleToggleRightHud}
        onOpenClock={() => setClockOpen(true)}
        onOpenMap={() => setWorldMapOpen(true)}
        onOpenWorldEvent={() => setFocusEventNonce((n) => n + 1)}
        isGeneratingEvent={isGeneratingEvent}
        onToggleAmbientSound={() =>
          updateSettings({ ambientSoundEnabled: !settings.ambientSoundEnabled })
        }
        onToggleColorMode={() =>
          updateSettings({
            colorMode: settings.colorMode === 'dark' ? 'light' : 'dark',
          })
        }
        onOpenDocs={() => handleOpenDocs()}
        onOpenSettings={(tab = 'game') => {
          setSettingsInitialTab(tab);
          setSettingsOpen(true);
        }}
      />

      {view === 'docs' ? (
        <DocsPortal
          initialArticleId={docsInitialArticleId}
          hasActiveCampaign={Boolean(activeCampaign)}
          activeCampaignTitle={activeCampaign?.world.title}
          onReturn={handleReturnFromDocs}
          onStartInteractiveTour={handleStartInteractiveTour}
        />
      ) : null}

      {view === 'home' ? (
        <SanctuaryHome
          campaigns={campaigns}
          language={settings.language}
          previewTheme={previewTheme}
          defaultDifficulty={settings.difficulty}
          pwa={pwa}
          onOpenIosInstallGuide={() => setIosInstallGuideOpen(true)}
          onInstalledApp={() =>
            pushToast('save', 'MYTHOS instalado como aplicativo! Leitura offline ativa.')
          }
          onSelectPreviewTheme={setPreviewTheme}
          onStartForge={() => setView('forge')}
          onStartFreeform={handleStartFreeformStory}
          onPlayInstantDemo={handlePlayInstantDemo}
          onOpenDocs={() => handleOpenDocs('overview')}
          onStartInteractiveTour={handleStartInteractiveTour}
          onOpenCampaignTimeline={(camp) => {
            handleOpenCampaign(camp);
            setTimelineOpen(true);
          }}
          onOpenCampaign={handleOpenCampaign}
          onExportCampaign={exportCampaignJson}
          onDeleteCampaign={(id) => {
            void deleteCampaignAsync(id).then((updated) => {
              setCampaigns(updated);
              pushToast('info', 'Crônica removida da estante.');
            });
          }}
          onImportCampaign={handleImportCampaign}
          onShareCampaignQr={(camp) =>
            setQrSyncState({ open: true, mode: 'send', campaign: camp })
          }
          onReceiveCampaignQr={() =>
            setQrSyncState({ open: true, mode: 'receive', campaign: null })
          }
        />
      ) : null}

      {view === 'forge' ? (
        <WorldForge
          settings={settings}
          apiHealth={apiHealth}
          isSubmitting={isBusy}
          onPreviewThemeChange={setPreviewTheme}
          onUpdateSettings={updateSettings}
          onOpenAiSettings={() => {
            setSettingsInitialTab('ai');
            setSettingsOpen(true);
          }}
          onNotify={(kind, message) => pushToast(kind, message)}
          onCancel={() => setView('home')}
          onCreateCampaign={handleStartForgedCampaign}
        />
      ) : null}

      {view === 'stage' && activeCampaign ? (
        <StoryStage
          campaign={activeCampaign}
          settings={settings}
          saveSlotCount={saveSlots.length}
          language={settings.language}
          dialogueStyle={settings.dialogueStyle ?? 'bubbles'}
          focusMode={focusMode}
          leftRailMode={leftRailMode}
          mobileLeftRailOpen={mobileLeftRailOpen}
          mobileRightHudOpen={mobileRightHudOpen}
          pulsePaused={pulsePaused}
          pulseSecondsLeft={pulseSecondsLeft}
          onChangeLeftRailMode={setLeftRailMode}
          onCloseMobileLeftRail={() => setMobileLeftRailOpen(false)}
          onToggleRightHud={handleToggleRightHud}
          onCloseMobileRightHud={() => setMobileRightHudOpen(false)}
          onTogglePulsePause={() => setPulsePaused((p) => !p)}
          onAdvanceWorldNow={() => void handleAdvanceWorld()}
          isBusy={isBusy}
          isSummarizing={isSummarizing}
          illustratingEntryId={illustratingEntryId}
          isGeneratingPortrait={isGeneratingPortrait}
          generatingNpcPortraitId={generatingNpcPortraitId}
          speakingEntryId={speakingEntryId}
          loadingSpeechEntryId={loadingSpeechEntryId}
          canUndo={undoStack.length > 0}
          canRegenerate={Boolean(lastTurnMeta)}
          canRerollLastTurn={canRerollLastTurn}
          onUndoTurn={handleUndoTurn}
          onRegenerateTurn={() => void handleRegenerateTurn()}
          onRerollLastTurn={() => void handleRerollLastTurnWithInspiration()}
          onToggleSpeakEntry={(entryId, text) =>
            void handleToggleSpeakEntry(entryId, text)
          }
          onTogglePartyMember={handleTogglePartyMember}
          onGenerateNpcPortrait={(npcId) => void handleGenerateNpcPortrait(npcId)}
          onBuildStrongholdUpgrade={handleBuildStrongholdUpgrade}
          onOpenWorldMap={() => setWorldMapOpen(true)}
          onOpenTimeline={() => setTimelineOpen(true)}
          timelineBranchCount={activeSagaBranchCount}
          suggestedClash={suggestedClash}
          isStartingClash={isStartingClash}
          onOpenClashLauncher={() => setClashLauncherOpen(true)}
          onAcceptSuggestedClash={(arch) =>
            void handleStartClash({ requestedArchetype: arch })
          }
          onDismissSuggestedClash={() => setSuggestedClash(null)}
          onOpenOrganization={() => setOrganizationOpen(true)}
          onOpenCharacterInventory={() => setCharInventoryOpen(true)}
          onOpenBaseBlueprint={() => setBaseBlueprintOpen(true)}
          onOpenRelationships={(npcId) => openRelationships(npcId)}
          onOpenRumors={() => setRumorsOpen(true)}
          onOpenWorkbench={() => {
            setLastCraftResult(null);
            setWorkbenchOpen(true);
          }}
          onOpenRest={() => setRestModalOpen(true)}
          onOpenEditProtagonist={() => setEditProtagonistOpen(true)}
          onOpenLevelUpModal={() => setLevelUpModalOpen(true)}
          onMigrateToDnd52={() => void handleMigrateCampaignToDnd52()}
          onResolvePendingSavingThrow={handleResolvePendingSavingThrow}
          onRollStoryDeathSave={() => void handleRollStoryDeathSave()}
          onOpenOrTriggerWorldEvent={handleOpenOrTriggerWorldEvent}
          onSelectWorldEventChoice={handleResolveWorldEventChoice}
          focusEventNonce={focusEventNonce}
          isGeneratingEvent={isGeneratingEvent}
          queuedUseItem={queuedUseItem}
          onConsumeQueuedUseItem={() => setQueuedUseItem(null)}
          queuedSayNpc={queuedSayNpc}
          onConsumeQueuedSayNpc={() => setQueuedSayNpc(null)}
          onSendAction={handleSendAction}
          onTypingActivity={handleTypingActivity}
          onSummarizeNow={() =>
            void runJournalCompressionIfNeeded(activeCampaign, true)
          }
          onAddCanonFact={handleAddCanonFact}
          onRemoveCanonFact={handleRemoveCanonFact}
          onUpdateWorldNotes={handleUpdateWorldNotes}
          onSpendAttributePoint={handleSpendAttributePoint}
          onToggleEquipItem={handleToggleEquipItem}
          restoredDraft={restoredDraft}
          onConsumeRestoredDraft={() => setRestoredDraft(null)}
          onResolveVigorCrisis={(choice, item) =>
            void handleResolveVigorCrisis(choice, item)
          }
          onConcludeCampaign={() => void handleGenerateEpilogue('victory')}
          onIllustrateEntry={(entryId) => void handleIllustrateEntry(entryId)}
          onGeneratePortrait={() => void handleGeneratePortrait()}
          onOpenSaves={() => setSavesOpen(true)}
          onExportCampaign={() => exportCampaignJson(activeCampaign)}
          onBackHome={() => setView('home')}
        />
      ) : null}

      <ChapterBanner
        banner={chapterBanner}
        onDismiss={() => setChapterBanner(null)}
      />

      <DiceRollOverlay
        roll={activeDiceRoll}
        language={settings.language}
        inspirationCount={activeCampaign?.player.inspiration ?? 1}
        canRerollWithInspiration={canRerollLastTurn}
        onRerollWithInspiration={() => void handleRerollLastTurnWithInspiration()}
        onComplete={() => setActiveDiceRoll(null)}
      />

      {activeCampaign ? (
        <>
          <WorldMapModal
            open={worldMapOpen}
            campaign={activeCampaign}
            isSyncingGeo={isSyncingMapGeo}
            isGeneratingMapArt={isGeneratingMapArt}
            onClose={() => setWorldMapOpen(false)}
            onTravelLocation={handleTravelFromMap}
            onSyncMapGeocode={() => void handleSyncMapGeocode()}
            onGenerateFictionalMapArt={() => void handleGenerateFictionalMapArt()}
            onDeleteLocation={handleDeleteLocation}
          />
          <ClockWeatherPopover
            open={clockOpen}
            clock={
              activeCampaign.worldClock ??
              defaultWorldClockForTheme(
                activeCampaign.world.primaryTheme,
                activeCampaign.language,
              )
            }
            language={settings.language}
            onClose={() => setClockOpen(false)}
            onUpdateClock={handleUpdateClock}
          />
          <RestCampModal
            open={restModalOpen}
            campaign={activeCampaign}
            isBusy={isBusy}
            onClose={() => setRestModalOpen(false)}
            onConfirmRest={(payload) => void handleConfirmRest(payload)}
          />
          <CharacterInventoryModal
            open={charInventoryOpen}
            campaign={activeCampaign}
            language={settings.language}
            isGeneratingPortrait={isGeneratingPortrait}
            onClose={() => setCharInventoryOpen(false)}
            onToggleEquipItem={handleToggleEquipItem}
            onMoveItemStorage={handleMoveItemStorage}
            onAutoOrganizeInventory={handleAutoOrganizeInventory}
            onAdjustSupply={handleAdjustSupply}
            onRefuelVehicle={handleRefuelVehicle}
            onConsumeItemNow={handleConsumeItemNow}
            onUseItemInScene={(item) => setQueuedUseItem(item)}
            onSpendAttributePoint={handleSpendAttributePoint}
            onUpdatePlayerProfile={handleUpdatePlayerProfile}
            onGeneratePortrait={() => void handleGeneratePortrait()}
            onOpenBaseBlueprint={() => setBaseBlueprintOpen(true)}
            onOpenWorkbench={() => {
              setLastCraftResult(null);
              setWorkbenchOpen(true);
            }}
          />
          <ProtagonistEditModal
            open={editProtagonistOpen}
            campaign={activeCampaign}
            language={settings.language}
            onClose={() => setEditProtagonistOpen(false)}
            onSaveProfile={handleUpdatePlayerProfile}
          />
          <LevelUpModal
            open={levelUpModalOpen}
            campaign={activeCampaign}
            language={settings.language}
            onClose={() => setLevelUpModalOpen(false)}
            onConfirm={handleConfirmLevelUp}
          />
          <BaseBlueprintModal
            open={baseBlueprintOpen}
            campaign={activeCampaign}
            language={settings.language}
            onClose={() => setBaseBlueprintOpen(false)}
            onBuildUpgrade={handleBuildStrongholdUpgrade}
            onOpenInventory={() => setCharInventoryOpen(true)}
            onOpenWorkbench={() => {
              setLastCraftResult(null);
              setWorkbenchOpen(true);
            }}
          />
          <RelationshipsModal
            open={relationshipsOpen}
            campaign={activeCampaign}
            language={settings.language}
            initialNpcId={relationshipsFocusNpcId}
            generatingNpcPortraitId={generatingNpcPortraitId}
            onClose={() => setRelationshipsOpen(false)}
            onTogglePartyMember={handleTogglePartyMember}
            onGenerateNpcPortrait={(npcId) => void handleGenerateNpcPortrait(npcId)}
            onUpdateNpcProfile={handleUpdateNpcProfile}
            onGiftItemToNpc={handleGiftItemToNpc}
            onTalkToNpc={(npc) => setQueuedSayNpc(npc)}
            onSpendQualityTime={handleSpendQualityTime}
          />
          <OrganizationModal
            open={organizationOpen}
            campaign={activeCampaign}
            language={settings.language}
            isBusy={isBusy}
            isLoadingRecruits={isLoadingOrgRecruits}
            isLoadingOps={isLoadingOrgOps}
            resolvingOpId={resolvingOrgOpId}
            lastReportBanner={lastOrgReportBanner}
            onClearReportBanner={() => setLastOrgReportBanner(null)}
            onClose={() => setOrganizationOpen(false)}
            onFoundOrganization={handleFoundOrganization}
            onUpdatePolicies={handleUpdateOrgPolicies}
            onAssignDivision={handleAssignOrgDivision}
            onInviteNpc={handleInviteNpcToOrg}
            onDismissMember={handleDismissOrgMember}
            onRefreshRecruits={() => void handleRefreshOrgRecruits()}
            onHireCandidate={handleHireOrgCandidate}
            onRefreshOperations={() => void handleRefreshOrgOperations()}
            onDispatchSquad={handleDispatchOrgSquad}
            onResolveOperation={(opId) => void handleResolveOrgOperation(opId)}
            onPlayOperationInChat={handlePlayOrgOperationInChat}
            onClaimOutpost={handleClaimOrgOutpost}
            onReleaseOutpost={handleReleaseOrgOutpost}
            onSetFactionTreaty={handleSetFactionTreaty}
            onNegotiateFactionInChat={handleNegotiateFactionInChat}
          />
          <NewsRumorsModal
            open={rumorsOpen}
            campaign={activeCampaign}
            language={settings.language}
            isFetching={isFetchingRumors}
            isBusy={isBusy}
            onClose={() => setRumorsOpen(false)}
            onFetchRumors={() => void handleFetchRumors()}
            onInvestigateRumor={handleInvestigateRumor}
            onTrackRumorQuest={handleTrackRumorQuest}
          />
          <WorkbenchModal
            open={workbenchOpen}
            campaign={activeCampaign}
            language={settings.language}
            isCrafting={isCrafting}
            lastResult={lastCraftResult}
            onClearResult={() => setLastCraftResult(null)}
            onClose={() => setWorkbenchOpen(false)}
            onExecuteCraft={(req) => void handleExecuteCraft(req)}
          />
          <TimelineTreeModal
            open={timelineOpen}
            activeCampaign={activeCampaign}
            allCampaigns={campaigns}
            onClose={() => setTimelineOpen(false)}
            onBranchFromNode={handleBranchFromTimelineNode}
            onSwitchCampaign={handleSwitchTimelineCampaign}
            onCreateManualMark={handleCreateManualTimelineMark}
          />
        </>
      ) : null}

      <SaveSlotsDrawer
        open={savesOpen}
        campaign={activeCampaign}
        slots={saveSlots}
        onClose={() => setSavesOpen(false)}
        onCreateSave={(name) => void handleCreateSaveSlot(name)}
        onLoadSave={handleLoadSaveSlot}
        onDeleteSave={(slotId) => void handleDeleteSaveSlot(slotId)}
        onExportJson={() => activeCampaign && exportCampaignJson(activeCampaign)}
        onImportJson={handleImportCampaign}
        onOpenQrSync={() => {
          setSavesOpen(false);
          setQrSyncState({
            open: true,
            mode: activeCampaign ? 'send' : 'receive',
            campaign: activeCampaign,
          });
        }}
      />

      <QrSyncModal
        open={qrSyncState.open}
        initialMode={qrSyncState.mode}
        initialReceiveCode={qrSyncState.receiveCode}
        campaign={qrSyncState.campaign ?? activeCampaign}
        onClose={() =>
          setQrSyncState((prev) => ({ ...prev, open: false, receiveCode: undefined }))
        }
        onCampaignReceived={handleQrCampaignReceived}
      />

      <SettingsDrawer
        open={settingsOpen}
        initialTab={settingsInitialTab}
        settings={settings}
        apiHealth={apiHealth}
        pwa={pwa}
        onOpenIosInstallGuide={() => setIosInstallGuideOpen(true)}
        onStartInteractiveTour={handleStartInteractiveTour}
        onClose={() => setSettingsOpen(false)}
        onUpdateSettings={updateSettings}
        onChangeCampaignDifficulty={
          view === 'stage' ? handleChangeCampaignDifficulty : undefined
        }
      />

      <PwaInstallBanner
        pwa={pwa}
        iosGuideOpen={iosInstallGuideOpen}
        onCloseIosGuide={() => setIosInstallGuideOpen(false)}
      />

      <InteractiveTourOverlay
        open={tourOpen}
        onClose={handleCloseTour}
        onPrepareStep={handlePrepareTourStep}
      />

      {view === 'stage' && activeCampaign?.activeClash ? (
        <ClashBattleArena
          campaign={activeCampaign}
          clash={activeCampaign.activeClash}
          lastDiceRoll={arenaDiceRoll}
          activeBeats={arenaBeats}
          battleNonce={arenaBattleNonce}
          isResolvingFinal={isFinishingClash}
          bossArtUrl={arenaBossArtUrl}
          isGeneratingBossArt={isGeneratingBossArt}
          onGenerateBossArt={(enemy) => void handleGenerateClashBossArt(enemy)}
          onSelectTarget={handleSelectClashTarget}
          onChangeAllyDirective={handleChangeClashAllyDirective}
          onExecuteTurn={handleExecuteInstantClashTurn}
          onUseConsumable={(item) => handleConsumeItemNow(item.id)}
          onFreeMove={handleArenaFreeMove}
          onBonusResource={handleArenaBonusResource}
          onBonusSpell={handleArenaBonusSpell}
          onTogglePreArmedReaction={handleArenaToggleReaction}
          canRerollArenaWithInspiration={Boolean(
            lastArenaTurnSnapshot &&
              (lastArenaTurnSnapshot.campSnapshot.player.inspiration ?? 0) > 0 &&
              activeCampaign.activeClash?.status === 'active',
          )}
          onRerollArenaWithInspiration={handleRerollArenaWithInspiration}
          useClassicDndNames={settings.useClassicDndNames}
          onConvertChaseToCombat={handleConvertChaseToCombat}
          onRetreat={handleRetreatFromClash}
          onFinishToStory={() => void handleFinishClashToStory()}
        />
      ) : null}

      <ClashLauncherModal
        open={clashLauncherOpen}
        isStarting={isStartingClash}
        onClose={() => setClashLauncherOpen(false)}
        onStartClash={(opts) => void handleStartClash(opts)}
      />

      <ToastStack
        toasts={toasts}
        onDismiss={(id) =>
          setToasts((prev) => prev.filter((t) => t.id !== id))
        }
      />
    </div>
  );
}

export default App;
