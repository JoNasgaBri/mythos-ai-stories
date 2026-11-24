import {
  demoForgeWorld,
  demoGenerateEpilogue,
  demoPulseStory,
  demoStartStory,
  demoSummarizeChronicle,
  demoTurnStory,
} from '../engine/demoEngine';
import {
  generateDemoPortraitArt,
  generateDemoSceneArt,
} from '../engine/demoArtwork';
import {
  computeMaxVigor,
  defaultAffinityFromStance,
  defaultNpcAttributes,
  deriveRelationshipFromAffinity,
  getAsiPointsForLevel,
  getEquippedGearBonuses,
  getProficiencyBonus,
  inferEquipSlotFromCategory,
  inferItemStorage,
  inferNpcAssistAttribute,
  inferSkillAttribute,
  MAX_INSPIRATION,
  MAX_LEVEL,
  RELATIONSHIP_META,
  syncSkillLevels,
  xpRequiredForLevel,
} from '../engine/rpgSystem';
import type {
  AiStateChanges,
  AppSettings,
  Campaign,
  CanonFact,
  CraftRequest,
  CraftResponse,
  DiceRollResult,
  EpilogueResponse,
  FactionRecord,
  ForgeWorldRequest,
  ForgedWorldBlueprint,
  IllustrationResponse,
  InventoryItem,
  ItemRarity,
  JournalSummaryResponse,
  LanguageId,
  LocationRecord,
  NpcRecord,
  PlayerState,
  Quest,
  SkillProgress,
  SpeechResponse,
  StateDelta,
  StoryEntry,
  StoryTurnResponse,
  TalentRecord,
  WorldCodex,
  WorldConfig,
  WorldEventCategory,
  WorldEventResponse,
  WorldRumorsResponse,
  WorldThemeId,
} from '../types/game';

export interface ApiHealthStatus {
  ok: boolean;
  hasServerKey: boolean;
  defaultModel: string;
}

export async function fetchApiHealth(): Promise<ApiHealthStatus> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Health check failed');
    return (await res.json()) as ApiHealthStatus;
  } catch {
    return { ok: false, hasServerKey: false, defaultModel: 'gemini-3.8-flash' };
  }
}

export function shouldUseGemini(
  settings: AppSettings,
  health: ApiHealthStatus,
): boolean {
  if (settings.forceDemoMode) return false;
  return Boolean(settings.geminiApiKey.trim()) || health.hasServerKey;
}

async function postJson<T>(
  url: string,
  body: unknown,
  settings: AppSettings,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (settings.geminiApiKey.trim()) {
    headers['x-gemini-api-key'] = settings.geminiApiKey.trim();
  }
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errBody = (await response.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
    };
    throw new Error(errBody.error || `API request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

function briefDemoDelay(ms = 480): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Strips large base64 data URLs (scene art, portraits, cover) and keeps only
 * the recent entry window before POSTing to serverless API routes.
 * Prevents HTTP 413 Payload Too Large on Vercel (4.5 MB limit) and makes mobile turns instant.
 */
function stripHeavyMediaForApi(campaign: Campaign): Campaign {
  return {
    ...campaign,
    coverImageUrl: undefined,
    player: {
      ...campaign.player,
      portraitUrl: undefined,
    },
    codex: {
      ...campaign.codex,
      npcs: campaign.codex.npcs.map((n) => ({
        ...n,
        portraitUrl: undefined,
      })),
    },
    entries: campaign.entries.slice(-20).map((e) => ({
      ...e,
      imageUrl: undefined,
      beats: undefined,
    })),
  };
}

export async function requestStoryStart(
  campaign: Campaign,
  settings: AppSettings,
  health: ApiHealthStatus,
): Promise<StoryTurnResponse> {
  if (shouldUseGemini(settings, health)) {
    return postJson<StoryTurnResponse>(
      '/api/story/start',
      {
        campaign: stripHeavyMediaForApi(campaign),
        responseLength: settings.responseLength,
        narrationPrefs: {
          responseLength: settings.responseLength,
          narrativeStyle: settings.narrativeStyle,
          narrativePerspective: settings.narrativePerspective,
          customAiInstructions: settings.customAiInstructions,
        },
        model: settings.geminiModel,
      },
      settings,
    );
  }
  await briefDemoDelay(520);
  return demoStartStory(campaign);
}

export async function requestStoryTurn(
  campaign: Campaign,
  action: string,
  diceRoll: DiceRollResult | undefined,
  settings: AppSettings,
  health: ApiHealthStatus,
  crisisMode?: 'survival_test' | 'breaking_point',
): Promise<StoryTurnResponse> {
  if (shouldUseGemini(settings, health)) {
    return postJson<StoryTurnResponse>(
      '/api/story/turn',
      {
        campaign: stripHeavyMediaForApi(campaign),
        action,
        diceRoll,
        responseLength: settings.responseLength,
        narrationPrefs: {
          responseLength: settings.responseLength,
          narrativeStyle: settings.narrativeStyle,
          narrativePerspective: settings.narrativePerspective,
          customAiInstructions: settings.customAiInstructions,
        },
        model: settings.geminiModel,
        crisisMode,
      },
      settings,
    );
  }
  await briefDemoDelay(560);
  return demoTurnStory(
    campaign,
    action,
    diceRoll,
    settings.responseLength,
    crisisMode,
  );
}

export async function requestLivingWorldPulse(
  campaign: Campaign,
  settings: AppSettings,
  health: ApiHealthStatus,
): Promise<StoryTurnResponse> {
  if (shouldUseGemini(settings, health)) {
    return postJson<StoryTurnResponse>(
      '/api/story/pulse',
      { campaign: stripHeavyMediaForApi(campaign) },
      settings,
    );
  }
  await briefDemoDelay(400);
  return demoPulseStory(campaign);
}

export async function requestJournalSummary(
  campaign: Campaign,
  mode: 'chapter' | 'arc_compression',
  settings: AppSettings,
  health: ApiHealthStatus,
): Promise<JournalSummaryResponse> {
  if (shouldUseGemini(settings, health)) {
    return postJson<JournalSummaryResponse>(
      '/api/story/summarize',
      { campaign: stripHeavyMediaForApi(campaign), mode },
      settings,
    );
  }
  await briefDemoDelay(320);
  return demoSummarizeChronicle(campaign, mode);
}

export async function requestCampaignEpilogue(
  campaign: Campaign,
  outcome: 'fallen' | 'victory',
  settings: AppSettings,
  health: ApiHealthStatus,
): Promise<EpilogueResponse> {
  if (shouldUseGemini(settings, health)) {
    return postJson<EpilogueResponse>(
      '/api/story/epilogue',
      {
        campaign: stripHeavyMediaForApi(campaign),
        outcome,
        model: settings.geminiModel,
      },
      settings,
    );
  }
  await briefDemoDelay(540);
  return demoGenerateEpilogue(campaign, outcome);
}

export async function requestForgeWorld(
  request: ForgeWorldRequest,
  settings: AppSettings,
  health: ApiHealthStatus,
): Promise<ForgedWorldBlueprint> {
  if (shouldUseGemini(settings, health)) {
    return postJson<ForgedWorldBlueprint>(
      '/api/story/forge',
      { request, model: settings.geminiModel },
      settings,
    );
  }
  await briefDemoDelay(520);
  return demoForgeWorld(request);
}

export async function requestWorldEvent(
  campaign: Campaign,
  settings: AppSettings,
  health: ApiHealthStatus,
  options?: {
    lastActionText?: string;
    suggestedCategory?: WorldEventCategory;
    triggerReason?: string;
  },
): Promise<WorldEventResponse> {
  if (shouldUseGemini(settings, health)) {
    return postJson<WorldEventResponse>(
      '/api/story/event',
      {
        campaign: stripHeavyMediaForApi(campaign),
        lastActionText: options?.lastActionText,
        suggestedCategory: options?.suggestedCategory,
        triggerReason: options?.triggerReason,
      },
      settings,
    );
  }
  await briefDemoDelay(440);
  const companion = campaign.codex.npcs.find((n) => n.inParty && n.status === 'alive');
  const category = options?.suggestedCategory ?? 'dilemma';
  const loc = campaign.currentLocation || 'sua região';
  return {
    title:
      category === 'opportunity'
        ? 'Carga Abandonada na Rota Lateral'
        : category === 'base'
          ? 'Batida Inesperada no Portão'
          : 'Sinal de Emergência Próximo',
    category,
    urgency: category === 'crisis' ? 'urgent' : 'medium',
    description: `Enquanto a rotina avança em ${loc}, um imprevisto quebra o silêncio: um veículo civil parado na estrada secundária pisca os faróis intermitentemente enquanto alguém pede ajuda por suprimentos médicos e informações sobre bloqueios na região.`,
    companionReaction: companion
      ? {
          speaker: companion.name,
          quote:
            'Pode ser uma oportunidade de ganhar um aliado confiável... ou uma armadilha para descobrir onde ficamos. Como você quer jogar essa?',
        }
      : undefined,
    choices: [
      {
        label: 'Ajudar oferecendo suprimentos e ouvir o que sabem',
        consequenceHint: '-1 Remédio · +10 Afinidade · Nova informação',
        intent: 'diplomatic',
        risk: 'low',
        requiresRoll: false,
        attribute: 'cha',
        supplyDeltas: { meds: -1 },
        affinityDelta: companion ? 10 : undefined,
        targetNpcName: companion?.name,
        tensionDelta: -5,
        narrativeHook:
          'Decido ajudar os viajantes oferecendo um kit médico da base e conversando para descobrir o que viram nas estradas.',
      },
      {
        label: 'Negociar à distância trocando informação por abrigo breve',
        consequenceHint: 'Teste d20 (CAR) · Preserva segredo da base',
        intent: 'diplomatic',
        risk: 'medium',
        requiresRoll: true,
        attribute: 'cha',
        supplyDeltas: { materials: 2 },
        narrativeHook:
          'Mantenho distância segura e negocio com firmeza, oferecendo ajuda limitada apenas em troca de peças e informações verificáveis.',
      },
      {
        label: 'Manter silêncio total e reforçar a vigilância do perímetro',
        consequenceHint: '+5 Defesa · +6 Tensão · Segurança máxima',
        intent: 'stealth',
        risk: 'safe',
        requiresRoll: false,
        attribute: 'wis',
        defenseDelta: 5,
        tensionDelta: 6,
        narrativeHook:
          'Apago qualquer sinal visível, mantenho silêncio absoluto e reforço a vigilância até o veículo seguir caminho.',
      },
    ],
    engineUsed: 'demo',
  };
}

export async function requestWorldRumors(
  campaign: Campaign,
  settings: AppSettings,
  health: ApiHealthStatus,
): Promise<WorldRumorsResponse> {
  if (shouldUseGemini(settings, health)) {
    return postJson<WorldRumorsResponse>(
      '/api/story/rumors',
      { campaign: stripHeavyMediaForApi(campaign) },
      settings,
    );
  }
  await briefDemoDelay(420);
  const theme = campaign.world.primaryTheme;
  const channelByTheme: Record<WorldThemeId, { name: string; sub: string; src: string }> = {
    zombies: {
      name: 'Frequência 104.7 FM & Rede Local',
      sub: 'Sinal intermitente · Monitorando boletins civis',
      src: 'Boletim de Emergência',
    },
    apocalyptic: {
      name: 'Onda Curta & Rádio dos Comboios',
      sub: 'Estática moderada · Transmissões da região',
      src: 'Operador da Estrada',
    },
    cyberpunk: {
      name: 'Feed da Darknet & Rede Urbana',
      sub: 'Canal criptografado · Sinais da cidade',
      src: 'Broker Anônimo',
    },
    mystery: {
      name: 'Edição Extra & Boletim Policial',
      sub: 'Recortes do dia · Rumores da cidade',
      src: 'Gazeta Local',
    },
    fantasy: {
      name: 'Quadro da Taverna & Pergaminhos',
      sub: 'Contratos recentes e boatos de viajantes',
      src: 'Estalajadeiro',
    },
  };
  const ch = channelByTheme[theme] ?? channelByTheme.fantasy;
  const loc = campaign.currentLocation || 'Setor Central';
  return {
    channelName: ch.name,
    channelSubtitle: ch.sub,
    items: [
      {
        headline: `Movimentação incomum perto de ${loc}`,
        source: ch.src,
        body: `Testemunhas relatam comboios fechados e racionamento discreto de suprimentos nas últimas horas. Nenhuma autoridade confirmou o motivo oficial.`,
        locationHint: loc,
        urgency: 'urgent',
        hookAction: `Investigar os relatos de movimentação incomum perto de ${loc} e descobrir o que está sendo escondido.`,
        questTitle: `Sinal em ${loc}`,
      },
      {
        headline: 'Estoque privado disponível para troca rápida',
        source: 'Canal Comunitário',
        body: 'Um comerciante local está liquidando ferramentas, peças reforçadas e mantimentos antes de deixar a região.',
        locationHint: 'Distrito Comercial',
        urgency: 'medium',
        hookAction: 'Ir até o comerciante no Distrito Comercial para negociar peças, suprimentos e informações.',
        questTitle: 'Liquidação de Suprimentos',
      },
      {
        headline: 'Rumor sobre abrigo reforçado fora da rota principal',
        source: 'Viajante de Passagem',
        body: 'Comentários discretos falam de um ponto elevado com gerador próprio e boa visibilidade das estradas.',
        locationHint: 'Colinas do Norte',
        urgency: 'low',
        hookAction: 'Buscar informações sobre o abrigo reforçado nas Colinas do Norte e verificar sua localização no mapa.',
        questTitle: 'Rota das Colinas',
      },
    ],
    engineUsed: 'demo',
  };
}

const RARITY_UPGRADE_STEP: Record<ItemRarity, ItemRarity> = {
  common: 'uncommon',
  uncommon: 'rare',
  rare: 'epic',
  epic: 'legendary',
  legendary: 'legendary',
};

export async function requestCraftUpgrade(
  campaign: Campaign,
  request: CraftRequest,
  settings: AppSettings,
  health: ApiHealthStatus,
): Promise<CraftResponse> {
  if (shouldUseGemini(settings, health)) {
    return postJson<CraftResponse>(
      '/api/story/craft',
      { campaign: stripHeavyMediaForApi(campaign), request },
      settings,
    );
  }
  await briefDemoDelay(480);
  if (request.targetKind === 'vehicle') {
    const veh = (campaign.stronghold?.vehicles ?? []).find((v) => v.id === request.targetId);
    const baseName = veh?.name ?? 'Veículo';
    const idea = request.blueprintIdea?.trim();
    return {
      success: true,
      narrativeLog: `Na oficina da base, você aplicou ${request.materialsSpent} materiais para reforçar ${baseName}${idea ? ` (${idea})` : ''}, elevando sua resistência estrutural e confiabilidade em estrada.`,
      upgradedVehicle: {
        name: baseName.includes('Reforçad') || baseName.includes('Blindad')
          ? baseName
          : `${baseName} (Reforçado)`,
        kind: veh?.kind ?? 'Veículo',
        conditionGain: 25,
        fuelGain: 10,
        note: idea
          ? `Modificação da oficina: ${idea}. Chassi e proteção reforçados.`
          : 'Blindagem leve, suspensão revisada e compartimento otimizado na oficina.',
      },
      xpGain: 40,
      engineUsed: 'demo',
    };
  }

  const item = campaign.player.inventory.find((i) => i.id === request.targetId);
  const nextRarity = RARITY_UPGRADE_STEP[item?.rarity ?? 'common'];
  const idea = request.blueprintIdea?.trim();
  return {
    success: true,
    narrativeLog: `Você trabalhou com precisão na bancada combinando ${item?.name ?? 'o equipamento'} com ${request.materialsSpent} materiais${idea ? ` para ${idea}` : ''}, criando uma versão aprimorada.`,
    upgradedItem: {
      name: item?.name.includes('Aprimorad')
        ? item.name
        : `${item?.name ?? 'Equipamento'} (Aprimorado)`,
      category: item?.category ?? 'tool',
      rarity: nextRarity,
      note: idea
        ? `Customizado na bancada: ${idea}.`
        : 'Reforçado e calibrado na bancada da base.',
      equipSlot: item?.equipSlot ?? 'utility',
      bonuses: {
        ...(item?.bonuses ?? {}),
        dex: ((item?.bonuses?.dex ?? 0) + 1),
      },
    },
    xpGain: 35,
    engineUsed: 'demo',
  };
}

export async function requestSceneIllustration(
  campaign: Campaign,
  entry: StoryEntry,
  settings: AppSettings,
  health: ApiHealthStatus,
): Promise<IllustrationResponse> {
  const title = entry.sceneTitle || campaign.world.title;
  const location = entry.location || campaign.currentLocation;

  if (shouldUseGemini(settings, health)) {
    return postJson<IllustrationResponse>(
      '/api/story/illustrate',
      {
        kind: 'scene',
        theme: campaign.world.primaryTheme,
        worldTitle: campaign.world.title,
        era: campaign.world.era,
        creativePrompt: campaign.world.creativePrompt,
        location,
        sceneTitle: title,
        sceneText: entry.text,
      },
      settings,
    );
  }

  await briefDemoDelay(420);
  return {
    dataUrl: generateDemoSceneArt(
      campaign.world.primaryTheme,
      title,
      location,
      entry.mood || campaign.currentMood,
    ),
    caption: `${location} · ${title}`,
    engineUsed: 'demo',
  };
}

export async function requestPortraitIllustration(
  world: Pick<WorldConfig, 'title' | 'primaryTheme' | 'era' | 'creativePrompt'>,
  player: Pick<PlayerState, 'name' | 'occupation' | 'traits'> & {
    equippedItems?: string[];
  },
  settings: AppSettings,
  health: ApiHealthStatus,
): Promise<IllustrationResponse> {
  if (shouldUseGemini(settings, health)) {
    return postJson<IllustrationResponse>(
      '/api/story/illustrate',
      {
        kind: 'portrait',
        theme: world.primaryTheme,
        worldTitle: world.title,
        era: world.era,
        creativePrompt: world.creativePrompt,
        characterName: player.name,
        characterOccupation: player.occupation,
        characterTraits: player.traits,
        equippedItems: player.equippedItems,
      },
      settings,
    );
  }

  await briefDemoDelay(380);
  return {
    dataUrl: generateDemoPortraitArt(
      world.primaryTheme,
      player.name,
      player.occupation,
    ),
    caption: `${player.name} · ${player.occupation}`,
    engineUsed: 'demo',
  };
}

export async function requestNpcPortrait(
  world: Pick<WorldConfig, 'title' | 'primaryTheme' | 'era' | 'creativePrompt'>,
  npc: Pick<
    NpcRecord,
    'name' | 'role' | 'notes' | 'age' | 'height' | 'appearance' | 'personality'
  >,
  settings: AppSettings,
  health: ApiHealthStatus,
): Promise<IllustrationResponse> {
  if (shouldUseGemini(settings, health)) {
    const visualTraits = [
      npc.age ? `Age ${npc.age}` : '',
      npc.height ? `Height ${npc.height}` : '',
      npc.appearance?.trim() || '',
      npc.personality?.trim() ? `Expression/vibe: ${npc.personality.trim()}` : '',
      npc.notes ? npc.notes.slice(0, 140) : '',
    ].filter(Boolean);

    return postJson<IllustrationResponse>(
      '/api/story/illustrate',
      {
        kind: 'portrait',
        theme: world.primaryTheme,
        worldTitle: world.title,
        era: world.era,
        creativePrompt: world.creativePrompt,
        characterName: npc.name,
        characterOccupation: npc.role,
        characterTraits: visualTraits,
      },
      settings,
    );
  }

  await briefDemoDelay(320);
  return {
    dataUrl: generateDemoPortraitArt(world.primaryTheme, npc.name, npc.role),
    caption: `${npc.name} · ${npc.role}`,
    engineUsed: 'demo',
  };
}

const speechAudioCache = new Map<string, string>();

export async function requestSceneSpeech(
  entryId: string,
  text: string,
  language: LanguageId,
  theme: WorldThemeId,
  settings: AppSettings,
  health: ApiHealthStatus,
): Promise<SpeechResponse | null> {
  const cacheKey = `${entryId}_${language}_${theme}`;
  const cached = speechAudioCache.get(cacheKey);
  if (cached) {
    return { dataUrl: cached, mimeType: 'audio/wav', engineUsed: 'gemini' };
  }

  if (shouldUseGemini(settings, health)) {
    const res = await postJson<SpeechResponse>(
      '/api/story/speak',
      { text, language, theme },
      settings,
    );
    if (res.dataUrl) {
      speechAudioCache.set(cacheKey, res.dataUrl);
    }
    return res;
  }

  return null;
}

export function applyStateChanges(
  player: PlayerState,
  changes: AiStateChanges | undefined,
  turn = 0,
  options?: { hasTrainingStation?: boolean },
): {
  nextPlayer: PlayerState;
  deltas: StateDelta[];
  worldIdentityPatch?: Partial<Pick<WorldConfig, 'title' | 'era' | 'premise'>>;
} {
  if (!changes) {
    return { nextPlayer: player, deltas: [] };
  }

  const deltas: StateDelta[] = [];
  let name = player.name;
  let age = player.age;
  let occupation = player.occupation;
  let worldIdentityPatch:
    | Partial<Pick<WorldConfig, 'title' | 'era' | 'premise'>>
    | undefined;

  if (changes.updateIdentity) {
    const id = changes.updateIdentity;
    if (id.name?.trim()) name = id.name.trim();
    if (typeof id.age === 'number' && id.age >= 14 && id.age <= 999) {
      age = Math.round(id.age);
    }
    if (id.occupation?.trim()) occupation = id.occupation.trim();
    if (id.worldTitle?.trim() || id.worldEra?.trim() || id.worldPremise?.trim()) {
      worldIdentityPatch = {};
      if (id.worldTitle?.trim()) worldIdentityPatch.title = id.worldTitle.trim();
      if (id.worldEra?.trim()) worldIdentityPatch.era = id.worldEra.trim();
      if (id.worldPremise?.trim()) worldIdentityPatch.premise = id.worldPremise.trim();
    }
  }

  let level = player.level ?? 1;
  let xp = player.xp ?? 0;
  let xpToNextLevel = player.xpToNextLevel ?? xpRequiredForLevel(level);
  let attributePoints = player.attributePoints ?? 0;
  let maxVigor = player.maxVigor;
  let vigor = player.vigor;
  let tension = player.tension;
  let inspiration =
    typeof player.inspiration === 'number'
      ? Math.max(0, Math.min(MAX_INSPIRATION, player.inspiration))
      : 1;

  const inventory: InventoryItem[] = player.inventory.map((i) => ({ ...i }));
  if (Array.isArray(changes.addItems)) {
    for (const item of changes.addItems) {
      if (!item?.name) continue;
      const qty = Math.max(1, item.quantity ?? 1);
      const existing = inventory.find(
        (x) => x.name.toLowerCase() === item.name.toLowerCase(),
      );
      if (existing) {
        existing.quantity += qty;
        if (item.rarity && !existing.rarity) existing.rarity = item.rarity;
        if (item.bonuses && !existing.bonuses) existing.bonuses = item.bonuses;
      } else {
        const category = item.category ?? 'misc';
        inventory.push({
          id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: item.name,
          category,
          quantity: qty,
          note: item.note,
          rarity: item.rarity ?? 'common',
          storage:
            item.storage ?? inferItemStorage(item.name, category, qty),
          equipSlot:
            item.equipSlot ?? inferEquipSlotFromCategory(category, item.name),
          equipped: false,
          bonuses: item.bonuses,
        });
      }
      deltas.push({
        kind: 'item_add',
        label: `+ ${item.name}${qty > 1 ? ` (x${qty})` : ''}`,
        positive: true,
      });
    }
  }

  if (Array.isArray(changes.removeItems)) {
    for (const itemName of changes.removeItems) {
      const idx = inventory.findIndex(
        (x) => x.name.toLowerCase() === itemName.toLowerCase(),
      );
      if (idx >= 0) {
        if (inventory[idx].quantity > 1) {
          inventory[idx].quantity -= 1;
        } else {
          inventory.splice(idx, 1);
        }
        deltas.push({
          kind: 'item_remove',
          label: `- ${itemName}`,
          positive: false,
        });
      }
    }
  }

  // XP & automatic Level Up progression
  if (typeof changes.xpGain === 'number' && changes.xpGain > 0) {
    const gained = Math.min(400, Math.round(changes.xpGain));
    xp += gained;
    deltas.push({
      kind: 'xp',
      label: `+${gained} XP`,
      positive: true,
    });

    while (xp >= xpToNextLevel && level < MAX_LEVEL) {
      const prevProf = getProficiencyBonus(level);
      xp -= xpToNextLevel;
      level += 1;
      const asiGain = getAsiPointsForLevel(level);
      attributePoints += asiGain;
      xpToNextLevel = xpRequiredForLevel(level);
      const nextProf = getProficiencyBonus(level);
      const gearBonuses = getEquippedGearBonuses(inventory);
      const nextMax = computeMaxVigor(
        level,
        (player.attributes?.con ?? 10) + (gearBonuses.con ?? 0),
        gearBonuses.maxVigor ?? 0,
      );
      maxVigor = Math.max(maxVigor, nextMax);
      vigor = Math.min(maxVigor, vigor + 12);
      const perks = [
        asiGain > 0 ? `+${asiGain} ASI` : null,
        nextProf > prevProf ? `Prof. +${nextProf}` : null,
        '+Vigor Máx',
      ]
        .filter(Boolean)
        .join(' · ');
      deltas.push({
        kind: 'level',
        label: `Nível ${level}! (${perks})`,
        positive: true,
      });
    }
    if (level >= MAX_LEVEL) {
      xp = Math.min(xp, xpToNextLevel);
    }
  }

  if (typeof changes.vigorDelta === 'number' && changes.vigorDelta !== 0) {
    const prev = vigor;
    vigor = Math.max(0, Math.min(maxVigor, vigor + changes.vigorDelta));
    const diff = vigor - prev;
    if (diff !== 0) {
      deltas.push({
        kind: 'vigor',
        label: `${diff > 0 ? '+' : ''}${diff} Vigor`,
        positive: diff > 0,
      });
    }
  }

  if (typeof changes.tensionDelta === 'number' && changes.tensionDelta !== 0) {
    const prev = tension;
    tension = Math.max(0, Math.min(100, tension + changes.tensionDelta));
    const diff = tension - prev;
    if (diff !== 0) {
      deltas.push({
        kind: 'tension',
        label: `${diff > 0 ? '+' : ''}${diff}% Tensão`,
        positive: diff < 0,
      });
    }
  }

  if (typeof changes.inspirationGain === 'number' && changes.inspirationGain > 0) {
    const prev = inspiration;
    inspiration = Math.min(MAX_INSPIRATION, inspiration + Math.round(changes.inspirationGain));
    if (inspiration > prev) {
      deltas.push({
        kind: 'inspiration',
        label: `+${inspiration - prev} Inspiração ✦`,
        positive: true,
      });
    }
  }

  // Currency / resources
  const currency = {
    amount: player.currency?.amount ?? 0,
    label: changes.currencyLabel?.trim() || player.currency?.label || 'Ouro',
  };
  if (typeof changes.currencyDelta === 'number' && changes.currencyDelta !== 0) {
    const deltaAmt = Math.round(changes.currencyDelta);
    currency.amount = Math.max(0, currency.amount + deltaAmt);
    deltas.push({
      kind: 'currency',
      label: `${deltaAmt > 0 ? '+' : ''}${deltaAmt} ${currency.label}`,
      positive: deltaAmt > 0,
    });
  }

  const traits = [...player.traits];
  if (Array.isArray(changes.addTraits)) {
    for (const t of changes.addTraits) {
      if (t && !traits.some((existing) => existing.toLowerCase() === t.toLowerCase())) {
        traits.push(t);
        deltas.push({ kind: 'trait', label: `Traço: ${t}`, positive: true });
      }
    }
  }

  // Skills & Skill Training (BG3 leveled skills)
  const skillLevels: SkillProgress[] = syncSkillLevels(
    player.skills,
    player.skillLevels,
  ).map((s) => ({ ...s }));

  if (Array.isArray(changes.addSkills)) {
    for (const s of changes.addSkills) {
      const clean = s?.trim();
      if (
        clean &&
        !skillLevels.some((ex) => ex.name.toLowerCase() === clean.toLowerCase())
      ) {
        skillLevels.push({
          name: clean,
          level: 1,
          attribute: inferSkillAttribute(clean),
          xp: 0,
        });
        deltas.push({ kind: 'skill', label: `+ Habilidade: ${clean} Nv.1`, positive: true });
      }
    }
  }

  if (Array.isArray(changes.skillTraining)) {
    for (const tr of changes.skillTraining) {
      const cleanName = tr?.name?.trim();
      if (!cleanName) continue;
      let target = skillLevels.find(
        (s) => s.name.toLowerCase() === cleanName.toLowerCase(),
      );
      if (!target) {
        target = {
          name: cleanName,
          level: 1,
          attribute: tr.attribute ?? inferSkillAttribute(cleanName),
          xp: 0,
        };
        skillLevels.push(target);
        deltas.push({
          kind: 'skill',
          label: `Nova Habilidade: ${cleanName} Nv.1`,
          positive: true,
        });
      }
      if (tr.levelUp && target.level < 5) {
        target.level += 1;
        target.xp = 0;
        deltas.push({
          kind: 'skill',
          label: `${target.name} evoluiu para Nv.${target.level}!`,
          positive: true,
        });
      } else {
        const rawGain = Math.max(15, Math.min(100, Math.round(tr.xpGain ?? 40)));
        const gain = options?.hasTrainingStation
          ? Math.min(100, Math.round(rawGain * 1.25))
          : rawGain;
        target.xp += gain;
        if (target.xp >= 100 && target.level < 5) {
          target.level += 1;
          target.xp = target.xp - 100;
          deltas.push({
            kind: 'skill',
            label: `${target.name} evoluiu para Nv.${target.level}!`,
            positive: true,
          });
        } else {
          deltas.push({
            kind: 'skill',
            label: `Treino: ${target.name} (+${gain}% prog.)`,
            positive: true,
          });
        }
      }
    }
  }

  const skills = skillLevels.map((s) => s.name);

  // Talents
  const talents: TalentRecord[] = Array.isArray(player.talents)
    ? player.talents.map((t) => ({ ...t }))
    : [];
  if (Array.isArray(changes.addTalents)) {
    for (const tal of changes.addTalents) {
      if (!tal?.name?.trim()) continue;
      if (!talents.some((ex) => ex.name.toLowerCase() === tal.name.trim().toLowerCase())) {
        talents.push({
          id: `tal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: tal.name.trim(),
          description: tal.description?.trim() || 'Talento despertado na sua jornada.',
          unlockedTurn: turn,
        });
        deltas.push({
          kind: 'talent',
          label: `Talento: ${tal.name.trim()}`,
          positive: true,
        });
      }
    }
  }

  const quests: Quest[] = player.quests.map((q) => ({ ...q }));
  if (Array.isArray(changes.addQuests)) {
    for (const q of changes.addQuests) {
      if (!q?.title) continue;
      if (!quests.some((existing) => existing.title.toLowerCase() === q.title.toLowerCase())) {
        quests.unshift({
          id: `quest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          title: q.title,
          description: q.description || '',
          status: 'active',
          primary: q.primary,
        });
        deltas.push({ kind: 'quest', label: `Objetivo: ${q.title}`, positive: true });
      }
    }
  }

  if (Array.isArray(changes.completeQuests)) {
    for (const title of changes.completeQuests) {
      const target = quests.find(
        (q) => q.status === 'active' && q.title.toLowerCase().includes(title.toLowerCase()),
      );
      if (target) {
        target.status = 'completed';
        deltas.push({ kind: 'quest', label: `Concluído: ${target.title}`, positive: true });
        if (inspiration < MAX_INSPIRATION) {
          inspiration += 1;
          deltas.push({
            kind: 'inspiration',
            label: '+1 Inspiração ✦ (Objetivo)',
            positive: true,
          });
        }
      }
    }
  }

  if (Array.isArray(changes.failQuests)) {
    for (const title of changes.failQuests) {
      const target = quests.find(
        (q) => q.status === 'active' && q.title.toLowerCase().includes(title.toLowerCase()),
      );
      if (target) {
        target.status = 'failed';
        deltas.push({ kind: 'quest', label: `Falhou: ${target.title}`, positive: false });
      }
    }
  }

  return {
    nextPlayer: {
      ...player,
      name,
      age,
      occupation,
      level,
      xp,
      xpToNextLevel,
      attributePoints,
      vigor,
      maxVigor,
      tension,
      inspiration,
      traits,
      skills,
      skillLevels,
      talents,
      currency,
      inventory,
      quests,
    },
    deltas,
    worldIdentityPatch,
  };
}

export function applyCodexChanges(
  codex: WorldCodex,
  currentLocation: string,
  turn: number,
  changes: AiStateChanges | undefined,
): { nextCodex: WorldCodex; deltas: StateDelta[] } {
  const npcs: NpcRecord[] = codex.npcs.map((n) => ({ ...n }));
  const locations: LocationRecord[] = codex.locations.map((l) => ({ ...l }));
  const factions: FactionRecord[] = codex.factions.map((f) => ({ ...f }));
  const canonFacts: CanonFact[] = codex.canonFacts.map((c) => ({ ...c }));
  const deltas: StateDelta[] = [];

  if (Array.isArray(changes?.upsertNpcs)) {
    for (const rawNpc of changes.upsertNpcs) {
      if (!rawNpc?.name) continue;
      const existing = npcs.find(
        (n) => n.name.toLowerCase() === rawNpc.name.toLowerCase(),
      );
      if (existing) {
        const stanceChanged = rawNpc.stance && rawNpc.stance !== existing.stance;
        const prevRel = existing.relationship;
        const prevAffinity =
          typeof existing.affinity === 'number'
            ? existing.affinity
            : defaultAffinityFromStance(existing.stance);

        if (rawNpc.role) existing.role = rawNpc.role;
        if (rawNpc.stance) existing.stance = rawNpc.stance;
        if (rawNpc.status) existing.status = rawNpc.status;
        if (rawNpc.notes) existing.notes = rawNpc.notes;
        if (rawNpc.assistAttribute) existing.assistAttribute = rawNpc.assistAttribute;
        if (rawNpc.assistSpecialty) existing.assistSpecialty = rawNpc.assistSpecialty;
        if (typeof rawNpc.age === 'number' && rawNpc.age >= 14 && rawNpc.age <= 999) {
          existing.age = Math.round(rawNpc.age);
        }
        if (rawNpc.height?.trim()) existing.height = rawNpc.height.trim();
        if (rawNpc.appearance?.trim()) existing.appearance = rawNpc.appearance.trim();
        if (rawNpc.personality?.trim()) existing.personality = rawNpc.personality.trim();
        if (rawNpc.currentMood?.trim()) existing.currentMood = rawNpc.currentMood.trim();
        if (rawNpc.attributes) {
          const baseA =
            existing.attributes ??
            defaultNpcAttributes(existing.assistAttribute ?? 'wis');
          existing.attributes = {
            str: rawNpc.attributes.str ?? baseA.str,
            dex: rawNpc.attributes.dex ?? baseA.dex,
            con: rawNpc.attributes.con ?? baseA.con,
            int: rawNpc.attributes.int ?? baseA.int,
            wis: rawNpc.attributes.wis ?? baseA.wis,
            cha: rawNpc.attributes.cha ?? baseA.cha,
          };
        }
        if (Array.isArray(rawNpc.skills) && rawNpc.skills.length > 0) {
          const merged = new Set(existing.skills ?? []);
          for (const s of rawNpc.skills) if (s?.trim()) merged.add(s.trim());
          existing.skills = Array.from(merged);
        }
        if (Array.isArray(rawNpc.traits) && rawNpc.traits.length > 0) {
          const merged = new Set(existing.traits ?? []);
          for (const t of rawNpc.traits) if (t?.trim()) merged.add(t.trim());
          existing.traits = Array.from(merged);
        }
        if (Array.isArray(rawNpc.likes) && rawNpc.likes.length > 0) {
          const merged = new Set(existing.likes ?? []);
          for (const l of rawNpc.likes) if (l?.trim()) merged.add(l.trim());
          existing.likes = Array.from(merged);
        }
        if (Array.isArray(rawNpc.dislikes) && rawNpc.dislikes.length > 0) {
          const merged = new Set(existing.dislikes ?? []);
          for (const d of rawNpc.dislikes) if (d?.trim()) merged.add(d.trim());
          existing.dislikes = Array.from(merged);
        }
        if (rawNpc.bondMemory?.trim()) {
          const memories = [...(existing.bondMemories ?? [])];
          memories.unshift({
            turn,
            text: rawNpc.bondMemory.trim(),
            approved: (rawNpc.affinityDelta ?? 0) >= 0,
          });
          existing.bondMemories = memories.slice(0, 15);
        }

        const deltaAff =
          typeof rawNpc.affinityDelta === 'number'
            ? Math.max(-40, Math.min(40, Math.round(rawNpc.affinityDelta)))
            : 0;
        const nextAffinity = Math.max(-100, Math.min(100, prevAffinity + deltaAff));
        existing.affinity = nextAffinity;
        existing.relationship =
          rawNpc.relationship ??
          deriveRelationshipFromAffinity(nextAffinity, existing.relationship);
        existing.lastSeenLocation = currentLocation;

        if (rawNpc.relationship && rawNpc.relationship !== prevRel) {
          const relMeta = RELATIONSHIP_META[rawNpc.relationship];
          deltas.push({
            kind: 'bond',
            label: `${existing.name}: ${relMeta.label}`,
            positive:
              rawNpc.relationship !== 'enemy' && rawNpc.relationship !== 'rival',
          });
        } else if (deltaAff !== 0) {
          deltas.push({
            kind: 'bond',
            label: `Vínculo ${existing.name}: ${deltaAff > 0 ? '+' : ''}${deltaAff}`,
            positive: deltaAff > 0,
          });
        } else if (stanceChanged || rawNpc.status === 'dead' || rawNpc.status === 'missing') {
          deltas.push({
            kind: 'npc',
            label: `${existing.name}: ${rawNpc.status === 'dead' ? 'Morto' : existing.stance}`,
            positive: existing.stance === 'ally',
          });
        }
      } else {
        const stance = rawNpc.stance || 'neutral';
        const baseAff = defaultAffinityFromStance(stance);
        const deltaAff =
          typeof rawNpc.affinityDelta === 'number' ? Math.round(rawNpc.affinityDelta) : 0;
        const affinity = Math.max(-100, Math.min(100, baseAff + deltaAff));
        const relationship =
          rawNpc.relationship ?? deriveRelationshipFromAffinity(affinity);

        const assistAttr =
          rawNpc.assistAttribute ??
          inferNpcAssistAttribute(rawNpc.role || '', rawNpc.notes || '');
        const baseAttrs = defaultNpcAttributes(assistAttr);
        const attrs = rawNpc.attributes
          ? {
              str: rawNpc.attributes.str ?? baseAttrs.str,
              dex: rawNpc.attributes.dex ?? baseAttrs.dex,
              con: rawNpc.attributes.con ?? baseAttrs.con,
              int: rawNpc.attributes.int ?? baseAttrs.int,
              wis: rawNpc.attributes.wis ?? baseAttrs.wis,
              cha: rawNpc.attributes.cha ?? baseAttrs.cha,
            }
          : baseAttrs;
        const maxHp = computeMaxVigor(1, attrs.con, 0);

        const created: NpcRecord = {
          id: `npc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: rawNpc.name,
          role: rawNpc.role || 'Habitante',
          stance,
          status: rawNpc.status || 'alive',
          affinity,
          relationship,
          inParty: false,
          assistAttribute: assistAttr,
          assistSpecialty: rawNpc.assistSpecialty,
          age:
            typeof rawNpc.age === 'number' && rawNpc.age >= 14 && rawNpc.age <= 999
              ? Math.round(rawNpc.age)
              : undefined,
          height: rawNpc.height?.trim() || undefined,
          appearance: rawNpc.appearance?.trim() || undefined,
          personality: rawNpc.personality?.trim() || undefined,
          currentMood: rawNpc.currentMood?.trim() || undefined,
          level: 1,
          vigor: maxHp,
          maxVigor: maxHp,
          attributes: attrs,
          skills: Array.isArray(rawNpc.skills)
            ? rawNpc.skills.map((s) => s.trim()).filter(Boolean)
            : [],
          traits: Array.isArray(rawNpc.traits)
            ? rawNpc.traits.map((t) => t.trim()).filter(Boolean)
            : [],
          likes: Array.isArray(rawNpc.likes)
            ? rawNpc.likes.map((l) => l.trim()).filter(Boolean)
            : [],
          dislikes: Array.isArray(rawNpc.dislikes)
            ? rawNpc.dislikes.map((d) => d.trim()).filter(Boolean)
            : [],
          bondMemories: rawNpc.bondMemory?.trim()
            ? [{ turn, text: rawNpc.bondMemory.trim(), approved: true }]
            : [],
          lastSeenLocation: currentLocation,
          notes: rawNpc.notes || '',
          firstMetTurn: turn,
        };
        npcs.unshift(created);
        deltas.push({
          kind: 'npc',
          label: `Novo NPC: ${created.name}`,
          positive: created.stance !== 'hostile',
        });
      }
    }
  }

  // BG3-style companion approval / disapproval reactions
  if (Array.isArray(changes?.companionReactions)) {
    for (const reaction of changes.companionReactions) {
      if (!reaction?.name) continue;
      const target = npcs.find(
        (n) => n.name.toLowerCase() === reaction.name.toLowerCase(),
      );
      if (target) {
        const shift = reaction.approved ? 8 : -8;
        const nextAff = Math.max(-100, Math.min(100, (target.affinity ?? 0) + shift));
        target.affinity = nextAff;
        target.relationship = deriveRelationshipFromAffinity(
          nextAff,
          target.relationship,
        );
        const memories = [...(target.bondMemories ?? [])];
        memories.unshift({
          turn,
          text:
            reaction.reason?.trim() ||
            (reaction.approved
              ? 'Aprovou sua atitude na cena.'
              : 'Desaprovou sua escolha na cena.'),
          approved: reaction.approved,
        });
        target.bondMemories = memories.slice(0, 15);
      }
      deltas.push({
        kind: 'bond',
        label: reaction.approved
          ? `${reaction.name} aprovou ♥`
          : `${reaction.name} desaprovou`,
        positive: reaction.approved,
      });
    }
  }

  const locName = changes?.discoverLocation?.name?.trim() || currentLocation.trim();
  if (locName) {
    const existingLoc = locations.find(
      (l) => l.name.toLowerCase() === locName.toLowerCase(),
    );
    if (existingLoc) {
      existingLoc.visitCount += 1;
      if (changes?.discoverLocation?.description) {
        existingLoc.description = changes.discoverLocation.description;
      }
      if (changes?.discoverLocation?.danger) {
        existingLoc.danger = changes.discoverLocation.danger;
      }
      if (changes?.discoverLocation?.kind) {
        existingLoc.kind = changes.discoverLocation.kind;
      }
      if (changes?.discoverLocation?.status) {
        const prevStatus = existingLoc.status;
        existingLoc.status = changes.discoverLocation.status;
        if (prevStatus !== 'cleared' && existingLoc.status === 'cleared') {
          deltas.push({
            kind: 'location',
            label: `Local Limpo: ${existingLoc.name}`,
            positive: true,
          });
        }
      }
      if (typeof changes?.discoverLocation?.recommendedLevel === 'number') {
        existingLoc.recommendedLevel = changes.discoverLocation.recommendedLevel;
      }
    } else {
      const kind = changes?.discoverLocation?.kind || 'city';
      locations.unshift({
        id: `loc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: locName,
        description: changes?.discoverLocation?.description || '',
        danger: changes?.discoverLocation?.danger || 'tense',
        kind,
        status: changes?.discoverLocation?.status || 'explored',
        recommendedLevel: changes?.discoverLocation?.recommendedLevel,
        visitCount: 1,
        firstVisitedTurn: turn,
      });
      deltas.push({
        kind: 'location',
        label:
          kind === 'dungeon'
            ? `Dungeon Descoberta: ${locName}`
            : kind === 'secret'
              ? `Local Secreto: ${locName}`
              : `Local: ${locName}`,
        positive: true,
      });
    }
  }

  if (Array.isArray(changes?.upsertFactions)) {
    for (const rawFac of changes.upsertFactions) {
      if (!rawFac?.name) continue;
      const existing = factions.find(
        (f) => f.name.toLowerCase() === rawFac.name.toLowerCase(),
      );
      if (existing) {
        const standingChanged = rawFac.standing && rawFac.standing !== existing.standing;
        if (rawFac.description) existing.description = rawFac.description;
        if (rawFac.standing) existing.standing = rawFac.standing;
        if (rawFac.influence) existing.influence = rawFac.influence;
        if (standingChanged) {
          deltas.push({
            kind: 'faction',
            label: `${existing.name}: ${existing.standing}`,
            positive: existing.standing === 'allied',
          });
        }
      } else {
        const created: FactionRecord = {
          id: `fac_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: rawFac.name,
          description: rawFac.description || '',
          standing: rawFac.standing || 'neutral',
          influence: rawFac.influence || 'Regional',
        };
        factions.push(created);
        deltas.push({
          kind: 'faction',
          label: `Facção: ${created.name}`,
          positive: created.standing !== 'hostile',
        });
      }
    }
  }

  if (Array.isArray(changes?.addCanonFacts)) {
    for (const rawFact of changes.addCanonFacts) {
      const text = rawFact?.trim();
      if (!text) continue;
      if (!canonFacts.some((f) => f.text.toLowerCase() === text.toLowerCase())) {
        canonFacts.push({
          id: `fact_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          text,
          turn,
        });
        deltas.push({
          kind: 'memory',
          label: 'Fato registrado na memória da IA',
          positive: true,
        });
      }
    }
  }

  return {
    nextCodex: { npcs, locations, factions, canonFacts },
    deltas,
  };
}
