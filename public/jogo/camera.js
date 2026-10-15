// Controle opcional por movimentos. Alunos que só querem criar fases não precisam editar este arquivo.
export async function iniciarCamera({ video, desenho, aoMudarEstado, aoPular, aoAgachar }) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("Câmera indisponível");
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 10, max: 15 }, facingMode: "user" },
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
    let calibrando = true;
    let quadrosCalibrados = 0;
    let base = null;
    let quadrosPulo = 0;
    let quadrosAgachar = 0;
    let proximoPulo = 0;
    let ativo = true;
    let processando = false;
    let temporizador = 0;
    let ultimoEstado = "";
    const estado = (texto) => {
      if (texto !== ultimoEstado) { ultimoEstado = texto; aoMudarEstado(texto); }
    };

    function recalibrar() {
      calibrando = true;
      quadrosCalibrados = 0;
      base = null;
      aoAgachar(false);
      estado("FIQUE NO CENTRO DA CÂMERA");
    }
    pose.onResults((resultado) => {
      ctx.clearRect(0, 0, desenho.width, desenho.height);
      const marcas = resultado.poseLandmarks;
      if (!marcas || marcas.length < 29) {
        quadrosCalibrados = 0;
        aoAgachar(false);
        estado("MOSTRE O CORPO TODO");
        return;
      }
      ctx.strokeStyle = "#f5c542";
      ctx.lineWidth = 4;
      for (const [a, b] of [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]]) {
        ctx.beginPath();
        ctx.moveTo(marcas[a].x * desenho.width, marcas[a].y * desenho.height);
        ctx.lineTo(marcas[b].x * desenho.width, marcas[b].y * desenho.height);
        ctx.stroke();
      }
      const ombros = (marcas[11].y + marcas[12].y) / 2;
      const quadril = (marcas[23].y + marcas[24].y) / 2;
      const tornozelos = (marcas[27].y + marcas[28].y) / 2;
      const visivel = [11, 12, 23, 24, 27, 28].every((i) => (marcas[i].visibility ?? 1) > 0.55);
      const centro = (marcas[11].x + marcas[12].x) / 2;
      if (calibrando) {
        if (visivel && centro > .25 && centro < .75 && tornozelos > .72) {
          quadrosCalibrados += 1;
          estado(`CALIBRANDO ${Math.min(100, Math.round(quadrosCalibrados / 24 * 100))}%`);
          if (quadrosCalibrados >= 24) {
            base = { ombros, quadril };
            calibrando = false;
            estado("CÂMERA PRONTA");
          }
        } else {
          quadrosCalibrados = Math.max(0, quadrosCalibrados - 2);
          estado(visivel ? "FIQUE NO CENTRO" : "MOSTRE O CORPO TODO");
        }
        return;
      }
      if (!base) return;
      const alturaCorpo = Math.max(.18, tornozelos - ombros);
      const pulou = base.quadril - quadril > alturaCorpo * .055;
      const agachou = ombros - base.ombros > alturaCorpo * .09;
      quadrosPulo = pulou ? quadrosPulo + 1 : 0;
      quadrosAgachar = agachou ? quadrosAgachar + 1 : 0;
      if (quadrosPulo >= 2 && performance.now() > proximoPulo) {
        aoPular();
        proximoPulo = performance.now() + 700;
        quadrosPulo = 0;
        estado("PULO!");
      } else if (quadrosAgachar >= 2) {
        aoAgachar(true);
        estado("AGACHOU!");
      } else {
        aoAgachar(false);
        estado("CORRENDO");
      }
      base.ombros = base.ombros * .985 + ombros * .015;
      base.quadril = base.quadril * .985 + quadril * .015;
    });

    async function processar() {
      if (!ativo) return;
      if (!processando && !document.hidden && video.readyState >= 2) {
        processando = true;
        try {
          entradaCtx.drawImage(video, 0, 0, entrada.width, entrada.height);
          await pose.send({ image: entrada });
        } catch { estado("CÂMERA PAUSADA — TENTE RECALIBRAR"); }
        processando = false;
      }
      if (ativo) temporizador = setTimeout(processar, 125);
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
    estado("FIQUE NO CENTRO DA CÂMERA");
    processar();
    window.addEventListener("pagehide", parar);
    return { recalibrar, parar };
  } catch (erro) {
    stream.getTracks().forEach((track) => track.stop());
    throw erro;
  }
}
