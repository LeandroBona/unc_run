import { fases } from "./fases.js?v=alunos-1";
import { iniciarCamera } from "./camera.js";

// Mecânica do jogo. Para trocar cenários ou criar fases, edite apenas fases.js.
const canvas = document.querySelector("#jogo");
const ctx = canvas.getContext("2d");
const LARGURA = canvas.width;
const ALTURA = canvas.height;
const CHAO = 446;
const VELOCIDADE = 7.2;
const GRAVIDADE = 0.9;
const DURACAO_TOTAL = fases.reduce((soma, fase) => soma + fase.duracao, 0);
const $ = (seletor) => document.querySelector(seletor);
const elementos = {
  nome: $("#nome-fase"), titulo: $("#titulo-fase"), tempo: $("#tempo"),
  pontos: $("#pontos"), recorde: $("#recorde"),
  inicial: $("#tela-inicial"), contagem: $("#tela-contagem"), numero: $("#numero-contagem"),
  fase: $("#tela-fase"), anuncio: $("#fase-anuncio"), mensagem: $("#fase-mensagem"),
  final: $("#tela-final"), resultadoEtiqueta: $("#resultado-etiqueta"),
  resultadoTitulo: $("#resultado-titulo"), resultadoTexto: $("#resultado-texto"),
  avisoCamera: $("#aviso-camera"), estadoCamera: $("#estado-camera"),
};

const imagens = new Map();
for (const fase of fases) {
  const caminhos = [
    ...(fase.cenario?.camadas || []).map((camada) => camada.imagem),
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
let tempoDaFase = 0;
let tempoDaPartida = 0;
let distancia = 0;
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
let jogador = { y: CHAO - 66, velocidadeY: 0, agachado: false };

function mostrar(elemento, sim) { elemento.classList.toggle("escondido", !sim); }
function textoPlacar() {
  elementos.tempo.textContent = Math.max(0, Math.ceil(DURACAO_TOTAL - tempoDaPartida / 1000));
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
  pontos = 0;
  proximoObstaculo = 760;
  obstaculos = [];
  jogador = { y: CHAO - 66, velocidadeY: 0, agachado: false };
  comandoPulo = false;
  teclaAgachar = false;
  cameraAgachar = false;
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
  elementos.resultadoEtiqueta.textContent = venceu ? "TODAS AS FASES CONCLUÍDAS" : "FIM DA CORRIDA";
  elementos.resultadoTitulo.textContent = venceu ? "Você chegou à aula!" : "Tente mais uma vez!";
  elementos.resultadoTexto.textContent = `Você fez ${pontos} pontos e chegou à fase ${faseAtual + 1} de ${fases.length}.`;
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
  jogador.y = CHAO - 66;
  jogador.velocidadeY = 0;
  atualizarCabecalho();
  elementos.anuncio.textContent = fases[faseAtual].nome;
  elementos.mensagem.textContent = fases[faseAtual].mensagem;
  mostrar(elementos.fase, true);
  transicaoAte = agora + 1800;
  modo = "transicao";
}

function criarObstaculo() {
  const modelos = fases[faseAtual].obstaculos;
  if (!modelos.length) return;
  const modelo = modelos[Math.floor(Math.random() * modelos.length)];
  const altura = modelo.altura || 50;
  const largura = modelo.largura || 52;
  obstaculos.push({
    x: LARGURA + 20,
    y: CHAO - altura - (modelo.alturaDoChao || 0),
    largura, altura,
    imagem: modelo.imagem,
    imagemY: modelo.imagemY || 0,
    imagemAltura: modelo.imagemAltura || altura,
    acao: modelo.acao,
  });
}
function colisao(a, b) {
  const margemX = 7;
  const margemY = b.acao === "agachar" ? 1 : 5;
  return a.x < b.x + b.largura - margemX &&
    a.x + a.largura > b.x + margemX &&
    a.y < b.y + b.altura - margemY &&
    a.y + a.altura > b.y + margemY;
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
  pontos = Math.floor(distancia / 8);
  textoPlacar();
  if (tempoDaFase >= fases[faseAtual].duracao * 1000) { mudarFase(agora); return; }

  const noChao = jogador.y >= CHAO - (jogador.agachado ? 42 : 66) - 1;
  jogador.agachado = (teclaAgachar || cameraAgachar) && noChao;
  if (jogador.agachado && jogador.velocidadeY === 0) jogador.y = CHAO - 42;
  if (comandoPulo && noChao) {
    jogador.velocidadeY = -15.8;
    jogador.agachado = false;
  }
  comandoPulo = false;
  jogador.velocidadeY += GRAVIDADE * passo;
  jogador.y += jogador.velocidadeY * passo;
  const piso = CHAO - (jogador.agachado ? 42 : 66);
  if (jogador.y > piso) { jogador.y = piso; jogador.velocidadeY = 0; }

  proximoObstaculo -= movimento;
  if (proximoObstaculo <= 0) {
    criarObstaculo();
    proximoObstaculo = 580 + Math.random() * 320;
  }
  for (const obstaculo of obstaculos) obstaculo.x -= movimento;
  obstaculos = obstaculos.filter((obstaculo) => obstaculo.x > -100);
  const areaJogador = { x: 149, y: jogador.y + 4, largura: jogador.agachado ? 52 : 34, altura: jogador.agachado ? 38 : 60 };
  if (obstaculos.some((obstaculo) => colisao(areaJogador, obstaculo))) terminar(false);
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
  if (cenario.ceu?.length >= 2) {
    const ceu = ctx.createLinearGradient(0, 0, 0, ALTURA);
    for (let i = 0; i < cenario.ceu.length; i++) {
      const posicao = cenario.ceu.length === 3 && i === 1 ? .65 : i / (cenario.ceu.length - 1);
      ceu.addColorStop(posicao, cenario.ceu[i]);
    }
    ctx.fillStyle = ceu;
  } else {
    ctx.fillStyle = cenario.corFundo || "#dff5ef";
  }
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  if (cenario.nuvens) {
    ctx.fillStyle = "rgba(255,255,255,.72)";
    for (let i = 0; i < 4; i++) {
      const x = ((i * 330 - distancia * .08) % 1400 + 1400) % 1400 - 120;
      ctx.beginPath(); ctx.arc(x, 92 + (i % 2) * 42, 34, 0, Math.PI * 2);
      ctx.arc(x + 42, 82 + (i % 2) * 42, 48, 0, Math.PI * 2);
      ctx.arc(x + 88, 98 + (i % 2) * 42, 32, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (const camada of cenario.camadas || []) desenharCamada(camada);
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
  ctx.beginPath(); ctx.ellipse(x + 21, CHAO + 5, 30, 7, 0, 0, Math.PI * 2); ctx.fill();
  if (agachado) {
    ctx.fillStyle = "#ee5d3e"; ctx.fillRect(x, y + 20, 48, 24);
    ctx.fillStyle = "#f3b57e"; ctx.beginPath(); ctx.arc(x + 45, y + 15, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#173d39"; ctx.fillRect(x + 35, y + 3, 22, 7); ctx.fillRect(x + 2, y + 40, 17, 6); ctx.fillRect(x + 34, y + 40, 18, 6);
  } else {
    ctx.fillStyle = "#173d39"; ctx.fillRect(x + 5, y + 48, 9, 20); ctx.fillRect(x + 27, y + 48, 9, 20);
    ctx.fillStyle = "#ee5d3e"; ctx.fillRect(x + 5, y + 27, 31, 30);
    ctx.fillStyle = "#fff8e7"; ctx.fillRect(x + 17, y + 28, 7, 19);
    ctx.fillStyle = "#f3b57e"; ctx.beginPath(); ctx.arc(x + 20, y + 15, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#173d39"; ctx.beginPath(); ctx.arc(x + 18, y + 9, 15, Math.PI, 0); ctx.fill();
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
