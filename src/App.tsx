import { useCallback, useEffect, useRef, useState } from 'react';
import { ChapterBanner } from './components/ChapterBanner';
import { DiceRollOverlay } from './components/DiceRollOverlay';
import { SanctuaryHome } from './components/SanctuaryHome';
import { SaveSlotsDrawer } from './components/SaveSlotsDrawer';
import { SettingsDrawer } from './components/SettingsDrawer';
import { StoryStage } from './components/StoryStage';
import { ToastStack } from './components/ToastStack';
import { TopBar } from './components/TopBar';
import { WorldForge } from './components/WorldForge';
import { createInstantDemoCampaign } from './data/presets';
import { resolveFateCheck } from './engine/diceEngine';
import {
  applyCodexChanges,
  applyStateChanges,
  fetchApiHealth,
  requestCampaignEpilogue,
  requestJournalSummary,
  requestLivingWorldPulse,
  requestPortraitIllustration,
  requestSceneIllustration,
  requestStoryStart,
  requestStoryTurn,
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
  Campaign,
  CampaignEpilogue,
  CampaignStatus,
  ChapterTransitionEvent,
  DiceRollResult,
  DifficultyId,
  InventoryItem,
  JournalEntry,
  SaveSlot,
  StateDelta,
  StoryEntry,
  TacticalAction,
  ToastMessage,
  WorldThemeId,
} from './types/game';

function toTacticalActions(
  raw: Array<{ label: string; intent: ActionIntent; risk: ActionRisk }>,
): TacticalAction[] {
  return raw.map((a, idx) => ({
    id: `act_${Date.now()}_${idx}`,
    label: a.label,
    intent: a.intent,
    risk: a.risk,
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

  const activeCampaignRef = useRef<Campaign | null>(activeCampaign);
  activeCampaignRef.current = activeCampaign;
  const bannerTimerRef = useRef<number | null>(null);

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
      const res = await requestPortraitIllustration(
        camp.world,
        camp.player,
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

  const handleOpenCampaign = (camp: Campaign) => {
    setActiveCampaign(camp);
    setPreviewTheme(camp.world.primaryTheme);
    setPulseSecondsLeft(settings.livingWorldSeconds);
    setPulsePaused(false);
    setView('stage');
  };

  const handleSendAction = async (
    actionText: string,
    intent: ActionIntent = 'bold',
    risk: ActionRisk = 'medium',
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

    const crisisMode =
      camp.status === 'crisis_tension' ? 'breaking_point' : undefined;

    const diceRoll = resolveFateCheck(
      actionText,
      intent,
      risk,
      camp.difficulty,
      camp.player.skills,
    );

    if (settings.diceAnimations && diceRoll) {
      setActiveDiceRoll(diceRoll);
    }

    const nextTurn = camp.turnCount + 1;

    const playerEntry: StoryEntry = {
      id: `entry_p_${Date.now()}`,
      role: 'player',
      turn: nextTurn,
      text: actionText,
      diceRoll,
      timestamp: Date.now(),
    };

    const optimisticCampaign: Campaign = {
      ...camp,
      turnCount: nextTurn,
      entries: [...camp.entries, playerEntry],
    };

    setActiveCampaign(optimisticCampaign);
    setIsBusy(true);
    setPulseSecondsLeft(settings.livingWorldSeconds);

    try {
      const response = await requestStoryTurn(
        optimisticCampaign,
        actionText,
        diceRoll,
        settings,
        apiHealth,
        crisisMode,
      );

      const { nextPlayer, deltas: playerDeltas } = applyStateChanges(
        optimisticCampaign.player,
        response.stateChanges,
      );
      const resolvedLocation =
        response.location || optimisticCampaign.currentLocation;
      const { nextCodex, deltas: codexDeltas } = applyCodexChanges(
        optimisticCampaign.codex,
        resolvedLocation,
        nextTurn,
        response.stateChanges,
      );

      const nextStatus = evaluateStatus(nextPlayer.vigor, nextPlayer.tension);
      const nextActions = toTacticalActions(response.actions);
      const allDeltas: StateDelta[] = [...playerDeltas, ...codexDeltas];

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
        currentLocation: resolvedLocation,
        currentMood: response.mood || optimisticCampaign.currentMood,
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
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Falha ao gerar resposta.',
      );
    } finally {
      setIsBusy(false);
    }
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

  return (
    <div className="relative min-h-screen">
      <div className="mythos-ambient" />
      <div className="mythos-grain" />

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
        onBackHome={() => setView('home')}
        onOpenSaves={() => setSavesOpen(true)}
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
          onSelectPreviewTheme={setPreviewTheme}
          onStartForge={() => setView('forge')}
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
          onSendAction={handleSendAction}
          onTypingActivity={handleTypingActivity}
          onSummarizeNow={() =>
            void runJournalCompressionIfNeeded(activeCampaign, true)
          }
          onAddCanonFact={handleAddCanonFact}
          onRemoveCanonFact={handleRemoveCanonFact}
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
        onComplete={() => setActiveDiceRoll(null)}
      />

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
