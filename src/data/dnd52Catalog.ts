import type {
  ArmorCategory,
  AttributeId,
  DndBackgroundId,
  DndClassId,
  DndConditionId,
  DndDamageType,
  DndItemStats,
  DndSkillId,
  DndSpeciesId,
  WeaponMasteryId,
  WorldThemeId,
} from '../types/game';

/**
 * Verbatim Creative Commons CC-BY-4.0 Attribution Notice for SRD 5.2 (Wizards of the Coast LLC).
 */
export const SRD_52_ATTRIBUTION_NOTICE =
  'This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.';

export const STANDARD_ARRAY: readonly number[] = [15, 14, 13, 12, 10, 8];

/**
 * Official D&D 5e (2024 / SRD 5.2) per-level XP delta table (Levels 1 -> 20).
 * Cumulative milestones: 0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000,
 * 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000.
 * Stored as per-level deltas so `xp -= xpToNextLevel` aligns cleanly with the UI XP bar.
 */
export const DND_XP_DELTAS: readonly number[] = [
  300, // Lv 1 -> 2 (300)
  600, // Lv 2 -> 3 (900)
  1800, // Lv 3 -> 4 (2,700)
  3800, // Lv 4 -> 5 (6,500)
  7500, // Lv 5 -> 6 (14,000)
  9000, // Lv 6 -> 7 (23,000)
  11000, // Lv 7 -> 8 (34,000)
  14000, // Lv 8 -> 9 (48,000)
  16000, // Lv 9 -> 10 (64,000)
  21000, // Lv 10 -> 11 (85,000)
  15000, // Lv 11 -> 12 (100,000)
  20000, // Lv 12 -> 13 (120,000)
  20000, // Lv 13 -> 14 (140,000)
  25000, // Lv 14 -> 15 (165,000)
  30000, // Lv 15 -> 16 (195,000)
  30000, // Lv 16 -> 17 (225,000)
  40000, // Lv 17 -> 18 (265,000)
  40000, // Lv 18 -> 19 (305,000)
  50000, // Lv 19 -> 20 (355,000)
  50000, // Lv 20 cap
];

/**
 * Official DMG 2024 per-PC Encounter XP Budget (Low / Moderate / High) by Level (1..20).
 */
export const DMG_2024_XP_BUDGET: Record<number, { low: number; moderate: number; high: number }> = {
  1: { low: 50, moderate: 75, high: 100 },
  2: { low: 100, moderate: 150, high: 200 },
  3: { low: 150, moderate: 225, high: 400 },
  4: { low: 250, moderate: 375, high: 500 },
  5: { low: 500, moderate: 750, high: 1100 },
  6: { low: 600, moderate: 1000, high: 1400 },
  7: { low: 750, moderate: 1300, high: 1700 },
  8: { low: 1000, moderate: 1700, high: 2100 },
  9: { low: 1300, moderate: 2000, high: 2600 },
  10: { low: 1600, moderate: 2300, high: 3100 },
  11: { low: 1900, moderate: 2900, high: 4100 },
  12: { low: 2200, moderate: 3700, high: 4700 },
  13: { low: 2600, moderate: 4200, high: 5400 },
  14: { low: 2900, moderate: 4900, high: 6200 },
  15: { low: 3300, moderate: 5400, high: 7800 },
  16: { low: 3800, moderate: 6100, high: 9800 },
  17: { low: 4500, moderate: 7200, high: 11700 },
  18: { low: 5000, moderate: 8700, high: 14200 },
  19: { low: 5500, moderate: 10700, high: 17200 },
  20: { low: 6400, moderate: 13200, high: 22000 },
};

/** Official SRD 5.2 CR -> XP reward lookup */
export const SRD_CR_XP: Array<{ cr: number; xp: number }> = [
  { cr: 0, xp: 10 },
  { cr: 0.125, xp: 25 },
  { cr: 0.25, xp: 50 },
  { cr: 0.5, xp: 100 },
  { cr: 1, xp: 200 },
  { cr: 2, xp: 450 },
  { cr: 3, xp: 700 },
  { cr: 4, xp: 1100 },
  { cr: 5, xp: 1800 },
  { cr: 6, xp: 2300 },
  { cr: 7, xp: 2900 },
  { cr: 8, xp: 3900 },
  { cr: 9, xp: 5000 },
  { cr: 10, xp: 5900 },
  { cr: 11, xp: 7200 },
  { cr: 12, xp: 8400 },
  { cr: 13, xp: 10000 },
  { cr: 14, xp: 11500 },
  { cr: 15, xp: 13000 },
  { cr: 16, xp: 15000 },
  { cr: 17, xp: 18000 },
  { cr: 18, xp: 20000 },
  { cr: 19, xp: 22000 },
  { cr: 20, xp: 25000 },
];

export const OFFICIAL_DC_LADDER = [
  { dc: 5, label: 'Muito Fácil' },
  { dc: 10, label: 'Fácil' },
  { dc: 15, label: 'Médio' },
  { dc: 20, label: 'Difícil' },
  { dc: 25, label: 'Muito Difícil' },
  { dc: 30, label: 'Quase Impossível' },
] as const;

export interface ThemedName {
  label: string;
  shortLabel: string; // <= 12 chars for crisp mobile pills
}

export interface DndSkillMeta {
  id: DndSkillId;
  attribute: AttributeId;
  label: string;
  shortLabel: string;
  themed?: Partial<Record<WorldThemeId, ThemedName>>;
}

export const DND_SKILLS: Record<DndSkillId, DndSkillMeta> = {
  acrobatics: { id: 'acrobatics', attribute: 'dex', label: 'Acrobacia', shortLabel: 'Acrobacia' },
  animal_handling: {
    id: 'animal_handling',
    attribute: 'wis',
    label: 'Adestrar Animais',
    shortLabel: 'Animais',
    themed: {
      cyberpunk: { label: 'Drones & Veículos', shortLabel: 'Drones' },
      zombies: { label: 'Trato & Veículos', shortLabel: 'Veículos' },
      apocalyptic: { label: 'Feras & Motores', shortLabel: 'Motores' },
    },
  },
  arcana: {
    id: 'arcana',
    attribute: 'int',
    label: 'Arcanismo',
    shortLabel: 'Arcanismo',
    themed: {
      cyberpunk: { label: 'Sistemas & Net', shortLabel: 'Net/Hack' },
      mystery: { label: 'Ocultismo & Cifras', shortLabel: 'Ocultismo' },
      zombies: { label: 'Ciência & Patógenos', shortLabel: 'Ciência' },
      apocalyptic: { label: 'Tecnologia Antiga', shortLabel: 'Tec. Antiga' },
    },
  },
  athletics: { id: 'athletics', attribute: 'str', label: 'Atletismo', shortLabel: 'Atletismo' },
  deception: { id: 'deception', attribute: 'cha', label: 'Enganação', shortLabel: 'Enganação' },
  history: { id: 'history', attribute: 'int', label: 'História', shortLabel: 'História' },
  insight: { id: 'insight', attribute: 'wis', label: 'Intuição', shortLabel: 'Intuição' },
  intimidation: { id: 'intimidation', attribute: 'cha', label: 'Intimidação', shortLabel: 'Intimid.' },
  investigation: { id: 'investigation', attribute: 'int', label: 'Investigação', shortLabel: 'Investig.' },
  medicine: { id: 'medicine', attribute: 'wis', label: 'Medicina', shortLabel: 'Medicina' },
  nature: { id: 'nature', attribute: 'int', label: 'Natureza', shortLabel: 'Natureza' },
  perception: { id: 'perception', attribute: 'wis', label: 'Percepção', shortLabel: 'Percepção' },
  performance: { id: 'performance', attribute: 'cha', label: 'Atuação', shortLabel: 'Atuação' },
  persuasion: { id: 'persuasion', attribute: 'cha', label: 'Persuasão', shortLabel: 'Persuasão' },
  religion: {
    id: 'religion',
    attribute: 'int',
    label: 'Religião',
    shortLabel: 'Religião',
    themed: {
      cyberpunk: { label: 'Cultura Corp & Cultos', shortLabel: 'Cult. Corp' },
      mystery: { label: 'Teologia & Seitas', shortLabel: 'Seitas' },
      zombies: { label: 'Ética & Facções', shortLabel: 'Facções' },
      apocalyptic: { label: 'Crenças dos Ermos', shortLabel: 'Crenças' },
    },
  },
  sleight_of_hand: { id: 'sleight_of_hand', attribute: 'dex', label: 'Prestidigitação', shortLabel: 'Destreza' },
  stealth: { id: 'stealth', attribute: 'dex', label: 'Furtividade', shortLabel: 'Furtivid.' },
  survival: { id: 'survival', attribute: 'wis', label: 'Sobrevivência', shortLabel: 'Sobreviv.' },
};

export const DND_SKILL_LIST: DndSkillMeta[] = Object.values(DND_SKILLS);

export interface DndConditionMeta {
  id: DndConditionId;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  summary: string;
  attackDisadvantage?: boolean;
  attacksAgainstAdvantage?: boolean;
  meleeAgainstAdvantage?: boolean;
  rangedAgainstDisadvantage?: boolean;
  abilityCheckDisadvantage?: boolean;
  autoFailStrDexSaves?: boolean;
  meleeHitsAutoCrit?: boolean;
  incapacitated?: boolean;
  breaksConcentration?: boolean;
  speedZero?: boolean;
}

export const DND_CONDITIONS: Record<DndConditionId, DndConditionMeta> = {
  blinded: {
    id: 'blinded',
    label: 'Cego',
    shortLabel: 'Cego',
    icon: '👁️',
    color: '#94a3b8',
    summary: 'Desvantagem em ataques; ataques contra ele têm Vantagem.',
    attackDisadvantage: true,
    attacksAgainstAdvantage: true,
  },
  charmed: {
    id: 'charmed',
    label: 'Enfeitiçado',
    shortLabel: 'Enfeit.',
    icon: '💜',
    color: '#e879f9',
    summary: 'Não pode atacar o encantador; encantador tem Vantagem social.',
  },
  deafened: {
    id: 'deafened',
    label: 'Surdo',
    shortLabel: 'Surdo',
    icon: '🔇',
    color: '#94a3b8',
    summary: 'Falha automática em testes dependentes de audição.',
  },
  frightened: {
    id: 'frightened',
    label: 'Amedrontado',
    shortLabel: 'Medo',
    icon: '😱',
    color: '#c084fc',
    summary: 'Desvantagem em ataques e testes enquanto vir a fonte do medo.',
    attackDisadvantage: true,
    abilityCheckDisadvantage: true,
  },
  grappled: {
    id: 'grappled',
    label: 'Agarrado',
    shortLabel: 'Agarr.',
    icon: '✊',
    color: '#fb923c',
    summary: 'Deslocamento reduzido a 0; não pode mudar de coluna.',
    speedZero: true,
  },
  incapacitated: {
    id: 'incapacitated',
    label: 'Incapacitado',
    shortLabel: 'Incap.',
    icon: '💫',
    color: '#fbbf24',
    summary: 'Sem Ações, Bônus ou Reações; perde Concentração.',
    incapacitated: true,
    breaksConcentration: true,
  },
  invisible: {
    id: 'invisible',
    label: 'Invisível',
    shortLabel: 'Invis.',
    icon: '👻',
    color: '#38bdf8',
    summary: 'Vantagem em ataques e Iniciativa; ataques contra ele têm Desvantagem.',
  },
  paralyzed: {
    id: 'paralyzed',
    label: 'Paralisado',
    shortLabel: 'Paral.',
    icon: '⚡',
    color: '#facc15',
    summary: 'Incapacitado, falha FOR/DES, ataques têm Vantagem e corpo a corpo é Crítico.',
    incapacitated: true,
    breaksConcentration: true,
    autoFailStrDexSaves: true,
    attacksAgainstAdvantage: true,
    meleeHitsAutoCrit: true,
    speedZero: true,
  },
  petrified: {
    id: 'petrified',
    label: 'Petrificado',
    shortLabel: 'Petrif.',
    icon: '🪨',
    color: '#94a3b8',
    summary: 'Transformado em pedra; incapacitado, resistência a todo dano.',
    incapacitated: true,
    breaksConcentration: true,
    autoFailStrDexSaves: true,
    attacksAgainstAdvantage: true,
    speedZero: true,
  },
  poisoned: {
    id: 'poisoned',
    label: 'Envenenado',
    shortLabel: 'Veneno',
    icon: '☠️',
    color: '#84cc16',
    summary: 'Desvantagem em rolagens de ataque e testes de habilidade.',
    attackDisadvantage: true,
    abilityCheckDisadvantage: true,
  },
  prone: {
    id: 'prone',
    label: 'Caído',
    shortLabel: 'Caído',
    icon: '⬇️',
    color: '#fbbf24',
    summary: 'Desvantagem em ataques; Vantagem corpo a corpo (VAN) contra ele, Desvantagem à distância.',
    attackDisadvantage: true,
    meleeAgainstAdvantage: true,
    rangedAgainstDisadvantage: true,
  },
  restrained: {
    id: 'restrained',
    label: 'Imobilizado',
    shortLabel: 'Imob.',
    icon: '⛓️',
    color: '#f97316',
    summary: 'Deslocamento 0, Desvantagem em ataques e DES; ataques contra ele têm Vantagem.',
    attackDisadvantage: true,
    attacksAgainstAdvantage: true,
    speedZero: true,
  },
  stunned: {
    id: 'stunned',
    label: 'Atordoado',
    shortLabel: 'Atord.',
    icon: '💥',
    color: '#fbbf24',
    summary: 'Incapacitado, falha em FOR/DES; ataques contra ele têm Vantagem.',
    incapacitated: true,
    breaksConcentration: true,
    autoFailStrDexSaves: true,
    attacksAgainstAdvantage: true,
    speedZero: true,
  },
  unconscious: {
    id: 'unconscious',
    label: 'Inconsciente',
    shortLabel: 'Incons.',
    icon: '💀',
    color: '#ef4444',
    summary: '0 PV / Caído / Incapacitado; rola Testes Contra a Morte (CD 10).',
    incapacitated: true,
    breaksConcentration: true,
    autoFailStrDexSaves: true,
    attacksAgainstAdvantage: true,
    meleeHitsAutoCrit: true,
    speedZero: true,
  },
};

export interface WeaponMasteryMeta {
  id: WeaponMasteryId;
  label: string;
  shortLabel: string;
  summary: string;
}

export const DND_WEAPON_MASTERIES: Record<WeaponMasteryId, WeaponMasteryMeta> = {
  cleave: {
    id: 'cleave',
    label: 'Transpassar',
    shortLabel: 'Transp.',
    summary: '1×/turno: ao acertar corpo a corpo, atinge um 2º inimigo adjacente (dado da arma, sem mod).',
  },
  graze: {
    id: 'graze',
    label: 'Raspão',
    shortLabel: 'Raspão',
    summary: 'Mesmo se errar o ataque, causa dano igual ao seu modificador de atributo (mín. 0).',
  },
  nick: {
    id: 'nick',
    label: 'Ágil',
    shortLabel: 'Ágil',
    summary: '1×/turno com 2 armas leves: golpe extra na Ação sem gastar sua Ação Bônus.',
  },
  push: {
    id: 'push',
    label: 'Empurrar',
    shortLabel: 'Empurrar',
    summary: 'Ao acertar, empurra o alvo 1 coluna para trás na grade tática (VAN → CEN → RET).',
  },
  sap: {
    id: 'sap',
    label: 'Minar',
    shortLabel: 'Minar',
    summary: 'Ao acertar, impõe Desvantagem na próxima rolagem de ataque do alvo.',
  },
  slow: {
    id: 'slow',
    label: 'Lentidão',
    shortLabel: 'Lento',
    summary: 'Ao acertar, reduz o deslocamento e pressão do alvo até seu próximo turno.',
  },
  topple: {
    id: 'topple',
    label: 'Derrubar',
    shortLabel: 'Derrubar',
    summary: 'Alvo faz Salvaguarda de CON (CD 8 + PB + mod) ou fica Caído.',
  },
  vex: {
    id: 'vex',
    label: 'Afligir',
    shortLabel: 'Afligir',
    summary: 'Ao causar dano, ganha Vantagem no próximo ataque contra o mesmo alvo.',
  },
};

export interface DndSubclassMeta {
  id: string;
  classId: DndClassId;
  label: string;
  source: 'srd52' | 'mythos';
  summary: string;
  bonusFeatureLabel: string;
}

export interface DndClassMeta {
  id: DndClassId;
  label: string;
  shortLabel: string;
  hitDie: 6 | 8 | 10 | 12;
  primaryAbilities: AttributeId[];
  savingThrows: [AttributeId, AttributeId];
  armorProficiencies: ArmorCategory[];
  weaponMasteryCount: number; // 0 for non-mastery classes in 2024
  skillChoicesCount: number;
  allowedSkills: DndSkillId[];
  casterType: 'full' | 'half' | 'pact' | 'none';
  spellcastingAbility?: AttributeId;
  asiLevels: number[];
  extraAttackLevel?: number;
  defaultSprite: 'knight' | 'rogue' | 'mage' | 'ranger' | 'cyber_ronin' | 'netrunner' | 'detective' | 'survivor';
  defaultWeapon: { name: string; stats: DndItemStats };
  defaultArmor?: { name: string; stats: DndItemStats };
  defaultShield?: boolean;
  defaultCantrips: string[];
  defaultSpells: string[];
  defaultSkills: DndSkillId[];
  summary: string;
  subclasses: DndSubclassMeta[];
  themed: Record<WorldThemeId, ThemedName>;
}

export const DND_CLASSES: Record<DndClassId, DndClassMeta> = {
  fighter: {
    id: 'fighter',
    label: 'Guerreiro',
    shortLabel: 'Guerreiro',
    hitDie: 10,
    primaryAbilities: ['str', 'con'],
    savingThrows: ['str', 'con'],
    armorProficiencies: ['light', 'medium', 'heavy', 'shield'],
    weaponMasteryCount: 3,
    skillChoicesCount: 2,
    allowedSkills: ['acrobatics', 'animal_handling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'persuasion', 'survival'],
    casterType: 'none',
    asiLevels: [4, 6, 8, 12, 14, 16, 19],
    extraAttackLevel: 5,
    defaultSprite: 'knight',
    defaultWeapon: {
      name: 'Espada Longa de Aço',
      stats: { weaponDice: '1d8', versatileDice: '1d10', damageType: 'slashing', properties: ['versatile'], mastery: 'sap' },
    },
    defaultArmor: {
      name: 'Cota de Malha',
      stats: { armorCategory: 'heavy', armorBaseAc: 16, strReq: 13, stealthDisadvantage: true },
    },
    defaultShield: true,
    defaultCantrips: [],
    defaultSpells: [],
    defaultSkills: ['athletics', 'perception'],
    summary: 'Mestre das armas e táticas: CA alta, Retomar o Fôlego, Surto de Ação e 3 Maestrias.',
    subclasses: [
      { id: 'champion', classId: 'fighter', label: 'Campeão', source: 'srd52', summary: 'Crítico em 19–20 e atletismo extraordinário.', bonusFeatureLabel: 'Crítico Aprimorado (19–20)' },
      { id: 'vanguard_tactician', classId: 'fighter', label: 'Estrategista de Vanguarda', source: 'mythos', summary: 'Amplia defesa do esquadrão e golpes de controle.', bonusFeatureLabel: '+1 CA para aliados em Vanguarda' },
    ],
    themed: {
      fantasy: { label: 'Guerreiro', shortLabel: 'Guerreiro' },
      cyberpunk: { label: 'Mercenário Solo', shortLabel: 'Solo' },
      mystery: { label: 'Combatente', shortLabel: 'Combat.' },
      zombies: { label: 'Soldado Tático', shortLabel: 'Soldado' },
      apocalyptic: { label: 'Guerreiro da Estrada', shortLabel: 'Estradeiro' },
    },
  },
  barbarian: {
    id: 'barbarian',
    label: 'Bárbaro',
    shortLabel: 'Bárbaro',
    hitDie: 12,
    primaryAbilities: ['str', 'con'],
    savingThrows: ['str', 'con'],
    armorProficiencies: ['light', 'medium', 'shield'],
    weaponMasteryCount: 2,
    skillChoicesCount: 2,
    allowedSkills: ['animal_handling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'],
    casterType: 'none',
    asiLevels: [4, 8, 12, 16, 19],
    extraAttackLevel: 5,
    defaultSprite: 'knight',
    defaultWeapon: {
      name: 'Machado Grande',
      stats: { weaponDice: '1d12', damageType: 'slashing', properties: ['heavy', 'two_handed'], mastery: 'cleave' },
    },
    defaultCantrips: [],
    defaultSpells: [],
    defaultSkills: ['athletics', 'intimidation'],
    summary: 'Maior Dado de Vida (d12), Fúria com resistência física e Defesa Sem Armadura (10+DES+CON).',
    subclasses: [
      { id: 'berserker', classId: 'barbarian', label: 'Frenesi (Berserker)', source: 'srd52', summary: 'Dano extra brutal durante a Fúria.', bonusFeatureLabel: '+2d6 dano em Fúria' },
      { id: 'iron_colossus', classId: 'barbarian', label: 'Colosso Indomável', source: 'mythos', summary: 'Absorve impactos pesados e protege a linha de frente.', bonusFeatureLabel: '+PB PV Temp ao ativar Fúria' },
    ],
    themed: {
      fantasy: { label: 'Bárbaro', shortLabel: 'Bárbaro' },
      cyberpunk: { label: 'Berserker Cromo', shortLabel: 'Cromo' },
      mystery: { label: 'Brutamontes', shortLabel: 'Brutam.' },
      zombies: { label: 'Demolidor', shortLabel: 'Demolidor' },
      apocalyptic: { label: 'Colosso', shortLabel: 'Colosso' },
    },
  },
  rogue: {
    id: 'rogue',
    label: 'Ladino',
    shortLabel: 'Ladino',
    hitDie: 8,
    primaryAbilities: ['dex', 'int'],
    savingThrows: ['dex', 'int'],
    armorProficiencies: ['light'],
    weaponMasteryCount: 2,
    skillChoicesCount: 4,
    allowedSkills: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'persuasion', 'sleight_of_hand', 'stealth'],
    casterType: 'none',
    asiLevels: [4, 8, 10, 12, 16, 19],
    defaultSprite: 'rogue',
    defaultWeapon: {
      name: 'Espada Curta & Adaga',
      stats: { weaponDice: '1d6', damageType: 'piercing', properties: ['finesse', 'light'], mastery: 'vex' },
    },
    defaultArmor: {
      name: 'Armadura de Couro Batido',
      stats: { armorCategory: 'light', armorBaseAc: 12 },
    },
    defaultCantrips: [],
    defaultSpells: [],
    defaultSkills: ['stealth', 'perception', 'sleight_of_hand', 'deception'],
    summary: '4 perícias + Especialização (2×PB), Ataque Furtivo explosivo (+Xd6) e Ação Ardilosa.',
    subclasses: [
      { id: 'thief', classId: 'rogue', label: 'Ladrão', source: 'srd52', summary: 'Mãos Rápidas e agilidade vertical letal.', bonusFeatureLabel: 'Usar Itens/Terreno como Bônus' },
      { id: 'night_blade', classId: 'rogue', label: 'Lâmina Sombria', source: 'mythos', summary: 'Vantagem no primeiro golpe do combate.', bonusFeatureLabel: 'Vantagem na Rodada 1' },
    ],
    themed: {
      fantasy: { label: 'Ladino', shortLabel: 'Ladino' },
      cyberpunk: { label: 'Infiltrador', shortLabel: 'Infiltr.' },
      mystery: { label: 'Espião Noir', shortLabel: 'Espião' },
      zombies: { label: 'Batedor', shortLabel: 'Batedor' },
      apocalyptic: { label: 'Saqueador', shortLabel: 'Saqueador' },
    },
  },
  wizard: {
    id: 'wizard',
    label: 'Mago',
    shortLabel: 'Mago',
    hitDie: 6,
    primaryAbilities: ['int', 'con'],
    savingThrows: ['int', 'wis'],
    armorProficiencies: [],
    weaponMasteryCount: 0,
    skillChoicesCount: 2,
    allowedSkills: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'nature', 'religion'],
    casterType: 'full',
    spellcastingAbility: 'int',
    asiLevels: [4, 8, 12, 16, 19],
    defaultSprite: 'mage',
    defaultWeapon: {
      name: 'Cajado Arcano',
      stats: { weaponDice: '1d6', versatileDice: '1d8', damageType: 'bludgeoning', properties: ['versatile'], mastery: 'topple' },
    },
    defaultCantrips: ['fire_bolt', 'ray_of_frost'],
    defaultSpells: ['magic_missile', 'shield', 'burning_hands', 'mage_armor'],
    defaultSkills: ['arcana', 'investigation'],
    summary: 'Conjurador versátil de INT: Escudo (+5 CA), Mísseis Mágicos, Bola de Fogo e Recuperação Arcana.',
    subclasses: [
      { id: 'evoker', classId: 'wizard', label: 'Evocador', source: 'srd52', summary: 'Esculpe magias em área protegendo aliados e eleva dano elemental.', bonusFeatureLabel: '+INT em dano de Evocação' },
      { id: 'chronist', classId: 'wizard', label: 'Cronomante', source: 'mythos', summary: 'Soma INT na Iniciativa e manipula probabilidades.', bonusFeatureLabel: '+INT na Iniciativa' },
    ],
    themed: {
      fantasy: { label: 'Mago', shortLabel: 'Mago' },
      cyberpunk: { label: 'Netrunner', shortLabel: 'Netrunner' },
      mystery: { label: 'Ocultista', shortLabel: 'Ocultista' },
      zombies: { label: 'Cientista', shortLabel: 'Cientista' },
      apocalyptic: { label: 'Engenheiro', shortLabel: 'Engenh.' },
    },
  },
  cleric: {
    id: 'cleric',
    label: 'Clérigo',
    shortLabel: 'Clérigo',
    hitDie: 8,
    primaryAbilities: ['wis', 'con'],
    savingThrows: ['wis', 'cha'],
    armorProficiencies: ['light', 'medium', 'shield'],
    weaponMasteryCount: 0,
    skillChoicesCount: 2,
    allowedSkills: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
    casterType: 'full',
    spellcastingAbility: 'wis',
    asiLevels: [4, 8, 12, 16, 19],
    defaultSprite: 'mage',
    defaultWeapon: {
      name: 'Maça Consagrada',
      stats: { weaponDice: '1d6', damageType: 'bludgeoning', mastery: 'sap' },
    },
    defaultArmor: {
      name: 'Camisão de Malha',
      stats: { armorCategory: 'medium', armorBaseAc: 13 },
    },
    defaultShield: true,
    defaultCantrips: ['sacred_flame', 'guidance'],
    defaultSpells: ['cure_wounds', 'healing_word', 'bless', 'guiding_bolt'],
    defaultSkills: ['medicine', 'insight'],
    summary: 'Pilar divino de SAB: armadura + escudo, curas poderosas (2d8/2d4) e Canalizar Divindade.',
    subclasses: [
      { id: 'life_domain', classId: 'cleric', label: 'Domínio da Vida', source: 'srd52', summary: 'Curas recebem bônus extra e armadura pesada.', bonusFeatureLabel: '+3 PV extra em curas' },
      { id: 'warden_light', classId: 'cleric', label: 'Guardião da Aurora', source: 'mythos', summary: 'Irradia luz que enfraquece ataques inimigos.', bonusFeatureLabel: '+1d6 radiante 1×/turno' },
    ],
    themed: {
      fantasy: { label: 'Clérigo', shortLabel: 'Clérigo' },
      cyberpunk: { label: 'Medtech', shortLabel: 'Medtech' },
      mystery: { label: 'Médico Forense', shortLabel: 'Médico' },
      zombies: { label: 'Paramédico', shortLabel: 'Paraméd.' },
      apocalyptic: { label: 'Curandeiro', shortLabel: 'Curand.' },
    },
  },
  ranger: {
    id: 'ranger',
    label: 'Patrulheiro',
    shortLabel: 'Patrulh.',
    hitDie: 10,
    primaryAbilities: ['dex', 'wis'],
    savingThrows: ['str', 'dex'],
    armorProficiencies: ['light', 'medium', 'shield'],
    weaponMasteryCount: 2,
    skillChoicesCount: 3,
    allowedSkills: ['animal_handling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'],
    casterType: 'half',
    spellcastingAbility: 'wis',
    asiLevels: [4, 8, 12, 16, 19],
    extraAttackLevel: 5,
    defaultSprite: 'ranger',
    defaultWeapon: {
      name: 'Arco Longo',
      stats: { weaponDice: '1d8', damageType: 'piercing', properties: ['ranged', 'two_handed', 'heavy'], mastery: 'slow' },
    },
    defaultArmor: {
      name: 'Armadura de Couro Batido',
      stats: { armorCategory: 'light', armorBaseAc: 12 },
    },
    defaultCantrips: [],
    defaultSpells: ['hunters_mark', 'cure_wounds'],
    defaultSkills: ['perception', 'survival', 'stealth'],
    summary: 'Atirador e rastreador com d10 PV, Marca do Caçador (+1d6), 2 Espaços já no Nv.1 e 2 Maestrias.',
    subclasses: [
      { id: 'hunter', classId: 'ranger', label: 'Caçador', source: 'srd52', summary: 'Matador de Colossos (+1d8 contra alvos feridos).', bonusFeatureLabel: '+1d8 vs alvo ferido' },
      { id: 'frontier_sniper', classId: 'ranger', label: 'Atirador da Fronteira', source: 'mythos', summary: 'Ignora penalidades de cobertura e distância.', bonusFeatureLabel: '+2 ataque à distância' },
    ],
    themed: {
      fantasy: { label: 'Patrulheiro', shortLabel: 'Patrulh.' },
      cyberpunk: { label: 'Caçador Recomp.', shortLabel: 'Caçador' },
      mystery: { label: 'Rastreador', shortLabel: 'Rastread.' },
      zombies: { label: 'Caçador Z', shortLabel: 'Caçador' },
      apocalyptic: { label: 'Batedor dos Ermos', shortLabel: 'Batedor' },
    },
  },
  paladin: {
    id: 'paladin',
    label: 'Paladino',
    shortLabel: 'Paladino',
    hitDie: 10,
    primaryAbilities: ['str', 'cha'],
    savingThrows: ['wis', 'cha'],
    armorProficiencies: ['light', 'medium', 'heavy', 'shield'],
    weaponMasteryCount: 2,
    skillChoicesCount: 2,
    allowedSkills: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'],
    casterType: 'half',
    spellcastingAbility: 'cha',
    asiLevels: [4, 8, 12, 16, 19],
    extraAttackLevel: 5,
    defaultSprite: 'knight',
    defaultWeapon: {
      name: 'Espada Longa Juramentada',
      stats: { weaponDice: '1d8', versatileDice: '1d10', damageType: 'slashing', properties: ['versatile'], mastery: 'sap' },
    },
    defaultArmor: {
      name: 'Cota de Malha',
      stats: { armorCategory: 'heavy', armorBaseAc: 16, strReq: 13, stealthDisadvantage: true },
    },
    defaultShield: true,
    defaultCantrips: [],
    defaultSpells: ['divine_smite', 'bless', 'cure_wounds'],
    defaultSkills: ['persuasion', 'athletics'],
    summary: 'Campeão blindado: Imposição de Mãos (Bônus), Destruição Divina (+2d8) e 2 Espaços já no Nv.1.',
    subclasses: [
      { id: 'devotion', classId: 'paladin', label: 'Juramento da Devoção', source: 'srd52', summary: 'Arma Sagrada adiciona CAR nas rolagens de ataque.', bonusFeatureLabel: '+CAR em Ataque Sagrado' },
      { id: 'iron_oath', classId: 'paladin', label: 'Juramento de Ferro', source: 'mythos', summary: 'Aura protetora que absorve dano dos aliados.', bonusFeatureLabel: '+1 CA e Salvaguarda' },
    ],
    themed: {
      fantasy: { label: 'Paladino', shortLabel: 'Paladino' },
      cyberpunk: { label: 'Sentinela Corp', shortLabel: 'Sentinela' },
      mystery: { label: 'Inspetor Chefe', shortLabel: 'Inspetor' },
      zombies: { label: 'Protetor', shortLabel: 'Protetor' },
      apocalyptic: { label: 'Templário', shortLabel: 'Templário' },
    },
  },
  bard: {
    id: 'bard',
    label: 'Bardo',
    shortLabel: 'Bardo',
    hitDie: 8,
    primaryAbilities: ['cha', 'dex'],
    savingThrows: ['dex', 'cha'],
    armorProficiencies: ['light'],
    weaponMasteryCount: 0,
    skillChoicesCount: 3,
    allowedSkills: ['acrobatics', 'animal_handling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleight_of_hand', 'stealth', 'survival'],
    casterType: 'full',
    spellcastingAbility: 'cha',
    asiLevels: [4, 8, 12, 16, 19],
    defaultSprite: 'detective',
    defaultWeapon: {
      name: 'Rapieira Elegante',
      stats: { weaponDice: '1d8', damageType: 'piercing', properties: ['finesse'], mastery: 'vex' },
    },
    defaultArmor: {
      name: 'Armadura de Couro',
      stats: { armorCategory: 'light', armorBaseAc: 11 },
    },
    defaultCantrips: ['vicious_mockery', 'minor_illusion'],
    defaultSpells: ['healing_word', 'dissonant_whispers', 'faerie_fire', 'charm_person'],
    defaultSkills: ['persuasion', 'performance', 'deception'],
    summary: 'Mestre social e suporte de CAR: Inspiração Bárdica, Versatilidade (Nv.2) e magias de controle.',
    subclasses: [
      { id: 'lore', classId: 'bard', label: 'Colégio do Saber', source: 'srd52', summary: 'Palavras Cortantes reduzem o ataque inimigo.', bonusFeatureLabel: 'Reação reduz ataque inimigo' },
      { id: 'commander_voice', classId: 'bard', label: 'Voz de Comando', source: 'mythos', summary: 'Aliados inspirados ganham dano bônus.', bonusFeatureLabel: '+1d6 dano para aliados' },
    ],
    themed: {
      fantasy: { label: 'Bardo', shortLabel: 'Bardo' },
      cyberpunk: { label: 'Rockerboy', shortLabel: 'Rocker' },
      mystery: { label: 'Orador / Socialite', shortLabel: 'Orador' },
      zombies: { label: 'Líder de Abrigo', shortLabel: 'Líder' },
      apocalyptic: { label: 'Arauto', shortLabel: 'Arauto' },
    },
  },
  monk: {
    id: 'monk',
    label: 'Monge',
    shortLabel: 'Monge',
    hitDie: 8,
    primaryAbilities: ['dex', 'wis'],
    savingThrows: ['str', 'dex'],
    armorProficiencies: [],
    weaponMasteryCount: 0,
    skillChoicesCount: 2,
    allowedSkills: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
    casterType: 'none',
    asiLevels: [4, 8, 12, 16, 19],
    extraAttackLevel: 5,
    defaultSprite: 'cyber_ronin',
    defaultWeapon: {
      name: 'Golpe Marcial / Bastão',
      stats: { weaponDice: '1d6', damageType: 'bludgeoning', properties: ['finesse', 'light'] },
    },
    defaultCantrips: [],
    defaultSpells: [],
    defaultSkills: ['acrobatics', 'insight'],
    summary: 'Velocidade extrema, Defesa Sem Armadura (10+DES+SAB), Pontos de Foco e Rajada de Golpes.',
    subclasses: [
      { id: 'open_hand', classId: 'monk', label: 'Mão Aberta', source: 'srd52', summary: 'Derruba ou empurra alvos com Rajada de Golpes.', bonusFeatureLabel: 'Rajada aplica Caído/Empurrar' },
      { id: 'phantom_step', classId: 'monk', label: 'Passo Fantasma', source: 'mythos', summary: 'Esquiva aprimorada ao trocar de coluna.', bonusFeatureLabel: '+2 CA após mover' },
    ],
    themed: {
      fantasy: { label: 'Monge', shortLabel: 'Monge' },
      cyberpunk: { label: 'Cyber-Monge', shortLabel: 'C-Monge' },
      mystery: { label: 'Pugilista', shortLabel: 'Pugilista' },
      zombies: { label: 'Artista Marcial', shortLabel: 'Marcial' },
      apocalyptic: { label: 'Monge da Poeira', shortLabel: 'Asceta' },
    },
  },
  druid: {
    id: 'druid',
    label: 'Druida',
    shortLabel: 'Druida',
    hitDie: 8,
    primaryAbilities: ['wis', 'con'],
    savingThrows: ['int', 'wis'],
    armorProficiencies: ['light', 'shield'],
    weaponMasteryCount: 0,
    skillChoicesCount: 2,
    allowedSkills: ['animal_handling', 'arcana', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'],
    casterType: 'full',
    spellcastingAbility: 'wis',
    asiLevels: [4, 8, 12, 16, 19],
    defaultSprite: 'ranger',
    defaultWeapon: {
      name: 'Bordão de Carvalho',
      stats: { weaponDice: '1d8', damageType: 'bludgeoning', properties: ['versatile'], mastery: 'topple' },
    },
    defaultArmor: {
      name: 'Armadura de Couro',
      stats: { armorCategory: 'light', armorBaseAc: 11 },
    },
    defaultShield: true,
    defaultCantrips: ['produce_flame', 'shillelagh'],
    defaultSpells: ['entangle', 'healing_word', 'thunderwave', 'cure_wounds'],
    defaultSkills: ['nature', 'survival'],
    summary: 'Guardião primordial de SAB: controle de terreno, curas e Forma Selvagem (PV temporários).',
    subclasses: [
      { id: 'land', classId: 'druid', label: 'Círculo da Terra', source: 'srd52', summary: 'Recuperação Natural restaura espaços no Descanso Curto.', bonusFeatureLabel: 'Recuperação Natural (DC)' },
      { id: 'wild_warden', classId: 'druid', label: 'Guardião Selvagem', source: 'mythos', summary: 'Dobra PV temporários ao assumir forma combativa.', bonusFeatureLabel: '+PB×3 PV Temp em Forma' },
    ],
    themed: {
      fantasy: { label: 'Druida', shortLabel: 'Druida' },
      cyberpunk: { label: 'Bio-Hacker', shortLabel: 'Bio-Hack' },
      mystery: { label: 'Naturalista', shortLabel: 'Natural.' },
      zombies: { label: 'Sobrevivente', shortLabel: 'Sobrev.' },
      apocalyptic: { label: 'Eremita', shortLabel: 'Eremita' },
    },
  },
  sorcerer: {
    id: 'sorcerer',
    label: 'Feiticeiro',
    shortLabel: 'Feitic.',
    hitDie: 6,
    primaryAbilities: ['cha', 'con'],
    savingThrows: ['con', 'cha'],
    armorProficiencies: [],
    weaponMasteryCount: 0,
    skillChoicesCount: 2,
    allowedSkills: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'],
    casterType: 'full',
    spellcastingAbility: 'cha',
    asiLevels: [4, 8, 12, 16, 19],
    defaultSprite: 'mage',
    defaultWeapon: {
      name: 'Adaga Ritual',
      stats: { weaponDice: '1d4', damageType: 'piercing', properties: ['finesse', 'light', 'thrown'], mastery: 'nick' },
    },
    defaultCantrips: ['fire_bolt', 'ray_of_frost'],
    defaultSpells: ['magic_missile', 'shield', 'chromatic_orb', 'burning_hands'],
    defaultSkills: ['persuasion', 'arcana'],
    summary: 'Magia inata de CAR com Salvaguarda de CON (Concentração forte!), Feitiçaria Inata e Metamagia.',
    subclasses: [
      { id: 'draconic', classId: 'sorcerer', label: 'Linhagem Dracônica', source: 'srd52', summary: 'Escamas concedem CA 10+DES+CAR e +1 PV/nível.', bonusFeatureLabel: 'CA Dracônica + 1 PV/nv' },
      { id: 'storm_spark', classId: 'sorcerer', label: 'Centelha Tempestuosa', source: 'mythos', summary: 'Dispara raios ao conjurar magias de círculo.', bonusFeatureLabel: '+1d6 elétrico ao conjurar' },
    ],
    themed: {
      fantasy: { label: 'Feiticeiro', shortLabel: 'Feitic.' },
      cyberpunk: { label: 'Psi-Tech', shortLabel: 'Psi-Tech' },
      mystery: { label: 'Médium', shortLabel: 'Médium' },
      zombies: { label: 'Improvisador', shortLabel: 'Improv.' },
      apocalyptic: { label: 'Mutante', shortLabel: 'Mutante' },
    },
  },
  warlock: {
    id: 'warlock',
    label: 'Bruxo',
    shortLabel: 'Bruxo',
    hitDie: 8,
    primaryAbilities: ['cha', 'con'],
    savingThrows: ['wis', 'cha'],
    armorProficiencies: ['light'],
    weaponMasteryCount: 0,
    skillChoicesCount: 2,
    allowedSkills: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'],
    casterType: 'pact',
    spellcastingAbility: 'cha',
    asiLevels: [4, 8, 12, 16, 19],
    defaultSprite: 'mage',
    defaultWeapon: {
      name: 'Foco de Pacto / Adaga',
      stats: { weaponDice: '1d6', damageType: 'piercing', properties: ['finesse', 'light'], mastery: 'vex' },
    },
    defaultArmor: {
      name: 'Armadura de Couro',
      stats: { armorCategory: 'light', armorBaseAc: 11 },
    },
    defaultCantrips: ['eldritch_blast', 'vicious_mockery'],
    defaultSpells: ['hex', 'hellish_rebuke'],
    defaultSkills: ['intimidation', 'arcana'],
    summary: 'Rajada Mística (1d10 energia) e Magia de Pacto que recarrega 100% em todo Descanso Curto!',
    subclasses: [
      { id: 'fiend', classId: 'warlock', label: 'Patrono Infernal', source: 'srd52', summary: 'Ganha PV temporários ao derrubar um inimigo.', bonusFeatureLabel: 'PV Temp ao abater inimigo' },
      { id: 'void_pact', classId: 'warlock', label: 'Pacto do Vazio', source: 'mythos', summary: 'Rajada Mística pode empurrar inimigos na grade.', bonusFeatureLabel: 'Empurrão em Rajada Mística' },
    ],
    themed: {
      fantasy: { label: 'Bruxo', shortLabel: 'Bruxo' },
      cyberpunk: { label: 'Pacto IA', shortLabel: 'Pacto IA' },
      mystery: { label: 'Invocador', shortLabel: 'Invoc.' },
      zombies: { label: 'Zelote', shortLabel: 'Zelote' },
      apocalyptic: { label: 'Xamã', shortLabel: 'Xamã' },
    },
  },
};

export const DND_CLASS_LIST: DndClassMeta[] = Object.values(DND_CLASSES);

export interface DndSpeciesMeta {
  id: DndSpeciesId;
  label: string;
  shortLabel: string;
  speedFeet: number;
  darkvisionFeet: number;
  hpPerLevelBonus?: number;
  extraOriginFeat?: boolean;
  extraSkill?: boolean;
  longRestInspiration?: boolean;
  relentlessEndurance?: boolean;
  traits: string[];
  themed?: Partial<Record<WorldThemeId, ThemedName>>;
}

export const DND_SPECIES: Record<DndSpeciesId, DndSpeciesMeta> = {
  human: {
    id: 'human',
    label: 'Humano',
    shortLabel: 'Humano',
    speedFeet: 30,
    darkvisionFeet: 0,
    extraOriginFeat: true,
    extraSkill: true,
    longRestInspiration: true,
    traits: [
      'Determinado (Resourceful): ganha Inspiração Heroica após Descanso Longo',
      'Habilidoso (Skillful): +1 Perícia proficiente à escolha',
      'Versátil (Versatile): +1 Talento de Origem adicional',
    ],
    themed: {
      cyberpunk: { label: 'Humano Natural', shortLabel: 'Natural' },
      mystery: { label: 'Perfil Versátil', shortLabel: 'Versátil' },
      zombies: { label: 'Civil Adaptável', shortLabel: 'Adaptável' },
      apocalyptic: { label: 'Nômade Nascido', shortLabel: 'Nômade' },
    },
  },
  elf: {
    id: 'elf',
    label: 'Elfo',
    shortLabel: 'Elfo',
    speedFeet: 30,
    darkvisionFeet: 60,
    traits: ['Visão no Escuro 18m', 'Ancestralidade Feérica (Vantagem vs Enfeitiçado)', 'Sentidos Aguçados (Percepção)'],
    themed: {
      cyberpunk: { label: 'Óptica Reflexa', shortLabel: 'Óptica' },
      mystery: { label: 'Olhar Clínico', shortLabel: 'Clínico' },
      zombies: { label: 'Olhos de Falcão', shortLabel: 'Falcão' },
      apocalyptic: { label: 'Rastreador Noturno', shortLabel: 'Noturno' },
    },
  },
  dwarf: {
    id: 'dwarf',
    label: 'Anão',
    shortLabel: 'Anão',
    speedFeet: 30,
    darkvisionFeet: 120,
    hpPerLevelBonus: 1,
    traits: ['Tenacidade Anã (+1 PV por nível)', 'Resiliência Anã (Resistência a Veneno)', 'Visão no Escuro 36m'],
    themed: {
      cyberpunk: { label: 'Subdérmica Titânio', shortLabel: 'Titânio' },
      mystery: { label: 'Constituição Férrea', shortLabel: 'Férreo' },
      zombies: { label: 'Imunidade Parcial', shortLabel: 'Imune' },
      apocalyptic: { label: 'Forjado no Ferro', shortLabel: 'Ferro' },
    },
  },
  halfling: {
    id: 'halfling',
    label: 'Pequenino',
    shortLabel: 'Pequen.',
    speedFeet: 30,
    darkvisionFeet: 0,
    traits: ['Sortudo (rerrola 1 natural em d20)', 'Bravura (Vantagem vs Amedrontado)', 'Furtividade Natural'],
    themed: {
      cyberpunk: { label: 'Fantasmas da Rede', shortLabel: 'Fantasma' },
      mystery: { label: 'Discreto & Sortudo', shortLabel: 'Discreto' },
      zombies: { label: 'Enguia Urbana', shortLabel: 'Ágil' },
      apocalyptic: { label: 'Rato de Túnel', shortLabel: 'Sombra' },
    },
  },
  orc: {
    id: 'orc',
    label: 'Orc',
    shortLabel: 'Orc',
    speedFeet: 30,
    darkvisionFeet: 120,
    relentlessEndurance: true,
    traits: ['Resistência Implacável (cai a 1 PV em vez de 0, 1×/DL)', 'Ímpeto de Adrenalina (Disparada Bônus)', 'Visão no Escuro 36m'],
    themed: {
      cyberpunk: { label: 'Implante Adrenalina', shortLabel: 'Adrenal.' },
      mystery: { label: 'Vontade Inquebrável', shortLabel: 'Implac.' },
      zombies: { label: 'Sobrevivente Nato', shortLabel: 'Implac.' },
      apocalyptic: { label: 'Sangue de Ferro', shortLabel: 'Bruto' },
    },
  },
  dragonborn: {
    id: 'dragonborn',
    label: 'Draconato',
    shortLabel: 'Dracon.',
    speedFeet: 30,
    darkvisionFeet: 60,
    traits: ['Sopro Elemental (1d10 área)', 'Resistência Elemental', 'Visão no Escuro 18m'],
    themed: {
      cyberpunk: { label: 'Cromo Térmico', shortLabel: 'Térmico' },
      mystery: { label: 'Sangue Antigo', shortLabel: 'Antigo' },
      zombies: { label: 'Pirotécnico', shortLabel: 'Pirotéc.' },
      apocalyptic: { label: 'Cinza Viva', shortLabel: 'Cinza' },
    },
  },
  gnome: {
    id: 'gnome',
    label: 'Gnomo',
    shortLabel: 'Gnomo',
    speedFeet: 30,
    darkvisionFeet: 60,
    traits: ['Astúcia Gnômica (Vantagem em Salvaguardas INT/SAB/CAR)', 'Visão no Escuro 18m'],
    themed: {
      cyberpunk: { label: 'Firewall Neural', shortLabel: 'Firewall' },
      mystery: { label: 'Mente Blindada', shortLabel: 'Analítico' },
      zombies: { label: 'Engenhoqueiro', shortLabel: 'Técnico' },
      apocalyptic: { label: 'Artífice de Sucata', shortLabel: 'Artífice' },
    },
  },
  goliath: {
    id: 'goliath',
    label: 'Golias',
    shortLabel: 'Golias',
    speedFeet: 35,
    darkvisionFeet: 0,
    traits: ['Deslocamento 10,5m (35 pés)', 'Porte Poderoso', 'Ancestralidade Gigante'],
    themed: {
      cyberpunk: { label: 'Frame Pesado', shortLabel: 'Pesado' },
      mystery: { label: 'Porte Imponente', shortLabel: 'Impon.' },
      zombies: { label: 'Tanque Humano', shortLabel: 'Tanque' },
      apocalyptic: { label: 'Gigante dos Ermos', shortLabel: 'Gigante' },
    },
  },
  tiefling: {
    id: 'tiefling',
    label: 'Tiefling',
    shortLabel: 'Tiefling',
    speedFeet: 30,
    darkvisionFeet: 60,
    traits: ['Resistência a Fogo', 'Legado Planar (Truque inato)', 'Visão no Escuro 18m'],
    themed: {
      cyberpunk: { label: 'Synth Experimental', shortLabel: 'Synth' },
      mystery: { label: 'Marcado pelo Oculto', shortLabel: 'Marcado' },
      zombies: { label: 'Cobaia Resiliente', shortLabel: 'Cobaia' },
      apocalyptic: { label: 'Tocado pela Radiação', shortLabel: 'Rad-Born' },
    },
  },
};

export const DND_SPECIES_LIST: DndSpeciesMeta[] = Object.values(DND_SPECIES);

export interface DndFeatMeta {
  id: string;
  label: string;
  category: 'origin' | 'general' | 'fighting_style' | 'epic_boon';
  source: 'srd52' | 'mythos';
  summary: string;
  abilityBonusOptions?: AttributeId[]; // General Feats (+1 up to 20) & Epic Boons (+1 up to 30)
  hpPerLevelBonus?: number;
  acBonus?: number;
  initiativeAddPb?: boolean;
}

export const DND_FEATS: Record<string, DndFeatMeta> = {
  // Official SRD 5.2 Origin Feats (4)
  alert: {
    id: 'alert',
    label: 'Alerta',
    category: 'origin',
    source: 'srd52',
    summary: 'Adiciona seu Bônus de Proficiência (+PB) na Iniciativa.',
    initiativeAddPb: true,
  },
  magic_initiate: {
    id: 'magic_initiate',
    label: 'Iniciado em Magia',
    category: 'origin',
    source: 'srd52',
    summary: 'Aprende 2 Truques e 1 Magia de 1º círculo (1 conjuração grátis/DL).',
  },
  savage_attacker: {
    id: 'savage_attacker',
    label: 'Atacante Selvagem',
    category: 'origin',
    source: 'srd52',
    summary: '1×/turno: rola os dados de dano da arma duas vezes e fica com o maior.',
  },
  skilled: {
    id: 'skilled',
    label: 'Habilidoso',
    category: 'origin',
    source: 'srd52',
    summary: 'Ganha proficiência em 3 Perícias adicionais à escolha.',
  },
  // MYTHOS Original Origin Feats
  vigorous_body: {
    id: 'vigorous_body',
    label: 'Constituição Vigorosa',
    category: 'origin',
    source: 'mythos',
    summary: '+2 PV máximos por nível (aplicado retroativamente ao subir de nível).',
    hpPerLevelBonus: 2,
  },
  field_medic: {
    id: 'field_medic',
    label: 'Médico de Campo',
    category: 'origin',
    source: 'mythos',
    summary: 'Curas com poções/kits e Dados de Vida recuperam +PB PV extras.',
  },
  fortune_spark: {
    id: 'fortune_spark',
    label: 'Centelha de Sorte',
    category: 'origin',
    source: 'mythos',
    summary: 'Começa todo confronto tático com Inspiração Heroica carregada se não tiver.',
  },
  // Official SRD 5.2 Fighting Styles
  style_defense: {
    id: 'style_defense',
    label: 'Estilo: Defesa',
    category: 'fighting_style',
    source: 'srd52',
    summary: '+1 na Classe de Armadura (CA) enquanto usar armadura.',
    acBonus: 1,
  },
  style_dueling: {
    id: 'style_dueling',
    label: 'Estilo: Duelismo',
    category: 'fighting_style',
    source: 'srd52',
    summary: '+2 nas rolagens de dano com arma corpo a corpo de uma mão.',
  },
  style_archery: {
    id: 'style_archery',
    label: 'Estilo: Arquearia',
    category: 'fighting_style',
    source: 'srd52',
    summary: '+2 nas rolagens de ataque com armas à distância.',
  },
  style_two_weapon: {
    id: 'style_two_weapon',
    label: 'Estilo: Duas Armas',
    category: 'fighting_style',
    source: 'srd52',
    summary: 'Adiciona seu modificador de atributo ao dano do ataque extra com arma leve.',
  },
  // General Feats (Lv.4+ — 2024: ALL grant +1 ability score max 20!)
  grappler: {
    id: 'grappler',
    label: 'Lutador (Grappler)',
    category: 'general',
    source: 'srd52',
    summary: '+1 FOR ou DES; Vantagem em ataques contra alvos Agarrados/Caídos.',
    abilityBonusOptions: ['str', 'dex'],
  },
  war_focus: {
    id: 'war_focus',
    label: 'Mente de Batalha',
    category: 'general',
    source: 'mythos',
    summary: '+1 INT, SAB ou CAR; Vantagem em Salvaguardas de Concentração.',
    abilityBonusOptions: ['int', 'wis', 'cha'],
  },
  sentinel_guard: {
    id: 'sentinel_guard',
    label: 'Guarda Sentinela',
    category: 'general',
    source: 'mythos',
    summary: '+1 FOR ou CON; Ataques de Oportunidade reduzem deslocamento a 0.',
    abilityBonusOptions: ['str', 'con'],
  },
  sharpshooter_eye: {
    id: 'sharpshooter_eye',
    label: 'Mira Implacável',
    category: 'general',
    source: 'mythos',
    summary: '+1 DES; ignora penalidade de alcance e adiciona +2 em dano à distância.',
    abilityBonusOptions: ['dex'],
  },
  // Official SRD 5.2 Epic Boons (Lv.19 — +1 ability score cap 30!)
  boon_combat_prowess: {
    id: 'boon_combat_prowess',
    label: 'Dádiva da Proeza em Combate',
    category: 'epic_boon',
    source: 'srd52',
    summary: '+1 em qualquer atributo (teto 30); 1×/turno transforma um erro em acerto.',
    abilityBonusOptions: ['str', 'dex', 'con', 'int', 'wis', 'cha'],
  },
  boon_fortitude: {
    id: 'boon_fortitude',
    label: 'Dádiva da Fortitude',
    category: 'epic_boon',
    source: 'srd52',
    summary: '+1 em qualquer atributo (teto 30) e +40 PV máximos permanentes.',
    abilityBonusOptions: ['str', 'dex', 'con', 'int', 'wis', 'cha'],
  },
  boon_fate: {
    id: 'boon_fate',
    label: 'Dádiva do Destino',
    category: 'epic_boon',
    source: 'srd52',
    summary: '+1 em qualquer atributo (teto 30) e +2d4 em um teste crítico por combate.',
    abilityBonusOptions: ['str', 'dex', 'con', 'int', 'wis', 'cha'],
  },
};

export interface DndBackgroundMeta {
  id: DndBackgroundId;
  label: string;
  source: 'srd52' | 'mythos';
  abilityOptions: [AttributeId, AttributeId, AttributeId];
  skills: [DndSkillId, DndSkillId];
  originFeatId: string;
  summary: string;
}

export const DND_BACKGROUNDS: Record<DndBackgroundId, DndBackgroundMeta> = {
  // 4 Official SRD 5.2 Backgrounds
  soldier: {
    id: 'soldier',
    label: 'Soldado',
    source: 'srd52',
    abilityOptions: ['str', 'dex', 'con'],
    skills: ['athletics', 'intimidation'],
    originFeatId: 'savage_attacker',
    summary: 'Treinamento militar rigoroso em linha de frente e disciplina.',
  },
  acolyte: {
    id: 'acolyte',
    label: 'Acólito',
    source: 'srd52',
    abilityOptions: ['int', 'wis', 'cha'],
    skills: ['insight', 'religion'],
    originFeatId: 'magic_initiate',
    summary: 'Iniciado em ordens sagradas, ritos antigos ou códigos de fé.',
  },
  criminal: {
    id: 'criminal',
    label: 'Criminoso',
    source: 'srd52',
    abilityOptions: ['dex', 'con', 'int'],
    skills: ['sleight_of_hand', 'stealth'],
    originFeatId: 'alert',
    summary: 'Sobrevivente do submundo com reflexos rápidos e instinto de perigo.',
  },
  sage: {
    id: 'sage',
    label: 'Sábio',
    source: 'srd52',
    abilityOptions: ['con', 'int', 'wis'],
    skills: ['arcana', 'history'],
    originFeatId: 'magic_initiate',
    summary: 'Estudioso de arquivos proibidos, ciência ou artes arcanas.',
  },
  // 6 MYTHOS Original Backgrounds
  wayfarer: {
    id: 'wayfarer',
    label: 'Andarilho',
    source: 'mythos',
    abilityOptions: ['dex', 'wis', 'cha'],
    skills: ['perception', 'survival'],
    originFeatId: 'fortune_spark',
    summary: 'Estradas longas, trilhas hostis e instinto apurado.',
  },
  medic: {
    id: 'medic',
    label: 'Socorrista',
    source: 'mythos',
    abilityOptions: ['con', 'int', 'wis'],
    skills: ['medicine', 'insight'],
    originFeatId: 'field_medic',
    summary: 'Treinado para estancar ferimentos sob fogo cerrado.',
  },
  artisan: {
    id: 'artisan',
    label: 'Artífice',
    source: 'mythos',
    abilityOptions: ['str', 'dex', 'int'],
    skills: ['investigation', 'persuasion'],
    originFeatId: 'skilled',
    summary: 'Forjador de equipamentos, engenhocas e reparos de campo.',
  },
  noble_envoy: {
    id: 'noble_envoy',
    label: 'Emissário',
    source: 'mythos',
    abilityOptions: ['int', 'wis', 'cha'],
    skills: ['persuasion', 'history'],
    originFeatId: 'skilled',
    summary: 'Diplomacia de alto nível, influência política e protocolo.',
  },
  operative: {
    id: 'operative',
    label: 'Agente Tático',
    source: 'mythos',
    abilityOptions: ['dex', 'int', 'wis'],
    skills: ['investigation', 'stealth'],
    originFeatId: 'alert',
    summary: 'Reconhecimento, infiltração e leitura rápida de ameaças.',
  },
  scavenger: {
    id: 'scavenger',
    label: 'Sobrevivente',
    source: 'mythos',
    abilityOptions: ['str', 'con', 'wis'],
    skills: ['survival', 'athletics'],
    originFeatId: 'vigorous_body',
    summary: 'Calejado pela escassez, capaz de resistir onde outros tombam.',
  },
};

export const DND_BACKGROUND_LIST: DndBackgroundMeta[] = Object.values(DND_BACKGROUNDS);

export interface DndSpellDefinition {
  id: string;
  level: number; // 0 = Cantrip, 1..5 = Leveled Spell
  label: string;
  shortLabel: string;
  castingTime: 'action' | 'bonus' | 'reaction';
  concentration?: boolean;
  school: string;
  classes: DndClassId[];
  kind: 'attack' | 'save_damage' | 'auto_damage' | 'heal' | 'buff_ac' | 'buff_party' | 'control';
  damageDice?: string;
  healDice?: string;
  damageType?: DndDamageType;
  saveAbility?: AttributeId;
  halfOnSave?: boolean;
  isAoE?: boolean;
  inflictCondition?: DndConditionId;
  acBonus?: number;
  summary: string;
  themed?: Partial<Record<WorldThemeId, ThemedName>>;
}

export const DND_SPELLS: Record<string, DndSpellDefinition> = {
  // === CANTRIPS (Level 0 — Unlimited) ===
  fire_bolt: {
    id: 'fire_bolt',
    level: 0,
    label: 'Raio de Fogo',
    shortLabel: 'Raio Fogo',
    castingTime: 'action',
    school: 'Evocação',
    classes: ['wizard', 'sorcerer'],
    kind: 'attack',
    damageDice: '1d10',
    damageType: 'fire',
    summary: 'Ataque mágico à distância: 1d10 dano de Fogo (escala Nv.5/11/17).',
    themed: {
      cyberpunk: { label: 'Sobrecarga Térmica', shortLabel: 'Sobrecarga' },
      mystery: { label: 'Centelha Oculta', shortLabel: 'Centelha' },
      zombies: { label: 'Disparo Incendiário', shortLabel: 'Incendiár.' },
      apocalyptic: { label: 'Jato de Ignição', shortLabel: 'Ignição' },
    },
  },
  ray_of_frost: {
    id: 'ray_of_frost',
    level: 0,
    label: 'Raio de Gelo',
    shortLabel: 'Raio Gelo',
    castingTime: 'action',
    school: 'Evocação',
    classes: ['wizard', 'sorcerer'],
    kind: 'attack',
    damageDice: '1d8',
    damageType: 'cold',
    summary: 'Ataque mágico: 1d8 Gelo e desacelera o alvo.',
    themed: {
      cyberpunk: { label: 'Script Congelar', shortLabel: 'Congelar' },
      mystery: { label: 'Toque Gélido', shortLabel: 'Gélido' },
      zombies: { label: 'Spray Criogênico', shortLabel: 'Crio-Spray' },
      apocalyptic: { label: 'Descarga Estática', shortLabel: 'Estática' },
    },
  },
  sacred_flame: {
    id: 'sacred_flame',
    level: 0,
    label: 'Chama Sagrada',
    shortLabel: 'Chama Sag.',
    castingTime: 'action',
    school: 'Evocação',
    classes: ['cleric'],
    kind: 'save_damage',
    damageDice: '1d8',
    damageType: 'radiant',
    saveAbility: 'dex',
    summary: 'Salvaguarda DES ou 1d8 dano Radiante (ignora cobertura).',
    themed: {
      cyberpunk: { label: 'Pulso Laser Med', shortLabel: 'Pulso Med' },
      mystery: { label: 'Clarão Revelador', shortLabel: 'Clarão' },
      zombies: { label: 'Sinalizador Direto', shortLabel: 'Sinaliz.' },
      apocalyptic: { label: 'Arco Solar', shortLabel: 'Arco Solar' },
    },
  },
  eldritch_blast: {
    id: 'eldritch_blast',
    level: 0,
    label: 'Rajada Mística',
    shortLabel: 'Rajada',
    castingTime: 'action',
    school: 'Evocação',
    classes: ['warlock'],
    kind: 'attack',
    damageDice: '1d10',
    damageType: 'force',
    summary: 'Feixe de pura energia: 1d10 Energia (feixes extras no Nv.5/11/17).',
    themed: {
      cyberpunk: { label: 'Pulso Blackwall', shortLabel: 'Blackwall' },
      mystery: { label: 'Lança Sombria', shortLabel: 'L. Sombria' },
      zombies: { label: 'Impacto Sônico', shortLabel: 'Sônico' },
      apocalyptic: { label: 'Descarga Cinética', shortLabel: 'Cinética' },
    },
  },
  vicious_mockery: {
    id: 'vicious_mockery',
    level: 0,
    label: 'Zombaria Perversa',
    shortLabel: 'Zombaria',
    castingTime: 'action',
    school: 'Encantamento',
    classes: ['bard', 'warlock'],
    kind: 'save_damage',
    damageDice: '1d6', // 2024 buffed from 1d4 -> 1d6!
    damageType: 'psychic',
    saveAbility: 'wis',
    summary: 'Salvaguarda SAB ou 1d6 Psíquico + Desvantagem no próximo ataque inimigo.',
    themed: {
      cyberpunk: { label: 'Glitch Óptico', shortLabel: 'Glitch' },
      mystery: { label: 'Provocação Ácida', shortLabel: 'Provocar' },
      zombies: { label: 'Distração Tática', shortLabel: 'Distrair' },
      apocalyptic: { label: 'Grito de Guerra', shortLabel: 'Grito' },
    },
  },
  produce_flame: {
    id: 'produce_flame',
    level: 0,
    label: 'Produzir Chama',
    shortLabel: 'Chama',
    castingTime: 'action',
    school: 'Conjuração',
    classes: ['druid'],
    kind: 'attack',
    damageDice: '1d8',
    damageType: 'fire',
    summary: 'Ataque mágico: 1d8 dano de Fogo.',
  },
  shillelagh: {
    id: 'shillelagh',
    level: 0,
    label: 'Bordão Místico',
    shortLabel: 'Bordão',
    castingTime: 'bonus',
    school: 'Transmutação',
    classes: ['druid'],
    kind: 'buff_party',
    summary: 'Ação Bônus: usa SAB no golpe de cajado (1d8 energia).',
  },
  guidance: {
    id: 'guidance',
    level: 0,
    label: 'Orientação',
    shortLabel: 'Orient.',
    castingTime: 'action',
    concentration: true,
    school: 'Adivinhação',
    classes: ['cleric', 'druid'],
    kind: 'buff_party',
    summary: 'Concede +1d4 no próximo teste de habilidade.',
  },
  minor_illusion: {
    id: 'minor_illusion',
    level: 0,
    label: 'Ilusão Menor',
    shortLabel: 'Ilusão',
    castingTime: 'action',
    school: 'Ilusão',
    classes: ['bard', 'wizard', 'sorcerer', 'warlock'],
    kind: 'control',
    saveAbility: 'int',
    summary: 'Cria distração tática ganhando Vantagem no próximo movimento.',
  },

  // === LEVEL 1 SPELLS ===
  magic_missile: {
    id: 'magic_missile',
    level: 1,
    label: 'Mísseis Mágicos',
    shortLabel: 'Mísseis',
    castingTime: 'action',
    school: 'Evocação',
    classes: ['wizard', 'sorcerer'],
    kind: 'auto_damage',
    damageDice: '3d4+3',
    damageType: 'force',
    summary: 'Acerto GARANTIDO (ignora CA!): 3 dardos causando 3d4+3 Energia.',
    themed: {
      cyberpunk: { label: 'Micro-Mísseis Smart', shortLabel: 'Smart-Mís.' },
      mystery: { label: 'Dardos Etéreos', shortLabel: 'Dardos' },
      zombies: { label: 'Disparo Teleguiado', shortLabel: 'Teleguiad.' },
      apocalyptic: { label: 'Rajada de Estilhaços', shortLabel: 'Estilhaç.' },
    },
  },
  shield: {
    id: 'shield',
    level: 1,
    label: 'Escudo Arcano',
    shortLabel: 'Escudo +5',
    castingTime: 'reaction',
    school: 'Abjuração',
    classes: ['wizard', 'sorcerer'],
    kind: 'buff_ac',
    acBonus: 5,
    summary: 'Reação: +5 CA até seu próximo turno (bloqueia golpes certos!).',
    themed: {
      cyberpunk: { label: 'Barreira ICE (+5 CA)', shortLabel: 'ICE +5 CA' },
      mystery: { label: 'Selo Protetor (+5 CA)', shortLabel: 'Selo +5' },
      zombies: { label: 'Bloqueio Reflexo', shortLabel: 'Bloqueio' },
      apocalyptic: { label: 'Placa Defletora', shortLabel: 'Defletor' },
    },
  },
  mage_armor: {
    id: 'mage_armor',
    level: 1,
    label: 'Armadura Arcana',
    shortLabel: 'Arm. Arc.',
    castingTime: 'action',
    school: 'Abjuração',
    classes: ['wizard', 'sorcerer'],
    kind: 'buff_ac',
    acBonus: 3,
    summary: 'Eleva sua CA base sem armadura para 13 + mod DES.',
  },
  burning_hands: {
    id: 'burning_hands',
    level: 1,
    label: 'Mãos Flamejantes',
    shortLabel: 'M. Flamej.',
    castingTime: 'action',
    school: 'Evocação',
    classes: ['wizard', 'sorcerer'],
    kind: 'save_damage',
    damageDice: '3d6',
    damageType: 'fire',
    saveAbility: 'dex',
    halfOnSave: true,
    isAoE: true,
    summary: 'Área (DES metade): 3d6 Fogo em todos os inimigos próximos.',
    themed: {
      cyberpunk: { label: 'Explosão Térmica', shortLabel: 'Exp. Térm.' },
      zombies: { label: 'Coquetel Molotov', shortLabel: 'Molotov' },
      apocalyptic: { label: 'Lança-Chamas', shortLabel: 'Chamas' },
    },
  },
  chromatic_orb: {
    id: 'chromatic_orb',
    level: 1,
    label: 'Orbe Cromático',
    shortLabel: 'Orbe Crom.',
    castingTime: 'action',
    school: 'Evocação',
    classes: ['sorcerer', 'wizard'],
    kind: 'attack',
    damageDice: '3d8',
    damageType: 'lightning',
    summary: 'Ataque mágico de alto impacto: 3d8 Elétrico.',
  },
  cure_wounds: {
    id: 'cure_wounds',
    level: 1,
    label: 'Curar Ferimentos',
    shortLabel: 'Curar 2d8',
    castingTime: 'action',
    school: 'Abjuração',
    classes: ['cleric', 'bard', 'druid', 'paladin', 'ranger'],
    kind: 'heal',
    healDice: '2d8', // 2024 SRD 5.2 buffed to 2d8 + spellMod!
    summary: 'Cura 2d8 + mod de conjuração (regra 2024 dobrada!).',
    themed: {
      cyberpunk: { label: 'Nano-Reparo 2d8', shortLabel: 'Nano 2d8' },
      mystery: { label: 'Sutura & Tônico', shortLabel: 'Sutura' },
      zombies: { label: 'Kit Trauma 2d8', shortLabel: 'Trauma' },
      apocalyptic: { label: 'Injeção Regen', shortLabel: 'Regen' },
    },
  },
  healing_word: {
    id: 'healing_word',
    level: 1,
    label: 'Palavra Curativa',
    shortLabel: 'Cura Bôn.',
    castingTime: 'bonus',
    school: 'Abjuração',
    classes: ['cleric', 'bard', 'druid'],
    kind: 'heal',
    healDice: '2d4', // 2024 SRD 5.2 buffed to 2d4 + spellMod!
    summary: 'Ação Bônus: cura 2d4 + mod sem gastar sua Ação Principal!',
    themed: {
      cyberpunk: { label: 'Boost Med Rápido', shortLabel: 'Med Bônus' },
      zombies: { label: 'Adrenalina Rápida', shortLabel: 'Adren. Bôn' },
    },
  },
  bless: {
    id: 'bless',
    level: 1,
    label: 'Bênção',
    shortLabel: 'Bênção',
    castingTime: 'action',
    concentration: true,
    school: 'Encantamento',
    classes: ['cleric', 'paladin'],
    kind: 'buff_party',
    summary: 'Concentração: +1d4 em todos os ataques e Salvaguardas do esquadrão.',
    themed: {
      cyberpunk: { label: 'Link Tático +1d4', shortLabel: 'Link +1d4' },
      zombies: { label: 'Ordem Coordenada', shortLabel: 'Coord.' },
    },
  },
  guiding_bolt: {
    id: 'guiding_bolt',
    level: 1,
    label: 'Raio Guiador',
    shortLabel: 'R. Guiador',
    castingTime: 'action',
    school: 'Evocação',
    classes: ['cleric'],
    kind: 'attack',
    damageDice: '4d6',
    damageType: 'radiant',
    summary: 'Ataque mágico 4d6 Radiante + Vantagem no próximo ataque contra o alvo!',
  },
  divine_smite: {
    id: 'divine_smite',
    level: 1,
    label: 'Destruição Divina',
    shortLabel: 'Smite 2d8',
    castingTime: 'bonus',
    school: 'Evocação',
    classes: ['paladin'],
    kind: 'auto_damage',
    damageDice: '2d8',
    damageType: 'radiant',
    summary: 'Ação Bônus (2024): libera +2d8 Radiante no alvo (crítico dobra!).',
    themed: {
      cyberpunk: { label: 'Descarga Empulse', shortLabel: 'Empulse' },
      apocalyptic: { label: 'Golpe Incandescente', shortLabel: 'Incand.' },
    },
  },
  hunters_mark: {
    id: 'hunters_mark',
    level: 1,
    label: 'Marca do Caçador',
    shortLabel: 'Marca +1d6',
    castingTime: 'bonus',
    concentration: true,
    school: 'Adivinhação',
    classes: ['ranger'],
    kind: 'buff_party',
    summary: 'Ação Bônus + Concentração: +1d6 dano extra em seus ataques contra o alvo.',
    themed: {
      cyberpunk: { label: 'Travar Alvo +1d6', shortLabel: 'Travar' },
      zombies: { label: 'Ponto Fraco +1d6', shortLabel: 'P. Fraco' },
    },
  },
  hex: {
    id: 'hex',
    level: 1,
    label: 'Bruxaria (Hex)',
    shortLabel: 'Hex +1d6',
    castingTime: 'bonus',
    concentration: true,
    school: 'Encantamento',
    classes: ['warlock'],
    kind: 'buff_party',
    summary: 'Ação Bônus + Concentração: +1d6 Necrótico em cada golpe no alvo.',
  },
  hellish_rebuke: {
    id: 'hellish_rebuke',
    level: 1,
    label: 'Repreensão Infernal',
    shortLabel: 'Repreens.',
    castingTime: 'action',
    school: 'Evocação',
    classes: ['warlock'],
    kind: 'save_damage',
    damageDice: '2d10',
    damageType: 'fire',
    saveAbility: 'dex',
    halfOnSave: true,
    summary: 'Chamas punitivas: 2d10 Fogo (DES metade).',
  },
  dissonant_whispers: {
    id: 'dissonant_whispers',
    level: 1,
    label: 'Sussurros Dissonantes',
    shortLabel: 'Sussurros',
    castingTime: 'action',
    school: 'Encantamento',
    classes: ['bard'],
    kind: 'save_damage',
    damageDice: '3d6',
    damageType: 'psychic',
    saveAbility: 'wis',
    halfOnSave: true,
    summary: 'Salvaguarda SAB (metade): 3d6 Psíquico e faz o alvo recuar.',
  },
  faerie_fire: {
    id: 'faerie_fire',
    level: 1,
    label: 'Fogo das Fadas',
    shortLabel: 'F. Fadas',
    castingTime: 'action',
    concentration: true,
    school: 'Evocação',
    classes: ['bard', 'druid'],
    kind: 'control',
    saveAbility: 'dex',
    isAoE: true,
    summary: 'Ilumina inimigos (DES); ataques contra afetados têm Vantagem!',
  },
  entangle: {
    id: 'entangle',
    level: 1,
    label: 'Constrição',
    shortLabel: 'Constriç.',
    castingTime: 'action',
    concentration: true,
    school: 'Conjuração',
    classes: ['druid', 'ranger'],
    kind: 'control',
    saveAbility: 'str',
    inflictCondition: 'restrained',
    summary: 'Salvaguarda FOR ou alvo fica Imobilizado (Vantagem nos ataques contra ele!).',
  },
  thunderwave: {
    id: 'thunderwave',
    level: 1,
    label: 'Onda Trovejante',
    shortLabel: 'Onda Trov.',
    castingTime: 'action',
    school: 'Evocação',
    classes: ['bard', 'druid', 'sorcerer', 'wizard'],
    kind: 'save_damage',
    damageDice: '2d8',
    damageType: 'thunder',
    saveAbility: 'con',
    halfOnSave: true,
    isAoE: true,
    summary: 'Área (CON metade): 2d8 Trovão e empurra inimigos para trás!',
  },
  charm_person: {
    id: 'charm_person',
    level: 1,
    label: 'Enfeitiçar Pessoa',
    shortLabel: 'Enfeit.',
    castingTime: 'action',
    school: 'Encantamento',
    classes: ['bard', 'druid', 'sorcerer', 'warlock', 'wizard'],
    kind: 'control',
    saveAbility: 'wis',
    inflictCondition: 'charmed',
    summary: 'Salvaguarda SAB ou alvo fica Enfeitiçado (excelente em Duelo Social).',
  },

  // === LEVEL 2 SPELLS ===
  misty_step: {
    id: 'misty_step',
    level: 2,
    label: 'Passo Nebuloso',
    shortLabel: 'Teleporte',
    castingTime: 'bonus',
    school: 'Conjuração',
    classes: ['wizard', 'sorcerer', 'warlock'],
    kind: 'buff_party',
    summary: 'Ação Bônus: teleporta instantaneamente para qualquer coluna sem Ataque de Oportunidade.',
    themed: {
      cyberpunk: { label: 'Blink Sandevistan', shortLabel: 'Blink' },
    },
  },
  hold_person: {
    id: 'hold_person',
    level: 2,
    label: 'Imobilizar Pessoa',
    shortLabel: 'Paralisar',
    castingTime: 'action',
    concentration: true,
    school: 'Encantamento',
    classes: ['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard'],
    kind: 'control',
    saveAbility: 'wis',
    inflictCondition: 'paralyzed',
    summary: 'Salvaguarda SAB ou Paralisado (ataques corpo a corpo são Crítico automático!).',
    themed: {
      cyberpunk: { label: 'Hack Reboot Óptico', shortLabel: 'Reboot' },
    },
  },
  scorching_ray: {
    id: 'scorching_ray',
    level: 2,
    label: 'Raio Ardente',
    shortLabel: 'R. Ardente',
    castingTime: 'action',
    school: 'Evocação',
    classes: ['wizard', 'sorcerer'],
    kind: 'attack',
    damageDice: '6d6',
    damageType: 'fire',
    summary: '3 rajadas flamejantes: 6d6 Fogo em um alvo.',
  },
  spiritual_weapon: {
    id: 'spiritual_weapon',
    level: 2,
    label: 'Arma Espiritual',
    shortLabel: 'Arma Esp.',
    castingTime: 'bonus',
    concentration: true,
    school: 'Evocação',
    classes: ['cleric'],
    kind: 'attack',
    damageDice: '1d8',
    damageType: 'force',
    summary: 'Ação Bônus: ataque espectral de 1d8 + mod Energia.',
  },

  // === LEVEL 3 SPELLS ===
  fireball: {
    id: 'fireball',
    level: 3,
    label: 'Bola de Fogo',
    shortLabel: 'Bola Fogo',
    castingTime: 'action',
    school: 'Evocação',
    classes: ['wizard', 'sorcerer'],
    kind: 'save_damage',
    damageDice: '8d6',
    damageType: 'fire',
    saveAbility: 'dex',
    halfOnSave: true,
    isAoE: true,
    summary: 'Explosão devastadora em área: 8d6 Fogo (DES metade)!',
    themed: {
      cyberpunk: { label: 'Granada Termobárica', shortLabel: 'Termobár.' },
      zombies: { label: 'Carga C4 Incendiária', shortLabel: 'Carga C4' },
      apocalyptic: { label: 'Morteiro de Napalm', shortLabel: 'Napalm' },
    },
  },
  lightning_bolt: {
    id: 'lightning_bolt',
    level: 3,
    label: 'Relâmpago',
    shortLabel: 'Relâmpago',
    castingTime: 'action',
    school: 'Evocação',
    classes: ['wizard', 'sorcerer'],
    kind: 'save_damage',
    damageDice: '8d6',
    damageType: 'lightning',
    saveAbility: 'dex',
    halfOnSave: true,
    isAoE: true,
    summary: 'Linha elétrica de alta tensão: 8d6 Elétrico (DES metade).',
  },
  spirit_guardians: {
    id: 'spirit_guardians',
    level: 3,
    label: 'Guardiões Espirituais',
    shortLabel: 'Guardiões',
    castingTime: 'action',
    concentration: true,
    school: 'Conjuração',
    classes: ['cleric'],
    kind: 'save_damage',
    damageDice: '3d8',
    damageType: 'radiant',
    saveAbility: 'wis',
    halfOnSave: true,
    isAoE: true,
    summary: 'Concentração em área: 3d8 Radiante (SAB metade) e desacelera inimigos.',
  },
  mass_healing_word: {
    id: 'mass_healing_word',
    level: 3,
    label: 'Palavra Curativa em Massa',
    shortLabel: 'Cura Grupo',
    castingTime: 'bonus',
    school: 'Abjuração',
    classes: ['cleric', 'bard'],
    kind: 'heal',
    healDice: '2d4',
    summary: 'Ação Bônus: cura você e todos os aliados em 2d4 + mod!',
  },
};

export const DND_SPELL_LIST: DndSpellDefinition[] = Object.values(DND_SPELLS);

/**
 * Full Caster Spell Slots by Level (1..20) — Official SRD 5.2 Table.
 */
export const FULL_CASTER_SLOTS: readonly (readonly number[])[] = [
  [2], // Lv 1
  [3], // Lv 2
  [4, 2], // Lv 3
  [4, 3], // Lv 4
  [4, 3, 2], // Lv 5
  [4, 3, 3], // Lv 6
  [4, 3, 3, 1], // Lv 7
  [4, 3, 3, 2], // Lv 8
  [4, 3, 3, 3, 1], // Lv 9
  [4, 3, 3, 3, 2], // Lv 10
  [4, 3, 3, 3, 2, 1], // Lv 11
  [4, 3, 3, 3, 2, 1], // Lv 12
  [4, 3, 3, 3, 2, 1, 1], // Lv 13
  [4, 3, 3, 3, 2, 1, 1], // Lv 14
  [4, 3, 3, 3, 2, 1, 1, 1], // Lv 15
  [4, 3, 3, 3, 2, 1, 1, 1], // Lv 16
  [4, 3, 3, 3, 2, 1, 1, 1, 1], // Lv 17
  [4, 3, 3, 3, 3, 1, 1, 1, 1], // Lv 18
  [4, 3, 3, 3, 3, 2, 1, 1, 1], // Lv 19
  [4, 3, 3, 3, 3, 2, 2, 1, 1], // Lv 20
];

/**
 * Half Caster Spell Slots (2024 SRD 5.2 — Paladin & Ranger start with 2 Lv.1 slots at Level 1!).
 */
export const HALF_CASTER_SLOTS_2024: readonly (readonly number[])[] = [
  [2], // Lv 1 (2024!)
  [2], // Lv 2
  [3], // Lv 3
  [3], // Lv 4
  [4, 2], // Lv 5
  [4, 2], // Lv 6
  [4, 3], // Lv 7
  [4, 3], // Lv 8
  [4, 3, 2], // Lv 9
  [4, 3, 2], // Lv 10
  [4, 3, 3], // Lv 11
  [4, 3, 3], // Lv 12
  [4, 3, 3, 1], // Lv 13
  [4, 3, 3, 1], // Lv 14
  [4, 3, 3, 2], // Lv 15
  [4, 3, 3, 2], // Lv 16
  [4, 3, 3, 3, 1], // Lv 17
  [4, 3, 3, 3, 1], // Lv 18
  [4, 3, 3, 3, 2], // Lv 19
  [4, 3, 3, 3, 2], // Lv 20
];

/** Warlock Pact Magic (short-rest recharge slots) by Level 1..20 */
export const WARLOCK_PACT_SLOTS: readonly { count: number; level: number }[] = [
  { count: 1, level: 1 }, // Lv 1
  { count: 2, level: 1 }, // Lv 2
  { count: 2, level: 2 }, // Lv 3
  { count: 2, level: 2 }, // Lv 4
  { count: 2, level: 3 }, // Lv 5
  { count: 2, level: 3 }, // Lv 6
  { count: 2, level: 4 }, // Lv 7
  { count: 2, level: 4 }, // Lv 8
  { count: 2, level: 5 }, // Lv 9
  { count: 2, level: 5 }, // Lv 10
  { count: 3, level: 5 }, // Lv 11
  { count: 3, level: 5 }, // Lv 12
  { count: 3, level: 5 }, // Lv 13
  { count: 3, level: 5 }, // Lv 14
  { count: 3, level: 5 }, // Lv 15
  { count: 3, level: 5 }, // Lv 16
  { count: 4, level: 5 }, // Lv 17
  { count: 4, level: 5 }, // Lv 18
  { count: 4, level: 5 }, // Lv 19
  { count: 4, level: 5 }, // Lv 20
];

export const THEME_VOCABULARY: Record<
  WorldThemeId,
  {
    spellSlotsLabel: string;
    spellSlotsShort: string;
    cantripsLabel: string;
    potionLabel: string;
    heavyArmorName: string;
    mediumArmorName: string;
    lightArmorName: string;
    shieldName: string;
  }
> = {
  fantasy: {
    spellSlotsLabel: 'Espaços de Magia',
    spellSlotsShort: 'Magia',
    cantripsLabel: 'Truques',
    potionLabel: 'Poção de Cura',
    heavyArmorName: 'Cota de Malha',
    mediumArmorName: 'Peitoral de Aço',
    lightArmorName: 'Couro Batido',
    shieldName: 'Escudo de Aço',
  },
  cyberpunk: {
    spellSlotsLabel: 'Blocos de RAM',
    spellSlotsShort: 'RAM',
    cantripsLabel: 'Scripts',
    potionLabel: 'Injetor Stim-Med',
    heavyArmorName: 'Exoesqueleto Balístico',
    mediumArmorName: 'Jaqueta Kevlar Tática',
    lightArmorName: 'Trama Subdérmica',
    shieldName: 'Escudo Cinético',
  },
  mystery: {
    spellSlotsLabel: 'Ritos & Reservas',
    spellSlotsShort: 'Ritos',
    cantripsLabel: 'Manobras',
    potionLabel: 'Tônico Revitalizante',
    heavyArmorName: 'Sobretudo Blindado',
    mediumArmorName: 'Colete Reforçado',
    lightArmorName: 'Casaco de Couro',
    shieldName: 'Broquel Oculto',
  },
  zombies: {
    spellSlotsLabel: 'Cargas Táticas',
    spellSlotsShort: 'Cargas',
    cantripsLabel: 'Técnicas',
    potionLabel: 'Kit Socorros',
    heavyArmorName: 'Traje SWAT',
    mediumArmorName: 'Colete Balístico',
    lightArmorName: 'Jaqueta Antimordida',
    shieldName: 'Escudo Policial',
  },
  apocalyptic: {
    spellSlotsLabel: 'Cargas & Improvisos',
    spellSlotsShort: 'Cargas',
    cantripsLabel: 'Manobras',
    potionLabel: 'Injetor Adrenalina',
    heavyArmorName: 'Armadura de Sucata',
    mediumArmorName: 'Placas Soldadas',
    lightArmorName: 'Couro dos Ermos',
    shieldName: 'Escudo de Placa',
  },
};
