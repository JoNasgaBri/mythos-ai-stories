import type {
  DocArticle,
  DocBlock,
  DocCategory,
  DocSearchHit,
} from './docsTypes';

export const DOC_CATEGORIES: DocCategory[] = [
  {
    id: 'getting-started',
    title: 'Primeiros Passos',
    description: 'Arquitetura do jogo, primeira crônica e os 3 modos de comando.',
    icon: 'rocket',
  },
  {
    id: 'rpg-rules',
    title: 'Regras de RPG (BG3)',
    description: 'Atributos 1–20, testes d20, confrontos opostos, Vigor e Tensão.',
    icon: 'dices',
  },
  {
    id: 'characters',
    title: 'Personagens & Vínculos',
    description: 'Protagonista, biometria, companheiros ativos, romance e presentes.',
    icon: 'users',
  },
  {
    id: 'base-economy',
    title: 'Base, Recursos & Crafting',
    description: 'Inventário em 3 camadas, Garagem, Planta da Base e Bancada.',
    icon: 'shield',
  },
  {
    id: 'world-atlas',
    title: 'Mundo Vivo & Cartografia',
    description: 'Relógio, Clima, Storyteller de Eventos e Atlas Híbrido.',
    icon: 'globe',
  },
  {
    id: 'organization-ai',
    title: 'Guilda, IA & Mobile',
    description: 'Facção, Mercenários, Esquadrões, Co-autoria, Voz (TTS) e PWA.',
    icon: 'crown',
  },
];

export const DOC_ARTICLES: DocArticle[] = [
  /* ========================================================================
   * 1. PRIMEIROS PASSOS
   * ======================================================================== */
  {
    id: 'overview',
    categoryId: 'getting-started',
    title: 'Visão Geral do MYTHOS',
    shortTitle: 'Visão Geral',
    summary:
      'Entenda como o motor narrativo do MYTHOS une storytelling literário por IA com mecânicas determinísticas de RPG de mesa.',
    readMinutes: 3,
    badge: 'essential',
    updatedVersion: 'MYTHOS 9.0',
    keywords: ['introdução', 'o que é', 'arquitetura', 'rpg', 'gemini', 'demo'],
    futureTourId: 'tour_overview',
    blocks: [
      {
        type: 'paragraph',
        text: 'O MYTHOS é um RPG narrativo sandbox guiado por inteligência artificial onde cada decisão altera persistentemente sua ficha, seus vínculos, o relógio do mundo, o mapa cartográfico e até uma guilda ou facção sob seu comando.',
      },
      {
        type: 'heading',
        id: 'pilares-do-motor',
        level: 2,
        text: 'Os 4 Pilares do Motor MYTHOS',
      },
      {
        type: 'cardGrid',
        columns: 2,
        cards: [
          {
            title: 'Co-Autoria Colaborativa',
            subtitle: 'Hierarquia de Verdade',
            body: 'Suas mensagens recentes e fatos fixados têm prioridade absoluta sobre a premissa inicial. Você pode evoluir o gênero, o tom e a linha do tempo a qualquer momento.',
            accent: '#a3e635',
          },
          {
            title: 'Regras Determinísticas BG3',
            subtitle: 'Dados e Nível 1–20',
            body: 'Rolagens d20, modificadores de atributo, confrontos físicos opostos e progressão de nível são calculados por código — a IA narra fielmente o resultado real.',
            accent: '#fbbf24',
          },
          {
            title: 'Mundo Vivo & Storyteller',
            subtitle: 'Relógio, Clima e Eventos',
            body: 'O mundo avança em horas, dias e clima, disparando boletins de rádio e dilemas obrigatórios no chat que exigem escolhas com consequências reais.',
            accent: '#38bdf8',
          },
          {
            title: 'Atlas Híbrido & Facção',
            subtitle: 'GPS Real, Obsidian e Esquadrões',
            body: 'Explore locais reais no mapa GPS (Leaflet) ou terrenos procedurais/Grafo Obsidian, construa postos avançados e despache esquadrões em missões paralelas.',
            accent: '#c084fc',
          },
        ],
      },
      {
        type: 'heading',
        id: 'gemini-vs-demo',
        level: 2,
        text: 'Modo Gemini IA vs. Modo Demo Local',
      },
      {
        type: 'table',
        headers: ['Recurso', 'Gemini IA Conectado', 'Modo Demo Local'],
        rows: [
          ['Narração & Diálogos', 'Gemini 3.8 Flash / 4 Argon com cenas dinâmicas e bolhas por personagem', 'Motor procedural offline de demonstração'],
          ['Ilustrações & Mapa IA', 'Nano Banana 2.1 (cenas 16:9, retratos 1:1 e mapas cartográficos)', 'Arte procedural SVG local'],
          ['Narração em Voz (TTS)', 'Gemini 3.8 Flash TTS com alternância Narrador/Personagem', 'Síntese de voz nativa do navegador'],
          ['Atlas GPS & Guilda', 'Geocoding em lote por IA, candidatos e relatórios táticos narrados', 'Presets locais de cidades reais e geradores offline'],
        ],
      },
      {
        type: 'callout',
        tone: 'tip',
        title: 'Onde configurar sua chave da IA',
        body: 'Clique no ícone de engrenagem (Configurações) ou no indicador IA/Demo no canto superior direito da TopBar para inserir sua chave da API Gemini ou alternar entre Gemini 3.8 Flash (rápido) e Gemini 4 Argon (literário).',
      },
    ],
  },
  {
    id: 'quickstart',
    categoryId: 'getting-started',
    title: 'Início Rápido: Sua Primeira Crônica',
    shortTitle: 'Início Rápido',
    summary:
      'Compare os 3 jeitos de começar uma campanha e aprenda o fluxo essencial de um turno em menos de 1 minuto.',
    readMinutes: 3,
    badge: 'essential',
    updatedVersion: 'MYTHOS 9.0',
    keywords: ['começar', 'história livre', 'forja', 'sessão zero', 'tutorial'],
    futureTourId: 'tour_quickstart',
    blocks: [
      {
        type: 'heading',
        id: 'modos-de-inicio',
        level: 2,
        text: 'Escolhendo como começar na Tela Inicial',
      },
      {
        type: 'cardGrid',
        columns: 3,
        cards: [
          {
            title: 'História Livre (Sessão Zero)',
            subtitle: 'Recomendado · Sem limites',
            body: 'Começa numa tela em branco estilo conversa aberta. Você descreve o universo, a época e seu personagem na primeira mensagem e a IA constrói tudo ao redor da sua ideia.',
            accent: '#a3e635',
          },
          {
            title: 'Forjar Novo Mundo',
            subtitle: 'Assistente guiado',
            body: 'Configure gênero, tema visual, leis do mundo, facções e protagonista detalhado — ou peça para o Arquiteto IA gerar um universo completo a partir de uma frase.',
            accent: '#38bdf8',
          },
          {
            title: 'Demo Instantânea',
            subtitle: '1 clique para testar',
            body: 'Abre imediatamente "As Cinzas de Larion" com prólogo, ficha, itens e escolhas prontas para testar o fluxo de jogo e a interface.',
            accent: '#fbbf24',
          },
        ],
      },
      {
        type: 'heading',
        id: 'anatomia-de-um-turno',
        level: 2,
        text: 'Anatomia de um Turno Completo',
      },
      {
        type: 'steps',
        items: [
          {
            title: 'Leia a cena em formato de diálogo ou livro',
            detail: 'As cenas alternam blocos de narração atmosférica, balões de fala com avatar/emoção dos NPCs e cartões de mensagens (WhatsApp, SMS ou Rádio). Você pode alternar para prosa clássica nas Configurações.',
          },
          {
            title: 'Escolha uma ação sugerida ou escreva livremente',
            detail: 'Cada turno oferece 4 escolhas táticas mostrando atributo (ex.: CAR +1) e se exigem d20 ou são Livres. Você também pode clicar no lápis para editar uma escolha antes de enviar ou escrever qualquer ação própria.',
          },
          {
            title: 'Acompanhe o dado d20 (quando houver risco)',
            detail: 'Ações de diálogo comum ou rotina são resolvidas sem dado. Ações arriscadas abrem o d20 animado — em caso de falha, você pode gastar 1 Ponto de Inspiração para rerrolar imediatamente.',
          },
          {
            title: 'Evolua o mundo e use os painéis táticos',
            detail: 'XP, itens, novos locais, mudanças de afinidade e o relógio atualizam automaticamente. Use a barra esquerda para abrir Inventário, Vínculos, Guilda, Bancada, Rádio e Atlas.',
          },
        ],
      },
      {
        type: 'callout',
        tone: 'info',
        title: 'Controles de correção rápida',
        body: 'Logo abaixo da última resposta da IA você sempre encontra os botões Voltar 1 Turno (desfaz instantaneamente sem perder o histórico anterior) e Regerar Cena (pede uma versão alternativa criativa mantendo o mesmo estado).',
      },
    ],
  },
  {
    id: 'command-modes',
    categoryId: 'getting-started',
    title: 'Modos de Comando: Agir, Falar e Dirigir',
    shortTitle: 'Agir, Falar e Dirigir',
    summary:
      'Domine os 3 modos da barra de comando e use receitas copiáveis para co-dirigir cenas, diálogos e reviravoltas com precisão.',
    readMinutes: 4,
    badge: 'pro-tip',
    updatedVersion: 'MYTHOS 9.0',
    keywords: ['agir', 'falar', 'dirigir', 'prompt', 'co-autor', 'receitas', 'diálogo'],
    futureTourId: 'tour_command_modes',
    blocks: [
      {
        type: 'paragraph',
        text: 'A barra inferior permite alternar entre 3 modos distintos. Escolher o modo certo comunica à IA exatamente se você está realizando uma ação física, falando em diálogo direto ou orientando a direção narrativa como co-autor.',
      },
      {
        type: 'table',
        headers: ['Modo', 'Quando usar', 'Rola dado d20?', 'Como aparece no chat'],
        rows: [
          ['Agir', 'Explorar, investigar, lutar, dirigir, construir ou usar itens', 'Automático (só se houver risco real)', 'Bloco de ação do protagonista'],
          ['Falar', 'Conversar em voz alta com personagens presentes na cena', 'Só em persuasão, blefe ou intimidação difícil', 'Balão de fala à direita com seu avatar'],
          ['Dirigir', 'Ajustar linha do tempo, apresentar NPCs, definir regras ou corrigir o cenário', 'Nunca (sempre 100% obedecido)', 'Faixa destacada de Direção do Autor'],
        ],
      },
      {
        type: 'heading',
        id: 'receitas-de-prompt',
        level: 2,
        text: 'Receitas Prontas & Copiáveis de Comando',
      },
      {
        type: 'promptExample',
        mode: 'direct',
        label: 'Definir linha do tempo e introduzir uma aliada com biometria',
        prompt:
          'A história começa 7 dias antes do surto em Miami, com a cidade funcionando normalmente. Apresente minha vizinha Vivian (1,90m, porte atlético, ex-atleta de grappling, protetora e competitiva) batendo na minha porta com um café.',
        explanation:
          'No modo Dirigir, a IA acata cada detalhe como cânone imediato, cria a ficha BG3 de Vivian com altura/físico e evita ameaças prematuras antes do surto.',
      },
      {
        type: 'promptExample',
        mode: 'say',
        label: 'Diálogo direcionado a um NPC específico',
        prompt:
          'Para Vivian: Antes de sairmos para Krome Avenue, quero revisar nosso plano de abastecimento e combinar um sinal de rádio de emergência.',
        explanation:
          'Prefixar com "Para Nome:" renderiza o balão de fala direcionado e estimula uma resposta focada naquela personagem com reação de aprovação.',
      },
      {
        type: 'promptExample',
        mode: 'act',
        label: 'Ação tática combinando inteligência e ambiente',
        prompt:
          'Uso o peso do meu adversário contra ele, recuo um passo para quebrar a pegada e tento imobilizá-lo usando técnica em vez de força bruta.',
        explanation:
          'Descrever a abordagem tática ajuda o motor a inferir o atributo certo (DES/INT/FOR) e produz narração coerente com a física dos personagens.',
      },
      {
        type: 'callout',
        tone: 'tip',
        title: 'Controle manual da política de dado (d20)',
        body: 'Ao lado do seletor de modo existe a pílula de dado. Toque para ciclar entre d20 Automático (padrão inteligente), Forçar teste (sempre rola d20) e Sem dado (Narrativo) quando quiser apenas interpretar livremente.',
      },
    ],
  },

  /* ========================================================================
   * 2. REGRAS DE RPG (BG3)
   * ======================================================================== */
  {
    id: 'bg3-attributes',
    categoryId: 'rpg-rules',
    title: 'Sistema BG3: Atributos, Escala 1–20 & Progressão',
    shortTitle: 'Atributos & Nível 1–20',
    summary:
      'Referência completa da escala de atributos inspirada em Baldur’s Gate 3 / D&D 5e, bônus de proficiência e marcos de evolução até o nível 20.',
    readMinutes: 5,
    badge: 'reference',
    updatedVersion: 'MYTHOS 9.0',
    keywords: ['bg3', 'força', 'destreza', 'constituição', 'inteligência', 'sabedoria', 'carisma', 'nível', 'asi', 'xp'],
    blocks: [
      {
        type: 'paragraph',
        text: 'O MYTHOS utiliza a escala autêntica de Baldur’s Gate 3 / D&D 5ª Edição, onde cada ponto de atributo representa uma diferença física ou mental tangível no mundo — e o nível máximo do protagonista é o Nível 20.',
      },
      {
        type: 'heading',
        id: 'tabela-escala-atributos',
        level: 2,
        text: 'Escala de Atributos e Modificadores',
      },
      {
        type: 'table',
        caption: 'Fórmula do modificador: floor((Valor - 10) / 2)',
        headers: ['Valor', 'Modificador', 'Significado Narrativo no Mundo'],
        rows: [
          ['8 – 9', '-1', 'Abaixo da média civil; vulnerabilidade perceptível'],
          ['10 – 11', '+0', 'Pessoa comum / cidadão sem treino especializado'],
          ['12 – 13', '+1', 'Praticante treinado, bom condicionamento ou estudo regular'],
          ['14 – 15', '+2', 'Profissional experiente ou competidor acima da média'],
          ['16 – 17', '+3', 'Atleta de elite, veterano de combate ou especialista raro'],
          ['18 – 19', '+4', 'Ápice humano extraordinário'],
          ['20', '+5', 'Teto natural sobre-humano (máximo via pontos de nível)'],
          ['21 – 24', '+5 a +7', 'Apenas por meio de equipamentos lendários, relíquias ou implantes'],
        ],
      },
      {
        type: 'heading',
        id: 'os-seis-atributos',
        level: 2,
        text: 'O que cada um dos 6 Atributos governa',
      },
      {
        type: 'bulletList',
        items: [
          { lead: 'FOR (Força):', text: 'Combate corpo a corpo, grappling, arrombar portas, carregar peso e resistência a empurrões.' },
          { lead: 'DES (Destreza):', text: 'Furtividade, pontaria com armas de fogo/arcos, reflexos, direção evasiva e arrombamento fino.' },
          { lead: 'CON (Constituição):', text: 'Define seu Vigor Máximo, resistência a venenos, fadiga, ferimentos e testes de sobrevivência.' },
          { lead: 'INT (Inteligência):', text: 'Investigação forense, mecânica, eletrônica, hacking, finanças, medicina teórica e arcano.' },
          { lead: 'SAB (Sabedoria):', text: 'Percepção, intuição para detectar mentiras, sobrevivência, rastreamento e força de vontade.' },
          { lead: 'CAR (Carisma):', text: 'Persuasão, negociação, liderança de facção, blefe, intimidação social e romance.' },
        ],
      },
      {
        type: 'heading',
        id: 'progressao-nivel-20',
        level: 2,
        text: 'Progressão de Nível (1–20), Proficiência e ASI',
      },
      {
        type: 'table',
        headers: ['Faixa de Nível', 'Bônus de Proficiência', 'Marcos de Atributo (ASI)', 'Vigor Base'],
        rows: [
          ['Níveis 1 – 4', '+2', 'Nível 4 (+2 pontos livres)', 'Escala com Nível + mod. CON'],
          ['Níveis 5 – 8', '+3', 'Nível 8 (+2 pontos livres)', 'Aumenta a cada subida de nível'],
          ['Níveis 9 – 12', '+4', 'Nível 12 (+2 pontos livres)', 'Somado a bônus de armaduras/relíquias'],
          ['Níveis 13 – 16', '+5', 'Nível 16 (+2 pontos livres)', 'Veterano de alto escalão'],
          ['Níveis 17 – 20', '+6', 'Nível 20 (+2 pontos livres)', 'Lenda viva (teto Nv. 20)'],
        ],
      },
      {
        type: 'callout',
        tone: 'info',
        title: 'Treino de Habilidades & Talentos',
        body: 'Além dos 6 atributos, praticar atividades (como treino tático, mecânica ou tiro) aumenta suas Habilidades (Nv. 1 a 5), adicionando bônus diretos nas rolagens relacionadas. Conquistas marcantes desbloqueiam Talentos passivos permanentes.',
      },
    ],
  },
  {
    id: 'dice-contests',
    categoryId: 'rpg-rules',
    title: 'Dados d20, Vantagem & Confrontos Opostos',
    shortTitle: 'Dados d20 & Confrontos',
    summary:
      'Como o motor decide quando rolar o d20, calcula DC por dificuldade, aplica Vantagem de companheiros e avalia desvantagens físicas reais.',
    readMinutes: 4,
    badge: 'mechanics',
    updatedVersion: 'MYTHOS 9.0',
    keywords: ['d20', 'vantagem', 'desvantagem', 'confronto oposto', 'inspiração', 'dc', 'crítico'],
    blocks: [
      {
        type: 'heading',
        id: 'formula-rolagem',
        level: 2,
        text: 'Fórmula Completa do Teste d20',
      },
      {
        type: 'callout',
        tone: 'example',
        title: 'Resultado Total',
        body: 'Total = d20 + Modificador de Atributo + Bônus de Habilidade (se aplicável) + Ajustes de Clima/Tensão — comparado contra a Classe de Dificuldade (DC).',
      },
      {
        type: 'table',
        headers: ['Dificuldade da Campanha', 'DC Base', 'Experiência'],
        rows: [
          ['Fácil (História)', '9', 'Aberturas generosas e foco quase total na narrativa'],
          ['Normal (Equilibrado)', '12', 'Desafio justo onde sua build e escolhas fazem diferença'],
          ['Difícil (Tático)', '14', 'Margem menor para erros; preparo e aliados importam muito'],
          ['Insano / Boa Sorte', '16 – 18', 'Sobrevivência implacável onde cada recurso e ponto conta'],
        ],
      },
      {
        type: 'heading',
        id: 'vantagem-e-confrontos',
        level: 2,
        text: 'Vantagem de Grupo vs. Confrontos Opostos Realistas',
      },
      {
        type: 'bulletList',
        items: [
          {
            lead: 'Vantagem (2×d20, pega o maior):',
            text: 'Quando um companheiro no seu Grupo Ativo tem especialidade no atributo do teste, ele te dá Vantagem automática na rolagem.',
          },
          {
            lead: 'Confronto Oposto contra NPC:',
            text: 'Se você desafia um NPC específico (ex.: luta de grappling contra uma aliada de 1,90m), o sistema calcula o DC usando os atributos REAIS daquele NPC, remove o oponente da ajuda de grupo e ignora bônus de armas em disputas desarmadas.',
          },
          {
            lead: 'Desvantagem Física (2×d20, pega o menor):',
            text: 'Em disputas diretas de força/luta corpo a corpo, uma diferença grande de estatura (≥ 14 cm) ou força bruta (≥ 3 pontos de FOR) impõe Desvantagem realista — exigindo criatividade tática ou um ótimo dado para vencer.',
          },
          {
            lead: 'Cancelamento BG3:',
            text: 'Se você tiver Vantagem e Desvantagem ao mesmo tempo na mesma ação, ambas se anulam em uma rolagem normal (1×d20).',
          },
        ],
      },
      {
        type: 'heading',
        id: 'pontos-de-inspiracao',
        level: 2,
        text: 'Pontos de Inspiração (Rerrolar d20)',
      },
      {
        type: 'paragraph',
        text: 'Você pode acumular até 4 Pontos de Inspiração (ganhos em sucessos críticos naturais 20 ou interpretações marcantes). Sempre que um dado cair em Falha ou Sucesso Parcial, você pode gastar 1 Inspiração tanto no overlay do dado quanto no botão abaixo da cena para rerrolar o d20.',
      },
    ],
  },
  {
    id: 'vigor-tension-rest',
    categoryId: 'rpg-rules',
    title: 'Vigor, Tensão, Crises & Descanso',
    shortTitle: 'Vigor, Tensão & Descanso',
    summary:
      'Entenda como gerenciar sobrevivência física, pressão psicológica (Ponto de Ruptura) e recuperação em Descansos Curtos e Longos.',
    readMinutes: 3,
    badge: 'mechanics',
    updatedVersion: 'MYTHOS 9.0',
    keywords: ['vigor', 'hp', 'tensão', 'crise', 'ponto de ruptura', 'descanso curto', 'descanso longo'],
    blocks: [
      {
        type: 'cardGrid',
        columns: 2,
        cards: [
          {
            title: 'Vigor (Vida & Energia)',
            subtitle: 'Chegar a 0 ativa Crise de Sobrevivência',
            body: 'Representa sua integridade física e fôlego. Ao cair para 0, você não morre instantaneamente: abre-se a Crise de Colapso onde pode rolar Teste de Sobrevivência (d20), consumir um item de emergência (+30 Vigor) ou aceitar o desfecho.',
            accent: '#4ade80',
          },
          {
            title: 'Tensão (0% a 100%)',
            subtitle: '100% ativa Ponto de Ruptura',
            body: 'Mede o estresse e o perigo iminente da cena. Acima de 75%, a música ambiente intensifica; ao atingir 100%, sua próxima ação desencadeia uma virada climática decisiva que reseta a pressão após o clímax.',
            accent: '#fbbf24',
          },
        ],
      },
      {
        type: 'heading',
        id: 'descanso-curto-longo',
        level: 2,
        text: 'Descanso Curto vs. Descanso Longo (Acampamento)',
      },
      {
        type: 'table',
        headers: ['Tipo', 'Limite / Custo', 'Efeito', 'Avanço no Relógio'],
        rows: [
          ['Descanso Curto', 'Até 2 por dia (gratuito)', 'Recupera parte do Vigor e alivia Tensão rapidamente', '+1 hora'],
          ['Descanso Longo', 'Consome Comida (ou gratuito sem base)', 'Restaura Vigor completo, reduz Tensão e reseta Descansos Curtos', 'Avança até a manhã do dia seguinte (dispara balanço da Guilda)'],
        ],
      },
    ],
  },

  /* ========================================================================
   * 3. PERSONAGENS & VÍNCULOS
   * ======================================================================== */
  {
    id: 'protagonist-biometrics',
    categoryId: 'characters',
    title: 'Ficha do Protagonista & Biometria',
    shortTitle: 'Protagonista & Biometria',
    summary:
      'Como editar nome, idade, altura, porte físico, aparência e atributos diretamente no menu do protagonista para a IA respeitar sua identidade.',
    readMinutes: 3,
    badge: 'essential',
    updatedVersion: 'MYTHOS 9.0',
    keywords: ['editar protagonista', 'nome', 'altura', 'biometria', 'físico', 'retrato', 'ficha'],
    blocks: [
      {
        type: 'paragraph',
        text: 'Todos os dados do seu personagem — inclusive biometria como altura (ex.: 1,70 m) e porte físico (ex.: esguio, não-atlético) — são enviados diretamente à IA e ao motor de confrontos físicos.',
      },
      {
        type: 'steps',
        items: [
          {
            title: 'Abra a edição rápida do Protagonista',
            detail: 'No painel direito (Ficha & Mundo), clique no botão Editar Perfil ao lado do nome do protagonista ou acesse pela aba Ficha no modal de Inventário.',
          },
          {
            title: 'Ajuste nome, ocupação e biometria',
            detail: 'Defina nome real, idade, altura, tipo físico e descrição visual. Ao salvar, a memória da IA é sincronizada imediatamente para usar essas características em todas as cenas futuras.',
          },
          {
            title: 'Distribua pontos de atributo e gere retrato',
            detail: 'Quando subir de nível em marcos ASI (4, 8, 12, 16, 20), gaste seus pontos livres nos 6 atributos e clique em Novo Retrato para gerar uma imagem atualizada com seu equipamento equipado.',
          },
        ],
      },
      {
        type: 'callout',
        tone: 'tip',
        title: 'Por que a altura e o físico importam?',
        body: 'O sistema lê a altura e o porte tanto do protagonista quanto dos NPCs para calcular vantagens/desvantagens físicas em lutas desarmadas e orientar descrições realistas de postura e alcance.',
      },
    ],
  },
  {
    id: 'companions-bonds',
    categoryId: 'characters',
    title: 'Companheiros, Grupo Ativo & Romance',
    shortTitle: 'Companheiros & Vínculos',
    summary:
      'Construa amizades, rivalidades e romances estilo BG3, adicione aliados ao Grupo Ativo para ganhar Vantagem nos dados e dê presentes.',
    readMinutes: 4,
    badge: 'mechanics',
    updatedVersion: 'MYTHOS 9.0',
    keywords: ['npc', 'companheiros', 'grupo ativo', 'afinidade', 'romance', 'presente', 'aprovação'],
    blocks: [
      {
        type: 'paragraph',
        text: 'Cada personagem marcante que você conhece ganha uma ficha completa em Vínculos (ícone de coração na barra esquerda), contendo biometria, 6 atributos BG3, habilidades, gostos, desgostos, humor atual e um Diário de Laços.',
      },
      {
        type: 'heading',
        id: 'niveis-de-vinculo',
        level: 2,
        text: 'Escala de Afinidade (-100 a +100)',
      },
      {
        type: 'table',
        headers: ['Faixa de Afinidade', 'Nível de Vínculo', 'Efeito Narrativo'],
        rows: [
          ['-100 a -45', 'Inimigo / Rival', 'Hostilidade ativa, sabotagens e confrontos'],
          ['-44 a +14', 'Desconhecido / Conhecido', 'Relação formal, cautelosa ou profissional'],
          ['+15 a +54', 'Amigo / Aliado', 'Confiança estabelecida; pode entrar no Grupo Ativo ou Guilda'],
          ['+55 a +100', 'Íntimo / Romance / Parceiro', 'Lealdade profunda, cenas íntimas e bônus de Moral na Organização'],
        ],
      },
      {
        type: 'heading',
        id: 'acoes-com-companheiros',
        level: 2,
        text: 'Interações Diretas no Painel de Vínculos',
      },
      {
        type: 'bulletList',
        items: [
          { lead: 'Grupo Ativo (até 3 companheiros):', text: 'Aliados no Grupo acompanham suas cenas, comentam suas decisões com reações de aprovação/desaprovação e concedem Vantagem (2×d20) na especialidade deles.' },
          { lead: 'Presentear Itens:', text: 'Envie um item da sua mochila para um NPC; itens alinhados aos Gostos pessoais do personagem rendem bônus extra de afinidade.' },
          { lead: 'Editar Ficha & Retrato IA:', text: 'Você pode ajustar altura, idade, personalidade ou atributos de qualquer NPC e gerar retratos exclusivos com Nano Banana 2.1.' },
        ],
      },
    ],
  },

  /* ========================================================================
   * 4. BASE, RECURSOS & CRAFTING
   * ======================================================================== */
  {
    id: 'inventory-garage',
    categoryId: 'base-economy',
    title: 'Inventário em 3 Camadas & Garagem',
    shortTitle: 'Inventário & Garagem',
    summary:
      'Organize o que carrega no corpo (Mochila), o que guarda no Refúgio (Depósito) e o que vai no Porta-malas dos seus veículos.',
    readMinutes: 3,
    badge: 'essential',
    updatedVersion: 'MYTHOS 9.0',
    keywords: ['inventário', 'mochila', 'base', 'veículo', 'garagem', 'equipar', 'raridade'],
    blocks: [
      {
        type: 'paragraph',
        text: 'Para manter realismo sem bagunçar sua mochila com geradores ou caixas pesadas, o MYTHOS separa automaticamente seus itens em 3 locais de armazenamento — e você pode mover qualquer item entre eles em 1 clique.',
      },
      {
        type: 'cardGrid',
        columns: 3,
        cards: [
          {
            title: 'Mochila (Com Você)',
            subtitle: 'Uso imediato em cena',
            body: 'Armas, ferramentas portáteis, chaves, consumíveis e equipamentos vestidos nos 6 slots (Arma, Secundária, Cabeça, Armadura, Acessório, Utilitário).',
            accent: '#a3e635',
          },
          {
            title: 'Depósito da Base',
            subtitle: 'Cargas pesadas e reserva',
            body: 'Geradores, reservas extras, caixotes e peças guardadas em segurança no seu Refúgio.',
            accent: '#c084fc',
          },
          {
            title: 'Garagem & Porta-malas',
            subtitle: 'Frota de veículos',
            body: 'Carros, picapes, barcos ou montarias com medidor de Combustível (%) e Condição (%). Veículos também aceleram operações de Esquadrão!',
            accent: '#fb923c',
          },
        ],
      },
      {
        type: 'callout',
        tone: 'tip',
        title: 'Botão Auto-Organizar',
        body: 'Dentro do Inventário, o botão Auto-Organizar detecta automaticamente itens pesados ou veículos que estavam na mochila e os move para o Depósito ou Garagem.',
      },
    ],
  },
  {
    id: 'base-workbench',
    categoryId: 'base-economy',
    title: 'Planta da Base, Suprimentos & Bancada',
    shortTitle: 'Base & Bancada',
    summary:
      'Fortifique seu Refúgio, gerencie os 5 suprimentos estratégicos e use a Bancada para aprimorar armas, ferramentas e veículos com IA.',
    readMinutes: 3,
    badge: 'mechanics',
    updatedVersion: 'MYTHOS 9.0',
    keywords: ['base', 'refúgio', 'planta', 'suprimentos', 'bancada', 'crafting', 'oficina'],
    blocks: [
      {
        type: 'heading',
        id: 'suprimentos-estrategicos',
        level: 2,
        text: 'Os 5 Suprimentos Estratégicos da Base',
      },
      {
        type: 'table',
        headers: ['Suprimento', 'Principal Uso no Jogo'],
        rows: [
          ['Comida / Rações', 'Alimentação diária no Descanso Longo e manutenção da Guilda/Comunidade'],
          ['Combustível', 'Reabastecer veículos da Garagem e despachar esquadrões motorizados'],
          ['Materiais / Peças', 'Crafting na Bancada, upgrades da Planta da Base e reivindicar Postos Avançados'],
          ['Remédios', 'Tratamento de ferimentos, eventos médicos e suporte da Enfermaria'],
          ['Munição', 'Operações armadas, escoltas e defesa do perímetro'],
        ],
      },
      {
        type: 'heading',
        id: 'planta-e-bancada',
        level: 2,
        text: 'Instalações da Base & Crafting Customizado',
      },
      {
        type: 'bulletList',
        items: [
          { lead: 'Planta da Base:', text: 'Instale melhorias como Barricadas (+Defesa), Enfermaria, Estação de Treino (+25% progresso de habilidades) e Oficina.' },
          { lead: 'Bancada de Crafting (IA):', text: 'Escolha qualquer item ou veículo, gaste Materiais e escreva sua ideia de modificação (ex.: "instalar para-choque reforçado e rádio criptografado na F-250"). A IA gera o upgrade mecânico, sobe a raridade e registra na memória.' },
        ],
      },
    ],
  },

  /* ========================================================================
   * 5. MUNDO VIVO & CARTOGRAFIA
   * ======================================================================== */
  {
    id: 'living-world-events',
    categoryId: 'world-atlas',
    title: 'Relógio, Clima, Rádio & Storyteller (Eventos)',
    shortTitle: 'Mundo Vivo & Eventos',
    summary:
      'Entenda o Relógio HH:MM, efeitos climáticos nos testes, o Rádio de Rumores e os Eventos Dinâmicos obrigatórios estilo RimWorld.',
    readMinutes: 4,
    badge: 'mechanics',
    updatedVersion: 'MYTHOS 9.0',
    keywords: ['relógio', 'clima', 'chuva', 'rádio', 'rumores', 'storyteller', 'eventos', 'dilema'],
    blocks: [
      {
        type: 'heading',
        id: 'relogio-e-clima',
        level: 2,
        text: 'Relógio Dinâmico & Efeitos do Clima',
      },
      {
        type: 'paragraph',
        text: 'Clique na ilha central da TopBar (Dia · Hora · Clima) para configurar se o relógio avança automaticamente pela IA (conforme a duração real de cada ação), em passos fixos ou manualmente. O clima afeta a atmosfera visual e as rolagens:',
      },
      {
        type: 'table',
        headers: ['Clima', 'Efeito Tático'],
        rows: [
          ['Céu Limpo', '+1 em Percepção / SAB ao ar livre'],
          ['Chuva / Tempestade', 'Mascaramento sonoro (+1 Furtividade), mas reduz visibilidade'],
          ['Neblina', 'Excelente para infiltração, risco maior de emboscadas'],
          ['Onda de Calor / Neve / Cinzas', 'Aumenta desgaste físico em deslocamentos longos'],
        ],
      },
      {
        type: 'heading',
        id: 'storyteller-eventos',
        level: 2,
        text: 'AI Storyteller — Eventos Dinâmicos Obrigatórios no Chat',
      },
      {
        type: 'paragraph',
        text: 'Inspirado em RimWorld e Frostpunk, o Diretor de Eventos analisa o ritmo, a tensão, a virada do dia e suas decisões recentes para disparar dilemas vivos diretamente no chat (crises, encontros inesperados, oportunidades raras ou incidentes na base).',
      },
      {
        type: 'callout',
        tone: 'warning',
        title: 'Decisão Obrigatória',
        body: 'Quando um Evento do Mundo aparece no chat, a barra de mensagem fica travada até você escolher uma das 3 respostas do dilema — garantindo que o mundo reaja com impacto real. Você também pode ajustar a frequência do Storyteller (Tranquilo, Equilibrado, Caótico) nas Configurações ou invocar um evento manualmente na barra esquerda.',
      },
      {
        type: 'callout',
        tone: 'tip',
        title: 'Rádio & Rumores',
        body: 'Abra o ícone de Rádio na barra esquerda para sintonizar boletins, boatos de taverna ou feeds da cidade. Cada rumor pode ser transformado em missão ativa ou investigado imediatamente em 1 clique.',
      },
    ],
  },
  {
    id: 'hybrid-atlas',
    categoryId: 'world-atlas',
    title: 'Atlas Cartográfico Híbrido (GPS Real, Procedural & Obsidian)',
    shortTitle: 'Atlas & Mapas',
    summary:
      'Use mapas reais com satélite via GPS para histórias na Terra, terrenos procedurais com arte IA para mundos fictícios e o Grafo Obsidian para centenas de locais.',
    readMinutes: 4,
    badge: 'reference',
    updatedVersion: 'MYTHOS 9.0',
    keywords: ['mapa', 'atlas', 'gps', 'leaflet', 'satélite', 'miami', 'obsidian', 'grafo', 'procedural'],
    blocks: [
      {
        type: 'paragraph',
        text: 'O Atlas Cartográfico do MYTHOS foi projetado para suportar desde pequenas vilas até campanhas procedurais com 100+ locais descobertos, alternando entre 3 motores visuais integrados:',
      },
      {
        type: 'cardGrid',
        columns: 3,
        cards: [
          {
            title: 'Mapa Real (GPS · Leaflet)',
            subtitle: 'Campanhas na Terra real',
            body: 'Renderiza mapas reais gratuitos com 3 camadas: Tático Escuro, Satélite e Urbano. Pinos são posicionados em coordenadas GPS reais com micro-espiral anti-empilhamento.',
            accent: '#4ade80',
          },
          {
            title: 'Terreno Procedural + Arte IA',
            subtitle: 'Mundos fictícios',
            body: 'Gera continentes e curvas de nível procedurais com seed única do seu mundo, além de permitir gerar uma ilustração cartográfica top-down com Nano Banana 2.1.',
            accent: '#fbbf24',
          },
          {
            title: 'Grafo estilo Obsidian',
            subtitle: 'Escala infinita',
            body: 'Física force-directed que agrupa locais em hubs de bairro/região (ex.: Redland, Brickell). Suporta zoom no cursor, arrastar nós e foco em conexões ao passar o mouse.',
            accent: '#38bdf8',
          },
        ],
      },
      {
        type: 'heading',
        id: 'sincronizar-e-limpar-atlas',
        level: 2,
        text: 'Sincronizar GPS (IA), Busca & Limpeza de Marcadores',
      },
      {
        type: 'bulletList',
        items: [
          { lead: 'Sincronizar GPS (IA):', text: 'Clique no botão no topo do Atlas para que a IA agrupe todos os locais já descobertos por bairro/região e atribua coordenadas GPS precisas em lote.' },
          { lead: 'Busca & Filtros:', text: 'Filtre instantaneamente por nome, região ou categoria (Cidade, Refúgio, Comércio, Dungeon, Secreto, Ermos).' },
          { lead: 'Remover duplicados:', text: 'Ao selecionar qualquer local (exceto onde você está agora), clique em Remover no rodapé para limpar cômodos antigos ou marcadores repetidos.' },
          { lead: 'Postos Avançados:', text: 'Territórios reivindicados pela sua Organização exibem o selo dourado ⚑ Posto diretamente no inspetor do Atlas.' },
        ],
      },
    ],
  },

  /* ========================================================================
   * 6. GUILDA, IA & MOBILE
   * ======================================================================== */
  {
    id: 'guild-faction-ops',
    categoryId: 'organization-ai',
    title: 'Guilda, Mercenários, Divisões & Esquadrões',
    shortTitle: 'Guilda & Esquadrões',
    summary:
      'Guia completo do MYTHOS 9.0: funde sua organização, aloque divisões na base, contrate mercenários, despache esquadrões na War Table e controle postos avançados.',
    readMinutes: 5,
    badge: 'reference',
    updatedVersion: 'MYTHOS 9.0',
    keywords: ['guilda', 'facção', 'mercenários', 'esquadrões', 'divisões', 'war table', 'postos', 'diplomacia', 'heat', 'moral'],
    blocks: [
      {
        type: 'paragraph',
        text: 'Abra o ícone de coroa na barra lateral esquerda para fundar sua Organização (o nome se adapta automaticamente ao universo: Guilda, Comunidade, Sindicato, Companhia Mercenária, Milícia ou Comboio).',
      },
      {
        type: 'heading',
        id: 'arquetipos-organizacao',
        level: 2,
        text: 'Os 6 Arquétipos e seus Bônus Passivos',
      },
      {
        type: 'table',
        headers: ['Arquétipo', 'Bônus Principal'],
        rows: [
          ['Companhia Mercenária', '+25% pagamento em contratos · +2 em Raids e Escoltas'],
          ['Comunidade de Sobreviventes', '-25% consumo de comida · +10 Moral inicial · cura mais rápida'],
          ['Guilda de Aventureiros', '+30% Renome em operações · +2 em Coleta e Exploração'],
          ['Sindicato Clandestino', '-35% ganho de Notoriedade (Heat) · +2 em Espionagem'],
          ['Força Tática / Milícia', '+12 Defesa da Base · guarnições de postos valem o dobro'],
          ['Comboio Mercante', 'Veículos aceleram operações em 45% · +20% renda comercial'],
        ],
      },
      {
        type: 'heading',
        id: 'divisoes-e-manutencao',
        level: 2,
        text: 'Divisões da Base & Ciclo Diário',
      },
      {
        type: 'table',
        headers: ['Divisão', 'Atributos BG3', 'Produção / Efeito'],
        rows: [
          ['Vanguarda & Segurança', 'FOR / CON', 'Eleva Defesa da Base e gera Munição em níveis altos'],
          ['Inteligência & Recon', 'SAB / INT', 'Reduz Heat diariamente e melhora operações de espionagem'],
          ['Logística & Oficina', 'INT / DES', 'Produz Materiais e Combustível todo dia'],
          ['Enfermaria & Suporte', 'SAB / INT', 'Acelera recuperação de feridos e produz Remédios'],
          ['Diplomacia & Mercado', 'CAR / SAB', 'Gera renda diária e fortalece acordos com facções'],
        ],
      },
      {
        type: 'heading',
        id: 'war-table-operacoes',
        level: 2,
        text: 'War Table: Delegar vs. Jogar no Chat',
      },
      {
        type: 'bulletList',
        items: [
          { lead: 'Despachar Esquadrão (1–3 membros + Veículo):', text: 'Você vê a chance real (%) antes de enviar. As horas e turnos passam enquanto você joga sua cena; ao terminar, clique em Abrir Relatório para rolar o d20 e ler o diário tático narrado pela IA.' },
          { lead: 'Assumir o Controle (Jogar no Chat):', text: 'Qualquer contrato ou missão de resgate pode ser assumido pessoalmente por você na narrativa principal em 1 clique.' },
          { lead: 'Ferimentos e Resgates:', text: 'Em falhas graves de alto risco, membros podem ser feridos (tratados na Enfermaria) ou capturados — gerando automaticamente uma operação de Resgate em vez de morte injusta fora da tela.' },
          { lead: 'Postos Avançados & Diplomacia:', text: 'Reivindique locais do Atlas para produção passiva diária e firme tratados (Não-Agressão, Pacto Comercial, Aliança ou Guerra) com outras facções.' },
        ],
      },
    ],
  },
  {
    id: 'ai-memory-mobile-pwa',
    categoryId: 'organization-ai',
    title: 'Memória da IA, Narração em Voz (TTS), Mobile PWA & Saves',
    shortTitle: 'Memória IA, Voz & Mobile',
    summary:
      'Como fixar fatos canônicos na memória da IA, ouvir cenas narradas com múltiplas vozes, instalar o app no Android/iOS e fazer backup dos seus saves.',
    readMinutes: 4,
    badge: 'pro-tip',
    updatedVersion: 'MYTHOS 9.0',
    keywords: ['memória', 'fatos fixados', 'tts', 'voz', 'áudio', 'android', 'ios', 'celular', 'pwa', 'save', 'json', 'backup'],
    blocks: [
      {
        type: 'heading',
        id: 'memoria-da-ia',
        level: 2,
        text: 'Gerenciando a Memória Permanente da IA',
      },
      {
        type: 'paragraph',
        text: 'O MYTHOS utiliza memória em 3 camadas: resumo automático de capítulos a cada 5 turnos, compressão de arcos/livros a cada 10 capítulos e Fatos Canônicos Fixados (que você pode adicionar ou remover manualmente na aba Memória do painel direito).',
      },
      {
        type: 'callout',
        tone: 'tip',
        title: 'Dica de ouro para campanhas longas',
        body: 'Sempre que estabelecer uma regra importante, promessa ou detalhe que a IA nunca deve esquecer, fixe uma frase curta em Fatos Canônicos. Fatos fixados têm prioridade sobre todos os turnos antigos.',
      },
      {
        type: 'heading',
        id: 'mobile-android-ios',
        level: 2,
        text: 'Experiência Mobile (Android & iOS) e Instalação PWA',
      },
      {
        type: 'bulletList',
        items: [
          { lead: 'Leitura em Tela Cheia (~82% da tela):', text: 'No celular, as 4 escolhas recolhem para um Bottom Sheet nativo — toque na pílula Escolhas (4) ou no convite ao final da cena para abrir sem poluir a leitura.' },
          { lead: 'Instalar como App no Android (Chrome):', text: 'Abra o menu ⋮ do navegador e toque em "Instalar aplicativo" ou "Adicionar à tela inicial".' },
          { lead: 'Instalar como App no iPhone (Safari):', text: 'Toque no botão Compartilhar e escolha "Adicionar à Tela de Início" — o MYTHOS roda em tela cheia respeitando a Dynamic Island e a barra Home.' },
        ],
      },
      {
        type: 'heading',
        id: 'voz-e-saves',
        level: 2,
        text: 'Narração em Voz (TTS) & Backup de Campanhas',
      },
      {
        type: 'bulletList',
        items: [
          { lead: 'Ouvir Cena:', text: 'Clique em Ouvir no cabeçalho de qualquer cena para escutar a narração via Gemini 3.8 Flash TTS (com voz distinta para narrador e diálogos).' },
          { lead: 'Slots de Save & Exportar JSON:', text: 'Todas as campanhas são salvas automaticamente no banco local IndexedDB do seu dispositivo. Use o menu de Saves para criar pontos de restauração nomeados ou exportar um arquivo .json para transferir sua campanha entre PC e celular.' },
        ],
      },
    ],
  },
];

function extractBlockPlainText(block: DocBlock): string {
  switch (block.type) {
    case 'heading':
    case 'paragraph':
      return block.text;
    case 'callout':
      return `${block.title} ${block.body}`;
    case 'table':
      return `${block.caption ?? ''} ${block.headers.join(' ')} ${block.rows.flat().join(' ')}`;
    case 'steps':
      return block.items.map((i) => `${i.title} ${i.detail}`).join(' ');
    case 'promptExample':
      return `${block.label} ${block.prompt} ${block.explanation}`;
    case 'cardGrid':
      return block.cards
        .map((c) => `${c.title} ${c.subtitle ?? ''} ${c.body}`)
        .join(' ');
    case 'bulletList':
      return block.items.map((i) => `${i.lead ?? ''} ${i.text}`).join(' ');
  }
}

export function getArticleHeadings(
  article: DocArticle,
): Array<{ id: string; level: 2 | 3; text: string }> {
  return article.blocks
    .filter(
      (b): b is Extract<DocBlock, { type: 'heading' }> => b.type === 'heading',
    )
    .map((b) => ({ id: b.id, level: b.level, text: b.text }));
}

export function searchDocsCatalog(rawQuery: string): DocSearchHit[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  const tokens = query.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length === 0) return [];

  const categoryById = new Map(DOC_CATEGORIES.map((c) => [c.id, c]));
  const hits: DocSearchHit[] = [];

  for (const article of DOC_ARTICLES) {
    const category = categoryById.get(article.categoryId);
    if (!category) continue;

    const titleLow = article.title.toLowerCase();
    const summaryLow = article.summary.toLowerCase();
    const kwLow = article.keywords.join(' ').toLowerCase();
    const bodyText = article.blocks.map(extractBlockPlainText).join(' ');
    const bodyLow = bodyText.toLowerCase();

    let score = 0;
    let firstMatchIdx = -1;

    for (const token of tokens) {
      if (titleLow.includes(token)) score += 14;
      if (kwLow.includes(token)) score += 10;
      if (summaryLow.includes(token)) score += 6;
      const idx = bodyLow.indexOf(token);
      if (idx >= 0) {
        score += 3;
        if (firstMatchIdx < 0) firstMatchIdx = idx;
      }
    }

    if (score <= 0) continue;

    let snippet = article.summary;
    if (firstMatchIdx >= 0) {
      const start = Math.max(0, firstMatchIdx - 42);
      const end = Math.min(bodyText.length, firstMatchIdx + 110);
      snippet = `${start > 0 ? '…' : ''}${bodyText.slice(start, end).trim()}${end < bodyText.length ? '…' : ''}`;
    }

    hits.push({ article, category, snippet, score });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, 12);
}
