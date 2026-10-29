// EDITE ESTE ARQUIVO para mudar cenários, obstáculos ou criar fases.
// Copie um bloco { ... } de fase, cole antes do ]; e troque os valores.
// O palco mede 1100 × 560 pixels. O personagem pisa em y = 446 por padrão.
// Para alinhar com o chão de outra imagem, use chao: 490 dentro de cenario.
// Imagens do cenário: public/scenarios/  ->  caminho "/scenarios/nome.png"
// Obstáculos PNG: public/obstaculos/ -> caminho "/obstaculos/nome.png"
// As camadas são desenhadas na ordem da lista: as primeiras ficam atrás das seguintes.
// Para adicionar uma camada, copie uma linha { imagem: ... } dentro de "camadas".
// Em cada camada: x/y = posição; largura/altura = tamanho; velocidade = movimento.
// "repetir" repete a imagem de lado a lado. "recorte" usa uma parte da imagem.
// Para uma imagem comum, basta informar imagem, x, y, largura e altura.
// Se existir "ceu", ele pinta o céu; "corFundo" fica como reserva. Mude as cores de "ceu".
// Para usar UMA IMAGEM no fundo inteiro, escreva imagemFundo: "/scenarios/nome.png"
// dentro de cenario. Isso substitui o céu e as nuvens da fase automaticamente.
// ajusteFundo: "cobrir" preenche sem deformar e pode cortar as laterais (padrão).
// ajusteFundo: "esticar" mostra a imagem inteira, mas pode deformá-la.
// Com imagemFundo, as camadas antigas são ignoradas. Para pôr algo na frente,
// use camadasSobreFundo: [{ imagem: "/scenarios/objeto.png", x: 0, y: 0, largura: 100, altura: 100 }].
// imagemFundo e ajusteFundo ficam DIRETO em cenario, fora da lista camadas.
// Um PNG pode cobrir a cor da camada de baixo. Para colorir o próprio PNG, use
// filtro: "hue-rotate(120deg)" na camada da imagem (troque 120 pelo ângulo desejado).
// A hitbox é medida dentro do tamanho exibido (largura × altura) do obstáculo.
// Exemplo: hitbox: { x: 10, y: 5, largura: 40, altura: 45 }.
// Para objetos com partes separadas, use hitboxes: [{...}, {...}]. A imagem não muda.
// TEMPO TOTAL: o jogo soma automaticamente as duracoes das fases.
// Exemplo: tres fases com duracao: 25 mostram 75 segundos no placar.

export const fases = [
  
  {

    nome: "Laboratório de elétrica",
    titulo: "Corrida na elétrica!",
    mensagem: "Desvie dos obstáculos do SENAI.",
    duracao: 20, // segundos
    cenario: {
      imagemFundo: "/scenarios/ensino-tecnico/laboratorio-eletrica.png",
      ajusteFundo: "cobrir", // preenche todo o palco sem deformar
      chao: 490, // os pés acompanham a borda superior do piso
      camadasSobreFundo: [
        {
          imagem: "/scenarios/ensino-tecnico/chao-uma-listra.png",
          // Este PNG é transparente na parte de cima; mantenha a altura proporcional.
          x: 0, y: 249,
          largura: 1100, altura: 367,
          velocidade: 1, repetir: 1100,
        },
      ],
    },
    obstaculos: [
      { imagem: "/obstaculos/ensino-tecnico/braco-robotico.png", acao: "pular", largura: 100, altura: 90,
        // Retângulo da colisão dentro dos 100 × 90 pixels exibidos; não aumenta a imagem.
        hitbox: { x: 32, y: 18, largura: 52, altura: 60 } },
      { imagem: "/obstaculos/ensino-tecnico/painel-eletrico.png", acao: "pular", largura: 80, altura: 70,
        hitbox: { x: 13, y: 15, largura: 54, altura: 44 } },
      { imagem: "/obstaculos/ensino-tecnico/raio-eletrico.png", acao: "agachar", largura: 120, altura: 90,
        alturaDoChao: 57,
        hitboxes: [
          { x: 66, y: 5, largura: 18, altura: 28 },
          { x: 46, y: 28, largura: 26, altura: 29 },
          { x: 34, y: 54, largura: 28, altura: 32 },
        ] },
    ],
  },
  {
    nome: "Oficina de mecânica",
    titulo: "Aventura na oficina!",
    mensagem: "desvie dos equipamentos!",
    duracao: 20,
    cenario: {
      imagemFundo: "/scenarios/ensino-tecnico/oficina-mecanica.png",
      ajusteFundo: "cobrir",
      chao: 490,
      vinheta: true, // escurece de leve as bordas
      camadasSobreFundo: [
        { imagem: "/scenarios/ensino-tecnico/chao-listra.png",
          x: 0, y: 265, largura: 1100, altura: 367, velocidade: 1, repetir: 1100 },
      ],
    },
    obstaculos: [
      { imagem: "/obstaculos/ensino-tecnico/engrenagem.png", acao: "pular", largura: 60, altura: 60,
        hitbox: { x: 3, y: 3, largura: 54, altura: 54 } },
      { imagem: "/obstaculos/ensino-tecnico/chave-de-fenda.png", acao: "pular", largura: 95, altura: 70,
        hitbox: { x: 41, y: 2, largura: 14, altura: 66 } },
        {imagem: "/obstaculos/ensino-tecnico/morsa.png", acao: "agachar", largura: 90, altura: 90,
          alturaDoChao: 57,
        hitboxes: [
          { x: 66, y: 5, largura: 18, altura: 28 },
          { x: 46, y: 28, largura: 26, altura: 29 },
          { x: 34, y: 54, largura: 28, altura: 32 },
        ] },
    ],
  },
 
  // Terceira fase pronta. Copie o bloco inteiro para criar outra fase.
  
  {
    nome: "Sala de costura",
    titulo: "Corrida na sala de costura!",
    mensagem: "Corra!",
    duracao: 25,
    cenario: {
      imagemFundo: "/scenarios/ensino-tecnico/sala-costura.png",
      ajusteFundo: "cobrir", // ou "esticar", se quiser mostrar a imagem inteira
      chao: 490,
      camadasSobreFundo: [
        { imagem: "/scenarios/ensino-tecnico/chao-liso-listra.png",
          x: 0, y: 270, largura: 1100, altura: 367, velocidade: 1, repetir: 1100 },
        // Adicione aqui outros objetos ou camadas que devem aparecer na frente do fundo.
      ],
    },
    obstaculos: [
      { imagem: "/obstaculos/ensino-tecnico/maquina_costura_industrial.png", acao: "pular", largura: 60, altura: 60,
        hitbox: { x: 2, y: 2, largura: 46, altura: 46 } },
      { imagem: "/obstaculos/ensino-tecnico/painel_ferramentas.png", acao: "agachar",
        largura: 100, altura: 100, alturaDoChao: 57,
        hitboxes: [
          { x: 39, y: 4, largura: 11, altura: 23 },
          { x: 27, y: 22, largura: 16, altura: 24 },
          { x: 20, y: 42, largura: 17, altura: 25 },
        ] },
    ],
  },
  


{
    nome: "Sala de aula",
    titulo: "Corrida na sala!",
    mensagem: "Chegando á tempo!",
    duracao: 30,
    cenario: {
      imagemFundo: "/scenarios/ensino-tecnico/sala-de-aula.png",
      ajusteFundo: "cobrir", // ou "esticar", se quiser mostrar a imagem inteira
      chao: 490,
      camadasSobreFundo: [
        { imagem: "/scenarios/ensino-tecnico/chao-liso-listra.png",
          x: 0, y: 270, largura: 1100, altura: 367, velocidade: 1, repetir: 1100 },
        // Adicione aqui outros objetos ou camadas que devem aparecer na frente do fundo.
      ],
    },
    obstaculos: [
      { imagem: "/obstaculos/ensino-tecnico/carteira-escolar.png", acao: "pular", largura: 90, altura: 80,
        hitbox: { x: 2, y: 2, largura: 46, altura: 46 } },
      { imagem: "/obstaculos/ensino-tecnico/raio-eletrico.png", acao: "agachar",
        largura: 120, altura: 90, alturaDoChao: 57,
        hitboxes: [
          { x: 39, y: 4, largura: 11, altura: 23 },
          { x: 27, y: 22, largura: 16, altura: 24 },
          { x: 20, y: 42, largura: 17, altura: 25 },
        ] },
    ],
  },
  



{
    nome: "Sala de costura",
    titulo: "Corrida na sala de costura!",
    mensagem: "Corra!",
    duracao: 70,
    cenario: {
      imagemFundo: "/scenarios/ensino-tecnico/sala-costura.png",
      ajusteFundo: "cobrir", // ou "esticar", se quiser mostrar a imagem inteira
      chao: 490,
      camadasSobreFundo: [
        { imagem: "/scenarios/ensino-tecnico/chao-liso-listra.png",
          x: 0, y: 270, largura: 1100, altura: 367, velocidade: 1, repetir: 1100 },
        // Adicione aqui outros objetos ou camadas que devem aparecer na frente do fundo.
      ],
    },
    obstaculos: [
      { imagem: "/obstaculos/ensino-tecnico/suporte_rolos_tecido.png", acao: "pular", largura: 70, altura: 70,
        hitbox: { x: 2, y: 2, largura: 46, altura: 46 } },
      { imagem: "/obstaculos/ensino-tecnico/tecidos_dobrados.png", acao: "agachar",
        largura: 100, altura: 90, alturaDoChao: 57,
        hitboxes: [
          { x: 39, y: 4, largura: 11, altura: 23 },
          { x: 27, y: 22, largura: 16, altura: 24 },
          { x: 20, y: 42, largura: 17, altura: 25 },
        ] },
    ],
  },
  
]
