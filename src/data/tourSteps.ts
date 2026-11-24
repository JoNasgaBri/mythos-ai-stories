export interface TourStep {
  id: string;
  title: string;
  description: string;
  tip: string;
  /** Preferred target selector on Desktop (>= 640px) */
  desktopSelector: string;
  /** Preferred target selector on Mobile (< 640px) */
  mobileSelector: string;
  /** Optional UI preparation callback hint */
  ensureMobileDrawer?: 'open_left' | 'close_all';
}

export const INTERACTIVE_TOUR_STEPS: TourStep[] = [
  {
    id: 'stage-feed',
    title: 'O Palco Narrativo',
    description:
      'Aqui é onde sua história ganha vida. Cada turno traz narração imersiva, falas de personagens em destaque, ilustrações sob demanda e badges com consequências reais.',
    tip: 'Dica: você pode clicar no ícone de áudio de qualquer cena para ouvir a narração ou ilustrar momentos marcantes.',
    desktopSelector: '[data-tour="stage-feed"]',
    mobileSelector: '[data-tour="stage-feed"]',
    ensureMobileDrawer: 'close_all',
  },
  {
    id: 'topbar-island',
    title: 'Ilha Dinâmica: Tempo, Clima & Atlas',
    description:
      'No topo da tela você acompanha o Dia, Horário, Clima atual e onde está no mundo. Clique no relógio para ajustar o ritmo do tempo ou no local para abrir o Atlas Híbrido.',
    tip: 'Dica: quando um Evento do Mundo disparar, ele aparece pulsando aqui em dourado!',
    desktopSelector: '[data-tour="topbar-island"]',
    mobileSelector: '[data-tour="topbar-island"]',
    ensureMobileDrawer: 'close_all',
  },
  {
    id: 'choices-area',
    title: 'Escolhas Táticas & Risco BG3',
    description:
      'A IA gera sugestões táticas com indicação de atributo (FOR, DES, CAR, SAB...) e nível de risco. Ações arriscadas rolam d20 real com bônus da sua ficha e dos companheiros na party.',
    tip: 'No celular, toque no botão "Escolhas" para abrir a gaveta nativa de sugestões sem poluir a leitura.',
    desktopSelector: '[data-tour="choices-area"]',
    mobileSelector: '[data-tour="mobile-choices-btn"]',
    ensureMobileDrawer: 'close_all',
  },
  {
    id: 'command-bar',
    title: 'Liberdade Total: Agir, Falar ou Direção',
    description:
      'Você nunca fica preso às sugestões! Escreva qualquer ação livre, mude para "Falar" para dialogar diretamente com NPCs ou use "Direção" para guiar o rumo da história como coautor.',
    tip: 'Dica: tente combinar itens do inventário ou chamar companheiros da party nas suas ações.',
    desktopSelector: '[data-tour="command-bar"]',
    mobileSelector: '[data-tour="mobile-command-bar"]',
    ensureMobileDrawer: 'close_all',
  },
  {
    id: 'left-rail',
    title: 'Sistemas de RPG: Inventário, Vínculos, Guilda & Base',
    description:
      'Na barra lateral esquerda ficam todos os módulos profundos: Inventário & Equipamentos, Vínculos & Party, Guilda/Facção com Esquadrões, Rádio/Rumores, Bancada de Crafting, Planta da Base e Descanso.',
    tip: 'No celular, toque no ícone de menu no canto superior esquerdo para abrir esta gaveta a qualquer momento.',
    desktopSelector: '[data-tour="left-rail"]',
    mobileSelector: '[data-tour="left-rail-toggle"]',
    ensureMobileDrawer: 'close_all',
  },
  {
    id: 'timeline-btn',
    title: 'Árvore de Linhas Temporais ("E Se?")',
    description:
      'Quer testar outro destino sem perder seu progresso? Abra a Árvore de Linhas Temporais para ver capítulos e viradas da saga e ramificar qualquer momento passado em uma nova realidade paralela!',
    tip: 'Dica: você pode marcar checkpoints manuais antes de decisões críticas e alternar entre linhas em 1 clique.',
    desktopSelector: '[data-tour="timeline-btn"]',
    mobileSelector: '[data-tour="left-rail-toggle"]',
    ensureMobileDrawer: 'close_all',
  },
  {
    id: 'right-hud',
    title: 'Ficha, Vigor, Tensão & Memória Canônica',
    description:
      'Acompanhe Vigor, Tensão, Inspirações (para re-rolar dados ruins), Missões ativas e o Codex vivo de NPCs, locais, facções e Fatos Canônicos que a IA nunca esquece.',
    tip: 'No desktop ou celular, o botão de painel no canto superior direito recolhe ou expande a ficha instantaneamente.',
    desktopSelector: '[data-tour="right-hud"]',
    mobileSelector: '[data-tour="right-hud-toggle"]',
    ensureMobileDrawer: 'close_all',
  },
  {
    id: 'saves-btn',
    title: 'Saves & Sincronização por QR Code (PC ↔ Celular)',
    description:
      'Salve checkpoints manuais e use o botão de QR Code P2P para transferir sua campanha completa (com locais, NPCs e retratos) direto entre o PC e o celular sem precisar exportar JSON.',
    tip: 'O MYTHOS também funciona como App instalável (PWA) com modo leitura offline!',
    desktopSelector: '[data-tour="saves-btn"]',
    mobileSelector: '[data-tour="left-rail-toggle"]',
    ensureMobileDrawer: 'close_all',
  },
  {
    id: 'topbar-docs',
    title: 'Documentação Oficial & Configurações',
    description:
      'Sempre que quiser mergulhar em detalhes de uma mecânica (regras d20, Atlas, Guilda, Craft), abra o Portal de Docs aqui — ou ajuste fonte, estilo da IA e som nas Configurações.',
    tip: 'Pronto! Você já domina o essencial. Boa aventura no MYTHOS!',
    desktopSelector: '[data-tour="topbar-docs"]',
    mobileSelector: '[data-tour="topbar-docs"]',
    ensureMobileDrawer: 'close_all',
  },
];
