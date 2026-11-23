import {
  CheckCheck,
  Heart,
  Mail,
  MessageCircle,
  Radio,
  Smartphone,
} from 'lucide-react';
import { RELATIONSHIP_META } from '../engine/rpgSystem';
import type { Campaign, NpcRecord, StoryBeat } from '../types/game';

interface SceneBeatsRendererProps {
  campaign: Campaign;
  text: string;
  beats?: StoryBeat[];
  dialogueStyle: 'bubbles' | 'classic';
  onOpenRelationships?: (npcId?: string) => void;
}

function findMatchingNpc(npcs: NpcRecord[], speaker?: string): NpcRecord | undefined {
  if (!speaker) return undefined;
  const target = speaker.trim().toLowerCase();
  if (!target) return undefined;
  const exact = npcs.find((n) => n.name.trim().toLowerCase() === target);
  if (exact) return exact;
  const firstToken = target.split(/\s+/)[0];
  if (firstToken.length >= 3) {
    return npcs.find((n) => {
      const npcLower = n.name.trim().toLowerCase();
      return (
        npcLower.startsWith(`${firstToken} `) ||
        npcLower === firstToken ||
        npcLower.includes(target)
      );
    });
  }
  return undefined;
}

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

function inferMessageStyle(channel?: string): {
  Icon: typeof Smartphone;
  accent: string;
  bg: string;
  border: string;
  label: string;
} {
  const ch = (channel || 'Mensagem').trim();
  const lower = ch.toLowerCase();
  if (/r[aá]dio|frequ[eê]ncia|walkie|transmiss|sinal/.test(lower)) {
    return {
      Icon: Radio,
      accent: '#fbbf24',
      bg: 'rgba(251, 191, 36, 0.08)',
      border: 'rgba(251, 191, 36, 0.35)',
      label: ch,
    };
  }
  if (/carta|bilhete|nota|pergaminho|e-?mail|correio/.test(lower)) {
    return {
      Icon: Mail,
      accent: '#c084fc',
      bg: 'rgba(192, 132, 252, 0.08)',
      border: 'rgba(192, 132, 252, 0.35)',
      label: ch,
    };
  }
  return {
    Icon: Smartphone,
    accent: '#4ade80',
    bg: 'rgba(74, 222, 128, 0.08)',
    border: 'rgba(74, 222, 128, 0.35)',
    label: ch,
  };
}

/**
 * Gently extracts explicit "Speaker: \"...\"" or "[Channel · Speaker]: \"...\"" lines
 * from legacy turns saved before MYTHOS 6.5, keeping normal prose untouched.
 */
function parseLegacyTextToBeats(
  text: string,
  protagonistName: string,
): StoryBeat[] {
  const protagLower = protagonistName.trim().toLowerCase();
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return paragraphs.map((p) => {
    const msgMatch = p.match(/^\[([^·\]]+)[·\-—]\s*([^\]]+)\]\s*:\s*[«"“]?(.+?)[»"”]?$/s);
    if (msgMatch) {
      const channel = msgMatch[1].trim();
      const speaker = msgMatch[2].trim();
      const body = msgMatch[3].trim();
      return {
        kind: 'message',
        channel,
        speaker,
        text: body,
        isProtagonist:
          speaker.toLowerCase() === protagLower ||
          speaker.toLowerCase() === 'você',
      };
    }

    const dlgMatch = p.match(
      /^([A-ZÀ-Ý][A-Za-zÀ-ÿ'\- ]{1,30}):\s*[«"“]([^"”»]{2,})[»"”]$/,
    );
    if (dlgMatch) {
      const speaker = dlgMatch[1].trim();
      const body = dlgMatch[2].trim();
      return {
        kind: 'dialogue',
        speaker,
        text: body,
        isProtagonist:
          speaker.toLowerCase() === protagLower ||
          speaker.toLowerCase() === 'você',
      };
    }

    return { kind: 'narration', text: p };
  });
}

export function extractPlayerSpeech(
  rawText: string,
): { isSpeech: boolean; recipient?: string; spokenText: string } {
  const trimmed = rawText.trim();

  // "Para Nome: mensagem"
  const toMatch = trimmed.match(/^Para\s+([^:]{1,36}):\s*(.+)$/is);
  if (toMatch) {
    return {
      isSpeech: true,
      recipient: toMatch[1].trim(),
      spokenText: toMatch[2].trim().replace(/^[«"“]+|[»"”]+$/g, ''),
    };
  }

  // "Você diz: \"...\"" / "You say: \"...\"" / "Vous dites : « ... »"
  const sayMatch = trimmed.match(
    /^(?:Voc[eê]\s+diz|You\s+say|Vous\s+dites)\s*:\s*[«"“]?(.+?)[»"”]?$/is,
  );
  if (sayMatch) {
    return {
      isSpeech: true,
      spokenText: sayMatch[1].trim(),
    };
  }

  // "Mostrando X, você diz: \"...\""
  const showSayMatch = trimmed.match(
    /^Mostrando\s+(.+?),\s*voc[eê]\s+diz\s*:\s*[«"“]?(.+?)[»"”]?$/is,
  );
  if (showSayMatch) {
    return {
      isSpeech: true,
      recipient: `com ${showSayMatch[1].trim()}`,
      spokenText: showSayMatch[2].trim(),
    };
  }

  return { isSpeech: false, spokenText: trimmed };
}

export function SceneBeatsRenderer({
  campaign,
  text,
  beats,
  dialogueStyle,
  onOpenRelationships,
}: SceneBeatsRendererProps) {
  if (dialogueStyle === 'classic') {
    return (
      <div className="font-reading space-y-4 text-[var(--text-primary)]">
        {text.split(/\n{2,}/).map((para, idx) => (
          <p key={idx}>{para}</p>
        ))}
      </div>
    );
  }

  const resolvedBeats =
    beats && beats.length > 0
      ? beats
      : parseLegacyTextToBeats(text, campaign.player.name);

  const npcs = campaign.codex.npcs;
  const player = campaign.player;

  return (
    <div className="space-y-3.5">
      {resolvedBeats.map((beat, idx) => {
        if (beat.kind === 'narration') {
          return (
            <div
              key={idx}
              className="font-reading space-y-3 text-[var(--text-primary)]/95"
            >
              {beat.text.split(/\n{2,}/).map((para, pIdx) => (
                <p key={pIdx}>{para}</p>
              ))}
            </div>
          );
        }

        const isProtag = Boolean(beat.isProtagonist);
        const matchedNpc = !isProtag
          ? findMatchingNpc(npcs, beat.speaker)
          : undefined;
        const relMeta = matchedNpc
          ? RELATIONSHIP_META[matchedNpc.relationship ?? 'stranger'] ??
            RELATIONSHIP_META.stranger
          : null;
        const isRomantic =
          matchedNpc?.relationship === 'romance' ||
          matchedNpc?.relationship === 'partner';
        const speakerLabel = isProtag
          ? player.name
          : matchedNpc?.name || beat.speaker || 'Personagem';
        const accentColor = isProtag
          ? 'var(--accent)'
          : relMeta?.color || 'var(--accent)';
        const portraitUrl = isProtag
          ? player.portraitUrl
          : matchedNpc?.portraitUrl;

        // Phone / WhatsApp / SMS / Radio / Letter Message Card
        if (beat.kind === 'message') {
          const msgStyle = inferMessageStyle(beat.channel);
          const ChannelIcon = msgStyle.Icon;

          return (
            <div
              key={idx}
              className={`flex ${isProtag ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`w-full max-w-[92%] sm:max-w-[82%] overflow-hidden rounded-2xl border shadow-sm`}
                style={{
                  borderColor: msgStyle.border,
                  backgroundColor: msgStyle.bg,
                }}
              >
                {/* Channel Bar */}
                <div
                  className="flex items-center justify-between gap-2 border-b px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    borderColor: msgStyle.border,
                    color: msgStyle.accent,
                  }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <ChannelIcon className="h-3 w-3" />
                    {msgStyle.label}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono-tech opacity-85">
                    {isProtag ? (
                      <>
                        Enviada
                        <CheckCheck className="h-3 w-3" />
                      </>
                    ) : (
                      'Recebida'
                    )}
                  </span>
                </div>

                {/* Sender + Message Body */}
                <div className="flex items-start gap-2.5 p-3">
                  <button
                    type="button"
                    disabled={!matchedNpc || !onOpenRelationships}
                    onClick={() =>
                      matchedNpc && onOpenRelationships?.(matchedNpc.id)
                    }
                    className="shrink-0 disabled:cursor-default"
                    title={
                      matchedNpc
                        ? `Abrir ficha de ${matchedNpc.name}`
                        : speakerLabel
                    }
                  >
                    {portraitUrl ? (
                      <img
                        src={portraitUrl}
                        alt={speakerLabel}
                        className="h-8 w-8 rounded-full border object-cover"
                        style={{ borderColor: accentColor }}
                      />
                    ) : (
                      <span
                        className="font-display flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-bold"
                        style={{
                          borderColor: accentColor,
                          color: accentColor,
                          backgroundColor: 'var(--bg-surface)',
                        }}
                      >
                        {getInitials(speakerLabel)}
                      </span>
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={!matchedNpc || !onOpenRelationships}
                        onClick={() =>
                          matchedNpc && onOpenRelationships?.(matchedNpc.id)
                        }
                        className="text-xs font-semibold hover:underline disabled:no-underline disabled:cursor-default"
                        style={{ color: accentColor }}
                      >
                        {speakerLabel}
                      </button>
                      {isRomantic ? (
                        <Heart className="h-3 w-3 fill-[#f472b6] text-[#f472b6]" />
                      ) : null}
                      {beat.emotion ? (
                        <span className="rounded-full bg-[var(--bg-surface)]/80 px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                          {beat.emotion}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[14px] leading-relaxed text-[var(--text-primary)] sm:text-[15px]">
                      {beat.text}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // In-Person Character Dialogue Speech Bubble
        return (
          <div
            key={idx}
            className={`flex items-start gap-2.5 ${
              isProtag ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Speaker Avatar */}
            <button
              type="button"
              disabled={!matchedNpc || !onOpenRelationships}
              onClick={() => matchedNpc && onOpenRelationships?.(matchedNpc.id)}
              title={
                matchedNpc
                  ? `Abrir Ficha Completa de ${matchedNpc.name}`
                  : speakerLabel
              }
              className="mt-0.5 shrink-0 transition hover:scale-105 disabled:cursor-default disabled:hover:scale-100"
            >
              {portraitUrl ? (
                <img
                  src={portraitUrl}
                  alt={speakerLabel}
                  className="h-9 w-9 rounded-2xl border-2 object-cover shadow-sm sm:h-10 sm:w-10"
                  style={{ borderColor: accentColor }}
                />
              ) : (
                <span
                  className="font-display flex h-9 w-9 items-center justify-center rounded-2xl border-2 bg-[var(--bg-elevated)] text-xs font-bold shadow-sm sm:h-10 sm:w-10"
                  style={{ borderColor: accentColor, color: accentColor }}
                >
                  {getInitials(speakerLabel)}
                </span>
              )}
            </button>

            {/* Bubble Stack */}
            <div
              className={`flex max-w-[85%] flex-col sm:max-w-[80%] ${
                isProtag ? 'items-end' : 'items-start'
              }`}
            >
              {/* Name + Relationship + Tone */}
              <div
                className={`mb-1 flex flex-wrap items-center gap-1.5 px-1 ${
                  isProtag ? 'justify-end' : 'justify-start'
                }`}
              >
                <button
                  type="button"
                  disabled={!matchedNpc || !onOpenRelationships}
                  onClick={() =>
                    matchedNpc && onOpenRelationships?.(matchedNpc.id)
                  }
                  className="inline-flex items-center gap-1 text-xs font-bold tracking-wide hover:underline disabled:cursor-default disabled:no-underline"
                  style={{ color: accentColor }}
                >
                  <span>{speakerLabel}</span>
                  {isRomantic ? (
                    <Heart className="h-3 w-3 fill-[#f472b6] text-[#f472b6]" />
                  ) : null}
                </button>
                {matchedNpc && relMeta && !isRomantic ? (
                  <span className="text-[10px] text-[var(--text-muted)]">
                    · {relMeta.label}
                  </span>
                ) : null}
                {beat.emotion ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/80 px-2 py-0.5 text-[10px] italic text-[var(--text-muted)]">
                    <MessageCircle className="h-2.5 w-2.5 opacity-70" />
                    {beat.emotion}
                  </span>
                ) : null}
              </div>

              {/* Speech Bubble Body */}
              <div
                className={`relative border px-3.5 py-2.5 text-[15px] leading-relaxed text-[var(--text-primary)] shadow-sm sm:px-4 sm:py-3 ${
                  isProtag
                    ? 'rounded-2xl rounded-tr-sm border-[var(--accent)]/45 bg-[var(--accent-soft)]'
                    : 'rounded-2xl rounded-tl-sm bg-[var(--bg-elevated)]'
                }`}
                style={
                  !isProtag
                    ? {
                        borderColor: `${accentColor}45`,
                        borderLeftWidth: '3px',
                        borderLeftColor: accentColor,
                      }
                    : undefined
                }
              >
                <p className="whitespace-pre-wrap">{beat.text}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
