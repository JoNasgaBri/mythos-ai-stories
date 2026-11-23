import {
  Clock,
  Download,
  FolderOpen,
  Heart,
  MapPin,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Campaign, SaveSlot } from '../types/game';

interface SaveSlotsDrawerProps {
  open: boolean;
  campaign: Campaign | null;
  slots: SaveSlot[];
  onClose: () => void;
  onCreateSave: (slotName: string) => void;
  onLoadSave: (slot: SaveSlot) => void;
  onDeleteSave: (slotId: string) => void;
  onExportJson: () => void;
  onImportJson: (rawJson: string) => void;
}

function formatSavedTime(ts: number): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return '';
  }
}

export function SaveSlotsDrawer({
  open,
  campaign,
  slots,
  onClose,
  onCreateSave,
  onLoadSave,
  onDeleteSave,
  onExportJson,
  onImportJson,
}: SaveSlotsDrawerProps) {
  const [slotName, setSlotName] = useState('');
  const [confirmLoadId, setConfirmLoadId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open && campaign) {
      setSlotName(
        `Cap. ${campaign.currentChapter} · ${campaign.currentLocation} (T${campaign.turnCount})`,
      );
      setConfirmLoadId(null);
      setConfirmDeleteId(null);
    }
  }, [open, campaign]);

  if (!open || !campaign) return null;

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    onImportJson(text);
    e.target.value = '';
  };

  return (
    <div className="animate-backdrop-in fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <aside className="animate-drawer-right relative z-10 flex h-full w-full max-w-md flex-col border-l border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-elevated)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-wide text-[var(--text-primary)]">
              Salvamentos & Memória
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Pontos salvos preservam toda a Bíblia do Mundo, NPCs, fatos e histórico.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border-subtle)] p-1.5 text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Create Checkpoint */}
        <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/45 p-5">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
            Novo Ponto de Salvamento
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={slotName}
              onChange={(e) => setSlotName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && slotName.trim()) {
                  onCreateSave(slotName);
                }
              }}
              placeholder="Nome do ponto salvo..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={() => onCreateSave(slotName)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] transition hover:brightness-110"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Salvar</span>
            </button>
          </div>
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
            Armazenado em IndexedDB para aguentar crônicas com centenas de turnos sem limite.
          </p>
        </div>

        {/* Saved Slots List */}
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            <span>Pontos Salvos ({slots.length})</span>
            <span className="font-mono-tech text-[11px] text-[var(--text-muted)]">
              Auto-save ativo
            </span>
          </div>

          {slots.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-6 text-center text-xs leading-relaxed text-[var(--text-muted)]">
              Nenhum ponto manual salvo ainda. Crie um salvamento antes de escolhas decisivas ou para guardar capítulos favoritos.
            </div>
          ) : (
            slots.map((slot) => {
              const confirmingLoad = confirmLoadId === slot.id;
              const confirmingDelete = confirmDeleteId === slot.id;
              return (
                <div
                  key={slot.id}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5 transition hover:border-[var(--border-strong)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {slot.name}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2.5 text-[11px] text-[var(--text-muted)]">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-[var(--accent)]" />
                          {slot.location}
                        </span>
                        <span className="font-mono-tech">
                          Cap. {slot.chapter} · T{slot.turnCount}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Heart className="h-3 w-3 text-[var(--danger)]" />
                          {slot.vigor}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2.5">
                    <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                      <Clock className="h-3 w-3" />
                      {formatSavedTime(slot.savedAt)}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {confirmingDelete ? (
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteSave(slot.id);
                            setConfirmDeleteId(null);
                          }}
                          onMouseLeave={() => setConfirmDeleteId(null)}
                          className="rounded-lg border border-[var(--danger)] bg-[var(--danger)]/15 px-2.5 py-1 text-[11px] font-semibold text-[var(--danger)]"
                        >
                          Confirmar?
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(slot.id)}
                          title="Excluir ponto salvo"
                          className="rounded-lg border border-[var(--border-subtle)] p-1.5 text-[var(--text-secondary)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {confirmingLoad ? (
                        <button
                          type="button"
                          onClick={() => {
                            onLoadSave(slot);
                            setConfirmLoadId(null);
                          }}
                          onMouseLeave={() => setConfirmLoadId(null)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-3 py-1 text-[11px] font-semibold text-[var(--accent-contrast)]"
                        >
                          Confirmar Carga
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmLoadId(slot.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1 text-[11px] font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                        >
                          <FolderOpen className="h-3 w-3" />
                          <span>Carregar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Export / Import Backup */}
        <div className="flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)]/45 p-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-2 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Importar Backup</span>
          </button>
          <button
            type="button"
            onClick={onExportJson}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-2 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exportar Crônica</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
