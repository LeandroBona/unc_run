import test from "node:test";
import assert from "node:assert/strict";
import { iniciarCamera } from "../public/jogo/camera.js";

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
  assert.ok(envios >= 2 && envios <= 4, `esperava até 4 análises; ocorreram ${envios}`);
  camera.parar();
  const antes = envios;
  await new Promise((resolve) => setTimeout(resolve, 180));
  assert.equal(envios, antes);
  assert.equal(paradas, 1);
  assert.equal(fechamentos, 1);
  assert.equal(video.srcObject, null);
});
