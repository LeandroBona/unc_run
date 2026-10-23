import test from "node:test";
import assert from "node:assert/strict";
import { areasDoObstaculo, colideComObstaculo } from "../public/jogo/colisao.js";

test("a área transparente do braço não colide, mas a parte visível colide", () => {
  const braco = { x: 200, y: 300, largura: 100, altura: 90,
    hitbox: { x: 32, y: 18, largura: 52, altura: 60 } };
  assert.deepEqual(areasDoObstaculo(braco), [{ x: 232, y: 318, largura: 52, altura: 60 }]);
  assert.equal(colideComObstaculo({ x: 220, y: 330, largura: 10, altura: 20 }, braco), false);
  assert.equal(colideComObstaculo({ x: 240, y: 330, largura: 10, altura: 20 }, braco), true);
});

test("obstáculos sem hitbox mantêm a margem anterior", () => {
  const objeto = { x: 200, y: 300, largura: 50, altura: 50, acao: "pular" };
  assert.equal(colideComObstaculo({ x: 198, y: 320, largura: 5, altura: 10 }, objeto), false);
  assert.equal(colideComObstaculo({ x: 210, y: 320, largura: 10, altura: 10 }, objeto), true);
});

test("pixels transparentes dentro da hitbox não causam colisão", () => {
  const pixels = new Uint8Array(10 * 10);
  pixels[5 * 10 + 5] = 1;
  const objeto = { x: 200, y: 300, largura: 10, altura: 10,
    hitbox: { x: 0, y: 0, largura: 10, altura: 10 },
    mascara: { largura: 10, altura: 10, pixels } };
  assert.equal(colideComObstaculo({ x: 201, y: 301, largura: 2, altura: 2 }, objeto), false);
  assert.equal(colideComObstaculo({ x: 205, y: 305, largura: 2, altura: 2 }, objeto), true);
});

test("PNG estreito sem hitbox também usa a máscara de transparência", () => {
  const pixels = new Uint8Array(10 * 10);
  pixels[5 * 10 + 5] = 1;
  const objeto = { x: 200, y: 300, largura: 10, altura: 10,
    mascara: { largura: 10, altura: 10, pixels } };
  assert.equal(colideComObstaculo({ x: 205, y: 305, largura: 1, altura: 1 }, objeto), true);
});
