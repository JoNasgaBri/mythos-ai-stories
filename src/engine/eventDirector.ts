import type {
  Campaign,
  StorytellerProfile,
  WorldEventCategory,
} from '../types/game';

export interface StorytellerEvaluation {
  shouldTrigger: boolean;
  suggestedCategory: WorldEventCategory;
  triggerReason: string;
}

const IMPACTFUL_DECISION_PATTERN =
  /\b(viaj|estrada|posto|mercado|banco|comprar|negoci|r[aá]dio|frequ[eê]ncia|sinal|gerador|port[aã]o|base|abrigo|barricada|explorar|sair|cidade|patrulh|vizinh|fac[cç][aã]o|travel|trade|radio|generator|explore|scout)\b/i;

/**
 * RimWorld-inspired AI Storyteller Director:
 * - Enforces quiet-space cooldowns so drama always has contrast
 * - Scales probability smoothly across turns since the last event
 * - Reacts to impactful player decisions, day transitions, long rests, and countdown milestones
 * - Applies an Adaptive Safety Valve (offers relief/opportunities when player vigor is low or tension is critical)
 */
export function evaluateStorytellerTrigger(params: {
  campaign: Campaign;
  profile: StorytellerProfile;
  lastActionText?: string;
  dayChanged?: boolean;
  restedLong?: boolean;
}): StorytellerEvaluation {
  const { campaign, profile, lastActionText = '', dayChanged, restedLong } = params;

  const fallbackResult: StorytellerEvaluation = {
    shouldTrigger: false,
    suggestedCategory: 'dilemma',
    triggerReason: 'cooldown',
  };

  if (profile === 'manual') return fallbackResult;
  if (campaign.status !== 'active') return fallbackResult;
  if (campaign.activeWorldEvent) return fallbackResult;
  if (campaign.turnCount < 2) return fallbackResult;

  const lastTurn = campaign.lastWorldEventTurn ?? 0;
  const turnsSince = Math.max(0, campaign.turnCount - lastTurn);

  // Hard minimum quiet-space cooldown per Storyteller archetype
  const minSpacing =
    profile === 'slow' ? 5 : profile === 'chaotic' ? 2 : 3;

  const countdownUrgent =
    Boolean(campaign.worldClock?.countdown) &&
    (campaign.worldClock?.countdown?.daysLeft ?? 99) <= 1;

  // Countdown milestone or waking up from a long rest can bypass 1 turn of cooldown (except chaotic/manual)
  const effectiveCooldown =
    restedLong || dayChanged || countdownUrgent
      ? Math.max(2, minSpacing - 1)
      : minSpacing;

  if (turnsSince < effectiveCooldown) {
    return fallbackResult;
  }

  // Compute organic probability curve
  let chance = 0;
  if (profile === 'balanced') {
    // Cassandra-style escalating wave: ~24% -> ~48% -> ~72% -> ~92%
    const over = turnsSince - effectiveCooldown;
    chance = Math.min(0.92, 0.24 + over * 0.24);
  } else if (profile === 'slow') {
    // Phoebe-style long calm valleys punctuated by rare memorable events
    const over = turnsSince - effectiveCooldown;
    chance = Math.min(0.85, 0.16 + over * 0.18);
  } else {
    // Randy-style stochastic unpredictability
    chance = turnsSince >= 7 ? 0.85 : 0.34;
  }

  let triggerReason = 'ritmo orgânico do mundo';
  if (restedLong || dayChanged) {
    chance = Math.min(0.95, chance + 0.28);
    triggerReason = restedLong
      ? 'novo amanhecer após descanso'
      : 'virada do dia no mundo';
  } else if (countdownUrgent) {
    chance = Math.min(0.95, chance + 0.25);
    triggerReason = 'marco crítico na contagem regressiva';
  } else if (IMPACTFUL_DECISION_PATTERN.test(lastActionText)) {
    chance = Math.min(0.9, chance + 0.14);
    triggerReason = 'efeito borboleta da decisão recente';
  }

  const rolled = Math.random();
  if (rolled > chance) {
    return fallbackResult;
  }

  // Adaptive Safety Valve + World-State Category Selection
  const suggestedCategory = pickStorytellerCategory(campaign, {
    dayChanged,
    restedLong,
    countdownUrgent,
  });

  return {
    shouldTrigger: true,
    suggestedCategory,
    triggerReason,
  };
}

export function pickStorytellerCategory(
  campaign: Campaign,
  flags?: {
    dayChanged?: boolean;
    restedLong?: boolean;
    countdownUrgent?: boolean;
  },
): WorldEventCategory {
  const vigorRatio =
    campaign.player.vigor / Math.max(1, campaign.player.maxVigor);
  const tension = campaign.player.tension;
  const supplies = campaign.stronghold?.supplies;
  const lowResources =
    supplies &&
    (supplies.food <= 2 || supplies.meds <= 1 || supplies.fuel <= 2);

  // Safety Valve: never pile a brutal crisis onto a struggling player — give an opportunity or encounter!
  if (vigorRatio < 0.45 || tension >= 75 || lowResources) {
    return Math.random() < 0.65 ? 'opportunity' : 'encounter';
  }

  if (flags?.countdownUrgent) {
    return Math.random() < 0.6 ? 'crisis' : 'dilemma';
  }

  const weather = campaign.worldClock?.weatherType;
  if (
    (weather === 'storm' || weather === 'heatwave' || weather === 'snow' || weather === 'ash') &&
    Math.random() < 0.35
  ) {
    return 'weather';
  }

  const pool: WorldEventCategory[] = campaign.stronghold
    ? ['dilemma', 'base', 'encounter', 'opportunity', 'dilemma', 'crisis']
    : ['dilemma', 'encounter', 'opportunity', 'crisis'];

  return pool[Math.floor(Math.random() * pool.length)];
}
