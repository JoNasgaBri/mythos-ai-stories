import { DND_WEAPON_MASTERIES } from '../data/dnd52Catalog';
import {
  getEquippedWeaponDndProfile,
  hydrateDnd52ClashState,
} from './dnd52ClashResolver';
import { isDndRuleset } from './dnd52Rules';
import {
  getAttributeModifier,
  getEffectiveAttributes,
  getProficiencyBonus,
} from './rpgSystem';
import type {
  AttributeId,
  BaseSupplies,
  Campaign,
  ClashActionPayload,
  ClashAllyDirective,
  ClashAllyState,
  ClashArchetype,
  ClashEnemy,
  ClashEnemyIntent,
  ClashEnemyIntentKind,
  ClashInitResponse,
  ClashLogEntry,
  ClashZone,
  DiceRollResult,
  DifficultyId,
  InventoryItem,
  ItemRarity,
  StateDelta,
  TacticalClashState,
  WorldThemeId,
} from '../types/game';

export interface ClashManeuverPreset {
  id: 'primary' | 'break_posture' | 'reposition' | 'defend';
  label: string;
  shortHint: string;
  attribute: AttributeId;
}

export interface ClashArchetypeMeta {
  id: ClashArchetype;
  label: string;
  shortLabel: string;
  color: string;
  hpLabel: string;
  postureLabel: string;
  staggerLabel: string;
  soloSurgeTitle: string;
  partyComboTitle: string;
  zones: Record<ClashZone, { label: string; hint: string }>;
  maneuvers: ClashManeuverPreset[];
}

export const CLASH_ARCHETYPE_META: Record<ClashArchetype, ClashArchetypeMeta> = {
  combat: {
    id: 'combat',
    label: 'Combate Tático',
    shortLabel: 'Combate',
    color: '#f87171',
    hpLabel: 'Vigor',
    postureLabel: 'Postura',
    staggerLabel: 'QUEBRADO!',
    soloSurgeTitle: 'Golpe de Ruptura',
    partyComboTitle: 'Golpe Combinado',
    zones: {
      close: { label: 'Corpo a Corpo', hint: '+20% dano FOR/Postura · +risco' },
      mid: { label: 'Cobertura', hint: 'Equilibrado · -3 dano recebido' },
      far: { label: 'Flanco / Longo', hint: '+2 DES/INT · -5 dano corpo a corpo' },
    },
    maneuvers: [
      { id: 'primary', label: 'Atacar Alvo', shortHint: 'Dano direto', attribute: 'str' },
      { id: 'break_posture', label: 'Quebrar Postura', shortHint: 'Atordoar / Cancelar', attribute: 'dex' },
      { id: 'reposition', label: 'Reposicionar', shortHint: 'Trocar zona + Escudo', attribute: 'dex' },
      { id: 'defend', label: 'Guarda & Fôlego', shortHint: '+Escudo +Vigor', attribute: 'con' },
    ],
  },
  chase: {
    id: 'chase',
    label: 'Perseguição & Fuga',
    shortLabel: 'Perseguição',
    color: '#38bdf8',
    hpLabel: 'Fôlego',
    postureLabel: 'Ritmo',
    staggerLabel: 'DESEQUILIBRADO!',
    soloSurgeTitle: 'Arrancada Imparável',
    partyComboTitle: 'Manobra de Fuga Coordenada',
    zones: {
      close: { label: 'Colado', hint: 'Risco máximo · pode derrubar' },
      mid: { label: 'Curta Distância', hint: 'Manobras de corte e atalho' },
      far: { label: 'Vantagem', hint: '+Fuga acelerada · -pressão' },
    },
    maneuvers: [
      { id: 'primary', label: 'Acelerar Fuga', shortHint: '+Progresso Fuga', attribute: 'dex' },
      { id: 'break_posture', label: 'Bloquear Passagem', shortHint: 'Atrasar perseguidor', attribute: 'str' },
      { id: 'reposition', label: 'Cortar Atalho', shortHint: 'Ganhar zona', attribute: 'wis' },
      { id: 'defend', label: 'Despistar / Fôlego', shortHint: '-Pressão +Escudo', attribute: 'con' },
    ],
  },
  social: {
    id: 'social',
    label: 'Duelo Social & Interrogatório',
    shortLabel: 'Duelo Social',
    color: '#c084fc',
    hpLabel: 'Compostura',
    postureLabel: 'Defesa',
    staggerLabel: 'EXPOSTO!',
    soloSurgeTitle: 'Xeque-Mate Retórico',
    partyComboTitle: 'Pressão Coordenada',
    zones: {
      close: { label: 'Pressão Direta', hint: '+25% impacto CAR · +risco' },
      mid: { label: 'Debate', hint: 'Equilibrado · leitura SAB' },
      far: { label: 'Bastidores', hint: '+2 INT/SAB · protege compostura' },
    },
    maneuvers: [
      { id: 'primary', label: 'Pressionar Argumento', shortHint: 'Drenar Compostura', attribute: 'cha' },
      { id: 'break_posture', label: 'Expor Contradição', shortHint: 'Quebrar Defesa', attribute: 'int' },
      { id: 'reposition', label: 'Mudar Abordagem', shortHint: 'Trocar postura', attribute: 'wis' },
      { id: 'defend', label: 'Manter Frieza', shortHint: '+Compostura +Escudo', attribute: 'wis' },
    ],
  },
  siege: {
    id: 'siege',
    label: 'Cerco & Sobrevivência',
    shortLabel: 'Cerco',
    color: '#fb923c',
    hpLabel: 'Força da Onda',
    postureLabel: 'Avanço',
    staggerLabel: 'CONTIDA!',
    soloSurgeTitle: 'Última Linha',
    partyComboTitle: 'Saraivada da Equipe',
    zones: {
      close: { label: 'Brecha', hint: 'Segura avanço na barricada' },
      mid: { label: 'Linha de Fogo', hint: 'Dano consistente + cobertura' },
      far: { label: 'Retaguarda', hint: 'Reforço + suporte + tática' },
    },
    maneuvers: [
      { id: 'primary', label: 'Fogo Concentrado', shortHint: 'Conter onda', attribute: 'dex' },
      { id: 'break_posture', label: 'Rechaçar Brecha', shortHint: 'Travamento em área', attribute: 'str' },
      { id: 'reposition', label: 'Mudar Posição', shortHint: 'Ajustar linha', attribute: 'dex' },
      { id: 'defend', label: 'Reforçar Barricada', shortHint: '+Barricada (+com sup.)', attribute: 'int' },
    ],
  },
};

export const ALLY_DIRECTIVE_META: Record<
  ClashAllyDirective,
  { label: string; short: string; hint: string; color: string }
> = {
  strike: {
    label: 'Atacar',
    short: 'Atq',
    hint: 'Causa dano direto ao alvo selecionado',
    color: '#f87171',
  },
  guard: {
    label: 'Proteger',
    short: 'Def',
    hint: 'Concede escudo ao protagonista e absorve pressão',
    color: '#38bdf8',
  },
  flank: {
    label: 'Flanquear',
    short: 'Flq',
    hint: 'Foca em quebrar Postura/Defesa ou avançar Fuga',
    color: '#fbbf24',
  },
  support: {
    label: 'Suporte',
    short: 'Sup',
    hint: 'Recupera Vigor/Compostura e carrega +20 Sinergia',
    color: '#4ade80',
  },
};

const RARITY_WEAPON_BONUS: Record<ItemRarity, number> = {
  common: 2,
  uncommon: 4,
  rare: 6,
  epic: 8,
  legendary: 10,
};

const RARITY_ARMOR_BONUS: Record<ItemRarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
};

export interface EquippedCombatProfile {
  weaponBonus: number;
  weaponName?: string;
  armorMitigation: number;
  hasRangedWeapon: boolean;
}

/**
 * Derives deterministic weapon damage bonus & armor mitigation from equipped carry items
 * using equipSlot + rarity (without double-counting item.bonuses already in getEffectiveAttributes).
 */
export function deriveEquippedCombatProfile(
  inventory: InventoryItem[] | undefined,
): EquippedCombatProfile {
  if (!Array.isArray(inventory)) {
    return { weaponBonus: 0, armorMitigation: 0, hasRangedWeapon: false };
  }
  let weaponBonus = 0;
  let weaponName: string | undefined;
  let armorMitigation = 0;
  let hasRangedWeapon = false;

  for (const item of inventory) {
    if (!item.equipped) continue;
    if (item.storage && item.storage !== 'carry') continue;
    const rarity = item.rarity ?? 'common';

    if (item.equipSlot === 'weapon' || item.category === 'weapon') {
      const bonus = RARITY_WEAPON_BONUS[rarity] ?? 2;
      if (bonus > weaponBonus) {
        weaponBonus = bonus;
        weaponName = item.name;
      }
      if (
        /(pistola|rifle|espingarda|arco|besta|sniper|rev[oó]lver|submetralhadora|laser|plasma|carabina|fuzil|gun|bow|rifle|pistol)/i.test(
          `${item.name} ${item.note ?? ''}`,
        )
      ) {
        hasRangedWeapon = true;
      }
    } else if (item.equipSlot === 'offhand') {
      if (/(escudo|shield|broquel)/i.test(item.name)) {
        armorMitigation += Math.max(1, Math.ceil((RARITY_ARMOR_BONUS[rarity] ?? 1) * 0.8));
      } else {
        weaponBonus += Math.max(1, Math.floor((RARITY_WEAPON_BONUS[rarity] ?? 2) * 0.4));
      }
    } else if (item.equipSlot === 'armor' || item.equipSlot === 'head') {
      armorMitigation += RARITY_ARMOR_BONUS[rarity] ?? 1;
    }
  }

  return {
    weaponBonus: Math.min(14, weaponBonus),
    weaponName,
    armorMitigation: Math.min(8, armorMitigation),
    hasRangedWeapon,
  };
}

function difficultyScale(diff: DifficultyId): number {
  switch (diff) {
    case 'easy':
      return 0.82;
    case 'normal':
      return 1.0;
    case 'hard':
      return 1.18;
    case 'insane':
      return 1.35;
    case 'good-luck':
      return 1.5;
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function makeLog(
  round: number,
  summary: string,
  tone: ClashLogEntry['tone'],
): ClashLogEntry {
  return {
    id: `cl_${round}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    round,
    summary,
    tone,
  };
}

export function hydrateClashState(
  campaign: Campaign,
  init: ClashInitResponse,
): TacticalClashState {
  const scale = difficultyScale(campaign.difficulty);
  const now = Date.now();

  // Filter truly available party companions (alive, vigor > 0, not captured or away on org mission)
  const allies: ClashAllyState[] = campaign.codex.npcs
    .filter(
      (n) =>
        n.inParty &&
        n.status === 'alive' &&
        (n.vigor ?? 100) > 0 &&
        n.orgDuty !== 'on_mission' &&
        n.orgDuty !== 'captured',
    )
    .slice(0, 3)
    .map((n) => ({
      npcId: n.id,
      name: n.name,
      role: n.role,
      assistAttribute: n.assistAttribute ?? 'wis',
      level: n.level ?? campaign.player.level ?? 1,
      vigor: clamp(n.vigor ?? n.maxVigor ?? 100, 1, n.maxVigor ?? 100),
      maxVigor: Math.max(60, n.maxVigor ?? 100),
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
    }));

  const rawEnemies =
    Array.isArray(init.enemies) && init.enemies.length > 0
      ? init.enemies.slice(0, 4)
      : createDemoClashInit(campaign, init.archetype).enemies;

  const enemies: ClashEnemy[] = rawEnemies.map((e, idx) => {
    const matchedNpc = campaign.codex.npcs.find(
      (n) => n.name.toLowerCase() === e.name.toLowerCase(),
    );
    const maxHp = clamp((e.maxHp || e.hp || 60) * scale, 25, 280);
    const maxPosture = clamp((e.maxPosture || e.posture || 35) * scale, 18, 120);

    // Resolve targetAllyName safely to real npcId; never target ally if 0 allies or barricade outside siege
    let resolvedTarget: ClashEnemyIntent['target'] = e.nextIntent?.target ?? 'player';
    let targetAllyId: string | undefined;
    if (resolvedTarget === 'ally') {
      if (allies.length === 0) {
        resolvedTarget = 'player';
      } else {
        const byName = e.nextIntent?.targetAllyName
          ? allies.find(
              (a) =>
                a.name.toLowerCase() ===
                e.nextIntent.targetAllyName!.toLowerCase(),
            )
          : undefined;
        targetAllyId = (byName ?? allies[idx % allies.length]).npcId;
      }
    } else if (resolvedTarget === 'barricade' && init.archetype !== 'siege') {
      resolvedTarget = 'player';
    }

    return {
      id: `ce_${now}_${idx}`,
      name: e.name.trim() || `Ameaça ${idx + 1}`,
      role: e.role?.trim() || 'Oponente',
      linkedNpcId: matchedNpc?.id,
      isBoss: Boolean(e.isBoss),
      hp: maxHp,
      maxHp,
      posture: maxPosture,
      maxPosture,
      staggered: false,
      zone: e.zone === 'close' || e.zone === 'far' ? e.zone : 'mid',
      armor: clamp(e.armor ?? (e.isBoss ? 3 : 1), 0, 6),
      weaknesses: Array.isArray(e.weaknesses) ? e.weaknesses.slice(0, 3) : [],
      nextIntent: {
        kind: e.nextIntent?.kind ?? 'attack',
        label: e.nextIntent?.label?.trim() || 'Investida Direta',
        damage: clamp((e.nextIntent?.damage ?? 14) * scale, 6, 42),
        target: resolvedTarget,
        targetAllyId,
      },
      statusTags: [],
    };
  });

  const terrain = (Array.isArray(init.terrain) ? init.terrain : [])
    .slice(0, 3)
    .map((t, idx) => ({
      ...t,
      id: `ct_${now}_${idx}`,
      usesLeft: clamp(t.usesLeft ?? 1, 1, 3),
    }));

  const isChase = init.archetype === 'chase';
  const isSiege = init.archetype === 'siege';
  const isSocial = init.archetype === 'social';

  const baseClash: TacticalClashState = {
    id: `clash_${now}_${Math.random().toString(36).slice(2, 6)}`,
    archetype: init.archetype,
    title: init.title?.trim() || CLASH_ARCHETYPE_META[init.archetype].label,
    stakes: init.stakes?.trim() || 'O resultado desta cena moldará o rumo da crônica.',
    objective:
      init.objective?.trim() ||
      (isChase
        ? 'Chegue a 100% de Fuga antes de ser encurralado.'
        : isSocial
          ? 'Quebre a Compostura do oponente usando argumentos e provas.'
          : isSiege
            ? 'Resista a todas as ondas sem deixar a barricada cair.'
            : 'Neutralize ou quebre a postura dos oponentes.'),
    round: 1,
    status: 'active',
    playerZone: init.playerStartZone ?? 'mid',
    playerShield: 0,
    playerComposure: isSocial ? 100 : undefined,
    synergy: allies.length > 0 ? 25 : 20,
    guildSupportUsed: false,
    usedArgumentIds: [],
    selectedTargetId: enemies[0].id,
    enemies,
    allies,
    terrain,
    chaseProgress: isChase ? 20 : undefined,
    pursuerThreat: isChase ? 25 : undefined,
    barricadeHp: isSiege ? 100 : undefined,
    barricadeMaxHp: isSiege ? 100 : undefined,
    waveCurrent: isSiege ? 1 : undefined,
    waveTotal: isSiege ? clamp(init.waveTotal ?? 3, 2, 4) : undefined,
    roundLog: [
      makeLog(
        1,
        `Confronto iniciado: ${init.title || CLASH_ARCHETYPE_META[init.archetype].label}`,
        'system',
      ),
    ],
    startedAtTurn: campaign.turnCount,
  };

  if (isDndRuleset(campaign)) {
    return hydrateDnd52ClashState(campaign, init, baseClash);
  }
  return baseClash;
}

/**
 * Generates a rich thematic local clash when Gemini is unavailable or in Demo mode.
 * Reuses real hostile/suspicious NPCs from campaign.codex.npcs whenever present.
 */
export function createDemoClashInit(
  campaign: Campaign,
  requestedArchetype?: ClashArchetype,
): ClashInitResponse {
  const theme: WorldThemeId = campaign.world.primaryTheme;
  const archetype: ClashArchetype =
    requestedArchetype ??
    (theme === 'mystery'
      ? 'social'
      : theme === 'zombies'
        ? 'siege'
        : 'combat');

  const hostileNpc = campaign.codex.npcs.find(
    (n) =>
      n.status === 'alive' &&
      !n.inParty &&
      (n.stance === 'hostile' || n.stance === 'suspicious'),
  );
  const loc = campaign.currentLocation || 'Zona de Conflito';

  if (archetype === 'social') {
    const rivalName =
      hostileNpc?.name ??
      (theme === 'cyberpunk'
        ? 'Executivo Vance'
        : theme === 'fantasy'
          ? 'Inquisidor Malrik'
          : 'Inspetor Morales');
    return {
      archetype: 'social',
      title: `Confronto Verbal em ${loc}`,
      stakes: 'Se perder a compostura, sua credibilidade e alianças sofrem um golpe duro.',
      objective: `Quebre a compostura de ${rivalName} antes que ele vire a sala contra você.`,
      playerStartZone: 'mid',
      enemies: [
        {
          name: rivalName,
          role: hostileNpc?.role ?? 'Interrogador Implacável',
          isBoss: true,
          hp: 75,
          maxHp: 75,
          posture: 38,
          maxPosture: 38,
          zone: 'mid',
          armor: 2,
          weaknesses: ['Provas', 'INT', 'CAR'],
          nextIntent: {
            kind: 'pressure',
            label: 'Acusação Cruzada',
            damage: 18,
            target: 'player',
          },
        },
      ],
      terrain: [
        {
          name: 'Olhares da Plateia',
          description: 'Jogue a opinião de quem observa contra o adversário.',
          zone: 'close',
          attribute: 'cha',
          effectKind: 'social_leverage',
          effectLabel: 'Dano extra à Defesa',
          usesLeft: 2,
        },
        {
          name: 'Silêncio Calculado',
          description: 'Use a pausa para ler microexpressões e recuperar frieza.',
          zone: 'far',
          attribute: 'wis',
          effectKind: 'cover_shield',
          effectLabel: '+18 Escudo de Compostura',
          usesLeft: 2,
        },
      ],
      engineUsed: 'demo',
    };
  }

  if (archetype === 'chase') {
    const hunterName =
      hostileNpc?.name ??
      (theme === 'cyberpunk'
        ? 'Drone Caçador K-9'
        : theme === 'zombies'
          ? 'Perseguidores Rápidos'
          : 'Batedor Implacável');
    return {
      archetype: 'chase',
      title: `Fuga Alucinante por ${loc}`,
      stakes: 'Ser encurralado aqui significa lutar em desvantagem severa.',
      objective: 'Alcance 100% de Fuga usando atalhos e obstáculos.',
      playerStartZone: 'mid',
      enemies: [
        {
          name: hunterName,
          role: hostileNpc?.role ?? 'Perseguidor Principal',
          isBoss: true,
          hp: 70,
          maxHp: 70,
          posture: 34,
          maxPosture: 34,
          zone: 'mid',
          armor: 1,
          weaknesses: ['DES', 'Obstáculos', 'SAB'],
          nextIntent: {
            kind: 'pursue',
            label: 'Fechar Cerco',
            damage: 16,
            target: 'player',
          },
        },
      ],
      terrain: [
        {
          name: 'Atalho Estreito',
          description: 'Passagem apertada que favorece agilidade pura.',
          zone: 'far',
          attribute: 'dex',
          effectKind: 'escape_boost',
          effectLabel: '+26% Fuga imediata',
          usesLeft: 1,
        },
        {
          name: 'Pilha de Caixotes / Barreira',
          description: 'Derrube atrás de você para quebrar o ritmo do perseguidor.',
          zone: 'close',
          attribute: 'str',
          effectKind: 'posture_break',
          effectLabel: 'Quebra Ritmo + -18% Captura',
          usesLeft: 2,
        },
      ],
      engineUsed: 'demo',
    };
  }

  if (archetype === 'siege') {
    const waveLeader =
      theme === 'zombies'
        ? 'Enxame de Infectados'
        : theme === 'cyberpunk'
          ? 'Esquadrão Tático Corp'
          : theme === 'fantasy'
            ? 'Vanguarda Sombria'
            : 'Saqueadores Armados';
    return {
      archetype: 'siege',
      title: `Cerco em ${loc}`,
      stakes: 'Se a barricada ceder, o perímetro será invadido.',
      objective: 'Aguente 3 ondas mantendo a barricada de pé.',
      playerStartZone: 'mid',
      waveTotal: 3,
      enemies: [
        {
          name: waveLeader,
          role: 'Onda 1 · Linha de Frente',
          isBoss: false,
          hp: 58,
          maxHp: 58,
          posture: 30,
          maxPosture: 30,
          zone: 'close',
          armor: 1,
          weaknesses: ['Fogo', 'Área', 'DES'],
          nextIntent: {
            kind: 'heavy_attack',
            label: 'Aríete na Barricada',
            damage: 20,
            target: 'barricade',
          },
        },
        {
          name: theme === 'zombies' ? 'Corredor Ágil' : 'Atirador de Flanco',
          role: 'Flanqueador',
          isBoss: false,
          hp: 38,
          maxHp: 38,
          posture: 20,
          maxPosture: 20,
          zone: 'far',
          armor: 0,
          weaknesses: ['DES', 'Flanco'],
          nextIntent: {
            kind: 'attack',
            label: 'Disparo de Supressão',
            damage: 13,
            target: 'player',
          },
        },
      ],
      terrain: [
        {
          name: 'Barril Inflamável / Armadilha',
          description: 'Detone na brecha para varrer o avanço da onda.',
          zone: 'close',
          attribute: 'dex',
          effectKind: 'damage_burst',
          effectLabel: 'Dano em área na onda',
          usesLeft: 1,
        },
        {
          name: 'Ponto Elevado de Cobertura',
          description: 'Posição protegida com ótima linha de tiro.',
          zone: 'far',
          attribute: 'wis',
          effectKind: 'cover_shield',
          effectLabel: '+16 Escudo + vantagem tática',
          usesLeft: 2,
        },
      ],
      engineUsed: 'demo',
    };
  }

  // Default: 'combat'
  const bossName =
    hostileNpc?.name ??
    (theme === 'cyberpunk'
      ? 'Ciborgue Executor'
      : theme === 'fantasy'
        ? 'Cavaleiro das Cinzas'
        : theme === 'zombies'
          ? 'Brutamontes Blindado'
          : 'Líder Mercenário');

  return {
    archetype: 'combat',
    title: `Confronto em ${loc}`,
    stakes: 'Derrote ou quebre a postura da ameaça antes que dominem o terreno.',
    objective: `Neutralize ${bossName} e sua escolta.`,
    playerStartZone: 'mid',
    enemies: [
      {
        name: bossName,
        role: hostileNpc?.role ?? 'Chefe da Cena',
        isBoss: true,
        hp: 76,
        maxHp: 76,
        posture: 40,
        maxPosture: 40,
        zone: 'close',
        armor: 2,
        weaknesses: ['Flanco', 'Terreno', 'DES'],
        nextIntent: {
          kind: 'heavy_attack',
          label: 'Golpe Esmagador',
          damage: 22,
          target: 'player',
        },
      },
      {
        name:
          theme === 'fantasy'
            ? 'Besteiro Sombrio'
            : theme === 'cyberpunk'
              ? 'Netrunner de Apoio'
              : 'Atirador de Escolta',
        role: 'Suporte Inimigo',
        isBoss: false,
        hp: 42,
        maxHp: 42,
        posture: 22,
        maxPosture: 22,
        zone: 'far',
        armor: 1,
        weaknesses: ['Corpo a Corpo', 'INT'],
        nextIntent: {
          kind: 'attack',
          label: 'Tiro Preciso',
          damage: 13,
          target: 'player',
        },
      },
    ],
    terrain: [
      {
        name:
          theme === 'fantasy'
            ? 'Candelabro / Pilastra Instável'
            : 'Tanque / Estrutura Instável',
        description: 'Derrube sobre o inimigo para destruir a postura dele.',
        zone: 'mid',
        attribute: 'dex',
        effectKind: 'posture_break',
        effectLabel: 'Quebra massiva de Postura',
        usesLeft: 1,
      },
      {
        name: 'Cobertura Reforçada',
        description: 'Abrigue-se para amortecer ataques pesados.',
        zone: 'far',
        attribute: 'wis',
        effectKind: 'cover_shield',
        effectLabel: '+18 Escudo tático',
        usesLeft: 2,
      },
    ],
    engineUsed: 'demo',
  };
}

export interface ClashRollHints {
  attribute: AttributeId;
  dcOverride: number;
  opposedLabel: string;
  grantAdvantage: boolean;
  advantageSource?: string;
}

export function buildClashRollModifiers(
  campaign: Campaign,
  clash: TacticalClashState,
  action: ClashActionPayload | undefined,
  inferredAttribute: AttributeId,
): ClashRollHints {
  const target =
    clash.enemies.find((e) => e.id === (action?.targetEnemyId ?? clash.selectedTargetId) && e.hp > 0) ??
    clash.enemies.find((e) => e.hp > 0);

  const terrain = action?.terrainId
    ? clash.terrain.find((t) => t.id === action.terrainId && t.usesLeft > 0)
    : undefined;

  const attribute: AttributeId =
    terrain?.attribute ?? action?.attribute ?? inferredAttribute;

  const baseDc =
    campaign.difficulty === 'easy'
      ? 9
      : campaign.difficulty === 'normal'
        ? 11
        : campaign.difficulty === 'hard'
          ? 13
          : campaign.difficulty === 'insane'
            ? 15
            : 17;

  const bossBonus = target?.isBoss ? 2 : 0;
  const staggeredPenalty = target?.staggered ? -3 : 0;
  const comboPenalty = action?.kind === 'combo' ? -3 : 0;
  const dcOverride = clamp(baseDc + bossBonus + staggeredPenalty + comboPenalty, 7, 21);

  let grantAdvantage = false;
  let advantageSource: string | undefined;

  if (target?.staggered) {
    grantAdvantage = true;
    advantageSource = `${target.name} (${CLASH_ARCHETYPE_META[clash.archetype].staggerLabel})`;
  } else if (action?.kind === 'combo') {
    grantAdvantage = true;
    advantageSource =
      clash.allies.some((a) => !a.downed)
        ? CLASH_ARCHETYPE_META[clash.archetype].partyComboTitle
        : CLASH_ARCHETYPE_META[clash.archetype].soloSurgeTitle;
  } else if (terrain) {
    grantAdvantage = true;
    advantageSource = `Terreno: ${terrain.name}`;
  } else if (action?.kind === 'evidence') {
    grantAdvantage = true;
    advantageSource = `Prova: ${action.evidenceLabel || 'Evidência'}`;
  }

  return {
    attribute,
    dcOverride,
    opposedLabel: target ? `vs ${target.name}` : clash.title,
    grantAdvantage,
    advantageSource,
  };
}

function pickNextEnemyIntent(
  enemy: ClashEnemy,
  clash: TacticalClashState,
  nextRound: number,
  scale: number,
): ClashEnemyIntent {
  const livingAllies = clash.allies.filter((a) => !a.downed && a.vigor > 0);
  const patternIdx = (nextRound + enemy.name.length) % 3;

  if (clash.archetype === 'social') {
    const opts: Array<{ kind: ClashEnemyIntentKind; label: string; dmg: number }> = [
      { kind: 'pressure', label: 'Argumento Cortante', dmg: 16 },
      { kind: 'heavy_attack', label: 'Acusação Pública', dmg: 22 },
      { kind: 'defend', label: 'Postura Impassível', dmg: 10 },
    ];
    const pick = opts[patternIdx];
    return {
      kind: pick.kind,
      label: pick.label,
      damage: clamp(pick.dmg * scale, 8, 34),
      target: 'player',
    };
  }

  if (clash.archetype === 'chase') {
    const opts: Array<{ kind: ClashEnemyIntentKind; label: string; dmg: number }> = [
      { kind: 'pursue', label: 'Aceleração Agressiva', dmg: 18 },
      { kind: 'flank', label: 'Cortar Rota de Fuga', dmg: 15 },
      { kind: 'heavy_attack', label: 'Investida de Captura', dmg: 22 },
    ];
    const pick = opts[patternIdx];
    return {
      kind: pick.kind,
      label: pick.label,
      damage: clamp(pick.dmg * scale, 10, 32),
      target: 'player',
    };
  }

  if (clash.archetype === 'siege') {
    const hitsBarricade = patternIdx !== 1;
    return {
      kind: hitsBarricade ? 'heavy_attack' : 'attack',
      label: hitsBarricade ? 'Pressão na Barricada' : 'Ataque de Flanco',
      damage: clamp((hitsBarricade ? 20 : 14) * scale, 8, 34),
      target: hitsBarricade ? 'barricade' : 'player',
    };
  }

  // combat
  if (enemy.isBoss && patternIdx === 0) {
    return {
      kind: 'heavy_attack',
      label: 'Golpe Devastador Carregado',
      damage: clamp(25 * scale, 14, 42),
      target: 'player',
    };
  }
  if (livingAllies.length > 0 && patternIdx === 2) {
    const targetAlly = livingAllies[nextRound % livingAllies.length];
    return {
      kind: 'attack',
      label: `Pressão sobre ${targetAlly.name}`,
      damage: clamp(14 * scale, 8, 28),
      target: 'ally',
      targetAllyId: targetAlly.npcId,
    };
  }
  return {
    kind: patternIdx === 1 ? 'flank' : 'attack',
    label: patternIdx === 1 ? 'Avanço Tático' : 'Ataque Direto',
    damage: clamp((enemy.isBoss ? 18 : 13) * scale, 8, 34),
    target: 'player',
  };
}

export function spawnNextSiegeWave(
  clash: TacticalClashState,
  campaign: Campaign,
): ClashEnemy[] {
  const nextWave = (clash.waveCurrent ?? 1) + 1;
  const scale = difficultyScale(campaign.difficulty) * (1 + (nextWave - 1) * 0.14);
  const theme = campaign.world.primaryTheme;
  const now = Date.now();
  const isFinalWave = nextWave >= (clash.waveTotal ?? 3);

  const leaderName = isFinalWave
    ? theme === 'zombies'
      ? 'Tirano da Horda'
      : theme === 'cyberpunk'
        ? 'Mech Pesado de Assalto'
        : theme === 'fantasy'
          ? 'Arauto do Cerco'
          : 'Comandante do Assalto'
    : theme === 'zombies'
      ? `Vaga ${nextWave} · Infectados`
      : `Vaga ${nextWave} · Assaltantes`;

  const e1: ClashEnemy = {
    id: `ce_w${nextWave}_${now}_0`,
    name: leaderName,
    role: isFinalWave ? `Onda Final (${nextWave}/${clash.waveTotal})` : `Onda ${nextWave}`,
    isBoss: isFinalWave,
    hp: clamp((isFinalWave ? 78 : 56) * scale, 35, 220),
    maxHp: clamp((isFinalWave ? 78 : 56) * scale, 35, 220),
    posture: clamp((isFinalWave ? 42 : 28) * scale, 20, 100),
    maxPosture: clamp((isFinalWave ? 42 : 28) * scale, 20, 100),
    staggered: false,
    zone: 'close',
    armor: isFinalWave ? 3 : 1,
    weaknesses: ['Fogo', 'Barricada', 'FOR'],
    nextIntent: {
      kind: 'heavy_attack',
      label: isFinalWave ? 'Rompimento Total' : 'Aríete na Barricada',
      damage: clamp((isFinalWave ? 26 : 19) * scale, 12, 40),
      target: 'barricade',
    },
    statusTags: [],
  };

  const e2: ClashEnemy = {
    id: `ce_w${nextWave}_${now}_1`,
    name: theme === 'zombies' ? 'Salteador da Brecha' : 'Flanqueador da Onda',
    role: 'Suporte de Cerco',
    isBoss: false,
    hp: clamp(40 * scale, 24, 120),
    maxHp: clamp(40 * scale, 24, 120),
    posture: clamp(22 * scale, 15, 70),
    maxPosture: clamp(22 * scale, 15, 70),
    staggered: false,
    zone: 'mid',
    armor: 1,
    weaknesses: ['DES', 'Flanco'],
    nextIntent: {
      kind: 'attack',
      label: 'Disparo de Supressão',
      damage: clamp(14 * scale, 8, 28),
      target: 'player',
    },
    statusTags: [],
  };

  return [e1, e2];
}

/**
 * Converts a cornered Chase (pursuerThreat >= 100) into an active Combat Clash
 * preserving the pursuers and party allies!
 */
export function convertChaseToCombat(
  clash: TacticalClashState,
  campaign: Campaign,
): TacticalClashState {
  const scale = difficultyScale(campaign.difficulty);
  const nextEnemies = clash.enemies.map((e) => ({
    ...e,
    hp: Math.max(e.hp, Math.round(e.maxHp * 0.75)),
    zone: 'close' as ClashZone,
    staggered: false,
    nextIntent: {
      kind: 'heavy_attack' as const,
      label: 'Ataque à Queima-Roupa',
      damage: clamp(20 * scale, 12, 36),
      target: 'player' as const,
    },
  }));

  return {
    ...clash,
    archetype: 'combat',
    status: 'active',
    title: `Encurralado! ${clash.title}`,
    objective: 'Lute para abrir caminho ou quebre a postura do perseguidor.',
    playerZone: 'close',
    chaseProgress: undefined,
    pursuerThreat: undefined,
    enemies: nextEnemies,
    roundLog: [
      ...clash.roundLog,
      makeLog(
        clash.round,
        'Encurralado! Você virou para enfrentar o perseguidor em Combate Tático!',
        'system',
      ),
    ].slice(-24),
  };
}

export interface ClashRoundResolution {
  nextClash: TacticalClashState;
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

export function resolveClashRound(params: {
  campaign: Campaign;
  clash: TacticalClashState;
  actionText: string;
  clashAction?: ClashActionPayload;
  diceRoll?: DiceRollResult;
}): ClashRoundResolution {
  const { campaign, actionText, clashAction, diceRoll } = params;
  const next: TacticalClashState = structuredClone(params.clash);
  const round = next.round;
  const meta = CLASH_ARCHETYPE_META[next.archetype];
  const scale = difficultyScale(campaign.difficulty);

  const effectiveAttrs = getEffectiveAttributes(campaign.player);
  const prof = getProficiencyBonus(campaign.player.level);
  const gear = deriveEquippedCombatProfile(campaign.player.inventory);

  const logs: ClashLogEntry[] = [];
  const deltas: StateDelta[] = [];
  const supplyChanges: Partial<BaseSupplies> = {};
  let orgMoraleDelta = 0;
  let playerVigorDelta = 0;
  let playerTensionDelta = 0;
  let xpBonus = 0;
  let affinityBonus = 0;

  const outcome = diceRoll?.outcome ?? 'partial';
  const outcomeMult =
    outcome === 'critical_success'
      ? 1.55
      : outcome === 'success'
        ? 1.15
        : outcome === 'partial'
          ? 0.78
          : outcome === 'failure'
            ? 0.35
            : 0.15;

  // Resolve target enemy
  const targetId = clashAction?.targetEnemyId ?? next.selectedTargetId;
  let target =
    next.enemies.find((e) => e.id === targetId && e.hp > 0) ??
    next.enemies.find((e) => e.hp > 0);

  const attrKey: AttributeId =
    clashAction?.attribute ??
    diceRoll?.attribute ??
    (next.archetype === 'social'
      ? 'cha'
      : next.archetype === 'chase'
        ? 'dex'
        : 'str');
  const attrMod = getAttributeModifier(effectiveAttrs[attrKey] ?? 10);

  // Determine maneuver kind
  const kind = clashAction?.kind ?? 'freeform';
  const isSolo = next.allies.filter((a) => !a.downed).length === 0;
  const baseHeroPower = Math.max(
    10,
    14 + attrMod * 3 + prof * 2 + (next.archetype === 'social' ? 0 : gear.weaponBonus),
  );

  // ---------------------------------------------------------------------------
  // SUB-PHASE 1: Protagonist Action (Maneuver / Terrain / Evidence / Combo / Guild / Freeform)
  // ---------------------------------------------------------------------------
  let synergyGain = outcome === 'critical_success' ? 32 : outcome === 'success' ? 24 : 14;

  if (kind === 'reposition') {
    const newZone: ClashZone =
      clashAction?.moveToZone ??
      (next.playerZone === 'close' ? 'mid' : next.playerZone === 'mid' ? 'far' : 'mid');
    next.playerZone = newZone;
    const shieldGain = clamp(10 + attrMod * 2, 6, 22);
    next.playerShield = clamp(next.playerShield + shieldGain, 0, 45);
    logs.push(
      makeLog(
        round,
        `Reposicionou para ${meta.zones[newZone].label} (+${shieldGain} Escudo).`,
        'hero',
      ),
    );
    if (next.archetype === 'chase') {
      const boost = clamp(18 * outcomeMult, 8, 28);
      next.chaseProgress = clamp((next.chaseProgress ?? 0) + boost, 0, 100);
      logs.push(makeLog(round, `Atalho aberto (+${boost}% Fuga)!`, 'hero'));
    }
  } else if (kind === 'defend') {
    const shieldGain = clamp((16 + attrMod * 2) * Math.max(0.7, outcomeMult), 10, 32);
    next.playerShield = clamp(next.playerShield + shieldGain, 0, 50);

    if (next.archetype === 'social') {
      const compHeal = clamp(14 * Math.max(0.7, outcomeMult), 8, 24);
      next.playerComposure = clamp((next.playerComposure ?? 100) + compHeal, 0, 100);
      logs.push(
        makeLog(
          round,
          `Manteve a frieza (+${compHeal} Compostura · +${shieldGain} Escudo).`,
          'hero',
        ),
      );
    } else if (next.archetype === 'siege') {
      const supplies = campaign.stronghold?.supplies;
      const canBoost =
        Boolean(clashAction?.useSupplyBoost) &&
        ((supplies?.materials ?? 0) >= 2 || (supplies?.ammo ?? 0) >= 2);
      let repair = clamp(15 * Math.max(0.75, outcomeMult), 10, 24);
      if (canBoost) {
        if ((supplies?.materials ?? 0) >= 2) {
          supplyChanges.materials = (supplyChanges.materials ?? 0) - 2;
        } else {
          supplyChanges.ammo = (supplyChanges.ammo ?? 0) - 2;
        }
        repair += 20;
      }
      next.barricadeHp = clamp((next.barricadeHp ?? 100) + repair, 0, next.barricadeMaxHp ?? 100);
      logs.push(
        makeLog(
          round,
          `Barricada reforçada (+${repair}${canBoost ? ' com suprimentos' : ''}) e +${shieldGain} Escudo.`,
          'hero',
        ),
      );
    } else {
      const heal = clamp(8 + Math.max(0, attrMod), 5, 16);
      playerVigorDelta += heal;
      if (next.archetype === 'chase') {
        next.pursuerThreat = clamp((next.pursuerThreat ?? 0) - 12, 0, 100);
      }
      logs.push(
        makeLog(round, `Guarda erguida (+${shieldGain} Escudo · +${heal} Vigor).`, 'hero'),
      );
    }
  } else if (kind === 'guild_support') {
    next.guildSupportUsed = true;
    const supplies = campaign.stronghold?.supplies;
    if ((supplies?.ammo ?? 0) >= 2) {
      supplyChanges.ammo = (supplyChanges.ammo ?? 0) - 2;
    } else if ((supplies?.materials ?? 0) >= 2) {
      supplyChanges.materials = (supplyChanges.materials ?? 0) - 2;
    } else {
      orgMoraleDelta -= 5;
    }
    const orgName = campaign.organization?.name || 'Organização';
    const tierMult = 1 + ((campaign.organization?.tier ?? 1) - 1) * 0.1;
    const burst = clamp(24 * tierMult, 18, 42);
    for (const enemy of next.enemies) {
      if (enemy.hp <= 0) continue;
      enemy.hp = Math.max(0, enemy.hp - Math.round(burst * 0.7));
      enemy.posture = Math.max(0, enemy.posture - burst);
      if (enemy.posture === 0 && !enemy.staggered) {
        enemy.staggered = true;
      }
    }
    if (next.archetype === 'siege') {
      next.barricadeHp = clamp((next.barricadeHp ?? 100) + 25, 0, next.barricadeMaxHp ?? 100);
    } else if (next.archetype === 'chase') {
      next.chaseProgress = clamp((next.chaseProgress ?? 0) + 28, 0, 100);
    } else {
      next.playerShield = clamp(next.playerShield + 16, 0, 50);
    }
    logs.push(
      makeLog(
        round,
        `Apoio Tático de ${orgName} acionado! Pressão massiva em área (${burst} postura).`,
        'combo',
      ),
    );
    deltas.push({
      kind: 'faction',
      label: `Apoio Tático: ${orgName}`,
      positive: true,
    });
  } else if (kind === 'terrain' && clashAction?.terrainId) {
    const feat = next.terrain.find((t) => t.id === clashAction.terrainId && t.usesLeft > 0);
    if (feat) {
      feat.usesLeft = Math.max(0, feat.usesLeft - 1);
      synergyGain += 12;
      if (feat.effectKind === 'cover_shield') {
        const gain = clamp(20 * Math.max(0.75, outcomeMult), 12, 32);
        next.playerShield = clamp(next.playerShield + gain, 0, 50);
        logs.push(makeLog(round, `Usou ${feat.name}: +${gain} Escudo tático!`, 'terrain'));
      } else if (feat.effectKind === 'escape_boost' && next.archetype === 'chase') {
        const boost = clamp(28 * Math.max(0.7, outcomeMult), 14, 38);
        next.chaseProgress = clamp((next.chaseProgress ?? 0) + boost, 0, 100);
        logs.push(makeLog(round, `Usou ${feat.name}: +${boost}% de avanço na fuga!`, 'terrain'));
      } else if (feat.effectKind === 'posture_break' && target) {
        const pDmg = clamp((baseHeroPower + 14) * outcomeMult, 14, 48);
        const hDmg = clamp(baseHeroPower * 0.65 * outcomeMult, 6, 30);
        target.posture = Math.max(0, target.posture - pDmg);
        target.hp = Math.max(0, target.hp - hDmg);
        if (next.archetype === 'chase') {
          next.pursuerThreat = clamp((next.pursuerThreat ?? 0) - 18, 0, 100);
        }
        if (target.posture === 0 && !target.staggered) {
          target.staggered = true;
          synergyGain += 15;
          logs.push(
            makeLog(
              round,
              `${feat.name} destruiu a ${meta.postureLabel} de ${target.name} — ${meta.staggerLabel} Intenção cancelada!`,
              'terrain',
            ),
          );
        } else {
          logs.push(
            makeLog(
              round,
              `Usou ${feat.name} em ${target.name}: -${hDmg} ${meta.hpLabel} / -${pDmg} ${meta.postureLabel}.`,
              'terrain',
            ),
          );
        }
      } else if (feat.effectKind === 'damage_burst') {
        const burst = clamp((baseHeroPower + 8) * outcomeMult, 12, 42);
        for (const e of next.enemies) {
          if (e.hp <= 0) continue;
          e.hp = Math.max(0, e.hp - burst);
          e.posture = Math.max(0, e.posture - Math.round(burst * 0.65));
          if (e.posture === 0 && !e.staggered) e.staggered = true;
        }
        logs.push(
          makeLog(round, `${feat.name} detonado! ${burst} de impacto em todos os alvos!`, 'terrain'),
        );
      } else if (target) {
        // social_leverage or fallback
        const sDmg = clamp((baseHeroPower + 10) * outcomeMult, 12, 40);
        target.hp = Math.max(0, target.hp - sDmg);
        target.posture = Math.max(0, target.posture - Math.round(sDmg * 0.9));
        if (target.posture === 0 && !target.staggered) target.staggered = true;
        logs.push(
          makeLog(round, `Explorou ${feat.name} contra ${target.name}: -${sDmg} ${meta.hpLabel}!`, 'terrain'),
        );
      }
    }
  } else if (kind === 'evidence' && target) {
    if (clashAction?.evidenceId) {
      next.usedArgumentIds = [...(next.usedArgumentIds ?? []), clashAction.evidenceId];
    }
    const eDmg = clamp((baseHeroPower + 12) * outcomeMult, 14, 48);
    const pDmg = clamp((baseHeroPower + 16) * outcomeMult, 16, 52);
    target.hp = Math.max(0, target.hp - eDmg);
    target.posture = Math.max(0, target.posture - pDmg);
    synergyGain += 16;
    if (target.posture === 0 && !target.staggered) {
      target.staggered = true;
      logs.push(
        makeLog(
          round,
          `Prova "${clashAction?.evidenceLabel ?? 'Fato'}" expôs ${target.name} (-${eDmg} ${meta.hpLabel}) — ${meta.staggerLabel}`,
          'terrain',
        ),
      );
    } else {
      logs.push(
        makeLog(
          round,
          `Usou "${clashAction?.evidenceLabel ?? 'Argumento'}" em ${target.name}: -${eDmg} ${meta.hpLabel} / -${pDmg} ${meta.postureLabel}.`,
          'hero',
        ),
      );
    }
  } else if (kind === 'combo') {
    next.synergy = 0;
    synergyGain = 0;
    const comboLabel = isSolo ? meta.soloSurgeTitle : meta.partyComboTitle;
    if (!isSolo) {
      affinityBonus += 4;
    }
    if (next.archetype === 'chase') {
      const surge = clamp(36 * Math.max(0.85, outcomeMult), 28, 48);
      next.chaseProgress = clamp((next.chaseProgress ?? 0) + surge, 0, 100);
      next.pursuerThreat = clamp((next.pursuerThreat ?? 0) - 20, 0, 100);
      if (target) {
        target.posture = 0;
        target.staggered = true;
      }
      logs.push(
        makeLog(round, `⚡ ${comboLabel}! +${surge}% Fuga e perseguidor desequilibrado!`, 'combo'),
      );
    } else if (target) {
      const staggerBonus = target.staggered ? 1.45 : 1.0;
      const dmg = clamp(baseHeroPower * 1.95 * outcomeMult * staggerBonus, 24, 95);
      const pDmg = clamp(baseHeroPower * 2.1 * outcomeMult, 26, 95);
      target.hp = Math.max(0, target.hp - dmg);
      target.posture = Math.max(0, target.posture - pDmg);
      if (target.posture === 0 && !target.staggered) target.staggered = true;
      logs.push(
        makeLog(
          round,
          `⚡ ${comboLabel} em ${target.name}! -${dmg} ${meta.hpLabel} / -${pDmg} ${meta.postureLabel}!`,
          'combo',
        ),
      );
    }
  } else if (target) {
    // primary, break_posture, or freeform text action
    const isBreakFocus =
      kind === 'break_posture' ||
      /(quebr|atordo|desarm|derrub|expor|contradi|bloque|stagger|break|disarm)/i.test(actionText);
    const zoneBonus =
      next.playerZone === 'close' && (attrKey === 'str' || attrKey === 'cha')
        ? 1.2
        : next.playerZone === 'far' && (attrKey === 'dex' || attrKey === 'int')
          ? 1.15
          : 1.0;
    const staggerMult = target.staggered ? 1.5 : 1.0;
    const weaknessHit = target.weaknesses.some((w) =>
      actionText.toLowerCase().includes(w.toLowerCase()),
    );
    const weakMult = weaknessHit ? 1.25 : 1.0;

    const rawHpDmg =
      baseHeroPower *
      (isBreakFocus ? 0.65 : 1.0) *
      outcomeMult *
      zoneBonus *
      staggerMult *
      weakMult;
    const finalHpDmg = Math.max(
      outcome === 'critical_failure' ? 0 : 3,
      Math.round(rawHpDmg - (target.staggered ? 0 : target.armor)),
    );
    const finalPostureDmg = clamp(
      baseHeroPower * (isBreakFocus ? 1.35 : 0.72) * outcomeMult * weakMult,
      outcome === 'critical_failure' ? 0 : 4,
      60,
    );

    target.hp = Math.max(0, target.hp - finalHpDmg);
    target.posture = Math.max(0, target.posture - finalPostureDmg);

    if (next.archetype === 'chase') {
      const gain = clamp((isBreakFocus ? 12 : 24) * outcomeMult, 4, 34);
      next.chaseProgress = clamp((next.chaseProgress ?? 0) + gain, 0, 100);
      if (isBreakFocus) {
        next.pursuerThreat = clamp((next.pursuerThreat ?? 0) - Math.round(14 * outcomeMult), 0, 100);
      }
      logs.push(
        makeLog(
          round,
          `Manobra de fuga (+${gain}% Fuga) e pressão em ${target.name} (-${finalPostureDmg} ${meta.postureLabel}).`,
          'hero',
        ),
      );
    } else if (target.posture === 0 && !target.staggered && target.hp > 0) {
      target.staggered = true;
      synergyGain += isSolo ? 20 : 14;
      logs.push(
        makeLog(
          round,
          `${target.name}: -${finalHpDmg} ${meta.hpLabel} e ${meta.staggerLabel} Intenção cancelada!`,
          'hero',
        ),
      );
    } else {
      logs.push(
        makeLog(
          round,
          `${target.name}: -${finalHpDmg} ${meta.hpLabel} / -${finalPostureDmg} ${meta.postureLabel}${weaknessHit ? ' (Fraqueza!)' : ''}.`,
          'hero',
        ),
      );
    }
  }

  // Update synergy / solo surge
  if (kind !== 'combo') {
    next.synergy = clamp(next.synergy + synergyGain, 0, 100);
  }

  // ---------------------------------------------------------------------------
  // SUB-PHASE 2: Party Companions Execute Sticky Directives
  // ---------------------------------------------------------------------------
  for (const ally of next.allies) {
    if (ally.downed || ally.vigor <= 0) continue;
    const allyTarget =
      next.enemies.find((e) => e.id === target?.id && e.hp > 0) ??
      next.enemies.find((e) => e.hp > 0);
    const allyPower = Math.max(8, 10 + Math.floor(ally.level * 1.4));

    if (ally.directive === 'strike' && allyTarget) {
      const dmg = Math.max(4, allyPower - allyTarget.armor);
      allyTarget.hp = Math.max(0, allyTarget.hp - dmg);
      allyTarget.posture = Math.max(0, allyTarget.posture - Math.round(allyPower * 0.55));
      if (allyTarget.posture === 0 && !allyTarget.staggered && allyTarget.hp > 0) {
        allyTarget.staggered = true;
      }
      next.synergy = clamp(next.synergy + 8, 0, 100);
      logs.push(makeLog(round, `${ally.name} atacou ${allyTarget.name} (-${dmg} ${meta.hpLabel}).`, 'ally'));
    } else if (ally.directive === 'guard') {
      const shield = clamp(10 + Math.floor(ally.level * 0.8), 8, 22);
      next.playerShield = clamp(next.playerShield + shield, 0, 55);
      ally.shield = clamp(ally.shield + 8, 0, 25);
      next.synergy = clamp(next.synergy + 10, 0, 100);
      logs.push(makeLog(round, `${ally.name} cobriu você (+${shield} Escudo).`, 'ally'));
    } else if (ally.directive === 'flank') {
      if (next.archetype === 'chase') {
        next.chaseProgress = clamp((next.chaseProgress ?? 0) + 10, 0, 100);
        logs.push(makeLog(round, `${ally.name} abriu passagem (+10% Fuga).`, 'ally'));
      } else if (allyTarget) {
        const pDmg = Math.round(allyPower * 1.2);
        allyTarget.posture = Math.max(0, allyTarget.posture - pDmg);
        allyTarget.hp = Math.max(0, allyTarget.hp - Math.round(allyPower * 0.45));
        if (allyTarget.posture === 0 && !allyTarget.staggered && allyTarget.hp > 0) {
          allyTarget.staggered = true;
          logs.push(
            makeLog(round, `${ally.name} flanqueou e quebrou ${allyTarget.name} — ${meta.staggerLabel}`, 'ally'),
          );
        } else {
          logs.push(makeLog(round, `${ally.name} flanqueou ${allyTarget.name} (-${pDmg} ${meta.postureLabel}).`, 'ally'));
        }
      }
      next.synergy = clamp(next.synergy + 12, 0, 100);
    } else if (ally.directive === 'support') {
      next.synergy = clamp(next.synergy + 20, 0, 100);
      if (next.archetype === 'social') {
        next.playerComposure = clamp((next.playerComposure ?? 100) + 10, 0, 100);
        logs.push(makeLog(round, `${ally.name} apoiou seu argumento (+10 Compostura · +20 Sinergia).`, 'ally'));
      } else {
        playerVigorDelta += 8;
        logs.push(makeLog(round, `${ally.name} prestou suporte (+8 Vigor · +20 Sinergia).`, 'ally'));
      }
    }
  }

  // ---------------------------------------------------------------------------
  // SUB-PHASE 3: Surviving Non-Staggered Enemies Execute Telegraphed Intents
  // ---------------------------------------------------------------------------
  const zoneMitigation =
    next.playerZone === 'far' ? 5 : next.playerZone === 'mid' ? 3 : 0;
  const passiveArmor = next.archetype === 'social' ? 0 : gear.armorMitigation;

  for (const enemy of next.enemies) {
    if (enemy.hp <= 0) continue;

    if (enemy.staggered) {
      // Staggered enemies lose their turn and recover 65% posture for next round
      enemy.staggered = false;
      enemy.posture = Math.max(10, Math.round(enemy.maxPosture * 0.65));
      logs.push(
        makeLog(round, `${enemy.name} perdeu a rodada atordoado e tenta se recompor!`, 'enemy'),
      );
      continue;
    }

    const intent = enemy.nextIntent;
    if (intent.kind === 'defend') {
      enemy.posture = clamp(enemy.posture + Math.round(enemy.maxPosture * 0.35), 0, enemy.maxPosture);
      logs.push(makeLog(round, `${enemy.name} reforçou a própria guarda.`, 'enemy'));
      continue;
    }

    const rawDmg = intent.damage;

    if (next.archetype === 'chase') {
      const threatGain = clamp(rawDmg + (outcome === 'failure' || outcome === 'critical_failure' ? 8 : 0) - zoneMitigation, 6, 30);
      next.pursuerThreat = clamp((next.pursuerThreat ?? 0) + threatGain, 0, 100);
      const chip = Math.max(0, Math.round(rawDmg * 0.35) - next.playerShield);
      next.playerShield = Math.max(0, next.playerShield - Math.round(rawDmg * 0.35));
      if (chip > 0) playerVigorDelta -= chip;
      logs.push(
        makeLog(round, `${enemy.name} usou ${intent.label}: +${threatGain}% Captura${chip > 0 ? ` (-${chip} Vigor)` : ''}.`, 'enemy'),
      );
    } else if (next.archetype === 'siege' && intent.target === 'barricade') {
      const bDmg = Math.max(4, rawDmg - (next.playerZone === 'close' ? 4 : 0));
      next.barricadeHp = clamp((next.barricadeHp ?? 100) - bDmg, 0, next.barricadeMaxHp ?? 100);
      logs.push(makeLog(round, `${enemy.name} atingiu a barricada (-${bDmg} Integridade)!`, 'enemy'));
    } else if (intent.target === 'ally' && intent.targetAllyId) {
      const ally = next.allies.find((a) => a.npcId === intent.targetAllyId && !a.downed);
      if (ally) {
        const absorbed = Math.min(ally.shield, rawDmg);
        ally.shield -= absorbed;
        const net = Math.max(2, rawDmg - absorbed - 2);
        ally.vigor = Math.max(0, ally.vigor - net);
        if (ally.vigor === 0) {
          ally.downed = true;
          logs.push(
            makeLog(round, `${enemy.name} atingiu ${ally.name} (-${net}) — ${ally.name} ficou incapacitado!`, 'enemy'),
          );
        } else {
          logs.push(makeLog(round, `${enemy.name} atacou ${ally.name} (-${net} Vigor).`, 'enemy'));
        }
      }
    } else if (next.archetype === 'social') {
      const absorbed = Math.min(next.playerShield, rawDmg);
      next.playerShield -= absorbed;
      const net = Math.max(2, rawDmg - absorbed - zoneMitigation);
      next.playerComposure = clamp((next.playerComposure ?? 100) - net, 0, 100);
      playerTensionDelta += 6;
      logs.push(
        makeLog(round, `${enemy.name} disparou "${intent.label}": -${net} Compostura.`, 'enemy'),
      );
    } else {
      // combat / siege direct hit on player
      const mitigated = Math.max(2, rawDmg - passiveArmor - zoneMitigation);
      const absorbed = Math.min(next.playerShield, mitigated);
      next.playerShield -= absorbed;
      const finalHit = Math.max(0, mitigated - absorbed);
      if (finalHit > 0) {
        playerVigorDelta -= finalHit;
        playerTensionDelta += 5;
      }
      logs.push(
        makeLog(
          round,
          `${enemy.name} executou ${intent.label}: ${finalHit > 0 ? `-${finalHit} Vigor` : 'totalmente bloqueado pelo Escudo!'}.`,
          'enemy',
        ),
      );
    }
  }

  // Cap tension cleanly below 95 during active clashes so crisis_tension never softlocks
  const projectedTension = campaign.player.tension + playerTensionDelta;
  if (projectedTension > 94) {
    playerTensionDelta = Math.max(-10, 94 - campaign.player.tension);
  }

  // Decay leftover shield partially so defending matters without stacking forever
  next.playerShield = Math.floor(next.playerShield * 0.45);

  // ---------------------------------------------------------------------------
  // SUB-PHASE 4: Check End Conditions & Siege Waves & Next Round Intents
  // ---------------------------------------------------------------------------
  const livingEnemies = next.enemies.filter((e) => e.hp > 0);
  let endedOutcome: ClashRoundResolution['endedOutcome'] = 'active';

  if (next.archetype === 'chase') {
    if ((next.chaseProgress ?? 0) >= 100 || livingEnemies.length === 0) {
      endedOutcome = 'escaped';
    } else if ((next.pursuerThreat ?? 0) >= 100) {
      // Cornered! Keep active at 100% threat so HUD presents "⚡ Virar e Lutar" or surrender
      logs.push(
        makeLog(
          round,
          'ENCURRALADO! O perseguidor alcançou você — vire para lutar ou tente uma manobra desesperada!',
          'system',
        ),
      );
    }
  } else if (next.archetype === 'social') {
    if (livingEnemies.length === 0) {
      endedOutcome = 'victory';
    } else if ((next.playerComposure ?? 100) <= 0) {
      endedOutcome = 'defeat';
    }
  } else if (next.archetype === 'siege') {
    if ((next.barricadeHp ?? 100) <= 0) {
      endedOutcome = 'defeat';
    } else if (livingEnemies.length === 0) {
      if ((next.waveCurrent ?? 1) < (next.waveTotal ?? 3)) {
        const nextWaveNum = (next.waveCurrent ?? 1) + 1;
        next.waveCurrent = nextWaveNum;
        next.enemies = spawnNextSiegeWave(next, campaign);
        next.selectedTargetId = next.enemies[0].id;
        logs.push(
          makeLog(
            round,
            `Onda ${nextWaveNum - 1} contida! Onda ${nextWaveNum}/${next.waveTotal} avançando sobre o perímetro!`,
            'system',
          ),
        );
      } else {
        endedOutcome = 'victory';
      }
    }
  } else {
    // combat
    if (livingEnemies.length === 0) {
      endedOutcome = 'victory';
    }
  }

  // Update next round or conclude
  if (endedOutcome === 'active') {
    next.round = round + 1;
    const stillAlive = next.enemies.filter((e) => e.hp > 0);
    if (!stillAlive.some((e) => e.id === next.selectedTargetId) && stillAlive[0]) {
      next.selectedTargetId = stillAlive[0].id;
    }
    for (const enemy of stillAlive) {
      enemy.nextIntent = pickNextEnemyIntent(enemy, next, next.round, scale);
    }
  } else {
    next.status = endedOutcome;
    if (endedOutcome === 'victory' || endedOutcome === 'escaped') {
      xpBonus =
        endedOutcome === 'victory'
          ? 65 + next.enemies.filter((e) => e.isBoss).length * 45
          : 45;
      if (next.allies.length > 0) affinityBonus += 5;
      deltas.push({
        kind: 'quest',
        label:
          endedOutcome === 'escaped'
            ? `Fuga bem-sucedida: ${next.title}`
            : `Vitória no Confronto: ${next.title}`,
        positive: true,
      });
    } else {
      deltas.push({
        kind: 'crisis',
        label:
          next.archetype === 'social'
            ? `Compostura quebrada em ${next.title}`
            : next.archetype === 'siege'
              ? `Barricada rompida em ${next.title}`
              : `Derrota em ${next.title}`,
        positive: false,
      });
    }
  }

  next.roundLog = [...next.roundLog, ...logs].slice(-24);

  const allyVigorUpdates = next.allies.map((a) => ({
    npcId: a.npcId,
    vigor: a.vigor,
    downed: Boolean(a.downed),
  }));

  // Compact deterministic digest fed to /api/story/turn for 100% faithful narration
  const enemySummary = next.enemies
    .map(
      (e) =>
        `${e.name} [${e.hp}/${e.maxHp} ${meta.hpLabel}, ${e.posture}/${e.maxPosture} ${meta.postureLabel}${e.staggered ? ', STAGGERED' : ''}${e.hp === 0 ? ', NEUTRALIZED' : `, next: ${e.nextIntent.label}`}]`,
    )
    .join('; ');

  const promptDigest = [
    `[ACTIVE TACTICAL CLASH — ROUND ${round} RESOLUTION]`,
    `Archetype: ${next.archetype} ("${next.title}") | Status after round: ${endedOutcome.toUpperCase()}`,
    `Player Zone: ${meta.zones[next.playerZone].label} | Shield: ${next.playerShield}${next.archetype === 'social' ? ` | Composure: ${next.playerComposure}/100` : ''}${next.archetype === 'chase' ? ` | Escape: ${next.chaseProgress}% vs Pursuer: ${next.pursuerThreat}%` : ''}${next.archetype === 'siege' ? ` | Wave ${next.waveCurrent}/${next.waveTotal} | Barricade: ${next.barricadeHp}%` : ''}`,
    `Round Events: ${logs.map((l) => l.summary).join(' | ')}`,
    `Targets State: ${enemySummary}`,
    `HARD RULES FOR NARRATION: Narrate these exact tactical events vividly in prose/dialogue beats. Do NOT contradict outcomes. Set stateChanges.vigorDelta = 0 and stateChanges.tensionDelta = 0 (already applied deterministically), do NOT duplicate spent supplies/items, and keep advanceTime.minutes = 1. ${endedOutcome !== 'active' ? `The clash JUST ENDED with outcome "${endedOutcome.toUpperCase()}" — narrate the decisive climax and aftermath cleanly!` : 'Keep tension high and offer 3-4 tactical next actions matching the clash.'}`,
  ].join('\n');

  return {
    nextClash: next,
    playerVigorDelta,
    playerTensionDelta,
    allyVigorUpdates,
    supplyChanges,
    orgMoraleDelta,
    xpBonus,
    affinityBonus,
    deltas,
    promptDigest,
    endedOutcome,
  };
}


// ---------------------------------------------------------------------------
// MYTHOS 11.5 — JRPG Named Moves & Choreographed Battle Beats (FF / Pokemon)
// ---------------------------------------------------------------------------

export type ClashVfxKind =
  | 'slash'
  | 'shot'
  | 'heavy'
  | 'psychic'
  | 'shield'
  | 'heal'
  | 'limit';

export interface ClashPlayerMove {
  id: string;
  name: string;
  typeTag: string;
  powerHint: string;
  description: string;
  color: string;
  vfx: ClashVfxKind;
  maneuverKind: 'primary' | 'break_posture' | 'reposition' | 'defend';
  attribute: AttributeId;
}

/**
 * Generates 4 evocative Pokemon/Final Fantasy-style named moves tailored to the
 * active archetype, world theme, and equipped weapon!
 */
export function getPlayerClashMoves(
  campaign: Campaign,
  clash: TacticalClashState,
): ClashPlayerMove[] {
  const theme = campaign.world.primaryTheme;
  const gear = deriveEquippedCombatProfile(campaign.player.inventory);
  const wName = gear.weaponName;

  if (clash.archetype === 'social') {
    return [
      {
        id: 'soc_press',
        name: 'Argumento Cortante',
        typeTag: 'CAR · Pressão',
        powerHint: 'Alto impacto na Compostura',
        description: 'Encara o adversário de frente e ataca o ponto mais fraco do discurso.',
        color: '#c084fc',
        vfx: 'psychic',
        maneuverKind: 'primary',
        attribute: 'cha',
      },
      {
        id: 'soc_expose',
        name: 'Expor Contradição',
        typeTag: 'INT · Quebra',
        powerHint: 'Destrói a Defesa retórica',
        description: 'Aponta uma falha lógica para deixar o oponente exposto e sem resposta.',
        color: '#38bdf8',
        vfx: 'heavy',
        maneuverKind: 'break_posture',
        attribute: 'int',
      },
      {
        id: 'soc_read',
        name: 'Leitura Fria',
        typeTag: 'SAB · Tática',
        powerHint: 'Muda postura + Escudo',
        description: 'Recua um passo, lê microexpressões e retoma o controle do ritmo.',
        color: '#fbbf24',
        vfx: 'shield',
        maneuverKind: 'reposition',
        attribute: 'wis',
      },
      {
        id: 'soc_poise',
        name: 'Frieza Absoluta',
        typeTag: 'SAB · Defesa',
        powerHint: '+Compostura +Escudo',
        description: 'Respira fundo, absorve provocações e recupera Compostura.',
        color: '#4ade80',
        vfx: 'heal',
        maneuverKind: 'defend',
        attribute: 'wis',
      },
    ];
  }

  if (clash.archetype === 'chase') {
    return [
      {
        id: 'ch_sprint',
        name: 'Arrancada Explosiva',
        typeTag: 'DES · Velocidade',
        powerHint: '+Avanço de Fuga',
        description: 'Dispara em velocidade máxima abrindo distância do perseguidor.',
        color: '#38bdf8',
        vfx: 'shot',
        maneuverKind: 'primary',
        attribute: 'dex',
      },
      {
        id: 'ch_block',
        name: 'Fechar Passagem',
        typeTag: 'FOR · Obstáculo',
        powerHint: 'Quebra Ritmo · -Captura',
        description: 'Derruba o que houver pelo caminho para travar quem vem atrás.',
        color: '#fb923c',
        vfx: 'heavy',
        maneuverKind: 'break_posture',
        attribute: 'str',
      },
      {
        id: 'ch_shortcut',
        name: 'Cortar Atalho',
        typeTag: 'SAB · Rota',
        powerHint: 'Ganha Zona + Fuga',
        description: 'Encontra um desvio inesperado para ganhar vantagem de terreno.',
        color: '#fbbf24',
        vfx: 'shield',
        maneuverKind: 'reposition',
        attribute: 'wis',
      },
      {
        id: 'ch_feint',
        name: 'Finta & Fôlego',
        typeTag: 'CON · Controle',
        powerHint: '+Vigor +Escudo',
        description: 'Despista a linha de visão e recupera o fôlego em movimento.',
        color: '#4ade80',
        vfx: 'heal',
        maneuverKind: 'defend',
        attribute: 'con',
      },
    ];
  }

  if (clash.archetype === 'siege') {
    return [
      {
        id: 'sg_fire',
        name: gear.hasRangedWeapon ? 'Fogo de Supressão' : 'Varrida na Brecha',
        typeTag: gear.hasRangedWeapon ? 'DES · Fogo' : 'FOR · Linha',
        powerHint: 'Contém a onda atual',
        description: wName
          ? `Usa ${wName} para derrubar quem força a linha de frente.`
          : 'Golpe firme para conter o avanço da onda.',
        color: '#f87171',
        vfx: gear.hasRangedWeapon ? 'shot' : 'slash',
        maneuverKind: 'primary',
        attribute: gear.hasRangedWeapon ? 'dex' : 'str',
      },
      {
        id: 'sg_push',
        name: 'Rechaçar Avanço',
        typeTag: 'FOR · Impacto',
        powerHint: 'Quebra avanço da onda',
        description: 'Empurra os atacantes para longe da barricada e atordoa o líder.',
        color: '#fbbf24',
        vfx: 'heavy',
        maneuverKind: 'break_posture',
        attribute: 'str',
      },
      {
        id: 'sg_angle',
        name: 'Ângulo Elevado',
        typeTag: 'DES · Posição',
        powerHint: 'Troca linha + Escudo',
        description: 'Busca melhor linha de fogo com proteção lateral.',
        color: '#38bdf8',
        vfx: 'shield',
        maneuverKind: 'reposition',
        attribute: 'dex',
      },
      {
        id: 'sg_fortify',
        name: 'Reforçar Barricada',
        typeTag: 'INT · Perímetro',
        powerHint: 'Restaura Barricada',
        description: 'Trava pontos fracos da defesa (usa suprimentos se disponíveis).',
        color: '#4ade80',
        vfx: 'heal',
        maneuverKind: 'defend',
        attribute: 'int',
      },
    ];
  }

  // D&D 5e (2024 / SRD 5.2) Combat Moves — show real weapon dice, attack bonus & 2024 Weapon Mastery!
  if (isDndRuleset(campaign) && campaign.player.dnd) {
    const wpn = getEquippedWeaponDndProfile(campaign);
    const dmgModStr = wpn.damageBonus >= 0 ? `+${wpn.damageBonus}` : `${wpn.damageBonus}`;
    const atkStr = wpn.attackBonus >= 0 ? `+${wpn.attackBonus}` : `${wpn.attackBonus}`;
    const masteryLabel = wpn.mastery ? DND_WEAPON_MASTERIES[wpn.mastery].label : null;
    const attrTag = wpn.attribute.toUpperCase();

    return [
      {
        id: 'cb_strike',
        name: wpn.name,
        typeTag: `${attrTag} ${atkStr}`,
        powerHint: `${wpn.dice}${dmgModStr}${masteryLabel ? ` · ${masteryLabel}` : ''}`,
        description: `Ataque vs CA (${atkStr}) causando ${wpn.dice}${dmgModStr}.${masteryLabel ? ` Maestria: ${DND_WEAPON_MASTERIES[wpn.mastery!].summary}` : ''}`,
        color: '#f87171',
        vfx: wpn.isRanged ? 'shot' : 'slash',
        maneuverKind: 'primary',
        attribute: wpn.attribute,
      },
      {
        id: 'cb_break',
        name: wpn.isRanged ? 'Tiro Disruptor' : 'Derrubar / Empurrão',
        typeTag: 'CON · Controle',
        powerHint: 'Derruba Caído · Quebra Canalização',
        description: 'Força Salvaguarda de CON do inimigo para deixá-lo Caído e cancelar golpes carregados.',
        color: '#fbbf24',
        vfx: 'heavy',
        maneuverKind: 'break_posture',
        attribute: wpn.attribute,
      },
      {
        id: 'cb_flank',
        name: 'Desengajar',
        typeTag: 'DES · Mobilidade',
        powerHint: 'Troca coluna sem Oportunidade',
        description: 'Muda de coluna (RET/CEN/VAN) com segurança, evitando Ataques de Oportunidade.',
        color: '#38bdf8',
        vfx: 'shield',
        maneuverKind: 'reposition',
        attribute: 'dex',
      },
      {
        id: 'cb_guard',
        name: 'Esquivar (Dodge)',
        typeTag: 'DEF · Guarda',
        powerHint: 'Inimigos têm Desvantagem contra você',
        description: 'Ação Esquivar (SRD 5.2): ataques contra você sofrem Desvantagem + Vantagem em DES.',
        color: '#4ade80',
        vfx: 'shield',
        maneuverKind: 'defend',
        attribute: 'dex',
      },
    ];
  }

  // Legacy MYTHOS 'combat' moves
  const primaryMoveName = gear.hasRangedWeapon
    ? theme === 'cyberpunk'
      ? 'Rajada Cyber-Precisa'
      : 'Disparo Certeiro'
    : theme === 'fantasy'
      ? wName
        ? `Corte · ${wName}`
        : 'Golpe Cruzado'
      : theme === 'cyberpunk'
        ? 'Golpe Cinético'
        : 'Ataque Direto';

  const breakMoveName = gear.hasRangedWeapon
    ? 'Tiro Disruptor'
    : theme === 'fantasy'
      ? 'Quebra-Guarda'
      : 'Golpe Atordoador';

  return [
    {
      id: 'cb_strike',
      name: primaryMoveName,
      typeTag: gear.hasRangedWeapon ? 'DES · Precisão' : 'FOR · Ataque',
      powerHint: 'Dano direto alto',
      description: wName
        ? `Desfere ataque preciso com ${wName} no alvo marcado.`
        : 'Ataque decisivo mirando o ponto vital do alvo.',
      color: '#f87171',
      vfx: gear.hasRangedWeapon ? 'shot' : 'slash',
      maneuverKind: 'primary',
      attribute: gear.hasRangedWeapon ? 'dex' : 'str',
    },
    {
      id: 'cb_break',
      name: breakMoveName,
      typeTag: 'DES · Postura',
      powerHint: 'Quebra guarda · Cancela golpe',
      description: 'Mira a estabilidade do inimigo para atordoar e cancelar a intenção dele.',
      color: '#fbbf24',
      vfx: 'heavy',
      maneuverKind: 'break_posture',
      attribute: 'dex',
    },
    {
      id: 'cb_flank',
      name: 'Passo Sombrio',
      typeTag: 'DES · Mobilidade',
      powerHint: 'Muda zona + Escudo',
      description: 'Esquiva lateral para posição vantajosa ganhando escudo tático.',
      color: '#38bdf8',
      vfx: 'shield',
      maneuverKind: 'reposition',
      attribute: 'dex',
    },
    {
      id: 'cb_guard',
      name: 'Postura Férrea',
      typeTag: 'CON · Guarda',
      powerHint: '+Escudo +Vigor',
      description: 'Firma a defesa, absorve o próximo impacto e recupera o fôlego.',
      color: '#4ade80',
      vfx: 'heal',
      maneuverKind: 'defend',
      attribute: 'con',
    },
  ];
}

export interface ClashChoreographyBeat {
  id: string;
  actorSide: 'hero' | 'enemy' | 'system';
  actorId?: string; // 'player', ally npcId, or enemy id
  targetSide: 'hero' | 'enemy' | 'none';
  targetId?: string;
  vfx: ClashVfxKind;
  floatingText?: string;
  floatingColor?: string;
  isCrit?: boolean;
  brokePosture?: boolean;
  screenShake?: boolean;
  caption: string;
}

/**
 * Extracts crisp animated visual beats from a resolved clash round so the
 * Battle Arena can choreograph lunges, slashes, shakes, SFX, and floating numbers!
 */
export function extractClashChoreographyBeats(
  before: TacticalClashState,
  resolution: ClashRoundResolution,
  actionVfx: ClashVfxKind,
  diceRoll?: DiceRollResult,
): ClashChoreographyBeat[] {
  const after = resolution.nextClash;
  const beats: ClashChoreographyBeat[] = [];
  const newLogs = after.roundLog.filter((l) => l.round === before.round);
  const isCrit = diceRoll?.outcome === 'critical_success';

  // Compare enemy HP / posture deltas for floating numbers
  const beforeEnemies = new Map(before.enemies.map((e) => [e.id, e]));
  const primaryTarget =
    after.enemies.find((e) => e.id === before.selectedTargetId) ??
    after.enemies[0];

  const heroLogs = newLogs.filter(
    (l) => l.tone === 'hero' || l.tone === 'terrain' || l.tone === 'combo',
  );
  if (heroLogs.length > 0) {
    const prevTarget = primaryTarget ? beforeEnemies.get(primaryTarget.id) : undefined;
    const hpLost =
      prevTarget && primaryTarget
        ? Math.max(0, prevTarget.hp - primaryTarget.hp)
        : 0;
    const broke =
      Boolean(primaryTarget?.staggered && !prevTarget?.staggered) ||
      heroLogs.some((l) => /QUEBRAD|EXPOST|DESEQUILIBR|CONTID/i.test(l.summary));
    const isHealOrShield = actionVfx === 'heal' || actionVfx === 'shield';
    const isHeroMiss =
      hpLost === 0 &&
      !broke &&
      heroLogs.some((l) => /errou/i.test(l.summary)) &&
      !isHealOrShield;
    const isShieldReaction = heroLogs.some((l) => /REAÇÃO:.*Escudo/i.test(l.summary));

    let floatingText: string | undefined;
    let floatingColor = '#f87171';
    if (isShieldReaction) {
      floatingText = '🛡️ ESCUDO +5 CA!';
      floatingColor = '#38bdf8';
    } else if (broke) {
      floatingText = hpLost > 0 ? `QUEBRADO! −${hpLost}` : 'QUEBRADO!';
      floatingColor = '#fbbf24';
    } else if (hpLost > 0) {
      floatingText = isCrit ? `CRÍTICO! −${hpLost}` : `−${hpLost} PV`;
      floatingColor = isCrit ? '#fbbf24' : '#f87171';
    } else if (isHeroMiss) {
      floatingText = 'ERROU!';
      floatingColor = '#94a3b8';
    } else if (resolution.playerVigorDelta > 0 && isHealOrShield) {
      floatingText = `+${resolution.playerVigorDelta} PV`;
      floatingColor = '#4ade80';
    } else if (after.playerShield > before.playerShield) {
      floatingText = `ESCUDO +${after.playerShield - before.playerShield}`;
      floatingColor = '#38bdf8';
    } else if (
      after.archetype === 'chase' &&
      (after.chaseProgress ?? 0) > (before.chaseProgress ?? 0)
    ) {
      floatingText = `+${(after.chaseProgress ?? 0) - (before.chaseProgress ?? 0)}% FUGA`;
      floatingColor = '#38bdf8';
    }

    beats.push({
      id: `beat_hero_${Date.now()}`,
      actorSide: 'hero',
      actorId: 'player',
      targetSide: isHealOrShield ? 'hero' : 'enemy',
      targetId: isHealOrShield ? 'player' : primaryTarget?.id,
      vfx: actionVfx,
      floatingText,
      floatingColor,
      isCrit,
      brokePosture: broke,
      screenShake: isCrit || broke || actionVfx === 'limit',
      caption: heroLogs.map((l) => l.summary).join(' '),
    });
  }

  // Ally beat (grouped cleanly so battle stays snappy!)
  const allyLogs = newLogs.filter((l) => l.tone === 'ally');
  if (allyLogs.length > 0) {
    beats.push({
      id: `beat_ally_${Date.now()}`,
      actorSide: 'hero',
      actorId: after.allies[0]?.npcId,
      targetSide: 'enemy',
      targetId: primaryTarget?.id,
      vfx: 'slash',
      floatingText: 'APOIO!',
      floatingColor: '#38bdf8',
      caption: allyLogs.map((l) => l.summary).join(' · '),
    });
  }

  // Enemy counter-attack beats
  const enemyLogs = newLogs.filter((l) => l.tone === 'enemy');
  if (enemyLogs.length > 0) {
    const firstLivingBefore = before.enemies.find((e) => e.hp > 0);
    const playerTookDmg = resolution.playerVigorDelta < 0;
    const compLost =
      before.archetype === 'social' &&
      (after.playerComposure ?? 100) < (before.playerComposure ?? 100)
        ? (before.playerComposure ?? 100) - (after.playerComposure ?? 100)
        : 0;
    const barLost =
      before.archetype === 'siege' &&
      (after.barricadeHp ?? 100) < (before.barricadeHp ?? 100)
        ? (before.barricadeHp ?? 100) - (after.barricadeHp ?? 100)
        : 0;

    let eFloat: string | undefined;
    let eColor = '#f87171';
    if (playerTookDmg) {
      eFloat = `${resolution.playerVigorDelta} PV`;
    } else if (compLost > 0) {
      eFloat = `−${compLost} COMP`;
      eColor = '#c084fc';
    } else if (barLost > 0) {
      eFloat = `−${barLost} BARR`;
      eColor = '#fb923c';
    } else if (enemyLogs.some((l) => /ERROU/i.test(l.summary))) {
      eFloat = 'ERROU! vs CA';
      eColor = '#38bdf8';
    } else if (enemyLogs.some((l) => /bloqueado|atordoado|incapacitado/i.test(l.summary))) {
      eFloat = enemyLogs.some((l) => /atordoado|incapacitado/i.test(l.summary))
        ? 'INCAPACITADO!'
        : 'BLOQUEADO!';
      eColor = '#38bdf8';
    }

    beats.push({
      id: `beat_enemy_${Date.now()}`,
      actorSide: 'enemy',
      actorId: firstLivingBefore?.id,
      targetSide: 'hero',
      targetId: 'player',
      vfx: playerTookDmg || compLost > 0 ? 'heavy' : 'shield',
      floatingText: eFloat,
      floatingColor: eColor,
      screenShake: playerTookDmg || compLost > 0 || barLost > 0,
      caption: enemyLogs.map((l) => l.summary).join(' · '),
    });
  }

  return beats;
}
