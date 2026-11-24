import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Image as ImageIcon,
  Loader2,
  Play,
  QrCode,
  RefreshCw,
  Smartphone,
  Wifi,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  formatBytesCompact,
  normalizeSyncCode,
  prepareCampaignPayload,
  startQrReceiverSession,
  startQrSenderSession,
  type ReceiverSessionHandle,
  type SenderSessionHandle,
} from '../services/qrSyncService';
import type { Campaign } from '../types/game';

interface QrSyncModalProps {
  open: boolean;
  initialMode: 'send' | 'receive';
  initialReceiveCode?: string;
  campaign: Campaign | null;
  onClose: () => void;
  onCampaignReceived: (campaign: Campaign, openImmediately: boolean) => void;
}

export function QrSyncModal({
  open,
  initialMode,
  initialReceiveCode,
  campaign,
  onClose,
  onCampaignReceived,
}: QrSyncModalProps) {
  const [mode, setMode] = useState<'send' | 'receive'>(initialMode);
  const [includeMedia, setIncludeMedia] = useState(true);
  const [sessionNonce, setSessionNonce] = useState(0);

  // Sender state
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [syncCode, setSyncCode] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [senderStatus, setSenderStatus] = useState<
    'preparing' | 'waiting' | 'sending' | 'done' | 'error'
  >('preparing');
  const [senderProgress, setSenderProgress] = useState(0);
  const [senderBytes, setSenderBytes] = useState(0);
  const [senderError, setSenderError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Receiver state
  const [inputCode, setInputCode] = useState(initialReceiveCode ?? '');
  const [receiverStatus, setReceiverStatus] = useState<
    'idle' | 'connecting' | 'downloading' | 'done' | 'error'
  >('idle');
  const [receiverStatusText, setReceiverStatusText] = useState('');
  const [receiverProgress, setReceiverProgress] = useState(0);
  const [receiverMeta, setReceiverMeta] = useState<{
    campaignTitle: string;
    turnCount: number;
    totalBytes: number;
  } | null>(null);
  const [receivedCampaign, setReceivedCampaign] = useState<Campaign | null>(null);
  const [receiverError, setReceiverError] = useState<string | null>(null);

  const senderRef = useRef<SenderSessionHandle | null>(null);
  const receiverRef = useRef<ReceiverSessionHandle | null>(null);

  // Sync mode when modal opens
  useEffect(() => {
    if (!open) return;
    setMode(campaign ? initialMode : 'receive');
    if (initialReceiveCode) {
      setInputCode(normalizeSyncCode(initialReceiveCode));
    }
    setReceivedCampaign(null);
    setReceiverError(null);
    setSenderError(null);
  }, [open, initialMode, initialReceiveCode, campaign]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Estimate payload sizes for toggle hint
  const estimatedSizeLabel = useMemo(() => {
    if (!campaign) return '';
    try {
      const raw = prepareCampaignPayload(campaign, includeMedia);
      return formatBytesCompact(new TextEncoder().encode(raw).length);
    } catch {
      return '';
    }
  }, [campaign, includeMedia]);

  // Manage Sender P2P Session lifecycle
  useEffect(() => {
    if (!open || mode !== 'send' || !campaign) {
      senderRef.current?.destroy();
      senderRef.current = null;
      return;
    }

    setSenderStatus('preparing');
    setSenderProgress(0);
    setSenderError(null);
    setQrDataUrl(null);

    const handle = startQrSenderSession(campaign, includeMedia, {
      onReady: (code, url, payloadBytes) => {
        setSyncCode(code);
        setShareUrl(url);
        setSenderBytes(payloadBytes);
        setSenderStatus('waiting');
        void QRCode.toDataURL(url, {
          width: 280,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#090c0a',
            light: '#ffffff',
          },
        }).then(setQrDataUrl);
      },
      onPeerConnected: () => {
        setSenderStatus('sending');
        setSenderProgress(5);
      },
      onProgress: (pct) => {
        setSenderStatus('sending');
        setSenderProgress(pct);
      },
      onComplete: () => {
        setSenderProgress(100);
        setSenderStatus('done');
      },
      onError: (msg) => {
        setSenderError(msg);
        setSenderStatus('error');
      },
    });

    senderRef.current = handle;
    return () => {
      handle.destroy();
      if (senderRef.current === handle) {
        senderRef.current = null;
      }
    };
  }, [open, mode, campaign, includeMedia, sessionNonce]);

  const startReceiving = (codeToUse: string) => {
    const clean = normalizeSyncCode(codeToUse);
    if (clean.length < 4) {
      setReceiverError('Digite o código de 6 caracteres exibido no outro dispositivo.');
      setReceiverStatus('error');
      return;
    }

    receiverRef.current?.destroy();
    setReceiverStatus('connecting');
    setReceiverStatusText(`Conectando ao código ${clean}...`);
    setReceiverProgress(0);
    setReceiverMeta(null);
    setReceivedCampaign(null);
    setReceiverError(null);

    const handle = startQrReceiverSession(clean, {
      onStatus: (text) => setReceiverStatusText(text),
      onMeta: (meta) => {
        setReceiverMeta(meta);
        setReceiverStatus('downloading');
      },
      onProgress: (pct) => {
        setReceiverStatus('downloading');
        setReceiverProgress(pct);
      },
      onReceived: (camp) => {
        setReceivedCampaign(camp);
        setReceiverProgress(100);
        setReceiverStatus('done');
        onCampaignReceived(camp, false);
      },
      onError: (msg) => {
        setReceiverError(msg);
        setReceiverStatus('error');
      },
    });

    receiverRef.current = handle;
  };

  // Auto-start receive when opened from a scanned ?sync=CODIGO link
  useEffect(() => {
    if (!open || mode !== 'receive') {
      receiverRef.current?.destroy();
      receiverRef.current = null;
      return;
    }
    if (initialReceiveCode && normalizeSyncCode(initialReceiveCode).length >= 4) {
      startReceiving(initialReceiveCode);
    } else {
      setReceiverStatus('idle');
    }

    return () => {
      receiverRef.current?.destroy();
      receiverRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, initialReceiveCode]);

  if (!open) return null;

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="animate-backdrop-in fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Sincronizar Crônica por QR Code"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-modal-spring flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-2xl sm:rounded-3xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/80 px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]">
              <QrCode className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-sm font-semibold text-[var(--text-primary)] sm:text-base">
                Transferir por QR Code (P2P)
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Envie sua história direto entre PC e Celular sem JSON
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar QR Sync"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex gap-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5 sm:px-5">
          <button
            type="button"
            disabled={!campaign}
            onClick={() => setMode('send')}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition disabled:opacity-40 ${
              mode === 'send'
                ? 'bg-[var(--accent)] text-[#111] shadow-sm'
                : 'border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Enviar (Gerar QR)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('receive')}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
              mode === 'receive'
                ? 'bg-[var(--accent)] text-[#111] shadow-sm'
                : 'border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Receber (Código)</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {mode === 'send' && campaign ? (
            <div className="space-y-4 text-center">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/70 px-3.5 py-2.5 text-left">
                <div className="truncate font-display text-xs font-semibold text-[var(--text-primary)]">
                  {campaign.world.title}
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  Turno {campaign.turnCount} · {campaign.codex.locations.length} locais ·{' '}
                  {campaign.codex.npcs.length} NPCs ·{' '}
                  <span className="font-mono-tech text-[var(--accent)]">
                    {senderBytes > 0
                      ? formatBytesCompact(senderBytes)
                      : estimatedSizeLabel}
                  </span>
                </div>
              </div>

              {/* Include Images Toggle */}
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/55 px-3.5 py-2.5 text-left text-xs">
                <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <ImageIcon className="h-4 w-4 text-[var(--accent)]" />
                  <span>Incluir retratos e ilustrações</span>
                </span>
                <input
                  type="checkbox"
                  checked={includeMedia}
                  onChange={(e) => setIncludeMedia(e.target.checked)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
              </label>

              {/* QR Code Display */}
              {senderStatus === 'preparing' ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-xs text-[var(--text-muted)]">
                  <Loader2 className="h-7 w-7 animate-spin text-[var(--accent)]" />
                  <span>Preparando túnel P2P criptografado...</span>
                </div>
              ) : senderStatus === 'error' ? (
                <div className="rounded-2xl border border-[var(--danger)]/45 bg-[var(--danger)]/10 p-4 text-xs text-[var(--danger)]">
                  <AlertTriangle className="mx-auto mb-2 h-6 w-6" />
                  <p>{senderError}</p>
                  <button
                    type="button"
                    onClick={() => setSessionNonce((n) => n + 1)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-[#111]"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Tentar Novamente</span>
                  </button>
                </div>
              ) : senderStatus === 'done' ? (
                <div className="rounded-2xl border border-[var(--success)]/45 bg-[var(--success)]/12 p-6 text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-[var(--success)]" />
                  <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
                    Crônica enviada com sucesso!
                  </h3>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    O outro dispositivo já recebeu e salvou sua história. Você
                    pode fechar esta janela.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSessionNonce((n) => n + 1)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)]"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Enviar para outro aparelho</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="mx-auto inline-flex flex-col items-center rounded-3xl bg-white p-4 shadow-xl">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt={`QR Code de sincronização ${syncCode}`}
                        className="h-52 w-52 sm:h-56 sm:w-56"
                      />
                    ) : (
                      <div className="flex h-52 w-52 items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-black" />
                      </div>
                    )}
                  </div>

                  {senderStatus === 'sending' ? (
                    <div className="space-y-2 rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent-soft)]/40 p-3.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-[var(--accent)]">
                        <span className="inline-flex items-center gap-1.5">
                          <Wifi className="h-3.5 w-3.5 animate-pulse" />
                          <span>Dispositivo conectado! Enviando...</span>
                        </span>
                        <span className="font-mono-tech">{senderProgress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-canvas)]">
                        <div
                          className="h-full rounded-full bg-[var(--accent)] transition-all duration-150"
                          style={{ width: `${senderProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                        Aponte a câmera do celular para o QR Code acima e mantenha
                        esta janela aberta durante a leitura.
                      </p>

                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <span className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3.5 py-1.5 font-mono-tech text-base font-bold tracking-[0.22em] text-[var(--accent)]">
                          {syncCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleCopyLink()}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--accent)]"
                        >
                          {copiedLink ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-[var(--success)]" />
                              <span className="text-[var(--success)]">
                                Link copiado!
                              </span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copiar Link</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* RECEIVE MODE */
            <div className="space-y-4">
              {receiverStatus === 'done' && receivedCampaign ? (
                <div className="rounded-2xl border border-[var(--success)]/45 bg-[var(--success)]/12 p-5 text-center">
                  <CheckCircle2 className="mx-auto mb-2.5 h-10 w-10 text-[var(--success)]" />
                  <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
                    Crônica recebida e salva!
                  </h3>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    <strong className="text-[var(--text-primary)]">
                      {receivedCampaign.world.title}
                    </strong>{' '}
                    · Turno {receivedCampaign.turnCount} ·{' '}
                    {receivedCampaign.codex.locations.length} locais
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onCampaignReceived(receivedCampaign, true);
                      onClose();
                    }}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-xs font-bold text-[#111] shadow-lg transition hover:brightness-110"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Abrir História Agora</span>
                  </button>
                </div>
              ) : receiverStatus === 'connecting' ||
                receiverStatus === 'downloading' ? (
                <div className="space-y-3 rounded-2xl border border-[var(--accent)]/40 bg-[var(--bg-elevated)] p-5 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--accent)]" />
                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                    {receiverMeta
                      ? `Baixando "${receiverMeta.campaignTitle}"...`
                      : receiverStatusText || 'Conectando...'}
                  </div>
                  {receiverMeta ? (
                    <p className="text-xs text-[var(--text-muted)]">
                      Turno {receiverMeta.turnCount} ·{' '}
                      {formatBytesCompact(receiverMeta.totalBytes)}
                    </p>
                  ) : null}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-canvas)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all duration-150"
                      style={{ width: `${Math.max(8, receiverProgress)}%` }}
                    />
                  </div>
                  <p className="font-mono-tech text-xs text-[var(--accent)]">
                    {receiverProgress}%
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                    Para trazer uma história do celular para o PC (ou vice-versa),
                    abra <strong>Enviar (Gerar QR)</strong> no outro aparelho e
                    digite o código de 6 letras abaixo:
                  </p>

                  {receiverStatus === 'error' && receiverError ? (
                    <div className="flex items-start gap-2 rounded-xl border border-[var(--danger)]/45 bg-[var(--danger)]/10 p-3 text-xs text-[var(--danger)]">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{receiverError}</span>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={inputCode}
                      onChange={(e) =>
                        setInputCode(normalizeSyncCode(e.target.value))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          startReceiving(inputCode);
                        }
                      }}
                      placeholder="Ex.: 7K4P9M"
                      maxLength={8}
                      className="flex-1 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-4 py-3 text-center font-mono-tech text-[16px] font-bold tracking-[0.22em] text-[var(--text-primary)] uppercase outline-none focus:border-[var(--accent)]"
                    />
                    <button
                      type="button"
                      disabled={normalizeSyncCode(inputCode).length < 4}
                      onClick={() => startReceiving(inputCode)}
                      className="inline-flex h-[48px] items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 text-xs font-bold text-[#111] shadow transition hover:brightness-110 disabled:opacity-40"
                    >
                      <Download className="h-4 w-4" />
                      <span>Baixar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
