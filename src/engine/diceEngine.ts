import { getAttributeModifier, getWeatherRollModifier } from './rpgSystem';
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
  LanguageId,
  NpcRecord,
  RollMode,
  SkillProgress,
  TacticalAction,
  WeatherType,
} from '../types/game';

export function findPartyAdvantage(
  attribute: AttributeId,
  npcs: NpcRecord[] | undefined,
): NpcRecord | undefined {
  if (!Array.isArray(npcs)) return undefined;
  return npcs.find(
    (n) => n.inParty && n.status === 'alive' && n.assistAttribute === attribute,
  );
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
    rerolledWithInspiration?: boolean;
    weatherType?: WeatherType;
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

  const baseDc = DIFFICULTY_DC[difficulty];
  const riskAdjustment =
    risk === 'safe' ? -3 : risk === 'low' ? -2 : risk === 'high' ? 2 : 0;
  const dc = Math.max(4, Math.min(22, baseDc + riskAdjustment));

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
