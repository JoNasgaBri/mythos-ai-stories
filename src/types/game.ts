export type WorldThemeId = 'fantasy' | 'cyberpunk' | 'mystery' | 'zombies' | 'apocalyptic';

export type DifficultyId = 'easy' | 'normal' | 'hard' | 'insane' | 'good-luck';

export type LanguageId = 'pt-BR' | 'en' | 'fr';

export type ResponseLength = 'short' | 'normal' | 'literary' | 'epic';

export type NarrativeStyle = 'balanced' | 'dialogue' | 'cinematic' | 'tactical';

export type NarrativePerspective = 'adaptive' | 'second' | 'third';

export interface AiNarrationPreferences {
  responseLength: ResponseLength;
  narrativeStyle: NarrativeStyle;
  narrativePerspective: NarrativePerspective;
  customAiInstructions: string;
}

export type StoryPace = 'epic' | 'endless' | 'focused';

export type ActionIntent =
  | 'bold'
  | 'stealth'
  | 'diplomatic'
  | 'investigate'
  | 'survival'
  | 'item';

export type ActionRisk = 'safe' | 'low' | 'medium' | 'high';

export type CommandInputMode = 'act' | 'say' | 'direct';

export type DiceRollPolicy = 'auto' | 'force' | 'off';

export type RollMode = 'normal' | 'advantage' | 'disadvantage';

export type WorldPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

export type WeatherType =
  | 'clear'
  | 'cloudy'
  | 'rain'
  | 'storm'
  | 'fog'
  | 'heatwave'
  | 'snow'
  | 'ash';

export type TimeAdvanceMode = 'ai_auto' | 'fixed_step' | 'manual';

export interface WorldClock {
  day: number;
  hour?: number; // 0 to 23
  minute?: number; // 0 to 59
  dateLabel?: string; // Optional custom calendar date e.g. "14 de Out · 2026"
  period: WorldPeriod;
  weather: string;
  weatherType?: WeatherType;
  advanceMode?: TimeAdvanceMode;
  fixedStepMinutes?: number; // 15, 30, 60, 120 when advanceMode === 'fixed_step'
  shortRestsUsedToday?: number; // 0 to 2 per day (BG3 style)
  countdown?: {
    label: string;
    daysLeft: number;
  };
}

export interface StrongholdUpgrade {
  id: string;
  name: string;
  description: string;
  bonus: string;
  builtTurn: number;
}

export type ItemStorageLocation = 'carry' | 'base' | 'vehicle';

export type SupplyType = 'ammo' | 'fuel' | 'food' | 'meds' | 'materials';

export type BaseSupplies = Record<SupplyType, number>;

export interface VehicleRecord {
  id: string;
  name: string;
  kind: string;
  fuel: number; // 0 to 100
  condition: number; // 0 to 100
  note?: string;
}

export interface StrongholdState {
  name: string;
  location: string;
  defense: number;
  upgrades: StrongholdUpgrade[];
  supplies?: BaseSupplies;
  vehicles?: VehicleRecord[];
}

export type AttributeId = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export type CharacterAttributes = Record<AttributeId, number>;

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type EquipSlot =
  | 'weapon'
  | 'offhand'
  | 'head'
  | 'armor'
  | 'accessory'
  | 'utility';

export interface ItemBonuses {
  str?: number;
  dex?: number;
  con?: number;
  int?: number;
  wis?: number;
  cha?: number;
  maxVigor?: number;
}

export interface SkillProgress {
  name: string;
  level: number; // 1 to 5
  attribute: AttributeId;
  xp: number; // 0 to 100
}

export interface TalentRecord {
  id: string;
  name: string;
  description: string;
  unlockedTurn: number;
}

export type RelationshipTier =
  | 'stranger'
  | 'acquaintance'
  | 'friend'
  | 'close'
  | 'romance'
  | 'partner'
  | 'rival'
  | 'enemy';

export type LocationKind =
  | 'city'
  | 'safehouse'
  | 'dungeon'
  | 'secret'
  | 'market'
  | 'wilderness';

export type LocationStatus = 'unexplored' | 'explored' | 'cleared';

export interface TacticalAction {
  id: string;
  label: string;
  intent: ActionIntent;
  risk: ActionRisk;
  requiresRoll?: boolean;
  rollSkillHint?: string;
  attribute?: AttributeId;
  effectTag?: string;
  unlockHint?: string;
}

export type ItemCategory = 'weapon' | 'tool' | 'relic' | 'consumable' | 'clue' | 'misc';

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  quantity: number;
  note?: string;
  rarity?: ItemRarity;
  equipSlot?: EquipSlot;
  equipped?: boolean;
  storage?: ItemStorageLocation;
  bonuses?: ItemBonuses;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'failed';
  primary?: boolean;
}

export interface JournalEntry {
  id: string;
  chapter: number;
  title: string;
  summary: string;
  turnRange: string;
  isArcCompression?: boolean;
  createdAt: number;
}

export type NpcStance = 'ally' | 'neutral' | 'suspicious' | 'hostile' | 'unknown';

export type NpcStatus = 'alive' | 'missing' | 'dead';

export interface NpcBondMemory {
  turn: number;
  text: string;
  approved?: boolean;
}

export interface NpcRecord {
  id: string;
  name: string;
  role: string;
  stance: NpcStance;
  status: NpcStatus;
  affinity?: number; // -100 to 100
  relationship?: RelationshipTier;
  inParty?: boolean;
  portraitUrl?: string;
  assistAttribute?: AttributeId;
  assistSpecialty?: string;
  age?: number;
  height?: string;
  appearance?: string;
  personality?: string;
  currentMood?: string;
  level?: number;
  vigor?: number;
  maxVigor?: number;
  attributes?: CharacterAttributes;
  skills?: string[];
  traits?: string[];
  likes?: string[];
  dislikes?: string[];
  bondMemories?: NpcBondMemory[];
  orgMember?: boolean;
  orgRank?: OrgRank;
  orgDivision?: OrgDivisionId;
  orgDuty?: OrgMemberDuty;
  dailyWage?: number;
  injuryNote?: string;
  recoveryHoursLeft?: number;
  hiddenFlaw?: string;
  lastSeenLocation: string;
  notes: string;
  firstMetTurn: number;
}

export type LocationDanger = 'safe' | 'tense' | 'hostile';

export interface LocationRecord {
  id: string;
  name: string;
  description: string;
  danger: LocationDanger;
  kind?: LocationKind;
  status?: LocationStatus;
  recommendedLevel?: number;
  visitCount: number;
  firstVisitedTurn: number;
  lat?: number;
  lng?: number;
  region?: string;
}

export interface WorldMapMeta {
  isRealWorld: boolean;
  realWorldAnchor?: string;
  realWorldRegion?: string;
  centerLat?: number;
  centerLng?: number;
  defaultZoom?: number;
  customArtMapUrl?: string;
  syncedLocationCount?: number;
  lastSyncedCount?: number;
}

export type FactionStanding = 'allied' | 'neutral' | 'wary' | 'hostile';

export type FactionTreaty =
  | 'none'
  | 'non_aggression'
  | 'trade_pact'
  | 'alliance'
  | 'war';

export interface FactionRecord {
  id: string;
  name: string;
  description: string;
  standing: FactionStanding;
  influence: string;
  treaty?: FactionTreaty;
  reputationScore?: number; // -100 to 100
}

export interface CanonFact {
  id: string;
  text: string;
  turn: number;
  pinned?: boolean;
}

export interface WorldCodex {
  npcs: NpcRecord[];
  locations: LocationRecord[];
  factions: FactionRecord[];
  canonFacts: CanonFact[];
}

export type CampaignStatus =
  | 'active'
  | 'crisis_vigor'
  | 'crisis_tension'
  | 'ended_fallen'
  | 'ended_victory';

export interface CampaignEpilogue {
  title: string;
  outcome: 'fallen' | 'victory';
  summary: string;
  finalWords: string;
  stats: {
    turns: number;
    chapters: number;
    npcsMet: number;
    locationsDiscovered: number;
    questsCompleted: number;
    criticalHits: number;
    criticalFails: number;
  };
  createdAt: number;
}

export type DiceOutcome =
  | 'critical_failure'
  | 'failure'
  | 'partial'
  | 'success'
  | 'critical_success';

export interface DiceRollResult {
  roll: number;
  rolls?: [number, number];
  rollMode?: RollMode;
  advantageSource?: string;
  opposedLabel?: string;
  rerolledWithInspiration?: boolean;
  bonus: number;
  bonusSource?: string;
  attribute?: AttributeId;
  attributeMod?: number;
  skillLevelBonus?: number;
  gearBonus?: number;
  total: number;
  dc: number;
  outcome: DiceOutcome;
}

export interface StateDelta {
  kind:
    | 'item_add'
    | 'item_remove'
    | 'vigor'
    | 'tension'
    | 'trait'
    | 'skill'
    | 'quest'
    | 'journal'
    | 'npc'
    | 'location'
    | 'faction'
    | 'memory'
    | 'crisis'
    | 'xp'
    | 'level'
    | 'talent'
    | 'currency'
    | 'bond'
    | 'inspiration'
    | 'base'
    | 'time';
  label: string;
  positive?: boolean;
}

export type StoryBeatKind = 'narration' | 'dialogue' | 'message';

export interface StoryBeat {
  kind: StoryBeatKind;
  speaker?: string;
  text: string;
  emotion?: string;
  channel?: string;
  isProtagonist?: boolean;
}

export interface StoryEntry {
  id: string;
  role: 'prologue' | 'narrator' | 'player' | 'pulse' | 'system';
  text: string;
  beats?: StoryBeat[];
  turn: number;
  chapter?: number;
  sceneTitle?: string;
  location?: string;
  mood?: string;
  diceRoll?: DiceRollResult;
  deltas?: StateDelta[];
  imageUrl?: string;
  imageCaption?: string;
  imageEngine?: 'gemini' | 'demo';
  isDirection?: boolean;
  isCrisisResolution?: boolean;
  timestamp: number;
}

export interface PlayerState {
  name: string;
  age: number;
  occupation: string;
  height?: string;
  physique?: string;
  appearance?: string;
  portraitUrl?: string;
  portraitEngine?: 'gemini' | 'demo';
  level: number;
  xp: number;
  xpToNextLevel: number;
  attributePoints: number;
  attributes: CharacterAttributes;
  vigor: number;
  maxVigor: number;
  tension: number;
  inspiration?: number; // 0 to 4 (BG3 Inspiration Points)
  traits: string[];
  skills: string[];
  skillLevels: SkillProgress[];
  talents: TalentRecord[];
  currency: {
    amount: number;
    label: string;
  };
  inventory: InventoryItem[];
  quests: Quest[];
  journal: JournalEntry[];
}

export interface WorldConfig {
  title: string;
  primaryTheme: WorldThemeId;
  genres: string[];
  tone: string;
  era: string;
  history: string;
  worldLaws: string;
  premise: string;
  creativePrompt?: string;
  storyPace: StoryPace;
  matureMode: boolean;
}

export interface Campaign {
  id: string;
  createdAt: number;
  updatedAt: number;
  world: WorldConfig;
  player: PlayerState;
  codex: WorldCodex;
  status: CampaignStatus;
  arcNumber: number;
  eraSummaries: JournalEntry[];
  epilogue?: CampaignEpilogue;
  coverImageUrl?: string;
  difficulty: DifficultyId;
  language: LanguageId;
  currentChapter: number;
  currentLocation: string;
  currentMood: string;
  turnCount: number;
  journalEntryCount: number;
  entries: StoryEntry[];
  actions: TacticalAction[];
  interactionId?: string;
  freeformMode?: boolean;
  worldClock?: WorldClock;
  stronghold?: StrongholdState;
  organization?: OrganizationState;
  mapMeta?: WorldMapMeta;
  rumors?: WorldRumorItem[];
  activeWorldEvent?: WorldEventRecord | null;
  lastWorldEventTurn?: number;
  eventHistory?: Array<{
    id: string;
    title: string;
    turn: number;
    chosenSummary: string;
  }>;
  engineUsed: 'gemini' | 'demo';
}

export interface SaveSlot {
  id: string;
  campaignId: string;
  name: string;
  savedAt: number;
  turnCount: number;
  chapter: number;
  location: string;
  vigor: number;
  snapshot: Campaign;
}

export interface AppSettings {
  language: LanguageId;
  difficulty: DifficultyId;
  readerFont: string;
  readerFontSize: number;
  colorMode: 'dark' | 'light';
  dialogueStyle: 'bubbles' | 'classic';
  responseLength: ResponseLength;
  narrativeStyle: NarrativeStyle;
  narrativePerspective: NarrativePerspective;
  customAiInstructions: string;
  livingWorldEnabled: boolean;
  livingWorldSeconds: number;
  storytellerProfile: StorytellerProfile;
  eventDeliveryMode: WorldEventDeliveryMode;
  diceAnimations: boolean;
  autoIllustrateScenes: boolean;
  weatherEffectsEnabled: boolean;
  ambientSoundEnabled: boolean;
  ambientVolume: number;
  geminiApiKey: string;
  geminiModel: 'gemini-3.8-flash' | 'gemini-4-argon';
  forceDemoMode: boolean;
}

export interface AiStateChanges {
  vigorDelta?: number;
  tensionDelta?: number;
  xpGain?: number;
  inspirationGain?: number;
  currencyDelta?: number;
  currencyLabel?: string;
  updateIdentity?: {
    name?: string;
    age?: number;
    occupation?: string;
    worldTitle?: string;
    worldEra?: string;
    worldPremise?: string;
  };
  addItems?: Array<{
    name: string;
    category?: ItemCategory;
    quantity?: number;
    note?: string;
    rarity?: ItemRarity;
    equipSlot?: EquipSlot;
    storage?: ItemStorageLocation;
    bonuses?: ItemBonuses;
  }>;
  removeItems?: string[];
  supplyDeltas?: Partial<BaseSupplies>;
  upsertVehicle?: {
    name: string;
    kind?: string;
    fuelDelta?: number;
    conditionDelta?: number;
    note?: string;
  };
  addTraits?: string[];
  addSkills?: string[];
  skillTraining?: Array<{
    name: string;
    attribute?: AttributeId;
    xpGain?: number;
    levelUp?: boolean;
  }>;
  addTalents?: Array<{
    name: string;
    description: string;
  }>;
  addQuests?: Array<{
    title: string;
    description: string;
    primary?: boolean;
  }>;
  completeQuests?: string[];
  failQuests?: string[];
  upsertNpcs?: Array<{
    name: string;
    role?: string;
    stance?: NpcStance;
    status?: NpcStatus;
    affinityDelta?: number;
    relationship?: RelationshipTier;
    assistAttribute?: AttributeId;
    assistSpecialty?: string;
    age?: number;
    height?: string;
    appearance?: string;
    personality?: string;
    currentMood?: string;
    skills?: string[];
    traits?: string[];
    likes?: string[];
    dislikes?: string[];
    attributes?: Partial<CharacterAttributes>;
    bondMemory?: string;
    notes?: string;
  }>;
  companionReactions?: Array<{
    name: string;
    approved: boolean;
    reason?: string;
  }>;
  advanceTime?: {
    minutes?: number;
    periods?: number;
    weather?: string;
    weatherType?: WeatherType;
    countdownDelta?: number;
    setCountdown?: {
      label: string;
      daysLeft: number;
    };
  };
  addBaseUpgrade?: {
    name: string;
    description: string;
    bonus: string;
  };
  discoverLocation?: {
    name: string;
    description?: string;
    danger?: LocationDanger;
    kind?: LocationKind;
    status?: LocationStatus;
    recommendedLevel?: number;
    lat?: number;
    lng?: number;
    region?: string;
  };
  upsertFactions?: Array<{
    name: string;
    description?: string;
    standing?: FactionStanding;
    influence?: string;
  }>;
  orgMoraleDelta?: number;
  orgHeatDelta?: number;
  orgRenownGain?: number;
  recruitNpcToOrg?: {
    name: string;
    rank?: OrgRank;
    division?: OrgDivisionId;
    dailyWage?: number;
  };
  addCanonFacts?: string[];
}

export interface StoryTurnResponse {
  worldPrologue?: string;
  sceneTitle: string;
  location: string;
  mood: string;
  narration: string;
  beats?: StoryBeat[];
  actions: Array<{
    label: string;
    intent: ActionIntent;
    risk: ActionRisk;
    requiresRoll?: boolean;
    rollSkillHint?: string;
    attribute?: AttributeId;
    effectTag?: string;
    unlockHint?: string;
  }>;
  stateChanges: AiStateChanges;
  waitingForResponse?: boolean;
  interactionId?: string;
  engineUsed: 'gemini' | 'demo';
}

export interface JournalSummaryResponse {
  title: string;
  summary: string;
  engineUsed: 'gemini' | 'demo';
}

export interface EpilogueResponse {
  title: string;
  summary: string;
  finalWords: string;
  engineUsed: 'gemini' | 'demo';
}

export type IllustrationKind = 'scene' | 'portrait' | 'map';

export interface IllustrationResponse {
  dataUrl: string;
  caption: string;
  engineUsed: 'gemini' | 'demo';
}

export interface SpeechResponse {
  dataUrl: string;
  mimeType: string;
  engineUsed: 'gemini' | 'demo';
}

export interface ChapterTransitionEvent {
  id: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
}

export interface ToastMessage {
  id: string;
  kind: StateDelta['kind'] | 'save' | 'info' | 'error';
  message: string;
}

export type AppView = 'home' | 'forge' | 'stage';

export type ForgeArchitectMode =
  | 'full_world'
  | 'refine_lore'
  | 'protagonist_only'
  | 'surprise_me';

export interface ForgeWorldRequest {
  inspirationPrompt: string;
  mode: ForgeArchitectMode;
  language: LanguageId;
  preferredTheme?: WorldThemeId;
  existingWorld?: {
    title?: string;
    primaryTheme?: WorldThemeId;
    genres?: string[];
    tone?: string;
    era?: string;
    premise?: string;
    history?: string;
    worldLaws?: string;
    creativePrompt?: string;
  };
  matureMode?: boolean;
}

export interface ForgedWorldBlueprint {
  primaryTheme: WorldThemeId;
  extraGenres: string[];
  tone: string;
  title: string;
  era: string;
  premise: string;
  history: string;
  worldLaws: string;
  creativePrompt: string;
  factions: Array<{
    name: string;
    description: string;
    standing: FactionStanding;
    influence: string;
  }>;
  protagonist?: {
    name: string;
    age: number;
    occupation: string;
    attributes?: Partial<CharacterAttributes>;
    startingCurrency?: {
      amount: number;
      label: string;
    };
    traits: string[];
    skills: string[];
    starterItem: {
      name: string;
      category: ItemCategory;
      note: string;
    };
  };
  engineUsed: 'gemini' | 'demo';
}

export type RumorUrgency = 'low' | 'medium' | 'urgent';

export interface WorldRumorItem {
  id: string;
  headline: string;
  source: string;
  body: string;
  locationHint?: string;
  urgency: RumorUrgency;
  hookAction: string;
  questTitle?: string;
  dayGenerated: number;
  timeGenerated: string;
  investigated?: boolean;
}

export interface WorldRumorsResponse {
  channelName: string;
  channelSubtitle: string;
  items: Array<{
    headline: string;
    source: string;
    body: string;
    locationHint?: string;
    urgency: RumorUrgency;
    hookAction: string;
    questTitle?: string;
  }>;
  engineUsed: 'gemini' | 'demo';
}

export interface CraftRequest {
  targetKind: 'item' | 'vehicle';
  targetId: string;
  secondaryItemId?: string;
  materialsSpent: number;
  blueprintIdea?: string;
}

export interface CraftResponse {
  success: boolean;
  narrativeLog: string;
  upgradedItem?: {
    name: string;
    category: ItemCategory;
    rarity: ItemRarity;
    note: string;
    equipSlot?: EquipSlot;
    bonuses?: Partial<CharacterAttributes> & { maxVigor?: number };
  };
  upgradedVehicle?: {
    name: string;
    kind: string;
    conditionGain: number;
    fuelGain: number;
    note: string;
  };
  xpGain: number;
  engineUsed: 'gemini' | 'demo';
}

export type StorytellerProfile = 'balanced' | 'slow' | 'chaotic' | 'manual';

export type WorldEventDeliveryMode = 'island' | 'immediate';

export type WorldEventCategory =
  | 'dilemma'
  | 'opportunity'
  | 'crisis'
  | 'encounter'
  | 'base'
  | 'weather';

export interface WorldEventChoice {
  id: string;
  label: string;
  consequenceHint: string;
  intent: ActionIntent;
  risk: ActionRisk;
  requiresRoll: boolean;
  attribute?: AttributeId;
  supplyDeltas?: Partial<BaseSupplies>;
  currencyDelta?: number;
  vigorDelta?: number;
  tensionDelta?: number;
  defenseDelta?: number;
  affinityDelta?: number;
  targetNpcName?: string;
  narrativeHook: string;
}

export interface WorldEventRecord {
  id: string;
  title: string;
  category: WorldEventCategory;
  urgency: RumorUrgency;
  description: string;
  companionReaction?: {
    speaker: string;
    quote: string;
  };
  choices: WorldEventChoice[];
  triggerTurn: number;
  dayTriggered: number;
  timeTriggered: string;
  triggerReason?: string;
}

export interface WorldEventResponse {
  title: string;
  category: WorldEventCategory;
  urgency: RumorUrgency;
  description: string;
  companionReaction?: {
    speaker: string;
    quote: string;
  };
  choices: Array<Omit<WorldEventChoice, 'id'>>;
  engineUsed: 'gemini' | 'demo';
}

export interface MapGeocodeResponse {
  isRealWorld: boolean;
  realWorldAnchor?: string;
  realWorldRegion: string;
  centerLat?: number;
  centerLng?: number;
  defaultZoom?: number;
  locations: Array<{
    id: string;
    name?: string;
    region?: string;
    lat?: number;
    lng?: number;
  }>;
  engineUsed: 'gemini' | 'demo';
}

/* ============================================================================
 * MYTHOS 9.0 — Organization, Guild, Mercenary Company & Squad Operations
 * ============================================================================ */

export type OrganizationArchetype =
  | 'mercenary'
  | 'community'
  | 'guild'
  | 'syndicate'
  | 'militia'
  | 'caravan';

export type OrgDivisionId =
  | 'security'
  | 'intel'
  | 'logistics'
  | 'medical'
  | 'diplomacy'
  | 'reserve';

export type OrgRank =
  | 'leader'
  | 'lieutenant'
  | 'specialist'
  | 'member'
  | 'hired_merc';

export type OrgMemberDuty =
  | 'available'
  | 'in_party'
  | 'on_mission'
  | 'injured'
  | 'captured';

export interface OrgPolicies {
  rations: 'generous' | 'standard' | 'strict';
  conduct: 'merciful' | 'pragmatic' | 'ruthless';
  recruitment: 'open' | 'selective' | 'contract';
}

export interface OrgRecruitCandidate {
  id: string;
  name: string;
  role: string;
  age?: number;
  height?: string;
  personality: string;
  pitch: string;
  recommendedDivision: OrgDivisionId;
  attributes: CharacterAttributes;
  skills: string[];
  traits: string[];
  visibleFlaw: string;
  hireCost: number;
  dailyWage: number;
}

export type OrgOperationKind =
  | 'scavenge'
  | 'recon'
  | 'contract'
  | 'escort'
  | 'raid'
  | 'diplomacy'
  | 'rescue';

export type OrgOperationDifficulty = 'low' | 'medium' | 'high' | 'extreme';

export type OrgOperationOutcomeGrade =
  | 'critical'
  | 'success'
  | 'partial'
  | 'disaster';

export interface OrgOperation {
  id: string;
  title: string;
  kind: OrgOperationKind;
  briefing: string;
  targetLocationName: string;
  targetFactionName?: string;
  difficulty: OrgOperationDifficulty;
  recommendedAttributes: AttributeId[];
  durationHours: number;
  durationTurns: number;
  rewardSummary: string;
  rewardCurrency?: number;
  rewardSupplies?: Partial<BaseSupplies>;
  rewardRenown?: number;
  heatGain: number;
  status: 'available' | 'active' | 'ready_to_claim' | 'completed' | 'failed';
  assignedNpcIds?: string[];
  assignedVehicleId?: string;
  hoursRemaining?: number;
  turnsRemaining?: number;
  startedTurn?: number;
  captiveNpcId?: string;
  outcomeGrade?: OrgOperationOutcomeGrade;
  outcomeRollSummary?: string;
  outcomeLog?: string;
}

export type OrgOutpostSpecialty =
  | 'food'
  | 'fuel'
  | 'materials'
  | 'meds'
  | 'intel'
  | 'income';

export interface OrgOutpost {
  id: string;
  locationId: string;
  locationName: string;
  specialty: OrgOutpostSpecialty;
  dailyYield: number;
  defenseBonus: number;
  garrisonNpcIds: string[];
  establishedTurn: number;
}

export interface OrgHistoryEntry {
  id: string;
  day: number;
  turn: number;
  kind: 'founded' | 'operation' | 'upkeep' | 'recruit' | 'outpost' | 'diplomacy';
  text: string;
}

export interface OrganizationState {
  name: string;
  motto: string;
  archetype: OrganizationArchetype;
  foundedTurn: number;
  renown: number;
  tier: number; // 1 to 10
  morale: number; // 0 to 100
  heat: number; // 0 to 100
  policies: OrgPolicies;
  outposts: OrgOutpost[];
  operations: OrgOperation[];
  recruitPool: OrgRecruitCandidate[];
  lastUpkeepDay: number;
  historyLog: OrgHistoryEntry[];
}

export interface OrgRecruitsResponse {
  candidates: Array<Omit<OrgRecruitCandidate, 'id'>>;
  engineUsed: 'gemini' | 'demo';
}

export interface OrgOperationsResponse {
  operations: Array<
    Omit<
      OrgOperation,
      | 'id'
      | 'status'
      | 'assignedNpcIds'
      | 'assignedVehicleId'
      | 'hoursRemaining'
      | 'turnsRemaining'
      | 'startedTurn'
      | 'outcomeGrade'
      | 'outcomeRollSummary'
      | 'outcomeLog'
    >
  >;
  engineUsed: 'gemini' | 'demo';
}

export interface OrgOperationReportResponse {
  narrativeReport: string;
  squadQuote?: {
    speaker: string;
    text: string;
  };
  canonFact?: string;
  engineUsed: 'gemini' | 'demo';
}
