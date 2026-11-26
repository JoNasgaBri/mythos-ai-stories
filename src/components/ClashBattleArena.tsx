import {
  AlertTriangle,
  ArrowLeft,
  Backpack,
  Crown,
  Footprints,
  Heart,
  ImagePlus,
  Layers,
  Loader2,
  MapPin,
  Scale,
  Send,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Target,
  Trophy,
  UserCog,
  Volume2,
  VolumeX,
  Wand2,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BATTLE_STAGE_PRESET_LIST,
  BATTLE_STAGE_PRESETS,
  resolveStageAtmosphere,
} from '../data/battleStagePresets';
import { DND_CONDITIONS, DND_SPELLS } from '../data/dnd52Catalog';
import { clashAudio } from '../engine/clashAudio';
import {
  ALLY_DIRECTIVE_META,
  CLASH_ARCHETYPE_META,
  getPlayerClashMoves,
  type ClashChoreographyBeat,
  type ClashVfxKind,
} from '../engine/clashSystem';
import {
  computeArmorClass,
  getThemedSpellLabel,
  getThemeVocab,
  getTotalAvailableSpellSlots,
  isDndRuleset,
  scaleCantripDice,
} from '../engine/dnd52Rules';
import type {
  Campaign,
  ClashActionPayload,
  ClashAllyDirective,
  ClashAllyState,
  ClashEnemy,
  ClashZone,
  DiceRollResult,
  InventoryItem,
  TacticalClashState,
  WorldThemeId,
} from '../types/game';
import { BattleStageBackdrop } from './BattleStageBackdrop';
import {
  HERO_SPRITE_OPTIONS,
  PixelBustAvatar,
  PixelEnemySprite,
  PixelHeroSprite,
  resolveAllySpriteId,
  resolveEnemySpriteId,
  resolveHeroSpriteId,
  type HeroSpriteId,
} from './PixelBattleSprites';

interface ClashBattleArenaProps {
  campaign: Campaign;
  clash: TacticalClashState;
  lastDiceRoll: DiceRollResult | null;
  activeBeats: ClashChoreographyBeat[];
  battleNonce: number;
  isResolvingFinal: boolean;
  bossArtUrl?: string | null;
  isGeneratingBossArt?: boolean;
  onGenerateBossArt?: (enemy: ClashEnemy) => void;
  onSelectTarget: (enemyId: string) => void;
  onChangeAllyDirective: (npcId: string, directive: ClashAllyDirective) => void;
  onExecuteTurn: (payload: ClashActionPayload, vfx: ClashVfxKind) => void;
  onUseConsumable: (item: InventoryItem) => void;
  onFreeMove?: (zone: ClashZone) => void;
  onBonusResource?: (resourceId: string) => void;
  onBonusSpell?: (spellId: string) => void;
  onTogglePreArmedReaction?: () => void;
  canRerollArenaWithInspiration?: boolean;
  onRerollArenaWithInspiration?: () => void;
  useClassicDndNames?: boolean;
  onConvertChaseToCombat: () => void;
  onRetreat: () => void;
  onFinishToStory: () => void;
}

type MenuScreen = 'root' | 'fight' | 'skills' | 'bag' | 'freeform';
type ActivePopover = 'none' | 'stage' | 'sprite';

const DIRECTIVE_ORDER: ClashAllyDirective[] = ['strike', 'guard', 'flank', 'support'];

function zoneToHeroCol(zone: ClashZone): 0 | 1 | 2 {
  if (zone === 'far') return 0; // Retaguarda
  if (zone === 'close') return 2; // Vanguarda
  return 1; // Centro
}

function zoneToEnemyCol(zone: ClashZone): 0 | 1 | 2 {
  if (zone === 'close') return 0; // Vanguarda inimiga (mais perto do centro)
  if (zone === 'far') return 2; // Retaguarda inimiga
  return 1; // Centro
}

function heroZoneLabel(zone: ClashZone): string {
  if (zone === 'close') return 'Vanguarda';
  if (zone === 'far') return 'Retaguarda';
  return 'Centro';
}

function allyFormationSlot(
  ally: ClashAllyState,
  index: number,
  heroCol: 0 | 1 | 2,
): { row: 0 | 1 | 2; col: 0 | 1 | 2 } {
  const row: 0 | 1 | 2 = index % 2 === 0 ? 0 : 2;
  if (ally.directive === 'guard') {
    return { row, col: 2 };
  }
  if (ally.directive === 'support') {
    return { row, col: 0 };
  }
  if (ally.directive === 'flank') {
    return { row, col: heroCol === 2 ? 1 : 2 };
  }
  return { row, col: 1 };
}

function enemyFormationSlots(
  enemies: ClashEnemy[],
): Map<string, { row: 0 | 1 | 2; col: 0 | 1 | 2 }> {
  const map = new Map<string, { row: 0 | 1 | 2; col: 0 | 1 | 2 }>();
  const used = new Set<string>();
  const rowPref: Array<0 | 1 | 2> = [1, 0, 2];

  // Anchor Boss first in middle row of its zone column
  const ordered = [...enemies].sort((a, b) => Number(Boolean(b.isBoss)) - Number(Boolean(a.isBoss)));

  for (const enemy of ordered) {
    const preferredCol = zoneToEnemyCol(enemy.zone);
    let placed = false;
    for (const r of rowPref) {
      const key = `${r}_${preferredCol}`;
      if (!used.has(key)) {
        used.add(key);
        map.set(enemy.id, { row: r, col: preferredCol });
        placed = true;
        break;
      }
    }
    if (!placed) {
      outer: for (let c = 0 as 0 | 1 | 2; c <= 2; c = (c + 1) as 0 | 1 | 2) {
        for (const r of rowPref) {
          const key = `${r}_${c}`;
          if (!used.has(key)) {
            used.add(key);
            map.set(enemy.id, { row: r, col: c });
            break outer;
          }
        }
      }
    }
  }
  return map;
}

function ImpactVfxOverlay({ vfx }: { vfx: ClashVfxKind }) {
  if (vfx === 'shield') {
    return (
      <svg viewBox="0 0 120 120" className="animate-clash-vfx-slash pointer-events-none absolute inset-0 z-30 h-full w-full">
        <circle cx="60" cy="60" r="46" fill="rgba(56,189,248,0.22)" stroke="#38bdf8" strokeWidth="5" />
        <circle cx="60" cy="60" r="34" fill="none" stroke="#bae6fd" strokeWidth="2" strokeDasharray="8 6" />
      </svg>
    );
  }
  if (vfx === 'heal') {
    return (
      <svg viewBox="0 0 120 120" className="animate-clash-vfx-slash pointer-events-none absolute inset-0 z-30 h-full w-full">
        <circle cx="60" cy="60" r="42" fill="rgba(74,222,128,0.24)" stroke="#4ade80" strokeWidth="4" />
        <path d="M60 32 V88 M32 60 H88" stroke="#bbf7d0" strokeWidth="8" strokeLinecap="round" />
      </svg>
    );
  }
  if (vfx === 'limit') {
    return (
      <svg viewBox="0 0 120 120" className="animate-clash-vfx-slash pointer-events-none absolute inset-0 z-30 h-full w-full">
        <polygon points="60,4 74,44 116,44 82,70 96,112 60,86 24,112 38,70 4,44 46,44" fill="rgba(251,191,36,0.45)" stroke="#fef08a" strokeWidth="3" />
        <path d="M12 108 L108 12 M12 12 L108 108" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
      </svg>
    );
  }
  if (vfx === 'psychic') {
    return (
      <svg viewBox="0 0 120 120" className="animate-clash-vfx-slash pointer-events-none absolute inset-0 z-30 h-full w-full">
        <circle cx="60" cy="60" r="44" fill="none" stroke="#c084fc" strokeWidth="5" />
        <circle cx="60" cy="60" r="28" fill="rgba(192,132,252,0.28)" stroke="#f5d0fe" strokeWidth="3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 120" className="animate-clash-vfx-slash pointer-events-none absolute inset-0 z-30 h-full w-full">
      <path
        d="M14 98 Q58 54 106 16"
        fill="none"
        stroke={vfx === 'heavy' ? '#fbbf24' : '#ffffff'}
        strokeWidth={vfx === 'heavy' ? '10' : '7'}
        strokeLinecap="round"
      />
      <path
        d="M24 106 Q66 64 110 28"
        fill="none"
        stroke={vfx === 'shot' ? '#38bdf8' : '#f87171'}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="62" cy="58" r="14" fill="rgba(255,255,255,0.55)" />
    </svg>
  );
}

export function ClashBattleArena({
  campaign,
  clash,
  lastDiceRoll,
  activeBeats,
  battleNonce,
  isResolvingFinal,
  bossArtUrl,
  isGeneratingBossArt = false,
  onGenerateBossArt,
  onSelectTarget,
  onChangeAllyDirective,
  onExecuteTurn,
  onUseConsumable,
  onFreeMove,
  onBonusResource,
  onBonusSpell,
  onTogglePreArmedReaction,
  canRerollArenaWithInspiration = false,
  onRerollArenaWithInspiration,
  useClassicDndNames = false,
  onConvertChaseToCombat,
  onRetreat,
  onFinishToStory,
}: ClashBattleArenaProps) {
  const [menu, setMenu] = useState<MenuScreen>('root');
  const [skillsSubTab, setSkillsSubTab] = useState<'magic' | 'tactics'>('magic');
  const [popover, setPopover] = useState<ActivePopover>('none');
  const [freeformText, setFreeformText] = useState('');
  const [showIntro, setShowIntro] = useState(true);
  const [sfxMuted, setSfxMuted] = useState(() => clashAudio.isMuted());

  // 2-frame authentic 16-bit breathing clock (Symphony of War / Fire Emblem idle pulse)
  const [pixelFrame, setPixelFrame] = useState<0 | 1>(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setPixelFrame((prev) => (prev === 0 ? 1 : 0));
    }, 520);
    return () => window.clearInterval(id);
  }, []);

  // World Battle Stage Preset override + AI Scene Backdrop toggle
  const [stageOverride, setStageOverride] = useState<WorldThemeId | null>(null);
  const [useAiScene, setUseAiScene] = useState(false);

  // Hero Pixel Sprite manual override (null = automatic from world + equipped gear!)
  const spriteStorageKey = `mythos_battle_sprite_${campaign.id}`;
  const [heroSpriteOverride, setHeroSpriteOverride] = useState<HeroSpriteId | null>(() => {
    try {
      const saved = localStorage.getItem(spriteStorageKey);
      if (saved && HERO_SPRITE_OPTIONS.some((o) => o.id === saved)) {
        return saved as HeroSpriteId;
      }
    } catch {
      // ignore storage errors
    }
    return null;
  });

  const handleSelectHeroSprite = (next: HeroSpriteId | null) => {
    clashAudio.playMenuClick();
    setHeroSpriteOverride(next);
    try {
      if (next) localStorage.setItem(spriteStorageKey, next);
      else localStorage.removeItem(spriteStorageKey);
    } catch {
      // ignore
    }
    setPopover('none');
  };

  // Choreographed visual animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeSpeakerSide, setActiveSpeakerSide] = useState<'hero' | 'enemy'>('hero');
  const [activeCaption, setActiveCaption] = useState<string>(
    `${clash.title} — ${clash.objective}`,
  );
  const [lungingId, setLungingId] = useState<string | null>(null);
  const [hitTargetId, setHitTargetId] = useState<string | null>(null);
  const [activeVfx, setActiveVfx] = useState<{
    targetId: string;
    vfx: ClashVfxKind;
  } | null>(null);
  const [floatingPop, setFloatingPop] = useState<{
    id: string;
    targetId: string;
    text: string;
    color: string;
  } | null>(null);
  const [screenShake, setScreenShake] = useState(false);

  const timersRef = useRef<number[]>([]);

  const activeThemeId: WorldThemeId = stageOverride ?? campaign.world.primaryTheme;
  const stagePreset = BATTLE_STAGE_PRESETS[activeThemeId] ?? BATTLE_STAGE_PRESETS.fantasy;
  const stageAtmosphere = useMemo(
    () =>
      resolveStageAtmosphere(
        stagePreset,
        campaign.worldClock?.period,
        campaign.worldClock?.weatherType,
      ),
    [stagePreset, campaign.worldClock?.period, campaign.worldClock?.weatherType],
  );

  const autoHeroSpriteId = useMemo(() => resolveHeroSpriteId(campaign), [campaign]);
  const heroSpriteId: HeroSpriteId = heroSpriteOverride ?? autoHeroSpriteId;

  const meta = CLASH_ARCHETYPE_META[clash.archetype];
  const playerMoves = useMemo(
    () => getPlayerClashMoves(campaign, clash),
    [campaign, clash],
  );
  const livingEnemies = useMemo(
    () => clash.enemies.filter((e) => e.hp > 0),
    [clash.enemies],
  );
  const focusedEnemy =
    livingEnemies.find((e) => e.id === clash.selectedTargetId) ??
    livingEnemies[0] ??
    clash.enemies[0];

  const isEnded = clash.status !== 'active';
  const isVictory = clash.status === 'victory' || clash.status === 'escaped';
  const isSolo = clash.allies.filter((a) => !a.downed).length === 0;
  const comboReady = clash.synergy >= 100;
  const comboLabel = isSolo ? meta.soloSurgeTitle : meta.partyComboTitle;
  const isCorneredChase =
    clash.archetype === 'chase' && (clash.pursuerThreat ?? 0) >= 100;

  const npcPortraitMap = useMemo(() => {
    const m = new Map<string, string | undefined>();
    for (const n of campaign.codex.npcs) m.set(n.id, n.portraitUrl);
    return m;
  }, [campaign.codex.npcs]);

  const lastSceneBg = useMemo(() => {
    for (let i = campaign.entries.length - 1; i >= 0; i--) {
      if (campaign.entries[i].imageUrl) return campaign.entries[i].imageUrl;
    }
    return campaign.coverImageUrl;
  }, [campaign.entries, campaign.coverImageUrl]);

  const carryConsumables = useMemo(
    () =>
      campaign.player.inventory
        .filter(
          (i) =>
            i.category === 'consumable' &&
            i.quantity > 0 &&
            (!i.storage || i.storage === 'carry'),
        )
        .slice(0, 4),
    [campaign.player.inventory],
  );

  const socialArguments = useMemo(() => {
    if (clash.archetype !== 'social') return [];
    const used = new Set(clash.usedArgumentIds ?? []);
    const clues = campaign.player.inventory
      .filter((i) => i.category === 'clue' && !used.has(`clue_${i.id}`))
      .slice(0, 3)
      .map((i) => ({ id: `clue_${i.id}`, label: i.name, kind: 'Prova' }));
    if (clues.length > 0) return clues;
    return campaign.codex.canonFacts
      .filter((f) => !used.has(`fact_${f.id}`))
      .slice(-2)
      .map((f) => ({
        id: `fact_${f.id}`,
        label: f.text.length > 42 ? `${f.text.slice(0, 40)}…` : f.text,
        kind: 'Fato',
      }));
  }, [clash.archetype, clash.usedArgumentIds, campaign.player.inventory, campaign.codex.canonFacts]);

  // Encounter intro slash + SFX once per battle ID
  useEffect(() => {
    setShowIntro(true);
    setMenu('root');
    setActiveSpeakerSide('hero');
    setActiveCaption(`${clash.title} — ${clash.objective}`);
    clashAudio.playEncounterStart();
    const t = window.setTimeout(() => setShowIntro(false), 1150);
    return () => window.clearTimeout(t);
  }, [clash.id]);

  // Play choreographed animation beats whenever a round finishes!
  useEffect(() => {
    if (battleNonce === 0 || activeBeats.length === 0) return;

    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
    setIsAnimating(true);
    setMenu('root');
    setPopover('none');

    let cursorMs = 40;
    activeBeats.forEach((beat) => {
      const startT = window.setTimeout(() => {
        setActiveCaption(beat.caption);
        setActiveSpeakerSide(beat.actorSide === 'enemy' ? 'enemy' : 'hero');
        setLungingId(beat.actorId ?? null);

        if (beat.vfx === 'limit') clashAudio.playLimitBreak();
        else if (beat.brokePosture) clashAudio.playPostureBreak();
        else if (beat.isCrit) clashAudio.playCrit();
        else if (beat.vfx === 'heal') clashAudio.playHeal();
        else if (beat.vfx === 'shield') clashAudio.playShield();
        else if (beat.vfx === 'heavy') clashAudio.playHeavyHit();
        else clashAudio.playSlash();

        const impactT = window.setTimeout(() => {
          if (beat.targetId) {
            setHitTargetId(beat.targetId);
            setActiveVfx({ targetId: beat.targetId, vfx: beat.vfx });
            if (beat.floatingText) {
              setFloatingPop({
                id: `${beat.id}_${Date.now()}`,
                targetId: beat.targetId,
                text: beat.floatingText,
                color: beat.floatingColor ?? '#f87171',
              });
            }
          }
          if (beat.screenShake) {
            setScreenShake(true);
            timersRef.current.push(
              window.setTimeout(() => setScreenShake(false), 340),
            );
          }
        }, 140);
        timersRef.current.push(impactT);

        const clearT = window.setTimeout(() => {
          setLungingId(null);
          setHitTargetId(null);
          setActiveVfx(null);
        }, 560);
        timersRef.current.push(clearT);
      }, cursorMs);

      timersRef.current.push(startT);
      cursorMs += 660;
    });

    const endT = window.setTimeout(() => {
      setIsAnimating(false);
      setFloatingPop(null);
      if (clash.status === 'victory' || clash.status === 'escaped') {
        setActiveSpeakerSide('hero');
        clashAudio.playVictoryFanfare();
        setActiveCaption(
          clash.status === 'escaped'
            ? `FUGA CONCLUÍDA! Você despistou ${clash.enemies[0]?.name ?? 'os perseguidores'} com maestria.`
            : `VITÓRIA! ${clash.title} conquistado! Clique em Continuar História para o desfecho épico.`,
        );
      } else if (clash.status === 'defeat') {
        setActiveSpeakerSide('enemy');
        setActiveCaption(
          clash.archetype === 'social'
            ? 'Sua compostura cedeu sob pressão. Clique em Continuar História para viver a consequência.'
            : 'Sua linha defensiva cedeu! Clique em Continuar História para ver o desfecho.',
        );
      }
    }, cursorMs + 120);
    timersRef.current.push(endT);

    return () => {
      for (const id of timersRef.current) window.clearTimeout(id);
    };
  }, [battleNonce]);

  const toggleMute = () => {
    const next = !sfxMuted;
    clashAudio.setMuted(next);
    setSfxMuted(next);
  };

  const triggerMove = (payload: ClashActionPayload, vfx: ClashVfxKind) => {
    if (isAnimating || isEnded) return;
    clashAudio.playMenuClick();
    setPopover('none');
    onExecuteTurn(payload, vfx);
  };

  const handleUseItemInstant = (item: InventoryItem) => {
    if (isAnimating || isEnded) return;
    clashAudio.playHeal();
    onUseConsumable(item);
    setActiveSpeakerSide('hero');
    setActiveVfx({ targetId: 'player', vfx: 'heal' });
    setFloatingPop({
      id: `heal_${Date.now()}`,
      targetId: 'player',
      text: '+25 HP',
      color: '#4ade80',
    });
    setActiveCaption(`${campaign.player.name} usou ${item.name} (+25 Vigor · Ação Bônus)!`);
    window.setTimeout(() => {
      setActiveVfx(null);
      setFloatingPop(null);
    }, 800);
    setMenu('root');
  };

  const handleFreeformSubmit = () => {
    const clean = freeformText.trim();
    if (!clean || isAnimating || isEnded) return;
    setFreeformText('');
    triggerMove(
      {
        kind: 'freeform',
        targetEnemyId: focusedEnemy?.id,
        label: clean,
      },
      'slash',
    );
  };

  const heroPrimaryPct =
    clash.archetype === 'social'
      ? Math.max(0, Math.min(100, clash.playerComposure ?? 100))
      : Math.round(
          (campaign.player.vigor / Math.max(1, campaign.player.maxVigor)) * 100,
        );

  const heroPrimaryText =
    clash.archetype === 'social'
      ? `${clash.playerComposure ?? 100}/100`
      : `${campaign.player.vigor}/${campaign.player.maxVigor}`;

  const isDnd = isDndRuleset(campaign);
  const dnd = campaign.player.dnd;
  const heroAcInfo = useMemo(
    () =>
      isDnd
        ? computeArmorClass(campaign.player, clash.shieldSpellBonusAc ?? 0)
        : null,
    [isDnd, campaign.player, clash.shieldSpellBonusAc],
  );
  const vocab = getThemeVocab(campaign.world.primaryTheme, useClassicDndNames);
  const heroCantrips = useMemo(
    () => (dnd?.cantripIds ?? []).map((id) => DND_SPELLS[id]).filter(Boolean),
    [dnd?.cantripIds],
  );
  const heroSpells = useMemo(
    () => (dnd?.preparedSpellIds ?? []).map((id) => DND_SPELLS[id]).filter(Boolean),
    [dnd?.preparedSpellIds],
  );
  const hasMagicOrResources =
    isDnd &&
    (heroCantrips.length > 0 ||
      heroSpells.length > 0 ||
      (dnd?.classResources.length ?? 0) > 0);
  const totalSlotsLeft = getTotalAvailableSpellSlots(dnd?.spellSlots);
  const isUnconsciousInArena =
    isDnd &&
    !isEnded &&
    clash.archetype !== 'social' &&
    campaign.player.vigor <= 0 &&
    clash.allies.some((a) => !a.downed && a.vigor > 0);
  const hasShieldReactionOption = Boolean(
    isDnd &&
      ((dnd?.preparedSpellIds.includes('shield') && totalSlotsLeft > 0) ||
        (dnd?.classId === 'rogue' && campaign.player.level >= 5)),
  );
  const showArenaInspirationReroll = Boolean(
    isDnd &&
      canRerollArenaWithInspiration &&
      onRerollArenaWithInspiration &&
      (campaign.player.inspiration ?? 0) > 0 &&
      lastDiceRoll &&
      !lastDiceRoll.rerolledWithInspiration &&
      (lastDiceRoll.outcome === 'failure' || lastDiceRoll.outcome === 'critical_failure'),
  );

  const fightRootLabel =
    clash.archetype === 'social'
      ? 'ARGUMENTAR'
      : clash.archetype === 'chase'
        ? 'MANOBRAR'
        : 'LUTAR';

  const bossEnemy = clash.enemies.find((e) => e.isBoss) ?? clash.enemies[0];
  const heroCol = zoneToHeroCol(clash.playerZone);
  const enemySlots = useMemo(() => enemyFormationSlots(clash.enemies), [clash.enemies]);

  // Build Hero Squad 3x3 slot occupancy map (Symphony of War Formation)
  const heroGridMap = useMemo(() => {
    const map = new Map<string, { kind: 'player' } | { kind: 'ally'; ally: ClashAllyState }>();
    map.set(`1_${heroCol}`, { kind: 'player' });
    clash.allies.slice(0, 4).forEach((ally, idx) => {
      const slot = allyFormationSlot(ally, idx, heroCol);
      const key = `${slot.row}_${slot.col}`;
      if (!map.has(key)) {
        map.set(key, { kind: 'ally', ally });
      } else {
        // Fallback open slot
        for (const r of [0, 2, 1] as const) {
          for (const c of [2, 1, 0] as const) {
            const k = `${r}_${c}`;
            if (!map.has(k)) {
              map.set(k, { kind: 'ally', ally });
              return;
            }
          }
        }
      }
    });
    return map;
  }, [heroCol, clash.allies]);

  const enemyGridMap = useMemo(() => {
    const map = new Map<string, ClashEnemy>();
    for (const enemy of clash.enemies) {
      const slot = enemySlots.get(enemy.id);
      if (slot) map.set(`${slot.row}_${slot.col}`, enemy);
    }
    return map;
  }, [clash.enemies, enemySlots]);

  const heroHasAllies = clash.allies.length > 0;
  const heroRows: Array<0 | 1 | 2> = heroHasAllies ? [0, 1, 2] : [1];
  const enemyRows: Array<0 | 1 | 2> = useMemo(() => {
    const usedRows = [...new Set([...enemySlots.values()].map((s) => s.row))].sort(
      (a, b) => a - b,
    );
    return usedRows.length > 0 ? usedRows : [1];
  }, [enemySlots]);
  const enemyHasMultiRows = enemyRows.length > 1;

  const focusedEnemyPortrait =
    (focusedEnemy?.linkedNpcId ? npcPortraitMap.get(focusedEnemy.linkedNpcId) : undefined) ??
    (focusedEnemy?.id === bossEnemy?.id ? bossArtUrl ?? undefined : undefined);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Arena de Batalha — ${clash.title}`}
      className={`fixed inset-0 z-[60] flex h-dvh w-screen flex-col overflow-hidden bg-[#070a09] text-[var(--text-primary)] select-none ${
        screenShake ? 'animate-clash-screen-shake' : ''
      }`}
    >
      {/* Dramatic Persona/Symphony of War Encounter Intro Banner */}
      {showIntro ? (
        <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-black/55 backdrop-blur-[2px]">
          <div
            style={{
              borderColor: stagePreset.accentColor,
              background: `linear-gradient(90deg, transparent, ${stagePreset.accentColor}f0 16%, ${stagePreset.accentColor}f0 84%, transparent)`,
            }}
            className="animate-clash-intro w-full border-y-2 py-4 text-center shadow-[0_0_60px_rgba(0,0,0,0.92)]"
          >
            <p className="font-mono-tech text-[11px] font-bold uppercase tracking-[0.35em] text-black/80">
              {stagePreset.name} · {meta.label}
            </p>
            <h2 className="font-display text-2xl font-black uppercase tracking-wider text-black sm:text-4xl">
              {clash.title}
            </h2>
          </div>
        </div>
      ) : null}

      {/* ================================================================== */}
      {/* TOP BAR: Turn Order + World Preset + Pixel Sprite Picker + Audio   */}
      {/* ================================================================== */}
      <header
        style={{ borderBottomColor: stagePreset.hudBorderColor }}
        className="relative z-30 flex shrink-0 items-center justify-between gap-2 border-b bg-black/78 px-3 py-2 backdrop-blur-xl sm:px-5"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            style={{
              backgroundColor: `${meta.color}24`,
              borderColor: `${meta.color}70`,
              color: meta.color,
            }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
          >
            {clash.archetype === 'social' ? (
              <Scale className="h-3.5 w-3.5" />
            ) : clash.archetype === 'chase' ? (
              <Footprints className="h-3.5 w-3.5" />
            ) : (
              <Swords className="h-3.5 w-3.5" />
            )}
            <span>R{clash.round}</span>
          </span>

          {/* Turn Queue Strip (Initiative-sorted in D&D 5.2!) */}
          <div className="hidden items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[10px] md:flex">
            {clash.turnOrder && clash.turnOrder.length > 0 ? (
              clash.turnOrder.slice(0, 4).map((t, idx) => (
                <span key={t.id} className="text-white/55">
                  {idx > 0 ? '→ ' : ''}
                  <span
                    style={t.side === 'hero' ? { color: stagePreset.accentColor } : undefined}
                    className={
                      t.side === 'hero'
                        ? 'font-bold'
                        : t.side === 'ally'
                          ? 'text-[#7dd3fc]'
                          : 'text-[#fca5a5]'
                    }
                  >
                    {t.name}
                  </span>
                  <span className="font-mono-tech ml-0.5 text-[9px] text-white/40">
                    ({t.initiative})
                  </span>
                </span>
              ))
            ) : (
              <>
                <span style={{ color: stagePreset.accentColor }} className="font-semibold">
                  {campaign.player.name.split(' ')[0]}
                </span>
                {clash.allies
                  .filter((a) => !a.downed)
                  .map((a) => (
                    <span key={a.npcId} className="text-white/55">
                      → <span className="text-[#7dd3fc]">{a.name.split(' ')[0]}</span>
                    </span>
                  ))}
                {livingEnemies.slice(0, 2).map((e) => (
                  <span key={e.id} className="text-white/55">
                    → <span className="text-[#fca5a5]">{e.name.split(' ')[0]}</span>
                  </span>
                ))}
              </>
            )}
          </div>

          <h2 className="font-display truncate text-xs font-semibold text-white/90 sm:text-sm md:hidden">
            {clash.title}
          </h2>
        </div>

        {/* Center Meter: Chase / Siege or World Stage Preset Tag */}
        {clash.archetype === 'chase' ? (
          <div className="flex items-center gap-2 rounded-xl border border-[#38bdf8]/40 bg-black/50 px-2.5 py-1 text-[10px] font-bold">
            <span className="text-[#38bdf8]">FUGA {clash.chaseProgress ?? 0}%</span>
            <span className="text-white/30">|</span>
            <span className="text-[#f87171]">CERCO {clash.pursuerThreat ?? 0}%</span>
          </div>
        ) : clash.archetype === 'siege' ? (
          <div className="flex items-center gap-2 rounded-xl border border-[#fb923c]/40 bg-black/50 px-2.5 py-1 text-[10px] font-bold">
            <span className="text-[#fb923c]">
              ONDA {clash.waveCurrent ?? 1}/{clash.waveTotal ?? 3}
            </span>
            <span className="text-white/30">|</span>
            <span className="text-white">BARRICADA {clash.barricadeHp ?? 100}%</span>
          </div>
        ) : (
          <div className="hidden items-center gap-1.5 rounded-full border border-white/12 bg-black/55 px-3 py-1 text-[10px] font-semibold text-white/80 lg:inline-flex">
            <span
              style={{ backgroundColor: stagePreset.accentColor }}
              className="h-2 w-2 rounded-full"
            />
            <span>{stagePreset.name}</span>
            <span className="text-white/35">·</span>
            <span className="text-white/60">{stageAtmosphere.periodLabel}</span>
          </div>
        )}

        {/* Right Controls: Stage Preset Picker, Hero Pixel Sprite Picker, Boss Art, Mute */}
        <div className="relative flex shrink-0 items-center gap-1.5">
          {/* Stage Preset / AI Scene Switcher */}
          <button
            type="button"
            onClick={() => {
              clashAudio.playMenuClick();
              setPopover((p) => (p === 'stage' ? 'none' : 'stage'));
            }}
            title="Trocar Preset de Cenário HD-2D ou Cena da IA"
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition ${
              popover === 'stage'
                ? 'border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]'
                : 'border-white/15 bg-white/8 text-white/85 hover:border-white/40'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {useAiScene && lastSceneBg ? 'Cena IA' : stagePreset.shortLabel}
            </span>
          </button>

          {/* Hero Pixel Sprite Picker */}
          <button
            type="button"
            onClick={() => {
              clashAudio.playMenuClick();
              setPopover((p) => (p === 'sprite' ? 'none' : 'sprite'));
            }}
            title="Personalizar Sprite Pixel Art do Herói"
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition ${
              popover === 'sprite'
                ? 'border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]'
                : 'border-white/15 bg-white/8 text-white/85 hover:border-white/40'
            }`}
          >
            <UserCog className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sprite</span>
          </button>

          {onGenerateBossArt && bossEnemy && !bossArtUrl ? (
            <button
              type="button"
              disabled={isGeneratingBossArt}
              onClick={() => onGenerateBossArt(bossEnemy)}
              title={`Gerar retrato de diálogo para ${bossEnemy.name}`}
              className="hidden items-center gap-1 rounded-lg border border-white/15 bg-white/8 px-2.5 py-1 text-[10px] font-semibold text-white/85 transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50 md:inline-flex"
            >
              {isGeneratingBossArt ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ImagePlus className="h-3 w-3" />
              )}
              <span>Ilustrar Chefe</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={toggleMute}
            title={sfxMuted ? 'Ativar sons da batalha' : 'Silenciar sons da batalha'}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/8 text-white/80 transition hover:text-white"
          >
            {sfxMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" style={{ color: stagePreset.accentColor }} />
            )}
          </button>

          {/* Popover: World Stage Preset & AI Scene Switcher */}
          {popover === 'stage' ? (
            <div className="absolute top-10 right-0 z-50 w-64 rounded-2xl border border-white/20 bg-[#0b0e12]/96 p-3 shadow-2xl backdrop-blur-2xl">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                Preset de Cenário HD-2D
              </p>
              <div className="mt-2 grid grid-cols-1 gap-1.5">
                {BATTLE_STAGE_PRESET_LIST.map((p) => {
                  const selected = !useAiScene && p.id === activeThemeId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        clashAudio.playMenuClick();
                        setUseAiScene(false);
                        setStageOverride(p.id);
                        setPopover('none');
                      }}
                      className={`flex items-center justify-between rounded-xl border px-2.5 py-1.5 text-left text-xs transition ${
                        selected
                          ? 'border-[var(--accent)] bg-[var(--accent)]/18 text-white'
                          : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
                      }`}
                    >
                      <span className="flex items-center gap-2 font-semibold">
                        <span
                          style={{ backgroundColor: p.accentColor }}
                          className="h-2.5 w-2.5 rounded-full"
                        />
                        <span>{p.shortLabel}</span>
                      </span>
                      <span className="text-[10px] text-white/50">
                        {p.id === campaign.world.primaryTheme ? 'Mundo' : 'Preset'}
                      </span>
                    </button>
                  );
                })}
                {lastSceneBg ? (
                  <button
                    type="button"
                    onClick={() => {
                      clashAudio.playMenuClick();
                      setUseAiScene(true);
                      setPopover('none');
                    }}
                    className={`mt-1 flex items-center justify-between rounded-xl border px-2.5 py-1.5 text-left text-xs transition ${
                      useAiScene
                        ? 'border-[var(--accent)] bg-[var(--accent)]/18 text-white'
                        : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
                    }`}
                  >
                    <span className="font-semibold">Usar Cena IA Atual</span>
                    <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Popover: Hero Pixel Art Sprite Picker */}
          {popover === 'sprite' ? (
            <div className="absolute top-10 right-0 z-50 max-h-[68vh] w-[320px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-2xl border border-white/20 bg-[#0b0e12]/96 p-3 shadow-2xl backdrop-blur-2xl">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                  Sprite HD-2D do Herói (12 Classes)
                </p>
                <button
                  type="button"
                  onClick={() => handleSelectHeroSprite(null)}
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    heroSpriteOverride === null
                      ? 'bg-[var(--accent)] text-black'
                      : 'bg-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  Auto
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {HERO_SPRITE_OPTIONS.map((opt) => {
                  const selected = heroSpriteId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectHeroSprite(opt.id)}
                      className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition ${
                        selected
                          ? 'border-[var(--accent)] bg-[var(--accent)]/18 text-white'
                          : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <div className="h-10 w-10 shrink-0 rounded-lg bg-black/60 p-0.5">
                        <PixelHeroSprite spriteId={opt.id} frame={pixelFrame} />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[11px] font-bold">{opt.label}</div>
                        <div className="truncate text-[9px] text-white/55">{opt.roleTag}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {/* ================================================================== */}
      {/* HD-2D PIXEL BATTLE STAGE + SYMPHONY OF WAR 3x3 SQUAD FORMATIONS    */}
      {/* ================================================================== */}
      <div
        onClick={() => {
          if (popover !== 'none') setPopover('none');
        }}
        className="relative flex min-h-0 flex-1 flex-col justify-end overflow-hidden px-3 pt-2 pb-3 sm:px-6 sm:pb-5"
      >
        {/* Full HD-2D World Preset Backdrop + Live Weather/Atmosphere FX */}
        <BattleStageBackdrop
          preset={stagePreset}
          atmosphere={stageAtmosphere}
          useAiScene={useAiScene}
          aiSceneUrl={lastSceneBg}
        />

        {/* SYMPHONY OF WAR SQUAD-VS-SQUAD STAGE */}
        <div className="relative z-10 mx-auto flex h-full w-full max-w-[1180px] flex-col justify-between gap-2 md:flex-row md:items-end md:justify-between md:pb-2">
          {/* ============================================================== */}
          {/* LEFT SQUAD (BOTTOM-LEFT ON MOBILE): HERO & ALLY 3x3 FORMATION  */}
          {/* ============================================================== */}
          <div className="order-2 flex flex-col items-start gap-2 md:order-1 md:w-[45%]">
            {/* Symphony of War 3x3 Squad Pad */}
            <div
              style={{
                borderColor: stagePreset.heroTileColor,
                boxShadow: `0 18px 42px rgba(0,0,0,0.65), inset 0 0 24px ${stagePreset.heroTileColor}`,
              }}
              className="relative w-full max-w-[370px] rounded-2xl border bg-black/48 px-2.5 pt-2 pb-2.5 backdrop-blur-[3px]"
            >
              {/* Column Tactical Labels (Retaguarda / Centro / Vanguarda) */}
              <div className="mb-1.5 grid grid-cols-3 text-center font-mono-tech text-[9px] font-bold uppercase tracking-widest text-white/60">
                <span className={heroCol === 0 ? 'text-[var(--accent)]' : ''}>RET</span>
                <span className={heroCol === 1 ? 'text-[var(--accent)]' : ''}>CEN</span>
                <span className={heroCol === 2 ? 'text-[var(--accent)]' : ''}>VAN ▸</span>
              </div>

              {/* Tactical Formation Grid (3x3 when party active, compact 3x1 lane when solo) */}
              <div className="grid grid-cols-3 gap-1.5">
                {heroRows.map((r) =>
                  ([0, 1, 2] as const).map((c) => {
                    const occupant = heroGridMap.get(`${r}_${c}`);
                    const isPlayerTile = occupant?.kind === 'player';
                    const isAllyTile = occupant?.kind === 'ally';

                    return (
                      <div
                        key={`h_${r}_${c}`}
                        style={{
                          borderColor: isPlayerTile
                            ? stagePreset.accentColor
                            : isAllyTile
                              ? 'rgba(56,189,248,0.45)'
                              : 'rgba(255,255,255,0.12)',
                          backgroundColor: isPlayerTile
                            ? 'rgba(255,255,255,0.08)'
                            : isAllyTile
                              ? 'rgba(56,189,248,0.08)'
                              : 'rgba(0,0,0,0.28)',
                        }}
                        className={`relative flex items-center justify-center rounded-xl border transition-all ${
                          heroHasAllies
                            ? 'h-[56px] sm:h-[78px]'
                            : 'h-[104px] sm:h-[124px] md:h-[138px]'
                        }`}
                      >
                        {isPlayerTile ? (
                          <div
                            className={`relative flex h-full w-full items-center justify-center ${
                              lungingId === 'player'
                                ? 'z-20 animate-clash-lunge-right'
                                : hitTargetId === 'player'
                                  ? 'animate-clash-hit'
                                  : ''
                            }`}
                          >
                            {/* Pixel Ground Shadow */}
                            <div
                              style={{ backgroundColor: `${stagePreset.accentColor}55` }}
                              className="pointer-events-none absolute bottom-1 h-2.5 w-12 rounded-full blur-[3px]"
                            />

                            {/* Animated HD-2D Pixel Hero Sprite! */}
                            <div
                              className={`relative z-10 ${
                                heroHasAllies
                                  ? 'h-[68px] w-[68px] sm:h-[88px] sm:w-[88px]'
                                  : 'h-[94px] w-[94px] sm:h-[116px] sm:w-[116px]'
                              }`}
                            >
                              <PixelHeroSprite
                                spriteId={heroSpriteId}
                                frame={pixelFrame}
                                isAttacking={lungingId === 'player'}
                                isHit={hitTargetId === 'player'}
                                accentColor={stagePreset.accentColor}
                              />
                            </div>

                            {/* Impact VFX Overlay */}
                            {activeVfx?.targetId === 'player' ? (
                              <ImpactVfxOverlay vfx={activeVfx.vfx} />
                            ) : null}

                            {/* Floating Damage / Heal Pop */}
                            {floatingPop?.targetId === 'player' ? (
                              <div
                                key={floatingPop.id}
                                style={{ color: floatingPop.color }}
                                className="animate-clash-dmg-pop font-display pointer-events-none absolute -top-4 left-1/2 z-40 whitespace-nowrap text-xl font-black drop-shadow-[0_4px_10px_rgba(0,0,0,0.95)] sm:text-2xl"
                              >
                                {floatingPop.text}
                              </div>
                            ) : null}
                          </div>
                        ) : isAllyTile ? (
                          <button
                            type="button"
                            disabled={occupant.ally.downed || isAnimating}
                            onClick={() => {
                              clashAudio.playMenuClick();
                              const idx = DIRECTIVE_ORDER.indexOf(occupant.ally.directive);
                              const nextDir =
                                DIRECTIVE_ORDER[(idx + 1) % DIRECTIVE_ORDER.length];
                              onChangeAllyDirective(occupant.ally.npcId, nextDir);
                            }}
                            title={`${occupant.ally.name} · Clique para alternar ordem (${ALLY_DIRECTIVE_META[occupant.ally.directive].label})`}
                            className={`relative flex h-full w-full flex-col items-center justify-center ${
                              occupant.ally.downed ? 'opacity-35 grayscale' : ''
                            } ${
                              lungingId === occupant.ally.npcId
                                ? 'z-20 animate-clash-lunge-right'
                                : ''
                            }`}
                          >
                            <div className="h-[56px] w-[56px] sm:h-[74px] sm:w-[74px]">
                              <PixelHeroSprite
                                spriteId={resolveAllySpriteId(
                                  occupant.ally,
                                  activeThemeId,
                                )}
                                frame={pixelFrame}
                                isAttacking={lungingId === occupant.ally.npcId}
                                accentColor={stagePreset.accentColor}
                                isAlly
                              />
                            </div>
                            {/* Mini Symphony of War Ally HP & Directive Tag */}
                            <div className="absolute right-1 bottom-0.5 left-1 flex items-center justify-between gap-1 rounded bg-black/80 px-1 py-[1px] text-[8px] font-bold">
                              <span className="truncate text-white">
                                {occupant.ally.name.split(' ')[0]}
                              </span>
                              <span
                                style={{
                                  color:
                                    ALLY_DIRECTIVE_META[occupant.ally.directive].color,
                                }}
                              >
                                {ALLY_DIRECTIVE_META[occupant.ally.directive].short}
                              </span>
                            </div>
                          </button>
                        ) : isDnd && onFreeMove && !clash.movementUsed && !isAnimating && !isEnded && r === 1 ? (
                          <button
                            type="button"
                            onClick={() => {
                              clashAudio.playMenuClick();
                              const destZone: ClashZone = c === 0 ? 'far' : c === 2 ? 'close' : 'mid';
                              onFreeMove(destZone);
                            }}
                            title={`Mover grátis para ${c === 0 ? 'Retaguarda' : c === 2 ? 'Vanguarda' : 'Centro'}`}
                            className="flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-xl text-[9px] font-bold text-white/40 transition hover:bg-white/10 hover:text-[var(--accent)]"
                          >
                            <Footprints className="h-3.5 w-3.5 opacity-70" />
                            <span>Mover</span>
                          </button>
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-white/10" />
                        )}
                      </div>
                    );
                  }),
                )}
              </div>
            </div>

            {/* Hero Squad Compact Status Bar (Zero-Bloat Action Economy Pips + AC + Smart Reaction!) */}
            <div
              style={{ borderColor: stagePreset.hudBorderColor }}
              className="w-full max-w-[370px] rounded-xl border bg-black/80 px-3 py-2 shadow-xl backdrop-blur-md"
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-xs font-bold text-white sm:text-sm">
                    {campaign.player.name}
                  </span>
                  <span
                    style={{
                      backgroundColor: `${stagePreset.accentColor}26`,
                      color: stagePreset.accentColor,
                    }}
                    className="font-mono-tech shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold"
                  >
                    Nv.{campaign.player.level}
                  </span>
                  {heroAcInfo ? (
                    <span
                      title={heroAcInfo.formula}
                      className="font-mono-tech inline-flex shrink-0 items-center gap-0.5 rounded border border-[#38bdf8]/45 bg-[#38bdf8]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#bae6fd]"
                    >
                      <Shield className="h-2.5 w-2.5" />
                      CA {heroAcInfo.ac}
                    </span>
                  ) : null}
                </div>

                {/* BG3-style 14px Action Economy Micro-Pips (0px extra vertical height!) */}
                <div className="flex shrink-0 items-center gap-1">
                  {isDnd ? (
                    <>
                      <span
                        title={clash.actionSurgeActive ? 'Surto de Ação ativo!' : clash.actionUsed ? 'Ação gasta' : 'Ação Principal pronta'}
                        className={`flex h-4 w-4 items-center justify-center rounded text-[9px] font-black ${
                          clash.actionSurgeActive
                            ? 'animate-pulse bg-[#fbbf24] text-black'
                            : !clash.actionUsed
                              ? 'bg-[#ef4444]/85 text-white'
                              : 'bg-white/10 text-white/30'
                        }`}
                      >
                        ●
                      </span>
                      <span
                        title={clash.bonusActionUsed ? 'Ação Bônus gasta' : 'Ação Bônus pronta (não encerra turno)'}
                        className={`flex h-4 w-4 items-center justify-center rounded text-[9px] font-black ${
                          !clash.bonusActionUsed
                            ? 'bg-[#22c55e]/85 text-black'
                            : 'bg-white/10 text-white/30'
                        }`}
                      >
                        ▲
                      </span>
                      <span
                        title={clash.movementUsed ? 'Deslocamento gasto' : 'Deslocamento livre pronto (clique em RET/CEN/VAN)'}
                        className={`flex h-4 w-4 items-center justify-center rounded text-[9px] ${
                          !clash.movementUsed
                            ? 'bg-[#f59e0b]/85 text-black'
                            : 'bg-white/10 text-white/30'
                        }`}
                      >
                        <Footprints className="h-2.5 w-2.5" />
                      </span>
                      {hasShieldReactionOption && onTogglePreArmedReaction ? (
                        <button
                          type="button"
                          onClick={() => {
                            clashAudio.playMenuClick();
                            onTogglePreArmedReaction();
                          }}
                          title="Reação inteligente: dispara Escudo (+5 CA) ou Esquiva Sobrenatural só se bloquear dano!"
                          className={`rounded border px-1.5 py-0.5 text-[9px] font-bold transition ${
                            clash.preArmedReaction && !clash.reactionUsed
                              ? 'border-[#38bdf8] bg-[#38bdf8]/25 text-[#7dd3fc]'
                              : 'border-white/15 bg-white/5 text-white/45'
                          }`}
                        >
                          ◆ {clash.preArmedReaction === 'uncanny_dodge' ? 'Esq.' : 'Esc.'}:
                          {clash.preArmedReaction && !clash.reactionUsed ? 'ON' : 'OFF'}
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {clash.playerShield > 0 ? (
                        <span className="inline-flex items-center gap-0.5 rounded bg-[#38bdf8]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#7dd3fc]">
                          <Shield className="h-2.5 w-2.5" />+{clash.playerShield}
                        </span>
                      ) : null}
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-white/80">
                        {heroZoneLabel(clash.playerZone)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-1.5 grid grid-cols-12 items-center gap-2">
                {/* PV / Composure */}
                <div className="col-span-7">
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="font-bold uppercase tracking-wider text-white/65">
                      {clash.archetype === 'social' ? 'COMPOSTURA' : isDnd ? 'PV' : 'HP'}
                      {dnd && dnd.tempHp > 0 ? (
                        <span className="ml-1 text-[#38bdf8]">+{dnd.tempHp}</span>
                      ) : null}
                    </span>
                    <span className="font-mono-tech font-bold text-white">
                      {heroPrimaryText}
                    </span>
                  </div>
                  <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-white/12">
                    <div
                      style={{ width: `${heroPrimaryPct}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        clash.archetype === 'social'
                          ? 'bg-gradient-to-r from-[#a855f7] to-[#e879f9]'
                          : heroPrimaryPct <= 30
                            ? 'bg-gradient-to-r from-[#ef4444] to-[#f87171]'
                            : 'bg-gradient-to-r from-[#22c55e] to-[#4ade80]'
                      }`}
                    />
                  </div>
                </div>

                {/* Limit Break Gauge */}
                <div className="col-span-5">
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="font-bold uppercase tracking-wider text-[#fbbf24]">
                      LIMIT
                    </span>
                    <span className="font-mono-tech font-bold text-[#fbbf24]">
                      {clash.synergy}%
                    </span>
                  </div>
                  <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-white/12">
                    <div
                      style={{ width: `${Math.min(100, clash.synergy)}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        comboReady
                          ? 'animate-pulse bg-gradient-to-r from-[#fbbf24] via-[#fef08a] to-[#38bdf8]'
                          : 'bg-gradient-to-r from-[#d97706] to-[#fbbf24]'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* RIGHT SQUAD (TOP-RIGHT ON MOBILE): ENEMY 3x3 FORMATION + BOSS  */}
          {/* ============================================================== */}
          <div className="order-1 flex flex-col items-end gap-2 md:order-2 md:w-[50%]">
            <div
              style={{
                borderColor: stagePreset.enemyTileColor,
                boxShadow: `0 18px 42px rgba(0,0,0,0.65), inset 0 0 24px ${stagePreset.enemyTileColor}`,
              }}
              className="relative w-full max-w-[440px] rounded-2xl border bg-black/48 px-2.5 pt-2 pb-2.5 backdrop-blur-[3px]"
            >
              {/* Enemy Column Labels (Mirrored: VAN faces player!) */}
              <div className="mb-5 grid grid-cols-3 text-center font-mono-tech text-[9px] font-bold uppercase tracking-widest text-white/60">
                <span className="text-[#fca5a5]">◂ VAN</span>
                <span>CEN</span>
                <span>RET</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {enemyRows.map((r) =>
                  ([0, 1, 2] as const).map((c) => {
                    const enemy = enemyGridMap.get(`${r}_${c}`);

                    if (!enemy) {
                      return (
                        <div
                          key={`e_${r}_${c}`}
                          className={`flex items-center justify-center rounded-xl border border-white/10 bg-black/25 ${
                            enemyHasMultiRows
                              ? 'h-[74px] sm:h-[92px]'
                              : 'h-[120px] sm:h-[140px] md:h-[138px]'
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-white/10" />
                        </div>
                      );
                    }

                    const dead = enemy.hp <= 0;
                    const isSelected = enemy.id === focusedEnemy?.id && !dead;
                    const hpPct = Math.round(
                      (enemy.hp / Math.max(1, enemy.maxHp)) * 100,
                    );
                    const posPct = Math.round(
                      (enemy.posture / Math.max(1, enemy.maxPosture)) * 100,
                    );
                    const enemySpriteId = resolveEnemySpriteId(
                      enemy,
                      activeThemeId,
                      clash.archetype,
                    );

                    return (
                      <button
                        key={enemy.id}
                        type="button"
                        disabled={dead}
                        onClick={() => {
                          clashAudio.playMenuClick();
                          onSelectTarget(enemy.id);
                        }}
                        style={{
                          borderColor: isSelected
                            ? meta.color
                            : 'rgba(255,255,255,0.16)',
                          backgroundColor: isSelected
                            ? `${meta.color}1e`
                            : 'rgba(0,0,0,0.34)',
                        }}
                        className={`group relative flex flex-col items-center justify-end rounded-xl border px-1.5 pt-5 pb-1.5 transition-all ${
                          enemyHasMultiRows
                            ? 'h-[74px] sm:h-[92px]'
                            : 'h-[120px] sm:h-[140px] md:h-[138px]'
                        } ${
                          dead
                            ? 'opacity-30 grayscale'
                            : isSelected
                              ? 'shadow-[0_0_24px_rgba(248,113,113,0.4)]'
                              : 'hover:bg-white/10'
                        }`}
                      >
                        {/* Compact D&D 5.2 AC Pill (top-right) + max 2 icon-only Condition Pips (top-left) */}
                        {!dead && isDnd && typeof enemy.ac === 'number' ? (
                          <span className="font-mono-tech pointer-events-none absolute top-1 right-1 z-20 rounded bg-black/80 px-1 py-[1px] text-[8px] font-bold text-[#93c5fd]">
                            🛡{enemy.ac}
                          </span>
                        ) : null}
                        {!dead && enemy.conditions && enemy.conditions.length > 0 ? (
                          <div className="pointer-events-none absolute top-1 left-1 z-20 flex items-center gap-0.5">
                            {enemy.conditions.slice(0, 2).map((cid) => (
                              <span
                                key={cid}
                                title={DND_CONDITIONS[cid]?.label}
                                className="flex h-4 w-4 items-center justify-center rounded bg-black/80 text-[9px]"
                              >
                                {DND_CONDITIONS[cid]?.icon ?? '!'}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {/* Dashed Target Lock Ring */}
                        {isSelected ? (
                          <div
                            style={{ borderColor: meta.color }}
                            className="pointer-events-none absolute -inset-[3px] rounded-xl border-2 border-dashed opacity-95"
                          />
                        ) : null}

                        {/* Floating Telegraphed Intent Pill Above Sprite */}
                        {!dead ? (
                          <div
                            className={`absolute -top-3.5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-bold shadow-lg backdrop-blur-md ${
                              enemy.staggered
                                ? 'animate-bounce border-[#fbbf24] bg-[#fbbf24]/25 text-[#fef08a]'
                                : 'border-[#f87171]/70 bg-black/90 text-[#fca5a5]'
                            }`}
                          >
                            {enemy.staggered ? (
                              <>
                                <Zap className="h-2.5 w-2.5" />
                                <span>{meta.staggerLabel}</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="h-2.5 w-2.5 shrink-0 text-[#fbbf24]" />
                                <span className="max-w-[78px] truncate sm:max-w-[105px]">
                                  {enemy.nextIntent.label}
                                </span>
                                <span className="font-mono-tech text-white">
                                  {enemy.nextIntent.damage}
                                </span>
                              </>
                            )}
                          </div>
                        ) : null}

                        {/* Animated HD-2D Pixel Enemy / Boss Sprite! */}
                        <div
                          className={`relative flex items-center justify-center ${
                            enemy.isBoss
                              ? 'h-[82px] w-[82px] sm:h-[108px] sm:w-[108px]'
                              : 'h-[66px] w-[66px] sm:h-[86px] sm:w-[86px]'
                          } ${
                            lungingId === enemy.id
                              ? 'z-20 animate-clash-lunge-left'
                              : hitTargetId === enemy.id
                                ? 'animate-clash-hit'
                                : ''
                          }`}
                        >
                          <div
                            style={{ backgroundColor: `${meta.color}55` }}
                            className="pointer-events-none absolute bottom-0 h-2.5 w-14 rounded-full blur-[3px]"
                          />
                          <PixelEnemySprite
                            spriteId={enemySpriteId}
                            frame={pixelFrame}
                            isAttacking={lungingId === enemy.id}
                            isHit={hitTargetId === enemy.id}
                            accentColor={meta.color}
                          />

                          {/* Impact VFX Overlay */}
                          {activeVfx?.targetId === enemy.id ? (
                            <ImpactVfxOverlay vfx={activeVfx.vfx} />
                          ) : null}

                          {/* Floating Damage Number */}
                          {floatingPop?.targetId === enemy.id ? (
                            <div
                              key={floatingPop.id}
                              style={{ color: floatingPop.color }}
                              className="animate-clash-dmg-pop font-display pointer-events-none absolute -top-5 left-1/2 z-40 whitespace-nowrap text-xl font-black drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)] sm:text-2xl"
                            >
                              {floatingPop.text}
                            </div>
                          ) : null}
                        </div>

                        {/* Crisp Symphony of War Micro Name + HP/Posture Bars on Tile */}
                        <div className="mt-1 w-full rounded-lg bg-black/82 px-1.5 py-1 text-left">
                          <div className="flex items-center justify-between gap-1 text-[9px] font-bold">
                            <span className="flex min-w-0 items-center gap-0.5 truncate text-white">
                              {enemy.isBoss ? (
                                <Crown className="h-2.5 w-2.5 shrink-0 text-[#fbbf24]" />
                              ) : isSelected ? (
                                <Target
                                  className="h-2.5 w-2.5 shrink-0"
                                  style={{ color: meta.color }}
                                />
                              ) : null}
                              <span className="truncate">{enemy.name}</span>
                            </span>
                            <span className="font-mono-tech shrink-0 text-[8px] text-white/75">
                              {enemy.hp}/{enemy.maxHp}
                            </span>
                          </div>
                          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/12">
                            <div
                              style={{
                                width: `${hpPct}%`,
                                backgroundColor: meta.color,
                              }}
                              className="h-full rounded-full transition-all duration-500"
                            />
                          </div>
                          {enemy.maxPosture > 0 ? (
                            <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-white/10">
                              <div
                                style={{ width: `${posPct}%` }}
                                className="h-full rounded-full bg-[#fbbf24] transition-all duration-500"
                              />
                            </div>
                          ) : null}
                        </div>
                      </button>
                    );
                  }),
                )}
              </div>
            </div>

            {/* Enemy Target Intel Bar (Desktop balance & weaknesses; hidden on small mobile to preserve stage vertical room) */}
            {focusedEnemy ? (
              <div
                style={{ borderColor: `${meta.color}55` }}
                className="hidden w-full max-w-[440px] items-center justify-between gap-2 rounded-xl border bg-black/80 px-3 py-2 text-[10px] shadow-xl backdrop-blur-md md:flex"
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 shrink-0" style={{ color: meta.color }} />
                  <span className="truncate font-bold text-white">{focusedEnemy.name}</span>
                  <span className="hidden text-white/50 sm:inline">· {focusedEnemy.role}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {focusedEnemy.weaknesses.slice(0, 2).map((w) => (
                    <span
                      key={w}
                      className="rounded border border-[#fbbf24]/35 bg-[#fbbf24]/12 px-1.5 py-0.5 text-[9px] font-bold text-[#fde047]"
                    >
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* BOTTOM DECK: Fire Emblem Portrait Dialogue + Clean 2x2 Menu        */}
      {/* ================================================================== */}
      <footer
        style={{ borderTopColor: stagePreset.hudBorderColor }}
        className="relative z-20 shrink-0 border-t-2 bg-[#0a0d11]/96 px-3 pt-3 shadow-[0_-16px_50px_rgba(0,0,0,0.88)] backdrop-blur-2xl sm:px-6 sm:pt-3.5"
      >
        <div
          className="mx-auto grid max-w-[1180px] grid-cols-1 gap-3 md:grid-cols-12 md:items-stretch"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          {/* LEFT: Fire Emblem / Symphony of War Framed Portrait + Battle Narration */}
          <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-black/75 p-3 sm:p-3.5 md:col-span-6">
            {/* Framed Speaker Portrait (Real AI Portrait OR Crisp Pixel Bust!) */}
            <div
              style={{
                borderColor:
                  activeSpeakerSide === 'enemy'
                    ? meta.color
                    : stagePreset.accentColor,
              }}
              className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 bg-gradient-to-b from-white/10 to-black/90 shadow-lg sm:h-18 sm:w-18"
            >
              {activeSpeakerSide === 'enemy' ? (
                focusedEnemyPortrait ? (
                  <img
                    src={focusedEnemyPortrait}
                    alt={focusedEnemy?.name ?? 'Inimigo'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full p-1">
                    <PixelBustAvatar
                      enemySpriteId={
                        focusedEnemy
                          ? resolveEnemySpriteId(
                              focusedEnemy,
                              activeThemeId,
                              clash.archetype,
                            )
                          : 'dread_knight'
                      }
                    />
                  </div>
                )
              ) : campaign.player.portraitUrl &&
                !campaign.player.portraitUrl.startsWith('data:image/svg+xml') ? (
                <img
                  src={campaign.player.portraitUrl}
                  alt={campaign.player.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full">
                  <PixelBustAvatar heroSpriteId={heroSpriteId} />
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-between">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span
                  style={{
                    color:
                      activeSpeakerSide === 'enemy'
                        ? '#fca5a5'
                        : stagePreset.accentColor,
                  }}
                  className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em]"
                >
                  <Sparkles className="h-3 w-3" />
                  {isEnded
                    ? isVictory
                      ? 'VITÓRIA NO CONFRONTO'
                      : 'FIM DO CONFRONTO'
                    : isAnimating
                      ? 'AÇÃO EM ANDAMENTO...'
                      : `SEU TURNO · ALVO: ${focusedEnemy?.name ?? '—'}`}
                </span>

                <div className="flex items-center gap-1.5">
                  {lastDiceRoll ? (
                    <span className="font-mono-tech rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-white/85">
                      d20: {lastDiceRoll.roll}
                      {lastDiceRoll.bonus >= 0 ? `+${lastDiceRoll.bonus}` : lastDiceRoll.bonus} ={' '}
                      <strong style={{ color: stagePreset.accentColor }}>
                        {lastDiceRoll.total}
                      </strong>{' '}
                      vs {lastDiceRoll.testKind === 'attack_roll' ? 'CA' : 'CD'} {lastDiceRoll.dc}
                    </span>
                  ) : null}
                  {showArenaInspirationReroll ? (
                    <button
                      type="button"
                      disabled={isAnimating}
                      onClick={() => {
                        clashAudio.playMenuClick();
                        onRerollArenaWithInspiration?.();
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-[#fbbf24]/70 bg-[#fbbf24]/20 px-2 py-0.5 text-[10px] font-bold text-[#fde047] transition hover:bg-[#fbbf24]/30"
                    >
                      ✨ Rerrolar ★
                    </button>
                  ) : null}
                </div>
              </div>

              <p className="font-prose mt-1.5 line-clamp-2 text-xs leading-relaxed text-white sm:line-clamp-none sm:text-sm">
                {activeCaption}
              </p>

              {isCorneredChase && !isEnded ? (
                <button
                  type="button"
                  disabled={isAnimating}
                  onClick={onConvertChaseToCombat}
                  className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#f87171] px-3 py-1.5 text-xs font-bold text-black shadow-lg transition hover:brightness-110"
                >
                  <Swords className="h-4 w-4" />
                  <span>ENCURRALADO! Virar e Lutar (Combate)</span>
                </button>
              ) : null}
            </div>
          </div>

          {/* RIGHT: Classic Clean 2x2 Pokemon / Final Fantasy Command Menu */}
          <div className="flex flex-col justify-center md:col-span-6">
            {isEnded ? (
              <div className="flex h-full flex-col justify-between gap-3 rounded-2xl border border-[var(--accent)]/55 bg-gradient-to-br from-[var(--accent)]/15 to-black/70 p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      isVictory
                        ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                        : 'bg-[#f87171]/20 text-[#f87171]'
                    }`}
                  >
                    {isVictory ? (
                      <Trophy className="h-6 w-6" />
                    ) : (
                      <Skull className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-white sm:text-lg">
                      {clash.status === 'escaped'
                        ? 'Fuga Bem-Sucedida!'
                        : isVictory
                          ? 'Vitória Conquistada!'
                          : 'Linha Rompida'}
                    </h3>
                    <p className="text-xs text-white/70">
                      Concluído em {clash.round} {clash.round === 1 ? 'rodada' : 'rodadas'}. O Mestre IA vai narrar o desfecho completo na sua história.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isResolvingFinal}
                  onClick={onFinishToStory}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-bold text-[var(--accent-contrast)] shadow-lg transition hover:brightness-110 disabled:opacity-60"
                >
                  {isResolvingFinal ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  <span>
                    {isResolvingFinal
                      ? 'Narrando desfecho épico...'
                      : 'Continuar História (Narrar Desfecho) →'}
                  </span>
                </button>
              </div>
            ) : isUnconsciousInArena ? (
              /* Pulsing D&D 5.2 Death Save Deck (only when 0 PV with living allies!) */
              <div className="space-y-2 rounded-2xl border-2 border-[#ef4444]/65 bg-[#450a0a]/60 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-display font-bold uppercase tracking-wider text-[#fca5a5]">
                    💀 INCONSCIENTE (0 PV) · TESTE CONTRA A MORTE
                  </span>
                  <div className="flex items-center gap-2 font-mono-tech text-[10px]">
                    <span className="text-[#4ade80]">
                      ✓ {dnd?.deathSaves.successes ?? 0}/3
                    </span>
                    <span className="text-[#f87171]">
                      ✕ {dnd?.deathSaves.failures ?? 0}/3
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isAnimating}
                    onClick={() =>
                      triggerMove({ kind: 'death_save', label: 'Teste Contra a Morte (CD 10)' }, 'psychic')
                    }
                    className="rounded-xl border border-[#fbbf24]/60 bg-[#fbbf24]/20 px-3 py-2.5 text-xs font-bold text-[#fef08a] transition hover:bg-[#fbbf24]/30"
                  >
                    🎲 Teste Contra a Morte (CD 10)
                  </button>
                  <button
                    type="button"
                    disabled={isAnimating}
                    onClick={() =>
                      triggerMove({ kind: 'stabilize', label: 'Aliado Estabilizar / Curar' }, 'heal')
                    }
                    className="rounded-xl border border-[#4ade80]/60 bg-[#4ade80]/20 px-3 py-2.5 text-xs font-bold text-[#bbf7d0] transition hover:bg-[#4ade80]/30"
                  >
                    💚 Aliado Socorrer (+PV)
                  </button>
                </div>
              </div>
            ) : menu === 'root' ? (
              <div className="space-y-2">
                {comboReady ? (
                  <button
                    type="button"
                    disabled={isAnimating}
                    onClick={() =>
                      triggerMove(
                        {
                          kind: 'combo',
                          targetEnemyId: focusedEnemy?.id,
                          attribute: clash.archetype === 'social' ? 'cha' : 'str',
                          label: `⚡ ${comboLabel} em ${focusedEnemy?.name ?? 'Alvo'}!`,
                        },
                        'limit',
                      )
                    }
                    className="flex w-full animate-pulse items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#fbbf24] via-[#fde047] to-[#38bdf8] py-2 text-xs font-black uppercase tracking-wider text-black shadow-[0_0_25px_rgba(251,191,36,0.5)] transition hover:scale-[1.01] disabled:opacity-50"
                  >
                    <Zap className="h-4 w-4" />
                    <span>⚡ LIMIT BREAK · {comboLabel}</span>
                  </button>
                ) : null}

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={isAnimating}
                    onClick={() => {
                      clashAudio.playMenuClick();
                      setMenu('fight');
                    }}
                    className="group flex items-center gap-3 rounded-2xl border-2 border-[#f87171]/60 bg-gradient-to-br from-[#f87171]/25 to-[#7f1d1d]/30 px-4 py-3 text-left transition hover:scale-[1.02] hover:border-[#f87171] disabled:opacity-45"
                  >
                    <Swords className="h-6 w-6 shrink-0 text-[#fca5a5] transition group-hover:scale-110" />
                    <div>
                      <div className="font-display text-sm font-black tracking-wide text-white">
                        {fightRootLabel}
                      </div>
                      <div className="text-[10px] text-white/70">
                        {isDnd ? 'Arma, Maestria & Esquiva' : '4 Golpes & Postura'}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={isAnimating}
                    onClick={() => {
                      clashAudio.playMenuClick();
                      setSkillsSubTab(hasMagicOrResources ? 'magic' : 'tactics');
                      setMenu('skills');
                    }}
                    className="group flex items-center gap-3 rounded-2xl border-2 border-[#38bdf8]/55 bg-gradient-to-br from-[#38bdf8]/22 to-[#0c4a6e]/30 px-4 py-3 text-left transition hover:scale-[1.02] hover:border-[#38bdf8] disabled:opacity-45"
                  >
                    <Wand2 className="h-6 w-6 shrink-0 text-[#7dd3fc] transition group-hover:scale-110" />
                    <div>
                      <div className="font-display text-sm font-black tracking-wide text-white">
                        {hasMagicOrResources ? vocab.spellSlotsShort.toUpperCase() : 'TÉCNICAS'}
                      </div>
                      <div className="text-[10px] text-white/70">
                        {hasMagicOrResources
                          ? `${totalSlotsLeft > 0 ? `${totalSlotsLeft} espaços · ` : ''}Recursos & Cenário`
                          : 'Cenário · Ação Livre'}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={isAnimating}
                    onClick={() => {
                      clashAudio.playMenuClick();
                      setMenu('bag');
                    }}
                    className="group flex items-center gap-3 rounded-2xl border-2 border-[#4ade80]/50 bg-gradient-to-br from-[#4ade80]/20 to-[#14532d]/30 px-4 py-3 text-left transition hover:scale-[1.02] hover:border-[#4ade80] disabled:opacity-45"
                  >
                    <Backpack className="h-6 w-6 shrink-0 text-[#86efac] transition group-hover:scale-110" />
                    <div>
                      <div className="font-display text-sm font-black tracking-wide text-white">
                        MOCHILA
                      </div>
                      <div className="text-[10px] text-white/70">
                        {carryConsumables.length} itens
                        {clash.allies.length > 0 ? ' · Equipe' : ''}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={isAnimating}
                    onClick={() => {
                      clashAudio.playMenuClick();
                      onRetreat();
                    }}
                    className="group flex items-center gap-3 rounded-2xl border-2 border-white/20 bg-white/8 px-4 py-3 text-left transition hover:scale-[1.02] hover:border-white/45 disabled:opacity-45"
                  >
                    <Footprints className="h-6 w-6 shrink-0 text-white/80 transition group-hover:scale-110" />
                    <div>
                      <div className="font-display text-sm font-black tracking-wide text-white">
                        FUGIR
                      </div>
                      <div className="text-[10px] text-white/65">
                        Recuar para história
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            ) : menu === 'fight' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setMenu('root')}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[var(--accent)] hover:underline"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Voltar</span>
                  </button>
                  <span className="text-[10px] text-white/60">
                    Escolha um golpe contra {focusedEnemy?.name}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {playerMoves.map((move) => (
                    <button
                      key={move.id}
                      type="button"
                      disabled={isAnimating}
                      onClick={() =>
                        triggerMove(
                          {
                            kind: move.maneuverKind,
                            targetEnemyId: focusedEnemy?.id,
                            attribute: move.attribute,
                            useSupplyBoost:
                              move.maneuverKind === 'defend' &&
                              clash.archetype === 'siege',
                            label: `${move.name} (${focusedEnemy?.name ?? 'Alvo'})`,
                          },
                          move.vfx,
                        )
                      }
                      style={{ borderColor: `${move.color}66` }}
                      className="rounded-xl border bg-black/70 px-3 py-2 text-left transition hover:scale-[1.02] hover:bg-white/10 disabled:opacity-45"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-xs font-bold text-white">
                          {move.name}
                        </span>
                        <span
                          style={{ color: move.color }}
                          className="shrink-0 text-[9px] font-bold uppercase"
                        >
                          {move.typeTag.split('·')[0]}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[10px] text-white/65">
                        {move.powerHint}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : menu === 'skills' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setMenu('root')}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[var(--accent)] hover:underline"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Voltar</span>
                  </button>
                  {hasMagicOrResources ? (
                    <div className="flex items-center gap-1 rounded-lg bg-white/8 p-0.5 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setSkillsSubTab('magic')}
                        className={`rounded-md px-2 py-0.5 ${
                          skillsSubTab === 'magic'
                            ? 'bg-[#38bdf8] text-black'
                            : 'text-white/70'
                        }`}
                      >
                        {vocab.spellSlotsShort} & Classe
                      </button>
                      <button
                        type="button"
                        onClick={() => setSkillsSubTab('tactics')}
                        className={`rounded-md px-2 py-0.5 ${
                          skillsSubTab === 'tactics'
                            ? 'bg-[#38bdf8] text-black'
                            : 'text-white/70'
                        }`}
                      >
                        Cenário & Livre
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-white/60">
                      Cenário, Provas & Improviso
                    </span>
                  )}
                </div>

                {hasMagicOrResources && skillsSubTab === 'magic' ? (
                  <div className="grid max-h-[138px] grid-cols-2 gap-1.5 overflow-y-auto pr-0.5">
                    {/* Class Resources (Bonus Actions: Second Wind, Rage, Lay on Hands, Action Surge!) */}
                    {(dnd?.classResources ?? [])
                      .filter((r) => r.current > 0)
                      .map((res) => {
                        const isFreeSurge = res.id === 'action_surge';
                        const disabled = isAnimating || (!isFreeSurge && Boolean(clash.bonusActionUsed));
                        return (
                          <button
                            key={res.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                              clashAudio.playMenuClick();
                              onBonusResource?.(res.id);
                              setMenu('root');
                            }}
                            className="rounded-xl border border-[#4ade80]/55 bg-[#4ade80]/14 px-2.5 py-2 text-left transition hover:bg-[#4ade80]/24 disabled:opacity-40"
                          >
                            <div className="flex items-center justify-between gap-1 text-xs font-bold text-[#bbf7d0]">
                              <span className="truncate">{res.name}</span>
                              <span className="font-mono-tech shrink-0 text-[9px]">
                                {res.current}/{res.max}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[9px] font-bold text-[#4ade80]">
                              {isFreeSurge ? '⚡ AÇÃO EXTRA LIVRE' : '▲ AÇÃO BÔNUS (não encerra turno)'}
                            </p>
                          </button>
                        );
                      })}

                    {/* Unlimited Cantrips (0 slots) */}
                    {heroCantrips.map((sp) => (
                      <button
                        key={sp.id}
                        type="button"
                        disabled={isAnimating}
                        onClick={() => {
                          if (sp.castingTime === 'bonus' && onBonusSpell) {
                            clashAudio.playMenuClick();
                            onBonusSpell(sp.id);
                            setMenu('root');
                          } else {
                            triggerMove(
                              {
                                kind: 'spell',
                                spellId: sp.id,
                                targetEnemyId: focusedEnemy?.id,
                                label: getThemedSpellLabel(sp.id, campaign.world.primaryTheme, useClassicDndNames),
                              },
                              'psychic',
                            );
                          }
                        }}
                        className="rounded-xl border border-[#38bdf8]/45 bg-[#38bdf8]/12 px-2.5 py-2 text-left transition hover:bg-[#38bdf8]/22 disabled:opacity-45"
                      >
                        <div className="flex items-center justify-between gap-1 text-xs font-bold text-[#bae6fd]">
                          <span className="truncate">
                            {getThemedSpellLabel(sp.id, campaign.world.primaryTheme, useClassicDndNames)}
                          </span>
                          <span className="font-mono-tech shrink-0 text-[9px]">∞</span>
                        </div>
                        <p className="mt-0.5 truncate text-[10px] text-white/70">
                          {sp.damageDice ? scaleCantripDice(sp.damageDice, campaign.player.level) : sp.shortLabel}
                        </p>
                      </button>
                    ))}

                    {/* Prepared Leveled Spells */}
                    {heroSpells
                      .filter((sp) => sp.castingTime !== 'reaction')
                      .map((sp) => {
                        const isBonus = sp.castingTime === 'bonus';
                        const hasSlot =
                          (dnd?.spellSlots.pactMax &&
                            (dnd.spellSlots.pactCurrent ?? 0) > 0 &&
                            (dnd.spellSlots.pactSlotLevel ?? 1) >= sp.level) ||
                          Object.entries(dnd?.spellSlots.tiers ?? {}).some(
                            ([lv, t]) => Number(lv) >= sp.level && t.current > 0,
                          );
                        const blocked =
                          isAnimating ||
                          !hasSlot ||
                          Boolean(clash.spellSlotUsedThisTurn) ||
                          (isBonus && Boolean(clash.bonusActionUsed));
                        return (
                          <button
                            key={sp.id}
                            type="button"
                            disabled={blocked}
                            onClick={() => {
                              if (isBonus && onBonusSpell) {
                                clashAudio.playMenuClick();
                                onBonusSpell(sp.id);
                                setMenu('root');
                              } else {
                                triggerMove(
                                  {
                                    kind: 'spell',
                                    spellId: sp.id,
                                    spellSlotLevel: sp.level,
                                    targetEnemyId: focusedEnemy?.id,
                                    label: getThemedSpellLabel(sp.id, campaign.world.primaryTheme, useClassicDndNames),
                                  },
                                  sp.kind === 'heal' ? 'heal' : 'limit',
                                );
                              }
                            }}
                            className="rounded-xl border border-[#c084fc]/55 bg-[#c084fc]/14 px-2.5 py-2 text-left transition hover:bg-[#c084fc]/24 disabled:opacity-35"
                          >
                            <div className="flex items-center justify-between gap-1 text-xs font-bold text-[#f3e8ff]">
                              <span className="truncate">
                                {getThemedSpellLabel(sp.id, campaign.world.primaryTheme, useClassicDndNames)}
                              </span>
                              <span className="font-mono-tech shrink-0 text-[9px] text-[#e879f9]">
                                {sp.level}º
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-[9px] text-white/75">
                              {isBonus ? '▲ BÔNUS · ' : ''}
                              {sp.healDice ?? sp.damageDice ?? sp.shortLabel}
                              {sp.concentration ? ' · Conc.' : ''}
                            </p>
                          </button>
                        );
                      })}
                  </div>
                ) : (
                <div className="grid max-h-[138px] grid-cols-2 gap-2 overflow-y-auto pr-0.5">
                  {clash.terrain
                    .filter((t) => t.usesLeft > 0)
                    .map((feat) => (
                      <button
                        key={feat.id}
                        type="button"
                        disabled={isAnimating}
                        onClick={() =>
                          triggerMove(
                            {
                              kind: 'terrain',
                              terrainId: feat.id,
                              targetEnemyId: focusedEnemy?.id,
                              attribute: feat.attribute,
                              label: `Usar ${feat.name} (${feat.effectLabel})`,
                            },
                            feat.effectKind === 'cover_shield'
                              ? 'shield'
                              : 'heavy',
                          )
                        }
                        className="rounded-xl border border-[#38bdf8]/50 bg-[#38bdf8]/12 px-3 py-2 text-left transition hover:bg-[#38bdf8]/22"
                      >
                        <div className="flex items-center justify-between gap-1 text-xs font-bold text-[#bae6fd]">
                          <span className="inline-flex min-w-0 items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{feat.name}</span>
                          </span>
                          <span className="font-mono-tech text-[9px]">×{feat.usesLeft}</span>
                        </div>
                        <p className="mt-0.5 truncate text-[10px] text-white/70">
                          {feat.effectLabel}
                        </p>
                      </button>
                    ))}

                  {socialArguments.map((arg) => (
                    <button
                      key={arg.id}
                      type="button"
                      disabled={isAnimating}
                      onClick={() =>
                        triggerMove(
                          {
                            kind: 'evidence',
                            evidenceId: arg.id,
                            evidenceLabel: arg.label,
                            targetEnemyId: focusedEnemy?.id,
                            attribute: 'int',
                            label: `Apresentar ${arg.kind}: ${arg.label}`,
                          },
                          'psychic',
                        )
                      }
                      className="rounded-xl border border-[#c084fc]/55 bg-[#c084fc]/15 px-3 py-2 text-left transition hover:bg-[#c084fc]/25"
                    >
                      <div className="truncate text-xs font-bold text-[#e9d5ff]">
                        {arg.kind}: {arg.label}
                      </div>
                      <p className="mt-0.5 text-[10px] text-white/70">
                        Alto impacto na Defesa
                      </p>
                    </button>
                  ))}

                  {campaign.organization && !clash.guildSupportUsed ? (
                    <button
                      type="button"
                      disabled={isAnimating}
                      onClick={() =>
                        triggerMove(
                          {
                            kind: 'guild_support',
                            targetEnemyId: focusedEnemy?.id,
                            attribute: 'cha',
                            label: `Apoio Tático: ${campaign.organization?.name}`,
                          },
                          'limit',
                        )
                      }
                      className="rounded-xl border border-[#fbbf24]/55 bg-[#fbbf24]/15 px-3 py-2 text-left transition hover:bg-[#fbbf24]/25"
                    >
                      <div className="flex items-center gap-1 text-xs font-bold text-[#fde047]">
                        <Crown className="h-3.5 w-3.5" />
                        <span>Apoio da Guilda</span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-white/70">
                        Pressão em área (1×)
                      </p>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setMenu('freeform')}
                    className="rounded-xl border border-[var(--accent)]/60 bg-[var(--accent)]/15 px-3 py-2 text-left transition hover:bg-[var(--accent)]/25"
                  >
                    <div className="flex items-center gap-1 text-xs font-bold text-[var(--accent)]">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Ação Livre</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-white/70">
                      Digite sua própria ideia!
                    </p>
                  </button>
                </div>
                )}
              </div>
            ) : menu === 'freeform' ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setMenu('skills')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[var(--accent)] hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Voltar</span>
                </button>
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={freeformText}
                    onChange={(e) => setFreeformText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFreeformSubmit();
                    }}
                    placeholder="Ex.: Chuto a mesa contra ele e pulo pela janela..."
                    className="flex-1 rounded-xl border border-[var(--accent)]/50 bg-black/75 px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    type="button"
                    disabled={!freeformText.trim() || isAnimating}
                    onClick={handleFreeformSubmit}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-bold text-[var(--accent-contrast)] disabled:opacity-45"
                  >
                    <Send className="h-4 w-4" />
                    <span>Agir</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setMenu('root')}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[var(--accent)] hover:underline"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Voltar</span>
                  </button>
                  <span className="text-[10px] text-white/60">
                    Ação Bônus (não gasta turno) · Equipe
                  </span>
                </div>

                {carryConsumables.length > 0 ? (
                  <div className="grid max-h-[120px] grid-cols-2 gap-2 overflow-y-auto">
                    {carryConsumables.map((item) => {
                      const used = isDnd
                        ? Boolean(clash.bonusActionUsed)
                        : clash.bonusItemUsedRound === clash.round;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={used || isAnimating}
                          onClick={() => handleUseItemInstant(item)}
                          className="flex items-center justify-between rounded-xl border border-[#4ade80]/50 bg-[#4ade80]/12 px-3 py-2 text-left text-xs font-bold text-[#bbf7d0] transition hover:bg-[#4ade80]/22 disabled:opacity-40"
                        >
                          <span className="truncate">
                            {item.name}
                            {isDnd && item.dndStats?.healDice ? ` (${item.dndStats.healDice})` : ''}
                          </span>
                          <span className="font-mono-tech ml-2 text-[10px]">
                            ×{item.quantity}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/55">
                    Nenhum consumível na mochila.
                  </p>
                )}

                {clash.allies.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    {clash.allies
                      .filter((a) => !a.downed)
                      .map((ally) => (
                        <div
                          key={ally.npcId}
                          className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs"
                        >
                          <span className="flex items-center gap-1.5 font-semibold text-white">
                            <Heart className="h-3 w-3 text-[#f87171]" />
                            {ally.name.split(' ')[0]} ({ally.vigor})
                          </span>
                          <div className="flex gap-1">
                            {DIRECTIVE_ORDER.map((dir) => {
                              const dm = ALLY_DIRECTIVE_META[dir];
                              const active = ally.directive === dir;
                              return (
                                <button
                                  key={dir}
                                  type="button"
                                  onClick={() => {
                                    clashAudio.playMenuClick();
                                    onChangeAllyDirective(ally.npcId, dir);
                                  }}
                                  style={
                                    active
                                      ? {
                                          borderColor: dm.color,
                                          backgroundColor: `${dm.color}28`,
                                          color: dm.color,
                                        }
                                      : undefined
                                  }
                                  className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                                    active
                                      ? ''
                                      : 'border-white/15 text-white/55 hover:text-white'
                                  }`}
                                >
                                  {dm.short}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>,
    document.body,
  );
}
