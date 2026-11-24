import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Sparkles,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { INTERACTIVE_TOUR_STEPS, type TourStep } from '../data/tourSteps';

interface InteractiveTourOverlayProps {
  open: boolean;
  onClose: (completed: boolean) => void;
  onPrepareStep?: (step: TourStep) => void;
}

interface SpotlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const PAD = 8;

export function InteractiveTourOverlay({
  open,
  onClose,
  onPrepareStep,
}: InteractiveTourOverlayProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));

  const step = INTERACTIVE_TOUR_STEPS[stepIdx] ?? INTERACTIVE_TOUR_STEPS[0];
  const total = INTERACTIVE_TOUR_STEPS.length;
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === total - 1;

  useEffect(() => {
    if (open) setStepIdx(0);
  }, [open]);

  const measureTarget = useCallback(() => {
    if (!open) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setViewport({ w: vw, h: vh });

    const isMobile = vw < 640;
    const primarySel = isMobile ? step.mobileSelector : step.desktopSelector;
    const fallbackSel = isMobile ? step.desktopSelector : step.mobileSelector;

    const findVisible = (sel: string): HTMLElement | null => {
      const list = Array.from(document.querySelectorAll<HTMLElement>(sel));
      for (const el of list) {
        const r = el.getBoundingClientRect();
        if (r.width > 4 && r.height > 4) return el;
      }
      return null;
    };

    const el = findVisible(primarySel) ?? findVisible(fallbackSel);
    if (!el) {
      setRect(null);
      return;
    }

    const r = el.getBoundingClientRect();
    // Clamp spotlight inside viewport so card & mask never overflow
    const left = Math.max(4, Math.min(vw - 24, r.left - PAD));
    const top = Math.max(4, Math.min(vh - 24, r.top - PAD));
    const maxW = Math.max(24, vw - left - 4);
    const maxH = Math.max(24, vh - top - 4);
    const width = Math.min(maxW, Math.min(vw - 16, r.width + PAD * 2));
    const height = Math.min(maxH, Math.min(vh * 0.62, r.height + PAD * 2));

    setRect({ left, top, width, height });
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    onPrepareStep?.(step);
    const t1 = window.setTimeout(measureTarget, 80);
    const t2 = window.setTimeout(measureTarget, 300);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [open, step, onPrepareStep, measureTarget]);

  useLayoutEffect(() => {
    if (!open) return;
    measureTarget();
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget, true);
    return () => {
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget, true);
    };
  }, [open, measureTarget]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose(false);
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        if (stepIdx < total - 1) setStepIdx((i) => i + 1);
        else onClose(true);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (stepIdx > 0) setStepIdx((i) => i - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, stepIdx, total, onClose]);

  if (!open) return null;

  // Smart card placement so it never overlaps the highlighted target or overflows viewport
  const isMobile = viewport.w < 640;
  const cardWidth = isMobile ? viewport.w - 24 : 380;
  let cardStyle: React.CSSProperties;

  if (!rect) {
    cardStyle = {
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      width: cardWidth,
    };
  } else if (isMobile) {
    const targetInBottomHalf = rect.top + rect.height / 2 > viewport.h * 0.52;
    cardStyle = targetInBottomHalf
      ? {
          left: 12,
          right: 12,
          top: 'max(4.2rem, calc(env(safe-area-inset-top) + 3.6rem))',
        }
      : {
          left: 12,
          right: 12,
          bottom: 'max(1rem, env(safe-area-inset-bottom))',
        };
  } else {
    const spaceBelow = viewport.h - (rect.top + rect.height);
    const spaceAbove = rect.top;
    const spaceRight = viewport.w - (rect.left + rect.width);
    const spaceLeft = rect.left;

    const clampLeft = (x: number) =>
      Math.max(16, Math.min(viewport.w - cardWidth - 16, x));
    const clampTop = (y: number) =>
      Math.max(16, Math.min(viewport.h - 290, y));

    if (spaceBelow >= 260) {
      cardStyle = {
        left: clampLeft(rect.left + rect.width / 2 - cardWidth / 2),
        top: rect.top + rect.height + 16,
        width: cardWidth,
      };
    } else if (spaceAbove >= 260) {
      cardStyle = {
        left: clampLeft(rect.left + rect.width / 2 - cardWidth / 2),
        bottom: viewport.h - rect.top + 16,
        width: cardWidth,
      };
    } else if (spaceRight >= cardWidth + 28) {
      cardStyle = {
        left: rect.left + rect.width + 16,
        top: clampTop(rect.top),
        width: cardWidth,
      };
    } else if (spaceLeft >= cardWidth + 28) {
      cardStyle = {
        left: rect.left - cardWidth - 16,
        top: clampTop(rect.top),
        width: cardWidth,
      };
    } else {
      cardStyle = {
        left: '50%',
        bottom: 24,
        transform: 'translateX(-50%)',
        width: cardWidth,
      };
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Tour Interativo MYTHOS: ${step.title}`}
      className="fixed inset-0 z-[95] overflow-hidden"
    >
      {/* Dimmed backdrop with smooth SVG spotlight cutout */}
      <svg
        width={viewport.w}
        height={viewport.h}
        className="pointer-events-auto fixed inset-0 h-full w-full"
        onClick={() => onClose(false)}
      >
        <defs>
          <mask id="mythos-tour-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {rect ? (
              <rect
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx={16}
                ry={16}
                fill="black"
              />
            ) : null}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(5, 8, 6, 0.78)"
          mask="url(#mythos-tour-spotlight-mask)"
        />
      </svg>

      {/* Glowing highlight ring around the active UI element */}
      {rect ? (
        <div
          style={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          }}
          className="pointer-events-none fixed rounded-2xl border-2 border-[var(--accent)] shadow-[0_0_0_4px_rgba(212,175,55,0.22),0_0_32px_rgba(212,175,55,0.35)] transition-all duration-300"
        />
      ) : null}

      {/* Floating Tour Explanation Card */}
      <div
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
        className="fixed z-[96] rounded-2xl border border-[var(--accent)]/55 bg-[var(--bg-surface)]/98 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.75)] backdrop-blur-xl transition-all duration-300"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            <Compass className="h-3 w-3" />
            Tour Interativo · {stepIdx + 1} / {total}
          </span>

          <button
            type="button"
            onClick={() => onClose(false)}
            title="Pular Tour"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-[var(--text-muted)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
          >
            <span>Pular</span>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
          <div
            style={{ width: `${((stepIdx + 1) / total) * 100}%` }}
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
          />
        </div>

        <h3 className="font-display mt-3 text-base font-semibold text-[var(--text-primary)]">
          {step.title}
        </h3>

        <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
          {step.description}
        </p>

        <div className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/70 px-3 py-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
          <span>{step.tip}</span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:opacity-35"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Anterior</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (isLast) onClose(true);
              else setStepIdx((i) => Math.min(total - 1, i + 1));
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] shadow-md transition hover:brightness-110"
          >
            {isLast ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Concluir Tour</span>
              </>
            ) : (
              <>
                <span>Próximo</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
