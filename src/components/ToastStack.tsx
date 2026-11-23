import {
  AlertTriangle,
  Award,
  BookMarked,
  Brain,
  CheckCircle2,
  Clock,
  Coins,
  Flag,
  Heart,
  MapPin,
  PackagePlus,
  Shield,
  ShieldAlert,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import type { ToastMessage } from '../types/game';

interface ToastStackProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex max-w-xs flex-col gap-2 sm:right-6 sm:bottom-6">
      {toasts.map((toast) => {
        const icon =
          toast.kind === 'level' || toast.kind === 'talent' ? (
            <Award className="h-4 w-4 text-[#fbbf24]" />
          ) : toast.kind === 'inspiration' ? (
            <Sparkles className="h-4 w-4 text-[#fbbf24]" />
          ) : toast.kind === 'base' ? (
            <Shield className="h-4 w-4 text-[var(--success)]" />
          ) : toast.kind === 'time' ? (
            <Clock className="h-4 w-4 text-[var(--accent)]" />
          ) : toast.kind === 'bond' ? (
            <Heart className="h-4 w-4 text-[#f472b6]" />
          ) : toast.kind === 'currency' ? (
            <Coins className="h-4 w-4 text-[#fbbf24]" />
          ) : toast.kind === 'item_add' ? (
            <PackagePlus className="h-4 w-4 text-[var(--accent)]" />
          ) : toast.kind === 'quest' || toast.kind === 'save' ? (
            <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
          ) : toast.kind === 'journal' ? (
            <BookMarked className="h-4 w-4 text-[var(--accent)]" />
          ) : toast.kind === 'npc' ? (
            <UserPlus className="h-4 w-4 text-[var(--accent)]" />
          ) : toast.kind === 'location' ? (
            <MapPin className="h-4 w-4 text-[var(--accent)]" />
          ) : toast.kind === 'faction' ? (
            <Flag className="h-4 w-4 text-[var(--accent)]" />
          ) : toast.kind === 'memory' ? (
            <Brain className="h-4 w-4 text-[var(--accent)]" />
          ) : toast.kind === 'error' || toast.kind === 'crisis' ? (
            <AlertTriangle className="h-4 w-4 text-[var(--danger)]" />
          ) : toast.kind === 'vigor' || toast.kind === 'tension' ? (
            <ShieldAlert className="h-4 w-4 text-[var(--warning)]" />
          ) : (
            <Sparkles className="h-4 w-4 text-[var(--accent)]" />
          );

        return (
          <button
            key={toast.id}
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="animate-toast-in pointer-events-auto flex items-center gap-2.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-glass)] px-3.5 py-2.5 text-left text-xs font-medium text-[var(--text-primary)] shadow-[var(--shadow-card)] backdrop-blur-md transition hover:-translate-x-0.5 hover:border-[var(--accent)]"
          >
            <span className="shrink-0">{icon}</span>
            <span className="leading-snug">{toast.message}</span>
          </button>
        );
      })}
    </div>
  );
}
