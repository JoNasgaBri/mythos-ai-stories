import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Compass,
  Dices,
  Flag,
  Flame,
  KeyRound,
  Loader2,
  Plus,
  Scale,
  Shield,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import {
  DND_BACKGROUNDS,
  DND_CLASSES,
  STANDARD_ARRAY,
} from '../data/dnd52Catalog';
import {
  DIFFICULTIES,
  RANDOM_PROTAGONISTS,
  STORY_PACE_OPTIONS,
  WORLD_THEMES,
  type ArchetypePreset,
  type FactionSeed,
} from '../data/presets';
import {
  buildDefaultDndStarterGear,
  buildDnd5eSheetFromConfig,
  computeArmorClass,
  computeMaxHpForRuleset,
  getThemedClassLabel,
  getThemedSkillLabel,
  getThemedSpeciesLabel,
  getXpDeltaForRuleset,
  inferDndClassFromLegacy,
  roll4d6AbilityArray,
} from '../engine/dnd52Rules';
import {
  ATTRIBUTE_KEYS,
  computePointBuySpent,
  defaultCurrencyForTheme,
  getPresetAttributesForArchetype,
  inferEquipSlotFromCategory,
  POINT_BUY_BUDGET,
  POINT_BUY_MAX,
  POINT_BUY_MIN,
  syncSkillLevels,
} from '../engine/rpgSystem';
import {
  requestForgeWorld,
  requestPortraitIllustration,
  shouldUseGemini,
  type ApiHealthStatus,
} from '../services/storyApi';
import type {
  AppSettings,
  AttributeId,
  Campaign,
  CharacterAttributes,
  DifficultyId,
  DndBackgroundId,
  DndClassId,
  DndSkillId,
  DndSpeciesId,
  ForgeArchitectMode,
  InventoryItem,
  LanguageId,
  PlayerState,
  ResponseLength,
  StoryPace,
  WeaponMasteryId,
  WorldThemeId,
} from '../types/game';
import { PixelHeroSprite, type HeroSpriteId } from './PixelBattleSprites';
import { WorldForgeDndStep2 } from './WorldForgeDndStep2';

interface ArchetypeDndPreset {
  classId: DndClassId;
  speciesId: DndSpeciesId;
  backgroundId: DndBackgroundId;
  spriteId: HeroSpriteId;
}

const ARCHETYPE_DND_MAP: Record<string, ArchetypeDndPreset> = {
  knight: { classId: 'fighter', speciesId: 'human', backgroundId: 'soldier', spriteId: 'knight' },
  witch: { classId: 'warlock', speciesId: 'tiefling', backgroundId: 'sage', spriteId: 'mage' },
  rogue: { classId: 'rogue', speciesId: 'elf', backgroundId: 'criminal', spriteId: 'rogue' },
  ranger: { classId: 'ranger', speciesId: 'elf', backgroundId: 'wayfarer', spriteId: 'ranger' },
  cyborg: { classId: 'fighter', speciesId: 'goliath', backgroundId: 'soldier', spriteId: 'cyber_ronin' },
  punk: { classId: 'wizard', speciesId: 'human', backgroundId: 'operative', spriteId: 'netrunner' },
  cop: { classId: 'paladin', speciesId: 'human', backgroundId: 'operative', spriteId: 'detective' },
  android: { classId: 'monk', speciesId: 'gnome', backgroundId: 'sage', spriteId: 'netrunner' },
  detective: { classId: 'rogue', speciesId: 'human', backgroundId: 'operative', spriteId: 'detective' },
  spy: { classId: 'bard', speciesId: 'elf', backgroundId: 'criminal', spriteId: 'rogue' },
  doctor: { classId: 'cleric', speciesId: 'human', backgroundId: 'medic', spriteId: 'detective' },
  socialite: { classId: 'bard', speciesId: 'human', backgroundId: 'noble_envoy', spriteId: 'detective' },
  survivor: { classId: 'ranger', speciesId: 'human', backgroundId: 'scavenger', spriteId: 'survivor' },
  medic: { classId: 'cleric', speciesId: 'human', backgroundId: 'medic', spriteId: 'survivor' },
  scavenger: { classId: 'rogue', speciesId: 'halfling', backgroundId: 'scavenger', spriteId: 'rogue' },
  soldier: { classId: 'fighter', speciesId: 'human', backgroundId: 'soldier', spriteId: 'survivor' },
  nomad: { classId: 'ranger', speciesId: 'orc', backgroundId: 'wayfarer', spriteId: 'survivor' },
  engineer: { classId: 'wizard', speciesId: 'dwarf', backgroundId: 'artisan', spriteId: 'survivor' },
  raider: { classId: 'barbarian', speciesId: 'orc', backgroundId: 'soldier', spriteId: 'survivor' },
  oracle: { classId: 'sorcerer', speciesId: 'tiefling', backgroundId: 'acolyte', spriteId: 'mage' },
};

function resolveArchetypeDnd(archId: string, theme: WorldThemeId): ArchetypeDndPreset {
  if (ARCHETYPE_DND_MAP[archId]) return ARCHETYPE_DND_MAP[archId];
  const fallbackSprite: HeroSpriteId =
    theme === 'cyberpunk'
      ? 'cyber_ronin'
      : theme === 'mystery'
        ? 'detective'
        : theme === 'zombies' || theme === 'apocalyptic'
          ? 'survivor'
          : 'knight';
  return {
    classId: 'fighter',
    speciesId: 'human',
    backgroundId: theme === 'cyberpunk' ? 'operative' : theme === 'mystery' ? 'operative' : 'soldier',
    spriteId: fallbackSprite,
  };
}

function getSpriteForDndClass(classId: DndClassId, theme: WorldThemeId): HeroSpriteId {
  if (theme === 'cyberpunk') {
    return classId === 'wizard' || classId === 'sorcerer' || classId === 'warlock' || classId === 'cleric'
      ? 'netrunner'
      : 'cyber_ronin';
  }
  if (theme === 'mystery') {
    return classId === 'wizard' || classId === 'sorcerer' || classId === 'warlock'
      ? 'mage'
      : 'detective';
  }
  if (theme === 'zombies' || theme === 'apocalyptic') {
    if (classId === 'rogue') return 'rogue';
    if (classId === 'barbarian') return 'barbarian';
    return 'survivor';
  }
  if (classId === 'barbarian') return 'barbarian';
  if (classId === 'paladin') return 'paladin';
  if (classId === 'cleric') return 'cleric';
  if (classId === 'bard') return 'bard';
  if (classId === 'rogue' || classId === 'monk') return 'rogue';
  if (classId === 'ranger' || classId === 'druid') return 'ranger';
  if (classId === 'wizard' || classId === 'sorcerer' || classId === 'warlock') return 'mage';
  return 'knight';
}

const ARCHITECT_SPARKS: Record<
  LanguageId,
  Array<{ label: string; prompt: string }>
> = {
  'pt-BR': [
    {
      label: 'Amazônia Cyberpunk 2099',
      prompt:
        'Uma Amazônia cyberpunk em 2099 onde megacorporações mineram seiva genética bioluminescente sob tempestades elétricas constantes e xamãs hackers protegem memórias ancestrais na rede.',
    },
    {
      label: 'Noir em Trem Sem Fim',
      prompt:
        'Um mistério noir nos anos 1920 a bordo de um trem transcontinental blindado que nunca para durante uma nevasca eterna; cada vagão esconde uma sociedade secreta e um assassinato sem testemunhas.',
    },
    {
      label: 'Reino Sem Sol',
      prompt:
        'Fantasia sombria em um império onde o sol se apagou há três séculos e cidades sobrevivem ao redor de forjas alimentadas por relíquias vivas que cobram memórias como tributo.',
    },
  ],
  en: [
    {
      label: 'Cyberpunk Amazon 2099',
      prompt:
        'A 2099 cyberpunk Amazon where megacorporations harvest bioluminescent genetic sap under endless electric storms while shaman hackers guard ancestral memories inside the net.',
    },
    {
      label: 'Noir on an Endless Train',
      prompt:
        'A 1920s noir mystery aboard an armored transcontinental train that never stops through a perpetual blizzard; every carriage hides a secret syndicate and an impossible murder.',
    },
    {
      label: 'Sunless Kingdom',
      prompt:
        'Dark fantasy in an empire where the sun went out three centuries ago and walled cities survive around living relic-forges that feed on human memories.',
    },
  ],
  fr: [
    {
      label: 'Amazonie Cyberpunk 2099',
      prompt:
        'Une Amazonie cyberpunk en 2099 où des mégacorporations récoltent une sève génétique bioluminescente sous des orages perpétuels face à des chamans hackers.',
    },
    {
      label: 'Noir en Train Sans Fin',
      prompt:
        'Un polar noir des années 1920 à bord d’un train blindé transcontinental qui ne s’arrête jamais au cœur d’un blizzard éternel.',
    },
    {
      label: 'Royaume Sans Soleil',
      prompt:
        'Dark fantasy dans un empire sans soleil depuis trois siècles où les cités survivent autour de forges-reliques exigeant des souvenirs en tribut.',
    },
  ],
};

interface WorldForgeProps {
  settings: AppSettings;
  apiHealth: ApiHealthStatus;
  isSubmitting: boolean;
  onPreviewThemeChange: (theme: WorldThemeId) => void;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onOpenAiSettings?: () => void;
  onNotify?: (kind: 'info' | 'error' | 'memory', message: string) => void;
  onCancel: () => void;
  onCreateCampaign: (campaign: Campaign) => void;
}

export function WorldForge({
  settings,
  apiHealth,
  isSubmitting,
  onPreviewThemeChange,
  onUpdateSettings,
  onOpenAiSettings,
  onNotify,
  onCancel,
  onCreateCampaign,
}: WorldForgeProps) {
  const lang = settings.language;
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Arquiteto IA — Prompt & Ideia do Usuário
  const [inspirationInput, setInspirationInput] = useState('');
  const [creativePrompt, setCreativePrompt] = useState('');
  const [characterIdeaInput, setCharacterIdeaInput] = useState('');
  const [isForgingWithAi, setIsForgingWithAi] = useState(false);
  const [activeForgeAction, setActiveForgeAction] =
    useState<ForgeArchitectMode | null>(null);
  const [aiForgeError, setAiForgeError] = useState<string | null>(null);
  const [lastForgeResult, setLastForgeResult] = useState<{
    engine: 'gemini' | 'demo';
    mode: ForgeArchitectMode;
  } | null>(null);

  // Step 1 — World state & Lore
  const [primaryTheme, setPrimaryTheme] = useState<WorldThemeId>('fantasy');
  const [extraGenres, setExtraGenres] = useState<string[]>([]);
  const [customGenreInput, setCustomGenreInput] = useState('');
  const [tone, setTone] = useState(WORLD_THEMES.fantasy.defaultTone[lang]);
  const [worldTitle, setWorldTitle] = useState(WORLD_THEMES.fantasy.sparks[lang][0].title);
  const [premise, setPremise] = useState(WORLD_THEMES.fantasy.sparks[lang][0].premise);
  const [era, setEra] = useState(WORLD_THEMES.fantasy.lore[lang].era);
  const [history, setHistory] = useState(WORLD_THEMES.fantasy.lore[lang].history);
  const [worldLaws, setWorldLaws] = useState(WORLD_THEMES.fantasy.lore[lang].worldLaws);
  const [factions, setFactions] = useState<FactionSeed[]>(
    WORLD_THEMES.fantasy.lore[lang].factions.map((f) => ({ ...f })),
  );
  const [newFactionName, setNewFactionName] = useState('');
  const [newFactionDesc, setNewFactionDesc] = useState('');
  const [matureMode, setMatureMode] = useState(true);

  // Step 2 — Protagonist & D&D 5.2 (2024) state
  const initialArch = WORLD_THEMES.fantasy.archetypes[0];
  const initialDndPreset = resolveArchetypeDnd(initialArch.id, 'fantasy');
  const [forgeMode, setForgeMode] = useState<'quick' | 'custom'>('quick');
  const [customSubTab, setCustomSubTab] = useState<'class' | 'stats' | 'skills' | 'magic'>('class');
  const [selectedArchetypeId, setSelectedArchetypeId] = useState(initialArch.id);
  const [dndClassId, setDndClassId] = useState<DndClassId>(initialDndPreset.classId);
  const [dndSpeciesId, setDndSpeciesId] = useState<DndSpeciesId>(initialDndPreset.speciesId);
  const [dndBackgroundId, setDndBackgroundId] = useState<DndBackgroundId>(initialDndPreset.backgroundId);
  const [statMethod, setStatMethod] = useState<'standard' | 'pointbuy' | 'roll4d6'>('pointbuy');
  const [bgPlusTwo, setBgPlusTwo] = useState<AttributeId>(
    DND_BACKGROUNDS[initialDndPreset.backgroundId].abilityOptions[0] ?? 'str',
  );
  const [bgPlusOne, setBgPlusOne] = useState<AttributeId>(
    DND_BACKGROUNDS[initialDndPreset.backgroundId].abilityOptions[1] ?? 'con',
  );
  const [chosenClassSkills, setChosenClassSkills] = useState<DndSkillId[]>(
    () => [...DND_CLASSES[initialDndPreset.classId].defaultSkills],
  );
  const [chosenExpertise, setChosenExpertise] = useState<DndSkillId[]>([]);
  const [chosenCantrips, setChosenCantrips] = useState<string[]>(
    () => [...DND_CLASSES[initialDndPreset.classId].defaultCantrips],
  );
  const [chosenSpells, setChosenSpells] = useState<string[]>(
    () => [...DND_CLASSES[initialDndPreset.classId].defaultSpells],
  );
  const [chosenFightingStyle, setChosenFightingStyle] = useState<string>('style_dueling');
  const [chosenMasteries, setChosenMasteries] = useState<WeaponMasteryId[]>(['sap', 'push', 'topple']);
  const [playerName, setPlayerName] = useState('Theron Vale');
  const [playerAge, setPlayerAge] = useState(29);
  const [occupation, setOccupation] = useState(initialArch.label[lang]);
  const [traits, setTraits] = useState<string[]>(initialArch.traits[lang]);
  const [, setSkills] = useState<string[]>(initialArch.skills[lang]);
  const [attributes, setAttributes] = useState<CharacterAttributes>(() =>
    getPresetAttributesForArchetype(initialArch.id, 'fantasy'),
  );
  const [startingCurrency, setStartingCurrency] = useState<{
    amount: number;
    label: string;
  } | null>(null);
  const [starterItem, setStarterItem] = useState<InventoryItem>({
    id: 'starter_1',
    name: initialArch.starterItem.name[lang],
    category: initialArch.starterItem.category,
    quantity: 1,
    note: initialArch.starterItem.note[lang],
    rarity: 'uncommon',
    equipSlot: inferEquipSlotFromCategory(initialArch.starterItem.category),
    equipped: initialArch.starterItem.category === 'weapon',
  });
  const [customTrait, setCustomTrait] = useState('');
  const [portraitUrl, setPortraitUrl] = useState<string | undefined>(undefined);
  const [portraitEngine, setPortraitEngine] = useState<'gemini' | 'demo' | undefined>(undefined);
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false);

  const handleGeneratePreviewPortrait = async () => {
    if (isGeneratingPortrait) return;
    setIsGeneratingPortrait(true);
    try {
      const res = await requestPortraitIllustration(
        {
          title: worldTitle.trim() || themePreset.name[language],
          primaryTheme,
          era,
          creativePrompt:
            creativePrompt.trim() || inspirationInput.trim() || undefined,
        },
        {
          name: playerName.trim() || 'Viajante',
          occupation: occupation.trim() || themePreset.archetypes[0].label[language],
          traits,
        },
        settings,
        apiHealth,
      );
      setPortraitUrl(res.dataUrl);
      setPortraitEngine(res.engineUsed);
    } finally {
      setIsGeneratingPortrait(false);
    }
  };

  // Step 3 — Rules
  const [difficulty, setDifficulty] = useState<DifficultyId>(settings.difficulty);
  const [storyPace, setStoryPace] = useState<StoryPace>('epic');
  const [language, setLanguage] = useState<LanguageId>(settings.language);
  const [responseLength, setResponseLength] = useState<ResponseLength>(settings.responseLength);
  const [livingWorld, setLivingWorld] = useState(settings.livingWorldEnabled);

  const themePreset = WORLD_THEMES[primaryTheme];
  const geminiConnected = shouldUseGemini(settings, apiHealth);
  const useClassicDnd = Boolean(settings.useClassicDndNames);

  const pointsSpent = computePointBuySpent(attributes);
  const pointsRemaining = POINT_BUY_BUDGET - pointsSpent;

  const selectedDndClass = DND_CLASSES[dndClassId];
  const selectedDndBg = DND_BACKGROUNDS[dndBackgroundId];

  // Final Level 1 attributes including 2024 Background +2 / +1 bonuses
  const finalAttributes: CharacterAttributes = ATTRIBUTE_KEYS.reduce((acc, k) => {
    const bonus = (k === bgPlusTwo ? 2 : 0) + (k === bgPlusOne ? 1 : 0);
    acc[k] = Math.min(18, Math.max(8, (attributes[k] ?? 10) + bonus));
    return acc;
  }, {} as CharacterAttributes);

  const previewDnd = buildDnd5eSheetFromConfig({
    classId: dndClassId,
    speciesId: dndSpeciesId,
    backgroundId: dndBackgroundId,
    level: 1,
    attributes: finalAttributes,
    chosenSkills: chosenClassSkills,
    chosenExpertise: chosenExpertise.length > 0 ? chosenExpertise : undefined,
    chosenCantrips: chosenCantrips.length > 0 ? chosenCantrips : undefined,
    chosenSpells: chosenSpells.length > 0 ? chosenSpells : undefined,
    fightingStyleId: dndClassId === 'fighter' ? chosenFightingStyle : undefined,
  });
  if (selectedDndClass.weaponMasteryCount > 0 && chosenMasteries.length > 0) {
    previewDnd.weaponMasteries = chosenMasteries.slice(0, selectedDndClass.weaponMasteryCount);
  }
  const previewGear = buildDefaultDndStarterGear(dndClassId, primaryTheme, useClassicDnd);
  const previewPlayerStub = {
    level: 1,
    attributes: finalAttributes,
    inventory: previewGear,
    dnd: previewDnd,
  } as PlayerState;
  const previewMaxHp = computeMaxHpForRuleset('dnd5e_2024', previewPlayerStub);
  const previewAc = computeArmorClass(previewPlayerStub).ac;
  const previewSpriteId: HeroSpriteId =
    forgeMode === 'quick'
      ? resolveArchetypeDnd(selectedArchetypeId, primaryTheme).spriteId
      : getSpriteForDndClass(dndClassId, primaryTheme);

  const selectDndClass = (nextClassId: DndClassId) => {
    const cls = DND_CLASSES[nextClassId];
    setDndClassId(nextClassId);
    setChosenClassSkills([...cls.defaultSkills]);
    setChosenExpertise([]);
    setChosenCantrips([...cls.defaultCantrips]);
    setChosenSpells([...cls.defaultSpells]);
    setChosenMasteries(
      cls.weaponMasteryCount <= 0
        ? []
        : nextClassId === 'fighter'
          ? ['sap', 'push', 'topple']
          : nextClassId === 'barbarian'
            ? ['cleave', 'graze']
            : nextClassId === 'rogue'
              ? ['vex', 'nick']
              : nextClassId === 'ranger'
                ? ['slow', 'vex']
                : ['sap', 'topple'],
    );
    setOccupation(getThemedClassLabel(nextClassId, primaryTheme, useClassicDnd));
    // Auto-place Standard Array or Point Buy aligned to class primary stats
    if (statMethod === 'standard') {
      const order: AttributeId[] = [
        ...cls.primaryAbilities,
        ...(['con', 'dex', 'wis', 'cha', 'int', 'str'] as AttributeId[]).filter(
          (k) => !cls.primaryAbilities.includes(k),
        ),
      ];
      const nextAttrs = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
      order.slice(0, 6).forEach((k, idx) => {
        nextAttrs[k] = STANDARD_ARRAY[idx] ?? 10;
      });
      setAttributes(nextAttrs);
    }
  };

  const selectDndBackground = (nextBgId: DndBackgroundId) => {
    const bg = DND_BACKGROUNDS[nextBgId];
    setDndBackgroundId(nextBgId);
    setBgPlusTwo(bg.abilityOptions[0] ?? 'str');
    setBgPlusOne(bg.abilityOptions[1] ?? 'con');
  };

  const applyStatMethod = (method: 'standard' | 'pointbuy' | 'roll4d6') => {
    setStatMethod(method);
    const cls = DND_CLASSES[dndClassId];
    const order: AttributeId[] = [
      ...cls.primaryAbilities,
      ...(['con', 'dex', 'wis', 'cha', 'int', 'str'] as AttributeId[]).filter(
        (k) => !cls.primaryAbilities.includes(k),
      ),
    ];
    if (method === 'standard') {
      const nextAttrs = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
      order.slice(0, 6).forEach((k, idx) => {
        nextAttrs[k] = STANDARD_ARRAY[idx] ?? 10;
      });
      setAttributes(nextAttrs);
    } else if (method === 'roll4d6') {
      const rolled = roll4d6AbilityArray();
      const nextAttrs = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
      order.slice(0, 6).forEach((k, idx) => {
        nextAttrs[k] = rolled[idx] ?? 10;
      });
      setAttributes(nextAttrs);
    } else {
      setAttributes(getPresetAttributesForArchetype(selectedArchetypeId, primaryTheme));
    }
  };

  const adjustAttribute = (key: AttributeId, delta: 1 | -1) => {
    setAttributes((prev) => {
      const nextVal = prev[key] + delta;
      if (nextVal < POINT_BUY_MIN || nextVal > POINT_BUY_MAX) return prev;
      const candidate = { ...prev, [key]: nextVal };
      if (statMethod === 'pointbuy' && delta > 0 && computePointBuySpent(candidate) > POINT_BUY_BUDGET) {
        return prev;
      }
      return candidate;
    });
  };

  const applyForgedProtagonist = (
    protag: NonNullable<Awaited<ReturnType<typeof requestForgeWorld>>['protagonist']>,
  ) => {
    setSelectedArchetypeId('custom_ai');
    setPlayerName(protag.name);
    setPlayerAge(protag.age);
    setOccupation(protag.occupation);
    setTraits(protag.traits);
    setSkills(protag.skills);
    const forgedAttrs: CharacterAttributes = protag.attributes
      ? {
          str: Math.max(8, Math.min(15, Math.round(protag.attributes.str ?? 10))),
          dex: Math.max(8, Math.min(15, Math.round(protag.attributes.dex ?? 10))),
          con: Math.max(8, Math.min(15, Math.round(protag.attributes.con ?? 10))),
          int: Math.max(8, Math.min(15, Math.round(protag.attributes.int ?? 10))),
          wis: Math.max(8, Math.min(15, Math.round(protag.attributes.wis ?? 10))),
          cha: Math.max(8, Math.min(15, Math.round(protag.attributes.cha ?? 10))),
        }
      : attributes;
    if (protag.attributes) {
      setAttributes(forgedAttrs);
    }
    const inferredCls = inferDndClassFromLegacy(protag.occupation, forgedAttrs, []);
    setDndClassId(inferredCls);
    setChosenClassSkills([...DND_CLASSES[inferredCls].defaultSkills]);
    setChosenCantrips([...DND_CLASSES[inferredCls].defaultCantrips]);
    setChosenSpells([...DND_CLASSES[inferredCls].defaultSpells]);
    if (protag.startingCurrency) {
      setStartingCurrency(protag.startingCurrency);
    }
    setStarterItem({
      id: `starter_ai_${Date.now()}`,
      name: protag.starterItem.name,
      category: protag.starterItem.category,
      quantity: 1,
      note: protag.starterItem.note,
      rarity: 'uncommon',
      equipSlot: inferEquipSlotFromCategory(protag.starterItem.category),
      equipped: protag.starterItem.category === 'weapon',
    });
    setPortraitUrl(undefined);
    setPortraitEngine(undefined);
  };

  const runAiArchitect = async (mode: ForgeArchitectMode) => {
    if (isForgingWithAi) return;
    const promptForMode =
      mode === 'protagonist_only'
        ? characterIdeaInput.trim() || inspirationInput.trim()
        : inspirationInput.trim();

    if (mode === 'full_world' && promptForMode.length < 3) {
      setAiForgeError(
        'Escreva uma ideia ou frase de inspiração acima (ou clique em "Me Surpreenda").',
      );
      return;
    }

    setIsForgingWithAi(true);
    setActiveForgeAction(mode);
    setAiForgeError(null);

    try {
      const res = await requestForgeWorld(
        {
          inspirationPrompt: promptForMode,
          mode,
          language,
          preferredTheme: primaryTheme,
          existingWorld: {
            title: worldTitle,
            primaryTheme,
            genres: [themePreset.name[language], ...extraGenres],
            tone,
            era,
            premise,
            history,
            worldLaws,
            creativePrompt,
          },
          matureMode,
        },
        settings,
        apiHealth,
      );

      if (mode === 'full_world' || mode === 'surprise_me') {
        setPrimaryTheme(res.primaryTheme);
        onPreviewThemeChange(res.primaryTheme);
        setExtraGenres(res.extraGenres);
        setTone(res.tone);
        setWorldTitle(res.title);
        setEra(res.era);
        setPremise(res.premise);
        setHistory(res.history);
        setWorldLaws(res.worldLaws);
        setCreativePrompt(res.creativePrompt);
        if (res.factions.length > 0) {
          setFactions(res.factions.map((f) => ({ ...f })));
        }
        if (res.protagonist) {
          applyForgedProtagonist(res.protagonist);
        }
      } else if (mode === 'refine_lore') {
        if (res.title) setWorldTitle(res.title);
        if (res.era) setEra(res.era);
        if (res.premise) setPremise(res.premise);
        if (res.history) setHistory(res.history);
        if (res.worldLaws) setWorldLaws(res.worldLaws);
        if (res.creativePrompt) setCreativePrompt(res.creativePrompt);
        if (res.factions.length > 0) {
          setFactions(res.factions.map((f) => ({ ...f })));
        }
      } else if (mode === 'protagonist_only' && res.protagonist) {
        applyForgedProtagonist(res.protagonist);
      }

      setLastForgeResult({ engine: res.engineUsed, mode });
      const engineLabel =
        res.engineUsed === 'gemini' ? 'Gemini IA' : 'Modo Demo';
      onNotify?.(
        'memory',
        mode === 'protagonist_only'
          ? `Protagonista gerado via ${engineLabel}.`
          : `Universo & Direção Criativa esculpidos via ${engineLabel}.`,
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível gerar com a IA agora.';
      setAiForgeError(msg);
      onNotify?.('error', msg);
    } finally {
      setIsForgingWithAi(false);
      setActiveForgeAction(null);
    }
  };

  const selectPrimaryTheme = (nextTheme: WorldThemeId) => {
    setPrimaryTheme(nextTheme);
    onPreviewThemeChange(nextTheme);
    const nextPreset = WORLD_THEMES[nextTheme];
    const nextLore = nextPreset.lore[language];
    setTone(nextPreset.defaultTone[language]);
    setWorldTitle(nextPreset.sparks[language][0].title);
    setPremise(nextPreset.sparks[language][0].premise);
    setEra(nextLore.era);
    setHistory(nextLore.history);
    setWorldLaws(nextLore.worldLaws);
    setFactions(nextLore.factions.map((f) => ({ ...f })));
    applyArchetype(nextPreset.archetypes[0], nextTheme);
  };

  const addFaction = () => {
    const name = newFactionName.trim();
    if (!name) return;
    setFactions((prev) => [
      ...prev,
      {
        name,
        description: newFactionDesc.trim() || 'Força influente em disputa neste mundo.',
        standing: 'neutral',
        influence: 'Regional',
      },
    ]);
    setNewFactionName('');
    setNewFactionDesc('');
  };

  const applyArchetype = (arch: ArchetypePreset, themeOverride?: WorldThemeId) => {
    const activeTheme = themeOverride ?? primaryTheme;
    const mapped = resolveArchetypeDnd(arch.id, activeTheme);
    const cls = DND_CLASSES[mapped.classId];
    const bg = DND_BACKGROUNDS[mapped.backgroundId];

    setSelectedArchetypeId(arch.id);
    setDndClassId(mapped.classId);
    setDndSpeciesId(mapped.speciesId);
    setDndBackgroundId(mapped.backgroundId);
    setBgPlusTwo(bg.abilityOptions[0] ?? 'str');
    setBgPlusOne(bg.abilityOptions[1] ?? 'con');
    setChosenClassSkills([...cls.defaultSkills]);
    setChosenExpertise([]);
    setChosenCantrips([...cls.defaultCantrips]);
    setChosenSpells([...cls.defaultSpells]);
    setChosenMasteries(
      cls.weaponMasteryCount <= 0
        ? []
        : mapped.classId === 'fighter'
          ? ['sap', 'push', 'topple']
          : mapped.classId === 'barbarian'
            ? ['cleave', 'graze']
            : mapped.classId === 'rogue'
              ? ['vex', 'nick']
              : mapped.classId === 'ranger'
                ? ['slow', 'vex']
                : ['sap', 'topple'],
    );
    setOccupation(arch.label[language]);
    setTraits([...arch.traits[language]]);
    setSkills([...arch.skills[language]]);
    setAttributes(getPresetAttributesForArchetype(arch.id, activeTheme));
    setStarterItem({
      id: `starter_${arch.id}`,
      name: arch.starterItem.name[language],
      category: arch.starterItem.category,
      quantity: 1,
      note: arch.starterItem.note[language],
      rarity: 'uncommon',
      equipSlot: inferEquipSlotFromCategory(arch.starterItem.category),
      equipped: arch.starterItem.category === 'weapon',
    });
    const randomPool = RANDOM_PROTAGONISTS[activeTheme];
    if (!playerName.trim()) {
      setPlayerName(randomPool[0].name);
    }
  };

  const toggleHybridGenre = (themeId: WorldThemeId) => {
    const label = WORLD_THEMES[themeId].name[language];
    if (themeId === primaryTheme) return;
    setExtraGenres((prev) =>
      prev.includes(label)
        ? prev.filter((g) => g !== label)
        : prev.length < 2
          ? [...prev, label]
          : prev,
    );
  };

  const addCustomGenre = () => {
    const val = customGenreInput.trim();
    if (!val || extraGenres.includes(val) || extraGenres.length >= 2) return;
    setExtraGenres((prev) => [...prev, val]);
    setCustomGenreInput('');
  };

  const randomizeSpark = () => {
    const sparks = themePreset.sparks[language];
    const currentIdx = sparks.findIndex((s) => s.title === worldTitle);
    const next = sparks[(currentIdx + 1) % sparks.length];
    setWorldTitle(next.title);
    setPremise(next.premise);
  };

  const randomizeCharacter = () => {
    const pool = RANDOM_PROTAGONISTS[primaryTheme];
    const nextChar = pool[Math.floor(Math.random() * pool.length)];
    const arch =
      themePreset.archetypes[Math.floor(Math.random() * themePreset.archetypes.length)];
    applyArchetype(arch);
    setPlayerName(nextChar.name);
    setPlayerAge(nextChar.age);
    if (!arch.traits[language].includes(nextChar.trait)) {
      setTraits([...arch.traits[language], nextChar.trait]);
    }
  };

  const handleForgeSubmit = () => {
    const now = Date.now();
    const allGenres = [themePreset.name[language], ...extraGenres];

    onUpdateSettings({
      difficulty,
      language,
      responseLength,
      livingWorldEnabled: livingWorld,
    });

    const finalDnd = buildDnd5eSheetFromConfig({
      classId: dndClassId,
      speciesId: dndSpeciesId,
      backgroundId: dndBackgroundId,
      level: 1,
      attributes: finalAttributes,
      chosenSkills: chosenClassSkills,
      chosenExpertise: chosenExpertise.length > 0 ? chosenExpertise : undefined,
      chosenCantrips: chosenCantrips.length > 0 ? chosenCantrips : undefined,
      chosenSpells: chosenSpells.length > 0 ? chosenSpells : undefined,
      fightingStyleId: dndClassId === 'fighter' ? chosenFightingStyle : undefined,
    });
    if (selectedDndClass.weaponMasteryCount > 0 && chosenMasteries.length > 0) {
      finalDnd.weaponMasteries = chosenMasteries.slice(0, selectedDndClass.weaponMasteryCount);
    }

    const baseGear = buildDefaultDndStarterGear(dndClassId, primaryTheme, useClassicDnd);
    // Merge starterItem cleanly without duplicating the primary equipped weapon
    const finalInventory: InventoryItem[] = [];
    if (starterItem.category === 'weapon') {
      const classWeapon = baseGear.find((g) => g.category === 'weapon');
      finalInventory.push({
        ...starterItem,
        equipped: true,
        equipSlot: 'weapon',
        storage: 'carry',
        dndStats: starterItem.dndStats ?? classWeapon?.dndStats ?? { ...selectedDndClass.defaultWeapon.stats },
      });
      for (const item of baseGear) {
        if (item.category !== 'weapon') finalInventory.push(item);
      }
    } else {
      finalInventory.push(...baseGear);
      const alreadyHas = baseGear.some(
        (g) => g.name.toLowerCase() === starterItem.name.toLowerCase(),
      );
      if (!alreadyHas) {
        finalInventory.push({
          ...starterItem,
          storage: 'carry',
          dndStats:
            starterItem.dndStats ??
            (starterItem.category === 'consumable' ? { healDice: '2d4+2' } : undefined),
        });
      }
    }

    const finalMaxHp = computeMaxHpForRuleset('dnd5e_2024', {
      level: 1,
      attributes: finalAttributes,
      inventory: finalInventory,
      dnd: finalDnd,
    });
    const finalSkillLabels = finalDnd.skillProficiencies.map((skId) =>
      getThemedSkillLabel(skId, primaryTheme, useClassicDnd),
    );

    const campaign: Campaign = {
      id: `camp_${now}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now,
      updatedAt: now,
      ruleset: 'dnd5e_2024',
      progressionMode: 'xp',
      world: {
        title: worldTitle.trim() || themePreset.name[language],
        primaryTheme,
        genres: allGenres,
        tone,
        era: era.trim() || themePreset.lore[language].era,
        history: history.trim() || themePreset.lore[language].history,
        worldLaws: worldLaws.trim() || themePreset.lore[language].worldLaws,
        premise: premise.trim() || themePreset.sparks[language][0].premise,
        creativePrompt:
          creativePrompt.trim() || inspirationInput.trim() || undefined,
        storyPace,
        matureMode,
      },
      player: {
        name: playerName.trim() || 'Viajante',
        age: Math.max(16, Math.min(999, playerAge || 28)),
        occupation:
          occupation.trim() ||
          getThemedClassLabel(dndClassId, primaryTheme, useClassicDnd),
        portraitUrl,
        portraitEngine,
        level: 1,
        xp: 0,
        xpToNextLevel: getXpDeltaForRuleset(1, 'dnd5e_2024'),
        attributePoints: 0,
        attributes: { ...finalAttributes },
        vigor: finalMaxHp,
        maxVigor: finalMaxHp,
        inspiration: 1,
        tension: 20,
        traits,
        skills: finalSkillLabels,
        skillLevels: syncSkillLevels(finalSkillLabels),
        talents: [],
        currency:
          startingCurrency ?? defaultCurrencyForTheme(primaryTheme, language),
        inventory: finalInventory,
        quests: [],
        journal: [],
        dnd: finalDnd,
      },
      codex: {
        npcs: [],
        locations: [],
        factions: factions.map((f, idx) => ({
          id: `fac_${now}_${idx}`,
          ...f,
        })),
        canonFacts: [
          {
            id: `fact_origin_${now}`,
            text: `Premissa inicial: ${premise.trim() || themePreset.sparks[language][0].premise}`,
            turn: 0,
            pinned: true,
          },
        ],
      },
      status: 'active',
      arcNumber: 1,
      eraSummaries: [],
      difficulty,
      language,
      currentChapter: 1,
      currentLocation: themePreset.name[language],
      currentMood: tone,
      turnCount: 0,
      journalEntryCount: 0,
      entries: [],
      actions: [],
      engineUsed: 'demo',
    };

    onCreateCampaign(campaign);
  };

  return (
    <main className="animate-view-enter relative z-10 mx-auto max-w-[1280px] px-4 pt-8 pb-20 sm:px-6">
      {/* Stepper Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
            Forja de Mundo · Passo {step} de 3
          </span>
          <h1 className="font-display mt-1 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
            {step === 1
              ? 'Esculpa o Universo & Atmosfera'
              : step === 2
                ? 'Dê Vida ao Protagonista'
                : 'Calibre as Leis do Destino'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStep(n as 1 | 2 | 3)}
              className={`flex h-9 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition ${
                step === n
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]'
                  : n < step
                    ? 'border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)]'
              }`}
            >
              <span>{n}</span>
              <span className="hidden sm:inline">
                {n === 1 ? 'Mundo' : n === 2 ? 'Protagonista' : 'Destino'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Split: Left Configurator + Right Live Chronicle Dossier */}
      <div className="grid gap-8 lg:grid-cols-12">
        <section className="space-y-6 lg:col-span-8">
          {/* STEP 1: WORLD */}
          {step === 1 ? (
            <div className="space-y-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)] sm:p-7">
              {/* Arquiteto Gemini — Inspiração Livre & Gerador de História/Prompts */}
              <div className="rounded-2xl border border-[var(--accent)]/40 bg-gradient-to-br from-[var(--accent-soft)] via-[var(--bg-surface)] to-[var(--bg-elevated)] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Arquiteto Gemini · Criar História a partir da sua Ideia
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                      Escreva qualquer ideia, cena, mistura de filmes/jogos ou prompt livre. O Gemini se inspira no que você escreveu para construir mundo, leis, facções, protagonista e o prompt permanente da crônica.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                        geminiConnected
                          ? 'border-[var(--accent)]/50 bg-[var(--accent-soft)] text-[var(--accent)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {geminiConnected
                        ? `Gemini (${settings.geminiModel})`
                        : 'Modo Demo'}
                    </span>
                    {!geminiConnected && onOpenAiSettings ? (
                      <button
                        type="button"
                        onClick={onOpenAiSettings}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent)] transition hover:brightness-110"
                      >
                        <KeyRound className="h-3 w-3" />
                        Conectar Gemini
                      </button>
                    ) : null}
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={inspirationInput}
                  onChange={(e) => {
                    setInspirationInput(e.target.value);
                    if (aiForgeError) setAiForgeError(null);
                  }}
                  placeholder="Ex.: Um mistério noir em um trem que nunca para através de uma nevasca mágica, onde cada vagão é governado por uma família diferente e as memórias servem como passagem..."
                  className="mt-3 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-canvas)]/80 px-4 py-3 text-sm leading-relaxed text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                />

                {/* Quick Inspiration Chips */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Inspirações rápidas:
                  </span>
                  {ARCHITECT_SPARKS[language].map((spark) => (
                    <button
                      key={spark.label}
                      type="button"
                      onClick={() => {
                        setInspirationInput(spark.prompt);
                        if (aiForgeError) setAiForgeError(null);
                      }}
                      className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      {spark.label}
                    </button>
                  ))}
                </div>

                {/* Action Bar */}
                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isForgingWithAi || inspirationInput.trim().length < 3}
                    onClick={() => void runAiArchitect('full_world')}
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isForgingWithAi && activeForgeAction === 'full_world' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {isForgingWithAi && activeForgeAction === 'full_world'
                        ? 'Gerando Universo...'
                        : 'Gerar Mundo & História com IA'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isForgingWithAi}
                    onClick={() => void runAiArchitect('refine_lore')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
                  >
                    {isForgingWithAi && activeForgeAction === 'refine_lore' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="h-3.5 w-3.5 text-[var(--accent)]" />
                    )}
                    <span>Expandir / Refinar Lore</span>
                  </button>

                  <button
                    type="button"
                    disabled={isForgingWithAi}
                    onClick={() => void runAiArchitect('surprise_me')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
                  >
                    {isForgingWithAi && activeForgeAction === 'surprise_me' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Dices className="h-3.5 w-3.5 text-[var(--accent)]" />
                    )}
                    <span>Me Surpreenda</span>
                  </button>

                  {inspirationInput.trim().length > 0 &&
                  inspirationInput.trim().length < 3 ? (
                    <span className="text-[11px] text-[var(--text-muted)]">
                      Escreva pelo menos uma frase curta para gerar a partir da sua ideia.
                    </span>
                  ) : null}
                </div>

                {aiForgeError ? (
                  <div className="mt-3 rounded-xl border border-[var(--danger)]/50 bg-[var(--danger)]/10 px-3.5 py-2.5 text-xs text-[var(--danger)]">
                    {aiForgeError}
                  </div>
                ) : null}

                {lastForgeResult && lastForgeResult.mode !== 'protagonist_only' ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-canvas)]/70 px-3.5 py-2.5 text-xs">
                    <div className="flex items-center gap-2 text-[var(--text-primary)]">
                      <Check className="h-4 w-4 text-[var(--accent)]" />
                      <span>
                        Universo preenchido via{' '}
                        <strong>
                          {lastForgeResult.engine === 'gemini'
                            ? `Gemini (${settings.geminiModel})`
                            : 'Modo Demo'}
                        </strong>
                        . Revise abaixo ou comece direto:
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)] hover:border-[var(--accent)]"
                      >
                        Revisar Protagonista →
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleForgeSubmit}
                        className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-1 text-[11px] font-semibold text-[var(--accent-contrast)] hover:brightness-110 disabled:opacity-50"
                      >
                        <Flame className="h-3 w-3" />
                        Forjar & Jogar Agora
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Atmosfera Principal (define o tema visual do app)
                </label>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(Object.keys(WORLD_THEMES) as WorldThemeId[]).map((id) => {
                    const preset = WORLD_THEMES[id];
                    const active = primaryTheme === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => selectPrimaryTheme(id)}
                        className={`flex flex-col rounded-xl border p-3.5 text-left transition ${
                          active
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-md'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: preset.swatch }}
                          />
                          {active ? <Check className="h-4 w-4 text-[var(--accent)]" /> : null}
                        </div>
                        <div className="font-display mt-2.5 text-sm font-semibold text-[var(--text-primary)]">
                          {preset.name[language]}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                          {preset.tagline[language]}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hybrid Genre Mix */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Misturar Gêneros Secundários (opcional, até 2)
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(WORLD_THEMES) as WorldThemeId[])
                    .filter((id) => id !== primaryTheme)
                    .map((id) => {
                      const label = WORLD_THEMES[id].name[language];
                      const active = extraGenres.includes(label);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleHybridGenre(id)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                            active
                              ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                          }`}
                        >
                          + {label}
                        </button>
                      );
                    })}
                </div>
                <div className="mt-3 flex max-w-sm gap-2">
                  <input
                    type="text"
                    value={customGenreInput}
                    onChange={(e) => setCustomGenreInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomGenre()}
                    placeholder="Ou digite um gênero (ex: Steampunk, Espacial)..."
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    type="button"
                    onClick={addCustomGenre}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 text-xs text-[var(--text-primary)] hover:border-[var(--accent)]"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Tone */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Tom da Narrativa
                </label>
                <div className="flex flex-wrap gap-2">
                  {themePreset.tones[language].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTone(t)}
                      className={`rounded-xl border px-3.5 py-2 text-xs font-medium transition ${
                        tone === t
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title, Era & Premise */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Título, Época & Premissa Inicial
                  </label>
                  <button
                    type="button"
                    onClick={randomizeSpark}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--accent)] hover:border-[var(--accent)]"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    Trocar Inspiração
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={worldTitle}
                    onChange={(e) => setWorldTitle(e.target.value)}
                    placeholder="Nome da crônica ou mundo..."
                    className="font-display w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2.5 text-base text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                  <input
                    type="text"
                    value={era}
                    onChange={(e) => setEra(e.target.value)}
                    placeholder="Época / Cenário (ex: Era do Eclipse, Ano 2094)..."
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <textarea
                  rows={2}
                  value={premise}
                  onChange={(e) => setPremise(e.target.value)}
                  placeholder="Qual conflito ou incidente inicial coloca sua história em movimento?"
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-sm leading-relaxed text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>

              {/* World History & World Laws */}
              <div>
                <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Extensão & Ritmo da Crônica
                </label>
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {STORY_PACE_OPTIONS.map((opt) => {
                    const active = storyPace === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setStoryPace(opt.id)}
                        className={`rounded-xl border p-3.5 text-left transition ${
                          active
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div className="text-xs font-semibold text-[var(--text-primary)]">
                          {opt.label[language]}
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
                          {opt.description[language]}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    <BookOpen className="h-3.5 w-3.5 text-[var(--accent)]" />
                    História & Passado do Mundo
                  </label>
                  <textarea
                    rows={4}
                    value={history}
                    onChange={(e) => setHistory(e.target.value)}
                    placeholder="Como este mundo chegou ao estado atual? Guerras antigas, colapsos, pactos..."
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-xs leading-relaxed text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    <Scale className="h-3.5 w-3.5 text-[var(--accent)]" />
                    Leis do Mundo (Magia, Tech & Preço)
                  </label>
                  <textarea
                    rows={4}
                    value={worldLaws}
                    onChange={(e) => setWorldLaws(e.target.value)}
                    placeholder="Regras que governam este universo: o que custa usar magia, implantes, armas..."
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-xs leading-relaxed text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              {/* Direção Criativa Permanente */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <Compass className="h-3.5 w-3.5 text-[var(--accent)]" />
                  Prompt de Direção Criativa (guia permanente da IA durante toda a história)
                </label>
                <textarea
                  rows={2}
                  value={creativePrompt}
                  onChange={(e) => setCreativePrompt(e.target.value)}
                  placeholder="Instruções contínuas de estilo, temas secretos ou reviravoltas que o narrador deve honrar em todos os capítulos (preenchido automaticamente pela IA ou por você)..."
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-xs leading-relaxed text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>

              {/* Factions */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <Flag className="h-3.5 w-3.5 text-[var(--accent)]" />
                  Facções & Poderes em Conflito ({factions.length})
                </label>
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {factions.map((fac, idx) => (
                    <div
                      key={`${fac.name}_${idx}`}
                      className="flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-xs font-semibold text-[var(--text-primary)]">
                            {fac.name}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setFactions((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-[var(--text-muted)] hover:text-[var(--danger)]"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">
                          {fac.description}
                        </p>
                      </div>
                      <span className="mt-2 inline-block text-[10px] font-medium text-[var(--accent)]">
                        {fac.influence}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-12">
                  <input
                    type="text"
                    value={newFactionName}
                    onChange={(e) => setNewFactionName(e.target.value)}
                    placeholder="Nova facção (ex: Ordem da Bruma)"
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)] sm:col-span-4"
                  />
                  <input
                    type="text"
                    value={newFactionDesc}
                    onChange={(e) => setNewFactionDesc(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addFaction()}
                    placeholder="O que ela quer ou controla?"
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)] sm:col-span-6"
                  />
                  <button
                    type="button"
                    onClick={addFaction}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)] sm:col-span-2"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Mature content toggle */}
              <div className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">
                    Classificação 18+ · Dilemas Maduros & Sem Limites Narrativos
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Permite consequências sombrias, temas adultos e escolhas moralmente cinzentas.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={matureMode}
                  onChange={(e) => setMatureMode(e.target.checked)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
              </div>
            </div>
          ) : null}

          {/* STEP 2: PROTAGONIST (D&D 5.2 2-Layer Creator) */}
          {step === 2 ? (
            <WorldForgeDndStep2
              primaryTheme={primaryTheme}
              language={language}
              useClassicDnd={useClassicDnd}
              archetypes={themePreset.archetypes}
              resolveSpriteForArchetype={(archId) =>
                resolveArchetypeDnd(archId, primaryTheme).spriteId
              }
              resolveClassForArchetype={(archId) =>
                resolveArchetypeDnd(archId, primaryTheme).classId
              }
              forgeMode={forgeMode}
              setForgeMode={setForgeMode}
              customSubTab={customSubTab}
              setCustomSubTab={setCustomSubTab}
              selectedArchetypeId={selectedArchetypeId}
              onApplyArchetype={(arch) => applyArchetype(arch)}
              dndClassId={dndClassId}
              onSelectDndClass={selectDndClass}
              dndSpeciesId={dndSpeciesId}
              onSelectDndSpecies={setDndSpeciesId}
              dndBackgroundId={dndBackgroundId}
              onSelectDndBackground={selectDndBackground}
              statMethod={statMethod}
              onApplyStatMethod={applyStatMethod}
              attributes={attributes}
              finalAttributes={finalAttributes}
              pointsRemaining={pointsRemaining}
              onAdjustAttribute={adjustAttribute}
              bgPlusTwo={bgPlusTwo}
              setBgPlusTwo={setBgPlusTwo}
              bgPlusOne={bgPlusOne}
              setBgPlusOne={setBgPlusOne}
              chosenClassSkills={chosenClassSkills}
              setChosenClassSkills={setChosenClassSkills}
              chosenExpertise={chosenExpertise}
              setChosenExpertise={setChosenExpertise}
              chosenCantrips={chosenCantrips}
              setChosenCantrips={setChosenCantrips}
              chosenSpells={chosenSpells}
              setChosenSpells={setChosenSpells}
              chosenFightingStyle={chosenFightingStyle}
              setChosenFightingStyle={setChosenFightingStyle}
              chosenMasteries={chosenMasteries}
              setChosenMasteries={setChosenMasteries}
              previewDnd={previewDnd}
              previewMaxHp={previewMaxHp}
              previewAc={previewAc}
              previewSpriteId={previewSpriteId}
              playerName={playerName}
              setPlayerName={setPlayerName}
              playerAge={playerAge}
              setPlayerAge={setPlayerAge}
              occupation={occupation}
              setOccupation={setOccupation}
              traits={traits}
              setTraits={setTraits}
              customTrait={customTrait}
              setCustomTrait={setCustomTrait}
              portraitUrl={portraitUrl}
              portraitEngine={portraitEngine}
              isGeneratingPortrait={isGeneratingPortrait}
              onGeneratePreviewPortrait={() => void handleGeneratePreviewPortrait()}
              onRandomizeCharacter={randomizeCharacter}
              characterIdeaInput={characterIdeaInput}
              setCharacterIdeaInput={setCharacterIdeaInput}
              isForgingWithAi={isForgingWithAi}
              activeForgeAction={activeForgeAction}
              onRunAiProtagonist={() => void runAiArchitect('protagonist_only')}
            />
          ) : null}

          {/* STEP 3: FATE & DIFFICULTY */}
          {step === 3 ? (
            <div className="space-y-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)] sm:p-7">
              <div>
                <label className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <Shield className="h-4 w-4 text-[var(--accent)]" />
                  Dificuldade & Letalidade do Destino
                </label>
                <div className="space-y-2.5">
                  {DIFFICULTIES.map((d) => {
                    const active = difficulty === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDifficulty(d.id)}
                        className={`w-full rounded-xl border p-4 text-left transition ${
                          active
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-display text-base font-semibold text-[var(--text-primary)]">
                            {d.label[language]}
                          </span>
                          <span className="font-mono-tech rounded-lg bg-[var(--bg-canvas)]/70 px-2.5 py-1 text-xs text-[var(--accent)]">
                            {d.subtitle[language]}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                          {d.philosophy[language]}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Extensão & Ritmo da Crônica
                </label>
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {STORY_PACE_OPTIONS.map((opt) => {
                    const active = storyPace === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setStoryPace(opt.id)}
                        className={`rounded-xl border p-3.5 text-left transition ${
                          active
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div className="text-xs font-semibold text-[var(--text-primary)]">
                          {opt.label[language]}
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
                          {opt.description[language]}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Idioma da Narração
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as LanguageId)}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Ritmo dos Textos
                  </label>
                  <select
                    value={responseLength}
                    onChange={(e) => setResponseLength(e.target.value as ResponseLength)}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="short">Direto (1-2 parágrafos)</option>
                    <option value="normal">Equilibrado (2-3 parágrafos)</option>
                    <option value="literary">Literário (3-4 parágrafos ricos)</option>
                    <option value="epic">Épico / Livro (4-6 parágrafos detalhados)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">
                    Ativar Pulso de Mundo Vivo
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Se você pausar em uma cena tensa, o mundo continua agindo ao seu redor.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={livingWorld}
                  onChange={(e) => setLivingWorld(e.target.checked)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
              </div>
            </div>
          ) : null}

          {/* Footer Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => (step === 1 ? onCancel() : setStep((s) => (s - 1) as 1 | 2))}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{step === 1 ? 'Voltar ao Santuário' : 'Passo Anterior'}</span>
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as 2 | 3)}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-contrast)] transition hover:brightness-110"
              >
                <span>Próximo Passo</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleForgeSubmit}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--accent-contrast)] shadow-lg transition hover:brightness-110 disabled:opacity-60"
              >
                <Flame className="h-4 w-4" />
                <span>{isSubmitting ? 'Tecendo Abertura...' : 'Forjar & Iniciar Crônica'}</span>
              </button>
            )}
          </div>
        </section>

        {/* Sticky Live Dossier Preview */}
        <aside className="lg:col-span-4">
          <div className="sticky top-20 overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-[var(--shadow-elevated)]">
            <div
              className="h-2 w-full"
              style={{
                background: `linear-gradient(90deg, ${themePreset.swatch}, ${themePreset.secondarySwatch})`,
              }}
            />
            <div className="space-y-5 p-5">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-[var(--accent)]">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Dossiê ao Vivo
                </span>
                <span>{matureMode ? '18+' : '16+'}</span>
              </div>

              <div>
                <div className="text-[11px] font-medium text-[var(--accent)]">
                  {era}
                </div>
                <h2 className="font-display mt-0.5 text-xl font-semibold text-[var(--text-primary)]">
                  {worldTitle || 'Sem Título'}
                </h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]">
                    {themePreset.name[language]}
                  </span>
                  {extraGenres.map((g) => (
                    <span
                      key={g}
                      className="rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]"
                    >
                      {g}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {premise}
                </p>
                {worldLaws ? (
                  <p className="mt-2 line-clamp-2 border-l-2 border-[var(--border-strong)] pl-2.5 text-[11px] italic text-[var(--text-muted)]">
                    {worldLaws}
                  </p>
                ) : null}
                {(creativePrompt.trim() || inspirationInput.trim()) ? (
                  <div className="mt-2.5 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-2.5 py-2">
                    <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                      <Sparkles className="h-3 w-3" />
                      Inspiração IA ativa
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[var(--text-primary)]">
                      {creativePrompt.trim() || inspirationInput.trim()}
                    </p>
                  </div>
                ) : null}
                {factions.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {factions.map((f, idx) => (
                      <span
                        key={`${f.name}_${idx}`}
                        className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]"
                      >
                        {f.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="border-t border-[var(--border-subtle)] pt-4">
                <div className="flex items-center gap-3">
                  {portraitUrl ? (
                    <img
                      src={portraitUrl}
                      alt={playerName}
                      className="h-11 w-11 shrink-0 rounded-xl border border-[var(--border-strong)] object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--accent-soft)] p-0.5">
                      <PixelHeroSprite spriteId={previewSpriteId} className="h-9 w-9" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {playerName || 'Protagonista'} · {playerAge}
                    </div>
                    <div className="truncate text-xs text-[var(--accent)]">
                      {getThemedClassLabel(dndClassId, primaryTheme, useClassicDnd)} · {getThemedSpeciesLabel(dndSpeciesId, primaryTheme, useClassicDnd)}
                    </div>
                    <div className="truncate text-[11px] text-[var(--text-muted)]">
                      {selectedDndBg.label} · {occupation}
                    </div>
                  </div>
                </div>

                <div className="font-mono-tech mt-3 flex flex-wrap gap-1.5 text-[11px]">
                  <span className="rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-300">
                    ❤ {previewMaxHp} PV
                  </span>
                  <span className="rounded-md border border-sky-500/35 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-300">
                    🛡 CA {previewAc}
                  </span>
                  <span className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[var(--text-secondary)]">
                    D&D 5.2 · Nv.1
                  </span>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {previewDnd.skillProficiencies.slice(0, 6).map((sk) => (
                    <span
                      key={sk}
                      className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]"
                    >
                      ● {getThemedSkillLabel(sk, primaryTheme, useClassicDnd)}
                    </span>
                  ))}
                </div>

                <div className="mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                  <span className="font-medium text-[var(--text-primary)]">Equipamento Inicial:</span>{' '}
                  {starterItem.name}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 text-xs">
                <span className="text-[var(--text-muted)]">Dificuldade</span>
                <span className="font-mono-tech font-semibold text-[var(--accent)]">
                  {DIFFICULTIES.find((d) => d.id === difficulty)?.subtitle[language]}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
