import { DEFAULT_SETTINGS } from '../data/presets';
import {
  computeMaxHpForRuleset,
  computeNpcArmorClass,
  computeNpcMaxHpForRuleset,
  getMaxInspirationForRuleset,
  getXpDeltaForRuleset,
  hydrateDnd5eSheetFromLegacy,
} from '../engine/dnd52Rules';
import {
  DEFAULT_ATTRIBUTES,
  defaultAffinityFromStance,
  defaultBaseSuppliesForTheme,
  defaultCurrencyForTheme,
  defaultHourForPeriod,
  defaultNpcAttributes,
  defaultStrongholdForTheme,
  defaultWorldClockForTheme,
  derivePeriodFromHour,
  deriveRelationshipFromAffinity,
  inferEquipSlotFromCategory,
  inferNpcAssistAttribute,
  inferWeatherTypeFromText,
  syncSkillLevels,
} from '../engine/rpgSystem';
import type {
  AppSettings,
  Campaign,
  RulesetId,
  SaveSlot,
  TimelineSnapshotRecord,
} from '../types/game';

const LEGACY_CAMPAIGNS_KEY = 'mythos_campaigns_v1';
const FALLBACK_SAVES_KEY = 'mythos_saves_fallback_v1';
const SETTINGS_KEY = 'mythos_settings_v1';

const DB_NAME = 'mythos_chronicles_db';
const DB_VERSION = 2;
const STORE_CAMPAIGNS = 'campaigns';
const STORE_SAVES = 'saves';
const STORE_TIMELINE_SNAPSHOTS = 'timeline_snapshots';

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
  const ruleset: RulesetId =
    raw.ruleset === 'dnd5e_2024' ? 'dnd5e_2024' : 'mythos_legacy';
  const maxInsp = getMaxInspirationForRuleset(ruleset);

  const normalizedNpcs = existingNpcs.map((n) => {
    const affinity =
      typeof n.affinity === 'number'
        ? Math.max(-100, Math.min(100, Math.round(n.affinity)))
        : defaultAffinityFromStance(n.stance);
    const assistAttr =
      n.assistAttribute ?? inferNpcAssistAttribute(n.role || '', n.notes || '');
    const attrs = n.attributes
      ? {
          str: n.attributes.str ?? 10,
          dex: n.attributes.dex ?? 10,
          con: n.attributes.con ?? 10,
          int: n.attributes.int ?? 10,
          wis: n.attributes.wis ?? 10,
          cha: n.attributes.cha ?? 10,
        }
      : defaultNpcAttributes(assistAttr);
    const npcLevel =
      typeof n.level === 'number' && n.level >= 1
        ? Math.min(20, Math.round(n.level))
        : Math.max(1, raw.player?.level ?? 1);
    const minNpcFloor = ruleset === 'dnd5e_2024' ? 4 : 50;
    const npcMaxVigor =
      typeof n.maxVigor === 'number' && n.maxVigor >= minNpcFloor
        ? n.maxVigor
        : computeNpcMaxHpForRuleset(ruleset, { level: npcLevel, attributes: attrs, role: n.role });

    return {
      ...n,
      affinity,
      relationship:
        n.relationship ?? deriveRelationshipFromAffinity(affinity),
      inParty: Boolean(n.inParty),
      portraitUrl: n.portraitUrl,
      assistAttribute: assistAttr,
      assistSpecialty: n.assistSpecialty,
      level: npcLevel,
      vigor:
        typeof n.vigor === 'number'
          ? Math.max(0, Math.min(npcMaxVigor, n.vigor))
          : npcMaxVigor,
      maxVigor: npcMaxVigor,
      armorClass: ruleset === 'dnd5e_2024' ? computeNpcArmorClass({ ...n, attributes: attrs }) : n.armorClass,
      attributes: attrs,
      skills: Array.isArray(n.skills) ? n.skills : [],
      traits: Array.isArray(n.traits) ? n.traits : [],
      likes: Array.isArray(n.likes) ? n.likes : [],
      dislikes: Array.isArray(n.dislikes) ? n.dislikes : [],
      bondMemories: Array.isArray(n.bondMemories) ? n.bondMemories : [],
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
        storage: item.storage ?? 'carry',
        equipSlot:
          item.equipSlot ?? inferEquipSlotFromCategory(item.category, item.name),
      }))
    : [];
  const computedMaxVigor = computeMaxHpForRuleset(ruleset, {
    level,
    attributes,
    inventory,
    dnd: rawPlayer?.dnd,
  });
  const minPlayerFloor = ruleset === 'dnd5e_2024' ? 4 : 60;
  const maxVigor =
    typeof rawPlayer?.maxVigor === 'number' && rawPlayer.maxVigor >= minPlayerFloor
      ? rawPlayer.maxVigor
      : computedMaxVigor;
  const rawSkills = Array.isArray(rawPlayer?.skills) ? rawPlayer.skills : [];
  const skillLevels = syncSkillLevels(rawSkills, rawPlayer?.skillLevels);
  const syncedSkills = skillLevels.map((s) => s.name);

  const defaultClock = defaultWorldClockForTheme(theme, language);
  const rawClock = raw.worldClock;
  const clockHour =
    typeof rawClock?.hour === 'number'
      ? Math.max(0, Math.min(23, Math.floor(rawClock.hour)))
      : rawClock?.period
        ? defaultHourForPeriod(rawClock.period)
        : defaultClock.hour ?? 8;
  const clockMinute =
    typeof rawClock?.minute === 'number'
      ? Math.max(0, Math.min(59, Math.floor(rawClock.minute)))
      : defaultClock.minute ?? 30;
  const normalizedClock = {
    ...defaultClock,
    ...(rawClock ?? {}),
    day: typeof rawClock?.day === 'number' && rawClock.day >= 1 ? Math.round(rawClock.day) : 1,
    hour: clockHour,
    minute: clockMinute,
    period: derivePeriodFromHour(clockHour),
    weatherType:
      rawClock?.weatherType ??
      inferWeatherTypeFromText(
        rawClock?.weather || defaultClock.weather,
        defaultClock.weatherType ?? 'cloudy',
      ),
    weather: rawClock?.weather || defaultClock.weather,
    advanceMode: rawClock?.advanceMode ?? 'ai_auto',
    fixedStepMinutes:
      typeof rawClock?.fixedStepMinutes === 'number' && rawClock.fixedStepMinutes > 0
        ? rawClock.fixedStepMinutes
        : 15,
    shortRestsUsedToday:
      typeof rawClock?.shortRestsUsedToday === 'number'
        ? Math.max(0, Math.min(2, Math.round(rawClock.shortRestsUsedToday)))
        : 0,
  };

  const defaultBase = defaultStrongholdForTheme(
    theme,
    raw.currentLocation || locations[0]?.name || 'Base Inicial',
    language,
  );
  const rawBase = raw.stronghold;
  const defaultSupplies = defaultBaseSuppliesForTheme(theme);
  const normalizedStronghold = {
    ...defaultBase,
    ...(rawBase ?? {}),
    upgrades: Array.isArray(rawBase?.upgrades) ? rawBase.upgrades : [],
    supplies: {
      ammo: rawBase?.supplies?.ammo ?? defaultSupplies.ammo,
      fuel: rawBase?.supplies?.fuel ?? defaultSupplies.fuel,
      food: rawBase?.supplies?.food ?? defaultSupplies.food,
      meds: rawBase?.supplies?.meds ?? defaultSupplies.meds,
      materials: rawBase?.supplies?.materials ?? defaultSupplies.materials,
    },
    vehicles: Array.isArray(rawBase?.vehicles) ? rawBase.vehicles : [],
  };

  const normalizedCampaign: Campaign = {
    ...(raw as Campaign),
    id,
    ruleset,
    progressionMode: raw.progressionMode ?? 'xp',
    pendingSavingThrow: raw.pendingSavingThrow ?? null,
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
      ...(rawPlayer ?? {}),
      name: rawPlayer?.name || 'Viajante',
      age: rawPlayer?.age ?? 28,
      occupation: rawPlayer?.occupation || 'Aventureiro',
      height: rawPlayer?.height,
      physique: rawPlayer?.physique,
      appearance: rawPlayer?.appearance,
      portraitUrl: rawPlayer?.portraitUrl,
      portraitEngine: rawPlayer?.portraitEngine,
      level,
      xp: typeof rawPlayer?.xp === 'number' ? Math.max(0, rawPlayer.xp) : 0,
      xpToNextLevel:
        typeof rawPlayer?.xpToNextLevel === 'number' && rawPlayer.xpToNextLevel > 0
          ? rawPlayer.xpToNextLevel
          : getXpDeltaForRuleset(level, ruleset),
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
          ? Math.max(0, Math.min(maxInsp, Math.round(rawPlayer.inspiration)))
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
      dnd: rawPlayer?.dnd
        ? {
            ...rawPlayer.dnd,
            exhaustion: Math.max(0, Math.min(6, Math.round(rawPlayer.dnd.exhaustion || 0))),
            tempHp: Math.max(0, Math.round(rawPlayer.dnd.tempHp || 0)),
            hitDiceRemaining: Math.max(0, Math.min(level, Math.round(rawPlayer.dnd.hitDiceRemaining ?? level))),
            conditions: Array.isArray(rawPlayer.dnd.conditions) ? rawPlayer.dnd.conditions : [],
            featIds: Array.isArray(rawPlayer.dnd.featIds) ? rawPlayer.dnd.featIds : [],
            skillProficiencies: Array.isArray(rawPlayer.dnd.skillProficiencies)
              ? rawPlayer.dnd.skillProficiencies
              : [],
            skillExpertise: Array.isArray(rawPlayer.dnd.skillExpertise)
              ? rawPlayer.dnd.skillExpertise
              : [],
            savingThrowProficiencies: Array.isArray(rawPlayer.dnd.savingThrowProficiencies)
              ? rawPlayer.dnd.savingThrowProficiencies
              : [],
            weaponMasteries: Array.isArray(rawPlayer.dnd.weaponMasteries)
              ? rawPlayer.dnd.weaponMasteries
              : [],
            cantripIds: Array.isArray(rawPlayer.dnd.cantripIds) ? rawPlayer.dnd.cantripIds : [],
            preparedSpellIds: Array.isArray(rawPlayer.dnd.preparedSpellIds)
              ? rawPlayer.dnd.preparedSpellIds
              : [],
            classResources: Array.isArray(rawPlayer.dnd.classResources)
              ? rawPlayer.dnd.classResources
              : [],
            deathSaves: rawPlayer.dnd.deathSaves ?? { successes: 0, failures: 0, stabilized: false },
          }
        : undefined,
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
    worldClock: normalizedClock,
    stronghold: normalizedStronghold,
    entries: Array.isArray(raw.entries) ? raw.entries : [],
    actions: Array.isArray(raw.actions) ? raw.actions : [],
    activeClash:
      raw.activeClash &&
      typeof raw.activeClash === 'object' &&
      Array.isArray(raw.activeClash.enemies)
        ? {
            ...raw.activeClash,
            round:
              typeof raw.activeClash.round === 'number' && raw.activeClash.round >= 1
                ? Math.round(raw.activeClash.round)
                : 1,
            synergy:
              typeof raw.activeClash.synergy === 'number'
                ? Math.max(0, Math.min(100, Math.round(raw.activeClash.synergy)))
                : 0,
            playerShield:
              typeof raw.activeClash.playerShield === 'number'
                ? Math.max(0, Math.round(raw.activeClash.playerShield))
                : 0,
            allies: Array.isArray(raw.activeClash.allies)
              ? raw.activeClash.allies
              : [],
            terrain: Array.isArray(raw.activeClash.terrain)
              ? raw.activeClash.terrain
              : [],
            roundLog: Array.isArray(raw.activeClash.roundLog)
              ? raw.activeClash.roundLog.slice(-24)
              : [],
          }
        : null,
  };

  // Self-healing guard: if marked dnd5e_2024 (e.g. from QR sync / JSON import) without dnd sheet, hydrate it!
  if (normalizedCampaign.ruleset === 'dnd5e_2024' && !normalizedCampaign.player.dnd) {
    return hydrateDnd5eSheetFromLegacy(normalizedCampaign);
  }
  return normalizedCampaign;
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
      if (!db.objectStoreNames.contains(STORE_TIMELINE_SNAPSHOTS)) {
        const snapStore = db.createObjectStore(STORE_TIMELINE_SNAPSHOTS, {
          keyPath: 'nodeId',
        });
        snapStore.createIndex('by_sagaId', 'sagaId', { unique: false });
        snapStore.createIndex('by_campaignId', 'campaignId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB error'));
  });
}

function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  return openMythosDb().then(
    (db) =>
      new Promise<T | null>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
        req.onerror = () => reject(req.error ?? new Error('IDB get failed'));
      }),
  );
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
    await deleteTimelineSnapshotsForCampaignAsync(id);
    return await loadCampaignsAsync();
  } catch {
    const list = readLegacyLocalCampaigns().filter((c) => c.id !== id);
    localStorage.setItem(LEGACY_CAMPAIGNS_KEY, JSON.stringify(list));
    return list;
  }
}

export async function saveTimelineSnapshotAsync(
  record: TimelineSnapshotRecord,
): Promise<void> {
  try {
    await idbPut(STORE_TIMELINE_SNAPSHOTS, record);
  } catch {
    // Non-fatal: timeline node metadata still persists inside the campaign
  }
}

export async function loadTimelineSnapshotAsync(
  nodeId: string,
): Promise<TimelineSnapshotRecord | null> {
  try {
    const record = await idbGet<TimelineSnapshotRecord>(
      STORE_TIMELINE_SNAPSHOTS,
      nodeId,
    );
    if (!record) return null;
    return {
      ...record,
      snapshot: normalizeCampaign(record.snapshot),
    };
  } catch {
    return null;
  }
}

export async function pruneTimelineSnapshotsAsync(
  campaignId: string,
  keepNodeIds: Set<string>,
): Promise<void> {
  try {
    const all = await idbGetAll<TimelineSnapshotRecord>(STORE_TIMELINE_SNAPSHOTS);
    for (const rec of all) {
      if (rec.campaignId === campaignId && !keepNodeIds.has(rec.nodeId)) {
        await idbDelete(STORE_TIMELINE_SNAPSHOTS, rec.nodeId);
      }
    }
  } catch {
    // ignore cleanup failures
  }
}

async function deleteTimelineSnapshotsForCampaignAsync(
  campaignId: string,
): Promise<void> {
  try {
    const all = await idbGetAll<TimelineSnapshotRecord>(STORE_TIMELINE_SNAPSHOTS);
    for (const rec of all) {
      if (rec.campaignId === campaignId) {
        await idbDelete(STORE_TIMELINE_SNAPSHOTS, rec.nodeId);
      }
    }
  } catch {
    // ignore cleanup failures
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
    return filtered
      .map((s) => ({ ...s, snapshot: normalizeCampaign(s.snapshot) }))
      .sort((a, b) => b.savedAt - a.savedAt);
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
    maxVigor: campaign.player.maxVigor,
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
