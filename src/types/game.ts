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

export interface StrongholdState {
  name: string;
  location: string;
  defense: number;
  upgrades: StrongholdUpgrade[];
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
}

export type FactionStanding = 'allied' | 'neutral' | 'wary' | 'hostile';

export interface FactionRecord {
  id: string;
  name: string;
  description: string;
  standing: FactionStanding;
  influence: string;
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

export interface StoryEntry {
  id: string;
  role: 'prologue' | 'narrator' | 'player' | 'pulse' | 'system';
  text: string;
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
  responseLength: ResponseLength;
  narrativeStyle: NarrativeStyle;
  narrativePerspective: NarrativePerspective;
  customAiInstructions: string;
  livingWorldEnabled: boolean;
  livingWorldSeconds: number;
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
    bonuses?: ItemBonuses;
  }>;
  removeItems?: string[];
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
  };
  upsertFactions?: Array<{
    name: string;
    description?: string;
    standing?: FactionStanding;
    influence?: string;
  }>;
  addCanonFacts?: string[];
}

export interface StoryTurnResponse {
  worldPrologue?: string;
  sceneTitle: string;
  location: string;
  mood: string;
  narration: string;
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

export type IllustrationKind = 'scene' | 'portrait';

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
