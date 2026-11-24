import {
  Download,
  RefreshCw,
  Share,
  Smartphone,
  Sparkles,
  WifiOff,
  X,
} from 'lucide-react';
import type { PwaState } from '../hooks/usePwaInstall';

interface PwaInstallBannerProps {
  pwa: PwaState;
  iosGuideOpen: boolean;
  onCloseIosGuide: () => void;
}

export function PwaInstallBanner({
  pwa,
  iosGuideOpen,
  onCloseIosGuide,
}: PwaInstallBannerProps) {
  return (
    <>
      {/* Update Available Toast Banner */}
      {pwa.updateAvailable ? (
        <div
          className="fixed right-3 bottom-4 left-3 z-[75] mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-[var(--accent)]/60 bg-[var(--bg-surface)]/95 px-4 py-3 shadow-[0_14px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:left-auto"
          style={{
            marginBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                Nova versão do MYTHOS pronta
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Atualize para receber os novos recursos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={pwa.applyUpdate}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] transition hover:brightness-110"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Atualizar</span>
          </button>
        </div>
      ) : null}

      {/* iOS Safari Add-to-Home-Screen Guided Sheet */}
      {iosGuideOpen ? (
        <div
          className="fixed inset-0 z-[85] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={onCloseIosGuide}
        >
          <div
            className="w-full max-w-md rounded-t-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-5 shadow-2xl sm:rounded-3xl"
            style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
                    Instalar MYTHOS no iPhone / iPad
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Tela cheia sem barra do navegador + leitura offline
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseIosGuide}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ol className="mt-4 space-y-2.5 text-xs text-[var(--text-secondary)]">
              <li className="flex items-start gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/70 p-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-[var(--accent-contrast)]">
                  1
                </span>
                <span>
                  Toque no ícone <strong className="inline-flex items-center gap-0.5 text-[var(--text-primary)]"><Share className="inline h-3.5 w-3.5 text-[var(--accent)]" /> Compartilhar</strong> na barra inferior do Safari.
                </span>
              </li>
              <li className="flex items-start gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/70 p-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-[var(--accent-contrast)]">
                  2
                </span>
                <span>
                  Role para baixo e toque em <strong className="text-[var(--text-primary)]">Adicionar à Tela de Início</strong> e depois em <strong className="text-[var(--text-primary)]">Adicionar</strong>.
                </span>
              </li>
            </ol>

            <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/70 px-3 py-2 text-[11px] text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <WifiOff className="h-3.5 w-3.5 text-[var(--accent)]" />
                Suas crônicas salvas, Codex, Docs e Árvore abrem mesmo offline.
              </span>
            </div>

            <button
              type="button"
              onClick={onCloseIosGuide}
              className="mt-4 w-full rounded-xl bg-[var(--accent)] py-2.5 text-xs font-semibold text-[var(--accent-contrast)] transition hover:brightness-110"
            >
              Entendi!
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

interface HomePwaCardProps {
  pwa: PwaState;
  onOpenIosGuide: () => void;
  onInstalled?: () => void;
}

export function HomePwaCard({ pwa, onOpenIosGuide, onInstalled }: HomePwaCardProps) {
  if (!pwa.showInstallBanner) return null;

  const handleClick = async () => {
    const res = await pwa.promptInstall();
    if (res === 'accepted') onInstalled?.();
    else if (res === 'ios_guide') onOpenIosGuide();
  };

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--accent)]/35 bg-[var(--accent-soft)]/50 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--accent)]/40 bg-[var(--bg-surface)] text-[var(--accent)]">
          <Smartphone className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--text-primary)]">
            Instale o MYTHOS como aplicativo
          </p>
          <p className="text-[11px] text-[var(--text-secondary)]">
            Abre em tela cheia no celular/PC e permite ler suas crônicas, Codex e Docs offline.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => void handleClick()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-[var(--accent-contrast)] transition hover:brightness-110"
        >
          <Download className="h-3.5 w-3.5" />
          <span>{pwa.isIosSafari ? 'Como instalar no iOS' : 'Instalar App'}</span>
        </button>
        <button
          type="button"
          onClick={() => pwa.dismissInstallBanner(7)}
          title="Agora não"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
