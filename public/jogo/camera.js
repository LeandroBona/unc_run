// Controle opcional por movimentos. Alunos que só querem criar fases não precisam editar este arquivo.
import { criarDetectorMovimento } from "./movimento.js";

export async function iniciarCamera({ video, desenho, aoMudarEstado, aoPular, aoAgachar }) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("Câmera indisponível");
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 30 }, facingMode: "user" },
    audio: false,
  });
  video.srcObject = stream;
  try {
    await video.play();
    if (!window.Pose) {
      await new Promise((resolver, rejeitar) => {
        const script = document.createElement("script");
        script.src = "/mediapipe/pose/pose.js";
        script.onload = resolver;
        script.onerror = () => rejeitar(new Error("Modelo de movimento indisponível"));
        document.head.appendChild(script);
      });
    }
    if (!window.Pose) throw new Error("Modelo de movimento indisponível");

    const pose = new window.Pose({ locateFile: (arquivo) => `/mediapipe/pose/${arquivo}` });
    pose.setOptions({
      modelComplexity: 0,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.55,
      minTrackingConfidence: 0.55,
    });
    const ctx = desenho.getContext("2d");
    const entrada = document.createElement("canvas");
    entrada.width = 256;
    entrada.height = 192;
    const entradaCtx = entrada.getContext("2d", { alpha: false });
    const detector = criarDetectorMovimento();
    let ativo = true;
    let processando = false;
    let temporizador = 0;
    let ultimoEstado = "";
    const estado = (texto) => {
      if (texto !== ultimoEstado) { ultimoEstado = texto; aoMudarEstado(texto); }
    };

    function recalibrar() {
      detector.recalibrar();
      aoAgachar(false);
      estado("FIQUE EM PÉ E MOSTRE O TRONCO");
    }
    pose.onResults((resultado) => {
      if (!ativo) return;
      ctx.clearRect(0, 0, desenho.width, desenho.height);
      const marcas = resultado.poseLandmarks;
      if (marcas) {
        ctx.strokeStyle = "#f5c542";
        ctx.lineWidth = 4;
        for (const [a, b] of [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24]]) {
          if (!marcas[a] || !marcas[b]) continue;
          ctx.beginPath();
          ctx.moveTo(marcas[a].x * desenho.width, marcas[a].y * desenho.height);
          ctx.lineTo(marcas[b].x * desenho.width, marcas[b].y * desenho.height);
          ctx.stroke();
        }
      }
      const movimento = detector.analisar(marcas, performance.now());
      if (movimento.pular) aoPular();
      aoAgachar(movimento.agachar);
      estado(movimento.estado);
    });

    async function processar() {
      if (!ativo) return;
      const inicio = performance.now();
      if (!processando && !document.hidden && video.readyState >= 2) {
        processando = true;
        try {
          entradaCtx.drawImage(video, 0, 0, entrada.width, entrada.height);
          await pose.send({ image: entrada });
        } catch { estado("CÂMERA PAUSADA — TENTE RECALIBRAR"); }
        processando = false;
      }
      // Mantém até 30 análises por segundo, sem o intervalo extra de 125 ms.
      if (ativo) temporizador = setTimeout(processar, Math.max(0, 33 - (performance.now() - inicio)));
    }
    function parar() {
      if (!ativo) return;
      ativo = false;
      clearTimeout(temporizador);
      window.removeEventListener("pagehide", parar);
      stream.getTracks().forEach((track) => track.stop());
      video.pause();
      video.srcObject = null;
      ctx.clearRect(0, 0, desenho.width, desenho.height);
      aoAgachar(false);
      Promise.resolve(pose.close()).catch(() => {});
    }
    estado("FIQUE EM PÉ E MOSTRE O TRONCO");
    processar();
    window.addEventListener("pagehide", parar);
    return { recalibrar, parar };
  } catch (erro) {
    stream.getTracks().forEach((track) => track.stop());
    throw erro;
  }
}
