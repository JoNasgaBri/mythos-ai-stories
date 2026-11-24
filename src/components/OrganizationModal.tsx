import {
  AlertTriangle,
  Car,
  CheckCircle2,
  Coins,
  Compass,
  Crown,
  Dices,
  Flag,
  Flame,
  Handshake,
  Heart,
  Loader2,
  MapPin,
  MessageSquare,
  Plus,
  RefreshCw,
  ScrollText,
  Send,
  Shield,
  Sparkles,
  Swords,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  computeDivisionSummary,
  computeOrgTierFromRenown,
  estimateOperationSuccess,
  evaluateRosterChemistry,
  FACTION_TREATY_META,
  getDefaultArchetypeForTheme,
  getMemberDuty,
  getOrgMembers,
  getOrgRailLabelForTheme,
  ORG_ARCHETYPE_META,
  ORG_DIVISION_META,
  ORG_OPERATION_KIND_META,
  ORG_OUTPOST_SPECIALTY_META,
  ORG_POLICY_META,
  ORG_RANK_LABELS,
} from '../engine/orgSystem';
import {
  ATTRIBUTE_META,
  defaultBaseSuppliesForTheme,
  getSupplyMetaForTheme,
} from '../engine/rpgSystem';
import type {
  Campaign,
  FactionRecord,
  FactionTreaty,
  LanguageId,
  LocationRecord,
  OrganizationArchetype,
  OrgDivisionId,
  OrgOperation,
  OrgOutpostSpecialty,
  OrgPolicies,
  OrgRecruitCandidate,
} from '../types/game';

interface OrganizationModalProps {
  open: boolean;
  campaign: Campaign;
  language: LanguageId;
  isBusy: boolean;
  isLoadingRecruits: boolean;
  isLoadingOps: boolean;
  resolvingOpId: string | null;
  lastReportBanner: {
    opTitle: string;
    grade: string;
    rollSummary: string;
    narrativeReport: string;
    squadQuote?: { speaker: string; text: string };
  } | null;
  onClearReportBanner: () => void;
  onClose: () => void;
  onFoundOrganization: (payload: {
    name: string;
    motto: string;
    archetype: OrganizationArchetype;
    founderNpcIds: string[];
  }) => void;
  onUpdatePolicies: (patch: Partial<OrgPolicies>) => void;
  onAssignDivision: (npcId: string, division: OrgDivisionId) => void;
  onInviteNpc: (npcId: string, division: OrgDivisionId) => void;
  onDismissMember: (npcId: string) => void;
  onRefreshRecruits: () => void;
  onHireCandidate: (candidate: OrgRecruitCandidate) => void;
  onRefreshOperations: () => void;
  onDispatchSquad: (
    opId: string,
    npcIds: string[],
    vehicleId?: string,
  ) => void;
  onResolveOperation: (opId: string) => void;
  onPlayOperationInChat: (op: OrgOperation) => void;
  onClaimOutpost: (loc: LocationRecord, specialty: OrgOutpostSpecialty) => void;
  onReleaseOutpost: (outpostId: string) => void;
  onSetFactionTreaty: (factionId: string, treaty: FactionTreaty) => void;
  onNegotiateFactionInChat: (faction: FactionRecord) => void;
}

type OrgTabId = 'overview' | 'roster' | 'operations' | 'outposts' | 'diplomacy';

const ALL_ARCHETYPES: OrganizationArchetype[] = [
  'mercenary',
  'community',
  'guild',
  'syndicate',
  'militia',
  'caravan',
];

const ALL_DIVISIONS: OrgDivisionId[] = [
  'security',
  'intel',
  'logistics',
  'medical',
  'diplomacy',
  'reserve',
];

const ALL_OUTPOST_SPECIALTIES: OrgOutpostSpecialty[] = [
  'food',
  'fuel',
  'materials',
  'meds',
  'intel',
  'income',
];

const DUTY_BADGE = {
  available: { label: 'Na Base', color: '#4ade80' },
  in_party: { label: 'Com Você', color: '#38bdf8' },
  on_mission: { label: 'Em Missão', color: '#fbbf24' },
  injured: { label: 'Ferido', color: '#f472b6' },
  captured: { label: 'Capturado!', color: '#f87171' },
} as const;

const DIFF_LABEL = {
  low: { label: 'Baixa', color: '#4ade80' },
  medium: { label: 'Média', color: '#fbbf24' },
  high: { label: 'Alta', color: '#fb923c' },
  extreme: { label: 'Extrema', color: '#f87171' },
} as const;

export function OrganizationModal({
  open,
  campaign,
  language,
  isBusy,
  isLoadingRecruits,
  isLoadingOps,
  resolvingOpId,
  lastReportBanner,
  onClearReportBanner,
  onClose,
  onFoundOrganization,
  onUpdatePolicies,
  onAssignDivision,
  onInviteNpc,
  onDismissMember,
  onRefreshRecruits,
  onHireCandidate,
  onRefreshOperations,
  onDispatchSquad,
  onResolveOperation,
  onPlayOperationInChat,
  onClaimOutpost,
  onReleaseOutpost,
  onSetFactionTreaty,
  onNegotiateFactionInChat,
}: OrganizationModalProps) {
  const org = campaign.organization;
  const currencyLabel = campaign.player.currency?.label ?? 'Ouro';
  const currencyAmount = campaign.player.currency?.amount ?? 0;
  const supplyMeta = getSupplyMetaForTheme(campaign.world.primaryTheme);
  const supplies =
    campaign.stronghold?.supplies ??
    defaultBaseSuppliesForTheme(campaign.world.primaryTheme);
  const vehicles = campaign.stronghold?.vehicles ?? [];

  // Founding wizard local state
  const defaultArch = getDefaultArchetypeForTheme(campaign.world.primaryTheme);
  const [draftName, setDraftName] = useState(
    `Vanguarda de ${campaign.currentLocation.split(',')[0] || campaign.world.title}`,
  );
  const [draftMotto, setDraftMotto] = useState('Unidos sob qualquer tempestade.');
  const [draftArchetype, setDraftArchetype] =
    useState<OrganizationArchetype>(defaultArch);
  const [founderIds, setFounderIds] = useState<string[]>(() =>
    campaign.codex.npcs
      .filter((n) => n.status === 'alive' && (n.inParty || n.stance === 'ally'))
      .slice(0, 4)
      .map((n) => n.id),
  );

  // Active dashboard state
  const [activeTab, setActiveTab] = useState<OrgTabId>('overview');
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);
  const [squadSelection, setSquadSelection] = useState<string[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [outpostSpecByLoc, setOutpostSpecByLoc] = useState<
    Record<string, OrgOutpostSpecialty>
  >({});

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const orgMembers = useMemo(
    () => getOrgMembers(campaign.codex.npcs),
    [campaign.codex.npcs],
  );

  const nonMemberAllies = useMemo(
    () =>
      campaign.codex.npcs.filter(
        (n) => !n.orgMember && n.status === 'alive' && n.stance !== 'hostile',
      ),
    [campaign.codex.npcs],
  );

  const divisionSummary = useMemo(
    () =>
      org
        ? computeDivisionSummary(org, campaign.codex.npcs, campaign.codex.factions)
        : null,
    [org, campaign.codex.npcs, campaign.codex.factions],
  );

  const chemistry = useMemo(
    () => (org ? evaluateRosterChemistry(org, campaign.codex.npcs) : null),
    [org, campaign.codex.npcs],
  );

  const tierInfo = useMemo(
    () => computeOrgTierFromRenown(org?.renown ?? 0),
    [org?.renown],
  );

  const dispatchableMembers = useMemo(
    () =>
      orgMembers.filter((m) => {
        const duty = getMemberDuty(m);
        return duty === 'available' || duty === 'in_party';
      }),
    [orgMembers],
  );

  const selectedOp = useMemo(
    () => org?.operations.find((o) => o.id === selectedOpId) ?? null,
    [org?.operations, selectedOpId],
  );

  const squadNpcs = useMemo(
    () => orgMembers.filter((m) => squadSelection.includes(m.id)),
    [orgMembers, squadSelection],
  );

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId],
  );

  const opEstimate = useMemo(() => {
    if (!org || !selectedOp) return null;
    return estimateOperationSuccess(
      selectedOp,
      org,
      squadNpcs,
      selectedVehicle,
      campaign.codex.factions,
    );
  }, [org, selectedOp, squadNpcs, selectedVehicle, campaign.codex.factions]);

  if (!open) return null;

  const readyOpsCount =
    org?.operations.filter((o) => o.status === 'ready_to_claim').length ?? 0;
  const activeOpsCount =
    org?.operations.filter((o) => o.status === 'active').length ?? 0;
  const capturedCount = orgMembers.filter(
    (m) => getMemberDuty(m) === 'captured',
  ).length;

  const toggleFounder = (id: string) => {
    setFounderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSquadMember = (id: string) => {
    setSquadSelection((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const claimedLocIds = new Set((org?.outposts ?? []).map((o) => o.locationId));

  return (
    <div
      className="animate-backdrop-in fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Comando da Organização"
    >
      <div
        className="animate-modal-spring flex h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-2xl sm:h-[90vh] sm:rounded-3xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/80 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]">
              <Crown className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-display text-sm font-semibold text-[var(--text-primary)] sm:text-base">
                {org
                  ? org.name
                  : `Fundar ${getOrgRailLabelForTheme(campaign.world.primaryTheme)}`}
              </h2>
              <p className="truncate text-[11px] text-[var(--text-muted)]">
                {org
                  ? `${ORG_ARCHETYPE_META[org.archetype].label} · Tier ${tierInfo.tier} · ${orgMembers.length} membros`
                  : 'Organize aliados, contrate mercenários, despache esquadrões e controle territórios'}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1 text-xs font-semibold text-[#fbbf24] sm:inline-flex">
              <Coins className="h-3.5 w-3.5" />
              <span>
                {currencyAmount.toLocaleString()} {currencyLabel}
              </span>
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar Organização"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* FOUNDING WIZARD (1-Screen Quick Setup when no org exists yet) */}
        {!org ? (
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
            <div className="mx-auto max-w-3xl space-y-5">
              <div className="rounded-2xl border border-[var(--accent)]/35 bg-[var(--accent-soft)]/35 p-4">
                <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                  Crie sua própria{' '}
                  <strong className="text-[var(--text-primary)]">
                    Guilda, Companhia Mercenária, Comunidade ou Sindicato
                  </strong>
                  . Recrute especialistas, aloque divisões na base, reivindique
                  postos avançados no Atlas e envie esquadrões autônomos em
                  operações paralelas enquanto vive sua história.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">
                    Nome da Organização
                  </span>
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="Ex.: Vanguarda de Redland, Companhia Cinza..."
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-[16px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] sm:text-sm"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">
                    Lema ou Doutrina
                  </span>
                  <input
                    type="text"
                    value={draftMotto}
                    onChange={(e) => setDraftMotto(e.target.value)}
                    placeholder="Ex.: Ninguém fica para trás."
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-[16px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] sm:text-sm"
                  />
                </label>
              </div>

              <div>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Escolha o Tipo / Arquétipo
                </span>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {ALL_ARCHETYPES.map((arch) => {
                    const meta = ORG_ARCHETYPE_META[arch];
                    const selected = draftArchetype === arch;
                    return (
                      <button
                        key={arch}
                        type="button"
                        onClick={() => setDraftArchetype(arch)}
                        className={`rounded-2xl border p-3.5 text-left transition ${
                          selected
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)]/60 shadow-md'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="font-display text-xs font-bold"
                            style={{ color: meta.color }}
                          >
                            {meta.label}
                          </span>
                          {selected ? (
                            <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                          ) : null}
                        </div>
                        <p className="mt-1 text-[11px] leading-snug text-[var(--text-secondary)]">
                          {meta.tagline}
                        </p>
                        <p className="mt-2 rounded-lg bg-[var(--bg-canvas)]/70 px-2 py-1 text-[10px] font-medium text-[var(--text-primary)]">
                          {meta.bonusLabel}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {campaign.codex.npcs.filter((n) => n.status === 'alive').length >
              0 ? (
                <div>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Membros Fundadores (Aliados Já Conhecidos)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {campaign.codex.npcs
                      .filter(
                        (n) => n.status === 'alive' && n.stance !== 'hostile',
                      )
                      .slice(0, 10)
                      .map((npc) => {
                        const checked = founderIds.includes(npc.id);
                        return (
                          <button
                            key={npc.id}
                            type="button"
                            onClick={() => toggleFounder(npc.id)}
                            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                              checked
                                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                                : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                            }`}
                          >
                            <span>{npc.name}</span>
                            <span className="text-[10px] opacity-70">
                              {npc.role}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={!draftName.trim()}
                  onClick={() =>
                    onFoundOrganization({
                      name: draftName.trim(),
                      motto: draftMotto.trim() || 'Força, lealdade e propósito.',
                      archetype: draftArchetype,
                      founderNpcIds: founderIds,
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#111] shadow-lg transition hover:brightness-110 disabled:opacity-45"
                >
                  <Crown className="h-4 w-4" />
                  <span>Fundar Organização</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 5-Tab Horizontal Scrollable Bar (Mobile-First) */}
            <div className="no-scrollbar flex flex-nowrap items-center gap-1.5 overflow-x-auto border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 sm:px-5">
              {(
                [
                  { id: 'overview', label: 'Comando & Leis', icon: Crown },
                  {
                    id: 'roster',
                    label: `Membros (${orgMembers.length})`,
                    icon: Users,
                    badge: capturedCount > 0 ? capturedCount : undefined,
                  },
                  {
                    id: 'operations',
                    label: 'Esquadrões & Ops',
                    icon: Swords,
                    badge:
                      readyOpsCount > 0
                        ? readyOpsCount
                        : activeOpsCount > 0
                          ? activeOpsCount
                          : undefined,
                  },
                  {
                    id: 'outposts',
                    label: `Postos (${org.outposts.length})`,
                    icon: MapPin,
                  },
                  {
                    id: 'diplomacy',
                    label: `Diplomacia (${campaign.codex.factions.length})`,
                    icon: Handshake,
                  },
                ] as Array<{
                  id: OrgTabId;
                  label: string;
                  icon: typeof Crown;
                  badge?: number;
                }>
              ).map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? 'bg-[var(--accent)] font-semibold text-[#111] shadow-sm'
                        : 'border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                    {tab.badge ? (
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                          active
                            ? 'bg-black/20 text-[#111]'
                            : 'bg-[#fbbf24]/20 text-[#fbbf24]'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* After-Action Report Banner */}
            {lastReportBanner ? (
              <div className="border-b border-[var(--accent)]/40 bg-[var(--accent-soft)]/40 px-4 py-3 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <ScrollText className="h-4 w-4 text-[var(--accent)]" />
                      <span className="font-display text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                        Relatório de Operação · {lastReportBanner.opTitle}
                      </span>
                      <span className="font-mono-tech rounded-md bg-[var(--bg-surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-primary)]">
                        {lastReportBanner.rollSummary}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-[var(--text-primary)]">
                      {lastReportBanner.narrativeReport}
                    </p>
                    {lastReportBanner.squadQuote ? (
                      <p className="text-xs italic text-[var(--text-secondary)]">
                        <strong className="not-italic text-[var(--accent)]">
                          {lastReportBanner.squadQuote.speaker}:
                        </strong>{' '}
                        “{lastReportBanner.squadQuote.text}”
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={onClearReportBanner}
                    className="rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}

            {/* Tab Viewport */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5">
              {/* TAB 1: OVERVIEW & POLICIES */}
              {activeTab === 'overview' && divisionSummary && chemistry ? (
                <div className="space-y-4">
                  {/* Top KPI Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5">
                      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                        <span>Renome & Tier</span>
                        <Crown className="h-3.5 w-3.5 text-[#fbbf24]" />
                      </div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="font-display text-xl font-bold text-[var(--text-primary)]">
                          Tier {tierInfo.tier}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {org.renown}/{tierInfo.nextThreshold}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-canvas)]">
                        <div
                          className="h-full rounded-full bg-[#fbbf24]"
                          style={{ width: `${tierInfo.progressPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5">
                      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                        <span>Moral Coletiva</span>
                        <Heart className="h-3.5 w-3.5 text-[#4ade80]" />
                      </div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="font-display text-xl font-bold text-[var(--text-primary)]">
                          {org.morale}%
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {org.morale >= 75
                            ? 'Inspirada'
                            : org.morale >= 45
                              ? 'Estável'
                              : 'Crítica'}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-canvas)]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${org.morale}%`,
                            backgroundColor:
                              org.morale >= 65
                                ? '#4ade80'
                                : org.morale >= 40
                                  ? '#fbbf24'
                                  : '#f87171',
                          }}
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5">
                      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                        <span>Notoriedade (Heat)</span>
                        <Flame className="h-3.5 w-3.5 text-[#f87171]" />
                      </div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="font-display text-xl font-bold text-[var(--text-primary)]">
                          {org.heat}%
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          -{divisionSummary.dailyHeatCooling}/dia
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-canvas)]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${org.heat}%`,
                            backgroundColor:
                              org.heat >= 70
                                ? '#f87171'
                                : org.heat >= 40
                                  ? '#fbbf24'
                                  : '#38bdf8',
                          }}
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5">
                      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                        <span>Defesa & Cura</span>
                        <Shield className="h-3.5 w-3.5 text-[var(--accent)]" />
                      </div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="font-display text-xl font-bold text-[var(--accent)]">
                          +{divisionSummary.defenseBonus}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          Defesa
                        </span>
                      </div>
                      <p className="mt-1.5 text-[10px] text-[var(--text-secondary)]">
                        Enfermaria cura {divisionSummary.healingRateHoursPerDay}h/dia
                      </p>
                    </div>
                  </div>

                  {/* Daily Balance & Chemistry */}
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/70 p-4">
                      <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                        Balanço Diário (Virada do Dia)
                      </h3>
                      <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                        “{org.motto}” · {ORG_ARCHETYPE_META[org.archetype].bonusLabel}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10 p-2.5">
                          <div className="text-[10px] font-semibold uppercase text-[var(--success)]">
                            Produção / Dia
                          </div>
                          <ul className="mt-1 space-y-0.5 text-[11px] text-[var(--text-primary)]">
                            {divisionSummary.dailyYieldCurrency > 0 ? (
                              <li>
                                +{divisionSummary.dailyYieldCurrency}{' '}
                                {currencyLabel}
                              </li>
                            ) : null}
                            {(
                              Object.entries(
                                divisionSummary.dailyYieldSupplies,
                              ) as Array<[keyof typeof supplyMeta, number]>
                            )
                              .filter(([, val]) => val > 0)
                              .map(([k, val]) => (
                                <li key={k}>
                                  +{val} {supplyMeta[k].label}
                                </li>
                              ))}
                            {divisionSummary.dailyYieldCurrency === 0 &&
                            Object.values(
                              divisionSummary.dailyYieldSupplies,
                            ).every((v) => !v) ? (
                              <li className="text-[var(--text-muted)]">
                                Aloque membros em divisões ou reivindique postos.
                              </li>
                            ) : null}
                          </ul>
                        </div>

                        <div className="rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-2.5">
                          <div className="text-[10px] font-semibold uppercase text-[var(--warning)]">
                            Consumo / Dia
                          </div>
                          <ul className="mt-1 space-y-0.5 text-[11px] text-[var(--text-primary)]">
                            <li>
                              -{divisionSummary.dailyFoodConsumption}{' '}
                              {supplyMeta.food.label} (estoque: {supplies.food})
                            </li>
                            <li>
                              -{divisionSummary.dailyWagesTotal} {currencyLabel}{' '}
                              em salários
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/70 p-4">
                      <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                        Química & Clima Interno da Equipe
                      </h3>
                      <div className="mt-2.5 space-y-1.5 text-xs">
                        {chemistry.synergies.map((syn, i) => (
                          <div
                            key={`syn_${i}`}
                            className="flex items-start gap-2 rounded-xl bg-[var(--success)]/10 px-2.5 py-1.5 text-[11px] text-[var(--success)]"
                          >
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>{syn}</span>
                          </div>
                        ))}
                        {chemistry.tensions.map((ten, i) => (
                          <div
                            key={`ten_${i}`}
                            className="flex items-start gap-2 rounded-xl bg-[var(--warning)]/10 px-2.5 py-1.5 text-[11px] text-[var(--warning)]"
                          >
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>{ten}</span>
                          </div>
                        ))}
                        {chemistry.synergies.length === 0 &&
                        chemistry.tensions.length === 0 ? (
                          <p className="text-[11px] text-[var(--text-muted)]">
                            Recrute ou convide aliados para ativar sinergias de
                            equipe.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Internal Policies / Doctrines */}
                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/70 p-4">
                    <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                      Leis Internas & Doutrinas
                    </h3>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      {(
                        [
                          {
                            key: 'rations' as const,
                            title: 'Política de Rações',
                            options: ['generous', 'standard', 'strict'] as const,
                          },
                          {
                            key: 'conduct' as const,
                            title: 'Código de Conduta',
                            options: ['merciful', 'pragmatic', 'ruthless'] as const,
                          },
                          {
                            key: 'recruitment' as const,
                            title: 'Regra de Recrutamento',
                            options: ['open', 'selective', 'contract'] as const,
                          },
                        ] as const
                      ).map((group) => (
                        <div
                          key={group.key}
                          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3"
                        >
                          <div className="text-[11px] font-semibold text-[var(--text-primary)]">
                            {group.title}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {group.options.map((opt) => {
                              const current = org.policies[group.key] === opt;
                              const meta = (
                                ORG_POLICY_META[group.key] as Record<
                                  string,
                                  { label: string; hint: string }
                                >
                              )[opt];
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() =>
                                    onUpdatePolicies({ [group.key]: opt })
                                  }
                                  className={`rounded-lg px-2 py-1 text-[11px] font-medium transition ${
                                    current
                                      ? 'bg-[var(--accent)] font-semibold text-[#111]'
                                      : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                  }`}
                                >
                                  {meta.label}
                                </button>
                              );
                            })}
                          </div>
                          <p className="mt-2 text-[10px] leading-snug text-[var(--text-muted)]">
                            {
                              (
                                ORG_POLICY_META[group.key] as Record<
                                  string,
                                  { label: string; hint: string }
                                >
                              )[org.policies[group.key]].hint
                            }
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Organization Chronicle Log */}
                  {org.historyLog.length > 0 ? (
                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-4">
                      <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Registro Recente da Organização
                      </h3>
                      <div className="mt-2 space-y-1.5">
                        {org.historyLog.slice(0, 6).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-start justify-between gap-2 border-b border-[var(--border-subtle)]/50 pb-1.5 text-xs last:border-0"
                          >
                            <span className="text-[var(--text-secondary)]">
                              {item.text}
                            </span>
                            <span className="shrink-0 font-mono-tech text-[10px] text-[var(--text-muted)]">
                              D{item.day}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* TAB 2: ROSTER, DIVISIONS & MERCENARY RECRUITMENT */}
              {activeTab === 'roster' && divisionSummary ? (
                <div className="space-y-5">
                  {/* Divisions Strip */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {ALL_DIVISIONS.filter((d) => d !== 'reserve').map((div) => {
                      const meta = ORG_DIVISION_META[div];
                      const stats = divisionSummary.byDivision[div];
                      return (
                        <div
                          key={div}
                          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className="text-[11px] font-bold"
                              style={{ color: meta.color }}
                            >
                              {meta.short}
                            </span>
                            <span className="font-mono-tech rounded bg-[var(--bg-canvas)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-primary)]">
                              Nv.{stats.level}
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] leading-tight text-[var(--text-muted)]">
                            {stats.members.length} memb. · Poder {stats.power}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Active Roster */}
                  <div>
                    <h3 className="mb-2.5 font-display text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                      Membros da Organização ({orgMembers.length})
                    </h3>
                    {orgMembers.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-[var(--border-subtle)] p-4 text-xs text-[var(--text-muted)]">
                        Nenhum membro recrutado ainda. Convide aliados conhecidos
                        ou contrate especialistas abaixo!
                      </p>
                    ) : (
                      <div className="grid gap-2.5 md:grid-cols-2">
                        {orgMembers.map((member) => {
                          const duty = getMemberDuty(member);
                          const dutyMeta = DUTY_BADGE[duty];
                          const div = member.orgDivision ?? 'reserve';
                          return (
                            <div
                              key={member.id}
                              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-display text-sm font-semibold text-[var(--text-primary)]">
                                      {member.name}
                                    </span>
                                    <span
                                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                      style={{
                                        backgroundColor: `${dutyMeta.color}20`,
                                        color: dutyMeta.color,
                                      }}
                                    >
                                      {dutyMeta.label}
                                      {duty === 'injured' && member.recoveryHoursLeft
                                        ? ` (${member.recoveryHoursLeft}h)`
                                        : ''}
                                    </span>
                                    <span className="rounded bg-[var(--bg-canvas)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                                      {ORG_RANK_LABELS[member.orgRank ?? 'member']}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                                    {member.role} · Nv.{member.level ?? 1}
                                    {(member.dailyWage ?? 0) > 0
                                      ? ` · ${member.dailyWage} ${currencyLabel}/dia`
                                      : ' · Voluntário'}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => onDismissMember(member.id)}
                                  title="Dispensar da organização"
                                  className="rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--danger)]"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              {member.injuryNote ? (
                                <p className="mt-1.5 text-[11px] text-[#f472b6]">
                                  ⚠ {member.injuryNote}
                                </p>
                              ) : null}

                              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap gap-1 font-mono-tech text-[10px] text-[var(--text-muted)]">
                                  {member.attributes
                                    ? (
                                        ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const
                                      ).map((a) => (
                                        <span
                                          key={a}
                                          className="rounded bg-[var(--bg-canvas)] px-1.5 py-0.5"
                                        >
                                          {ATTRIBUTE_META[a].short[language]}{' '}
                                          {member.attributes![a]}
                                        </span>
                                      ))
                                    : null}
                                </div>

                                <select
                                  value={div}
                                  onChange={(e) =>
                                    onAssignDivision(
                                      member.id,
                                      e.target.value as OrgDivisionId,
                                    )
                                  }
                                  className="rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2 py-1 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                                >
                                  {ALL_DIVISIONS.map((d) => (
                                    <option key={d} value={d}>
                                      Divisão: {ORG_DIVISION_META[d].short}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Invite Known Story NPCs */}
                  {nonMemberAllies.length > 0 ? (
                    <div>
                      <h3 className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Convidar Aliados Já Conhecidos na História
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {nonMemberAllies.slice(0, 10).map((npc) => (
                          <button
                            key={npc.id}
                            type="button"
                            onClick={() => onInviteNpc(npc.id, 'security')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                          >
                            <UserPlus className="h-3.5 w-3.5 text-[var(--accent)]" />
                            <span>{npc.name}</span>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              ({npc.role})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Mercenary / Specialist Recruitment Board (AI) */}
                  <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-canvas)]/45 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-[#fbbf24]">
                          Quadro de Mercenários & Candidatos
                        </h3>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          Especialistas disponíveis na região — atenção ao custo,
                          salário diário e defeito de cada um.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isLoadingRecruits}
                        onClick={onRefreshRecruits}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--accent)]/45 bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] transition hover:brightness-110 disabled:opacity-55"
                      >
                        {isLoadingRecruits ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        <span>
                          {isLoadingRecruits
                            ? 'Procurando...'
                            : 'Buscar Candidatos (IA)'}
                        </span>
                      </button>
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-3">
                      {org.recruitPool.map((cand) => {
                        const discountedCost =
                          org.policies.recruitment === 'open'
                            ? Math.round(cand.hireCost * 0.75)
                            : cand.hireCost;
                        const canAfford = currencyAmount >= discountedCost;
                        const divMeta =
                          ORG_DIVISION_META[cand.recommendedDivision];
                        return (
                          <div
                            key={cand.id}
                            className="flex flex-col justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="font-display text-sm font-semibold text-[var(--text-primary)]">
                                    {cand.name}
                                  </h4>
                                  <p className="text-[11px] text-[var(--text-secondary)]">
                                    {cand.role}
                                  </p>
                                </div>
                                <span
                                  className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
                                  style={{
                                    backgroundColor: `${divMeta.color}20`,
                                    color: divMeta.color,
                                  }}
                                >
                                  {divMeta.short}
                                </span>
                              </div>

                              <p className="mt-2 text-xs italic leading-relaxed text-[var(--text-secondary)]">
                                “{cand.pitch}”
                              </p>

                              <div className="mt-2.5 flex flex-wrap gap-1 font-mono-tech text-[10px] text-[var(--text-muted)]">
                                {(
                                  ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const
                                ).map((a) => (
                                  <span
                                    key={a}
                                    className="rounded bg-[var(--bg-canvas)] px-1.5 py-0.5"
                                  >
                                    {ATTRIBUTE_META[a].short[language]}{' '}
                                    {cand.attributes[a]}
                                  </span>
                                ))}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-1">
                                {cand.skills.map((sk) => (
                                  <span
                                    key={sk}
                                    className="rounded-md bg-[var(--bg-surface)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]"
                                  >
                                    {sk}
                                  </span>
                                ))}
                              </div>

                              <p className="mt-2 text-[10px] text-[var(--warning)]">
                                ⚠ {cand.visibleFlaw}
                              </p>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-2.5">
                              <div className="text-[11px]">
                                <div className="font-semibold text-[#fbbf24]">
                                  {discountedCost} {currencyLabel}
                                </div>
                                <div className="text-[10px] text-[var(--text-muted)]">
                                  {cand.dailyWage > 0
                                    ? `+${cand.dailyWage}/dia`
                                    : 'Sem salário fixo'}
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={!canAfford}
                                onClick={() => onHireCandidate(cand)}
                                className="inline-flex items-center gap-1 rounded-xl bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#111] transition hover:brightness-110 disabled:opacity-40"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Recrutar</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* TAB 3: SQUAD OPERATIONS (WAR TABLE) */}
              {activeTab === 'operations' ? (
                <div className="space-y-5">
                  {/* Active & Ready-to-Claim Operations */}
                  {org.operations.some(
                    (o) => o.status === 'active' || o.status === 'ready_to_claim',
                  ) ? (
                    <div className="space-y-2.5">
                      <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-[#fbbf24]">
                        Operações em Campo
                      </h3>
                      <div className="grid gap-2.5 md:grid-cols-2">
                        {org.operations
                          .filter(
                            (o) =>
                              o.status === 'active' ||
                              o.status === 'ready_to_claim',
                          )
                          .map((op) => {
                            const isReady = op.status === 'ready_to_claim';
                            const squadNames = (op.assignedNpcIds ?? [])
                              .map(
                                (id) =>
                                  campaign.codex.npcs.find((n) => n.id === id)
                                    ?.name,
                              )
                              .filter(Boolean);
                            const veh = vehicles.find(
                              (v) => v.id === op.assignedVehicleId,
                            );
                            return (
                              <div
                                key={op.id}
                                className={`rounded-2xl border p-3.5 ${
                                  isReady
                                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]/35 shadow-md'
                                    : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                                      {ORG_OPERATION_KIND_META[op.kind].label}
                                    </span>
                                    <h4 className="font-display text-sm font-semibold text-[var(--text-primary)]">
                                      {op.title}
                                    </h4>
                                    <p className="text-[11px] text-[var(--text-muted)]">
                                      Alvo: {op.targetLocationName} · Esquadrão:{' '}
                                      {squadNames.join(', ') || 'Equipe'}
                                      {veh ? ` · 🚗 ${veh.name}` : ''}
                                    </p>
                                  </div>
                                  {isReady ? (
                                    <button
                                      type="button"
                                      disabled={resolvingOpId === op.id}
                                      onClick={() => onResolveOperation(op.id)}
                                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[#111] shadow transition hover:brightness-110 disabled:opacity-60"
                                    >
                                      {resolvingOpId === op.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <ScrollText className="h-3.5 w-3.5" />
                                      )}
                                      <span>Abrir Relatório</span>
                                    </button>
                                  ) : (
                                    <span className="shrink-0 rounded-full border border-[#fbbf24]/40 bg-[#fbbf24]/15 px-2.5 py-1 font-mono-tech text-[10px] font-semibold text-[#fbbf24]">
                                      {op.hoursRemaining ?? op.durationHours}h ·{' '}
                                      {op.turnsRemaining ?? op.durationTurns}t
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ) : null}

                  {/* Available Contracts & War Table */}
                  <div>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                          Quadro de Contratos & Operações (War Table)
                        </h3>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          Delegue para um esquadrão autônomo ou assuma o controle
                          pessoalmente no chat!
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isLoadingOps}
                        onClick={onRefreshOperations}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--accent)]/45 bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] transition hover:brightness-110 disabled:opacity-55"
                      >
                        {isLoadingOps ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        <span>
                          {isLoadingOps
                            ? 'Buscando...'
                            : 'Novos Contratos (IA)'}
                        </span>
                      </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {org.operations
                        .filter((o) => o.status === 'available')
                        .map((op) => {
                          const kindMeta = ORG_OPERATION_KIND_META[op.kind];
                          const diffMeta = DIFF_LABEL[op.difficulty];
                          const isSelected = selectedOpId === op.id;

                          return (
                            <div
                              key={op.id}
                              className={`flex flex-col justify-between rounded-2xl border p-3.5 transition ${
                                isSelected
                                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]/30 shadow-md'
                                  : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]'
                              }`}
                            >
                              <div>
                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                  <span
                                    className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase"
                                    style={{
                                      backgroundColor: `${kindMeta.color}20`,
                                      color: kindMeta.color,
                                    }}
                                  >
                                    {kindMeta.short}
                                  </span>
                                  <div className="flex items-center gap-1.5 text-[10px]">
                                    <span
                                      className="font-semibold"
                                      style={{ color: diffMeta.color }}
                                    >
                                      Risco {diffMeta.label}
                                    </span>
                                    <span className="text-[var(--text-muted)]">
                                      · {op.durationHours}h / {op.durationTurns}t
                                    </span>
                                  </div>
                                </div>

                                <h4 className="mt-1.5 font-display text-sm font-semibold text-[var(--text-primary)]">
                                  {op.title}
                                </h4>
                                <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                                  {op.briefing}
                                </p>

                                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                                  <span className="inline-flex items-center gap-1 rounded bg-[var(--bg-canvas)] px-2 py-0.5 text-[var(--text-secondary)]">
                                    <MapPin className="h-3 w-3 text-[var(--accent)]" />
                                    {op.targetLocationName}
                                  </span>
                                  {op.recommendedAttributes.map((a) => (
                                    <span
                                      key={a}
                                      className="font-mono-tech rounded bg-[var(--bg-canvas)] px-1.5 py-0.5 font-semibold text-[var(--text-primary)]"
                                    >
                                      {ATTRIBUTE_META[a].short[language]}
                                    </span>
                                  ))}
                                  <span className="rounded bg-[var(--success)]/12 px-2 py-0.5 font-medium text-[var(--success)]">
                                    {op.rewardSummary}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-2.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedOpId(isSelected ? null : op.id);
                                    setSquadSelection([]);
                                    setSelectedVehicleId('');
                                  }}
                                  className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                                    isSelected
                                      ? 'bg-[var(--accent)] text-[#111]'
                                      : 'border border-[var(--accent)]/50 bg-[var(--accent-soft)] text-[var(--accent)] hover:brightness-110'
                                  }`}
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  <span>
                                    {isSelected
                                      ? 'Fechar Montagem'
                                      : 'Montar Esquadrão'}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => {
                                    onPlayOperationInChat(op);
                                    onClose();
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--accent)] disabled:opacity-45"
                                >
                                  <Compass className="h-3.5 w-3.5 text-[var(--accent)]" />
                                  <span>Jogar no Chat</span>
                                </button>
                              </div>

                              {/* Inline Squad Dispatcher Panel */}
                              {isSelected && opEstimate ? (
                                <div className="mt-3 space-y-3 rounded-xl border border-[var(--accent)]/40 bg-[var(--bg-surface)] p-3">
                                  <div>
                                    <span className="text-[11px] font-semibold text-[var(--text-primary)]">
                                      1. Selecione 1 a 3 Operadores (
                                      {squadSelection.length}/3):
                                    </span>
                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                      {dispatchableMembers.length === 0 ? (
                                        <span className="text-[11px] text-[var(--warning)]">
                                          Nenhum membro disponível. Recrute ou
                                          convide aliados na aba Membros!
                                        </span>
                                      ) : (
                                        dispatchableMembers.map((m) => {
                                          const picked = squadSelection.includes(
                                            m.id,
                                          );
                                          return (
                                            <button
                                              key={m.id}
                                              type="button"
                                              onClick={() =>
                                                toggleSquadMember(m.id)
                                              }
                                              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                                                picked
                                                  ? 'border-[var(--accent)] bg-[var(--accent)] font-semibold text-[#111]'
                                                  : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
                                              }`}
                                            >
                                              {m.name}
                                            </button>
                                          );
                                        })
                                      )}
                                    </div>
                                  </div>

                                  {vehicles.length > 0 ? (
                                    <div>
                                      <span className="text-[11px] font-semibold text-[var(--text-primary)]">
                                        2. Veículo de Apoio (Opcional):
                                      </span>
                                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => setSelectedVehicleId('')}
                                          className={`rounded-lg border px-2.5 py-1 text-xs ${
                                            !selectedVehicleId
                                              ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                                              : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-muted)]'
                                          }`}
                                        >
                                          A pé
                                        </button>
                                        {vehicles.map((v) => (
                                          <button
                                            key={v.id}
                                            type="button"
                                            onClick={() =>
                                              setSelectedVehicleId(v.id)
                                            }
                                            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs ${
                                              selectedVehicleId === v.id
                                                ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                                                : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
                                            }`}
                                          >
                                            <Car className="h-3 w-3" />
                                            <span>
                                              {v.name} ({v.fuel}%)
                                            </span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}

                                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--bg-canvas)] px-3 py-2 text-xs">
                                    <div className="flex items-center gap-2">
                                      <Dices className="h-4 w-4 text-[var(--accent)]" />
                                      <span className="font-semibold text-[var(--text-primary)]">
                                        Chance:{' '}
                                        <span
                                          style={{
                                            color: opEstimate.ratingColor,
                                          }}
                                        >
                                          {opEstimate.chancePct}% (
                                          {opEstimate.ratingLabel})
                                        </span>
                                      </span>
                                    </div>
                                    <span className="font-mono-tech text-[10px] text-[var(--text-muted)]">
                                      DC {opEstimate.dc} · +{opEstimate.squadBonus} ·{' '}
                                      {opEstimate.effectiveHours}h /{' '}
                                      {opEstimate.effectiveTurns}t
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    disabled={squadSelection.length === 0}
                                    onClick={() => {
                                      onDispatchSquad(
                                        op.id,
                                        squadSelection,
                                        selectedVehicleId || undefined,
                                      );
                                      setSelectedOpId(null);
                                      setSquadSelection([]);
                                      setSelectedVehicleId('');
                                    }}
                                    className="w-full rounded-xl bg-[var(--accent)] py-2.5 text-xs font-bold text-[#111] shadow transition hover:brightness-110 disabled:opacity-40"
                                  >
                                    Despachar Esquadrão Agora
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* TAB 4: TERRITORIES & OUTPOSTS */}
              {activeTab === 'outposts' ? (
                <div className="space-y-5">
                  <div>
                    <h3 className="mb-2.5 font-display text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                      Postos Avançados Controlados ({org.outposts.length})
                    </h3>
                    {org.outposts.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-[var(--border-subtle)] p-4 text-xs text-[var(--text-muted)]">
                        Reivindique locais descobertos no seu Atlas abaixo para
                        gerar recursos passivos diários e expandir seu território!
                      </p>
                    ) : (
                      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                        {org.outposts.map((post) => {
                          const meta =
                            ORG_OUTPOST_SPECIALTY_META[post.specialty];
                          return (
                            <div
                              key={post.id}
                              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span
                                    className="text-[10px] font-bold uppercase"
                                    style={{ color: meta.color }}
                                  >
                                    {meta.label}
                                  </span>
                                  <h4 className="font-display text-sm font-semibold text-[var(--text-primary)]">
                                    {post.locationName}
                                  </h4>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onReleaseOutpost(post.id)}
                                  title="Abandonar posto avançado"
                                  className="rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--danger)]"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <p className="mt-2 text-xs font-medium text-[var(--success)]">
                                +{post.dailyYield} {meta.yieldLabel} · +
                                {post.defenseBonus} Defesa
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="mb-2.5 font-display text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Locais do Atlas Disponíveis para Reivindicar
                    </h3>
                    <div className="grid gap-2.5 md:grid-cols-2">
                      {campaign.codex.locations
                        .filter((l) => !claimedLocIds.has(l.id))
                        .slice(0, 14)
                        .map((loc) => {
                          const chosenSpec =
                            outpostSpecByLoc[loc.id] ?? 'food';
                          const specMeta =
                            ORG_OUTPOST_SPECIALTY_META[chosenSpec];
                          const canAfford =
                            supplies.materials >= specMeta.claimCostMaterials &&
                            currencyAmount >= specMeta.claimCostCurrency;

                          return (
                            <div
                              key={loc.id}
                              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/75 p-3.5"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h4 className="truncate font-display text-sm font-semibold text-[var(--text-primary)]">
                                    {loc.name}
                                  </h4>
                                  <p className="text-[11px] text-[var(--text-muted)]">
                                    {loc.region || 'Território Descoberto'} ·
                                    Risco {loc.danger}
                                  </p>
                                </div>
                                <select
                                  value={chosenSpec}
                                  onChange={(e) =>
                                    setOutpostSpecByLoc((prev) => ({
                                      ...prev,
                                      [loc.id]: e.target
                                        .value as OrgOutpostSpecialty,
                                    }))
                                  }
                                  className="rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2 py-1 text-xs text-[var(--text-primary)]"
                                >
                                  {ALL_OUTPOST_SPECIALTIES.map((sp) => (
                                    <option key={sp} value={sp}>
                                      {ORG_OUTPOST_SPECIALTY_META[sp].label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-2.5 text-[11px]">
                                <span className="text-[var(--text-secondary)]">
                                  Custo: {specMeta.claimCostMaterials} Mat. +{' '}
                                  {specMeta.claimCostCurrency} {currencyLabel}
                                </span>
                                <button
                                  type="button"
                                  disabled={!canAfford}
                                  onClick={() => onClaimOutpost(loc, chosenSpec)}
                                  className="inline-flex items-center gap-1 rounded-xl bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#111] transition hover:brightness-110 disabled:opacity-40"
                                >
                                  <Flag className="h-3.5 w-3.5" />
                                  <span>Reivindicar</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* TAB 5: DIPLOMACY & FACTIONS */}
              {activeTab === 'diplomacy' ? (
                <div className="space-y-3">
                  <p className="text-xs text-[var(--text-muted)]">
                    Gerencie tratados, pactos comerciais e rivalidades com as
                    facções conhecidas do mundo.
                  </p>
                  {campaign.codex.factions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-6 text-center text-xs text-[var(--text-muted)]">
                      Nenhuma outra facção registrada ainda. À medida que você
                      encontrar grupos, corporações ou guildas na história, eles
                      aparecerão aqui.
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {campaign.codex.factions.map((fac) => {
                        const treaty = fac.treaty ?? 'none';
                        const treatyMeta = FACTION_TREATY_META[treaty];
                        return (
                          <div
                            key={fac.id}
                            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-display text-sm font-semibold text-[var(--text-primary)]">
                                  {fac.name}
                                </h4>
                                <p className="text-[11px] text-[var(--text-muted)]">
                                  Influência: {fac.influence} · Postura:{' '}
                                  {fac.standing}
                                </p>
                              </div>
                              <span
                                className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                                style={{
                                  backgroundColor: `${treatyMeta.color}20`,
                                  color: treatyMeta.color,
                                }}
                              >
                                {treatyMeta.label}
                              </span>
                            </div>

                            {fac.description ? (
                              <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                                {fac.description}
                              </p>
                            ) : null}

                            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--border-subtle)] pt-3">
                              {(
                                [
                                  'non_aggression',
                                  'trade_pact',
                                  'alliance',
                                  'war',
                                ] as FactionTreaty[]
                              ).map((t) => {
                                const active = treaty === t;
                                return (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() =>
                                      onSetFactionTreaty(
                                        fac.id,
                                        active ? 'none' : t,
                                      )
                                    }
                                    className={`rounded-lg border px-2 py-1 text-[10px] font-semibold transition ${
                                      active
                                        ? 'border-[var(--accent)] bg-[var(--accent)] text-[#111]'
                                        : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                                  >
                                    {FACTION_TREATY_META[t].label}
                                  </button>
                                );
                              })}

                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  onNegotiateFactionInChat(fac);
                                  onClose();
                                }}
                                className="ml-auto inline-flex items-center gap-1 rounded-lg border border-[var(--accent)]/45 bg-[var(--accent-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--accent)]"
                              >
                                <MessageSquare className="h-3 w-3" />
                                <span>Negociar no Chat</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
