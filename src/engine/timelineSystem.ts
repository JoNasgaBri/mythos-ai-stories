import type {
  Campaign,
  CampaignTimelineMeta,
  StateDelta,
  StoryEntry,
  TimelineBranchPoint,
  TimelineNodeKind,
  TimelineSnapshotRecord,
} from '../types/game';

export const TIMELINE_BRANCH_COLORS = [
  { id: 'gold', hex: '#d4af37', label: 'Dourado (Original)' },
  { id: 'cyan', hex: '#38bdf8', label: 'Ciano Temporal' },
  { id: 'rose', hex: '#f472b6', label: 'Rosa Carmesim' },
  { id: 'emerald', hex: '#4ade80', label: 'Esmeralda' },
  { id: 'violet', hex: '#a78bfa', label: 'Violeta Arcano' },
  { id: 'amber', hex: '#fb923c', label: 'Âmbar' },
] as const;

export function pickNextBranchColor(existingColors: string[]): string {
  const used = new Set(existingColors.map((c) => c.toLowerCase()));
  for (const preset of TIMELINE_BRANCH_COLORS.slice(1)) {
    if (!used.has(preset.hex.toLowerCase())) return preset.hex;
  }
  return TIMELINE_BRANCH_COLORS[
    (existingColors.length % (TIMELINE_BRANCH_COLORS.length - 1)) + 1
  ].hex;
}

function makeNodeId(turn: number): string {
  return `tn_${turn}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function summarizeText(text: string | undefined, max = 96): string | undefined {
  if (!text) return undefined;
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return undefined;
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function extractHighlights(deltas?: StateDelta[]): string[] {
  if (!Array.isArray(deltas) || deltas.length === 0) return [];
  const priorityOrder: Record<string, number> = {
    crisis: 0,
    quest: 1,
    location: 2,
    faction: 3,
    npc: 4,
    base: 5,
    item: 6,
    vigor: 7,
    tension: 8,
  };
  return [...deltas]
    .sort(
      (a, b) =>
        (priorityOrder[a.kind] ?? 9) - (priorityOrder[b.kind] ?? 9),
    )
    .slice(0, 3)
    .map((d) => d.label)
    .filter(Boolean);
}

/**
 * Reconstructs a full navigable timeline from campaign.entries for legacy saves
 * that existed before MYTHOS 10.0.
 */
export function reconstructLegacyTimeline(campaign: Campaign): CampaignTimelineMeta {
  const sagaId = `saga_${campaign.id}`;
  const nodes: TimelineBranchPoint[] = [];

  const entries = Array.isArray(campaign.entries) ? campaign.entries : [];
  let prevId: string | null = null;
  let lastPlayerText: string | undefined;
  let prevChapter = 1;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.role === 'player') {
      lastPlayerText = entry.text;
      continue;
    }
    if (entry.role !== 'narrator' && entry.role !== 'pulse') continue;

    const entryChapter = entry.chapter ?? prevChapter;
    const isOrigin = nodes.length === 0;
    const isChapterJump = !isOrigin && entryChapter > prevChapter;
    const hasCrisis = Boolean(entry.deltas?.some((d) => d.kind === 'crisis'));
    const kind: TimelineNodeKind = isOrigin
      ? 'origin'
      : hasCrisis
        ? 'crisis'
        : isChapterJump
          ? 'chapter'
          : 'turn';

    const nodeId = `tn_legacy_${campaign.id}_${entry.turn}_${i}`;
    nodes.push({
      id: nodeId,
      sagaId,
      campaignId: campaign.id,
      parentNodeId: prevId,
      turn: entry.turn,
      chapter: entryChapter,
      arcNumber: campaign.arcNumber ?? 1,
      kind,
      title:
        entry.sceneTitle?.trim() ||
        (isOrigin ? campaign.world.title : `Turno ${entry.turn}`),
      choiceSummary: isOrigin
        ? summarizeText(campaign.world.premise, 96)
        : summarizeText(lastPlayerText, 96),
      location: entry.location || campaign.currentLocation,
      vigor: campaign.player.vigor,
      tension: campaign.player.tension,
      mood: entry.mood || campaign.currentMood,
      highlights: extractHighlights(entry.deltas),
      hasSnapshot: false,
      createdAt: entry.timestamp || campaign.createdAt,
    });
    prevId = nodeId;
    prevChapter = entryChapter;
    lastPlayerText = undefined;
  }

  if (nodes.length === 0) {
    nodes.push({
      id: `tn_origin_${campaign.id}`,
      sagaId,
      campaignId: campaign.id,
      parentNodeId: null,
      turn: campaign.turnCount ?? 0,
      chapter: campaign.currentChapter ?? 1,
      arcNumber: campaign.arcNumber ?? 1,
      kind: 'origin',
      title: campaign.world.title,
      choiceSummary: summarizeText(campaign.world.premise, 96),
      location: campaign.currentLocation,
      vigor: campaign.player.vigor,
      tension: campaign.player.tension,
      mood: campaign.currentMood,
      highlights: [],
      hasSnapshot: false,
      createdAt: campaign.createdAt,
    });
  }

  return {
    sagaId,
    branchName: 'Linha Original',
    branchColor: TIMELINE_BRANCH_COLORS[0].hex,
    nodes,
  };
}

export function ensureCampaignTimeline(campaign: Campaign): Campaign {
  if (campaign.timeline && Array.isArray(campaign.timeline.nodes) && campaign.timeline.nodes.length > 0) {
    return campaign;
  }
  return {
    ...campaign,
    timeline: reconstructLegacyTimeline(campaign),
  };
}

export function buildCleanTimelineSnapshot(
  campaign: Campaign,
  nodeId: string,
): TimelineSnapshotRecord {
  const cloned = structuredClone(campaign);
  cloned.interactionId = undefined;
  return {
    nodeId,
    sagaId: cloned.timeline?.sagaId ?? `saga_${cloned.id}`,
    campaignId: cloned.id,
    turn: cloned.turnCount,
    createdAt: Date.now(),
    snapshot: cloned,
  };
}

export function computeKeptSnapshotNodeIds(
  nodes: TimelineBranchPoint[],
  maxSnapshots = 40,
): Set<string> {
  const importantKinds = new Set<TimelineNodeKind>([
    'origin',
    'chapter',
    'world_event',
    'crisis',
    'branch_root',
    'manual_mark',
    'ending',
  ]);
  const keep = new Set<string>();

  // Always keep every milestone node + last 15 turns
  for (const n of nodes) {
    if (importantKinds.has(n.kind)) {
      keep.add(n.id);
    }
  }
  const recent = nodes.slice(-15);
  for (const n of recent) {
    keep.add(n.id);
  }

  // If still over budget, trim oldest non-origin/non-branch turns first
  if (keep.size > maxSnapshots) {
    const ordered = [...nodes];
    for (const n of ordered) {
      if (keep.size <= maxSnapshots) break;
      if (n.kind === 'turn' && keep.has(n.id)) {
        keep.delete(n.id);
      }
    }
  }
  return keep;
}

export function appendTimelineNode(
  campaign: Campaign,
  opts: {
    kind?: TimelineNodeKind;
    title: string;
    choiceSummary?: string;
    deltas?: StateDelta[];
    hasSnapshot?: boolean;
  },
): {
  nextCampaign: Campaign;
  node: TimelineBranchPoint;
  keepSnapshotIds: Set<string>;
} {
  const ensured = ensureCampaignTimeline(campaign);
  const meta = ensured.timeline!;
  const lastNode = meta.nodes[meta.nodes.length - 1] ?? null;

  let resolvedKind: TimelineNodeKind = opts.kind ?? 'turn';
  if (!opts.kind) {
    if (
      ensured.status === 'ended_fallen' ||
      ensured.status === 'ended_victory'
    ) {
      resolvedKind = 'ending';
    } else if (
      ensured.status === 'crisis_vigor' ||
      ensured.status === 'crisis_tension' ||
      opts.deltas?.some((d) => d.kind === 'crisis')
    ) {
      resolvedKind = 'crisis';
    } else if (lastNode && ensured.currentChapter > lastNode.chapter) {
      resolvedKind = 'chapter';
    }
  }

  const nodeId = makeNodeId(ensured.turnCount);
  const node: TimelineBranchPoint = {
    id: nodeId,
    sagaId: meta.sagaId,
    campaignId: ensured.id,
    parentNodeId: lastNode ? lastNode.id : null,
    turn: ensured.turnCount,
    chapter: ensured.currentChapter,
    arcNumber: ensured.arcNumber,
    kind: resolvedKind,
    title: opts.title.trim() || `Turno ${ensured.turnCount}`,
    choiceSummary: summarizeText(opts.choiceSummary, 110),
    location: ensured.currentLocation,
    vigor: ensured.player.vigor,
    tension: ensured.player.tension,
    mood: ensured.currentMood,
    highlights: extractHighlights(opts.deltas),
    hasSnapshot: opts.hasSnapshot ?? true,
    createdAt: Date.now(),
  };

  const nextNodes = [...meta.nodes, node];
  const keepSnapshotIds = computeKeptSnapshotNodeIds(nextNodes);
  const updatedNodes = nextNodes.map((n) =>
    n.hasSnapshot && !keepSnapshotIds.has(n.id)
      ? { ...n, hasSnapshot: false }
      : n,
  );

  const nextCampaign: Campaign = {
    ...ensured,
    timeline: {
      ...meta,
      nodes: updatedNodes,
    },
  };

  return { nextCampaign, node, keepSnapshotIds };
}

/**
 * Creates a brand-new sibling campaign branched from a chosen TimelineBranchPoint.
 * Uses the exact IndexedDB snapshot if present, otherwise performs a clean
 * retroactive cut of campaign.entries at that node's turn.
 */
export function createBranchedCampaign(params: {
  sourceCampaign: Campaign;
  targetNode: TimelineBranchPoint;
  exactSnapshot: Campaign | null;
  branchName: string;
  branchColor: string;
}): {
  branchedCampaign: Campaign;
  rootNode: TimelineBranchPoint;
  usedExactSnapshot: boolean;
} {
  const { sourceCampaign, targetNode, exactSnapshot, branchName, branchColor } =
    params;
  const now = Date.now();
  const newCampaignId = `camp_br_${now}_${Math.random().toString(36).slice(2, 6)}`;
  const sourceEnsured = ensureCampaignTimeline(sourceCampaign);
  const sagaId = sourceEnsured.timeline!.sagaId;

  const usedExactSnapshot = Boolean(exactSnapshot);
  const base: Campaign = structuredClone(exactSnapshot ?? sourceEnsured);

  // If retroactive cut (legacy campaign without exact snapshot), slice entries up to target turn
  if (!exactSnapshot) {
    const cutEntries: StoryEntry[] = [];
    for (const entry of base.entries) {
      if (entry.turn <= targetNode.turn) {
        cutEntries.push(entry);
      } else {
        break;
      }
    }
    base.entries = cutEntries.length > 0 ? cutEntries : base.entries.slice(0, 1);
    base.turnCount = targetNode.turn;
    base.currentChapter = targetNode.chapter;
    base.currentLocation = targetNode.location;
    base.currentMood = targetNode.mood;
    base.status = 'active';
    base.epilogue = undefined;
  }

  // Always detach Gemini server interactionId so the new timeline never bleeds into the original thread
  base.interactionId = undefined;
  base.id = newCampaignId;
  base.createdAt = now;
  base.updatedAt = now;

  const cleanBranchName =
    branchName.trim() || `E se: Turno ${targetNode.turn}`;
  const rootNodeId = makeNodeId(base.turnCount);

  const rootNode: TimelineBranchPoint = {
    id: rootNodeId,
    sagaId,
    campaignId: newCampaignId,
    parentNodeId: targetNode.id,
    turn: base.turnCount,
    chapter: base.currentChapter,
    arcNumber: base.arcNumber,
    kind: 'branch_root',
    title: cleanBranchName,
    choiceSummary: usedExactSnapshot
      ? `Ramificação exata a partir de "${targetNode.title}" (Turno ${targetNode.turn})`
      : `Ramificação retroativa a partir de "${targetNode.title}" (Turno ${targetNode.turn})`,
    location: base.currentLocation,
    vigor: base.player.vigor,
    tension: base.player.tension,
    mood: base.currentMood,
    highlights: [`Nova Linha: ${cleanBranchName}`],
    hasSnapshot: true,
    createdAt: now,
  };

  base.timeline = {
    sagaId,
    branchName: cleanBranchName,
    branchColor,
    parentCampaignId: sourceEnsured.id,
    branchedFromNodeId: targetNode.id,
    branchedFromTurn: targetNode.turn,
    nodes: [rootNode],
  };

  return {
    branchedCampaign: base,
    rootNode,
    usedExactSnapshot,
  };
}

export interface SagaGraphNode extends TimelineBranchPoint {
  branchName: string;
  branchColor: string;
  laneIndex: number;
  columnIndex: number;
  isCurrentHead: boolean;
}

export interface SagaGraphEdge {
  fromId: string;
  toId: string;
  color: string;
  isBranchSplit: boolean;
}

export interface SagaLaneInfo {
  campaignId: string;
  branchName: string;
  branchColor: string;
  turnCount: number;
  status: Campaign['status'];
  isActive: boolean;
  laneIndex: number;
}

export interface SagaGraphData {
  sagaId: string;
  lanes: SagaLaneInfo[];
  nodes: SagaGraphNode[];
  edges: SagaGraphEdge[];
  maxColumns: number;
}

/**
 * Unifies all campaigns sharing a sagaId into a deterministic, non-overlapping
 * multi-lane tree/DAG layout for both Desktop horizontal SVG and Mobile vertical rail.
 */
export function buildSagaGraph(
  allCampaigns: Campaign[],
  activeCampaign: Campaign,
): SagaGraphData {
  const activeEnsured = ensureCampaignTimeline(activeCampaign);
  const sagaId = activeEnsured.timeline!.sagaId;

  const relatedMap = new Map<string, Campaign>();
  relatedMap.set(activeEnsured.id, activeEnsured);
  for (const camp of allCampaigns) {
    const ens = ensureCampaignTimeline(camp);
    if (ens.timeline!.sagaId === sagaId && !relatedMap.has(ens.id)) {
      relatedMap.set(ens.id, ens);
    }
  }

  // Sort lanes: original (no parentCampaignId) first, then by createdAt ascending
  const sagaCampaigns = [...relatedMap.values()].sort((a, b) => {
    const aRoot = a.timeline?.parentCampaignId ? 1 : 0;
    const bRoot = b.timeline?.parentCampaignId ? 1 : 0;
    if (aRoot !== bRoot) return aRoot - bRoot;
    return a.createdAt - b.createdAt;
  });

  const lanes: SagaLaneInfo[] = sagaCampaigns.map((c, idx) => ({
    campaignId: c.id,
    branchName: c.timeline?.branchName || (idx === 0 ? 'Linha Original' : `Linha ${idx + 1}`),
    branchColor: c.timeline?.branchColor || TIMELINE_BRANCH_COLORS[idx % TIMELINE_BRANCH_COLORS.length].hex,
    turnCount: c.turnCount,
    status: c.status,
    isActive: c.id === activeEnsured.id,
    laneIndex: idx,
  }));

  const nodeById = new Map<string, SagaGraphNode>();
  const nodes: SagaGraphNode[] = [];
  const edges: SagaGraphEdge[] = [];
  let maxColumns = 1;

  for (let laneIdx = 0; laneIdx < sagaCampaigns.length; laneIdx++) {
    const camp = sagaCampaigns[laneIdx];
    const lane = lanes[laneIdx];
    const rawNodes = camp.timeline?.nodes ?? [];

    // Determine starting column from parent node if this is a branch
    let startCol = 0;
    const branchParentId = camp.timeline?.branchedFromNodeId;
    if (branchParentId && nodeById.has(branchParentId)) {
      startCol = nodeById.get(branchParentId)!.columnIndex + 1;
    }

    for (let i = 0; i < rawNodes.length; i++) {
      const rn = rawNodes[i];
      const col = startCol + i;
      const isHead =
        camp.id === activeEnsured.id && i === rawNodes.length - 1;
      const gNode: SagaGraphNode = {
        ...rn,
        branchName: lane.branchName,
        branchColor: lane.branchColor,
        laneIndex: laneIdx,
        columnIndex: col,
        isCurrentHead: isHead,
      };
      nodeById.set(gNode.id, gNode);
      nodes.push(gNode);
      if (col + 1 > maxColumns) maxColumns = col + 1;

      if (rn.parentNodeId && nodeById.has(rn.parentNodeId)) {
        const parent = nodeById.get(rn.parentNodeId)!;
        edges.push({
          fromId: parent.id,
          toId: gNode.id,
          color: lane.branchColor,
          isBranchSplit: parent.laneIndex !== gNode.laneIndex,
        });
      }
    }
  }

  return {
    sagaId,
    lanes,
    nodes,
    edges,
    maxColumns,
  };
}

export interface SagaAnalytics {
  totalBranches: number;
  totalNodes: number;
  totalTurnsExplored: number;
  maxChapterReached: number;
  uniqueLocationsCount: number;
  uniqueNpcsCount: number;
  worldEventsResolved: number;
  crisesFaced: number;
  endingsUnlocked: number;
}

export function computeSagaAnalytics(
  allCampaigns: Campaign[],
  activeCampaign: Campaign,
): SagaAnalytics {
  const activeEnsured = ensureCampaignTimeline(activeCampaign);
  const sagaId = activeEnsured.timeline!.sagaId;
  const related = new Map<string, Campaign>();
  related.set(activeEnsured.id, activeEnsured);
  for (const c of allCampaigns) {
    const ens = ensureCampaignTimeline(c);
    if (ens.timeline!.sagaId === sagaId && !related.has(ens.id)) {
      related.set(ens.id, ens);
    }
  }

  const list = [...related.values()];
  const locNames = new Set<string>();
  const npcNames = new Set<string>();
  let totalNodes = 0;
  let totalTurns = 0;
  let maxChapter = 1;
  let worldEvents = 0;
  let crises = 0;
  let endings = 0;

  for (const c of list) {
    const nodes = c.timeline?.nodes ?? [];
    totalNodes += nodes.length;
    totalTurns += c.turnCount;
    if (c.currentChapter > maxChapter) maxChapter = c.currentChapter;
    for (const loc of c.codex.locations) locNames.add(loc.name.toLowerCase());
    for (const npc of c.codex.npcs) npcNames.add(npc.name.toLowerCase());
    worldEvents += c.eventHistory?.length ?? 0;
    crises += nodes.filter((n) => n.kind === 'crisis').length;
    if (c.status === 'ended_fallen' || c.status === 'ended_victory') {
      endings += 1;
    }
  }

  return {
    totalBranches: list.length,
    totalNodes,
    totalTurnsExplored: totalTurns,
    maxChapterReached: maxChapter,
    uniqueLocationsCount: locNames.size,
    uniqueNpcsCount: npcNames.size,
    worldEventsResolved: worldEvents,
    crisesFaced: crises,
    endingsUnlocked: endings,
  };
}
