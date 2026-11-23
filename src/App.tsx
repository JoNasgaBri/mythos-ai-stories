import { useCallback, useEffect, useRef, useState } from 'react';
import { BaseBlueprintModal } from './components/BaseBlueprintModal';
import { CharacterInventoryModal } from './components/CharacterInventoryModal';
import { ChapterBanner } from './components/ChapterBanner';
import { ClockWeatherPopover } from './components/ClockWeatherPopover';
import { DiceRollOverlay } from './components/DiceRollOverlay';
import { NewsRumorsModal } from './components/NewsRumorsModal';
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
import { createInstantDemoCampaign } from './data/presets';
import { ambientAudio } from './engine/ambientAudio';
import {
  findPartyAdvantage,
  inferActionAttribute,
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
  getEffectiveAttributes,
  getEquippedGearBonuses,
  getSupplyMetaForTheme,
  inferItemStorage,
  isVehicleLikeItem,
  MAX_PARTY_SIZE,
  MAX_SHORT_RESTS_PER_DAY,
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
  requestJournalSummary,
  requestLivingWorldPulse,
  requestNpcPortrait,
  requestPortraitIllustration,
  requestSceneIllustration,
  requestSceneSpeech,
  requestStoryStart,
  requestStoryTurn,
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
  InventoryItem,
  ItemStorageLocation,
  JournalEntry,
  LocationRecord,
  NpcRecord,
  SaveSlot,
  StateDelta,
  StoryEntry,
  SupplyType,
  TacticalAction,
  ToastMessage,
  VehicleRecord,
  WorldClock,
  WorldConfig,
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
  const [clockOpen, setClockOpen] = useState(false);
  const [restModalOpen, setRestModalOpen] = useState(false);
  const [charInventoryOpen, setCharInventoryOpen] = useState(false);
  const [baseBlueprintOpen, setBaseBlueprintOpen] = useState(false);
  const [relationshipsOpen, setRelationshipsOpen] = useState(false);
  const [relationshipsFocusNpcId, setRelationshipsFocusNpcId] = useState<string | null>(null);
  const [rumorsOpen, setRumorsOpen] = useState(false);
  const [isFetchingRumors, setIsFetchingRumors] = useState(false);
  const [workbenchOpen, setWorkbenchOpen] = useState(false);
  const [isCrafting, setIsCrafting] = useState(false);
  const [lastCraftResult, setLastCraftResult] = useState<CraftResponse | null>(null);
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
        attributePoints: 6,
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
    stopSpeechPlayback();
    setUndoStack([]);
    setLastTurnMeta(null);
    setActiveCampaign(camp);
    setPreviewTheme(camp.world.primaryTheme);
    setPulseSecondsLeft(settings.livingWorldSeconds);
    setPulsePaused(false);
    setView('stage');
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
    },
  ) => {
    const crisisMode =
      baseCamp.status === 'crisis_tension' ? 'breaking_point' : undefined;

    const cleanVisibleText = actionText
      .replace(/^\[DIREÇÃO DO AUTOR\]:\s*/i, '')
      .trim();

    let diceRoll = options?.precomputedDiceRoll;
    if (!diceRoll && !isDirection) {
      const targetAttr =
        forcedAttribute ?? inferActionAttribute(actionText, intent);
      const partyHelper = findPartyAdvantage(targetAttr, baseCamp.codex.npcs);
      diceRoll = resolveFateCheck(
        actionText,
        intent,
        risk,
        baseCamp.difficulty,
        baseCamp.player.skills,
        requiresRoll,
        baseCamp.player.tension,
        {
          attributes: getEffectiveAttributes(baseCamp.player),
          skillLevels: baseCamp.player.skillLevels,
          forcedAttribute: targetAttr,
          rollMode: partyHelper ? 'advantage' : 'normal',
          advantageSource: partyHelper?.name,
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
      );

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

      const nextStatus = evaluateStatus(nextPlayer.vigor, nextPlayer.tension);
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
        player: nextPlayer,
        codex: nextCodex,
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
    } catch (err) {
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
      setIsBusy(false);
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

  const handleUndoTurn = () => {
    if (isBusy || undoStack.length === 0) return;
    stopSpeechPlayback();
    const prevSnapshot = undoStack[undoStack.length - 1];
    setUndoStack((stack) => stack.slice(0, -1));
    setLastTurnMeta(null);
    persistActiveCampaign(prevSnapshot);
    pushToast('info', 'Turno desfeito — estado anterior restaurado.');
  };

  const handleRegenerateTurn = async () => {
    if (isBusy || !lastTurnMeta) return;
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
    const partyHelper = findPartyAdvantage(targetAttr, spentCamp.codex.npcs);

    const newRoll = resolveFateCheck(
      lastTurnMeta.actionText,
      lastTurnMeta.intent,
      lastTurnMeta.risk,
      spentCamp.difficulty,
      spentCamp.player.skills,
      true,
      spentCamp.player.tension,
      {
        attributes: getEffectiveAttributes(spentCamp.player),
        skillLevels: spentCamp.player.skillLevels,
        forcedAttribute: targetAttr,
        rollMode: partyHelper ? 'advantage' : 'normal',
        advantageSource: partyHelper?.name,
        rerolledWithInspiration: true,
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
    if (!camp || isBusy || camp.status !== 'active') return;

    setIsBusy(true);
    try {
      const response = await requestLivingWorldPulse(camp, settings, apiHealth);
      const { nextPlayer, deltas: playerDeltas } = applyStateChanges(
        camp.player,
        response.stateChanges,
      );
      const resolvedLoc = response.location || camp.currentLocation;
      const { nextCodex, deltas: codexDeltas } = applyCodexChanges(
        camp.codex,
        resolvedLoc,
        camp.turnCount,
        response.stateChanges,
      );
      const nextStatus = evaluateStatus(nextPlayer.vigor, nextPlayer.tension);

      const pulseEntry: StoryEntry = {
        id: `entry_pulse_${Date.now()}`,
        role: 'pulse',
        turn: camp.turnCount,
        sceneTitle: response.sceneTitle,
        location: resolvedLoc,
        mood: response.mood,
        text: response.narration,
        deltas: [...playerDeltas, ...codexDeltas] as StateDelta[],
        timestamp: Date.now(),
      };

      persistActiveCampaign({
        ...camp,
        currentLocation: resolvedLoc,
        currentMood: response.mood || camp.currentMood,
        player: nextPlayer,
        codex: nextCodex,
        status: nextStatus,
        actions:
          response.actions.length > 0
            ? toTacticalActions(response.actions)
            : camp.actions,
        entries: [...camp.entries, pulseEntry],
        engineUsed: response.engineUsed,
      });
      setPulseSecondsLeft(settings.livingWorldSeconds);
      if (response.waitingForResponse || nextStatus !== 'active') {
        setPulsePaused(true);
      }
    } catch (err) {
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Erro no Pulso do Mundo Vivo.',
      );
    } finally {
      setIsBusy(false);
    }
  }, [apiHealth, isBusy, persistActiveCampaign, pushToast, settings]);

  useEffect(() => {
    if (
      view !== 'stage' ||
      !activeCampaign ||
      activeCampaign.status !== 'active' ||
      !settings.livingWorldEnabled ||
      pulsePaused ||
      isBusy ||
      settingsOpen ||
      savesOpen
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setPulseSecondsLeft((prev) => {
        if (prev <= 1) {
          void handleAdvanceWorld();
          return settings.livingWorldSeconds;
        }
        return prev - 1;
      });
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
    if (currentVal >= 20) return;

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

      // Award crafting XP & check level-up
      let nextLevel = latest.player.level;
      let nextXp = latest.player.xp + res.xpGain;
      let nextXpReq = latest.player.xpToNextLevel;
      let nextAttrPoints = latest.player.attributePoints;
      while (nextXp >= nextXpReq) {
        nextXp -= nextXpReq;
        nextLevel += 1;
        nextXpReq = xpRequiredForLevel(nextLevel);
        nextAttrPoints += 2;
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

  return (
    <div className="relative min-h-screen">
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
        saveSlotCount={saveSlots.length}
        settings={settings}
        usingGemini={usingGemini}
        focusMode={focusMode}
        pulsePaused={pulsePaused}
        pulseSecondsLeft={pulseSecondsLeft}
        isBusy={isBusy}
        onBackHome={() => {
          stopSpeechPlayback();
          setView('home');
        }}
        onOpenSaves={() => setSavesOpen(true)}
        onOpenMap={() => setWorldMapOpen(true)}
        onOpenClock={() => setClockOpen(true)}
        onOpenCharacterInventory={() => setCharInventoryOpen(true)}
        onOpenRelationships={() => openRelationships()}
        onOpenRumors={() => setRumorsOpen(true)}
        onOpenWorkbench={() => {
          setLastCraftResult(null);
          setWorkbenchOpen(true);
        }}
        onLongRest={() => setRestModalOpen(true)}
        onToggleAmbientSound={() =>
          updateSettings({ ambientSoundEnabled: !settings.ambientSoundEnabled })
        }
        onToggleFocus={() => setFocusMode((f) => !f)}
        onTogglePulsePause={() => setPulsePaused((p) => !p)}
        onAdvanceWorldNow={() => void handleAdvanceWorld()}
        onToggleColorMode={() =>
          updateSettings({
            colorMode: settings.colorMode === 'dark' ? 'light' : 'dark',
          })
        }
        onOpenSettings={(tab = 'game') => {
          setSettingsInitialTab(tab);
          setSettingsOpen(true);
        }}
      />

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
          language={settings.language}
          focusMode={focusMode}
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
          onOpenCharacterInventory={() => setCharInventoryOpen(true)}
          onOpenBaseBlueprint={() => setBaseBlueprintOpen(true)}
          onOpenRelationships={(npcId) => openRelationships(npcId)}
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
            onClose={() => setWorldMapOpen(false)}
            onTravelLocation={handleTravelFromMap}
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
            onGeneratePortrait={() => void handleGeneratePortrait()}
            onOpenBaseBlueprint={() => setBaseBlueprintOpen(true)}
            onOpenWorkbench={() => {
              setLastCraftResult(null);
              setWorkbenchOpen(true);
            }}
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
