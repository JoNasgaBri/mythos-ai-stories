import {
  DND_CLASSES,
  DND_CONDITIONS,
  DND_SPELLS,
  DMG_2024_XP_BUDGET,
} from '../data/dnd52Catalog';
import type {
  AttributeId,
  BaseSupplies,
  Campaign,
  ClashActionPayload,
  ClashAllyState,
  ClashEnemy,
  ClashEnemyIntent,
  ClashInitResponse,
  ClashLogEntry,
  ClashZone,
  DiceRollResult,
  DifficultyId,
  DndConditionId,
  DndDamageType,
  Dnd5ePlayerSheet,
  InventoryItem,
  StateDelta,
  TacticalClashState,
  WeaponMasteryId,
} from '../types/game';
import { resolveDndDeathSave, resolveDndSavingThrow } from './diceEngine';
import {
  applyDndDamageWithTempHp,
  applyDndTempHpGain,
  computeArmorClass,
  computeInitiativeBonus,
  computeNpcArmorClass,
  computeNpcMaxHpForRuleset,
  computeSpeedFeet,
  computeSpellcastingInfo,
  getAverageDiceRoll,
  getCrXpValue,
  getThemedSpellLabel,
  rollDiceFormula,
  scaleCantripDice,
} from './dnd52Rules';
import {
  getAttributeModifier,
  getEffectiveAttributes,
  getProficiencyBonus,
} from './rpgSystem';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function makeLog(
  round: number,
  summary: string,
  tone: ClashLogEntry['tone'],
): ClashLogEntry {
  return {
    id: `dndcl_${round}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    round,
    summary,
    tone,
  };
}

function difficultyModifiers(diff: DifficultyId) {
  switch (diff) {
    case 'easy':
      return { hpMult: 0.8, atkMod: -1, dmgMod: -1, acMod: -1, allowCrits: false };
    case 'normal':
      return { hpMult: 1.0, atkMod: 0, dmgMod: 0, acMod: 0, allowCrits: true };
    case 'hard':
      return { hpMult: 1.15, atkMod: 1, dmgMod: 0, acMod: 0, allowCrits: true };
    case 'insane':
      return { hpMult: 1.25, atkMod: 1, dmgMod: 1, acMod: 1, allowCrits: true };
    case 'good-luck':
      return { hpMult: 1.4, atkMod: 2, dmgMod: 1, acMod: 1, allowCrits: true };
  }
}

export function getEquippedWeaponDndProfile(campaign: Campaign): {
  name: string;
  dice: string;
  damageType: DndDamageType;
  attribute: AttributeId;
  attackBonus: number;
  damageBonus: number;
  mastery?: WeaponMasteryId;
  isRanged: boolean;
  isLight: boolean;
  isTwoHanded: boolean;
  hasOffhandLight: boolean;
} {
  const player = campaign.player;
  const attrs = getEffectiveAttributes(player);
  const strMod = getAttributeModifier(attrs.str);
  const dexMod = getAttributeModifier(attrs.dex);
  const dnd = player.dnd;
  const cls = dnd ? DND_CLASSES[dnd.classId] : DND_CLASSES.fighter;

  const wpn = player.inventory.find(
    (i) => i.equipped && (i.equipSlot === 'weapon' || i.category === 'weapon'),
  );
  const offhand = player.inventory.find((i) => i.equipped && i.equipSlot === 'offhand');
  const hasShield = Boolean(
    offhand && (offhand.dndStats?.armorCategory === 'shield' || /escudo|shield|broquel/i.test(offhand.name)),
  );
  const hasOffhandLight = Boolean(
    offhand && !hasShield && (offhand.dndStats?.properties?.includes('light') || /adaga|faca|curta|dagger/i.test(offhand.name)),
  );

  const stats = wpn?.dndStats ?? cls.defaultWeapon.stats;
  const props = stats.properties ?? [];
  const isRanged =
    props.includes('ranged') ||
    /(arco|besta|pistola|rifle|carabina|fuzil|rev[oó]lver|bow|gun)/i.test(wpn?.name ?? '');
  const isFinesse = props.includes('finesse') || dnd?.classId === 'monk';
  const isLight = props.includes('light');
  const isTwoHanded = props.includes('two_handed');
  const attribute: AttributeId = isRanged
    ? 'dex'
    : isFinesse
      ? dexMod >= strMod
        ? 'dex'
        : 'str'
      : 'str';

  const abilityMod = attribute === 'dex' ? dexMod : strMod;
  const pb = getProficiencyBonus(player.level);

  // Fighting styles
  const hasArchery =
    dnd?.fightingStyleId === 'style_archery' || dnd?.featIds.includes('style_archery');
  const hasDueling =
    dnd?.fightingStyleId === 'style_dueling' || dnd?.featIds.includes('style_dueling');
  const hasSharpshooter = dnd?.featIds.includes('sharpshooter_eye');

  const attackBonus =
    abilityMod +
    pb +
    (stats.attackBonus ?? 0) +
    (isRanged && hasArchery ? 2 : 0) -
    (dnd?.exhaustion ?? 0) * 2;

  const damageBonus =
    abilityMod +
    (stats.damageBonus ?? 0) +
    (!isRanged && !isTwoHanded && !hasOffhandLight && hasDueling ? 2 : 0) +
    (isRanged && hasSharpshooter ? 2 : 0);

  // Weapon Mastery ONLY active if class grants weaponMasteryCount > 0 and mastery is in player's list (or weapon's default)
  const rawMastery = stats.mastery;
  const mastery =
    cls.weaponMasteryCount > 0 && rawMastery && (!dnd || dnd.weaponMasteries.length === 0 || dnd.weaponMasteries.includes(rawMastery))
      ? rawMastery
      : undefined;

  // Monk Martial Arts die scaling
  let dice = stats.weaponDice ?? '1d8';
  if (dnd?.classId === 'monk') {
    dice = player.level >= 17 ? '1d12' : player.level >= 11 ? '1d10' : player.level >= 5 ? '1d8' : '1d6';
  } else if (props.includes('versatile') && !hasShield && !hasOffhandLight && stats.versatileDice) {
    dice = stats.versatileDice;
  }

  return {
    name: wpn?.name ?? cls.defaultWeapon.name,
    dice,
    damageType: stats.damageType ?? 'slashing',
    attribute,
    attackBonus,
    damageBonus,
    mastery,
    isRanged,
    isLight,
    isTwoHanded,
    hasOffhandLight,
  };
}

function consumeSpellSlot(
  dnd: Dnd5ePlayerSheet,
  minLevel: number,
): { nextDnd: Dnd5ePlayerSheet; usedLevel: number } | null {
  // Check Warlock Pact Magic first if eligible
  if (
    dnd.spellSlots.pactMax &&
    (dnd.spellSlots.pactCurrent ?? 0) > 0 &&
    (dnd.spellSlots.pactSlotLevel ?? 1) >= minLevel
  ) {
    return {
      usedLevel: dnd.spellSlots.pactSlotLevel ?? minLevel,
      nextDnd: {
        ...dnd,
        spellSlots: {
          ...dnd.spellSlots,
          pactCurrent: (dnd.spellSlots.pactCurrent ?? 1) - 1,
        },
      },
    };
  }
  // Check standard slots lowest available >= minLevel
  for (let lv = minLevel; lv <= 9; lv++) {
    const tier = dnd.spellSlots.tiers[lv];
    if (tier && tier.current > 0) {
      return {
        usedLevel: lv,
        nextDnd: {
          ...dnd,
          spellSlots: {
            ...dnd.spellSlots,
            tiers: {
              ...dnd.spellSlots.tiers,
              [lv]: { ...tier, current: tier.current - 1 },
            },
          },
        },
      };
    }
  }
  return null;
}

function buildDndEnemyStatProfile(
  level: number,
  isBoss: boolean,
  isSolo: boolean,
  diff: DifficultyId,
  raw: ClashInitResponse['enemies'][number],
): {
  hp: number;
  ac: number;
  cr: number;
  xpValue: number;
  attackBonus: number;
  damageDice: string;
  damageType: DndDamageType;
} {
  const dm = difficultyModifiers(diff);
  const lv = clamp(level, 1, 20);

  // DMG 2024 calibrated baseline so solo Lv.1 (7-12 HP) is exciting and FAIR (never 1-shot TPK!)
  let cr: number;
  let baseHp: number;
  let baseAc: number;
  let baseAtk: number;
  let dice: string;

  if (lv <= 2) {
    if (isBoss) {
      cr = lv === 1 ? (isSolo ? 0.25 : 0.5) : 0.5;
      baseHp = lv === 1 ? (isSolo ? 14 : 20) : isSolo ? 22 : 28;
      baseAc = lv === 1 ? 13 : 14;
      baseAtk = lv === 1 ? 3 : 4;
      dice = lv === 1 ? (isSolo ? '1d6+1' : '1d6+2') : '1d8+2';
    } else {
      cr = 0.125;
      baseHp = lv === 1 ? 7 : 11;
      baseAc = 12;
      baseAtk = 2;
      dice = '1d4+1';
    }
  } else {
    cr = isBoss ? Math.min(20, lv) : Math.max(0.5, Math.floor(lv * 0.5));
    baseHp = isBoss
      ? Math.round(16 + lv * 10)
      : Math.round(9 + lv * 5.5);
    baseAc = clamp(12 + Math.floor(lv / 4) + (isBoss ? 2 : 0), 11, 20);
    baseAtk = clamp(3 + Math.floor(lv / 2) + (isBoss ? 1 : 0), 3, 13);
    dice =
      lv >= 13
        ? isBoss
          ? '3d8+5'
          : '2d6+4'
        : lv >= 9
          ? isBoss
            ? '2d10+4'
            : '2d6+3'
          : lv >= 5
            ? isBoss
              ? '2d8+3'
              : '1d8+3'
            : isBoss
              ? '1d10+2'
              : '1d6+2';
  }

  const finalHp = clamp(
    (raw.ac && raw.hp >= 4 && raw.hp <= baseHp * 1.45 ? raw.hp : baseHp) * dm.hpMult,
    4,
    380,
  );
  const finalAc = clamp((raw.ac && raw.ac >= 9 && raw.ac <= 21 ? raw.ac : baseAc) + dm.acMod, 9, 22);
  const finalAtk = clamp((raw.attackBonus ?? baseAtk) + dm.atkMod, 1, 15);
  const finalDice = raw.damageDice && /^\d+d\d+([+-]\d+)?$/i.test(raw.damageDice) ? raw.damageDice : dice;

  return {
    hp: finalHp,
    ac: finalAc,
    cr: raw.cr ?? cr,
    xpValue: getCrXpValue(raw.cr ?? cr),
    attackBonus: finalAtk,
    damageDice: finalDice,
    damageType: raw.damageType ?? 'slashing',
  };
}

export function hydrateDnd52ClashState(
  campaign: Campaign,
  init: ClashInitResponse,
  baseClash: TacticalClashState,
): TacticalClashState {
  const player = campaign.player;
  const dnd = player.dnd;
  const isCombatOrSiege = init.archetype === 'combat' || init.archetype === 'siege';
  const now = Date.now();

  // Re-hydrate Allies with real 5.2 HP, AC, Attack Bonus & Damage Dice!
  const allies: ClashAllyState[] = campaign.codex.npcs
    .filter(
      (n) =>
        n.inParty &&
        n.status === 'alive' &&
        (n.vigor ?? 10) > 0 &&
        n.orgDuty !== 'on_mission' &&
        n.orgDuty !== 'captured',
    )
    .slice(0, 3)
    .map((n) => {
      const allyLv = n.level ?? player.level ?? 1;
      const maxHp =
        typeof n.maxVigor === 'number' && n.maxVigor >= 4
          ? n.maxVigor
          : computeNpcMaxHpForRuleset('dnd5e_2024', { level: allyLv, attributes: n.attributes, role: n.role });
      const allyPb = getProficiencyBonus(allyLv);
      const bestMod = Math.max(
        getAttributeModifier(n.attributes?.str ?? 12),
        getAttributeModifier(n.attributes?.dex ?? 12),
      );
      const initRoll = Math.floor(Math.random() * 20) + 1 + getAttributeModifier(n.attributes?.dex ?? 12);
      return {
        npcId: n.id,
        name: n.name,
        role: n.role,
        assistAttribute: n.assistAttribute ?? 'wis',
        level: allyLv,
        vigor: clamp(n.vigor ?? maxHp, 1, maxHp),
        maxVigor: maxHp,
        ac: computeNpcArmorClass(n),
        attackBonus: bestMod + allyPb,
        damageDice: allyLv >= 5 ? '2d6+3' : '1d8+2',
        conditions: [],
        initiative: initRoll,
        downed: false,
        zone: init.playerStartZone ?? 'mid',
        directive:
          n.assistAttribute === 'con'
            ? 'guard'
            : n.assistAttribute === 'dex' || n.assistAttribute === 'int'
              ? 'flank'
              : n.assistAttribute === 'wis' || n.assistAttribute === 'cha'
                ? 'support'
                : 'strike',
        shield: 0,
      };
    });

  const isSolo = allies.length === 0;
  // Solo Lv.1-2 guardrail: cap enemy count to at most 2 (1 Leader + 1 Minion) in combat/siege
  const rawEnemies =
    isCombatOrSiege && isSolo && player.level <= 2
      ? init.enemies.slice(0, 2)
      : init.enemies.slice(0, 4);

  const enemies: ClashEnemy[] = rawEnemies.map((rawE, idx) => {
    const existing = baseClash.enemies[idx];
    const isBoss = Boolean(rawE.isBoss);
    const prof = buildDndEnemyStatProfile(
      player.level,
      isBoss,
      isSolo,
      campaign.difficulty,
      rawE,
    );
    const avgDmg = getAverageDiceRoll(prof.damageDice);
    const enemyInit =
      Math.floor(Math.random() * 20) + 1 + (isBoss ? 2 : 1);

    if (!isCombatOrSiege) {
      // Social / Chase keep skill-challenge clocks + real Initiative
      return {
        ...(existing ?? {
          id: `ce_${now}_${idx}`,
          name: rawE.name,
          role: rawE.role,
          isBoss,
          hp: rawE.maxHp || 50,
          maxHp: rawE.maxHp || 50,
          posture: rawE.maxPosture || 30,
          maxPosture: rawE.maxPosture || 30,
          zone: rawE.zone ?? 'mid',
          armor: 0,
          weaknesses: rawE.weaknesses ?? [],
          nextIntent: rawE.nextIntent,
          statusTags: [],
        }),
        ac: prof.ac,
        cr: prof.cr,
        xpValue: prof.xpValue,
        conditions: [],
        initiative: enemyInit,
      };
    }

    return {
      ...(existing ?? {
        id: `ce_${now}_${idx}`,
        name: rawE.name,
        role: rawE.role,
        isBoss,
        zone: rawE.zone ?? 'mid',
        weaknesses: rawE.weaknesses ?? [],
        statusTags: [],
      }),
      hp: prof.hp,
      maxHp: prof.hp,
      ac: prof.ac,
      cr: prof.cr,
      xpValue: prof.xpValue,
      attackBonus: prof.attackBonus,
      damageDice: prof.damageDice,
      damageType: prof.damageType,
      saveMods: rawE.saveMods ?? {
        str: isBoss ? 2 : 0,
        dex: isBoss ? 1 : 1,
        con: isBoss ? 2 : 0,
        int: 0,
        wis: isBoss ? 1 : 0,
        cha: 0,
      },
      resistances: rawE.resistances ?? [],
      conditions: [],
      channeling: rawE.nextIntent?.kind === 'heavy_attack' || rawE.nextIntent?.kind === 'special',
      initiative: enemyInit,
      // Disable legacy posture bar in 5.2 combat
      posture: 0,
      maxPosture: 0,
      staggered: false,
      armor: 0,
      nextIntent: {
        ...(existing?.nextIntent ?? rawE.nextIntent),
        damage: avgDmg,
        damageDice: rawE.nextIntent?.damageDice ?? prof.damageDice,
        damageType: rawE.nextIntent?.damageType ?? prof.damageType,
        saveAbility: rawE.nextIntent?.saveAbility,
        saveDc: rawE.nextIntent?.saveDc ?? clamp(10 + Math.floor(player.level / 2), 11, 17),
        inflictCondition: rawE.nextIntent?.inflictCondition,
      },
    };
  });

  // Hero Initiative (d20 + DEX + Alert PB + Bard Jack of All Trades - Exhaustion)
  const heroInitBonus = computeInitiativeBonus(player);
  const heroInitRoll = Math.floor(Math.random() * 20) + 1 + heroInitBonus;

  const turnOrder = [
    { id: 'player', name: player.name.split(' ')[0], side: 'hero' as const, initiative: heroInitRoll },
    ...allies.map((a) => ({
      id: a.npcId,
      name: a.name.split(' ')[0],
      side: 'ally' as const,
      initiative: a.initiative ?? 10,
    })),
    ...enemies.map((e) => ({
      id: e.id,
      name: e.name.split(' ')[0],
      side: 'enemy' as const,
      initiative: e.initiative ?? 10,
    })),
  ].sort((a, b) => b.initiative - a.initiative);

  // Auto-arm Smart Reaction if hero has Shield spell or Rogue Lv.5+ Uncanny Dodge!
  const hasShieldSpell = Boolean(dnd?.preparedSpellIds.includes('shield'));
  const hasUncannyDodge = dnd?.classId === 'rogue' && player.level >= 5;
  const preArmedReaction = hasShieldSpell
    ? 'shield'
    : hasUncannyDodge
      ? 'uncanny_dodge'
      : null;

  return {
    ...baseClash,
    allies,
    enemies,
    selectedTargetId: enemies[0]?.id ?? baseClash.selectedTargetId,
    heroInitiative: heroInitRoll,
    turnOrder,
    actionUsed: false,
    bonusActionUsed: false,
    reactionUsed: false,
    movementUsed: false,
    spellSlotUsedThisTurn: false,
    actionSurgeActive: false,
    rageActive: false,
    dodgeActive: false,
    shieldSpellBonusAc: 0,
    preArmedReaction,
    playerConditions: [...(dnd?.conditions ?? [])],
    roundLog: [
      makeLog(
        1,
        `Iniciativa D&D 5.2! ${turnOrder.slice(0, 3).map((t) => `${t.name} (${t.initiative})`).join(' → ')}`,
        'system',
      ),
    ],
  };
}

export interface Dnd52InstantSubActionResult {
  nextClash: TacticalClashState;
  nextPlayer: Campaign['player'];
  caption: string;
  floatingText?: string;
  floatingColor?: string;
  targetId?: string;
  vfx?: 'heal' | 'shield' | 'limit' | 'psychic' | 'slash';
}

/**
 * Instant Free Movement across Symphony of War columns (RET / CEN / VAN) — does NOT end turn!
 */
export function executeDnd52FreeMove(
  campaign: Campaign,
  clash: TacticalClashState,
  targetZone: ClashZone,
): Dnd52InstantSubActionResult | null {
  if (clash.movementUsed || clash.playerZone === targetZone) return null;
  const dnd = campaign.player.dnd;
  const conds = dnd?.conditions ?? [];
  if (
    conds.includes('grappled') ||
    conds.includes('restrained') ||
    conds.includes('paralyzed') ||
    conds.includes('stunned') ||
    conds.includes('unconscious')
  ) {
    return null;
  }
  // Exhaustion 3+ / Speed <= 15 ft prevents free zone shift
  if (computeSpeedFeet(campaign.player) <= 15) return null;

  const nextClash: TacticalClashState = structuredClone(clash);
  const prevZone = nextClash.playerZone;
  nextClash.playerZone = targetZone;
  nextClash.movementUsed = true;

  let nextPlayer = structuredClone(campaign.player);
  const zoneLabel = targetZone === 'close' ? 'Vanguarda' : targetZone === 'far' ? 'Retaguarda' : 'Centro';
  let caption = `${campaign.player.name} moveu-se para ${zoneLabel} (Deslocamento grátis).`;
  let floatingText = `→ ${zoneLabel.toUpperCase()}`;
  let floatingColor = '#38bdf8';

  // Opportunity Attack if retreating from close melee while a healthy Vanguard enemy is standing!
  if (prevZone === 'close' && targetZone !== 'close') {
    const oppEnemy = nextClash.enemies.find(
      (e) =>
        e.hp > 0 &&
        e.zone === 'close' &&
        !(e.conditions ?? []).some((c) => DND_CONDITIONS[c]?.incapacitated),
    );
    if (oppEnemy) {
      const ac = computeArmorClass(nextPlayer, nextClash.shieldSpellBonusAc ?? 0).ac;
      const roll = Math.floor(Math.random() * 20) + 1;
      const total = roll + (oppEnemy.attackBonus ?? 3);
      if (roll !== 1 && (roll === 20 || total >= ac)) {
        const dmg = rollDiceFormula(oppEnemy.damageDice ?? '1d6+1').total;
        const applied = applyDndDamageWithTempHp(nextPlayer.vigor, nextPlayer.dnd?.tempHp ?? 0, dmg);
        nextPlayer.vigor = applied.nextHp;
        if (nextPlayer.dnd) nextPlayer.dnd.tempHp = applied.nextTempHp;
        caption = `Recuou para ${zoneLabel}, mas ${oppEnemy.name} acertou Ataque de Oportunidade (${total} vs CA ${ac}): −${dmg} PV!`;
        floatingText = `OPORT. −${dmg}`;
        floatingColor = '#f87171';
      } else {
        caption = `Recuou para ${zoneLabel} — Ataque de Oportunidade de ${oppEnemy.name} errou (${total} vs CA ${ac})!`;
      }
    }
  }

  nextClash.roundLog = [...nextClash.roundLog, makeLog(nextClash.round, caption, 'hero')].slice(-24);
  return {
    nextClash,
    nextPlayer,
    caption,
    floatingText,
    floatingColor,
    targetId: 'player',
    vfx: 'shield',
  };
}

/**
 * Instant Bonus Action BEFORE Main Action — does NOT end the round!
 * Covers: Potion of Healing (2d4+2), Fighter Second Wind, Barbarian Rage, Paladin Lay on Hands,
 * Action Surge (2024), and Bonus Action Spells (Healing Word, Misty Step, Hunter's Mark, Hex, Divine Smite).
 */
export function executeDnd52BonusAction(
  campaign: Campaign,
  clash: TacticalClashState,
  action:
    | { kind: 'potion'; item: InventoryItem }
    | { kind: 'resource'; resourceId: string }
    | { kind: 'spell'; spellId: string },
): Dnd52InstantSubActionResult | null {
  const player = campaign.player;
  const dnd = player.dnd;
  if (!dnd) return null;

  // Action Surge is a Free Action on your turn (doesn't use Bonus Action!)
  if (action.kind === 'resource' && action.resourceId === 'action_surge') {
    const resIdx = dnd.classResources.findIndex((r) => r.id === 'action_surge' && r.current > 0);
    if (resIdx < 0) return null;
    const nextClash = structuredClone(clash);
    const nextPlayer = structuredClone(player);
    nextPlayer.dnd!.classResources[resIdx].current -= 1;
    nextClash.actionSurgeActive = true;
    const caption = `⚡ SURTO DE AÇÃO! ${player.name} ganha uma 2ª Ação de Ataque neste turno!`;
    nextClash.roundLog = [...nextClash.roundLog, makeLog(nextClash.round, caption, 'combo')].slice(-24);
    return { nextClash, nextPlayer, caption, floatingText: 'SURTO DE AÇÃO!', floatingColor: '#fbbf24', targetId: 'player', vfx: 'limit' };
  }

  if (clash.bonusActionUsed) return null;

  const nextClash = structuredClone(clash);
  const nextPlayer = structuredClone(player);
  const nextDnd = nextPlayer.dnd!;
  const pb = getProficiencyBonus(player.level);

  if (action.kind === 'potion') {
    const dice = action.item.dndStats?.healDice ?? '2d4+2';
    const rolled = rollDiceFormula(dice);
    const featBonus = nextDnd.featIds.includes('field_medic') ? pb : 0;
    const totalHeal = rolled.total + featBonus;
    nextPlayer.vigor = Math.min(nextPlayer.maxVigor, nextPlayer.vigor + totalHeal);
    nextPlayer.inventory = nextPlayer.inventory
      .map((i) => (i.id === action.item.id ? { ...i, quantity: i.quantity - 1 } : i))
      .filter((i) => i.quantity > 0);
    nextClash.bonusActionUsed = true;
    nextClash.bonusItemUsedRound = nextClash.round;
    const caption = `${player.name} bebeu ${action.item.name} (Ação Bônus · ${dice}): +${totalHeal} PV!`;
    nextClash.roundLog = [...nextClash.roundLog, makeLog(nextClash.round, caption, 'hero')].slice(-24);
    return { nextClash, nextPlayer, caption, floatingText: `+${totalHeal} PV`, floatingColor: '#4ade80', targetId: 'player', vfx: 'heal' };
  }

  if (action.kind === 'resource') {
    const resIdx = nextDnd.classResources.findIndex((r) => r.id === action.resourceId && r.current > 0);
    if (resIdx < 0) return null;
    if (action.resourceId === 'second_wind') {
      const rolled = rollDiceFormula(`1d10+${player.level}`);
      nextDnd.classResources[resIdx].current -= 1;
      nextPlayer.vigor = Math.min(nextPlayer.maxVigor, nextPlayer.vigor + rolled.total);
      nextClash.bonusActionUsed = true;
      const caption = `${player.name} usou Retomar o Fôlego (Ação Bônus · 1d10+${player.level}): +${rolled.total} PV!`;
      nextClash.roundLog = [...nextClash.roundLog, makeLog(nextClash.round, caption, 'hero')].slice(-24);
      return { nextClash, nextPlayer, caption, floatingText: `+${rolled.total} PV`, floatingColor: '#4ade80', targetId: 'player', vfx: 'heal' };
    }
    if (action.resourceId === 'rage') {
      nextDnd.classResources[resIdx].current -= 1;
      nextClash.rageActive = true;
      nextClash.bonusActionUsed = true;
      if (nextDnd.subclassId === 'iron_colossus') {
        nextDnd.tempHp = applyDndTempHpGain(nextDnd.tempHp, pb + player.level);
      }
      const caption = `🔥 ${player.name} entrou em FÚRIA (Ação Bônus): +2 dano corpo a corpo e Resistência física!`;
      nextClash.roundLog = [...nextClash.roundLog, makeLog(nextClash.round, caption, 'combo')].slice(-24);
      return { nextClash, nextPlayer, caption, floatingText: 'FÚRIA!', floatingColor: '#fb923c', targetId: 'player', vfx: 'limit' };
    }
    if (action.resourceId === 'lay_on_hands') {
      const missing = Math.max(0, nextPlayer.maxVigor - nextPlayer.vigor);
      const spend = Math.min(missing > 0 ? missing : 5, nextDnd.classResources[resIdx].current);
      if (spend <= 0) return null;
      nextDnd.classResources[resIdx].current -= spend;
      nextPlayer.vigor = Math.min(nextPlayer.maxVigor, nextPlayer.vigor + spend);
      nextClash.bonusActionUsed = true;
      const caption = `${player.name} canalizou Imposição de Mãos (Ação Bônus): +${spend} PV!`;
      nextClash.roundLog = [...nextClash.roundLog, makeLog(nextClash.round, caption, 'hero')].slice(-24);
      return { nextClash, nextPlayer, caption, floatingText: `+${spend} PV`, floatingColor: '#4ade80', targetId: 'player', vfx: 'heal' };
    }
    if (action.resourceId === 'wild_shape') {
      nextDnd.classResources[resIdx].current -= 1;
      const gain = nextDnd.subclassId === 'wild_warden' ? pb * 3 + player.level : pb * 2 + player.level;
      nextDnd.tempHp = applyDndTempHpGain(nextDnd.tempHp, gain);
      nextClash.bonusActionUsed = true;
      const caption = `${player.name} ativou Forma Selvagem (Ação Bônus): +${gain} PV Temporários!`;
      nextClash.roundLog = [...nextClash.roundLog, makeLog(nextClash.round, caption, 'hero')].slice(-24);
      return { nextClash, nextPlayer, caption, floatingText: `+${gain} TEMP`, floatingColor: '#38bdf8', targetId: 'player', vfx: 'shield' };
    }
    return null;
  }

  // Bonus Action Spell!
  const spell = DND_SPELLS[action.spellId];
  if (!spell || spell.castingTime !== 'bonus') return null;
  if (spell.level > 0 && nextClash.spellSlotUsedThisTurn) return null;

  if (spell.level > 0) {
    const consumed = consumeSpellSlot(nextDnd, spell.level);
    if (!consumed) return null;
    nextPlayer.dnd = consumed.nextDnd;
    nextClash.spellSlotUsedThisTurn = true;
  }
  const activeDnd = nextPlayer.dnd!;
  const sc = computeSpellcastingInfo(nextPlayer);
  const spellMod = sc?.spellMod ?? 2;
  const spellLabel = getThemedSpellLabel(spell.id, campaign.world.primaryTheme);

  if (spell.concentration) {
    activeDnd.concentrationSpellId = spell.id;
  }
  nextClash.bonusActionUsed = true;

  if (spell.kind === 'heal') {
    const rolled = rollDiceFormula(spell.healDice ?? '2d4');
    const lifeBonus = activeDnd.subclassId === 'life_domain' ? 3 : 0;
    const totalHeal = Math.max(1, rolled.total + spellMod + lifeBonus);
    nextPlayer.vigor = Math.min(nextPlayer.maxVigor, nextPlayer.vigor + totalHeal);
    if (spell.id === 'mass_healing_word') {
      for (const a of nextClash.allies) {
        if (!a.downed) a.vigor = Math.min(a.maxVigor, a.vigor + totalHeal);
      }
    }
    const caption = `${player.name} conjurou ${spellLabel} (Bônus · ${spell.healDice}+${spellMod}): +${totalHeal} PV!`;
    nextClash.roundLog = [...nextClash.roundLog, makeLog(nextClash.round, caption, 'hero')].slice(-24);
    return { nextClash, nextPlayer, caption, floatingText: `+${totalHeal} PV`, floatingColor: '#4ade80', targetId: 'player', vfx: 'heal' };
  }

  if (spell.id === 'misty_step') {
    nextClash.playerZone = nextClash.playerZone === 'close' ? 'far' : 'close';
    const zLabel = nextClash.playerZone === 'close' ? 'Vanguarda' : 'Retaguarda';
    const caption = `✨ ${spellLabel} (Bônus): teleportou para ${zLabel} sem Ataque de Oportunidade!`;
    nextClash.roundLog = [...nextClash.roundLog, makeLog(nextClash.round, caption, 'hero')].slice(-24);
    return { nextClash, nextPlayer, caption, floatingText: 'TELEPORTE!', floatingColor: '#38bdf8', targetId: 'player', vfx: 'psychic' };
  }

  if (spell.kind === 'auto_damage') {
    // Divine Smite (2024 Bonus Action!)
    const target =
      nextClash.enemies.find((e) => e.id === nextClash.selectedTargetId && e.hp > 0) ??
      nextClash.enemies.find((e) => e.hp > 0);
    if (target) {
      const dmg = rollDiceFormula(spell.damageDice ?? '2d8').total;
      target.hp = Math.max(0, target.hp - dmg);
      const caption = `⚡ ${spellLabel} (Bônus · ${spell.damageDice}) em ${target.name}: −${dmg} PV Radiante!`;
      nextClash.roundLog = [...nextClash.roundLog, makeLog(nextClash.round, caption, 'combo')].slice(-24);
      return { nextClash, nextPlayer, caption, floatingText: `−${dmg} RAD`, floatingColor: '#fbbf24', targetId: target.id, vfx: 'limit' };
    }
  }

  const caption = `${player.name} ativou ${spellLabel} (Ação Bônus${spell.concentration ? ' · Concentração' : ''})!`;
  nextClash.roundLog = [...nextClash.roundLog, makeLog(nextClash.round, caption, 'hero')].slice(-24);
  return { nextClash, nextPlayer, caption, floatingText: spell.shortLabel.toUpperCase(), floatingColor: '#c084fc', targetId: 'player', vfx: 'psychic' };
}

export interface Dnd52RoundResolution {
  nextClash: TacticalClashState;
  nextPlayer: Campaign['player'];
  diceRoll?: DiceRollResult;
  playerVigorDelta: number;
  playerTensionDelta: number;
  allyVigorUpdates: Array<{ npcId: string; vigor: number; downed: boolean }>;
  supplyChanges: Partial<BaseSupplies>;
  orgMoraleDelta: number;
  xpBonus: number;
  affinityBonus: number;
  deltas: StateDelta[];
  promptDigest: string;
  endedOutcome: 'active' | 'victory' | 'escaped' | 'defeat';
}

/**
 * Synchronous (<2ms) D&D 5e Revised (2024 / SRD 5.2) Combat & Siege Resolver!
 * Executes Hero Main Action (+ Extra Attack / Nick / 8 Weapon Masteries / Spells / Death Saves),
 * Ally Sidekicks, and Enemy Attack vs AC / AoE Saves / Smart Pre-Armed Shield Reaction in one snappy pass!
 */
export function resolveDnd52ClashRound(params: {
  campaign: Campaign;
  clash: TacticalClashState;
  actionText: string;
  clashAction?: ClashActionPayload;
}): Dnd52RoundResolution {
  const { campaign, clashAction } = params;
  const nextClash: TacticalClashState = structuredClone(params.clash);
  const nextPlayer = structuredClone(campaign.player);
  const dnd = nextPlayer.dnd!;
  const round = nextClash.round;
  const theme = campaign.world.primaryTheme;
  const dm = difficultyModifiers(campaign.difficulty);
  const startHp = nextPlayer.vigor;

  const logs: ClashLogEntry[] = [];
  const deltas: StateDelta[] = [];
  const supplyChanges: Partial<BaseSupplies> = {};
  let orgMoraleDelta = 0;
  let playerTensionDelta = 0;
  let xpBonus = 0;
  let affinityBonus = 0;
  let headlineRoll: DiceRollResult | undefined;

  const targetId = clashAction?.targetEnemyId ?? nextClash.selectedTargetId;
  const target =
    nextClash.enemies.find((e) => e.id === targetId && e.hp > 0) ??
    nextClash.enemies.find((e) => e.hp > 0);

  const kind = clashAction?.kind ?? 'primary';
  const isSolo = nextClash.allies.filter((a) => !a.downed).length === 0;
  const cls = DND_CLASSES[dnd.classId];
  const pb = getProficiencyBonus(nextPlayer.level);
  const weapon = getEquippedWeaponDndProfile(campaign);

  // =========================================================================
  // SUB-PHASE 1: HERO MAIN ACTION (or Death Save / Ally Stabilize if at 0 PV)
  // =========================================================================
  if (kind === 'death_save' || (nextPlayer.vigor <= 0 && kind !== 'stabilize')) {
    const dsRoll = resolveDndDeathSave(false);
    headlineRoll = dsRoll;
    if (dsRoll.outcome === 'critical_success') {
      nextPlayer.vigor = 1;
      dnd.deathSaves = { successes: 0, failures: 0, stabilized: false };
      dnd.conditions = dnd.conditions.filter((c) => c !== 'unconscious');
      logs.push(makeLog(round, `✨ 20 NATURAL no Teste Contra a Morte! ${nextPlayer.name} desperta com 1 PV!`, 'combo'));
    } else if (dsRoll.outcome === 'critical_failure') {
      dnd.deathSaves.failures = Math.min(3, dnd.deathSaves.failures + 2);
      logs.push(makeLog(round, `💀 1 Natural no Teste Contra a Morte (2 falhas: ${dnd.deathSaves.failures}/3)!`, 'enemy'));
    } else if (dsRoll.outcome === 'success') {
      dnd.deathSaves.successes = Math.min(3, dnd.deathSaves.successes + 1);
      if (dnd.deathSaves.successes >= 3) {
        dnd.deathSaves.stabilized = true;
        logs.push(makeLog(round, `💚 Estabilizado (3/3 sucessos no Teste Contra a Morte)!`, 'hero'));
      } else {
        logs.push(makeLog(round, `Teste Contra a Morte: Sucesso (${dsRoll.roll} vs CD 10 · ${dnd.deathSaves.successes}/3).`, 'hero'));
      }
    } else {
      dnd.deathSaves.failures = Math.min(3, dnd.deathSaves.failures + 1);
      logs.push(makeLog(round, `Teste Contra a Morte: Falha (${dsRoll.roll} vs CD 10 · ${dnd.deathSaves.failures}/3).`, 'enemy'));
    }
  } else if (kind === 'stabilize') {
    const healer = nextClash.allies.find((a) => !a.downed && a.vigor > 0);
    if (healer) {
      const heal = rollDiceFormula('1d6+2').total;
      nextPlayer.vigor = Math.min(nextPlayer.maxVigor, heal);
      dnd.deathSaves = { successes: 0, failures: 0, stabilized: false };
      dnd.conditions = dnd.conditions.filter((c) => c !== 'unconscious');
      logs.push(makeLog(round, `💚 ${healer.name} socorreu ${nextPlayer.name} (+${heal} PV)!`, 'ally'));
    }
  } else if (kind === 'defend') {
    // D&D 5.2 Dodge Action (imposes Disadvantage on all attacks against you + DEX save Advantage!)
    nextClash.dodgeActive = true;
    nextClash.synergy = clamp(nextClash.synergy + 18, 0, 100);
    if (nextClash.archetype === 'siege') {
      const repair = 18;
      nextClash.barricadeHp = clamp((nextClash.barricadeHp ?? 100) + repair, 0, nextClash.barricadeMaxHp ?? 100);
      logs.push(makeLog(round, `Ação Esquivar + Reforço de Barricada (+${repair} · inimigos têm Desvantagem contra você!).`, 'hero'));
    } else {
      logs.push(makeLog(round, `Ação Esquivar: inimigos têm Desvantagem para acertar você até o próximo turno!`, 'hero'));
    }
  } else if (kind === 'reposition') {
    const newZone: ClashZone =
      clashAction?.moveToZone ??
      (nextClash.playerZone === 'close' ? 'mid' : nextClash.playerZone === 'mid' ? 'far' : 'mid');
    nextClash.playerZone = newZone;
    nextClash.dodgeActive = true; // Disengage + cover
    nextClash.synergy = clamp(nextClash.synergy + 16, 0, 100);
    logs.push(
      makeLog(
        round,
        `Desengajou para ${newZone === 'close' ? 'Vanguarda' : newZone === 'far' ? 'Retaguarda' : 'Centro'} (sem Ataque de Oportunidade · guarda ativa).`,
        'hero',
      ),
    );
  } else if (kind === 'spell' && clashAction?.spellId && DND_SPELLS[clashAction.spellId]) {
    const spell = DND_SPELLS[clashAction.spellId];
    const sc = computeSpellcastingInfo(nextPlayer);
    const spellMod = sc?.spellMod ?? 2;
    const spellDc = sc?.saveDc ?? (8 + pb + 2);
    const spellAtk = sc?.attackBonus ?? (pb + 2);
    const spellName = getThemedSpellLabel(spell.id, theme);

    let canCast = true;
    if (spell.level > 0) {
      if (nextClash.spellSlotUsedThisTurn) {
        canCast = false;
        logs.push(makeLog(round, `Regra 2024: já gastou 1 Espaço de Magia neste turno (use um Truque ou Ataque!).`, 'system'));
      } else {
        const consumed = consumeSpellSlot(dnd, spell.level);
        if (!consumed) {
          canCast = false;
          logs.push(makeLog(round, `Sem Espaços de Magia suficientes para ${spellName}!`, 'system'));
        } else {
          nextPlayer.dnd = consumed.nextDnd;
          nextClash.spellSlotUsedThisTurn = true;
        }
      }
    }

    if (canCast) {
      const curDnd = nextPlayer.dnd!;
      if (spell.concentration) curDnd.concentrationSpellId = spell.id;
      nextClash.synergy = clamp(nextClash.synergy + 24, 0, 100);

      if (spell.kind === 'heal') {
        const rolled = rollDiceFormula(spell.healDice ?? '2d8');
        const lifeBonus = curDnd.subclassId === 'life_domain' ? 3 : 0;
        const heal = Math.max(2, rolled.total + spellMod + lifeBonus);
        nextPlayer.vigor = Math.min(nextPlayer.maxVigor, nextPlayer.vigor + heal);
        logs.push(makeLog(round, `${spellName} (${spell.healDice}+${spellMod}): +${heal} PV restaurados!`, 'hero'));
      } else if (spell.kind === 'buff_ac') {
        nextClash.shieldSpellBonusAc = Math.max(nextClash.shieldSpellBonusAc ?? 0, spell.acBonus ?? 3);
        logs.push(makeLog(round, `${spellName} ativa: +${spell.acBonus ?? 3} CA!`, 'hero'));
      } else if (spell.kind === 'buff_party') {
        logs.push(makeLog(round, `${spellName} ativa no esquadrão${spell.concentration ? ' (Concentração)' : ''}!`, 'hero'));
      } else if (spell.kind === 'auto_damage' && target) {
        // Magic Missile (guaranteed hit, ignores AC!)
        const rolled = rollDiceFormula(spell.damageDice ?? '3d4+3');
        target.hp = Math.max(0, target.hp - rolled.total);
        if (target.channeling && target.hp > 0) {
          const cSave = Math.floor(Math.random() * 20) + 1 + (target.saveMods?.con ?? 0);
          if (cSave < Math.max(10, Math.floor(rolled.total / 2))) {
            target.channeling = false;
            target.conditions = [...new Set([...(target.conditions ?? []), 'incapacitated' as DndConditionId])];
          }
        }
        logs.push(makeLog(round, `✨ ${spellName} acertou ${target.name} automaticamente (${spell.damageDice}): −${rolled.total} PV!`, 'hero'));
      } else if (spell.kind === 'attack' && target) {
        const diceRaw = spell.level === 0 ? scaleCantripDice(spell.damageDice ?? '1d10', nextPlayer.level) : (spell.damageDice ?? '3d8');
        const r = Math.floor(Math.random() * 20) + 1;
        const total = r + spellAtk;
        const targetAc = target.ac ?? 13;
        const crit = r === 20;
        const hit = r !== 1 && (crit || total >= targetAc);
        headlineRoll = {
          roll: r,
          rollMode: 'normal',
          testKind: 'attack_roll',
          targetAc,
          bonus: spellAtk,
          proficiencyBonus: pb,
          attribute: sc?.ability ?? 'int',
          attributeMod: spellMod,
          total,
          dc: targetAc,
          outcome: r === 1 ? 'critical_failure' : crit ? 'critical_success' : hit ? 'success' : 'failure',
        };
        if (hit) {
          const rolled = rollDiceFormula(diceRaw, crit);
          const evokerBonus = curDnd.subclassId === 'evoker' ? Math.max(0, spellMod) : 0;
          const dmg = rolled.total + evokerBonus;
          headlineRoll.damageFormula = rolled.formula;
          headlineRoll.damageTotal = dmg;
          target.hp = Math.max(0, target.hp - dmg);
          if (spell.id === 'guiding_bolt') target.vexedUntilRound = round + 1;
          if (spell.id === 'ray_of_frost') target.slowedUntilRound = round + 1;
          if (target.channeling && target.hp > 0) {
            const cSave = Math.floor(Math.random() * 20) + 1 + (target.saveMods?.con ?? 0);
            if (cSave < Math.max(10, Math.floor(dmg / 2))) {
              target.channeling = false;
              logs.push(makeLog(round, `💥 Concentração de ${target.name} QUEBRADA! Golpe carregado cancelado!`, 'combo'));
            }
          }
          logs.push(makeLog(round, `${crit ? '⚡ CRÍTICO! ' : ''}${spellName} em ${target.name} (${total} vs CA ${targetAc} · ${rolled.formula}): −${dmg} PV!`, 'hero'));
        } else {
          logs.push(makeLog(round, `${spellName} errou ${target.name} (${total} vs CA ${targetAc}).`, 'hero'));
        }
      } else if ((spell.kind === 'save_damage' || spell.kind === 'control') && target) {
        const targets = spell.isAoE ? nextClash.enemies.filter((e) => e.hp > 0) : [target];
        const saveAttr = spell.saveAbility ?? 'dex';
        const diceRaw = spell.damageDice
          ? spell.level === 0
            ? scaleCantripDice(spell.damageDice, nextPlayer.level)
            : spell.damageDice
          : undefined;
        const rolled = diceRaw ? rollDiceFormula(diceRaw) : null;
        const summaryParts: string[] = [];

        for (const foe of targets) {
          const saveRoll = Math.floor(Math.random() * 20) + 1 + (foe.saveMods?.[saveAttr] ?? 0);
          const saved = saveRoll >= spellDc;
          let dmg = 0;
          if (rolled) {
            dmg = saved ? (spell.halfOnSave ? Math.max(1, Math.floor(rolled.total / 2)) : 0) : rolled.total;
            foe.hp = Math.max(0, foe.hp - dmg);
          }
          if (!saved && spell.inflictCondition && foe.hp > 0) {
            foe.conditions = [...new Set([...(foe.conditions ?? []), spell.inflictCondition])];
            if (DND_CONDITIONS[spell.inflictCondition]?.breaksConcentration) {
              foe.channeling = false;
            }
          }
          if (!saved && spell.id === 'vicious_mockery') {
            foe.sappedUntilRound = round + 1;
          }
          if (!saved && spell.id === 'thunderwave' && foe.zone === 'close') {
            foe.zone = 'mid';
          }
          summaryParts.push(
            `${foe.name}: ${saved ? `passou (${saveRoll})` : `falhou (${saveRoll})`}${dmg > 0 ? ` −${dmg} PV` : ''}${!saved && spell.inflictCondition ? ` [${DND_CONDITIONS[spell.inflictCondition].label}]` : ''}`,
          );
        }
        logs.push(makeLog(round, `${spellName} (CD ${spellDc} ${saveAttr.toUpperCase()}): ${summaryParts.join('; ')}.`, 'hero'));
      }
    }
  } else if (kind === 'terrain' && clashAction?.terrainId) {
    const feat = nextClash.terrain.find((t) => t.id === clashAction.terrainId && t.usesLeft > 0);
    if (feat && target) {
      feat.usesLeft -= 1;
      const dmg = rollDiceFormula(nextPlayer.level >= 5 ? '3d6' : '2d6').total;
      if (feat.effectKind === 'cover_shield') {
        nextClash.shieldSpellBonusAc = Math.max(nextClash.shieldSpellBonusAc ?? 0, 2);
        logs.push(makeLog(round, `Cobertura em ${feat.name}: +2 CA até o próximo turno!`, 'terrain'));
      } else {
        target.hp = Math.max(0, target.hp - dmg);
        target.conditions = [...new Set([...(target.conditions ?? []), 'prone' as DndConditionId])];
        target.channeling = false;
        logs.push(makeLog(round, `${feat.name} atingiu ${target.name} (−${dmg} PV · Caído)!`, 'terrain'));
      }
      nextClash.synergy = clamp(nextClash.synergy + 20, 0, 100);
    }
  } else if (kind === 'guild_support') {
    nextClash.guildSupportUsed = true;
    const orgName = campaign.organization?.name || 'Organização';
    const dmg = rollDiceFormula(nextPlayer.level >= 5 ? '3d8' : '2d6').total;
    for (const e of nextClash.enemies) {
      if (e.hp > 0) e.hp = Math.max(0, e.hp - dmg);
    }
    logs.push(makeLog(round, `Apoio Tático de ${orgName}: −${dmg} PV em todos os inimigos!`, 'combo'));
    deltas.push({ kind: 'faction', label: `Apoio Tático: ${orgName}`, positive: true });
  } else if (kind === 'combo' && target) {
    nextClash.synergy = 0;
    const dmg = rollDiceFormula(weapon.dice, true).total + weapon.damageBonus + pb * 2;
    target.hp = Math.max(0, target.hp - dmg);
    target.conditions = [...new Set([...(target.conditions ?? []), 'stunned' as DndConditionId])];
    target.channeling = false;
    if (!isSolo) affinityBonus += 4;
    logs.push(makeLog(round, `⚡ GOLPE DECISIVO (Limit Break) em ${target.name}: −${dmg} PV e ATORDOADO!`, 'combo'));
  } else if (target) {
    // =======================================================================
    // STANDARD D&D 5.2 WEAPON ATTACK (+ Extra Attack, Nick, 8 Masteries, Sneak Attack!)
    // =======================================================================
    const isShoveOrTopple = kind === 'break_posture';
    const numMainAttacks = cls.extraAttackLevel && nextPlayer.level >= cls.extraAttackLevel ? 2 : 1;
    const hasNickExtra = weapon.mastery === 'nick' && weapon.isLight && weapon.hasOffhandLight;
    const totalAttacks = numMainAttacks + (hasNickExtra ? 1 : 0);
    let sneakAttackUsed = false;
    let savageAttackerUsed = false;
    let cleaveUsed = false;
    const blessBonus = dnd.concentrationSpellId === 'bless' ? rollDiceFormula('1d4').total : 0;
    const hunterHexActive = dnd.concentrationSpellId === 'hunters_mark' || dnd.concentrationSpellId === 'hex';

    for (let atkIdx = 0; atkIdx < totalAttacks; atkIdx++) {
      const currentTarget =
        target.hp > 0 ? target : nextClash.enemies.find((e) => e.hp > 0);
      if (!currentTarget) break;

      const isNickOffhand = hasNickExtra && atkIdx === totalAttacks - 1;
      const targetAc = currentTarget.ac ?? 13;
      const targetConds = currentTarget.conditions ?? [];
      const playerConds = dnd.conditions ?? [];

      // Advantage / Disadvantage with official 5e mutual cancellation
      let hasAdv =
        (currentTarget.vexedUntilRound ?? 0) >= round ||
        targetConds.some((c) => DND_CONDITIONS[c]?.attacksAgainstAdvantage) ||
        (targetConds.includes('prone') && !weapon.isRanged) ||
        playerConds.includes('invisible') ||
        (dnd.subclassId === 'night_blade' && round === 1);
      let hasDisadv =
        playerConds.some((c) => DND_CONDITIONS[c]?.attackDisadvantage) ||
        (targetConds.includes('prone') && weapon.isRanged) ||
        (weapon.isRanged && nextClash.playerZone === 'close');

      const rollMode = hasAdv && hasDisadv ? 'normal' : hasAdv ? 'advantage' : hasDisadv ? 'disadvantage' : 'normal';
      const rollOne = () => {
        let r = Math.floor(Math.random() * 20) + 1;
        if (r === 1 && dnd.speciesId === 'halfling') r = Math.floor(Math.random() * 20) + 1;
        return r;
      };
      const r1 = rollOne();
      const r2 = rollMode !== 'normal' ? rollOne() : undefined;
      const d20 = r2 !== undefined ? (rollMode === 'advantage' ? Math.max(r1, r2) : Math.min(r1, r2)) : r1;
      const totalAtk = d20 + weapon.attackBonus + blessBonus;

      const critThreshold = dnd.classId === 'fighter' && dnd.subclassId === 'champion' ? 19 : 20;
      const paralyzedMeleeCrit = !weapon.isRanged && (targetConds.includes('paralyzed') || targetConds.includes('unconscious'));
      const isCrit = (d20 >= critThreshold || (paralyzedMeleeCrit && totalAtk >= targetAc)) && d20 !== 1;
      const isHit = d20 !== 1 && (isCrit || totalAtk >= targetAc);

      const thisRoll: DiceRollResult = {
        roll: d20,
        rolls: r2 !== undefined ? [r1, r2] : undefined,
        rollMode,
        advantageSource: rollMode === 'advantage' ? (targetConds.includes('prone') ? 'Alvo Caído' : 'Vantagem Tática') : undefined,
        testKind: 'attack_roll',
        targetAc,
        bonus: weapon.attackBonus + blessBonus,
        proficiencyBonus: pb,
        exhaustionPenalty: dnd.exhaustion > 0 ? dnd.exhaustion * 2 : undefined,
        attribute: weapon.attribute,
        attributeMod: getAttributeModifier(getEffectiveAttributes(nextPlayer)[weapon.attribute]),
        total: totalAtk,
        dc: targetAc,
        outcome: d20 === 1 ? 'critical_failure' : isCrit ? 'critical_success' : isHit ? 'success' : 'failure',
      };

      if (isHit) {
        let dmgRoll = rollDiceFormula(weapon.dice, isCrit);
        // Savage Attacker (1/turn: roll weapon dice twice and take highest!)
        if (!savageAttackerUsed && dnd.featIds.includes('savage_attacker')) {
          const second = rollDiceFormula(weapon.dice, isCrit);
          if (second.total > dmgRoll.total) dmgRoll = second;
          savageAttackerUsed = true;
        }
        const addMod =
          isNickOffhand && !dnd.featIds.includes('style_two_weapon') && dnd.fightingStyleId !== 'style_two_weapon'
            ? 0
            : weapon.damageBonus;
        let totalDmg = Math.max(1, dmgRoll.total + addMod);

        if (nextClash.rageActive && !weapon.isRanged) {
          totalDmg += nextPlayer.level >= 16 ? 4 : nextPlayer.level >= 9 ? 3 : 2;
        }
        if (hunterHexActive) {
          totalDmg += rollDiceFormula('1d6', isCrit).total;
        }
        // Rogue Sneak Attack (1/turn when Advantage OR living ally present!)
        if (
          dnd.classId === 'rogue' &&
          !sneakAttackUsed &&
          (rollMode === 'advantage' || nextClash.allies.some((a) => !a.downed))
        ) {
          const sneakDice = `${Math.max(1, Math.ceil(nextPlayer.level / 2))}d6`;
          totalDmg += rollDiceFormula(sneakDice, isCrit).total;
          sneakAttackUsed = true;
        }
        // Resistance check
        if ((currentTarget.resistances ?? []).includes(weapon.damageType)) {
          totalDmg = Math.max(1, Math.floor(totalDmg / 2));
        }

        currentTarget.hp = Math.max(0, currentTarget.hp - totalDmg);
        thisRoll.damageFormula = `${dmgRoll.formula}${addMod >= 0 ? `+${addMod}` : addMod}`;
        thisRoll.damageTotal = totalDmg;
        nextClash.synergy = clamp(nextClash.synergy + (isCrit ? 30 : 20), 0, 100);

        // Apply Active 2024 Weapon Mastery OR Shove/Topple maneuver!
        const masteryNotes: string[] = [];
        const activeMastery = isShoveOrTopple ? 'topple' : weapon.mastery;
        if (activeMastery === 'sap' && currentTarget.hp > 0) {
          currentTarget.sappedUntilRound = round + 1;
          masteryNotes.push('Minar: Desvantagem no inimigo');
        } else if (activeMastery === 'vex' && currentTarget.hp > 0) {
          currentTarget.vexedUntilRound = round + 1;
          masteryNotes.push('Afligir: Vantagem próximo golpe');
        } else if (activeMastery === 'slow' && currentTarget.hp > 0) {
          currentTarget.slowedUntilRound = round + 1;
          masteryNotes.push('Lentidão');
        } else if (activeMastery === 'push' && currentTarget.hp > 0) {
          if (currentTarget.zone === 'close') currentTarget.zone = 'mid';
          else if (currentTarget.zone === 'mid') currentTarget.zone = 'far';
          currentTarget.channeling = false;
          masteryNotes.push('Empurrado →');
        } else if (activeMastery === 'topple' && currentTarget.hp > 0) {
          const toppleDc = 8 + pb + getAttributeModifier(getEffectiveAttributes(nextPlayer)[weapon.attribute]);
          const conSave = Math.floor(Math.random() * 20) + 1 + (currentTarget.saveMods?.con ?? 0);
          if (conSave < toppleDc) {
            currentTarget.conditions = [...new Set([...(currentTarget.conditions ?? []), 'prone' as DndConditionId])];
            currentTarget.channeling = false;
            masteryNotes.push(`Derrubado (CON ${conSave} vs CD ${toppleDc})!`);
          }
        } else if (activeMastery === 'cleave' && !cleaveUsed) {
          const secondFoe = nextClash.enemies.find(
            (e) => e.id !== currentTarget.id && e.hp > 0 && e.zone === currentTarget.zone,
          );
          if (secondFoe) {
            cleaveUsed = true;
            const cleaveDmg = rollDiceFormula(weapon.dice).total; // RAW 2024: no ability mod on Cleave 2nd hit
            secondFoe.hp = Math.max(0, secondFoe.hp - cleaveDmg);
            masteryNotes.push(`Transpassar em ${secondFoe.name}: −${cleaveDmg} PV`);
          }
        }

        // Boss Channeling / Concentration save on taking damage!
        if (currentTarget.channeling && currentTarget.hp > 0) {
          const cDc = Math.max(10, Math.floor(totalDmg / 2));
          const cRoll = Math.floor(Math.random() * 20) + 1 + (currentTarget.saveMods?.con ?? 1);
          if (cRoll < cDc) {
            currentTarget.channeling = false;
            masteryNotes.push(`Canalização quebrada (CON ${cRoll} vs CD ${cDc})!`);
          }
        }

        const extraTag = masteryNotes.length > 0 ? ` · ${masteryNotes.join(' · ')}` : '';
        logs.push(
          makeLog(
            round,
            `${isCrit ? '⚡ CRÍTICO! ' : ''}${weapon.name}${isNickOffhand ? ' (Ágil)' : ''} em ${currentTarget.name} (${totalAtk} vs CA ${targetAc} · ${thisRoll.damageFormula}): −${totalDmg} PV${sneakAttackUsed && atkIdx === 0 ? ' [Furtivo!]' : ''}${extraTag}.`,
            'hero',
          ),
        );
      } else if (weapon.mastery === 'graze') {
        // RAW 2024 Graze: deals ability modifier (min 0) even on a MISS!
        const grazeDmg = Math.max(0, getAttributeModifier(getEffectiveAttributes(nextPlayer)[weapon.attribute]));
        if (grazeDmg > 0) {
          currentTarget.hp = Math.max(0, currentTarget.hp - grazeDmg);
          thisRoll.damageFormula = 'Raspão';
          thisRoll.damageTotal = grazeDmg;
        }
        nextClash.synergy = clamp(nextClash.synergy + 12, 0, 100);
        logs.push(
          makeLog(
            round,
            `Errou ${currentTarget.name} (${totalAtk} vs CA ${targetAc}), mas Maestria Raspão causou −${grazeDmg} PV!`,
            'hero',
          ),
        );
      } else {
        nextClash.synergy = clamp(nextClash.synergy + 10, 0, 100);
        logs.push(
          makeLog(round, `${weapon.name} errou ${currentTarget.name} (${totalAtk} vs CA ${targetAc}).`, 'hero'),
        );
      }

      if (!headlineRoll) headlineRoll = thisRoll;
    }
  }

  // If Fighter Action Surge was active, consume it and keep turn open (skip allies/enemies this click!)
  if (nextClash.actionSurgeActive && kind !== 'death_save' && nextClash.enemies.some((e) => e.hp > 0)) {
    nextClash.actionSurgeActive = false;
    nextClash.roundLog = [...nextClash.roundLog, ...logs].slice(-24);
    return {
      nextClash,
      nextPlayer,
      diceRoll: headlineRoll,
      playerVigorDelta: nextPlayer.vigor - startHp,
      playerTensionDelta: 0,
      allyVigorUpdates: nextClash.allies.map((a) => ({ npcId: a.npcId, vigor: a.vigor, downed: Boolean(a.downed) })),
      supplyChanges,
      orgMoraleDelta,
      xpBonus: 0,
      affinityBonus: 0,
      deltas,
      promptDigest: logs.map((l) => l.summary).join(' | '),
      endedOutcome: 'active',
    };
  }

  // =========================================================================
  // SUB-PHASE 2: PARTY ALLIES (Real 5.2 Sidekick Attack vs AC & Support!)
  // =========================================================================
  for (const ally of nextClash.allies) {
    if (ally.downed || ally.vigor <= 0) continue;
    const foe =
      nextClash.enemies.find((e) => e.id === target?.id && e.hp > 0) ??
      nextClash.enemies.find((e) => e.hp > 0);

    if (ally.directive === 'support' && nextPlayer.vigor < nextPlayer.maxVigor) {
      const heal = rollDiceFormula('1d6+2').total;
      nextPlayer.vigor = Math.min(nextPlayer.maxVigor, nextPlayer.vigor + heal);
      nextClash.synergy = clamp(nextClash.synergy + 15, 0, 100);
      logs.push(makeLog(round, `${ally.name} socorreu você (+${heal} PV).`, 'ally'));
    } else if (ally.directive === 'guard') {
      nextPlayer.dnd!.tempHp = applyDndTempHpGain(nextPlayer.dnd!.tempHp, 3 + Math.floor(ally.level / 2));
      nextClash.synergy = clamp(nextClash.synergy + 10, 0, 100);
      logs.push(makeLog(round, `${ally.name} protegeu o flanco (+${3 + Math.floor(ally.level / 2)} PV Temp).`, 'ally'));
    } else if (foe) {
      const r = Math.floor(Math.random() * 20) + 1;
      const atkTotal = r + (ally.attackBonus ?? 4);
      const hit = r !== 1 && (r === 20 || atkTotal >= (foe.ac ?? 13));
      if (hit) {
        const dmg = rollDiceFormula(ally.damageDice ?? '1d8+2', r === 20).total;
        foe.hp = Math.max(0, foe.hp - dmg);
        if (ally.directive === 'flank') foe.vexedUntilRound = round + 1;
        logs.push(makeLog(round, `${ally.name} acertou ${foe.name} (${atkTotal} vs CA ${foe.ac ?? 13}): −${dmg} PV!`, 'ally'));
      } else {
        logs.push(makeLog(round, `${ally.name} atacou ${foe.name}, mas errou (${atkTotal} vs CA ${foe.ac ?? 13}).`, 'ally'));
      }
      nextClash.synergy = clamp(nextClash.synergy + 8, 0, 100);
    }
  }

  // =========================================================================
  // SUB-PHASE 3: ENEMIES EXECUTE ATTACKS VS AC / AOE SAVES + SMART REACTIONS!
  // =========================================================================
  const curDnd = nextPlayer.dnd!;
  const baseAcInfo = computeArmorClass(nextPlayer, nextClash.shieldSpellBonusAc ?? 0);

  for (const enemy of nextClash.enemies) {
    if (enemy.hp <= 0) continue;
    const eConds = enemy.conditions ?? [];

    // Stunned / Paralyzed / Incapacitated enemies skip their turn and clear 1-round stun
    if (eConds.some((c) => DND_CONDITIONS[c]?.incapacitated)) {
      enemy.conditions = eConds.filter((c) => c !== 'stunned' && c !== 'incapacitated');
      logs.push(makeLog(round, `${enemy.name} perdeu o turno incapacitado!`, 'enemy'));
      continue;
    }

    // Prone enemy spends movement standing up (and suffers Disadvantage if slowed)
    if (eConds.includes('prone')) {
      enemy.conditions = eConds.filter((c) => c !== 'prone');
      logs.push(makeLog(round, `${enemy.name} gastou esforço para se levantar do chão.`, 'enemy'));
    }

    const intent = enemy.nextIntent;
    if (intent.kind === 'defend') {
      enemy.ac = Math.min(22, (enemy.ac ?? 13) + 1);
      logs.push(makeLog(round, `${enemy.name} assumiu postura defensiva (+1 CA).`, 'enemy'));
      continue;
    }

    // Siege barricade attack
    if (nextClash.archetype === 'siege' && intent.target === 'barricade') {
      const bDmg = Math.max(4, rollDiceFormula(intent.damageDice ?? enemy.damageDice ?? '1d8+2').total);
      nextClash.barricadeHp = clamp((nextClash.barricadeHp ?? 100) - bDmg, 0, nextClash.barricadeMaxHp ?? 100);
      logs.push(makeLog(round, `${enemy.name} golpeou a barricada (−${bDmg} Integridade)!`, 'enemy'));
      continue;
    }

    // FIXED: Area Attack (`intent.target === 'all'`) triggers Saving Throw (half damage on success!)
    if (intent.target === 'all') {
      const saveAbility: AttributeId = intent.saveAbility ?? 'dex';
      const saveDc = intent.saveDc ?? clamp(11 + Math.floor(nextPlayer.level / 2), 11, 17);
      const rawDmg = Math.max(1, rollDiceFormula(intent.damageDice ?? enemy.damageDice ?? '2d6').total + dm.dmgMod);
      const saveRoll = resolveDndSavingThrow(nextPlayer, saveAbility, saveDc, intent.label, {
        rollMode: nextClash.dodgeActive && saveAbility === 'dex' ? 'advantage' : 'normal',
        advantageSource: nextClash.dodgeActive && saveAbility === 'dex' ? 'Esquivar' : undefined,
      });
      const finalHeroDmg = saveRoll.outcome === 'success' ? Math.max(1, Math.floor(rawDmg / 2)) : rawDmg;
      const applied = applyDndDamageWithTempHp(nextPlayer.vigor, curDnd.tempHp, finalHeroDmg);
      nextPlayer.vigor = applied.nextHp;
      curDnd.tempHp = applied.nextTempHp;
      if (applied.hpLost > 0) playerTensionDelta += 4;
      logs.push(
        makeLog(
          round,
          `${enemy.name} usou ${intent.label} em área! Salvaguarda ${saveAbility.toUpperCase()} (${saveRoll.total} vs CD ${saveDc}): ${saveRoll.outcome === 'success' ? 'Passou (metade)' : 'Falhou'} −${finalHeroDmg} PV.`,
          'enemy',
        ),
      );
      continue;
    }

    // Ally targeted
    if (intent.target === 'ally' && intent.targetAllyId) {
      const ally = nextClash.allies.find((a) => a.npcId === intent.targetAllyId && !a.downed);
      if (ally) {
        const r = Math.floor(Math.random() * 20) + 1;
        const atkTotal = r + (enemy.attackBonus ?? 3);
        const allyAc = ally.ac ?? 13;
        if (r !== 1 && (r === 20 || atkTotal >= allyAc)) {
          const dmg = Math.max(1, rollDiceFormula(intent.damageDice ?? enemy.damageDice ?? '1d6+1').total + dm.dmgMod);
          ally.vigor = Math.max(0, ally.vigor - dmg);
          if (ally.vigor === 0) ally.downed = true;
          logs.push(makeLog(round, `${enemy.name} acertou ${ally.name} (${atkTotal} vs CA ${allyAc}): −${dmg} PV${ally.downed ? ' (CAÍDO!)' : ''}.`, 'enemy'));
        } else {
          logs.push(makeLog(round, `${enemy.name} errou ${ally.name} (${atkTotal} vs CA ${allyAc})!`, 'enemy'));
        }
        continue;
      }
    }

    // Skip attacking unconscious solo hero (prevent raw instant-death melee auto-crit softlock)
    if (nextPlayer.vigor <= 0) {
      const standingAlly = nextClash.allies.find((a) => !a.downed && a.vigor > 0);
      if (standingAlly) {
        const dmg = Math.max(1, rollDiceFormula(enemy.damageDice ?? '1d6+1').total);
        standingAlly.vigor = Math.max(0, standingAlly.vigor - dmg);
        if (standingAlly.vigor === 0) standingAlly.downed = true;
        logs.push(makeLog(round, `${enemy.name} avançou sobre ${standingAlly.name} (−${dmg} PV).`, 'enemy'));
      }
      continue;
    }

    // Direct Attack Roll vs Player Armor Class (AC)!
    const enemyHasDisadv =
      Boolean(nextClash.dodgeActive) ||
      (enemy.sappedUntilRound ?? 0) >= round ||
      eConds.some((c) => DND_CONDITIONS[c]?.attackDisadvantage);
    const r1 = Math.floor(Math.random() * 20) + 1;
    const r2 = enemyHasDisadv ? Math.floor(Math.random() * 20) + 1 : undefined;
    const d20 = r2 !== undefined ? Math.min(r1, r2) : r1;
    const atkTotal = d20 + (enemy.attackBonus ?? 3);
    const allowEnemyCrit = dm.allowCrits && !(isSolo && nextPlayer.level <= 2);
    const isEnemyCrit = d20 === 20 && allowEnemyCrit;

    let effectiveAc = baseAcInfo.ac;
    // SMART 1-TAP PRE-ARMED SHIELD REACTION (+5 AC ONLY when it turns a hit into a MISS!)
    if (
      !isEnemyCrit &&
      d20 !== 1 &&
      atkTotal >= effectiveAc &&
      atkTotal < effectiveAc + 5 &&
      !nextClash.reactionUsed &&
      nextClash.preArmedReaction === 'shield' &&
      curDnd.preparedSpellIds.includes('shield')
    ) {
      const consumed = consumeSpellSlot(curDnd, 1);
      if (consumed) {
        nextPlayer.dnd = consumed.nextDnd;
        nextClash.reactionUsed = true;
        nextClash.shieldSpellBonusAc = Math.max(nextClash.shieldSpellBonusAc ?? 0, 5);
        effectiveAc += 5;
        logs.push(
          makeLog(
            round,
            `🛡️ REAÇÃO: Escudo Arcano (+5 CA → CA ${effectiveAc}) BLOQUEOU ${enemy.name} (${atkTotal})!`,
            'combo',
          ),
        );
        continue;
      }
    }

    const enemyHit = d20 !== 1 && (isEnemyCrit || atkTotal >= effectiveAc);
    if (!enemyHit) {
      logs.push(
        makeLog(
          round,
          `${enemy.name} usou ${intent.label}, mas ERROU (${atkTotal} vs CA ${effectiveAc})!`,
          'enemy',
        ),
      );
      continue;
    }

    // Enemy hit lands -> roll damage dice!
    let dmg = Math.max(
      1,
      rollDiceFormula(intent.damageDice ?? enemy.damageDice ?? '1d6+1', isEnemyCrit).total + dm.dmgMod,
    );
    // Barbarian Rage physical resistance (50%)
    const dmgType = intent.damageType ?? enemy.damageType ?? 'slashing';
    if (
      nextClash.rageActive &&
      (dmgType === 'slashing' || dmgType === 'piercing' || dmgType === 'bludgeoning')
    ) {
      dmg = Math.max(1, Math.floor(dmg / 2));
    }
    // Smart Rogue Uncanny Dodge Reaction (halves damage 1/round)
    let reactionNote = '';
    if (
      !nextClash.reactionUsed &&
      nextClash.preArmedReaction === 'uncanny_dodge' &&
      curDnd.classId === 'rogue' &&
      nextPlayer.level >= 5
    ) {
      nextClash.reactionUsed = true;
      dmg = Math.max(1, Math.floor(dmg / 2));
      reactionNote = ' [Esquiva Sobrenatural ½]';
    }

    const applied = applyDndDamageWithTempHp(nextPlayer.vigor, nextPlayer.dnd!.tempHp, dmg);
    nextPlayer.vigor = applied.nextHp;
    nextPlayer.dnd!.tempHp = applied.nextTempHp;
    if (applied.hpLost > 0) playerTensionDelta += 4;

    // Orc Relentless Endurance (1/Long Rest: drop to 1 PV instead of 0!)
    if (
      nextPlayer.vigor === 0 &&
      nextPlayer.dnd!.speciesId === 'orc' &&
      !nextPlayer.dnd!.relentlessEnduranceUsed
    ) {
      nextPlayer.vigor = 1;
      nextPlayer.dnd!.relentlessEnduranceUsed = true;
      logs.push(
        makeLog(
          round,
          `🔥 RESISTÊNCIA IMPLACÁVEL (Orc)! ${nextPlayer.name} recusou cair e manteve 1 PV!`,
          'combo',
        ),
      );
    }

    // Concentration CON Save if player took HP damage while concentrating!
    let concNote = '';
    if (applied.hpLost > 0 && nextPlayer.dnd!.concentrationSpellId) {
      const concDc = Math.max(10, Math.floor(applied.hpLost / 2));
      const cRoll = resolveDndSavingThrow(nextPlayer, 'con', concDc, 'Concentração', {
        rollMode: nextPlayer.dnd!.featIds.includes('war_focus') ? 'advantage' : 'normal',
      });
      if (cRoll.outcome !== 'success') {
        const lostSpell = getThemedSpellLabel(nextPlayer.dnd!.concentrationSpellId, theme);
        nextPlayer.dnd!.concentrationSpellId = null;
        concNote = ` · Concentração em ${lostSpell} perdida!`;
      } else {
        concNote = ` · Concentração mantida (CON ${cRoll.total})`;
      }
    }

    logs.push(
      makeLog(
        round,
        `${enemy.name} acertou ${intent.label} (${atkTotal} vs CA ${effectiveAc}): −${dmg} PV${applied.absorbed > 0 ? ` (${applied.absorbed} absorvido)` : ''}${reactionNote}${concNote}.`,
        'enemy',
      ),
    );
  }

  // Cap tension below 95 during active clashes
  if (nextPlayer.tension + playerTensionDelta > 94) {
    playerTensionDelta = Math.max(-10, 94 - nextPlayer.tension);
  }

  // =========================================================================
  // SUB-PHASE 4: END CONDITIONS, DEATH SAVES, SIEGE WAVES & OFFICIAL CR XP
  // =========================================================================
  const livingEnemies = nextClash.enemies.filter((e) => e.hp > 0);
  const livingAllies = nextClash.allies.filter((a) => !a.downed && a.vigor > 0);
  let endedOutcome: Dnd52RoundResolution['endedOutcome'] = 'active';

  if (nextClash.archetype === 'siege' && (nextClash.barricadeHp ?? 100) <= 0) {
    endedOutcome = 'defeat';
  } else if (livingEnemies.length === 0) {
    endedOutcome = 'victory';
    // Stabilize at 1 PV if party won while hero was unconscious!
    if (nextPlayer.vigor <= 0) {
      nextPlayer.vigor = 1;
      nextPlayer.dnd!.deathSaves = { successes: 0, failures: 0, stabilized: false };
      nextPlayer.dnd!.conditions = nextPlayer.dnd!.conditions.filter((c) => c !== 'unconscious');
    }
  } else if (nextPlayer.vigor <= 0) {
    if (nextPlayer.dnd!.deathSaves.failures >= 3 || livingAllies.length === 0) {
      // Solo 0 PV exits cleanly to inline Death Save Crisis in StoryStage (zero Arena deadlock!)
      endedOutcome = 'defeat';
    } else {
      // Allies alive -> Unconscious / Death Save Deck inside Arena!
      nextPlayer.dnd!.conditions = [...new Set([...nextPlayer.dnd!.conditions, 'unconscious' as DndConditionId])];
    }
  }

  if (endedOutcome === 'active') {
    nextClash.round = round + 1;
    // Reset per-turn D&D 5.2 Action Economy cleanly
    nextClash.actionUsed = false;
    nextClash.bonusActionUsed = false;
    nextClash.reactionUsed = false;
    nextClash.movementUsed = false;
    nextClash.spellSlotUsedThisTurn = false;
    nextClash.dodgeActive = false;
    nextClash.shieldSpellBonusAc = 0;
    nextClash.playerConditions = [...nextPlayer.dnd!.conditions];

    const stillAlive = nextClash.enemies.filter((e) => e.hp > 0);
    if (!stillAlive.some((e) => e.id === nextClash.selectedTargetId) && stillAlive[0]) {
      nextClash.selectedTargetId = stillAlive[0].id;
    }

    // Pick next enemy telegraphed intent
    for (const enemy of stillAlive) {
      const idx = (nextClash.round + enemy.name.length) % 3;
      const dice = enemy.damageDice ?? '1d6+2';
      const avg = getAverageDiceRoll(dice);
      const nextIntent: ClashEnemyIntent =
        idx === 0 && enemy.isBoss
          ? {
              kind: 'heavy_attack',
              label: 'Golpe Carregado',
              damage: Math.round(avg * 1.35),
              damageDice: dice,
              damageType: enemy.damageType ?? 'slashing',
              target: 'player',
            }
          : idx === 1 && enemy.isBoss && nextPlayer.level >= 3
            ? {
                kind: 'special',
                label: 'Investida em Área',
                damage: avg,
                damageDice: dice,
                damageType: enemy.damageType ?? 'fire',
                saveAbility: 'dex',
                saveDc: clamp(11 + Math.floor(nextPlayer.level / 2), 11, 17),
                target: 'all',
              }
            : {
                kind: 'attack',
                label: 'Ataque Direto',
                damage: avg,
                damageDice: dice,
                damageType: enemy.damageType ?? 'slashing',
                target: livingAllies.length > 0 && idx === 2 ? 'ally' : 'player',
                targetAllyId: livingAllies.length > 0 && idx === 2 ? livingAllies[0].npcId : undefined,
              };
      enemy.nextIntent = nextIntent;
      enemy.channeling = nextIntent.kind === 'heavy_attack' || nextIntent.kind === 'special';
    }
  } else {
    nextClash.status = endedOutcome;
    if (endedOutcome === 'victory') {
      // Official SRD 5.2 CR XP sum (with DMG budget floor so victory always rewards cleanly)
      const crSum = nextClash.enemies.reduce((sum, e) => sum + (e.xpValue ?? 50), 0);
      const floorBudget = (DMG_2024_XP_BUDGET[clamp(nextPlayer.level, 1, 20)] ?? DMG_2024_XP_BUDGET[1]).moderate;
      xpBonus = Math.max(floorBudget, crSum);
      if (nextClash.allies.length > 0) affinityBonus += 5;
      deltas.push({
        kind: 'quest',
        label: `Vitória D&D 5.2: ${nextClash.title} (+${xpBonus} XP)`,
        positive: true,
      });
    } else {
      deltas.push({
        kind: 'crisis',
        label: `Derrota em ${nextClash.title}`,
        positive: false,
      });
    }
  }

  nextClash.roundLog = [...nextClash.roundLog, ...logs].slice(-24);

  const promptDigest = [
    `[D&D 5.2 TACTICAL CLASH — ROUND ${round} (${endedOutcome.toUpperCase()})]`,
    `Hero: ${nextPlayer.name} (${nextPlayer.vigor}/${nextPlayer.maxVigor} PV, CA ${baseAcInfo.ac})`,
    `Events: ${logs.map((l) => l.summary).join(' | ')}`,
    `HARD RULES: Narrate these exact combat results vividly. Set stateChanges.vigorDelta = 0 and stateChanges.tensionDelta = 0 (already applied).`,
  ].join('\n');

  return {
    nextClash,
    nextPlayer,
    diceRoll: headlineRoll,
    playerVigorDelta: nextPlayer.vigor - startHp,
    playerTensionDelta,
    allyVigorUpdates: nextClash.allies.map((a) => ({
      npcId: a.npcId,
      vigor: a.vigor,
      downed: Boolean(a.downed),
    })),
    supplyChanges,
    orgMoraleDelta,
    xpBonus,
    affinityBonus,
    deltas,
    promptDigest,
    endedOutcome,
  };
}
