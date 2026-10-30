import test from "node:test";
import assert from "node:assert/strict";
import { iniciarCamera } from "../public/jogo/camera.js";
import { criarDetectorMovimento } from "../public/jogo/movimento.js";

test("a câmera limita a análise e libera o dispositivo ao parar", async () => {
  let envios = 0;
  let paradas = 0;
  let fechamentos = 0;
  const contexto = { drawImage() {}, clearRect() {} };
  const stream = { getTracks: () => [{ stop() { paradas++; } }] };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { mediaDevices: { getUserMedia: async () => stream } },
  });
  globalThis.document = {
    hidden: false,
    createElement: () => ({ width: 0, height: 0, getContext: () => contexto }),
  };
  globalThis.window = {
    Pose: class {
      setOptions() {}
      onResults() {}
      async send() { envios++; }
      close() { fechamentos++; }
    },
    addEventListener() {},
    removeEventListener() {},
  };
  const video = { readyState: 2, play: async () => {}, pause() {}, srcObject: null };
  const camera = await iniciarCamera({
    video,
    desenho: { width: 320, height: 240, getContext: () => contexto },
    aoMudarEstado() {}, aoPular() {}, aoAgachar() {},
  });
  await new Promise((resolve) => setTimeout(resolve, 430));
  assert.ok(envios >= 5 && envios <= 20, `esperava análise contínua até 30 fps; ocorreram ${envios}`);
  camera.parar();
  const antes = envios;
  await new Promise((resolve) => setTimeout(resolve, 180));
  assert.equal(envios, antes);
  assert.equal(paradas, 1);
  assert.equal(fechamentos, 1);
  assert.equal(video.srcObject, null);
});
function pose(ombros = .30, quadril = .62, visibilidade = 1) {
  const marcas = [];
  for (const i of [11, 12]) marcas[i] = { x: i === 11 ? .4 : .6, y: ombros, visibility: visibilidade };
  for (const i of [23, 24]) marcas[i] = { x: i === 23 ? .43 : .57, y: quadril, visibility: visibilidade };
  return marcas;
}

function calibrar(detector) {
  for (let i = 0; i < 8; i++) detector.analisar(pose(), i * 40);
}

test("calibra com ombros e quadril, sem pés no enquadramento", () => {
  const detector = criarDetectorMovimento();
  for (let i = 0; i < 7; i++) assert.match(detector.analisar(pose(), i * 40).estado, /CALIBRANDO/);
  assert.equal(detector.analisar(pose(), 280).estado, "CÂMERA PRONTA");
  assert.equal(detector.analisar(pose(), 320).estado, "CORRENDO");
});

test("detecta pulo no primeiro quadro e não repete enquanto o corpo continua elevado", () => {
  const detector = criarDetectorMovimento();
  calibrar(detector);
  assert.equal(detector.analisar(pose(.26, .57), 400).pular, true);
  assert.equal(detector.analisar(pose(.26, .57), 1000).pular, false);
  detector.analisar(pose(), 1050);
  assert.equal(detector.analisar(pose(.26, .57), 1100).pular, true);
});

test("um braço oculto ainda permite controlar; deslocar só os ombros não vira pulo", () => {
  const detector = criarDetectorMovimento();
  const marcas = pose();
  marcas[12].visibility = 0;
  marcas[24].visibility = 0;
  for (let i = 0; i < 8; i++) detector.analisar(marcas, i * 40);
  assert.equal(detector.analisar(pose(.26, .62), 400).pular, false);
  assert.equal(detector.analisar(pose(.26, .57), 440).pular, true);
});

test("agachamento é imediato e não oscila na borda do limite", () => {
  const detector = criarDetectorMovimento();
  calibrar(detector);
  assert.equal(detector.analisar(pose(.36, .65), 400).agachar, true);
  assert.equal(detector.analisar(pose(.34, .65), 440).agachar, true);
  assert.equal(detector.analisar(pose(), 480).agachar, false);
});

test("perda de pose solta o agachamento e recalibração limpa a referência", () => {
  const detector = criarDetectorMovimento();
  calibrar(detector);
  detector.analisar(pose(.36, .65), 400);
  assert.equal(detector.analisar(null, 440).agachar, false);
  detector.recalibrar();
  assert.match(detector.analisar(pose(), 480).estado, /CALIBRANDO/);
});
