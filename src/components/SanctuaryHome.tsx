import {
  BookOpen,
  Compass,
  Download,
  Flame,
  GitBranch,
  Heart,
  MessageSquare,
  Play,
  Plus,
  QrCode,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { DIFFICULTIES, UI_COPY, WORLD_THEMES } from '../data/presets';
import type { PwaState } from '../hooks/usePwaInstall';
import type {
  Campaign,
  DifficultyId,
  LanguageId,
  WorldThemeId,
} from '../types/game';
import { HomePwaCard } from './PwaInstallBanner';

interface SanctuaryHomeProps {
  campaigns: Campaign[];
  language: LanguageId;
  previewTheme: WorldThemeId;
  defaultDifficulty: DifficultyId;
  pwa?: PwaState;
  onOpenIosInstallGuide?: () => void;
  onInstalledApp?: () => void;
  onSelectPreviewTheme: (theme: WorldThemeId) => void;
  onStartForge: () => void;
  onStartFreeform: (difficulty: DifficultyId, theme: WorldThemeId) => void;
  onPlayInstantDemo: () => void;
  onOpenDocs: () => void;
  onStartInteractiveTour?: () => void;
  onShareCampaignQr: (campaign: Campaign) => void;
  onReceiveCampaignQr: () => void;
  onOpenCampaignTimeline?: (campaign: Campaign) => void;
  onOpenCampaign: (campaign: Campaign) => void;
  onExportCampaign: (campaign: Campaign) => void;
  onDeleteCampaign: (id: string) => void;
  onImportCampaign: (rawJson: string) => void;
}

export function SanctuaryHome({
  campaigns,
  language,
  previewTheme,
  defaultDifficulty,
  pwa,
  onOpenIosInstallGuide,
  onInstalledApp,
  onSelectPreviewTheme,
  onStartForge,
  onStartFreeform,
  onPlayInstantDemo,
  onOpenDocs,
  onStartInteractiveTour,
  onShareCampaignQr,
  onReceiveCampaignQr,
  onOpenCampaignTimeline,
  onOpenCampaign,
  onExportCampaign,
  onDeleteCampaign,
  onImportCampaign,
}: SanctuaryHomeProps) {
  const copy = UI_COPY[language];
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [freeformOpen, setFreeformOpen] = useState(false);
  const [freeformDifficulty, setFreeformDifficulty] =
    useState<DifficultyId>(defaultDifficulty);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    onImportCampaign(text);
    e.target.value = '';
  };

  return (
    <main className="animate-view-enter relative z-10 mx-auto max-w-[1280px] px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)]/90 p-7 shadow-[var(--shadow-elevated)] backdrop-blur-md sm:p-12">
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Interactive Narrative Engine · Adaptive Worlds</span>
          </div>

          <h1 className="font-display text-3xl leading-tight font-semibold tracking-wide text-[var(--text-primary)] sm:text-5xl">
            {copy.sanctuaryTitle}
          </h1>

          <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
            {copy.sanctuarySubtitle}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setFreeformOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3.5 text-sm font-semibold text-[var(--accent-contrast)] shadow-lg transition hover:brightness-110"
            >
              <MessageSquare className="h-4 w-4" />
              <span>História Livre (Estilo WebSim)</span>
            </button>

            <button
              type="button"
              onClick={onStartForge}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--accent)]/60 bg-[var(--accent-soft)] px-5 py-3.5 text-sm font-semibold text-[var(--accent)] transition hover:brightness-110"
            >
              <Plus className="h-4 w-4" />
              <span>{copy.forgeNew}</span>
            </button>

            <button
              type="button"
              onClick={onPlayInstantDemo}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-5 py-3.5 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <Flame className="h-4 w-4 text-[var(--accent)]" />
              <span>{copy.playInstantDemo}</span>
            </button>

            <button
              type="button"
              onClick={onOpenDocs}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-3.5 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <BookOpen className="h-4 w-4 text-[var(--accent)]" />
              <span>Documentação & Guias</span>
            </button>

            {onStartInteractiveTour ? (
              <button
                type="button"
                onClick={onStartInteractiveTour}
                className="inline-flex items-center gap-2 rounded-xl border border-[#a78bfa]/45 bg-[#a78bfa]/12 px-4 py-3.5 text-sm font-semibold text-[#c4b5fd] transition hover:border-[#a78bfa] hover:brightness-110"
              >
                <Compass className="h-4 w-4" />
                <span>Tour Interativo (2 min)</span>
              </button>
            ) : null}
          </div>

          {pwa && onOpenIosInstallGuide ? (
            <HomePwaCard
              pwa={pwa}
              onOpenIosGuide={onOpenIosInstallGuide}
              onInstalled={onInstalledApp}
            />
          ) : null}

          {freeformOpen ? (
            <div className="animate-beat-enter mt-5 rounded-2xl border border-[var(--accent)]/50 bg-[var(--bg-elevated)]/95 p-4 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-sm font-semibold text-[var(--accent)]">
                    Sessão Zero · Comece Conversando do Zero (Sem Lore Fixo)
                  </h3>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    Escolha a dificuldade desejada e escreva o mundo, personagem e gênero diretamente no chat com o Mestre — com atributos BG3 (+6 pontos livres), evolução, vínculos e escolhas infinitas.
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {DIFFICULTIES.map((diff) => {
                  const active = freeformDifficulty === diff.id;
                  return (
                    <button
                      key={diff.id}
                      type="button"
                      onClick={() => setFreeformDifficulty(diff.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        active
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      {diff.label[language]}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-[var(--text-muted)]">
                  Visual atual: <strong className="text-[var(--text-primary)]">{WORLD_THEMES[previewTheme].name[language]}</strong> (mude abaixo se quiser)
                </span>
                <button
                  type="button"
                  onClick={() => onStartFreeform(freeformDifficulty, previewTheme)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] transition hover:brightness-110"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Começar Conversando →</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Adaptive Theme Preview Strip */}
        <div className="mt-10 border-t border-[var(--border-subtle)] pt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Atmosferas Camaleônicas — clique para testar a interface ao vivo
            </span>
            <span className="text-xs text-[var(--accent)]">
              {WORLD_THEMES[previewTheme].aestheticLabel[language]}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            {(Object.keys(WORLD_THEMES) as WorldThemeId[]).map((id) => {
              const preset = WORLD_THEMES[id];
              const active = previewTheme === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectPreviewTheme(id)}
                  className={`group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]/70 hover:border-[var(--border-strong)]'
                  }`}
                >
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white/15"
                    style={{ backgroundColor: preset.swatch }}
                  />
                  <span className="truncate text-xs font-medium text-[var(--text-primary)]">
                    {preset.name[language]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Campaign Shelf */}
      <section className="mt-12">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="font-display text-xl font-semibold tracking-wide text-[var(--text-primary)]">
              {copy.savedCampaigns}
            </h2>
            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-0.5 text-xs text-[var(--text-muted)]">
              {campaigns.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onReceiveCampaignQr ? (
              <button
                type="button"
                onClick={onReceiveCampaignQr}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3.5 py-2 text-xs font-semibold text-[var(--accent)] transition hover:border-[var(--accent)] hover:brightness-110"
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>{language === 'en' ? 'Receive via QR / Code' : 'Receber QR / Código'}</span>
              </button>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{copy.importSave}</span>
            </button>
          </div>
        </div>

        {campaigns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)]/50 p-10 text-center">
            <p className="mx-auto max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
              {copy.noCampaigns}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((camp, idx) => {
              const theme = WORLD_THEMES[camp.world.primaryTheme];
              const diff = DIFFICULTIES.find((d) => d.id === camp.difficulty);
              const lastNarrator = [...camp.entries]
                .reverse()
                .find((e) => e.role === 'narrator' || e.role === 'pulse');
              const isConfirming = confirmDeleteId === camp.id;

              return (
                <article
                  key={camp.id}
                  style={{ animationDelay: `${Math.min(idx * 55, 300)}ms` }}
                  className="animate-choice-in group flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-elevated)]"
                >
                  {/* Cover art or Theme accent strip */}
                  {camp.coverImageUrl ? (
                    <div className="relative h-28 w-full overflow-hidden bg-[var(--bg-elevated)]">
                      <img
                        src={camp.coverImageUrl}
                        alt={camp.world.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-surface)] via-transparent to-black/25" />
                    </div>
                  ) : (
                    <div
                      className="h-1.5 w-full"
                      style={{
                        background: `linear-gradient(90deg, ${theme.swatch}, ${theme.secondarySwatch})`,
                      }}
                    />
                  )}

                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {camp.world.genres.slice(0, 2).map((g) => (
                            <span
                              key={g}
                              className="rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]"
                            >
                              {g}
                            </span>
                          ))}
                          {camp.timeline?.parentCampaignId ? (
                            <span
                              style={{
                                borderColor: `${camp.timeline.branchColor}55`,
                                backgroundColor: `${camp.timeline.branchColor}18`,
                                color: camp.timeline.branchColor,
                              }}
                              className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold"
                            >
                              <GitBranch className="h-2.5 w-2.5" />
                              <span className="max-w-[130px] truncate">
                                {camp.timeline.branchName}
                              </span>
                            </span>
                          ) : null}
                          {camp.status === 'ended_fallen' ? (
                            <span className="rounded-md bg-[var(--danger)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--danger)]">
                              Caído
                            </span>
                          ) : camp.status === 'ended_victory' ? (
                            <span className="rounded-md bg-[var(--success)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--success)]">
                              Concluída
                            </span>
                          ) : camp.status === 'crisis_vigor' || camp.status === 'crisis_tension' ? (
                            <span className="rounded-md bg-[var(--warning)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--warning)]">
                              Em Crise
                            </span>
                          ) : null}
                        </div>
                        <h3 className="font-display mt-2 text-lg font-semibold text-[var(--text-primary)]">
                          {camp.world.title}
                        </h3>
                        <p className="mt-0.5 text-[11px] text-[var(--accent)]">
                          {camp.world.era}
                        </p>
                      </div>

                      <span className="font-mono-tech shrink-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-1 text-[11px] text-[var(--accent)]">
                        {diff?.label[camp.language] ?? camp.difficulty}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2.5 text-xs text-[var(--text-secondary)]">
                      {camp.player.portraitUrl ? (
                        <img
                          src={camp.player.portraitUrl}
                          alt={camp.player.name}
                          className="h-6 w-6 rounded-lg border border-[var(--border-strong)] object-cover"
                        />
                      ) : null}
                      <span className="font-medium text-[var(--text-primary)]">
                        {camp.player.name}
                      </span>
                      <span>·</span>
                      <span>{camp.player.occupation}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3 w-3 text-[var(--danger)]" />
                        {camp.player.vigor}%
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-3 flex-1 text-xs leading-relaxed text-[var(--text-muted)]">
                      {lastNarrator?.text ?? camp.world.premise}
                    </p>

                    <div className="mt-5 flex items-center justify-between border-t border-[var(--border-subtle)] pt-3.5">
                      <span className="font-mono-tech text-[11px] text-[var(--text-muted)]">
                        Arco {camp.arcNumber} · T{camp.turnCount} · {camp.codex.npcs.length} NPCs · {camp.codex.canonFacts.length} Fatos
                      </span>

                      <div className="flex items-center gap-1.5">
                        {onOpenCampaignTimeline ? (
                          <button
                            type="button"
                            onClick={() => onOpenCampaignTimeline(camp)}
                            title={
                              language === 'en'
                                ? 'Timeline Tree ("What If?")'
                                : 'Árvore de Linhas Temporais ("E Se?")'
                            }
                            className="rounded-lg border border-[#a78bfa]/40 bg-[#a78bfa]/12 p-1.5 text-[#c4b5fd] transition hover:border-[#a78bfa] hover:brightness-110"
                          >
                            <GitBranch className="h-3.5 w-3.5" />
                          </button>
                        ) : null}

                        {onShareCampaignQr ? (
                          <button
                            type="button"
                            onClick={() => onShareCampaignQr(camp)}
                            title={
                              language === 'en'
                                ? 'Send to Phone via QR Code'
                                : 'Enviar para Celular por QR Code'
                            }
                            className="rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-soft)] p-1.5 text-[var(--accent)] transition hover:border-[var(--accent)] hover:brightness-110"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => onExportCampaign(camp)}
                          title={copy.exportSave}
                          className="rounded-lg border border-[var(--border-subtle)] p-1.5 text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>

                        {isConfirming ? (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteCampaign(camp.id);
                              setConfirmDeleteId(null);
                            }}
                            onMouseLeave={() => setConfirmDeleteId(null)}
                            className="rounded-lg border border-[var(--danger)] bg-[var(--danger)]/15 px-2.5 py-1 text-[11px] font-semibold text-[var(--danger)]"
                          >
                            {copy.confirmDelete}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(camp.id)}
                            title={copy.deleteSave}
                            className="rounded-lg border border-[var(--border-subtle)] p-1.5 text-[var(--text-secondary)] transition hover:border-[var(--danger)]/60 hover:text-[var(--danger)]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onOpenCampaign(camp)}
                          className="ml-1 inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] transition hover:brightness-110"
                        >
                          <Play className="h-3 w-3" />
                          <span>{copy.continueStory}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
