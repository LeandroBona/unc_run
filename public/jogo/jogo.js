import { fases } from "./fases.js?v=alunos-1";
import { iniciarCamera } from "./camera.js";
import { colideComObstaculo } from "./colisao.js";
import { calcularTempoTotal, calcularTempoRestante } from "./tempo.js";

// Mecânica do jogo. Para trocar cenários ou criar fases, edite apenas fases.js.
const canvas = document.querySelector("#jogo");
const ctx = canvas.getContext("2d");
const LARGURA = canvas.width;
const ALTURA = canvas.height;
const CHAO_PADRAO = 446;
const VELOCIDADE = 7.2;
const GRAVIDADE = 0.9;
const DURACAO_TOTAL = calcularTempoTotal(fases);
const $ = (seletor) => document.querySelector(seletor);
const elementos = {
  nome: $("#nome-fase"), titulo: $("#titulo-fase"), tempo: $("#tempo"),
  pontos: $("#pontos"), recorde: $("#recorde"),
  inicial: $("#tela-inicial"), contagem: $("#tela-contagem"), numero: $("#numero-contagem"),
  fase: $("#tela-fase"), anuncio: $("#fase-anuncio"), mensagem: $("#fase-mensagem"),
  final: $("#tela-final"), resultadoEtiqueta: $("#resultado-etiqueta"),
  resultadoTitulo: $("#resultado-titulo"), resultadoTexto: $("#resultado-texto"),
  avisoCamera: $("#aviso-camera"), estadoCamera: $("#estado-camera"),
  foto: $("#foto-preview"), fotoVazia: $("#foto-vazia"), estadoRanking: $("#estado-ranking"),
  ranking: $("#ranking-lista"),
};

const imagens = new Map();
const mascaras = new Map();
for (const fase of fases) {
  const caminhos = [
    fase.cenario?.imagemFundo,
    ...(fase.cenario?.camadas || []).map((camada) => camada.imagem),
    ...(fase.cenario?.camadasSobreFundo || []).map((camada) => camada.imagem),
    ...fase.obstaculos.map((obstaculo) => obstaculo.imagem),
  ];
  for (const caminho of caminhos) {
    if (!caminho || imagens.has(caminho)) continue;
    const imagem = new Image();
    imagem.src = caminho;
    imagens.set(caminho, imagem);
  }
}

function lerNumero(chave) {
  try { return Number(localStorage.getItem(chave)) || 0; } catch { return 0; }
}
function salvarNumero(chave, valor) {
  try { localStorage.setItem(chave, String(valor)); } catch { /* armazenamento bloqueado */ }
}
const chaveRecorde = "corrida-campus-recorde";
let recorde = lerNumero(chaveRecorde);
let modo = "inicio";
let faseAtual = 0;
function chaoDaFase() {
  const chao = fases[faseAtual]?.cenario?.chao;
  return Number.isFinite(chao) ? chao : CHAO_PADRAO;
}
let tempoDaFase = 0;
let tempoDaPartida = 0;
let distancia = 0;
let bonus = 0;
let pontos = 0;
let proximoObstaculo = 760;
let obstaculos = [];
let ultimoQuadro = performance.now();
let transicaoAte = 0;
let contagemId = 0;
let comandoPulo = false;
let teclaAgachar = false;
let cameraAgachar = false;
let cameraAtiva = null;
let fotoPendente = "";
let resultadoAtual = null;
let jogador = { y: chaoDaFase() - 66, velocidadeY: 0, agachado: false };

function mostrar(elemento, sim) { elemento.classList.toggle("escondido", !sim); }
function textoPlacar() {
  elementos.tempo.textContent = calcularTempoRestante(DURACAO_TOTAL, tempoDaPartida);
  elementos.pontos.textContent = String(pontos).padStart(4, "0");
  elementos.recorde.textContent = String(recorde).padStart(4, "0");
}
function atualizarCabecalho() {
  const fase = fases[faseAtual];
  elementos.nome.textContent = `FASE ${faseAtual + 1} · ${fase.nome.toUpperCase()}`;
  elementos.titulo.textContent = fase.titulo;
}
function novoJogo() {
  clearInterval(contagemId);
  faseAtual = 0;
  tempoDaFase = 0;
  tempoDaPartida = 0;
  distancia = 0;
  bonus = 0;
  pontos = 0;
  proximoObstaculo = 760;
  obstaculos = [];
  jogador = { y: chaoDaFase() - 66, velocidadeY: 0, agachado: false };
  comandoPulo = false;
  teclaAgachar = false;
  cameraAgachar = false;
  fotoPendente = "";
  resultadoAtual = null;
  elementos.foto.hidden = true;
  elementos.fotoVazia.hidden = false;
  elementos.estadoRanking.textContent = "";
  $("#salvar-ranking").disabled = false;
  atualizarCabecalho();
  textoPlacar();
  mostrar(elementos.inicial, false);
  mostrar(elementos.final, false);
  mostrar(elementos.fase, false);
  mostrar(elementos.contagem, true);
  modo = "contagem";
  let numero = 3;
  elementos.numero.textContent = numero;
  contagemId = setInterval(() => {
    numero -= 1;
    if (numero === 0) {
      clearInterval(contagemId);
      mostrar(elementos.contagem, false);
      modo = "jogando";
    } else elementos.numero.textContent = numero;
  }, 720);
}
function terminar(venceu) {
  if (modo === "fim") return;
  modo = "fim";
  mostrar(elementos.fase, false);
  mostrar(elementos.final, true);
  elementos.final.classList.toggle("vitoria", venceu);
  elementos.resultadoEtiqueta.textContent = venceu ? "TODAS AS FASES CONCLUÍDAS" : "FIM DA CORRIDA";
  elementos.resultadoTitulo.textContent = venceu ? "🏆 Jogo concluído!" : "Tente mais uma vez!";
  elementos.resultadoTexto.textContent = venceu
    ? `Você completou as ${fases.length} fases e fez ${pontos} pontos. Registre sua conquista abaixo.`
    : `Você fez ${pontos} pontos e chegou à fase ${faseAtual + 1} de ${fases.length}.`;
  resultadoAtual = { pontos, venceu, fasesConcluidas: venceu ? fases.length : faseAtual };
  if (cameraAtiva) {
    try { definirFoto(capturarQuadro($("#video-camera"))); }
    catch { elementos.estadoRanking.textContent = "Não foi possível capturar a foto. Use o botão abaixo."; }
  }
  recorde = Math.max(recorde, pontos);
  salvarNumero(chaveRecorde, recorde);
  textoPlacar();
  if (!venceu && navigator.vibrate) navigator.vibrate(120);
}
function mudarFase(agora) {
  faseAtual += 1;
  if (faseAtual >= fases.length) { faseAtual = fases.length - 1; terminar(true); return; }
  tempoDaFase = 0;
  obstaculos = [];
  proximoObstaculo = 820;
  jogador.y = chaoDaFase() - 66;
  jogador.velocidadeY = 0;
  jogador.agachado = false;
  comandoPulo = false;
  atualizarCabecalho();
  elementos.anuncio.textContent = fases[faseAtual].nome;
  elementos.mensagem.textContent = fases[faseAtual].mensagem;
  mostrar(elementos.fase, true);
  transicaoAte = agora + 1800;
  modo = "transicao";
}

function mascaraDaImagem(caminho, largura, altura) {
  const chave = `${caminho}:${largura}x${altura}`;
  if (mascaras.has(chave)) return mascaras.get(chave);
  const imagem = imagens.get(caminho);
  if (!imagem?.complete || !imagem.naturalWidth) return null;
  try {
    const copia = document.createElement("canvas");
    copia.width = largura;
    copia.height = altura;
    const contexto = copia.getContext("2d", { willReadFrequently: true });
    contexto.drawImage(imagem, 0, 0, largura, altura);
    const rgba = contexto.getImageData(0, 0, largura, altura).data;
    const pixels = new Uint8Array(largura * altura);
    for (let i = 0; i < pixels.length; i++) pixels[i] = rgba[i * 4 + 3] >= 96 ? 1 : 0;
    const mascara = { largura, altura, pixels };
    mascaras.set(chave, mascara);
    return mascara;
  } catch {
    // Se a imagem não permitir leitura, as hitboxes continuam funcionando.
    return null;
  }
}

function criarObstaculo() {
  const modelos = fases[faseAtual].obstaculos;
  if (!modelos.length) return;
  const modelo = modelos[Math.floor(Math.random() * modelos.length)];
  const altura = modelo.altura || 50;
  const largura = modelo.largura || 52;
  obstaculos.push({
    x: LARGURA + 20,
    y: chaoDaFase() - altura - (modelo.alturaDoChao || 0),
    largura, altura,
    imagem: modelo.imagem,
    imagemY: modelo.imagemY || 0,
    imagemAltura: modelo.imagemAltura || altura,
    acao: modelo.acao,
    hitbox: modelo.hitbox,
    hitboxes: modelo.hitboxes,
    mascara: mascaraDaImagem(modelo.imagem, largura, modelo.imagemAltura || altura),
  });
}
function atualizar(delta, agora) {
  if (modo === "transicao") {
    if (agora >= transicaoAte) { mostrar(elementos.fase, false); modo = "jogando"; }
    return;
  }
  if (modo !== "jogando") return;
  const passo = delta / 16.67;
  const movimento = VELOCIDADE * passo;
  tempoDaFase += delta;
  tempoDaPartida += delta;
  distancia += movimento;
  pontos = Math.floor(distancia / 8) + bonus;
  textoPlacar();
  if (tempoDaFase >= fases[faseAtual].duracao * 1000) { mudarFase(agora); return; }

  const chao = chaoDaFase();
  const noChao = jogador.y >= chao - (jogador.agachado ? 42 : 66) - 1;
  jogador.agachado = (teclaAgachar || cameraAgachar) && noChao;
  if (jogador.agachado && jogador.velocidadeY === 0) jogador.y = chao - 42;
  if (comandoPulo && noChao) {
    jogador.velocidadeY = -15.8;
    jogador.agachado = false;
  }
  comandoPulo = false;
  jogador.velocidadeY += GRAVIDADE * passo;
  jogador.y += jogador.velocidadeY * passo;
  const piso = chao - (jogador.agachado ? 42 : 66);
  if (jogador.y > piso) { jogador.y = piso; jogador.velocidadeY = 0; }

  proximoObstaculo -= movimento;
  if (proximoObstaculo <= 0) {
    criarObstaculo();
    proximoObstaculo = 580 + Math.random() * 320;
  }
  for (const obstaculo of obstaculos) {
    obstaculo.x -= movimento;
    if (!obstaculo.ultrapassado && obstaculo.x + obstaculo.largura < 149) {
      obstaculo.ultrapassado = true;
      bonus += 25;
    }
  }
  pontos = Math.floor(distancia / 8) + bonus;
  textoPlacar();
  obstaculos = obstaculos.filter((obstaculo) => obstaculo.x > -100);
  const areaJogador = { x: 149, y: jogador.y + 4, largura: jogador.agachado ? 52 : 34, altura: jogador.agachado ? 38 : 60 };
  if (obstaculos.some((obstaculo) => colideComObstaculo(areaJogador, obstaculo))) terminar(false);
}

function desenharCamada(camada) {
  const x = camada.x ?? 0;
  const y = camada.y ?? 0;
  const largura = camada.largura ?? LARGURA;
  const altura = camada.altura ?? ALTURA;
  if (camada.cor) {
    ctx.fillStyle = camada.cor;
    ctx.fillRect(x, y, largura, altura);
    return;
  }
  const imagem = imagens.get(camada.imagem);
  if (!imagem?.complete || !imagem.naturalWidth) return;
  const recorte = camada.recorte;
  function pintar(posicaoX) {
    ctx.save();
    if (camada.filtro) ctx.filter = camada.filtro;
    if (camada.opacidade !== undefined) ctx.globalAlpha = Math.max(0, Math.min(1, camada.opacidade));
    if (recorte) {
      const pan = camada.panorama
        ? (Math.sin(distancia * camada.panorama) + 1) / 2
          * Math.max(0, imagem.naturalWidth - recorte.x - recorte.largura)
        : 0;
      ctx.drawImage(imagem, recorte.x + pan, recorte.y, recorte.largura, recorte.altura,
        posicaoX, y, largura, altura);
    } else {
      ctx.drawImage(imagem, posicaoX, y, largura, altura);
    }
    ctx.restore();
  }
  const velocidade = camada.velocidade ?? 0;
  const repeticao = camada.repetir ?? 0;
  if (repeticao > 0) {
    const deslocamento = ((distancia * velocidade) % repeticao + repeticao) % repeticao;
    const inicio = x - deslocamento;
    let posicaoX = inicio + Math.ceil((-largura - inicio) / repeticao) * repeticao;
    for (; posicaoX < LARGURA; posicaoX += repeticao) pintar(posicaoX);
  } else {
    pintar(x - distancia * velocidade);
  }
}

function desenharFundo(fase) {
  const cenario = fase.cenario || {};
  if (cenario.imagemFundo) {
    // A imagem principal ocupa o palco todo e substitui céu e nuvens.
    ctx.fillStyle = cenario.corFundo || "#dff5ef";
    ctx.fillRect(0, 0, LARGURA, ALTURA);
    const imagem = imagens.get(cenario.imagemFundo);
    if (imagem?.complete && imagem.naturalWidth) {
      if (cenario.ajusteFundo === "esticar") {
        ctx.drawImage(imagem, 0, 0, LARGURA, ALTURA);
      } else {
        // "cobrir": mantém a proporção e recorta o excesso pelas bordas.
        const escala = Math.max(LARGURA / imagem.naturalWidth, ALTURA / imagem.naturalHeight);
        const larguraRecorte = LARGURA / escala;
        const alturaRecorte = ALTURA / escala;
        ctx.drawImage(imagem,
          (imagem.naturalWidth - larguraRecorte) / 2,
          (imagem.naturalHeight - alturaRecorte) / 2,
          larguraRecorte, alturaRecorte,
          0, 0, LARGURA, ALTURA);
      }
    }
  } else if (cenario.ceu?.length >= 2) {
    const ceu = ctx.createLinearGradient(0, 0, 0, ALTURA);
    for (let i = 0; i < cenario.ceu.length; i++) {
      const posicao = cenario.ceu.length === 3 && i === 1 ? .65 : i / (cenario.ceu.length - 1);
      ceu.addColorStop(posicao, cenario.ceu[i]);
    }
    ctx.fillStyle = ceu;
  } else {
    ctx.fillStyle = cenario.corFundo || "#dff5ef";
  }
  if (!cenario.imagemFundo) ctx.fillRect(0, 0, LARGURA, ALTURA);
  if (!cenario.imagemFundo && cenario.nuvens) {
    ctx.fillStyle = "rgba(255,255,255,.72)";
    for (let i = 0; i < 4; i++) {
      const x = ((i * 330 - distancia * .08) % 1400 + 1400) % 1400 - 120;
      ctx.beginPath(); ctx.arc(x, 92 + (i % 2) * 42, 34, 0, Math.PI * 2);
      ctx.arc(x + 42, 82 + (i % 2) * 42, 48, 0, Math.PI * 2);
      ctx.arc(x + 88, 98 + (i % 2) * 42, 32, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Uma imagem de fundo troca o cenário antigo. Só camadasSobreFundo é desenhada por cima dela.
  const camadas = cenario.imagemFundo ? cenario.camadasSobreFundo : cenario.camadas;
  for (const camada of camadas || []) desenharCamada(camada);
  if (cenario.vinheta) {
    const vinheta = ctx.createRadialGradient(550, 270, 180, 550, 270, 650);
    vinheta.addColorStop(0, "rgba(255,205,112,0)");
    vinheta.addColorStop(1, "rgba(8,7,8,.38)");
    ctx.fillStyle = vinheta;
    ctx.fillRect(0, 0, LARGURA, ALTURA);
  }
}
function desenharJogador(agora) {
  const agachado = jogador.agachado;
  const x = 149;
  const y = jogador.y + (modo === "jogando" && jogador.velocidadeY === 0 ? Math.sin(agora * .018) * 2 : 0);
  ctx.fillStyle = "#172c2a50";
  ctx.beginPath(); ctx.ellipse(x + 21, chaoDaFase() + 5, 30, 7, 0, 0, Math.PI * 2); ctx.fill();
  if (agachado) {
    ctx.fillStyle = "#3eeedf"; ctx.fillRect(x, y + 20, 48, 24);
    ctx.fillStyle = "#f3b57e"; ctx.beginPath(); ctx.arc(x + 45, y + 15, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f0d126"; ctx.fillRect(x + 35, y + 3, 22, 7); ctx.fillRect(x + 2, y + 40, 17, 6); ctx.fillRect(x + 34, y + 40, 18, 6);
  } else {
    ctx.fillStyle = "#d4d4c3"; ctx.fillRect(x + 5, y + 48, 9, 20); ctx.fillRect(x + 27, y + 48, 9, 20);
    ctx.fillStyle = "#3eeedf"; ctx.fillRect(x + 5, y + 27, 31, 30);
    ctx.fillStyle = "#fff8e7"; ctx.fillRect(x + 17, y + 28, 7, 19);
    ctx.fillStyle = "#f3b57e"; ctx.beginPath(); ctx.arc(x + 20, y + 15, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f0d126"; ctx.beginPath(); ctx.arc(x + 20, y + 9, 15, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#f3b57e"; ctx.fillRect(x - 3, y + 32, 8, 20); ctx.fillRect(x + 36, y + 32, 8, 20);
  }
}
function desenharObstaculo(obstaculo) {
  const imagem = imagens.get(obstaculo.imagem);
  if (imagem?.complete && imagem.naturalWidth) {
    ctx.drawImage(imagem, obstaculo.x, obstaculo.y + obstaculo.imagemY,
      obstaculo.largura, obstaculo.imagemAltura);
  } else {
    ctx.fillStyle = "#ee5d3e";
    ctx.fillRect(obstaculo.x, obstaculo.y, obstaculo.largura, obstaculo.altura);
  }
}
function quadro(agora) {
  const delta = Math.min(50, Math.max(0, agora - ultimoQuadro));
  ultimoQuadro = agora;
  atualizar(delta, agora);
  desenharFundo(fases[faseAtual]);
  for (const obstaculo of obstaculos) desenharObstaculo(obstaculo);
  desenharJogador(agora);
  requestAnimationFrame(quadro);
}

function capturarQuadro(video) {
  if (video.readyState < 2 || !video.videoWidth) throw new Error("A webcam ainda não está pronta.");
  const tamanho = Math.min(video.videoWidth, video.videoHeight);
  const foto = document.createElement("canvas");
  foto.width = 160; foto.height = 160;
  const contexto = foto.getContext("2d", { alpha: false });
  contexto.translate(160, 0);
  contexto.scale(-1, 1);
  contexto.drawImage(video, (video.videoWidth - tamanho) / 2, (video.videoHeight - tamanho) / 2,
    tamanho, tamanho, 0, 0, 160, 160);
  return foto.toDataURL("image/jpeg", .68);
}
function definirFoto(foto) {
  fotoPendente = foto;
  elementos.foto.src = foto;
  elementos.foto.hidden = false;
  elementos.fotoVazia.hidden = true;
  elementos.estadoRanking.textContent = "Foto pronta para salvar neste computador.";
}
async function tirarFoto() {
  const botao = $("#tirar-foto");
  botao.disabled = true;
  elementos.estadoRanking.textContent = "Abrindo a webcam...";
  let stream;
  try {
    if (cameraAtiva && $("#video-camera").readyState >= 2) {
      definirFoto(capturarQuadro($("#video-camera")));
      return;
    }
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" }, audio: false,
    });
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    definirFoto(capturarQuadro(video));
    video.pause();
    video.srcObject = null;
  } catch {
    elementos.estadoRanking.textContent = "Não foi possível tirar a foto. Confira a permissão da webcam.";
  } finally {
    stream?.getTracks().forEach((track) => track.stop());
    botao.disabled = false;
  }
}
function mostrarRanking(ranking) {
  elementos.ranking.replaceChildren();
  $("#estado-limpeza-ranking").textContent = "";
  $("#limpar-ranking").disabled = ranking.length === 0;
  if (!ranking.length) {
    const vazio = document.createElement("li");
    vazio.textContent = "Nenhuma partida registrada ainda.";
    elementos.ranking.append(vazio);
    return;
  }
  ranking.slice(0, 10).forEach((item, indice) => {
    const linha = document.createElement("li");
    const posicao = document.createElement("strong");
    posicao.textContent = `${indice + 1}º`;
    if (item.foto?.startsWith("data:image/jpeg;base64,")) {
      const foto = document.createElement("img");
      foto.src = item.foto;
      foto.alt = `Foto de ${item.nome}`;
      linha.append(foto);
    } else {
      const avatar = document.createElement("span");
      avatar.className = "ranking-avatar";
      avatar.textContent = "📷";
      linha.append(avatar);
    }
    const nome = document.createElement("b");
    nome.textContent = item.nome;
    const pontos = document.createElement("strong");
    pontos.textContent = `${item.pontos} pts`;
    linha.prepend(posicao);
    linha.append(nome, pontos);
    elementos.ranking.append(linha);
  });
}
async function carregarRanking() {
  try {
    const resposta = await fetch("/api/ranking", { cache: "no-store" });
    if (!resposta.ok) throw new Error();
    mostrarRanking(await resposta.json());
  } catch {
    $("#limpar-ranking").disabled = true;
    elementos.ranking.replaceChildren();
    const aviso = document.createElement("li");
    aviso.textContent = "Ranking indisponível. Inicie o jogo com npm run dev.";
    elementos.ranking.append(aviso);
  }
}
async function limparRanking() {
  if (!window.confirm("Apagar todas as pontuações e fotos do ranking neste computador?")) return;
  const botao = $("#limpar-ranking");
  const estado = $("#estado-limpeza-ranking");
  botao.disabled = true;
  estado.textContent = "Limpando ranking...";
  try {
    const resposta = await fetch("/api/ranking", { method: "DELETE" });
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.erro || "Não foi possível limpar o ranking.");
    mostrarRanking(dados.ranking);
    estado.textContent = "Ranking limpo. Pontuações e fotos foram apagadas.";
  } catch (erro) {
    botao.disabled = false;
    estado.textContent = erro.message || "Não foi possível limpar o ranking.";
  }
}
async function salvarNoRanking() {
  if (!resultadoAtual) return;
  const botao = $("#salvar-ranking");
  const nome = $("#nome-jogador").value.trim();
  if (!nome) { elementos.estadoRanking.textContent = "Digite seu nome para salvar."; return; }
  if (!fotoPendente) { elementos.estadoRanking.textContent = "Tire uma foto com a webcam antes de salvar."; return; }
  botao.disabled = true;
  elementos.estadoRanking.textContent = "Salvando resultado...";
  try {
    const resposta = await fetch("/api/ranking", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...resultadoAtual, nome, foto: fotoPendente }),
    });
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.erro || "Não foi possível salvar.");
    elementos.estadoRanking.textContent = "Resultado e foto salvos no ranking deste computador!";
    mostrarRanking(dados.ranking);
  } catch (erro) {
    elementos.estadoRanking.textContent = erro.message;
    botao.disabled = false;
  }
}

// Controles de teclado. O controle pela câmera chama as mesmas ações.
document.addEventListener("keydown", (evento) => {
  if (["Space", "ArrowUp", "ArrowDown"].includes(evento.code)) evento.preventDefault();
  if (modo === "jogando" && (evento.code === "Space" || evento.code === "ArrowUp") && !evento.repeat) comandoPulo = true;
  if (evento.code === "ArrowDown") teclaAgachar = true;
  if (evento.code === "KeyF") alternarTelaCheia();
  if (evento.code === "KeyR") $("#recalibrar").click();
});
document.addEventListener("keyup", (evento) => { if (evento.code === "ArrowDown") teclaAgachar = false; });
window.addEventListener("blur", () => { teclaAgachar = false; cameraAgachar = false; });
function alternarTelaCheia() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen().catch(() => {});
}
$("#iniciar").addEventListener("click", novoJogo);
$("#reiniciar").addEventListener("click", novoJogo);
$("#tirar-foto").addEventListener("click", tirarFoto);
$("#salvar-ranking").addEventListener("click", salvarNoRanking);
$("#limpar-ranking").addEventListener("click", limparRanking);
$("#tela-cheia").addEventListener("click", alternarTelaCheia);
async function ativarCamera() {
  if (cameraAtiva) return;
  const botao = $("#ativar-camera");
  botao.disabled = true;
  $("#ligar-camera").disabled = true;
  elementos.avisoCamera.textContent = "Solicitando acesso à câmera...";
  try {
    const camera = await iniciarCamera({
      video: $("#video-camera"), desenho: $("#desenho-pose"),
      aoMudarEstado: (texto) => { elementos.estadoCamera.textContent = texto; elementos.avisoCamera.textContent = texto; },
      aoPular: () => { if (modo === "jogando") comandoPulo = true; },
      aoAgachar: (ativo) => { cameraAgachar = ativo; },
    });
    cameraAtiva = camera;
    $("#painel-camera").hidden = false;
    $("#recalibrar").hidden = false;
    $("#parar-camera").hidden = false;
    $("#ligar-camera").hidden = true;
    botao.textContent = "✓ CÂMERA ATIVADA";
  } catch (erro) {
    botao.disabled = false;
    $("#ligar-camera").disabled = false;
    elementos.avisoCamera.textContent = erro?.name === "NotAllowedError"
      ? "Permissão negada. Libere a câmera no navegador ou jogue com o teclado."
      : "Não foi possível abrir a câmera. Você pode jogar com o teclado.";
  }
}
$("#ativar-camera").addEventListener("click", ativarCamera);
$("#ligar-camera").addEventListener("click", ativarCamera);
$("#recalibrar").addEventListener("click", () => cameraAtiva?.recalibrar());
$("#parar-camera").addEventListener("click", () => {
  cameraAtiva?.parar();
  cameraAtiva = null;
  cameraAgachar = false;
  $("#painel-camera").hidden = true;
  $("#recalibrar").hidden = true;
  $("#parar-camera").hidden = true;
  $("#ligar-camera").hidden = false;
  $("#ligar-camera").disabled = false;
  $("#ativar-camera").disabled = false;
  $("#ativar-camera").textContent = "◎ ATIVAR CÂMERA (OPCIONAL)";
  elementos.avisoCamera.textContent = "Câmera desligada. Teclado disponível.";
});

if (fases.length === 0) {
  elementos.avisoCamera.textContent = "Adicione pelo menos uma fase em fases.js.";
  $("#iniciar").disabled = true;
} else {
  atualizarCabecalho();
  textoPlacar();
  requestAnimationFrame(quadro);
}
carregarRanking();
