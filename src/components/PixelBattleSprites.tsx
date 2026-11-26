import type { ReactElement } from 'react';
import type {
  Campaign,
  ClashAllyState,
  ClashArchetype,
  ClashEnemy,
  WorldThemeId,
} from '../types/game';

export type HeroSpriteId =
  | 'knight'
  | 'barbarian'
  | 'paladin'
  | 'rogue'
  | 'mage'
  | 'cleric'
  | 'ranger'
  | 'bard'
  | 'cyber_ronin'
  | 'netrunner'
  | 'detective'
  | 'survivor';

export type EnemySpriteId =
  | 'dread_knight'
  | 'shadow_archer'
  | 'cyber_enforcer'
  | 'cyber_drone'
  | 'gothic_lord'
  | 'cultist_agent'
  | 'juggernaut_zombie'
  | 'infected_runner'
  | 'wasteland_warlord'
  | 'raider_gunner';

export interface HeroSpriteMeta {
  id: HeroSpriteId;
  label: string;
  shortLabel: string;
  roleTag: string;
}

export const HERO_SPRITE_OPTIONS: HeroSpriteMeta[] = [
  { id: 'knight', label: 'Cavaleiro', shortLabel: 'Caval.', roleTag: 'Guerreiro · Espada & Escudo' },
  { id: 'barbarian', label: 'Bárbaro', shortLabel: 'Bárbaro', roleTag: 'Machado Grande' },
  { id: 'paladin', label: 'Paladino', shortLabel: 'Palad.', roleTag: 'Juramento & Escudo Solar' },
  { id: 'rogue', label: 'Ladino', shortLabel: 'Ladino', roleTag: 'Lâminas Gêmeas' },
  { id: 'mage', label: 'Arcanista', shortLabel: 'Mago', roleTag: 'Mago · Cajado Rúnico' },
  { id: 'cleric', label: 'Clérigo', shortLabel: 'Clérigo', roleTag: 'Maça & Luz Sagrada' },
  { id: 'ranger', label: 'Patrulheiro', shortLabel: 'Arq.', roleTag: 'Arco Longo' },
  { id: 'bard', label: 'Bardo', shortLabel: 'Bardo', roleTag: 'Rapieira & Alaúde' },
  { id: 'cyber_ronin', label: 'Cyber-Ronin', shortLabel: 'Ronin', roleTag: 'Katana Plasma' },
  { id: 'netrunner', label: 'Netrunner', shortLabel: 'Netrun', roleTag: 'Rifle de Pulso' },
  { id: 'detective', label: 'Investigador', shortLabel: 'Noir', roleTag: 'Revólver & Lanterna' },
  { id: 'survivor', label: 'Sobrevivente', shortLabel: 'Tático', roleTag: 'Fuzil & Blindagem' },
];

type PaletteMap = Record<string, string>;

interface PixelSpriteSpec {
  width: number;
  height: number;
  palette: PaletteMap;
  idleA: string[];
  idleB: string[];
  attack?: string[];
}

/**
 * Legacy SVG fallback matrices (kept solely as zero-crash safety fallback
 * behind the primary MYTHOS 12.5 HD-2D studio PNG sprites in /battle-sprites/).
 */
const HERO_SPRITES: Partial<Record<HeroSpriteId, PixelSpriteSpec>> = {
  knight: {
    width: 16,
    height: 18,
    palette: {
      K: '#0b0c12', // crisp outline
      S: '#e2e8f0', // steel highlight
      M: '#94a3b8', // steel mid
      D: '#475569', // steel shadow
      G: '#facc15', // gold trim
      O: '#b45309', // gold shadow
      C: '#dc2626', // crimson cape highlight
      R: '#991b1b', // crimson cape shadow
      F: '#f3c6a5', // face/skin
      B: '#38bdf8', // blade glint
      W: '#f8fafc', // pure white glint
    },
    idleA: [
      '.....KKKK.......',
      '....KGGGGK......',
      '...KSSMMSSK.....',
      '...KSMKKSMK.....',
      '...KSDFFDSK.....',
      '..KKKGGGGKKK.KW.',
      '.KCRKSSMMSSKKWBK',
      '.KCRKSMGMSMKWBK.',
      'KCRRKDDMMKGGSK..',
      'KCRRKDSGSDKMK...',
      'KRR.KDSGSDK.....',
      '.KK.KDDGDDK.....',
      '....KMMKMMK.....',
      '....KDDKDDK.....',
      '....KMMKMMK.....',
      '...KDDKKDDK.....',
      '...KKKK.KKKK....',
      '................',
    ],
    idleB: [
      '................',
      '.....KKKK.......',
      '....KGGGGK......',
      '...KSSMMSSK.....',
      '...KSMKKSMK.....',
      '...KSDFFDSK..KW.',
      '..KKKGGGGKKKKWBK',
      '.KCRKSSMMSSKWBK.',
      'KCRRKSMGMSMKGSK.',
      'KCRRKDDMMKKMK...',
      'KRR.KDSGSDK.....',
      '.KK.KDSGSDK.....',
      '....KDDGDDK.....',
      '....KMMKMMK.....',
      '....KDDKDDK.....',
      '...KMMKKMMK.....',
      '...KKKK.KKKK....',
      '................',
    ],
    attack: [
      '.....KKKK.......',
      '....KGGGGK......',
      '...KSSMMSSK.....',
      '...KSMKKSMK.....',
      '...KSDFFDSK.....',
      '..KKKGGGGKK.....',
      '.KCRKSSMMSSKKKK.',
      'KCRRKSMGMSMGGGGK',
      'KCRRKDDMMKKWWWWK',
      'KRR.KDSGSDKBBBBK',
      '.KK.KDDGDDKKKKK.',
      '....KMMKMMK.....',
      '....KDDKDDK.....',
      '...KMMK.KMMK....',
      '...KDDK.KDDK....',
      '..KKKK...KKKK...',
      '................',
      '................',
    ],
  },

  rogue: {
    width: 16,
    height: 18,
    palette: {
      K: '#090b10',
      H: '#1e293b', // dark hood
      L: '#334155', // hood highlight
      E: '#34d399', // emerald scarf / trim
      T: '#059669', // emerald shadow
      F: '#f3c6a5', // skin
      Y: '#fef08a', // sharp eyes
      C: '#475569', // cloak
      S: '#e2e8f0', // dagger steel
      W: '#ffffff',
      B: '#78350f', // leather boots
    },
    idleA: [
      '....KKKKK.......',
      '...KLLLLHK......',
      '..KLLHHHHHK.....',
      '..KHKYFKFHK.....',
      '..KKEEEEEKK.....',
      '..KTTCEETTK.....',
      '.KCCKHLHKKK.KWS.',
      '.KCHKHLEHKKKSK..',
      'KCH.KHHHKKEKK...',
      'KCC.KBBBK.......',
      '.KK.KLLHK.......',
      '....KHHKHK......',
      '....KLLKHK......',
      '...KBBKKBBK.....',
      '...KBBK.KBBK....',
      '...KKKK.KKKK....',
      '................',
      '................',
    ],
    idleB: [
      '................',
      '....KKKKK.......',
      '...KLLLLHK......',
      '..KLLHHHHHK.....',
      '..KHKYFKFHK.....',
      '..KKEEEEEKK..KWS',
      '.KCCKTTCEETKKKSK',
      'KCH.KHLHKKKKEKK.',
      'KCH.KHLEHKKK....',
      'KCC.KHHHK.......',
      '.KK.KBBBK.......',
      '....KLLHK.......',
      '....KHHKHK......',
      '...KBBKKBBK.....',
      '...KBBK.KBBK....',
      '...KKKK.KKKK....',
      '................',
      '................',
    ],
    attack: [
      '....KKKKK.......',
      '...KLLLLHK......',
      '..KLLHHHHHK.....',
      '..KHKYFKFHK.....',
      '..KKEEEEEKK.....',
      '.KCCKTTCEETKK...',
      'KCH.KHLHKKWWWSK.',
      'KCC.KHLEHKKSSWK.',
      '.KK.KHHHK.KKKK..',
      '....KBBBK.......',
      '...KLLKHHK......',
      '...KHHK.KHK.....',
      '..KBBK...KBBK...',
      '..KKKK...KKKK...',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  mage: {
    width: 16,
    height: 18,
    palette: {
      K: '#090814',
      P: '#6366f1', // arcane indigo
      D: '#312e81', // dark robe
      L: '#a5b4fc', // light robe
      G: '#fbbf24', // gold trim
      F: '#f5cfa8',
      C: '#38bdf8', // glowing crystal
      W: '#ffffff',
      B: '#78350f', // staff wood
    },
    idleA: [
      '.....KKK...KCK..',
      '....KPPPK.KCWCK.',
      '...KPLPPPK.KCK..',
      '..KDDDDDDDK.KBK.',
      '...KDFKFDK..KBK.',
      '...KGGGGGK..KBK.',
      '..KPLPPPLPK.KBK.',
      '..KPDPGPDPKKBK..',
      '.KDDPPGPPDDKBK..',
      '.KDDPGGGPDDKBK..',
      '.KDDPPPPPPDKBK..',
      '.KDDPPGPPDDKBK..',
      '.KDDPPGPPDDKBK..',
      '.KDDGGGGGGDKBK..',
      '..KDDDDDDDK.KK..',
      '..KBBK.KBBK.....',
      '..KKKK.KKKK.....',
      '................',
    ],
    idleB: [
      '...........KWC..',
      '.....KKK..KCWCK.',
      '....KPPPK..KCK..',
      '...KPLPPPK..KBK.',
      '..KDDDDDDDK.KBK.',
      '...KDFKFDK..KBK.',
      '...KGGGGGK..KBK.',
      '..KPLPPPLPKKBK..',
      '.KDDPPGPPDDKBK..',
      '.KDDPGGGPDDKBK..',
      '.KDDPPPPPPDKBK..',
      '.KDDPPGPPDDKBK..',
      '.KDDPPGPPDDKBK..',
      '.KDDGGGGGGDKBK..',
      '..KDDDDDDDK.KK..',
      '..KBBK.KBBK.....',
      '..KKKK.KKKK.....',
      '................',
    ],
    attack: [
      '.....KKK....KWK.',
      '....KPPPK..KCWCK',
      '...KPLPPPK.KCCCK',
      '..KDDDDDDDK.KWK.',
      '...KDFKFDK.KBK..',
      '...KGGGGGK.KBK..',
      '..KPLPPPLPKBK...',
      '.KDDPPGPPDKBK...',
      '.KDDPGGGPDKK....',
      '.KDDPPPPPPDK....',
      '.KDDPPGPPDDK....',
      '.KDDGGGGGGDK....',
      '..KDDDDDDDK.....',
      '..KBBK.KBBK.....',
      '..KKKK.KKKK.....',
      '................',
      '................',
      '................',
    ],
  },

  ranger: {
    width: 16,
    height: 18,
    palette: {
      K: '#090c0a',
      G: '#22c55e', // forest cloak highlight
      D: '#15803d', // forest cloak mid
      S: '#14532d', // forest shadow
      L: '#92400e', // leather
      T: '#d97706', // leather highlight / bow
      F: '#f3c6a5',
      W: '#f8fafc', // arrow feather
      C: '#94a3b8', // arrowhead
    },
    idleA: [
      '....KKKKK.......',
      '...KGGGGDK..KK..',
      '..KGGDDDDK.KTK..',
      '..KDKFKFDK..KTK.',
      '..KKLLLLKK..KTK.',
      '.KSSKGGGGKKKWTK.',
      '.KSDKGLLGKKKCTK.',
      'KSS.KGLLGK..KTK.',
      'KSD.KTTTTK..KTK.',
      '.KK.KLLLLK.KTK..',
      '....KDDKDK.KK...',
      '....KSSKSK......',
      '....KLLKLK......',
      '...KLLKKLLK.....',
      '...KTTK.KTTK....',
      '...KKKK.KKKK....',
      '................',
      '................',
    ],
    idleB: [
      '................',
      '....KKKKK...KK..',
      '...KGGGGDK.KTK..',
      '..KGGDDDDK..KTK.',
      '..KDKFKFDK..KTK.',
      '..KKLLLLKK.KWTK.',
      '.KSSKGGGGKKKCTK.',
      'KSS.KGLLGK..KTK.',
      'KSD.KTTTTK..KTK.',
      '.KK.KLLLLK.KTK..',
      '....KDDKDK.KK...',
      '....KSSKSK......',
      '....KLLKLK......',
      '...KLLKKLLK.....',
      '...KTTK.KTTK....',
      '...KKKK.KKKK....',
      '................',
      '................',
    ],
    attack: [
      '....KKKKK...KK..',
      '...KGGGGDK..KTK.',
      '..KGGDDDDK...KTK',
      '..KDKFKFDK...KTK',
      '..KKLLLLKKWWCKTK',
      '.KSSKGGGGKKKKKTK',
      'KSS.KGLLGK...KTK',
      'KSD.KTTTTK..KTK.',
      '.KK.KLLLLK..KK..',
      '....KDDKDK......',
      '...KSSK.KSK.....',
      '...KLLK.KLK.....',
      '..KTTK...KTTK...',
      '..KKKK...KKKK...',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  cyber_ronin: {
    width: 16,
    height: 18,
    palette: {
      K: '#080712',
      C: '#38bdf8', // cyan neon visor / trim
      P: '#f472b6', // plasma magenta katana
      W: '#ffffff', // blade core
      A: '#1e293b', // dark cyber coat
      L: '#475569', // coat highlight
      D: '#0f172a', // coat shadow
      S: '#cbd5e1', // hair/collar
    },
    idleA: [
      '....KKKKK.......',
      '...KSSSSAK......',
      '..KSAAAAAK......',
      '..KACCCCAK...KP.',
      '..KADDDDAK..KPWK',
      '.KKLCCCCLKKKPWK.',
      '.KALKAAAAKKPWK..',
      'KAD.KACAAKPWK...',
      'KAD.KAAAAKPK....',
      'KAD.KLCCLK......',
      '.KK.KADADK......',
      '....KAAKAK......',
      '....KLLKLK......',
      '...KDDKKDDK.....',
      '...KCCK.KCCK....',
      '...KKKK.KKKK....',
      '................',
      '................',
    ],
    idleB: [
      '................',
      '....KKKKK....KP.',
      '...KSSSSAK..KPWK',
      '..KSAAAAAK.KPWK.',
      '..KACCCCAKKPWK..',
      '..KADDDDAKPWK...',
      '.KKLCCCCLKPK....',
      'KAD.KAAAAKK.....',
      'KAD.KACAAK......',
      'KAD.KLCCLK......',
      '.KK.KADADK......',
      '....KAAKAK......',
      '....KLLKLK......',
      '...KDDKKDDK.....',
      '...KCCK.KCCK....',
      '...KKKK.KKKK....',
      '................',
      '................',
    ],
    attack: [
      '....KKKKK.......',
      '...KSSSSAK......',
      '..KSAAAAAK......',
      '..KACCCCAK......',
      '..KADDDDAK......',
      '.KKLCCCCLKK.....',
      'KAD.KAAAAKKKKKK.',
      'KAD.KACAAPWWWWWK',
      '.KK.KLCCLPKKKKK.',
      '....KADADK......',
      '...KAAK.KAK.....',
      '...KDDK.KDK.....',
      '..KCCK...KCCK...',
      '..KKKK...KKKK...',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  netrunner: {
    width: 16,
    height: 18,
    palette: {
      K: '#070812',
      C: '#22d3ee', // cyan glow
      B: '#0284c7', // blue cyber suit
      D: '#0f172a', // dark armor
      L: '#64748b', // gun metal
      P: '#e879f9', // magenta accent
      F: '#f3c6a5',
      W: '#ffffff',
    },
    idleA: [
      '....KKKKK.......',
      '...KDDDDDK......',
      '..KDCCCCDK......',
      '..KDFCCFDK......',
      '..KKPPPPKK......',
      '..KDBBBBBDK.....',
      '..KDBCCBDKKLLLLK',
      '..KDBBBBBDKLCCWK',
      '..KDDPPDDKKLLLLK',
      '...KDBBBDK.KKKK.',
      '...KDDKDDK......',
      '...KBBKBBK......',
      '...KDDKDDK......',
      '..KCCKKCCK......',
      '..KKKK.KKKK.....',
      '................',
      '................',
      '................',
    ],
    idleB: [
      '................',
      '....KKKKK.......',
      '...KDDDDDK......',
      '..KDCCCCDK......',
      '..KDFCCFDK......',
      '..KKPPPPKK......',
      '..KDBBBBBDKLLLLK',
      '..KDBCCBDKKLCCWK',
      '..KDBBBBBDKLLLLK',
      '..KDDPPDDK.KKKK.',
      '...KDBBBDK......',
      '...KDDKDDK......',
      '...KBBKBBK......',
      '..KCCKKCCK......',
      '..KKKK.KKKK.....',
      '................',
      '................',
      '................',
    ],
    attack: [
      '....KKKKK.......',
      '...KDDDDDK......',
      '..KDCCCCDK......',
      '..KDFCCFDK......',
      '..KKPPPPKK......',
      '..KDBBBBBDKLLLLK',
      '..KDBCCBDKKLWWWK',
      '..KDDPPDDKKCCCCK',
      '...KDBBBDK.KKKK.',
      '...KDDKDDK......',
      '..KBBK.KBBK.....',
      '..KCCK.KCCK.....',
      '..KKKK.KKKK.....',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  detective: {
    width: 16,
    height: 18,
    palette: {
      K: '#09080f',
      T: '#a16207', // trenchcoat
      L: '#ca8a04', // coat highlight
      D: '#422006', // coat shadow
      H: '#334155', // fedora hat
      S: '#94a3b8', // revolver steel
      G: '#fde047', // lantern glow
      F: '#f3c6a5',
      W: '#ffffff',
    },
    idleA: [
      '....KKKKK.......',
      '...KHHHHHK......',
      '.KKHHHHHHHKK....',
      '...KFKFKFK......',
      '...KFFFFFK......',
      '..KKLTTTLKK.....',
      '..KLTWWTLKKSSSK.',
      '..KLTGGTLKKSSWK.',
      '..KTTTTTTK.KGGK.',
      '..KTLTTLTK.KGWK.',
      '..KTLTTLTK..KK..',
      '..KDTDDTDK......',
      '..KDTDDTDK......',
      '...KDDKDDK......',
      '...KHHKHHK......',
      '...KKKKKKK......',
      '................',
      '................',
    ],
    idleB: [
      '................',
      '....KKKKK.......',
      '...KHHHHHK......',
      '.KKHHHHHHHKK....',
      '...KFKFKFK......',
      '...KFFFFFK......',
      '..KKLTTTLKKSSSK.',
      '..KLTWWTLKKSSWK.',
      '..KLTGGTLK.KGWK.',
      '..KTTTTTTK.KGGK.',
      '..KTLTTLTK..KK..',
      '..KDTDDTDK......',
      '..KDTDDTDK......',
      '...KDDKDDK......',
      '...KHHKHHK......',
      '...KKKKKKK......',
      '................',
      '................',
    ],
    attack: [
      '....KKKKK.......',
      '...KHHHHHK......',
      '.KKHHHHHHHKK....',
      '...KFKFKFK......',
      '...KFFFFFK......',
      '..KKLTTTLKKSSSK.',
      '..KLTWWTLKKWWWK.',
      '..KLTGGTLKKGGGK.',
      '..KTTTTTTK.KKKK.',
      '..KTLTTLTK......',
      '..KDTDDTDK......',
      '..KDDK.KDDK.....',
      '..KHHK.KHHK.....',
      '..KKKK.KKKK.....',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  survivor: {
    width: 16,
    height: 18,
    palette: {
      K: '#0a0b09',
      O: '#65a30d', // tactical olive
      D: '#365314', // dark olive
      R: '#ea580c', // rust/bandana/goggles
      Y: '#facc15', // goggle lens
      B: '#78350f', // leather/pack
      M: '#94a3b8', // rifle steel
      S: '#475569', // dark steel
      F: '#f3c6a5',
      W: '#ffffff',
    },
    idleA: [
      '....KKKKK.......',
      '...KBBBBBK......',
      '..KBRYYRBK......',
      '..KBFKKFBK......',
      '..KKRRRRKK......',
      '.KBBKOOOOKK.....',
      '.KBBKODDOKKMMMMK',
      '.KBBKOOOOKKSSSWK',
      '..KKKBBBBK.KKKK.',
      '....KODDOK......',
      '....KSSKSK......',
      '....KDDKDK......',
      '....KBBKBK......',
      '...KBBKKBBK.....',
      '...KKKK.KKKK....',
      '................',
      '................',
      '................',
    ],
    idleB: [
      '................',
      '....KKKKK.......',
      '...KBBBBBK......',
      '..KBRYYRBK......',
      '..KBFKKFBK......',
      '..KKRRRRKK......',
      '.KBBKOOOOKKMMMMK',
      '.KBBKODDOKKSSSWK',
      '.KBBKOOOOK.KKKK.',
      '..KKKBBBBK......',
      '....KODDOK......',
      '....KSSKSK......',
      '....KDDKDK......',
      '...KBBKKBBK.....',
      '...KKKK.KKKK....',
      '................',
      '................',
      '................',
    ],
    attack: [
      '....KKKKK.......',
      '...KBBBBBK......',
      '..KBRYYRBK......',
      '..KBFKKFBK......',
      '..KKRRRRKK......',
      '.KBBKOOOOKKMMMMK',
      '.KBBKODDOKKWWWYK',
      '..KKKBBBBKKSSSK.',
      '....KODDOK......',
      '...KSSK.KSK.....',
      '...KBBK.KBK.....',
      '..KKKK...KKKK...',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },
};

const ENEMY_SPRITES: Record<EnemySpriteId, PixelSpriteSpec> = {
  dread_knight: {
    width: 20,
    height: 20,
    palette: {
      K: '#09070d',
      G: '#fbbf24', // golden horns / crown
      A: '#334155', // dark iron highlight
      D: '#1e293b', // dark iron mid
      X: '#0f172a', // iron shadow
      R: '#ef4444', // glowing crimson eyes / cape
      C: '#991b1b', // deep crimson cape
      S: '#e2e8f0', // massive blade
      W: '#ffffff',
    },
    idleA: [
      '..KGK........KGK....',
      '...KGGK.KK.KGGK.....',
      '....KGGKAADGGK......',
      '.....KAAADDAK.......',
      '.....KARKRAAK.......',
      '.....KADDDDAK.......',
      '.KWK.KKGGGGKKK......',
      'KWSSKAAADDDAAKCK....',
      'KSSK.KAARRDAAKCCK...',
      'KSSK.KDXRRXDDKCRCK..',
      '.KSKKKDDDDDDDKCRCK..',
      '..KGGKAXDDXAAKCCK...',
      '.....KDDDDDDDKCK....',
      '.....KAAKKAAK.KK....',
      '.....KDDKKDDK.......',
      '....KAAK..KAAK......',
      '....KDDK..KDDK......',
      '...KKKK....KKKK.....',
      '....................',
      '....................',
    ],
    idleB: [
      '....................',
      '..KGK........KGK....',
      '...KGGK.KK.KGGK.....',
      '....KGGKAADGGK......',
      '.....KAAADDAK.......',
      '.KWK.KARKRAAK.......',
      'KWSSKKGGGGKKKK......',
      'KSSK.KAAADDDAAKCK...',
      'KSSK.KAARRDAAKCCK...',
      '.KSKKKDXRRXDDKCRCK..',
      '..KGGKDDDDDDDKCRCK..',
      '.....KAXDDXAAKCCK...',
      '.....KDDDDDDDKCK....',
      '.....KAAKKAAK.KK....',
      '.....KDDKKDDK.......',
      '....KAAK..KAAK......',
      '....KDDK..KDDK......',
      '...KKKK....KKKK.....',
      '....................',
      '....................',
    ],
  },

  shadow_archer: {
    width: 16,
    height: 18,
    palette: {
      K: '#09070d',
      H: '#312e81',
      D: '#1e1b4b',
      R: '#f87171',
      S: '#cbd5e1',
      B: '#92400e',
      W: '#ffffff',
    },
    idleA: [
      '......KKKKK.....',
      '.....KHHHHHK....',
      '....KHHDDDDHK...',
      '....KDRKRDHK....',
      '....KKDDDDKK....',
      '.KWWKHHHHHHK....',
      'KBBKSHDDDDDK....',
      'KBBK.KDDDDDK....',
      '.KK..KBBBBBK....',
      '.....KHDKHDK....',
      '.....KDDKDDK....',
      '.....KBBKBBK....',
      '....KKKK.KKKK...',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    idleB: [
      '................',
      '......KKKKK.....',
      '.....KHHHHHK....',
      '....KHHDDDDHK...',
      '....KDRKRDHK....',
      '.KWWKKDDDDKK....',
      'KBBKSHHHHHHK....',
      'KBBK.KDDDDDK....',
      '.KK..KBBBBBK....',
      '.....KHDKHDK....',
      '.....KDDKDDK....',
      '.....KBBKBBK....',
      '....KKKK.KKKK...',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  cyber_enforcer: {
    width: 20,
    height: 20,
    palette: {
      K: '#06060d',
      M: '#64748b', // mech plating
      D: '#334155', // dark plating
      X: '#0f172a',
      R: '#f43f5e', // laser crimson
      W: '#ffffff',
      C: '#38bdf8', // core cyan
      G: '#f59e0b', // hazard trim
    },
    idleA: [
      '.....KKKKKKKK.......',
      '....KMMMMMMMMK......',
      '....KMDDDDDDMK......',
      '....KDRRRRRRDK......',
      '....KMMMMMMMMK......',
      '..KKGGGGMMGGGGKK....',
      '.KMMKMMDCCDMMKMMK...',
      'KRRWKMDCCCCDMKDDK...',
      'KMMMKMMDCCDMMKDDK...',
      '.KKKKMDDDDDDMKMK....',
      '.....KMXGGXMK.K.....',
      '.....KMMKKMMK.......',
      '.....KDDKKDDK.......',
      '....KMMK..KMMK......',
      '....KRRK..KRRK......',
      '...KKKK....KKKK.....',
      '....................',
      '....................',
      '....................',
      '....................',
    ],
    idleB: [
      '....................',
      '.....KKKKKKKK.......',
      '....KMMMMMMMMK......',
      '....KMDDDDDDMK......',
      '....KDRWWWWWDK......',
      '....KMMMMMMMMK......',
      '..KKGGGGMMGGGGKK....',
      'KRRWKMMDCCDMMKMMK...',
      'KMMMKMDCCCCDMKDDK...',
      '.KKKKMMDCCDMMKDDK...',
      '.....KMDDDDDDMK.....',
      '.....KMXGGXMK.......',
      '.....KMMKKMMK.......',
      '....KDDK..KDDK......',
      '....KRRK..KRRK......',
      '...KKKK....KKKK.....',
      '....................',
      '....................',
      '....................',
      '....................',
    ],
  },

  cyber_drone: {
    width: 16,
    height: 18,
    palette: {
      K: '#070712',
      M: '#94a3b8',
      D: '#334155',
      P: '#f472b6',
      R: '#f43f5e',
      W: '#ffffff',
    },
    idleA: [
      '.....KKKKK......',
      '....KMMMMMK.....',
      '...KMDDDDDMK....',
      '...KDPRRRPDK....',
      '...KMMMMMMMK....',
      '.KWWKDDPDDK.....',
      'KRRKKMMDMKK.....',
      '.KK..KDDDK......',
      '.....KMMMK......',
      '....KPPKPPK.....',
      '.....KK.KK......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    idleB: [
      '................',
      '.....KKKKK......',
      '....KMMMMMK.....',
      '...KMDDDDDMK....',
      '...KDPRWRPDK....',
      '.KWWKMMMMMMK....',
      'KRRKKDDPDDK.....',
      '.KK..KMMDMK.....',
      '.....KDDDK......',
      '....KPPKPPK.....',
      '.....KK.KK......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  gothic_lord: {
    width: 20,
    height: 20,
    palette: {
      K: '#08060e',
      P: '#a855f7', // violet mantle
      D: '#3b0764', // dark velvet
      G: '#fbbf24', // gold trim
      F: '#e2e8f0', // pale visage
      R: '#f43f5e', // crimson eyes
      W: '#ffffff',
    },
    idleA: [
      '......KKKKKK........',
      '.....KDDDDDDK.......',
      '....KDDPPPPDDK......',
      '.....KFRKRFK........',
      '.....KFFFFFK........',
      '...KKGGPPPGGKK......',
      '..KDPPKPWWPKPPK.....',
      '.KGWKPKPGGPKPPDK....',
      '.KGK.KPPPPPPKPDK....',
      '.KGK.KDDGGDDKPDK....',
      '.KGK.KDDPPDDKPDK....',
      '.KGK.KDDPPDDKDK.....',
      '.KGK.KDDPPDDK.......',
      '..K..KDDGGDDK.......',
      '.....KDDDDDDK.......',
      '.....KDDKKDDK.......',
      '....KKKK..KKKK......',
      '....................',
      '....................',
      '....................',
    ],
    idleB: [
      '....................',
      '......KKKKKK........',
      '.....KDDDDDDK.......',
      '....KDDPPPPDDK......',
      '.....KFRKRFK........',
      '.....KFFFFFK........',
      '...KKGGPPPGGKK......',
      '.KGWKDPKPWWPKPPK....',
      '.KGK.KPPGGPPKPDK....',
      '.KGK.KPPPPPPKPDK....',
      '.KGK.KDDGGDDKPDK....',
      '.KGK.KDDPPDDKDK.....',
      '.KGK.KDDPPDDK.......',
      '..K..KDDGGDDK.......',
      '.....KDDDDDDK.......',
      '.....KDDKKDDK.......',
      '....KKKK..KKKK......',
      '....................',
      '....................',
      '....................',
    ],
  },

  cultist_agent: {
    width: 16,
    height: 18,
    palette: {
      K: '#08060e',
      P: '#7e22ce',
      D: '#3b0764',
      G: '#fbbf24',
      R: '#f43f5e',
    },
    idleA: [
      '.....KKKKK......',
      '....KPPPPPK.....',
      '...KPPDDDDPK....',
      '...KDRKRDDK.....',
      '...KKGGGGKK.....',
      '.KGGKPPPPPK.....',
      '.KGKKPDDDPK.....',
      '..K..KPPDPK.....',
      '.....KDDDDK.....',
      '.....KDDDDK.....',
      '....KDDKDDK.....',
      '....KKKKKKK.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    idleB: [
      '................',
      '.....KKKKK......',
      '....KPPPPPK.....',
      '...KPPDDDDPK....',
      '...KDRKRDDK.....',
      '.KGGKKGGGGK.....',
      '.KGKKPPPPPK.....',
      '..K..KPDDDPK....',
      '.....KPPDPK.....',
      '.....KDDDDK.....',
      '....KDDKDDK.....',
      '....KKKKKKK.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  juggernaut_zombie: {
    width: 20,
    height: 20,
    palette: {
      K: '#080a07',
      Z: '#65a30d', // toxic green
      D: '#365314', // dark flesh
      A: '#57534e', // torn armor
      R: '#ef4444', // blood/eyes
      L: '#bef264', // glowing spores
    },
    idleA: [
      '....KKKKKKKK........',
      '...KZZZZZZZZK.......',
      '...KZDRKKRDZK.......',
      '...KZDDRRDDZK.......',
      '..KKAAZZZZAAKK......',
      '.KAAKAZZLLZZAKAK....',
      'KZZAKAZLLLLZAKAAK...',
      'KZZAKADZZZZDAKAAK...',
      '.KKK.KAAZZAAK.KK....',
      '.....KADZZDAK.......',
      '.....KAAKKAAK.......',
      '.....KDDKKDDK.......',
      '....KZZK..KZZK......',
      '....KAAK..KAAK......',
      '...KKKK....KKKK.....',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
    ],
    idleB: [
      '....................',
      '....KKKKKKKK........',
      '...KZZZZZZZZK.......',
      '...KZDRKKRDZK.......',
      '...KZDDRRDDZK.......',
      '..KKAAZZZZAAKK......',
      'KZZAKAZZLLZZAKAK....',
      'KZZAKAZLLLLZAKAAK...',
      '.KKK.KADZZZZDAKK....',
      '.....KAAZZAAK.......',
      '.....KADZZDAK.......',
      '.....KAAKKAAK.......',
      '....KDDK..KDDK......',
      '....KZZK..KZZK......',
      '...KKKK....KKKK.....',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
    ],
  },

  infected_runner: {
    width: 16,
    height: 18,
    palette: {
      K: '#080a07',
      Z: '#84cc16',
      D: '#3f6212',
      R: '#ef4444',
      A: '#57534e',
    },
    idleA: [
      '.....KKKKK......',
      '....KZZZZZK.....',
      '...KZRKRZZK.....',
      '...KZDDZZZK.....',
      '..KKAAZZAAK.....',
      '.KZZKADDDK......',
      '.KZK.KAAAK......',
      '..K..KDDDK......',
      '.....KZZKZK.....',
      '....KDDKDDK.....',
      '....KKKKKKK.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    idleB: [
      '................',
      '.....KKKKK......',
      '....KZZZZZK.....',
      '...KZRKRZZK.....',
      '..KKZDDZZZK.....',
      '.KZZKAAZZAK.....',
      '.KZK.KADDDK.....',
      '..K..KAAAK......',
      '.....KZZKZK.....',
      '....KDDKDDK.....',
      '....KKKKKKK.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  wasteland_warlord: {
    width: 20,
    height: 20,
    palette: {
      K: '#0b0806',
      O: '#ea580c', // rust armor
      D: '#7c2d12', // dark rust
      Y: '#fbbf24', // mask goggles
      S: '#cbd5e1', // scrap spikes/cleaver
      M: '#64748b', // iron
      W: '#ffffff',
    },
    idleA: [
      '..KSK........KSK....',
      '...KMK.KKKK.KMK.....',
      '....KKMMMMMMKK......',
      '.....KMYKKYMK.......',
      '.....KMDDDDMK.......',
      '.KWK.KKOOOOOOK......',
      'KSSSKOOOMMMOOOKMK...',
      'KSSK.KOODDDDOOKOK...',
      'KSSK.KDOOOODDOKDK...',
      '.KMK.KDDDDDDDK.KK...',
      '..K..KOOOMOOOK......',
      '.....KMMKKMMK.......',
      '.....KDDKKDDK.......',
      '....KOOK..KOOK......',
      '....KMMK..KMMK......',
      '...KKKK....KKKK.....',
      '....................',
      '....................',
      '....................',
      '....................',
    ],
    idleB: [
      '....................',
      '..KSK........KSK....',
      '...KMK.KKKK.KMK.....',
      '....KKMMMMMMKK......',
      '.KWK.KMYKKYMK.......',
      'KSSSKKMDDDDMKK......',
      'KSSK.KKOOOOOOKMK....',
      'KSSK.KOOMMMOOOKOK...',
      '.KMK.KOODDDDOOKDK...',
      '..K..KDDDDDDDK.KK...',
      '.....KOOOMOOOK......',
      '.....KMMKKMMK.......',
      '....KDDK..KDDK......',
      '....KOOK..KOOK......',
      '...KKKK....KKKK.....',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
    ],
  },

  raider_gunner: {
    width: 16,
    height: 18,
    palette: {
      K: '#0b0806',
      O: '#f97316',
      D: '#7c2d12',
      M: '#94a3b8',
      Y: '#fbbf24',
      W: '#ffffff',
    },
    idleA: [
      '.....KKKKK......',
      '....KOOOOOK.....',
      '...KOYKKYOK.....',
      '...KODDDDOK.....',
      '..KKMOOOOMK.....',
      'KWWMMDDDDDK.....',
      'KMMMMOOOOOK.....',
      '.KKKKDDDDDK.....',
      '.....KMMKMK.....',
      '....KDDKDDK.....',
      '....KKKKKKK.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    idleB: [
      '................',
      '.....KKKKK......',
      '....KOOOOOK.....',
      '...KOYKKYOK.....',
      '...KODDDDOK.....',
      'KWWMMOOOOMK.....',
      'KMMMMDDDDDK.....',
      '.KKKKOOOOOK.....',
      '.....KMMKMK.....',
      '....KDDKDDK.....',
      '....KKKKKKK.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },
};

function renderPixelMatrix(
  rows: string[],
  palette: PaletteMap,
  colorOverrides?: PaletteMap,
) {
  const rects: ReactElement[] = [];
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') {
        x++;
        continue;
      }
      // Run-length compress adjacent same-color pixels for ultra-fast SVG DOM!
      let run = 1;
      while (x + run < row.length && row[x + run] === ch) {
        run++;
      }
      const fill = colorOverrides?.[ch] ?? palette[ch];
      if (fill) {
        rects.push(
          <rect
            key={`${x}_${y}`}
            x={x}
            y={y}
            width={run}
            height={1}
            fill={fill}
          />,
        );
      }
      x += run;
    }
  }
  return rects;
}

export function resolveHeroSpriteId(campaign: Campaign): HeroSpriteId {
  const theme = campaign.world.primaryTheme;
  const dndClass = campaign.player.dnd?.classId;
  if (dndClass) {
    if (theme === 'cyberpunk') {
      return dndClass === 'wizard' ||
        dndClass === 'sorcerer' ||
        dndClass === 'warlock' ||
        dndClass === 'cleric'
        ? 'netrunner'
        : 'cyber_ronin';
    }
    if (theme === 'mystery') {
      return dndClass === 'wizard' || dndClass === 'warlock' || dndClass === 'sorcerer'
        ? 'mage'
        : 'detective';
    }
    if (theme === 'zombies' || theme === 'apocalyptic') {
      if (dndClass === 'rogue') return 'rogue';
      if (dndClass === 'barbarian') return 'barbarian';
      return 'survivor';
    }
    if (dndClass === 'barbarian') return 'barbarian';
    if (dndClass === 'paladin') return 'paladin';
    if (dndClass === 'cleric') return 'cleric';
    if (dndClass === 'bard') return 'bard';
    if (dndClass === 'wizard' || dndClass === 'sorcerer' || dndClass === 'warlock') {
      return 'mage';
    }
    if (dndClass === 'ranger' || dndClass === 'druid') return 'ranger';
    if (dndClass === 'rogue' || dndClass === 'monk') return 'rogue';
    return 'knight';
  }

  const equippedText = campaign.player.inventory
    .filter((i) => i.equipped)
    .map((i) => i.name.toLowerCase())
    .join(' ');
  const identityText =
    `${campaign.player.occupation || ''} ${campaign.player.appearance || ''} ${equippedText}`.toLowerCase();

  if (theme === 'cyberpunk') {
    if (/(katana|lâmina|lamina|espada|monofio|sabre|ronin|ninja)/.test(identityText)) {
      return 'cyber_ronin';
    }
    return 'netrunner';
  }
  if (theme === 'mystery') {
    if (/(grimório|cajado|ocult|arcano|mago|bruxo)/.test(identityText)) {
      return 'mage';
    }
    return 'detective';
  }
  if (theme === 'zombies' || theme === 'apocalyptic') {
    if (/(katana|espada|machado|faca|lâmina|escudo)/.test(identityText) && !/(fuzil|rifle|pistola|espingarda|revólver|arma)/.test(identityText)) {
      return 'rogue';
    }
    return 'survivor';
  }

  // Fantasy & default
  if (/(bárbar|barbar|machado|fúria|berserk|viking)/.test(identityText)) {
    return 'barbarian';
  }
  if (/(paladin|templár|templar|cruzad|juramento|sagrado)/.test(identityText)) {
    return 'paladin';
  }
  if (/(clérig|clerig|sacerd|curandeir|maça|maca|divin)/.test(identityText)) {
    return 'cleric';
  }
  if (/(bard|alaúde|alaude|rapieira|trovador|músic)/.test(identityText)) {
    return 'bard';
  }
  if (/(cajado|varinha|grimório|mago|feiticeir|arcan|brux)/.test(identityText)) {
    return 'mage';
  }
  if (/(arco|besta|flecha|arqueir|caçador|patrulheir|druida)/.test(identityText)) {
    return 'ranger';
  }
  if (/(adaga|punhal|ladr|ladin|assin|sombra|furtiv|monge)/.test(identityText)) {
    return 'rogue';
  }
  return 'knight';
}

export function resolveAllySpriteId(
  ally: ClashAllyState,
  theme: WorldThemeId,
): HeroSpriteId {
  const r = ally.role.toLowerCase();
  if (theme === 'cyberpunk') {
    return ally.directive === 'support' || /net|hack|médic|atirad/.test(r)
      ? 'netrunner'
      : 'cyber_ronin';
  }
  if (theme === 'mystery') {
    return ally.directive === 'support' ? 'mage' : 'detective';
  }
  if (theme === 'zombies' || theme === 'apocalyptic') {
    return ally.directive === 'flank' ? 'rogue' : 'survivor';
  }
  if (/clérig|curandeir|sacerd|médic/.test(r) || ally.directive === 'support') {
    return 'cleric';
  }
  if (/mago|arcan|feiticeir|brux/.test(r)) {
    return 'mage';
  }
  if (/paladin|templár|guardi/.test(r) || ally.directive === 'guard') {
    return 'paladin';
  }
  if (/bárbar|barbar|berserk|machad/.test(r)) {
    return 'barbarian';
  }
  if (/bard|trovad|diplomat|músic/.test(r)) {
    return 'bard';
  }
  if (/arqueir|besteir|caçad|atirad|patrulh/.test(r)) {
    return 'ranger';
  }
  if (/ladin|batedor|espi|sombra/.test(r) || ally.directive === 'flank') {
    return 'rogue';
  }
  return 'knight';
}

export function resolveEnemySpriteId(
  enemy: ClashEnemy,
  theme: WorldThemeId,
  archetype: ClashArchetype,
): EnemySpriteId {
  if (archetype === 'social') {
    return enemy.isBoss ? 'gothic_lord' : 'cultist_agent';
  }
  if (theme === 'cyberpunk') {
    return enemy.isBoss ? 'cyber_enforcer' : 'cyber_drone';
  }
  if (theme === 'mystery') {
    return enemy.isBoss ? 'gothic_lord' : 'cultist_agent';
  }
  if (theme === 'zombies') {
    return enemy.isBoss ? 'juggernaut_zombie' : 'infected_runner';
  }
  if (theme === 'apocalyptic') {
    return enemy.isBoss ? 'wasteland_warlord' : 'raider_gunner';
  }
  return enemy.isBoss ? 'dread_knight' : 'shadow_archer';
}

export const HD2D_HERO_SPRITE_URLS: Record<HeroSpriteId, string> = {
  knight: '/battle-sprites/knight.png',
  barbarian: '/battle-sprites/barbarian.png',
  paladin: '/battle-sprites/paladin.png',
  rogue: '/battle-sprites/rogue.png',
  mage: '/battle-sprites/mage.png',
  cleric: '/battle-sprites/cleric.png',
  ranger: '/battle-sprites/ranger.png',
  bard: '/battle-sprites/bard.png',
  cyber_ronin: '/battle-sprites/cyber_ronin.png',
  netrunner: '/battle-sprites/netrunner.png',
  detective: '/battle-sprites/detective.png',
  survivor: '/battle-sprites/survivor.png',
};

export const HD2D_ENEMY_SPRITE_URLS: Record<EnemySpriteId, string> = {
  dread_knight: '/battle-sprites/dread_knight.png',
  shadow_archer: '/battle-sprites/shadow_archer.png',
  cyber_enforcer: '/battle-sprites/cyber_enforcer.png',
  cyber_drone: '/battle-sprites/cyber_drone.png',
  gothic_lord: '/battle-sprites/gothic_lord.png',
  cultist_agent: '/battle-sprites/cultist_agent.png',
  juggernaut_zombie: '/battle-sprites/juggernaut_zombie.png',
  infected_runner: '/battle-sprites/infected_runner.png',
  wasteland_warlord: '/battle-sprites/wasteland_warlord.png',
  raider_gunner: '/battle-sprites/raider_gunner.png',
};

const FLOATING_HERO_SPRITES = new Set<HeroSpriteId>(['mage']);
const FLOATING_ENEMY_SPRITES = new Set<EnemySpriteId>(['cyber_drone']);

export function PixelHeroSprite({
  spriteId,
  frame = 0,
  isAttacking = false,
  isHit = false,
  isAlly = false,
  accentColor,
  className = 'h-full w-full',
}: {
  spriteId: HeroSpriteId;
  frame?: 0 | 1;
  isAttacking?: boolean;
  isHit?: boolean;
  isAlly?: boolean;
  accentColor?: string;
  className?: string;
}) {
  const hdUrl = HD2D_HERO_SPRITE_URLS[spriteId];
  if (hdUrl) {
    const isFloat = FLOATING_HERO_SPRITES.has(spriteId);
    const rimFilter = isHit
      ? 'brightness(2.8) contrast(1.3) drop-shadow(0 0 10px #ffffff)'
      : accentColor
        ? `drop-shadow(0 4px 6px rgba(0,0,0,0.75)) drop-shadow(0 0 8px ${accentColor}55)`
        : 'drop-shadow(0 4px 6px rgba(0,0,0,0.75))';
    return (
      <div className={`relative select-none ${className}`}>
        {/* Afterimage Ghost Trail on Attack (Final Fantasy / Fire Emblem dash feel!) */}
        {isAttacking ? (
          <>
            <img
              src={hdUrl}
              alt=""
              aria-hidden="true"
              draggable={false}
              style={{ filter: `brightness(1.6) saturate(1.4) drop-shadow(0 0 8px ${accentColor ?? '#facc15'})` }}
              className="pixel-art-sprite animate-hd2d-afterimage-right pointer-events-none absolute inset-0 h-full w-full object-contain object-bottom opacity-45"
            />
          </>
        ) : null}

        {/* Subtle cyan ground ring for Party Allies (preserves full sprite art fidelity!) */}
        {isAlly ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-2 bottom-0 left-2 h-2 rounded-full border border-sky-400/70 bg-sky-400/20 blur-[1px]"
          />
        ) : null}

        <img
          src={hdUrl}
          alt={spriteId}
          draggable={false}
          style={{ filter: rimFilter }}
          className={`pixel-art-sprite relative z-10 h-full w-full object-contain object-bottom transition-transform duration-150 ${
            isHit
              ? 'animate-hd2d-hit'
              : isAttacking
                ? 'scale-105'
                : isFloat
                  ? 'animate-hd2d-float'
                  : 'animate-hd2d-breathe'
          }`}
        />
      </div>
    );
  }

  const spec = (HERO_SPRITES[spriteId] ?? HERO_SPRITES.knight)!;
  const rows =
    isAttacking && spec.attack
      ? spec.attack
      : frame === 1
        ? spec.idleB
        : spec.idleA;

  // Give allies a distinct cobalt/teal tunic/cape tint so the squad reads cleanly
  const allyOverrides: PaletteMap | undefined = isAlly
    ? { C: '#38bdf8', R: '#0369a1', G: '#7dd3fc' }
    : undefined;

  return (
    <svg
      viewBox={`0 0 ${spec.width} ${spec.height}`}
      shapeRendering="crispEdges"
      className={`pixel-art-sprite ${className} ${
        isHit ? 'brightness-[2.4] contrast-125' : ''
      }`}
    >
      {renderPixelMatrix(rows, spec.palette, allyOverrides)}
    </svg>
  );
}

export function PixelEnemySprite({
  spriteId,
  frame = 0,
  isAttacking = false,
  isHit = false,
  accentColor,
  className = 'h-full w-full',
}: {
  spriteId: EnemySpriteId;
  frame?: 0 | 1;
  isAttacking?: boolean;
  isHit?: boolean;
  accentColor?: string;
  className?: string;
}) {
  const hdUrl = HD2D_ENEMY_SPRITE_URLS[spriteId];
  if (hdUrl) {
    const isFloat = FLOATING_ENEMY_SPRITES.has(spriteId);
    const rimFilter = isHit
      ? 'brightness(2.8) contrast(1.3) drop-shadow(0 0 12px #ffffff)'
      : accentColor
        ? `drop-shadow(0 5px 8px rgba(0,0,0,0.82)) drop-shadow(0 0 8px ${accentColor}44)`
        : 'drop-shadow(0 5px 8px rgba(0,0,0,0.82))';
    return (
      <div className={`relative select-none ${className}`}>
        {isAttacking ? (
          <img
            src={hdUrl}
            alt=""
            aria-hidden="true"
            draggable={false}
            style={{ filter: `brightness(1.5) saturate(1.5) drop-shadow(0 0 8px ${accentColor ?? '#f87171'})` }}
            className="pixel-art-sprite animate-hd2d-afterimage-left pointer-events-none absolute inset-0 h-full w-full object-contain object-bottom opacity-45"
          />
        ) : null}
        <img
          src={hdUrl}
          alt={spriteId}
          draggable={false}
          style={{ filter: rimFilter }}
          className={`pixel-art-sprite relative z-10 h-full w-full object-contain object-bottom transition-transform duration-150 ${
            isHit
              ? 'animate-hd2d-hit'
              : isAttacking
                ? 'scale-105'
                : isFloat
                  ? 'animate-hd2d-float'
                  : 'animate-hd2d-breathe'
          }`}
        />
      </div>
    );
  }

  const spec = ENEMY_SPRITES[spriteId] ?? ENEMY_SPRITES.dread_knight;
  const rows = frame === 1 ? spec.idleB : spec.idleA;

  return (
    <svg
      viewBox={`0 0 ${spec.width} ${spec.height}`}
      shapeRendering="crispEdges"
      className={`pixel-art-sprite ${className} ${
        isHit ? 'brightness-[2.5] contrast-125' : ''
      }`}
    >
      {renderPixelMatrix(rows, spec.palette)}
    </svg>
  );
}

/**
 * Framed Fire Emblem / Symphony of War dialogue speaker portrait bust
 * (uses crisp upper-body framing of the HD-2D sprite when available!).
 */
export function PixelBustAvatar({
  heroSpriteId,
  enemySpriteId,
  className = 'h-full w-full',
}: {
  heroSpriteId?: HeroSpriteId;
  enemySpriteId?: EnemySpriteId;
  className?: string;
}) {
  const hdUrl = heroSpriteId
    ? HD2D_HERO_SPRITE_URLS[heroSpriteId]
    : enemySpriteId
      ? HD2D_ENEMY_SPRITE_URLS[enemySpriteId]
      : undefined;

  if (hdUrl) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <img
          src={hdUrl}
          alt={heroSpriteId ?? enemySpriteId ?? 'portrait'}
          draggable={false}
          className="pixel-art-sprite h-full w-full origin-top scale-[1.45] object-cover object-top drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
        />
      </div>
    );
  }

  if (heroSpriteId) {
    const spec = (HERO_SPRITES[heroSpriteId] ?? HERO_SPRITES.knight)!;
    return (
      <svg
        viewBox="1 0 12 11"
        shapeRendering="crispEdges"
        className={`pixel-art-sprite ${className}`}
      >
        {renderPixelMatrix(spec.idleA, spec.palette)}
      </svg>
    );
  }
  const spec = ENEMY_SPRITES[enemySpriteId ?? 'dread_knight'] ?? ENEMY_SPRITES.dread_knight;
  const bustW = Math.min(14, spec.width);
  const startX = Math.max(0, Math.floor((spec.width - bustW) / 2));
  return (
    <svg
      viewBox={`${startX} 0 ${bustW} 12`}
      shapeRendering="crispEdges"
      className={`pixel-art-sprite ${className}`}
    >
      {renderPixelMatrix(spec.idleA, spec.palette)}
    </svg>
  );
}
