import type {
  AttributeId,
  CharacterAttributes,
  EquipSlot,
  InventoryItem,
  ItemBonuses,
  ItemRarity,
  LanguageId,
  LocationKind,
  LocationStatus,
  NpcStance,
  PlayerState,
  RelationshipTier,
  SkillProgress,
  StrongholdState,
  WorldClock,
  WorldPeriod,
  WorldThemeId,
} from '../types/game';

export const MAX_INSPIRATION = 4;
export const MAX_PARTY_SIZE = 3;

export const ATTRIBUTE_KEYS: AttributeId[] = [
  'str',
  'dex',
  'con',
  'int',
  'wis',
  'cha',
];

export const DEFAULT_ATTRIBUTES: CharacterAttributes = {
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
};

export const ATTRIBUTE_META: Record<
  AttributeId,
  {
    short: Record<LanguageId, string>;
    full: Record<LanguageId, string>;
    hint: Record<LanguageId, string>;
  }
> = {
  str: {
    short: { 'pt-BR': 'FOR', en: 'STR', fr: 'FOR' },
    full: { 'pt-BR': 'Força', en: 'Strength', fr: 'Force' },
    hint: {
      'pt-BR': 'Combate corpo a corpo, atletismo, arrombar e resistência física.',
      en: 'Melee combat, athletics, breaking barriers, and physical power.',
      fr: 'Combat au corps à corps, athlétisme et puissance physique.',
    },
  },
  dex: {
    short: { 'pt-BR': 'DES', en: 'DEX', fr: 'DEX' },
    full: { 'pt-BR': 'Destreza', en: 'Dexterity', fr: 'Dextérité' },
    hint: {
      'pt-BR': 'Armas de fogo/arco, furtividade, esquiva, reflexos e destrancar.',
      en: 'Firearms/bows, stealth, dodging, reflexes, and lockpicking.',
      fr: 'Armes à distance, furtivité, esquive et réflexes.',
    },
  },
  con: {
    short: { 'pt-BR': 'CON', en: 'CON', fr: 'CON' },
    full: { 'pt-BR': 'Constituição', en: 'Constitution', fr: 'Constitution' },
    hint: {
      'pt-BR': 'Define seu Vigor máximo e resistência a dor, venenos, vírus e exaustão.',
      en: 'Determines max Vigor and resilience to poison, injury, and fatigue.',
      fr: 'Détermine la Vigueur max et l’endurance.',
    },
  },
  int: {
    short: { 'pt-BR': 'INT', en: 'INT', fr: 'INT' },
    full: { 'pt-BR': 'Inteligência', en: 'Intelligence', fr: 'Intelligence' },
    hint: {
      'pt-BR': 'Investigação, hacking, medicina, ciência, arcano e finanças.',
      en: 'Investigation, hacking, medicine, lore, science, and finance.',
      fr: 'Enquête, piratage, médecine, savoir et finance.',
    },
  },
  wis: {
    short: { 'pt-BR': 'SAB', en: 'WIS', fr: 'SAG' },
    full: { 'pt-BR': 'Sabedoria', en: 'Wisdom', fr: 'Sagesse' },
    hint: {
      'pt-BR': 'Percepção, intuição (ler mentiras), sobrevivência e força de vontade.',
      en: 'Perception, insight, survival instincts, and willpower.',
      fr: 'Perception, intuition, survie et volonté.',
    },
  },
  cha: {
    short: { 'pt-BR': 'CAR', en: 'CHA', fr: 'CHA' },
    full: { 'pt-BR': 'Carisma', en: 'Charisma', fr: 'Charisme' },
    hint: {
      'pt-BR': 'Persuasão, blefe, romance, liderança, negociação e intimidação social.',
      en: 'Persuasion, deception, romance, leadership, and negotiation.',
      fr: 'Persuasion, bluff, romance, leadership et négociation.',
    },
  },
};

export const POINT_BUY_BUDGET = 27;
export const POINT_BUY_MIN = 8;
export const POINT_BUY_MAX = 15;

export function getPointBuyCost(score: number): number {
  if (score <= 8) return 0;
  if (score <= 13) return score - 8;
  if (score === 14) return 7;
  if (score >= 15) return 9;
  return 0;
}

export function computePointBuySpent(attrs: CharacterAttributes): number {
  return ATTRIBUTE_KEYS.reduce(
    (sum, key) => sum + getPointBuyCost(attrs[key]),
    0,
  );
}

export function getAttributeModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function xpRequiredForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.min(20, Math.round(level)));
  return 100 * safeLevel + 50 * (safeLevel - 1) * safeLevel;
}

export function computeMaxVigor(
  level: number,
  conScore: number,
  gearMaxVigorBonus = 0,
): number {
  const safeLevel = Math.max(1, Math.round(level));
  const conMod = getAttributeModifier(conScore);
  return Math.max(60, 100 + (safeLevel - 1) * 10 + conMod * 8 + gearMaxVigorBonus);
}

export function getEquippedGearBonuses(inventory: InventoryItem[]): ItemBonuses {
  const total: ItemBonuses = {};
  for (const item of inventory) {
    if (!item.equipped || !item.bonuses) continue;
    for (const key of ATTRIBUTE_KEYS) {
      const val = item.bonuses[key];
      if (typeof val === 'number' && val !== 0) {
        total[key] = (total[key] ?? 0) + val;
      }
    }
    if (typeof item.bonuses.maxVigor === 'number' && item.bonuses.maxVigor !== 0) {
      total.maxVigor = (total.maxVigor ?? 0) + item.bonuses.maxVigor;
    }
  }
  return total;
}

export function getEffectiveAttributes(player: PlayerState): CharacterAttributes {
  const base = player.attributes ?? DEFAULT_ATTRIBUTES;
  const gear = getEquippedGearBonuses(player.inventory ?? []);
  return {
    str: Math.max(1, Math.min(24, (base.str ?? 10) + (gear.str ?? 0))),
    dex: Math.max(1, Math.min(24, (base.dex ?? 10) + (gear.dex ?? 0))),
    con: Math.max(1, Math.min(24, (base.con ?? 10) + (gear.con ?? 0))),
    int: Math.max(1, Math.min(24, (base.int ?? 10) + (gear.int ?? 0))),
    wis: Math.max(1, Math.min(24, (base.wis ?? 10) + (gear.wis ?? 0))),
    cha: Math.max(1, Math.min(24, (base.cha ?? 10) + (gear.cha ?? 0))),
  };
}

export function inferSkillAttribute(skillName: string): AttributeId {
  const s = skillName.toLowerCase();
  if (/(for[cç]a|esgrima|espada|machado|combate corpo|luta|atlet|pesad|sword|melee|brawl)/i.test(s)) {
    return 'str';
  }
  if (/(tiro|pistola|arco|furtiv|ocult|reflex|agil|destranc|arromb|pilot|esquiv|stealth|sneak|aim|firearm|gun)/i.test(s)) {
    return 'dex';
  }
  if (/(vigor|resist|toler|f[oô]lego|endur|fortitude|resilien)/i.test(s)) {
    return 'con';
  }
  if (/(hack|ciber|medicin|alquim|ci[eê]nc|arcan|investig|dedu|forens|engenh|mec[aâ]n|finan|hist[oó]r|cript|tech|intel|magic)/i.test(s)) {
    return 'int';
  }
  if (/(sobreviv|percep|intui|rastre|press[aá]g|vontade|esp[ií]rit|naturez|observ|surv|insight|track|will)/i.test(s)) {
    return 'wis';
  }
  if (/(persuas|carism|l[aá]bia|diplom|blef|engano|intimid|lider|seduz|negoci|barter|social|charm|bluff)/i.test(s)) {
    return 'cha';
  }
  return 'wis';
}

export function syncSkillLevels(
  skills: string[],
  existing?: SkillProgress[],
): SkillProgress[] {
  const map = new Map<string, SkillProgress>();
  if (Array.isArray(existing)) {
    for (const sk of existing) {
      if (!sk?.name?.trim()) continue;
      map.set(sk.name.toLowerCase(), {
        name: sk.name.trim(),
        level: Math.max(1, Math.min(5, Math.round(sk.level || 1))),
        attribute: ATTRIBUTE_KEYS.includes(sk.attribute)
          ? sk.attribute
          : inferSkillAttribute(sk.name),
        xp: Math.max(0, Math.min(99, Math.round(sk.xp || 0))),
      });
    }
  }
  for (const raw of skills) {
    const name = raw?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        name,
        level: 1,
        attribute: inferSkillAttribute(name),
        xp: 0,
      });
    }
  }
  return Array.from(map.values());
}

export function defaultCurrencyForTheme(
  theme: WorldThemeId,
  lang: LanguageId,
): { amount: number; label: string } {
  const map: Record<WorldThemeId, { amount: number; label: Record<LanguageId, string> }> = {
    fantasy: { amount: 80, label: { 'pt-BR': 'Ouro', en: 'Gold', fr: 'Or' } },
    cyberpunk: { amount: 650, label: { 'pt-BR': 'Créditos', en: 'Credits', fr: 'Crédits' } },
    mystery: { amount: 250, label: { 'pt-BR': 'USD', en: 'USD', fr: 'Francs' } },
    zombies: { amount: 400, label: { 'pt-BR': 'USD', en: 'USD', fr: 'EUR' } },
    apocalyptic: { amount: 45, label: { 'pt-BR': 'Sucata', en: 'Scrap', fr: 'Ferraille' } },
  };
  const entry = map[theme] ?? map.fantasy;
  return { amount: entry.amount, label: entry.label[lang] };
}

export function defaultAffinityFromStance(stance: NpcStance): number {
  switch (stance) {
    case 'ally':
      return 45;
    case 'suspicious':
      return -15;
    case 'hostile':
      return -55;
    default:
      return 0;
  }
}

export function deriveRelationshipFromAffinity(
  affinity: number,
  current?: RelationshipTier,
): RelationshipTier {
  if (current === 'partner' && affinity >= 55) return 'partner';
  if (current === 'romance' && affinity >= 45) return 'romance';
  if (affinity <= -50) return 'enemy';
  if (affinity <= -20) return 'rival';
  if (affinity >= 70) return 'close';
  if (affinity >= 35) return 'friend';
  if (affinity >= 10) return 'acquaintance';
  return 'stranger';
}

export function getPresetAttributesForArchetype(
  archetypeId: string,
  theme: WorldThemeId,
): CharacterAttributes {
  const id = archetypeId.toLowerCase();
  if (/(knight|soldier|warrior|mercenary|guard|paladin)/.test(id)) {
    return { str: 15, dex: 12, con: 14, int: 10, wis: 12, cha: 10 };
  }
  if (/(rogue|ranger|assassin|courier|scout|punk|netrunner|hacker|spy)/.test(id)) {
    return { str: 10, dex: 15, con: 12, int: 14, wis: 12, cha: 10 };
  }
  if (/(wizard|witch|scientist|doctor|mage|scholar|detective)/.test(id)) {
    return { str: 8, dex: 12, con: 12, int: 15, wis: 14, cha: 12 };
  }
  if (/(noble|princess|diplomat|bard|broker|cop)/.test(id)) {
    return { str: 10, dex: 12, con: 12, int: 12, wis: 12, cha: 15 };
  }
  if (/(survivor|scavenger|medic)/.test(id)) {
    return { str: 12, dex: 14, con: 14, int: 12, wis: 13, cha: 8 };
  }
  if (theme === 'cyberpunk') {
    return { str: 10, dex: 14, con: 12, int: 14, wis: 12, cha: 11 };
  }
  if (theme === 'mystery') {
    return { str: 10, dex: 12, con: 11, int: 14, wis: 14, cha: 12 };
  }
  return { str: 13, dex: 13, con: 13, int: 11, wis: 12, cha: 11 };
}

export function inferEquipSlotFromCategory(
  category: InventoryItem['category'],
): EquipSlot | undefined {
  if (category === 'weapon') return 'weapon';
  if (category === 'relic') return 'accessory';
  return undefined;
}

export const RARITY_META: Record<
  ItemRarity,
  { label: string; color: string; bg: string }
> = {
  common: { label: 'Comum', color: 'var(--text-secondary)', bg: 'var(--bg-surface)' },
  uncommon: { label: 'Incomum', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.12)' },
  rare: { label: 'Raro', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.14)' },
  epic: { label: 'Épico', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.14)' },
  legendary: { label: 'Lendário', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.16)' },
};

export const EQUIP_SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: 'Arma',
  armor: 'Traje',
  accessory: 'Acessório',
};

export const RELATIONSHIP_META: Record<
  RelationshipTier,
  { label: string; color: string; bg: string }
> = {
  stranger: { label: 'Desconhecido', color: 'var(--text-muted)', bg: 'var(--bg-surface)' },
  acquaintance: { label: 'Conhecido', color: 'var(--text-secondary)', bg: 'var(--bg-surface)' },
  friend: { label: 'Amigo', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.12)' },
  close: { label: 'Próximo', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.14)' },
  romance: { label: 'Romance ♥', color: '#f472b6', bg: 'rgba(244, 114, 182, 0.16)' },
  partner: { label: 'Parceiro(a) ♥', color: '#fb7185', bg: 'rgba(251, 113, 133, 0.18)' },
  rival: { label: 'Rival', color: '#fb923c', bg: 'rgba(251, 146, 60, 0.14)' },
  enemy: { label: 'Inimigo', color: 'var(--danger)', bg: 'rgba(224, 93, 82, 0.16)' },
};

export const LOCATION_KIND_META: Record<
  LocationKind,
  { label: string; color: string }
> = {
  city: { label: 'Cidade', color: 'var(--text-secondary)' },
  safehouse: { label: 'Refúgio', color: 'var(--success)' },
  dungeon: { label: 'Dungeon', color: '#c084fc' },
  secret: { label: 'Secreto', color: '#38bdf8' },
  market: { label: 'Comércio', color: '#fbbf24' },
  wilderness: { label: 'Ermos', color: '#a3e635' },
};

export const LOCATION_STATUS_META: Record<
  LocationStatus,
  { label: string; color: string }
> = {
  unexplored: { label: 'Inexplorado', color: 'var(--warning)' },
  explored: { label: 'Explorado', color: 'var(--text-secondary)' },
  cleared: { label: 'Limpo ✓', color: 'var(--success)' },
};

export const WORLD_PERIOD_ORDER: WorldPeriod[] = [
  'morning',
  'afternoon',
  'evening',
  'night',
];

export const WORLD_PERIOD_META: Record<
  WorldPeriod,
  { label: Record<LanguageId, string>; symbol: string }
> = {
  morning: {
    label: { 'pt-BR': 'Manhã', en: 'Morning', fr: 'Matin' },
    symbol: '☀',
  },
  afternoon: {
    label: { 'pt-BR': 'Tarde', en: 'Afternoon', fr: 'Après-midi' },
    symbol: '◐',
  },
  evening: {
    label: { 'pt-BR': 'Crepúsculo', en: 'Evening', fr: 'Crépuscule' },
    symbol: '◑',
  },
  night: {
    label: { 'pt-BR': 'Noite', en: 'Night', fr: 'Nuit' },
    symbol: '☽',
  },
};

export function defaultWorldClockForTheme(
  theme: WorldThemeId,
  lang: LanguageId = 'pt-BR',
): WorldClock {
  const weatherByTheme: Record<WorldThemeId, Record<LanguageId, string>> = {
    fantasy: { 'pt-BR': 'Névoa Fria', en: 'Cool Mist', fr: 'Brume Froide' },
    cyberpunk: { 'pt-BR': 'Chuva Ácida', en: 'Acid Rain', fr: 'Pluie Acide' },
    mystery: { 'pt-BR': 'Garua Densa', en: 'Coastal Fog', fr: 'Brouillard' },
    zombies: { 'pt-BR': 'Céu Abafado', en: 'Humid Overcast', fr: 'Ciel Lourd' },
    apocalyptic: { 'pt-BR': 'Vento Seco', en: 'Dry Wind', fr: 'Vent Sec' },
  };
  return {
    day: 1,
    period: 'morning',
    weather: weatherByTheme[theme]?.[lang] ?? 'Estável',
  };
}

export function advanceWorldClock(
  clock: WorldClock,
  periods = 1,
  weather?: string,
  countdownDelta?: number,
  setCountdown?: { label: string; daysLeft: number },
): WorldClock {
  const curIdx = WORLD_PERIOD_ORDER.indexOf(clock.period);
  const safeIdx = curIdx >= 0 ? curIdx : 0;
  const totalSteps = safeIdx + Math.max(0, Math.round(periods));
  const daysPassed = Math.floor(totalSteps / WORLD_PERIOD_ORDER.length);
  const nextPeriod = WORLD_PERIOD_ORDER[totalSteps % WORLD_PERIOD_ORDER.length];

  let countdown = clock.countdown ? { ...clock.countdown } : undefined;
  if (setCountdown && setCountdown.label.trim()) {
    countdown = {
      label: setCountdown.label.trim(),
      daysLeft: Math.max(0, Math.round(setCountdown.daysLeft)),
    };
  } else if (countdown) {
    const delta =
      typeof countdownDelta === 'number' ? Math.round(countdownDelta) : -daysPassed;
    countdown.daysLeft = Math.max(0, countdown.daysLeft + delta);
  }

  return {
    day: Math.max(1, clock.day + daysPassed),
    period: nextPeriod,
    weather: weather?.trim() || clock.weather,
    countdown,
  };
}

export function advanceClockToNextMorning(clock: WorldClock): WorldClock {
  const nextDay = clock.day + 1;
  const countdown = clock.countdown
    ? {
        ...clock.countdown,
        daysLeft: Math.max(0, clock.countdown.daysLeft - 1),
      }
    : undefined;
  return {
    ...clock,
    day: nextDay,
    period: 'morning',
    countdown,
  };
}

export function inferNpcAssistAttribute(role: string, notes = ''): AttributeId {
  const text = `${role} ${notes}`.toLowerCase();
  if (/(soldad|guard|guerreir|cavaleir|ferreir|mercen|luta|for[cç]a|knight|warrior|guard)/i.test(text)) {
    return 'str';
  }
  if (/(ladin|arqueir|atirad|batedor|piloto|espia|furtiv|scout|rogue|runner|sniper)/i.test(text)) {
    return 'dex';
  }
  if (/(m[eé]dic|curandeir|cientist|hacker|erudit|mago|engenh|detetive|analist|doctor|mage|scholar|tech)/i.test(text)) {
    return 'int';
  }
  if (/(sobreviv|guia|rastread|cl[eé]rig|ca[cç]ad|druida|ranger|survivor|tracker|priest)/i.test(text)) {
    return 'wis';
  }
  if (/(nobre|comerci|diplomat|bardo|vizinh|jornalist|negoci|l[ií]der|broker|bard|noble|neighbor)/i.test(text)) {
    return 'cha';
  }
  return 'con';
}

export interface StrongholdBlueprintUpgrade {
  id: string;
  name: Record<LanguageId, string>;
  description: Record<LanguageId, string>;
  bonusLabel: Record<LanguageId, string>;
  cost: number;
  defenseGain: number;
}

export const STRONGHOLD_UPGRADE_CATALOG: StrongholdBlueprintUpgrade[] = [
  {
    id: 'barricade',
    name: {
      'pt-BR': 'Defesas & Barricada Reforçada',
      en: 'Reinforced Defenses & Perimeter',
      fr: 'Défenses Renforcées',
    },
    description: {
      'pt-BR': 'Portas blindadas, sentinelas ou trancas rúnicas protegendo o refúgio.',
      en: 'Reinforced doors, wards, or locks shielding your safehouse.',
      fr: 'Portes blindées et verrous protégeant le refuge.',
    },
    bonusLabel: {
      'pt-BR': '+25 Defesa do Refúgio · Menos emboscadas ao descansar',
      en: '+25 Refuge Defense · Safer Long Rests',
      fr: '+25 Défense · Repos plus sûrs',
    },
    cost: 120,
    defenseGain: 25,
  },
  {
    id: 'medbay',
    name: {
      'pt-BR': 'Enfermaria & Estoque de Suprimentos',
      en: 'Medbay & Supply Stockpile',
      fr: 'Infirmerie & Provisions',
    },
    description: {
      'pt-BR': 'Kits médicos, rações, ervas e água limpa para recuperação completa.',
      en: 'Medical kits, rations, herbs, and clean reserves for full recovery.',
      fr: 'Kits médicaux et vivres pour une récupération complète.',
    },
    bonusLabel: {
      'pt-BR': '+25 Vigor extra em todo Descanso Longo',
      en: '+25 extra Vigor on every Long Rest',
      fr: '+25 Vigueur bonus à chaque Repos Long',
    },
    cost: 150,
    defenseGain: 10,
  },
  {
    id: 'training',
    name: {
      'pt-BR': 'Estação de Treino & Estudo',
      en: 'Training & Study Station',
      fr: "Poste d'Entraînement",
    },
    description: {
      'pt-BR': 'Espaço dedicado para praticar técnicas, leitura tática e armas.',
      en: 'Dedicated space to drill combat, craft, magic, or analysis.',
      fr: 'Espace dédié pour progresser plus vite en compétences.',
    },
    bonusLabel: {
      'pt-BR': '+25% progresso em todo Treino de Habilidades',
      en: '+25% faster Skill Training progress',
      fr: '+25% progression en compétences',
    },
    cost: 180,
    defenseGain: 5,
  },
  {
    id: 'workshop',
    name: {
      'pt-BR': 'Oficina & Bancada de Crafting',
      en: 'Workshop & Crafting Bench',
      fr: 'Atelier de Fabrication',
    },
    description: {
      'pt-BR': 'Ferramentas para melhorar equipamentos, forjar munição ou alquimia.',
      en: 'Tools to upgrade gear, brew tonics, or forge custom equipment.',
      fr: 'Outils pour forger et améliorer vos équipements.',
    },
    bonusLabel: {
      'pt-BR': '+15 Defesa · Desbloqueia melhorias de itens na narrativa',
      en: '+15 Defense · Unlocks gear upgrades in narration',
      fr: '+15 Défense · Améliorations d’objets en récit',
    },
    cost: 220,
    defenseGain: 15,
  },
];

export function defaultStrongholdForTheme(
  theme: WorldThemeId,
  location: string,
  lang: LanguageId = 'pt-BR',
): StrongholdState {
  const names: Record<WorldThemeId, Record<LanguageId, string>> = {
    fantasy: { 'pt-BR': 'Acampamento & Abrigo', en: 'Camp & Sanctuary', fr: 'Campement & Refuge' },
    cyberpunk: { 'pt-BR': 'Esconderijo Seguro', en: 'Safehouse Loft', fr: 'Planque Sécurisée' },
    mystery: { 'pt-BR': 'Escritório & Base', en: 'Study & Base', fr: 'Bureau & Base' },
    zombies: { 'pt-BR': 'Refúgio Fortificado', en: 'Fortified Safehouse', fr: 'Refuge Fortifié' },
    apocalyptic: { 'pt-BR': 'Bunker & Posto Avançado', en: 'Bunker & Outpost', fr: 'Bunker & Avant-poste' },
  };
  return {
    name: names[theme]?.[lang] ?? 'Refúgio',
    location: location || 'Base Inicial',
    defense: 20,
    upgrades: [],
  };
}
