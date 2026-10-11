-- =====================================================================
-- FalaBrincando - BIBLIOTECA COMPLETA DE ATIVIDADES (25 atividades)
-- Todas as habilidades, em arquivo unico.
--
-- IMPORTACAO (phpMyAdmin):
--   1. Rode antes:  npm run db:migrate   (cria a tabela activity_library)
--   2. Selecione seu banco no topo do phpMyAdmin
--   3. Aba Importar > envie este arquivo > Executar
--
-- Seguro para reimportar: usa INSERT IGNORE (nao duplica).
-- Dados 100% ficticios, apenas para demonstracao.
-- A fonoaudióloga revisa e adapta antes de usar com pacientes.
-- =====================================================================

-- ============================================================
-- FalaBrincando — Biblioteca inicial de atividades (DADOS FICTÍCIOS)
-- Categorizada por habilidade, faixa etária e nível (escopo §4).
-- Conteúdo pedagógico genérico; a fonoaudióloga revisa e adapta.
-- ============================================================

INSERT IGNORE INTO activity_library
 (id, fono_id, game_key, title, habilidade, descricao, objetivo, materiais, passos,
  modelo_fala, tempo_min, idade_min, idade_max, nivel, criterios, adaptacoes, orientacoes, config, phoneme_id, tags)
VALUES
-- ===== A. ARTICULAÇÃO E PRONÚNCIA =====
(1, NULL,'caca_sons','Caça aos Sons — inicial','articulacao',
 'Caçar figuras cujo nome começa com o som-alvo.',
 'Produzir o som-alvo em posição inicial de palavra.',
 '["Figuras do fonema","Cronômetro"]',
 '["A fonoaudióloga escolhe o som-alvo","Mostre 6 figuras: 4 começam com o som e 2 não","A criança diz o nome de cada uma","Peça para a criança procurar as que começam com o som","Repita o som junto, sem corrigir"]',
 NULL, 10, 3, 8, '1',
 'Aponta 4 de 6 figuras corretas após 2 tentativas.',
 'Ofereça pranchas de imagens em vez de figuras ilustradas.',
 'Valorize a tentativa. Repita o modelo com carinho, sem pedir correção.',
 '{"fgrupo":{"alvo":["sol","sapo","asa","mesa"],"neutros":["chave","bola"]},"tentativas":3}', NULL,
 '["som-inicial","imagem","nomear"]'),

(2, NULL,'pontaria','Pontaria do som-alvo','articulacao',
 'Praticar a palavra repetidas vezes registrando tentativas.',
 'Manter o som-alvo em repetições orientadas.',
 '["Ficha de círculos","Figura da palavra"]',
 '["Mostre a figura e o nome","A criança repete a palavra 10 vezes","Marque um círculo por tentativa","Ao final, ouça a palavra mais uma vez"]',
 NULL, 10, 3, 10, '1',
 'Produz o som em 6 de 10 tentativas com apoio.',
 'Reduza para 5 tentativas em dias de dificuldade.',
 'Sente-se ao lado. Combine 10 tentativas, não exija perfeição.',
 '{"attempts":10,"cards":["sol","sapo"]}', NULL,
 '["repeticao","registro"]'),

(3, NULL,'monte_palavra','Monte a Palavra','articulacao',
 'Associar imagem, sílaba e palavra escrita.',
 'Sequenciar sílabas para formar a palavra.',
 '["Cartas de sílabas","Cartas de imagens"]',
 '["Mostre a imagem da palavra alvo","Embaralhe as sílabas","A criança monta na ordem correta","Leia a palavra montada em voz alta"]',
 NULL, 10, 4, 10, '2',
 'Monta 4 de 5 palavras com apoio.',
 'Reduza para duas sílabas.',
 'Demonstre a montagem uma vez e depois espere a criança.',
 '{"palavras":["mesa","bola","casa"]}', NULL,
 '["silabas","ordem"]'),

-- ===== B. CONSCIÊNCIA FONOLÓGICA =====
(4, NULL,'memoria','Memória das Rimas','consciencia_fonologica',
 'Jogo de pares de palavras que rimam.',
 'Reconhecer palavras que rimam entre si.',
 '["Cartas de figuras","Marcador de rima"]',
 '["Separe as cartas em dois montes","A fonoaudióloga lê um par em voz alto","A criança escolhe qual palavra rima com a primeira","Confirme com um modelo correto"]',
 NULL, 8, 4, 10, '1',
 'Identifica 4 de 6 pares que rimam.',
 'Use apenas pares muito próximos foneticamente.',
 'Rime com a crianca: «sol... voce quer dizer...?»',
 '{"pares":[["sol","bol"],["casa","masa"],["pato","gato"],["lua","rua"]]}', NULL,
 '["rima","audicao"]'),

(5, NULL,'vogais_silabas','Palmas nas Sílabas','consciencia_fonologica',
 'Separar palavras em sílabas usando palmas.',
 'Segmentação silábica com apoio motor.',
 '["Mãos","Cartas de figuras"]',
 '["Diga a palavra devagar batendo uma palma por sílaba","Repita sem as palmas","A criança tenta sozinha"]',
 NULL, 8, 4, 10, '1',
 'Segmenta 4 de 5 palavras com apoio.',
 'Use a palma apenas se a criança quiser.',
 'A palma é um apoio opcional, não uma exigência.',
 '{"palavras":["casa","bola","sapato","elefante"]}', NULL,
 '["silabas","motor"]'),

(6, NULL,'caca_sons','Som no meio e no fim','consciencia_fonologica',
 'Identificar onde o som aparece na palavra.',
 'Discriminar a posição do som-alvo.',
 '["Cartas de palavras"]',
 '["A fonoaudióloga lê a palavra","A criança indica com o dedo: começo, meio ou fim","Repita junto"]',
 NULL, 8, 5, 12, '2',
 'Indica corretamente 5 de 6 palavras.',
 'Use setas coloridas em vez de apontar com o dedo.',
 'Elogie o esforço, não a resposta.',
 '{"palavras":[{"p":"mesa","pos":"meio"},{"p":"sol","pos":"comeco"}]}', NULL,
 '["posicao","fonologia"]'),

-- ===== C. DESENVOLVIMENTO DA LINGUAGEM =====
(7, NULL,'o_que_e','Nomeando figuras','linguagem',
 'Nomear objetos, animais, alimentos e ações.',
 'Ampliar vocabulário por categorias.',
 '["Figuras variadas","Álbum"]',
 '["Aponte a figura","A criança nomeia ou aponta entre duas opções","Registre as palavras novas no álbum"]',
 NULL, 10, 3, 10, '1',
 'Nomeia 6 de 8 figuras da categoria.',
 'Ofereça duas opções: «é banana ou maçã?»',
 'Nomeie junto nas primeiras vezes. Depois espere.',
 '{"categorias":["animais","comida","roupas","acoes"]}', NULL,
 '["vocabulario","categorias"]'),

(8, NULL,'o_que_e','Completando frases','linguagem',
 'Completar frases curtas com a palavra certa.',
 'Construir frases simples e completas.',
 '["Figuras","Cartas de palavras"]',
 '["Mostre uma cena","Leia a frase com um espaço: «O gato está no ___»","A criança completa com a palavra"]',
 NULL, 10, 4, 10, '2',
 'Completa 4 de 5 frases.',
 'Aceite a frase mesmo que simples.',
 'Modele a frase completa uma vez.',
 '{"frases":[{"cena":"gato no tapete","a":"no","b":"debaixo"}]}', NULL,
 '["frases","gramatica"]'),

(9, NULL,'historias','Descrevendo a cena','linguagem',
 'Descrever uma imagem com detalhes.',
 'Expandir a linguagem expressiva.',
 '["Cena ilustrada"]',
 '["Mostre a cena","Faça perguntas: «quem? onde? o que faz?»","A criança conta a cena"]',
 NULL, 10, 4, 12, '2',
 'Descreve a cena com 3 informações.',
 'Aceite 2 informações como um bom começo.',
 'Pergunte em vez de corrigir.',
 '{"cenas":[{"t":"Uma menina regando plantas","q":"O que a menina está fazendo?"}]}', NULL,
 '["descricao","narrativa"]'),

(10, NULL,'historias','Responde sobre histórias','linguagem',
 'Responder perguntas sobre uma história ilustrada.',
 'Compreender texto oral e responder perguntas.',
 '["História ilustrada"]',
 '["Leia a história em voz alta","Mostre a página ilustrada","Faça uma pergunta simples sobre o que aconteceu"]',
 NULL, 10, 5, 12, '2',
 'Responde 3 de 4 perguntas.',
 'Ofereça duas opções de resposta.',
 'Pergunte «o que aconteceu antes?»',
 '{"historia":{"titulo":"A semente que virou árvore","perguntas":["O que foi plantado?","Quem cuidou da semente?"]}}', NULL,
 '["compreensao","historia"]'),

-- ===== D. COMUNICAÇÃO FUNCIONAL =====
(11, NULL,'missoes','Missão do Pedido','comunicacao_funcional',
 'Cenário de loja: pedir um objeto com frase completa.',
 'Usar linguagem para pedir de forma funcional.',
 '["Figuras de loja","Cartas de frases"]',
 '["Apresente o cenário: «Você está na loja e quer algo»","A criança formula o pedido","A fonoaudióloga faz o papel de atendente"]',
 NULL, 10, 4, 12, '3',
 'Formula um pedido com substantivo em 4 de 5 situacoes.',
 'Ofereça o modelo «Eu quero...»',
 'Não cobre a resposta correta; celebre a tentativa de comunicar.',
 '{"situacoes":[{"c":"loja","pedido":"uma bola"},{"c":"casa","pedido":"a mamãe"}]}', NULL,
 '["funcional","pedido"]'),

(12, NULL,'missoes','Missão do Sentimento','comunicacao_funcional',
 'Cenas para nomear sentimentos e necessidades.',
 'Expressar necessidades e sentimentos.',
 '["Cartas de expressoes","Figuras de situacoes"]',
 '["Mostre a situacao","Pergunte: «como a pessoa está se sentindo?»","A criança escolhe entre duas palavras"]',
 NULL, 10, 4, 12, '3',
 'Nomeia corretamente o sentimento em 4 de 5 situacoes.',
 'Use pranchas de comunicação se a criança usa AAC.',
 'Valide o sentimento: «e sim mesmo».',
 '{"sentimentos":["feliz","triste","bravo","cansado","medo"]}', NULL,
 '["emocoes","AAC"]'),

(13, NULL,'roleta','Conversa em dois turnos','comunicacao_funcional',
 'Praticar iniciar e manter uma conversa.',
 'Sustentar turnos de fala com apoio.',
 '["Cartas de conversa"]',
 '["A fonoaudióloga inicia: «Oi, como foi seu dia?»","A criança responde","A fonoaudióloga responde e pergunta de volta"]',
 NULL, 10, 5, 12, '3',
 'Mantém 3 turnos com apoio.',
 'Modele a resposta se a criança não iniciar.',
 'Não force respostas. Pausas são normais.',
 '{"turnos":3,"temas":["brincadeira","comida","amigos"]}', NULL,
 '["dialogo","turnos"]'),

-- ===== E. FLUÊNCIA DA FALA =====
(14, NULL,'roleta','Rodinha de conversa calma','fluencia',
 'Conversa livre em roda, sem pressão de desempenho.',
 'Reduzir a pressão comunicativa e organizar turnos.',
 '["Cartas de temas suaves"]',
 '["Escolha um tema tranquilo","Fale devagar, com pausas","Cada pessoa fala um pouco, sem cronômetro"]',
 NULL, 10, 4, 12, '2',
 'Participa de pelo menos 3 falas com seu turno.',
 'Respeite pausas longas. Não peça para repetir.',
 'Nada de pedir «fale sem travar». Errar faz parte.',
 '{"temas":["animais de estimação","meu dia","comida favorita"]}', NULL,
 '["fluencia","sem-pressao"]'),

(15, NULL,'historias','Contar sem pressa','fluencia',
 'A criança conta uma história no próprio tempo.',
 'Permitir disfluências sem correção.',
 '["Figuras soltas"]',
 '["Coloque 3 figuras de uma história","A criança conta no ritmo dela","Ouve sem corrigir"]',
 NULL, 10, 5, 12, '3',
 'Conta uma história com 4 elementos.',
 'Aceite versões diferentes da mesma história.',
 'Não repita a palavra da criança nem complete por ela.',
 '{"figuras":["castelo","chave","amigo"]}', NULL,
 '["fluencia","narrativa"]'),

-- ===== F. MOTRICIDADE OROFACIAL (só por indicação) =====
(16, NULL,'instalacao','Sequência orofacial — indicação clínica','motricidade_orofacial',
 'Sequência definida individualmente pelo fonoaudiólogo após avaliação.',
 'Exercícios orofaciais indicados após avaliação específica.',
 '["Materiais definidos pelo profissional"]',
 '["Executar exatamente a sequência definida pelo profissional"]',
 'Modelo de fala definido pelo profissional — inserir antes de liberar.',
 12, 4, 12, '3',
 'Conforme orientação clínica individual.',
 'Ajustar tempo e apoio conforme necessidade.',
 'Somente o fonoaudiólogo define esta sequência.',
 '{"sequence":[{"step":"1","texto":"Inserir instrução clínica"}]}', NULL,
 '["orofacial","indicacao"]');

-- ============================================================
-- FalaBrincando — Atividades da biblioteca que usam os novos jogos
-- (fase 3). Dados fictícios, revisáveis pela fonoaudióloga.
-- ============================================================

INSERT IGNORE INTO activity_library
 (id, fono_id, game_key, title, habilidade, descricao, objetivo, materiais, passos,
  modelo_fala, tempo_min, idade_min, idade_max, nivel, criterios, adaptacoes, orientacoes, config, phoneme_id, tags)
VALUES
(17, NULL,'historia_interativa','História Interativa — A semente','linguagem',
 'Acompanhar uma história ilustrada e responder às perguntas.',
 'Compreender texto oral e responder perguntas sobre a narrativa.',
 '["Livro ilustrado ou figuras em sequência"]',
 '["Leia a história em voz alta","Mostre a figura de cada cena","Faça uma pergunta sobre o que aconteceu","Aceite a resposta da criança e modele a frase completa"]',
 NULL, 10, 4, 12, '2',
 'Responde corretamente 3 de 4 perguntas.',
 'Ofereça duas opções de resposta. Use pranchas se a criança usa AAC.',
 'Não corrija a resposta errada; modele a frase certa com carinho.',
 NULL, NULL, '["compreensao","narrativa"]'),

(18, NULL,'monte_palavra','Monte a Palavra — sílabas do R','articulacao',
 'Montar palavras com o som-alvo a partir das sílabas.',
 'Sequenciar sílabas separando os sons.',
 '["Cartas de sílabas","Cartas de figuras"]',
 '["Mostre a figura da palavra","Embaralhe as sílabas","A criança monta na ordem","Leia a palavra montada em voz alta"]',
 NULL, 10, 5, 12, '2',
 'Monta 4 de 5 palavras sem ajuda.',
 'Se a sílaba caída ficar difícil, use só duas sílabas.',
 'Demonstre a montagem uma única vez e depois espere a criança.',
 '{"palavras":["carro","rato","girafa"]}', NULL, '["silabas","ordenacao"]'),

(19, NULL,'qual_figura','Qual é a Figura? — pistas curtas','linguagem',
 'Identificar figuras a partir de pistas orais.',
 'Compreender pistas e selecionar a figura correspondente.',
 '["Figuras conhecidas","Fichas de pistas"]',
 '["Leia a pista em voz alta","A criança escolhe entre as figuras","Confirme dizendo o nome junto"]',
 NULL, 8, 4, 10, '1',
 'Escolhe a figura correta em 5 de 6 pistas.',
 'Use pistas mais curtas e apoio visual se necessário.',
 'Descreva em vez de dar a resposta.',
 '{"pistas":[{"palavra":"chave","pista":"Serve para abrir a porta.","resposta":"Chave"},{"palavra":"copo","pista":"Você bebe água nele.","resposta":"Copo"},{"palavra":"guarda-chuva","pista":"Você usa quando chove.","resposta":"Guarda-chuva"},{"palavra":"sapato","pista":"Você põe no pé.","resposta":"Sapato"}]}', NULL,
 '["compreensao","pistas"]'),

(20, NULL,'roleta','Roleta das Palavras — S','articulacao',
 'Sortear palavras para praticar de forma lúdica.',
 'Praticar o som-alvo em palavras sorteadas.',
 '["Roleta virtual","Imagens das palavras"]',
 '["Gire a roleta","A criança repete a palavra sorteada","Peça outra palavra quando quiser"]',
 NULL, 8, 4, 10, '1',
 'Pratica ao menos 6 palavras diferentes.',
 'Pare a roleta quando a criança cansar.',
 'Não é competição: repetir a mesma palavra também vale.',
 '{"palavras":["sol","sapo","asa","mesa","casa","zebra","gelo","cozinha"]}', NULL, '["ludico","variacao"]'),

(21, NULL,'missoes','Missões da Comunicação — pedidos','comunicacao_funcional',
 'Cenários de loja, casa e escola para pedir com frase.',
 'Usar linguagem funcional em situações cotidianas.',
 '["Figuras de cenários","Cartas de frases"]',
 '["Apresente o cenário","A criança formula o pedido","Você faz o papel de atendente"]',
 NULL, 10, 4, 12, '3',
 'Formula pedido com substantivo em 4 de 5 situações.',
 'Ofereça o modelo «Eu quero...» se a criança iniciar pouco.',
 'Qualquer tentativa de comunicar é válida; celebre.',
 '{"situações":[{"c":"loja","p":"Você está na loja e quer uma bola. O que você diz?","resposta":"Eu quero uma bola.","opcoes":["Eu quero uma bola.","A bola.","Ali."]},{"c":"casa","p":"Você está em casa e quer a mamãe. O que você diz?","resposta":"Mãe, aqui!","opcoes":["Mãe, aqui!","Mãe.","Aqui."]},{"c":"escola","p":"Você precisa de ajuda na escola. O que você diz?","resposta":"Pode me ajudar?","opcoes":["Pode me ajudar?","Socorro!","Ajuda."]}]}', NULL,
 '["funcional","pedido"]'),

(22, NULL,'trilha','Trilha da Aventura — 5 etapas','articulacao',
 'Percurso de etapas cada vez mais exigentes para o som-alvo.',
 'Avançar por degraus de dificuldade até situações reais.',
 '["Quadro da trilha","Figuras de apoio"]',
 '["Comece pela etapa ativa","Faça a tarefa do dia","Clique em «Fiz!» para avançar","Pare quando quiser"]',
 NULL, 10, 4, 12, '2',
 'Avanca uma etapa sem necessidade de refazer as anteriores.',
 'Avance apenas o que a fonoaudióloga liberar.',
 'Parar a trilha não apaga o progresso.',
 '{"etapas":["Ouvir o som-alvo","Dizer o som junto","Falar uma palavra","Falar uma frase","Falar em casa"]}', NULL,
 '["progressao","etapas"]'),

(23, NULL,'mundo_animais','Mundo dos Animais — nome e som','linguagem',
 'Explorar animais, ouvir e dizer os nomes.',
 'Ampliar vocabulário e trabalhar sons iniciais.',
 '["Álbum de animais"]',
 '["Toque no animal","A criança diz o nome","Depois ouça o nome junto"]',
 NULL, 10, 3, 8, '1',
 'Nomeia 6 dos 8 animais apresentados.',
 'Reduza o número de animais conforme a atenção da criança.',
 'Nomeie junto nas primeiras vezes. Depois espere a criança.',
 '{"animais":["gato","coelho","girafa","pinguim","raposa","elefante","sapo","tartaruga"]}', NULL,
 '["animais","vocabulario"]');

-- ============================================================
-- FalaBrincando — Entradas de biblioteca para Intruso e Álbum
-- (completam o catálogo de jogos para o indicador por habilidade).
-- ============================================================

INSERT IGNORE INTO activity_library
 (id, fono_id, game_key, title, habilidade, descricao, objetivo, materiais, passos,
  modelo_fala, tempo_min, idade_min, idade_max, nivel, criterios, adaptacoes, orientacoes, config, phoneme_id, tags)
VALUES
(24, NULL,'intruso','Encontre o Intruso — L','consciencia_fonologica',
 'Identificar o elemento que não pertence ao grupo.',
 'Discriminar elementos que não pertencem a uma categoria.',
 '["Figuras do grupo","Uma figura intrusa"]',
 '["Mostre o grupo","Pergunte o que combina","A criança aponta o intruso","Explique o porquê em voz alta"]',
 NULL, 8, 4, 10, '1',
 'Identifica o intruso em 4 de 5 rodadas.',
 'Reduza para 3 figuras se a tarefa ficar difícil.',
 'Peça o porquê. Errar o intruso faz parte do jogo.',
 '{"group":["bola","leite","elefante"],"intruso":"chave","goal":"categoria"}', NULL,
 '["categoria","discriminacao"]'),

(25, NULL,'album','Álbum de Figuras — S','articulacao',
 'Folhear o álbum, ouvir o nome e repetir.',
 'Nomear figuras do som-alvo com apoio visual.',
 '["Álbum impresso ou figuras na tela"]',
 '["Toque na figura","A criança repete a palavra","Avance para a próxima figura"]',
 NULL, 8, 3, 8, '1',
 'Nomeia 6 das figuras do álbum.',
 'Use apenas 4 figuras se a atenção for curta.',
 'Repita com tranquilidade. Não corrija.',
 '{"words":["sol","sapo","asa","mesa"]}', NULL,
 '["album","nomear"]');
