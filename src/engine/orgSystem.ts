import type {
  AttributeId,
  BaseSupplies,
  Campaign,
  FactionTreaty,
  NpcRecord,
  OrganizationArchetype,
  OrganizationState,
  OrgDivisionId,
  OrgOperation,
  OrgOperationDifficulty,
  OrgOperationKind,
  OrgOperationOutcomeGrade,
  OrgOutpostSpecialty,
  OrgRank,
  OrgRecruitCandidate,
  SupplyType,
  VehicleRecord,
  WorldThemeId,
} from '../types/game';
import { getAttributeModifier } from './rpgSystem';

export function getOrgRailLabelForTheme(theme: WorldThemeId): string {
  switch (theme) {
    case 'fantasy':
      return 'Guilda & Grupo';
    case 'cyberpunk':
      return 'Sindicato & Célula';
    case 'mystery':
      return 'Agência & Rede';
    case 'zombies':
      return 'Facção & Esquadrão';
    case 'apocalyptic':
      return 'Clã & Comboio';
    default:
      return 'Facção & Guilda';
  }
}

export function getDefaultArchetypeForTheme(
  theme: WorldThemeId,
): OrganizationArchetype {
  switch (theme) {
    case 'fantasy':
      return 'guild';
    case 'cyberpunk':
      return 'syndicate';
    case 'mystery':
      return 'syndicate';
    case 'zombies':
      return 'community';
    case 'apocalyptic':
      return 'caravan';
    default:
      return 'mercenary';
  }
}

export const ORG_ARCHETYPE_META: Record<
  OrganizationArchetype,
  {
    label: string;
    short: string;
    tagline: string;
    bonusLabel: string;
    color: string;
  }
> = {
  mercenary: {
    label: 'Companhia Mercenária',
    short: 'Mercenários',
    tagline: 'Contratos pagos, disciplina tática e poder de fogo sob demanda.',
    bonusLabel: '+25% pagamento em contratos · +2 bônus em Raids/Escoltas',
    color: '#f59e0b',
  },
  community: {
    label: 'Comunidade de Sobreviventes',
    short: 'Comunidade',
    tagline: 'Cooperação mútua, autossuficiência e proteção de civis e aliados.',
    bonusLabel: '-25% consumo de comida · +10 Moral inicial · Cura mais rápida',
    color: '#4ade80',
  },
  guild: {
    label: 'Guilda de Aventureiros',
    short: 'Guilda',
    tagline: 'Expedições, exploração de dungeons, descobertas e contratos de renome.',
    bonusLabel: '+30% Renome em missões · +2 bônus em Coleta/Exploração',
    color: '#a78bfa',
  },
  syndicate: {
    label: 'Sindicato / Rede Clandestina',
    short: 'Sindicato',
    tagline: 'Informação, operações silenciosas, tráfico de influência e sombras.',
    bonusLabel: '-35% ganho de Notoriedade (Heat) · +2 bônus em Espionagem',
    color: '#38bdf8',
  },
  militia: {
    label: 'Força Tática / Milícia',
    short: 'Milícia',
    tagline: 'Defesa territorial rígida, patrulha armada e controle de rotas.',
    bonusLabel: '+12 Defesa da Base · Guarnições de Postos valem o dobro',
    color: '#f87171',
  },
  caravan: {
    label: 'Comboio & Rota Mercante',
    short: 'Comboio',
    tagline: 'Mobilidade, logística veicular, comércio regional e abastecimento.',
    bonusLabel: 'Veículos aceleram operações em 45% · +20% renda de rotas',
    color: '#fb923c',
  },
};

export const ORG_DIVISION_META: Record<
  OrgDivisionId,
  {
    label: string;
    short: string;
    primaryAttr: AttributeId;
    secondaryAttr: AttributeId;
    color: string;
    effectHint: string;
  }
> = {
  security: {
    label: 'Vanguarda & Segurança',
    short: 'Segurança',
    primaryAttr: 'str',
    secondaryAttr: 'con',
    color: '#f87171',
    effectHint: 'Aumenta Defesa da Base e fortalece escoltas/raids.',
  },
  intel: {
    label: 'Inteligência & Recon',
    short: 'Intel',
    primaryAttr: 'wis',
    secondaryAttr: 'int',
    color: '#38bdf8',
    effectHint: 'Reduz Heat diário e eleva sucesso em reconhecimento.',
  },
  logistics: {
    label: 'Logística & Oficina',
    short: 'Logística',
    primaryAttr: 'int',
    secondaryAttr: 'dex',
    color: '#fb923c',
    effectHint: 'Produz Materiais e Combustível diariamente na base.',
  },
  medical: {
    label: 'Enfermaria & Suporte',
    short: 'Enfermaria',
    primaryAttr: 'wis',
    secondaryAttr: 'int',
    color: '#f472b6',
    effectHint: 'Acelera recuperação de feridos e produz Remédios.',
  },
  diplomacy: {
    label: 'Diplomacia & Mercado',
    short: 'Diplomacia',
    primaryAttr: 'cha',
    secondaryAttr: 'wis',
    color: '#fbbf24',
    effectHint: 'Gera renda diária e melhora tratados com facções.',
  },
  reserve: {
    label: 'Reserva / Sem Alocação',
    short: 'Reserva',
    primaryAttr: 'con',
    secondaryAttr: 'wis',
    color: '#94a3b8',
    effectHint: 'Descansa na base mantendo disponibilidade imediata.',
  },
};

export const ORG_RANK_LABELS: Record<OrgRank, string> = {
  leader: 'Líder',
  lieutenant: 'Tenente',
  specialist: 'Especialista',
  member: 'Membro',
  hired_merc: 'Mercenário',
};

export const ORG_POLICY_META = {
  rations: {
    generous: {
      label: 'Generosas',
      hint: '+4 Moral/dia · +40% consumo de Comida',
    },
    standard: {
      label: 'Padrão',
      hint: 'Equilíbrio normal entre Moral e estoque',
    },
    strict: {
      label: 'Racionadas',
      hint: '-35% consumo de Comida · -5 Moral/dia',
    },
  },
  conduct: {
    merciful: {
      label: 'Misericordiosa',
      hint: 'Reduz Heat (-2/dia) e agrada aliados empáticos',
    },
    pragmatic: {
      label: 'Pragmática',
      hint: 'Equilibrada: foco em resultados sem excessos',
    },
    ruthless: {
      label: 'Implacável',
      hint: '+2 bônus em Raids/Contratos · +Heat e atrito com empáticos',
    },
  },
  recruitment: {
    open: {
      label: 'Portas Abertas',
      hint: 'Contratação 25% mais barata · maior chance de traços difíceis',
    },
    selective: {
      label: 'Seletiva',
      hint: 'Candidatos equilibrados e maior lealdade',
    },
    contract: {
      label: 'Contrato Mercenário',
      hint: 'Foco em especialistas pagos sob demanda',
    },
  },
} as const;

export const ORG_OPERATION_KIND_META: Record<
  OrgOperationKind,
  { label: string; color: string; short: string }
> = {
  scavenge: { label: 'Coleta & Suprimentos', color: '#4ade80', short: 'Coleta' },
  recon: { label: 'Reconhecimento & Espionagem', color: '#38bdf8', short: 'Recon' },
  contract: { label: 'Contrato Mercenário', color: '#fbbf24', short: 'Contrato' },
  escort: { label: 'Escolta & Comboio', color: '#fb923c', short: 'Escolta' },
  raid: { label: 'Incursão Tática / Raid', color: '#f87171', short: 'Raid' },
  diplomacy: { label: 'Missão Diplomática', color: '#c084fc', short: 'Diplomacia' },
  rescue: { label: 'Resgate de Emergência', color: '#f43f5e', short: 'Resgate' },
};

export const ORG_OUTPOST_SPECIALTY_META: Record<
  OrgOutpostSpecialty,
  {
    label: string;
    yieldLabel: string;
    baseYield: number;
    claimCostMaterials: number;
    claimCostCurrency: number;
    color: string;
  }
> = {
  food: {
    label: 'Produção de Alimentos',
    yieldLabel: 'Comida / dia',
    baseYield: 2,
    claimCostMaterials: 3,
    claimCostCurrency: 150,
    color: '#4ade80',
  },
  fuel: {
    label: 'Ponto de Combustível',
    yieldLabel: 'Combustível / dia',
    baseYield: 2,
    claimCostMaterials: 3,
    claimCostCurrency: 180,
    color: '#fb923c',
  },
  materials: {
    label: 'Oficina / Estoque de Peças',
    yieldLabel: 'Materiais / dia',
    baseYield: 2,
    claimCostMaterials: 2,
    claimCostCurrency: 150,
    color: '#a3e635',
  },
  meds: {
    label: 'Posto Médico / Farmácia',
    yieldLabel: 'Remédios / dia',
    baseYield: 1,
    claimCostMaterials: 3,
    claimCostCurrency: 220,
    color: '#f472b6',
  },
  intel: {
    label: 'Posto de Vigília & Intel',
    yieldLabel: '-Heat & +Defesa / dia',
    baseYield: 4,
    claimCostMaterials: 2,
    claimCostCurrency: 140,
    color: '#38bdf8',
  },
  income: {
    label: 'Ponto Comercial / Coleta',
    yieldLabel: 'Renda / dia',
    baseYield: 180,
    claimCostMaterials: 2,
    claimCostCurrency: 200,
    color: '#fbbf24',
  },
};

export const FACTION_TREATY_META: Record<
  FactionTreaty,
  { label: string; color: string; hint: string }
> = {
  none: {
    label: 'Sem Tratado',
    color: '#94a3b8',
    hint: 'Relações informais sem acordo assinado.',
  },
  non_aggression: {
    label: 'Não-Agressão',
    color: '#38bdf8',
    hint: 'Reduz risco de emboscada nas operações próximas.',
  },
  trade_pact: {
    label: 'Pacto Comercial',
    color: '#fbbf24',
    hint: 'Gera renda passiva diária e descontos em recursos.',
  },
  alliance: {
    label: 'Aliança Estratégica',
    color: '#4ade80',
    hint: '+15% sucesso em operações na região e reforço defensivo.',
  },
  war: {
    label: 'Guerra Aberta',
    color: '#f87171',
    hint: 'Confronto ativo: alto risco de retaliação e aumento de Heat.',
  },
};

const TIER_THRESHOLDS = [0, 100, 260, 480, 780, 1150, 1600, 2150, 2800, 3600];

export function computeOrgTierFromRenown(renown: number): {
  tier: number;
  nextThreshold: number;
  progressPct: number;
} {
  let tier = 1;
  for (let i = 0; i < TIER_THRESHOLDS.length; i++) {
    if (renown >= TIER_THRESHOLDS[i]) {
      tier = i + 1;
    }
  }
  const currentFloor = TIER_THRESHOLDS[tier - 1] ?? 0;
  const nextThreshold = TIER_THRESHOLDS[tier] ?? currentFloor + 1000;
  const span = Math.max(1, nextThreshold - currentFloor);
  const progressPct =
    tier >= 10
      ? 100
      : Math.max(0, Math.min(100, Math.round(((renown - currentFloor) / span) * 100)));
  return { tier, nextThreshold, progressPct };
}

export function getOrgMembers(npcs: NpcRecord[]): NpcRecord[] {
  return npcs.filter((n) => n.orgMember && n.status !== 'dead');
}

export function getMemberDuty(npc: NpcRecord): NonNullable<NpcRecord['orgDuty']> {
  if (npc.orgDuty === 'captured') return 'captured';
  if (npc.orgDuty === 'on_mission') return 'on_mission';
  if (npc.orgDuty === 'injured' || (npc.recoveryHoursLeft ?? 0) > 0) return 'injured';
  if (npc.inParty) return 'in_party';
  return 'available';
}

export interface DivisionSummary {
  byDivision: Record<
    OrgDivisionId,
    { members: NpcRecord[]; power: number; level: number }
  >;
  defenseBonus: number;
  dailyYieldSupplies: Partial<BaseSupplies>;
  dailyYieldCurrency: number;
  dailyHeatCooling: number;
  dailyFoodConsumption: number;
  dailyWagesTotal: number;
  healingRateHoursPerDay: number;
}

export function computeDivisionSummary(
  org: OrganizationState,
  npcs: NpcRecord[],
  factions: Campaign['codex']['factions'] = [],
): DivisionSummary {
  const members = getOrgMembers(npcs);
  const byDivision: DivisionSummary['byDivision'] = {
    security: { members: [], power: 0, level: 0 },
    intel: { members: [], power: 0, level: 0 },
    logistics: { members: [], power: 0, level: 0 },
    medical: { members: [], power: 0, level: 0 },
    diplomacy: { members: [], power: 0, level: 0 },
    reserve: { members: [], power: 0, level: 0 },
  };

  for (const m of members) {
    const duty = getMemberDuty(m);
    const div: OrgDivisionId = m.orgDivision ?? 'reserve';
    byDivision[div].members.push(m);
    // Captured or injured members don't produce passive division power
    if (duty === 'captured' || duty === 'injured') continue;
    const meta = ORG_DIVISION_META[div];
    const attrs = m.attributes ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    const attrScore =
      Math.max(1, 2 + getAttributeModifier(attrs[meta.primaryAttr])) +
      Math.max(0, getAttributeModifier(attrs[meta.secondaryAttr]));
    const levelFactor = Math.max(1, Math.floor((m.level ?? 1) / 3) + 1);
    const activityMult = duty === 'on_mission' ? 0.5 : 1;
    byDivision[div].power += Math.round((attrScore + levelFactor) * activityMult);
  }

  for (const key of Object.keys(byDivision) as OrgDivisionId[]) {
    byDivision[key].level =
      byDivision[key].power <= 0
        ? 0
        : Math.min(5, Math.max(1, Math.ceil(byDivision[key].power / 5)));
  }

  const militiaMult = org.archetype === 'militia' ? 2 : 1;
  const outpostDefense = org.outposts.reduce(
    (sum, o) => sum + (o.defenseBonus + o.garrisonNpcIds.length * 4) * militiaMult,
    0,
  );
  const defenseBonus =
    byDivision.security.power * 2 +
    (org.archetype === 'militia' ? 12 : 0) +
    outpostDefense;

  const dailyYieldSupplies: Partial<BaseSupplies> = {
    food: 0,
    fuel: 0,
    materials: 0,
    meds: 0,
    ammo: 0,
  };
  let dailyYieldCurrency = 0;
  let dailyHeatCooling = 3 + byDivision.intel.level * 2;

  if (byDivision.logistics.level > 0) {
    dailyYieldSupplies.materials =
      (dailyYieldSupplies.materials ?? 0) + byDivision.logistics.level;
    if (byDivision.logistics.level >= 2) {
      dailyYieldSupplies.fuel =
        (dailyYieldSupplies.fuel ?? 0) + Math.floor(byDivision.logistics.level / 2);
    }
  }
  if (byDivision.medical.level > 0) {
    dailyYieldSupplies.meds =
      (dailyYieldSupplies.meds ?? 0) + Math.max(1, Math.floor(byDivision.medical.level / 2));
  }
  if (byDivision.security.level >= 2) {
    dailyYieldSupplies.ammo =
      (dailyYieldSupplies.ammo ?? 0) + Math.floor(byDivision.security.level / 2);
  }
  if (byDivision.diplomacy.level > 0) {
    dailyYieldCurrency += byDivision.diplomacy.level * 95;
  }

  // Outposts passive yields
  for (const op of org.outposts) {
    const garrisonBoost = 1 + op.garrisonNpcIds.length * 0.4;
    const yieldVal = Math.max(1, Math.round(op.dailyYield * garrisonBoost));
    if (op.specialty === 'income') {
      dailyYieldCurrency += yieldVal;
    } else if (op.specialty === 'intel') {
      dailyHeatCooling += yieldVal;
    } else {
      const sKey = op.specialty as SupplyType;
      dailyYieldSupplies[sKey] = (dailyYieldSupplies[sKey] ?? 0) + yieldVal;
    }
  }

  // Trade pact passive income
  const tradePacts = factions.filter((f) => f.treaty === 'trade_pact').length;
  dailyYieldCurrency += tradePacts * 140;
  if (org.archetype === 'caravan') {
    dailyYieldCurrency = Math.round(dailyYieldCurrency * 1.2);
  }

  if (org.policies.conduct === 'merciful') {
    dailyHeatCooling += 2;
  }

  // Daily food consumption & wages
  const activeMouths = Math.max(1, members.filter((m) => getMemberDuty(m) !== 'captured').length);
  const rationMult =
    org.policies.rations === 'generous'
      ? 1.4
      : org.policies.rations === 'strict'
        ? 0.65
        : 1;
  const communityMult = org.archetype === 'community' ? 0.75 : 1;
  const dailyFoodConsumption = Math.max(
    1,
    Math.round(activeMouths * 0.6 * rationMult * communityMult),
  );
  const dailyWagesTotal = members.reduce(
    (sum, m) => sum + (getMemberDuty(m) === 'captured' ? 0 : Math.max(0, m.dailyWage ?? 0)),
    0,
  );

  const healingRateHoursPerDay =
    12 +
    byDivision.medical.level * 8 +
    (org.archetype === 'community' ? 6 : 0);

  return {
    byDivision,
    defenseBonus,
    dailyYieldSupplies,
    dailyYieldCurrency,
    dailyHeatCooling,
    dailyFoodConsumption,
    dailyWagesTotal,
    healingRateHoursPerDay,
  };
}

export interface RosterChemistryReport {
  synergies: string[];
  tensions: string[];
  moraleModifier: number;
}

export function evaluateRosterChemistry(
  org: OrganizationState,
  npcs: NpcRecord[],
): RosterChemistryReport {
  const members = getOrgMembers(npcs);
  const synergies: string[] = [];
  const tensions: string[] = [];
  let moraleModifier = 0;

  if (members.length === 0) {
    return { synergies, tensions, moraleModifier };
  }

  const hasPartnerOrClose = members.filter(
    (m) =>
      m.relationship === 'partner' ||
      m.relationship === 'romance' ||
      m.relationship === 'close' ||
      (m.affinity ?? 0) >= 55,
  );
  if (hasPartnerOrClose.length >= 1) {
    synergies.push(
      `Núcleo Leal (${hasPartnerOrClose.map((m) => m.name).slice(0, 3).join(', ')}): eleva coesão da equipe (+4 Moral).`,
    );
    moraleModifier += 4;
  }

  const coveredDivs = new Set(
    members.map((m) => m.orgDivision ?? 'reserve').filter((d) => d !== 'reserve'),
  );
  if (coveredDivs.size >= 3) {
    synergies.push(
      `Operação Multidisciplinar (${coveredDivs.size} divisões ativas): sinergia logística (+3 Moral).`,
    );
    moraleModifier += 3;
  }

  // Policy vs Personality/Traits friction (State of Decay 2 / RimWorld DNA)
  for (const m of members) {
    const profileText = `${m.personality ?? ''} ${(m.traits ?? []).join(' ')} ${(m.likes ?? []).join(' ')} ${(m.dislikes ?? []).join(' ')}`.toLowerCase();
    if (
      org.policies.conduct === 'ruthless' &&
      /(protetor|emp[aá]tic|just|bondos|honest|compass|leal|cuidado)/.test(profileText)
    ) {
      tensions.push(
        `${m.name} demonstra desconforto com a doutrina Implacável (-3 Moral).`,
      );
      moraleModifier -= 3;
    }
    if (
      org.policies.rations === 'strict' &&
      (m.orgRank === 'hired_merc' || /(impuls|orgulh|gan[aâ]nc|exigente)/.test(profileText))
    ) {
      tensions.push(
        `${m.name} reclama das rações racionadas (-2 Moral).`,
      );
      moraleModifier -= 2;
    }
    if (m.hiddenFlaw && getMemberDuty(m) !== 'captured') {
      tensions.push(`${m.name} — Atenção ao traço: ${m.hiddenFlaw}.`);
    }
  }

  if (org.heat >= 70) {
    tensions.push(
      `Notoriedade Crítica (Heat ${org.heat}%): facções rivais e autoridades estão fechando o cerco (-4 Moral).`,
    );
    moraleModifier -= 4;
  }

  return {
    synergies: synergies.slice(0, 4),
    tensions: tensions.slice(0, 4),
    moraleModifier,
  };
}

const OP_DIFFICULTY_DC: Record<OrgOperationDifficulty, number> = {
  low: 10,
  medium: 13,
  high: 16,
  extreme: 19,
};

export interface OperationEstimate {
  dc: number;
  squadBonus: number;
  chancePct: number;
  ratingLabel: string;
  ratingColor: string;
  effectiveHours: number;
  effectiveTurns: number;
  notes: string[];
}

export function estimateOperationSuccess(
  op: OrgOperation,
  org: OrganizationState,
  squadNpcs: NpcRecord[],
  vehicle?: VehicleRecord | null,
  factions: Campaign['codex']['factions'] = [],
): OperationEstimate {
  const dc = OP_DIFFICULTY_DC[op.difficulty] ?? 13;
  const notes: string[] = [];

  if (squadNpcs.length === 0) {
    return {
      dc,
      squadBonus: 0,
      chancePct: 0,
      ratingLabel: 'Selecione um Esquadrão',
      ratingColor: '#94a3b8',
      effectiveHours: op.durationHours,
      effectiveTurns: op.durationTurns,
      notes: ['Escolha de 1 a 3 membros disponíveis para calcular as chances.'],
    };
  }

  const targetAttrs: AttributeId[] =
    op.recommendedAttributes.length > 0 ? op.recommendedAttributes : ['wis', 'dex'];

  let totalAttrScore = 0;
  for (const m of squadNpcs) {
    const attrs = m.attributes ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    const bestMod = Math.max(
      ...targetAttrs.map((a) => getAttributeModifier(attrs[a])),
    );
    const levelBonus = Math.floor((m.level ?? 1) / 4);
    totalAttrScore += Math.max(0, bestMod + 1) + levelBonus;
  }

  // Teamwork bonus for 2-3 operatives
  const teamworkBonus = squadNpcs.length >= 3 ? 3 : squadNpcs.length === 2 ? 2 : 0;
  let squadBonus = totalAttrScore + teamworkBonus;

  // Archetype synergy
  if (
    org.archetype === 'mercenary' &&
    (op.kind === 'contract' || op.kind === 'raid' || op.kind === 'escort')
  ) {
    squadBonus += 2;
    notes.push('+2 Companhia Mercenária');
  } else if (org.archetype === 'syndicate' && op.kind === 'recon') {
    squadBonus += 2;
    notes.push('+2 Rede Clandestina');
  } else if (org.archetype === 'guild' && op.kind === 'scavenge') {
    squadBonus += 2;
    notes.push('+2 Guilda de Exploração');
  }

  // Conduct policy bonus
  if (org.policies.conduct === 'ruthless' && (op.kind === 'raid' || op.kind === 'contract')) {
    squadBonus += 2;
    notes.push('+2 Doutrina Implacável');
  }

  // Morale modifier
  if (org.morale >= 75) {
    squadBonus += 1;
    notes.push('+1 Moral Alta');
  } else if (org.morale <= 30) {
    squadBonus -= 2;
    notes.push('-2 Moral Baixa');
  }

  // Vehicle bonus (faster + safer extraction)
  let speedFactor = 1;
  if (vehicle) {
    if (vehicle.fuel >= 15 && vehicle.condition >= 25) {
      squadBonus += 1;
      speedFactor = org.archetype === 'caravan' ? 0.55 : 0.65;
      notes.push(`+1 & mais rápido (${vehicle.name})`);
    } else {
      notes.push(`⚠ ${vehicle.name} com pouco combustível/condição`);
    }
  }

  // Alliance bonus
  const hasAlliance =
    op.targetFactionName &&
    factions.some(
      (f) =>
        f.name.toLowerCase() === op.targetFactionName?.toLowerCase() &&
        f.treaty === 'alliance',
    );
  if (hasAlliance) {
    squadBonus += 3;
    notes.push('+3 Aliança na região');
  }

  // Probability of rolling d20 + squadBonus >= dc
  const needed = dc - squadBonus;
  const rawProb = ((21 - needed) / 20) * 100;
  const chancePct = Math.max(10, Math.min(95, Math.round(rawProb)));

  const ratingLabel =
    chancePct >= 80
      ? 'Excelente'
      : chancePct >= 62
        ? 'Favorável'
        : chancePct >= 42
          ? 'Arriscado'
          : 'Alto Risco';
  const ratingColor =
    chancePct >= 80
      ? '#4ade80'
      : chancePct >= 62
        ? '#a3e635'
        : chancePct >= 42
          ? '#fbbf24'
          : '#f87171';

  return {
    dc,
    squadBonus,
    chancePct,
    ratingLabel,
    ratingColor,
    effectiveHours: Math.max(1, Math.round(op.durationHours * speedFactor)),
    effectiveTurns: Math.max(1, Math.round(op.durationTurns * speedFactor)),
    notes,
  };
}

export interface DeterministicOperationResolution {
  grade: OrgOperationOutcomeGrade;
  roll: number;
  total: number;
  dc: number;
  rollSummary: string;
  currencyDelta: number;
  supplyDeltas: Partial<BaseSupplies>;
  renownGain: number;
  moraleDelta: number;
  heatDelta: number;
  injuredNpcId?: string;
  injuryNote?: string;
  capturedNpcId?: string;
  rescuedNpcId?: string;
  spawnRescueOp?: OrgOperation;
}

export function resolveOperationDeterministically(
  op: OrgOperation,
  org: OrganizationState,
  squadNpcs: NpcRecord[],
  vehicle?: VehicleRecord | null,
  factions: Campaign['codex']['factions'] = [],
): DeterministicOperationResolution {
  const est = estimateOperationSuccess(op, org, squadNpcs, vehicle, factions);
  const roll = Math.floor(Math.random() * 20) + 1;
  const total = roll + est.squadBonus;

  let grade: OrgOperationOutcomeGrade;
  if (roll === 20 || total >= est.dc + 5) {
    grade = 'critical';
  } else if (roll !== 1 && total >= est.dc) {
    grade = 'success';
  } else if (roll !== 1 && total >= est.dc - 4) {
    grade = 'partial';
  } else {
    grade = 'disaster';
  }

  const mercPayMult =
    org.archetype === 'mercenary' && (op.kind === 'contract' || op.kind === 'escort')
      ? 1.25
      : 1;
  const guildRenownMult = org.archetype === 'guild' ? 1.3 : 1;
  const syndicateHeatMult = org.archetype === 'syndicate' ? 0.65 : 1;

  const rewardMult =
    grade === 'critical'
      ? 1.4
      : grade === 'success'
        ? 1
        : grade === 'partial'
          ? 0.55
          : 0;

  const currencyDelta = Math.round(
    (op.rewardCurrency ?? 0) * mercPayMult * rewardMult,
  );
  const supplyDeltas: Partial<BaseSupplies> = {};
  if (op.rewardSupplies && rewardMult > 0) {
    for (const [k, v] of Object.entries(op.rewardSupplies)) {
      if (typeof v === 'number' && v > 0) {
        supplyDeltas[k as SupplyType] = Math.max(1, Math.round(v * rewardMult));
      }
    }
  }

  const baseRenown = op.rewardRenown ?? 28;
  const renownGain =
    grade === 'disaster'
      ? 4
      : Math.round(baseRenown * guildRenownMult * (grade === 'critical' ? 1.4 : grade === 'success' ? 1 : 0.5));

  const moraleDelta =
    grade === 'critical' ? 8 : grade === 'success' ? 4 : grade === 'partial' ? -2 : -10;

  const rawHeat =
    grade === 'critical'
      ? Math.max(0, op.heatGain - 4)
      : grade === 'disaster'
        ? op.heatGain + 10
        : op.heatGain;
  const heatDelta =
    op.kind === 'recon' && (grade === 'critical' || grade === 'success')
      ? -Math.max(4, Math.abs(op.heatGain))
      : Math.round(rawHeat * syndicateHeatMult);

  let injuredNpcId: string | undefined;
  let injuryNote: string | undefined;
  let capturedNpcId: string | undefined;
  let spawnRescueOp: OrgOperation | undefined;

  if (squadNpcs.length > 0 && (grade === 'partial' || grade === 'disaster')) {
    const unlucky = squadNpcs[Math.floor(Math.random() * squadNpcs.length)];
    if (grade === 'partial' && (op.difficulty === 'high' || op.difficulty === 'extreme')) {
      injuredNpcId = unlucky.id;
      injuryNote = `Ferimento leve em ${op.targetLocationName}`;
    } else if (grade === 'disaster') {
      if (op.kind !== 'rescue' && (op.difficulty === 'high' || op.difficulty === 'extreme')) {
        capturedNpcId = unlucky.id;
        spawnRescueOp = {
          id: `op_rescue_${Date.now()}`,
          title: `Resgate Urgente: ${unlucky.name}`,
          kind: 'rescue',
          briefing: `${unlucky.name} foi interceptado(a) e mantido(a) refém em ${op.targetLocationName} após a falha da operação "${op.title}". Monte um esquadrão de extração ou assuma pessoalmente no chat!`,
          targetLocationName: op.targetLocationName,
          targetFactionName: op.targetFactionName,
          difficulty: 'high',
          recommendedAttributes: ['dex', 'str', 'wis'],
          durationHours: 3,
          durationTurns: 2,
          rewardSummary: `Liberta ${unlucky.name} · +45 Renome · +12 Moral`,
          rewardRenown: 45,
          heatGain: 12,
          status: 'available',
          captiveNpcId: unlucky.id,
        };
      } else {
        injuredNpcId = unlucky.id;
        injuryNote = `Ferimento moderado durante retirada de ${op.targetLocationName}`;
      }
    }
  }

  const rescuedNpcId =
    op.kind === 'rescue' && (grade === 'critical' || grade === 'success' || grade === 'partial')
      ? op.captiveNpcId
      : undefined;

  const gradePt: Record<OrgOperationOutcomeGrade, string> = {
    critical: 'Sucesso Crítico',
    success: 'Sucesso',
    partial: 'Sucesso Parcial',
    disaster: 'Falha Crítica',
  };

  return {
    grade,
    roll,
    total,
    dc: est.dc,
    rollSummary: `d20 (${roll}) + ${est.squadBonus} = ${total} vs DC ${est.dc} · ${gradePt[grade]}`,
    currencyDelta,
    supplyDeltas,
    renownGain,
    moraleDelta,
    heatDelta,
    injuredNpcId,
    injuryNote,
    capturedNpcId,
    rescuedNpcId,
    spawnRescueOp,
  };
}

export function advanceOrgOperations(
  org: OrganizationState,
  elapsedHours: number,
  elapsedTurns: number,
): { nextOrg: OrganizationState; newlyReadyTitles: string[] } {
  const newlyReadyTitles: string[] = [];
  let changed = false;

  const nextOps = org.operations.map((op) => {
    if (op.status !== 'active') return op;
    const nextHours = Math.max(0, (op.hoursRemaining ?? op.durationHours) - elapsedHours);
    const nextTurns = Math.max(0, (op.turnsRemaining ?? op.durationTurns) - elapsedTurns);
    changed = true;
    if (nextHours <= 0 || nextTurns <= 0) {
      newlyReadyTitles.push(op.title);
      return {
        ...op,
        hoursRemaining: 0,
        turnsRemaining: 0,
        status: 'ready_to_claim' as const,
      };
    }
    return {
      ...op,
      hoursRemaining: Number(nextHours.toFixed(1)),
      turnsRemaining: nextTurns,
    };
  });

  if (!changed) return { nextOrg: org, newlyReadyTitles };
  return {
    nextOrg: { ...org, operations: nextOps },
    newlyReadyTitles,
  };
}

export interface DailyUpkeepResult {
  nextOrg: OrganizationState;
  nextNpcs: NpcRecord[];
  nextSupplies: BaseSupplies;
  nextCurrencyAmount: number;
  summaryText: string;
  shortageWarning?: string;
}

export function processDailyOrgUpkeep(
  org: OrganizationState,
  npcs: NpcRecord[],
  supplies: BaseSupplies,
  currencyAmount: number,
  factions: Campaign['codex']['factions'],
  newDay: number,
  currentTurn: number,
): DailyUpkeepResult {
  const summary = computeDivisionSummary(org, npcs, factions);
  const chemistry = evaluateRosterChemistry(org, npcs);

  const nextSupplies: BaseSupplies = { ...supplies };
  for (const [k, v] of Object.entries(summary.dailyYieldSupplies)) {
    if (typeof v === 'number' && v > 0) {
      nextSupplies[k as SupplyType] = (nextSupplies[k as SupplyType] ?? 0) + v;
    }
  }

  let moraleDelta = 0;
  const warnings: string[] = [];

  // Rations policy moral effect
  if (org.policies.rations === 'generous') moraleDelta += 4;
  else if (org.policies.rations === 'strict') moraleDelta -= 5;

  // Consume Food
  if (nextSupplies.food >= summary.dailyFoodConsumption) {
    nextSupplies.food -= summary.dailyFoodConsumption;
    moraleDelta += 2;
  } else {
    nextSupplies.food = 0;
    moraleDelta -= 12;
    warnings.push('Faltou comida na base!');
  }

  // Income vs Mercenary Wages
  let nextCurrencyAmount = currencyAmount + summary.dailyYieldCurrency;
  if (summary.dailyWagesTotal > 0) {
    if (nextCurrencyAmount >= summary.dailyWagesTotal) {
      nextCurrencyAmount -= summary.dailyWagesTotal;
    } else {
      nextCurrencyAmount = 0;
      moraleDelta -= 15;
      warnings.push('Salário de mercenários atrasado!');
    }
  }

  // Chemistry nudge (clamped gently per day)
  moraleDelta += Math.max(-5, Math.min(5, Math.round(chemistry.moraleModifier / 2)));

  // Heal injured org members using infirmary rate
  const healedNames: string[] = [];
  const nextNpcs = npcs.map((n) => {
    if (!n.orgMember || getMemberDuty(n) !== 'injured') return n;
    const rem = Math.max(0, (n.recoveryHoursLeft ?? 12) - summary.healingRateHoursPerDay);
    if (rem <= 0) {
      healedNames.push(n.name);
      return {
        ...n,
        orgDuty: n.inParty ? ('in_party' as const) : ('available' as const),
        recoveryHoursLeft: 0,
        injuryNote: undefined,
        vigor: n.maxVigor ?? 100,
      };
    }
    return {
      ...n,
      recoveryHoursLeft: rem,
    };
  });

  const nextMorale = Math.max(0, Math.min(100, org.morale + moraleDelta));
  const nextHeat = Math.max(0, Math.min(100, org.heat - summary.dailyHeatCooling));

  const parts: string[] = [
    `Dia ${newDay}: -${summary.dailyFoodConsumption} Comida`,
  ];
  if (summary.dailyWagesTotal > 0) parts.push(`-${summary.dailyWagesTotal} salários`);
  if (summary.dailyYieldCurrency > 0) parts.push(`+${summary.dailyYieldCurrency} renda`);
  if (healedNames.length > 0) parts.push(`Recuperados: ${healedNames.join(', ')}`);
  if (warnings.length > 0) parts.push(`⚠ ${warnings.join(' ')}`);

  const summaryText = parts.join(' · ');

  const nextOrg: OrganizationState = {
    ...org,
    morale: nextMorale,
    heat: nextHeat,
    lastUpkeepDay: newDay,
    historyLog: [
      {
        id: `org_upkeep_${Date.now()}`,
        day: newDay,
        turn: currentTurn,
        kind: 'upkeep' as const,
        text: summaryText,
      },
      ...org.historyLog,
    ].slice(0, 24),
  };

  return {
    nextOrg,
    nextNpcs,
    nextSupplies,
    nextCurrencyAmount,
    summaryText,
    shortageWarning: warnings.length > 0 ? warnings.join(' ') : undefined,
  };
}

export function createStarterOperationsForCampaign(
  campaign: Campaign,
): OrgOperation[] {
  const loc = campaign.currentLocation || 'Setor Central';
  const altLoc =
    campaign.codex.locations.find(
      (l) => l.name.toLowerCase() !== loc.toLowerCase(),
    )?.name ?? 'Distrito Comercial';
  const faction = campaign.codex.factions[0]?.name;
  const now = Date.now();
  const theme = campaign.world.primaryTheme;

  const isFantasy = theme === 'fantasy';

  return [
    {
      id: `op_seed_1_${now}`,
      title: isFantasy
        ? `Expedição de Abastecimento em ${altLoc}`
        : `Varredura Logística em ${altLoc}`,
      kind: 'scavenge',
      briefing: isFantasy
        ? `Enviar um esquadrão discreto para coletar provisões, ervas e materiais úteis nos arredores de ${altLoc}.`
        : `Despachar equipe rápida para comprar/recuperar suprimentos, peças e combustível em ${altLoc} sem chamar atenção.`,
      targetLocationName: altLoc,
      difficulty: 'low',
      recommendedAttributes: ['wis', 'dex'],
      durationHours: 3,
      durationTurns: 2,
      rewardSummary: '+3 Materiais · +2 Comida · +20 Renome',
      rewardSupplies: { materials: 3, food: 2 },
      rewardRenown: 20,
      heatGain: 4,
      status: 'available',
    },
    {
      id: `op_seed_2_${now}`,
      title: isFantasy
        ? `Escolta de Caravana pela Rota de ${loc}`
        : `Contrato de Segurança Privada em ${altLoc}`,
      kind: 'contract',
      briefing: isFantasy
        ? `Mercadores locais oferecem boa paga em moedas por proteção armada contra saqueadores na estrada.`
        : `Um contato local precisa de escolta discreta e transporte seguro entre ${loc} e ${altLoc}. Bom pagamento garantido.`,
      targetLocationName: altLoc,
      targetFactionName: faction,
      difficulty: 'medium',
      recommendedAttributes: ['str', 'con', 'wis'],
      durationHours: 5,
      durationTurns: 3,
      rewardSummary: '+450 recursos · +1 Munição · +35 Renome',
      rewardCurrency: 450,
      rewardSupplies: { ammo: 1 },
      rewardRenown: 35,
      heatGain: 10,
      status: 'available',
    },
    {
      id: `op_seed_3_${now}`,
      title: faction
        ? `Reconhecimento & Inteligência sobre ${faction}`
        : `Mapeamento Silencioso de Rotas em ${loc}`,
      kind: 'recon',
      briefing: faction
        ? `Observar movimentações e contatos ligados a ${faction}, reduzindo a pressão sobre nossa base e coletando informações.`
        : `Monitorar rádios, rotas secundárias e movimentos suspeitos na região para baixar nossa Notoriedade (Heat).`,
      targetLocationName: loc,
      targetFactionName: faction,
      difficulty: 'medium',
      recommendedAttributes: ['int', 'dex', 'wis'],
      durationHours: 4,
      durationTurns: 2,
      rewardSummary: '-12 Heat · +25 Renome · +Inteligência',
      rewardRenown: 25,
      heatGain: 12,
      status: 'available',
    },
  ];
}

export function createStarterRecruitsForCampaign(
  campaign: Campaign,
): OrgRecruitCandidate[] {
  const theme = campaign.world.primaryTheme;
  const now = Date.now();

  if (theme === 'fantasy') {
    return [
      {
        id: `rec_1_${now}`,
        name: 'Garrick Ferro-Frio',
        role: 'Veterano de Escudo',
        age: 34,
        height: '1,86 m',
        personality: 'Pragmático, disciplinado e leal a quem paga em dia.',
        pitch: 'Servi dez anos em companhias livres. Segure minha paga e nenhum saqueador cruza seu portão.',
        recommendedDivision: 'security',
        attributes: { str: 15, dex: 11, con: 14, int: 10, wis: 11, cha: 9 },
        skills: ['Espada & Escudo', 'Vigilância', 'Tática de Formação'],
        traits: ['Veterano', 'Disciplinado'],
        visibleFlaw: 'Exige pagamento pontual (odeia atrasos)',
        hireCost: 260,
        dailyWage: 35,
      },
      {
        id: `rec_2_${now}`,
        name: 'Lyra das Ervas',
        role: 'Boticária & Cirurgiã de Campo',
        age: 27,
        height: '1,66 m',
        personality: 'Calma sob pressão, empática e meticulosa.',
        pitch: 'Mantenho seus feridos de pé e preparo tônicos com metade dos insumos usuais.',
        recommendedDivision: 'medical',
        attributes: { str: 9, dex: 12, con: 11, int: 14, wis: 15, cha: 12 },
        skills: ['Medicina de Campo', 'Alquimia', 'Percepção'],
        traits: ['Empática', 'Mãos Firmes'],
        visibleFlaw: 'Recusa missões de crueldade gratuita',
        hireCost: 220,
        dailyWage: 25,
      },
      {
        id: `rec_3_${now}`,
        name: 'Vesper',
        role: 'Batedor & Arrombador',
        age: 24,
        height: '1,73 m',
        personality: 'Irônico, observador e rápido para desaparecer.',
        pitch: 'Sei entrar onde ninguém entra e sair antes que acendam as tochas.',
        recommendedDivision: 'intel',
        attributes: { str: 10, dex: 15, con: 11, int: 13, wis: 13, cha: 11 },
        skills: ['Furtividade', 'Arrombamento', 'Reconhecimento'],
        traits: ['Silencioso', 'Olho Clínico'],
        visibleFlaw: 'Desconfia de autoridade rígida',
        hireCost: 240,
        dailyWage: 30,
      },
    ];
  }

  return [
    {
      id: `rec_1_${now}`,
      name: 'Hector Alvarez',
      role: 'Mecânico Pesado & Logística',
      age: 38,
      height: '1,79 m',
      personality: 'Direto, confiável e obcecado por motores e geradores.',
      pitch: 'Se tiver oficina e ferramentas, mantenho sua frota rodando e transformo sucata em blindagem.',
      recommendedDivision: 'logistics',
      attributes: { str: 13, dex: 13, con: 13, int: 15, wis: 11, cha: 10 },
      skills: ['Mecânica Diesel', 'Serralheria', 'Elétrica de Base'],
      traits: ['Engenhoso', 'Firme'],
      visibleFlaw: 'Fica irritado quando desperdiçam combustível',
      hireCost: 320,
      dailyWage: 40,
    },
    {
      id: `rec_2_${now}`,
      name: 'Dra. Camila Duarte',
      role: 'Paramédica de Trauma',
      age: 31,
      height: '1,68 m',
      personality: 'Empática, serena e incansável em emergências.',
      pitch: 'Trabalhei sete anos em pronto-socorro. Se alguém voltar baleado ou ferido, eu salvo.',
      recommendedDivision: 'medical',
      attributes: { str: 9, dex: 12, con: 12, int: 14, wis: 15, cha: 13 },
      skills: ['Traumatologia', 'Triagem', 'Farmacologia'],
      traits: ['Protetora', 'Sangue-Frio'],
      visibleFlaw: 'Desaprova doutrina Implacável',
      hireCost: 280,
      dailyWage: 35,
    },
    {
      id: `rec_3_${now}`,
      name: 'Dante "Ghost" Mercer',
      role: 'Ex-Fuzileiro / Segurança Privada',
      age: 35,
      height: '1,88 m',
      personality: 'Frio, profissional e focado em perímetro e extração.',
      pitch: 'Faço escolta, treino sua guarda e lidero operações de risco — contrato claro, sem drama.',
      recommendedDivision: 'security',
      attributes: { str: 15, dex: 14, con: 14, int: 11, wis: 12, cha: 9 },
      skills: ['Tática Urbana', 'Armas Longas', 'Contra-Emboscada'],
      traits: ['Veterano', 'Disciplinado'],
      visibleFlaw: 'Cobra salário alto e sai se atrasar',
      hireCost: 420,
      dailyWage: 65,
    },
  ];
}
