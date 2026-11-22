import type { WorldThemeId } from '../types/game';

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function encodeSvgDataUrl(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

interface PaletteConfig {
  bgTop: string;
  bgMid: string;
  bgBottom: string;
  glow: string;
  accent: string;
  secondary: string;
  silhouette: string;
  silhouetteFar: string;
}

const THEME_PALETTES: Record<WorldThemeId, PaletteConfig> = {
  fantasy: {
    bgTop: '#0b0908',
    bgMid: '#24180e',
    bgBottom: '#080706',
    glow: '#d4a853',
    accent: '#f0c878',
    secondary: '#7a3e1a',
    silhouette: '#0d0b09',
    silhouetteFar: '#19140f',
  },
  cyberpunk: {
    bgTop: '#050814',
    bgMid: '#0f1c38',
    bgBottom: '#04060d',
    glow: '#22d3ee',
    accent: '#f43f5e',
    secondary: '#1d4ed8',
    silhouette: '#060a14',
    silhouetteFar: '#0c1528',
  },
  mystery: {
    bgTop: '#0c0b09',
    bgMid: '#261e16',
    bgBottom: '#070605',
    glow: '#c99a5b',
    accent: '#e5be84',
    secondary: '#52402d',
    silhouette: '#0b0a08',
    silhouetteFar: '#171310',
  },
  zombies: {
    bgTop: '#080b08',
    bgMid: '#182618',
    bgBottom: '#050705',
    glow: '#a3e635',
    accent: '#84cc16',
    secondary: '#2f4531',
    silhouette: '#090d09',
    silhouetteFar: '#121912',
  },
  apocalyptic: {
    bgTop: '#120a07',
    bgMid: '#3a1d11',
    bgBottom: '#0a0605',
    glow: '#e07a3a',
    accent: '#fb923c',
    secondary: '#7c2d12',
    silhouette: '#110907',
    silhouetteFar: '#21120c',
  },
};

export function generateDemoSceneArt(
  theme: WorldThemeId,
  title: string,
  location: string,
  mood = '',
): string {
  const pal = THEME_PALETTES[theme];
  const seed = hashString(`${theme}|${title}|${location}|${mood}`);
  const sunX = 240 + (seed % 480);
  const sunY = 125 + ((seed >> 4) % 90);
  const sunR = 62 + ((seed >> 8) % 34);

  const stars = Array.from({ length: 18 }, (_, i) => {
    const sx = ((seed * (i + 3)) % 940) + 10;
    const sy = (((seed >> 3) * (i + 7)) % 220) + 12;
    const sr = ((i % 3) + 1) * 0.8;
    const op = 0.25 + ((i % 4) * 0.14);
    return `<circle cx="${sx}" cy="${sy}" r="${sr}" fill="${pal.accent}" opacity="${op.toFixed(2)}" />`;
  }).join('');

  let foregroundLayer = '';

  if (theme === 'fantasy') {
    foregroundLayer = `
      <!-- Split Eclipse Ring -->
      <circle cx="${sunX}" cy="${sunY}" r="${sunR}" fill="url(#orbGrad)" opacity="0.92" />
      <circle cx="${sunX + 14}" cy="${sunY - 6}" r="${Math.round(sunR * 0.78)}" fill="${pal.bgMid}" opacity="0.88" />
      <!-- Distant spires & pines -->
      <path d="M0,410 L110,330 L175,365 L240,295 L295,355 L410,315 L520,375 L645,280 L670,235 L695,280 L765,335 L865,295 L960,360 L960,540 L0,540 Z" fill="${pal.silhouetteFar}" />
      <path d="M0,455 Q180,415 360,448 T720,432 T960,460 L960,540 L0,540 Z" fill="${pal.silhouette}" />
      <!-- Castle / Ruins silhouette -->
      <path d="M645,350 L645,255 L657,255 L657,242 L668,242 L668,255 L680,255 L680,242 L691,242 L691,255 L702,255 L702,350 Z" fill="${pal.silhouette}" />
      <!-- Hanging mist -->
      <ellipse cx="480" cy="430" rx="520" ry="48" fill="url(#mistGrad)" />
    `;
  } else if (theme === 'cyberpunk') {
    const towers = Array.from({ length: 14 }, (_, i) => {
      const tx = i * 72 - 10;
      const tw = 48 + ((seed >> i) % 36);
      const th = 190 + ((seed >> (i % 8)) % 220);
      const ty = 540 - th;
      const winColor = i % 2 === 0 ? pal.glow : pal.accent;
      return `
        <rect x="${tx}" y="${ty}" width="${tw}" height="${th}" fill="${i % 3 === 0 ? pal.silhouette : pal.silhouetteFar}" />
        <rect x="${tx + 8}" y="${ty + 18}" width="${Math.max(8, tw - 16)}" height="3" fill="${winColor}" opacity="0.7" />
        <rect x="${tx + 10}" y="${ty + 36}" width="4" height="${Math.min(80, th - 60)}" fill="${winColor}" opacity="0.32" />
      `;
    }).join('');

    const rain = Array.from({ length: 24 }, (_, i) => {
      const rx = ((seed * (i + 5)) % 950) + 5;
      const ry = ((seed * (i + 11)) % 420) + 20;
      return `<line x1="${rx}" y1="${ry}" x2="${rx - 14}" y2="${ry + 42}" stroke="${pal.glow}" stroke-width="1" opacity="0.22" />`;
    }).join('');

    foregroundLayer = `
      <circle cx="${sunX}" cy="${sunY}" r="${sunR * 1.4}" fill="${pal.accent}" opacity="0.16" />
      <circle cx="${sunX}" cy="${sunY}" r="${sunR * 0.7}" fill="${pal.glow}" opacity="0.32" />
      ${towers}
      <!-- Wet skybridge reflection -->
      <rect x="0" y="458" width="960" height="82" fill="${pal.silhouette}" opacity="0.92" />
      <line x1="0" y1="458" x2="960" y2="458" stroke="${pal.glow}" stroke-width="2" opacity="0.55" />
      ${rain}
    `;
  } else if (theme === 'mystery') {
    foregroundLayer = `
      <circle cx="${sunX}" cy="${sunY}" r="${sunR * 1.15}" fill="url(#orbGrad)" opacity="0.75" />
      <!-- Foggy manor & arched tall windows -->
      <path d="M0,430 L180,415 L250,310 L325,310 L360,245 L425,310 L540,310 L610,400 L960,435 L960,540 L0,540 Z" fill="${pal.silhouetteFar}" />
      <rect x="330" y="295" width="22" height="46" rx="11" fill="${pal.glow}" opacity="0.85" />
      <rect x="372" y="295" width="22" height="46" rx="11" fill="${pal.glow}" opacity="0.45" />
      <!-- Volumetric light cone -->
      <polygon points="341,341 255,540 435,540" fill="${pal.glow}" opacity="0.09" />
      <ellipse cx="480" cy="450" rx="540" ry="62" fill="url(#mistGrad)" />
      <path d="M0,470 Q260,445 520,468 T960,455 L960,540 L0,540 Z" fill="${pal.silhouette}" />
    `;
  } else if (theme === 'zombies') {
    foregroundLayer = `
      <!-- Emergency beacon glow -->
      <circle cx="${sunX}" cy="${sunY + 40}" r="${sunR * 1.35}" fill="${pal.glow}" opacity="0.22" />
      <rect x="0" y="290" width="960" height="250" fill="${pal.silhouetteFar}" opacity="0.45" />
      <!-- Hospital / Quarantine blocks -->
      <path d="M0,430 L120,430 L120,275 L340,275 L340,340 L510,340 L510,235 L730,235 L730,395 L960,395 L960,540 L0,540 Z" fill="${pal.silhouette}" />
      <!-- Flickering ward windows -->
      <rect x="155" y="305" width="38" height="14" fill="${pal.glow}" opacity="0.78" />
      <rect x="215" y="305" width="38" height="14" fill="${pal.glow}" opacity="0.32" />
      <rect x="550" y="275" width="46" height="16" fill="${pal.glow}" opacity="0.72" />
      <rect x="615" y="275" width="46" height="16" fill="#ef4444" opacity="0.45" />
      <ellipse cx="480" cy="465" rx="500" ry="50" fill="url(#mistGrad)" />
    `;
  } else {
    // Apocalyptic
    foregroundLayer = `
      <circle cx="${sunX}" cy="${sunY + 15}" r="${sunR * 1.15}" fill="url(#orbGrad)" opacity="0.92" />
      <!-- Distant mesas & highway overpass ruins -->
      <path d="M0,395 L140,360 L215,360 L265,398 L450,375 L540,320 L650,320 L710,382 L840,368 L960,400 L960,540 L0,540 Z" fill="${pal.silhouetteFar}" />
      <!-- Broken highway pillars -->
      <path d="M80,455 L260,420 L260,436 L190,446 L190,540 L165,540 L165,450 L80,468 Z" fill="${pal.silhouette}" />
      <path d="M0,480 Q320,448 640,475 T960,462 L960,540 L0,540 Z" fill="${pal.silhouette}" />
      <ellipse cx="480" cy="445" rx="520" ry="54" fill="url(#mistGrad)" />
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="960" height="540">
    <defs>
      <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${pal.bgTop}" />
        <stop offset="58%" stop-color="${pal.bgMid}" />
        <stop offset="100%" stop-color="${pal.bgBottom}" />
      </linearGradient>
      <radialGradient id="orbGrad" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stop-color="${pal.accent}" stop-opacity="0.95" />
        <stop offset="55%" stop-color="${pal.glow}" stop-opacity="0.65" />
        <stop offset="100%" stop-color="${pal.glow}" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="mistGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${pal.glow}" stop-opacity="0.22" />
        <stop offset="100%" stop-color="${pal.bgBottom}" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="960" height="540" fill="url(#skyGrad)" />
    ${stars}
    ${foregroundLayer}
    <!-- Subtle vignette -->
    <rect width="960" height="540" fill="none" stroke="${pal.glow}" stroke-opacity="0.16" stroke-width="2" />
  </svg>`;

  return encodeSvgDataUrl(svg);
}

export function generateDemoPortraitArt(
  theme: WorldThemeId,
  name: string,
  occupation: string,
): string {
  const pal = THEME_PALETTES[theme];
  const seed = hashString(`${theme}|${name}|${occupation}`);
  const angle = seed % 360;

  const haloStyle =
    theme === 'cyberpunk'
      ? `<polygon points="256,52 426,154 426,358 256,460 86,358 86,154" fill="none" stroke="${pal.glow}" stroke-width="3" opacity="0.7" />
         <polygon points="256,74 406,164 406,348 256,438 106,348 106,164" fill="none" stroke="${pal.accent}" stroke-width="1.5" opacity="0.45" />`
      : `<circle cx="256" cy="215" r="142" fill="none" stroke="${pal.glow}" stroke-width="2.5" opacity="0.65" />
         <circle cx="256" cy="215" r="126" fill="none" stroke="${pal.accent}" stroke-dasharray="8 8" stroke-width="1.2" opacity="0.4" />`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <defs>
      <radialGradient id="pBg" cx="50%" cy="38%" r="72%">
        <stop offset="0%" stop-color="${pal.bgMid}" />
        <stop offset="100%" stop-color="${pal.bgTop}" />
      </radialGradient>
      <radialGradient id="pGlow" cx="50%" cy="40%" r="48%">
        <stop offset="0%" stop-color="${pal.glow}" stop-opacity="0.55" />
        <stop offset="70%" stop-color="${pal.secondary}" stop-opacity="0.16" />
        <stop offset="100%" stop-color="${pal.bgTop}" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="512" height="512" fill="url(#pBg)" />
    <circle cx="256" cy="210" r="195" fill="url(#pGlow)" />
    ${haloStyle}
    <!-- Atmospheric diagonal light ray -->
    <line x1="0" y1="${angle % 220}" x2="512" y2="${512 - (angle % 180)}" stroke="${pal.glow}" stroke-width="1" opacity="0.18" />
    <!-- Stylized Hooded / Cloaked Character Bust -->
    <path d="M122,512 C128,402 164,344 256,344 C348,344 384,402 390,512 Z" fill="${pal.silhouette}" stroke="${pal.glow}" stroke-opacity="0.45" stroke-width="2" />
    <path d="M196,356 L256,422 L316,356" fill="none" stroke="${pal.accent}" stroke-width="2.2" opacity="0.65" />
    <ellipse cx="256" cy="242" rx="64" ry="76" fill="${pal.silhouetteFar}" stroke="${pal.glow}" stroke-opacity="0.55" stroke-width="2" />
    <!-- Dramatic rim highlight -->
    <path d="M198,218 C206,158 306,158 314,218 C306,184 206,184 198,218 Z" fill="${pal.glow}" opacity="0.48" />
    <!-- Eyes glint -->
    <circle cx="234" cy="238" r="4" fill="${pal.accent}" opacity="0.9" />
    <circle cx="278" cy="238" r="4" fill="${pal.accent}" opacity="0.9" />
  </svg>`;

  return encodeSvgDataUrl(svg);
}
