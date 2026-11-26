import type { BattleParticleMode, BattleStagePreset } from '../data/battleStagePresets';
import type { ResolvedStageAtmosphere } from '../data/battleStagePresets';

const EMBER_SEEDS = [
  { left: '8%', bottom: '18%', delay: '0s', dur: '4.4s', size: 4 },
  { left: '19%', bottom: '24%', delay: '1.3s', dur: '5.1s', size: 3 },
  { left: '31%', bottom: '14%', delay: '2.1s', dur: '4.0s', size: 5 },
  { left: '44%', bottom: '22%', delay: '0.7s', dur: '5.5s', size: 3 },
  { left: '57%', bottom: '16%', delay: '1.8s', dur: '4.6s', size: 4 },
  { left: '68%', bottom: '20%', delay: '0.4s', dur: '4.9s', size: 5 },
  { left: '81%', bottom: '15%', delay: '2.4s', dur: '4.2s', size: 3 },
  { left: '91%', bottom: '25%', delay: '1.1s', dur: '5.2s', size: 4 },
  { left: '26%', bottom: '32%', delay: '3.0s', dur: '4.8s', size: 3 },
  { left: '74%', bottom: '30%', delay: '2.7s', dur: '5.4s', size: 4 },
];

const RAIN_SEEDS = [
  { left: '6%', delay: '0s', dur: '0.85s', h: 28 },
  { left: '14%', delay: '0.35s', dur: '0.75s', h: 34 },
  { left: '22%', delay: '0.15s', dur: '0.92s', h: 26 },
  { left: '30%', delay: '0.55s', dur: '0.78s', h: 32 },
  { left: '39%', delay: '0.25s', dur: '0.88s', h: 24 },
  { left: '47%', delay: '0.62s', dur: '0.72s', h: 36 },
  { left: '56%', delay: '0.12s', dur: '0.84s', h: 30 },
  { left: '64%', delay: '0.48s', dur: '0.76s', h: 28 },
  { left: '72%', delay: '0.28s', dur: '0.90s', h: 34 },
  { left: '81%', delay: '0.68s', dur: '0.80s', h: 26 },
  { left: '89%', delay: '0.08s', dur: '0.82s', h: 32 },
  { left: '95%', delay: '0.42s', dur: '0.74s', h: 28 },
];

const ASH_SEEDS = [
  { top: '18%', delay: '0s', dur: '6.2s', size: 4 },
  { top: '30%', delay: '1.4s', dur: '7.4s', size: 3 },
  { top: '42%', delay: '2.6s', dur: '5.8s', size: 5 },
  { top: '54%', delay: '0.8s', dur: '6.8s', size: 3 },
  { top: '65%', delay: '3.2s', dur: '7.1s', size: 4 },
  { top: '76%', delay: '1.9s', dur: '6.0s', size: 3 },
  { top: '24%', delay: '4.1s', dur: '6.6s', size: 4 },
  { top: '48%', delay: '3.6s', dur: '5.5s', size: 3 },
];

function AtmosphericParticles({
  mode,
  accentColor,
}: {
  mode: BattleParticleMode;
  accentColor: string;
}) {
  if (mode === 'neon_rain') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {RAIN_SEEDS.map((r, i) => (
          <span
            key={i}
            style={{
              left: r.left,
              height: `${r.h}px`,
              animationDelay: r.delay,
              animationDuration: r.dur,
              background:
                i % 3 === 0
                  ? 'linear-gradient(180deg, transparent, rgba(244,114,182,0.75))'
                  : 'linear-gradient(180deg, transparent, rgba(56,189,248,0.8))',
            }}
            className="battle-rain-streak absolute top-0 w-[1.5px] rotate-[12deg]"
          />
        ))}
      </div>
    );
  }

  if (mode === 'mist') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          style={{
            background:
              'radial-gradient(ellipse at 30% 80%, rgba(192,132,252,0.18), transparent 60%), radial-gradient(ellipse at 75% 75%, rgba(226,232,240,0.14), transparent 58%)',
          }}
          className="battle-mist-band absolute inset-x-[-10%] bottom-0 h-[55%] blur-xl"
        />
        {EMBER_SEEDS.slice(0, 6).map((p, i) => (
          <span
            key={i}
            style={{
              left: p.left,
              bottom: p.bottom,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: p.delay,
              animationDuration: `${parseFloat(p.dur) + 2}s`,
              backgroundColor: 'rgba(253, 224, 71, 0.7)',
              boxShadow: '0 0 8px rgba(253, 224, 71, 0.8)',
            }}
            className="battle-ember-particle pixel-art-sprite absolute"
          />
        ))}
      </div>
    );
  }

  if (mode === 'ash_wind') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {ASH_SEEDS.map((a, i) => (
          <span
            key={i}
            style={{
              top: a.top,
              width: `${a.size}px`,
              height: `${a.size}px`,
              animationDelay: a.delay,
              animationDuration: a.dur,
              backgroundColor: i % 2 === 0 ? '#fb923c' : '#cbd5e1',
              boxShadow: i % 2 === 0 ? '0 0 6px #fb923c' : 'none',
            }}
            className="battle-ash-particle pixel-art-sprite absolute left-0"
          />
        ))}
      </div>
    );
  }

  if (mode === 'snow') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {RAIN_SEEDS.map((s, i) => (
          <span
            key={i}
            style={{
              left: s.left,
              width: `${3 + (i % 3)}px`,
              height: `${3 + (i % 3)}px`,
              animationDelay: `${parseFloat(s.delay) * 5}s`,
              animationDuration: `${4.5 + (i % 4)}s`,
              backgroundColor: 'rgba(241, 245, 249, 0.85)',
            }}
            className="battle-snow-particle pixel-art-sprite absolute top-0"
          />
        ))}
      </div>
    );
  }

  // 'embers' (Fantasy) or 'spores' (Zombies)
  const particleColor = mode === 'spores' ? '#bef264' : accentColor;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {EMBER_SEEDS.map((e, i) => (
        <span
          key={i}
          style={{
            left: e.left,
            bottom: e.bottom,
            width: `${e.size}px`,
            height: `${e.size}px`,
            animationDelay: e.delay,
            animationDuration: e.dur,
            backgroundColor: i % 3 === 0 ? '#fef08a' : particleColor,
            boxShadow: `0 0 8px ${particleColor}`,
          }}
          className="battle-ember-particle pixel-art-sprite absolute"
        />
      ))}
    </div>
  );
}

export function BattleStageBackdrop({
  preset,
  atmosphere,
  useAiScene,
  aiSceneUrl,
}: {
  preset: BattleStagePreset;
  atmosphere: ResolvedStageAtmosphere;
  useAiScene: boolean;
  aiSceneUrl?: string | null;
}) {
  const activeImg = useAiScene && aiSceneUrl ? aiSceneUrl : preset.stageImageUrl;

  return (
    <>
      {/* Fallback Rich World Gradient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: preset.fallbackGradient }}
      />

      {/* HD-2D Pixel Art World Stage Preset (or AI Scene toggle) */}
      <img
        src={activeImg}
        alt=""
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500 ${
          useAiScene && aiSceneUrl
            ? 'opacity-45 saturate-110'
            : 'pixel-art-sprite opacity-85 brightness-[0.86] contrast-[1.06]'
        }`}
      />

      {/* Period-of-day atmospheric glaze + crisp bottom contrast for sprites */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: atmosphere.periodOverlayGradient }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 42%, transparent 38%, ${preset.vignetteTint} 100%)`,
        }}
      />

      {/* Live Weather / World Ambient Pixel Particles */}
      <AtmosphericParticles
        mode={atmosphere.particleMode}
        accentColor={preset.accentColor}
      />
    </>
  );
}
