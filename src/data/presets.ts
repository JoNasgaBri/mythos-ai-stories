import { generateDemoPortraitArt, generateDemoSceneArt } from '../engine/demoArtwork';
import type {
  ActionIntent,
  AppSettings,
  Campaign,
  DifficultyId,
  FactionStanding,
  ItemCategory,
  LanguageId,
  StoryPace,
  WorldThemeId,
} from '../types/game';

export interface FactionSeed {
  name: string;
  description: string;
  standing: FactionStanding;
  influence: string;
}

export interface WorldLorePack {
  era: string;
  history: string;
  worldLaws: string;
  prologue: string;
  factions: FactionSeed[];
}

export interface ArchetypePreset {
  id: string;
  label: Record<LanguageId, string>;
  summary: Record<LanguageId, string>;
  skills: Record<LanguageId, string[]>;
  traits: Record<LanguageId, string[]>;
  starterItem: {
    name: Record<LanguageId, string>;
    category: ItemCategory;
    note: Record<LanguageId, string>;
  };
}

export interface WorldThemePreset {
  id: WorldThemeId;
  name: Record<LanguageId, string>;
  aestheticLabel: Record<LanguageId, string>;
  tagline: Record<LanguageId, string>;
  swatch: string;
  secondarySwatch: string;
  defaultTone: Record<LanguageId, string>;
  tones: Record<LanguageId, string[]>;
  lore: Record<LanguageId, WorldLorePack>;
  sparks: Record<LanguageId, Array<{ title: string; premise: string }>>;
  archetypes: ArchetypePreset[];
}

export const WORLD_THEMES: Record<WorldThemeId, WorldThemePreset> = {
  fantasy: {
    id: 'fantasy',
    name: {
      'pt-BR': 'Fantasia Sombria',
      en: 'Dark Fantasy',
      fr: 'Fantasy Sombre',
    },
    aestheticLabel: {
      'pt-BR': 'Obsidiana & Ouro Antigo',
      en: 'Obsidian & Old Gold',
      fr: 'Obsidienne & Or Ancien',
    },
    tagline: {
      'pt-BR': 'Reinos em ruína, juramentos antigos e magia com preço de sangue.',
      en: 'Crumbling kingdoms, ancient oaths, and magic paid in blood.',
      fr: 'Royaumes en ruine, serments anciens et magie payée par le sang.',
    },
    swatch: '#d4a853',
    secondarySwatch: '#8b4513',
    defaultTone: {
      'pt-BR': 'Épico & Melancólico',
      en: 'Epic & Melancholic',
      fr: 'Épique & Mélancolique',
    },
    tones: {
      'pt-BR': ['Épico & Melancólico', 'Intriga Cortesã', 'Folk Horror Arcano', 'Aventura Clássica'],
      en: ['Epic & Melancholic', 'Court Intrigue', 'Arcane Folk Horror', 'Classic Quest'],
      fr: ['Épique & Mélancolique', 'Intrigue de Cour', 'Horreur Folklorique', 'Quête Classique'],
    },
    lore: {
      'pt-BR': {
        era: 'Era do Eclipse Partido · Ano 412 da Coroa',
        history:
          'Há quatro séculos, os reinos da superfície selaram as entidades antigas sob raízes de ferro em troca de colheitas perpétuas. Agora o sol empalidece a cada inverno, os pactos cobram juros silenciosos nas aldeias fronteiriças e a alta nobreza prefere esconder o preço da magia antiga do que abdicar do trono.',
        worldLaws:
          'Toda feitiçaria deixa marca física ou cobra memórias em troca; juramentos feitos sobre aço real carregam peso quase sobrenatural e portais rúnicos respondem apenas ao sangue ou ao fogo.',
        prologue:
          'Antes que sua lâmina cruze o primeiro portão, o reino já respira sobre brasas antigas. Das muralhas douradas de Larion até as clareiras silenciosas de Vespera, cada sino calado e cada porta trancada conta a história de um acordo que a geração atual tenta esquecer — mas que está prestes a despertar.',
        factions: [
          {
            name: 'A Coroa de Larion',
            description: 'Dinastia enfraquecida que ainda controla fortalezas e estradas principais.',
            standing: 'allied',
            influence: 'Alta nas cidades',
          },
          {
            name: 'O Pacto de Vespera',
            description: 'Antigos guardiões florestais e cultistas que cobram tributos esquecidos.',
            standing: 'wary',
            influence: 'Forte nas fronteiras',
          },
          {
            name: 'Companhia da Cinza',
            description: 'Mercenários e contrabandistas de relíquias que vendem lealdade ao maior lance.',
            standing: 'neutral',
            influence: 'Rotas comerciais',
          },
        ],
      },
      en: {
        era: 'Age of the Split Eclipse · Crown Year 412',
        history:
          'Four centuries ago, the surface kingdoms bound older powers beneath iron roots in exchange for unbroken harvests. Now the sun weakens each winter, border villages pay silent tribute, and the high court guards the secret rather than surrender its crown.',
        worldLaws:
          'Sorcery leaves scars or demands memories in payment; oaths sworn over royal steel carry real weight; ancient wards answer only to blood or fire.',
        prologue:
          'Long before your boots reach the first gate, the realm already trembles above buried embers. From the gilded towers of Larion to the silent eaves of Vespera Woods, every bolted shutter whispers of a bargain the crown hoped to outlive.',
        factions: [
          {
            name: 'Crown of Larion',
            description: 'Fading dynasty still commanding walled cities and royal highways.',
            standing: 'allied',
            influence: 'High in cities',
          },
          {
            name: 'Pact of Vespera',
            description: 'Forest wardens and secret keepers enforcing ancient bargains.',
            standing: 'wary',
            influence: 'Strong in borderlands',
          },
          {
            name: 'Ash Company',
            description: 'Relic smugglers and sellswords loyal only to coin.',
            standing: 'neutral',
            influence: 'Trade roads',
          },
        ],
      },
      fr: {
        era: 'Ère de l’Éclipse Fendue · An 412',
        history:
          'Il y a quatre siècles, les royaumes ont scellé des puissances anciennes sous des racines de fer. Aujourd’hui le soleil pâlit et chaque village paie un tribut silencieux.',
        worldLaws:
          'Toute magie laisse une cicatrice ou exige un souvenir ; les serments sur l’acier royal lient le destin.',
        prologue:
          'Avant même que votre lame ne franchisse la première porte, le royaume tremble sur des braises anciennes que nul ne veut nommer.',
        factions: [
          {
            name: 'Couronne de Larion',
            description: 'Dynastie vieillissante tenant encore les citadelles.',
            standing: 'allied',
            influence: 'Forte en ville',
          },
          {
            name: 'Pacte de Vespera',
            description: 'Gardiens sylvestres veillant sur d’anciens accords.',
            standing: 'wary',
            influence: 'Frontières',
          },
          {
            name: 'Compagnie des Cendres',
            description: 'Mercenaires et trafiquants de reliques.',
            standing: 'neutral',
            influence: 'Routes marchandes',
          },
        ],
      },
    },
    sparks: {
      'pt-BR': [
        {
          title: 'As Cinzas de Larion',
          premise:
            'A princesa desapareceu além da Floresta de Vespera e cada vila na rota parece esconder um pacto silencioso com a coroa.',
        },
        {
          title: 'A Catedral Submersa',
          premise:
            'Um eclipse perpétuo baixou as marés e revelou campanários antigos cheios de relíquias vivas e cultistas desesperados.',
        },
      ],
      en: [
        {
          title: 'The Ashes of Larion',
          premise:
            'The royal heir vanished beyond Vespera Woods, and every village along the road hides a quiet pact with an older power.',
        },
        {
          title: 'The Sunken Cathedral',
          premise:
            'A lingering eclipse drained the bay, exposing drowned spires filled with living relics and desperate zealots.',
        },
      ],
      fr: [
        {
          title: 'Les Cendres de Larion',
          premise:
            "L'héritière royale a disparu au-delà des bois de Vespera, et chaque village semble cacher un pacte silencieux.",
        },
        {
          title: 'La Cathédrale Engloutie',
          premise:
            'Une éclipse prolongée a vidé la baie, révélant des flèches noyées pleines de reliques vivantes.',
        },
      ],
    },
    archetypes: [
      {
        id: 'knight',
        label: { 'pt-BR': 'Cavaleiro Juramentado', en: 'Sworn Knight', fr: 'Chevalier Juré' },
        summary: {
          'pt-BR': 'Aço disciplinado e honra testada por escolhas impossíveis.',
          en: 'Disciplined steel and honor tested by impossible choices.',
          fr: "Acier discipliné et honneur mis à l'épreuve.",
        },
        skills: {
          'pt-BR': ['Esgrima Tática', 'Vontade Inabalável'],
          en: ['Tactical Swordplay', 'Iron Resolve'],
          fr: ['Escrime Tactique', 'Volonté de Fer'],
        },
        traits: {
          'pt-BR': ['Honrado', 'Cicatriz de Guerra'],
          en: ['Honorable', 'Battle-Scarred'],
          fr: ['Honorable', 'Marqué par la Guerre'],
        },
        starterItem: {
          name: { 'pt-BR': 'Espada de Aço Real', en: 'Royal Steel Longsword', fr: 'Épée en Acier Royal' },
          category: 'weapon',
          note: {
            'pt-BR': 'Lâmina equilibrada gravada com o selo do reino.',
            en: 'Balanced blade etched with the royal crest.',
            fr: 'Lame équilibrée gravée du sceau royal.',
          },
        },
      },
      {
        id: 'witch',
        label: { 'pt-BR': 'Bruxa / Arcanista', en: 'Witch / Arcanist', fr: 'Sorcière / Arcaniste' },
        summary: {
          'pt-BR': 'Lê presságios na fumaça e negocia com forças que outros temem.',
          en: 'Reads omens in smoke and bargains with forces others fear.',
          fr: 'Lit les présages dans la fumée et pactise avec l’occulte.',
        },
        skills: {
          'pt-BR': ['Alquimia & Rituais', 'Leitura de Presságios'],
          en: ['Alchemy & Rituals', 'Omen Sight'],
          fr: ['Alchimie & Rituels', 'Lecture des Présages'],
        },
        traits: {
          'pt-BR': ['Enigmático', 'Olhar Penetrante'],
          en: ['Enigmatic', 'Piercing Gaze'],
          fr: ['Énigmatique', 'Regard Perçant'],
        },
        starterItem: {
          name: { 'pt-BR': 'Grimório de Cinzas', en: 'Grimoire of Ashes', fr: 'Grimoire des Cendres' },
          category: 'relic',
          note: {
            'pt-BR': 'Páginas carbonizadas que revelam sigilos sob calor.',
            en: 'Charred pages revealing sigils near firelight.',
            fr: 'Pages calcinées révélant des sigles près du feu.',
          },
        },
      },
      {
        id: 'rogue',
        label: { 'pt-BR': 'Ladino / Espião', en: 'Rogue / Shadow', fr: 'Voleur / Ombre' },
        summary: {
          'pt-BR': 'Sobrevive entre becos, fechaduras e segredos comprados a ouro.',
          en: 'Thrives between alleys, locks, and secrets bought in coin.',
          fr: 'Survie entre ruelles, serrures et secrets monnayés.',
        },
        skills: {
          'pt-BR': ['Furtividade', 'Arrombamento & Lábia'],
          en: ['Stealth', 'Lockpicking & Bluff'],
          fr: ['Furtivité', 'Crochetage & Bagou'],
        },
        traits: {
          'pt-BR': ['Desconfiado', 'Mãos Rápidas'],
          en: ['Suspicious', 'Quick Hands'],
          fr: ['Méfiant', 'Mains Agiles'],
        },
        starterItem: {
          name: { 'pt-BR': 'Gazuas de Prata Fosca', en: 'Matte Silver Lockpicks', fr: "Crochets d'Argent Mat" },
          category: 'tool',
          note: {
            'pt-BR': 'Silenciosas mesmo em fechaduras enferrujadas.',
            en: 'Silent even inside rusted dwarven locks.',
            fr: 'Silencieux même dans les vieilles serrures.',
          },
        },
      },
      {
        id: 'ranger',
        label: { 'pt-BR': 'Patrulheiro / Feérico', en: 'Ranger / Fae-Touched', fr: 'Rôdeur / Féerique' },
        summary: {
          'pt-BR': 'Conhece atalhos esquecidos e escuta o que a mata sussurra.',
          en: 'Knows forgotten trails and hears what the forest whispers.',
          fr: 'Connaît les sentiers oubliés et écoute la forêt.',
        },
        skills: {
          'pt-BR': ['Rastreamento', 'Arco & Sobrevivência'],
          en: ['Tracking', 'Archery & Survival'],
          fr: ['Pistage', 'Tir à l’Arc & Survie'],
        },
        traits: {
          'pt-BR': ['Sentidos Aguçados', 'Solitário'],
          en: ['Keen Senses', 'Solitary'],
          fr: ['Sens Aiguisés', 'Solitaire'],
        },
        starterItem: {
          name: { 'pt-BR': 'Bússola de Osso Talhado', en: 'Carved Bone Compass', fr: 'Boussole en Os Sculpté' },
          category: 'tool',
          note: {
            'pt-BR': 'Vibra discretamente perto de portais antigos.',
            en: 'Hums faintly when near ancient thresholds.',
            fr: 'Vibre doucement près des seuils anciens.',
          },
        },
      },
    ],
  },

  cyberpunk: {
    id: 'cyberpunk',
    name: {
      'pt-BR': 'Cyberpunk Neon',
      en: 'Neon Cyberpunk',
      fr: 'Cyberpunk Néon',
    },
    aestheticLabel: {
      'pt-BR': 'Neon Noir & Terminal Tático',
      en: 'Neon Noir & Tactical HUD',
      fr: 'Néon Noir & HUD Tactique',
    },
    tagline: {
      'pt-BR': 'Megacorporações, implantes ilegais e chuva ácida sobre dados roubados.',
      en: 'Megacorps, black-market chrome, and acid rain over stolen memory.',
      fr: 'Mégacorporations, chrome illégal et pluie acide sur des données volées.',
    },
    swatch: '#22d3ee',
    secondarySwatch: '#f43f5e',
    defaultTone: {
      'pt-BR': 'Tech-Noir Tenso',
      en: 'Tense Tech-Noir',
      fr: 'Tech-Noir Tendu',
    },
    tones: {
      'pt-BR': ['Tech-Noir Tenso', 'Assalto Corporativo', 'Distopia Psicodélica', 'Conspiração Digital'],
      en: ['Tense Tech-Noir', 'Corporate Heist', 'Digital Psychedelia', 'Net Conspiracy'],
      fr: ['Tech-Noir Tendu', 'Braquage Corpo', 'Dystopie Psychédélique', 'Conspiration Réseau'],
    },
    lore: {
      'pt-BR': {
        era: 'Ano 2094 · Neo-Veridia Vertical',
        history:
          'Após o Colapso da Rede Antiga, três megacorporações ergueram torres quilométricas acima das nuvens de chuva ácida. Enquanto a elite compra décadas extras em clones e nuvens neurais, os distritos inferiores sobrevivem trocando fragmentos de memória contrabandeados e cromo reciclado.',
        worldLaws:
          'Todo implante deixa assinatura elétrica rastreável; invasões de rede sem blindagem fritam sinapses e dívidas corporativas são cobradas em carne ou anos de serviço.',
        prologue:
          'Em Neo-Veridia, a chuva nunca limpa o asfalto — apenas espalha o reflexo do neon sobre contratos quebrados. Lá no alto, conselhos decidem quem respira amanhã; cá embaixo, um único drive criptografado pode derrubar um império ou apagar seu nome do mapa.',
        factions: [
          {
            name: 'Kurosawa Biotech',
            description: 'Megacorp dominante de implantes neurais e vigilância urbana.',
            standing: 'hostile',
            influence: 'Absoluta nos setores altos',
          },
          {
            name: 'Coletivo Fantasma',
            description: 'Rede descentralizada de netrunners que vendem liberdade digital.',
            standing: 'neutral',
            influence: 'Sub-rede clandestina',
          },
          {
            name: 'Sindicato Cromo-Zero',
            description: 'Contrabandistas dos dutos que controlam clínicas e rotas de fuga.',
            standing: 'wary',
            influence: 'Distritos baixos',
          },
        ],
      },
      en: {
        era: 'Year 2094 · Vertical Neo-Veridia',
        history:
          'Following the Old Net Crash, three megacorps raised kilometer-high spires above eternal acid rain. While elites buy immortality in neural clouds, lower tiers survive on salvaged chrome and stolen memory shards.',
        worldLaws:
          'Every cybernetic mod leaves a traceable signature; unshielded ICE cooks synapses; corporate debts are collected in flesh or servitude.',
        prologue:
          'In Neo-Veridia, rain never washes the streets—it only smears neon over broken contracts. One stolen consciousness shard is about to ignite a turf war from the sub-grid to the orbital docks.',
        factions: [
          {
            name: 'Kurosawa Biotech',
            description: 'Dominant neural-ware syndicate policing upper tiers.',
            standing: 'hostile',
            influence: 'Upper spires',
          },
          {
            name: 'Ghost Collective',
            description: 'Underground netrunners trading clean identities.',
            standing: 'neutral',
            influence: 'Deep mesh',
          },
          {
            name: 'Chrome-Zero Cartel',
            description: 'Street-level smugglers controlling black clinics.',
            standing: 'wary',
            influence: 'Lower blocks',
          },
        ],
      },
      fr: {
        era: 'Année 2094 · Néo-Véridia Verticale',
        history:
          'Après l’Effondrement du Réseau, trois mégacorps ont bâti des tours au-dessus de la pluie acide tandis que les bas-fonds survivent au chrome recyclé.',
        worldLaws:
          'Chaque implant laisse une trace électrique ; les pare-feux grillent le cortex en cas d’échec.',
        prologue:
          'Sous la pluie huileuse de Néo-Véridia, un simple fragment mémoire volé suffit à déclencher une guerre silencieuse entre syndicats.',
        factions: [
          {
            name: 'Kurosawa Biotech',
            description: 'Mégacorp maîtresse de la sécurité neurale.',
            standing: 'hostile',
            influence: 'Hauts secteurs',
          },
          {
            name: 'Collectif Fantôme',
            description: 'Hackers clandestins vendant l’anonymat.',
            standing: 'neutral',
            influence: 'Sous-réseau',
          },
          {
            name: 'Cartel Chrome-Zéro',
            description: 'Contrebandiers des bas quartiers.',
            standing: 'wary',
            influence: 'Bas-fonds',
          },
        ],
      },
    },
    sparks: {
      'pt-BR': [
        {
          title: 'Protocolo Fantasma-9',
          premise:
            'Um fragmento de consciência humana apareceu no mercado clandestino de Neo-Veridia e três sindicatos já sabem quem está carregando o drive.',
        },
        {
          title: 'Apagão no Setor Vertical',
          premise:
            'Os elevadores orbitais travaram durante a tempestade magnética, prendendo executivos e mercenários nos andares sem lei.',
        },
      ],
      en: [
        {
          title: 'Ghost-9 Protocol',
          premise:
            'A fractured human consciousness surfaced on Neo-Veridia’s black market, and three syndicates already traced the courier carrying the shard.',
        },
        {
          title: 'Blackout in Vertical Nine',
          premise:
            'Orbital lifts locked mid-storm, trapping corp directors and street runners inside the lawless maintenance tiers.',
        },
      ],
      fr: [
        {
          title: 'Protocole Fantôme-9',
          premise:
            'Un fragment de conscience humaine a refait surface au marché noir, et trois syndicats traquent déjà le porteur.',
        },
        {
          title: 'Coupure au Secteur Vertical',
          premise:
            'Les ascenseurs orbitaux se sont figés pendant la tempête, piégeant cadres et mercenaires sans loi.',
        },
      ],
    },
    archetypes: [
      {
        id: 'cyborg',
        label: { 'pt-BR': 'Mercenário Cromado', en: 'Chromed Cyborg', fr: 'Cyborg Mercenaire' },
        summary: {
          'pt-BR': 'Reflexos neurais turbinados pagando o preço em humanidade.',
          en: 'Overclocked neural reflexes paid for in fading humanity.',
          fr: 'Réflexes neuraux dopés au prix de son humanité.',
        },
        skills: {
          'pt-BR': ['Combate Tático', 'Interface Neural'],
          en: ['Tactical Combat', 'Neural Overclock'],
          fr: ['Combat Tactique', 'Interface Neurale'],
        },
        traits: {
          'pt-BR': ['Frio sob Fogo', 'Dívida com Clínica'],
          en: ['Ice Cold', 'Clinic Debt'],
          fr: ['Sang-Froid', 'Dette Clinique'],
        },
        starterItem: {
          name: { 'pt-BR': 'Injetor de Adrenalina Mk.II', en: 'Adrenaline Injector Mk.II', fr: "Injecteur d'Adrénaline Mk.II" },
          category: 'consumable',
          note: {
            'pt-BR': 'Dose única de recuperação rápida em combate.',
            en: 'Single emergency dose for rapid shock recovery.',
            fr: 'Dose unique de récupération rapide.',
          },
        },
      },
      {
        id: 'punk',
        label: { 'pt-BR': 'Netrunner / Hacker', en: 'Netrunner / Punk', fr: 'Netrunner / Punk' },
        summary: {
          'pt-BR': 'Quebra firewalls corporativos antes que o rastreamento frite o córtex.',
          en: 'Breaks corp ICE before trace daemons fry the cortex.',
          fr: 'Brise les pare-feux avant que le traçage ne grille le cortex.',
        },
        skills: {
          'pt-BR': ['Invasão de Sistemas', 'Engenharia Social'],
          en: ['System Intrusion', 'Social Engineering'],
          fr: ['Intrusion Réseau', 'Ingénierie Sociale'],
        },
        traits: {
          'pt-BR': ['Insone', 'Antissistema'],
          en: ['Insomniac', 'Anti-Corp'],
          fr: ['Insomniaque', 'Antisystème'],
        },
        starterItem: {
          name: { 'pt-BR': 'Cyberdeck Portátil', en: 'Pocket Cyberdeck', fr: 'Cyberdeck Portable' },
          category: 'tool',
          note: {
            'pt-BR': 'Decriptador modificado com script de fuga rápida.',
            en: 'Modified decryptor loaded with a clean-exit script.',
            fr: 'Décrypteur modifié avec script de fuite.',
          },
        },
      },
      {
        id: 'cop',
        label: { 'pt-BR': 'Detetive Cibernético', en: 'Cyber Precinct Cop', fr: 'Inspecteur Cyber' },
        summary: {
          'pt-BR': 'Distintivo gasto tentando fazer justiça numa cidade comprada.',
          en: 'Worn badge chasing truth inside a bought precinct.',
          fr: 'Insigne usé cherchant la vérité dans une ville achetée.',
        },
        skills: {
          'pt-BR': ['Investigação Forense', 'Interrogatório'],
          en: ['Forensic Scan', 'Interrogation'],
          fr: ['Analyse Légale', 'Interrogatoire'],
        },
        traits: {
          'pt-BR': ['Obstinado', 'Memória Fotográfica'],
          en: ['Relentless', 'Photographic Memory'],
          fr: ['Obstiné', 'Mémoire Visuelle'],
        },
        starterItem: {
          name: { 'pt-BR': 'Scanner Óptico Forense', en: 'Forensic Optic Scanner', fr: 'Scanner Optique Légal' },
          category: 'clue',
          note: {
            'pt-BR': 'Detecta traços biológicos e assinaturas de implante.',
            en: 'Reads micro-traces and chrome serial hashes.',
            fr: "Détecte traces biologiques et signatures d'implants.",
          },
        },
      },
      {
        id: 'android',
        label: { 'pt-BR': 'Androide Desperto', en: 'Awakened Android', fr: 'Androïde Éveillé' },
        summary: {
          'pt-BR': 'Sintético fora da lei descobrindo emoções não autorizadas.',
          en: 'Off-grid synthetic learning unauthorized emotions.',
          fr: 'Synthétique hors-la-loi découvrant des émotions interdites.',
        },
        skills: {
          'pt-BR': ['Análise Preditiva', 'Precisão Mecânica'],
          en: ['Predictive Analysis', 'Precision Control'],
          fr: ['Analyse Prédictive', 'Précision Mécanique'],
        },
        traits: {
          'pt-BR': ['Identidade Oculta', 'Empatia Recente'],
          en: ['Hidden Identity', 'Emerging Empathy'],
          fr: ['Identité Cachée', 'Empathie Naissante'],
        },
        starterItem: {
          name: { 'pt-BR': 'Chip de Camuflagem Biométrica', en: 'Biometric Spoof Chip', fr: 'Puce de Camouflage' },
          category: 'relic',
          note: {
            'pt-BR': 'Mascara temperatura e pulso em portões de segurança.',
            en: 'Simulates human pulse and warmth at checkpoints.',
            fr: 'Simule pouls et chaleur aux points de contrôle.',
          },
        },
      },
    ],
  },

  mystery: {
    id: 'mystery',
    name: {
      'pt-BR': 'Mistério & Noir',
      en: 'Mystery & Noir',
      fr: 'Mystère & Noir',
    },
    aestheticLabel: {
      'pt-BR': 'Dossiê Noir & Latão',
      en: 'Noir Dossier & Brass',
      fr: 'Dossier Noir & Laiton',
    },
    tagline: {
      'pt-BR': 'Mansões isoladas, álibis falsos e segredos psicológicos sob neblina.',
      en: 'Locked estates, fractured alibis, and psychological secrets in fog.',
      fr: 'Manoirs isolés, faux alibis et secrets psychologiques sous le brouillard.',
    },
    swatch: '#c99a5b',
    secondarySwatch: '#5e4830',
    defaultTone: {
      'pt-BR': 'Suspense Psicológico',
      en: 'Psychological Suspense',
      fr: 'Suspense Psychologique',
    },
    tones: {
      'pt-BR': ['Suspense Psicológico', 'Noir Clássico', 'Espionagem Fria', 'Enigma Gótico'],
      en: ['Psychological Suspense', 'Classic Noir', 'Cold War Spycraft', 'Gothic Whodunit'],
      fr: ['Suspense Psychologique', 'Noir Classique', 'Espionnage', 'Énigme Gothique'],
    },
    lore: {
      'pt-BR': {
        era: 'Outono de 1928 · Costa Bruma de Blackwood',
        history:
          'Sob a névoa espessa do litoral norte, fortunas industriais antigas guardam arquivos de subornos, desaparecimentos e testamentos contestados. A imprensa local só publica o que os círculos fechados permitem — e quem faz perguntas demais costuma sumir antes da balsa da manhã.',
        worldLaws:
          'Não há magia: tudo responde a álibis, psicologia, influência social e provas físicas. Cada testemunha mente sobre ao menos um detalhe e o tempo joga contra quem não protege suas pistas.',
        prologue:
          'Quando o último trem apita longe na neblina, a mansão e a cidade costeira ficam entregues apenas a velhos segredos. Cada convidado sorri com educação impecável — mas todos trouxeram algo para esconder dentro do casaco.',
        factions: [
          {
            name: 'Família Blackwood',
            description: 'Clã aristocrático cercado por dívidas ocultas e disputas de herança.',
            standing: 'wary',
            influence: 'Mansão & Banco Local',
          },
          {
            name: 'Sindicato do Cais',
            description: 'Estivadores e informantes que veem tudo o que embarca à noite.',
            standing: 'neutral',
            influence: 'Porto & Balsa',
          },
          {
            name: 'Círculo de Inspetores',
            description: 'Autoridades divididas entre fechar o caso rápido ou achar o culpado.',
            standing: 'neutral',
            influence: 'Delegacia & Arquivos',
          },
        ],
      },
      en: {
        era: 'Autumn 1928 · Blackwood Fog Coast',
        history:
          'Beneath dense Atlantic fog, old industrial fortunes hide blackmail ledgers, vanished witnesses, and forged wills. Polite society keeps shutters drawn until morning.',
        worldLaws:
          'Purely grounded realism: every twist hinges on alibis, leverage, social pressure, and physical evidence. Every witness conceals at least one truth.',
        prologue:
          'As the last coastal ferry horn fades into fog, locked parlors and quiet hallways become a chessboard of whispered motives and half-burned letters.',
        factions: [
          {
            name: 'House Blackwood',
            description: 'Fractured estate heirs bound by unspoken blackmail.',
            standing: 'wary',
            influence: 'Manor & Trust',
          },
          {
            name: 'Dockside Union',
            description: 'Night watchmen who track every crate and late arrival.',
            standing: 'neutral',
            influence: 'Pier & Town',
          },
          {
            name: 'Special Branch',
            description: 'Investigators torn between quiet cover-ups and hard truth.',
            standing: 'neutral',
            influence: 'Precinct Archives',
          },
        ],
      },
      fr: {
        era: 'Automne 1928 · Côte Embrumée de Blackwood',
        history:
          'Sous un épais brouillard côtier, de vieilles fortunes dissimulent chantages, testaments falsifiés et disparitions.',
        worldLaws:
          'Réalisme pur : alibis, psychologie, preuves matérielles et pression sociale dictent chaque scène.',
        prologue:
          'Lorsque le dernier train s’éloigne, chaque invité garde un sourire poli — et un secret prêt à éclater.',
        factions: [
          {
            name: 'Clan Blackwood',
            description: 'Héritiers divisés par le chantage et l’argent.',
            standing: 'wary',
            influence: 'Manoir',
          },
          {
            name: 'Syndicat du Port',
            description: 'Veilleurs connaissant chaque arrivée nocturne.',
            standing: 'neutral',
            influence: 'Quais',
          },
          {
            name: 'Brigade Spéciale',
            description: 'Enquêteurs partagés entre vérité et scandale étouffé.',
            standing: 'neutral',
            influence: 'Archives',
          },
        ],
      },
    },
    sparks: {
      'pt-BR': [
        {
          title: 'O Relógio da Ala Norte',
          premise:
            'Sete herdeiros receberam convites assinados por um anfitrião morto há três anos — e a ponte de acesso caiu logo após a chegada.',
        },
        {
          title: 'Memória em Branco',
          premise:
            'Você acorda em um sanatório costeiro com a chave de um cofre costurada no casaco e ninguém admite saber seu verdadeiro nome.',
        },
      ],
      en: [
        {
          title: 'The North Wing Clock',
          premise:
            'Seven heirs arrived following letters signed by a host buried three years ago — and the causeway washed out behind them.',
        },
        {
          title: 'Blank Casefile',
          premise:
            'You wake in a coastal clinic with a vault key stitched into your coat and staff insisting you checked yourself in voluntarily.',
        },
      ],
      fr: [
        {
          title: "L'Horloge de l'Aile Nord",
          premise:
            'Sept héritiers ont reçu une invitation signée par un hôte mort depuis trois ans — et le pont vient de s’effondrer.',
        },
        {
          title: 'Dossier Vierge',
          premise:
            'Vous vous réveillez dans une clinique côtière avec une clé cousue dans votre manteau et aucune archive à votre nom.',
        },
      ],
    },
    archetypes: [
      {
        id: 'detective',
        label: { 'pt-BR': 'Detetive Particular', en: 'Private Detective', fr: 'Détective Privé' },
        summary: {
          'pt-BR': 'Lê contradições no olhar alheio e não larga um fio solto.',
          en: 'Spots lies in small pauses and never drops a loose thread.',
          fr: 'Détecte les mensonges dans le moindre silence.',
        },
        skills: {
          'pt-BR': ['Dedução & Pistas', 'Interrogatório Sutil'],
          en: ['Deduction & Clues', 'Subtle Questioning'],
          fr: ['Déduction', 'Interrogatoire Subtil'],
        },
        traits: {
          'pt-BR': ['Cínico', 'Observador'],
          en: ['Cynical', 'Observant'],
          fr: ['Cynique', 'Observateur'],
        },
        starterItem: {
          name: { 'pt-BR': 'Caderno de Pistas & Lupa', en: 'Case Notebook & Loupe', fr: 'Carnet & Loupe' },
          category: 'clue',
          note: {
            'pt-BR': 'Cheio de anotações cifradas e horários suspeitos.',
            en: 'Packed with coded timestamps and suspect notes.',
            fr: 'Rempli de notes codées et horaires suspects.',
          },
        },
      },
      {
        id: 'spy',
        label: { 'pt-BR': 'Agente Infiltrado', en: 'Undercover Spy', fr: 'Agent Infiltré' },
        summary: {
          'pt-BR': 'Muda de identidade sem piscar e improvisa saídas impossíveis.',
          en: 'Shifts covers seamlessly and improvises clean exits.',
          fr: 'Change de couverture sans ciller et improvise des sorties.',
        },
        skills: {
          'pt-BR': ['Disfarce & Persuasão', 'Espionagem & Furtividade'],
          en: ['Cover & Persuasion', 'Stealth Tradecraft'],
          fr: ['Couverture & Persuasion', 'Infiltration'],
        },
        traits: {
          'pt-BR': ['Camaleão', 'Paranoico'],
          en: ['Chameleon', 'Paranoid'],
          fr: ['Caméléon', 'Paranoïaque'],
        },
        starterItem: {
          name: { 'pt-BR': 'Passaporte Falso de Latão', en: 'Forged Diplomatic Pass', fr: 'Faux Passeport' },
          category: 'tool',
          note: {
            'pt-BR': 'Abre portas restritas quando apresentado com confiança.',
            en: 'Opens restricted salons when flashed with poise.',
            fr: 'Ouvre les portes restreintes avec assurance.',
          },
        },
      },
      {
        id: 'doctor',
        label: { 'pt-BR': 'Médico / Legista', en: 'Forensic Doctor', fr: 'Médecin Légiste' },
        summary: {
          'pt-BR': 'Enxerga venenos, feridas ocultas e sinais de pânico clínico.',
          en: 'Reads poisons, concealed wounds, and clinical panic.',
          fr: 'Repère poisons, blessures cachées et signes cliniques.',
        },
        skills: {
          'pt-BR': ['Medicina & Toxicologia', 'Calma Sob Pressão'],
          en: ['Medicine & Toxicology', 'Clinical Calm'],
          fr: ['Médecine & Toxicologie', 'Calme Clinique'],
        },
        traits: {
          'pt-BR': ['Meticuloso', 'Empático'],
          en: ['Meticulous', 'Empathetic'],
          fr: ['Méticuleux', 'Empathique'],
        },
        starterItem: {
          name: { 'pt-BR': 'Maleta Médica de Campo', en: 'Field Medical Kit', fr: 'Trousse Médicale' },
          category: 'consumable',
          note: {
            'pt-BR': 'Contém ataduras, reagentes químicos e sedativo leve.',
            en: 'Contains sutures, toxin reagents, and mild sedative.',
            fr: 'Contient bandages, réactifs et sédatif léger.',
          },
        },
      },
      {
        id: 'patient',
        label: { 'pt-BR': 'Testemunha Amnésica', en: 'Amnesiac Witness', fr: 'Témoin Amnésique' },
        summary: {
          'pt-BR': 'Peças perdidas da própria mente são a chave do crime.',
          en: 'Fragments of your own missing memory hold the true key.',
          fr: 'Des fragments de votre mémoire détiennent la clé du mystère.',
        },
        skills: {
          'pt-BR': ['Instinto de Perigo', 'Memória Fragmentada'],
          en: ['Danger Instinct', 'Flashback Recall'],
          fr: ['Instinct de Danger', 'Mémoire Fragmentée'],
        },
        traits: {
          'pt-BR': ['Vulnerável', 'Intuitivo'],
          en: ['Vulnerable', 'Intuitive'],
          fr: ['Vulnérable', 'Intuitif'],
        },
        starterItem: {
          name: { 'pt-BR': 'Chave Numerada #407', en: 'Numbered Key #407', fr: 'Clé Numérotée #407' },
          category: 'clue',
          note: {
            'pt-BR': 'Estava escondida na barra do seu casaco.',
            en: 'Found sewn inside the lining of your coat.',
            fr: 'Trouvée cousue dans la doublure de votre manteau.',
          },
        },
      },
    ],
  },

  zombies: {
    id: 'zombies',
    name: {
      'pt-BR': 'Surto & Zumbis',
      en: 'Outbreak & Zombies',
      fr: 'Épidémie & Zombies',
    },
    aestheticLabel: {
      'pt-BR': 'Frequência de Sobrevivência',
      en: 'Survival Frequency',
      fr: 'Fréquence de Survie',
    },
    tagline: {
      'pt-BR': 'Quarentena colapsada, recursos contados e barulho que atrai o pior.',
      en: 'Collapsed quarantine, scarce supplies, and noise that draws the swarm.',
      fr: 'Quarantaine effondrée, ressources rares et bruit mortel.',
    },
    swatch: '#a3e635',
    secondarySwatch: '#3a5a40',
    defaultTone: {
      'pt-BR': 'Sobrevivência Claustrofóbica',
      en: 'Claustrophobic Survival',
      fr: 'Survie Claustrophobe',
    },
    tones: {
      'pt-BR': ['Sobrevivência Claustrofóbica', 'Drama Humano', 'Ação Militar Tática', 'Terror Biológico'],
      en: ['Claustrophobic Survival', 'Human Drama', 'Tactical Evac', 'Bio-Horror'],
      fr: ['Survie Claustrophobe', 'Drame Humain', 'Évacuation Tactique', 'Bio-Horreur'],
    },
    lore: {
      'pt-BR': {
        era: 'Dia 47 do Colapso · Zona de Quarentena Leste',
        history:
          'Nas primeiras duas semanas, as sirenes ainda tocavam e comboios militares tentavam conter o patógeno. No quadragésimo sétimo dia, a rede elétrica caiu em quase todo o vale, deixando hospitais em geradores moribundos e sobreviventes divididos entre cooperar ou trancar as portas para os outros.',
        worldLaws:
          'Qualquer barulho alto atrai infectados das quadras vizinhas; munição e medicamentos são finitos; uma mordida ou ferimento sem antisséptico pode selar seu destino em poucas horas.',
        prologue:
          'A cidade inteira virou um labirinto de vidros quebrados e rádios que quase ninguém mais responde. O gerador lá fora marca menos de quatro horas de combustível — e lá fora não são apenas os infectados que estão caçando.',
        factions: [
          {
            name: 'Corpo Médico Remanescente',
            description: 'Enfermeiros e cientistas tentando manter alas limpas e antídotos vivos.',
            standing: 'allied',
            influence: 'Hospital Central',
          },
          {
            name: 'Restos da 4ª Brigada',
            description: 'Soldados exaustos aplicando protocolos rígidos de evacuação.',
            standing: 'wary',
            influence: 'Postos da Ponte',
          },
          {
            name: 'Catadores do Túnel',
            description: 'Grupos armados que saqueiam farmácias e controlam passagens subterrâneas.',
            standing: 'hostile',
            influence: 'Metrô & Garagens',
          },
        ],
      },
      en: {
        era: 'Outbreak Day 47 · East Quarantine Zone',
        history:
          'For two weeks sirens wailed and military convoys held the perimeter. By Day 47 the valley grid went dark, leaving hospitals on failing generators and survivors split between cooperation and locked doors.',
        worldLaws:
          'Loud noise draws swarms across blocks; ammo and antibiotics are scarce; untreated wounds risk fatal fever within hours.',
        prologue:
          'The city has turned into shattered glass and dead radio bands. Your backup generator counts down its final hours while movement scrapes closer down the stairwell.',
        factions: [
          {
            name: 'Hospital Triage Unit',
            description: 'Doctors and nurses clinging to sterile wards and vaccine notes.',
            standing: 'allied',
            influence: 'St. Jude Ward',
          },
          {
            name: '4th Perimeter Remnant',
            description: 'Exhausted soldiers enforcing strict evacuation quotas.',
            standing: 'wary',
            influence: 'Bridge Checkpoints',
          },
          {
            name: 'Tunnel Scavengers',
            description: 'Armed raiders monopolizing subway bypasses and pharmacies.',
            standing: 'hostile',
            influence: 'Underground',
          },
        ],
      },
      fr: {
        era: 'Jour 47 · Zone de Quarantaine Est',
        history:
          'Après quarante-sept jours d’effondrement, le réseau électrique est mort et les rares survivants se barricadent entre hôpitaux et souterrains.',
        worldLaws:
          'Tout bruit attire la horde ; munitions et soins sont rares ; toute blessure non traitée est mortelle.',
        prologue:
          'La ville n’est plus qu’un labyrinthe silencieux où le générateur compte ses dernières heures.',
        factions: [
          {
            name: 'Équipe de Triage',
            description: 'Soignants préservant les derniers vaccins.',
            standing: 'allied',
            influence: 'Hôpital',
          },
          {
            name: 'Reste de la 4e Brigade',
            description: 'Militaires appliquant des ordres impitoyables.',
            standing: 'wary',
            influence: 'Ponts',
          },
          {
            name: 'Pilleurs des Tunnels',
            description: 'Bandes armées tenant le métro.',
            standing: 'hostile',
            influence: 'Souterrains',
          },
        ],
      },
    },
    sparks: {
      'pt-BR': [
        {
          title: 'Hospital Santa Clara — Ala B',
          premise:
            'O gerador reserva só dura quatro horas, há um sinal de rádio vindo do heliporto e o corredor principal acabou de perder as luzes.',
        },
        {
          title: 'Comboio da Ponte Norte',
          premise:
            'A última balsa de evacuação parte ao amanhecer, mas você precisa atravessar o bairro submerso levando suprimentos vitais.',
        },
      ],
      en: [
        {
          title: 'St. Jude Hospital — Ward B',
          premise:
            'Backup power has four hours left, a distress beacon pulses on the helipad, and the main stairwell lights just died.',
        },
        {
          title: 'North Bridge Convoy',
          premise:
            'The final evacuation barge leaves at dawn, but the flooded district between here and the docks is crawling with infected.',
        },
      ],
      fr: [
        {
          title: 'Hôpital Sainte-Claire — Aile B',
          premise:
            'Le générateur ne tient plus que quatre heures, un signal vient du toit et le couloir vient de plonger dans le noir.',
        },
        {
          title: 'Convoi du Pont Nord',
          premise:
            'La dernière barge part à l’aube, mais il faut traverser le quartier inondé avec des vivres.',
        },
      ],
    },
    archetypes: [
      {
        id: 'survivor',
        label: { 'pt-BR': 'Sobrevivente Urbano', en: 'Urban Survivor', fr: 'Survivant Urbain' },
        summary: {
          'pt-BR': 'Conhece telhados, rotas de fuga e como se mover sem fazer som.',
          en: 'Knows rooftops, escape ducts, and how to move in silence.',
          fr: 'Connaît les toits, les conduits et sait avancer sans bruit.',
        },
        skills: {
          'pt-BR': ['Furtividade & Saque', 'Improviso Urbano'],
          en: ['Stealth & Scavenging', 'Urban Improvisation'],
          fr: ['Furtivité & Pillage', 'Improvisation Urbaine'],
        },
        traits: {
          'pt-BR': ['Alerta Máximo', 'Pragmático'],
          en: ['Hyper-Vigilant', 'Pragmatic'],
          fr: ['Hyper-Vigilant', 'Pragmatique'],
        },
        starterItem: {
          name: { 'pt-BR': 'Pé-de-Cabra Enfaixado', en: 'Taped Crowbar', fr: 'Pied-de-Biche Bandé' },
          category: 'weapon',
          note: {
            'pt-BR': 'Abre portas emperradas sem o barulho de tiros.',
            en: 'Pries jammed doors without drawing ears with gunfire.',
            fr: 'Force les portes sans bruit de coup de feu.',
          },
        },
      },
      {
        id: 'soldier',
        label: { 'pt-BR': 'Soldado de Quarentena', en: 'Quarantine Soldier', fr: 'Soldat de Quarantaine' },
        summary: {
          'pt-BR': 'Treinado para segurar perímetros quando a cadeia de comando cai.',
          en: 'Trained to hold perimeters long after command goes dark.',
          fr: 'Entraîné à tenir un périmètre quand le commandement s’effondre.',
        },
        skills: {
          'pt-BR': ['Tiro & Perímetro', 'Primeiros Socorros'],
          en: ['Marksmanship', 'Field Trauma'],
          fr: ['Tir Tactique', 'Premiers Secours'],
        },
        traits: {
          'pt-BR': ['Disciplinado', 'Munição Contada'],
          en: ['Disciplined', 'Low Ammo'],
          fr: ['Discipliné', 'Munitions Comptées'],
        },
        starterItem: {
          name: { 'pt-BR': 'Rádio Militar & 6 Cartuchos', en: 'Tactical Radio & 6 Shells', fr: 'Radio Tactique & 6 Balles' },
          category: 'tool',
          note: {
            'pt-BR': 'Capta frequências criptografadas de resgate.',
            en: 'Picks up faint encrypted extraction frequencies.',
            fr: 'Capte les fréquences chiffrées de secours.',
          },
        },
      },
      {
        id: 'scientist',
        label: { 'pt-BR': 'Virologista / Cientista', en: 'Virologist / Scientist', fr: 'Virologue / Scientifique' },
        summary: {
          'pt-BR': 'Carrega amostras que podem salvar milhares — ou condenar o grupo.',
          en: 'Carries samples that could save thousands — or doom the group.',
          fr: 'Transporte des échantillons qui peuvent tout sauver ou condamner.',
        },
        skills: {
          'pt-BR': ['Biologia & Antídotos', 'Leitura de Contágio'],
          en: ['Virology & Meds', 'Contagion Analysis'],
          fr: ['Biologie & Antidotes', 'Analyse Virale'],
        },
        traits: {
          'pt-BR': ['Racional', 'Segredo de Laboratório'],
          en: ['Analytical', 'Lab Secret'],
          fr: ['Rationnel', 'Secret de Labo'],
        },
        starterItem: {
          name: { 'pt-BR': 'Cilindro Térmico Lacrado', en: 'Sealed Cryo Vial', fr: 'Cylindre Cryo Scellé' },
          category: 'relic',
          note: {
            'pt-BR': 'Mantém amostra viral ativa abaixo de zero.',
            en: 'Keeps live strain samples viable below zero.',
            fr: 'Préserve la souche virale sous zéro.',
          },
        },
      },
    ],
  },

  apocalyptic: {
    id: 'apocalyptic',
    name: {
      'pt-BR': 'Pós-Apocalipse',
      en: 'Post-Apocalyptic',
      fr: 'Post-Apocalyptique',
    },
    aestheticLabel: {
      'pt-BR': 'Cinzas & Cobre Queimado',
      en: 'Ash & Scorched Copper',
      fr: 'Cendres & Cuivre Brûlé',
    },
    tagline: {
      'pt-BR': 'Desertos de ferrugem, cidades-oásis e pactos em estradas sem lei.',
      en: 'Rust wastelands, oasis citadels, and pacts on lawless highways.',
      fr: 'Déserts de rouille, citadelles oasis et pactes sur routes sans loi.',
    },
    swatch: '#e07a3a',
    secondarySwatch: '#78350f',
    defaultTone: {
      'pt-BR': 'Faroeste Árido & Brutal',
      en: 'Arid Wasteland Drama',
      fr: 'Western Aride & Brutal',
    },
    tones: {
      'pt-BR': ['Faroeste Árido & Brutal', 'Épico de Reconstrução', 'Misticismo da Ferrugem', 'Estrada de Fúria'],
      en: ['Arid Wasteland Drama', 'Rebuilding Epic', 'Rust Mysticism', 'Fury Highway'],
      fr: ['Western Aride', 'Épopée de Reconstruction', 'Mysticisme de Rouille', 'Route de Furie'],
    },
    lore: {
      'pt-BR': {
        era: '72 Anos Após as Cinzas · Mar de Sal & Rodovia Quebrada',
        history:
          'Quando os antigos reatores evaporaram os mares internos, restaram planícies de sal, esqueletos de pontes e poucas cidades-oásis construídas sobre cisternas fundas. Hoje água limpa vale mais que ouro, caravanas cruzam tempestades vermelhas e cada relíquia pré-colapso pode reacender uma cidade inteira — ou provocar uma guerra.',
        worldLaws:
          'Água e combustível decidem até onde se sobrevive; tempestades de cinzas cegam radares e queimam pulmões sem filtro; a palavra dada entre mensageiros ainda é a última moeda respeitada na estrada.',
        prologue:
          'Sob o sol cor de cobre, o horizonte inteiro cheira a poeira antiga e óleo queimado. Entre os restos da velha civilização, quem sobrevive não é o mais forte — é quem entende qual promessa manter e qual aliança quebrar antes da tempestade chegar.',
        factions: [
          {
            name: 'Cidadela Zero',
            description: 'Fortaleza construída sobre a última grande bomba aquífera da região.',
            standing: 'neutral',
            influence: 'Controle da Água',
          },
          {
            name: 'Liga dos Mensageiros',
            description: 'Corredores neutros que levam cartas, remédios e códigos entre abrigos.',
            standing: 'allied',
            influence: 'Todas as Estradas',
          },
          {
            name: 'Corvos da Ferrugem',
            description: 'Saqueadores motorizados que cobram pedágio sangrento nos cânions.',
            standing: 'hostile',
            influence: 'Rodovias do Sul',
          },
        ],
      },
      en: {
        era: '72 Years After the Ashfall · Salt Flats',
        history:
          'When old reactors boiled away the inland seas, they left salt plains, snapped overpasses, and sparse oasis citadels built atop deep aquifers. Clean water outprices gold, and a single pre-collapse device can restart a town—or spark a war.',
        worldLaws:
          'Water and fuel dictate survival range; ash squalls blind optics and scorch lungs without filters; a courier’s kept word remains sacred currency.',
        prologue:
          'Under a copper sky smelling of hot iron and dust, survival belongs not to the loudest gun—but to whoever reads the road before the horizon turns red.',
        factions: [
          {
            name: 'Citadel Zero',
            description: 'Walled oasis sitting atop the deepest remaining aquifer.',
            standing: 'neutral',
            influence: 'Water Monopoly',
          },
          {
            name: 'Courier Guild',
            description: 'Sworn runners carrying medicine and seals between bunkers.',
            standing: 'allied',
            influence: 'Open Highways',
          },
          {
            name: 'Rust Crows',
            description: 'Motorized highway raiders demanding blood tolls in canyons.',
            standing: 'hostile',
            influence: 'Southern Badlands',
          },
        ],
      },
      fr: {
        era: '72 Ans Après les Cendres · Mer de Sel',
        history:
          'Après la chute des anciens réacteurs, seules quelques citadelles oasis survivent sur des nappes profondes, entourées de déserts de ferraille.',
        worldLaws:
          'L’eau pure et le carburant décident de tout ; la parole d’un courrier reste sacrée sur les routes.',
        prologue:
          'Sous un soleil couleur de cuivre, chaque relique retrouvée peut sauver une cité — ou déclencher une guerre.',
        factions: [
          {
            name: 'Citadelle Zéro',
            description: 'Cité fortifiée tenant la plus grande réserve d’eau.',
            standing: 'neutral',
            influence: 'Contrôle de l’eau',
          },
          {
            name: 'Guilde des Courriers',
            description: 'Messagers neutres reliant les abris isolés.',
            standing: 'allied',
            influence: 'Routes ouvertes',
          },
          {
            name: 'Corbeaux de Rouille',
            description: 'Pillards motorisés des canyons.',
            standing: 'hostile',
            influence: 'Sud aride',
          },
        ],
      },
    },
    sparks: {
      'pt-BR': [
        {
          title: 'A Entrega para Cidadela Zero',
          premise:
            'Você cruza o Mar de Sal com uma maleta selada para um líder que ninguém vê há dez anos — e saqueadores cercam o posto de água.',
        },
        {
          title: 'Reator Adormecido',
          premise:
            'Um abrigo subterrâneo abriu as comportas pela primeira vez em décadas, despertando ganância entre todas as tribos vizinhas.',
        },
      ],
      en: [
        {
          title: 'Parcel for Citadel Zero',
          premise:
            'You cross the Salt Flats carrying a locked courier case for a ruler unseen in a decade — while raiders surround the last water pump.',
        },
        {
          title: 'The Sleeping Reactor',
          premise:
            'A pre-collapse vault cracked open after fifty years, drawing rival clans toward a prize none of them truly understand.',
        },
      ],
      fr: [
        {
          title: 'Colis pour Citadelle Zéro',
          premise:
            'Vous traversez les marais salants avec une mallette scellée tandis que des pillards encerclent le puits.',
        },
        {
          title: 'Le Réacteur Endormi',
          premise:
            'Un abri souterrain vient de s’ouvrir après cinquante ans, attirant tous les clans voisins.',
        },
      ],
    },
    archetypes: [
      {
        id: 'courier',
        label: { 'pt-BR': 'Mensageiro das Cinzas', en: 'Wasteland Courier', fr: 'Courrier des Cendres' },
        summary: {
          'pt-BR': 'Sobrevive cruzando zonas mortas com entregas que valem guerras.',
          en: 'Crosses dead zones carrying parcels worth starting wars over.',
          fr: 'Traverse les zones mortes avec des colis valant des guerres.',
        },
        skills: {
          'pt-BR': ['Navegação & Sobrevivência', 'Negociação de Estrada'],
          en: ['Wasteland Survival', 'Barter & Grit'],
          fr: ['Survie en Désert', 'Troc & Sang-Froid'],
        },
        traits: {
          'pt-BR': ['Incansável', 'Palavra Sagrada'],
          en: ['Relentless', 'Kept Word'],
          fr: ['Infatigable', 'Parole Sacrée'],
        },
        starterItem: {
          name: { 'pt-BR': 'Cantil Filtrante & Mapa', en: 'Filter Canteen & Road Map', fr: 'Gourde Filtrante & Carte' },
          category: 'tool',
          note: {
            'pt-BR': 'Marca fontes escondidas e rotas de tempestade.',
            en: 'Marks hidden cisterns and dust-storm shelters.',
            fr: 'Indique citernes cachées et abris.',
          },
        },
      },
      {
        id: 'survivor',
        label: { 'pt-BR': 'Sucateiro Engenheiro', en: 'Scrap Mechanic', fr: 'Ferrailleur Ingénieur' },
        summary: {
          'pt-BR': 'Transforma sucata do velho mundo em armas, filtros e esperança.',
          en: 'Turns old-world scrap into weapons, filters, and lifelines.',
          fr: 'Transforme la ferraille en armes et systèmes vitaux.',
        },
        skills: {
          'pt-BR': ['Mecânica & Reparo', 'Detecção de Armadilhas'],
          en: ['Scrap Engineering', 'Trap Spotting'],
          fr: ['Mécanique & Réparation', 'Détection de Pièges'],
        },
        traits: {
          'pt-BR': ['Inventivo', 'Mãos de Graxa'],
          en: ['Inventive', 'Grease-Stained'],
          fr: ['Inventif', 'Mains Pleines de Suie'],
        },
        starterItem: {
          name: { 'pt-BR': 'Multiferramenta Solar', en: 'Solar Multi-Tool', fr: 'Multi-Outil Solaire' },
          category: 'tool',
          note: {
            'pt-BR': 'Maçarico de pulso curto e chave universal.',
            en: 'Short-arc torch and universal ratchet.',
            fr: 'Chalumeau à impulsion et clé universelle.',
          },
        },
      },
      {
        id: 'soldier',
        label: { 'pt-BR': 'Guardião de Comboio', en: 'Convoy Guard', fr: 'Garde de Convoi' },
        summary: {
          'pt-BR': 'Escolta caravanas entre cânions e nunca dispara em vão.',
          en: 'Escorts caravans through canyons and never wastes a round.',
          fr: 'Escorte les caravanes et ne gaspille jamais une balle.',
        },
        skills: {
          'pt-BR': ['Combate Pesado', 'Intimidação'],
          en: ['Heavy Combat', 'Intimidation'],
          fr: ['Combat Lourd', 'Intimidation'],
        },
        traits: {
          'pt-BR': ['Imponente', 'Protetor'],
          en: ['Imposing', 'Protector'],
          fr: ['Imposant', 'Protecteur'],
        },
        starterItem: {
          name: { 'pt-BR': 'Revólver de Ferro Velho', en: 'Ironwork Revolver', fr: 'Revolver de Ferraille' },
          category: 'weapon',
          note: {
            'pt-BR': 'Pesado, confiável mesmo cheio de poeira.',
            en: 'Heavy six-shooter that fires through grit and ash.',
            fr: 'Fiable même couvert de poussière.',
          },
        },
      },
    ],
  },
};

export interface DifficultyMeta {
  id: DifficultyId;
  dc: number;
  label: Record<LanguageId, string>;
  subtitle: Record<LanguageId, string>;
  philosophy: Record<LanguageId, string>;
}

export const DIFFICULTIES: DifficultyMeta[] = [
  {
    id: 'easy',
    dc: 7,
    label: { 'pt-BR': 'Fácil', en: 'Easy', fr: 'Facile' },
    subtitle: { 'pt-BR': 'DC 7 · Foco na história', en: 'DC 7 · Story first', fr: 'DD 7 · Histoire avant tout' },
    philosophy: {
      'pt-BR': 'O mundo favorece heroísmo e descobertas sem punições severas.',
      en: 'The world favors heroic momentum with gentle consequences.',
      fr: 'Le monde favorise l’élan héroïque sans punitions sévères.',
    },
  },
  {
    id: 'normal',
    dc: 11,
    label: { 'pt-BR': 'Normal', en: 'Normal', fr: 'Normal' },
    subtitle: { 'pt-BR': 'DC 11 · Equilíbrio clássico', en: 'DC 11 · Balanced stakes', fr: 'DD 11 · Équilibre classique' },
    philosophy: {
      'pt-BR': 'Sucessos parciais geram reviravoltas; boas táticas recompensam.',
      en: 'Partial hits create drama; smart tactics pay off.',
      fr: 'Les réussites partielles créent des rebondissements.',
    },
  },
  {
    id: 'hard',
    dc: 14,
    label: { 'pt-BR': 'Difícil', en: 'Hard', fr: 'Difficile' },
    subtitle: { 'pt-BR': 'DC 14 · Cada erro cobra preço', en: 'DC 14 · Mistakes bite back', fr: 'DD 14 · Chaque erreur se paie' },
    philosophy: {
      'pt-BR': 'Recursos importam, inimigos são espertos e riscos elevados exigem preparo.',
      en: 'Supplies matter, foes adapt, and reckless risks hurt.',
      fr: 'Les ressources comptent et les risques inconsidérés blessent.',
    },
  },
  {
    id: 'insane',
    dc: 17,
    label: { 'pt-BR': 'Insano', en: 'Insane', fr: 'Insensé' },
    subtitle: { 'pt-BR': 'DC 17 · Sobrevivência brutal', en: 'DC 17 · Brutal survival', fr: 'DD 17 · Survie brutale' },
    philosophy: {
      'pt-BR': 'O mundo é hostil e imprevisível. Use itens e sinergias para sobreviver.',
      en: 'Hostile world. Lean on skills, leverage, and items to survive.',
      fr: 'Monde hostile. Exploitez chaque compétence et objet.',
    },
  },
  {
    id: 'good-luck',
    dc: 19,
    label: { 'pt-BR': 'Boa Sorte', en: 'Good Luck', fr: 'Bonne Chance' },
    subtitle: { 'pt-BR': 'DC 19 · Impiedoso', en: 'DC 19 · Unforgiving fate', fr: 'DD 19 · Destin impitoyable' },
    philosophy: {
      'pt-BR': 'Até ações simples cobram tensão. Somente astúcia extrema evita a ruína.',
      en: 'Even routine moves carry peril. Only cunning escapes ruin.',
      fr: 'Même les gestes simples comportent un péril mortel.',
    },
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'pt-BR',
  difficulty: 'normal',
  readerFont: "'Newsreader', Georgia, serif",
  readerFontSize: 18,
  colorMode: 'dark',
  responseLength: 'literary',
  narrativeStyle: 'balanced',
  narrativePerspective: 'adaptive',
  customAiInstructions: '',
  livingWorldEnabled: false,
  livingWorldSeconds: 60,
  diceAnimations: true,
  autoIllustrateScenes: false,
  weatherEffectsEnabled: true,
  ambientSoundEnabled: false,
  ambientVolume: 0.35,
  geminiApiKey: '',
  geminiModel: 'gemini-3.8-flash',
  forceDemoMode: false,
};

export const READER_FONT_OPTIONS = [
  { label: 'Newsreader (Literário)', value: "'Newsreader', Georgia, serif" },
  { label: 'Inter (Editorial Limpo)', value: "'Inter', system-ui, sans-serif" },
  { label: 'JetBrains Mono (Terminal)', value: "'JetBrains Mono', monospace" },
  { label: 'Georgia (Clássico)', value: 'Georgia, serif' },
];

export const RANDOM_PROTAGONISTS: Record<WorldThemeId, Array<{ name: string; age: number; trait: string }>> = {
  fantasy: [
    { name: 'Theron Vale', age: 29, trait: 'Juramento Quebrado' },
    { name: 'Lyra Nocturne', age: 24, trait: 'Sangue Antigo' },
    { name: 'Kaelen Ashford', age: 34, trait: 'Cicatriz de Bruma' },
  ],
  cyberpunk: [
    { name: 'Kira-09', age: 26, trait: 'Memória Editada' },
    { name: 'Vex Solis', age: 31, trait: 'Fantasma da Rede' },
    { name: 'Dante Chrome', age: 36, trait: 'Reflexo Sobrehumano' },
  ],
  mystery: [
    { name: 'Helena Vance', age: 37, trait: 'Insônia Crônica' },
    { name: 'Arthur Moreau', age: 42, trait: 'Olhar Clínico' },
    { name: 'Clara Sterling', age: 28, trait: 'Passado Rasurado' },
  ],
  zombies: [
    { name: 'Mateus Cruz', age: 32, trait: 'Passo Silencioso' },
    { name: 'Dra. Nora Chen', age: 35, trait: 'Sangue Frio' },
    { name: 'Lucas Braga', age: 27, trait: 'Instinto Urbano' },
  ],
  apocalyptic: [
    { name: 'Soren Rust', age: 33, trait: 'Guia das Tempestades' },
    { name: 'Maya Vesper', age: 27, trait: 'Mãos de Aço' },
    { name: 'Jonas Ferro', age: 40, trait: 'Sobrevivente Nato' },
  ],
};

export const STORY_PACE_OPTIONS: Array<{
  id: StoryPace;
  label: Record<LanguageId, string>;
  description: Record<LanguageId, string>;
}> = [
  {
    id: 'epic',
    label: {
      'pt-BR': 'Crônica Longa & Épica',
      en: 'Long Epic Chronicle',
      fr: 'Chronique Longue & Épique',
    },
    description: {
      'pt-BR': 'Evolução gradual em múltiplos arcos, tramas secundárias e relações profundas sem apressar o fim.',
      en: 'Slow-burn multi-arc journey with layered subplots and deep alliances—never rushes an ending.',
      fr: 'Progression lente sur plusieurs arcs sans précipiter la fin.',
    },
  },
  {
    id: 'endless',
    label: {
      'pt-BR': 'Mundo Aberto Sem Fim',
      en: 'Endless Open Sandbox',
      fr: 'Monde Ouvert Infini',
    },
    description: {
      'pt-BR': 'Exploração livre contínua com novas ameaças, cidades e ganchos surgindo indefinidamente.',
      en: 'Continuous open-ended world with evolving factions, rumors, and quests forever.',
      fr: 'Exploration continue avec de nouveaux enjeux indéfiniment.',
    },
  },
  {
    id: 'focused',
    label: {
      'pt-BR': 'Arco Focado',
      en: 'Focused Arc',
      fr: 'Arc Ciblé',
    },
    description: {
      'pt-BR': 'Narrativa mais direta centrada no conflito principal até sua resolução.',
      en: 'Tighter pacing driving steadily toward the central conflict.',
      fr: 'Rythme plus direct centré sur le conflit principal.',
    },
  },
];

export function createInstantDemoCampaign(language: LanguageId = 'pt-BR'): Campaign {
  const now = Date.now();
  const lore = WORLD_THEMES.fantasy.lore[language];

  if (language === 'en') {
    const coverArt = generateDemoSceneArt(
      'fantasy',
      'The Ashes of Larion',
      'Briarhollow Village',
      'Suspicious Fog',
    );
    const portraitArt = generateDemoPortraitArt(
      'fantasy',
      'James of Larion',
      'Sworn Knight',
    );
    const player = {
      name: 'James of Larion',
      age: 28,
      occupation: 'Sworn Knight',
      portraitUrl: portraitArt,
      portraitEngine: 'demo' as const,
      level: 1,
      xp: 25,
      xpToNextLevel: 100,
      attributePoints: 0,
      attributes: { str: 15, dex: 12, con: 14, int: 10, wis: 12, cha: 12 },
      vigor: 108,
      maxVigor: 116,
      tension: 28,
      traits: ['Honorable', 'Unbroken Oath'],
      skills: ['Tactical Swordplay', 'Iron Resolve'],
      skillLevels: [
        { name: 'Tactical Swordplay', level: 2, attribute: 'str' as const, xp: 35 },
        { name: 'Iron Resolve', level: 1, attribute: 'wis' as const, xp: 15 },
      ],
      talents: [
        {
          id: 'tal_larion_oath',
          name: 'Oath of Larion',
          description: 'Steady poise under pressure; villagers and soldiers recognize your discipline.',
          unlockedTurn: 0,
        },
      ],
      currency: { amount: 120, label: 'Gold' },
      inventory: [
        {
          id: 'item_sword',
          name: 'Larion Steel Longsword',
          category: 'weapon' as const,
          quantity: 1,
          note: 'Engraved with the old royal sigil.',
          rarity: 'uncommon' as const,
          equipSlot: 'weapon' as const,
          equipped: true,
          bonuses: { str: 1 },
        },
        {
          id: 'item_seal',
          name: 'Wax-Sealed Royal Writ',
          category: 'clue' as const,
          quantity: 1,
          note: 'Grants authority — or paints a target on your back.',
        },
        {
          id: 'item_tonic',
          name: 'Bitterroot Field Tonic',
          category: 'consumable' as const,
          quantity: 1,
          note: 'Restores vigor when bruised or bleeding.',
        },
      ],
      quests: [
        {
          id: 'q_princess',
          title: 'Track the Princess Beyond Vespera',
          description: 'Discover why the villagers fear speaking her name and follow the carriage trail.',
          status: 'active' as const,
          primary: true,
        },
      ],
      journal: [],
    };
    const codex = {
      npcs: [
        {
          id: 'npc_bram',
          name: 'Blacksmith Bram',
          role: 'Village Blacksmith',
          stance: 'suspicious' as const,
          status: 'alive' as const,
          affinity: -10,
          relationship: 'stranger' as const,
          lastSeenLocation: 'Briarhollow Village',
          notes: 'Grips a hot poker near the well while keeping eyes fixed on Vespera Woods.',
          firstMetTurn: 0,
        },
      ],
      locations: [
        {
          id: 'loc_briarhollow',
          name: 'Briarhollow Village',
          description: 'Rain-slick border hamlet three days from Larion citadel, silent behind bolted shutters.',
          danger: 'tense' as const,
          kind: 'city' as const,
          status: 'explored' as const,
          visitCount: 1,
          firstVisitedTurn: 0,
        },
      ],
      factions: lore.factions.map((f, idx) => ({
        id: `fac_demo_${idx}`,
        ...f,
      })),
      canonFacts: [
        {
          id: 'fact_demo_1',
          text: 'Princess Lyra vanished three nights ago on the border road near Vespera Woods.',
          turn: 0,
          pinned: true,
        },
        {
          id: 'fact_demo_2',
          text: 'King Aldric secretly entrusted James with a wax-sealed Royal Writ instead of sending an army.',
          turn: 0,
          pinned: true,
        },
      ],
    };
    const actions = [
      {
        id: 'act_1',
        label: 'Show the blacksmith the Royal Writ and ask what happened here',
        intent: 'diplomatic' as const,
        risk: 'safe' as const,
        requiresRoll: false,
        attribute: 'cha' as const,
        effectTag: 'Bond',
      },
      {
        id: 'act_2',
        label: 'Kneel quietly beside the carriage ruts and inspect the silver silk',
        intent: 'investigate' as const,
        risk: 'safe' as const,
        requiresRoll: false,
        attribute: 'int' as const,
        effectTag: 'Clue',
      },
      {
        id: 'act_3',
        label: 'Slip past the forge unseen into the fog-choked edge of Vespera Woods',
        intent: 'stealth' as const,
        risk: 'medium' as const,
        requiresRoll: true,
        rollSkillHint: 'Stealth',
        attribute: 'dex' as const,
        effectTag: 'Explore',
      },
    ];

    return {
      id: `camp_demo_larion_${now}`,
      createdAt: now,
      updatedAt: now,
      world: {
        title: 'The Ashes of Larion',
        primaryTheme: 'fantasy',
        genres: ['Dark Fantasy', 'Mystery'],
        tone: 'Epic & Melancholic',
        era: lore.era,
        history: lore.history,
        worldLaws: lore.worldLaws,
        premise:
          'King Aldric sent you to find the missing princess beyond Vespera Woods, yet every village along the road seems to obey an older pact.',
        storyPace: 'epic',
        matureMode: true,
      },
      player,
      codex,
      status: 'active',
      arcNumber: 1,
      eraSummaries: [],
      coverImageUrl: coverArt,
      difficulty: 'normal',
      language: 'en',
      currentChapter: 1,
      currentLocation: 'Briarhollow Village',
      currentMood: 'Suspicious Fog',
      turnCount: 0,
      journalEntryCount: 0,
      engineUsed: 'demo',
      entries: [
        {
          id: 'entry_prologue',
          role: 'prologue',
          turn: 0,
          chapter: 0,
          sceneTitle: 'Prologue · A Realm Under the Split Eclipse',
          location: 'Kingdom of Larion',
          mood: lore.era,
          text: `${lore.history}\n\n${lore.prologue}`,
          imageUrl: coverArt,
          imageCaption: 'Kingdom of Larion · Split Eclipse',
          imageEngine: 'demo',
          timestamp: now - 1000,
        },
        {
          id: 'entry_intro',
          role: 'narrator',
          turn: 0,
          chapter: 1,
          sceneTitle: 'Chapter I · Shutters at Dusk',
          location: 'Briarhollow Village',
          mood: 'Suspicious Fog',
          text:
            'Rain clings to your mail as you ride past the crooked milestone of Briarhollow. Three days out from the citadel of Larion, the king’s crest on your cloak no longer buys respect—only closed shutters and lanterns snuffed before you reach the square.\n\nNear the stone well, an elderly blacksmith rests one hand on a hot poker while watching the edge of Vespera Woods. Fresh carriage ruts cut deep through the mud toward the treeline, abruptly ending beside a torn strip of silver silk.',
          timestamp: now,
        },
      ],
      actions,
    };
  }

  const coverArtPt = generateDemoSceneArt(
    'fantasy',
    'As Cinzas de Larion',
    'Aldeia de Briarhollow',
    'Névoa Desconfiada',
  );
  const portraitArtPt = generateDemoPortraitArt(
    'fantasy',
    'James de Larion',
    'Cavaleiro Juramentado',
  );

  const player = {
    name: 'James de Larion',
    age: 28,
    occupation: 'Cavaleiro Juramentado',
    portraitUrl: portraitArtPt,
    portraitEngine: 'demo' as const,
    level: 1,
    xp: 25,
    xpToNextLevel: 100,
    attributePoints: 0,
    attributes: { str: 15, dex: 12, con: 14, int: 10, wis: 12, cha: 12 },
    vigor: 108,
    maxVigor: 116,
    tension: 28,
    traits: ['Honrado', 'Juramento Inabalável'],
    skills: ['Esgrima Tática', 'Vontade Inabalável'],
    skillLevels: [
      { name: 'Esgrima Tática', level: 2, attribute: 'str' as const, xp: 35 },
      { name: 'Vontade Inabalável', level: 1, attribute: 'wis' as const, xp: 15 },
    ],
    talents: [
      {
        id: 'tal_larion_oath',
        name: 'Juramento de Larion',
        description: 'Postura inabalável sob pressão; aldeões e soldados reconhecem sua disciplina.',
        unlockedTurn: 0,
      },
    ],
    currency: { amount: 120, label: 'Ouro' },
    inventory: [
      {
        id: 'item_sword',
        name: 'Espada de Aço de Larion',
        category: 'weapon' as const,
        quantity: 1,
        note: 'Gravada com o antigo selo real.',
        rarity: 'uncommon' as const,
        equipSlot: 'weapon' as const,
        equipped: true,
        bonuses: { str: 1 },
      },
      {
        id: 'item_seal',
        name: 'Salvo-Conduto Real Lacrado',
        category: 'clue' as const,
        quantity: 1,
        note: 'Impõe autoridade — ou revela quem você serve.',
      },
      {
        id: 'item_tonic',
        name: 'Tônico de Raiz Amarga',
        category: 'consumable' as const,
        quantity: 1,
        note: 'Recupera vigor após confrontos ou veneno leve.',
      },
    ],
    quests: [
      {
        id: 'q_princess',
        title: 'Encontrar a Princesa além de Vespera',
        description: 'Descobrir por que os aldeões temem pronunciar seu nome e seguir o rastro da carruagem.',
        status: 'active' as const,
        primary: true,
      },
    ],
    journal: [],
  };
  const codex = {
    npcs: [
      {
        id: 'npc_bram',
        name: 'Ferreiro Bram',
        role: 'Ferreiro da Aldeia',
        stance: 'suspicious' as const,
        status: 'alive' as const,
        affinity: -10,
        relationship: 'stranger' as const,
        lastSeenLocation: 'Aldeia de Briarhollow',
        notes: 'Segura um ferro em brasa perto do poço sem tirar os olhos da Floresta de Vespera.',
        firstMetTurn: 0,
      },
    ],
    locations: [
      {
        id: 'loc_briarhollow',
        name: 'Aldeia de Briarhollow',
        description: 'Vilarejo fronteiriço silencioso sob chuva fria, três dias além da cidadela de Larion.',
        danger: 'tense' as const,
        kind: 'city' as const,
        status: 'explored' as const,
        visitCount: 1,
        firstVisitedTurn: 0,
      },
    ],
    factions: lore.factions.map((f, idx) => ({
      id: `fac_demo_${idx}`,
      ...f,
    })),
    canonFacts: [
      {
        id: 'fact_demo_1',
        text: 'A princesa desapareceu há três noites na estrada que margeia a Floresta de Vespera.',
        turn: 0,
        pinned: true,
      },
      {
        id: 'fact_demo_2',
        text: 'O rei confiou a James um Salvo-Conduto secreto em vez de enviar tropas para não despertar o Pacto de Vespera.',
        turn: 0,
        pinned: true,
      },
    ],
  };
  const actions = [
    {
      id: 'act_1',
      label: 'Mostrar o Salvo-Conduto Real ao ferreiro e perguntar o que aconteceu',
      intent: 'diplomatic' as const,
      risk: 'safe' as const,
      requiresRoll: false,
      attribute: 'cha' as const,
      effectTag: 'Vínculo',
    },
    {
      id: 'act_2',
      label: 'Ajoelhar junto aos sulcos na lama e examinar a seda prateada',
      intent: 'investigate' as const,
      risk: 'safe' as const,
      requiresRoll: false,
      attribute: 'int' as const,
      effectTag: 'Pista',
    },
    {
      id: 'act_3',
      label: 'Contornar a forja sem ser visto e infiltrar-se na névoa até a floresta',
      intent: 'stealth' as const,
      risk: 'medium' as const,
      requiresRoll: true,
      rollSkillHint: 'Furtividade',
      attribute: 'dex' as const,
      effectTag: 'Explorar',
    },
  ];

  return {
    id: `camp_demo_larion_${now}`,
    createdAt: now,
    updatedAt: now,
    world: {
      title: 'As Cinzas de Larion',
      primaryTheme: 'fantasy',
      genres: ['Fantasia Sombria', 'Mistério'],
      tone: 'Épico & Melancólico',
      era: lore.era,
      history: lore.history,
      worldLaws: lore.worldLaws,
      premise:
        'O rei enviou você para encontrar a princesa desaparecida além da Floresta de Vespera, mas cada vilarejo na estrada parece obedecer a um pacto mais antigo.',
      storyPace: 'epic',
      matureMode: true,
    },
    player,
    codex,
    status: 'active',
    arcNumber: 1,
    eraSummaries: [],
    coverImageUrl: coverArtPt,
    difficulty: 'normal',
    language: 'pt-BR',
    currentChapter: 1,
    currentLocation: 'Aldeia de Briarhollow',
    currentMood: 'Névoa Desconfiada',
    turnCount: 0,
    journalEntryCount: 0,
    engineUsed: 'demo',
    entries: [
      {
        id: 'entry_prologue',
        role: 'prologue',
        turn: 0,
        chapter: 0,
        sceneTitle:
          language === 'fr'
            ? 'Prélude · Un Royaume sous l’Éclipse'
            : 'Prólogo · O Reino Sob o Eclipse',
        location: 'Reino de Larion',
        mood: lore.era,
        text: `${lore.history}\n\n${lore.prologue}`,
        imageUrl: coverArtPt,
        imageCaption: 'Reino de Larion · Era do Eclipse Partido',
        imageEngine: 'demo',
        timestamp: now - 1000,
      },
      {
        id: 'entry_intro',
        role: 'narrator',
        turn: 0,
        chapter: 1,
        sceneTitle: 'Capítulo I · Janelas Fechadas ao Crepúsculo',
        location: 'Aldeia de Briarhollow',
        mood: 'Névoa Desconfiada',
        text:
          'A chuva escorre fria pela cota de malha quando você cruza o marco de pedra torto de Briarhollow. Três dias distante da cidadela de Larion, o brasão do rei em seu manto já não compra reverência — apenas postigos fechando com pressa e lamparinas apagadas antes que seu cavalo alcance a praça.\n\nJunto ao poço central, um ferreiro idoso apoia a mão em um ferro em brasa sem tirar os olhos da orla da Floresta de Vespera. Sulcos recentes de carruagem cortam a lama em direção às árvores e terminam bruscamente ao lado de um retalho de seda prateada preso a um espinheiro.',
        timestamp: now,
      },
    ],
    actions,
  };
}

export const INTENT_LABELS: Record<ActionIntent, Record<LanguageId, string>> = {
  bold: { 'pt-BR': 'Ousado', en: 'Bold', fr: 'Audacieux' },
  stealth: { 'pt-BR': 'Furtivo', en: 'Stealth', fr: 'Furtif' },
  diplomatic: { 'pt-BR': 'Diplomático', en: 'Diplomatic', fr: 'Diplomatique' },
  investigate: { 'pt-BR': 'Investigar', en: 'Investigate', fr: 'Enquêter' },
  survival: { 'pt-BR': 'Sobreviver', en: 'Survival', fr: 'Survie' },
  item: { 'pt-BR': 'Item', en: 'Item', fr: 'Objet' },
};

export const UI_COPY: Record<
  LanguageId,
  {
    sanctuaryTitle: string;
    sanctuarySubtitle: string;
    forgeNew: string;
    playInstantDemo: string;
    savedCampaigns: string;
    noCampaigns: string;
    continueStory: string;
    importSave: string;
    exportSave: string;
    deleteSave: string;
    confirmDelete: string;
    focusMode: string;
    livingWorld: string;
    paused: string;
    advanceWorld: string;
    settings: string;
    sheetTab: string;
    inventoryTab: string;
    worldTab: string;
    questsTab: string;
    chronicleTab: string;
    actionPlaceholder: string;
    sendAction: string;
    weaving: string;
    useInAction: string;
    summarizeNow: string;
    backHome: string;
    demoBadge: string;
    geminiBadge: string;
  }
> = {
  'pt-BR': {
    sanctuaryTitle: 'Onde mundos respiram com você.',
    sanctuarySubtitle:
      'Construa a atmosfera, defina a letalidade do destino e viva crônicas interativas guiadas por inteligência artificial e regras reais.',
    forgeNew: 'Forjar Nova Crônica',
    playInstantDemo: 'Demo Instantânea: Cinzas de Larion',
    savedCampaigns: 'Estante de Campanhas',
    noCampaigns:
      'Nenhuma crônica salva ainda. Forje um novo universo ou experimente a aventura pronta de Larion.',
    continueStory: 'Continuar Crônica',
    importSave: 'Importar JSON',
    exportSave: 'Exportar',
    deleteSave: 'Excluir',
    confirmDelete: 'Confirmar?',
    focusMode: 'Modo Foco',
    livingWorld: 'Mundo Vivo',
    paused: 'Pausado',
    advanceWorld: 'Avançar Cena',
    settings: 'Ajustes',
    sheetTab: 'Ficha',
    inventoryTab: 'Mochila',
    worldTab: 'Mundo',
    questsTab: 'Objetivos',
    chronicleTab: 'Crônica',
    actionPlaceholder: 'Descreva o que você faz, diz ou investiga...',
    sendAction: 'Agir',
    weaving: 'Tecendo consequências...',
    useInAction: 'Usar na ação',
    summarizeNow: 'Registrar Capítulo',
    backHome: 'Santuário',
    demoBadge: 'Modo Demo',
    geminiBadge: 'Gemini IA',
  },
  en: {
    sanctuaryTitle: 'Where worlds breathe with you.',
    sanctuarySubtitle:
      'Shape the atmosphere, calibrate fate’s lethality, and live adaptive interactive chronicles driven by AI and real tabletop stakes.',
    forgeNew: 'Forge New Chronicle',
    playInstantDemo: 'Instant Demo: Ashes of Larion',
    savedCampaigns: 'Campaign Shelf',
    noCampaigns:
      'No saved chronicles yet. Forge a new world or launch the instant Larion demo.',
    continueStory: 'Resume Chronicle',
    importSave: 'Import JSON',
    exportSave: 'Export',
    deleteSave: 'Delete',
    confirmDelete: 'Confirm?',
    focusMode: 'Focus Mode',
    livingWorld: 'Living World',
    paused: 'Paused',
    advanceWorld: 'Advance World',
    settings: 'Settings',
    sheetTab: 'Sheet',
    inventoryTab: 'Pack',
    worldTab: 'World',
    questsTab: 'Quests',
    chronicleTab: 'Chronicle',
    actionPlaceholder: 'Describe what you do, say, or examine...',
    sendAction: 'Act',
    weaving: 'Weaving consequences...',
    useInAction: 'Use in action',
    summarizeNow: 'Log Chapter',
    backHome: 'Sanctuary',
    demoBadge: 'Demo Mode',
    geminiBadge: 'Gemini AI',
  },
  fr: {
    sanctuaryTitle: 'Là où les mondes respirent avec vous.',
    sanctuarySubtitle:
      'Façonnez l’atmosphère, réglez la sévérité du destin et vivez des chroniques interactives portées par l’IA et de véritables règles.',
    forgeNew: 'Forger une Chronique',
    playInstantDemo: 'Démo Instantanée : Cendres de Larion',
    savedCampaigns: 'Bibliothèque des Campagnes',
    noCampaigns:
      'Aucune chronique sauvegardée. Forgez un univers ou lancez la démo de Larion.',
    continueStory: 'Reprendre',
    importSave: 'Importer JSON',
    exportSave: 'Exporter',
    deleteSave: 'Supprimer',
    confirmDelete: 'Confirmer ?',
    focusMode: 'Mode Focus',
    livingWorld: 'Monde Vivant',
    paused: 'En pause',
    advanceWorld: 'Avancer',
    settings: 'Réglages',
    sheetTab: 'Fiche',
    inventoryTab: 'Sac',
    worldTab: 'Monde',
    questsTab: 'Objectifs',
    chronicleTab: 'Chronique',
    actionPlaceholder: 'Décrivez ce que vous faites, dites ou observez...',
    sendAction: 'Agir',
    weaving: 'Tissage des conséquences...',
    useInAction: 'Utiliser',
    summarizeNow: 'Résumer',
    backHome: 'Sanctuaire',
    demoBadge: 'Mode Démo',
    geminiBadge: 'Gemini IA',
  },
};
