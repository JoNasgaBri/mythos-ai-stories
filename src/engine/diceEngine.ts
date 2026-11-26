import { DND_CONDITIONS, DND_SKILLS } from '../data/dnd52Catalog';
import {
  computeArmorClass,
  computeSavingThrowModifier,
  computeSkillModifier,
  getThemedSkillLabel,
} from './dnd52Rules';
import {
  defaultNpcAttributes,
  getAttributeModifier,
  getProficiencyBonus,
  getWeatherRollModifier,
} from './rpgSystem';
import type {
  ActionIntent,
  ActionRisk,
  AttributeId,
  CharacterAttributes,
  CommandInputMode,
  DiceOutcome,
  DiceRollPolicy,
  DiceRollResult,
  DifficultyId,
  DndSkillId,
  DndTestKind,
  LanguageId,
  NpcRecord,
  PlayerState,
  RollMode,
  RulesetId,
  SkillProgress,
  TacticalAction,
  WeatherType,
  WorldThemeId,
} from '../types/game';

export function findPartyAdvantage(
  attribute: AttributeId,
  npcs: NpcRecord[] | undefined,
  excludeNpcId?: string,
): NpcRecord | undefined {
  if (!Array.isArray(npcs)) return undefined;
  return npcs.find(
    (n) =>
      n.inParty &&
      n.status === 'alive' &&
      n.id !== excludeNpcId &&
      n.assistAttribute === attribute,
  );
}

export function parseHeightCm(raw?: string): number | null {
  if (!raw) return null;
  const normalized = raw.replace(',', '.').toLowerCase().trim();
  const cmMatch = normalized.match(/(\d{3})\s*cm/);
  if (cmMatch) return Number(cmMatch[1]);
  const mMatch = normalized.match(/(\d\.\d{1,2})\s*m?/);
  if (mMatch) {
    const val = Number(mMatch[1]);
    if (val >= 1.2 && val <= 2.5) return Math.round(val * 100);
  }
  return null;
}

const UNARMED_CONTEST_PATTERN =
  /\b(tatame|lute\s+comigo|lutar\s+comigo|sparring|grappling|imobiliz|chave\s+de|queda\s+de\s+bra[cç]o|m[aã]os\s+limpas|desarmad|sem\s+armas|luta\s+livre|wrestle|unarmed|spar)\b/i;

export function isUnarmedContest(actionText: string): boolean {
  return UNARMED_CONTEST_PATTERN.test(actionText);
}

const SPOKEN_PROPOSAL_PATTERN =
  /^(?:ent[aã]o\s+)?(?:falo|digo|pergunto|proponho|sugiro|provoco|brinco|pe[cç]o)\b/i;
const PROPOSAL_QUESTION_CUE =
  /\b(topa|aceita|vamos|quer\s+lutar|quem\s+vencer|valendo|aposta)\b.*\?$/i;

const CONTEST_VERB_PATTERN =
  /\b(lut|enfrent|derrub|imobiliz|vencer|ganhar\s+d|contra\s+|desafi|queda\s+de\s+bra[cç]o|sparring|grappling|empurr|segur|blef|mentir|intimid|convenc|fight|wrestle|spar|pin|beat)\b/i;

const DIRECT_COMPANION_CONTEST_PATTERN =
  /\b(lute\s+comigo|lutar\s+comigo|contra\s+ela|contra\s+ele|imobiliz[aá]-l[ao]|derrub[aá]-l[ao]|vencer\s+ela|vencer\s+ele|no\s+tatame|sparring|grappling|queda\s+de\s+bra[cç]o)\b/i;

export function detectOpposedNpc(
  actionText: string,
  npcs: NpcRecord[] | undefined,
): NpcRecord | undefined {
  if (!Array.isArray(npcs) || npcs.length === 0) return undefined;
  const text = actionText.trim();
  if (!text || !CONTEST_VERB_PATTERN.test(text)) return undefined;
  const lower = text.toLowerCase();

  // 1) Explicit mention of a known alive NPC by full name or first name
  for (const npc of npcs) {
    if (npc.status !== 'alive') continue;
    const full = npc.name.trim().toLowerCase();
    const first = full.split(/\s+/)[0];
    if (
      (full.length >= 3 && lower.includes(full)) ||
      (first.length >= 3 && new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(lower))
    ) {
      return npc;
    }
  }

  // 2) Implicit duel/sparring with an active party companion ("lute comigo", "no tatame", "contra ela")
  if (DIRECT_COMPANION_CONTEST_PATTERN.test(text)) {
    const partyCompanion = npcs.find((n) => n.inParty && n.status === 'alive');
    if (partyCompanion) return partyCompanion;
  }

  return undefined;
}

export interface OpposedContestResult {
  opponent: NpcRecord;
  opposedDc: number;
  disadvantage: boolean;
  disadvantageSource?: string;
  opposedLabel: string;
}

export function evaluateOpposedContest(
  player: PlayerState,
  opponent: NpcRecord,
  attribute: AttributeId,
  actionText: string,
): OpposedContestResult {
  const unarmed = isUnarmedContest(actionText);
  const playerScore = unarmed
    ? (player.attributes?.[attribute] ?? 10)
    : (player.attributes?.[attribute] ?? 10);
  const playerMod = getAttributeModifier(playerScore);

  const oppAttrs =
    opponent.attributes ?? defaultNpcAttributes(opponent.assistAttribute ?? 'wis');
  const oppScore = oppAttrs[attribute] ?? 10;
  const oppMod = getAttributeModifier(oppScore);

  let physicalDominance = 0;
  const reasonParts: string[] = [];

  if (attribute === 'str' || attribute === 'con') {
    const oppCm = parseHeightCm(opponent.height);
    const playerCm = parseHeightCm(player.height);
    if (oppCm && playerCm) {
      const diff = oppCm - playerCm;
      if (diff >= 12) {
        const bonus = Math.min(3, Math.floor(diff / 8));
        physicalDominance += bonus;
        reasonParts.push(`${opponent.height} vs ${player.height}`);
      } else if (diff <= -12) {
        physicalDominance -= Math.min(2, Math.floor(Math.abs(diff) / 10));
      }
    } else if (oppCm && oppCm >= 184) {
      physicalDominance += 2;
      reasonParts.push(`${opponent.height}`);
    }

    const oppBio = [
      opponent.role,
      opponent.appearance,
      opponent.notes,
      ...(opponent.skills ?? []),
      ...(opponent.traits ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const oppIsAthletic =
      /(atlet|muscul|lut|grappling|boxe|jiu|marcial|elite|soldad|militar|for[cç]a|muralha|combate|t[aá]tic|peso|envergadura)/i.test(
        oppBio,
      );
    if (oppIsAthletic) {
      physicalDominance += 2;
      reasonParts.push('porte atlético');
    }

    const playerPhysique = `${player.physique ?? ''} ${player.appearance ?? ''} ${player.occupation ?? ''}`.toLowerCase();
    const playerNonAthletic =
      /(n[aã]o\s+atl[eé]tic|sedent|franzin|magr|comum|civil|estrateg|investig|acad[eê]mic|escrit[oó]rio)/i.test(
        playerPhysique,
      );
    if (oppIsAthletic && playerNonAthletic && playerScore <= 12) {
      physicalDominance += 1;
    }
  }

  const statGap = oppMod - playerMod;
  const totalEdge = statGap + physicalDominance;
  const opposedDc = Math.max(10, Math.min(23, 12 + oppMod + physicalDominance));
  const disadvantage = totalEdge >= 3;

  const detailText =
    reasonParts.length > 0 ? reasonParts.join(', ') : `atributo ${oppScore}`;

  return {
    opponent,
    opposedDc,
    disadvantage,
    disadvantageSource: disadvantage
      ? `${opponent.name} (${detailText})`
      : undefined,
    opposedLabel: `vs ${opponent.name} (${detailText})`,
  };
}

export const DIFFICULTY_DC: Record<DifficultyId, number> = {
  easy: 7,
  normal: 11,
  hard: 14,
  insane: 17,
  'good-luck': 19,
};

export interface ActionDiceAssessment {
  requiresRoll: boolean;
  inferredIntent: ActionIntent;
  inferredRisk: ActionRisk;
  attribute?: AttributeId;
  attributeMod?: number;
  reason?: string;
  bonusSource?: string;
  totalBonus?: number;
}

const RISKY_DIALOGUE_PATTERN =
  /\b(mint|mentir|blef|engan|intimid|amea[cç]|suborn|extorqu|seduz|interrog|exig|convenc|persuad|barganh|bluff|lie|intimidate|threaten|bribe|persuade|deceive)\b/i;

const RISKY_ACTION_RULES: Array<{
  intent: ActionIntent;
  risk: ActionRisk;
  reason: Record<LanguageId, string>;
  pattern: RegExp;
}> = [
  {
    intent: 'bold',
    risk: 'high',
    reason: {
      'pt-BR': 'Combate / Força',
      en: 'Combat / Force',
      fr: 'Combat / Force',
    },
    pattern:
      /\b(atac|golpe|dispar|atir|lut|enfrent|esfaque|derrub|arromb|quebr|for[cç]ar|esquiv|bloque|defender|salt|pul|escal|arremess|embosc|matar|ferir|fugir|escapar|correr\s+d[eao]|attack|strike|shoot|fight|stab|dodge|leap|climb|break|kick|flee|escape|ambush)\b/i,
  },
  {
    intent: 'stealth',
    risk: 'medium',
    reason: {
      'pt-BR': 'Furtividade',
      en: 'Stealth',
      fr: 'Furtivité',
    },
    pattern:
      /\b(esgueir|infiltr|roub|furt|escond|desperceb|destranc|gazua|hack|invad|desarm|sabot|espion|silencios|sneak|steal|pickpocket|lockpick|infiltrate|sabotage|disarm)\b/i,
  },
  {
    intent: 'survival',
    risk: 'medium',
    reason: {
      'pt-BR': 'Sobrevivência / Magia',
      en: 'Survival / Magic',
      fr: 'Survie / Magie',
    },
    pattern:
      /\b(conjur|feiti[cç]|ritual|invoc|estanc|curar|resist|atravessar\s+(fogo|lava|g[aá]s|armadilha)|desativ|cast|spell|ritual|summon|heal|resist)\b/i,
  },
  {
    intent: 'diplomatic',
    risk: 'medium',
    reason: {
      'pt-BR': 'Blefe / Pressão',
      en: 'Bluff / Pressure',
      fr: 'Bluff / Pression',
    },
    pattern: RISKY_DIALOGUE_PATTERN,
  },
];

const CALM_INVESTIGATE_PATTERN =
  /\b(olh|observ|examin|l[eê]r|procur|vasculh|escut|ouv|inspecion|analis|pergunt|look|examine|read|search|listen|inspect)\b/i;

const CO_AUTHOR_DIRECTION_PATTERN =
  /\b(antes\s+d[eoa]s?|na\s+verdade|ainda\s+(?:n[aã]o|falta|faltam|tem\s+uma\s+semana)|ele\s+(?:tem|mora|morava|come[cç]a|v[eê]|gosta|gostava|quer|queria)|ela\s+(?:tem|mora|morava|come[cç]a|v[eê])|no\s+passado|flashback|semana\s+antes|dias\s+antes|o\s+mundo\s+ainda)\b/i;

const FREE_TEST_REASON: Record<LanguageId, string> = {
  'pt-BR': 'Teste Livre',
  en: 'Manual Check',
  fr: 'Jet Manuel',
};

const INVESTIGATION_REASON: Record<LanguageId, string> = {
  'pt-BR': 'Investigação',
  en: 'Investigation',
  fr: 'Enquête',
};

const SKILL_TOKEN_STOPWORDS = new Set([
  'para',
  'como',
  'com',
  'controle',
  'sobre',
  'antes',
  'depois',
  'pratico',
  'prático',
  'muito',
  'toda',
  'todo',
  'pela',
  'pelo',
  'algo',
  'mais',
  'with',
  'from',
  'that',
  'this',
  'into',
  'dans',
  'avec',
  'pour',
]);

const SKILL_DOMAIN_GROUPS: Array<{
  actionPattern: RegExp;
  skillPattern: RegExp;
}> = [
  {
    // Combat & physical force skills apply only when the action involves fighting or physical exertion
    actionPattern:
      /\b(atac|golpe|dispar|atir|pistola|arma|rev[oó]lver|rifle|faca|l[aâ]mina|espada|lut|combat|esfaque|derrub|arromb|quebr|esquiv|bloque|defend|embosc|matar|ferir|attack|shoot|gun|pistol|knife|sword|fight|strike)\b/i,
    skillPattern:
      /\b(combate|esgrima|tiro|pistola|armas?|luta|for[cç]a|t[aá]tic|faca|espada|combat|sword|shoot|firearm|heavy|martial)\b/i,
  },
  {
    actionPattern:
      /\b(esgueir|infiltr|roub|furt|escond|desperceb|destranc|gazua|silencios|arromb|sneak|steal|lockpick|infiltrate|hide)\b/i,
    skillPattern:
      /\b(furtiv|ocult|escond|sil[eê]nc|ladin|arromb|stealth|shadow|sneak|infiltr)\b/i,
  },
  {
    actionPattern:
      /\b(mint|mentir|blef|engan|intimid|amea[cç]|suborn|convenc|persuad|barganh|negoci|bluff|lie|intimidate|threaten|bribe|persuade|negotiate|deceive)\b/i,
    skillPattern:
      /\b(persuas|negoci|l[aá]bia|diplom|interrog|social|engano|psicolog|intimid|barter|bluff|charisma)\b/i,
  },
  {
    actionPattern:
      /\b(investig|examin|analis|forens|rastre|pista|deduz|pesquis|decifr|hack|sistema|computad|rede|inspect|clue|track|decrypt)\b/i,
    skillPattern:
      /\b(invest|dedu|forens|leitura|press[aá]g|rastre|an[aá]lis|pista|intel|pesquis|ciber|hack|inspect|clue)\b/i,
  },
  {
    actionPattern:
      /\b(curar|ferid|sangr|estanc|venen|rem[eé]di|biolog|cepa|v[ií]rus|consert|repar|mec[aâ]n|sobreviv|acamp|abrig|heal|bleed|treat|repair|survive)\b/i,
    skillPattern:
      /\b(sobreviv|m[eé]dic|alquim|repar|mec[aâ]n|first aid|trauma|biolog|socorr|farm[aá]c|engenh|surv)\b/i,
  },
  {
    actionPattern:
      /\b(hack|invad|desarm|sabot|eletr[oô]n|r[aá]dio|sinal|frequ[eê]nc|dispositiv|cyberdeck|terminal|codigo|c[oó]digo|decode)\b/i,
    skillPattern:
      /\b(alquim|interface|mec[aâ]n|eletr[oô]n|r[aá]dio|tecnolog|hack|cyberdeck|device|relic|engineering)\b/i,
  },
];

export function inferActionAttribute(
  actionText: string,
  intent: ActionIntent,
): AttributeId {
  const t = actionText.toLowerCase();
  if (
    /\b(pistola|tiro|atir|dispar|arco|esgueir|furtiv|escond|desperceb|esquiv|destranc|gazua|pilot|roub|shoot|gun|pistol|sneak|stealth|dodge|lockpick|steal)\b/i.test(
      t,
    )
  ) {
    return 'dex';
  }
  if (
    /\b(espada|machado|soco|derrub|arromb|quebr|empurr|escal|for[cç]ar|esmag|erguer|sword|smash|break|climb|wrestle|lift)\b/i.test(
      t,
    )
  ) {
    return 'str';
  }
  if (
    /\b(resist|venen|dor|f[oô]lego|aguent|sobreviv|frio|fome|cepa|v[ií]rus|endure|poison|resist|stamina)\b/i.test(
      t,
    )
  ) {
    return 'con';
  }
  if (
    /\b(hack|sistema|computad|medicin|alquim|feiti[cç]|conjur|decifr|an[aá]lis|banco|finan|pesquis|estudar|deduz|investig|hack|decrypt|medicine|spell|research|analyze)\b/i.test(
      t,
    )
  ) {
    return 'int';
  }
  if (
    /\b(persuad|convenc|mentir|blef|engan|intimid|amea[cç]|suborn|seduz|flert|namor|beij|negoci|barganh|lider|bluff|lie|persuade|charm|flirt|intimidate|negotiate)\b/i.test(
      t,
    )
  ) {
    return 'cha';
  }
  if (
    /\b(perceb|intui|sentir|rastre|observar|escutar|desconfi|pressent|curar|track|sense|perceive|insight|spot)\b/i.test(
      t,
    )
  ) {
    return 'wis';
  }

  switch (intent) {
    case 'stealth':
      return 'dex';
    case 'diplomatic':
      return 'cha';
    case 'investigate':
      return 'int';
    case 'survival':
      return 'con';
    case 'item':
      return 'int';
    default:
      return 'str';
  }
}

function findSkillMatch(
  actionText: string,
  playerSkills: string[],
  skillLevels?: SkillProgress[],
): { name: string; level: number } | undefined {
  const normalizedAction = actionText.toLowerCase();

  const levelMap = new Map<string, number>();
  if (Array.isArray(skillLevels)) {
    for (const sk of skillLevels) {
      levelMap.set(sk.name.toLowerCase(), Math.max(1, Math.min(5, sk.level)));
    }
  }

  const allSkills =
    skillLevels && skillLevels.length > 0
      ? skillLevels.map((s) => s.name)
      : playerSkills;

  for (const skill of allSkills) {
    const tokens = skill
      .toLowerCase()
      .split(/[\s/&,-]+/)
      .filter((t) => t.length >= 4 && !SKILL_TOKEN_STOPWORDS.has(t));

    if (tokens.some((token) => normalizedAction.includes(token))) {
      return { name: skill, level: levelMap.get(skill.toLowerCase()) ?? 2 };
    }

    const lowerSkill = skill.toLowerCase();
    for (const group of SKILL_DOMAIN_GROUPS) {
      if (
        group.actionPattern.test(normalizedAction) &&
        group.skillPattern.test(lowerSkill)
      ) {
        return { name: skill, level: levelMap.get(lowerSkill) ?? 2 };
      }
    }
  }

  return undefined;
}

export function assessFreeAction(
  actionText: string,
  inputMode: CommandInputMode,
  playerSkills: string[],
  sceneTension: number,
  difficulty: DifficultyId,
  policy: DiceRollPolicy,
  lang: LanguageId = 'pt-BR',
  effectiveAttributes?: CharacterAttributes,
  skillLevels?: SkillProgress[],
): ActionDiceAssessment {
  const text = actionText.trim();
  const baseIntent: ActionIntent =
    inputMode === 'say'
      ? 'diplomatic'
      : inputMode === 'direct'
        ? 'investigate'
        : 'bold';

  const buildRollMeta = (intent: ActionIntent) => {
    const attribute = inferActionAttribute(text, intent);
    const attributeMod = effectiveAttributes
      ? getAttributeModifier(effectiveAttributes[attribute])
      : 0;
    const match = findSkillMatch(text, playerSkills, skillLevels);
    const totalBonus = attributeMod + (match ? match.level : 0);
    return {
      attribute,
      attributeMod,
      bonusSource: match?.name,
      totalBonus,
    };
  };

  if (inputMode === 'direct' || policy === 'off') {
    return {
      requiresRoll: false,
      inferredIntent: baseIntent,
      inferredRisk: 'safe',
    };
  }

  if (inputMode === 'say') {
    const isRiskyDialogue = text.length > 0 && RISKY_DIALOGUE_PATTERN.test(text);
    const requiresRoll = policy === 'force' || isRiskyDialogue;
    const meta = requiresRoll ? buildRollMeta('diplomatic') : {};
    return {
      requiresRoll,
      inferredIntent: 'diplomatic',
      inferredRisk: requiresRoll ? 'medium' : 'safe',
      reason: isRiskyDialogue
        ? RISKY_ACTION_RULES[3].reason[lang]
        : policy === 'force'
          ? FREE_TEST_REASON[lang]
          : undefined,
      ...meta,
    };
  }

  const isCoAuthorDirection =
    text.length > 0 &&
    CO_AUTHOR_DIRECTION_PATTERN.test(text) &&
    !RISKY_ACTION_RULES[0].pattern.test(text);

  if (isCoAuthorDirection && policy !== 'force') {
    return {
      requiresRoll: false,
      inferredIntent: 'investigate',
      inferredRisk: 'safe',
    };
  }

  // Spoken challenge proposals/questions ("Então falo: lute comigo... topa?") are dialogue, not an immediate combat check
  if (
    text.length > 0 &&
    policy !== 'force' &&
    (SPOKEN_PROPOSAL_PATTERN.test(text) || PROPOSAL_QUESTION_CUE.test(text)) &&
    /\?/.test(text)
  ) {
    return {
      requiresRoll: false,
      inferredIntent: 'diplomatic',
      inferredRisk: 'safe',
    };
  }

  const matchedRule = text
    ? RISKY_ACTION_RULES.find((rule) => rule.pattern.test(text))
    : undefined;

  if (matchedRule) {
    return {
      requiresRoll: true,
      inferredIntent: matchedRule.intent,
      inferredRisk: matchedRule.risk,
      reason: matchedRule.reason[lang],
      ...buildRollMeta(matchedRule.intent),
    };
  }

  const isCalmInvestigate =
    text.length > 0 && CALM_INVESTIGATE_PATTERN.test(text);

  if (isCalmInvestigate) {
    const requiresRoll = policy === 'force';
    const meta = requiresRoll ? buildRollMeta('investigate') : {};
    return {
      requiresRoll,
      inferredIntent: 'investigate',
      inferredRisk: requiresRoll ? 'medium' : 'safe',
      reason: requiresRoll ? INVESTIGATION_REASON[lang] : undefined,
      ...meta,
    };
  }

  const extremeTensionAutoRoll =
    difficulty === 'good-luck' && sceneTension >= 80 && text.length >= 6;
  const requiresRoll = policy === 'force' || extremeTensionAutoRoll;
  const meta = requiresRoll ? buildRollMeta('bold') : {};

  return {
    requiresRoll,
    inferredIntent: 'bold',
    inferredRisk: requiresRoll ? 'medium' : 'safe',
    reason: requiresRoll
      ? extremeTensionAutoRoll
        ? RISKY_ACTION_RULES[0].reason[lang]
        : FREE_TEST_REASON[lang]
      : undefined,
    ...meta,
  };
}

export function assessSuggestedAction(
  action: TacticalAction,
  playerSkills: string[],
  difficulty: DifficultyId,
  sceneTension: number,
  policy: DiceRollPolicy,
  effectiveAttributes?: CharacterAttributes,
  skillLevels?: SkillProgress[],
): {
  requiresRoll: boolean;
  attribute: AttributeId;
  attributeMod: number;
  bonusSource?: string;
  totalBonus: number;
  reason?: string;
} {
  const attribute =
    action.attribute ?? inferActionAttribute(action.label, action.intent);
  const attributeMod = effectiveAttributes
    ? getAttributeModifier(effectiveAttributes[attribute])
    : 0;
  const match = findSkillMatch(action.label, playerSkills, skillLevels);
  const totalBonus = attributeMod + (match ? match.level : 0);

  if (policy === 'off') {
    return {
      requiresRoll: false,
      attribute,
      attributeMod,
      totalBonus,
    };
  }

  if (policy === 'force') {
    return {
      requiresRoll: true,
      attribute,
      attributeMod,
      bonusSource: match?.name,
      totalBonus,
      reason: action.rollSkillHint,
    };
  }

  const requiresRoll =
    typeof action.requiresRoll === 'boolean'
      ? action.requiresRoll
      : action.risk === 'high' ||
        action.risk === 'medium' ||
        (difficulty === 'good-luck' &&
          action.risk === 'low' &&
          sceneTension >= 60);

  return {
    requiresRoll,
    attribute,
    attributeMod,
    bonusSource: requiresRoll ? match?.name : undefined,
    totalBonus,
    reason: action.rollSkillHint,
  };
}

export function inferDndSkill(
  actionText: string,
  intent: ActionIntent,
  explicitSkill?: DndSkillId,
): DndSkillId {
  if (explicitSkill && DND_SKILLS[explicitSkill]) return explicitSkill;
  const t = actionText.toLowerCase();
  if (/\b(furtiv|esgueir|escond|silencios|desperceb|sneak|stealth|hide)\b/.test(t)) return 'stealth';
  if (/\b(destranc|gazua|roub|bater\s+carteira|pickpocket|lockpick|prestidigit)\b/.test(t)) return 'sleight_of_hand';
  if (/\b(acrobac|equil[ií]br|salt|esquiv|pirueta|acrobat|dodge|leap)\b/.test(t)) return 'acrobatics';
  if (/\b(atlet|escal|nad|arromb|empurr|erguer|agarr|luta|wrestle|climb|swim|shove)\b/.test(t)) return 'athletics';
  if (/\b(mentir|blef|engan|disfar[cç]|bluff|lie|deceive|deception)\b/.test(t)) return 'deception';
  if (/\b(intimid|amea[cç]|coag|intimidate|threaten)\b/.test(t)) return 'intimidation';
  if (/\b(persuad|convenc|negoci|barganh|diplom|seduz|persuade|negotiate|charm)\b/.test(t)) return 'persuasion';
  if (/\b(atuar|cantar|tocar|discurs|distrair\s+plat|perform)\b/.test(t)) return 'performance';
  if (/\b(arcan|magia|feiti[cç]|runa|hack|sistema|terminal|net|cript|ocult|arcana|spell|decrypt)\b/.test(t)) return 'arcana';
  if (/\b(investig|pista|deduz|examin|forens|vasculh|analis|inspect|clue|investigate)\b/.test(t)) return 'investigation';
  if (/\b(hist[oó]r|arquivo|lenda|antig|linhagem|history|lore)\b/.test(t)) return 'history';
  if (/\b(religi|deus|templo|culto|seita|sagrado|ritual|religion)\b/.test(t)) return 'religion';
  if (/\b(naturez|planta|veneno|clima|floresta|fauna|flora|nature)\b/.test(t)) return 'nature';
  if (/\b(medicin|curar|estanc|ferid|socorr|sutura|diagn[oó]st|medicine|heal|treat)\b/.test(t)) return 'medicine';
  if (/\b(intui|ler\s+mentir|desconfi|motiva[cç]|express[aã]o|insight|sense)\b/.test(t)) return 'insight';
  if (/\b(perceb|escut|ouv|avist|observar|vigil|armadilha|perception|spot|listen)\b/.test(t)) return 'perception';
  if (/\b(animal|cavalo|lobo|drone|ve[ií]cul|pilot|dirig|animal|mount|drive)\b/.test(t)) return 'animal_handling';
  if (/\b(sobreviv|rastre|acamp|trilha|abrigo|ca[cç]a|survival|track)\b/.test(t)) return 'survival';

  switch (intent) {
    case 'stealth':
      return 'stealth';
    case 'diplomatic':
      return 'persuasion';
    case 'investigate':
      return 'investigation';
    case 'survival':
      return 'survival';
    case 'item':
      return 'arcana';
    default:
      return 'athletics';
  }
}

export function resolveDndSavingThrow(
  player: PlayerState,
  ability: AttributeId,
  dc: number,
  reason: string,
  opts?: {
    rollMode?: RollMode;
    advantageSource?: string;
    disadvantageSource?: string;
    rerolledWithInspiration?: boolean;
  },
): DiceRollResult {
  const dnd = player.dnd;
  const conditions = dnd?.conditions ?? [];
  const autoFail =
    (ability === 'str' || ability === 'dex') &&
    conditions.some((c) => DND_CONDITIONS[c]?.autoFailStrDexSaves);

  const hasAdv = opts?.rollMode === 'advantage';
  const hasDisadv =
    opts?.rollMode === 'disadvantage' ||
    (ability === 'dex' && conditions.includes('restrained'));
  const finalMode: RollMode =
    hasAdv && hasDisadv ? 'normal' : hasAdv ? 'advantage' : hasDisadv ? 'disadvantage' : 'normal';

  const mod = computeSavingThrowModifier(player, ability);
  const pb = getProficiencyBonus(player.level);
  const isProf = dnd?.savingThrowProficiencies.includes(ability) ?? false;
  const exhaustionPenalty = (dnd?.exhaustion ?? 0) * 2;
  const attrMod = getAttributeModifier(player.attributes?.[ability] ?? 10);

  const r1 = autoFail ? 1 : Math.floor(Math.random() * 20) + 1;
  const r2 = !autoFail && finalMode !== 'normal' ? Math.floor(Math.random() * 20) + 1 : undefined;
  const roll =
    r2 !== undefined
      ? finalMode === 'advantage'
        ? Math.max(r1, r2)
        : Math.min(r1, r2)
      : r1;
  const total = autoFail ? 0 : roll + mod;
  // SRD 5.2: Saving Throws are binary pass/fail (no Nat 1/20 auto-fail/auto-succeed)
  const outcome: DiceOutcome = !autoFail && total >= dc ? 'success' : 'failure';

  return {
    roll,
    rolls: r2 !== undefined ? [r1, r2] : undefined,
    rollMode: finalMode,
    advantageSource: finalMode === 'advantage' ? opts?.advantageSource : undefined,
    disadvantageSource:
      finalMode === 'disadvantage'
        ? opts?.disadvantageSource ?? (ability === 'dex' && conditions.includes('restrained') ? 'Imobilizado' : undefined)
        : undefined,
    opposedLabel: reason,
    rerolledWithInspiration: opts?.rerolledWithInspiration,
    testKind: 'saving_throw',
    proficiencyBonus: isProf ? pb : 0,
    exhaustionPenalty: exhaustionPenalty > 0 ? exhaustionPenalty : undefined,
    bonus: mod,
    bonusSource: isProf ? `Salvaguarda (+${pb} PB)` : 'Salvaguarda',
    attribute: ability,
    attributeMod: attrMod,
    total,
    dc,
    outcome,
  };
}

export function resolveDndDeathSave(
  rerolledWithInspiration = false,
): DiceRollResult {
  // SRD 5.2 Death Saving Throw: flat 1d20 vs DC 10 (exempt from Exhaustion).
  // Nat 20 = regain 1 HP immediately; Nat 1 = 2 failures; >= 10 = 1 success.
  const roll = Math.floor(Math.random() * 20) + 1;
  const outcome: DiceOutcome =
    roll === 20
      ? 'critical_success'
      : roll === 1
        ? 'critical_failure'
        : roll >= 10
          ? 'success'
          : 'failure';

  return {
    roll,
    rollMode: 'normal',
    opposedLabel: 'Teste Contra a Morte (0 PV)',
    rerolledWithInspiration,
    testKind: 'death_save',
    bonus: 0,
    bonusSource: 'd20 Puro',
    total: roll,
    dc: 10,
    outcome,
  };
}

export function resolveFateCheck(
  actionText: string,
  intent: ActionIntent,
  risk: ActionRisk,
  difficulty: DifficultyId,
  playerSkills: string[],
  requiresRoll?: boolean,
  sceneTension?: number,
  rpgContext?: {
    attributes?: CharacterAttributes;
    skillLevels?: SkillProgress[];
    forcedAttribute?: AttributeId;
    rollMode?: RollMode;
    advantageSource?: string;
    disadvantageSource?: string;
    opposedLabel?: string;
    dcOverride?: number;
    rerolledWithInspiration?: boolean;
    weatherType?: WeatherType;
    // MYTHOS 12.0 — D&D 5e (2024 / SRD 5.2) context
    ruleset?: RulesetId;
    player?: PlayerState;
    testKind?: DndTestKind;
    skillId?: DndSkillId;
    targetAc?: number;
    worldTheme?: WorldThemeId;
    useClassicDndNames?: boolean;
  },
): DiceRollResult | undefined {
  if (requiresRoll === false) {
    return undefined;
  }

  if (requiresRoll === undefined) {
    if (risk === 'safe') {
      return undefined;
    }
    if (
      risk === 'low' &&
      !(difficulty === 'good-luck' && (sceneTension ?? 0) >= 60)
    ) {
      return undefined;
    }
  }

  // === D&D 5e Revised (2024 / SRD 5.2) D20 Test Engine ===
  if (rpgContext?.ruleset === 'dnd5e_2024' && rpgContext.player?.dnd) {
    const player = rpgContext.player;
    const dnd = player.dnd!;
    const testKind: DndTestKind = rpgContext.testKind ?? 'ability_check';
    const theme = rpgContext.worldTheme ?? 'fantasy';

    if (testKind === 'death_save') {
      return resolveDndDeathSave(Boolean(rpgContext.rerolledWithInspiration));
    }

    if (testKind === 'saving_throw') {
      const saveAttr = rpgContext.forcedAttribute ?? inferActionAttribute(actionText, intent);
      const saveDc =
        typeof rpgContext.dcOverride === 'number'
          ? Math.max(5, Math.min(30, rpgContext.dcOverride))
          : difficulty === 'easy'
            ? 10
            : difficulty === 'normal'
              ? 13
              : difficulty === 'hard'
                ? 15
                : difficulty === 'insane'
                  ? 17
                  : 20;
      return resolveDndSavingThrow(
        player,
        saveAttr,
        saveDc,
        rpgContext.opposedLabel ?? 'Salvaguarda',
        {
          rollMode: rpgContext.rollMode,
          advantageSource: rpgContext.advantageSource,
          disadvantageSource: rpgContext.disadvantageSource,
          rerolledWithInspiration: rpgContext.rerolledWithInspiration,
        },
      );
    }

    // Determine Skill & Attribute
    const skillId = inferDndSkill(actionText, intent, rpgContext.skillId);
    const attribute: AttributeId =
      testKind === 'attack_roll'
        ? rpgContext.forcedAttribute ?? inferActionAttribute(actionText, intent)
        : rpgContext.forcedAttribute ?? DND_SKILLS[skillId].attribute;

    const acBreakdown = computeArmorClass(player);
    const conds = dnd.conditions ?? [];

    // Official 5e Advantage / Disadvantage with Mutual Cancellation!
    let hasAdv = rpgContext.rollMode === 'advantage';
    let hasDisadv = rpgContext.rollMode === 'disadvantage';
    const advReasons: string[] = [];
    const disadvReasons: string[] = [];
    if (hasAdv && rpgContext.advantageSource) advReasons.push(rpgContext.advantageSource);
    if (hasDisadv && rpgContext.disadvantageSource) disadvReasons.push(rpgContext.disadvantageSource);
    else if (hasDisadv && rpgContext.advantageSource) disadvReasons.push(rpgContext.advantageSource);

    if (testKind === 'ability_check') {
      if (skillId === 'stealth' && acBreakdown.stealthDisadvantage) {
        hasDisadv = true;
        disadvReasons.push('Armadura Pesada');
      }
      if ((attribute === 'str' || attribute === 'dex') && acBreakdown.nonProficientArmor) {
        hasDisadv = true;
        disadvReasons.push('Armadura s/ Proficiência');
      }
      if (conds.some((c) => DND_CONDITIONS[c]?.abilityCheckDisadvantage)) {
        hasDisadv = true;
        const cId = conds.find((c) => DND_CONDITIONS[c]?.abilityCheckDisadvantage)!;
        disadvReasons.push(DND_CONDITIONS[cId].label);
      }
    } else if (testKind === 'attack_roll') {
      if (conds.includes('invisible')) {
        hasAdv = true;
        advReasons.push('Invisível');
      }
      if (conds.some((c) => DND_CONDITIONS[c]?.attackDisadvantage)) {
        hasDisadv = true;
        const cId = conds.find((c) => DND_CONDITIONS[c]?.attackDisadvantage)!;
        disadvReasons.push(DND_CONDITIONS[cId].label);
      }
      if ((attribute === 'str' || attribute === 'dex') && acBreakdown.nonProficientArmor) {
        hasDisadv = true;
        disadvReasons.push('Armadura s/ Proficiência');
      }
    }

    const finalRollMode: RollMode =
      hasAdv && hasDisadv
        ? 'normal'
        : hasAdv
          ? 'advantage'
          : hasDisadv
            ? 'disadvantage'
            : 'normal';

    // Official SRD 5.2 DC Ladder (5 / 10 / 15 / 20 / 25 / 30) — dcOverride respected in BOTH directions!
    const officialBaseDc =
      difficulty === 'easy'
        ? 10
        : difficulty === 'normal'
          ? 12
          : difficulty === 'hard'
            ? 15
            : difficulty === 'insane'
              ? 18
              : 20;
    const riskShift = risk === 'safe' ? -5 : risk === 'low' ? -2 : risk === 'high' ? 3 : 0;
    const dc =
      testKind === 'attack_roll' && typeof rpgContext.targetAc === 'number'
        ? rpgContext.targetAc
        : typeof rpgContext.dcOverride === 'number'
          ? Math.max(5, Math.min(30, rpgContext.dcOverride))
          : Math.max(5, Math.min(30, officialBaseDc + riskShift));

    const pb = getProficiencyBonus(player.level);
    const exhaustionPenalty = (dnd.exhaustion ?? 0) * 2;
    const attrMod = getAttributeModifier(
      (rpgContext.attributes ?? player.attributes)[attribute] ?? 10,
    );

    let bonus = 0;
    let profApplied = 0;
    let bonusSource: string | undefined;

    if (testKind === 'attack_roll') {
      profApplied = pb;
      bonus = attrMod + pb - exhaustionPenalty;
      bonusSource = `Prof. +${pb}`;
    } else {
      bonus = computeSkillModifier(player, skillId);
      const isExp = dnd.skillExpertise.includes(skillId);
      const isProf = isExp || dnd.skillProficiencies.includes(skillId);
      profApplied = isExp ? pb * 2 : isProf ? pb : 0;
      const skillName = getThemedSkillLabel(
        skillId,
        theme,
        Boolean(rpgContext.useClassicDndNames),
      );
      bonusSource = isExp
        ? `${skillName} (Esp. +${pb * 2})`
        : isProf
          ? `${skillName} (+${pb})`
          : skillName;
    }

    // Halfling Lucky: automatically rerolls a 1 on d20 tests!
    const rollOne = () => {
      let n = Math.floor(Math.random() * 20) + 1;
      if (n === 1 && dnd.speciesId === 'halfling') {
        n = Math.floor(Math.random() * 20) + 1;
      }
      return n;
    };

    const r1 = rollOne();
    const r2 = finalRollMode !== 'normal' ? rollOne() : undefined;
    const roll =
      r2 !== undefined
        ? finalRollMode === 'advantage'
          ? Math.max(r1, r2)
          : Math.min(r1, r2)
        : r1;
    const total = roll + bonus;

    // SRD 5.2 RAW: Nat 1 / Nat 20 auto-miss/crit applies ONLY to Attack Rolls!
    let outcome: DiceOutcome;
    if (testKind === 'attack_roll') {
      const critThreshold =
        dnd.classId === 'fighter' && dnd.subclassId === 'champion' ? 19 : 20;
      if (roll === 1) outcome = 'critical_failure';
      else if (roll >= critThreshold) outcome = 'critical_success';
      else if (total >= dc) outcome = 'success';
      else outcome = 'failure';
    } else {
      // Ability Check: pure total vs DC (no Nat 1/20 auto-outcomes, no partial)
      outcome = total >= dc ? 'success' : 'failure';
    }

    return {
      roll,
      rolls: r2 !== undefined ? [r1, r2] : undefined,
      rollMode: finalRollMode,
      advantageSource:
        finalRollMode === 'advantage' && advReasons.length > 0
          ? advReasons.join(' · ')
          : undefined,
      disadvantageSource:
        finalRollMode === 'disadvantage' && disadvReasons.length > 0
          ? disadvReasons.join(' · ')
          : undefined,
      opposedLabel: rpgContext.opposedLabel,
      rerolledWithInspiration: rpgContext.rerolledWithInspiration,
      testKind,
      skillId: testKind === 'ability_check' ? skillId : undefined,
      targetAc: testKind === 'attack_roll' ? dc : undefined,
      proficiencyBonus: profApplied,
      exhaustionPenalty: exhaustionPenalty > 0 ? exhaustionPenalty : undefined,
      bonus,
      bonusSource,
      attribute,
      attributeMod: attrMod,
      skillLevelBonus: profApplied - exhaustionPenalty,
      total,
      dc,
      outcome,
    };
  }

  // === Legacy MYTHOS BG3 Fate Check (preserved 100% for 'mythos_legacy' saves) ===
  const baseDc = DIFFICULTY_DC[difficulty];
  const riskAdjustment =
    risk === 'safe' ? -3 : risk === 'low' ? -2 : risk === 'high' ? 2 : 0;
  const standardDc = Math.max(4, Math.min(22, baseDc + riskAdjustment));
  const dc =
    typeof rpgContext?.dcOverride === 'number'
      ? Math.max(4, Math.min(24, rpgContext.dcOverride))
      : standardDc;

  const attribute =
    rpgContext?.forcedAttribute ?? inferActionAttribute(actionText, intent);
  const attributeMod = rpgContext?.attributes
    ? getAttributeModifier(rpgContext.attributes[attribute])
    : 0;

  const skillMatch = findSkillMatch(
    actionText,
    playerSkills,
    rpgContext?.skillLevels,
  );
  const skillLevelBonus = skillMatch ? Math.max(1, skillMatch.level) : 0;
  const weatherMod = getWeatherRollModifier(
    rpgContext?.weatherType,
    attribute,
    intent,
  );
  const bonus = attributeMod + skillLevelBonus + weatherMod.mod;
  const bonusSourceParts = [
    skillMatch?.name,
    weatherMod.mod !== 0 && weatherMod.label
      ? `${weatherMod.label} ${weatherMod.mod > 0 ? `+${weatherMod.mod}` : weatherMod.mod}`
      : undefined,
  ].filter(Boolean);

  const rollMode: RollMode = rpgContext?.rollMode ?? 'normal';
  const r1 = Math.floor(Math.random() * 20) + 1;
  const r2 = rollMode !== 'normal' ? Math.floor(Math.random() * 20) + 1 : undefined;
  const roll =
    r2 !== undefined
      ? rollMode === 'advantage'
        ? Math.max(r1, r2)
        : Math.min(r1, r2)
      : r1;
  const rolls: [number, number] | undefined = r2 !== undefined ? [r1, r2] : undefined;
  const total = roll + bonus;

  let outcome: DiceOutcome;
  if (roll === 1) {
    outcome = 'critical_failure';
  } else if (roll === 20) {
    outcome = 'critical_success';
  } else if (total >= dc) {
    outcome = 'success';
  } else if (total >= dc - 3) {
    outcome = 'partial';
  } else {
    outcome = 'failure';
  }

  return {
    roll,
    rolls,
    rollMode,
    advantageSource: rpgContext?.advantageSource,
    opposedLabel: rpgContext?.opposedLabel,
    rerolledWithInspiration: rpgContext?.rerolledWithInspiration,
    bonus,
    bonusSource: bonusSourceParts.length > 0 ? bonusSourceParts.join(' · ') : undefined,
    attribute,
    attributeMod,
    skillLevelBonus: skillLevelBonus + weatherMod.mod,
    total,
    dc,
    outcome,
  };
}

export function formatOutcomeLabel(outcome: DiceOutcome, lang: LanguageId): string {
  const map: Record<DiceOutcome, Record<LanguageId, string>> = {
    critical_success: {
      'pt-BR': 'Sucesso Crítico',
      en: 'Critical Success',
      fr: 'Succès Critique',
    },
    success: {
      'pt-BR': 'Sucesso',
      en: 'Success',
      fr: 'Succès',
    },
    partial: {
      'pt-BR': 'Sucesso Parcial',
      en: 'Partial Hit',
      fr: 'Réussite Partielle',
    },
    failure: {
      'pt-BR': 'Falha',
      en: 'Failure',
      fr: 'Échec',
    },
    critical_failure: {
      'pt-BR': 'Falha Crítica',
      en: 'Critical Failure',
      fr: 'Échec Critique',
    },
  };
  return map[outcome][lang];
}
