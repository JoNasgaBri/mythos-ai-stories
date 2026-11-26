import type { WeatherType, WorldPeriod, WorldThemeId } from '../types/game';

export type BattleParticleMode =
  | 'embers'
  | 'neon_rain'
  | 'mist'
  | 'spores'
  | 'ash_wind'
  | 'snow';

export type BattleHudStyle =
  | 'ornate'
  | 'cyber'
  | 'gothic'
  | 'tactical'
  | 'rusted';

export interface BattleStagePreset {
  id: WorldThemeId;
  name: string;
  shortLabel: string;
  subtitle: string;
  stageImageUrl: string;
  fallbackGradient: string;
  accentColor: string;
  secondaryColor: string;
  heroTileColor: string;
  enemyTileColor: string;
  hudBorderColor: string;
  hudStyle: BattleHudStyle;
  defaultParticles: BattleParticleMode;
  vignetteTint: string;
}

export const BATTLE_STAGE_PRESETS: Record<WorldThemeId, BattleStagePreset> = {
  fantasy: {
    id: 'fantasy',
    name: 'Cidadela de Lua & Brasas',
    shortLabel: 'Fantasia',
    subtitle: 'Pátio medieval iluminado por tochas e luar',
    stageImageUrl: '/battle-stages/fantasy.jpg',
    fallbackGradient:
      'radial-gradient(ellipse at 72% 28%, rgba(212,175,55,0.28), transparent 52%), radial-gradient(ellipse at 24% 78%, rgba(34,197,94,0.18), transparent 55%), linear-gradient(180deg, #0b1310 0%, #13211a 54%, #070a08 100%)',
    accentColor: '#e5b84b',
    secondaryColor: '#4ade80',
    heroTileColor: 'rgba(229, 184, 75, 0.34)',
    enemyTileColor: 'rgba(248, 113, 113, 0.34)',
    hudBorderColor: 'rgba(229, 184, 75, 0.52)',
    hudStyle: 'ornate',
    defaultParticles: 'embers',
    vignetteTint: 'rgba(8, 14, 11, 0.42)',
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Viaduto Neon Chuvoso',
    shortLabel: 'Cyberpunk',
    subtitle: 'Metrópole noturna de aço molhado e hologramas',
    stageImageUrl: '/battle-stages/cyberpunk.jpg',
    fallbackGradient:
      'radial-gradient(ellipse at 75% 24%, rgba(236,72,153,0.32), transparent 50%), radial-gradient(ellipse at 25% 75%, rgba(56,189,248,0.28), transparent 52%), linear-gradient(180deg, #09081a 0%, #171033 55%, #070611 100%)',
    accentColor: '#38bdf8',
    secondaryColor: '#f472b6',
    heroTileColor: 'rgba(56, 189, 248, 0.36)',
    enemyTileColor: 'rgba(244, 114, 182, 0.36)',
    hudBorderColor: 'rgba(56, 189, 248, 0.58)',
    hudStyle: 'cyber',
    defaultParticles: 'neon_rain',
    vignetteTint: 'rgba(9, 7, 24, 0.38)',
  },
  mystery: {
    id: 'mystery',
    name: 'Praça Vitoriana Nebulosa',
    shortLabel: 'Mistério',
    subtitle: 'Paralelepípedos úmidos sob lampiões a gás e névoa',
    stageImageUrl: '/battle-stages/mystery.jpg',
    fallbackGradient:
      'radial-gradient(ellipse at 70% 25%, rgba(192,132,252,0.26), transparent 52%), radial-gradient(ellipse at 25% 75%, rgba(245,158,11,0.16), transparent 55%), linear-gradient(180deg, #0d0b14 0%, #1b162a 55%, #08070d 100%)',
    accentColor: '#c084fc',
    secondaryColor: '#f59e0b',
    heroTileColor: 'rgba(245, 158, 11, 0.32)',
    enemyTileColor: 'rgba(192, 132, 252, 0.36)',
    hudBorderColor: 'rgba(192, 132, 252, 0.5)',
    hudStyle: 'gothic',
    defaultParticles: 'mist',
    vignetteTint: 'rgba(12, 9, 20, 0.45)',
  },
  zombies: {
    id: 'zombies',
    name: 'Avenida de Quarentena',
    shortLabel: 'Zumbis',
    subtitle: 'Asfalto rachado, cercas rompidas e sinalizadores',
    stageImageUrl: '/battle-stages/zombies.jpg',
    fallbackGradient:
      'radial-gradient(ellipse at 72% 25%, rgba(239,68,68,0.26), transparent 50%), radial-gradient(ellipse at 25% 78%, rgba(132,204,22,0.16), transparent 55%), linear-gradient(180deg, #0f110d 0%, #1b1d17 55%, #090a08 100%)',
    accentColor: '#a3e635',
    secondaryColor: '#f87171',
    heroTileColor: 'rgba(163, 230, 53, 0.3)',
    enemyTileColor: 'rgba(239, 68, 68, 0.36)',
    hudBorderColor: 'rgba(163, 230, 53, 0.45)',
    hudStyle: 'tactical',
    defaultParticles: 'spores',
    vignetteTint: 'rgba(11, 13, 9, 0.46)',
  },
  apocalyptic: {
    id: 'apocalyptic',
    name: 'Rodovia Calcinada',
    shortLabel: 'Apocalipse',
    subtitle: 'Viadutos colapsados sob poente de ferrugem e cinzas',
    stageImageUrl: '/battle-stages/apocalyptic.jpg',
    fallbackGradient:
      'radial-gradient(ellipse at 74% 25%, rgba(251,146,60,0.32), transparent 52%), radial-gradient(ellipse at 24% 76%, rgba(248,113,113,0.18), transparent 55%), linear-gradient(180deg, #160d09 0%, #26160f 55%, #0a0705 100%)',
    accentColor: '#fb923c',
    secondaryColor: '#fbbf24',
    heroTileColor: 'rgba(251, 191, 36, 0.34)',
    enemyTileColor: 'rgba(251, 146, 60, 0.38)',
    hudBorderColor: 'rgba(251, 146, 60, 0.54)',
    hudStyle: 'rusted',
    defaultParticles: 'ash_wind',
    vignetteTint: 'rgba(18, 10, 6, 0.4)',
  },
};

export const BATTLE_STAGE_PRESET_LIST: BattleStagePreset[] = [
  BATTLE_STAGE_PRESETS.fantasy,
  BATTLE_STAGE_PRESETS.cyberpunk,
  BATTLE_STAGE_PRESETS.mystery,
  BATTLE_STAGE_PRESETS.zombies,
  BATTLE_STAGE_PRESETS.apocalyptic,
];

export interface ResolvedStageAtmosphere {
  particleMode: BattleParticleMode;
  periodOverlayGradient: string;
  periodLabel: string;
}

export function resolveStageAtmosphere(
  preset: BattleStagePreset,
  period?: WorldPeriod,
  weatherType?: WeatherType,
): ResolvedStageAtmosphere {
  let particleMode: BattleParticleMode = preset.defaultParticles;
  if (weatherType === 'rain' || weatherType === 'storm') {
    particleMode = 'neon_rain';
  } else if (weatherType === 'snow') {
    particleMode = 'snow';
  } else if (weatherType === 'fog') {
    particleMode = 'mist';
  } else if (weatherType === 'ash') {
    particleMode = 'ash_wind';
  }

  let periodOverlayGradient = 'linear-gradient(180deg, rgba(0,0,0,0.22) 0%, transparent 45%, rgba(0,0,0,0.58) 100%)';
  let periodLabel = 'Crepúsculo';

  if (period === 'morning') {
    periodOverlayGradient =
      'linear-gradient(180deg, rgba(253, 224, 71, 0.08) 0%, rgba(56, 189, 248, 0.06) 42%, rgba(7, 10, 9, 0.62) 100%)';
    periodLabel = 'Manhã';
  } else if (period === 'afternoon') {
    periodOverlayGradient =
      'linear-gradient(180deg, rgba(251, 146, 60, 0.1) 0%, transparent 48%, rgba(7, 10, 9, 0.62) 100%)';
    periodLabel = 'Tarde';
  } else if (period === 'evening') {
    periodOverlayGradient =
      'linear-gradient(180deg, rgba(244, 114, 182, 0.1) 0%, rgba(15, 23, 42, 0.14) 50%, rgba(7, 10, 9, 0.68) 100%)';
    periodLabel = 'Entardecer';
  } else if (period === 'night') {
    periodOverlayGradient =
      'linear-gradient(180deg, rgba(15, 23, 42, 0.34) 0%, rgba(2, 6, 23, 0.18) 52%, rgba(5, 7, 10, 0.74) 100%)';
    periodLabel = 'Noite';
  }

  return {
    particleMode,
    periodOverlayGradient,
    periodLabel,
  };
}
