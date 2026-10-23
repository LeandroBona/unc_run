import test from "node:test";
import assert from "node:assert/strict";
import { calcularTempoTotal, calcularTempoRestante } from "../public/jogo/tempo.js";

test("três fases de 25 segundos iniciam o placar em 75", () => {
  const fases = Array.from({ length: 3 }, () => ({ duracao: 25 }));
  assert.equal(calcularTempoTotal(fases), 75);
  assert.equal(calcularTempoRestante(75, 0), 75);
  assert.equal(calcularTempoRestante(75, 25_000), 50);
  assert.equal(calcularTempoRestante(75, 75_000), 0);
});
