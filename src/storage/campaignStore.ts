import { DEFAULT_SETTINGS } from '../data/presets';
import {
  computeMaxVigor,
  DEFAULT_ATTRIBUTES,
  defaultAffinityFromStance,
  defaultCurrencyForTheme,
  defaultStrongholdForTheme,
  defaultWorldClockForTheme,
  deriveRelationshipFromAffinity,
  getEquippedGearBonuses,
  inferEquipSlotFromCategory,
  inferNpcAssistAttribute,
  MAX_INSPIRATION,
  syncSkillLevels,
  xpRequiredForLevel,
} from '../engine/rpgSystem';
import type { AppSettings, Campaign, SaveSlot } from '../types/game';

const LEGACY_CAMPAIGNS_KEY = 'mythos_campaigns_v1';
const FALLBACK_SAVES_KEY = 'mythos_saves_fallback_v1';
const SETTINGS_KEY = 'mythos_settings_v1';

const DB_NAME = 'mythos_chronicles_db';
const DB_VERSION = 1;
const STORE_CAMPAIGNS = 'campaigns';
const STORE_SAVES = 'saves';

export function normalizeCampaign(raw: Partial<Campaign>): Campaign {
  const id = raw.id || `camp_${Date.now()}`;
  const existingLocations = Array.isArray(raw.codex?.locations)
    ? raw.codex.locations
    : [];
  const existingNpcs = Array.isArray(raw.codex?.npcs) ? raw.codex.npcs : [];
  const existingFactions = Array.isArray(raw.codex?.factions)
    ? raw.codex.factions
    : [];
  const existingFacts = Array.isArray(raw.codex?.canonFacts)
    ? raw.codex.canonFacts
    : [];

  const locations =
    existingLocations.length > 0
      ? existingLocations
      : raw.currentLocation
        ? [
            {
              id: `loc_seed_${id}`,
              name: raw.currentLocation,
              description: raw.world?.premise || '',
              danger: 'tense' as const,
              visitCount: 1,
              firstVisitedTurn: 0,
            },
          ]
        : [];

  const theme = raw.world?.primaryTheme || 'fantasy';
  const language = raw.language || 'pt-BR';

  const normalizedNpcs = existingNpcs.map((n) => {
    const affinity =
      typeof n.affinity === 'number'
        ? Math.max(-100, Math.min(100, Math.round(n.affinity)))
        : defaultAffinityFromStance(n.stance);
    return {
      ...n,
      affinity,
      relationship:
        n.relationship ?? deriveRelationshipFromAffinity(affinity),
      inParty: Boolean(n.inParty),
      portraitUrl: n.portraitUrl,
      assistAttribute:
        n.assistAttribute ?? inferNpcAssistAttribute(n.role || '', n.notes || ''),
      assistSpecialty: n.assistSpecialty,
    };
  });

  const normalizedLocations = locations.map((l) => ({
    ...l,
    kind: l.kind ?? 'city',
    status: l.status ?? 'explored',
  }));

  const rawPlayer = raw.player;
  const level =
    typeof rawPlayer?.level === 'number' && rawPlayer.level >= 1
      ? Math.min(20, Math.round(rawPlayer.level))
      : 1;
  const attributes = {
    str: rawPlayer?.attributes?.str ?? DEFAULT_ATTRIBUTES.str,
    dex: rawPlayer?.attributes?.dex ?? DEFAULT_ATTRIBUTES.dex,
    con: rawPlayer?.attributes?.con ?? DEFAULT_ATTRIBUTES.con,
    int: rawPlayer?.attributes?.int ?? DEFAULT_ATTRIBUTES.int,
    wis: rawPlayer?.attributes?.wis ?? DEFAULT_ATTRIBUTES.wis,
    cha: rawPlayer?.attributes?.cha ?? DEFAULT_ATTRIBUTES.cha,
  };
  const inventory = Array.isArray(rawPlayer?.inventory)
    ? rawPlayer.inventory.map((item) => ({
        ...item,
        rarity: item.rarity ?? 'common',
        equipSlot: item.equipSlot ?? inferEquipSlotFromCategory(item.category),
      }))
    : [];
  const gearBonuses = getEquippedGearBonuses(inventory);
  const computedMaxVigor = computeMaxVigor(
    level,
    attributes.con + (gearBonuses.con ?? 0),
    gearBonuses.maxVigor ?? 0,
  );
  const maxVigor =
    typeof rawPlayer?.maxVigor === 'number' && rawPlayer.maxVigor >= 60
      ? rawPlayer.maxVigor
      : computedMaxVigor;
  const rawSkills = Array.isArray(rawPlayer?.skills) ? rawPlayer.skills : [];
  const skillLevels = syncSkillLevels(rawSkills, rawPlayer?.skillLevels);
  const syncedSkills = skillLevels.map((s) => s.name);

  return {
    ...(raw as Campaign),
    id,
    world: {
      title: raw.world?.title || 'Crônica Sem Título',
      primaryTheme: theme,
      genres: Array.isArray(raw.world?.genres) ? raw.world.genres : ['Fantasia'],
      tone: raw.world?.tone || 'Épico',
      era: raw.world?.era || 'Era Desconhecida',
      history: raw.world?.history || raw.world?.premise || '',
      worldLaws: raw.world?.worldLaws || '',
      premise: raw.world?.premise || '',
      creativePrompt: raw.world?.creativePrompt?.trim() || undefined,
      storyPace: raw.world?.storyPace || 'epic',
      matureMode: raw.world?.matureMode ?? true,
    },
    player: {
      name: rawPlayer?.name || 'Viajante',
      age: rawPlayer?.age ?? 28,
      occupation: rawPlayer?.occupation || 'Aventureiro',
      portraitUrl: rawPlayer?.portraitUrl,
      portraitEngine: rawPlayer?.portraitEngine,
      level,
      xp: typeof rawPlayer?.xp === 'number' ? Math.max(0, rawPlayer.xp) : 0,
      xpToNextLevel:
        typeof rawPlayer?.xpToNextLevel === 'number' && rawPlayer.xpToNextLevel > 0
          ? rawPlayer.xpToNextLevel
          : xpRequiredForLevel(level),
      attributePoints:
        typeof rawPlayer?.attributePoints === 'number'
          ? Math.max(0, rawPlayer.attributePoints)
          : 0,
      attributes,
      vigor:
        typeof rawPlayer?.vigor === 'number'
          ? Math.max(0, Math.min(maxVigor, rawPlayer.vigor))
          : maxVigor,
      maxVigor,
      tension:
        typeof rawPlayer?.tension === 'number'
          ? Math.max(0, Math.min(100, rawPlayer.tension))
          : 20,
      inspiration:
        typeof rawPlayer?.inspiration === 'number'
          ? Math.max(0, Math.min(MAX_INSPIRATION, Math.round(rawPlayer.inspiration)))
          : 1,
      traits: Array.isArray(rawPlayer?.traits) ? rawPlayer.traits : [],
      skills: syncedSkills,
      skillLevels,
      talents: Array.isArray(rawPlayer?.talents) ? rawPlayer.talents : [],
      currency:
        rawPlayer?.currency && typeof rawPlayer.currency.amount === 'number'
          ? rawPlayer.currency
          : defaultCurrencyForTheme(theme, language),
      inventory,
      quests: Array.isArray(rawPlayer?.quests) ? rawPlayer.quests : [],
      journal: Array.isArray(rawPlayer?.journal) ? rawPlayer.journal : [],
    },
    codex: {
      npcs: normalizedNpcs,
      locations: normalizedLocations,
      factions: existingFactions,
      canonFacts: existingFacts,
    },
    status: raw.status ?? 'active',
    arcNumber: typeof raw.arcNumber === 'number' && raw.arcNumber >= 1 ? raw.arcNumber : 1,
    eraSummaries: Array.isArray(raw.eraSummaries) ? raw.eraSummaries : [],
    worldClock: raw.worldClock ?? defaultWorldClockForTheme(theme, language),
    stronghold:
      raw.stronghold ??
      defaultStrongholdForTheme(
        theme,
        raw.currentLocation || locations[0]?.name || 'Base Inicial',
        language,
      ),
    entries: Array.isArray(raw.entries) ? raw.entries : [],
    actions: Array.isArray(raw.actions) ? raw.actions : [],
  };
}

function openMythosDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CAMPAIGNS)) {
        db.createObjectStore(STORE_CAMPAIGNS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SAVES)) {
        const savesStore = db.createObjectStore(STORE_SAVES, { keyPath: 'id' });
        savesStore.createIndex('by_campaignId', 'campaignId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB error'));
  });
}

function idbGetAll<T>(storeName: string): Promise<T[]> {
  return openMythosDb().then(
    (db) =>
      new Promise<T[]>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result ?? []) as T[]);
        req.onerror = () => reject(req.error ?? new Error('IDB getAll failed'));
      }),
  );
}

function idbPut<T>(storeName: string, value: T): Promise<void> {
  return openMythosDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(value);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('IDB put failed'));
      }),
  );
}

function idbDelete(storeName: string, id: string): Promise<void> {
  return openMythosDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('IDB delete failed'));
      }),
  );
}

function readLegacyLocalCampaigns(): Campaign[] {
  try {
    const raw = localStorage.getItem(LEGACY_CAMPAIGNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as Partial<Campaign>[]).map(normalizeCampaign);
  } catch {
    return [];
  }
}

export async function loadCampaignsAsync(): Promise<Campaign[]> {
  try {
    const legacy = readLegacyLocalCampaigns();
    if (legacy.length > 0) {
      for (const camp of legacy) {
        await idbPut(STORE_CAMPAIGNS, camp);
      }
      localStorage.removeItem(LEGACY_CAMPAIGNS_KEY);
    }

    const list = await idbGetAll<Partial<Campaign>>(STORE_CAMPAIGNS);
    return list
      .map(normalizeCampaign)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return readLegacyLocalCampaigns().sort((a, b) => b.updatedAt - a.updatedAt);
  }
}

export async function saveCampaignAsync(campaign: Campaign): Promise<Campaign[]> {
  const updated = normalizeCampaign({
    ...campaign,
    updatedAt: Date.now(),
  });
  try {
    await idbPut(STORE_CAMPAIGNS, updated);
    return await loadCampaignsAsync();
  } catch {
    const list = readLegacyLocalCampaigns();
    const idx = list.findIndex((c) => c.id === updated.id);
    if (idx >= 0) list[idx] = updated;
    else list.unshift(updated);
    const sorted = list.sort((a, b) => b.updatedAt - a.updatedAt);
    localStorage.setItem(LEGACY_CAMPAIGNS_KEY, JSON.stringify(sorted));
    return sorted;
  }
}

export async function deleteCampaignAsync(id: string): Promise<Campaign[]> {
  try {
    await idbDelete(STORE_CAMPAIGNS, id);
    const slots = await loadSaveSlotsAsync(id);
    for (const s of slots) {
      await idbDelete(STORE_SAVES, s.id);
    }
    return await loadCampaignsAsync();
  } catch {
    const list = readLegacyLocalCampaigns().filter((c) => c.id !== id);
    localStorage.setItem(LEGACY_CAMPAIGNS_KEY, JSON.stringify(list));
    return list;
  }
}

function readFallbackSaves(): SaveSlot[] {
  try {
    const raw = localStorage.getItem(FALLBACK_SAVES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SaveSlot[]) : [];
  } catch {
    return [];
  }
}

export async function loadSaveSlotsAsync(campaignId?: string): Promise<SaveSlot[]> {
  try {
    const all = await idbGetAll<SaveSlot>(STORE_SAVES);
    const filtered = campaignId
      ? all.filter((s) => s.campaignId === campaignId)
      : all;
    return filtered
      .map((s) => ({ ...s, snapshot: normalizeCampaign(s.snapshot) }))
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    const all = readFallbackSaves();
    const filtered = campaignId
      ? all.filter((s) => s.campaignId === campaignId)
      : all;
    return filtered.sort((a, b) => b.savedAt - a.savedAt);
  }
}

export async function createSaveSlotAsync(
  campaign: Campaign,
  slotName: string,
): Promise<SaveSlot[]> {
  const cleanSnapshot = normalizeCampaign(structuredClone(campaign));
  // Clear server interactionId so loading this checkpoint rehydrates cleanly from the 3-layer memory core
  cleanSnapshot.interactionId = undefined;

  const slot: SaveSlot = {
    id: `save_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    campaignId: campaign.id,
    name: slotName.trim() || `Turno ${campaign.turnCount} · ${campaign.currentLocation}`,
    savedAt: Date.now(),
    turnCount: campaign.turnCount,
    chapter: campaign.currentChapter,
    location: campaign.currentLocation,
    vigor: campaign.player.vigor,
    snapshot: cleanSnapshot,
  };

  try {
    await idbPut(STORE_SAVES, slot);
    return await loadSaveSlotsAsync(campaign.id);
  } catch {
    const list = [slot, ...readFallbackSaves()];
    localStorage.setItem(FALLBACK_SAVES_KEY, JSON.stringify(list));
    return list.filter((s) => s.campaignId === campaign.id);
  }
}

export async function deleteSaveSlotAsync(
  slotId: string,
  campaignId?: string,
): Promise<SaveSlot[]> {
  try {
    await idbDelete(STORE_SAVES, slotId);
    return await loadSaveSlotsAsync(campaignId);
  } catch {
    const list = readFallbackSaves().filter((s) => s.id !== slotId);
    localStorage.setItem(FALLBACK_SAVES_KEY, JSON.stringify(list));
    return campaignId ? list.filter((s) => s.campaignId === campaignId) : list;
  }
}

export function exportCampaignJson(campaign: Campaign): void {
  const blob = new Blob([JSON.stringify(campaign, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const slug = campaign.world.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '');
  anchor.href = url;
  anchor.download = `mythos-${slug || 'chronicle'}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function parseImportedCampaign(rawJson: string): Campaign {
  const parsed = JSON.parse(rawJson) as Partial<Campaign>;
  if (!parsed || !parsed.world || !parsed.player || !Array.isArray(parsed.entries)) {
    throw new Error('Invalid MYTHOS campaign save format.');
  }
  const now = Date.now();
  return normalizeCampaign({
    ...(parsed as Campaign),
    id: `camp_${now}_${Math.random().toString(36).slice(2, 7)}`,
    interactionId: undefined,
    updatedAt: now,
  });
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
