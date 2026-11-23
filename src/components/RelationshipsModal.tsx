import {
  Activity,
  Camera,
  Check,
  Gift,
  Heart,
  MapPin,
  MessageSquare,
  Network,
  Pencil,
  Ruler,
  Shield,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  User,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_META,
  defaultNpcAttributes,
  formatModifier,
  getAttributeModifier,
  MAX_PARTY_SIZE,
  RARITY_META,
  RELATIONSHIP_META,
} from '../engine/rpgSystem';
import type {
  AttributeId,
  Campaign,
  InventoryItem,
  LanguageId,
  NpcRecord,
  RelationshipTier,
} from '../types/game';

interface RelationshipsModalProps {
  open: boolean;
  campaign: Campaign;
  language: LanguageId;
  initialNpcId?: string | null;
  generatingNpcPortraitId?: string | null;
  onClose: () => void;
  onTogglePartyMember: (npcId: string) => void;
  onGenerateNpcPortrait: (npcId: string) => void;
  onUpdateNpcProfile: (npcId: string, patch: Partial<NpcRecord>) => void;
  onGiftItemToNpc: (npcId: string, itemId: string) => void;
  onTalkToNpc: (npc: NpcRecord) => void;
  onSpendQualityTime: (npc: NpcRecord) => void;
}

const RELATIONSHIP_ORDER: RelationshipTier[] = [
  'enemy',
  'rival',
  'stranger',
  'acquaintance',
  'friend',
  'close',
  'romance',
  'partner',
];

export function RelationshipsModal({
  open,
  campaign,
  language,
  initialNpcId,
  generatingNpcPortraitId,
  onClose,
  onTogglePartyMember,
  onGenerateNpcPortrait,
  onUpdateNpcProfile,
  onGiftItemToNpc,
  onTalkToNpc,
  onSpendQualityTime,
}: RelationshipsModalProps) {
  const [viewMode, setViewMode] = useState<'sheets' | 'web'>('sheets');
  const [selectedId, setSelectedId] = useState<string | null>(
    initialNpcId ?? null,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [giftPickerOpen, setGiftPickerOpen] = useState(false);

  // Edit form drafts
  const [draftAge, setDraftAge] = useState('');
  const [draftHeight, setDraftHeight] = useState('');
  const [draftRole, setDraftRole] = useState('');
  const [draftMood, setDraftMood] = useState('');
  const [draftAppearance, setDraftAppearance] = useState('');
  const [draftPersonality, setDraftPersonality] = useState('');
  const [draftAssistAttr, setDraftAssistAttr] = useState<AttributeId>('cha');
  const [draftRelationship, setDraftRelationship] =
    useState<RelationshipTier>('friend');
  const [draftSkills, setDraftSkills] = useState('');
  const [draftTraits, setDraftTraits] = useState('');
  const [draftLikes, setDraftLikes] = useState('');
  const [draftDislikes, setDraftDislikes] = useState('');

  useEffect(() => {
    if (!open) return;
    if (initialNpcId) setSelectedId(initialNpcId);
    setIsEditing(false);
    setGiftPickerOpen(false);
  }, [open, initialNpcId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const sortedNpcs = useMemo(() => {
    return [...campaign.codex.npcs].sort((a, b) => {
      if (Boolean(a.inParty) !== Boolean(b.inParty)) {
        return a.inParty ? -1 : 1;
      }
      return (b.affinity ?? 0) - (a.affinity ?? 0);
    });
  }, [campaign.codex.npcs]);

  const partyNpcs = sortedNpcs.filter((n) => n.inParty && n.status === 'alive');
  const otherNpcs = sortedNpcs.filter(
    (n) => !(n.inParty && n.status === 'alive'),
  );

  const selectedNpc =
    sortedNpcs.find((n) => n.id === selectedId) ?? sortedNpcs[0] ?? null;

  const startEdit = (npc: NpcRecord) => {
    setDraftAge(npc.age ? String(npc.age) : '');
    setDraftHeight(npc.height ?? '');
    setDraftRole(npc.role ?? '');
    setDraftMood(npc.currentMood ?? '');
    setDraftAppearance(npc.appearance ?? '');
    setDraftPersonality(npc.personality ?? '');
    setDraftAssistAttr(npc.assistAttribute ?? 'cha');
    setDraftRelationship(npc.relationship ?? 'friend');
    setDraftSkills((npc.skills ?? []).join(', '));
    setDraftTraits((npc.traits ?? []).join(', '));
    setDraftLikes((npc.likes ?? []).join(', '));
    setDraftDislikes((npc.dislikes ?? []).join(', '));
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (!selectedNpc) return;
    const parseCsv = (raw: string) =>
      raw
        .split(/[,;]+/)
        .map((x) => x.trim())
        .filter(Boolean);
    const parsedAge = Number(draftAge);
    onUpdateNpcProfile(selectedNpc.id, {
      age:
        Number.isFinite(parsedAge) && parsedAge >= 14 && parsedAge <= 999
          ? Math.round(parsedAge)
          : undefined,
      height: draftHeight.trim() || undefined,
      role: draftRole.trim() || selectedNpc.role,
      currentMood: draftMood.trim() || undefined,
      appearance: draftAppearance.trim() || undefined,
      personality: draftPersonality.trim() || undefined,
      assistAttribute: draftAssistAttr,
      relationship: draftRelationship,
      skills: parseCsv(draftSkills),
      traits: parseCsv(draftTraits),
      likes: parseCsv(draftLikes),
      dislikes: parseCsv(draftDislikes),
    });
    setIsEditing(false);
  };

  if (!open) return null;

  const isEnded =
    campaign.status === 'ended_fallen' || campaign.status === 'ended_victory';

  const giftableItems: InventoryItem[] = campaign.player.inventory.filter(
    (i) => !i.equipped,
  );

  const renderNpcRow = (npc: NpcRecord) => {
    const active = selectedNpc?.id === npc.id;
    const rel =
      RELATIONSHIP_META[npc.relationship ?? 'stranger'] ??
      RELATIONSHIP_META.stranger;
    const attrShort =
      ATTRIBUTE_META[npc.assistAttribute ?? 'wis'].short[language];
    return (
      <button
        key={npc.id}
        type="button"
        onClick={() => {
          setSelectedId(npc.id);
          setIsEditing(false);
          setGiftPickerOpen(false);
        }}
        className={`flex w-full items-center gap-2.5 rounded-2xl border p-2.5 text-left transition ${
          active
            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
            : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]'
        }`}
      >
        {npc.portraitUrl ? (
          <img
            src={npc.portraitUrl}
            alt={npc.name}
            className="h-10 w-10 shrink-0 rounded-xl border border-[var(--border-strong)] object-cover"
          />
        ) : (
          <span className="font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] text-xs font-bold text-[var(--accent)]">
            {npc.name.slice(0, 2).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-xs font-semibold text-[var(--text-primary)]">
              {npc.name}
            </span>
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold"
              style={{ color: rel.color, backgroundColor: rel.bg }}
            >
              {rel.label}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
            <span className="truncate">{npc.role}</span>
            <span>·</span>
            <span className="font-mono-tech shrink-0 text-[var(--success)]">
              {attrShort}
            </span>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2.5 backdrop-blur-md sm:p-5"
      onClick={onClose}
      role="dialog"
      aria-label="Companheiros e Relacionamentos"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-[var(--shadow-elevated)]"
      >
        {/* Header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/60 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[#f472b6]/15 text-[#f472b6]">
              <Heart className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-sm font-semibold tracking-wide text-[var(--text-primary)] sm:text-base">
                Companheiros & Relacionamentos
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Grupo ativo: {partyNpcs.length}/{MAX_PARTY_SIZE} · {sortedNpcs.length}{' '}
                {sortedNpcs.length === 1 ? 'pessoa conhecida' : 'pessoas conhecidas'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('sheets')}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                  viewMode === 'sheets'
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Fichas</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('web')}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                  viewMode === 'web'
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                <Network className="h-3.5 w-3.5" />
                <span>Teia SVG</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--border-subtle)] p-1.5 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        {sortedNpcs.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <Users className="mb-3 h-10 w-10 text-[var(--text-muted)] opacity-45" />
            <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
              Nenhum personagem encontrado ainda
            </h3>
            <p className="mt-1 max-w-sm text-xs text-[var(--text-secondary)]">
              Conforme você conhece pessoas, faz aliados ou inicia romances na história, as fichas BG3 completas, atributos e vínculos aparecem aqui.
            </p>
          </div>
        ) : viewMode === 'web' ? (
          /* INTERACTIVE SVG RELATIONSHIP WEB */
          <div className="relative flex flex-1 flex-col overflow-hidden bg-[var(--bg-canvas)]">
            <svg
              viewBox="0 0 800 440"
              className="flex-1"
              role="img"
              aria-label="Teia interativa de vínculos e relacionamentos"
            >
              <defs>
                <radialGradient id="bondGlow" cx="50%" cy="50%" r="55%">
                  <stop offset="0%" stopColor="#f472b6" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="var(--bg-canvas)" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width="800" height="440" fill="url(#bondGlow)" />

              {/* Concentric affinity rings */}
              <circle
                cx="400"
                cy="220"
                r="115"
                fill="none"
                stroke="#f472b6"
                strokeOpacity="0.2"
                strokeDasharray="4 4"
              />
              <circle
                cx="400"
                cy="220"
                r="185"
                fill="none"
                stroke="var(--border-strong)"
                strokeOpacity="0.25"
                strokeDasharray="6 6"
              />

              {/* Edges & NPC Nodes */}
              {sortedNpcs.slice(0, 12).map((npc, idx) => {
                const count = Math.min(sortedNpcs.length, 12);
                const angle = (idx / Math.max(1, count)) * Math.PI * 2 - Math.PI / 2;
                const isClose =
                  npc.inParty ||
                  npc.relationship === 'romance' ||
                  npc.relationship === 'partner' ||
                  npc.relationship === 'close';
                const rx = isClose ? 135 : 225;
                const ry = isClose ? 110 : 168;
                const x = Math.round(400 + Math.cos(angle) * rx);
                const y = Math.round(220 + Math.sin(angle) * ry);
                const rel =
                  RELATIONSHIP_META[npc.relationship ?? 'stranger'] ??
                  RELATIONSHIP_META.stranger;
                const isHostile =
                  npc.relationship === 'enemy' || npc.relationship === 'rival';

                return (
                  <g key={npc.id}>
                    <line
                      x1="400"
                      y1="220"
                      x2={x}
                      y2={y}
                      stroke={rel.color}
                      strokeWidth={npc.inParty ? '2.6' : '1.6'}
                      strokeDasharray={isHostile ? '5 4' : 'none'}
                      strokeOpacity="0.7"
                    />
                    <g
                      transform={`translate(${x}, ${y})`}
                      onClick={() => {
                        setSelectedId(npc.id);
                        setViewMode('sheets');
                      }}
                      className="cursor-pointer"
                    >
                      <circle
                        r={npc.inParty ? 22 : 17}
                        fill="var(--bg-surface)"
                        stroke={rel.color}
                        strokeWidth={npc.inParty ? '3' : '2'}
                      />
                      <text
                        textAnchor="middle"
                        y="4"
                        fill="var(--text-primary)"
                        fontSize="11"
                        fontWeight="700"
                      >
                        {npc.name.slice(0, 2).toUpperCase()}
                      </text>
                      <rect
                        x="-58"
                        y="24"
                        width="116"
                        height="20"
                        rx="6"
                        fill="var(--bg-surface)"
                        stroke="var(--border-subtle)"
                      />
                      <text
                        textAnchor="middle"
                        y="37"
                        fill="var(--text-primary)"
                        fontSize="10"
                        fontWeight="600"
                      >
                        {npc.name.length > 16
                          ? `${npc.name.slice(0, 15)}…`
                          : npc.name}
                      </text>
                      <text
                        textAnchor="middle"
                        y="-26"
                        fill={rel.color}
                        fontSize="9.5"
                        fontWeight="700"
                      >
                        {rel.label} ({(npc.affinity ?? 0) >= 0 ? '+' : ''}
                        {npc.affinity ?? 0})
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Center Protagonist Hub */}
              <g transform="translate(400, 220)">
                <circle
                  r="34"
                  fill="var(--accent-soft)"
                  stroke="var(--accent)"
                  strokeWidth="3"
                />
                <text
                  textAnchor="middle"
                  y="3"
                  fill="var(--text-primary)"
                  fontSize="11"
                  fontWeight="700"
                >
                  {campaign.player.name.slice(0, 10)}
                </text>
                <text
                  textAnchor="middle"
                  y="16"
                  fill="var(--accent)"
                  fontSize="9"
                  fontWeight="600"
                >
                  VOCÊ
                </text>
              </g>
            </svg>
            <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-5 py-2.5 text-center text-xs text-[var(--text-secondary)]">
              Clique em qualquer pessoa na teia para abrir sua Ficha BG3 completa, atributos, altura, idade e ações de vínculo.
            </div>
          </div>
        ) : (
          /* FULL BG3 COMPANION SHEETS & RELATIONSHIPS SPLIT VIEW */
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-3.5 sm:p-5 md:grid-cols-12">
            {/* Left Roster Column */}
            <div className="min-h-0 space-y-4 overflow-y-auto pr-1 md:col-span-4">
              {partyNpcs.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--success)]">
                    No Seu Grupo ({partyNpcs.length}/{MAX_PARTY_SIZE})
                  </h3>
                  <div className="space-y-2">{partyNpcs.map(renderNpcRow)}</div>
                </div>
              ) : null}

              {otherNpcs.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Conhecidos & Vínculos ({otherNpcs.length})
                  </h3>
                  <div className="space-y-2">{otherNpcs.map(renderNpcRow)}</div>
                </div>
              ) : null}
            </div>

            {/* Right Companion Detail Sheet */}
            {selectedNpc ? (
              (() => {
                const rel =
                  RELATIONSHIP_META[selectedNpc.relationship ?? 'stranger'] ??
                  RELATIONSHIP_META.stranger;
                const affinity = selectedNpc.affinity ?? 0;
                const affPct = Math.max(
                  0,
                  Math.min(100, Math.round(((affinity + 100) / 200) * 100)),
                );
                const assistAttr = selectedNpc.assistAttribute ?? 'wis';
                const attrs =
                  selectedNpc.attributes ?? defaultNpcAttributes(assistAttr);
                const npcVigor = selectedNpc.vigor ?? selectedNpc.maxVigor ?? 100;
                const npcMaxVigor = selectedNpc.maxVigor ?? 100;
                const canDate =
                  selectedNpc.status === 'alive' &&
                  (affinity >= 30 ||
                    selectedNpc.relationship === 'romance' ||
                    selectedNpc.relationship === 'partner' ||
                    selectedNpc.relationship === 'close');

                return (
                  <div className="min-h-0 space-y-4 overflow-y-auto pr-1 md:col-span-8">
                    {/* Hero Card */}
                    <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-4">
                      <div className="flex flex-col gap-4 sm:flex-row">
                        {/* Portrait */}
                        <div className="flex shrink-0 flex-col items-center gap-2">
                          <div className="relative h-28 w-24 overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-md">
                            {selectedNpc.portraitUrl ? (
                              <img
                                src={selectedNpc.portraitUrl}
                                alt={selectedNpc.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full flex-col items-center justify-center text-[var(--accent)]">
                                <User className="h-9 w-9 opacity-60" />
                              </div>
                            )}
                          </div>
                          {!isEnded ? (
                            <button
                              type="button"
                              disabled={Boolean(generatingNpcPortraitId)}
                              onClick={() => onGenerateNpcPortrait(selectedNpc.id)}
                              className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-[10px] font-semibold text-[var(--accent)] transition hover:border-[var(--accent)] disabled:opacity-45"
                            >
                              <Camera
                                className={`h-3 w-3 ${
                                  generatingNpcPortraitId === selectedNpc.id
                                    ? 'animate-spin'
                                    : ''
                                }`}
                              />
                              <span>
                                {generatingNpcPortraitId === selectedNpc.id
                                  ? 'Gerando...'
                                  : selectedNpc.portraitUrl
                                    ? 'Novo Retrato'
                                    : 'Retrato'}
                              </span>
                            </button>
                          ) : null}
                        </div>

                        {/* Identity + Biometrics */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-display text-lg font-bold text-[var(--text-primary)]">
                                  {selectedNpc.name}
                                </h3>
                                <span
                                  className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                                  style={{ color: rel.color, backgroundColor: rel.bg }}
                                >
                                  {rel.label}
                                </span>
                                {selectedNpc.inParty ? (
                                  <span className="rounded-full bg-[var(--success)]/15 px-2 py-0.5 text-[10px] font-bold text-[var(--success)]">
                                    NO GRUPO
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                                {selectedNpc.role}
                                {selectedNpc.currentMood
                                  ? ` · Humor: ${selectedNpc.currentMood}`
                                  : ''}
                              </p>
                            </div>

                            {!isEnded ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    isEditing
                                      ? setIsEditing(false)
                                      : startEdit(selectedNpc)
                                  }
                                  className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                                >
                                  <Pencil className="h-3 w-3" />
                                  <span>{isEditing ? 'Fechar' : 'Editar Ficha'}</span>
                                </button>
                                {selectedNpc.status === 'alive' ? (
                                  <button
                                    type="button"
                                    disabled={
                                      !selectedNpc.inParty &&
                                      partyNpcs.length >= MAX_PARTY_SIZE
                                    }
                                    onClick={() =>
                                      onTogglePartyMember(selectedNpc.id)
                                    }
                                    className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition disabled:opacity-40 ${
                                      selectedNpc.inParty
                                        ? 'border-[var(--success)]/45 bg-[var(--success)]/12 text-[var(--success)]'
                                        : 'border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--accent)]'
                                    }`}
                                  >
                                    {selectedNpc.inParty ? (
                                      <>
                                        <UserMinus className="h-3 w-3" />
                                        <span>Remover</span>
                                      </>
                                    ) : (
                                      <>
                                        <UserPlus className="h-3 w-3" />
                                        <span>Chamar p/ Grupo</span>
                                      </>
                                    )}
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                          </div>

                          {/* Biometric Pills: Age, Height, Location, Assist Advantage */}
                          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                            <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-[var(--text-primary)]">
                              <User className="h-3 w-3 text-[var(--accent)]" />
                              Idade:{' '}
                              <strong>
                                {selectedNpc.age ? `${selectedNpc.age} anos` : 'Não definida'}
                              </strong>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-[var(--text-primary)]">
                              <Ruler className="h-3 w-3 text-[var(--accent)]" />
                              Altura:{' '}
                              <strong>{selectedNpc.height || 'Não definida'}</strong>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-[var(--success)]">
                              <Shield className="h-3 w-3" />
                              Vantagem 2×d20:{' '}
                              <strong>
                                {ATTRIBUTE_META[assistAttr].short[language]}
                              </strong>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-[var(--text-secondary)]">
                              <MapPin className="h-3 w-3 text-[var(--accent)]" />
                              {selectedNpc.lastSeenLocation}
                            </span>
                          </div>

                          {/* Affinity Heart Bar */}
                          <div className="mt-3">
                            <div className="mb-1 flex items-center justify-between text-[11px]">
                              <span className="inline-flex items-center gap-1 font-semibold" style={{ color: rel.color }}>
                                <Heart className="h-3 w-3" />
                                Afinidade & Vínculo
                              </span>
                              <span className="font-mono-tech font-bold" style={{ color: rel.color }}>
                                {affinity > 0 ? `+${affinity}` : affinity} / 100
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-canvas)]">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${affPct}%`,
                                  backgroundColor: rel.color,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Inline Profile Editor */}
                      {isEditing ? (
                        <div className="mt-4 space-y-3 border-t border-[var(--border-subtle)] pt-4">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                            Personalizar Ficha (salva na memória da IA!)
                          </div>
                          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                            <div>
                              <label className="mb-1 block text-[10px] text-[var(--text-muted)]">
                                Idade
                              </label>
                              <input
                                type="number"
                                value={draftAge}
                                onChange={(e) => setDraftAge(e.target.value)}
                                placeholder="Ex: 26"
                                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[10px] text-[var(--text-muted)]">
                                Altura
                              </label>
                              <input
                                type="text"
                                value={draftHeight}
                                onChange={(e) => setDraftHeight(e.target.value)}
                                placeholder="Ex: 1,90m"
                                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[10px] text-[var(--text-muted)]">
                                Auxílio (Vantagem)
                              </label>
                              <select
                                value={draftAssistAttr}
                                onChange={(e) =>
                                  setDraftAssistAttr(e.target.value as AttributeId)
                                }
                                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                              >
                                {ATTRIBUTE_KEYS.map((k) => (
                                  <option key={k} value={k}>
                                    {ATTRIBUTE_META[k].full[language]}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-[10px] text-[var(--text-muted)]">
                                Relacionamento
                              </label>
                              <select
                                value={draftRelationship}
                                onChange={(e) =>
                                  setDraftRelationship(
                                    e.target.value as RelationshipTier,
                                  )
                                }
                                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                              >
                                {RELATIONSHIP_ORDER.map((r) => (
                                  <option key={r} value={r}>
                                    {RELATIONSHIP_META[r].label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="grid gap-2.5 sm:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-[10px] text-[var(--text-muted)]">
                                Papel / Ocupação
                              </label>
                              <input
                                type="text"
                                value={draftRole}
                                onChange={(e) => setDraftRole(e.target.value)}
                                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[10px] text-[var(--text-muted)]">
                                Humor Atual
                              </label>
                              <input
                                type="text"
                                value={draftMood}
                                onChange={(e) => setDraftMood(e.target.value)}
                                placeholder="Ex: Apaixonada, Firme, Cautelosa"
                                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="mb-1 block text-[10px] text-[var(--text-muted)]">
                              Aparência Física (usada no Retrato IA!)
                            </label>
                            <textarea
                              rows={2}
                              value={draftAppearance}
                              onChange={(e) => setDraftAppearance(e.target.value)}
                              placeholder="Ex: Mulher de 1,90m, cabelos escuros longos, olhar intenso, estilo casual esportivo..."
                              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-[10px] text-[var(--text-muted)]">
                              Personalidade
                            </label>
                            <input
                              type="text"
                              value={draftPersonality}
                              onChange={(e) => setDraftPersonality(e.target.value)}
                              placeholder="Ex: Protetora, inteligente, bem-humorada sob pressão..."
                              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                            />
                          </div>

                          <div className="grid gap-2.5 sm:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-[10px] text-[var(--text-muted)]">
                                Habilidades (separadas por vírgula)
                              </label>
                              <input
                                type="text"
                                value={draftSkills}
                                onChange={(e) => setDraftSkills(e.target.value)}
                                placeholder="Ex: Primeiros Socorros, Persuasão, Direção"
                                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[10px] text-[var(--text-muted)]">
                                Traços (separados por vírgula)
                              </label>
                              <input
                                type="text"
                                value={draftTraits}
                                onChange={(e) => setDraftTraits(e.target.value)}
                                placeholder="Ex: Leal, Observadora, Corajosa"
                                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[10px] text-[var(--text-muted)]">
                                Gosta de (aprovação)
                              </label>
                              <input
                                type="text"
                                value={draftLikes}
                                onChange={(e) => setDraftLikes(e.target.value)}
                                placeholder="Ex: Honestidade, Proteger inocentes"
                                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[10px] text-[var(--text-muted)]">
                                Não gosta de (desaprovação)
                              </label>
                              <input
                                type="text"
                                value={draftDislikes}
                                onChange={(e) => setDraftDislikes(e.target.value)}
                                placeholder="Ex: Mentiras, Imprudência"
                                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setIsEditing(false)}
                              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-secondary)]"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={saveEdit}
                              className="inline-flex items-center gap-1 rounded-xl bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-[#111]"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Salvar Ficha
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {/* Relationship Action Buttons */}
                      {selectedNpc.status === 'alive' && !isEnded && !isEditing ? (
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-3">
                          <button
                            type="button"
                            onClick={() => {
                              onTalkToNpc(selectedNpc);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-[#111] transition hover:brightness-110"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>Conversar</span>
                          </button>

                          {canDate ? (
                            <button
                              type="button"
                              onClick={() => {
                                onSpendQualityTime(selectedNpc);
                                onClose();
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-[#f472b6]/55 bg-[#f472b6]/15 px-3.5 py-2 text-xs font-semibold text-[#f472b6] transition hover:bg-[#f472b6]/25"
                            >
                              <Heart className="h-3.5 w-3.5" />
                              <span>
                                {selectedNpc.relationship === 'romance' ||
                                selectedNpc.relationship === 'partner'
                                  ? 'Momento a Dois ♥'
                                  : 'Aprofundar Vínculo'}
                              </span>
                            </button>
                          ) : null}

                          <button
                            type="button"
                            disabled={giftableItems.length === 0}
                            onClick={() => setGiftPickerOpen((v) => !v)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
                          >
                            <Gift className="h-3.5 w-3.5 text-[#fbbf24]" />
                            <span>Presentear Item</span>
                          </button>
                        </div>
                      ) : null}

                      {/* Gift Picker Tray */}
                      {giftPickerOpen && giftableItems.length > 0 ? (
                        <div className="mt-3 rounded-xl border border-[#fbbf24]/40 bg-[var(--bg-surface)] p-3">
                          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-[#fbbf24]">
                            <span>Escolha um item para presentear {selectedNpc.name}:</span>
                            <button
                              type="button"
                              onClick={() => setGiftPickerOpen(false)}
                              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                            {giftableItems.map((it) => (
                              <button
                                key={it.id}
                                type="button"
                                onClick={() => {
                                  onGiftItemToNpc(selectedNpc.id, it.id);
                                  setGiftPickerOpen(false);
                                }}
                                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] text-[var(--text-primary)] transition hover:border-[#fbbf24] hover:text-[#fbbf24]"
                              >
                                {it.name}{' '}
                                <span
                                  className="text-[9px]"
                                  style={{
                                    color: RARITY_META[it.rarity ?? 'common'].color,
                                  }}
                                >
                                  ({RARITY_META[it.rarity ?? 'common'].label})
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Appearance, Personality & Notes */}
                    {(selectedNpc.appearance ||
                      selectedNpc.personality ||
                      selectedNpc.notes) ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {selectedNpc.appearance ? (
                          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5">
                            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                              Aparência & Presença
                            </div>
                            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                              {selectedNpc.appearance}
                            </p>
                          </div>
                        ) : null}
                        {(selectedNpc.personality || selectedNpc.notes) ? (
                          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5">
                            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                              Personalidade & Notas
                            </div>
                            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                              {selectedNpc.personality || selectedNpc.notes}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {/* BG3 Companion Stats: Vigor + 6 Attributes + Skills + Traits */}
                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                          <Sparkles className="h-3.5 w-3.5" />
                          Status BG3 · Nível {selectedNpc.level ?? 1}
                        </span>
                        <span className="font-mono-tech inline-flex items-center gap-1 text-xs text-[var(--success)]">
                          <Activity className="h-3.5 w-3.5" />
                          Vigor {npcVigor}/{npcMaxVigor}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                        {ATTRIBUTE_KEYS.map((k) => {
                          const val = attrs[k] ?? 10;
                          const mod = getAttributeModifier(val);
                          const isAssist = k === assistAttr;
                          return (
                            <div
                              key={k}
                              className={`flex flex-col items-center rounded-xl border px-2 py-2 text-center ${
                                isAssist
                                  ? 'border-[var(--success)]/60 bg-[var(--success)]/10'
                                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'
                              }`}
                            >
                              <span className="text-[10px] font-bold text-[var(--text-muted)]">
                                {ATTRIBUTE_META[k].short[language]}
                              </span>
                              <span className="font-display text-base font-bold text-[var(--text-primary)]">
                                {formatModifier(mod)}
                              </span>
                              <span className="font-mono-tech text-[10px] text-[var(--text-secondary)]">
                                {val}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3.5 grid gap-3 border-t border-[var(--border-subtle)] pt-3 sm:grid-cols-2">
                        <div>
                          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                            Habilidades
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(selectedNpc.skills ?? []).length > 0 ? (
                              selectedNpc.skills!.map((sk) => (
                                <span
                                  key={sk}
                                  className="rounded-lg border border-[var(--accent)]/35 bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]"
                                >
                                  {sk}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-[var(--text-muted)]">
                                Clique em <strong>Editar Ficha</strong> ou interaja para revelar habilidades.
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                            Traços & Preferências
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(selectedNpc.traits ?? []).map((t) => (
                              <span
                                key={t}
                                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]"
                              >
                                {t}
                              </span>
                            ))}
                            {(selectedNpc.likes ?? []).map((l) => (
                              <span
                                key={l}
                                className="inline-flex items-center gap-1 rounded-lg bg-[var(--success)]/12 px-2 py-0.5 text-[10px] font-medium text-[var(--success)]"
                              >
                                <ThumbsUp className="h-2.5 w-2.5" />
                                {l}
                              </span>
                            ))}
                            {(selectedNpc.dislikes ?? []).map((d) => (
                              <span
                                key={d}
                                className="inline-flex items-center gap-1 rounded-lg bg-[var(--danger)]/12 px-2 py-0.5 text-[10px] font-medium text-[var(--danger)]"
                              >
                                <ThumbsDown className="h-2.5 w-2.5" />
                                {d}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bond Memories Timeline */}
                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                      <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Memórias & Histórico do Vínculo (
                        {(selectedNpc.bondMemories ?? []).length})
                      </div>
                      {(selectedNpc.bondMemories ?? []).length === 0 ? (
                        <p className="text-xs text-[var(--text-muted)]">
                          Momentos marcantes, aprovações e presentes com {selectedNpc.name} ficarão registrados aqui.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {selectedNpc.bondMemories!.map((mem, i) => (
                            <div
                              key={i}
                              className="flex items-start justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs"
                            >
                              <span className="text-[var(--text-primary)]">
                                {mem.approved === true ? '♥ ' : mem.approved === false ? '✕ ' : '• '}
                                {mem.text}
                              </span>
                              <span className="font-mono-tech shrink-0 text-[10px] text-[var(--text-muted)]">
                                T{mem.turn}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
