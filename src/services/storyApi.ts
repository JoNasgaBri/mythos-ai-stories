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
  deriveRelationshipFromAffinity,
  getEquippedGearBonuses,
  inferEquipSlotFromCategory,
  inferItemStorage,
  inferNpcAssistAttribute,
  inferSkillAttribute,
  MAX_INSPIRATION,
  RELATIONSHIP_META,
  syncSkillLevels,
  xpRequiredForLevel,
} from '../engine/rpgSystem';
import type {
  AiStateChanges,
  AppSettings,
  Campaign,
  CanonFact,
  DiceRollResult,
  EpilogueResponse,
  FactionRecord,
  ForgeWorldRequest,
  ForgedWorldBlueprint,
  IllustrationResponse,
  InventoryItem,
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

export async function requestStoryStart(
  campaign: Campaign,
  settings: AppSettings,
  health: ApiHealthStatus,
): Promise<StoryTurnResponse> {
  if (shouldUseGemini(settings, health)) {
    return postJson<StoryTurnResponse>(
      '/api/story/start',
      {
        campaign,
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
        campaign,
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
    return postJson<StoryTurnResponse>('/api/story/pulse', { campaign }, settings);
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
      { campaign, mode },
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
      { campaign, outcome, model: settings.geminiModel },
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
  npc: Pick<NpcRecord, 'name' | 'role' | 'notes'>,
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
        characterName: npc.name,
        characterOccupation: npc.role,
        characterTraits: npc.notes ? [npc.notes.slice(0, 140)] : [],
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

    while (xp >= xpToNextLevel && level < 20) {
      xp -= xpToNextLevel;
      level += 1;
      attributePoints += 1;
      xpToNextLevel = xpRequiredForLevel(level);
      const gearBonuses = getEquippedGearBonuses(inventory);
      const nextMax = computeMaxVigor(
        level,
        (player.attributes?.con ?? 10) + (gearBonuses.con ?? 0),
        gearBonuses.maxVigor ?? 0,
      );
      maxVigor = Math.max(maxVigor, nextMax);
      vigor = Math.min(maxVigor, vigor + 15);
      deltas.push({
        kind: 'level',
        label: `Nível ${level}! (+1 Atributo)`,
        positive: true,
      });
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

        const created: NpcRecord = {
          id: `npc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: rawNpc.name,
          role: rawNpc.role || 'Habitante',
          stance,
          status: rawNpc.status || 'alive',
          affinity,
          relationship,
          inParty: false,
          assistAttribute:
            rawNpc.assistAttribute ??
            inferNpcAssistAttribute(rawNpc.role || '', rawNpc.notes || ''),
          assistSpecialty: rawNpc.assistSpecialty,
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
