import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  Clock,
  FastForward,
  Flame,
  Snowflake,
  Sun,
  Wind,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  advanceClockByMinutes,
  derivePeriodFromHour,
  formatClockTime,
  TIME_ADVANCE_MODE_META,
  WEATHER_KEYS,
  WEATHER_META,
  WORLD_PERIOD_META,
} from '../engine/rpgSystem';
import type {
  LanguageId,
  TimeAdvanceMode,
  WeatherType,
  WorldClock,
} from '../types/game';

interface ClockWeatherPopoverProps {
  open: boolean;
  clock: WorldClock;
  language: LanguageId;
  onClose: () => void;
  onUpdateClock: (nextClock: WorldClock, toastMessage?: string) => void;
}

export const WEATHER_ICON: Record<WeatherType, typeof Sun> = {
  clear: Sun,
  cloudy: Cloud,
  rain: CloudRain,
  storm: CloudLightning,
  fog: CloudFog,
  heatwave: Flame,
  snow: Snowflake,
  ash: Wind,
};

const FIXED_STEPS = [
  { minutes: 10, label: '+10m' },
  { minutes: 15, label: '+15m' },
  { minutes: 30, label: '+30m' },
  { minutes: 60, label: '+1h' },
  { minutes: 120, label: '+2h' },
];

export function ClockWeatherPopover({
  open,
  clock,
  language,
  onClose,
  onUpdateClock,
}: ClockWeatherPopoverProps) {
  const [day, setDay] = useState(clock.day);
  const [hour, setHour] = useState(clock.hour ?? 8);
  const [minute, setMinute] = useState(clock.minute ?? 30);
  const [dateLabel, setDateLabel] = useState(clock.dateLabel ?? '');
  const [weatherType, setWeatherType] = useState<WeatherType>(
    clock.weatherType ?? 'cloudy',
  );
  const [advanceMode, setAdvanceMode] = useState<TimeAdvanceMode>(
    clock.advanceMode ?? 'ai_auto',
  );
  const [fixedStepMinutes, setFixedStepMinutes] = useState(
    clock.fixedStepMinutes ?? 15,
  );
  const [countdownLabel, setCountdownLabel] = useState(
    clock.countdown?.label ?? '',
  );
  const [countdownDays, setCountdownDays] = useState(
    clock.countdown?.daysLeft ?? 7,
  );

  useEffect(() => {
    if (!open) return;
    setDay(clock.day);
    setHour(clock.hour ?? 8);
    setMinute(clock.minute ?? 30);
    setDateLabel(clock.dateLabel ?? '');
    setWeatherType(clock.weatherType ?? 'cloudy');
    setAdvanceMode(clock.advanceMode ?? 'ai_auto');
    setFixedStepMinutes(clock.fixedStepMinutes ?? 15);
    setCountdownLabel(clock.countdown?.label ?? '');
    setCountdownDays(clock.countdown?.daysLeft ?? 7);
  }, [open, clock]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const period = derivePeriodFromHour(hour);
  const weatherMeta = WEATHER_META[weatherType];
  const ActiveWeatherIcon = WEATHER_ICON[weatherType];

  const handleApply = () => {
    const safeDay = Math.max(1, Math.round(Number(day) || 1));
    const safeHour = Math.max(0, Math.min(23, Math.round(Number(hour) || 0)));
    const safeMinute = Math.max(0, Math.min(59, Math.round(Number(minute) || 0)));
    const trimmedCountdown = countdownLabel.trim();

    const next: WorldClock = {
      ...clock,
      day: safeDay,
      hour: safeHour,
      minute: safeMinute,
      dateLabel: dateLabel.trim() || undefined,
      period: derivePeriodFromHour(safeHour),
      weatherType,
      weather: WEATHER_META[weatherType].label[language],
      advanceMode,
      fixedStepMinutes,
      countdown: trimmedCountdown
        ? {
            label: trimmedCountdown,
            daysLeft: Math.max(0, Math.round(Number(countdownDays) || 0)),
          }
        : undefined,
    };

    onUpdateClock(
      next,
      `Relógio atualizado: Dia ${next.day} · ${formatClockTime(safeHour, safeMinute)} (${next.weather})`,
    );
    onClose();
  };

  const handleQuickAdvance = (minutesToAdd: number, label: string) => {
    const next = advanceClockByMinutes(
      {
        ...clock,
        day,
        hour,
        minute,
        dateLabel: dateLabel.trim() || undefined,
        weatherType,
        weather: WEATHER_META[weatherType].label[language],
        advanceMode,
        fixedStepMinutes,
      },
      minutesToAdd,
      { lang: language },
    );
    onUpdateClock(
      next,
      `Tempo avançado (${label}): Dia ${next.day} · ${formatClockTime(next.hour, next.minute)}`,
    );
  };

  return (
    <div
      className="animate-backdrop-in fixed inset-0 z-50 flex items-start justify-center bg-black/55 p-4 pt-14 backdrop-blur-sm sm:pt-16"
      onClick={onClose}
      role="dialog"
      aria-label="Personalizar Relógio e Clima"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-island-drop w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-[var(--shadow-elevated)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/55 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--accent)]">
              <Clock className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-sm font-semibold tracking-wide text-[var(--text-primary)]">
                Relógio, Ritmo & Clima do Mundo
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Dia {day} · {formatClockTime(hour, minute)} ({WORLD_PERIOD_META[period].label[language]}) ·{' '}
                {weatherMeta.label[language]}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border-subtle)] p-1.5 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[75vh] space-y-5 overflow-y-auto p-5">
          {/* Quick Time Skip */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                <FastForward className="h-3.5 w-3.5 text-[var(--accent)]" />
                Avanço Rápido
              </span>
              <span className="font-mono-tech text-xs font-semibold text-[var(--accent)]">
                {formatClockTime(hour, minute)}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { mins: 15, label: '+15 min' },
                { mins: 60, label: '+1 hora' },
                { mins: 180, label: '+3 horas' },
                { mins: 360, label: '+6 horas' },
              ].map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => handleQuickAdvance(btn.mins, btn.label)}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Advance Mode */}
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Como o Tempo Avança nos Turnos
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['ai_auto', 'fixed_step', 'manual'] as TimeAdvanceMode[]).map(
                (mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setAdvanceMode(mode)}
                    className={`rounded-xl border p-2.5 text-left transition ${
                      advanceMode === mode
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div
                      className={`text-xs font-semibold ${
                        advanceMode === mode
                          ? 'text-[var(--accent)]'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {TIME_ADVANCE_MODE_META[mode].label}
                    </div>
                    <div className="mt-0.5 text-[10px] leading-snug text-[var(--text-muted)]">
                      {TIME_ADVANCE_MODE_META[mode].desc}
                    </div>
                  </button>
                ),
              )}
            </div>

            {advanceMode === 'fixed_step' ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-[var(--text-secondary)]">
                  Avançar por turno:
                </span>
                {FIXED_STEPS.map((st) => (
                  <button
                    key={st.minutes}
                    type="button"
                    onClick={() => setFixedStepMinutes(st.minutes)}
                    className={`font-mono-tech rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                      fixedStepMinutes === st.minutes
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Custom Day, Hour, Minute & Date Label */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Dia
              </label>
              <input
                type="number"
                min={1}
                max={9999}
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
                className="font-mono-tech w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Hora (0–23)
              </label>
              <input
                type="number"
                min={0}
                max={23}
                value={hour}
                onChange={(e) =>
                  setHour(Math.max(0, Math.min(23, Number(e.target.value) || 0)))
                }
                className="font-mono-tech w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Minuto (0–59)
              </label>
              <input
                type="number"
                min={0}
                max={59}
                step={5}
                value={minute}
                onChange={(e) =>
                  setMinute(Math.max(0, Math.min(59, Number(e.target.value) || 0)))
                }
                className="font-mono-tech w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Calendário / Data Personalizada (opcional)
            </label>
            <input
              type="text"
              value={dateLabel}
              onChange={(e) => setDateLabel(e.target.value)}
              placeholder="Ex: 14 de Outubro, 2026 · ou · Lua Minguante, Ano 412"
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Weather Selector */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Clima Atual
              </label>
              <span
                className="inline-flex items-center gap-1 text-[11px] font-medium"
                style={{ color: weatherMeta.color }}
              >
                <ActiveWeatherIcon className="h-3.5 w-3.5" />
                {weatherMeta.label[language]}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {WEATHER_KEYS.map((wt) => {
                const meta = WEATHER_META[wt];
                const Icon = WEATHER_ICON[wt];
                const active = weatherType === wt;
                return (
                  <button
                    key={wt}
                    type="button"
                    onClick={() => setWeatherType(wt)}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-center transition ${
                      active
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <Icon
                      className="h-4 w-4"
                      style={{ color: active ? meta.color : 'var(--text-secondary)' }}
                    />
                    <span className="truncate text-[10px] font-medium text-[var(--text-primary)]">
                      {meta.label[language]}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/55 px-3 py-2 text-[11px] text-[var(--text-secondary)]">
              <strong style={{ color: weatherMeta.color }}>Efeito no RPG:</strong>{' '}
              {weatherMeta.effectHint[language]}
            </p>
          </div>

          {/* Optional Event Countdown */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Contagem Regressiva de Evento (Opcional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={countdownLabel}
                onChange={(e) => setCountdownLabel(e.target.value)}
                placeholder="Ex: Início do Surto / Eclipse / Chegada da Frota"
                className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
              />
              <input
                type="number"
                min={0}
                max={999}
                value={countdownDays}
                onChange={(e) => setCountdownDays(Number(e.target.value))}
                title="Dias restantes"
                className="font-mono-tech w-20 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-2 text-center text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>
            <p className="mt-1.5 text-[10px] text-[var(--text-muted)]">
              Deixe em branco para ocultar a contagem regressiva.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[#111] shadow transition hover:brightness-110"
          >
            Salvar Relógio & Clima
          </button>
        </div>
      </div>
    </div>
  );
}
