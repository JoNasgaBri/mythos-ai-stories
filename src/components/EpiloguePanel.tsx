import {
  Award,
  BookOpen,
  Compass,
  Download,
  FolderOpen,
  Skull,
  Users,
} from 'lucide-react';
import type { CampaignEpilogue } from '../types/game';

interface EpiloguePanelProps {
  epilogue: CampaignEpilogue;
  onOpenSaves: () => void;
  onExport: () => void;
  onBackHome: () => void;
}

export function EpiloguePanel({
  epilogue,
  onOpenSaves,
  onExport,
  onBackHome,
}: EpiloguePanelProps) {
  const isFallen = epilogue.outcome === 'fallen';

  return (
    <section
      className={`animate-beat-enter rounded-3xl border p-6 shadow-[var(--shadow-elevated)] sm:p-9 ${
        isFallen
          ? 'border-[var(--danger)]/50 bg-[var(--bg-surface)]'
          : 'border-[var(--accent)] bg-[var(--bg-surface)]'
      }`}
    >
      {/* Seal & Outcome Header */}
      <div className="flex flex-col items-center text-center">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
            isFallen
              ? 'border-[var(--danger)]/50 bg-[var(--danger)]/15 text-[var(--danger)]'
              : 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
          }`}
        >
          {isFallen ? <Skull className="h-6 w-6" /> : <Award className="h-6 w-6" />}
        </span>

        <span
          className={`mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] ${
            isFallen ? 'text-[var(--danger)]' : 'text-[var(--accent)]'
          }`}
        >
          {isFallen ? 'Epílogo · O Fim da Jornada' : 'Epílogo · Crônica Encerrada'}
        </span>

        <h2 className="font-display mt-2 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
          {epilogue.title}
        </h2>
      </div>

      {/* Literary Summary */}
      <div className="mt-6 space-y-4 border-y border-[var(--border-subtle)] py-6">
        {epilogue.summary
          .split(/\n+/)
          .filter(Boolean)
          .map((para, idx) => (
            <p
              key={idx}
              className={`font-prose text-[var(--text-primary)] ${
                idx === 0 ? 'story-dropcap' : ''
              }`}
            >
              {para}
            </p>
          ))}

        {epilogue.finalWords ? (
          <blockquote className="mt-5 border-l-2 border-[var(--accent)] pl-4 font-prose italic text-[var(--text-secondary)]">
            “{epilogue.finalWords}”
          </blockquote>
        ) : null}
      </div>

      {/* Telemetry Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-center">
          <div className="font-mono-tech text-lg font-bold text-[var(--text-primary)]">
            {epilogue.stats.turns}
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">Turnos Vividos</div>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-center">
          <div className="font-mono-tech flex items-center justify-center gap-1 text-lg font-bold text-[var(--text-primary)]">
            <Users className="h-4 w-4 text-[var(--accent)]" />
            {epilogue.stats.npcsMet}
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">NPCs no Códice</div>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-center">
          <div className="font-mono-tech flex items-center justify-center gap-1 text-lg font-bold text-[var(--text-primary)]">
            <Compass className="h-4 w-4 text-[var(--accent)]" />
            {epilogue.stats.locationsDiscovered}
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">Locais Mapeados</div>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-center">
          <div className="font-mono-tech flex items-center justify-center gap-1 text-lg font-bold text-[var(--text-primary)]">
            <BookOpen className="h-4 w-4 text-[var(--accent)]" />
            {epilogue.stats.criticalHits}/{epilogue.stats.criticalFails}
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">Críticos (20/1)</div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onOpenSaves}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          <span>Carregar Salvamento</span>
        </button>

        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Exportar Crônica</span>
        </button>

        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-xs font-semibold text-[var(--accent-contrast)] transition hover:brightness-110"
        >
          <span>Voltar ao Santuário</span>
        </button>
      </div>
    </section>
  );
}
