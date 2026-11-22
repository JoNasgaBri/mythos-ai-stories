import { RANDOM_PROTAGONISTS, WORLD_THEMES } from '../data/presets';
import type {
  ActionIntent,
  AiStateChanges,
  Campaign,
  DiceRollResult,
  EpilogueResponse,
  ForgeWorldRequest,
  ForgedWorldBlueprint,
  JournalSummaryResponse,
  LanguageId,
  LocationDanger,
  NpcStance,
  ResponseLength,
  StoryTurnResponse,
  WorldThemeId,
} from '../types/game';

interface DemoNpcSeed {
  name: string;
  role: Record<LanguageId, string>;
  notes: Record<LanguageId, string>;
}

interface ThemeScenePack {
  openingTitle: Record<LanguageId, string>;
  openingLocation: Record<LanguageId, string>;
  openingLocationDesc: Record<LanguageId, string>;
  openingMood: Record<LanguageId, string>;
  openingLead: Record<LanguageId, (c: Campaign) => string>;
  locations: Record<LanguageId, Array<{ name: string; description: string; danger: LocationDanger }>>;
  npcs: DemoNpcSeed[];
  discoveries: Record<
    LanguageId,
    Array<{ name: string; category: 'clue' | 'tool' | 'relic' | 'consumable'; note: string }>
  >;
  pulseBeats: Record<LanguageId, string[]>;
}

const THEME_PACKS: Record<WorldThemeId, ThemeScenePack> = {
  fantasy: {
    openingTitle: {
      'pt-BR': 'Limiares de Cinza',
      en: 'Thresholds of Ash',
      fr: 'Seuils de Cendre',
    },
    openingLocation: {
      'pt-BR': 'Encruzilhada da Névoa',
      en: 'Crossroads of Mist',
      fr: 'Carrefour de la Brume',
    },
    openingLocationDesc: {
      'pt-BR': 'Entroncamento antigo cercado por pinheiros e altares partidos.',
      en: 'Ancient crossroads bordered by pines and cracked wayside shrines.',
      fr: 'Ancien carrefour bordé de pins et d’autels brisés.',
    },
    openingMood: {
      'pt-BR': 'Presságio & Aço',
      en: 'Omen & Steel',
      fr: 'Présage & Acier',
    },
    openingLead: {
      'pt-BR': (c) =>
        `O vento frio varre as bandeiras rasgadas da ${c.world.title} enquanto você, ${c.player.name} (${c.player.occupation}), aperta o passo pela estrada enlameada. ${c.world.premise}\n\nÀ frente, junto a um santuário de pedra coberto de musgo, a eremita Isolde baixa o capuz assim que nota sua presença. Sobre o altar partido repousa um selo ainda quente — sinal de que quem você procura esteve aqui há menos de uma hora.`,
      en: (c) =>
        `Cold wind sweeps across torn banners in ${c.world.title} as you, ${c.player.name} (${c.player.occupation}), step onto the rain-slick road. ${c.world.premise}\n\nAhead, near a moss-choked stone shrine, the hermit Isolde lowers her hood and shifts toward the shadows as your silhouette approaches. On the cracked altar rests a wax seal still warm to the touch—someone passed here less than an hour ago.`,
      fr: (c) =>
        `Un vent froid balaie les bannières déchirées de ${c.world.title} tandis que vous, ${c.player.name} (${c.player.occupation}), avancez sur la route détrempée. ${c.world.premise}\n\nDevant un sanctuaire couvert de mousse, l’ermite Isolde abaisse sa capuche dès qu’elle vous aperçoit.`,
    },
    locations: {
      'pt-BR': [
        { name: 'Taverna do Corvo Manco', description: 'Salão enfumaçado onde mercenários trocam segredos a meia voz.', danger: 'tense' },
        { name: 'Cripta Sob o Salgueiro', description: 'Câmara úmida selada por raízes antigas e runas gastas.', danger: 'hostile' },
        { name: 'Ponte da Vigília', description: 'Passagem estreita sobre o desfiladeiro envolta em neblina espessa.', danger: 'tense' },
        { name: 'Torre dos Sinos Quebrados', description: 'Ruína erguida no penhasco onde velhos juramentos ecoam.', danger: 'hostile' },
      ],
      en: [
        { name: 'The Lame Crow Tavern', description: 'Smoke-filled hall where sellswords trade rumors in hushed tones.', danger: 'tense' },
        { name: 'Crypt Beneath the Willow', description: 'Damp stone chamber bound by gnarled roots and worn wards.', danger: 'hostile' },
        { name: 'Watchman’s Bridge', description: 'Narrow stone arch suspended above a fog-choked gorge.', danger: 'tense' },
        { name: 'Tower of Broken Bells', description: 'Cliffside ruin where forgotten oaths still echo.', danger: 'hostile' },
      ],
      fr: [
        { name: 'Taverne du Corbeau Boiteux', description: 'Salle enfumée où les rumeurs s’échangent à voix basse.', danger: 'tense' },
        { name: 'Crypte du Saule', description: 'Chambre humide scellée par des racines anciennes.', danger: 'hostile' },
        { name: 'Pont de la Veille', description: 'Arche étroite au-dessus du ravin brumeux.', danger: 'tense' },
        { name: 'Tour des Cloches Brisées', description: 'Ruine sur la falaise où résonnent d’anciens serments.', danger: 'hostile' },
      ],
    },
    npcs: [
      {
        name: 'Isolde',
        role: { 'pt-BR': 'Guardiã do Santuário', en: 'Shrine Keeper', fr: 'Gardienne du Sanctuaire' },
        notes: {
          'pt-BR': 'Conhece atalhos antigos e observa o selo partido no altar.',
          en: 'Knows old forest trails and watches the broken wax seal.',
          fr: 'Connaît les sentiers anciens et surveille le sceau brisé.',
        },
      },
      {
        name: 'Capitão Thorne',
        role: { 'pt-BR': 'Comandante de Patrulha', en: 'Border Captain', fr: 'Capitaine de Patrouille' },
        notes: {
          'pt-BR': 'Desconfia de forasteiros e cobra respostas diretas.',
          en: 'Distrusts outsiders and demands direct answers.',
          fr: 'Se méfie des étrangers et exige des réponses directes.',
        },
      },
      {
        name: 'Vespera',
        role: { 'pt-BR': 'Mensageira Oculta', en: 'Shadow Courier', fr: 'Messagère Oculte' },
        notes: {
          'pt-BR': 'Negocia informações perigosas por favores que ninguém recusa.',
          en: 'Trades dangerous truths for favors few dare repay.',
          fr: 'Négocie de sombres vérités contre des faveurs.',
        },
      },
    ],
    discoveries: {
      'pt-BR': [
        { name: 'Chave de Ferro Rúnico', category: 'relic', note: 'Esquenta quando há magia oculta por perto.' },
        { name: 'Carta Rasgada com Lacre Negro', category: 'clue', note: 'Cita um encontro secreto à meia-noite.' },
        { name: 'Frasco de Erva-Lúcida', category: 'consumable', note: 'Restaura vigor e clareia a mente.' },
      ],
      en: [
        { name: 'Runed Iron Key', category: 'relic', note: 'Grows warm near concealed wards.' },
        { name: 'Black-Sealed Torn Letter', category: 'clue', note: 'Mentions a midnight rendezvous at the old lock.' },
        { name: 'Lucid-Herb Draught', category: 'consumable', note: 'Steadies breathing and restores vigor.' },
      ],
      fr: [
        { name: 'Clé de Fer Runique', category: 'relic', note: 'Chauffe près des sceaux cachés.' },
        { name: 'Lettre Déchirée au Sceau Noir', category: 'clue', note: 'Évoque un rendez-vous à minuit.' },
        { name: 'Philtre d’Herbe-Lucide', category: 'consumable', note: 'Restaure la vigueur.' },
      ],
    },
    pulseBeats: {
      'pt-BR': [
        'Enquanto você pondera o próximo movimento, o sino distante da torre bate uma única vez — fora de hora — e os cães da aldeia silenciam ao mesmo tempo.',
        'Uma sombra esguia cruza o telhado oposto derrubando telhas molhadas; alguém decidiu não esperar você agir.',
      ],
      en: [
        'While you weigh your next move, the distant watchtower bell tolls once out of schedule, and every hound in the yard falls dead silent.',
        'A lean silhouette slips across the opposite eaves, knocking wet slate onto the cobbles—someone else is making their move.',
      ],
      fr: [
        'Tandis que vous hésitez, la cloche de la tour sonne un coup isolé hors d’heure et tous les chiens se taisent d’un coup.',
        'Une ombre file sur le toit opposé en faisant glisser des ardoises mouillées.',
      ],
    },
  },

  cyberpunk: {
    openingTitle: {
      'pt-BR': 'Chuva Ácida & Sinal Perdido',
      en: 'Acid Rain & Lost Signal',
      fr: 'Pluie Acide & Signal Perdu',
    },
    openingLocation: {
      'pt-BR': 'Passarela Neon — Setor 4',
      en: 'Neon Skybridge — Sector 4',
      fr: 'Passerelle Néon — Secteur 4',
    },
    openingLocationDesc: {
      'pt-BR': 'Corredor elevado banhado por letreiros holográficos e vigilância corporativa.',
      en: 'Elevated walkway bathed in flickering holo-ads and corporate sweeps.',
      fr: 'Passerelle baignée de néons et de drones de surveillance.',
    },
    openingMood: {
      'pt-BR': 'Rastreamento Ativo',
      en: 'Active Trace',
      fr: 'Traçage Actif',
    },
    openingLead: {
      'pt-BR': (c) =>
        `Hologramas cor-de-rosa piscam na chuva oleosa de ${c.world.title}, projetando reflexos partidos no visor de ${c.player.name} (${c.player.occupation}). ${c.world.premise}\n\nSeu comunicador capta um pacote criptografado vindo de um quiosque logo abaixo, onde a técnica clandestina Nyx-7 faz sinal discreto enquanto dois seguranças corporativos sem insígnia escaneiam a multidão.`,
      en: (c) =>
        `Magenta ads flicker through oily rain in ${c.world.title}, fracturing across ${c.player.name}’s optics (${c.player.occupation}). ${c.world.premise}\n\nYour deck flags a burst-encrypted ping from a noodle stall below—where street ripperdoc Nyx-7 signals quietly while two unmarked corporate sweepers scan the crowd.`,
      fr: (c) =>
        `Les hologrammes clignotent sous la pluie huileuse de ${c.world.title} devant ${c.player.name} (${c.player.occupation}). ${c.world.premise}\n\nVotre terminal capte un signal de Nyx-7 en contrebas tandis que deux agents scannent la foule.`,
    },
    locations: {
      'pt-BR': [
        { name: 'Clínica Clandestina Kestrel', description: 'Cirurgias de cromo fora da rede sob luz ultravioleta.', danger: 'safe' },
        { name: 'Subestação Subterrânea 09', description: 'Servidores abandonados protegidos por trancas antigas.', danger: 'hostile' },
        { name: 'Lounge Eclipse Orbital', description: 'Clube de alto padrão onde executivos lavam contratos sujos.', danger: 'tense' },
        { name: 'Dutos de Resfriamento', description: 'Atalho úmido entre os blocos verticais livre de câmeras.', danger: 'tense' },
      ],
      en: [
        { name: 'Kestrel Back-Alley Clinic', description: 'Off-grid chrome workshop bathed in UV light.', danger: 'safe' },
        { name: 'Sub-Grid Relay 09', description: 'Abandoned data vault guarded by legacy ICE.', danger: 'hostile' },
        { name: 'Eclipse Orbital Lounge', description: 'High-altitude club where execs launder black contracts.', danger: 'tense' },
        { name: 'Coolant Maintenance Tier', description: 'Steaming camera-blind passage beneath the vertical blocks.', danger: 'tense' },
      ],
      fr: [
        { name: 'Clinique Clandestine Kestrel', description: 'Atelier chrome hors-réseau sous lumière UV.', danger: 'safe' },
        { name: 'Sous-Station 09', description: 'Serveurs oubliés protégés par de vieux pare-feux.', danger: 'hostile' },
        { name: 'Lounge Éclipse', description: 'Club de luxe où se négocient des contrats sales.', danger: 'tense' },
        { name: 'Conduits de Refroidissement', description: 'Passage sans caméras sous les tours.', danger: 'tense' },
      ],
    },
    npcs: [
      {
        name: 'Nyx-7',
        role: { 'pt-BR': 'Cirurgiã de Cromo', en: 'Street Ripperdoc', fr: 'Chirurgienne Chrome' },
        notes: {
          'pt-BR': 'Especialista em memória sintética e implantes fora de registro.',
          en: 'Specializes in synthetic memory and untraceable cyberware.',
          fr: 'Spécialiste des implants hors-registre.',
        },
      },
      {
        name: 'Agente Kurosawa',
        role: { 'pt-BR': 'Varredor Corporativo', en: 'Corp Sweeper', fr: 'Nettoyeur Corpo' },
        notes: {
          'pt-BR': 'Rastreia o fragmento vazado sem deixar testemunhas.',
          en: 'Tracks leaked shards and erases witnesses.',
          fr: 'Traque les données volées sans laisser de traces.',
        },
      },
      {
        name: 'Echo-Zero',
        role: { 'pt-BR': 'Corretor de Dados', en: 'Info Broker', fr: 'Courtier de Données' },
        notes: {
          'pt-BR': 'Só fala através de terminais públicos e cobra caro.',
          en: 'Speaks only through burner relays and charges dearly.',
          fr: 'Communique uniquement par relais éphémères.',
        },
      },
    ],
    discoveries: {
      'pt-BR': [
        { name: 'Fragmento de Memória Criptografado', category: 'clue', note: 'Contém coordenadas de um cofre offline.' },
        { name: 'Chave Bypass ICE-3', category: 'tool', note: 'Desarma uma trava eletrônica sem disparar alarme.' },
        { name: 'Ampola de Estabilizador Neural', category: 'consumable', note: 'Recupera vigor e reduz tremor sináptico.' },
      ],
      en: [
        { name: 'Encrypted Memory Shard', category: 'clue', note: 'Holds coordinates to an air-gapped vault.' },
        { name: 'ICE-3 Bypass Dongle', category: 'tool', note: 'Spoofs one security lock without tripping trace.' },
        { name: 'Neural Stabilizer Shot', category: 'consumable', note: 'Restores vigor and calms cybernetic feedback.' },
      ],
      fr: [
        { name: 'Fragment Mémoire Chiffré', category: 'clue', note: 'Contient les coordonnées d’un coffre hors-ligne.' },
        { name: 'Clé Bypass ICE-3', category: 'tool', note: 'Contourne une serrure sans alerte.' },
        { name: 'Dose de Stabilisateur Neural', category: 'consumable', note: 'Restaure la vigueur.' },
      ],
    },
    pulseBeats: {
      'pt-BR': [
        'Os painéis da rua piscam em vermelho por meio segundo: drones de varredura acabaram de entrar no seu perímetro de radar.',
        'Uma mensagem anônima surge no canto do visor: "Eles já fecharam a saída leste. Mexa-se agora."',
      ],
      en: [
        'Street billboards stutter crimson for half a second—sweep drones just locked onto this block’s mesh.',
        'An anonymous ping flashes in your peripheral HUD: "East lift is sealed. Move before the sweep closes."',
      ],
      fr: [
        'Les écrans de la rue virent au rouge une demi-seconde : des drones de balayage viennent d’entrer dans le secteur.',
        'Un message anonyme clignote : « Sortie est verrouillée. Bougez maintenant. »',
      ],
    },
  },

  mystery: {
    openingTitle: {
      'pt-BR': 'Álibi Sob Neblina',
      en: 'Alibi in Fog',
      fr: 'Alibi sous le Brouillard',
    },
    openingLocation: {
      'pt-BR': 'Salão Principal — Meia-Noite',
      en: 'Main Parlor — Midnight',
      fr: 'Grand Salon — Minuit',
    },
    openingLocationDesc: {
      'pt-BR': 'Salão de mogno iluminado a vela onde todos escondem o horário real em que chegaram.',
      en: 'Candlelit mahogany parlor where every guest hides when they really arrived.',
      fr: 'Salon sombre où chacun cache son heure d’arrivée réelle.',
    },
    openingMood: {
      'pt-BR': 'Suspeita Silenciosa',
      en: 'Quiet Suspicion',
      fr: 'Soupçon Silencieux',
    },
    openingLead: {
      'pt-BR': (c) =>
        `O relógio de pêndulo para exatamente às 23h58 quando ${c.player.name} (${c.player.occupation}) cruza as portas de ${c.world.title}. ${c.world.premise}\n\nSobre o aparador há duas taças intactas, uma carta queimada pela metade na lareira fria e Lady Evelyn observando cada gesto seu atrás de um jornal fechado.`,
      en: (c) =>
        `The grandfather clock halts at 11:58 PM as ${c.player.name} (${c.player.occupation}) steps into ${c.world.title}. ${c.world.premise}\n\nOn the mahogany sideboard sit two untouched glasses, a half-charred envelope in the hearth, and Lady Evelyn watching your every move behind yesterday’s paper.`,
      fr: (c) =>
        `L’horloge s’arrête à 23h58 lorsque ${c.player.name} (${c.player.occupation}) franchit les portes de ${c.world.title}. ${c.world.premise}\n\nLady Evelyn vous observe discrètement derrière son journal.`,
    },
    locations: {
      'pt-BR': [
        { name: 'Biblioteca Trancada', description: 'Estantes do chão ao teto com um cofre oculto atrás dos mapas.', danger: 'tense' },
        { name: 'Estufa de Vidro Partido', description: 'Plantas exóticas e cacos recentes sob neblina fria.', danger: 'tense' },
        { name: 'Arquivo Subterrâneo', description: 'Registros antigos que contradizem a versão oficial.', danger: 'hostile' },
        { name: 'Cais da Balsa Deserta', description: 'Último ponto de fuga quando a maré baixa.', danger: 'safe' },
      ],
      en: [
        { name: 'Locked Study', description: 'Floor-to-ceiling shelves concealing a brass wall safe.', danger: 'tense' },
        { name: 'Shattered Conservatory', description: 'Overgrown orchids and fresh glass footprints in cold mist.', danger: 'tense' },
        { name: 'Basement Archives', description: 'Ledgers contradicting the family’s official story.', danger: 'hostile' },
        { name: 'Abandoned Ferry Pier', description: 'The only shoreline exit until morning.', danger: 'safe' },
      ],
      fr: [
        { name: 'Bibliothèque Verrouillée', description: 'Étagères anciennes dissimulant un coffre.', danger: 'tense' },
        { name: 'Verrière Brisée', description: 'Plantes rares et éclats de verre sous la brume.', danger: 'tense' },
        { name: 'Archives du Sous-Sol', description: 'Registres contredisant l’histoire officielle.', danger: 'hostile' },
        { name: 'Quai Désert', description: 'Unique issue vers le fleuve.', danger: 'safe' },
      ],
    },
    npcs: [
      {
        name: 'Lady Evelyn',
        role: { 'pt-BR': 'Herdeira Reservada', en: 'Guarded Heiress', fr: 'Héritière Réservée' },
        notes: {
          'pt-BR': 'Finge calma absoluta, mas suas luvas estão manchadas de fuligem.',
          en: 'Projects icy poise, though faint soot stains her gloves.',
          fr: 'Semble calme, mais ses gants portent des traces de suie.',
        },
      },
      {
        name: 'Mordomo Alistair',
        role: { 'pt-BR': 'Antigo Governante', en: 'Head Butler', fr: 'Majordome' },
        notes: {
          'pt-BR': 'Carrega as chaves da casa inteira e conhece cada segredo de família.',
          en: 'Holds the master keyring and thirty years of household secrets.',
          fr: 'Détient toutes les clés et trente ans de secrets.',
        },
      },
      {
        name: 'Inspetor Mercer',
        role: { 'pt-BR': 'Observador Externo', en: 'Retired Inspector', fr: 'Inspecteur Retraité' },
        notes: {
          'pt-BR': 'Anota álibis em silêncio e desconfia de todos no salão.',
          en: 'Tracks alibis silently and trusts no one in the parlor.',
          fr: 'Note les alibis en silence et ne croit personne.',
        },
      },
    ],
    discoveries: {
      'pt-BR': [
        { name: 'Bilhete de Trem Rasgado', category: 'clue', note: 'Desmente o álibi de quem jura nunca ter saído da cidade.' },
        { name: 'Chave Mestra de Latão', category: 'tool', note: 'Serve nas portas internas da ala antiga.' },
        { name: 'Sais Aromáticos de Emergência', category: 'consumable', note: 'Dissipa tontura e recupera foco.' },
      ],
      en: [
        { name: 'Torn Railway Stub', category: 'clue', note: 'Disproves an alibi given ten minutes ago.' },
        { name: 'Brass Skeleton Key', category: 'tool', note: 'Fits the older interior wing locks.' },
        { name: 'Smelling Salts Vial', category: 'consumable', note: 'Clears shock and restores vigor.' },
      ],
      fr: [
        { name: 'Billet de Train Déchiré', category: 'clue', note: 'Contredit un alibi donné plus tôt.' },
        { name: 'Passe-Partout en Laiton', category: 'tool', note: 'Ouvre les portes de l’ancienne aile.' },
        { name: 'Sels Réanimateurs', category: 'consumable', note: 'Dissipe le choc.' },
      ],
    },
    pulseBeats: {
      'pt-BR': [
        'Um trinco clica suavemente no corredor escuro lá fora. Alguém acabou de trancar — ou destrancar — a única saída da biblioteca.',
        'Lá embaixo, uma porta pesada bate contra o vento, seguida por passos apressados que cessam perto da escada de serviço.',
      ],
      en: [
        'A latch clicks softly down the unlit hall. Someone just locked—or unlocked—the study exit.',
        'Downstairs, a heavy door slams against the draft, followed by hurried footsteps stopping by the service stairs.',
      ],
      fr: [
        'Un loquet claque doucement dans le couloir sombre. Quelqu’un vient d’agir sur la sortie.',
        'En bas, une porte lourde claque, suivie de pas pressés.',
      ],
    },
  },

  zombies: {
    openingTitle: {
      'pt-BR': 'Gerador em Reserva',
      en: 'Backup Power',
      fr: 'Générateur de Secours',
    },
    openingLocation: {
      'pt-BR': 'Corredor de Quarentena',
      en: 'Quarantine Corridor',
      fr: 'Couloir de Quarantaine',
    },
    openingLocationDesc: {
      'pt-BR': 'Ala isolada com iluminação de emergência verde e barricadas improvisadas.',
      en: 'Isolated wing under pale green emergency lights and hurried barricades.',
      fr: 'Aile isolée sous lumières de secours vertes et barricades de fortune.',
    },
    openingMood: {
      'pt-BR': 'Silêncio Frágil',
      en: 'Fragile Silence',
      fr: 'Silence Fragile',
    },
    openingLead: {
      'pt-BR': (c) =>
        `As lâmpadas de emergência piscam em verde pálido dentro de ${c.world.title}, iluminando portas riscadas à pressa. Como ${c.player.occupation}, você — ${c.player.name} — sabe que cada segundo custa barulho ou bateria. ${c.world.premise}\n\nAtrás da porta corta-fogo entreaberta, a paramédica Clara ajusta um rádio que chia uma transmissão entrecortada enquanto algo arrasta os pés no andar inferior.`,
      en: (c) =>
        `Emergency strips hum pale green inside ${c.world.title}, casting long shadows over barricaded doors. As ${c.player.occupation}, ${c.player.name} knows every second costs noise or battery. ${c.world.premise}\n\nBeyond a wedged fire door, paramedic Clara tunes a crackling radio while something drags slowly across the stairwell below.`,
      fr: (c) =>
        `Les néons de secours bourdonnent dans ${c.world.title}. En tant que ${c.player.occupation}, ${c.player.name} sait que chaque seconde coûte du silence ou de la batterie. ${c.world.premise}\n\nDerrière la porte coupe-feu, Clara règle une radio tandis qu’un pas traînant résonne plus bas.`,
    },
    locations: {
      'pt-BR': [
        { name: 'Farmácia Saqueada', description: 'Prateleiras tombadas onde ainda podem restar antibióticos.', danger: 'tense' },
        { name: 'Escadaria de Emergência', description: 'Eco perigoso onde qualquer passo ressoa por quatro andares.', danger: 'hostile' },
        { name: 'Garagem Subterrânea', description: 'Veículos abandonados com tanques ainda cheios e sombras fundas.', danger: 'hostile' },
        { name: 'Heliporto Tomado por Neblina', description: 'Área aberta onde o sinal de resgate chega limpo.', danger: 'tense' },
      ],
      en: [
        { name: 'Ransacked Pharmacy', description: 'Overturned shelves that might still hide trauma kits.', danger: 'tense' },
        { name: 'Emergency Stairwell', description: 'Echoing concrete shaft where footsteps travel four floors.', danger: 'hostile' },
        { name: 'Sub-Level Garage', description: 'Abandoned ambulances in pitch-black standing water.', danger: 'hostile' },
        { name: 'Fogbound Helipad', description: 'Open rooftop where distress signals finally clear.', danger: 'tense' },
      ],
      fr: [
        { name: 'Pharmacie Pillée', description: 'Rayons renversés pouvant encore cacher des soins.', danger: 'tense' },
        { name: 'Escalier de Secours', description: 'Cage d’escalier où le moindre bruit résonne.', danger: 'hostile' },
        { name: 'Garage Souterrain', description: 'Véhicules abandonnés dans l’obscurité totale.', danger: 'hostile' },
        { name: 'Héliport Embrumé', description: 'Toit dégagé pour capter la fréquence de secours.', danger: 'tense' },
      ],
    },
    npcs: [
      {
        name: 'Clara',
        role: { 'pt-BR': 'Paramédica de Triagem', en: 'Triage Paramedic', fr: 'Infirmière de Triage' },
        notes: {
          'pt-BR': 'Conhece os códigos das portas médicas e guarda uma bateria reserva.',
          en: 'Knows med-wing keycodes and guards a spare radio battery.',
          fr: 'Connaît les codes médicaux et garde une batterie.',
        },
      },
      {
        name: 'Sargento Vance',
        role: { 'pt-BR': 'Líder de Escolta', en: 'Evac Sergeant', fr: 'Sergent d’Escorte' },
        notes: {
          'pt-BR': 'Pragmático ao extremo — abandona quem atrasa o grupo.',
          en: 'Ruthlessly pragmatic—leaves behind anyone slowing evac.',
          fr: 'Pragmatique à l’extrême face à la quarantaine.',
        },
      },
      {
        name: 'Dr. Kenji',
        role: { 'pt-BR': 'Pesquisador Isolado', en: 'Locked-In Researcher', fr: 'Chercheur Isolé' },
        notes: {
          'pt-BR': 'Só abre o laboratório se você provar que não foi mordido.',
          en: 'Refuses to unbolt the lab unless you prove clean.',
          fr: 'N’ouvre le labo que si vous prouvez être indemne.',
        },
      },
    ],
    discoveries: {
      'pt-BR': [
        { name: 'Kit de Ataduras & Antisséptico', category: 'consumable', note: 'Fecha cortes antes que infeccionem.' },
        { name: 'Cartão Magnético da Ala Médica', category: 'clue', note: 'Libera portas de emergência alimentadas.' },
        { name: 'Sinalizador Químico Silencioso', category: 'tool', note: 'Ilumina ou distrai sem fazer barulho.' },
      ],
      en: [
        { name: 'Trauma Bandage Pack', category: 'consumable', note: 'Stops bleeding and restores vigor.' },
        { name: 'Med-Wing Keycard', category: 'clue', note: 'Unlocks powered isolation doors.' },
        { name: 'Silent Chem-Flare', category: 'tool', note: 'Lights dark corners or draws eyes away.' },
      ],
      fr: [
        { name: 'Kit de Pansements', category: 'consumable', note: 'Stoppe les saignements.' },
        { name: 'Badge d’Accès Médical', category: 'clue', note: 'Ouvre les portes isolées.' },
        { name: 'Bâton Lumineux Silencieux', category: 'tool', note: 'Éclaire sans attirer par le bruit.' },
      ],
    },
    pulseBeats: {
      'pt-BR': [
        'Um vidro estala no corredor vizinho. Duas respirações guturais respondem quase imediatamente à vibração.',
        'O gerador falha por dois segundos inteiros; quando a luz volta, a porta ao fundo está alguns centímetros mais aberta.',
      ],
      en: [
        'Glass crunches in the adjacent hall. Two wet, rasping breaths answer the sound almost at once.',
        'The backup generator coughs out for two dark seconds; when power flickers back, the far door stands wider than before.',
      ],
      fr: [
        'Du verre craque dans le couloir voisin. Deux souffles rauques répondent aussitôt.',
        'Le générateur tousse deux secondes ; au retour de la lumière, la porte du fond s’est entrouverte.',
      ],
    },
  },

  apocalyptic: {
    openingTitle: {
      'pt-BR': 'Poeira & Água Contada',
      en: 'Dust & Measured Water',
      fr: 'Poussière & Eau Comptée',
    },
    openingLocation: {
      'pt-BR': 'Posto da Rodovia Quebrada',
      en: 'Broken Highway Outpost',
      fr: 'Avant-Poste de la Route Brisée',
    },
    openingLocationDesc: {
      'pt-BR': 'Carcaças enferrujadas formando muralha em torno de uma bomba d’água manual.',
      en: 'Rusted truck frames welded into a barricade around a hand water pump.',
      fr: 'Carcasses soudées autour d’une pompe à eau manuelle.',
    },
    openingMood: {
      'pt-BR': 'Calor & Ameaça',
      en: 'Heat & Threat',
      fr: 'Chaleur & Menace',
    },
    openingLead: {
      'pt-BR': (c) =>
        `O céu cor de ferrugem anuncia tempestade de cinzas no horizonte de ${c.world.title}. Você, ${c.player.name} (${c.player.occupation}), ajusta o lenço contra o vento seco enquanto observa a coluna de fumaça subindo do posto avançado. ${c.world.premise}\n\nJunto às carcaças de veículos enferrujados, a batedora Mara aponta uma carabina sem gatilho puxado ainda, tentando calcular quanto vale o que você carrega.`,
      en: (c) =>
        `A rust-colored sky warns of an ash squall rolling across ${c.world.title}. ${c.player.name} (${c.player.occupation}) tightens a dust scarf while watching thin black smoke curl above the outpost. ${c.world.premise}\n\nBeside stripped truck husks, outpost scout Mara rests a carbine across her arm, weighing whether to bargain or ambush.`,
      fr: (c) =>
        `Un ciel couleur de rouille annonce une tempête de cendres sur ${c.world.title}. ${c.player.name} (${c.player.occupation}) observe la fumée monter. ${c.world.premise}\n\nPrès des carcasses de camions, l’éclaireuse Mara jauge ce que vous transportez.`,
    },
    locations: {
      'pt-BR': [
        { name: 'Cisterna Subterrânea', description: 'Reserva fresca escondida sob concreto rachado.', danger: 'safe' },
        { name: 'Oficina dos Ferro-Velhos', description: 'Forja movida a bateria solar e sucata valiosa.', danger: 'tense' },
        { name: 'Cânion da Passagem Estreita', description: 'Ponto perfeito para emboscadas de saqueadores.', danger: 'hostile' },
        { name: 'Mercado da Caravana', description: 'Tendas de lona onde água vale mais do que balas.', danger: 'tense' },
      ],
      en: [
        { name: 'Cistern Vault', description: 'Cool reservoir hidden beneath cracked concrete.', danger: 'safe' },
        { name: 'Scrapwright Yard', description: 'Solar-wired forge cluttered with salvage.', danger: 'tense' },
        { name: 'Narrow Pass Canyon', description: 'Red-rock bottleneck favored by highway raiders.', danger: 'hostile' },
        { name: 'Caravan Bazaar', description: 'Canvas tents where clean water outprices ammunition.', danger: 'tense' },
      ],
      fr: [
        { name: 'Citerne Souterraine', description: 'Réserve fraîche sous le béton fendu.', danger: 'safe' },
        { name: 'Atelier des Ferrailleurs', description: 'Forge solaire pleine de pièces rares.', danger: 'tense' },
        { name: 'Canyon du Passage', description: 'Gorge propice aux embuscades.', danger: 'hostile' },
        { name: 'Bazar de la Caravane', description: 'Marché sous tentes où l’eau vaut de l’or.', danger: 'tense' },
      ],
    },
    npcs: [
      {
        name: 'Mara',
        role: { 'pt-BR': 'Batedora do Posto', en: 'Outpost Scout', fr: 'Éclaireuse' },
        notes: {
          'pt-BR': 'Troca rotas seguras por água limpa ou munição.',
          en: 'Trades safe canyon routes for clean water or shells.',
          fr: 'Échange des itinéraires sûrs contre de l’eau.',
        },
      },
      {
        name: 'Velho Gideon',
        role: { 'pt-BR': 'Mecânico de Relíquias', en: 'Relic Tinker', fr: 'Mécanicien' },
        notes: {
          'pt-BR': 'Sabe abrir maletas pré-colapso sem disparar travas.',
          en: 'Knows how to crack pre-collapse vaults cleanly.',
          fr: 'Sait ouvrir les coffres d’avant l’effondrement.',
        },
      },
      {
        name: 'Valkyrie',
        role: { 'pt-BR': 'Líder dos Saqueadores', en: 'Raider Captain', fr: 'Cheffe Pillarde' },
        notes: {
          'pt-BR': 'Cobra pedágio em sangue ou combustível na rodovia.',
          en: 'Collects highway tolls in fuel or blood.',
          fr: 'Prélève son péage en carburant ou en sang.',
        },
      },
    ],
    discoveries: {
      'pt-BR': [
        { name: 'Cantil de Água Purificada', category: 'consumable', note: 'Recupera vigor sob calor extremo.' },
        { name: 'Mapa Riscado de Abrigos', category: 'clue', note: 'Mostra rotas longe dos saqueadores.' },
        { name: 'Bateria de Sucata Carregada', category: 'tool', note: 'Valiosa moeda de troca ou energia portátil.' },
      ],
      en: [
        { name: 'Purified Water Flask', category: 'consumable', note: 'Restores vigor against scorching heat.' },
        { name: 'Scratched Bunker Map', category: 'clue', note: 'Shows dry washes hidden from raiders.' },
        { name: 'Charged Salvage Cell', category: 'tool', note: 'Trade leverage or emergency power.' },
      ],
      fr: [
        { name: 'Gourde d’Eau Purifiée', category: 'consumable', note: 'Restaure la vigueur.' },
        { name: 'Carte d’Abris Griffonnée', category: 'clue', note: 'Indique des routes cachées.' },
        { name: 'Batterie de Récupération', category: 'tool', note: 'Monnaie d’échange précieuse.' },
      ],
    },
    pulseBeats: {
      'pt-BR': [
        'O vento ergue uma cortina de cinzas quentes. Motores distantes roncam ao sul — alguém está fechando o cerco na rodovia.',
        'Os batedores trocam um sinal discreto com espelhos quebrados: seu tempo para escolher um lado está acabando.',
      ],
      en: [
        'Hot ash whips across the blacktop as distant engines rumble to the south—someone is cutting off the highway.',
        'The scouts flash a cracked mirror signal to the ridge: your window to choose an approach is closing.',
      ],
      fr: [
        'Le vent soulève un nuage de cendres brûlantes tandis que des moteurs grondent au sud.',
        'Les éclaireurs échangent un signal au miroir brisé : votre temps pour agir s’épuise.',
      ],
    },
  },
};

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function buildFollowupActions(theme: WorldThemeId, lang: LanguageId): Array<{
  label: string;
  intent: ActionIntent;
  risk: 'safe' | 'low' | 'medium' | 'high';
}> {
  if (lang === 'en') {
    return [
      { label: 'Press forward boldly and force a direct confrontation', intent: 'bold', risk: 'high' },
      { label: 'Slip into cover and watch how the other side reacts', intent: 'stealth', risk: 'medium' },
      { label: 'Use leverage or calm words to strike an unexpected deal', intent: 'diplomatic', risk: 'low' },
      { label: 'Search the immediate surroundings for hidden clues or supplies', intent: 'investigate', risk: 'safe' },
    ];
  }
  if (lang === 'fr') {
    return [
      { label: 'Avancer avec audace et provoquer un face-à-face', intent: 'bold', risk: 'high' },
      { label: 'Se fondre dans l’ombre et observer leur réaction', intent: 'stealth', risk: 'medium' },
      { label: 'Négocier avec sang-froid pour retourner la situation', intent: 'diplomatic', risk: 'low' },
      { label: 'Examiner les environs à la recherche d’indices', intent: 'investigate', risk: 'safe' },
    ];
  }

  const themeFlavor: Record<WorldThemeId, string> = {
    fantasy: 'Avançar com lâmina pronta e assumir o controle da cena',
    cyberpunk: 'Forçar invasão direta ou confronto tático imediato',
    mystery: 'Confrontar a contradição na cara dos envolvidos',
    zombies: 'Abrir passagem à força antes que o cerco feche',
    apocalyptic: 'Impor respeito na marra e tomar a dianteira',
  };

  return [
    { label: themeFlavor[theme], intent: 'bold', risk: 'high' },
    { label: 'Recuar para as sombras e observar em silêncio', intent: 'stealth', risk: 'medium' },
    { label: 'Tentar uma barganha fria usando o que você sabe', intent: 'diplomatic', risk: 'low' },
    { label: 'Vasculhar detalhes ocultos e rastros recentes no local', intent: 'investigate', risk: 'safe' },
  ];
}

export function demoStartStory(campaign: Campaign): StoryTurnResponse {
  const pack = THEME_PACKS[campaign.world.primaryTheme];
  const lang = campaign.language;
  const discovery = pick(pack.discoveries[lang]);
  const openingNpc = pack.npcs[0];

  const factionList = campaign.codex.factions
    .map((f) => `${f.name} (${f.influence})`)
    .join(', ');

  const creativeNote = campaign.world.creativePrompt?.trim()
    ? lang === 'en'
      ? `\n\nChronicle compass: ${campaign.world.creativePrompt.trim()}`
      : lang === 'fr'
        ? `\n\nCap créatif : ${campaign.world.creativePrompt.trim()}`
        : `\n\nBússola criativa da crônica: ${campaign.world.creativePrompt.trim()}`
    : '';

  const worldPrologue =
    lang === 'en'
      ? `${campaign.world.history}\n\n${campaign.world.worldLaws ? `Laws of this world: ${campaign.world.worldLaws}` : ''}${factionList ? `\n\nPowers shaping this era: ${factionList}.` : ''}${creativeNote}`
      : lang === 'fr'
        ? `${campaign.world.history}\n\n${campaign.world.worldLaws ? `Lois du monde : ${campaign.world.worldLaws}` : ''}${factionList ? `\n\nForces en présence : ${factionList}.` : ''}${creativeNote}`
        : `${campaign.world.history}\n\n${campaign.world.worldLaws ? `Leis deste mundo: ${campaign.world.worldLaws}` : ''}${factionList ? `\n\nForças em conflito nesta era: ${factionList}.` : ''}${creativeNote}`;

  return {
    worldPrologue: worldPrologue.trim(),
    sceneTitle: pack.openingTitle[lang],
    location: pack.openingLocation[lang],
    mood: pack.openingMood[lang],
    narration: pack.openingLead[lang](campaign),
    actions: buildFollowupActions(campaign.world.primaryTheme, lang),
    stateChanges: {
      addQuests: [
        {
          title:
            lang === 'en'
              ? `Survive & Uncover: ${campaign.world.title}`
              : lang === 'fr'
                ? `Survivre & Percer : ${campaign.world.title}`
                : `Desvendar: ${campaign.world.title}`,
          description: campaign.world.premise,
          primary: true,
        },
      ],
      addItems: [
        {
          name: discovery.name,
          category: discovery.category,
          quantity: 1,
          note: discovery.note,
        },
      ],
      upsertNpcs: [
        {
          name: openingNpc.name,
          role: openingNpc.role[lang],
          stance: 'suspicious',
          status: 'alive',
          notes: openingNpc.notes[lang],
        },
      ],
      discoverLocation: {
        name: pack.openingLocation[lang],
        description: pack.openingLocationDesc[lang],
        danger: 'tense',
      },
      addCanonFacts: [
        lang === 'en'
          ? `${campaign.player.name} arrived in ${pack.openingLocation[lang]} carrying: ${campaign.world.premise}`
          : lang === 'fr'
            ? `${campaign.player.name} est arrivé à ${pack.openingLocation[lang]} : ${campaign.world.premise}`
            : `${campaign.player.name} iniciou sua jornada em ${pack.openingLocation[lang]} diante da premissa: ${campaign.world.premise}`,
      ],
    },
    waitingForResponse: true,
    engineUsed: 'demo',
  };
}

export function demoTurnStory(
  campaign: Campaign,
  playerAction: string,
  diceRoll: DiceRollResult | undefined,
  length: ResponseLength,
  crisisMode?: 'survival_test' | 'breaking_point',
): StoryTurnResponse {
  const pack = THEME_PACKS[campaign.world.primaryTheme];
  const lang = campaign.language;
  const locations = pack.locations[lang];
  const movedLocation = campaign.turnCount % 3 === 2;
  const locObj = movedLocation
    ? locations[(campaign.turnCount + 1) % locations.length]
    : undefined;
  const nextLocation = locObj?.name ?? campaign.currentLocation;

  const normalized = playerAction.toLowerCase();
  const usedItem = campaign.player.inventory.find((item) =>
    normalized.includes(item.name.toLowerCase()),
  );

  const outcome = diceRoll?.outcome ?? 'success';
  const stateChanges: AiStateChanges = {
    vigorDelta: 0,
    tensionDelta: 0,
  };

  if (locObj) {
    stateChanges.discoverLocation = {
      name: locObj.name,
      description: locObj.description,
      danger: locObj.danger,
    };
  }

  let outcomeLine = '';

  if (crisisMode === 'survival_test') {
    outcomeLine =
      lang === 'en'
        ? `At the brink of blacking out, ${campaign.player.name} claws back breath and wrenches free from the jaws of defeat—battered, scarred, yet refusing to fall here.`
        : lang === 'fr'
          ? `Au bord de l’effondrement, ${campaign.player.name} arrache un dernier souffle et échappe de justesse à la fin.`
          : `À beira do apagão total, ${campaign.player.name} arranca fôlego do próprio limite e escapa por um fio — ferido, marcado, mas ainda de pé diante do destino.`;
    stateChanges.tensionDelta = -20;
  } else if (crisisMode === 'breaking_point') {
    outcomeLine =
      lang === 'en'
        ? `Tension boils over in a single explosive beat! Secrets shatter across ${nextLocation} as hidden rivals show their hands, resetting the board through sheer confrontation.`
        : lang === 'fr'
          ? `La tension explose enfin à ${nextLocation} : masques et alliances se brisent d’un seul coup !`
          : `A tensão acumulada explode de vez em ${nextLocation}! Máscaras caem, portas cedem e o confronto inevitável rompe o impasse que sufocava a cena.`;
    stateChanges.tensionDelta = -55;
  } else if (lang === 'pt-BR') {
    if (outcome === 'critical_success') {
      outcomeLine = `Sua iniciativa sai com precisão cirúrgica — o ambiente trabalha a seu favor e abre uma brecha rara diante de ${campaign.player.name}.`;
      stateChanges.tensionDelta = -10;
    } else if (outcome === 'success') {
      outcomeLine = `Você executa a manobra com firmeza. Mesmo sob olhares hostis, você ganha terreno e descobre um detalhe que outros deixariam passar.`;
      stateChanges.tensionDelta = 4;
    } else if (outcome === 'partial') {
      outcomeLine = `Você consegue o que queria pela metade, mas o preço é imediato: um ruído denuncia sua posição ou um aliado relutante passa a cobrar um favor caro.`;
      stateChanges.vigorDelta = -8;
      stateChanges.tensionDelta = 12;
    } else if (outcome === 'failure') {
      outcomeLine = `A tentativa tropeça na resistência do local. A resposta vem rápida e áspera, forçando ${campaign.player.name} a absorver o impacto e repensar a rota.`;
      stateChanges.vigorDelta = -15;
      stateChanges.tensionDelta = 16;
    } else {
      outcomeLine = `Tudo desmorona no pior segundo possível — o risco se volta contra você com brutalidade, deixando cicatriz na cena e elevando o perigo ao limite.`;
      stateChanges.vigorDelta = -24;
      stateChanges.tensionDelta = 22;
    }
  } else if (lang === 'fr') {
    outcomeLine =
      outcome === 'failure' || outcome === 'critical_failure'
        ? `Votre manœuvre se heurte à une riposte brutale, mettant ${campaign.player.name} sous pression immédiate.`
        : `Votre geste porte ses fruits avec précision, révélant une nouvelle faille dans la situation.`;
    stateChanges.vigorDelta = outcome === 'failure' ? -14 : outcome === 'critical_failure' ? -22 : 0;
    stateChanges.tensionDelta = outcome === 'critical_success' ? -8 : 10;
  } else {
    if (outcome === 'critical_success') {
      outcomeLine = `Your move lands with razor precision—circumstances bend in your favor and hand ${campaign.player.name} decisive leverage.`;
      stateChanges.tensionDelta = -10;
    } else if (outcome === 'success') {
      outcomeLine = `You pull it off cleanly. Even under watchful pressure, you carve out room to breathe and spot an overlooked opening.`;
      stateChanges.tensionDelta = 4;
    } else if (outcome === 'partial') {
      outcomeLine = `You secure half of what you wanted at an immediate cost—your margin narrows and someone nearby catches your scent.`;
      stateChanges.vigorDelta = -8;
      stateChanges.tensionDelta = 12;
    } else if (outcome === 'failure') {
      outcomeLine = `The attempt runs straight into hard resistance. The backlash forces ${campaign.player.name} back a step, bruised and exposed.`;
      stateChanges.vigorDelta = -15;
      stateChanges.tensionDelta = 16;
    } else {
      outcomeLine = `Everything snaps in the worst possible second—the gamble backfires hard and turns the room sharply hostile.`;
      stateChanges.vigorDelta = -24;
      stateChanges.tensionDelta = 22;
    }
  }

  let itemParagraph = '';
  if (usedItem) {
    if (usedItem.category === 'consumable') {
      stateChanges.removeItems = [usedItem.name];
      stateChanges.vigorDelta = (stateChanges.vigorDelta ?? 0) + 22;
      itemParagraph =
        lang === 'en'
          ? `Using **${usedItem.name}** steadies your pulse right when you need it most (+22 Vigor).`
          : lang === 'fr'
            ? `Utiliser **${usedItem.name}** stabilise votre souffle au moment critique.`
            : `Ao usar **${usedItem.name}**, você sente o fôlego retornar e a visão clarear no instante decisivo (+22 Vigor).`;
    } else {
      itemParagraph =
        lang === 'en'
          ? `Bringing **${usedItem.name}** to bear shifts how everyone in ${nextLocation} weighs your intent.`
          : lang === 'fr'
            ? `Sortir **${usedItem.name}** change aussitôt l’équilibre de la scène.`
            : `Empunhar **${usedItem.name}** muda imediatamente o peso da sua presença em ${nextLocation}.`;
    }
  }

  // Upsert or shift NPC stance in the Codex so the World tab feels alive
  const mentionedNpc = campaign.codex.npcs.find((n) =>
    normalized.includes(n.name.toLowerCase()),
  );
  if (mentionedNpc) {
    let nextStance: NpcStance = mentionedNpc.stance;
    if (outcome === 'critical_success' || (outcome === 'success' && (normalized.includes('falar') || normalized.includes('barganha') || normalized.includes('writ') || normalized.includes('deal')))) {
      nextStance = 'ally';
    } else if (outcome === 'failure' || outcome === 'critical_failure') {
      nextStance = 'hostile';
    }
    stateChanges.upsertNpcs = [
      {
        name: mentionedNpc.name,
        role: mentionedNpc.role,
        stance: nextStance,
        notes:
          nextStance === 'ally'
            ? lang === 'en'
              ? 'Earned trust after your decisive move.'
              : 'Passou a confiar após sua abordagem firme.'
            : nextStance === 'hostile'
              ? lang === 'en'
                ? 'Turned hostile after recent friction.'
                : 'Ficou hostil após o atrito recente.'
              : mentionedNpc.notes,
      },
    ];
  } else if (campaign.turnCount % 2 === 0) {
    const newSeed = pack.npcs[(campaign.turnCount + 1) % pack.npcs.length];
    const alreadyKnown = campaign.codex.npcs.some(
      (n) => n.name.toLowerCase() === newSeed.name.toLowerCase(),
    );
    if (!alreadyKnown) {
      stateChanges.upsertNpcs = [
        {
          name: newSeed.name,
          role: newSeed.role[lang],
          stance: outcome === 'critical_success' ? 'ally' : outcome === 'failure' ? 'hostile' : 'neutral',
          status: 'alive',
          notes: newSeed.notes[lang],
        },
      ];
    }
  }

  // Periodically award a discovery or trait to make demo feel alive
  if ((outcome === 'success' || outcome === 'critical_success') && campaign.turnCount % 2 === 1) {
    const candidate = pick(pack.discoveries[lang]);
    if (!campaign.player.inventory.some((i) => i.name === candidate.name)) {
      stateChanges.addItems = [
        {
          name: candidate.name,
          category: candidate.category,
          quantity: 1,
          note: candidate.note,
        },
      ];
    }
  }

  if (outcome === 'critical_failure' && !campaign.player.traits.includes('Sob Mira')) {
    stateChanges.addTraits = [
      lang === 'en' ? 'Marked Target' : lang === 'fr' ? 'Cible Marquée' : 'Sob Mira',
    ];
  }

  const actNote =
    campaign.world.storyPace === 'endless' || campaign.arcNumber >= 2
      ? lang === 'en'
        ? `Rumors from neighboring districts echo through ${nextLocation}, pulling ${campaign.player.name} deeper into a sprawling web of alliances.`
        : lang === 'fr'
          ? `De nouvelles rumeurs résonnent à ${nextLocation}, élargissant l’horizon du récit.`
          : `Rumores de regiões vizinhas e facções maiores alcançam ${nextLocation}, ampliando o horizonte deste arco sem pressa de terminar.`
      : lang === 'en'
        ? `Around ${nextLocation}, voices drop to whispers as new pieces shift behind closed doors. A fresh clue points deeper toward the heart of ${campaign.world.title}, yet time clearly isn’t waiting on anyone.`
        : lang === 'fr'
          ? `Autour de ${nextLocation}, les voix retombent en murmures tandis qu’une nouvelle piste se dessine au cœur de ${campaign.world.title}.`
          : `Ao redor de ${nextLocation}, as vozes baixam para sussurros apressados enquanto novas peças se movem na sombra. O rastro principal aponta ainda mais fundo no enigma de ${campaign.world.title}, mas fica claro que ninguém ali vai esperar por você por muito tempo.`;

  if (outcome === 'critical_success' && campaign.turnCount >= 2) {
    stateChanges.addCanonFacts = [
      lang === 'en'
        ? `At ${nextLocation} (T${campaign.turnCount + 1}), ${campaign.player.name} forced a breakthrough via "${playerAction}".`
        : `Em ${nextLocation} (Turno ${campaign.turnCount + 1}), ${campaign.player.name} abriu uma virada decisiva ao agir: "${playerAction}".`,
    ];
    if (campaign.codex.factions.length > 0 && campaign.turnCount % 4 === 0) {
      const targetFac = campaign.codex.factions[0];
      stateChanges.upsertFactions = [
        {
          name: targetFac.name,
          standing: targetFac.standing === 'wary' ? 'neutral' : 'allied',
        },
      ];
    }
  }

  const paragraphs = [
    lang === 'en'
      ? `You act: *${playerAction}*. ${outcomeLine}`
      : lang === 'fr'
        ? `Vous agissez : *${playerAction}*. ${outcomeLine}`
        : `Você age sem hesitar: *${playerAction}*. ${outcomeLine}`,
  ];

  if (itemParagraph) {
    paragraphs.push(itemParagraph);
  }
  if (length !== 'short') {
    paragraphs.push(actNote);
  }
  if (length === 'literary') {
    paragraphs.push(
      lang === 'en'
        ? `Each breath tastes of ${campaign.world.tone.toLowerCase()} stakes; whatever step you take next will echo through the chapters ahead.`
        : lang === 'fr'
          ? `Chaque geste laisse désormais une trace durable dans cette chronique.`
          : `O ar carrega o peso de ${campaign.world.tone.toLowerCase()}; qualquer escolha daqui em diante cobrará testemunhas e cicatrizes.`,
    );
  }

  return {
    sceneTitle:
      crisisMode === 'breaking_point'
        ? lang === 'en'
          ? 'Breaking Point'
          : 'Ponto de Ruptura'
        : crisisMode === 'survival_test'
          ? lang === 'en'
            ? 'Back From the Brink'
            : 'Sobrevivente do Limite'
          : outcome === 'critical_success'
            ? lang === 'en'
              ? 'Decisive Opening'
              : 'Brecha Decisiva'
            : outcome === 'critical_failure'
              ? lang === 'en'
                ? 'Sudden Backlash'
                : 'Revés Brutal'
              : nextLocation,
    location: nextLocation,
    mood:
      crisisMode === 'breaking_point'
        ? lang === 'en'
          ? 'Climax Unleashed'
          : 'Clímax Desencadeado'
        : outcome === 'failure' || outcome === 'critical_failure'
          ? lang === 'en'
            ? 'Cornered Tension'
            : 'Tensão Crítica'
          : campaign.currentMood,
    narration: paragraphs.join('\n\n'),
    actions: buildFollowupActions(campaign.world.primaryTheme, lang),
    stateChanges,
    waitingForResponse: true,
    engineUsed: 'demo',
  };
}

export function demoPulseStory(campaign: Campaign): StoryTurnResponse {
  const pack = THEME_PACKS[campaign.world.primaryTheme];
  const lang = campaign.language;
  const beat = pick(pack.pulseBeats[lang]);

  return {
    sceneTitle: campaign.currentLocation,
    location: campaign.currentLocation,
    mood: lang === 'en' ? 'Ticking Clock' : lang === 'fr' ? 'Temps Compté' : 'Mundo em Movimento',
    narration: beat,
    actions: campaign.actions.map((a) => ({
      label: a.label,
      intent: a.intent,
      risk: a.risk,
    })),
    stateChanges: {
      tensionDelta: 7,
    },
    waitingForResponse: false,
    engineUsed: 'demo',
  };
}

export function demoSummarizeChronicle(
  campaign: Campaign,
  mode: 'chapter' | 'arc_compression',
): JournalSummaryResponse {
  const lang = campaign.language;
  if (mode === 'arc_compression') {
    return {
      title:
        lang === 'en'
          ? `Act I Archive — ${campaign.world.title}`
          : lang === 'fr'
            ? `Archive Acte I — ${campaign.world.title}`
            : `Síntese de Ato — ${campaign.world.title}`,
      summary:
        lang === 'en'
          ? `${campaign.player.name} navigated ${campaign.currentLocation} across ${campaign.turnCount} turns, carrying ${campaign.player.inventory.length} key items while pursuing ${campaign.player.quests[0]?.title || campaign.world.title}.`
          : `${campaign.player.name} atravessou ${campaign.currentLocation} ao longo de ${campaign.turnCount} turnos, acumulando ${campaign.player.inventory.length} itens e mantendo firme o foco em ${campaign.player.quests[0]?.title || campaign.world.title}.`,
      engineUsed: 'demo',
    };
  }

  const lastScene = [...campaign.entries].reverse().find((e) => e.role === 'narrator');
  const snippet = lastScene?.text.split('\n')[0].slice(0, 140) ?? campaign.world.premise;

  return {
    title: lastScene?.sceneTitle || campaign.currentLocation,
    summary:
      lang === 'en'
        ? `At ${campaign.currentLocation}, ${campaign.player.name} pushed the investigation further: "${snippet}..."`
        : lang === 'fr'
          ? `À ${campaign.currentLocation}, ${campaign.player.name} a fait progresser l'intrigue : « ${snippet}... »`
          : `Em ${campaign.currentLocation}, ${campaign.player.name} avançou na trama (${campaign.turnCount} turnos): "${snippet}..."`,
    engineUsed: 'demo',
  };
}

export function demoGenerateEpilogue(
  campaign: Campaign,
  outcome: 'fallen' | 'victory',
): EpilogueResponse {
  const lang = campaign.language;
  const ally = campaign.codex.npcs.find((n) => n.stance === 'ally');
  const firstNpc = ally ?? campaign.codex.npcs[0];

  if (lang === 'en') {
    if (outcome === 'fallen') {
      return {
        title: `Where ${campaign.player.name} Fell`,
        summary: `At ${campaign.currentLocation}, after ${campaign.turnCount} relentless turns across ${campaign.world.title}, ${campaign.player.name}’s strength finally gave out. The search for ${campaign.player.quests[0]?.title || campaign.world.title} ends in silence here—yet the clues uncovered along the road remain.\n\n${firstNpc ? `Word of your last stand eventually reached ${firstNpc.name}, who stood longer than anyone expected at the edge of dusk.` : 'Those who cross this road afterward still speak softly of the traveler who refused to turn back.'}`,
        finalWords: 'Even ashes remember the shape of the flame.',
        engineUsed: 'demo',
      };
    }
    return {
      title: `Chronicle Closed: ${campaign.world.title}`,
      summary: `Through ${campaign.turnCount} turns and ${campaign.codex.locations.length} mapped places, ${campaign.player.name} bent the course of ${campaign.world.title}. What began as an uncertain road ended with lasting marks upon every faction and doorway crossed.\n\n${firstNpc ? `Among those who witnessed your final choice, ${firstNpc.name} carried your name forward into the next season.` : 'The chronicle closes—not in silence, but in a world forever altered.'}`,
      finalWords: 'Some stories end; others become legends whispered at dusk.',
      engineUsed: 'demo',
    };
  }

  if (lang === 'fr') {
    return {
      title:
        outcome === 'fallen'
          ? `La Chute de ${campaign.player.name}`
          : `Chronique Achevé : ${campaign.world.title}`,
      summary:
        outcome === 'fallen'
          ? `À ${campaign.currentLocation}, après ${campaign.turnCount} tours dans ${campaign.world.title}, ${campaign.player.name} s’effondre mais laisse une trace indélébile.`
          : `Après ${campaign.turnCount} tours et ${campaign.codex.locations.length} lieux découverts, ${campaign.player.name} laisse ${campaign.world.title} transformé à jamais.`,
      finalWords: 'Même les cendres gardent la mémoire du feu.',
      engineUsed: 'demo',
    };
  }

  if (outcome === 'fallen') {
    return {
      title: `Onde ${campaign.player.name} Caiu`,
      summary: `Em ${campaign.currentLocation}, após ${campaign.turnCount} turnos intensos pelos caminhos de ${campaign.world.title}, as forças de ${campaign.player.name} finalmente cederam. O rastro de "${campaign.player.quests[0]?.title || campaign.world.title}" termina em silêncio — mas nenhuma escolha feita até aqui foi em vão.\n\n${firstNpc ? `A notícia de seu último suspiro chegou até ${firstNpc.name}, que guardou na memória o preço pago por quem não recuou.` : 'Quem cruza essas estradas ainda fala baixo sobre a figura que enfrentou o impossível até o último fôlego.'}`,
      finalWords: 'Mesmo as cinzas guardam a forma exata do fogo que as acendeu.',
      engineUsed: 'demo',
    };
  }

  return {
    title: `O Legado de ${campaign.world.title}`,
    summary: `Ao longo de ${campaign.turnCount} turnos e ${campaign.codex.locations.length} locais percorridos, ${campaign.player.name} alterou de forma definitiva o destino de ${campaign.world.title}. Cada pacto, ferida e descoberta moldou um desfecho que nenhum narrador poderia ter escrito sozinho.\n\n${firstNpc ? `Entre os sobreviventes e testemunhas, ${firstNpc.name} levou seu nome adiante quando as luzes da última cena se apagaram.` : 'A crônica se encerra aqui — não com silêncio, mas com um mundo permanentemente transformado.'}`,
    finalWords: 'Algumas histórias terminam; outras viram juramentos contados à beira do fogo.',
    engineUsed: 'demo',
  };
}

const THEME_KEYWORD_RULES: Array<{ theme: WorldThemeId; pattern: RegExp }> = [
  {
    theme: 'cyberpunk',
    pattern: /\b(cyber|neon|hacker|futuro|209\d|21\d\d|rob[oô]|android|corpora|sint[eé]t|cyberpunk|implante)\b/i,
  },
  {
    theme: 'mystery',
    pattern: /\b(mist[eé]rio|detetive|noir|crime|investig|192\d|enigma|trem|mans[aã]o|oculto|desaparec)\b/i,
  },
  {
    theme: 'zombies',
    pattern: /\b(zumbi|zombie|v[ií]rus|infect|quarentena|surto|bunker|morto-vivo|cont[aá]gio)\b/i,
  },
  {
    theme: 'apocalyptic',
    pattern: /\b(apocalip|deserto|radia|colapso|ru[ií]na|sucata|cinzas|caravana|erm[oa]s)\b/i,
  },
  {
    theme: 'fantasy',
    pattern: /\b(magia|drag[aã]o|reino|medieval|fantasia|feiti[cç]|espada|trono|elfo|runa)\b/i,
  },
];

function detectThemeFromPrompt(
  prompt: string,
  fallback: WorldThemeId,
): WorldThemeId {
  for (const rule of THEME_KEYWORD_RULES) {
    if (rule.pattern.test(prompt)) {
      return rule.theme;
    }
  }
  return fallback;
}

function buildDemoTitleFromIdea(idea: string, fallbackTitle: string, lang: LanguageId): string {
  const words = idea
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 4);
  if (words.length === 0) return fallbackTitle;
  const formatted = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return lang === 'en'
    ? `Chronicles of ${formatted}`
    : lang === 'fr'
      ? `Chroniques : ${formatted}`
      : `Crônicas: ${formatted}`;
}

export function demoForgeWorld(req: ForgeWorldRequest): ForgedWorldBlueprint {
  const lang = req.language;
  const idea = req.inspirationPrompt.trim();
  const baseTheme: WorldThemeId =
    req.mode === 'surprise_me'
      ? (Object.keys(WORLD_THEMES) as WorldThemeId[])[
          Math.floor(Math.random() * Object.keys(WORLD_THEMES).length)
        ]
      : detectThemeFromPrompt(idea, req.preferredTheme ?? 'fantasy');

  const preset = WORLD_THEMES[baseTheme];
  const lore = preset.lore[lang];
  const spark = pick(preset.sparks[lang]);
  const arch = pick(preset.archetypes);
  const charSeed = pick(RANDOM_PROTAGONISTS[baseTheme]);

  const isRefine = req.mode === 'refine_lore';
  const existing = req.existingWorld;

  const baseTitle =
    isRefine && existing?.title?.trim()
      ? existing.title.trim()
      : idea
        ? buildDemoTitleFromIdea(idea, spark.title, lang)
        : spark.title;

  const customPremise = idea
    ? lang === 'en'
      ? `${idea}. ${spark.premise}`
      : lang === 'fr'
        ? `${idea}. ${spark.premise}`
        : `${idea}. ${spark.premise}`
    : existing?.premise?.trim() || spark.premise;

  const refinedCreativePrompt = idea
    ? lang === 'en'
      ? `Creative Compass (Demo Preview): Anchor every scene in "${idea}", keeping ${preset.defaultTone[lang]} stakes and constant faction tension.`
      : lang === 'fr'
        ? `Cap Créatif (Aperçu Démo) : Ancrer chaque scène sur « ${idea} » avec un ton ${preset.defaultTone[lang]}.`
        : `Direção Criativa (Modo Demo): Manter toda a trama guiada por "${idea}", combinando o tom ${preset.defaultTone[lang]} com conflitos constantes entre facções.`
    : existing?.creativePrompt?.trim() || lore.prologue;

  const refinedHistory =
    isRefine && existing?.history?.trim()
      ? `${existing.history.trim()}\n\n${idea ? idea : lore.history}`
      : idea
        ? `${lore.history}\n\n${lang === 'en' ? `Turning point shaped by your idea: ${idea}` : lang === 'fr' ? `Tournant lié à votre idée : ${idea}` : `Ponto de virada inspirado na sua ideia: ${idea}`}`
        : lore.history;

  const protagonist = {
    name: charSeed.name,
    age: charSeed.age,
    occupation:
      req.mode === 'protagonist_only' && idea
        ? `${arch.label[lang]} (${idea.slice(0, 32)})`
        : arch.label[lang],
    traits: Array.from(new Set([...arch.traits[lang], charSeed.trait])).slice(0, 3),
    skills: arch.skills[lang].slice(0, 3),
    starterItem: {
      name: arch.starterItem.name[lang],
      category: arch.starterItem.category,
      note: arch.starterItem.note[lang],
    },
  };

  if (req.mode === 'protagonist_only' && existing) {
    return {
      primaryTheme: existing.primaryTheme ?? baseTheme,
      extraGenres: existing.genres?.slice(1, 3) ?? [],
      tone: existing.tone ?? preset.defaultTone[lang],
      title: existing.title || baseTitle,
      era: existing.era || lore.era,
      premise: existing.premise || customPremise,
      history: existing.history || lore.history,
      worldLaws: existing.worldLaws || lore.worldLaws,
      creativePrompt: existing.creativePrompt || refinedCreativePrompt,
      factions: lore.factions.map((f) => ({ ...f })),
      protagonist,
      engineUsed: 'demo',
    };
  }

  return {
    primaryTheme: baseTheme,
    extraGenres: [],
    tone: existing?.tone && isRefine ? existing.tone : preset.defaultTone[lang],
    title: baseTitle,
    era: existing?.era && isRefine ? existing.era : lore.era,
    premise: customPremise,
    history: refinedHistory,
    worldLaws: existing?.worldLaws && isRefine ? existing.worldLaws : lore.worldLaws,
    creativePrompt: refinedCreativePrompt,
    factions: lore.factions.map((f) => ({ ...f })),
    protagonist,
    engineUsed: 'demo',
  };
}
