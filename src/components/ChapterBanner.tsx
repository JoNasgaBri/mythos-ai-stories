import type { ChapterTransitionEvent } from '../types/game';

interface ChapterBannerProps {
  banner: ChapterTransitionEvent | null;
  onDismiss: () => void;
}

export function ChapterBanner({ banner, onDismiss }: ChapterBannerProps) {
  if (!banner) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-4">
      <button
        key={banner.id}
        type="button"
        onClick={onDismiss}
        className="animate-chapter-curtain pointer-events-auto w-full max-w-lg rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-glass)] px-6 py-4 text-center shadow-[var(--shadow-elevated)] backdrop-blur-xl transition hover:border-[var(--accent)]"
      >
        <div className="flex items-center justify-center gap-3">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-[var(--accent)]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[var(--accent)]">
            {banner.eyebrow}
          </span>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-[var(--accent)]" />
        </div>

        <h2 className="font-display mt-1.5 text-xl font-semibold tracking-wide text-[var(--text-primary)] sm:text-2xl">
          {banner.title}
        </h2>

        {banner.subtitle ? (
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {banner.subtitle}
          </p>
        ) : null}
      </button>
    </div>
  );
}
