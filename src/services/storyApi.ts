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
  LocationRecord,
  NpcRecord,
  PlayerState,
  Quest,
  StateDelta,
  StoryEntry,
  StoryTurnResponse,
  WorldCodex,
  WorldConfig,
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
  player: Pick<PlayerState, 'name' | 'occupation' | 'traits'>,
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

export function applyStateChanges(
  player: PlayerState,
  changes: AiStateChanges | undefined,
): { nextPlayer: PlayerState; deltas: StateDelta[] } {
  if (!changes) {
    return { nextPlayer: player, deltas: [] };
  }

  const deltas: StateDelta[] = [];
  let vigor = player.vigor;
  let tension = player.tension;

  if (typeof changes.vigorDelta === 'number' && changes.vigorDelta !== 0) {
    const prev = vigor;
    vigor = Math.max(0, Math.min(player.maxVigor, vigor + changes.vigorDelta));
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
      } else {
        inventory.push({
          id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: item.name,
          category: item.category ?? 'misc',
          quantity: qty,
          note: item.note,
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
    for (const name of changes.removeItems) {
      const idx = inventory.findIndex(
        (x) => x.name.toLowerCase() === name.toLowerCase(),
      );
      if (idx >= 0) {
        if (inventory[idx].quantity > 1) {
          inventory[idx].quantity -= 1;
        } else {
          inventory.splice(idx, 1);
        }
        deltas.push({
          kind: 'item_remove',
          label: `- ${name}`,
          positive: false,
        });
      }
    }
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

  const skills = [...player.skills];
  if (Array.isArray(changes.addSkills)) {
    for (const s of changes.addSkills) {
      if (s && !skills.some((existing) => existing.toLowerCase() === s.toLowerCase())) {
        skills.push(s);
        deltas.push({ kind: 'skill', label: `+ Perícia: ${s}`, positive: true });
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
      vigor,
      tension,
      traits,
      skills,
      inventory,
      quests,
    },
    deltas,
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
        if (rawNpc.role) existing.role = rawNpc.role;
        if (rawNpc.stance) existing.stance = rawNpc.stance;
        if (rawNpc.status) existing.status = rawNpc.status;
        if (rawNpc.notes) existing.notes = rawNpc.notes;
        existing.lastSeenLocation = currentLocation;
        if (stanceChanged || rawNpc.status === 'dead' || rawNpc.status === 'missing') {
          deltas.push({
            kind: 'npc',
            label: `${existing.name}: ${rawNpc.status === 'dead' ? 'Morto' : existing.stance}`,
            positive: existing.stance === 'ally',
          });
        }
      } else {
        const created: NpcRecord = {
          id: `npc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: rawNpc.name,
          role: rawNpc.role || 'Habitante',
          stance: rawNpc.stance || 'neutral',
          status: rawNpc.status || 'alive',
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
    } else {
      locations.unshift({
        id: `loc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: locName,
        description: changes?.discoverLocation?.description || '',
        danger: changes?.discoverLocation?.danger || 'tense',
        visitCount: 1,
        firstVisitedTurn: turn,
      });
      deltas.push({
        kind: 'location',
        label: `Local: ${locName}`,
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
