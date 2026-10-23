import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

test("ranking local salva a foto, ordena partidas e rejeita dados inválidos", async () => {
  const pasta = await mkdtemp(join(tmpdir(), "ranking-unc-"));
  const arquivo = join(pasta, "ranking.json");
  process.env.RANKING_FILE = arquivo;
  const { lerRanking, salvarResultado } = await import("../scripts/ranking-local.mjs");
  try {
    const foto = "data:image/jpeg;base64,/9j/2Q==";
    await salvarResultado({ nome: "Ana", pontos: 120, foto, venceu: true, fasesConcluidas: 3 });
    await salvarResultado({ nome: "Beto", pontos: 220, foto, venceu: true, fasesConcluidas: 3 });
    const ranking = await lerRanking();
    assert.deepEqual(ranking.map((item) => item.nome), ["Beto", "Ana"]);
    assert.equal(ranking[0].foto, foto);
    assert.equal(JSON.parse(await readFile(arquivo, "utf8")).length, 2);
    assert.throws(() => salvarResultado({ nome: "", pontos: -1, foto, venceu: true, fasesConcluidas: 3 }));
  } finally {
    delete process.env.RANKING_FILE;
    await rm(pasta, { recursive: true, force: true });
  }
});
