// EDITE ESTE ARQUIVO para mudar cenários, obstáculos ou criar fases.
// Copie um bloco { ... } de fase, cole antes do ]; e troque os valores.
// O palco mede 1100 × 560 pixels. O personagem pisa na altura y = 446.
// Imagens do cenário: public/scenarios/  ->  caminho "/scenarios/nome.png"
// Obstáculos PNG: public/obstaculos/ -> caminho "/obstaculos/nome.png"
// As camadas são desenhadas na ordem da lista: as primeiras ficam atrás das seguintes.
// Para adicionar uma camada, copie uma linha { imagem: ... } dentro de "camadas".
// Em cada camada: x/y = posição; largura/altura = tamanho; velocidade = movimento.
// "repetir" repete a imagem de lado a lado. "recorte" usa uma parte da imagem.
// Para uma imagem comum, basta informar imagem, x, y, largura e altura.
// Se existir "ceu", ele pinta o céu; "corFundo" fica como reserva. Mude as cores de "ceu".
// Um PNG pode cobrir a cor da camada de baixo. Para colorir o próprio PNG, use
// filtro: "hue-rotate(120deg)" na camada da imagem (troque 120 pelo ângulo desejado).

export const fases = [
  {
    nome: "Campus UNC",
    titulo: "Corrida para a aula!",
    mensagem: "Desvie dos obstáculos do campus.",
    duracao: 45, // segundos
    cenario: {
      corFundo: "#ae1212", // aparece se a linha "ceu" abaixo for removida
      ceu: ["#aec30c", "#0efd86", "#b017e3"], // estas três cores pintam o céu
      nuvens: true, // opcional
      camadas: [
        // Prédio ao fundo: move devagar. O recorte seleciona a parte útil do PNG original.
        { imagem: "/scenarios/predio-unc.png", x: -400, y: 112, largura: 800, altura: 401,
          velocidade: 0.055, repetir: 1720,
          recorte: { x: 55, y: 175, largura: 1405, altura: 705 } },
        { cor: "#78b968", x: 0, y: 366, largura: 1100, altura: 82 },
        { imagem: "/scenarios/grama.png", x: 0, y: 332, largura: 760, altura: 158,
          velocidade: 0.25, repetir: 760,
          recorte: { x: 55, y: 395, largura: 1420, altura: 295 } },
        { cor: "#645b63", x: 0, y: 440, largura: 1100, altura: 120 },
        { imagem: "/scenarios/estrada.png", x: 0, y: 428, largura: 1100, altura: 206,
          velocidade: 1, repetir: 1100,
          recorte: { x: 14, y: 404, largura: 1508, altura: 282 } },
      ],
    },
    obstaculos: [
      { imagem: "/obstaculos/cone.png", acao: "pular", largura: 50, altura: 58 },
      { imagem: "/obstaculos/livros.png", acao: "pular", largura: 50, altura: 48 },
      { imagem: "/obstaculos/passaro.png", acao: "agachar", largura: 52, altura: 34, alturaDoChao: 57 },
    ],
  },
  {
    nome: "Museu Paleontológico",
    titulo: "Aventura entre fósseis!",
    mensagem: "Cuidado com os fósseis!",
    duracao: 45,
    cenario: {
      corFundo: "#1b1817",
      vinheta: true, // escurece de leve as bordas
      camadas: [
        { imagem: "/scenarios/museu/museu-paleontologia.png",
          x: 0, y: 0, largura: 1100, altura: 560,
          recorte: { x: 0, y: 0, largura: 1370, altura: 700 },
          panorama: 0.0009 }, // move lentamente o recorte pela imagem
      ],
    },
    obstaculos: [
      { imagem: "/obstaculos/fossil.png", acao: "pular", largura: 60, altura: 44 },
      { imagem: "/obstaculos/pedestal.png", acao: "pular", largura: 46, altura: 50 },
      { imagem: "/obstaculos/luminaria.png", acao: "agachar", largura: 56, altura: 39,
        alturaDoChao: 57, imagemY: -28, imagemAltura: 67 },
    ],
  },

  // MODELO DE FASE NOVA: tire os sinais /* e */ para ativar; troque as imagens.
  /*
  {
    nome: "Minha fase",
    titulo: "Novo desafio!",
    mensagem: "Desvie dos obstáculos.",
    duracao: 30,
    cenario: {
      corFundo: "#b8e9ee",
      camadas: [
        { imagem: "/scenarios/meu-fundo.png", x: 0, y: 0, largura: 1100, altura: 446 },
        { cor: "#795641", x: 0, y: 446, largura: 1100, altura: 114 },
        { imagem: "/scenarios/minhas-arvores.png", x: 0, y: 250, largura: 550, altura: 196,
          velocidade: 0.2, repetir: 550 },
      ],
    },
    obstaculos: [
      { imagem: "/obstaculos/cone.png", acao: "pular", largura: 50, altura: 58 },
      { imagem: "/obstaculos/passaro.png", acao: "agachar", largura: 52, altura: 34, alturaDoChao: 57 },
    ],
  },
  */
];
