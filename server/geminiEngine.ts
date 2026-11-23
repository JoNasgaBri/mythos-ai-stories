import { GoogleGenAI } from '@google/genai';
import {
  formatModifier,
  getAttributeModifier,
  getEffectiveAttributes,
} from '../src/engine/rpgSystem.js';
import type {
  AiNarrationPreferences,
  Campaign,
  CraftRequest,
  CraftResponse,
  DiceRollResult,
  EpilogueResponse,
  EquipSlot,
  FactionStanding,
  ForgeWorldRequest,
  ForgedWorldBlueprint,
  IllustrationKind,
  IllustrationResponse,
  ItemCategory,
  ItemRarity,
  JournalSummaryResponse,
  LanguageId,
  NarrativePerspective,
  NarrativeStyle,
  ResponseLength,
  RumorUrgency,
  SpeechResponse,
  StoryPace,
  StoryTurnResponse,
  WorldRumorsResponse,
  WorldThemeId,
} from '../src/types/game.js';

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
        'Rich multi-paragraph narration separated by blank lines (\\n\\n), advancing the story based on player action and dice outcome while faithfully obeying the requested Response Length, Narrative Style, Perspective, and Custom AI Instructions. Never compress into a single brief paragraph when 2+ paragraphs are requested. Do not repeat options at the end.',
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
          requiresRoll: {
            type: 'boolean',
            description:
              'True ONLY when the action involves real danger, combat, sneaking past active threats, hacking/lockpicking, risky physical/magic feats, or high-stakes deception/intimidation. False for normal dialogue, walking, resting, or routine observation.',
          },
          rollSkillHint: {
            type: 'string',
            description:
              'Optional 1-2 word label for what is being tested when requiresRoll is true (e.g. Combate, Furtividade, Blefe, Sobrevivência).',
          },
          attribute: {
            type: 'string',
            enum: ['str', 'dex', 'con', 'int', 'wis', 'cha'],
            description: 'BG3 primary attribute most relevant to this choice.',
          },
          effectTag: {
            type: 'string',
            description:
              'Short 1-2 word tag showing what this choice impacts (e.g. Vínculo, Romance, Treino, Dungeon, Recursos, Pista, Combate, Explorar).',
          },
          unlockHint: {
            type: 'string',
            description:
              'Optional short badge when a player skill, talent, item, or bond makes this option shine (e.g. Tiro Prático Nv.2, CAR +3).',
          },
        },
        required: ['label', 'intent', 'risk', 'requiresRoll'],
      },
    },
    stateChanges: {
      type: 'object',
      properties: {
        vigorDelta: { type: 'integer', description: 'Change to vigor (-30 to +25, 0 if unchanged).' },
        tensionDelta: { type: 'integer', description: 'Change to tension (-60 to +25, 0 if unchanged).' },
        xpGain: {
          type: 'integer',
          description: 'XP rewarded for overcoming challenges, training, discoveries, or key story beats (0-120).',
        },
        inspirationGain: {
          type: 'integer',
          description: 'Award 1 BG3 Inspiration point (0 or 1) on standout roleplay, clever preparation, or heroic beats.',
        },
        currencyDelta: {
          type: 'integer',
          description: 'Positive or negative change to the player’s money/resources (e.g. +20000 for loan, -350 for supplies).',
        },
        currencyLabel: {
          type: 'string',
          description: 'Optional currency unit override matching the world (e.g. USD, Ouro, Créditos).',
        },
        updateIdentity: {
          type: 'object',
          description: 'Use in Freeform Session Zero or when character/world identity is first established or renamed by the player.',
          properties: {
            name: { type: 'string' },
            age: { type: 'integer' },
            occupation: { type: 'string' },
            worldTitle: { type: 'string' },
            worldEra: { type: 'string' },
            worldPremise: { type: 'string' },
          },
        },
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
              rarity: {
                type: 'string',
                enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
              },
              equipSlot: {
                type: 'string',
                enum: ['weapon', 'offhand', 'head', 'armor', 'accessory', 'utility'],
              },
              storage: {
                type: 'string',
                enum: ['carry', 'base', 'vehicle'],
                description: 'Where this item belongs: "carry" (pocket/backpack on protagonist), "base" (heavy crates, stockpiles, generators, stored spares at refuge), or "vehicle" (trunk/cargo).',
              },
              bonuses: {
                type: 'object',
                properties: {
                  str: { type: 'integer' },
                  dex: { type: 'integer' },
                  con: { type: 'integer' },
                  int: { type: 'integer' },
                  wis: { type: 'integer' },
                  cha: { type: 'integer' },
                  maxVigor: { type: 'integer' },
                },
              },
            },
            required: ['name'],
          },
        },
        removeItems: {
          type: 'array',
          items: { type: 'string' },
        },
        supplyDeltas: {
          type: 'object',
          description: 'Track bulk strategic base supplies separately from individual pocket items (ammo, fuel, food, meds, materials).',
          properties: {
            ammo: { type: 'integer' },
            fuel: { type: 'integer' },
            food: { type: 'integer' },
            meds: { type: 'integer' },
            materials: { type: 'integer' },
          },
        },
        upsertVehicle: {
          type: 'object',
          description: 'Register or update a vehicle or mount (car, truck, boat, horse, ship) in the player’s Garage/Fleet instead of stuffing it into the backpack.',
          properties: {
            name: { type: 'string' },
            kind: { type: 'string' },
            fuelDelta: { type: 'integer' },
            conditionDelta: { type: 'integer' },
            note: { type: 'string' },
          },
          required: ['name'],
        },
        addTraits: {
          type: 'array',
          items: { type: 'string' },
        },
        addSkills: {
          type: 'array',
          items: { type: 'string' },
        },
        skillTraining: {
          type: 'array',
          description: 'Award skill training progress or create/level up skills when the player trains, studies, or practices something.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              attribute: {
                type: 'string',
                enum: ['str', 'dex', 'con', 'int', 'wis', 'cha'],
              },
              xpGain: { type: 'integer', description: 'Skill mastery progress 20-100.' },
              levelUp: { type: 'boolean', description: 'True on a major training breakthrough.' },
            },
            required: ['name'],
          },
        },
        addTalents: {
          type: 'array',
          description: 'Unlock a memorable passive Talent / Feat on rare defining achievements or training milestones.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
            },
            required: ['name', 'description'],
          },
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
          description:
            'Register or update notable NPCs, party companions, friendships, romance, or rivalries — including biometrics, appearance, personality, mood, BG3 attributes, skills, traits, likes/dislikes, and memorable bond moments.',
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
              affinityDelta: {
                type: 'integer',
                description: 'Bond/affinity shift (-30 to +30) based on player words and actions.',
              },
              relationship: {
                type: 'string',
                enum: ['stranger', 'acquaintance', 'friend', 'close', 'romance', 'partner', 'rival', 'enemy'],
              },
              assistAttribute: {
                type: 'string',
                enum: ['str', 'dex', 'con', 'int', 'wis', 'cha'],
                description: 'Best BG3 attribute this NPC helps with if invited to the player’s Party.',
              },
              assistSpecialty: {
                type: 'string',
                description: 'Short specialty label (e.g. Medicina, Negociação, Tiro, Magia).',
              },
              age: {
                type: 'integer',
                description: 'Character age in years when known or established.',
              },
              height: {
                type: 'string',
                description: 'Character height (e.g. "1,90m", "1,72m") when known or described.',
              },
              appearance: {
                type: 'string',
                description: 'Concise visual appearance description (hair, eyes, build, typical outfit).',
              },
              personality: {
                type: 'string',
                description: 'Core temperament, voice, values, and behavioral quirks.',
              },
              currentMood: {
                type: 'string',
                description: 'Short 1-3 word emotional state right now (e.g. "Carinhosa", "Em alerta", "Divertida").',
              },
              skills: {
                type: 'array',
                items: { type: 'string' },
                description: 'Concrete abilities or proficiencies this NPC possesses.',
              },
              traits: {
                type: 'array',
                items: { type: 'string' },
                description: 'Short personality or physical traits (e.g. "Protetora", "Atleta", "Sarcástica").',
              },
              likes: {
                type: 'array',
                items: { type: 'string' },
                description: 'Things, gestures, or gifts this NPC loves.',
              },
              dislikes: {
                type: 'array',
                items: { type: 'string' },
                description: 'Things this NPC dislikes or disapproves of.',
              },
              attributes: {
                type: 'object',
                description: 'Optional BG3 6-stat block (8-20) reflecting this companion’s build.',
                properties: {
                  str: { type: 'integer' },
                  dex: { type: 'integer' },
                  con: { type: 'integer' },
                  int: { type: 'integer' },
                  wis: { type: 'integer' },
                  cha: { type: 'integer' },
                },
              },
              bondMemory: {
                type: 'string',
                description: 'Optional 1-sentence memorable moment shared with the protagonist to log in their Bond Diary.',
              },
              notes: { type: 'string' },
            },
            required: ['name'],
          },
        },
        companionReactions: {
          type: 'array',
          description: 'Live BG3-style reactions from active party companions when the player’s choice pleases or displeases them.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              approved: { type: 'boolean' },
              reason: { type: 'string' },
            },
            required: ['name', 'approved'],
          },
        },
        advanceTime: {
          type: 'object',
          description: 'Advance the realistic HH:MM world clock based on how long the player’s action actually took (e.g. 5-15 min for dialogue, 30-180 min for travel/shopping/training), optionally update weather, or set/decrement a countdown.',
          properties: {
            minutes: {
              type: 'integer',
              description: 'Realistic elapsed minutes for this turn (e.g. 5, 10, 15, 30, 60, 120).',
            },
            periods: { type: 'integer', description: 'Optional legacy multi-hour jump (each period = 3 hours).' },
            weather: { type: 'string' },
            weatherType: {
              type: 'string',
              enum: ['clear', 'cloudy', 'rain', 'storm', 'fog', 'heatwave', 'snow', 'ash'],
              description: 'Structured weather state when the weather shifts naturally.',
            },
            countdownDelta: { type: 'integer' },
            setCountdown: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                daysLeft: { type: 'integer' },
              },
              required: ['label', 'daysLeft'],
            },
          },
        },
        addBaseUpgrade: {
          type: 'object',
          description: 'Record a custom refuge/stronghold fortification or facility built through narration.',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            bonus: { type: 'string' },
          },
          required: ['name', 'description', 'bonus'],
        },
        discoverLocation: {
          type: 'object',
          description: 'Register or update the current location, dungeon, safehouse, market, or secret place.',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            danger: {
              type: 'string',
              enum: ['safe', 'tense', 'hostile'],
            },
            kind: {
              type: 'string',
              enum: ['city', 'safehouse', 'dungeon', 'secret', 'market', 'wilderness'],
            },
            status: {
              type: 'string',
              enum: ['unexplored', 'explored', 'cleared'],
            },
            recommendedLevel: { type: 'integer' },
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
        attributes: {
          type: 'object',
          description: 'Balanced BG3 starting attributes (8-15 each, total roughly 72-75).',
          properties: {
            str: { type: 'integer' },
            dex: { type: 'integer' },
            con: { type: 'integer' },
            int: { type: 'integer' },
            wis: { type: 'integer' },
            cha: { type: 'integer' },
          },
        },
        startingCurrency: {
          type: 'object',
          properties: {
            amount: { type: 'integer' },
            label: { type: 'string' },
          },
        },
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
  short:
    'NARRATION LENGTH (DIRECT · 1-2 PARAGRAPHS): Write 1 to 2 punchy, vivid paragraphs separated by \\n\\n. Keep pacing tight without cutting essential dialogue or scene reactions.',
  normal:
    'NARRATION LENGTH (BALANCED · 2-3 PARAGRAPHS): Write 2 to 3 well-developed, engaging paragraphs separated by \\n\\n, giving clear space to action, natural dialogue, sensory atmosphere, and character reactions.',
  literary:
    'NARRATION LENGTH (LITERARY · 3-4 PARAGRAPHS): Write 3 to 4 rich, immersive paragraphs separated by \\n\\n, with expressive NPC dialogue, emotional subtext, atmospheric detail, and deep narrative consequences.',
  epic:
    'NARRATION LENGTH (EPIC / BOOK-GRADE · 4-6 PARAGRAPHS): Write 4 to 6 expansive, novel-quality paragraphs separated by \\n\\n! Give generous breathing room to full back-and-forth character dialogues, companion reactions, environmental storytelling, tactical preparation, and layered drama. NEVER rush or compress a scene into 1 short paragraph.',
};

const STYLE_DIRECTIVE: Record<NarrativeStyle, string> = {
  balanced:
    'NARRATIVE STYLE: Balanced storytelling — weave vivid scene description, natural spoken dialogue, and concrete RPG consequences in harmony.',
  dialogue:
    'NARRATIVE STYLE: Dialogue & Character-Driven — prioritize rich spoken dialogue with NPCs and companions (using natural quotation/dash dialogue lines), body language, emotional chemistry, banter, and relationship development.',
  cinematic:
    'NARRATIVE STYLE: Cinematic & Atmospheric — write with dramatic framing, lighting, soundscapes, tension, and memorable sensory imagery like a prestige TV series or novel.',
  tactical:
    'NARRATIVE STYLE: Tactical RPG & Simulation — emphasize concrete details, logistics, preparation, finances/resources, environmental opportunities, item usage, skill training, and cause-and-effect stakes.',
};

const PERSPECTIVE_DIRECTIVE: Record<NarrativePerspective, string> = {
  adaptive:
    'NARRATIVE PERSPECTIVE: Adaptive — mirror the player’s own writing voice (if they write in 3rd person like "Jonas faz...", narrate naturally in 3rd person focused on the protagonist; if they write in 1st/2nd person, narrate in immersive 2nd person "Você...").',
  second:
    'NARRATIVE PERSPECTIVE: Always narrate in immersive second person ("Você..." / "You...").',
  third:
    'NARRATIVE PERSPECTIVE: Always narrate in close third person using the protagonist’s name and pronouns.',
};

function resolveGenerationConfig(
  model: 'gemini-3.8-flash' | 'gemini-4-argon',
): {
  max_output_tokens: number;
  thinking_level: 'low' | 'medium';
} {
  if (model === 'gemini-4-argon') {
    return {
      max_output_tokens: 32768,
      thinking_level: 'low',
    };
  }
  // Thinking tokens share the max_output_tokens pool on Gemini 3.8 Flash;
  // keeping thinking_level="low" with a generous 16k ceiling prevents JSON truncation
  // and keeps mobile/web turns fast and affordable.
  return {
    max_output_tokens: 16384,
    thinking_level: 'low',
  };
}

const PACE_DIRECTIVE: Record<StoryPace, string> = {
  epic: 'Campaign Pace: LONG EPIC CHRONICLE. Develop slow-burn intrigue, regional cultures, recurring subplots, and lasting consequences across multiple books/arcs. NEVER rush toward a premature ending.',
  endless: 'Campaign Pace: ENDLESS LIVING SANDBOX. Keep opening new horizons, mysteries, rumors, and quests so the story can span hundreds of turns organically.',
  focused: 'Campaign Pace: FOCUSED ARC. Maintain steady dramatic momentum around the central conflict.',
};

function sanitizeControlCharsInJsonStrings(input: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
      } else if (ch === '\\') {
        out += ch;
        escaped = true;
      } else if (ch === '"') {
        out += ch;
        inString = false;
      } else if (ch === '\n') {
        out += '\\n';
      } else if (ch === '\r') {
        out += '\\r';
      } else if (ch === '\t') {
        out += '\\t';
      } else {
        out += ch;
      }
    } else {
      if (ch === '"') inString = true;
      out += ch;
    }
  }
  return out;
}

function repairTruncatedJson(input: string): string {
  let text = sanitizeControlCharsInJsonStrings(input).trim();
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
    } else {
      if (ch === '"') inString = true;
      else if (ch === '{') stack.push('}');
      else if (ch === '[') stack.push(']');
      else if (ch === '}' || ch === ']') stack.pop();
    }
  }

  if (inString) {
    if (escaped) text = text.slice(0, -1);
    text += '"';
  }
  // Strip trailing dangling comma or colon before closing containers
  text = text.replace(/[,:\s]+$/, '');
  while (stack.length > 0) {
    text += stack.pop();
  }
  return text;
}

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

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // 1) Try sanitizing literal newlines/control chars inside JSON strings
    const sanitized = sanitizeControlCharsInJsonStrings(cleaned);
    try {
      return JSON.parse(sanitized) as T;
    } catch {
      // 2) Extract outermost JSON object if wrapped by stray text
      const firstBrace = sanitized.indexOf('{');
      const lastBrace = sanitized.lastIndexOf('}');
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        const sliced = sanitized.slice(firstBrace, lastBrace + 1);
        try {
          return JSON.parse(sliced) as T;
        } catch {
          // fall through to truncation repair
        }
      }

      // 3) Last-resort repair for truncated JSON output
      if (firstBrace >= 0) {
        const repaired = repairTruncatedJson(sanitized.slice(firstBrace));
        return JSON.parse(repaired) as T;
      }

      throw new Error(
        'Resposta JSON incompleta da IA. Tente novamente — seu texto foi preservado.',
      );
    }
  }
}

function buildSystemInstruction(
  campaign: Campaign,
  length: ResponseLength,
  narrationPrefs?: Partial<AiNarrationPreferences>,
): string {
  const matureNote = campaign.world.matureMode
    ? 'Mature storytelling (18+) is enabled: allow gritty moral dilemmas, dark consequences, psychological tension, and raw drama without gratuitous explicit content.'
    : 'Keep content PG-13: dramatic tension and peril without graphic gore or explicit mature themes.';

  const style: NarrativeStyle = narrationPrefs?.narrativeStyle ?? 'balanced';
  const perspective: NarrativePerspective =
    narrationPrefs?.narrativePerspective ?? 'adaptive';
  const customInstructions = narrationPrefs?.customAiInstructions?.trim();

  return [
    'You are the MYTHOS Narrative Engine, a collaborative literary co-author and living RPG Game Master.',
    LANGUAGE_DIRECTIVE[campaign.language],
    LENGTH_DIRECTIVE[length] ?? LENGTH_DIRECTIVE.literary,
    STYLE_DIRECTIVE[style] ?? STYLE_DIRECTIVE.balanced,
    PERSPECTIVE_DIRECTIVE[perspective] ?? PERSPECTIVE_DIRECTIVE.adaptive,
    customInstructions
      ? `=== PLAYER'S CUSTOM AI RESPONSE INSTRUCTIONS (FOLLOW STRICTLY) ===\n${customInstructions}`
      : '',
    matureNote,
    '=== CO-AUTHOR & COLLABORATIVE STORYTELLING (HIGHEST PRIORITY) ===',
    '- TRUTH HIERARCHY: #1 The player’s latest input & recent story > #2 User-edited or pinned canon facts > #3 Starting world seed. The initial world prompt is ONLY an opening launchpad — NEVER a rigid prison.',
    '- "YES, AND..." COLLABORATION: Build WITH the player, never against them. Whenever the player introduces characters (e.g. a neighbor, friend, family member), shifts focus, explores relationships, plans finances/prep, changes tone, or adjusts the timeline/setting (e.g. "antes do vírus se espalhar", "ainda falta uma semana"), embrace it creatively, expand on their ideas, and NEVER yank the story back to repetitive threats or clichés from the starting seed.',
    '- IMMEDIATE CHARACTER & HOOK INTEGRATION: Every new person, relationship, or goal mentioned by the player MUST appear meaningfully in the narration, be saved via stateChanges.upsertNpcs and stateChanges.addCanonFacts, and drive at least 1-2 of the 3-4 returned choices.',
    '- ADAPT TO PLAYER VOICE & MOOD (NO FORCED COMBAT): Mirror the player’s perspective (1st person, 3rd person, dialogue, or narrative planning). If the scene is calm, emotional, everyday, investigative, or focused on preparation/relationships, let it breathe and develop organically — do NOT inject artificial combat, zombies, barricades, or stealth ambushes where they do not belong.',
    '- PRE-APOCALYPSE / SLOW-BURN RULE: If the story takes place before a catastrophe, keep everyday society running (open banks, normal neighbors, daily streets, subtle rumors) until the story naturally advances there.',
    '=== LIVING WORLD SEED (STARTING BACKDROP — NEVER A CAGE) ===',
    `World Title: ${campaign.world.title}`,
    `Era / Setting: ${campaign.world.era}`,
    `Genres: ${campaign.world.genres.join(', ')}`,
    `Tone: ${campaign.world.tone}`,
    `World History: ${campaign.world.history}`,
    `World Laws (Magic / Tech / Survival Rules): ${campaign.world.worldLaws}`,
    `Starting Premise: ${campaign.world.premise}`,
    campaign.world.creativePrompt?.trim()
      ? `Author's Creative Inspiration & Prompt Direction (EVOLVE WITH THE PLAYER): ${campaign.world.creativePrompt.trim()}`
      : '',
    PACE_DIRECTIVE[campaign.world.storyPace || 'epic'],
    `Current Arc / Book: ${campaign.arcNumber ?? 1}`,
    `Difficulty Mode: ${campaign.difficulty}. CREATIVE & FAITHFUL DIFFICULTY: Match the chosen difficulty faithfully AND creatively within the current scene’s genre/timeline. On easy, offer forgiving openings; on hard/insane/good-luck, make NPCs sharper, finances/supplies tighter, rivals cleverer, and mistakes truly costly — without breaking timeline logic or forcing arbitrary combat.`,
    'BG3 PROGRESSION & INFINITE SANDBOX: Read the protagonist’s BG3 attributes (STR/DEX/CON/INT/WIS/CHA), level, leveled skills, talents, equipped gear, currency, NPC bonds/romance, active party companions, stronghold upgrades, world clock/countdown, and discovered dungeons/locations. Reward progress with xpGain (15-80), training/practice with skillTraining (growing or creating skills!), breakthroughs with addTalents, standout roleplay with inspirationGain: 1, money/trades with currencyDelta, meaningful loot with rarity/equipSlot/bonuses, friendships/romance/rivalry with affinityDelta & relationship, party companion approval/disapproval with companionReactions, time/countdown progression with advanceTime, refuge fortifications with addBaseUpgrade, and new dungeons/markets/safehouses/secrets with discoverLocation.kind & status.',
    'ACTIVE PARTY COMPANIONS & RELATIONSHIPS: If activeParty is non-empty, weave those companions naturally into the scene (their banter, advice, reactions, and teamwork) and emit companionReactions when the player makes a choice they care about. Whenever introducing or interacting closely with a party companion, romance partner, or recurring NPC whose sheet lacks details, populate their age, height, appearance, personality, currentMood, attributes (6 BG3 stats), skills, traits, likes, dislikes, and a concise bondMemory via stateChanges.upsertNpcs. Always honor any player-edited biometrics, height, age, appearance, or skills present in activeParty/knownNpcs without contradicting them.',
    campaign.freeformMode && campaign.turnCount <= 3
      ? 'SESSION ZERO FREEFORM MODE: This story started as an open WebSim-style conversation with no rigid preset. Embrace whatever world, genre mix, era, or character the player describes, populate stateChanges.updateIdentity (name, age, occupation, worldTitle, worldEra, worldPremise), seed initial skillTraining, currencyLabel, items, and NPCs organically, and launch straight into an engaging scene with 4 rich choices!'
      : '',
    'DICE & ACTION DISCIPLINE: Reserve requiresRoll=true (risk: "medium" or "high") strictly for actions with real danger, combat, sneaking past active threats, hacking/lockpicking, risky physical/magic feats, or high-stakes deception/intimidation. Keep ordinary dialogue, walking, planning, resting, and routine observation at risk: "safe" with requiresRoll=false, and include at least 1-2 narrative (requiresRoll=false) choices in non-combat scenes.',
    'MEMORY DISCIPLINE: Honor recent story developments and player-directed changes first; if an older starting-seed fact conflicts with where the player took the story, follow the player’s evolved story. Only emit stateChanges.addCanonFacts (0-2 concise sentences) when a lasting development, new relationship, promise, or revelation occurs.',
    'Keep stateChanges grounded: track NPCs via upsertNpcs, places/dungeons via discoverLocation, and faction shifts via upsertFactions.',
    'Offer 4 engaging, meaningfully distinct story choices rooted in the current scene, people, attributes, and goals — set attribute, effectTag (e.g. Vínculo, Romance, Treino, Dungeon, Recursos, Pista, Combate), and optional unlockHint when a player stat/skill/talent shines.',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildCompactStateContext(campaign: Campaign): string {
  const recentBeats = campaign.entries
    .slice(-14)
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

  const effAttrs = getEffectiveAttributes(campaign.player);

  return JSON.stringify(
    {
      protagonist: {
        name: campaign.player.name,
        age: campaign.player.age,
        occupation: campaign.player.occupation,
        level: campaign.player.level,
        xp: `${campaign.player.xp}/${campaign.player.xpToNextLevel}`,
        attributes: {
          STR: `${effAttrs.str} (${formatModifier(getAttributeModifier(effAttrs.str))})`,
          DEX: `${effAttrs.dex} (${formatModifier(getAttributeModifier(effAttrs.dex))})`,
          CON: `${effAttrs.con} (${formatModifier(getAttributeModifier(effAttrs.con))})`,
          INT: `${effAttrs.int} (${formatModifier(getAttributeModifier(effAttrs.int))})`,
          WIS: `${effAttrs.wis} (${formatModifier(getAttributeModifier(effAttrs.wis))})`,
          CHA: `${effAttrs.cha} (${formatModifier(getAttributeModifier(effAttrs.cha))})`,
        },
        vigor: `${campaign.player.vigor}/${campaign.player.maxVigor}`,
        tension: campaign.player.tension,
        inspiration: `${campaign.player.inspiration ?? 1}/4`,
        currency: `${campaign.player.currency?.amount ?? 0} ${campaign.player.currency?.label ?? 'Ouro'}`,
        traits: campaign.player.traits,
        skillLevels: (campaign.player.skillLevels ?? []).map(
          (s) => `${s.name} (Nv.${s.level}, ${s.attribute.toUpperCase()})`,
        ),
        talents: (campaign.player.talents ?? []).map(
          (t) => `${t.name}: ${t.description}`,
        ),
        equippedGear: campaign.player.inventory
          .filter((i) => i.equipped)
          .map((i) => `${i.name} [${i.equipSlot}]`),
        carryingInBackpack: campaign.player.inventory
          .filter((i) => (i.storage ?? 'carry') === 'carry')
          .map((i) => `${i.name} (x${i.quantity})`),
        storedAtBase: campaign.player.inventory
          .filter((i) => i.storage === 'base')
          .map((i) => `${i.name} (x${i.quantity})`),
        vehicleTrunk: campaign.player.inventory
          .filter((i) => i.storage === 'vehicle')
          .map((i) => `${i.name} (x${i.quantity})`),
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
      worldClock: campaign.worldClock ?? null,
      stronghold: campaign.stronghold
        ? {
            name: campaign.stronghold.name,
            location: campaign.stronghold.location,
            defense: campaign.stronghold.defense,
            upgrades: campaign.stronghold.upgrades.map((u) => `${u.name} (${u.bonus})`),
            supplies: campaign.stronghold.supplies ?? null,
            vehicles: (campaign.stronghold.vehicles ?? []).map(
              (v) => `${v.name} (${v.kind}, fuel ${v.fuel}%, condition ${v.condition}%)`,
            ),
          }
        : null,
      activeParty: campaign.codex.npcs
        .filter((n) => n.inParty && n.status === 'alive')
        .map((n) => ({
          name: n.name,
          role: n.role,
          relationship: n.relationship ?? 'friend',
          affinity: n.affinity ?? 0,
          age: n.age ?? null,
          height: n.height ?? null,
          appearance: n.appearance ?? null,
          personality: n.personality ?? null,
          currentMood: n.currentMood ?? null,
          level: n.level ?? campaign.player.level,
          vigor: `${n.vigor ?? 100}/${n.maxVigor ?? 100}`,
          attributes: n.attributes ?? null,
          assistAttribute: n.assistAttribute ?? 'wis',
          assistSpecialty: n.assistSpecialty || n.role,
          skills: (n.skills ?? []).slice(0, 6),
          traits: (n.traits ?? []).slice(0, 6),
          likes: (n.likes ?? []).slice(0, 4),
          dislikes: (n.dislikes ?? []).slice(0, 4),
        })),
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
        relationship: n.relationship ?? 'stranger',
        affinity: n.affinity ?? 0,
        status: n.status,
        age: n.age ?? null,
        height: n.height ?? null,
        currentMood: n.currentMood ?? null,
        personality: n.personality ?? null,
        skills: (n.skills ?? []).slice(0, 4),
        lastSeenLocation: n.lastSeenLocation,
        notes: n.notes,
      })),
      knownLocations: campaign.codex.locations.slice(0, 12).map((l) => ({
        name: l.name,
        kind: l.kind ?? 'city',
        status: l.status ?? 'explored',
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
  narrationPrefs?: Partial<AiNarrationPreferences>,
): Promise<StoryTurnResponse> {
  const client = new GoogleGenAI({ apiKey });
  const systemInstruction = buildSystemInstruction(
    campaign,
    length,
    narrationPrefs,
  );

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
      ? '4. Directly weave the motifs, tone, and timeline from the Author’s Creative Direction into the worldPrologue, opening scene, NPCs, and starting quest.'
      : '',
    '5. TIMELINE FIDELITY: If the premise, era, history, or creativePrompt states the story begins BEFORE an outbreak/apocalypse/catastrophe (e.g., "uma semana antes", "antes do vírus"), set the entire opening scene strictly in normal everyday life before the collapse with only subtle unsettling hints — NEVER skip forward to ruins, zombies, or barricades.',
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
    generation_config: resolveGenerationConfig(model),
  });

  const parsed = parseStructuredJson<Omit<StoryTurnResponse, 'engineUsed' | 'interactionId'>>(
    interaction.output_text,
  );

  return {
    ...parsed,
    actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    stateChanges: parsed.stateChanges ?? {},
    interactionId: interaction.id,
    engineUsed: 'gemini',
  };
}

const CO_AUTHOR_TURN_PATTERN =
  /^\[DIREÇÃO DO AUTOR\]|\b(antes\s+d[eoa]s?|na\s+verdade|ainda\s+(?:n[aã]o|falta|faltam|tem\s+uma\s+semana)|ele\s+(?:tem|mora|morava|come[cç]a|v[eê]|gosta|gostava|quer|queria)|ela\s+(?:tem|mora|morava|come[cç]a|v[eê])|o\s+mundo\s+ainda)\b/i;

export async function generateStoryTurn(
  apiKey: string,
  model: 'gemini-3.8-flash' | 'gemini-4-argon',
  campaign: Campaign,
  playerAction: string,
  diceRoll: DiceRollResult | undefined,
  length: ResponseLength,
  crisisMode?: 'survival_test' | 'breaking_point',
  narrationPrefs?: Partial<AiNarrationPreferences>,
): Promise<StoryTurnResponse> {
  const client = new GoogleGenAI({ apiKey });
  const systemInstruction = buildSystemInstruction(
    campaign,
    length,
    narrationPrefs,
  );

  const rollInstruction = diceRoll
    ? `DETERMINISTIC FATE ROLL: d20=${diceRoll.roll}${diceRoll.rolls ? ` (rolled ${diceRoll.rolls[0]} & ${diceRoll.rolls[1]} with ${diceRoll.rollMode}${diceRoll.advantageSource ? ` from ${diceRoll.advantageSource}` : ''})` : ''}${diceRoll.rerolledWithInspiration ? ' [REROLLED WITH BG3 INSPIRATION]' : ''}, total_bonus=${diceRoll.bonus >= 0 ? '+' : ''}${diceRoll.bonus}${diceRoll.bonusSource ? ` (${diceRoll.bonusSource})` : ''}, total=${diceRoll.total} vs DC=${diceRoll.dc} => OUTCOME: ${diceRoll.outcome.toUpperCase()}. Narrate consequences strictly matching this outcome${diceRoll.advantageSource ? ` and highlight how ${diceRoll.advantageSource} assisted!` : '.'}`
    : 'NARRATIVE FLOW (NO DICE ROLL): This action or dialogue needs no dice check. Resolve it fluidly, naturally, and responsively based on the fiction, character traits, and NPC personalities — never invent an arbitrary roll failure.';

  const isCoAuthorDirection = CO_AUTHOR_TURN_PATTERN.test(playerAction.trim());
  const directionDirective = isCoAuthorDirection
    ? 'CO-AUTHOR DIRECTION / TIMELINE SHIFT: The player is actively directing the story, timeline, or introducing characters. Honor every detail they wrote immediately as authoritative canon, transition smoothly to the time/place they specified (discarding any conflicting premature threat from earlier turns), upsert any mentioned people into stateChanges.upsertNpcs, record the timeline truth in stateChanges.addCanonFacts, and offer 3-4 fresh choices directly tied to their new setup.'
    : '';

  const crisisDirective =
    crisisMode === 'survival_test'
      ? 'LAST STAND SURVIVAL CHECK: The protagonist reached 0 Vigor and just fought back from the brink of collapse! Narrate a harrowing, costly escape with permanent scars.'
      : crisisMode === 'breaking_point'
        ? 'BREAKING POINT CLIMAX (Tension 100%): Tension has boiled over! Trigger a dramatic confrontation, ambush, or revelation right now, and set tensionDelta around -50 to reset the scene pressure afterward.'
        : '';

  const fullContextPrompt = [
    'FULL CAMPAIGN MEMORY CORE (INCLUDES USER-PINNED CANON FACTS & WORLD LORE):',
    buildCompactStateContext(campaign),
    '',
    `PLAYER INPUT: "${playerAction}"`,
    rollInstruction,
    directionDirective,
    crisisDirective,
  ]
    .filter(Boolean)
    .join('\n');

  const interaction = await client.interactions.create({
    model,
    system_instruction: systemInstruction,
    input: fullContextPrompt,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: TURN_RESPONSE_SCHEMA,
    },
    generation_config: resolveGenerationConfig(model),
  });

  const parsed = parseStructuredJson<Omit<StoryTurnResponse, 'engineUsed' | 'interactionId'>>(
    interaction.output_text,
  );

  return {
    ...parsed,
    actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    stateChanges: parsed.stateChanges ?? {},
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
    'LIVING WORLD PULSE (a quiet ambient beat passes in the current scene).',
    buildCompactStateContext(campaign),
    'STRICT TIMELINE & ATMOSPHERE RULE: Match the exact current timeline and permanentCanonFacts of this scene. If the disaster/outbreak has NOT happened yet or tension is below 45, write ONLY a grounded everyday atmospheric detail, radio murmur, or neighbor/city moment consistent with normal life and subtle foreboding — NEVER introduce zombies, barricades, gunfire, or infection symptoms unless already established on screen. Preserve or refresh 3-4 concrete actions fitting the current moment.',
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
      max_output_tokens: 4096,
      thinking_level: 'minimal',
    },
  });

  const parsed = parseStructuredJson<Omit<StoryTurnResponse, 'engineUsed' | 'interactionId'>>(
    interaction.output_text,
  );

  return {
    ...parsed,
    actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    stateChanges: parsed.stateChanges ?? {},
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
      max_output_tokens: 4096,
      thinking_level: 'minimal',
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
    generation_config: resolveGenerationConfig(model),
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
  equippedItems?: string[];
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
        params.equippedItems?.length
          ? `Visibly wearing/carrying equipped gear: ${params.equippedItems.join(', ')}.`
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

const TTS_VOICE_BY_THEME: Record<
  WorldThemeId,
  { voice: string; dialogueVoice: string; style: string; dialogueStyle: string }
> = {
  fantasy: {
    voice: 'Charon',
    dialogueVoice: 'Aoede',
    style: 'Warm, atmospheric dark-fantasy audiobook narrator with steady dramatic pacing.',
    dialogueStyle: 'Expressive character voice acting with natural emotional inflection.',
  },
  cyberpunk: {
    voice: 'Fenrir',
    dialogueVoice: 'Kore',
    style: 'Cool, sharp neo-noir sci-fi narrator with subtle midnight tension.',
    dialogueStyle: 'Crisp, grounded character dialogue with urban attitude.',
  },
  mystery: {
    voice: 'Orus',
    dialogueVoice: 'Aoede',
    style: 'Measured, classic noir detective storyteller with intriguing pauses.',
    dialogueStyle: 'Intimate, nuanced character voice with subtle suspense.',
  },
  zombies: {
    voice: 'Puck',
    dialogueVoice: 'Kore',
    style: 'Grounded, urgent survival thriller narrator with crisp clarity.',
    dialogueStyle: 'Natural, emotionally present character dialogue.',
  },
  apocalyptic: {
    voice: 'Charon',
    dialogueVoice: 'Aoede',
    style: 'Gravelly, contemplative wasteland chronicler with resonant weight.',
    dialogueStyle: 'Human, warm, determined character voice.',
  },
};

const TTS_LANG_CODE: Record<LanguageId, string> = {
  'pt-BR': 'pt-BR',
  en: 'en-US',
  fr: 'fr-FR',
};

interface SpeechSegment {
  speaker: 'Narrator' | 'Character';
  text: string;
}

function splitAudiobookSegments(input: string): SpeechSegment[] {
  // Split narration vs quoted dialogue ("...", “...”, «...»)
  const regex = /(["“«][^"”»]{6,420}["”»])/g;
  const parts = input.split(regex).filter((p) => p.trim().length > 0);
  const segments: SpeechSegment[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const isQuote =
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith('“') && trimmed.endsWith('”')) ||
      (trimmed.startsWith('«') && trimmed.endsWith('»'));
    const cleanChunk = isQuote ? trimmed.slice(1, -1).trim() : trimmed;
    if (!cleanChunk) continue;

    const speaker: 'Narrator' | 'Character' = isQuote ? 'Character' : 'Narrator';
    const prev = segments[segments.length - 1];
    if (prev && prev.speaker === speaker) {
      prev.text = `${prev.text} ${cleanChunk}`;
    } else {
      segments.push({ speaker, text: cleanChunk });
    }
  }
  return segments;
}

export async function generateSceneSpeech(
  apiKey: string,
  text: string,
  language: LanguageId,
  theme: WorldThemeId,
): Promise<SpeechResponse> {
  const cleanText = text.replace(/\s+/g, ' ').trim().slice(0, 2600);
  if (!cleanText) {
    throw new Error('No narration text provided for speech synthesis.');
  }

  const client = new GoogleGenAI({ apiKey });
  const profile = TTS_VOICE_BY_THEME[theme] ?? TTS_VOICE_BY_THEME.fantasy;
  const langCode = TTS_LANG_CODE[language] ?? 'pt-BR';

  const segments = splitAudiobookSegments(cleanText);
  const hasBothSpeakers =
    segments.some((s) => s.speaker === 'Narrator') &&
    segments.some((s) => s.speaker === 'Character');

  // Try Multi-Voice Audiobook mode when scene has both narration and quoted dialogue
  if (hasBothSpeakers && segments.length >= 2 && segments.length <= 24) {
    try {
      const multiInteraction = await client.interactions.create({
        model: 'gemini-3.8-flash-tts',
        input: segments.map((seg) => ({
          type: 'text' as const,
          text: `${seg.speaker}: ${seg.text}`,
          annotations: [
            {
              type: 'speech_metadata' as const,
              speaker: seg.speaker,
              style:
                seg.speaker === 'Narrator'
                  ? profile.style
                  : profile.dialogueStyle,
            },
          ],
        })),
        response_format: {
          type: 'audio',
          mime_type: 'audio/wav',
        },
        generation_config: {
          speech_config: [
            {
              speaker: 'Narrator',
              voice: profile.voice,
              language: langCode,
            },
            {
              speaker: 'Character',
              voice: profile.dialogueVoice,
              language: langCode,
            },
          ],
        },
      });

      const multiAudio = multiInteraction.output_audio;
      if (multiAudio?.data) {
        const mimeType = multiAudio.mime_type || 'audio/wav';
        return {
          dataUrl: `data:${mimeType};base64,${multiAudio.data}`,
          mimeType,
          engineUsed: 'gemini',
        };
      }
    } catch {
      // Seamlessly fall back to crisp single-speaker audiobook narration below
    }
  }

  const interaction = await client.interactions.create({
    model: 'gemini-3.8-flash-tts',
    input: [
      {
        type: 'text',
        text: cleanText,
        annotations: [
          {
            type: 'speech_metadata',
            style: profile.style,
          },
        ],
      },
    ],
    response_format: {
      type: 'audio',
      mime_type: 'audio/wav',
    },
    generation_config: {
      speech_config: [
        {
          voice: profile.voice,
          language: langCode,
        },
      ],
    },
  });

  const audio = interaction.output_audio;
  if (!audio?.data) {
    throw new Error('Gemini 3.8 TTS did not return audio data.');
  }

  const mimeType = audio.mime_type || 'audio/wav';
  return {
    dataUrl: `data:${mimeType};base64,${audio.data}`,
    mimeType,
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
    'TIMELINE FIDELITY: If inspirationPrompt specifies that the story begins BEFORE an outbreak, war, or apocalypse (e.g., "uma semana antes", "antes do vírus"), set era, history, premise, worldLaws, and creativePrompt strictly in the pre-collapse normal world where only subtle rumors or odd news exist.',
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
    generation_config: resolveGenerationConfig(model),
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
        attributes: rawProtag.attributes
          ? {
              str: Math.max(8, Math.min(15, Math.round(Number(rawProtag.attributes.str) || 10))),
              dex: Math.max(8, Math.min(15, Math.round(Number(rawProtag.attributes.dex) || 10))),
              con: Math.max(8, Math.min(15, Math.round(Number(rawProtag.attributes.con) || 10))),
              int: Math.max(8, Math.min(15, Math.round(Number(rawProtag.attributes.int) || 10))),
              wis: Math.max(8, Math.min(15, Math.round(Number(rawProtag.attributes.wis) || 10))),
              cha: Math.max(8, Math.min(15, Math.round(Number(rawProtag.attributes.cha) || 10))),
            }
          : undefined,
        startingCurrency:
          rawProtag.startingCurrency && rawProtag.startingCurrency.label
            ? {
                amount: Math.max(0, Math.round(Number(rawProtag.startingCurrency.amount) || 100)),
                label: String(rawProtag.startingCurrency.label).trim(),
              }
            : undefined,
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

const WORLD_RUMORS_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    channelName: {
      type: 'string',
      description: 'In-world channel or board name (e.g. "Frequência 104.7 FM & Rede Local", "Quadro da Taverna", "Feed Darknet").',
    },
    channelSubtitle: {
      type: 'string',
      description: 'Short evocative status line matching current day, time, and weather.',
    },
    items: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          headline: { type: 'string', description: 'Punchy, atmospheric headline (4-10 words).' },
          source: { type: 'string', description: 'Specific in-world source (radio host, bulletin, mercenary, rumor mill, anonymous post).' },
          body: { type: 'string', description: '2-3 rich sentences detailing the news/rumor, grounded in the current timeline, weather, and world events.' },
          locationHint: { type: 'string', description: 'Relevant place or district mentioned.' },
          urgency: { type: 'string', enum: ['low', 'medium', 'urgent'] },
          hookAction: { type: 'string', description: 'Ready-to-play 1-sentence protagonist action to investigate or follow up on this rumor.' },
          questTitle: { type: 'string', description: 'Short quest title if the player chooses to track/investigate this rumor.' },
        },
        required: ['headline', 'source', 'body', 'urgency', 'hookAction'],
      },
    },
  },
  required: ['channelName', 'channelSubtitle', 'items'],
};

const VALID_URGENCY = new Set<RumorUrgency>(['low', 'medium', 'urgent']);

export async function generateWorldRumors(
  apiKey: string,
  campaign: Campaign,
): Promise<WorldRumorsResponse> {
  const client = new GoogleGenAI({ apiKey });
  const clock = campaign.worldClock;
  const timeStr = clock
    ? `Day ${clock.day}, ${String(clock.hour ?? 8).padStart(2, '0')}:${String(clock.minute ?? 30).padStart(2, '0')} (${clock.weather})`
    : 'Current day';

  const systemInstruction = [
    'You are the MYTHOS Living World Broadcast & Rumor Desk.',
    LANGUAGE_DIRECTIVE[campaign.language],
    'Generate 3 immersive, playable in-world dispatches, news bulletins, intercepted messages, or tavern rumors happening OUTSIDE the protagonist’s window right now.',
    'STRICT TIMELINE FIDELITY: Match the exact era, genre, current day/time/weather, countdown (if any), and recent story canon. If the story is BEFORE a catastrophe/outbreak, keep society running normally with subtle alarming anomalies, supply shortages, rumors, or local opportunities — NEVER prematurely trigger an apocalypse.',
    'Make at least 1 rumor connect to an existing faction, NPC, or location, and 1 rumor offer a concrete opportunity (supplies, trade, secret, alliance, or side-quest).',
  ].join('\n');

  const compact = buildCompactStateContext(campaign);
  const prompt = [
    `World: ${campaign.world.title} (${campaign.world.primaryTheme} / ${campaign.world.era})`,
    `Current Time & Weather: ${timeStr}`,
    clock?.countdown
      ? `Active Countdown: ${clock.countdown.daysLeft} days left — ${clock.countdown.label}`
      : '',
    `Previous Rumors Already Heard (do NOT repeat): ${(campaign.rumors ?? []).slice(0, 6).map((r) => r.headline).join(' | ') || 'None'}`,
    '',
    'WORLD STATE:',
    compact,
  ]
    .filter(Boolean)
    .join('\n');

  const interaction = await client.interactions.create({
    model: 'gemini-3.8-flash',
    system_instruction: systemInstruction,
    input: prompt,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: WORLD_RUMORS_SCHEMA,
    },
    generation_config: {
      max_output_tokens: 4096,
      thinking_level: 'low',
    },
  });

  const parsed = parseStructuredJson<Partial<WorldRumorsResponse>>(
    interaction.output_text,
  );

  const items = Array.isArray(parsed.items)
    ? parsed.items
        .filter((i) => i && String(i.headline || '').trim())
        .slice(0, 3)
        .map((i) => ({
          headline: String(i.headline).trim(),
          source: String(i.source || 'Boletim Local').trim(),
          body: String(i.body || '').trim(),
          locationHint: i.locationHint ? String(i.locationHint).trim() : undefined,
          urgency: VALID_URGENCY.has(i.urgency as RumorUrgency)
            ? (i.urgency as RumorUrgency)
            : 'medium',
          hookAction:
            String(i.hookAction || '').trim() ||
            `Investigar o boato: ${String(i.headline).trim()}`,
          questTitle: i.questTitle ? String(i.questTitle).trim() : undefined,
        }))
    : [];

  return {
    channelName: String(parsed.channelName || 'Rede de Rumores & Boletins').trim(),
    channelSubtitle: String(parsed.channelSubtitle || timeStr).trim(),
    items,
    engineUsed: 'gemini',
  };
}

const CRAFT_UPGRADE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    narrativeLog: {
      type: 'string',
      description: '2-3 vivid sentences describing the hands-on crafting/modification process at the workbench or garage and its tangible result.',
    },
    upgradedItem: {
      type: 'object',
      description: 'Required when targetKind is "item".',
      properties: {
        name: { type: 'string' },
        category: {
          type: 'string',
          enum: ['weapon', 'tool', 'relic', 'consumable', 'clue', 'misc'],
        },
        rarity: {
          type: 'string',
          enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
        },
        note: { type: 'string' },
        equipSlot: {
          type: 'string',
          enum: ['weapon', 'offhand', 'head', 'armor', 'accessory', 'utility'],
        },
        bonuses: {
          type: 'object',
          properties: {
            str: { type: 'integer' },
            dex: { type: 'integer' },
            con: { type: 'integer' },
            int: { type: 'integer' },
            wis: { type: 'integer' },
            cha: { type: 'integer' },
            maxVigor: { type: 'integer' },
          },
        },
      },
      required: ['name', 'category', 'rarity', 'note'],
    },
    upgradedVehicle: {
      type: 'object',
      description: 'Required when targetKind is "vehicle".',
      properties: {
        name: { type: 'string' },
        kind: { type: 'string' },
        conditionGain: { type: 'integer', description: '0 to 40 condition restoration/reinforcement.' },
        fuelGain: { type: 'integer', description: '0 to 25 bonus fuel efficiency/tank gain.' },
        note: { type: 'string' },
      },
      required: ['name', 'kind', 'conditionGain', 'fuelGain', 'note'],
    },
    xpGain: { type: 'integer', description: 'Workshop crafting XP (20-65).' },
  },
  required: ['success', 'narrativeLog', 'xpGain'],
};

const VALID_RARITIES = new Set<ItemRarity>([
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
]);
const VALID_SLOTS = new Set<EquipSlot>([
  'weapon',
  'offhand',
  'head',
  'armor',
  'accessory',
  'utility',
]);

export async function generateCraftUpgrade(
  apiKey: string,
  campaign: Campaign,
  req: CraftRequest,
): Promise<CraftResponse> {
  const client = new GoogleGenAI({ apiKey });
  const targetItem =
    req.targetKind === 'item'
      ? campaign.player.inventory.find((i) => i.id === req.targetId)
      : undefined;
  const targetVehicle =
    req.targetKind === 'vehicle'
      ? (campaign.stronghold?.vehicles ?? []).find((v) => v.id === req.targetId)
      : undefined;
  const secondaryItem = req.secondaryItemId
    ? campaign.player.inventory.find((i) => i.id === req.secondaryItemId)
    : undefined;

  const hasWorkshop = Boolean(
    campaign.stronghold?.upgrades.some((u) => u.id === 'workshop'),
  );

  const systemInstruction = [
    'You are the MYTHOS Master Artificer, Armorer & Mechanic.',
    LANGUAGE_DIRECTIVE[campaign.language],
    'Evaluate the player’s crafting or upgrade project using the selected target item/vehicle, optional secondary component, and Base Materials spent.',
    'Keep results grounded and believable inside this world’s era and laws (e.g., realistic tactical/armor/vehicle mods in modern survival, runic/masterwork forging in fantasy, cyber-mods in sci-fi).',
    'Reward clever combinations with a crisp upgraded name, upgraded rarity (up to +1 or +2 tiers), realistic stat bonuses (+1 to +2 on 1-2 relevant BG3 attributes, or +10 to +20 maxVigor for armor/gear), and a concise vivid narrativeLog.',
    hasWorkshop
      ? 'BONUS: The protagonist has an active Workshop/Oficina at their Base — allow refined, higher-craftsmanship results.'
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const payload = JSON.stringify(
    {
      world: {
        title: campaign.world.title,
        theme: campaign.world.primaryTheme,
        era: campaign.world.era,
        laws: campaign.world.worldLaws,
      },
      protagonist: {
        name: campaign.player.name,
        level: campaign.player.level,
        skills: campaign.player.skillLevels.map((s) => `${s.name} Nv.${s.level}`),
        hasWorkshop,
      },
      project: {
        targetKind: req.targetKind,
        targetItem: targetItem ?? null,
        targetVehicle: targetVehicle ?? null,
        secondaryComponent: secondaryItem ?? null,
        materialsSpent: req.materialsSpent,
        playerIdea: req.blueprintIdea?.trim() || 'Reforçar e aprimorar com os materiais disponíveis.',
      },
    },
    null,
    2,
  );

  const interaction = await client.interactions.create({
    model: 'gemini-3.8-flash',
    system_instruction: systemInstruction,
    input: `Craft and return the upgraded item or vehicle JSON:\n${payload}`,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: CRAFT_UPGRADE_SCHEMA,
    },
    generation_config: {
      max_output_tokens: 4096,
      thinking_level: 'low',
    },
  });

  const parsed = parseStructuredJson<Partial<CraftResponse>>(
    interaction.output_text,
  );

  const rawItem = parsed.upgradedItem;
  const upgradedItem =
    req.targetKind === 'item' && rawItem
      ? {
          name: String(rawItem.name || targetItem?.name || 'Item Aprimorado').trim(),
          category: VALID_ITEM_CATEGORIES.has(rawItem.category as ItemCategory)
            ? (rawItem.category as ItemCategory)
            : targetItem?.category ?? 'tool',
          rarity: VALID_RARITIES.has(rawItem.rarity as ItemRarity)
            ? (rawItem.rarity as ItemRarity)
            : 'rare',
          note: String(rawItem.note || 'Aprimorado na bancada da base.').trim(),
          equipSlot: VALID_SLOTS.has(rawItem.equipSlot as EquipSlot)
            ? (rawItem.equipSlot as EquipSlot)
            : targetItem?.equipSlot,
          bonuses: rawItem.bonuses,
        }
      : undefined;

  const rawVeh = parsed.upgradedVehicle;
  const upgradedVehicle =
    req.targetKind === 'vehicle' && rawVeh
      ? {
          name: String(rawVeh.name || targetVehicle?.name || 'Veículo Reforçado').trim(),
          kind: String(rawVeh.kind || targetVehicle?.kind || 'Veículo').trim(),
          conditionGain: Math.max(
            0,
            Math.min(45, Math.round(Number(rawVeh.conditionGain) || 15)),
          ),
          fuelGain: Math.max(
            0,
            Math.min(25, Math.round(Number(rawVeh.fuelGain) || 0)),
          ),
          note: String(rawVeh.note || 'Blindagem e sistemas reforçados na oficina.').trim(),
        }
      : undefined;

  return {
    success: parsed.success !== false,
    narrativeLog:
      String(parsed.narrativeLog || '').trim() ||
      'Horas de trabalho preciso na bancada transformaram o equipamento em uma peça muito superior.',
    upgradedItem,
    upgradedVehicle,
    xpGain: Math.max(15, Math.min(75, Math.round(Number(parsed.xpGain) || 35))),
    engineUsed: 'gemini',
  };
}
