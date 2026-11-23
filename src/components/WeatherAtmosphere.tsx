import type { WeatherType, WorldPeriod } from '../types/game';

interface WeatherAtmosphereProps {
  weatherType?: WeatherType;
  period?: WorldPeriod;
  enabled: boolean;
}

const PERIOD_TINT: Record<WorldPeriod, string> = {
  morning: 'radial-gradient(circle at 80% 10%, rgba(251, 191, 36, 0.08), transparent 55%)',
  afternoon: 'radial-gradient(circle at 60% 0%, rgba(253, 224, 71, 0.05), transparent 55%)',
  evening: 'radial-gradient(circle at 75% 15%, rgba(249, 115, 22, 0.09), transparent 58%)',
  night: 'radial-gradient(circle at 50% 0%, rgba(30, 58, 138, 0.14), transparent 65%)',
};

export function WeatherAtmosphere({
  weatherType = 'cloudy',
  period = 'morning',
  enabled,
}: WeatherAtmosphereProps) {
  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden transition-opacity duration-700"
    >
      {/* Subtle time-of-day sky glow */}
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={{ background: PERIOD_TINT[period] }}
      />

      {/* Rain / Storm Streaks */}
      {weatherType === 'rain' || weatherType === 'storm' ? (
        <div
          className={`mythos-weather-rain absolute inset-0 ${
            weatherType === 'storm' ? 'opacity-45' : 'opacity-25'
          }`}
        />
      ) : null}

      {/* Subtle Storm Flash */}
      {weatherType === 'storm' ? (
        <div className="mythos-weather-lightning absolute inset-0" />
      ) : null}

      {/* Soft Fog Veil */}
      {weatherType === 'fog' ? (
        <div className="mythos-weather-fog absolute inset-0 opacity-40" />
      ) : null}

      {/* Snowflakes */}
      {weatherType === 'snow' ? (
        <div className="mythos-weather-snow absolute inset-0 opacity-45" />
      ) : null}

      {/* Floating Ash / Dust */}
      {weatherType === 'ash' ? (
        <div className="mythos-weather-ash absolute inset-0 opacity-35" />
      ) : null}

      {/* Warm Heatwave Haze */}
      {weatherType === 'heatwave' ? (
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(circle at 50% 0%, rgba(251, 146, 60, 0.14), transparent 60%)',
          }}
        />
      ) : null}
    </div>
  );
}
