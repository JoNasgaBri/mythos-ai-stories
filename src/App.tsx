import { useCallback, useEffect, useRef, useState } from 'react';
import { BaseBlueprintModal } from './components/BaseBlueprintModal';
import { CharacterInventoryModal } from './components/CharacterInventoryModal';
import { ChapterBanner } from './components/ChapterBanner';
import { ClockWeatherPopover } from './components/ClockWeatherPopover';
import { DiceRollOverlay } from './components/DiceRollOverlay';
import { DocsPortal } from './components/docs/DocsPortal';
import { NewsRumorsModal } from './components/NewsRumorsModal';
import { OrganizationModal } from './components/OrganizationModal';
import { ProtagonistEditModal } from './components/ProtagonistEditModal';
import { RelationshipsModal } from './components/RelationshipsModal';
import { RestCampModal, type RestChoicePayload } from './components/RestCampModal';
import { SanctuaryHome } from './components/SanctuaryHome';
import { SaveSlotsDrawer } from './components/SaveSlotsDrawer';
import { SettingsDrawer } from './components/SettingsDrawer';
import { StoryStage } from './components/StoryStage';
import { ToastStack } from './components/ToastStack';
import { TopBar } from './components/TopBar';
import { WeatherAtmosphere } from './components/WeatherAtmosphere';
import { WorkbenchModal } from './components/WorkbenchModal';
import { WorldForge } from './components/WorldForge';
import { WorldMapModal } from './components/WorldMapModal';
import type { ZenRailMode } from './components/ZenLeftRail';
import { createInstantDemoCampaign } from './data/presets';
import { ambientAudio } from './engine/ambientAudio';
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
import {
  detectOpposedNpc,
  evaluateOpposedContest,
  findPartyAdvantage,
  inferActionAttribute,
  isUnarmedContest,
  resolveFateCheck,
} from './engine/diceEngine';
import {
  advanceClockByMinutes,
  advanceClockToNextMorning,
  ATTRIBUTE_META,
  computeMaxVigor,
  DEFAULT_ATTRIBUTES,
  defaultBaseSuppliesForTheme,
  defaultCurrencyForTheme,
  defaultNpcAttributes,
  defaultStrongholdForTheme,
  defaultWorldClockForTheme,
  deriveRelationshipFromAffinity,
  formatClockTime,
  getAsiPointsForLevel,
  getEffectiveAttributes,
  getEquippedGearBonuses,
  getSupplyMetaForTheme,
  inferItemStorage,
  isVehicleLikeItem,
  MAX_LEVEL,
  MAX_PARTY_SIZE,
  MAX_SHORT_RESTS_PER_DAY,
  NATURAL_ATTRIBUTE_CAP,
  STRONGHOLD_UPGRADE_CATALOG,
  SUPPLY_KEYS,
  xpRequiredForLevel,
} from './engine/rpgSystem';
import {
  applyCodexChanges,
  applyStateChanges,
  fetchApiHealth,
  requestCampaignEpilogue,
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
  parseImportedCampaign,
  saveCampaignAsync,
  saveSettings,
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
  SupplyType,
  TacticalAction,
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
  } | null>(null);
  const [activeDiceRoll, setActiveDiceRoll] = useState<DiceRollResult | null>(null);
  const [chapterBanner, setChapterBanner] = useState<ChapterTransitionEvent | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [leftRailMode, setLeftRailMode] = useState<ZenRailMode>('compact');
  const [mobileLeftRailOpen, setMobileLeftRailOpen] = useState(false);
  const [mobileRightHudOpen, setMobileRightHudOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savesOpen, setSavesOpen] = useState(false);
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
    const demo = createInstantDemoCampaign(settings.language);
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

    const freeformCampaign: Campaign = {
      id: `camp_free_${now}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now,
      updatedAt: now,
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
        xpToNextLevel: xpRequiredForLevel(1),
        attributePoints: 0,
        attributes: { ...DEFAULT_ATTRIBUTES },
        vigor: 100,
        maxVigor: 100,
        tension: 10,
        inspiration: 1,
        traits: [],
        skills: [],
        skillLevels: [],
        talents: [],
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

    stopSpeechPlayback();
    setUndoStack([]);
    setLastTurnMeta(null);
    persistActiveCampaign(freeformCampaign);
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
    activeCampaignRef.current = camp;
    setActiveCampaign(camp);
    setPreviewTheme(camp.world.primaryTheme);
    setPulseSecondsLeft(settings.livingWorldSeconds);
    setPulsePaused(false);
    setView('stage');
  };

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

    const crisisMode =
      baseCamp.status === 'crisis_tension' ? 'breaking_point' : undefined;

    const cleanVisibleText = actionText
      .replace(/^\[DIREÇÃO DO AUTOR\]:\s*/i, '')
      .trim();

    let diceRoll = options?.precomputedDiceRoll;
    if (!diceRoll && !isDirection) {
      const targetAttr =
        forcedAttribute ?? inferActionAttribute(actionText, intent);
      const opposedNpc = detectOpposedNpc(actionText, baseCamp.codex.npcs);
      const opposed = opposedNpc
        ? evaluateOpposedContest(baseCamp.player, opposedNpc, targetAttr, actionText)
        : undefined;
      const partyHelper = findPartyAdvantage(
        targetAttr,
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
          attributes: effectiveAttrs,
          skillLevels: baseCamp.player.skillLevels,
          forcedAttribute: targetAttr,
          rollMode: resolvedRollMode,
          advantageSource: resolvedSource,
          opposedLabel: opposed?.opposedLabel,
          dcOverride: opposed?.opposedDc,
          weatherType: baseCamp.worldClock?.weatherType,
        },
      );
    }

    if (settings.diceAnimations && diceRoll) {
      setActiveDiceRoll(diceRoll);
    }

    const preTurnSnapshot = structuredClone(baseCamp);
    if (options?.pushToUndoStack !== false) {
      setUndoStack((prev) => [...prev.slice(-4), preTurnSnapshot]);
    }
    setLastTurnMeta({
      preTurnSnapshot,
      actionText,
      intent,
      risk,
      requiresRoll,
      isDirection,
      forcedAttribute,
      diceRoll,
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
      );

      // Discard stale/superseded response (e.g. after Inspiration Reroll, Undo, or campaign switch)
      if (mySeq !== turnSeqRef.current) {
        return;
      }

      const hasTrainingStation = Boolean(
        optimisticCampaign.stronghold?.upgrades.some((u) => u.id === 'training'),
      );

      const mergedChanges = {
        ...response.stateChanges,
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
        { hasTrainingStation },
      );
      const resolvedLocation =
        response.location || optimisticCampaign.currentLocation;
      const { nextCodex, deltas: codexDeltas } = applyCodexChanges(
        optimisticCampaign.codex,
        resolvedLocation,
        nextTurn,
        response.stateChanges,
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
      if (advanceMode === 'fixed_step') {
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

        // Daily Organization Upkeep when the world clock turns to a new day
        if (nextClock.day > (nextOrganization.lastUpkeepDay ?? 1)) {
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

      const completedCampaign: Campaign = {
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
        interactionId: response.interactionId ?? optimisticCampaign.interactionId,
        engineUsed: response.engineUsed,
      };

      persistActiveCampaign(completedCampaign);

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

      // AI Storyteller evaluation after non-direction turns (non-blocking background check)
      if (!isDirection && !options?.skipStoryteller) {
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
    const opposedNpc = detectOpposedNpc(
      lastTurnMeta.actionText,
      spentCamp.codex.npcs,
    );
    const opposed = opposedNpc
      ? evaluateOpposedContest(
          spentCamp.player,
          opposedNpc,
          targetAttr,
          lastTurnMeta.actionText,
        )
      : undefined;
    const partyHelper = findPartyAdvantage(
      targetAttr,
      spentCamp.codex.npcs,
      opposedNpc?.id,
    );
    const effectiveAttrs = isUnarmedContest(lastTurnMeta.actionText)
      ? spentCamp.player.attributes
      : getEffectiveAttributes(spentCamp.player);

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

    const newRoll = resolveFateCheck(
      lastTurnMeta.actionText,
      lastTurnMeta.intent,
      lastTurnMeta.risk,
      spentCamp.difficulty,
      spentCamp.player.skills,
      true,
      spentCamp.player.tension,
      {
        attributes: effectiveAttrs,
        skillLevels: spentCamp.player.skillLevels,
        forcedAttribute: targetAttr,
        rollMode: resolvedRollMode,
        advantageSource: resolvedSource,
        opposedLabel: opposed?.opposedLabel,
        dcOverride: opposed?.opposedDc,
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
      targetAttr,
      {
        precomputedDiceRoll: newRoll,
        pushToUndoStack: false,
        forceReplace: true,
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
      const { nextPlayer, deltas } = applyStateChanges(camp.player, {
        removeItems: [consumable.name],
        vigorDelta: 30,
      });

      const entry: StoryEntry = {
        id: `entry_crisis_item_${Date.now()}`,
        role: 'narrator',
        turn: camp.turnCount,
        chapter: camp.currentChapter,
        sceneTitle: 'Fôlego Recuperado',
        location: camp.currentLocation,
        mood: camp.currentMood,
        text: `No limiar da inconsciência, você recorre a **${consumable.name}**. A dor recua o suficiente para que seus joelhos não cedam — você ainda está na luta.`,
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
      pushToast('vigor', `${consumable.name} usado · +30 Vigor`);
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
            vigorDelta: 25,
            addTraits: [...(res.stateChanges.addTraits ?? []), scarTrait],
          },
        );
        const resolvedLoc = res.location || optimisticCamp.currentLocation;
        const { nextCodex, deltas: codexDeltas } = applyCodexChanges(
          optimisticCamp.codex,
          resolvedLoc,
          nextTurn,
          res.stateChanges,
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

  const handleAdvanceWorld = useCallback(async () => {
    const camp = activeCampaignRef.current;
    if (
      !camp ||
      isBusy ||
      isTurnInFlightRef.current ||
      camp.activeWorldEvent ||
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
      );
      const resolvedLoc = response.location || latest.currentLocation;
      const { nextCodex, deltas: codexDeltas } = applyCodexChanges(
        latest.codex,
        resolvedLoc,
        latest.turnCount,
        response.stateChanges,
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
    if (currentVal >= NATURAL_ATTRIBUTE_CAP) return;

    const nextAttributes = {
      ...camp.player.attributes,
      [attr]: currentVal + 1,
    };
    const gear = getEquippedGearBonuses(camp.player.inventory);
    const nextMaxVigor = computeMaxVigor(
      camp.player.level,
      nextAttributes.con + (gear.con ?? 0),
      gear.maxVigor ?? 0,
    );
    const vigorBonus = Math.max(0, nextMaxVigor - camp.player.maxVigor);

    persistActiveCampaign({
      ...camp,
      player: {
        ...camp.player,
        attributes: nextAttributes,
        attributePoints: camp.player.attributePoints - 1,
        maxVigor: nextMaxVigor,
        vigor: Math.min(nextMaxVigor, camp.player.vigor + vigorBonus),
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
    const gear = getEquippedGearBonuses(camp.player.inventory);
    const nextMaxVigor = computeMaxVigor(
      camp.player.level,
      nextAttributes.con + (gear.con ?? 0),
      gear.maxVigor ?? 0,
    );
    const nextVigor = Math.max(
      1,
      Math.min(nextMaxVigor, camp.player.vigor + Math.max(0, nextMaxVigor - camp.player.maxVigor)),
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
    const nextInventory = camp.player.inventory.map((item) => {
      if (item.id === itemId) {
        return { ...item, equipped: equipping };
      }
      if (equipping && item.equipSlot === target.equipSlot && item.equipped) {
        return { ...item, equipped: false };
      }
      return item;
    });

    const gear = getEquippedGearBonuses(nextInventory);
    const nextMaxVigor = computeMaxVigor(
      camp.player.level,
      (camp.player.attributes.con ?? 10) + (gear.con ?? 0),
      gear.maxVigor ?? 0,
    );

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
      const nextMaxVigor = computeMaxVigor(nextLevel, mergedAttrs.con, 0);
      const currentVigor = n.vigor ?? nextMaxVigor;
      const nextVigor = Math.max(
        1,
        Math.min(nextMaxVigor, currentVigor + Math.max(0, nextMaxVigor - (n.maxVigor ?? nextMaxVigor))),
      );
      return {
        ...n,
        ...patch,
        level: nextLevel,
        attributes: mergedAttrs,
        maxVigor: nextMaxVigor,
        vigor: nextVigor,
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

      // Award crafting XP & check level-up (BG3/5e cap at Level 20 + ASI at 4/8/12/16/20)
      let nextLevel = latest.player.level;
      let nextXp = latest.player.xp + res.xpGain;
      let nextXpReq = latest.player.xpToNextLevel;
      let nextAttrPoints = latest.player.attributePoints;
      while (nextXp >= nextXpReq && nextLevel < MAX_LEVEL) {
        nextXp -= nextXpReq;
        nextLevel += 1;
        nextXpReq = xpRequiredForLevel(nextLevel);
        nextAttrPoints += getAsiPointsForLevel(nextLevel);
      }
      if (nextLevel >= MAX_LEVEL) {
        nextXp = Math.min(nextXp, nextXpReq);
      }
      const gear = getEquippedGearBonuses(nextInventory);
      const nextMaxVigor = computeMaxVigor(
        nextLevel,
        latest.player.attributes.con + (gear.con ?? 0),
        gear.maxVigor ?? 0,
      );

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
          ...latest.player,
          level: nextLevel,
          xp: nextXp,
          xpToNextLevel: nextXpReq,
          attributePoints: nextAttrPoints,
          maxVigor: nextMaxVigor,
          vigor: Math.min(nextMaxVigor, latest.player.vigor),
          inventory: nextInventory,
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

    const maxHp = computeMaxVigor(1, candidate.attributes.con, 0);
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
      level: Math.max(1, Math.min(camp.player.level, 5)),
      vigor: maxHp,
      maxVigor: maxHp,
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
            vigor: Math.max(25, Math.round((n.maxVigor ?? 100) * 0.45)),
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

    const { nextPlayer } = applyStateChanges(camp.player, {
      removeItems: [target.name],
      vigorDelta: 25,
    });
    const sysEntry: StoryEntry = {
      id: `entry_use_${Date.now()}`,
      role: 'system',
      turn: camp.turnCount,
      text: `Você consumiu ${target.name} (+25 Vigor).`,
      timestamp: Date.now(),
    };
    persistActiveCampaign({
      ...camp,
      player: nextPlayer,
      status: evaluateStatus(nextPlayer.vigor, nextPlayer.tension),
      entries: [...camp.entries, sysEntry],
    });
    pushToast('vigor', `${target.name} usado · +25 Vigor`);
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

    const gear = getEquippedGearBonuses(nextInventory);
    const nextMaxVigor = computeMaxVigor(
      camp.player.level,
      (camp.player.attributes.con ?? 10) + (gear.con ?? 0),
      gear.maxVigor ?? 0,
    );

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

    const currentClock =
      camp.worldClock ??
      defaultWorldClockForTheme(camp.world.primaryTheme, camp.language);

    const isShort = payload.kind === 'short';
    if (isShort && (currentClock.shortRestsUsedToday ?? 0) >= MAX_SHORT_RESTS_PER_DAY) {
      pushToast('error', 'Você já usou seus 2 Descansos Curtos de hoje.');
      return;
    }

    const hasMedbay = Boolean(
      camp.stronghold?.upgrades.some((u) => u.id === 'medbay'),
    );

    const nextClock: WorldClock = isShort
      ? {
          ...advanceClockByMinutes(currentClock, 90, { lang: camp.language }),
          shortRestsUsedToday: Math.min(
            MAX_SHORT_RESTS_PER_DAY,
            (currentClock.shortRestsUsedToday ?? 0) + 1,
          ),
        }
      : advanceClockToNextMorning(currentClock);

    const vigorGain = isShort ? 20 : hasMedbay ? 80 : 55;
    const tensionDrop = isShort ? 8 : 20;
    const nextVigor = Math.min(camp.player.maxVigor, camp.player.vigor + vigorGain);
    const nextTension = Math.max(0, camp.player.tension - tensionDrop);
    const actualVigorGain = nextVigor - camp.player.vigor;

    // Optional guaranteed skill training progress if focus === 'train'
    let nextPlayer = {
      ...camp.player,
      vigor: nextVigor,
      tension: nextTension,
    };
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
        },
      );
      nextPlayer = trained.nextPlayer;
    }

    const restedCamp: Campaign = {
      ...camp,
      worldClock: nextClock,
      player: nextPlayer,
    };

    const timeLabel = `Dia ${nextClock.day} · ${formatClockTime(nextClock.hour, nextClock.minute)}`;
    pushToast(
      'time',
      `${isShort ? 'Descanso Curto' : 'Descanso Longo'} (${timeLabel}) · +${actualVigorGain} Vigor`,
    );

    if (!payload.narrateScene) {
      const sysEntry: StoryEntry = {
        id: `entry_rest_silent_${Date.now()}`,
        role: 'system',
        turn: camp.turnCount,
        text: `${isShort ? 'Descanso Curto' : 'Descanso Longo'} em ${camp.currentLocation} → ${timeLabel} (+${actualVigorGain} Vigor).`,
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
        />
      ) : null}

      {view === 'home' ? (
        <SanctuaryHome
          campaigns={campaigns}
          language={settings.language}
          previewTheme={previewTheme}
          defaultDifficulty={settings.difficulty}
          onSelectPreviewTheme={setPreviewTheme}
          onStartForge={() => setView('forge')}
          onStartFreeform={handleStartFreeformStory}
          onPlayInstantDemo={handlePlayInstantDemo}
          onOpenDocs={() => handleOpenDocs('overview')}
          onOpenCampaign={handleOpenCampaign}
          onExportCampaign={exportCampaignJson}
          onDeleteCampaign={(id) => {
            void deleteCampaignAsync(id).then((updated) => {
              setCampaigns(updated);
              pushToast('info', 'Crônica removida da estante.');
            });
          }}
          onImportCampaign={handleImportCampaign}
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
      />

      <SettingsDrawer
        open={settingsOpen}
        initialTab={settingsInitialTab}
        settings={settings}
        apiHealth={apiHealth}
        onClose={() => setSettingsOpen(false)}
        onUpdateSettings={updateSettings}
        onChangeCampaignDifficulty={
          view === 'stage' ? handleChangeCampaignDifficulty : undefined
        }
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
