import { GoogleGenAI } from '@google/genai';
import type {
  Campaign,
  DiceRollResult,
  EpilogueResponse,
  FactionStanding,
  ForgeWorldRequest,
  ForgedWorldBlueprint,
  IllustrationKind,
  IllustrationResponse,
  ItemCategory,
  JournalSummaryResponse,
  LanguageId,
  ResponseLength,
  StoryPace,
  StoryTurnResponse,
  WorldThemeId,
} from '../src/types/game';

const TURN_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    worldPrologue: {
      type: 'string',
      description:
        'Only needed on campaign start: 2-3 literary paragraphs introducing the world’s history, laws, factions, and underlying tension before Chapter I begins.',
    },
    sceneTitle: {
      type: 'string',
      description: 'Short evocative title for the current scene (3-6 words).',
    },
    location: {
      type: 'string',
      description: 'Current specific location name.',
    },
    mood: {
      type: 'string',
      description: 'Short 1-3 word atmosphere mood label.',
    },
    narration: {
      type: 'string',
      description:
        'Vivid second-person literary narration advancing the story based on player action and dice outcome. Do not repeat options at the end.',
    },
    actions: {
      type: 'array',
      minItems: 3,
      maxItems: 4,
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', description: 'Distinct tactical choice for the player.' },
          intent: {
            type: 'string',
            enum: ['bold', 'stealth', 'diplomatic', 'investigate', 'survival', 'item'],
          },
          risk: {
            type: 'string',
            enum: ['safe', 'low', 'medium', 'high'],
          },
        },
        required: ['label', 'intent', 'risk'],
      },
    },
    stateChanges: {
      type: 'object',
      properties: {
        vigorDelta: { type: 'integer', description: 'Change to vigor (-30 to +25, 0 if unchanged).' },
        tensionDelta: { type: 'integer', description: 'Change to tension (-60 to +25, 0 if unchanged).' },
        addItems: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              category: {
                type: 'string',
                enum: ['weapon', 'tool', 'relic', 'consumable', 'clue', 'misc'],
              },
              quantity: { type: 'integer' },
              note: { type: 'string' },
            },
            required: ['name'],
          },
        },
        removeItems: {
          type: 'array',
          items: { type: 'string' },
        },
        addTraits: {
          type: 'array',
          items: { type: 'string' },
        },
        addSkills: {
          type: 'array',
          items: { type: 'string' },
        },
        addQuests: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              primary: { type: 'boolean' },
            },
            required: ['title', 'description'],
          },
        },
        completeQuests: {
          type: 'array',
          items: { type: 'string' },
        },
        failQuests: {
          type: 'array',
          items: { type: 'string' },
        },
        upsertNpcs: {
          type: 'array',
          description: 'Register or update notable NPCs appearing or shifting loyalty in this scene.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              role: { type: 'string' },
              stance: {
                type: 'string',
                enum: ['ally', 'neutral', 'suspicious', 'hostile', 'unknown'],
              },
              status: {
                type: 'string',
                enum: ['alive', 'missing', 'dead'],
              },
              notes: { type: 'string' },
            },
            required: ['name'],
          },
        },
        discoverLocation: {
          type: 'object',
          description: 'Register or update the current location in the world atlas.',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            danger: {
              type: 'string',
              enum: ['safe', 'tense', 'hostile'],
            },
          },
          required: ['name'],
        },
        upsertFactions: {
          type: 'array',
          description: 'Register or update major factions whose standing or influence shifts in this scene.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              standing: {
                type: 'string',
                enum: ['allied', 'neutral', 'wary', 'hostile'],
              },
              influence: { type: 'string' },
            },
            required: ['name'],
          },
        },
        addCanonFacts: {
          type: 'array',
          description:
            '0-2 short immutable sentences recording major decisions, deaths, oaths, or world changes to remember permanently across 100+ turns.',
          items: { type: 'string' },
        },
      },
    },
    waitingForResponse: {
      type: 'boolean',
      description: 'True when the scene stops on a cliffhanger waiting for the player.',
    },
  },
  required: ['sceneTitle', 'location', 'mood', 'narration', 'actions', 'stateChanges'],
};

const SUMMARY_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Short chapter title (3-6 words).' },
    summary: {
      type: 'string',
      description: 'Concise chronicle summary preserving key NPCs, discoveries, promises, and losses.',
    },
  },
  required: ['title', 'summary'],
};

const EPILOGUE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Evocative closing chronicle title (3-7 words).' },
    summary: {
      type: 'string',
      description: '2-3 literary paragraphs closing the character arc, honoring choices, NPCs met, and world fate.',
    },
    finalWords: {
      type: 'string',
      description: 'A memorable single-sentence closing epitaph or lingering quote.',
    },
  },
  required: ['title', 'summary', 'finalWords'],
};

const FORGED_WORLD_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    primaryTheme: {
      type: 'string',
      enum: ['fantasy', 'cyberpunk', 'mystery', 'zombies', 'apocalyptic'],
      description: 'Closest matching visual & atmospheric theme pillar.',
    },
    extraGenres: {
      type: 'array',
      maxItems: 2,
      items: { type: 'string' },
      description: 'Up to 2 evocative secondary genre tags.',
    },
    tone: {
      type: 'string',
      description: 'Concise 2-4 word narrative tone label.',
    },
    title: {
      type: 'string',
      description: 'Memorable, literary chronicle or world title.',
    },
    era: {
      type: 'string',
      description: 'Era, year, or concise setting descriptor.',
    },
    premise: {
      type: 'string',
      description: 'Compelling 2-3 sentence inciting premise & hook for Chapter I.',
    },
    history: {
      type: 'string',
      description: 'Rich 3-5 sentence world history explaining wars, collapses, oaths, or culture.',
    },
    worldLaws: {
      type: 'string',
      description: 'Concrete magic, technology, or survival rules and their cost.',
    },
    creativePrompt: {
      type: 'string',
      description:
        'Refined 2-4 sentence permanent Game Master Creative Direction capturing the user’s inspiration, motifs, twists, and narrative voice.',
    },
    factions: {
      type: 'array',
      minItems: 2,
      maxItems: 4,
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          standing: {
            type: 'string',
            enum: ['allied', 'neutral', 'wary', 'hostile'],
          },
          influence: { type: 'string' },
        },
        required: ['name', 'description', 'standing', 'influence'],
      },
    },
    protagonist: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' },
        occupation: { type: 'string' },
        traits: { type: 'array', items: { type: 'string' } },
        skills: { type: 'array', items: { type: 'string' } },
        starterItem: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            category: {
              type: 'string',
              enum: ['weapon', 'tool', 'relic', 'consumable', 'clue', 'misc'],
            },
            note: { type: 'string' },
          },
          required: ['name', 'category', 'note'],
        },
      },
      required: ['name', 'age', 'occupation', 'traits', 'skills', 'starterItem'],
    },
  },
  required: [
    'primaryTheme',
    'extraGenres',
    'tone',
    'title',
    'era',
    'premise',
    'history',
    'worldLaws',
    'creativePrompt',
    'factions',
    'protagonist',
  ],
};

const LANGUAGE_DIRECTIVE: Record<LanguageId, string> = {
  'pt-BR': 'Write ALL output strictly in natural, evocative Brazilian Portuguese (pt-BR).',
  en: 'Write ALL output strictly in natural, evocative English.',
  fr: 'Write ALL output strictly in natural, evocative French.',
};

const LENGTH_DIRECTIVE: Record<ResponseLength, string> = {
  short: 'Keep narration crisp: 1 focused paragraph (3-4 vivid sentences).',
  normal: 'Write 2 balanced literary paragraphs with clear sensory detail and pacing.',
  literary: 'Write 3 rich literary paragraphs with atmosphere, character subtext, and tension.',
};

const PACE_DIRECTIVE: Record<StoryPace, string> = {
  epic: 'Campaign Pace: LONG EPIC CHRONICLE. Develop slow-burn intrigue, regional cultures, recurring subplots, and lasting consequences across multiple books/arcs. NEVER rush toward a premature ending.',
  endless: 'Campaign Pace: ENDLESS LIVING SANDBOX. Keep opening new horizons, mysteries, rumors, and quests so the story can span hundreds of turns organically.',
  focused: 'Campaign Pace: FOCUSED ARC. Maintain steady dramatic momentum around the central conflict.',
};

function parseStructuredJson<T>(raw: string | undefined): T {
  if (!raw || !raw.trim()) {
    throw new Error('Gemini returned an empty response.');
  }
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

function buildSystemInstruction(
  campaign: Campaign,
  length: ResponseLength,
): string {
  const matureNote = campaign.world.matureMode
    ? 'Mature storytelling (18+) is enabled: allow gritty moral dilemmas, dark consequences, psychological tension, and raw drama without gratuitous explicit content.'
    : 'Keep content PG-13: dramatic tension and peril without graphic gore or explicit mature themes.';

  return [
    'You are the MYTHOS Narrative Engine, a literary long-form RPG Game Master.',
    LANGUAGE_DIRECTIVE[campaign.language],
    LENGTH_DIRECTIVE[length],
    matureNote,
    '=== PERMANENT WORLD BIBLE ===',
    `World Title: ${campaign.world.title}`,
    `Era / Setting: ${campaign.world.era}`,
    `Genres: ${campaign.world.genres.join(', ')}`,
    `Tone: ${campaign.world.tone}`,
    `World History: ${campaign.world.history}`,
    `World Laws (Magic / Tech / Survival Rules): ${campaign.world.worldLaws}`,
    `Starting Premise: ${campaign.world.premise}`,
    campaign.world.creativePrompt?.trim()
      ? `Author's Creative Inspiration & Prompt Direction (HONOR FAITHFULLY IN TONE, MOTIFS, AND PLOT): ${campaign.world.creativePrompt.trim()}`
      : '',
    PACE_DIRECTIVE[campaign.world.storyPace || 'epic'],
    `Current Arc / Book: ${campaign.arcNumber ?? 1}`,
    `Difficulty Mode: ${campaign.difficulty}. Respect mechanical dice outcomes faithfully — never turn a failure into an unearned triumph.`,
    'MEMORY DISCIPLINE: Always respect permanentCanonFacts, factions, NPCs, and pastEraArchives. Only emit stateChanges.addCanonFacts (0-2 concise sentences) when an irreversible truth, major death, promise, or revelation occurs.',
    'Keep stateChanges grounded: track NPCs via upsertNpcs, places via discoverLocation, and faction shifts via upsertFactions.',
    'Offer 3-4 distinct tactical actions spanning different intents (bold, stealth, diplomatic, investigate, survival).',
  ].join('\n');
}

function buildCompactStateContext(campaign: Campaign): string {
  const recentBeats = campaign.entries
    .slice(-10)
    .map((e) => `[${e.role.toUpperCase()}]: ${e.text}`)
    .join('\n');

  const pastEraArchives = (campaign.eraSummaries ?? [])
    .map((e) => `Book/Arc ${e.chapter} (${e.title}): ${e.summary}`)
    .join('\n');

  const recentChapters = campaign.player.journal
    .slice(-8)
    .map((j) => `Ch.${j.chapter} (${j.title}): ${j.summary}`)
    .join('\n');

  const pinnedFacts = campaign.codex.canonFacts.filter((f) => f.pinned);
  const dynamicFacts = campaign.codex.canonFacts.filter((f) => !f.pinned).slice(-25);
  const canonFacts = [...pinnedFacts, ...dynamicFacts].slice(0, 35).map((f) => f.text);

  return JSON.stringify(
    {
      protagonist: {
        name: campaign.player.name,
        age: campaign.player.age,
        occupation: campaign.player.occupation,
        vigor: `${campaign.player.vigor}/${campaign.player.maxVigor}`,
        tension: campaign.player.tension,
        traits: campaign.player.traits,
        skills: campaign.player.skills,
        inventory: campaign.player.inventory.map((i) => `${i.name} (x${i.quantity})`),
        activeQuests: campaign.player.quests
          .filter((q) => q.status === 'active')
          .map((q) => q.title),
        completedQuests: campaign.player.quests
          .filter((q) => q.status === 'completed')
          .slice(-5)
          .map((q) => q.title),
      },
      arcNumber: campaign.arcNumber,
      status: campaign.status,
      chapter: campaign.currentChapter,
      turn: campaign.turnCount,
      location: campaign.currentLocation,
      permanentCanonFacts: canonFacts,
      factions: campaign.codex.factions.map((f) => ({
        name: f.name,
        standing: f.standing,
        influence: f.influence,
        description: f.description,
      })),
      knownNpcs: campaign.codex.npcs.slice(0, 16).map((n) => ({
        name: n.name,
        role: n.role,
        stance: n.stance,
        status: n.status,
        lastSeenLocation: n.lastSeenLocation,
        notes: n.notes,
      })),
      knownLocations: campaign.codex.locations.slice(0, 12).map((l) => ({
        name: l.name,
        danger: l.danger,
        description: l.description,
      })),
      pastEraArchives: pastEraArchives || 'First Arc.',
      recentChapterSummaries: recentChapters || 'Opening chapters.',
      recentSceneLog: recentBeats,
    },
    null,
    2,
  );
}

export async function generateStoryStart(
  apiKey: string,
  model: 'gemini-3.8-flash' | 'gemini-4-argon',
  campaign: Campaign,
  length: ResponseLength,
): Promise<StoryTurnResponse> {
  const client = new GoogleGenAI({ apiKey });
  const systemInstruction = buildSystemInstruction(campaign, length);

  const prompt = [
    'Initialize this world and its opening scene.',
    `Protagonist: ${campaign.player.name}, age ${campaign.player.age}, ${campaign.player.occupation}.`,
    `Traits: ${campaign.player.traits.join(', ') || 'None'}.`,
    `Skills: ${campaign.player.skills.join(', ') || 'None'}.`,
    `Starting Inventory: ${campaign.player.inventory.map((i) => i.name).join(', ') || 'None'}.`,
    `Seed Factions: ${campaign.codex.factions.map((f) => `${f.name} (${f.standing}): ${f.description}`).join(' | ') || 'Generate 2-3 fitting factions'}`,
    campaign.world.creativePrompt?.trim()
      ? `Creative Direction Seed: ${campaign.world.creativePrompt.trim()}`
      : '',
    '',
    'REQUIREMENTS:',
    '1. Set "worldPrologue" to 2-3 atmospheric paragraphs introducing the world’s history, laws, culture, and factions in conflict so the player feels grounded in this universe.',
    '2. Set "narration" to Chapter I’s immediate opening moment where the protagonist enters the scene.',
    '3. Populate initial quests, at least 1 NPC (upsertNpcs), starting location (discoverLocation), factions (upsertFactions), and 1-2 foundational addCanonFacts.',
    campaign.world.creativePrompt?.trim()
      ? '4. Directly weave the motifs, tone, and concept from the Author’s Creative Direction into the worldPrologue, opening scene, NPCs, and starting quest.'
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const interaction = await client.interactions.create({
    model,
    system_instruction: systemInstruction,
    input: prompt,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: TURN_RESPONSE_SCHEMA,
    },
    generation_config: {
      max_output_tokens: 1800,
    },
  });

  const parsed = parseStructuredJson<Omit<StoryTurnResponse, 'engineUsed' | 'interactionId'>>(
    interaction.output_text,
  );

  return {
    ...parsed,
    interactionId: interaction.id,
    engineUsed: 'gemini',
  };
}

export async function generateStoryTurn(
  apiKey: string,
  model: 'gemini-3.8-flash' | 'gemini-4-argon',
  campaign: Campaign,
  playerAction: string,
  diceRoll: DiceRollResult | undefined,
  length: ResponseLength,
  crisisMode?: 'survival_test' | 'breaking_point',
): Promise<StoryTurnResponse> {
  const client = new GoogleGenAI({ apiKey });
  const systemInstruction = buildSystemInstruction(campaign, length);

  const rollInstruction = diceRoll
    ? `DETERMINISTIC FATE ROLL: d20=${diceRoll.roll}, skill_bonus=+${diceRoll.bonus}${diceRoll.bonusSource ? ` (${diceRoll.bonusSource})` : ''}, total=${diceRoll.total} vs DC=${diceRoll.dc} => OUTCOME: ${diceRoll.outcome.toUpperCase()}. Narrate consequences strictly matching this outcome.`
    : 'No dice roll required for this low-risk observation action; reward curiosity or deepen mystery naturally.';

  const crisisDirective =
    crisisMode === 'survival_test'
      ? 'LAST STAND SURVIVAL CHECK: The protagonist reached 0 Vigor and just fought back from the brink of collapse! Narrate a harrowing, costly escape with permanent scars.'
      : crisisMode === 'breaking_point'
        ? 'BREAKING POINT CLIMAX (Tension 100%): Tension has boiled over! Trigger a dramatic confrontation, ambush, or revelation right now, and set tensionDelta around -50 to reset the scene pressure afterward.'
        : '';

  const fullContextPrompt = [
    'FULL CAMPAIGN MEMORY CORE:',
    buildCompactStateContext(campaign),
    '',
    `PLAYER ACTION: "${playerAction}"`,
    rollInstruction,
    crisisDirective,
  ]
    .filter(Boolean)
    .join('\n');

  const createWithOptionalChain = async (usePreviousId: boolean) => {
    return client.interactions.create({
      model,
      system_instruction: systemInstruction,
      previous_interaction_id: usePreviousId ? campaign.interactionId : undefined,
      input: usePreviousId
        ? [
            `UPDATED STATE: arc=${campaign.arcNumber}, vigor=${campaign.player.vigor}/${campaign.player.maxVigor}, tension=${campaign.player.tension}, location=${campaign.currentLocation}, difficulty=${campaign.difficulty}`,
            `PINNED CANON FACTS: ${campaign.codex.canonFacts.filter((f) => f.pinned).map((f) => f.text).join(' | ') || 'None'}`,
            `PLAYER ACTION: "${playerAction}"`,
            rollInstruction,
            crisisDirective,
          ]
            .filter(Boolean)
            .join('\n')
        : fullContextPrompt,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: TURN_RESPONSE_SCHEMA,
      },
      generation_config: {
        max_output_tokens: 1600,
      },
    });
  };

  let interaction;
  if (campaign.interactionId) {
    try {
      interaction = await createWithOptionalChain(true);
    } catch {
      interaction = await createWithOptionalChain(false);
    }
  } else {
    interaction = await createWithOptionalChain(false);
  }

  const parsed = parseStructuredJson<Omit<StoryTurnResponse, 'engineUsed' | 'interactionId'>>(
    interaction.output_text,
  );

  return {
    ...parsed,
    interactionId: interaction.id,
    engineUsed: 'gemini',
  };
}

export async function generateLivingWorldPulse(
  apiKey: string,
  campaign: Campaign,
): Promise<StoryTurnResponse> {
  const client = new GoogleGenAI({ apiKey });
  const systemInstruction = buildSystemInstruction(campaign, 'short');

  const prompt = [
    'LIVING WORLD PULSE (the protagonist hesitated and time ticked forward in the scene).',
    buildCompactStateContext(campaign),
    'Advance the environment or NPCs subtly in 2-3 atmospheric sentences, raising tension without unfairly killing the player outright. Keep waitingForResponse=false unless an urgent confrontation demands immediate response.',
  ].join('\n');

  const interaction = await client.interactions.create({
    model: 'gemini-3.5-flash-lite',
    system_instruction: systemInstruction,
    input: prompt,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: TURN_RESPONSE_SCHEMA,
    },
    generation_config: {
      max_output_tokens: 900,
    },
  });

  const parsed = parseStructuredJson<Omit<StoryTurnResponse, 'engineUsed' | 'interactionId'>>(
    interaction.output_text,
  );

  return {
    ...parsed,
    interactionId: campaign.interactionId,
    engineUsed: 'gemini',
  };
}

export async function generateJournalSummary(
  apiKey: string,
  campaign: Campaign,
  mode: 'chapter' | 'arc_compression',
): Promise<JournalSummaryResponse> {
  const client = new GoogleGenAI({ apiKey });

  const inputPayload =
    mode === 'arc_compression'
      ? `Compress these chapter chronicles into one tight, permanent Book/Arc Summary preserving all vital plot threads, NPC fates, faction shifts, and promises:\n\n${campaign.player.journal
          .map((j) => `- Ch.${j.chapter} ${j.title}: ${j.summary}`)
          .join('\n')}`
      : `Summarize the latest 5 turns of "${campaign.world.title}" into a crisp chronicle chapter entry (2-3 sentences):\n\n${campaign.entries
          .slice(-10)
          .map((e) => `[${e.role}]: ${e.text}`)
          .join('\n')}`;

  const interaction = await client.interactions.create({
    model: 'gemini-3.5-flash-lite',
    system_instruction: `${LANGUAGE_DIRECTIVE[campaign.language]} You are an archivist writing a concise, atmospheric RPG chronicle summary.`,
    input: inputPayload,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: SUMMARY_SCHEMA,
    },
    generation_config: {
      max_output_tokens: 550,
    },
  });

  const parsed = parseStructuredJson<{ title: string; summary: string }>(interaction.output_text);
  return {
    ...parsed,
    engineUsed: 'gemini',
  };
}

export async function generateCampaignEpilogue(
  apiKey: string,
  model: 'gemini-3.8-flash' | 'gemini-4-argon',
  campaign: Campaign,
  outcome: 'fallen' | 'victory',
): Promise<EpilogueResponse> {
  const client = new GoogleGenAI({ apiKey });
  const outcomeDirective =
    outcome === 'fallen'
      ? 'The protagonist has fallen after reaching 0 Vigor and failing their final stand. Write a poignant, unforgettable tragic epilogue showing what became of their quest and the people they left behind.'
      : 'The campaign has reached an intentional closing chapter/climax. Write a resonant literary epilogue summarizing how the protagonist’s choices reshaped the world, factions, and NPCs.';

  const prompt = [
    outcomeDirective,
    'CAMPAIGN CONTEXT:',
    buildCompactStateContext(campaign),
  ].join('\n');

  const interaction = await client.interactions.create({
    model,
    system_instruction: `${LANGUAGE_DIRECTIVE[campaign.language]} You are the closing chronicler of MYTHOS.`,
    input: prompt,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: EPILOGUE_SCHEMA,
    },
    generation_config: {
      max_output_tokens: 950,
    },
  });

  const parsed = parseStructuredJson<{ title: string; summary: string; finalWords: string }>(
    interaction.output_text,
  );
  return {
    ...parsed,
    engineUsed: 'gemini',
  };
}

const ART_DIRECTION_BY_THEME: Record<WorldThemeId, string> = {
  fantasy:
    'Dark chiaroscuro painterly concept art, antique gold rim lighting, misty obsidian shadows, atmospheric medieval architecture, rich oil texture.',
  cyberpunk:
    'Anamorphic 35mm neo-noir sci-fi cinematography, wet rain-slicked reflections, cyan and magenta neon glow cutting through deep midnight fog.',
  mystery:
    'Moody 1920s sepia-noir film still, warm brass lamplight piercing heavy coastal fog, dramatic shadows and fine analog film grain.',
  zombies:
    'Gritty atmospheric survival horror frame, pale green emergency beacon glow, overgrown concrete ruins, tension-filled shadows.',
  apocalyptic:
    'Scorched copper wasteland cinematography, sun-baked dust storms, rusted iron silhouettes, dramatic golden-amber rim light.',
};

export interface VisualAssetParams {
  kind: IllustrationKind;
  theme: WorldThemeId;
  worldTitle: string;
  era?: string;
  creativePrompt?: string;
  location?: string;
  sceneTitle?: string;
  sceneText?: string;
  characterName?: string;
  characterOccupation?: string;
  characterTraits?: string[];
}

export async function generateVisualAsset(
  apiKey: string,
  params: VisualAssetParams,
): Promise<IllustrationResponse> {
  const client = new GoogleGenAI({ apiKey });
  const styleGuide = ART_DIRECTION_BY_THEME[params.theme];
  const creativeCue = params.creativePrompt?.trim()
    ? `Creative motif cue: ${params.creativePrompt.trim().slice(0, 220)}.`
    : '';

  const isPortrait = params.kind === 'portrait';
  const prompt = isPortrait
    ? [
        `Create an evocative atmospheric character portrait for an interactive RPG chronicle.`,
        `Character: ${params.characterName || 'Traveler'}, Occupation: ${params.characterOccupation || 'Adventurer'}.`,
        params.characterTraits?.length
          ? `Traits & visual cues: ${params.characterTraits.join(', ')}.`
          : '',
        `World: ${params.worldTitle}${params.era ? ` (${params.era})` : ''}.`,
        creativeCue,
        `Art Direction: ${styleGuide} Medium close-up bust framing, expressive lighting, centered composition.`,
        `STRICT CONSTRAINT: No text, no typography, no frames, no borders, no watermarks.`,
      ]
        .filter(Boolean)
        .join(' ')
    : [
        `Create a widescreen atmospheric concept-art illustration for an interactive RPG scene.`,
        `World: ${params.worldTitle}${params.era ? ` — ${params.era}` : ''}.`,
        `Scene: ${params.sceneTitle || 'Opening'} at ${params.location || 'Unknown location'}.`,
        params.sceneText
          ? `Visual moment: ${params.sceneText.slice(0, 380)}`
          : '',
        creativeCue,
        `Art Direction: ${styleGuide} Cinematic environmental storytelling, deep depth of field.`,
        `STRICT CONSTRAINT: No text, no words, no speech bubbles, no UI overlays, no watermarks.`,
      ]
        .filter(Boolean)
        .join(' ');

  const interaction = await client.interactions.create({
    model: 'gemini-nano-banana-2.1',
    input: prompt,
    response_format: isPortrait
      ? {
          type: 'image',
          aspect_ratio: '1:1',
          image_size: '512',
          mime_type: 'image/jpeg',
        }
      : {
          type: 'image',
          aspect_ratio: '16:9',
          image_size: '1K',
          mime_type: 'image/jpeg',
        },
  });

  const img = interaction.output_image;
  if (!img?.data) {
    throw new Error('Nano Banana 2.1 did not return image data.');
  }

  const mimeType = img.mime_type || 'image/jpeg';
  const caption = isPortrait
    ? `${params.characterName || 'Protagonista'} · ${params.characterOccupation || ''}`.trim()
    : `${params.location || params.sceneTitle || params.worldTitle}`;

  return {
    dataUrl: `data:${mimeType};base64,${img.data}`,
    caption,
    engineUsed: 'gemini',
  };
}

const VALID_THEMES = new Set<WorldThemeId>([
  'fantasy',
  'cyberpunk',
  'mystery',
  'zombies',
  'apocalyptic',
]);

const VALID_STANDINGS = new Set<FactionStanding>([
  'allied',
  'neutral',
  'wary',
  'hostile',
]);

const VALID_ITEM_CATEGORIES = new Set<ItemCategory>([
  'weapon',
  'tool',
  'relic',
  'consumable',
  'clue',
  'misc',
]);

const FORGE_MODE_GUIDANCE: Record<ForgeWorldRequest['mode'], string> = {
  full_world:
    'MODE: FULL_WORLD. Take the player’s inspirationPrompt as your creative seed and build a deeply cohesive, original RPG universe inspired faithfully by what they wrote. Pick the best matching primaryTheme from the 5 allowed values, up to 2 evocative extraGenres, tone, memorable title, era, compelling premise (2-3 sentences), rich world history (3-5 sentences), concrete worldLaws with stakes/cost, 3 distinct conflicting factions, a permanent Game Master creativePrompt (2-4 sentences distilling their motifs, tone, and secrets to honor across chapters), and a bespoke protagonist.',
  refine_lore:
    'MODE: REFINE_LORE. Elevate and expand the existingWorld fields using inspirationPrompt (if provided) without erasing the user’s core identity. Deepen the world history, clarify concrete worldLaws, polish the title/premise, upgrade creativePrompt into an evocative Game Master compass, and deliver 3 sharp conflicting factions.',
  protagonist_only:
    'MODE: PROTAGONIST_ONLY. Design a memorable, mechanically evocative protagonist (name, age, occupation, 3 distinctive traits, 3 practical RPG skills, and 1 thematic starterItem with a narrative hook note) tailored to existingWorld and the character inspirationPrompt. Mirror the existingWorld values into the remaining world fields.',
  surprise_me:
    'MODE: SURPRISE_ME. Conjure an unforgettable, non-cliché original RPG universe (leaning toward preferredTheme if given, or choosing freely) with high narrative intrigue, vivid factions, a gripping permanent creativePrompt, and an intriguing protagonist ready for Chapter I.',
};

type RawForgedBlueprint = Omit<ForgedWorldBlueprint, 'engineUsed'>;

export async function generateForgedWorld(
  apiKey: string,
  model: 'gemini-3.8-flash' | 'gemini-4-argon',
  req: ForgeWorldRequest,
): Promise<ForgedWorldBlueprint> {
  const client = new GoogleGenAI({ apiKey });
  const fallbackTheme: WorldThemeId =
    req.preferredTheme && VALID_THEMES.has(req.preferredTheme)
      ? req.preferredTheme
      : 'fantasy';

  const systemInstruction = [
    'You are the MYTHOS World Architect, a master tabletop & literary RPG designer.',
    LANGUAGE_DIRECTIVE[req.language],
    req.matureMode === false
      ? 'Tone rating: PG-13 dramatic adventure.'
      : 'Mature 18+ thematic depth allowed: moral ambiguity, political tension, survival stakes, and dark atmosphere without gratuitous gore.',
    FORGE_MODE_GUIDANCE[req.mode],
    'Never return empty strings. Always invent vivid, playable proper nouns, secrets, and hooks.',
  ].join('\n');

  const inputPayload = JSON.stringify(
    {
      mode: req.mode,
      inspirationPrompt: req.inspirationPrompt.trim(),
      preferredTheme: fallbackTheme,
      existingWorld: req.existingWorld ?? null,
    },
    null,
    2,
  );

  const interaction = await client.interactions.create({
    model,
    system_instruction: systemInstruction,
    input: `Build the complete JSON blueprint based on this request:\n${inputPayload}`,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: FORGED_WORLD_SCHEMA,
    },
    generation_config: {
      max_output_tokens: 2200,
    },
  });

  const parsed = parseStructuredJson<Partial<RawForgedBlueprint>>(
    interaction.output_text,
  );

  const primaryTheme: WorldThemeId =
    parsed.primaryTheme && VALID_THEMES.has(parsed.primaryTheme)
      ? parsed.primaryTheme
      : fallbackTheme;

  const extraGenres = Array.isArray(parsed.extraGenres)
    ? parsed.extraGenres
        .map((g) => String(g).trim())
        .filter(Boolean)
        .slice(0, 2)
    : [];

  const factions = Array.isArray(parsed.factions)
    ? parsed.factions
        .filter((f) => f && String(f.name || '').trim())
        .slice(0, 4)
        .map((f) => ({
          name: String(f.name).trim(),
          description: String(f.description || '').trim() || 'Força em disputa neste universo.',
          standing: VALID_STANDINGS.has(f.standing as FactionStanding)
            ? (f.standing as FactionStanding)
            : 'neutral',
          influence: String(f.influence || 'Regional').trim(),
        }))
    : [];

  const rawProtag = parsed.protagonist;
  const protagonist = rawProtag
    ? {
        name: String(rawProtag.name || '').trim() || 'Kaelen Thorne',
        age: Math.max(16, Math.min(999, Math.round(Number(rawProtag.age) || 28))),
        occupation: String(rawProtag.occupation || '').trim() || 'Viajante',
        traits: Array.isArray(rawProtag.traits)
          ? rawProtag.traits.map((t) => String(t).trim()).filter(Boolean).slice(0, 4)
          : [],
        skills: Array.isArray(rawProtag.skills)
          ? rawProtag.skills.map((s) => String(s).trim()).filter(Boolean).slice(0, 4)
          : [],
        starterItem: {
          name: String(rawProtag.starterItem?.name || '').trim() || 'Relíquia Velada',
          category: VALID_ITEM_CATEGORIES.has(
            rawProtag.starterItem?.category as ItemCategory,
          )
            ? (rawProtag.starterItem.category as ItemCategory)
            : 'relic',
          note:
            String(rawProtag.starterItem?.note || '').trim() ||
            'Um vestígio ligado à sua origem neste mundo.',
        },
      }
    : undefined;

  return {
    primaryTheme,
    extraGenres,
    tone: String(parsed.tone || req.existingWorld?.tone || 'Sombrio & Épico').trim(),
    title:
      String(parsed.title || req.existingWorld?.title || 'Crônica Sem Nome').trim(),
    era: String(parsed.era || req.existingWorld?.era || 'Era Desconhecida').trim(),
    premise:
      String(
        parsed.premise || req.existingWorld?.premise || req.inspirationPrompt || '',
      ).trim(),
    history:
      String(
        parsed.history || req.existingWorld?.history || req.inspirationPrompt || '',
      ).trim(),
    worldLaws:
      String(parsed.worldLaws || req.existingWorld?.worldLaws || '').trim(),
    creativePrompt:
      String(
        parsed.creativePrompt ||
          req.existingWorld?.creativePrompt ||
          req.inspirationPrompt ||
          '',
      ).trim(),
    factions,
    protagonist,
    engineUsed: 'gemini',
  };
}
