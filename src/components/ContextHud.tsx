import {
  Activity,
  Award,
  Backpack,
  BookOpen,
  Brain,
  Camera,
  CheckCircle2,
  Compass,
  FilePlus2,
  Flag,
  Flame,
  Globe2,
  Key,
  MapPin,
  MessageSquare,
  Navigation,
  Pin,
  Plus,
  Scale,
  ScrollText,
  Shield,
  Sparkles,
  Sword,
  Target,
  Trash2,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { DIFFICULTIES, STORY_PACE_OPTIONS, UI_COPY } from '../data/presets';
import type {
  Campaign,
  FactionStanding,
  InventoryItem,
  ItemCategory,
  LanguageId,
  LocationDanger,
  LocationRecord,
  NpcRecord,
  NpcStance,
} from '../types/game';

interface ContextHudProps {
  campaign: Campaign;
  language: LanguageId;
  isSummarizing: boolean;
  isGeneratingPortrait: boolean;
  onUseItem: (item: InventoryItem) => void;
  onMentionNpc: (npc: NpcRecord) => void;
  onTravelLocation: (loc: LocationRecord) => void;
  onAddCanonFact: (factText: string) => void;
  onRemoveCanonFact: (factId: string) => void;
  onSummarizeNow: () => void;
  onConcludeCampaign: () => void;
  onGeneratePortrait: () => void;
  onZoomImage?: (url: string, caption?: string, engine?: 'gemini' | 'demo') => void;
}

const CATEGORY_ICON: Record<ItemCategory, typeof Sword> = {
  weapon: Sword,
  tool: Wrench,
  relic: Sparkles,
  consumable: Flame,
  clue: Key,
  misc: Backpack,
};

const STANCE_META: Record<
  NpcStance,
  { label: string; color: string; bg: string }
> = {
  ally: { label: 'Aliado', color: 'var(--success)', bg: 'rgba(110, 196, 134, 0.14)' },
  neutral: { label: 'Neutro', color: 'var(--text-secondary)', bg: 'var(--bg-surface)' },
  suspicious: { label: 'Suspeito', color: 'var(--warning)', bg: 'rgba(234, 179, 8, 0.14)' },
  hostile: { label: 'Hostil', color: 'var(--danger)', bg: 'rgba(224, 93, 82, 0.14)' },
  unknown: { label: 'Incerto', color: 'var(--text-muted)', bg: 'var(--bg-surface)' },
};

const FACTION_META: Record<
  FactionStanding,
  { label: string; color: string; bg: string }
> = {
  allied: { label: 'Aliada', color: 'var(--success)', bg: 'rgba(110, 196, 134, 0.14)' },
  neutral: { label: 'Neutra', color: 'var(--text-secondary)', bg: 'var(--bg-surface)' },
  wary: { label: 'Cautelosa', color: 'var(--warning)', bg: 'rgba(234, 179, 8, 0.14)' },
  hostile: { label: 'Hostil', color: 'var(--danger)', bg: 'rgba(224, 93, 82, 0.14)' },
};

const DANGER_META: Record<LocationDanger, { label: string; color: string }> = {
  safe: { label: 'Seguro', color: 'var(--success)' },
  tense: { label: 'Tenso', color: 'var(--warning)' },
  hostile: { label: 'Hostil', color: 'var(--danger)' },
};

export function ContextHud({
  campaign,
  language,
  isSummarizing,
  isGeneratingPortrait,
  onUseItem,
  onMentionNpc,
  onTravelLocation,
  onAddCanonFact,
  onRemoveCanonFact,
  onSummarizeNow,
  onConcludeCampaign,
  onGeneratePortrait,
  onZoomImage,
}: ContextHudProps) {
  const [activeTab, setActiveTab] = useState<
    'sheet' | 'pack' | 'world' | 'quests' | 'chronicle'
  >('sheet');
  const [worldSubTab, setWorldSubTab] = useState<'lore' | 'memory' | 'codex'>('lore');
  const [newFactInput, setNewFactInput] = useState('');

  const copy = UI_COPY[language];
  const { player, codex, world } = campaign;
  const difficultyMeta = DIFFICULTIES.find((d) => d.id === campaign.difficulty);
  const paceMeta = STORY_PACE_OPTIONS.find((p) => p.id === world.storyPace);

  const initials = player.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  const activeQuests = player.quests.filter((q) => q.status === 'active');
  const resolvedQuests = player.quests.filter((q) => q.status !== 'active');
  const worldCount =
    codex.npcs.length + codex.locations.length + codex.canonFacts.length;
  const isEnded =
    campaign.status === 'ended_fallen' || campaign.status === 'ended_victory';

  const handlePinFact = () => {
    const trimmed = newFactInput.trim();
    if (!trimmed) return;
    onAddCanonFact(trimmed);
    setNewFactInput('');
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 shadow-[var(--shadow-card)] backdrop-blur-md">
      {/* Main 5 Tabs */}
      <div className="grid grid-cols-5 gap-1 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/45 p-1.5">
        {(
          [
            { id: 'sheet', label: copy.sheetTab, icon: Shield },
            { id: 'pack', label: copy.inventoryTab, icon: Backpack, count: player.inventory.length },
            { id: 'world', label: copy.worldTab, icon: Globe2, count: worldCount },
            { id: 'quests', label: copy.questsTab, icon: Target, count: activeQuests.length },
            { id: 'chronicle', label: copy.chronicleTab, icon: BookOpen, count: player.journal.length + campaign.eraSummaries.length },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition ${
                active
                  ? 'border border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
              }`}
            >
              <div className="relative">
                <Icon className="h-3.5 w-3.5" />
                {'count' in tab && tab.count > 0 ? (
                  <span className="font-mono-tech absolute -top-1.5 -right-2.5 rounded-full bg-[var(--bg-elevated)] px-1 text-[9px] text-[var(--text-secondary)]">
                    {tab.count}
                  </span>
                ) : null}
              </div>
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'sheet' ? (
          <div className="space-y-5">
            {/* Portrait / Crest + Identity */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3.5">
                {player.portraitUrl ? (
                  <button
                    type="button"
                    onClick={() =>
                      onZoomImage?.(
                        player.portraitUrl!,
                        `${player.name} · ${player.occupation}`,
                        player.portraitEngine,
                      )
                    }
                    title="Ampliar retrato"
                    className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-md transition hover:border-[var(--accent)]"
                  >
                    <img
                      src={player.portraitUrl}
                      alt={player.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </button>
                ) : (
                  <div className="font-display flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--accent-soft)] text-base font-bold text-[var(--accent)]">
                    {initials || 'M'}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-[var(--text-primary)]">
                    {player.name}
                  </h3>
                  <p className="truncate text-xs text-[var(--text-secondary)]">
                    {player.occupation} · {player.age} anos
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isGeneratingPortrait}
                onClick={onGeneratePortrait}
                title={player.portraitUrl ? 'Gerar novo retrato' : 'Gerar retrato do personagem'}
                className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--accent)] transition hover:border-[var(--accent)] disabled:opacity-50"
              >
                <Camera className={`h-3.5 w-3.5 ${isGeneratingPortrait ? 'animate-spin' : ''}`} />
                <span>{isGeneratingPortrait ? '...' : player.portraitUrl ? 'Novo' : 'Retrato'}</span>
              </button>
            </div>

            {/* Vigor & Tension Bars */}
            <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
                    <Activity className="h-3.5 w-3.5 text-[var(--success)]" />
                    Vigor
                  </span>
                  <span className="font-mono-tech text-[var(--text-primary)]">
                    {player.vigor}/{player.maxVigor}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-canvas)]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(0, Math.min(100, (player.vigor / player.maxVigor) * 100))}%`,
                      backgroundColor:
                        player.vigor > 55
                          ? 'var(--success)'
                          : player.vigor > 28
                            ? 'var(--warning)'
                            : 'var(--danger)',
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
                    <Flame className="h-3.5 w-3.5 text-[var(--warning)]" />
                    Tensão da Cena
                  </span>
                  <span className="font-mono-tech text-[var(--text-primary)]">
                    {player.tension}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-canvas)]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(0, Math.min(100, player.tension))}%`,
                      backgroundColor:
                        player.tension >= 85 ? 'var(--danger)' : 'var(--accent)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Difficulty & Arc Badge */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2">
                <div className="text-[10px] text-[var(--text-muted)]">Destino</div>
                <div className="font-mono-tech mt-0.5 font-semibold text-[var(--accent)]">
                  {difficultyMeta?.label[language]}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2">
                <div className="text-[10px] text-[var(--text-muted)]">Livro / Arco</div>
                <div className="font-mono-tech mt-0.5 font-semibold text-[var(--text-primary)]">
                  Arco {campaign.arcNumber} · Cap. {campaign.currentChapter}
                </div>
              </div>
            </div>

            {/* Traits */}
            <div>
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Traços
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {player.traits.length > 0 ? (
                  player.traits.map((trait) => (
                    <span
                      key={trait}
                      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs text-[var(--text-secondary)]"
                    >
                      {trait}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">—</span>
                )}
              </div>
            </div>

            {/* Skills */}
            <div>
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Perícias (+2 em testes)
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {player.skills.length > 0 ? (
                  player.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)]"
                    >
                      <span className="font-mono-tech text-[10px] text-[var(--accent)]">+2</span>
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">—</span>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'pack' ? (
          <div className="space-y-2.5">
            {player.inventory.length === 0 ? (
              <p className="py-6 text-center text-xs text-[var(--text-muted)]">
                Sua mochila está vazia.
              </p>
            ) : (
              player.inventory.map((item) => {
                const Icon = CATEGORY_ICON[item.category] ?? Backpack;
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 transition hover:border-[var(--border-strong)]"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">
                          {item.name}
                          {item.quantity > 1 ? (
                            <span className="font-mono-tech ml-1.5 text-[var(--accent)]">
                              x{item.quantity}
                            </span>
                          ) : null}
                        </div>
                        {item.note ? (
                          <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-muted)]">
                            {item.note}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isEnded}
                      onClick={() => onUseItem(item)}
                      className="mt-2.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] py-1.5 text-[11px] font-medium text-[var(--accent)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] disabled:opacity-40"
                    >
                      {copy.useInAction}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        ) : null}

        {/* WORLD TAB: Lore + Memória IA + Códice */}
        {activeTab === 'world' ? (
          <div className="space-y-4">
            {/* Sub-pills */}
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/60 p-1">
              {(
                [
                  { id: 'lore', label: 'Lore' },
                  { id: 'memory', label: `Memória (${codex.canonFacts.length})` },
                  { id: 'codex', label: `Códice (${codex.npcs.length})` },
                ] as const
              ).map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setWorldSubTab(sub.id)}
                  className={`rounded-lg py-1.5 text-[11px] font-semibold transition ${
                    worldSubTab === sub.id
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {worldSubTab === 'lore' ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5">
                  <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                    <span>{world.era}</span>
                    <span>{paceMeta?.label[language]}</span>
                  </div>
                  <h4 className="font-display mt-1.5 text-sm font-semibold text-[var(--text-primary)]">
                    História do Mundo
                  </h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                    {world.history || world.premise}
                  </p>
                </div>

                {world.worldLaws ? (
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                      <Scale className="h-3.5 w-3.5 text-[var(--accent)]" />
                      Leis deste Universo
                    </h4>
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                      {world.worldLaws}
                    </p>
                  </div>
                ) : null}

                {world.creativePrompt ? (
                  <div className="rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] p-3.5">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Inspiração & Direção Criativa
                    </h4>
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-primary)]">
                      {world.creativePrompt}
                    </p>
                  </div>
                ) : null}

                <div>
                  <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    <Flag className="h-3.5 w-3.5 text-[var(--accent)]" />
                    Facções em Conflito ({codex.factions.length})
                  </h4>
                  <div className="space-y-2">
                    {codex.factions.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)]">
                        Nenhuma facção registrada ainda.
                      </p>
                    ) : (
                      codex.factions.map((fac) => {
                        const meta = FACTION_META[fac.standing] ?? FACTION_META.neutral;
                        return (
                          <div
                            key={fac.id}
                            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-[var(--text-primary)]">
                                {fac.name}
                              </span>
                              <span
                                className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
                                style={{ color: meta.color, backgroundColor: meta.bg }}
                              >
                                {meta.label}
                              </span>
                            </div>
                            {fac.description ? (
                              <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                                {fac.description}
                              </p>
                            ) : null}
                            <div className="mt-1.5 text-[10px] text-[var(--accent)]">
                              Influência: {fac.influence}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {worldSubTab === 'memory' ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--accent-soft)] p-3 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                  <div className="mb-1 flex items-center gap-1.5 font-semibold text-[var(--accent)]">
                    <Brain className="h-3.5 w-3.5" />
                    Memória Persistente da IA
                  </div>
                  A IA consulta todos estes fatos em cada turno — inclusive depois de você salvar e carregar semanas depois.
                </div>

                {/* Add custom fact */}
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newFactInput}
                    onChange={(e) => setNewFactInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePinFact()}
                    placeholder="Fixar fato importante para a IA lembrar..."
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    type="button"
                    onClick={handlePinFact}
                    title="Fixar fato"
                    className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2.5 text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Canon Facts */}
                <div className="space-y-2">
                  {codex.canonFacts.length === 0 ? (
                    <p className="py-4 text-center text-xs text-[var(--text-muted)]">
                      Nenhum fato fixado ainda.
                    </p>
                  ) : (
                    codex.canonFacts.map((fact) => (
                      <div
                        key={fact.id}
                        className="flex items-start justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2.5"
                      >
                        <div className="flex items-start gap-2">
                          <Pin className="mt-0.5 h-3 w-3 shrink-0 text-[var(--accent)]" />
                          <div>
                            <p className="text-[11px] leading-relaxed text-[var(--text-primary)]">
                              {fact.text}
                            </p>
                            <span className="font-mono-tech text-[9px] text-[var(--text-muted)]">
                              Turno {fact.turn}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveCanonFact(fact.id)}
                          className="shrink-0 p-1 text-[var(--text-muted)] hover:text-[var(--danger)]"
                          title="Remover fato"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Past Era Archives */}
                {campaign.eraSummaries.length > 0 ? (
                  <div className="space-y-2 border-t border-[var(--border-subtle)] pt-3">
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Arquivos de Arcos Anteriores ({campaign.eraSummaries.length})
                    </h4>
                    {campaign.eraSummaries.map((era) => (
                      <div
                        key={era.id}
                        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 p-3"
                      >
                        <div className="text-[11px] font-semibold text-[var(--accent)]">
                          {era.title}
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                          {era.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {worldSubTab === 'codex' ? (
              <div className="space-y-5">
                {/* NPCs */}
                <div>
                  <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Pessoas & Relações ({codex.npcs.length})
                  </h4>
                  {codex.npcs.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[var(--border-subtle)] p-4 text-center text-xs text-[var(--text-muted)]">
                      Nenhum NPC registrado ainda.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {codex.npcs.map((npc) => {
                        const stance = STANCE_META[npc.stance] ?? STANCE_META.neutral;
                        const npcInitials = npc.name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((p) => p[0]?.toUpperCase() ?? '')
                          .join('');
                        return (
                          <div
                            key={npc.id}
                            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <span className="font-display flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
                                  {npcInitials || '?'}
                                </span>
                                <div className="min-w-0">
                                  <div className="truncate text-xs font-semibold text-[var(--text-primary)]">
                                    {npc.name}
                                  </div>
                                  <div className="truncate text-[11px] text-[var(--text-muted)]">
                                    {npc.role}
                                  </div>
                                </div>
                              </div>
                              <span
                                className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold"
                                style={{ color: stance.color, backgroundColor: stance.bg }}
                              >
                                {npc.status === 'dead'
                                  ? 'Morto'
                                  : npc.status === 'missing'
                                    ? 'Sumido'
                                    : stance.label}
                              </span>
                            </div>

                            {npc.notes ? (
                              <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                                {npc.notes}
                              </p>
                            ) : null}

                            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-2">
                              <span className="truncate text-[10px] text-[var(--text-muted)]">
                                Visto em: {npc.lastSeenLocation}
                              </span>
                              {npc.status === 'alive' && !isEnded ? (
                                <button
                                  type="button"
                                  onClick={() => onMentionNpc(npc)}
                                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-[10px] font-medium text-[var(--accent)] hover:border-[var(--accent)]"
                                >
                                  <MessageSquare className="h-2.5 w-2.5" />
                                  Interagir
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Atlas of Locations */}
                <div>
                  <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Atlas de Locais ({codex.locations.length})
                  </h4>
                  <div className="space-y-2">
                    {codex.locations.map((loc) => {
                      const isCurrent =
                        loc.name.toLowerCase() === campaign.currentLocation.toLowerCase();
                      const danger = DANGER_META[loc.danger] ?? DANGER_META.tense;
                      return (
                        <div
                          key={loc.id}
                          className={`rounded-xl border p-3 ${
                            isCurrent
                              ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <MapPin
                                className={`h-3.5 w-3.5 shrink-0 ${
                                  isCurrent ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                                }`}
                              />
                              <span className="text-xs font-semibold text-[var(--text-primary)]">
                                {loc.name}
                              </span>
                            </div>
                            <span
                              className="text-[10px] font-semibold"
                              style={{ color: danger.color }}
                            >
                              {danger.label}
                            </span>
                          </div>
                          {loc.description ? (
                            <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                              {loc.description}
                            </p>
                          ) : null}
                          {!isCurrent && !isEnded ? (
                            <button
                              type="button"
                              onClick={() => onTravelLocation(loc)}
                              className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-[var(--accent)] hover:underline"
                            >
                              <Navigation className="h-2.5 w-2.5" />
                              Seguir para este local
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'quests' ? (
          <div className="space-y-4">
            <div className="space-y-2.5">
              {activeQuests.length === 0 ? (
                <p className="py-6 text-center text-xs text-[var(--text-muted)]">
                  Nenhum objetivo ativo no momento.
                </p>
              ) : (
                activeQuests.map((q) => (
                  <div
                    key={q.id}
                    className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-3.5"
                  >
                    <div className="flex items-start gap-2">
                      <Compass className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">
                          {q.title}
                        </div>
                        {q.description ? (
                          <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                            {q.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {resolvedQuests.length > 0 ? (
              <div className="space-y-2 border-t border-[var(--border-subtle)] pt-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Histórico
                </span>
                {resolvedQuests.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-start gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/40 px-3 py-2 text-xs text-[var(--text-muted)]"
                  >
                    {q.status === 'completed' ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--success)]" />
                    ) : (
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--danger)]" />
                    )}
                    <span className="line-through">{q.title}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'chronicle' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                disabled={isSummarizing || campaign.entries.length === 0}
                onClick={onSummarizeNow}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--accent-soft)] py-2 text-xs font-semibold text-[var(--accent)] transition hover:brightness-110 disabled:opacity-50"
              >
                <FilePlus2 className="h-3.5 w-3.5" />
                <span>{isSummarizing ? 'Arquivando...' : copy.summarizeNow}</span>
              </button>

              {!isEnded ? (
                <button
                  type="button"
                  disabled={campaign.turnCount < 1}
                  onClick={onConcludeCampaign}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-2 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
                >
                  <Award className="h-3.5 w-3.5" />
                  <span>Encerrar & Gerar Epílogo</span>
                </button>
              ) : null}
            </div>

            {campaign.eraSummaries.length > 0 ? (
              <div className="space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  Livros / Arcos Anteriores
                </span>
                {campaign.eraSummaries.map((era) => (
                  <div
                    key={era.id}
                    className="rounded-xl border border-[var(--border-strong)] bg-[var(--accent-soft)] p-3"
                  >
                    <div className="text-xs font-semibold text-[var(--text-primary)]">
                      {era.title}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                      {era.summary}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {player.journal.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-4 text-center text-xs leading-relaxed text-[var(--text-muted)]">
                A crônica resume os últimos capítulos automaticamente a cada 5 turnos, arquivando eras completas sem perder a memória do mundo.
              </div>
            ) : (
              <div className="relative space-y-4 border-l border-[var(--border-strong)] pl-4">
                {player.journal.map((entry) => (
                  <div key={entry.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border border-[var(--bg-surface)] bg-[var(--accent)]" />
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono-tech text-[10px] uppercase tracking-wider text-[var(--accent)]">
                        Cap. {entry.chapter} · {entry.turnRange}
                      </span>
                    </div>
                    <h4 className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                      <ScrollText className="h-3 w-3 text-[var(--accent)]" />
                      {entry.title}
                    </h4>
                    <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                      {entry.summary}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
