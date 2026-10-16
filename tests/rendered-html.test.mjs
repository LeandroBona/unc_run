import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { fases } from "../public/jogo/fases.js";

const raiz = new URL("../", import.meta.url);

test("a página principal abre o jogo editável", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const resposta = await worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(resposta.status, 307);
  assert.equal(new URL(resposta.headers.get("location"), "http://localhost/").pathname, "/jogo/index.html");
});

test("o jogo usa HTML, CSS e JS sem página de versão separada", async () => {
  const html = await readFile(new URL("../public/jogo/index.html", import.meta.url), "utf8");
  assert.match(html, /<canvas id="jogo"/);
  assert.match(html, /\.\/estilo\.css/);
  assert.match(html, /\.\/jogo\.js/);
  assert.doesNotMatch(html, /VERSÃO 2|Versão original/i);
  await assert.rejects(access(new URL("../app/v2/page.tsx", import.meta.url)));
});

test("as fases usam camadas editáveis e obstáculos PNG existentes", async () => {
  assert.ok(fases.length >= 2);
  for (const fase of fases) {
    const camadas = fase.cenario.imagemFundo
      ? fase.cenario.camadasSobreFundo || []
      : fase.cenario.camadas || [];
    assert.ok(fase.cenario.imagemFundo || camadas.length > 0);
    for (const camada of camadas) {
      assert.ok(camada.imagem || camada.cor);
      assert.ok(camada.largura > 0 && camada.altura > 0);
    }
    const caminhos = [fase.cenario.imagemFundo, ...camadas.map((camada) => camada.imagem),
      ...fase.obstaculos.map((obstaculo) => obstaculo.imagem)].filter(Boolean);
    for (const caminho of caminhos) await access(new URL(`public${caminho}`, raiz));
    for (const obstaculo of fase.obstaculos) {
      assert.match(obstaculo.imagem, /\.png$/);
      assert.ok(["pular", "agachar"].includes(obstaculo.acao));
    }
  }
});
