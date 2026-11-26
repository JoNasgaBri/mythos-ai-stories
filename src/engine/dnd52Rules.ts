import {
  DND_BACKGROUNDS,
  DND_CLASSES,
  DND_FEATS,
  DND_SKILLS,
  DND_SPECIES,
  DND_SPELLS,
  DND_XP_DELTAS,
  DMG_2024_XP_BUDGET,
  FULL_CASTER_SLOTS,
  HALF_CASTER_SLOTS_2024,
  SRD_CR_XP,
  THEME_VOCABULARY,
  WARLOCK_PACT_SLOTS,
} from '../data/dnd52Catalog.js';
import type {
  ArmorCategory,
  AttributeId,
  Campaign,
  CharacterAttributes,
  Dnd5ePlayerSheet,
  DndBackgroundId,
  DndClassId,
  DndClassResource,
  DndItemStats,
  DndSkillId,
  DndSpeciesId,
  DndSpellSlotsState,
  InventoryItem,
  NpcRecord,
  PlayerState,
  RulesetId,
  WeaponMasteryId,
  WorldThemeId,
} from '../types/game';
import {
  computeMaxVigor,
  getAttributeModifier,
  getEffectiveAttributes,
  getEquippedGearBonuses,
  getProficiencyBonus,
  xpRequiredForLevel,
} from './rpgSystem.js';

export function isDndRuleset(campaign?: Pick<Campaign, 'ruleset'> | null): boolean {
  return campaign?.ruleset === 'dnd5e_2024';
}

export function getMaxInspirationForRuleset(ruleset?: RulesetId): number {
  return ruleset === 'dnd5e_2024' ? 1 : 4;
}

export function getXpDeltaForRuleset(level: number, ruleset?: RulesetId): number {
  const safe = Math.max(1, Math.min(20, Math.round(level || 1)));
  if (ruleset === 'dnd5e_2024') {
    return DND_XP_DELTAS[safe - 1] ?? 50000;
  }
  return xpRequiredForLevel(safe);
}

export function getCrXpValue(cr: number): number {
  let best = SRD_CR_XP[0];
  for (const row of SRD_CR_XP) {
    if (Math.abs(row.cr - cr) <= Math.abs(best.cr - cr)) {
      best = row;
    }
  }
  return best.xp;
}

export function getNarrativeXpForLevel(
  level: number,
  tier: 'minor' | 'moderate' | 'major' | 'quest',
): number {
  const safe = Math.max(1, Math.min(20, Math.round(level || 1)));
  const budget = DMG_2024_XP_BUDGET[safe] ?? DMG_2024_XP_BUDGET[1];
  switch (tier) {
    case 'minor':
      return Math.max(15, Math.round(budget.low * 0.35));
    case 'moderate':
      return Math.max(30, Math.round(budget.moderate * 0.5));
    case 'major':
      return Math.max(50, Math.round(budget.high * 0.75));
    case 'quest':
      return Math.max(100, budget.high);
  }
}

export interface DiceFormulaResult {
  formula: string;
  rolls: number[];
  flatBonus: number;
  total: number;
}

/**
 * Pure polyhedral dice roller supporting `XdY+Z`, `XdY-Z`, `XdY`, or plain integers.
 */
export function rollDiceFormula(formula: string, critDoubleDice = false): DiceFormulaResult {
  const clean = (formula || '1d4').replace(/\s+/g, '').toLowerCase();
  const match = clean.match(/^(\d+)?d(\d+)([+-]\d+)?$/);
  if (!match) {
    const flat = Number.parseInt(clean, 10);
    const val = Number.isFinite(flat) ? Math.max(0, flat) : 2;
    return { formula: clean, rolls: [], flatBonus: val, total: val };
  }
  const baseCount = Math.max(1, Math.min(24, Number.parseInt(match[1] || '1', 10)));
  const sides = Math.max(2, Math.min(100, Number.parseInt(match[2], 10)));
  const flatBonus = match[3] ? Number.parseInt(match[3], 10) : 0;
  const count = critDoubleDice ? baseCount * 2 : baseCount;
  const rolls: number[] = [];
  let sum = 0;
  for (let i = 0; i < count; i++) {
    const r = Math.floor(Math.random() * sides) + 1;
    rolls.push(r);
    sum += r;
  }
  return {
    formula: critDoubleDice ? `${count}d${sides}${flatBonus ? (flatBonus > 0 ? `+${flatBonus}` : `${flatBonus}`) : ''}` : clean,
    rolls,
    flatBonus,
    total: Math.max(1, sum + flatBonus),
  };
}

export function getAverageDiceRoll(formula: string): number {
  const clean = (formula || '1d6').replace(/\s+/g, '').toLowerCase();
  const match = clean.match(/^(\d+)?d(\d+)([+-]\d+)?$/);
  if (!match) {
    const flat = Number.parseInt(clean, 10);
    return Number.isFinite(flat) ? flat : 3;
  }
  const count = Number.parseInt(match[1] || '1', 10);
  const sides = Number.parseInt(match[2], 10);
  const flat = match[3] ? Number.parseInt(match[3], 10) : 0;
  return Math.max(1, Math.round(count * ((sides + 1) / 2) + flat));
}

export function roll4d6DropLowest(): number {
  const dice = [0, 0, 0, 0].map(() => Math.floor(Math.random() * 6) + 1);
  dice.sort((a, b) => a - b);
  return dice[1] + dice[2] + dice[3];
}

export function roll4d6AbilityArray(): number[] {
  return [0, 0, 0, 0, 0, 0]
    .map(() => roll4d6DropLowest())
    .sort((a, b) => b - a);
}

/**
 * Official Cantrip scaling by character level (1 / 5 / 11 / 17).
 */
export function scaleCantripDice(baseDice: string, level: number): string {
  const m = baseDice.trim().toLowerCase().match(/^(\d+)d(\d+)$/);
  if (!m) return baseDice;
  const sides = m[2];
  const mult = level >= 17 ? 4 : level >= 11 ? 3 : level >= 5 ? 2 : 1;
  return `${Math.max(1, Number.parseInt(m[1], 10)) * mult}d${sides}`;
}

export function computeSpellSlotsForClass(
  classId: DndClassId,
  level: number,
  existing?: DndSpellSlotsState,
): DndSpellSlotsState {
  const cls = DND_CLASSES[classId];
  const idx = Math.max(0, Math.min(19, Math.round(level || 1) - 1));
  const tiers: Record<number, { max: number; current: number }> = {};

  if (cls.casterType === 'full' || cls.casterType === 'half') {
    const table = cls.casterType === 'full' ? FULL_CASTER_SLOTS : HALF_CASTER_SLOTS_2024;
    const row = table[idx] ?? [];
    row.forEach((maxSlots, i) => {
      const circle = i + 1;
      const prev = existing?.tiers?.[circle];
      const current = prev
        ? Math.max(0, Math.min(maxSlots, prev.current + Math.max(0, maxSlots - prev.max)))
        : maxSlots;
      tiers[circle] = { max: maxSlots, current };
    });
    return { tiers };
  }

  if (cls.casterType === 'pact') {
    const pact = WARLOCK_PACT_SLOTS[idx] ?? WARLOCK_PACT_SLOTS[0];
    const prevMax = existing?.pactMax ?? 0;
    const prevCur = existing?.pactCurrent ?? pact.count;
    const nextCur = existing
      ? Math.max(0, Math.min(pact.count, prevCur + Math.max(0, pact.count - prevMax)))
      : pact.count;
    return {
      tiers: {},
      pactMax: pact.count,
      pactCurrent: nextCur,
      pactSlotLevel: pact.level,
    };
  }

  return { tiers: {} };
}

export function computeClassResourcesForLevel(
  classId: DndClassId,
  level: number,
  attrs: CharacterAttributes,
  existing?: DndClassResource[],
): DndClassResource[] {
  const lv = Math.max(1, Math.min(20, Math.round(level || 1)));
  const prevMap = new Map((existing ?? []).map((r) => [r.id, r]));
  const make = (
    id: string,
    name: string,
    shortName: string,
    max: number,
    recharge: DndClassResource['recharge'],
  ): DndClassResource => {
    const prev = prevMap.get(id);
    const current = prev
      ? Math.max(0, Math.min(max, prev.current + Math.max(0, max - prev.max)))
      : max;
    return { id, name, shortName, current, max, recharge };
  };

  switch (classId) {
    case 'fighter': {
      const swMax = lv >= 10 ? 4 : lv >= 4 ? 3 : 2;
      const list = [make('second_wind', 'Retomar o Fôlego', 'Fôlego', swMax, 'short_rest_one')];
      if (lv >= 2) {
        list.push(make('action_surge', 'Surto de Ação', 'Surto', lv >= 17 ? 2 : 1, 'short_rest'));
      }
      return list;
    }
    case 'barbarian': {
      const rageMax = lv >= 17 ? 6 : lv >= 12 ? 5 : lv >= 6 ? 4 : lv >= 3 ? 3 : 2;
      return [make('rage', 'Fúria', 'Fúria', rageMax, 'short_rest_one')];
    }
    case 'paladin': {
      const list = [make('lay_on_hands', 'Imposição de Mãos (PV)', 'Cura Mãos', lv * 5, 'long_rest')];
      if (lv >= 3) {
        list.push(make('channel_divinity', 'Canalizar Divindade', 'Divind.', lv >= 11 ? 3 : 2, 'short_rest_one'));
      }
      return list;
    }
    case 'cleric': {
      if (lv < 2) return [];
      return [make('channel_divinity', 'Canalizar Divindade', 'Divind.', lv >= 18 ? 4 : lv >= 6 ? 3 : 2, 'short_rest_one')];
    }
    case 'bard': {
      const chaMod = Math.max(1, getAttributeModifier(attrs.cha));
      return [make('bardic_inspiration', 'Inspiração Bárdica', 'Insp. Bárd.', chaMod, lv >= 5 ? 'short_rest' : 'long_rest')];
    }
    case 'monk': {
      if (lv < 2) return [];
      return [make('focus_points', 'Pontos de Foco (Ki)', 'Foco', lv, 'short_rest')];
    }
    case 'druid': {
      if (lv < 2) return [];
      return [make('wild_shape', 'Forma Selvagem', 'Forma', lv >= 17 ? 4 : lv >= 6 ? 3 : 2, 'short_rest_one')];
    }
    case 'sorcerer': {
      if (lv < 2) return [make('innate_sorcery', 'Feitiçaria Inata', 'Inata', 2, 'long_rest')];
      return [
        make('sorcery_points', 'Pontos de Feitiçaria', 'Feitiç.', lv, 'long_rest'),
        make('innate_sorcery', 'Feitiçaria Inata', 'Inata', 2, 'long_rest'),
      ];
    }
    default:
      return [];
  }
}

export interface ArmorClassBreakdown {
  ac: number;
  formula: string;
  armorCategory: ArmorCategory;
  hasShield: boolean;
  stealthDisadvantage: boolean;
  nonProficientArmor: boolean;
  lacksStrReq: boolean;
}

export function computeArmorClass(
  player: PlayerState,
  tempBonusAc = 0,
): ArmorClassBreakdown {
  const attrs = getEffectiveAttributes(player);
  const dexMod = getAttributeModifier(attrs.dex);
  const conMod = getAttributeModifier(attrs.con);
  const wisMod = getAttributeModifier(attrs.wis);
  const chaMod = getAttributeModifier(attrs.cha);
  const dnd = player.dnd;
  const cls = dnd ? DND_CLASSES[dnd.classId] : undefined;

  let armorItem: InventoryItem | undefined;
  let shieldItem: InventoryItem | undefined;
  let extraAcBonus = 0;

  for (const item of player.inventory ?? []) {
    if (!item.equipped) continue;
    if (item.equipSlot === 'armor' || (item.dndStats?.armorCategory && item.dndStats.armorCategory !== 'shield' && item.dndStats.armorCategory !== 'none')) {
      armorItem = item;
    } else if (
      item.dndStats?.armorCategory === 'shield' ||
      (item.equipSlot === 'offhand' && /escudo|shield|broquel/i.test(item.name))
    ) {
      shieldItem = item;
    } else if (typeof item.dndStats?.acBonus === 'number') {
      extraAcBonus += item.dndStats.acBonus;
    }
  }

  const hasShield = Boolean(shieldItem);
  const shieldBonus = hasShield ? (shieldItem?.dndStats?.acBonus ?? 2) : 0;

  // Fighting Style: Defense (+1 AC while wearing armor)
  const defenseStyleBonus =
    armorItem && (dnd?.fightingStyleId === 'style_defense' || dnd?.featIds.includes('style_defense'))
      ? 1
      : 0;

  let baseAc = 10 + dexMod;
  let formula = `10 + DES (${dexMod >= 0 ? `+${dexMod}` : dexMod})`;
  let armorCategory: ArmorCategory = 'none';
  let stealthDisadvantage = false;
  let nonProficientArmor = false;
  let lacksStrReq = false;

  if (armorItem) {
    const inferredCat: ArmorCategory =
      armorItem.dndStats?.armorCategory ??
      (/(placas|cota de malha|exoesqueleto|swat|pesad|plate|chain mail)/i.test(armorItem.name)
        ? 'heavy'
        : /(peitoral|camisão|escamas|kevlar|bal[ií]stic|refor[cç]ad|scale|breastplate)/i.test(armorItem.name)
          ? 'medium'
          : 'light');
    armorCategory = inferredCat;
    const rawBase =
      armorItem.dndStats?.armorBaseAc ??
      (inferredCat === 'heavy' ? 16 : inferredCat === 'medium' ? 14 : 12);

    if (inferredCat === 'heavy') {
      baseAc = rawBase;
      formula = `${armorItem.name} (${rawBase})`;
      stealthDisadvantage = armorItem.dndStats?.stealthDisadvantage ?? true;
      const strReq = armorItem.dndStats?.strReq ?? (rawBase >= 17 ? 15 : 13);
      if (attrs.str < strReq) lacksStrReq = true;
    } else if (inferredCat === 'medium') {
      const cappedDex = Math.min(2, dexMod);
      baseAc = rawBase + cappedDex;
      formula = `${armorItem.name} (${rawBase}) + DES (${cappedDex >= 0 ? `+${cappedDex}` : cappedDex})`;
      stealthDisadvantage = Boolean(armorItem.dndStats?.stealthDisadvantage);
    } else {
      baseAc = rawBase + dexMod;
      formula = `${armorItem.name} (${rawBase}) + DES (${dexMod >= 0 ? `+${dexMod}` : dexMod})`;
      stealthDisadvantage = Boolean(armorItem.dndStats?.stealthDisadvantage);
    }

    if (cls && !cls.armorProficiencies.includes(inferredCat)) {
      nonProficientArmor = true;
    }
  } else if (dnd?.classId === 'barbarian') {
    // Barbarian Unarmored Defense: 10 + DEX + CON (allows Shield!)
    baseAc = 10 + dexMod + conMod;
    formula = `Defesa Bárbara (10 + DES + CON)`;
  } else if (dnd?.classId === 'monk' && !hasShield) {
    // Monk Unarmored Defense: 10 + DEX + WIS (forbids Shield & Armor!)
    baseAc = 10 + dexMod + wisMod;
    formula = `Defesa Monástica (10 + DES + SAB)`;
  } else if (dnd?.classId === 'sorcerer' && dnd.subclassId === 'draconic') {
    baseAc = 10 + dexMod + chaMod;
    formula = `Escamas Dracônicas (10 + DES + CAR)`;
  }

  if (hasShield && cls && !cls.armorProficiencies.includes('shield')) {
    nonProficientArmor = true;
  }

  const totalAc = Math.max(
    8,
    baseAc + shieldBonus + defenseStyleBonus + extraAcBonus + tempBonusAc,
  );
  if (hasShield) formula += ` + Escudo (+${shieldBonus})`;
  if (defenseStyleBonus) formula += ` + Defesa (+1)`;
  if (extraAcBonus) formula += ` + Itens (+${extraAcBonus})`;
  if (tempBonusAc) formula += ` + Magia (+${tempBonusAc})`;

  return {
    ac: totalAc,
    formula,
    armorCategory,
    hasShield,
    stealthDisadvantage,
    nonProficientArmor,
    lacksStrReq,
  };
}

/**
 * Single Source of Truth HP calculator respecting BOTH `dnd5e_2024` and `mythos_legacy`!
 * Prevents legacy `>= 60` floor from ever corrupting a Lv.1 D&D 5.2 hero (6-17 PV).
 */
export function computeMaxHpForRuleset(
  ruleset: RulesetId | undefined,
  player: Pick<PlayerState, 'level' | 'attributes' | 'inventory' | 'dnd'>,
): number {
  const safeLevel = Math.max(1, Math.min(20, Math.round(player.level || 1)));
  const gear = getEquippedGearBonuses(player.inventory ?? []);
  const effCon = Math.max(1, Math.min(30, (player.attributes?.con ?? 10) + (gear.con ?? 0)));

  if (ruleset !== 'dnd5e_2024') {
    return computeMaxVigor(safeLevel, effCon, gear.maxVigor ?? 0);
  }

  const dnd = player.dnd;
  const hitDie = dnd?.hitDie ?? (dnd?.classId ? DND_CLASSES[dnd.classId].hitDie : 10);
  const conMod = getAttributeModifier(effCon);
  const lv1Hp = Math.max(1, hitDie + conMod);
  const avgPerLv = Math.max(1, Math.floor(hitDie / 2) + 1 + conMod);
  let total = lv1Hp + (safeLevel - 1) * avgPerLv;

  // Species HP bonus (Dwarf: +1 PV/level)
  const species = dnd?.speciesId ? DND_SPECIES[dnd.speciesId] : undefined;
  if (species?.hpPerLevelBonus) {
    total += species.hpPerLevelBonus * safeLevel;
  }

  // Draconic Sorcerer: +1 PV/level
  if (dnd?.classId === 'sorcerer' && dnd.subclassId === 'draconic') {
    total += safeLevel;
  }

  // Feats (+2 PV/lv Vigorous Body, +40 Epic Boon of Fortitude)
  for (const featId of dnd?.featIds ?? []) {
    const feat = DND_FEATS[featId];
    if (feat?.hpPerLevelBonus) total += feat.hpPerLevelBonus * safeLevel;
    if (featId === 'boon_fortitude') total += 40;
  }

  // Only add small bounded relic maxVigor bonus if present
  if (gear.maxVigor && gear.maxVigor > 0) {
    total += Math.min(20, gear.maxVigor);
  }

  return Math.max(4, total);
}

/**
 * Single Source of Truth NPC/Companion HP calculator (Sidekick d8 + CON per level in 5.2!).
 */
export function computeNpcMaxHpForRuleset(
  ruleset: RulesetId | undefined,
  npc: Pick<NpcRecord, 'level' | 'attributes' | 'role'>,
): number {
  const safeLevel = Math.max(1, Math.min(20, Math.round(npc.level || 1)));
  const con = npc.attributes?.con ?? 12;
  if (ruleset !== 'dnd5e_2024') {
    return computeMaxVigor(safeLevel, con, 0);
  }
  const conMod = getAttributeModifier(con);
  const isTank = /(guard|guerreir|soldad|cavaleir|tanque|bárbar|paladin|escud)/i.test(npc.role || '');
  const hd = isTank ? 10 : 8;
  const lv1 = Math.max(4, hd + conMod);
  const perLv = Math.max(1, Math.floor(hd / 2) + 1 + conMod);
  return Math.max(6, lv1 + (safeLevel - 1) * perLv);
}

export function computeNpcArmorClass(npc: Pick<NpcRecord, 'attributes' | 'role' | 'armorClass'>): number {
  if (typeof npc.armorClass === 'number' && npc.armorClass >= 8 && npc.armorClass <= 22) {
    return npc.armorClass;
  }
  const dexMod = getAttributeModifier(npc.attributes?.dex ?? 12);
  const r = (npc.role || '').toLowerCase();
  if (/(cavaleir|paladin|soldad|guard|tanque|blindad)/.test(r)) return Math.min(18, 15 + Math.min(2, dexMod));
  if (/(ladin|arqueir|batedor|espi|patrulh|atirad|mercen)/.test(r)) return 12 + dexMod;
  return 11 + dexMod;
}

export function computeSkillModifier(player: PlayerState, skillId: DndSkillId): number {
  const skill = DND_SKILLS[skillId];
  const attrs = getEffectiveAttributes(player);
  const mod = getAttributeModifier(attrs[skill.attribute]);
  const pb = getProficiencyBonus(player.level);
  const dnd = player.dnd;
  const isExp = dnd?.skillExpertise.includes(skillId) ?? false;
  const isProf = isExp || (dnd?.skillProficiencies.includes(skillId) ?? false);
  const jackOfAllTrades =
    !isProf && dnd?.classId === 'bard' && player.level >= 2
      ? Math.floor(pb / 2)
      : 0;
  const exhaustionPenalty = (dnd?.exhaustion ?? 0) * 2;
  return mod + (isExp ? pb * 2 : isProf ? pb : jackOfAllTrades) - exhaustionPenalty;
}

export function computePassiveScore(player: PlayerState, skillId: DndSkillId): number {
  return 10 + computeSkillModifier(player, skillId);
}

export function computeSavingThrowModifier(player: PlayerState, attr: AttributeId): number {
  const attrs = getEffectiveAttributes(player);
  const mod = getAttributeModifier(attrs[attr]);
  const pb = getProficiencyBonus(player.level);
  const dnd = player.dnd;
  const isProf = dnd?.savingThrowProficiencies.includes(attr) ?? false;
  // Paladin Lv.6 Aura of Protection (+CHA to all saves)
  const paladinAura =
    dnd?.classId === 'paladin' && player.level >= 6
      ? Math.max(1, getAttributeModifier(attrs.cha))
      : 0;
  const exhaustionPenalty = (dnd?.exhaustion ?? 0) * 2;
  return mod + (isProf ? pb : 0) + paladinAura - exhaustionPenalty;
}

export function computeInitiativeBonus(player: PlayerState): number {
  const attrs = getEffectiveAttributes(player);
  const dexMod = getAttributeModifier(attrs.dex);
  const pb = getProficiencyBonus(player.level);
  const dnd = player.dnd;
  let bonus = dexMod;
  if (dnd?.featIds.includes('alert')) bonus += pb;
  if (dnd?.classId === 'bard' && player.level >= 2 && !dnd.featIds.includes('alert')) {
    bonus += Math.floor(pb / 2);
  }
  if (dnd?.classId === 'wizard' && dnd.subclassId === 'chronist') {
    bonus += Math.max(0, getAttributeModifier(attrs.int));
  }
  return bonus - (dnd?.exhaustion ?? 0) * 2;
}

export function computeSpeedFeet(player: PlayerState): number {
  const dnd = player.dnd;
  const species = dnd?.speciesId ? DND_SPECIES[dnd.speciesId] : DND_SPECIES.human;
  let speed = species.speedFeet;
  if (dnd?.classId === 'monk' && player.level >= 2) {
    speed += player.level >= 18 ? 30 : player.level >= 14 ? 25 : player.level >= 10 ? 20 : player.level >= 6 ? 15 : 10;
  }
  if (dnd?.classId === 'barbarian' && player.level >= 5) {
    speed += 10;
  }
  const acInfo = computeArmorClass(player);
  if (acInfo.lacksStrReq) speed -= 10;
  speed -= (dnd?.exhaustion ?? 0) * 5;
  return Math.max(5, speed);
}

export function formatSpeedMetric(feet: number): string {
  const meters = Math.round((feet * 0.3) * 2) / 2;
  return `${meters}m`;
}

export function computeSpellcastingInfo(player: PlayerState): {
  ability: AttributeId;
  saveDc: number;
  attackBonus: number;
  spellMod: number;
} | null {
  const dnd = player.dnd;
  if (!dnd) return null;
  const cls = DND_CLASSES[dnd.classId];
  const ability = cls.spellcastingAbility ?? (dnd.featIds.includes('magic_initiate') ? 'int' : undefined);
  if (!ability) return null;
  const attrs = getEffectiveAttributes(player);
  const spellMod = getAttributeModifier(attrs[ability]);
  const pb = getProficiencyBonus(player.level);
  return {
    ability,
    spellMod,
    saveDc: 8 + pb + spellMod,
    attackBonus: pb + spellMod,
  };
}

export function applyDndDamageWithTempHp(
  currentHp: number,
  currentTempHp: number,
  damage: number,
): { nextHp: number; nextTempHp: number; absorbed: number; hpLost: number } {
  const dmg = Math.max(0, Math.round(damage));
  const absorbed = Math.min(currentTempHp, dmg);
  const remainder = dmg - absorbed;
  const nextHp = Math.max(0, currentHp - remainder);
  return {
    nextHp,
    nextTempHp: Math.max(0, currentTempHp - absorbed),
    absorbed,
    hpLost: currentHp - nextHp,
  };
}

export function applyDndTempHpGain(currentTempHp: number, gain: number): number {
  // Official 5e rule: Temporary HP does NOT stack; take the higher value.
  return Math.max(currentTempHp, Math.max(0, Math.round(gain)));
}

export function getThemedClassLabel(
  classId: DndClassId,
  theme: WorldThemeId,
  useClassic = false,
  short = false,
): string {
  const cls = DND_CLASSES[classId] ?? DND_CLASSES.fighter;
  if (useClassic || theme === 'fantasy') {
    return short ? cls.shortLabel : cls.label;
  }
  const t = cls.themed[theme];
  return short ? t.shortLabel : t.label;
}

export function getThemedSpeciesLabel(
  speciesId: DndSpeciesId,
  theme: WorldThemeId,
  useClassic = false,
  short = false,
): string {
  const sp = DND_SPECIES[speciesId] ?? DND_SPECIES.human;
  if (useClassic || theme === 'fantasy' || !sp.themed?.[theme]) {
    return short ? sp.shortLabel : sp.label;
  }
  const t = sp.themed[theme]!;
  return short ? t.shortLabel : t.label;
}

export function getThemedSkillLabel(
  skillId: DndSkillId,
  theme: WorldThemeId,
  useClassic = false,
  short = false,
): string {
  const sk = DND_SKILLS[skillId];
  if (useClassic || theme === 'fantasy' || !sk.themed?.[theme]) {
    return short ? sk.shortLabel : sk.label;
  }
  const t = sk.themed[theme]!;
  return short ? t.shortLabel : t.label;
}

export function getThemedSpellLabel(
  spellId: string,
  theme: WorldThemeId,
  useClassic = false,
  short = false,
): string {
  const sp = DND_SPELLS[spellId];
  if (!sp) return spellId;
  if (useClassic || theme === 'fantasy' || !sp.themed?.[theme]) {
    return short ? sp.shortLabel : sp.label;
  }
  const t = sp.themed[theme]!;
  return short ? t.shortLabel : t.label;
}

export function getThemeVocab(theme: WorldThemeId, useClassic = false) {
  return THEME_VOCABULARY[useClassic ? 'fantasy' : theme] ?? THEME_VOCABULARY.fantasy;
}

export function buildDnd5eSheetFromConfig(params: {
  classId: DndClassId;
  speciesId: DndSpeciesId;
  backgroundId: DndBackgroundId;
  level?: number;
  attributes: CharacterAttributes;
  chosenSkills?: DndSkillId[];
  chosenExpertise?: DndSkillId[];
  chosenCantrips?: string[];
  chosenSpells?: string[];
  fightingStyleId?: string;
  extraOriginFeatId?: string;
  subclassId?: string;
}): Dnd5ePlayerSheet {
  const cls = DND_CLASSES[params.classId] ?? DND_CLASSES.fighter;
  const sp = DND_SPECIES[params.speciesId] ?? DND_SPECIES.human;
  const bg = DND_BACKGROUNDS[params.backgroundId] ?? DND_BACKGROUNDS.soldier;
  const level = Math.max(1, Math.min(20, Math.round(params.level || 1)));

  const featSet = new Set<string>([bg.originFeatId]);
  if (sp.extraOriginFeat) {
    featSet.add(
      params.extraOriginFeatId ||
        (bg.originFeatId === 'alert' ? 'savage_attacker' : 'alert'),
    );
  }
  if (params.fightingStyleId) {
    featSet.add(params.fightingStyleId);
  } else if (cls.id === 'fighter') {
    featSet.add('style_dueling');
  } else if (cls.id === 'paladin' && level >= 2) {
    featSet.add('style_defense');
  } else if (cls.id === 'ranger' && level >= 2) {
    featSet.add('style_archery');
  }

  const skillSet = new Set<DndSkillId>([
    ...bg.skills,
    ...(params.chosenSkills && params.chosenSkills.length > 0
      ? params.chosenSkills
      : cls.defaultSkills),
  ]);
  if (sp.extraSkill && !skillSet.has('perception')) {
    skillSet.add('perception');
  } else if (sp.extraSkill && !skillSet.has('insight')) {
    skillSet.add('insight');
  }
  if (sp.id === 'elf') skillSet.add('perception');
  if (featSet.has('skilled')) {
    for (const extra of ['perception', 'investigation', 'persuasion', 'stealth'] as DndSkillId[]) {
      if (skillSet.size >= bg.skills.length + cls.skillChoicesCount + 3) break;
      skillSet.add(extra);
    }
  }

  const expertise: DndSkillId[] =
    params.chosenExpertise && params.chosenExpertise.length > 0
      ? params.chosenExpertise
      : cls.id === 'rogue'
        ? Array.from(skillSet).slice(0, 2)
        : cls.id === 'ranger'
          ? Array.from(skillSet).slice(0, 1)
          : [];

  const defaultMasteries: WeaponMasteryId[] =
    cls.weaponMasteryCount <= 0
      ? []
      : cls.id === 'fighter'
        ? ['sap', 'push', 'topple']
        : cls.id === 'barbarian'
          ? ['cleave', 'graze']
          : cls.id === 'rogue'
            ? ['vex', 'nick']
            : cls.id === 'ranger'
              ? ['slow', 'vex']
              : ['sap', 'topple'];

  const cantrips =
    params.chosenCantrips && params.chosenCantrips.length > 0
      ? params.chosenCantrips
      : [...cls.defaultCantrips];
  const spells =
    params.chosenSpells && params.chosenSpells.length > 0
      ? params.chosenSpells
      : [...cls.defaultSpells];

  if (featSet.has('magic_initiate') && cantrips.length === 0) {
    cantrips.push('fire_bolt');
    if (spells.length === 0) spells.push('shield');
  }

  return {
    classId: cls.id,
    subclassId: params.subclassId ?? (level >= 3 ? cls.subclasses[0]?.id : undefined),
    speciesId: sp.id,
    backgroundId: bg.id,
    fightingStyleId:
      params.fightingStyleId ??
      (cls.id === 'fighter' ? 'style_dueling' : cls.id === 'ranger' ? 'style_archery' : undefined),
    featIds: Array.from(featSet),
    skillProficiencies: Array.from(skillSet),
    skillExpertise: expertise,
    savingThrowProficiencies: [...cls.savingThrows],
    weaponMasteries: defaultMasteries,
    hitDie: cls.hitDie,
    hitDiceRemaining: level,
    tempHp: 0,
    exhaustion: 0,
    conditions: [],
    deathSaves: { successes: 0, failures: 0, stabilized: false },
    cantripIds: cantrips,
    preparedSpellIds: spells,
    spellSlots: computeSpellSlotsForClass(cls.id, level),
    concentrationSpellId: null,
    classResources: computeClassResourcesForLevel(cls.id, level, params.attributes),
    relentlessEnduranceUsed: false,
    arcaneRecoveryUsed: false,
    magicalCunningUsed: false,
    pendingSubclassChoice: level >= 3 && !params.subclassId ? false : false,
    pendingAsiOrFeat: 0,
    pendingEpicBoon: false,
  };
}

export function inferDndClassFromLegacy(
  occupation: string,
  attrs: CharacterAttributes,
  inventory: InventoryItem[],
): DndClassId {
  const txt = `${occupation} ${inventory.map((i) => i.name).join(' ')}`.toLowerCase();
  if (/(mago|feiticeir|brux|netrunner|ocultist|cientist|arcan|cajado|wizard|witch)/.test(txt)) {
    return /(brux|pact|warlock)/.test(txt) ? 'warlock' : 'wizard';
  }
  if (/(cl[eé]rig|m[eé]dic|param[eé]dic|curandeir|sacerd|medtech|doctor|medic)/.test(txt)) {
    return 'cleric';
  }
  if (/(ladin|espi|assin|infiltr|sombra|batedor|punk|rogue|spy|thief)/.test(txt)) {
    return 'rogue';
  }
  if (/(arqueir|patrulh|ca[cç]ad|rastread|arco|ranger|scout|courier)/.test(txt)) {
    return 'ranger';
  }
  if (/(paladin|templ[aá]r|sentinela|inspetor|jurament)/.test(txt)) {
    return 'paladin';
  }
  if (/(b[aá]rbar|berserk|demolid|colosso|brutam|machado)/.test(txt)) {
    return 'barbarian';
  }
  if (/(bard|orador|diplom|rocker|social|nobre|lider)/.test(txt)) {
    return 'bard';
  }
  if (/(monge|marcial|pugilist|ronin|katana)/.test(txt)) {
    return 'monk';
  }
  if (/(druid|eremita|natural)/.test(txt)) {
    return 'druid';
  }
  // Stat fallback
  if (attrs.int >= 15) return 'wizard';
  if (attrs.dex >= 15 && attrs.str <= 12) return 'rogue';
  if (attrs.cha >= 15) return 'bard';
  if (attrs.wis >= 15) return 'cleric';
  return 'fighter';
}

export function buildDefaultDndStarterGear(
  classId: DndClassId,
  theme: WorldThemeId,
  useClassic = false,
): InventoryItem[] {
  const cls = DND_CLASSES[classId] ?? DND_CLASSES.fighter;
  const vocab = getThemeVocab(theme, useClassic);
  const items: InventoryItem[] = [];

  // Primary Weapon
  let weaponName = cls.defaultWeapon.name;
  let weaponStats: DndItemStats = { ...cls.defaultWeapon.stats };
  if (theme !== 'fantasy' && !useClassic) {
    if (classId === 'ranger' || classId === 'fighter' && theme === 'zombies') {
      weaponName = theme === 'cyberpunk' ? 'Carabina de Pulso' : 'Rifle Tático';
      weaponStats = {
        weaponDice: '1d10',
        damageType: 'piercing',
        properties: ['ranged', 'two_handed', 'reload'],
        mastery: 'slow',
      };
    } else if (classId === 'rogue' && (theme === 'cyberpunk' || theme === 'mystery')) {
      weaponName = theme === 'cyberpunk' ? 'Katana Monofio' : 'Pistola Silenciada';
      weaponStats =
        theme === 'cyberpunk'
          ? { weaponDice: '1d8', damageType: 'slashing', properties: ['finesse', 'light'], mastery: 'vex' }
          : { weaponDice: '1d8', damageType: 'piercing', properties: ['ranged', 'reload'], mastery: 'vex' };
    }
  }

  items.push({
    id: `dnd_wpn_${classId}_${Date.now()}`,
    name: weaponName,
    category: 'weapon',
    quantity: 1,
    rarity: 'common',
    equipSlot: 'weapon',
    equipped: true,
    storage: 'carry',
    note: `Arma inicial (${weaponStats.weaponDice ?? '1d8'})`,
    dndStats: weaponStats,
  });

  // Starter Armor
  if (cls.defaultArmor) {
    const cat = cls.defaultArmor.stats.armorCategory;
    const armorName =
      theme === 'fantasy' || useClassic
        ? cls.defaultArmor.name
        : cat === 'heavy'
          ? vocab.heavyArmorName
          : cat === 'medium'
            ? vocab.mediumArmorName
            : vocab.lightArmorName;

    items.push({
      id: `dnd_arm_${classId}_${Date.now() + 1}`,
      name: armorName,
      category: 'tool',
      quantity: 1,
      rarity: 'common',
      equipSlot: 'armor',
      equipped: true,
      storage: 'carry',
      note: `Armadura ${cat === 'heavy' ? 'Pesada' : cat === 'medium' ? 'Média' : 'Leve'} · CA base ${cls.defaultArmor.stats.armorBaseAc}`,
      dndStats: { ...cls.defaultArmor.stats },
    });
  }

  // Starter Shield (only if weapon isn't two-handed)
  if (cls.defaultShield && !weaponStats.properties?.includes('two_handed')) {
    items.push({
      id: `dnd_shd_${classId}_${Date.now() + 2}`,
      name: vocab.shieldName,
      category: 'tool',
      quantity: 1,
      rarity: 'common',
      equipSlot: 'offhand',
      equipped: true,
      storage: 'carry',
      note: '+2 na Classe de Armadura (CA)',
      dndStats: { armorCategory: 'shield', acBonus: 2 },
    });
  }

  // Starter Healing Potion (2024: 2d4+2 Bonus Action!)
  items.push({
    id: `dnd_pot_${classId}_${Date.now() + 3}`,
    name: vocab.potionLabel,
    category: 'consumable',
    quantity: 2,
    rarity: 'common',
    storage: 'carry',
    note: 'Ação Bônus (2024): recupera 2d4+2 PV imediatamente.',
    dndStats: { healDice: '2d4+2' },
  });

  return items;
}

/**
 * Safely converts a legacy `'mythos_legacy'` campaign into full `'dnd5e_2024'`
 * preserving story progress, proportional Hero HP, AND proportional NPC/Ally HP!
 */
export function hydrateDnd5eSheetFromLegacy(campaign: Campaign): Campaign {
  const attrs = campaign.player.attributes;
  const classId = inferDndClassFromLegacy(
    campaign.player.occupation,
    attrs,
    campaign.player.inventory,
  );
  const bgId: DndBackgroundId =
    classId === 'wizard'
      ? 'sage'
      : classId === 'rogue'
        ? 'criminal'
        : classId === 'cleric'
          ? 'acolyte'
          : 'soldier';

  const dnd = buildDnd5eSheetFromConfig({
    classId,
    speciesId: 'human',
    backgroundId: bgId,
    level: campaign.player.level,
    attributes: attrs,
  });

  // Enrich existing equipped weapon/armor/consumables with inferred D&D 5.2 stats
  const cls = DND_CLASSES[classId];
  const upgradedInventory = campaign.player.inventory.map((item) => {
    if (item.dndStats) return item;
    if (item.category === 'weapon') {
      return {
        ...item,
        dndStats: { ...cls.defaultWeapon.stats },
      };
    }
    if (item.category === 'consumable') {
      return {
        ...item,
        dndStats: { healDice: '2d4+2' },
      };
    }
    if (item.equipSlot === 'armor' && cls.defaultArmor) {
      return {
        ...item,
        dndStats: { ...cls.defaultArmor.stats },
      };
    }
    if (item.equipSlot === 'offhand' && /escudo|shield/i.test(item.name)) {
      return {
        ...item,
        dndStats: { armorCategory: 'shield' as ArmorCategory, acBonus: 2 },
      };
    }
    return item;
  });

  const tempPlayer: PlayerState = {
    ...campaign.player,
    inventory: upgradedInventory,
    dnd,
  };
  const oldPct =
    campaign.player.maxVigor > 0
      ? Math.max(0, Math.min(1, campaign.player.vigor / campaign.player.maxVigor))
      : 1;
  const newMaxHp = computeMaxHpForRuleset('dnd5e_2024', tempPlayer);
  const newHp = oldPct === 0 ? 0 : Math.max(1, Math.round(newMaxHp * oldPct));

  // Proportionally scale ALL codex.npcs HP & AC so allies aren't 100-HP juggernauts!
  const migratedNpcs = campaign.codex.npcs.map((npc) => {
    const npcOldMax = npc.maxVigor ?? 100;
    const npcOldPct = npcOldMax > 0 ? Math.max(0, Math.min(1, (npc.vigor ?? npcOldMax) / npcOldMax)) : 1;
    const npcNewMax = computeNpcMaxHpForRuleset('dnd5e_2024', npc);
    return {
      ...npc,
      maxVigor: npcNewMax,
      vigor: npcOldPct === 0 ? 0 : Math.max(1, Math.round(npcNewMax * npcOldPct)),
      armorClass: computeNpcArmorClass(npc),
    };
  });

  return {
    ...campaign,
    ruleset: 'dnd5e_2024',
    progressionMode: campaign.progressionMode ?? 'xp',
    pendingSavingThrow: null,
    player: {
      ...tempPlayer,
      vigor: newHp,
      maxVigor: newMaxHp,
      inspiration: Math.min(1, campaign.player.inspiration ?? 1),
      xpToNextLevel: getXpDeltaForRuleset(campaign.player.level, 'dnd5e_2024'),
    },
    codex: {
      ...campaign.codex,
      npcs: migratedNpcs,
    },
  };
}

/**
 * Computes Short Rest & Long Rest updates faithfully under 2024 SRD 5.2 rules!
 */
export function applyDnd2024ShortRest(
  player: PlayerState,
  hitDiceToSpend: number,
): { nextPlayer: PlayerState; healedHp: number; rollSummary: string; rechargedNotes: string[] } {
  const dnd = player.dnd;
  if (!dnd) {
    return { nextPlayer: player, healedHp: 0, rollSummary: '', rechargedNotes: [] };
  }
  const attrs = getEffectiveAttributes(player);
  const conMod = getAttributeModifier(attrs.con);
  const pb = getProficiencyBonus(player.level);
  const hasFieldMedic = dnd.featIds.includes('field_medic');
  const spend = Math.max(0, Math.min(dnd.hitDiceRemaining, Math.round(hitDiceToSpend)));

  let totalHeal = 0;
  const rolls: number[] = [];
  for (let i = 0; i < spend; i++) {
    const r = Math.floor(Math.random() * dnd.hitDie) + 1;
    rolls.push(r);
    totalHeal += Math.max(1, r + conMod + (hasFieldMedic ? pb : 0));
  }

  const nextVigor = Math.min(player.maxVigor, player.vigor + totalHeal);
  const healedHp = Math.max(0, nextVigor - player.vigor);

  const rechargedNotes: string[] = [];
  const nextResources = dnd.classResources.map((res) => {
    if (res.recharge === 'short_rest' && res.current < res.max) {
      rechargedNotes.push(`${res.shortName} recarregado`);
      return { ...res, current: res.max };
    }
    if (res.recharge === 'short_rest_one' && res.current < res.max) {
      rechargedNotes.push(`+1 ${res.shortName}`);
      return { ...res, current: Math.min(res.max, res.current + 1) };
    }
    return res;
  });

  // Warlock Pact Magic restores ALL slots on Short Rest!
  const nextSlots: DndSpellSlotsState = {
    tiers: { ...dnd.spellSlots.tiers },
    pactMax: dnd.spellSlots.pactMax,
    pactCurrent: dnd.spellSlots.pactMax ?? dnd.spellSlots.pactCurrent,
    pactSlotLevel: dnd.spellSlots.pactSlotLevel,
  };
  if (dnd.spellSlots.pactMax && (dnd.spellSlots.pactCurrent ?? 0) < dnd.spellSlots.pactMax) {
    rechargedNotes.push('Espaços de Pacto recarregados');
  }

  // Wizard Arcane Recovery / Land Druid Natural Recovery (1/Long Rest): recover 1 spent lowest-level slot
  let nextArcaneRecUsed = dnd.arcaneRecoveryUsed;
  if (
    !dnd.arcaneRecoveryUsed &&
    (dnd.classId === 'wizard' || (dnd.classId === 'druid' && dnd.subclassId === 'land'))
  ) {
    const budgetLevels = Math.max(1, Math.ceil(player.level / 2));
    let remaining = budgetLevels;
    for (const circle of [1, 2, 3, 4, 5]) {
      const tier = nextSlots.tiers[circle];
      if (!tier) continue;
      while (tier.current < tier.max && remaining >= circle) {
        nextSlots.tiers[circle] = { ...tier, current: tier.current + 1 };
        tier.current += 1;
        remaining -= circle;
        nextArcaneRecUsed = true;
      }
    }
    if (nextArcaneRecUsed) {
      rechargedNotes.push('Recuperação Arcana aplicada');
    }
  }

  const rollSummary =
    spend > 0
      ? `${spend}d${dnd.hitDie} [${rolls.join('+')}] ${conMod >= 0 ? `+${conMod * spend}` : `${conMod * spend}`} = +${healedHp} PV`
      : '';

  return {
    nextPlayer: {
      ...player,
      vigor: nextVigor,
      dnd: {
        ...dnd,
        hitDiceRemaining: Math.max(0, dnd.hitDiceRemaining - spend),
        classResources: nextResources,
        spellSlots: nextSlots,
        arcaneRecoveryUsed: nextArcaneRecUsed,
        deathSaves: nextVigor > 0 ? { successes: 0, failures: 0, stabilized: false } : dnd.deathSaves,
        conditions: nextVigor > 0 ? dnd.conditions.filter((c) => c !== 'unconscious') : dnd.conditions,
      },
    },
    healedHp,
    rollSummary,
    rechargedNotes,
  };
}

/**
 * 2024 SRD 5.2 Long Rest (8 hours):
 * - 100% Max HP
 * - 100% ALL spent Hit Dice restored (2024 rule!)
 * - ALL Spell Slots & Class Resources restored
 * - Exhaustion reduced by 1
 * - Human Resourceful trait grants Heroic Inspiration (1)
 * - Medbay Stronghold Upgrade grants `level + PB` Temporary HP!
 */
export function applyDnd2024LongRest(
  player: PlayerState,
  hasMedbayUpgrade: boolean,
): { nextPlayer: PlayerState; notes: string[] } {
  const dnd = player.dnd;
  if (!dnd) return { nextPlayer: player, notes: [] };

  const attrs = getEffectiveAttributes(player);
  const pb = getProficiencyBonus(player.level);
  const sp = DND_SPECIES[dnd.speciesId];
  const notes: string[] = ['100% PV e todos os Dados de Vida restaurados'];

  const freshSlots = computeSpellSlotsForClass(dnd.classId, player.level);
  const freshResources = computeClassResourcesForLevel(dnd.classId, player.level, attrs);
  const nextExhaustion = Math.max(0, dnd.exhaustion - 1);
  if (dnd.exhaustion > 0) notes.push(`Exaustão ${dnd.exhaustion} → ${nextExhaustion}`);

  let nextInspiration = player.inspiration ?? 0;
  if (sp?.longRestInspiration && nextInspiration < 1) {
    nextInspiration = 1;
    notes.push('Inspiração Heroica (Humano)');
  }

  let nextTempHp = 0;
  if (hasMedbayUpgrade) {
    nextTempHp = player.level + pb;
    notes.push(`+${nextTempHp} PV Temp (Enfermaria)`);
  }

  return {
    nextPlayer: {
      ...player,
      vigor: player.maxVigor,
      inspiration: Math.min(1, nextInspiration),
      dnd: {
        ...dnd,
        hitDiceRemaining: player.level, // 2024 SRD 5.2: ALL Hit Dice recovered!
        tempHp: nextTempHp,
        exhaustion: nextExhaustion,
        conditions: [],
        deathSaves: { successes: 0, failures: 0, stabilized: false },
        spellSlots: freshSlots,
        concentrationSpellId: null,
        classResources: freshResources,
        relentlessEnduranceUsed: false,
        arcaneRecoveryUsed: false,
        magicalCunningUsed: false,
      },
    },
    notes,
  };
}

export function getTotalAvailableSpellSlots(slots?: DndSpellSlotsState): number {
  if (!slots) return 0;
  const tierSum = Object.values(slots.tiers ?? {}).reduce((s, t) => s + Math.max(0, t.current), 0);
  return tierSum + Math.max(0, slots.pactCurrent ?? 0);
}
