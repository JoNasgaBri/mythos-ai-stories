import type {
  ActionIntent,
  ActionRisk,
  DiceOutcome,
  DiceRollResult,
  DifficultyId,
  LanguageId,
} from '../types/game';

export const DIFFICULTY_DC: Record<DifficultyId, number> = {
  easy: 7,
  normal: 11,
  hard: 14,
  insane: 17,
  'good-luck': 19,
};

const INTENT_KEYWORDS: Record<ActionIntent, string[]> = {
  bold: ['combate', 'esgrima', 'ataque', 'tiro', 'combat', 'sword', 'force', 'intimid', 'heavy', 'tático', 'tactical'],
  stealth: ['furtiv', 'ocult', 'escond', 'silênc', 'stealth', 'shadow', 'sneak', 'infiltr', 'arromb'],
  diplomatic: ['persuas', 'negoci', 'lábia', 'diplom', 'interrog', 'social', 'engano', 'barter', 'bluff', 'convenc'],
  investigate: ['invest', 'dedu', 'forens', 'leitura', 'presság', 'rastre', 'scan', 'anális', 'inspect', 'clues', 'pista'],
  survival: ['sobreviv', 'medic', 'alquim', 'repar', 'mecân', 'first aid', 'trauma', 'biolog', 'surv', 'vigor'],
  item: ['alquim', 'interface', 'mecân', 'tool', 'device', 'relic', 'cyberdeck', 'med'],
};

function findSkillSynergy(
  actionText: string,
  intent: ActionIntent,
  playerSkills: string[],
): string | undefined {
  const normalizedAction = actionText.toLowerCase();

  for (const skill of playerSkills) {
    const tokens = skill
      .toLowerCase()
      .split(/[\s/&,-]+/)
      .filter((t) => t.length >= 4);

    if (tokens.some((token) => normalizedAction.includes(token))) {
      return skill;
    }

    const keywords = INTENT_KEYWORDS[intent] ?? [];
    if (keywords.some((kw) => skill.toLowerCase().includes(kw))) {
      return skill;
    }
  }

  return undefined;
}

export function resolveFateCheck(
  actionText: string,
  intent: ActionIntent,
  risk: ActionRisk,
  difficulty: DifficultyId,
  playerSkills: string[],
): DiceRollResult | undefined {
  // Low-stakes observation actions skip rolls unless playing on Good Luck mode
  if (risk === 'safe' && difficulty !== 'good-luck') {
    return undefined;
  }

  const baseDc = DIFFICULTY_DC[difficulty];
  const riskAdjustment =
    risk === 'safe' ? -3 : risk === 'low' ? -2 : risk === 'high' ? 2 : 0;
  const dc = Math.max(4, Math.min(22, baseDc + riskAdjustment));

  const bonusSource = findSkillSynergy(actionText, intent, playerSkills);
  const bonus = bonusSource ? 2 : 0;
  const roll = Math.floor(Math.random() * 20) + 1;
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
    bonus,
    bonusSource,
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
