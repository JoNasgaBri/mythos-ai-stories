import Peer, { type DataConnection } from 'peerjs';
import { normalizeCampaign } from '../storage/campaignStore';
import type { Campaign } from '../types/game';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PEER_PREFIX = 'mythos-sync-';
const CHUNK_SIZE = 24_576; // 24 KB safe chunk size for iOS Safari & Android Chrome WebRTC DataChannels

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

type WireMessage =
  | {
      type: 'meta';
      totalChunks: number;
      totalBytes: number;
      campaignTitle: string;
      turnCount: number;
    }
  | {
      type: 'chunk';
      index: number;
      data: string;
    }
  | {
      type: 'ack';
    };

export function generateSyncCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

export function normalizeSyncCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
}

export function buildSyncShareUrl(code: string): string {
  if (typeof window === 'undefined') return `?sync=${code}`;
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('sync', normalizeSyncCode(code));
  return url.toString();
}

export function prepareCampaignPayload(
  campaign: Campaign,
  includeMedia: boolean,
): string {
  const payload: Campaign = includeMedia
    ? { ...campaign, interactionId: undefined }
    : {
        ...campaign,
        interactionId: undefined,
        coverImageUrl: undefined,
        mapMeta: campaign.mapMeta
          ? { ...campaign.mapMeta, customArtMapUrl: undefined }
          : undefined,
        player: {
          ...campaign.player,
          portraitUrl: undefined,
        },
        codex: {
          ...campaign.codex,
          npcs: campaign.codex.npcs.map((n) => ({
            ...n,
            portraitUrl: undefined,
          })),
        },
        entries: campaign.entries.map((e) => ({
          ...e,
          imageUrl: undefined,
        })),
      };

  return JSON.stringify(payload);
}

export function formatBytesCompact(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export interface SenderSessionHandle {
  code: string;
  destroy: () => void;
}

export interface SenderCallbacks {
  onReady: (code: string, shareUrl: string, payloadBytes: number) => void;
  onPeerConnected: () => void;
  onProgress: (percent: number, sentChunks: number, totalChunks: number) => void;
  onComplete: () => void;
  onError: (message: string) => void;
}

export function startQrSenderSession(
  campaign: Campaign,
  includeMedia: boolean,
  callbacks: SenderCallbacks,
): SenderSessionHandle {
  const code = generateSyncCode(6);
  const peerId = `${PEER_PREFIX}${code.toLowerCase()}`;
  const serialized = prepareCampaignPayload(campaign, includeMedia);
  const totalBytes = new TextEncoder().encode(serialized).length;
  const totalChunks = Math.max(1, Math.ceil(serialized.length / CHUNK_SIZE));

  let destroyed = false;
  const peer = new Peer(peerId, {
    debug: 0,
    config: RTC_CONFIG,
  });

  const safeDestroy = () => {
    if (destroyed) return;
    destroyed = true;
    try {
      peer.destroy();
    } catch {
      // ignore cleanup error
    }
  };

  peer.on('open', () => {
    if (destroyed) return;
    callbacks.onReady(code, buildSyncShareUrl(code), totalBytes);
  });

  peer.on('connection', (conn: DataConnection) => {
    if (destroyed) return;
    callbacks.onPeerConnected();

    let acked = false;

    const sendAllChunks = async () => {
      try {
        const metaMsg: WireMessage = {
          type: 'meta',
          totalChunks,
          totalBytes,
          campaignTitle: campaign.world.title,
          turnCount: campaign.turnCount,
        };
        conn.send(metaMsg);

        for (let i = 0; i < totalChunks; i++) {
          if (destroyed || !conn.open) return;
          const chunkMsg: WireMessage = {
            type: 'chunk',
            index: i,
            data: serialized.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
          };
          conn.send(chunkMsg);
          const pct = Math.min(99, Math.round(((i + 1) / totalChunks) * 100));
          callbacks.onProgress(pct, i + 1, totalChunks);

          // Pace slightly every 6 chunks so mobile Safari SCTP buffers stay smooth
          if ((i + 1) % 6 === 0) {
            await new Promise((r) => setTimeout(r, 12));
          }
        }
      } catch {
        if (!destroyed) {
          callbacks.onError('Conexão interrompida durante o envio.');
        }
      }
    };

    conn.on('open', () => {
      void sendAllChunks();
    });

    conn.on('data', (raw) => {
      const msg = raw as WireMessage;
      if (msg?.type === 'ack' && !acked) {
        acked = true;
        callbacks.onProgress(100, totalChunks, totalChunks);
        callbacks.onComplete();
      }
    });

    conn.on('error', () => {
      if (!destroyed && !acked) {
        callbacks.onError('Falha na conexão direta com o outro dispositivo.');
      }
    });
  });

  peer.on('error', (err) => {
    if (destroyed) return;
    const msg =
      err?.type === 'unavailable-id'
        ? 'Código temporário em uso — gere um novo QR Code.'
        : err?.type === 'network' || err?.type === 'server-error'
          ? 'Não foi possível conectar ao servidor de sinalização P2P. Verifique sua internet.'
          : 'Erro ao preparar sala de transferência P2P.';
    callbacks.onError(msg);
  });

  return {
    code,
    destroy: safeDestroy,
  };
}

export interface ReceiverSessionHandle {
  destroy: () => void;
}

export interface ReceiverCallbacks {
  onStatus: (status: string) => void;
  onMeta: (info: {
    campaignTitle: string;
    turnCount: number;
    totalBytes: number;
  }) => void;
  onProgress: (percent: number) => void;
  onReceived: (campaign: Campaign) => void;
  onError: (message: string) => void;
}

export function startQrReceiverSession(
  rawCode: string,
  callbacks: ReceiverCallbacks,
): ReceiverSessionHandle {
  const code = normalizeSyncCode(rawCode);
  if (code.length < 4) {
    callbacks.onError('Código de sincronização inválido.');
    return { destroy: () => {} };
  }

  const targetPeerId = `${PEER_PREFIX}${code.toLowerCase()}`;
  let destroyed = false;
  let completed = false;
  let timeoutId: number | null = null;

  const peer = new Peer({
    debug: 0,
    config: RTC_CONFIG,
  });

  const safeDestroy = () => {
    if (destroyed) return;
    destroyed = true;
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
    try {
      peer.destroy();
    } catch {
      // ignore
    }
  };

  timeoutId = window.setTimeout(() => {
    if (!destroyed && !completed) {
      callbacks.onError(
        'Tempo esgotado. Verifique se a janela do QR Code ainda está aberta no outro dispositivo e tente novamente.',
      );
      safeDestroy();
    }
  }, 20_000);

  callbacks.onStatus(`Localizando dispositivo (${code})...`);

  peer.on('open', () => {
    if (destroyed) return;
    callbacks.onStatus('Estabelecendo túnel direto criptografado...');
    const conn = peer.connect(targetPeerId, { reliable: true });

    let totalChunks = 0;
    const chunks = new Map<number, string>();

    conn.on('open', () => {
      if (destroyed) return;
      callbacks.onStatus('Conectado! Baixando crônica...');
    });

    conn.on('data', (raw) => {
      if (destroyed || completed) return;
      const msg = raw as WireMessage;

      if (msg?.type === 'meta') {
        totalChunks = msg.totalChunks;
        callbacks.onMeta({
          campaignTitle: msg.campaignTitle,
          turnCount: msg.turnCount,
          totalBytes: msg.totalBytes,
        });
        return;
      }

      if (msg?.type === 'chunk') {
        chunks.set(msg.index, msg.data);
        if (totalChunks > 0) {
          const pct = Math.min(
            99,
            Math.round((chunks.size / totalChunks) * 100),
          );
          callbacks.onProgress(pct);

          if (chunks.size >= totalChunks) {
            try {
              let assembled = '';
              for (let i = 0; i < totalChunks; i++) {
                assembled += chunks.get(i) ?? '';
              }
              const parsed = JSON.parse(assembled) as Partial<Campaign>;
              const normalized = normalizeCampaign({
                ...parsed,
                updatedAt: Date.now(),
              });
              completed = true;
              if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
                timeoutId = null;
              }
              try {
                conn.send({ type: 'ack' } satisfies WireMessage);
              } catch {
                // ignore ack send failure
              }
              callbacks.onProgress(100);
              callbacks.onReceived(normalized);
              window.setTimeout(safeDestroy, 450);
            } catch {
              callbacks.onError(
                'Os dados recebidos parecem incompletos. Tente escanear novamente.',
              );
              safeDestroy();
            }
          }
        }
      }
    });

    conn.on('error', () => {
      if (!destroyed && !completed) {
        callbacks.onError(
          'Não foi possível conectar ao outro dispositivo. Mantenha o QR Code aberto e tente novamente.',
        );
        safeDestroy();
      }
    });
  });

  peer.on('error', (err) => {
    if (destroyed || completed) return;
    const msg =
      err?.type === 'peer-unavailable'
        ? `Código "${code}" não encontrado. Confira se o QR Code ainda está aberto na tela do outro dispositivo.`
        : 'Falha na conexão P2P. Verifique sua internet e tente novamente.';
    callbacks.onError(msg);
    safeDestroy();
  });

  return { destroy: safeDestroy };
}
