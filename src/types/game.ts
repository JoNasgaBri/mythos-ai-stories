export type WorldThemeId = 'fantasy' | 'cyberpunk' | 'mystery' | 'zombies' | 'apocalyptic';

export type DifficultyId = 'easy' | 'normal' | 'hard' | 'insane' | 'good-luck';

export type LanguageId = 'pt-BR' | 'en' | 'fr';

export type ResponseLength = 'short' | 'normal' | 'literary';

export type StoryPace = 'epic' | 'endless' | 'focused';

export type ActionIntent =
  | 'bold'
  | 'stealth'
  | 'diplomatic'
  | 'investigate'
  | 'survival'
  | 'item';

export type ActionRisk = 'safe' | 'low' | 'medium' | 'high';

export interface TacticalAction {
  id: string;
  label: string;
  intent: ActionIntent;
  risk: ActionRisk;
}

export type ItemCategory = 'weapon' | 'tool' | 'relic' | 'consumable' | 'clue' | 'misc';

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  quantity: number;
  note?: string;
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
  bonus: number;
  bonusSource?: string;
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
    | 'crisis';
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
  isCrisisResolution?: boolean;
  timestamp: number;
}

export interface PlayerState {
  name: string;
  age: number;
  occupation: string;
  portraitUrl?: string;
  portraitEngine?: 'gemini' | 'demo';
  vigor: number;
  maxVigor: number;
  tension: number;
  traits: string[];
  skills: string[];
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
  livingWorldEnabled: boolean;
  livingWorldSeconds: number;
  diceAnimations: boolean;
  autoIllustrateScenes: boolean;
  geminiApiKey: string;
  geminiModel: 'gemini-3.8-flash' | 'gemini-4-argon';
  forceDemoMode: boolean;
}

export interface AiStateChanges {
  vigorDelta?: number;
  tensionDelta?: number;
  addItems?: Array<{
    name: string;
    category?: ItemCategory;
    quantity?: number;
    note?: string;
  }>;
  removeItems?: string[];
  addTraits?: string[];
  addSkills?: string[];
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
    notes?: string;
  }>;
  discoverLocation?: {
    name: string;
    description?: string;
    danger?: LocationDanger;
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
