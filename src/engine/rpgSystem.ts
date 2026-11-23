import type {
  ActionIntent,
  AttributeId,
  BaseSupplies,
  CharacterAttributes,
  EquipSlot,
  InventoryItem,
  ItemBonuses,
  ItemRarity,
  ItemStorageLocation,
  LanguageId,
  LocationKind,
  LocationStatus,
  NpcStance,
  PlayerState,
  RelationshipTier,
  SkillProgress,
  StrongholdState,
  SupplyType,
  TimeAdvanceMode,
  WeatherType,
  WorldClock,
  WorldPeriod,
  WorldThemeId,
} from '../types/game';

export const MAX_INSPIRATION = 4;
export const MAX_PARTY_SIZE = 3;
export const MAX_SHORT_RESTS_PER_DAY = 2;

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
  name = '',
): EquipSlot | undefined {
  const n = name.toLowerCase();
  if (/(capacete|elmo|[oó]culos|visor|m[aá]scara|chap[eé]u|capuz|helm|goggles|mask|hat)/i.test(n)) {
    return 'head';
  }
  if (/(armadura|colete|jaqueta|casaco|manto|traje|cota|armor|vest|jacket|cloak|coat)/i.test(n)) {
    return 'armor';
  }
  if (/(escudo|lanterna|adaga|faca|r[aá]dio|cyberdeck|smartphone|celular|shield|torch|dagger|radio|phone)/i.test(n)) {
    return 'offhand';
  }
  if (/(mochila|bolsa|cinto|kit|pack|bag|belt|medkit)/i.test(n)) {
    return 'utility';
  }
  if (category === 'weapon') return 'weapon';
  if (category === 'relic') return 'accessory';
  if (category === 'tool') return 'utility';
  return undefined;
}

export const ALL_EQUIP_SLOTS: EquipSlot[] = [
  'weapon',
  'offhand',
  'head',
  'armor',
  'accessory',
  'utility',
];

export const EQUIP_SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: 'Arma Principal',
  offhand: 'Secundária',
  head: 'Cabeça',
  armor: 'Traje / Armadura',
  accessory: 'Acessório',
  utility: 'Utilidade',
};

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

export const WEATHER_KEYS: WeatherType[] = [
  'clear',
  'cloudy',
  'rain',
  'storm',
  'fog',
  'heatwave',
  'snow',
  'ash',
];

export const WEATHER_META: Record<
  WeatherType,
  {
    label: Record<LanguageId, string>;
    color: string;
    effectHint: Record<LanguageId, string>;
  }
> = {
  clear: {
    label: { 'pt-BR': 'Céu Limpo', en: 'Clear Sky', fr: 'Ciel Clair' },
    color: '#fbbf24',
    effectHint: {
      'pt-BR': 'Boa visibilidade (+1 Percepção/SAB ao ar livre).',
      en: 'Clear visibility (+1 Perception/WIS outdoors).',
      fr: 'Bonne visibilité (+1 Perception).',
    },
  },
  cloudy: {
    label: { 'pt-BR': 'Nublado', en: 'Overcast', fr: 'Couvert' },
    color: '#94a3b8',
    effectHint: {
      'pt-BR': 'Clima estável, sem penalidades.',
      en: 'Steady weather, no penalties.',
      fr: 'Temps stable, aucun malus.',
    },
  },
  rain: {
    label: { 'pt-BR': 'Chuva', en: 'Rain', fr: 'Pluie' },
    color: '#38bdf8',
    effectHint: {
      'pt-BR': 'Abafa passos (+1 Furtividade/DES), pistas na lama.',
      en: 'Masks footsteps (+1 Stealth/DEX), muddy tracks.',
      fr: 'Masque les pas (+1 Discrétion/DEX).',
    },
  },
  storm: {
    label: { 'pt-BR': 'Tempestade', en: 'Storm', fr: 'Tempête' },
    color: '#818cf8',
    effectHint: {
      'pt-BR': 'Trovões e ventania (+1 Furtividade, -1 ataques/viagem exposta).',
      en: 'Thunder & gales (+1 Stealth, -1 exposed checks).',
      fr: 'Orage intense (+1 Discrétion, -1 actions exposées).',
    },
  },
  fog: {
    label: { 'pt-BR': 'Neblina Densa', en: 'Dense Fog', fr: 'Brouillard' },
    color: '#cbd5e1',
    effectHint: {
      'pt-BR': 'Cobertura visual (+2 Furtividade, -1 Percepção à distância).',
      en: 'Heavy cover (+2 Stealth, -1 distant spotting).',
      fr: 'Forte couverture (+2 Discrétion).',
    },
  },
  heatwave: {
    label: { 'pt-BR': 'Calor Extremo', en: 'Heatwave', fr: 'Canicule' },
    color: '#fb923c',
    effectHint: {
      'pt-BR': 'Sol intenso (-1 testes físicos longos sem água/CON).',
      en: 'Scorching heat (-1 strenuous CON checks without water).',
      fr: 'Chaleur accablante (-1 endurance).',
    },
  },
  snow: {
    label: { 'pt-BR': 'Neve / Frio', en: 'Snow / Frost', fr: 'Neige / Froid' },
    color: '#bae6fd',
    effectHint: {
      'pt-BR': 'Pegadas visíveis (+1 Rastreamento/SAB, exige abrigo).',
      en: 'Fresh tracks (+1 Tracking/WIS, shelter matters).',
      fr: 'Traces fraîches (+1 Pistage/SAG).',
    },
  },
  ash: {
    label: { 'pt-BR': 'Cinzas & Poeira', en: 'Ash & Dust', fr: 'Cendres' },
    color: '#a8a29e',
    effectHint: {
      'pt-BR': 'Ar denso (+1 Furtividade, -1 CON sem máscara).',
      en: 'Choking air (+1 Stealth, -1 CON without mask).',
      fr: 'Air lourd (+1 Discrétion, -1 CON).',
    },
  },
};

export const TIME_ADVANCE_MODE_META: Record<
  TimeAdvanceMode,
  { label: string; desc: string }
> = {
  ai_auto: {
    label: 'Automático (IA)',
    desc: 'A IA estima quantos minutos ou horas passaram em cada ação.',
  },
  fixed_step: {
    label: 'Passo Fixo',
    desc: 'Cada turno avança exatamente o intervalo que você escolher.',
  },
  manual: {
    label: 'Manual',
    desc: 'O relógio só anda quando você avançar aqui ou descansar.',
  },
};

export function derivePeriodFromHour(hour: number): WorldPeriod {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  if (h >= 18 && h < 21) return 'evening';
  return 'night';
}

export function defaultHourForPeriod(period: WorldPeriod): number {
  switch (period) {
    case 'morning':
      return 8;
    case 'afternoon':
      return 14;
    case 'evening':
      return 19;
    case 'night':
      return 22;
  }
}

export function formatClockTime(hour = 8, minute = 0): string {
  const h = String(((Math.floor(hour) % 24) + 24) % 24).padStart(2, '0');
  const m = String(((Math.floor(minute) % 60) + 60) % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export function inferWeatherTypeFromText(
  text: string,
  fallback: WeatherType = 'cloudy',
): WeatherType {
  const t = text.toLowerCase();
  if (/(tempestad|trov|raio|furac|storm|thunder|lightning)/i.test(t)) return 'storm';
  if (/(chuv|garoa|garua|rain|drizzle|downpour)/i.test(t)) return 'rain';
  if (/(neblin|n[eé]voa|brum|fog|mist)/i.test(t)) return 'fog';
  if (/(neve|geada|frio|nev|snow|frost|blizzard)/i.test(t)) return 'snow';
  if (/(calor|sol\s+escald|abafad|seca|heat|scorch|humid)/i.test(t)) return 'heatwave';
  if (/(cinz|poeir|fuma[cç]|t[oó]xic|ash|dust|smog)/i.test(t)) return 'ash';
  if (/(limp|ensolarad|estrelad|claro|clear|sunny)/i.test(t)) return 'clear';
  if (/(nublad|cinzent|overcast|cloud)/i.test(t)) return 'cloudy';
  return fallback;
}

export function getWeatherRollModifier(
  weatherType: WeatherType | undefined,
  attribute: AttributeId,
  intent: ActionIntent,
): { mod: number; label?: string } {
  if (!weatherType) return { mod: 0 };
  if (weatherType === 'fog' && intent === 'stealth') {
    return { mod: 2, label: 'Neblina' };
  }
  if ((weatherType === 'rain' || weatherType === 'storm' || weatherType === 'ash') && intent === 'stealth') {
    return { mod: 1, label: WEATHER_META[weatherType].label['pt-BR'] };
  }
  if (weatherType === 'clear' && attribute === 'wis' && intent === 'investigate') {
    return { mod: 1, label: 'Céu Limpo' };
  }
  if (weatherType === 'snow' && attribute === 'wis' && intent === 'investigate') {
    return { mod: 1, label: 'Pegadas na Neve' };
  }
  if (weatherType === 'storm' && intent === 'bold') {
    return { mod: -1, label: 'Tempestade' };
  }
  if ((weatherType === 'heatwave' || weatherType === 'ash') && attribute === 'con' && intent === 'survival') {
    return { mod: -1, label: WEATHER_META[weatherType].label['pt-BR'] };
  }
  return { mod: 0 };
}

export function defaultWorldClockForTheme(
  theme: WorldThemeId,
  lang: LanguageId = 'pt-BR',
): WorldClock {
  const weatherByTheme: Record<WorldThemeId, WeatherType> = {
    fantasy: 'fog',
    cyberpunk: 'rain',
    mystery: 'fog',
    zombies: 'heatwave',
    apocalyptic: 'ash',
  };
  const wt = weatherByTheme[theme] ?? 'clear';
  return {
    day: 1,
    hour: 8,
    minute: 30,
    period: 'morning',
    weatherType: wt,
    weather: WEATHER_META[wt].label[lang],
    advanceMode: 'ai_auto',
    fixedStepMinutes: 15,
    shortRestsUsedToday: 0,
  };
}

export function advanceClockByMinutes(
  clock: WorldClock,
  minutesToAdd: number,
  options?: {
    weatherType?: WeatherType;
    weather?: string;
    countdownDelta?: number;
    setCountdown?: { label: string; daysLeft: number };
    lang?: LanguageId;
  },
): WorldClock {
  const curHour =
    typeof clock.hour === 'number' ? clock.hour : defaultHourForPeriod(clock.period);
  const curMin = typeof clock.minute === 'number' ? clock.minute : 0;
  const totalMinutes = curHour * 60 + curMin + Math.max(0, Math.round(minutesToAdd));
  const daysPassed = Math.floor(totalMinutes / (24 * 60));
  const remMinutes = totalMinutes % (24 * 60);
  const nextHour = Math.floor(remMinutes / 60);
  const nextMinute = remMinutes % 60;
  const nextPeriod = derivePeriodFromHour(nextHour);

  let countdown = clock.countdown ? { ...clock.countdown } : undefined;
  if (options?.setCountdown && options.setCountdown.label.trim()) {
    countdown = {
      label: options.setCountdown.label.trim(),
      daysLeft: Math.max(0, Math.round(options.setCountdown.daysLeft)),
    };
  } else if (countdown) {
    const delta =
      typeof options?.countdownDelta === 'number'
        ? Math.round(options.countdownDelta)
        : -daysPassed;
    countdown.daysLeft = Math.max(0, countdown.daysLeft + delta);
  }

  const nextWeatherType: WeatherType =
    options?.weatherType ??
    (options?.weather
      ? inferWeatherTypeFromText(options.weather, clock.weatherType ?? 'cloudy')
      : clock.weatherType ?? 'cloudy');
  const nextWeatherLabel =
    options?.weather?.trim() ||
    (options?.weatherType
      ? WEATHER_META[options.weatherType].label[options.lang ?? 'pt-BR']
      : clock.weather);

  return {
    ...clock,
    day: Math.max(1, clock.day + daysPassed),
    hour: nextHour,
    minute: nextMinute,
    period: nextPeriod,
    weatherType: nextWeatherType,
    weather: nextWeatherLabel,
    shortRestsUsedToday: daysPassed > 0 ? 0 : (clock.shortRestsUsedToday ?? 0),
    countdown,
  };
}

export function advanceWorldClock(
  clock: WorldClock,
  periods = 1,
  weather?: string,
  countdownDelta?: number,
  setCountdown?: { label: string; daysLeft: number },
  weatherType?: WeatherType,
  lang: LanguageId = 'pt-BR',
): WorldClock {
  return advanceClockByMinutes(clock, Math.max(0, Math.round(periods)) * 180, {
    weather,
    weatherType,
    countdownDelta,
    setCountdown,
    lang,
  });
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
    hour: 7,
    minute: 30,
    period: 'morning',
    shortRestsUsedToday: 0,
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

export function defaultNpcAttributes(
  assistAttribute: AttributeId,
): CharacterAttributes {
  const base: CharacterAttributes = {
    str: 10,
    dex: 11,
    con: 11,
    int: 11,
    wis: 11,
    cha: 11,
  };
  base[assistAttribute] = 15;
  if (assistAttribute === 'cha') base.wis = 13;
  else if (assistAttribute === 'int') base.wis = 13;
  else if (assistAttribute === 'dex') base.wis = 12;
  else if (assistAttribute === 'str') base.con = 14;
  else if (assistAttribute === 'wis') base.int = 12;
  else base.str = 12;
  return base;
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

export const SUPPLY_KEYS: SupplyType[] = [
  'ammo',
  'fuel',
  'food',
  'meds',
  'materials',
];

export function getSupplyMetaForTheme(
  theme: WorldThemeId,
): Record<SupplyType, { label: string; unit: string; color: string; maxBar: number }> {
  if (theme === 'fantasy') {
    return {
      ammo: { label: 'Flechas & Cargas', unit: 'un.', color: '#fbbf24', maxBar: 100 },
      fuel: { label: 'Óleo & Lenha', unit: 'un.', color: '#fb923c', maxBar: 30 },
      food: { label: 'Rações & Água', unit: 'dias', color: '#4ade80', maxBar: 30 },
      meds: { label: 'Poções & Ervas', unit: 'doses', color: '#f472b6', maxBar: 20 },
      materials: { label: 'Minério & Peças', unit: 'un.', color: '#94a3b8', maxBar: 50 },
    };
  }
  return {
    ammo: { label: 'Munição', unit: 'un.', color: '#fbbf24', maxBar: 200 },
    fuel: { label: 'Combustível', unit: 'gal.', color: '#fb923c', maxBar: 30 },
    food: { label: 'Comida & Água', unit: 'dias', color: '#4ade80', maxBar: 30 },
    meds: { label: 'Medicina', unit: 'kits', color: '#f472b6', maxBar: 20 },
    materials: { label: 'Materiais & Peças', unit: 'un.', color: '#60a5fa', maxBar: 50 },
  };
}

export function defaultBaseSuppliesForTheme(theme: WorldThemeId): BaseSupplies {
  if (theme === 'fantasy') {
    return { ammo: 20, fuel: 4, food: 7, meds: 3, materials: 10 };
  }
  return { ammo: 0, fuel: 0, food: 3, meds: 1, materials: 5 };
}

export function isVehicleLikeItem(name: string): boolean {
  return /\b(caminhonete|ford\s+f-?\d+|carro|ve[ií]culo|moto|motocicleta|jipe|van|barco|lancha|cavalo|montaria|carro[cç]a|nave|helic[oó]ptero|pickup|truck|car\b|jeep|motorcycle|boat|horse|ship)\b/i.test(
    name,
  );
}

export function inferItemStorage(
  name: string,
  category: InventoryItem['category'],
  quantity = 1,
): ItemStorageLocation {
  const n = name.toLowerCase();
  if (isVehicleLikeItem(n)) return 'base';
  if (
    /\b(lote|estoque|gal[aã]o|gal[oõ]es|combust[ií]vel|gasolina|diesel|muni[cç][aã]o|provis[oõ]es|mantas?\s+solares?|pain[eé]l\s+solar|gerador|filtros?\s+de\s+[aá]gua|ferragens|correntes?\s+de\s+ancoragem|barril|caixa\s+de|suprimentos|enlatad|crate|stockpile|fuel|ammo|generator|solar\s+panel)\b/i.test(
      n,
    )
  ) {
    return 'base';
  }
  if (quantity >= 5 && (category === 'misc' || category === 'consumable')) {
    return 'base';
  }
  return 'carry';
}

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
    supplies: defaultBaseSuppliesForTheme(theme),
    vehicles: [],
  };
}
