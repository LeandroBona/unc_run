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

export const fases = [
  {
    nome: "Campus UNC",
    titulo: "Corrida para a aula!",
    mensagem: "Desvie dos obstáculos do campus.",
    duracao: 45, // segundos
    cenario: {
      imagemFundo: "/scenarios/ensino-tecnico/laboratorio-eletrica.png",
      ajusteFundo: "cobrir", // preenche todo o palco sem deformar
      chao: 490, // os pés acompanham a borda superior do piso
      camadasSobreFundo: [
        {
          imagem: "/scenarios/ensino-tecnico/piso-senai.png",
          // Este PNG é transparente na parte de cima; mantenha a altura proporcional.
          x: 0, y: 249,
          largura: 1100, altura: 367,
          velocidade: 1, repetir: 1100,
        },
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
    nome: "Laboratório de Elétrica",
    titulo: "Corrida pelo laboratório!",
    mensagem: "Desvie dos equipamentos.",
    duracao: 30,
    cenario: {
      imagemFundo: "/scenarios/ensino-tecnico/laboratorio-eletrica.png",
      ajusteFundo: "cobrir", // ou "esticar", se quiser mostrar a imagem inteira
      chao: 490,
      camadasSobreFundo: [
        // Adicione aqui outros objetos ou camadas que devem aparecer na frente do fundo.
      ],
    },
    obstaculos: [
      { imagem: "/obstaculos/ensino-tecnico/engrenagem.png", acao: "pular", largura: 50, altura: 50 },
      { imagem: "/obstaculos/ensino-tecnico/raio-eletrico.png", acao: "agachar",
        largura: 52, altura: 34, alturaDoChao: 57 },
    ],
  },
  */
];
