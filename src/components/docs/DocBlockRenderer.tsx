import {
  AlertTriangle,
  Check,
  Compass,
  Copy,
  Hash,
  Info,
  Lightbulb,
  MessageSquare,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { useState } from 'react';
import type { DocBlock } from '../../data/docsTypes';

interface DocBlockRendererProps {
  blocks: DocBlock[];
  onAnchorClick?: (headingId: string) => void;
}

const CALLOUT_STYLE = {
  tip: {
    border: 'border-[var(--success)]/40',
    bg: 'bg-[var(--success)]/10',
    accent: 'text-[var(--success)]',
    Icon: Lightbulb,
  },
  info: {
    border: 'border-[#38bdf8]/40',
    bg: 'bg-[#38bdf8]/10',
    accent: 'text-[#38bdf8]',
    Icon: Info,
  },
  warning: {
    border: 'border-[var(--warning)]/45',
    bg: 'bg-[var(--warning)]/10',
    accent: 'text-[var(--warning)]',
    Icon: AlertTriangle,
  },
  example: {
    border: 'border-[var(--accent)]/45',
    bg: 'bg-[var(--accent-soft)]/50',
    accent: 'text-[var(--accent)]',
    Icon: Sparkles,
  },
} as const;

const PROMPT_MODE_META = {
  act: { label: 'Modo Agir', Icon: Compass, color: '#a3e635' },
  say: { label: 'Modo Falar', Icon: MessageSquare, color: '#38bdf8' },
  direct: { label: 'Modo Dirigir', Icon: Wand2, color: '#fbbf24' },
} as const;

export function DocBlockRenderer({
  blocks,
  onAnchorClick,
}: DocBlockRendererProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      window.setTimeout(() => {
        setCopiedIdx((cur) => (cur === idx ? null : cur));
      }, 1800);
    } catch {
      // Fallback ignored on restricted origins
    }
  };

  return (
    <div className="space-y-5">
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          const isH2 = block.level === 2;
          return (
            <div
              key={`${block.id}_${idx}`}
              id={block.id}
              className={`group flex items-center gap-2 scroll-mt-24 ${
                isH2
                  ? 'mt-8 border-b border-[var(--border-subtle)] pb-2 pt-1'
                  : 'mt-5'
              }`}
            >
              {isH2 ? (
                <h2 className="font-display text-lg font-semibold tracking-wide text-[var(--text-primary)] sm:text-xl">
                  {block.text}
                </h2>
              ) : (
                <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
                  {block.text}
                </h3>
              )}
              <button
                type="button"
                onClick={() => onAnchorClick?.(block.id)}
                aria-label={`Ir para seção ${block.text}`}
                className="rounded p-1 text-[var(--text-muted)] opacity-0 transition hover:text-[var(--accent)] group-hover:opacity-100"
              >
                <Hash className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        }

        if (block.type === 'paragraph') {
          return (
            <p
              key={idx}
              className="text-sm leading-relaxed text-[var(--text-secondary)] sm:text-[15px] sm:leading-7"
            >
              {block.text}
            </p>
          );
        }

        if (block.type === 'callout') {
          const st = CALLOUT_STYLE[block.tone];
          const Icon = st.Icon;
          return (
            <aside
              key={idx}
              className={`rounded-2xl border ${st.border} ${st.bg} p-4`}
            >
              <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${st.accent}`}>
                <Icon className="h-4 w-4 shrink-0" />
                <span>{block.title}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-primary)] sm:text-[13.5px]">
                {block.body}
              </p>
            </aside>
          );
        }

        if (block.type === 'table') {
          return (
            <div
              key={idx}
              className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
            >
              {block.caption ? (
                <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/70 px-4 py-2 font-mono-tech text-[11px] text-[var(--text-muted)]">
                  {block.caption}
                </div>
              ) : null}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[440px] border-collapse text-left text-xs sm:text-[13px]">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/90">
                      {block.headers.map((h, hIdx) => (
                        <th
                          key={hIdx}
                          className="px-3.5 py-2.5 font-semibold text-[var(--text-primary)]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="border-b border-[var(--border-subtle)]/60 last:border-0 odd:bg-[var(--bg-canvas)]/25"
                      >
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className={`px-3.5 py-2.5 align-top leading-snug ${
                              cIdx === 0
                                ? 'font-semibold text-[var(--text-primary)]'
                                : 'text-[var(--text-secondary)]'
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        if (block.type === 'steps') {
          return (
            <ol key={idx} className="space-y-3">
              {block.items.map((step, sIdx) => (
                <li
                  key={sIdx}
                  className="flex items-start gap-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 p-3.5 sm:p-4"
                >
                  <span className="font-mono-tech flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--accent)]/50 bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
                    {sIdx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      {step.title}
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-[13.5px]">
                      {step.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === 'promptExample') {
          const pm = PROMPT_MODE_META[block.mode];
          const ModeIcon = pm.Icon;
          const isCopied = copiedIdx === idx;
          return (
            <div
              key={idx}
              className="overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-elevated)]/85 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/60 px-3.5 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${pm.color}1F`,
                      color: pm.color,
                    }}
                  >
                    <ModeIcon className="h-3 w-3" />
                    <span>{pm.label}</span>
                  </span>
                  <span className="text-xs font-medium text-[var(--text-primary)]">
                    {block.label}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => void handleCopy(block.prompt, idx)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3 w-3 text-[var(--success)]" />
                      <span className="text-[var(--success)]">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-3.5 sm:p-4">
                <p className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/70 p-3 font-mono-tech text-xs leading-relaxed text-[var(--text-primary)] sm:text-[13px]">
                  “{block.prompt}”
                </p>
                <p className="mt-2.5 text-xs leading-relaxed text-[var(--text-muted)]">
                  {block.explanation}
                </p>
              </div>
            </div>
          );
        }

        if (block.type === 'cardGrid') {
          const cols =
            block.columns === 3
              ? 'sm:grid-cols-2 lg:grid-cols-3'
              : 'sm:grid-cols-2';
          return (
            <div key={idx} className={`grid gap-3 ${cols}`}>
              {block.cards.map((card, cIdx) => (
                <div
                  key={cIdx}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 p-4 shadow-sm"
                >
                  <h4
                    className="font-display text-sm font-semibold"
                    style={{ color: card.accent || 'var(--text-primary)' }}
                  >
                    {card.title}
                  </h4>
                  {card.subtitle ? (
                    <p className="mt-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                      {card.subtitle}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          );
        }

        if (block.type === 'bulletList') {
          return (
            <ul key={idx} className="space-y-2.5 pl-1">
              {block.items.map((item, iIdx) => (
                <li
                  key={iIdx}
                  className="flex items-start gap-2.5 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-[14px]"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span>
                    {item.lead ? (
                      <strong className="text-[var(--text-primary)]">
                        {item.lead}{' '}
                      </strong>
                    ) : null}
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        return null;
      })}
    </div>
  );
}
