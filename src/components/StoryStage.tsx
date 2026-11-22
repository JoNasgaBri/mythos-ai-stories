import {
  AlertTriangle,
  BookOpen,
  Compass,
  Dices,
  Eye,
  Flag,
  Flame,
  Footprints,
  ImagePlus,
  Maximize2,
  MessageSquare,
  PanelRightOpen,
  Pencil,
  Scale,
  Send,
  Shield,
  Skull,
  Sparkles,
  Swords,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { INTENT_LABELS, UI_COPY } from '../data/presets';
import { DIFFICULTY_DC, formatOutcomeLabel } from '../engine/diceEngine';
import type {
  ActionIntent,
  ActionRisk,
  Campaign,
  InventoryItem,
  LanguageId,
  LocationRecord,
  NpcRecord,
  TacticalAction,
} from '../types/game';
import { ContextHud } from './ContextHud';
import { EpiloguePanel } from './EpiloguePanel';

interface StoryStageProps {
  campaign: Campaign;
  language: LanguageId;
  focusMode: boolean;
  isBusy: boolean;
  isSummarizing: boolean;
  illustratingEntryId: string | null;
  isGeneratingPortrait: boolean;
  onSendAction: (
    text: string,
    intent?: ActionIntent,
    risk?: ActionRisk,
  ) => void;
  onTypingActivity: () => void;
  onSummarizeNow: () => void;
  onAddCanonFact: (factText: string) => void;
  onRemoveCanonFact: (factId: string) => void;
  onResolveVigorCrisis: (
    choice: 'survival_roll' | 'use_consumable' | 'accept_end',
    consumable?: InventoryItem,
  ) => void;
  onConcludeCampaign: () => void;
  onIllustrateEntry: (entryId: string) => void;
  onGeneratePortrait: () => void;
  onOpenSaves: () => void;
  onExportCampaign: () => void;
  onBackHome: () => void;
}

const INTENT_ICON: Record<ActionIntent, typeof Swords> = {
  bold: Swords,
  stealth: Footprints,
  diplomatic: MessageSquare,
  investigate: Eye,
  survival: Shield,
  item: Sparkles,
};

const RISK_DOT_COLOR: Record<ActionRisk, string> = {
  safe: 'var(--success)',
  low: 'var(--accent)',
  medium: 'var(--warning)',
  high: 'var(--danger)',
};

export function StoryStage({
  campaign,
  language,
  focusMode,
  isBusy,
  isSummarizing,
  illustratingEntryId,
  isGeneratingPortrait,
  onSendAction,
  onTypingActivity,
  onSummarizeNow,
  onAddCanonFact,
  onRemoveCanonFact,
  onResolveVigorCrisis,
  onConcludeCampaign,
  onIllustrateEntry,
  onGeneratePortrait,
  onOpenSaves,
  onExportCampaign,
  onBackHome,
}: StoryStageProps) {
  const copy = UI_COPY[language];
  const [inputText, setInputText] = useState('');
  const [selectedIntent, setSelectedIntent] = useState<ActionIntent>('bold');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [mobileHudOpen, setMobileHudOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    caption?: string;
    engine?: 'gemini' | 'demo';
  } | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [campaign.entries.length, isBusy, campaign.status]);

  useEffect(() => {
    if (!lightboxImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxImage(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxImage]);

  const isEnded =
    campaign.status === 'ended_fallen' || campaign.status === 'ended_victory';
  const isVigorCrisis = campaign.status === 'crisis_vigor';
  const isTensionCrisis = campaign.status === 'crisis_tension';
  const consumables = campaign.player.inventory.filter(
    (item) => item.category === 'consumable',
  );

  const handleSubmit = () => {
    const trimmed = inputText.trim();
    if (!trimmed && !selectedItem) return;
    if (isBusy || isEnded || isVigorCrisis) return;

    const finalPrompt = selectedItem
      ? trimmed
        ? `Usar ${selectedItem.name}: ${trimmed}`
        : `Usar ${selectedItem.name} na cena atual`
      : trimmed;

    const intentToUse = selectedItem ? 'item' : selectedIntent;
    const riskToUse: ActionRisk = selectedIntent === 'investigate' ? 'low' : 'medium';

    setInputText('');
    setSelectedItem(null);
    onSendAction(finalPrompt, intentToUse, riskToUse);
  };

  const handleUseItemFromHud = (item: InventoryItem) => {
    setSelectedItem(item);
    setMobileHudOpen(false);
    textareaRef.current?.focus();
  };

  const handleMentionNpcFromHud = (npc: NpcRecord) => {
    setSelectedIntent('diplomatic');
    setInputText((prev) =>
      prev.trim() ? `${prev.trim()} (${npc.name})` : `Falar com ${npc.name}: `,
    );
    setMobileHudOpen(false);
    textareaRef.current?.focus();
  };

  const handleTravelFromHud = (loc: LocationRecord) => {
    setSelectedIntent('stealth');
    setInputText(`Seguir em direção a ${loc.name}`);
    setMobileHudOpen(false);
    textareaRef.current?.focus();
  };

  const handleActionCardClick = (action: TacticalAction) => {
    if (isBusy || isEnded || isVigorCrisis) return;
    onSendAction(action.label, action.intent, action.risk);
  };

  const handleCustomizeAction = (
    e: React.MouseEvent,
    action: TacticalAction,
  ) => {
    e.stopPropagation();
    setSelectedIntent(action.intent);
    setInputText(action.label);
    textareaRef.current?.focus();
  };

  const renderProseParagraphs = (text: string, useDropCap: boolean) => {
    const paragraphs = text.split(/\n+/).filter(Boolean);
    return paragraphs.map((para, idx) => (
      <p
        key={idx}
        className={`font-prose text-[var(--text-primary)] ${
          idx > 0 ? 'mt-4' : ''
        } ${useDropCap && idx === 0 ? 'story-dropcap' : ''}`}
      >
        {para}
      </p>
    ));
  };

  const firstNarratorIndex = campaign.entries.findIndex(
    (e) => e.role === 'narrator',
  );

  return (
    <div className="relative z-10 mx-auto flex h-[calc(100vh-3.5rem)] max-w-[1440px] gap-6 px-4 py-4 sm:px-6">
      {/* Main Narrative Theater */}
      <section className="flex min-w-0 flex-1 flex-col">
        {/* Scrollable Editorial Chronicle */}
        <div className="flex-1 overflow-y-auto pr-1 pb-6">
          <div className="mx-auto max-w-[740px] space-y-6 pt-2">
            {campaign.entries.map((entry, idx) => {
              if (entry.role === 'prologue') {
                const isIllustrating = illustratingEntryId === entry.id;
                return (
                  <article
                    key={entry.id}
                    className="animate-beat-enter overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-[var(--shadow-elevated)]"
                  >
                    {isIllustrating ? (
                      <div className="animate-shimmer aspect-video w-full" />
                    ) : entry.imageUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxImage({
                            url: entry.imageUrl!,
                            caption: entry.imageCaption || campaign.world.title,
                            engine: entry.imageEngine,
                          })
                        }
                        className="group relative block aspect-video w-full overflow-hidden bg-[var(--bg-elevated)] text-left"
                      >
                        <img
                          src={entry.imageUrl}
                          alt={entry.imageCaption || campaign.world.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-surface)] via-transparent to-black/30" />
                        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                          <Maximize2 className="h-3 w-3" />
                          {entry.imageEngine === 'gemini' ? 'Nano Banana 2.1' : 'Arte Demo'}
                        </span>
                      </button>
                    ) : null}

                    <div className="border-b border-[var(--border-subtle)] bg-[var(--accent-soft)] px-6 py-4 sm:px-8">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Prólogo · Crônica do Mundo</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[var(--text-secondary)]">
                            {campaign.world.era}
                          </span>
                          <button
                            type="button"
                            disabled={Boolean(illustratingEntryId)}
                            onClick={() => onIllustrateEntry(entry.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent)] transition hover:bg-[var(--bg-elevated)] disabled:opacity-45"
                          >
                            <ImagePlus className="h-3 w-3" />
                            <span>{entry.imageUrl ? 'Regerar' : 'Ilustrar'}</span>
                          </button>
                        </div>
                      </div>
                      <h1 className="font-display mt-1.5 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">
                        {campaign.world.title}
                      </h1>
                    </div>

                    <div className="p-6 sm:p-8">
                      <div>{renderProseParagraphs(entry.text, true)}</div>

                      {(campaign.world.worldLaws || campaign.codex.factions.length > 0) ? (
                        <div className="mt-6 grid gap-3 border-t border-[var(--border-subtle)] pt-5 sm:grid-cols-2">
                          {campaign.world.worldLaws ? (
                            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5">
                              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                                <Scale className="h-3.5 w-3.5" />
                                <span>Leis deste Universo</span>
                              </div>
                              <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                                {campaign.world.worldLaws}
                              </p>
                            </div>
                          ) : null}

                          {campaign.codex.factions.length > 0 ? (
                            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5">
                              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                                <Flag className="h-3.5 w-3.5" />
                                <span>Forças & Facções</span>
                              </div>
                              <ul className="space-y-1 text-xs text-[var(--text-secondary)]">
                                {campaign.codex.factions.slice(0, 4).map((fac) => (
                                  <li key={fac.id}>
                                    <strong className="text-[var(--text-primary)]">{fac.name}:</strong>{' '}
                                    {fac.influence}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              }

              if (entry.role === 'player') {
                return (
                  <div
                    key={entry.id}
                    className="animate-beat-enter flex items-start gap-2.5 border-l-2 border-[var(--accent)]/60 py-1 pl-4"
                  >
                    <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                      ▸ Você
                    </span>
                    <div className="space-y-1.5">
                      <p className="text-sm italic leading-relaxed text-[var(--text-secondary)] sm:text-base">
                        {entry.text}
                      </p>
                      {entry.diceRoll ? (
                        <div className="font-mono-tech inline-flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px]">
                          <Dices className="h-3.5 w-3.5 text-[var(--accent)]" />
                          <span className="text-[var(--text-secondary)]">
                            d20 ({entry.diceRoll.roll})
                            {entry.diceRoll.bonus > 0
                              ? ` + ${entry.diceRoll.bonus} (${entry.diceRoll.bonusSource})`
                              : ''}{' '}
                            = <strong className="text-[var(--text-primary)]">{entry.diceRoll.total}</strong> vs DC {entry.diceRoll.dc}
                          </span>
                          <span
                            className="font-semibold"
                            style={{
                              color:
                                entry.diceRoll.outcome === 'critical_success' ||
                                entry.diceRoll.outcome === 'success'
                                  ? 'var(--success)'
                                  : entry.diceRoll.outcome === 'partial'
                                    ? 'var(--warning)'
                                    : 'var(--danger)',
                            }}
                          >
                            · {formatOutcomeLabel(entry.diceRoll.outcome, language)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              }

              if (entry.role === 'pulse') {
                return (
                  <div
                    key={entry.id}
                    className="animate-beat-enter rounded-2xl border border-[var(--warning)]/30 bg-[var(--bg-surface)]/80 px-5 py-4"
                  >
                    <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--warning)]">
                      <Flame className="h-3.5 w-3.5" />
                      <span>Pulso do Mundo Vivo</span>
                    </div>
                    <p className="font-prose text-[var(--text-secondary)]">{entry.text}</p>
                  </div>
                );
              }

              if (entry.role === 'system') {
                return (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-dashed border-[var(--border-subtle)] px-4 py-2 text-center text-xs text-[var(--text-muted)]"
                  >
                    {entry.text}
                  </div>
                );
              }

              // Narrator entry
              const prevNarrator = campaign.entries
                .slice(0, idx)
                .reverse()
                .find((e) => e.role === 'narrator');
              const showSceneHeader =
                idx === firstNarratorIndex ||
                (entry.sceneTitle && entry.sceneTitle !== prevNarrator?.sceneTitle);

              const isIllustrating = illustratingEntryId === entry.id;

              return (
                <article
                  key={entry.id}
                  className="group animate-beat-enter overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/70 shadow-[var(--shadow-card)]"
                >
                  {isIllustrating ? (
                    <div className="animate-shimmer aspect-video w-full" />
                  ) : entry.imageUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxImage({
                          url: entry.imageUrl!,
                          caption: entry.imageCaption || entry.sceneTitle || campaign.currentLocation,
                          engine: entry.imageEngine,
                        })
                      }
                      className="group/img relative block aspect-video w-full overflow-hidden bg-[var(--bg-elevated)] text-left"
                    >
                      <img
                        src={entry.imageUrl}
                        alt={entry.imageCaption || entry.sceneTitle || 'Cena'}
                        className="h-full w-full object-cover transition duration-500 group-hover/img:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-surface)] via-transparent to-black/25" />
                      <div className="absolute right-3 bottom-2.5 left-3 flex items-center justify-between text-[11px] text-white/90">
                        <span className="truncate rounded-full bg-black/55 px-2.5 py-0.5 backdrop-blur-sm">
                          {entry.imageCaption || entry.location}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-0.5 text-[10px] backdrop-blur-sm">
                          <Maximize2 className="h-2.5 w-2.5" />
                          {entry.imageEngine === 'gemini' ? 'Nano Banana 2.1' : 'Arte Demo'}
                        </span>
                      </div>
                    </button>
                  ) : null}

                  <div className="p-5 sm:p-7">
                    <header className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
                      <div className="flex items-center gap-2">
                        <Compass className="h-4 w-4 text-[var(--accent)]" />
                        <h2 className="font-display text-sm font-semibold tracking-wider text-[var(--accent)] uppercase">
                          {showSceneHeader
                            ? entry.sceneTitle || campaign.world.title
                            : `${entry.location || campaign.currentLocation} · Turno ${entry.turn}`}
                        </h2>
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.mood ? (
                          <span className="rounded-full bg-[var(--bg-elevated)] px-2.5 py-0.5 text-[11px] text-[var(--text-muted)]">
                            {entry.mood}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          disabled={Boolean(illustratingEntryId)}
                          onClick={() => onIllustrateEntry(entry.id)}
                          title="Gerar ilustração desta cena"
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-45"
                        >
                          <ImagePlus className="h-3 w-3" />
                          <span>{entry.imageUrl ? 'Regerar' : 'Ilustrar'}</span>
                        </button>
                      </div>
                    </header>

                    <div>{renderProseParagraphs(entry.text, idx === firstNarratorIndex)}</div>

                    {entry.deltas && entry.deltas.length > 0 ? (
                      <footer className="mt-4 flex flex-wrap gap-1.5 border-t border-[var(--border-subtle)] pt-3">
                        {entry.deltas.map((d, dIdx) => (
                          <span
                            key={dIdx}
                            className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                              d.positive
                                ? 'border-[var(--success)]/35 bg-[var(--success)]/10 text-[var(--success)]'
                                : 'border-[var(--danger)]/35 bg-[var(--danger)]/10 text-[var(--danger)]'
                            }`}
                          >
                            {d.label}
                          </span>
                        ))}
                      </footer>
                    ) : null}
                  </div>
                </article>
              );
            })}

            {isEnded && campaign.epilogue ? (
              <EpiloguePanel
                epilogue={campaign.epilogue}
                onOpenSaves={onOpenSaves}
                onExport={onExportCampaign}
                onBackHome={onBackHome}
              />
            ) : null}

            {isBusy ? (
              <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 px-5 py-4 text-sm text-[var(--text-secondary)]">
                <span className="h-2.5 w-2.5 animate-ping rounded-full bg-[var(--accent)]" />
                <span className="font-prose italic">{copy.weaving}</span>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Bottom Command Dock */}
        {!isEnded ? (
          <div className="mx-auto w-full max-w-[740px] shrink-0 pt-2">
            {isVigorCrisis ? (
              <div className="animate-beat-enter rounded-2xl border border-[var(--danger)]/60 bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-elevated)]">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--danger)]/15 text-[var(--danger)]">
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <h3 className="font-display text-base font-semibold text-[var(--danger)]">
                      À Beira do Colapso · Vigor 0
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                      Seu personagem atingiu o limite físico. Role um Teste de Sobrevivência (d20 vs DC {DIFFICULTY_DC[campaign.difficulty]}), consuma um suprimento de emergência ou aceite o desfecho trágico.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onResolveVigorCrisis('survival_roll')}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-semibold text-[var(--accent-contrast)] transition hover:brightness-110 disabled:opacity-50"
                      >
                        <Dices className="h-4 w-4" />
                        <span>Rolar Teste de Sobrevivência (d20)</span>
                      </button>

                      {consumables.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            onResolveVigorCrisis('use_consumable', item)
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--success)]/50 bg-[var(--success)]/15 px-3.5 py-2.5 text-xs font-semibold text-[var(--success)] transition hover:brightness-110 disabled:opacity-50"
                        >
                          <Flame className="h-3.5 w-3.5" />
                          <span>Usar {item.name} (+30 Vigor)</span>
                        </button>
                      ))}

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onResolveVigorCrisis('accept_end')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--danger)]/50 bg-[var(--danger)]/10 px-3.5 py-2.5 text-xs font-medium text-[var(--danger)] transition hover:bg-[var(--danger)]/20 disabled:opacity-50"
                      >
                        <Skull className="h-3.5 w-3.5" />
                        <span>Aceitar o Destino</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {isTensionCrisis ? (
                  <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-[var(--warning)]/60 bg-[var(--warning)]/12 px-4 py-2.5 text-xs text-[var(--warning)]">
                    <Zap className="h-4 w-4 shrink-0" />
                    <span>
                      <strong>Ponto de Ruptura (Tensão 100%):</strong> sua próxima ação desencadeia uma virada climática decisiva na cena!
                    </span>
                  </div>
                ) : null}

                {campaign.actions.length > 0 ? (
                  <div className="mb-3 grid gap-2 sm:grid-cols-2">
                    {campaign.actions.map((action) => {
                      const Icon = INTENT_ICON[action.intent] ?? Sparkles;
                      return (
                        <div
                          key={action.id}
                          onClick={() => handleActionCardClick(action)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleActionCardClick(action);
                            }
                          }}
                          className={`group flex cursor-pointer items-start justify-between gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 p-3 text-left transition hover:border-[var(--accent)] hover:bg-[var(--bg-elevated)] ${
                            isBusy ? 'pointer-events-none opacity-50' : ''
                          }`}
                        >
                          <div className="flex min-w-0 items-start gap-2.5">
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                              <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                                <span>{INTENT_LABELS[action.intent][language]}</span>
                                <span
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: RISK_DOT_COLOR[action.risk] }}
                                  title={`Risco: ${action.risk}`}
                                />
                              </div>
                              <p className="text-xs leading-snug font-medium text-[var(--text-primary)]">
                                {action.label}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleCustomizeAction(e, action)}
                            title="Editar ação antes de enviar"
                            className="shrink-0 rounded-md p-1 text-[var(--text-muted)] opacity-60 transition hover:bg-[var(--bg-canvas)] hover:text-[var(--accent)] group-hover:opacity-100"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {/* Spotlight Command Bar */}
                <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-2.5 shadow-[var(--shadow-elevated)]">
                  <div className="mb-2 flex flex-wrap items-center gap-1.5 px-1">
                    {(
                      [
                        { id: 'bold', label: 'Agir' },
                        { id: 'diplomatic', label: 'Falar' },
                        { id: 'investigate', label: 'Investigar' },
                        { id: 'stealth', label: 'Furtivo' },
                      ] as Array<{ id: ActionIntent; label: string }>
                    ).map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setSelectedIntent(mode.id)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                          selectedIntent === mode.id
                            ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}

                    {selectedItem ? (
                      <span className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent)]">
                        <span>Item: {selectedItem.name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedItem(null)}
                          className="hover:text-[var(--text-primary)]"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-end gap-2">
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      value={inputText}
                      onChange={(e) => {
                        setInputText(e.target.value);
                        onTypingActivity();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit();
                        }
                      }}
                      placeholder={copy.actionPlaceholder}
                      className="max-h-32 min-h-[42px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
                    />
                    <button
                      type="button"
                      disabled={isBusy || (!inputText.trim() && !selectedItem)}
                      onClick={handleSubmit}
                      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 text-xs font-semibold text-[var(--accent-contrast)] transition hover:brightness-110 disabled:opacity-40"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{copy.sendAction}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : null}
      </section>

      {/* Desktop Context HUD */}
      {!focusMode ? (
        <aside className="hidden w-[350px] shrink-0 lg:block xl:w-[390px]">
          <ContextHud
            campaign={campaign}
            language={language}
            isSummarizing={isSummarizing}
            isGeneratingPortrait={isGeneratingPortrait}
            onUseItem={handleUseItemFromHud}
            onMentionNpc={handleMentionNpcFromHud}
            onTravelLocation={handleTravelFromHud}
            onAddCanonFact={onAddCanonFact}
            onRemoveCanonFact={onRemoveCanonFact}
            onSummarizeNow={onSummarizeNow}
            onConcludeCampaign={onConcludeCampaign}
            onGeneratePortrait={onGeneratePortrait}
            onZoomImage={(url, caption, engine) =>
              setLightboxImage({ url, caption, engine })
            }
          />
        </aside>
      ) : null}

      {/* Mobile Floating HUD Trigger + Slide-over Sheet */}
      <button
        type="button"
        onClick={() => setMobileHudOpen(true)}
        className="fixed right-4 bottom-24 z-30 flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--accent)] shadow-[var(--shadow-elevated)] lg:hidden"
      >
        <PanelRightOpen className="h-4 w-4" />
        <span>Mundo & Ficha</span>
      </button>

      {mobileHudOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm lg:hidden">
          <div
            className="fixed inset-0"
            onClick={() => setMobileHudOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 flex h-full w-full max-w-sm flex-col bg-[var(--bg-canvas)] p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="font-display text-sm font-semibold text-[var(--accent)]">
                Mundo, Memória & Ficha
              </span>
              <button
                type="button"
                onClick={() => setMobileHudOpen(false)}
                className="rounded-lg border border-[var(--border-subtle)] p-1.5 text-[var(--text-secondary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ContextHud
                campaign={campaign}
                language={language}
                isSummarizing={isSummarizing}
                isGeneratingPortrait={isGeneratingPortrait}
                onUseItem={handleUseItemFromHud}
                onMentionNpc={handleMentionNpcFromHud}
                onTravelLocation={handleTravelFromHud}
                onAddCanonFact={onAddCanonFact}
                onRemoveCanonFact={onRemoveCanonFact}
                onSummarizeNow={onSummarizeNow}
                onConcludeCampaign={onConcludeCampaign}
                onGeneratePortrait={onGeneratePortrait}
                onZoomImage={(url, caption, engine) =>
                  setLightboxImage({ url, caption, engine })
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Fullscreen Image Lightbox */}
      {lightboxImage ? (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 z-10 rounded-full bg-black/65 p-2 text-white transition hover:bg-black"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.caption || 'Ilustração'}
              className="max-h-[80vh] w-full object-contain"
            />
            {lightboxImage.caption ? (
              <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-4 py-3 text-xs text-[var(--text-secondary)]">
                <span>{lightboxImage.caption}</span>
                <span className="text-[11px] text-[var(--accent)]">
                  {lightboxImage.engine === 'gemini' ? 'Gemini Nano Banana 2.1' : 'Arte Procedural Demo'}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
